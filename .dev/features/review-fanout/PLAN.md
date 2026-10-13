# PLAN — review-fanout

- spec_content_hash: 75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6
- applied_lessons: [L24, L25, L29, L34, L36, L41, L42, L52, L55, L59, L60, L67, L71]
- increment: `/pharn-review`'s deterministic prefilter spawns each code scanner once per review instead of once per
  target file, under a time limit that fails toward reviewing, and a directory target skips git-ignored, binary,
  oversized and non-regular files and lists them. Fixes review finding CTX-3 (with LOOP-6 / CTX-6, the same defect).
- layer(s): product floor (`pharn/floor/`), product command (`.claude/commands/pharn-review.md`)
- constitution_refs: [P0, P2, P5, P6, P7]

Finding CTX-3 (High, cost/scale) of the 2026-10-12 review, read as DATA and re-verified in code this run:

- `pharn/floor/render-review-assignments.mjs:178-194` runs `execFileSync("node", [scanner, file])` once per (mapped
  lens × target file), with no timeout. 18 of the 22 lenses are mapped (`lens-scanner-map.json`), so a review of N
  files costs 18 × N node spawns before any lens runs.
- `expandTarget` (`:92-114`) walks a directory with `readdirSync` and skips only the names `.git` and `node_modules`:
  no ignore rules, no size or binary filter, symlinks followed by `statSync`.
- Every `scan-code-*.mjs` is single-file and ends with `process.stdout.write(...); process.exit(0)` (all 18 checked).
- The 4 scanner-less lenses take the whole resolved target (`:209-214`), so whatever the resolution lets in reaches
  them.

## Measurements (before)

Scratch harness `.pharn/review-fanout/measure/` (gitignored; deleted before `npm run lint`): it imports
`computeAssignments` from a `git archive` snapshot of main `791d205` and times it, writing nothing. The ~26k-file
tree is synthetic: this repo ×8 (root + 7 copies, 23,287 tracked files), an ignored `dist/` and an ignored
`node_modules/` of 2,690 files each, three 5 MB text files and twenty 4 KB binaries.

- This repo, `--target .` resolves 2,908 files (0.1 s), so the slices cost 18 × 2,908 = **52,344 spawns**. A
  100-file sample over all 22 lenses (1,800 spawns) took **121.6 s = 67.5 ms per spawn**, at load average 38–47:
  other agents share this machine, and a 40-spawn control read 82.8 ms per spawn at load 72. Projected for the
  whole repo: **≈59 min** at that load, 24–45 min at the review's quiet 27–52 ms. A full run was started and
  stopped at 12 min, so it would not be a contention number presented as a cost; it is re-run at build, back to
  back with the new code, with the load recorded.
- ~26k-file tree, `--target .`: the old walk resolves **25,946** files in 0.7 s — the ignored `dist/` included, the
  ignored `node_modules/` excluded only by name, the three 5 MB files and the twenty binaries included. Projected
  slice computation: 18 × 25,946 = 467,028 spawns, **≈3.5–8.8 h** (27–67.5 ms per spawn). The harness passes the 22
  lens names explicitly on this tree: `count-lenses.mjs` counts every copy of a lens in the tree (176 here, 8 copies),
  and the emitter does not dedupe them. That is a property of the synthetic tree, not of a normal install; it is
  out of scope and reported as a follow-up.
- The review's own measurement, for scale: one scanner over 22,007 files took 723 s (32.9 ms per spawn); projected
  18 scanners × 24k files ≈ 4 h.

Projected after, from the per-KB scan costs measured below (§2, the time limit): 18 spawns per review, ≈140 s of
sequential scanning for this repo and ≈18 min for the ~26k-file tree at load 36, against ≈59 min and ≈3.5–8.8 h.
The 18 spawns stay sequential (`spawnSync`); running them in parallel would bring the wall clock down to the slowest
scanner (≈25 s here), but that needs an async emitter API and is not in this increment. The after numbers are
measured at build on the same two trees and recorded in `.dev/features/review-fanout/MEASUREMENTS.md`.

## Design

### 1. A batch mode in every code scanner

- **One shared CLI core, `pharn/floor/code-scanner-cli.mjs` (NEW).** It is deliberately NOT named `scan-code-*`:
  `lens-scanner-map.test.mjs` test 4 requires every `scan-code-*.mjs` on disk to be mapped to a lens.
  `runScannerCli(name, scanText, argv)` returns an exit code and serves two modes:
  - `<code-file>` — today's contract, byte for byte: stdout `{"found":<bool>,"hits":[…]}` + newline, exit 0; a
    missing or non-regular target, an unreadable file or no argument → the same `<name>: …` stderr line as today,
    nothing on stdout, exit 1.
  - `--files <list>` (`-` = stdin) — the list is NUL-separated paths (empty entries dropped, so a trailing NUL is
    fine). Stdout is ONE JSON document `{"results":[…]}` + newline, one entry per list entry, in list order. An entry
    is either the single-file object with `file` (the path as given) in front — `{"file","found","hits"}` — or
    `{"file","error":"<message>"}` for an entry that single-file mode would refuse. Exit 0 once the list was read;
    exit 1 with nothing on stdout when the flag has no value or the list cannot be read.
  - It ENDS by returning the code to `process.exitCode = …` — never `process.exit()`. A batch result over a large
    target is well past 64 KiB, and on darwin a piped stdout is cut at 65,536 bytes when the process is ended at
    once (the 6.20.4 flush rule; `render-review-assignments.mjs` JSON-parses this output).
- **Each of the 18 `pharn/floor/scan-code-*.mjs` (EDIT).** Detection is unchanged: every pattern, regex and
  helper keeps its bytes (the injection and n-plus-one regexes that TST-2/TST-3 name are out of scope and untouched).
  The module-level read → scan → print becomes `export function scanText(text)` returning the sorted `hits`, and
  `if (import.meta.main) process.exitCode = runScannerCli("<scanner>", scanText, process.argv.slice(2));`. Each
  file's first import becomes `import "./runtime-floor.mjs";`: gating on `import.meta.main` makes it a gated CLI,
  which `.dev/floor/entry-point-guard.test.mjs` requires (an old Node would otherwise exit 0 having scanned nothing).
  State that one process could carry from file i to file i+1 is removed: module-level `let` scratch and the `/g`
  regexes reused by `exec` loops move inside `scanText` or get `lastIndex = 0` at its top. The header line
  "Single-file by contract … a multi-file sweep is a FUTURE increment" in each scanner is rewritten to state both
  modes (L25 — a rationale comment describing the superseded form).

### 2. The emitter spawns each scanner once, under a time limit

- **`computeAssignments` (EDIT `render-review-assignments.mjs`).** One
  `spawnSync(process.execPath, [<scanner>, "--files", "-"], { input: <NUL-joined absolute paths>, timeout, maxBuffer: 1 << 28 })`
  per mapped lens: 18 spawns per review, independent of target size. Results are mapped back by index and each
  entry's `file` must equal the path sent.
- **A failed spawn fails toward reviewing, and is named.**
  - `timeout` — `spawnSync` reports `ETIMEDOUT`.
  - `error` — anything else that leaves no usable batch: a spawn error (including `ENOBUFS` past the 256 MiB
    ceiling), a non-zero exit or a signal, stdout that is not `{"results":[…]}`, a length or `file` mismatch.
  - Either way the record gains `{lens, scanner, reason}` in a NEW top-level `scanner_failures[]`, and every target
    file goes into `scanner_errors[]` for that lens, so its slice is empty. An `error` entry inside a usable batch
    (one unreadable file) records that one file in `scanner_errors[]`, exactly as a failed per-file spawn does today.
  - The record already keeps an errored file OUT of the slice (I7: a failed scanner produced no verdict to hit
    with), and `merge-findings.mjs` already labels a contribution on such a file `scanner-errored`. So "fail toward
    reviewing" is stated where spawning is decided, in `pharn-review.md` Step 3: a lens's files to review are its
    `slice` plus every `scanner_errors` file that names it, and a lens is skipped only when both are empty. Today
    Step 3 lets a lens whose scanner errored on every file be skipped as if its scanner had hit nothing — the
    opposite direction.
- **The time limit scales with the bytes scanned.** Per spawn: `SCANNER_TIMEOUT_BASE_MS` (30,000) +
  `SCANNER_TIMEOUT_MS_PER_KIB` (5) × the target's KiB. Both are exported constants, each defined once, with no CLI
  flag: the command passes none (P7), and tests pass an override to `computeAssignments` in process.
  - **Why scaled, not fixed (measured this run).** One single-file spawn of each old scanner over the 836 KB
    `CHANGELOG.md`, at load 36, cost 11–865 ms of scanning beyond startup. The slowest is `scan-code-n-plus-one`,
    ≈1.0 ms per KB, and the 18 together ≈5.6 ms per KB.
  - What that predicts for the slowest scanner: ≈25 s over this repo's 24.8 MB below the cap, ≈200 s over the
    ~26k-file tree's ≈190 MB. Any fixed limit that clears the big tree (≥ 200 s) would make a 10-file diff with
    one pathological line wait minutes.
  - The scaled limit gives this repo ≈150 s and the big tree ≈950 s: about 5× the slowest scanner's linear cost in
    both cases. A small diff gets ≈30 s.
  - Confirmed or re-derived against the build measurement (L24), never carried from this estimate.
  - Past the limit, the scanners that timed out leave their lenses with whole-target review sets: the
    fail-toward-review direction, stated as a bound.
  - This is what stops a pathological line in the injection or n-plus-one scanner (TST-2 / TST-3, measured killed
    at 20 s on 200 KB) from hanging the prefilter. The regexes still hang; now they hang inside a time limit.

### 3. Target resolution skips what no lens should be handed, and lists it

- **`resolveTarget` returns `{ target, skipped }`** (EDIT; its two callers and its tests change with it).
- **An explicit FILE argument is kept as named, with no filter.** Step 1 branch 1 is authoritative, and naming a
  file is how a user reviews one the filters below would drop.
- **An explicit DIRECTORY argument:**
  - Inside a git work tree: the files `git ls-files -z --cached --others --exclude-standard -- <dir>` lists. What
    the ignore rules drop is listed from `git ls-files -z --others --ignored --exclude-standard --directory -- <dir>`
    (an ignored directory once, with its trailing `/`) as `git-ignored`.
  - Outside one: today's `readdirSync` walk.
  - In both: a path with a `.git` or `node_modules` segment is dropped and listed once per such directory as
    `excluded-name` — today's rule, now visible.
- **Every DISCOVERED file** — from a directory, and from the merge-base diff (branch 2) — is classified on the file
  itself (`lstatSync`, never a follow-call — L59): not a regular file (a symlink, a submodule, a nested repository)
  → `not-a-regular-file`; larger than `MAX_TARGET_FILE_BYTES` = **512 KiB** → `over-size-cap`; a NUL byte in its
  first `BINARY_SNIFF_BYTES` = **8,000** bytes (git's own binary heuristic) → `binary`. A discovered path that no
  longer exists is dropped without a listing, as the diff branch already does.
- **New record field `skipped: [{path, reason}]`**, sorted by path then reason, `reason` ∈ `SKIP_REASON_ENUM` =
  `["binary", "excluded-name", "git-ignored", "not-a-regular-file", "over-size-cap"]` (exported, frozen, closed).
  The stdout summary gains `skipped` and `scanner_failures` counts.
- The 512 KiB cap, measured against this repo: the largest tracked files are `CHANGELOG.md` 836,031 B (prose),
  `.dev/floor/command-hygiene.test.mjs` 347,042 B (the largest code file), `lessons-learned.md` 209,765 B. 512 KiB
  drops the changelog and keeps every source file.

### 4. The checker validates the two new fields

`check-review-assignments.mjs` (EDIT) gains two invariants, both set algebra over what was recorded — it still
never re-runs a scanner (L42):

- **I8 skipped** — present, an array of `{path, reason}`; `path` a non-empty, control-character-free string;
  `reason` ∈ `SKIP_REASON_ENUM`; no `path` is in `target`.
- **I9 scanner failures** — present, an array of `{lens, scanner, reason}`; `reason` ∈ `["error", "timeout"]`
  (`SCANNER_FAILURE_ENUM`, exported by the emitter); at most one entry per lens; the lens has a `scanner-bound`
  assignment naming that `scanner`; that lens's `slice` is empty and `scanner_errors` names it for every `target`
  file (a failed spawn produced no verdict for any file).

Both fields are required, like `scanner_errors` — an absent field is not "nothing skipped". The schema string stays
`review-assignments/v1`: the only reader of `skipped` / `scanner_failures` is this checker, which `/pharn-review` runs
on the record it just emitted (Step 6b), and `merge-findings.mjs` reads neither.

### 5. The command

`.claude/commands/pharn-review.md` (EDIT), each change one or two sentences: Step 1 (a directory expands to the files
git lists for it, and skipped files are listed in the record), Step 1b (the two new fields), Step 3 (each scanner runs
once over the whole target under a time limit; the review set is slice plus errored files; skip only when both are
empty), Step 4 (each lens gets its review set), Step 6 (render `skipped[]` and `scanner_failures[]` in the assignment
summary). The command's budget is 23,220 / 24,064 B (`COMMAND_BYTE_CEILINGS`). If the edit passes the ceiling, the
ceiling moves in this PR by the rule (measured bytes + 10%, rounded up to a multiple of 512) — a visible diff, never a
quiet one.

### 6. Lens-subagent grouping — NOT adopted here (measurement plan + recommendation)

Grouping (several lenses of one family in one subagent, each still writing its own `findings.json`, merge unchanged)
would cut 22 fresh subagents to about 5. At the measured 68k–130k-token prefix per fresh agent in this repo that is
≈1.2M–2.2M fewer cache-write tokens per full review (≈5M at pharn-starter's 302k).

The measurement that would justify adopting it:

- **Unit:** each of the 75 lens eval cases (`pharn/pharn-review/*/evals/cases/*`), scored by `check-structural.mjs`
  against its own `expected/*.json`.
- **Configurations:** SOLO (today) vs GROUPED, with families such as security (7 lenses, 24 cases),
  async/resources (5), error handling (4), hygiene (5), and `trust-fence` alone.
- **Equivalence:**
  - no (lens, case) whose structural pass count drops between SOLO and GROUPED;
  - no cross-lens contamination — a grouped lens emitting on another lens's case where SOLO does not;
  - measured through `/pharn-dev-eval` live runs (`claude -p`) and `check-variance.mjs`.
- **Cost:**
  - 75 cases × N=3 × 2 configurations = 450 live runs, each paying a fresh 68k–130k-token prefix: ≈30M–60M tokens
    and ≈8–15 h sequential.
  - The smallest informative slice, the security family alone, is ≈150 runs (≈10M–20M tokens).
  - At N=3 per cell only gross regressions show. Single-lens run-to-run variance (`check-variance` flaky-structural)
    is itself unmeasured for most lenses, so "equivalent" cannot be shown at that N.

**Recommendation: leave Step 4's one-subagent-per-lens fan-out unchanged in this increment**, record this plan as the
named follow-up `review-lens-grouping`, and adopt grouping only after that measurement. This increment still cuts
the fan-out's INPUT: a directory target no longer hands the 4 scanner-less lenses ignored, binary or oversized files
(on the ~26k-file tree: the ignored `dist/`, three 5 MB files and twenty binaries).

### 7. Lens prose is not swept

15 lens files say the scanner "takes a single `<code-file>`" and that "a built-in multi-file / directory sweep is a
future increment". Each sentence describes how the LENS invokes its scanner, one file per invocation, and that stays
true: the batch flag is the emitter's interface. Not swept here (one axis); named as follow-up `lens-scope-wording`
because L33's warning applies — "multi-file … future increment" now reads as stale to a reader who knows the batch
mode exists.

## Applied lessons

- **L24** — the prefilter's implementation is swapped, so no cost claim is inherited. The before/after numbers are
  measured on the new code over the same two trees. The timeout's purpose is pinned by a membership test (a
  scanner that sleeps past the limit is recorded `timeout`, under a subprocess time limit), never by a stopwatch
  threshold.
- **L25** — every comment that describes the superseded form is re-derived in the same change: each scanner's
  "single-file by contract … a multi-file sweep is a FUTURE increment" header line, the emitter's `scannerVerdict`
  comment (one spawn per file) and its `expandTarget` comment (names-only exclusion), and the command's Step 3
  sentence "run that scanner over each target file".
- **L29** — the set is "every code scanner". The batch-equivalence test iterates the 18 scanners read from
  `lens-scanner-map.json`, and the flush test's scanner rows are generated from the same list, never hand-written
  for one member.
- **L34** — the equivalence corpus must hold at least one HIT file for every scanner, asserted, or "batch equals
  single" passes vacuously over all-miss output. The new I8/I9 rules get a non-empty-domain fixture each.
- **L36** — the flush test's scanner rows are derived from disk (`scan-code-*.mjs`) and checked set-equal to the
  map's values, so a 19th scanner is covered or REDs; `SKIP_REASON_ENUM` and `SCANNER_FAILURE_ENUM` are closed sets
  the emitter and checker both import.
- **L41** — `SCANNER_TIMEOUT_BASE_MS`, `SCANNER_TIMEOUT_MS_PER_KIB`, `MAX_TARGET_FILE_BYTES` and
  `BINARY_SNIFF_BYTES` are each defined once, and the CLI's no-option path, which is the only one the command uses,
  runs in a test (the existing `l41:` test already invokes the CLI without `--base`; the new defaults ride that same
  path).
- **L42** — the record captures the scanner verdicts and the skip decisions at emission. The checker's new
  invariants are set algebra over the recorded fields and never re-run a scanner or re-stat a file.
- **L52** — the set of defaults this change adds is named in L41's line above (four constants), so the
  no-option test covers each member, not whichever one was in view.
- **L55** — batch mode re-implements the single-file mode's per-file contract, so it is probed against the
  single-file mode itself: for every scanner, batch output over a corpus (the 75 lens eval cases plus every
  scanner's and the core's own source) must deep-equal N single-file runs, entry by entry, with hit files placed
  before miss files so carried state would show.
- **L59** — target classification asks the path itself (`lstatSync`), never a follow-call: today's `statSync` walk
  answers for a symlink's target, so a link to a directory outside the repo was walked and a link to a file outside
  it was reviewed. The L67 fixture list carries the three link kinds.
- **L60** — each new assertion gets a negative control that turns it red once: a module-level `/g` regex left
  un-reset (the equivalence test must fail), a sleeping scanner (timeout), a scanner exiting 1 (error), a record
  with a skipped path inside `target` (I8), a failed lens with a non-empty slice (I9).
- **L67** — `git ls-files` and the filesystem are external tools whose input kinds the resolution must handle. The
  test fixtures enumerate them: tracked file, untracked-not-ignored file, ignored file, ignored directory, file
  under `node_modules/`, symlink to a file, symlink to a directory, dangling symlink, tracked file deleted from the
  work tree, binary file, oversized file, a path with a space and a newline (the `-z` and NUL-list route), plus a
  non-git directory.
- **L71** — `## Files` below names every path explicitly: no glob bullets, so the setter's parsed count equals the
  bullet count (32).

## Files

- `pharn/floor/code-scanner-cli.mjs` — **NEW.** The shared single-file / `--files` CLI core; ends through
  `process.exitCode`.
- `pharn/floor/code-scanner-cli.test.mjs` — **NEW.** Batch ≡ single-file for all 18 scanners (★, with the
  carried-state negative control), per-entry errors, stdin and file lists, a path with a space and a newline, usage
  errors, nothing on stdout on a refusal.
- `pharn/floor/scan-code-copy-paste-drift.mjs` — **EDIT.** `scanText` + `runScannerCli`; detection unchanged.
- `pharn/floor/scan-code-crypto.mjs` — **EDIT.** Same.
- `pharn/floor/scan-code-deserialization.mjs` — **EDIT.** Same.
- `pharn/floor/scan-code-duplicated-logic.mjs` — **EDIT.** Same.
- `pharn/floor/scan-code-injection.mjs` — **EDIT.** Same; its regexes are byte-unchanged (TST-2 out of scope).
- `pharn/floor/scan-code-magic-values.mjs` — **EDIT.** Same.
- `pharn/floor/scan-code-missing-await.mjs` — **EDIT.** Same.
- `pharn/floor/scan-code-missing-error-handling.mjs` — **EDIT.** Same.
- `pharn/floor/scan-code-missing-timeout.mjs` — **EDIT.** Same.
- `pharn/floor/scan-code-n-plus-one.mjs` — **EDIT.** Same; its regexes are byte-unchanged (TST-3 out of scope).
- `pharn/floor/scan-code-null-deref.mjs` — **EDIT.** Same.
- `pharn/floor/scan-code-off-by-one.mjs` — **EDIT.** Same.
- `pharn/floor/scan-code-path-traversal.mjs` — **EDIT.** Same.
- `pharn/floor/scan-code-placeholder.mjs` — **EDIT.** Same.
- `pharn/floor/scan-code-resource-leak.mjs` — **EDIT.** Same.
- `pharn/floor/scan-code-secrets.mjs` — **EDIT.** Same.
- `pharn/floor/scan-code-ssrf.mjs` — **EDIT.** Same.
- `pharn/floor/scan-code-swallowed-exception.mjs` — **EDIT.** Same.
- `pharn/floor/render-review-assignments.mjs` — **EDIT.** One spawn per scanner under the scaled time limit;
  `scanner_failures[]`; `resolveTarget` → `{target, skipped}` with the git/ignore, regular-file, size and binary
  filters; the two new enums and four constants exported; header re-derived.
- `pharn/floor/render-review-assignments.test.mjs` — **EDIT.** The L67 input-kind fixtures, timeout and error
  failures (each with its control), a per-entry error, the spawn count (one per scanner), the no-option CLI path, the
  `resolveTarget` shape change.
- `pharn/floor/check-review-assignments.mjs` — **EDIT.** I8 and I9.
- `pharn/floor/check-review-assignments.test.mjs` — **EDIT.** I8/I9 accept and refuse cases; existing fixtures gain
  the two fields.
- `pharn/floor/cli-stdout-flush.test.mjs` — **EDIT.** The 18 scanners join the flush set (static pin, crash-stays-a-crash
  with a `process.stdout.write` preload, a >64 KiB batch through a pipe), derived from disk.
- `pharn/floor/stage-runtime.test.mjs` — **EDIT (re-plan after the first build pass, below).** Its ★ GIT CEILING
  enumeration lists every git spawn in a shipped floor module; the emitter gains two (`rev-parse
--is-inside-work-tree`, bounded, and the `ls-files` listing, which carries the 256 MiB ceiling). The map, the
  spawn count and the emitter's falsifier anchor move with it, plus a falsifier for the new listing.
- `.claude/commands/pharn-review.md` — **EDIT.** Steps 1, 1b, 3, 4 and 6 as in Design §5.
- `.dev/floor/command-hygiene.test.mjs` — **EDIT, only if** `pharn-review.md` passes its 24,064 B ceiling: the one
  `COMMAND_BYTE_CEILINGS` row, by the rule.
- `.dev/features/review-fanout/PLAN.md` — **NEW.** This file.
- `.dev/features/review-fanout/MEASUREMENTS.md` — **NEW.** Before/after timings, spawn counts and target sizes on
  both trees, with the harness described.
- `CHANGELOG.md` — **EDIT.** The entry for this increment.
- `SKILLS_VERSION` — **EDIT.** One minor bump over main (a new shipped capability — the scanners' batch mode, the
  record's two fields, target filtering).
  - Planned as `6.58.1` → `6.59.0`.
  - Main then took 6.59.0 (#345), 6.60.0 (#346), 6.60.1 (#348) and 6.61.0 (#349), so at push this increment is
    `6.61.0` → `6.62.0`.
  - It is renumbered by diff, and again if main moves before merge.
- `README.md` — **EDIT.** The version badge, and the generated `## Current state` floor-checker count (135 → 136,
  `npm run docs:generate`, a Bash write declared here).

## Contracts satisfied

- `pharn/pharn-contracts/finding-shape.md` — untouched; `merge-findings.mjs` and the finding object are unchanged.
- The assignment record has no contract file by design (`check-review-assignments.mjs`, "THE DEFERRED CONTRACT");
  its shape lives in the emitter and checker headers, both updated here.

## Evals to write (P1)

No capability changes, so no eval is added or changed: the 22 lens files and their evals are untouched. The floor
code is covered by the tests in `## Files`; the lens eval cases are reused as the batch-equivalence corpus.

## Guarantee audit (P0)

- "Batch output equals N single-file runs, per entry" → floor: enum-regex — the scanners' own regex verdicts, and a
  differential test over the named corpus. Bounded to that corpus: a carried-state defect no corpus file triggers is
  not excluded.
- "Each scanner is spawned once per review" → floor: the emitter's code, pinned by a test counting spawns. Advisory:
  that the command runs the emitter.
- "A scanner that times out or errors is named, and its files reach no slice" → floor: enum-regex — `spawnSync`'s
  result mapped to a closed reason enum, checked by I9.
- "A lens whose scanner failed is still reviewed" → **advisory**. Spawning is orchestration (Step 3/4); the record
  makes the failure visible and the merge labels it, but nothing on the floor forces the spawn.
- "The time limit stops a hung scanner from hanging the prefilter" → floor: `spawnSync`'s `timeout` kills the child.
  It does not stop a hung regex from hanging a lens subagent that runs the scanner itself (the lens procedure, no
  timeout) — stated as a bound.
- "Skipped files are listed, with a reason" → floor: enum-regex — `SKIP_REASON_ENUM`, I8. NOT a claim that the
  ignore rules or the binary heuristic are right: they are git's and git's own sniff, and a text file with a NUL
  in its first 8,000 bytes is listed `binary`.
- "Ignored paths are skipped" → bounded by what `git ls-files --exclude-standard` reads (`.gitignore`,
  `.git/info/exclude`, `core.excludesFile`); outside a git work tree only the two names are skipped.

## Trust audit (P2)

The review target is `trust: untrusted`. New untrusted inputs: the file list (paths, possibly with newlines; NUL-
separated, never shell-interpreted, argv arrays only), file bytes read for the size and binary decision (a length and
a byte membership test, no parsing), and git's output (`-z`, paths only). Paths reach the record as data, and the
checker's existing control-character rule covers `skipped[].path` (I8). No free text from the target enters the
record: `scanner_failures[].reason` is an enum and the scanner's stderr is not recorded.

## Determinism audit (P5)

Every branch is a membership test: the spawn result's code against a closed set, `lstat` kind, a size compare, a
byte search, a path-segment match. No new fallback ends in a guess. An unresolvable target still refuses.

## Re-plan after the first build pass (one path added, recorded rather than hidden)

`/pharn-dev-regress`'s head run failed two outside tests: `pharn/floor/stage-runtime.test.mjs`'s ★ GIT CEILING and its
falsifier.

- **Why it failed:** that test enumerates every git spawn in a shipped floor module and says "list a new or removed git
  spawn here in the same diff". This plan added two such spawns to `render-review-assignments.mjs` and did not
  name the test file. The plan missed it; the test caught it.
- **What was done:**
  - The one path was added to `## Files` above.
  - `node pharn/floor/check-bash-reconcile.mjs --require-baseline` was run first, over the first window, and returned
    `CLEAN` (30 reconciled, no escape).
  - Build Step 0 was then re-run: the setter, and a new anchor. A path added after an anchor is a
    `plan-widened-after-anchor` escape, so re-anchoring is the way to declare it before the write.
- **What the new anchor costs:** it resets the baseline, so verify's reconcile gate judges only the second window. The
  first window's `CLEAN` is the record of the first; it is copied into `VERIFY.md`.
- **Decided by:** the build agent, as a mechanical consequence of a pinned enumeration. It was not a GATE 1 decision,
  and it is surfaced at GATE 2.

## GATE 1 decisions (resolved 2026-10-13)

GATE 1 was delegated: decided by the orchestrating model under the maintainer's 2026-10-13 delegation, not by a
human. Approved as written, with every recommendation taken:

1. **Size cap:** 512 KiB.
2. **The regular-file, size and binary filters also apply to the merge-base diff branch.** Explicit file arguments
   stay exempt.
3. **Lens grouping is deferred** to the follow-up `review-lens-grouping` (Design §6). The CHANGELOG must say plainly
   that this PR does NOT reduce the 22-subagent fan-out (the per-subagent prefix half of CTX-3), why (showing
   equivalence would cost ≈30M–60M tokens of live eval runs), and what this PR does cut.
4. **Time limit:** 30 s + 5 ms per KiB of target per spawn, confirmed by the build measurement.
5. **Lens prose:** the 15 Scope paragraphs stay; follow-up `lens-scope-wording`.

Two further instructions from the same decision:

- The inverted Step 3 case — a lens whose scanner errored on every file was skippable as "no hits" — is a
  correctness fix and gets its own CHANGELOG line.
- The ★ batch ≡ single-file equivalence test and its negative control are the load-bearing check of this increment.

## Open questions (HALT)

None — all five were resolved at GATE 1, above.
