"use strict";

const { DOMAIN_TERMS, TRANSCRIPTION_DOMAIN_PROMPT } = require("./ai-prompts");

const DEFAULT_SONIOX_ASYNC_MODEL = "stt-async-v5";

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

function normalizeSpeaker(value) {
  const speaker = text(value);
  if (!speaker) {
    return "";
  }

  return /^\d+$/.test(speaker) ? `speaker_${speaker}` : speaker;
}

function seconds(value, unit = "ms") {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return unit === "ms" ? parsed / 1000 : parsed;
}

function tokenTimeSeconds(token, keys) {
  for (const key of keys) {
    if (!token || token[key] === null || token[key] === undefined) {
      continue;
    }

    const normalized = seconds(token[key], /(?:^|_)ms$|Ms$/i.test(key) ? "ms" : "s");
    if (normalized !== null) {
      return normalized;
    }
  }

  return null;
}

function sonioxErrorMessage(data, fallback) {
  const error =
    data && typeof data.error === "object" && data.error !== null
      ? data.error
      : {};
  const errorType = text(data && (data.error_type || data.code || error.type));
  const message = text(
    data &&
      (data.error_message ||
        data.message ||
        data.error_description ||
        error.message ||
        data.error)
  );
  const requestId = text(data && (data.request_id || data.requestId));
  const base = [errorType, message].filter(Boolean).join(": ") || fallback;

  return requestId ? `${base} (request_id: ${requestId})` : base;
}

function formatTimestamp(value) {
  if (!Number.isFinite(Number(value))) {
    return "";
  }

  const total = Math.max(0, Math.round(Number(value)));
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
      const prefix = [formatTimestamp(segment.start), segment.speaker]
        .filter(Boolean)
        .join(" ");
      return `${prefix}: ${segment.text}`;
    })
    .join("\n");
}

function tokenText(token) {
  return token && token.text !== null && token.text !== undefined
    ? String(token.text)
    : "";
}

function transcriptSegments(tokens) {
  const segments = [];
  let current = null;

  for (const token of Array.isArray(tokens) ? tokens : []) {
    const value = tokenText(token);
    if (!value || token.is_final === false) {
      continue;
    }

    const speaker =
      normalizeSpeaker(token.speaker) ||
      (current && current.speaker) ||
      "speaker_1";
    const start = tokenTimeSeconds(token, [
      "start_ms",
      "start_time_ms",
      "startMs",
      "startTimeMs",
      "start_time",
      "start"
    ]);
    const end = tokenTimeSeconds(token, [
      "end_ms",
      "end_time_ms",
      "endMs",
      "endTimeMs",
      "end_time",
      "end"
    ]);
    const gap =
      current &&
      Number.isFinite(start) &&
      Number.isFinite(current.end)
        ? start - current.end
        : 0;

    if (!current || current.speaker !== speaker || gap > 1.5) {
      current = {
        speaker,
        start,
        end,
        text: value
      };
      segments.push(current);
    } else {
      current.text += value;
      if (Number.isFinite(end)) {
        current.end = end;
      }
    }
  }

  return segments
    .map((segment) => ({
      ...segment,
      text: text(segment.text)
    }))
    .filter((segment) => segment.text);
}

function dominantLanguages(tokens, fallback) {
  const weights = new Map();

  for (const token of Array.isArray(tokens) ? tokens : []) {
    const language = text(token.language);
    if (!language) {
      continue;
    }

    const weight = Math.max(1, tokenText(token).trim().length);
    weights.set(language, (weights.get(language) || 0) + weight);
  }

  const languages = [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([language]) => language);

  return languages.length ? languages.slice(0, 3).join(", ") : fallback;
}

function transcriptQuality(tokens, segments, rawText) {
  const confidences = (Array.isArray(tokens) ? tokens : [])
    .map((token) => Number(token.confidence))
    .filter(Number.isFinite);
  const averageConfidence = confidences.length
    ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
    : null;
  const words = text(rawText).match(/[\p{L}\p{N}]+/gu) || [];

  return {
    provider: "soniox",
    initial: {
      chars: text(rawText).length,
      words: words.length,
      segments: segments.length,
      tokens: Array.isArray(tokens) ? tokens.length : 0,
      averageConfidence
    },
    initialIssue: text(rawText) ? "" : "empty_transcript"
  };
}

class SonioxApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "SonioxApiError";
    this.status = Number(options.status || 0);
    this.errorType = text(options.errorType);
    this.requestId = text(options.requestId);
    this.retryAfterMillis = Number(options.retryAfterMillis || 0);
    this.retryable = Boolean(options.retryable);
  }
}

class SonioxClient {
  constructor(config) {
    this.config = config.soniox || {};
    this.provider = "soniox";
  }

  get enabled() {
    return Boolean(this.config.enabled && this.config.apiKey);
  }

  async request(path, options = {}) {
    const maxRetries = Math.max(0, Number(this.config.maxRetries || 0));
    const initialDelay = Math.max(
      100,
      Number(this.config.retryInitialMillis || 1000)
    );
    const maxDelay = Math.max(
      initialDelay,
      Number(this.config.retryMaxMillis || 15000)
    );
    let attempt = 0;

    while (true) {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        this.config.requestTimeoutMillis || 60000
      );

      try {
        const response = await fetch(endpoint(this.config.baseUrl, path), {
          ...options,
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            ...(options.headers || {})
          },
          signal: controller.signal
        });
        const body = await response.text();
        let data = {};

        if (body) {
          try {
            data = JSON.parse(body);
          } catch {
            throw new SonioxApiError("Soniox повернув не JSON відповідь", {
              status: response.status,
              retryAfterMillis: retryAfterMillis(response),
              retryable: isRetryableStatus(response.status)
            });
          }
        }

        if (!response.ok) {
          throw new SonioxApiError(
            sonioxErrorMessage(data, `Soniox HTTP ${response.status}`),
            {
              status: response.status,
              errorType: data.error_type,
              requestId: data.request_id || data.requestId,
              retryAfterMillis: retryAfterMillis(response),
              retryable: isRetryableStatus(response.status)
            }
          );
        }

        return data;
      } catch (error) {
        let failure = error;
        if (error.name === "AbortError") {
          failure = new SonioxApiError("Soniox не відповів вчасно", {
            status: 408,
            retryable: true
          });
        } else if (!(error instanceof SonioxApiError) && error instanceof TypeError) {
          failure = new SonioxApiError(
            `Помилка з'єднання з Soniox: ${error.message}`,
            { retryable: true }
          );
        }

        if (!failure.retryable || attempt >= maxRetries) {
          throw failure;
        }

        const exponentialDelay = Math.min(maxDelay, initialDelay * (2 ** attempt));
        const delay =
          Math.max(failure.retryAfterMillis || 0, exponentialDelay) +
          Math.floor(Math.random() * Math.min(500, exponentialDelay / 2));
        attempt += 1;
        console.warn(
          `Soniox ${path} retry ${attempt}/${maxRetries} after ${delay} ms: ${failure.message}`
        );
        await sleep(delay);
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  async cleanup(path) {
    try {
      await this.request(path, { method: "DELETE" });
    } catch (error) {
      console.warn(`Soniox cleanup failed for ${path}: ${error.message}`);
    }
  }

  async waitForCompletion(transcriptionId) {
    const deadline =
      Date.now() + (this.config.transcriptionTimeoutMillis || 300000);

    while (Date.now() < deadline) {
      const status = await this.request(`transcriptions/${transcriptionId}`, {
        method: "GET"
      });

      if (status.status === "completed") {
        return status;
      }

      if (status.status === "error") {
        throw new SonioxApiError(
          sonioxErrorMessage(status, "Soniox не зміг розпізнати запис"),
          {
            errorType: status.error_type,
            requestId: status.request_id || status.requestId
          }
        );
      }

      await sleep(this.config.pollIntervalMillis || 2000);
    }

    throw new SonioxApiError("Soniox transcription timed out", {
      status: 408,
      retryable: true
    });
  }

  async transcribeAudio(audio, options = {}) {
    if (!this.enabled) {
      throw new Error("SONIOX_API_KEY не налаштований");
    }

    if (audio.bytes.length > (this.config.maxAudioBytes || 25 * 1024 * 1024)) {
      throw new Error("Запис розмови завеликий для Soniox transcription API");
    }

    let fileId = "";
    let transcriptionId = "";

    try {
      const uploadForm = new FormData();
      uploadForm.append(
        "file",
        new Blob([audio.bytes], { type: audio.contentType }),
        audio.filename
      );
      const uploaded = await this.request("files", {
        method: "POST",
        body: uploadForm
      });
      fileId = text(uploaded.id);

      if (!fileId) {
        throw new SonioxApiError("Soniox не повернув ID завантаженого файлу");
      }

      const body = {
        model: this.config.model || DEFAULT_SONIOX_ASYNC_MODEL,
        file_id: fileId,
        language_hints: this.config.languageHints || ["uk", "ru", "en"],
        language_hints_strict: Boolean(this.config.languageHintsStrict),
        enable_speaker_diarization:
          this.config.enableSpeakerDiarization !== false,
        enable_language_identification:
          this.config.enableLanguageIdentification !== false,
        context: {
          general: [
            {
              key: "organization",
              value: "DUMA / East West Eurolines"
            },
            {
              key: "setting",
              value: "Phone conversation between a bus company operator and a customer"
            },
            {
              key: "topic",
              value: "Bus routes, schedules, tickets, booking, changes, returns, baggage and boarding"
            },
            {
              key: "languages",
              value: "Mostly Ukrainian, sometimes Russian or English"
            },
            {
              key: "speakers",
              value: "Usually 2 primary speakers: company operator and customer. Background voices or third parties may appear."
            }
          ],
          text: TRANSCRIPTION_DOMAIN_PROMPT,
          terms: DOMAIN_TERMS
        }
      };

      if (options.callId) {
        body.client_reference_id = String(options.callId).slice(0, 256);
      }

      const created = await this.request("transcriptions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      transcriptionId = text(created.id);

      if (!transcriptionId) {
        throw new SonioxApiError("Soniox не повернув ID транскрипції");
      }

      await this.waitForCompletion(transcriptionId);
      const transcript = await this.request(
        `transcriptions/${transcriptionId}/transcript`,
        { method: "GET" }
      );
      const tokens = Array.isArray(transcript.tokens) ? transcript.tokens : [];
      const segments = transcriptSegments(tokens);
      const rawText = text(transcript.text) || text(tokens.map(tokenText).join(""));

      return {
        provider: "soniox",
        text: buildTranscriptText(segments, rawText),
        segments,
        rawText,
        promptedText: "",
        originalPromptedText: "",
        model: `soniox:${this.config.model || DEFAULT_SONIOX_ASYNC_MODEL}`,
        promptedModel: "",
        language: dominantLanguages(
          tokens,
          (this.config.languageHints || []).join(", ") || "auto"
        ),
        temperature: null,
        quality: transcriptQuality(tokens, segments, rawText)
      };
    } finally {
      if (transcriptionId) {
        await this.cleanup(`transcriptions/${transcriptionId}`);
      }
      if (fileId) {
        await this.cleanup(`files/${fileId}`);
      }
    }
  }
}

module.exports = {
  SonioxClient
};
