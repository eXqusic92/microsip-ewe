"use strict";

const THEME_KEY = "ewe-ticket-theme";
const RECENT_ORDERS_PREVIEW_LIMIT = 2;
const DETAIL_TICKETS_PREVIEW_LIMIT = 3;
const CALLS_PREVIEW_LIMIT = 7;
const MONITOR_POLL_MS = 10000;
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
  emptyState: document.querySelector("#empty-state"),
  loadingState: document.querySelector("#loading-state"),
  clientCard: document.querySelector("#client-card"),
  monitorPage: document.querySelector("#calls-monitor-page"),
  callStatsPage: document.querySelector("#call-stats-page"),
  callStatsFilter: document.querySelector("#call-stats-filter"),
  callStatsPeriod: document.querySelector("#call-stats-period"),
  callStatsFrom: document.querySelector("#call-stats-from"),
  callStatsTo: document.querySelector("#call-stats-to"),
  callStatsRange: document.querySelector("#call-stats-range"),
  callStatsTotal: document.querySelector("#call-stats-total"),
  callStatsTotalCaption: document.querySelector("#call-stats-total-caption"),
  callStatsIncoming: document.querySelector("#call-stats-incoming"),
  callStatsIncomingCaption: document.querySelector("#call-stats-incoming-caption"),
  callStatsOutgoing: document.querySelector("#call-stats-outgoing"),
  callStatsOutgoingCaption: document.querySelector("#call-stats-outgoing-caption"),
  callStatsAnswerRate: document.querySelector("#call-stats-answer-rate"),
  callStatsAnswerCaption: document.querySelector("#call-stats-answer-caption"),
  callStatsTalkTime: document.querySelector("#call-stats-talk-time"),
  callStatsTalkCaption: document.querySelector("#call-stats-talk-caption"),
  callStatsAvgDuration: document.querySelector("#call-stats-avg-duration"),
  callStatsAvgWait: document.querySelector("#call-stats-avg-wait"),
  callStatsCustomers: document.querySelector("#call-stats-customers"),
  callStatsCustomersCaption: document.querySelector("#call-stats-customers-caption"),
  callStatsRecordings: document.querySelector("#call-stats-recordings"),
  callStatsRecordingsCaption: document.querySelector("#call-stats-recordings-caption"),
  callStatsFocus: document.querySelector("#call-stats-focus"),
  callStatsFocusTitle: document.querySelector("#call-stats-focus-title"),
  callStatsFocusSubtitle: document.querySelector("#call-stats-focus-subtitle"),
  callStatsFocusMetrics: document.querySelector("#call-stats-focus-metrics"),
  callStatsDailyChart: document.querySelector("#call-stats-daily-chart"),
  callStatsHourlyChart: document.querySelector("#call-stats-hourly-chart"),
  callStatsDirectionChart: document.querySelector("#call-stats-direction-chart"),
  callStatsDispositionChart: document.querySelector("#call-stats-disposition-chart"),
  callStatsDurationChart: document.querySelector("#call-stats-duration-chart"),
  callStatsHeatmap: document.querySelector("#call-stats-heatmap"),
  callStatsManagers: document.querySelector("#call-stats-managers"),
  callStatsLines: document.querySelector("#call-stats-lines"),
  callStatsInsights: document.querySelector("#call-stats-insights"),
  analyticsPage: document.querySelector("#analytics-page"),
  aiSettingsPage: document.querySelector("#ai-settings-page"),
  adminPage: document.querySelector("#admin-page"),
  adminTitle: document.querySelector("#admin-title"),
  adminDescription: document.querySelector("#admin-description"),
  adminTabs: document.querySelector(".admin-tabs"),
  adminTabButtons: document.querySelectorAll("[data-admin-tab]"),
  adminPanels: document.querySelectorAll("[data-admin-panel]"),
  adminAddUser: document.querySelector("#admin-add-user"),
  adminUserCount: document.querySelector("#admin-user-count"),
  adminUsersMessage: document.querySelector("#admin-users-message"),
  adminUsersList: document.querySelector("#admin-users-list"),
  adminAnalysisNumberCount: document.querySelector("#admin-analysis-number-count"),
  adminAnalysisNumbersMessage: document.querySelector("#admin-analysis-numbers-message"),
  adminAnalysisNumbersList: document.querySelector("#admin-analysis-numbers-list"),
  adminAnalysisNumbersSave: document.querySelector("#admin-analysis-numbers-save"),
  adminAnalysisEnableAll: document.querySelector("#admin-analysis-enable-all"),
  adminAnalysisDisableAll: document.querySelector("#admin-analysis-disable-all"),
  adminMetricFeedbackCount: document.querySelector("#admin-metric-feedback-count"),
  adminMetricFeedbackMessage: document.querySelector("#admin-metric-feedback-message"),
  adminMetricFeedbackList: document.querySelector("#admin-metric-feedback-list"),
  adminTelegramCount: document.querySelector("#admin-telegram-count"),
  adminTelegramForm: document.querySelector("#admin-telegram-form"),
  adminTelegramLabel: document.querySelector("#admin-telegram-label"),
  adminTelegramPhone: document.querySelector("#admin-telegram-phone"),
  adminTelegramAdd: document.querySelector("#admin-telegram-add"),
  adminTelegramMessage: document.querySelector("#admin-telegram-message"),
  adminTelegramList: document.querySelector("#admin-telegram-list"),
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
  managerRatingSummary: document.querySelector("#manager-rating-summary"),
  managerRatingTable: document.querySelector("#manager-rating-table"),
  managerRatingEmpty: document.querySelector("#manager-rating-empty"),
  managerRatingModal: document.querySelector("#manager-rating-modal"),
  managerRatingModalClose: document.querySelector("#manager-rating-modal-close"),
  managerRatingModalTitle: document.querySelector("#manager-rating-modal-title"),
  managerRatingModalSubtitle: document.querySelector("#manager-rating-modal-subtitle"),
  managerRatingModalSummary: document.querySelector("#manager-rating-modal-summary"),
  managerRatingModalMetrics: document.querySelector("#manager-rating-modal-metrics"),
  metricFeedbackModal: document.querySelector("#metric-feedback-modal"),
  metricFeedbackForm: document.querySelector("#metric-feedback-form"),
  metricFeedbackTitle: document.querySelector("#metric-feedback-title"),
  metricFeedbackSubtitle: document.querySelector("#metric-feedback-subtitle"),
  metricFeedbackText: document.querySelector("#metric-feedback-text"),
  metricFeedbackMessage: document.querySelector("#metric-feedback-message"),
  metricFeedbackSubmit: document.querySelector("#metric-feedback-submit"),
  metricFeedbackDelete: document.querySelector("#metric-feedback-delete"),
  metricFeedbackClose: document.querySelector("#metric-feedback-close"),
  metricFeedbackCancel: document.querySelector("#metric-feedback-cancel"),
  metricPromptModal: document.querySelector("#metric-prompt-modal"),
  metricPromptForm: document.querySelector("#metric-prompt-form"),
  metricPromptTitle: document.querySelector("#metric-prompt-title"),
  metricPromptSubtitle: document.querySelector("#metric-prompt-subtitle"),
  metricPromptDiff: document.querySelector("#metric-prompt-diff"),
  metricPromptMessage: document.querySelector("#metric-prompt-message"),
  metricPromptSubmit: document.querySelector("#metric-prompt-submit"),
  metricPromptRegenerate: document.querySelector("#metric-prompt-regenerate"),
  metricPromptClose: document.querySelector("#metric-prompt-close"),
  metricPromptCancel: document.querySelector("#metric-prompt-cancel"),
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
  monitorCallTypeFilter: document.querySelector("#monitor-call-type-filter"),
  monitorProblemFilter: document.querySelector("#monitor-problem-filter"),
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
  telegramAccountDropdown: document.querySelector("#telegram-account-dropdown"),
  telegramAccountTrigger: document.querySelector("#telegram-account-trigger"),
  telegramAccountLabel: document.querySelector("#telegram-account-label"),
  telegramAccountStatus: document.querySelector("#telegram-account-status"),
  telegramAccountMenu: document.querySelector("#telegram-account-menu"),
  messagingTabs: document.querySelector("#messaging-tabs"),
  messagingTabButtons: document.querySelectorAll("[data-messaging-tab]"),
  messagingPanels: document.querySelectorAll("[data-messaging-panel]"),
  telegramPanel: document.querySelector("#telegram-panel"),
  telegramRefresh: document.querySelector("#telegram-refresh"),
  telegramThread: document.querySelector("#telegram-thread"),
  telegramChat: document.querySelector("#telegram-chat"),
  telegramCompose: document.querySelector("#telegram-compose"),
  telegramReplyBar: document.querySelector("#telegram-reply-bar"),
  telegramReplyTitle: document.querySelector("#telegram-reply-title"),
  telegramReplyCancel: document.querySelector("#telegram-reply-cancel"),
  telegramMessage: document.querySelector("#telegram-message"),
  telegramSend: document.querySelector("#telegram-send"),
  telegramMessageStatus: document.querySelector("#telegram-message-status"),
  viberTabButton: document.querySelector("[data-messaging-tab='viber']"),
  viberPanel: document.querySelector("#viber-panel"),
  viberRefresh: document.querySelector("#viber-refresh"),
  viberThread: document.querySelector("#viber-thread"),
  viberChat: document.querySelector("#viber-chat"),
  viberMessageStatus: document.querySelector("#viber-message-status"),
  callsModal: document.querySelector("#calls-modal"),
  callsModalList: document.querySelector("#calls-modal-list"),
  callsModalClose: document.querySelector("#calls-modal-close"),
  telegramPhotoModal: document.querySelector("#telegram-photo-modal"),
  telegramPhotoModalClose: document.querySelector("#telegram-photo-modal-close"),
  telegramPhotoModalImage: document.querySelector("#telegram-photo-modal-image"),
  telegramPhotoModalTitle: document.querySelector("#telegram-photo-modal-title"),
  ticketList: document.querySelector("#ticket-list"),
  ticketCountLabel: document.querySelector("#ticket-count-label"),
  ticketTemplate: document.querySelector("#ticket-template"),
  ticketsModal: document.querySelector("#tickets-modal"),
  ticketsModalTitle: document.querySelector("#tickets-modal-title"),
  ticketsModalList: document.querySelector("#tickets-modal-list"),
  ticketsModalClose: document.querySelector("#tickets-modal-close"),
  notesList: document.querySelector("#notes-list"),
  noteForm: document.querySelector("#note-form"),
  noteText: document.querySelector("#note-text"),
  noteMessage: document.querySelector("#note-message")
};

let currentPhone = "";
let currentSummaryCallId = "";
let currentCard = null;
let currentCardWarnings = [];
let editingNoteId = "";
let uiConfirmDialog = null;
let clientLoadSequence = 0;
let summaryPollTimer = null;
let monitorPollTimer = null;
let detailPollTimer = null;
let monitorPage = 1;
let monitorPageSize = 10;
let monitorTotalCalls = 0;
let currentUiState = "";
let currentAdminMotionTab = "";
let currentAiSettingsMotionTab = "";
let currentCallStats = null;
let currentTelegram = null;
let currentViber = null;
let currentMessagingChannel = "telegram";
let selectedTelegramAccountId = "";
let telegramAccountDropdownOpen = false;
let telegramReplyTarget = null;
let currentTickets = [];
let currentCalls = [];
let currentManagerRating = null;
let ticketsModalBackView = null;
let ticketsModalOrderGroups = [];
let currentDetailCallId = "";
let currentDetailTickets = [];
let currentDetailCall = null;
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
  activeTab: "users",
  users: [],
  loading: false,
  editingUserId: "",
  analysisNumbers: [],
  analysisNumbersLoading: false,
  analysisNumbersSaving: false,
  analysisNumbersDirty: false,
  metricFeedback: [],
  metricFeedbackTotal: 0,
  metricFeedbackLoading: false,
  telegramAccounts: [],
  telegramConfigured: false,
  telegramEnabled: false,
  telegramLoading: false,
  telegramSaving: false
};
const metricFeedbackState = {
  callId: "",
  metricKey: "",
  saving: false,
  deleting: false
};
const metricPromptUpdateState = {
  feedbackId: "",
  saving: false,
  loading: false,
  feedback: null,
  target: null,
  currentPrompt: null,
  proposal: null
};
const callStatsCharts = new Map();
const CALL_STATS_WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
let callStatsHeatmapTooltipElement = null;
let activeCallStatsHeatmapTooltipTrigger = null;
let callStatsHeatmapTooltipsReady = false;

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

function formatInternalNumbersCount(numbers) {
  const list = Array.isArray(numbers) ? numbers : [];
  const enabled = list.filter((item) => item.enabled !== false).length;
  const disabled = Math.max(0, list.length - enabled);
  return `${enabled} увімкнено · ${disabled} вимкнено`;
}

function formatMetricFeedbackCount(count) {
  const value = Number(count) || 0;
  const mod10 = value % 10;
  const mod100 = value % 100;
  if (mod10 === 1 && mod100 !== 11) {
    return `${value} правка`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${value} правки`;
  }
  return `${value} правок`;
}

function metricFeedbackPromptUpdate(feedback) {
  const direct = feedback && feedback.promptUpdate;
  if (direct && typeof direct === "object") {
    return direct;
  }
  const payload = feedback && feedback.payload;
  return payload && payload.promptUpdate && typeof payload.promptUpdate === "object"
    ? payload.promptUpdate
    : null;
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
  elements.themeToggle.setAttribute(
    "aria-label",
    isDark ? "Увімкнути світлу тему" : "Увімкнути темну тему"
  );
  elements.themeToggle.setAttribute("aria-pressed", String(isDark));
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
  if (currentCallStats) {
    renderCallStatsCharts(currentCallStats);
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function prefersReducedMotion() {
  return Boolean(
    window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function replayMotion(element, className = "motion-enter") {
  if (!element || prefersReducedMotion()) {
    return;
  }
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

function stageMotionItems(container, selector = ":scope > *", options = {}) {
  if (!container || !container.querySelectorAll || prefersReducedMotion()) {
    return;
  }
  const maxIndex = Number.isFinite(Number(options.maxIndex))
    ? Number(options.maxIndex)
    : 8;
  const className = options.className || "motion-item";
  [...container.querySelectorAll(selector)]
    .filter((item) => !item.hidden && !item.classList.contains("hidden"))
    .forEach((item, index) => {
      item.style.setProperty("--motion-index", String(Math.min(index, maxIndex)));
      item.classList.add(className);
    });
}

function selectedCustomSelectOption(select) {
  if (!select) {
    return null;
  }
  return select.options[select.selectedIndex] || select.options[0] || null;
}

function closeCustomSelect(select) {
  const custom = select && select._customSelect;
  if (!custom) {
    return;
  }
  custom.wrapper.classList.remove("is-open");
  custom.button.setAttribute("aria-expanded", "false");
  custom.menu.hidden = true;
}

function closeCustomSelects(exceptSelect = null) {
  for (const select of document.querySelectorAll("select[data-custom-select='true']")) {
    if (select !== exceptSelect) {
      closeCustomSelect(select);
    }
  }
}

function syncCustomSelect(select) {
  const custom = select && select._customSelect;
  if (!custom) {
    return;
  }

  const selectedOption = selectedCustomSelectOption(select);
  const selectedText = selectedOption ? selectedOption.textContent.trim() : "—";
  custom.button.disabled = select.disabled;
  custom.button.title = selectedText;
  custom.button.querySelector(".custom-select-value").textContent = selectedText;
  custom.menu.replaceChildren();

  for (const option of select.options) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "custom-select-option";
    item.dataset.value = option.value;
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", String(option.selected));
    item.disabled = option.disabled;
    item.classList.toggle("is-active", option.selected);
    item.textContent = option.textContent;
    custom.menu.append(item);
  }
}

function openCustomSelect(select) {
  const custom = select && select._customSelect;
  if (!custom || select.disabled) {
    return;
  }
  closeCustomSelects(select);
  syncCustomSelect(select);
  custom.wrapper.classList.add("is-open");
  custom.button.setAttribute("aria-expanded", "true");
  custom.menu.hidden = false;
}

function focusCustomSelectOption(select, step = 0) {
  const custom = select && select._customSelect;
  if (!custom || custom.menu.hidden) {
    return;
  }
  const options = [...custom.menu.querySelectorAll(".custom-select-option:not(:disabled)")];
  if (!options.length) {
    return;
  }
  const currentIndex = Math.max(
    0,
    options.findIndex((item) => item.dataset.value === select.value)
  );
  const nextIndex = Math.min(options.length - 1, Math.max(0, currentIndex + step));
  options[nextIndex].focus();
}

function chooseCustomSelectValue(select, value) {
  const previous = select.value;
  select.value = value;
  syncCustomSelect(select);
  closeCustomSelect(select);
  select._customSelect.button.focus();
  if (select.value !== previous) {
    select.dispatchEvent(new Event("input", { bubbles: true }));
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

function enhanceCustomSelect(select) {
  if (!select || select.dataset.customSelect === "true") {
    syncCustomSelect(select);
    return;
  }

  select.dataset.customSelect = "true";
  select.classList.add("native-select-hidden");
  select.setAttribute("aria-hidden", "true");
  select.tabIndex = -1;

  const wrapper = document.createElement("div");
  wrapper.className = "custom-select";

  const button = document.createElement("button");
  button.type = "button";
  button.className = "custom-select-button";
  button.setAttribute("aria-haspopup", "listbox");
  button.setAttribute("aria-expanded", "false");
  button.innerHTML = '<span class="custom-select-value"></span>';

  const menu = document.createElement("div");
  menu.className = "custom-select-menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;

  wrapper.append(button, menu);
  select.after(wrapper);
  select._customSelect = { wrapper, button, menu };

  button.addEventListener("click", () => {
    if (menu.hidden) {
      openCustomSelect(select);
      focusCustomSelectOption(select);
    } else {
      closeCustomSelect(select);
    }
  });

  button.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openCustomSelect(select);
      focusCustomSelectOption(select, event.key === "ArrowDown" ? 1 : 0);
    }
  });

  menu.addEventListener("click", (event) => {
    const item = event.target.closest(".custom-select-option");
    if (!item || item.disabled) {
      return;
    }
    chooseCustomSelectValue(select, item.dataset.value || "");
  });

  menu.addEventListener("keydown", (event) => {
    const options = [...menu.querySelectorAll(".custom-select-option:not(:disabled)")];
    const index = options.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      closeCustomSelect(select);
      button.focus();
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const nextIndex = event.key === "ArrowDown"
        ? Math.min(options.length - 1, index + 1)
        : Math.max(0, index - 1);
      if (options[nextIndex]) {
        options[nextIndex].focus();
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const item = document.activeElement.closest(".custom-select-option");
      if (item && !item.disabled) {
        chooseCustomSelectValue(select, item.dataset.value || "");
      }
    }
  });

  select.addEventListener("change", () => syncCustomSelect(select));
  syncCustomSelect(select);
}

function enhanceCustomSelects(root = document) {
  if (!root || !root.querySelectorAll) {
    return;
  }
  for (const select of root.querySelectorAll("select")) {
    enhanceCustomSelect(select);
  }
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

function dateKey(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Kyiv"
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return map.year && map.month && map.day ? `${map.year}-${map.month}-${map.day}` : "";
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

function formatApiUsd(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(Number(value || 0));
}

function formatMinutesFromSeconds(value) {
  const minutes = Number(value || 0) / 60;
  return new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: minutes >= 100 ? 0 : 1
  }).format(minutes);
}

function formatDuration(value) {
  const totalSeconds = Math.max(0, Math.round(Number(value || 0)));
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
  edit: '<path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path>',
  check: '<path d="M20 6 9 17l-5-5"></path>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"></path><path d="M22 2 11 13"></path>',
  power: '<path d="M12 2v10"></path><path d="M18.4 6.6a9 9 0 1 1-12.8 0"></path>',
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
  link: '<path d="M9 17H7A5 5 0 0 1 7 7h2"></path><path d="M15 7h2a5 5 0 1 1 0 10h-2"></path><line x1="8" x2="16" y1="12" y2="12"></line>',
  reply: '<polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path>',
  image: '<rect width="18" height="18" x="3" y="3" rx="2"></rect><circle cx="9" cy="9" r="2"></circle><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"></path>',
  mic: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><path d="M12 19v3"></path>',
  music: '<path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>',
  mapPin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle>',
  user: '<path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="7" r="4"></circle>',
  smile: '<circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><path d="M9 9h.01"></path><path d="M15 9h.01"></path>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2Z"></path><path d="M8 7h8"></path><path d="M8 11h8"></path><path d="M8 15h5"></path>',
  dice: '<rect width="16" height="16" x="4" y="4" rx="3"></rect><circle cx="9" cy="9" r="1"></circle><circle cx="15" cy="9" r="1"></circle><circle cx="9" cy="15" r="1"></circle><circle cx="15" cy="15" r="1"></circle>',
  gift: '<rect width="18" height="14" x="3" y="8" rx="2"></rect><path d="M12 8v14"></path><path d="M3 12h18"></path><path d="M12 8H8.5A2.5 2.5 0 1 1 11 5.5Z"></path><path d="M12 8h3.5A2.5 2.5 0 1 0 13 5.5Z"></path>',
  fileText: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path><path d="M16 13H8"></path><path d="M16 17H8"></path><path d="M10 9H8"></path>'
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
  const activePanel = {
    ai: elements.aiSettingsTabAi,
    exclusions: elements.aiSettingsTabExclusions,
    blocked: elements.aiSettingsTabBlocked
  }[aiSettingsState.activeTab];
  if (aiSettingsState.activeTab !== currentAiSettingsMotionTab) {
    replayMotion(activePanel);
    currentAiSettingsMotionTab = aiSettingsState.activeTab;
  }
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
    stageMotionItems(elements.aiCallTypeList, ":scope > .ai-soldly-empty", { maxIndex: 0 });
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
  stageMotionItems(elements.aiCallTypeList, ":scope > .ai-type-card", { maxIndex: 8 });
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
    stageMotionItems(elements.aiMetricList, ":scope > .ai-soldly-empty", { maxIndex: 0 });
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
  stageMotionItems(elements.aiMetricList, ":scope > .ai-metric-card", { maxIndex: 8 });
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

function scrollAiSettingsToStart() {
  if (!elements.aiSettingsPage) {
    return;
  }

  requestAnimationFrame(() => {
    const header = document.querySelector(".app-header");
    const headerStyle = header ? window.getComputedStyle(header) : null;
    const headerOffset = headerStyle && ["fixed", "sticky"].includes(headerStyle.position)
      ? header.getBoundingClientRect().height
      : 0;
    const top = elements.aiSettingsPage.getBoundingClientRect().top + window.scrollY - headerOffset - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
  });
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

async function resetAiSettings(anchor = null) {
  const confirmed = await showUiConfirmDialog({
    title: "Скинути AI-налаштування?",
    message: "Усі типи дзвінків, метрики й варіанти оцінювання повернуться до стандартних правил. Поточні зміни буде втрачено.",
    confirmLabel: "Скинути",
    cancelLabel: "Залишити",
    tone: "warning",
    anchor
  });
  if (!confirmed) {
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
  scrollAiSettingsToStart();
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
  scrollAiSettingsToStart();
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

async function deleteAiCallType(key, anchor = null) {
  const callTypes = aiSettingsState.settings && aiSettingsState.settings.callTypes;
  if (!Array.isArray(callTypes) || callTypes.length <= 1) {
    setAiSettingsMessage("Має залишитися хоча б один тип аналізу.", "danger");
    return;
  }

  const index = callTypes.findIndex((item) => item.key === key);
  if (index < 0) {
    return;
  }

  const callType = callTypes[index];
  const confirmed = await showUiConfirmDialog({
    title: "Видалити тип аналізу?",
    message: `Тип "${callType.label || callType.key}" і всі його метрики буде видалено з правил оцінювання.`,
    confirmLabel: "Видалити",
    cancelLabel: "Скасувати",
    tone: "danger",
    anchor
  });
  if (!confirmed) {
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

async function deleteAiMetric(key, anchor = null) {
  const callType = selectedAiCallType();
  const metrics = callType && callType.metrics;
  if (!Array.isArray(metrics) || metrics.length <= 1) {
    setAiSettingsMessage("Має залишитися хоча б одна метрика.", "danger");
    return;
  }

  const index = metrics.findIndex((item) => item.key === key);
  if (index < 0) {
    return;
  }

  const metric = metrics[index];
  const confirmed = await showUiConfirmDialog({
    title: "Видалити метрику?",
    message: `Метрика "${metric.label || metric.key}" більше не впливатиме на оцінювання цього типу дзвінка.`,
    confirmLabel: "Видалити",
    cancelLabel: "Скасувати",
    tone: "danger",
    anchor
  });
  if (!confirmed) {
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
    stageMotionItems(elements.aiModalOptionList, ":scope > .ai-soldly-empty", { maxIndex: 0 });
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
  enhanceCustomSelects(elements.aiModalOptionList);
  stageMotionItems(elements.aiModalOptionList, ":scope > .ai-modal-option-row", { maxIndex: 6 });
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
    stageMotionItems(elements.adminUsersList, ":scope > .admin-empty", { maxIndex: 0 });
    return;
  }

  if (!users.length) {
    const message = document.createElement("p");
    message.className = "admin-empty";
    message.textContent = "Користувачів ще немає.";
    elements.adminUsersList.append(message);
    stageMotionItems(elements.adminUsersList, ":scope > .admin-empty", { maxIndex: 0 });
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
        <button class="admin-icon-button" type="button" data-admin-action="edit-user" data-user-id="${escapeHtml(user.id)}" aria-label="Редагувати користувача" title="Редагувати">
          ${aiIcon("edit")}
        </button>
        <button class="admin-icon-button is-danger" type="button" data-admin-action="delete-user" data-user-id="${escapeHtml(user.id)}" aria-label="Видалити користувача" title="Видалити"${isSelf ? " disabled" : ""}>
          ${aiIcon("trash")}
        </button>
      </div>
    `;
    elements.adminUsersList.append(row);
  }
  stageMotionItems(elements.adminUsersList, ":scope > .admin-user-card", { maxIndex: 8 });
}

function renderAdminChrome() {
  const tab = adminState.activeTab || "users";
  const copy = {
    users: {
      title: "Користувачі",
      description: "Облікові записи для доступу до Client Info API."
    },
    "analysis-numbers": {
      title: "AI-номери",
      description: "Внутрішні номери, дзвінки яких потрапляють в AI-аналіз та статистику."
    },
    "metric-feedback": {
      title: "AI-правки",
      description: "Менеджерські пояснення до оцінених метрик і застосування цих правок до prompt-інструкцій."
    },
    telegram: {
      title: "Telegram",
      description: "User API акаунти, через які картка клієнта шукає переписки по номеру телефона."
    }
  }[tab] || {
    title: "Користувачі",
    description: "Облікові записи для доступу до Client Info API."
  };

  if (elements.adminTitle) {
    elements.adminTitle.textContent = copy.title;
  }
  if (elements.adminDescription) {
    elements.adminDescription.textContent = copy.description;
  }
  if (elements.adminAddUser) {
    elements.adminAddUser.classList.toggle("hidden", tab !== "users");
  }
  for (const button of elements.adminTabButtons || []) {
    button.classList.toggle("active", button.dataset.adminTab === tab);
  }
  for (const panel of elements.adminPanels || []) {
    const active = panel.dataset.adminPanel === tab;
    panel.classList.toggle("hidden", !active);
    if (active && tab !== currentAdminMotionTab) {
      replayMotion(panel);
    }
  }
  currentAdminMotionTab = tab;
}

function telegramAccountStatusLabel(status) {
  return {
    draft: "Очікує логін",
    code_sent: "Код надіслано",
    password_required: "Потрібен 2FA пароль",
    connected: "Підключено",
    failed: "Помилка",
    disabled: "Вимкнено"
  }[status] || "Невідомо";
}

function telegramAccountCountText() {
  if (adminState.telegramLoading) {
    return "Завантаження...";
  }
  if (!adminState.telegramConfigured) {
    return adminState.telegramEnabled ? "Не налаштовано" : "Вимкнено";
  }
  const accounts = adminState.telegramAccounts || [];
  const connected = accounts.filter((account) => account.status === "connected" && account.enabled !== false).length;
  return `${connected}/${accounts.length} підключено`;
}

function setAdminTelegramFormEnabled(enabled) {
  const isEnabled = enabled === true;
  if (elements.adminTelegramAdd) {
    elements.adminTelegramAdd.disabled = !isEnabled;
  }
  if (elements.adminTelegramLabel) {
    elements.adminTelegramLabel.disabled = !isEnabled;
  }
  if (elements.adminTelegramPhone) {
    elements.adminTelegramPhone.disabled = !isEnabled;
  }
}

function renderAdminTelegramAccounts() {
  if (!elements.adminTelegramList) {
    return;
  }

  const accounts = adminState.telegramAccounts || [];
  elements.adminTelegramCount.textContent = telegramAccountCountText();
  setAdminTelegramFormEnabled(
    adminState.telegramConfigured &&
      !adminState.telegramSaving &&
      !adminState.telegramLoading
  );
  elements.adminTelegramList.replaceChildren();

  if (!adminState.telegramConfigured) {
    const message = document.createElement("p");
    message.className = "admin-empty";
    message.textContent = adminState.telegramEnabled
      ? "Додайте TELEGRAM_API_ID та TELEGRAM_API_HASH у .env, щоб логінити акаунти."
      : "Telegram User API вимкнений у конфігурації.";
    elements.adminTelegramList.append(message);
    stageMotionItems(elements.adminTelegramList, ":scope > .admin-empty", { maxIndex: 0 });
    return;
  }

  if (adminState.telegramLoading) {
    const message = document.createElement("p");
    message.className = "admin-empty";
    message.textContent = "Завантажуємо Telegram акаунти...";
    elements.adminTelegramList.append(message);
    stageMotionItems(elements.adminTelegramList, ":scope > .admin-empty", { maxIndex: 0 });
    return;
  }

  if (!accounts.length) {
    const message = document.createElement("p");
    message.className = "admin-empty";
    message.textContent = "Додайте перший Telegram акаунт, щоб шукати переписки по номеру.";
    elements.adminTelegramList.append(message);
    stageMotionItems(elements.adminTelegramList, ":scope > .admin-empty", { maxIndex: 0 });
    return;
  }

  for (const account of accounts) {
    const connected = account.status === "connected";
    const needsConfirm = account.status === "code_sent" || account.status === "password_required";
    const row = document.createElement("article");
    row.className = `admin-telegram-card is-${account.status || "draft"}`;
    row.dataset.telegramAccountId = account.id || "";
    row.innerHTML = `
      <div class="admin-telegram-main">
        <strong>${escapeHtml(account.displayName || account.label || account.phone)}</strong>
        <span>${escapeHtml(account.phone || "")}${account.username ? ` · @${escapeHtml(account.username)}` : ""}</span>
      </div>
      <span class="admin-role-pill ${connected ? "is-admin" : ""}">
        ${escapeHtml(telegramAccountStatusLabel(account.status))}
      </span>
      <div class="admin-telegram-meta">
        <strong>${escapeHtml(account.lastConnectedAt ? formatDateTime(account.lastConnectedAt) : "—")}</strong>
        <span>Останній логін</span>
      </div>
      <div class="admin-telegram-actions">
        <button class="admin-icon-button" type="button" data-telegram-action="send-code" aria-label="Надіслати код" title="Надіслати код">
          ${aiIcon("send")}
        </button>
        <button class="admin-icon-button ${account.enabled === false ? "" : "is-danger"}" type="button" data-telegram-action="toggle" aria-label="${account.enabled === false ? "Увімкнути" : "Вимкнути"}" title="${account.enabled === false ? "Увімкнути" : "Вимкнути"}">
          ${aiIcon(account.enabled === false ? "power" : "ban")}
        </button>
        <button class="admin-icon-button is-danger" type="button" data-telegram-action="delete" aria-label="Видалити" title="Видалити">
          ${aiIcon("trash")}
        </button>
      </div>
      <form class="admin-telegram-confirm ${needsConfirm ? "" : "hidden"}" data-telegram-confirm-form>
        <input data-telegram-code type="text" inputmode="numeric" autocomplete="one-time-code" placeholder="Код Telegram">
        <input data-telegram-password type="password" autocomplete="current-password" placeholder="2FA пароль, якщо є">
        <button class="secondary-button" type="submit">Підтвердити</button>
      </form>
      ${account.lastError ? `<p class="admin-telegram-error">${escapeHtml(account.lastError)}</p>` : ""}
    `;
    elements.adminTelegramList.append(row);
  }
  stageMotionItems(elements.adminTelegramList, ":scope > .admin-telegram-card", { maxIndex: 8 });
}

function renderAdminAnalysisNumbers() {
  if (!elements.adminAnalysisNumbersList) {
    return;
  }

  const numbers = adminState.analysisNumbers;
  elements.adminAnalysisNumberCount.textContent = adminState.analysisNumbersLoading
    ? "Завантаження..."
    : formatInternalNumbersCount(numbers);
  elements.adminAnalysisNumbersSave.disabled =
    adminState.analysisNumbersLoading ||
    adminState.analysisNumbersSaving ||
    !adminState.analysisNumbersDirty;
  elements.adminAnalysisEnableAll.disabled =
    adminState.analysisNumbersLoading || adminState.analysisNumbersSaving || !numbers.length;
  elements.adminAnalysisDisableAll.disabled =
    adminState.analysisNumbersLoading || adminState.analysisNumbersSaving || !numbers.length;
  elements.adminAnalysisNumbersList.replaceChildren();

  if (adminState.analysisNumbersLoading) {
    const message = document.createElement("p");
    message.className = "admin-empty";
    message.textContent = "Завантажуємо внутрішні номери...";
    elements.adminAnalysisNumbersList.append(message);
    stageMotionItems(elements.adminAnalysisNumbersList, ":scope > .admin-empty", { maxIndex: 0 });
    return;
  }

  if (!numbers.length) {
    const message = document.createElement("p");
    message.className = "admin-empty";
    message.textContent = "Внутрішніх номерів ще немає в історії дзвінків.";
    elements.adminAnalysisNumbersList.append(message);
    stageMotionItems(elements.adminAnalysisNumbersList, ":scope > .admin-empty", { maxIndex: 0 });
    return;
  }

  for (const item of numbers) {
    const enabled = item.enabled !== false;
    const metaParts = [
      item.employeeName && item.employeeName !== item.label ? item.employeeName : "",
      item.pbxName || "",
      item.lastCallAt ? `останній: ${formatDateTime(item.lastCallAt)}` : ""
    ].filter(Boolean);
    const row = document.createElement("article");
    row.className = `admin-number-card ${enabled ? "" : "is-disabled"}`;
    row.dataset.internalNumber = item.number;
    row.innerHTML = `
      <label class="admin-number-switch">
        <input type="checkbox" data-analysis-number="${escapeHtml(item.number)}" ${enabled ? "checked" : ""}>
        <span aria-hidden="true"></span>
      </label>
      <div class="admin-number-main">
        <strong>${escapeHtml(item.label || `вн. ${item.number}`)}</strong>
        <span>вн. ${escapeHtml(item.number)}</span>
      </div>
      <div class="admin-number-meta">
        <strong>${formatNumber(item.totalCalls || 0)}</strong>
        <span>дзвінків у базі</span>
      </div>
      <div class="admin-number-extra">
        <strong>${enabled ? "Аналізується" : "Виключено"}</strong>
        <span>${escapeHtml(metaParts.join(" · ") || "Без додаткових даних")}</span>
      </div>
    `;
    elements.adminAnalysisNumbersList.append(row);
  }
  stageMotionItems(elements.adminAnalysisNumbersList, ":scope > .admin-number-card", { maxIndex: 8 });
}

function metricFeedbackScoreText(feedback) {
  const metric = feedback && feedback.metric || {};
  const score = metric.score;
  const maxScore = metric.maxScore;
  if (
    score === null ||
    score === undefined ||
    !Number.isFinite(Number(score))
  ) {
    return "—";
  }
  if (Number.isFinite(Number(maxScore)) && Number(maxScore) > 0) {
    return `${formatMetricNumber(score)}/${formatMetricNumber(maxScore)}`;
  }
  return formatMetricNumber(score);
}

function adminMetricFeedbackById(id) {
  return (adminState.metricFeedback || []).find((item) => String(item.id || "") === String(id || "")) || null;
}

function renderAdminMetricFeedback() {
  if (!elements.adminMetricFeedbackList) {
    return;
  }

  const items = Array.isArray(adminState.metricFeedback)
    ? adminState.metricFeedback
    : [];
  elements.adminMetricFeedbackCount.textContent = adminState.metricFeedbackLoading
    ? "Завантаження..."
    : formatMetricFeedbackCount(adminState.metricFeedbackTotal || items.length);
  elements.adminMetricFeedbackList.replaceChildren();

  if (adminState.metricFeedbackLoading) {
    const message = document.createElement("p");
    message.className = "admin-empty";
    message.textContent = "Завантажуємо правки до AI-метрик...";
    elements.adminMetricFeedbackList.append(message);
    stageMotionItems(elements.adminMetricFeedbackList, ":scope > .admin-empty", { maxIndex: 0 });
    return;
  }

  if (!items.length) {
    const message = document.createElement("p");
    message.className = "admin-empty";
    message.textContent = "Менеджери ще не додавали правки до оцінених метрик.";
    elements.adminMetricFeedbackList.append(message);
    stageMotionItems(elements.adminMetricFeedbackList, ":scope > .admin-empty", { maxIndex: 0 });
    return;
  }

  for (const feedback of items) {
    const call = feedback.call || {};
    const metric = feedback.metric || {};
    const callIdValue = feedback.callId || call.callId || call.id || "";
    const promptUpdate = metricFeedbackPromptUpdate(feedback);
    const promptApplied = Boolean(promptUpdate && promptUpdate.appliedAt);
    const meta = [
      call.typeLabel || call.type || "",
      call.operatorName ? `оператор: ${call.operatorName}` : "",
      call.startedAt ? formatDateTime(call.startedAt) : ""
    ].filter(Boolean);
    const row = document.createElement("article");
    row.className = "admin-feedback-card";
    row.dataset.feedbackId = feedback.id || "";
    row.innerHTML = `
      <div class="admin-feedback-main">
        <strong>${escapeHtml(metric.label || feedback.metricKey || "Метрика")}</strong>
        <span>${escapeHtml([metric.group, metric.selectedOptionLabel].filter(Boolean).join(" · ") || "AI-метрика")}</span>
        <p>${escapeHtml(feedback.text || "")}</p>
      </div>
      <div class="admin-feedback-score">
        <strong>${escapeHtml(metricFeedbackScoreText(feedback))}</strong>
        <span>${escapeHtml(metric.selectedOptionLabel || "Оцінка")}</span>
      </div>
      <div class="admin-feedback-call">
        <strong>${escapeHtml(formatCallPhone(call.externalNumber || call.phone || callIdValue))}</strong>
        <span>${escapeHtml(meta.join(" · ") || "Дзвінок")}</span>
      </div>
      <div class="admin-feedback-meta">
        <strong>${escapeHtml(feedbackAuthorLabel(feedback))}</strong>
        <span>${escapeHtml(formatDateTime(feedback.updatedAt))}</span>
      </div>
      <div class="admin-feedback-actions">
        <button
          class="admin-feedback-prompt ${promptApplied ? "is-applied" : ""}"
          type="button"
          data-admin-feedback-action="prompt-update"
          data-feedback-id="${escapeHtml(feedback.id || "")}"
          aria-label="${promptApplied ? "Правку вже застосовано до prompt" : "Застосувати правку до prompt"}"
          title="${promptApplied ? `Застосовано ${escapeHtml(formatDateTime(promptUpdate.appliedAt))}` : "Додати в prompt"}"
          ${promptApplied ? "disabled" : ""}
        >
          ${aiIcon(promptApplied ? "check" : "sparkles")}
          <span>${promptApplied ? "Застосовано" : "У prompt"}</span>
        </button>
        <a class="admin-feedback-link" href="/calls/${encodeURIComponent(callIdValue)}" aria-label="Відкрити дзвінок">
          ${aiIcon("chevronRight")}
        </a>
        <button
          class="admin-feedback-delete"
          type="button"
          data-admin-feedback-action="delete"
          data-feedback-id="${escapeHtml(feedback.id || "")}"
          aria-label="Видалити AI-правку"
          title="Видалити"
        >
          ${aiIcon("trash")}
        </button>
      </div>
    `;
    elements.adminMetricFeedbackList.append(row);
  }

  stageMotionItems(elements.adminMetricFeedbackList, ":scope > .admin-feedback-card", { maxIndex: 8 });
}

function hydrateAdminAnalysisNumbers(numbers) {
  return (Array.isArray(numbers) ? numbers : []).map((item) => ({
    ...item,
    enabled: item.enabled !== false,
    originalEnabled: item.enabled !== false
  }));
}

function syncAdminAnalysisNumbersDirty() {
  adminState.analysisNumbersDirty = adminState.analysisNumbers.some(
    (item) => (item.enabled !== false) !== (item.originalEnabled !== false)
  );
}

async function loadAdminUsers() {
  if (!isAdminUser()) {
    window.location.href = "/client-card";
    return;
  }

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

async function loadAdminAnalysisNumbers() {
  if (!isAdminUser()) {
    window.location.href = "/client-card";
    return;
  }

  adminState.analysisNumbersLoading = true;
  adminState.analysisNumbersDirty = false;
  setMessage(elements.adminAnalysisNumbersMessage, "", "neutral");
  renderAdminAnalysisNumbers();

  try {
    const response = await apiFetch("/api/admin/analysis-internal-numbers");
    const payload = await readJsonResponse(response, "Не вдалося завантажити внутрішні номери.");
    adminState.analysisNumbers = hydrateAdminAnalysisNumbers(payload.numbers);
    adminState.analysisNumbersDirty = false;
    setMessage(elements.adminAnalysisNumbersMessage, "", "neutral");
  } catch (error) {
    setMessage(
      elements.adminAnalysisNumbersMessage,
      error.message || "Не вдалося завантажити внутрішні номери."
    );
  } finally {
    adminState.analysisNumbersLoading = false;
    renderAdminAnalysisNumbers();
  }
}

async function loadAdminMetricFeedback() {
  if (!isAdminUser()) {
    window.location.href = "/client-card";
    return;
  }

  adminState.metricFeedbackLoading = true;
  setMessage(elements.adminMetricFeedbackMessage, "", "neutral");
  renderAdminMetricFeedback();

  try {
    const response = await apiFetch("/api/admin/ai-metric-feedback?limit=200");
    const payload = await readJsonResponse(response, "Не вдалося завантажити правки до метрик.");
    adminState.metricFeedback = Array.isArray(payload.items) ? payload.items : [];
    adminState.metricFeedbackTotal = Number(payload.total || adminState.metricFeedback.length) || 0;
    setMessage(elements.adminMetricFeedbackMessage, "", "neutral");
  } catch (error) {
    setMessage(
      elements.adminMetricFeedbackMessage,
      error.message || "Не вдалося завантажити правки до метрик."
    );
  } finally {
    adminState.metricFeedbackLoading = false;
    renderAdminMetricFeedback();
  }
}

function setMetricPromptMessage(message, tone = "") {
  setMessage(elements.metricPromptMessage, message, tone);
}

function setMetricPromptActionState() {
  const hasProposal = Boolean(metricPromptUpdateState.currentPrompt && metricPromptUpdateState.proposal);
  if (elements.metricPromptSubmit) {
    elements.metricPromptSubmit.disabled =
      metricPromptUpdateState.loading ||
      metricPromptUpdateState.saving ||
      !hasProposal;
    if (metricPromptUpdateState.saving) {
      elements.metricPromptSubmit.textContent = "Застосовуємо...";
    } else if (metricPromptUpdateState.loading && !hasProposal) {
      elements.metricPromptSubmit.textContent = "Завантажуємо...";
    } else {
      elements.metricPromptSubmit.textContent = "Застосувати";
    }
  }
  if (elements.metricPromptRegenerate) {
    elements.metricPromptRegenerate.disabled =
      metricPromptUpdateState.loading ||
      metricPromptUpdateState.saving ||
      !metricPromptUpdateState.feedbackId ||
      !hasProposal;
    elements.metricPromptRegenerate.textContent =
      metricPromptUpdateState.loading && hasProposal
        ? "Генеруємо..."
        : "Згенерувати ще раз";
  }
}

function closeMetricPromptModal() {
  metricPromptUpdateState.feedbackId = "";
  metricPromptUpdateState.saving = false;
  metricPromptUpdateState.loading = false;
  metricPromptUpdateState.feedback = null;
  metricPromptUpdateState.target = null;
  metricPromptUpdateState.currentPrompt = null;
  metricPromptUpdateState.proposal = null;
  elements.metricPromptDiff?.replaceChildren();
  setMetricPromptActionState();
  closeAiDialog(elements.metricPromptModal);
}

function metricPromptTargetTitle(target = {}, feedback = {}) {
  const metric = feedback.metric || {};
  const label = target.metricLabel || metric.label || feedback.metricKey || "Метрика";
  const callType = target.callTypeLabel || (feedback.call && feedback.call.typeLabel) || "";
  return [label, callType].filter(Boolean).join(" · ");
}

function metricPromptOptionMeta(optionItem = {}) {
  const parts = [];
  if (optionItem.score === null || optionItem.score === undefined) {
    parts.push("без бала");
  } else {
    parts.push(`${formatMetricNumber(optionItem.score)} балів`);
  }
  if (optionItem.countsTowardScore === false) {
    parts.push("не входить у середню");
  }
  return parts.join(" · ");
}

function metricPromptFieldValue(value) {
  return String(value || "").trim();
}

function appendMetricPromptDiffField(container, config = {}) {
  const row = document.createElement("section");
  row.className = "metric-prompt-diff-field";

  const label = document.createElement("div");
  label.className = "metric-prompt-diff-label";
  const strong = document.createElement("strong");
  strong.textContent = config.label || "Prompt";
  label.append(strong);
  if (config.caption) {
    const span = document.createElement("span");
    span.textContent = config.caption;
    label.append(span);
  }

  const before = document.createElement("div");
  before.className = "metric-prompt-before";
  const beforeTitle = document.createElement("span");
  beforeTitle.textContent = "Було";
  const beforeText = document.createElement("p");
  beforeText.textContent = metricPromptFieldValue(config.before) || "—";
  before.append(beforeTitle, beforeText);

  const after = document.createElement("label");
  after.className = "metric-prompt-after";
  const afterTitle = document.createElement("span");
  afterTitle.textContent = "Стане";
  const textarea = document.createElement("textarea");
  textarea.value = metricPromptFieldValue(config.after);
  textarea.rows = config.rows || 3;
  textarea.maxLength = config.maxLength || 6000;
  textarea.required = true;
  textarea.dataset.promptScope = config.scope || "";
  textarea.dataset.promptKey = config.key || "";
  textarea.dataset.promptField = config.field || "";
  after.append(afterTitle, textarea);

  row.append(label, before, after);
  container.append(row);
}

function renderMetricPromptDiff(currentPrompt, proposal) {
  if (!elements.metricPromptDiff) {
    return;
  }

  elements.metricPromptDiff.replaceChildren();
  if (!currentPrompt || !proposal) {
    const message = document.createElement("p");
    message.className = "admin-empty";
    message.textContent = "AI готує diff prompt-налаштувань...";
    elements.metricPromptDiff.append(message);
    return;
  }

  const currentMetric = currentPrompt.metric || {};
  const proposalMetric = proposal.metric || {};
  const metricSection = document.createElement("article");
  metricSection.className = "metric-prompt-diff-section";
  const metricHead = document.createElement("header");
  metricHead.className = "metric-prompt-diff-head";
  const metricTitle = document.createElement("strong");
  metricTitle.textContent = currentMetric.label || "Метрика";
  const metricCaption = document.createElement("span");
  metricCaption.textContent = [currentMetric.group, "метрика"].filter(Boolean).join(" · ");
  metricHead.append(metricTitle, metricCaption);
  metricSection.append(metricHead);
  appendMetricPromptDiffField(metricSection, {
    label: "Опис",
    caption: "видиме поле «Опис» у AI-налаштуваннях",
    before: currentMetric.description,
    after: proposalMetric.description,
    scope: "metric",
    field: "description",
    rows: 3,
    maxLength: 5000
  });
  appendMetricPromptDiffField(metricSection, {
    label: "Інструкція для оцінювання",
    caption: "основний prompt метрики",
    before: currentMetric.aiInstructions,
    after: proposalMetric.aiInstructions,
    scope: "metric",
    field: "aiInstructions",
    rows: 5,
    maxLength: 8000
  });
  elements.metricPromptDiff.append(metricSection);

  const optionsByKey = new Map(
    (Array.isArray(proposal.options) ? proposal.options : [])
      .map((optionItem) => [String(optionItem.key || ""), optionItem])
  );
  for (const optionItem of currentPrompt.options || []) {
    const proposalOption = optionsByKey.get(String(optionItem.key || "")) || {};
    const optionSection = document.createElement("article");
    optionSection.className = "metric-prompt-diff-section";
    const optionHead = document.createElement("header");
    optionHead.className = "metric-prompt-diff-head";
    const optionTitle = document.createElement("strong");
    optionTitle.textContent = optionItem.label || optionItem.key || "Оцінка";
    const optionCaption = document.createElement("span");
    optionCaption.textContent = metricPromptOptionMeta(optionItem);
    optionHead.append(optionTitle, optionCaption);
    optionSection.append(optionHead);
    appendMetricPromptDiffField(optionSection, {
      label: "Prompt оцінки",
      caption: "видиме поле критеріїв для цього варіанту",
      before: optionItem.aiInstructions,
      after: proposalOption.aiInstructions,
      scope: "option",
      key: optionItem.key,
      field: "aiInstructions",
      rows: 4,
      maxLength: 6000
    });
    elements.metricPromptDiff.append(optionSection);
  }

  if (proposal.rationale) {
    const rationale = document.createElement("p");
    rationale.className = "metric-prompt-rationale";
    rationale.textContent = proposal.rationale;
    elements.metricPromptDiff.append(rationale);
  }
}

function collectMetricPromptProposal() {
  const currentPrompt = metricPromptUpdateState.currentPrompt || {};
  const previousProposal = metricPromptUpdateState.proposal || {};
  const proposal = {
    metric: {
      description: "",
      aiInstructions: "",
      aiBrief: ""
    },
    options: [],
    rationale: previousProposal.rationale || "",
    model: previousProposal.model || "",
    usage: previousProposal.usage || null
  };

  for (const textarea of elements.metricPromptDiff?.querySelectorAll("textarea[data-prompt-scope]") || []) {
    const scope = textarea.dataset.promptScope;
    const field = textarea.dataset.promptField;
    const value = String(textarea.value || "").trim();
    if (scope === "metric" && Object.prototype.hasOwnProperty.call(proposal.metric, field)) {
      proposal.metric[field] = value;
      continue;
    }
    if (scope === "option") {
      const key = textarea.dataset.promptKey || "";
      let option = proposal.options.find((item) => item.key === key);
      if (!option) {
        option = { key, aiInstructions: "", aiBrief: "" };
        proposal.options.push(option);
      }
      if (field === "aiInstructions") {
        option[field] = value;
      }
    }
  }

  const knownOptionKeys = new Set(
    (Array.isArray(currentPrompt.options) ? currentPrompt.options : [])
      .map((optionItem) => String(optionItem.key || ""))
  );
  proposal.options = proposal.options.filter((optionItem) => knownOptionKeys.has(optionItem.key));
  return proposal;
}

async function loadMetricPromptUpdate(feedbackId, { regenerate = false } = {}) {
  const localFeedback = metricPromptUpdateState.feedback || adminMetricFeedbackById(feedbackId);
  if (!feedbackId || !localFeedback || metricPromptUpdateState.loading) {
    return;
  }

  metricPromptUpdateState.loading = true;
  if (!regenerate) {
    metricPromptUpdateState.currentPrompt = null;
    metricPromptUpdateState.proposal = null;
    renderMetricPromptDiff(null, null);
  }
  setMetricPromptActionState();
  setMetricPromptMessage(
    regenerate
      ? "Генеруємо новий draft і оновлюємо кеш..."
      : "Готуємо AI rewrite prompt-налаштувань...",
    "neutral"
  );

  try {
    const query = regenerate ? "?regenerate=1" : "";
    const response = await apiFetch(
      `/api/admin/ai-metric-feedback/${encodeURIComponent(feedbackId)}/prompt-update${query}`,
      { headers: { Accept: "application/json" } }
    );
    const payload = await readJsonResponse(response, "Не вдалося підготувати зміну prompt.");
    metricPromptUpdateState.feedback = payload.feedback || localFeedback;
    metricPromptUpdateState.target = payload.target || null;
    metricPromptUpdateState.currentPrompt = payload.currentPrompt || null;
    metricPromptUpdateState.proposal = payload.proposal || null;
    if (elements.metricPromptTitle) {
      elements.metricPromptTitle.textContent = metricPromptTargetTitle(
        payload.target,
        payload.feedback || localFeedback
      );
    }
    const draft = payload.promptUpdateDraft || null;
    if (elements.metricPromptSubtitle) {
      elements.metricPromptSubtitle.textContent =
        draft && draft.cached
          ? "Показано збережений draft. Якщо треба іншу версію, натисніть «Згенерувати ще раз»."
          : "Перегляньте diff: AI переписав prompt метрики та кожної оцінки без одноразового контексту дзвінка.";
    }
    renderMetricPromptDiff(payload.currentPrompt, payload.proposal);
    setMetricPromptMessage(
      draft && draft.cached
        ? "Використано draft з кешу БД."
        : "",
      draft && draft.cached ? "neutral" : ""
    );
    elements.metricPromptDiff?.querySelector("textarea")?.focus();
  } catch (error) {
    setMetricPromptMessage(error.message || "Не вдалося підготувати зміну prompt.");
  } finally {
    metricPromptUpdateState.loading = false;
    setMetricPromptActionState();
  }
}

async function openMetricPromptModal(feedbackId) {
  const localFeedback = adminMetricFeedbackById(feedbackId);
  if (!feedbackId || !localFeedback || metricPromptUpdateState.loading) {
    return;
  }

  metricPromptUpdateState.feedbackId = feedbackId;
  metricPromptUpdateState.saving = false;
  metricPromptUpdateState.feedback = localFeedback;
  metricPromptUpdateState.target = null;
  metricPromptUpdateState.currentPrompt = null;
  metricPromptUpdateState.proposal = null;

  if (elements.metricPromptTitle) {
    elements.metricPromptTitle.textContent = localFeedback.metric && localFeedback.metric.label
      ? localFeedback.metric.label
      : "Застосувати правку";
  }
  if (elements.metricPromptSubtitle) {
    elements.metricPromptSubtitle.textContent = "AI переписує інструкції метрики й усіх оцінок на основі цієї правки.";
  }
  renderMetricPromptDiff(null, null);
  setMetricPromptActionState();
  showAiDialog(elements.metricPromptModal);
  await loadMetricPromptUpdate(feedbackId);
}

async function regenerateMetricPromptDraft() {
  const feedbackId = metricPromptUpdateState.feedbackId;
  if (!feedbackId || metricPromptUpdateState.loading || metricPromptUpdateState.saving) {
    return;
  }
  await loadMetricPromptUpdate(feedbackId, { regenerate: true });
}

async function saveMetricPromptUpdate(event) {
  event.preventDefault();
  const feedbackId = metricPromptUpdateState.feedbackId;

  if (!feedbackId || metricPromptUpdateState.saving || metricPromptUpdateState.loading) {
    return;
  }
  const proposal = collectMetricPromptProposal();
  if (!proposal.metric.aiInstructions) {
    setMetricPromptMessage("Заповніть prompt метрики в колонці «Стане».");
    return;
  }
  if ((metricPromptUpdateState.currentPrompt?.options || []).some((optionItem) => {
    const option = proposal.options.find((entry) => entry.key === optionItem.key);
    return !option || !option.aiInstructions;
  })) {
    setMetricPromptMessage("Заповніть prompt для кожної оцінки.");
    return;
  }

  metricPromptUpdateState.saving = true;
  setMetricPromptActionState();
  setMetricPromptMessage("Оновлюємо AI-налаштування...", "neutral");

  try {
    const response = await apiFetch(
      `/api/admin/ai-metric-feedback/${encodeURIComponent(feedbackId)}/prompt-update`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ proposal })
      }
    );
    const payload = await readJsonResponse(response, "Не вдалося застосувати правку до prompt.");
    const index = adminState.metricFeedback.findIndex(
      (item) => String(item.id || "") === String(feedbackId)
    );
    if (index >= 0 && payload.feedback) {
      adminState.metricFeedback[index] = payload.feedback;
    }
    renderAdminMetricFeedback();
    setMessage(elements.adminMetricFeedbackMessage, "Prompt метрики оновлено.", "success");
    closeMetricPromptModal();
  } catch (error) {
    setMetricPromptMessage(error.message || "Не вдалося застосувати правку до prompt.");
  } finally {
    metricPromptUpdateState.saving = false;
    setMetricPromptActionState();
  }
}

async function loadAdminTelegramAccounts() {
  if (!isAdminUser()) {
    window.location.href = "/client-card";
    return;
  }

  adminState.telegramLoading = true;
  setMessage(elements.adminTelegramMessage, "", "neutral");
  renderAdminTelegramAccounts();

  try {
    const response = await apiFetch("/api/admin/telegram/accounts");
    const payload = await readJsonResponse(response, "Не вдалося завантажити Telegram акаунти.");
    adminState.telegramAccounts = Array.isArray(payload.accounts) ? payload.accounts : [];
    adminState.telegramConfigured = payload.configured === true;
    adminState.telegramEnabled = payload.enabled === true;
    setMessage(elements.adminTelegramMessage, "", "neutral");
  } catch (error) {
    setMessage(
      elements.adminTelegramMessage,
      telegramFriendlyError(error.message || "Не вдалося завантажити Telegram акаунти.")
    );
  } finally {
    adminState.telegramLoading = false;
    renderAdminTelegramAccounts();
  }
}

async function loadAdminPage(tab = adminState.activeTab || "users") {
  if (!isAdminUser()) {
    window.location.href = "/client-card";
    return;
  }

  adminState.activeTab = tab;
  setState("admin");
  renderAdminChrome();
  await Promise.all([
    loadAdminUsers(),
    loadAdminAnalysisNumbers(),
    loadAdminMetricFeedback(),
    loadAdminTelegramAccounts()
  ]);
  renderAdminChrome();
}

function setAdminTab(tab) {
  adminState.activeTab = ["users", "analysis-numbers", "metric-feedback", "telegram"].includes(tab)
    ? tab
    : "users";
  renderAdminChrome();
}

async function handleAdminTelegramSubmit(event) {
  event.preventDefault();
  const phone = elements.adminTelegramPhone.value.trim();
  if (!adminState.telegramConfigured) {
    setMessage(elements.adminTelegramMessage, "Спочатку увімкніть Telegram User API і додайте TELEGRAM_API_ID/TELEGRAM_API_HASH у .env.");
    return;
  }
  if (!phone || adminState.telegramSaving) {
    return;
  }

  adminState.telegramSaving = true;
  renderAdminTelegramAccounts();
  setMessage(elements.adminTelegramMessage, "Додаємо Telegram акаунт...", "neutral");

  try {
    const response = await apiFetch("/api/admin/telegram/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        label: elements.adminTelegramLabel.value,
        phone
      })
    });
    await readJsonResponse(response, "Не вдалося додати Telegram акаунт.");
    elements.adminTelegramForm.reset();
    setMessage(elements.adminTelegramMessage, "Акаунт додано. Тепер надішліть код.", "success");
    await loadAdminTelegramAccounts();
  } catch (error) {
    setMessage(
      elements.adminTelegramMessage,
      telegramFriendlyError(error.message || "Не вдалося додати Telegram акаунт.")
    );
  } finally {
    adminState.telegramSaving = false;
    renderAdminTelegramAccounts();
  }
}

async function postAdminTelegramAction(accountId, action, body = {}) {
  const response = await apiFetch(
    `/api/admin/telegram/accounts/${encodeURIComponent(accountId)}/${action}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );
  return readJsonResponse(response, "Не вдалося виконати Telegram дію.");
}

async function handleAdminTelegramClick(event) {
  const button = event.target.closest("[data-telegram-action]");
  if (!button || adminState.telegramSaving) {
    return;
  }
  const row = button.closest("[data-telegram-account-id]");
  const accountId = row && row.dataset.telegramAccountId;
  if (!accountId) {
    return;
  }
  const action = button.dataset.telegramAction;
  const account = adminState.telegramAccounts.find((item) => item.id === accountId);

  if (action === "delete") {
    const confirmed = await showUiConfirmDialog({
      title: "Видалити Telegram акаунт?",
      message: "Сесія буде видалена з app-state БД. Для повторного використання треба буде логінитись знову.",
      confirmLabel: "Видалити",
      cancelLabel: "Скасувати",
      tone: "danger",
      anchor: button
    });
    if (!confirmed) {
      return;
    }
  }

  adminState.telegramSaving = true;
  renderAdminTelegramAccounts();

  try {
    if (action === "send-code") {
      setMessage(elements.adminTelegramMessage, "Надсилаємо код Telegram...", "neutral");
      await postAdminTelegramAction(accountId, "send-code");
      setMessage(elements.adminTelegramMessage, "Код надіслано. Введіть його в акаунті.", "success");
    } else if (action === "toggle") {
      const response = await apiFetch(`/api/admin/telegram/accounts/${encodeURIComponent(accountId)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          enabled: account && account.enabled === false
        })
      });
      await readJsonResponse(response, "Не вдалося змінити статус акаунта.");
      setMessage(elements.adminTelegramMessage, "Статус акаунта оновлено.", "success");
    } else if (action === "delete") {
      const response = await apiFetch(`/api/admin/telegram/accounts/${encodeURIComponent(accountId)}`, {
        method: "DELETE"
      });
      await readJsonResponse(response, "Не вдалося видалити Telegram акаунт.");
      setMessage(elements.adminTelegramMessage, "Telegram акаунт видалено.", "success");
    }
    await loadAdminTelegramAccounts();
  } catch (error) {
    setMessage(
      elements.adminTelegramMessage,
      telegramFriendlyError(error.message || "Не вдалося виконати Telegram дію.")
    );
  } finally {
    adminState.telegramSaving = false;
    renderAdminTelegramAccounts();
  }
}

async function handleAdminTelegramConfirm(event) {
  const form = event.target.closest("[data-telegram-confirm-form]");
  if (!form) {
    return;
  }
  event.preventDefault();
  if (adminState.telegramSaving) {
    return;
  }
  const row = form.closest("[data-telegram-account-id]");
  const accountId = row && row.dataset.telegramAccountId;
  if (!accountId) {
    return;
  }
  const code = form.querySelector("[data-telegram-code]")?.value || "";
  const password = form.querySelector("[data-telegram-password]")?.value || "";

  adminState.telegramSaving = true;
  renderAdminTelegramAccounts();
  setMessage(elements.adminTelegramMessage, "Підтверджуємо Telegram логін...", "neutral");

  try {
    const payload = await postAdminTelegramAction(accountId, "confirm", {
      code,
      password
    });
    setMessage(
      elements.adminTelegramMessage,
      payload.passwordRequired
        ? telegramFriendlyError("SESSION_PASSWORD_NEEDED") + " Введіть пароль і підтвердіть ще раз."
        : "Telegram акаунт підключено.",
      payload.passwordRequired ? "neutral" : "success"
    );
    await loadAdminTelegramAccounts();
  } catch (error) {
    setMessage(
      elements.adminTelegramMessage,
      telegramFriendlyError(error.message || "Не вдалося підтвердити Telegram логін.")
    );
  } finally {
    adminState.telegramSaving = false;
    renderAdminTelegramAccounts();
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
  syncCustomSelect(elements.adminUserRole);
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

async function deleteAdminUser(userId, anchor = null) {
  const user = adminUserById(userId);
  if (!user) {
    return;
  }

  const confirmed = await showUiConfirmDialog({
    title: "Видалити користувача?",
    message: `Користувач "${user.name || user.username}" втратить доступ до картки клієнта, дзвінків і налаштувань.`,
    confirmLabel: "Видалити",
    cancelLabel: "Скасувати",
    tone: "danger",
    anchor
  });
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

async function deleteAdminMetricFeedback(feedbackId, anchor = null) {
  const feedback = adminMetricFeedbackById(feedbackId);
  if (!feedback) {
    return;
  }
  const promptUpdate = metricFeedbackPromptUpdate(feedback);
  const confirmed = await showUiConfirmDialog({
    title: "Видалити AI-правку?",
    message: promptUpdate && promptUpdate.appliedAt
      ? "Правка зникне зі списку, але вже застосовані AI-налаштування не будуть відкочені."
      : "Правка зникне з адмінки та з картки відповідного дзвінка.",
    confirmLabel: "Видалити",
    cancelLabel: "Скасувати",
    tone: "danger",
    anchor
  });
  if (!confirmed) {
    return;
  }

  setMessage(elements.adminMetricFeedbackMessage, "Видаляємо AI-правку...", "neutral");
  try {
    const response = await apiFetch(`/api/admin/ai-metric-feedback/${encodeURIComponent(feedbackId)}`, {
      method: "DELETE"
    });
    await readJsonResponse(response, "Не вдалося видалити AI-правку.");
    adminState.metricFeedback = adminState.metricFeedback.filter(
      (item) => String(item.id || "") !== String(feedbackId)
    );
    adminState.metricFeedbackTotal = Math.max(0, Number(adminState.metricFeedbackTotal || 0) - 1);
    renderAdminMetricFeedback();
    setMessage(elements.adminMetricFeedbackMessage, "AI-правку видалено.", "success");
  } catch (error) {
    setMessage(elements.adminMetricFeedbackMessage, error.message || "Не вдалося видалити AI-правку.");
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
    void deleteAdminUser(userId, button);
  }
}

function handleAdminMetricFeedbackClick(event) {
  const button = event.target.closest("[data-admin-feedback-action]");
  if (!button) {
    return;
  }
  if (button.dataset.adminFeedbackAction === "prompt-update") {
    void openMetricPromptModal(button.dataset.feedbackId || "");
  } else if (button.dataset.adminFeedbackAction === "delete") {
    void deleteAdminMetricFeedback(button.dataset.feedbackId || "", button);
  }
}

function handleAdminTabsClick(event) {
  const button = event.target.closest("[data-admin-tab]");
  if (!button) {
    return;
  }
  setAdminTab(button.dataset.adminTab || "users");
}

function handleAdminAnalysisNumbersChange(event) {
  const input = event.target.closest("[data-analysis-number]");
  if (!input) {
    return;
  }
  const number = input.dataset.analysisNumber || "";
  const item = adminState.analysisNumbers.find((entry) => entry.number === number);
  if (!item) {
    return;
  }
  item.enabled = input.checked;
  syncAdminAnalysisNumbersDirty();
  renderAdminAnalysisNumbers();
}

function setAllAdminAnalysisNumbers(enabled) {
  if (!adminState.analysisNumbers.length) {
    return;
  }
  for (const item of adminState.analysisNumbers) {
    item.enabled = Boolean(enabled);
  }
  syncAdminAnalysisNumbersDirty();
  renderAdminAnalysisNumbers();
}

async function saveAdminAnalysisNumbers() {
  if (
    adminState.analysisNumbersLoading ||
    adminState.analysisNumbersSaving ||
    !adminState.analysisNumbersDirty
  ) {
    return;
  }

  adminState.analysisNumbersSaving = true;
  renderAdminAnalysisNumbers();
  setMessage(elements.adminAnalysisNumbersMessage, "Зберігаємо налаштування номерів...", "neutral");

  try {
    const response = await apiFetch("/api/admin/analysis-internal-numbers", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        numbers: adminState.analysisNumbers.map((item) => ({
          number: item.number,
          enabled: item.enabled !== false,
          customLabel: item.customLabel || "",
          notes: item.notes || ""
        }))
      })
    });
    const payload = await readJsonResponse(response, "Не вдалося зберегти внутрішні номери.");
    adminState.analysisNumbers = hydrateAdminAnalysisNumbers(payload.numbers);
    adminState.analysisNumbersDirty = false;
    setMessage(elements.adminAnalysisNumbersMessage, "Налаштування збережено.", "success");
  } catch (error) {
    setMessage(
      elements.adminAnalysisNumbersMessage,
      error.message || "Не вдалося зберегти внутрішні номери."
    );
  } finally {
    adminState.analysisNumbersSaving = false;
    renderAdminAnalysisNumbers();
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
    scrollAiSettingsToStart();
  } else if (aiAction === "back-to-types") {
    aiSettingsState.screen = "list";
    aiSettingsState.selectedCallTypeKey = "";
    aiSettingsState.selectedMetricKey = "";
    renderAiSettings();
    scrollAiSettingsToStart();
  } else if (aiAction === "open-type-settings") {
    openAiTypeModal();
  } else if (aiAction === "toggle-call-type") {
    toggleAiCallType(key);
  } else if (aiAction === "duplicate-call-type") {
    duplicateAiCallType(key);
  } else if (aiAction === "delete-call-type") {
    void deleteAiCallType(key, actionButton);
  } else if (aiAction === "add-metric") {
    addAiMetric();
  } else if (aiAction === "toggle-metric") {
    toggleAiMetric(key);
  } else if (aiAction === "edit-metric") {
    openAiMetricModal(key);
  } else if (aiAction === "delete-metric") {
    void deleteAiMetric(key, actionButton);
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
    case "loading":
      return { label: "Завантажуємо", className: "status-reserved" };
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

function populateMonitorCallTypeFilter() {
  const select = elements.monitorCallTypeFilter;
  if (!select || select.dataset.populated === "true") {
    return;
  }

  const currentValue = select.value;
  for (const [value, label] of Object.entries(CALL_TYPE_LABELS)) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
  select.value = currentValue;
  select.dataset.populated = "true";
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

function routeState(pathname = window.location.pathname) {
  if (/^\/calls\/[^/]+$/.test(pathname)) {
    return "detail";
  }
  if (pathname === "/calls-monitor") {
    return "monitor";
  }
  if (pathname === "/call-stats") {
    return "callStats";
  }
  if (pathname === "/call-analytics") {
    return "analytics";
  }
  if (pathname === "/ai-settings") {
    return "aiSettings";
  }
  if (pathname === "/admin") {
    return "admin";
  }
  return "card";
}

function syncDetailPanelHeights() {
  const grid = document.querySelector(".call-detail-grid");
  if (!grid) {
    return;
  }

  grid.classList.remove("is-peer-height-locked");
  grid.style.removeProperty("--detail-quality-height");

  const aiPanel = grid.querySelector(".call-ai-panel");
  const qualityPanel = grid.querySelector(".call-quality-panel");
  if (!aiPanel || !qualityPanel || window.matchMedia("(max-width: 980px)").matches) {
    return;
  }

  const qualityHeight = Math.ceil(qualityPanel.getBoundingClientRect().height);
  if (qualityHeight > 0) {
    grid.style.setProperty("--detail-quality-height", `${qualityHeight}px`);
    grid.classList.add("is-peer-height-locked");
  }
}

function setState(state) {
  elements.emptyState.classList.toggle("hidden", state !== "empty");
  elements.loadingState.classList.toggle("hidden", state !== "loading");
  elements.clientCard.classList.toggle("hidden", state !== "card");
  elements.monitorPage.classList.toggle("hidden", state !== "monitor");
  elements.callStatsPage.classList.toggle("hidden", state !== "callStats");
  elements.analyticsPage.classList.toggle("hidden", state !== "analytics");
  elements.aiSettingsPage.classList.toggle("hidden", state !== "aiSettings");
  elements.adminPage.classList.toggle("hidden", state !== "admin");
  elements.callDetailPage.classList.toggle("hidden", state !== "detail");

  const titles = {
    empty: "Картка клієнта",
    loading: "Завантаження",
    card: "Картка клієнта",
    monitor: "Дзвінки",
    callStats: "Статистика дзвінків",
    analytics: "AI-аналітика",
    aiSettings: "AI-налаштування",
    admin: "Адмінка",
    detail: "Деталі дзвінка"
  };
  const navState = state === "loading" ? routeState() : state;
  const pageTitle = state === "loading" && titles[navState]
    ? titles[navState]
    : titles[state] || "Картка клієнта";
  if (state !== "detail") {
    document.title = `${pageTitle} | DUMA`;
  }

  for (const link of elements.viewLinks) {
    const view = link.getAttribute("data-view-link");
    const isActive =
      ((navState === "monitor" || navState === "detail") && view === "calls-monitor") ||
        (navState === "callStats" && view === "call-stats") ||
        (navState === "analytics" && view === "call-analytics") ||
        (navState === "aiSettings" && view === "ai-settings") ||
        (navState === "admin" && view === "admin") ||
        (["empty", "card"].includes(navState) && view === "client-card");
    link.classList.toggle("active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }

  if (state !== currentUiState) {
    const surfaceByState = {
      empty: elements.emptyState,
      loading: elements.loadingState,
      card: elements.clientCard,
      monitor: elements.monitorPage,
      callStats: elements.callStatsPage,
      analytics: elements.analyticsPage,
      aiSettings: elements.aiSettingsPage,
      admin: elements.adminPage,
      detail: elements.callDetailPage
    };
    replayMotion(surfaceByState[state]);
    currentUiState = state;
  }

  if (state === "detail") {
    requestAnimationFrame(() => {
      syncDetailPanelHeights();
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
  stageMotionItems(elements.warningStack, ":scope > .warning", { maxIndex: 4 });
}

function renderPassengers(passengers) {
  elements.passengerList.replaceChildren();

  if (!passengers.length) {
    const message = document.createElement("span");
    message.className = "muted";
    message.textContent = "Пасажирів ще не знайдено";
    elements.passengerList.append(message);
    stageMotionItems(elements.passengerList, ":scope > .muted", { maxIndex: 0 });
    return;
  }

  for (const passenger of passengers) {
    const item = document.createElement("span");
    item.className = "passenger";
    item.textContent = passenger;
    elements.passengerList.append(item);
  }
  stageMotionItems(elements.passengerList, ":scope > .passenger", { maxIndex: 5 });
}

function ticketTransferSegments(ticket) {
  return Array.isArray(ticket && ticket.transferSegments)
    ? ticket.transferSegments.filter((segment) => segment && (segment.from || segment.to))
    : [];
}

function transferDisplaySegment(segments, fallbackTicket) {
  const now = Date.now();
  return (
    segments.find((segment) => {
      const departAt = segment.departAt ? new Date(segment.departAt).getTime() : 0;
      const arriveAt = segment.arriveAt ? new Date(segment.arriveAt).getTime() : 0;
      return (
        (departAt && departAt >= now) ||
        (departAt && arriveAt && departAt <= now && arriveAt >= now)
      );
    }) ||
    segments[0] ||
    fallbackTicket
  );
}

function renderStopDetails(stop, fallbackText) {
  const point = String(stop && stop.point || "").trim();
  const address = String(stop && stop.address || "").trim();
  const lines = [];

  if (point) {
    lines.push(point);
  }
  if (address && address.toLowerCase() !== point.toLowerCase()) {
    lines.push(address);
  }

  if (!lines.length) {
    lines.push(fallbackText || "Адреса не вказана");
  }

  return lines.map((line) => `<span>${escapeHtml(line)}</span>`).join("");
}

function sameDateOrderTickets(ticket) {
  if (!ticket || !currentCard || !Array.isArray(currentCard.tickets)) {
    return [];
  }

  const orderId = String(ticket.orderId || "");
  const targetDate = dateKey(ticket.departAt);
  if (!orderId || !targetDate) {
    return [];
  }

  return currentCard.tickets
    .filter(
      (item) =>
        item &&
        String(item.orderId || "") === orderId &&
        dateKey(item.departAt) === targetDate
    )
    .sort((left, right) => {
      const leftTime = new Date(left.departAt || 0).getTime();
      const rightTime = new Date(right.departAt || 0).getTime();
      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }
      return String(left.ticketNumber || "").localeCompare(String(right.ticketNumber || ""));
    });
}

function timestampValue(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function firstTimestampValue(...values) {
  for (const value of values) {
    const time = timestampValue(value);
    if (time) {
      return time;
    }
  }

  return 0;
}

function ticketOrderKey(ticket, fallbackIndex = 0) {
  const orderId = String(ticket && ticket.orderId || "").trim();
  if (orderId) {
    return `order-id:${orderId}`;
  }

  const orderNumber = String(ticket && ticket.orderNumber || "").trim();
  if (orderNumber) {
    return `order-number:${orderNumber}`;
  }

  const ticketNumber = String(ticket && ticket.ticketNumber || "").trim();
  if (ticketNumber) {
    return `ticket:${ticketNumber}`;
  }

  const id = String(ticket && ticket.id || "").trim();
  return id ? `ticket-id:${id}` : `row:${fallbackIndex}`;
}

function ticketOrderRecency(ticket) {
  return firstTimestampValue(
    ticket && ticket.orderSaleDate,
    ticket && ticket.orderCreatedAt,
    ticket && ticket.orderUpdatedAt,
    ticket && ticket.saleDate,
    ticket && ticket.departAt,
    ticket && ticket.arriveAt
  );
}

function ticketDepartSortValue(ticket) {
  const time = timestampValue(ticket && ticket.departAt);
  return time || Number.MAX_SAFE_INTEGER;
}

function sortTicketsForOrderModal(tickets) {
  return [...(Array.isArray(tickets) ? tickets : [])].sort((left, right) => {
    const departDiff = ticketDepartSortValue(left) - ticketDepartSortValue(right);
    if (departDiff) {
      return departDiff;
    }

    return String(left && left.ticketNumber || "").localeCompare(
      String(right && right.ticketNumber || ""),
      "uk",
      { numeric: true }
    );
  });
}

function buildTicketOrderGroups(tickets) {
  const groups = new Map();

  (Array.isArray(tickets) ? tickets : []).forEach((ticket, index) => {
    const key = ticketOrderKey(ticket, index);
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        firstIndex: index,
        sortTime: 0,
        tickets: [],
        anchor: null
      });
    }

    const group = groups.get(key);
    group.tickets.push(ticket);
    group.sortTime = Math.max(group.sortTime, ticketOrderRecency(ticket));
  });

  return [...groups.values()]
    .map((group) => {
      const sortedTickets = sortTicketsForOrderModal(group.tickets);
      const transferAnchor = sortedTickets.find((ticket) => ticketTransferSegments(ticket).length > 1);
      return {
        ...group,
        tickets: sortedTickets,
        anchor: transferAnchor || sortedTickets[0] || group.tickets[0]
      };
    })
    .sort((left, right) => {
      if (right.sortTime !== left.sortTime) {
        return right.sortTime - left.sortTime;
      }

      return left.firstIndex - right.firstIndex;
    });
}

function orderGroupDate(group) {
  return group && group.sortTime ? new Date(group.sortTime).toISOString() : "";
}

function orderGroupAgent(group) {
  const tickets = group && Array.isArray(group.tickets) ? group.tickets : [];
  const values = [
    ...new Set(
      tickets
        .map((ticket) => String(ticket && (ticket.agent || ticket.agentCode) || "").trim())
        .filter(Boolean)
    )
  ];

  if (!values.length) {
    return "Агент не вказаний";
  }

  if (values.length === 1) {
    return values[0];
  }

  return `${values[0]} +${values.length - 1}`;
}

function orderGroupStatus(group) {
  const tickets = group && Array.isArray(group.tickets) ? group.tickets : [];
  const statuses = [
    ...new Set(
      tickets
        .map((ticket) => String(ticket && ticket.status || "").trim())
        .filter(Boolean)
    )
  ];

  if (statuses.length === 1) {
    const sample = tickets.find((ticket) => String(ticket && ticket.status || "").trim() === statuses[0]);
    return statusInfo(sample && sample.status, sample && sample.statusLabel);
  }

  if (statuses.length > 1) {
    return { label: "Змішаний статус", className: "" };
  }

  return { label: "Без статусу", className: "" };
}

function orderGroupTotalParts(group) {
  const tickets = group && Array.isArray(group.tickets) ? group.tickets : [];
  const orderPrice = tickets
    .map((ticket) => ticket && ticket.orderPrice)
    .find((price) => price && Number.isFinite(Number(price.amount)) && Number(price.amount) > 0);

  if (orderPrice) {
    return [{
      amount: Number(orderPrice.amount),
      currency: orderPrice.currency || "UAH"
    }];
  }

  const totals = new Map();
  for (const ticket of tickets) {
    const price = ticket && ticket.price ? ticket.price : {};
    const amount = Number(price.amount);
    if (!Number.isFinite(amount)) {
      continue;
    }

    const currency = price.currency || "UAH";
    totals.set(currency, (totals.get(currency) || 0) + amount);
  }

  return [...totals.entries()].map(([currency, amount]) => ({ currency, amount }));
}

function formatOrderGroupTotal(group) {
  const parts = orderGroupTotalParts(group);
  if (!parts.length) {
    return "—";
  }

  return parts
    .map((part) => formatMoney(part.amount, part.currency))
    .join(" + ");
}

function formatOrderTicketCount(count) {
  const value = Number(count) || 0;
  if (value === 1) {
    return "1 квиток";
  }
  if (value >= 2 && value <= 4) {
    return `${value} квитки`;
  }
  return `${value} квитків`;
}

function orderTicketsFor(ticket, sourceTickets = currentTickets) {
  if (!ticket) {
    return [];
  }

  const orderId = String(ticket.orderId || "").trim();
  const orderNumber = String(ticket.orderNumber || "").trim();
  const ticketNumber = String(ticket.ticketNumber || "").trim();
  const ticketId = String(ticket.id || "").trim();
  const list = Array.isArray(sourceTickets) ? sourceTickets : [];

  return sortTicketsForOrderModal(
    list.filter((item) => {
      if (!item) {
        return false;
      }
      if (orderId) {
        return String(item.orderId || "").trim() === orderId;
      }
      if (orderNumber) {
        return String(item.orderNumber || "").trim() === orderNumber;
      }
      if (ticketNumber) {
        return String(item.ticketNumber || "").trim() === ticketNumber;
      }
      return ticketId && String(item.id || "").trim() === ticketId;
    })
  );
}

function renderTransferSegments(segments, options = {}) {
  if (!segments.length) {
    return "";
  }

  const items = segments
    .map((segment, index) => {
      const from = segment.from || {};
      const to = segment.to || {};
      const fromCity = from.locality || "Звідки не вказано";
      const toCity = to.locality || "Куди не вказано";
      const timeRange = `${formatTime(segment.departAt) || "—"}-${formatTime(segment.arriveAt) || "—"}`;
      const busColor = /^#[0-9a-fA-F]{6}$/.test(String(segment.busColor || ""))
        ? String(segment.busColor)
        : "";
      const busValue = options.busLoading && segment.tripId && !segment.busAssignmentChecked
        ? `<span class="inline-loading"><span class="mini-spinner" aria-hidden="true"></span> Завантажуємо</span>`
        : segment.busNumber
          ? `${busColor ? `<span class="trip-bus-color" style="--bus-color: ${busColor}" aria-hidden="true"></span>` : ""}<span>${escapeHtml(segment.busNumber)}</span>`
          : "Не призначено";

      return `
        <article class="trip-segment-card">
          <div class="trip-segment-head">
            <span>${index + 1}</span>
            <strong>Сегмент ${index + 1}</strong>
          </div>
          <div class="trip-segment-route">
            <div class="trip-segment-place">
              <span>Звідки</span>
              <strong>${escapeHtml(fromCity)}</strong>
              <small>${renderStopDetails(from, "Адреса посадки не вказана")}</small>
            </div>
            <i class="trip-segment-line" aria-hidden="true"></i>
            <div class="trip-segment-place">
              <span>Куди</span>
              <strong>${escapeHtml(toCity)}</strong>
              <small>${renderStopDetails(to, "Адреса прибуття не вказана")}</small>
            </div>
          </div>
          <div class="trip-segment-meta">
            <div><b>Дата</b>${escapeHtml(formatDate(segment.departAt, { short: true }))}</div>
            <div><b>Час</b>${escapeHtml(timeRange)}</div>
            ${segment.ticketNumber ? `<div><b>Квиток</b>${escapeHtml(segment.ticketNumber)}</div>` : ""}
            ${segment.seat ? `<div><b>Місце</b>${escapeHtml(segment.seat)}</div>` : ""}
            <div><b>Автобус</b><em>${busValue}</em></div>
          </div>
          ${segment.routeCode ? `<p class="trip-segment-note">${escapeHtml(segment.routeCode)}</p>` : ""}
        </article>
      `;
    })
    .join("");

  return `
    <section class="trip-segments">
      <div class="trip-subsection-title">
        <span>Сегменти маршруту</span>
        <strong>${segments.length} частини</strong>
      </div>
      <div class="trip-segment-grid">
        ${items}
      </div>
    </section>
  `;
}

function renderUpcoming(ticket, options = {}) {
  elements.upcomingSection.classList.toggle("hidden", !ticket);
  if (!ticket) {
    return;
  }

  const info = statusInfo(ticket.status, ticket.statusLabel);
  const transferSegments = ticketTransferSegments(ticket);
  const hasTransfer = transferSegments.length > 1;
  const displaySegment = transferDisplaySegment(transferSegments, ticket);
  const routeStartSegment = hasTransfer ? transferSegments[0] : ticket;
  const routeEndSegment = hasTransfer ? transferSegments[transferSegments.length - 1] : ticket;
  const from = (routeStartSegment && routeStartSegment.from) || ticket.from || {};
  const to = (routeEndSegment && routeEndSegment.to) || ticket.to || {};
  const scheduleTicket = displaySegment || ticket;
  const fromCity = from.locality || "Звідки не вказано";
  const toCity = to.locality || "Куди не вказано";
  const departDate = formatDate(scheduleTicket.departAt, { short: true });
  const departTime = formatTime(scheduleTicket.departAt) || "—";
  const arriveTime = formatTime(scheduleTicket.arriveAt) || "—";
  const agent = ticket.agent || ticket.agentCode || "Агент не вказаний";
  const price = ticket.price || {};
  const busLoading = Boolean(
    options.busLoading &&
    (ticket.tripId || transferSegments.some((segment) => segment && segment.tripId))
  );
  const busDetails =
    ticket.busNumber ||
    (ticket.busAssignmentChecked || ticket.tripId ? "Не призначено" : "");
  const busColor = /^#[0-9a-fA-F]{6}$/.test(String(ticket.busColor || ""))
    ? String(ticket.busColor)
    : "";
  const busValue = busLoading
    ? `<span class="inline-loading"><span class="mini-spinner" aria-hidden="true"></span> Завантажуємо</span>`
    : busDetails
      ? `<span class="trip-bus-value">${busColor ? `<span class="trip-bus-color" style="--bus-color: ${busColor}" aria-hidden="true"></span>` : ""}<span>${escapeHtml(busDetails)}</span></span>`
      : "";
  const orderDetails = ticket.orderNumber || "Не вказано";
  const ticketDetails = ticket.ticketNumber || "Не вказано";
  const passengerDetails = [
    ticket.passenger || "Пасажир не вказаний",
    ticket.seat ? `місце ${ticket.seat}` : ""
  ].filter(Boolean).join(" · ");
  const showGeneralBus = Boolean(!hasTransfer && busValue);
  const relatedTickets = sameDateOrderTickets(ticket);
  const extraTicketCount = Math.max(0, relatedTickets.length - 1);

  elements.upcomingStatus.className = `status ${info.className}`;
  elements.upcomingStatus.textContent = info.label;
  elements.upcomingTrip.innerHTML = `
    <div class="trip-card">
      <div class="trip-hero">
        <div class="trip-route">
          <div class="trip-place trip-place-from">
            <span>Звідки</span>
            <strong>${escapeHtml(fromCity)}</strong>
            <small>${renderStopDetails(from, "Адреса посадки не вказана")}</small>
          </div>
          <div class="trip-route-connector">
            <span class="trip-route-line" aria-hidden="true"></span>
          </div>
          <div class="trip-place trip-place-to">
            <span>Куди</span>
            <strong>${escapeHtml(toCity)}</strong>
            <small>${renderStopDetails(to, "Адреса прибуття не вказана")}</small>
          </div>
        </div>
        <div class="trip-departure">
          <span>Відправлення</span>
          <strong>${escapeHtml(departDate)}</strong>
          <b>${escapeHtml(departTime)}</b>
          <small>прибуття ${escapeHtml(arriveTime)}</small>
        </div>
      </div>
      ${hasTransfer ? renderTransferSegments(transferSegments, { busLoading }) : ""}
      <section class="trip-general">
        <div class="trip-subsection-title">
          <span>Загальна інформація</span>
          ${extraTicketCount ? `
            <button class="trip-related-button" type="button" data-action="show-related-tickets">
              Показати ще квитки (${extraTicketCount})
            </button>
          ` : ""}
        </div>
        <dl class="trip-info">
          <div class="trip-info-item trip-info-passenger">
            <dt>Пасажир</dt>
            <dd>${escapeHtml(passengerDetails)}</dd>
          </div>
          <div class="trip-info-item trip-info-agent">
            <dt>Агент</dt>
            <dd>${escapeHtml(agent)}</dd>
          </div>
          ${showGeneralBus ? `
            <div class="trip-info-item trip-info-bus">
              <dt>Автобус</dt>
              <dd>${busValue}</dd>
            </div>
          ` : ""}
          <div class="trip-info-item trip-info-price">
            <dt>Ціна</dt>
            <dd>${escapeHtml(formatMoney(price.amount, price.currency))}</dd>
          </div>
          <div class="trip-info-item trip-info-order">
            <dt>Замовлення</dt>
            <dd>${escapeHtml(orderDetails)}</dd>
          </div>
          <div class="trip-info-item trip-info-ticket">
            <dt>Квиток</dt>
            <dd>${escapeHtml(ticketDetails)}</dd>
          </div>
        </dl>
      </section>
    </div>
  `;

  const relatedButton = elements.upcomingTrip.querySelector('[data-action="show-related-tickets"]');
  if (relatedButton) {
    relatedButton.addEventListener("click", () => {
      openRelatedTicketsModal(relatedTickets, ticket);
    });
  }
  stageMotionItems(elements.upcomingTrip, ":scope > .trip-card", { maxIndex: 0 });
  stageMotionItems(elements.upcomingTrip, ".trip-segment-card, .trip-info-item", { maxIndex: 6 });
}

function renderTickets(tickets) {
  elements.ticketList.replaceChildren();
  currentTickets = Array.isArray(tickets) ? tickets : [];
  const orderGroups = buildTicketOrderGroups(currentTickets);
  elements.ticketCountLabel.textContent = orderGroups.length
    ? `${orderGroups.length} замовлень`
    : "0 замовлень";

  if (!orderGroups.length) {
    const message = document.createElement("p");
    message.className = "no-data";
    message.textContent = "За цим номером замовлень не знайдено.";
    elements.ticketList.append(message);
    stageMotionItems(elements.ticketList, ":scope > .no-data", { maxIndex: 0 });
    return;
  }

  for (const group of orderGroups.slice(0, RECENT_ORDERS_PREVIEW_LIMIT)) {
    appendOrderGroup(elements.ticketList, group);
  }

  if (orderGroups.length > RECENT_ORDERS_PREVIEW_LIMIT) {
    const action = document.createElement("div");
    action.className = "tickets-action";
    const button = document.createElement("button");
    button.className = "secondary-button show-all-tickets";
    button.type = "button";
    button.textContent = `Показати всі замовлення (${orderGroups.length})`;
    button.addEventListener("click", () => openOrderGroupsModal(orderGroups));
    action.append(button);
    elements.ticketList.append(action);
  }
  stageMotionItems(elements.ticketList, ":scope > .order-row, :scope > .tickets-action", { maxIndex: 4 });
}

function appendOrderGroup(container, group) {
  const ticket = group && group.anchor;
  const tickets = group && Array.isArray(group.tickets) ? group.tickets : [];
  if (!ticket) {
    return;
  }

  const orderNumber = ticket.orderNumber || ticket.orderId || "без номера";
  const dateValue = orderGroupDate(group);
  const status = orderGroupStatus(group);
  const article = document.createElement("article");
  article.className = "order-row";
  article.tabIndex = 0;
  article.setAttribute("role", "button");
  article.setAttribute("aria-label", `Відкрити замовлення ${orderNumber}`);
  article.addEventListener("click", () => {
    openOrderTicketsModal(ticket, tickets.length ? tickets : [ticket]);
  });
  article.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openOrderTicketsModal(ticket, tickets.length ? tickets : [ticket]);
  });

  const date = document.createElement("div");
  date.className = "order-date";
  const dateStrong = document.createElement("strong");
  dateStrong.textContent = formatDate(dateValue, { short: true });
  const dateSpan = document.createElement("span");
  dateSpan.textContent = formatTime(dateValue) || "замовлення";
  date.append(dateStrong, dateSpan);

  const main = document.createElement("div");
  main.className = "order-main";

  const title = document.createElement("div");
  title.className = "ticket-route order-title";
  const titleStrong = document.createElement("strong");
  titleStrong.textContent = `Замовлення ${orderNumber}`;
  const statusElement = document.createElement("span");
  statusElement.className = `status ${status.className}`;
  statusElement.textContent = status.label;
  title.append(titleStrong, statusElement);

  const caption = document.createElement("p");
  caption.className = "order-caption";
  caption.textContent = formatOrderTicketCount(tickets.length || 1);

  const headline = document.createElement("div");
  headline.className = "order-headline";
  headline.append(title);

  const infoGrid = document.createElement("div");
  infoGrid.className = "order-info-grid";
  const appendInfo = (label, value) => {
    if (!value) {
      return;
    }
    const item = document.createElement("div");
    item.className = "order-info-item";
    const itemLabel = document.createElement("span");
    itemLabel.textContent = label;
    const itemValue = document.createElement("strong");
    itemValue.textContent = value;
    item.append(itemLabel, itemValue);
    infoGrid.append(item);
  };

  appendInfo("Агент", orderGroupAgent(group));
  appendInfo("Квитків", formatOrderTicketCount(tickets.length || 1));
  appendInfo("Створено", ticket.orderCreatedAt ? formatDateTime(ticket.orderCreatedAt) : "");
  appendInfo("Продаж", ticket.orderSaleDate ? formatDateTime(ticket.orderSaleDate) : "");

  main.append(headline, caption);

  const price = document.createElement("div");
  price.className = "order-price";
  const priceStrong = document.createElement("strong");
  priceStrong.textContent = formatOrderGroupTotal(group);
  const priceLabel = document.createElement("span");
  priceLabel.textContent = "Сума замовлення";
  price.append(priceStrong, priceLabel);

  const topRow = document.createElement("div");
  topRow.className = "order-row-main";
  topRow.append(date, main, price);

  article.append(topRow, infoGrid);
  container.append(article);
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
  stageMotionItems(elements.detailTicketList, ":scope > .no-data", { maxIndex: 0 });
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
    appendTicket(elements.detailTicketList, ticket, { ticketSource: currentDetailTickets });
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
  stageMotionItems(elements.detailTicketList, ":scope > .ticket-row, :scope > .tickets-action", { maxIndex: 5 });
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

function appendTicket(container, ticket, options = {}) {
  const fragment = elements.ticketTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".ticket-row");
  const status = statusInfo(ticket.status, ticket.statusLabel);
  const transferSegments = ticketTransferSegments(ticket);
  const hasTransfer = transferSegments.length > 1;
  const routeStartSegment = hasTransfer ? transferSegments[0] : ticket;
  const routeEndSegment = hasTransfer ? transferSegments[transferSegments.length - 1] : ticket;
  const routeFrom = (routeStartSegment && routeStartSegment.from) || ticket.from || {};
  const routeTo = (routeEndSegment && routeEndSegment.to) || ticket.to || {};
  const route = [routeFrom.locality, routeTo.locality].filter(Boolean).join(" → ");
  const fromPoint = [ticket.from.point, ticket.from.locality]
    .filter(Boolean)
    .join(", ");
  const toPoint = [ticket.to.point, ticket.to.locality]
    .filter(Boolean)
    .join(", ");
  const stations = [fromPoint || ticket.from.locality, toPoint || ticket.to.locality]
    .filter(Boolean)
    .join(" → ");
  const transferLegIndex = Number(ticket.transferLegIndex || 0);
  const transferPrefix = hasTransfer
    ? `Пересадка ${transferLegIndex || "?"}/${transferSegments.length} · `
    : "";

  row.classList.toggle("is-transfer", hasTransfer);
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
    `${transferPrefix}Рейс: ${ticket.routeCode || "—"}`;
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
  const orderTickets = options.orderTickets && options.orderTickets.length
    ? sortTicketsForOrderModal(options.orderTickets)
    : orderTicketsFor(ticket, options.ticketSource || currentTickets);
  const ticketCount = Number(options.orderTicketCount || orderTickets.length || 1);
  orderLink.textContent = ticketCount > 1
    ? `Відкрити замовлення (${ticketCount})`
    : "Відкрити замовлення";
  orderLink.addEventListener("click", () => {
    openOrderTicketsModal(ticket, orderTickets.length ? orderTickets : [ticket]);
  });

  container.append(fragment);
}

function ticketModalRouteData(ticket) {
  const transferSegments = ticketTransferSegments(ticket);
  const hasTransfer = transferSegments.length > 1;
  const routeStartSegment = hasTransfer ? transferSegments[0] : ticket;
  const routeEndSegment = hasTransfer ? transferSegments[transferSegments.length - 1] : ticket;
  const displaySegment = hasTransfer ? transferDisplaySegment(transferSegments, ticket) : ticket;
  const from = (routeStartSegment && routeStartSegment.from) || ticket.from || {};
  const to = (routeEndSegment && routeEndSegment.to) || ticket.to || {};
  const fromCity = from.locality || "Звідки не вказано";
  const toCity = to.locality || "Куди не вказано";
  const transferCity = hasTransfer && transferSegments[0] && transferSegments[0].to
    ? transferSegments[0].to.locality
    : "";

  return {
    transferSegments,
    hasTransfer,
    displaySegment: displaySegment || ticket,
    from,
    to,
    fromCity,
    toCity,
    transferCity
  };
}

function renderModalTicketSegments(segments) {
  if (!segments.length) {
    return "";
  }

  const items = segments
    .map((segment, index) => {
      const from = segment.from || {};
      const to = segment.to || {};
      const busColor = /^#[0-9a-fA-F]{6}$/.test(String(segment.busColor || ""))
        ? String(segment.busColor)
        : "";
      const busValue = segment.busNumber
        ? `${busColor ? `<span class="trip-bus-color" style="--bus-color: ${busColor}" aria-hidden="true"></span>` : ""}<span>${escapeHtml(segment.busNumber)}</span>`
        : "Не призначено";

      return `
        <article class="modal-ticket-segment">
          <div class="modal-ticket-segment-route">
            <span>${index + 1}</span>
            <strong>${escapeHtml(from.locality || "Звідки")} → ${escapeHtml(to.locality || "Куди")}</strong>
          </div>
          <div class="modal-ticket-segment-meta">
            <span>${escapeHtml(formatDate(segment.departAt, { short: true }))}</span>
            <span>${escapeHtml(formatTime(segment.departAt) || "—")}-${escapeHtml(formatTime(segment.arriveAt) || "—")}</span>
            ${segment.ticketNumber ? `<span>кв. ${escapeHtml(segment.ticketNumber)}</span>` : ""}
            ${segment.seat ? `<span>місце ${escapeHtml(segment.seat)}</span>` : ""}
            <span class="trip-bus-value">${busValue}</span>
          </div>
        </article>
      `;
    })
    .join("");

  return `
    <section class="modal-ticket-segments">
      <div class="modal-ticket-section-title">
        <span>Сегменти маршруту</span>
        <strong>${segments.length} частини</strong>
      </div>
      <div class="modal-ticket-segment-list">${items}</div>
    </section>
  `;
}

function appendModalTicket(container, ticket) {
  const status = statusInfo(ticket.status, ticket.statusLabel);
  const price = ticket.price || {};
  const routeData = ticketModalRouteData(ticket);
  const scheduleTicket = routeData.displaySegment;
  const agent = ticket.agent || ticket.agentCode || "Агент не вказаний";
  const passenger = ticket.passenger || "Пасажир не вказаний";
  const seat = ticket.seat ? `місце ${ticket.seat}` : "без місця";
  const orderNumber = ticket.orderNumber || "Не вказано";
  const ticketNumber = ticket.ticketNumber || "Не вказано";
  const carrier = ticket.carrier || "Перевізник не вказаний";
  const routeCode = ticket.routeCode || "";
  const busColor = /^#[0-9a-fA-F]{6}$/.test(String(ticket.busColor || ""))
    ? String(ticket.busColor)
    : "";
  const busValue = ticket.busNumber
    ? `${busColor ? `<span class="trip-bus-color" style="--bus-color: ${busColor}" aria-hidden="true"></span>` : ""}<span>${escapeHtml(ticket.busNumber)}</span>`
    : ticket.busAssignmentChecked || ticket.tripId
      ? "Не призначено"
      : "";
  const article = document.createElement("article");

  article.className = `modal-ticket-card${routeData.hasTransfer ? " is-transfer" : ""}`;
  article.innerHTML = `
    <div class="modal-ticket-card-head">
      <div class="modal-ticket-title">
        ${routeData.hasTransfer ? `
          <span class="modal-ticket-transfer">
            Квиток з пересадкою${routeData.transferCity ? ` · через ${escapeHtml(routeData.transferCity)}` : ""}
          </span>
        ` : ""}
        <strong>${escapeHtml(routeData.fromCity)} → ${escapeHtml(routeData.toCity)}</strong>
      </div>
      <div class="modal-ticket-badges">
        <span class="status ${status.className}">${escapeHtml(status.label)}</span>
        <strong>${escapeHtml(formatMoney(price.amount, price.currency))}</strong>
      </div>
    </div>

    <div class="trip-hero modal-ticket-hero">
      <div class="trip-route modal-ticket-route">
        <div class="trip-place trip-place-from">
          <span>Звідки</span>
          <strong>${escapeHtml(routeData.fromCity)}</strong>
          <small>${renderStopDetails(routeData.from, "Адреса посадки не вказана")}</small>
        </div>
        <div class="trip-route-connector">
          <span class="trip-route-line" aria-hidden="true"></span>
        </div>
        <div class="trip-place trip-place-to">
          <span>Куди</span>
          <strong>${escapeHtml(routeData.toCity)}</strong>
          <small>${renderStopDetails(routeData.to, "Адреса прибуття не вказана")}</small>
        </div>
      </div>
      <div class="trip-departure modal-ticket-departure">
        <span>Відправлення</span>
        <strong>${escapeHtml(formatDate(scheduleTicket.departAt, { short: true }))}</strong>
        <b>${escapeHtml(formatTime(scheduleTicket.departAt) || "—")}</b>
        <small>прибуття ${escapeHtml(formatTime(scheduleTicket.arriveAt) || "—")}</small>
      </div>
    </div>

    ${routeData.hasTransfer ? renderModalTicketSegments(routeData.transferSegments) : ""}

    <section class="modal-ticket-section">
      <div class="modal-ticket-section-title">
        <span>Інформація квитка</span>
      </div>
      <dl class="trip-info modal-ticket-info">
        <div class="trip-info-item trip-info-passenger">
          <dt>Пасажир</dt>
          <dd>${escapeHtml(`${passenger} · ${seat}`)}</dd>
        </div>
        <div class="trip-info-item trip-info-agent">
          <dt>Агент</dt>
          <dd>${escapeHtml(agent)}</dd>
        </div>
        <div class="trip-info-item trip-info-price">
          <dt>Замовлення</dt>
          <dd>${escapeHtml(orderNumber)}</dd>
        </div>
        <div class="trip-info-item trip-info-ticket">
          <dt>Квиток</dt>
          <dd>${escapeHtml(ticketNumber)}</dd>
        </div>
        ${busValue && !routeData.hasTransfer ? `
          <div class="trip-info-item trip-info-bus">
            <dt>Автобус</dt>
            <dd>${typeof busValue === "string" && busValue.includes("<") ? busValue : escapeHtml(busValue)}</dd>
          </div>
        ` : ""}
        <div class="trip-info-item modal-ticket-carrier">
          <dt>Перевізник</dt>
          <dd>${escapeHtml(carrier)}</dd>
        </div>
        ${routeCode ? `
          <div class="trip-info-item modal-ticket-route-code">
            <dt>Рейс</dt>
            <dd>${escapeHtml(routeCode)}</dd>
          </div>
        ` : ""}
      </dl>
    </section>
  `;

  container.append(article);
}

function setTicketsModalTitle(title) {
  if (elements.ticketsModalTitle) {
    elements.ticketsModalTitle.textContent = title || "Усі квитки клієнта";
  }
}

function renderTicketsModal(tickets = currentTickets) {
  elements.ticketsModalList.replaceChildren();
  elements.ticketsModalList.classList.remove("order-list");
  elements.ticketsModalList.style.display = "";

  const list = Array.isArray(tickets) ? tickets : [];
  if (!list.length) {
    const message = document.createElement("p");
    message.className = "no-data";
    message.textContent = "Квитків для показу немає.";
    elements.ticketsModalList.append(message);
    stageMotionItems(elements.ticketsModalList, ":scope > .no-data", { maxIndex: 0 });
    return;
  }

  for (const ticket of list) {
    appendModalTicket(elements.ticketsModalList, ticket);
  }
  stageMotionItems(elements.ticketsModalList, ":scope > .modal-ticket-card", { maxIndex: 7 });
}

function renderOrderGroupsModal(orderGroups = buildTicketOrderGroups(currentTickets)) {
  elements.ticketsModalList.replaceChildren();
  elements.ticketsModalList.classList.add("order-list");
  elements.ticketsModalList.style.display = "block";

  const groups = Array.isArray(orderGroups) ? orderGroups : [];
  ticketsModalOrderGroups = groups;
  if (!groups.length) {
    const message = document.createElement("p");
    message.className = "no-data";
    message.textContent = "Замовлень для показу немає.";
    elements.ticketsModalList.append(message);
    stageMotionItems(elements.ticketsModalList, ":scope > .no-data", { maxIndex: 0 });
    return;
  }

  for (const group of groups) {
    appendOrderGroup(elements.ticketsModalList, group);
  }
  stageMotionItems(elements.ticketsModalList, ":scope > .order-row", { maxIndex: 7 });
}

function showTicketsModalDialog() {
  if (elements.ticketsModal.open) {
    return;
  }

  if (typeof elements.ticketsModal.showModal === "function") {
    elements.ticketsModal.showModal();
    return;
  }

  elements.ticketsModal.setAttribute("open", "");
}

function openTicketsModal() {
  ticketsModalBackView = null;
  setTicketsModalTitle("Усі квитки клієнта");
  renderTicketsModal(currentTickets);
  showTicketsModalDialog();
}

function openOrderTicketsModal(sourceTicket, tickets = []) {
  const shouldReturnToOrderGroups =
    elements.ticketsModal.open &&
    elements.ticketsModalList.classList.contains("order-list");
  const list = tickets && tickets.length
    ? sortTicketsForOrderModal(tickets)
    : orderTicketsFor(sourceTicket, currentTickets);
  const orderNumber = sourceTicket && sourceTicket.orderNumber
    ? ` ${sourceTicket.orderNumber}`
    : "";
  const title = orderNumber
    ? `Квитки замовлення${orderNumber}`
    : "Квитки замовлення";

  if (shouldReturnToOrderGroups) {
    ticketsModalBackView = {
      type: "order-groups",
      orderGroups: ticketsModalOrderGroups.slice()
    };
  } else if (!elements.ticketsModal.open) {
    ticketsModalBackView = null;
  }

  setTicketsModalTitle(title);
  renderTicketsModal(list.length ? list : [sourceTicket].filter(Boolean));
  showTicketsModalDialog();
}

function openOrderGroupsModal(orderGroups = buildTicketOrderGroups(currentTickets)) {
  ticketsModalBackView = null;
  setTicketsModalTitle("Усі замовлення клієнта");
  renderOrderGroupsModal(orderGroups);
  showTicketsModalDialog();
}

function openRelatedTicketsModal(tickets, sourceTicket) {
  ticketsModalBackView = null;
  const orderNumber = sourceTicket && sourceTicket.orderNumber
    ? `замовлення ${sourceTicket.orderNumber}`
    : "цього замовлення";
  const dateLabel = sourceTicket && sourceTicket.departAt
    ? ` на ${formatDate(sourceTicket.departAt, { short: true })}`
    : "";

  setTicketsModalTitle(`Квитки ${orderNumber}${dateLabel}`);
  renderTicketsModal(tickets);
  showTicketsModalDialog();
}

function restoreTicketsModalBackView() {
  if (!ticketsModalBackView || ticketsModalBackView.type !== "order-groups") {
    return false;
  }

  const orderGroups = Array.isArray(ticketsModalBackView.orderGroups)
    ? ticketsModalBackView.orderGroups
    : [];
  ticketsModalBackView = null;
  setTicketsModalTitle("Усі замовлення клієнта");
  renderOrderGroupsModal(orderGroups);
  return true;
}

function closeTicketsModal() {
  if (restoreTicketsModalBackView()) {
    return;
  }

  ticketsModalBackView = null;
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
    stageMotionItems(elements.callList, ":scope > .no-data", { maxIndex: 0 });
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
  stageMotionItems(elements.callList, ":scope > .call-row, :scope > .tickets-action", { maxIndex: 7 });
}

function renderCallsLoading() {
  currentCalls = [];
  elements.callList.replaceChildren();
  elements.callCountLabel.textContent = "Завантаження...";
  const message = document.createElement("p");
  message.className = "no-data async-loading";
  message.innerHTML = `<span class="mini-spinner" aria-hidden="true"></span> Завантажуємо дзвінки Binotel...`;
  elements.callList.append(message);
  stageMotionItems(elements.callList, ":scope > .no-data", { maxIndex: 0 });
}

function renderCallsError(messageText) {
  currentCalls = [];
  elements.callList.replaceChildren();
  elements.callCountLabel.textContent = "";
  const message = document.createElement("p");
  message.className = "no-data";
  message.textContent = messageText || "Не вдалося завантажити дзвінки Binotel.";
  elements.callList.append(message);
  stageMotionItems(elements.callList, ":scope > .no-data", { maxIndex: 0 });
}

function telegramSetMessage(message, tone = "") {
  if (!elements.telegramMessageStatus) {
    return;
  }
  elements.telegramMessageStatus.textContent = telegramFriendlyError(message) || "";
  if (tone) {
    elements.telegramMessageStatus.dataset.tone = tone;
  } else {
    delete elements.telegramMessageStatus.dataset.tone;
  }
}

function telegramFriendlyError(message) {
  const raw = String(message || "").trim();
  if (!raw) {
    return "";
  }
  const normalized = raw.toLowerCase();
  if (normalized.includes("telegram_not_configured")) {
    return "Telegram User API ще не налаштований.";
  }
  if (normalized.includes("telegram_phone_invalid") || normalized.includes("phone_number_invalid")) {
    return "Некоректний номер телефону для Telegram.";
  }
  if (normalized.includes("telegram_account_not_connected")) {
    return "Telegram акаунт ще не підключений.";
  }
  if (
    normalized.includes("auth_key_unregistered") ||
    normalized.includes("auth_key_invalid") ||
    normalized.includes("auth_key_duplicated") ||
    normalized.includes("session_revoked") ||
    normalized.includes("session_expired") ||
    normalized.includes("unauthorized") ||
    normalized.includes("not authorized")
  ) {
    return "Telegram-сесія акаунта застаріла. Перелогіньте цей акаунт в адмінці.";
  }
  if (normalized.includes("telegram_contact_not_found")) {
    return "Контакт з таким номером не знайдено в Telegram.";
  }
  if (normalized.includes("phone_code_invalid")) {
    return "Невірний Telegram-код.";
  }
  if (normalized.includes("phone_code_expired")) {
    return "Telegram-код застарів. Надішліть код ще раз.";
  }
  if (normalized.includes("session_password_needed")) {
    return "Telegram просить 2FA пароль.";
  }
  if (normalized.includes("password_hash_invalid") || normalized.includes("auth_user_cancel")) {
    return "Невірний 2FA пароль Telegram.";
  }
  if (normalized.includes("flood_wait")) {
    const seconds = raw.match(/\d+/)?.[0];
    return seconds
      ? `Telegram просить зачекати ${seconds} с перед наступною дією.`
      : "Telegram тимчасово обмежив частоту запитів.";
  }
  if (normalized.includes("timeout") || normalized.includes("timed out")) {
    return "Telegram тимчасово не відповідає. Показуємо кеш, якщо він є.";
  }
  return raw;
}

function setTelegramComposeEnabled(enabled) {
  if (elements.telegramMessage) {
    elements.telegramMessage.disabled = !enabled;
  }
  if (elements.telegramSend) {
    elements.telegramSend.disabled = !enabled;
  }
}

function currentTelegramPhone() {
  return currentCard && currentCard.contact
    ? currentCard.contact.phoneDigits || currentCard.contact.phone || currentPhone
    : currentPhone;
}

function telegramMessageSummary(message) {
  if (!message) {
    return "повідомлення";
  }
  const textValue = String(message.text || "").trim();
  if (textValue) {
    return textValue.length > 90 ? `${textValue.slice(0, 87)}...` : textValue;
  }
  if (message.media && message.media.label) {
    return message.media.label;
  }
  if (message.mediaLabel) {
    return message.mediaLabel;
  }
  return "повідомлення";
}

function updateTelegramReplyBar() {
  if (!elements.telegramReplyBar) {
    return;
  }
  if (!telegramReplyTarget) {
    elements.telegramReplyBar.classList.add("hidden");
    if (elements.telegramReplyTitle) {
      elements.telegramReplyTitle.textContent = "";
    }
    return;
  }
  elements.telegramReplyTitle.textContent = telegramMessageSummary(telegramReplyTarget);
  elements.telegramReplyBar.classList.remove("hidden");
}

function setTelegramReplyTarget(message) {
  telegramReplyTarget = message && message.id ? message : null;
  updateTelegramReplyBar();
  elements.telegramMessage?.focus();
}

function clearTelegramReplyTarget() {
  telegramReplyTarget = null;
  updateTelegramReplyBar();
}

function telegramAccountName(match) {
  const account = (match && match.account) || {};
  return account.displayName || account.label || account.phone || "Telegram акаунт";
}

function telegramAccountStatus(match) {
  if (!match) {
    return { label: "Не завантажено", tone: "muted" };
  }
  if (match.cached) {
    return { label: "Кеш", tone: "neutral" };
  }
  if (match.error) {
    return { label: "Помилка", tone: "error" };
  }
  if (match.found) {
    return { label: "Знайдено", tone: "success" };
  }
  return { label: "Не знайдено", tone: "muted" };
}

function setTelegramAccountDropdownOpen(open) {
  telegramAccountDropdownOpen = Boolean(open);
  elements.telegramAccountDropdown?.classList.toggle("is-open", telegramAccountDropdownOpen);
  elements.telegramAccountMenu?.classList.toggle("hidden", !telegramAccountDropdownOpen);
  elements.telegramAccountTrigger?.setAttribute(
    "aria-expanded",
    String(telegramAccountDropdownOpen)
  );
}

function clearTelegramAccountDropdown() {
  setTelegramAccountDropdownOpen(false);
  elements.telegramAccountMenu?.replaceChildren();
  if (elements.telegramAccountLabel) {
    elements.telegramAccountLabel.textContent = "Telegram";
  }
  if (elements.telegramAccountStatus) {
    elements.telegramAccountStatus.textContent = "Не завантажено";
    elements.telegramAccountStatus.className = "";
  }
  if (elements.telegramAccountTrigger) {
    elements.telegramAccountTrigger.disabled = true;
  }
}

function telegramContactInitials(value) {
  const source = String(value || "TG").trim();
  const letters = source
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2);
  return (letters || "TG").toUpperCase();
}

function renderTelegramThread(match, options = {}) {
  if (!elements.telegramThread) {
    return;
  }
  elements.telegramThread.replaceChildren();

  if (!match && !options.title) {
    elements.telegramThread.classList.add("hidden");
    return;
  }

  const contact = (match && match.contact) || {};
  const title = options.title || contact.displayName || contact.phone || currentPhone || "Telegram";
  const subtitle = options.subtitle || [
    contact.username ? `@${contact.username}` : "",
    contact.phone || ""
  ].filter(Boolean).join(" · ");
  const status = options.status || (
    match && match.cached
      ? "Кеш"
      : match && match.found
        ? "Чат знайдено"
        : "Не знайдено"
  );

  const avatar = document.createElement("span");
  avatar.className = "telegram-thread-avatar";
  avatar.textContent = telegramContactInitials(title);

  const main = document.createElement("div");
  main.className = "telegram-thread-main";
  const name = document.createElement("strong");
  name.textContent = title;
  const meta = document.createElement("span");
  meta.textContent = subtitle || "Telegram";
  main.append(name, meta);

  const badge = document.createElement("span");
  badge.className = `telegram-thread-status ${options.tone ? `is-${options.tone}` : ""}`;
  badge.textContent = status;

  elements.telegramThread.append(avatar, main, badge);
  elements.telegramThread.classList.remove("hidden");
}

function renderTelegramEmpty(message, options = {}) {
  currentTelegram = options.keepState ? currentTelegram : null;
  if (!options.keepState) {
    clearTelegramReplyTarget();
  }
  if (!elements.telegramChat) {
    return;
  }
  elements.telegramChat.replaceChildren();
  const empty = document.createElement("div");
  empty.className = `telegram-empty${options.loading ? " async-loading" : ""}`;
  empty.innerHTML = options.loading
    ? `<span class="mini-spinner" aria-hidden="true"></span> ${escapeHtml(message)}`
    : escapeHtml(message);
  elements.telegramChat.append(empty);
  stageMotionItems(elements.telegramChat, ":scope > .telegram-empty", { maxIndex: 0 });
  clearTelegramAccountDropdown();
  elements.telegramRefresh.disabled = options.loading === true || !currentPhone;
  renderTelegramThread(null, options.loading
    ? {
        title: "Telegram",
        subtitle: currentPhone ? formatPhone(currentPhone) : "",
        status: "Пошук",
        tone: "neutral"
      }
    : {});
  setTelegramComposeEnabled(false);
}

function renderTelegramLoading() {
  renderTelegramEmpty("Шукаємо переписку в Telegram...", {
    loading: true,
    keepState: true
  });
}

function telegramAccountLabel(match) {
  const account = (match && match.account) || match || {};
  const status = telegramAccountStatus(match).label.toLowerCase();
  return `${account.displayName || account.label || account.phone || "Telegram"} · ${status}`;
}

function renderTelegramAccountSelect(payload) {
  const matches = Array.isArray(payload.matches) ? payload.matches : [];
  const selected = payload.selectedAccountId || (matches[0] && matches[0].account && matches[0].account.id) || "";
  selectedTelegramAccountId = selected;
  setTelegramAccountDropdownOpen(false);
  elements.telegramAccountMenu?.replaceChildren();

  const selectedMatch = matches.find(
    (match) => match.account && match.account.id === selectedTelegramAccountId
  ) || matches[0] || null;
  const selectedStatus = telegramAccountStatus(selectedMatch);

  if (elements.telegramAccountLabel) {
    elements.telegramAccountLabel.textContent = selectedMatch
      ? telegramAccountName(selectedMatch)
      : "Telegram";
  }
  if (elements.telegramAccountStatus) {
    elements.telegramAccountStatus.textContent = selectedStatus.label;
    elements.telegramAccountStatus.className = `is-${selectedStatus.tone}`;
  }
  if (elements.telegramAccountTrigger) {
    elements.telegramAccountTrigger.disabled = matches.length <= 1;
  }

  for (const match of matches) {
    const account = match.account || {};
    const status = telegramAccountStatus(match);
    const option = document.createElement("button");
    option.type = "button";
    option.className = `telegram-account-option is-${status.tone}`;
    option.dataset.telegramAccountId = account.id || "";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(account.id === selectedTelegramAccountId));
    if (account.id === selectedTelegramAccountId) {
      option.classList.add("is-selected");
    }

    const main = document.createElement("span");
    main.className = "telegram-account-option-main";
    const name = document.createElement("strong");
    name.textContent = telegramAccountName(match);
    const meta = document.createElement("small");
    meta.textContent = account.phone || account.label || "Telegram";
    main.append(name, meta);

    const badge = document.createElement("span");
    badge.className = "telegram-account-option-badge";
    badge.textContent = status.label;

    option.append(main, badge);
    elements.telegramAccountMenu?.append(option);
  }
  stageMotionItems(elements.telegramAccountMenu, ":scope > .telegram-account-option", { maxIndex: 6 });
}

function telegramMediaUrl(message, accountId) {
  const phone = currentTelegramPhone();
  if (!phone || !accountId || !message || !message.id) {
    return "";
  }
  const params = new URLSearchParams({
    phone,
    accountId,
    messageId: String(message.id)
  });
  return `/api/telegram/media?${params.toString()}`;
}

function telegramMessageMedia(message) {
  if (message && message.media) {
    return message.media;
  }
  const payload = message && message.payload;
  if (payload && payload.media) {
    return payload.media;
  }
  if (payload && payload.hasMedia) {
    return {
      type: "unsupported",
      label: "Непідтримуване повідомлення",
      description: "Telegram media",
      downloadable: false
    };
  }
  return null;
}

function telegramMediaIcon(media = {}) {
  switch (media.type) {
    case "photo":
      return "image";
    case "video":
    case "video_note":
    case "animation":
    case "story":
      return "video";
    case "voice":
      return "mic";
    case "audio":
      return "music";
    case "location":
    case "location_live":
    case "venue":
      return "mapPin";
    case "contact":
      return "user";
    case "sticker":
      return "smile";
    case "webpage":
      return "link";
    case "poll":
      return "list";
    case "invoice":
      return "receipt";
    case "dice":
      return "dice";
    case "game":
      return "star";
    case "giveaway":
    case "giveaway_results":
    case "paid_media":
      return "gift";
    case "service":
      return "info";
    default:
      return "fileText";
  }
}

function telegramMediaTitle(media = {}) {
  if (["pdf", "file"].includes(media.type) && media.filename) {
    return media.filename;
  }
  return media.label || media.filename || "Telegram повідомлення";
}

function telegramMediaSubtitle(media = {}, fallback = "Telegram") {
  return media.description || media.filename || media.mimeType || fallback;
}

function createTelegramMediaCard(media = {}, options = {}) {
  const node = document.createElement(options.href ? "a" : "div");
  const mediaTypeClass = String(media.type || "").replace(/[^a-z0-9_-]/gi, "");
  node.className = `telegram-media-file${options.href ? "" : " is-static"}${mediaTypeClass ? ` is-${mediaTypeClass}` : ""}`;
  if (options.href) {
    node.href = options.href;
    node.target = "_blank";
    node.rel = "noopener";
  }
  node.innerHTML = `${aiIcon(telegramMediaIcon(media))}<span><strong>${escapeHtml(telegramMediaTitle(media))}</strong><small>${escapeHtml(options.subtitle || telegramMediaSubtitle(media, options.fallbackSubtitle))}</small></span>`;
  return node;
}

function appendTelegramReplyPreview(bubble, message) {
  const preview = message && message.replyPreview;
  if (!preview && !message.replyToMessageId) {
    return;
  }
  const node = document.createElement("button");
  node.className = "telegram-reply-preview";
  node.type = "button";
  node.dataset.telegramJumpTo = String(message.replyToMessageId || "");
  const label = document.createElement("span");
  label.textContent = "Відповідь";
  const value = document.createElement("strong");
  value.textContent = preview
    ? telegramMessageSummary(preview)
    : `повідомлення #${message.replyToMessageId}`;
  node.append(label, value);
  bubble.append(node);
}

function appendTelegramMedia(bubble, message, accountId) {
  const media = telegramMessageMedia(message);
  if (!media) {
    return false;
  }
  const url = media.downloadable ? telegramMediaUrl(message, accountId) : "";

  if (media.type === "photo" && url) {
    const link = document.createElement("a");
    link.className = "telegram-media-photo";
    link.href = url;
    link.dataset.telegramPhotoUrl = url;
    link.dataset.telegramPhotoTitle = media.filename || "Telegram фото";
    const image = document.createElement("img");
    image.src = url;
    image.alt = media.filename || "Telegram фото";
    image.loading = "lazy";
    link.append(image);
    bubble.append(link);
    return true;
  }

  if (url) {
    bubble.append(createTelegramMediaCard(media, {
      href: url,
      subtitle: media.type === "pdf" ? "Відкрити PDF" : "Завантажити"
    }));
    return true;
  }

  bubble.append(createTelegramMediaCard(media, {
    fallbackSubtitle: media.type === "unsupported"
      ? "Цей тип Telegram не можна показати повністю"
      : "Telegram"
  }));
  return true;
}

function shouldRenderTelegramMessage(message) {
  return Boolean(
    message &&
    (
      String(message.text || "").trim() ||
      telegramMessageMedia(message)
    )
  );
}

function renderTelegramMessages(messages, accountId = selectedTelegramAccountId) {
  elements.telegramChat.replaceChildren();
  const list = (Array.isArray(messages) ? messages : []).filter(shouldRenderTelegramMessage);
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "telegram-empty";
    empty.textContent = "Переписки ще немає. Можна написати перше повідомлення.";
    elements.telegramChat.append(empty);
    stageMotionItems(elements.telegramChat, ":scope > .telegram-empty", { maxIndex: 0 });
    return;
  }

  for (const message of list) {
    const bubble = document.createElement("article");
    bubble.className = `telegram-bubble ${message.direction === "outgoing" ? "is-outgoing" : "is-incoming"}`;
    bubble.dataset.telegramMessageId = String(message.id || "");
    appendTelegramReplyPreview(bubble, message);
    const hasRenderedMedia = appendTelegramMedia(bubble, message, accountId);
    if (message.text) {
      const textNode = document.createElement("p");
      textNode.textContent = message.text;
      bubble.append(textNode);
    } else if (!hasRenderedMedia) {
      continue;
    }
    const footer = document.createElement("div");
    footer.className = "telegram-bubble-footer";
    const replyButton = document.createElement("button");
    replyButton.className = "telegram-reply-button";
    replyButton.type = "button";
    replyButton.dataset.telegramReplyId = String(message.id || "");
    replyButton.setAttribute("aria-label", "Відповісти");
    replyButton.title = "Відповісти";
    replyButton.innerHTML = aiIcon("reply");
    const time = document.createElement("time");
    time.dateTime = message.sentAt || "";
    time.textContent = message.sentAt ? formatDateTime(message.sentAt) : "";
    footer.append(replyButton, time);
    bubble.append(footer);
    elements.telegramChat.append(bubble);
  }
  stageMotionItems(elements.telegramChat, ":scope > .telegram-bubble", { maxIndex: 6 });
  elements.telegramChat.scrollTop = elements.telegramChat.scrollHeight;
}

function renderTelegramPanel(payload) {
  currentTelegram = payload || null;
  telegramSetMessage("");

  if (!payload || payload.ok === false) {
    renderTelegramEmpty(telegramFriendlyError((payload && payload.error) || "Не вдалося завантажити Telegram."));
    return;
  }

  if (!payload.configured) {
    renderTelegramEmpty("Telegram User API ще не налаштований в .env.");
    return;
  }

  const matches = Array.isArray(payload.matches) ? payload.matches : [];
  if (!matches.length) {
    renderTelegramEmpty("Немає підключених Telegram акаунтів в адмінці.");
    return;
  }

  renderTelegramAccountSelect(payload);
  elements.telegramRefresh.disabled = false;

  const selected = matches.find((match) => match.account && match.account.id === selectedTelegramAccountId) || matches[0];
  const selectedMessages = selected && Array.isArray(selected.messages)
    ? selected.messages
    : payload.messages || [];
  const canShowCached = Boolean(
    selected &&
    selected.cached &&
    (selectedMessages.length || (selected.contact && selected.contact.found))
  );
  if (selected && selected.error && !canShowCached) {
    clearTelegramReplyTarget();
    renderTelegramThread(selected, {
      title: "Telegram недоступний",
      subtitle: telegramAccountName(selected),
      status: "Помилка",
      tone: "error"
    });
    renderTelegramMessages([], selected && selected.account && selected.account.id);
    telegramSetMessage(selected.error, "error");
    setTelegramComposeEnabled(false);
    return;
  }
  if (!selected || !selected.found) {
    clearTelegramReplyTarget();
    renderTelegramThread(selected, {
      title: currentPhone ? formatPhone(currentPhone) : "Клієнт",
      subtitle: selected ? telegramAccountName(selected) : "",
      status: "Не знайдено",
      tone: "neutral"
    });
    renderTelegramMessages([], selected && selected.account && selected.account.id);
    telegramSetMessage("Контакт з таким номером не знайдено в Telegram для вибраного акаунта.", "neutral");
    setTelegramComposeEnabled(false);
    return;
  }

  renderTelegramThread(selected, {
    status: selected.cached || selected.unavailable ? "Кеш" : "Чат знайдено",
    tone: selected.cached || selected.unavailable ? "neutral" : "success"
  });
  renderTelegramMessages(selectedMessages, selected.account && selected.account.id);
  if (selected.cached || selected.unavailable) {
    clearTelegramReplyTarget();
    telegramSetMessage(
      `Показуємо кешовану переписку. ${telegramFriendlyError(selected.error)}`,
      "neutral"
    );
    setTelegramComposeEnabled(false);
    return;
  }
  telegramSetMessage("");
  setTelegramComposeEnabled(true);
}

function renderTelegramError(message) {
  const friendly = telegramFriendlyError(message || "Не вдалося завантажити Telegram.");
  renderTelegramEmpty(friendly);
  telegramSetMessage(friendly, "error");
}

function setMessagingChannel(channel) {
  const canShowViber =
    elements.viberTabButton &&
    !elements.viberTabButton.disabled &&
    !elements.viberTabButton.classList.contains("hidden");
  const next = channel === "viber" && canShowViber ? "viber" : "telegram";
  const previous = currentMessagingChannel;
  currentMessagingChannel = next;
  elements.messagingTabButtons?.forEach((button) => {
    const active = button.dataset.messagingTab === next;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  elements.messagingPanels?.forEach((panel) => {
    const active = panel.dataset.messagingPanel === next;
    panel.classList.toggle("hidden", !active);
    if (active && next !== previous) {
      replayMotion(panel);
    }
  });
}

function setViberAvailable(available) {
  const enabled = Boolean(available);
  if (elements.viberTabButton) {
    elements.viberTabButton.classList.toggle("hidden", !enabled);
    elements.viberTabButton.disabled = !enabled;
    elements.viberTabButton.setAttribute("aria-hidden", String(!enabled));
    if (enabled) {
      elements.viberTabButton.removeAttribute("tabindex");
    } else {
      elements.viberTabButton.setAttribute("tabindex", "-1");
    }
  }
  if (!enabled) {
    currentViber = null;
    setMessagingChannel("telegram");
  }
}

function handleMessagingTabsClick(event) {
  const button = event.target.closest("[data-messaging-tab]");
  if (!button || button.disabled || button.classList.contains("hidden")) {
    return;
  }
  setMessagingChannel(button.dataset.messagingTab);
}

function viberSetMessage(message = "", type = "") {
  if (!elements.viberMessageStatus) {
    return;
  }
  elements.viberMessageStatus.textContent = message;
  elements.viberMessageStatus.className = `form-message${type ? ` ${type}` : ""}`;
}

function viberFriendlyError(error) {
  const code = String(error || "").toLowerCase();
  if (code.includes("viber_not_configured")) {
    return "Viber DB path ще не налаштований в .env.";
  }
  if (code.includes("viber_database_not_found")) {
    return "Файл бази Viber не знайдено.";
  }
  if (code.includes("viber_database_key_required")) {
    return "База Viber знайдена, але вона зашифрована. Потрібен VIBER_DB_KEY для Viber SQLite SEE.";
  }
  if (code.includes("viber_database_key_invalid")) {
    return "Viber DB key не відкриває базу.";
  }
  if (code.includes("viber_schema_not_supported")) {
    return "Не вдалося розпізнати схему Viber.";
  }
  if (code.includes("invalid_phone")) {
    return "Некоректний номер для пошуку Viber.";
  }
  return error || "Не вдалося завантажити Viber.";
}

function renderViberThread(payload, options = {}) {
  if (!elements.viberThread) {
    return;
  }
  elements.viberThread.replaceChildren();

  if (!payload && !options.title) {
    elements.viberThread.classList.add("hidden");
    return;
  }

  const contact = (payload && payload.contact) || {};
  const title = options.title || contact.displayName || contact.phone || currentPhone || "Viber";
  const subtitle = options.subtitle || contact.phone || (currentPhone ? formatPhone(currentPhone) : "");
  const status = options.status || (payload && payload.found ? "Чат знайдено" : "Не знайдено");

  const avatar = document.createElement("span");
  avatar.className = "telegram-thread-avatar";
  avatar.textContent = telegramContactInitials(title || "VI");

  const main = document.createElement("div");
  main.className = "telegram-thread-main";
  const name = document.createElement("strong");
  name.textContent = title;
  const meta = document.createElement("span");
  meta.textContent = subtitle || "Viber";
  main.append(name, meta);

  const badge = document.createElement("span");
  badge.className = `telegram-thread-status ${options.tone ? `is-${options.tone}` : ""}`;
  badge.textContent = status;

  elements.viberThread.append(avatar, main, badge);
  elements.viberThread.classList.remove("hidden");
}

function renderViberEmpty(message, options = {}) {
  currentViber = options.keepState ? currentViber : null;
  if (!elements.viberChat) {
    return;
  }
  elements.viberChat.replaceChildren();
  const empty = document.createElement("div");
  empty.className = `telegram-empty${options.loading ? " async-loading" : ""}`;
  empty.innerHTML = options.loading
    ? `<span class="mini-spinner" aria-hidden="true"></span> ${escapeHtml(message)}`
    : escapeHtml(message);
  elements.viberChat.append(empty);
  stageMotionItems(elements.viberChat, ":scope > .telegram-empty", { maxIndex: 0 });
  if (elements.viberRefresh) {
    elements.viberRefresh.disabled = options.loading === true || !currentPhone;
  }
  renderViberThread(null, options.loading
    ? {
        title: "Viber",
        subtitle: currentPhone ? formatPhone(currentPhone) : "",
        status: "Пошук",
        tone: "neutral"
      }
    : {});
}

function renderViberLoading() {
  renderViberEmpty("Шукаємо переписку у Viber...", {
    loading: true,
    keepState: true
  });
  viberSetMessage("");
}

function renderViberMessages(messages) {
  elements.viberChat.replaceChildren();
  const list = Array.isArray(messages) ? messages : [];
  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "telegram-empty";
    empty.textContent = "Переписки у Viber для цього номера не знайдено.";
    elements.viberChat.append(empty);
    stageMotionItems(elements.viberChat, ":scope > .telegram-empty", { maxIndex: 0 });
    return;
  }

  for (const message of list) {
    const bubble = document.createElement("article");
    bubble.className = `telegram-bubble ${message.direction === "outgoing" ? "is-outgoing" : "is-incoming"}`;
    if (message.text) {
      const textNode = document.createElement("p");
      textNode.textContent = message.text;
      bubble.append(textNode);
    } else {
      const textNode = document.createElement("p");
      textNode.textContent = "[повідомлення без тексту]";
      bubble.append(textNode);
    }

    const footer = document.createElement("div");
    footer.className = "telegram-bubble-footer";
    const time = document.createElement("time");
    time.dateTime = message.sentAt || "";
    time.textContent = message.sentAt ? formatDateTime(message.sentAt) : "";
    footer.append(time);
    bubble.append(footer);
    elements.viberChat.append(bubble);
  }
  stageMotionItems(elements.viberChat, ":scope > .telegram-bubble", { maxIndex: 6 });
  elements.viberChat.scrollTop = elements.viberChat.scrollHeight;
}

function renderViberPanel(payload) {
  currentViber = payload || null;
  viberSetMessage("");

  if (!payload || payload.ok === false) {
    setViberAvailable(false);
    return;
  }

  if (!payload.configured) {
    setViberAvailable(false);
    return;
  }

  if (payload.error) {
    setViberAvailable(false);
    return;
  }

  setViberAvailable(true);
  renderViberThread(payload, {
    status: payload.found ? "Чат знайдено" : "Не знайдено",
    tone: payload.found ? "success" : "neutral"
  });
  renderViberMessages(payload.messages);
  if (elements.viberRefresh) {
    elements.viberRefresh.disabled = false;
  }
}

function renderViberError(message) {
  setViberAvailable(false);
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
    call && call.employee && call.employee.name
      ? call.employee.name
      : "Оператор не визначений";

  container.append(fragment);
}

function renderCallsModal() {
  elements.callsModalList.replaceChildren();

  for (const call of currentCalls) {
    appendCall(elements.callsModalList, call);
  }
  stageMotionItems(elements.callsModalList, ":scope > .call-row", { maxIndex: 8 });
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

  if (payload.status === "loading") {
    elements.aiSummaryText.innerHTML =
      `<span class="inline-loading"><span class="mini-spinner" aria-hidden="true"></span>${escapeHtml(payload.message || "Завантажуємо AI-підсумок…")}</span>`;
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

function canonicalNoteId(value) {
  return String(value || "").replace(/^local-/, "");
}

function sameNoteId(left, right) {
  const normalizedLeft = canonicalNoteId(left);
  const normalizedRight = canonicalNoteId(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
}

function isEditableNote(note) {
  const id = String(note && note.id || "");
  const source = String(note && note.source || "");
  return Boolean(
    id &&
      !id.startsWith("ticket-") &&
      (source === "postgres" || source === "local_json")
  );
}

function noteFooterText(note) {
  const parts = [
    note.createdBy,
    note.createdAt ? formatDate(note.createdAt, { short: true }) : ""
  ].filter(Boolean);

  if (note.updatedAt) {
    parts.push(`оновлено ${formatDate(note.updatedAt, { short: true })}`);
  }

  return parts.join(" · ");
}

function createNoteIconButton(action, label, icon, danger = false) {
  const button = document.createElement("button");
  button.className = `note-action-button${danger ? " is-danger" : ""}`;
  button.type = "button";
  button.dataset.noteAction = action;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.innerHTML = aiIcon(icon);
  return button;
}

function animateUiConfirmPopover(popover) {
  if (!popover || prefersReducedMotion() || typeof popover.animate !== "function") {
    return;
  }

  popover.animate(
    [
      { opacity: 0, transform: "translateY(-6px) scale(0.96)" },
      { opacity: 1, transform: "translateY(0) scale(1)" }
    ],
    {
      duration: 220,
      easing: "cubic-bezier(0.23, 1, 0.32, 1)",
      fill: "both"
    }
  );
}

function closeUiConfirmDialog(result) {
  if (!uiConfirmDialog) {
    return;
  }

  const dialog = uiConfirmDialog;
  uiConfirmDialog = null;
  window.removeEventListener("keydown", dialog.onKeyDown);
  window.removeEventListener("resize", dialog.onReposition);
  window.removeEventListener("scroll", dialog.onReposition, true);
  if (dialog.layer && typeof dialog.layer.close === "function" && dialog.layer.open) {
    dialog.layer.close();
  }
  dialog.layer.remove();
  dialog.resolve(Boolean(result));
}

function positionUiConfirmPopover(popover, anchor) {
  const viewportPadding = 12;
  const anchorRect = anchor && typeof anchor.getBoundingClientRect === "function"
    ? anchor.getBoundingClientRect()
    : null;
  const popoverRect = popover.getBoundingClientRect();

  popover.classList.remove("is-placement-below", "is-centered");

  if (!anchorRect) {
    popover.classList.add("is-centered");
    popover.style.left = `${Math.max(viewportPadding, (window.innerWidth - popoverRect.width) / 2)}px`;
    popover.style.top = `${Math.max(viewportPadding, (window.innerHeight - popoverRect.height) / 2)}px`;
    return;
  }

  const anchorCenter = anchorRect.left + anchorRect.width / 2;
  const left = clampNumber(
    anchorCenter - popoverRect.width / 2,
    viewportPadding,
    window.innerWidth - popoverRect.width - viewportPadding
  );
  const hasRoomAbove = anchorRect.top > popoverRect.height + viewportPadding + 12;
  const top = hasRoomAbove
    ? anchorRect.top - popoverRect.height - 12
    : Math.min(anchorRect.bottom + 12, window.innerHeight - popoverRect.height - viewportPadding);

  if (!hasRoomAbove) {
    popover.classList.add("is-placement-below");
  }

  popover.style.left = `${left}px`;
  popover.style.top = `${Math.max(viewportPadding, top)}px`;
  popover.style.setProperty(
    "--confirm-arrow-left",
    `${clampNumber(anchorCenter - left, 18, popoverRect.width - 18)}px`
  );
}

function showUiConfirmDialog({
  title = "Підтвердити дію?",
  message = "Перевірте дію перед підтвердженням.",
  confirmLabel = "Підтвердити",
  cancelLabel = "Скасувати",
  tone = "danger",
  anchor = null
} = {}) {
  if (uiConfirmDialog) {
    closeUiConfirmDialog(false);
  }

  const insideOpenDialog = anchor && typeof anchor.closest === "function"
    ? anchor.closest("dialog[open]")
    : null;
  const layer = insideOpenDialog
    ? document.createElement("dialog")
    : document.createElement("div");
  layer.className = `booking-action-confirm-layer${insideOpenDialog ? " booking-action-confirm-dialog" : ""}`;
  layer.innerHTML = `
    <section class="booking-action-confirm-popover is-${escapeHtml(tone)}" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="booking-action-confirm-head">
        <span class="booking-action-confirm-mark"></span>
        <strong>${escapeHtml(title)}</strong>
      </div>
      <p>${escapeHtml(message)}</p>
      <div class="booking-action-confirm-actions">
        <button class="booking-action-confirm-button is-ghost" type="button" data-booking-confirm-cancel>${escapeHtml(cancelLabel)}</button>
        <button class="booking-action-confirm-button is-confirm" type="button" data-booking-confirm-accept>${escapeHtml(confirmLabel)}</button>
      </div>
    </section>
  `;
  const popover = layer.querySelector(".booking-action-confirm-popover");
  document.body.append(layer);
  if (insideOpenDialog) {
    if (typeof layer.showModal === "function") {
      layer.showModal();
    } else {
      layer.setAttribute("open", "");
    }
  }

  return new Promise((resolve) => {
    const onReposition = () => positionUiConfirmPopover(popover, anchor);
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        closeUiConfirmDialog(false);
      }
    };

    uiConfirmDialog = { layer, resolve, onKeyDown, onReposition };
    layer.addEventListener("pointerdown", (event) => {
      if (event.target === layer) {
        closeUiConfirmDialog(false);
      }
    });
    layer.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeUiConfirmDialog(false);
    });
    layer
      .querySelector("[data-booking-confirm-cancel]")
      ?.addEventListener("click", () => closeUiConfirmDialog(false));
    layer
      .querySelector("[data-booking-confirm-accept]")
      ?.addEventListener("click", () => closeUiConfirmDialog(true));

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    onReposition();
    animateUiConfirmPopover(popover);
    layer.querySelector("[data-booking-confirm-cancel]")?.focus({ preventScroll: true });
  });
}

function renderNotes(notes) {
  elements.notesList.replaceChildren();
  const list = Array.isArray(notes) ? notes : [];

  if (!list.length) {
    const message = document.createElement("p");
    message.className = "no-data";
    message.textContent = "Приміток поки немає.";
    elements.notesList.append(message);
    stageMotionItems(elements.notesList, ":scope > .no-data", { maxIndex: 0 });
    return;
  }

  for (const note of list) {
    const item = document.createElement("article");
    item.className = "note";
    item.dataset.noteId = note.id || "";

    const isEditing = sameNoteId(editingNoteId, note.id);
    const editable = isEditableNote(note);

    if (isEditing) {
      item.classList.add("is-editing");
      const editor = document.createElement("textarea");
      editor.className = "note-edit-input";
      editor.maxLength = 2000;
      editor.value = note.text || "";
      editor.setAttribute("aria-label", "Текст примітки");

      const actions = document.createElement("div");
      actions.className = "note-actions";
      actions.append(
        createNoteIconButton("save", "Зберегти примітку", "check"),
        createNoteIconButton("cancel", "Скасувати редагування", "x")
      );
      item.append(editor, actions);
      elements.notesList.append(item);
      queueMicrotask(() => {
        editor.focus();
        editor.setSelectionRange(editor.value.length, editor.value.length);
      });
      continue;
    }

    const body = document.createElement("div");
    body.className = "note-body";
    const textNode = document.createElement("p");
    textNode.textContent = note.text;
    body.append(textNode);

    if (editable) {
      const actions = document.createElement("div");
      actions.className = "note-actions";
      actions.append(
        createNoteIconButton("edit", "Редагувати примітку", "edit"),
        createNoteIconButton("delete", "Видалити примітку", "trash", true)
      );
      body.append(actions);
    }

    const footer = document.createElement("footer");
    footer.textContent = noteFooterText(note);
    item.append(body, footer);
    elements.notesList.append(item);
  }
  stageMotionItems(elements.notesList, ":scope > .note", { maxIndex: 7 });
}

function setNoteFormMessage(message, tone = "") {
  elements.noteMessage.textContent = message || "";
  if (tone) {
    elements.noteMessage.dataset.tone = tone;
  } else {
    delete elements.noteMessage.dataset.tone;
  }
}

function applyUpdatedNote(noteId, updatedNote) {
  if (!currentCard || !Array.isArray(currentCard.notes)) {
    return;
  }

  currentCard.notes = currentCard.notes.map((note) => {
    if (!sameNoteId(note.id, noteId)) {
      return note;
    }
    return {
      ...note,
      ...updatedNote,
      id: note.id,
      source: note.source || updatedNote.source || "local_json"
    };
  });
}

function removeCurrentNote(noteId) {
  if (!currentCard || !Array.isArray(currentCard.notes)) {
    return;
  }
  currentCard.notes = currentCard.notes.filter((note) => !sameNoteId(note.id, noteId));
}

function appendCurrentNote(note) {
  if (!currentCard) {
    return;
  }
  if (!Array.isArray(currentCard.notes)) {
    currentCard.notes = [];
  }
  currentCard.notes = [note, ...currentCard.notes];
}

async function saveNoteEdit(noteId, textarea) {
  const nextText = String(textarea && textarea.value || "").trim();
  if (!nextText) {
    setNoteFormMessage("Примітка не може бути пустою.");
    textarea.focus();
    return;
  }

  setNoteFormMessage("Оновлюємо…", "neutral");

  try {
    const response = await apiFetch(`/api/client-notes/${encodeURIComponent(noteId)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ text: nextText })
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Не вдалося оновити примітку");
    }

    applyUpdatedNote(noteId, payload.note || { text: nextText });
    editingNoteId = "";
    setNoteFormMessage("Примітку оновлено.", "success");
    renderNotes(currentCard && currentCard.notes ? currentCard.notes : []);
  } catch (error) {
    setNoteFormMessage(error.message);
  }
}

async function deleteNote(noteId) {
  setNoteFormMessage("Видаляємо…", "neutral");

  try {
    const response = await apiFetch(`/api/client-notes/${encodeURIComponent(noteId)}`, {
      method: "DELETE",
      headers: { Accept: "application/json" }
    });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Не вдалося видалити примітку");
    }

    removeCurrentNote(noteId);
    if (sameNoteId(editingNoteId, noteId)) {
      editingNoteId = "";
    }
    setNoteFormMessage("Примітку видалено.", "success");
    renderNotes(currentCard && currentCard.notes ? currentCard.notes : []);
  } catch (error) {
    setNoteFormMessage(error.message);
  }
}

function renderCard(card, options = {}) {
  clearTimeout(summaryPollTimer);
  currentCard = card;
  currentCardWarnings = [...(card.warnings || [])];
  editingNoteId = "";
  currentPhone = card.contact.phone;
  currentSummaryCallId = "";
  elements.clientName.textContent = card.contact.primaryName;
  elements.clientPhone.textContent = formatPhone(card.contact.phone);
  elements.clientPhone.href = `tel:${card.contact.phone}`;
  elements.clientEmail.textContent = card.contact.emails[0] || "Email не вказаний";
  elements.firstOrder.textContent = formatDate(card.stats.firstOrderAt);
  elements.lastOrder.textContent = formatDate(card.stats.lastOrderAt);

  renderWarnings(card.warnings);
  renderPassengers(card.contact.relatedPassengers);
  renderUpcoming(card.upcomingTrip, { busLoading: options.extrasLoading });
  if (options.extrasLoading) {
    renderCallSummary({
      status: "loading",
      message: "Завантажуємо дзвінки та AI-підсумок..."
    });
    renderCallsLoading();
    renderTelegramLoading();
    setViberAvailable(false);
  } else {
    renderCallSummary(card.latestCallSummary);
    renderCalls(card.calls);
    renderTelegramEmpty("Telegram відкриється після завантаження картки.");
    setViberAvailable(false);
  }
  renderTickets(card.tickets);
  renderNotes(card.notes);
  setState("card");
}

function cardTripIds(card) {
  return [
    ...new Set(
      (card && card.tickets || [])
        .map((ticket) => ticket && ticket.tripId)
        .filter(Boolean)
    )
  ];
}

function applyTripAssignmentsToCard(card, assignments) {
  const map = assignments && typeof assignments === "object" ? assignments : {};
  const apply = (ticket) => {
    if (!ticket || !ticket.tripId) {
      return;
    }
    const assignment = map[String(ticket.tripId)];
    if (!assignment) {
      return;
    }
    ticket.busNumber = assignment.busNumber || "";
    ticket.busColor = assignment.busColor || "";
    ticket.busAssignmentChecked = true;
  };

  for (const ticket of card.tickets || []) {
    apply(ticket);
  }
  apply(card.upcomingTrip);
  syncCardTransferSegments(card);
}

function syncCardTransferSegments(card) {
  if (!card || !Array.isArray(card.tickets)) {
    return;
  }

  const byId = new Map(card.tickets.map((ticket) => [String(ticket.id || ""), ticket]));
  const byTripId = new Map(
    card.tickets
      .filter((ticket) => ticket && ticket.tripId)
      .map((ticket) => [String(ticket.tripId), ticket])
  );
  const syncTicket = (ticket) => {
    if (!ticket || !Array.isArray(ticket.transferSegments)) {
      return;
    }
    ticket.transferSegments = ticket.transferSegments.map((segment) => {
      const source =
        byId.get(String(segment.id || "")) ||
        byTripId.get(String(segment.tripId || "")) ||
        null;
      return source
        ? {
            ...segment,
            busNumber: source.busNumber || "",
            busColor: source.busColor || "",
            busAssignmentChecked: Boolean(source.busAssignmentChecked)
          }
        : segment;
    });
  };

  for (const ticket of card.tickets) {
    syncTicket(ticket);
  }
  syncTicket(card.upcomingTrip);
}

async function loadClientTripAssignments(card, sequence) {
  const tripIds = cardTripIds(card);
  if (!tripIds.length) {
    renderUpcoming(card.upcomingTrip);
    return;
  }

  try {
    const response = await apiFetch(
      `/api/client-card-trip-assignments?tripIds=${encodeURIComponent(tripIds.join(","))}`,
      { headers: { Accept: "application/json" } }
    );
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Не вдалося завантажити автобус.");
    }
    if (sequence !== clientLoadSequence || currentCard !== card) {
      return;
    }

    applyTripAssignmentsToCard(card, payload.assignments);
    renderUpcoming(card.upcomingTrip);
  } catch (error) {
    if (sequence !== clientLoadSequence || currentCard !== card) {
      return;
    }
    renderUpcoming(card.upcomingTrip);
  }
}

async function loadClientCalls(card, sequence) {
  try {
    const response = await apiFetch(
      `/api/client-card-calls?phone=${encodeURIComponent(card.contact.phoneDigits || card.contact.phone)}`,
      { headers: { Accept: "application/json" } }
    );
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error || "Не вдалося завантажити дзвінки.");
    }
    if (sequence !== clientLoadSequence || currentCard !== card) {
      return;
    }

    card.calls = payload.calls || [];
    card.latestCallSummary = payload.latestCallSummary || null;
    renderWarnings([...currentCardWarnings, ...(payload.warnings || [])]);
    renderCallSummary(card.latestCallSummary);
    renderCalls(card.calls);
  } catch (error) {
    if (sequence !== clientLoadSequence || currentCard !== card) {
      return;
    }
    renderCallSummary({
      status: "failed",
      error: error.message || "Не вдалося завантажити AI-підсумок."
    });
    renderCallsError(error.message || "Не вдалося завантажити дзвінки Binotel.");
  }
}

async function loadClientTelegram(card, sequence, accountId = selectedTelegramAccountId, options = {}) {
  try {
    const phone = card.contact.phoneDigits || card.contact.phone;
    const params = new URLSearchParams({
      phone,
      limit: "50"
    });
    if (accountId) {
      params.set("accountId", accountId);
    }
    if (options.force) {
      params.set("force", "1");
    }
    const response = await apiFetch(`/api/telegram/conversation?${params.toString()}`, {
      headers: { Accept: "application/json" }
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Не вдалося завантажити Telegram.");
    }
    if (sequence !== clientLoadSequence || currentCard !== card) {
      return;
    }
    renderTelegramPanel(payload);
  } catch (error) {
    if (sequence !== clientLoadSequence || currentCard !== card) {
      return;
    }
    renderTelegramError(error.message || "Не вдалося завантажити Telegram.");
  }
}

async function loadClientViber(card, sequence) {
  try {
    const phone = card.contact.phoneDigits || card.contact.phone;
    const params = new URLSearchParams({
      phone,
      limit: "50"
    });
    const response = await apiFetch(`/api/viber/conversation?${params.toString()}`, {
      headers: { Accept: "application/json" }
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Не вдалося завантажити Viber.");
    }
    if (sequence !== clientLoadSequence || currentCard !== card) {
      return;
    }
    renderViberPanel(payload);
  } catch (error) {
    if (sequence !== clientLoadSequence || currentCard !== card) {
      return;
    }
    renderViberError(error.message || "Не вдалося завантажити Viber.");
  }
}

async function reloadCurrentTelegram(accountId = selectedTelegramAccountId, options = {}) {
  if (!currentCard) {
    return;
  }
  renderTelegramLoading();
  await loadClientTelegram(currentCard, clientLoadSequence, accountId, options);
}

async function reloadCurrentViber() {
  if (!currentCard) {
    return;
  }
  renderViberLoading();
  await loadClientViber(currentCard, clientLoadSequence);
}

async function handleTelegramSend(event) {
  event.preventDefault();
  if (!currentCard || !selectedTelegramAccountId) {
    return;
  }
  const message = elements.telegramMessage.value.trim();
  if (!message) {
    return;
  }

  setTelegramComposeEnabled(false);
  telegramSetMessage("Надсилаємо повідомлення...", "neutral");

  try {
    const response = await apiFetch("/api/telegram/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phone: currentCard.contact.phoneDigits || currentCard.contact.phone,
        accountId: selectedTelegramAccountId,
        text: message,
        replyToMessageId: telegramReplyTarget && telegramReplyTarget.id
          ? telegramReplyTarget.id
          : undefined
      })
    });
    const payload = await readJsonResponse(response, "Не вдалося надіслати Telegram повідомлення.");
    elements.telegramMessage.value = "";
    clearTelegramReplyTarget();
    telegramSetMessage("Повідомлення надіслано.", "success");
    if (currentTelegram && Array.isArray(currentTelegram.matches)) {
      const match = currentTelegram.matches.find(
        (item) => item.account && item.account.id === selectedTelegramAccountId
      );
      if (match) {
        match.messages = [...(match.messages || []), payload.message].filter(Boolean);
        renderTelegramPanel({
          ...currentTelegram,
          selectedAccountId: selectedTelegramAccountId
        });
      }
    }
    await reloadCurrentTelegram(selectedTelegramAccountId);
  } catch (error) {
    telegramSetMessage(error.message || "Не вдалося надіслати Telegram повідомлення.");
    setTelegramComposeEnabled(true);
  }
}

function handleTelegramMessageKeydown(event) {
  if (
    event.key !== "Enter" ||
    event.shiftKey ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.isComposing
  ) {
    return;
  }

  event.preventDefault();
  if (typeof elements.telegramCompose?.requestSubmit === "function") {
    elements.telegramCompose.requestSubmit();
  } else {
    elements.telegramSend?.click();
  }
}

function selectedTelegramMatch() {
  const matches = Array.isArray(currentTelegram && currentTelegram.matches)
    ? currentTelegram.matches
    : [];
  return matches.find((match) => match.account && match.account.id === selectedTelegramAccountId) || null;
}

function telegramMessageById(messageId) {
  const selected = selectedTelegramMatch();
  const messages = Array.isArray(selected && selected.messages) ? selected.messages : [];
  return messages.find((message) => String(message.id) === String(messageId)) || null;
}

function openTelegramPhotoModal(url, title = "Фото") {
  if (!elements.telegramPhotoModal || !elements.telegramPhotoModalImage) {
    return;
  }
  elements.telegramPhotoModalImage.src = url;
  elements.telegramPhotoModalImage.alt = title || "Telegram фото";
  if (elements.telegramPhotoModalTitle) {
    elements.telegramPhotoModalTitle.textContent = title || "Фото";
  }
  if (typeof elements.telegramPhotoModal.showModal === "function") {
    elements.telegramPhotoModal.showModal();
  } else {
    elements.telegramPhotoModal.removeAttribute("hidden");
  }
}

function closeTelegramPhotoModal() {
  if (!elements.telegramPhotoModal) {
    return;
  }
  if (typeof elements.telegramPhotoModal.close === "function") {
    elements.telegramPhotoModal.close();
  } else {
    elements.telegramPhotoModal.setAttribute("hidden", "");
  }
  if (elements.telegramPhotoModalImage) {
    elements.telegramPhotoModalImage.removeAttribute("src");
    elements.telegramPhotoModalImage.alt = "Telegram фото";
  }
}

function handleTelegramChatClick(event) {
  const photoLink = event.target.closest("[data-telegram-photo-url]");
  if (photoLink) {
    event.preventDefault();
    openTelegramPhotoModal(
      photoLink.dataset.telegramPhotoUrl,
      photoLink.dataset.telegramPhotoTitle || "Фото"
    );
    return;
  }

  const replyButton = event.target.closest("[data-telegram-reply-id]");
  if (replyButton) {
    const message = telegramMessageById(replyButton.dataset.telegramReplyId);
    if (message) {
      setTelegramReplyTarget(message);
    }
    return;
  }

  const jumpButton = event.target.closest("[data-telegram-jump-to]");
  if (jumpButton) {
    const targetId = jumpButton.dataset.telegramJumpTo;
    const target = Array.from(elements.telegramChat.querySelectorAll("[data-telegram-message-id]"))
      .find((node) => node.dataset.telegramMessageId === String(targetId));
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("is-highlighted");
      window.setTimeout(() => target.classList.remove("is-highlighted"), 900);
    }
  }
}

function selectTelegramAccount(accountId) {
  const nextAccountId = String(accountId || "");
  if (!nextAccountId) {
    setTelegramAccountDropdownOpen(false);
    return;
  }

  selectedTelegramAccountId = nextAccountId;
  setTelegramAccountDropdownOpen(false);
  clearTelegramReplyTarget();
  if (currentTelegram && Array.isArray(currentTelegram.matches)) {
    renderTelegramPanel({
      ...currentTelegram,
      selectedAccountId: selectedTelegramAccountId
    });
    return;
  }
  void reloadCurrentTelegram(selectedTelegramAccountId);
}

function handleTelegramAccountMenuClick(event) {
  const option = event.target.closest("[data-telegram-account-id]");
  if (!option) {
    return;
  }
  selectTelegramAccount(option.dataset.telegramAccountId);
}

function loadClientExtras(card, sequence) {
  loadClientTripAssignments(card, sequence);
  loadClientCalls(card, sequence);
  loadClientTelegram(card, sequence);
  loadClientViber(card, sequence);
}

async function loadClient(phone) {
  clearTimeout(monitorPollTimer);
  clearTimeout(detailPollTimer);
  clearTimeout(summaryPollTimer);
  const cleaned = String(phone || "").trim();
  const sequence = ++clientLoadSequence;
  if (!cleaned) {
    currentCard = null;
    currentCardWarnings = [];
    setState("empty");
    return;
  }

  elements.phoneInput.value = cleaned;
  setState("loading");

  try {
    const response = await apiFetch(
      `/api/client-card?phone=${encodeURIComponent(cleaned)}&fast=1`,
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
    if (sequence !== clientLoadSequence) {
      return;
    }
    renderCard(card, { extrasLoading: true });
    loadClientExtras(card, sequence);
  } catch (error) {
    if (sequence !== clientLoadSequence) {
      return;
    }
    currentCard = null;
    currentCardWarnings = [];
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

function managerRatingScoreClass(value) {
  return `quality-${scoreLevel(value)}`;
}

function managerRatingPercent(value) {
  return Number.isFinite(Number(value)) ? `${Math.round(Number(value))}%` : "—";
}

function managerRatingPercentValue(item) {
  const total = Number(item && item.totalPercent);
  if (Number.isFinite(total)) {
    return total;
  }

  const average = Number(item && item.averagePercent);
  return Number.isFinite(average) ? average : null;
}

function managerRatingPointLabel(item) {
  const score = Number(item && item.scoreSum);
  const maxScore = Number(item && item.maxScoreSum);
  if (Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0) {
    return `${formatMetricNumber(score)}/${formatMetricNumber(maxScore)}`;
  }

  const average = Number(item && item.averageScore);
  const averageMax = Number(item && item.averageMaxScore);
  if (Number.isFinite(average) && Number.isFinite(averageMax) && averageMax > 0) {
    return `${formatMetricNumber(average)}/${formatMetricNumber(averageMax)}`;
  }

  return "—";
}

function managerRatingCountLabel(item, emptyLabel = "немає оцінок") {
  const count = Number(item && item.scoredMetricCount);
  if (Number.isFinite(count) && count > 0) {
    return `${formatNumber(count)} оц.`;
  }
  return emptyLabel;
}

function managerMetricKey(metric) {
  return String(metric && (metric.key || metric.id || metric.label) || "").trim();
}

function managerMetricLabel(metric) {
  return String(metric && (metric.label || metric.key) || "Метрика").trim();
}

function managerMetricMap(manager) {
  const map = new Map();
  const metrics = Array.isArray(manager && manager.metrics) ? manager.metrics : [];
  for (const metric of metrics) {
    const key = managerMetricKey(metric);
    if (key && !map.has(key)) {
      map.set(key, metric);
    }
  }
  return map;
}

function managerRatingColumnMetrics(rating, managers) {
  const map = new Map();
  const addMetric = (metric) => {
    const key = managerMetricKey(metric);
    if (key && !map.has(key)) {
      map.set(key, {
        key,
        label: managerMetricLabel(metric),
        group: metric && metric.group || "",
        color: metric && metric.color || ""
      });
    }
  };

  for (const metric of Array.isArray(rating && rating.metrics) ? rating.metrics : []) {
    addMetric(metric);
  }
  for (const manager of managers) {
    for (const metric of Array.isArray(manager && manager.metrics) ? manager.metrics : []) {
      addMetric(metric);
    }
  }

  return [...map.values()];
}

function managerRatingMeta(manager) {
  const callType = Array.isArray(manager && manager.callTypes) && manager.callTypes[0]
    ? manager.callTypes[0]
    : null;
  return [
    manager && manager.extension ? `вн. ${manager.extension}` : "",
    manager && manager.pbxName || "",
    callType ? `${callType.label || callType.type}: ${formatNumber(callType.count || 0)}` : ""
  ].filter(Boolean).join(" · ") || "Без додаткових даних";
}

function createManagerRatingChip(label, value) {
  const chip = document.createElement("span");
  const labelElement = document.createElement("small");
  labelElement.textContent = label;
  const valueElement = document.createElement("strong");
  valueElement.textContent = value;
  chip.append(labelElement, valueElement);
  return chip;
}

function createManagerRatingCell(item, options = {}) {
  const percent = managerRatingPercentValue(item);
  const cell = document.createElement("div");
  cell.className = `manager-rating-cell ${managerRatingScoreClass(percent)}`;
  cell.style.setProperty("--metric-color", safeMetricColor(item && item.color));
  const pointLabel = managerRatingPointLabel(item);
  const countLabel = options.total
    ? `${formatNumber(item && item.ratedCallCount || 0)} дзв.`
    : managerRatingCountLabel(item);
  cell.title = `${managerRatingPercent(percent)} · ${pointLabel} · ${countLabel}`;
  cell.setAttribute("aria-label", cell.title);

  const score = document.createElement("strong");
  score.className = "manager-rating-cell-score";
  score.textContent = managerRatingPercent(percent);

  cell.append(score);
  return cell;
}

function createEmptyManagerRatingCell() {
  const cell = document.createElement("div");
  cell.className = "manager-rating-cell quality-empty";
  cell.title = "Немає оцінок";
  cell.setAttribute("aria-label", "Немає оцінок");
  const score = document.createElement("strong");
  score.className = "manager-rating-cell-score";
  score.textContent = "—";
  cell.append(score);
  return cell;
}

function showManagerRatingModalDialog() {
  if (!elements.managerRatingModal) {
    return;
  }

  if (typeof elements.managerRatingModal.showModal === "function") {
    elements.managerRatingModal.showModal();
    return;
  }

  elements.managerRatingModal.setAttribute("open", "");
}

function closeManagerRatingModal() {
  if (!elements.managerRatingModal) {
    return;
  }

  if (elements.managerRatingModal.open && typeof elements.managerRatingModal.close === "function") {
    elements.managerRatingModal.close();
    return;
  }

  elements.managerRatingModal.removeAttribute("open");
}

function appendManagerModalSummary(label, value, detail = "") {
  const item = document.createElement("div");
  item.className = "manager-rating-modal-stat";
  const labelElement = document.createElement("span");
  labelElement.textContent = label;
  const valueElement = document.createElement("strong");
  valueElement.textContent = value;
  item.append(labelElement, valueElement);
  if (detail) {
    const detailElement = document.createElement("small");
    detailElement.textContent = detail;
    item.append(detailElement);
  }
  elements.managerRatingModalSummary.append(item);
}

function appendManagerModalMetric(metric) {
  const item = document.createElement("article");
  const percent = managerRatingPercentValue(metric);
  item.className = `manager-rating-modal-metric ${managerRatingScoreClass(percent)}`;
  item.style.setProperty("--metric-color", safeMetricColor(metric && metric.color));

  const head = document.createElement("div");
  head.className = "manager-rating-modal-metric-head";
  const title = document.createElement("div");
  const label = document.createElement("strong");
  label.textContent = managerMetricLabel(metric);
  title.append(label);
  if (metric && metric.group) {
    const group = document.createElement("small");
    group.textContent = metric.group;
    title.append(group);
  }
  const score = document.createElement("span");
  score.textContent = managerRatingPercent(percent);
  head.append(title, score);

  const facts = document.createElement("dl");
  facts.className = "manager-rating-modal-metric-facts";
  const addFact = (factLabel, factValue) => {
    const wrap = document.createElement("div");
    const dt = document.createElement("dt");
    dt.textContent = factLabel;
    const dd = document.createElement("dd");
    dd.textContent = factValue;
    wrap.append(dt, dd);
    facts.append(wrap);
  };

  addFact("Бали", managerRatingPointLabel(metric));
  addFact("Оцінок", managerRatingCountLabel(metric, "0 оц."));
  addFact("Середнє", Number.isFinite(Number(metric && metric.averageScore))
    ? `${formatMetricNumber(metric.averageScore)}/${formatMetricNumber(metric.averageMaxScore)}`
    : "—");

  item.append(head, facts);
  elements.managerRatingModalMetrics.append(item);
}

function openManagerRatingModal(managerIndex) {
  const managers = Array.isArray(currentManagerRating && currentManagerRating.managers)
    ? currentManagerRating.managers
    : [];
  const manager = managers[Number(managerIndex)];
  if (!manager) {
    return;
  }

  const percent = managerRatingPercentValue(manager);
  elements.managerRatingModalTitle.textContent = manager.label || "Оператор не визначений";
  elements.managerRatingModalSubtitle.textContent = managerRatingMeta(manager);
  elements.managerRatingModalSummary.replaceChildren();
  elements.managerRatingModalMetrics.replaceChildren();

  appendManagerModalSummary(
    "Загальна оцінка",
    managerRatingPercent(percent),
    `${managerRatingPointLabel(manager)} сумарно`
  );
  appendManagerModalSummary(
    "Дзвінків",
    formatNumber(manager.ratedCallCount || 0),
    "з оціненими метриками"
  );
  appendManagerModalSummary(
    "Метрик",
    formatNumber(manager.scoredMetricCount || 0),
    "враховано в рейтингу"
  );
  appendManagerModalSummary(
    "Останній дзвінок",
    manager.lastCallAt ? formatDateTime(manager.lastCallAt) : "—"
  );

  const metrics = Array.isArray(manager.metrics) ? manager.metrics : [];
  if (!metrics.length) {
    const message = document.createElement("p");
    message.className = "no-data";
    message.textContent = "По цьому менеджеру ще немає оцінених метрик.";
    elements.managerRatingModalMetrics.append(message);
  } else {
    for (const metric of metrics) {
      appendManagerModalMetric(metric);
    }
  }
  stageMotionItems(elements.managerRatingModalSummary, ":scope > .manager-rating-modal-stat", { maxIndex: 4 });
  stageMotionItems(elements.managerRatingModalMetrics, ":scope > .manager-rating-modal-metric, :scope > .no-data", { maxIndex: 6 });

  showManagerRatingModalDialog();
}

function renderManagerRating(rating) {
  const managers = Array.isArray(rating && rating.managers)
    ? rating.managers
    : [];
  const metricColumns = managerRatingColumnMetrics(rating, managers);
  currentManagerRating = {
    ...(rating || {}),
    managers
  };

  if (elements.managerRatingSummary) {
    elements.managerRatingSummary.replaceChildren();
  }
  if (elements.managerRatingTable) {
    elements.managerRatingTable.replaceChildren();
  }
  if (elements.managerRatingEmpty) {
    elements.managerRatingEmpty.classList.toggle("hidden", managers.length > 0);
  }

  if (!elements.managerRatingTable || !elements.managerRatingSummary) {
    return;
  }

  const summaryItems = [
    ["Менеджерів", formatNumber(rating && rating.managerCount || managers.length)],
    ["Дзвінків з оцінками", formatNumber(rating && rating.ratedCalls || 0)],
    ["Метрик у таблиці", formatNumber(metricColumns.length)],
    ["Середня якість", managerRatingPercent(managerRatingPercentValue(rating))]
  ];
  for (const [label, value] of summaryItems) {
    elements.managerRatingSummary.append(createManagerRatingChip(label, value));
  }
  stageMotionItems(elements.managerRatingSummary, ":scope > span", { maxIndex: 4 });

  if (!managers.length) {
    return;
  }

  const table = document.createElement("table");
  table.className = "manager-rating-matrix";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const managerHead = document.createElement("th");
  managerHead.className = "manager-rating-sticky manager-rating-manager-head";
  managerHead.scope = "col";
  managerHead.textContent = "Менеджер";
  headRow.append(managerHead);

  const totalHead = document.createElement("th");
  totalHead.className = "manager-rating-total-head";
  totalHead.scope = "col";
  totalHead.textContent = "Загальна";
  headRow.append(totalHead);

  for (const metric of metricColumns) {
    const metricHead = document.createElement("th");
    metricHead.className = "manager-rating-metric-head";
    metricHead.scope = "col";
    metricHead.title = metric.group
      ? `${metric.label} · ${metric.group}`
      : metric.label;
    metricHead.style.setProperty("--metric-color", safeMetricColor(metric.color));
    const label = document.createElement("strong");
    label.textContent = metric.label;
    metricHead.append(label);
    if (metric.group) {
      const group = document.createElement("small");
      group.textContent = metric.group;
      metricHead.append(group);
    }
    headRow.append(metricHead);
  }
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  managers.forEach((manager, index) => {
    const row = document.createElement("tr");
    row.className = "manager-rating-matrix-row";

    const managerCell = document.createElement("th");
    managerCell.className = "manager-rating-sticky manager-rating-manager-cell";
    managerCell.scope = "row";
    const managerButton = document.createElement("button");
    managerButton.className = "manager-rating-person-button";
    managerButton.type = "button";
    managerButton.dataset.managerRatingIndex = String(index);

    const rank = document.createElement("span");
    rank.className = "manager-rating-rank";
    rank.textContent = formatNumber(manager.rank || index + 1);
    const person = document.createElement("span");
    person.className = "manager-rating-person";
    const name = document.createElement("strong");
    name.textContent = manager.label || "Оператор не визначений";
    const meta = document.createElement("small");
    meta.textContent = managerRatingMeta(manager);
    person.append(name, meta);
    managerButton.append(rank, person);
    managerCell.append(managerButton);
    row.append(managerCell);

    const totalCell = document.createElement("td");
    totalCell.className = "manager-rating-total-cell";
    totalCell.append(createManagerRatingCell(manager, { total: true }));
    row.append(totalCell);

    const metricMap = managerMetricMap(manager);
    for (const column of metricColumns) {
      const cell = document.createElement("td");
      const metric = metricMap.get(column.key);
      cell.append(metric ? createManagerRatingCell(metric) : createEmptyManagerRatingCell());
      row.append(cell);
    }

    tbody.append(row);
  });

  table.append(thead, tbody);
  elements.managerRatingTable.append(table);
  stageMotionItems(tbody, ":scope > .manager-rating-matrix-row", { maxIndex: 8 });
}

function renderCallTypeAnalytics(payload) {
  const categories = Array.isArray(payload && payload.categories)
    ? payload.categories
    : [];
  const questions = Array.isArray(payload && payload.questions)
    ? payload.questions
    : [];
  const managerRating = payload && payload.managerRating;
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
  renderManagerRating(managerRating);

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
  const totalCost = typeof usage.totalCostUsd === "number"
    ? usage.totalCostUsd
    : usage.estimatedTotalCostUsd || 0;
  elements.analyticsCost.textContent = formatApiUsd(totalCost);
  const transcriptionProvider = String(transcription.provider || "").trim();
  const transcriptionLabel = transcriptionProvider === "soniox"
    ? "Soniox"
    : transcriptionProvider === "openai"
      ? "OpenAI STT"
      : "Transcription";
  const unpricedTranscriptionCalls =
    Number(transcription.unpricedCalls || 0) +
    Number(transcription.missingModelCalls || 0);
  const providerCosts = usage.providerCosts || {};
  const costCaptionParts = [];
  const transcriptionCost = typeof transcription.costUsd === "number"
    ? transcription.costUsd
    : transcription.estimatedCostUsd;
  if (typeof transcriptionCost === "number") {
    const transcriptionSource = transcription.costSource === "provider_api"
      ? "фактично API"
      : "за тривалістю";
    const sonioxEntries = Number(providerCosts.soniox && providerCosts.soniox.entries || 0);
    const entryCaption = transcription.costSource === "provider_api" && sonioxEntries
      ? ` · ${formatNumber(sonioxEntries)} запитів`
      : "";
    costCaptionParts.push(
      `${transcriptionLabel}: ${formatApiUsd(transcriptionCost)} (${transcriptionSource}${entryCaption})`
    );
  }
  const openAiCost = typeof openAiSummary.costUsd === "number"
    ? openAiSummary.costUsd
    : openAiSummary.estimatedCostUsd || 0;
  const openAiSource = openAiSummary.costSource === "provider_api"
    ? "фактично API"
    : "за usage";
  costCaptionParts.push(`OpenAI: ${formatApiUsd(openAiCost)} (${openAiSource})`);
  if (providerCosts.openAi && providerCosts.openAi.reason === "not_configured") {
    costCaptionParts.push("OpenAI exact: потрібен Admin key");
  }
  if (providerCosts.soniox && providerCosts.soniox.coverageComplete === false) {
    costCaptionParts.push("Soniox exact: останні 31 днів");
  }
  if (unpricedTranscriptionCalls > 0) {
    costCaptionParts.push(`${formatNumber(unpricedTranscriptionCalls)} без ціни`);
  }
  if (Number(openAiSummary.unpricedCalls || 0) > 0) {
    costCaptionParts.push(`${formatNumber(openAiSummary.unpricedCalls || 0)} summary без тарифу`);
  }
  elements.analyticsCostCaption.textContent = costCaptionParts.join(" · ");
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
  stageMotionItems(elements.callTypeChart, ":scope > .call-type-row", { maxIndex: 7 });
  stageMotionItems(elements.customerQuestionChart, ":scope > .call-type-row", { maxIndex: 7 });
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

function callStatsValue(value) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function callStatsPercent(value) {
  return `${new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits: Number(value) % 1 === 0 ? 0 : 1
  }).format(callStatsValue(value))}%`;
}

function callStatsDecimal(value, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("uk-UA", {
    maximumFractionDigits
  }).format(callStatsValue(value));
}

function callStatsShare(part, total) {
  const whole = callStatsValue(total);
  return whole ? Math.round((callStatsValue(part) / whole) * 1000) / 10 : 0;
}

function callStatsAnswerTone(answered, total) {
  if (!callStatsValue(total)) {
    return "";
  }
  return callStatsShare(answered, total) < 85 ? "warning" : "good";
}

function callStatsRateTone(rate, total) {
  if (!callStatsValue(total)) {
    return "";
  }
  return callStatsValue(rate) < 85 ? "warning" : "good";
}

function callStatsDateLabel(value) {
  if (!value) {
    return "—";
  }

  return formatDate(value, { short: true });
}

function callStatsRangeText(payload) {
  const period = (payload && payload.period) || {};
  const summary = (payload && payload.summary) || {};
  const first = period.from || summary.firstCallAt;
  const rawTo = period.to || summary.lastCallAt;
  const to = period.to
    ? new Date(new Date(period.to).getTime() - 1).toISOString()
    : rawTo;

  if (!first && !to) {
    return "Дані ще не накопичені";
  }

  if (!first) {
    return `до ${callStatsDateLabel(to)}`;
  }

  if (!to) {
    return `від ${callStatsDateLabel(first)}`;
  }

  return `${callStatsDateLabel(first)} - ${callStatsDateLabel(to)}`;
}

function callStatsCssVar(name, fallback) {
  return getComputedStyle(document.body).getPropertyValue(name).trim() || fallback;
}

function callStatsChartPalette() {
  return {
    text: callStatsCssVar("--text", "#e7edf1"),
    muted: callStatsCssVar("--muted", "#9aabb4"),
    line: callStatsCssVar("--line", "#2d3c45"),
    accent: callStatsCssVar("--accent", "#4fb4d2"),
    incoming: callStatsCssVar("--call-incoming", "#53c58e"),
    outgoing: callStatsCssVar("--call-outgoing", "#7acfe8"),
    warning: callStatsCssVar("--warning", "#e2a73f"),
    danger: callStatsCssVar("--danger", "#f06b6b"),
    panel: callStatsCssVar("--panel-soft", "#1f2b33")
  };
}

function destroyCallStatsCharts() {
  for (const chart of callStatsCharts.values()) {
    chart.destroy();
  }
  callStatsCharts.clear();
}

function renderCallStatsChart(key, canvas, config) {
  if (!canvas || !window.Chart) {
    return;
  }

  const existing = callStatsCharts.get(key);
  if (existing) {
    existing.destroy();
  }

  callStatsCharts.set(key, new window.Chart(canvas, config));
}

function callStatsMetric(label, value, tone = "") {
  return { label, value, tone };
}

function setCallStatsFocus(focus = {}) {
  if (!elements.callStatsFocus) {
    return;
  }

  setCallStatsText(elements.callStatsFocusTitle, focus.title || "Загальна вибірка");
  setCallStatsText(elements.callStatsFocusSubtitle, focus.subtitle || "—");
  elements.callStatsFocus.dataset.tone = focus.tone || "neutral";

  if (!elements.callStatsFocusMetrics) {
    return;
  }

  elements.callStatsFocusMetrics.replaceChildren();
  const metrics = Array.isArray(focus.metrics) ? focus.metrics : [];
  if (!metrics.length) {
    const empty = document.createElement("span");
    empty.className = "call-stats-focus-chip";
    const value = document.createElement("b");
    value.textContent = "—";
    empty.append(value);
    elements.callStatsFocusMetrics.append(empty);
    stageMotionItems(elements.callStatsFocusMetrics, ":scope > .call-stats-focus-chip", { maxIndex: 0 });
    return;
  }

  for (const metric of metrics) {
    const chip = document.createElement("span");
    chip.className = "call-stats-focus-chip";
    if (metric.tone) {
      chip.dataset.tone = metric.tone;
    }
    const label = document.createElement("em");
    label.textContent = metric.label || "";
    const value = document.createElement("b");
    value.textContent = metric.value || "—";
    chip.append(label, value);
    elements.callStatsFocusMetrics.append(chip);
  }
  stageMotionItems(elements.callStatsFocusMetrics, ":scope > .call-stats-focus-chip", { maxIndex: 4 });
}

function clearCallStatsSelection() {
  document
    .querySelectorAll(".call-stats-is-selected")
    .forEach((item) => item.classList.remove("call-stats-is-selected"));
}

function selectCallStatsElement(element) {
  clearCallStatsSelection();
  if (element) {
    element.classList.add("call-stats-is-selected");
  }
}

function makeCallStatsInteractive(element, focus) {
  if (!element || !focus) {
    return;
  }

  element.classList.add("call-stats-interactive");
  element.tabIndex = 0;
  if (element.tagName !== "BUTTON") {
    element.setAttribute("role", "button");
  }
  element.title = [focus.title, focus.subtitle].filter(Boolean).join(" · ");

  const activate = () => {
    selectCallStatsElement(element);
    setCallStatsFocus(focus);
  };

  element.onclick = activate;
  element.onfocus = activate;
  element.onpointerenter = () => setCallStatsFocus(focus);
  element.onkeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activate();
    }
  };
}

function callStatsChartInteraction(rows, focusBuilder) {
  return {
    onHover(event, activeItems) {
      const target = event && event.native && event.native.target;
      if (target) {
        target.style.cursor = activeItems && activeItems.length ? "pointer" : "default";
      }
    },
    onClick(event, activeItems, chart) {
      const active = activeItems && activeItems[0];
      if (!active) {
        return;
      }

      const row = rows[active.index];
      if (!row) {
        return;
      }

      const dataset = chart && chart.data && chart.data.datasets
        ? chart.data.datasets[active.datasetIndex]
        : null;
      setCallStatsFocus(focusBuilder(row, active, dataset) || {});
    }
  };
}

function getCallStatsHeatmapTooltipElement() {
  if (callStatsHeatmapTooltipElement) {
    return callStatsHeatmapTooltipElement;
  }

  callStatsHeatmapTooltipElement = document.createElement("div");
  callStatsHeatmapTooltipElement.className = "call-stats-heatmap-tooltip";
  callStatsHeatmapTooltipElement.setAttribute("role", "tooltip");
  callStatsHeatmapTooltipElement.hidden = true;
  document.body.append(callStatsHeatmapTooltipElement);
  return callStatsHeatmapTooltipElement;
}

function getCallStatsHeatmapTooltipTrigger(target) {
  return target instanceof Element
    ? target.closest(".call-stats-heatmap-cell[data-tooltip]")
    : null;
}

function positionCallStatsHeatmapTooltip(
  trigger = activeCallStatsHeatmapTooltipTrigger
) {
  if (!trigger || !document.body.contains(trigger)) {
    hideCallStatsHeatmapTooltip();
    return;
  }

  const tooltip = getCallStatsHeatmapTooltipElement();
  if (tooltip.hidden) {
    return;
  }

  const margin = 10;
  const gap = 10;
  const triggerRect = trigger.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
  left = Math.max(margin, Math.min(left, viewportWidth - tooltipRect.width - margin));
  let top = triggerRect.top - tooltipRect.height - gap;
  let placement = "top";

  if (top < margin) {
    top = triggerRect.bottom + gap;
    placement = "bottom";
  }
  if (top + tooltipRect.height > viewportHeight - margin) {
    top = Math.max(margin, viewportHeight - tooltipRect.height - margin);
    placement = "clamped";
  }

  tooltip.dataset.placement = placement;
  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function showCallStatsHeatmapTooltip(trigger) {
  if (!trigger) {
    return;
  }

  const text = String(trigger.dataset.tooltip || "").trim();
  if (!text) {
    return;
  }

  const tooltip = getCallStatsHeatmapTooltipElement();
  activeCallStatsHeatmapTooltipTrigger = trigger;
  tooltip.textContent = text;
  tooltip.style.left = "0px";
  tooltip.style.top = "0px";
  tooltip.hidden = false;
  tooltip.classList.add("is-visible");
  positionCallStatsHeatmapTooltip(trigger);
}

function hideCallStatsHeatmapTooltip(trigger = null) {
  if (trigger && trigger !== activeCallStatsHeatmapTooltipTrigger) {
    return;
  }

  const tooltip = getCallStatsHeatmapTooltipElement();
  activeCallStatsHeatmapTooltipTrigger = null;
  tooltip.classList.remove("is-visible");
  tooltip.hidden = true;
}

function initCallStatsHeatmapTooltips() {
  if (callStatsHeatmapTooltipsReady) {
    return;
  }

  callStatsHeatmapTooltipsReady = true;
  document.addEventListener("mouseover", (event) => {
    const trigger = getCallStatsHeatmapTooltipTrigger(event.target);
    if (trigger) {
      showCallStatsHeatmapTooltip(trigger);
    }
  });
  document.addEventListener("mouseout", (event) => {
    const trigger = getCallStatsHeatmapTooltipTrigger(event.target);
    const relatedTarget = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (!trigger || (relatedTarget && trigger.contains(relatedTarget))) {
      return;
    }
    hideCallStatsHeatmapTooltip(trigger);
  });
  document.addEventListener("focusin", (event) => {
    const trigger = getCallStatsHeatmapTooltipTrigger(event.target);
    if (trigger) {
      showCallStatsHeatmapTooltip(trigger);
    }
  });
  document.addEventListener("focusout", (event) => {
    const trigger = getCallStatsHeatmapTooltipTrigger(event.target);
    if (trigger) {
      hideCallStatsHeatmapTooltip(trigger);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideCallStatsHeatmapTooltip();
    }
  });
  window.addEventListener("resize", () => positionCallStatsHeatmapTooltip());
  window.addEventListener("scroll", () => positionCallStatsHeatmapTooltip(), true);
}

function callStatsBaseChartOptions(extra = {}) {
  const colors = callStatsChartPalette();
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index"
    },
    plugins: {
      legend: {
        labels: {
          color: colors.muted,
          boxWidth: 12,
          boxHeight: 12,
          font: {
            family: "Montserrat, Segoe UI, sans-serif",
            weight: 800
          }
        }
      },
      tooltip: {
        backgroundColor: colors.panel,
        borderColor: colors.line,
        borderWidth: 1,
        titleColor: colors.text,
        bodyColor: colors.muted,
        padding: 12
      }
    },
    scales: {
      x: {
        ticks: {
          color: colors.muted,
          maxRotation: 0,
          font: {
            family: "Montserrat, Segoe UI, sans-serif",
            weight: 800
          }
        },
        grid: {
          color: colors.line
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: colors.muted,
          precision: 0,
          font: {
            family: "Montserrat, Segoe UI, sans-serif",
            weight: 800
          }
        },
        grid: {
          color: colors.line
        }
      }
    },
    ...extra
  };
}

function setCallStatsText(element, value) {
  if (element) {
    element.textContent = value;
  }
}

function callStatsOverviewFocus(payload) {
  const summary = (payload && payload.summary) || {};
  const totalCalls = callStatsValue(summary.totalCalls);
  const incomingCalls = callStatsValue(summary.incomingCalls);
  const outgoingCalls = callStatsValue(summary.outgoingCalls);
  const missedCalls = callStatsValue(summary.missedCalls);

  return {
    title: "Загальна вибірка",
    subtitle: callStatsRangeText(payload),
    metrics: [
      callStatsMetric("Дзвінки", formatNumber(totalCalls)),
      callStatsMetric("Вхідні", `${formatNumber(incomingCalls)} · ${callStatsPercent(summary.incomingShare)}`),
      callStatsMetric("Вихідні", `${formatNumber(outgoingCalls)} · ${callStatsPercent(summary.outgoingShare)}`),
      callStatsMetric("Відповіді", callStatsPercent(summary.answerRate), callStatsRateTone(summary.answerRate, totalCalls)),
      callStatsMetric("Пропущені", formatNumber(missedCalls), missedCalls ? "warning" : "good")
    ]
  };
}

function callStatsSummaryFocuses(payload) {
  const summary = (payload && payload.summary) || {};
  const totalCalls = callStatsValue(summary.totalCalls);
  const incomingCalls = callStatsValue(summary.incomingCalls);
  const outgoingCalls = callStatsValue(summary.outgoingCalls);
  const answeredCalls = callStatsValue(summary.answeredCalls);
  const missedCalls = callStatsValue(summary.missedCalls);
  const uniqueCustomers = callStatsValue(summary.uniqueCustomers);
  const recordingCalls = callStatsValue(summary.recordingCalls);
  const avgBillSec = callStatsValue(summary.avgBillSec);
  const avgWaitSec = callStatsValue(summary.avgWaitSec);
  const recordingShare = callStatsShare(recordingCalls, totalCalls);
  const callsPerCustomer = uniqueCustomers ? totalCalls / uniqueCustomers : 0;

  return [
    {
      title: "Усі дзвінки",
      subtitle: callStatsRangeText(payload),
      metrics: [
        callStatsMetric("Усього", formatNumber(totalCalls)),
        callStatsMetric("Середньо/день", callStatsDecimal(summary.avgCallsPerDay || 0)),
        callStatsMetric("Розмови", formatDuration(summary.totalBillSec || 0))
      ]
    },
    {
      title: "Вхідні дзвінки",
      subtitle: `${callStatsPercent(summary.incomingShare)} від усіх дзвінків`,
      metrics: [
        callStatsMetric("Вхідні", formatNumber(incomingCalls)),
        callStatsMetric("Пропущено", formatNumber(missedCalls), missedCalls ? "warning" : "good"),
        callStatsMetric("Пропущені %", callStatsPercent(callStatsShare(missedCalls, incomingCalls)), missedCalls ? "warning" : "good")
      ]
    },
    {
      title: "Вихідні дзвінки",
      subtitle: `${callStatsPercent(summary.outgoingShare)} від усіх дзвінків`,
      metrics: [
        callStatsMetric("Вихідні", formatNumber(outgoingCalls)),
        callStatsMetric("Частка", callStatsPercent(summary.outgoingShare)),
        callStatsMetric("Вхідні/вихідні", outgoingCalls ? callStatsDecimal(incomingCalls / outgoingCalls) : "—")
      ]
    },
    {
      title: "Відповіді",
      subtitle: `${formatNumber(answeredCalls)} відповіли · ${formatNumber(missedCalls)} пропущено`,
      metrics: [
        callStatsMetric("Рівень", callStatsPercent(summary.answerRate), callStatsRateTone(summary.answerRate, totalCalls)),
        callStatsMetric("Відповіли", formatNumber(answeredCalls)),
        callStatsMetric("Пропущено", formatNumber(missedCalls), missedCalls ? "warning" : "good")
      ]
    },
    {
      title: "Розмови",
      subtitle: `${formatNumber(summary.talkHours || 0)} год загалом`,
      metrics: [
        callStatsMetric("Сумарно", formatDuration(summary.totalBillSec || 0)),
        callStatsMetric("Середня", avgBillSec ? formatDuration(avgBillSec) : "—"),
        callStatsMetric("Дзвінків", formatNumber(totalCalls))
      ]
    },
    {
      title: "Середня розмова",
      subtitle: `очікування ${avgWaitSec ? formatDuration(avgWaitSec) : "—"}`,
      metrics: [
        callStatsMetric("Розмова", avgBillSec ? formatDuration(avgBillSec) : "—"),
        callStatsMetric("Очікування", avgWaitSec ? formatDuration(avgWaitSec) : "—"),
        callStatsMetric("Відповіді", callStatsPercent(summary.answerRate))
      ]
    },
    {
      title: "Клієнти",
      subtitle: "унікальні номери у вибірці",
      metrics: [
        callStatsMetric("Унікальні", formatNumber(uniqueCustomers)),
        callStatsMetric("Дзв./клієнт", callsPerCustomer ? callStatsDecimal(callsPerCustomer) : "—"),
        callStatsMetric("Усього дзв.", formatNumber(totalCalls))
      ]
    },
    {
      title: "Записи",
      subtitle: "дзвінки з записом або локальним кешем",
      metrics: [
        callStatsMetric("Записів", formatNumber(recordingCalls)),
        callStatsMetric("Покриття", callStatsPercent(recordingShare), recordingShare < 90 ? "warning" : "good"),
        callStatsMetric("Без запису", formatNumber(Math.max(0, totalCalls - recordingCalls)), recordingShare < 90 ? "warning" : "")
      ]
    }
  ];
}

function wireCallStatsSummaryCards(payload) {
  const cards = elements.callStatsPage
    ? [...elements.callStatsPage.querySelectorAll(".call-stats-summary > div")]
    : [];
  const focuses = callStatsSummaryFocuses(payload);
  cards.forEach((card, index) => makeCallStatsInteractive(card, focuses[index]));
  if (cards.length) {
    stageMotionItems(cards[0].parentElement, ":scope > div", { maxIndex: 7 });
  }
}

function renderCallStatsSummary(payload) {
  const summary = (payload && payload.summary) || {};
  const totalCalls = callStatsValue(summary.totalCalls);
  const incomingCalls = callStatsValue(summary.incomingCalls);
  const outgoingCalls = callStatsValue(summary.outgoingCalls);
  const answeredCalls = callStatsValue(summary.answeredCalls);
  const missedCalls = callStatsValue(summary.missedCalls);
  const totalBillSec = callStatsValue(summary.totalBillSec);
  const avgBillSec = callStatsValue(summary.avgBillSec);
  const avgWaitSec = callStatsValue(summary.avgWaitSec);

  setCallStatsText(elements.callStatsRange, callStatsRangeText(payload));
  setCallStatsText(elements.callStatsTotal, formatNumber(totalCalls));
  setCallStatsText(
    elements.callStatsTotalCaption,
    `${formatNumber(summary.avgCallsPerDay || 0)} дзвінків / день`
  );
  setCallStatsText(elements.callStatsIncoming, formatNumber(incomingCalls));
  setCallStatsText(elements.callStatsIncomingCaption, `${callStatsPercent(summary.incomingShare)} від усіх`);
  setCallStatsText(elements.callStatsOutgoing, formatNumber(outgoingCalls));
  setCallStatsText(elements.callStatsOutgoingCaption, `${callStatsPercent(summary.outgoingShare)} від усіх`);
  setCallStatsText(elements.callStatsAnswerRate, callStatsPercent(summary.answerRate));
  setCallStatsText(elements.callStatsAnswerCaption, `${formatNumber(answeredCalls)} відповіли · ${formatNumber(missedCalls)} пропущено`);
  setCallStatsText(elements.callStatsTalkTime, formatDuration(totalBillSec));
  setCallStatsText(elements.callStatsTalkCaption, `${formatNumber(summary.talkHours || 0)} год загалом`);
  setCallStatsText(elements.callStatsAvgDuration, avgBillSec ? formatDuration(avgBillSec) : "—");
  setCallStatsText(elements.callStatsAvgWait, `очікування ${avgWaitSec ? formatDuration(avgWaitSec) : "—"}`);
  setCallStatsText(elements.callStatsCustomers, formatNumber(summary.uniqueCustomers || 0));
  setCallStatsText(elements.callStatsCustomersCaption, "унікальні номери");
  setCallStatsText(elements.callStatsRecordings, formatNumber(summary.recordingCalls || 0));
  setCallStatsText(elements.callStatsRecordingsCaption, "мають запис/кеш");
  wireCallStatsSummaryCards(payload);
}

function callStatsDailyFocus(row, dataset) {
  const total = callStatsValue(row.totalCalls);
  return {
    title: callStatsDateLabel(row.dayStartedAt || row.dayKey),
    subtitle: dataset && dataset.label ? `Графік: ${dataset.label}` : "Дзвінки по днях",
    metrics: [
      callStatsMetric("Усього", formatNumber(total)),
      callStatsMetric("Вхідні", formatNumber(row.incomingCalls || 0)),
      callStatsMetric("Вихідні", formatNumber(row.outgoingCalls || 0)),
      callStatsMetric("Відповіли", formatNumber(row.answeredCalls || 0), callStatsAnswerTone(row.answeredCalls, total)),
      callStatsMetric("Пропущено", formatNumber(row.missedCalls || 0), row.missedCalls ? "warning" : "good"),
      callStatsMetric("Розмови", formatDuration(row.totalBillSec || 0))
    ]
  };
}

function callStatsHourlyFocus(row) {
  const total = callStatsValue(row.totalCalls);
  return {
    title: `${String(row.hour).padStart(2, "0")}:00`,
    subtitle: "Навантаження за годинами",
    metrics: [
      callStatsMetric("Дзвінки", formatNumber(total)),
      callStatsMetric("Відповіли", formatNumber(row.answeredCalls || 0), callStatsAnswerTone(row.answeredCalls, total)),
      callStatsMetric("Розмови", formatDuration(row.totalBillSec || 0)),
      callStatsMetric("Середня", total ? formatDuration(Math.round(callStatsValue(row.totalBillSec) / total)) : "—")
    ]
  };
}

function callStatsCompactFocus(row, titleFallback, subtitle) {
  const total = callStatsValue(row.totalCalls);
  const metrics = [
    callStatsMetric("Дзвінки", formatNumber(total)),
    callStatsMetric(
      "Частка",
      callStatsPercent(callStatsShare(total, currentCallStats && currentCallStats.summary && currentCallStats.summary.totalCalls))
    )
  ];
  if (callStatsValue(row.incomingCalls) || callStatsValue(row.outgoingCalls)) {
    metrics.push(
      callStatsMetric("Вхідні", formatNumber(row.incomingCalls || 0)),
      callStatsMetric("Вихідні", formatNumber(row.outgoingCalls || 0))
    );
  }
  if (row.answeredCalls !== undefined) {
    metrics.push(
      callStatsMetric("Відповіли", formatNumber(row.answeredCalls || 0), callStatsAnswerTone(row.answeredCalls, total))
    );
  }
  if (row.totalBillSec !== undefined) {
    metrics.push(callStatsMetric("Розмови", formatDuration(row.totalBillSec || 0)));
  }

  return {
    title: row.label || titleFallback || "—",
    subtitle,
    metrics
  };
}

function callStatsDurationFocus(row) {
  const total = callStatsValue(row.totalCalls);
  const allCalls = currentCallStats && currentCallStats.summary
    ? currentCallStats.summary.totalCalls
    : 0;
  return {
    title: row.label || row.bucket || "—",
    subtitle: "Сегмент тривалості розмов",
    metrics: [
      callStatsMetric("Дзвінки", formatNumber(total)),
      callStatsMetric("Частка", callStatsPercent(callStatsShare(total, allCalls))),
      callStatsMetric("Сегмент", row.bucket || "—")
    ]
  };
}

function renderCallStatsCharts(payload) {
  destroyCallStatsCharts();

  const colors = callStatsChartPalette();
  const daily = Array.isArray(payload && payload.daily) ? payload.daily : [];
  renderCallStatsChart("daily", elements.callStatsDailyChart, {
    type: "line",
    data: {
      labels: daily.map((item) => item.dayKey || callStatsDateLabel(item.dayStartedAt)),
      datasets: [
        {
          label: "Усі",
          data: daily.map((item) => callStatsValue(item.totalCalls)),
          borderColor: colors.accent,
          backgroundColor: "rgba(79, 180, 210, 0.16)",
          tension: 0.34,
          fill: true,
          pointRadius: 3
        },
        {
          label: "Вхідні",
          data: daily.map((item) => callStatsValue(item.incomingCalls)),
          borderColor: colors.incoming,
          backgroundColor: "rgba(83, 197, 142, 0.12)",
          tension: 0.34
        },
        {
          label: "Вихідні",
          data: daily.map((item) => callStatsValue(item.outgoingCalls)),
          borderColor: colors.outgoing,
          backgroundColor: "rgba(122, 207, 232, 0.12)",
          tension: 0.34
        }
      ]
    },
    options: callStatsBaseChartOptions({
      ...callStatsChartInteraction(daily, (row, active, dataset) =>
        callStatsDailyFocus(row, dataset)
      )
    })
  });

  const hourlyMap = new Map((payload.hourly || []).map((item) => [Number(item.hour), item]));
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    ...(hourlyMap.get(hour) || {})
  }));
  renderCallStatsChart("hourly", elements.callStatsHourlyChart, {
    type: "bar",
    data: {
      labels: hours.map((item) => String(item.hour).padStart(2, "0")),
      datasets: [
        {
          label: "Дзвінки",
          data: hours.map((item) => callStatsValue(item.totalCalls)),
          backgroundColor: colors.accent,
          borderRadius: 7
        }
      ]
    },
    options: callStatsBaseChartOptions({
      ...callStatsChartInteraction(hours, (row) => callStatsHourlyFocus(row)),
      plugins: {
        ...callStatsBaseChartOptions().plugins,
        legend: {
          display: false
        }
      }
    })
  });

  const directions = Array.isArray(payload.directions) ? payload.directions : [];
  renderCallStatsChart("direction", elements.callStatsDirectionChart, {
    type: "doughnut",
    data: {
      labels: directions.map((item) => item.label || item.direction || "—"),
      datasets: [
        {
          data: directions.map((item) => callStatsValue(item.totalCalls)),
          backgroundColor: [colors.incoming, colors.outgoing, colors.warning],
          borderColor: colors.panel,
          borderWidth: 3
        }
      ]
    },
    options: callStatsBaseChartOptions({
      ...callStatsChartInteraction(directions, (row) =>
        callStatsCompactFocus(row, row.direction || "Напрямок", "Вхідні / вихідні")
      ),
      cutout: "64%",
      scales: {},
      plugins: {
        ...callStatsBaseChartOptions().plugins,
        legend: {
          position: "bottom",
          labels: callStatsBaseChartOptions().plugins.legend.labels
        }
      }
    })
  });

  const dispositions = (payload.dispositions || []).slice(0, 8);
  renderCallStatsChart("disposition", elements.callStatsDispositionChart, {
    type: "bar",
    data: {
      labels: dispositions.map((item) => item.label || "—"),
      datasets: [
        {
          label: "Дзвінки",
          data: dispositions.map((item) => callStatsValue(item.totalCalls)),
          backgroundColor: dispositions.map((_, index) =>
            [colors.incoming, colors.accent, colors.warning, colors.danger][index % 4]
          ),
          borderRadius: 7
        }
      ]
    },
    options: callStatsBaseChartOptions({
      ...callStatsChartInteraction(dispositions, (row) =>
        callStatsCompactFocus(row, "Статус", "Результати дзвінків")
      ),
      indexAxis: "y",
      plugins: {
        ...callStatsBaseChartOptions().plugins,
        legend: {
          display: false
        }
      }
    })
  });

  const buckets = Array.isArray(payload.durationBuckets) ? payload.durationBuckets : [];
  renderCallStatsChart("duration", elements.callStatsDurationChart, {
    type: "bar",
    data: {
      labels: buckets.map((item) => item.label || item.bucket || "—"),
      datasets: [
        {
          label: "Дзвінки",
          data: buckets.map((item) => callStatsValue(item.totalCalls)),
          backgroundColor: colors.outgoing,
          borderRadius: 7
        }
      ]
    },
    options: callStatsBaseChartOptions({
      ...callStatsChartInteraction(buckets, (row) => callStatsDurationFocus(row)),
      plugins: {
        ...callStatsBaseChartOptions().plugins,
        legend: {
          display: false
        }
      }
    })
  });
}

function renderCallStatsHeatmap(payload) {
  if (!elements.callStatsHeatmap) {
    return;
  }

  elements.callStatsHeatmap.replaceChildren();
  const rows = Array.isArray(payload && payload.heatmap) ? payload.heatmap : [];
  const maxCalls = Math.max(1, ...rows.map((row) => callStatsValue(row.totalCalls)));
  const byKey = new Map(rows.map((row) => [`${row.weekday}:${row.hour}`, row]));
  const hourHeader = document.createElement("div");
  hourHeader.className = "call-stats-heatmap-hours";
  hourHeader.innerHTML = `<span></span>${Array.from({ length: 24 }, (_, hour) =>
    `<b>${hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}</b>`
  ).join("")}`;
  elements.callStatsHeatmap.append(hourHeader);

  for (let weekday = 1; weekday <= 7; weekday += 1) {
    const row = document.createElement("div");
    row.className = "call-stats-heatmap-row";
    const label = document.createElement("span");
    label.textContent = CALL_STATS_WEEKDAYS[weekday - 1];
    row.append(label);

    for (let hour = 0; hour < 24; hour += 1) {
      const value = byKey.get(`${weekday}:${hour}`);
      const total = callStatsValue(value && value.totalCalls);
      const billSec = callStatsValue(value && value.totalBillSec);
      const intensity = Math.min(1, total / maxCalls);
      const hourLabel = `${CALL_STATS_WEEKDAYS[weekday - 1]} ${String(hour).padStart(2, "0")}:00`;
      const tooltip = [
        hourLabel,
        `${formatNumber(total)} дзвінків`,
        `Розмови: ${formatDuration(billSec)}`,
        `Середня: ${total ? formatDuration(Math.round(billSec / total)) : "—"}`
      ].join("\n");
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "call-stats-heatmap-cell";
      cell.style.setProperty("--heatmap-intensity", intensity.toFixed(3));
      cell.dataset.tooltip = tooltip;
      cell.setAttribute("aria-label", tooltip);
      makeCallStatsInteractive(cell, {
        title: hourLabel,
        subtitle: "Активність по днях і годинах",
        metrics: [
          callStatsMetric("Дзвінки", formatNumber(total)),
          callStatsMetric("Розмови", formatDuration(billSec)),
          callStatsMetric("Середня", total ? formatDuration(Math.round(billSec / total)) : "—")
        ]
      });
      cell.removeAttribute("title");
      row.append(cell);
    }

    elements.callStatsHeatmap.append(row);
  }
  stageMotionItems(elements.callStatsHeatmap, ":scope > .call-stats-heatmap-row", { maxIndex: 7 });
}

function renderCallStatsManagers(payload) {
  const table = elements.callStatsManagers;
  if (!table) {
    return;
  }

  table.replaceChildren();
  const managers = Array.isArray(payload && payload.managers) ? payload.managers : [];
  const head = document.createElement("thead");
  head.innerHTML = `
    <tr>
      <th>Менеджер</th>
      <th>Усі</th>
      <th>Вхідні</th>
      <th>Вихідні</th>
      <th>Відповіді</th>
      <th>Пропущено</th>
      <th>Розмова</th>
      <th>Очікування</th>
      <th>Клієнти</th>
      <th>Останній</th>
    </tr>`;
  table.append(head);

  const body = document.createElement("tbody");
  if (!managers.length) {
    body.innerHTML = `<tr><td colspan="10" class="call-stats-empty-cell">За цей період немає дзвінків.</td></tr>`;
    table.append(body);
    stageMotionItems(body, ":scope > tr", { maxIndex: 0 });
    return;
  }

  for (const manager of managers) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <strong>${escapeHtml(manager.label || "Оператор не визначений")}</strong>
        <span>${escapeHtml([manager.internalNumber, manager.pbxName].filter(Boolean).join(" · ") || "без внутрішнього номера")}</span>
      </td>
      <td>${formatNumber(manager.totalCalls)}</td>
      <td>${formatNumber(manager.incomingCalls)}</td>
      <td>${formatNumber(manager.outgoingCalls)}</td>
      <td>
        <strong>${callStatsPercent(manager.answerRate)}</strong>
        <span>${formatNumber(manager.answeredCalls)} дзв.</span>
      </td>
      <td>${formatNumber(manager.missedCalls)}</td>
      <td>${formatDuration(manager.avgBillSec || 0)}</td>
      <td>${formatDuration(manager.avgWaitSec || 0)}</td>
      <td>${formatNumber(manager.uniqueCustomers)}</td>
      <td>${formatDateTime(manager.lastCallAt)}</td>`;
    makeCallStatsInteractive(row, {
      title: manager.label || "Оператор не визначений",
      subtitle: [manager.internalNumber, manager.pbxName].filter(Boolean).join(" · ") || "без внутрішнього номера",
      metrics: [
        callStatsMetric("Дзвінки", formatNumber(manager.totalCalls || 0)),
        callStatsMetric("Відповіді", callStatsPercent(manager.answerRate), callStatsRateTone(manager.answerRate, manager.totalCalls)),
        callStatsMetric("Пропущено", formatNumber(manager.missedCalls || 0), manager.missedCalls ? "warning" : "good"),
        callStatsMetric("Середня розмова", formatDuration(manager.avgBillSec || 0)),
        callStatsMetric("Клієнти", formatNumber(manager.uniqueCustomers || 0)),
        callStatsMetric("Останній", formatDateTime(manager.lastCallAt))
      ]
    });
    body.append(row);
  }
  table.append(body);
  stageMotionItems(body, ":scope > tr", { maxIndex: 8 });
}

function renderCallStatsList(container, items, options = {}) {
  if (!container) {
    return;
  }

  container.replaceChildren();
  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    const empty = document.createElement("p");
    empty.className = "no-data";
    empty.textContent = "Немає даних за вибраний період.";
    container.append(empty);
    stageMotionItems(container, ":scope > .no-data", { maxIndex: 0 });
    return;
  }

  const maxCalls = Math.max(1, ...list.map((item) => callStatsValue(item.totalCalls)));
  for (const item of list.slice(0, 12)) {
    const total = callStatsValue(item.totalCalls);
    const row = document.createElement("article");
    row.className = "call-stats-list-row";
    row.style.setProperty("--bar-width", `${Math.round((total / maxCalls) * 100)}%`);
    const title = options.kind === "phone"
      ? formatCallPhone(item.phone || item.externalDigits)
      : item.label || item.number || item.internalNumber || "—";
    const subtitle = options.kind === "phone"
      ? `вх. ${formatNumber(item.incomingCalls)} · вих. ${formatNumber(item.outgoingCalls)} · останній ${formatDateTime(item.lastCallAt)}`
      : [item.number, item.internalNumber]
          .filter(Boolean)
          .join(" · ") || `вх. ${formatNumber(item.incomingCalls)} · вих. ${formatNumber(item.outgoingCalls)}`;
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(subtitle)}</span>
      </div>
      <b>${formatNumber(total)}</b>`;
    makeCallStatsInteractive(
      row,
      typeof options.focusBuilder === "function"
        ? options.focusBuilder(item, title, subtitle)
        : {
            title,
            subtitle,
            metrics: [
              callStatsMetric("Дзвінки", formatNumber(total)),
              callStatsMetric("Вхідні", formatNumber(item.incomingCalls || 0)),
              callStatsMetric("Вихідні", formatNumber(item.outgoingCalls || 0)),
              callStatsMetric("Розмови", formatDuration(item.totalBillSec || 0))
            ]
          }
    );
    container.append(row);
  }
  stageMotionItems(container, ":scope > .call-stats-list-row", { maxIndex: 8 });
}

function callStatsMaxBy(items, valueGetter) {
  return (Array.isArray(items) ? items : []).reduce((best, item) => {
    if (!best) {
      return item;
    }
    return callStatsValue(valueGetter(item)) > callStatsValue(valueGetter(best))
      ? item
      : best;
  }, null);
}

function callStatsInsightRows(payload) {
  const summary = (payload && payload.summary) || {};
  const totalCalls = callStatsValue(summary.totalCalls);
  const incomingCalls = callStatsValue(summary.incomingCalls);
  const missedCalls = callStatsValue(summary.missedCalls);
  const uniqueCustomers = callStatsValue(summary.uniqueCustomers);
  const recordingCalls = callStatsValue(summary.recordingCalls);
  const missedIncomingShare = callStatsShare(missedCalls, incomingCalls);
  const recordingShare = callStatsShare(recordingCalls, totalCalls);
  const buckets = Array.isArray(payload && payload.durationBuckets) ? payload.durationBuckets : [];
  const shortCalls = buckets
    .filter((item) => item.bucket === "0" || item.bucket === "1-30")
    .reduce((sum, item) => sum + callStatsValue(item.totalCalls), 0);
  const shortShare = callStatsShare(shortCalls, totalCalls);
  const peak = callStatsMaxBy(payload && payload.heatmap, (item) => item.totalCalls) || {};
  const peakWeekday = peak.weekday ? CALL_STATS_WEEKDAYS[peak.weekday - 1] : "—";
  const peakHour = Number.isFinite(Number(peak.hour))
    ? `${String(peak.hour).padStart(2, "0")}:00`
    : "—";
  const topManager = Array.isArray(payload && payload.managers) && payload.managers.length
    ? payload.managers[0]
    : null;
  const topManagerShare = topManager ? callStatsShare(topManager.totalCalls, totalCalls) : 0;
  const callsPerCustomer = uniqueCustomers ? totalCalls / uniqueCustomers : 0;

  return [
    {
      title: "Пропущені вхідні",
      subtitle: `${callStatsPercent(missedIncomingShare)} від вхідних`,
      value: formatNumber(missedCalls),
      score: missedIncomingShare,
      tone: missedCalls ? "warning" : "good",
      focus: {
        title: "Пропущені вхідні",
        subtitle: "Ризик втрати контакту на першому вході",
        metrics: [
          callStatsMetric("Пропущено", formatNumber(missedCalls), missedCalls ? "warning" : "good"),
          callStatsMetric("Вхідні", formatNumber(incomingCalls)),
          callStatsMetric("Частка", callStatsPercent(missedIncomingShare), missedCalls ? "warning" : "good")
        ]
      }
    },
    {
      title: "Короткі контакти",
      subtitle: `0-30 с · ${callStatsPercent(shortShare)} від усіх`,
      value: formatNumber(shortCalls),
      score: shortShare,
      tone: shortShare > 20 ? "warning" : "",
      focus: {
        title: "Короткі контакти",
        subtitle: "Дзвінки, де розмова майже не відбулась",
        metrics: [
          callStatsMetric("0-30 с", formatNumber(shortCalls), shortShare > 20 ? "warning" : ""),
          callStatsMetric("Частка", callStatsPercent(shortShare), shortShare > 20 ? "warning" : ""),
          callStatsMetric("Усього", formatNumber(totalCalls))
        ]
      }
    },
    {
      title: "Пікова година",
      subtitle: `${peakWeekday} · ${formatNumber(peak.totalCalls || 0)} дзвінків`,
      value: peakHour,
      score: 100,
      tone: "info",
      focus: {
        title: `Пік: ${peakWeekday} ${peakHour}`,
        subtitle: "Найбільше навантаження в тепловій карті",
        metrics: [
          callStatsMetric("Дзвінки", formatNumber(peak.totalCalls || 0)),
          callStatsMetric("Розмови", formatDuration(peak.totalBillSec || 0)),
          callStatsMetric("Середня", peak.totalCalls ? formatDuration(Math.round(callStatsValue(peak.totalBillSec) / callStatsValue(peak.totalCalls))) : "—")
        ]
      }
    },
    {
      title: "Покриття записами",
      subtitle: `${formatNumber(recordingCalls)} з ${formatNumber(totalCalls)} дзвінків`,
      value: callStatsPercent(recordingShare),
      score: recordingShare,
      tone: recordingShare < 90 ? "warning" : "good",
      focus: {
        title: "Покриття записами",
        subtitle: "Скільки дзвінків доступні для прослуховування та AI-аналізу",
        metrics: [
          callStatsMetric("Покриття", callStatsPercent(recordingShare), recordingShare < 90 ? "warning" : "good"),
          callStatsMetric("Є запис", formatNumber(recordingCalls)),
          callStatsMetric("Без запису", formatNumber(Math.max(0, totalCalls - recordingCalls)), recordingShare < 90 ? "warning" : "")
        ]
      }
    },
    {
      title: "Навантаження топ-менеджера",
      subtitle: topManager ? topManager.label || "Оператор не визначений" : "немає даних",
      value: callStatsPercent(topManagerShare),
      score: topManagerShare,
      tone: topManagerShare > 45 ? "warning" : "",
      focus: {
        title: "Навантаження топ-менеджера",
        subtitle: topManager ? topManager.label || "Оператор не визначений" : "немає даних",
        metrics: [
          callStatsMetric("Частка", callStatsPercent(topManagerShare), topManagerShare > 45 ? "warning" : ""),
          callStatsMetric("Дзвінки", formatNumber(topManager && topManager.totalCalls || 0)),
          callStatsMetric("Відповіді", topManager ? callStatsPercent(topManager.answerRate) : "—", topManager ? callStatsRateTone(topManager.answerRate, topManager.totalCalls) : "")
        ]
      }
    },
    {
      title: "Дзвінків на клієнта",
      subtitle: `${formatNumber(uniqueCustomers)} унікальних номерів`,
      value: callsPerCustomer ? callStatsDecimal(callsPerCustomer) : "—",
      score: Math.min(100, callsPerCustomer * 25),
      tone: callsPerCustomer > 2.5 ? "info" : "",
      focus: {
        title: "Дзвінків на клієнта",
        subtitle: "Щільність повторних контактів без списку персональних номерів",
        metrics: [
          callStatsMetric("Дзв./клієнт", callsPerCustomer ? callStatsDecimal(callsPerCustomer) : "—"),
          callStatsMetric("Клієнти", formatNumber(uniqueCustomers)),
          callStatsMetric("Усього дзв.", formatNumber(totalCalls))
        ]
      }
    }
  ];
}

function renderCallStatsInsights(payload) {
  const container = elements.callStatsInsights;
  if (!container) {
    return;
  }

  container.replaceChildren();
  for (const insight of callStatsInsightRows(payload)) {
    const row = document.createElement("article");
    row.className = "call-stats-list-row";
    if (insight.tone) {
      row.dataset.tone = insight.tone;
    }
    row.style.setProperty("--bar-width", `${Math.max(4, Math.min(100, Math.round(callStatsValue(insight.score))))}%`);

    const content = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = insight.title;
    const subtitle = document.createElement("span");
    subtitle.textContent = insight.subtitle;
    content.append(title, subtitle);

    const value = document.createElement("b");
    value.textContent = insight.value;
    row.append(content, value);
    makeCallStatsInteractive(row, insight.focus);
    container.append(row);
  }
  stageMotionItems(container, ":scope > .call-stats-list-row", { maxIndex: 6 });
}

function renderCallStats(payload) {
  currentCallStats = payload || {};
  clearCallStatsSelection();
  renderCallStatsSummary(currentCallStats);
  setCallStatsFocus(callStatsOverviewFocus(currentCallStats));
  renderCallStatsCharts(currentCallStats);
  renderCallStatsHeatmap(currentCallStats);
  renderCallStatsManagers(currentCallStats);
  renderCallStatsList(elements.callStatsLines, currentCallStats.lines, { kind: "line" });
  renderCallStatsInsights(currentCallStats);
}

function renderCallStatsError(message) {
  destroyCallStatsCharts();
  renderCallStats({
    period: {},
    summary: {},
    daily: [],
    hourly: [],
    directions: [],
    dispositions: [],
    durationBuckets: [],
    managers: [],
    lines: [],
    topExternalNumbers: [],
    heatmap: []
  });
  setCallStatsText(elements.callStatsRange, message || "Не вдалося завантажити статистику.");
}

function updateCallStatsCustomFields() {
  const isCustom = elements.callStatsPeriod && elements.callStatsPeriod.value === "custom";
  if (elements.callStatsFilter) {
    elements.callStatsFilter.dataset.custom = String(isCustom);
  }
  if (elements.callStatsFrom) {
    elements.callStatsFrom.disabled = !isCustom;
  }
  if (elements.callStatsTo) {
    elements.callStatsTo.disabled = !isCustom;
  }
}

function callStatsApiUrl() {
  const params = new URLSearchParams();
  const period = elements.callStatsPeriod ? elements.callStatsPeriod.value : "30";
  params.set("period", period);
  if (period === "custom") {
    if (elements.callStatsFrom && elements.callStatsFrom.value) {
      params.set("from", elements.callStatsFrom.value);
    }
    if (elements.callStatsTo && elements.callStatsTo.value) {
      params.set("to", elements.callStatsTo.value);
    }
  }
  return `/api/binotel-monitor/call-statistics?${params.toString()}`;
}

async function loadCallStatsPage(showLoading = true) {
  clearTimeout(summaryPollTimer);
  clearTimeout(monitorPollTimer);
  clearTimeout(detailPollTimer);
  currentSummaryCallId = "";
  currentPhone = "";
  updateCallStatsCustomFields();

  if (showLoading) {
    setState("loading");
  }

  try {
    const response = await apiFetch(callStatsApiUrl(), {
      headers: { Accept: "application/json" }
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Не вдалося завантажити статистику дзвінків");
    }
    renderCallStats(payload);
    setState("callStats");
  } catch (error) {
    renderCallStatsError(error.message);
    setState("callStats");
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
    syncCustomSelect(elements.monitorPageSize);
  }
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  if (total > 0 && monitorPage > totalPages) {
    monitorPage = totalPages;
    loadMonitor(false);
    return;
  }
  elements.monitorList.replaceChildren();
  const maxStoredCalls = Number(payload && payload.maxStoredCalls) || 0;
  const historyLimited = Boolean(payload && payload.historyLimited);
  const displayedTotal = total || calls.length;
  const countPrefix = historyLimited && maxStoredCalls > 0 && displayedTotal >= maxStoredCalls
    ? `останні ${displayedTotal}`
    : `${displayedTotal}`;
  elements.monitorCountLabel.textContent =
    `${countPrefix} дзвінків у локальній історії`;

  if (!calls.length) {
    const message = document.createElement("p");
    message.className = "no-data";
    message.textContent = "У локальній історії дзвінків ще немає.";
    elements.monitorList.append(message);
    stageMotionItems(elements.monitorList, ":scope > .no-data", { maxIndex: 0 });
    renderMonitorPagination();
    return;
  }

  for (const call of calls) {
    appendMonitorCall(elements.monitorList, call);
  }
  stageMotionItems(elements.monitorList, ":scope > .monitor-call-link", { maxIndex: 8 });

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
  stageMotionItems(elements.monitorPageNumbers, ":scope > .monitor-page-button", { maxIndex: 6 });
}

function isEscalationProblem(escalation) {
  return Boolean(escalation && escalation.needed && escalation.level !== "none");
}

function isChurnRiskProblem(churnRisk) {
  const level = String(churnRisk && churnRisk.level || "").toLowerCase();
  return level === "medium" || level === "high";
}

function appendMonitorAlertBadge(container, textValue, tone, title) {
  const badge = document.createElement("span");
  badge.className = "monitor-alert-badge";
  badge.dataset.tone = tone || "warning";
  badge.textContent = textValue;
  if (title) {
    badge.title = title;
  }
  container.append(badge);
}

function renderMonitorProblemBadges(container, summary) {
  if (!container) {
    return 0;
  }

  container.replaceChildren();
  const escalation = summary && summary.escalation;
  const churnRisk = summary && summary.churnRisk;
  let count = 0;

  if (isEscalationProblem(escalation)) {
    const level = ESCALATION_LEVEL_LABELS[escalation.level] || escalation.level || "";
    appendMonitorAlertBadge(
      container,
      ["Ескалація", level].filter(Boolean).join(": "),
      escalationToneValue(escalation),
      escalationText(escalation)
    );
    count += 1;
  }

  if (isChurnRiskProblem(churnRisk)) {
    const level = CHURN_RISK_LABELS[churnRisk.level] || churnRisk.level || "";
    appendMonitorAlertBadge(
      container,
      ["Ризик", level].filter(Boolean).join(": "),
      churnRiskToneValue(churnRisk),
      churnRiskText(churnRisk)
    );
    count += 1;
  }

  container.hidden = count === 0;
  return count;
}

function appendMonitorCall(container, call) {
  const fragment = elements.monitorCallTemplate.content.cloneNode(true);
  const ai = call.ai || {};
  const summary = ai.summary || null;
  const direction = callDirectionInfo(call);
  const disposition = callDispositionInfo(call);
  const typeLabel = callTypeLabel(summary);
  const typeKey = summary && summary.callType;
  const detailLink = fragment.querySelector('[data-field="detail-link"]');
  const typeElement = fragment.querySelector('[data-field="type"]');
  const alertsElement = fragment.querySelector('[data-field="alerts"]');
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
  const alertCount = renderMonitorProblemBadges(alertsElement, summary);
  detailLink.classList.toggle("is-problem", alertCount > 0);
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

function currentDetailMetricFeedbackItems() {
  const ai = currentDetailCall && currentDetailCall.ai;
  return Array.isArray(ai && ai.metricFeedback) ? ai.metricFeedback : [];
}

function metricFeedbackForKey(metricKey) {
  const key = String(metricKey || "").trim();
  return currentDetailMetricFeedbackItems().find(
    (item) => String(item && item.metricKey || "").trim() === key
  ) || null;
}

function currentDetailMetrics() {
  const summary = currentDetailCall && currentDetailCall.ai && currentDetailCall.ai.summary;
  const customEvaluation = summary && summary.customEvaluation;
  return Array.isArray(customEvaluation && customEvaluation.metrics)
    ? customEvaluation.metrics
    : [];
}

function currentDetailMetricByKey(metricKey) {
  const key = String(metricKey || "").trim();
  return currentDetailMetrics().find(
    (metric) => String(metric && metric.metricKey || "").trim() === key
  ) || null;
}

function feedbackAuthorLabel(feedback) {
  const updatedBy = feedback && feedback.updatedBy || {};
  const createdBy = feedback && feedback.createdBy || {};
  return (
    updatedBy.name ||
    updatedBy.username ||
    createdBy.name ||
    createdBy.username ||
    "Менеджер"
  );
}

function feedbackMetaText(feedback) {
  if (!feedback) {
    return "";
  }
  return [feedbackAuthorLabel(feedback), formatDateTime(feedback.updatedAt)]
    .filter(Boolean)
    .join(" · ");
}

function feedbackAppliedText(feedback) {
  const promptUpdate = metricFeedbackPromptUpdate(feedback);
  if (!promptUpdate || !promptUpdate.appliedAt) {
    return "";
  }
  return `Застосована${formatDateTime(promptUpdate.appliedAt) ? ` · ${formatDateTime(promptUpdate.appliedAt)}` : ""}`;
}

function createQualityMetricElement(metric) {
  const item = document.createElement("article");
  item.className = `quality-item quality-metric-item quality-${metricScoreLevel(metric)}`;
  item.style.setProperty("--metric-color", safeMetricColor(metric.color));
  item.dataset.metricKey = metric.metricKey || "";
  const feedback = metricFeedbackForKey(metric.metricKey);
  item.classList.toggle("has-feedback", Boolean(feedback));

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

  const actions = document.createElement("div");
  actions.className = "quality-metric-actions";
  const feedbackButton = document.createElement("button");
  feedbackButton.className = "quality-feedback-button";
  feedbackButton.type = "button";
  feedbackButton.dataset.metricFeedbackAction = "open";
  feedbackButton.dataset.metricKey = metric.metricKey || "";
  feedbackButton.setAttribute(
    "aria-label",
    feedback ? "Редагувати примітку до метрики" : "Додати примітку до метрики"
  );
  feedbackButton.title = feedback ? "Редагувати примітку" : "Додати примітку";
  feedbackButton.innerHTML = aiIcon("edit");
  actions.append(score, feedbackButton);

  header.append(titleWrap, actions);
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

  if (feedback && feedback.text) {
    const note = document.createElement("section");
    note.className = "quality-feedback-note";
    const caption = document.createElement("strong");
    caption.textContent = "Коментар менеджера";
    const body = document.createElement("p");
    body.textContent = feedback.text;
    const meta = document.createElement("small");
    meta.textContent = feedbackMetaText(feedback);
    note.append(caption, body);
    if (meta.textContent) {
      note.append(meta);
    }
    const appliedText = feedbackAppliedText(feedback);
    if (appliedText) {
      const applied = document.createElement("span");
      applied.className = "quality-feedback-applied";
      applied.textContent = appliedText;
      note.append(applied);
    }
    item.append(note);
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
    stageMotionItems(elements.detailQualityContext, ":scope > .quality-context-item", { maxIndex: 5 });
    stageMotionItems(elements.detailQualityCriteria, ":scope > .quality-metric-group", { maxIndex: 5 });
    stageMotionItems(elements.detailQualityNotes, ":scope > div", { maxIndex: 4 });
    return;
  }

  if (!evaluation) {
    elements.detailQualityScore.textContent = "—";
    elements.detailQualityScore.className = "quality-score quality-empty";
    elements.detailQualitySummary.textContent =
      "Оцінка зʼявиться після повторного AI-аналізу дзвінка.";
    stageMotionItems(elements.detailQualityContext, ":scope > .quality-context-item", { maxIndex: 3 });
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
  stageMotionItems(elements.detailQualityContext, ":scope > .quality-context-item", { maxIndex: 3 });
  stageMotionItems(elements.detailQualityCriteria, ":scope > .quality-item", { maxIndex: 5 });
  stageMotionItems(elements.detailQualityNotes, ":scope > div", { maxIndex: 4 });
}

function setMetricFeedbackMessage(message, tone = "") {
  setMessage(elements.metricFeedbackMessage, message, tone);
}

function openMetricFeedbackModal(metricKey) {
  const metric = currentDetailMetricByKey(metricKey);
  if (!metric || !currentDetailCall) {
    return;
  }

  const feedback = metricFeedbackForKey(metric.metricKey);
  const ai = currentDetailCall.ai || {};
  metricFeedbackState.callId = String(
    ai.callId ||
    ai.generalCallId ||
    currentDetailCall.generalCallId ||
    currentDetailCallId ||
    ""
  ).trim();
  metricFeedbackState.metricKey = String(metric.metricKey || "").trim();
  metricFeedbackState.saving = false;
  metricFeedbackState.deleting = false;

  if (elements.metricFeedbackTitle) {
    elements.metricFeedbackTitle.textContent = metric.metricLabel || metric.metricKey || "Метрика";
  }
  if (elements.metricFeedbackSubtitle) {
    elements.metricFeedbackSubtitle.textContent = [
      metric.selectedOptionLabel || "Варіант не вибрано",
      metricPointScore(metric),
      ai.summary && (ai.summary.callTypeLabel || ai.summary.callType)
    ].filter(Boolean).join(" · ");
  }
  if (elements.metricFeedbackText) {
    elements.metricFeedbackText.value = feedback && feedback.text ? feedback.text : "";
  }
  if (elements.metricFeedbackSubmit) {
    elements.metricFeedbackSubmit.disabled = false;
    elements.metricFeedbackSubmit.textContent = feedback ? "Оновити" : "Зберегти";
  }
  if (elements.metricFeedbackDelete) {
    elements.metricFeedbackDelete.classList.toggle("hidden", !feedback);
    elements.metricFeedbackDelete.disabled = false;
  }
  setMetricFeedbackMessage("");
  showAiDialog(elements.metricFeedbackModal);
  elements.metricFeedbackText?.focus();
}

function closeMetricFeedbackModal() {
  metricFeedbackState.callId = "";
  metricFeedbackState.metricKey = "";
  metricFeedbackState.saving = false;
  metricFeedbackState.deleting = false;
  closeAiDialog(elements.metricFeedbackModal);
}

async function saveMetricFeedback(event) {
  event.preventDefault();
  const callId = metricFeedbackState.callId;
  const metricKey = metricFeedbackState.metricKey;
  const text = String(elements.metricFeedbackText?.value || "").trim();

  if (!callId || !metricKey || metricFeedbackState.saving || metricFeedbackState.deleting) {
    return;
  }
  if (!text) {
    setMetricFeedbackMessage("Додайте коротке пояснення або виправлення.");
    return;
  }

  metricFeedbackState.saving = true;
  if (elements.metricFeedbackSubmit) {
    elements.metricFeedbackSubmit.disabled = true;
    elements.metricFeedbackSubmit.textContent = "Зберігаємо...";
  }
  setMetricFeedbackMessage("Зберігаємо правку...", "neutral");

  try {
    const response = await apiFetch("/api/ai-metric-feedback", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        callId,
        metricKey,
        text
      })
    });
    const payload = await readJsonResponse(response, "Не вдалося зберегти правку метрики.");
    if (currentDetailCall && currentDetailCall.ai) {
      currentDetailCall.ai.metricFeedback = Array.isArray(payload.items)
        ? payload.items
        : [payload.feedback].filter(Boolean);
      renderCallQuality(currentDetailCall.ai.summary || {});
    }
    closeMetricFeedbackModal();
  } catch (error) {
    setMetricFeedbackMessage(error.message || "Не вдалося зберегти правку метрики.");
  } finally {
    metricFeedbackState.saving = false;
    if (elements.metricFeedbackSubmit) {
      elements.metricFeedbackSubmit.disabled = false;
      elements.metricFeedbackSubmit.textContent = metricFeedbackForKey(metricKey)
        ? "Оновити"
        : "Зберегти";
    }
    if (elements.metricFeedbackDelete) {
      elements.metricFeedbackDelete.disabled = false;
    }
  }
}

async function deleteMetricFeedback(anchor = null) {
  const callId = metricFeedbackState.callId;
  const metricKey = metricFeedbackState.metricKey;
  if (!callId || !metricKey || metricFeedbackState.saving || metricFeedbackState.deleting) {
    return;
  }

  const confirmed = await showUiConfirmDialog({
    title: "Видалити правку метрики?",
    message: "Примітка менеджера зникне з цієї метрики та зі списку AI-правок в адмінці.",
    confirmLabel: "Видалити",
    cancelLabel: "Скасувати",
    tone: "danger",
    anchor
  });
  if (!confirmed) {
    return;
  }

  metricFeedbackState.deleting = true;
  if (elements.metricFeedbackDelete) {
    elements.metricFeedbackDelete.disabled = true;
    elements.metricFeedbackDelete.textContent = "Видаляємо...";
  }
  if (elements.metricFeedbackSubmit) {
    elements.metricFeedbackSubmit.disabled = true;
  }
  setMetricFeedbackMessage("Видаляємо правку...", "neutral");

  try {
    const response = await apiFetch(
      `/api/ai-metric-feedback?callId=${encodeURIComponent(callId)}&metricKey=${encodeURIComponent(metricKey)}`,
      { method: "DELETE" }
    );
    const payload = await readJsonResponse(response, "Не вдалося видалити правку метрики.");
    if (currentDetailCall && currentDetailCall.ai) {
      currentDetailCall.ai.metricFeedback = Array.isArray(payload.items)
        ? payload.items
        : [];
      renderCallQuality(currentDetailCall.ai.summary || {});
    }
    closeMetricFeedbackModal();
  } catch (error) {
    setMetricFeedbackMessage(error.message || "Не вдалося видалити правку метрики.");
  } finally {
    metricFeedbackState.deleting = false;
    if (elements.metricFeedbackDelete) {
      elements.metricFeedbackDelete.disabled = false;
      elements.metricFeedbackDelete.textContent = "Видалити";
    }
    if (elements.metricFeedbackSubmit) {
      elements.metricFeedbackSubmit.disabled = false;
    }
  }
}

function handleMetricFeedbackClick(event) {
  const button = event.target.closest("[data-metric-feedback-action='open']");
  if (!button) {
    return;
  }
  openMetricFeedbackModal(button.dataset.metricKey || "");
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
    stageMotionItems(elements.detailTranscript, ":scope > .transcript-item", { maxIndex: 8 });
    return;
  }

  if (transcript && transcript.text) {
    const textBlock = document.createElement("pre");
    textBlock.className = "transcript-plain";
    textBlock.textContent = transcript.text;
    elements.detailTranscript.append(textBlock);
    stageMotionItems(elements.detailTranscript, ":scope > .transcript-plain", { maxIndex: 0 });
    return;
  }

  const message = document.createElement("p");
  message.className = "no-data";
  message.textContent = ai && ai.status === "processing"
    ? "Транскрипція ще готується."
    : "Текст розмови поки недоступний.";
  elements.detailTranscript.append(message);
  stageMotionItems(elements.detailTranscript, ":scope > .no-data", { maxIndex: 0 });
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
  currentDetailCall = call;
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
  stageMotionItems(elements.detailAnalysisList, ":scope > .detail-analysis-group", { maxIndex: 5 });
  stageMotionItems(elements.detailTechnical, ":scope > div", { maxIndex: 8 });

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
    currentDetailCall = null;
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

async function reanalyzeCurrentCall(anchor = null) {
  const id = String(currentDetailCallId || "").trim();
  if (!id || !elements.detailReanalyzeAi || elements.detailReanalyzeAi.disabled) {
    return;
  }

  const confirmed = await showUiConfirmDialog({
    title: "Запустити AI-аналіз заново?",
    message: "Дзвінок буде поставлено в чергу повторної обробки. Новий результат може замінити поточний підсумок і оцінки.",
    confirmLabel: "Запустити",
    cancelLabel: "Скасувати",
    tone: "warning",
    anchor
  });
  if (!confirmed) {
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
    const callTypeFilter = elements.monitorCallTypeFilter
      ? elements.monitorCallTypeFilter.value
      : "";
    const problemFilter = elements.monitorProblemFilter
      ? elements.monitorProblemFilter.value
      : "";
    const limit = Number(elements.monitorPageSize && elements.monitorPageSize.value) || monitorPageSize || 10;
    monitorPageSize = limit;
    const offset = Math.max(0, (Math.max(1, monitorPage) - 1) * limit);
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset)
    });
    if (query) {
      params.set("q", query);
    }
    if (callTypeFilter) {
      params.set("callType", callTypeFilter);
    }
    if (problemFilter) {
      params.set("problem", problemFilter);
    }
    const [statusResponse, callsResponse] = await Promise.all([
      apiFetch("/api/binotel-monitor/status", { headers: { Accept: "application/json" } }),
      apiFetch(
        `/api/binotel-monitor/calls?${params.toString()}`,
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
    void reanalyzeCurrentCall(elements.detailReanalyzeAi);
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
  syncDetailPanelHeights();
  resizeDetailAudioCanvas(true);
  if (elements.detailAudio.src) {
    buildSyntheticDetailPeaks();
  }
  drawDetailAudioCanvas();
});

populateMonitorCallTypeFilter();
enhanceCustomSelects();
initCallStatsHeatmapTooltips();

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

elements.monitorCallTypeFilter?.addEventListener("change", () => {
  monitorPage = 1;
  loadMonitor(false);
});

elements.monitorProblemFilter?.addEventListener("change", () => {
  monitorPage = 1;
  loadMonitor(false);
});

elements.callStatsFilter?.addEventListener("submit", (event) => {
  event.preventDefault();
  loadCallStatsPage(false);
});

elements.callStatsPeriod?.addEventListener("change", () => {
  updateCallStatsCustomFields();
  if (elements.callStatsPeriod.value !== "custom") {
    loadCallStatsPage(false);
  }
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
  if (!event.target.closest || !event.target.closest(".custom-select")) {
    closeCustomSelects();
  }
  if (
    elements.telegramAccountDropdown &&
    !elements.telegramAccountDropdown.contains(event.target)
  ) {
    setTelegramAccountDropdownOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCustomSelects();
    setProfileMenuOpen(false);
    setTelegramAccountDropdownOpen(false);
    closeChangePasswordModal();
    closeAdminUserModal();
    closeTelegramPhotoModal();
    closeManagerRatingModal();
    closeMetricFeedbackModal();
    closeMetricPromptModal();
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
elements.adminTabs?.addEventListener("click", handleAdminTabsClick);
elements.adminUsersList?.addEventListener("click", handleAdminUsersClick);
elements.adminMetricFeedbackList?.addEventListener("click", handleAdminMetricFeedbackClick);
elements.adminAnalysisNumbersList?.addEventListener("change", handleAdminAnalysisNumbersChange);
elements.adminAnalysisEnableAll?.addEventListener("click", () => setAllAdminAnalysisNumbers(true));
elements.adminAnalysisDisableAll?.addEventListener("click", () => setAllAdminAnalysisNumbers(false));
elements.adminAnalysisNumbersSave?.addEventListener("click", saveAdminAnalysisNumbers);
elements.adminTelegramForm?.addEventListener("submit", handleAdminTelegramSubmit);
elements.adminTelegramList?.addEventListener("click", handleAdminTelegramClick);
elements.adminTelegramList?.addEventListener("submit", handleAdminTelegramConfirm);
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

elements.ticketsModal.addEventListener("cancel", (event) => {
  if (!ticketsModalBackView) {
    return;
  }

  event.preventDefault();
  closeTicketsModal();
});

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

elements.telegramPhotoModalClose?.addEventListener("click", closeTelegramPhotoModal);

elements.telegramPhotoModal?.addEventListener("click", (event) => {
  if (event.target === elements.telegramPhotoModal) {
    closeTelegramPhotoModal();
  }
});

elements.telegramPhotoModal?.addEventListener("close", () => {
  if (elements.telegramPhotoModalImage) {
    elements.telegramPhotoModalImage.removeAttribute("src");
    elements.telegramPhotoModalImage.alt = "Telegram фото";
  }
});

elements.telegramRefresh?.addEventListener("click", () => {
  void reloadCurrentTelegram(selectedTelegramAccountId, { force: true });
});

elements.messagingTabs?.addEventListener("click", handleMessagingTabsClick);

elements.viberRefresh?.addEventListener("click", () => {
  void reloadCurrentViber();
});

elements.telegramAccountTrigger?.addEventListener("click", (event) => {
  event.stopPropagation();
  if (elements.telegramAccountTrigger.disabled) {
    return;
  }
  setTelegramAccountDropdownOpen(!telegramAccountDropdownOpen);
});

elements.telegramAccountMenu?.addEventListener("click", handleTelegramAccountMenuClick);
elements.telegramCompose?.addEventListener("submit", handleTelegramSend);
elements.telegramMessage?.addEventListener("keydown", handleTelegramMessageKeydown);
elements.telegramReplyCancel?.addEventListener("click", clearTelegramReplyTarget);
elements.telegramChat?.addEventListener("click", handleTelegramChatClick);

elements.managerRatingTable?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-manager-rating-index]");
  if (!button) {
    return;
  }
  openManagerRatingModal(button.dataset.managerRatingIndex);
});

elements.managerRatingModalClose?.addEventListener("click", closeManagerRatingModal);

elements.managerRatingModal?.addEventListener("click", (event) => {
  if (event.target === elements.managerRatingModal) {
    closeManagerRatingModal();
  }
});

elements.detailQualityCriteria?.addEventListener("click", handleMetricFeedbackClick);
elements.metricFeedbackForm?.addEventListener("submit", saveMetricFeedback);
elements.metricFeedbackDelete?.addEventListener("click", (event) => {
  void deleteMetricFeedback(event.currentTarget);
});
elements.metricFeedbackClose?.addEventListener("click", closeMetricFeedbackModal);
elements.metricFeedbackCancel?.addEventListener("click", closeMetricFeedbackModal);
elements.metricFeedbackModal?.addEventListener("click", (event) => {
  if (event.target === elements.metricFeedbackModal) {
    closeMetricFeedbackModal();
  }
});

elements.metricPromptForm?.addEventListener("submit", saveMetricPromptUpdate);
elements.metricPromptRegenerate?.addEventListener("click", () => {
  void regenerateMetricPromptDraft();
});
elements.metricPromptClose?.addEventListener("click", closeMetricPromptModal);
elements.metricPromptCancel?.addEventListener("click", closeMetricPromptModal);
elements.metricPromptModal?.addEventListener("click", (event) => {
  if (event.target === elements.metricPromptModal) {
    closeMetricPromptModal();
  }
});

elements.notesList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-note-action]");
  if (!button) {
    return;
  }

  const noteItem = button.closest(".note");
  const noteId = noteItem && noteItem.dataset.noteId;
  if (!noteId) {
    return;
  }

  const action = button.dataset.noteAction;
  if (action === "edit") {
    editingNoteId = noteId;
    setNoteFormMessage("");
    renderNotes(currentCard && currentCard.notes ? currentCard.notes : []);
    return;
  }

  if (action === "cancel") {
    editingNoteId = "";
    setNoteFormMessage("");
    renderNotes(currentCard && currentCard.notes ? currentCard.notes : []);
    return;
  }

  if (action === "save") {
    saveNoteEdit(noteId, noteItem.querySelector(".note-edit-input"));
    return;
  }

  if (action === "delete") {
    editingNoteId = "";
    setNoteFormMessage("");
    const confirmed = await showUiConfirmDialog({
      title: "Видалити примітку?",
      message: "Примітка зникне з картки клієнта. Цю дію не можна скасувати.",
      confirmLabel: "Видалити",
      cancelLabel: "Скасувати",
      tone: "danger",
      anchor: button
    });
    if (confirmed) {
      deleteNote(noteId);
    }
  }
});

elements.noteForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const noteText = elements.noteText.value.trim();

  if (!noteText || !currentPhone) {
    return;
  }

  setNoteFormMessage("Зберігаємо…", "neutral");

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
    setNoteFormMessage("");
    appendCurrentNote(payload.note || {
      id: "",
      text: noteText,
      createdBy: "Оператор",
      createdAt: new Date().toISOString(),
      source: "postgres"
    });
    renderNotes(currentCard && currentCard.notes ? currentCard.notes : []);
  } catch (error) {
    setNoteFormMessage(error.message);
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
  } else if (window.location.pathname === "/call-stats") {
    loadCallStatsPage();
  } else if (window.location.pathname === "/call-analytics") {
    loadAnalyticsPage();
  } else if (window.location.pathname === "/ai-settings") {
    loadAiSettingsPage();
  } else if (window.location.pathname === "/admin") {
    loadAdminPage();
  } else if (initialPhone) {
    loadClient(initialPhone);
  } else {
    setState("empty");
  }
}

boot();
