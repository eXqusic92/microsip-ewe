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
const { phoneDigits } = require("./phone");

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

function nowIso() {
  return new Date().toISOString();
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
    this.maxCalls = Number(options.maxCalls || 2000);
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
    const limit = Math.max(
      1,
      Math.min(Number(options.limit || 100), this.maxCalls || 5000, 5000)
    );
    const offset = Math.max(0, Number(options.offset || 0));
    const query = text(options.query).toLowerCase();
    const queryDigits = query.replace(/\D/g, "");
    const clauses = [];
    const values = [];

    if (options.since) {
      values.push(optionalTimestamp(options.since));
      clauses.push(`started_at >= $${values.length}`);
    }

    if (query) {
      values.push(`%${query}%`);
      const textParam = `$${values.length}`;
      values.push(`%${queryDigits}%`);
      const digitsParam = `$${values.length}`;
      clauses.push(`(
        lower(external_number) LIKE ${textParam}
        OR lower(internal_number) LIKE ${textParam}
        OR lower(call_id) LIKE ${textParam}
        OR lower(employee_payload::text) LIKE ${textParam}
        OR ($${values.length} <> '%%' AND external_digits LIKE ${digitsParam})
      )`);
    }

    values.push(limit);
    const limitParam = `$${values.length}`;
    values.push(offset);
    const offsetParam = `$${values.length}`;

    const result = await this.pool.query(
      `
        SELECT payload, COUNT(*) OVER ()::int AS total
        FROM binotel_calls
        ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
        ORDER BY started_at DESC NULLS LAST, call_id DESC
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
  createAppStateDatabase,
  createAppStatePool
};
