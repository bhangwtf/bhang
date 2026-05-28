#!/bin/bash
# Tracker snapshot: refresh trace → export DB → commit → push to GitHub Pages.
# Runs every 2 hours via Windows Task Scheduler (task: Bhangtrackersnapshot).
#
# Behaviour:
#   - All stdout+stderr are mirrored to logs/daily-snapshot.log so silent
#     failures (mempool stalls, stale lock, dead network) are diagnosable.
#     The previous run is preserved as daily-snapshot.prev.log.
#   - exit 0 on expected skips (no internet, no data change).
#   - exit 1 on real failures (refresh failed, export failed, push failed).
#     Task Scheduler "Last Result" then accurately reflects pipeline health.
#   - git push is bounded: 2 attempts with a 30s per-attempt timeout, 10s
#     between attempts. A persistent failure leaves the commit local; the
#     next run pushes both commits at once.

TRACKER_DIR="/c/Users/akhil/Main/Test Track"
SITE_DIR="/c/Users/akhil/Main/bhang.wtf"
LOG_DIR="$TRACKER_DIR/logs"
LOG="$LOG_DIR/daily-snapshot.log"
PREV_LOG="$LOG_DIR/daily-snapshot.prev.log"

mkdir -p "$LOG_DIR"
[ -f "$LOG" ] && mv -f "$LOG" "$PREV_LOG"

# Mirror every byte of subsequent output (stdout+stderr) to the log.
exec > >(tee -a "$LOG") 2>&1

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Ensure Node is on PATH for Task Scheduler runs (it does not inherit the
# interactive shell PATH).
export PATH="/c/Program Files/nodejs:$PATH"

log "=== snapshot run start (pid $$) ==="

if ! curl -s --max-time 5 https://github.com > /dev/null; then
  log "SKIP: github.com unreachable (no internet or DNS issue). exit 0."
  exit 0
fi

cd "$TRACKER_DIR" || { log "FAIL: tracker dir not found ($TRACKER_DIR). exit 1."; exit 1; }

log "step 1/3: refresh — re-check live UTXOs for movements"
if ! npx tsx scripts/index-sats.ts refresh; then
  log "FAIL: refresh exited non-zero. tracer state untouched (refresh is atomic). exit 1."
  exit 1
fi

log "step 2/3: export — write tracker-data.json"
if ! npx tsx scripts/export-snapshot.ts; then
  log "FAIL: export exited non-zero. DB intact; previous snapshot still on disk. exit 1."
  exit 1
fi

cd "$SITE_DIR" || { log "FAIL: site dir not found ($SITE_DIR). exit 1."; exit 1; }

if git diff --quiet tracker-data.json 2>/dev/null; then
  log "SKIP: tracker-data.json unchanged since last push. exit 0."
  exit 0
fi

git add tracker-data.json
git commit -m "tracker snapshot $(date +%Y-%m-%dT%H:%M)"

log "step 3/3: push — uploading to github.com/bhangwtf/bhang"
for attempt in 1 2; do
  if timeout 30 git push origin main; then
    log "OK: snapshot pushed on attempt $attempt. exit 0."
    exit 0
  fi
  log "WARN: push attempt $attempt failed (timeout or transient git error)."
  [ "$attempt" -lt 2 ] && { log "retrying in 10s..."; sleep 10; }
done

log "FAIL: push failed after 2 attempts. Commit is local on bhang.wtf/main; next run will push two commits. Tracing data is safe. exit 1."
exit 1
