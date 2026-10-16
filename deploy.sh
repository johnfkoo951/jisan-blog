#!/usr/bin/env bash
# 紙散 blog — build & deploy to jisan.cmdspace.work
# Usage: ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"
node build.mjs
vercel deploy --prod --yes

# Refresh the private Obsidian/Eagle catalog after a successful production deployment.
CATALOG_HOME="${CMDS_SITE_CATALOG_HOME:-$HOME/DEV/cmds-site-catalog}"
if [[ -f "$CATALOG_HOME/after-deploy.sh" ]]; then
  if ! bash "$CATALOG_HOME/after-deploy.sh" "https://jisan.cmdspace.work/"; then
    echo "Deployment succeeded; catalog refresh failed. Retry after-deploy.sh without redeploying." >&2
    exit 2
  fi
else
  echo "Site catalog is not installed on this host; preview refresh was skipped." >&2
fi
curl -s -o /dev/null -w "WebSub ping: %{http_code}\n" https://pubsubhubbub.appspot.com/ -d "hub.mode=publish" -d "hub.url=https://jisan.cmdspace.work/feed.xml" || true
echo "→ https://jisan.cmdspace.work"
