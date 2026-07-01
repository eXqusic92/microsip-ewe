# DUMA Client Card

Internal customer card opened from an incoming MicroSIP call.

## Local run

```powershell
cd C:\Users\pavlo\microsip-ewe\client-info-api
npm install
npm start
```

Open:

```text
http://127.0.0.1:3000/client-card?phone=380671112233
```

The committed `.env.example` documents all settings. The local `.env` is ignored
by Git and already contains:

```text
DB_HOST=127.0.0.1
DB_NAME=ewe_system
DB_USER=ewe_system
```

Fill `APP_STATE_DB_PASSWORD` to enable the required writable app-state
PostgreSQL database. Fill `DB_PASSWORD` to enable the read-only CRM connection;
with an empty CRM password and `DEMO_MODE=auto`, the card uses demonstration
CRM data while still storing application state in PostgreSQL.

## Data access policy

The system PostgreSQL database is strictly read-only for this application.
The connection enforces:

```text
default_transaction_read_only=on
```

Only `SELECT` queries are used for the CRM connection. The application does not
create tables, run migrations, or write notes to this database.

Writable application state is stored in a separate PostgreSQL database.
`APP_STATE_DB_*` is required; JSON app-state fallback has been removed.

```text
APP_STATE_DB_ENABLED=true
APP_STATE_DB_HOST=127.0.0.1
APP_STATE_DB_PORT=5432
APP_STATE_DB_NAME=client_info_api
APP_STATE_DB_USER=postgres
APP_STATE_DB_PASSWORD=...
APP_STATE_DB_SSL=false
```

This app-state database stores users, auth sessions, AI settings, AI
summaries/transcripts, Binotel monitor state, local notes, and recording-cache
metadata.

Apply the app-state SQL files from `db/` with `psql` or another PostgreSQL
client before starting the server. Existing databases created before auth need
`db/002_auth.sql`. Then verify the code:

```bash
npm run check
```

## Authentication

All application pages, API endpoints, audio recordings, and the MicroSIP
compatibility endpoint require an authenticated session. Only `/login`,
`/api/auth/login`, static assets needed by the login page, and `/health` are
public.

Configure auth in `.env`:

```text
AUTH_SESSION_SECRET=long-random-secret
AUTH_SEED_ADMINS=admin:change-me-password
AUTH_SESSION_TTL_MS=28800000
AUTH_COOKIE_SECURE=false
AUTH_PBKDF2_ITERATIONS=210000
AUTH_MIN_PASSWORD_LENGTH=8
```

`AUTH_SEED_ADMINS` is used only when the `users` table is empty. Passwords are
stored as PBKDF2 hashes. Sessions use signed HttpOnly cookies and CSRF tokens
for non-GET requests. Set `AUTH_COOKIE_SECURE=true` when serving only over
HTTPS.

Ticket history is read from `public.ticket`, not from `report_*` tables. The
card uses the same ticket status rules as `ewe_web`:

```text
new                 Новий
booking             Заброньовано
buybus              Заброньовано в автобусі
buybus_confirmed    Викуплений в автобусі
buyout              Викуплений
transfer            Пересаджений
cancel/cancelled    Скасований
buybus_cancel       Скасовано в автобусі
returned            Повернутий
buybus_returned     Повернутий в автобусі
annulment           Анульований
buybus_annulment    Анульовано в автобусі
system cancel       Скасований системою
```

## Local operator notes

Operator notes are stored in the app-state PostgreSQL database.

## Binotel calls

The card can show incoming and outgoing calls from Binotel by phone number.
Configure REST API credentials in `.env`:

```text
BINOTEL_ENABLED=true
BINOTEL_KEY=...
BINOTEL_SECRET=...
BINOTEL_BASE_URL=https://api.binotel.com/api/4.0
BINOTEL_MAX_CALLS=0
BINOTEL_REQUEST_MIN_INTERVAL_MS=3500
BINOTEL_MAX_RETRIES=2
BINOTEL_HISTORY_CACHE_TTL_MS=60000
```

The integration uses the read-only Binotel REST method:

```text
stats/history-by-external-number
```

No call data is written back to Binotel or PostgreSQL.
`BINOTEL_MAX_CALLS=0` means no local limit; set a positive number only if the
history becomes too large for operators.

Binotel rate limiting:

- `BINOTEL_HISTORY_CACHE_TTL_MS=60000` caches call history in memory for one
  minute per phone number. Multiple managers opening the same card reuse this
  cache instead of hitting Binotel again.
- Identical in-flight history requests are deduplicated.
- `BINOTEL_REQUEST_MIN_INTERVAL_MS=3500` serializes Binotel REST calls so the
  process does not send requests more often than Binotel allows.
- Binotel error `106` is retried after the delay returned by Binotel, with a
  small safety padding.

## AI call summaries

The card can prepare an AI summary for the latest recorded Binotel call.
Processing is asynchronous:

1. The card shows the cached summary immediately when it exists.
2. If no cached summary exists, the server stores a queued/processing status in
   app-state storage and starts background processing.
3. The browser polls `/api/call-summary?callId=...` until the summary is ready.
   This polling reads the app-state cache and does not call Binotel again.

Configure Soniox transcription and the OpenAI summary model in `.env`:

```text
TRANSCRIPTION_AUDIO_PREPROCESSING=true
TRANSCRIPTION_AUDIO_PREPROCESSING_PROFILE=light
TRANSCRIPTION_MAX_AUDIO_BYTES=26214400
TRANSCRIPTION_CALL_MAX_ATTEMPTS=5
TRANSCRIPTION_PROCESSING_STALE_MS=600000

SONIOX_ENABLED=
SONIOX_API_KEY=...
SONIOX_BASE_URL=https://api.soniox.com/v1
SONIOX_MODEL=stt-async-v5
SONIOX_LANGUAGE_HINTS=uk,ru,en
SONIOX_LANGUAGE_HINTS_STRICT=false
SONIOX_ENABLE_SPEAKER_DIARIZATION=true
SONIOX_ENABLE_LANGUAGE_IDENTIFICATION=true
SONIOX_POLL_INTERVAL_MS=2000
SONIOX_TRANSCRIPTION_TIMEOUT_MS=300000
SONIOX_REQUEST_TIMEOUT_MS=60000
SONIOX_MAX_RETRIES=3

OPENAI_ENABLED=
OPENAI_API_KEY=...
OPENAI_SUMMARY_MODEL=gpt-5.4-nano
OPENAI_SUMMARY_VERSION=20260608-call-script-rubric-1
FFMPEG_PATH=ffmpeg
FFMPEG_TIMEOUT_MS=120000
OPENAI_TIMEOUT_MS=300000
```

Soniox needs `SONIOX_API_KEY`; OpenAI summary and call-type analysis need
`OPENAI_API_KEY`. Leave each `*_ENABLED` value empty to auto-enable that
service when its API key is present.

Pipeline:

```text
Binotel call-record -> audio download -> optional FFmpeg cleanup
                                      -> Soniox stt-async-v5
                                         (speaker diarization + language identification)
                                      -> gpt-5.4-nano summary
```

Soniox receives Ukrainian, Russian, and English language hints, speaker
diarization, and DUMA/East West Eurolines domain context. The server uploads the
recording, waits for the asynchronous transcription, stores the resulting text
in app-state storage, and deletes the temporary Soniox transcription and uploaded file.
`gpt-5.4-nano` receives the transcript plus compact client-card context
(active/current trip candidates, nearest trip, recent tickets, passengers, and
operator notes). It returns a short Ukrainian operator summary plus compact
structured fields: call type, whether client-card context was used, the main
customer question, next operator action, escalation need, churn risk, and
confidence. It also returns a detailed operator quality evaluation using the
DUMA call-processing scripts: agenda, qualification, solution presentation,
empathy, sales/retention, next step, short explanations, strengths, and
realistic improvements.

Accuracy notes:

- `SONIOX_LANGUAGE_HINTS=uk,ru,en` keeps all three expected languages available.
  Do not enable strict hints unless real tests show that it helps mixed-language
  calls.
- `SONIOX_ENABLE_SPEAKER_DIARIZATION=true` separates the operator and client.
  The roles are assigned later by the OpenAI analysis model from the dialog.
- Soniox `context.general`, `context.text`, and `context.terms` include the
  company name, bus-ticket domain, cities, and common booking terminology.
- `TRANSCRIPTION_AUDIO_PREPROCESSING=true` runs FFmpeg before Soniox:
  mono 16 kHz WAV, voice-band filters, and loudness normalization. If FFmpeg
  fails, the original Binotel audio is used.
- Temporary Soniox files are deleted after the transcript is downloaded. The
  application keeps the transcript in app-state storage, so retries of the
  OpenAI summary do not pay for transcription again.
- `OPENAI_MAX_RETRIES`, `OPENAI_RETRY_INITIAL_MS`, and
  `OPENAI_RETRY_MAX_MS` control automatic exponential-backoff retries for
  temporary OpenAI failures (`408`, `409`, `429`, and `5xx`). Permanent
  request and authentication errors are not retried.
- `TRANSCRIPTION_CALL_MAX_ATTEMPTS=5` permanently stops automatic processing of one
  call after five failed full processing attempts. The last error remains in
  the app-state summary store and is shown in the calls monitor.
- A completed transcription is saved before the summary request starts. If
  summary generation fails temporarily, the next attempt reuses that
  transcript instead of paying for transcription again.
- `TRANSCRIPTION_AUDIO_PREPROCESSING_PROFILE=light` is safer for compressed phone
  recordings. Use `phone` or `denoise` only after comparing real transcripts.
- `East West Eurolines` is treated as the company/brand name in both the
  transcription prompt and summary prompt.
- The summary prompt classifies the main practical purpose of the call and the
  UI shows it as `Тип: ...` in the AI summary details.
- Client-card context is mixed into the OpenAI summary request in compact form.
  The model may use it to match a call to a known trip/order/ticket, but only
  when it is consistent with the transcript. The call detail page separately
  loads real ticket cards by phone number through `/api/client-tickets`; this
  does not use AI, Binotel, or OpenAI.
- AI prompts, domain vocabulary, and the structured output schema are kept in
  `lib/ai-prompts.js`.
- The operator-quality evaluation only scores observable operator behavior in
  the current call. It should not punish the operator for call recording quality,
  company policy, ticket availability, prices, or technical failures outside the
  operator's control.
- The operator-quality prompt is context-aware: it should not punish an operator
  for not asking route, booking number, passenger name, or delay location when
  the client's issue is already clear or the operator may already have context
  from CRM, Binotel, dispatchers, chats, or drivers.
- Bump `OPENAI_SUMMARY_VERSION` when changing AI prompts/settings to force
  cached summaries to be regenerated.

AI summaries are stored in the app-state PostgreSQL database.

## Custom AI analysis settings

AI call evaluation settings are stored in the app-state PostgreSQL database.
They contain call types, per-call-type metrics, AI instructions, and answer
options with scores from `0` to `5` or no-score `-` plus display colors.

Backend endpoints:

```text
GET  /api/ai-analysis-settings
PUT  /api/ai-analysis-settings
POST /api/ai-analysis-settings/reset
```

`PUT /api/ai-analysis-settings` replaces the whole settings document. Send
either the settings object directly or `{ "settings": ... }`. The server returns
a short `revision`; call summaries store this revision in `analysisProfile`, so
changing the rubric invalidates cached AI summaries even when
`OPENAI_SUMMARY_VERSION` is not bumped.

## Endpoints

```text
GET  /health
GET  /client-card?phone=380671112233
GET  /api/client-card?phone=380671112233
GET  /api/client-tickets?phone=380671112233
GET  /api/call-summary?phone=380671112233
GET  /api/call-summary?callId=123456789.123
GET  /api/ai-analysis-settings
PUT  /api/ai-analysis-settings
POST /api/ai-analysis-settings/reset
POST /api/client-notes
GET  /client?phone=380671112233
```

`/client` remains as a compatibility endpoint for the current MicroSIP build.

## MicroSIP target URL

The browser button should open:

```text
https://your-server/client-card?phone=380671112233
```

Only normalized digits need to be passed in the query string.

The card contains personal data. In production, publish it only behind the
company VPN or an authenticated reverse proxy.
