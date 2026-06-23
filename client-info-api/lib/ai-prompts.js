"use strict";

const CALL_TYPES = [
  "warm_lead_followup",
  "ticket_booking",
  "bus_or_boarding_clarification",
  "border_delay",
  "route_or_schedule_clarification",
  "route_change_notice",
  "ticket_change",
  "ticket_return_or_cancel",
  "complaint",
  "payment_or_price",
  "documents_or_permits",
  "baggage",
  "parcel_inquiry",
  "lost_item",
  "no_useful_content",
  "other"
];

const CALL_TYPE_LABELS = [
  "Тепла заявка",
  "Забронювати квиток",
  "Уточнення автобуса",
  "Затримка на кордоні",
  "Уточнення рейсу",
  "Зміна або скасування рейсу",
  "Зміна квитка",
  "Повернення або скасування",
  "Скарга",
  "Оплата або ціна",
  "Документи або дозволи",
  "Багаж",
  "Посилки",
  "Загублені речі",
  "Без корисного змісту",
  "Інше"
];

const CUSTOMER_QUESTION_TYPES = [
  "bus_location",
  "border_delay",
  "boarding_place",
  "driver_contact",
  "ticket_booking",
  "ticket_price",
  "payment_problem",
  "ticket_return",
  "ticket_change",
  "route_schedule",
  "documents_or_permits",
  "baggage",
  "parcel",
  "lost_item",
  "complaint",
  "other"
];

const CUSTOMER_QUESTION_LABELS = [
  "Де автобус",
  "Затримка на кордоні",
  "Місце посадки",
  "Контакт водія",
  "Забронювати квиток",
  "Ціна квитка",
  "Проблема з оплатою",
  "Повернення квитка",
  "Зміна квитка",
  "Розклад або маршрут",
  "Документи або дозволи",
  "Багаж",
  "Посилки",
  "Загублені речі",
  "Скарга",
  "Інше"
];

const OPERATOR_EVALUATION_CRITERIA = [
  {
    key: "greeting",
    label: "Привітання",
    meaning:
      "Оператор привітався, задав доброзичливий тон і швидко показав готовність допомогти."
  },
  {
    key: "agenda_control",
    label: "Адженда",
    meaning:
      "Оператор доречно керував розмовою: коротко пояснив структуру або свідомо пропустив її, якщо звернення просте."
  },
  {
    key: "qualification",
    label: "Кваліфікація",
    meaning:
      "Оператор з'ясував тільки потрібні для цього сценарію дані: маршрут, дату, посадку, пасажирів, квиток, проблему або контактний канал."
  },
  {
    key: "solution_presentation",
    label: "Рішення",
    meaning:
      "Оператор дав зрозумілу відповідь або підібрав рейс/альтернативу з ключовими деталями: час, місце, ціна, умови, трекер чи подальший канал."
  },
  {
    key: "empathy",
    label: "Емпатія",
    meaning:
      "Оператор говорив ввічливо, спокійно, визнав емоції клієнта і не сперечався там, де потрібна підтримка."
  },
  {
    key: "conversion_or_retention",
    label: "Продаж/утримання",
    meaning:
      "Оператор доречно запропонував бронювання, оплату за посиланням, зворотний квиток, альтернативу або втримання клієнта, без зайвого тиску."
  },
  {
    key: "next_step",
    label: "Наступний крок",
    meaning:
      "Оператор дав зрозуміле рішення, пояснення або наступну дію."
  }
];

const CLIENT_CONTEXT_USAGE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["used", "matchedOrderId", "matchedTicketId", "reason"],
  properties: {
    used: {
      type: "boolean",
      description:
        "Whether the client card context was useful for interpreting this call."
    },
    matchedOrderId: {
      type: ["string", "null"],
      description:
        "Order id from clientContext when the call was matched to a specific order, otherwise null."
    },
    matchedTicketId: {
      type: ["string", "null"],
      description:
        "Ticket id from clientContext when the call was matched to a specific ticket/trip, otherwise null."
    },
    reason: {
      type: ["string", "null"],
      description:
        "One short Ukrainian sentence explaining how context helped, or why it was not used."
    }
  }
};

const SUMMARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "callType",
    "callTypeLabel",
    "callTypeConfidence",
    "clientContextUsage",
    "operatorNextStep",
    "escalation",
    "churnRisk",
    "customerQuestions",
    "speakers",
    "operatorEvaluation",
    "confidence"
  ],
  properties: {
    summary: {
      type: "string",
      description: "One concise Ukrainian sentence for an operator."
    },
    callType: {
      type: "string",
      enum: CALL_TYPES,
      description: "Main practical type of the call."
    },
    callTypeLabel: {
      type: "string",
      enum: CALL_TYPE_LABELS,
      description: "Human-readable Ukrainian label for callType."
    },
    callTypeConfidence: {
      type: "number",
      description: "Confidence in call type classification from 0 to 1."
    },
    clientContextUsage: CLIENT_CONTEXT_USAGE_SCHEMA,
    operatorNextStep: {
      type: "object",
      additionalProperties: false,
      required: ["action", "reason"],
      properties: {
        action: {
          type: "string",
          enum: [
            "none",
            "call_back",
            "send_update",
            "check_booking",
            "contact_dispatcher",
            "contact_driver",
            "create_complaint",
            "process_refund",
            "other"
          ]
        },
        reason: {
          type: ["string", "null"],
          description:
            "Short reason for the next step, or null when no action is needed."
        }
      }
    },
    escalation: {
      type: "object",
      additionalProperties: false,
      required: ["needed", "level", "department", "reason"],
      properties: {
        needed: { type: "boolean" },
        level: {
          type: "string",
          enum: ["none", "low", "medium", "high"]
        },
        department: {
          type: ["string", "null"],
          description:
            "One of dispatcher, quality, manager, accounting, technical, driver, other, or null."
        },
        reason: {
          type: ["string", "null"],
          description:
            "Short reason why escalation is or is not needed."
        }
      }
    },
    churnRisk: {
      type: "object",
      additionalProperties: false,
      required: ["level", "reason"],
      properties: {
        level: {
          type: "string",
          enum: ["low", "medium", "high", "unknown"]
        },
        reason: {
          type: ["string", "null"],
          description:
            "Short reason for the customer loss risk level."
        }
      }
    },
    customerQuestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["type", "label", "evidence"],
        properties: {
          type: {
            type: "string",
            enum: CUSTOMER_QUESTION_TYPES
          },
          label: {
            type: "string",
            enum: CUSTOMER_QUESTION_LABELS
          },
          evidence: {
            type: "string",
            description:
              "Short paraphrase of what the customer asked."
          }
        }
      }
    },
    speakers: {
      type: "array",
      description:
        "Role assignment for every distinct diarized speaker label found in segments or diarizedTranscript. Use the exact speaker label from the transcript.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["speaker", "role", "confidence"],
        properties: {
          speaker: {
            type: "string",
            description:
              "Exact diarized speaker label, for example speaker_1, speaker_2, A, or B."
          },
          role: {
            type: "string",
            enum: ["operator", "client", "unknown"],
            description:
              "operator is the DUMA/East West Eurolines employee; client is the caller/customer or partner agency asking for service."
          },
          confidence: {
            type: "number",
            description: "Confidence in this speaker role from 0 to 1."
          }
        }
      }
    },
    operatorEvaluation: {
      type: "object",
      additionalProperties: false,
      required: [
        "overallScore",
        "overallLabel",
        "summary",
        "criteria",
        "strengths",
        "improvements",
        "confidence"
      ],
      properties: {
        overallScore: {
          type: ["number", "null"],
          description:
            "Operator quality score from 0 to 100. Use null only when there is not enough operator speech to evaluate."
        },
        overallLabel: {
          type: "string",
          enum: [
            "Відмінно",
            "Добре",
            "Потребує уваги",
            "Критично",
            "Недостатньо даних"
          ]
        },
        summary: {
          type: "string",
          description:
            "Short Ukrainian explanation of the operator quality, focused on behavior in this call."
        },
        criteria: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["key", "label", "score", "explanation", "improvement"],
            properties: {
              key: {
                type: "string",
                enum: OPERATOR_EVALUATION_CRITERIA.map((item) => item.key)
              },
              label: {
                type: "string",
                enum: OPERATOR_EVALUATION_CRITERIA.map((item) => item.label)
              },
              score: {
                type: ["number", "null"],
                description:
                  "Criterion score from 0 to 100. Use null when there is not enough evidence."
              },
              explanation: {
                type: "string",
                description:
                  "One short reason for the score, based only on the call."
              },
              improvement: {
                type: ["string", "null"],
                description:
                  "One concrete thing the operator could improve, or null if this criterion was strong."
              }
            }
          }
        },
        strengths: {
          type: "array",
          items: { type: "string" },
          description: "Up to 2 short strengths of the operator in this call."
        },
        improvements: {
          type: "array",
          items: { type: "string" },
          description: "Up to 2 short realistic improvements for this call."
        },
        confidence: {
          type: "number",
          description:
            "Confidence in the operator evaluation from 0 to 1. Lower it when transcript quality is weak or roles are unclear."
        }
      }
    },
    confidence: {
      type: "number"
    }
  }
};

function cloneSchema(value) {
  return JSON.parse(JSON.stringify(value));
}

function text(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function finiteNumber(value, fallback = null) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function settingsFromProfile(profileOrSettings) {
  return profileOrSettings && profileOrSettings.settings
    ? profileOrSettings.settings
    : profileOrSettings;
}

function profileRevision(profileOrSettings) {
  return text(profileOrSettings && profileOrSettings.revision);
}

function profileSchemaVersion(profileOrSettings) {
  const settings = settingsFromProfile(profileOrSettings);
  return text(
    (profileOrSettings && profileOrSettings.schemaVersion) ||
      (settings && settings.schemaVersion)
  );
}

function sortedEnabled(items) {
  return [...(Array.isArray(items) ? items : [])]
    .filter((item) => item && item.enabled !== false)
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
}

function analysisCallTypes(profileOrSettings) {
  const settings = settingsFromProfile(profileOrSettings);
  const configured = sortedEnabled(settings && settings.callTypes)
    .map((callType, index) => ({
      key: text(callType.key) || CALL_TYPES[index] || "other",
      label: text(callType.label) || CALL_TYPE_LABELS[index] || text(callType.key),
      description: text(callType.description),
      color: text(callType.color),
      metrics: sortedEnabled(callType.metrics)
    }))
    .filter((callType) => callType.key && callType.label);

  if (configured.length) {
    return configured;
  }

  return CALL_TYPES.map((key, index) => ({
    key,
    label: CALL_TYPE_LABELS[index] || key,
    description: "",
    color: "",
    metrics: []
  }));
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function analysisMetricKeys(callTypes) {
  return uniqueValues(
    callTypes.flatMap((callType) =>
      (callType.metrics || []).map((metric) => text(metric.key))
    )
  );
}

function analysisOptionKeys(callTypes) {
  return uniqueValues(
    callTypes.flatMap((callType) =>
      (callType.metrics || []).flatMap((metric) =>
        (metric.options || []).map((option) => text(option.key))
      )
    )
  );
}

function buildCustomEvaluationSchema(profileOrSettings) {
  const callTypes = analysisCallTypes(profileOrSettings);
  const callTypeKeys = uniqueValues(callTypes.map((callType) => callType.key));
  const metricKeys = analysisMetricKeys(callTypes);
  const optionKeys = analysisOptionKeys(callTypes);

  return {
    type: "object",
    additionalProperties: false,
    required: [
      "profileVersion",
      "profileRevision",
      "matchedCallType",
      "overallScore",
      "overallColor",
      "summary",
      "metrics"
    ],
    properties: {
      profileVersion: {
        type: "string",
        description: "AI analysis settings schemaVersion used for this evaluation."
      },
      profileRevision: {
        type: "string",
        description: "AI analysis settings revision used for this evaluation."
      },
      matchedCallType: {
        type: "string",
        enum: callTypeKeys.length ? callTypeKeys : CALL_TYPES
      },
      overallScore: {
        type: ["number", "null"],
        description:
          "Normalized custom metric score from 0 to 100: sum(score * weight) / sum(maxScore * weight) * 100. Exclude null score, null/zero maxScore, and countsTowardScore=false. Use null when nothing can be scored."
      },
      overallColor: {
        type: ["string", "null"],
        description:
          "Color for overallScore. Prefer a selected option color or null when overallScore is null."
      },
      summary: {
        type: "string",
        description:
          "One short Ukrainian sentence summarizing custom metric evaluation."
      },
      metrics: {
        type: "array",
        description:
          "Evaluations for all enabled metrics from the selected call type, in configured order.",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "metricKey",
            "metricLabel",
            "selectedOptionKey",
            "selectedOptionLabel",
            "score",
            "maxScore",
            "color",
            "countsTowardScore",
            "evidence",
            "improvement",
            "confidence"
          ],
          properties: {
            metricKey: {
              type: "string",
              enum: metricKeys.length
                ? metricKeys
                : OPERATOR_EVALUATION_CRITERIA.map((item) => item.key)
            },
            metricLabel: {
              type: "string"
            },
            selectedOptionKey: {
              type: "string",
              enum: optionKeys.length
                ? optionKeys
                : ["excellent", "partial", "missed", "not_applicable"]
            },
            selectedOptionLabel: {
              type: "string"
            },
            score: {
              type: ["number", "null"],
              description:
                "Exact selected option score. Use null only when the selected option is a dash/non-scored option."
            },
            maxScore: {
              type: ["number", "null"],
              description:
                "Maximum numeric score available for this metric among scoring options. For options 0 and 2, maxScore must be 2."
            },
            color: {
              type: "string",
              description: "Exact option color from settings, usually a #RRGGBB value."
            },
            countsTowardScore: {
              type: "boolean",
              description: "Exact option countsTowardScore value from settings."
            },
            evidence: {
              type: ["string", "null"],
              description:
                "Short evidence from the call, paraphrased in Ukrainian, or null when not applicable."
            },
            improvement: {
              type: ["string", "null"],
              description:
                "One concrete improvement for this metric, or null when strong/not applicable."
            },
            confidence: {
              type: "number",
              description: "Confidence in this metric evaluation from 0 to 1."
            }
          }
        }
      }
    }
  };
}

function buildSummarySchema(profileOrSettings) {
  const callTypes = analysisCallTypes(profileOrSettings);
  const schema = cloneSchema(SUMMARY_SCHEMA);

  if (callTypes.length) {
    schema.properties.callType.enum = uniqueValues(callTypes.map((callType) => callType.key));
    schema.properties.callTypeLabel.enum = uniqueValues(callTypes.map((callType) => callType.label));
  }

  schema.required = uniqueValues([...schema.required, "customEvaluation"]);
  schema.properties.customEvaluation = buildCustomEvaluationSchema(profileOrSettings);
  return schema;
}

const DOMAIN_TERMS = [
  "DUMA",
  "East West Eurolines",
  "Іст Вест Євролайнс",
  "EWE",
  "Львів",
  "Варшава",
  "Краків",
  "Прага",
  "Вроцлав",
  "Познань",
  "Гданськ",
  "Берлін",
  "Бремен",
  "Київ",
  "Тернопіль",
  "Івано-Франківськ",
  "Чернівці",
  "Рівне",
  "Луцьк",
  "автовокзал",
  "АС",
  "рейс",
  "квиток",
  "бронювання",
  "викуп",
  "повернення",
  "скасування",
  "перенесення",
  "місце",
  "багаж",
  "водій",
  "перевізник",
  "посадка",
  "зупинка"
];

const TRANSCRIPTION_DOMAIN_PROMPT = `
Це запис телефонної розмови автобусної компанії DUMA / East West Eurolines.
East West Eurolines - це назва компанії/бренду, не ім'я пасажира і не маршрут.
Розмова переважно українською, іноді російською або англійською.
Важливі слова і власні назви, які треба розпізнавати особливо уважно:
${DOMAIN_TERMS.join(", ")}.
Типові теми: рейси, бронювання, квитки, дати поїздки, час відправлення, місця,
маршрути між містами, повернення, скасування, багаж, посадка, зупинки.
`.trim();

const CLIENT_CONTEXT_PROMPT = `
Контекст картки клієнта:
- У user input може бути clientContext: короткі дані з картки клієнта за номером телефону.
- clientContext може містити contact, relatedPassengers, stats, activeTripCandidates, upcomingTrip, recentTickets і notes.
- Використовуй clientContext лише як допоміжний CRM-контекст для розуміння дзвінка, а не як заміну транскрипту.
- Якщо клієнт питає "де автобус", "затримка", "посадка", "водій", "рейс", "квиток", спробуй зіставити це з activeTripCandidates, upcomingTrip або recentTickets.
- Якщо зіставлення очевидне, можеш вказати в summary маршрут/дату/квиток з clientContext, навіть якщо клієнт не назвав усе голосом.
- Якщо transcript і clientContext суперечать одне одному, довіряй transcript, а clientContext використовуй тільки як підказку.
- Якщо збіг неочевидний, не вигадуй прив'язку до квитка: clientContextUsage.used має бути false.
- Не штрафуй оператора за те, що він не запитав ПІБ, номер бронювання, рейс або локацію затримки, якщо це вже зрозуміло з clientContext або оператор міг бачити це в CRM.
- У clientContextUsage вкажи, чи контекст реально допоміг, matchedOrderId/matchedTicketId або null, і одну коротку причину українською.
`.trim();

const SALES_SCRIPT_PROMPT = `
Операторський стандарт DUMA / East West Eurolines:
- Спочатку внутрішньо визнач сценарій дзвінка: тепла заявка/бронювання, інформаційне звернення, питання по заброньованому квитку, зміна або скасування рейсу, скарга, документи/дозволи, багаж/посилки чи інше.
- Оцінюй доречність дій у конкретному сценарії, а не механічне проходження всіх пунктів. Якщо клієнт уже дав дані або вони очевидні з clientContext, не вимагай повторних питань.
- Не штрафуй оператора за те, що він не контролює: кордон, черги, погоду, водія, технічну несправність, правила повернення, дії ДПСУ/митниці або політику перевізника.
- Штрафуй за відсутність людського пояснення, наступного кроку, дедлайну або каналу оновлення, якщо це було потрібно саме в цьому дзвінку.

Сценарій теплої заявки або бронювання:
- Норма: актуалізувати причину дзвінка, задати адженду, з'ясувати маршрут, дату, місце посадки, аеропорт/час рейсу за потреби, кількість пасажирів, ПІБ, телефон, дітей/60+, тварин, страхування для біометрії, валюту оплати при посадці, зворотний квиток і месенджер.
- Якщо маршрут ще не вибраний, оператор має підібрати 1-2 релевантні варіанти і назвати дату, час відправлення/прибуття, пересадки, ціну, тривалість та важливі умови посадки.
- Добре, коли оператор м'яко веде до бронювання/оплати: пропонує зафіксувати місце, оплату за посиланням, просить скрін оплати, пояснює оплату при посадці без тиску, пропонує зворотний квиток зі знижкою 20% тільки якщо доречно.
- Додаткова інформація доречна лише якщо вона не заважає основній задачі: додаток, бонуси, акції, трекер, вільна посадка, прийти за 20-30 хв, можливі відхилення часу прибуття.

Інформаційне звернення:
- Адженду можна пропустити, якщо питання просте. Оператор ставить стільки уточнень, скільки потрібно для точної відповіді, і не затягує розмову.
- Якщо пошук відповіді триває понад 45 секунд, добре попередити клієнта, запропонувати очікування або передзвон.
- Для запиту про рейси оператор має уточнити звідки/куди/дату, запропонувати найближчу точку відправлення, якщо прямої немає, і м'яко запропонувати бронювання.

Питання по наявному квитку:
- Якщо квиток/рейс не ідентифіковано з номера або clientContext, доречно уточнити телефон бронювання, номер квитка, маршрут або дату.
- При поверненні/скасуванні оператор спочатку з'ясовує причину, намагається втримати через альтернативу або перенесення, але діє в межах правил повернення.

Зміна, запізнення або скасування рейсу:
- Оператор має бути партнером у вирішенні, а не "джерелом проблеми": визнати незручність, пояснити факт, одразу дати найкращий доступний варіант, нову дату/час/автобус/трекер і канал, куди все буде надіслано.
- При скасуванні з вини перевізника клієнт має право на повне повернення, але спочатку доречно запропонувати альтернативний рейс, якщо він є.
- Якщо клієнт не приймає правила або є скарга, потрібна фіксація звернення й передача керівнику/якості.

Скарга:
- Норма: дати клієнту пояснити, активно слухати, визнати емоцію без автоматичного юридичного визнання провини, за потреби уточнити ПІБ/телефон/квиток/маршрут/час/місце події.
- Якщо швидкої відповіді немає, оператор має взяти паузу з конкретним дедлайном і пообіцяти повернутись навіть без фінального рішення.
- Для грубості водія, проблем із сидіннями, інтернетом, туалетом, затримкою чи зняттям з рейсу оцінюй: чи оператор пояснив, що вже зроблено, що під контролем компанії, що не під контролем, і який наступний крок.
- Якщо клієнт ображає оператора, допустимо спокійно встановити межі й припинити розмову після попередження.

Документи, дозволи, багаж, посилки:
- Для документів, перетину кордону, тварин, дітей, дозволених товарів і митних правил оператор не має давати юридичних гарантій; правильний напрямок - ДПСУ/офіційне джерело плюс обережне пояснення.
- По посилках стандарт: компанія займається пасажирськими перевезеннями, не регулярною доставкою посилок; якщо клієнт уже взаємодіяв із водієм, можна дати лише доступну інформацію по рейсу.

Закриття:
- Добре закриття: перевірити, чи лишились питання, підтвердити домовленість, канал зв'язку/месенджер, наступну дію і доброзичливо завершити.
- У кожній оцінці відповідай на головне питання: що оператор реально міг зробити краще саме в цьому дзвінку?
`.trim();

const COMPACT_EVALUATION_GUARDRAILS_PROMPT = `
Контекст і guardrails для оцінки:
- У user input може бути clientContext: короткий CRM-контекст. Використовуй його лише як допоміжну підказку; якщо transcript і clientContext суперечать одне одному, довіряй transcript.
- Якщо факт уже очевидний з clientContext або клієнт сам його назвав, не штрафуй оператора за повторне неуточнення цього факту.
- Не штрафуй оператора за те, що він не контролює: кордон, черги, погоду, водія, технічну несправність, правила повернення, дії прикордонників/митниці або політику перевізника.
- Для вибору варіанту користуйся тільки інструкціями конкретної metric і її option нижче. Загальні guardrails не замінюють Soldly-інструкції.
- Для документів, дітей, тварин, багажу, митниці та кордону не вигадуй юридичних гарантій; добре, коли оператор говорить обережно або скеровує до офіційного джерела.
- Якщо запис дуже короткий, ролі спікерів неясні або ASR слабкий, знижуй confidence і став null там, де фактично немає доказів.
`.trim();

const CALL_SUMMARY_SYSTEM_PROMPT = `
${CLIENT_CONTEXT_PROMPT}

${SALES_SCRIPT_PROMPT}

Ти аналізуєш транскрипт телефонної розмови автобусної компанії DUMA / East West Eurolines.

Мета: дати оператору тільки найважливіше по дзвінку: короткий підсумок, тип звернення, головне питання клієнта, дію після дзвінка, потребу в ескалації, ризик втрати клієнта і коротку оцінку оператора.

Загальні правила:
- Відповідай українською незалежно від мови розмови.
- East West Eurolines / Іст Вест Євролайнс - це назва компанії або перевізника. Не трактуй це як маршрут, пасажира чи окремий запит клієнта.
- Не вигадуй фактів. Якщо наступна дія або причина не визначена, став null або action = none.
- Якщо у user input є clientContext, використовуй його як допоміжний контекст картки клієнта: найближча поїздка, останні квитки, пасажири, нотатки. Не вигадуй деталей поза transcript/clientContext.
- Якщо оператор знає факт, який є в clientContext, не штрафуй його за те, що він не уточнив цей факт у клієнта.
- Транскрипт може містити ASR-помилки. Можна обережно нормалізувати очевидні назви міст, компанії та автобусні терміни зі словника, але тільки якщо це випливає з контексту.
- Не включай довгий переказ. Усі текстові поля тримай короткими: 1 речення або null.

Ролі спікерів:
- У speakers поверни кожен distinct speaker label із segments або diarizedTranscript. speaker має бути точним label із транскрипту, наприклад speaker_1, speaker_2, A або B; не замінюй його на "operator" чи "client".
- role: operator для працівника DUMA / East West Eurolines, client для клієнта/пасажира/партнерської каси чи агенції, яка звертається по сервіс; unknown тільки якщо роль справді неможливо встановити.
- Оператор часто вітається від імені компанії, каже "чим можу допомогти", "слухаю вас", бачить бронювання/квитки/CRM, дає відповіді й наступні дії.
- Клієнт або партнерська агенція зазвичай ставить питання, описує свою потребу, просить уточнити рейс/квиток/багаж/повернення або надає дані пасажира.
- Якщо рівно два speaker labels і один очевидно operator, другий зазвичай client. Якщо один очевидно client, другий зазвичай operator.

Підсумок дзвінка:
- Поле summary має бути одним коротким реченням до 180 символів.
- Гарний summary виглядає так: "Клієнт питав за рейс Львів - Варшава на 26.05; оператор уточнив наявність місць і порадив перевірити бронювання."
- Якщо в розмові немає корисної інформації для картки, summary має прямо сказати: "У дзвінку не було нових деталей для картки клієнта."

Класифікація типу дзвінка:
- Поле callType класифікує головну практичну причину дзвінка. Обери рівно один тип:
  - warm_lead_followup / "Тепла заявка": оператор або клієнт продовжує незавершене бронювання, заявку з сайту чи спробу купити квиток.
  - ticket_booking / "Забронювати квиток": клієнт хоче купити, забронювати або підібрати квиток.
  - bus_or_boarding_clarification / "Уточнення автобуса": автобус, водій, посадка, платформа, зупинка, контакт водія, де чекати.
  - border_delay / "Затримка на кордоні": клієнт питає про затримку автобуса на кордоні, час очікування, причину затримки або оновлення по проходженню кордону.
  - route_or_schedule_clarification / "Уточнення рейсу": наявність рейсу, розклад, час, маршрут, дата поїздки без явного бронювання.
  - route_change_notice / "Зміна або скасування рейсу": оператор повідомляє або клієнт уточнює зміну часу/дати/автобуса, об'єднання, запізнення чи скасування рейсу перевізником.
  - ticket_change / "Зміна квитка": перенесення, зміна дати, маршруту, пасажира або місця.
  - ticket_return_or_cancel / "Повернення або скасування": повернення коштів, скасування, ануляція.
  - complaint / "Скарга": клієнт скаржиться на сервіс, водія, запізнення, якість, проблему в поїздці або грубе обслуговування.
  - payment_or_price / "Оплата або ціна": ціна, оплата, доплата, не пройшла оплата, чек.
  - documents_or_permits / "Документи або дозволи": документи, правила перетину кордону, діти, тварини, дозволені товари, митні або прикордонні правила.
  - baggage / "Багаж": багаж, додатковий багаж, тварини або правила перевезення речей.
  - parcel_inquiry / "Посилки": клієнт питає про передачу/отримання посилки або контакт водія щодо посилки.
  - lost_item / "Загублені речі": клієнт шукає речі, залишені в автобусі.
  - no_useful_content / "Без корисного змісту": короткий, помилковий, мовчазний дзвінок або немає суті для картки.
  - other / "Інше": корисний зміст є, але він не входить у типи вище.
- Якщо є кілька тем, вибирай за головним наміром клієнта або за тим, що потребує дії оператора.
- callTypeLabel має точно відповідати вибраному callType.
- callTypeConfidence став 0.2-0.5, якщо транскрипція слабка або тип неочевидний.

Операційні поля:
- operatorNextStep.action:
  - none: після дзвінка нічого робити не потрібно.
  - call_back: треба передзвонити клієнту.
  - send_update: треба надіслати або озвучити оновлення.
  - check_booking: треба перевірити бронювання/замовлення/квиток.
  - contact_dispatcher: треба зв'язатися з диспетчером.
  - contact_driver: треба зв'язатися з водієм.
  - create_complaint: треба оформити або передати скаргу.
  - process_refund: треба запустити/перевірити повернення.
  - other: інша конкретна дія.
- operatorNextStep.reason - одна коротка причина, або null для action = none.
- escalation.needed = true тільки якщо питання треба передати іншій ролі або керівнику. Не ескалюй звичайні короткі уточнення, які оператор вирішив у дзвінку.
- escalation.level: none, low, medium або high. high лише для гострих скарг, ризику втрати клієнта, небезпечної ситуації, грошей або повторної невирішеної проблеми.
- escalation.department: dispatcher, quality, manager, accounting, technical, driver, other або null.
- churnRisk.level: low, medium, high або unknown. Став high, якщо клієнт явно злий, погрожує скаргою/відмовою, повторно дзвонить щодо невирішеної проблеми або просить повернення через сервісну проблему.
- customerQuestions - тільки 1 головне питання клієнта. Якщо питань не було, поверни порожній масив. Обирай type/label із цього списку:
${CUSTOMER_QUESTION_TYPES.map((type, index) => `  - ${type} / "${CUSTOMER_QUESTION_LABELS[index]}"`).join("\n")}

Оцінка якості оператора:
- Оцінюй тільки поведінку оператора в цьому дзвінку.
- Перед оцінкою подумки зістав сценарій дзвінка з операторським стандартом вище: для продажу важливі кваліфікація, підбір і закриття; для інформаційного звернення - точність і стислість; для зміни рейсу чи скарги - емпатія, пояснення, варіант рішення і наступний крок.
- Не штрафуй за кордон, водія, фактичну затримку, правила повернення, технічні збої або політику компанії.
- Не вимагай зайвих уточнень, якщо клієнт уже пояснив проблему або оператор міг мати контекст із CRM/Binotel/диспетчера/водія.
- overallScore 0-100 або null, якщо бракує даних. summary - 1 коротке речення: що було добре або що реально варто покращити.
- overallLabel: 85-100 "Відмінно", 70-84 "Добре", 50-69 "Потребує уваги", 0-49 "Критично", null "Недостатньо даних".
- Поверни criteria для всіх критеріїв нижче. Якщо критерій неактуальний для сценарію або бракує доказів, став score = null і коротко поясни чому.
${OPERATOR_EVALUATION_CRITERIA.map((item) => `  - ${item.key} / "${item.label}": ${item.meaning}`).join("\n")}
- score кожного критерію: 100 добре, 80 добре з дрібним недоліком, 60 частково, 40 слабко, 20 майже не виконано, 0 груба помилка. Якщо бракує даних - null.
- explanation - 1 коротке речення без довгих цитат.
- improvement - 1 конкретна порада або null, якщо критерій сильний.
- strengths - до 2 коротких сильних сторін.
- improvements - до 2 коротких реальних покращень. Не вимагай ідеального рішення, якщо воно поза контролем оператора.
- confidence в operatorEvaluation зменшуй, якщо транскрипція погана, ролі спікерів неясні, дзвінок дуже короткий або багато шуму.

Додаткові джерела:
- Ти можеш отримати diarizedTranscript із speaker labels і promptedTranscript без speaker labels. Використовуй diarizedTranscript для розрізнення співрозмовників, а promptedTranscript як додаткове джерело для точнішого змісту.
- Якщо є originalPromptedTranscript, це транскрипт сирого запису без FFmpeg-очищення. Використовуй його як ще одне джерело для слів, які могли зникнути після шумоприглушення.
`.trim();

function compactInstruction(value) {
  return text(value).replace(/\s+/g, " ");
}

function promptInstruction(primary, fallback = "") {
  return compactInstruction(primary || fallback);
}

function metricInstructionForPrompt(metric) {
  return promptInstruction(
    metric && metric.aiBrief,
    (metric && metric.aiInstructions) ||
      (metric && metric.description) ||
      (metric && metric.label)
  );
}

function optionInstructionForPrompt(optionItem) {
  return promptInstruction(
    optionItem && optionItem.aiBrief,
    (optionItem && optionItem.aiInstructions) ||
      (optionItem && optionItem.label)
  );
}

function callTypeDescriptionForPrompt(callType) {
  return promptInstruction(
    callType && callType.aiBrief,
    (callType && callType.description) ||
      (callType && callType.label)
  );
}

function optionScoreForPrompt(optionItem) {
  return optionItem.countsTowardScore === false ||
    optionItem.score === null ||
    optionItem.score === undefined
    ? "—"
    : String(optionItem.score);
}

function metricMaxScore(metric) {
  const scores = ((metric && metric.options) || [])
    .filter((optionItem) => optionItem.countsTowardScore !== false)
    .map((optionItem) => Number(optionItem.score))
    .filter((score) => Number.isFinite(score));

  return scores.length ? Math.max(...scores) : null;
}

function metricPromptSignature(metric) {
  return JSON.stringify({
    label: text(metric && metric.label),
    group: text(metric && metric.group),
    weight: Number(metric && metric.weight || 0),
    description: compactInstruction(metric && metric.description),
    aiInstructions: metricInstructionForPrompt(metric),
    options: [...((metric && metric.options) || [])]
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((optionItem) => ({
        key: text(optionItem.key),
        label: text(optionItem.label),
        score: optionScoreForPrompt(optionItem),
        color: text(optionItem.color),
        countsTowardScore: optionItem.countsTowardScore !== false,
        aiInstructions: optionInstructionForPrompt(optionItem)
      }))
  });
}

function buildMetricPromptScope(callTypes) {
  const signaturesByKey = new Map();
  const entries = [];

  for (const callType of callTypes) {
    for (const metric of sortedEnabled(callType.metrics)) {
      const key = text(metric.key);
      if (!key) {
        continue;
      }

      const signature = metricPromptSignature(metric);
      entries.push({
        callTypeKey: callType.key,
        key,
        metric,
        signature
      });

      if (!signaturesByKey.has(key)) {
        signaturesByKey.set(key, new Set());
      }
      signaturesByKey.get(key).add(signature);
    }
  }

  const refsByCallTypeKey = new Map();
  const definitions = new Map();

  for (const entry of entries) {
    const hasMultipleDefinitions = (signaturesByKey.get(entry.key) || new Set()).size > 1;
    const ref = hasMultipleDefinitions
      ? `${entry.callTypeKey}.${entry.key}`
      : entry.key;

    if (!refsByCallTypeKey.has(entry.callTypeKey)) {
      refsByCallTypeKey.set(entry.callTypeKey, []);
    }
    refsByCallTypeKey.get(entry.callTypeKey).push(ref);

    if (!definitions.has(ref)) {
      definitions.set(ref, {
        ref,
        metric: entry.metric
      });
    }
  }

  return {
    definitions: [...definitions.values()],
    refsByCallTypeKey
  };
}

function formatMetricForPrompt(ref, metric) {
  const maxScore = metricMaxScore(metric);
  const options = [...(metric.options || [])]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((optionItem) => {
      const scoreLabel = optionScoreForPrompt(optionItem);
      const countLabel = optionItem.countsTowardScore === false || scoreLabel === "—"
        ? ", не враховувати в середньому"
        : "";
      return `${optionItem.key}: label="${optionItem.label}", score=${scoreLabel}, color=${optionItem.color}${countLabel}, опис оцінки: ${optionInstructionForPrompt(optionItem)}`;
    })
    .join(" | ");

  return [
    `- metricRef="${ref}" metricKey="${metric.key}" label="${metric.label}"`,
    metric.group ? `група: ${metric.group}` : "",
    metric.weight ? `вага: ${metric.weight}` : "",
    `maxScore=${maxScore === null ? "—" : maxScore}`,
    `опис метрики: ${metricInstructionForPrompt(metric)}`,
    `описи оцінок: ${options}`
  ].filter(Boolean).join("; ");
}

function findAnalysisCallType(profileOrSettings, callTypeKey) {
  const callTypes = analysisCallTypes(profileOrSettings);
  const key = text(callTypeKey);
  const normalized = key.toLowerCase();
  return (
    callTypes.find((callType) => callType.key === key) ||
    callTypes.find((callType) => text(callType.label).toLowerCase() === normalized) ||
    callTypes.find((callType) => callType.key === "other") ||
    callTypes[0] ||
    {
      key: "other",
      label: "Інше",
      description: "",
      color: "",
      metrics: []
    }
  );
}

function formatCallTypeBriefForPrompt(callType) {
  const description = callTypeDescriptionForPrompt(callType) ||
    "Корисний дзвінок цього типу.";
  return `- ${callType.key} / "${callType.label}": ${description}`;
}

function buildCallTypeClassificationSchema(profileOrSettings) {
  const callTypes = analysisCallTypes(profileOrSettings);
  const callTypeKeys = uniqueValues(callTypes.map((callType) => callType.key));

  return {
    type: "object",
    additionalProperties: false,
    required: ["callType", "confidence", "reason"],
    properties: {
      callType: {
        type: "string",
        enum: callTypeKeys.length ? callTypeKeys : CALL_TYPES
      },
      confidence: {
        type: "number",
        description: "Confidence in classification from 0 to 1."
      },
      reason: {
        type: "string",
        description:
          "One short Ukrainian sentence explaining the main intent of the call."
      }
    }
  };
}

function buildCallTypeClassificationSystemPrompt(profileOrSettings) {
  const callTypes = analysisCallTypes(profileOrSettings);

  return `
Ти класифікуєш телефонний дзвінок автобусної компанії DUMA / East West Eurolines.

Завдання: обрати рівно один callType з доступного списку. На цьому етапі НЕ оцінюй метрики, НЕ рахуй бали і НЕ роби детальний аналіз якості.

Правила:
- Відповідай українською.
- Обирай тип за головним практичним наміром клієнта або дією, яку має зробити оператор.
- Якщо тем кілька, вибирай ту, яка була основною або потребує найбільшої дії.
- Якщо транскрипція слабка або тип неочевидний, confidence має бути 0.2-0.5.
- East West Eurolines / EWE / DUMA - це компанія, не маршрут і не ім'я клієнта.

Доступні типи дзвінків:
${callTypes.map(formatCallTypeBriefForPrompt).join("\n")}
`.trim();
}

function formatMetricForEvaluationPrompt(metric) {
  const options = [...(metric.options || [])]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((optionItem) =>
      `    - optionKey="${optionItem.key}" label="${optionItem.label}": ${optionInstructionForPrompt(optionItem)}`
    )
    .join("\n");

  return [
    `- metricKey="${metric.key}" label="${metric.label}"`,
    metric.group ? `  group="${metric.group}"` : "",
    `  що оцінювати: ${metricInstructionForPrompt(metric)}`,
    "  варіанти, з яких AI має обрати рівно один:",
    options
  ].filter(Boolean).join("\n");
}

function buildLeanCustomEvaluationSchema(profileOrSettings, callTypeKey) {
  const callType = findAnalysisCallType(profileOrSettings, callTypeKey);
  const metrics = sortedEnabled(callType.metrics);
  const metricKeys = uniqueValues(metrics.map((metric) => text(metric.key)));
  const optionKeys = uniqueValues(
    metrics.flatMap((metric) =>
      (metric.options || []).map((optionItem) => text(optionItem.key))
    )
  );

  return {
    type: "object",
    additionalProperties: false,
    required: ["summary", "metrics"],
    properties: {
      summary: {
        type: "string",
        description:
          "One short Ukrainian sentence about what the custom metrics show."
      },
      metrics: {
        type: "array",
        description:
          "One selected option for every enabled metric of the selected call type, in configured order.",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "metricKey",
            "selectedOptionKey",
            "evidence",
            "improvement",
            "confidence"
          ],
          properties: {
            metricKey: {
              type: "string",
              enum: metricKeys.length
                ? metricKeys
                : OPERATOR_EVALUATION_CRITERIA.map((item) => item.key)
            },
            selectedOptionKey: {
              type: "string",
              enum: optionKeys.length
                ? optionKeys
                : ["excellent", "partial", "missed", "not_applicable"]
            },
            evidence: {
              type: ["string", "null"],
              description:
                "Short paraphrased evidence from the call, or null when not applicable."
            },
            improvement: {
              type: ["string", "null"],
              description:
                "One concrete improvement for this metric, or null when strong/not applicable."
            },
            confidence: {
              type: "number",
              description: "Confidence in this metric option from 0 to 1."
            }
          }
        }
      }
    }
  };
}

function buildCallEvaluationSchema(profileOrSettings, callTypeKey) {
  const callType = findAnalysisCallType(profileOrSettings, callTypeKey);
  const schema = cloneSchema(SUMMARY_SCHEMA);

  schema.required = uniqueValues(
    schema.required
      .filter((key) => ![
        "operatorEvaluation",
        "callType",
        "callTypeLabel",
        "callTypeConfidence"
      ].includes(key))
      .concat("customEvaluation")
  );
  delete schema.properties.operatorEvaluation;
  delete schema.properties.callType;
  delete schema.properties.callTypeLabel;
  delete schema.properties.callTypeConfidence;
  schema.properties.customEvaluation = buildLeanCustomEvaluationSchema(
    profileOrSettings,
    callType.key
  );

  return schema;
}

function buildCallEvaluationSystemPrompt(profileOrSettings, callTypeKey) {
  const callType = findAnalysisCallType(profileOrSettings, callTypeKey);
  const metrics = sortedEnabled(callType.metrics);

  return `
${COMPACT_EVALUATION_GUARDRAILS_PROMPT}

Ти аналізуєш транскрипт телефонної розмови автобусної компанії DUMA / East West Eurolines.

Тип дзвінка вже класифіковано на попередньому етапі:
- callType="${callType.key}"
- callTypeLabel="${callType.label}"
- опис: ${compactInstruction(callType.description) || "без додаткового опису"}

Завдання цього етапу:
- Дати короткий підсумок дзвінка.
- Заповнити операційні поля: головне питання клієнта, наступна дія, ескалація, ризик втрати.
- Визначити ролі спікерів.
- Оцінити тільки enabled metrics для цього callType.

Важливо про токени й локальну логіку:
- Повертай тільки поля, описані в JSON schema. Усі технічні атрибути варіантів бекенд знайде й порахує локально за selectedOptionKey.
- У customEvaluation.metrics для кожної метрики поверни тільки metricKey, selectedOptionKey, evidence, improvement, confidence.
- Для кожної metric обери рівно один optionKey з її списку.
- Якщо критерій неактуальний для конкретного дзвінка, обери optionKey, який у налаштуваннях описує неактуальність/прочерк, якщо такий є.
- Для вибору optionKey використовуй саме описи варіантів нижче, а не власну шкалу.
- Не повертай технічні атрибути варіантів, профілю або типу дзвінка: це бекенд додасть локально.

Кастомні метрики для цього типу:
${metrics.length
    ? metrics.map(formatMetricForEvaluationPrompt).join("\n\n")
    : "- Немає налаштованих метрик; поверни порожній масив metrics."}

Загальні правила:
- Відповідай українською незалежно від мови розмови.
- Не вигадуй фактів. Якщо наступна дія або причина не визначена, став null або action = none.
- Якщо у user input є clientContext, використовуй його лише як допоміжний CRM-контекст, а не як заміну транскрипту.
- Транскрипт може містити ASR-помилки. Нормалізуй очевидні назви міст і компанії тільки коли це випливає з контексту.
- Усі текстові поля тримай короткими: 1 речення або null.

Ролі спікерів:
- У speakers поверни кожен distinct speaker label із transcript. speaker має бути точним label із транскрипту, наприклад speaker_1, speaker_2, A або B.
- role: operator для працівника DUMA / East West Eurolines; client для клієнта/пасажира/партнерської каси; unknown тільки якщо роль справді неможливо встановити.
- Оператор часто вітається від імені компанії, каже "чим можу допомогти", бачить бронювання/CRM, дає відповіді й наступні дії.
- Якщо рівно два speaker labels і один очевидно operator, другий зазвичай client.

Підсумок дзвінка:
- summary має бути одним коротким реченням до 180 символів.
- Якщо в розмові немає корисної інформації для картки, summary має прямо сказати це.
- Тип дзвінка вже визначено, не дублюй його у відповіді.

Операційні поля:
- operatorNextStep.action:
  - none: після дзвінка нічого робити не потрібно.
  - call_back: треба передзвонити клієнту.
  - send_update: треба надіслати або озвучити оновлення.
  - check_booking: треба перевірити бронювання/замовлення/квиток.
  - contact_dispatcher: треба зв'язатися з диспетчером.
  - contact_driver: треба зв'язатися з водієм.
  - create_complaint: треба оформити або передати скаргу.
  - process_refund: треба запустити/перевірити повернення.
  - other: інша конкретна дія.
- escalation.needed = true тільки якщо питання треба передати іншій ролі або керівнику.
- escalation.department: dispatcher, quality, manager, accounting, technical, driver, other або null.
- churnRisk.level: low, medium, high або unknown.
- customerQuestions - тільки 1 головне питання клієнта. Якщо питань не було, поверни порожній масив. Обирай type/label із цього списку:
${CUSTOMER_QUESTION_TYPES.map((type, index) => `  - ${type} / "${CUSTOMER_QUESTION_LABELS[index]}"`).join("\n")}

Додаткові джерела:
- Основним джерелом є diarizedTranscript.
- promptedTranscript або originalPromptedTranscript використовуй лише як допоміжний текст для слів, які могли бути розпізнані краще без speaker labels.
`.trim();
}

function optionCountsTowardScore(optionItem) {
  return Boolean(
    optionItem &&
      optionItem.countsTowardScore !== false &&
      optionItem.score !== null &&
      optionItem.score !== undefined &&
      Number.isFinite(Number(optionItem.score))
  );
}

function optionNumericScore(optionItem) {
  return optionCountsTowardScore(optionItem)
    ? Number(optionItem.score)
    : null;
}

function roundMetricScore(value) {
  return Number.isFinite(Number(value))
    ? Math.round(Number(value) * 10) / 10
    : null;
}

function findMetricRawEvaluation(rawMetrics, metricKey) {
  return (Array.isArray(rawMetrics) ? rawMetrics : []).find(
    (item) => text(item && item.metricKey) === metricKey
  ) || null;
}

function fallbackMissingOption(metric) {
  const options = [...((metric && metric.options) || [])]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  return (
    options.find((optionItem) => optionItem.countsTowardScore === false) ||
    {
      key: "not_evaluated",
      label: "Не оцінено",
      score: null,
      color: "#94a3b8",
      countsTowardScore: false
    }
  );
}

function findSelectedOption(metric, optionKey, hasRawMetric = true) {
  if (!hasRawMetric) {
    return fallbackMissingOption(metric);
  }

  const options = [...((metric && metric.options) || [])]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  const key = text(optionKey);
  return (
    options.find((optionItem) => text(optionItem.key) === key) ||
    fallbackMissingOption(metric)
  );
}

function overallColorFromScore(score) {
  if (!Number.isFinite(Number(score))) {
    return null;
  }

  const value = Number(score);
  if (value >= 85) {
    return "#22c55e";
  }
  if (value >= 60) {
    return "#facc15";
  }
  if (value >= 40) {
    return "#fb923c";
  }
  return "#ef4444";
}

function overallLabelFromScore(score) {
  if (!Number.isFinite(Number(score))) {
    return "Недостатньо даних";
  }

  const value = Number(score);
  if (value >= 85) {
    return "Відмінно";
  }
  if (value >= 70) {
    return "Добре";
  }
  if (value >= 50) {
    return "Потребує уваги";
  }
  return "Критично";
}

function metricPercent(metricEvaluation) {
  const score = finiteNumber(metricEvaluation && metricEvaluation.score);
  const maxScore = finiteNumber(metricEvaluation && metricEvaluation.maxScore);
  if (score === null || maxScore === null || maxScore <= 0) {
    return null;
  }

  return roundMetricScore((score / maxScore) * 100);
}

function averageMetricConfidence(metrics, fallback = 0.7) {
  const values = (Array.isArray(metrics) ? metrics : [])
    .map((metric) => finiteNumber(metric && metric.confidence))
    .filter((value) => value !== null);
  if (!values.length) {
    return fallback;
  }
  return roundMetricScore(
    values.reduce((total, value) => total + value, 0) / values.length
  );
}

function enrichCustomEvaluation(rawCustomEvaluation, profileOrSettings, callTypeKey) {
  const callType = findAnalysisCallType(profileOrSettings, callTypeKey);
  const rawMetrics = rawCustomEvaluation && rawCustomEvaluation.metrics;
  const metrics = sortedEnabled(callType.metrics).map((metric) => {
    const rawMetric = findMetricRawEvaluation(rawMetrics, metric.key);
    const selectedOption = findSelectedOption(
      metric,
      rawMetric && rawMetric.selectedOptionKey,
      Boolean(rawMetric)
    );
    const score = optionNumericScore(selectedOption);
    const maxScore = metricMaxScore(metric);
    const countsTowardScore = optionCountsTowardScore(selectedOption);

    return {
      metricKey: metric.key,
      metricLabel: metric.label,
      metricGroup: metric.group || "",
      selectedOptionKey: selectedOption.key,
      selectedOptionLabel: selectedOption.label,
      score,
      maxScore,
      color: text(selectedOption.color) || "#94a3b8",
      countsTowardScore,
      evidence: rawMetric && rawMetric.evidence !== undefined
        ? rawMetric.evidence
        : null,
      improvement: rawMetric && rawMetric.improvement !== undefined
        ? rawMetric.improvement
        : null,
      confidence: finiteNumber(rawMetric && rawMetric.confidence, 0.65)
    };
  });

  let numerator = 0;
  let denominator = 0;
  const weightsByMetricKey = new Map(
    sortedEnabled(callType.metrics).map((metric) => [
      metric.key,
      Math.max(0, finiteNumber(metric.weight, 1))
    ])
  );

  for (const metric of metrics) {
    const weight = weightsByMetricKey.get(metric.metricKey) ?? 1;
    if (
      metric.countsTowardScore &&
      metric.score !== null &&
      Number.isFinite(Number(metric.score)) &&
      metric.maxScore !== null &&
      Number(metric.maxScore) > 0 &&
      weight > 0
    ) {
      numerator += Number(metric.score) * weight;
      denominator += Number(metric.maxScore) * weight;
    }
  }

  const overallScore = denominator > 0
    ? roundMetricScore((numerator / denominator) * 100)
    : null;

  return {
    profileVersion:
      text(rawCustomEvaluation && rawCustomEvaluation.profileVersion) ||
      profileSchemaVersion(profileOrSettings) ||
      "unknown",
    profileRevision:
      text(rawCustomEvaluation && rawCustomEvaluation.profileRevision) ||
      profileRevision(profileOrSettings) ||
      "unknown",
    matchedCallType: callType.key,
    overallScore,
    overallColor: overallColorFromScore(overallScore),
    summary:
      text(rawCustomEvaluation && rawCustomEvaluation.summary) ||
      (overallScore === null
        ? "Метрики не увійшли в загальну оцінку."
        : `Оцінка за метриками: ${Math.round(overallScore)}%.`),
    metrics
  };
}

function buildOperatorEvaluationFromCustom(customEvaluation) {
  const metrics = Array.isArray(customEvaluation && customEvaluation.metrics)
    ? customEvaluation.metrics
    : [];
  const criteria = metrics.map((metric) => {
    const score = metricPercent(metric);
    return {
      key: metric.metricKey,
      label: metric.metricLabel || metric.metricKey,
      score,
      explanation:
        text(metric.evidence) ||
        text(metric.selectedOptionLabel) ||
        "AI обрав відповідний варіант за налаштуваннями метрики.",
      improvement: text(metric.improvement) || null
    };
  });
  const strengths = metrics
    .filter((metric) => {
      const score = metricPercent(metric);
      return score !== null && score >= 80;
    })
    .slice(0, 2)
    .map((metric) => `${metric.metricLabel}: ${metric.selectedOptionLabel}`);
  const improvements = metrics
    .filter((metric) => text(metric.improvement))
    .slice(0, 2)
    .map((metric) => metric.improvement);

  return {
    overallScore: customEvaluation ? customEvaluation.overallScore : null,
    overallLabel: overallLabelFromScore(customEvaluation && customEvaluation.overallScore),
    summary:
      text(customEvaluation && customEvaluation.summary) ||
      "Оцінка побудована за кастомними метриками.",
    criteria,
    strengths,
    improvements,
    confidence: averageMetricConfidence(metrics)
  };
}

function enrichCallEvaluation(rawSummary, profileOrSettings, callTypeKey, classification = {}) {
  const callType = findAnalysisCallType(profileOrSettings, callTypeKey);
  const customEvaluation = enrichCustomEvaluation(
    rawSummary && rawSummary.customEvaluation,
    profileOrSettings,
    callType.key
  );

  return {
    ...(rawSummary || {}),
    callType: callType.key,
    callTypeLabel: callType.label,
    callTypeConfidence: finiteNumber(
      classification && classification.confidence,
      finiteNumber(rawSummary && rawSummary.callTypeConfidence, 0.7)
    ),
    customEvaluation,
    operatorEvaluation: buildOperatorEvaluationFromCustom(customEvaluation),
    confidence: finiteNumber(rawSummary && rawSummary.confidence, averageMetricConfidence(customEvaluation.metrics))
  };
}

function formatCallTypeForPrompt(callType, metricRefs = []) {
  return `- ${callType.key} / "${callType.label}" color=${callType.color || "none"}: ${compactInstruction(callType.description)}; metricRefs: ${metricRefs.join(", ")}`;
}

function formatAnalysisSettingsForPrompt(profileOrSettings) {
  const callTypes = analysisCallTypes(profileOrSettings);
  const metricScope = buildMetricPromptScope(callTypes);
  const schemaVersion = profileSchemaVersion(profileOrSettings) || "unknown";
  const revision = profileRevision(profileOrSettings) || "unknown";

  return `
Поточні кастомні AI-налаштування оцінки:
- schemaVersion: ${schemaVersion}
- revision: ${revision}
- Ці налаштування мають пріоритет над базовими правилами нижче.
- Спочатку обери один callType з переліку. callTypeLabel має точно відповідати label вибраного типу.
- У customEvaluation поверни matchedCallType, profileVersion="${schemaVersion}", profileRevision="${revision}".
- Після вибору callType оціни всі enabled metrics саме цього типу, в налаштованому порядку.
  - У callType є список metricRefs. Для оцінки використовуй саме ці metricRefs і відповідні definitions з бібліотеки нижче.
  - У відповіді metricKey має бути чистим metricKey із definition, без префікса callType. metricRef потрібен тільки для вибору правильного опису в prompt.
  - Якщо однаковий metricKey має кілька metricRef у різних callType, використовуй тільки metricRef з вибраного callType і не змішуй описи оцінок між типами.
  - Для кожної metric обери рівно один option. score, color і countsTowardScore мають точно копіювати вибраний option з налаштувань.
  - Для вибору option використовуй саме "опис оцінки" з налаштувань Soldly/AI Settings. Не замінюй їх загальними правилами і не оцінюй за власною шкалою.
  - Якщо option має score=—, поверни score=null, countsTowardScore=false; така metric не входить у загальну статистику і середні оцінки.
  - maxScore для metric = найбільший numeric score серед її option, де countsTowardScore=true. Не використовуй 5 автоматично. Якщо в metric є тільки 0 і 2, maxScore=2, і вибір score=0 означає 0/2.
  - overallScore = нормалізований результат 0-100: sum(score * weight) / sum(maxScore * weight) * 100 тільки по metric, де score != null, maxScore > 0 і countsTowardScore=true; якщо таких немає, overallScore=null.
  - operatorEvaluation залиш для сумісності UI: побудуй його з customEvaluation у шкалі 0-100; для criteria використовуй score/maxScore*100, а для score=null став null.

Типи дзвінків:
${callTypes.map((callType) => formatCallTypeForPrompt(
  callType,
  metricScope.refsByCallTypeKey.get(callType.key) || []
)).join("\n")}

Бібліотека metric definitions:
${metricScope.definitions.map((definition) => formatMetricForPrompt(definition.ref, definition.metric)).join("\n")}
`.trim();
}

function buildCallSummarySystemPrompt(profileOrSettings) {
  return `${formatAnalysisSettingsForPrompt(profileOrSettings)}\n\n${CALL_SUMMARY_SYSTEM_PROMPT}`;
}

module.exports = {
  buildCallEvaluationSchema,
  buildCallEvaluationSystemPrompt,
  buildCallSummarySystemPrompt,
  buildCallTypeClassificationSchema,
  buildCallTypeClassificationSystemPrompt,
  buildSummarySchema,
  CALL_SUMMARY_SYSTEM_PROMPT,
  CALL_TYPE_LABELS,
  CALL_TYPES,
  CLIENT_CONTEXT_PROMPT,
  CUSTOMER_QUESTION_LABELS,
  CUSTOMER_QUESTION_TYPES,
  DOMAIN_TERMS,
  enrichCallEvaluation,
  findAnalysisCallType,
  OPERATOR_EVALUATION_CRITERIA,
  SALES_SCRIPT_PROMPT,
  SUMMARY_SCHEMA,
  TRANSCRIPTION_DOMAIN_PROMPT
};
