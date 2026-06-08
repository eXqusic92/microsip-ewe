"use strict";

const { canHaveRecording } = require("./call-summary-service");

const OPENAI_SUMMARY_PRICING_USD = {
  inputPerMillion: 0.20,
  cachedInputPerMillion: 0.02,
  outputPerMillion: 1.25
};
const SONIOX_AUDIO_HOUR_USD = 0.10;

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

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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

function openAiSummaryCostUsd(usage) {
  const inputTokens = numeric(usage.inputTokens);
  const cachedInputTokens = Math.min(inputTokens, numeric(usage.cachedInputTokens));
  const billableInputTokens = Math.max(
    0,
    numeric(usage.billableInputTokens) || inputTokens - cachedInputTokens
  );
  const outputTokens = numeric(usage.outputTokens);

  return (
    (billableInputTokens * OPENAI_SUMMARY_PRICING_USD.inputPerMillion) / 1_000_000 +
    (cachedInputTokens * OPENAI_SUMMARY_PRICING_USD.cachedInputPerMillion) / 1_000_000 +
    (outputTokens * OPENAI_SUMMARY_PRICING_USD.outputPerMillion) / 1_000_000
  );
}

class BinotelMonitorService {
  constructor(config, binotelClient, callSummaryService, store, recordingCache) {
    this.config = config.binotelMonitor || {};
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
      const [incomingCalls, outgoingCalls] = await Promise.all([
        this.binotelClient.allIncomingCallsSince(incomingSince),
        this.binotelClient.allOutgoingCallsSince(outgoingSince)
      ]);
      const calls = [...incomingCalls, ...outgoingCalls].map((call) => ({
        ...call,
        aiEligible: this.isAiEligibleCall(call),
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
        this.callSummaryService.config.openai &&
        this.callSummaryService.config.openai.callMaxAttempts
      ) || 5
    );
    const processingStaleMillis = Math.max(
      30000,
      Number(
        this.callSummaryService.config &&
        this.callSummaryService.config.openai &&
        this.callSummaryService.config.openai.processingStaleMillis
      ) || 10 * 60 * 1000
    );
    const result = await this.store.list({
      limit: Math.max(Number(this.config.processingScanLimit || 0), 2000)
    });
    let queued = 0;

    for (const call of result.calls) {
      if (queued >= availableSlots) {
        break;
      }

      if (!canHaveRecording(call)) {
        continue;
      }

      if (!this.isAiEligibleCall(call)) {
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
      if (existing && existing.status === "done") {
        continue;
      }

      if (existing && existing.status === "processing") {
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

      if (existing && existing.status === "queued") {
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

      if (existing && existing.status === "failed") {
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
    let cached = 0;

    for (const call of result.calls) {
      if (cached >= batchSize) {
        break;
      }

      if (!this.isAiEligibleCall(call) || !canHaveRecording(call)) {
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

  isAiEligibleCall(call) {
    return Boolean(
      call &&
        callTimestamp(call) >= Number(this.aiAnalysisSinceTimestamp || 0)
    );
  }

  async listCalls(options = {}) {
    await this.ensureSyncBoundaries(await this.store.syncState());
    const result = await this.store.list(options);
    const calls = await Promise.all(
      result.calls.map(async (call) => {
        const callId = call.generalCallId || call.id || call.callId;
        const recordable = canHaveRecording(call);
        const aiEligible = this.isAiEligibleCall(call);
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
      calls
    };
  }

  async callDetails(callId) {
    await this.ensureSyncBoundaries(await this.store.syncState());
    const call = await this.store.getCall(callId);
    if (!call) {
      return null;
    }

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
      aiEligible: this.isAiEligibleCall(call),
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
    const call = await this.store.getCall(callId);
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

  async calculateCallTypeAnalytics(options = {}) {
    await this.ensureSyncBoundaries(await this.store.syncState());
    const result = await this.store.list({
      limit: this.config.maxStoredCalls || 5000,
      query: options.query || "",
      since: options.since || null
    });
    const categoryMap = new Map();
    const questionMap = new Map();
    const churnRiskMap = new Map();
    const escalationLevelMap = new Map();
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
    const openAiSummaryUsage = {
      inputTokens: 0,
      cachedInputTokens: 0,
      billableInputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0
    };

    for (const call of result.calls) {
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
      const ai = callId && this.callSummaryService
        ? await this.callSummaryService.status(callId)
        : null;

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
      analyzedRecordingSeconds += numeric(ai.callDurationSec || call.billSec);
      const summary = ai.summary || {};
      const summaryUsage = ai.usage && ai.usage.summary;
      if (summaryUsage) {
        usageCapturedCalls += 1;
        for (const key of Object.keys(openAiSummaryUsage)) {
          openAiSummaryUsage[key] += numeric(summaryUsage[key]);
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
    const openAiSummaryCost = openAiSummaryCostUsd(openAiSummaryUsage);
    const transcriptionProvider =
      (this.callSummaryService && this.callSummaryService.transcriptionProvider) ||
      "";
    const transcriptionCost = transcriptionProvider === "soniox"
      ? (analyzedRecordingSeconds / 3600) * SONIOX_AUDIO_HOUR_USD
      : null;

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
          estimatedCostUsd: Math.round(openAiSummaryCost * 10000) / 10000,
          pricing: OPENAI_SUMMARY_PRICING_USD
        },
        transcription: {
          provider: transcriptionProvider,
          audioHours: Math.round((analyzedRecordingSeconds / 3600) * 100) / 100,
          estimatedCostUsd: transcriptionCost === null
            ? null
            : Math.round(transcriptionCost * 10000) / 10000,
          pricing: transcriptionProvider === "soniox"
            ? { audioHourUsd: SONIOX_AUDIO_HOUR_USD }
            : null
        },
        estimatedTotalCostUsd: transcriptionCost === null
          ? Math.round(openAiSummaryCost * 10000) / 10000
          : Math.round((openAiSummaryCost + transcriptionCost) * 10000) / 10000
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
