# SHIP — core-371-canon-docs

Stages run, in order: `/pharn-dev-plan` → GATE 1 → `/pharn-dev-grill` → `/pharn-dev-build` → `/pharn-dev-regress` →
`/pharn-dev-verify` → `/pharn-dev-review` → GATE 2. The run ended at GATE 2.

- GATE 1: orchestrator decision under delegation, 2026-11-24. All 40 corrections, version 7.25.3, the `## Files` list,
  and the follow-ups left unedited were approved. This was not a human approval.
- The trusted-doc patch (`pharn/THREAT-MODEL.md`, `pharn/LIMITS.md`, `pharn/ARCHITECTURE.md`):
  - It was applied by the human from `patch-core-371-canon-1.py`. The orchestrator and this agent both checked its
    three post-image sha256s.
  - It was committed as `cef96e15` before `/pharn-dev-build` Step 0's anchor (L68).
  - The plan's `spec_content_hash` was then re-pinned to the patched `ARCHITECTURE.md` (`f187f5f0`).
- GATE 2: orchestrator decision under delegation. The brief said, in advance: "fix what review finds that is real,
  open the PR, drive CI green; do not merge". This was not a human approval.
  - In this run, the CHANGELOG finding was fixed at the merge of `origin/main` (`fa58e4bc`). That merge moved `main`'s
    two `[Unreleased]` entries into `[7.25.3]` and re-dated the section to 2026-11-25, above part A's `[7.25.2]`.
  - The two `pharn/LIMITS.md` findings need a second human patch (`patch-core-371-canon-2.py`, handed to the
    orchestrator). It was not applied in this run.
  - The merge came after verify. Its files from `main` are outside this run's verify, and CI measures them.

verdict-grill: exit 0
verdict-build: exit 0
verdict-regress: no-regressions
verdict-verify: PASS
run-ended: GATE 2

changelog-entry: exit 0

lesson: none — the review's main miss (a corrected 24 h claim surviving in LIMITS §7) is the L64 restatement family,
already promoted, and the plan's L64 line is what made the review look for it; no new mechanism is indicated.

deferred: none

Pointers:

- `REVIEW.md`: 5 advisory findings, 0 floor-gate. Dispositions are listed there.
- `GRILL.md`: advisory, 3 concerns.
- `REGRESSION.md`: base red on 2 install-manifest tests run from the detached base checkout; head green; no new
  failure.
- `VERIFY.md`: 7 gates, all 0.

Per-PR checks run locally after the merge, against the merge-base with `origin/main` (`ace51362`):

- `check:changelog-entry`: GREEN.
- `check:surface-bump`: GREEN, 7.25.2 → 7.25.3.
- `check:instruction-growth`: within, 158 of 2,048 bytes.

Chain ran; the named floor verdicts are as shown — this is NOT a judgment that the increment is good or wise; that is
the human's call at the post-review gate.
