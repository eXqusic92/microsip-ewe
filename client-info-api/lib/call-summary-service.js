"use strict";

const { spawn } = require("child_process");

const { phoneDigits } = require("./phone");

const RECORDABLE_DISPOSITIONS = new Set(["ANSWER", "VM-SUCCESS", "SUCCESS"]);

function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function nowIso() {
  return new Date().toISOString();
}

function isFreshProcessing(entry, staleMillis) {
  if (!entry || entry.status !== "processing" || !entry.startedAt) {
    return false;
  }

  return Date.now() - new Date(entry.startedAt).getTime() < staleMillis;
}

function configuredTranscriptionProvider(config) {
  return text(config.transcription && config.transcription.provider) || "openai";
}

function storedTranscriptionProvider(entry) {
  const provider = text(entry && entry.transcription && entry.transcription.provider);
  if (provider) {
    return provider;
  }

  const model = text(entry && entry.models && entry.models.transcription);
  return model.startsWith("soniox:") ? "soniox" : "openai";
}

function isCurrentVersion(entry, config) {
  if (!entry || entry.version !== config.openai.summaryVersion) {
    return false;
  }

  return (
    storedTranscriptionProvider(entry) === configuredTranscriptionProvider(config)
  );
}

function canHaveRecording(call) {
  if (!call || !call.generalCallId) {
    return false;
  }

  const disposition = text(call.disposition).toUpperCase();
  if (!RECORDABLE_DISPOSITIONS.has(disposition)) {
    return false;
  }

  if (["notRecord", "removed", "failed"].includes(call.recordingStatus)) {
    return false;
  }

  return Number(call.billSec || 0) > 0;
}

function latestRecordableCall(calls) {
  return [...(calls || [])]
    .filter(canHaveRecording)
    .sort((a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0))[0] || null;
}

function publicEntry(entry, call) {
  if (!entry) {
    return null;
  }

  return {
    status: entry.status,
    callId: entry.callId,
    generalCallId: entry.generalCallId,
    callStartedAt: entry.callStartedAt || (call && call.startedAt) || null,
    updatedAt: entry.updatedAt || null,
    completedAt: entry.completedAt || null,
    summary: entry.summary || null,
    error: entry.error || "",
    message: entry.message || "",
    attempts: entry.attempts || 0,
    terminalFailure: Boolean(entry.terminalFailure),
    models: entry.models || null,
    usage: entry.usage || null,
    callDurationSec: Number(entry.callDurationSec || (call && call.billSec) || 0)
  };
}

function storedTranscript(entry, config) {
  const transcript = entry && entry.transcript;
  if (!transcript || !text(transcript.text)) {
    return null;
  }

  if (
    config &&
    storedTranscriptionProvider(entry) !== configuredTranscriptionProvider(config)
  ) {
    return null;
  }

  return {
    text: transcript.text,
    segments: Array.isArray(transcript.segments) ? transcript.segments : [],
    rawText: transcript.rawText || "",
    promptedText: transcript.promptedText || "",
    originalPromptedText: transcript.originalPromptedText || "",
    model: entry.models && entry.models.transcription,
    promptedModel: entry.models && entry.models.transcriptionSecondPass,
    provider: storedTranscriptionProvider(entry),
    language: entry.transcription && entry.transcription.language,
    temperature: entry.transcription && entry.transcription.temperature,
    quality: entry.transcription && entry.transcription.quality
  };
}

function audioExtension(contentType, url) {
  const lowered = String(contentType || "").toLowerCase();
  if (lowered.includes("mpeg") || lowered.includes("mp3")) {
    return "mp3";
  }
  if (lowered.includes("wav")) {
    return "wav";
  }
  if (lowered.includes("mp4") || lowered.includes("m4a")) {
    return "m4a";
  }
  if (lowered.includes("webm")) {
    return "webm";
  }

  const match = String(url || "").match(/\.([a-z0-9]{2,5})(?:[?#]|$)/i);
  return match ? match[1].toLowerCase() : "mp3";
}

class CallSummaryService {
  constructor(config, binotelClient, transcriptionClient, openAiClient, store) {
    this.config = config;
    this.binotelClient = binotelClient;
    this.transcriptionClient = transcriptionClient;
    this.openAiClient = openAiClient;
    this.store = store;
    this.running = new Set();
    this.recordingCache = null;
    this.clientContextProvider = null;
  }

  get enabled() {
    return Boolean(
      this.transcriptionClient &&
        this.transcriptionClient.enabled &&
        this.openAiClient &&
        this.openAiClient.enabled &&
        this.binotelClient &&
        this.binotelClient.enabled
    );
  }

  get activeCount() {
    return this.running.size;
  }

  get transcriptionProvider() {
    return configuredTranscriptionProvider(this.config);
  }

  setRecordingCache(recordingCache) {
    this.recordingCache = recordingCache;
  }

  setClientContextProvider(provider) {
    this.clientContextProvider = typeof provider === "function" ? provider : null;
  }

  async prepare(phone, calls) {
    if (!this.enabled) {
      return {
        status: "disabled",
        message:
          "AI-підсумок не налаштований. Перевірте ключ вибраного сервісу транскрипції, OPENAI_API_KEY і Binotel API.",
        summary: null
      };
    }

    const call = latestRecordableCall(calls);
    if (!call) {
      return {
        status: "not_available",
        message: "Для останніх дзвінків немає доступного запису розмови.",
        summary: null
      };
    }

    return this.ensureCallSummary(phone, call);
  }

  async ensureCallSummary(phone, call, options = {}) {
    if (!this.enabled) {
      return {
        status: "disabled",
        message:
          "AI-підсумок не налаштований. Перевірте ключ вибраного сервісу транскрипції, OPENAI_API_KEY і Binotel API.",
        summary: null
      };
    }

    if (!canHaveRecording(call)) {
      return {
        status: "not_available",
        message: "Для цього дзвінка немає доступного запису розмови.",
        summary: null
      };
    }

    const callId = String(call.generalCallId);
    const staleMillis =
      (this.config.transcription &&
        this.config.transcription.processingStaleMillis) ||
      10 * 60 * 1000;
    const maxAttempts = Math.max(
      1,
      Number(
        (this.config.transcription &&
          this.config.transcription.callMaxAttempts) ||
          5
      )
    );
    const existing = await this.store.get(callId);

    if (existing && existing.status === "done" && isCurrentVersion(existing, this.config)) {
      return publicEntry(existing, call);
    }

    if (isCurrentVersion(existing, this.config) && isFreshProcessing(existing, staleMillis)) {
      return publicEntry(existing, call);
    }

    if (
      existing &&
      isCurrentVersion(existing, this.config) &&
      (existing.terminalFailure || Number(existing.attempts || 0) >= maxAttempts)
    ) {
      return publicEntry(existing, call);
    }

    if (
      existing &&
      existing.status === "failed" &&
      isCurrentVersion(existing, this.config) &&
      !options.retryFailed
    ) {
      return publicEntry(existing, call);
    }

    const versionChanged = Boolean(existing && !isCurrentVersion(existing, this.config));
    const entry = await this.store.upsert(callId, {
      status: "queued",
      ...(versionChanged ? { attempts: 0, terminalFailure: false } : {}),
      phone: phoneDigits(phone),
      callId,
      generalCallId: callId,
      callStartedAt: call.startedAt || null,
      callDurationSec: Number(call.billSec || 0),
      version: this.config.openai.summaryVersion,
      transcription: {
        ...(existing && existing.transcription ? existing.transcription : {}),
        provider: configuredTranscriptionProvider(this.config)
      },
      message: "AI-підсумок поставлено в чергу.",
      error: ""
    });

    this.start(phone, call);
    return publicEntry(entry, call);
  }

  async reanalyzeCall(phone, call) {
    if (!this.enabled) {
      return {
        status: "disabled",
        message:
          "AI-підсумок не налаштований. Перевірте ключ вибраного сервісу транскрипції, OPENAI_API_KEY і Binotel API.",
        summary: null
      };
    }

    if (!canHaveRecording(call)) {
      return {
        status: "not_available",
        message: "Для цього дзвінка немає доступного запису розмови.",
        summary: null
      };
    }

    const callId = String(call.generalCallId);
    const existing = await this.store.get(callId);

    if (this.running.has(callId)) {
      return publicEntry(existing, call) || {
        status: "processing",
        callId,
        generalCallId: callId,
        message: "AI-аналіз цього дзвінка вже виконується.",
        summary: null
      };
    }

    const entry = await this.store.upsert(callId, {
      status: "queued",
      stage: "queued",
      attempts: 0,
      terminalFailure: false,
      phone: phoneDigits(phone),
      callId,
      generalCallId: callId,
      callStartedAt: call.startedAt || null,
      callDurationSec: Number(call.billSec || 0),
      version: this.config.openai.summaryVersion,
      summary: null,
      completedAt: null,
      models: {
        ...(existing && existing.models ? existing.models : {}),
        summary: null
      },
      transcription: {
        ...(existing && existing.transcription ? existing.transcription : {}),
        provider: configuredTranscriptionProvider(this.config)
      },
      message: "Повторний AI-аналіз поставлено в чергу.",
      error: ""
    });

    this.start(phone, call);
    return publicEntry(entry, call);
  }

  async status(callId) {
    const id = text(callId);
    if (!id) {
      return {
        status: "failed",
        error: "callId is required",
        summary: null
      };
    }

    const entry = await this.store.get(id);
    if (!entry) {
      return {
        status: "not_available",
        callId: id,
        generalCallId: id,
        message: "AI-підсумок для цього дзвінка ще не створювався.",
        summary: null
      };
    }

    return publicEntry(entry, null);
  }

  async details(callId) {
    const id = text(callId);
    if (!id) {
      return {
        status: "failed",
        error: "callId is required",
        summary: null,
        transcript: null
      };
    }

    const entry = await this.store.get(id);
    if (!entry) {
      return {
        status: "not_available",
        callId: id,
        generalCallId: id,
        message: "AI-аналіз для цього дзвінка ще не створювався.",
        summary: null,
        transcript: null
      };
    }

    return {
      ...publicEntry(entry, null),
      stage: entry.stage || "",
      version: entry.version || "",
      transcript: entry.transcript || null,
      transcription: entry.transcription || null,
      recording: entry.recording || null
    };
  }

  start(phone, call) {
    const callId = String(call.generalCallId);
    if (this.running.has(callId)) {
      return;
    }

    this.running.add(callId);
    this.process(phone, call)
      .catch((error) => {
        console.error(`AI call summary failed for ${callId}: ${error.message}`);
      })
      .finally(() => {
        this.running.delete(callId);
      });
  }

  async process(phone, call) {
    const callId = String(call.generalCallId);
    const existing = await this.store.get(callId);
    const attempts = (existing && existing.attempts ? existing.attempts : 0) + 1;
    const maxAttempts = Math.max(
      1,
      Number(
        (this.config.transcription &&
          this.config.transcription.callMaxAttempts) ||
          5
      )
    );

    await this.store.upsert(callId, {
      status: "processing",
      attempts,
      phone: phoneDigits(phone),
      callId,
      generalCallId: callId,
      callStartedAt: call.startedAt || null,
      callDurationSec: Number(call.billSec || 0),
      version: this.config.openai.summaryVersion,
      transcription: {
        ...(existing && existing.transcription ? existing.transcription : {}),
        provider: configuredTranscriptionProvider(this.config)
      },
      startedAt: nowIso(),
      message: "Завантажуємо запис і готуємо AI-підсумок.",
      error: ""
    });

    try {
      let transcript = storedTranscript(existing, this.config);
      let audio = null;
      let preparedAudio = null;
      let clientContext = null;

      if (!transcript) {
        audio = this.recordingCache
          ? await this.recordingCache.getAudio(callId)
          : await this.fetchRecording(callId);
        preparedAudio = await this.prepareAudio(audio, callId);
        transcript = await this.transcriptionClient.transcribeAudio(
          preparedAudio.audio,
          {
            originalAudio: audio,
            callDurationSec: Number(call.billSec || 0),
            callId
          }
        );

        await this.store.upsert(callId, {
          status: "processing",
          stage: "summarizing",
          message: "Транскрипція готова. Формуємо AI-підсумок.",
          transcript: {
            text: transcript.text,
            rawText: transcript.rawText,
            promptedText: transcript.promptedText,
            originalPromptedText: transcript.originalPromptedText,
            segments: transcript.segments
          },
          models: {
            transcription: transcript.model,
            transcriptionSecondPass: transcript.promptedModel || null,
            transcriptionOriginalPass: transcript.originalPromptedText
              ? transcript.promptedModel
              : null
          },
          transcription: {
            provider:
              transcript.provider || configuredTranscriptionProvider(this.config),
            language: transcript.language,
            temperature: transcript.temperature,
            quality: transcript.quality || null
          },
          recording: {
            durationSec: Number(call.billSec || 0),
            contentType: preparedAudio.audio.contentType,
            bytes: preparedAudio.audio.bytes.length,
            originalContentType: audio.contentType,
            originalBytes: audio.bytes.length,
            preprocessing: preparedAudio.preprocessing
          },
          error: ""
        });
      } else {
        await this.store.upsert(callId, {
          status: "processing",
          stage: "summarizing",
          message: "Використовуємо готову транскрипцію та повторюємо AI-підсумок.",
          error: ""
        });
      }

      if (this.clientContextProvider) {
        try {
          clientContext = await this.clientContextProvider(phone);
        } catch (error) {
          console.warn(`Client context unavailable for ${callId}: ${error.message}`);
        }
      }

      const summary = await this.openAiClient.summarizeTranscript({
        call,
        transcript,
        clientContext
      });
      const summaryUsage = summary.usage || null;
      delete summary.usage;

      await this.store.upsert(callId, {
        status: "done",
        stage: "done",
        message: "",
        completedAt: nowIso(),
        summary,
        usage: {
          ...(existing && existing.usage ? existing.usage : {}),
          summary: summaryUsage
        },
        clientContext: clientContext || null,
        models: {
          transcription: transcript.model,
          transcriptionSecondPass: transcript.promptedModel || null,
          transcriptionOriginalPass: transcript.originalPromptedText
            ? transcript.promptedModel
            : null,
          summary: summary.model
        },
        error: ""
      });
    } catch (error) {
      const terminalFailure = attempts >= maxAttempts;
      await this.store.upsert(callId, {
        status: "failed",
        stage: "failed",
        terminalFailure,
        message: terminalFailure
          ? `Автоматичну AI-обробку зупинено після ${maxAttempts} невдалих спроб.`
          : "Не вдалося підготувати AI-підсумок. Спробуємо пізніше.",
        error: error.message
      });
      throw error;
    }
  }

  async fetchRecording(callId) {
    const record = await this.binotelClient.callRecord(callId);
    return this.downloadRecording(record.url, callId);
  }

  async downloadRecording(url, callId) {
    const response = await fetch(url, {
      headers: {
        Accept: "audio/*,*/*"
      }
    });

    if (!response.ok) {
      throw new Error(`Binotel recording HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "audio/mpeg";
    const arrayBuffer = await response.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);

    const maxAudioBytes =
      (this.config.transcription && this.config.transcription.maxAudioBytes) ||
      25 * 1024 * 1024;
    if (bytes.length > maxAudioBytes) {
      throw new Error("Запис розмови завеликий для сервісу транскрипції");
    }

    return {
      bytes,
      contentType,
      filename: `binotel-call-${callId}.${audioExtension(contentType, url)}`
    };
  }

  async prepareAudio(audio, callId) {
    if (!this.config.transcription.audioPreprocessing) {
      return {
        audio,
        preprocessing: {
          enabled: false,
          used: false
        }
      };
    }

    try {
      const processedAudio = await this.preprocessAudioWithFfmpeg(audio, callId);
      return {
        audio: processedAudio,
        preprocessing: {
          enabled: true,
          used: true,
          tool: "ffmpeg",
          profile: this.config.transcription.audioPreprocessingProfile || "light"
        }
      };
    } catch (error) {
      console.warn(`FFmpeg preprocessing failed for ${callId}: ${error.message}`);
      return {
        audio,
        preprocessing: {
          enabled: true,
          used: false,
          error: error.message
        }
      };
    }
  }

  preprocessAudioWithFfmpeg(audio, callId) {
    return new Promise((resolve, reject) => {
      const filtersByProfile = {
        light: "highpass=f=80,lowpass=f=7600,loudnorm=I=-18:LRA=9:TP=-2",
        phone: "highpass=f=120,lowpass=f=3800,afftdn=nf=-25,loudnorm=I=-18:LRA=7:TP=-2",
        denoise: "highpass=f=100,lowpass=f=5000,afftdn=nf=-30,loudnorm=I=-18:LRA=7:TP=-2"
      };
      const profile =
        this.config.transcription.audioPreprocessingProfile || "light";
      const filters = filtersByProfile[profile] || filtersByProfile.light;
      const ffmpeg = spawn(this.config.transcription.ffmpegPath || "ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "warning",
        "-y",
        "-i",
        "pipe:0",
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-af",
        filters,
        "-c:a",
        "pcm_s16le",
        "-f",
        "wav",
        "pipe:1"
      ]);
      const stdout = [];
      const stderr = [];
      const timeout = setTimeout(() => {
        ffmpeg.kill("SIGKILL");
        reject(new Error("FFmpeg preprocessing timed out"));
      }, this.config.transcription.ffmpegTimeoutMillis || 120000);

      ffmpeg.stdout.on("data", (chunk) => stdout.push(chunk));
      ffmpeg.stderr.on("data", (chunk) => stderr.push(chunk));
      ffmpeg.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });
      ffmpeg.on("close", (code) => {
        clearTimeout(timeout);

        if (code !== 0) {
          const details = Buffer.concat(stderr).toString("utf8").trim();
          reject(new Error(details || `FFmpeg exited with code ${code}`));
          return;
        }

        const bytes = Buffer.concat(stdout);
        if (!bytes.length) {
          reject(new Error("FFmpeg returned empty audio"));
          return;
        }

        resolve({
          bytes,
          contentType: "audio/wav",
          filename: `binotel-call-${callId}-clean.wav`
        });
      });

      ffmpeg.stdin.end(audio.bytes);
    });
  }
}

module.exports = {
  CallSummaryService,
  canHaveRecording
};
