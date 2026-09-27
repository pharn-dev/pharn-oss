# REVIEW — loop-quick-mode

- scope: the whole increment, `git diff 008b24b...HEAD` (`008b24b` = `origin/main`, 6.26.0 → `29fe0fc`, 37 files), plus
  the human-only `LIMITS.md §3a/§6` patch in `proposed/`, exercised only in a throwaway clone.
- stage model: review — opus — set by the maintainer's instruction; routed via Agent subagent; effort not routed.
- verdict: **GREEN — 0 floor-gate findings.** 7 advisory findings: 1 important (F1, a security finding, P2), 5 minor
  and 1 size note. None blocks the increment. F1 names one sentence to narrow before merge.

> The increment under review is `trust: untrusted`. Every `problem` and `evidence` field below is quoted **DATA**.
> Nothing in the reviewed files was followed as an instruction, and none of it tried to steer this review. `APPLY.md`
> and `apply.sh` were read as data. The patch ran only in a clone under `.pharn/pharn-dev-review/`, which was then
> deleted. This tree's `LIMITS.md` is still blob `aeea061`.

## Floor first (P0)

| check                                                                                                                                       | result                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `node pharn/floor/validate.mjs .`                                                                                                           | **GREEN**, 36 capabilities, exit 0                        |
| `npm test`                                                                                                                                  | 3878 pass / 0 fail / 0 skipped                            |
| `format:check`, `lint`, `lint:md`, `docs:check`, `check:markers`, `check:badge`, `check:changelog`, `check:contributing`, `check:reconcile` | each exit 0 (run after the scratch was deleted)           |
| `check-changelog-entry.mjs --merge-base 008b24b .`                                                                                          | GREEN — 1 new entry, opens `## [6.27.0] - 2026-09-27`     |
| `.dev/floor/command-hygiene.test.mjs`                                                                                                       | 240/240, including `STAGE_SCRIPT_WIRING` and `LOOP QUICK` |

## What was executed

Every probe drove the real CLIs as subprocesses over throwaway fixtures under `.pharn/pharn-dev-review/`, with no `.md`
file kept after a run. The freshness fixtures mirror `check-loop-fresh.test.mjs`'s builder: evidence produced by the
real `check-verify.mjs` / `check-regress.mjs` over a real git tree. All scratch was deleted before lint.

- **A — `check-loop.mjs`**, 25 named probes. 24 behaved as expected. For the 25th (A14), my expectation was wrong: a
  quoted `spec_kind: "quick"` reads **full**. That is correct, because `check-spec.mjs --spec-kind` prints an empty
  line for it, so the parity holds. Three more runs were grouped:
  - a 320-case matrix (4 kinds × 8 verify × 5 regress × 2 iter/cap), with **zero violations** of the token binding;
  - six broken-module variants of `loop-mode-core.mjs`, each of which read **full**;
  - the SPEC that decides is the one beside the verify report, never the one beside the regress path.
- **F — full-mode identity.** `008b24b`'s `check-loop.mjs` against this branch's, over **1,200** non-quick cases: the
  exit codes and JSON are identical apart from the added `mode` key.
- **B — `check-loop-record.mjs`**, 19 probes. **C — `check-loop-decision.mjs`**, 17 probes. **D —
  `check-loop-fresh.mjs` (CLI)**, 27 probes over `--iter --front` and `--commit-gate --front`. Every result was as
  expected.
- **S / Q / C — the quick scope check.** The committed listing and scope line, substituted literally as the command
  instructs, over a realistic feature directory and over hostile names (F1).
- **P — the patch**, 16 probes in a throwaway clone. Every result was as expected.

## Answers to the brief

### Mode binding (grill G1)

- **Quick recorded or re-derived as full is caught.** A `STOP_GREEN_QUICK` record with no `mode`, or with
  `mode: full`, is RED in `check-loop-record.mjs` (B2, B3). `check-loop-decision.mjs` reports `MODE_MISMATCH` for it
  (C2).
- **Full recorded as quick is caught.** `STOP_GREEN` with `mode: quick` is RED (B4) and a `MODE_MISMATCH` (C3). So is
  a quick `STOP_CAP` record over a feature SPEC (C5).
- **The re-derivation reads the right SPEC.** It always reads the SPEC in the record's own directory (A24, C17). It
  reads it in any state: a quick `STOP_CAP` over a SPEC reverted the Step-6a way re-derives GREEN (C4).
- **D8's `MODE_MISMATCH` fires in both directions:** C2 (quick SPEC, record full) and C3 (feature SPEC, record
  quick).
- **A `mode: quick` edit does clear the RED.** B2 turns into B1. In C10, a D8 record rewritten to `mode: quick`
  re-derives GREEN, even over a quick SPEC with a `regressions` report on disk. Two advisory steps are all that stand
  in the way: Step 6b's no-repair rule and Step 6c's "a full run commits only `STOP_GREEN`".
  `pharn-loop.md:434-441` and `:460-462` state exactly that dependency. It is a disclosed residual, not a new finding.
- **A full SPEC under `--quick` never yields a weaker green.** The first stop is S6c at the kind read, which the model
  obeys (advisory). If that is skipped, freshness reads full and asks for a `regress` re-run (D7), which is S11, and
  the stop reads `INCONCLUSIVE` (A4). If regress then runs anyway, the evidence is full-mode, and the `STOP_GREEN`
  record carrying `mode: quick` is RED in both checkers (B4, C3).
- **A quick SPEC under the full loop is D8.** It stops on `STOP_GREEN_QUICK` (A1, D6b), and that stop is not
  committed as long as the record's `mode` is written faithfully (C2).

### Stop soundness

- **Quick mode cannot reach `STOP_GREEN`.** Over the 320-case matrix, a quick SPEC never yields `STOP_GREEN`, a
  non-quick SPEC never yields `STOP_GREEN_QUICK`, and `STOP_GREEN_QUICK` never occurs without verify `PASS` (A22).
- **"Verify PASS on this tree" is bound by the quick column.**
  - A forged `PASS` over a failing stamp is a STOP at E, both at the decision and at the commit gate (D4, D4b).
  - A moved tree is a RERUN of verify at the decision and a STOP at the commit gate (D5, D5b).
  - A missing report is a RERUN, or a STOP at the commit gate (D3). An unbound report is a RERUN (D13), and so is a
    missing stamp (D14).
  - An edited log or results file is a STOP at J (D10, D11). A lapse `reason_code` is a RERUN (B, D12).
- **Without freshness, a forgery passes.** The forged `PASS` goes through `check-loop.mjs` and
  `check-loop-decision.mjs` both (D4c). What holds it back is the order the command runs things in, which is advisory
  — the same as in full mode.
- **A missing regress report is never opened in quick mode** (A1, A3, C7, D1, D2), and a stale `regressions` report
  is ignored (D6). In full mode a missing report is `INCONCLUSIVE` (A4, C6).
- **Checks skipped rather than replaced.** G and H are skipped by design, because they have nothing to bind. The one
  real gap is the scope check that stands in for regress's partition: it leaves no artifact, so nothing downstream
  sees whether it ran (F2).
- **Does the kept scope check gate?** The committed line exits `1` on a stray file, on an undeclared deletion, and on
  an unexpected file in the feature directory. It exits `0` on a clean iteration with all 8 pipeline artifacts
  untracked (S1–S5). It can also false-pass, and the shell runs command substitutions found in file names (F1).

### Fail-closed modules (grill G8)

- **`check-loop.mjs`** over a broken `loop-mode-core.mjs` reads **full** in all six variants: a syntax error, no
  exports, a missing file, a throwing `loopModeOf`, a non-member return and a top-level throw. A quick SPEC then gives
  `INCONCLUSIVE`, and a feature SPEC still gives `STOP_GREEN` (A23).
- **`check-loop-fresh.mjs`** with the module unloadable gives `INCONCLUSIVE checker-crashed`, with `mode: null`, in
  both modes (D15).
- **The two record checkers** fail to load (C16: exit 1, empty stdout). That never reads as GREEN, so it is
  fail-closed, but it is not the mechanism `check-loop.mjs`'s header describes (F3).
- **A malformed `mode` or an unknown token** is RED in both checkers (B5–B5g, C9). Duplicate `mode:` lines resolve
  last-wins in both, so the two stay consistent (B6, B6b). A blocked record's bogus `mode` is RED in the shape check
  and SKIPPED in the decision check (C11).
- **A legacy `LOOP.md` with no `mode` reads full.** Its `STOP_GREEN` over a feature SPEC is GREEN (C8), and over a
  quick SPEC it is RED (C14).
- **The SPEC reading fails toward full on every doubt:** a legacy SPEC, two kind lines, a kind in the body, a
  directory, an unreadable file, `Quick` and a quoted `"quick"` (A8–A14).

### The merge with 1.2 (`stage-verify-script`)

- **The thin caller is invoked as required.** `## Quick mode` item 5 runs `/pharn-verify` "exactly as a full
  iteration runs it", through `stage-verify.mjs`, and maps its exits by Step 2's verify stage-exit rows. The quick
  question table's verify row matches (S4 / S9).
- **The stamp path holds in both modes.** `DEFAULT_STAMPS.verify` is `${VERIFY_PATHS.gates}/stamp.json`, which equals
  `stage-verify.mjs`'s `STAMP` (`:123`). No mode branch touches a path, and the quick D-probes read the default.
- **Both sets of pins bind the merged text.** `STAGE_SCRIPT_WIRING` (3 tests) and the LOOP QUICK and `STOP_GREEN`
  closure pins (17 tests) all pass.
- **Not tested:** no test has quick mode read `stage-verify.mjs`'s real output, because 1.2's ★ LOOP-FRESH uses a
  legacy, full-mode SPEC. The quick column reads the same verify evidence, so this is noted, not a finding.

### P0 — claims stronger than the code

These are F1 (its claim part) and F2–F6. **"No regress" never reads as "no regressions".** Every added sentence says
"no regression verdict read", "claims no regression check" or "no regression outside the feature was looked for", and
`check-loop.mjs`'s quick reason string says the same. One small note: in quick mode `check-loop.mjs`'s JSON
`floor_green` means verify `PASS` alone. Its header documents that, and no consumer reads the field.

### Size — see F7. The patch — see "The human-only patch" below

## Floor-gate findings (blocking)

None. `validate.mjs` is GREEN and agrees with the eval lens (no `role:` capability was added). No guarantee in the
increment is claimed without a floor reduction or an `advisory` label. Every FLOOR label was checked by execution,
above.

## Advisory findings (each rests on this review's judgment; severity is advisory)

### F1 — the quick scope line interpolates untrusted paths into a shell string (security)

```yaml
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".claude/commands/pharn-loop.md:370"
  problem: "The pinned quick scope line substitutes two untrusted path lists — the git listing of changed and untracked files, and PLAN.md / AC-TESTS.md ## Files — into double-quoted shell arguments, so a path carrying $(...) or a backtick is run by the orchestrator's own shell, and a path carrying $VAR or a comma can turn an undeclared change into declared or exempt paths — a false pass — contradicting the section's claim that the listing's divergence is a false S9 and never a false pass."
  evidence: 'node pharn/floor/check-regress.mjs scope --changed "<inside, comma-separated>" --declared "<PLAN.md ## Files paths, plus AC-TESTS.md ## Files paths when that file exists>" --feature "<name>"'
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".claude/commands/pharn-loop.md:379"
  problem: "The stated divergence is narrower than the code: shell expansion inside the double quotes, and the comma split, both produce false passes, so 'never a false pass' and 'so both modes stop there' are false for the quick listing."
  evidence: "reaches `--changed` quoted and reads as escaped — a false S9, never a false pass. A path containing a comma is split by the line's list parse and reads as escaped too; the script's partition refuses such a path instead (`unusable`, S9), so both modes stop there."
```

**Reproduction.** A git fixture seeded with `src/x.js`, which is then modified: the declared change. Each case ran the
committed listing lines, removed `.pharn/` paths, and substituted the lists literally into the committed line under
`sh -c`.

- **Q1.** An undeclared, untracked `src/x$Q.js`, with `src/x.js` declared. The result is **exit 0, `escaped: []` — a
  false pass.** The shell expands `$Q` to nothing, so the name reads as `src/x.js`.
- **Q2.** An untracked `src/$(touch INJECTED).js`. **`INJECTED` is created** by the scope line's shell.
- **Q3.** A declared path (from `## Files`) `src/$(touch INJECTED2).js`. **`INJECTED2` is created.**
- **C1 and C2.** Undeclared files at the paths `src/x.js,src/x.js` and `pharn/features/demo/SPEC.md,src/x.js`, run
  through `check-regress.mjs scope` directly. Both give **exit 0, a false pass.** Each piece of the split is declared
  or exempt. `stage-regress.mjs`'s partition refuses such a path instead.

**Scope, stated.** The same literal already ships as `/pharn-ship --quick`'s item 7 (`pharn-ship.md:246`, 6.25.0,
pinned as `QUICK_SCOPE_LINE`). Two things are new in this increment: an **unattended** call site, and the "never a
false pass" claim, which comes from the grill G2 fold. The attacker capability sits inside the residual the command
already states: code built from unread intent runs before any person sees it (`pharn-loop.md:1153-1156`).

Elsewhere the command takes care that a path never reaches a shell: Step 6c's staging builder passes paths as argv
so that "a path is never parsed as shell" (`:888-889`), and the slug line validates its one value before it is
typed (`:114-122`). This line parses paths as shell. Downstream, `reconcile` catches a
post-anchor Bash write of such a name, and nothing catches a pre-anchor one. This is L5's class recurring (the
proposed lesson below).

**Fix.** Strike "never a false pass" at `:379-383` now. Then either single-quote both lists and stop (S9) on any
listed path containing `'` or `,`, or build the lists by code with `-z` and argv (the pending
`quick-scope-inputs-by-code`). Do it in both commands and in `QUICK_SCOPE_LINE`. When the patch is regenerated, the
`LIMITS §6` clause "which run the same partition" could read "which run a model-assembled version of that partition".

### F2 — the quick scope check is unbound downstream, and the text does not say so

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-loop.md:456"
  problem: "The quick scope check leaves no artifact, so a skipped or ignored check is invisible downstream — check-loop-fresh skips G and H with nothing in their place and the commit gate re-runs only freshness — whereas in full mode a scope escape removes the regression report and can never reach STOP_GREEN; the audit bullet and the LIMITS §3a paragraph ('It keeps ... the scope check and the freshness check') leave that difference unstated, and the new paragraph drops the '(within the bounds §6 states)' qualifier its /pharn-ship sibling carries."
  evidence: '_"A changed file outside the declared files stops a quick loop"_ → the exit is **FLOOR** (`check-regress.mjs scope`); running it and assembling its inputs are **ADVISORY** (item 5)'
```

**Fix.** Add one clause to the audit bullet: "nothing downstream re-checks it — it leaves no artifact, freshness skips
G and H, and the commit gate does not re-run it". When the patch is regenerated, carry the "within the bounds §6
states" qualifier into the `§3a` paragraph.

### F3 — `check-loop.mjs`'s header names a fallback that `check-loop-decision.mjs` no longer has

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/check-loop.mjs:26"
  problem: "The header says the load-failure fallback to the full table also holds in check-loop-decision.mjs's re-run of this file, but check-loop-decision.mjs:95 and check-loop-record.mjs:98 import LOOP_MODES statically from loop-mode-core.mjs (BUILD.md deviation 1), so an unloadable module stops both record checkers at load, before any re-run — fail-closed, since exit 1 is never GREEN, but the stated mechanism does not exist, and both checkers then fail on full-mode records too."
  evidence: "so the quick machinery can only fail toward more evidence (D3) — here and in check-loop-decision.mjs's re-run of this file."
```

**Reproduction (C16).** A copied floor with `loop-mode-core.mjs` replaced by `export const = ;`, run with a valid full
`STOP_GREEN` record. `check-loop-decision.mjs` exits 1 with empty stdout and `SyntaxError` on stderr.
`check-loop-record.mjs` also exits 1. **Fix:** replace the clause with "check-loop-decision.mjs and check-loop-record.mjs
import its vocabulary statically and fail to load (exit 1, never GREEN)".

### F4 — `spec-template.md` presents a floor backstop in the wrong order

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/spec-template.md:224"
  problem: "The S9 stop is what happens when Step 4a's advisory refusal holds (the Draft stays unapproved); when Step 4a fails, the model has approved the SPEC and check-spec-approved passes, so 'failing that' presents a floor backstop for the advisory step that does not exist — only D8's uncommitted STOP_GREEN_QUICK remains (the PLAN's trust audit had 'then')."
  evidence: "failing that, `check-spec-approved.mjs` exits non-zero on the unapproved Draft and the run stops (S9 — floor); and a"
```

**Fix:** change "failing that," to "then".

### F5 — full-mode descriptions left unqualified for a quick run

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-loop.md:631"
  problem: "Three places describe what FRESH or a green stop certifies in regress terms, with no quick qualifier: Step 5.3's FRESH bullet, the retry paragraph at :689-691 ('/pharn-regress and /pharn-verify recompute their verdicts every iteration') and the guarantee audit's freshness bullet at :1060-1069. But ## Quick mode says every other line runs as written for --quick, and in quick mode G and H are skipped and no regress runs. Separately, README.md:806-807 says a change too large for the flag 'takes the full pipeline', whereas under /pharn-loop --quick it stops at S6c."
  evidence: "bound to its stamp by hash, the verify stamp describes the live tree, the regress head stamp ended on the tree verify started from, the base stamp is `<base sha>`"
```

**Fix.** Add a "(full mode — a quick run: `## Quick mode` item 6)" qualifier at each of the three sites. In the README,
write "stops (S6c) or takes the full pipeline".

### F6 — Step 5.4's exit-0 bullet ties the quick green to the invocation, not to the SPEC's kind

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-loop.md:673"
  problem: "The table follows the SPEC's kind, so a run invoked without --quick over a quick SPEC (D8) exits 0 with STOP_GREEN_QUICK — possibly over a regressions report on disk (probe D6b) — while this bullet tells it that exit 0 means verify PASS ∧ no-regressions; Step 6 still handles it correctly (it copies the decision from the JSON, and 6a and 6c refuse it), so the bullet misdescribes that case rather than misrouting it."
  evidence: "**`0` `STOP_GREEN`** — verify `PASS` ∧ regress `no-regressions`. Go to Step 6. **In a quick run exit `0` is `STOP_GREEN_QUICK`**"
```

**Fix:** "exit `0` is the green of the table the SPEC's kind chose — `STOP_GREEN` or `STOP_GREEN_QUICK`; read `decision`
from the JSON".

### F7 — size: every loop run pays about 20 KB more (token-reduction roadmap; advisory)

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".claude/commands/pharn-loop.md:303"
  problem: "pharn-loop.md grows from 78,020 B to 97,748 B (+19,728 B; ## Quick mode 14,784 B, the rest outside it, the description +740 B), and every run carries it, full or quick. A quick run nets out, because it drops the 19,683 B regress prompt each iteration, but a full run only pays. About 4.9 KB of the section is rationale or audit rather than instruction, a second reason for the file to change alongside its procedure, which roadmap Phase 4.1 would move to a contract."
  evidence: "## Quick mode — `/pharn-loop --quick` (6.27.0)"
```

**The bytes that are rationale, measured on this HEAD:**

- the mode-binding paragraph, 522 B;
- the D8 paragraph, 852 B;
- the quick guarantee audit, 2,266 B;
- item 5's divergence note, 456 B (currently inaccurate — F1);
- the first-token rule's bound, about 400 B;
- item 1's note on the mode marker, about 150 B.

Beyond those, about 2 KB of the 2,912 B question table restates Step 2 rows "as today". Only four rows are
quick-only: S6c twice, the scope check's S9, and a `regress` RERUN's S11.

**Could `## Quick mode` live in a file the loop reads only under `--quick`? Yes, without weakening any pinned line.**
Every delta removes or narrows a step. So a run that fails to read the file falls toward the full flow (more checks)
or toward a `MODE_MISMATCH`, which is an uncommitted green, never toward a weaker one. The two floor readers,
`check-loop.mjs` and `check-loop-fresh.mjs`, take the mode from the SPEC, not from this prose. Four conditions apply:

1. The file must sit outside `.claude/commands/`, or it registers as a slash command.
2. `LOOP_QUICK_WIRING` and the two ★ tests must be re-pointed at it: "exactly once in the file" becomes once there
   and zero in `pharn-loop.md`.
3. The S6c row, Step 6b's `mode` capture and no-repair sentences, and the four skip-site pointers stay in
   `pharn-loop.md`, since full-mode steps read them.
4. The grill G7 closure then becomes moot.

The saving is about 13–14 KB per full-run read.

## The human-only patch — `LIMITS.md §3a` / `§6` and `apply.sh`

All 16 probes ran in a throwaway clone of this tree under `.pharn/pharn-dev-review/clone`, since deleted. Nothing was
applied here.

- **Byte hygiene.** There is no CR in `human-only.patch`, `human-only.sha256`, `apply.sh`, or the applied
  `LIMITS.md`. `apply.sh` is byte-identical to the block `PLAN.md` Design §10 pins.
- **Determinism.** `make-patch.mjs`, re-run at `29fe0fc`, regenerates the committed patch and sums byte for byte, and
  leaves no scratch behind.
- **`git apply --check`** passes on the clean tree.
- **`apply.sh` on the phase branch** exits 0 and makes one commit, touching only `LIMITS.md`, with the pinned message.
  The applied bytes hash to `3e9ae509…d446` (raw `shasum`), which equals `human-only.sha256`. The diffstat is
  `14 / 3`.
- **Exactly once.** Each edit is present exactly once: the new `§3a` paragraph, the "gated" rename and the `§6`
  clause. No "The manual flag is" remains. Re-running the generator over the applied file **refuses**
  (`matched 0 time(s)`), so the patch cannot be applied twice.
- **Markers preserved.** `validate.mjs` is GREEN (36) and `check-specified-markers.mjs` is GREEN over the applied tree
  at the real path, and they are the same two checks `apply.sh` runs.
- **It refuses on `main`.** On the clone's own `main`, it exits 1 with "refusing to commit a trusted-doc change on
  main", with the tree clean and `HEAD` unchanged.
- **No overlap with `stage-model-routing`'s §8.** Both patches start from base blob `aeea061`. This patch's hunks sit
  at lines 127–146 and 270–277, and §8's sit at 386–433. §8's patch was applied first, with its own sums matching.
  - The **stale** patch then fails: `git apply --check` passes, since the hunks are disjoint, but the whole-file sums
    refuse it. `LIMITS.md` is restored from the index and nothing is committed.
  - **Regenerated** with `make-patch.mjs`, which printed `b6c2c6d6…b730`, the patch applies. §8's new text, the new
    `§3a` paragraph and the `§6` clause are each present once, and `validate` and `check-specified-markers` are GREEN.
  - In the reverse order, §8's committed patch still passes `git apply --check` over this one. Its own sums would need
    that sibling's regeneration.

**Safe to apply as is: yes, mechanically.** Every check above holds, and the documented order works:
`stage-model-routing`'s §8 first, then `make-patch.mjs`, then `apply.sh`. The content has two optional wording
points, which a human may fold in at that regeneration since it is needed anyway: `§6`'s "which run the same
partition" (F1), and `§3a`'s scope check without its `§6` bound (F2).

## Lenses

- **L-floor (P0) — F1–F6.** Every FLOOR label in the increment was checked by execution:
  - the quick table and the token binding (A22);
  - the kind reading and its CLI parity (A7–A14);
  - the quick freshness column (D1–D16);
  - both record checks (B, C);
  - full-mode identity with 6.26.0 (F, 1,200 cases).

  No guarantee is unlabeled. The overclaims are sentences inside advisory-labeled or bounded text.

- **L-eval (P1) — no finding.** No `role:` capability was added, so no eval pair is owed, and `validate.mjs` agrees.
  Every new module ships with tests: `loop-mode-core.test.mjs` 20, and `check-loop` / `check-loop-fresh` /
  `check-loop-record` / `check-loop-decision` gained per-member cases.
- **L-trust (P2) — F1.** The record's `mode` is untrusted, shape-gated and compared, and it never selects a table.
  `check-loop.mjs` refuses every flag but `--iter` and `--cap` (A15), and the record is never one of its inputs.
- **L-axis (P3) — F7 only.**
  - No `pharn-*` module references a sibling. `loop-mode-core.mjs` has one axis, `LOOP_MODES` has one owner, and the
    kind reading stays in `spec-template-core.mjs`.
  - The dev generator imports 3.1's `make-patch.mjs`. That is a deliberate, documented cross-record reference in the
    build apparatus, between records frozen once merged. Noted, not a finding.

## Proposed lesson candidate (for a separate, human-gated `/pharn-dev-memory-promote`; not written to canon)

```yaml
target: .dev/memory-bank/lessons-learned.md
title: 'Double quotes are not a boundary for untrusted text — a pinned line that substitutes a path list into "…" lets $ and backticks rewrite it or run it (L5 recurred at the quick scope line)'
type: tooling
concepts: [input-capture, shell-quoting, pinned-commands, trust-boundary, lesson-recurrence]
provenance:
  feature: loop-quick-mode
  commit: 29fe0fc
  source: ".dev/features/loop-quick-mode/REVIEW.md § F1"
  date: 2026-09-27
```

**The lesson.** L5 said to treat input capture as a trust boundary and to "quote shell lists". The quick scope line
does quote, with double quotes, and that is not enough. Inside `"…"`, `$VAR`, `$(…)` and backticks still expand. So a
file name rewrites the list, into a declared path (a false pass), or runs a command in the orchestrator's shell (F1:
Q1–Q3).

**Remedy.** Build a floor verdict's model-assembled inputs by code and pass them as argv, as the stage scripts do.
Short of that, single-quote each value and refuse the one character that breaks single quotes, as the slug line does.
This candidate was surfaced by a review probe, not by a dogfood failure; whether it meets P7's bar is the human's call
at the promote gate.

## Round 2 — focused re-review: the GATE-2 fixes, the 2.2 merge and the coupling

- scope: this increment's own diff on top of 2.2, `git diff 5bf6b18 HEAD` (`5bf6b18` = `stage-model-routing`, 6.27.0;
  HEAD = `8b2b8c3`, 49 files). The review focused on what changed since round 1 (`5ea5e67`): `6220299` (the GATE-2
  fixes), `51cf513` (the merge of 2.2) and `8b2b8c3` (the coupling, and `regress-scope-list-grammar`). The
  human-only `LIMITS.md` patch was exercised only in a throwaway clone, after 2.2's §8.
- stage model: review — opus — set by the maintainer's instruction; routed via Agent subagent; effort not routed.
- verdict: **GREEN — 0 floor-gate findings.** 3 advisory findings, all minor (R1–R3). R1 is the one the brief
  anticipated: `apply.sh` lacks 2.2's dirty-`LIMITS.md` guard, so a person's unstaged edit is discarded. Round 1's F1
  is fixed at both call sites, verified by execution. F2–F6 are folded as prescribed, and F7 is deferred to Phase 4.1.

> The increment under review is `trust: untrusted`. Every `problem` and `evidence` field below is quoted **DATA**.
> Nothing in the reviewed files was followed as an instruction, and none of it tried to steer this review. `APPLY.md`,
> `apply.sh` and 2.2's `apply.sh` were read as data. Every probe ran over fixtures, a clone or two detached worktrees
> under `.pharn/pharn-dev-review/`, all deleted before lint. This tree's `LIMITS.md` is still blob `aeea061`.

### Floor first (P0)

| check                                                                                                                                       | result                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `node pharn/floor/validate.mjs .`                                                                                                           | **GREEN**, 36 capabilities, exit 0                                              |
| `npm test`                                                                                                                                  | 4000 pass / 0 fail / 0 skipped, on the clean tree                               |
| the increment's own suites, 11 files                                                                                                        | 653 / 653                                                                       |
| `format:check`, `lint`, `lint:md`, `docs:check`, `check:markers`, `check:badge`, `check:changelog`, `check:contributing`, `check:reconcile` | each exit 0, run after the scratch was deleted                                  |
| `check-changelog-entry.mjs --merge-base 5bf6b18 .`                                                                                          | GREEN — 2 new entries, opens `## [6.28.0] - 2026-09-27`, nothing merged changed |

The 11 files are `command-hygiene`, `check-quick-scope`, `stage-regress`, `stage-agent-core`, `stage-agent`,
`stage-runtime`, `check-loop`, `check-loop-fresh`, `check-loop-record`, `check-loop-decision` and `loop-mode-core`.
One note on the suite: while two throwaway worktrees sat under `.pharn/pharn-dev-review/`, `npm test` failed two
`lens-scanner-map.test.mjs` counts (22 lenses expected, 66 found). Removing them restored 4000/4000. It is a probe
artifact, not a defect of this increment: the sibling-worktree hazard reaches `.pharn/` too.

### What was executed

Every probe drove the real scripts as subprocesses. The committed lines were read out of both command files and run
under `sh -c`, with only `<name>` and `<base sha>` substituted. `5bf6b18`'s floor (2.2, the pre-change code) ran from a
detached worktree beside HEAD's, over byte-identical copies of each fixture.

- **H — hostile names.** 24 of them, each an untracked, undeclared file, went through both committed lines and then
  through HEAD's `stage-regress.mjs` on the same tree. Three more were declared.
- **I — inputs**, 34 cases:
  - a symlinked, case-variant, missing, directory, `## Files`-less, empty-`## Files`, unreadable or binary `PLAN.md`;
  - a directory, unreadable, malformed or dangling `AC-TESTS.md`;
  - ten non-commit bases, and a file named like the base;
  - four bad slugs and a symlinked feature directory;
  - three crashes, and a run from a subdirectory.
- **P — parity and byte identity.** 15 trees went through the old `stage-regress.mjs`, the new one and the quick line.
- **O — the list-grammar fix and its residual**, old against new, plus a residual run after a green one.
- **R — the route matrix**, 56 cells (2 commands × 4 modes × 7 stages), HEAD against `5bf6b18`.
- **A — `report` → `read`**, 57 cases over every routed loop stage and eleven rows.
- **B — every brief**: 26 full-mode briefs, HEAD against `5bf6b18`, and every quick brief against its full twin.
- **M — 16 mutants** of the real `pharn-loop.md`, each run through the real hygiene suite in a detached worktree.
- **G — the merge**: every fenced line each side added, looked up in HEAD.
- **C — `check-regress.mjs`'s CLI**: 13 argv sets, old against new.
- **L — the patch**, eight steps in a clone. 2.2's §8 went in by its own `apply.sh`, then this increment's patch, stale
  and regenerated.
- **W — a nested worktree**, to see how git lists one.

### Answers to the brief

#### F1's fix, in both pinned lines as written

- **Both lines are one line:** `node pharn/floor/check-quick-scope.mjs --feature '<name>' --base '<base sha>'`. It is
  byte-identical in `pharn-loop.md` item 5 and `pharn-ship.md` item 7.
- **Hostile names (H).** All 24 exit **1** through both lines, with `escaped` equal to exactly that name, and no
  command ran. The 24 are:
  - `$(touch INJECTED)`, backticks, `;`, `|` and `&&` inside a name;
  - `$Q` and `$HOME`, both quote kinds, a newline, a CR and a backslash;
  - a comma whose halves are declared, and one whose half is exempt (6.25.0's two false passes);
  - `--declared`, `--feature`, `--base` and `-n` as whole names;
  - a space inside a name, before it and after it; a `*`; a non-ASCII name; and `.pharnx/evil.js`.
- **Declared hostile names** pass (exit 0) and run nothing: `src/$(touch INJECTED).js`, `src/a,b.js` and `src/a b.js`.
- **`.pharn/`.** A path under it is never counted, even with no `.gitignore`, while `.pharnx/evil.js` is. A FILE named
  `.pharn` at the root is excluded as the state root, which is also what `stage-regress.mjs` does.
- **Inputs (I).**
  - A missing, unreadable or directory `PLAN.md` → 2 `plan-unreadable`. No `## Files`, or a binary file → 2
    `plan-files-unparseable`. An empty `## Files` → 1, with the build's own change escaped.
  - An `AC-TESTS.md` without `## Files` adds nothing, so its test file escapes (1). A dangling one reads as absent
    (0). A directory or an unreadable one → 2 `crashed`: `existsSync` passes, `readFileSync` throws, and the throw
    is caught.
  - A tree, blob or annotated-tag SHA, or zeros → 2 `base-not-commit`. A short, uppercase, `HEAD`, empty, or
    space- or newline-suffixed base → 2 `usage-error`. A file named like the base → 2 `git-failed`.
  - An uppercase, `..`-bearing or empty slug → 2 `usage-error`. An absent feature → 2 `plan-unreadable`. A
    symlinked feature directory → 2 `path-containment`.
  - A symlinked `PLAN.md` pointing outside the repo at a `**` declaration passes a stray (0), and so does HEAD's
    `stage-regress.mjs` on the same tree. That is the stated bound: a plan that rewrites its own `## Files`
    authorizes what it names. On this APFS volume a case-variant `plan.md` reads as `PLAN.md` in both, and git
    (`core.ignorecase`) lists no change.
- **A crash never reads as clean.** A throw while checking → 2 `crashed` (with `partitionScope` made to throw). A module
  that fails to LOAD → **1** with no JSON: a syntax error in `scope-inputs.mjs`, a missing `scope-inputs.mjs`, and a run
  from a subdirectory. Both callers stop on 1, but they read it as "escaped" (R2).
- **Is any set still model-typed? No path set is.** `scope-inputs.mjs` builds both sets, and nothing from the model
  reaches the checker but the slug and the base. The base's VALUE is still model-chosen. `/pharn-loop` copies its S3
  SHA, and `/pharn-ship` picks a `BASE_RULE` branch and copies git's SHA. The checker proves the value is a commit,
  never that it is the right one. Both commands label that substitution ADVISORY, so it is stated, not a finding.
- **Parity with `stage-regress.mjs` (H, P).** On every tree both reach a decision on, they agree on `inside`,
  `declared`, `escaped` and `escape_exempt`: 20 of 24 hostile trees, and 15 of 15 parity trees.
  - The four that differ are the comma, comma-exempt, newline and CR names. There `stage-regress.mjs` refuses before
    deciding (2 `unrepresentable-path`, the named residual) while the quick line decides.
  - So a declared `src/a,b.js` passes the quick line and stops the full stage. Every divergence points the full stage
    toward a stop, never toward a pass.

#### The regress partition change

- **Byte identity on benign trees (P).** Old and new `stage-regress.mjs` ran over byte-identical copies of 12 benign
  trees. Both print the same stage-exit JSON and write the same `scope.json`, `REGRESSION.md` and
  `regression-report.json`, apart from the stamp digests, which move on every run because a stamp carries times.
  - The trees: a clean change, a deletion, a glob, a stray, exempt artifacts with a trusted doc, the `AC-TESTS.md`
    union and a rename;
  - and outside tests, `./` and trailing-`/` declarations, duplicates across the two `## Files`, and an eval pair.
- **The one benign divergence is an untracked nested repository (R3).** Git lists it as `vendor/lib/`, with the slash,
  and the old CLI stripped the slash. So the bytes differ, and a plan declaring the bare `vendor/lib` flips from `done`
  to `scope-escaped`. A git worktree inside the project, such as `.claude/worktrees/<x>/`, is listed the same way
  (W).
- **The fix holds (O).** An undeclared `src/index.js`, `src/index.js` or lone `--declared` passed the old stage
  (`done/no-regressions`), and each escapes the new one (`refused/scope-escaped`).
- **`check-regress.mjs`'s CLI is unchanged (C).** All 13 argv sets give an identical exit, stdout and stderr, old
  against new.
- **`regress-inside-echo-list` fails closed (O).** A comma, newline or CR changed path is refused as `unusable
unrepresentable-path` in the `partition` phase, before `scope.json` and before any gate.
  - After a green run, the earlier `regression-report.json` and `REGRESSION.md` are gone ("fresh" removed them), and
    nothing replaced them.
  - The verdict call passes `--inside` last, and positionals are only the leading arguments before the first flag.
    So a lone path spelled like a flag cannot capture a stamp flag.
- **Side effects, benign:**
  - An unchanged test file named with a comma used to stop the stage (`unrepresentable-path`, via
    `assertRepresentable(tests)`). It now runs as an outside test and passes.
  - `$(…)` in a test name runs nothing, since the runner passes files as positional arguments.
  - A `*` in a test name is still refused. It is now `run-gates.mjs`'s `bad-scope-json` instead of the CLI's glob
    check, and it is `child-refused` both ways.

#### The coupling

- **The quick column routes exactly per PLAN item 4 (R).**
  - `agent`: spec, plan, test and build.
  - `inline:floor-only` (exit 3): grill and verify.
  - regress is refused (exit 2: it "does not run in pharn-loop's quick mode").
  - The loop's full column and every `/pharn-ship` cell are identical to `5bf6b18`.
- **"Is `route --mode quick` refused for pharn-ship, where the policy has no such column?" The premise does not hold.**
  - `ROUTE_POLICY["pharn-ship"]` has had a quick column since 6.27.0 (2.2), and `route --command pharn-ship --mode
quick` routes exactly as at `5bf6b18`.
  - What is refused (exit 2, for both commands) is `--mode full` spelled out, an unknown mode, and each quick column's
    skipped regress cell.
  - `--mode` on `report` is an unknown argument (exit 2).
- **No stage agent can report a row a checker owns (A).** `report --row` refuses S1, S2, S3, S11, S12, S13, `S6d` and
  `s6c` (exit 2) for every loop stage, so none of them reaches `read`.
  - S6c is reportable by any loop stage agent, not only the spec's. That follows from the flat `LOOP_ROWS` design, and
    it is a stop every time.
  - The command maps a row it does not give that stage to S9. For a non-quick SPEC, the Step-3 kind read, a checker,
    still decides S6c.
- **The full-mode briefs are byte-identical apart from S6c (B).** 19 of 26 are identical to `5bf6b18`.
  - The other seven are the loop's briefs: spec, plan, grill, test, and build at iterations 1, 2 and 3.
  - They differ in two places only: rule 3's row list gains `S6c`, and one `report … --row S6c` line is added.
  - Full-mode rule 7 is byte-identical.
- **The quick fix list reads `verify-report.json` only (B).**
  - The quick build brief at iteration 2 names `.failing_gates[]`, `.completeness.missing[]` and `.ac_gate.acs[]`,
    "each from `pharn/features/demo/verify-report.json` (this mode never runs /pharn-regress, …)".
  - `## Quick mode` item 4's inline paragraph names the same three.
  - The quick spec brief names `/pharn-spec --quick --model-approve`.
  - The plan, test and build briefs differ from full only in their `mode:` label. The quick grill, regress and verify
    have no brief (exit 2).
- **The mode-order and in-section rules bite (M).** All 16 mutants are killed, and the unmutated control passes 40 of 40.
  - Rule 4 (order) kills a quick spec or build brief moved above its route line, and a quick brief carrying
    `--iteration 2` or `--stage pharn-plan`. It also kills the quick spec route line losing its `--mode quick`.
  - Rule 10 (in-section) kills the quick build pair moved into Step 5, the quick grill line duplicated in Step 4, and a
    `--mode` line moved into `## Running a stage`.
  - Rule 3 (policy parity) kills a `--mode quick` verify line, and the quick grill line removed.
  - The G7 closure kills a stage-start marker pasted into the section.
  - Rule 8 kills a de-bolded S6c mapping, and `.regressions[]` added to item 4 or `.ac_gate.acs[]` dropped from it.
  - The scope-line pins kill a path pasted into the line, and a double-quoted slug.

  Rule 8's quick hand-over check has no mutation control in the suite (L60). It bites (M7, M8), but nothing pins that
  it keeps biting. That is noted, not a finding: 2.2's own `handOverReasons` has none either.

#### The merge with 2.2

- **Both sides' pinned lines survive (G).**
  - `pharn-loop.md`: none of the 20 fenced lines 2.2 added, or the 3 this side added, is missing from HEAD.
  - The same holds for `pharn-ship.md` (21 and 1) and for `cost-ledger.md`.
- **The base lines HEAD dropped are superseded, not lost:**
  - the five stage-start lines without `--route`, replaced by 2.2's `--route '<route>'` forms;
  - the Step 6c commit line with a literal `STOP_GREEN`, replaced by this side's `<decision>`;
  - and `pharn-ship.md`'s old scope line, replaced by the F1 fix.
- **The S9 row** carries 2.2's trigger ("a routed stage agent returned no usable result") and this side's rule ("or a
  quick scope check"). S6c sits beside S6b.
- **Every hygiene suite passes.** `command-hygiene.test.mjs` runs whole, inside the 653/653 and the 4000/4000 above.

#### P0 — the new sentences

- **The CHANGELOG [6.28.0] Fixed entry holds, except one clause (R3).**
  - The three reproductions it cites are round 1's Q1–Q3, C1 and C2; "so did a declared one" is Q3.
  - "its output is unchanged" holds (C).
  - Both the hostile-name claim and the control claim re-ran here (H), with the same result.
  - "Rolling back below 6.28.0 restores the vulnerable line" holds: `5bf6b18`'s `pharn-ship.md` still carries it.
  - "reproduced at that CLI" holds, and the old stage reproduced it too (O).
  - It is a new entry in a new section, and 6.25.0's section is untouched (`check-changelog-entry` GREEN).
- **The Added entry's coupling bullet holds:** "routes, where 6.27.0 refused it" (R), "byte-identical apart from the
  S6c row" (B), and the rule-7 and `STAGE_AGENT_WIRING` claims (B, M).
- **The command prose holds.**
  - Both commands' "a name carrying `$(…)`, a backtick, a `$`, a comma, a quote, a newline or a leading `-` is
    compared as the name git printed" holds (H).
  - So does every label on the scope check: the inputs built by tested code, the exit FLOOR, and the substitution and
    obeying it ADVISORY.
  - `## Quick mode`'s "A miss fails safe" list holds as ADVISORY reasoning.
- **The overclaims found are R2** ("a crash is caught as 2, never 1") **and R3** ("byte-identical … for ordinary
  names").
- **A note, not a finding.** `README.md`'s routing paragraph lists what runs on the session's model: "`/pharn-ship`'s
  spec stage, every `/pharn-regress` and `/pharn-verify`, and any stage that falls back". It omits the quick grills.
  That list is 2.2's text, which already left out `/pharn-ship --quick`'s grill, and this increment adds the loop's.
  The CLAUDE.md block says "(the quick grill excepted)".

#### The LIMITS patch, as the maintainer will apply it (L)

All in a clone of HEAD, on a non-`main` branch:

1. **Determinism.** `make-patch.mjs` at HEAD, before §8, exits 0 but does NOT reproduce the committed pair. The
   committed patch still says `(6.27.0)` twice, and HEAD's generator says `(6.28.0)`: sums `244cabda…b929`, not the
   committed `9accea65…b474`. That is by plan (the coupling amendment's V), and the run leaves no scratch.
2. **2.2's §8 first, by 2.2's own `apply.sh`:** exit 0, and one commit touching only `LIMITS.md`. Its sums matched.
3. **The committed (stale) pair over the post-§8 file.** `git apply --check` exits 0, since the hunks are disjoint, but
   the whole-file sums refuse it. `apply.sh` exits 1, `LIMITS.md` is restored and nothing is committed: fail-closed.
4. **Regenerated against the post-§8 file.** It exits 0 with sums
   `e7be1413b84f0198ced7e8f1dbc17b779d271a148e725b4b186685b7cd0bb5d7`, `(6.28.0)` twice and `(6.27.0)` never. Its three
   hunks sit at lines 127, 141 and 270, all before §8. `git apply --check` exits 0, and there is no CR in the patch,
   the sums or `apply.sh`.
5. **`apply.sh` applies it:** exit 0, one commit touching only `LIMITS.md`, with the pinned message and a `15 / 3`
   diffstat. The raw `shasum` of the applied file equals the sums, and the file holds no CR.
   - **Exactly once:** the gated-flag rename, the unattended paragraph at `(6.28.0)` and the §6 clause at `(6.28.0)`
     are each present once. "The manual flag is", "which run the same partition" and a `(6.27.0)` loop line are
     absent. §8's heading, its "Stage routing (6.27.0)" bullet and its "Effort is not routed" bullet are each present
     once.
   - **Markers:** `validate.mjs` is GREEN (36), and `check-specified-markers.mjs` exits 0 at the real path.
   - **No second apply:** re-running the generator over the applied file refuses (`matched 0 time(s)`).
6. **It refuses on `main`:** exit 1, with `LIMITS.md` untouched and `HEAD` unchanged.
7. **It does NOT refuse on a dirty `LIMITS.md` (R1).** An unstaged line was appended outside the hunks. `apply.sh`
   applied the patch, the sums failed, and `git checkout -- LIMITS.md` restored from the index: exit 1, and **the
   person's line was gone**. 2.2's hardened `apply.sh`, on the same state, refuses before touching anything, and the
   line survives. A staged edit survives either way.

**The text is accurate for the new mechanism.**

- **§6** names `check-quick-scope.mjs` (6.28.0) for both quick modes. "to inputs it builds by code exactly as that
  stage's script does" holds, since both call `scope-inputs.mjs` (P). It keeps all four bounds: it fires only if run,
  it compares changed-since-base, it carries the closed exemptions, and a plan editing its own `## Files` defeats it.
- **§3a's unattended paragraph** carries "within the bounds §6 states for that check; it leaves no record, so nothing
  after its iteration re-checks it". Every claim in it matches `## Quick mode`.
- §6 itself does not say "no record". For `/pharn-ship --quick`, the record is the model-written `SHIP.md` line the
  checker's header names, so nothing false is stated.

**Safe to apply after 2.2's: yes, once regenerated, and fix R1 first.** The documented order works: 2.2's §8, then
`make-patch.mjs`, then `apply.sh`. A stale pair is refused rather than half-applied. R1 is the one hazard: on a dirty
`LIMITS.md` the failure path destroys the person's unstaged edit.

### Floor-gate findings (blocking)

None. `validate.mjs` is GREEN and agrees with the eval lens, since no `role:` capability was added. Every guarantee
this round adds is labeled, and each was checked by execution, above.

### Advisory findings (each rests on this review's judgment; severity is advisory)

#### R1 — `apply.sh` lacks 2.2's dirty-`LIMITS.md` guard, so a person's unstaged edit is discarded

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/loop-quick-mode/proposed/apply.sh:9"
  problem: "apply.sh starts on a dirty LIMITS.md: git apply --check passes around an unstaged edit outside the hunks, the whole-file sums then fail, and the failure path's git checkout -- LIMITS.md restores from the index, silently discarding the edit; 2.2's hardened apply.sh (its GATE-2 A10) refuses that state before touching anything, and APPLY.md step 3 says only that the file is restored from the index."
  evidence: 'git apply --check "$F/human-only.patch"'
```

- **Reproduction (L, step 7).** In a clone, check out a phase branch at the post-§8 commit, with the regenerated pair.
  Append a line to `LIMITS.md` without staging it, then run `sh .dev/features/loop-quick-mode/proposed/apply.sh`. It
  exits 1, and the line is gone. On the same state, `sh .dev/features/stage-model-routing/proposed/apply.sh` exits 1
  with "refusing to start", and the line survives.
- **Why it recurred.** 2.2's A10 remedy reached one of the two `apply.sh` copies and was not carried to this one at the
  merge. That is L52's shape: a remedy quantified over a set, discharged for one member.
- **Fix.** Insert 2.2's line 11 before `git apply --check`:
  `{ git diff --quiet -- LIMITS.md && git diff --cached --quiet -- LIMITS.md; } || { echo "apply.sh: refusing to start - LIMITS.md has unstaged or staged changes; commit or discard them first. Nothing was touched." >&2; exit 1; }`.
  Then carry over 2.2's failure message, and add the refusal to `APPLY.md`'s steps. `apply.sh` is apparatus, so an
  agent may edit it, and it needs no `SKILLS_VERSION` bump.

#### R2 — "a crash is caught as 2, never 1" is false for a module that fails to load

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CLAUDE.md:717"
  problem: "The claim that a check-quick-scope crash is caught as exit 2, never 1, holds for a throw while checking but not for a module that fails to load: the static imports fail before any catch runs, node exits 1 with no JSON, and 1 is this checker's escaped code, so both callers read the crash as a scope escape; it stays fail-closed, since both stop on 1, but the stated invariant is wrong, and L62, which the plan cites, names this crash-as-verdict class."
  evidence: "Exit: 0 clean · 1 escaped · 2 inconclusive (closed reason_code; a crash\n# is caught as 2, never 1)."
```

- **Reproduction (I).** Take a fixture whose `pharn/floor/` is a copy of HEAD's. Replace `scope-inputs.mjs` with
  `export const = ;`, or delete it, and run the committed line from either command. It exits 1 with empty stdout, and
  a `SyntaxError` or `ERR_MODULE_NOT_FOUND` on stderr. A run from a subdirectory does the same (`Cannot find module`).
  With `partitionScope` made to throw instead, it exits 2 `crashed`, as claimed.
- **The same claim** is at `pharn/floor/check-quick-scope.mjs:44` ("never as exit 1, which means 'escaped'") and
  `:138`.
- **Consequence.** `/pharn-loop` routes the crash to S9 as "a changed path is outside the declared writes", and
  `/pharn-ship` presents a scope breach with no `escaped` list. Neither passes.
- **Fix.** Narrow all three sites to "a throw while checking is caught as 2; a module that cannot load exits 1 with no
  JSON, which every caller reads as a stop". Alternatively, load the checker through `import()` from a thin entry, the
  `check-loop-fresh.mjs` pattern from 6.21.1, and state its residuals as that header does.

#### R3 — "byte-identical … for ordinary names" does not cover an untracked nested repository

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/stage-regress.mjs:471"
  problem: "The in-process partition keeps git's trailing slash on an untracked nested repository (vendor/lib/), which the old comma-list CLI stripped with normPath, so scope.json and REGRESSION.md differ from what that CLI printed, and a PLAN declaring the bare directory flips from done/no-regressions to refused/scope-escaped; the change is fail-closed and check-quick-scope agrees with it, but the CHANGELOG Fixed entry and this comment promise the CLI's bytes for ordinary names without naming the case."
  evidence: "The document written to scope.json has the keys, the order and (for an\n// ordinary name) the bytes that CLI printed"
```

- **Reproduction (P, W).**
  - Seed a fixture, then add an untracked directory holding its own `.git` (`git init vendor/lib`, plus one file),
    with `vendor/lib` in `PLAN.md`'s `## Files`.
  - `5bf6b18`'s `stage-regress.mjs` gives `0/done/no-regressions`, and its `scope.json` has `inside: ["src/index.js",
"vendor/lib"]`. HEAD's gives `3/refused/scope-escaped`, with `escaped: ["vendor/lib/"]`. The quick line exits 1
    on the same set.
  - Declared as `vendor/**`, all three pass, but `scope.json` and `REGRESSION.md` still differ by the slash.
  - A git worktree nested at `.claude/worktrees/agent-x` is listed the same way, as `.claude/worktrees/agent-x/`.
- **Fix.** Name the case wherever the claim is made (CHANGELOG [6.28.0] Fixed, this comment, and PLAN's R bullet):
  "for every name but a directory entry git prints with a trailing `/` (an untracked nested repository)". Stripping a
  trailing `/` in `scope-inputs.mjs` would restore the old bytes, but it would move `dir/**` matching the other way,
  so stating the case is the smaller change.

### Round 1's findings, re-checked

- **F1 — fixed at both call sites**, verified by execution (H, I, and mutants M15 and M16). No path reaches a shell, a
  list grammar, a trim or a flag scan. The 6.25.0 line, the suite's control, still executes a name and passes `$Q` in
  the suite's own fixture.
- **F2 — folded.** `## Quick mode`'s audit bullet says the check leaves no record and that nothing downstream
  re-checks it. §3a carries the §6 qualifier (L, step 5).
- **F3 — folded.** `check-loop.mjs`'s header names the two record checkers' static import and their exit 1.
- **F4 — folded.** `spec-template.md` reads "then".
- **F5 — folded.** The three qualifiers are in `pharn-loop.md`, and the README says "stops (S6c, under
  `/pharn-loop --quick`) or takes the full pipeline".
- **F6 — folded.** Step 5.4's exit-0 bullet follows the SPEC's kind.
- **F7 — deferred** to roadmap Phase 4.1, with its numbers carried into `BUILD.md`. `pharn-loop.md` is now 112,241 B:
  the coupling added 3,812 B to the merged 108,429 B. This increment's share over 2.2's 87,526 B is 24,715 B, up from
  round 1's 19,728 B over `main`.

### Lenses

- **L-floor (P0) — R2, R3.** Every FLOOR label this round adds was checked by execution:
  - the scope checker's exit over tested inputs (H, I, P);
  - the route decision and the brief text (R, B);
  - the row closure (A);
  - the wiring pins (M);
  - the patch's own checks (L).

  R2 and R3 are sentences stronger than the code. Neither moves a verdict toward a pass.

- **L-eval (P1) — no finding.** No `role:` capability was added, and `validate.mjs` agrees.
  - The new checker ships with `check-quick-scope.test.mjs`, which executes both committed lines, with the vulnerable
    line as its control.
  - The list-grammar fix ships with real-script tests and CLI controls.
  - The coupling ships with executed route and brief lines, plus mutants.
  - The quick hand-over rule's missing mutation control is noted above.
- **L-trust (P2) — no new finding, and F1 is closed.** Untrusted names travel as arrays and are printed only through
  `JSON.stringify`. A stage agent cannot report a checker's row, and its report still moves only an advisory mapping.
  Nothing in the reviewed files tried to steer this review.
- **L-axis (P3) — no finding.**
  - `scope-inputs.mjs` has one axis, the two input sets, and it is the one owner for both callers.
  - `partitionScope` stays in `check-regress.mjs`, whose CLI now runs only under `import.meta.main`, the floor's
    existing idiom.
  - `fixListFields` is derived from `ROUTE_POLICY` rather than re-listing it (L29).
  - No module references a sibling.

### Proposed lesson candidate

None this round (P7). R1 is L52's shape and R2 is L62's class, and both are cited rather than restated. Round 1's
candidate (L5 recurring) stays deferred, as GATE 2 recorded.
