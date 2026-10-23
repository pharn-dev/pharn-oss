# PLAN — audit-low-small

- applied_lessons: [L33, L34, L37, L62]
- increment: nine small LOW findings from the 2026-10-12 audit, one PR (6.72.1); ARCH-12 dropped (a live test reads the path)
- mode: LIGHT (batch 2026-10-23, agent A) — no stage commands; the orchestrator holds both gates

## Why (P7 — each item is a recorded audit finding, re-read live on origin/main 6.72.0)

1. **ENF-11** — `ci.yml`'s comment above "Bash-write reconciliation check" says the step "DOES catch an uncommitted
   change". A fresh CI checkout has none, so in CI the step is NO_BASELINE and green by construction.
2. **ENF-10** — `.dev/floor/check-config.mjs` has no invoker (no npm script, no CI step). GREEN today in both modes.
3. **ARCH-14** — `package.json` `keywords` carry `cursor` and `codex`; PHARN targets Claude Code only.
4. **SEC-12 (gitignore part)** — `.claude/worktrees/` is excluded only through `.git/info/exclude`. Prettier
   (`.prettierignore`), markdownlint (`.markdownlint-cli2.jsonc`) and ESLint (`eslint.config.mjs`) already list it.
5. **SEC-9 (SECURITY.md part)** — the surface paragraph omits that gate scripts and the base install run with the
   user's full environment (`run-gates.mjs` `gateEnv` copies `process.env`; the base install goes through the same
   `spawnGate`) and that the base install (`npm ci` etc., no `--ignore-scripts`) runs the BASE commit's lifecycle scripts.
6. **TST-7** — `makeDefaultProbeSandbox()` `mkdtempSync`s `pharn-reconcile-*` and nothing removes it.
7. **TST-10** — `validate.mjs`: an uncaught throw exits 1 (RED's code) and prints no `FLOOR:` line.
8. **ARCH-11 (narrowed)** — five shipped griller bodies cite `.dev/floor/scan-plan-<x>.mjs`; the scanners live in
   `pharn/floor/` since 2.4.0, and an install has no `.dev/`.
9. **ENF-7** — `check-spec.mjs`'s required-sections test counts `##` lines inside fenced code blocks.

**Dropped — ARCH-12** (`pharn/features/loop-decision-integrity/`): a live test reads it as a fixture —
`pharn/floor/check-spec.test.mjs` "opt-in: the committed legacy SPEC … stays GREEN" spawns `check-spec.mjs` on its
`SPEC.md`. Per the brief, stop and report rather than move it.

## Design decisions

- **ENF-10 — documented, not wired (decided during the edit).** Discovery found the audit's "no invoker" is half
  true: `check-config.test.mjs`'s "★ live ★" case runs `agreement` (validate + agreement) over the REAL
  `pharn.config.json` and `.claude/commands` on every `npm test`, so `npm run check` and CI's Test step already gate
  it. A `check:config` script + CI step would run the same check twice. So `.dev/guides/floor-checks.md` names the
  invoker instead (the brief's fallback), and package.json / CONTRIBUTING.md / the test stay untouched for this item.
- **TST-7:** `emit()` calls `process.exit`, so a `finally` at the caller never runs. Each sandbox is recorded in a
  module-level list when it is made, and the first one registers `process.once("exit", removeProbeSandboxes)`,
  which covers every exit path (emit, a throw, the end of main). `removeProbeSandboxes()` is exported, never throws
  (a failed removal is counted and returned, so it cannot turn a verdict into a crash), and is tested directly,
  including the failure branch (a read-only subdirectory). The parity test's own sandbox is then removed too.
- **TST-10:** `validate.mjs` registers an `uncaughtException` handler before any work: it prints
  `FLOOR: INCONCLUSIVE — crashed (<message, JSON-quoted>)` and exits 2. Every consumer branches on 0 vs non-zero
  (dev-verify/regress record the int; check-verify/check-regress compare `!== 0`; commands say "non-zero → HALT"),
  so 2 stays "not GREEN" everywhere. The message is JSON-quoted for the same reason as `showPath` (one line, P2).
  Test trigger: a `.md` file with mode 000 makes the top-level `readFileSync` throw EACCES (skipped as root).
- **ARCH-11:** replace `.dev/floor/scan-plan-<x>.mjs` with `pharn/floor/scan-plan-<x>.mjs` in the five bodies, the
  sentence otherwise unchanged ("no … is built" stays true: none of the five exists in `pharn/floor/`). Enumerated by
  the shortest invariant substring `floor/scan-plan-` over `pharn/` (L33), not from the audit's list.
- **ENF-7:** reuse spec-template-core.mjs's existing column-0 block model (`spanned()`, via `sectionsOf()`), which
  the templated path already uses to decide which headings a renderer shows. A new export `visibleH2Names(body)`
  returns the visible `##` names; `check-spec.mjs`'s `headingsOf` becomes that call. So the base check now ignores
  a `##` inside a column-0 fence, HTML comment or `<pre>/<script>/<style>/<textarea>` block — the same model and the
  same stated bounds (the header's WHICH HEADINGS EXIST). `plan-files-core.mjs`'s `fenceStates` is the other
  candidate; not chosen because check-spec already imports spec-template-core and its H2 rule lives there.
  Consequence, stated: a TEMPLATED SPEC whose base section is only hidden now gets the legacy "missing" RED in
  addition to rule 1's "sits inside a block" RED (both true).

## Files

- `.dev/features/audit-low-small/PLAN.md` — this plan
- `.github/workflows/ci.yml` — ENF-11 comment
- `package.json` — ARCH-14 keywords
- `.dev/guides/floor-checks.md` — ENF-10 invoker line; TST-10 exit-code line in the validate section
- `.gitignore` — SEC-12 `.claude/worktrees/`
- `SECURITY.md` — SEC-9 environment + base lifecycle-scripts sentences
- `pharn/floor/check-bash-reconcile.mjs` — TST-7 sandbox removal
- `pharn/floor/check-bash-reconcile.test.mjs` — TST-7 no-leak test + removal unit test
- `pharn/floor/validate.mjs` — TST-10 crash → INCONCLUSIVE, exit 2
- `pharn/floor/validate.test.mjs` — TST-10 crash test
- `pharn/pharn-pipeline/grillers/a11y/a11y.md` — ARCH-11
- `pharn/pharn-pipeline/grillers/comprehension/comprehension.md` — ARCH-11
- `pharn/pharn-pipeline/grillers/documentation/documentation.md` — ARCH-11
- `pharn/pharn-pipeline/grillers/error-handling/error-handling.md` — ARCH-11
- `pharn/pharn-pipeline/grillers/performance/performance.md` — ARCH-11
- `pharn/floor/spec-template-core.mjs` — ENF-7 `visibleH2Names` export
- `pharn/floor/check-spec.mjs` — ENF-7 fence-aware required sections
- `pharn/floor/check-spec.test.mjs` — ENF-7 fenced-only `## Constraints` REDs (+ comment-hidden, + visible control)
- `SKILLS_VERSION` — 6.72.0 → 6.72.1 (patch: corrections to shipped bytes)
- `CHANGELOG.md` — one 6.72.1 section covering all items
- `README.md` — version badge (check:badge)

Generated regions (`docs/capabilities/**`, README CURRENT-STATE) are rewritten by `npm run docs:generate` if they move;
any such file is added here before the edit lands.

## Tests (P1)

- ENF-7: fenced-only `## Constraints` → RED `section`; comment-only → RED; fenced example beside a visible heading → GREEN.
- TST-7: a spawned run with `TMPDIR` at a fresh dir leaves no `pharn-reconcile-*`, over BOTH sandbox makers (default
  probe and scope probe), with a non-vacuity control that each run reached its probe (the verdict/denied_by it can
  only produce through it — L34); `removeProbeSandboxes()` counts a failed removal instead of throwing.
- TST-10: forced crash → exit 2 + the `FLOOR: INCONCLUSIVE — crashed (` line, and no `FLOOR: RED` line.
- ENF-10: none new — the existing "★ live ★" test is the gate the guide now names.

## Applied lessons

- L33: ARCH-11 enumerated by the shortest invariant substring (`floor/scan-plan-` over `pharn/`), not by the audit's five.
- L34: the TST-7 no-leak assertion ("no `pharn-reconcile-*` left") passes vacuously if no probe ran, so each run
  asserts a verdict only the probe can produce.
- L37: the ENF-11 comment's claim is probed, not read: `npm run check:reconcile` in a clean checkout prints NO_BASELINE.
- L62: TST-10 is this lesson's shape — a crash read as RED's exit code; the handler's message goes through
  `JSON.stringify(String(...))` inside a guard so the refusal itself cannot throw.

## Guarantee audit (P0)

- TST-10: "a crash is INCONCLUSIVE/exit 2" holds for a throw after the handler registers; a failure while loading
  `frontmatter-core.mjs` (a static import, evaluated first) still exits 1 — stated in the code comment.
- TST-7: removal is best-effort on exit; a `SIGKILL` leaves the dir. Stated.
- ENF-7: the visible-heading model is spec-template-core's, with its named fail-open/fail-closed bounds.

## Open questions (HALT)

None.
