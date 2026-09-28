# GRILL — regress-base-reuse

Plan: `.dev/features/regress-base-reuse/PLAN.md`. Spec-hash check: `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md`
→ `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4`, equal to the plan's `spec_content_hash` (no
drift). **Step 1b (FLOOR):** `node pharn/floor/check-plan-lessons.mjs .dev/features/regress-base-reuse/PLAN.md
.dev/memory-bank/lessons-learned.md` → exit **0**, `GREEN — applied_lessons: L5, L24, L29, L34, L35, L36, L41, L42,
L43, L45, L54, L58, L59, L60, L65 … all 15 cited id(s) resolve … and are referenced in the plan body`.

**How this grill was run (recorded, advisory).** The interrogation was done by an independent, read-only Opus agent
with a fresh context (it wrote nothing and ran no setter), briefed to test the plan against the live code rather than
the plan's own descriptions. The orchestrator wrote this file from its report. The agent's free text below inherits
the plan's untrusted tag and is quoted as DATA (P2). The 13 registered grillers (`node pharn/floor/count-grillers.mjs
.`) were applied by axis; a11y, i18n and privacy do not apply (no UI, no user-facing strings beyond fixed render
lines, no personal data — the record stores a marker digest).

## Findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/regress-base-reuse/PLAN.md:101"
  problem: "'Only the fresh path is safe from a Write-tool forgery' and 'the write tools cannot forge a HIT → floor' are false: stage.json, base-gates/ and the markers are all in .pharn/**, which the Write tool can always reach, during a chain paused at `continue`."
  evidence: "runResume trusts .pharn/pharn-regress/stage.json wholesale (stage-regress.mjs:870-891); the planned verdict re-check compares the stamp to a stampSha256 that itself comes from stage.json."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/regress-base-reuse/PLAN.md:50"
  problem: "'A fresh BASE execution is fully determined by …' is false: the base worktree is nested at .pharn/pharn-regress/base inside the HEAD tree, so base gates can resolve HEAD files through parent-directory walk-up (node_modules, npm's .bin PATH, tsc/prettier/eslint config search)."
  evidence: "REGRESS_PATHS.base = '.pharn/pharn-regress/base'; gates inherit process.env and run with cwd = base (run-gates.mjs:674-675)."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/regress-base-reuse/PLAN.md:302"
  problem: "'The verdict is not changed by reuse → floor' contradicts the plan's own advisory line that reused evidence equals a fresh run's."
  evidence: "PLAN:295 labels the equivalence advisory; PLAN:302 calls the unchanged verdict floor."
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/features/regress-base-reuse/PLAN.md:117"
  problem: "Parsing marker contents makes shipped header sentences false, one of them in a human-only hook."
  evidence: "run-marker.mjs:22-35 ('THE GUARD NEVER PARSES A MARKER … session_id … Nothing reads it'); require-loop-record.cjs:73-74 ('The writer and the reader of pharn-loop-active/1 are this one file')."
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/regress-base-reuse/PLAN.md:11"
  problem: "The cited trigger is the pre-6.23.0 token-cost measurement that stage-regress-script already answered, while the plan claims no token saving and roadmap 4.2 was gated on an unmeasured M3."
  evidence: "PLAN:11-13 cites '~63% of relative cost'; PLAN:284 'No token saving is claimed'."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/regress-base-reuse/PLAN.md:105"
  problem: "The git-metadata deny holds only under a guarded root; for a linked worktree, a submodule or --separate-git-dir the denial comes from enforce-writes-scope's other-tree/out-of-project rules, and `git rev-parse --git-dir` is relative."
  evidence: "gitMetaRelKey matches only keys under ROOT_PREFIXES (protect-trusted-paths.cjs:710-723); `git rev-parse --git-dir` → '.git' (measured)."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/regress-base-reuse/PLAN.md:300"
  problem: "The delivery-run bound omits that markers are Write-reachable, and publication reads the marker open at publish time rather than at decision time."
  evidence: "PLAN:157 'publish … exactly one open run' is evaluated at publish time."
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/regress-base-reuse/PLAN.md:166"
  problem: "'A run straddling the upgrade re-runs fresh' is false: a /1 record read by --resume is unusable progress-malformed, which the command presents and stops on (S9 in the loop)."
  evidence: "pharn-regress.md '2 unusable — present … and stop'."
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/regress-base-reuse/PLAN.md:164"
  problem: "Two persisted shapes change (progress /2, a new git-dir record) with no rollback or cleanup note."
  evidence: "No Files entry touches the run-close steps; nothing removes the record."
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/regress-base-reuse/PLAN.md:201"
  problem: "The reuse I/O in stage-regress.mjs is a second reason to change, and the log re-hash duplicates check J with a different follow rule."
  evidence: "loop-fresh-core.mjs:541 hashes .out/.err with sha256File (follows links); the plan reads them O_NOFOLLOW."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/regress-base-reuse/PLAN.md:336"
  problem: "Retention stretches check J's exposure: a detached base-gate descendant appending to a retained log after a HIT trips J → STOP at a later iteration, where today a fresh start unlinked the old log."
  evidence: "loop-fresh-core.mjs:541-552; stage-regress.mjs:333."
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/regress-base-reuse/PLAN.md:249"
  problem: "The test list misses a budgeted MISS chain that publishes then HITs, retained base-gates that is a link or a file, a foreign feature's evidence, a forged stage.json HIT, a pharn-review marker, and the record's location in a linked worktree."
  evidence: "PLAN:251-276."
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/regress-base-reuse/PLAN.md:171"
  problem: "base_evidence cannot tell a run that could not publish from one that did."
  evidence: "The block is {reused, miss, requirement_sha256}."
```

## Disposition (orchestrator, under the GATE-1 delegation — a model decision, not a human approval)

All thirteen are accepted, and the plan is amended in place before the build (its `## Grill amendments` section):

- **F1** — a persisted HIT is never trusted: the verdict phase re-runs the FULL predicate over the disk (the git-dir
  record must still bind the stamp). Publication goes through the predicate too — the stage publishes only a record
  the predicate would accept NOW — bound to the run identity read at DECISION time (F7). The Write-tool claim is
  narrowed: a HIT needs a record only the stage's own publication (or Bash) writes; the one remaining Write-tool path
  is forging the base side's in-progress scratch during a chain paused at `continue` — a pre-existing exposure of the
  fresh path, which reuse extends to later invocations of the run. Named, with the follow-up
  `regress-paused-chain-integrity`.
- **F2** — the requirement is restated as "every input PHARN can enumerate". Two narrowings are built: a run with no
  install is never reused (`evidence-unreliable` — dependency resolution may walk up into the HEAD tree), and the
  requirement binds the content of every root-level HEAD path in `inside` (the only HEAD files a parent-directory
  search from the nested base worktree can reach that differ from base). Ignored root content (`node_modules/`,
  `.env`) stays a named residual.
- **F3** — split: floor = the unchanged checker computes the verdict over the stamps on disk; advisory = that it equals
  a fresh-base verdict.
- **F4** — markers are no longer parsed. The identity is the write guard's own rule (present, a regular file, mtime
  within 24 h in either direction) plus sha256 of the bytes, so no header sentence changes and no human edit is
  needed.
- **F5** — the trigger is restated as the maintainer's explicit direction (this run's prompt); M3 was not measured
  here; the benefit is wall-clock and compute, measured in `MEASUREMENT.md`.
- **F6** — `git rev-parse --absolute-git-dir`; the ★ HOOK test runs both real hooks, on a main checkout and on a
  linked worktree.
- **F7** — the decision-time run identity is persisted and must equal the publish-time one.
- **F8** — reworded: a `/1` record stops as `progress-malformed`; a person re-runs fresh.
- **F9** — rollback note added; the record is inert once its run ends and is named as never removed.
- **F10** — the I/O is its own module (`regress-base-reuse.mjs`, already amended before this grill returned); the log
  rule is J's, with a stricter no-follow read, stated.
- **F11** — named residual.
- **F12** — the listed cases are added to the test plan.
- **F13** — the block gains `recorded` (whether a reuse record binds this report's BASE evidence when the invocation
  ends).

## Summary

The interrogation found no false HIT on the normal paths and confirmed that check-loop-fresh's C/D/E/H/J read the
retained files unchanged. Its substantive concerns were three over-claims (the Write-tool surface, full
determination, the verdict), one design choice that would have falsified shipped headers (marker parsing), and a
trigger stated from the wrong measurement. Each is resolved above by a design change or a narrowed claim.

ADVISORY VERDICT: 13 concerns raised (0 blocking-severity, 5 important, 8 minor) — all accepted and folded into the
plan before /pharn-dev-build. This is model judgment; it guarantees nothing about the plan (P0).
