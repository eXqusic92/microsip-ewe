#include <QtCore/QByteArray>
#include <QtCore/QCoreApplication>
#include <QtCore/QString>
#include <QtCore/QVariant>
#include <QtSql/QSqlDatabase>
#include <QtSql/QSqlQuery>
#include <QtSql/QSqlRecord>

#include <algorithm>
#include <cctype>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>

extern "C" unsigned qt_cpu_features[];

static void seedQtCpuFeatures() {
  const unsigned cpuFeatureNeon = 2;
  const unsigned cpuFeatureCrc32 = 4;
  const unsigned cpuFeatureAes = 8;
  const unsigned simdInitialized = 1u << 31;
  qt_cpu_features[0] = simdInitialized | cpuFeatureNeon | cpuFeatureCrc32 | cpuFeatureAes;
}

static std::string utf8(const QString &value) {
  const QByteArray bytes = value.toUtf8();
  return std::string(bytes.constData(), static_cast<size_t>(bytes.size()));
}

static std::string jsonString(const std::string &value) {
  std::ostringstream out;
  out << '"';
  for (unsigned char ch : value) {
    switch (ch) {
      case '"':
        out << "\\\"";
        break;
      case '\\':
        out << "\\\\";
        break;
      case '\b':
        out << "\\b";
        break;
      case '\f':
        out << "\\f";
        break;
      case '\n':
        out << "\\n";
        break;
      case '\r':
        out << "\\r";
        break;
      case '\t':
        out << "\\t";
        break;
      default:
        if (ch < 0x20) {
          static const char hex[] = "0123456789abcdef";
          out << "\\u00" << hex[(ch >> 4) & 0x0f] << hex[ch & 0x0f];
        } else {
          out << static_cast<char>(ch);
        }
        break;
    }
  }
  out << '"';
  return out.str();
}

static std::string jsonString(const QString &value) {
  return jsonString(utf8(value));
}

static std::string jsonValue(const QVariant &value) {
  if (!value.isValid() || value.isNull()) {
    return "null";
  }
  return jsonString(value.toString());
}

static int fail(const std::string &error, const std::string &detail = std::string()) {
  std::cout << "{\"ok\":false,\"error\":" << jsonString(error);
  if (!detail.empty()) {
    std::cout << ",\"detail\":" << jsonString(detail);
  }
  std::cout << "}\n";
  return 0;
}

static std::string digitsOnly(const std::string &value) {
  std::string result;
  for (unsigned char ch : value) {
    if (std::isdigit(ch)) {
      result.push_back(static_cast<char>(ch));
    }
  }
  return result;
}

static std::vector<std::string> phoneSuffixes(const std::string &phone) {
  std::vector<std::string> values;
  const std::string normalized = digitsOnly(phone);
  if (!normalized.empty()) {
    values.push_back(normalized);
  }
  if (normalized.rfind("380", 0) == 0 && normalized.size() > 3) {
    values.push_back(std::string("0") + normalized.substr(3));
  }
  if (normalized.size() > 9) {
    values.push_back(normalized.substr(normalized.size() - 9));
  }

  std::vector<std::string> unique;
  for (const std::string &value : values) {
    if (!value.empty() && std::find(unique.begin(), unique.end(), value) == unique.end()) {
      unique.push_back(value);
    }
  }
  return unique;
}

static bool containsText(const std::vector<std::string> &values, const std::string &needle) {
  return std::find(values.begin(), values.end(), needle) != values.end();
}

static std::string joinText(const std::vector<std::string> &items, const std::string &separator) {
  std::string result;
  for (size_t i = 0; i < items.size(); ++i) {
    if (i > 0) {
      result += separator;
    }
    result += items[i];
  }
  return result;
}

static std::string sqlString(const std::string &value) {
  std::string escaped;
  escaped.reserve(value.size() + 2);
  escaped.push_back('\'');
  for (char ch : value) {
    if (ch == '\'') {
      escaped.push_back('\'');
    }
    escaped.push_back(ch);
  }
  escaped.push_back('\'');
  return escaped;
}

static std::string sqlIdent(const std::string &value) {
  std::string escaped;
  escaped.reserve(value.size() + 2);
  escaped.push_back('"');
  for (char ch : value) {
    if (ch == '"') {
      escaped.push_back('"');
    }
    escaped.push_back(ch);
  }
  escaped.push_back('"');
  return escaped;
}

static std::string eventColumn(const std::string &name) {
  return "ei." + sqlIdent(name);
}

static std::string contactNumberExpression() {
  return "coalesce("
    "(select c.Number from Contact c where c.ContactID = ei.ContactID limit 1), "
    "(select c.Number from ChatRelation cr join Contact c on c.ContactID = cr.ContactID "
    "where cr.ChatID = ei.ChatID order by c.ContactID limit 1)"
    ")";
}

static std::string selectColumn(const std::vector<std::string> &columns, const std::string &name) {
  if (name == "Number" && !containsText(columns, "Number")) {
    return contactNumberExpression() + " as " + sqlIdent(name);
  }
  if (containsText(columns, name)) {
    return eventColumn(name) + " as " + sqlIdent(name);
  }
  return "null as " + sqlIdent(name);
}

static std::vector<std::string> wantedColumns() {
  return {
    "EventID",
    "TimeStamp",
    "Direction",
    "EventType",
    "MessageType",
    "MessageStatus",
    "Subject",
    "Body",
    "MessageInfo",
    "PayloadPath",
    "ThumbnailPath",
    "Number"
  };
}

static std::vector<std::string> eventInfoColumns(QSqlDatabase &db) {
  std::vector<std::string> columns;
  QSqlQuery query(db);
  if (!query.exec("pragma table_info('EventInfo')")) {
    return columns;
  }
  while (query.next()) {
    const std::string name = utf8(query.value(1).toString());
    if (!name.empty()) {
      columns.push_back(name);
    }
  }
  return columns;
}

static bool writeQueryResult(QSqlDatabase &db, const std::string &sql, std::ostream &out) {
  QSqlQuery query(db);
  if (!query.exec(QString::fromUtf8(sql.c_str()))) {
    return false;
  }

  const QSqlRecord record = query.record();
  std::vector<std::string> columns;
  for (int i = 0; i < record.count(); ++i) {
    columns.push_back(utf8(record.fieldName(i)));
  }

  out << "{\"ok\":true,\"columns\":[";
  for (size_t i = 0; i < columns.size(); ++i) {
    if (i > 0) {
      out << ",";
    }
    out << jsonString(columns[i]);
  }
  out << "],\"rows\":[";

  bool firstRow = true;
  while (query.next()) {
    if (!firstRow) {
      out << ",";
    }
    firstRow = false;
    out << "{";
    for (size_t i = 0; i < columns.size(); ++i) {
      if (i > 0) {
        out << ",";
      }
      out << jsonString(columns[i]) << ":" << jsonValue(query.value(static_cast<int>(i)));
    }
    out << "}";
  }
  out << "]}\n";
  return true;
}

static bool writeRows(
  QSqlDatabase &db,
  const std::vector<std::string> &columns,
  const std::string &phone,
  int limit,
  std::ostringstream &out
) {
  const std::vector<std::string> wanted = wantedColumns();

  std::vector<std::string> selected;
  for (const std::string &name : wanted) {
    selected.push_back(selectColumn(columns, name));
  }

  std::vector<std::string> numberConditions;
  const bool hasEventNumber = containsText(columns, "Number");
  const bool hasContactId = containsText(columns, "ContactID");
  const bool hasChatId = containsText(columns, "ChatID");
  std::vector<std::string> contactNumberConditions;
  for (const std::string &suffix : phoneSuffixes(phone)) {
    if (hasEventNumber) {
      numberConditions.push_back(eventColumn("Number") + " like " + sqlString("%" + suffix));
    }
    contactNumberConditions.push_back(sqlIdent("Number") + " like " + sqlString("%" + suffix));
  }

  if (!contactNumberConditions.empty()) {
    const std::string contactFilter = joinText(contactNumberConditions, " or ");
    const std::string contactIds = "select ContactID from Contact where (" + contactFilter + ")";
    if (hasContactId) {
      numberConditions.push_back(eventColumn("ContactID") + " in (" + contactIds + ")");
    }
    if (hasChatId) {
      numberConditions.push_back(
        eventColumn("ChatID") +
        " in (select ChatID from ChatRelation where ContactID in (" +
        contactIds +
        "))"
      );
    }
  }

  std::vector<std::string> messageConditions;
  if (containsText(columns, "MessageType")) {
    messageConditions.push_back(eventColumn("MessageType") + " is not null");
  }
  if (containsText(columns, "Body")) {
    messageConditions.push_back(eventColumn("Body") + " is not null");
  }
  if (containsText(columns, "MessageInfo")) {
    messageConditions.push_back(eventColumn("MessageInfo") + " is not null");
  }
  if (containsText(columns, "PayloadPath")) {
    messageConditions.push_back(eventColumn("PayloadPath") + " is not null");
  }

  int safeLimit = limit;
  if (safeLimit < 1) {
    safeLimit = 1;
  }
  if (safeLimit > 10000) {
    safeLimit = 10000;
  }

  const std::string orderColumn = containsText(columns, "TimeStamp") ? eventColumn("TimeStamp") : eventColumn("EventID");
  const std::string sql = "select " + joinText(selected, ", ") +
    " from EventInfo ei where (" +
    (numberConditions.empty() ? "1 = 0" : joinText(numberConditions, " or ")) +
    ") and (" +
    (messageConditions.empty() ? "1 = 1" : joinText(messageConditions, " or ")) +
    ") order by " + orderColumn +
    " desc limit " + std::to_string(safeLimit);

  QSqlQuery query(db);
  if (!query.exec(QString::fromUtf8(sql.c_str()))) {
    return false;
  }

  bool firstRow = true;
  while (query.next()) {
    if (!firstRow) {
      out << ",";
    }
    firstRow = false;
    out << "{";
    for (size_t i = 0; i < wanted.size(); ++i) {
      if (i > 0) {
        out << ",";
      }
      out << jsonString(wanted[i]) << ":" << jsonValue(query.value(static_cast<int>(i)));
    }
    out << "}";
  }
  return true;
}

int main(int argc, char **argv) {
  seedQtCpuFeatures();

  QCoreApplication app(argc, argv);

  if (argc < 6) {
    return fail("invalid_args", "usage: viber-reader <db-path> <hex-key> <plugin-path> <phone-digits> <limit>");
  }

  const QString dbPath = QString::fromUtf8(argv[1]);
  const std::string hexKey = argv[2] ? argv[2] : "";
  const QString pluginPath = QString::fromUtf8(argv[3]);
  const std::string phone = argv[4] ? argv[4] : "";
  const int limit = QString::fromUtf8(argv[5]).toInt();

  if (dbPath.isEmpty() || hexKey.empty() || pluginPath.isEmpty()) {
    return fail("viber_not_configured");
  }

  QCoreApplication::addLibraryPath(pluginPath);

  const QString connectionName = "viber_reader";
  {
    QSqlDatabase db = QSqlDatabase::addDatabase("QSQLITE", connectionName);
    db.setDatabaseName(dbPath);

    if (!db.open()) {
      return fail("viber_database_open_failed");
    }

    QSqlQuery keyQuery(db);
    const std::string keySql = "PRAGMA hexkey=" + sqlString(hexKey);
    if (!keyQuery.exec(QString::fromUtf8(keySql.c_str()))) {
      return fail("viber_database_key_invalid");
    }

    QSqlQuery check(db);
    if (!check.exec("SELECT count(*) FROM sqlite_master") || !check.next()) {
      return fail("viber_database_key_invalid");
    }

    const int tableCount = check.value(0).toInt();
    if (phone == "__tables__") {
      if (!writeQueryResult(
        db,
        "select name, type from sqlite_master where type in ('table', 'view') order by name",
        std::cout
      )) {
        return fail("viber_query_failed");
      }
      return 0;
    }
    if (phone.rfind("__columns__:", 0) == 0) {
      const std::string table = phone.substr(std::string("__columns__:").size());
      if (!writeQueryResult(db, "pragma table_info(" + sqlString(table) + ")", std::cout)) {
        return fail("viber_query_failed");
      }
      return 0;
    }
    if (phone.rfind("__sample__:", 0) == 0) {
      const std::string table = phone.substr(std::string("__sample__:").size());
      if (!writeQueryResult(db, "select * from " + sqlIdent(table) + " limit 5", std::cout)) {
        return fail("viber_query_failed");
      }
      return 0;
    }

    const std::vector<std::string> columns = eventInfoColumns(db);

    std::ostringstream rows;
    if (!columns.empty() && !writeRows(db, columns, phone, limit, rows)) {
      return fail("viber_query_failed");
    }

    std::cout << "{\"ok\":true,\"encrypted\":true,\"tableCount\":" << tableCount;
    std::cout << ",\"columns\":[";
    for (size_t i = 0; i < columns.size(); ++i) {
      if (i > 0) {
        std::cout << ",";
      }
      std::cout << jsonString(columns[i]);
    }
    std::cout << "]";
    std::cout << ",\"schemaSupported\":" << (columns.empty() ? "false" : "true");
    std::cout << ",\"rows\":[" << rows.str() << "]}\n";
    return 0;
  }
}
