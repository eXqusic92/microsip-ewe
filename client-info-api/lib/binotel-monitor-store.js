"use strict";

const fs = require("fs/promises");
const path = require("path");

function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function timestamp(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function callId(call) {
  return text(call && (call.generalCallId || call.id || call.callId));
}

class BinotelMonitorStore {
  constructor(filename, options = {}) {
    this.filename = filename;
    this.maxCalls = Number(options.maxCalls || 2000);
    this.loaded = false;
    this.writeQueue = Promise.resolve();
    this.data = {
      version: 1,
      calls: {},
      sync: {
        monitorSinceTimestamp: 0,
        aiAnalysisSinceTimestamp: 0,
        firstStartedAt: null,
        lastIncomingTimestamp: 0,
        lastOutgoingTimestamp: 0,
        lastSyncAt: null,
        lastError: "",
        lastResult: null
      }
    };
  }

  async load() {
    if (this.loaded) {
      return;
    }

    await fs.mkdir(path.dirname(this.filename), { recursive: true });

    try {
      const content = await fs.readFile(this.filename, "utf8");
      const parsed = JSON.parse(content);

      if (!parsed || parsed.version !== 1 || typeof parsed.calls !== "object") {
        throw new Error("unsupported Binotel monitor format");
      }

      this.data = {
        version: 1,
        calls: parsed.calls || {},
        sync: {
          monitorSinceTimestamp: 0,
          aiAnalysisSinceTimestamp: 0,
          firstStartedAt: null,
          lastIncomingTimestamp: 0,
          lastOutgoingTimestamp: 0,
          lastSyncAt: null,
          lastError: "",
          lastResult: null,
          ...(parsed.sync || {})
        }
      };
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }

      await this.persist();
    }

    this.loaded = true;
  }

  async syncState() {
    await this.load();
    return { ...this.data.sync };
  }

  async getCall(callId) {
    await this.load();
    return this.data.calls[String(callId || "")] || null;
  }

  async updateSync(patch) {
    await this.load();
    this.data.sync = {
      ...this.data.sync,
      ...patch
    };
    await this.persist();
    return { ...this.data.sync };
  }

  async upsertCalls(calls) {
    await this.load();

    const now = new Date().toISOString();
    let added = 0;
    let updated = 0;

    for (const call of calls || []) {
      const id = callId(call);
      if (!id) {
        continue;
      }

      const current = this.data.calls[id];
      if (current) {
        updated += 1;
      } else {
        added += 1;
      }

      this.data.calls[id] = {
        ...current,
        ...call,
        id,
        generalCallId: text(call.generalCallId || id),
        firstSeenAt: current ? current.firstSeenAt : now,
        updatedAt: now
      };
    }

    this.trim();
    await this.persist();

    return {
      added,
      updated,
      total: Object.keys(this.data.calls).length
    };
  }

  async updateCall(callId, patch) {
    await this.load();

    const id = String(callId || "");
    if (!id || !this.data.calls[id]) {
      return null;
    }

    this.data.calls[id] = {
      ...this.data.calls[id],
      ...patch,
      updatedAt: new Date().toISOString()
    };
    await this.persist();
    return this.data.calls[id];
  }

  async list(options = {}) {
    await this.load();

    const limit = Math.max(
      1,
      Math.min(Number(options.limit || 100), this.maxCalls || 5000, 5000)
    );
    const offset = Math.max(0, Number(options.offset || 0));
    const query = text(options.query).toLowerCase();
    const queryDigits = query.replace(/\D/g, "");

    let calls = Object.values(this.data.calls);

    if (options.since) {
      const since = timestamp(options.since);
      calls = calls.filter((call) => timestamp(call.startedAt) >= since);
    }

    if (query) {
      calls = calls.filter((call) => {
        const external = text(call.externalNumber).toLowerCase();
        const employee = text(call.employee && call.employee.name).toLowerCase();
        const internal = text(call.internalNumber).toLowerCase();
        const id = callId(call).toLowerCase();
        const digits = external.replace(/\D/g, "");

        return (
          external.includes(query) ||
          employee.includes(query) ||
          internal.includes(query) ||
          id.includes(query) ||
          (queryDigits && digits.includes(queryDigits))
        );
      });
    }

    calls = calls.sort((a, b) => timestamp(b.startedAt) - timestamp(a.startedAt));

    return {
      total: calls.length,
      limit,
      offset,
      calls: calls.slice(offset, offset + limit)
    };
  }

  async status() {
    await this.load();

    return {
      totalCalls: Object.keys(this.data.calls).length,
      ...this.data.sync
    };
  }

  trim() {
    if (!this.maxCalls || this.maxCalls <= 0) {
      return;
    }

    const entries = Object.entries(this.data.calls)
      .sort(([, a], [, b]) => timestamp(b.startedAt) - timestamp(a.startedAt));

    for (const [id] of entries.slice(this.maxCalls)) {
      delete this.data.calls[id];
    }
  }

  async persist() {
    const content = `${JSON.stringify(this.data, null, 2)}\n`;

    this.writeQueue = this.writeQueue.then(async () => {
      await fs.mkdir(path.dirname(this.filename), { recursive: true });
      const temporaryFile = `${this.filename}.${process.pid}.tmp`;
      await fs.writeFile(temporaryFile, content, "utf8");
      await fs.rename(temporaryFile, this.filename);
    });

    return this.writeQueue;
  }
}

module.exports = {
  BinotelMonitorStore
};
