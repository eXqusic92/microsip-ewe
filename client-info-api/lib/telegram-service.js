"use strict";

const { normalizePhone, phoneDigits } = require("./phone");

let telegramLibrary = null;

function installTelegramLocalStorageShim() {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    if (descriptor && !descriptor.configurable && descriptor.value) {
      return;
    }
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
        clear: () => {}
      }
    });
  } catch (_) {
    // Node 22 warns when GramJS probes the experimental global localStorage.
  }
}

function gramJs() {
  if (!telegramLibrary) {
    installTelegramLocalStorageShim();
    const { Api, Logger, TelegramClient } = require("telegram");
    const { StringSession } = require("telegram/sessions");
    telegramLibrary = {
      Api,
      Logger,
      TelegramClient,
      StringSession
    };
  }
  return telegramLibrary;
}

function text(value, fallback = "") {
  return value === null || value === undefined ? fallback : String(value).trim();
}

function idText(value) {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (typeof value === "object" && typeof value.toString === "function") {
    return value.toString();
  }
  return String(value);
}

function compactError(error) {
  return text(
    error && (error.errorMessage || error.message || error.code || error),
    "telegram_error"
  );
}

function isTransientTelegramError(error) {
  const message = compactError(error).toLowerCase();
  return [
    "timeout",
    "timed out",
    "etimedout",
    "econnreset",
    "econnrefused",
    "ehostunreach",
    "network",
    "socket",
    "connection"
  ].some((part) => message.includes(part));
}

function isBlockingTelegramLookupError(error) {
  const message = compactError(error).toLowerCase();
  return (
    isTransientTelegramError(error) ||
    message.includes("flood_wait") ||
    message.includes("auth_key") ||
    message.includes("session") ||
    message.includes("unauthorized") ||
    message.includes("password") ||
    message.includes("api_id") ||
    message.includes("api hash")
  );
}

function isTelegramSessionInvalidError(error) {
  const message = compactError(error).toLowerCase();
  return (
    message.includes("auth_key_unregistered") ||
    message.includes("auth_key_invalid") ||
    message.includes("auth_key_duplicated") ||
    message.includes("session_revoked") ||
    message.includes("session_expired") ||
    message.includes("unauthorized") ||
    message.includes("not authorized") ||
    message.includes("user_deactivated")
  );
}

function canFallbackToImportContacts(error) {
  return !isBlockingTelegramLookupError(error);
}

function telegramDate(value) {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    const millis = numeric > 100000000000 ? numeric : numeric * 1000;
    return new Date(millis).toISOString();
  }
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

function telegramUserPayload(user, fallbackPhone = "") {
  if (!user) {
    return null;
  }
  const firstName = text(user.firstName || user.first_name);
  const lastName = text(user.lastName || user.last_name);
  const username = text(user.username);
  const phone = normalizePhone(user.phone || fallbackPhone) || text(fallbackPhone);
  return {
    telegramUserId: idText(user.id),
    accessHash: idText(user.accessHash),
    username,
    firstName,
    lastName,
    phone,
    displayName:
      [firstName, lastName].filter(Boolean).join(" ") ||
      username ||
      phone ||
      "Telegram contact",
    payload: {
      id: idText(user.id),
      accessHash: idText(user.accessHash),
      username,
      firstName,
      lastName,
      phone
    }
  };
}

function telegramContactFromUser(user, fallbackPhone = "", source = "") {
  const payload = telegramUserPayload(user, fallbackPhone);
  if (!payload) {
    return null;
  }
  return {
    found: true,
    ...payload,
    payload: {
      ...payload.payload,
      source
    }
  };
}

function resolvedPeerUser(resolved) {
  const users = Array.isArray(resolved && resolved.users) ? resolved.users : [];
  if (!users.length) {
    return null;
  }
  const peer = resolved && resolved.peer;
  const peerUserId = idText(peer && (peer.userId || peer.user_id));
  return users.find((user) => idText(user && user.id) === peerUserId) || users[0] || null;
}

function telegramUsersFromResult(result) {
  return Array.isArray(result && result.users) ? result.users.filter(Boolean) : [];
}

function userMatchesPhone(user, normalizedPhone) {
  const expected = phoneDigits(normalizedPhone);
  const actual = phoneDigits(user && user.phone);
  if (!expected || !actual) {
    return false;
  }
  const normalizedActual = phoneDigits(normalizePhone(actual));
  return (
    actual === expected ||
    normalizedActual === expected ||
    (expected.startsWith("380") && actual.length === 9 && expected.endsWith(actual))
  );
}

function importedUser(imported) {
  const users = telegramUsersFromResult(imported);
  if (!users.length) {
    return null;
  }
  const importedRows = Array.isArray(imported && imported.imported)
    ? imported.imported
    : [];
  const importedUserId = idText(
    importedRows[0] && (importedRows[0].userId || importedRows[0].user_id)
  );
  return (
    users.find((user) => idText(user && user.id) === importedUserId) ||
    users[0] ||
    null
  );
}

function importedContactWasCreated(imported, clientId) {
  const importedRows = Array.isArray(imported && imported.imported)
    ? imported.imported
    : [];
  if (!importedRows.length) {
    return false;
  }
  const expectedClientId = idText(clientId);
  return importedRows.some(
    (row) => idText(row && (row.clientId || row.client_id)) === expectedClientId
  );
}

function messageText(message) {
  const raw = text(message && (message.message || message.text));
  if (raw) {
    return raw;
  }
  return "";
}

function telegramDocumentFilename(document) {
  const attributes = Array.isArray(document && document.attributes)
    ? document.attributes
    : [];
  const filenameAttribute = attributes.find((attribute) =>
    text(attribute && attribute.className).includes("DocumentAttributeFilename") ||
    Boolean(attribute && (attribute.fileName || attribute.file_name))
  );
  return text(filenameAttribute && (filenameAttribute.fileName || filenameAttribute.file_name));
}

function telegramClassName(value) {
  return text(value && (value.className || (value.constructor && value.constructor.name)));
}

function telegramRichText(value) {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return text(value);
  }
  return text(value.text || value.title || value.name || value.value);
}

function telegramDocumentAttributes(document) {
  return Array.isArray(document && document.attributes)
    ? document.attributes.filter(Boolean)
    : [];
}

function telegramDocumentAttribute(document, className) {
  return telegramDocumentAttributes(document).find((attribute) =>
    telegramClassName(attribute).includes(className)
  ) || null;
}

function telegramDurationDescription(duration) {
  const seconds = Math.trunc(Number(duration) || 0);
  if (!seconds) {
    return "";
  }
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}:${String(rest).padStart(2, "0")}` : `${rest} с`;
}

function telegramPeriodDescription(period) {
  const seconds = Math.trunc(Number(period) || 0);
  if (!seconds) {
    return "";
  }
  if (seconds < 60) {
    return `${seconds} с`;
  }
  if (seconds < 3600) {
    return `${Math.round(seconds / 60)} хв`;
  }
  if (seconds < 86400) {
    return `${Math.round(seconds / 3600)} год`;
  }
  return `${Math.round(seconds / 86400)} дн`;
}

function telegramAmountDescription(action) {
  const amount = text(action && (
    action.totalAmount ||
    action.total_amount ||
    action.amount ||
    action.stars ||
    action.boosts
  ));
  const currency = text(action && action.currency);
  return [amount, currency].filter(Boolean).join(" ");
}

function telegramServiceDescription(...parts) {
  return parts.map((part) => text(part)).filter(Boolean).join(" · ");
}

function telegramActionSubtype(className) {
  return text(className)
    .replace(/^MessageAction/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

function telegramActionDetails(action) {
  const actionClass = telegramClassName(action);
  const title = telegramRichText(action && action.title);
  const message = telegramRichText(action && (action.message || action.text));
  const score = text(action && action.score);
  const duration = telegramDurationDescription(action && action.duration);
  const period = telegramPeriodDescription(action && (
    action.period ||
    action.ttlPeriod ||
    action.ttl_period
  ));
  const distance = text(action && action.distance);
  const emoticon = text(action && action.emoticon);
  const amount = telegramAmountDescription(action);

  const staticActions = {
    MessageActionEmpty: ["Службове повідомлення", "Без деталей"],
    MessageActionChatEditPhoto: ["Фото чату оновлено", "Telegram"],
    MessageActionChatDeletePhoto: ["Фото чату видалено", "Telegram"],
    MessageActionChatAddUser: ["Учасника додано", "Telegram"],
    MessageActionChatDeleteUser: ["Учасника видалено", "Telegram"],
    MessageActionChatJoinedByLink: ["Приєднання за посиланням", "Telegram"],
    MessageActionChatMigrateTo: ["Чат перенесено в канал", "Telegram"],
    MessageActionChannelMigrateFrom: ["Канал створено з групи", "Telegram"],
    MessageActionPinMessage: ["Повідомлення закріплено", "Telegram"],
    MessageActionHistoryClear: ["Історію очищено", "Telegram"],
    MessageActionScreenshotTaken: ["Зроблено скриншот", "Telegram"],
    MessageActionBotAllowed: ["Бота дозволено", "Telegram"],
    MessageActionSecureValuesSentMe: ["Дані Telegram Passport отримано", "Telegram"],
    MessageActionSecureValuesSent: ["Дані Telegram Passport надіслано", "Telegram"],
    MessageActionContactSignUp: ["Контакт зареєструвався у Telegram", "Telegram"],
    MessageActionInviteToGroupCall: ["Запрошення до групового дзвінка", "Telegram"],
    MessageActionChatJoinedByRequest: ["Приєднання за запитом", "Telegram"],
    MessageActionWebViewDataSentMe: ["Дані Web App отримано", "Telegram"],
    MessageActionWebViewDataSent: ["Дані Web App надіслано", "Telegram"],
    MessageActionSuggestProfilePhoto: ["Запропоновано фото профілю", "Telegram"],
    MessageActionRequestedPeer: ["Запитано контакт або чат", "Telegram"],
    MessageActionSetChatWallPaper: ["Шпалери чату змінено", "Telegram"],
    MessageActionGiveawayLaunch: ["Розіграш запущено", "Telegram"],
    MessageActionGiveawayResults: ["Результати розіграшу", "Telegram"],
    MessageActionRequestedPeerSentMe: ["Надіслано запитаний контакт або чат", "Telegram"]
  };

  if (Object.prototype.hasOwnProperty.call(staticActions, actionClass)) {
    const [label, description] = staticActions[actionClass];
    return { label, description };
  }

  switch (actionClass) {
    case "MessageActionChatCreate":
      return { label: "Чат створено", description: title || "Telegram" };
    case "MessageActionChatEditTitle":
      return { label: "Назву чату змінено", description: title || "Telegram" };
    case "MessageActionChannelCreate":
      return { label: "Канал створено", description: title || "Telegram" };
    case "MessageActionGameScore":
      return {
        label: "Результат гри",
        description: score ? `Рахунок ${score}` : "Telegram game"
      };
    case "MessageActionPaymentSentMe":
      return { label: "Платіж отримано", description: amount || "Telegram" };
    case "MessageActionPaymentSent":
      return { label: "Платіж надіслано", description: amount || "Telegram" };
    case "MessageActionPhoneCall":
      return { label: "Телефонний дзвінок", description: duration || "Дзвінок у Telegram" };
    case "MessageActionCustomAction":
      return { label: message || "Службова дія", description: "Telegram" };
    case "MessageActionGeoProximityReached":
      return {
        label: "Досягнуто геолокаційної близькості",
        description: distance ? `${distance} м` : "Telegram"
      };
    case "MessageActionGroupCall":
      return { label: "Груповий дзвінок", description: duration || "Telegram" };
    case "MessageActionSetMessagesTTL":
      return { label: "Таймер повідомлень змінено", description: period || "Telegram" };
    case "MessageActionGroupCallScheduled":
      return { label: "Груповий дзвінок заплановано", description: "Telegram" };
    case "MessageActionSetChatTheme":
      return { label: "Тему чату змінено", description: emoticon || "Telegram" };
    case "MessageActionGiftPremium":
      return { label: "Premium подаровано", description: amount || "Telegram" };
    case "MessageActionTopicCreate":
      return { label: "Тему створено", description: title || "Telegram" };
    case "MessageActionTopicEdit":
      return {
        label: "Тему змінено",
        description: telegramServiceDescription(title, emoticon) || "Telegram"
      };
    case "MessageActionGiftCode":
      return { label: "Подарунковий код", description: amount || "Telegram" };
    case "MessageActionBoostApply":
      return { label: "Буст застосовано", description: amount || "Telegram" };
    case "MessageActionPaymentRefunded":
      return { label: "Платіж повернено", description: amount || "Telegram" };
    case "MessageActionGiftStars":
      return { label: "Stars подаровано", description: amount || "Telegram" };
    case "MessageActionPrizeStars":
      return { label: "Stars виграно", description: amount || "Telegram" };
    case "MessageActionStarGift":
      return { label: "Star Gift", description: amount || "Telegram" };
    case "MessageActionStarGiftUnique":
      return { label: "Унікальний Star Gift", description: amount || "Telegram" };
    default:
      return { label: "Службове повідомлення", description: "Telegram" };
  }
}

function normalizeTelegramAction(action) {
  if (!action) {
    return null;
  }
  const actionClass = telegramClassName(action);
  const details = telegramActionDetails(action);
  return {
    type: "service",
    subtype: telegramActionSubtype(actionClass),
    label: details.label || "Службове повідомлення",
    description: details.description || "Telegram",
    mimeType: "",
    filename: "",
    downloadable: false,
    className: actionClass
  };
}

function telegramDocumentMediaType(media, document, mimeType, filename) {
  const sticker = telegramDocumentAttribute(document, "DocumentAttributeSticker");
  const audio = telegramDocumentAttribute(document, "DocumentAttributeAudio");
  const video = telegramDocumentAttribute(document, "DocumentAttributeVideo");
  const animated = telegramDocumentAttribute(document, "DocumentAttributeAnimated");
  const lowerFilename = filename.toLowerCase();

  if (
    sticker ||
    mimeType === "application/x-tgsticker" ||
    mimeType === "application/x-sticker"
  ) {
    const alt = text(sticker && sticker.alt);
    return {
      type: "sticker",
      label: alt ? `Стікер ${alt}` : "Стікер",
      description: alt || "Telegram sticker"
    };
  }

  if (media && (media.voice || (audio && audio.voice))) {
    return {
      type: "voice",
      label: "Голосове повідомлення",
      description: telegramDurationDescription(audio && audio.duration)
    };
  }

  if (audio) {
    return {
      type: "audio",
      label: text(audio.title) || "Аудіо",
      description:
        [text(audio.performer), telegramDurationDescription(audio.duration)].filter(Boolean).join(" · ") ||
        "Аудіофайл"
    };
  }

  if (media && (media.video || video || mimeType.startsWith("video/"))) {
    const round = Boolean(media.round || (video && video.roundMessage));
    return {
      type: round ? "video_note" : "video",
      label: round ? "Відеоповідомлення" : "Відео",
      description: telegramDurationDescription(video && video.duration)
    };
  }

  if (animated || mimeType === "image/gif" || lowerFilename.endsWith(".gif")) {
    return {
      type: "animation",
      label: "GIF",
      description: "Анімація"
    };
  }

  if (mimeType === "application/pdf" || lowerFilename.endsWith(".pdf")) {
    return {
      type: "pdf",
      label: "PDF",
      description: "Документ PDF"
    };
  }

  if (mimeType.startsWith("image/")) {
    return {
      type: "photo",
      label: "Фото",
      description: "Зображення"
    };
  }

  return {
    type: "file",
    label: "Файл",
    description: mimeType || "Файл"
  };
}

function normalizeTelegramMedia(message) {
  const media = message && message.media;
  const action = message && message.action;
  if (!media && action) {
    return normalizeTelegramAction(action);
  }
  if (!media) {
    return null;
  }

  const mediaClass = telegramClassName(media);
  if (mediaClass.includes("MessageMediaEmpty")) {
    return null;
  }

  if (media.photo || mediaClass.includes("MessageMediaPhoto")) {
    return {
      type: "photo",
      label: "Фото",
      description: "Зображення",
      mimeType: "image/jpeg",
      filename: `telegram-photo-${idText(message.id) || "media"}.jpg`,
      downloadable: true,
      className: mediaClass
    };
  }

  const document = media.document;
  if (document) {
    const mimeType = text(document.mimeType || document.mime_type, "application/octet-stream");
    const filename = telegramDocumentFilename(document) ||
      (mimeType === "application/pdf"
        ? `telegram-document-${idText(message.id) || "media"}.pdf`
        : `telegram-file-${idText(message.id) || "media"}`);
    const mediaType = telegramDocumentMediaType(media, document, mimeType, filename);
    return {
      ...mediaType,
      mimeType,
      filename,
      size: Number(document.size) || 0,
      downloadable: true,
      className: mediaClass
    };
  }

  const knownMedia = [
    ["MessageMediaGeoLive", "location_live", "Live-локація", "Геолокація в реальному часі"],
    ["MessageMediaGeo", "location", "Локація", "Геолокація"],
    ["MessageMediaVenue", "venue", text(media.title) || "Місце", text(media.address) || "Локація"],
    [
      "MessageMediaContact",
      "contact",
      [text(media.firstName || media.first_name), text(media.lastName || media.last_name)].filter(Boolean).join(" ") || "Контакт",
      normalizePhone(media.phoneNumber || media.phone_number) || text(media.phoneNumber || media.phone_number)
    ],
    ["MessageMediaPoll", "poll", "Опитування", telegramRichText(media.poll && media.poll.question)],
    ["MessageMediaDice", "dice", "Емодзі-кубик", [text(media.emoticon), text(media.value)].filter(Boolean).join(" · ")],
    ["MessageMediaWebPage", "webpage", "Посилання", telegramRichText(media.webpage && (media.webpage.title || media.webpage.url))],
    ["MessageMediaGame", "game", "Гра", telegramRichText(media.game && media.game.title)],
    ["MessageMediaInvoice", "invoice", text(media.title) || "Рахунок", text(media.description)],
    ["MessageMediaStory", "story", "Історія", "Telegram story"],
    ["MessageMediaGiveawayResults", "giveaway_results", "Результати розіграшу", text(media.prizeDescription || media.prize_description)],
    ["MessageMediaGiveaway", "giveaway", "Розіграш", text(media.prizeDescription || media.prize_description)],
    ["MessageMediaPaidMedia", "paid_media", "Платне медіа", "Telegram paid media"],
    ["MessageMediaUnsupported", "unsupported", "Непідтримуване повідомлення", "Telegram media"]
  ].find(([className]) => mediaClass.includes(className));

  if (knownMedia) {
    return {
      type: knownMedia[1],
      label: knownMedia[2],
      description: knownMedia[3] || mediaClass,
      mimeType: "",
      filename: "",
      downloadable: false,
      className: mediaClass
    };
  }

  return {
    type: "unsupported",
    label: "Непідтримуване повідомлення",
    description: mediaClass || "Telegram media",
    mimeType: "",
    filename: "",
    downloadable: false,
    className: mediaClass
  };
}

function messageReplyToId(message) {
  const direct = message && message.replyToMsgId;
  if (direct) {
    return Number(direct) || 0;
  }
  const replyTo = message && message.replyTo;
  return Number(
    replyTo && (
      replyTo.replyToMsgId ||
      replyTo.reply_to_msg_id ||
      replyTo.replyToTopId ||
      replyTo.reply_to_top_id
    )
  ) || 0;
}

function messagePayload(message) {
  const media = normalizeTelegramMedia(message);
  return {
    id: idText(message.id),
    senderId: idText(message.senderId),
    peerId: idText(message.peerId && (message.peerId.userId || message.peerId.chatId || message.peerId.channelId)),
    groupedId: idText(message.groupedId),
    hasMedia: Boolean(message.media || message.action),
    media,
    replyToMessageId: messageReplyToId(message) || null
  };
}

function normalizeMessage(message) {
  const media = normalizeTelegramMedia(message || {});
  const replyToMessageId = messageReplyToId(message || {});
  return {
    id: Number(message && message.id) || 0,
    direction: message && message.out ? "outgoing" : "incoming",
    text: messageText(message),
    media,
    replyToMessageId: replyToMessageId || null,
    replyPreview: null,
    sentAt: telegramDate(message && message.date),
    senderId: idText(message && message.senderId),
    payload: messagePayload(message || {})
  };
}

function telegramReplyPreview(message) {
  if (!message) {
    return null;
  }
  const textValue = text(message.text);
  const media = message.media || null;
  return {
    id: message.id,
    direction: message.direction,
    text: textValue || (media ? media.label : "Повідомлення"),
    mediaType: media && media.type ? media.type : "",
    mediaLabel: media && media.label ? media.label : ""
  };
}

function attachTelegramReplyPreviews(messages, extraMessages = []) {
  const list = Array.isArray(messages) ? messages : [];
  const extraList = Array.isArray(extraMessages) ? extraMessages : [];
  const byId = new Map(
    [...extraList, ...list].map((message) => [Number(message.id), message])
  );
  return list.map((message) => {
    if (!message || !message.replyToMessageId) {
      return message;
    }
    return {
      ...message,
      replyPreview: telegramReplyPreview(byId.get(Number(message.replyToMessageId)))
    };
  });
}

function normalizeCachedTelegramMessage(message) {
  if (!message || !message.media || message.media.type !== "service") {
    return message;
  }
  const actionClass = telegramClassName(message.media);
  if (!actionClass.includes("MessageAction")) {
    return message;
  }
  const media = normalizeTelegramAction({
    className: actionClass,
    duration: message.media.duration,
    title: message.media.title,
    message: message.media.message,
    score: message.media.score,
    period: message.media.period,
    distance: message.media.distance,
    emoticon: message.media.emoticon,
    stars: message.media.stars
  });
  return {
    ...message,
    media,
    payload: message.payload
      ? {
          ...message.payload,
          media
        }
      : message.payload
  };
}

async function hydrateTelegramReplyPreviews(client, entity, messages) {
  const list = Array.isArray(messages) ? messages : [];
  const knownIds = new Set(list.map((message) => Number(message.id)).filter(Boolean));
  const missingIds = [
    ...new Set(
      list
        .map((message) => Number(message && message.replyToMessageId))
        .filter((id) => Number.isFinite(id) && id > 0 && !knownIds.has(id))
    )
  ];

  if (!missingIds.length) {
    return attachTelegramReplyPreviews(list);
  }

  try {
    const rawReplies = await client.getMessages(entity, { ids: missingIds });
    const replyMessages = telegramMessageArray(rawReplies)
      .map(normalizeMessage)
      .filter((message) => message.id);
    return attachTelegramReplyPreviews(list, replyMessages);
  } catch (_) {
    return attachTelegramReplyPreviews(list);
  }
}

function telegramMessageArray(rawMessages) {
  if (!rawMessages) {
    return [];
  }
  if (Array.isArray(rawMessages)) {
    return rawMessages;
  }
  if (typeof rawMessages[Symbol.iterator] === "function") {
    return Array.from(rawMessages);
  }
  return rawMessages.id ? [rawMessages] : [];
}

function normalizeLimit(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(Math.max(Math.trunc(parsed), 1), 100);
}

function truthy(value) {
  return ["1", "true", "yes", "on"].includes(
    String(value || "").trim().toLowerCase()
  );
}

function createTimeoutError(message) {
  const error = new Error(message);
  error.code = message;
  return error;
}

async function withTimeout(operation, timeoutMs, message) {
  const ms = Number(timeoutMs);
  if (!Number.isFinite(ms) || ms <= 0) {
    return operation();
  }

  let timeoutId = null;
  try {
    return await Promise.race([
      Promise.resolve().then(operation),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(createTimeoutError(message));
        }, ms);
      })
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    return [];
  }

  const parsed = Math.trunc(Number(concurrency));
  const limit = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const workerCount = Math.min(limit, list.length);
  const results = new Array(list.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < list.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(list[index], index);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

class TelegramUserService {
  constructor(config, store) {
    this.config = (config && config.telegram) || {};
    this.store = store;
    this.accountFailures = new Map();
  }

  get configured() {
    return Boolean(this.config.enabled && this.config.apiId && this.config.apiHash);
  }

  clientParams() {
    const { Logger } = gramJs();
    return {
      connectionRetries: Number(this.config.connectionRetries || 5),
      requestRetries: 2,
      reconnectRetries: 0,
      autoReconnect: false,
      timeout: Math.ceil(this.requestTimeoutMs() / 1000),
      deviceModel: this.config.deviceModel || "DUMA Client Info API",
      systemVersion: this.config.systemVersion || "macOS",
      appVersion: this.config.appVersion || "1.0",
      langCode: "uk",
      systemLangCode: "uk",
      baseLogger: new Logger("none")
    };
  }

  requestTimeoutMs() {
    const timeoutMs = Number(this.config.requestTimeoutMs || 20000);
    return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20000;
  }

  accountLookupConcurrency() {
    const concurrency = Math.trunc(Number(this.config.accountLookupConcurrency || 2));
    return Number.isFinite(concurrency) && concurrency > 0 ? concurrency : 2;
  }

  contactCacheTtlMs() {
    const ttlMs = Number(this.config.contactCacheTtlMs || 60 * 60 * 1000);
    return Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 60 * 60 * 1000;
  }

  dialogLookupLimit() {
    const limit = Math.trunc(Number(this.config.dialogLookupLimit || 150));
    return Number.isFinite(limit) && limit > 0 ? limit : 150;
  }

  apiCredentials() {
    if (!this.configured) {
      throw new Error("telegram_not_configured");
    }
    return {
      apiId: Number(this.config.apiId),
      apiHash: this.config.apiHash
    };
  }

  createClient(sessionString = "") {
    const { TelegramClient, StringSession } = gramJs();
    const client = new TelegramClient(
      new StringSession(text(sessionString)),
      Number(this.config.apiId || 0),
      this.config.apiHash || "",
      this.clientParams()
    );
    if (typeof client.setLogLevel === "function") {
      client.setLogLevel("none");
    }
    client.onError = async () => {};
    return client;
  }

  accountFailureKey(account) {
    return text(account && (account.id || account.phoneDigits || account.phone));
  }

  accountCooldown(account) {
    const key = this.accountFailureKey(account);
    const entry = key ? this.accountFailures.get(key) : null;
    if (!entry) {
      return null;
    }
    if (Date.now() >= entry.until) {
      this.accountFailures.delete(key);
      return null;
    }
    return entry;
  }

  markAccountFailure(account, error) {
    if (!isTransientTelegramError(error)) {
      return;
    }
    const key = this.accountFailureKey(account);
    const cooldownMs = Number(this.config.failureCooldownMs || 60000);
    if (!key || !Number.isFinite(cooldownMs) || cooldownMs <= 0) {
      return;
    }
    this.accountFailures.set(key, {
      until: Date.now() + cooldownMs,
      error: compactError(error)
    });
  }

  async recordAccountFailure(account, error) {
    this.markAccountFailure(account, error);
    if (
      isTelegramSessionInvalidError(error) &&
      account &&
      account.id &&
      this.store &&
      typeof this.store.markFailed === "function"
    ) {
      await this.store.markFailed(account.id, compactError(error)).catch(() => {});
    }
  }

  clearAccountFailure(account) {
    const key = this.accountFailureKey(account);
    if (key) {
      this.accountFailures.delete(key);
    }
  }

  async withClient(account, callback, options = {}) {
    const sessionString = options.login
      ? account.loginSessionString || account.sessionString || ""
      : account.sessionString || "";
    const client = this.createClient(sessionString);
    const timeoutMs = this.requestTimeoutMs();
    try {
      await withTimeout(
        () => client.connect(),
        timeoutMs,
        "telegram_connect_timeout"
      );
      return await withTimeout(
        () => callback(client),
        timeoutMs,
        "telegram_request_timeout"
      );
    } finally {
      await withTimeout(
        () =>
          (typeof client.destroy === "function"
            ? client.destroy()
            : client.disconnect()
          ).catch(() => {}),
        Math.min(timeoutMs, 5000),
        "telegram_disconnect_timeout"
      ).catch(() => {});
    }
  }

  publicStatus() {
    return {
      ok: true,
      enabled: Boolean(this.config.enabled),
      configured: this.configured
    };
  }

  async adminAccounts() {
    const accounts = await this.store.listAccounts();
    return {
      ...this.publicStatus(),
      accounts
    };
  }

  async createAccount(input = {}) {
    const account = await this.store.createAccount(input);
    return {
      ok: true,
      account
    };
  }

  async updateAccount(id, input = {}) {
    const account = await this.store.updateAccount(id, input);
    if (!account) {
      return {
        ok: false,
        error: "telegram_account_not_found"
      };
    }
    return {
      ok: true,
      account
    };
  }

  async deleteAccount(id) {
    const account = await this.store.deleteAccount(id);
    if (!account) {
      return {
        ok: false,
        error: "telegram_account_not_found"
      };
    }
    return {
      ok: true,
      account
    };
  }

  async sendCode(id, options = {}) {
    const account = await this.store.getAccount(id, { includeSecrets: true });
    if (!account) {
      return {
        ok: false,
        error: "telegram_account_not_found"
      };
    }

    try {
      const credentials = this.apiCredentials();
      const result = await this.withClient(
        account,
        async (client) => {
          const sent = await client.sendCode(
            credentials,
            account.phone,
            options.forceSms === true
          );
          return {
            phoneCodeHash: sent.phoneCodeHash,
            isCodeViaApp: sent.isCodeViaApp,
            loginSessionString: client.session.save()
          };
        },
        { login: true }
      );
      const updated = await this.store.markLoginCodeSent(id, result);
      return {
        ok: true,
        isCodeViaApp: result.isCodeViaApp,
        account: updated
      };
    } catch (error) {
      await this.store.markFailed(id, compactError(error));
      return {
        ok: false,
        error: compactError(error)
      };
    }
  }

  async confirmCode(id, input = {}) {
    const account = await this.store.getAccount(id, { includeSecrets: true });
    if (!account) {
      return {
        ok: false,
        error: "telegram_account_not_found"
      };
    }
    const code = text(input.code);
    const password = String(input.password || "");

    if (!code && !password) {
      return {
        ok: false,
        error: "telegram_code_or_password_required"
      };
    }

    try {
      const credentials = this.apiCredentials();
      const result = await this.withClient(
        account,
        async (client) => {
          const signInPassword = async () => {
            await client.signInWithPassword(credentials, {
              password: async () => password,
              onError: async (error) => {
                throw error;
              }
            });
          };

          if (password && account.status === "password_required") {
            await signInPassword();
          } else {
            if (!account.phoneCodeHash) {
              throw new Error("telegram_code_was_not_requested");
            }
            const { Api } = gramJs();
            try {
              const auth = await client.invoke(
                new Api.auth.SignIn({
                  phoneNumber: account.phone,
                  phoneCodeHash: account.phoneCodeHash,
                  phoneCode: code
                })
              );
              if (auth instanceof Api.auth.AuthorizationSignUpRequired) {
                throw new Error("telegram_signup_required");
              }
            } catch (error) {
              if (password && /SESSION_PASSWORD_NEEDED/i.test(compactError(error))) {
                await signInPassword();
              } else {
                throw error;
              }
            }
          }

          const me = await client.getMe();
          return {
            sessionString: client.session.save(),
            user: telegramUserPayload(me, account.phone)
          };
        },
        { login: true }
      );

      const user = result.user || {};
      const updated = await this.store.markConnected(id, {
        sessionString: result.sessionString,
        telegramUserId: user.telegramUserId,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        payload: user.payload
      });
      return {
        ok: true,
        account: updated
      };
    } catch (error) {
      const message = compactError(error);
      if (/SESSION_PASSWORD_NEEDED/i.test(message)) {
        const loginSessionString = account.loginSessionString || account.sessionString || "";
        const updated = await this.store.markPasswordRequired(id, {
          loginSessionString
        });
        return {
          ok: true,
          passwordRequired: true,
          account: updated
        };
      }
      await this.store.markFailed(id, message);
      return {
        ok: false,
        error: message
      };
    }
  }

  async connectedAccounts(accountId = "") {
    const accounts = await this.store.listAccounts({
      includeSecrets: true,
      connectedOnly: true
    });
    const requested = text(accountId);
    return requested ? accounts.filter((account) => account.id === requested) : accounts;
  }

  isFreshCachedContact(contact) {
    if (!contact || !contact.lastCheckedAt) {
      return false;
    }
    const checkedAt = new Date(contact.lastCheckedAt).getTime();
    return Number.isFinite(checkedAt) && Date.now() - checkedAt <= this.contactCacheTtlMs();
  }

  inputPeerFromContact(contact) {
    if (!contact || !contact.found || !contact.telegramUserId || !contact.accessHash) {
      return null;
    }
    const { Api } = gramJs();
    return new Api.InputPeerUser({
      userId: contact.telegramUserId,
      accessHash: contact.accessHash
    });
  }

  async cachedContactForAccount(account, phone) {
    if (!this.store || typeof this.store.cachedContact !== "function") {
      return null;
    }
    try {
      return await this.store.cachedContact(account.id, phone);
    } catch (_) {
      return null;
    }
  }

  async resolveContact(client, account, phone, options = {}) {
    const cached = options.force ? null : await this.cachedContactForAccount(account, phone);
    if (!options.force && this.isFreshCachedContact(cached)) {
      const entity = this.inputPeerFromContact(cached);
      if (entity || cached.found === false) {
        return {
          contact: cached,
          entity,
          cached: true
        };
      }
    }

    return {
      ...(await this.importContact(client, account, phone)),
      cached: false
    };
  }

  async cacheTelegramContact(account, phone, user, source) {
    const contact = telegramContactFromUser(user, phone, source);
    return {
      contact: await this.store.cacheContact(account.id, phone, contact),
      entity: user
    };
  }

  async lookupExistingContact(client, account, phone) {
    const { Api } = gramJs();
    const contacts = await client.invoke(
      new Api.contacts.GetContacts({
        hash: 0
      })
    );
    const user = telegramUsersFromResult(contacts).find((candidate) =>
      userMatchesPhone(candidate, phone)
    );
    return user ? this.cacheTelegramContact(account, phone, user, "contacts_get_contacts") : null;
  }

  async lookupExistingDialog(client, account, phone) {
    if (typeof client.getDialogs !== "function") {
      return null;
    }
    const dialogs = await client.getDialogs({
      limit: this.dialogLookupLimit(),
      ignoreMigrated: true
    });
    const user = Array.from(dialogs || [])
      .map((dialog) => dialog && dialog.entity)
      .find((candidate) => userMatchesPhone(candidate, phone));
    return user ? this.cacheTelegramContact(account, phone, user, "dialog_lookup") : null;
  }

  async lookupExistingTelegramPeer(client, account, phone) {
    return (
      (await this.lookupExistingContact(client, account, phone)) ||
      (await this.lookupExistingDialog(client, account, phone))
    );
  }

  async deleteTemporaryImportedContact(client, user) {
    if (!user || typeof client.invoke !== "function") {
      return;
    }
    const { Api } = gramJs();
    await client.invoke(
      new Api.contacts.DeleteContacts({
        id: [user]
      })
    );
  }

  async importContact(client, account, phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      throw new Error("telegram_phone_invalid");
    }

    const { Api } = gramJs();
    try {
      const resolved = await client.invoke(
        new Api.contacts.ResolvePhone({
          phone: phoneDigits(normalized)
        })
      );
      const resolvedUser = resolvedPeerUser(resolved);
      if (resolvedUser) {
        const contact = telegramContactFromUser(
          resolvedUser,
          normalized,
          "resolve_phone"
        );
        return {
          contact: await this.store.cacheContact(account.id, normalized, contact),
          entity: resolvedUser
        };
      }
    } catch (error) {
      if (!canFallbackToImportContacts(error)) {
        throw error;
      }
      // Older accounts/API states may not resolve by phone until the contact is imported.
    }

    const existing = await this.lookupExistingTelegramPeer(client, account, normalized);
    if (existing) {
      return existing;
    }

    const clientId = Date.now();
    const input = new Api.InputPhoneContact({
      clientId,
      phone: normalized,
      firstName: "Client",
      lastName: phoneDigits(normalized).slice(-4)
    });
    const imported = await client.invoke(
      new Api.contacts.ImportContacts({
        contacts: [input]
      })
    );
    const user = importedUser(imported);
    if (user && importedContactWasCreated(imported, clientId)) {
      await this.deleteTemporaryImportedContact(client, user);
    }
    const contact = user
      ? telegramContactFromUser(user, normalized, "import_contacts")
      : {
          found: false,
          phone: normalized,
          phoneDigits: phoneDigits(normalized),
          displayName: normalized,
          payload: {}
        };
    return {
      contact: await this.store.cacheContact(account.id, normalized, contact),
      entity: user
    };
  }

  async conversationForAccount(account, phone, limit, options = {}) {
    const cooldown = this.accountCooldown(account);
    if (cooldown) {
      return this.cachedConversationForAccount(account, phone, limit, cooldown.error);
    }

    const cachedContact = options.force
      ? null
      : await this.cachedContactForAccount(account, phone);
    if (!options.force && this.isFreshCachedContact(cachedContact) && cachedContact.found === false) {
      return {
        account: telegramAccountSafe(account),
        found: false,
        cached: true,
        contact: cachedContact,
        messages: []
      };
    }

    try {
      const result = await this.withClient(account, async (client) => {
        const resolved = await this.resolveContact(client, account, phone, options);
        const contact = resolved.contact;
        if (!contact || !contact.found) {
          return {
            account: telegramAccountSafe(account),
            found: false,
            contact,
            messages: []
          };
        }

        const rawMessages = await client.getMessages(resolved.entity, { limit });
        const normalizedMessages = telegramMessageArray(rawMessages)
          .map(normalizeMessage)
          .filter((message) => message.id)
          .reverse();
        const messages = await hydrateTelegramReplyPreviews(
          client,
          resolved.entity,
          normalizedMessages
        );
        const peerKey = contact.telegramUserId || contact.username || contact.phoneDigits;
        await this.store.cacheMessages(account.id, phone, peerKey, messages);

        return {
          account: telegramAccountSafe(account),
          found: true,
          contact,
          messages
        };
      });
      this.clearAccountFailure(account);
      return result;
    } catch (error) {
      await this.recordAccountFailure(account, error);
      throw error;
    }
  }

  async cachedConversationForAccount(account, phone, limit, error) {
    let cached = null;
    if (this.store && typeof this.store.cachedConversation === "function") {
      try {
        cached = await this.store.cachedConversation(account.id, phone, limit);
      } catch (_) {
        cached = null;
      }
    }

    const contact = cached && cached.contact ? cached.contact : null;
    const messages = cached && Array.isArray(cached.messages)
      ? cached.messages.map(normalizeCachedTelegramMessage)
      : [];
    const hasCachedData = Boolean((contact && contact.found) || messages.length);
    return {
      account: telegramAccountSafe(account),
      found: hasCachedData,
      cached: hasCachedData,
      unavailable: true,
      error: compactError(error),
      contact,
      messages
    };
  }

  async conversation(input = {}) {
    const phone = normalizePhone(input.phone);
    if (!phone) {
      return {
        ok: false,
        error: "phone query parameter is required"
      };
    }

    if (!this.configured) {
      return {
        ...this.publicStatus(),
        phone,
        accounts: [],
        matches: [],
        selectedAccountId: "",
        contact: null,
        messages: []
      };
    }

    const limit = normalizeLimit(input.limit, Number(this.config.messageLimit || 50));
    const requestedAccountId = text(input.accountId);
    const force = truthy(input.force);
    const accounts = await this.connectedAccounts();

    const matches = await mapWithConcurrency(
      accounts,
      this.accountLookupConcurrency(),
      async (account) => {
      try {
        return await this.conversationForAccount(account, phone, limit, { force });
      } catch (error) {
        return await this.cachedConversationForAccount(account, phone, limit, error);
      }
      }
    );

    const selected =
      (requestedAccountId
        ? matches.find((match) => match.account && match.account.id === requestedAccountId)
        : null) ||
      matches.find((match) => match.found && match.messages.length) ||
      matches.find((match) => match.found) ||
      matches[0] ||
      null;

    return {
      ...this.publicStatus(),
      phone,
      accounts: accounts.map(telegramAccountSafe),
      matches,
      selectedAccountId: selected && selected.account ? selected.account.id : "",
      contact: selected ? selected.contact : null,
      messages: selected ? selected.messages : []
    };
  }

  async sendMessage(input = {}) {
    const phone = normalizePhone(input.phone);
    const accountId = text(input.accountId);
    const message = text(input.text);
    const replyToMessageId = Math.trunc(Number(input.replyToMessageId || 0));
    if (!phone || !accountId || !message) {
      return {
        ok: false,
        error: "phone_account_and_text_are_required"
      };
    }
    if (message.length > 4096) {
      return {
        ok: false,
        error: "telegram_message_too_long"
      };
    }

    const account = await this.store.getAccount(accountId, { includeSecrets: true });
    if (!account || account.status !== "connected" || !account.sessionString) {
      return {
        ok: false,
        error: "telegram_account_not_connected"
      };
    }

    try {
      const result = await this.withClient(account, async (client) => {
        const resolved = await this.resolveContact(client, account, phone);
        const contact = resolved.contact;
        if (!contact || !contact.found) {
          throw new Error("telegram_contact_not_found");
        }
        const sendOptions = {
          message,
          parseMode: false,
          linkPreview: false
        };
        if (Number.isFinite(replyToMessageId) && replyToMessageId > 0) {
          sendOptions.replyTo = replyToMessageId;
        }
        const sent = await client.sendMessage(resolved.entity, sendOptions);
        const normalized = normalizeMessage(sent);
        if (replyToMessageId > 0 && !normalized.replyToMessageId) {
          normalized.replyToMessageId = replyToMessageId;
          normalized.payload.replyToMessageId = replyToMessageId;
        }
        const peerKey = contact.telegramUserId || contact.username || contact.phoneDigits;
        await this.store.cacheMessages(account.id, phone, peerKey, [normalized]);
        return {
          contact,
          message: normalized
        };
      });

      return {
        ok: true,
        account: telegramAccountSafe(account),
        contact: result.contact,
        message: result.message
      };
    } catch (error) {
      await this.recordAccountFailure(account, error);
      return {
        ok: false,
        error: compactError(error)
      };
    }
  }

  async media(input = {}) {
    const phone = normalizePhone(input.phone);
    const accountId = text(input.accountId);
    const messageId = Math.trunc(Number(input.messageId || 0));
    if (!phone || !accountId || !messageId) {
      return {
        ok: false,
        error: "phone_account_and_message_are_required"
      };
    }

    const account = await this.store.getAccount(accountId, { includeSecrets: true });
    if (!account || account.status !== "connected" || !account.sessionString) {
      return {
        ok: false,
        error: "telegram_account_not_connected"
      };
    }

    try {
      const result = await this.withClient(account, async (client) => {
        const resolved = await this.resolveContact(client, account, phone);
        const contact = resolved.contact;
        if (!contact || !contact.found) {
          throw new Error("telegram_contact_not_found");
        }
        const rawMessages = await client.getMessages(resolved.entity, {
          ids: [messageId]
        });
        const message = telegramMessageArray(rawMessages).find(
          (item) => Number(item && item.id) === messageId
        );
        if (!message) {
          throw new Error("telegram_message_not_found");
        }
        const media = normalizeTelegramMedia(message);
        if (!media || !media.downloadable) {
          throw new Error("telegram_media_not_found");
        }
        const bytes = await client.downloadMedia(message, {});
        if (!bytes) {
          throw new Error("telegram_media_download_failed");
        }
        return {
          bytes: Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes),
          contentType: media.mimeType || "application/octet-stream",
          filename: media.filename || `telegram-media-${messageId}`
        };
      });
      this.clearAccountFailure(account);
      return {
        ok: true,
        ...result
      };
    } catch (error) {
      await this.recordAccountFailure(account, error);
      return {
        ok: false,
        error: compactError(error)
      };
    }
  }
}

function telegramAccountSafe(account) {
  if (!account) {
    return null;
  }
  return {
    id: account.id,
    label: account.label,
    phone: account.phone,
    phoneDigits: account.phoneDigits,
    enabled: account.enabled !== false,
    status: account.status,
    isDefault: account.isDefault === true,
    telegramUserId: account.telegramUserId,
    username: account.username,
    firstName: account.firstName,
    lastName: account.lastName,
    displayName: account.displayName,
    lastError: account.lastError,
    codeSentAt: account.codeSentAt,
    lastConnectedAt: account.lastConnectedAt,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  };
}

module.exports = {
  TelegramUserService
};
