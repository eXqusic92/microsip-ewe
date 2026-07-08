# AGENTS.md

@/Users/exqusic/.codex/RTK.md

## Project

This repository contains the DUMA Client Info project.

- Main app: `client-info-api/`
- Backend: plain Node.js HTTP server in `client-info-api/server.js`
- Frontend: static HTML/CSS/JS in `client-info-api/public/`
- App-state SQL: `client-info-api/db/`
- Legacy/native sources: `pjproject-2.15.1/`, `opus-1.6.1/`

Most current work is in `client-info-api`, especially the backend and the client-card UI.

## Commands

Always run shell commands through `rtk`.

```bash
cd client-info-api
rtk npm install
rtk npm start
rtk npm run check
```

`npm run check` is the required lightweight verification after JS changes.
Restart `client-info-api` after changes to `server.js` or `lib/*`.

## Data Rules

There are two PostgreSQL connections:

- `DB_*`: existing CRM/system database, read-only only.
- `APP_STATE_DB_*`: writable app-state database.

Never write to the CRM/system DB. Do not create tables, update rows, or run migrations there.
Writable data belongs in the app-state DB: auth, sessions, local notes, Binotel monitor, AI settings, transcripts, AI results, recording-cache metadata.

JSON fallback for app-state was removed. Do not reintroduce JSON storage fallback.

Ignored sensitive/local files include:

- `client-info-api/.env`
- `client-info-api/node_modules/`
- `client-info-api/data/`
- recordings, logs, pids, binaries

Do not commit secrets, API keys, passwords, recordings, or local cache data.

## Integrations

Binotel:

- Fetches call history and monitors new calls.
- Local monitor data lives in app-state PostgreSQL.
- Disabled internal numbers from admin settings must not appear in monitor lists, analytics, direct call details, or recordings.

Soniox:

- Transcription provider is Soniox async v5.
- Keep Soniox prompt/context compact; `SONIOX_CONTEXT_MODE=minimal` is intentional.

OpenAI:

- Used for AI call analysis only.
- Do not bring back OpenAI transcription.

Dispatcher:

- Backend service login only; operators must not log into dispatcher manually.
- Used for assigned bus by trip id via `/api/trip-assignments?tripIds=...`.
- Reference project: `/Users/exqusic/dispatcher_ewe`.

## UI Notes

Use the existing DUMA dark UI style. When copying patterns, reference:

```text
/Users/exqusic/dispatcher_ewe
```

Recent imported patterns:

- profile menu style
- compact sun/moon theme toggle
- floating confirmation popover
- ticket/trip-card visual language

Avoid large landing-page layouts. This is an operator tool: compact, scan-friendly, predictable.

## Important Behaviors

- Client card should load fast. Slow extras such as calls, AI summary, and dispatcher bus assignment should not block the base card.
- Adding notes must update only the notes list, not reload the whole client card.
- Nearest-trip card supports ordinary tickets, transfer tickets, multiple same-order tickets, stop addresses, and bus colors.
- AI settings include call types, metrics, metric instructions/options, score `0-5`, and dash/no-score options.
- Metric max score is the highest configured scored option, not always `5`.

## Editing Rules

- Use `apply_patch` for manual edits.
- Keep changes scoped; do not revert unrelated dirty files.
- Prefer existing helpers and local patterns over new abstractions.
- For frontend controls, keep text from overflowing and verify compact header/layout behavior.

## Verification Checklist

After code changes:

```bash
cd client-info-api
rtk npm run check
```

For UI changes, verify in browser when practical.
For backend route/lib changes, restart the running server before judging behavior.
