#!/bin/bash
# Tracker snapshot: export tracker DB → commit → push to GitHub Pages
# Runs every 6 hours. Skips silently if laptop is off.

TRACKER_DIR="/c/Users/akhil/Main/Test Track"
SITE_DIR="/c/Users/akhil/Main/wtf/projects/bhang.wtf"

cd "$TRACKER_DIR" || exit 0

# Export snapshot
npx tsx scripts/export-snapshot.ts 2>/dev/null || exit 0

# Copy to root for GitHub Pages
cd "$SITE_DIR" || exit 0
cp public/tracker-data.json tracker-data.json

# Check if data actually changed
if git diff --quiet tracker-data.json public/tracker-data.json 2>/dev/null; then
  echo "No changes, skipping push."
  exit 0
fi

# Commit and push
git add tracker-data.json public/tracker-data.json
git commit -m "tracker snapshot $(date +%Y-%m-%dT%H:%M)"
git push origin main

echo "Snapshot pushed at $(date)"
