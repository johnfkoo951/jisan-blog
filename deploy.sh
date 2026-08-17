#!/usr/bin/env bash
# 紙散 blog — build & deploy to jisan.cmdspace.work
# Usage: ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"
node build.mjs
vercel deploy --prod --yes
curl -s -o /dev/null -w "WebSub ping: %{http_code}\n" https://pubsubhubbub.appspot.com/ -d "hub.mode=publish" -d "hub.url=https://jisan.cmdspace.work/feed.xml" || true
echo "→ https://jisan.cmdspace.work"
