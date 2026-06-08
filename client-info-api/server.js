"use strict";

const fs = require("fs");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const config = require("./lib/config");
const { createClientStore } = require("./lib/client-store");
const { normalizePhone } = require("./lib/phone");
const { BinotelMonitorStore } = require("./lib/binotel-monitor-store");
const { BinotelMonitorService } = require("./lib/binotel-monitor-service");
const { RecordingCache } = require("./lib/recording-cache");

const publicDir = path.join(__dirname, "public");
const store = createClientStore(config);
const recordingCache = new RecordingCache(config, store.binotelClient);
if (store.callSummaryService && typeof store.callSummaryService.setRecordingCache === "function") {
  store.callSummaryService.setRecordingCache(recordingCache);
}
const binotelMonitorStore = new BinotelMonitorStore(config.binotelCallsFile, {
  maxCalls: config.binotelMonitor.maxStoredCalls
});
const binotelMonitor = new BinotelMonitorService(
  config,
  store.binotelClient,
  store.callSummaryService,
  binotelMonitorStore,
  recordingCache
);
let shuttingDown = false;

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

function sendFile(res, filename) {
  const filePath = path.join(publicDir, filename);
  const cacheControl = filename === "duma-logo.png" || filename === "duma-logo.svg"
    ? "public, max-age=86400"
    : "no-store";

  fs.readFile(filePath, (error, body) => {
    if (error) {
      sendJson(res, error.code === "ENOENT" ? 404 : 500, {
        ok: false,
        error: "file_not_available"
      });
      return;
    }

    res.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filename)] || "application/octet-stream",
      "Content-Length": body.length,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff"
    });
    res.end(body);
  });
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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 32768) {
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

async function handleRequest(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    sendJson(res, 200, await store.health());
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/") {
    redirect(res, "/client-card");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/client-card") {
    sendFile(res, "index.html");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/calls-monitor") {
    sendFile(res, "index.html");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/call-analytics") {
    sendFile(res, "index.html");
    return;
  }

  if (req.method === "GET" && /^\/calls\/[^/]+$/.test(requestUrl.pathname)) {
    sendFile(res, "index.html");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/styles.css") {
    sendFile(res, "styles.css");
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/app.js") {
    sendFile(res, "app.js");
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

  if (req.method === "GET" && requestUrl.pathname === "/api/client-card") {
    const phone = normalizePhone(requestUrl.searchParams.get("phone"));

    if (!phone) {
      sendJson(res, 400, {
        found: false,
        error: "phone query parameter is required"
      });
      return;
    }

    sendJson(res, 200, await store.getClientCard(phone));
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

  if (req.method === "GET" && requestUrl.pathname === "/api/binotel-monitor/status") {
    sendJson(res, 200, await binotelMonitor.status());
    return;
  }

  if (req.method === "GET" && requestUrl.pathname === "/api/binotel-monitor/calls") {
    const limit = Number(requestUrl.searchParams.get("limit") || 100);
    const offset = Number(requestUrl.searchParams.get("offset") || 0);
    const query = requestUrl.searchParams.get("q") || "";
    sendJson(res, 200, await binotelMonitor.listCalls({ limit, offset, query }));
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

    sendJson(res, 200, call);
    return;
  }

  if (req.method === "POST" && requestUrl.pathname === "/api/binotel-monitor/call/reanalyze") {
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
    const query = requestUrl.searchParams.get("q") || "";
    const requestedPeriod = requestUrl.searchParams.get("period") || "30";
    const periodDays = requestedPeriod === "all"
      ? null
      : [7, 30].includes(Number(requestedPeriod))
        ? Number(requestedPeriod)
        : 30;
    const since = periodDays
      ? new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    sendJson(
      res,
      200,
      await binotelMonitor.callTypeAnalytics({
        query,
        since,
        periodDays
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
      const call = await binotelMonitorStore.getCall(callId);
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

server.listen(config.port, config.host, () => {
  console.log(`client-info-api listening on http://${config.host}:${config.port}`);
  console.log(`client card: ${config.publicBaseUrl}/client-card?phone=380671112233`);
  console.log(`calls monitor: ${config.publicBaseUrl}/calls-monitor`);
  console.log(`data mode: ${store.mode}`);
  binotelMonitor.start();
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
      process.exit(0);
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
