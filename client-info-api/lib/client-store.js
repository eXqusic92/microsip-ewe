"use strict";

const { Pool } = require("pg");

const { BinotelClient } = require("./binotel-client");
const BookingRules = require("./booking-rules");
const { CallSummaryService } = require("./call-summary-service");
const { CallSummaryStore } = require("./call-summary-store");
const { createDemoCard } = require("./demo-data");
const { LocalNotesStore } = require("./local-notes-store");
const { OpenAiClient } = require("./openai-client");
const { lookupVariants, normalizePhone, phoneDigits } = require("./phone");
const { createTranscriptionClient } = require("./transcription-client");

const ORDER_VIEW_BASE_URL = "https://new-system-prod.ewe.ua/backend/orders/order/";

function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function timestamp(value) {
  return value ? new Date(value).toISOString() : null;
}

function firstPresent(...values) {
  return values.find((value) => value !== null && value !== undefined && value !== "");
}

function isPaidStatus(value) {
  return BookingRules.isPurchasedStatus(value);
}

function isReturnedStatus(value) {
  return ["returned", "buybus_returned"].includes(BookingRules.normalizeStatus(value));
}

function isCancelledStatus(value) {
  return BookingRules.isClosedStatus(value) && !isReturnedStatus(value);
}

function ticketStatus(value, returnItem) {
  const normalized = BookingRules.normalizeStatus(value);
  if (returnItem && !BookingRules.isClosedStatus(normalized)) {
    return "returned";
  }
  return normalized || text(value);
}

function ticketStatusLabel(status) {
  return BookingRules.getSearchStatusLabel(status) || "Без статусу";
}

function decorateCardStatuses(card) {
  card.calls = card.calls || [];
  card.ticketStatusLabels = BookingRules.ticketSearchStatusLabels;

  for (const ticket of card.tickets || []) {
    ticket.status = BookingRules.normalizeStatus(ticket.status) || ticket.status;
    ticket.statusLabel = ticketStatusLabel(ticket.status);
  }

  if (card.upcomingTrip) {
    card.upcomingTrip.status =
      BookingRules.normalizeStatus(card.upcomingTrip.status) || card.upcomingTrip.status;
    card.upcomingTrip.statusLabel = ticketStatusLabel(card.upcomingTrip.status);
  }

  return card;
}

async function getBinotelCalls(binotelClient, phone) {
  if (!binotelClient || !binotelClient.enabled) {
    return null;
  }

  try {
    return {
      calls: await binotelClient.historyByExternalNumber(phone),
      warnings: []
    };
  } catch (error) {
    return {
      calls: [],
      warnings: [`Binotel недоступний: ${error.message}`]
    };
  }
}

function attachBinotelCalls(card, callsResult) {
  if (!callsResult) {
    card.calls = card.calls || [];
    return card;
  }

  card.calls = callsResult.calls;
  card.warnings = [...(card.warnings || []), ...callsResult.warnings];

  if (!card.found && card.calls.length) {
    card.found = true;
    card.contact.primaryName =
      card.calls.find((call) => call.customer && call.customer.name)?.customer.name ||
      "Телефонний контакт";
  }

  return card;
}

async function attachLatestCallSummary(card, callSummaryService) {
  if (!callSummaryService) {
    card.latestCallSummary = null;
    return card;
  }

  card.latestCallSummary = await callSummaryService.prepare(
    card.contact.phone,
    card.calls || []
  );
  return card;
}

function compactTicketContext(ticket) {
  if (!ticket) {
    return null;
  }

  const fromLocality = ticket.from && ticket.from.locality;
  const toLocality = ticket.to && ticket.to.locality;
  const fromPoint = ticket.from && ticket.from.point;
  const toPoint = ticket.to && ticket.to.point;

  return {
    id: ticket.id,
    orderId: ticket.orderId,
    orderNumber: ticket.orderNumber,
    ticketNumber: ticket.ticketNumber,
    routeCode: ticket.routeCode,
    status: ticket.statusLabel || ticket.status,
    passenger: ticket.passenger,
    departAt: ticket.departAt,
    arriveAt: ticket.arriveAt,
    route: [fromLocality, toLocality].filter(Boolean).join(" -> "),
    boarding: [fromPoint, fromLocality].filter(Boolean).join(", "),
    destination: [toPoint, toLocality].filter(Boolean).join(", "),
    carrier: ticket.carrier,
    agent: ticket.agent,
    seat: ticket.seat
  };
}

function compactClientContext(card) {
  if (!card) {
    return null;
  }

  const now = Date.now();
  const tickets = (card.tickets || []).filter(Boolean);
  const activeTickets = tickets
    .filter((ticket) => {
      const departAt = ticket.departAt ? new Date(ticket.departAt).getTime() : 0;
      const arriveAt = ticket.arriveAt ? new Date(ticket.arriveAt).getTime() : 0;
      return (
        departAt &&
        arriveAt &&
        departAt <= now &&
        arriveAt >= now &&
        !BookingRules.isClosedStatus(ticket.status) &&
        !ticket.returnInfo
      );
    })
    .sort((a, b) => new Date(a.departAt || 0) - new Date(b.departAt || 0))
    .slice(0, 2)
    .map(compactTicketContext)
    .filter(Boolean);
  const recentTickets = tickets
    .slice(0, 4)
    .map(compactTicketContext)
    .filter(Boolean);

  return {
    purpose:
      "Auxiliary CRM context for disambiguating the call. Use only when it matches the transcript; never invent facts from it.",
    found: Boolean(card.found),
    source: card.source || "",
    contact: {
      phone: card.contact && card.contact.phone,
      primaryName: card.contact && card.contact.primaryName,
      relatedPassengers: ((card.contact && card.contact.relatedPassengers) || [])
        .slice(0, 5),
      emails: ((card.contact && card.contact.emails) || []).slice(0, 3)
    },
    stats: {
      orders: card.stats && card.stats.orders,
      tickets: card.stats && card.stats.tickets,
      firstOrderAt: card.stats && card.stats.firstOrderAt,
      lastOrderAt: card.stats && card.stats.lastOrderAt
    },
    activeTripCandidates: activeTickets,
    upcomingTrip: compactTicketContext(card.upcomingTrip),
    recentTickets,
    notes: (card.notes || [])
      .slice(0, 4)
      .map((note) => ({
        text: note.text,
        source: note.source || "",
        createdAt: note.createdAt || null
      }))
      .filter((note) => note.text)
  };
}

function mostFrequent(values) {
  const counts = new Map();

  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "uk"))
    .map(([value]) => value);
}

function createEmptyCard(phone, source, warnings = []) {
  return {
    found: false,
    source,
    contact: {
      phone,
      phoneDigits: phoneDigits(phone),
      primaryName: "Невідомий клієнт",
      relatedPassengers: [],
      emails: []
    },
    stats: {
      orders: 0,
      tickets: 0,
      paidTickets: 0,
      cancelledTickets: 0,
      returnedTickets: 0,
      firstOrderAt: null,
      lastOrderAt: null,
      totals: []
    },
    upcomingTrip: null,
    tickets: [],
    calls: [],
    latestCallSummary: null,
    ticketStatusLabels: BookingRules.ticketSearchStatusLabels,
    notes: [],
    warnings
  };
}

class DemoClientStore {
  constructor(config, notesStore, binotelClient, callSummaryService, warnings = []) {
    this.config = config;
    this.notesStore = notesStore;
    this.binotelClient = binotelClient;
    this.callSummaryService = callSummaryService;
    this.mode = "demo";
    this.warnings = warnings;
  }

  async health() {
    return {
      ok: true,
      service: "client-info-api",
      dataMode: this.mode,
      databaseConfigured: Boolean(this.config.database.password),
      binotelConfigured: Boolean(this.binotelClient && this.binotelClient.enabled),
      openAiConfigured: Boolean(this.callSummaryService && this.callSummaryService.enabled),
      transcriptionProvider:
        (this.callSummaryService && this.callSummaryService.transcriptionProvider) ||
        "openai"
    };
  }

  async getClientCard(phone) {
    const card = createDemoCard(phone);
    const [storedNotes, callsResult] = await Promise.all([
      this.notesStore.list(phone),
      getBinotelCalls(this.binotelClient, phone)
    ]);
    card.notes = [...storedNotes, ...card.notes];
    card.warnings = [...this.warnings, ...card.warnings];
    attachBinotelCalls(card, callsResult);
    await attachLatestCallSummary(card, this.callSummaryService);
    return decorateCardStatuses(card);
  }

  async getTicketCard(rawPhone) {
    const phone = normalizePhone(rawPhone);
    const card = createDemoCard(phone);
    const storedNotes = await this.notesStore.list(phone);
    card.notes = [...storedNotes, ...card.notes];
    return decorateCardStatuses(card);
  }

  async getCallSummary(rawPhone) {
    const phone = normalizePhone(rawPhone);
    const demoCard = createDemoCard(phone);
    const callsResult = await getBinotelCalls(this.binotelClient, phone);
    const calls = callsResult ? callsResult.calls : demoCard.calls || [];
    return this.callSummaryService.prepare(phone, calls);
  }

  async getCallSummaryByCallId(callId) {
    return this.callSummaryService.status(callId);
  }

  async getAiClientContext(rawPhone) {
    const phone = normalizePhone(rawPhone);
    const card = createDemoCard(phone);
    const storedNotes = await this.notesStore.list(phone);
    card.notes = [...storedNotes, ...card.notes];
    return compactClientContext(decorateCardStatuses(card));
  }

  async addNote(phone, noteText) {
    return this.notesStore.add(phone, noteText);
  }

  async close() {}
}

class PostgresClientStore {
  constructor(config, notesStore, binotelClient, callSummaryService) {
    this.config = config;
    this.notesStore = notesStore;
    this.binotelClient = binotelClient;
    this.callSummaryService = callSummaryService;
    this.mode = "postgres";
    this.pool = new Pool(config.database);
    this.closed = false;
  }

  async query(sql, parameters) {
    if (this.closed) {
      throw new Error("PostgreSQL connection pool is already closed");
    }

    return this.pool.query(sql, parameters);
  }

  async health() {
    try {
      const result = await this.query("SELECT NOW() AS now");
      return {
        ok: true,
        service: "client-info-api",
        dataMode: this.mode,
        database: "connected",
        databaseTime: result.rows[0].now,
        binotelConfigured: Boolean(this.binotelClient && this.binotelClient.enabled),
        openAiConfigured: Boolean(this.callSummaryService && this.callSummaryService.enabled),
        transcriptionProvider:
          (this.callSummaryService && this.callSummaryService.transcriptionProvider) ||
          "openai"
      };
    } catch (error) {
      return {
        ok: false,
        service: "client-info-api",
        dataMode: this.mode,
        database: "unavailable",
        binotelConfigured: Boolean(this.binotelClient && this.binotelClient.enabled),
        openAiConfigured: Boolean(this.callSummaryService && this.callSummaryService.enabled),
        transcriptionProvider:
          (this.callSummaryService && this.callSummaryService.transcriptionProvider) ||
          "openai",
        error: error.message
      };
    }
  }

  async getOrders(phone) {
    const variants = lookupVariants(phone);
    const result = await this.query(
      `
        SELECT
          id,
          number::text AS order_number,
          status,
          sale_date,
          reserved_to,
          phone,
          email,
          type,
          cost,
          price,
          created_at,
          updated_at,
          currency,
          agent_id
        FROM public."order"
        WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') = ANY($1::text[])
        ORDER BY COALESCE(sale_date, created_at) DESC NULLS LAST, id DESC
        LIMIT 100
      `,
      [variants]
    );
    return result.rows;
  }

  async getTickets(orderIds) {
    if (!orderIds.length) {
      return [];
    }

    const result = await this.query(
      `
        SELECT
          t.id AS ticket_id,
          t.order_id,
          t.trip_id,
          t.status,
          t.created_at AS ticket_created_at,
          t.sale_date AS ticket_sale_date,
          o.number::text AS order_number,
          t.number::text AS ticket_number,
          t.seat,
          t.seat_number,
          tr.route_id,
          r.code AS route_code,
          tr.execution_date,
          t.depart_at,
          t.arrive_at,
          t.geo_locality_from AS geo_locality_from_id,
          NULLIF(BTRIM(gl_from.name), '') AS geo_locality_from_name,
          t.geo_point_from AS geo_point_from_id,
          NULLIF(BTRIM(gp_from.name), '') AS geo_point_from_name,
          t.geo_locality_to AS geo_locality_to_id,
          NULLIF(BTRIM(gl_to.name), '') AS geo_locality_to_name,
          t.geo_point_to AS geo_point_to_id,
          NULLIF(BTRIM(gp_to.name), '') AS geo_point_to_name,
          t.pass_name AS firstname,
          t.pass_surname AS lastname,
          COALESCE(NULLIF(BTRIM(oc.name), ''), NULLIF(BTRIM(t.carrier_code), '')) AS carrier_name,
          COALESCE(NULLIF(BTRIM(oa.name), ''), NULLIF(BTRIM(oa.code), ''), NULLIF(BTRIM(t.agent_code), '')) AS agent_name,
          COALESCE(NULLIF(BTRIM(oa.code), ''), NULLIF(BTRIM(t.agent_code), '')) AS agent_code,
          t.cost AS ticket_cost,
          t.price AS ticket_price,
          t.tariff AS ticket_tariff,
          t.currency AS currency_ticket
        FROM public.ticket t
        INNER JOIN public."order" o ON o.id = t.order_id
        LEFT JOIN public.trip tr ON tr.id = t.trip_id
        LEFT JOIN public.route r ON r.id = tr.route_id
        LEFT JOIN public.organization_carrier oc ON oc.code = t.carrier_code
        LEFT JOIN public.organization_agent oa ON oa.id = COALESCE(t.agent_id, o.agent_id)
        LEFT JOIN public.geo_locality_i18n gl_from
          ON gl_from.geo_locality_id = t.geo_locality_from
          AND gl_from.locale = 'ua'
        LEFT JOIN public.geo_point_i18n gp_from
          ON gp_from.geo_point_id = t.geo_point_from
          AND gp_from.locale = 'ua'
        LEFT JOIN public.geo_locality_i18n gl_to
          ON gl_to.geo_locality_id = t.geo_locality_to
          AND gl_to.locale = 'ua'
        LEFT JOIN public.geo_point_i18n gp_to
          ON gp_to.geo_point_id = t.geo_point_to
          AND gp_to.locale = 'ua'
        WHERE t.order_id = ANY($1::bigint[])
        ORDER BY t.depart_at DESC NULLS LAST, t.created_at DESC NULLS LAST, t.id DESC
        LIMIT 100
      `,
      [orderIds]
    );
    return result.rows;
  }

  async getReturns(orderIds) {
    if (!orderIds.length) {
      return [];
    }

    const result = await this.query(
      `
        SELECT
          tr.id,
          tr.ticket_id,
          tr.type,
          tr.currency,
          tr.amount,
          tr.description,
          tr.created_at
        FROM public.ticket_return tr
        INNER JOIN public.ticket t ON t.id = tr.ticket_id
        WHERE t.order_id = ANY($1::bigint[])
        ORDER BY tr.created_at DESC NULLS LAST, tr.id DESC
      `,
      [orderIds]
    );
    return result.rows;
  }

  async getTicketComments(orderIds) {
    if (!orderIds.length) {
      return [];
    }

    const result = await this.query(
      `
        SELECT id, ticket_id, order_id, type, kind, text
        FROM public.ticket_comment
        WHERE order_id = ANY($1::bigint[])
        ORDER BY id DESC
        LIMIT 100
      `,
      [orderIds]
    );
    return result.rows;
  }

  buildCard(phone, orders, rawTickets, returns, comments, clientNotes) {
    if (!orders.length) {
      return createEmptyCard(phone, this.mode);
    }

    const returnsByTicket = new Map();
    for (const item of returns) {
      if (!returnsByTicket.has(String(item.ticket_id))) {
        returnsByTicket.set(String(item.ticket_id), item);
      }
    }

    const tickets = rawTickets.map((item) => {
      const returnItem = returnsByTicket.get(String(item.ticket_id));
      const status = ticketStatus(item.status, returnItem);
      const passenger = [text(item.firstname), text(item.lastname)]
        .filter(Boolean)
        .join(" ");

      return {
        id: String(item.ticket_id),
        orderId: item.order_id ? String(item.order_id) : "",
        orderUrl: item.order_id ? `${ORDER_VIEW_BASE_URL}${item.order_id}/view` : "",
        ticketNumber: text(item.ticket_number),
        orderNumber: text(item.order_number),
        routeCode: text(item.route_code),
        status,
        statusLabel: ticketStatusLabel(status),
        passenger: passenger || "Ім’я не вказано",
        departAt: timestamp(item.depart_at),
        arriveAt: timestamp(item.arrive_at),
        from: {
          locality: text(item.geo_locality_from_name),
          point: text(item.geo_point_from_name)
        },
        to: {
          locality: text(item.geo_locality_to_name),
          point: text(item.geo_point_to_name)
        },
        carrier: text(item.carrier_name),
        agent: text(item.agent_name),
        agentCode: text(item.agent_code),
        seat: text(item.seat) || text(item.seat_number),
        price: {
          amount: number(firstPresent(item.ticket_cost, item.ticket_price, item.ticket_tariff)),
          currency: text(item.currency_ticket) || "UAH"
        },
        saleDate: timestamp(item.ticket_sale_date),
        returnInfo: returnItem
          ? {
              amount: number(returnItem.amount),
              currency: text(returnItem.currency),
              type: text(returnItem.type),
              description: text(returnItem.description)
            }
          : null
      };
    });

    const passengers = mostFrequent(tickets.map((ticket) => ticket.passenger));
    const emails = mostFrequent(orders.map((order) => text(order.email)));
    const totals = new Map();

    for (const ticket of tickets) {
      if (isPaidStatus(ticket.status) && !ticket.returnInfo) {
        totals.set(
          ticket.price.currency,
          (totals.get(ticket.price.currency) || 0) + ticket.price.amount
        );
      }
    }

    const dates = orders
      .map((order) => order.created_at)
      .filter(Boolean)
      .map((value) => new Date(value))
      .sort((a, b) => a - b);
    const now = Date.now();
    const upcomingTrip =
      tickets
        .filter(
          (ticket) =>
            ticket.departAt &&
            new Date(ticket.departAt).getTime() >= now &&
            !BookingRules.isClosedStatus(ticket.status) &&
            !ticket.returnInfo
        )
        .sort((a, b) => new Date(a.departAt) - new Date(b.departAt))[0] || null;

    const notes = [
      ...clientNotes.map((note) => ({
        id: `local-${note.id}`,
        text: text(note.text),
        createdBy: text(note.createdBy) || "Оператор",
        createdAt: timestamp(note.createdAt),
        source: "local_json"
      })),
      ...comments.map((comment) => ({
        id: `ticket-${comment.id}`,
        text: text(comment.text),
        createdBy: "Коментар до квитка",
        createdAt: null,
        source: "ticket_comment",
        ticketId: comment.ticket_id ? String(comment.ticket_id) : null,
        orderId: comment.order_id ? String(comment.order_id) : null
      }))
    ].filter((note) => note.text);

    return {
      found: true,
      source: this.mode,
      contact: {
        phone,
        phoneDigits: phoneDigits(phone),
        primaryName: passengers[0] || "Ім’я не визначено",
        relatedPassengers: passengers,
        emails
      },
      stats: {
        orders: orders.length,
        tickets: tickets.length,
        paidTickets: tickets.filter((ticket) => isPaidStatus(ticket.status)).length,
        cancelledTickets: tickets.filter((ticket) => isCancelledStatus(ticket.status))
          .length,
        returnedTickets: tickets.filter(
          (ticket) => ticket.returnInfo || isReturnedStatus(ticket.status)
        ).length,
        firstOrderAt: dates.length ? dates[0].toISOString() : null,
        lastOrderAt: dates.length ? dates[dates.length - 1].toISOString() : null,
        totals: [...totals.entries()].map(([currency, amount]) => ({
          currency,
          amount
        }))
      },
      upcomingTrip,
      tickets,
      calls: [],
      latestCallSummary: null,
      ticketStatusLabels: BookingRules.ticketSearchStatusLabels,
      notes,
      warnings: []
    };
  }

  async getClientCard(rawPhone) {
    const phone = normalizePhone(rawPhone);
    const orders = await this.getOrders(phone);
    const orderIds = orders.map((order) => order.id);
    const [tickets, returns, comments, clientNotes, callsResult] = await Promise.all([
      this.getTickets(orderIds),
      this.getReturns(orderIds),
      this.getTicketComments(orderIds),
      this.notesStore.list(phone),
      getBinotelCalls(this.binotelClient, phone)
    ]);
    const card = this.buildCard(phone, orders, tickets, returns, comments, clientNotes);
    attachBinotelCalls(card, callsResult);
    await attachLatestCallSummary(card, this.callSummaryService);
    return decorateCardStatuses(card);
  }

  async getTicketCard(rawPhone) {
    const phone = normalizePhone(rawPhone);
    const orders = await this.getOrders(phone);
    const orderIds = orders.map((order) => order.id);
    const [tickets, returns, comments, clientNotes] = await Promise.all([
      this.getTickets(orderIds),
      this.getReturns(orderIds),
      this.getTicketComments(orderIds),
      this.notesStore.list(phone)
    ]);
    const card = this.buildCard(phone, orders, tickets, returns, comments, clientNotes);
    if (!orders.length) {
      card.notes = clientNotes.map((note) => ({
        id: `local-${note.id}`,
        text: text(note.text),
        createdBy: text(note.createdBy) || "Оператор",
        createdAt: note.createdAt,
        source: "local_json"
      }));
    }
    return decorateCardStatuses(card);
  }

  async getCallSummary(rawPhone) {
    const phone = normalizePhone(rawPhone);
    const callsResult = await getBinotelCalls(this.binotelClient, phone);
    return this.callSummaryService.prepare(phone, callsResult ? callsResult.calls : []);
  }

  async getCallSummaryByCallId(callId) {
    return this.callSummaryService.status(callId);
  }

  async getAiClientContext(rawPhone) {
    const phone = normalizePhone(rawPhone);
    const orders = await this.getOrders(phone);
    const orderIds = orders.map((order) => order.id);
    const [tickets, returns, comments, clientNotes] = await Promise.all([
      this.getTickets(orderIds),
      this.getReturns(orderIds),
      this.getTicketComments(orderIds),
      this.notesStore.list(phone)
    ]);
    const card = this.buildCard(phone, orders, tickets, returns, comments, clientNotes);
    if (!orders.length) {
      card.notes = clientNotes.map((note) => ({
        id: `local-${note.id}`,
        text: text(note.text),
        createdBy: text(note.createdBy) || "Оператор",
        createdAt: timestamp(note.createdAt),
        source: "local_json"
      }));
    }
    return compactClientContext(decorateCardStatuses(card));
  }

  async addNote(rawPhone, noteText) {
    const phone = normalizePhone(rawPhone);
    return this.notesStore.add(phone, noteText);
  }

  async close() {
    if (this.closed) {
      return;
    }

    this.closed = true;
    await this.pool.end();
  }
}

class AutoClientStore {
  constructor(config, notesStore, binotelClient, callSummaryService) {
    this.config = config;
    this.mode = "auto";
    this.binotelClient = binotelClient;
    this.callSummaryService = callSummaryService;
    this.postgres = new PostgresClientStore(
      config,
      notesStore,
      binotelClient,
      callSummaryService
    );
    this.demo = new DemoClientStore(
      config,
      notesStore,
      binotelClient,
      callSummaryService
    );
    this.databaseFailed = false;
  }

  async run(method, ...args) {
    if (this.databaseFailed) {
      return this.demo[method](...args);
    }

    try {
      const value = await this.postgres[method](...args);
      this.mode = "postgres";
      return value;
    } catch (error) {
      this.databaseFailed = true;
      this.mode = "demo";
      console.warn(`PostgreSQL unavailable, using demo data: ${error.message}`);
      this.demo.warnings = [`PostgreSQL недоступний: ${error.message}`];
      return this.demo[method](...args);
    }
  }

  async health() {
    if (this.databaseFailed) {
      return this.demo.health();
    }

    const databaseHealth = await this.postgres.health();
    if (databaseHealth.ok) {
      this.mode = "postgres";
      return databaseHealth;
    }

    this.databaseFailed = true;
    this.mode = "demo";
    this.demo.warnings = [`PostgreSQL недоступний: ${databaseHealth.error}`];
    const demoHealth = await this.demo.health();
    return {
      ...demoHealth,
      database: "fallback_to_demo",
      databaseError: databaseHealth.error
    };
  }

  getClientCard(phone) {
    return this.run("getClientCard", phone);
  }

  getTicketCard(phone) {
    return this.run("getTicketCard", phone);
  }

  getCallSummary(phone) {
    return this.run("getCallSummary", phone);
  }

  getCallSummaryByCallId(callId) {
    return this.run("getCallSummaryByCallId", callId);
  }

  getAiClientContext(phone) {
    return this.run("getAiClientContext", phone);
  }

  addNote(phone, noteText) {
    return this.run("addNote", phone, noteText);
  }

  async close() {
    await this.postgres.close();
  }
}

function createClientStore(config) {
  const notesStore = new LocalNotesStore(
    config.localDataFile,
    config.noteAuthor
  );
  const binotelClient = new BinotelClient(config);
  const openAiClient = new OpenAiClient(config);
  const transcriptionClient = createTranscriptionClient(config, openAiClient);
  const callSummaryStore = new CallSummaryStore(config.callSummariesFile);
  const callSummaryService = new CallSummaryService(
    config,
    binotelClient,
    transcriptionClient,
    openAiClient,
    callSummaryStore
  );
  let store;

  if (config.demoMode === "true") {
    store = new DemoClientStore(
      config,
      notesStore,
      binotelClient,
      callSummaryService
    );
  } else if (config.demoMode === "false") {
    store = new PostgresClientStore(
      config,
      notesStore,
      binotelClient,
      callSummaryService
    );
  } else if (!config.database.password) {
    store = new DemoClientStore(config, notesStore, binotelClient, callSummaryService, [
      "DB_PASSWORD не заповнений, тому сервер працює в demo-режимі."
    ]);
  } else {
    store = new AutoClientStore(config, notesStore, binotelClient, callSummaryService);
  }

  callSummaryService.setClientContextProvider((phone) =>
    store.getAiClientContext(phone)
  );

  return store;
}

module.exports = {
  createClientStore
};
