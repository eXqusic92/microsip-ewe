#!/usr/bin/env bash
set -euo pipefail

REPOSITORY="${DEPLOY_REPOSITORY:-git@github-client-info:eXqusic92/client-info.git}"
BRANCH="${DEPLOY_BRANCH:-main}"
TARGET="${DEPLOY_PATH:-/root/client-info}"
SERVICE="${DEPLOY_SERVICE:-client-info.service}"

if [[ ! -d "$TARGET/.git" ]]; then
  git clone --branch "$BRANCH" --single-branch "$REPOSITORY" "$TARGET"
else
  git -C "$TARGET" pull --ff-only origin "$BRANCH"
fi

cd "$TARGET"
npm ci --omit=dev
npm run check

sudo install -m 0644 "$TARGET/deploy/client-info.service" "/etc/systemd/system/$SERVICE"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE"
sudo systemctl restart "$SERVICE"
sudo systemctl --no-pager --full status "$SERVICE"
