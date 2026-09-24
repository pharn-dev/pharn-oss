# PLAN — verify-ac-gate

- spec_content_hash: edc3d07df3ef76f983fe3763671eb66aa37c242f46f0e4c0fbca30ce091a5d2c
- applied_lessons: [L5, L22, L34, L35, L36, L41, L43, L45, L52, L58, L59]
- increment: Put an AC gate inside `/pharn-verify`'s FLOOR verdict: a new pure checker, `ac-gate-core.mjs`, judges whether every Acceptance Criterion was delivered on the head verify run — a locked, once-red test titled `AC-<n>:`, in a file mapped to AC-n, passed — and `check-verify.mjs --ac-gate` folds its verdict in. The lock gains the test-infrastructure pin the gate needs (schema `ac-tests-lock/3`), and `/pharn-loop` iterates on an undelivered AC but stops `blocked: ac-evidence-invalid` when the evidence itself was changed.
- layer(s): the product floor (new `ac-gate-core.mjs`, new `test-infra-core.mjs`; `check-verify.mjs`, `check-loop.mjs`, `check-loop-fresh.mjs`, `ac-tests-lock.mjs`, `red-run-core.mjs`, `check-ac-tests.mjs`, `gate-run-core.mjs`, `render-run-report.mjs`), pharn-contracts (`verify-report.md`, `ac-tests.md`, `loop-record.md`, `gate-run-record.md`), the product `.claude/` surface (`pharn-verify.md`, `pharn-loop.md`, `pharn-ship.md`, `pharn-test.md`), repo meta.
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Correcting the record: the brief against the live repo (P6)

Measured on branch `verify-ac-gate` off `main` = `c06ba64` (`SKILLS_VERSION` 6.19.0; items 01–05 merged as PRs 256,
257, 258, 261 and 262).

1. **The brief says `--write` "run at the end of /pharn-test" adds the pin.** `/pharn-test` runs `--write` BEFORE its
   red run and `--record-red-run` at the end (`pharn-test.md`, Step 6). The pin goes in `--write`, as the brief
   says, which means the red run itself runs under the pinned infrastructure, and `--record-red-run` refuses a lock
   whose pin no longer holds (it already requires `--check` GREEN).
2. **`check-verify.mjs` says "No child process".** The lock's bootstrap check SHELLS `check-spec-approved.mjs`
   (`ac-tests-lock.mjs`, `specApprovalError`). Importing `checkLock` whole would break that header. The gate uses
   the lock's pure parts only (decision f); approval is already checked by `/pharn-verify` Step 2 (the chain) and by
   `check-loop-fresh.mjs` check I.
3. **A Bash edit of a pinned test trips TWO gates, not one.** AC test files are outside PLAN `## Files` by
   construction (`check-ac-tests.mjs` `in-plan-files`), so the build's scope does not cover them, and
   `check-bash-reconcile.mjs` reports the edit as an escape: `reconcile` is red too. Today `check-loop.mjs` reads
   that as a reconcile STOP_TERMINAL. The brief's `blocked: ac-evidence-invalid` for that case therefore needs an
   explicit precedence (decision d).
4. **Blocked stops never consult `check-loop.mjs`** (`loop-record.md`, "The one exception: a blocked stop"): they
   write `decision: INCONCLUSIVE` and are skipped by `check-loop-decision.mjs`. The new row is the first stop that
   `check-loop.mjs` itself decides; decision e keeps it re-derivable instead of weakening it to INCONCLUSIVE.
5. **`STOP_TERMINAL` is today reached two ways** (verify/regress inconclusive, reconcile red); nothing in its output
   says which. The loop needs to tell the new cause apart by membership, not prose (P5), so `check-loop.mjs` gains an
   additive `terminal_cause` field.
6. **`check-loop-fresh.mjs` check E re-runs `check-verify.mjs --stamp` without any AC flag.** The re-run must pass the
   same `--ac-gate` or it would re-derive a different verdict (L45: the invoking file must change with the checker).

## Decisions for the options halt (approved under the overnight delegation — see SHIP.md)

a. **The test-infra pin (`test_infra`, lock schema `ac-tests-lock/3`, test-first only) = three things, computed by a new
`test-infra-core.mjs`:**

- `gates` — for each gate id in the union of `LEVEL_GATES[level]` over the mapped levels that `package.json`
  `scripts` has (`discoverGates`, own-property — L15): `{id, script, results}`, where `script` is the script's
  VALUE and `results` is the `testResults` format `formatFor` reads for that id, or its refusal code
  (`not-configured` | `config-invalid`). Not all of `package.json`: dependencies legitimately change in a build.
- `configs` — `{path, sha256}` for every file at the project ROOT whose name matches a CLOSED set:
  `(vitest.config|vitest.workspace|vite.config|playwright.config|jest.config).(js|mjs|cjs|ts|mts|cts|json)`.
  A match that is not a regular file (a symlink, a directory) is refused at `--write` and reads as
  `test-infra-changed` at verify — hashed without following a link (L59).
- Recomputed and compared EXACTLY (sets and values) by `--check` and by the gate. A difference names the gate id
  or the config path, never the script text.
- **What it does NOT catch, stated in the header, the contract and the README:** a setup or helper file the config
  imports, env-driven configuration, a config outside the project root or under another name, a `jest` key inside
  `package.json`, `tsconfig`, and the runner's own version (dependencies are deliberately out). A legitimate
  change reads `test-infra-changed`; the remedy is a human re-running `/pharn-test`.
- A missing `package.json` pins no gates (a scratch project); an unparseable one is refused at `--write`.

b. **Regress: no change** (the brief's recommendation). Delivery is judged on the head verify run.

c. **The gate (`ac-gate-core.mjs`, `evaluateAcGate({feature, stamp, outDir, root})`), per SPEC kind** — the kind is
decided by ONE function, `specVerdict(text)`, extracted from `check-ac-tests.mjs --spec` so the CLI and the gate
cannot disagree (L35):

- **legacy** → `mode: "not-applicable"`, `verdict: "NOT-APPLICABLE"`, reason `not-applicable (legacy spec)`. The
  verify verdict is unchanged; the block is in the report and `VERIFY.md` says it, so it is never silently GREEN.
- **feature (test-first)** — the ACs are the SPEC's, not the mapping's: an AC with no mapping row is `ac-untested`.
  Evidence, feature-wide: (3) the lock is an `ac-tests-lock` test-first lock whose files/mapping/spec check is
  GREEN, else `ac-tests-modified` (missing, unusable, bootstrap, or any RED); (4) `red_run` present, bound to the
  lock's files (`files_sha256`) and to the mapped ACs, else `ac-never-red`; (5) `test_infra` holds, else
  `test-infra-changed`, and a lock with no pin (`/1`, `/2`) is `test-infra-unpinned`. Per AC, over EVERY gate its
  level maps to that is in the head stamp: (6) each record available, else item 01's reason (fatal); entries
  MATCH by red-run-core's rule — file EQUALS a file mapped to AC-n, LEAF title starts `AC-<n>:`; (1) ≥1 match,
  else `ac-untested`; (2) any `failed` → `ac-not-passed`, else any `skipped` → `ac-skipped`; and every matched
  test id must be one `red_run` recorded red for that AC, else `ac-never-red` — that is the README's "once-red",
  checked per test, not only per file.
- **test-infra (bootstrap)** — the lock must be a bootstrap lock whose SPEC half still holds (pin, kind, levels,
  no mapping), else `ac-tests-modified`. Per SPEC AC, over its level's gates in the stamp: a gate absent from the
  stamp, or a record refused `not-configured`, is `ac-untested` (the build has not delivered the runner yet — a
  retry can fix it); any other refusal is item 01's reason (fatal); ≥1 `passed` test at that level → `passed`,
  else `ac-untested`. The block says `mode: "bootstrap"` and carries the note that it is WEAKER than test-first.
- One matcher: red-run-core's per-AC loop moves into an exported `observeAc`, used by both the red run and the gate.

d. **How the AC verdict joins `check-verify.mjs`, and what the loop does with it.** `--ac-gate` (requires `--stamp`
and `--feature`; the root is the invoking directory, the per-test files are beside the stamp) adds an `ac_gate` block
and two RESERVED failing ids — `ac-delivery` and `ac-evidence` join `reconcile` and `completeness` in
`RESERVED_IDS`, so no gate may carry them. Precedence, top-down:

- any evidence reason → `failing_gates` gains `ac-evidence` (verdict FAIL);
- any delivery reason → `failing_gates` gains `ac-delivery` (verdict FAIL);
- a real gate red → FAIL, as today, and it BEATS an unmeasurable AC gate (the same reason it beats INCOMPLETE:
  the red gate is the actionable fact, and FAIL can never reach STOP_GREEN);
- AC gate unmeasurable (a record refused, or the SPEC unusable) over all-green gates → `INCONCLUSIVE`, exit 2 —
  fatal, never a PASS; no `reason_code`, so `check-loop-fresh.mjs` check B does not route it as a lapse;
- then INCOMPLETE, completeness-inconclusive, PASS — unchanged.
  `check-loop.mjs` gains one exact-membership test: `ac-evidence` in `failing_gates` on a verify FAIL →
  `STOP_TERMINAL`, and every emission gains a closed `terminal_cause` ∈ {`unmeasured`, `ac-evidence`, `reconcile`}
  (null otherwise). Precedence `unmeasured` > `ac-evidence` > `reconcile`, so a Bash edit of a pinned test — which
  trips both (correction 3) — reads as the evidence stop the brief asks for; both are terminal and neither commits.
  Delivery reds are an ordinary measurable red → `CONTINUE` / `STOP_CAP`, the path the brief asks to confirm.

e. **The new stuck point S13 — `blocked: ac-evidence-invalid` — keeps `check-loop.mjs`'s decision.** `/pharn-loop`
Step 5 maps `STOP_TERMINAL` with `terminal_cause: ac-evidence` to S13. Unlike S4–S12, the record copies the emitted
`decision: STOP_TERMINAL` and writes `cap`, plus the `blocked:` key, so `check-loop-decision.mjs` still re-derives it
(its exemption keys on `INCONCLUSIVE` + `blocked`, so no checker change; a test pins that it re-derives).
`loop-record.md` says so. The human decides: restore the tests or re-run `/pharn-test` on a fresh plan.

f. **The lock's check is split into pure, composable parts** — `testFirstReds` (files, mapping, spec pin),
`redRunReds`, `testInfraReds`, and the bootstrap SPEC half — and `checkLock` is their union plus the bootstrap
approval spawn, byte-for-byte the verdict it gives today. The gate calls the pure parts and classifies each into ONE
reason, so a fixture can trip exactly one; `check-verify.mjs` stays spawn-free.

g. **The loop reads the per-AC table from the report, bound by freshness.** `check-loop-fresh.mjs` check E re-runs
`check-verify.mjs --stamp … --ac-gate`, and `COMPARED_FIELDS.verify` gains `ac_gate`, so the per-AC table a report
shows must be the one the checker computes from that stamp now (L22: never typed by a model).

h. **Where the per-AC table is shown.** `render-run-report.mjs`'s `## Verdicts` renders `ac_gate` as a fenced DATA
block (the report has no markdown tables — its header's measured reason); no new section, so `SECTIONS` stays
closed. `VERIFY.md` renders the table from the block; `SHIP.md` copies the verdict line and points at
`RUN-REPORT.md` / `VERIFY.md` for the table (P4 — cited, not restated).

## Files

- `pharn/floor/ac-gate-core.mjs` — NEW: the AC gate (closed reasons, modes, verdict, the report block).
- `pharn/floor/ac-gate-core.test.mjs` — NEW: one fixture per reason, all-green, cross-feature, bootstrap, legacy, closure.
- `pharn/floor/test-infra-core.mjs` — NEW: compute and compare the test-infrastructure pin.
- `pharn/floor/test-infra-core.test.mjs` — NEW: its suite.
- `pharn/floor/ac-tests-lock.mjs` — schema /3, the pin in `--write`, split check parts.
- `pharn/floor/ac-tests-lock.test.mjs` — the pin, /3, back-compat.
- `pharn/floor/red-run-core.mjs` — export `observeAc`, used by the verdict.
- `pharn/floor/check-red-run.test.mjs` — `observeAc` parity.
- `pharn/floor/check-ac-tests.mjs` — use `specVerdict`.
- `pharn/floor/spec-template-core.mjs` — `specVerdict` (grill G10).
- `pharn/floor/check-ac-tests.test.mjs` — `specVerdict` agrees with the CLI.
- `pharn/floor/check-verify.mjs` — `--ac-gate`.
- `pharn/floor/check-loop.mjs` — `ac-evidence` terminal, `terminal_cause`.
- `pharn/floor/check-loop.test.mjs` — the new rows.
- `pharn/floor/check-loop-fresh.mjs` — check E passes `--ac-gate`; `ac_gate` compared.
- `pharn/floor/check-loop-fresh.test.mjs` — fixtures carry per-test results; the new comparison.
- `pharn/floor/check-test-stage.mjs` — refuse a test-first lock with no pin before the build (review finding 8).
- `pharn/floor/check-test-stage.test.mjs` — fixtures under the /3 lock if needed.
- `pharn/floor/gate-run-core.mjs` — `RESERVED_IDS` gains `ac-delivery`, `ac-evidence`.
- `pharn/floor/gate-run-core.test.mjs` — the reserved ids.
- `pharn/floor/render-run-report.mjs` — the per-AC block in `## Verdicts`.
- `pharn/floor/render-run-report.test.mjs` — its tests.
- `pharn/pharn-contracts/verify-report.md` — `ac_gate`, the two failing ids, `check-loop.mjs`'s new read.
- `pharn/pharn-contracts/ac-tests.md` — the pin, schema /3, the AC gate.
- `pharn/pharn-contracts/loop-record.md` — S13 keeps its decision.
- `pharn/pharn-contracts/gate-run-record.md` — the reserved ids.
- `.claude/commands/pharn-verify.md` — Step 5 `--ac-gate`, Step 6 the block and `VERIFY.md` table.
- `.claude/commands/pharn-loop.md` — S13, Step 5 mapping, Step 6b record rule.
- `.claude/commands/pharn-ship.md` — `SHIP.md` carries the AC verdict line.
- `.claude/commands/pharn-test.md` — the pin written by `--write`.
- `.dev/floor/command-hygiene.test.mjs` — S13 in `STUCK_POINTS`, the `--ac-gate` pin.
- `README.md` — "what verify proves", the generated inventory.
- `CLAUDE.md` — the AC gate in the commands block; the check-verify spawn note.
- `CHANGELOG.md` — `[6.20.0]`.
- `SKILLS_VERSION` — 6.20.0.
- `docs/capabilities/README.md` — only if `docs:generate` rewrites it — generated.
- `.dev/features/verify-ac-gate/PLAN.md` — this plan.
- `.dev/features/verify-ac-gate/GRILL.md` — the grill.
- `.dev/features/verify-ac-gate/BUILD.md` — the build record.
- `.dev/features/verify-ac-gate/REGRESSION.md` — the regress record.
- `.dev/features/verify-ac-gate/regression-report.json` — the regress verdict.
- `.dev/features/verify-ac-gate/VERIFY.md` — the verify record.
- `.dev/features/verify-ac-gate/verify-report.json` — the verify verdict.
- `.dev/features/verify-ac-gate/REVIEW.md` — the review.
- `.dev/features/verify-ac-gate/SHIP.md` — the ship record.
- `.dev/features/verify-ac-gate/PROTECTED-FOLLOWUPS.md` — the protected-doc edits this needs.

## Amended after grill (2026-09-24)

The grill (`GRILL.md`) returned RED on one blocking finding and eight should-fix/notes; every one is folded in here, and
these amendments SUPERSEDE the decisions above where they differ.

- **G1 (blocking) — S13 must be reachable where the loop actually meets tampered evidence.** In `/pharn-loop` the
  decision-time `check-loop-fresh.mjs --iter <N> --front` runs BEFORE `check-loop.mjs`, and its check I runs
  `check-test-stage.mjs --require-test-first` → `ac-tests-lock.mjs --check --require-red-run`, which REDs an edited
  pinned test (and, from now, a changed pin). So check I is where the Bash-edited-test case lands. Check I's
  test-stage failure gets its OWN closed code, `ac-evidence-invalid` (a new `REASON_CODES` member; the other three
  front checks keep `front-stage-red`), and Step 5.3 maps `4 STOP` with that code to **S13**. `check-loop.mjs`'s
  `terminal_cause: ac-evidence` maps to S13 too — for what reaches it past check I (a per-test never-red, a
  `/2` lock). **ONE record rule for both routes: S13 is an ordinary blocked stop** — `decision: INCONCLUSIVE` plus
  `blocked: ac-evidence-invalid`, skipped by `check-loop-decision.mjs` like S4–S12. This REPLACES decision e: the
  re-derivable STOP_TERMINAL record is dropped, because two record shapes for one row is the confusion the grill named,
  and S13 never commits, so re-derivability buys nothing there. The e2e fixture runs the pinned `--iter <N> --front`
  line BEFORE `check-loop.mjs` (L45), inside `check-loop-fresh.test.mjs`, whose helpers already build a real
  iteration. The commit gate keeps its one outcome (`not committed: evidence stale`) for any STOP.
- **G2 — the remedy.** After the build, `/pharn-test`'s red run reads `ac-test-passes-before-build` and has no escape
  hatch, so "re-run /pharn-test" alone cannot work. Every remedy line says: set the build aside (revert or stash it),
  then re-run `/pharn-test` — or re-plan. The migration cost is stated in the CHANGELOG, the README and `ac-tests.md`:
  a feature whose lock is `/2` (written by 6.18/6.19) FAILS 6.20's verify with `test-infra-unpinned` until that is
  done.
- **G3 — `/2` bootstrap locks.** Bootstrap is detected by `mode` (`modeOf`), never by `schema === SCHEMA`;
  `lockShapeError` requires the pin on a `/3` test-first lock only; `--write-bootstrap` writes `/3` with
  `test_infra: null`. Fixtures: a `/2` bootstrap and a `/2` test-first lock through `--check` and `check-test-stage`.
- **G4 — the stamp can bypass the pin.** For every level gate the AC gate reads, the head stamp must record
  `source: "discover"`, `argv: ["npm","run",<id>]` and `shell: null` — the pinned command — else
  `test-infra-changed` (bootstrap: the gate does not count). The pin also records each gate's `pre<id>` / `post<id>`
  script values (npm runs them implicitly). Script CHAINING (`"test": "npm run test:unit"`) joins the "does not catch"
  list.
- **G5 — the legacy branch.** A legacy SPEC beside an existing `AC-TESTS.md` or lock is `ac-tests-modified`, never
  NOT-APPLICABLE (`spec_template` is outside the approval pin, and SPEC.md is reconcile-exempt). A SPEC AC with no
  mapping row is `ac-never-red` (no locked, once-red test exists for it — a rebuild cannot add one), and a SPEC whose
  `spec_content_hash` is not the lock's is `ac-tests-modified`.
- **G6 — check E now reads the live tree.** On an E mismatch for verify, `check-loop-fresh.mjs` first compares the live
  fingerprint with the verify stamp's `final`; if they differ it DEFERS to F (`tree-moved-since-verify`, a RERUN).
  Check J also re-hashes every run's results file against its `results_sha256` (`output-hash-mismatch`).
- **G7 — wiring.** (a) `/pharn-verify` Step 6's verbatim field list gains `ac_gate`, and `command-hygiene.test.mjs`
  pins it; (b) `/pharn-loop` Step 5.1 hands the rebuild `ac_gate.acs[]` as quoted DATA; (c) `verify-report.md`'s
  `failing_gates` definition names the two ids, which do NOT enter `gates`; (d) `VERIFY.md` renders the per-AC rows as
  a fenced block, never a markdown table; (e) the S13 prose: the description's "S1–S12", Step 2's "S4–S12", and the
  `STOP_TERMINAL` meaning in the description and `loop-record.md`.
- **G8 — two trust claims.** `check-verify.mjs`'s TRUST paragraph and `pharn-verify.md`'s "its only inputs are…" are
  rewritten: under `--ac-gate` the verdict also depends on test ids, titles and statuses the project's reporter wrote —
  untrusted data compared as strings, never interpreted.
- **G9 — cost stated.** A record is refused whole on one flaky test, one `test.fail`, or one duplicate id anywhere in
  the suite (item 01), so such a suite makes verify INCONCLUSIVE; the contract and README say so.
- **G10.** `SHIP.md` carries the AC gate's verdict line and points at `RUN-REPORT.md` (code-rendered) for the table —
  recorded as a deviation from the brief, because a model-retyped table is what L22 forbids. `specVerdict` lives in
  `spec-template-core.mjs` (no `child_process`), and `check-ac-tests.mjs` imports it. `RESERVED_IDS`'s comment is
  updated. The evidence / delivery / record reason sets are an explicit partition, closure-tested.

- **Files, as built.** Three planned test files are not written, each for a stated reason: the end-to-end loop
  fixture lives in `check-loop-fresh.test.mjs` (G1 — its helpers already build a real iteration, and the pinned
  freshness line must run first), not a new `ac-gate-e2e.test.mjs`; `check-verify.mjs --ac-gate` is exercised end to
  end in `ac-gate-core.test.mjs`, which owns the project-world fixture it needs, while the existing
  `check-verify.test.mjs` fixtures keep proving the flag-less and `--stamp` outputs unchanged; and
  `check-loop-decision.test.mjs` has nothing to pin once decision e is dropped (S13 is an ordinary blocked stop).

## Evals to write (P1)

No capability (`role:`) is added or changed, so no eval pair is owed. The floor suites carry the evidence:

- `ac-gate-core.test.mjs`: an all-green world; one mutation per reason (`ac-untested`, `ac-not-passed`, `ac-skipped`,
  `ac-tests-modified`, `ac-never-red` — files and per-test —, `test-infra-changed`, `test-infra-unpinned`, one item-01
  reason), each asserting it is the ONLY reason (L52); another feature's passing `AC-1:` in the same suite does not
  satisfy this feature's failing AC-1; bootstrap GREEN and not-delivered; legacy NOT-APPLICABLE; the reason set
  closed both ways (L36); an empty SPEC AC set is refused, never vacuous (L34).
- `ac-gate-e2e.test.mjs`: AC-2 fails after the build → `check-verify.mjs` FAIL `ac-delivery` → `check-loop.mjs`
  CONTINUE; fixed → PASS → STOP_GREEN; a pinned test edited (with `reconcile` red too) → FAIL `ac-evidence` →
  STOP_TERMINAL `terminal_cause: ac-evidence`; STOP_GREEN unreachable with any AC reason red, through the real stop
  core AND the commit gate (`check-loop-decision.mjs` REDs a forged STOP_GREEN record; `check-loop-fresh.mjs
--commit-gate` stops a report whose `ac_gate` was hand-edited).
- `check-verify.test.mjs`: flag-less and `--stamp`-without-`--ac-gate` output byte-identical over the existing
  fixture set; the precedence table.

## Guarantee audit (P0)

- **FLOOR:** the AC gate's verdict is enum/regex membership (primitive #3) over the per-test record the runner hashed,
  plus content-hash comparisons (primitive #2) of the lock's files, mapping, red run binding and test-infra pin.
  `check-loop.mjs`'s new stop is exact array membership.
- **NOT GUARANTEED, stated where the claim is made:** that a test captures its AC's intent (the README sentence says
  so); that "passed" is true — it is the reporter's word, and the test script, reporter config and
  `pharn.config.json` are agent-editable (the pin narrows that, never closes it); provenance of any file (a
  self-consistent fabricated lock + stamp + results set over the live tree passes — L43); anything the pin names as
  not caught (decision a); that `/pharn-verify` passed `--ac-gate` (command prose — `check-loop-fresh.mjs` check E
  narrows it inside the loop, since its re-run always passes the flag).

## Trust audit (P2)

Test ids and titles, script values, config bytes and mapping paths are untrusted DATA: compared as strings, hashed,
copied into the report as data, rendered fenced, never interpreted. The report names test ids; no stage follows them.
A mismatch message names a gate id or a path, never script content.

## Determinism audit (P5)

Every branch is membership over closed sets (`AC_GATE_REASONS`, `LEVELS`, `RESULTS_FORMATS`, the config-name regex,
`terminal_cause`), string equality or a sha256 compare. No classification by a model.

## Applied lessons

- L5: the gate's inputs are the stamp, its results files and the lock — captured by code, never a model-typed map.
- L22: the pinned `check-verify.mjs … --ac-gate` line is the only way the flag reaches the verdict; the loop's re-run
  passes it in code.
- L34: an empty AC set and an empty match set are refusals, never a vacuous PASS; the closure tests include both.
- L35: one matcher (`observeAc`), one SPEC classifier (`specVerdict`), one lock check composed of named parts.
- L36: `AC_GATE_REASONS`, `terminal_cause` and the config-name set are closed and tested both ways.
- L41: `evaluateAcGate` takes every input explicitly; no defaults.
- L43: the header, the contract and stdout say agreement, never provenance.
- L45: `check-loop-fresh.mjs` — the file that INVOKES `check-verify.mjs` in the loop — changes with it, and its suite
  runs the real re-run.
- L52: one fixture per reason, each asserting it trips only that reason.
- L58: the results file is read through the stamp's hash (item 01); the pin is recomputed from the live tree every time.
- L59: config files are hashed without following a link; a symlinked config is refused, never hashed through.

## Open questions (HALT)

None.
