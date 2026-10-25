#!/bin/bash
# Rebuild the scratch copy wc2 from the worktree's committed HEAD, then replay every scripted step in order.
set -euo pipefail
SP=/private/tmp/claude-501/-Users-pgalarowicz-Projects-pharn-oss--claude-worktrees-suspicious-swirles-f50d57/d50332a1-7bff-47d4-84fd-7d4ee5ac9e88/scratchpad
WT=/Users/pgalarowicz/Projects/pharn-oss/.claude/worktrees/pharn-footprint-move
W=${W:-$SP/wc2}; rm -rf "$W"; mkdir -p "$W"
git -C "$WT" archive HEAD | tar -x -C "$W"
ln -s "$WT/node_modules" "$W/node_modules"
cd "$W"; git init -q; git add -A; git -c user.email=x@x -c user.name=x commit -qm base
node "$SP/rewrite.mjs" "$W" "$SP/rw-list3.txt" --apply --tsv "$SP/rewrite-hits.tsv"
git mv THREAT-MODEL.md pharn/THREAT-MODEL.md; git mv LIMITS.md pharn/LIMITS.md
node "$SP/handfix-seg.cjs" > /dev/null
node "$SP/handfix-mb.cjs"
for s in "$SP"/handfix-[0-9]*.cjs; do [ -e "$s" ] && { echo "== $s"; node "$s"; }; done
git add -A; git diff --cached --name-only --diff-filter=AMR "$(git rev-list --max-parents=0 HEAD)" > "$SP/changed.txt"
npx prettier --write --ignore-unknown $(cat "$SP/changed.txt") > /dev/null
npm run docs:generate > /dev/null
echo REBUILT
