#!/bin/sh
# apply.sh — the HUMAN-run apply step for .dev/features/ship-quick-mode: LIMITS.md §3a and pharn/ARCHITECTURE.md
# §6 (and §4 when stage-exit.md is present). Read proposed/human-only.patch first. Run from the repo root, on the
# phase branch, at GATE 2 after the last /pharn-dev-verify:  sh .dev/features/ship-quick-mode/proposed/apply.sh
set -eu
F=.dev/features/ship-quick-mode/proposed
EXPECT_STAGE_EXIT=absent # written by the build from make-patch.mjs's "stage-exit:" line
[ "$(git branch --show-current)" != "main" ] || { echo "apply.sh: refusing to commit a trusted-doc change on main" >&2; exit 1; }
if [ -f pharn/pharn-contracts/stage-exit.md ]; then HAVE=present; else HAVE=absent; fi
[ "$HAVE" = "$EXPECT_STAGE_EXIT" ] || { echo "apply.sh: stage-exit.md is $HAVE, the patch expects $EXPECT_STAGE_EXIT - regenerate: node .dev/features/ship-quick-mode/handoff/make-patch.mjs" >&2; exit 1; }
git apply --check "$F/human-only.patch"
git apply "$F/human-only.patch"
if ! { shasum -a 256 -c "$F/human-only.sha256" && node pharn/floor/validate.mjs . && node .dev/floor/check-specified-markers.mjs . && node --test .dev/floor/hash-doc.test.mjs; }; then
  git checkout -- LIMITS.md pharn/ARCHITECTURE.md
  echo "apply.sh: FAILED - both files were restored from the index (git checkout --), which is HEAD unless you staged edits to them; nothing was committed" >&2
  exit 1
fi
git commit -q -m "docs(trusted): quick mode in LIMITS.md and ARCHITECTURE.md (human-applied)" -- LIMITS.md pharn/ARCHITECTURE.md
echo "apply.sh: applied, checked and committed. The ARCHITECTURE pin moved; a plan built after this pins the new hash."
