#!/bin/sh
set -eu
F=.dev/features/writes-scope-run-only/proposed
[ "$(git branch --show-current)" != "main" ] || { echo "apply.sh: refusing to commit the guard change on main" >&2; exit 1; }
node pharn/floor/check-bash-reconcile.mjs --base . --require-baseline
git apply --check "$F/human-only.patch"
git apply "$F/human-only.patch"
if ! { shasum -a 256 -c "$F/human-only.sha256" && node --test .claude/hooks/enforce-writes-scope.test.cjs .claude/hooks/set-writes-scope.test.cjs .claude/hooks/protect-trusted-paths.test.cjs .claude/hooks/hook-wiring.test.cjs .claude/hooks/writes-scope-release.test.cjs pharn/floor/run-marker.test.mjs pharn/floor/check-bash-reconcile.test.mjs pharn/floor/reconcile-baseline.test.mjs; }; then
  git checkout -- .claude/hooks/enforce-writes-scope.cjs .claude/hooks/set-writes-scope.cjs LIMITS.md
  echo "apply.sh: FAILED - the three files were restored from HEAD; nothing was committed" >&2
  exit 1
fi
git commit -q -m "feat(hooks): the write guard is fail-closed only while PHARN is working (human-applied)" -- .claude/hooks/enforce-writes-scope.cjs .claude/hooks/set-writes-scope.cjs LIMITS.md
node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/writes-scope-run-only/PLAN.md
node pharn/floor/reconcile-baseline.mjs --anchor --by writes-scope-run-only-apply
echo "apply.sh: applied, tested and committed - resume at /pharn-dev-verify"
