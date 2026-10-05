# PLAN — regress-pre-run-snapshot: a path already changed when a delivery run began is not that run's scope escape

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L17, L19, L35, L38, L43, L54, L58, L59, L65]
- increment: `/pharn-loop` and `/pharn-ship` record, at run entry, every path git reports changed with a content digest, in the git dir and bound to the run marker; `/pharn-regress`'s partition and the quick scope check then count an undeclared changed path as pre-existing — reported, never an escape — only when it is in that snapshot AND its live bytes still equal the recorded digest.
- layer(s): pharn-floor (product), pharn-contracts (one contract), product `.claude/commands` (five files)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Why (P7)

The batch brief's evidence (§2, finding 1a), re-read this run from `~/Projects/pharn-starter` (read-only):

- `pharn/features/billing-plan-catalog/` (the 92-minute run, 2026-10-05): `LOOP.md` records `/pharn-regress`'s first
  run refused `scope-escaped` for the four untracked files of an abandoned earlier run,
  `pharn/features/billing-plans-entitlements/{LOOP.md,RUN-REPORT.md,SPEC.md,cost.json}`. Those four lines are exactly
  `.pharn/pharn-loop/billing-plan-catalog/pre-run-status.txt`. `cost.json` markers: regress stage-start #12 at
  09:34:40, the re-run's stage-start #13 at 09:54:06 — **19 min 26 s** spent on the refusal, a human
  `AskUserQuestion` wait and moving the directory away.
- `pharn/features/workspace-wording-ui/` (33 min): `LOOP.md` records `blocked: stage-refused`, `scope-escaped` for one
  path, `shared/components/settings-layout/settings-layout.tsx` — the user's own uncommitted edit, which is the single
  line of `.pharn/pharn-loop/workspace-wording-ui/pre-run-status.txt` (`M shared/…/settings-layout.tsx`).

Both escapes were known at entry. `/pharn-loop` Step 1a already snapshots `git status --porcelain -uall`, but only
`render-run-report.mjs` reads it (`git grep pre-run-status`), never the partition. `/pharn-ship` has no snapshot at
all, and after its build `BASE_RULE` resolves the regress base to `HEAD` (a dirty tree), so the same two cases refuse
there too.

## Confirmed current behavior (read this run, `main` @ `ea0234b`)

- `stage-regress.mjs` phase `partition` → `scope-inputs.mjs` `changedPaths(base)` (`git diff --name-only --no-renames
-z <base>` ∪ `git ls-files -z --others --exclude-standard`, minus `.pharn/`) and `declaredWrites` → `check-regress.mjs`
  `partitionScope({inside, declared, tests, evalPairs, feature})`: `undeclared` minus the closed `escape_exempt` set
  (this feature's pipeline artifacts, the trusted docs) is `escaped`; non-empty → `refused scope-escaped`.
- `quick-scope-core.mjs` (`check-quick-scope.mjs`) does the same over the same two functions and `partitionScope`.
- `scope.json`'s `inside` feeds three other things: `outside_tests`/`outside_eval_pairs` (which tests run), the
  style-skip rule, and 6.33.0's BASE-reuse `head_root` (`regress-base-reuse.mjs` `headRootNow`).
- The loop's `<base sha>` is `git rev-parse HEAD` at Step 1a (S3); ship's regress base is `BASE_RULE` → `HEAD`.
- 6.33.0/6.34.0 precedent for a record a write tool must not reach: `<git rev-parse --absolute-git-dir>/<name>`,
  bound to the run marker's bytes (`regress-base-reuse-core.mjs` `deliveryRunIdentity`, ≤ 24 h by the write guard's
  rule), proven by a ★ HOOK test that both real guards deny it in a main checkout and a linked worktree.

## The design

### The snapshot (captured once per run, at entry)

`node pharn/floor/pre-run-snapshot.mjs --capture '<name>'`, a Bash line run right **after** the run marker opens:

1. validates `<name>` (`FEATURE_SLUG_RE`); reads the delivery-run identity with `regress-base-reuse.mjs`
   `readMarkers` + `regress-base-reuse-core.mjs` `deliveryRunIdentity` (reused, never copied — L35): exactly one
   fresh `pharn-loop`/`pharn-ship` marker for this feature, hashed, never parsed. None or two → refuse
   `no-delivery-run`.
2. `base` = `git rev-parse HEAD` (40-hex). `paths` = `scope-inputs.mjs` `changedPaths(base)` — the **same listing**
   the partition will make, so the snapshot speaks the partition's language (L35: one owner of "changed").
3. each path gets a digest from ONE function, `pathDigest`, used at capture and at check: `lstat` first (L54/L59);
   ENOENT → `"absent"` (a deletion); a regular file or a symlink → `reconcile-baseline.mjs` `hashFile` (content, or
   the link's own text — the fingerprint's function); anything else — a directory (git lists an untracked nested
   repository as `vendor/lib/`), a FIFO, a parent component that is a symlink, an unreadable file — `"unhashable"`,
   which is **never** subtracted (fail-closed: today's behavior for that path).
4. **write-once per run:** a valid record already bound to the run that is open now → refuse `already-captured`
   (a second capture would record the build's own writes as pre-run state).
5. writes `<absolute git dir>/pharn-pre-run-snapshot.json` (tmp + rename): `{schema: "pharn-pre-run-snapshot/1",
feature, run: {command, marker_sha256}, base, paths: [[path, digest], …]}` (sorted, unique; closed keys both ways).

Exit `0` recorded · `2` refused (closed `REASON_CODES`, `crashed` included — never node's exit 1, the run-marker.mjs
rule). A clean tree records an empty `paths`.

### The check (every partition consumer)

`preRunUnchanged({feature, base, inside})` (the I/O half) reads the record and the markers and asks the pure
`decidePreRun` — first failure decides, a closed ordered `PRE_RUN_STATUSES`:
`no-delivery-run` → `no-snapshot` → `snapshot-malformed` → `other-run` (feature or run identity differs) →
`base-changed` (record base ≠ this partition's base) → `applied`. Only `applied` yields paths: each `inside` path in the
record whose recorded digest is a hash or `"absent"` and whose live `pathDigest` is **equal**. Any miss yields none:
the partition is exactly today's.

`partitionScope` gains one optional input, `preRunUnchanged` (default `[]`), applied **after** the closed exemptions:
`undeclared` → `escape_exempt` (unchanged, first) → `pre_run` (in the list) → `escaped`. It returns the subtracted
list; the `check-regress.mjs scope` CLI passes nothing, so its output is byte-identical. `inside` is **not** changed —
so `outside_tests`, the style skip and 6.33.0's `head_root` binding see exactly what they see today, and the BASE-reuse
predicate is untouched (a pre-dirty root-level file is still hashed into `head_root`, which is right: the nested base
worktree's parent-directory search still reaches it).

Reported, never silent (the `escape_exempt` precedent): `pre_run_snapshot: {status, unchanged: [...]}` in
`scope.json`, in `regression-report.json` (an additive advisory block after `base_evidence`), in `check-quick-scope`'s
document, and in `REGRESSION.md` — a done render lists the subtracted paths and names a non-`applied` status (except
`no-delivery-run`, a standalone regress, whose render stays byte-identical); a `scope-escaped` refusal's quoted detail
gains the same lines.

### Wiring

- `/pharn-loop` Step 1a item 4: the capture line after `require-loop-record.cjs --open`, **Non-zero → STOP S9**, as the
  two lines before it (nothing has run; a run without its snapshot would meet the very refusal this removes ~30–90 min
  later). The porcelain line and `render-run-report.mjs` stay unchanged (see L35 below).
- `/pharn-ship` Step 2 item 1: the capture line right after `run-marker.mjs --open`, **Non-zero → STOP** before
  `/pharn-plan`. `pharn-ship-quick.md`'s order sentence names it. `/pharn-loop --quick` inherits Step 1a.
- `pharn-regress.md`: one clause on the `scope-escaped` remedy; `pharn-loop-close.md`: the quick-scope claim gains the
  bound (it now reads "a changed file outside the declared files stops a quick loop", which this change makes false
  for a pre-run path).

## Files

- `pharn/floor/pre-run-snapshot-core.mjs` — NEW. Pure: schema, basename, read cap, `REASON_CODES`,
  `PRE_RUN_STATUSES`, `buildSnapshot`, `validateSnapshot` (closed both ways), `decidePreRun`. — layer pharn-floor
- `pharn/floor/pre-run-snapshot.mjs` — NEW. The CLI (`--capture <name>`, the import.meta.main guard) and the I/O half:
  `pathDigest`, `captureSnapshot`, `preRunUnchanged`. — layer pharn-floor
- `pharn/floor/pre-run-snapshot.test.mjs` — NEW. Every status row with a one-input mutation; `PATH_KINDS` (file, link
  to file, link to dir, dangling link, directory, FIFO, absent, symlinked parent) at capture and check; write-once;
  CLI exits; ★ HOOK (both real guards deny the record path, main checkout + linked worktree); ★ WIRING (the pinned
  lines in `pharn-loop.md` and `pharn-ship.md`, EXECUTED in a git sandbox, and their STOP branches). — layer
  pharn-floor (test)
- `pharn/floor/check-regress.mjs` — `partitionScope`'s optional `preRunUnchanged` input and its returned list; the
  CLI unchanged. — layer pharn-floor
- `pharn/floor/check-regress.test.mjs` — the subtraction cases, order after `escape_exempt`, CLI byte-identity. —
  layer pharn-floor (test)
- `pharn/floor/stage-regress.mjs` — phase `partition` reads the snapshot, writes `pre_run_snapshot` into `scope.json`
  and the refusal detail; the render phase appends the block to the report. — layer pharn-floor
- `pharn/floor/stage-regress.test.mjs` — end to end: the two recorded cases (an untracked leftover directory, a
  modified tracked file) pass under an open run with a snapshot; the build editing a pre-dirty path still escapes;
  no run / no snapshot / other run → `scope-escaped` as today; the report-minus-blocks byte test. — layer pharn-floor
  (test)
- `pharn/floor/quick-scope-core.mjs` — the same input and the `pre_run_snapshot` key in its document. — layer
  pharn-floor
- `pharn/floor/check-quick-scope.test.mjs` — the quick subtraction cases. — layer pharn-floor (test)
- `pharn/floor/render-regression.mjs` — the subtracted list and the not-applied status line. — layer pharn-floor
- `pharn/floor/render-regression.test.mjs` — render cases. — layer pharn-floor (test)
- `pharn/pharn-contracts/regression-report.md` — the additive `pre_run_snapshot` block. — layer pharn-contracts
- `.claude/commands/pharn-loop.md` — Step 1a capture line + STOP, `reads:`. — product command
- `.claude/commands/pharn-ship.md` — Step 2 capture line + STOP, `reads:`. — product command
- `.claude/commands/pharn-ship-quick.md` — the quick order sentence names the snapshot. — product command
- `.claude/commands/pharn-loop-close.md` — the quick scope claim's bound. — product command
- `.claude/commands/pharn-regress.md` — the `scope-escaped` remedy clause. — product command
- `CHANGELOG.md` — `## [6.36.0]` (provisional; the orchestrator assigns the final number), moving `[Unreleased]`. —
  repo meta
- `SKILLS_VERSION` — `6.36.0` (minor: a new floor CLI and a changed stage behavior). — repo meta
- `README.md` — the version badge and the generated CURRENT-STATE floor count (`npm run docs:generate`). — repo meta
- `CLAUDE.md` — one command block for the new CLI. — repo meta
- `.dev/features/regress-pre-run-snapshot/PROTECTED-FOLLOWUPS.md` — the `LIMITS.md` §3a and §6 sentences. — apparatus

`MIN_CLI` stays `0.5.0`: no installed path moves and no file changes shape for an older CLI. No hook or settings
change: the record path is already denied by both guards (the ★ HOOK test proves it, it adds nothing to them).

## Contracts satisfied

- `pharn/pharn-contracts/regression-report.md` — the report keeps `verdict` as its only floor field; the new block is
  additive and advisory ("Extra keys are IGNORED"), like `base_evidence`.
- `pharn/pharn-contracts/stage-exit.md` — no new exit, reason code or question: a subtraction only removes a refusal's
  cause; every refusal and its render stay the existing ones.
- No new contract (P7): the module header is the spec, the `run-marker.mjs` / `regress-base-reuse.mjs` precedent.

## Evals to write (P1)

None: no Capability (`role:`) is added or changed. The floor tests above are the specification.

## Guarantee audit (P0)

- "An undeclared changed path is counted pre-existing only when the open run's snapshot records it and its live bytes
  equal the recorded digest" → floor: content-hash (sha256 equality) + enum/regex (closed statuses, schema, slug,
  40-hex base) in tested code.
- "The snapshot belongs to this run" → floor: sha256 of the marker bytes + the write guard's 24 h age rule (agreement,
  never provenance — L43).
- "No write tool can write the snapshot" → floor: hook — both guards deny the git-dir path (★ HOOK test), with the
  6.34.0 GATE-2 bound (a separate git dir under a temp root in an installed project with no run open).
- "A Bash writer cannot forge it" → **struck**: Bash reaches the git dir (L19); nothing detects a forged record
  bound to the right marker. Write-once narrows only an accidental re-run of the pinned line.
- "The capture runs at entry" → advisory (a Bash step a run may skip; a skipped capture reads `no-snapshot`, today's
  strict partition).
- "Subtracted paths are reported" → floor in code (the block is always written, a test pins it); that a reader reads
  it is advisory.
- "The pre-run change did not affect the gates" → **not claimed**: the subtraction touches the escape set only. The
  HEAD gates run on the dirty tree and the BASE worktree lacks the pre-run changes, so a pre-run edit that breaks a gate
  still reads as a regression (named follow-up `regress-base-pre-run-overlay`).

## Trust audit (P2)

Git paths and the record are untrusted strings: compared, hashed and JSON-encoded, rendered only through `quoteData`.
A record's paths are never opened — only `inside` paths git printed are hashed. Marker bytes are hashed, never parsed.

## Determinism audit (P5)

Every branch is a membership test (closed statuses, slug, SHA) or a digest equality; no fallback guesses — every miss
is today's behavior.

## Applied lessons

- L17 — the partition asks "changed since base"; this narrows it toward "changed by this run" with a recorded
  pre-run state, never by inferring authorship, and every subtracted path is reported.
- L19 — the capture and the record are Bash/`fs` writes outside fix #7, declared; the forgery residual is stated.
- L35 — two copies of "dirty at entry" will exist (the porcelain text, the hashed record). The second must exist this
  PR: the record must sit out of the write tools' reach and carry digests, while the porcelain feeds
  `render-run-report.mjs` and is executed by `run-marker.test.mjs`; retiring it is the named follow-up
  `pre-run-snapshot-single-source`. The listing itself is not copied: capture and check both call `changedPaths`.
- L38 — another session's or an earlier run's leftovers are handled structurally (a recorded snapshot), never by
  hand-filtering `--changed`; a write by another session DURING the run still escapes.
- L43 — agreement of record + marker + live bytes, never provenance; the header and contract say so.
- L54 — every absence is `lstat` ENOENT, never `existsSync`.
- L58 — what may still change after capture: the tree (compared on purpose, now), the marker (any rewrite is a new run
  → `other-run`), HEAD (→ `base-changed`); each is a miss, never a stale HIT.
- L59 — `pathDigest` classifies the link itself; the suite carries a `PATH_KINDS` enumeration.
- L65 — the record a later gate compares against sits outside every stage's write scope: the git dir, ★ HOOK-tested.

## Expected time saving (92-minute run)

- `billing-plan-catalog`: the first regress would have passed the partition (the four leftovers recorded, unchanged)
  and run its gates; the 19 min 26 s between regress #12 and the re-run #13 — the refusal, the 19-minute human wait,
  the move — would not have happened. The re-run's own ~11 min becomes the first run's. **≈ 19 min.**
- `workspace-wording-ui`: no direct saving claimed. The S9 stop would not happen, but by its `BUILD.md`
  `settings-layout.test.tsx` fails at HEAD because of the same uncommitted edit, which the BASE worktree lacks — a
  regression at regress and a red verify. Item 1's entry pre-flight is what catches a gate red at entry.

## Named residuals (not closed here)

- `regress-base-pre-run-overlay` — the BASE side lacks the pre-run changes, so a pre-run edit that breaks a gate is
  attributed to the run.
- `pre-run-snapshot-single-source` — retire the porcelain `pre-run-status.txt` once `render-run-report.mjs` reads the
  record (L35).
- A marker an interrupted run left (≤ 24 h) makes a standalone regress apply that run's snapshot — the 6.33.0 bound.
- `LIMITS.md` §3a/§6 — `PROTECTED-FOLLOWUPS.md` (human-only edits).

## Open questions (HALT)

- GATE 1 (orchestrator, delegated): accept the escape-set-only scope (the overlay deferred), STOP on a failed
  capture, and the porcelain line kept alongside.
