"use strict";

const fs = require("fs/promises");
const path = require("path");

const config = require("../lib/config");
const { createAppStateDatabase } = require("../lib/app-state-db");
const { phoneDigits } = require("../lib/phone");

function text(value, fallback = "") {
  return value === null || value === undefined ? fallback : String(value).trim();
}

async function readJson(filename, fallback) {
  try {
    return JSON.parse(await fs.readFile(filename, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function applySchema(appState) {
  const filename = path.join(__dirname, "..", "db", "001_app_state.sql");
  const sql = await fs.readFile(filename, "utf8");
  await appState.pool.query(sql);
}

async function migrateNotes(appState) {
  const data = await readJson(config.localDataFile, { version: 1, notes: {} });
  const entries = [];

  for (const [phone, notes] of Object.entries(data.notes || {})) {
    for (const note of notes || []) {
      entries.push({
        phone,
        note: {
          id: text(note.id),
          text: text(note.text),
          createdBy: text(note.createdBy, config.noteAuthor),
          createdAt: text(note.createdAt) || new Date().toISOString(),
          source: text(note.source, "local_json")
        }
      });
    }
  }

  for (const entry of entries) {
    if (!entry.note.id || !entry.note.text) {
      continue;
    }

    await appState.pool.query(
      `
        INSERT INTO client_notes (
          id, phone, phone_digits, note_text, created_by, source, created_at, updated_at, payload
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, now(), $8::jsonb)
        ON CONFLICT (id) DO UPDATE SET
          phone = EXCLUDED.phone,
          phone_digits = EXCLUDED.phone_digits,
          note_text = EXCLUDED.note_text,
          created_by = EXCLUDED.created_by,
          source = EXCLUDED.source,
          payload = EXCLUDED.payload,
          updated_at = now()
      `,
      [
        entry.note.id,
        entry.phone,
        phoneDigits(entry.phone),
        entry.note.text,
        entry.note.createdBy,
        entry.note.source,
        entry.note.createdAt,
        JSON.stringify(entry.note)
      ]
    );
  }

  return entries.length;
}

async function migrateAiSettings(appState) {
  const data = await readJson(config.aiAnalysisSettingsFile, null);
  if (!data) {
    await appState.aiAnalysisSettingsStore.reset();
    return 0;
  }

  const result = await appState.aiAnalysisSettingsStore.update(data);
  return result.settings && Array.isArray(result.settings.callTypes)
    ? result.settings.callTypes.length
    : 0;
}

async function migrateBinotelCalls(appState) {
  const data = await readJson(config.binotelCallsFile, {
    version: 1,
    calls: {},
    sync: {}
  });
  const calls = Object.values(data.calls || {});

  if (data.sync) {
    await appState.binotelMonitorStore.updateSync(data.sync);
  }

  if (!calls.length) {
    return {
      calls: 0,
      total: 0
    };
  }

  const result = await appState.binotelMonitorStore.upsertCalls(calls, {
    preserveTimestamps: true
  });
  return {
    calls: calls.length,
    total: result.total
  };
}

async function migrateRecordingCache(appState) {
  const data = await readJson(config.binotelRecordingCacheFile, {
    version: 1,
    recordings: {}
  });
  const entries = Object.values(data.recordings || {});

  for (const entry of entries) {
    await appState.recordingCacheStore.upsert(entry);
  }

  return entries.length;
}

async function migrateCallSummaries(appState) {
  const data = await readJson(config.callSummariesFile, {
    version: 1,
    summaries: {}
  });
  const entries = Object.entries(data.summaries || {});
  let index = 0;

  for (const [callId, entry] of entries) {
    await appState.callSummaryStore.replace(callId, entry);
    index += 1;
    if (index % 100 === 0) {
      console.log(`  call summaries: ${index}/${entries.length}`);
    }
  }

  return entries.length;
}

async function counts(appState) {
  const result = await appState.pool.query(`
    SELECT 'client_notes' AS table_name, COUNT(*)::int AS count FROM client_notes
    UNION ALL
    SELECT 'ai_analysis_call_types', COUNT(*)::int FROM ai_analysis_call_types
    UNION ALL
    SELECT 'ai_analysis_metrics', COUNT(*)::int FROM ai_analysis_metrics
    UNION ALL
    SELECT 'ai_analysis_metric_options', COUNT(*)::int FROM ai_analysis_metric_options
    UNION ALL
    SELECT 'binotel_calls', COUNT(*)::int FROM binotel_calls
    UNION ALL
    SELECT 'call_summaries', COUNT(*)::int FROM call_summaries
    UNION ALL
    SELECT 'call_summary_transcript_segments', COUNT(*)::int FROM call_summary_transcript_segments
    UNION ALL
    SELECT 'call_summary_speakers', COUNT(*)::int FROM call_summary_speakers
    UNION ALL
    SELECT 'call_summary_metric_results', COUNT(*)::int FROM call_summary_metric_results
    UNION ALL
    SELECT 'call_summary_usage', COUNT(*)::int FROM call_summary_usage
    UNION ALL
    SELECT 'recording_cache_entries', COUNT(*)::int FROM recording_cache_entries
    ORDER BY table_name
  `);

  return Object.fromEntries(result.rows.map((row) => [row.table_name, row.count]));
}

async function main() {
  const appState = createAppStateDatabase(config);
  if (!appState) {
    throw new Error("APP_STATE_DB_* is not configured; refusing to migrate to JSON fallback.");
  }

  try {
    console.log("Applying app-state schema...");
    await applySchema(appState);

    console.log("Migrating AI settings...");
    const callTypes = await migrateAiSettings(appState);

    console.log("Migrating local notes...");
    const notes = await migrateNotes(appState);

    console.log("Migrating Binotel monitor calls...");
    const binotel = await migrateBinotelCalls(appState);

    console.log("Migrating recording cache metadata...");
    const recordings = await migrateRecordingCache(appState);

    console.log("Migrating call summaries...");
    const summaries = await migrateCallSummaries(appState);

    const tableCounts = await counts(appState);
    console.log(JSON.stringify({
      ok: true,
      migrated: {
        aiCallTypes: callTypes,
        notes,
        binotelCalls: binotel.calls,
        binotelTotal: binotel.total,
        recordingCacheEntries: recordings,
        callSummaries: summaries
      },
      tableCounts
    }, null, 2));
  } finally {
    await appState.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
