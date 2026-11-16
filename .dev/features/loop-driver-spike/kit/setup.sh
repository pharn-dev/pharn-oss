#!/usr/bin/env bash
# setup.sh — build the CORE-113 spike's measure base. Dev apparatus; run by the maintainer from a terminal.
#
#   bash setup.sh <root> <pharn-app checkout> <pharn-oss checkout at 7.19.0>
#
# Creates <root>/base-repo: a no-hardlinks clone of the project, detached at the lg3-remove-files benchmark base,
# with its `origin` remote removed (no run can push), PHARN updated to the latest release, `pharn-stage.md` copied
# from the pharn-oss checkout, and `gates.timeoutMs: 1800000` declared — all in ONE local commit on a branch named
# `measure-base`. Also writes <root>/intent.md, the shared increment description, extracted from the project's own
# lg3-remove-files SPEC (its `## Intent` and `## Scope` sections; the project's text, kept out of pharn-oss).
# The project checkout is only read. Nothing here starts a model session.
set -euo pipefail

ROOT="$1"
APP="$2"
OSS="$3"
BASE_SHA=7e48564d71c510b223a2d56459e938c3d45f66d9

if [ -e "$ROOT/base-repo" ]; then
  echo "setup: $ROOT/base-repo already exists — remove it or choose another root" >&2
  exit 2
fi
mkdir -p "$ROOT"

node -e '
const fs = require("fs");
const text = fs.readFileSync(process.argv[1], "utf8");
const a = text.indexOf("\n## Intent");
const b = text.indexOf("\n## Acceptance Criteria");
if (a < 0 || b < a) { console.error("setup: the SPEC has no ## Intent … ## Acceptance Criteria span"); process.exit(2); }
fs.writeFileSync(process.argv[2], text.slice(a + 1, b).trimEnd() + "\n");
' "$APP/pharn/features/lg3-remove-files/SPEC.md" "$ROOT/intent.md"
shasum -a 256 "$ROOT/intent.md"

git clone --no-hardlinks --no-checkout "$APP" "$ROOT/base-repo"
cd "$ROOT/base-repo"
git remote remove origin
git checkout -q -b measure-base "$BASE_SHA"

npx --yes @pharn-dev/pharn@latest update --yes

mkdir -p .claude/agents
cp "$OSS/.claude/agents/pharn-stage.md" .claude/agents/pharn-stage.md
shasum -a 256 .claude/agents/pharn-stage.md

node -e '
const fs = require("fs");
const c = JSON.parse(fs.readFileSync("pharn.config.json", "utf8"));
c.gates = { ...(c.gates || {}), timeoutMs: 1800000 };
fs.writeFileSync("pharn.config.json", JSON.stringify(c, null, 2) + "\n");
console.log("skillsVersion:", c.skillsVersion, "gates:", JSON.stringify(c.gates));
'

git add -A
git add -f .claude/agents/pharn-stage.md
git -c user.name=loop-driver-spike -c user.email=spike@localhost commit -q -m "measure base: PHARN update, gates.timeoutMs 1800000, pharn-stage.md (CORE-113 spike)"
git rev-parse HEAD | tee "$ROOT/measure-base.sha"
git status --short | head -20
npx --yes @pharn-dev/pharn@latest status || true
echo "setup: done — next, run preflight.sh"
