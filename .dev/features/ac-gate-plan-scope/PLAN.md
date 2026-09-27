# PLAN — the AC gate: a PLAN can no longer scope the test infrastructure it is judged by, and an unrelated test anomaly no longer voids the AC record

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L6, L15, L19, L29, L35, L36, L37, L41, L43, L47, L50, L52, L56, L59, L60, L62, L64]
- increment: close two findings of a read-only review of the AC test-first pipeline, as two separated parts of one
  PR — (A, H2) the build can no longer be scoped to this feature's `AC-TESTS.lock.json` / `AC-TESTS.md`, to a file a
  level gate's script names or to a root package-manager config, and the pin now also covers those files, the scripts
  a gate chains to and package.json's `jest` key (the GATE-1 amendment); (B, M6) a per-test anomaly (duplicate id, a flaky test or
  expected failure the report marks) in a file no AC maps is reported, never verdict-bearing
- layer(s): product floor (`pharn/floor/`), pharn-contracts, product commands, repo-meta
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]
- model: this run is on Opus by the maintainer's instruction for the batch (recorded here, not a `pharn.config.json`
  route); GATE 1 and GATE 2 are delegated by the maintainer to the orchestrating model

## Applied lessons

- **L6** — the AC gate tells a CHANGED pin from an UNPINNED one by a structured field (`pinReds` returns
  `{changed, unpinned}`), never by matching the prefix of a printed line.
- **L15** — every script read in the new script-file rule goes through `Object.hasOwn` (the existing `computeTestInfra`
  discipline); no `scripts[name] ||` fallback.
- **L19** — the build's route to the lock after this fix is Bash only, which reconcile reports (the lock is
  `pre_anchor_artifacts`, never exempt); my own verification runners live under `.pharn/pharn-dev-plan/` and are
  deleted before `npm run lint`.
- **L29** — the enumerations are the deliverable: every renderer of the `ac_gate` block (VERIFY.md, RUN-REPORT.md),
  every site that states the old whole-record rule (swept by referent, L50), and `ANOMALY_REASONS` iterated by tests.
- **L35** — ONE script-file rule (`test-infra-core.mjs`) serves both the pin and the plan-time check; the lock's file
  name is not imported into `check-ac-tests.mjs` (it would pull `red-run-core.mjs` into the mapping child and break
  the crash-routing test's premise), so its one literal there is held to `LOCK_NAME` by a ✧ parity test.
- **L36** — `test_infra` stays closed at every level: `/4` requires `script_files`, `/3` forbids it; an anomaly entry is
  exactly `{id, file, title, reason_code, reason}`; the new kind and reason sets get closure tests both ways.
- **L37** — each new "the build cannot write X" claim is PROBED through the real setter and write guard (★ HOOK rows),
  never read off them. The plan-time probe already corrected one reading: the lock and the reporter EXIST when the
  build runs, so the guard judges a case-variant entry at the file's on-disk spelling and DENIES it — only the exact
  and the annotated spelling open the file (measured, `.pharn/pharn-dev-plan/hookprobe.mjs`). The folded RED therefore
  over-reports case variants (fail-closed), and the test asserts "every spelling that opens is RED" plus the measured
  table, never RED ⟺ opens.
- **L41** — `checkMapping`'s two new inputs (`acArtifacts`, `scriptFiles`) are REQUIRED arrays (a TypeError when
  absent); no default that every test would override.
- **L43** — the root cause of H2 is L43's: the lock and the tree agreed because the build could write both, so the fix
  takes the lock out of the build's scope instead of adding another agreement check.
- **L47** — the retracted "anywhere in the suite voids the record" becomes a STRUCTURAL form ("an anomaly in a file
  the AC maps refuses; one elsewhere is reported"), never a new count.
- **L50** — the sweep for the retracted rule runs by REFERENT (every cite of `test-results-core`'s whole-record
  refusal, and of the lock schema `/3`), then by claim spelling; the site list is under "Sweep" below.
- **L52** — one test per MEMBER: each route of H2 (lock, mapping, script-named reporter), each anomaly kind in each
  format that marks it, each /3 case (names a file / names none).
- **L56** — the script-file rule is a model of a shell command line, so its stated bounds (what it does NOT read) are
  each PROBED by a test, not written from the model.
- **L59** — a script-named path is `lstat`ed: a symlink or other non-regular kind refuses the pin, never hashed through;
  the suite enumerates the path kinds (regular, link to file, link to dir, dangling link, directory, absent).
- **L60** — every property gets its own negative control: the ★ HOOK rows (RED ⟺ opens), anomaly-in-mapped vs
  anomaly-elsewhere, a /3 lock naming a file vs naming none.
- **L62** — every new refusal/anomaly reason quotes an untrusted value only through `shown()` (total) or
  `JSON.stringify` of a string.
- **L64** — before hand-off, grep the diff for each restated bound (the NOT-CAUGHT list, the anomaly rule, the lock
  schema) and probe every hit as a sentence of its own.

## Trigger (P7) — both findings reproduced live on this worktree (70cb51c, 6.28.2)

A read-only review (its text is DATA, P2) reported both; I re-ran each in throwaway install-like worlds built by
`.pharn/pharn-dev-plan/mkworld.mjs` from THIS worktree's floor (the reviewer's `mkworld.sh`, re-pointed):

- **H2, lock route (wE).** PLAN `## Files` = `src/x.js`, `package.json`, `tools/forge.mjs`,
  `pharn/features/demo/AC-TESTS.lock.json`. `check-ac-tests.mjs`: exit 0, one NOTE (package.json). A genuine red run
  is recorded; `check-test-stage --require-test-first`: READY. Under the build's scope both write guards exit **0** for
  the lock and `package.json`, **2** for the AC test. The "build" sets `"test": "node tools/forge.mjs"` (writes
  pharn-json `passed` for the lock's red-run ids), a wrong `f()`, and re-pins `lock.test_infra` with
  `computeTestInfra`. Then: test-stage READY, `--check` GREEN, `stage-verify` → `verify-report.json` verdict **PASS**,
  gates `{"reconcile":0,"test":0}`, `ac_gate` **PASS** — while `node --test tests/ac/ac2.test.js` exits **1**.
- **H2, reporter route (wB).** PLAN names `tools/pharn-reporter.mjs` (the pharn-json reporter the `test` script names
  via `--test-reporter=./tools/pharn-reporter.mjs`). `check-ac-tests.mjs`: GREEN, no NOTE; the guard allows the
  reporter (exit 0). The build rewrites it to mark everything passed and force exit 0: verify **PASS**, `ac_gate`
  **PASS**, the real AC-2 test exits **1**. The pin never saw the reporter.
- **M6 (wF).** A pre-existing `for (const n of [1, 1]) test("handles " + n, …)` in `tests/other/dup.test.js`. With the
  suite glob in the `test` script, the red run is RED for BOTH ACs: `duplicate-test-id … "tests/other/dup.test.js::handles
1"`. With a script that runs only the files it is handed, the red run is GREEN, and the verify is **INCONCLUSIVE**,
  `ac_gate` reason `AC-1: duplicate-test-id — … tests/other/dup.test.js::handles 1`. `/pharn-loop` would stop
  `STOP_TERMINAL` (unmeasured) on every iteration.

## Design — Part A (H2): the build cannot be scoped to what it is judged by, and what the gates run is pinned

**A1. A new `check-ac-tests.mjs` RED kind, `ac-artifact-in-plan`.** A PLAN.md `## Files` entry that, as the setter
scopes it (`clean`, `isConcrete`, then the write guard's fold — `scopeKey`), names THIS feature's `AC-TESTS.md` or
`AC-TESTS.lock.json`. The two paths are the repo-relative spelling of the mapping path on argv (relative to the invoking
directory, the project root the setter resolves scope entries against) and the lock beside it. `checkMapping` takes
them as a new REQUIRED input `acArtifacts` (L41). Why both files: the lock pins AC-TESTS.md's bytes, so with the lock out
of scope a build-window change to the mapping reads `ac-tests-modified`; with both in scope the build could rewrite the
two together. Only THIS feature's pair (P7: another feature's lock decides nothing in this feature's verdict). The fold
over-reports: a case-variant entry is RED although the guard, judging the existing file at its on-disk spelling, would
deny it anyway (measured — see L37 above); `./`-led and glob entries open nothing and are not RED.

**A2. The files a level gate's script NAMES are pinned (`test_infra.script_files`, lock schema `ac-tests-lock/4`) and
kept out of the build's scope (`test-infra-in-plan`).** One rule in `test-infra-core.mjs` (L35), CLOSED and literal —
never a shell parse (the reconcile precedent: a verb list would be a heuristic, P0):

- `scriptTokens(value)` — the ONE tokenizer the pin's token pass uses (A2 here, A7's chains below): split on whitespace
  and the shell control characters `; & | ( )`, drop empties, strip one pair of matching surrounding quotes.
- `scriptPathCandidates(value)`: for each token, split on `=` (so `--flag=path` and `VAR=path` yield `path`); strip
  leading `./`; keep a part that is a clean relative POSIX path — not empty, not led by `-` or `/`, no empty / `.` / `..`
  segment, none of ``$ ` \ ' " * ? [ ] { } ( ) < > | & ; ! # ~`` or a control character — whose first segment is not
  `node_modules` (dependencies stay out, as before) or `.pharn` (runtime scratch), and **whose extension is one a gate
  EXECUTES** (`.js .mjs .cjs .jsx .ts .mts .cts .tsx .sh` — `EXECUTED_EXTENSIONS`, closed). The extension set was added
  after GATE 1 (a refinement, reported at GATE 2): a gate's script can name its OWN OUTPUT literally (`--outputFile=
report.json`, `--test-reporter-destination=junit.xml`), and pinning that file would make the red run itself rewrite a
  pinned file, so `--record-red-run` could never record. Without it every such project is blocked at `/pharn-test`; with
  it, a JSON/YAML config a script names outside the root is not pinned — stated in the NOT-CAUGHT list.
- The candidates of every pinned gate's `script`, `pre` and `post` values, minus a root runner config name (already in
  `configs`) and a root manifest (`package.json` / `pharn.config.json` — pinned by VALUE, not by bytes), are `lstat`ed
  at the root: a regular file is pinned `{path, sha256}`; an absent path, a directory, or a path under a non-directory
  is not a file the script names and is skipped; a symlink or any other kind REFUSES the pin, as a symlinked runner
  config does (L59).
- `/4` recompute compares `script_files` exactly: a file gone, changed or added (a named path that became a file) is
  `test infrastructure changed — …` → `lock-red` at the test-stage gate, `test-infra-changed` at the AC gate.
- The plan-time check: `check-ac-tests.mjs` REDs `test-infra-in-plan` for a PLAN entry equal (folded) to a candidate that
  exists at the root as a non-directory — the reporter in the wB repro. `checkMapping` takes these as a new REQUIRED
  input `scriptFiles`; the CLI computes them from the live `package.json` for the SPEC's and the mapping's levels. An
  unreadable `package.json` prints an advisory `NOTE —` and checks nothing more (the pin, at `--write`, refuses the same
  manifest; the test-stage gate re-runs this check before every build).
- The cost, stated: a project whose test script names a TEST file literally (`"test": "node test.js"`) pins that file
  too, so a feature that edits it reads `test-infra-changed` — fail-closed; the remedy is a directory or glob in the
  script, as its own `spec_kind: test-infra` increment.

**A3. `package.json` / `pharn.config.json` in PLAN.md stay an ADVISORY `NOTE —`, decided with evidence — AMENDED at
GATE 1.** The build may legitimately change a dependency; the checker cannot see which part of the file will change.
My first premise — "what made the NOTE unsafe was the lock, not the manifest" — was INCOMPLETE (the orchestrator's
amendment): with the lock unwritable, `package.json` stays plannable and still carries test-running content the pin did
not cover — a `jest` key and chained scripts — so A6 and A7 below pin both, and A8 adds the root package-manager
configs; with those, what `package.json` can still change without a pin reading it is the NOT-CAUGHT list's. After A1
the lock is outside the scope of every PLAN the checker passes, so the pin compares the build's script against the one
`/pharn-test` recorded. Proved by a composed test (check-ac-tests suite): a GREEN plan naming `package.json` → the REAL setter + write
guard allow `package.json` and DENY the lock and AC-TESTS.md; the control plan naming the lock → RED and the guard
allows it. The verify side is `ac-gate-core.test.mjs`'s existing "the pinned `test` script changed after /pharn-test"
→ `test-infra-changed` (cited, and extended to a script-named file). A Bash rewrite of the lock is a reconcile escape
(`pre_anchor_artifacts`, not exempt) — detected, non-adversarially, never prevented (`LIMITS.md §6`). Measured at plan
time (`.pharn/pharn-dev-plan/bashlock.mjs`, a world whose PLAN names `package.json` only): after the anchor, an `fs`
rewrite of the lock's `test_infra` plus the `test` script → `check-bash-reconcile.mjs --require-baseline` exit **1**,
`ESCAPE` naming `pharn/features/demo/AC-TESTS.lock.json` ("the write guards would have DENIED a write to it"), and no
line for `package.json`.

**A4. Migration — `/3` locks, stated.** `/3` (6.20.0–6.29.x) is still read; its pin has no `script_files` (the shape check
forbids the key under `/3` and requires it under `/4`). `pinReds` returns `{changed, unpinned}` (L6): for a `/3` lock
whose level gates' scripts name a regular file, `unpinned` lists them → `--check` RED (`test infrastructure unpinned —
…`, the test-stage gate's `lock-red`) and the AC gate's `test-infra-unpinned` (its existing EVIDENCE reason, extended from
"no pin at all"); a `/3` lock whose scripts name no file reads exactly as before. `--record-red-run` writes only on a
`/4` test-first lock. Remedy: re-run `/pharn-test` (before the build it is cheap; after it, set the build aside first).

**A5. The setter-side refusal was weighed and not chosen (no human-only patch).** The checker holds under the same
obedience model as every other gate: `check-test-stage.mjs` shells `check-ac-tests.mjs` in full mode and is read by
`/pharn-ship` and `/pharn-loop` BEFORE the build (orchestrator-run, not build-agent-run), by `/pharn-build` Step 0 BEFORE
its setter, and by `check-loop-fresh.mjs` check I after every build and at the commit gate — so a plan naming the lock
never reaches a set scope when those calls are obeyed, and in the loop it cannot pass the commit gate. A setter refusal
would be a second copy of the rule in a human-only hook (L35) for no failure the checker leaves open (P7). Bound, named:
a run that skips every one of those calls and sets the scope itself is not stopped by this checker.

## Amendment at GATE 1 (the orchestrator's, under the maintainer's delegation)

GATE 1 was approved with A3 amended and one P0 addition. Each vector was MEASURED "before" on this worktree's floor
with `.pharn/pharn-dev-plan/scenario.mjs` (worlds under `agp/before-*`), and is measured again "after" at build:

- **(b) chained script, before:** `"test": "npm run test:unit"`, PLAN names `package.json` + `tools/forge.mjs`; the build
  rewrites `test:unit` to the forger → `--check` GREEN, verify **PASS**, `ac_gate` **PASS**, while `f()` returns 0.
- **(c) root `.npmrc`, before:** PLAN names `.npmrc` + two helpers; the build writes `script-shell=<abs>/tools/forge-shell.sh`
  → verify **PASS**, `ac_gate` **PASS**, `f()` returns 0. (npm 11.12.1 also hands a project `.npmrc`'s `node-options` to
  every script as `NODE_OPTIONS` — measured; my first forge through it lost a race to node:test's own exit-time
  reporter flush, which is why the measured route is `script-shell`.)
- **(a) the `jest` key, before:** the build adds `"testResultsProcessor"` to package.json's `jest` key →
  `ac-tests-lock --check` stays **GREEN** (the pin never reads the key). The forge itself needs a real Jest, which this
  sandbox does not have (an offline install from the npm cache failed; nothing was downloaded), so Jest applying
  `testResultsProcessor` before `--json` writes is cited as Jest's documented behaviour, not measured here.
- **In-process (the review's wA), before:** `assert.equal = () => {}` in the only in-scope file → verify **PASS**,
  `ac_gate` **PASS**, `f()` returns 0. No pin changes this (A9).

**A6. package.json's `jest` key is pinned.** `test_infra.jest`: the sha256 of the key's value in CANONICAL JSON (keys
sorted at every level, serialized directly — no object is rebuilt, so a `__proto__` key stays a key, L15), or `null` when
the key is absent. A digest, never the value: a Jest config can carry paths and tokens, and the lock is committed.
Changed / added / gone reads `test-infra-changed`. Nesting deeper than 256 levels refuses the pin (the red run cannot
start), never a truncated digest. Only the `jest` key: other runners' package.json keys (`mocha`, `ava`, …) are listed
as NOT caught (P7 — the recorded route is Jest's `testResultsProcessor`).

**A7. Chained scripts are pinned, transitively, by the same token pass (L35).** Over `scriptTokens` of every pinned
value, a package-manager token `npm`, `pnpm` or `yarn` (flag tokens after it skipped), then:
`run` / `run-script` / `rum` / `urn` → the next non-flag token is the id; `test` / `t` / `tst` → `test`; `start` / `stop` /
`restart` → that script (`restart` also `stop` and `start`); and, for `pnpm` / `yarn` only, any other word is the id
(their `yarn <script>` shorthand). Also Node's own `node --run <id>` / `--run=<id>`. An id pins only when it is an OWN
property of `scripts` (L15) — `yarn install` pins nothing unless a script is named `install`. A pinned id's value and
its `pre<id>` / `post<id>` are recorded in `test_infra.chained: [{id, script, pre, post}]` (sorted, level gate ids not
repeated) and scanned again, both for further chains and for A2's script-named files; the walk stops at an id already
pinned (cycles) and REFUSES the pin past 8 hops (`MAX_CHAIN_HOPS`), never a partial walk. Changed / gone / added reads
`test-infra-changed`. The cost, stated: `"test": "npm run build && vitest run"` pins `build`, so a feature that edits the
build script reads `test-infra-changed` — fail-closed, because the test gate RUNS it.

**A8. The root package-manager configs join the pinned + RED-in-plan config set, hash only.** `.npmrc` (the gate
itself is `npm run <id>`: `script-shell`, `node-options`), plus `.yarnrc` and `.yarnrc.yml` — added because A7 reads yarn
chains, and yarn runs its `yarn-path` / `yarnPath` on every invocation, so a pinned yarn chain under an unpinned yarn
config would be a hole of the kind A7 closes. Hashed without being read (O_NOFOLLOW, like the runner configs; a symlink
refuses the pin), matched folded, one predicate: `isPinnedConfigName` = the runner-config names ∪
`PACKAGE_MANAGER_CONFIGS`; `testInfraPathKind` returns `config` for both, so `test-infra-in-plan` REDs `.npmrc` in PLAN.md.

**A4, extended for the amendment.** A `/3` pin has none of `chained`, `script_files`, `jest`, and its `configs` were
taken over the runner-config names only. For a `/3` lock, the recompute compares `gates`, `levels` and the runner
configs exactly as before, and every member this floor pins BEYOND `/3` that is present now — a chained script, a
script-named file, a `jest` key, a package-manager config — is `unpinned` (never `changed`): `--check` RED, the AC gate's
`test-infra-unpinned`. A `/3` lock over a project with none of them reads exactly as before.

**A9. The in-process bound, stated (P0 — a statement, not a mechanism).** The implementation runs INSIDE the test
process, so code the build writes can switch off the assertion library or the reporter there (`assert.equal = () => {}`
in the only in-scope file → verify PASS, the AC counted delivered while `f()` is wrong — measured above). No pin can
prevent it: every pinned byte is unchanged; only what the process does changes. Stated ONCE in `test-infra-core.mjs`'s
NOT-CAUGHT list (the one copy), restated and cited in `ac-tests.md` beside the list, so the shorter list never reads as
"the build can no longer forge the AC gate".

**The `LIMITS.md §9` handoff (human-only — a proposed patch, never an agent edit).** §9's sentence "The pin also does
not see, among others, …, script chaining, npm's own configuration or the runner's version" becomes inaccurate once A7
and A8 pin literal chains and the root `.npmrc`. The replacement narrows those two items (chaining other than through
the package manager's own run commands; npm configuration outside the project root) and adds the in-process clause.
Staged as `proposed/` in the 6.24.0 shape: a runner under `.pharn/pharn-dev-build/` applies the sentence in a throwaway
detached worktree, runs `check-specified-markers.mjs` there, and writes `human-only.patch` (`git diff`, never
hand-typed) + `human-only.sha256`; `apply.sh` and `APPLY.md` are written for the human. Nothing in the build depends on
it being applied.

## Design — Part B (M6): an anomaly outside the AC-mapped files is reported, never verdict-bearing

**B1. The per-test record lists anomalies instead of refusing whole.** `test-results-formats.mjs`: a status outside the
closed map — including a flaky test or an expected failure the report MARKS — becomes a per-entry anomaly
(`unknown-status`, status `null`) instead of a whole-document refusal (`FORMAT_REFUSALS` = `over-cap`,
`results-malformed`; new `ENTRY_ANOMALIES` = `unknown-status`). `test-results-core.mjs` `buildRecord`: every entry whose id
is shared becomes ONE `duplicate-test-id` anomaly per id; an adapter anomaly keeps its reason; the rest are `tests`.
The record gains `anomalies: [{id, file, title, reason_code, reason}]` (sorted by id, untrusted DATA like `tests`).
`counts` range over `tests`; `results-exit-contradiction` counts EVERY entry whose status is `failed`, duplicates
included, so an anomaly cannot hide a failure under exit 0. `ANOMALY_REASONS` = `duplicate-test-id`, `unknown-status` —
both stay `RECORD_REASONS` members (no vocabulary change). Every other refusal still voids the whole record.

**B2. Fail-closed stays where the verdict reads.** `red-run-core.mjs` `observeAc` (the one match rule, used by the red
run and the AC gate): after a whole-record refusal, an anomaly whose `file` EQUALS one of the AC's mapped files refuses
that AC with the anomaly's reason (the same exact file comparison the match uses). An anomaly in any other file is
skipped. The AC gate's bootstrap mode counts `passed` over `tests` only, so an anomalous test is never a pass.

**B3. Reported, not hidden.** `unmappedAnomalies({records, mappedFiles})` (red-run-core, next to the match rule) summarizes
anomalies in files the feature maps to no AC as `[{gate, reason, count, examples}]` (examples ≤ 3 ids, sorted). The red
run's verdict carries it and `check-red-run.mjs --verdict` prints one `NOTE —` line per entry (never changing the exit);
the AC gate's block carries it as `unmapped_anomalies` (test-first: every file no row maps; bootstrap: every anomaly);
VERIFY.md and RUN-REPORT.md render it as quoted DATA. `check-loop-fresh.mjs` check E compares the whole `ac_gate` block,
so the field is re-derived like the rest.

## Files

- `.dev/features/ac-gate-plan-scope/PLAN.md` — this plan — layer dev artifact
- `.dev/features/ac-gate-plan-scope/BUILD.md` — NEW. The build record: probes with exit codes, the gate counts — layer dev artifact
- `.dev/features/ac-gate-plan-scope/proposed/human-only.patch` — NEW. The `LIMITS.md §9` sentence as a `git diff`, written by the build's runner (a declared Bash write) — layer dev artifact
- `.dev/features/ac-gate-plan-scope/proposed/human-only.sha256` — NEW. The patched `LIMITS.md`'s digest, written by the runner (a declared Bash write) — layer dev artifact
- `.dev/features/ac-gate-plan-scope/proposed/apply.sh` — NEW. The human-run apply script (the 6.24.0 shape, one file) — layer dev artifact
- `.dev/features/ac-gate-plan-scope/proposed/APPLY.md` — NEW. What the patch changes, why, and how to apply it — layer dev artifact
- `pharn/floor/check-ac-tests.mjs` — EDIT. `ac-artifact-in-plan`; `test-infra-in-plan` over script-named files and the package-manager configs; the two REQUIRED `checkMapping` inputs; the NOTE's text; the header — layer product floor
- `pharn/floor/test-infra-core.mjs` — EDIT. The one token pass (`scriptTokens`: script-named files with the executed-extension set, chained scripts), the `jest` key digest, the package-manager configs, `/4` keys and the `/3`-aware shape and diff, `testInfraReds` → `{changed, unpinned}`, the NOT-CAUGHT list re-derived with the in-process bound — layer product floor
- `pharn/floor/ac-tests-lock.mjs` — EDIT. Schema `ac-tests-lock/4` (`/3` still read), `pinReds` → `{changed, unpinned}`, `--record-red-run` on `/4` only, the header — layer product floor
- `pharn/floor/ac-gate-core.mjs` — EDIT. `test-infra-unpinned` for an unpinned `/3` pin, `unmapped_anomalies`, the header bounds — layer product floor
- `pharn/floor/test-results-formats.mjs` — EDIT. `unknown-status` as a per-entry anomaly; `FORMAT_REFUSALS`, `ENTRY_ANOMALIES`; the header — layer product floor
- `pharn/floor/test-results-core.mjs` — EDIT. `anomalies`, `ANOMALY_REASONS`, the contradiction over every failed entry; the header — layer product floor
- `pharn/floor/red-run-core.mjs` — EDIT. `observeAc` refuses over an anomaly in the AC's mapped files; `unmappedAnomalies`; the verdict carries it; the header — layer product floor
- `pharn/floor/check-red-run.mjs` — EDIT. One `NOTE —` line per unmapped anomaly entry — layer product floor
- `pharn/floor/render-verify.mjs` — EDIT. The AC section renders `unmapped_anomalies` as quoted DATA — layer product floor
- `pharn/floor/render-run-report.mjs` — EDIT. The AC rows render `unmapped_anomalies` as quoted DATA — layer product floor
- `pharn/pharn-contracts/ac-tests.md` — EDIT. The kind table, `test-infra-in-plan`, the lock `/4` and its example, the pin's `script_files` and NOT-CAUGHT list, the `/3` migration, the red run's and the AC gate's anomaly rule, the reconcile paragraph, "What it proves" — layer pharn-contracts
- `pharn/pharn-contracts/test-results-record.md` — EDIT. The record's `anomalies`, the status paragraphs, the reason table split into record refusals and per-test anomalies, the Jest note, "What it proves" — layer pharn-contracts
- `pharn/pharn-contracts/verify-report.md` — EDIT. `unmapped_anomalies` in the `ac_gate` block — layer pharn-contracts
- `.claude/commands/pharn-plan.md` — EDIT. Step 4c's test-infrastructure bullet, the check's remedy line, the claims block; `version:` patch — layer product command
- `.claude/commands/pharn-test.md` — EDIT. Step 4's pin sentence (`/4`, the script-named files, the symlink refusal); `version:` patch — layer product command
- `pharn/floor/check-ac-tests.test.mjs` — EDIT. The new kind, the script-file plan check, ★ HOOK rows for both, the composed NOTE proof, required inputs, the ✧ lock-name parity — layer product floor tests
- `pharn/floor/test-infra-core.test.mjs` — EDIT. The candidate rule table, `script_files`, each change alone, the path kinds, the shape both schemas, `{changed, unpinned}`, each stated bound probed — layer product floor tests
- `pharn/floor/ac-tests-lock.test.mjs` — EDIT. `/4` written, `/3` read, `/3` unpinned RED vs none, `--record-red-run` refuses `/3` — layer product floor tests
- `pharn/floor/ac-gate-core.test.mjs` — EDIT. A changed script-named file, a `/3` lock naming a file, anomalies in a mapped file vs elsewhere, bootstrap — layer product floor tests
- `pharn/floor/test-results-core.test.mjs` — EDIT. Every former whole-record `unknown-status` / `duplicate-test-id` case now an anomaly; the new invariants; the closure — layer product floor tests
- `pharn/floor/check-red-run.test.mjs` — EDIT. An anomaly in the mapped file is RED by its reason; one elsewhere is GREEN with a NOTE — layer product floor tests
- `pharn/floor/check-test-stage.test.mjs` — EDIT. A `/3` lock whose script names a file is `lock-red` — layer product floor tests
- `pharn/floor/render-verify.test.mjs` — EDIT. `unmapped_anomalies` rendered fenced; absent renders nothing — layer product floor tests
- `pharn/floor/render-run-report.test.mjs` — EDIT. The same for RUN-REPORT.md — layer product floor tests
- `CLAUDE.md` — EDIT. The PER-TEST RESULTS, AC TESTS and AC GATE comment blocks (the kinds, the lock schema, the pin, the anomaly rule) — layer repo-meta
- `README.md` — EDIT. The badge 6.31.0; the two sentences stating the whole-record rule; the pin list in "What verify proves"; the pharn-json reporter guidance — layer repo-meta
- `CHANGELOG.md` — EDIT. `## [6.31.0] - 2026-09-27` above `## [6.30.0]` (renumbered from 6.29.0, then 6.30.0, at the merges of main) — layer repo-meta
- `SKILLS_VERSION` — EDIT. `6.30.0` → `6.31.0` — layer repo-meta

### Explicitly not touched by the agent

- `LIMITS.md` — human-only (fix #2); its one §9 sentence travels in `proposed/human-only.patch`, applied by a human with
  `apply.sh`. The build never writes it (the runner writes only inside a throwaway worktree it removes).
- `pharn/ARCHITECTURE.md`, `pharn/CONSTITUTION.md`, `THREAT-MODEL.md`, `CODEOWNERS`, `.claude/settings*.json`, the four
  hook scripts, `pharn.spec-template.md` — human-only and byte-identical.
- `MIN_CLI` stays `0.5.0` — no installed path moves.
- `pharn/floor/check-test-stage.mjs`, `gate-run-core.mjs`, `check-verify.mjs`, `loop-fresh-core.mjs`, `stage-verify.mjs`,
  `.claude/commands/pharn-build.md` — reused unchanged; their statements stay true.

## Contracts satisfied

- `pharn/pharn-contracts/ac-tests.md` — the mapping checker's kinds, the lock (`/4`), the pin, the red run, the AC gate.
- `pharn/pharn-contracts/test-results-record.md` — the record's shape and reasons.
- `pharn/pharn-contracts/verify-report.md` — the additive `ac_gate` block.
- `pharn/pharn-contracts/reconciliation-record.md` — cited, unchanged (the lock is `pre_anchor_artifacts`).

## Evals to write (P1)

No Capability is added or changed (no `role:` file), so no eval case. The floor modules' `*.test.mjs` suites are the
evidence (listed under `## Files`).

## Guarantee audit (P0)

- "A PLAN naming this feature's `AC-TESTS.md` / `AC-TESTS.lock.json`, or a file a level gate's script names, is RED" →
  floor: enum/regex/set membership (`check-ac-tests.mjs`, folded as the setter scopes).
- "When `check-ac-tests.mjs` is GREEN, the build's Write-tool scope cannot open the lock, the mapping or a script-named
  file" → floor: hook (fix #7), composed with the checker, PROBED by the ★ HOOK rows over the measured spellings
  (exact, annotated, file-name case, directory case, `./`-led, glob). The probe set bounds the claim (L37): it is the
  spellings measured, not every possible one; the fold over-reports case variants the guard already denies. Obeying
  the checker is advisory command discipline, as for every gate.
- "A change to a script-named file, a chained script's value, the `jest` key or a root package-manager config between
  `/pharn-test` and `/pharn-verify` reads `test-infra-changed`" → floor: content-hash and exact comparison (the pin),
  over what the closed token rule and the closed name sets reach. Agreement, never provenance (L43).
- "The build can no longer forge the AC gate" → **struck** (A9): code the build writes runs inside the test process and
  can switch off assertions or the reporter there; no pin reaches it (measured, wA).
- "A Bash rewrite of the lock after the anchor is reported" → floor: `check-bash-reconcile.mjs` (content-hash + the
  live guards). Non-adversarial detection, never prevention (`LIMITS.md §6`).
- "An anomaly in a file mapped to AC-n makes AC-n unmeasured; one elsewhere never changes a verdict" → floor: enum/set
  membership over the record (exact file equality).
- "The script-file rule names every file a gate executes" → **struck**: it names the files a script names LITERALLY
  under a stated closed rule (tokens, `=` parts, the executed-extension set); imports, environment, configs' own
  references, npm configuration outside the root and dependencies are not seen.
- "Every script a gate runs is pinned" → **struck**: chains are read through the package manager's own run commands and
  `node --run` only; `npm-run-all`, `concurrently`, `--prefix`/workspace targets and the like are not.
- "An anomaly outside the mapped files is harmless" → **advisory**: it is not verdict-bearing; whether it matters is
  the human's reading of the reported `unmapped_anomalies`.

## Trust audit (P2)

- Script values, test ids, titles, file paths and anomaly reasons are untrusted project DATA. A pin or plan-check
  message names a script-named PATH (a clean relative path by construction: no whitespace or shell metacharacter) or a
  chained script's id (a package.json key, quoted through `shown()`), never the script's text. The `jest` key and every
  package-manager config are reduced to a sha256 and never echoed (a `.npmrc` can hold a registry token). Anomaly entries carry id/file/title as data; reasons quote raw values only through
  `shown()`. `unmapped_anomalies` examples are ids, rendered fenced (VERIFY.md, RUN-REPORT.md) and JSON-quoted in the
  red run's NOTE. No verdict reads a free-text field.

## Determinism audit (P5)

- Every new branch is membership or equality: kind membership, folded path equality, the closed token rule, `lstat`
  kind, exact file equality for the anomaly scope, schema string. No classification by a model.

## Sweep (L50 — by referent, then by claim; coverage stated per L49)

- Referent 1, the record's whole refusal on `unknown-status` / `duplicate-test-id`: `test-results-core.mjs` header +
  `buildRecord`; `test-results-formats.mjs` header + `FORMAT_REFUSALS`; `ac-gate-core.mjs` header bounds;
  `red-run-core.mjs` (match rule); `test-results-record.md` (Jest note, status paragraph, reason table, what it
  proves); `ac-tests.md` (AC gate bounds); `CLAUDE.md` (PER-TEST RESULTS, AC GATE bounds); `README.md` (two
  paragraphs). `gate-run-core.mjs:500` ("cannot void the record") stays true and is not touched. Checker-backed: none
  of these sentences; each is probed by hand at build (L64).
- Referent 2, the lock schema `ac-tests-lock/3` as "what `--write` writes": `ac-tests-lock.mjs`, `test-infra-core.mjs`,
  `ac-tests.md`, `pharn-test.md`, `CLAUDE.md`. `check-test-stage.mjs`'s two mentions name the schema that INTRODUCED
  the pin (still true) and stay.
- Referent 3, "the build's scope excludes the lock / the pin covers X / the pin does not see Y": `ac-tests.md`
  (reconcile paragraph, the pin list and its NOT-caught restatement, what it proves), `test-infra-core.mjs` (NOT-CAUGHT
  list, the one copy), `pharn-plan.md` (Step 4c, claims), `pharn-test.md` (Step 4), `README.md` (what verify proves —
  its "a chained script, `.npmrc`" becomes false and is re-worded), `CLAUDE.md` (AC GATE's "script chaining, .npmrc"),
  `LIMITS.md §9` (human-only: the proposed patch), `check-ac-tests.mjs`'s NOTE text.

## Versioning

- `SKILLS_VERSION` 6.30.0 → **6.31.0** (MINOR; planned as 6.28.2 → 6.29.0, renumbered to 6.30.0 at the merge of `origin/main` where #290 released 6.29.0, and to 6.31.0 where #292 released 6.30.0): a newly shipped checker kind and pin member, a lock schema (`/4`, with
  `/3` still read) and a per-test record field — no install is invalidated. `MIN_CLI` stays 0.5.0 (no installed path
  moves; a pre-0.5.0 CLI is refused already). Each edited product command's `version:` bumps its patch.
- If another PR merges first, renumber by diffing ADDED lines against `origin/main`.

## Open questions (HALT)

- None. GATE 1 (2026-09-27) was DELEGATED by the maintainer to the orchestrating model, which approved A1, A2 (the closed
  literal token rule, over a `pharn.config.json` list), A4, schema `/4`, Part B's per-AC scope and the two renderers, and
  AMENDED A3 (→ A6, A7, A8) and added A9. Recorded as a delegated decision, never as a human approval. Two refinements
  made after GATE 1 are reported at GATE 2 rather than silently adopted: the executed-extension set in A2, and
  `start`/`stop`/`restart`, `node --run` and the two yarn configs inside A7/A8's closed sets.

## Grill resolutions (applied at build)

`GRILL.md`'s eight advisory concerns, each resolved in the build and reported again at GATE 2:

1. **(important, P0) A2 × A7 pins build steps and outputs.** The OUTPUT half is removed inside the closed literal form:
   the token after an OUTPUT redirect (`>`, `>>`, `2>`, and `&>` / `>|` as the tokenizer leaves them), after `-o`, and
   after or inside any `--out…` flag is never a candidate (`scriptPathCandidates`, one test row per operator and flag,
   with `--o` / `-O` controls). An INPUT redirect's target stays a candidate — `node < tools/x.mjs` executes it (a
   pre-review correction of the build's first cut, which skipped `<` too; tested per input operator). The ENTRY half stays, fail-closed and stated at every surface that states the
   pin (the header's COSTS, the contract's "Costs, stated", the README's "What the wider pin costs"): measured in a world
   whose `pretest` builds with `node --check src/x.js`, a PLAN naming `src/x.js` is `test-infra-in-plan` RED, and an
   edit of it is `--check` RED (`BUILD.md`). A file a chained step WRITES under a literal name (a `cp` destination) is the
   same cost and is stated too. For the human at GATE 2.
2. **(important, P2) the `.npmrc` digest.** Stated where the pin is described: a committed digest of a file holding a
   low-entropy credential lets a reader of the lock test guesses offline — keep credentials in an environment variable
   or the user-level npmrc (the header, the contract, the README).
3. **(important, P1) enumerate the chain set.** `test-infra-core.test.mjs` iterates every package manager × every
   `RUN_WORDS` / `TEST_WORDS` / `LIFECYCLE_WORDS` member (with and without flags), the shorthand per manager (npm's
   negative), `node --run` in both forms plus its after-an-operand control, a list of out-of-rule chains, the
   own-property rule (inherited names pin nothing; an own `__proto__` key does), a cycle, self-reference, and the hop
   bound at exactly 8 (read) and 9 (refused).
4. **(minor, P7) the unhandled shapes.** A chained value that is not a string or is oversized REFUSES the pin (tested); a
   named path that `lstat` cannot read (EACCES) refuses, and a regular file that cannot be opened reads "unreadable"
   (tested, skipped as root). A `scripts` field that is not an object has no level gate at all — the pin records none,
   and the red run's preflight then finds no runner, so no build starts (the pre-6.29 reading, unchanged).
5. **(important, P7) the `/4` rollback.** Stated in the lock's header, the contract ("Rolling back, stated") and the
   CHANGELOG: an older floor reads a `/4` lock as unusable — `lock-unusable` at the test-stage gate, `ac-tests-modified`
   at the AC gate (verify FAIL; GATE-2 review F1 corrected an earlier "INCONCLUSIVE") — never GREEN; returning a feature to it means re-running `/pharn-test` there.
6. **(minor, P3) the canonical JSON.** A second small implementation, deliberately: `JSON.stringify` with a key-sorting
   replacer in `test-infra-core.mjs` (`loop-fresh-core.mjs`'s `canonical()` is private, and importing it would invert
   the dependency — loop-fresh-core imports test-infra-core). The replacer rebuilds each object with `Object.fromEntries`,
   which DEFINES keys, so an own `__proto__` key stays a key (tested) — "serialized directly, no object is rebuilt" in
   A6 was the intent (L15), and this is the mechanism that meets it.
7. **(minor, P7) the unexplained values.** `MAX_CHAIN_HOPS = 8`: real chains are one or two hops; a deeper one is
   refused, never read in part, so a small bound fails closed and costs nothing a real project uses (the constant's own
   comment says so, and that it is not measured beyond that). `MAX_ANOMALY_EXAMPLES = 3`: a report line, not a
   verdict — enough to locate the anomaly, bounded so a hostile report cannot grow VERIFY.md (its comment). The 256-level
   `jest` nesting cap was NOT built — see "As built", below.
8. **(minor, P7) the README costs.** The README gains "What the wider pin costs (6.31.0)" (the source-entry cost and
   its remedy, the `.npmrc` credential advice), beside the widened pin list and the `/3`-lock reading.

## As built — where the build differs from this plan (reported at GATE 2)

- **The plan-time check covers ABSENT named files too.** A2 said `test-infra-in-plan` fires for a candidate that exists
  as a non-directory. Built: for every candidate that is not an existing DIRECTORY, absent ones included — a file the
  build creates at a named path is one the pin reads at verify (`was added`), so a plan naming it could never reach
  green; refusing it at plan time is the same verdict, earlier. Stricter (fail-closed), tested
  (`check-ac-tests.test.mjs`, `tools/setup.mjs`).
- **The `jest` nesting refusal is the engine's, not a 256-level cap.** A6 said deeper than 256 levels refuses. Built: the
  digest refuses exactly when `JSON.stringify` cannot serialize the key (a `RangeError`), never a digest of part of it —
  measured, a 200 000-level key parses and does not serialize (tested). Same property (never a truncated digest),
  one fewer constant.
- **`yarn t` / `pnpm tst` pin both readings.** npm and pnpm read `t`/`tst` as `test`; yarn reads an unknown word as a
  script name. The token pass pins `test` AND, for pnpm and yarn, a script literally named `t`/`tst` when one exists —
  fail-closed over the ambiguity (tested per manager).
- **`/3` pins are judged by their own config set.** A `/3` pin's `configs` were taken over the runner names only, so the
  recompute filters the live configs to runner names before comparing, and a package-manager config the live tree has
  is `unpinned` (never `changed`), as A4 intended for the other `/4` members.
- **Three corrections found by the build's own pre-review, before regress** (each tested): the GREEN line of
  `check-ac-tests.mjs` no longer claims "no file a level gate's script names" when the named files could not be read
  (it says they were NOT checked); `unmappedAnomalies` reports an anomaly unless a mapping row maps its file AT A LEVEL
  WHOSE GATES INCLUDE THAT GATE (B3's "files the feature maps" missed a mapped file seen by another level's gate, which
  observeAc never reads — neither decided nor reported); and a chain to a script whose name is over 1024 characters
  refuses the pin instead of being skipped. The NOT-caught list also names `package.json`'s `config` field
  (`$npm_package_config_*`) and a named path over 1024 characters.
- **A PLAN naming the lock is refused by the checker, not by the setter (A5, unchanged) — measured again after the
  build:** in the wE world the plan check and the test-stage gate are RED before the build; a run that ignores both and
  sets the scope itself still reaches a verify PASS, because `/pharn-verify` does not re-run the mapping check. That is
  A5's named bound, now measured; obeying the gate is command discipline, as for `in-plan-files`.
