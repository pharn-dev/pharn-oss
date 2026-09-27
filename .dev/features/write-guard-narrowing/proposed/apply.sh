#!/bin/sh
set -eu
F=.dev/features/write-guard-narrowing/proposed
[ "$(git branch --show-current)" != "main" ] || { echo "apply.sh: refusing to commit the guard change on main" >&2; exit 1; }
node pharn/floor/check-bash-reconcile.mjs --base . --require-baseline
git apply --check "$F/human-only.patch"
git apply "$F/human-only.patch"
if ! { shasum -a 256 -c "$F/human-only.sha256" && node --test .claude/hooks/protect-trusted-paths.test.cjs .claude/hooks/enforce-writes-scope.test.cjs .claude/hooks/set-writes-scope.test.cjs .claude/hooks/hook-wiring.test.cjs .claude/hooks/writes-scope-release.test.cjs pharn/floor/run-marker.test.mjs pharn/floor/check-bash-reconcile.test.mjs pharn/floor/reconcile-baseline.test.mjs pharn/floor/check-spec.test.mjs pharn/floor/check-ac-tests.test.mjs pharn/floor/stage-verify.test.mjs .dev/floor/command-hygiene.test.mjs; }; then
  git checkout -- .claude/hooks/protect-trusted-paths.cjs .claude/hooks/enforce-writes-scope.cjs LIMITS.md
  echo "apply.sh: FAILED - the three files were restored from HEAD; nothing was committed" >&2
  exit 1
fi
git commit -q -m "fix(hooks): the write guards judge the path the kernel writes; the out-of-project allowance is this project's and this session's (human-applied)" -- .claude/hooks/protect-trusted-paths.cjs .claude/hooks/enforce-writes-scope.cjs LIMITS.md
node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/write-guard-narrowing/PLAN.md
node pharn/floor/reconcile-baseline.mjs --anchor --by write-guard-narrowing-apply
echo "apply.sh: applied, tested and committed - resume at /pharn-dev-verify"
