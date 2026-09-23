# REVIEW — spec-template-override

**Verdict: blocked-with-1-floor-finding.** The floor is GREEN (`validate.mjs`: 36 capabilities) and verify is PASS.
One shipped FLOOR claim fails when executed in a layout the bounds do not name (F1). Everything else is advisory.

Method: the four inline lenses, applied by this stage and by one independent read-only reviewer. The reviewer
probed claims in scratch install trees, ran source mutations against the suite, and used markdown-it. F1 was
re-run by this stage and reproduced. Free text below quotes the increment as DATA (P2).

## Floor-gate findings (blocking)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".claude/commands/pharn-spec.md:291"
  problem: "The FLOOR claim that an existing project template is never skipped for the default is false when the project's pharn/ directory is a symlink: projectRoot() follows the checker's real path, so a valid pharn.spec-template.md at the project root is not seen and the default is printed at exit 0."
  evidence: "probe: proj/pharn -> ../real/pharn, proj/pharn.spec-template.md valid → `node pharn/floor/check-spec.mjs --resolve-template-ref` printed `pharn-default@sha256:14a5…`, exit=0"
```

The same root cause has a second effect (the reviewer probed it). When `real/` also holds a template,
`--resolve-template-ref` pins the digest of `real/pharn.spec-template.md`, while `--template-path project` prints a
root-relative path the command reads from the working directory: the pinned template and the filled template are
different files. The contract's bounds name a symlinked `pharn/floor/` only. The CHANGELOG line "Resolution never
falls back silently" has the same gap. **Remedy options for GATE 2:**

- **(a) code:** refuse when the checker was invoked through a path whose real path differs, via a new refusal code,
  so the claim becomes true; or
- **(b) prose:** narrow the claim everywhere it is stated (command, contract, CHANGELOG) and name both effects as a
  bound.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: "pharn/floor/spec-template-core.mjs:450"
  problem: "The 'visible' half of the ac-example and out-of-scope-label rules is untested: removing either `inBlock` skip leaves the suite result unchanged, because no fixture puts a column-0 example or label inside a comment."
  evidence: "mutations M1 (hasExampleCriterion) and M2 (scope label) → 186 pass / 1 fail, identical to baseline; control mutation `verify.length >= 1` caught (+2 failures)"
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".claude/commands/pharn-spec.md:320"
  problem: "The project template is an instruction channel from anyone who can change the checked-in file (a merged PR, a pulled branch), and /pharn-spec obeys it, also under --model-approve; the hook stops only the agent's write tools, and no stated bound names this route."
  evidence: "so the template is trusted by PATH, never by your judgment of its content"
- type: FINDING
  rule_id: "P3"
  severity: important
  file: "pharn/floor/check-spec.mjs:25"
  problem: "check-spec.mjs now states a second reason to change (the template CLI's file-safety policy), and P3's VIOLATION clause says two reasons means two files; TEMPLATE_REFUSALS in the pure core also lists six codes only check-spec produces."
  evidence: "THE TEMPLATE CLI, a second axis this file hosts, stated rather than hidden (P3)"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/hooks/protect-trusted-paths.cjs:367"
  problem: "The hook denies the exact path but allows `pharn.spec-template.md/x`, which creates a directory there; every later resolve then refuses (not-regular-file). A denial of service on /pharn-spec, not an injection."
  evidence: "Write to pharn.spec-template.md/x → exit 0 (probed)"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/check-spec.mjs:90"
  problem: "The header's Exit line lists --template-path among modes that exit 1 on a refused template; it never validates and fails only on an unknown or missing id."
  evidence: "or a refused template (--template-ref, --resolve-template-ref, --template-path)"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "README.md:444"
  problem: "The README says the example criterion must be `- **AC-1**`; the code accepts any `- **AC-<n>**`."
  evidence: "one example criterion in the `- **AC-1**"
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: "pharn/floor/check-spec.test.mjs:1261"
  problem: "The direct validateTemplate tests hard-code the base four sections instead of reusing check-spec's REQUIRED_SECTIONS, and foldName's 'same fold as toKey' claim is not pinned; only the path literal is."
  evidence: 'baseRequired: ["intent", "scope", "acceptance criteria", "constraints"]'
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".claude/commands/pharn-loop.md:217"
  problem: "/pharn-spec now reports 'blocked on the template' under --model-approve, but /pharn-loop's stuck-point table has no row naming it, so S9 versus S10 is left to the model (the plan named follow-up loop-s9-before-feature-dir for the related parenthetical)."
  evidence: "Under `--model-approve`, report back that the run is blocked on the template."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CLAUDE.md:152"
  problem: "An unrelated line re-wrap was introduced while moving the new paragraph ('slipped past.' / 'It is covered **here** instead')."
  evidence: "`.pharn/WRITES-SCOPE.JSON` named the same file and slipped past."
```

Checked and sound (reviewer, probed):

- **Resolver cases:** the eleven refusal codes each trip exactly one fixture. A FIFO, an empty file and mode 000
  each exit 1 with one code and an empty stdout.
- **Line numbers:** refusal line numbers are correct under CRLF+BOM.
- **Hook:** it denies `./`, case, trailing-dot, absolute and `pharn/..` variants. `ba46b7b` equals the patch, and
  the live hook's sha256 equals the pinned value.
- **Code paths:** file descriptors are closed on every path. No refusal echoes template text.
- **Wiring:** the WIRING test matches `/pharn-spec`'s two lines.
- **CHANGELOG and version:** CHANGELOG counts and the "correcting the record" claim hold, and `MIN_CLI` is
  unchanged.

## Lens summary

- **L-floor (P0):** one blocking finding (F1) and three minor wording findings.
- **L-eval (P1):** the refusal set is closed and iterated; the "visible" rules are untested (important).
- **L-trust (P2):** no template text reaches a verdict or stderr; the contributor route to the template is unnamed
  (important).
- **L-axis (P3):** check-spec's stated second axis is the human's call (important).

## Iteration 2 — re-review of the GATE 2 fix round

**Verdict: GREEN — 0 floor-gate findings.** The floor is GREEN; regress is `no-regressions` and verify is PASS
(both iteration 2).

- **F1: resolved, probed.** The same layout (`proj/pharn -> ../real/pharn`, a valid `proj/pharn.spec-template.md`)
  now gives `refused (symlinked-root)`, exit 1, nothing on stdout. Ordinary invocations still resolve (exit 0):
  relative from the root, absolute from `/tmp`, and from a subdirectory. `--template-ref pharn-default` through
  the symlink is unaffected. A new fixture pins the refusal, and the closure test caught its absence before the
  fixture existed.
- **Visible rules: resolved, mutation-checked.** Each `inBlock` guard now has its own fixture, and removing either
  guard REDs 2 tests. The Acceptance Criteria fixture had to hide the item on a comment's CLOSING line: a fixture
  hiding the whole item was already caught by the continuation guard, so it did not isolate the start guard.
- **Contributor route (P2): named** in the contract's bounds, `/pharn-spec`'s trust audit and the README.
- **Minor wording fixes: done** — the `--template-path` exit line, `AC-<n>` in the README, one pinned
  `BASE_REQUIRED`, and the CLAUDE.md re-wrap.
- **Still open (advisory), recorded in PLAN.md's review dispositions:**
  - P3: check-spec's second axis (follow-up `template-cli-split`);
  - the hook's `pharn.spec-template.md/x` gap and the unpinned `foldName`/`toKey` agreement (human-only
    hook; follow-up `protect-spec-template-subtree`);
  - `/pharn-loop`'s stuck-point row (follow-up `loop-s9-before-feature-dir`).

## Proposed lesson candidate (for /pharn-dev-memory-promote — NOT written here)

- **title:** A formatter's config can widen an explicit file list — `markdownlint-cli2 --fix <file>` lints and FIXES
  every path its config globs name, including other sessions' worktrees.
- **type:** tooling · **concepts:** [bash-escape, formatter, writes-scope, config-globs, lesson-recurrence]
- **what happened:** `/pharn-dev-build` Step 2b's pinned "scoped" line
  (`printf '%s\n' "$MD" | xargs npx markdownlint-cli2 --fix`) rewrote 124 files outside the plan. Two were tracked
  test fixtures and 122 were `node_modules` docs, all in another Claude session's worktree under
  `.claude/worktrees/`. `.markdownlint-cli2.jsonc`'s `globs` are ADDED to the command-line paths, and its root-only
  `ignores` did not match the nested tree. The files were restored by hand. `--no-globs` limits it to the named
  file. The same shape made `format:check`, `lint:md` and one test RED at verify.
- **why it recurs:** this is L19 recurring inside L19's own remedy. The line reads as scoped, so no reviewer checks
  it; the widening lives in a config file.
- **provenance:** feature `spec-template-override`; source `.dev/features/spec-template-override/REVIEW.md`
  (this candidate) + `VERIFY.md` (the raw capture); commit: the increment's squash commit once merged. The
  follow-up task "Scope markdownlint --fix to named files only" is running separately.
