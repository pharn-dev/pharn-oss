#!/usr/bin/env bash
# run-driver.sh — one DRIVEN quick loop for the CORE-113 spike, in its own directory. Dev apparatus; run by the
# maintainer from a terminal (never from inside a Claude Code session: the driver starts `claude -p` sessions).
#
#   bash run-driver.sh <root> <run-id> <answer-word>
#
# Clones <root>/base-repo (branch measure-base) into <root>/runs/<run-id>/tree, removes its remote, runs `npm ci`,
# then the driver with --out <root>/runs/<run-id>/out. <answer-word> ([a-z0-9-], up to 32) is the question probe's
# answer, typed before the question is seen. `--accept-host-execution` is passed on purpose: the run executes the
# project's tests on this host, where the isolation check finds credentials.
set -euo pipefail

ROOT="$1"
RUN="$2"
ANSWER="$3"
KIT="$(cd "$(dirname "$0")" && pwd)"
DIR="$ROOT/runs/$RUN"

if [ -e "$DIR" ]; then
  echo "run-driver: $DIR already exists — choose a new run id" >&2
  exit 2
fi
mkdir -p "$DIR"
git clone -q --no-hardlinks -b measure-base "$ROOT/base-repo" "$DIR/tree"
git -C "$DIR/tree" remote remove origin
(cd "$DIR/tree" && npm ci > "$DIR/npm-ci.log" 2>&1)

cd "$DIR/tree"
date -u +%FT%TZ > "$DIR/started.txt"
node "$KIT/../driver/loop-driver.mjs" \
  --project "$DIR/tree" \
  --out "$DIR/out" \
  --slug lg3-remove-files \
  --intent "$ROOT/intent.md" \
  --cap 3 \
  --accept-host-execution \
  --answer "$ANSWER" 2>&1 | tee "$DIR/driver-progress.txt"
date -u +%FT%TZ > "$DIR/ended.txt"
echo "run-driver: outputs in $DIR/out; the feature's files in $DIR/tree/pharn/features/"
