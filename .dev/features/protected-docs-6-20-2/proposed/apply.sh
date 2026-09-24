#!/bin/sh
# HUMAN-RUN. Applies queue item 07's edits to the four trusted docs (pharn/CONSTITUTION.md, pharn/ARCHITECTURE.md,
# THREAT-MODEL.md, LIMITS.md). The agent may not write them (fix #2), so a person runs this, outside the agent loop:
#
#   sh .dev/features/protected-docs-6-20-2/proposed/apply.sh
#
# Read trusted-docs.patch (or edits.txt, the same edits as OLD/NEW blocks) first. The patch was built from main
# f510253 and verified with `npm run check` in a clean clone. It refuses — changing nothing — if the tree has moved.
set -eu
cd "$(git rev-parse --show-toplevel)"
PATCH=.dev/features/protected-docs-6-20-2/proposed/trusted-docs.patch
git apply --check "$PATCH"
git apply "$PATCH"
echo "applied: pharn/CONSTITUTION.md pharn/ARCHITECTURE.md THREAT-MODEL.md LIMITS.md"
echo "pharn/ARCHITECTURE.md is now $(shasum -a 256 pharn/ARCHITECTURE.md | cut -c1-64)"
echo "  (expected 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f)"
echo
echo "next:"
echo "  git add pharn/CONSTITUTION.md pharn/ARCHITECTURE.md THREAT-MODEL.md LIMITS.md"
echo "  git commit -m 'docs(trusted): apply queue item 07 to the four trusted docs (6.20.2)'"
echo "  git push"
echo "then mark the PR ready and merge it once CI is green."
echo
echo "A local 'npm run check' reads your edit as a reconcile ESCAPE while a local baseline exists (the reconciler"
echo "cannot tell who wrote a file). Open a fresh epoch with 'node pharn/floor/reconcile-baseline.mjs --anchor';"
echo "never delete or hand-edit the baseline. CI has no baseline."
