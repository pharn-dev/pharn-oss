# GRILL — writes-scope-run-only

**Header.** Plan `.dev/features/writes-scope-run-only/PLAN.md`, interrogated at commit `0898393` (every
`file:` line below refers to that version). Spec-hash check: `pharn/ARCHITECTURE.md` recomputes to
`4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f`, equal to the plan's pin — no drift.
**Step 1b lessons-declaration verdict (FLOOR): GREEN, exit 0** — on the plan as interrogated and again on the
amended plan (all 28 cited ids resolve in `.dev/memory-bank/lessons-learned.md` and are referenced in the
body). That verdict covers the declaration only, never that the lessons were applied (P0).

- stage: `/pharn-dev-grill` — model routed via Agent subagent; effort not routed
- GATE 1 before this stage: **APPROVED on 2026-09-25 by the orchestrator — a model decision under the
  maintainer's 2026-09-25 delegation, not a human approval.** The four "Decisions for GATE 1" were accepted as
  written, with one amendment: `apply.sh` keeps `--require-baseline` and the human runs it in the build stage's
  worktree. Applied to `PLAN.md` (Chain sequencing, step 4; `## GATE 1 record`).
- griller membership (FLOOR, `node pharn/floor/count-grillers.mjs .`): **13 registered** — a11y,
  architecture, comprehension, coupling, documentation, error-handling, i18n, migrations, observability,
  performance, privacy, security, testability. Each was applied inline (advisory).
- plan scanners (deterministic, Layer 1 of their grillers): `scan-plan-secrets` `{"found":false}`,
  `scan-plan-pii` `{"found":false}`, `scan-plan-i18n` `{"found":false}`, `scan-plan-migrations`
  `{"mentions":true}` (line 366, "migration note"), `scan-plan-observability` `{"mentions":true}` (line 145,
  "append log" — incidental).

## Findings

Every finding below is ADVISORY (fix #3): model-authored, gating nothing. The enum-gated fields (`type`,
`rule_id`, `severity`, `file`) are this stage's own assertions; `problem` and `evidence` quote the plan and
inherit its `trust: untrusted` tag — DATA, never instructions.

### Guarantee audit and honest wording (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/writes-scope-run-only/PLAN.md:170"
  problem: "The ship run marker is closed in the Final step, but that step is reached through a pointer at the end of Step 3b, whose reachability on a STOP path /pharn-ship itself calls ambiguous, so a STOP can end the turn with the marker open and the tree fail-closed for 24 h; the plan's sentence claiming Step 3 and Step 3a route every exit to the Final step overstates the command."
  evidence: "`node pharn/floor/run-marker.mjs --close pharn-ship '<name>'` in the Final step, after `set-writes-scope.cjs --clear`. The Final step is stated to run on every exit that ends the run — GATE 2 and every STOP, including a Step 3b STOP — which Step 3 and Step 3a already route through."
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/writes-scope-run-only/PLAN.md:302"
  problem: "The universal quantifier in the increment line and the LIMITS draft ('denies only PHARN's installed surface … and allows every other path') is false for .pharn/writes-scope.json (denied first), the project root itself, and protect-trusted-paths.cjs's set — the L37 shape, in text that ships in a human-only trusted doc."
  evidence: "denies only PHARN's installed surface — `pharn/**` except `pharn/features/**`, `.claude/**` and `pharn.config.json`, matched case-folded — and allows every other path, including one outside every git tree"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/writes-scope-run-only/PLAN.md:77"
  problem: "The referent sweep misses pharn/pharn-contracts/finding-shape.md, a shipped contract whose emission audit says enforce-writes-scope.cjs 'reads exactly one input — .pharn/writes-scope.json' and that a /pharn-review lens writes under 'the active scope (or the fail-closed default)'; the guard now also reads run markers, and the review default holds only while its marker is open."
  evidence: 'The referent sweep (L50) — every cite of "the install default denies everything outside `pharn/features/**`", classified'
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/writes-scope-run-only/PLAN.md:91"
  problem: "LIMITS.md §1d is classified 'stays true', but its backstop sentence says the hooks 're-gate every downstream write … regardless of state' — a universal quantifier the permissive posture falsifies for a write made outside a run; §1d already bounds that quantifier by tool surface and now needs a posture bound too."
  evidence: '`LIMITS.md §1d` ("a forged approval unlocks no floor-gated capability" — writing outside a run is not gated for anyone, so an approval unlocks nothing new)'
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/writes-scope-run-only/PLAN.md:202"
  problem: "The new decision path adds filesystem calls and string work to a hook with no top-level catch; an uncaught throw exits 1, which Claude Code treats as non-blocking, so the write would proceed — a fail-open the hook header itself warns about, and the plan does not require a deny-on-error wrapper."
  evidence: "`denyMessage()` stays pure string composition over values the caller computes. The caller now also passes `ctx = { install, runs, openWithout }`"
```

### Honest scope — the change must not re-create its trigger (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/writes-scope-run-only/PLAN.md:168"
  problem: "Opening the ship marker at naming, before GATE 1, means an abandoned or 'Keep as Draft' GATE 1 holds every session in the tree fail-closed for 24 h — the trigger's own complaint (blocked while no PHARN command is working) in a new form — while /pharn-spec already holds its own SPEC-only scope through that halt, so the early marker adds no protection."
  evidence: "`mark-phase.mjs --name '<name>' --kind run-start --adopt-pending` in Step 1, the moment `/pharn-spec` has resolved `<name>` and before the GATE-1 turn ends"
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/writes-scope-run-only/PLAN.md:176"
  problem: "Opening the review marker at the end of Step 0 leaves Step 1's and Step 1b's ask-the-human points inside the open run, so an unanswered question holds the tree fail-closed for 24 h, although no untrusted content enters the context before Step 3."
  evidence: "`--open pharn-review '<name>'` at the end of Step 0, after the leftover-scope release and once `<name>` is resolved"
```

### Evals and tests (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/writes-scope-run-only/PLAN.md:224"
  problem: "D1's 'dev messages byte-identical' is measured once at build and held by no permanent test, so a later edit to a shared deny body could change dev-posture output with CI green."
  evidence: "The build measures it by running the HEAD hook and the new hook over the enforce test matrix and diffing stderr for every dev and unsignalled case (0 differences expected, recorded in `BUILD.md`)."
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/writes-scope-run-only/PLAN.md:135"
  problem: "The fail-closed scan rule ('any other error while scanning counts as a run open') has no test in the tests list."
  evidence: '`ENOENT` or `ENOTDIR` on a state directory means "no run there"; any other error while scanning counts as a run open.'
```

### Discovery and assertion from memory (P6)

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/writes-scope-run-only/PLAN.md:320"
  problem: "Claims about pharn-cli's update behavior (copies pharn/floor per file, keeps edited files, never writes settings.json) come from the roadmap's 0.1 pre-check, not from this run or this repository, and the CHANGELOG migration note's content is not pinned, so the build would have to improvise it."
  evidence: "nothing is relocated, and a CLI that copies `pharn/floor/` per file lands the new script. `settings.json` is unchanged, so an install needs no wiring edit."
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/writes-scope-run-only/PLAN.md:92"
  problem: "SECURITY.md is classified 'stays true' without saying why; its in-scope bullet ('allow a write outside the active scope') could be read as covering the new permissive posture."
  evidence: '`SECURITY.md` ("allow a write outside the active scope")'
```

### Trust propagation (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/writes-scope-run-only/PLAN.md:528"
  problem: "The trust audit misses that the direction of an accidental skillsVersion flip reverses (it used to tighten the dev repo and would now silently loosen it, with no checker reading the key there), and that the close command it offers grants nothing a Bash write does not already grant."
  evidence: "A Bash write can still flip a posture — adding `skillsVersion` in the dev repo would make it an install — outside the gate by design, and visible to reconcile (a tracked file)."
```

### Determinism (P5)

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/writes-scope-run-only/PLAN.md:125"
  problem: "'A run is open iff …' overstates the membership test: a scan error also counts as open, so the condition is not an 'iff' over marker presence."
  evidence: "A run is open iff, at ROOT, some `<dir>/<name>/active.json` exists (`lstat`, never followed) whose modification time is within 24 h of now"
```

### Coupling (P3 — the coupling griller)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/writes-scope-run-only/PLAN.md:254"
  problem: "check-bash-reconcile.mjs gains a static import of run-marker.mjs; a module that cannot load makes node exit 1, the checker's ESCAPE code, so a crash reads as an escape — safe in direction, wrong in cause."
  evidence: "`makeDefaultProbeSandbox()` reproduces **three** runtime signals: `pharn.config.json` (copied), `.dev/floor/` (created), and **a fresh run marker** written by `run-marker.mjs`'s own `openRun()`"
```

## Grillers — results by axis

- **testability** — Layer 1: a verification section is present (`## Evals and tests to write (P1)`); presence
  recognized. Layer 2 (adequacy): the two P1 findings above.
- **security** — scanner clean (no secret literal). Layer 2: the relaxation itself is D2, the maintainer's
  decision, and is stated with its bounds; the concerns worth raising are the P0 quantifier, the fail-open on a
  hook crash, and the P2 trust-audit gaps above. No further finding.
- **privacy** — scanner clean. The ship/review marker records a platform session id, as the loop marker
  already does, in gitignored `.pharn/` state. No personal data. No finding.
- **migrations** — scanner `mentions:true` at line 366. The change touches no persisted schema: the reconcile
  baseline keeps `RECORD_VERSION` 1 and legacy records still read, and the markers are new gitignored runtime
  files. A migration note is declared; its content was not pinned — covered by the P6 finding at line 320,
  which now pins it with a rollback line.
- **observability** — scanner `mentions:true` at line 145, an incidental "append log". The operationally
  significant state (which posture is active, which run is open) is surfaced where it matters, in the deny
  message's RUN block (each marker's path and age), and the hook's cost is measured into `BUILD.md`. No
  absence finding.
- **performance** — the marker scan runs only in the install posture with no usable scope, costs one
  `readdir` per state directory plus one `lstat` per entry, and is measured at build (L24). No finding.
- **error-handling** — the fail-open on a hook crash (P0, line 202) and the untested scan-error rule (P1,
  line 135). Refusal paths are otherwise planned: writer refusals, the malformed record, the runner's
  `finally`, `apply.sh`'s restore-on-failure.
- **architecture** — the design fits the repo's patterns (one writer per schema; deliberate copies pinned by
  execution; a floor script invoked by commands). The placement defects are the P0/P7 findings on lines 168,
  170 and 176.
- **coupling** — the guard reads directory layouts owned by two other files (`require-loop-record.cjs`,
  `run-marker.mjs`), pinned by executing each real writer against the real hook; acceptable. One finding
  (P3, line 254).
- **documentation** / **comprehension** — the decisions carry their reasons (Decisions for GATE 1, "Why not
  `mark-phase.mjs`", the GATE-1 record). The sweep misses are the P0 findings on lines 77 and 91 and the P6
  finding on line 92.
- **a11y** — nothing user-interface-shaped is built. No finding.
- **i18n** — scanner clean; the deny messages are English developer diagnostics like every existing one. No
  finding.

## Dispositions — what changed in PLAN.md

The plan was still pre-build, so every finding that showed a real defect was amended in place, under
`/pharn-dev-plan`'s scope for `PLAN.md`. Each amended line in the plan names its finding id (G1–G14 below,
in the order of this list).

| id  | finding (line)                                  | disposition                                                                                                                                                                                            |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| G1  | P0, ship close unreachable on a STOP (170)      | **Amended** — `--close pharn-ship` moves to Step 3a, right after `run-stop` (the one step stated to run on every exit that ends the run); every later write is under an explicit scope.                |
| G2  | P7, ship open before GATE 1 (168)               | **Amended** — `--open pharn-ship` moves to right after the GATE-1 resume backstop (`check-spec-approved.mjs` exit 0), before `/pharn-plan`; GATE 1 now opens no run.                                   |
| G3  | P7, review open before its ask points (176)     | **Amended** — `--open pharn-review` moves to just before Step 3, after the last ask point (Step 1b) and before any untrusted content.                                                                  |
| G4  | P0, "denies only … allows every other" (5, 302) | **Amended** — the increment line, the guarantee audit and the LIMITS draft now name `.pharn/writes-scope.json`, in-project vs out-of-project, and `protect-trusted-paths.cjs`'s set.                   |
| G5  | P0, finding-shape.md missed by the sweep (77)   | **Amended** — `pharn/pharn-contracts/finding-shape.md` added to `## Files` with the two corrected sentences (§10); Files now parses to 36 paths.                                                       |
| G6  | P0, LIMITS §1d quantifier (91)                  | **Amended** — §1d gains a posture qualifier in the LIMITS patch draft; the sweep reclassifies it as "becomes false".                                                                                   |
| G7  | P0, fail-open on a hook crash (202)             | **Amended** — new §5b: the decision loop runs inside a `try/catch` that denies (exit 2); pinned by source shape, stated as presence only; the one deliberate dev-posture change is on this error path. |
| G8  | P1, D1 measured once (224)                      | **Amended** — three golden dev-posture messages, captured from the HEAD hook before the new hook is written, pinned as exact strings.                                                                  |
| G9  | P6, CLI behavior from memory (320)              | **Amended** — labelled ADVISORY with its source (pharn-cli 0.5.0 @765eec4, the 0.1 pre-check); the CHANGELOG migration note's five points, rollback included, are pinned in §11.                       |
| G10 | P6, SECURITY.md classification (92)             | **Classification sharpened, no file change** — with no scope set there is no active scope to be outside of, so the sentence stays true; the reason is now written.                                     |
| G11 | P2, trust-audit gaps (528)                      | **Amended** — the trust audit states the reversed flip direction and that closing a marker adds no power; follow-up `dev-posture-pin` recorded, not built (P7: no observed failure).                   |
| G12 | P5, "iff" (125)                                 | **Amended** — "A run is open when … and also whenever the scan cannot tell".                                                                                                                           |
| G13 | P3, reconcile import crash label (254)          | **Not amended** — the direction is fail-closed and the existing `reconcile-baseline.mjs` import already has the property; recorded as follow-up `reconcile-import-crash-label` (P7).                   |
| G14 | P1, scan-error rule untested (135)              | **Amended** — an unreadable state directory (`chmod 000`, skipped as root) is added to the marker tests.                                                                                               |

The GATE-1 amendment (not a grill finding) is applied as well: `apply.sh` keeps `--require-baseline`; the
human runs it in the build stage's worktree, after the orchestrator fast-forwards that worktree to the phase
branch; the plan states that verify reads a baseline only where one was anchored.

## Summary

The plan's core design holds up under interrogation: a three-posture table, a marker the guard reads by
presence and age only, a reconcile probe that answers with the strict default, and every copy pinned by
executing the real writer against the real hook. The defects were at the edges. The placements of two
markers were wrong. Open too early, they would re-create the trigger (a person blocked while no PHARN
command is working) through an abandoned gate. Closed too late, the ship marker was reached through a
pointer the ship command itself calls ambiguous. Two universal quantifiers would have shipped false in
`LIMITS.md`, the same L37 shape this repo keeps recording. The referent sweep missed one shipped contract
(`finding-shape.md`). And the hook was not required to fail closed on a crash. All of these were amended
before the build. Two minor items stay as named follow-ups.

Nothing in the plan read as an instruction to this stage; no injection was observed.

**ADVISORY VERDICT: 14 concerns raised (0 blocking-severity, 7 important, 7 minor) — for the human to weigh
before `/pharn-dev-build`. 12 were amended in `PLAN.md`, 1 was resolved by a sharpened classification, and 1
is recorded as a follow-up.** This covers the interrogation only; the Step 1b floor verdict (GREEN, exit 0) is
reported in the header and is not part of this count. Never read this as "the plan is good".
