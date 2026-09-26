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
