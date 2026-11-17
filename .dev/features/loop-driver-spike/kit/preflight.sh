#!/usr/bin/env bash
# preflight.sh — one timed run of the project's gates on the CORE-113 measure base, BEFORE any model run.
# Dev apparatus; run by the maintainer from a terminal, after setup.sh.
#
#   bash preflight.sh <root>
#
# Runs `npm ci`, then each gate the benchmark's earlier run discovered (lint, format:check, typecheck, test) once, in
# <root>/base-repo, and prints each one's exit and minutes. If `test` is red or slow here, both spike runs would stop
# at the entry check (S14 / S14b), so stop and report instead of starting them. Writes <root>/preflight.txt.
set -uo pipefail

ROOT="$1"
cd "$ROOT/base-repo" || exit 2
OUT="$ROOT/preflight.txt"
: > "$OUT"

npm ci > "$ROOT/preflight-npm-ci.log" 2>&1
echo "npm ci exit=$?" | tee -a "$OUT"

overall=0
for gate in lint format:check typecheck test; do
  start=$(date +%s)
  npm run "$gate" > "$ROOT/preflight-$gate.log" 2>&1
  status=$?
  end=$(date +%s)
  printf '%-14s exit=%s minutes=%s\n' "$gate" "$status" "$(awk "BEGIN { printf \"%.1f\", ($end - $start) / 60 }")" | tee -a "$OUT"
  if [ "$status" -ne 0 ]; then overall=1; fi
done
git status --short | head -20 | tee -a "$OUT"
echo "preflight: overall exit=$overall (logs in $ROOT/preflight-*.log)" | tee -a "$OUT"
exit "$overall"
