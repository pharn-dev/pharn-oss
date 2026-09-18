#!/bin/sh
# apply.sh — the HUMAN-run apply step for .dev/features/hook-cwd-anchoring.
#
# Read proposed/human-only.patch before running this. It changes the two write-guard hooks, the settings
# file that wires them, and LIMITS.md — all four are hook-protected, so an agent may not apply them.
# Run from the repo root, on the feature branch:  sh .dev/features/hook-cwd-anchoring/proposed/apply.sh
#
# Order is load-bearing (see PLAN.md "Chain sequencing"): reconcile checkpoint -> apply -> sums + hook
# suites on the APPLIED bytes (restore from HEAD on any failure) -> path-scoped commit -> setter -> anchor.
set -eu
F=.dev/features/hook-cwd-anchoring/proposed
[ "$(git branch --show-current)" != "main" ] || { echo "apply.sh: refusing to commit the guard change on main" >&2; exit 1; }
node pharn/floor/check-bash-reconcile.mjs --base . --require-baseline
git apply --check "$F/human-only.patch"
git apply "$F/human-only.patch"
if ! { shasum -a 256 -c "$F/human-only.sha256" && node --test .claude/hooks/enforce-writes-scope.test.cjs .claude/hooks/protect-trusted-paths.test.cjs .claude/hooks/hook-wiring.test.cjs; }; then
  git checkout -- .claude/settings.json .claude/hooks/enforce-writes-scope.cjs .claude/hooks/protect-trusted-paths.cjs LIMITS.md
  echo "apply.sh: FAILED - the four files were restored from HEAD; nothing was committed" >&2
  exit 1
fi
git commit -q -m "fix(hooks): anchor the write guards on CLAUDE_PROJECT_DIR and Claude's work tree (human-applied)" -- .claude/settings.json .claude/hooks/enforce-writes-scope.cjs .claude/hooks/protect-trusted-paths.cjs LIMITS.md
node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/hook-cwd-anchoring/PLAN.md
node pharn/floor/reconcile-baseline.mjs --anchor --by hook-cwd-anchoring-apply
echo "apply.sh: applied, tested and committed - resume at /pharn-dev-verify"
