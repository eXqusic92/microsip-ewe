"use strict";

const fs = require("fs/promises");
const path = require("path");

class CallSummaryStore {
  constructor(filename) {
    this.filename = filename;
    this.loaded = false;
    this.data = {
      version: 1,
      summaries: {}
    };
    this.writeQueue = Promise.resolve();
  }

  async load() {
    if (this.loaded) {
      return;
    }

    await fs.mkdir(path.dirname(this.filename), { recursive: true });

    try {
      const content = await fs.readFile(this.filename, "utf8");
      const parsed = JSON.parse(content);

      if (!parsed || parsed.version !== 1 || typeof parsed.summaries !== "object") {
        throw new Error("unsupported call summaries format");
      }

      this.data = parsed;
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }

      await this.persist();
    }

    this.loaded = true;
  }

  async get(callId) {
    await this.load();
    return this.data.summaries[String(callId)] || null;
  }

  async upsert(callId, patch) {
    await this.load();

    const id = String(callId);
    const now = new Date().toISOString();
    const current = this.data.summaries[id] || {
      id,
      createdAt: now,
      attempts: 0
    };

    this.data.summaries[id] = {
      ...current,
      ...patch,
      id,
      updatedAt: now
    };

    await this.persist();
    return this.data.summaries[id];
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
  CallSummaryStore
};
