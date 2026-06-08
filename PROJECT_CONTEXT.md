# MicroSIP DUMA Project Context

Last updated: 2026-06-08

This file is the handoff context for continuing the project on another PC or in
a fresh Codex/ChatGPT thread. It intentionally contains architecture and workflow
notes only. Do not put secrets, API keys, database passwords, Binotel keys, call
recordings, or production JSON caches into Git.

## Repository

GitHub:

```text
https://github.com/eXqusic92/microsip-ewe.git
```

Main local workspace on the original PC:

```text
C:\Users\pavlo\microsip-ewe
```

The old workspace in `Downloads` is not the active project.

## Main Folders

```text
client-info-api\                                  Node.js web server for client cards
pjproject-2.15.1\                                 PJSIP + modified MicroSIP source
pjproject-2.15.1\MicroSIP-3.22.3-src\             MicroSIP 3.22.3 source
opus-1.6.1\                                      Opus source
tools\                                           Local test scripts
```

## Sensitive Local Files

These are intentionally ignored by Git:

```text
client-info-api\.env
client-info-api\data\binotel-calls.json
client-info-api\data\call-summaries.json
client-info-api\data\client-notes.json
client-info-api\data\recording-cache.json
client-info-api\data\recordings\
client-info-api\node_modules\
client-info-api\tmp\
*.log
*.pid
*.exe
*.dll
*.lib
*.pdb
```

On a new PC, create `.env` from the example:

```powershell
Copy-Item client-info-api\.env.example client-info-api\.env
```

Then manually fill:

```text
DB_PASSWORD
BINOTEL_KEY
BINOTEL_SECRET
OPENAI_API_KEY
SONIOX_API_KEY
```

## Database Policy

The production/system PostgreSQL database is read-only for this project.

Important rule:

```text
Do not create tables, do not update rows, do not write anything to the system DB.
```

The client card server uses PostgreSQL only to read existing system data. Any
temporary app-local data must live in JSON files under `client-info-api\data`.

Database defaults in `.env.example`:

```text
DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=ewe_system
DB_USER=ewe_system
DB_SSL=false
```

The Node config uses:

```text
options: "-c default_transaction_read_only=on"
```

## Client Info API

Location:

```text
client-info-api\
```

Run:

```powershell
cd C:\Users\pavlo\microsip-ewe\client-info-api
npm install
npm start
```

Default local URL:

```text
http://127.0.0.1:3000
```

Important endpoints:

```text
GET /health
GET /client?phone=380671112233
GET /calls
GET /calls/:id
```

The web app shows:

- client card by phone number
- nearest trip, if available
- recent tickets from the `ticket` table, not `report_*`
- Binotel calls
- call detail page
- recording player with waveform
- transcript segments with play-from-segment controls
- AI summary, call type, operator evaluation, escalation/risk/next action
- AI analytics tab with call-type distribution

Current visual style is aligned with the existing EWE web project from:

```text
C:\Users\pavlo\Downloads\ewe_web
```

Use the same dark theme, colors, buttons, cards, and typography direction for
future UI work.

## Local JSON Storage

The server stores runtime data in:

```text
client-info-api\data\client-notes.json
client-info-api\data\binotel-calls.json
client-info-api\data\call-summaries.json
client-info-api\data\recording-cache.json
client-info-api\data\recordings\
```

These files are not committed. If moving to another PC and history is needed,
copy them manually through a secure channel.

Call recording cache policy:

```text
BINOTEL_RECORDING_CACHE_TTL_MS=86400000
```

Recordings are cached for about one day after download to save disk space.

## Binotel

The project integrates with Binotel API to:

- fetch call history by phone number
- poll recent calls in the background
- download recordings when they become available
- analyze new calls through AI
- display calls in real time on a separate calls tab

Binotel has rate limits. The server uses request spacing, retries, and local
caches to reduce `Requests are too frequent` errors.

Important `.env` values:

```text
BINOTEL_ENABLED=
BINOTEL_KEY=
BINOTEL_SECRET=
BINOTEL_BASE_URL=https://api.binotel.com/api/4.0
BINOTEL_REQUEST_MIN_INTERVAL_MS=3500
BINOTEL_HISTORY_CACHE_TTL_MS=60000
BINOTEL_MONITOR_ENABLED=true
BINOTEL_MONITOR_POLL_INTERVAL_MS=60000
BINOTEL_MONITOR_OVERLAP_SECONDS=300
```

Phone search should try normalized variants, including `+49` and `0049` for
German numbers.

## AI Pipeline

Current chosen pipeline:

```text
Binotel recording
  -> download audio
  -> optional FFmpeg cleanup
  -> Soniox transcription
  -> OpenAI call analysis
  -> local JSON cache
```

Current `.env` direction:

```text
TRANSCRIPTION_PROVIDER=soniox
SONIOX_MODEL=stt-async-v4
OPENAI_SUMMARY_MODEL=gpt-5.4-nano
OPENAI_SUMMARY_VERSION=20260608-call-script-rubric-1
```

Transcription provider can be switched:

```text
TRANSCRIPTION_PROVIDER=soniox
TRANSCRIPTION_PROVIDER=openai
```

Soniox is currently preferred because transcript quality for Ukrainian/Russian
calls looked more promising, and cost is lower for this workload.

AI analysis is cached in `client-info-api\data\call-summaries.json`. If prompts
or output schema change, bump `OPENAI_SUMMARY_VERSION` so old cached summaries
do not mix with new logic.

The project logs token usage and recording duration for cost tracking.

Approximate monthly AI cost based on the latest discussed volume:

```text
1600 calls/week
average call duration: 1m20s
~9244 minutes/month
~154 hours/month
~6933 calls/month

Soniox transcription: about $15/month
OpenAI analysis: about $12/month
Total estimate: about $27-32/month
```

## AI Prompts

Prompt file:

```text
client-info-api\lib\ai-prompts.js
```

The prompts include:

- client-card context usage
- DUMA / East West Eurolines domain terms
- call type classification
- operator next step
- escalation
- churn risk
- customer question type
- detailed operator quality evaluation
- script-aware evaluation based on call-processing scripts

The prompt was edited to account for the call-processing scripts:

- warm lead / booking
- information request
- booked-ticket question
- route change or cancellation
- complaint
- documents / permits / border rules
- baggage / parcels
- closing the call

Operator evaluation criteria:

```text
Привітання
Адженда
Кваліфікація
Рішення
Емпатія
Продаж/утримання
Наступний крок
```

Important evaluation principle:

```text
Evaluate what the operator could realistically do in this specific call,
not whether they followed every possible checklist item.
```

Do not penalize the operator for things outside their control:

- border queues
- weather
- driver behavior outside the call
- technical breakdowns
- return policy
- state border/customs service decisions
- company policy

Do penalize missing human explanation, no next step, no deadline, or no channel
for updates when the situation needed it.

## MicroSIP Changes

MicroSIP source:

```text
pjproject-2.15.1\MicroSIP-3.22.3-src
```

MicroSIP was modified to:

- show the DUMA logo at the top of the main window
- use Ukrainian UI text
- show a button/link to the client card on incoming call popup
- show a client-card button after the call is accepted
- use colored accept/reject call icons
- store `Client API Host` in settings
- generate links to the client-info web server by phone number

Important current direction:

```text
MicroSIP should not call the business API for client details anymore.
It should open/generate a URL to the web client card by phone number.
```

Default client card URL host in MicroSIP settings:

```text
http://127.0.0.1:3000
```

Older API JSON popup integration existed, but the better target is the browser
client card.

## MicroSIP Build

MSBuild:

```text
C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\MSBuild\Current\Bin\MSBuild.exe
```

Build command:

```powershell
$src='C:\Users\pavlo\microsip-ewe\pjproject-2.15.1\MicroSIP-3.22.3-src'
$msbuild='C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\MSBuild\Current\Bin\MSBuild.exe'
& $msbuild "$src\microsip.vcxproj" /p:Configuration=Release /p:Platform=Win32 /m /v:minimal
```

Output:

```text
pjproject-2.15.1\MicroSIP-3.22.3-src\Release\microsip.exe
```

If build fails with `LNK1104` for `microsip.exe`, close the running app:

```powershell
Get-Process microsip
Stop-Process -Id <PID> -Force
```

## PJSIP / Opus Notes

PJSIP config file:

```text
pjproject-2.15.1\pjlib\include\pj\config_site.h
```

This file is important and should be tracked by Git.

Enabled:

```c
#define PJ_HAS_SSL_SOCK 1
#define PJ_SSL_SOCK_IMP PJ_SSL_SOCK_IMP_OPENSSL
#define PJSIP_HAS_TLS_TRANSPORT 1
#define PJMEDIA_HAS_SRTP 1
#define PJMEDIA_SRTP_HAS_DTLS 1
#define PJMEDIA_HAS_OPUS_CODEC 1
#define PJMEDIA_HAS_VIDEO 1
#define PJSUA_HAS_VIDEO 1
```

SDL/FFmpeg/OpenH264/VPX video codecs are disabled in the PJSIP build config.

Release runtime DLLs are local build artifacts and are ignored:

```text
libcrypto-3.dll
libssl-3.dll
```

## Test Calls Without PBX

PJSUA console client:

```text
pjproject-2.15.1\pjsip-apps\bin\pjsua-i386-Win32-vc14-Release.exe
```

Test scripts:

```text
tools\start-test-api.ps1
tools\test-call-microsip.ps1
```

Run API:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\pavlo\microsip-ewe\tools\start-test-api.ps1
```

Run MicroSIP:

```powershell
C:\Users\pavlo\microsip-ewe\pjproject-2.15.1\MicroSIP-3.22.3-src\Release\microsip.exe
```

Make test call:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\pavlo\microsip-ewe\tools\test-call-microsip.ps1 -Phone 380671112233
```

PJSUA calls MicroSIP locally:

```text
sip:test@127.0.0.1:5060
```

MicroSIP without SIP account creates a Local Account and listens on port 5060.

## Development Checks

Node syntax check:

```powershell
cd C:\Users\pavlo\microsip-ewe\client-info-api
npm run check
```

MicroSIP build check:

```powershell
$src='C:\Users\pavlo\microsip-ewe\pjproject-2.15.1\MicroSIP-3.22.3-src'
$msbuild='C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\MSBuild\Current\Bin\MSBuild.exe'
& $msbuild "$src\microsip.vcxproj" /p:Configuration=Release /p:Platform=Win32 /m /v:minimal
```

## Git Notes

Remote:

```text
origin https://github.com/eXqusic92/microsip-ewe.git
```

The correct GitHub username contains the letter `i`:

```text
eXqusic92
```

Not:

```text
eXqus1c92
```

On the original machine, Git may require safe.directory because of sandbox
ownership:

```powershell
git -c safe.directory=C:/Users/pavlo/microsip-ewe status
```

## Current Priorities

Likely next work areas:

1. Continue improving transcript quality and prompt calibration.
2. Verify AI operator evaluation against real call examples.
3. Keep UI compact and readable: do not overload call detail pages.
4. Keep PostgreSQL strictly read-only.
5. Keep Binotel requests cached/rate-limited.
6. Keep runtime data and recordings out of Git.
7. Keep MicroSIP focused on opening the browser client card by phone number.

