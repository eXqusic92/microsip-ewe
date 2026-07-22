"use strict";

const { randomUUID } = require("crypto");
const AiPrompts = require("./ai-prompts");

function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function finiteNumber(value, fallback = null) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function evaluationPromptCacheKey(analysisProfile, callTypeKey) {
  const profileRevision = text(
    analysisProfile && (analysisProfile.semanticRevision || analysisProfile.revision)
  ) || "static";
  return `call-evaluation:${profileRevision}:${text(callTypeKey) || "other"}`.slice(0, 64);
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function endpoint(baseUrl, path) {
  return `${String(baseUrl || "").replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

function utcDayStart(value) {
  const date = new Date(value);
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
}

function nextUtcDayStart(value) {
  const result = utcDayStart(value);
  result.setUTCDate(result.getUTCDate() + 1);
  return result;
}

function retryAfterMillis(response) {
  const value = response.headers.get("retry-after");
  if (!value) {
    return 0;
  }

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1000);
  }

  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
}

function isRetryableStatus(status) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

class OpenAiApiError extends Error {
  constructor(message, options = {}) {
    const requestId = text(options.requestId);
    const suffix = requestId && !String(message).includes(requestId)
      ? ` (request ID ${requestId})`
      : "";
    super(`${message}${suffix}`);
    this.name = "OpenAiApiError";
    this.status = Number(options.status || 0);
    this.code = text(options.code);
    this.type = text(options.type);
    this.requestId = requestId;
    this.retryAfterMillis = Number(options.retryAfterMillis || 0);
    this.retryable = Boolean(options.retryable);
  }
}

function extractResponseText(response) {
  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  const parts = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n").trim();
}

function normalizeUsage(response) {
  const usage = (response && response.usage) || {};
  const inputDetails =
    usage.input_tokens_details ||
    usage.prompt_tokens_details ||
    {};
  const outputDetails =
    usage.output_tokens_details ||
    usage.completion_tokens_details ||
    {};

  const inputTokens = Number(usage.input_tokens || usage.prompt_tokens || 0);
  const cachedInputTokens = Number(
    inputDetails.cached_tokens ||
      inputDetails.cached_input_tokens ||
      usage.cached_input_tokens ||
      0
  );
  const outputTokens = Number(usage.output_tokens || usage.completion_tokens || 0);
  const reasoningTokens = Number(
    outputDetails.reasoning_tokens ||
      usage.reasoning_tokens ||
      0
  );
  const totalTokens = Number(
    usage.total_tokens ||
      inputTokens + outputTokens
  );

  if (!inputTokens && !outputTokens && !totalTokens) {
    return null;
  }

  return {
    inputTokens,
    cachedInputTokens,
    billableInputTokens: Math.max(0, inputTokens - cachedInputTokens),
    outputTokens,
    reasoningTokens,
    totalTokens
  };
}

function combineUsage(steps) {
  const normalizedSteps = Object.fromEntries(
    Object.entries(steps || {}).filter(([, usage]) => Boolean(usage))
  );

  const totals = {
    inputTokens: 0,
    cachedInputTokens: 0,
    billableInputTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0
  };

  for (const usage of Object.values(normalizedSteps)) {
    for (const key of Object.keys(totals)) {
      totals[key] += Number(usage[key] || 0);
    }
  }

  if (!Object.values(totals).some((value) => value > 0)) {
    return null;
  }

  return {
    ...totals,
    steps: normalizedSteps
  };
}

function compactSecondaryTranscript(value, primaryText, maxChars = 4000) {
  const normalized = text(value);
  if (!normalized || normalized === text(primaryText)) {
    return "";
  }

  if (normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, maxChars)}\n[текст обрізано для економії токенів]`;
}

function truncateText(value, maxChars = 280) {
  const normalized = text(value);
  if (!normalized || normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, maxChars).trim()}...`;
}

function callDateForAi(call) {
  const startedAt = text(call && call.startedAt);
  return /^\d{4}-\d{2}-\d{2}/.test(startedAt) ? startedAt.slice(0, 10) : null;
}

function compactTicketForAi(ticket) {
  if (!ticket || typeof ticket !== "object") {
    return null;
  }

  return {
    id: ticket.id || null,
    orderId: ticket.orderId || null,
    ticketNumber: ticket.ticketNumber || null,
    status: ticket.status || null,
    passenger: truncateText(ticket.passenger, 80) || null,
    departAt: ticket.departAt || null,
    arriveAt: ticket.arriveAt || null,
    route: truncateText(ticket.route, 120) || null,
    boarding: truncateText(ticket.boarding, 120) || null,
    destination: truncateText(ticket.destination, 120) || null,
    seat: ticket.seat || null
  };
}

function compactClientContextForAi(clientContext) {
  if (!clientContext || typeof clientContext !== "object") {
    return clientContext || null;
  }

  const contact = clientContext.contact || {};
  const notes = (Array.isArray(clientContext.notes) ? clientContext.notes : [])
    .slice(0, 2)
    .map((note) => ({
      text: truncateText(note && note.text, 180)
    }))
    .filter((note) => note.text);
  const tickets = [];
  const seenTickets = new Set();
  for (const ticket of [
    ...(Array.isArray(clientContext.activeTripCandidates)
      ? clientContext.activeTripCandidates
      : []),
    clientContext.upcomingTrip,
    ...(Array.isArray(clientContext.recentTickets) ? clientContext.recentTickets : [])
  ]) {
    const compact = compactTicketForAi(ticket);
    if (!compact) {
      continue;
    }
    const identity = [compact.id, compact.orderId, compact.ticketNumber]
      .filter(Boolean)
      .join(":");
    if (identity && seenTickets.has(identity)) {
      continue;
    }
    if (identity) {
      seenTickets.add(identity);
    }
    tickets.push(compact);
    if (tickets.length >= 4) {
      break;
    }
  }

  return {
    found: Boolean(clientContext.found),
    contact: {
      primaryName: truncateText(contact.primaryName, 80) || null,
      relatedPassengers: (Array.isArray(contact.relatedPassengers)
        ? contact.relatedPassengers
        : []
      ).slice(0, 4).map((value) => truncateText(value, 80)).filter(Boolean)
    },
    tickets,
    notes
  };
}

function buildMetricPromptRewriteSchema(optionKeys) {
  const optionKeyEnum = optionKeys.length ? optionKeys : [""];
  return {
    type: "object",
    additionalProperties: false,
    required: ["metric", "options", "rationale"],
    properties: {
      metric: {
        type: "object",
        additionalProperties: false,
        required: ["description", "aiInstructions"],
        properties: {
          description: { type: "string" },
          aiInstructions: { type: "string" }
        }
      },
      options: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["key", "aiInstructions"],
          properties: {
            key: {
              type: "string",
              enum: optionKeyEnum
            },
            aiInstructions: { type: "string" }
          }
        }
      },
      rationale: { type: "string" }
    }
  };
}

function metricPromptRewriteSystemPrompt() {
  return `
Ти senior prompt engineer для системи оцінювання дзвінків контакт-центру DUMA / East West Eurolines.

Твоя задача: обережно оновити інструкції однієї метрики якості та всі prompt-описи її варіантів оцінки на основі:
- поточних налаштувань метрики;
- поточного результату AI для конкретного дзвінка;
- повного контексту дзвінка: транскриптів, сегментів, ролей спікерів, AI-аналізу, інших метрик і клієнтського контексту;
- правки менеджера, який пояснив, що в оцінці було неточно.

Правила:
- Спочатку віднови по callContext, що реально відбулося в дзвінку і чому попередня оцінка могла бути хибною. Транскрипт і його сегменти є первинним джерелом; попередній AI-аналіз — лише результат, який може містити помилку.
- Зістав правку менеджера з конкретними репліками, ролями спікерів, evidence, improvement, сусідніми метриками та клієнтським контекстом. Якщо джерела суперечать одне одному, не вигадуй фактів — сформулюй обережне загальне правило.
- Поточний prompt є базою. Переписуй як консервативне злиття: збережи старі критерії та додай/уточни тільки те, що випливає з правки менеджера.
- Не втрачай конкретні деталі зі старого prompt: числа, відсотки, бонуси, кешбек, знижки, дедлайни, назви сервісів, списки переваг, способи оплати, етапи закриття та інші перевірювані умови.
- Не замінюй конкретику загальними словами. Наприклад, якщо старий prompt містить бонуси, кешбек, Wi-Fi, розетки чи дедлайн для скріна, ці деталі мають залишитись явно.
- Якщо старий prompt має перелік умов для option, усі релевантні умови мають залишитись у цьому option або бути явно перенесені в сусідній option. Не видаляй критерії мовчки.
- Якщо правка менеджера прямо суперечить старій деталі, узагальни або зміни її, але поясни це в rationale.
- preservationHints у user message — це чекліст деталей, які особливо важливо зберегти. Він не замінює повний currentPrompt, а лише підсвічує ризикові місця.
- Не додавай у новий prompt ID дзвінка, дату, телефон, ПІБ оператора або інший одноразовий контекст.
- Використай конкретний приклад тільки як сигнал, щоб узагальнити правило для майбутніх схожих дзвінків.
- Не змінюй ключі, назви, score, кольори, порядок або countsTowardScore варіантів оцінки.
- Поверни новий description та aiInstructions для метрики.
- Для КОЖНОГО варіанта оцінки поверни новий aiInstructions.
- Результат має бути token-efficient: description — одне коротке речення; кожен aiInstructions — найкоротша самодостатня інструкція, зазвичай 1–4 короткі речення або компактні правила через крапку з комою.
- Пиши операційно: "став цей option, якщо..."; "не зараховуй, коли..."; "за нечіткого доказу...". Не додавай вступів, пояснень очевидного, переказу дзвінка чи дублювання однакових правил у metric та options.
- Компактність не є причиною видаляти конкретні критерії. Якщо старий prompt багатий на умови, стискай формулювання, а не зміст.
- Уточнюй межі між сусідніми оцінками: коли ставити цей option, а коли інший.
- У rationale максимум двома короткими реченнями напиши, які деталі старого prompt збережено і що саме змінилось через правку менеджера.
- Пиши українською.
`.trim();
}

function promptRewriteTextSources(currentPrompt) {
  const sources = [];
  const metric = currentPrompt && typeof currentPrompt.metric === "object"
    ? currentPrompt.metric
    : {};
  const add = (scope, key, label, value) => {
    const normalized = text(value);
    if (normalized) {
      sources.push({
        scope,
        key: text(key),
        label: text(label),
        value: normalized
      });
    }
  };

  add("metric", metric.key, metric.label, metric.description);
  add("metric", metric.key, metric.label, metric.aiInstructions);
  add("metric", metric.key, metric.label, metric.aiBrief);

  for (const optionItem of Array.isArray(currentPrompt && currentPrompt.options)
    ? currentPrompt.options
    : []) {
    add("option", optionItem.key, optionItem.label, optionItem.aiInstructions);
    add("option", optionItem.key, optionItem.label, optionItem.aiBrief);
  }

  return sources;
}

function pushUniqueText(list, seen, value, maxChars = 260) {
  const normalized = text(value).replace(/\s+/g, " ");
  if (!normalized) {
    return;
  }
  const compact = truncateText(normalized, maxChars);
  const key = compact.toLowerCase();
  if (seen.has(key)) {
    return;
  }
  seen.add(key);
  list.push(compact);
}

function concretePromptDetailsForText(value, maxItems = 8) {
  const details = [];
  const seen = new Set();
  const normalized = text(value);
  if (!normalized) {
    return details;
  }

  const concretePattern =
    /(\d|%|грн|uah|usd|eur|євро|€|\$|бонус|кешбек|cashback|зниж|wi[-\s]?fi|вай[-\s]?фай|розет|туалет|клімат|сидін|дедлайн|скрін|трекер|готів|онлайн[-\s]?оплат|посилан|зворотн|поверн|додаток|пересад|ціна|час|дата|тривал|маршрут|правил[ао]\s+посад|закрив|оплат)/iu;
  const markerPatterns = [
    /\b\d+(?:[.,]\d+)?\s*(?:грн|євро|eur|uah|usd|€|\$)\b/giu,
    /\b\d+(?:[.,]\d+)?\s*%/gu,
    /\b\d{2,}(?:[.,]\d+)?\b/gu
  ];

  for (const pattern of markerPatterns) {
    for (const match of normalized.matchAll(pattern)) {
      pushUniqueText(details, seen, match[0], 80);
      if (details.length >= maxItems) {
        return details;
      }
    }
  }

  for (const chunk of normalized.split(/(?:[.!?]\s+|;\s+|\n+|•\s+)/u)) {
    if (!concretePattern.test(chunk)) {
      continue;
    }
    pushUniqueText(details, seen, chunk, 260);
    if (details.length >= maxItems) {
      break;
    }
  }

  return details;
}

function collectPromptPreservationHints(currentPrompt) {
  const sources = promptRewriteTextSources(currentPrompt);
  const metricHints = [];
  const metricSeen = new Set();
  const options = new Map();
  const criticalMarkers = [];
  const criticalSeen = new Set();

  for (const source of sources) {
    const details = concretePromptDetailsForText(source.value, 10);
    for (const detail of details) {
      pushUniqueText(criticalMarkers, criticalSeen, detail, 180);
    }

    if (source.scope === "metric") {
      for (const detail of details) {
        pushUniqueText(metricHints, metricSeen, detail);
      }
      continue;
    }

    const key = source.key || source.label || "option";
    const optionHints = options.get(key) || {
      key: source.key,
      label: source.label,
      hints: [],
      seen: new Set()
    };
    for (const detail of details) {
      pushUniqueText(optionHints.hints, optionHints.seen, detail);
    }
    options.set(key, optionHints);
  }

  return {
    purpose:
      "Concrete details from the existing prompt that should survive the rewrite unless manager feedback explicitly contradicts them.",
    criticalMarkers: criticalMarkers.slice(0, 40),
    metric: metricHints.slice(0, 12),
    options: [...options.values()]
      .map((optionHints) => ({
        key: optionHints.key,
        label: optionHints.label,
        hints: optionHints.hints.slice(0, 12)
      }))
      .filter((optionHints) => optionHints.hints.length > 0)
  };
}

function collectCriticalPromptMarkers(currentPrompt) {
  const markers = [];
  const seen = new Set();
  const markerPatterns = [
    /\b\d+(?:[.,]\d+)?\s*(?:грн|євро|eur|uah|usd|€|\$)\b/giu,
    /\b\d+(?:[.,]\d+)?\s*%/gu,
    /\b\d{2,}(?:[.,]\d+)?\b/gu
  ];

  for (const source of promptRewriteTextSources(currentPrompt)) {
    for (const pattern of markerPatterns) {
      for (const match of source.value.matchAll(pattern)) {
        pushUniqueText(markers, seen, match[0], 80);
      }
    }
  }

  return markers.slice(0, 30);
}

function promptRewriteProposalText(proposal) {
  const parts = [];
  const metric = proposal && typeof proposal.metric === "object"
    ? proposal.metric
    : {};
  parts.push(metric.description, metric.aiInstructions, metric.aiBrief);

  for (const optionItem of Array.isArray(proposal && proposal.options)
    ? proposal.options
    : []) {
    parts.push(optionItem.aiInstructions, optionItem.aiBrief);
  }

  return parts.map(text).filter(Boolean).join("\n");
}

function markerAppearsInText(value, marker) {
  const haystack = text(value).toLowerCase().replace(/\s+/g, "");
  const needle = text(marker).toLowerCase().replace(/\s+/g, "");
  return !needle || haystack.includes(needle);
}

function missingCriticalPromptMarkers(proposal, currentPrompt) {
  const proposalText = promptRewriteProposalText(proposal);
  return collectCriticalPromptMarkers(currentPrompt)
    .filter((marker) => !markerAppearsInText(proposalText, marker))
    .slice(0, 12);
}

function providedAnalysisCallType(call, analysisProfile) {
  const candidates = [
    call && call.analysisCallType,
    call && call.analysisCallTypeKey,
    call && call.aiAnalysisType,
    call && call.aiAnalysisTypeKey,
    call && call.aiCallType,
    call && call.aiCallTypeKey,
    call && call.customCallType,
    call && call.customCallTypeKey
  ].map(text).filter(Boolean);

  for (const candidate of candidates) {
    const resolved = AiPrompts.findAnalysisCallType(analysisProfile, candidate);
    if (
      resolved &&
      (
        resolved.key === candidate ||
        text(resolved.label).toLowerCase() === candidate.toLowerCase()
      )
    ) {
      return {
        callType: resolved.key,
        callTypeLabel: resolved.label,
        confidence: 1,
        reason: "Тип дзвінка передано явно, тому AI-класифікацію пропущено.",
        source: "provided"
      };
    }
  }

  return null;
}

class OpenAiClient {
  constructor(config) {
    this.config = config.openai || {};
    this.provider = "openai";
    this.analysisSettingsProvider = null;
  }

  get enabled() {
    return Boolean(this.config.enabled && this.config.apiKey);
  }

  setAnalysisSettingsProvider(provider) {
    this.analysisSettingsProvider = typeof provider === "function" ? provider : null;
  }

  async currentAnalysisProfile() {
    if (!this.analysisSettingsProvider) {
      return {
        settings: null,
        schemaVersion: "static",
        revision: "static"
      };
    }

    return this.analysisSettingsProvider();
  }

  summaryModel() {
    return this.config.summaryModel || "gpt-5.5";
  }

  promptRewriteModel() {
    return this.config.promptRewriteModel || this.summaryModel();
  }

  get costsApiEnabled() {
    return Boolean(this.config.adminApiKey);
  }

  async request(path, options) {
    const maxRetries = Math.max(0, Number(this.config.maxRetries || 0));
    const initialDelay = Math.max(100, Number(this.config.retryInitialMillis || 1000));
    const maxDelay = Math.max(initialDelay, Number(this.config.retryMaxMillis || 15000));
    const clientRequestId = randomUUID();
    let attempt = 0;

    while (true) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.config.timeoutMillis || 120000
      );

      try {
        const response = await fetch(endpoint(this.config.baseUrl, path), {
          ...options,
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "X-Client-Request-Id": clientRequestId,
            ...(options.headers || {})
          },
          signal: controller.signal
        });
        const requestId = response.headers.get("x-request-id") || "";
        const body = await response.text();
        let data;

        try {
          data = body ? JSON.parse(body) : {};
        } catch {
          throw new OpenAiApiError("OpenAI повернув не JSON відповідь", {
            status: response.status,
            requestId,
            retryAfterMillis: retryAfterMillis(response),
            retryable: isRetryableStatus(response.status)
          });
        }

        if (!response.ok) {
          throw new OpenAiApiError(
            data.error?.message || `OpenAI HTTP ${response.status}`,
            {
              status: response.status,
              code: data.error?.code,
              type: data.error?.type,
              requestId,
              retryAfterMillis: retryAfterMillis(response),
              retryable: isRetryableStatus(response.status)
            }
          );
        }

        return data;
      } catch (error) {
        let failure = error;
        if (error.name === "AbortError") {
          failure = new OpenAiApiError("OpenAI не відповів вчасно", {
            status: 408,
            retryable: true
          });
        } else if (!(error instanceof OpenAiApiError) && error instanceof TypeError) {
          failure = new OpenAiApiError(`Помилка з'єднання з OpenAI: ${error.message}`, {
            retryable: true
          });
        }

        if (!failure.retryable || attempt >= maxRetries) {
          throw failure;
        }

        const exponentialDelay = Math.min(maxDelay, initialDelay * (2 ** attempt));
        const delay = Math.max(
          failure.retryAfterMillis || 0,
          exponentialDelay
        ) + Math.floor(Math.random() * Math.min(500, exponentialDelay / 2));
        attempt += 1;
        console.warn(
          `OpenAI ${path} retry ${attempt}/${maxRetries} after ${delay} ms:` +
          ` ${failure.message}`
        );
        await sleep(delay);
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  async organizationCosts({ startTime, endTime }) {
    if (!this.costsApiEnabled) {
      return {
        available: false,
        reason: "not_configured"
      };
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (
      !Number.isFinite(start.getTime()) ||
      !Number.isFinite(end.getTime()) ||
      end <= start
    ) {
      throw new Error("Некоректний період для OpenAI costs");
    }

    const buckets = [];
    const seenPages = new Set();
    let page = "";
    // Costs API is returned in daily UTC buckets. Supplying a sub-day end
    // timestamp produces a 400 response, which previously made analytics
    // silently fall back to the local token-price estimate.
    const queryStart = utcDayStart(start);
    const queryEnd = nextUtcDayStart(end);

    while (true) {
      const query = new URLSearchParams({
        start_time: String(Math.floor(queryStart.getTime() / 1000)),
        end_time: String(Math.floor(queryEnd.getTime() / 1000)),
        bucket_width: "1d",
        limit: "180"
      });
      if (this.config.costProjectId) {
        query.append("project_ids", this.config.costProjectId);
      }
      if (page) {
        query.set("page", page);
      }

      const data = await this.request(`organization/costs?${query}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.adminApiKey}`
        }
      });
      for (const bucket of Array.isArray(data && data.data) ? data.data : []) {
        const costUsd = (Array.isArray(bucket && bucket.results) ? bucket.results : [])
          .reduce((total, result) => total + Number(
            result && result.amount && result.amount.value || 0
          ), 0);
        buckets.push({
          startTime: Number(bucket && bucket.start_time) || 0,
          endTime: Number(bucket && bucket.end_time) || 0,
          costUsd: Number.isFinite(costUsd) ? costUsd : 0
        });
      }

      const nextPage = text(data && data.next_page);
      if (!nextPage || seenPages.has(nextPage)) {
        break;
      }
      seenPages.add(nextPage);
      page = nextPage;
    }

    return {
      available: true,
      costUsd: buckets.reduce((total, bucket) => total + bucket.costUsd, 0),
      buckets,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      queryStartTime: queryStart.toISOString(),
      queryEndTime: queryEnd.toISOString()
    };
  }

  async classifyTranscript({ transcript, analysisProfile }) {
    if (!this.enabled) {
      throw new Error("OPENAI_API_KEY не налаштований");
    }

    const data = await this.request("responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.summaryModel(),
        reasoning: {
          effort: "low"
        },
        input: [
          {
            role: "system",
            content: AiPrompts.buildCallTypeClassificationSystemPrompt(analysisProfile)
          },
          {
            role: "user",
            content: JSON.stringify({
              transcript: transcript.text
            })
          }
        ],
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "call_type_classification",
            strict: true,
            schema: AiPrompts.buildCallTypeClassificationSchema(analysisProfile)
          }
        }
      })
    });

    const body = extractResponseText(data);
    if (!body) {
      throw new Error("OpenAI не повернув класифікацію типу дзвінка");
    }

    const parsed = JSON.parse(body);
    const callType = AiPrompts.findAnalysisCallType(analysisProfile, parsed.callType);
    return {
      ...parsed,
      callType: callType.key,
      callTypeLabel: callType.label,
      confidence: finiteNumber(parsed.confidence, 0.6),
      usage: normalizeUsage(data)
    };
  }

  async evaluateTranscript({
    call,
    transcript,
    clientContext,
    analysisProfile,
    classification
  }) {
    if (!this.enabled) {
      throw new Error("OPENAI_API_KEY не налаштований");
    }

    const callType = AiPrompts.findAnalysisCallType(
      analysisProfile,
      classification && classification.callType
    );
    const evaluationInput = {
      clientContext: compactClientContextForAi(clientContext),
      diarizedTranscript: transcript.text
    };
    const callDate = callDateForAi(call);
    if (callDate) {
      evaluationInput.callDate = callDate;
    }
    const promptedTranscript = compactSecondaryTranscript(
      transcript.promptedText,
      transcript.text
    );
    const originalPromptedTranscript = compactSecondaryTranscript(
      transcript.originalPromptedText,
      transcript.text
    );
    if (promptedTranscript) {
      evaluationInput.promptedTranscript = promptedTranscript;
    }
    if (originalPromptedTranscript) {
      evaluationInput.originalPromptedTranscript = originalPromptedTranscript;
    }
    const data = await this.request("responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.summaryModel(),
        prompt_cache_key: evaluationPromptCacheKey(analysisProfile, callType.key),
        reasoning: {
          effort: "low"
        },
        input: [
          {
            role: "system",
            content: AiPrompts.buildCallEvaluationSystemPrompt(
              analysisProfile,
              callType.key
            )
          },
          {
            role: "user",
            content: JSON.stringify(evaluationInput)
          }
        ],
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "call_evaluation",
            strict: true,
            schema: AiPrompts.buildCallEvaluationSchema(
              analysisProfile,
              callType.key
            )
          }
        }
      })
    });

    const body = extractResponseText(data);
    if (!body) {
      throw new Error("OpenAI не повернув аналіз дзвінка");
    }

    return {
      ...JSON.parse(body),
      usage: normalizeUsage(data)
    };
  }

  async summarizeTranscript({ call, transcript, clientContext }) {
    if (!this.enabled) {
      throw new Error("OPENAI_API_KEY не налаштований");
    }

    const analysisProfile = await this.currentAnalysisProfile();
    const providedClassification = providedAnalysisCallType(call, analysisProfile);
    const classification = providedClassification || await this.classifyTranscript({
      call,
      transcript,
      analysisProfile
    });
    const classificationUsage = classification.usage || null;
    delete classification.usage;

    const rawEvaluation = await this.evaluateTranscript({
      call,
      transcript,
      clientContext,
      analysisProfile,
      classification
    });
    const evaluationUsage = rawEvaluation.usage || null;
    delete rawEvaluation.usage;

    const summary = AiPrompts.enrichCallEvaluation(
      rawEvaluation,
      analysisProfile,
      classification.callType,
      classification
    );

    return {
      ...summary,
      analysisPipeline: {
        version: "two_stage_metric_evaluation",
        classification
      },
      model: this.summaryModel(),
      version: this.config.summaryVersion,
      analysisProfile: {
        schemaVersion: analysisProfile.schemaVersion,
        revision: analysisProfile.revision,
        semanticRevision: analysisProfile.semanticRevision,
        scoringRevision: analysisProfile.scoringRevision
      },
      usage: combineUsage({
        classification: classificationUsage,
        evaluation: evaluationUsage
      })
    };
  }

  async rewriteMetricPrompt({ feedback, target, currentPrompt, callContext }) {
    if (!this.enabled) {
      throw new Error("OPENAI_API_KEY не налаштований");
    }

    const options = Array.isArray(currentPrompt && currentPrompt.options)
      ? currentPrompt.options
      : [];
    const optionKeys = options.map((optionItem) => text(optionItem.key)).filter(Boolean);
    const model = this.promptRewriteModel();
    const preservationHints = collectPromptPreservationHints(currentPrompt);
    const buildUserPayload = (missingMarkers = []) => ({
      task:
        "Diagnose the manager correction using the full call context, then rewrite the metric prompt as short reusable rules. Return only the JSON schema output.",
      target,
      currentPrompt,
      preservationHints,
      previousAttemptMissingCriticalMarkers: missingMarkers,
      retryInstruction: missingMarkers.length
        ? "Previous rewrite dropped these critical markers from the existing prompt. Rewrite again and preserve them explicitly unless manager feedback contradicts them."
        : "",
      managerFeedback: {
        text: feedback && (feedback.text || feedback.feedbackText),
        createdBy: feedback && feedback.createdBy,
        updatedBy: feedback && feedback.updatedBy,
        updatedAt: feedback && feedback.updatedAt,
        history:
          feedback &&
          feedback.payload &&
          Array.isArray(feedback.payload.history)
            ? feedback.payload.history
            : []
      },
      evaluatedExample: {
        selectedOptionKey: feedback && feedback.metric && feedback.metric.selectedOptionKey,
        selectedOptionLabel: feedback && feedback.metric && feedback.metric.selectedOptionLabel,
        score: feedback && feedback.metric && feedback.metric.score,
        maxScore: feedback && feedback.metric && feedback.metric.maxScore,
        evidence: feedback && feedback.metric && feedback.metric.evidence,
        improvement: feedback && feedback.metric && feedback.metric.improvement,
        callType: feedback && feedback.call && (feedback.call.typeLabel || feedback.call.type)
      },
      evaluatedMetric: feedback && feedback.metric,
      callContext: callContext || null,
      outputRequirements: {
        purpose:
          "Create short reusable instructions for future calls after diagnosing this example in full context.",
        metricDescription: "One short sentence.",
        metricInstructions:
          "Usually 1-4 short sentences or compact semicolon-separated decision rules.",
        optionInstructions:
          "For every option, state the shortest clear boundary for selecting it versus adjacent options.",
        rationale: "At most two short sentences.",
        forbidden:
          "Do not copy call IDs, dates, phone numbers, names, transcript quotes, or other one-off details into the saved prompt."
      }
    });
    const requestRewrite = async (missingMarkers = []) => {
      const data = await this.request("responses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          reasoning: {
            effort: "medium"
          },
          input: [
            {
              role: "system",
              content: metricPromptRewriteSystemPrompt()
            },
            {
              role: "user",
              content: JSON.stringify(buildUserPayload(missingMarkers))
            }
          ],
          text: {
            verbosity: "low",
            format: {
              type: "json_schema",
              name: "metric_prompt_rewrite",
              strict: true,
              schema: buildMetricPromptRewriteSchema(optionKeys)
            }
          }
        })
      });
      const body = extractResponseText(data);
      if (!body) {
        throw new Error("OpenAI не повернув rewrite prompt метрики");
      }
      return {
        data,
        proposal: JSON.parse(body)
      };
    };

    const firstAttempt = await requestRewrite();
    let proposal = firstAttempt.proposal;
    const usageSteps = {
      rewrite: normalizeUsage(firstAttempt.data)
    };
    let missingMarkers = missingCriticalPromptMarkers(proposal, currentPrompt);

    if (missingMarkers.length) {
      const secondAttempt = await requestRewrite(missingMarkers);
      proposal = secondAttempt.proposal;
      usageSteps.rewriteRetry = normalizeUsage(secondAttempt.data);
      missingMarkers = missingCriticalPromptMarkers(proposal, currentPrompt);
    }

    if (missingMarkers.length) {
      const warning = `Перевірити вручну: AI міг не зберегти деталі зі старого prompt: ${missingMarkers.join(", ")}.`;
      proposal.rationale = [proposal.rationale, warning].map(text).filter(Boolean).join("\n");
      proposal.preservationWarnings = missingMarkers;
    }

    return {
      ...proposal,
      model,
      usage: combineUsage(usageSteps)
    };
  }
}

module.exports = {
  DOMAIN_TERMS: AiPrompts.DOMAIN_TERMS,
  OpenAiClient
};
