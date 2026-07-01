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
  profileMenu: document.querySelector("#profile-menu"),
  profileMenuTrigger: document.querySelector("#profile-menu-trigger"),
  profileMenuPopover: document.querySelector("#profile-menu-popover"),
  profileMenuInitial: document.querySelector("#profile-menu-initial"),
  profileMenuName: document.querySelector("#profile-menu-name"),
  profileMenuRole: document.querySelector("#profile-menu-role"),
  profileAdminOnly: document.querySelectorAll("[data-profile-admin-only]"),
  changePasswordButton: document.querySelector("#change-password-button"),
  logoutButton: document.querySelector("#logout-button"),
  changePasswordModal: document.querySelector("#change-password-modal"),
  changePasswordForm: document.querySelector("#change-password-form"),
  changePasswordClose: document.querySelector("#change-password-close"),
  changePasswordCancel: document.querySelector("#change-password-cancel"),
  changePasswordSubmit: document.querySelector("#change-password-submit"),
  changePasswordCurrent: document.querySelector("#change-password-current"),
  changePasswordNew: document.querySelector("#change-password-new"),
  changePasswordConfirm: document.querySelector("#change-password-confirm"),
  changePasswordMessage: document.querySelector("#change-password-message"),
  pageTitle: document.querySelector("#page-title"),
  emptyState: document.querySelector("#empty-state"),
  loadingState: document.querySelector("#loading-state"),
  clientCard: document.querySelector("#client-card"),
  monitorPage: document.querySelector("#calls-monitor-page"),
  analyticsPage: document.querySelector("#analytics-page"),
  aiSettingsPage: document.querySelector("#ai-settings-page"),
  adminPage: document.querySelector("#admin-page"),
  adminAddUser: document.querySelector("#admin-add-user"),
  adminUserCount: document.querySelector("#admin-user-count"),
  adminUsersMessage: document.querySelector("#admin-users-message"),
  adminUsersList: document.querySelector("#admin-users-list"),
  adminUserModal: document.querySelector("#admin-user-modal"),
  adminUserForm: document.querySelector("#admin-user-form"),
  adminUserModalTitle: document.querySelector("#admin-user-modal-title"),
  adminUserClose: document.querySelector("#admin-user-close"),
  adminUserCancel: document.querySelector("#admin-user-cancel"),
  adminUserSubmit: document.querySelector("#admin-user-submit"),
  adminUserId: document.querySelector("#admin-user-id"),
  adminUserUsername: document.querySelector("#admin-user-username"),
  adminUserName: document.querySelector("#admin-user-name"),
  adminUserRole: document.querySelector("#admin-user-role"),
  adminUserPassword: document.querySelector("#admin-user-password"),
  adminUserPasswordLabel: document.querySelector("#admin-user-password-label"),
  adminUserMessage: document.querySelector("#admin-user-message"),
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
  aiSettingsStatus: document.querySelector("#ai-settings-status"),
  aiSettingsMessage: document.querySelector("#ai-settings-message"),
  aiSettingsTabs: document.querySelector("#ai-settings-tabs"),
  aiSettingsTabAi: document.querySelector("#ai-settings-tab-ai"),
  aiSettingsTabExclusions: document.querySelector("#ai-settings-tab-exclusions"),
  aiSettingsTabBlocked: document.querySelector("#ai-settings-tab-blocked"),
  aiSettingsListHero: document.querySelector("#ai-settings-list-hero"),
  aiSettingsDetailHero: document.querySelector("#ai-settings-detail-hero"),
  aiSettingsListView: document.querySelector("#ai-settings-list-view"),
  aiSettingsDetailView: document.querySelector("#ai-settings-detail-view"),
  aiCallTypeCount: document.querySelector("#ai-call-type-count"),
  aiCallTypeList: document.querySelector("#ai-call-type-list"),
  aiShowInactive: document.querySelector("#ai-show-inactive"),
  aiBackToTypes: document.querySelector("#ai-back-to-types"),
  aiDetailTitle: document.querySelector("#ai-detail-title"),
  aiDetailDescription: document.querySelector("#ai-detail-description"),
  aiGeneralSettings: document.querySelector("#ai-general-settings"),
  aiMetricCount: document.querySelector("#ai-metric-count"),
  aiMetricList: document.querySelector("#ai-metric-list"),
  aiAddMetric: document.querySelector("#ai-add-metric"),
  aiMetricModal: document.querySelector("#ai-metric-modal"),
  aiMetricModalForm: document.querySelector("#ai-metric-modal-form"),
  aiMetricModalClose: document.querySelector("#ai-metric-modal-close"),
  aiMetricCancel: document.querySelector("#ai-metric-cancel"),
  aiModalMetricLabel: document.querySelector("#ai-modal-metric-label"),
  aiModalMetricEnabled: document.querySelector("#ai-modal-metric-enabled"),
  aiModalMetricGroup: document.querySelector("#ai-modal-metric-group"),
  aiModalMetricDescription: document.querySelector("#ai-modal-metric-description"),
  aiModalMetricInstructions: document.querySelector("#ai-modal-metric-instructions"),
  aiModalOptionList: document.querySelector("#ai-modal-option-list"),
  aiModalAddOption: document.querySelector("#ai-modal-add-option"),
  aiTypeModal: document.querySelector("#ai-type-modal"),
  aiTypeModalForm: document.querySelector("#ai-type-modal-form"),
  aiTypeModalClose: document.querySelector("#ai-type-modal-close"),
  aiTypeCancel: document.querySelector("#ai-type-cancel"),
  aiTypeLabel: document.querySelector("#ai-type-label"),
  aiTypeDescription: document.querySelector("#ai-type-description"),
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
const aiSettingsState = {
  settings: null,
  revision: "",
  selectedCallTypeKey: "",
  selectedMetricKey: "",
  activeTab: "ai",
  screen: "list",
  showInactive: false,
  editingMetricKey: "",
  editingTypeKey: "",
  metricDraft: null,
  typeDraft: null,
  draggingMetricKey: "",
  dragOverMetricKey: "",
  dragOverMetricPosition: "",
  pendingMetricDrag: null,
  suppressMetricClickUntil: 0,
  dirty: false,
  saving: false
};
const AI_SCORE_NONE_VALUE = "__none";
const AI_COLOR_PALETTE = [
  "#ef4444", "#f97316", "#f59e0b", "#facc15", "#eab308", "#84cc16", "#22c55e", "#10b981", "#06b6d4",
  "#0ea5e9", "#3b82f6", "#6366f1", "#8b5cf6", "#a855f7", "#c026d3", "#db2777", "#e11d48",
  "#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d", "#16a34a", "#059669", "#0891b2",
  "#0284c7", "#2563eb", "#4f46e5", "#7c3aed", "#9333ea", "#a21caf", "#be185d", "#be123c",
  "#b91c1c", "#c2410c", "#b45309", "#a16207", "#4d7c0f", "#15803d", "#047857", "#0e7490",
  "#0c4a6e", "#1d4ed8", "#3730a3", "#6d28d9", "#7e22ce", "#86198f", "#9f1239", "#59666d",
  "#374151", "#4b5563", "#6b7280", "#94a3b8", "#cbd5e1", "#e5e7eb", "#f3f4f6", "#f8fafc",
  "#1f2937", "#111827"
];
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
const authState = {
  csrfToken: "",
  user: null
};
const adminState = {
  users: [],
  loading: false,
  editingUserId: ""
};

function loginUrl() {
  const next = `${window.location.pathname}${window.location.search || ""}`;
  return `/login?next=${encodeURIComponent(next || "/client-card")}`;
}

function isUnsafeMethod(method) {
  return !["GET", "HEAD", "OPTIONS"].includes(String(method || "GET").toUpperCase());
}

function isAdminUser(user = authState.user) {
  return Boolean(user && user.role === "admin");
}

function userRoleLabel(role) {
  return role === "admin" ? "Адміністратор" : "Користувач";
}

function userInitial(user = authState.user) {
  const source = String((user && (user.name || user.username)) || "Користувач").trim();
  return (source[0] || "К").toUpperCase();
}

function formatUsersCount(count) {
  const value = Number(count) || 0;
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${value} користувач`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${value} користувачі`;
  }
  return `${value} користувачів`;
}

async function apiFetch(input, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (isUnsafeMethod(options.method) && authState.csrfToken) {
    headers.set("x-csrf-token", authState.csrfToken);
  }

  const response = await fetch(input, {
    ...options,
    headers
  });

  if (response.status === 401) {
    window.location.href = loginUrl();
  }

  return response;
}

async function readJsonResponse(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    throw new Error(payload.message || payload.error || fallbackMessage);
  }
  return payload;
}

function renderProfileMenu() {
  if (!elements.profileMenuName) {
    return;
  }
  const user = authState.user || {};
  const displayName = user.name || user.username || "Користувач";
  elements.profileMenuName.textContent = displayName;
  elements.profileMenuName.title = user.username || displayName;
  if (elements.profileMenuInitial) {
    elements.profileMenuInitial.textContent = userInitial(user);
  }
  if (elements.profileMenuRole) {
    elements.profileMenuRole.textContent = userRoleLabel(user.role);
  }
  for (const node of elements.profileAdminOnly || []) {
    node.hidden = !isAdminUser(user);
  }
}

async function loadAuthSession() {
  const response = await apiFetch("/api/auth/me");
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "unauthorized");
  }
  authState.csrfToken = payload.csrfToken || "";
  authState.user = payload.user || null;
  renderProfileMenu();
}

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

function cloneObject(value) {
  return JSON.parse(JSON.stringify(value));
}

function sortedByOrder(items) {
  return [...(items || [])].sort(
    (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
  );
}

function nextOrder(items) {
  const orders = (items || []).map((item) => Number(item.order) || 0);
  return (orders.length ? Math.max(...orders) : 0) + 10;
}

function newAiKey(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function sanitizeHexColor(value, fallback = "#59666d") {
  const raw = String(value || "").trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toLowerCase() : fallback;
}

function normalizeAiPaletteColor(value, fallback = "#59666d") {
  const color = sanitizeHexColor(value, "");
  if (AI_COLOR_PALETTE.includes(color)) {
    return color;
  }

  const fallbackColor = sanitizeHexColor(fallback, AI_COLOR_PALETTE[0]);
  return AI_COLOR_PALETTE.includes(fallbackColor) ? fallbackColor : AI_COLOR_PALETTE[0];
}

function aiOptionRowByKey(key) {
  if (!elements.aiModalOptionList) {
    return null;
  }

  return [...elements.aiModalOptionList.querySelectorAll("[data-option-key]")]
    .find((row) => row.dataset.optionKey === key) || null;
}

function createAiOption(label, score, color, aiInstructions, order) {
  const normalizedScore = normalizeAiOptionScore(score);
  return {
    key: newAiKey("option"),
    label,
    score: normalizedScore,
    color: normalizeAiPaletteColor(color, scoreColor(normalizedScore)),
    countsTowardScore: normalizedScore !== null,
    aiInstructions,
    order
  };
}

function createAiMetric() {
  return {
    key: newAiKey("metric"),
    label: "Нова метрика",
    group: "Ваші метрики",
    enabled: true,
    order: 10,
    weight: 1,
    type: "ai_option",
    description: "",
    aiInstructions: "",
    options: [
      createAiOption("Сильне виконання", 5, "#22c55e", "Критерій виконано повністю.", 10),
      createAiOption("Частково виконано", 3, "#facc15", "Критерій виконано частково.", 20),
      createAiOption("Не виконано", 0, "#ef4444", "Критерій не виконано.", 30)
    ]
  };
}

const AI_ICON_PATHS = {
  brain: '<path d="M12 5a3 3 0 0 0-5.94-.6A3 3 0 0 0 4 9a4 4 0 0 0 0 8 3 3 0 0 0 4.5 2.6"></path><path d="M12 5a3 3 0 0 1 5.94-.6A3 3 0 0 1 20 9a4 4 0 0 1 0 8 3 3 0 0 1-4.5 2.6"></path><path d="M12 5v14"></path>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.08a2 2 0 0 1 1 1.73v.5a2 2 0 0 1-1 1.73l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.73v-.5a2 2 0 0 1 1-1.73l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle>',
  sparkles: '<path d="m12 3-1.9 5.4L5 10.3l5.1 1.9L12 17.6l1.9-5.4 5.1-1.9-5.1-1.9Z"></path><path d="M5 3v4"></path><path d="M3 5h4"></path><path d="M19 17v4"></path><path d="M17 19h4"></path>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.35 1.9.65 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.3 1.84.52 2.8.65A2 2 0 0 1 22 16.92z"></path>',
  video: '<path d="m22 8-6 4 6 4V8Z"></path><rect width="14" height="12" x="2" y="6" rx="2" ry="2"></rect>',
  message: '<path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"></path>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>',
  grip: '<circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="19" r="1"></circle>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>',
  trash: '<path d="M3 6h18"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>',
  list: '<path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path>',
  target: '<circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle>',
  info: '<circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path>',
  check: '<path d="M20 6 9 17l-5-5"></path>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>',
  zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
  crown: '<path d="m2 5 4 7 6-7 6 7 4-7"></path><path d="M5 14h14"></path><path d="M6 18h12"></path>',
  layers: '<path d="m12 2 10 5-10 5L2 7Z"></path><path d="m2 17 10 5 10-5"></path><path d="m2 12 10 5 10-5"></path>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>',
  ban: '<circle cx="12" cy="12" r="10"></circle><path d="m4.93 4.93 14.14 14.14"></path>',
  chevronLeft: '<path d="m15 18-6-6 6-6"></path>',
  chevronRight: '<path d="m9 18 6-6-6-6"></path>',
  chevronDown: '<path d="m6 9 6 6 6-6"></path>',
  plus: '<path d="M5 12h14"></path><path d="M12 5v14"></path>',
  x: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
  link: '<path d="M9 17H7A5 5 0 0 1 7 7h2"></path><path d="M15 7h2a5 5 0 1 1 0 10h-2"></path><line x1="8" x2="16" y1="12" y2="12"></line>'
};

function aiIcon(name, className = "") {
  const path = AI_ICON_PATHS[name] || AI_ICON_PATHS.sparkles;
  return `<svg class="ai-svg ${className}" viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
}

function hydrateAiStaticIcons(root = document) {
  for (const node of root.querySelectorAll(".ai-js-icon[data-icon]")) {
    node.innerHTML = aiIcon(node.dataset.icon);
  }
}

function aiSwitchHtml(enabled, action, key, label) {
  return `
    <button class="ai-soldly-switch" type="button" data-ai-action="${action}" data-key="${escapeHtml(key)}" data-checked="${enabled !== false}" aria-label="${escapeHtml(label)}" aria-pressed="${enabled !== false}">
      <span></span>
    </button>`;
}

function aiScoreOptionsHtml(value) {
  const selectedScore = normalizeAiOptionScore(value, null);
  let html = `<option value="${AI_SCORE_NONE_VALUE}"${selectedScore === null ? " selected" : ""}>—</option>`;

  for (let score = 0; score <= 5; score += 1) {
    html += `<option value="${score}"${selectedScore === score ? " selected" : ""}>${score}</option>`;
  }

  return html;
}

function aiColorPaletteHtml(optionKey, color) {
  const selectedColor = normalizeAiPaletteColor(color, scoreColor(0));
  return `
    <div class="ai-color-palette">
      <button class="ai-color-swatch" type="button" data-ai-action="toggle-option-palette" data-key="${escapeHtml(optionKey)}" aria-label="Обрати колір варіанту" aria-expanded="false">
        <span style="background: ${selectedColor}"></span>
      </button>
    </div>`;
}

function aiColorMenuHtml(optionKey, color) {
  const selectedColor = normalizeAiPaletteColor(color, scoreColor(0));
  const choices = AI_COLOR_PALETTE.map((paletteColor) => {
    const active = paletteColor === selectedColor;
    return `
      <button class="ai-color-choice${active ? " active" : ""}" type="button" data-ai-action="set-draft-option-color" data-key="${escapeHtml(optionKey)}" data-color="${paletteColor}" aria-label="Колір ${paletteColor}" aria-selected="${active}">
        <span style="background: ${paletteColor}"></span>
      </button>`;
  }).join("");

  return `
    <div class="ai-color-menu" data-color-menu hidden>
      ${choices}
    </div>`;
}

function normalizeAiOptionScore(value, fallback = 0) {
  if (value === undefined) {
    return fallback === null ? null : clampNumber(fallback, 0, 5);
  }
  if (value === null) {
    return null;
  }

  const raw = String(value).trim().toLowerCase();
  if (!raw || raw === AI_SCORE_NONE_VALUE || raw === "-" || raw === "—" || raw === "null") {
    return null;
  }

  return clampNumber(value, 0, 5);
}

function scoreColor(score) {
  if (score === null || score === undefined || score === "") {
    return "#94a3b8";
  }

  if (Number(score) >= 4) {
    return "#84cc16";
  }
  if (Number(score) >= 2) {
    return "#facc15";
  }
  return "#ef4444";
}

function selectedAiCallType() {
  const callTypes = (aiSettingsState.settings && aiSettingsState.settings.callTypes) || [];
  return callTypes.find((item) => item.key === aiSettingsState.selectedCallTypeKey) || null;
}

function findAiMetric(key = aiSettingsState.selectedMetricKey) {
  const callType = selectedAiCallType();
  const metrics = (callType && callType.metrics) || [];
  return metrics.find((item) => item.key === key) || null;
}

function ensureAiSettingsSelection() {
  const callTypes = sortedByOrder(
    (aiSettingsState.settings && aiSettingsState.settings.callTypes) || []
  );
  const callType = callTypes.find((item) => item.key === aiSettingsState.selectedCallTypeKey);

  if (!callType) {
    aiSettingsState.selectedCallTypeKey = "";
    aiSettingsState.selectedMetricKey = "";
    aiSettingsState.screen = "list";
    return;
  }

  const metrics = sortedByOrder(callType.metrics || []);
  if (!metrics.some((metric) => metric.key === aiSettingsState.selectedMetricKey)) {
    aiSettingsState.selectedMetricKey = "";
  }
}

function setAiSettingsMessage(message, tone = "neutral") {
  if (!elements.aiSettingsMessage) {
    return;
  }

  elements.aiSettingsMessage.textContent = message || "";
  elements.aiSettingsMessage.dataset.tone = tone;
}

function markAiSettingsDirty(message = "") {
  aiSettingsState.dirty = true;
  if (message) {
    setAiSettingsMessage(message, "warning");
  }
  updateAiSettingsChrome();
}

function updateAiSettingsChrome() {
  const settings = aiSettingsState.settings;
  const callTypes = (settings && settings.callTypes) || [];
  const activeTypes = callTypes.filter((item) => item.enabled !== false).length;
  const metricCount = callTypes.reduce(
    (total, item) => total + ((item.metrics || []).length),
    0
  );

  if (elements.aiSettingsStatus) {
    elements.aiSettingsStatus.textContent = settings
      ? `${activeTypes}/${callTypes.length} типів активні · ${metricCount} метрик`
      : "Налаштування ще не завантажені.";
  }

  if (elements.aiSettingsPage) {
    elements.aiSettingsPage.dataset.saving = String(aiSettingsState.saving);
  }
}

function renderAiSettingsTabs() {
  if (!elements.aiSettingsTabs) {
    return;
  }

  for (const button of elements.aiSettingsTabs.querySelectorAll("[data-ai-tab]")) {
    const active = button.dataset.aiTab === aiSettingsState.activeTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  }

  elements.aiSettingsTabAi.classList.toggle("hidden", aiSettingsState.activeTab !== "ai");
  elements.aiSettingsTabExclusions.classList.toggle("hidden", aiSettingsState.activeTab !== "exclusions");
  elements.aiSettingsTabBlocked.classList.toggle("hidden", aiSettingsState.activeTab !== "blocked");
}

function renderAiCallTypeList() {
  const allCallTypes = sortedByOrder(
    (aiSettingsState.settings && aiSettingsState.settings.callTypes) || []
  );
  const callTypes = aiSettingsState.showInactive
    ? allCallTypes
    : allCallTypes.filter((callType) => callType.enabled !== false);

  elements.aiCallTypeList.replaceChildren();
  elements.aiCallTypeCount.textContent = `${callTypes.length}`;
  elements.aiShowInactive.dataset.active = String(aiSettingsState.showInactive);

  if (!callTypes.length) {
    const message = document.createElement("p");
    message.className = "ai-soldly-empty";
    message.textContent = aiSettingsState.showInactive
      ? "Типів аналізу ще немає."
      : "Активних типів немає. Увімкніть показ неактивних.";
    elements.aiCallTypeList.append(message);
    return;
  }

  for (const callType of callTypes) {
    const metrics = Array.isArray(callType.metrics) ? callType.metrics : [];
    const activeMetrics = metrics.filter((item) => item.enabled !== false).length;
    const row = document.createElement("article");
    row.className = "ai-type-card";
    row.innerHTML = `
      <div class="ai-type-card-main">
        <span class="ai-grip">${aiIcon("grip")}</span>
        <button class="ai-type-open" type="button" data-ai-action="select-call-type" data-key="${escapeHtml(callType.key)}">
          <strong>${escapeHtml(callType.label || callType.key)}</strong>
          <span>${activeMetrics}/${metrics.length} метрик</span>
        </button>
      </div>
      <div class="ai-type-card-actions">
        ${aiSwitchHtml(callType.enabled !== false, "toggle-call-type", callType.key, "Увімкнути тип аналізу")}
        <button class="ai-icon-button-soft" type="button" data-ai-action="duplicate-call-type" data-key="${escapeHtml(callType.key)}" aria-label="Дублювати тип">${aiIcon("copy")}</button>
        <button class="ai-icon-button-soft" type="button" data-ai-action="delete-call-type" data-key="${escapeHtml(callType.key)}" aria-label="Видалити тип">${aiIcon("trash")}</button>
      </div>`;
    elements.aiCallTypeList.append(row);
  }
}

function renderAiMetricList() {
  const callType = selectedAiCallType();
  const metrics = sortedByOrder((callType && callType.metrics) || []);
  const activeMetrics = metrics.filter((item) => item.enabled !== false).length;
  elements.aiMetricList.replaceChildren();
  elements.aiMetricCount.textContent = `${activeMetrics}/${metrics.length}`;

  if (!metrics.length) {
    const message = document.createElement("p");
    message.className = "ai-soldly-empty";
    message.textContent = "Метрик для цього типу ще немає.";
    elements.aiMetricList.append(message);
    return;
  }

  for (const metric of metrics) {
    const row = document.createElement("article");
    row.className = "ai-metric-card";
    row.dataset.metricKey = metric.key;
    row.classList.toggle("dragging", metric.key === aiSettingsState.draggingMetricKey);
    row.innerHTML = `
      <div class="ai-metric-card-main">
        <span class="ai-grip" role="button" tabindex="0" aria-label="Змінити порядок метрики" title="Перетягніть, щоб змінити порядок">${aiIcon("grip")}</span>
        ${aiSwitchHtml(metric.enabled !== false, "toggle-metric", metric.key, "Увімкнути оцінку метрики")}
        <button class="ai-metric-open" type="button" data-ai-action="edit-metric" data-key="${escapeHtml(metric.key)}">
          <span class="ai-list-icon">${aiIcon("list")}</span>
          <strong>${escapeHtml(metric.label || metric.key)}</strong>
        </button>
      </div>
      <div class="ai-metric-actions">
        <button class="ai-icon-button-soft" type="button" data-ai-action="edit-metric" data-key="${escapeHtml(metric.key)}" aria-label="Редагувати метрику">${aiIcon("settings")}</button>
        <button class="ai-icon-button-soft" type="button" data-ai-action="delete-metric" data-key="${escapeHtml(metric.key)}" aria-label="Видалити метрику">${aiIcon("trash")}</button>
      </div>`;
    elements.aiMetricList.append(row);
  }
}

function clearAiMetricDragTargets() {
  if (!elements.aiMetricList) {
    return;
  }

  for (const row of elements.aiMetricList.querySelectorAll(".ai-metric-card")) {
    row.classList.remove("drag-over-before", "drag-over-after");
  }
}

function clearAiMetricDragState() {
  aiSettingsState.draggingMetricKey = "";
  aiSettingsState.dragOverMetricKey = "";
  aiSettingsState.dragOverMetricPosition = "";
  aiSettingsState.pendingMetricDrag = null;
  clearAiMetricDragTargets();

  if (!elements.aiMetricList) {
    return;
  }

  for (const row of elements.aiMetricList.querySelectorAll(".ai-metric-card")) {
    row.classList.remove("dragging");
  }
}

function markAiMetricDragTarget(row, position) {
  clearAiMetricDragTargets();
  row.classList.add(position === "after" ? "drag-over-after" : "drag-over-before");
  aiSettingsState.dragOverMetricKey = row.dataset.metricKey || "";
  aiSettingsState.dragOverMetricPosition = position;
}

function reorderAiMetrics(sourceKey, targetKey, position = "before") {
  const callType = selectedAiCallType();
  const metrics = callType && Array.isArray(callType.metrics) ? callType.metrics : [];
  if (!sourceKey || !targetKey || sourceKey === targetKey || metrics.length < 2) {
    return false;
  }

  const ordered = sortedByOrder(metrics);
  const sourceIndex = ordered.findIndex((metric) => metric.key === sourceKey);
  const targetIndex = ordered.findIndex((metric) => metric.key === targetKey);
  if (sourceIndex < 0 || targetIndex < 0) {
    return false;
  }

  const [movedMetric] = ordered.splice(sourceIndex, 1);
  const targetIndexAfterRemoval = ordered.findIndex((metric) => metric.key === targetKey);
  const insertIndex = targetIndexAfterRemoval + (position === "after" ? 1 : 0);
  ordered.splice(insertIndex, 0, movedMetric);

  ordered.forEach((metric, index) => {
    metric.order = (index + 1) * 10;
  });

  callType.metrics = ordered;
  aiSettingsState.selectedMetricKey = movedMetric.key;
  return true;
}

function aiMetricRowFromPoint(x, y) {
  const element = document.elementFromPoint(x, y);
  return element && element.closest ? element.closest("#ai-metric-list .ai-metric-card") : null;
}

function aiMetricDropPosition(row, clientY) {
  const rect = row.getBoundingClientRect();
  return clientY > rect.top + rect.height / 2 ? "after" : "before";
}

function finishAiMetricReorder(targetRow, position) {
  const sourceKey = aiSettingsState.draggingMetricKey;
  const targetKey = targetRow && targetRow.dataset.metricKey ? targetRow.dataset.metricKey : "";
  const reordered = reorderAiMetrics(sourceKey, targetKey, position);
  clearAiMetricDragState();

  if (!reordered) {
    return;
  }

  markAiSettingsDirty("Порядок метрик оновлено.");
  renderAiSettings();
  void saveAiSettings({ silent: true });
}

const AI_METRIC_DRAG_THRESHOLD = 6;

function removeAiMetricPointerListeners() {
  document.removeEventListener("pointermove", handleAiMetricPointerMove);
  document.removeEventListener("pointerup", handleAiMetricPointerUp);
  document.removeEventListener("pointercancel", handleAiMetricPointerCancel);
}

function startPendingAiMetricDrag(event) {
  const pending = aiSettingsState.pendingMetricDrag;
  if (!pending || aiSettingsState.draggingMetricKey) {
    return Boolean(aiSettingsState.draggingMetricKey);
  }

  const distance = Math.hypot(
    event.clientX - pending.startX,
    event.clientY - pending.startY
  );
  if (distance < AI_METRIC_DRAG_THRESHOLD) {
    return false;
  }

  event.preventDefault();
  aiSettingsState.draggingMetricKey = pending.key;
  aiSettingsState.suppressMetricClickUntil = Date.now() + 500;
  pending.row.classList.add("dragging");
  return true;
}

function handleAiMetricPointerMove(event) {
  if (!startPendingAiMetricDrag(event)) {
    return;
  }

  const draggingKey = aiSettingsState.draggingMetricKey;
  if (!draggingKey) {
    return;
  }

  const row = aiMetricRowFromPoint(event.clientX, event.clientY);
  if (!row || row.dataset.metricKey === draggingKey) {
    clearAiMetricDragTargets();
    aiSettingsState.dragOverMetricKey = "";
    aiSettingsState.dragOverMetricPosition = "";
    return;
  }

  event.preventDefault();
  const position = aiMetricDropPosition(row, event.clientY);
  if (
    aiSettingsState.dragOverMetricKey !== row.dataset.metricKey ||
    aiSettingsState.dragOverMetricPosition !== position
  ) {
    markAiMetricDragTarget(row, position);
  }
}

function handleAiMetricPointerUp(event) {
  const wasDragging = Boolean(aiSettingsState.draggingMetricKey);
  removeAiMetricPointerListeners();

  if (!wasDragging) {
    aiSettingsState.pendingMetricDrag = null;
    clearAiMetricDragTargets();
    return;
  }

  event.preventDefault();
  aiSettingsState.suppressMetricClickUntil = Date.now() + 500;
  const row = aiMetricRowFromPoint(event.clientX, event.clientY);
  const position = row
    ? aiMetricDropPosition(row, event.clientY)
    : aiSettingsState.dragOverMetricPosition;
  finishAiMetricReorder(row, position);
}

function handleAiMetricPointerCancel() {
  removeAiMetricPointerListeners();
  clearAiMetricDragState();
}

function handleAiMetricPointerDown(event) {
  const row = event.target.closest("[data-metric-key]");
  if (!row || (event.button !== undefined && event.button !== 0)) {
    return;
  }

  const blockedControl = event.target.closest(
    ".ai-soldly-switch, .ai-metric-actions, input, textarea, select, a"
  );
  if (blockedControl && !event.target.closest(".ai-metric-open")) {
    return;
  }

  clearAiMetricDragState();
  aiSettingsState.pendingMetricDrag = {
    key: row.dataset.metricKey || "",
    row,
    startX: event.clientX,
    startY: event.clientY
  };
  document.addEventListener("pointermove", handleAiMetricPointerMove);
  document.addEventListener("pointerup", handleAiMetricPointerUp);
  document.addEventListener("pointercancel", handleAiMetricPointerCancel);
}

function renderAiDetailView() {
  const callType = selectedAiCallType();
  const showDetail = aiSettingsState.screen === "detail" && Boolean(callType);
  elements.aiSettingsListHero.classList.toggle("hidden", showDetail);
  elements.aiSettingsDetailHero.classList.toggle("hidden", !showDetail);
  elements.aiSettingsListView.classList.toggle("hidden", showDetail);
  elements.aiSettingsDetailView.classList.toggle("hidden", !showDetail);

  if (!showDetail) {
    return;
  }

  elements.aiDetailTitle.textContent = callType.label || callType.key;
  elements.aiDetailDescription.textContent = callType.description || "Опис типу аналізу не заповнений.";
  renderAiMetricList();
}

function renderAiSettings() {
  ensureAiSettingsSelection();
  renderAiSettingsTabs();
  renderAiCallTypeList();
  renderAiDetailView();
  updateAiSettingsChrome();
}

function applyAiSettingsPayload(payload, dirty = false) {
  const selectedCallTypeKey = aiSettingsState.selectedCallTypeKey;
  const selectedMetricKey = aiSettingsState.selectedMetricKey;
  const screen = aiSettingsState.screen;

  aiSettingsState.settings = cloneObject((payload && payload.settings) || payload || {});
  aiSettingsState.revision = payload && payload.revision ? payload.revision : "";
  aiSettingsState.dirty = dirty;
  aiSettingsState.selectedCallTypeKey = selectedCallTypeKey;
  aiSettingsState.selectedMetricKey = selectedMetricKey;
  aiSettingsState.screen = screen;
  ensureAiSettingsSelection();
  renderAiSettings();
}

async function loadAiSettingsPage(showLoading = true) {
  clearTimeout(summaryPollTimer);
  clearTimeout(monitorPollTimer);
  clearTimeout(detailPollTimer);
  currentSummaryCallId = "";
  currentPhone = "";

  if (showLoading) {
    setState("loading");
  }

  try {
    const response = await apiFetch("/api/ai-analysis-settings", {
      headers: { Accept: "application/json" }
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Не вдалося завантажити AI-налаштування");
    }

    applyAiSettingsPayload(payload, false);
    setAiSettingsMessage("");
    setState("aiSettings");
  } catch (error) {
    aiSettingsState.settings = { callTypes: [] };
    aiSettingsState.revision = "";
    aiSettingsState.dirty = false;
    aiSettingsState.screen = "list";
    renderAiSettings();
    setAiSettingsMessage(error.message, "danger");
    setState("aiSettings");
  }
}

async function saveAiSettings(options = {}) {
  if (!aiSettingsState.settings || aiSettingsState.saving) {
    return;
  }

  const silent = Boolean(options.silent);
  aiSettingsState.saving = true;
  updateAiSettingsChrome();

  try {
    const response = await apiFetch("/api/ai-analysis-settings", {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ settings: aiSettingsState.settings })
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Не вдалося зберегти AI-налаштування");
    }

    applyAiSettingsPayload(payload, false);
    if (!silent) {
      setAiSettingsMessage("AI-налаштування оновлено.", "success");
    }
  } catch (error) {
    setAiSettingsMessage(error.message, "danger");
  } finally {
    aiSettingsState.saving = false;
    updateAiSettingsChrome();
  }
}

async function resetAiSettings() {
  if (!window.confirm("Скинути AI-налаштування до дефолтних?")) {
    return;
  }

  aiSettingsState.saving = true;
  updateAiSettingsChrome();

  try {
    const response = await apiFetch("/api/ai-analysis-settings/reset", {
      method: "POST",
      headers: { Accept: "application/json" }
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Не вдалося скинути AI-налаштування");
    }

    aiSettingsState.selectedCallTypeKey = "";
    aiSettingsState.selectedMetricKey = "";
    aiSettingsState.screen = "list";
    applyAiSettingsPayload(payload, false);
    setAiSettingsMessage("AI-налаштування скинуто.", "success");
  } catch (error) {
    setAiSettingsMessage(error.message, "danger");
  } finally {
    aiSettingsState.saving = false;
    updateAiSettingsChrome();
  }
}

function addAiCallType(kind = "call") {
  if (!aiSettingsState.settings) {
    return;
  }

  const labels = {
    call: "Новий дзвінок",
    meeting: "Новий мітинг",
    chat: "Новий чат"
  };
  const callTypes = aiSettingsState.settings.callTypes || [];
  const metric = createAiMetric();
  const callType = {
    key: newAiKey("call_type"),
    label: labels[kind] || labels.call,
    description: "",
    color: "#59666d",
    enabled: true,
    order: nextOrder(callTypes),
    metrics: [{ ...metric, order: 10 }]
  };

  aiSettingsState.settings.callTypes = callTypes;
  callTypes.push(callType);
  aiSettingsState.selectedCallTypeKey = callType.key;
  aiSettingsState.selectedMetricKey = "";
  aiSettingsState.screen = "detail";
  markAiSettingsDirty("Додано тип аналізу.");
  renderAiSettings();
  void saveAiSettings({ silent: true });
}

function duplicateAiCallType(key) {
  const callTypes = aiSettingsState.settings && aiSettingsState.settings.callTypes;
  const source = Array.isArray(callTypes)
    ? callTypes.find((item) => item.key === key)
    : null;
  if (!source) {
    return;
  }

  const copy = cloneObject(source);
  copy.key = newAiKey("call_type");
  copy.label = `${source.label || "Тип аналізу"} копія`;
  copy.order = nextOrder(callTypes);
  copy.metrics = (copy.metrics || []).map((metric, metricIndex) => ({
    ...metric,
    key: newAiKey("metric"),
    order: (metricIndex + 1) * 10,
    options: (metric.options || []).map((option, optionIndex) => ({
      ...option,
      key: newAiKey("option"),
      order: (optionIndex + 1) * 10
    }))
  }));

  callTypes.push(copy);
  aiSettingsState.selectedCallTypeKey = copy.key;
  aiSettingsState.screen = "detail";
  markAiSettingsDirty("Тип аналізу продубльовано.");
  renderAiSettings();
  void saveAiSettings({ silent: true });
}

function addAiMetric() {
  const callType = selectedAiCallType();
  if (!callType) {
    return;
  }

  callType.metrics = callType.metrics || [];
  const metric = createAiMetric();
  metric.order = nextOrder(callType.metrics);
  callType.metrics.push(metric);
  aiSettingsState.selectedMetricKey = metric.key;
  markAiSettingsDirty("Додано метрику.");
  renderAiSettings();
  openAiMetricModal(metric.key);
}

function deleteAiCallType(key) {
  const callTypes = aiSettingsState.settings && aiSettingsState.settings.callTypes;
  if (!Array.isArray(callTypes) || callTypes.length <= 1) {
    setAiSettingsMessage("Має залишитися хоча б один тип аналізу.", "danger");
    return;
  }

  const index = callTypes.findIndex((item) => item.key === key);
  if (index < 0 || !window.confirm("Видалити цей тип аналізу?")) {
    return;
  }

  callTypes.splice(index, 1);
  aiSettingsState.selectedCallTypeKey = "";
  aiSettingsState.selectedMetricKey = "";
  aiSettingsState.screen = "list";
  markAiSettingsDirty("Тип аналізу видалено.");
  renderAiSettings();
  void saveAiSettings({ silent: true });
}

function deleteAiMetric(key) {
  const callType = selectedAiCallType();
  const metrics = callType && callType.metrics;
  if (!Array.isArray(metrics) || metrics.length <= 1) {
    setAiSettingsMessage("Має залишитися хоча б одна метрика.", "danger");
    return;
  }

  const index = metrics.findIndex((item) => item.key === key);
  if (index < 0 || !window.confirm("Видалити цю метрику?")) {
    return;
  }

  metrics.splice(index, 1);
  aiSettingsState.selectedMetricKey = "";
  markAiSettingsDirty("Метрику видалено.");
  renderAiSettings();
  void saveAiSettings({ silent: true });
}

function toggleAiCallType(key) {
  const callTypes = (aiSettingsState.settings && aiSettingsState.settings.callTypes) || [];
  const callType = callTypes.find((item) => item.key === key);
  if (!callType) {
    return;
  }

  callType.enabled = callType.enabled === false;
  markAiSettingsDirty();
  renderAiSettings();
  void saveAiSettings({ silent: true });
}

function toggleAiMetric(key) {
  const metric = findAiMetric(key);
  if (!metric) {
    return;
  }

  metric.enabled = metric.enabled === false;
  markAiSettingsDirty();
  renderAiSettings();
  void saveAiSettings({ silent: true });
}

function showAiDialog(dialog) {
  if (!dialog) {
    return;
  }
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function closeAiDialog(dialog) {
  if (!dialog) {
    return;
  }
  if (typeof dialog.close === "function") {
    dialog.close();
  } else {
    dialog.removeAttribute("open");
  }
}

function openAiTypeModal() {
  const callType = selectedAiCallType();
  if (!callType) {
    return;
  }

  aiSettingsState.editingTypeKey = callType.key;
  aiSettingsState.typeDraft = cloneObject(callType);
  elements.aiTypeLabel.value = callType.label || "";
  elements.aiTypeDescription.value = callType.description || "";
  showAiDialog(elements.aiTypeModal);
  elements.aiTypeLabel.focus();
}

function saveAiTypeModal(event) {
  event.preventDefault();
  const callType = selectedAiCallType();
  if (!callType || callType.key !== aiSettingsState.editingTypeKey) {
    return;
  }

  callType.label = elements.aiTypeLabel.value.trim() || callType.label || "Тип аналізу";
  callType.description = elements.aiTypeDescription.value.trim();
  aiSettingsState.typeDraft = null;
  aiSettingsState.editingTypeKey = "";
  closeAiDialog(elements.aiTypeModal);
  markAiSettingsDirty("Загальні налаштування оновлено.");
  renderAiSettings();
  void saveAiSettings();
}

function renderAiModalOptionList() {
  const draft = aiSettingsState.metricDraft;
  const options = sortedByOrder((draft && draft.options) || []);
  elements.aiModalOptionList.replaceChildren();

  if (!options.length) {
    const message = document.createElement("p");
    message.className = "ai-soldly-empty";
    message.textContent = "Варіантів відповіді ще немає.";
    elements.aiModalOptionList.append(message);
    return;
  }

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    const score = option.countsTowardScore === false
      ? null
      : normalizeAiOptionScore(option.score);
    const color = normalizeAiPaletteColor(option.color, scoreColor(score));
    const row = document.createElement("article");
    row.className = "ai-modal-option-row";
    row.classList.toggle("ai-modal-option-row-muted", score === null);
    row.dataset.optionKey = option.key;
    row.innerHTML = `
      <span class="ai-option-number">${index + 1}.</span>
      <input class="ai-modal-option-label" type="text" maxlength="20" value="${escapeHtml(option.label || "")}" data-ai-option-field="label" aria-label="Назва варіанту">
      <select class="ai-modal-score" data-ai-option-field="score" aria-label="Оцінка варіанту">${aiScoreOptionsHtml(score)}</select>
      ${aiColorPaletteHtml(option.key, color)}
      <button class="ai-icon-button-soft" type="button" data-ai-action="delete-draft-option" data-key="${escapeHtml(option.key)}" aria-label="Видалити варіант">${aiIcon("trash")}</button>
      ${aiColorMenuHtml(option.key, color)}
      <textarea class="ai-modal-option-criteria" rows="2" placeholder="Критерії вибору цього варіанту..." data-ai-option-field="aiInstructions">${escapeHtml(option.aiInstructions || "")}</textarea>`;
    elements.aiModalOptionList.append(row);
  }
}

function openAiMetricModal(key) {
  const metric = findAiMetric(key);
  if (!metric) {
    return;
  }

  aiSettingsState.selectedMetricKey = metric.key;
  aiSettingsState.editingMetricKey = metric.key;
  aiSettingsState.metricDraft = cloneObject(metric);
  elements.aiModalMetricLabel.value = metric.label || "";
  elements.aiModalMetricEnabled.checked = metric.enabled !== false;
  elements.aiModalMetricGroup.value = metric.group || "";
  elements.aiModalMetricDescription.value = metric.description || "";
  elements.aiModalMetricInstructions.value = metric.aiInstructions || "";
  renderAiModalOptionList();
  showAiDialog(elements.aiMetricModal);
  elements.aiModalMetricLabel.focus();
}

function addAiDraftOption() {
  const draft = aiSettingsState.metricDraft;
  if (!draft) {
    return;
  }

  draft.options = draft.options || [];
  draft.options.push(createAiOption(
    "Новий варіант",
    0,
    scoreColor(0),
    "",
    nextOrder(draft.options)
  ));
  renderAiModalOptionList();
}

function deleteAiDraftOption(key) {
  const draft = aiSettingsState.metricDraft;
  const options = draft && draft.options;
  if (!Array.isArray(options) || options.length <= 1) {
    setAiSettingsMessage("Має залишитися хоча б один варіант відповіді.", "danger");
    return;
  }

  const index = options.findIndex((item) => item.key === key);
  if (index >= 0) {
    options.splice(index, 1);
    renderAiModalOptionList();
  }
}

function closeAiColorPalettes(exceptRow = null) {
  if (!elements.aiModalOptionList) {
    return;
  }

  for (const row of elements.aiModalOptionList.querySelectorAll("[data-option-key]")) {
    if (exceptRow && row === exceptRow) {
      continue;
    }

    row.classList.remove("ai-color-row-open");
    const menu = row.querySelector("[data-color-menu]");
    const button = row.querySelector(".ai-color-swatch");
    if (menu) {
      menu.hidden = true;
    }
    if (button) {
      button.setAttribute("aria-expanded", "false");
    }
  }
}

function toggleAiDraftOptionPalette(key) {
  const row = aiOptionRowByKey(key);
  if (!row) {
    return;
  }

  const menu = row.querySelector("[data-color-menu]");
  const button = row.querySelector(".ai-color-swatch");
  if (!menu || !button) {
    return;
  }

  const willOpen = menu.hidden;
  closeAiColorPalettes(row);
  menu.hidden = !willOpen;
  row.classList.toggle("ai-color-row-open", willOpen);
  button.setAttribute("aria-expanded", String(willOpen));
}

function setAiDraftOptionColor(key, color) {
  const row = aiOptionRowByKey(key);
  if (!row) {
    return;
  }

  updateAiDraftOption(row, "color", color);
  closeAiColorPalettes();
}

function updateAiDraftOption(row, field, value) {
  const draft = aiSettingsState.metricDraft;
  const option = draft && (draft.options || []).find(
    (item) => item.key === row.dataset.optionKey
  );
  if (!option) {
    return;
  }

  option[field] = field === "color"
    ? normalizeAiPaletteColor(value, scoreColor(option.score))
    : value;
  if (field === "score") {
    option.countsTowardScore = value !== null;
    row.classList.toggle("ai-modal-option-row-muted", value === null);
  }
  if (field === "score" && !option.color) {
    option.color = scoreColor(value);
  }
  if (field === "color") {
    const swatch = row.querySelector(".ai-color-swatch span");
    const color = normalizeAiPaletteColor(value, scoreColor(option.score));
    if (swatch) {
      swatch.style.background = color;
    }
    for (const choice of row.querySelectorAll(".ai-color-choice")) {
      const active = choice.dataset.color === color;
      choice.classList.toggle("active", active);
      choice.setAttribute("aria-selected", String(active));
    }
  }
}

function handleAiModalOptionInput(event) {
  const row = event.target.closest("[data-option-key]");
  const field = event.target.dataset.aiOptionField;
  if (!row || !field) {
    return;
  }

  const value = field === "score" ? normalizeAiOptionScore(event.target.value) : event.target.value;
  updateAiDraftOption(row, field, value);
}

function saveAiMetricModal(event) {
  event.preventDefault();
  const callType = selectedAiCallType();
  const metric = findAiMetric(aiSettingsState.editingMetricKey);
  const draft = aiSettingsState.metricDraft;
  if (!callType || !metric || !draft) {
    return;
  }

  const options = sortedByOrder(draft.options || []).map((option, index) => {
    const score = normalizeAiOptionScore(option.score);
    return {
      ...option,
      label: String(option.label || "").trim() || `Варіант ${index + 1}`,
      score,
      color: normalizeAiPaletteColor(option.color, scoreColor(score)),
      countsTowardScore: score !== null && option.countsTowardScore !== false,
      aiInstructions: String(option.aiInstructions || "").trim(),
      order: (index + 1) * 10
    };
  });

  metric.label = elements.aiModalMetricLabel.value.trim() || metric.label || "Метрика";
  metric.type = "ai_option";
  metric.enabled = elements.aiModalMetricEnabled.checked;
  metric.group = elements.aiModalMetricGroup.value.trim();
  metric.description = elements.aiModalMetricDescription.value.trim();
  metric.aiInstructions = elements.aiModalMetricInstructions.value.trim();
  metric.options = options.length
    ? options
    : [createAiOption("Новий варіант", 0, scoreColor(0), "", 10)];

  aiSettingsState.metricDraft = null;
  aiSettingsState.editingMetricKey = "";
  closeAiDialog(elements.aiMetricModal);
  markAiSettingsDirty("Метрику оновлено.");
  renderAiSettings();
  void saveAiSettings();
}

function closeAiMetricModal() {
  closeAiColorPalettes();
  aiSettingsState.metricDraft = null;
  aiSettingsState.editingMetricKey = "";
  closeAiDialog(elements.aiMetricModal);
}

function closeAiTypeModal() {
  aiSettingsState.typeDraft = null;
  aiSettingsState.editingTypeKey = "";
  closeAiDialog(elements.aiTypeModal);
}

function setProfileMenuOpen(open) {
  if (!elements.profileMenu || !elements.profileMenuPopover || !elements.profileMenuTrigger) {
    return;
  }
  elements.profileMenu.classList.toggle("is-open", open);
  elements.profileMenuPopover.hidden = !open;
  elements.profileMenuTrigger.setAttribute("aria-expanded", String(open));
}

function toggleProfileMenu() {
  setProfileMenuOpen(!(elements.profileMenu && elements.profileMenu.classList.contains("is-open")));
}

function setMessage(element, message = "", tone = "") {
  if (!element) {
    return;
  }
  element.textContent = message;
  if (tone) {
    element.dataset.tone = tone;
  } else {
    delete element.dataset.tone;
  }
}

function openChangePasswordModal() {
  setProfileMenuOpen(false);
  elements.changePasswordForm?.reset();
  setMessage(elements.changePasswordMessage, "");
  showAiDialog(elements.changePasswordModal);
  elements.changePasswordCurrent?.focus();
}

function closeChangePasswordModal() {
  closeAiDialog(elements.changePasswordModal);
}

async function handleChangePasswordSubmit(event) {
  event.preventDefault();
  const currentPassword = elements.changePasswordCurrent?.value || "";
  const newPassword = elements.changePasswordNew?.value || "";
  const confirmPassword = elements.changePasswordConfirm?.value || "";

  if (newPassword !== confirmPassword) {
    setMessage(elements.changePasswordMessage, "Новий пароль і повтор не збігаються.");
    elements.changePasswordConfirm?.focus();
    return;
  }

  elements.changePasswordSubmit.disabled = true;
  setMessage(elements.changePasswordMessage, "Оновлюємо пароль...", "neutral");

  try {
    const response = await apiFetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        currentPassword,
        newPassword
      })
    });
    await readJsonResponse(response, "Не вдалося змінити пароль.");
    elements.changePasswordForm?.reset();
    setMessage(elements.changePasswordMessage, "Пароль оновлено.", "success");
  } catch (error) {
    setMessage(elements.changePasswordMessage, error.message || "Не вдалося змінити пароль.");
  } finally {
    elements.changePasswordSubmit.disabled = false;
  }
}

function adminUserById(id) {
  return adminState.users.find((user) => user.id === id) || null;
}

function renderAdminUsers() {
  if (!elements.adminUsersList) {
    return;
  }

  const users = adminState.users;
  elements.adminUserCount.textContent = adminState.loading
    ? "Завантаження..."
    : formatUsersCount(users.length);
  elements.adminUsersList.replaceChildren();

  if (adminState.loading) {
    const message = document.createElement("p");
    message.className = "admin-empty";
    message.textContent = "Завантажуємо користувачів...";
    elements.adminUsersList.append(message);
    return;
  }

  if (!users.length) {
    const message = document.createElement("p");
    message.className = "admin-empty";
    message.textContent = "Користувачів ще немає.";
    elements.adminUsersList.append(message);
    return;
  }

  for (const user of users) {
    const isSelf = authState.user && authState.user.id === user.id;
    const row = document.createElement("article");
    row.className = "admin-user-card";
    row.dataset.userId = user.id;
    row.innerHTML = `
      <div class="admin-user-main">
        <strong>${escapeHtml(user.name || user.username)}</strong>
        <span>${escapeHtml(user.username || "")}${isSelf ? " · ви" : ""}</span>
      </div>
      <div class="admin-user-meta">
        <strong>${escapeHtml(formatDateTime(user.createdAt))}</strong>
        <span>Створено</span>
      </div>
      <span class="admin-role-pill ${user.role === "admin" ? "is-admin" : ""}">
        ${escapeHtml(userRoleLabel(user.role))}
      </span>
      <div class="admin-user-actions">
        <button class="admin-icon-button" type="button" data-admin-action="edit-user" data-user-id="${escapeHtml(user.id)}">Редагувати</button>
        <button class="admin-icon-button is-danger" type="button" data-admin-action="delete-user" data-user-id="${escapeHtml(user.id)}"${isSelf ? " disabled" : ""}>Видалити</button>
      </div>
    `;
    elements.adminUsersList.append(row);
  }
}

async function loadAdminUsers() {
  if (!isAdminUser()) {
    window.location.href = "/client-card";
    return;
  }

  setState("admin");
  adminState.loading = true;
  setMessage(elements.adminUsersMessage, "", "neutral");
  renderAdminUsers();

  try {
    const response = await apiFetch("/api/admin/users");
    const payload = await readJsonResponse(response, "Не вдалося завантажити користувачів.");
    adminState.users = Array.isArray(payload.users) ? payload.users : [];
    setMessage(elements.adminUsersMessage, "", "neutral");
  } catch (error) {
    setMessage(elements.adminUsersMessage, error.message || "Не вдалося завантажити користувачів.");
  } finally {
    adminState.loading = false;
    renderAdminUsers();
  }
}

function openAdminUserModal(user = null) {
  adminState.editingUserId = user ? user.id : "";
  elements.adminUserForm?.reset();
  setMessage(elements.adminUserMessage, "");
  elements.adminUserId.value = user ? user.id : "";
  elements.adminUserUsername.value = user ? user.username || "" : "";
  elements.adminUserName.value = user ? user.name || "" : "";
  elements.adminUserRole.value = user && user.role === "admin" ? "admin" : "user";
  elements.adminUserPassword.value = "";
  elements.adminUserPassword.required = !user;
  elements.adminUserPasswordLabel.textContent = user ? "Новий пароль" : "Пароль";
  elements.adminUserPassword.placeholder = user
    ? "Залиште пустим, якщо пароль не змінюється"
    : "";
  elements.adminUserModalTitle.textContent = user ? "Редагувати користувача" : "Додати користувача";
  elements.adminUserSubmit.textContent = user ? "Оновити" : "Створити";
  showAiDialog(elements.adminUserModal);
  elements.adminUserUsername?.focus();
}

function closeAdminUserModal() {
  adminState.editingUserId = "";
  closeAiDialog(elements.adminUserModal);
}

async function handleAdminUserSubmit(event) {
  event.preventDefault();
  const userId = elements.adminUserId.value.trim();
  const password = elements.adminUserPassword.value;
  const payload = {
    username: elements.adminUserUsername.value,
    name: elements.adminUserName.value,
    role: elements.adminUserRole.value
  };
  if (!userId || password) {
    payload.password = password;
  }

  elements.adminUserSubmit.disabled = true;
  setMessage(elements.adminUserMessage, userId ? "Оновлюємо користувача..." : "Створюємо користувача...", "neutral");

  try {
    const response = await apiFetch(
      userId ? `/api/admin/users/${encodeURIComponent(userId)}` : "/api/admin/users",
      {
        method: userId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      }
    );
    await readJsonResponse(response, "Не вдалося зберегти користувача.");
    closeAdminUserModal();
    await loadAdminUsers();
  } catch (error) {
    setMessage(elements.adminUserMessage, error.message || "Не вдалося зберегти користувача.");
  } finally {
    elements.adminUserSubmit.disabled = false;
  }
}

async function deleteAdminUser(userId) {
  const user = adminUserById(userId);
  if (!user) {
    return;
  }

  const confirmed = window.confirm(`Видалити користувача ${user.name || user.username}?`);
  if (!confirmed) {
    return;
  }

  setMessage(elements.adminUsersMessage, "Видаляємо користувача...", "neutral");
  try {
    const response = await apiFetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
      method: "DELETE"
    });
    await readJsonResponse(response, "Не вдалося видалити користувача.");
    await loadAdminUsers();
  } catch (error) {
    setMessage(elements.adminUsersMessage, error.message || "Не вдалося видалити користувача.");
  }
}

function handleAdminUsersClick(event) {
  const button = event.target.closest("[data-admin-action]");
  if (!button) {
    return;
  }
  const userId = button.dataset.userId || "";
  if (button.dataset.adminAction === "edit-user") {
    openAdminUserModal(adminUserById(userId));
  } else if (button.dataset.adminAction === "delete-user") {
    void deleteAdminUser(userId);
  }
}

function handleAiSettingsTabClick(event) {
  const tab = event.target.closest("[data-ai-tab]");
  if (!tab) {
    return;
  }

  aiSettingsState.activeTab = tab.dataset.aiTab || "ai";
  renderAiSettings();
}

function handleAiSettingsClick(event) {
  if (Date.now() < aiSettingsState.suppressMetricClickUntil) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (!event.target.closest(".ai-color-palette") && !event.target.closest(".ai-color-menu")) {
    closeAiColorPalettes();
  }

  const actionButton = event.target.closest("[data-ai-action]");
  if (!actionButton) {
    return;
  }

  const { aiAction, key, kind, color } = actionButton.dataset;
  if (aiAction === "create-call-type") {
    addAiCallType(kind);
  } else if (aiAction === "toggle-show-inactive") {
    aiSettingsState.showInactive = !aiSettingsState.showInactive;
    renderAiSettings();
  } else if (aiAction === "select-call-type") {
    aiSettingsState.selectedCallTypeKey = key;
    aiSettingsState.selectedMetricKey = "";
    aiSettingsState.screen = "detail";
    renderAiSettings();
  } else if (aiAction === "back-to-types") {
    aiSettingsState.screen = "list";
    aiSettingsState.selectedCallTypeKey = "";
    aiSettingsState.selectedMetricKey = "";
    renderAiSettings();
  } else if (aiAction === "open-type-settings") {
    openAiTypeModal();
  } else if (aiAction === "toggle-call-type") {
    toggleAiCallType(key);
  } else if (aiAction === "duplicate-call-type") {
    duplicateAiCallType(key);
  } else if (aiAction === "delete-call-type") {
    deleteAiCallType(key);
  } else if (aiAction === "add-metric") {
    addAiMetric();
  } else if (aiAction === "toggle-metric") {
    toggleAiMetric(key);
  } else if (aiAction === "edit-metric") {
    openAiMetricModal(key);
  } else if (aiAction === "delete-metric") {
    deleteAiMetric(key);
  } else if (aiAction === "additional-toggle") {
    const pressed = actionButton.getAttribute("aria-pressed") === "true";
    actionButton.setAttribute("aria-pressed", String(!pressed));
    actionButton.dataset.checked = String(!pressed);
  } else if (aiAction === "delete-draft-option") {
    deleteAiDraftOption(key);
  } else if (aiAction === "toggle-option-palette") {
    toggleAiDraftOptionPalette(key);
  } else if (aiAction === "set-draft-option-color") {
    setAiDraftOptionColor(key, color);
  }
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
  elements.aiSettingsPage.classList.toggle("hidden", state !== "aiSettings");
  elements.adminPage.classList.toggle("hidden", state !== "admin");
  elements.callDetailPage.classList.toggle("hidden", state !== "detail");

  const titles = {
    empty: "Картка клієнта",
    loading: "Завантаження",
    card: "Картка клієнта",
    monitor: "Дзвінки",
    analytics: "AI-аналітика",
    aiSettings: "AI-налаштування",
    admin: "Адмінка",
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
        (state === "aiSettings" && view === "ai-settings") ||
        (state === "admin" && view === "admin") ||
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
    const response = await apiFetch(
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
      const response = await apiFetch(
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
    const response = await apiFetch(
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
  const response = await apiFetch(
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

function formatMetricNumber(value) {
  if (!Number.isFinite(Number(value))) {
    return "—";
  }

  const numberValue = Number(value);
  return Number.isInteger(numberValue)
    ? String(numberValue)
    : String(Math.round(numberValue * 10) / 10);
}

function metricPointScore(metric) {
  if (
    !metric ||
    metric.countsTowardScore === false ||
    metric.score === null ||
    metric.score === undefined ||
    !Number.isFinite(Number(metric.score))
  ) {
    return "—";
  }

  if (Number.isFinite(Number(metric.maxScore)) && Number(metric.maxScore) > 0) {
    return `${formatMetricNumber(metric.score)}/${formatMetricNumber(metric.maxScore)}`;
  }

  return formatMetricNumber(metric.score);
}

function metricPercentScore(metric) {
  if (
    !metric ||
    metric.score === null ||
    metric.score === undefined ||
    !Number.isFinite(Number(metric.score)) ||
    !Number.isFinite(Number(metric.maxScore)) ||
    Number(metric.maxScore) <= 0
  ) {
    return null;
  }

  return (Number(metric.score) / Number(metric.maxScore)) * 100;
}

function metricScoreLevel(metric) {
  const percent = metricPercentScore(metric);
  if (!Number.isFinite(Number(percent))) {
    return "empty";
  }
  return scoreLevel(percent);
}

function safeMetricColor(value, fallback = "#94a3b8") {
  const color = String(value || "").trim();
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback;
}

function customEvaluationTotals(metrics) {
  return (Array.isArray(metrics) ? metrics : []).reduce(
    (result, metric) => {
      const score = Number(metric && metric.score);
      const maxScore = Number(metric && metric.maxScore);
      if (
        metric &&
        metric.countsTowardScore !== false &&
        metric.score !== null &&
        metric.score !== undefined &&
        Number.isFinite(score) &&
        Number.isFinite(maxScore) &&
        maxScore > 0
      ) {
        result.score += score;
        result.maxScore += maxScore;
        result.scored += 1;
      }
      result.total += 1;
      return result;
    },
    { score: 0, maxScore: 0, scored: 0, total: 0 }
  );
}

function customEvaluationGroups(metrics) {
  const groups = [];
  const byKey = new Map();

  for (const metric of Array.isArray(metrics) ? metrics : []) {
    const label = String(metric && metric.metricGroup || "").trim() || "Ваші метрики";
    if (!byKey.has(label)) {
      const group = {
        label,
        metrics: []
      };
      byKey.set(label, group);
      groups.push(group);
    }
    byKey.get(label).metrics.push(metric);
  }

  return groups;
}

function createQualityMetricElement(metric) {
  const item = document.createElement("article");
  item.className = `quality-item quality-metric-item quality-${metricScoreLevel(metric)}`;
  item.style.setProperty("--metric-color", safeMetricColor(metric.color));

  const header = document.createElement("div");
  header.className = "quality-metric-header";

  const titleWrap = document.createElement("div");
  titleWrap.className = "quality-metric-title";
  const swatch = document.createElement("span");
  swatch.className = "quality-metric-swatch";
  swatch.setAttribute("aria-hidden", "true");
  const label = document.createElement("strong");
  label.textContent = metric.metricLabel || metric.metricKey || "Метрика";
  const option = document.createElement("small");
  option.className = "quality-metric-option";
  option.textContent = metric.selectedOptionLabel || "Варіант не вибрано";
  titleWrap.append(swatch, label, option);

  const score = document.createElement("span");
  score.className = "quality-score-pill";
  score.textContent = metricPointScore(metric);

  header.append(titleWrap, score);
  item.append(header);

  if (metric.evidence) {
    const evidence = document.createElement("p");
    evidence.textContent = metric.evidence;
    item.append(evidence);
  }

  if (metric.improvement) {
    const improvement = document.createElement("small");
    improvement.className = "quality-improvement";
    improvement.textContent = `Порада: ${metric.improvement}`;
    item.append(improvement);
  }

  return item;
}

function appendQualityMetricGroup(container, group) {
  const metrics = Array.isArray(group && group.metrics) ? group.metrics : [];
  if (!container || !metrics.length) {
    return;
  }

  const totals = customEvaluationTotals(metrics);
  const section = document.createElement("section");
  section.className = "quality-metric-group";

  const header = document.createElement("header");
  header.className = "quality-group-header";
  const title = document.createElement("div");
  const label = document.createElement("strong");
  const count = document.createElement("small");
  const score = document.createElement("span");
  label.textContent = group.label || "Ваші метрики";
  count.textContent = totals.total
    ? `${totals.scored}/${totals.total} оцінюються`
    : "Немає метрик";
  score.className = "quality-score-pill quality-group-score";
  score.textContent = totals.maxScore > 0
    ? `${formatMetricNumber(totals.score)}/${formatMetricNumber(totals.maxScore)}`
    : "—";
  title.append(label, count);
  header.append(title, score);
  section.append(header);

  const list = document.createElement("div");
  list.className = "quality-group-list";
  for (const metric of metrics) {
    list.append(createQualityMetricElement(metric));
  }
  section.append(list);
  container.append(section);
}

function appendQualityMetric(container, label, value, isWide = false) {
  if (!container || value === null || value === undefined || value === "") {
    return;
  }

  const item = document.createElement("div");
  item.className = isWide ? "quality-context-item quality-context-wide" : "quality-context-item";
  if (["Бали", "Враховано", "Впевненість"].includes(String(label))) {
    item.classList.add("quality-context-score");
  }
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

function renderCustomCallQuality(summary) {
  const customEvaluation = summary && summary.customEvaluation;
  const metrics = Array.isArray(customEvaluation && customEvaluation.metrics)
    ? customEvaluation.metrics
    : [];
  const totals = customEvaluationTotals(metrics);
  const overallScore = customEvaluation && customEvaluation.overallScore;
  const overallLevel = Number.isFinite(Number(overallScore))
    ? scoreLevel(overallScore)
    : "empty";

  elements.detailQualityScore.textContent = formatScore(overallScore);
  elements.detailQualityScore.className = `quality-score quality-${overallLevel}`;
  elements.detailQualitySummary.textContent =
    (customEvaluation && customEvaluation.summary) ||
    "Оцінка побудована за інструкціями метрик.";

  if (elements.detailQualityContext) {
    appendQualityMetric(
      elements.detailQualityContext,
      "Тип дзвінка",
      summary.callTypeLabel || summary.callType || "—",
      true
    );
    appendQualityMetric(
      elements.detailQualityContext,
      "Враховано",
      totals.total ? `${totals.scored}/${totals.total}` : "—"
    );
    appendQualityMetric(
      elements.detailQualityContext,
      "Бали",
      totals.maxScore > 0
        ? `${formatMetricNumber(totals.score)}/${formatMetricNumber(totals.maxScore)}`
        : "—"
    );
    appendQualityMetric(
      elements.detailQualityContext,
      "Впевненість",
      typeof summary.confidence === "number"
        ? `${Math.round(summary.confidence * 100)}%`
        : ""
    );
  }

  for (const group of customEvaluationGroups(metrics)) {
    appendQualityMetricGroup(elements.detailQualityCriteria, group);
  }

  const strengths = metrics
    .filter((metric) => {
      const percent = metricPercentScore(metric);
      return percent !== null && percent >= 80;
    })
    .slice(0, 2)
    .map((metric) => `${metric.metricLabel}: ${metric.selectedOptionLabel}`);
  const improvements = metrics
    .filter((metric) => metric && metric.improvement)
    .slice(0, 2)
    .map((metric) => metric.improvement);

  appendQualityNoteGroup("Що добре", strengths);
  appendQualityNoteGroup("Що покращити", improvements);
}

function renderCallQuality(summary) {
  const customEvaluation = summary && summary.customEvaluation;
  const evaluation = summary && summary.operatorEvaluation;
  elements.detailQualityCriteria.replaceChildren();
  if (elements.detailQualityContext) {
    elements.detailQualityContext.replaceChildren();
  }
  elements.detailQualityNotes.replaceChildren();

  if (
    customEvaluation &&
    Array.isArray(customEvaluation.metrics) &&
    customEvaluation.metrics.length
  ) {
    renderCustomCallQuality(summary);
    return;
  }

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

function normalizeSpeakerRole(value) {
  const role = String(value || "").trim().toLowerCase();
  if (role === "operator" || role === "manager" || role === "agent" || role.includes("оператор")) {
    return "operator";
  }
  if (
    role === "client" ||
    role === "customer" ||
    role === "passenger" ||
    role.includes("клієн") ||
    role.includes("клиент")
  ) {
    return "client";
  }
  return "unknown";
}

function speakerAliasKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function speakerOrdinal(value) {
  const key = speakerAliasKey(value);
  const numbered = key.match(/(?:^|_)speaker_(\d+)$/) || key.match(/^speaker_(\d+)$/);
  if (numbered) {
    return Number(numbered[1]);
  }

  if (/^\d+$/.test(key)) {
    return Number(key);
  }

  if (/^[a-z]$/.test(key)) {
    return key.charCodeAt(0) - 96;
  }

  return 0;
}

function transcriptSpeakers(segments) {
  const speakers = [];
  const seen = new Set();

  for (const segment of segments || []) {
    const speaker = String(segment && segment.speaker ? segment.speaker : "").trim();
    if (!speaker || seen.has(speaker)) {
      continue;
    }
    seen.add(speaker);
    speakers.push(speaker);
  }

  return speakers;
}

function findTranscriptSpeaker(summarySpeaker, transcriptSpeakerList, usedSpeakers) {
  const summaryKey = speakerAliasKey(summarySpeaker);
  if (!summaryKey) {
    return "";
  }

  for (const speaker of transcriptSpeakerList) {
    if (!usedSpeakers.has(speaker) && speakerAliasKey(speaker) === summaryKey) {
      return speaker;
    }
  }

  const ordinal = speakerOrdinal(summarySpeaker);
  if (ordinal > 0 && ordinal <= transcriptSpeakerList.length) {
    const speaker = transcriptSpeakerList[ordinal - 1];
    return usedSpeakers.has(speaker) ? "" : speaker;
  }

  return "";
}

function scoreSpeakerTextForRole(value) {
  const textValue = String(value || "").toLowerCase();
  const scores = { operator: 0, client: 0 };

  if (/(east\s*west|іст\s*вест|ewe|duma|eurolines|євролайн|евролайн)/i.test(textValue)) {
    scores.operator += 4;
  }
  if (/(чим|чем)\s+можу?.*(допомогти|помочь)|слухаю вас|слушаю вас/i.test(textValue)) {
    scores.operator += 5;
  }
  if (/(мене звати|меня зовут)/i.test(textValue)) {
    scores.operator += 2;
  }
  if (
    /(зараз|сейчас).*(гляну|перевірю|проверю|скажу)|хвилинк|минутк|у вас (бронь|куплен|оплачен)|ми вам (надсилали|надішлемо)|ми посилками не займаємося|скажіть номер квитка/i.test(textValue)
  ) {
    scores.operator += 2;
  }
  if (/\bпрошу\b|дякую, до побачення|гарного (дня|вечора)/i.test(textValue)) {
    scores.operator += 1;
  }

  if (
    /(підкажіть|скажіть, будь ласка|скажите, пожалуйста|у вас на сайті|а у вас|телефоную стосовно|я (купив|купила|бронював|бронювала|подав|подала|хочу|маю)|мені (треба|потрібно|прийшов)|чи можна|скільки коштує)/i.test(textValue)
  ) {
    scores.client += 3;
  }
  if (/(добре, дякую|дякую вам|гарного (дня|вечора)|до побачення)/i.test(textValue)) {
    scores.client += 1;
  }

  return scores;
}

function inferredSpeakerRoles(segments, explicitRoles) {
  const speakers = transcriptSpeakers(segments);
  const roles = new Map(explicitRoles);
  const roleScores = new Map(
    speakers.map((speaker) => [speaker, { operator: 0, client: 0 }])
  );

  (segments || []).forEach((segment, index) => {
    const speaker = String(segment && segment.speaker ? segment.speaker : "").trim();
    if (!speaker || !roleScores.has(speaker)) {
      return;
    }

    const scores = scoreSpeakerTextForRole(segment.text);
    const weight = index < 8 ? 1 : 0.55;
    const current = roleScores.get(speaker);
    current.operator += scores.operator * weight;
    current.client += scores.client * weight;
  });

  const roleOf = (speaker) => roles.get(speaker) || "unknown";
  const setMissing = (speaker, role) => {
    if (speaker && roleOf(speaker) === "unknown") {
      roles.set(speaker, role);
    }
  };

  if (speakers.length === 2) {
    const [first, second] = speakers;
    if (roleOf(first) === "operator" && roleOf(second) === "unknown") {
      roles.set(second, "client");
      return roles;
    }
    if (roleOf(second) === "operator" && roleOf(first) === "unknown") {
      roles.set(first, "client");
      return roles;
    }
    if (roleOf(first) === "client" && roleOf(second) === "unknown") {
      roles.set(second, "operator");
      return roles;
    }
    if (roleOf(second) === "client" && roleOf(first) === "unknown") {
      roles.set(first, "operator");
      return roles;
    }

    const ranked = speakers
      .map((speaker) => {
        const scores = roleScores.get(speaker) || { operator: 0, client: 0 };
        return {
          speaker,
          operator: scores.operator,
          client: scores.client,
          operatorDiff: scores.operator - scores.client,
          clientDiff: scores.client - scores.operator
        };
      })
      .sort((a, b) => b.operatorDiff - a.operatorDiff);

    const operatorCandidate = ranked[0];
    const otherSpeaker = speakers.find((speaker) => speaker !== operatorCandidate.speaker);
    if (operatorCandidate.operator >= 5 && operatorCandidate.operatorDiff >= 3) {
      setMissing(operatorCandidate.speaker, "operator");
      setMissing(otherSpeaker, "client");
      return roles;
    }

    const clientCandidate = ranked
      .slice()
      .sort((a, b) => b.clientDiff - a.clientDiff)[0];
    const likelyOperator = speakers.find((speaker) => speaker !== clientCandidate.speaker);
    if (clientCandidate.client >= 4 && clientCandidate.clientDiff >= 3) {
      setMissing(clientCandidate.speaker, "client");
      setMissing(likelyOperator, "operator");
    }

    return roles;
  }

  for (const speaker of speakers) {
    const scores = roleScores.get(speaker) || { operator: 0, client: 0 };
    if (scores.operator >= 5 && scores.operator - scores.client >= 3) {
      setMissing(speaker, "operator");
    } else if (scores.client >= 4 && scores.client - scores.operator >= 3) {
      setMissing(speaker, "client");
    }
  }

  return roles;
}

function speakerRoles(summary, segments = []) {
  const transcriptSpeakerList = transcriptSpeakers(segments);
  const roles = new Map();
  const usedSpeakers = new Set();

  for (const speaker of (summary && summary.speakers) || []) {
    const role = normalizeSpeakerRole(speaker && speaker.role);
    if (!speaker || !speaker.speaker || role === "unknown") {
      continue;
    }

    const transcriptSpeaker = findTranscriptSpeaker(
      speaker.speaker,
      transcriptSpeakerList,
      usedSpeakers
    );
    if (transcriptSpeaker) {
      roles.set(transcriptSpeaker, role);
      usedSpeakers.add(transcriptSpeaker);
    } else {
      roles.set(String(speaker.speaker), role);
    }
  }

  return inferredSpeakerRoles(segments, roles);
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

function transcriptSpeakerMeta(segments) {
  const speakers = transcriptSpeakers(segments);
  const meta = new Map();

  speakers.forEach((speaker, index) => {
    meta.set(speaker, {
      index,
      extraIndex: index + 1,
      colorIndex: (index % 6) + 1,
      total: speakers.length
    });
  });

  return meta;
}

function transcriptSpeakerDisplay(speaker, role, speakerMeta) {
  if (role === "client" || role === "operator") {
    return {
      label: speakerLabel(speaker, role),
      className: `transcript-item transcript-${role}`,
      color: ""
    };
  }

  const meta = speakerMeta.get(String(speaker || "").trim());
  if (meta && meta.total > 2) {
    return {
      label: `Додатковий голос ${meta.extraIndex}`,
      className: "transcript-item transcript-extra",
      color: `var(--audio-extra-${meta.colorIndex})`
    };
  }

  return {
    label: speakerLabel(speaker, role),
    className: "transcript-item transcript-unknown",
    color: ""
  };
}

function renderTranscript(ai) {
  elements.detailTranscript.replaceChildren();
  const transcript = ai && ai.transcript;
  const segments = Array.isArray(transcript && transcript.segments)
    ? transcript.segments
    : [];
  const roles = speakerRoles(ai && ai.summary, segments);
  const speakerMeta = transcriptSpeakerMeta(segments);

  if (segments.length) {
    for (const segment of segments) {
      const role = roles.get(String(segment.speaker)) || "unknown";
      const display = transcriptSpeakerDisplay(segment.speaker, role, speakerMeta);
      const item = document.createElement("article");
      item.className = display.className;
      if (display.color) {
        item.style.setProperty("--transcript-speaker-color", display.color);
      }

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
      speaker.textContent = display.label;
      speaker.title = String(segment.speaker || "");
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
  detailAudioState.roles = speakerRoles(summary, transcriptSegments);
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
    const response = await apiFetch(
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
    const response = await apiFetch("/api/binotel-monitor/call/reanalyze", {
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
      apiFetch("/api/binotel-monitor/status", { headers: { Accept: "application/json" } }),
      apiFetch(
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

hydrateAiStaticIcons();

if (elements.aiSettingsTabs) {
  elements.aiSettingsTabs.addEventListener("click", handleAiSettingsTabClick);
}
elements.aiSettingsPage.addEventListener("click", handleAiSettingsClick);
elements.aiMetricList.addEventListener("pointerdown", handleAiMetricPointerDown);
elements.aiMetricModalForm.addEventListener("submit", saveAiMetricModal);
elements.aiTypeModalForm.addEventListener("submit", saveAiTypeModal);
elements.aiModalAddOption.addEventListener("click", addAiDraftOption);
elements.aiModalOptionList.addEventListener("input", handleAiModalOptionInput);
elements.aiModalOptionList.addEventListener("change", handleAiModalOptionInput);
elements.aiMetricModalClose.addEventListener("click", closeAiMetricModal);
elements.aiMetricCancel.addEventListener("click", closeAiMetricModal);
elements.aiTypeModalClose.addEventListener("click", closeAiTypeModal);
elements.aiTypeCancel.addEventListener("click", closeAiTypeModal);

elements.aiMetricModal.addEventListener("click", (event) => {
  if (event.target === elements.aiMetricModal) {
    closeAiMetricModal();
  }
});

elements.aiTypeModal.addEventListener("click", (event) => {
  if (event.target === elements.aiTypeModal) {
    closeAiTypeModal();
  }
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

elements.profileMenuTrigger?.addEventListener("click", (event) => {
  event.stopPropagation();
  toggleProfileMenu();
});

elements.profileMenuPopover?.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    setProfileMenuOpen(false);
    return;
  }
  event.stopPropagation();
});

document.addEventListener("click", (event) => {
  if (elements.profileMenu && !elements.profileMenu.contains(event.target)) {
    setProfileMenuOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setProfileMenuOpen(false);
    closeChangePasswordModal();
    closeAdminUserModal();
  }
});

elements.changePasswordButton?.addEventListener("click", openChangePasswordModal);
elements.changePasswordForm?.addEventListener("submit", handleChangePasswordSubmit);
elements.changePasswordClose?.addEventListener("click", closeChangePasswordModal);
elements.changePasswordCancel?.addEventListener("click", closeChangePasswordModal);
elements.changePasswordModal?.addEventListener("click", (event) => {
  if (event.target === elements.changePasswordModal) {
    closeChangePasswordModal();
  }
});

elements.adminAddUser?.addEventListener("click", () => openAdminUserModal());
elements.adminUsersList?.addEventListener("click", handleAdminUsersClick);
elements.adminUserForm?.addEventListener("submit", handleAdminUserSubmit);
elements.adminUserClose?.addEventListener("click", closeAdminUserModal);
elements.adminUserCancel?.addEventListener("click", closeAdminUserModal);
elements.adminUserModal?.addEventListener("click", (event) => {
  if (event.target === elements.adminUserModal) {
    closeAdminUserModal();
  }
});

elements.logoutButton?.addEventListener("click", async () => {
  elements.logoutButton.disabled = true;
  try {
    await apiFetch("/api/auth/logout", {
      method: "POST",
      headers: { Accept: "application/json" }
    });
  } finally {
    window.location.href = "/login";
  }
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
    const response = await apiFetch("/api/client-notes", {
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

async function boot() {
  try {
    await loadAuthSession();
  } catch {
    return;
  }

  if (callDetailMatch) {
    loadCallDetail(decodeURIComponent(callDetailMatch[1]));
  } else if (window.location.pathname === "/calls-monitor") {
    loadMonitor();
  } else if (window.location.pathname === "/call-analytics") {
    loadAnalyticsPage();
  } else if (window.location.pathname === "/ai-settings") {
    loadAiSettingsPage();
  } else if (window.location.pathname === "/admin") {
    loadAdminUsers();
  } else if (initialPhone) {
    loadClient(initialPhone);
  } else {
    setState("empty");
  }
}

boot();
