(function initBookingRules(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BookingRules = factory();
  }
}(typeof globalThis !== "undefined" ? globalThis : this, function createBookingRules() {
  const activeTicketStatuses = Object.freeze([
    "buyout",
    "buybus",
    "buybus_confirmed",
    "transfer"
  ]);

  const ticketSearchStatusLabels = Object.freeze({
    annulment: "Анульований",
    booking: "Заброньовано",
    buybus: "Заброньовано в автобусі",
    buybus_annulment: "Анульовано в автобусі",
    buybus_cancel: "Скасовано в автобусі",
    buybus_confirmed: "Викуплений в автобусі",
    buybus_returned: "Повернутий в автобусі",
    buyout: "Викуплений",
    cancel: "Скасований",
    cancelled: "Скасований",
    new: "Новий",
    "new ticket": "Новий квиток",
    returned: "Повернутий",
    "system cancel": "Скасований системою",
    transfer: "Пересаджений"
  });

  const reportStatusLabels = Object.freeze({
    buyout: "Викуплений",
    buybus: "Заброньований в автобусі",
    buybus_confirmed: "Викуплений",
    transfer: "Пересаджений"
  });

  const bookingReportStatusLabels = Object.freeze({
    new: "Новий",
    buybus: "Заброньовано в автобусі",
    buyout: "Викуплений",
    buybus_cancel: "Скасовано в автобусі",
    cancel: "Скасований",
    returned: "Повернутий",
    annulment: "Анульований"
  });

  const bookingReportStatusOptions = Object.freeze(
    Object.keys(bookingReportStatusLabels)
  );
  const purchasedStatuses = Object.freeze(["buyout", "buy", "buybus_confirmed"]);
  const closedStatuses = Object.freeze([
    "annulment",
    "buybus_annulment",
    "buybus_cancel",
    "buybus_cancelled",
    "buybus_returned",
    "cancel",
    "cancelled",
    "returned",
    "system cancel"
  ]);
  const pdfActiveStatuses = Object.freeze([
    "booking",
    "buybus",
    "buybus_confirmed",
    "buyout"
  ]);
  const pdfTerminalStatuses = Object.freeze([
    "returned",
    "buybus_returned",
    "annulment",
    "buybus_annulment",
    "cancel",
    "buybus_cancel"
  ]);

  function normalizeStatus(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    const compact = raw.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
    if (compact === "new ticket" || compact === "new ticket ticket") return "new";
    if (compact === "booking ticket") return "booking";
    if (compact === "buy ticket" || compact === "buyout ticket" || compact === "buy") return "buyout";
    if (compact === "buybus ticket") return "buybus";
    if (compact === "buybus confirmed" || compact === "buybus confirmed ticket") return "buybus_confirmed";
    if (compact === "buybus returned" || compact === "buybus returned ticket") return "buybus_returned";
    if (compact === "buybus annulment" || compact === "buybus annulment ticket") return "buybus_annulment";
    if (compact === "buybus cancel" || compact === "buybus cancelled" || compact === "buybus cancel ticket") return "buybus_cancel";
    if (compact === "returned ticket" || compact === "return") return "returned";
    if (compact === "annulment ticket") return "annulment";
    if (compact === "cancel ticket" || compact === "cancelled" || compact === "system cancel") return "cancel";
    return compact.replace(/\s+/g, "_");
  }

  function normalizeReportStatus(value) {
    const status = normalizeStatus(value);
    if (status === "buybus_confirmed") return "buyout";
    if (status === "buybus_returned") return "returned";
    if (status === "buybus_annulment") return "annulment";
    return status;
  }

  function getSearchStatusLabel(status) {
    const normalized = normalizeStatus(status);
    return ticketSearchStatusLabels[status] ||
      ticketSearchStatusLabels[normalized] ||
      String(status || "");
  }

  function getBookingReportStatusLabel(status) {
    const normalized = normalizeReportStatus(status);
    return bookingReportStatusLabels[normalized] ||
      ticketSearchStatusLabels[normalized] ||
      normalized ||
      "";
  }

  function isPurchasedStatus(status) {
    return purchasedStatuses.includes(normalizeStatus(status));
  }

  function isClosedStatus(status) {
    return closedStatuses.includes(normalizeStatus(status));
  }

  function isReturnOrAnnulAction(action) {
    return action?.action === "auto_return" || action?.action === "annulment";
  }

  function getAutoReturnStatus(status) {
    return normalizeStatus(status) === "buybus_confirmed" ?
      "buybus_returned" :
      "returned";
  }

  function getAnnulmentStatus(status) {
    return normalizeStatus(status) === "buybus_confirmed" ?
      "buybus_annulment" :
      "annulment";
  }

  function getTicketStatusAfterOrderAction(status) {
    const normalized = normalizeStatus(status);
    if (normalized === "buy" || normalized === "buyout") return "buyout";
    if ([
      "buybus",
      "buybus_confirmed",
      "buybus_cancel",
      "buybus_returned",
      "buybus_annulment",
      "returned",
      "annulment",
      "cancel"
    ].includes(normalized)) return normalized;
    return "";
  }

  function getTicketEventAmount({
    status,
    amountMode = "",
    baseAmount = 0,
    returnedAmount = 0
  } = {}) {
    const normalized = normalizeReportStatus(status);
    const base = Number.isFinite(Number(baseAmount)) ? Number(baseAmount) : 0;
    const returned = Number.isFinite(Number(returnedAmount)) ?
      Number(returnedAmount) :
      0;
    if (amountMode === "zero") return 0;
    if (normalized === "returned") return -Math.abs(returned);
    if (
      normalized === "cancel" ||
      normalized === "buybus_cancel" ||
      normalized === "annulment"
    ) {
      return -Math.abs(base);
    }
    return Math.abs(base);
  }

  function eventReplacesBusReservation(status) {
    return normalizeReportStatus(status) === "buyout";
  }

  function getManagerStatsEventGroup(status) {
    const normalized = normalizeReportStatus(status);
    if (normalized === "buyout") return "confirmed";
    if (normalized === "buybus") return "booking";
    return "";
  }

  function isTicketPdfActiveStatus(status) {
    return pdfActiveStatuses.includes(normalizeStatus(status));
  }

  function isBookingPdfTerminalStatus(status) {
    return pdfTerminalStatuses.includes(normalizeStatus(status));
  }

  return {
    activeTicketStatuses,
    ticketSearchStatusLabels,
    reportStatusLabels,
    bookingReportStatusLabels,
    bookingReportStatusOptions,
    normalizeStatus,
    normalizeReportStatus,
    getSearchStatusLabel,
    getBookingReportStatusLabel,
    isPurchasedStatus,
    isClosedStatus,
    isReturnOrAnnulAction,
    getAutoReturnStatus,
    getAnnulmentStatus,
    getTicketStatusAfterOrderAction,
    getTicketEventAmount,
    eventReplacesBusReservation,
    getManagerStatsEventGroup,
    isTicketPdfActiveStatus,
    isBookingPdfTerminalStatus
  };
}));
