"use strict";

function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function normalizeBaseUrl(value) {
  return text(value).replace(/\/+$/, "");
}

function normalizeTripId(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? String(parsed) : "";
}

function uniqueTripIds(values) {
  return [
    ...new Set((Array.isArray(values) ? values : []).map(normalizeTripId).filter(Boolean))
  ];
}

function getSetCookieHeaders(headers) {
  if (!headers) {
    return [];
  }

  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const value = typeof headers.get === "function" ? headers.get("set-cookie") : "";
  return value ? [value] : [];
}

function cookieHeaderFromSetCookie(headers) {
  return getSetCookieHeaders(headers)
    .map((item) => text(item).split(";")[0])
    .filter(Boolean)
    .join("; ");
}

function extractBusNumber(assignment) {
  return (
    text(assignment && assignment.bus && assignment.bus.plate) ||
    text(assignment && assignment.busPlate) ||
    text(assignment && assignment.plate)
  );
}

function extractBusColor(assignment) {
  const color =
    text(assignment && assignment.bus && assignment.bus.color) ||
    text(assignment && assignment.busColor) ||
    text(assignment && assignment.color);
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "";
}

function extractBusAssignment(assignment) {
  return {
    busNumber: extractBusNumber(assignment),
    busColor: extractBusColor(assignment)
  };
}

class DispatcherApiClient {
  constructor(config, fetchImpl = globalThis.fetch) {
    this.config = config.dispatcherApi || {};
    this.fetch = fetchImpl;
    this.baseUrl = normalizeBaseUrl(this.config.baseUrl);
    this.username = text(this.config.username);
    this.password = String(this.config.password || "");
    this.timeoutMillis = Number(this.config.timeoutMillis || 5000);
    this.cacheTtlMillis = Number(this.config.cacheTtlMillis || 60000);
    this.cookieHeader = "";
    this.csrfToken = "";
    this.loginPromise = null;
    this.cache = new Map();
  }

  get enabled() {
    return Boolean(
      this.config.enabled &&
        this.baseUrl &&
        this.username &&
        this.password &&
        typeof this.fetch === "function"
    );
  }

  endpoint(pathname) {
    return new URL(pathname, `${this.baseUrl}/`);
  }

  async fetchJson(url, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.max(1000, this.timeoutMillis));

    try {
      const response = await this.fetch(url, {
        ...options,
        signal: controller.signal
      });
      let payload = null;
      try {
        payload = await response.json();
      } catch {
        payload = null;
      }
      return { response, payload };
    } finally {
      clearTimeout(timeout);
    }
  }

  async login() {
    if (!this.enabled) {
      throw new Error("Dispatcher API is not configured");
    }

    if (this.loginPromise) {
      return this.loginPromise;
    }

    this.loginPromise = (async () => {
      const url = this.endpoint("/api/auth/login");
      const { response, payload } = await this.fetchJson(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          username: this.username,
          password: this.password
        })
      });

      if (!response.ok) {
        throw new Error(`Dispatcher API login failed: ${response.status}`);
      }

      const cookieHeader = cookieHeaderFromSetCookie(response.headers);
      if (!cookieHeader) {
        throw new Error("Dispatcher API login did not return a session cookie");
      }

      this.cookieHeader = cookieHeader;
      this.csrfToken = text(payload && payload.csrfToken);
      return payload;
    })();

    try {
      return await this.loginPromise;
    } finally {
      this.loginPromise = null;
    }
  }

  async requestJson(pathname, { searchParams } = {}, retryAuth = true) {
    if (!this.cookieHeader) {
      await this.login();
    }

    const url = this.endpoint(pathname);
    for (const [key, value] of Object.entries(searchParams || {})) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const { response, payload } = await this.fetchJson(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Cookie: this.cookieHeader
      }
    });

    if (response.status === 401 && retryAuth) {
      this.cookieHeader = "";
      await this.login();
      return this.requestJson(pathname, { searchParams }, false);
    }

    if (!response.ok) {
      throw new Error(`Dispatcher API request failed: ${response.status}`);
    }

    return payload || {};
  }

  getCachedBusAssignment(tripId, now) {
    const entry = this.cache.get(tripId);
    if (!entry || entry.expiresAt <= now) {
      this.cache.delete(tripId);
      return null;
    }
    return entry.assignment;
  }

  setCachedBusAssignment(tripId, assignment, now) {
    this.cache.set(tripId, {
      assignment: {
        busNumber: text(assignment && assignment.busNumber),
        busColor: extractBusColor(assignment)
      },
      expiresAt: now + Math.max(1000, this.cacheTtlMillis)
    });
  }

  async getBusAssignmentsForTripIds(values) {
    const tripIds = uniqueTripIds(values);
    const result = {};

    if (!this.enabled || !tripIds.length) {
      return result;
    }

    const now = Date.now();
    const missing = [];
    for (const tripId of tripIds) {
      const cached = this.getCachedBusAssignment(tripId, now);
      if (cached !== null) {
        result[tripId] = cached;
      } else {
        missing.push(tripId);
      }
    }

    if (!missing.length) {
      return result;
    }

    const payload = await this.requestJson("/api/trip-assignments", {
      searchParams: {
        tripIds: missing.join(",")
      }
    });
    const assignments = payload && payload.assignments && typeof payload.assignments === "object"
      ? payload.assignments
      : {};

    for (const tripId of missing) {
      const assignment = extractBusAssignment(assignments[tripId]);
      this.setCachedBusAssignment(tripId, assignment, now);
      result[tripId] = assignment;
    }

    return result;
  }

  async getBusNumbersForTripIds(values) {
    const assignments = await this.getBusAssignmentsForTripIds(values);
    return Object.fromEntries(
      Object.entries(assignments).map(([tripId, assignment]) => [
        tripId,
        assignment.busNumber || ""
      ])
    );
  }
}

module.exports = {
  DispatcherApiClient,
  extractBusAssignment,
  extractBusColor,
  extractBusNumber,
  normalizeTripId
};
