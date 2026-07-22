@/Users/exqusic/.codex/RTK.md

## Project

This repository contains the DUMA Client Info application.

- Backend: plain Node.js HTTP server in `server.js`
- Frontend: static HTML/CSS/JS in `public/`
- App-state SQL: `db/`

## Commands

Always run shell commands through `rtk`.

```bash
rtk npm install
rtk npm start
rtk npm run check
```

`npm run check` is the required lightweight verification after JavaScript changes.
Restart `client-info.service` after production changes to `server.js` or `lib/*`.

## Data Rules

There are two PostgreSQL connections:

- `DB_*`: existing CRM/system database, read-only only.
- `APP_STATE_DB_*`: writable app-state database.

Never write to the CRM/system DB. Writable data belongs in the app-state DB.
JSON fallback for app-state was removed; do not reintroduce it.

Never commit `.env`, secrets, API keys, passwords, `node_modules`, binaries,
recordings, logs, pids, or local cache data.

## Integrations

- Binotel monitor data is stored in app-state PostgreSQL. Disabled internal
  numbers must not appear in monitor lists, analytics, direct details, or recordings.
- Soniox async v5 is the transcription provider. Keep
  `SONIOX_CONTEXT_MODE=minimal` compact and intentional.
- OpenAI is used for call analysis only; do not restore OpenAI transcription.
- Dispatcher access is backend-only through `/api/trip-assignments?tripIds=...`.

## UI and Behavior

Use the existing compact DUMA dark UI style. The client card base data must not
wait for calls, AI summaries, or dispatcher assignments. Adding a note updates
only the notes list. Keep controls scan-friendly and prevent text overflow.

## Verification

After code changes:

```bash
rtk npm run check
```

For UI changes, verify in a browser when practical. For backend changes,
restart the running service before judging behavior.
