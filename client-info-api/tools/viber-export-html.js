#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const args = process.argv.slice(2);

function usage() {
  console.error([
    "Usage:",
    "  node tools/viber-export-html.js <target-phone-digits> [--out chat.html] [--limit 5000]",
    "",
    "Examples:",
    "  node tools/viber-export-html.js 380981234567",
    "  node tools/viber-export-html.js 380981234567 --out exports/viber-380981234567.html",
    "  node tools/viber-export-html.js 380981234567 --limit 10000",
    "",
    "This uses the same VIBER_* environment variables as viber-read.js."
  ].join("\n"));
}

function parseArgs(argv) {
  const parsed = {
    phone: "",
    out: "",
    limit: process.env.VIBER_EXPORT_LIMIT || process.env.VIBER_MESSAGE_LIMIT || "5000",
    title: ""
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
      continue;
    }
    if (arg === "--out" || arg === "-o") {
      parsed.out = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (arg === "--limit" || arg === "-n") {
      parsed.limit = argv[i + 1] || parsed.limit;
      i += 1;
      continue;
    }
    if (arg === "--title") {
      parsed.title = argv[i + 1] || "";
      i += 1;
      continue;
    }
    if (!arg.startsWith("--") && !parsed.phone) {
      parsed.phone = arg;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function escapeHtml(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function fileNameFromPath(value) {
  const raw = text(value);
  if (!raw) {
    return "";
  }
  return path.basename(raw.replace(/\\/g, "/"));
}

function parseMessageInfo(value) {
  const raw = text(value);
  if (!raw) {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    const fileInfo = parsed && parsed.fileInfo ? parsed.fileInfo : {};
    const mediaInfo = fileInfo && fileInfo.mediaInfo ? fileInfo.mediaInfo : {};
    return {
      fileName: text(fileInfo.FileName || fileInfo.fileName || fileInfo.name),
      mediaType: text(mediaInfo.MediaType || mediaInfo.mediaType || fileInfo.MediaType),
      duration: text(mediaInfo.Duration || mediaInfo.duration),
      raw
    };
  } catch (_) {
    return { raw };
  }
}

function messageDate(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return new Date(numeric > 100000000000 ? numeric : numeric * 1000);
  }
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

function dateKey(date) {
  if (!date) {
    return "unknown";
  }
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function formatDay(date) {
  if (!date) {
    return "Без дати";
  }
  return new Intl.DateTimeFormat("uk-UA", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function formatTime(date) {
  if (!date) {
    return "";
  }
  return new Intl.DateTimeFormat("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function formatFullDate(date) {
  if (!date) {
    return "Без дати";
  }
  return new Intl.DateTimeFormat("uk-UA", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function timestampForFile(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
    String(date.getSeconds()).padStart(2, "0")
  ].join("-");
}

function defaultOutput(phone) {
  const safePhone = digitsOnly(phone) || "unknown";
  return path.resolve(process.cwd(), `viber-chat-${safePhone}-${timestampForFile()}.html`);
}

function resolveOutput(out, phone) {
  if (!out) {
    return defaultOutput(phone);
  }
  const resolved = path.resolve(out);
  if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
    return path.join(resolved, path.basename(defaultOutput(phone)));
  }
  if (out.endsWith("/") || out.endsWith("\\")) {
    fs.mkdirSync(resolved, { recursive: true });
    return path.join(resolved, path.basename(defaultOutput(phone)));
  }
  return resolved;
}

function readPayload(phone, limit) {
  const readScript = path.join(__dirname, "viber-read.js");
  if (!fs.existsSync(readScript)) {
    throw new Error(`viber-read.js not found near export script: ${readScript}`);
  }

  const result = spawnSync(process.execPath, [readScript, phone], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 100,
    env: {
      ...process.env,
      VIBER_MESSAGE_LIMIT: String(limit || "5000")
    }
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const detail = text(result.stderr) || text(result.stdout) || `exit ${result.status}`;
    throw new Error(detail);
  }

  const stdout = text(result.stdout);
  const start = stdout.indexOf("{");
  const end = stdout.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("Reader did not return JSON.");
  }
  return JSON.parse(stdout.slice(start, end + 1));
}

function messageParts(row) {
  const info = parseMessageInfo(row.MessageInfo);
  const body = text(row.Body);
  const subject = text(row.Subject);
  const payloadName = fileNameFromPath(row.PayloadPath);
  const thumbnailName = fileNameFromPath(row.ThumbnailPath);
  const attachmentName = info.fileName || payloadName || thumbnailName;
  const mediaType = info.mediaType || "";
  const lines = [];

  if (subject && subject !== body) {
    lines.push(subject);
  }
  if (body) {
    lines.push(body);
  }

  return {
    text: lines.join("\n\n"),
    attachmentName,
    mediaType,
    duration: info.duration,
    hasAttachment: Boolean(attachmentName || mediaType || row.PayloadPath || row.ThumbnailPath)
  };
}

function normalizeRows(rows) {
  return rows
    .map((row) => {
      const date = messageDate(row.TimeStamp);
      const parts = messageParts(row);
      return {
        id: text(row.EventID),
        date,
        direction: Number(row.Direction) === 1 ? "outgoing" : "incoming",
        status: text(row.MessageStatus),
        type: text(row.MessageType),
        number: text(row.Number),
        ...parts
      };
    })
    .filter((message) => message.text || message.hasAttachment || message.type)
    .sort((a, b) => {
      const left = a.date ? a.date.getTime() : 0;
      const right = b.date ? b.date.getTime() : 0;
      if (left !== right) {
        return left - right;
      }
      return Number(a.id || 0) - Number(b.id || 0);
    });
}

function stats(messages) {
  const incoming = messages.filter((item) => item.direction === "incoming").length;
  const outgoing = messages.filter((item) => item.direction === "outgoing").length;
  const attachments = messages.filter((item) => item.hasAttachment).length;
  return { incoming, outgoing, attachments };
}

function renderAttachment(message) {
  if (!message.hasAttachment) {
    return "";
  }
  const title = message.attachmentName || message.mediaType || "Viber attachment";
  const meta = [
    message.mediaType,
    message.duration ? `${message.duration}s` : ""
  ].filter(Boolean).join(" · ");
  return [
    `<div class="attachment">`,
    `<div class="attachment-icon">file</div>`,
    `<div>`,
    `<div class="attachment-title">${escapeHtml(title)}</div>`,
    meta ? `<div class="attachment-meta">${escapeHtml(meta)}</div>` : "",
    `</div>`,
    `</div>`
  ].join("");
}

function renderMessage(message, phone) {
  const incoming = message.direction === "incoming";
  const sender = incoming ? `Клієнт ${phone}` : "Ви";
  const classes = ["message-row", incoming ? "incoming" : "outgoing"].join(" ");
  const details = [
    message.status ? `status ${message.status}` : "",
    message.type ? `type ${message.type}` : "",
    message.id ? `event ${message.id}` : ""
  ].filter(Boolean).join(" · ");

  return [
    `<article class="${classes}">`,
    `<div class="bubble">`,
    `<div class="message-head">`,
    `<span class="sender">${escapeHtml(sender)}</span>`,
    message.date ? `<time datetime="${escapeAttr(message.date.toISOString())}">${escapeHtml(formatTime(message.date))}</time>` : "",
    `</div>`,
    message.text ? `<div class="message-text">${escapeHtml(message.text)}</div>` : "",
    renderAttachment(message),
    details ? `<div class="message-details">${escapeHtml(details)}</div>` : "",
    `</div>`,
    `</article>`
  ].join("");
}

function renderTimeline(messages, phone) {
  if (!messages.length) {
    return `<section class="empty">Повідомлень для цього номера не знайдено.</section>`;
  }

  let currentDay = "";
  const chunks = [];
  for (const message of messages) {
    const key = dateKey(message.date);
    if (key !== currentDay) {
      currentDay = key;
      chunks.push(`<div class="day-separator">${escapeHtml(formatDay(message.date))}</div>`);
    }
    chunks.push(renderMessage(message, phone));
  }
  return chunks.join("\n");
}

function renderHtml({ phone, title, payload, messages, generatedAt }) {
  const firstDate = messages[0] && messages[0].date;
  const lastDate = messages[messages.length - 1] && messages[messages.length - 1].date;
  const counts = stats(messages);
  const pageTitle = title || `Viber export ${phone}`;
  const source = payload.encrypted ? "encrypted Viber Desktop database" : "Viber Desktop database";

  return `<!doctype html>
<html lang="uk">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(pageTitle)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #eef2f7;
      --paper: #ffffff;
      --ink: #17212b;
      --muted: #627386;
      --line: #dbe3ed;
      --viber: #7360f2;
      --viber-dark: #5946d2;
      --incoming: #ffffff;
      --outgoing: #e7ddff;
      --soft: #f7f8fb;
      --shadow: 0 18px 55px rgba(23, 33, 43, 0.12);
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: linear-gradient(180deg, #e9edf5 0%, #f7f8fb 38%, #edf1f7 100%);
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      line-height: 1.5;
    }

    .page {
      width: min(980px, calc(100% - 32px));
      margin: 32px auto;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 18px;
      overflow: hidden;
      box-shadow: var(--shadow);
    }

    header {
      padding: 28px 32px 24px;
      color: #fff;
      background:
        radial-gradient(circle at top right, rgba(255,255,255,0.28), transparent 34%),
        linear-gradient(135deg, var(--viber) 0%, var(--viber-dark) 100%);
    }

    .eyebrow {
      margin: 0 0 8px;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.84;
    }

    h1 {
      margin: 0;
      font-size: clamp(26px, 4vw, 38px);
      line-height: 1.1;
      letter-spacing: 0;
    }

    .subtitle {
      margin: 10px 0 0;
      color: rgba(255,255,255,0.84);
      font-size: 15px;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1px;
      background: var(--line);
      border-bottom: 1px solid var(--line);
    }

    .stat {
      padding: 16px 18px;
      background: var(--soft);
    }

    .stat-label {
      color: var(--muted);
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .stat-value {
      margin-top: 4px;
      font-size: 18px;
      font-weight: 800;
    }

    main {
      padding: 22px 18px 30px;
      background:
        linear-gradient(rgba(255,255,255,0.84), rgba(255,255,255,0.84)),
        repeating-linear-gradient(135deg, #eef2f8 0, #eef2f8 14px, #f7f9fc 14px, #f7f9fc 28px);
    }

    .day-separator {
      width: fit-content;
      max-width: 100%;
      margin: 18px auto;
      padding: 7px 14px;
      border-radius: 999px;
      background: rgba(23, 33, 43, 0.64);
      color: #fff;
      font-size: 13px;
      font-weight: 700;
      text-align: center;
    }

    .message-row {
      display: flex;
      margin: 8px 0;
    }

    .message-row.incoming { justify-content: flex-start; }
    .message-row.outgoing { justify-content: flex-end; }

    .bubble {
      width: fit-content;
      max-width: min(680px, 82%);
      padding: 11px 13px 9px;
      border: 1px solid rgba(23, 33, 43, 0.08);
      border-radius: 14px;
      box-shadow: 0 4px 14px rgba(23, 33, 43, 0.07);
      overflow-wrap: anywhere;
    }

    .incoming .bubble {
      background: var(--incoming);
      border-bottom-left-radius: 4px;
    }

    .outgoing .bubble {
      background: var(--outgoing);
      border-bottom-right-radius: 4px;
    }

    .message-head {
      display: flex;
      gap: 12px;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 4px;
      color: var(--muted);
      font-size: 12px;
    }

    .sender {
      color: var(--viber-dark);
      font-weight: 800;
    }

    time {
      white-space: nowrap;
      color: #7a8795;
    }

    .message-text {
      white-space: pre-wrap;
      font-size: 15px;
    }

    .attachment {
      display: flex;
      gap: 10px;
      align-items: center;
      margin-top: 8px;
      padding: 9px 10px;
      border-radius: 10px;
      background: rgba(255,255,255,0.64);
      border: 1px solid rgba(23, 33, 43, 0.08);
    }

    .attachment-icon {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: rgba(115, 96, 242, 0.14);
    }

    .attachment-title {
      font-weight: 800;
    }

    .attachment-meta,
    .message-details {
      color: var(--muted);
      font-size: 12px;
    }

    .message-details {
      margin-top: 6px;
      opacity: 0.82;
    }

    .empty {
      margin: 24px auto;
      padding: 24px;
      max-width: 560px;
      border: 1px dashed var(--line);
      border-radius: 14px;
      background: rgba(255,255,255,0.78);
      text-align: center;
      color: var(--muted);
      font-weight: 700;
    }

    footer {
      padding: 16px 24px 22px;
      color: var(--muted);
      background: var(--paper);
      border-top: 1px solid var(--line);
      font-size: 12px;
      text-align: center;
    }

    @media (max-width: 720px) {
      .page {
        width: 100%;
        min-height: 100vh;
        margin: 0;
        border: 0;
        border-radius: 0;
      }

      header {
        padding: 24px 18px 20px;
      }

      .stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      main {
        padding: 18px 10px 26px;
      }

      .bubble {
        max-width: 90%;
      }
    }

    @media print {
      body { background: #fff; }
      .page {
        width: 100%;
        margin: 0;
        border: 0;
        box-shadow: none;
      }
      header {
        color: #111;
        background: #fff;
        border-bottom: 2px solid #111;
      }
      main { background: #fff; }
      .bubble { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <p class="eyebrow">Viber Desktop export</p>
      <h1>${escapeHtml(pageTitle)}</h1>
      <p class="subtitle">Номер: ${escapeHtml(phone)} · Джерело: ${escapeHtml(source)} · Створено: ${escapeHtml(formatFullDate(generatedAt))}</p>
    </header>
    <section class="stats" aria-label="Export summary">
      <div class="stat"><div class="stat-label">Повідомлень</div><div class="stat-value">${messages.length}</div></div>
      <div class="stat"><div class="stat-label">Вхідних</div><div class="stat-value">${counts.incoming}</div></div>
      <div class="stat"><div class="stat-label">Вихідних</div><div class="stat-value">${counts.outgoing}</div></div>
      <div class="stat"><div class="stat-label">Файлів</div><div class="stat-value">${counts.attachments}</div></div>
    </section>
    <main>
      ${renderTimeline(messages, phone)}
    </main>
    <footer>
      Період: ${escapeHtml(formatFullDate(firstDate))} - ${escapeHtml(formatFullDate(lastDate))}. Export generated locally from Viber Desktop DB.
    </footer>
  </div>
</body>
</html>
`;
}

function main() {
  const options = parseArgs(args);
  if (options.help || !options.phone) {
    usage();
    process.exit(options.help ? 0 : 2);
  }

  const payload = readPayload(options.phone, options.limit);
  if (!payload || payload.ok !== true) {
    throw new Error(payload && payload.error ? payload.error : "Viber reader failed.");
  }

  const messages = normalizeRows(Array.isArray(payload.rows) ? payload.rows : []);
  const outPath = resolveOutput(options.out, options.phone);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const html = renderHtml({
    phone: options.phone,
    title: options.title,
    payload,
    messages,
    generatedAt: new Date()
  });
  fs.writeFileSync(outPath, html, "utf8");

  console.log(`Wrote ${messages.length} messages to ${outPath}`);
}

try {
  main();
} catch (error) {
  console.error(`[viber-export-html] ${error && error.message ? error.message : error}`);
  process.exit(1);
}
