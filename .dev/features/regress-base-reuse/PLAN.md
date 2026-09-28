# PLAN — regress-base-reuse: reuse verified BASE regression evidence within one delivery run

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L5, L24, L29, L34, L35, L36, L41, L42, L43, L45, L54, L58, L59, L60, L65]
- increment: a later `/pharn-regress` of the same `/pharn-loop` or `/pharn-ship` run reuses the BASE-side evidence an earlier one produced — skipping the base worktree, the install and every base gate — only when tested code proves the evidence was produced for exactly the BASE requirement this invocation has; otherwise the base side runs exactly as today.
- layer(s): pharn-floor (product), pharn-contracts (two contracts), product `.claude/commands` (two sentences)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Why (P7)

**The trigger is the maintainer's explicit direction** — this run's prompt ("PR 2: Reuse Verified BASE Regression
Evidence"), recorded as such (P5; the `check-plan-lessons` sub-check D precedent), not a measurement this plan
re-derives. For context only: the roadmap's earlier token-cost measurement (`/pharn-regress` ~63% of relative cost on
three small fixes, from an older installed version) was the trigger of 6.23.0's stage script, which already answered
its token half; roadmap item 4.2 was held until the maintainer's M3 measurement, which was **not** taken here. So the
benefit this plan claims is the one it measures: deterministic work and wall-clock per repeated regress
(`MEASUREMENT.md`). No token saving is claimed. The scope is the maintainer's: BASE-side reuse only, within one
delivery run, no HEAD/VERIFY reuse, no REGRESS/VERIFY deduplication.

## Confirmed current behavior (read this run, `stage-regress.mjs` at `a2b5f6b`)

Every fresh `stage-regress.mjs` invocation:

1. **deletes all prior regress evidence** — `phaseFreshLate` runs `clearBaseWorktree()` then
   `rmSync(".pharn/pharn-regress", {recursive})`: the previous base stamp and logs, the head stamp, `scope.json`;
2. **creates the BASE worktree** — phase `worktree`: `git worktree add --detach .pharn/pharn-regress/base <base>`;
3. **installs at BASE** — phase `install`: `spawnGate(install.cmd)` in that worktree (`npm ci` for an npm lockfile)
   whenever `INSTALL_RULE` resolves a command;
4. **initializes the BASE gates** — phase `base-init`: `run-gates.mjs init --side base --spec-from head --cwd base`
   (wipes `base-gates/`, fingerprints the base worktree, records `git rev-parse HEAD` there);
5. **runs every BASE gate** — phase `drain-base`: one `run-gates.mjs run --next` child per gate, two worktree
   fingerprints per gate;
6. **creates the BASE stamp** — the last `run --next` finalizes `base-gates/stamp.json`;
7. **removes the BASE worktree** — phase `cleanup`: `git worktree remove --force`.

Nothing is carried between invocations; `stage.json` exists only to resume ONE invocation chain. Measured before any
change, with `main`'s floor on a fixture (`measure.mjs`, scratch run): two identical invocations each made 1 worktree
checkout, 1 install, 3 base gate runs and 3 head gate runs (10.9 s and 10.1 s).

**Where one delivery run invokes regress more than once** (read this run):

- `/pharn-loop` Step 5 item 2 — every iteration `N` runs `/pharn-regress --base <base sha>`, the SAME base SHA for
  the whole run (resolved once in Step 1a); and Step 5 item 3 — a `check-loop-fresh.mjs` `RERUN` naming `regress`
  re-invokes it inside the same iteration ("a verify re-run can cascade into a regress re-run").
- `/pharn-ship` step 1 (iteration 1) and Step 2b's single build-completion retry (iteration 2) — both without
  `--base`, so `BASE_RULE` resolves the base each time (after a build the tree is dirty, so both resolve `HEAD`).

In every one of those repeats all seven steps above run again, even when nothing about the BASE side changed.

## The design

### What the BASE requirement is (the reuse identity, derived — never assumed)

A fresh BASE execution depends on the inputs below **and on whatever its gates read outside the base worktree**
(grill F2): the worktree is nested at `.pharn/pharn-regress/base`, inside the HEAD tree, so a tool that searches
parent directories (node's module resolution, npm's `.bin` PATH, tsc/prettier/eslint config lookup) can reach the
HEAD tree's root; the environment and the machine are read too. The fresh path has always been exposed to those reads.
The requirement binds every one of them PHARN can enumerate:

- the base commit;
- the spec `run-gates.mjs init --side base` copies from the head record (`source`, `source_raw`, `style_skipped`,
  `required`, and every entry's ordered `id`/`shell`/`argv`/`files` — which already carries the outside-test list,
  the outside eval pairs, the style skip, explicit-vs-discovered gates and the e2e exclusion);
- the install decision (`INSTALL_RULE`, a `--install`/`--no-install` override included) and the per-gate timeout;
- the formats the evidence is written in (the gate-run stamp schema and the fingerprint algorithm);
- **`head_root`** — the content sha256 of every ROOT-LEVEL path in `inside` (changed since base, tracked or
  untracked-not-ignored): the only HEAD files a parent-directory search from the nested base worktree can reach that
  differ from the base's own copies (a root file unchanged since base is shadowed by the base worktree's identical
  copy, which the search meets first).

```text
requirement = {schema: "pharn-regress-base-requirement/1", feature, base, gate_run_schema, fingerprint_algo,
               spec: {source, source_raw, style_skipped, required, entries: [{id, shell, argv, files}]},
               install: {kind, cmd}, timeout_ms, head_root: [[path, sha256 | null], …]}
requirement_sha256 = sha256(JSON.stringify(requirement))   // fixed key order by construction
```

- **The spec is computed by the SAME function `init --side base` uses** — extracted from `run-gates.mjs` into
  `gate-run-core.mjs` as `baseSpecFrom(headRecord, feature)` (one owner, L35), applied to the finalized head stamp
  exactly as `init` reads it.
- **The evidence's requirement is read from the evidence itself**: the base stamp records `head`, `feature`,
  `schema`, `fingerprint.algo`, `source`, `source_raw`, `style_skipped`, `required` and each run's
  `id`/`shell`/`argv`/`files`. Only the install decision, the timeout and `head_root` are not in a stamp, so the
  record carries exactly those three about the requirement — no second copy of the spec (L35).
- **Never reused, by rule** (`evidence-unreliable`): a run with NO install (dependency resolution may then walk up
  into the HEAD tree's `node_modules/` or npm prefix — grill F2's proportionate mitigation), an install that failed or
  timed out, or a base gate that timed out.
- **Deliberately NOT part of it**, each for a stated reason: the rest of the HEAD tree (a new build that leaves the
  above alone must still HIT); `--budget-ms` (it decides where an invocation pauses, never a gate's result); the
  install's `unmeasured`/`family`/`reason` labels; the install's logs and duration; the head stamp's fingerprints;
  `e2e_excluded` (an excluded id is simply absent from `entries`); the base worktree's fingerprint (the stamp records
  it; nothing predicts it).
- **Named residual:** ignored HEAD root content (`node_modules/`, `.env`, caches) is reachable by the same search and is
  not bound (it cannot be hashed cheaply); with an install, the base worktree's own `node_modules/` shadows the common
  case.

### Where the evidence lives — unchanged, and retained

The BASE evidence stays exactly where it is produced and read today: `.pharn/pharn-regress/base-gates/`
(`stamp.json` + each gate's `.out`/`.err`/results file) — the path `check-loop-fresh.mjs`'s `DEFAULT_STAMPS` reads.
No copy, no second format. The only lifetime change: the fresh start clears `.pharn/pharn-regress/` **except
`base-gates/`** (kept only when `lstat` says it is a real directory). Everything else is cleared as today.

### The reuse record — the binding, kept where the write tools cannot reach it (L65)

`<git rev-parse --absolute-git-dir>/pharn-regress-base-reuse.json` (per worktree), schema
`pharn-regress-base-reuse/1`, closed keys:

```json
{
  "schema": "pharn-regress-base-reuse/1",
  "feature": "<slug>",
  "run": { "command": "pharn-loop | pharn-ship", "marker_sha256": "<64 hex>" },
  "stamp_sha256": "<64 hex>",
  "install": { "kind": "cmd", "cmd": "npm ci" },
  "install_result": { "ran": true, "exit": 0, "timedOut": false },
  "timeout_ms": 540000,
  "head_root": [["package.json", "<64 hex>"]]
}
```

**Why the git dir and not `.pharn/`** (probed this run): `enforce-writes-scope.cjs` always allows `.pharn/**` to the
write tools, so a record there could be rewritten between two regress invocations by the very build the next one
judges. The write tools cannot write the git dir: `protect-trusted-paths.cjs` denies any path with a `.git` segment
under a guarded root (a main checkout: `.git/…` → exit 2, `.pharn/…` → exit 0), and for a linked worktree, a submodule
or a separate git dir, `enforce-writes-scope.cjs` denies a path inside another git tree or outside the project in
every posture (grill F6; the ★ HOOK test runs both real hooks on both layouts). The record binds the stamp by sha256
and the stamp binds its logs by sha256, so a write-tool edit of any retained evidence file reads as a MISS.

**What remains reachable, stated (grill F1):** a Bash writer reaches the git dir and `.pharn/` alike (L19) and can
forge the record and the evidence together. And the base side's own in-progress scratch (`stage.json`,
`base-gates/state.json`) is Write-reachable while its chain is paused at a `continue`; forging it falsifies that
invocation's base evidence — as it can today on the fresh path — and with reuse the falsified evidence would then be
published and reused by later invocations of the same run until their requirement changes. Named, with the follow-up
`regress-paused-chain-integrity` (a git-dir digest of the in-progress record, which would close it for both paths).

### Lifetime — one delivery run, bound to its run marker

The delivery run is identified by the run marker the orchestrator already opens and nothing rewrites during the run:
`.pharn/pharn-loop/<name>/active.json` (`require-loop-record.cjs --open`) or `.pharn/pharn-ship/<name>/active.json`
(`run-marker.mjs --open`). **The marker is never parsed** (grill F4 — both writers' headers say no reader parses
it): it counts when it is PRESENT and OPEN by the write guard's own rule — a regular file (`lstat`, never followed,
no symlink component) whose mtime is within 24 h of now in either direction — and the identity is
`{command, marker_sha256 = sha256(its bytes)}`. Each `--open` rewrites the file (a new `started_at`), so a new run has
new bytes. Exactly one of the two marker paths present ⇒ an identity; none or both ⇒ no delivery run (a
`pharn-review` marker is never looked at). A standalone `/pharn-regress` (no marker) never publishes and never reuses.

**Bounds, stated (grill F7):** the markers live in `.pharn/`, so the binding is relative to a Write-reachable file —
restoring an earlier run's marker bytes within 24 h re-binds that run's record; and a marker a crashed run left behind
counts as open for 24 h (the write guard's own rule), so a standalone regress in that window binds to it. The run
identity is read at DECISION time and persisted; publication requires the same identity again.

### The predicate — tested code, first failure decides (P5)

`regress-base-reuse-core.mjs` `decideBaseReuse(...)` returns `{reused, miss, requirementSha256, stampSha256, run}`.
`miss` is a member of `BASE_REUSE_MISSES` (owned by `stage-regress-core.mjs` with the stage's other closed
vocabularies, because its G8 pin keeps that module's import list at `gate-run-core.mjs` and the progress validator
must check membership; closure tested both ways, L29/L36), in evaluation order:

| miss                  | when                                                                                                |
| --------------------- | --------------------------------------------------------------------------------------------------- |
| `requirement-unknown` | the current spec cannot be derived from the head stamp (base-init would then refuse as today)       |
| `no-delivery-run`     | not exactly one open run marker for this feature                                                    |
| `no-record`           | no reuse record                                                                                     |
| `record-malformed`    | the record is unreadable, not a regular file, or fails its closed schema                            |
| `other-run`           | the record names another feature, or another run's marker                                           |
| `evidence-missing`    | no `base-gates/stamp.json`                                                                          |
| `evidence-unbound`    | sha256(stamp bytes) ≠ the record's `stamp_sha256`                                                   |
| `evidence-invalid`    | a link or unreadable stamp; not JSON; `validateStamp` (regress, base, feature) refuses it —         |
|                       | unfinalized included; or a recorded stdout/stderr/results sha256 is not the file on disk (check J's |
|                       | rule, read no-follow — stricter than J, which follows a link)                                       |
| `version-changed`     | the stamp's fingerprint algorithm is not the current `ALGO` (its schema is `validateStamp`'s)       |
| `base-changed`        | the stamp's `head` is not this invocation's base SHA                                                |
| `gates-changed`       | the stamp's spec differs from the current one (source, raw, style skip, required, ordered entries)  |
| `execution-changed`   | the install decision, the timeout, or `head_root` differs                                           |
| `evidence-unreliable` | no install, an install that failed or timed out, or a timed-out base gate                           |

HIT only when every row passes. A MISS never asks and never guesses: it runs the BASE side exactly as today.

### The flow

```text
fresh start (clear scratch EXCEPT base-gates/) → chain → base → partition → head-init → drain-head
  → decide (after the HEAD side is finalized; re-done on a resume at drain-head — the drain is idempotent)
     HIT  → verdict: RE-RUN the full predicate over the disk (a persisted HIT is never trusted — grill F1); it must
            HIT on the same stamp bytes, else fall back to MISS (its own category) and run the base side
            → cleanup SKIPPED (no worktree was made) → render
     MISS → worktree (first discard: record, then base-gates/) → install → base-init → drain-base
            → verdict → publish ONLY a record the predicate accepts now, bound to the DECISION-time run identity
            → cleanup → render
```

- The HEAD side always runs (drain-head precedes the decision).
- `check-regress.mjs` and `validateStamp()` are untouched: a reused stamp is the same file, read by the same checker,
  under the same validation. check-loop-fresh C/D/E/H/J read the same retained files and pass unchanged.
- **Publication goes through the predicate.** At verdict (exit 0 or 1: both stamps validated, the specs agree, the
  base head matches), the stage builds the record it would publish and publishes it only if `decideBaseReuse` HITs
  with it — so a published record always binds evidence that meets the current requirement, is finalized, has
  intact logs, was installed, and belongs to the run the decision saw.
- The progress record becomes `pharn-stage-regress-progress/2`: it gains `baseReuse` — `null` at `drain-head`, the
  decision from then on (a HIT decision only at `verdict`). A `/1` record read by `--resume` is `unusable
progress-malformed`: the command stops (S9 in `/pharn-loop`) and a person re-runs `/pharn-regress` fresh (grill F8).
  No second resume protocol.

### Observability — minimal, structured

- `regression-report.json` gains ONE additive advisory block, appended last:
  `"base_evidence": {"reused": bool, "miss": <member> | null, "requirement_sha256": <hex> | null, "recorded": bool}`.
  `reused: true` means this invocation created no base worktree, ran no install and ran no base gate;
  `gate_run.base.stamp_sha256` (the checker's own field) names the stamp either way. `recorded` says whether a reuse
  record binds that stamp when the invocation ends (grill F13) — so an unwritable git dir or a standalone run is
  visible. Every key the checker printed keeps its bytes (a test pins report-minus-block == the checker's stdout). The
  contract already ignores extra keys, and no floor op reads the block.
- `REGRESSION.md` gains one line naming reuse or the miss category and whether the evidence is recorded; on a HIT the
  install line says no install ran. No large payload.

## Crash and atomicity (never a false HIT)

- **While BASE evidence is produced / installed / a base gate runs**: a MISS removes the old record (then the old
  evidence) before `base-init`; a resume continues as today; a fresh start finds no record → `no-record` → recompute.
- **Publication**: tmp + `rename` inside the git dir, only after the verdict and only for a record the predicate
  accepts. A kill before the rename leaves no record (a stray `.tmp-<pid>` file is never read as one — named). A kill
  right after leaves a complete record binding a finalized, validated stamp; the resumed invocation re-runs `verdict`
  and re-publishes the same bytes.
- **Consumption**: a HIT is re-decided in full at `verdict`, in the same and in any resumed invocation; any change
  falls back to a MISS and a recompute.
- A partially written or unfinalized stamp can never pass: `validateStamp` refuses `finalized !== true`, and the sha256
  binding refuses any byte that differs from the published evidence.
- **Rollback (grill F9):** a floor older than this one never reads the git-dir record (inert) and reads a `/2`
  progress record as `progress-malformed` (stop, re-run fresh). Nothing removes the record when a run ends; it is inert
  once its marker is gone or rewritten, and the next MISS in that worktree removes it. Named.

## Files

- `pharn/floor/regress-base-reuse-core.mjs` — NEW. Pure rules: the requirement object + digest, the evidence's
  requirement, the delivery-run identity from marker bytes and mtime, the record builder/validator, the evidence file
  list, and `decideBaseReuse`. Imports `node:crypto`, `gate-run-core.mjs`, `stage-regress-core.mjs`. — layer
  pharn-floor
- `pharn/floor/regress-base-reuse-core.test.mjs` — NEW. Unit tests: every miss row with a one-input mutation that
  flips HIT→MISS, the irrelevant inputs that must not, record/marker validation, closure both ways, the age and path
  parity with the write guard and the two marker writers, the J-rule parity. — layer pharn-floor (test)
- `pharn/floor/regress-base-reuse.mjs` — NEW (P3: the reuse STORAGE is its own axis, so it does not grow
  `stage-regress.mjs` — grill F10). The execution half: `lstat`-first, `O_NOFOLLOW` reads of the markers, the record
  and the retained stamp; the evidence and `head_root` hashes; publication through the predicate (tmp + rename in the
  git dir); discarding. No CLI. — layer pharn-floor
- `pharn/floor/regress-base-reuse.test.mjs` — NEW. The I/O edges per path kind (L59): a link, a dangling link, a
  directory and an oversize file at a marker, record or stamp path are `unusable`; a `pharn-review` marker is ignored;
  the record lands in a linked worktree's own git dir; a failed publication leaves no record. — layer pharn-floor
  (test)
- `pharn/floor/run-gates.mjs` — `init --side base` calls `baseSpecFrom` (behavior unchanged); exports its
  `sha256RegularFile`, so the evidence logs are re-hashed by the function that recorded the results digest. — layer
  pharn-floor
- `pharn/floor/stage-regress.mjs` — retention, decision, HIT path, verdict-time re-decision, publication, report
  block, render inputs. — layer pharn-floor
- `pharn/floor/stage-regress.test.mjs` — end-to-end (see the test list). — layer pharn-floor (test)
- `pharn/floor/stage-regress-core.mjs` — `BASE_REUSE_MISSES`; `PROGRESS_SCHEMA` → `/2` with `baseReuse`
  validation. Still imports only `gate-run-core.mjs` (G8 pin unchanged). — layer pharn-floor
- `pharn/floor/stage-regress-core.test.mjs` — `/2` record cases. — layer pharn-floor (test)
- `pharn/floor/gate-run-core.mjs` — `baseSpecFrom(headRecord, feature)`, extracted from `run-gates.mjs` with the same
  refusals (`spec-mismatch`), total over parsed JSON (L62). — layer pharn-floor
- `pharn/floor/gate-run-core.test.mjs` — `baseSpecFrom` unit cases. — layer pharn-floor (test)
- `pharn/floor/render-regression.mjs` — the base-evidence line; the HIT install line. — layer pharn-floor
- `pharn/floor/render-regression.test.mjs` — render cases for HIT and MISS. — layer pharn-floor (test)
- `pharn/pharn-contracts/regression-report.md` — the additive `base_evidence` block and the miss vocabulary; the
  "verbatim" sentences corrected. — layer pharn-contracts
- `pharn/pharn-contracts/stage-exit.md` — the scratch-clear sentences now keep `base-gates/`. — layer pharn-contracts
- `.claude/commands/pharn-regress.md` — the N1 `unusable` bullet's "cleared that scratch" corrected, and one claims
  line on reuse. — product command
- `.claude/commands/pharn-loop.md` — the "expensive unattended" sentence corrected (base reused when unchanged). —
  product command
- `CHANGELOG.md` — `## [6.33.0]`. — repo meta
- `SKILLS_VERSION` — `6.33.0` (minor: a new shipped capability). — repo meta
- `README.md` — the version badge and the generated CURRENT-STATE floor count (`npm run docs:generate`). — repo meta
- `CLAUDE.md` — the stage-regress block: the progress schema id and one paragraph on BASE reuse. — repo meta
- `.dev/features/regress-base-reuse/MEASUREMENT.md` — the before/after counts and timings. — apparatus
- `.dev/features/regress-base-reuse/measure.mjs` — the measurement harness. — apparatus

`MIN_CLI` stays `0.5.0`: no installed path moves and no existing file changes shape for an older CLI; new floor files
are copied by `pharn update` (roadmap pre-check P1).

## Contracts satisfied

- `pharn/pharn-contracts/gate-run-record.md` — a reused BASE stamp is an unmodified `gate-run-record/1` stamp; no
  weaker variant exists.
- `pharn/pharn-contracts/regression-report.md` — the verdict fields are `check-regress.mjs`'s; the new block is
  additive and advisory ("Extra keys are IGNORED").
- `pharn/pharn-contracts/stage-exit.md` — exit codes, statuses and the regress registry are unchanged; no new
  reason_code.

## Evals to write (P1)

No Capability (`role:`) is added or changed, so no eval is owed. The floor modules carry `node --test` suites (Files
above), including the mandatory fresh-vs-reused equivalence test.

## Tests and negative controls (the build must deliver each)

- **Equivalence (mandatory).** One fixture with a real regression (an outside test broken), a pre-existing red gate,
  a green gate and an outside `structural:` eval pair. Path A: a fresh BASE execution (no run marker →
  `no-delivery-run`). Path B: a marker opened, a publishing run, then a run that HITs. Assert: B `reused: true`; A and
  B agree on `verdict`, `regressions`, `pre_existing`, `outside_gates`; the reused base stamp and A's fresh base stamp
  agree on every run's `id`/`exit`/`argv`/`shell`/`files` and on `head`/`source`/`required`; `check-regress.mjs
verdict` re-run over B's stamps reproduces B. A second HIT fixture has a `no-files` test entry.
- **The HIT path is real**, proven by counters, never by the predicate: a `post-checkout` hook counts worktree
  checkouts, the install command and each gate append to a counter file (base vs head by cwd). The first run counts
  non-zero (L34); the second counts zero worktree checkouts, zero installs, zero base gate runs, and every head gate.
- **HIT despite a HEAD change**: an implementation edit between the runs; still a HIT, and the head stamp moved.
- **A budgeted MISS chain** (`--budget-ms 1`, the pinned line's shape) that completes through `--resume`, publishes,
  and the next invocation HITs.
- **End-to-end MISS controls, one input each**, each also showing the base side ran: `--base` another commit
  (`base-changed`); a gate script added (`gates-changed`); an explicit `--gates` command changed (`gates-changed`);
  an outside test becomes inside (`gates-changed`); an eval pair becomes inside (`gates-changed`); a style config
  touched (`gates-changed`); `--install` changed and `--timeout-ms` changed (`execution-changed`); a new root-level
  file added between runs (`execution-changed`); the marker reopened as a new run (`other-run`); no marker, both
  markers, a >24 h marker (`no-delivery-run`); record deleted / malformed; stamp edited (`evidence-unbound`); a log
  edited, a symlinked log, a `base-gates/` that is a link or a file (`evidence-invalid` / `evidence-missing`); a
  foreign feature's retained evidence; a failed install, `--no-install`, a timed-out base gate
  (`evidence-unreliable`).
- **A forged `stage.json` HIT at `verdict`** (a record that does not bind the stamp) is not honored: `--resume` runs
  the base side.
- **Unit-only controls** where an end-to-end mutation cannot isolate the input: an unfinalized stamp and a foreign
  fingerprint algorithm, each re-bound by a matching record sha256, so only that row can fire.
- **Non-vacuity (L34/L60)**: every control asserts its own category.
- **Crash**: a kill during `drain-base` on a MISS run, then a fresh run → no false HIT.
- **★ HOOK**: both real hooks deny a Write to the record path — on a main checkout and on a linked worktree — and
  allow the same write under `.pharn/` (the reason the record is not there).
- **★ loop freshness**: `check-loop-fresh.mjs` reads FRESH over a HIT run, D/E/H/J each `pass`.
- **★ WIRING**: the pinned `pharn-regress.md` line reaches `done` twice under one run marker, the second a HIT.
- The e2e controls use a counting shell install, not `npm ci`, to keep `npm test` bounded; the ★ WIRING HIT uses the
  real `npm ci` line.

## Measurement

`measure.mjs` builds one fixture (an npm lockfile whose `postinstall` sleeps and counts, three gates that sleep and
count, a `post-checkout` counter), opens a loop marker, and runs the stage twice over the same requirement (an
in-scope edit between the runs) — once with `main`'s floor, once with this branch's. It records, per invocation:
worktree checkouts, installs, base gate runs, all gate runs, wall-clock, and the decision's own cost. Measured, never
assumed (L24). No token saving is claimed.

## Guarantee audit (P0)

- "Whether BASE evidence is reused is decided by tested code" → floor: enum-regex + content-hash (sha256 equality of
  marker, stamp, log and root-file bytes; membership in the closed miss set; equality of the requirement object).
  Running the stage at all stays advisory orchestration, as today.
- "A reused BASE stamp meets the same contract as a fresh one" → floor: `check-regress.mjs` and `validateStamp` are
  unchanged and read the same file; the predicate additionally re-validates it.
- "The verdict is computed by the unchanged checker over the stamps on disk" → floor (grill F3). **"That verdict
  equals the verdict a fresh BASE run would give now" → advisory**: it assumes the gates are deterministic for one
  commit, spec, install, timeout and root-file set, and that nothing the requirement does not bind changed (ignored
  root content, the environment, the machine) — the assumption the fresh path already makes of its one sample.
- "A HIT uses evidence a publication of this run bound to an identical BASE requirement" → floor, relative to the
  record, the stamp and the marker (equality).
- "The write tools cannot forge a HIT" → floor: hooks (`protect-trusted-paths.cjs` git metadata; `enforce-writes-
scope.cjs` other-tree/out-of-project), probed by the ★ HOOK test, **narrowed** (grill F1): the record is out of the
  write tools' reach, and a HIT is re-decided at the verdict; forging the base side's in-progress scratch during a
  paused MISS chain can still bind falsified evidence (named above). A Bash writer can forge anything (L19).
- "Evidence never crosses delivery runs" → floor relative to the marker bytes and mtime; **not** that the marker
  belongs to a live run, and the marker is Write-reachable (bounds above).
- The report block is advisory and read by no floor op.

## Trust audit (P2)

- The run markers are hashed and `lstat`ed, never parsed. The record, the stamp and its logs are deterministic-tool
  JSON/bytes under `.pharn/` and the git dir, parsed as strings, integers and hex digests, hashed and compared; never
  executed or rendered as text. Logs and root files are hashed, never read.
- The report block carries booleans, a closed-enum member and a hex digest; the render line quotes only those.
- No new untrusted input reaches a shell: the stage still passes git and node argument vectors.

## Determinism audit (P5)

Every branch is a membership or equality test. There is no fallback to a question: a MISS is the safe, fully defined
default (the base side runs exactly as today). Nothing is classified by a model.

## Applied lessons

- L5 — the requirement is computed by code from the head stamp and the scope record, never typed by the orchestrator
  or read from a report.
- L24 — the before/after numbers are measured on a fixture built to exercise the base side, with `main`'s script as
  the control, never inherited.
- L29 — the miss vocabulary is one materialized enum that every rule and test iterates.
- L34 — the HIT counters are asserted non-zero on the first run, so a zero on the second cannot come from a fixture
  that counts nothing.
- L35 — the requirement is read from the stamp itself (no second copy of the spec), and `baseSpecFrom` is extracted
  so base-init and the predicate share one owner; publication reuses the predicate instead of a second rule.
- L36 — closure both ways: every miss literal the core returns is a member, and every member is returned by some input.
- L41 — the pinned `pharn-regress.md` line (its real `--timeout-ms` and `--budget-ms`) is executed twice, not only the
  tests' own explicit values.
- L42 — the decision answers "was this evidence produced for this requirement", never re-runs a gate to ask "would
  it pass now".
- L43 — the record, the stamp and the marker agreeing proves agreement, never provenance; the plan and the code say so.
- L45 — the HIT is proven through the real CLI and the command's pinned line, not only the predicate.
- L54 — every evidence, record and marker read is `lstat`-first; absence is `lstat`'s own ENOENT.
- L58 — the record binds the stamp (immutable once finalized) and the marker (rewritten only by a new run); a log
  appended by a detached descendant after binding is re-hashed at decision time and MISSes, and the one window it
  cannot see (an append after a HIT, before the loop's check J) is named.
- L59 — log, stamp, record and marker files are read through an `O_NOFOLLOW` descriptor and `fstat`-checked; a symlink
  is a miss, never followed.
- L60 — each negative control asserts its own miss category, and the unit controls re-bind the record so only the
  targeted row can fire.
- L65 — the record the next regress compares against is kept where the write tools cannot reach it, a ★ HOOK test
  executes both real guards to prove it, and the one Write-reachable input left (the paused-chain scratch) is named.

## Named residuals (not closed here)

- A Bash writer can forge the record and the evidence together (L19); nothing detects it.
- The paused-chain Write-tool forgery above (`regress-paused-chain-integrity`).
- Gate nondeterminism, ignored HEAD root content and environment drift within one run are reused as sampled.
- A marker a crashed run left (≤ 24 h), or restored marker bytes, binds a later regress.
- Retention stretches check J's detached-descendant trip across iterations: a base gate's detached descendant that
  appends to a retained log after a HIT trips J (`output-hash-mismatch`, S11) at a later check, where a fresh start
  used to unlink that log (grill F11).
- A kill between the record's tmp write and its rename leaves a `*.tmp-<pid>` file in the git dir.
- If the git dir is not writable, nothing is published (`recorded: false`) and every repeat MISSes `no-record` —
  never a false HIT.
- `/pharn-dev-regress` (the dev twin, prose-driven) is unchanged.

## Grill amendments (orchestrator, before the build)

`GRILL.md` holds the independent grill's 13 findings; every one was accepted and is folded into the sections above:
F1 (full re-decision at verdict, publication through the predicate, narrowed Write-tool claim), F2 (requirement
restated; no-install never reused; `head_root` bound), F3 (verdict claim split), F4 (markers hashed, never parsed),
F5 (trigger restated), F6 (`--absolute-git-dir`, both hooks, both layouts), F7 (decision-time identity), F8 (`/1`
wording), F9 (rollback), F10 (I/O module), F11 (J residual), F12 (tests), F13 (`recorded`).

## Open questions (HALT)

None left open. GATE 1 is delegated by the maintainer's own instruction for this run ("Do not stop after writing a
PLAN"); the design choices above, and the grill amendments, are recorded as model decisions made under that
delegation, not as a human approval.
