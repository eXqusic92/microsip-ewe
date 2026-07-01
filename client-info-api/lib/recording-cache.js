"use strict";

const fs = require("fs/promises");
const path = require("path");

function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function safeId(value) {
  return text(value).replace(/[^a-zA-Z0-9._-]/g, "_");
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

function nowIso() {
  return new Date().toISOString();
}

class RecordingCache {
  constructor(config, binotelClient, metadataStore = null) {
    this.config = config;
    this.binotelClient = binotelClient;
    this.metadataStore = metadataStore;
    this.filename = config.binotelRecordingCacheFile;
    this.recordingsDir = config.binotelRecordingsDir;
    this.ttlMillis = config.binotelMonitor.recordingCacheTtlMillis;
    this.maxAudioBytes = config.openai.maxAudioBytes || 25 * 1024 * 1024;
    this.loaded = false;
    this.writeQueue = Promise.resolve();
    this.inFlight = new Map();
    this.data = {
      version: 1,
      recordings: {}
    };
  }

  async load() {
    if (this.loaded) {
      return;
    }

    await fs.mkdir(this.recordingsDir, { recursive: true });
    if (this.metadataStore) {
      this.loaded = true;
      return;
    }

    await fs.mkdir(path.dirname(this.filename), { recursive: true });

    try {
      const content = await fs.readFile(this.filename, "utf8");
      const parsed = JSON.parse(content);

      if (!parsed || parsed.version !== 1 || typeof parsed.recordings !== "object") {
        throw new Error("unsupported recording cache format");
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

  async metadata(callId) {
    if (this.metadataStore) {
      return this.metadataStore.metadata(callId);
    }

    await this.load();
    return this.data.recordings[String(callId)] || null;
  }

  async hasFresh(callId) {
    const entry = await this.metadata(callId);
    if (!entry || !entry.expiresAt || new Date(entry.expiresAt).getTime() <= Date.now()) {
      return false;
    }

    try {
      await fs.access(entry.filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getAudio(callId) {
    const id = text(callId);
    if (!id) {
      throw new Error("callId is required");
    }

    await this.purgeExpired();

    const cached = await this.readCached(id);
    if (cached) {
      return cached;
    }

    if (this.inFlight.has(id)) {
      return this.inFlight.get(id);
    }

    const promise = this.download(id).finally(() => {
      this.inFlight.delete(id);
    });

    this.inFlight.set(id, promise);
    return promise;
  }

  async readCached(callId) {
    await this.load();

    const entry = this.data.recordings[callId];
    if (!entry || !entry.filePath || new Date(entry.expiresAt || 0).getTime() <= Date.now()) {
      return null;
    }

    try {
      const bytes = await fs.readFile(entry.filePath);
      return {
        bytes,
        contentType: entry.contentType || "audio/mpeg",
        filename: entry.filename || path.basename(entry.filePath),
        cached: true,
        cachedAt: entry.cachedAt || null
      };
    } catch {
      if (this.metadataStore) {
        await this.metadataStore.delete(callId);
      } else {
        delete this.data.recordings[callId];
        await this.persist();
      }
      return null;
    }
  }

  async download(callId) {
    if (!this.binotelClient || !this.binotelClient.enabled) {
      throw new Error("Binotel API is not configured");
    }

    const record = await this.binotelClient.callRecord(callId);
    const response = await fetch(record.url, {
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

    if (bytes.length > this.maxAudioBytes) {
      throw new Error("Recording is too large for local cache");
    }

    const ext = audioExtension(contentType, record.url);
    const filename = `binotel-call-${safeId(callId)}.${ext}`;
    const filePath = path.join(this.recordingsDir, filename);
    const cachedAt = nowIso();
    const expiresAt = new Date(Date.now() + this.ttlMillis).toISOString();

    await fs.mkdir(this.recordingsDir, { recursive: true });
    await fs.writeFile(filePath, bytes);

    const entry = {
      callId,
      filePath,
      filename,
      contentType,
      bytes: bytes.length,
      cachedAt,
      expiresAt
    };

    if (this.metadataStore) {
      await this.metadataStore.upsert(entry);
    } else {
      await this.load();
      this.data.recordings[callId] = entry;
      await this.persist();
    }

    return {
      bytes,
      contentType,
      filename,
      cached: false,
      cachedAt
    };
  }

  async purgeExpired() {
    if (this.metadataStore) {
      const expired = await this.metadataStore.expired(new Date());
      for (const entry of expired) {
        if (entry.filePath) {
          await fs.unlink(entry.filePath).catch(() => {});
        }
        await this.metadataStore.delete(entry.callId);
      }
      return;
    }

    await this.load();

    const now = Date.now();
    let changed = false;

    for (const [callId, entry] of Object.entries(this.data.recordings)) {
      const expiresAt = new Date(entry.expiresAt || 0).getTime();
      if (!expiresAt || expiresAt > now) {
        continue;
      }

      if (entry.filePath) {
        await fs.unlink(entry.filePath).catch(() => {});
      }

      delete this.data.recordings[callId];
      changed = true;
    }

    if (changed) {
      await this.persist();
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
  RecordingCache
};
