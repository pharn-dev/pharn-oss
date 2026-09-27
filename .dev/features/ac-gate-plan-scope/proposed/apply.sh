#!/bin/sh
set -eu
F=.dev/features/ac-gate-plan-scope/proposed
[ "$(git branch --show-current)" != "main" ] || { echo "apply.sh: refusing to commit the LIMITS.md change on main" >&2; exit 1; }
node pharn/floor/check-bash-reconcile.mjs --base . --require-baseline
git apply --check "$F/human-only.patch"
git apply "$F/human-only.patch"
if ! { shasum -a 256 -c "$F/human-only.sha256" && node .dev/floor/check-specified-markers.mjs .; }; then
  git checkout -- LIMITS.md
  echo "apply.sh: FAILED - LIMITS.md was restored from HEAD; nothing was committed" >&2
  exit 1
fi
git commit -q -m "docs(limits): §9 states the in-process bound and narrows the pin's chaining and npm-config gaps (human-applied)" -- LIMITS.md
node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/ac-gate-plan-scope/PLAN.md
node pharn/floor/reconcile-baseline.mjs --anchor --by ac-gate-plan-scope-apply
echo "apply.sh: applied, checked and committed LIMITS.md - re-run npm run check, then /pharn-dev-verify if the increment is still open"
