# REVIEW — review-fanout

**Verdict: GREEN — 0 floor-gate findings.**

- **Floor (Step 1):** `node pharn/floor/validate.mjs .` reports GREEN, 37 capabilities.
- **Advisory:** 6 findings are open, all minor.
- **Independent second review:** a separate subagent reviewed the diff read-only and ran three probes in scratch
  repositories.
  - It raised 10 findings, 1 of them important. The important one and 5 others were fixed in this increment, before
    the final regress and verify runs.
  - Of the rest, 3 stay open and are listed below as `R-…`. The fourth, a weak point in two tests, is accepted as
    stated.
  - Its free text is paraphrased here as DATA.

The increment under review is `trust: untrusted`. No instruction-looking content in it was found, or followed.

## Floor-gate findings

None.

- **P0:** every guarantee the increment states reduces to an enum or regex check or the emitter's own code, pinned by
  a test. Spawning the lens of a failed scanner is labelled advisory in the command's claims block.
- **P1:** no capability changed, and validate is GREEN.
- **P3:** there is no sibling reference. The new module is a floor library that the scanners import, as
  `check-review-assignments.mjs` already imports the emitter.

## Advisory findings (open)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:58"
  problem: "The ★ batch ≡ single test compares batch output with the NEW single-file mode, so the CHANGELOG's 'single-file stdout and exit codes are unchanged' rests on other evidence than that test: the 18 untouched per-scanner suites (446 tests, green) and a whitespace-insensitive diff showing no detection line changed. The entry does not say which evidence backs which claim."
  evidence: "each batch entry must equal that file's real single-file run"

- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/check-review-assignments.mjs:325"
  problem: "A path holding a control character (a tab or newline in a file name) is listed by the emitter in skipped[] and then REDs I8 at Step 6b — the same pre-existing class I6 already has for target paths; Step 6b gates nothing, but the record a hostile file name produces is one the checker refuses."
  evidence: 'if (typeof s.path !== "string" || s.path === "" || CONTROL_CHAR.test(s.path)) {'

- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/render-review-assignments.mjs:335"
  problem: "The merge-base diff branch still splits `git diff --name-only` on newlines without -z, so a non-ASCII path git prints quoted never reaches the new file rules — pre-existing, now stated in the record comment and the CHANGELOG, follow-up review-diff-nul."
  evidence: 'execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMR", base], {'

- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/code-scanner-cli.mjs:70"
  problem: "A scanText that throws on one file ends the whole batch, so that lens loses every file's verdict (a scanner_failures `error`) where per-file spawns lost one; it fails toward review, and no scanner has been seen to throw, but the granularity loss is not stated in the module header."
  evidence: "const hits = scanText(text);"

- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/render-review-assignments.mjs:1"
  problem: "The emitter grew to 610 lines: target resolution (git listing, walk, classification) now sits beside slice computation and record emission; the resolution half is a candidate for its own module if it changes again."
  evidence: "export function resolveTarget(repoDir, explicitTargets) {"

- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/review-fanout/MEASUREMENTS.md:1"
  problem: "No whole-repo before-run and no whole big-tree after-run completed (a six-hour clock jump and a load average of 204); the comparison of record is a 300-file sample run back to back plus per-scanner timings and projections, each labelled as such."
  evidence: "Neither produced a number, so the comparison here is the 300-file sample run back to back."
```

## Second-review findings fixed in this increment

Each was found by the independent review and is pinned by a test added with the fix.

| #   | What it found                                                                                                                                                                                                                                                                                        | Fix                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **(important)** A directory inside a nested, non-submodule repository resolved to nothing. Asked from the outer root, git listed no files, so they appeared in neither `target` nor `skipped`, and the refusal named the wrong cause. Probe: `--target inner/src` gave `{"target":[],"skipped":[]}`. | git now runs from the named directory with the pathspec `.`, so the repository that owns the directory answers.                                                    |
| 2   | Symlinked named directories behaved differently by route. The walk followed the named link; inside git the link itself was skipped. The header said the walk "never follows a symlink".                                                                                                              | A named directory is followed as named on both routes, and nothing below it is followed. The test covers both routes.                                              |
| 3   | `--target node_modules/pkg` was refused: the exclusion checked the named path's own ancestors.                                                                                                                                                                                                       | The exclusion applies only below the named directory.                                                                                                              |
| 7   | The header called every field mechanically derivable, while a wall-clock time limit can change the record under load.                                                                                                                                                                                | The bound is stated in the header and the CHANGELOG: the difference is always toward review.                                                                       |
| 8   | "a file git shows as binary is binary here" ignored `.gitattributes`.                                                                                                                                                                                                                                | The wording now says it is a NUL-byte sniff with git's window, and that attributes are not read. Fixed in the header, the command's claims line and the CHANGELOG. |
| 10  | The all-skipped refusal said "no --target paths" even when `--target` was given.                                                                                                                                                                                                                     | The message is split by case, and the test asserts the clause is absent.                                                                                           |

The second review also confirmed:

- no state carries between files in any of the 18 scanners (checked one by one);
- single-file stdout key order and exit codes are unchanged;
- the emitter and I8/I9 agree;
- the stateful-mutant control, the `stat`-for-`lstat` mutant and the dropped `--literal-pathspecs` mutant each turn
  a test red.

It noted two weak tests:

- The per-scanner >64 KiB flush test cannot fail on Linux. The file's header already says so.
- "The closed enums are the ones the checker ranges over" never calls the checker.

## Lessons

Two candidates were considered; one is proposed.

**Proposed for `/pharn-dev-memory-promote` (target: `.dev/memory-bank/lessons-learned.md`).** Provenance: feature
`review-fanout`, source this REVIEW.md and `REGRESSION.md` run 1.

- **Title:** a closure sweep over every floor module is a hidden dependency of each module it sweeps. Enumerate the
  sweeps a floor-module change trips before the build's anchor.
- **Body:**
  - **What happened:** the plan named every file it meant to change, but not `pharn/floor/stage-runtime.test.mjs`.
    That test enumerates every git spawn in every shipped floor module. Adding two spawns to the emitter turned it
    red at regress.
  - **Why it recurs:** 6.54.0 made a path added after the anchor a reconcile escape. So the late discovery forced a
    re-plan and a second anchor, and that new anchor reset the first window's detection.
  - **What would prevent it:** at plan time, list the closure sweeps that read the module's source — tests over
    `readdirSync` of `pharn/floor`, such as entry-point-guard, source-nul-guard, the runtime floor, GIT CEILING and
    walker-exclusion. Name the ones the change will touch.
  - **Its kin:** L29 (the enumeration is the deliverable) and L71 (under-grant at the plan gate). Per L20, a remedy
    that is discipline alone will recur.
- **type:** process. **concepts:** [plan-shape, closure-sweep, enumeration, reconciliation, re-plan].

**Not proposed:** load-induced timing flakes in the regress suite (`REGRESSION.md` run 2). That is an environment fact
of this batch, not a recurring mechanism of the pipeline.

## Follow-ups (not fixed here)

- `review-lens-grouping` — the measurement plan in PLAN.md Design §6.
- `lens-scope-wording` — the 15 lens Scope paragraphs.
- `review-diff-nul` — the merge-base diff branch with `-z`.
- `count-lenses.mjs` counts every copy of a lens in a tree, and the emitter does not dedupe them (the synthetic tree:
  176 entries).
- Paths with control characters make a record RED at I6/I8.
- Run the 18 scanner spawns in parallel; that needs an async emitter API.

ADVISORY: 6 open minor findings and 6 fixed second-review findings. The floor is GREEN. The weighing is the human's.
