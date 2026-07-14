"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const config = require("./lib/config");
const { AuthService, canEditAiFeedback } = require("./lib/auth");
const { createAppStateDatabase } = require("./lib/app-state-db");
const { createClientStore } = require("./lib/client-store");
const { normalizePhone } = require("./lib/phone");
const { BinotelMonitorService } = require("./lib/binotel-monitor-service");
const { RecordingCache } = require("./lib/recording-cache");
const { TelegramUserService } = require("./lib/telegram-service");
const { ViberService } = require("./lib/viber-service");
const {
  normalizeTranscriptionTerms,
  validateTranscriptionTerms
} = require("./lib/ai-analysis-settings");
const { buildSonioxContext } = require("./lib/soniox-client");

const publicDir = path.join(__dirname, "public");
const animeBundlePath = path.join(
  __dirname,
  "node_modules",
  "animejs",
  "dist",
  "bundles",
  "anime.umd.min.js"
);
const chartBundlePath = path.join(
  __dirname,
  "node_modules",
  "chart.js",
  "dist",
  "chart.umd.min.js"
);
const appStateDatabase = createAppStateDatabase(config);
const authService = new AuthService(config, appStateDatabase.pool, sendJson);
const store = createClientStore(config, appStateDatabase);
const telegramService = new TelegramUserService(
  config,
  appStateDatabase.telegramStore
);
const viberService = new ViberService(config);
const recordingCache = new RecordingCache(
  config,
  store.binotelClient,
  appStateDatabase.recordingCacheStore
);
if (store.callSummaryService && typeof store.callSummaryService.setRecordingCache === "function") {
  store.callSummaryService.setRecordingCache(recordingCache);
}
const binotelMonitorStore = appStateDatabase.binotelMonitorStore;
const binotelMonitor = new BinotelMonitorService(
  config,
  store.binotelClient,
  store.callSummaryService,
  binotelMonitorStore,
  recordingCache
);
let shuttingDown = false;
const SONIOX_TERMS_PREVIEW_PERIOD_DAYS = 30;
const SONIOX_TERMS_PREVIEW_CACHE_MILLIS = 10 * 60 * 1000;
const SONIOX_INPUT_TEXT_USD_PER_MILLION_TOKENS = 3.5;
const sonioxTermsUsagePreviewCache = {
  loadedAt: 0,
  pending: null,
  value: null
};

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8"
};

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data, null, 2);

  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(body);
}

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundedPreviewNumber(value, digits = 6) {
  const parsed = finiteNumber(value);
  return parsed === null ? null : Number(parsed.toFixed(digits));
}

function median(values) {
  const sorted = values
    .map(finiteNumber)
    .filter((value) => value !== null)
    .sort((left, right) => left - right);
  if (!sorted.length) {
    return null;
  }

  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function sonioxAsyncUsageHistory(usageLogs, startTime, endTime) {
  const calls = (Array.isArray(usageLogs) ? usageLogs : [])
    .filter((entry) => String(entry && entry.model || "").startsWith("stt-async"))
    .map((entry) => {
      const inputTextTokens = finiteNumber(entry && entry.input_text_tokens);
      if (inputTextTokens === null) {
        return null;
      }

      const inputTextCost = finiteNumber(entry && entry.input_text_cost_usd);
      return {
        inputTextTokens,
        inputTextCostUsd: inputTextCost === null
          ? inputTextTokens * SONIOX_INPUT_TEXT_USD_PER_MILLION_TOKENS / 1000000
          : inputTextCost,
        totalCostUsd: finiteNumber(entry && entry.cost_usd)
      };
    })
    .filter(Boolean);

  if (!calls.length) {
    return {
      available: false,
      reason: "no_async_usage",
      message: "За останні 30 днів у Soniox ще немає async-транскрипцій для прогнозу.",
      startTime,
      endTime
    };
  }

  const totalCostValues = calls
    .map((call) => call.totalCostUsd)
    .filter((value) => value !== null);
  return {
    available: true,
    source: "soniox_usage_logs",
    startTime,
    endTime,
    calls: calls.length,
    medianInputTextTokens: median(calls.map((call) => call.inputTextTokens)),
    medianInputTextCostUsd: median(calls.map((call) => call.inputTextCostUsd)),
    totalInputTextCostUsd: calls.reduce(
      (total, call) => total + call.inputTextCostUsd,
      0
    ),
    totalCostUsd: totalCostValues.length
      ? totalCostValues.reduce((total, cost) => total + cost, 0)
      : null
  };
}

async function loadSonioxTermsUsageHistory() {
  const now = Date.now();
  if (
    sonioxTermsUsagePreviewCache.value &&
    now - sonioxTermsUsagePreviewCache.loadedAt < SONIOX_TERMS_PREVIEW_CACHE_MILLIS
  ) {
    return sonioxTermsUsagePreviewCache.value;
  }

  if (sonioxTermsUsagePreviewCache.pending) {
    return sonioxTermsUsagePreviewCache.pending;
  }

  sonioxTermsUsagePreviewCache.pending = (async () => {
    const transcriptionClient = store.callSummaryService &&
      store.callSummaryService.transcriptionClient;
    if (
      !transcriptionClient ||
      !transcriptionClient.enabled ||
      typeof transcriptionClient.listUsageLogs !== "function"
    ) {
      return {
        available: false,
        reason: "soniox_not_configured",
        message: "Потрібне активне підключення Soniox, щоб побудувати персональний прогноз."
      };
    }

    const end = new Date();
    const start = new Date(
      end.getTime() - SONIOX_TERMS_PREVIEW_PERIOD_DAYS * 24 * 60 * 60 * 1000
    );

    try {
      const response = await transcriptionClient.listUsageLogs({
        startTime: start.toISOString(),
        endTime: end.toISOString()
      });
      return sonioxAsyncUsageHistory(
        response.usageLogs,
        response.startTime,
        response.endTime
      );
    } catch (error) {
      console.warn(`Soniox terms preview usage unavailable: ${error.message}`);
      return {
        available: false,
        reason: "usage_unavailable",
        message: "Soniox usage зараз недоступний, тому персональний прогноз не побудовано."
      };
    }
  })()
    .then((value) => {
      sonioxTermsUsagePreviewCache.value = value;
      sonioxTermsUsagePreviewCache.loadedAt = Date.now();
      return value;
    })
    .finally(() => {
      sonioxTermsUsagePreviewCache.pending = null;
    });

  return sonioxTermsUsagePreviewCache.pending;
}

function contextUtf8Bytes(context) {
  return context ? Buffer.byteLength(JSON.stringify(context), "utf8") : 0;
}

async function buildSonioxTermsPreview(candidateTerms) {
  const profile = await store.getAiAnalysisSettings();
  const currentSettings = profile && profile.settings ? profile.settings : profile;
  const currentTerms = normalizeTranscriptionTerms(
    currentSettings && currentSettings.transcriptionTerms
  );
  const terms = normalizeTranscriptionTerms(candidateTerms, currentTerms);
  const contextMode = config.soniox && config.soniox.contextMode || "minimal";
  const currentContext = buildSonioxContext(contextMode, currentTerms);
  const candidateContext = buildSonioxContext(contextMode, terms);
  const currentContextUtf8Bytes = contextUtf8Bytes(currentContext);
  const contextBytes = contextUtf8Bytes(candidateContext);
  const base = {
    ok: true,
    contextEnabled: Boolean(candidateContext),
    contextMode,
    currentContextUtf8Bytes,
    contextUtf8Bytes: contextBytes,
    currentTermsCount: currentTerms.length,
    termsCount: terms.length,
    terms
  };

  if (!candidateContext) {
    return {
      ...base,
      usageAvailable: false,
      message: "SONIOX_CONTEXT_MODE=none: цей список зараз не надсилається до Soniox."
    };
  }

  const history = await loadSonioxTermsUsageHistory();
  if (!history.available || !currentContextUtf8Bytes) {
    return {
      ...base,
      usageAvailable: false,
      history,
      message: history.message || "Немає достатньо Soniox usage для прогнозу."
    };
  }

  const byteRatio = contextBytes / currentContextUtf8Bytes;
  const currentInputTextCostUsd = history.medianInputTextCostUsd;
  const estimatedInputTextCostUsd = currentInputTextCostUsd * byteRatio;
  const changeUsdPerCall = estimatedInputTextCostUsd - currentInputTextCostUsd;
  const changeUsdForPeriod = changeUsdPerCall * history.calls;
  const estimatedTotalCostUsd = history.totalCostUsd === null
    ? null
    : history.totalCostUsd + changeUsdForPeriod;

  return {
    ...base,
    usageAvailable: true,
    history: {
      source: history.source,
      startTime: history.startTime,
      endTime: history.endTime,
      calls: history.calls,
      totalCostUsd: roundedPreviewNumber(history.totalCostUsd),
      totalInputTextCostUsd: roundedPreviewNumber(history.totalInputTextCostUsd)
    },
    estimate: {
      inputTextTokensPerCall: roundedPreviewNumber(
        history.medianInputTextTokens * byteRatio,
        2
      ),
      inputTextCostUsdPerCall: roundedPreviewNumber(estimatedInputTextCostUsd),
      changeUsdPerCall: roundedPreviewNumber(changeUsdPerCall),
      changeUsdForPeriod: roundedPreviewNumber(changeUsdForPeriod),
      totalCostUsdForPeriod: roundedPreviewNumber(estimatedTotalCostUsd)
    },
    message:
      "Оцінка за медіанним Soniox input usage за останні 30 днів. Точна сума з’явиться в usage після нової транскрипції."
  };
}

function sendDiskFile(res, filePath, cacheControl = "no-store") {
  fs.readFile(filePath, (error, body) => {
    if (error) {
      sendJson(res, error.code === "ENOENT" ? 404 : 500, {
        ok: false,
        error: "file_not_available"
      });
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff"
    });
    res.end(body);
  });
}

function parseKyivDateBoundary(value, endExclusive = false) {
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }

  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const candidate = dateOnly
    ? `${dateOnly[1]}-${dateOnly[2]}-${dateOnly[3]}T00:00:00+03:00`
    : raw;
  const parsed = new Date(candidate).getTime();
  if (!Number.isFinite(parsed)) {
    return null;
  }

  const time = dateOnly && endExclusive
    ? parsed + 24 * 60 * 60 * 1000
    : parsed;
  return new Date(time).toISOString();
}

function kyivDateKey(timestamp = Date.now()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(timestamp));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return map.year && map.month && map.day ? `${map.year}-${map.month}-${map.day}` : "";
}

function callStatsPeriod(searchParams) {
  const period = String(searchParams.get("period") || "30").trim();
  const customFrom = parseKyivDateBoundary(searchParams.get("from"));
  const customTo = parseKyivDateBoundary(searchParams.get("to"), true);
  const now = Date.now();

  if (period === "custom" && customFrom && customTo) {
    return {
      periodKey: "custom",
      from: customFrom,
      to: customTo
    };
  }

  if (period === "today") {
    return {
      periodKey: period,
      from: parseKyivDateBoundary(kyivDateKey(now)),
      to: null
    };
  }

  if (period === "all") {
    return {
      periodKey: period,
      from: null,
      to: null
    };
  }

  const days = [7, 30, 90, 180].includes(Number(period)) ? Number(period) : 30;
  return {
    periodKey: String(days),
    from: new Date(now - days * 24 * 60 * 60 * 1000).toISOString(),
    to: null
  };
}

function sendFile(res, filename) {
  const cacheControl = filename === "duma-logo.png" || filename === "duma-logo.svg"
    ? "public, max-age=86400"
    : "no-store";

  sendDiskFile(res, path.join(publicDir, filename), cacheControl);
}

function safeHeaderFilename(filename) {
  return String(filename || "recording.mp3").replace(/["\r\n]/g, "_");
}

function parseRange(rangeHeader, size) {
  const match = String(rangeHeader || "").match(/^bytes=(\d*)-(\d*)$/);
  if (!match || !size) {
    return null;
  }

  let start;
  let end;

  if (match[1] === "" && match[2] === "") {
    return null;
  }

  if (match[1] === "") {
    const suffixLength = Number(match[2]);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
      return null;
    }
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Number(match[2]);
  }

  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start < 0 ||
    end < start ||
    start >= size
  ) {
    return null;
  }

  return {
    start,
    end: Math.min(end, size - 1)
  };
}

function sendAudio(req, res, audio) {
  const size = audio.bytes.length;
  const contentType = audio.contentType || "audio/mpeg";
  const filename = safeHeaderFilename(audio.filename);
  const baseHeaders = {
    "Content-Type": contentType,
    "Cache-Control": "private, max-age=86400",
    "Content-Disposition": `inline; filename="${filename}"`,
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff"
  };
  const rangeHeader = req.headers.range;

  if (rangeHeader) {
    const range = parseRange(rangeHeader, size);
    if (!range) {
      res.writeHead(416, {
        ...baseHeaders,
        "Content-Range": `bytes */${size}`
      });
      res.end();
      return;
    }

    const chunk = audio.bytes.subarray(range.start, range.end + 1);
    res.writeHead(206, {
      ...baseHeaders,
      "Content-Length": chunk.length,
      "Content-Range": `bytes ${range.start}-${range.end}/${size}`
    });
    res.end(chunk);
    return;
  }

  res.writeHead(200, {
    ...baseHeaders,
    "Content-Length": size
  });
  res.end(audio.bytes);
}

function sendTelegramMedia(res, media) {
  const bytes = media && media.bytes ? media.bytes : Buffer.alloc(0);
  const contentType = media && media.contentType
    ? media.contentType
    : "application/octet-stream";
  const filename = safeHeaderFilename((media && media.filename) || "telegram-media");
  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "private, max-age=86400",
    "Content-Disposition": `inline; filename="${filename}"`,
    "Content-Length": bytes.length,
    "X-Content-Type-Options": "nosniff"
  });
  res.end(bytes);
}

function readJsonBody(req, maxBytes = 32768) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxBytes) {
        reject(new Error("request_body_too_large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("invalid_json"));
      }
    });

    req.on("error", reject);
  });
}

function redirect(res, location) {
  res.writeHead(302, {
    Location: location,
    "Cache-Control": "no-store"
  });
  res.end();
}

function safeNextPath(requestUrl) {
  const next = `${requestUrl.pathname}${requestUrl.search || ""}`;
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/client-card";
}

function loginRedirect(res, requestUrl) {
  redirect(res, `/login?next=${encodeURIComponent(safeNextPath(requestUrl))}`);
}

function safeLoginTarget(value) {
  const target = String(value || "").trim();
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return "/client-card";
  }
  if (target.startsWith("/login")) {
    return "/client-card";
  }
  return target;
}

function callVisibilityForAuth(auth) {
  const ordinaryUser = Boolean(
    auth && auth.user && auth.user.role === "user"
  );
  return {
    restrictToAssignedInternalNumbers: ordinaryUser,
    assignedInternalNumbers: ordinaryUser
      ? auth.user.binotelManagerNumbers || []
      : []
  };
}

function sendAiFeedbackForbidden(res) {
  sendJson(res, 403, {
    ok: false,
    error: "ai_feedback_editor_required",
    message: "AI-правки доступні лише керівнику відділу та адміністратору."
  });
}

function sendReadOnlyUserForbidden(res) {
  sendJson(res, 403, {
    ok: false,
    error: "read_only_user",
    message: "Звичайний користувач має доступ лише для перегляду."
  });
}

function canViewTeamAnalytics(user) {
  return Boolean(
    user && ["admin", "department_head"].includes(user.role)
  );
}

function sendTeamAnalyticsForbidden(res) {
  sendJson(res, 403, {
    ok: false,
    error: "team_analytics_required",
    message: "Статистика та AI-аналітика доступні лише керівнику відділу й адміністратору."
  });
}

async function requirePageAuth(req, res, requestUrl) {
  const auth = await authService.getRequestAuth(req);
  if (!auth) {
    loginRedirect(res, requestUrl);
    return null;
  }
  return auth;
}

async function requirePageAdmin(req, res, requestUrl) {
  const auth = await requirePageAuth(req, res, requestUrl);
  if (!auth) {
    return null;
  }
  if ((auth.user && auth.user.role) !== "admin") {
    redirect(res, "/client-card");
    return null;
  }
  return auth;
}

async function requirePageTeamAnalytics(req, res, requestUrl) {
  const auth = await requirePageAuth(req, res, requestUrl);
  if (!auth) {
    return null;
  }
  if (!canViewTeamAnalytics(auth.user)) {
    redirect(res, "/client-card");
    return null;
  }
  return auth;
}

async function handleRequest(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    sendJson(res, 200, await store.health());
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/auth/login") {
    try {
      await authService.handleLogin(req, res, readJsonBody);
    } catch (error) {
      const statusCode = ["invalid_json", "request_body_too_large"].includes(
        error.message
      )
        ? 400
        : 500;
      sendJson(res, statusCode, {
        ok: false,
        error: statusCode === 400 ? error.message : "login_failed"
      });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/login") {
    const auth = await authService.getRequestAuth(req);
    if (auth) {
      redirect(res, safeLoginTarget(requestUrl.searchParams.get("next")));
      return;
    }
    sendFile(res, "login.html");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/styles.css") {
    sendFile(res, "styles.css");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/login.js") {
    sendFile(res, "login.js");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/duma-logo.png") {
    sendFile(res, "duma-logo.png");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/duma-logo.svg") {
    sendFile(res, "duma-logo.svg");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/vendor/anime.umd.min.js") {
    sendDiskFile(res, animeBundlePath, "public, max-age=86400");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/vendor/chart.umd.min.js") {
    sendDiskFile(res, chartBundlePath, "public, max-age=86400");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/") {
    if (!(await requirePageAuth(req, res, requestUrl))) {
      return;
    }
    redirect(res, "/client-card");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/client-card") {
    if (!(await requirePageAuth(req, res, requestUrl))) {
      return;
    }
    sendFile(res, "index.html");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/calls-monitor") {
    if (!(await requirePageAuth(req, res, requestUrl))) {
      return;
    }
    sendFile(res, "index.html");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/call-stats") {
    if (!(await requirePageTeamAnalytics(req, res, requestUrl))) {
      return;
    }
    sendFile(res, "index.html");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/call-analytics") {
    if (!(await requirePageTeamAnalytics(req, res, requestUrl))) {
      return;
    }
    sendFile(res, "index.html");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/ai-settings") {
    if (!(await requirePageAdmin(req, res, requestUrl))) {
      return;
    }
    sendFile(res, "index.html");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/admin") {
    if (!(await requirePageAdmin(req, res, requestUrl))) {
      return;
    }
    sendFile(res, "index.html");
    return;
  }

  if (req.method === "GET" && /^\/calls\/[^/]+$/.test(requestUrl.pathname)) {
    if (!(await requirePageAuth(req, res, requestUrl))) {
      return;
    }
    sendFile(res, "index.html");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/app.js") {
    if (!(await requirePageAuth(req, res, requestUrl))) {
      return;
    }
    sendFile(res, "app.js");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/auth/me") {
    await authService.handleMe(req, res);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/auth/logout") {
    await authService.handleLogout(req, res);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/auth/change-password") {
    await authService.handleChangePassword(req, res, readJsonBody);
    return;
  }

  if (requestUrl.pathname === "/api/admin/users") {
    await authService.handleAdminUsers(req, res, readJsonBody);
    return;
  }

  if (/^\/api\/admin\/users\/[^/]+$/.test(requestUrl.pathname)) {
    await authService.handleAdminUser(
      req,
      res,
      readJsonBody,
      decodeURIComponent(requestUrl.pathname.split("/").pop() || "")
    );
    return;
  }

  if (requestUrl.pathname === "/api/admin/binotel-managers") {
    const auth = await authService.requireAdmin(req, res);
    if (!auth) {
      return;
    }

    if (req.method !== "GET") {
      res.writeHead(405, { Allow: "GET" });
      res.end("Method not allowed");
      return;
    }

    const result = await binotelMonitorStore.analysisInternalNumbers();
    sendJson(res, 200, {
      ok: true,
      managers: result.numbers
        .filter((item) => item.enabled !== false)
        .filter((item) => item.employeeName || item.customLabel)
        .map((item) => ({
          number: item.number,
          label: item.label,
          employeeName: item.employeeName,
          pbxName: item.pbxName
        }))
    });
    return;
  }

  if (requestUrl.pathname === "/api/admin/analysis-internal-numbers") {
    const auth = await authService.requireAdmin(req, res);
    if (!auth) {
      return;
    }

    try {
      if (req.method === "GET") {
        sendJson(res, 200, {
          ok: true,
          ...(await binotelMonitorStore.analysisInternalNumbers())
        });
        return;
      }

      if (req.method === "PUT") {
        const payload = await readJsonBody(req, 128 * 1024);
        const numbers = Array.isArray(payload.numbers) ? payload.numbers : [];
        const result = await binotelMonitorStore.updateAnalysisInternalNumbers(numbers);
        if (typeof binotelMonitor.clearAnalyticsCache === "function") {
          binotelMonitor.clearAnalyticsCache();
        }
        sendJson(res, 200, {
          ok: true,
          ...result
        });
        return;
      }

      res.writeHead(405, { Allow: "GET, PUT" });
      res.end("Method not allowed");
    } catch (error) {
      const statusCode = ["invalid_json", "request_body_too_large"].includes(
        error.message
      )
        ? 400
        : 500;
      sendJson(res, statusCode, {
        ok: false,
        error: statusCode === 400 ? error.message : "analysis_numbers_failed"
      });
    }
    return;
  }

  if (requestUrl.pathname === "/api/admin/telegram/accounts") {
    const auth = await authService.requireAdmin(req, res);
    if (!auth) {
      return;
    }

    try {
      if (req.method === "GET") {
        sendJson(res, 200, await telegramService.adminAccounts());
        return;
      }

      if (req.method === "POST") {
        const payload = await readJsonBody(req);
        sendJson(res, 201, await telegramService.createAccount(payload));
        return;
      }

      res.writeHead(405, { Allow: "GET, POST" });
      res.end("Method not allowed");
    } catch (error) {
      const statusCode = [
        "invalid_json",
        "request_body_too_large",
        "telegram_phone_invalid"
      ].includes(error.message)
        ? 400
        : 500;
      sendJson(res, statusCode, {
        ok: false,
        error: statusCode === 400 ? error.message : "telegram_accounts_failed"
      });
    }
    return;
  }

  const telegramAdminActionMatch = requestUrl.pathname.match(
    /^\/api\/admin\/telegram\/accounts\/([^/]+)\/(send-code|confirm)$/
  );
  if (telegramAdminActionMatch) {
    const auth = await authService.requireAdmin(req, res);
    if (!auth) {
      return;
    }

    try {
      if (req.method !== "POST") {
        res.writeHead(405, { Allow: "POST" });
        res.end("Method not allowed");
        return;
      }
      const accountId = decodeURIComponent(telegramAdminActionMatch[1] || "");
      const action = telegramAdminActionMatch[2];
      const payload = await readJsonBody(req);
      const result = action === "send-code"
        ? await telegramService.sendCode(accountId, payload)
        : await telegramService.confirmCode(accountId, payload);
      sendJson(res, result.ok ? 200 : 422, result);
    } catch (error) {
      const statusCode = ["invalid_json", "request_body_too_large"].includes(
        error.message
      )
        ? 400
        : 500;
      sendJson(res, statusCode, {
        ok: false,
        error: statusCode === 400 ? error.message : "telegram_login_failed"
      });
    }
    return;
  }

  const telegramAdminAccountMatch = requestUrl.pathname.match(
    /^\/api\/admin\/telegram\/accounts\/([^/]+)$/
  );
  if (telegramAdminAccountMatch) {
    const auth = await authService.requireAdmin(req, res);
    if (!auth) {
      return;
    }

    try {
      const accountId = decodeURIComponent(telegramAdminAccountMatch[1] || "");
      if (req.method === "PATCH") {
        const payload = await readJsonBody(req);
        const result = await telegramService.updateAccount(accountId, payload);
        sendJson(res, result.ok ? 200 : 404, result);
        return;
      }

      if (req.method === "DELETE") {
        const result = await telegramService.deleteAccount(accountId);
        sendJson(res, result.ok ? 200 : 404, result);
        return;
      }

      res.writeHead(405, { Allow: "PATCH, DELETE" });
      res.end("Method not allowed");
    } catch (error) {
      const statusCode = ["invalid_json", "request_body_too_large"].includes(
        error.message
      )
        ? 400
        : 500;
      sendJson(res, statusCode, {
        ok: false,
        error: statusCode === 400 ? error.message : "telegram_account_failed"
      });
    }
    return;
  }

  let requestAuth = null;
  if (
    requestUrl.pathname.startsWith("/api/") ||
    requestUrl.pathname === "/client"
  ) {
    requestAuth = await authService.requireAuth(req, res);
    if (!requestAuth) {
      return;
    }
  }

  if (
    requestAuth &&
    requestAuth.user.role === "user" &&
    !["GET", "HEAD", "OPTIONS"].includes(req.method)
  ) {
    sendReadOnlyUserForbidden(res);
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/client-card") {
    const phone = normalizePhone(requestUrl.searchParams.get("phone"));

    if (!phone) {
      sendJson(res, 400, {
        found: false,
        error: "phone query parameter is required"
      });
      return;
    }

    const fast = ["1", "true", "yes"].includes(
      String(requestUrl.searchParams.get("fast") || "").toLowerCase()
    );
    sendJson(
      res,
      200,
      fast ? await store.getClientCardBase(phone) : await store.getClientCard(phone)
    );
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/client-card-calls") {
    const phone = normalizePhone(requestUrl.searchParams.get("phone"));

    if (!phone) {
      sendJson(res, 400, {
        error: "phone query parameter is required"
      });
      return;
    }

    sendJson(res, 200, await store.getClientCardCalls(phone));
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/client-card-trip-assignments") {
    sendJson(
      res,
      200,
      await store.getTripAssignmentsForTripIds(requestUrl.searchParams.get("tripIds"))
    );
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/telegram/conversation") {
    try {
      sendJson(
        res,
        200,
        await telegramService.conversation({
          phone: requestUrl.searchParams.get("phone"),
          accountId: requestUrl.searchParams.get("accountId"),
          force: requestUrl.searchParams.get("force"),
          limit: requestUrl.searchParams.get("limit")
        })
      );
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error.message || "telegram_conversation_failed"
      });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/viber/conversation") {
    try {
      sendJson(
        res,
        200,
        await viberService.conversation({
          phone: requestUrl.searchParams.get("phone"),
          limit: requestUrl.searchParams.get("limit")
        })
      );
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error.message || "viber_conversation_failed"
      });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/telegram/messages") {
    try {
      const payload = await readJsonBody(req, 16 * 1024);
      const result = await telegramService.sendMessage(payload);
      sendJson(res, result.ok ? 201 : 422, result);
    } catch (error) {
      const statusCode = ["invalid_json", "request_body_too_large"].includes(
        error.message
      )
        ? 400
        : 500;
      sendJson(res, statusCode, {
        ok: false,
        error: statusCode === 400 ? error.message : "telegram_message_failed"
      });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/telegram/media") {
    try {
      const result = await telegramService.media({
        phone: requestUrl.searchParams.get("phone"),
        accountId: requestUrl.searchParams.get("accountId"),
        messageId: requestUrl.searchParams.get("messageId")
      });
      if (!result.ok) {
        sendJson(res, 404, result);
        return;
      }
      sendTelegramMedia(res, result);
    } catch (error) {
      sendJson(res, 500, {
        ok: false,
        error: error.message || "telegram_media_failed"
      });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/client-tickets") {
    const phone = normalizePhone(requestUrl.searchParams.get("phone"));

    if (!phone) {
      sendJson(res, 400, {
        found: false,
        error: "phone query parameter is required"
      });
      return;
    }

    sendJson(res, 200, await store.getTicketCard(phone));
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/call-summary") {
    const callId = String(requestUrl.searchParams.get("callId") || "").trim();
    if (callId) {
      sendJson(res, 200, await store.getCallSummaryByCallId(callId));
      return;
    }

    const phone = normalizePhone(requestUrl.searchParams.get("phone"));

    if (!phone) {
      sendJson(res, 400, {
        status: "failed",
        error: "phone or callId query parameter is required"
      });
      return;
    }

    sendJson(res, 200, await store.getCallSummary(phone));
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/ai-analysis-settings") {
    sendJson(res, 200, await store.getAiAnalysisSettings());
    return;
  }

  if (
    req.method === "POST" &&
    requestUrl.pathname === "/api/ai-analysis-settings/transcription-terms-preview"
  ) {
    if (!requestAuth || requestAuth.user.role !== "admin") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return;
    }
    try {
      const payload = await readJsonBody(req, 256 * 1024);
      const hasTerms = payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        Object.prototype.hasOwnProperty.call(payload, "terms");
      const terms = hasTerms ? payload.terms : undefined;
      validateTranscriptionTerms(terms);
      sendJson(res, 200, await buildSonioxTermsPreview(terms));
    } catch (error) {
      const statusCode = ["invalid_json", "request_body_too_large"].includes(
        error.message
      )
        ? 400
        : 422;
      sendJson(res, statusCode, {
        ok: false,
        error: error.message
      });
    }
    return;
  }

  if (req.method === "PUT" && requestUrl.pathname === "/api/ai-analysis-settings") {
    if (!requestAuth || requestAuth.user.role !== "admin") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return;
    }
    try {
      const payload = await readJsonBody(req, 1024 * 1024);
      const settings = payload && payload.settings ? payload.settings : payload;
      validateTranscriptionTerms(settings && settings.transcriptionTerms);
      sendJson(res, 200, await store.updateAiAnalysisSettings(settings));
    } catch (error) {
      const statusCode = ["invalid_json", "request_body_too_large"].includes(
        error.message
      )
        ? 400
        : 422;
      sendJson(res, statusCode, {
        ok: false,
        error: error.message
      });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/ai-analysis-settings/reset") {
    if (!requestAuth || requestAuth.user.role !== "admin") {
      sendJson(res, 403, { ok: false, error: "admin_required" });
      return;
    }
    sendJson(res, 200, await store.resetAiAnalysisSettings());
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/binotel-monitor/status") {
    sendJson(res, 200, await binotelMonitor.status());
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/binotel-monitor/calls") {
    const limit = Number(requestUrl.searchParams.get("limit") || 100);
    const offset = Number(requestUrl.searchParams.get("offset") || 0);
    const query = requestUrl.searchParams.get("q") || "";
    const callType = requestUrl.searchParams.get("callType") || "";
    const problem = requestUrl.searchParams.get("problem") || "";
    const visibility = callVisibilityForAuth(requestAuth);
    const result = await binotelMonitor.listCalls({
      limit,
      offset,
      query,
      callType,
      problem,
      ...visibility
    });
    sendJson(res, 200, {
      ...result,
      restrictedToOwnCalls: visibility.restrictToAssignedInternalNumbers,
      managerAssignmentMissing: Boolean(
        visibility.restrictToAssignedInternalNumbers &&
        !visibility.assignedInternalNumbers.length
      )
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/binotel-monitor/call") {
    const callId = String(requestUrl.searchParams.get("callId") || "").trim();
    if (!callId) {
      sendJson(res, 400, {
        ok: false,
        error: "callId query parameter is required"
      });
      return;
    }

    const call = await binotelMonitor.callDetails(callId);
    if (!call) {
      sendJson(res, 404, {
        ok: false,
        error: "call was not found in the local history"
      });
      return;
    }

    if (call.ai && appStateDatabase.aiMetricFeedbackStore) {
      const summaryCallId = String(
        call.ai.callId ||
        call.ai.generalCallId ||
        call.generalCallId ||
        call.id ||
        callId
      ).trim();
      call.ai.metricFeedback = summaryCallId
        ? await appStateDatabase.aiMetricFeedbackStore.listForCall(summaryCallId)
        : [];
    }

    sendJson(res, 200, call);
    return;
  }

  if (requestUrl.pathname === "/api/ai-metric-feedback") {
    const auth = requestAuth;

    try {
      if (["POST", "DELETE"].includes(req.method) && !canEditAiFeedback(auth.user)) {
        sendAiFeedbackForbidden(res);
        return;
      }

      if (req.method === "POST") {
        const payload = await readJsonBody(req, 64 * 1024);
        const feedback = await appStateDatabase.aiMetricFeedbackStore.save(
          payload,
          auth.user
        );
        sendJson(res, 200, {
          ok: true,
          feedback,
          items: await appStateDatabase.aiMetricFeedbackStore.listForCall(feedback.callId)
        });
        return;
      }

      if (req.method === "GET") {
        const callId = String(requestUrl.searchParams.get("callId") || "").trim();
        if (!callId) {
          sendJson(res, 400, {
            ok: false,
            error: "callId query parameter is required"
          });
          return;
        }
        sendJson(res, 200, {
          ok: true,
          items: await appStateDatabase.aiMetricFeedbackStore.listForCall(callId)
        });
        return;
      }

      if (req.method === "DELETE") {
        const callId = String(requestUrl.searchParams.get("callId") || "").trim();
        const metricKey = String(requestUrl.searchParams.get("metricKey") || "").trim();
        const deleted = await appStateDatabase.aiMetricFeedbackStore.deleteForMetric({
          callId,
          metricKey
        });
        sendJson(res, 200, {
          ok: true,
          deleted,
          items: await appStateDatabase.aiMetricFeedbackStore.listForCall(callId)
        });
        return;
      }

      res.writeHead(405, { Allow: "GET, POST, DELETE" });
      res.end("Method not allowed");
    } catch (error) {
      const statusCode = ["invalid_json", "request_body_too_large"].includes(
        error.message
      )
        ? 400
        : Number(error.statusCode) || 500;
      sendJson(res, statusCode, {
        ok: false,
        error: error.publicError || error.message || "metric_feedback_failed"
      });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/admin/ai-metric-feedback") {
    const auth = await authService.requireAdmin(req, res);
    if (!auth) {
      return;
    }

    try {
      sendJson(
        res,
        200,
        {
          ok: true,
          ...(await appStateDatabase.aiMetricFeedbackStore.listRecent({
            limit: requestUrl.searchParams.get("limit") || 100,
            offset: requestUrl.searchParams.get("offset") || 0
          }))
        }
      );
    } catch (error) {
      sendJson(res, Number(error.statusCode) || 500, {
        ok: false,
        error: error.publicError || error.message || "metric_feedback_admin_failed"
      });
    }
    return;
  }

  const metricFeedbackAdminItemMatch = requestUrl.pathname.match(
    /^\/api\/admin\/ai-metric-feedback\/([^/]+)$/
  );
  if (metricFeedbackAdminItemMatch) {
    const auth = await authService.requireAdmin(req, res);
    if (!auth) {
      return;
    }

    try {
      if (req.method !== "DELETE") {
        res.writeHead(405, { Allow: "DELETE" });
        res.end("Method not allowed");
        return;
      }
      const feedbackId = decodeURIComponent(metricFeedbackAdminItemMatch[1] || "");
      sendJson(res, 200, {
        ok: true,
        deleted: await appStateDatabase.aiMetricFeedbackStore.deleteById(feedbackId)
      });
    } catch (error) {
      sendJson(res, Number(error.statusCode) || 500, {
        ok: false,
        error: error.publicError || error.message || "metric_feedback_delete_failed"
      });
    }
    return;
  }

  const metricFeedbackPromptMatch = requestUrl.pathname.match(
    /^\/api\/admin\/ai-metric-feedback\/([^/]+)\/prompt-update$/
  );
  if (metricFeedbackPromptMatch) {
    const auth = await authService.requireAdmin(req, res);
    if (!auth) {
      return;
    }

    try {
      const feedbackId = decodeURIComponent(metricFeedbackPromptMatch[1] || "");
      if (req.method === "GET") {
        const preview = await appStateDatabase.aiMetricFeedbackStore.promptUpdatePreview(feedbackId);
        const regenerate = ["1", "true", "yes"].includes(
          String(requestUrl.searchParams.get("regenerate") || "").trim().toLowerCase()
        );
        if (!regenerate && preview.promptUpdateDraft && preview.promptUpdateDraft.proposal) {
          sendJson(res, 200, {
            ok: true,
            ...preview,
            proposal: preview.promptUpdateDraft.proposal
          });
          return;
        }

        const proposal = await store.openAiClient.rewriteMetricPrompt(preview);
        const cachedDraft = await appStateDatabase.aiMetricFeedbackStore.savePromptUpdateDraft(
          feedbackId,
          proposal,
          auth.user
        );
        sendJson(res, 200, {
          ok: true,
          ...cachedDraft,
          proposal: cachedDraft.proposal
        });
        return;
      }

      if (req.method === "POST") {
        const payload = await readJsonBody(req, 64 * 1024);
        sendJson(res, 200, {
          ok: true,
          ...(await appStateDatabase.aiMetricFeedbackStore.applyPromptUpdate(
            feedbackId,
            payload,
            auth.user
          ))
        });
        return;
      }

      res.writeHead(405, { Allow: "GET, POST" });
      res.end("Method not allowed");
    } catch (error) {
      const statusCode = ["invalid_json", "request_body_too_large"].includes(
        error.message
      )
        ? 400
        : Number(error.statusCode) || 500;
      sendJson(res, statusCode, {
        ok: false,
        error: error.publicError || error.message || "metric_feedback_prompt_update_failed"
      });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/binotel-monitor/call/reanalyze") {
    if (!requestAuth || !canEditAiFeedback(requestAuth.user)) {
      sendAiFeedbackForbidden(res);
      return;
    }
    try {
      const payload = await readJsonBody(req);
      const callId = String(
        payload.callId ||
        requestUrl.searchParams.get("callId") ||
        ""
      ).trim();

      if (!callId) {
        sendJson(res, 400, {
          ok: false,
          error: "callId is required"
        });
        return;
      }

      const ai = await binotelMonitor.reanalyzeCall(callId);
      if (!ai) {
        sendJson(res, 404, {
          ok: false,
          error: "call was not found in the local history"
        });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        ai
      });
    } catch (error) {
      sendJson(res, 503, {
        ok: false,
        error: error.message
      });
    }
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/binotel-monitor/analytics") {
    if (!canViewTeamAnalytics(requestAuth && requestAuth.user)) {
      sendTeamAnalyticsForbidden(res);
      return;
    }
    const query = requestUrl.searchParams.get("q") || "";
    const requestedPeriod = requestUrl.searchParams.get("period") || "30";
    const utcNow = new Date();
    const utcTodayStart = new Date(Date.UTC(
      utcNow.getUTCFullYear(),
      utcNow.getUTCMonth(),
      utcNow.getUTCDate()
    )).toISOString();
    const periodDays = requestedPeriod === "all"
      ? null
      : requestedPeriod === "today"
        ? 1
        : [7, 30].includes(Number(requestedPeriod))
          ? Number(requestedPeriod)
          : 30;
    const since = requestedPeriod === "today"
      ? utcTodayStart
      : periodDays
        ? new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString()
        : null;

    const visibility = callVisibilityForAuth(requestAuth);
    const [analytics, managerRating] = await Promise.all([
      binotelMonitor.callTypeAnalytics({
        query,
        since,
        periodDays,
        ...visibility
      }),
      binotelMonitor.managerRating({
        query,
        since,
        periodDays,
        ...visibility
      })
    ]);

    sendJson(res, 200, {
      ...analytics,
      managerRating
    });
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/binotel-monitor/call-statistics") {
    if (!canViewTeamAnalytics(requestAuth && requestAuth.user)) {
      sendTeamAnalyticsForbidden(res);
      return;
    }
    const query = requestUrl.searchParams.get("q") || "";
    const period = callStatsPeriod(requestUrl.searchParams);

    if (
      requestUrl.searchParams.get("period") === "custom" &&
      (!period.from || !period.to || new Date(period.to).getTime() <= new Date(period.from).getTime())
    ) {
      sendJson(res, 400, {
        ok: false,
        error: "Некоректний період аналітики дзвінків."
      });
      return;
    }

    const visibility = callVisibilityForAuth(requestAuth);
    sendJson(
      res,
      200,
      await binotelMonitor.callStatistics({
        query,
        ...period,
        timezone: "Europe/Kyiv",
        ...visibility
      })
    );
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/binotel-monitor/recording") {
    const callId = String(requestUrl.searchParams.get("callId") || "").trim();

    if (!callId) {
      sendJson(res, 400, {
        ok: false,
        error: "callId query parameter is required"
      });
      return;
    }

    try {
      const call = await binotelMonitor.visibleCall(callId);
      if (!call) {
        sendJson(res, 404, {
          ok: false,
          error: "recording is not available in the local call history"
        });
        return;
      }

      sendAudio(req, res, await recordingCache.getAudio(callId));
    } catch (error) {
      sendJson(res, 503, {
        ok: false,
        error: error.message
      });
    }
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/client-notes") {
    try {
      const payload = await readJsonBody(req);
      const phone = normalizePhone(payload.phone);
      const text = String(payload.text || "").trim();

      if (!phone || !text) {
        sendJson(res, 400, {
          ok: false,
          error: "phone and text are required"
        });
        return;
      }

      if (text.length > 2000) {
        sendJson(res, 400, {
          ok: false,
          error: "note is too long"
        });
        return;
      }

      sendJson(res, 201, {
        ok: true,
        note: await store.addNote(phone, text)
      });
    } catch (error) {
      const statusCode = ["invalid_json", "request_body_too_large"].includes(
        error.message
      )
        ? 400
        : 500;
      sendJson(res, statusCode, {
        ok: false,
        error: error.message
      });
    }
    return;
  }

  const clientNoteMatch = requestUrl.pathname.match(/^\/api\/client-notes\/([^/]+)$/);
  if (clientNoteMatch && (req.method === "PATCH" || req.method === "DELETE")) {
    const noteId = decodeURIComponent(clientNoteMatch[1] || "").trim();

    if (!noteId) {
      sendJson(res, 400, {
        ok: false,
        error: "note id is required"
      });
      return;
    }

    try {
      if (req.method === "DELETE") {
        const deleted = await store.deleteNote(noteId);
        if (!deleted) {
          sendJson(res, 404, {
            ok: false,
            error: "note not found"
          });
          return;
        }

        sendJson(res, 200, {
          ok: true,
          note: deleted
        });
        return;
      }

      const payload = await readJsonBody(req);
      const text = String(payload.text || "").trim();

      if (!text) {
        sendJson(res, 400, {
          ok: false,
          error: "text is required"
        });
        return;
      }

      if (text.length > 2000) {
        sendJson(res, 400, {
          ok: false,
          error: "note is too long"
        });
        return;
      }

      const note = await store.updateNote(noteId, text);
      if (!note) {
        sendJson(res, 404, {
          ok: false,
          error: "note not found"
        });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        note
      });
    } catch (error) {
      const statusCode = ["invalid_json", "request_body_too_large"].includes(
        error.message
      )
        ? 400
        : 500;
      sendJson(res, statusCode, {
        ok: false,
        error: error.message
      });
    }
    return;
  }

  // Compatibility endpoint for the existing MicroSIP JSON integration.
  if (req.method === "GET" && requestUrl.pathname === "/client") {
    const phone = normalizePhone(requestUrl.searchParams.get("phone"));

    if (!phone) {
      sendJson(res, 400, {
        found: false,
        error: "phone query parameter is required"
      });
      return;
    }

    const card = await store.getClientCard(phone);
    sendJson(res, 200, {
      found: card.found,
      phone: card.contact.phone,
      name: card.contact.primaryName,
      company: "",
      status: card.stats.paidTickets > 0 ? "Клієнт" : "Новий контакт",
      manager: "",
      balance: "0.00",
      note: card.found
        ? `${card.stats.orders} замовлень, ${card.stats.tickets} квитків`
        : "Замовлень за цим номером не знайдено.",
      cardUrl: `${config.publicBaseUrl}/client-card?phone=${encodeURIComponent(card.contact.phoneDigits)}`
    });
    return;
  }

  sendJson(res, 404, {
    found: false,
    error: "not found"
  });
}

const server = http.createServer((req, res) => {
  if (shuttingDown) {
    sendJson(res, 503, {
      found: false,
      error: "server_is_shutting_down"
    });
    return;
  }

  handleRequest(req, res).catch((error) => {
    console.error(error);
    sendJson(res, 500, {
      found: false,
      error: "internal_server_error"
    });
  });
});

async function start() {
  await authService.ensureReady();
  server.listen(config.port, config.host, () => {
    console.log(`client-info-api listening on http://${config.host}:${config.port}`);
    console.log(`client card: ${config.publicBaseUrl}/client-card?phone=380671112233`);
    console.log(`calls monitor: ${config.publicBaseUrl}/calls-monitor`);
    console.log(`data mode: ${store.mode}`);
    binotelMonitor.start();
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

function shutdown() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log("client-info-api shutting down...");

  server.close(async () => {
    try {
      binotelMonitor.close();
      await store.close();
      if (appStateDatabase) {
        await appStateDatabase.close();
      }
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
