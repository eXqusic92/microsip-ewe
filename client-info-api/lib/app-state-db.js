"use strict";

const crypto = require("crypto");
const { Pool } = require("pg");

const {
  createDefaultAiAnalysisSettings,
  normalizeAiAnalysisSettings,
  settingsRevision,
  settingsScoringRevision,
  settingsSemanticRevision
} = require("./ai-analysis-settings");
const { normalizePhone, phoneDigits } = require("./phone");

function text(value, fallback = "") {
  return value === null || value === undefined ? fallback : String(value).trim();
}

function numeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function integer(value, fallback = 0) {
  return Math.trunc(numeric(value, fallback));
}

function optionalNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalTimestamp(value) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function cloneJson(value, fallback = null) {
  if (value === undefined) {
    return fallback;
  }
  return JSON.parse(JSON.stringify(value));
}

function cachedTelegramReplyPreview(message) {
  if (!message) {
    return null;
  }
  const media = message.media || null;
  return {
    id: message.id,
    direction: message.direction,
    text: text(message.text) || (media && media.label ? media.label : "Повідомлення"),
    mediaType: media && media.type ? media.type : "",
    mediaLabel: media && media.label ? media.label : ""
  };
}

function attachCachedTelegramReplyPreviews(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const byId = new Map(list.map((message) => [Number(message.id), message]));
  return list.map((message) => {
    if (!message || !message.replyToMessageId) {
      return message;
    }
    return {
      ...message,
      replyPreview: cachedTelegramReplyPreview(byId.get(Number(message.replyToMessageId)))
    };
  });
}

function nowIso() {
  return new Date().toISOString();
}

function normalizeLocalNoteId(id) {
  return text(id).replace(/^local-/, "");
}

function createAppStatePool(config) {
  const db = config && config.appStateDatabase;
  if (!db) {
    throw new Error("APP_STATE_DB_* configuration is required");
  }
  if (!db.enabled) {
    throw new Error(
      "APP_STATE_DB_ENABLED must be true; JSON app-state fallback has been removed"
    );
  }

  const missing = [];
  if (!text(db.host)) missing.push("APP_STATE_DB_HOST");
  if (!Number.isFinite(Number(db.port))) missing.push("APP_STATE_DB_PORT");
  if (!text(db.database)) missing.push("APP_STATE_DB_NAME");
  if (!text(db.user)) missing.push("APP_STATE_DB_USER");
  if (!text(db.password)) missing.push("APP_STATE_DB_PASSWORD");

  if (missing.length) {
    throw new Error(
      `APP_STATE_DB_* configuration is incomplete: ${missing.join(", ")}`
    );
  }

  return new Pool({
    host: db.host,
    port: db.port,
    database: db.database,
    user: db.user,
    password: db.password,
    ssl: db.ssl,
    max: db.max,
    idleTimeoutMillis: db.idleTimeoutMillis,
    connectionTimeoutMillis: db.connectionTimeoutMillis,
    application_name: db.applicationName || "client-info-api-app-state"
  });
}

class PostgresLocalNotesStore {
  constructor(pool, noteAuthor) {
    this.pool = pool;
    this.noteAuthor = noteAuthor || "Оператор";
  }

  async list(phone) {
    const result = await this.pool.query(
      `
        SELECT payload
        FROM client_notes
        WHERE phone = $1 OR phone_digits = $2
        ORDER BY created_at DESC, id DESC
      `,
      [text(phone), phoneDigits(phone)]
    );
    return result.rows.map((row) => row.payload);
  }

  async add(phone, noteText) {
    const note = {
      id: crypto.randomUUID(),
      text: noteText,
      createdBy: this.noteAuthor,
      createdAt: nowIso(),
      source: "postgres"
    };

    await this.pool.query(
      `
        INSERT INTO client_notes (
          id, phone, phone_digits, note_text, created_by, source, created_at, updated_at, payload
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8::jsonb)
        ON CONFLICT (id) DO UPDATE SET
          phone = EXCLUDED.phone,
          phone_digits = EXCLUDED.phone_digits,
          note_text = EXCLUDED.note_text,
          created_by = EXCLUDED.created_by,
          source = EXCLUDED.source,
          updated_at = EXCLUDED.updated_at,
          payload = EXCLUDED.payload
      `,
      [
        note.id,
        text(phone),
        phoneDigits(phone),
        text(note.text),
        text(note.createdBy, "Оператор"),
        text(note.source, "postgres"),
        note.createdAt,
        JSON.stringify(note)
      ]
    );

    return note;
  }

  async update(noteId, noteText) {
    const id = normalizeLocalNoteId(noteId);
    if (!id) {
      return null;
    }

    const current = await this.pool.query(
      "SELECT payload FROM client_notes WHERE id = $1",
      [id]
    );
    if (!current.rows.length) {
      return null;
    }

    const previous = current.rows[0].payload || {};
    const updatedAt = nowIso();
    const note = {
      ...previous,
      id,
      text: noteText,
      updatedAt,
      updatedBy: this.noteAuthor
    };

    const result = await this.pool.query(
      `
        UPDATE client_notes
        SET
          note_text = $2,
          updated_at = $3,
          payload = $4::jsonb
        WHERE id = $1
        RETURNING payload
      `,
      [id, text(noteText), updatedAt, JSON.stringify(note)]
    );

    return result.rows[0] ? result.rows[0].payload : null;
  }

  async delete(noteId) {
    const id = normalizeLocalNoteId(noteId);
    if (!id) {
      return null;
    }

    const result = await this.pool.query(
      "DELETE FROM client_notes WHERE id = $1 RETURNING payload",
      [id]
    );
    return result.rows[0] ? result.rows[0].payload : null;
  }
}

function telegramAccountPayload(row, includeSecrets = false) {
  if (!row) {
    return null;
  }
  const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
  const account = {
    id: text(row.id),
    label: text(row.label),
    phone: text(row.phone),
    phoneDigits: text(row.phone_digits),
    enabled: row.enabled !== false,
    status: text(row.status, "draft"),
    isDefault: row.is_default === true,
    telegramUserId: text(row.telegram_user_id),
    username: text(row.username),
    firstName: text(row.first_name),
    lastName: text(row.last_name),
    displayName:
      text(row.label) ||
      [text(row.first_name), text(row.last_name)].filter(Boolean).join(" ") ||
      text(row.username) ||
      text(row.phone),
    lastError: text(row.last_error),
    codeSentAt: optionalTimestamp(row.code_sent_at),
    lastConnectedAt: optionalTimestamp(row.last_connected_at),
    createdAt: optionalTimestamp(row.created_at),
    updatedAt: optionalTimestamp(row.updated_at),
    payload
  };

  if (includeSecrets) {
    account.sessionString = text(row.session_string);
    account.loginSessionString = text(row.login_session_string);
    account.phoneCodeHash = text(row.phone_code_hash);
  }

  return account;
}

function telegramContactPayload(row) {
  if (!row) {
    return null;
  }
  return {
    accountId: text(row.account_id),
    phone: text(row.phone),
    phoneDigits: text(row.phone_digits),
    found: row.found === true,
    telegramUserId: text(row.telegram_user_id),
    accessHash: text(row.access_hash),
    username: text(row.username),
    firstName: text(row.first_name),
    lastName: text(row.last_name),
    displayName:
      [text(row.first_name), text(row.last_name)].filter(Boolean).join(" ") ||
      text(row.username) ||
      text(row.phone),
    lastCheckedAt: optionalTimestamp(row.last_checked_at),
    payload: row.payload && typeof row.payload === "object" ? row.payload : {}
  };
}

function nextTelegramAccountStatus(current = {}, enabled = true) {
  if (enabled === false) {
    return "disabled";
  }
  if (current.status === "disabled") {
    return current.sessionString ? "connected" : "draft";
  }
  return current.status || "draft";
}

class PostgresTelegramStore {
  constructor(pool) {
    this.pool = pool;
    this.schemaReady = null;
  }

  async ensureSchema() {
    if (!this.schemaReady) {
      this.schemaReady = this.pool.query(`
        CREATE TABLE IF NOT EXISTS telegram_accounts (
          id uuid PRIMARY KEY,
          label text NOT NULL DEFAULT '',
          phone text NOT NULL,
          phone_digits text NOT NULL,
          enabled boolean NOT NULL DEFAULT true,
          status text NOT NULL DEFAULT 'draft' CHECK (
            status IN ('draft', 'code_sent', 'password_required', 'connected', 'failed', 'disabled')
          ),
          is_default boolean NOT NULL DEFAULT false,
          session_string text NOT NULL DEFAULT '',
          login_session_string text NOT NULL DEFAULT '',
          phone_code_hash text NOT NULL DEFAULT '',
          code_sent_at timestamptz,
          telegram_user_id text NOT NULL DEFAULT '',
          username text NOT NULL DEFAULT '',
          first_name text NOT NULL DEFAULT '',
          last_name text NOT NULL DEFAULT '',
          last_error text NOT NULL DEFAULT '',
          last_connected_at timestamptz,
          created_at timestamptz NOT NULL DEFAULT now(),
          updated_at timestamptz NOT NULL DEFAULT now(),
          payload jsonb NOT NULL DEFAULT '{}'::jsonb,
          CONSTRAINT telegram_accounts_phone_digits_uniq UNIQUE (phone_digits)
        );
        CREATE UNIQUE INDEX IF NOT EXISTS telegram_accounts_single_default_idx
          ON telegram_accounts (is_default)
          WHERE is_default;
        CREATE INDEX IF NOT EXISTS telegram_accounts_enabled_status_idx
          ON telegram_accounts (enabled, status, updated_at DESC);
        CREATE TABLE IF NOT EXISTS telegram_contact_cache (
          account_id uuid NOT NULL REFERENCES telegram_accounts(id) ON DELETE CASCADE ON UPDATE CASCADE,
          phone text NOT NULL,
          phone_digits text NOT NULL,
          found boolean NOT NULL DEFAULT false,
          telegram_user_id text NOT NULL DEFAULT '',
          access_hash text NOT NULL DEFAULT '',
          username text NOT NULL DEFAULT '',
          first_name text NOT NULL DEFAULT '',
          last_name text NOT NULL DEFAULT '',
          last_checked_at timestamptz NOT NULL DEFAULT now(),
          payload jsonb NOT NULL DEFAULT '{}'::jsonb,
          PRIMARY KEY (account_id, phone_digits)
        );
        CREATE INDEX IF NOT EXISTS telegram_contact_cache_phone_digits_idx
          ON telegram_contact_cache (phone_digits, last_checked_at DESC);
        CREATE TABLE IF NOT EXISTS telegram_message_cache (
          account_id uuid NOT NULL REFERENCES telegram_accounts(id) ON DELETE CASCADE ON UPDATE CASCADE,
          peer_key text NOT NULL,
          message_id bigint NOT NULL,
          phone text NOT NULL,
          phone_digits text NOT NULL,
          direction text NOT NULL DEFAULT 'incoming' CHECK (direction IN ('incoming', 'outgoing')),
          message_text text NOT NULL DEFAULT '',
          sent_at timestamptz,
          sender_id text NOT NULL DEFAULT '',
          payload jsonb NOT NULL DEFAULT '{}'::jsonb,
          created_at timestamptz NOT NULL DEFAULT now(),
          PRIMARY KEY (account_id, peer_key, message_id)
        );
        CREATE INDEX IF NOT EXISTS telegram_message_cache_phone_idx
          ON telegram_message_cache (phone_digits, sent_at DESC NULLS LAST);
      `);
    }
    await this.schemaReady;
  }

  async listAccounts(options = {}) {
    await this.ensureSchema();
    const clauses = [];
    const values = [];
    if (options.connectedOnly) {
      clauses.push("enabled = true", "status = 'connected'", "session_string <> ''");
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const result = await this.pool.query(
      `
        SELECT *
        FROM telegram_accounts
        ${where}
        ORDER BY is_default DESC, enabled DESC, updated_at DESC, created_at DESC
      `,
      values
    );
    return result.rows.map((row) => telegramAccountPayload(row, options.includeSecrets));
  }

  async getAccount(id, options = {}) {
    await this.ensureSchema();
    const result = await this.pool.query(
      "SELECT * FROM telegram_accounts WHERE id = $1",
      [text(id)]
    );
    return telegramAccountPayload(result.rows[0], options.includeSecrets);
  }

  async createAccount(input = {}) {
    await this.ensureSchema();
    const phone = normalizePhone(input.phone);
    if (!phone) {
      throw new Error("telegram_phone_invalid");
    }
    const digits = phoneDigits(phone);
    const id = crypto.randomUUID();
    const label = text(input.label) || phone;
    const payload = {
      label,
      phone,
      createdAt: nowIso()
    };
    const result = await this.pool.query(
      `
        INSERT INTO telegram_accounts (
          id, label, phone, phone_digits, enabled, status, payload
        )
        VALUES ($1, $2, $3, $4, true, 'draft', $5::jsonb)
        ON CONFLICT (phone_digits) DO UPDATE SET
          label = EXCLUDED.label,
          phone = EXCLUDED.phone,
          enabled = true,
          updated_at = now(),
          payload = telegram_accounts.payload || EXCLUDED.payload
        RETURNING *
      `,
      [id, label, phone, digits, JSON.stringify(payload)]
    );
    return telegramAccountPayload(result.rows[0]);
  }

  async updateAccount(id, input = {}) {
    await this.ensureSchema();
    const current = await this.getAccount(id, { includeSecrets: true });
    if (!current) {
      return null;
    }
    const label = input.label === undefined ? current.label : text(input.label);
    const enabled = input.enabled === undefined ? current.enabled : input.enabled !== false;
    const status = nextTelegramAccountStatus(current, enabled);
    const result = await this.pool.query(
      `
        UPDATE telegram_accounts
        SET label = $2,
            enabled = $3,
            status = $4,
            updated_at = now(),
            payload = payload || $5::jsonb
        WHERE id = $1
        RETURNING *
      `,
      [
        text(id),
        label,
        enabled,
        status,
        JSON.stringify({
          label,
          enabled,
          updatedAt: nowIso()
        })
      ]
    );
    return telegramAccountPayload(result.rows[0]);
  }

  async markLoginCodeSent(id, data = {}) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        UPDATE telegram_accounts
        SET status = 'code_sent',
            enabled = true,
            login_session_string = $2,
            phone_code_hash = $3,
            code_sent_at = now(),
            last_error = '',
            updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [text(id), text(data.loginSessionString), text(data.phoneCodeHash)]
    );
    return telegramAccountPayload(result.rows[0]);
  }

  async markPasswordRequired(id, data = {}) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        UPDATE telegram_accounts
        SET status = 'password_required',
            login_session_string = $2,
            last_error = '',
            updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [text(id), text(data.loginSessionString)]
    );
    return telegramAccountPayload(result.rows[0]);
  }

  async markConnected(id, data = {}) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        UPDATE telegram_accounts
        SET status = 'connected',
            enabled = true,
            session_string = $2,
            login_session_string = '',
            phone_code_hash = '',
            telegram_user_id = $3,
            username = $4,
            first_name = $5,
            last_name = $6,
            last_error = '',
            last_connected_at = now(),
            updated_at = now(),
            payload = payload || $7::jsonb
        WHERE id = $1
        RETURNING *
      `,
      [
        text(id),
        text(data.sessionString),
        text(data.telegramUserId),
        text(data.username),
        text(data.firstName),
        text(data.lastName),
        JSON.stringify(cloneJson(data.payload, {}))
      ]
    );
    return telegramAccountPayload(result.rows[0]);
  }

  async markFailed(id, error) {
    await this.ensureSchema();
    const result = await this.pool.query(
      `
        UPDATE telegram_accounts
        SET status = 'failed',
            last_error = $2,
            updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [text(id), text(error).slice(0, 1000)]
    );
    return telegramAccountPayload(result.rows[0]);
  }

  async deleteAccount(id) {
    await this.ensureSchema();
    const result = await this.pool.query(
      "DELETE FROM telegram_accounts WHERE id = $1 RETURNING *",
      [text(id)]
    );
    return telegramAccountPayload(result.rows[0]);
  }

  async cacheContact(accountId, phone, contact = {}) {
    await this.ensureSchema();
    const normalized = normalizePhone(phone);
    const digits = phoneDigits(normalized || phone);
    const payload = cloneJson(contact.payload, {});
    const result = await this.pool.query(
      `
        INSERT INTO telegram_contact_cache (
          account_id,
          phone,
          phone_digits,
          found,
          telegram_user_id,
          access_hash,
          username,
          first_name,
          last_name,
          last_checked_at,
          payload
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now(), $10::jsonb)
        ON CONFLICT (account_id, phone_digits) DO UPDATE SET
          phone = EXCLUDED.phone,
          found = EXCLUDED.found,
          telegram_user_id = EXCLUDED.telegram_user_id,
          access_hash = EXCLUDED.access_hash,
          username = EXCLUDED.username,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          last_checked_at = now(),
          payload = EXCLUDED.payload
        RETURNING *
      `,
      [
        text(accountId),
        normalized || text(phone),
        digits,
        contact.found === true,
        text(contact.telegramUserId),
        text(contact.accessHash),
        text(contact.username),
        text(contact.firstName),
        text(contact.lastName),
        JSON.stringify(payload)
      ]
    );
    return telegramContactPayload(result.rows[0]);
  }

  async cacheMessages(accountId, phone, peerKey, messages = []) {
    await this.ensureSchema();
    const normalized = normalizePhone(phone);
    const digits = phoneDigits(normalized || phone);
    for (const message of messages) {
      if (!message || !message.id) {
        continue;
      }
      await this.pool.query(
        `
          INSERT INTO telegram_message_cache (
            account_id,
            peer_key,
            message_id,
            phone,
            phone_digits,
            direction,
            message_text,
            sent_at,
            sender_id,
            payload
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
          ON CONFLICT (account_id, peer_key, message_id) DO UPDATE SET
            direction = EXCLUDED.direction,
            message_text = EXCLUDED.message_text,
            sent_at = EXCLUDED.sent_at,
            sender_id = EXCLUDED.sender_id,
            payload = EXCLUDED.payload
        `,
        [
          text(accountId),
          text(peerKey),
          integer(message.id),
          normalized || text(phone),
          digits,
          message.direction === "outgoing" ? "outgoing" : "incoming",
          text(message.text),
          optionalTimestamp(message.sentAt),
          text(message.senderId),
          JSON.stringify(cloneJson(message.payload, {}))
        ]
      );
    }
  }

  async cachedContact(accountId, phone) {
    await this.ensureSchema();
    const normalized = normalizePhone(phone);
    const digits = phoneDigits(normalized || phone);
    const result = await this.pool.query(
      `
        SELECT *
        FROM telegram_contact_cache
        WHERE account_id = $1
          AND phone_digits = $2
        ORDER BY last_checked_at DESC
        LIMIT 1
      `,
      [text(accountId), digits]
    );
    return telegramContactPayload(result.rows[0]);
  }

  async cachedConversation(accountId, phone, limit = 50) {
    await this.ensureSchema();
    const normalized = normalizePhone(phone);
    const digits = phoneDigits(normalized || phone);
    const safeLimit = Math.max(1, Math.min(integer(limit, 50), 100));
    const contact = await this.cachedContact(accountId, phone);
    const messageResult = await this.pool.query(
      `
        SELECT *
        FROM telegram_message_cache
        WHERE account_id = $1
          AND phone_digits = $2
        ORDER BY sent_at DESC NULLS LAST, message_id DESC
        LIMIT $3
      `,
      [text(accountId), digits, safeLimit]
    );
    const messages = attachCachedTelegramReplyPreviews(
      messageResult.rows
        .map((row) => {
          const payload = row.payload && typeof row.payload === "object" ? row.payload : {};
          const media = payload.media && typeof payload.media === "object"
            ? cloneJson(payload.media, null)
            : null;
          const replyToMessageId = integer(payload.replyToMessageId, 0) || null;
          return {
            id: Number(row.message_id) || 0,
            direction: row.direction === "outgoing" ? "outgoing" : "incoming",
            text: text(row.message_text),
            media,
            replyToMessageId,
            replyPreview: null,
            sentAt: optionalTimestamp(row.sent_at),
            senderId: text(row.sender_id),
            payload
          };
        })
        .reverse()
    );
    return {
      contact,
      messages
    };
  }
}

async function persistAnalysisSettings(client, settings) {
  const normalized = normalizeAiAnalysisSettings(settings);
  const revision = settingsRevision(normalized);
  const semanticRevision = settingsSemanticRevision(normalized);
  const scoringRevision = settingsScoringRevision(normalized);
  const profile = await client.query(
    `
      INSERT INTO ai_analysis_settings_profiles (
        profile_key,
        settings_version,
        schema_version,
        revision,
        semantic_revision,
        scoring_revision,
        settings_json,
        updated_at
      )
      VALUES ('default', $1, $2, $3, $4, $5, $6::jsonb, now())
      ON CONFLICT (profile_key) DO UPDATE SET
        settings_version = EXCLUDED.settings_version,
        schema_version = EXCLUDED.schema_version,
        revision = EXCLUDED.revision,
        semantic_revision = EXCLUDED.semantic_revision,
        scoring_revision = EXCLUDED.scoring_revision,
        settings_json = EXCLUDED.settings_json,
        updated_at = now()
      RETURNING id
    `,
    [
      integer(normalized.version, 1),
      text(normalized.schemaVersion),
      revision,
      semanticRevision,
      scoringRevision,
      JSON.stringify(normalized)
    ]
  );
  const profileId = profile.rows[0].id;

  await client.query("DELETE FROM ai_analysis_call_types WHERE profile_id = $1", [
    profileId
  ]);

  for (const callType of normalized.callTypes || []) {
    const callTypeResult = await client.query(
      `
        INSERT INTO ai_analysis_call_types (
          profile_id,
          call_type_key,
          label,
          description,
          ai_brief,
          color,
          enabled,
          sort_order,
          payload
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
        RETURNING id
      `,
      [
        profileId,
        text(callType.key),
        text(callType.label),
        text(callType.description),
        text(callType.aiBrief),
        text(callType.color, "#94a3b8"),
        callType.enabled !== false,
        numeric(callType.order, 0),
        JSON.stringify(callType)
      ]
    );
    const callTypeId = callTypeResult.rows[0].id;

    for (const metric of callType.metrics || []) {
      const metricResult = await client.query(
        `
          INSERT INTO ai_analysis_metrics (
            call_type_id,
            metric_key,
            label,
            metric_group,
            metric_type,
            description,
            ai_instructions,
            ai_brief,
            enabled,
            sort_order,
            weight,
            payload
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
          RETURNING id
        `,
        [
          callTypeId,
          text(metric.key),
          text(metric.label),
          text(metric.group),
          text(metric.type, "ai_option"),
          text(metric.description),
          text(metric.aiInstructions),
          text(metric.aiBrief),
          metric.enabled !== false,
          numeric(metric.order, 0),
          numeric(metric.weight, 1),
          JSON.stringify(metric)
        ]
      );
      const metricId = metricResult.rows[0].id;

      for (const option of metric.options || []) {
        await client.query(
          `
            INSERT INTO ai_analysis_metric_options (
              metric_id,
              option_key,
              label,
              score,
              color,
              counts_toward_score,
              ai_instructions,
              ai_brief,
              sort_order,
              payload
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
          `,
          [
            metricId,
            text(option.key),
            text(option.label),
            option.score === null || option.score === undefined
              ? null
              : numeric(option.score, 0),
            text(option.color, "#94a3b8"),
            option.countsTowardScore !== false && option.score !== null,
            text(option.aiInstructions),
            text(option.aiBrief),
            numeric(option.order, 0),
            JSON.stringify(option)
          ]
        );
      }
    }
  }

  return normalized;
}

class PostgresAiAnalysisSettingsStore {
  constructor(pool) {
    this.pool = pool;
    this.loaded = false;
    this.settings = createDefaultAiAnalysisSettings();
  }

  async load() {
    if (this.loaded) {
      return;
    }

    const result = await this.pool.query(
      `
        SELECT settings_json
        FROM ai_analysis_settings_profiles
        WHERE profile_key = 'default'
      `
    );

    if (result.rows.length) {
      this.settings = normalizeAiAnalysisSettings(result.rows[0].settings_json);
    } else {
      await this.persist();
    }

    this.loaded = true;
  }

  async get() {
    await this.load();
    return cloneJson(this.settings);
  }

  async getProfile() {
    const settings = await this.get();
    return {
      settings,
      schemaVersion: settings.schemaVersion,
      revision: settingsRevision(settings),
      semanticRevision: settingsSemanticRevision(settings),
      scoringRevision: settingsScoringRevision(settings)
    };
  }

  async getPublicSettings() {
    const profile = await this.getProfile();
    return {
      ok: true,
      ...profile
    };
  }

  async update(value) {
    await this.load();
    this.settings = normalizeAiAnalysisSettings(value);
    await this.persist();
    return this.getPublicSettings();
  }

  async reset() {
    await this.load();
    this.settings = createDefaultAiAnalysisSettings();
    await this.persist();
    return this.getPublicSettings();
  }

  async persist() {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      this.settings = await persistAnalysisSettings(client, this.settings);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
}

function callSummaryColumns(entry) {
  const summary = entry.summary || {};
  const customEvaluation = summary.customEvaluation || {};
  const analysisProfile = entry.analysisProfile || summary.analysisProfile || {};
  const models = entry.models || {};
  const transcription = entry.transcription || {};

  return {
    callId: text(entry.callId || entry.id),
    generalCallId: text(entry.generalCallId || entry.callId || entry.id),
    phone: text(entry.phone),
    phoneDigits: phoneDigits(entry.phone),
    callStartedAt: optionalTimestamp(entry.callStartedAt),
    callDurationSec: entry.callDurationSec === undefined
      ? null
      : integer(entry.callDurationSec, 0),
    status: text(entry.status, "queued"),
    stage: text(entry.stage),
    attempts: integer(entry.attempts, 0),
    terminalFailure: Boolean(entry.terminalFailure),
    message: text(entry.message),
    error: text(entry.error),
    summaryText: text(summary.summary) || null,
    summaryModel: text(models.summary || summary.model),
    transcriptionModel: text(models.transcription),
    transcriptionProvider: text(transcription.provider),
    summaryVersion: text(entry.version || summary.version),
    analysisSchemaVersion: text(analysisProfile.schemaVersion),
    analysisRevision: text(analysisProfile.revision),
    analysisSemanticRevision: text(analysisProfile.semanticRevision),
    analysisScoringRevision: text(analysisProfile.scoringRevision),
    callType: text(summary.callType || customEvaluation.matchedCallType) || null,
    callTypeLabel: text(summary.callTypeLabel) || null,
    callTypeConfidence: optionalNumber(summary.callTypeConfidence),
    customOverallScore: optionalNumber(customEvaluation.overallScore),
    confidence: optionalNumber(summary.confidence),
    createdAt: optionalTimestamp(entry.createdAt) || nowIso(),
    updatedAt: optionalTimestamp(entry.updatedAt) || nowIso(),
    processingStartedAt: optionalTimestamp(entry.startedAt),
    completedAt: optionalTimestamp(entry.completedAt),
    summaryPayload: cloneJson(entry.summary),
    transcriptPayload: cloneJson(entry.transcript),
    transcriptionPayload: cloneJson(entry.transcription),
    modelsPayload: cloneJson(entry.models),
    recordingPayload: cloneJson(entry.recording),
    usagePayload: cloneJson(entry.usage),
    clientContextPayload: cloneJson(entry.clientContext),
    payload: cloneJson(entry, {})
  };
}

async function writeCallSummaryDetails(client, callId, entry) {
  await client.query("DELETE FROM call_summary_transcript_segments WHERE call_id = $1", [callId]);
  await client.query("DELETE FROM call_summary_speakers WHERE call_id = $1", [callId]);
  await client.query("DELETE FROM call_summary_metric_results WHERE call_id = $1", [callId]);
  await client.query("DELETE FROM call_summary_usage WHERE call_id = $1", [callId]);

  const segments = Array.isArray(entry.transcript && entry.transcript.segments)
    ? entry.transcript.segments
    : [];
  if (segments.length) {
    const segmentRows = segments.map((segment, index) => ({
      segment_index: index,
      speaker: text(segment && segment.speaker),
      started_sec: optionalNumber(segment && segment.start),
      ended_sec: optionalNumber(segment && segment.end),
      segment_text: text(segment && segment.text),
      payload: cloneJson(segment, {})
    }));
    await client.query(
      `
        INSERT INTO call_summary_transcript_segments (
          call_id, segment_index, speaker, started_sec, ended_sec, text, payload
        )
        SELECT
          $1,
          item.segment_index,
          item.speaker,
          item.started_sec,
          item.ended_sec,
          item.segment_text,
          item.payload
        FROM jsonb_to_recordset($2::jsonb) AS item(
          segment_index integer,
          speaker text,
          started_sec numeric,
          ended_sec numeric,
          segment_text text,
          payload jsonb
        )
      `,
      [
        callId,
        JSON.stringify(segmentRows)
      ]
    );
  }

  const speakers = Array.isArray(entry.summary && entry.summary.speakers)
    ? entry.summary.speakers
    : [];
  if (speakers.length) {
    const speakerRows = speakers.map((speaker) => ({
      speaker: text(speaker && speaker.speaker),
      role: text(speaker && speaker.role, "unknown"),
      evidence: text(speaker && speaker.evidence) || null,
      payload: cloneJson(speaker, {})
    }));
    await client.query(
      `
        INSERT INTO call_summary_speakers (
          call_id, speaker, role, evidence, payload
        )
        SELECT $1, item.speaker, item.role, item.evidence, item.payload
        FROM jsonb_to_recordset($2::jsonb) AS item(
          speaker text,
          role text,
          evidence text,
          payload jsonb
        )
        ON CONFLICT (call_id, speaker) DO UPDATE SET
          role = EXCLUDED.role,
          evidence = EXCLUDED.evidence,
          payload = EXCLUDED.payload
      `,
      [
        callId,
        JSON.stringify(speakerRows)
      ]
    );
  }

  const metrics = Array.isArray(
    entry.summary &&
      entry.summary.customEvaluation &&
      entry.summary.customEvaluation.metrics
  )
    ? entry.summary.customEvaluation.metrics
    : [];
  if (metrics.length) {
    const metricRows = metrics.map((metric) => ({
      metric_key: text(metric.metricKey),
      metric_label: text(metric.metricLabel),
      metric_group: text(metric.metricGroup),
      selected_option_key: text(metric.selectedOptionKey),
      selected_option_label: text(metric.selectedOptionLabel),
      score: optionalNumber(metric.score),
      max_score: optionalNumber(metric.maxScore),
      color: text(metric.color, "#94a3b8"),
      counts_toward_score: metric.countsTowardScore !== false,
      evidence: text(metric.evidence) || null,
      improvement: text(metric.improvement) || null,
      confidence: optionalNumber(metric.confidence),
      payload: cloneJson(metric, {})
    }));
    await client.query(
      `
        INSERT INTO call_summary_metric_results (
          call_id,
          metric_key,
          metric_label,
          metric_group,
          selected_option_key,
          selected_option_label,
          score,
          max_score,
          color,
          counts_toward_score,
          evidence,
          improvement,
          confidence,
          payload
        )
        SELECT
          $1,
          item.metric_key,
          item.metric_label,
          item.metric_group,
          item.selected_option_key,
          item.selected_option_label,
          item.score,
          item.max_score,
          item.color,
          item.counts_toward_score,
          item.evidence,
          item.improvement,
          item.confidence,
          item.payload
        FROM jsonb_to_recordset($2::jsonb) AS item(
          metric_key text,
          metric_label text,
          metric_group text,
          selected_option_key text,
          selected_option_label text,
          score numeric,
          max_score numeric,
          color text,
          counts_toward_score boolean,
          evidence text,
          improvement text,
          confidence numeric,
          payload jsonb
        )
      `,
      [
        callId,
        JSON.stringify(metricRows)
      ]
    );
  }

  const summaryUsage = entry.usage && (entry.usage.summary || entry.usage);
  if (summaryUsage && typeof summaryUsage === "object") {
    const usageEntries = [["summary", summaryUsage]];
    const steps = summaryUsage.steps || {};
    for (const [scope, value] of Object.entries(steps)) {
      if (value && typeof value === "object") {
        usageEntries.push([scope, value]);
      }
    }

    const usageRows = usageEntries.map(([scope, usage]) => ({
      scope,
      input_tokens: integer(usage.inputTokens, 0),
      cached_input_tokens: integer(usage.cachedInputTokens, 0),
      billable_input_tokens: integer(usage.billableInputTokens, 0),
      output_tokens: integer(usage.outputTokens, 0),
      reasoning_tokens: integer(usage.reasoningTokens, 0),
      total_tokens: integer(usage.totalTokens, 0),
      payload: cloneJson(usage, {})
    }));
    if (usageRows.length) {
      await client.query(
        `
          INSERT INTO call_summary_usage (
            call_id,
            scope,
            input_tokens,
            cached_input_tokens,
            billable_input_tokens,
            output_tokens,
            reasoning_tokens,
            total_tokens,
            payload
          )
          SELECT
            $1,
            item.scope,
            item.input_tokens,
            item.cached_input_tokens,
            item.billable_input_tokens,
            item.output_tokens,
            item.reasoning_tokens,
            item.total_tokens,
            item.payload
          FROM jsonb_to_recordset($2::jsonb) AS item(
            scope text,
            input_tokens integer,
            cached_input_tokens integer,
            billable_input_tokens integer,
            output_tokens integer,
            reasoning_tokens integer,
            total_tokens integer,
            payload jsonb
          )
        `,
        [
          callId,
          JSON.stringify(usageRows)
        ]
      );
    }
  }
}

async function writeCallSummary(client, entry) {
  const columns = callSummaryColumns(entry);

  await client.query(
    `
      INSERT INTO call_summaries (
        call_id,
        general_call_id,
        phone,
        phone_digits,
        call_started_at,
        call_duration_sec,
        status,
        stage,
        attempts,
        terminal_failure,
        message,
        error,
        summary_text,
        summary_model,
        transcription_model,
        transcription_provider,
        summary_version,
        analysis_schema_version,
        analysis_revision,
        analysis_semantic_revision,
        analysis_scoring_revision,
        call_type,
        call_type_label,
        call_type_confidence,
        custom_overall_score,
        confidence,
        created_at,
        updated_at,
        processing_started_at,
        completed_at,
        summary_payload,
        transcript_payload,
        transcription_payload,
        models_payload,
        recording_payload,
        usage_payload,
        client_context_payload,
        payload
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24,
        $25, $26, $27, $28, $29, $30,
        $31::jsonb, $32::jsonb, $33::jsonb, $34::jsonb,
        $35::jsonb, $36::jsonb, $37::jsonb, $38::jsonb
      )
      ON CONFLICT (call_id) DO UPDATE SET
        general_call_id = EXCLUDED.general_call_id,
        phone = EXCLUDED.phone,
        phone_digits = EXCLUDED.phone_digits,
        call_started_at = EXCLUDED.call_started_at,
        call_duration_sec = EXCLUDED.call_duration_sec,
        status = EXCLUDED.status,
        stage = EXCLUDED.stage,
        attempts = EXCLUDED.attempts,
        terminal_failure = EXCLUDED.terminal_failure,
        message = EXCLUDED.message,
        error = EXCLUDED.error,
        summary_text = EXCLUDED.summary_text,
        summary_model = EXCLUDED.summary_model,
        transcription_model = EXCLUDED.transcription_model,
        transcription_provider = EXCLUDED.transcription_provider,
        summary_version = EXCLUDED.summary_version,
        analysis_schema_version = EXCLUDED.analysis_schema_version,
        analysis_revision = EXCLUDED.analysis_revision,
        analysis_semantic_revision = EXCLUDED.analysis_semantic_revision,
        analysis_scoring_revision = EXCLUDED.analysis_scoring_revision,
        call_type = EXCLUDED.call_type,
        call_type_label = EXCLUDED.call_type_label,
        call_type_confidence = EXCLUDED.call_type_confidence,
        custom_overall_score = EXCLUDED.custom_overall_score,
        confidence = EXCLUDED.confidence,
        updated_at = EXCLUDED.updated_at,
        processing_started_at = EXCLUDED.processing_started_at,
        completed_at = EXCLUDED.completed_at,
        summary_payload = EXCLUDED.summary_payload,
        transcript_payload = EXCLUDED.transcript_payload,
        transcription_payload = EXCLUDED.transcription_payload,
        models_payload = EXCLUDED.models_payload,
        recording_payload = EXCLUDED.recording_payload,
        usage_payload = EXCLUDED.usage_payload,
        client_context_payload = EXCLUDED.client_context_payload,
        payload = EXCLUDED.payload
    `,
    [
      columns.callId,
      columns.generalCallId,
      columns.phone,
      columns.phoneDigits,
      columns.callStartedAt,
      columns.callDurationSec,
      columns.status,
      columns.stage,
      columns.attempts,
      columns.terminalFailure,
      columns.message,
      columns.error,
      columns.summaryText,
      columns.summaryModel,
      columns.transcriptionModel,
      columns.transcriptionProvider,
      columns.summaryVersion,
      columns.analysisSchemaVersion,
      columns.analysisRevision,
      columns.analysisSemanticRevision,
      columns.analysisScoringRevision,
      columns.callType,
      columns.callTypeLabel,
      columns.callTypeConfidence,
      columns.customOverallScore,
      columns.confidence,
      columns.createdAt,
      columns.updatedAt,
      columns.processingStartedAt,
      columns.completedAt,
      JSON.stringify(columns.summaryPayload),
      JSON.stringify(columns.transcriptPayload),
      JSON.stringify(columns.transcriptionPayload),
      JSON.stringify(columns.modelsPayload),
      JSON.stringify(columns.recordingPayload),
      JSON.stringify(columns.usagePayload),
      JSON.stringify(columns.clientContextPayload),
      JSON.stringify(columns.payload)
    ]
  );

  await writeCallSummaryDetails(client, columns.callId, entry);
  return columns.payload;
}

class PostgresCallSummaryStore {
  constructor(pool) {
    this.pool = pool;
  }

  async get(callId) {
    const result = await this.pool.query(
      "SELECT payload FROM call_summaries WHERE call_id = $1",
      [String(callId)]
    );
    return result.rows[0] ? result.rows[0].payload : null;
  }

  async upsert(callId, patch) {
    const id = String(callId);
    const current = await this.get(id);
    const now = nowIso();
    const entry = {
      id,
      createdAt: now,
      attempts: 0,
      ...(current || {}),
      ...(patch || {}),
      id,
      callId: text((patch && patch.callId) || (current && current.callId), id),
      generalCallId: text(
        (patch && patch.generalCallId) || (current && current.generalCallId),
        id
      ),
      updatedAt: now
    };

    return this.replace(id, entry);
  }

  async replace(callId, entry) {
    const id = String(callId);
    const payload = {
      ...(entry || {}),
      id: text(entry && entry.id, id),
      callId: text(entry && entry.callId, id),
      generalCallId: text(entry && entry.generalCallId, id)
    };
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const written = await writeCallSummary(client, payload);
      await client.query("COMMIT");
      return written;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
}

function syncFromRow(row) {
  return {
    monitorSinceTimestamp: integer(row && row.monitor_since_timestamp, 0),
    aiAnalysisSinceTimestamp: integer(row && row.ai_analysis_since_timestamp, 0),
    firstStartedAt: row && row.first_started_at
      ? new Date(row.first_started_at).toISOString()
      : null,
    lastIncomingTimestamp: integer(row && row.last_incoming_timestamp, 0),
    lastOutgoingTimestamp: integer(row && row.last_outgoing_timestamp, 0),
    lastSyncAt: row && row.last_sync_at ? new Date(row.last_sync_at).toISOString() : null,
    lastError: text(row && row.last_error),
    lastResult: row ? row.last_result : null
  };
}

function callIdFromCall(call) {
  return text(call && (call.generalCallId || call.id || call.callId));
}

function monitorAnalyticsRow(row) {
  const callId = text(row && row.call_id);
  const generalCallId = text(row && row.general_call_id, callId);
  const summaryPayload = cloneJson(row && row.summary_payload, {}) || {};
  const metrics = Array.isArray(row && row.metrics) ? row.metrics : [];
  const customEvaluation = {
    ...(summaryPayload.customEvaluation || {})
  };
  if (metrics.length) {
    customEvaluation.metrics = metrics;
  }

  const summary = {
    ...summaryPayload,
    callType: text(summaryPayload.callType || (row && row.summary_call_type)),
    callTypeLabel: text(summaryPayload.callTypeLabel || (row && row.summary_call_type_label))
  };
  if (customEvaluation.metrics) {
    summary.customEvaluation = customEvaluation;
  }

  const usage = row && row.usage_scope
    ? {
        summary: {
          inputTokens: integer(row.input_tokens, 0),
          cachedInputTokens: integer(row.cached_input_tokens, 0),
          billableInputTokens: integer(row.billable_input_tokens, 0),
          outputTokens: integer(row.output_tokens, 0),
          reasoningTokens: integer(row.reasoning_tokens, 0),
          totalTokens: integer(row.total_tokens, 0)
        }
      }
    : null;

  return {
    call: {
      id: callId,
      callId,
      generalCallId,
      startedAt: optionalTimestamp(row && row.started_at),
      billSec: integer(row && row.bill_sec, 0),
      disposition: text(row && row.disposition),
      recordingStatus: text(row && row.recording_status)
    },
    ai: row && row.ai_status
      ? {
          status: text(row.ai_status),
          callId: text(row.summary_call_id, generalCallId),
          generalCallId,
          callStartedAt: optionalTimestamp(row.call_started_at),
          updatedAt: optionalTimestamp(row.summary_updated_at),
          completedAt: optionalTimestamp(row.completed_at),
          summary,
          error: text(row.summary_error),
          message: text(row.summary_message),
          attempts: integer(row.summary_attempts, 0),
          terminalFailure: Boolean(row.terminal_failure),
          usage,
          models: {
            summary: text(row.summary_model),
            transcription: text(row.transcription_model)
          },
          callDurationSec: integer(row.call_duration_sec, row.bill_sec)
        }
      : null
  };
}

function binotelCallColumns(call, currentPayload, options = {}) {
  const now = nowIso();
  const current = currentPayload || {};
  const payload = {
    ...current,
    ...(call || {})
  };
  const id = callIdFromCall(payload);
  payload.id = id;
  payload.callId = text(payload.callId, id);
  payload.generalCallId = text(payload.generalCallId, id);
  payload.firstSeenAt = options.preserveTimestamps
    ? optionalTimestamp(payload.firstSeenAt) || now
    : optionalTimestamp(current.firstSeenAt) || optionalTimestamp(payload.firstSeenAt) || now;
  payload.updatedAt = options.preserveTimestamps
    ? optionalTimestamp(payload.updatedAt) || now
    : now;

  return {
    payload,
    callId: id,
    generalCallId: text(payload.generalCallId, id),
    startedAt: optionalTimestamp(payload.startedAt),
    callType: text(payload.type),
    typeLabel: text(payload.typeLabel),
    internalNumber: text(payload.internalNumber),
    internalAdditionalData: text(payload.internalAdditionalData),
    externalNumber: text(payload.externalNumber),
    externalDigits: phoneDigits(payload.externalNumber),
    waitSec: integer(payload.waitSec, 0),
    billSec: integer(payload.billSec, 0),
    disposition: text(payload.disposition),
    dispositionLabel: text(payload.dispositionLabel),
    recordingStatus: text(payload.recordingStatus),
    recordingStatusLabel: text(payload.recordingStatusLabel),
    isNewCall: Boolean(payload.isNewCall),
    whoHungUp: text(payload.whoHungUp),
    aiEligible: Boolean(payload.aiEligible),
    monitorCollectedAt: optionalTimestamp(payload.monitorCollectedAt),
    firstSeenAt: payload.firstSeenAt,
    updatedAt: payload.updatedAt,
    recordingCacheStatus: text(payload.recordingCacheStatus),
    recordingCacheError: text(payload.recordingCacheError),
    recordingCacheUpdatedAt: optionalTimestamp(payload.recordingCacheUpdatedAt),
    customerPayload: cloneJson(payload.customer, {}),
    employeePayload: cloneJson(payload.employee, {}),
    pbxNumberPayload: cloneJson(payload.pbxNumber, {}),
    historyPayload: cloneJson(payload.history, [])
  };
}

function analysisInternalNumberEnabledClause(alias) {
  const prefix = alias ? `${alias}.` : "";
  return `NOT EXISTS (
    SELECT 1
    FROM ai_analysis_internal_numbers analysis_numbers
    WHERE analysis_numbers.internal_number = ${prefix}internal_number
      AND analysis_numbers.enabled = false
  )`;
}

async function upsertBinotelCall(client, call, currentPayload, options = {}) {
  const columns = binotelCallColumns(call, currentPayload, options);
  if (!columns.callId) {
    return null;
  }

  await client.query(
    `
      INSERT INTO binotel_calls (
        call_id,
        general_call_id,
        started_at,
        call_type,
        type_label,
        internal_number,
        internal_additional_data,
        external_number,
        external_digits,
        wait_sec,
        bill_sec,
        disposition,
        disposition_label,
        recording_status,
        recording_status_label,
        is_new_call,
        who_hung_up,
        ai_eligible,
        monitor_collected_at,
        first_seen_at,
        updated_at,
        recording_cache_status,
        recording_cache_error,
        recording_cache_updated_at,
        customer_payload,
        employee_payload,
        pbx_number_payload,
        history_payload,
        payload
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24,
        $25::jsonb, $26::jsonb, $27::jsonb, $28::jsonb, $29::jsonb
      )
      ON CONFLICT (call_id) DO UPDATE SET
        general_call_id = EXCLUDED.general_call_id,
        started_at = EXCLUDED.started_at,
        call_type = EXCLUDED.call_type,
        type_label = EXCLUDED.type_label,
        internal_number = EXCLUDED.internal_number,
        internal_additional_data = EXCLUDED.internal_additional_data,
        external_number = EXCLUDED.external_number,
        external_digits = EXCLUDED.external_digits,
        wait_sec = EXCLUDED.wait_sec,
        bill_sec = EXCLUDED.bill_sec,
        disposition = EXCLUDED.disposition,
        disposition_label = EXCLUDED.disposition_label,
        recording_status = EXCLUDED.recording_status,
        recording_status_label = EXCLUDED.recording_status_label,
        is_new_call = EXCLUDED.is_new_call,
        who_hung_up = EXCLUDED.who_hung_up,
        ai_eligible = EXCLUDED.ai_eligible,
        monitor_collected_at = EXCLUDED.monitor_collected_at,
        first_seen_at = EXCLUDED.first_seen_at,
        updated_at = EXCLUDED.updated_at,
        recording_cache_status = EXCLUDED.recording_cache_status,
        recording_cache_error = EXCLUDED.recording_cache_error,
        recording_cache_updated_at = EXCLUDED.recording_cache_updated_at,
        customer_payload = EXCLUDED.customer_payload,
        employee_payload = EXCLUDED.employee_payload,
        pbx_number_payload = EXCLUDED.pbx_number_payload,
        history_payload = EXCLUDED.history_payload,
        payload = EXCLUDED.payload
    `,
    [
      columns.callId,
      columns.generalCallId,
      columns.startedAt,
      columns.callType,
      columns.typeLabel,
      columns.internalNumber,
      columns.internalAdditionalData,
      columns.externalNumber,
      columns.externalDigits,
      columns.waitSec,
      columns.billSec,
      columns.disposition,
      columns.dispositionLabel,
      columns.recordingStatus,
      columns.recordingStatusLabel,
      columns.isNewCall,
      columns.whoHungUp,
      columns.aiEligible,
      columns.monitorCollectedAt,
      columns.firstSeenAt,
      columns.updatedAt,
      columns.recordingCacheStatus,
      columns.recordingCacheError,
      columns.recordingCacheUpdatedAt,
      JSON.stringify(columns.customerPayload),
      JSON.stringify(columns.employeePayload),
      JSON.stringify(columns.pbxNumberPayload),
      JSON.stringify(columns.historyPayload),
      JSON.stringify(columns.payload)
    ]
  );

  return columns.payload;
}

class PostgresBinotelMonitorStore {
  constructor(pool, options = {}) {
    this.pool = pool;
    this.maxCalls = options.maxCalls === undefined ? 2000 : Number(options.maxCalls);
    this.analysisInternalNumbersSchemaPromise = null;
  }

  async ensureAnalysisInternalNumbersSchema() {
    if (!this.analysisInternalNumbersSchemaPromise) {
      this.analysisInternalNumbersSchemaPromise = this.pool.query(
        `
          CREATE TABLE IF NOT EXISTS ai_analysis_internal_numbers (
            internal_number text PRIMARY KEY,
            enabled boolean NOT NULL DEFAULT true,
            label text NOT NULL DEFAULT '',
            notes text NOT NULL DEFAULT '',
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
          );

          CREATE INDEX IF NOT EXISTS ai_analysis_internal_numbers_enabled_idx
            ON ai_analysis_internal_numbers (enabled, internal_number);

          CREATE INDEX IF NOT EXISTS binotel_calls_internal_number_started_at_idx
            ON binotel_calls (internal_number, started_at DESC NULLS LAST);
        `
      ).catch((error) => {
        this.analysisInternalNumbersSchemaPromise = null;
        throw error;
      });
    }

    return this.analysisInternalNumbersSchemaPromise;
  }

  async analysisInternalNumbers() {
    await this.ensureAnalysisInternalNumbersSchema();
    const result = await this.pool.query(
      `
        WITH call_counts AS (
          SELECT
            internal_number,
            COUNT(*)::int AS total_calls,
            MAX(started_at) AS last_call_at
          FROM binotel_calls
          WHERE internal_number <> ''
          GROUP BY internal_number
        ),
        latest_call AS (
          SELECT DISTINCT ON (internal_number)
            internal_number,
            employee_payload,
            pbx_number_payload
          FROM binotel_calls
          WHERE internal_number <> ''
          ORDER BY internal_number, started_at DESC NULLS LAST, call_id DESC
        )
        SELECT
          COALESCE(call_counts.internal_number, settings.internal_number) AS internal_number,
          COALESCE(settings.enabled, true) AS enabled,
          COALESCE(NULLIF(settings.label, ''), '') AS custom_label,
          COALESCE(NULLIF(settings.notes, ''), '') AS notes,
          COALESCE(NULLIF(latest_call.employee_payload->>'name', ''), '') AS employee_name,
          COALESCE(NULLIF(latest_call.pbx_number_payload->>'name', ''), '') AS pbx_name,
          COALESCE(NULLIF(latest_call.pbx_number_payload->>'number', ''), '') AS pbx_number,
          COALESCE(call_counts.total_calls, 0)::int AS total_calls,
          call_counts.last_call_at,
          settings.updated_at,
          settings.internal_number IS NOT NULL AS configured
        FROM call_counts
        FULL JOIN ai_analysis_internal_numbers settings
          ON settings.internal_number = call_counts.internal_number
        LEFT JOIN latest_call
          ON latest_call.internal_number = COALESCE(call_counts.internal_number, settings.internal_number)
        ORDER BY internal_number
      `
    );
    const numbers = result.rows
      .map((row) => {
        const number = text(row.internal_number);
        const employeeName = text(row.employee_name);
        const pbxName = text(row.pbx_name);
        const customLabel = text(row.custom_label);
        return {
          number,
          label: customLabel || employeeName || pbxName || (number ? `вн. ${number}` : ""),
          customLabel,
          employeeName,
          pbxName,
          pbxNumber: text(row.pbx_number),
          notes: text(row.notes),
          enabled: row.enabled !== false,
          totalCalls: integer(row.total_calls, 0),
          lastCallAt: optionalTimestamp(row.last_call_at),
          updatedAt: optionalTimestamp(row.updated_at),
          configured: Boolean(row.configured)
        };
      })
      .filter((item) => item.number);

    numbers.sort((a, b) => {
      const left = Number(a.number);
      const right = Number(b.number);
      if (Number.isFinite(left) && Number.isFinite(right) && left !== right) {
        return left - right;
      }
      return a.number.localeCompare(b.number, "uk");
    });

    return {
      numbers,
      enabledCount: numbers.filter((item) => item.enabled).length,
      disabledCount: numbers.filter((item) => !item.enabled).length
    };
  }

  async updateAnalysisInternalNumbers(items = []) {
    await this.ensureAnalysisInternalNumbersSchema();
    const rows = Array.isArray(items) ? items : [];
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");
      for (const item of rows) {
        const number = text(
          item && (item.number || item.internalNumber || item.internal_number)
        );
        if (!number) {
          continue;
        }
        await client.query(
          `
            INSERT INTO ai_analysis_internal_numbers (
              internal_number,
              enabled,
              label,
              notes,
              updated_at
            )
            VALUES ($1, $2, $3, $4, now())
            ON CONFLICT (internal_number) DO UPDATE SET
              enabled = EXCLUDED.enabled,
              label = EXCLUDED.label,
              notes = EXCLUDED.notes,
              updated_at = now()
          `,
          [
            number,
            item && item.enabled !== false,
            text(item && (item.customLabel || item.label)),
            text(item && item.notes)
          ]
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }

    return this.analysisInternalNumbers();
  }

  async disabledAnalysisInternalNumbers() {
    await this.ensureAnalysisInternalNumbersSchema();
    const result = await this.pool.query(
      `
        SELECT internal_number
        FROM ai_analysis_internal_numbers
        WHERE enabled = false
      `
    );
    return new Set(result.rows.map((row) => text(row.internal_number)).filter(Boolean));
  }

  async syncState() {
    const result = await this.pool.query(
      "SELECT * FROM binotel_monitor_sync WHERE id = true"
    );
    return syncFromRow(result.rows[0]);
  }

  async getCall(callId) {
    const result = await this.pool.query(
      "SELECT payload FROM binotel_calls WHERE call_id = $1",
      [String(callId || "")]
    );
    return result.rows[0] ? result.rows[0].payload : null;
  }

  async updateSync(patch) {
    const current = await this.syncState();
    const next = {
      ...current,
      ...(patch || {})
    };

    await this.pool.query(
      `
        INSERT INTO binotel_monitor_sync (
          id,
          monitor_since_timestamp,
          ai_analysis_since_timestamp,
          first_started_at,
          last_incoming_timestamp,
          last_outgoing_timestamp,
          last_sync_at,
          last_error,
          last_result,
          updated_at
        )
        VALUES (true, $1, $2, $3, $4, $5, $6, $7, $8::jsonb, now())
        ON CONFLICT (id) DO UPDATE SET
          monitor_since_timestamp = EXCLUDED.monitor_since_timestamp,
          ai_analysis_since_timestamp = EXCLUDED.ai_analysis_since_timestamp,
          first_started_at = EXCLUDED.first_started_at,
          last_incoming_timestamp = EXCLUDED.last_incoming_timestamp,
          last_outgoing_timestamp = EXCLUDED.last_outgoing_timestamp,
          last_sync_at = EXCLUDED.last_sync_at,
          last_error = EXCLUDED.last_error,
          last_result = EXCLUDED.last_result,
          updated_at = now()
      `,
      [
        integer(next.monitorSinceTimestamp, 0),
        integer(next.aiAnalysisSinceTimestamp, 0),
        optionalTimestamp(next.firstStartedAt),
        integer(next.lastIncomingTimestamp, 0),
        integer(next.lastOutgoingTimestamp, 0),
        optionalTimestamp(next.lastSyncAt),
        text(next.lastError),
        JSON.stringify(cloneJson(next.lastResult, null))
      ]
    );

    return this.syncState();
  }

  async upsertCalls(calls, options = {}) {
    const client = await this.pool.connect();
    let added = 0;
    let updated = 0;

    try {
      await client.query("BEGIN");

      for (const call of calls || []) {
        const id = callIdFromCall(call);
        if (!id) {
          continue;
        }
        const existing = await client.query(
          "SELECT payload FROM binotel_calls WHERE call_id = $1",
          [id]
        );
        if (existing.rows.length) {
          updated += 1;
        } else {
          added += 1;
        }
        await upsertBinotelCall(
          client,
          call,
          existing.rows[0] && existing.rows[0].payload,
          options
        );
      }

      if (this.maxCalls > 0) {
        await client.query(
          `
            DELETE FROM binotel_calls
            WHERE call_id IN (
              SELECT call_id
              FROM binotel_calls
              ORDER BY started_at DESC NULLS LAST, call_id DESC
              OFFSET $1
            )
          `,
          [this.maxCalls]
        );
      }

      const total = await client.query("SELECT COUNT(*)::int AS count FROM binotel_calls");
      await client.query("COMMIT");
      return {
        added,
        updated,
        total: total.rows[0].count
      };
    } catch (error) {
      await client.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async updateCall(callId, patch) {
    const id = String(callId || "");
    if (!id) {
      return null;
    }
    const current = await this.getCall(id);
    if (!current) {
      return null;
    }

    const merged = {
      ...current,
      ...(patch || {}),
      id,
      callId: text(current.callId, id),
      generalCallId: text(current.generalCallId, id)
    };
    await this.upsertCalls([merged]);
    return this.getCall(id);
  }

  async list(options = {}) {
    await this.ensureAnalysisInternalNumbersSchema();
    const limit = Math.max(
      1,
      Math.min(Number(options.limit || 100), this.maxCalls || 5000, 5000)
    );
    const offset = Math.max(0, Number(options.offset || 0));
    const query = text(options.query).toLowerCase();
    const queryDigits = query.replace(/\D/g, "");
    const callType = text(options.callType).toLowerCase();
    const problem = text(options.problem).toLowerCase();
    const clauses = [];
    const values = [];
    const callTypeExpression =
      "COALESCE(NULLIF(summaries.call_type, ''), NULLIF(summaries.summary_payload->>'callType', ''), '')";
    const escalationProblemClause =
      "(summaries.summary_payload->'escalation'->>'needed') = 'true'";
    const churnRiskProblemClause =
      "lower(COALESCE(summaries.summary_payload->'churnRisk'->>'level', '')) IN ('medium', 'high')";

    if (options.includeDisabledInternalNumbers !== true) {
      clauses.push(analysisInternalNumberEnabledClause("calls"));
    }

    if (options.since) {
      values.push(optionalTimestamp(options.since));
      clauses.push(`calls.started_at >= $${values.length}`);
    }

    if (query) {
      values.push(`%${query}%`);
      const textParam = `$${values.length}`;
      values.push(`%${queryDigits}%`);
      const digitsParam = `$${values.length}`;
      clauses.push(`(
        lower(calls.external_number) LIKE ${textParam}
        OR lower(calls.internal_number) LIKE ${textParam}
        OR lower(calls.call_id) LIKE ${textParam}
        OR lower(calls.employee_payload::text) LIKE ${textParam}
        OR (${digitsParam} <> '%%' AND calls.external_digits LIKE ${digitsParam})
      )`);
    }

    if (callType) {
      if (callType === "__none") {
        clauses.push(`${callTypeExpression} = ''`);
      } else {
        values.push(callType);
        clauses.push(`lower(${callTypeExpression}) = $${values.length}`);
      }
    }

    if (problem === "problem") {
      clauses.push(`(${escalationProblemClause} OR ${churnRiskProblemClause})`);
    } else if (problem === "escalation") {
      clauses.push(escalationProblemClause);
    } else if (problem === "churnrisk") {
      clauses.push(churnRiskProblemClause);
    }

    values.push(limit);
    const limitParam = `$${values.length}`;
    values.push(offset);
    const offsetParam = `$${values.length}`;

    const result = await this.pool.query(
      `
        SELECT calls.payload, COUNT(*) OVER ()::int AS total
        FROM binotel_calls calls
        LEFT JOIN call_summaries summaries
          ON summaries.call_id = calls.general_call_id
        ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
        ORDER BY calls.started_at DESC NULLS LAST, calls.call_id DESC
        LIMIT ${limitParam}
        OFFSET ${offsetParam}
      `,
      values
    );

    return {
      total: result.rows[0] ? result.rows[0].total : 0,
      limit,
      offset,
      calls: result.rows.map((row) => row.payload)
    };
  }

  async analytics(options = {}) {
    await this.ensureAnalysisInternalNumbersSchema();
    const limit = Math.max(
      1,
      Math.min(Number(options.limit || 100), this.maxCalls || 5000, 5000)
    );
    const query = text(options.query).toLowerCase();
    const queryDigits = query.replace(/\D/g, "");
    const clauses = [];
    const values = [];

    clauses.push(analysisInternalNumberEnabledClause("calls"));

    if (options.since) {
      values.push(optionalTimestamp(options.since));
      clauses.push(`calls.started_at >= $${values.length}`);
    }

    if (query) {
      values.push(`%${query}%`);
      const textParam = `$${values.length}`;
      values.push(`%${queryDigits}%`);
      const digitsParam = `$${values.length}`;
      clauses.push(`(
        lower(calls.external_number) LIKE ${textParam}
        OR lower(calls.internal_number) LIKE ${textParam}
        OR lower(calls.call_id) LIKE ${textParam}
        OR lower(calls.employee_payload::text) LIKE ${textParam}
        OR (${digitsParam} <> '%%' AND calls.external_digits LIKE ${digitsParam})
      )`);
    }

    values.push(limit);
    const limitParam = `$${values.length}`;
    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await this.pool.query(
      `
        WITH filtered_calls AS (
          SELECT
            calls.call_id,
            calls.general_call_id,
            calls.started_at,
            calls.bill_sec,
            calls.disposition,
            calls.recording_status,
            COUNT(*) OVER ()::int AS total
          FROM binotel_calls calls
          ${whereClause}
          ORDER BY calls.started_at DESC NULLS LAST, calls.call_id DESC
          LIMIT ${limitParam}
        )
        SELECT
          filtered_calls.*,
          summaries.call_id AS summary_call_id,
          summaries.status AS ai_status,
          summaries.call_started_at,
          summaries.call_duration_sec,
          summaries.updated_at AS summary_updated_at,
          summaries.completed_at,
          summaries.error AS summary_error,
          summaries.message AS summary_message,
          summaries.attempts AS summary_attempts,
          summaries.terminal_failure,
          summaries.call_type AS summary_call_type,
          summaries.call_type_label AS summary_call_type_label,
          summaries.summary_model,
          summaries.transcription_model,
          summaries.summary_payload,
          usage.scope AS usage_scope,
          usage.input_tokens,
          usage.cached_input_tokens,
          usage.billable_input_tokens,
          usage.output_tokens,
          usage.reasoning_tokens,
          usage.total_tokens,
          COALESCE(metrics.items, '[]'::jsonb) AS metrics
        FROM filtered_calls
        LEFT JOIN call_summaries summaries
          ON summaries.call_id = filtered_calls.general_call_id
        LEFT JOIN call_summary_usage usage
          ON usage.call_id = summaries.call_id
         AND usage.scope = 'summary'
        LEFT JOIN LATERAL (
          SELECT jsonb_agg(
            jsonb_build_object(
              'metricKey', metric_key,
              'metricLabel', metric_label,
              'metricGroup', metric_group,
              'selectedOptionKey', selected_option_key,
              'selectedOptionLabel', selected_option_label,
              'score', score,
              'maxScore', max_score,
              'color', color,
              'countsTowardScore', counts_toward_score,
              'evidence', evidence,
              'improvement', improvement,
              'confidence', confidence
            )
            ORDER BY metric_key
          ) AS items
          FROM call_summary_metric_results
          WHERE call_id = summaries.call_id
        ) metrics ON true
        ORDER BY filtered_calls.started_at DESC NULLS LAST, filtered_calls.call_id DESC
      `,
      values
    );

    return {
      total: result.rows[0] ? result.rows[0].total : 0,
      limit,
      offset: 0,
      calls: result.rows.map(monitorAnalyticsRow)
    };
  }

  async callStatistics(options = {}) {
    await this.ensureAnalysisInternalNumbersSchema();
    const clauses = [
      analysisInternalNumberEnabledClause("calls"),
      "calls.started_at IS NOT NULL"
    ];
    const values = [];
    const query = text(options.query).toLowerCase();
    const queryDigits = query.replace(/\D/g, "");
    const timezone = text(options.timezone, "Europe/Kyiv") || "Europe/Kyiv";

    if (options.from) {
      values.push(optionalTimestamp(options.from));
      clauses.push(`calls.started_at >= $${values.length}`);
    }

    if (options.to) {
      values.push(optionalTimestamp(options.to));
      clauses.push(`calls.started_at < $${values.length}`);
    }

    if (query) {
      values.push(`%${query}%`);
      const textParam = `$${values.length}`;
      values.push(`%${queryDigits}%`);
      const digitsParam = `$${values.length}`;
      clauses.push(`(
        lower(calls.external_number) LIKE ${textParam}
        OR lower(calls.internal_number) LIKE ${textParam}
        OR lower(calls.call_id) LIKE ${textParam}
        OR lower(calls.employee_payload::text) LIKE ${textParam}
        OR lower(calls.pbx_number_payload::text) LIKE ${textParam}
        OR (${digitsParam} <> '%%' AND calls.external_digits LIKE ${digitsParam})
      )`);
    }

    values.push(timezone);
    const timezoneParam = `$${values.length}`;
    const whereClause = `WHERE ${clauses.join(" AND ")}`;

    const result = await this.pool.query(
      `
        WITH filtered AS (
          SELECT
            calls.*,
            (calls.started_at AT TIME ZONE ${timezoneParam}) AS local_started_at,
            CASE
              WHEN lower(calls.call_type) LIKE '%out%' OR lower(calls.type_label) LIKE '%вих%' THEN 'outgoing'
              ELSE 'incoming'
            END AS direction,
            CASE
              WHEN calls.bill_sec > 0 OR lower(calls.disposition) IN ('answer', 'answered', 'success') THEN true
              ELSE false
            END AS answered,
            COALESCE(NULLIF(calls.employee_payload->>'name', ''), NULLIF(calls.employee_payload->>'fullName', ''), '') AS employee_name,
            COALESCE(
              NULLIF(calls.employee_payload->>'id', ''),
              NULLIF(calls.employee_payload->>'employeeId', ''),
              NULLIF(calls.employee_payload->>'userId', ''),
              NULLIF(calls.internal_number, ''),
              'unknown'
            ) AS manager_key,
            COALESCE(NULLIF(calls.pbx_number_payload->>'name', ''), NULLIF(calls.pbx_number_payload->>'number', ''), '') AS pbx_name,
            COALESCE(NULLIF(calls.pbx_number_payload->>'number', ''), '') AS pbx_number
          FROM binotel_calls calls
          ${whereClause}
        ),
        enriched AS (
          SELECT
            *,
            COALESCE(NULLIF(employee_name, ''), NULLIF(pbx_name, ''), 'Оператор не визначений') AS manager_label,
            COALESCE(NULLIF(type_label, ''), CASE WHEN direction = 'outgoing' THEN 'Вихідні' ELSE 'Вхідні' END) AS direction_label,
            COALESCE(NULLIF(disposition_label, ''), NULLIF(disposition, ''), 'Без статусу') AS disposition_name,
            to_char(local_started_at, 'YYYY-MM-DD') AS day_key,
            EXTRACT(ISODOW FROM local_started_at)::int AS weekday,
            EXTRACT(HOUR FROM local_started_at)::int AS hour
          FROM filtered
        ),
        summary AS (
          SELECT
            COUNT(*)::int AS total_calls,
            COUNT(*) FILTER (WHERE direction = 'incoming')::int AS incoming_calls,
            COUNT(*) FILTER (WHERE direction = 'outgoing')::int AS outgoing_calls,
            COUNT(*) FILTER (WHERE answered)::int AS answered_calls,
            COUNT(*) FILTER (WHERE direction = 'incoming' AND NOT answered)::int AS missed_calls,
            COUNT(DISTINCT NULLIF(external_digits, ''))::int AS unique_customers,
            COALESCE(SUM(bill_sec), 0)::int AS total_bill_sec,
            COALESCE(SUM(wait_sec), 0)::int AS total_wait_sec,
            COALESCE(ROUND(AVG(NULLIF(bill_sec, 0))), 0)::int AS avg_bill_sec,
            COALESCE(ROUND(AVG(wait_sec)), 0)::int AS avg_wait_sec,
            COUNT(*) FILTER (WHERE recording_status <> '' OR recording_cache_status <> '')::int AS recording_calls,
            MIN(started_at) AS first_call_at,
            MAX(started_at) AS last_call_at
          FROM enriched
        ),
        by_day AS (
          SELECT
            day_key,
            MIN(started_at) AS day_started_at,
            COUNT(*)::int AS total_calls,
            COUNT(*) FILTER (WHERE direction = 'incoming')::int AS incoming_calls,
            COUNT(*) FILTER (WHERE direction = 'outgoing')::int AS outgoing_calls,
            COUNT(*) FILTER (WHERE answered)::int AS answered_calls,
            COUNT(*) FILTER (WHERE direction = 'incoming' AND NOT answered)::int AS missed_calls,
            COALESCE(SUM(bill_sec), 0)::int AS total_bill_sec
          FROM enriched
          GROUP BY day_key
        ),
        by_hour AS (
          SELECT
            hour,
            COUNT(*)::int AS total_calls,
            COUNT(*) FILTER (WHERE answered)::int AS answered_calls,
            COALESCE(SUM(bill_sec), 0)::int AS total_bill_sec
          FROM enriched
          GROUP BY hour
        ),
        by_weekday AS (
          SELECT
            weekday,
            COUNT(*)::int AS total_calls,
            COALESCE(SUM(bill_sec), 0)::int AS total_bill_sec
          FROM enriched
          GROUP BY weekday
        ),
        by_direction AS (
          SELECT
            direction,
            MAX(direction_label) AS label,
            COUNT(*)::int AS total_calls,
            COALESCE(SUM(bill_sec), 0)::int AS total_bill_sec
          FROM enriched
          GROUP BY direction
        ),
        by_disposition AS (
          SELECT
            disposition_name AS label,
            COUNT(*)::int AS total_calls,
            COUNT(*) FILTER (WHERE answered)::int AS answered_calls,
            COALESCE(SUM(bill_sec), 0)::int AS total_bill_sec
          FROM enriched
          GROUP BY disposition_name
        ),
        duration_buckets AS (
          SELECT
            CASE
              WHEN bill_sec <= 0 THEN '0'
              WHEN bill_sec <= 30 THEN '1-30'
              WHEN bill_sec <= 120 THEN '31-120'
              WHEN bill_sec <= 300 THEN '121-300'
              WHEN bill_sec <= 900 THEN '301-900'
              ELSE '900+'
            END AS bucket,
            CASE
              WHEN bill_sec <= 0 THEN '0 c'
              WHEN bill_sec <= 30 THEN '1-30 c'
              WHEN bill_sec <= 120 THEN '31 c - 2 хв'
              WHEN bill_sec <= 300 THEN '2-5 хв'
              WHEN bill_sec <= 900 THEN '5-15 хв'
              ELSE '15+ хв'
            END AS label,
            CASE
              WHEN bill_sec <= 0 THEN 0
              WHEN bill_sec <= 30 THEN 1
              WHEN bill_sec <= 120 THEN 2
              WHEN bill_sec <= 300 THEN 3
              WHEN bill_sec <= 900 THEN 4
              ELSE 5
            END AS sort_order,
            COUNT(*)::int AS total_calls
          FROM enriched
          GROUP BY bucket, label, sort_order
        ),
        managers AS (
          SELECT
            manager_key,
            MAX(manager_label) AS label,
            MAX(internal_number) AS internal_number,
            MAX(employee_name) AS employee_name,
            MAX(pbx_name) AS pbx_name,
            COUNT(*)::int AS total_calls,
            COUNT(*) FILTER (WHERE direction = 'incoming')::int AS incoming_calls,
            COUNT(*) FILTER (WHERE direction = 'outgoing')::int AS outgoing_calls,
            COUNT(*) FILTER (WHERE answered)::int AS answered_calls,
            COUNT(*) FILTER (WHERE direction = 'incoming' AND NOT answered)::int AS missed_calls,
            COUNT(DISTINCT NULLIF(external_digits, ''))::int AS unique_customers,
            COALESCE(SUM(bill_sec), 0)::int AS total_bill_sec,
            COALESCE(SUM(wait_sec), 0)::int AS total_wait_sec,
            COALESCE(ROUND(AVG(NULLIF(bill_sec, 0))), 0)::int AS avg_bill_sec,
            COALESCE(ROUND(AVG(wait_sec)), 0)::int AS avg_wait_sec,
            COUNT(*) FILTER (WHERE recording_status <> '' OR recording_cache_status <> '')::int AS recording_calls,
            MIN(started_at) AS first_call_at,
            MAX(started_at) AS last_call_at
          FROM enriched
          GROUP BY manager_key
        ),
        lines AS (
          SELECT
            COALESCE(NULLIF(pbx_number, ''), NULLIF(internal_number, ''), 'unknown') AS key,
            COALESCE(NULLIF(pbx_name, ''), NULLIF(pbx_number, ''), NULLIF(internal_number, ''), 'Лінія не визначена') AS label,
            MAX(pbx_number) AS number,
            MAX(internal_number) AS internal_number,
            COUNT(*)::int AS total_calls,
            COUNT(*) FILTER (WHERE direction = 'incoming')::int AS incoming_calls,
            COUNT(*) FILTER (WHERE direction = 'outgoing')::int AS outgoing_calls,
            COALESCE(SUM(bill_sec), 0)::int AS total_bill_sec
          FROM enriched
          GROUP BY key, label
        ),
        top_external AS (
          SELECT
            COALESCE(NULLIF(external_number, ''), NULLIF(external_digits, ''), 'Номер не визначений') AS phone,
            external_digits,
            COUNT(*)::int AS total_calls,
            COUNT(*) FILTER (WHERE direction = 'incoming')::int AS incoming_calls,
            COUNT(*) FILTER (WHERE direction = 'outgoing')::int AS outgoing_calls,
            COUNT(*) FILTER (WHERE answered)::int AS answered_calls,
            COALESCE(SUM(bill_sec), 0)::int AS total_bill_sec,
            MAX(started_at) AS last_call_at
          FROM enriched
          GROUP BY phone, external_digits
        ),
        heatmap AS (
          SELECT
            weekday,
            hour,
            COUNT(*)::int AS total_calls,
            COALESCE(SUM(bill_sec), 0)::int AS total_bill_sec
          FROM enriched
          GROUP BY weekday, hour
        )
        SELECT
          COALESCE((SELECT to_jsonb(summary) FROM summary), '{}'::jsonb) AS summary,
          COALESCE((SELECT jsonb_agg(to_jsonb(by_day) ORDER BY day_started_at) FROM by_day), '[]'::jsonb) AS daily,
          COALESCE((SELECT jsonb_agg(to_jsonb(by_hour) ORDER BY hour) FROM by_hour), '[]'::jsonb) AS hourly,
          COALESCE((SELECT jsonb_agg(to_jsonb(by_weekday) ORDER BY weekday) FROM by_weekday), '[]'::jsonb) AS weekdays,
          COALESCE((SELECT jsonb_agg(to_jsonb(by_direction) ORDER BY total_calls DESC) FROM by_direction), '[]'::jsonb) AS directions,
          COALESCE((SELECT jsonb_agg(to_jsonb(by_disposition) ORDER BY total_calls DESC, label) FROM by_disposition), '[]'::jsonb) AS dispositions,
          COALESCE((SELECT jsonb_agg(to_jsonb(duration_buckets) ORDER BY sort_order) FROM duration_buckets), '[]'::jsonb) AS duration_buckets,
          COALESCE((SELECT jsonb_agg(to_jsonb(managers) ORDER BY total_calls DESC, total_bill_sec DESC, label) FROM managers), '[]'::jsonb) AS managers,
          COALESCE((
            SELECT jsonb_agg(to_jsonb(line_rows) ORDER BY total_calls DESC, label)
            FROM (
              SELECT * FROM lines
              ORDER BY total_calls DESC, label
              LIMIT 20
            ) line_rows
          ), '[]'::jsonb) AS lines,
          COALESCE((
            SELECT jsonb_agg(to_jsonb(external_rows) ORDER BY total_calls DESC, last_call_at DESC)
            FROM (
              SELECT * FROM top_external
              ORDER BY total_calls DESC, last_call_at DESC
              LIMIT 20
            ) external_rows
          ), '[]'::jsonb) AS top_external_numbers,
          COALESCE((SELECT jsonb_agg(to_jsonb(heatmap) ORDER BY weekday, hour) FROM heatmap), '[]'::jsonb) AS heatmap
      `,
      values
    );

    const row = result.rows[0] || {};
    const summary = row.summary || {};
    const totalCalls = integer(summary.total_calls, 0);
    const answeredCalls = integer(summary.answered_calls, 0);
    const incomingCalls = integer(summary.incoming_calls, 0);
    const outgoingCalls = integer(summary.outgoing_calls, 0);
    const totalBillSec = integer(summary.total_bill_sec, 0);

    return {
      period: {
        from: optionalTimestamp(options.from),
        to: optionalTimestamp(options.to),
        timezone
      },
      summary: {
        totalCalls,
        incomingCalls,
        outgoingCalls,
        answeredCalls,
        missedCalls: integer(summary.missed_calls, 0),
        uniqueCustomers: integer(summary.unique_customers, 0),
        totalBillSec,
        totalWaitSec: integer(summary.total_wait_sec, 0),
        avgBillSec: integer(summary.avg_bill_sec, 0),
        avgWaitSec: integer(summary.avg_wait_sec, 0),
        recordingCalls: integer(summary.recording_calls, 0),
        answerRate: totalCalls ? Math.round((answeredCalls / totalCalls) * 1000) / 10 : 0,
        incomingShare: totalCalls ? Math.round((incomingCalls / totalCalls) * 1000) / 10 : 0,
        outgoingShare: totalCalls ? Math.round((outgoingCalls / totalCalls) * 1000) / 10 : 0,
        avgCallsPerDay: 0,
        talkHours: Math.round((totalBillSec / 3600) * 10) / 10,
        firstCallAt: optionalTimestamp(summary.first_call_at),
        lastCallAt: optionalTimestamp(summary.last_call_at)
      },
      daily: Array.isArray(row.daily) ? row.daily : [],
      hourly: Array.isArray(row.hourly) ? row.hourly : [],
      weekdays: Array.isArray(row.weekdays) ? row.weekdays : [],
      directions: Array.isArray(row.directions) ? row.directions : [],
      dispositions: Array.isArray(row.dispositions) ? row.dispositions : [],
      durationBuckets: Array.isArray(row.duration_buckets) ? row.duration_buckets : [],
      managers: Array.isArray(row.managers) ? row.managers : [],
      lines: Array.isArray(row.lines) ? row.lines : [],
      topExternalNumbers: Array.isArray(row.top_external_numbers) ? row.top_external_numbers : [],
      heatmap: Array.isArray(row.heatmap) ? row.heatmap : []
    };
  }

  async managerRating(options = {}) {
    await this.ensureAnalysisInternalNumbersSchema();
    const limit = Math.max(
      1,
      Math.min(Number(options.limit || 5000), this.maxCalls || 5000, 5000)
    );
    const query = text(options.query).toLowerCase();
    const queryDigits = query.replace(/\D/g, "");
    const callClauses = [];
    const metricClauses = [
      "summaries.status = 'done'",
      "metrics.counts_toward_score = true",
      "metrics.score IS NOT NULL",
      "metrics.max_score IS NOT NULL",
      "metrics.max_score > 0"
    ];
    const values = [];

    callClauses.push(analysisInternalNumberEnabledClause("source_calls"));

    if (options.since) {
      values.push(optionalTimestamp(options.since));
      callClauses.push(`source_calls.started_at >= $${values.length}`);
    }

    if (query) {
      values.push(`%${query}%`);
      const textParam = `$${values.length}`;
      values.push(`%${queryDigits}%`);
      const digitsParam = `$${values.length}`;
      metricClauses.push(`(
        lower(calls.external_number) LIKE ${textParam}
        OR lower(calls.internal_number) LIKE ${textParam}
        OR lower(calls.call_id) LIKE ${textParam}
        OR lower(calls.employee_payload::text) LIKE ${textParam}
        OR lower(metrics.metric_label) LIKE ${textParam}
        OR lower(metrics.metric_key) LIKE ${textParam}
        OR (${digitsParam} <> '%%' AND calls.external_digits LIKE ${digitsParam})
      )`);
    }

    values.push(limit);
    const limitParam = `$${values.length}`;

    const result = await this.pool.query(
      `
        WITH filtered AS (
          SELECT
            calls.general_call_id,
            calls.started_at,
            calls.bill_sec,
            calls.internal_number,
            calls.employee_payload,
            calls.pbx_number_payload,
            summaries.call_type,
            summaries.call_type_label,
            metrics.metric_key,
            metrics.metric_label,
            metrics.metric_group,
            metrics.selected_option_key,
            metrics.selected_option_label,
            metrics.score,
            metrics.max_score,
            metrics.color
          FROM (
            SELECT source_calls.*
            FROM binotel_calls source_calls
            ${callClauses.length ? `WHERE ${callClauses.join(" AND ")}` : ""}
            ORDER BY source_calls.started_at DESC NULLS LAST, source_calls.call_id DESC
            LIMIT ${limitParam}
          ) calls
          JOIN call_summaries summaries
            ON summaries.call_id = calls.general_call_id
          JOIN call_summary_metric_results metrics
            ON metrics.call_id = summaries.call_id
          WHERE ${metricClauses.join(" AND ")}
        )
        SELECT
          COUNT(DISTINCT general_call_id)::int AS rated_calls,
          COUNT(*)::int AS scored_metrics,
          COALESCE(
            jsonb_agg(
              jsonb_build_object(
                'callId', general_call_id,
                'startedAt', started_at,
                'billSec', bill_sec,
                'internalNumber', internal_number,
                'employee', employee_payload,
                'pbxNumber', pbx_number_payload,
                'callType', call_type,
                'callTypeLabel', call_type_label,
                'metricKey', metric_key,
                'metricLabel', metric_label,
                'metricGroup', metric_group,
                'selectedOptionKey', selected_option_key,
                'selectedOptionLabel', selected_option_label,
                'score', score,
                'maxScore', max_score,
                'color', color
              )
              ORDER BY started_at DESC NULLS LAST, general_call_id DESC, metric_key
            ),
            '[]'::jsonb
          ) AS rows
        FROM filtered
      `,
      values
    );
    const row = result.rows[0] || {};

    return {
      limit,
      offset: 0,
      ratedCalls: integer(row.rated_calls, 0),
      scoredMetrics: integer(row.scored_metrics, 0),
      rows: Array.isArray(row.rows) ? row.rows : []
    };
  }

  async status() {
    const [sync, total] = await Promise.all([
      this.syncState(),
      this.pool.query("SELECT COUNT(*)::int AS count FROM binotel_calls")
    ]);

    return {
      totalCalls: total.rows[0].count,
      ...sync
    };
  }
}

class PostgresRecordingCacheStore {
  constructor(pool) {
    this.pool = pool;
  }

  async metadata(callId) {
    const result = await this.pool.query(
      "SELECT payload FROM recording_cache_entries WHERE call_id = $1",
      [String(callId || "")]
    );
    return result.rows[0] ? result.rows[0].payload : null;
  }

  async upsert(entry) {
    const payload = cloneJson(entry, {});
    const callId = text(payload.callId);
    if (!callId) {
      return null;
    }

    await this.pool.query(
      `
        INSERT INTO recording_cache_entries (
          call_id,
          file_path,
          filename,
          content_type,
          bytes,
          cached_at,
          expires_at,
          payload,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, now())
        ON CONFLICT (call_id) DO UPDATE SET
          file_path = EXCLUDED.file_path,
          filename = EXCLUDED.filename,
          content_type = EXCLUDED.content_type,
          bytes = EXCLUDED.bytes,
          cached_at = EXCLUDED.cached_at,
          expires_at = EXCLUDED.expires_at,
          payload = EXCLUDED.payload,
          updated_at = now()
      `,
      [
        callId,
        text(payload.filePath),
        text(payload.filename),
        text(payload.contentType, "audio/mpeg"),
        integer(payload.bytes, 0),
        optionalTimestamp(payload.cachedAt) || nowIso(),
        optionalTimestamp(payload.expiresAt) || nowIso(),
        JSON.stringify(payload)
      ]
    );

    return payload;
  }

  async delete(callId) {
    await this.pool.query("DELETE FROM recording_cache_entries WHERE call_id = $1", [
      String(callId || "")
    ]);
  }

  async expired(now = new Date()) {
    const result = await this.pool.query(
      `
        SELECT payload
        FROM recording_cache_entries
        WHERE expires_at <= $1
      `,
      [now.toISOString()]
    );
    return result.rows.map((row) => row.payload);
  }
}

function createAppStateDatabase(config) {
  const pool = createAppStatePool(config);

  return {
    pool,
    notesStore: new PostgresLocalNotesStore(pool, config.noteAuthor),
    aiAnalysisSettingsStore: new PostgresAiAnalysisSettingsStore(pool),
    callSummaryStore: new PostgresCallSummaryStore(pool),
    binotelMonitorStore: new PostgresBinotelMonitorStore(pool, {
      maxCalls: config.binotelMonitor && config.binotelMonitor.maxStoredCalls
    }),
    telegramStore: new PostgresTelegramStore(pool),
    recordingCacheStore: new PostgresRecordingCacheStore(pool),
    async close() {
      await pool.end();
    }
  };
}

module.exports = {
  PostgresAiAnalysisSettingsStore,
  PostgresBinotelMonitorStore,
  PostgresCallSummaryStore,
  PostgresLocalNotesStore,
  PostgresRecordingCacheStore,
  PostgresTelegramStore,
  createAppStateDatabase,
  createAppStatePool,
  nextTelegramAccountStatus
};
