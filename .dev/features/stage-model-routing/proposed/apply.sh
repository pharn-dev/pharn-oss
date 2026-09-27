#!/bin/sh
# apply.sh — the HUMAN-run apply step for .dev/features/stage-model-routing: LIMITS.md §8, and nothing else.
# Read proposed/human-only.patch first. Run from the repo root, on the phase branch, at GATE 2 after the last
# /pharn-dev-verify:
#   sh .dev/features/stage-model-routing/proposed/apply.sh
# It refuses to START while LIMITS.md has any unstaged or staged change (GATE-2 review A10): its failure path
# restores LIMITS.md with `git checkout --`, and that must only ever undo this patch, never a person's edits.
set -eu
F=.dev/features/stage-model-routing/proposed
[ "$(git branch --show-current)" != "main" ] || { echo "apply.sh: refusing to commit a trusted-doc change on main" >&2; exit 1; }
{ git diff --quiet -- LIMITS.md && git diff --cached --quiet -- LIMITS.md; } || { echo "apply.sh: refusing to start - LIMITS.md has unstaged or staged changes; commit or discard them first. Nothing was touched." >&2; exit 1; }
git apply --check "$F/human-only.patch"
git apply "$F/human-only.patch"
if ! { shasum -a 256 -c "$F/human-only.sha256" && node pharn/floor/validate.mjs . && node .dev/floor/check-specified-markers.mjs .; }; then
  git checkout -- LIMITS.md
  echo "apply.sh: FAILED - LIMITS.md was restored to HEAD (it had no unstaged or staged change when this run started, so only the patch was undone); nothing was committed" >&2
  exit 1
fi
git commit -q -m "docs(trusted): LIMITS.md section 8 for stage-model routing (human-applied)" -- LIMITS.md
echo "apply.sh: applied, checked and committed. The ARCHITECTURE pin does not move: this patch never touches pharn/ARCHITECTURE.md."
