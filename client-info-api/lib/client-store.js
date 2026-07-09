"use strict";

const { Pool } = require("pg");

const { BinotelClient } = require("./binotel-client");
const BookingRules = require("./booking-rules");
const { CallSummaryService } = require("./call-summary-service");
const { createDemoCard } = require("./demo-data");
const { DispatcherApiClient, normalizeTripId } = require("./dispatcher-api-client");
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

function activeOrUpcomingTripInfo(ticket, now) {
  const departAt = ticket && ticket.departAt ? new Date(ticket.departAt).getTime() : 0;
  const arriveAt = ticket && ticket.arriveAt ? new Date(ticket.arriveAt).getTime() : 0;
  if (!departAt) {
    return null;
  }

  if (departAt <= now && arriveAt && arriveAt >= now) {
    return { priority: 0, sortTime: departAt };
  }

  if (departAt >= now) {
    return { priority: 1, sortTime: departAt };
  }

  return null;
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

async function attachTripAssignmentBusNumbers(card, dispatcherClient) {
  if (!card || !dispatcherClient || !dispatcherClient.enabled) {
    return card;
  }

  const tripIds = [
    ...new Set(
      (card.tickets || [])
        .map((ticket) => ticket && ticket.tripId)
        .filter(Boolean)
    )
  ];

  if (!tripIds.length) {
    return card;
  }

  try {
    const busAssignments = await dispatcherClient.getBusAssignmentsForTripIds(tripIds);
    for (const ticket of card.tickets || []) {
      const tripId = ticket && ticket.tripId;
      if (!tripId || !Object.prototype.hasOwnProperty.call(busAssignments, String(tripId))) {
        continue;
      }

      const assignment = busAssignments[String(tripId)] || {};
      ticket.busNumber = assignment.busNumber || "";
      ticket.busColor = assignment.busColor || "";
      ticket.busAssignmentChecked = true;
    }
    refreshCardTransferSegments(card);
  } catch (error) {
    console.warn(`Dispatcher trip assignments unavailable: ${error.message}`);
  }

  return card;
}

function tripAssignmentPayload(busAssignments) {
  return Object.fromEntries(
    Object.entries(busAssignments || {}).map(([tripId, assignment]) => [
      String(tripId),
      {
        tripId: String(tripId),
        busNumber: text(assignment && assignment.busNumber),
        busColor: text(assignment && assignment.busColor),
        busAssignmentChecked: true
      }
    ])
  );
}

function normalizeTripIdList(values) {
  const source = Array.isArray(values)
    ? values
    : String(values || "")
        .split(",")
        .map((item) => item.trim());
  return [...new Set(source.map(normalizeTripId).filter(Boolean))];
}

function compactTransferSegment(ticket) {
  return {
    id: ticket.id,
    orderId: ticket.orderId,
    tripId: ticket.tripId,
    orderNumber: ticket.orderNumber,
    ticketNumber: ticket.ticketNumber,
    routeCode: ticket.routeCode,
    status: ticket.status,
    statusLabel: ticket.statusLabel,
    passenger: ticket.passenger,
    departAt: ticket.departAt,
    arriveAt: ticket.arriveAt,
    from: ticket.from,
    to: ticket.to,
    carrier: ticket.carrier,
    agent: ticket.agent,
    agentCode: ticket.agentCode,
    seat: ticket.seat,
    price: ticket.price,
    busNumber: ticket.busNumber || "",
    busColor: ticket.busColor || "",
    busAssignmentChecked: Boolean(ticket.busAssignmentChecked),
    transferLegIndex: ticket.transferLegIndex || null
  };
}

function attachTicketTransferSegments(tickets) {
  const list = Array.isArray(tickets) ? tickets : [];
  const groups = new Map();

  for (const ticket of list) {
    const groupKey = text(ticket && ticket.transferGroupKey);
    if (!groupKey) {
      if (ticket) {
        ticket.isTransfer = false;
        ticket.transferSegments = [];
      }
      continue;
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey).push(ticket);
  }

  for (const group of groups.values()) {
    group.sort((left, right) => {
      const leftLeg = Number(left.transferLegIndex || 0);
      const rightLeg = Number(right.transferLegIndex || 0);
      if (leftLeg !== rightLeg) {
        return leftLeg - rightLeg;
      }
      return new Date(left.departAt || 0) - new Date(right.departAt || 0);
    });

    const segments = group.map(compactTransferSegment);
    for (const ticket of group) {
      ticket.isTransfer = segments.length > 1;
      ticket.transferSegments = segments.length > 1 ? segments : [];
    }
  }

  return list;
}

function refreshCardTransferSegments(card) {
  if (card && Array.isArray(card.tickets)) {
    attachTicketTransferSegments(card.tickets);
  }
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
    tripId: ticket.tripId,
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
    seat: ticket.seat,
    busNumber: ticket.busNumber || null,
    busColor: ticket.busColor || null,
    transferSegments: (ticket.transferSegments || [])
      .map((segment) => ({
        ticketNumber: segment.ticketNumber,
        routeCode: segment.routeCode,
        departAt: segment.departAt,
        arriveAt: segment.arriveAt,
        route: [
          segment.from && segment.from.locality,
          segment.to && segment.to.locality
        ]
          .filter(Boolean)
          .join(" -> "),
        seat: segment.seat || null
      }))
      .filter((segment) => segment.route)
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
  constructor(config, notesStore, binotelClient, callSummaryService, dispatcherClient, warnings = []) {
    this.config = config;
    this.notesStore = notesStore;
    this.binotelClient = binotelClient;
    this.callSummaryService = callSummaryService;
    this.dispatcherClient = dispatcherClient;
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
      dispatcherApiConfigured: Boolean(this.dispatcherClient && this.dispatcherClient.enabled),
      openAiConfigured: Boolean(this.callSummaryService && this.callSummaryService.enabled),
      transcriptionProvider:
        (this.callSummaryService && this.callSummaryService.transcriptionProvider) ||
        "openai"
    };
  }

  async getClientCard(phone) {
    const card = await this.getClientCardBase(phone);
    const [callsPayload, tripAssignmentsPayload] = await Promise.all([
      this.getClientCardCalls(phone),
      this.getTripAssignmentsForTripIds(
        (card.tickets || []).map((ticket) => ticket.tripId)
      )
    ]);
    card.calls = callsPayload.calls || [];
    card.latestCallSummary = callsPayload.latestCallSummary || null;
    card.warnings = [...(card.warnings || []), ...(callsPayload.warnings || [])];
    for (const ticket of card.tickets || []) {
      const assignment = tripAssignmentsPayload.assignments[String(ticket.tripId || "")];
      if (assignment) {
        ticket.busNumber = assignment.busNumber || "";
        ticket.busColor = assignment.busColor || "";
        ticket.busAssignmentChecked = true;
      }
    }
    if (card.upcomingTrip) {
      const assignment = tripAssignmentsPayload.assignments[String(card.upcomingTrip.tripId || "")];
      if (assignment) {
        card.upcomingTrip.busNumber = assignment.busNumber || "";
        card.upcomingTrip.busColor = assignment.busColor || "";
        card.upcomingTrip.busAssignmentChecked = true;
      }
    }
    refreshCardTransferSegments(card);
    return decorateCardStatuses(card);
  }

  async getClientCardBase(phone) {
    const card = createDemoCard(phone);
    const storedNotes = await this.notesStore.list(phone);
    card.notes = [...storedNotes, ...card.notes];
    card.warnings = [...this.warnings, ...card.warnings];
    card.calls = [];
    card.latestCallSummary = null;
    return decorateCardStatuses(card);
  }

  async getClientCardCalls(rawPhone) {
    const phone = normalizePhone(rawPhone);
    const demoCard = createDemoCard(phone);
    const callsResult = await getBinotelCalls(this.binotelClient, phone);
    const calls = callsResult ? callsResult.calls : demoCard.calls || [];
    return {
      calls,
      warnings: callsResult ? callsResult.warnings : [],
      latestCallSummary: await this.callSummaryService.prepare(phone, calls)
    };
  }

  async getTripAssignmentsForTripIds(rawTripIds) {
    const tripIds = normalizeTripIdList(rawTripIds);
    return {
      assignments: tripAssignmentPayload(
        await this.dispatcherClient.getBusAssignmentsForTripIds(tripIds)
      )
    };
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

  async updateNote(noteId, noteText) {
    return this.notesStore.update(noteId, noteText);
  }

  async deleteNote(noteId) {
    return this.notesStore.delete(noteId);
  }

  async close() {}
}

class PostgresClientStore {
  constructor(config, notesStore, binotelClient, callSummaryService, dispatcherClient) {
    this.config = config;
    this.notesStore = notesStore;
    this.binotelClient = binotelClient;
    this.callSummaryService = callSummaryService;
    this.dispatcherClient = dispatcherClient;
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
        dispatcherApiConfigured: Boolean(this.dispatcherClient && this.dispatcherClient.enabled),
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
        dispatcherApiConfigured: Boolean(this.dispatcherClient && this.dispatcherClient.enabled),
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
          o.created_at AS order_created_at,
          o.updated_at AS order_updated_at,
          o.sale_date AS order_sale_date,
          o.cost AS order_cost,
          o.price AS order_price,
          o.currency AS order_currency,
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
          NULLIF(BTRIM(gp_from.address), '') AS geo_point_from_address,
          t.geo_locality_to AS geo_locality_to_id,
          NULLIF(BTRIM(gl_to.name), '') AS geo_locality_to_name,
          t.geo_point_to AS geo_point_to_id,
          NULLIF(BTRIM(gp_to.name), '') AS geo_point_to_name,
          NULLIF(BTRIM(gp_to.address), '') AS geo_point_to_address,
          t.pass_name AS firstname,
          t.pass_surname AS lastname,
          COALESCE(NULLIF(BTRIM(oc.name), ''), NULLIF(BTRIM(t.carrier_code), '')) AS carrier_name,
          COALESCE(NULLIF(BTRIM(oa.name), ''), NULLIF(BTRIM(oa.code), ''), NULLIF(BTRIM(t.agent_code), '')) AS agent_name,
          COALESCE(NULLIF(BTRIM(oa.code), ''), NULLIF(BTRIM(t.agent_code), '')) AS agent_code,
          t.cost AS ticket_cost,
          t.price AS ticket_price,
          t.tariff AS ticket_tariff,
          t.currency AS currency_ticket,
          CASE
            WHEN tc.id IS NOT NULL THEN COALESCE(tc.hash::text, tc.id::text)
            ELSE ''
          END AS combined_group_key,
          COALESCE(tc.hash::text, '') AS combined_hash,
          CASE
            WHEN tc.ticket_from_id = t.id THEN 1
            WHEN tc.ticket_to_id = t.id THEN 2
            ELSE NULL
          END AS combined_leg_index,
          tc.ticket_from_id AS combined_ticket_from_id,
          tc.ticket_to_id AS combined_ticket_to_id
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
        LEFT JOIN LATERAL (
          SELECT id, hash, ticket_from_id, ticket_to_id
          FROM public.ticket_combined tc
          WHERE tc.ticket_from_id = t.id
             OR tc.ticket_to_id = t.id
          ORDER BY tc.id ASC
          LIMIT 1
        ) tc ON TRUE
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
        tripId: item.trip_id ? String(item.trip_id) : "",
        orderUrl: item.order_id ? `${ORDER_VIEW_BASE_URL}${item.order_id}/view` : "",
        ticketNumber: text(item.ticket_number),
        orderNumber: text(item.order_number),
        orderCreatedAt: timestamp(item.order_created_at),
        orderUpdatedAt: timestamp(item.order_updated_at),
        orderSaleDate: timestamp(item.order_sale_date),
        orderPrice: {
          amount: number(firstPresent(item.order_cost, item.order_price)),
          currency: text(item.order_currency) || text(item.currency_ticket) || "UAH"
        },
        routeCode: text(item.route_code),
        status,
        statusLabel: ticketStatusLabel(status),
        passenger: passenger || "Ім’я не вказано",
        departAt: timestamp(item.depart_at),
        arriveAt: timestamp(item.arrive_at),
        from: {
          locality: text(item.geo_locality_from_name),
          point: text(item.geo_point_from_name),
          address: text(item.geo_point_from_address)
        },
        to: {
          locality: text(item.geo_locality_to_name),
          point: text(item.geo_point_to_name),
          address: text(item.geo_point_to_address)
        },
        carrier: text(item.carrier_name),
        agent: text(item.agent_name),
        agentCode: text(item.agent_code),
        seat: text(item.seat) || text(item.seat_number),
        price: {
          amount: number(firstPresent(item.ticket_cost, item.ticket_price, item.ticket_tariff)),
          currency: text(item.currency_ticket) || "UAH"
        },
        transferGroupKey: text(item.combined_group_key),
        transferHash: text(item.combined_hash),
        transferLegIndex: number(item.combined_leg_index) || null,
        transferTicketFromId: item.combined_ticket_from_id
          ? String(item.combined_ticket_from_id)
          : "",
        transferTicketToId: item.combined_ticket_to_id
          ? String(item.combined_ticket_to_id)
          : "",
        isTransfer: Boolean(text(item.combined_group_key)),
        transferSegments: [],
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
    attachTicketTransferSegments(tickets);

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
        .map((ticket) => ({ ticket, tripInfo: activeOrUpcomingTripInfo(ticket, now) }))
        .filter(
          ({ ticket, tripInfo }) =>
            tripInfo &&
            !BookingRules.isClosedStatus(ticket.status) &&
            !ticket.returnInfo
        )
        .sort(
          (left, right) =>
            left.tripInfo.priority - right.tripInfo.priority ||
            left.tripInfo.sortTime - right.tripInfo.sortTime
        )[0]?.ticket || null;

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
    const card = await this.getClientCardBase(rawPhone);
    const [callsPayload, tripAssignmentsPayload] = await Promise.all([
      this.getClientCardCalls(rawPhone),
      this.getTripAssignmentsForTripIds(
        (card.tickets || []).map((ticket) => ticket.tripId)
      )
    ]);
    card.calls = callsPayload.calls || [];
    card.latestCallSummary = callsPayload.latestCallSummary || null;
    card.warnings = [...(card.warnings || []), ...(callsPayload.warnings || [])];
    for (const ticket of card.tickets || []) {
      const assignment = tripAssignmentsPayload.assignments[String(ticket.tripId || "")];
      if (assignment) {
        ticket.busNumber = assignment.busNumber || "";
        ticket.busColor = assignment.busColor || "";
        ticket.busAssignmentChecked = true;
      }
    }
    if (card.upcomingTrip) {
      const assignment = tripAssignmentsPayload.assignments[String(card.upcomingTrip.tripId || "")];
      if (assignment) {
        card.upcomingTrip.busNumber = assignment.busNumber || "";
        card.upcomingTrip.busColor = assignment.busColor || "";
        card.upcomingTrip.busAssignmentChecked = true;
      }
    }
    refreshCardTransferSegments(card);
    return decorateCardStatuses(card);
  }

  async getClientCardBase(rawPhone) {
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
    return decorateCardStatuses(card);
  }

  async getClientCardCalls(rawPhone) {
    const phone = normalizePhone(rawPhone);
    const callsResult = await getBinotelCalls(this.binotelClient, phone);
    const calls = callsResult ? callsResult.calls : [];
    return {
      calls,
      warnings: callsResult ? callsResult.warnings : [],
      latestCallSummary: await this.callSummaryService.prepare(phone, calls)
    };
  }

  async getTripAssignmentsForTripIds(rawTripIds) {
    const tripIds = normalizeTripIdList(rawTripIds);
    return {
      assignments: tripAssignmentPayload(
        await this.dispatcherClient.getBusAssignmentsForTripIds(tripIds)
      )
    };
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
    await attachTripAssignmentBusNumbers(card, this.dispatcherClient);
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
    await attachTripAssignmentBusNumbers(card, this.dispatcherClient);
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

  async updateNote(noteId, noteText) {
    return this.notesStore.update(noteId, noteText);
  }

  async deleteNote(noteId) {
    return this.notesStore.delete(noteId);
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
  constructor(config, notesStore, binotelClient, callSummaryService, dispatcherClient) {
    this.config = config;
    this.mode = "auto";
    this.binotelClient = binotelClient;
    this.callSummaryService = callSummaryService;
    this.dispatcherClient = dispatcherClient;
    this.postgres = new PostgresClientStore(
      config,
      notesStore,
      binotelClient,
      callSummaryService,
      dispatcherClient
    );
    this.demo = new DemoClientStore(
      config,
      notesStore,
      binotelClient,
      callSummaryService,
      dispatcherClient
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

  getClientCardBase(phone) {
    return this.run("getClientCardBase", phone);
  }

  getClientCardCalls(phone) {
    return this.run("getClientCardCalls", phone);
  }

  getTripAssignmentsForTripIds(tripIds) {
    return this.run("getTripAssignmentsForTripIds", tripIds);
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

  updateNote(noteId, noteText) {
    return this.run("updateNote", noteId, noteText);
  }

  deleteNote(noteId) {
    return this.run("deleteNote", noteId);
  }

  async close() {
    await this.postgres.close();
  }
}

function createClientStore(config, appStateDatabase) {
  if (
    !appStateDatabase ||
    !appStateDatabase.notesStore ||
    !appStateDatabase.aiAnalysisSettingsStore ||
    !appStateDatabase.callSummaryStore
  ) {
    throw new Error(
      "Writable app-state PostgreSQL stores are required; JSON fallback has been removed"
    );
  }

  const notesStore = appStateDatabase.notesStore;
  const binotelClient = new BinotelClient(config);
  const dispatcherClient = new DispatcherApiClient(config);
  const openAiClient = new OpenAiClient(config);
  const aiAnalysisSettingsStore = appStateDatabase.aiAnalysisSettingsStore;
  openAiClient.setAnalysisSettingsProvider(() =>
    aiAnalysisSettingsStore.getProfile()
  );
  const transcriptionClient = createTranscriptionClient(config);
  const callSummaryStore = appStateDatabase.callSummaryStore;
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
      callSummaryService,
      dispatcherClient
    );
  } else if (config.demoMode === "false") {
    store = new PostgresClientStore(
      config,
      notesStore,
      binotelClient,
      callSummaryService,
      dispatcherClient
    );
  } else if (!config.database.password) {
    store = new DemoClientStore(config, notesStore, binotelClient, callSummaryService, dispatcherClient, [
      "DB_PASSWORD не заповнений, тому сервер працює в demo-режимі."
    ]);
  } else {
    store = new AutoClientStore(
      config,
      notesStore,
      binotelClient,
      callSummaryService,
      dispatcherClient
    );
  }

  callSummaryService.setClientContextProvider((phone) =>
    store.getAiClientContext(phone)
  );
  store.aiAnalysisSettingsStore = aiAnalysisSettingsStore;
  store.openAiClient = openAiClient;
  store.getAiAnalysisSettings = () =>
    aiAnalysisSettingsStore.getPublicSettings();
  store.updateAiAnalysisSettings = (settings) =>
    aiAnalysisSettingsStore.update(settings);
  store.resetAiAnalysisSettings = () =>
    aiAnalysisSettingsStore.reset();

  return store;
}

module.exports = {
  createClientStore
};
