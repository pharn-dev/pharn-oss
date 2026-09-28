# REVIEW — write-guard-narrowing

**Floor: GREEN.** `node pharn/floor/validate.mjs .` prints `FLOOR: GREEN — 36 capabilities checked in "."` and exits 0. It is the only guaranteed part of this review. **Verdict: GREEN — 0 floor-gate findings.** 5 advisory findings
follow:

- 1 important (F1, a claim in the human-only `LIMITS.md` text that nothing verified);
- 4 minor (F2 and F3 are quantifier drift in the patch's text; F4 is a wrong number in `BUILD.md`; F5 is an
  accepted design cost).

**The patch should be regenerated before anyone applies it** if F1–F3 are taken: all three land in
`proposed/human-only.patch`. None moves a verdict; each is text.

- stage: `/pharn-dev-review` — opus (`claude-opus-5-5`), by the maintainer's instruction for this batch, not a
  `pharn.config.json` route; effort not routed
- reviewed: the working-tree increment over base `70cb51c` (uncommitted), and `proposed/human-only.patch` rebuilt
  from HEAD plus the patch in a fresh OS-temp directory — `shasum` OK for all three files against
  `human-only.sha256` — never applied to the live files.
- The increment is `trust: untrusted`. Every `problem` and `evidence` field below quotes it, or a probe of it, as DATA
  (P2). Nothing in it read as an instruction to this stage. The two security findings the task quoted (M4, M7) were
  read as data too, and each was reproduced before the fix (`PLAN.md`, "Trigger").

## Ordering (GATE-1 decision 1, a decision delegated to the orchestrating model)

This review runs **before** the human applies the patch. `/pharn-dev-verify` FAILed with `failing_gates ==
["test"]`, and its TAP run's 30 failing titles equal `BUILD.md`'s expected-fail list exactly, each passing in the
runner's patched worktree (`VERIFY.md`). That is the shape decision 1 names for continuing here. A defect found in
the patch now costs one regenerated patch, not a second human apply.

## How the patch was exercised (L37 — probed, never read off the source)

The build's measurements, over the final bytes (`BUILD.md`): the D1 sweeps (enforce 560 combinations, protect 520,
0 differences each), the 51-row behavioural probe (51 as expected), and the runner's full suite with the patch
applied (4088 of 4088).

This stage added ten probes of its own (`.pharn/pharn-dev-review/review-probe.mjs`, scratch): each a spawn of the
patched `enforce-writes-scope.cjs` against a sandbox under the OS temp directory, in the install posture with no
scope and no run open. All ten came out as written below.

| #   | case                                                                     | result          |
| --- | ------------------------------------------------------------------------ | --------------- |
| R2a | this session's own scratchpad, the payload carrying no session fields    | 2 (denied)      |
| R2b | …and the body is the Claude-state variant                                | yes             |
| R2c | …whose FIX bullet says "the Write tool reaches both"                     | yes             |
| R2d | the same write with `session_id` and `scratchpad_dir` present            | 0 (allowed)     |
| R3a | two main checkouts, `…/a-b` and `…/a/b`: their keys                      | equal (`…-a-b`) |
| R3b | from a session in `…/a/b`, a write to the memory folder of `…/a-b`'s key | 0 (allowed)     |
| H1  | this project's memory folder (transcript key) — control                  | 0               |
| H2  | through a link inside this project's memory folder to another project's  | 2               |
| H3  | through an ordinary temp link to the config directory's `settings.json`  | 2               |
| H4  | through a link inside this session's scratchpad to another session's     | 2               |

## Floor-gate findings (blocking)

None. Every guarantee the increment states reduces to the hook (both guards' verdicts), to a content hash
(`apply.sh`'s `shasum -a 256 -c`, labelled agreement rather than a signature), or to a tested property, and the one
part that rests on Claude Code's own behaviour — the main-checkout key — is labelled a mirror of an undocumented
derivation, with only its fail-closed direction claimed.

## Advisory findings

### Important

Finding F1:

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/write-guard-narrowing/proposed/human-only.patch:668"
  problem: "LIMITS.md §7 (human-only text in the patch) states a cost nobody measured: that a non-git project's
    session started in a subdirectory carries a transcript key Claude Code does not use for memory. PLAN.md's own
    discovery, read from Claude Code's bundle in this run's plan stage, says the transcript and memory keys agree
    for a session started outside git. The claim came from grill finding G2's wording and was carried into the doc
    without a probe; this stage could not re-read the bundle to settle it (the environment's permission
    classifier refused the read), so it is unverified either way."
  evidence: "a non-git project's session started in a subdirectory carries a transcript key Claude Code does not
    use for memory"
```

Recommendation: drop that clause from the LIMITS edit, or verify it first-hand before the apply and keep it only if
it holds. Either way the patch and its checksums are regenerated.

### Minor

Finding F2:

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/write-guard-narrowing/proposed/human-only.patch:391"
  problem: "The Claude-state body's scratch bullet promises, without its condition, that the Write tool reaches
    both this session's scratchpad and an ordinary temp directory. In the case the variant was built for — no usable
    session fields in the payload — the scratchpad is not recognised, and probe R2 shows that very write denied with
    this very body. It is L27's remedy-reachability rule and L37/L64's quantifier drift, inside a guard's own
    message."
  evidence: "With no scope set and no PHARN run open, the Write tool reaches both; otherwise the message for that
    path names its route."
```

Suggested text: "…the Write tool reaches a temp directory outside every `claude-<uid>` folder, and this session's
scratchpad when the payload names it; otherwise the message for that path names its route."

Finding F3:

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/write-guard-narrowing/proposed/human-only.patch:656"
  problem: "'Another project's memory folder stays denied' holds per key, not per project. The key encoding turns
    every non-alphanumeric into '-', so two checkouts whose paths differ only there share a key and a folder:
    probe R3 allows, from a session in …/a/b, a write to the folder of …/a-b. Claude Code shares that folder between
    the two as well, so the guard gives no reach Claude Code does not; the sentence overclaims, and the same
    unconditional wording sits in CLAUDE.md, README.md and the enforce header."
  evidence: "Another project's memory folder stays denied: Claude Code loads it into that project's later
    sessions."
```

Suggested bound, once in `LIMITS.md §7` (the other docs cite it): "…per key: two paths that differ only in
non-alphanumeric characters share a key, and Claude Code gives them one memory folder."

Finding F4:

```yaml
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/write-guard-narrowing/BUILD.md:12"
  problem: "BUILD.md records the floor as '72 capabilities checked'. That validate run coincided with the first
    chain re-run, whose throwaway worktree sat under .pharn/pharn-dev-build/, and validate's walk counted its copy
    of the capability tree too. The clean runs — this stage's Step 1 and verify's validate gate — read 36. GREEN
    either way; the number is wrong."
  evidence: 'FLOOR: GREEN — 72 capabilities checked in "."'
```

Fix: `36`, with a note that the build's first reading was taken beside a nested worktree (the memory-bank's "sibling
worktrees break local gates" failure, recurring inside one worktree).

Finding F5 (accepted — no action):

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".claude/hooks/enforce-writes-scope.cjs (THE OUT-OF-PROJECT PLACES)"
  problem: "The write guard now holds a second axis of change: Claude Code's own layout (the memory-key derivation,
    the scratchpad path, the claude-<uid> folder, the payload fields) changes when Claude Code changes, not when
    PHARN's scope policy does. Weighed at grill (G5) against a separate module, which would be a new control-surface
    file; kept in one headed section that names its owner and fails closed on drift."
  evidence: "CLAUDE CODE'S OWN LAYOUT lives in this section and nowhere else in this file"
```

## Findings by lens

- **L-floor (P0):** F1, F2, F3; F4 is the build record's own number.
- **L-eval (P1):** none. No capability is added, so no eval pair is owed; the 25 new tests and the 5 changed ones
  each assert the patched guards, the ✧ pin binds the third deliberate copy (L31), and a strict mutant proves PASS 2
  is what closes the backslash-named link.
- **L-trust (P2):** none. The payload's session fields are shape-checked and reach only verdict code; `denyMessage()`
  never receives them (and a test feeds each a newline and imperative text over every branch — grill G4). The `.git`
  pointer files are read only after `lstat` says regular and small, and nothing read from them is rendered. H1–H4:
  in the three link placements probed, a symlink did not carry a write from an allowed place into a denied one —
  both resolutions judge the target it reaches.
- **L-axis (P3):** F5. `protect-trusted-paths.cjs` gains a third deliberate copy from its sibling guard, pinned
  byte-equal; no new sibling reference.

## What held (verified by execution)

- M4: a symlink named `s\x` → `.` no longer carries a write to a trusted doc, or to canon under a PLAN-origin scope,
  past protect; the promote-origin control still writes (build probe rows 1–23).
- M7: another project's memory, another session's scratchpad and task output, the config directory's files under a
  temp root, and HOME's dotfiles under a temp root are all denied, while this project's memory (both keys), this
  session's scratchpad and ordinary temp paths stay writable (build probe rows 24–49; H1–H4 here).
- D1: the dev and unsignalled postures and every old protect denial are byte-identical (560 and 520 combinations).

## Residuals observed (recorded, not findings)

- The runner's pass-3 chain exited 1 after every gate passed alone, and did not reproduce (`BUILD.md`). If a chain
  red recurs in a later pass, it deserves its log before anything else.
- Until the patch is applied, the five `everyDenyMessage()` rules (L27, L29) assert nothing at all: the helper throws
  on the new Claude-state case before any rule runs. That is inside the designed STOP, and they run again once the
  patch lands.
- `main` moved during the run: #286 released 6.28.3, the number this increment uses. The renumber waits for the
  orchestrator; the human-only patch carries no version string, so it does not move.

## Proposed lesson candidate (for `/pharn-dev-memory-promote`; not written here)

One candidate, from F1 (provenance: this increment, `REVIEW.md` F1 and `GRILL.md` G2): **a grill finding's
premise is advisory, and the in-place amendment it asks for can carry an unmeasured claim into a trusted doc.** G2
asserted how Claude Code keys a non-git subdirectory session; the build applied the amendment as written, into
human-only `LIMITS.md` text, while `PLAN.md`'s own discovery said the opposite, and nothing compared the two. The
remedy today is "remember to probe a grill premise before it lands", which is the L20 shape. `/pharn-dev-ship` Step
2b decides whether it goes further.
