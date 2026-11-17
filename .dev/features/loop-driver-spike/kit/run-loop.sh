#!/usr/bin/env bash
# run-loop.sh — the CORE-113 comparison: the same feature through `/pharn-loop --quick`, in one headless session, in
# its own directory. Dev apparatus; run by the maintainer from a terminal, AFTER the driven run has finished.
#
#   bash run-loop.sh <root> <run-id>
#
# Clones <root>/base-repo (branch measure-base) into <root>/runs/<run-id>/tree, removes its remote, runs `npm ci`,
# then one `claude -p` session in auto mode, with the session id fixed so the transcript can be found. Its stream goes
# to <root>/runs/<run-id>/out/loop.jsonl; the run's own ledger lands at <tree>/pharn/features/<name>/cost.json.
set -euo pipefail

ROOT="$1"
RUN="$2"
DIR="$ROOT/runs/$RUN"

if [ -e "$DIR" ]; then
  echo "run-loop: $DIR already exists — choose a new run id" >&2
  exit 2
fi
mkdir -p "$DIR/out"
git clone -q --no-hardlinks -b measure-base "$ROOT/base-repo" "$DIR/tree"
git -C "$DIR/tree" remote remove origin
(cd "$DIR/tree" && npm ci > "$DIR/npm-ci.log" 2>&1)

SID="$(node -e 'console.log(require("crypto").randomUUID())')"
echo "$SID" > "$DIR/out/session-id.txt"
cd "$DIR/tree"
start=$(date +%s)
date -u +%FT%TZ > "$DIR/started.txt"
status=0
claude -p --permission-mode auto --session-id "$SID" --output-format stream-json --verbose \
  "/pharn-loop --quick --accept-host-execution $(cat "$ROOT/intent.md")" \
  > "$DIR/out/loop.jsonl" 2> "$DIR/out/loop.err" || status=$?
date -u +%FT%TZ > "$DIR/ended.txt"
echo "exit=$status seconds=$(($(date +%s) - start))" | tee "$DIR/out/loop-exit.txt"
ls "$DIR/tree/pharn/features/"
echo "run-loop: stream in $DIR/out/loop.jsonl; the feature's files (cost.json, LOOP.md) in $DIR/tree/pharn/features/<name>/"
