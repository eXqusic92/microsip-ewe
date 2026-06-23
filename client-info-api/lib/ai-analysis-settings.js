"use strict";

const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const SETTINGS_VERSION = 1;
const DEFAULT_SCHEMA_VERSION = "20260608-ai-analysis-settings-2";
const DEFAULT_COLORS = {
  excellent: "#22c55e",
  good: "#84cc16",
  partial: "#facc15",
  weak: "#fb923c",
  missed: "#ef4444",
  notApplicable: "#94a3b8"
};

function text(value, fallback = "") {
  return value === null || value === undefined ? fallback : String(value).trim();
}

function booleanValue(value, fallback = true) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  return Boolean(value);
}

function finiteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampScore(value, fallback = 0) {
  return Math.max(0, Math.min(5, finiteNumber(value, fallback)));
}

function nullableScore(value, fallback = 0) {
  if (value === undefined) {
    return clampScore(fallback, fallback);
  }
  if (value === null) {
    return null;
  }

  const raw = String(value).trim().toLowerCase();
  if (!raw || raw === "-" || raw === "—" || raw === "null" || raw === "none") {
    return null;
  }

  return clampScore(value, fallback);
}

function normalizeKey(value, fallback) {
  const raw = text(value, fallback)
    .toLowerCase()
    .replace(/[^a-z0-9_:-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return raw || fallback;
}

function normalizeColor(value, fallback) {
  const raw = text(value);
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toLowerCase() : fallback;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function option(key, label, score, color, aiInstructions, countsTowardScore = score !== null) {
  return {
    key,
    label,
    score,
    color,
    countsTowardScore,
    aiInstructions,
    aiBrief: ""
  };
}

function threeLevelOptions({
  excellent,
  partial,
  missed,
  notApplicable = "Цей критерій не є релевантним для конкретного сценарію або в транскрипті бракує даних."
}) {
  return [
    option("excellent", "Сильне виконання", 5, DEFAULT_COLORS.excellent, excellent),
    option("partial", "Частково виконано", 3, DEFAULT_COLORS.partial, partial),
    option("missed", "Не виконано", 0, DEFAULT_COLORS.missed, missed),
    option("not_applicable", "Неактуально / немає даних", null, DEFAULT_COLORS.notApplicable, notApplicable, false)
  ];
}

const METRIC_TEMPLATES = {
  greeting: {
    label: "Привітання",
    group: "Базові метрики",
    description: "Чи оператор коректно почав розмову і задав професійний тон.",
    aiInstructions:
      "Оціни тільки старт розмови: привітання, представлення себе/компанії та готовність допомогти. Не штрафуй, якщо запис почався після фактичного привітання.",
    options: threeLevelOptions({
      excellent:
        "Оператор привітався, представився або назвав компанію, говорив доброзичливо і швидко перейшов до допомоги.",
      partial:
        "Оператор привітався або прийняв звернення, але не представився/не назвав компанію чи тон був сухий.",
      missed:
        "Оператор не привітався, почав різко, перебив клієнта або одразу перейшов у захисний тон."
    })
  },
  needs_discovery: {
    label: "Виявлення потреб",
    group: "Базові метрики",
    description: "Чи оператор зібрав достатньо інформації для вирішення питання.",
    aiInstructions:
      "Оцінюй доречні уточнення для сценарію: маршрут, дату, квиток, посадку, проблему, контакт, кількість пасажирів. Не вимагай зайвих питань, якщо контекст уже достатній.",
    options: threeLevelOptions({
      excellent:
        "Оператор зібрав саме ті дані, які потрібні для цього звернення, без зайвого затягування.",
      partial:
        "Оператор уточнив частину важливих деталей, але пропустив одну суттєву деталь для точного рішення.",
      missed:
        "Оператор майже не уточнював потребу або дав відповідь без достатнього розуміння ситуації."
    })
  },
  communication: {
    label: "Комунікація",
    group: "Базові метрики",
    description: "Зрозумілість, структура і керування діалогом.",
    aiInstructions:
      "Оціни, чи оператор говорив зрозуміло, не плутав клієнта, не сперечався без потреби і тримав діалог у конструктивному руслі.",
    options: threeLevelOptions({
      excellent:
        "Оператор пояснював коротко і зрозуміло, слухав клієнта, не перебивав і тримав розмову структуровано.",
      partial:
        "Загалом комунікація була прийнятною, але були нечіткі пояснення, зайві паузи, перебивання або повтори.",
      missed:
        "Комунікація заважала вирішенню: оператор плутався, сперечався, ігнорував питання або говорив неприязно."
    })
  },
  solution: {
    label: "Рішення",
    group: "Базові метрики",
    description: "Чи клієнт отримав корисну відповідь або конкретний варіант дії.",
    aiInstructions:
      "Оціни практичну цінність відповіді. Не штрафуй оператора за те, що рішення залежить від кордону, водія, політики повернення або іншого відділу, якщо оператор це пояснив і дав наступний крок.",
    options: threeLevelOptions({
      excellent:
        "Оператор дав чітке рішення, варіант рейсу, пояснення або наступну дію з важливими деталями.",
      partial:
        "Оператор частково допоміг, але відповідь була неповною або без достатніх деталей для клієнта.",
      missed:
        "Оператор не дав корисної відповіді і не запропонував реального наступного кроку."
    })
  },
  next_step: {
    label: "Завершення",
    group: "Базові метрики",
    description: "Чи оператор зафіксував домовленість і наступну дію.",
    aiInstructions:
      "Оціни кінець розмови: підтвердження домовленості, канал зв'язку, дедлайн, оплата, повідомлення в месенджер або перевірка, чи залишилися питання.",
    options: threeLevelOptions({
      excellent:
        "Оператор чітко підсумував домовленість або наступний крок і коректно завершив розмову.",
      partial:
        "Розмова завершена нормально, але без явного підсумку, дедлайну або перевірки додаткових питань.",
      missed:
        "Оператор обірвав розмову або не дав зрозуміти, що буде далі, коли це було потрібно."
    })
  },
  tone: {
    label: "Тон",
    group: "Базові метрики",
    description: "Ввічливість, спокій і людяність оператора.",
    aiInstructions:
      "Оціни тон оператора в контексті всієї розмови. Не штрафуй за прямоту, якщо оператор був ввічливим і питання просте.",
    options: threeLevelOptions({
      excellent:
        "Оператор був ввічливий, спокійний, доброзичливий і підтримував професійний тон.",
      partial:
        "Тон був прийнятним, але іноді сухим, поспішним або недостатньо емпатичним.",
      missed:
        "Тон був різким, байдужим, конфліктним або клієнт міг відчути знецінення."
    })
  },
  pause_control: {
    label: "Контроль пауз",
    group: "Додаткові метрики",
    description: "Чи оператор керував очікуванням і довгими паузами.",
    aiInstructions:
      "Оціни тільки помітні паузи або пошук інформації. Якщо пауз не було або запис короткий, обирай неактуально.",
    options: threeLevelOptions({
      excellent:
        "Якщо виникала пауза або пошук, оператор попередив клієнта, пояснив очікування або запропонував передзвон.",
      partial:
        "Були паузи, але оператор частково пояснював очікування або швидко повертався до клієнта.",
      missed:
        "Були довгі незрозумілі паузи без пояснення, що могло дратувати клієнта.",
      notApplicable:
        "У розмові не було значущих пауз або транскрипт не дозволяє оцінити контроль пауз."
    })
  },
  conversion: {
    label: "Продаж / утримання",
    group: "Продажі",
    description: "Чи оператор доречно вів клієнта до бронювання, оплати або збереження клієнта.",
    aiInstructions:
      "Оцінюй тільки коли продаж, бронювання, повернення або утримання доречні. Не вимагай продажу у скарзі, довідковому чи технічному дзвінку.",
    options: threeLevelOptions({
      excellent:
        "Оператор доречно запропонував бронювання, оплату, альтернативу, перенесення, зворотний квиток або утримання клієнта.",
      partial:
        "Оператор мав шанс м'яко просунути клієнта до дії, але зробив це слабко або не повністю.",
      missed:
        "Оператор пропустив очевидну можливість продажу/утримання або відштовхнув клієнта.",
      notApplicable:
        "У цьому дзвінку продаж або утримання не були доречними."
    })
  },
  route_selection: {
    label: "Підбір рейсу",
    group: "Продажі",
    description: "Чи оператор підібрав релевантний рейс або альтернативу.",
    aiInstructions:
      "Оцінюй для бронювання, теплої заявки і запиту по розкладу: дата, маршрут, час, посадка, ціна, пересадки, умови.",
    options: threeLevelOptions({
      excellent:
        "Оператор підібрав релевантний рейс/альтернативу і назвав ключові деталі для рішення.",
      partial:
        "Оператор дав варіант, але без частини важливих деталей або не запропонував очевидну альтернативу.",
      missed:
        "Оператор не підібрав рейс або не допоміг клієнту зорієнтуватися."
    })
  },
  empathy: {
    label: "Емпатія",
    group: "Сервіс",
    description: "Чи оператор визнав емоції клієнта і знизив напругу.",
    aiInstructions:
      "Особливо важливо для скарг, затримок, повернень, змін рейсу і проблем у дорозі. Не вимагай надмірної емпатії у простому інформаційному дзвінку.",
    options: threeLevelOptions({
      excellent:
        "Оператор визнав незручність або емоцію клієнта, говорив людяно і не переводив провину на клієнта.",
      partial:
        "Оператор був ввічливий, але майже не визнав емоцію або незручність клієнта.",
      missed:
        "Оператор знецінив проблему, сперечався або говорив так, що міг посилити конфлікт."
    })
  },
  escalation: {
    label: "Ескалація",
    group: "Сервіс",
    description: "Чи оператор правильно передав питання іншій ролі або зафіксував звернення.",
    aiInstructions:
      "Оцінюй, якщо питання потребує диспетчера, водія, якості, керівника, бухгалтерії або техпідтримки. Не вимагай ескалації для питання, яке оператор вирішив сам.",
    options: threeLevelOptions({
      excellent:
        "Оператор правильно визначив потребу в ескалації, пояснив кому/куди передає і що буде далі.",
      partial:
        "Ескалація була потрібна або зроблена, але без достатнього пояснення, дедлайну чи каналу оновлення.",
      missed:
        "Потрібну ескалацію не зроблено або клієнт залишився без зрозумілого маршруту вирішення.",
      notApplicable:
        "Питання не потребувало ескалації."
    })
  },
  schedule_accuracy: {
    label: "Точність розкладу",
    group: "Доменні метрики",
    description: "Коректність відповіді щодо рейсу, часу, маршруту або посадки.",
    aiInstructions:
      "Оцінюй тільки зміст, який можна встановити з розмови або clientContext. Не вигадуй помилки, якщо факти не перевіряються.",
    options: threeLevelOptions({
      excellent:
        "Оператор дав узгоджену і корисну інформацію щодо маршруту, часу, посадки або автобуса.",
      partial:
        "Інформація була частково корисною, але бракувало однієї важливої деталі або пояснення.",
      missed:
        "Оператор дав плутану, неповну або потенційно хибну інформацію по рейсу."
    })
  },
  payment_clarity: {
    label: "Оплата / ціна",
    group: "Доменні метрики",
    description: "Чи оператор зрозуміло пояснив ціну, оплату, доплату або повернення грошей.",
    aiInstructions:
      "Оцінюй точність і зрозумілість пояснення грошей. Не штрафуй за правила компанії, якщо оператор пояснив їх коректно.",
    options: threeLevelOptions({
      excellent:
        "Оператор чітко пояснив суму, валюту, спосіб оплати, посилання, дедлайн або статус платежу.",
      partial:
        "Пояснення по оплаті/ціні було частковим або без важливих умов.",
      missed:
        "Оператор не пояснив оплату/ціну або заплутав клієнта."
    })
  },
  refund_handling: {
    label: "Повернення / скасування",
    group: "Доменні метрики",
    description: "Чи оператор коректно обробив повернення, ануляцію або перенесення.",
    aiInstructions:
      "Оцінюй пояснення правил, спробу альтернативи, фіксацію звернення і наступний крок. Не штрафуй за самі правила повернення.",
    options: threeLevelOptions({
      excellent:
        "Оператор коректно пояснив правила, запропонував доречну альтернативу або чітко описав процес повернення.",
      partial:
        "Оператор частково пояснив повернення/скасування, але не вистачило умов, дедлайну або наступного кроку.",
      missed:
        "Оператор не допоміг із поверненням/скасуванням або пояснив процес незрозуміло."
    })
  },
  change_handling: {
    label: "Зміна рейсу / квитка",
    group: "Доменні метрики",
    description: "Чи оператор коректно опрацював зміну дати, часу, рейсу, автобуса або квитка.",
    aiInstructions:
      "Оцінюй, чи оператор пояснив факт зміни, варіанти, дедлайн, канал повідомлення і подальшу дію.",
    options: threeLevelOptions({
      excellent:
        "Оператор дав зрозумілий варіант зміни або пояснив зміну рейсу з конкретними деталями.",
      partial:
        "Оператор частково пояснив зміну, але не вистачило деталей або наступної дії.",
      missed:
        "Оператор не допоміг клієнту зрозуміти зміну або не запропонував реальний варіант."
    })
  },
  documents_accuracy: {
    label: "Документи / правила",
    group: "Доменні метрики",
    description: "Обережність і коректність відповіді щодо документів, дітей, тварин, кордону або митниці.",
    aiInstructions:
      "Оператор не має давати юридичних гарантій. Добре: обережне пояснення і рекомендація офіційного джерела.",
    options: threeLevelOptions({
      excellent:
        "Оператор дав обережне пояснення, не гарантував рішення прикордонників і скерував до офіційного джерела за потреби.",
      partial:
        "Оператор відповів корисно, але без достатньої обережності або без згадки офіційного джерела.",
      missed:
        "Оператор дав ризиковану гарантію або некоректно пояснив документи/правила."
    })
  },
  baggage_policy: {
    label: "Багаж",
    group: "Доменні метрики",
    description: "Чи оператор коректно пояснив правила багажу, тварин або додаткових речей.",
    aiInstructions:
      "Оцінюй чіткість правил, обмежень, доплат і способу підтвердження.",
    options: threeLevelOptions({
      excellent:
        "Оператор зрозуміло пояснив правила багажу/тварин, обмеження, доплати або наступний крок.",
      partial:
        "Оператор відповів частково, але бракувало умов, ціни або підтвердження.",
      missed:
        "Оператор не пояснив правила багажу або дав плутану відповідь."
    })
  },
  parcel_policy: {
    label: "Посилки",
    group: "Доменні метрики",
    description: "Чи оператор коректно обробив питання передачі або отримання посилки.",
    aiInstructions:
      "Враховуй, що компанія займається пасажирськими перевезеннями, а не регулярною доставкою. Оператор має не обіцяти зайвого.",
    options: threeLevelOptions({
      excellent:
        "Оператор коректно пояснив можливості/обмеження щодо посилки і дав доступний канал або наступний крок.",
      partial:
        "Оператор відповів частково, але без чітких обмежень або наступної дії.",
      missed:
        "Оператор пообіцяв зайве або не допоміг з питанням посилки."
    })
  },
  lost_item_handling: {
    label: "Загублені речі",
    group: "Доменні метрики",
    description: "Чи оператор зібрав дані й дав процес пошуку речей.",
    aiInstructions:
      "Оцінюй збір потрібних даних: рейс, дата, місце, опис речі, контакт, водій/диспетчер, очікуваний зворотний зв'язок.",
    options: threeLevelOptions({
      excellent:
        "Оператор зібрав потрібні дані про річ і пояснив, хто/коли перевірить або як клієнту дадуть відповідь.",
      partial:
        "Оператор частково прийняв звернення, але не уточнив важливі дані або не дав дедлайн.",
      missed:
        "Оператор не зафіксував звернення про загублену річ або не дав наступного кроку."
    })
  },
  useful_content: {
    label: "Корисний зміст",
    group: "Базові метрики",
    description: "Чи в дзвінку взагалі було що аналізувати.",
    aiInstructions:
      "Використовуй для коротких, помилкових, мовчазних або технічно зіпсованих дзвінків.",
    options: threeLevelOptions({
      excellent:
        "У дзвінку є достатньо змісту для класифікації або короткого операційного висновку.",
      partial:
        "Зміст частковий: можна зрозуміти тему, але даних для оцінки оператора мало.",
      missed:
        "Корисного змісту майже немає: мовчання, помилковий дзвінок, шум або уривок без суті.",
      notApplicable:
        "Не використовується для змістовних дзвінків інших типів."
    })
  }
};

const CALL_TYPES = [
  {
    key: "warm_lead_followup",
    label: "Тепла заявка",
    description:
      "Оператор або клієнт продовжує незавершене бронювання, заявку з сайту чи спробу купити квиток.",
    color: "#22c55e",
    metrics: ["greeting", "needs_discovery", "route_selection", "conversion", "communication", "next_step", "tone", "pause_control"]
  },
  {
    key: "ticket_booking",
    label: "Забронювати квиток",
    description:
      "Клієнт хоче купити, забронювати або підібрати автобусний квиток.",
    color: "#2f9e6f",
    metrics: ["greeting", "needs_discovery", "route_selection", "conversion", "payment_clarity", "communication", "next_step", "tone", "pause_control"]
  },
  {
    key: "bus_or_boarding_clarification",
    label: "Уточнення автобуса",
    description:
      "Автобус, водій, посадка, платформа, зупинка, контакт водія або де чекати.",
    color: "#4fb4d2",
    metrics: ["greeting", "needs_discovery", "schedule_accuracy", "solution", "communication", "next_step", "tone", "pause_control"]
  },
  {
    key: "border_delay",
    label: "Затримка на кордоні",
    description:
      "Клієнт питає про затримку автобуса на кордоні, час очікування або оновлення.",
    color: "#d99a27",
    metrics: ["greeting", "needs_discovery", "empathy", "solution", "escalation", "communication", "next_step", "tone"]
  },
  {
    key: "route_or_schedule_clarification",
    label: "Уточнення рейсу",
    description:
      "Наявність рейсу, розклад, час, маршрут або дата поїздки без явного бронювання.",
    color: "#4776e6",
    metrics: ["greeting", "needs_discovery", "schedule_accuracy", "route_selection", "conversion", "communication", "next_step", "tone"]
  },
  {
    key: "route_change_notice",
    label: "Зміна або скасування рейсу",
    description:
      "Оператор повідомляє або клієнт уточнює зміну часу/дати/автобуса, об'єднання, запізнення чи скасування рейсу перевізником.",
    color: "#f97316",
    metrics: ["greeting", "change_handling", "empathy", "solution", "escalation", "communication", "next_step", "tone"]
  },
  {
    key: "ticket_change",
    label: "Зміна квитка",
    description:
      "Перенесення, зміна дати, маршруту, пасажира або місця.",
    color: "#8b6fd6",
    metrics: ["greeting", "needs_discovery", "change_handling", "payment_clarity", "solution", "communication", "next_step", "tone"]
  },
  {
    key: "ticket_return_or_cancel",
    label: "Повернення або скасування",
    description:
      "Повернення коштів, скасування, ануляція або відмова від поїздки.",
    color: "#d76f30",
    metrics: ["greeting", "needs_discovery", "refund_handling", "conversion", "empathy", "communication", "next_step", "tone"]
  },
  {
    key: "complaint",
    label: "Скарга",
    description:
      "Клієнт висловлює незадоволення сервісом, водієм, запізненням, якістю або проблемою в дорозі.",
    color: "#e30613",
    metrics: ["greeting", "needs_discovery", "empathy", "solution", "escalation", "communication", "next_step", "tone"]
  },
  {
    key: "payment_or_price",
    label: "Оплата або ціна",
    description:
      "Ціна, оплата, доплата, не пройшла оплата, чек або фінансове уточнення.",
    color: "#d99a27",
    metrics: ["greeting", "needs_discovery", "payment_clarity", "solution", "communication", "next_step", "tone"]
  },
  {
    key: "documents_or_permits",
    label: "Документи або дозволи",
    description:
      "Документи, правила перетину кордону, діти, тварини, дозволені товари, митні або прикордонні правила.",
    color: "#8b5cf6",
    metrics: ["greeting", "needs_discovery", "documents_accuracy", "solution", "communication", "next_step", "tone"]
  },
  {
    key: "baggage",
    label: "Багаж",
    description:
      "Багаж, додатковий багаж, тварини або правила перевезення речей.",
    color: "#1d9a8a",
    metrics: ["greeting", "needs_discovery", "baggage_policy", "payment_clarity", "solution", "communication", "next_step", "tone"]
  },
  {
    key: "parcel_inquiry",
    label: "Посилки",
    description:
      "Клієнт питає про передачу або отримання посилки чи контакт водія щодо посилки.",
    color: "#14b8a6",
    metrics: ["greeting", "needs_discovery", "parcel_policy", "solution", "communication", "next_step", "tone"]
  },
  {
    key: "lost_item",
    label: "Загублені речі",
    description:
      "Клієнт шукає речі, залишені в автобусі або на маршруті.",
    color: "#d34f8b",
    metrics: ["greeting", "needs_discovery", "lost_item_handling", "escalation", "communication", "next_step", "tone"]
  },
  {
    key: "no_useful_content",
    label: "Без корисного змісту",
    description:
      "Короткий, помилковий, мовчазний дзвінок або немає суті для картки й оцінки.",
    color: "#7d8b92",
    metrics: ["useful_content", "tone"]
  },
  {
    key: "other",
    label: "Інше",
    description:
      "Корисний зміст є, але він не входить у жоден окремий тип.",
    color: "#59666d",
    metrics: ["greeting", "needs_discovery", "solution", "communication", "next_step", "tone"]
  }
];

function createMetric(metricKey, order) {
  const template = METRIC_TEMPLATES[metricKey] || METRIC_TEMPLATES.solution;

  return {
    key: metricKey,
    label: template.label,
    group: template.group,
    enabled: true,
    order,
    weight: 1,
    type: "ai_option",
    description: template.description,
    aiInstructions: template.aiInstructions,
    aiBrief: template.aiBrief || "",
    options: clone(template.options)
  };
}

function createDefaultAiAnalysisSettings() {
  return {
    version: SETTINGS_VERSION,
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    callTypes: CALL_TYPES.map((callType, index) => ({
      key: callType.key,
      label: callType.label,
      description: callType.description,
      color: callType.color,
      enabled: true,
      order: (index + 1) * 10,
      metrics: callType.metrics.map((metricKey, metricIndex) =>
        createMetric(metricKey, (metricIndex + 1) * 10)
      )
    }))
  };
}

function normalizeOption(raw, fallbackKey, fallbackOrder) {
  const key = normalizeKey(raw && raw.key, fallbackKey);
  const rawCountsTowardScore = booleanValue(raw && raw.countsTowardScore, true);
  const normalizedScore = nullableScore(raw && raw.score, 0);
  const score = rawCountsTowardScore === false ? null : normalizedScore;
  const countsTowardScore = score === null ? false : rawCountsTowardScore;

  return {
    key,
    label: text(raw && raw.label, key),
    score,
    color: normalizeColor(raw && raw.color, score === null
      ? DEFAULT_COLORS.notApplicable
      : score >= 4
        ? DEFAULT_COLORS.excellent
        : score >= 2
          ? DEFAULT_COLORS.partial
          : DEFAULT_COLORS.missed),
    countsTowardScore,
    aiInstructions: text(raw && raw.aiInstructions, text(raw && raw.label, key)),
    aiBrief: text(raw && raw.aiBrief),
    order: finiteNumber(raw && raw.order, fallbackOrder)
  };
}

function normalizeMetric(raw, fallbackKey, fallbackOrder) {
  const key = normalizeKey(raw && raw.key, fallbackKey);
  const rawOptions = Array.isArray(raw && raw.options) ? raw.options : [];
  const options = [];
  const seen = new Set();

  for (let index = 0; index < rawOptions.length; index += 1) {
    const candidate = normalizeOption(rawOptions[index], `option_${index + 1}`, (index + 1) * 10);
    if (seen.has(candidate.key)) {
      continue;
    }
    seen.add(candidate.key);
    options.push(candidate);
  }

  if (!options.length) {
    options.push(...clone(METRIC_TEMPLATES.solution.options));
  }

  return {
    key,
    label: text(raw && raw.label, key),
    group: text(raw && raw.group, "Ваші метрики"),
    enabled: booleanValue(raw && raw.enabled, true),
    order: finiteNumber(raw && raw.order, fallbackOrder),
    weight: Math.max(0, finiteNumber(raw && raw.weight, 1)),
    type: text(raw && raw.type, "ai_option"),
    description: text(raw && raw.description),
    aiInstructions: text(raw && raw.aiInstructions, text(raw && raw.description, text(raw && raw.label, key))),
    aiBrief: text(raw && raw.aiBrief),
    options
  };
}

function normalizeCallType(raw, fallbackKey, fallbackOrder) {
  const key = normalizeKey(raw && raw.key, fallbackKey);
  const rawMetrics = Array.isArray(raw && raw.metrics) ? raw.metrics : [];
  const metrics = [];
  const seen = new Set();

  for (let index = 0; index < rawMetrics.length; index += 1) {
    const candidate = normalizeMetric(rawMetrics[index], `metric_${index + 1}`, (index + 1) * 10);
    if (seen.has(candidate.key)) {
      continue;
    }
    seen.add(candidate.key);
    metrics.push(candidate);
  }

  if (!metrics.length) {
    metrics.push(createMetric("solution", 10));
  }

  return {
    key,
    label: text(raw && raw.label, key),
    description: text(raw && raw.description),
    aiBrief: text(raw && raw.aiBrief),
    color: normalizeColor(raw && raw.color, DEFAULT_COLORS.notApplicable),
    enabled: booleanValue(raw && raw.enabled, true),
    order: finiteNumber(raw && raw.order, fallbackOrder),
    metrics
  };
}

function normalizeAiAnalysisSettings(value) {
  const source = value && value.settings ? value.settings : value;
  const callTypesRaw = Array.isArray(source && source.callTypes)
    ? source.callTypes
    : [];
  const callTypes = [];
  const seen = new Set();

  for (let index = 0; index < callTypesRaw.length; index += 1) {
    const candidate = normalizeCallType(callTypesRaw[index], `call_type_${index + 1}`, (index + 1) * 10);
    if (seen.has(candidate.key)) {
      continue;
    }
    seen.add(candidate.key);
    callTypes.push(candidate);
  }

  if (!callTypes.length) {
    return createDefaultAiAnalysisSettings();
  }

  return {
    version: SETTINGS_VERSION,
    schemaVersion: DEFAULT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    callTypes
  };
}

function stableValue(value) {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => key !== "updatedAt")
      .sort()
      .map((key) => [key, stableValue(value[key])])
  );
}

function settingsRevision(settings) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(stableValue(settings)))
    .digest("hex")
    .slice(0, 16);
}

function semanticValue(value) {
  if (Array.isArray(value)) {
    return value.map(semanticValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => ![
        "updatedAt",
        "score",
        "color",
        "countsTowardScore",
        "weight",
        "order"
      ].includes(key))
      .sort()
      .map((key) => [key, semanticValue(value[key])])
  );
}

function scoringValue(value) {
  if (Array.isArray(value)) {
    return value.map(scoringValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.keys(value)
      .filter((key) => ![
        "updatedAt",
        "description",
        "aiInstructions",
        "aiBrief"
      ].includes(key))
      .sort()
      .map((key) => [key, scoringValue(value[key])])
  );
}

function settingsSemanticRevision(settings) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(semanticValue(settings)))
    .digest("hex")
    .slice(0, 16);
}

function settingsScoringRevision(settings) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(scoringValue(settings)))
    .digest("hex")
    .slice(0, 16);
}

function enabledCallTypes(settings) {
  return [...((settings && settings.callTypes) || [])]
    .filter((callType) => callType.enabled !== false)
    .sort((a, b) => finiteNumber(a.order) - finiteNumber(b.order));
}

function enabledMetrics(callType) {
  return [...((callType && callType.metrics) || [])]
    .filter((metric) => metric.enabled !== false)
    .sort((a, b) => finiteNumber(a.order) - finiteNumber(b.order));
}

class AiAnalysisSettingsStore {
  constructor(filename) {
    this.filename = filename;
    this.loaded = false;
    this.settings = createDefaultAiAnalysisSettings();
    this.writeQueue = Promise.resolve();
  }

  async load() {
    if (this.loaded) {
      return;
    }

    await fs.mkdir(path.dirname(this.filename), { recursive: true });

    try {
      const content = await fs.readFile(this.filename, "utf8");
      this.settings = normalizeAiAnalysisSettings(JSON.parse(content));
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }

      await this.persist();
    }

    this.loaded = true;
  }

  async get() {
    await this.load();
    return clone(this.settings);
  }

  async getProfile() {
    const settings = await this.get();
    return {
      settings,
      schemaVersion: settings.schemaVersion,
      revision: settingsRevision(settings),
      semanticRevision: settingsSemanticRevision(settings),
      scoringRevision: settingsScoringRevision(settings)
    };
  }

  async getPublicSettings() {
    const profile = await this.getProfile();
    return {
      ok: true,
      ...profile
    };
  }

  async update(value) {
    await this.load();
    this.settings = normalizeAiAnalysisSettings(value);
    await this.persist();
    return this.getPublicSettings();
  }

  async reset() {
    await this.load();
    this.settings = createDefaultAiAnalysisSettings();
    await this.persist();
    return this.getPublicSettings();
  }

  async persist() {
    const content = `${JSON.stringify(this.settings, null, 2)}\n`;

    this.writeQueue = this.writeQueue.then(async () => {
      await fs.mkdir(path.dirname(this.filename), { recursive: true });
      const temporaryFile = `${this.filename}.${process.pid}.tmp`;
      await fs.writeFile(temporaryFile, content, "utf8");
      await fs.rename(temporaryFile, this.filename);
    });

    return this.writeQueue;
  }
}

module.exports = {
  AiAnalysisSettingsStore,
  createDefaultAiAnalysisSettings,
  enabledCallTypes,
  enabledMetrics,
  normalizeAiAnalysisSettings,
  settingsRevision,
  settingsSemanticRevision,
  settingsScoringRevision
};
