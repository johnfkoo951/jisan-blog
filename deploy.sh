#!/usr/bin/env bash
# 紙散 blog — build & deploy to jisan.cmdspace.work
# Usage: ./deploy.sh
set -euo pipefail
cd "$(dirname "$0")"
node build.mjs
vercel deploy --prod --yes
echo "→ https://jisan.cmdspace.work"
