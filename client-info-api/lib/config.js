"use strict";

const fs = require("fs");
const path = require("path");

function loadEnv(filename) {
  if (!fs.existsSync(filename)) {
    return;
  }

  const content = fs.readFileSync(filename, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator < 1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnv(path.join(__dirname, "..", ".env"));

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === "") {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseNonNegativeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseTemperature(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback;
}

function parseCsv(value, fallback = []) {
  if (value === undefined || value === "") {
    return fallback;
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseUnixTimestamp(value, fallback = 0) {
  if (value === undefined || value === "") {
    return fallback;
  }

  const raw = String(value).trim();
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) {
    return Math.floor(numeric);
  }

  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const candidate = dateOnly
    ? `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T00:00:00+03:00`
    : raw;
  const parsed = Date.parse(candidate);

  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : fallback;
}

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT || 3000);
const demoMode = String(process.env.DEMO_MODE || "auto").toLowerCase();
const binotelKey = process.env.BINOTEL_KEY || "";
const binotelSecret = process.env.BINOTEL_SECRET || "";
const openAiKey = process.env.OPENAI_API_KEY || "";
const sonioxKey = process.env.SONIOX_API_KEY || "";
const transcriptionProvider = String(
  process.env.TRANSCRIPTION_PROVIDER || "openai"
).trim().toLowerCase();
const transcriptionAudioPreprocessing = parseBoolean(
  process.env.TRANSCRIPTION_AUDIO_PREPROCESSING === undefined
    ? process.env.OPENAI_AUDIO_PREPROCESSING
    : process.env.TRANSCRIPTION_AUDIO_PREPROCESSING,
  true
);
const transcriptionAudioPreprocessingProfile =
  process.env.TRANSCRIPTION_AUDIO_PREPROCESSING_PROFILE ||
  process.env.OPENAI_AUDIO_PREPROCESSING_PROFILE ||
  "light";
const transcriptionMaxAudioBytes = parsePositiveNumber(
  process.env.TRANSCRIPTION_MAX_AUDIO_BYTES ||
    process.env.OPENAI_MAX_AUDIO_BYTES,
  25 * 1024 * 1024
);

module.exports = {
  host,
  port,
  publicBaseUrl:
    process.env.PUBLIC_BASE_URL ||
    `http://${host === "0.0.0.0" ? "127.0.0.1" : host}:${port}`,
  demoMode,
  noteAuthor: process.env.NOTE_AUTHOR || "Оператор",
  localDataFile: path.resolve(
    __dirname,
    "..",
    process.env.LOCAL_DATA_FILE || "data/client-notes.json"
  ),
  callSummariesFile: path.resolve(
    __dirname,
    "..",
    process.env.CALL_SUMMARIES_FILE || "data/call-summaries.json"
  ),
  aiAnalysisSettingsFile: path.resolve(
    __dirname,
    "..",
    process.env.AI_ANALYSIS_SETTINGS_FILE || "data/ai-analysis-settings.json"
  ),
  binotelCallsFile: path.resolve(
    __dirname,
    "..",
    process.env.BINOTEL_CALLS_FILE || "data/binotel-calls.json"
  ),
  binotelRecordingCacheFile: path.resolve(
    __dirname,
    "..",
    process.env.BINOTEL_RECORDING_CACHE_FILE || "data/recording-cache.json"
  ),
  binotelRecordingsDir: path.resolve(
    __dirname,
    "..",
    process.env.BINOTEL_RECORDINGS_DIR || "data/recordings"
  ),
  database: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "ewe_system",
    user: process.env.DB_USER || "ewe_system",
    password: process.env.DB_PASSWORD || "",
    ssl: parseBoolean(process.env.DB_SSL),
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 5000),
    application_name: "duma-client-card-read-only",
    options: "-c default_transaction_read_only=on"
  },
  binotel: {
    enabled: parseBoolean(
      process.env.BINOTEL_ENABLED,
      Boolean(binotelKey && binotelSecret)
    ),
    key: binotelKey,
    secret: binotelSecret,
    baseUrl: process.env.BINOTEL_BASE_URL || "https://api.binotel.com/api/4.0",
    timeoutMillis: parsePositiveNumber(process.env.BINOTEL_TIMEOUT_MS, 5000),
    maxCalls: parseNonNegativeNumber(process.env.BINOTEL_MAX_CALLS, 0),
    requestMinIntervalMillis: parsePositiveNumber(
      process.env.BINOTEL_REQUEST_MIN_INTERVAL_MS,
      3500
    ),
    retryPaddingMillis: parseNonNegativeNumber(
      process.env.BINOTEL_RETRY_PADDING_MS,
      800
    ),
    maxRetries: parseNonNegativeNumber(process.env.BINOTEL_MAX_RETRIES, 2),
    historyCacheTtlMillis: parsePositiveNumber(
      process.env.BINOTEL_HISTORY_CACHE_TTL_MS,
      60000
    )
  },
  binotelMonitor: {
    enabled: parseBoolean(process.env.BINOTEL_MONITOR_ENABLED, true),
    pollIntervalMillis: parsePositiveNumber(
      process.env.BINOTEL_MONITOR_POLL_INTERVAL_MS,
      60000
    ),
    overlapSeconds: parseNonNegativeNumber(
      process.env.BINOTEL_MONITOR_OVERLAP_SECONDS,
      300
    ),
    maxStoredCalls: parsePositiveNumber(
      process.env.BINOTEL_MONITOR_MAX_STORED_CALLS,
      2000
    ),
    syncSinceTimestamp: parseUnixTimestamp(
      process.env.BINOTEL_MONITOR_SYNC_SINCE,
      0
    ),
    aiAnalysisSinceTimestamp: parseUnixTimestamp(
      process.env.BINOTEL_AI_ANALYSIS_SINCE ||
        process.env.BINOTEL_MONITOR_AI_ANALYSIS_SINCE,
      0
    ),
    aiBatchSize: parseNonNegativeNumber(
      process.env.BINOTEL_MONITOR_AI_BATCH_SIZE,
      2
    ),
    processingScanLimit: parsePositiveNumber(
      process.env.BINOTEL_MONITOR_PROCESSING_SCAN_LIMIT,
      2000
    ),
    recordingDownloadBatchSize: parseNonNegativeNumber(
      process.env.BINOTEL_MONITOR_RECORDING_DOWNLOAD_BATCH_SIZE,
      2
    ),
    recordingRetryMillis: parsePositiveNumber(
      process.env.BINOTEL_MONITOR_RECORDING_RETRY_MS,
      2 * 60 * 1000
    ),
    recordingMaxAttempts: parsePositiveNumber(
      process.env.BINOTEL_MONITOR_RECORDING_MAX_ATTEMPTS,
      20
    ),
    recordingCacheTtlMillis: parsePositiveNumber(
      process.env.BINOTEL_RECORDING_CACHE_TTL_MS,
      24 * 60 * 60 * 1000
    )
  },
  transcription: {
    provider: transcriptionProvider,
    audioPreprocessing: transcriptionAudioPreprocessing,
    audioPreprocessingProfile: transcriptionAudioPreprocessingProfile,
    ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
    ffmpegTimeoutMillis: parsePositiveNumber(
      process.env.FFMPEG_TIMEOUT_MS,
      120000
    ),
    maxAudioBytes: transcriptionMaxAudioBytes,
    callMaxAttempts: parsePositiveNumber(
      process.env.TRANSCRIPTION_CALL_MAX_ATTEMPTS ||
        process.env.OPENAI_CALL_MAX_ATTEMPTS,
      5
    ),
    processingStaleMillis: parsePositiveNumber(
      process.env.TRANSCRIPTION_PROCESSING_STALE_MS ||
        process.env.OPENAI_PROCESSING_STALE_MS,
      10 * 60 * 1000
    )
  },
  soniox: {
    enabled: parseBoolean(process.env.SONIOX_ENABLED, Boolean(sonioxKey)),
    apiKey: sonioxKey,
    baseUrl: process.env.SONIOX_BASE_URL || "https://api.soniox.com/v1",
    model: process.env.SONIOX_MODEL || "stt-async-v5",
    languageHints: parseCsv(process.env.SONIOX_LANGUAGE_HINTS, [
      "uk",
      "ru",
      "en"
    ]).slice(0, 5),
    languageHintsStrict: parseBoolean(
      process.env.SONIOX_LANGUAGE_HINTS_STRICT,
      false
    ),
    enableSpeakerDiarization: parseBoolean(
      process.env.SONIOX_ENABLE_SPEAKER_DIARIZATION,
      true
    ),
    enableLanguageIdentification: parseBoolean(
      process.env.SONIOX_ENABLE_LANGUAGE_IDENTIFICATION,
      true
    ),
    pollIntervalMillis: parsePositiveNumber(
      process.env.SONIOX_POLL_INTERVAL_MS,
      2000
    ),
    transcriptionTimeoutMillis: parsePositiveNumber(
      process.env.SONIOX_TRANSCRIPTION_TIMEOUT_MS,
      300000
    ),
    requestTimeoutMillis: parsePositiveNumber(
      process.env.SONIOX_REQUEST_TIMEOUT_MS,
      60000
    ),
    maxRetries: parseNonNegativeNumber(process.env.SONIOX_MAX_RETRIES, 3),
    retryInitialMillis: parsePositiveNumber(
      process.env.SONIOX_RETRY_INITIAL_MS,
      1000
    ),
    retryMaxMillis: parsePositiveNumber(
      process.env.SONIOX_RETRY_MAX_MS,
      15000
    ),
    maxAudioBytes: transcriptionMaxAudioBytes
  },
  openai: {
    enabled: parseBoolean(process.env.OPENAI_ENABLED, Boolean(openAiKey)),
    apiKey: openAiKey,
    baseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    transcriptionModel:
      process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-transcribe-diarize",
    transcriptionLanguage:
      process.env.OPENAI_TRANSCRIPTION_LANGUAGE === undefined
        ? "uk"
        : process.env.OPENAI_TRANSCRIPTION_LANGUAGE,
    transcriptionTemperature: parseTemperature(
      process.env.OPENAI_TRANSCRIPTION_TEMPERATURE,
      0
    ),
    transcriptionSecondPass: parseBoolean(
      process.env.OPENAI_TRANSCRIPTION_SECOND_PASS,
      false
    ),
    transcriptionOriginalPass: parseBoolean(
      process.env.OPENAI_TRANSCRIPTION_ORIGINAL_PASS,
      false
    ),
    transcriptionFallbackPass: parseBoolean(
      process.env.OPENAI_TRANSCRIPTION_FALLBACK_PASS,
      true
    ),
    transcriptionFallbackOriginalPass: parseBoolean(
      process.env.OPENAI_TRANSCRIPTION_FALLBACK_ORIGINAL_PASS,
      true
    ),
    transcriptionFallbackMinWords: parsePositiveNumber(
      process.env.OPENAI_TRANSCRIPTION_FALLBACK_MIN_WORDS,
      20
    ),
    transcriptionFallbackMinChars: parsePositiveNumber(
      process.env.OPENAI_TRANSCRIPTION_FALLBACK_MIN_CHARS,
      80
    ),
    transcriptionFallbackMinSegments: parsePositiveNumber(
      process.env.OPENAI_TRANSCRIPTION_FALLBACK_MIN_SEGMENTS,
      2
    ),
    transcriptionFallbackMinDurationSec: parsePositiveNumber(
      process.env.OPENAI_TRANSCRIPTION_FALLBACK_MIN_DURATION_SEC,
      25
    ),
    transcriptionSecondModel:
      process.env.OPENAI_TRANSCRIPTION_SECOND_MODEL || "gpt-4o-transcribe",
    summaryModel: process.env.OPENAI_SUMMARY_MODEL || "gpt-5.4-nano",
    summaryVersion:
      process.env.OPENAI_SUMMARY_VERSION || "20260608-call-script-rubric-1",
    audioPreprocessing: transcriptionAudioPreprocessing,
    audioPreprocessingProfile: transcriptionAudioPreprocessingProfile,
    ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
    ffmpegTimeoutMillis: parsePositiveNumber(process.env.FFMPEG_TIMEOUT_MS, 120000),
    timeoutMillis: parsePositiveNumber(process.env.OPENAI_TIMEOUT_MS, 300000),
    maxRetries: parseNonNegativeNumber(process.env.OPENAI_MAX_RETRIES, 3),
    retryInitialMillis: parsePositiveNumber(
      process.env.OPENAI_RETRY_INITIAL_MS,
      1000
    ),
    retryMaxMillis: parsePositiveNumber(
      process.env.OPENAI_RETRY_MAX_MS,
      15000
    ),
    callMaxAttempts: parsePositiveNumber(
      process.env.TRANSCRIPTION_CALL_MAX_ATTEMPTS ||
        process.env.OPENAI_CALL_MAX_ATTEMPTS,
      5
    ),
    maxAudioBytes: transcriptionMaxAudioBytes,
    processingStaleMillis: parsePositiveNumber(
      process.env.TRANSCRIPTION_PROCESSING_STALE_MS ||
        process.env.OPENAI_PROCESSING_STALE_MS,
      10 * 60 * 1000
    )
  }
};
