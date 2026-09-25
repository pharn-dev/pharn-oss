# PLAN — crash-routing

- spec_content_hash: 4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f
- applied_lessons: [L5, L6, L29, L33, L35, L36, L40, L45, L50, L52, L55, L58]
- increment: Close the two crash-routing follow-ups 6.20.6 named (`loop-fresh-load-crash`, `nested-child-crash`) and the straddle test gap 6.20.8's review named, so that a checker that CRASHED is never read as a RERUN or as a RED about the AC evidence.
- layer(s): product floor (`pharn/floor/`), `pharn-contracts` (`ac-tests.md`, `gate-run-record.md`), product commands (`/pharn-loop`, `/pharn-test`, `/pharn-plan` — one sentence each), repo meta (`CLAUDE.md`, `CHANGELOG.md`, `SKILLS_VERSION`, the README badge)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Trigger (P7) — three recorded follow-ups, each reproduced live at `cf90897` (6.21.0)

The reproduction is a scratch script run against a copy of this tree's `pharn/floor/` (outside the repo, never
committed); the new tests below re-state each case.

1. **`loop-fresh-load-crash`** (`.dev/features/loop-fresh-integrity/SHIP.md`, "Follow-ups"; the header bullet
   `ITS OWN LOAD FAILURE` in `pharn/floor/check-loop-fresh.mjs`). `check-loop-fresh.mjs` imports
   `gate-run-core.mjs`, `worktree-fingerprint.mjs` and `test-infra-core.mjs` statically, so a module that cannot load
   ends the process before any line of the checker runs. Node exits **1**, which is `EXIT.RERUN`, with **no JSON**.
   Measured:
   - control (intact copy, no reports): exit 1 **with** the JSON `{"verdict":"RERUN","stage_to_rerun":"verify",…}`;
   - `test-infra-core.mjs` appended `throw new Error(…)`: **exit 1, stdout empty**;
   - `test-infra-core.mjs` deleted: **exit 1, stdout empty** (`ERR_MODULE_NOT_FOUND`);
   - **a run-time throw with NO code change** (found while reproducing — the follow-up names only load failures): a
     `.pharn` that is a regular file, and no reports. Check A asks for a re-run, the budget ledger's `mkdirSync`
     throws `ENOTDIR`, and the process exits **1, stdout empty**. So "uncaught failure" is reachable from input, not
     only from a broken install.

   `/pharn-loop` Step 5 sub-step 3 reads exit 1 as "re-invoke `stage_to_rerun`", and there is none to read.

2. **`nested-child-crash`** (same SHIP.md; `check-test-stage.mjs` header, "THE BOUND"). `check-ac-tests.mjs` `main`
   turns ANY non-zero exit of the shelled `check-plan-spec-agree.mjs` into a `pin` finding, and `ac-tests-lock.mjs`
   `specApprovalError` does the same with `check-spec-approved.mjs` for a bootstrap lock. Measured over a copied floor:
   - a `check-plan-spec-agree.mjs` that throws **only when handed AC-TESTS.md** (so check-loop-fresh check I's own run
     over PLAN.md still reads GREEN, exit 0): `check-ac-tests.mjs` → exit 1, `RED — pin: … (check-plan-spec-agree.mjs
exit 1)`; `check-test-stage.mjs demo --require-test-first` → exit 1, **`RED mapping-red`**. check-loop-fresh
     check I maps that to `ac-evidence-invalid`, which `/pharn-loop` stops on as **S13** ("set the build aside and
     re-run /pharn-test") for a fault that says nothing about the tests;
   - a `check-spec-approved.mjs` that throws at load, under a bootstrap lock: `ac-tests-lock.mjs --check demo
--require-red-run --allow-bootstrap` → exit 1, `RED — …SPEC.md is not an Approved, un-drifted SPEC
(check-spec-approved.mjs exit 1)`; `check-test-stage.mjs demo` → exit 1, **`RED lock-red`**;
   - `--write-bootstrap` over the same crash already exits 2, but its line blames the SPEC ("is not an Approved,
     un-drifted SPEC").
3. **The straddle test gap** (`.dev/features/reconcile-symlink-target/REVIEW.md`, advisory finding on
   `check-loop-fresh.test.mjs`; SHIP.md "Recorded follow-ups"). The `★ UPGRADE STRADDLE` block pins F and G for a
   PASSing verify report only. An honest pre-upgrade report that FAILED on the AC gate, read through 6.20.6's
   moved-tree check E (which subtracts the AC ids), is exercised by no test. This is a coverage gap, not a defect: the
   test is expected to pass on today's code, and a mutation (E stops subtracting the AC ids) must make it fail.

## Applied lessons

- **L5** — the capture of a shelled checker's result is the input boundary here. Both children read "exit non-zero"
  as a verdict, and the verdict they emit is only as good as that capture. The fix classifies the capture (a verdict
  in two exact shapes, a crash otherwise) and fails closed on any surprising shape — another exit code, a signal, a
  spawn error.
- **L6** — the grandchild's report is read from a STRUCTURED location, never grepped from prose: a closed token as
  the FIRST stdout line, which the reporting checker itself prints (`UNUSABLE child-crashed — …`), plus its exit code.
  The RED test stays 6.20.6's line-anchored `^RED —` token.
- **L29** — each remedy is quantified over a set, so each set is materialized and iterated: the failure MODES (throw
  at load, missing module, a run-time throw, exit 1 with no line, a signal, a spawn error), the entry's static load
  graph (computed from the source, never hand-listed), and the two shelling SITES (`check-ac-tests` →
  `check-plan-spec-agree`, `ac-tests-lock` → `check-spec-approved`).
- **L33** — two "named follow-up" sentences expire when this lands (the `ITS OWN LOAD FAILURE` bullet and
  `check-test-stage.mjs`'s "one level down only"), plus the contract's and `CLAUDE.md`'s copies. Swept by the
  shortest invariant substrings (`load failure`, `level down`, `level further`, `node's 1`, `RERUN code`, the two
  follow-up slugs) across the tree outside `.dev/features/` and the frozen CHANGELOG; the hits are the Files below.
- **L35** — two facts must be written twice, because the copy that needs them cannot load the other: the entry's exit
  code 2 and its document keys (it may not import the core it guards). Each is pinned by one test against the core.
  The crash rule and its token are NOT copied: they live once, in `shelled-verdict-core.mjs`, which the two children
  and `check-test-stage.mjs` import (its inline `^RED —` regex is retired into it).
- **L36** — `checker-crashed` joins the closed `REASON_CODES` set, and the existing closure tests in
  `gate-run-core.test.mjs` are kept closed in both directions by adding the new core module to `EMITTING_MODULES`. A
  ✧ pin forbids a static `import` in the entry, so the gap cannot re-open through one added line.
- **L40** — to test "an exit without a `RED —` line is a crash", the condition is varied, not only the member: every
  crash case has a control where the same checker exits 1 WITH its line (a real pin RED, a real approval RED — a
  drifted SPEC), and each must still read as the RED.
- **L45** — every fix is also exercised through its INVOCATION: the pinned `/pharn-loop` decision line, executed in a
  fixture whose copied floor carries the broken module (the load crash) or the input-dependent grandchild crash
  (→ `front-stage-red`, never `ac-evidence-invalid`), not only by spawning each script by path.
- **L50** — the referent that moves is `check-loop-fresh.mjs`'s header (it becomes `loop-fresh-core.mjs`'s). Its cites
  were enumerated: `pharn-loop.md` ("`pharn/floor/check-loop-fresh.mjs`, header"), `command-hygiene.test.mjs`'s argv
  pin, `gate-run-core.test.mjs`'s `EMITTING_MODULES`, and the test file's own L52 source scan. Each is updated below.
  Cites of `check-loop-fresh.mjs` as THE CHECKER (contracts, other headers, CHANGELOG) stay true: it is still the one
  command every caller runs.
- **L52** — the straddle remedy names its SET in the same sentence: every AC-failure shape a pre-upgrade report can
  carry — delivery only (`ac-delivery`), delivery with a red gate (`ac-delivery`, `test`) and evidence (`ac-evidence`)
  — each at the iteration AND the commit gate.
- **L55** — no report in the new tests is hand-typed: each is produced by the REAL `check-verify.mjs --ac-gate` from a
  real stamp (the suite's `iterate` helper), and each grandchild crash is produced by the REAL checker, broken in a
  copy, never by a mock.
- **L58** — the straddle test is L58's split, tested for the part 6.20.6 deferred: over a moved (here: re-algo'd)
  tree, E compares only what the stamp alone decides, and the AC part is re-run at F. An honest AC-failed report must
  therefore pass E and re-run, never STOP as a forgery.

## Design

### 1. `loop-fresh-load-crash` — a CLI entry that loads the checker dynamically

- **`pharn/floor/loop-fresh-core.mjs` (new; the checker).** The current `check-loop-fresh.mjs` moves here unchanged in
  behavior: every export, every check, every constant. What changes: `main()` is removed (the entry prints); the
  header's first lines name the file and its CLI; the `ITS OWN LOAD FAILURE` bullet leaves NOT COVERED and becomes a
  FLOOR line (a failure to load or run this checker is INCONCLUSIVE through the entry), with the entry's residuals
  referenced; check I's row names the grandchild crash (item 2); the Usage/Exit block moves to the entry. Run
  directly (`import.meta.main`), the module prints one stderr line naming the entry and exits **2**, so a
  mistaken direct call can never read as exit 0 = FRESH.
- **`pharn/floor/check-loop-fresh.mjs` (rewritten; the entry, same path).** No static `import` at all. It loads
  `./loop-fresh-core.mjs` with `await import()` inside a `try`, calls `evaluate(argv)` inside a second `try`, and
  prints ONE JSON document. A failure in either becomes `{verdict: "INCONCLUSIVE", stage_to_rerun: null,
reason_code: "checker-crashed", reason: <which, with the error's first line, bounded>, checks: null, reruns_used:
null}`, exit **2**, the stack on stderr. It sets `process.exitCode` (the flush rule's form), never
  `process.exit`. The `NOTE (P0)` stderr line moves here, printed as before for every non-INCONCLUSIVE verdict.
  Guarded by `import.meta.main`, so importing it does nothing. Every pinned command line is unchanged, so no command
  or install changes how it calls the checker. Its header states what it cannot catch: a syntax error in the entry
  itself, a throw a loaded module schedules asynchronously, a module that ends the process itself, a top-level await
  that never settles (node exits 13), and a kill by signal. None of these exists in the floor today.
- **`checker-crashed`** joins `gate-run-core.mjs` `REASON_CODES` (sorted), NOT `LAPSE_CODES` (a crash is no verdict:
  fail-closed, S11 — the comment beside `LAPSE_CODES` names it). A new member rather than `usage-error`, because the
  loop quotes the JSON into the record a person reads, and "usage error" would send them to the invocation.
  Existing `usage-error` uses for a child that produced no JSON are left alone (not this increment's axis).
- **Why an entry + core, not dynamic imports inside one file:** a single file cannot catch its OWN parse or load
  failure, and the core is the file that changes every increment. The entry is small and has nothing to load. This
  is the shape the user named, and the `check-red-run.mjs` / `red-run-core.mjs` pair's (the CLI holds usage and exits;
  the core holds the checker and its header).
- **Install:** the installer copies `pharn/floor/` whole except `*.test.*` and `test-fixtures/` (read in pharn-cli
  `src/lib/install-manifest.ts`, `addDir(paths.floor, …)`), so the new module reaches every install and `pharn
update`. No installed path moves, so `MIN_CLI` stays 0.5.0. One API consequence, stated in the CHANGELOG:
  `check-loop-fresh.mjs` no longer exports anything; importers use `loop-fresh-core.mjs` (only this repo's test did).

### 2. `nested-child-crash` — the children tell a grandchild's crash from its RED, and the gate reads the report

- **`pharn/floor/shelled-verdict-core.mjs` (new, ~50 lines, no imports).** ONE copy of the rule and the token:
  - `RED_LINE` — `/^RED — /m`, 6.20.6's regex, moved here from `check-test-stage.mjs`;
  - `shelledVerdict(r)` over a `spawnSync` result of a checker whose contract is exit 0 (GREEN) or exit 1 with a
    `RED —` line — `check-plan-spec-agree.mjs` and `check-spec-approved.mjs`: `"green"` | `"red"` | `"crashed"`.
    Anything else is `"crashed"`: exit 1 without the line, any other code, a signal (`status === null`), a spawn
    error (`r.error`);
  - `crashedDetail(script, r, consequence)` — one bounded sentence: how it ended, the first `…Error…` line of its
    stderr (JSON-escaped, ≤ 200 chars) when there is one, and what was therefore not checked;
  - `CHILD_CRASHED = "UNUSABLE child-crashed"`, `childCrashedLine(detail)` and `reportsChildCrash(stdout)` — the
    producer's line and the consumer's test (stdout STARTS with the token and `—`), so they cannot disagree.
- **`check-ac-tests.mjs` (full mode).** The chain check is read with `shelledVerdict`. `red` → the `pin` finding, as
  today. `crashed` → no `pin` finding. If another kind is RED, the exit stays **1**: the RED lines, then the
  `UNUSABLE child-crashed — …` line, then the closing `RED — N … failed` line (a definite RED is a verdict whatever
  the pin would have said — the AC gate's "a red gate beats an unmeasured reading" precedent). If nothing else is RED,
  exit **2** with `UNUSABLE child-crashed — …` as the FIRST line, then any `NOTE —` lines.
- **`ac-tests-lock.mjs`.** `specApprovalError` becomes `specApproval` → `{red, crash}`. `buildBootstrapLock` refuses
  a crash with `{ok: false, crashed: true, reason}`, and `--write-bootstrap` prints it as `UNUSABLE child-crashed — …`
  (exit 2 as today — only the line changes). `checkLock` returns `{reds, crash}` (its only callers are this file's
  `--check` and `--record-red-run`; nothing else imports it — grepped): `--check` prints the REDs (exit 1, the crash
  named on a line before the closing RED) or, with no RED, the token line (exit 2). A test-first lock spawns nothing,
  so its `crash` is always `null`; `--record-red-run` (test-first only) says so in a comment rather than carrying an
  unreachable branch. The `--check` argv line `requireRedRun: args.includes("--require-red-run"),` is kept byte-for-byte:
  `check-loop-fresh.test.mjs`'s ★ WIRING crash test anchors on it.
- **`check-test-stage.mjs`.** `run()` records `crashReport: reportsChildCrash(stdout)`; the full-mapping branch and
  `fromLock` read a child's **exit 2 with that first line** as UNUSABLE (exit 2) — "a checker it shells crashed" —
  BEFORE the existing `mapping-red` / `lock-unusable` mapping of exit 2. Every other exit-2 cause keeps its RED (an
  unreadable input file, a malformed lock). Its inline `^RED —` regex becomes the imported `RED_LINE`. check-loop-fresh
  check I needs no change: it already maps check-test-stage's exit 2 to `front-stage-red` (S11).
- **The remaining bound, stated in the header and the contract:** one level further down, a crash is still read by
  its parent as that parent's own RED: `check-plan-spec-agree.mjs` reads a crash of `check-spec-approved.mjs` or
  `check-spec.mjs` as its RED, and `check-spec-approved.mjs` reads `check-spec.mjs`'s the same way. In the loop that
  is pre-empted, not closed. Check I runs `check-spec-approved.mjs` and `check-plan-spec-agree.mjs` over the SAME
  SPEC.md first, and every deeper call the nested run makes has an identical twin there. AC-TESTS.md is read only by
  `check-plan-spec-agree.mjs` itself, the level this increment fixes. So only a crash those identical runs do not
  reproduce (resource exhaustion, a race) still reaches the gate as a RED. Outside the loop (`/pharn-build`,
  `/pharn-ship`) the gate runs first, so a deeper crash reads `RED mapping-red` / `lock-red`. That is still a refusal,
  with the wrong remedy named.

### 3. The straddle test

One `await t.test(…)` appended inside the existing `★ UPGRADE STRADDLE` block: for each AC-failure world (L52's set
above), one ordinary iteration through `iterate` (the real `check-verify.mjs --ac-gate`), the verify stamp retagged
to the previous `ALGO`, the report regenerated from it (so D holds), a precondition that the report is `FAIL` with an
AC id in `failing_gates`, then: at `--iter` → `RERUN verify`, `tree-moved-since-verify`, `checks.E === "pass"`, the
reason naming both algos; at `--commit-gate` → `STOP tree-moved-since-verify`, `checks.E === "pass"`. Verified at
build by a scratch mutation (E stops subtracting `AC_RESERVED_IDS`) that turns each world into `STOP
report-verdict-mismatch` — the test's discriminating power, measured and recorded in BUILD.md, never committed.

## Files

- `pharn/floor/loop-fresh-core.mjs` — NEW: the checker, moved from `check-loop-fresh.mjs` unchanged in behavior; `main()` removed; direct invocation exits 2; header: file names, the load-failure bullet → FLOOR, check I's row, Usage/Exit moved to the entry — layer product floor
- `pharn/floor/check-loop-fresh.mjs` — REWRITTEN as the entry: no static import, dynamic `import()` of the core, crash → INCONCLUSIVE `checker-crashed` exit 2, `process.exitCode`, the NOTE line, Usage/Exit header and its stated residuals — layer product floor
- `pharn/floor/gate-run-core.mjs` — `REASON_CODES` gains `checker-crashed`; the `LAPSE_CODES` comment names why it is not a lapse — layer product floor
- `pharn/floor/shelled-verdict-core.mjs` — NEW: `RED_LINE`, `shelledVerdict`, `crashedDetail`, `CHILD_CRASHED`, `childCrashedLine`, `reportsChildCrash` — layer product floor
- `pharn/floor/check-ac-tests.mjs` — the chain check read with `shelledVerdict`; crash → exit 2 with the token first, or named beside a definite RED (exit 1); header FLOOR/Exit lines — layer product floor
- `pharn/floor/ac-tests-lock.mjs` — `specApproval` → `{red, crash}`; `buildBootstrapLock` / `checkLock` carry the crash; `--write-bootstrap` / `--check` print the token line; header Exit lines — layer product floor
- `pharn/floor/check-test-stage.mjs` — `run()` records the child's crash report; exit 2 + token → UNUSABLE in both branches; `RED_LINE` imported; header OUTPUT and THE BOUND rewritten — layer product floor
- `pharn/floor/check-loop-fresh.test.mjs` — imports from the core; the L52 literal scan over entry + core; new: the load-crash set through the pinned decision and commit lines over a copied floor (the entry's static load graph computed × {throws at load, missing} + the core itself + the `.pharn`-is-a-file run-time throw), the entry's doc keys and exit code pinned to the core, no static import in the entry, direct core invocation exits 2; ★ WIRING: the input-dependent grandchild crash through the pinned decision line is `front-stage-red`; the straddle subtest; the stale "`loop-fresh-load-crash` follow-up" comment — layer product floor (test, does not ship)
- `pharn/floor/shelled-verdict-core.test.mjs` — NEW: `shelledVerdict` over every result shape (L29), `crashedDetail` bounded and escaped, token producer ↔ consumer, and a ✧ closure that every exit-1 path of `check-plan-spec-agree.mjs` and `check-spec-approved.mjs` prints a `RED —` line first (what the rule rests on) — layer product floor (test, does not ship)
- `pharn/floor/check-ac-tests.test.mjs` — over a copied floor: crash only → exit 2, token first, no `pin`; crash + `missing-ac` → exit 1, the token line present and not first, no `pin`; control: intact copy GREEN; the real pin RED unchanged — layer product floor (test, does not ship)
- `pharn/floor/ac-tests-lock.test.mjs` — over a copied floor, bootstrap: `--check` crash only → exit 2, token first; crash + a bootstrap RED → exit 1; `--write-bootstrap` crash → exit 2, token, no lock written; control: a drifted SPEC is still the approval RED (exit 1) — layer product floor (test, does not ship)
- `pharn/floor/check-test-stage.test.mjs` — appended describe block: the input-dependent `check-plan-spec-agree.mjs` crash, a missing `check-plan-spec-agree.mjs`, and a `check-spec-approved.mjs` crash under a bootstrap lock are each UNUSABLE exit 2 (never `mapping-red` / `lock-red` / `lock-unusable`); controls: intact READY; a real pin RED is `mapping-red`; a drifted bootstrap SPEC is `lock-red` — layer product floor (test, does not ship)
- `pharn/floor/gate-run-core.test.mjs` — `EMITTING_MODULES` gains `pharn/floor/loop-fresh-core.mjs` (the entry keeps its row: it emits `checker-crashed`) — layer product floor (test, does not ship)
- `pharn/pharn-contracts/ac-tests.md` — the `pin` row (a verdict, not "non-zero"); the checker's Exit paragraph; the bootstrap approval paragraph; "The test-stage gate" bound rewritten — layer pharn-contracts
- `pharn/pharn-contracts/gate-run-record.md` — one bullet: `checker-crashed` — layer pharn-contracts
- `.claude/commands/pharn-loop.md` — the `2` INCONCLUSIVE line names the checker's own crash; the header pointer names `loop-fresh-core.mjs`; `reads:` gains it — layer product command
- `.claude/commands/pharn-test.md` — `check-ac-tests.mjs` exit 2 (`mapping-unusable`) and `--write-bootstrap`'s refusal each name the crashed chain/approval check — layer product command
- `.claude/commands/pharn-plan.md` — `check-ac-tests.mjs` exit 2 sentence ("a file is missing") names the other causes — layer product command
- `.claude/commands/pharn-ship.md` — the test-stage STOP presents the gate's FIRST line (`RED <reason>` or `UNUSABLE — …`), not only a RED line (grill disposition 13) — layer product command
- `.dev/floor/command-hygiene.test.mjs` — the `--ac-gate` argv pin reads `loop-fresh-core.mjs` — dev apparatus (test)
- `CLAUDE.md` — the FRESHNESS and TEST-STAGE GATE exit lines — repo meta
- `CHANGELOG.md` — new `## [6.21.1] - 2026-09-25` section, `### Fixed` — repo meta
- `SKILLS_VERSION` — 6.21.0 → 6.21.1 — repo meta
- `README.md` — the shields badge (`check:badge`) and the generated `CURRENT-STATE` block's floor count (`docs:generate`: two new floor modules) — repo meta
- `.dev/features/crash-routing/BUILD.md` — the build note — dev apparatus

`npm run docs:generate` runs at build and rewrites README's generated floor count (grill disposition 9); `docs:check`
decides, not this sentence. `MIN_CLI` is untouched.

## Contracts satisfied

- `pharn-contracts/ac-tests.md` — "The checker" (the `pin` kind is the chain check's RED verdict; its crash is exit 2),
  "Bootstrap" (the approval check's crash), "The test-stage gate" (UNUSABLE for a crash one level below a child; the
  bound one level further). Cited, not restated, by the three checkers' headers.
- `pharn-contracts/gate-run-record.md` — "The closed `reason_code` vocabulary": `checker-crashed` added, outside the
  lapse subset.
- `pharn-contracts/loop-record.md` — unchanged: an INCONCLUSIVE freshness exit is S11 already.

## Evals to write (P1)

No `role:`-bearing capability changes, so `validate.mjs`'s eval rules do not apply. The floor's evals are its tests:

- entry: a load crash (for every module in the entry's computed static load graph: throws at load, missing) → exit
  2, ONE JSON doc, `checker-crashed`, `checks: null`, no NOTE line; the core itself throwing at load → the same; the
  `.pharn`-is-a-file run-time throw → the same (was exit 1, stdout empty); each through the PINNED decision line, the
  commit line checked for the throw-at-load case; intact control FRESH exit 0 through the same line.
- entry ↔ core: doc keys equal `evaluate()`'s, the exit code equals `EXIT.INCONCLUSIVE`; the entry has no static
  `import`; the core run directly exits 2 with empty stdout.
- `shelledVerdict`: `{0}` → green; `{1, "RED — x"}` and `{1, "noise\nRED — x"}` → red; `{1, ""}`, `{1, "red — x"}`,
  `{1, " RED — x"}`, `{2, "RED — x"}`, `{3}`, `{null, SIGKILL}`, `{error}` → crashed.
- ✧ the rule's premise: every `return 1` in `check-plan-spec-agree.mjs` / `check-spec-approved.mjs` is preceded by a
  `RED —` print, and neither calls `process.exit(1)`.
- the children and the gate: the cases under Files, each with its L40 control.
- the straddle: three AC-failure worlds × {iteration, commit gate}.

## Guarantee audit (P0)

- "A failure to load `check-loop-fresh`'s checker, or a throw while it runs, exits 2 INCONCLUSIVE `checker-crashed`,
  never 1" → **floor** (the exit code and a closed `reason_code` of tested code — primitive #3), pinned through the
  pinned `/pharn-loop` lines. **Bounded:** the entry's own parse, an async throw, a forced `process.exit`, an
  unsettled top-level await (exit 13) and a signal are not mapped — named in the entry's header.
- "A crash of the checker a child shells is never that child's RED" → **floor** (exit code + a closed first-line token
  of tested code). It rests on the premise that both grandchildren print a `RED —` line before every exit-1 return,
  which a ✧ source scan pins. **Bounded:** a future exit-1 path without the line would read as a crash, which is
  fail-closed (UNUSABLE, a stop either way). A crash one level further down is still its parent's RED (the bound above).
- "check-test-stage reads that report as UNUSABLE, so `/pharn-loop` stops on S11, not S13" → **floor** (tested end to
  end through the pinned decision line). That the loop OBEYS the code is command discipline — advisory, as everywhere.
- "A definite RED beside a crash is still exit 1" → **floor** (tested: the crash + `missing-ac` / bootstrap-RED cases).
- "An honest pre-upgrade AC-failed report re-runs, never stops as a forgery" → **floor** property of existing code,
  now pinned by the straddle test (and its measured mutation).
- Nothing here claims a crash is DIAGNOSED correctly: the stderr excerpt in a detail is advisory text for a person.

## Trust audit (P2)

- The crash detail quotes at most one stderr line of the crashed checker, JSON-escaped and ≤ 200 chars — DATA in a
  line whose first token the reporting checker prints itself. No verdict reads it.
- The token is read only at the START of stdout, which the child prints before any untrusted text (every line it
  prints starts with its own `RED` / `GREEN` / `UNUSABLE` / `NOTE` / `usage` token). A lock path or SPEC-derived text
  cannot begin the first line, so a spoofed token is out of reach. A spoofed `RED —` line (6.20.6's stated case)
  still only restores a RED — fail-closed.
- The entry's crash `reason` carries the error's first line (bounded, JSON-escaped on stdout) — a message from floor
  code, never read by a verdict.

## Determinism audit (P5)

Every new branch is a membership test: an exit code in `{0, 1}` plus the `^RED —` line (`shelledVerdict`), an exit
code of 2 plus a fixed prefix of stdout (`reportsChildCrash`), and whether `import()` / `evaluate()` threw. No branch
reads prose; the terminal fallback of each is "no verdict" (UNUSABLE / INCONCLUSIVE), which hands the run to a person.

## Version (CLAUDE.md "SKILLS_VERSION discipline")

PATCH, 6.21.0 → 6.21.1 (the user's instruction, and the rule's: corrections to shipped checkers' crash routing; no
contract shape, no finding shape, no frontmatter changes; the one new `reason_code` member widens a closed vocabulary
that no install validates against). Coordination: `.claude/worktrees/agent-feedback-other-project-085ad9` holds an
unmerged plan (`review-leftovers-0924`) that also targets 6.21.1 and edits `ac-tests.md` (the row above `pin`, the
Exit paragraph) and `check-ac-tests.mjs`'s `KINDS` comment. Whichever merges second rebases, takes the next patch
number and resolves those adjacent lines.

## GATE 1 (delegated) — recorded

Approved by the model, NOT by a human. The basis: the user's instruction for this run (_"Use one `/pharn-dev-ship`
increment … Open a PR and merge it only when CI is green and the user has asked for it"_), read with their standing
preference for queued `/pharn-dev-ship` prompts (plan approval delegated, every delegated gate recorded as a model
decision). The merge is NOT delegated: it waits for CI and for the user's explicit request.

Two corrections, applied at build rather than re-planned:

1. `crashedDetail` quotes the first stderr line that STARTS with an error name (`/^[A-Z][A-Za-z]*Error\b/`: `Error:`,
   `TypeError:`, `Error [ERR_MODULE_NOT_FOUND]:`). Node prints the throwing SOURCE line first (`throw new Error(…)`),
   so a line merely containing `Error` would quote code, not the message.
2. The load-graph sweep spawns the entry directly over a copied floor, one case per (module, mode). The pinned
   `/pharn-loop` lines (L45) carry the representative cases: `test-infra-core.mjs` throwing at load at the decision
   AND commit lines, and the `.pharn`-is-a-file throw at the decision line (the commit gate never writes the ledger,
   so it cannot reach that throw).

## Amended after grill (supersedes the sections above where they differ)

From `GRILL.md`'s inline pass (the independent agent's findings are folded in below when it reports):

1. **The entry validates the core's result (grill P0, blocking).** `evaluate()` returning anything but a plain-object
   `doc` and a `code` in the core's exit set `{0, 1, 2, 4}` is `checker-crashed`, exit 2 — so a mismatched core can
   never exit 0 = FRESH through an undefined `process.exitCode`. The set is restated in the entry and pinned to
   `loop-fresh-core.mjs` `EXIT` by the same test that pins the document keys. A new test drives a copied core whose
   `evaluate` returns `{}`.
2. **`check-test-stage.mjs`'s header names its one sibling import** (`shelled-verdict-core.mjs`) and what a failure to
   load it does: the gate crashes, which check-loop-fresh check I reads as `front-stage-red` and `/pharn-build` halts
   on.
3. **The entry's header documents `checks: null`** for a checker that did not run to a verdict.
4. **The static-import matcher** takes only line-anchored `import … from "./<name>.mjs"` statements, and the sweep
   asserts its closure contains the core, `gate-run-core.mjs`, `worktree-fingerprint.mjs` and `test-infra-core.mjs`
   before iterating it.

From the independent agent (`GRILL.md` dispositions 5–14, each taken or answered there):

1. **The straddle test discriminates the straddle.** Each AC-failed world also runs with its `ac_gate` rewritten as an
   older checker could have written it (a changed per-AC `detail`), stamp-derived fields honest; the measured mutation
   is E's algo clause removed (→ `STOP report-verdict-mismatch`), not the AC-id subtraction.
2. **`--record-red-run` over a RED lock** exits 1 and records nothing — a new test for the `checkLock` return change.
3. **The entry's result check** requires `code` in the exit set, `doc` a plain object with exactly the core's six
   keys, and `doc.verdict` the token for that code; a thrown non-Error is a test case.
4. **Residuals** — the entry's header adds a missing/unreadable entry file and an async throw after printing;
   `/pharn-loop`'s exit-1 branch reads an exit 1 without ONE JSON document naming `stage_to_rerun` `verify` or
   `regress` as S11 (advisory prose).
5. **README** — the generated floor count moves; covered by `docs:generate`.
6. **Load-graph sweep** — rooted at the core; modes: throws at load, missing, syntax error, missing named export.
7. **Machine paths** — the entry's `reason` shortens absolute paths to `…/<basename>`; the stack stays on stderr.
8. **Anchor** — unchanged; the affected suites passed.
9. **Sweep** — `gate-run-core.mjs`'s "would crash it"; `pharn-loop.md` Step 4's S9 quote; `pharn-ship.md`'s STOP
   presentation (added to Files).
10. **The premise's delivery** — a `RED —` line lost to a pipe cut or to `maxBuffer` reads as no verdict: stated in
    `shelled-verdict-core.mjs`'s header.

## Open questions (HALT)

- none — the design follows the user's stated shape (an entry that dynamically imports the real module; exit 2 for a
  grandchild crash, consistent with 6.20.6), and every choice beyond it is recorded above with its reason.
