#!/bin/sh
set -eu
F=.dev/features/write-guard-narrowing/proposed
P="$F/human-only.patch"
FILES=".claude/hooks/enforce-writes-scope.cjs .claude/hooks/protect-trusted-paths.cjs LIMITS.md"
restore() {
  git checkout HEAD -- $FILES
  echo "apply.sh: FAILED ($1) - the three files were restored from HEAD; nothing was committed" >&2
  exit 1
}
[ "$(git branch --show-current)" != "main" ] || { echo "apply.sh: refusing to commit the guard change on main" >&2; exit 1; }
echo "apply.sh: sha256 of the patch about to be applied - compare it with the value you were given:"
shasum -a 256 "$P"
TOUCHED="$(git apply --numstat "$P" | cut -f3 | LC_ALL=C sort | tr '\n' ' ')"
WANTED="$(printf '%s\n' $FILES | LC_ALL=C sort | tr '\n' ' ')"
[ "$TOUCHED" = "$WANTED" ] || { echo "apply.sh: the patch touches [$TOUCHED], not exactly [$WANTED] - refusing, nothing applied" >&2; exit 1; }
node pharn/floor/check-bash-reconcile.mjs --base . --require-baseline
git diff --quiet HEAD -- $FILES || { echo "apply.sh: the three files differ from HEAD already - refusing, nothing applied" >&2; exit 1; }
T="$(mktemp -d)"
trap 'rm -rf "$T"' EXIT
git status --porcelain --ignored --untracked-files=all | LC_ALL=C sort > "$T/before"
git apply --check --include=.claude/hooks/enforce-writes-scope.cjs --include=.claude/hooks/protect-trusted-paths.cjs --include=LIMITS.md "$P"
git apply --include=.claude/hooks/enforce-writes-scope.cjs --include=.claude/hooks/protect-trusted-paths.cjs --include=LIMITS.md "$P" || restore "git apply"
git status --porcelain --ignored --untracked-files=all | LC_ALL=C sort > "$T/after"
CHANGED="$({ LC_ALL=C comm -23 "$T/before" "$T/after"; LC_ALL=C comm -13 "$T/before" "$T/after"; } | cut -c4- | LC_ALL=C sort -u | tr '\n' ' ')"
[ "$CHANGED" = "$WANTED" ] || restore "the working tree changed in [$CHANGED], not exactly [$WANTED]"
for f in $FILES; do [ -f "$f" ] && [ ! -L "$f" ] || restore "$f is not a regular file"; done
shasum -a 256 -c "$F/human-only.sha256" || restore "sha256"
node --test .claude/hooks/protect-trusted-paths.test.cjs .claude/hooks/enforce-writes-scope.test.cjs .claude/hooks/set-writes-scope.test.cjs .claude/hooks/hook-wiring.test.cjs .claude/hooks/writes-scope-release.test.cjs pharn/floor/run-marker.test.mjs pharn/floor/check-bash-reconcile.test.mjs pharn/floor/reconcile-baseline.test.mjs pharn/floor/check-spec.test.mjs pharn/floor/check-ac-tests.test.mjs pharn/floor/stage-verify.test.mjs .dev/floor/command-hygiene.test.mjs || restore "tests"
git commit -q -m "fix(hooks): the write guards judge the path the kernel writes; the out-of-project allowance is this project's and this session's (human-applied)" -- $FILES || restore "git commit"
node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/write-guard-narrowing/PLAN.md
node pharn/floor/reconcile-baseline.mjs --anchor --by write-guard-narrowing-apply
echo "apply.sh: applied, tested and committed - resume at /pharn-dev-verify"
