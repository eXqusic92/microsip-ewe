"use strict";

const { lookupVariants } = require("./phone");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DISPOSITION_LABELS = {
  ANSWER: "Успішний дзвінок",
  TRANSFER: "Переведений дзвінок",
  ONLINE: "Дзвінок онлайн",
  BUSY: "Зайнято",
  NOANSWER: "Без відповіді",
  CANCEL: "Скасований",
  CONGESTION: "Неуспішний",
  CHANUNAVAIL: "Канал недоступний",
  VM: "Голосова пошта",
  "VM-SUCCESS": "Голосова пошта з повідомленням",
  "SMS-SENDING": "SMS надсилається",
  "SMS-SUCCESS": "SMS надіслано",
  "SMS-FAILED": "SMS не надіслано",
  SUCCESS: "Факс прийнятий",
  FAILED: "Факс не прийнятий"
};

const RECORDING_STATUS_LABELS = {
  uploaded: "Запис завантажено",
  saved: "Запис збережено",
  failed: "Запис недоступний",
  notUpload: "Запис не завантажено",
  notRecord: "Не записувався",
  inProcess: "Запис обробляється",
  removed: "Запис видалено"
};

function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function integer(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function startedAt(value) {
  const seconds = integer(value);
  return seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

function buildEndpoint(baseUrl, methodPath) {
  return `${String(baseUrl || "").replace(/\/+$/, "")}/${methodPath}.json`;
}

function stablePayload(value) {
  if (Array.isArray(value)) {
    return value.map(stablePayload);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stablePayload(value[key])])
  );
}

function requestKey(methodPath, payload) {
  return `${methodPath}:${JSON.stringify(stablePayload(payload || {}))}`;
}

function retryAfterMillis(data, fallback = 3000) {
  const message = text(data && data.message);
  const match = message.match(/after\s+(\d+(?:\.\d+)?)\s+sec/i);

  if (match) {
    return Math.ceil(Number(match[1]) * 1000);
  }

  return fallback;
}

class BinotelApiError extends Error {
  constructor(message, data) {
    super(message);
    this.name = "BinotelApiError";
    this.code = data && data.code;
    this.retryAfterMillis =
      String(this.code) === "106" ? retryAfterMillis(data) : 0;
  }
}

function callTypeInfo(value) {
  const type = Number(value);

  if (type === 0) {
    return { type: "incoming", label: "Вхідний" };
  }

  if (type === 1) {
    return { type: "outgoing", label: "Вихідний" };
  }

  return { type: "unknown", label: "Дзвінок" };
}

function normalizeEmployee(data) {
  return {
    name: text(data && data.name),
    email: text(data && data.email)
  };
}

function normalizeCustomer(data) {
  return {
    id: text(data && data.id),
    name: text(data && data.name)
  };
}

function normalizePbxNumber(data) {
  return {
    number: text(data && data.number),
    name: text(data && data.name)
  };
}

function normalizeHistoryItem(item) {
  const disposition = text(item && item.disposition).toUpperCase();

  return {
    internalNumber: text(item && item.internalNumber),
    internalAdditionalData: text(item && item.internalAdditionalData),
    employee: normalizeEmployee(item && item.employeeData),
    waitSec: integer(item && item.waitsec),
    billSec: integer(item && item.billsec),
    disposition,
    dispositionLabel: DISPOSITION_LABELS[disposition] || disposition
  };
}

function normalizeCall(id, item) {
  const type = callTypeInfo(item && item.callType);
  const disposition = text(item && item.disposition).toUpperCase();
  const recordingStatus = text(item && item.recordingStatus);

  return {
    id: text((item && item.generalCallID) || (item && item.callID) || id),
    callId: text(item && item.callID),
    generalCallId: text(item && item.generalCallID),
    startedAt: startedAt(item && item.startTime),
    type: type.type,
    typeLabel: type.label,
    internalNumber: text(item && item.internalNumber),
    internalAdditionalData: text(item && item.internalAdditionalData),
    externalNumber: text(item && item.externalNumber),
    waitSec: integer(item && item.waitsec),
    billSec: integer(item && item.billsec),
    disposition,
    dispositionLabel: DISPOSITION_LABELS[disposition] || disposition || "Без статусу",
    recordingStatus,
    recordingStatusLabel: RECORDING_STATUS_LABELS[recordingStatus] || recordingStatus,
    isNewCall: integer(item && item.isNewCall) === 1,
    whoHungUp: text(item && item.whoHungUp),
    customer: normalizeCustomer(item && item.customerData),
    employee: normalizeEmployee(item && item.employeeData),
    pbxNumber: normalizePbxNumber(item && item.pbxNumberData),
    history: Array.isArray(item && item.historyData)
      ? item.historyData.map(normalizeHistoryItem)
      : []
  };
}

function normalizeCallDetails(callDetails, maxCalls) {
  if (!callDetails || typeof callDetails !== "object") {
    return [];
  }

  const calls = Object.entries(callDetails)
    .map(([id, item]) => normalizeCall(id, item || {}))
    .sort((a, b) => new Date(b.startedAt || 0) - new Date(a.startedAt || 0));

  return maxCalls > 0 ? calls.slice(0, maxCalls) : calls;
}

function findRecordingUrl(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return /^https?:\/\//i.test(value) ? value : "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = findRecordingUrl(item);
      if (nested) {
        return nested;
      }
    }
    return "";
  }

  if (typeof value !== "object") {
    return "";
  }

  for (const key of [
    "url",
    "recordUrl",
    "recordURL",
    "recordingUrl",
    "recordingURL",
    "callRecordUrl",
    "callRecordURL",
    "link"
  ]) {
    const candidate = findRecordingUrl(value[key]);
    if (candidate) {
      return candidate;
    }
  }

  for (const item of Object.values(value)) {
    const nested = findRecordingUrl(item);
    if (nested) {
      return nested;
    }
  }

  return "";
}

class BinotelClient {
  constructor(config) {
    this.config = config.binotel || {};
    this.cache = new Map();
    this.inFlight = new Map();
    this.queue = Promise.resolve();
    this.lastRequestAt = 0;
  }

  get enabled() {
    return Boolean(this.config.enabled && this.config.key && this.config.secret);
  }

  async waitForTurn() {
    const minInterval = this.config.requestMinIntervalMillis || 3500;
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < minInterval) {
      await sleep(minInterval - elapsed);
    }
  }

  enqueue(task) {
    const run = this.queue
      .catch(() => {})
      .then(async () => {
        await this.waitForTurn();
        try {
          return await task();
        } finally {
          this.lastRequestAt = Date.now();
        }
      });

    this.queue = run.catch(() => {});
    return run;
  }

  async request(methodPath, payload, options = {}) {
    const key = options.key || requestKey(methodPath, payload);
    const cached = this.getCache(key);
    if (cached) {
      return cached;
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = this.enqueue(() => this.requestWithRetry(methodPath, payload))
      .then((data) => {
        if (options.cacheTtlMillis) {
          this.setCache(key, data, options.cacheTtlMillis);
        }
        return data;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  getCache(key) {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    if (item.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  setCache(key, value, ttlMillis) {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMillis
    });
  }

  async requestWithRetry(methodPath, payload) {
    const maxRetries = this.config.maxRetries || 0;
    let attempt = 0;

    while (true) {
      try {
        return await this.requestOnce(methodPath, payload);
      } catch (error) {
        if (!(error instanceof BinotelApiError) || !error.retryAfterMillis || attempt >= maxRetries) {
          throw error;
        }

        attempt += 1;
        await sleep(error.retryAfterMillis + (this.config.retryPaddingMillis || 0));
      }
    }
  }

  async requestOnce(methodPath, payload) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeoutMillis || 5000
    );

    try {
      const response = await fetch(buildEndpoint(this.config.baseUrl, methodPath), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...payload,
          key: this.config.key,
          secret: this.config.secret
        }),
        signal: controller.signal
      });

      const body = await response.text();
      let data;
      try {
        data = body ? JSON.parse(body) : {};
      } catch {
        throw new Error("Binotel повернув не JSON відповідь");
      }

      if (!response.ok) {
        throw new Error(`Binotel HTTP ${response.status}`);
      }

      if (data.status !== "success") {
        const code = data.code ? ` ${data.code}` : "";
        throw new BinotelApiError(
          `Binotel${code}: ${data.message || "невідома помилка"}`,
          data
        );
      }

      return data;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("Binotel не відповів вчасно");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async historyByExternalNumber(phone) {
    if (!this.enabled) {
      return [];
    }

    const externalNumbers = lookupVariants(phone);
    if (!externalNumbers.length) {
      return [];
    }

    const data = await this.request(
      "stats/history-by-external-number",
      { externalNumbers },
      {
        key: `history:${externalNumbers.join("|")}`,
        cacheTtlMillis: this.config.historyCacheTtlMillis || 60000
      }
    );

    return normalizeCallDetails(data.callDetails, this.config.maxCalls || 0);
  }

  async allIncomingCallsSince(timestamp) {
    if (!this.enabled) {
      return [];
    }

    const data = await this.request("stats/all-incoming-calls-since", {
      timestamp: Math.max(0, Number(timestamp || 0))
    });

    return normalizeCallDetails(data.callDetails, 0);
  }

  async allOutgoingCallsSince(timestamp) {
    if (!this.enabled) {
      return [];
    }

    const data = await this.request("stats/all-outgoing-calls-since", {
      timestamp: Math.max(0, Number(timestamp || 0))
    });

    return normalizeCallDetails(data.callDetails, 0);
  }

  async callRecord(generalCallId) {
    if (!this.enabled || !generalCallId) {
      return null;
    }

    const data = await this.request("stats/call-record", {
      generalCallID: String(generalCallId)
    });
    const url = findRecordingUrl(data.callDetails || data);

    if (!url) {
      throw new Error("Binotel не повернув посилання на запис розмови");
    }

    return {
      url,
      expiresInMinutes: 15
    };
  }
}

module.exports = {
  BinotelClient
};
