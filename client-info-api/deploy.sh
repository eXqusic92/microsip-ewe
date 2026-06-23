#!/usr/bin/env bash
set -euo pipefail

REPOSITORY="${DEPLOY_REPOSITORY:-https://github.com/eXqusic92/microsip-ewe.git}"
BRANCH="${DEPLOY_BRANCH:-main}"
TARGET="${DEPLOY_PATH:-/home/ewetech/ewe_crm}"
SERVICE="${DEPLOY_SERVICE:-ewe-crm.service}"
APP="$TARGET/client-info-api"

if [[ ! -d "$TARGET/.git" ]]; then
  git clone --branch "$BRANCH" --single-branch "$REPOSITORY" "$TARGET"
else
  git -C "$TARGET" pull --ff-only origin "$BRANCH"
fi

cd "$APP"
npm ci --omit=dev

sudo install -m 0644 "$APP/deploy/ewe-crm.service" "/etc/systemd/system/$SERVICE"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE"
sudo systemctl restart "$SERVICE"
sudo systemctl --no-pager --full status "$SERVICE"
