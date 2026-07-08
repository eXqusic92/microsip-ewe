"use strict";

const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { normalizePhone, phoneDigits } = require("./phone");

const execFileAsync = promisify(execFile);

function text(value, fallback = "") {
  return value === null || value === undefined ? fallback : String(value).trim();
}

function compactError(error) {
  return text(error && (error.stderr || error.message || error.code || error), "viber_error");
}

function parseJson(stdout) {
  const raw = text(stdout);
  return raw ? JSON.parse(raw) : null;
}

function viberDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    const millis = numeric > 100000000000 ? numeric : numeric * 1000;
    return new Date(millis).toISOString();
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function contactInitialName(phone) {
  return normalizePhone(phone) || text(phone) || "Viber";
}

function fileMessageText(value) {
  const raw = text(value);
  if (!raw) {
    return "";
  }
  try {
    const parsed = JSON.parse(raw);
    const fileName = text(parsed && parsed.fileInfo && parsed.fileInfo.FileName);
    if (fileName) {
      return `[файл Viber] ${fileName}`;
    }
    const mediaType = text(parsed && parsed.fileInfo && parsed.fileInfo.mediaInfo && parsed.fileInfo.mediaInfo.MediaType);
    if (mediaType) {
      return `[файл Viber] ${mediaType}`;
    }
  } catch (_) {
    return "";
  }
  return "";
}

function messageText(row) {
  const body = text(row.Body);
  if (body) {
    return body;
  }
  const fromInfo = fileMessageText(row.MessageInfo);
  if (fromInfo) {
    return fromInfo;
  }
  if (text(row.PayloadPath)) {
    return "[файл Viber]";
  }
  return "";
}

function accountPhoneFromDbPath(dbPath) {
  const normalized = path.normalize(String(dbPath || ""));
  const parts = normalized.split(path.sep).filter(Boolean);
  const dbIndex = parts.lastIndexOf("ViberPC");
  if (dbIndex >= 0 && parts[dbIndex + 1]) {
    return parts[dbIndex + 1];
  }
  const parent = parts.length > 1 ? parts[parts.length - 2] : "";
  return /^\d{8,15}$/.test(parent) ? parent : "";
}

class ViberService {
  constructor(config) {
    this.config = (config && config.viber) || {};
  }

  configured() {
    return Boolean(
      this.config.enabled &&
      this.config.dbPath &&
      this.config.dbKey &&
      this.config.readerBin &&
      this.config.pluginPath
    );
  }

  accountDigits() {
    return phoneDigits(
      this.config.accountPhone ||
      accountPhoneFromDbPath(this.config.dbPath)
    );
  }

  async conversation({ phone, limit } = {}) {
    const normalizedPhone = normalizePhone(phone);
    const digits = phoneDigits(normalizedPhone || phone);
    const messageLimit = Math.max(1, Math.min(Number(limit || this.config.messageLimit || 50), 200));

    if (!this.config.enabled) {
      return this.emptyResponse(phone, false, "viber_not_configured");
    }

    if (!digits) {
      return {
        ok: false,
        configured: this.configured(),
        found: false,
        contact: null,
        messages: [],
        error: "invalid_phone"
      };
    }

    const missing = this.missingConfig();
    if (missing) {
      return this.emptyResponse(phone, true, missing);
    }

    if (digits === this.accountDigits()) {
      return this.emptyResponse(phone, true, null);
    }

    const payload = await this.readConversation(digits, messageLimit);
    if (!payload || payload.ok !== true) {
      return {
        ok: true,
        configured: true,
        found: false,
        contact: this.contact(phone),
        messages: [],
        error: payload && payload.error ? payload.error : "viber_reader_failed",
        detail: payload && payload.detail ? payload.detail : ""
      };
    }

    if (payload.schemaSupported === false) {
      return this.emptyResponse(phone, true, "viber_schema_not_supported");
    }

    const rows = Array.isArray(payload.rows) ? payload.rows : [];
    const messages = rows
      .map((row) => ({
        id: text(row.EventID),
        direction: Number(row.Direction) === 1 ? "outgoing" : "incoming",
        sentAt: viberDate(row.TimeStamp),
        text: messageText(row),
        subject: text(row.Subject),
        phone: normalizedPhone || normalizePhone(row.Number) || text(row.Number),
        status: row.MessageStatus === null || row.MessageStatus === undefined
          ? ""
          : String(row.MessageStatus),
        type: row.MessageType === null || row.MessageType === undefined
          ? ""
          : String(row.MessageType)
      }))
      .filter((message) => message.text || message.subject || message.type)
      .reverse();

    return {
      ok: true,
      configured: true,
      encrypted: payload.encrypted === true,
      found: messages.length > 0,
      contact: this.contact(phone),
      messages
    };
  }

  missingConfig() {
    if (!this.config.dbPath || !fs.existsSync(this.config.dbPath)) {
      return "viber_database_not_found";
    }
    if (!this.config.dbKey) {
      return "viber_database_key_required";
    }
    if (!this.config.readerBin || !fs.existsSync(this.config.readerBin)) {
      return "viber_reader_not_found";
    }
    if (!this.config.pluginPath || !fs.existsSync(this.config.pluginPath)) {
      return "viber_plugin_path_not_found";
    }
    return "";
  }

  contact(phone) {
    return {
      phone: normalizePhone(phone) || phone,
      displayName: contactInitialName(phone)
    };
  }

  emptyResponse(phone, configured, error) {
    return {
      ok: true,
      configured,
      found: false,
      contact: configured ? this.contact(phone) : null,
      messages: [],
      ...(error ? { error } : {})
    };
  }

  async readConversation(digits, limit) {
    try {
      const { stdout } = await execFileAsync(
        this.config.readerBin,
        [
          this.config.dbPath,
          this.config.dbKey,
          this.config.pluginPath,
          digits,
          String(limit)
        ],
        {
          timeout: 8000,
          maxBuffer: 4 * 1024 * 1024
        }
      );
      return parseJson(stdout);
    } catch (error) {
      return {
        ok: false,
        error: "viber_reader_failed",
        detail: compactError(error)
      };
    }
  }
}

module.exports = {
  ViberService
};
