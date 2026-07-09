"use strict";

const assert = require("node:assert/strict");
const { nextTelegramAccountStatus } = require("../lib/app-state-db");
const { TelegramUserService } = require("../lib/telegram-service");

function service(config = {}, store = {}) {
  return new TelegramUserService(
    {
      telegram: {
        enabled: true,
        apiId: 1,
        apiHash: "hash",
        messageLimit: 50,
        ...config
      }
    },
    store
  );
}

async function disabledConversationReturnsSafePayload() {
  const telegram = service(
    {
      enabled: false,
      apiId: 0,
      apiHash: ""
    },
    {
      listAccounts: async () => []
    }
  );

  const result = await telegram.conversation({ phone: "+380671112233" });
  assert.equal(result.ok, true);
  assert.equal(result.enabled, false);
  assert.equal(result.configured, false);
  assert.deepEqual(result.matches, []);
}

async function telegramClientIsQuietAndShortLived() {
  const telegram = service();
  const client = telegram.createClient("");
  assert.equal(client.logger.logLevel, "none");
  assert.equal(telegram.clientParams().autoReconnect, false);
  assert.equal(telegram.clientParams().reconnectRetries, 0);
}

async function withClientTimesOutAndDisconnects() {
  let disconnected = false;
  const telegram = service({
    requestTimeoutMs: 10
  });
  telegram.createClient = () => ({
    connect: async () => {},
    disconnect: async () => {
      disconnected = true;
    }
  });

  await assert.rejects(
    () => telegram.withClient({ sessionString: "session" }, async () => new Promise(() => {})),
    /telegram_request_timeout/
  );
  assert.equal(disconnected, true);
}

async function withClientDestroysTelegramClient() {
  let destroyed = false;
  let disconnected = false;
  const telegram = service();
  telegram.createClient = () => ({
    connect: async () => {},
    destroy: async () => {
      destroyed = true;
    },
    disconnect: async () => {
      disconnected = true;
    }
  });

  const result = await telegram.withClient(
    { sessionString: "session" },
    async () => "ok"
  );

  assert.equal(result, "ok");
  assert.equal(destroyed, true);
  assert.equal(disconnected, false);
}

async function selectedAccountDoesNotHideOtherAccounts() {
  const accounts = [
    { id: "a", status: "connected", enabled: true, sessionString: "s", label: "A" },
    { id: "b", status: "connected", enabled: true, sessionString: "s", label: "B" }
  ];
  const telegram = service(
    {},
    {
      listAccounts: async () => accounts
    }
  );

  telegram.conversationForAccount = async (account) => ({
    account: { id: account.id, label: account.label },
    found: account.id === "a",
    contact: account.id === "a" ? { displayName: "Found" } : null,
    messages: account.id === "a" ? [{ id: 1, text: "hello" }] : []
  });

  const result = await telegram.conversation({
    phone: "+380671112233",
    accountId: "b"
  });

  assert.equal(result.matches.length, 2);
  assert.equal(result.selectedAccountId, "b");
}

async function reenabledConnectedAccountStaysConnected() {
  assert.equal(
    nextTelegramAccountStatus(
      {
        status: "disabled",
        sessionString: "saved-session"
      },
      true
    ),
    "connected"
  );
  assert.equal(nextTelegramAccountStatus({ status: "disabled" }, true), "draft");
  assert.equal(nextTelegramAccountStatus({ status: "connected" }, false), "disabled");
}

async function accountLookupRunsInBoundedParallelAndKeepsOrder() {
  const accounts = [
    { id: "a", status: "connected", enabled: true, sessionString: "s", label: "A" },
    { id: "b", status: "connected", enabled: true, sessionString: "s", label: "B" },
    { id: "c", status: "connected", enabled: true, sessionString: "s", label: "C" }
  ];
  const resolvers = {};
  const started = [];
  let active = 0;
  let maxActive = 0;
  const telegram = service(
    {
      accountLookupConcurrency: 2
    },
    {
      listAccounts: async () => accounts
    }
  );

  telegram.conversationForAccount = async (account) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    started.push(account.id);
    await new Promise((resolve) => {
      resolvers[account.id] = resolve;
    });
    active -= 1;
    return {
      account: { id: account.id, label: account.label },
      found: account.id === "c",
      contact: account.id === "c" ? { displayName: "Client" } : null,
      messages: account.id === "c" ? [{ id: 3, text: "third" }] : []
    };
  };

  const pending = telegram.conversation({ phone: "+380671112233" });
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(started, ["a", "b"]);
  resolvers.b();
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(started, ["a", "b", "c"]);
  resolvers.a();
  resolvers.c();
  const result = await pending;

  assert.equal(maxActive, 2);
  assert.deepEqual(result.matches.map((match) => match.account.id), ["a", "b", "c"]);
  assert.equal(result.selectedAccountId, "c");
}

async function codeAndPasswordCanBeConfirmedInOneSubmit() {
  let passwordUsed = false;
  const telegram = service(
    {},
    {
      getAccount: async () => ({
        id: "tg1",
        phone: "+380671112233",
        status: "code_sent",
        phoneCodeHash: "hash",
        loginSessionString: "login"
      }),
      markConnected: async (id, data) => ({ id, status: "connected", ...data }),
      markPasswordRequired: async () => {
        throw new Error("should_not_require_second_submit");
      },
      markFailed: async (id, error) => ({ id, status: "failed", error })
    }
  );

  telegram.withClient = async (account, callback) => callback({
    invoke: async () => {
      throw new Error("SESSION_PASSWORD_NEEDED");
    },
    signInWithPassword: async () => {
      passwordUsed = true;
    },
    getMe: async () => ({ id: 42, firstName: "Duma", phone: "380671112233" }),
    session: {
      save: () => "connected-session"
    }
  });

  const result = await telegram.confirmCode("tg1", {
    code: "12345",
    password: "secret"
  });

  assert.equal(result.ok, true);
  assert.equal(passwordUsed, true);
  assert.equal(result.account.sessionString, "connected-session");
}

async function resolvePhoneIsUsedBeforeImportContacts() {
  const calls = [];
  const telegram = service(
    {},
    {
      cacheContact: async (accountId, phone, contact) => ({
        accountId,
        phone,
        ...contact
      })
    }
  );
  const client = {
    invoke: async (request) => {
      calls.push(request.className);
      if (request.className === "contacts.ResolvePhone") {
        return {
          peer: { userId: 777 },
          users: [{ id: 777, firstName: "Test", phone: "380671112233", accessHash: "1" }]
        };
      }
      throw new Error("import_should_not_run");
    }
  };

  const result = await telegram.importContact(client, { id: "acc" }, "+380671112233");

  assert.equal(result.contact.found, true);
  assert.equal(result.contact.payload.source, "resolve_phone");
  assert.deepEqual(calls, ["contacts.ResolvePhone"]);
}

async function localUkrainianPhoneNormalizesBeforeTelegramLookup() {
  const calls = [];
  const telegram = service(
    {},
    {
      cacheContact: async (accountId, phone, contact) => ({
        accountId,
        phone,
        ...contact
      })
    }
  );
  const client = {
    invoke: async (request) => {
      calls.push({ className: request.className, phone: request.phone });
      if (request.className === "contacts.ResolvePhone") {
        assert.equal(request.phone, "380676758048");
        return {
          peer: { userId: 777 },
          users: [{ id: 777, firstName: "Test", phone: "380676758048", accessHash: "1" }]
        };
      }
      throw new Error(`unexpected request: ${request.className}`);
    }
  };

  const result = await telegram.importContact(client, { id: "acc" }, "0676758048");

  assert.equal(result.contact.found, true);
  assert.deepEqual(calls.map((call) => call.className), ["contacts.ResolvePhone"]);
}

async function existingSavedContactIsUsedBeforeImportContacts() {
  const calls = [];
  const telegram = service(
    {},
    {
      cacheContact: async (accountId, phone, contact) => ({
        accountId,
        phone,
        ...contact
      })
    }
  );
  const client = {
    invoke: async (request) => {
      calls.push(request.className);
      if (request.className === "contacts.ResolvePhone") {
        throw new Error("PHONE_NOT_OCCUPIED");
      }
      if (request.className === "contacts.GetContacts") {
        return {
          users: [
            { id: 777, firstName: "Existing", phone: "0676758048", accessHash: "1" }
          ]
        };
      }
      throw new Error(`unexpected request: ${request.className}`);
    }
  };

  const result = await telegram.importContact(client, { id: "acc" }, "0676758048");

  assert.equal(result.contact.found, true);
  assert.equal(result.contact.displayName, "Existing");
  assert.equal(result.contact.payload.source, "contacts_get_contacts");
  assert.deepEqual(calls, ["contacts.ResolvePhone", "contacts.GetContacts"]);
}

async function existingDialogIsUsedBeforeImportContacts() {
  const calls = [];
  const telegram = service(
    {},
    {
      cacheContact: async (accountId, phone, contact) => ({
        accountId,
        phone,
        ...contact
      })
    }
  );
  const client = {
    invoke: async (request) => {
      calls.push(request.className);
      if (request.className === "contacts.ResolvePhone") {
        throw new Error("PHONE_NOT_OCCUPIED");
      }
      if (request.className === "contacts.GetContacts") {
        return { users: [] };
      }
      throw new Error(`unexpected request: ${request.className}`);
    },
    getDialogs: async (options) => {
      calls.push(`getDialogs:${options.limit}`);
      return [
        {
          entity: {
            id: 888,
            firstName: "Dialog",
            phone: "380676758048",
            accessHash: "2"
          }
        }
      ];
    }
  };

  const result = await telegram.importContact(client, { id: "acc" }, "0676758048");

  assert.equal(result.contact.found, true);
  assert.equal(result.contact.displayName, "Dialog");
  assert.equal(result.contact.payload.source, "dialog_lookup");
  assert.deepEqual(calls, ["contacts.ResolvePhone", "contacts.GetContacts", "getDialogs:150"]);
}

async function importContactsFallbackStillFindsUsers() {
  const calls = [];
  const telegram = service(
    {},
    {
      cacheContact: async (accountId, phone, contact) => ({
        accountId,
        phone,
        ...contact
      })
    }
  );
  const client = {
    invoke: async (request) => {
      calls.push(request.className);
      if (request.className === "contacts.ResolvePhone") {
        throw new Error("PHONE_NOT_OCCUPIED");
      }
      if (request.className === "contacts.GetContacts") {
        return { users: [] };
      }
      if (request.className === "contacts.ImportContacts") {
        assert.notEqual(request.contacts[0].firstName, "DUMA");
        return {
          users: [{ id: 888, firstName: "Imported", phone: "380671112233", accessHash: "2" }]
        };
      }
      throw new Error(`unexpected request: ${request.className}`);
    }
  };

  const result = await telegram.importContact(client, { id: "acc" }, "+380671112233");

  assert.equal(result.contact.found, true);
  assert.equal(result.contact.payload.source, "import_contacts");
  assert.deepEqual(calls, [
    "contacts.ResolvePhone",
    "contacts.GetContacts",
    "contacts.ImportContacts"
  ]);
}

async function temporaryImportedContactIsDeletedAfterLookup() {
  const calls = [];
  const telegram = service(
    {},
    {
      cacheContact: async (accountId, phone, contact) => ({
        accountId,
        phone,
        ...contact
      })
    }
  );
  const client = {
    invoke: async (request) => {
      calls.push(request.className);
      if (request.className === "contacts.ResolvePhone") {
        throw new Error("PHONE_NOT_OCCUPIED");
      }
      if (request.className === "contacts.GetContacts") {
        return { users: [] };
      }
      if (request.className === "contacts.ImportContacts") {
        assert.notEqual(request.contacts[0].firstName, "DUMA");
        return {
          imported: [{ clientId: request.contacts[0].clientId, userId: 999 }],
          users: [{ id: 999, firstName: "Imported", phone: "380671112233", accessHash: "3" }]
        };
      }
      if (request.className === "contacts.DeleteContacts") {
        assert.equal(request.id.length, 1);
        assert.equal(request.id[0].firstName, "Imported");
        return {};
      }
      throw new Error(`unexpected request: ${request.className}`);
    }
  };

  const result = await telegram.importContact(client, { id: "acc" }, "+380671112233");

  assert.equal(result.contact.found, true);
  assert.deepEqual(calls, [
    "contacts.ResolvePhone",
    "contacts.GetContacts",
    "contacts.ImportContacts",
    "contacts.DeleteContacts"
  ]);
}

async function resolvePhoneTimeoutDoesNotImportContact() {
  const calls = [];
  const telegram = service(
    {},
    {
      cacheContact: async () => {
        throw new Error("cache_should_not_run");
      }
    }
  );
  const client = {
    invoke: async (request) => {
      calls.push(request.className);
      if (request.className === "contacts.ResolvePhone") {
        throw new Error("TIMEOUT");
      }
      throw new Error("import_should_not_run");
    }
  };

  await assert.rejects(
    () => telegram.importContact(client, { id: "acc" }, "+380671112233"),
    /TIMEOUT/
  );
  assert.deepEqual(calls, ["contacts.ResolvePhone"]);
}

async function resolvePhoneFloodWaitDoesNotImportContact() {
  const calls = [];
  const telegram = service(
    {},
    {
      cacheContact: async () => {
        throw new Error("cache_should_not_run");
      }
    }
  );
  const client = {
    invoke: async (request) => {
      calls.push(request.className);
      if (request.className === "contacts.ResolvePhone") {
        throw new Error("FLOOD_WAIT_30");
      }
      throw new Error("import_should_not_run");
    }
  };

  await assert.rejects(
    () => telegram.importContact(client, { id: "acc" }, "+380671112233"),
    /FLOOD_WAIT_30/
  );
  assert.deepEqual(calls, ["contacts.ResolvePhone"]);
}

async function cachedContactReadsMessagesWithoutImportingAgain() {
  let liveAttempts = 0;
  const telegram = service(
    {
      contactCacheTtlMs: 60000
    },
    {
      cachedContact: async () => ({
        found: true,
        telegramUserId: "999",
        accessHash: "3",
        phone: "+380671112233",
        phoneDigits: "380671112233",
        displayName: "Cached Client",
        lastCheckedAt: new Date().toISOString()
      }),
      cacheMessages: async () => {}
    }
  );
  telegram.withClient = async (account, callback) => {
    liveAttempts += 1;
    return callback({
      invoke: async (request) => {
        throw new Error(`unexpected request: ${request.className}`);
      },
      getMessages: async (entity, options) => {
        assert.equal(entity.className, "InputPeerUser");
        assert.equal(options.limit, 20);
        return [
          {
            id: 101,
            out: false,
            message: "From cached peer",
            date: 1783094400,
            senderId: 999
          }
        ];
      }
    });
  };

  const fresh = await telegram.conversationForAccount(
    {
      id: "acc",
      status: "connected",
      enabled: true,
      sessionString: "session",
      label: "Main"
    },
    "+380671112233",
    20
  );

  assert.equal(liveAttempts, 1);
  assert.equal(fresh.found, true);
  assert.equal(fresh.messages[0].text, "From cached peer");
}

async function conversationNormalizesRepliesAndMedia() {
  const cachedMessages = [];
  const telegram = service(
    {},
    {
      cacheMessages: async (accountId, phone, peerKey, messages) => {
        cachedMessages.push({ accountId, phone, peerKey, messages });
      }
    }
  );
  telegram.resolveContact = async () => ({
    contact: {
      found: true,
      telegramUserId: "999",
      phoneDigits: "380671112233",
      displayName: "Client"
    },
    entity: { id: 999 }
  });
  telegram.withClient = async (account, callback) => callback({
    getMessages: async () => [
      {
        id: 12,
        out: true,
        message: "Answer",
        replyToMsgId: 11,
        date: 1783094401,
        senderId: 42
      },
      {
        id: 11,
        out: false,
        message: "Photo caption",
        media: {
          className: "MessageMediaPhoto",
          photo: {}
        },
        date: 1783094400,
        senderId: 999
      }
    ]
  });

  const result = await telegram.conversationForAccount(
    {
      id: "acc",
      status: "connected",
      enabled: true,
      sessionString: "session",
      label: "Main"
    },
    "+380671112233",
    20
  );

  assert.equal(result.found, true);
  assert.equal(result.messages[0].media.type, "photo");
  assert.equal(result.messages[1].replyToMessageId, 11);
  assert.equal(result.messages[1].replyPreview.text, "Photo caption");
  assert.equal(cachedMessages[0].messages[1].replyPreview.text, "Photo caption");
}

async function conversationFetchesMissingReplyPreview() {
  const getMessageCalls = [];
  const telegram = service(
    {},
    {
      cacheMessages: async () => {}
    }
  );
  telegram.resolveContact = async () => ({
    contact: {
      found: true,
      telegramUserId: "999",
      phoneDigits: "380671112233",
      displayName: "Client"
    },
    entity: { id: 999 }
  });
  telegram.withClient = async (account, callback) => callback({
    getMessages: async (entity, options) => {
      getMessageCalls.push(options);
      if (options && options.ids) {
        assert.deepEqual(options.ids, [11]);
        return [
          {
            id: 11,
            out: false,
            message: "Older message",
            date: 1783094300,
            senderId: 999
          }
        ];
      }
      assert.equal(options.limit, 20);
      return [
        {
          id: 12,
          out: true,
          message: "Reply to older",
          replyTo: {
            replyToMsgId: 11
          },
          date: 1783094401,
          senderId: 42
        }
      ];
    }
  });

  const result = await telegram.conversationForAccount(
    {
      id: "acc",
      status: "connected",
      enabled: true,
      sessionString: "session",
      label: "Main"
    },
    "+380671112233",
    20
  );

  assert.equal(result.found, true);
  assert.equal(result.messages.length, 1);
  assert.equal(result.messages[0].replyToMessageId, 11);
  assert.equal(result.messages[0].replyPreview.text, "Older message");
  assert.equal(getMessageCalls.length, 2);
}

async function negativeCachedContactSkipsLiveLookup() {
  let liveAttempts = 0;
  const telegram = service(
    {
      contactCacheTtlMs: 60000
    },
    {
      cachedContact: async () => ({
        found: false,
        phone: "+380671112233",
        phoneDigits: "380671112233",
        displayName: "+380671112233",
        lastCheckedAt: new Date().toISOString()
      })
    }
  );
  telegram.withClient = async () => {
    liveAttempts += 1;
    throw new Error("should_not_connect");
  };

  const result = await telegram.conversationForAccount(
    {
      id: "acc",
      status: "connected",
      enabled: true,
      sessionString: "session",
      label: "Main"
    },
    "+380671112233",
    20
  );

  assert.equal(liveAttempts, 0);
  assert.equal(result.found, false);
  assert.equal(result.cached, true);
}

async function forceRefreshBypassesNegativeCachedContact() {
  let liveAttempts = 0;
  const telegram = service(
    {
      contactCacheTtlMs: 60000
    },
    {
      cachedContact: async () => ({
        found: false,
        phone: "+380671112233",
        phoneDigits: "380671112233",
        displayName: "+380671112233",
        lastCheckedAt: new Date().toISOString()
      }),
      cacheContact: async (accountId, phone, contact) => ({
        accountId,
        phone,
        ...contact
      }),
      cacheMessages: async () => {}
    }
  );
  telegram.withClient = async (account, callback) => {
    liveAttempts += 1;
    return callback({
      invoke: async (request) => {
        if (request.className === "contacts.ResolvePhone") {
          return {
            peer: { userId: 999 },
            users: [{ id: 999, firstName: "Client", phone: "380671112233", accessHash: "3" }]
          };
        }
        throw new Error(`unexpected request: ${request.className}`);
      },
      getMessages: async () => []
    });
  };

  const result = await telegram.conversationForAccount(
    {
      id: "acc",
      status: "connected",
      enabled: true,
      sessionString: "session",
      label: "Main"
    },
    "+380671112233",
    20,
    { force: true }
  );

  assert.equal(liveAttempts, 1);
  assert.equal(result.found, true);
  assert.equal(result.contact.displayName, "Client");
}

async function sendMessageCachesTheSentMessage() {
  const cachedMessages = [];
  const telegram = service(
    {},
    {
      getAccount: async () => ({
        id: "acc",
        status: "connected",
        enabled: true,
        sessionString: "session",
        label: "Main"
      }),
      cacheContact: async (accountId, phone, contact) => ({
        accountId,
        phone,
        ...contact
      }),
      cacheMessages: async (accountId, phone, peerKey, messages) => {
        cachedMessages.push({ accountId, phone, peerKey, messages });
      }
    }
  );

  telegram.withClient = async (account, callback) => callback({
    invoke: async (request) => {
      if (request.className === "contacts.ResolvePhone") {
        return {
          peer: { userId: 999 },
          users: [{ id: 999, firstName: "Client", phone: "380671112233", accessHash: "3" }]
        };
      }
      throw new Error(`unexpected request: ${request.className}`);
    },
    sendMessage: async () => ({
      id: 55,
      out: true,
      message: "Hello",
      date: 1783094400,
      senderId: 42
    })
  });

  const result = await telegram.sendMessage({
    phone: "+380671112233",
    accountId: "acc",
    text: "Hello"
  });

  assert.equal(result.ok, true);
  assert.equal(result.message.direction, "outgoing");
  assert.equal(cachedMessages.length, 1);
  assert.equal(cachedMessages[0].messages[0].text, "Hello");
}

async function sendMessagePassesReplyToMessageId() {
  let sendOptions = null;
  const telegram = service(
    {},
    {
      getAccount: async () => ({
        id: "acc",
        status: "connected",
        enabled: true,
        sessionString: "session",
        label: "Main"
      }),
      cacheMessages: async () => {}
    }
  );
  telegram.resolveContact = async () => ({
    contact: {
      found: true,
      telegramUserId: "999",
      phoneDigits: "380671112233",
      displayName: "Client"
    },
    entity: { id: 999 }
  });
  telegram.withClient = async (account, callback) => callback({
    sendMessage: async (entity, options) => {
      sendOptions = options;
      return {
        id: 56,
        out: true,
        message: "Reply",
        replyToMsgId: options.replyTo,
        date: 1783094400,
        senderId: 42
      };
    }
  });

  const result = await telegram.sendMessage({
    phone: "+380671112233",
    accountId: "acc",
    text: "Reply",
    replyToMessageId: 101
  });

  assert.equal(result.ok, true);
  assert.equal(sendOptions.replyTo, 101);
  assert.equal(result.message.replyToMessageId, 101);
}

async function mediaDownloadReturnsPdfBytes() {
  const telegram = service(
    {},
    {
      getAccount: async () => ({
        id: "acc",
        status: "connected",
        enabled: true,
        sessionString: "session",
        label: "Main"
      })
    }
  );
  telegram.resolveContact = async () => ({
    contact: {
      found: true,
      telegramUserId: "999",
      phoneDigits: "380671112233",
      displayName: "Client"
    },
    entity: { id: 999 }
  });
  telegram.withClient = async (account, callback) => callback({
    getMessages: async (entity, options) => {
      assert.deepEqual(options.ids, [77]);
      return {
        id: 77,
        message: "",
        media: {
          document: {
            mimeType: "application/pdf",
            size: 12,
            attributes: [
              {
                className: "DocumentAttributeFilename",
                fileName: "ticket.pdf"
              }
            ]
          }
        }
      };
    },
    downloadMedia: async () => Buffer.from("%PDF")
  });

  const result = await telegram.media({
    phone: "+380671112233",
    accountId: "acc",
    messageId: 77
  });

  assert.equal(result.ok, true);
  assert.equal(result.contentType, "application/pdf");
  assert.equal(result.filename, "ticket.pdf");
  assert.equal(result.bytes.toString(), "%PDF");
}

async function mediaOnlyMessageDoesNotUsePlaceholderText() {
  const telegram = service(
    {},
    {
      cacheMessages: async () => {}
    }
  );
  telegram.resolveContact = async () => ({
    contact: {
      found: true,
      telegramUserId: "999",
      phoneDigits: "380671112233",
      displayName: "Client"
    },
    entity: { id: 999 }
  });
  telegram.withClient = async (account, callback) => callback({
    getMessages: async () => [
      {
        id: 88,
        out: true,
        message: "",
        media: {
          document: {
            mimeType: "application/pdf",
            attributes: [
              {
                className: "DocumentAttributeFilename",
                fileName: "ticket.pdf"
              }
            ]
          }
        },
        date: 1783094400,
        senderId: 42
      }
    ]
  });

  const result = await telegram.conversationForAccount(
    {
      id: "acc",
      status: "connected",
      enabled: true,
      sessionString: "session",
      label: "Main"
    },
    "+380671112233",
    20
  );

  assert.equal(result.messages[0].text, "");
  assert.equal(result.messages[0].media.type, "pdf");
}

async function conversationLabelsTelegramMessageKinds() {
  const telegram = service(
    {},
    {
      cacheMessages: async () => {}
    }
  );
  telegram.resolveContact = async () => ({
    contact: {
      found: true,
      telegramUserId: "999",
      phoneDigits: "380671112233",
      displayName: "Client"
    },
    entity: { id: 999 }
  });
  telegram.withClient = async (account, callback) => callback({
    getMessages: async () => [
      {
        id: 91,
        out: true,
        message: "",
        media: {
          document: {
            mimeType: "audio/ogg",
            attributes: [
              {
                className: "DocumentAttributeAudio",
                voice: true,
                duration: 12
              }
            ]
          }
        },
        date: 1783094400,
        senderId: 42
      },
      {
        id: 92,
        out: true,
        message: "",
        media: {
          document: {
            mimeType: "image/webp",
            attributes: [
              {
                className: "DocumentAttributeSticker",
                alt: ":)"
              }
            ]
          }
        },
        date: 1783094401,
        senderId: 42
      },
      {
        id: 93,
        out: true,
        message: "",
        media: {
          className: "MessageMediaContact",
          firstName: "Іван",
          lastName: "Петренко",
          phoneNumber: "+380671112233"
        },
        date: 1783094402,
        senderId: 42
      },
      {
        id: 94,
        out: true,
        message: "",
        media: {
          className: "MessageMediaGeo",
          geo: { lat: 50.45, long: 30.52 }
        },
        date: 1783094403,
        senderId: 42
      },
      {
        id: 95,
        out: true,
        message: "",
        media: {
          className: "MessageMediaDice",
          emoticon: "🎲",
          value: 5
        },
        date: 1783094404,
        senderId: 42
      },
      {
        id: 96,
        out: true,
        message: "",
        action: {
          className: "MessageActionPhoneCall"
        },
        date: 1783094405,
        senderId: 42
      }
    ]
  });

  const result = await telegram.conversationForAccount(
    {
      id: "acc",
      status: "connected",
      enabled: true,
      sessionString: "session",
      label: "Main"
    },
    "+380671112233",
    20
  );

  const byId = new Map(result.messages.map((message) => [message.id, message]));
  assert.equal(byId.get(91).media.type, "voice");
  assert.equal(byId.get(91).media.label, "Голосове повідомлення");
  assert.equal(byId.get(92).media.type, "sticker");
  assert.equal(byId.get(93).media.type, "contact");
  assert.equal(byId.get(93).media.label, "Іван Петренко");
  assert.equal(byId.get(94).media.type, "location");
  assert.equal(byId.get(95).media.type, "dice");
  assert.equal(byId.get(96).media.type, "service");
  assert.equal(byId.get(96).media.label, "Телефонний дзвінок");
  assert.ok(!byId.get(96).media.description.includes("MessageAction"));
}

async function conversationLabelsTelegramServiceActions() {
  const actionClassNames = [
    "MessageActionEmpty",
    "MessageActionChatCreate",
    "MessageActionChatEditTitle",
    "MessageActionChatEditPhoto",
    "MessageActionChatDeletePhoto",
    "MessageActionChatAddUser",
    "MessageActionChatDeleteUser",
    "MessageActionChatJoinedByLink",
    "MessageActionChannelCreate",
    "MessageActionChatMigrateTo",
    "MessageActionChannelMigrateFrom",
    "MessageActionPinMessage",
    "MessageActionHistoryClear",
    "MessageActionGameScore",
    "MessageActionPaymentSentMe",
    "MessageActionPaymentSent",
    "MessageActionPhoneCall",
    "MessageActionScreenshotTaken",
    "MessageActionCustomAction",
    "MessageActionBotAllowed",
    "MessageActionSecureValuesSentMe",
    "MessageActionSecureValuesSent",
    "MessageActionContactSignUp",
    "MessageActionGeoProximityReached",
    "MessageActionGroupCall",
    "MessageActionInviteToGroupCall",
    "MessageActionSetMessagesTTL",
    "MessageActionGroupCallScheduled",
    "MessageActionSetChatTheme",
    "MessageActionChatJoinedByRequest",
    "MessageActionWebViewDataSentMe",
    "MessageActionWebViewDataSent",
    "MessageActionGiftPremium",
    "MessageActionTopicCreate",
    "MessageActionTopicEdit",
    "MessageActionSuggestProfilePhoto",
    "MessageActionRequestedPeer",
    "MessageActionSetChatWallPaper",
    "MessageActionGiftCode",
    "MessageActionGiveawayLaunch",
    "MessageActionGiveawayResults",
    "MessageActionBoostApply",
    "MessageActionRequestedPeerSentMe",
    "MessageActionPaymentRefunded",
    "MessageActionGiftStars",
    "MessageActionPrizeStars",
    "MessageActionStarGift",
    "MessageActionStarGiftUnique"
  ];
  const telegram = service(
    {},
    {
      cacheMessages: async () => {}
    }
  );
  telegram.resolveContact = async () => ({
    contact: {
      found: true,
      telegramUserId: "999",
      phoneDigits: "380671112233",
      displayName: "Client"
    },
    entity: { id: 999 }
  });
  telegram.withClient = async (account, callback) => callback({
    getMessages: async () => actionClassNames.map((className, index) => ({
      id: 200 + index,
      out: true,
      message: "",
      action: {
        className,
        title: "Тест",
        message: "Тестова дія",
        score: 5,
        duration: 75,
        period: 3600,
        distance: 150,
        emoticon: "🎨",
        stars: 10
      },
      date: 1783094400 + index,
      senderId: 42
    }))
  });

  const result = await telegram.conversationForAccount(
    {
      id: "acc",
      status: "connected",
      enabled: true,
      sessionString: "session",
      label: "Main"
    },
    "+380671112233",
    100
  );

  assert.equal(result.messages.length, actionClassNames.length);
  for (const message of result.messages) {
    assert.equal(message.media.type, "service");
    assert.ok(message.media.label);
    assert.ok(message.media.description);
    assert.ok(!message.media.label.includes("MessageAction"));
    assert.ok(!message.media.description.includes("MessageAction"));
  }
}

async function cachedConversationRelabelsServiceActions() {
  const telegram = service(
    {},
    {
      cachedConversation: async () => ({
        contact: {
          found: true,
          displayName: "Cached Client"
        },
        messages: [
          {
            id: 500,
            direction: "incoming",
            text: "",
            media: {
              type: "service",
              label: "Службове повідомлення",
              description: "MessageActionPhoneCall",
              className: "MessageActionPhoneCall"
            },
            payload: {
              hasMedia: true,
              media: {
                type: "service",
                label: "Службове повідомлення",
                description: "MessageActionPhoneCall",
                className: "MessageActionPhoneCall"
              }
            },
            sentAt: "2026-07-08T13:10:00.000Z"
          }
        ]
      })
    }
  );

  const result = await telegram.cachedConversationForAccount(
    {
      id: "acc",
      status: "connected",
      enabled: true,
      sessionString: "session",
      label: "Main"
    },
    "+380671112233",
    20,
    new Error("TIMEOUT")
  );

  assert.equal(result.messages[0].media.label, "Телефонний дзвінок");
  assert.ok(!result.messages[0].media.description.includes("MessageAction"));
  assert.equal(result.messages[0].payload.media.label, "Телефонний дзвінок");
  assert.ok(!result.messages[0].payload.media.description.includes("MessageAction"));
}

async function conversationTimeoutUsesCacheAndCooldown() {
  let liveAttempts = 0;
  const account = {
    id: "acc",
    status: "connected",
    enabled: true,
    sessionString: "session",
    label: "Main"
  };
  const telegram = service(
    {
      failureCooldownMs: 60000
    },
    {
      listAccounts: async () => [account],
      cachedConversation: async () => ({
        contact: {
          found: true,
          displayName: "Cached Client"
        },
        messages: [
          {
            id: 77,
            direction: "incoming",
            text: "Cached hello",
            sentAt: "2026-07-03T10:00:00.000Z"
          }
        ]
      })
    }
  );

  telegram.withClient = async () => {
    liveAttempts += 1;
    throw new Error("TIMEOUT");
  };

  const first = await telegram.conversation({ phone: "+380671112233" });
  assert.equal(liveAttempts, 1);
  assert.equal(first.matches[0].cached, true);
  assert.equal(first.messages[0].text, "Cached hello");

  const second = await telegram.conversation({ phone: "+380671112233" });
  assert.equal(liveAttempts, 1);
  assert.equal(second.matches[0].cached, true);
}

async function invalidTelegramSessionMarksAccountFailed() {
  const failures = [];
  const account = {
    id: "acc",
    status: "connected",
    enabled: true,
    sessionString: "session",
    label: "Main"
  };
  const telegram = service(
    {},
    {
      markFailed: async (id, error) => {
        failures.push({ id, error });
      }
    }
  );
  telegram.withClient = async () => {
    throw new Error("AUTH_KEY_UNREGISTERED");
  };

  await assert.rejects(
    () => telegram.conversationForAccount(account, "+380671112233", 20),
    /AUTH_KEY_UNREGISTERED/
  );
  assert.deepEqual(failures, [
    {
      id: "acc",
      error: "AUTH_KEY_UNREGISTERED"
    }
  ]);
}

const tests = [
  disabledConversationReturnsSafePayload,
  telegramClientIsQuietAndShortLived,
  withClientTimesOutAndDisconnects,
  withClientDestroysTelegramClient,
  selectedAccountDoesNotHideOtherAccounts,
  reenabledConnectedAccountStaysConnected,
  accountLookupRunsInBoundedParallelAndKeepsOrder,
  codeAndPasswordCanBeConfirmedInOneSubmit,
  resolvePhoneIsUsedBeforeImportContacts,
  localUkrainianPhoneNormalizesBeforeTelegramLookup,
  existingSavedContactIsUsedBeforeImportContacts,
  existingDialogIsUsedBeforeImportContacts,
  importContactsFallbackStillFindsUsers,
  temporaryImportedContactIsDeletedAfterLookup,
  resolvePhoneTimeoutDoesNotImportContact,
  resolvePhoneFloodWaitDoesNotImportContact,
  cachedContactReadsMessagesWithoutImportingAgain,
  conversationNormalizesRepliesAndMedia,
  conversationFetchesMissingReplyPreview,
  negativeCachedContactSkipsLiveLookup,
  forceRefreshBypassesNegativeCachedContact,
  sendMessageCachesTheSentMessage,
  sendMessagePassesReplyToMessageId,
  mediaDownloadReturnsPdfBytes,
  mediaOnlyMessageDoesNotUsePlaceholderText,
  conversationLabelsTelegramMessageKinds,
  conversationLabelsTelegramServiceActions,
  cachedConversationRelabelsServiceActions,
  conversationTimeoutUsesCacheAndCooldown,
  invalidTelegramSessionMarksAccountFailed
];

(async () => {
  for (const test of tests) {
    await test();
    console.log(`ok ${test.name}`);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
