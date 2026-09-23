#!/bin/sh
# apply.sh — the HUMAN-run apply step for .dev/features/spec-template-override.
#
# Read proposed/human-only.patch before running this. It adds `pharn.spec-template.md` (the project's own SPEC
# template) to DEFAULT_PROTECTED in .claude/hooks/protect-trusted-paths.cjs, plus comments. That hook protects
# itself, so an agent may not apply it.
# Run from the repo root, on the feature branch:  sh .dev/features/spec-template-override/proposed/apply.sh
#
# Order is load-bearing (see PLAN.md "Chain sequencing"): reconcile checkpoint on the build epoch -> apply ->
# sha256 + EVERY hook suite + the reconcile and check-spec suites on the APPLIED bytes (restore from HEAD on any
# failure) -> path-scoped commit of the hook alone -> re-set the scope from the plan -> re-anchor. The re-anchor
# resets the reconciliation epoch, so /pharn-dev-verify's reconcile gate judges only apply -> verify; the build
# epoch is judged once, by the checkpoint on the first line below, which must be CLEAN.
set -eu
F=.dev/features/spec-template-override/proposed
H=.claude/hooks/protect-trusted-paths.cjs
[ "$(git branch --show-current)" != "main" ] || { echo "apply.sh: refusing to commit the guard change on main" >&2; exit 1; }
node pharn/floor/check-bash-reconcile.mjs --base . --require-baseline
git apply --check "$F/human-only.patch"
git apply "$F/human-only.patch"
if ! { shasum -a 256 -c "$F/human-only.sha256" && node --test .claude/hooks/*.test.cjs pharn/floor/check-bash-reconcile.test.mjs pharn/floor/check-spec.test.mjs; }; then
  git checkout -- "$H"
  echo "apply.sh: FAILED - the hook was restored from HEAD; nothing was committed" >&2
  exit 1
fi
git commit -q -m "feat(hooks): protect the project's own SPEC template, pharn.spec-template.md (human-applied)" -- "$H"
node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/spec-template-override/PLAN.md
node pharn/floor/reconcile-baseline.mjs --anchor --by spec-template-override-apply
echo "apply.sh: applied, tested and committed - resume at /pharn-dev-regress"
