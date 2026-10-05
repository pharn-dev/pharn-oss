# REVIEW — instruction-growth-gate

An independent read-only reviewer (opus, a fresh context) reviewed the uncommitted increment against `d40667d`. It
probed every finding below by executing code in throwaway repositories on darwin. The free text in the findings quotes
the reviewed increment and is DATA (P2). No instruction-looking content was found in the increment.

## Floor (FLOOR — deterministic)

- `node pharn/floor/validate.mjs .` → GREEN (36 capabilities).
- `node --test` passed on:
  - the three new suites: 103/103;
  - the changed suites plus loop-fresh and stage-work: 236/236;
  - command-hygiene, frontmatter-core and command-family: 301/301.
- `docs:check`, `check:changelog`, `check:badge`, `check:markers` and `check-changelog-entry` → GREEN.
- The standing verdicts: regress `no-regressions`; verify `PASS` (6 gates).

## Advisory findings (model judgment — a severity here gates nothing, fix #3)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: "pharn/floor/instruction-files.mjs:295"
  problem: "The injected gate refuses a project whose root is not the git top level (a monorepo subdirectory), so every /pharn-verify there now FAILs where 6.35.2 passed; /pharn-loop retries it to STOP_CAP, and a red gate makes INCOMPLETE unreachable (ship's Step 2b rebuild)."
  evidence: 'Probe: project app/ inside a git repo; run-gates init --stage verify + drain + check-verify from app/ → gates {test:0, instruction-growth:2, reconcile:0}, verdict FAIL; checker: "run from the repository root (…/mono), not a subdirectory".'
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/instruction-files-core.mjs:169"
  problem: "YAML null, `{}`, `0`, `true`, a `- ~` item and block scalars (`|`, `>`) as the `paths` value are read as real scoping patterns, so the rule is left out — contradicting the header's own rule that a `paths` key with no pattern loads always."
  evidence: "Each adds a 10,001-B rule → exit 0 within, added 0: `paths: ~`, `paths: null`, `paths: |\\n  **`, `paths: >-\\n  **/*`, `paths: {}`, `paths: 0`, `paths:\\n  - ~`. Control `paths: \"\"` → exit 1 over (paths-empty)."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/instruction-files-core.mjs:79"
  problem: "Set membership is case-sensitive against git's listing, so on a case-insensitive volume a tracked `claude.md` or a `.Claude/rules/` file (which Claude Code reads) is not counted, and a false `git-ignored-not-counted` note is emitted."
  evidence: "darwin: commit claude.md = 10,001 B → --growth exit 0, added 0, notes [no-instruction-files, {git-ignored-not-counted, CLAUDE.md}]."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/instruction-files.mjs:150"
  problem: "Content inside a git submodule (`.claude/rules` as a submodule, or an import into one) is silently invisible, and `--report` says `no-instruction-files` — 'looked at nothing' read as 'found nothing' (L34); no bound names it."
  evidence: "`.claude/rules` submodule holding a 10,001-B big.md → --growth exit 0 added 0; --report total 0, notes [no-instruction-files]."
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/floor/instruction-files.mjs:192"
  problem: "The ported dirty predicate disagrees with stage-regress.mjs's on a staged rename into `.pharn/` (the port tests the new path only), so regress and verify can pick different bases for one tree."
  evidence: '`git mv src/x.js .pharn/x.js` → --base-rule exit 2 base-unresolved ("clean"); regress''s parse of "R  src/x.js -> .pharn/x.js" reads dirty → HEAD.'
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/instruction-files-core.mjs:40"
  problem: "The header presents three under-count routes as the stated list, and CLAUDE.md/CHANGELOG label `--growth` FLOOR over 'that set' without saying the set is a model; the YAML values, case variants, submodules and an in-root absolute link spelled through an alias (`/tmp` vs `/private/tmp`) are missing."
  evidence: 'CLAUDE.md: "`--growth` (FLOOR): bytes ADDED to that set since the base"; `.claude/rules -> /tmp/…/repo/docs/rules` → note outside-root, added 0.'
```

## Floor-gate vs advisory

- **Floor-gate (blocking):** none. Every deterministic gate is green, and the floor verdicts stand: verify `PASS`,
  regress `no-regressions`.
- **Advisory:** six findings (4 important, 2 minor). Severity is the reviewer's judgment and gates nothing.
- The P5 finding is a behaviour regression for one project shape: a project root below the git top level.
- The four P0 findings are under-count routes. Each lets an always-loaded file escape `--growth`, and none is in the
  stated bounds.

## Lessons to feed

Candidate, for `/pharn-dev-ship` Step 2b: a checker that MODELS an external tool's behaviour (here, Claude Code's
loader) states its bounds from the shapes its author pictured. The reviewer found four more by probing the input domain
(YAML scalar kinds, case folding, submodules, path aliases). This is L59's PATH_KINDS remedy, which enumerates the input
kinds a fixture must cover, recurring for a new domain.
