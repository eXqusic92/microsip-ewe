"use strict";

const { canHaveRecording } = require("./call-summary-service");

const OPENAI_TEXT_PRICING_USD_BY_MODEL = {
  "gpt-5.5": {
    inputPerMillion: 5,
    cachedInputPerMillion: 0.5,
    outputPerMillion: 30
  },
  "gpt-5.4": {
    inputPerMillion: 2.5,
    cachedInputPerMillion: 0.25,
    outputPerMillion: 15
  },
  "gpt-5.4-mini": {
    inputPerMillion: 0.75,
    cachedInputPerMillion: 0.075,
    outputPerMillion: 4.5
  },
  "gpt-5.4-nano": {
    inputPerMillion: 0.2,
    cachedInputPerMillion: 0.02,
    outputPerMillion: 1.25
  }
};

const OPENAI_TEXT_PRICING_MODEL_KEYS = Object.keys(OPENAI_TEXT_PRICING_USD_BY_MODEL)
  .sort((a, b) => b.length - a.length);

const OPENAI_TRANSCRIPTION_PRICING_USD_BY_MODEL = {
  "gpt-4o-transcribe": {
    minuteUsd: 0.006
  },
  "gpt-4o-mini-transcribe": {
    minuteUsd: 0.003
  },
  "whisper-1": {
    minuteUsd: 0.006
  }
};

const SONIOX_STT_PRICING_USD = {
  asyncHourUsd: 0.10,
  realtimeHourUsd: 0.12
};

function nowIso() {
  return new Date().toISOString();
}

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

function callTimestamp(call) {
  const value = new Date((call && call.startedAt) || 0).getTime();
  return Number.isFinite(value) && value > 0 ? Math.floor(value / 1000) : 0;
}

function externalPhone(call) {
  return (
    (call && call.externalNumber) ||
    (call && call.phone) ||
    ""
  );
}

function internalNumber(call) {
  return String(call && call.internalNumber || "").trim();
}

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  return Math.round(numeric(value) * 10000) / 10000;
}

function roundCost(value) {
  return Math.round(numeric(value) * 1_000_000) / 1_000_000;
}

function optionalNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function modelName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^(openai|soniox):/, "");
}

function openAiTextPricing(model) {
  const normalized = modelName(model);
  if (!normalized) {
    return null;
  }

  for (const key of OPENAI_TEXT_PRICING_MODEL_KEYS) {
    if (normalized === key || normalized.startsWith(`${key}-`)) {
      return OPENAI_TEXT_PRICING_USD_BY_MODEL[key];
    }
  }

  return null;
}

function transcriptionPricing(model) {
  const raw = String(model || "").trim().toLowerCase();
  const normalized = modelName(raw);
  if (!normalized) {
    return null;
  }

  if (raw.startsWith("soniox:") || normalized.startsWith("stt-")) {
    const audioHourUsd = normalized.includes("-rt-") ||
      normalized.includes("realtime")
      ? SONIOX_STT_PRICING_USD.realtimeHourUsd
      : SONIOX_STT_PRICING_USD.asyncHourUsd;
    return {
      provider: "soniox",
      audioHourUsd
    };
  }

  const openAiPricing = OPENAI_TRANSCRIPTION_PRICING_USD_BY_MODEL[normalized];
  if (openAiPricing || raw.startsWith("openai:")) {
    return openAiPricing
      ? {
          provider: "openai",
          ...openAiPricing
        }
      : null;
  }

  return null;
}

function addCounter(map, key, label) {
  const normalizedKey = String(key || "").trim();
  if (!normalizedKey) {
    return;
  }

  const current = map.get(normalizedKey) || {
    type: normalizedKey,
    label: String(label || normalizedKey).trim(),
    count: 0
  };
  current.count += 1;
  if (!current.label && label) {
    current.label = String(label).trim();
  }
  map.set(normalizedKey, current);
}

function ratingIdentityKey(...parts) {
  return parts
    .map((part) => String(part || "").trim().toLowerCase())
    .filter(Boolean)
    .join("|");
}

function managerIdentity(row) {
  const employee = row && row.employee && typeof row.employee === "object"
    ? row.employee
    : {};
  const pbxNumber = row && row.pbxNumber && typeof row.pbxNumber === "object"
    ? row.pbxNumber
    : {};
  const name = String(
    employee.name ||
      employee.fullName ||
      employee.title ||
      ""
  ).trim();
  const extension = String(
    (row && row.internalNumber) ||
      employee.internalNumber ||
      employee.extension ||
      employee.number ||
      ""
  ).trim();
  const pbxName = String(pbxNumber.name || "").trim();
  const pbxValue = String(pbxNumber.number || pbxNumber.id || "").trim();
  const id = String(employee.id || employee.employeeId || employee.userId || "").trim();
  const fallbackKey = ratingIdentityKey(name, extension) ||
    ratingIdentityKey(extension) ||
    ratingIdentityKey(name) ||
    ratingIdentityKey(pbxValue || pbxName);
  const key = id ? `employee:${id}` : fallbackKey || "unknown";

  return {
    key,
    label: name || (extension ? `вн. ${extension}` : "") || pbxName || "Оператор не визначений",
    name,
    extension,
    pbxName,
    pbxNumber: pbxValue
  };
}

function metricAveragePayload(item) {
  const count = numeric(item.scoredMetricCount);
  const scoreSum = numeric(item.scoreSum);
  const maxScoreSum = numeric(item.maxScoreSum);
  const normalizedScoreSum = numeric(item.normalizedScoreSum);

  return {
    scoredMetricCount: count,
    scoreSum: roundMoney(scoreSum),
    maxScoreSum: roundMoney(maxScoreSum),
    averageScore: count ? Math.round((scoreSum / count) * 100) / 100 : null,
    averageMaxScore: count ? Math.round((maxScoreSum / count) * 100) / 100 : null,
    averagePercent: count
      ? Math.round((normalizedScoreSum / count) * 100) / 100
      : null,
    totalPercent: maxScoreSum > 0
      ? Math.round((scoreSum / maxScoreSum) * 10000) / 100
      : null
  };
}

function createMetricRating(key, label, group, color) {
  return {
    key,
    label,
    group,
    color,
    scoredMetricCount: 0,
    scoreSum: 0,
    maxScoreSum: 0,
    normalizedScoreSum: 0,
    options: new Map()
  };
}

function addMetricRating(map, row, score, maxScore, percent) {
  const key = String(row && row.metricKey || "").trim();
  if (!key) {
    return;
  }

  const current = map.get(key) || createMetricRating(
    key,
    String(row.metricLabel || key).trim(),
    String(row.metricGroup || "").trim(),
    String(row.color || "").trim()
  );
  current.scoredMetricCount += 1;
  current.scoreSum += score;
  current.maxScoreSum += maxScore;
  current.normalizedScoreSum += percent;

  const optionKey = String(row.selectedOptionKey || "").trim();
  if (optionKey) {
    const option = current.options.get(optionKey) || {
      key: optionKey,
      label: String(row.selectedOptionLabel || optionKey).trim(),
      score,
      maxScore,
      count: 0
    };
    option.count += 1;
    current.options.set(optionKey, option);
  }

  map.set(key, current);
}

function metricRatingList(map) {
  return [...map.values()]
    .map((metric) => ({
      key: metric.key,
      label: metric.label,
      group: metric.group,
      color: metric.color,
      ...metricAveragePayload(metric),
      options: [...metric.options.values()]
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    }))
    .sort((a, b) => {
      const aPercent = Number.isFinite(Number(a.averagePercent)) ? Number(a.averagePercent) : -1;
      const bPercent = Number.isFinite(Number(b.averagePercent)) ? Number(b.averagePercent) : -1;
      return bPercent - aPercent ||
        b.scoredMetricCount - a.scoredMetricCount ||
        a.label.localeCompare(b.label);
    });
}

function buildManagerRating(rows, options = {}) {
  const managers = new Map();
  const globalMetrics = new Map();
  let scoredMetrics = 0;
  let scoreSum = 0;
  let maxScoreSum = 0;
  let normalizedScoreSum = 0;

  for (const row of Array.isArray(rows) ? rows : []) {
    const score = optionalNumber(row && row.score);
    const maxScore = optionalNumber(row && row.maxScore);
    if (score === null || maxScore === null || maxScore <= 0) {
      continue;
    }

    const percent = (score / maxScore) * 100;
    const identity = managerIdentity(row);
    const current = managers.get(identity.key) || {
      ...identity,
      calls: new Set(),
      callTypes: new Map(),
      scoredMetricCount: 0,
      scoreSum: 0,
      maxScoreSum: 0,
      normalizedScoreSum: 0,
      metrics: new Map(),
      lastCallAt: null
    };
    const callId = String(row && row.callId || "").trim();
    if (callId && !current.calls.has(callId)) {
      current.calls.add(callId);
      const callType = String(row.callType || "unknown").trim() || "unknown";
      const callTypeLabel = String(row.callTypeLabel || callType).trim();
      const typeCounter = current.callTypes.get(callType) || {
        type: callType,
        label: callTypeLabel,
        count: 0
      };
      typeCounter.count += 1;
      current.callTypes.set(callType, typeCounter);
    }
    if (row && row.startedAt) {
      const startedAt = new Date(row.startedAt).getTime();
      const lastCallAt = current.lastCallAt
        ? new Date(current.lastCallAt).getTime()
        : 0;
      if (Number.isFinite(startedAt) && startedAt > lastCallAt) {
        current.lastCallAt = new Date(startedAt).toISOString();
      }
    }

    current.scoredMetricCount += 1;
    current.scoreSum += score;
    current.maxScoreSum += maxScore;
    current.normalizedScoreSum += percent;
    addMetricRating(current.metrics, row, score, maxScore, percent);
    managers.set(identity.key, current);

    scoredMetrics += 1;
    scoreSum += score;
    maxScoreSum += maxScore;
    normalizedScoreSum += percent;
    addMetricRating(globalMetrics, row, score, maxScore, percent);
  }

  const managerRows = [...managers.values()]
    .map((manager) => ({
      key: manager.key,
      label: manager.label,
      name: manager.name,
      extension: manager.extension,
      pbxName: manager.pbxName,
      pbxNumber: manager.pbxNumber,
      ratedCallCount: manager.calls.size,
      lastCallAt: manager.lastCallAt,
      ...metricAveragePayload(manager),
      callTypes: [...manager.callTypes.values()]
        .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type)),
      metrics: metricRatingList(manager.metrics)
    }))
    .sort((a, b) => {
      const aPercent = Number.isFinite(Number(a.averagePercent)) ? Number(a.averagePercent) : -1;
      const bPercent = Number.isFinite(Number(b.averagePercent)) ? Number(b.averagePercent) : -1;
      return bPercent - aPercent ||
        b.ratedCallCount - a.ratedCallCount ||
        a.label.localeCompare(b.label);
    })
    .map((manager, index) => ({
      ...manager,
      rank: index + 1
    }));

  return {
    periodDays: options.periodDays || null,
    managerCount: managerRows.length,
    ratedCalls: new Set(
      (Array.isArray(rows) ? rows : [])
        .map((row) => String(row && row.callId || "").trim())
        .filter(Boolean)
    ).size,
    scoredMetrics,
    ...metricAveragePayload({
      scoredMetricCount: scoredMetrics,
      scoreSum,
      maxScoreSum,
      normalizedScoreSum
    }),
    topManager: managerRows[0] || null,
    managers: managerRows,
    metrics: metricRatingList(globalMetrics)
  };
}

function addCustomMetric(map, metric) {
  const key = String(metric && metric.metricKey || "").trim();
  if (!key) {
    return;
  }

  const score = optionalNumber(metric.score);
  const explicitMaxScore = optionalNumber(metric.maxScore);
  const maxScore = explicitMaxScore && explicitMaxScore > 0
    ? explicitMaxScore
    : score !== null
      ? 5
      : null;
  const optionKey = String(metric.selectedOptionKey || "").trim();
  const optionLabel = String(metric.selectedOptionLabel || optionKey).trim();
  const current = map.get(key) || {
    key,
    label: String(metric.metricLabel || key).trim(),
    count: 0,
    scoredCount: 0,
    scoreSum: 0,
    maxScoreSum: 0,
    normalizedScoreSum: 0,
    options: new Map()
  };

  current.count += 1;
  if (metric.countsTowardScore !== false && score !== null && maxScore > 0) {
    current.scoredCount += 1;
    current.scoreSum += score;
    current.maxScoreSum += maxScore;
    current.normalizedScoreSum += (score / maxScore) * 100;
  }

  if (optionKey) {
    const option = current.options.get(optionKey) || {
      key: optionKey,
      label: optionLabel,
      score,
      maxScore,
      color: String(metric.color || "").trim(),
      countsTowardScore: metric.countsTowardScore !== false && score !== null,
      count: 0
    };
    option.count += 1;
    current.options.set(optionKey, option);
  }

  map.set(key, current);
}

function customMetricAnalytics(metricMap) {
  return [...metricMap.values()]
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .map((metric) => ({
      key: metric.key,
      label: metric.label,
      count: metric.count,
      scoredCount: metric.scoredCount,
      averageScore: metric.scoredCount
        ? Math.round((metric.scoreSum / metric.scoredCount) * 100) / 100
        : null,
      averageMaxScore: metric.scoredCount
        ? Math.round((metric.maxScoreSum / metric.scoredCount) * 100) / 100
        : null,
      averagePercent: metric.scoredCount
        ? Math.round((metric.normalizedScoreSum / metric.scoredCount) * 100) / 100
        : null,
      options: [...metric.options.values()]
        .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    }));
}

function openAiSummaryCostUsd(usage, pricing) {
  if (!pricing) {
    return null;
  }

  const inputTokens = numeric(usage.inputTokens);
  const cachedInputTokens = Math.min(inputTokens, numeric(usage.cachedInputTokens));
  const billableInputTokens = Math.max(
    0,
    numeric(usage.billableInputTokens) || inputTokens - cachedInputTokens
  );
  const outputTokens = numeric(usage.outputTokens);

  return (
    (billableInputTokens * pricing.inputPerMillion) / 1_000_000 +
    (cachedInputTokens * pricing.cachedInputPerMillion) / 1_000_000 +
    (outputTokens * pricing.outputPerMillion) / 1_000_000
  );
}

function transcriptionCostUsd(model, durationSeconds) {
  const pricing = transcriptionPricing(model);
  if (!pricing) {
    return {
      costUsd: null,
      pricing: null
    };
  }

  if (pricing.audioHourUsd !== undefined) {
    return {
      costUsd: (numeric(durationSeconds) / 3600) * pricing.audioHourUsd,
      pricing
    };
  }

  if (pricing.minuteUsd !== undefined) {
    return {
      costUsd: (numeric(durationSeconds) / 60) * pricing.minuteUsd,
      pricing
    };
  }

  return {
    costUsd: null,
    pricing: null
  };
}

class BinotelMonitorService {
  constructor(config, binotelClient, callSummaryService, store, recordingCache) {
    this.rootConfig = config || {};
    this.config = this.rootConfig.binotelMonitor || {};
    this.binotelClient = binotelClient;
    this.callSummaryService = callSummaryService;
    this.store = store;
    this.recordingCache = recordingCache;
    this.timer = null;
    this.running = false;
    this.closed = false;
    this.nextPollAt = null;
    this.lastTickStartedAt = null;
    this.lastTickFinishedAt = null;
    this.monitorSinceTimestamp = 0;
    this.aiAnalysisSinceTimestamp = 0;
    this.processStartedAtUnix = unixNow();
    this.processStartedAt = nowIso();
    this.analyticsCache = new Map();
    this.analyticsPending = new Map();
    this.managerRatingCache = new Map();
    this.managerRatingPending = new Map();
    this.callStatisticsCache = new Map();
    this.callStatisticsPending = new Map();
    this.analyticsCacheMillis = 10 * 1000;
  }

  get enabled() {
    return Boolean(
      this.config.enabled &&
        this.binotelClient &&
        this.binotelClient.enabled
    );
  }

  start() {
    if (this.closed || !this.config.enabled) {
      return;
    }

    if (!this.enabled) {
      this.store.updateSync({
        lastError: "Binotel monitor is enabled, but Binotel API credentials are not configured.",
        lastSyncAt: nowIso()
      }).catch((error) => {
        console.error(`Binotel monitor status write failed: ${error.message}`);
      });
      return;
    }

    this.schedule(500);
  }

  close() {
    this.closed = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  providerCostWindow(items, options = {}) {
    const end = new Date();
    const configuredStart = options.since ? new Date(options.since) : null;
    const callStarts = (Array.isArray(items) ? items : [])
      .map((item) => (item && item.call) || item)
      .map((call) => new Date(call && call.startedAt).getTime())
      .filter((value) => Number.isFinite(value) && value > 0);
    const earliestCallStart = callStarts.length ? Math.min(...callStarts) : 0;
    const requestedStart =
      configuredStart && Number.isFinite(configuredStart.getTime())
        ? configuredStart
        : earliestCallStart
          ? new Date(earliestCallStart)
          : null;

    if (!requestedStart || requestedStart >= end) {
      return null;
    }

    const sonioxEarliest = new Date(end.getTime() - 31 * 24 * 60 * 60 * 1000);
    const sonioxStart = requestedStart < sonioxEarliest
      ? sonioxEarliest
      : requestedStart;

    return {
      startTime: requestedStart.toISOString(),
      endTime: end.toISOString(),
      sonioxStartTime: sonioxStart.toISOString(),
      sonioxCoverageComplete: sonioxStart.getTime() === requestedStart.getTime()
    };
  }

  async providerCostSnapshots(items, options = {}) {
    if (String(options.query || "").trim()) {
      return {
        window: null,
        soniox: { available: false, reason: "query_filtered" },
        openAi: { available: false, reason: "query_filtered" }
      };
    }

    const window = this.providerCostWindow(items, options);
    if (!window) {
      return {
        window: null,
        soniox: { available: false, reason: "no_calls" },
        openAi: { available: false, reason: "no_calls" }
      };
    }

    const transcriptionClient = this.callSummaryService &&
      this.callSummaryService.transcriptionClient;
    const openAiClient = this.callSummaryService && this.callSummaryService.openAiClient;
    const sonioxPromise = !transcriptionClient ||
      transcriptionClient.provider !== "soniox" ||
      typeof transcriptionClient.listUsageLogs !== "function"
      ? Promise.resolve({ available: false, reason: "not_configured" })
      : transcriptionClient.listUsageLogs({
        startTime: window.sonioxStartTime,
        endTime: window.endTime
      }).then((result) => {
        const usageLogs = Array.isArray(result && result.usageLogs) ? result.usageLogs : [];
        const costUsd = usageLogs.reduce(
          (total, entry) => total + numeric(entry && entry.cost_usd),
          0
        );
        const audioDurationSeconds = usageLogs.reduce(
          (total, entry) => total + numeric(entry && entry.input_audio_duration_ms) / 1000,
          0
        );
        return {
          available: true,
          source: "provider_api",
          costUsd,
          entries: usageLogs.length,
          pages: numeric(result && result.pages),
          audioDurationSeconds,
          startTime: window.sonioxStartTime,
          endTime: window.endTime,
          coverageComplete: window.sonioxCoverageComplete
        };
      }).catch((error) => {
        console.warn(`Soniox usage logs unavailable: ${error.message}`);
        return { available: false, reason: "provider_error" };
      });
    const openAiPromise = !openAiClient ||
      typeof openAiClient.organizationCosts !== "function"
      ? Promise.resolve({ available: false, reason: "not_configured" })
      : openAiClient.organizationCosts({
        startTime: window.startTime,
        endTime: window.endTime
      }).catch((error) => {
        console.warn(`OpenAI costs unavailable: ${error.message}`);
        return { available: false, reason: "provider_error" };
      });
    const [soniox, openAi] = await Promise.all([sonioxPromise, openAiPromise]);

    return {
      window,
      soniox,
      openAi
    };
  }

  schedule(delayMillis) {
    if (this.closed || !this.config.enabled) {
      return;
    }

    const delay = Math.max(1000, Number(delayMillis || this.config.pollIntervalMillis || 60000));
    this.nextPollAt = new Date(Date.now() + delay).toISOString();

    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.tick().catch((error) => {
        console.error(`Binotel monitor tick failed: ${error.message}`);
      });
    }, delay);

    if (typeof this.timer.unref === "function") {
      this.timer.unref();
    }
  }

  initialTimestamp(value, fallbackTimestamp) {
    const parsed = Number(value || 0);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }

    return Math.floor(Number(fallbackTimestamp || unixNow()));
  }

  nextTimestamp(currentTimestamp) {
    const overlap = Math.max(0, Number(this.config.overlapSeconds || 600));
    const safeNow = unixNow() - overlap;

    return Math.max(
      Number(currentTimestamp || 0),
      safeNow
    );
  }

  async ensureSyncBoundaries(sync) {
    const now = this.processStartedAtUnix;
    const configuredSyncSince = Number(this.config.syncSinceTimestamp || 0);
    const configuredAiSince = Number(this.config.aiAnalysisSinceTimestamp || 0);
    const currentMonitorSince = Number(sync.monitorSinceTimestamp || 0);
    const currentAiSince = Number(sync.aiAnalysisSinceTimestamp || 0);
    let monitorSinceTimestamp = this.initialTimestamp(
      configuredSyncSince || currentMonitorSince,
      configuredAiSince || now
    );
    if (
      !configuredSyncSince &&
      configuredAiSince &&
      configuredAiSince < monitorSinceTimestamp
    ) {
      monitorSinceTimestamp = configuredAiSince;
    }
    const aiAnalysisSinceTimestamp = configuredAiSince || this.initialTimestamp(
      currentAiSince,
      monitorSinceTimestamp
    );
    const monitorBoundaryChanged = Boolean(
      currentMonitorSince && monitorSinceTimestamp !== currentMonitorSince
    );
    const patch = {};

    if (
      !currentMonitorSince ||
      (configuredSyncSince && configuredSyncSince !== currentMonitorSince)
    ) {
      patch.monitorSinceTimestamp = monitorSinceTimestamp;
    }

    if (
      !currentAiSince ||
      (configuredAiSince && configuredAiSince !== currentAiSince)
    ) {
      patch.aiAnalysisSinceTimestamp = aiAnalysisSinceTimestamp;
    }

    if (!sync.firstStartedAt) {
      patch.firstStartedAt = this.processStartedAt;
    }

    if (!Number(sync.lastIncomingTimestamp || 0) || monitorBoundaryChanged) {
      patch.lastIncomingTimestamp = monitorSinceTimestamp;
    }

    if (!Number(sync.lastOutgoingTimestamp || 0) || monitorBoundaryChanged) {
      patch.lastOutgoingTimestamp = monitorSinceTimestamp;
    }

    const nextSync = Object.keys(patch).length
      ? await this.store.updateSync(patch)
      : {
        ...sync,
        monitorSinceTimestamp,
        aiAnalysisSinceTimestamp
      };

    this.monitorSinceTimestamp = monitorSinceTimestamp;
    this.aiAnalysisSinceTimestamp = aiAnalysisSinceTimestamp;
    return nextSync;
  }

  async tick() {
    if (this.closed || !this.enabled) {
      return;
    }

    if (this.running) {
      return;
    }

    this.running = true;
    this.lastTickStartedAt = nowIso();

    try {
      const sync = await this.ensureSyncBoundaries(await this.store.syncState());
      const incomingSince = this.initialTimestamp(
        sync.lastIncomingTimestamp,
        sync.monitorSinceTimestamp
      );
      const outgoingSince = this.initialTimestamp(
        sync.lastOutgoingTimestamp,
        sync.monitorSinceTimestamp
      );
      const [incomingCalls, outgoingCalls, disabledNumbers] = await Promise.all([
        this.binotelClient.allIncomingCallsSince(incomingSince),
        this.binotelClient.allOutgoingCallsSince(outgoingSince),
        this.disabledAnalysisInternalNumbers()
      ]);
      const calls = [...incomingCalls, ...outgoingCalls].map((call) => ({
        ...call,
        aiEligible: this.isAiEligibleCall(call, { disabledNumbers }),
        monitorCollectedAt: nowIso()
      }));
      const upsert = await this.store.upsertCalls(calls);

      await this.store.updateSync({
        lastIncomingTimestamp: this.nextTimestamp(incomingSince, incomingCalls),
        lastOutgoingTimestamp: this.nextTimestamp(outgoingSince, outgoingCalls),
        lastSyncAt: nowIso(),
        lastError: "",
        lastResult: {
          incoming: incomingCalls.length,
          outgoing: outgoingCalls.length,
          added: upsert.added,
          updated: upsert.updated,
          total: upsert.total
        }
      });

      await this.cacheRecordingsForNewestCalls();
      await this.queueAiForNewestCalls();
      if (this.recordingCache) {
        await this.recordingCache.purgeExpired();
      }
    } catch (error) {
      await this.store.updateSync({
        lastSyncAt: nowIso(),
        lastError: error.message
      });
      throw error;
    } finally {
      this.running = false;
      this.lastTickFinishedAt = nowIso();
      this.schedule(this.config.pollIntervalMillis || 60000);
    }
  }

  async queueAiForNewestCalls() {
    if (!this.callSummaryService || !this.callSummaryService.enabled) {
      return;
    }

    const batchSize = Math.max(0, Number(this.config.aiBatchSize || 3));
    if (!batchSize) {
      return;
    }
    const availableSlots = Math.max(
      0,
      batchSize - Number(this.callSummaryService.activeCount || 0)
    );
    if (!availableSlots) {
      return;
    }

    const recordingRetryMillis = Math.max(
      30000,
      Number(this.config.recordingRetryMillis || 2 * 60 * 1000)
    );
    const aiMaxAttempts = Math.max(
      1,
      Number(
        this.callSummaryService.config &&
        this.callSummaryService.config.transcription &&
        this.callSummaryService.config.transcription.callMaxAttempts
      ) || 5
    );
    const processingStaleMillis = Math.max(
      30000,
      Number(
        this.callSummaryService.config &&
        this.callSummaryService.config.transcription &&
        this.callSummaryService.config.transcription.processingStaleMillis
      ) || 10 * 60 * 1000
    );
    const result = await this.store.list({
      limit: Math.max(Number(this.config.processingScanLimit || 0), 2000)
    });
    const disabledNumbers = await this.disabledAnalysisInternalNumbers();
    let queued = 0;

    for (const call of result.calls) {
      if (queued >= availableSlots) {
        break;
      }

      if (!canHaveRecording(call)) {
        continue;
      }

      if (!this.isAiEligibleCall(call, { disabledNumbers })) {
        continue;
      }

      const callId = String(call.generalCallId || call.id || "");
      if (!callId) {
        continue;
      }

      if (this.recordingCache && !await this.recordingCache.hasFresh(callId)) {
        continue;
      }

      const existing = await this.callSummaryService.store.get(callId);
      const existingIsCurrent = existing
        ? await this.callSummaryService.isCurrentEntry(existing)
        : false;
      if (existing && existing.status === "done" && existingIsCurrent) {
        continue;
      }

      if (existing && existing.status === "processing" && existingIsCurrent) {
        const processingAt = new Date(
          existing.startedAt || existing.updatedAt || 0
        ).getTime();
        if (
          Number.isFinite(processingAt) &&
          Date.now() - processingAt < processingStaleMillis
        ) {
          continue;
        }
      }

      if (existing && existing.status === "queued" && existingIsCurrent) {
        const queuedAt = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        if (
          Number.isFinite(queuedAt) &&
          Date.now() - queuedAt < processingStaleMillis
        ) {
          continue;
        }
      }

      if (
        existing &&
        existingIsCurrent &&
        existing.status !== "done" &&
        (existing.terminalFailure || Number(existing.attempts || 0) >= aiMaxAttempts)
      ) {
        if (!existing.terminalFailure || existing.status !== "failed") {
          await this.callSummaryService.store.upsert(callId, {
            status: "failed",
            stage: "failed",
            terminalFailure: true,
            message:
              `Автоматичну AI-обробку зупинено після ${aiMaxAttempts} невдалих спроб.`,
            error: existing.error || "Досягнуто ліміт спроб AI-обробки."
          });
        }
        continue;
      }

      if (existing && existing.status === "failed" && existingIsCurrent) {
        const updatedAt = new Date(existing.updatedAt || 0).getTime();
        if (Number.isFinite(updatedAt) && Date.now() - updatedAt < recordingRetryMillis) {
          continue;
        }
      }

      await this.callSummaryService.ensureCallSummary(externalPhone(call), call, {
        retryFailed: true
      });
      queued += 1;
    }
  }

  async cacheRecordingsForNewestCalls() {
    if (!this.recordingCache) {
      return;
    }

    const batchSize = Math.max(0, Number(this.config.recordingDownloadBatchSize || 2));
    if (!batchSize) {
      return;
    }

    const result = await this.store.list({
      limit: Math.max(Number(this.config.processingScanLimit || 0), 2000)
    });
    const disabledNumbers = await this.disabledAnalysisInternalNumbers();
    let cached = 0;

    for (const call of result.calls) {
      if (cached >= batchSize) {
        break;
      }

      if (!this.isAiEligibleCall(call, { disabledNumbers }) || !canHaveRecording(call)) {
        continue;
      }

      const callId = String(call.generalCallId || call.id || "");
      if (!callId || await this.recordingCache.hasFresh(callId)) {
        continue;
      }

      try {
        await this.recordingCache.getAudio(callId);
        await this.store.updateCall(callId, {
          recordingCacheStatus: "cached",
          recordingCacheError: "",
          recordingCacheUpdatedAt: nowIso()
        });
        cached += 1;
      } catch (error) {
        await this.store.updateCall(callId, {
          recordingCacheStatus: "pending",
          recordingCacheError: error.message,
          recordingCacheUpdatedAt: nowIso()
        });
      }
    }
  }

  async disabledAnalysisInternalNumbers() {
    if (this.store && typeof this.store.disabledAnalysisInternalNumbers === "function") {
      return this.store.disabledAnalysisInternalNumbers();
    }
    return new Set();
  }

  isInternalNumberDisabled(call, disabledNumbers) {
    const number = internalNumber(call);
    return Boolean(number && disabledNumbers && disabledNumbers.has(number));
  }

  isAiEligibleCall(call, options = {}) {
    return Boolean(
      call &&
        !this.isInternalNumberDisabled(call, options.disabledNumbers) &&
        callTimestamp(call) >= Number(this.aiAnalysisSinceTimestamp || 0)
    );
  }

  async visibleCall(callId) {
    const call = await this.store.getCall(callId);
    if (!call) {
      return null;
    }
    if (this.isInternalNumberDisabled(call, await this.disabledAnalysisInternalNumbers())) {
      return null;
    }
    return call;
  }

  clearAnalyticsCache() {
    this.analyticsCache.clear();
    this.managerRatingCache.clear();
    this.callStatisticsCache.clear();
  }

  async listCalls(options = {}) {
    await this.ensureSyncBoundaries(await this.store.syncState());
    const result = await this.store.list(options);
    const disabledNumbers = await this.disabledAnalysisInternalNumbers();
    const calls = await Promise.all(
      result.calls.map(async (call) => {
        const callId = call.generalCallId || call.id || call.callId;
        const recordable = canHaveRecording(call);
        const aiEligible = this.isAiEligibleCall(call, { disabledNumbers });
        const recordingCached =
          Boolean(recordable && callId && this.recordingCache) &&
          await this.recordingCache.hasFresh(callId);
        const ai = callId && this.callSummaryService
          ? await this.callSummaryService.status(callId)
          : null;

        return {
          ...call,
          aiEligible,
          recordable,
          recordingCached,
          recordingUrl: recordable && callId
            ? `/api/binotel-monitor/recording?callId=${encodeURIComponent(callId)}`
            : "",
          ai
        };
      })
    );

    return {
      ...result,
      calls,
      maxStoredCalls: this.config.maxStoredCalls || 0,
      historyLimited: Number(this.config.maxStoredCalls || 0) > 0
    };
  }

  async callDetails(callId) {
    await this.ensureSyncBoundaries(await this.store.syncState());
    const call = await this.visibleCall(callId);
    if (!call) {
      return null;
    }

    const disabledNumbers = await this.disabledAnalysisInternalNumbers();
    const id = call.generalCallId || call.id || call.callId;
    const recordable = canHaveRecording(call);
    const recordingCached =
      Boolean(recordable && id && this.recordingCache) &&
      await this.recordingCache.hasFresh(id);
    const ai = id && this.callSummaryService
      ? await this.callSummaryService.details(id)
      : null;

    return {
      ...call,
      aiEligible: this.isAiEligibleCall(call, { disabledNumbers }),
      recordable,
      recordingCached,
      recordingUrl: recordable && id
        ? `/api/binotel-monitor/recording?callId=${encodeURIComponent(id)}`
        : "",
      ai
    };
  }

  async reanalyzeCall(callId) {
    await this.ensureSyncBoundaries(await this.store.syncState());
    const call = await this.visibleCall(callId);
    if (!call) {
      return null;
    }

    if (!this.callSummaryService) {
      return {
        status: "disabled",
        message: "AI-аналіз не налаштований.",
        summary: null
      };
    }

    return this.callSummaryService.reanalyzeCall(externalPhone(call), call);
  }

  async callTypeAnalytics(options = {}) {
    const cacheKey = JSON.stringify({
      query: options.query || "",
      since: options.since || null,
      periodDays: options.periodDays || null
    });
    const cached = this.analyticsCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < this.analyticsCacheMillis) {
      return cached.value;
    }

    const pending = this.analyticsPending.get(cacheKey);
    if (pending) {
      return pending;
    }

    const calculation = this.calculateCallTypeAnalytics(options);
    this.analyticsPending.set(cacheKey, calculation);

    try {
      const analytics = await calculation;
      this.analyticsCache.set(cacheKey, {
        createdAt: Date.now(),
        value: analytics
      });
      if (this.analyticsCache.size > 20) {
        const oldestKey = this.analyticsCache.keys().next().value;
        this.analyticsCache.delete(oldestKey);
      }

      return analytics;
    } finally {
      this.analyticsPending.delete(cacheKey);
    }
  }

  async managerRating(options = {}) {
    const cacheKey = JSON.stringify({
      query: options.query || "",
      since: options.since || null,
      periodDays: options.periodDays || null
    });
    const cached = this.managerRatingCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < this.analyticsCacheMillis) {
      return cached.value;
    }

    const pending = this.managerRatingPending.get(cacheKey);
    if (pending) {
      return pending;
    }

    const calculation = this.calculateManagerRating(options);
    this.managerRatingPending.set(cacheKey, calculation);

    try {
      const rating = await calculation;
      this.managerRatingCache.set(cacheKey, {
        createdAt: Date.now(),
        value: rating
      });
      if (this.managerRatingCache.size > 20) {
        const oldestKey = this.managerRatingCache.keys().next().value;
        this.managerRatingCache.delete(oldestKey);
      }

      return rating;
    } finally {
      this.managerRatingPending.delete(cacheKey);
    }
  }

  async callStatistics(options = {}) {
    const cacheKey = JSON.stringify({
      query: options.query || "",
      from: options.from || null,
      to: options.to || null,
      periodKey: options.periodKey || "",
      timezone: options.timezone || "Europe/Kyiv"
    });
    const cached = this.callStatisticsCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < this.analyticsCacheMillis) {
      return cached.value;
    }

    const pending = this.callStatisticsPending.get(cacheKey);
    if (pending) {
      return pending;
    }

    const calculation = this.calculateCallStatistics(options);
    this.callStatisticsPending.set(cacheKey, calculation);

    try {
      const stats = await calculation;
      this.callStatisticsCache.set(cacheKey, {
        createdAt: Date.now(),
        value: stats
      });
      if (this.callStatisticsCache.size > 20) {
        const oldestKey = this.callStatisticsCache.keys().next().value;
        this.callStatisticsCache.delete(oldestKey);
      }
      return stats;
    } finally {
      this.callStatisticsPending.delete(cacheKey);
    }
  }

  async calculateCallStatistics(options = {}) {
    if (!this.store || typeof this.store.callStatistics !== "function") {
      return {
        period: {
          from: options.from || null,
          to: options.to || null,
          periodKey: options.periodKey || "",
          timezone: options.timezone || "Europe/Kyiv"
        },
        summary: {},
        daily: [],
        hourly: [],
        weekdays: [],
        directions: [],
        dispositions: [],
        durationBuckets: [],
        managers: [],
        lines: [],
        topExternalNumbers: [],
        heatmap: []
      };
    }

    const result = await this.store.callStatistics({
      query: options.query || "",
      from: options.from || null,
      to: options.to || null,
      timezone: options.timezone || "Europe/Kyiv"
    });

    const integerValue = (value) => Math.trunc(numeric(value));
    const timestampValue = (value) => value ? new Date(value).toISOString() : null;
    const firstDefined = (...values) =>
      values.find((value) => value !== undefined && value !== null);
    const mapSeriesRow = (row) => ({
      dayKey: row.day_key || row.dayKey || "",
      dayStartedAt: timestampValue(row.day_started_at || row.dayStartedAt),
      totalCalls: integerValue(firstDefined(row.total_calls, row.totalCalls)),
      incomingCalls: integerValue(firstDefined(row.incoming_calls, row.incomingCalls)),
      outgoingCalls: integerValue(firstDefined(row.outgoing_calls, row.outgoingCalls)),
      answeredCalls: integerValue(firstDefined(row.answered_calls, row.answeredCalls)),
      missedCalls: integerValue(firstDefined(row.missed_calls, row.missedCalls)),
      totalBillSec: integerValue(firstDefined(row.total_bill_sec, row.totalBillSec))
    });
    const mapBucket = (row) => ({
      bucket: String(row.bucket || ""),
      label: String(row.label || ""),
      sortOrder: integerValue(firstDefined(row.sort_order, row.sortOrder)),
      totalCalls: integerValue(firstDefined(row.total_calls, row.totalCalls))
    });
    const mapManager = (row) => {
      const totalCalls = integerValue(firstDefined(row.total_calls, row.totalCalls));
      const answeredCalls = integerValue(firstDefined(row.answered_calls, row.answeredCalls));
      const incomingCalls = integerValue(firstDefined(row.incoming_calls, row.incomingCalls));
      const outgoingCalls = integerValue(firstDefined(row.outgoing_calls, row.outgoingCalls));
      const totalBillSec = integerValue(firstDefined(row.total_bill_sec, row.totalBillSec));
      return {
        key: String(row.manager_key || row.key || ""),
        label: String(row.label || "Оператор не визначений"),
        internalNumber: String(row.internal_number || row.internalNumber || ""),
        employeeName: String(row.employee_name || row.employeeName || ""),
        pbxName: String(row.pbx_name || row.pbxName || ""),
        totalCalls,
        incomingCalls,
        outgoingCalls,
        answeredCalls,
        missedCalls: integerValue(firstDefined(row.missed_calls, row.missedCalls)),
        uniqueCustomers: integerValue(firstDefined(row.unique_customers, row.uniqueCustomers)),
        totalBillSec,
        totalWaitSec: integerValue(firstDefined(row.total_wait_sec, row.totalWaitSec)),
        avgBillSec: integerValue(firstDefined(row.avg_bill_sec, row.avgBillSec)),
        avgWaitSec: integerValue(firstDefined(row.avg_wait_sec, row.avgWaitSec)),
        recordingCalls: integerValue(firstDefined(row.recording_calls, row.recordingCalls)),
        answerRate: totalCalls ? Math.round((answeredCalls / totalCalls) * 1000) / 10 : 0,
        incomingShare: totalCalls ? Math.round((incomingCalls / totalCalls) * 1000) / 10 : 0,
        outgoingShare: totalCalls ? Math.round((outgoingCalls / totalCalls) * 1000) / 10 : 0,
        talkHours: Math.round((totalBillSec / 3600) * 10) / 10,
        firstCallAt: timestampValue(row.first_call_at || row.firstCallAt),
        lastCallAt: timestampValue(row.last_call_at || row.lastCallAt)
      };
    };
    const mapCompact = (row) => ({
      key: String(row.key || row.direction || row.bucket || row.label || ""),
      label: String(row.label || row.direction || "—"),
      direction: String(row.direction || ""),
      number: String(row.number || ""),
      internalNumber: String(row.internal_number || row.internalNumber || ""),
      phone: String(row.phone || ""),
      externalDigits: String(row.external_digits || row.externalDigits || ""),
      totalCalls: integerValue(firstDefined(row.total_calls, row.totalCalls)),
      incomingCalls: integerValue(firstDefined(row.incoming_calls, row.incomingCalls)),
      outgoingCalls: integerValue(firstDefined(row.outgoing_calls, row.outgoingCalls)),
      answeredCalls: integerValue(firstDefined(row.answered_calls, row.answeredCalls)),
      totalBillSec: integerValue(firstDefined(row.total_bill_sec, row.totalBillSec)),
      lastCallAt: timestampValue(row.last_call_at || row.lastCallAt)
    });

    const periodStart = options.from ? new Date(options.from).getTime() : 0;
    const periodEnd = options.to ? new Date(options.to).getTime() : Date.now();
    const periodDays = periodStart && periodEnd > periodStart
      ? Math.max(1, Math.ceil((periodEnd - periodStart) / (24 * 60 * 60 * 1000)))
      : Math.max(1, (result.daily || []).length || 1);
    const summary = result.summary || {};
    summary.avgCallsPerDay = Math.round((numeric(summary.totalCalls) / periodDays) * 10) / 10;

    return {
      period: {
        ...(result.period || {}),
        periodKey: options.periodKey || "",
        timezone: options.timezone || "Europe/Kyiv",
        days: periodDays
      },
      summary,
      daily: (result.daily || []).map(mapSeriesRow),
      hourly: (result.hourly || []).map((row) => ({
        hour: integerValue(row.hour),
        totalCalls: integerValue(firstDefined(row.total_calls, row.totalCalls)),
        answeredCalls: integerValue(firstDefined(row.answered_calls, row.answeredCalls)),
        totalBillSec: integerValue(firstDefined(row.total_bill_sec, row.totalBillSec))
      })),
      weekdays: (result.weekdays || []).map((row) => ({
        weekday: integerValue(row.weekday),
        totalCalls: integerValue(firstDefined(row.total_calls, row.totalCalls)),
        totalBillSec: integerValue(firstDefined(row.total_bill_sec, row.totalBillSec))
      })),
      directions: (result.directions || []).map(mapCompact),
      dispositions: (result.dispositions || []).map(mapCompact),
      durationBuckets: (result.durationBuckets || []).map(mapBucket),
      managers: (result.managers || []).map(mapManager),
      lines: (result.lines || []).map(mapCompact),
      topExternalNumbers: (result.topExternalNumbers || []).map(mapCompact),
      heatmap: (result.heatmap || []).map((row) => ({
        weekday: integerValue(row.weekday),
        hour: integerValue(row.hour),
        totalCalls: integerValue(firstDefined(row.total_calls, row.totalCalls)),
        totalBillSec: integerValue(firstDefined(row.total_bill_sec, row.totalBillSec))
      }))
    };
  }

  async calculateManagerRating(options = {}) {
    if (typeof this.store.managerRating !== "function") {
      return buildManagerRating([], {
        periodDays: options.periodDays || null
      });
    }

    const result = await this.store.managerRating({
      limit: this.config.maxStoredCalls || 5000,
      query: options.query || "",
      since: options.since || null
    });

    return {
      ...buildManagerRating(result.rows || [], {
        periodDays: options.periodDays || null
      }),
      sourceRatedCalls: numeric(result.ratedCalls),
      sourceScoredMetrics: numeric(result.scoredMetrics)
    };
  }

  async calculateCallTypeAnalytics(options = {}) {
    await this.ensureSyncBoundaries(await this.store.syncState());
    const listOptions = {
      limit: this.config.maxStoredCalls || 5000,
      query: options.query || "",
      since: options.since || null
    };
    const result = typeof this.store.analytics === "function"
      ? await this.store.analytics(listOptions)
      : await this.store.list(listOptions);
    const providerCostsPromise = this.providerCostSnapshots(result.calls, options);
    const categoryMap = new Map();
    const questionMap = new Map();
    const churnRiskMap = new Map();
    const escalationLevelMap = new Map();
    const customMetricMap = new Map();
    let recordableCalls = 0;
    let eligibleCalls = 0;
    let analyzedCalls = 0;
    let classifiedCalls = 0;
    let awaitingAnalysis = 0;
    let failedCalls = 0;
    let recordableRecordingSeconds = 0;
    let eligibleRecordingSeconds = 0;
    let analyzedRecordingSeconds = 0;
    let escalationNeeded = 0;
    let usageCapturedCalls = 0;
    let openAiSummaryCost = 0;
    let openAiSummaryPricedCalls = 0;
    let openAiSummaryUnpricedCalls = 0;
    let transcriptionCost = 0;
    let transcriptionPricedCalls = 0;
    let transcriptionUnpricedCalls = 0;
    let transcriptionMissingModelCalls = 0;
    let transcriptionPricedSeconds = 0;
    let nonSonioxTranscriptionCost = 0;
    const transcriptionProviderCounts = new Map();
    const openAiSummaryUsage = {
      inputTokens: 0,
      cachedInputTokens: 0,
      billableInputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0
    };

    for (const item of result.calls) {
      const call = (item && item.call) || item;
      if (!canHaveRecording(call)) {
        continue;
      }

      recordableCalls += 1;
      recordableRecordingSeconds += numeric(call.billSec);
      if (!this.isAiEligibleCall(call)) {
        continue;
      }

      eligibleCalls += 1;
      eligibleRecordingSeconds += numeric(call.billSec);
      const callId = call.generalCallId || call.id || call.callId;
      let ai = null;
      if (item && Object.prototype.hasOwnProperty.call(item, "ai")) {
        ai = item.ai;
      } else if (callId && this.callSummaryService) {
        ai = await this.callSummaryService.status(callId);
      }

      if (!ai || ai.status === "not_available" || ai.status === "disabled") {
        awaitingAnalysis += 1;
        continue;
      }

      if (ai.status === "failed") {
        failedCalls += 1;
        continue;
      }

      if (ai.status !== "done") {
        awaitingAnalysis += 1;
        continue;
      }

      analyzedCalls += 1;
      const recordingSeconds = numeric(ai.callDurationSec || call.billSec);
      analyzedRecordingSeconds += recordingSeconds;
      const summary = ai.summary || {};
      const models = ai.models || {};
      const summaryUsage = ai.usage && ai.usage.summary;
      if (summaryUsage) {
        usageCapturedCalls += 1;
        for (const key of Object.keys(openAiSummaryUsage)) {
          openAiSummaryUsage[key] += numeric(summaryUsage[key]);
        }

        const summaryModel =
          models.summary ||
          summary.model ||
          (this.rootConfig.openai && this.rootConfig.openai.summaryModel) ||
          "";
        const summaryPricing = openAiTextPricing(summaryModel);
        const summaryCost = openAiSummaryCostUsd(summaryUsage, summaryPricing);
        if (summaryCost === null) {
          openAiSummaryUnpricedCalls += 1;
        } else {
          openAiSummaryPricedCalls += 1;
          openAiSummaryCost += summaryCost;
        }
      }

      const transcriptionModel = models.transcription || "";
      if (!transcriptionModel) {
        transcriptionMissingModelCalls += 1;
      } else {
        const estimate = transcriptionCostUsd(transcriptionModel, recordingSeconds);
        const provider = estimate.pricing && estimate.pricing.provider;
        if (provider) {
          transcriptionProviderCounts.set(
            provider,
            (transcriptionProviderCounts.get(provider) || 0) + 1
          );
        }

        if (estimate.costUsd === null) {
          transcriptionUnpricedCalls += 1;
        } else {
          transcriptionCost += estimate.costUsd;
          if (provider !== "soniox") {
            nonSonioxTranscriptionCost += estimate.costUsd;
          }
          transcriptionPricedCalls += 1;
          transcriptionPricedSeconds += recordingSeconds;
        }
      }

      for (const question of summary.customerQuestions || []) {
        addCounter(questionMap, question.type, question.label);
      }

      if (summary.escalation && summary.escalation.needed) {
        escalationNeeded += 1;
        addCounter(
          escalationLevelMap,
          summary.escalation.level || "unknown",
          summary.escalation.level || "unknown"
        );
      }

      if (summary.churnRisk && summary.churnRisk.level) {
        addCounter(
          churnRiskMap,
          summary.churnRisk.level,
          summary.churnRisk.level
        );
      }

      for (const metric of (summary.customEvaluation && summary.customEvaluation.metrics) || []) {
        addCustomMetric(customMetricMap, metric);
      }

      const type = String(summary.callType || "").trim();
      if (!type) {
        continue;
      }

      classifiedCalls += 1;
      const current = categoryMap.get(type) || {
        type,
        label: String(summary.callTypeLabel || "").trim(),
        count: 0
      };
      current.count += 1;
      if (!current.label && summary.callTypeLabel) {
        current.label = String(summary.callTypeLabel).trim();
      }
      categoryMap.set(type, current);
    }

    const questionTotal = [...questionMap.values()]
      .reduce((total, item) => total + item.count, 0);
    const questions = [...questionMap.values()]
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
      .map((question) => ({
        ...question,
        percentage: questionTotal
          ? Math.round((question.count / questionTotal) * 1000) / 10
          : 0
      }));
    const categories = [...categoryMap.values()]
      .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
      .map((category) => ({
        ...category,
        percentage: classifiedCalls
          ? Math.round((category.count / classifiedCalls) * 1000) / 10
          : 0
      }));
    const transcriptionProviders = Object.fromEntries(transcriptionProviderCounts);
    const transcriptionProviderEntries = Object.entries(transcriptionProviders);
    const transcriptionProvider = transcriptionProviderEntries.length === 1
      ? transcriptionProviderEntries[0][0]
      : transcriptionProviderEntries.length > 1
        ? "mixed"
        : "";
    const currentSummaryPricing = openAiTextPricing(
      this.rootConfig.openai && this.rootConfig.openai.summaryModel
    );
    const providerCosts = await providerCostsPromise;
    const sonioxActual = providerCosts.soniox && providerCosts.soniox.available &&
      providerCosts.soniox.coverageComplete
      ? providerCosts.soniox
      : null;
    const openAiActual = providerCosts.openAi && providerCosts.openAi.available
      ? providerCosts.openAi
      : null;
    const resolvedTranscriptionCostUsd = sonioxActual
      ? sonioxActual.costUsd + nonSonioxTranscriptionCost
      : transcriptionCost;
    const openAiCostUsd = openAiActual ? openAiActual.costUsd : openAiSummaryCost;
    const totalCostUsd = openAiCostUsd + resolvedTranscriptionCostUsd;

    const analytics = {
      periodDays: options.periodDays || null,
      totalCalls: result.total,
      recordableCalls,
      eligibleCalls,
      analyzedCalls,
      classifiedCalls,
      awaitingAnalysis,
      failedCalls,
      unclassifiedCalls: Math.max(0, analyzedCalls - classifiedCalls),
      topType: categories[0] || null,
      categories,
      topQuestion: questions[0] || null,
      questions,
      escalation: {
        needed: escalationNeeded,
        levels: [...escalationLevelMap.values()]
          .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
      },
      churnRisk: {
        levels: [...churnRiskMap.values()]
          .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
      },
      customMetrics: customMetricAnalytics(customMetricMap),
      usage: {
        recordableRecordingSeconds,
        eligibleRecordingSeconds,
        analyzedRecordingSeconds,
        averageAnalyzedRecordingSeconds: analyzedCalls
          ? Math.round((analyzedRecordingSeconds / analyzedCalls) * 10) / 10
          : 0,
        usageCapturedCalls,
        transcriptionProvider,
        openAiSummary: {
          ...openAiSummaryUsage,
          estimatedCostUsd: roundCost(openAiSummaryCost),
          costUsd: roundCost(openAiCostUsd),
          actualCostUsd: openAiActual ? roundCost(openAiActual.costUsd) : null,
          costSource: openAiActual ? "provider_api" : "local_usage",
          pricedCalls: openAiSummaryPricedCalls,
          unpricedCalls: openAiSummaryUnpricedCalls,
          pricing: currentSummaryPricing,
          pricingByModel: OPENAI_TEXT_PRICING_USD_BY_MODEL
        },
        transcription: {
          provider: transcriptionProvider,
          providers: transcriptionProviders,
          audioHours: Math.round((transcriptionPricedSeconds / 3600) * 100) / 100,
          estimatedCostUsd: transcriptionPricedCalls
            ? roundCost(transcriptionCost)
            : null,
          costUsd: transcriptionPricedCalls || sonioxActual
            ? roundCost(resolvedTranscriptionCostUsd)
            : null,
          actualSonioxCostUsd: sonioxActual
            ? roundCost(sonioxActual.costUsd)
            : null,
          costSource: sonioxActual ? "provider_api" : "duration_estimate",
          pricedCalls: transcriptionPricedCalls,
          unpricedCalls: transcriptionUnpricedCalls,
          missingModelCalls: transcriptionMissingModelCalls,
          pricing: {
            soniox: SONIOX_STT_PRICING_USD,
            openai: OPENAI_TRANSCRIPTION_PRICING_USD_BY_MODEL
          }
        },
        providerCosts: {
          window: providerCosts.window,
          soniox: providerCosts.soniox,
          openAi: providerCosts.openAi
        },
        totalCostUsd: roundCost(totalCostUsd),
        estimatedTotalCostUsd: roundCost(openAiSummaryCost + transcriptionCost)
      }
    };

    return analytics;
  }

  async status() {
    const storeStatus = await this.store.status();

    return {
      enabled: this.enabled,
      configured: Boolean(this.config.enabled),
      running: this.running,
      processStartedAt: this.processStartedAt,
      pollIntervalMillis: this.config.pollIntervalMillis || 60000,
      nextPollAt: this.nextPollAt,
      lastTickStartedAt: this.lastTickStartedAt,
      lastTickFinishedAt: this.lastTickFinishedAt,
      ...storeStatus
    };
  }
}

module.exports = {
  BinotelMonitorService
};
