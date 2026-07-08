# Viber Desktop local DB reader

Це пам'ятка по локальному читанню повідомлень з Viber Desktop для DUMA Client Info.

Головне: база `viber.db` не відкривається звичайним `sqlite3` і не є звичайним SQLCipher. У нашому випадку вона відкривається як SQLite SEE через власний Qt SQLite driver, який лежить всередині Viber Desktop. Читання робиться через маленький C++ reader:

```bash
client-info-api/tools/viber-reader.cpp
client-info-api/bin/viber-reader
```

Reader не створює розшифровану копію бази на диску. Він відкриває оригінальний `viber.db`, виконує `PRAGMA hexkey='<hex-key>'`, читає потрібні рядки і повертає JSON.

## Мультиплатформений запуск

`viber-macos-read.sh` - це тільки macOS helper. Для мультиплатформи використовувати Node wrapper:

```bash
node tools/viber-read.js --check
node tools/viber-read.js 380981234567
node tools/viber-read.js --print-env
node tools/viber-export-html.js 380981234567 --out exports/viber-chat.html
```

На Windows:

```powershell
node tools\viber-read.js --check
node tools\viber-read.js 380981234567
node tools\viber-read.js --print-env
node tools\viber-export-html.js 380981234567 --out exports\viber-chat.html
```

Важливо: `viber-read.js` мультиплатформений, але `viber-reader` - native binary. Його треба мати під конкретну ОС:

```text
macOS:   bin/viber-reader
Linux:   bin/viber-reader
Windows: bin\viber-reader.exe
```

Тобто один JS wrapper можна возити між macOS / Windows / Linux, але C++ reader треба зібрати окремо для кожної платформи. Це нормально для DUMA, бо backend на кожному сервері все одно запускає локальний executable через `VIBER_READER_BIN`.

## HTML export

Щоб отримати людський HTML-файл у стилі Telegram Desktop export:

```bash
node tools/viber-export-html.js 380981234567
```

Скрипт створить файл типу:

```text
viber-chat-380981234567-2026-07-07-15-30-22.html
```

Вказати свій файл:

```bash
node tools/viber-export-html.js 380981234567 --out exports/viber-380981234567.html
```

Витягнути більше повідомлень:

```bash
node tools/viber-export-html.js 380981234567 --limit 10000
```

Windows:

```powershell
node tools\viber-export-html.js 380981234567 --out exports\viber-380981234567.html --limit 10000
```

HTML самодостатній: CSS вбудований у файл, зовнішні бібліотеки не потрібні. Файлові повідомлення показуються як attachment-блоки з іменем файлу, якщо воно є в `MessageInfo`/`PayloadPath`.

## Що вже перевірено

Перевірено на цьому Mac:

```text
OS: macOS
Viber Desktop: /Applications/Viber.app
Viber DB: ~/Library/Application Support/ViberPC/<account-phone>/viber.db
Qt plugin path: /Applications/Viber.app/Contents/PlugIns
Qt frameworks: /Applications/Viber.app/Contents/Frameworks
```

Робоча формула ключа для цього macOS-випадку:

```bash
printf 'aes128:%s' "$(id -un | rev)" | xxd -p -c 256
```

Тобто ключ - це hex від рядка:

```text
aes128:<macOS username reversed>
```

У `.env` для DUMA Client Info це має виглядати так:

```dotenv
VIBER_ENABLED=true
VIBER_DB_PATH="/Users/<user>/Library/Application Support/ViberPC/<account-phone>/viber.db"
VIBER_READER_BIN=bin/viber-reader
VIBER_PLUGIN_PATH=/Applications/Viber.app/Contents/PlugIns
VIBER_ACCOUNT_PHONE=<account-phone>
VIBER_DB_KEY=<hex-key>
VIBER_MESSAGE_LIMIT=50
```

`VIBER_ACCOUNT_PHONE` - це номер акаунта, під яким залогінений Viber Desktop. Це потрібно, щоб картка клієнта не трактувала власний номер акаунта як окремий чат.

## macOS: швидкий запуск

З репозиторію:

```bash
cd /Users/exqusic/microsip-ewe/client-info-api
./tools/viber-macos-read.sh 380981234567
```

З toolkit-папки в `Downloads`:

```bash
cd ~/Downloads/viber-db-toolkit
node viber-read.js --check
node viber-read.js 380981234567
node viber-export-html.js 380981234567 --out viber-chat.html
./viber-macos-read.sh 380981234567
```

Якщо скрипт запускається не з репозиторію, можна явно вказати шлях:

```bash
DUMA_CLIENT_INFO_ROOT=/Users/exqusic/microsip-ewe/client-info-api \
./viber-macos-read.sh 380981234567
```

Корисні override-змінні:

```bash
VIBER_DB_PATH="/Users/<user>/Library/Application Support/ViberPC/<account-phone>/viber.db"
VIBER_DB_KEY="<hex-key>"
VIBER_PLUGIN_PATH="/Applications/Viber.app/Contents/PlugIns"
VIBER_MESSAGE_LIMIT=50
QT_HEADERS="/opt/homebrew/Cellar/qtbase/6.11.1/lib"
```

Приклад прямого запуску reader-а:

```bash
cd /Users/exqusic/microsip-ewe/client-info-api
bin/viber-reader \
  "/Users/<user>/Library/Application Support/ViberPC/<account-phone>/viber.db" \
  "<hex-key>" \
  "/Applications/Viber.app/Contents/PlugIns" \
  "380981234567" \
  50
```

Debug-команди reader-а:

```bash
bin/viber-reader "$VIBER_DB_PATH" "$VIBER_DB_KEY" "$VIBER_PLUGIN_PATH" "__tables__" 50
bin/viber-reader "$VIBER_DB_PATH" "$VIBER_DB_KEY" "$VIBER_PLUGIN_PATH" "__columns__:EventInfo" 50
bin/viber-reader "$VIBER_DB_PATH" "$VIBER_DB_KEY" "$VIBER_PLUGIN_PATH" "__sample__:EventInfo" 50
```

Якщо треба перебілдити вручну:

```bash
cd /Users/exqusic/microsip-ewe/client-info-api
mkdir -p bin
xcrun clang++ -std=c++17 -DQT_NO_VERSION_TAGGING \
  -F/opt/homebrew/Cellar/qtbase/6.11.1/lib \
  -c tools/viber-reader.cpp \
  -o /tmp/viber-reader.o
xcrun clang++ /tmp/viber-reader.o \
  -o bin/viber-reader \
  -F/Applications/Viber.app/Contents/Frameworks \
  -framework QtCore \
  -framework QtSql \
  -rpath /Applications/Viber.app/Contents/Frameworks
```

Якщо версія `qtbase` інша:

```bash
find /opt/homebrew/Cellar/qtbase -maxdepth 3 -type d -name lib
```

## Windows

Windows-версія Viber Desktop офіційно існує, але цей конкретний reader зараз перевірений тільки на macOS. Логіка SQL портована, але шляхи, Qt DLL/plugin path і формула ключа треба перевірити на конкретній Windows-машині.

Очікувані шляхи, з яких треба починати:

```powershell
# База користувача
Get-ChildItem "$env:APPDATA\ViberPC" -Recurse -Filter viber.db

# Qt SQLite plugin від Viber
Get-ChildItem "$env:LOCALAPPDATA","$env:ProgramFiles","${env:ProgramFiles(x86)}" `
  -Recurse -Filter qsqlite.dll -ErrorAction SilentlyContinue

# Qt DLL біля Viber.exe
Get-ChildItem "$env:LOCALAPPDATA","$env:ProgramFiles","${env:ProgramFiles(x86)}" `
  -Recurse -Filter Qt6Sql.dll -ErrorAction SilentlyContinue
```

Типовий `.env` для Windows-сервера має бути таким за змістом:

```dotenv
VIBER_ENABLED=true
VIBER_DB_PATH=C:\Users\<user>\AppData\Roaming\ViberPC\<account-phone>\viber.db
VIBER_READER_BIN=bin\viber-reader.exe
VIBER_PLUGIN_PATH=C:\Path\To\Viber\plugins
VIBER_ACCOUNT_PHONE=<account-phone>
VIBER_DB_KEY=<verified-hex-key>
VIBER_MESSAGE_LIMIT=50
```

Важливо:

- Node server має запускатись під тим самим Windows-користувачем, під яким залогінений Viber Desktop, або мати доступ до його `%APPDATA%\ViberPC`.
- Звичайний Windows service під `LocalSystem` не побачить профіль користувача з Viber.
- `VIBER_DB_KEY` не можна сліпо брати з macOS. Спочатку перевірити, що reader реально відкриває `sqlite_master` і повертає таблиці.
- Якщо Viber оновить Qt/plugin/schema, reader може знадобитись перебілдити.

Порт reader-а на Windows робиться тим самим C++ source, але збірка має бути під Windows Qt runtime:

```powershell
# Схема, не copy-paste guarantee:
# 1. Встановити Qt SDK тієї ж major-версії, що й Viber runtime.
# 2. Зібрати viber-reader.cpp з QtCore/QtSql.
# 3. Запускати так, щоб у PATH були Qt DLL від Viber або сумісного Qt SDK.
# 4. Передати plugin path, де лежить qsqlite.dll.
```

Перший тест після збірки:

```powershell
.\bin\viber-reader.exe `
  "$env:APPDATA\ViberPC\<account-phone>\viber.db" `
  "<verified-hex-key>" `
  "C:\Path\To\Viber\plugins" `
  "__tables__" `
  50
```

Якщо `__tables__` не повертає список таблиць, інтеграцію в DUMA не вмикати.

## Linux / Debian

Viber офіційно дає Linux-збірки для Ubuntu/Fedora/AppImage. Але важлива різниця: це все одно Viber Desktop, тобто GUI-клієнт, який треба активувати через мобільний акаунт. На чистому headless Debian без GUI він сам по собі нормально не залогіниться.

Пошук бази:

```bash
find "$HOME" -path '*ViberPC*' -name viber.db -print
```

Пошук Qt SQLite plugin:

```bash
find /opt /usr "$HOME" -iname 'libqsqlite.so' -path '*viber*' -print 2>/dev/null
```

Якщо використовується AppImage:

```bash
chmod +x Viber*.AppImage
./Viber*.AppImage --appimage-extract
find squashfs-root -iname 'libqsqlite.so' -o -iname 'libQt6Sql.so*'
```

Ймовірний `.env` для Linux:

```dotenv
VIBER_ENABLED=true
VIBER_DB_PATH=/home/<user>/.ViberPC/<account-phone>/viber.db
VIBER_READER_BIN=bin/viber-reader
VIBER_PLUGIN_PATH=/opt/viber/plugins
VIBER_ACCOUNT_PHONE=<account-phone>
VIBER_DB_KEY=<verified-hex-key>
VIBER_MESSAGE_LIMIT=50
```

Але шлях може бути інший, тому спочатку завжди робити `find`.

Збірка reader-а на Debian, якщо встановлені Qt dev packages:

```bash
sudo apt update
sudo apt install -y build-essential qt6-base-dev pkg-config
cd /path/to/client-info-api
mkdir -p bin
g++ -std=c++17 -DQT_NO_VERSION_TAGGING \
  tools/viber-reader.cpp \
  -o bin/viber-reader \
  $(pkg-config --cflags --libs Qt6Core Qt6Sql)
```

Перший тест:

```bash
bin/viber-reader \
  "$VIBER_DB_PATH" \
  "$VIBER_DB_KEY" \
  "$VIBER_PLUGIN_PATH" \
  "__tables__" \
  50
```

Якщо Viber стоїть як AppImage або приносить власні Qt libs, може знадобитись:

```bash
export LD_LIBRARY_PATH="/path/to/viber/libs:$LD_LIBRARY_PATH"
export QT_PLUGIN_PATH="$VIBER_PLUGIN_PATH"
```

Про headless Debian:

- Backend DUMA можна запускати на Debian headless.
- Локальний Viber DB reader потребує вже залогіненого Viber Desktop-профілю і доступу до його файлів.
- Для стабільного production-сервера краще або офіційний Viber Business Messages/Bot API, або окремий desktop/VM collector, де Viber Desktop реально залогінений, а сервер читає вже синхронізовані дані.
- Варіант з Xvfb/desktop-session на Debian можливий як технічний хак, але це крихкий production-процес: після logout, оновлення Viber, зміни QR activation або падіння GUI повідомлення перестануть оновлюватись.

## Перевірка перед увімкненням у DUMA

1. Reader повертає таблиці:

```bash
bin/viber-reader "$VIBER_DB_PATH" "$VIBER_DB_KEY" "$VIBER_PLUGIN_PATH" "__tables__" 50
```

2. Reader повертає повідомлення конкретного клієнта:

```bash
bin/viber-reader "$VIBER_DB_PATH" "$VIBER_DB_KEY" "$VIBER_PLUGIN_PATH" "380981234567" 50
```

3. `.env` заповнений:

```dotenv
VIBER_ENABLED=true
VIBER_DB_PATH=...
VIBER_READER_BIN=...
VIBER_PLUGIN_PATH=...
VIBER_ACCOUNT_PHONE=...
VIBER_DB_KEY=...
```

4. Перезапустити server:

```bash
cd /Users/exqusic/microsip-ewe/client-info-api
rtk npm start
```

5. Відкрити картку клієнта, вкладка `Viber` у блоці переписок має показати повідомлення або чесно показати, що чату для цього номера немає.

## Типові помилки

`viber_database_key_required`

Не заданий `VIBER_DB_KEY`.

`viber_database_open_failed`

Неправильний шлях до `viber.db`, немає прав на читання, або reader не бачить потрібний Qt SQLite plugin.

`viber_database_key_invalid`

Ключ не підходить до цієї бази або використовується не той SQLite driver.

`viber_plugin_path_not_found`

Неправильний `VIBER_PLUGIN_PATH`.

`viber_reader_not_found`

Немає `bin/viber-reader` або шлях `VIBER_READER_BIN` неправильний.

## Важливе обмеження

Це не офіційний API Viber. Це читання локальної бази Viber Desktop. Воно може зламатись після оновлення Viber, зміни схеми бази, зміни Qt plugin або зміни формули ключа. Перед запуском на новій ОС завжди спочатку перевіряти `__tables__`, потім тестовий номер, і тільки потім вмикати в DUMA.
