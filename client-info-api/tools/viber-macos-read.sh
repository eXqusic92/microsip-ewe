#!/usr/bin/env bash
set -euo pipefail

# Viber Desktop local DB reader for macOS.
#
# Viber's viber.db is SQLite SEE-encrypted. Plain sqlite3/sqlcipher will not open it.
# This script builds/runs tools/viber-reader.cpp, which loads Viber Desktop's own
# Qt QSQLITE plugin and unlocks the DB with PRAGMA hexkey.
#
# Usage:
#   ./tools/viber-macos-read.sh 380981234567
#
# Useful overrides:
#   DUMA_CLIENT_INFO_ROOT=/path/to/client-info-api
#   VIBER_DB_PATH="/Users/me/Library/Application Support/ViberPC/380.../viber.db"
#   VIBER_DB_KEY="<hex SEE key>"
#   VIBER_PLUGIN_PATH="/Applications/Viber.app/Contents/PlugIns"
#   VIBER_MESSAGE_LIMIT=50
#   QT_HEADERS="/opt/homebrew/Cellar/qtbase/6.11.1/lib"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ -n "${DUMA_CLIENT_INFO_ROOT:-}" ]]; then
  ROOT="$DUMA_CLIENT_INFO_ROOT"
elif [[ -f "$SCRIPT_DIR/viber-reader.cpp" ]]; then
  ROOT="$SCRIPT_DIR"
elif [[ -f "$SCRIPT_DIR/../tools/viber-reader.cpp" ]]; then
  ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
elif [[ -f "/Users/exqusic/microsip-ewe/client-info-api/tools/viber-reader.cpp" ]]; then
  ROOT="/Users/exqusic/microsip-ewe/client-info-api"
else
  echo "Cannot find viber-reader.cpp. Set DUMA_CLIENT_INFO_ROOT=/path/to/client-info-api" >&2
  exit 2
fi

READER_SRC="${VIBER_READER_SRC:-$ROOT/tools/viber-reader.cpp}"
if [[ ! -f "$READER_SRC" && -f "$ROOT/viber-reader.cpp" ]]; then
  READER_SRC="$ROOT/viber-reader.cpp"
fi

READER_BIN="${VIBER_READER_BIN:-$ROOT/bin/viber-reader}"
VIBER_APP="${VIBER_APP:-/Applications/Viber.app}"
PLUGIN_PATH="${VIBER_PLUGIN_PATH:-$VIBER_APP/Contents/PlugIns}"
FRAMEWORK_PATH="${VIBER_FRAMEWORK_PATH:-$VIBER_APP/Contents/Frameworks}"
ACCOUNT_PHONE="${VIBER_ACCOUNT_PHONE:-}"
DB_PATH="${VIBER_DB_PATH:-}"
PHONE="${1:-${VIBER_TARGET_PHONE:-}}"
LIMIT="${VIBER_MESSAGE_LIMIT:-50}"

if [[ -z "$PHONE" ]]; then
  echo "Usage: $0 <target-phone-digits>" >&2
  exit 2
fi

if [[ -z "$ACCOUNT_PHONE" && -d "$HOME/Library/Application Support/ViberPC" ]]; then
  while IFS= read -r candidate; do
    account_dir="$(basename "$(dirname "$candidate")")"
    if [[ "$account_dir" =~ ^[0-9]{8,15}$ ]]; then
      ACCOUNT_PHONE="$account_dir"
      break
    fi
  done < <(find "$HOME/Library/Application Support/ViberPC" -maxdepth 2 -name viber.db -print)
fi

if [[ -z "$DB_PATH" && -n "$ACCOUNT_PHONE" ]]; then
  DB_PATH="$HOME/Library/Application Support/ViberPC/$ACCOUNT_PHONE/viber.db"
fi

if [[ -z "$DB_PATH" || ! -f "$DB_PATH" ]]; then
  echo "Viber DB not found. Set VIBER_DB_PATH=/path/to/ViberPC/<phone>/viber.db" >&2
  exit 2
fi

if [[ ! -d "$PLUGIN_PATH" ]]; then
  echo "Viber Qt plugin path not found: $PLUGIN_PATH" >&2
  exit 2
fi

VIBER_DB_KEY="${VIBER_DB_KEY:-}"
if [[ -z "$VIBER_DB_KEY" ]]; then
  key_user="${VIBER_KEY_USER:-$(id -un)}"
  reversed_user="$(printf "%s" "$key_user" | rev)"
  VIBER_DB_KEY="$(printf "aes128:%s" "$reversed_user" | xxd -p -c 256)"
fi

if [[ ! -x "$READER_BIN" ]]; then
  if [[ ! -f "$READER_SRC" ]]; then
    echo "Reader source not found: $READER_SRC" >&2
    exit 2
  fi
  if [[ ! -d "$FRAMEWORK_PATH" ]]; then
    echo "Viber Qt framework path not found: $FRAMEWORK_PATH" >&2
    exit 2
  fi

  if [[ -z "${QT_HEADERS:-}" ]]; then
    QT_HEADERS="$(find /opt/homebrew/Cellar/qtbase -maxdepth 3 -type d -name lib 2>/dev/null | sort -V | tail -n 1 || true)"
  fi
  if [[ -z "$QT_HEADERS" || ! -d "$QT_HEADERS" ]]; then
    echo "Qt headers/framework metadata not found. Install qtbase or set QT_HEADERS." >&2
    echo "Example: QT_HEADERS=/opt/homebrew/Cellar/qtbase/6.11.1/lib" >&2
    exit 2
  fi

  mkdir -p "$(dirname "$READER_BIN")"
  tmp_obj="${TMPDIR:-/tmp}/viber-reader.o"
  xcrun clang++ -std=c++17 -DQT_NO_VERSION_TAGGING -F"$QT_HEADERS" -c "$READER_SRC" -o "$tmp_obj"
  xcrun clang++ "$tmp_obj" -o "$READER_BIN" \
    -F"$FRAMEWORK_PATH" \
    -framework QtCore \
    -framework QtSql \
    -rpath "$FRAMEWORK_PATH"
fi

exec "$READER_BIN" "$DB_PATH" "$VIBER_DB_KEY" "$PLUGIN_PATH" "$PHONE" "$LIMIT"
