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

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function endpoint(baseUrl, path) {
  return `${String(baseUrl || "").replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
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

function callMetadata(call) {
  return {
    startedAt: call.startedAt,
    type: call.typeLabel,
    disposition: call.dispositionLabel,
    operator: call.employee && call.employee.name,
    externalNumber: call.externalNumber
  };
}

function truncateText(value, maxChars = 280) {
  const normalized = text(value);
  if (!normalized || normalized.length <= maxChars) {
    return normalized;
  }

  return `${normalized.slice(0, maxChars).trim()}...`;
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

function compactTicketListForAi(value, maxItems) {
  return (Array.isArray(value) ? value : [])
    .slice(0, maxItems)
    .map(compactTicketForAi)
    .filter(Boolean);
}

function compactClientContextForAi(clientContext) {
  if (!clientContext || typeof clientContext !== "object") {
    return clientContext || null;
  }

  const contact = clientContext.contact || {};
  const stats = clientContext.stats || {};
  const notes = (Array.isArray(clientContext.notes) ? clientContext.notes : [])
    .slice(0, 3)
    .map((note) => ({
      text: truncateText(note && note.text, 260),
      source: text(note && note.source) || null,
      createdAt: (note && note.createdAt) || null
    }))
    .filter((note) => note.text);

  return {
    purpose:
      "Compact CRM context. Use only when it clearly matches the transcript.",
    found: Boolean(clientContext.found),
    source: text(clientContext.source) || null,
    contact: {
      phone: contact.phone || null,
      primaryName: truncateText(contact.primaryName, 80) || null,
      relatedPassengers: (Array.isArray(contact.relatedPassengers)
        ? contact.relatedPassengers
        : []
      ).slice(0, 4).map((value) => truncateText(value, 80)).filter(Boolean)
    },
    stats: {
      orders: stats.orders || 0,
      tickets: stats.tickets || 0,
      firstOrderAt: stats.firstOrderAt || null,
      lastOrderAt: stats.lastOrderAt || null
    },
    activeTripCandidates: compactTicketListForAi(
      clientContext.activeTripCandidates,
      2
    ),
    upcomingTrip: compactTicketForAi(clientContext.upcomingTrip),
    recentTickets: compactTicketListForAi(clientContext.recentTickets, 3),
    notes
  };
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

  async classifyTranscript({ call, transcript, analysisProfile }) {
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
              call: callMetadata(call),
              domainTerms: AiPrompts.DOMAIN_TERMS,
              diarizedTranscript: transcript.text
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
            content: AiPrompts.buildCallEvaluationSystemPrompt(
              analysisProfile,
              callType.key
            )
          },
          {
            role: "user",
            content: JSON.stringify({
              analysisSettings: {
                schemaVersion: analysisProfile.schemaVersion,
                revision: analysisProfile.revision
              },
              classifiedCallType: {
                callType: callType.key,
                callTypeLabel: callType.label,
                confidence: finiteNumber(
                  classification && classification.confidence,
                  0.6
                ),
                reason: text(classification && classification.reason)
              },
              call: callMetadata(call),
              domainTerms: AiPrompts.DOMAIN_TERMS,
              clientContext: compactClientContextForAi(clientContext),
              diarizedTranscript: transcript.text,
              promptedTranscript: compactSecondaryTranscript(
                transcript.promptedText,
                transcript.text
              ),
              originalPromptedTranscript: compactSecondaryTranscript(
                transcript.originalPromptedText,
                transcript.text
              )
            })
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
}

module.exports = {
  DOMAIN_TERMS: AiPrompts.DOMAIN_TERMS,
  OpenAiClient
};
