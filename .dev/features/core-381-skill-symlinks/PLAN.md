# PLAN — core-381-skill-symlinks

- spec_content_hash: 8566b4432ed6cc7035de5d925dafe3755086e23b12acacde0dcdda07a43a9167
- applied_lessons: [L19, L57, L70]
- increment: Replace the seven committed `.claude/skills/*` git symlinks (mode 120000, dangling in every clone) with real
  copies of the skills `skills-lock.json` pins, mark their lock entries `installMode: copy`, and bump `SKILLS_VERSION` to
  7.25.6 so `release.yml` tags a release whose archive pharn-cli can install (CORE-381).
- layer(s): none of `pharn/ARCHITECTURE.md §4`'s capability layers — repo apparatus (`.claude/skills/`, lint configs) and
  repo-meta (`SKILLS_VERSION`, `README.md` badge, `pharn-install.json`, `CHANGELOG.md`)
- constitution_refs: [P0, P2, P6, P7]

## The failure (P7 — real, measured)

`git ls-files -s | awk '$1=="120000"'` on `origin/main` (1755d6b8) lists seven entries: `.claude/skills/security-audit`
(#491, first released in v7.25.3) and `.claude/skills/pharn-ci-{cover,explain,fix,install,policy}` and
`.claude/skills/pharn-cli` (#495, first released in v7.25.4). Each points into the gitignored `.agents/skills/`, so it
dangles in every clone. pharn-cli's `src/lib/tar-extract.ts` admits only regular files and directories anywhere in the
codeload archive, so `pharn init` / `pharn update` refuse v7.25.3, v7.25.4 and v7.25.5 whole (measured on the tags:
v7.25.2 0 links, v7.25.3 1, v7.25.4 7, v7.25.5 7). `skills-lock.json` tracks all seven, but unlike the five `phargus-*`
entries they lack `"installMode": "copy"`, so the skills installer made links.

## Decision — real copies, not untrack + `.gitignore`

The ticket allows either. Real copies are chosen: the seven skills were committed on purpose (the lock tracks them), the
`phargus-*` precedent is copy mode, and a copy keeps them working in this repo's sessions. The content source is the
pinned upstream, not a local directory:

- `pharn-dev/skills` at `36ada26f27d0f8602c7bd86b48a53906ff1de165` (`plugins/pharn-ci/skills/*`, `plugins/pharn/skills/pharn-cli`)
- `cloudflare/security-audit-skill` at `c1c8a8c1471069fb0e188eeaff69b8e8db6564a8` (`skills/security-audit`)

Both fetched as GitHub tarballs into a scratch directory outside the repo (regular files and directories only, checked
with `tar -tv`); nothing downloaded is executed. Proof of identity: the skills CLI's `computedHash` (skills 1.9.0
`hashSkillFiles`: entries sorted by UTF-8 path bytes, each `path \0 len \0 bytes`, CRLF folded, `metadata.json` /
`.git` / `__pycache__` excluded), reimplemented in a scratch script and first validated against the five committed
`phargus-*` copies (5/5 equal their lock hashes). All seven pinned trees then equal their lock `computedHash` exactly,
and the five `pharn-ci-*` + `pharn-cli` trees also equal the local `~/.agents/skills/*` copies.

## Applied lessons

- L19 — every Bash-run writer is declared: the copies, the lock edit, `npm run docs:generate`'s `pharn-install.json`
  and the Step 2b formatters run only over this `## Files` list; the generated files that change are named below.
- L57 — Step 2b's markdownlint runs with `--no-globs`, so only the named files are linted; the vendored copies stay
  byte-identical (their `computedHash` is re-checked after Step 2b), with `.prettierignore` (`.claude/skills/`) and the
  markdownlint `.claude/skills/security-audit` ignore keeping both formatters off third-party bytes.
- L70 — the copies are live skills in every session of this repo by design (that is why they are committed); no fixture
  is involved, and the plan adds nothing else under a harness-discovered path.

## Files

- `.claude/skills/pharn-ci-cover` — the symlink entry removed; the path becomes the copied directory — apparatus
- `.claude/skills/pharn-ci-explain` — the symlink entry removed; the path becomes the copied directory — apparatus
- `.claude/skills/pharn-ci-fix` — the symlink entry removed; the path becomes the copied directory — apparatus
- `.claude/skills/pharn-ci-install` — the symlink entry removed; the path becomes the copied directory — apparatus
- `.claude/skills/pharn-ci-policy` — the symlink entry removed; the path becomes the copied directory — apparatus
- `.claude/skills/pharn-cli` — the symlink entry removed; the path becomes the copied directory — apparatus
- `.claude/skills/security-audit` — the symlink entry removed; the path becomes the copied directory — apparatus
- `.claude/skills/pharn-ci-cover/SKILL.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-cover/references/report.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-cover/references/tests.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-cover/scripts/check-lines.mjs` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-explain/SKILL.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-explain/references/codes.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-explain/references/policy.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-explain/references/report.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-fix/SKILL.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-fix/references/kinds.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-fix/scripts/list-fixes.mjs` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-install/SKILL.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-install/references/coverage.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-install/references/workflows.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-install/scripts/check-coverage.mjs` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-policy/SKILL.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-policy/references/enable.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-policy/references/keys.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-policy/scripts/check-policy.mjs` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-ci-policy/scripts/policy.v1.json` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-cli/SKILL.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-cli/references/commands.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-cli/references/json.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/pharn-cli/references/text-flow.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/AI-AND-LLM.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/ATTACK-CLASSES.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/CLIENT-SIDE.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/CLOUD-AND-DEPLOYMENT.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/DATA-ISOLATION-AND-LIFECYCLE.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/DESKTOP-MOBILE-AND-LOCAL-IPC.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/HUNTING.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/MEMORY-SAFETY-AND-BINARY.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/PROTOCOLS-RPC-AND-MESSAGING.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/RECONNAISSANCE.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/RESOURCE-EXHAUSTION-AND-AVAILABILITY.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/SKILL.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/SUPPLY-CHAIN-AND-RELEASE.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/VALIDATION-AND-REPORTING.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/WEB-PROTOCOL-AND-AUTH.md` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/report-schema.json` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/validate-coverage-ledger.cjs` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/validate-coverage-ledger.test.cjs` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/validate-findings.cjs` — pinned upstream copy, byte-identical — apparatus
- `.claude/skills/security-audit/validate-findings.test.cjs` — pinned upstream copy, byte-identical — apparatus
- `skills-lock.json` — `"installMode": "copy"` on the seven entries, nothing else — apparatus
- `eslint.config.mjs` — ignore `.claude/skills/security-audit/**` (third-party; one `no-unused-vars` error measured) — apparatus
- `.markdownlint-cli2.jsonc` — the `.claude/skills/security-audit` comment says it is a vendored copy now, not a link — apparatus
- `package.json` — `_test_glob_comment`: `.claude/` now holds two vendored skill tests the glob deliberately does not reach — repo-meta
- `SKILLS_VERSION` — 7.25.5 → 7.25.6 (patch: the ticket requires a release; no product-surface byte changes) — repo-meta
- `README.md` — the `pharn` badge follows `SKILLS_VERSION` (`check:badge`) — repo-meta
- `pharn-install.json` — regenerated by `npm run docs:generate` (`skillsVersion` only) — repo-meta
- `CHANGELOG.md` — a `## [7.25.6] - 2026-11-25` section saying v7.25.3–v7.25.5 cannot be installed, and why — repo-meta

### Not touched

- `docs/install-manifest.md` (CORE-382, another worktree); no tag is created or moved; the floor check that would catch
  a non-file archive entry is CORE-383, and the lesson is CORE-385.

## Contracts satisfied

- none of `pharn/pharn-contracts/` — the install manifest's shape is unchanged; only its `skillsVersion` moves.

## Evals to write (P1)

- none — no capability or `rule_id` is added. The acceptance check is the ticket's: `git ls-files -s | awk
'$1=="120000"'` prints nothing, and `git archive --format=tar HEAD | tar -tvf -` lists only `-` and `d` entries.

## Guarantee audit (P0)

- "the seven copies are the pinned upstream bytes" → advisory, measured: a scratch recompute of the skills CLI's
  `computedHash` equals each lock entry; no committed checker re-runs it.
- "no tracked entry is a symlink" → advisory at this PR (a one-off `git ls-files -s` / `git archive` measurement in the
  PR body); its floor twin is CORE-383, not built here.
- "a re-install makes copies" → advisory: `installMode: copy` is what skills 1.9.0 reads (`lock.skills[name]?.installMode
=== "copy"`); not exercised here.
- "v7.25.6 installs" → advisory until the tag exists; `release.yml` tags only after merge.

## Trust audit (P2)

- The copied skill trees are third-party/untrusted DATA: copied byte-for-byte, never executed during this work; the
  `.cjs`/`.mjs` scripts in them run only if a session invokes the skill (as before, when the link resolved).

## Open questions (HALT)

- none.

## GATE 1

GATE 1 approved by lead (delegated by the user), 2026-11-25: checked against CORE-381 Scope and Done-when.
