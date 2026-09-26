#!/bin/sh
# apply.sh — the HUMAN-run apply step for .dev/features/loop-quick-mode: LIMITS.md §3a and §6.
# Read proposed/human-only.patch first. Run from the repo root, on the phase branch, at GATE 2 after the last
# /pharn-dev-verify:
#   sh .dev/features/loop-quick-mode/proposed/apply.sh
set -eu
F=.dev/features/loop-quick-mode/proposed
[ "$(git branch --show-current)" != "main" ] || { echo "apply.sh: refusing to commit a trusted-doc change on main" >&2; exit 1; }
git apply --check "$F/human-only.patch"
git apply "$F/human-only.patch"
if ! { shasum -a 256 -c "$F/human-only.sha256" && node pharn/floor/validate.mjs . && node .dev/floor/check-specified-markers.mjs .; }; then
  git checkout -- LIMITS.md
  echo "apply.sh: FAILED - LIMITS.md was restored from the index (git checkout --), which is HEAD unless you staged edits to it; nothing was committed" >&2
  exit 1
fi
git commit -q -m "docs(trusted): /pharn-loop --quick in LIMITS.md (human-applied)" -- LIMITS.md
echo "apply.sh: applied, checked and committed. pharn/ARCHITECTURE.md is untouched, so the spec pin does not move."
