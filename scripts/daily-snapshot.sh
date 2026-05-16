#!/bin/bash
# Tracker snapshot: export tracker DB → commit → push to GitHub Pages
# Runs every 2 hours. Skips silently if laptop is off or no internet.

TRACKER_DIR="/c/Users/akhil/Main/Test Track"
SITE_DIR="/c/Users/akhil/Main/bhang.wtf"

# Ensure Node/npm is in PATH for Task Scheduler
export PATH="/c/Program Files/nodejs:$PATH"

# Check internet connectivity
curl -s --max-time 5 https://github.com > /dev/null 2>&1 || { echo "No internet, skipping."; exit 0; }

cd "$TRACKER_DIR" || exit 0

# Refresh UTXOs for movements, then export snapshot
npx tsx scripts/index-sats.ts refresh 2>/dev/null || { echo "Refresh failed, skipping."; exit 0; }
npx tsx scripts/export-snapshot.ts 2>/dev/null || { echo "Export failed, skipping."; exit 0; }

cd "$SITE_DIR" || exit 0

# Check if data actually changed
if git diff --quiet tracker-data.json 2>/dev/null; then
  echo "No changes, skipping push."
  exit 0
fi

# Commit and push
git add tracker-data.json
git commit -m "tracker snapshot $(date +%Y-%m-%dT%H:%M)"
git push origin main

echo "Snapshot pushed at $(date)"
