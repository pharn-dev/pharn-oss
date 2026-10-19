# PLAN — regress-install-config (LOOP-11)

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L15, L35, L36, L41, L54, L59, L62, L65]
- increment: A closed `regress.install` key in `pharn.config.json` (`"none" | "head-node-modules" | "npm" | "pnpm" | "yarn" | "bun"`) that `stage-regress.mjs` reads when no `--install`/`--no-install` was given, so a project with no lockfile or with several lockfile families has a pre-declared answer to the `install-unresolved` question and a full `/pharn-loop` can complete over it.
- layer(s): product floor (`pharn/floor/`), `pharn-contracts` (`stage-exit.md`, `regression-report.md`), product commands (`/pharn-regress`, `/pharn-loop` regress mapping bullet only)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

> **Trigger (P7).** Audit finding LOOP-11 (Medium; triage at main `d5453a17` confirmed open). `resolveInstall`
> (`pharn/floor/stage-regress-core.mjs:284-303`) returns `{kind: "ask"}` whenever a `package.json` exists at BASE and
> the lockfile-family count is not exactly one (`:293-294`). `/pharn-loop` maps `question install-unresolved` to S10
> (`.claude/commands/pharn-loop.md:369`) and its granted regress line (`:85`) never passes `--install`/`--no-install`
> (`stage-regress.mjs:313-364` accepts them). So a no-lockfile library or a mixed-lockfile project can never finish a
> full `/pharn-loop`; only `--quick` (which skips the base comparison) works. Re-read live this run.

## GATE 1 — decided (delegated)

Recorded as the orchestrator's decision under the maintainer's delegation, not a human approval: **APPROVED with one
condition.** Q1 argv > declaration > table — yes. Q2 no `/pharn-test` pin — yes, reasoning recorded below and in the
CHANGELOG. Q3 no non-frozen install — yes. **Condition:** check what `none` yields for the common LOOP-11 case (a
library with devDependencies and no lockfile); if `base-install-unreliable` still ends the loop blocked, add an honest
value that lets it finish — e.g. reuse HEAD's installed `node_modules` for the base worktree, disclosed as an
approximation — or argue in this PLAN why that is unsound.

**What `none` yields there (read from the code, pinned by a test).** `baseInstallNeeded` is true (devDependencies are
declared), so `unreliableInstallMasking` turns every outside gate red at BOTH sides into the refusal
`base-install-unreliable` (exit 3 → `/pharn-loop` S9 `blocked: stage-refused`). A base with no dependencies runs every
dependency-needing gate red, so the refusal fires as soon as ANY such gate is red at head — a pre-existing red, or an
iteration-1 build that broke an outside test, which is exactly the case the loop exists to iterate on. `none` therefore
finishes only an all-green run. **The condition holds; LOOP-11 is not fixed for that case by `none` alone.**

**The added value, `head-node-modules`, and why it is sound enough to ship (argued, not assumed):**

- What it does: no install runs; the stage creates `<base worktree>/node_modules` as a symlink to the project's own
  `node_modules` (a real directory, checked with `lstat`, never followed — L54/L59), so base gates resolve HEAD's
  installed dependency tree. The masking rule treats it as a reliable environment (dependencies ARE present), so a gate
  red on both sides reads `pre_existing` — that is the approximation, and it is disclosed.
- The approximation, stated: the BASE is measured with HEAD's dependency tree, so a regression caused purely by a
  dependency change is NOT attributed to the change (it is red on both sides). This re-admits, opt-in and disclosed,
  the exact borrowing regress-base-integrity removed by default (`base-worktree.mjs` header, audit f6).
- Why that does not open a false GREEN for the loop: `/pharn-loop` stops green only on `check-loop.mjs` reading
  `/pharn-verify` PASS ∧ regress clean, and verify's threshold is absolute over every gate at HEAD. A gate red at head
  — whatever regress calls it — fails verify, so the loop iterates or caps; it never reaches `STOP_GREEN` over it. What
  the approximation costs is regress's ATTRIBUTION (`regressions` vs `pre_existing` in the report a human reads), never
  the loop's green.
- Disclosure: `regression-report.json` gains an additive `base_install` block only when a declaration was used
  (`{"declared_in": "pharn.config.json#regress.install", "value": <member>}` — absent otherwise, so every undeclared
  report keeps its bytes); `REGRESSION.md`'s install line says the base ran with HEAD's `node_modules` and names what
  that does not attribute.
- Bounds, stated rather than closed: (1) the link is writable — a base gate that writes a cache under `node_modules`
  (`.vite`, `.cache`) writes HEAD's tree (head gates of the same invocation have already run; later ones see it); (2)
  only the ROOT `node_modules` is linked — a workspace's nested `node_modules` is not; (3) a base commit that tracks its
  own `node_modules` entry refuses; (4) `node_modules` that is absent or not a real directory at the project root
  refuses. Cleanup removes the checkout without following the link (probed this run: `git worktree remove --force
--force` and `rmSync` both unlink it and leave the target intact; a test pins that the target survives).
- Never reused as retained BASE evidence: it is represented as an install of kind `none`, which
  `regress-base-reuse-core.mjs` already reads as `evidence-unreliable` (never reused) — conservative, because HEAD's
  `node_modules` may differ by the next invocation.

## Applied lessons

- L15 — every key of the declaration is read by own-property test (`Object.hasOwn`), never `cfg.regress?.install`, so an inherited `toString`/`__proto__` cannot answer; tests cover inherited-key inputs.
- L35 — the family names have ONE owner: the accepted set is built from `Object.keys(LOCKFILE_FAMILIES)` imported from `stage-regress-core.mjs`, and a declared family maps to the SAME frozen-command table `resolveInstall` already holds — no second command table, no second family list.
- L36 — the value set is CLOSED in both directions: a closure test asserts the accepted set equals exactly `none`, `head-node-modules` and the `LOCKFILE_FAMILIES` keys, and the block's key set equals exactly `["install"]`; an unknown value, an unknown key, a command string (`"npm ci"`) and variant spellings (`"NPM"`, `" npm"`) all refuse.
- L41 — `declared` defaults to `null` in `resolveInstall`; one test calls it WITHOUT the parameter and asserts the same results as today for every existing case (single family, zero, two, no manifest), so the no-declaration path is exercised, not only overridden.
- L54 — the project's `node_modules` precondition is an `lstat` test (a dangling or any symlink is not a real directory and refuses), never `existsSync`.
- L59 — the base-side `node_modules` entry is inspected with `lstat`/`readlink` before reuse on a resume (a link to exactly the project's `node_modules` is accepted; anything else refuses), and the cleanup test enumerates the link kind it removes.
- L62 — every refusal quotes the offending value through `quote-core.mjs` `shown()` (total); a test feeds `{"toString": 1}` as the `install` value with a control that `String()` throws on it.
- L65 — the declaration is a record a later gate (regress's BASE install) reads, so the plan states which stages can write it: in an installed project `set-writes-scope.cjs` refuses `pharn.config.json` from a plan (6.61.0) and the guard reserves it outside a run, and a Bash write REDs `/pharn-verify`'s reconcile gate; no `/pharn-test` pin is added (GATE 1 Q2).

## Design

- **Where it is read:** `pharn.config.json` at the project root (the stage's cwd), like `gates.exclude` — never the
  BASE commit's copy. Read in head-init only when **neither** `--install` nor `--no-install` was given **and** the
  base commit has a `package.json` (a no-manifest base needs no install and reads nothing).
- **Shape:** `{ "regress": { "install": "none" | "head-node-modules" | "npm" | "pnpm" | "yarn" | "bun" } }`. Absent
  file, absent `regress`, `{}` or no `install` key → no declaration (behaviour unchanged). Anything else — unparseable
  or unreadable file, non-object `regress`, an unknown key, a value outside the set — refuses.
- **Precedence (GATE 1 Q1):** argv (`--install`/`--no-install`) > declaration > the lockfile table.
- **Meaning:** `none` → no base install (kind `none`, no `reason`, so the masking rule still refuses over declared
  dependencies). `head-node-modules` → kind `none` with `link: "head-node-modules"` (above). A family → that family's
  frozen command from the existing table, **only when that family's lockfile is present at BASE**; otherwise refuses
  (GATE 1 Q3: no non-frozen install is ever run).
- **Refusal:** one new `unusable` reason code for the regress stage, `install-config-invalid`, with a `detail` naming
  the cause. `/pharn-loop` already maps every `unusable` to S9, so no new stop row.
- **Disclosure:** the progress record's `install` gains optional `declaredIn` (exactly
  `"pharn.config.json#regress.install"`) and `link` (exactly `"head-node-modules"`, only with kind `none`) — validated,
  no schema bump (an old record has neither). The report's additive `base_install` block and the `REGRESSION.md` line.
  `installOverride` (the entry-evidence miss) stays argv-only: a declaration answers the question the table could not;
  entry evidence also skips the table's own inferred install.
- **`install-unresolved`'s fixed question text** gains one sentence naming the declaration; its options are unchanged.
- **No `/pharn-test` pin (GATE 1 Q2):** `test_infra` pins what decides `/pharn-verify`'s AC gate; this key decides only
  regress's BASE environment, and verify's absolute threshold is unaffected by it. In an installed project a build
  cannot Write-tool `pharn.config.json` (6.61.0 setter refusal + reserved surface), and a Bash write reds reconcile.

## Files

- `pharn/floor/regress-install-config-core.mjs` — NEW: `readRegressInstall(text)` / `loadRegressInstall(dir)`, the closed reader; header owns the rule and its bounds — layer product floor
- `pharn/floor/regress-install-config-core.test.mjs` — NEW: closure, own-property, total quoting, unreadable file — test
- `pharn/floor/stage-regress-core.mjs` — `resolveInstall` gains `declared` (default null) and an `unmatched` result; `unreliableInstallMasking` exempts the link; `isValidInstall` accepts `declaredIn`/`link`; INSTALL_RULE header — layer product floor
- `pharn/floor/stage-regress-core.test.mjs` — precedence, each value, family present/absent, no-parameter control, masking — test
- `pharn/floor/stage-regress.mjs` — head-init reads the declaration and checks the `node_modules` precondition; the install phase creates the link; the report's `base_install` block; usage header — layer product floor
- `pharn/floor/stage-regress.test.mjs` — e2e: library + `none` refused (the LOOP-11 condition, pinned); library + `head-node-modules` done and the target survives cleanup; mixed lockfiles + `npm` persists `npm ci`; malformed / family-absent / no node_modules → `install-config-invalid`; argv wins — test
- `pharn/floor/render-regression.mjs` — the install line names the declaration and the link's approximation — layer product floor
- `pharn/floor/render-regression.test.mjs` — the declared lines — test
- `pharn/floor/stage-exit-core.mjs` — `install-config-invalid` in regress `unusable`; one sentence added to `install-unresolved`'s question — layer product floor
- `pharn/floor/stage-exit-core.test.mjs` — only if a pinned vocabulary/text assertion needs the new member — test
- `pharn/pharn-contracts/stage-exit.md` — the install section specifies the declaration; the unusable list names the new code — layer pharn-contracts
- `pharn/pharn-contracts/regression-report.md` — the additive `base_install` block — layer pharn-contracts
- `.claude/commands/pharn-regress.md` — the install paragraph and the "Executed commands" trust line name the declaration — product command
- `.claude/commands/pharn-loop.md` — ONLY the `/pharn-regress` stage-exit mapping bullet (`install-unresolved` → S10): name the declaration as the way to pre-answer it — product command
- `.dev/floor/command-hygiene.test.mjs` — ONLY if a command exceeds its byte ceiling: raise by measured + 10% rounded up to 512 — dev test
- `.dev/floor/stage-load-budget.test.mjs` — ONLY if a stage load ceiling is exceeded, same rule — dev test
- `.dev/guides/floor-gates.md` — one paragraph under `stage-regress.mjs` naming the declaration and its module — dev guide
- `README.md` — a short "Declaring the base install" subsection beside "Excluding a gate", plus the generated
  `CURRENT-STATE` region if `npm run docs:generate` changes it (no capability changes, so `docs/capabilities/**` is not
  expected to move; if it does, that is a re-plan, not a silent write) — repo-meta
- `CHANGELOG.md` — new `[6.65.0]` section — repo-meta
- `SKILLS_VERSION` — 6.64.2 → 6.65.0 (minor: a new config key) — repo-meta
- `.dev/features/regress-install-config/GRILL.md` — dev-grill artifact
- `.dev/features/regress-install-config/REGRESSION.md` — dev-regress artifact
- `.dev/features/regress-install-config/regression-report.json` — dev-regress artifact
- `.dev/features/regress-install-config/VERIFY.md` — dev-verify artifact
- `.dev/features/regress-install-config/verify-report.json` — dev-verify artifact
- `.dev/features/regress-install-config/REVIEW.md` — dev-review artifact
- `.dev/features/regress-install-config/SHIP.md` — ship roll-up

No trusted doc, hook, settings file, `CODEOWNERS` or `pharn.spec-template.md` is touched, so no `HUMAN-PATCH.md`: the
value set is closed and maps to the existing fixed command table or to a fixed link, so no config-sourced shell
command is introduced (the SEC-4 class) and `LIMITS.md §9` needs no disclosure.

## Contracts satisfied

- `pharn/pharn-contracts/stage-exit.md` — the regress vocabulary gains one `unusable` code; the install section is
  extended, the table itself still cited from `stage-regress-core.mjs` (P4).
- `pharn/pharn-contracts/regression-report.md` — one additive, optional block (`base_install`), absent unless a
  declaration was used.

## Evals to write (P1)

- No `role:` Capability is added or changed, so no `evals/` pair applies. Floor-module tests listed under `## Files`
  stand in their place (P1 governs Capabilities; this is floor code with `*.test.mjs` coverage).

## Guarantee audit (P0)

- "A malformed or out-of-set `regress.install` never answers the install question" → floor: enum-regex (closed-set
  membership + closed key set, own-property reads), tested.
- "A declared family runs only that family's frozen command, and only when its lockfile is at BASE" → floor:
  membership over `LOCKFILE_FAMILIES` + the existing fixed table, tested.
- "No shell command comes from `pharn.config.json`" → floor: the value is used only as a set member mapped to a
  fixed string or a fixed link; tested by a closure assertion and a `"npm ci"` refusal case.
- "A declared `none` cannot turn a red-both-sides gate into no-regressions" → floor: the existing
  `unreliableInstallMasking` rule, plus a test with a declared `none`.
- "`head-node-modules` is disclosed wherever it was used" → floor-adjacent: tested code writes the report block and
  the render line; that a reader heeds it is advisory.
- "`head-node-modules` attributes dependency-caused regressions" → NOT claimed; the opposite is stated.
- "An unattended `/pharn-loop` over a no-lockfile / mixed-lockfile project can now reach a regress verdict" →
  advisory: true only when the project declared the key before the run; the loop's own stop logic is unchanged.
- "The build cannot change the declaration it is regressed under" → NOT claimed as a pin (GATE 1 Q2). Write-tool route
  refused in an installed project (hooks); a Bash write is detected, never prevented, by reconcile (L19). In a dev
  checkout a plan may scope `pharn.config.json`.

## Trust audit (P2)

- `pharn.config.json` is untrusted project DATA: parsed as JSON, keys tested by own-property, the value used only after
  a set-membership test; a refusal quotes a key or value through `shown()`. Nothing from it is interpolated into a
  shell command, a question's text, or `REGRESSION.md`/the report beyond fixed strings selected by membership.

## Determinism audit (P5)

- Every new branch is a membership test (argv flag presence, own-key presence, value ∈ closed set, lockfile family
  present at BASE, `lstat` kind). The terminal fallback with no declaration is unchanged: `question
install-unresolved` (ask).

## Open questions (HALT)

- None — GATE 1 resolved above (delegated).
