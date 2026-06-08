"use strict";

const { randomUUID } = require("crypto");
const AiPrompts = require("./ai-prompts");

function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
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

function transcriptSegments(transcription) {
  const segments = Array.isArray(transcription.segments)
    ? transcription.segments
    : [];

  return segments
    .map((segment, index) => ({
      speaker: text(segment.speaker) || `speaker_${index + 1}`,
      start: Number.isFinite(Number(segment.start)) ? Number(segment.start) : null,
      end: Number.isFinite(Number(segment.end)) ? Number(segment.end) : null,
      text: text(segment.text)
    }))
    .filter((segment) => segment.text);
}

function formatTimestamp(seconds) {
  if (!Number.isFinite(Number(seconds))) {
    return "";
  }

  const total = Math.max(0, Math.round(Number(seconds)));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function buildTranscriptText(segments, fallbackText) {
  if (!segments.length) {
    return text(fallbackText);
  }

  return segments
    .map((segment) => {
      const time = formatTimestamp(segment.start);
      const prefix = [time, segment.speaker].filter(Boolean).join(" ");
      return `${prefix}: ${segment.text}`;
    })
    .join("\n");
}

function textStats(value, segments = []) {
  const combined = text(
    [
      value,
      ...segments.map((segment) => segment.text)
    ].filter(Boolean).join(" ")
  );
  const words = combined.match(/[\p{L}\p{N}]+/gu) || [];

  return {
    chars: combined.length,
    words: words.length,
    segments: segments.filter((segment) => text(segment.text)).length,
    hasPlaceholder:
      /\b(no speech|inaudible|unintelligible|silence|music|noise)\b/i.test(combined) ||
      /нерозбір|неразбор|тишин|музик|шум/i.test(combined)
  };
}

function qualityIssue(stats, config, durationSec = 0, options = {}) {
  const requireSegments = options.requireSegments !== false;

  if (!stats.chars || !stats.words) {
    return "empty_transcript";
  }

  if (requireSegments && !stats.segments) {
    return "empty_segments";
  }

  if (stats.hasPlaceholder && stats.words < (config.transcriptionFallbackMinWords || 20) * 2) {
    return "placeholder_transcript";
  }

  if (
    Number.isFinite(Number(durationSec)) &&
    Number(durationSec) > 0 &&
    Number(durationSec) < (config.transcriptionFallbackMinDurationSec || 25)
  ) {
    return "";
  }

  if (stats.words < (config.transcriptionFallbackMinWords || 20)) {
    return "few_words";
  }

  if (stats.chars < (config.transcriptionFallbackMinChars || 80)) {
    return "few_chars";
  }

  if (
    requireSegments &&
    stats.segments < (config.transcriptionFallbackMinSegments || 2)
  ) {
    return "few_segments";
  }

  return "";
}

class OpenAiClient {
  constructor(config) {
    this.config = config.openai || {};
    this.provider = "openai";
  }

  get enabled() {
    return Boolean(this.config.enabled && this.config.apiKey);
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

  async promptedTranscription(audio) {
    const form = new FormData();
    form.append("file", new Blob([audio.bytes], { type: audio.contentType }), audio.filename);
    form.append("model", this.config.transcriptionSecondModel || "gpt-4o-transcribe");
    form.append("response_format", "json");
    form.append("temperature", String(this.config.transcriptionTemperature ?? 0));
    form.append("prompt", AiPrompts.TRANSCRIPTION_DOMAIN_PROMPT);
    if (this.config.transcriptionLanguage) {
      form.append("language", this.config.transcriptionLanguage);
    }

    const transcription = await this.request("audio/transcriptions", {
      method: "POST",
      body: form
    });

    return text(transcription.text);
  }

  async transcribeAudio(audio, options = {}) {
    if (!this.enabled) {
      throw new Error("OPENAI_API_KEY не налаштований");
    }

    if (audio.bytes.length > (this.config.maxAudioBytes || 25 * 1024 * 1024)) {
      throw new Error("Запис розмови завеликий для OpenAI transcription API");
    }

    const form = new FormData();
    form.append("file", new Blob([audio.bytes], { type: audio.contentType }), audio.filename);
    form.append("model", this.config.transcriptionModel || "gpt-4o-transcribe-diarize");
    form.append("response_format", "diarized_json");
    form.append("chunking_strategy", "auto");
    form.append("temperature", String(this.config.transcriptionTemperature ?? 0));
    if (this.config.transcriptionLanguage) {
      form.append("language", this.config.transcriptionLanguage);
    }

    const transcription = await this.request("audio/transcriptions", {
      method: "POST",
      body: form
    });
    const segments = transcriptSegments(transcription);
    const initialStats = textStats(transcription.text, segments);
    const initialQualityIssue = qualityIssue(
      initialStats,
      this.config,
      options.callDurationSec
    );
    const useFallbackPass = Boolean(
      this.config.transcriptionFallbackPass && initialQualityIssue
    );
    let promptedText = "";
    let originalPromptedText = "";
    let promptedModel = "";
    let promptedQualityIssue = "";
    let originalPassReason = "";

    if (this.config.transcriptionSecondPass || useFallbackPass) {
      promptedModel = this.config.transcriptionSecondModel || "gpt-4o-transcribe";
      promptedText = await this.promptedTranscription(audio);
      promptedQualityIssue = qualityIssue(
        textStats(promptedText),
        this.config,
        options.callDurationSec,
        { requireSegments: false }
      );
    }

    const useOriginalFallback = Boolean(
      useFallbackPass &&
        this.config.transcriptionFallbackOriginalPass &&
        (!promptedText || promptedQualityIssue)
    );

    if (
      options.originalAudio &&
      (this.config.transcriptionOriginalPass || useOriginalFallback)
    ) {
      promptedModel = this.config.transcriptionSecondModel || "gpt-4o-transcribe";
      originalPromptedText = await this.promptedTranscription(options.originalAudio);
      originalPassReason = this.config.transcriptionOriginalPass
        ? "forced"
        : promptedQualityIssue || initialQualityIssue;
    }

    return {
      provider: "openai",
      text: buildTranscriptText(segments, transcription.text),
      segments,
      rawText: text(transcription.text),
      promptedText,
      originalPromptedText,
      model: this.config.transcriptionModel || "gpt-4o-transcribe-diarize",
      promptedModel,
      language: this.config.transcriptionLanguage || "auto",
      temperature: this.config.transcriptionTemperature ?? 0,
      quality: {
        initial: initialStats,
        initialIssue: initialQualityIssue,
        fallbackPassUsed: useFallbackPass,
        promptedIssue: promptedQualityIssue,
        originalPassUsed: Boolean(originalPromptedText),
        originalPassReason
      }
    };
  }

  async summarizeTranscript({ call, transcript, clientContext }) {
    if (!this.enabled) {
      throw new Error("OPENAI_API_KEY не налаштований");
    }

    const data = await this.request("responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: this.config.summaryModel || "gpt-5.5",
        reasoning: {
          effort: "low"
        },
        input: [
          {
            role: "system",
            content: AiPrompts.CALL_SUMMARY_SYSTEM_PROMPT
          },
          {
            role: "user",
            content: JSON.stringify({
              call: {
                startedAt: call.startedAt,
                type: call.typeLabel,
                disposition: call.dispositionLabel,
                operator: call.employee && call.employee.name,
                externalNumber: call.externalNumber
              },
              domainTerms: AiPrompts.DOMAIN_TERMS,
              clientContext: clientContext || null,
              diarizedTranscript: transcript.text,
              promptedTranscript: transcript.promptedText || "",
              originalPromptedTranscript: transcript.originalPromptedText || "",
              segments: transcript.segments
            })
          }
        ],
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: "call_summary",
            strict: true,
            schema: AiPrompts.SUMMARY_SCHEMA
          }
        }
      })
    });

    const body = extractResponseText(data);
    if (!body) {
      throw new Error("OpenAI не повернув текст підсумку");
    }

    return {
      ...JSON.parse(body),
      model: this.config.summaryModel || "gpt-5.5",
      version: this.config.summaryVersion,
      usage: normalizeUsage(data)
    };
  }
}

module.exports = {
  DOMAIN_TERMS: AiPrompts.DOMAIN_TERMS,
  OpenAiClient,
  TRANSCRIPTION_DOMAIN_PROMPT: AiPrompts.TRANSCRIPTION_DOMAIN_PROMPT
};
