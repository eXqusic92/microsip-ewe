"use strict";

const THEME_KEY = "ewe-ticket-theme";
const TICKETS_PREVIEW_LIMIT = 7;
const DETAIL_TICKETS_PREVIEW_LIMIT = 3;
const CALLS_PREVIEW_LIMIT = 7;
const MONITOR_POLL_MS = 10000;
const ORDER_VIEW_BASE_URL = "https://new-system-prod.ewe.ua/backend/orders/order/";
const CALL_TYPE_LABELS = {
  warm_lead_followup: "Тепла заявка",
  ticket_booking: "Забронювати квиток",
  bus_or_boarding_clarification: "Уточнення автобуса",
  border_delay: "Затримка на кордоні",
  route_or_schedule_clarification: "Уточнення рейсу",
  route_change_notice: "Зміна або скасування рейсу",
  ticket_change: "Зміна квитка",
  ticket_return_or_cancel: "Повернення або скасування",
  complaint: "Скарга",
  payment_or_price: "Оплата або ціна",
  documents_or_permits: "Документи або дозволи",
  baggage: "Багаж",
  parcel_inquiry: "Посилки",
  lost_item: "Загублені речі",
  no_useful_content: "Без корисного змісту",
  other: "Інше"
};
const CALL_TYPE_COLORS = {
  warm_lead_followup: "#22c55e",
  ticket_booking: "#2f9e6f",
  bus_or_boarding_clarification: "#4fb4d2",
  border_delay: "#d99a27",
  route_or_schedule_clarification: "#4776e6",
  route_change_notice: "#f97316",
  ticket_change: "#8b6fd6",
  ticket_return_or_cancel: "#d76f30",
  complaint: "#e30613",
  payment_or_price: "#d99a27",
  documents_or_permits: "#8b5cf6",
  baggage: "#1d9a8a",
  parcel_inquiry: "#14b8a6",
  lost_item: "#d34f8b",
  no_useful_content: "#7d8b92",
  other: "#59666d"
};
const OPERATOR_NEXT_STEP_LABELS = {
  none: "Нічого не потрібно",
  call_back: "Передзвонити клієнту",
  send_update: "Надіслати оновлення",
  check_booking: "Перевірити бронювання",
  contact_dispatcher: "Звʼязатися з диспетчером",
  contact_driver: "Звʼязатися з водієм",
  create_complaint: "Оформити скаргу",
  process_refund: "Опрацювати повернення",
  other: "Інша дія"
};
const ESCALATION_LEVEL_LABELS = {
  none: "Не потрібна",
  low: "Низька",
  medium: "Середня",
  high: "Висока"
};
const ESCALATION_DEPARTMENT_LABELS = {
  dispatcher: "Диспетчер",
  quality: "Відділ якості",
  manager: "Керівник",
  accounting: "Бухгалтерія",
  technical: "Технічна підтримка",
  driver: "Водій",
  other: "Інше"
};
const CHURN_RISK_LABELS = {
  low: "Низький",
  medium: "Середній",
  high: "Високий",
  unknown: "Невідомо"
};
const elements = {
  viewLinks: document.querySelectorAll("[data-view-link]"),
  searchForm: document.querySelector("#phone-search"),
  phoneInput: document.querySelector("#phone-input"),
  themeToggle: document.querySelector("#theme-toggle"),
  themeToggleLabel: document.querySelector("#theme-toggle-label"),
  pageTitle: document.querySelector("#page-title"),
  emptyState: document.querySelector("#empty-state"),
  loadingState: document.querySelector("#loading-state"),
  clientCard: document.querySelector("#client-card"),
  monitorPage: document.querySelector("#calls-monitor-page"),
  analyticsPage: document.querySelector("#analytics-page"),
  callDetailPage: document.querySelector("#call-detail-page"),
  monitorStatus: document.querySelector("#monitor-status"),
  monitorUpdated: document.querySelector("#monitor-updated"),
  monitorNextSync: document.querySelector("#monitor-next-sync"),
  monitorCountLabel: document.querySelector("#monitor-count-label"),
  monitorAnalyticsPeriod: document.querySelector("#monitor-analytics-period"),
  analyticsAnalyzed: document.querySelector("#analytics-analyzed"),
  analyticsAnalyzedCaption: document.querySelector("#analytics-analyzed-caption"),
  analyticsTopType: document.querySelector("#analytics-top-type"),
  analyticsTopCaption: document.querySelector("#analytics-top-caption"),
  analyticsPending: document.querySelector("#analytics-pending"),
  analyticsPendingCaption: document.querySelector("#analytics-pending-caption"),
  analyticsAudioMinutes: document.querySelector("#analytics-audio-minutes"),
  analyticsAudioCaption: document.querySelector("#analytics-audio-caption"),
  analyticsTokens: document.querySelector("#analytics-tokens"),
  analyticsTokensCaption: document.querySelector("#analytics-tokens-caption"),
  analyticsCost: document.querySelector("#analytics-cost"),
  analyticsCostCaption: document.querySelector("#analytics-cost-caption"),
  analyticsEscalations: document.querySelector("#analytics-escalations"),
  analyticsEscalationsCaption: document.querySelector("#analytics-escalations-caption"),
  analyticsChurnRisk: document.querySelector("#analytics-churn-risk"),
  analyticsChurnRiskCaption: document.querySelector("#analytics-churn-risk-caption"),
  callTypeOverview: document.querySelector("#call-type-overview"),
  callTypeChart: document.querySelector("#call-type-chart"),
  callTypeEmpty: document.querySelector("#call-type-empty"),
  customerQuestionChart: document.querySelector("#customer-question-chart"),
  customerQuestionEmpty: document.querySelector("#customer-question-empty"),
  monitorSearchForm: document.querySelector("#monitor-search"),
  monitorQuery: document.querySelector("#monitor-query"),
  monitorPageSize: document.querySelector("#monitor-page-size"),
  monitorRefresh: document.querySelector("#monitor-refresh"),
  monitorList: document.querySelector("#monitor-list"),
  monitorPagination: document.querySelector("#monitor-pagination"),
  monitorPrevPage: document.querySelector("#monitor-prev-page"),
  monitorNextPage: document.querySelector("#monitor-next-page"),
  monitorPageNumbers: document.querySelector("#monitor-page-numbers"),
  monitorPageInfo: document.querySelector("#monitor-page-info"),
  monitorCallTemplate: document.querySelector("#monitor-call-template"),
  detailPhone: document.querySelector("#detail-phone"),
  detailDate: document.querySelector("#detail-date"),
  detailCallType: document.querySelector("#detail-call-type"),
  detailAiStatus: document.querySelector("#detail-ai-status"),
  detailOperator: document.querySelector("#detail-operator"),
  detailDirection: document.querySelector("#detail-direction"),
  detailDuration: document.querySelector("#detail-duration"),
  detailBinotelId: document.querySelector("#detail-binotel-id"),
  detailTicketCount: document.querySelector("#detail-ticket-count"),
  detailTicketList: document.querySelector("#detail-ticket-list"),
  detailSummary: document.querySelector("#detail-summary"),
  detailAnalysisList: document.querySelector("#detail-analysis-list"),
  detailReanalyzeAi: document.querySelector("#detail-reanalyze-ai"),
  detailQualityScore: document.querySelector("#detail-quality-score"),
  detailQualitySummary: document.querySelector("#detail-quality-summary"),
  detailQualityContext: document.querySelector("#detail-quality-context"),
  detailQualityCriteria: document.querySelector("#detail-quality-criteria"),
  detailQualityNotes: document.querySelector("#detail-quality-notes"),
  detailAudioWrap: document.querySelector("#detail-audio-wrap"),
  detailAudioPlayer: document.querySelector("#detail-audio-player"),
  detailAudioVisual: document.querySelector("#detail-audio-visual"),
  detailAudioCanvas: document.querySelector("#detail-audio-canvas"),
  detailAudioPlay: document.querySelector("#detail-audio-play"),
  detailAudioPlayIcon: document.querySelector("#detail-audio-play-icon"),
  detailAudioProgress: document.querySelector("#detail-audio-progress"),
  detailAudioCurrent: document.querySelector("#detail-audio-current"),
  detailAudioDuration: document.querySelector("#detail-audio-duration"),
  detailAudioSpeed: document.querySelector("#detail-audio-speed"),
  detailAudio: document.querySelector("#detail-audio"),
  detailAudioStatus: document.querySelector("#detail-audio-status"),
  detailLanguage: document.querySelector("#detail-language"),
  detailTranscript: document.querySelector("#detail-transcript"),
  detailTechnical: document.querySelector("#detail-technical"),
  warningStack: document.querySelector("#warning-stack"),
  clientName: document.querySelector("#client-name"),
  clientPhone: document.querySelector("#client-phone"),
  clientEmail: document.querySelector("#client-email"),
  sourceIndicator: document.querySelector("#source-indicator"),
  passengerList: document.querySelector("#passenger-list"),
  firstOrder: document.querySelector("#first-order"),
  lastOrder: document.querySelector("#last-order"),
  upcomingSection: document.querySelector("#upcoming-section"),
  upcomingStatus: document.querySelector("#upcoming-status"),
  upcomingTrip: document.querySelector("#upcoming-trip"),
  aiSummaryCard: document.querySelector("#ai-summary-card"),
  aiSummaryStatus: document.querySelector("#ai-summary-status"),
  aiSummaryText: document.querySelector("#ai-summary-text"),
  aiSummaryDetails: document.querySelector("#ai-summary-details"),
  callList: document.querySelector("#call-list"),
  callCountLabel: document.querySelector("#call-count-label"),
  callTemplate: document.querySelector("#call-template"),
  callsModal: document.querySelector("#calls-modal"),
  callsModalList: document.querySelector("#calls-modal-list"),
  callsModalClose: document.querySelector("#calls-modal-close"),
  ticketList: document.querySelector("#ticket-list"),
  ticketCountLabel: document.querySelector("#ticket-count-label"),
  ticketTemplate: document.querySelector("#ticket-template"),
  ticketsModal: document.querySelector("#tickets-modal"),
  ticketsModalList: document.querySelector("#tickets-modal-list"),
  ticketsModalClose: document.querySelector("#tickets-modal-close"),
  notesList: document.querySelector("#notes-list"),
  noteForm: document.querySelector("#note-form"),
  noteText: document.querySelector("#note-text"),
  noteMessage: document.querySelector("#note-message")
};

let currentPhone = "";
let currentSummaryCallId = "";
let summaryPollTimer = null;
let monitorPollTimer = null;
let detailPollTimer = null;
let monitorPage = 1;
let monitorPageSize = 10;
let monitorTotalCalls = 0;
let currentTickets = [];
let currentCalls = [];
let currentDetailCallId = "";
let currentDetailTickets = [];
let detailTicketsPhone = "";
let detailTicketsLoaded = false;
let detailTicketsLoading = false;
let detailTicketsRequestId = 0;
const detailAudioState = {
  url: "",
  peaks: [],
  waveformRequestId: 0,
  animationFrame: 0,
  speeds: [1, 1.25, 1.5, 2],
  speedIndex: 0,
  seeking: false,
  placeholderSeed: 0,
  segments: [],
  roles: new Map(),
  barRoles: [],
  barRoleDuration: 0,
  canvasWidth: 0,
  canvasHeight: 0,
  canvasRatio: 0,
  canvasContext: null,
  palette: null,
  lastFrameAt: 0,
  controlSyncAt: 0,
  playRequest: null,
  desiredPlaying: false,
  buffering: false,
  visualAnchorTime: 0,
  visualAnchorAt: 0
};

function currentTheme() {
  return document.body.dataset.theme === "dark" ? "dark" : "light";
}

function updateThemeControl() {
  const isDark = currentTheme() === "dark";
  const label = isDark ? "Світла тема" : "Темна тема";
  elements.themeToggle.setAttribute(
    "aria-label",
    isDark ? "Увімкнути світлу тему" : "Увімкнути темну тему"
  );
  elements.themeToggle.setAttribute("aria-pressed", String(isDark));
  elements.themeToggleLabel.textContent = label;
}

function setTheme(theme, persist = true) {
  document.documentElement.dataset.theme = theme;
  document.body.dataset.theme = theme;
  if (persist) {
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }
  updateThemeControl();
  detailAudioState.palette = null;
  drawDetailAudioCanvas();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("380")) {
    return `+380 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`;
  }
  return value || "—";
}

function formatCallPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("0")) {
    return formatPhone(`+38${digits}`);
  }
  if (digits.length === 12 && digits.startsWith("380")) {
    return formatPhone(`+${digits}`);
  }
  return value || "—";
}

function formatDate(value, options = {}) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    day: "2-digit",
    month: options.short ? "short" : "long",
    year: options.year === false ? undefined : "numeric",
    timeZone: "Europe/Kyiv"
  }).format(new Date(value));
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Kyiv"
  }).format(new Date(value));
}

function formatMoney(amount, currency) {
  return new Intl.NumberFormat("uk-UA", {
    style: "currency",
    currency: currency || "UAH",
    maximumFractionDigits: 2
  }).format(Number(amount || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(Number(value || 0));
}

function formatMinutesFromSeconds(value) {
  const minutes = Number(value || 0) / 60;
  return new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: minutes >= 100 ? 0 : 1
  }).format(minutes);
}

function formatDuration(value) {
  const totalSeconds = Math.max(0, Number(value || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours) {
    return `${hours} год ${minutes} хв`;
  }

  if (minutes) {
    return `${minutes} хв ${seconds} с`;
  }

  return `${seconds} с`;
}

function formatPlaybackTime(value) {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function detailAudioDuration() {
  const duration = Number(elements.detailAudio && elements.detailAudio.duration);
  return Number.isFinite(duration) && duration > 0 ? duration : 0;
}

function detailAudioHasBufferAhead(time, minAhead = 0.25) {
  const audio = elements.detailAudio;
  if (!audio || !audio.buffered || !audio.buffered.length) {
    return true;
  }

  const current = Math.max(0, Number(time) || 0);
  for (let index = 0; index < audio.buffered.length; index += 1) {
    const start = audio.buffered.start(index);
    const end = audio.buffered.end(index);
    if (current >= start && end - current >= minAhead) {
      return true;
    }
  }

  return false;
}

function syncDetailAudioClock(time = elements.detailAudio.currentTime) {
  detailAudioState.visualAnchorTime = Math.max(0, Number(time) || 0);
  detailAudioState.visualAnchorAt = performance.now();
}

function detailAudioDisplayTime() {
  const audio = elements.detailAudio;
  const duration = detailAudioDuration();
  const current = Math.max(0, Number(audio.currentTime || 0));
  if (
    !duration ||
    audio.paused ||
    audio.ended ||
    audio.seeking ||
    detailAudioState.seeking ||
    detailAudioState.buffering ||
    audio.readyState < 2 ||
    !detailAudioHasBufferAhead(current)
  ) {
    return Math.min(duration || current, current);
  }

  const anchorAt = detailAudioState.visualAnchorAt || performance.now();
  const anchorTime = Math.max(0, Number(detailAudioState.visualAnchorTime || current));
  const elapsed = Math.max(0, (performance.now() - anchorAt) / 1000);
  const estimated = anchorTime + elapsed * (Number(audio.playbackRate) || 1);

  if (Math.abs(estimated - current) > 1.25) {
    syncDetailAudioClock(current);
    return Math.min(duration, current);
  }

  return clampNumber(Math.max(current, estimated), 0, duration);
}

function audioCssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function drawRoundedRect(context, x, y, width, height, radius) {
  if (typeof context.roundRect === "function") {
    context.beginPath();
    context.roundRect(x, y, width, height, radius);
    context.fill();
    return;
  }

  context.fillRect(x, y, width, height);
}

function placeholderAudioPeaks(count) {
  return Array.from({ length: count }, (_, index) => {
    const wave = Math.sin(index * 0.33) * 0.28 + Math.sin(index * 0.091) * 0.18;
    const pulse = index % 17 < 7 ? 0.16 : 0;
    return Math.max(0.12, Math.min(0.92, 0.42 + wave + pulse));
  });
}

function refreshDetailAudioPalette() {
  detailAudioState.palette = {
    accent: audioCssVar("--accent", "#e30613"),
    accentDark: audioCssVar("--brand-dark", "#b5000c"),
    line: audioCssVar("--line-strong", "#c9c7c2"),
    panel: audioCssVar("--panel-soft", "#faf9f7"),
    muted: audioCssVar("--muted", "#686865"),
    operator: audioCssVar("--audio-operator", "#98a6af"),
    client: audioCssVar("--audio-client", "#8296ff")
  };
  return detailAudioState.palette;
}

function resizeDetailAudioCanvas(force = false) {
  const canvas = elements.detailAudioCanvas;
  if (!canvas) {
    return null;
  }

  if (!force && detailAudioState.canvasContext) {
    return {
      canvas,
      context: detailAudioState.canvasContext,
      width: detailAudioState.canvasWidth,
      height: detailAudioState.canvasHeight
    };
  }

  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(320, Math.floor(rect.width || canvas.parentElement.clientWidth || 640));
  const height = Math.max(86, Math.floor(rect.height || 86));
  const scaledWidth = Math.floor(width * ratio);
  const scaledHeight = Math.floor(height * ratio);

  if (canvas.width !== scaledWidth || canvas.height !== scaledHeight) {
    canvas.width = scaledWidth;
    canvas.height = scaledHeight;
  }

  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  detailAudioState.canvasWidth = width;
  detailAudioState.canvasHeight = height;
  detailAudioState.canvasRatio = ratio;
  detailAudioState.canvasContext = context;

  return {
    canvas,
    context,
    width,
    height
  };
}

function roleAtAudioTime(seconds) {
  if (!Number.isFinite(Number(seconds))) {
    return "unknown";
  }

  const time = Number(seconds);
  const segment = detailAudioState.segments.find((item) => {
    const start = Number(item.start);
    const end = Number(item.end);
    if (!Number.isFinite(start)) {
      return false;
    }

    const safeEnd = Number.isFinite(end) && end > start ? end : start + 2.5;
    return time >= start && time <= safeEnd;
  });

  if (!segment) {
    return "unknown";
  }

  return detailAudioState.roles.get(String(segment.speaker)) || "unknown";
}

function rebuildDetailAudioBarRoles(duration, count) {
  detailAudioState.barRoles = Array.from({ length: count }, (_, index) => {
    const time = duration > 0
      ? (index / Math.max(1, count - 1)) * duration
      : 0;
    return roleAtAudioTime(time);
  });
  detailAudioState.barRoleDuration = duration;
}

function buildSyntheticDetailPeaks(duration = 0) {
  const layout = resizeDetailAudioCanvas();
  const width = layout ? layout.width : 640;
  const count = Math.max(72, Math.min(128, Math.floor(width / 6)));
  const safeDuration = Number(duration || elements.detailAudio.duration || 0);

  detailAudioState.peaks = Array.from({ length: count }, (_, index) => {
    const time = safeDuration > 0
      ? (index / Math.max(1, count - 1)) * safeDuration
      : index * 0.22;
    const role = roleAtAudioTime(time);
    const base = role === "unknown" ? 0.16 : 0.36;
    const voice = role === "operator" ? 0.09 : 0.14;
    const wave =
      Math.abs(Math.sin(index * 0.41)) * 0.24 +
      Math.abs(Math.sin(index * 0.137 + 1.2)) * 0.18;
    return Math.max(0.08, Math.min(0.88, base + wave + voice));
  });
  rebuildDetailAudioBarRoles(safeDuration, count);
}

function drawDetailAudioCanvas(displayTime = detailAudioDisplayTime()) {
  const layout = resizeDetailAudioCanvas();
  if (!layout) {
    return;
  }

  const { context, width, height } = layout;
  const audio = elements.detailAudio;
  const duration = detailAudioDuration();
  const progress = duration > 0 ? clampNumber(displayTime / duration, 0, 1) : 0;
  const peaks = detailAudioState.peaks.length
    ? detailAudioState.peaks
    : placeholderAudioPeaks(Math.max(72, Math.floor(width / 6)));
  const palette = detailAudioState.palette || refreshDetailAudioPalette();
  const { accent, accentDark, line, panel, muted } = palette;
  const barCount = peaks.length;
  const gap = Math.max(2, Math.min(4, width / 180));
  const barWidth = Math.max(2, (width - gap * (barCount - 1)) / barCount);
  const center = height * 0.5;
  const maxBarHeight = height * 0.44;
  const operatorColor = palette.operator;
  const clientColor = palette.client;
  const unknownColor = line;

  if (
    detailAudioState.barRoles.length !== barCount ||
    detailAudioState.barRoleDuration !== duration
  ) {
    rebuildDetailAudioBarRoles(duration, barCount);
  }

  context.clearRect(0, 0, width, height);
  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, panel);
  background.addColorStop(0.56, "rgba(255,255,255,0)");
  background.addColorStop(1, "rgba(79,180,210,0.12)");
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.fillStyle = line;
  context.globalAlpha = 0.2;
  context.fillRect(0, center - 0.5, width, 1);
  context.globalAlpha = 1;

  for (let index = 0; index < barCount; index += 1) {
    const x = index * (barWidth + gap);
    const peak = Math.max(0.06, Math.min(1, peaks[index] || 0));
    const barHeight = Math.max(7, peak * maxBarHeight);
    const role = detailAudioState.barRoles[index] || "unknown";
    const y = role === "operator"
      ? center - barHeight
      : role === "client"
        ? center
        : center - barHeight / 2;
    const isPlayed = index / Math.max(1, barCount - 1) <= progress;
    const baseColor = role === "operator"
      ? operatorColor
      : role === "client"
        ? clientColor
        : unknownColor;
    context.fillStyle = isPlayed && role === "client"
      ? accentDark
      : isPlayed && role === "operator"
        ? muted
        : baseColor;
    context.globalAlpha = isPlayed ? 0.96 : role === "unknown" ? 0.28 : 0.46;
    drawRoundedRect(context, x, y, barWidth, barHeight, Math.min(6, barWidth / 2));
  }
  context.globalAlpha = 1;

  const playheadX = progress * width;
  context.fillStyle = accent;
  context.globalAlpha = duration > 0 ? 0.9 : 0;
  context.fillRect(playheadX - 1, 12, 2, height - 24);
  context.globalAlpha = 1;
}

function syncDetailAudioControls(options = {}) {
  const audio = elements.detailAudio;
  const duration = detailAudioDuration();
  const displayTime = detailAudioDisplayTime();
  const current = options.realTime
    ? Number(audio.currentTime || 0)
    : displayTime;
  const force = Boolean(options.force);
  const now = performance.now();

  elements.detailAudioPlayIcon.textContent = audio.paused ? "▶" : "Ⅱ";
  elements.detailAudioPlay.setAttribute(
    "aria-label",
    audio.paused ? "Відтворити запис" : "Поставити на паузу"
  );
  if (
    force ||
    audio.paused ||
    audio.ended ||
    detailAudioState.seeking ||
    now - detailAudioState.controlSyncAt > 180
  ) {
    elements.detailAudioProgress.value = duration > 0
      ? String(Math.round((current / duration) * 1000))
      : "0";
    elements.detailAudioCurrent.textContent = formatPlaybackTime(current);
    elements.detailAudioDuration.textContent = duration > 0
      ? formatPlaybackTime(duration)
      : "0:00";
    detailAudioState.controlSyncAt = now;
  }

  drawDetailAudioCanvas(displayTime);
}

function startDetailAudioAnimation() {
  cancelAnimationFrame(detailAudioState.animationFrame);
  syncDetailAudioClock();

  const tick = (timestamp) => {
    if (!detailAudioState.lastFrameAt || timestamp - detailAudioState.lastFrameAt > 33) {
      syncDetailAudioControls();
      detailAudioState.lastFrameAt = timestamp;
    }
    if (!elements.detailAudio.paused && !elements.detailAudio.ended) {
      detailAudioState.animationFrame = requestAnimationFrame(tick);
    }
  };

  detailAudioState.animationFrame = requestAnimationFrame(tick);
}

function resetDetailAudioPlayer() {
  cancelAnimationFrame(detailAudioState.animationFrame);
  detailAudioState.url = "";
  detailAudioState.peaks = [];
  detailAudioState.barRoles = [];
  detailAudioState.barRoleDuration = 0;
  detailAudioState.waveformRequestId += 1;
  detailAudioState.speedIndex = 0;
  detailAudioState.playRequest = null;
  detailAudioState.desiredPlaying = false;
  detailAudioState.buffering = false;
  detailAudioState.visualAnchorTime = 0;
  detailAudioState.visualAnchorAt = 0;
  detailAudioState.lastFrameAt = 0;
  detailAudioState.controlSyncAt = 0;
  detailAudioState.segments = [];
  detailAudioState.roles = new Map();
  elements.detailAudio.pause();
  elements.detailAudio.removeAttribute("src");
  elements.detailAudio.load();
  elements.detailAudio.playbackRate = 1;
  elements.detailAudioSpeed.textContent = "1×";
  elements.detailAudioProgress.value = "0";
  elements.detailAudioCurrent.textContent = "0:00";
  elements.detailAudioDuration.textContent = "0:00";
  elements.detailAudioWrap.classList.add("is-empty");
  elements.detailAudioPlayer.classList.add("is-disabled");
  syncDetailAudioControls({ force: true, realTime: true });
}

function setDetailRecordingUrl(url) {
  const absoluteUrl = new URL(url, window.location.href).href;
  elements.detailAudioWrap.classList.remove("is-empty");
  elements.detailAudioPlayer.classList.remove("is-disabled");

  if (detailAudioState.url === absoluteUrl) {
    syncDetailAudioControls();
    return;
  }

  cancelAnimationFrame(detailAudioState.animationFrame);
  detailAudioState.url = absoluteUrl;
  detailAudioState.peaks = [];
  detailAudioState.barRoles = [];
  detailAudioState.barRoleDuration = 0;
  detailAudioState.speedIndex = 0;
  detailAudioState.playRequest = null;
  detailAudioState.desiredPlaying = false;
  detailAudioState.buffering = false;
  detailAudioState.visualAnchorTime = 0;
  detailAudioState.visualAnchorAt = 0;
  detailAudioState.lastFrameAt = 0;
  detailAudioState.controlSyncAt = 0;
  elements.detailAudio.preload = "auto";
  elements.detailAudio.src = url;
  elements.detailAudio.load();
  elements.detailAudio.playbackRate = 1;
  elements.detailAudioSpeed.textContent = "1×";
  buildSyntheticDetailPeaks();
  syncDetailAudioControls({ force: true, realTime: true });
}

function seekDetailAudio(ratio) {
  const audio = elements.detailAudio;
  const duration = detailAudioDuration();
  if (!duration) {
    return;
  }

  const target = clampNumber(ratio, 0, 1) * duration;
  audio.currentTime = target;
  syncDetailAudioClock(target);
  syncDetailAudioControls({ force: true, realTime: true });
}

async function playDetailAudio() {
  const audio = elements.detailAudio;
  if (!audio.src) {
    return;
  }

  detailAudioState.desiredPlaying = true;
  detailAudioState.buffering = false;
  syncDetailAudioClock();
  startDetailAudioAnimation();
  syncDetailAudioControls({ force: true });

  const request = audio.play();
  if (!request || typeof request.then !== "function") {
    return;
  }

  detailAudioState.playRequest = request;
  try {
    await request;
    if (!detailAudioState.desiredPlaying) {
      audio.pause();
      return;
    }
    detailAudioState.buffering = false;
    syncDetailAudioClock();
    startDetailAudioAnimation();
  } catch (error) {
    if (!detailAudioState.desiredPlaying || error.name === "AbortError") {
      return;
    }
    throw error;
  } finally {
    if (detailAudioState.playRequest === request) {
      detailAudioState.playRequest = null;
    }
  }
}

async function toggleDetailAudioPlayback() {
  const audio = elements.detailAudio;
  if (!audio.src) {
    return;
  }

  if (!audio.paused || detailAudioState.playRequest) {
    detailAudioState.desiredPlaying = false;
    audio.pause();
    cancelAnimationFrame(detailAudioState.animationFrame);
    syncDetailAudioClock();
    syncDetailAudioControls({ force: true, realTime: true });
    return;
  }

  await playDetailAudio();
}

async function playDetailAudioFrom(seconds) {
  const audio = elements.detailAudio;
  if (!audio.src) {
    return;
  }

  const duration = detailAudioDuration();
  const target = Math.max(0, Number(seconds) || 0);
  if (duration) {
    audio.currentTime = Math.min(duration, target);
  } else {
    audio.currentTime = target;
  }

  syncDetailAudioClock(audio.currentTime);
  await playDetailAudio();
}

function statusInfo(status, label) {
  const key = String(status || "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+/g, "_");

  if (["return", "returned", "buybus_returned", "auto_return"].includes(key)) {
    return { label: label || "Повернутий", className: "status-returned" };
  }

  if (
    [
      "annulment",
      "buybus_annulment",
      "cancel",
      "cancelled",
      "canceled",
      "buybus_cancel",
      "buybus_cancelled",
      "system_cancel",
      "system_cancelled",
      "system_canceled"
    ].includes(key)
  ) {
    return { label: label || "Скасований", className: "status-cancelled" };
  }

  if (["buyout", "buy", "buybus_confirmed", "transfer", "sale", "sold"].includes(key)) {
    return { label: label || "Викуплений", className: "status-paid" };
  }

  if (["booking", "buybus", "new", "new_ticket", "reserved"].includes(key)) {
    return { label: label || "Заброньовано", className: "status-reserved" };
  }

  return {
    label: label || (status ? String(status).replaceAll("_", " ") : "Без статусу"),
    className: ""
  };
}

function callDirectionInfo(call) {
  if (call.type === "incoming") {
    return { label: call.typeLabel || "Вхідний", className: "call-incoming" };
  }

  if (call.type === "outgoing") {
    return { label: call.typeLabel || "Вихідний", className: "call-outgoing" };
  }

  return { label: call.typeLabel || "Дзвінок", className: "" };
}

function callDirectionIconSvg(type) {
  const isOutgoing = type === "outgoing";
  const arrow = isOutgoing
    ? '<path class="call-direction-icon-arrow" d="M13 11l6-6"></path><path class="call-direction-icon-arrow" d="M14 5h5v5"></path>'
    : '<path class="call-direction-icon-arrow" d="M19 5l-6 6"></path><path class="call-direction-icon-arrow" d="M13 7v4h4"></path>';

  return `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path class="call-direction-icon-phone" d="M5.4 4.7c-.5.2-.8.7-.8 1.3 0 7.4 6 13.4 13.4 13.4.6 0 1.1-.3 1.3-.8l1-2.5-4-2-1.8 1.7c-2.8-1.2-5.1-3.5-6.3-6.3l1.7-1.8-2-4-2.5 1z"></path>
      ${arrow}
    </svg>
  `.trim();
}

function setCallDirectionIcon(element, call, direction) {
  if (!element) {
    return;
  }

  const type = call && call.type === "outgoing" ? "outgoing" : "incoming";
  element.className = `call-direction-icon ${direction.className || ""}`.trim();
  element.innerHTML = callDirectionIconSvg(type);
}

function callDispositionInfo(call) {
  const disposition = String(call.disposition || "").toUpperCase();

  if (["ANSWER", "TRANSFER", "SUCCESS"].includes(disposition)) {
    return { label: call.dispositionLabel || disposition, className: "status-paid" };
  }

  if (disposition === "ONLINE") {
    return { label: call.dispositionLabel || disposition, className: "status-reserved" };
  }

  if (["BUSY", "NOANSWER", "CANCEL", "CONGESTION", "CHANUNAVAIL", "FAILED", "SMS-FAILED"].includes(disposition)) {
    return { label: call.dispositionLabel || disposition, className: "status-cancelled" };
  }

  return {
    label: call.dispositionLabel || disposition || "Без статусу",
    className: ""
  };
}

function aiStatusInfo(status, terminalFailure = false) {
  if (terminalFailure) {
    return { label: "Зупинено", className: "status-cancelled" };
  }

  switch (status) {
    case "done":
      return { label: "Готово", className: "status-paid" };
    case "queued":
      return { label: "У черзі", className: "status-reserved" };
    case "processing":
      return { label: "Готуємо", className: "status-reserved" };
    case "failed":
      return { label: "Помилка", className: "status-cancelled" };
    case "disabled":
      return { label: "Не налаштовано", className: "" };
    case "not_available":
      return { label: "Немає запису", className: "" };
    default:
      return { label: "—", className: "" };
  }
}

function callTypeLabel(summary) {
  if (!summary) {
    return "";
  }

  return summary.callTypeLabel || CALL_TYPE_LABELS[summary.callType] || "";
}

function fallbackCallTypeText(call, ai, disposition) {
  const billSec = Number(call && call.billSec);
  const canAnalyze = Boolean(
    call &&
      call.recordable !== false &&
      (!Number.isFinite(billSec) || billSec > 0)
  );

  if (!canAnalyze) {
    return (disposition && disposition.label) || "Без типу дзвінка";
  }

  if (ai && ai.status === "failed") {
    return "AI-аналіз не виконано";
  }

  if (ai && (ai.status === "queued" || ai.status === "processing")) {
    return "Тип ще визначається";
  }

  return "Без типу дзвінка";
}

function callId(call) {
  return String(call && (call.generalCallId || call.id || call.callId) || "").trim();
}

function callDetailUrl(call) {
  const id = callId(call);
  return id ? `/calls/${encodeURIComponent(id)}` : "";
}

function operatorLabel(call, includeExtension = true) {
  return [
    call && call.employee && call.employee.name,
    includeExtension && call && call.internalNumber ? `вн. ${call.internalNumber}` : "",
    call && call.pbxNumber && call.pbxNumber.name
  ].filter(Boolean).join(" · ") || "Оператор не визначений";
}

function setState(state) {
  elements.emptyState.classList.toggle("hidden", state !== "empty");
  elements.loadingState.classList.toggle("hidden", state !== "loading");
  elements.clientCard.classList.toggle("hidden", state !== "card");
  elements.monitorPage.classList.toggle("hidden", state !== "monitor");
  elements.analyticsPage.classList.toggle("hidden", state !== "analytics");
  elements.callDetailPage.classList.toggle("hidden", state !== "detail");

  const titles = {
    empty: "Картка клієнта",
    loading: "Завантаження",
    card: "Картка клієнта",
    monitor: "Дзвінки",
    analytics: "AI-аналітика",
    detail: "Деталі дзвінка"
  };
  elements.pageTitle.textContent = titles[state] || "Картка клієнта";
  if (state !== "detail") {
    document.title = `${titles[state] || "Картка клієнта"} | DUMA`;
  }

  for (const link of elements.viewLinks) {
    const view = link.getAttribute("data-view-link");
    link.classList.toggle(
      "active",
      ((state === "monitor" || state === "detail") && view === "calls-monitor") ||
        (state === "analytics" && view === "call-analytics") ||
        (["empty", "loading", "card"].includes(state) && view === "client-card")
    );
  }

  if (state === "detail") {
    requestAnimationFrame(() => {
      resizeDetailAudioCanvas(true);
      if (elements.detailAudio.src) {
        buildSyntheticDetailPeaks();
      }
      syncDetailAudioControls();
    });
  }
}

function renderWarnings(warnings) {
  elements.warningStack.replaceChildren();
  for (const warning of warnings || []) {
    const item = document.createElement("div");
    item.className = "warning";
    item.textContent = warning;
    elements.warningStack.append(item);
  }
}

function renderPassengers(passengers) {
  elements.passengerList.replaceChildren();

  if (!passengers.length) {
    const message = document.createElement("span");
    message.className = "muted";
    message.textContent = "Пасажирів ще не знайдено";
    elements.passengerList.append(message);
    return;
  }

  for (const passenger of passengers) {
    const item = document.createElement("span");
    item.className = "passenger";
    item.textContent = passenger;
    elements.passengerList.append(item);
  }
}

function renderUpcoming(ticket) {
  elements.upcomingSection.classList.toggle("hidden", !ticket);
  if (!ticket) {
    return;
  }

  const info = statusInfo(ticket.status, ticket.statusLabel);
  elements.upcomingStatus.className = `status ${info.className}`;
  elements.upcomingStatus.textContent = info.label;
  elements.upcomingTrip.innerHTML = `
    <div class="trip-date">
      <strong>${escapeHtml(formatDate(ticket.departAt, { short: true }))}</strong>
      <span>Відпр. ${escapeHtml(formatTime(ticket.departAt) || "—")} · приб. ${escapeHtml(formatTime(ticket.arriveAt) || "—")}</span>
      <span>рейс ${escapeHtml(ticket.routeCode || "—")} · зам. ${escapeHtml(ticket.orderNumber || "—")} · кв. ${escapeHtml(ticket.ticketNumber || "—")}</span>
    </div>
    <div class="trip-place">
      <strong>${escapeHtml(ticket.from.locality || "Місце не вказано")}</strong>
      <span>${escapeHtml(ticket.from.point || "Станція не вказана")}</span>
    </div>
    <div class="trip-place">
      <strong>${escapeHtml(ticket.to.locality || "Місце не вказано")}</strong>
      <span>${escapeHtml(ticket.to.point || "Станція не вказана")}</span>
    </div>
    <div class="trip-details">
      <strong>${escapeHtml(formatMoney(ticket.price.amount, ticket.price.currency))}</strong>
      <span>${escapeHtml(ticket.passenger)}${ticket.seat ? ` · місце ${escapeHtml(ticket.seat)}` : ""}</span>
      <span>${escapeHtml(ticket.carrier || "")}</span>
    </div>
  `;
}

function renderTickets(tickets) {
  elements.ticketList.replaceChildren();
  currentTickets = Array.isArray(tickets) ? tickets : [];
  elements.ticketCountLabel.textContent = `${currentTickets.length} квитків`;

  if (!currentTickets.length) {
    const message = document.createElement("p");
    message.className = "no-data";
    message.textContent = "За цим номером квитків не знайдено.";
    elements.ticketList.append(message);
    return;
  }

  for (const ticket of currentTickets.slice(0, TICKETS_PREVIEW_LIMIT)) {
    appendTicket(elements.ticketList, ticket);
  }

  if (currentTickets.length > TICKETS_PREVIEW_LIMIT) {
    const action = document.createElement("div");
    action.className = "tickets-action";
    const button = document.createElement("button");
    button.className = "secondary-button show-all-tickets";
    button.type = "button";
    button.textContent = `Показати всі квитки (${currentTickets.length})`;
    button.addEventListener("click", openTicketsModal);
    action.append(button);
    elements.ticketList.append(action);
  }
}

function renderDetailTicketsMessage(message, countText = "") {
  if (!elements.detailTicketList || !elements.detailTicketCount) {
    return;
  }

  elements.detailTicketList.replaceChildren();
  elements.detailTicketCount.textContent = countText;
  const item = document.createElement("p");
  item.className = "no-data";
  item.textContent = message;
  elements.detailTicketList.append(item);
}

function openDetailTicketsModal() {
  currentTickets = currentDetailTickets;
  openTicketsModal();
}

function renderDetailTickets(tickets) {
  if (!elements.detailTicketList || !elements.detailTicketCount) {
    return;
  }

  elements.detailTicketList.replaceChildren();
  currentDetailTickets = Array.isArray(tickets) ? tickets : [];
  elements.detailTicketCount.textContent = `${currentDetailTickets.length} квитків`;

  if (!currentDetailTickets.length) {
    renderDetailTicketsMessage(
      "За цим номером телефону квитків не знайдено.",
      "0 квитків"
    );
    return;
  }

  for (const ticket of currentDetailTickets.slice(0, DETAIL_TICKETS_PREVIEW_LIMIT)) {
    appendTicket(elements.detailTicketList, ticket);
  }

  if (currentDetailTickets.length > DETAIL_TICKETS_PREVIEW_LIMIT) {
    const action = document.createElement("div");
    action.className = "tickets-action";
    const button = document.createElement("button");
    button.className = "secondary-button show-all-tickets";
    button.type = "button";
    button.textContent = `Дивитись всі квитки (${currentDetailTickets.length})`;
    button.addEventListener("click", openDetailTicketsModal);
    action.append(button);
    elements.detailTicketList.append(action);
  }
}

async function loadDetailTickets(phone) {
  if (!elements.detailTicketList || !elements.detailTicketCount) {
    return;
  }

  const cleaned = String(phone || "").trim();
  if (!cleaned) {
    detailTicketsPhone = "";
    detailTicketsLoaded = true;
    detailTicketsLoading = false;
    currentDetailTickets = [];
    renderDetailTicketsMessage("Номер телефону для пошуку квитків не визначено.", "—");
    return;
  }

  if (detailTicketsPhone === cleaned && (detailTicketsLoaded || detailTicketsLoading)) {
    return;
  }

  detailTicketsPhone = cleaned;
  detailTicketsLoaded = false;
  detailTicketsLoading = true;
  currentDetailTickets = [];
  const requestId = ++detailTicketsRequestId;
  renderDetailTicketsMessage(
    `Шукаємо квитки за номером ${formatPhone(cleaned)}...`,
    "Шукаємо"
  );

  try {
    const response = await fetch(
      `/api/client-tickets?phone=${encodeURIComponent(cleaned)}`,
      { headers: { Accept: "application/json" } }
    );
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Не вдалося отримати квитки клієнта.");
    }
    if (requestId !== detailTicketsRequestId) {
      return;
    }

    detailTicketsLoaded = true;
    detailTicketsLoading = false;
    renderDetailTickets(payload.tickets || []);
  } catch (error) {
    if (requestId !== detailTicketsRequestId) {
      return;
    }

    detailTicketsLoaded = true;
    detailTicketsLoading = false;
    currentDetailTickets = [];
    renderDetailTicketsMessage(
      error.message || "Не вдалося отримати квитки клієнта.",
      "Помилка"
    );
  }
}

function ticketOrderUrl(ticket) {
  if (ticket.orderUrl) {
    return ticket.orderUrl;
  }
  if (!ticket.orderId) {
    return "";
  }
  return `${ORDER_VIEW_BASE_URL}${encodeURIComponent(ticket.orderId)}/view`;
}

function appendTicket(container, ticket) {
  const fragment = elements.ticketTemplate.content.cloneNode(true);
  const status = statusInfo(ticket.status, ticket.statusLabel);
  const route = [ticket.from.locality, ticket.to.locality].filter(Boolean).join(" → ");
  const fromPoint = [ticket.from.point, ticket.from.locality]
    .filter(Boolean)
    .join(", ");
  const toPoint = [ticket.to.point, ticket.to.locality]
    .filter(Boolean)
    .join(", ");
  const stations = [fromPoint || ticket.from.locality, toPoint || ticket.to.locality]
    .filter(Boolean)
    .join(" → ");

  fragment.querySelector('[data-field="date"]').textContent = formatDate(
    ticket.departAt,
    { short: true }
  );
  fragment.querySelector('[data-field="time"]').textContent = formatTime(
    ticket.departAt
  );
  fragment.querySelector('[data-field="route"]').textContent =
    route || "Маршрут не вказаний";
  const statusElement = fragment.querySelector('[data-field="status"]');
  statusElement.textContent = status.label;
  statusElement.className = `status ${status.className}`;
  fragment.querySelector('[data-field="stations"]').textContent =
    stations || "Станції не вказані";
  fragment.querySelector('[data-field="depart-time"]').textContent =
    `Відправлення: ${formatTime(ticket.departAt) || "—"}`;
  fragment.querySelector('[data-field="arrive-time"]').textContent =
    `Прибуття: ${formatTime(ticket.arriveAt) || "—"}`;
  fragment.querySelector('[data-field="route-code"]').textContent =
    `Рейс: ${ticket.routeCode || "—"}`;
  fragment.querySelector('[data-field="passenger"]').textContent =
    ticket.passenger;
  fragment.querySelector('[data-field="numbers"]').textContent =
    `зам. ${ticket.orderNumber || "—"} · кв. ${ticket.ticketNumber || "—"}`;
  fragment.querySelector('[data-field="seat"]').textContent = ticket.seat
    ? `місце ${ticket.seat}`
    : "без місця";
  fragment.querySelector('[data-field="agent"]').textContent =
    ticket.agent || ticket.agentCode
      ? `агент: ${ticket.agent || ticket.agentCode}`
      : "агент не вказаний";
  fragment.querySelector('[data-field="price"]').textContent = formatMoney(
    ticket.price.amount,
    ticket.price.currency
  );
  fragment.querySelector('[data-field="carrier"]').textContent =
    ticket.carrier || "";
  const orderLink = fragment.querySelector('[data-field="order-link"]');
  const url = ticketOrderUrl(ticket);
  if (url) {
    orderLink.href = url;
  } else {
    orderLink.removeAttribute("href");
    orderLink.setAttribute("aria-disabled", "true");
    orderLink.textContent = "Замовлення недоступне";
  }

  container.append(fragment);
}

function renderTicketsModal() {
  elements.ticketsModalList.replaceChildren();

  for (const ticket of currentTickets) {
    appendTicket(elements.ticketsModalList, ticket);
  }
}

function openTicketsModal() {
  renderTicketsModal();

  if (typeof elements.ticketsModal.showModal === "function") {
    elements.ticketsModal.showModal();
    return;
  }

  elements.ticketsModal.setAttribute("open", "");
}

function closeTicketsModal() {
  if (elements.ticketsModal.open && typeof elements.ticketsModal.close === "function") {
    elements.ticketsModal.close();
    return;
  }

  elements.ticketsModal.removeAttribute("open");
}

function renderCalls(calls) {
  currentCalls = Array.isArray(calls) ? calls : [];
  elements.callList.replaceChildren();
  elements.callCountLabel.textContent = currentCalls.length ? `${currentCalls.length} дзвінків` : "";

  if (!currentCalls.length) {
    const message = document.createElement("p");
    message.className = "no-data";
    message.textContent = "Дзвінків за цим номером у Binotel не знайдено.";
    elements.callList.append(message);
    return;
  }

  for (const call of currentCalls.slice(0, CALLS_PREVIEW_LIMIT)) {
    appendCall(elements.callList, call);
  }

  if (currentCalls.length > CALLS_PREVIEW_LIMIT) {
    const action = document.createElement("div");
    action.className = "tickets-action";
    const button = document.createElement("button");
    button.className = "secondary-button show-all-calls";
    button.type = "button";
    button.textContent = `Показати всі дзвінки (${currentCalls.length})`;
    button.addEventListener("click", openCallsModal);
    action.append(button);
    elements.callList.append(action);
  }
}

function appendCall(container, call) {
  const fragment = elements.callTemplate.content.cloneNode(true);
  const direction = callDirectionInfo(call);
  const disposition = callDispositionInfo(call);
  const detailLink = fragment.querySelector('[data-field="detail-link"]');
  const detailUrl = callDetailUrl(call);
  if (detailUrl) {
    detailLink.href = detailUrl;
  } else {
    detailLink.removeAttribute("href");
  }

  fragment.querySelector('[data-field="date"]').textContent = formatDate(
    call.startedAt,
    { short: true }
  );
  fragment.querySelector('[data-field="time"]').textContent = formatTime(call.startedAt);

  const directionElement = fragment.querySelector('[data-field="direction"]');
  directionElement.textContent = direction.label;
  directionElement.className = `call-direction ${direction.className}`;
  setCallDirectionIcon(
    fragment.querySelector('[data-field="direction-icon"]'),
    call,
    direction
  );

  const dispositionElement = fragment.querySelector('[data-field="disposition"]');
  dispositionElement.textContent = disposition.label;
  dispositionElement.className = `status ${disposition.className}`;

  fragment.querySelector('[data-field="operator"]').textContent =
    operatorLabel(call);
  fragment.querySelector('[data-field="numbers"]').textContent =
    call.pbxNumber && call.pbxNumber.number
      ? `лінія ${formatCallPhone(call.pbxNumber.number)}`
      : "лінія не вказана";
  fragment.querySelector('[data-field="duration"]').textContent =
    `очікування ${formatDuration(call.waitSec)} · розмова ${formatDuration(call.billSec)}`;
  fragment.querySelector('[data-field="recording"]').textContent =
    call.recordingStatusLabel || "запис не вказаний";
  fragment.querySelector('[data-field="phone"]').textContent =
    formatCallPhone(call.externalNumber);
  fragment.querySelector('[data-field="binotel-id"]').textContent =
    call.generalCallId ? `Binotel ID ${call.generalCallId}` : "";

  container.append(fragment);
}

function renderCallsModal() {
  elements.callsModalList.replaceChildren();

  for (const call of currentCalls) {
    appendCall(elements.callsModalList, call);
  }
}

function openCallsModal() {
  renderCallsModal();

  if (typeof elements.callsModal.showModal === "function") {
    elements.callsModal.showModal();
    return;
  }

  elements.callsModal.setAttribute("open", "");
}

function closeCallsModal() {
  if (elements.callsModal.open && typeof elements.callsModal.close === "function") {
    elements.callsModal.close();
    return;
  }

  elements.callsModal.removeAttribute("open");
}

function renderCallSummary(summary) {
  const payload = summary || {
    status: "not_available",
    message: "Підсумок дзвінка ще не доступний."
  };
  const status = aiStatusInfo(payload.status, payload.terminalFailure);
  currentSummaryCallId = payload.generalCallId || payload.callId || currentSummaryCallId || "";

  elements.aiSummaryStatus.textContent = status.label;
  elements.aiSummaryStatus.className = `status ${status.className}`;
  elements.aiSummaryDetails.replaceChildren();

  if (payload.status === "done" && payload.summary) {
    elements.aiSummaryText.textContent = payload.summary.summary;
    const typeLabel = callTypeLabel(payload.summary);

    const details = [
      typeLabel ? `Тип: ${typeLabel}` : "",
      typeof payload.summary.confidence === "number"
        ? `Впевненість: ${Math.round(payload.summary.confidence * 100)}%`
        : ""
    ].filter(Boolean);

    for (const detail of details) {
      const item = document.createElement("span");
      item.textContent = detail;
      elements.aiSummaryDetails.append(item);
    }
    return;
  }

  if (payload.status === "queued" || payload.status === "processing") {
    elements.aiSummaryText.textContent =
      payload.message || "Готуємо AI-підсумок останнього записаного дзвінка…";
    scheduleSummaryPoll();
    return;
  }

  if (payload.status === "failed") {
    elements.aiSummaryText.textContent =
      payload.error || payload.message || "Не вдалося підготувати AI-підсумок.";
    return;
  }

  elements.aiSummaryText.textContent =
    payload.message || "Для останнього дзвінка немає доступного AI-підсумку.";
}

function scheduleSummaryPoll() {
  if (!currentSummaryCallId && !currentPhone) {
    return;
  }

  clearTimeout(summaryPollTimer);
  summaryPollTimer = setTimeout(async () => {
    try {
      const query = currentSummaryCallId
        ? `callId=${encodeURIComponent(currentSummaryCallId)}`
        : `phone=${encodeURIComponent(currentPhone)}`;
      const response = await fetch(
        `/api/call-summary?${query}`,
        { headers: { Accept: "application/json" } }
      );
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Не вдалося оновити AI-підсумок");
      }

      renderCallSummary(payload);
    } catch (error) {
      renderCallSummary({
        status: "failed",
        error: error.message
      });
    }
  }, 4000);
}

function renderNotes(notes) {
  elements.notesList.replaceChildren();

  if (!notes.length) {
    const message = document.createElement("p");
    message.className = "no-data";
    message.textContent = "Приміток поки немає.";
    elements.notesList.append(message);
    return;
  }

  for (const note of notes) {
    const item = document.createElement("article");
    item.className = "note";
    const body = document.createElement("p");
    body.textContent = note.text;
    const footer = document.createElement("footer");
    footer.textContent = [
      note.createdBy,
      note.createdAt ? formatDate(note.createdAt, { short: true }) : ""
    ]
      .filter(Boolean)
      .join(" · ");
    item.append(body, footer);
    elements.notesList.append(item);
  }
}

function renderCard(card) {
  clearTimeout(summaryPollTimer);
  currentPhone = card.contact.phone;
  currentSummaryCallId = "";
  elements.clientName.textContent = card.contact.primaryName;
  elements.clientPhone.textContent = formatPhone(card.contact.phone);
  elements.clientPhone.href = `tel:${card.contact.phone}`;
  elements.clientEmail.textContent = card.contact.emails[0] || "Email не вказаний";
  elements.sourceIndicator.textContent =
    card.source === "postgres" ? "PostgreSQL" : "Demo";
  elements.firstOrder.textContent = formatDate(card.stats.firstOrderAt);
  elements.lastOrder.textContent = formatDate(card.stats.lastOrderAt);

  renderWarnings(card.warnings);
  renderPassengers(card.contact.relatedPassengers);
  renderUpcoming(card.upcomingTrip);
  renderCallSummary(card.latestCallSummary);
  renderCalls(card.calls);
  renderTickets(card.tickets);
  renderNotes(card.notes);
  setState("card");
}

async function loadClient(phone) {
  clearTimeout(monitorPollTimer);
  clearTimeout(detailPollTimer);
  const cleaned = String(phone || "").trim();
  if (!cleaned) {
    setState("empty");
    return;
  }

  elements.phoneInput.value = cleaned;
  setState("loading");

  try {
    const response = await fetch(
      `/api/client-card?phone=${encodeURIComponent(cleaned)}`,
      { headers: { Accept: "application/json" } }
    );
    const card = await response.json();

    if (!response.ok) {
      throw new Error(card.error || "Не вдалося завантажити картку");
    }

    const url = new URL(window.location.href);
    url.pathname = "/client-card";
    url.search = "";
    url.searchParams.set("phone", card.contact.phoneDigits || cleaned);
    window.history.replaceState({}, "", url);
    renderCard(card);
  } catch (error) {
    setState("empty");
    elements.emptyState.querySelector("h1").textContent = "Не вдалося відкрити картку";
    elements.emptyState.querySelector("p").textContent = error.message;
  }
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  return `${formatDate(value, { short: true })} ${formatTime(value)}`;
}

function renderMonitorStatus(status) {
  if (!status) {
    elements.monitorStatus.textContent = "—";
    elements.monitorUpdated.textContent = "—";
    elements.monitorNextSync.textContent = "—";
    return;
  }

  if (!status.configured) {
    elements.monitorStatus.textContent = "Вимкнено";
  } else if (!status.enabled) {
    elements.monitorStatus.textContent = "Binotel не налаштовано";
  } else if (status.running) {
    elements.monitorStatus.textContent = "Синхронізація";
  } else {
    elements.monitorStatus.textContent = status.lastError ? "Є помилка" : "Працює";
  }

  elements.monitorUpdated.textContent = status.lastSyncAt
    ? formatDateTime(status.lastSyncAt)
    : "Ще не було";
  elements.monitorNextSync.textContent = status.nextPollAt
    ? formatTime(status.nextPollAt)
    : "—";
}

function appendAnalyticsDistributionRow(container, item, total, options = {}) {
  const label = item.label || options.fallbackLabel || "Інше";
  const color = options.color || CALL_TYPE_COLORS[item.type] || CALL_TYPE_COLORS.other;
  const percentage = Number(item.percentage) || 0;
  const count = Number(item.count) || 0;

  const row = document.createElement("article");
  row.className = "call-type-row";
  row.style.setProperty("--chart-color", color);
  row.setAttribute("aria-label", `${label}: ${percentage}%, ${count} дзвінків`);

  const labelBlock = document.createElement("div");
  labelBlock.className = "call-type-label";
  const marker = document.createElement("span");
  marker.className = "call-type-marker";
  const name = document.createElement("strong");
  name.textContent = label;
  const countLabel = document.createElement("small");
  countLabel.textContent = `${count} із ${total}`;
  labelBlock.append(marker, name, countLabel);

  const track = document.createElement("div");
  track.className = "call-type-track";
  const fill = document.createElement("span");
  fill.style.width = `${percentage}%`;
  track.append(fill);

  const percentageLabel = document.createElement("strong");
  percentageLabel.className = "call-type-percentage";
  percentageLabel.textContent = `${percentage}%`;

  row.append(labelBlock, track, percentageLabel);
  container.append(row);
}

function renderCallTypeAnalytics(payload) {
  const categories = Array.isArray(payload && payload.categories)
    ? payload.categories
    : [];
  const questions = Array.isArray(payload && payload.questions)
    ? payload.questions
    : [];
  const usage = (payload && payload.usage) || {};
  const openAiSummary = usage.openAiSummary || {};
  const transcription = usage.transcription || {};
  const escalation = (payload && payload.escalation) || {};
  const churnRisk = (payload && payload.churnRisk) || {};
  const analyzedCalls = Number(payload && payload.analyzedCalls) || 0;
  const classifiedCalls = Number(payload && payload.classifiedCalls) || 0;
  const eligibleCalls = Number(payload && payload.eligibleCalls) || 0;
  const awaitingAnalysis = Number(payload && payload.awaitingAnalysis) || 0;
  const failedCalls = Number(payload && payload.failedCalls) || 0;
  const topType = categories[0] || null;
  const questionTotal = questions.reduce((total, item) => total + Number(item.count || 0), 0);
  const highRiskCount = ((churnRisk.levels || []).find((item) => item.type === "high") || {}).count || 0;

  elements.analyticsAnalyzed.textContent = String(analyzedCalls);
  elements.analyticsAnalyzedCaption.textContent =
    `із ${eligibleCalls} доступних для AI`;
  elements.analyticsPending.textContent = String(awaitingAnalysis);
  elements.analyticsPendingCaption.textContent = `помилок: ${failedCalls}`;
  elements.analyticsTopType.textContent = topType
    ? topType.label || CALL_TYPE_LABELS[topType.type] || "Інше"
    : "Ще немає даних";
  elements.analyticsTopCaption.textContent = topType
    ? `${topType.percentage}% · ${topType.count} дзвінків`
    : "—";
  elements.analyticsAudioMinutes.textContent =
    formatMinutesFromSeconds(usage.analyzedRecordingSeconds || 0);
  elements.analyticsAudioCaption.textContent =
    `середня тривалість: ${formatDuration(usage.averageAnalyzedRecordingSeconds || 0)}`;
  elements.analyticsTokens.textContent = formatNumber(openAiSummary.totalTokens || 0);
  elements.analyticsTokensCaption.textContent =
    `cached: ${formatNumber(openAiSummary.cachedInputTokens || 0)} · usage: ${usage.usageCapturedCalls || 0}`;
  elements.analyticsCost.textContent = formatUsd(usage.estimatedTotalCostUsd || 0);
  elements.analyticsCostCaption.textContent =
    typeof transcription.estimatedCostUsd !== "number"
      ? `OpenAI summary: ${formatUsd(openAiSummary.estimatedCostUsd || 0)}`
      : `Soniox: ${formatUsd(transcription.estimatedCostUsd || 0)} · OpenAI: ${formatUsd(openAiSummary.estimatedCostUsd || 0)}`;
  elements.analyticsEscalations.textContent = String(escalation.needed || 0);
  elements.analyticsEscalationsCaption.textContent =
    analyzedCalls ? `із ${analyzedCalls} проаналізованих` : "потребують передачі";
  elements.analyticsChurnRisk.textContent = String(highRiskCount);
  elements.analyticsChurnRiskCaption.textContent = "високий ризик";

  elements.callTypeOverview.replaceChildren();
  elements.callTypeChart.replaceChildren();
  elements.customerQuestionChart.replaceChildren();
  elements.callTypeEmpty.textContent =
    "За вибраний період ще немає класифікованих AI дзвінків.";
  elements.callTypeEmpty.classList.toggle("hidden", categories.length > 0);
  elements.callTypeOverview.classList.toggle("hidden", categories.length === 0);
  elements.customerQuestionEmpty.classList.toggle("hidden", questions.length > 0);

  for (const category of categories) {
    const label = category.label || CALL_TYPE_LABELS[category.type] || "Інше";
    const color = CALL_TYPE_COLORS[category.type] || CALL_TYPE_COLORS.other;
    const percentage = Number(category.percentage) || 0;
    const count = Number(category.count) || 0;

    const overviewSegment = document.createElement("span");
    overviewSegment.style.setProperty("--chart-color", color);
    overviewSegment.style.width = `${percentage}%`;
    overviewSegment.title = `${label}: ${percentage}% (${count})`;
    elements.callTypeOverview.append(overviewSegment);

    appendAnalyticsDistributionRow(elements.callTypeChart, category, classifiedCalls, {
      color,
      fallbackLabel: "Інше"
    });
  }

  for (const question of questions) {
    appendAnalyticsDistributionRow(elements.customerQuestionChart, question, questionTotal, {
      color: CALL_TYPE_COLORS[question.type] || "var(--accent)",
      fallbackLabel: "Інше"
    });
  }
}

function renderCallTypeAnalyticsError(message) {
  renderCallTypeAnalytics({});
  elements.callTypeEmpty.textContent =
    message || "Не вдалося завантажити аналітику дзвінків.";
}

async function loadMonitorAnalytics(query = "") {
  const period = elements.monitorAnalyticsPeriod
    ? elements.monitorAnalyticsPeriod.value
    : "30";
  const response = await fetch(
    `/api/binotel-monitor/analytics?period=${encodeURIComponent(period)}&q=${encodeURIComponent(query)}`,
    { headers: { Accept: "application/json" } }
  );
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || "Не вдалося завантажити аналітику дзвінків");
  }

  renderCallTypeAnalytics(payload);
}

async function loadAnalyticsPage(showLoading = true) {
  clearTimeout(monitorPollTimer);
  clearTimeout(detailPollTimer);
  if (showLoading) {
    setState("loading");
  }

  try {
    await loadMonitorAnalytics();
    setState("analytics");
  } catch (error) {
    renderCallTypeAnalyticsError(error.message);
    setState("analytics");
  }
}

function renderMonitorCalls(payload) {
  const calls = Array.isArray(payload && payload.calls) ? payload.calls : [];
  const total = Number(payload && payload.total) || 0;
  const limit = Number(payload && payload.limit) || monitorPageSize;
  const offset = Number(payload && payload.offset) || 0;
  monitorTotalCalls = total;
  monitorPageSize = limit;
  monitorPage = Math.floor(offset / Math.max(1, limit)) + 1;
  if (elements.monitorPageSize && String(elements.monitorPageSize.value) !== String(limit)) {
    elements.monitorPageSize.value = String(limit);
  }
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  if (total > 0 && monitorPage > totalPages) {
    monitorPage = totalPages;
    loadMonitor(false);
    return;
  }
  elements.monitorList.replaceChildren();
  elements.monitorCountLabel.textContent =
    `${payload.total || calls.length} дзвінків у локальній історії`;

  if (!calls.length) {
    const message = document.createElement("p");
    message.className = "no-data";
    message.textContent = "У локальній історії дзвінків ще немає.";
    elements.monitorList.append(message);
    renderMonitorPagination();
    return;
  }

  for (const call of calls) {
    appendMonitorCall(elements.monitorList, call);
  }

  renderMonitorPagination();
}

function paginationPages(currentPage, totalPages) {
  const pages = new Set([1, totalPages]);

  for (let page = currentPage - 2; page <= currentPage + 2; page += 1) {
    if (page > 0 && page <= totalPages) {
      pages.add(page);
    }
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result = [];
  let previous = 0;

  for (const page of sorted) {
    if (previous && page - previous > 1) {
      result.push("ellipsis");
    }
    result.push(page);
    previous = page;
  }

  return result;
}

function renderMonitorPagination() {
  const totalPages = Math.max(1, Math.ceil(monitorTotalCalls / Math.max(1, monitorPageSize)));
  const currentPage = Math.min(Math.max(1, monitorPage), totalPages);
  const start = monitorTotalCalls
    ? (currentPage - 1) * monitorPageSize + 1
    : 0;
  const end = Math.min(monitorTotalCalls, currentPage * monitorPageSize);

  elements.monitorPagination.classList.toggle("hidden", monitorTotalCalls <= 0);
  elements.monitorPrevPage.disabled = currentPage <= 1;
  elements.monitorNextPage.disabled = currentPage >= totalPages;
  elements.monitorPageInfo.textContent = monitorTotalCalls
    ? `${start}-${end} з ${monitorTotalCalls}`
    : "";
  elements.monitorPageNumbers.replaceChildren();

  for (const page of paginationPages(currentPage, totalPages)) {
    if (page === "ellipsis") {
      const dots = document.createElement("span");
      dots.className = "monitor-page-ellipsis";
      dots.textContent = "…";
      elements.monitorPageNumbers.append(dots);
      continue;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "monitor-page-button";
    button.textContent = String(page);
    button.setAttribute("aria-label", `Сторінка ${page}`);
    button.classList.toggle("active", page === currentPage);
    button.disabled = page === currentPage;
    button.addEventListener("click", () => {
      monitorPage = page;
      loadMonitor(false);
    });
    elements.monitorPageNumbers.append(button);
  }
}

function appendMonitorCall(container, call) {
  const fragment = elements.monitorCallTemplate.content.cloneNode(true);
  const ai = call.ai || {};
  const direction = callDirectionInfo(call);
  const disposition = callDispositionInfo(call);
  const typeLabel = callTypeLabel(ai.summary);
  const typeKey = ai.summary && ai.summary.callType;
  const detailLink = fragment.querySelector('[data-field="detail-link"]');
  const typeElement = fragment.querySelector('[data-field="type"]');
  const detailUrl = callDetailUrl(call);
  if (detailUrl) {
    detailLink.href = detailUrl;
  } else {
    detailLink.removeAttribute("href");
  }

  fragment.querySelector('[data-field="phone"]').textContent =
    formatCallPhone(call.externalNumber);
  setCallDirectionIcon(
    fragment.querySelector('[data-field="direction-icon"]'),
    call,
    direction
  );
  typeElement.textContent = typeLabel || fallbackCallTypeText(call, ai, disposition);
  if (typeKey && CALL_TYPE_COLORS[typeKey]) {
    typeElement.style.setProperty("--call-type-color", CALL_TYPE_COLORS[typeKey]);
  }
  fragment.querySelector('[data-field="time"]').textContent =
    formatDateTime(call.startedAt);
  fragment.querySelector('[data-field="operator"]').textContent =
    operatorLabel(call, false);
  fragment.querySelector('[data-field="duration"]').textContent =
    formatDuration(call.billSec);

  container.append(fragment);
}

function appendDetailValue(container, label, value, options = {}) {
  if (value === null || value === undefined || value === "") {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "detail-analysis-item";
  if (options.wide) {
    wrapper.classList.add("detail-analysis-wide");
  }
  if (options.tone) {
    wrapper.dataset.tone = options.tone;
  }
  const isAnalysisCard = container.classList.contains("detail-analysis-group-body");
  const term = document.createElement(isAnalysisCard ? "span" : "dt");
  const description = document.createElement(isAnalysisCard ? "strong" : "dd");
  term.textContent = label;
  description.textContent = String(value);
  wrapper.append(term, description);
  container.append(wrapper);
}

function appendDetailGroup(container, title, subtitle, tone, entries) {
  const normalizedEntries = entries.filter(
    (entry) => entry && entry.value !== null && entry.value !== undefined && entry.value !== ""
  );
  if (!normalizedEntries.length) {
    return;
  }

  const section = document.createElement("section");
  section.className = "detail-analysis-group";
  section.dataset.tone = tone || "neutral";

  const header = document.createElement("header");
  const heading = document.createElement("h3");
  heading.textContent = title;
  header.append(heading);
  if (subtitle) {
    const caption = document.createElement("p");
    caption.textContent = subtitle;
    header.append(caption);
  }

  const body = document.createElement("div");
  body.className = "detail-analysis-group-body";
  for (const entry of normalizedEntries) {
    appendDetailValue(body, entry.label, entry.value, {
      tone: entry.tone,
      wide: entry.wide
    });
  }

  section.append(header, body);
  container.append(section);
}

function operatorNextStepText(nextStep) {
  if (!nextStep || !nextStep.action) {
    return "";
  }

  const label = OPERATOR_NEXT_STEP_LABELS[nextStep.action] || nextStep.action;
  return [label, nextStep.reason].filter(Boolean).join(": ");
}

function escalationText(escalation) {
  if (!escalation) {
    return "";
  }

  const level = ESCALATION_LEVEL_LABELS[escalation.level] || escalation.level;
  const department = ESCALATION_DEPARTMENT_LABELS[escalation.department] || "";
  const prefix = escalation.needed
    ? `Потрібна (${[level, department].filter(Boolean).join(", ")})`
    : level || "Не потрібна";
  return [prefix, escalation.reason].filter(Boolean).join(": ");
}

function churnRiskText(churnRisk) {
  if (!churnRisk || !churnRisk.level) {
    return "";
  }

  const label = CHURN_RISK_LABELS[churnRisk.level] || churnRisk.level;
  return [label, churnRisk.reason].filter(Boolean).join(": ");
}

function customerQuestionsText(questions) {
  if (!Array.isArray(questions) || !questions.length) {
    return "";
  }

  return questions
    .map((question) =>
      [question.label || question.type, question.evidence].filter(Boolean).join(" — ")
    )
    .join("; ");
}

function clientContextUsageText(usage) {
  if (!usage) {
    return "";
  }

  const parts = [];
  if (usage.used) {
    parts.push("Використано");
  } else {
    parts.push("Не використано");
  }
  if (usage.matchedOrderId) {
    parts.push(`зам. ${usage.matchedOrderId}`);
  }
  if (usage.matchedTicketId) {
    parts.push(`кв. ${usage.matchedTicketId}`);
  }
  if (usage.reason) {
    parts.push(usage.reason);
  }
  return parts.join(": ");
}

function escalationToneValue(escalation) {
  if (!escalation || !escalation.needed || escalation.level === "none") {
    return "success";
  }
  if (escalation.level === "high") {
    return "danger";
  }
  if (escalation.level === "medium") {
    return "warning";
  }
  return "info";
}

function churnRiskToneValue(churnRisk) {
  if (!churnRisk || churnRisk.level === "unknown") {
    return "neutral";
  }
  if (churnRisk.level === "high") {
    return "danger";
  }
  if (churnRisk.level === "medium") {
    return "warning";
  }
  return "success";
}

function confidenceTone(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) {
    return "neutral";
  }
  if (score >= 0.8) {
    return "success";
  }
  if (score >= 0.55) {
    return "warning";
  }
  return "danger";
}

function scoreLevel(score) {
  if (!Number.isFinite(Number(score))) {
    return "empty";
  }

  const value = Number(score);
  if (value >= 80) {
    return "good";
  }
  if (value >= 50) {
    return "warning";
  }
  return "bad";
}

function formatScore(score) {
  return Number.isFinite(Number(score)) ? `${Math.round(Number(score))}%` : "—";
}

function appendQualityMetric(container, label, value, isWide = false) {
  if (!container || value === null || value === undefined || value === "") {
    return;
  }

  const item = document.createElement("div");
  item.className = isWide ? "quality-context-item quality-context-wide" : "quality-context-item";
  const caption = document.createElement("span");
  const text = document.createElement("strong");
  caption.textContent = label;
  text.textContent = String(value);
  item.append(caption, text);
  container.append(item);
}

function normalizeTextList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function appendQualityNoteGroup(title, values) {
  const normalizedValues = normalizeTextList(values);
  if (!normalizedValues.length) {
    return;
  }

  const group = document.createElement("div");
  const heading = document.createElement("strong");
  const list = document.createElement("ul");
  heading.textContent = title;
  for (const value of normalizedValues) {
    const item = document.createElement("li");
    item.textContent = value;
    list.append(item);
  }
  group.append(heading, list);
  elements.detailQualityNotes.append(group);
}

function renderCallQuality(summary) {
  const evaluation = summary && summary.operatorEvaluation;
  elements.detailQualityCriteria.replaceChildren();
  if (elements.detailQualityContext) {
    elements.detailQualityContext.replaceChildren();
  }
  elements.detailQualityNotes.replaceChildren();

  if (!evaluation) {
    elements.detailQualityScore.textContent = "—";
    elements.detailQualityScore.className = "quality-score quality-empty";
    elements.detailQualitySummary.textContent =
      "Оцінка зʼявиться після повторного AI-аналізу дзвінка.";
    return;
  }

  const overallLevel = evaluation.overallLabel === "Недостатньо даних"
    ? "empty"
    : scoreLevel(evaluation.overallScore);
  elements.detailQualityScore.textContent = formatScore(evaluation.overallScore);
  elements.detailQualityScore.className = `quality-score quality-${overallLevel}`;
  elements.detailQualitySummary.textContent =
    evaluation.summary || evaluation.overallLabel || "Оцінка дзвінка готова.";

  if (elements.detailQualityContext) {
    appendQualityMetric(
      elements.detailQualityContext,
      "Впевненість",
      typeof evaluation.confidence === "number"
        ? `${Math.round(evaluation.confidence * 100)}%`
        : ""
    );
  }

  for (const criterion of evaluation.criteria || []) {
    const item = document.createElement("article");
    item.className = `quality-item quality-${scoreLevel(criterion.score)}`;

    const header = document.createElement("div");
    const label = document.createElement("strong");
    label.textContent = criterion.label || "Критерій";
    const score = document.createElement("span");
    score.textContent = formatScore(criterion.score);
    header.append(label, score);
    item.append(header);

    if (criterion.explanation) {
      const explanation = document.createElement("p");
      explanation.textContent = criterion.explanation;
      item.append(explanation);
    }

    if (criterion.improvement) {
      const improvement = document.createElement("small");
      improvement.className = "quality-improvement";
      improvement.textContent = `Порада: ${criterion.improvement}`;
      item.append(improvement);
    }

    elements.detailQualityCriteria.append(item);
  }

  appendQualityNoteGroup("Що добре", evaluation.strengths || []);
  appendQualityNoteGroup(
    "Що покращити",
    evaluation.improvements || evaluation.risks || []
  );
}

function segmentTimestamp(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function speakerRoles(summary) {
  const roles = new Map();
  for (const speaker of (summary && summary.speakers) || []) {
    if (speaker && speaker.speaker) {
      roles.set(String(speaker.speaker), speaker.role || "unknown");
    }
  }
  return roles;
}

function speakerLabel(speaker, role) {
  if (role === "client") {
    return "Клієнт";
  }
  if (role === "operator") {
    return "Оператор";
  }
  return `Співрозмовник ${speaker || ""}`.trim();
}

function renderTranscript(ai) {
  elements.detailTranscript.replaceChildren();
  const transcript = ai && ai.transcript;
  const segments = Array.isArray(transcript && transcript.segments)
    ? transcript.segments
    : [];
  const roles = speakerRoles(ai && ai.summary);

  if (segments.length) {
    for (const segment of segments) {
      const role = roles.get(String(segment.speaker)) || "unknown";
      const item = document.createElement("article");
      item.className = `transcript-item transcript-${role}`;

      const play = document.createElement("button");
      play.className = "transcript-play";
      play.type = "button";
      play.textContent = "▶";
      play.setAttribute("aria-label", `Відтворити з ${segmentTimestamp(segment.start)}`);
      play.disabled = !Number.isFinite(Number(segment.start));
      play.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        try {
          await playDetailAudioFrom(segment.start);
        } catch (error) {
          elements.detailAudioStatus.textContent = error.message;
        }
      });

      const header = document.createElement("header");
      const speaker = document.createElement("strong");
      speaker.textContent = speakerLabel(segment.speaker, role);
      const time = document.createElement("span");
      time.textContent = segmentTimestamp(segment.start);
      header.append(speaker, time);

      const body = document.createElement("p");
      body.textContent = segment.text || "";
      item.append(play, header, body);
      elements.detailTranscript.append(item);
    }
    return;
  }

  if (transcript && transcript.text) {
    const textBlock = document.createElement("pre");
    textBlock.className = "transcript-plain";
    textBlock.textContent = transcript.text;
    elements.detailTranscript.append(textBlock);
    return;
  }

  const message = document.createElement("p");
  message.className = "no-data";
  message.textContent = ai && ai.status === "processing"
    ? "Транскрипція ще готується."
    : "Текст розмови поки недоступний.";
  elements.detailTranscript.append(message);
}

function updateDetailReanalyzeButton(call, ai) {
  if (!elements.detailReanalyzeAi) {
    return;
  }

  const status = ai && ai.status;
  const isRunning = status === "queued" || status === "processing";
  const canAnalyze = Boolean(call && call.recordable);

  elements.detailReanalyzeAi.disabled = !canAnalyze || isRunning;
  elements.detailReanalyzeAi.dataset.loading = isRunning ? "true" : "false";

  if (!canAnalyze) {
    elements.detailReanalyzeAi.textContent = "Немає запису для AI-аналізу";
    return;
  }

  elements.detailReanalyzeAi.textContent = isRunning
    ? "AI-аналіз виконується..."
    : "Запустити AI-аналіз заново";
}

function renderCallDetail(call) {
  const ai = call.ai || {};
  const summary = ai.summary || {};
  const direction = callDirectionInfo(call);
  const disposition = callDispositionInfo(call);
  const aiStatus = aiStatusInfo(ai.status, ai.terminalFailure);
  const typeLabel = callTypeLabel(summary);
  const id = callId(call);
  const transcript = ai && ai.transcript;
  const transcriptSegments = Array.isArray(transcript && transcript.segments)
    ? transcript.segments
    : [];

  currentDetailCallId = id;
  detailAudioState.segments = transcriptSegments;
  detailAudioState.roles = speakerRoles(summary);
  elements.detailPhone.textContent = formatCallPhone(call.externalNumber);
  elements.detailDate.textContent = formatDateTime(call.startedAt);
  elements.detailOperator.textContent = operatorLabel(call);
  elements.detailDirection.textContent = `${direction.label} · ${disposition.label}`;
  elements.detailDuration.textContent = formatDuration(call.billSec);
  elements.detailBinotelId.textContent = id || "—";
  void loadDetailTickets(call.externalNumber);
  elements.detailCallType.textContent =
    typeLabel || fallbackCallTypeText(call, ai, disposition);
  elements.detailCallType.className = `status ${typeLabel ? "status-reserved" : ""}`;
  const typeColor = CALL_TYPE_COLORS[summary.callType];
  if (typeColor) {
    elements.detailCallType.style.setProperty("--call-type-color", typeColor);
  } else {
    elements.detailCallType.style.removeProperty("--call-type-color");
  }
  elements.detailAiStatus.textContent = aiStatus.label;
  elements.detailAiStatus.className = `status ${aiStatus.className}`;
  updateDetailReanalyzeButton(call, ai);
  elements.detailSummary.textContent =
    summary.summary ||
    (ai.terminalFailure
      ? [ai.message, ai.error].filter(Boolean).join(" ")
      : ai.message || ai.error || "AI-підсумок ще готується.");

  elements.detailAnalysisList.replaceChildren();
  const operatorNextStep = operatorNextStepText(summary.operatorNextStep);
  const escalationValue = escalationText(summary.escalation);
  const churnRiskValue = churnRiskText(summary.churnRisk);

  appendDetailGroup(
    elements.detailAnalysisList,
    "Головне по дзвінку",
    "Мінімум, який потрібен оператору.",
    "action",
    [
      {
        label: "Питання клієнта",
        value: customerQuestionsText(summary.customerQuestions),
        tone: "accent",
        wide: true
      },
      {
        label: "Дія після дзвінка",
        value: operatorNextStep,
        tone: "info",
        wide: true
      },
      {
        label: "Ескалація",
        value: escalationValue,
        tone: escalationToneValue(summary.escalation)
      },
      {
        label: "Ризик втрати",
        value: churnRiskValue,
        tone: churnRiskToneValue(summary.churnRisk)
      }
    ]
  );
  renderCallQuality(summary);

  if (call.recordingUrl) {
    setDetailRecordingUrl(call.recordingUrl);
    elements.detailAudioStatus.textContent = call.recordingCached
      ? "Запис завантажено в локальний кеш."
      : "Запис завантажиться при першому прослуховуванні.";
  } else {
    resetDetailAudioPlayer();
    elements.detailAudioStatus.textContent = "Для цього дзвінка немає доступного запису.";
  }

  elements.detailLanguage.textContent = summary.language
    ? `Мова: ${summary.language}`
    : "";
  renderTranscript(ai);

  elements.detailTechnical.replaceChildren();
  appendDetailValue(elements.detailTechnical, "Статус", aiStatus.label);
  appendDetailValue(elements.detailTechnical, "Етап", ai.stage);
  appendDetailValue(elements.detailTechnical, "Повних спроб", ai.attempts || 0);
  appendDetailValue(
    elements.detailTechnical,
    "Модель транскрипції",
    ai.models && ai.models.transcription
  );
  appendDetailValue(
    elements.detailTechnical,
    "Модель підсумку",
    ai.models && ai.models.summary
  );
  appendDetailValue(
    elements.detailTechnical,
    "Тривалість запису",
    ai.callDurationSec ? formatDuration(ai.callDurationSec) : ""
  );
  appendDetailValue(
    elements.detailTechnical,
    "OpenAI input tokens",
    ai.usage && ai.usage.summary
      ? formatNumber(ai.usage.summary.inputTokens || 0)
      : ""
  );
  appendDetailValue(
    elements.detailTechnical,
    "OpenAI cached tokens",
    ai.usage && ai.usage.summary
      ? formatNumber(ai.usage.summary.cachedInputTokens || 0)
      : ""
  );
  appendDetailValue(
    elements.detailTechnical,
    "OpenAI output tokens",
    ai.usage && ai.usage.summary
      ? formatNumber(ai.usage.summary.outputTokens || 0)
      : ""
  );
  appendDetailValue(
    elements.detailTechnical,
    "Якість транскрипції",
    ai.transcription && ai.transcription.quality &&
      ai.transcription.quality.initialIssue
      ? ai.transcription.quality.initialIssue
      : ai.transcription
        ? "без автоматично виявлених проблем"
        : ""
  );
  appendDetailValue(elements.detailTechnical, "Остання помилка", ai.error);

  document.title = `${formatCallPhone(call.externalNumber)} · Дзвінок | DUMA`;
  setState("detail");
}

function isDetailAudioActive() {
  return Boolean(
    elements.detailAudio &&
    !elements.detailAudio.ended &&
    (!elements.detailAudio.paused || elements.detailAudio.currentTime > 0)
  );
}

function scheduleDetailPoll() {
  clearTimeout(detailPollTimer);
  if (!currentDetailCallId) {
    return;
  }

  detailPollTimer = setTimeout(() => {
    loadCallDetail(currentDetailCallId, false, true);
  }, 5000);
}

async function loadCallDetail(callIdValue, showLoading = true, preservePlayback = false) {
  clearTimeout(monitorPollTimer);
  clearTimeout(summaryPollTimer);
  const id = String(callIdValue || "").trim();
  if (!id) {
    return;
  }

  currentDetailCallId = id;
  if (showLoading) {
    setState("loading");
  }

  try {
    const response = await fetch(
      `/api/binotel-monitor/call?callId=${encodeURIComponent(id)}`,
      { headers: { Accept: "application/json" } }
    );
    const call = await response.json();
    if (!response.ok) {
      throw new Error(call.error || "Не вдалося завантажити дзвінок");
    }

    if (!(preservePlayback && isDetailAudioActive())) {
      renderCallDetail(call);
    } else {
      setState("detail");
    }

    const ai = call.ai || {};
    if (["queued", "processing"].includes(ai.status) && !ai.terminalFailure) {
      scheduleDetailPoll();
    }
  } catch (error) {
    setState("detail");
    elements.detailSummary.textContent = error.message;
    detailTicketsPhone = "";
    detailTicketsLoaded = true;
    detailTicketsLoading = false;
    currentDetailTickets = [];
    renderDetailTicketsMessage("Дані дзвінка недоступні.", "—");
    elements.detailTranscript.replaceChildren();
    const message = document.createElement("p");
    message.className = "no-data";
    message.textContent = "Дані дзвінка недоступні.";
    elements.detailTranscript.append(message);
  }
}

async function reanalyzeCurrentCall() {
  const id = String(currentDetailCallId || "").trim();
  if (!id || !elements.detailReanalyzeAi || elements.detailReanalyzeAi.disabled) {
    return;
  }

  elements.detailReanalyzeAi.disabled = true;
  elements.detailReanalyzeAi.dataset.loading = "true";
  elements.detailReanalyzeAi.textContent = "Ставимо в чергу...";
  elements.detailAiStatus.textContent = "В черзі";
  elements.detailSummary.textContent = "Повторний AI-аналіз поставлено в чергу.";
  clearTimeout(detailPollTimer);

  try {
    const response = await fetch("/api/binotel-monitor/call/reanalyze", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ callId: id })
    });
    const payload = await response.json();
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "Не вдалося запустити AI-аналіз заново");
    }

    await loadCallDetail(id, false, isDetailAudioActive());
    scheduleDetailPoll();
  } catch (error) {
    elements.detailReanalyzeAi.disabled = false;
    elements.detailReanalyzeAi.dataset.loading = "false";
    elements.detailReanalyzeAi.textContent = "Запустити AI-аналіз заново";
    elements.detailSummary.textContent = error.message;
  }
}

function scheduleMonitorPoll() {
  clearTimeout(monitorPollTimer);
  monitorPollTimer = setTimeout(() => {
    if (isMonitorAudioActive()) {
      scheduleMonitorPoll();
      return;
    }
    loadMonitor(false, true);
  }, MONITOR_POLL_MS);
}

function isMonitorAudioActive() {
  return [...elements.monitorList.querySelectorAll("audio")].some(
    (audio) => !audio.ended && (!audio.paused || audio.currentTime > 0)
  );
}

async function loadMonitor(showLoading = true, preservePlayback = false) {
  clearTimeout(summaryPollTimer);
  clearTimeout(detailPollTimer);
  currentSummaryCallId = "";
  currentPhone = "";

  if (showLoading) {
    setState("loading");
  }

  try {
    const query = elements.monitorQuery ? elements.monitorQuery.value.trim() : "";
    const limit = Number(elements.monitorPageSize && elements.monitorPageSize.value) || monitorPageSize || 10;
    monitorPageSize = limit;
    const offset = Math.max(0, (Math.max(1, monitorPage) - 1) * limit);
    const [statusResponse, callsResponse] = await Promise.all([
      fetch("/api/binotel-monitor/status", { headers: { Accept: "application/json" } }),
      fetch(
        `/api/binotel-monitor/calls?limit=${encodeURIComponent(limit)}&offset=${encodeURIComponent(offset)}&q=${encodeURIComponent(query)}`,
        { headers: { Accept: "application/json" } }
      )
    ]);
    const status = await statusResponse.json();
    const calls = await callsResponse.json();

    if (!statusResponse.ok) {
      throw new Error(status.error || "Не вдалося отримати статус монітора");
    }

    if (!callsResponse.ok) {
      throw new Error(calls.error || "Не вдалося отримати дзвінки");
    }

    renderMonitorStatus(status);
    if (!(preservePlayback && isMonitorAudioActive())) {
      renderMonitorCalls(calls);
    }
    setState("monitor");
  } catch (error) {
    setState("monitor");
    if (!(preservePlayback && isMonitorAudioActive())) {
      elements.monitorList.replaceChildren();
      const message = document.createElement("p");
      message.className = "no-data";
      message.textContent = error.message;
      elements.monitorList.append(message);
    }
  } finally {
    scheduleMonitorPoll();
  }
}

if (elements.detailReanalyzeAi) {
  elements.detailReanalyzeAi.addEventListener("click", () => {
    void reanalyzeCurrentCall();
  });
}

elements.detailAudioPlay.addEventListener("pointerdown", (event) => {
  event.stopPropagation();
});

elements.detailAudioPlay.addEventListener("click", (event) => {
  event.preventDefault();
  event.stopPropagation();
  void toggleDetailAudioPlayback().catch((error) => {
    elements.detailAudioStatus.textContent = error.message;
    syncDetailAudioControls({ force: true, realTime: true });
  });
});

elements.detailAudio.addEventListener("loadedmetadata", () => {
  detailAudioState.buffering = false;
  syncDetailAudioClock();
  buildSyntheticDetailPeaks();
  syncDetailAudioControls({ force: true, realTime: true });
});
elements.detailAudio.addEventListener("timeupdate", () => {
  syncDetailAudioClock();
  if (!detailAudioState.seeking) {
    syncDetailAudioControls();
  }
});
elements.detailAudio.addEventListener("play", () => {
  detailAudioState.desiredPlaying = true;
  detailAudioState.buffering = false;
  syncDetailAudioClock();
  startDetailAudioAnimation();
});
elements.detailAudio.addEventListener("playing", () => {
  detailAudioState.buffering = false;
  syncDetailAudioClock();
  startDetailAudioAnimation();
});
elements.detailAudio.addEventListener("waiting", () => {
  detailAudioState.buffering = true;
  syncDetailAudioControls({ force: true, realTime: true });
});
elements.detailAudio.addEventListener("stalled", () => {
  detailAudioState.buffering = true;
  syncDetailAudioControls({ force: true, realTime: true });
});
elements.detailAudio.addEventListener("canplay", () => {
  detailAudioState.buffering = false;
  syncDetailAudioClock();
});
elements.detailAudio.addEventListener("pause", () => {
  detailAudioState.desiredPlaying = false;
  detailAudioState.buffering = false;
  cancelAnimationFrame(detailAudioState.animationFrame);
  syncDetailAudioClock();
  syncDetailAudioControls({ force: true, realTime: true });
});
elements.detailAudio.addEventListener("ended", () => {
  detailAudioState.desiredPlaying = false;
  detailAudioState.buffering = false;
  cancelAnimationFrame(detailAudioState.animationFrame);
  syncDetailAudioClock();
  syncDetailAudioControls({ force: true, realTime: true });
});
elements.detailAudio.addEventListener("error", () => {
  detailAudioState.desiredPlaying = false;
  detailAudioState.buffering = false;
  cancelAnimationFrame(detailAudioState.animationFrame);
  elements.detailAudioStatus.textContent = "Не вдалося відтворити запис.";
  syncDetailAudioControls({ force: true, realTime: true });
});

elements.detailAudioProgress.addEventListener("input", () => {
  detailAudioState.seeking = true;
  seekDetailAudio(Number(elements.detailAudioProgress.value || 0) / 1000);
});
elements.detailAudioProgress.addEventListener("change", () => {
  detailAudioState.seeking = false;
  syncDetailAudioClock();
  syncDetailAudioControls({ force: true, realTime: true });
});

elements.detailAudioVisual.addEventListener("click", (event) => {
  if (event.target === elements.detailAudioPlay || elements.detailAudioPlay.contains(event.target)) {
    return;
  }

  const rect = elements.detailAudioVisual.getBoundingClientRect();
  seekDetailAudio((event.clientX - rect.left) / Math.max(1, rect.width));
});

elements.detailAudioVisual.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") {
    event.preventDefault();
    elements.detailAudioPlay.click();
  }
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    seekDetailAudio((Number(elements.detailAudioProgress.value || 0) - 40) / 1000);
  }
  if (event.key === "ArrowRight") {
    event.preventDefault();
    seekDetailAudio((Number(elements.detailAudioProgress.value || 0) + 40) / 1000);
  }
});

elements.detailAudioSpeed.addEventListener("click", () => {
  detailAudioState.speedIndex =
    (detailAudioState.speedIndex + 1) % detailAudioState.speeds.length;
  const speed = detailAudioState.speeds[detailAudioState.speedIndex];
  elements.detailAudio.playbackRate = speed;
  syncDetailAudioClock();
  elements.detailAudioSpeed.textContent = `${speed}×`;
});

window.addEventListener("resize", () => {
  resizeDetailAudioCanvas(true);
  if (elements.detailAudio.src) {
    buildSyntheticDetailPeaks();
  }
  drawDetailAudioCanvas();
});

elements.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadClient(elements.phoneInput.value);
});

elements.monitorSearchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  monitorPage = 1;
  loadMonitor();
});

elements.monitorRefresh.addEventListener("click", () => {
  loadMonitor();
});

elements.monitorAnalyticsPeriod.addEventListener("change", () => {
  loadAnalyticsPage(false);
});

elements.monitorPageSize.addEventListener("change", () => {
  monitorPageSize = Number(elements.monitorPageSize.value) || 10;
  monitorPage = 1;
  loadMonitor(false);
});

elements.monitorPrevPage.addEventListener("click", () => {
  if (monitorPage <= 1) {
    return;
  }

  monitorPage -= 1;
  loadMonitor(false);
});

elements.monitorNextPage.addEventListener("click", () => {
  const totalPages = Math.max(1, Math.ceil(monitorTotalCalls / Math.max(1, monitorPageSize)));
  if (monitorPage >= totalPages) {
    return;
  }

  monitorPage += 1;
  loadMonitor(false);
});

elements.themeToggle.addEventListener("click", () => {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
});

elements.ticketsModalClose.addEventListener("click", closeTicketsModal);

elements.ticketsModal.addEventListener("click", (event) => {
  if (event.target === elements.ticketsModal) {
    closeTicketsModal();
  }
});

elements.callsModalClose.addEventListener("click", closeCallsModal);

elements.callsModal.addEventListener("click", (event) => {
  if (event.target === elements.callsModal) {
    closeCallsModal();
  }
});

elements.noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const noteText = elements.noteText.value.trim();

  if (!noteText || !currentPhone) {
    return;
  }

  elements.noteMessage.textContent = "Зберігаємо…";

  try {
    const response = await fetch("/api/client-notes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        phone: currentPhone,
        text: noteText
      })
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Не вдалося зберегти примітку");
    }

    elements.noteText.value = "";
    elements.noteMessage.textContent = "";
    await loadClient(currentPhone);
  } catch (error) {
    elements.noteMessage.textContent = error.message;
  }
});

const initialPhone = new URLSearchParams(window.location.search).get("phone");
const callDetailMatch = window.location.pathname.match(/^\/calls\/([^/]+)$/);
document.body.dataset.theme = document.documentElement.dataset.theme || "light";
updateThemeControl();
if (callDetailMatch) {
  loadCallDetail(decodeURIComponent(callDetailMatch[1]));
} else if (window.location.pathname === "/calls-monitor") {
  loadMonitor();
} else if (window.location.pathname === "/call-analytics") {
  loadAnalyticsPage();
} else if (initialPhone) {
  loadClient(initialPhone);
} else {
  setState("empty");
}
