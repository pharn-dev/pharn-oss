# GRILL — crash-routing

Plan: `.dev/features/crash-routing/PLAN.md` (approved at GATE 1 by the model under the user's delegation, 2026-09-25 —
a delegated model decision, never a human approval). Spec-hash check: `node .dev/floor/hash-doc.mjs
pharn/ARCHITECTURE.md` = `4950796f…d2dc1c7f` **equals** the pin. **Step 1b lessons-declaration verdict (FLOOR):
GREEN** (`check-plan-lessons.mjs` exit 0, 12 ids, each referenced in the body). That covers the DECLARATION only —
never that the lessons were applied.

Method: the inline Step-2 axes; the 13 registered grillers (`count-grillers.mjs`: registered 13) applied inline, with
the five deterministic plan scanners as their Layer 1; and one independent read-only agent probing the plan's claims
against the live code (its findings are recorded in their own section). The plan is `trust: untrusted` here: no
instruction-looking content was found in it.

## Scanner layer (FLOOR presence data, advisory reading)

`scan-plan-secrets.mjs` → `{"found":false,"hits":[]}`; `scan-plan-pii.mjs` → `{"found":false,"hits":[]}`;
`scan-plan-i18n.mjs` → `{"found":false,"hits":[]}`; `scan-plan-migrations.mjs` → `{"mentions":false,"hits":[]}`;
`scan-plan-observability.mjs` → `{"mentions":false,"hits":[]}`.

## Findings — inline axes and grillers

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".dev/features/crash-routing/PLAN.md:105"
  problem: "The entry maps a failure to LOAD or RUN the core to INCONCLUSIVE, but it trusts whatever evaluate() returns: a core from a partial update whose result lacks `code` would set process.exitCode to undefined, and node exits 0 — FRESH. That is fail-open in the one direction this increment exists to close."
  evidence: "It loads `./loop-fresh-core.mjs` with `await import()` inside a `try`, calls `evaluate(argv)` inside a second `try`, and prints ONE JSON document."
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/crash-routing/PLAN.md:155"
  problem: "check-test-stage.mjs gains its first sibling import (shelled-verdict-core.mjs), so its load graph widens from builtins only; a failure to load that module crashes the gate itself. check-loop-fresh check I routes that to front-stage-red and /pharn-build halts on the non-zero exit, so it stays fail-closed, but the header should say the graph widened and why."
  evidence: "Its inline `^RED —` regex becomes the imported `RED_LINE`."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/crash-routing/PLAN.md:107"
  problem: "The crash document carries `checks: null`, while the checker's documented stdout shape has always had `checks` as an object; the header that documents the shape must say it can be null."
  evidence: 'reason_code: "checker-crashed", reason: <which, with the error''s first line, bounded>, checks: null'
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/crash-routing/PLAN.md:186"
  problem: 'The load-graph sweep computes the entry''s static import closure from source text; the matcher must take only static `import … from "./x.mjs"` statements (not the entry''s dynamic import, not a spawned checker''s path) and must prove non-vacuity (at least the core, gate-run-core, worktree-fingerprint and test-infra-core), or an empty closure passes.'
  evidence: "the entry's static load graph computed × {throws at load, missing}"
```

Grillers with no finding, and why (each applied to the plan's structure, not assumed):

- **testability** — presence recognized: `## Evals to write (P1)` names every case with its control. Layer 2: each
  crash case has an L40 control (the same checker exiting 1 WITH its line), so "a crash is not a RED" is tested by
  varying the condition, not only the member.
- **error-handling** — the whole plan is failure handling; the one inadequacy found is the blocking P0 finding above
  (a malformed result, not a throw).
- **architecture** — fit recognized: the entry/core split mirrors `check-red-run.mjs` / `red-run-core.mjs`; the shared
  rule module is a floor-internal core imported by three floor checkers, the established `*-core.mjs` shape. The P3
  note above is the only concern.
- **coupling** — every changed file is `pharn/floor/` or a contract/command sentence: agnostic, no framework seam.
- **documentation** — the L33/L50 sweep is declared with its substrings and its referent cites; the Files list
  covers each hit.
- **security** — no new input channel. The stderr excerpt and the error message are bounded and JSON-escaped, and no
  verdict reads them; the token is read only at the start of stdout, which untrusted text cannot begin.
- **observability** — the entry keeps the crash's stack on stderr and names the failing phase in `reason`.
- **performance** — one dynamic import per run; the new tests add roughly two dozen short subprocesses.
- **migrations** — no stored format changes; `REASON_CODES` only widens, and no persisted report carries the new
  member.
- **a11y, i18n, privacy, comprehension** — not applicable: no UI, no user-facing locale text, no personal data, no
  new concept a reader must learn beyond the one token the plan names.

## Findings — independent agent

One read-only agent, probing on temp copies only (it reports that it changed nothing; it read later files from
`git show HEAD:` because the build had started in the worktree). Its findings, quoted as DATA, `file` cites as it gave
them:

```yaml
- type: FINDING
  rule_id: "P1"
  severity: important
  file: ".dev/features/crash-routing/PLAN.md:167"
  problem: "The planned straddle test regenerates the report with today's checker, so its AC part always matches the live re-derivation. Dropping the algo clause from E's treeMoved, the one mutation specific to a straddle, leaves every planned assertion green. The mutation the plan measures (E stops subtracting the AC ids) is already caught by two existing tests."
  evidence: "Probe: with `treeMoved = !fp.ok || sf.final !== fp.digest` all 3 worlds still gave iter [1, tree-moved-since-verify, E pass] and commit [4, …, pass]."
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/crash-routing/PLAN.md:146"
  problem: "checkLock's return changes from an Array to {reds, crash}. Any call site left on `reds.length` gets undefined, which is falsy, so it falls through: --record-red-run would record a red run over a lock that checks RED. No existing test runs --record-red-run over a RED lock."
  evidence: "ac-tests-lock.mjs:541-545 `const reds = checkLock(...); if (reds.length)`."
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/crash-routing/PLAN.md:104"
  problem: "The entry maps only throws to checker-crashed. If evaluate() returns a code outside EXIT or a malformed doc, the process exits 0 (FRESH). The catch also has to survive a thrown value that is not an Error."
  evidence: "Probe entry: a core returning {code: undefined} gave exit 0; `throw undefined` at load reaches the catch with e.message undefined."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/crash-routing/PLAN.md:235"
  problem: "The claim says 'never 1', but the stated residuals are incomplete. A missing or unreadable entry file also exits 1. An async throw prints the JSON doc and then exits 1, so the document and the exit code disagree."
  evidence: "Probe: a core scheduling setTimeout(throw) printed its result, then exited 1."
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/crash-routing/PLAN.md:201"
  problem: "The README line says 'shields badge only' and docs:generate should 'rewrite nothing'. Both are wrong: the generated README block counts floor .mjs files, and it goes from 79 to 81 with the two new modules."
  evidence: "README.md:597 at HEAD: 'Floor checkers — 79'."
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/crash-routing/PLAN.md:220"
  problem: "'The entry's static load graph' is empty by design; the sweep must be rooted at the core, assert a non-empty set, and must not reuse FLOOR_MODULES. The mode set also leaves out the likeliest partial-update failures: a missing named export and a syntax error."
  evidence: "The core's computed static graph is 10 modules."
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/crash-routing/PLAN.md:258"
  problem: "The entry's crash reason quotes the error's first line, which for ENOTDIR and ERR_MODULE_NOT_FOUND carries absolute machine paths. The core writes paths relative to the repo (ctx.rel), and /pharn-loop copies this JSON into LOOP.md."
  evidence: "ENOTDIR: not a directory, mkdir '/private/tmp/…/.pharn/pharn-loop/demo'"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/crash-routing/PLAN.md:150"
  problem: "The plan names only ac-tests-lock's test anchor as kept byte-for-byte. check-test-stage.test.mjs also injects at a check-ac-tests.mjs line that main() is being rewritten around, and asserts it occurs exactly once."
  evidence: 'inject(check-ac-tests.mjs, "const { findings, notes } = checkMapping(", …)'
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: "pharn/floor/gate-run-core.mjs:98"
  problem: "The doc sweep misses sentences the change makes stale or incomplete."
  evidence: "gate-run-core.mjs: 'whose load failure would crash it (grill R2)'. pharn-loop.md Step 4: 'Any other exit → S9 … quoting the gate's RED <reason> line'. pharn-ship.md: 'Non-zero → STOP, present the RED <reason> line'. An UNUSABLE exit 2 prints no RED line."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/crash-routing/PLAN.md:239"
  problem: "The crash rule's premise (a RED line before every exit 1) is pinned in the source only. Both grandchildren end with process.exit(main()), so whether the line is actually delivered depends on the platform."
  evidence: "Probe, 2,998-violation SPEC: check-spec-approved's stdout was cut at 65,536 bytes on darwin and its own closing RED line was lost; it still reads 'red' only because the lines it passes through from check-spec start with `RED — `."
```

It also recorded, outside the finding list: GATE 1 is a model decision resting on a quoted instruction the grill cannot
verify, amended after approval — "the user should confirm"; and the installer claim was read at pharn-cli HEAD, not at
the oldest accepted CLI. Items with nothing found: the grandchildren's exit paths, today's exit-2 mappings, the
`checker-crashed` closure, every importer of `check-loop-fresh.mjs`, the existing crash-test anchors, and the evidence
world (exactly `["ac-evidence"]`).

## Dispositions (folded into the plan's `## Amended after grill`)

1. **P0, blocking — taken.** The entry accepts a result only when `code` is a member of the core's exit set
   `{0, 1, 2, 4}` (restated in the entry, pinned to `EXIT` by a test) and `doc` is a plain object; anything else is
   `checker-crashed`, exit 2. A test drives it with a copied core whose `evaluate` returns `{}`.
2. **P3, minor — taken.** `check-test-stage.mjs`'s header states its one sibling import and what a failure to load
   it does.
3. **P0, minor — taken.** The entry's header documents `checks: null`.
4. **P1, minor — taken.** The static-import matcher is anchored on `^import … from "./…mjs"` lines, and the test
   asserts the closure holds the four named modules before iterating it.

Independent agent:

1. **Straddle discrimination (P1, important) — taken.** Each AC-failed world also runs with the report's `ac_gate`
   block rewritten the way an older checker could have written it (a changed per-AC detail) while every stamp-derived
   field stays honest. That report must still pass E and re-run; with E's algo clause removed (a scratch mutation,
   measured and recorded in BUILD.md) it STOPs `report-verdict-mismatch`.
2. **`checkLock`'s callers (P0, important) — taken.** Both call sites destructure `{reds}` / `{reds, crash}` (done in
   the build); a new test runs `--record-red-run` over a lock that checks RED and requires exit 1 with nothing recorded.
3. **The entry's result check (P5, important) — taken, and stricter than inline disposition 1:** `code` in the exit
   set, `doc` a plain object with exactly the core's six keys, and `doc.verdict` the token for that code (a RERUN
   document without `stage_to_rerun` is the original defect). A thrown non-Error (`throw undefined`) is a test case.
4. **Residuals (P0, minor) — taken.** The entry's header adds a missing or unreadable entry file (node's exit 1) and
   an async throw after the document is printed (the document and the exit code then disagree). `/pharn-loop`'s exit-1
   branch gains one sentence: an exit 1 whose stdout is not ONE JSON document with `stage_to_rerun` `verify` or
   `regress` is S11, fail-closed — advisory command prose, closing that residual where the code is read.
5. **README count (P6, minor) — taken.** `docs:generate` rewrites the generated `CURRENT-STATE` block; the plan's
   "badge only" was wrong.
6. **Load-graph sweep (P1, minor) — taken.** Rooted at the core, computed, asserted non-empty and to contain the four
   named modules; modes: throws at load, missing, a syntax error, and a missing named export (the module emptied to
   `export {};`). Spawned checkers are out of the set on purpose (their crash is E's `usage-error`, unchanged).
7. **Machine paths (P2, minor) — taken.** The entry's `reason` replaces every absolute path with `…/<basename>`; the
   full stack stays on stderr. `crashedDetail`'s excerpt is not rewritten: no command copies a child's diagnosis
   lines into a record, which its header states.
8. **Anchor (P6, minor) — no change needed.** `const { findings, notes } = checkMapping(` is untouched, and
   `check-test-stage.test.mjs` passed against the build (189/189 in the affected suites).
9. **Sweep misses (P6, minor) — taken.** `gate-run-core.mjs`'s "would crash it" names the INCONCLUSIVE; `pharn-loop.md`
   Step 4's S9 row and `pharn-ship.md`'s STOP line quote the gate's FIRST line (`RED <reason>` or `UNUSABLE — …`).
   `pharn-ship.md` joins the Files.
10. **Delivery of the premise (P0, minor) — taken as a stated bound.** A `RED —` line lost to a darwin pipe cut or
    to spawnSync's `maxBuffer` reads as a crash or as `r.error`: no verdict, never a pass. Stated in
    `shelled-verdict-core.mjs`'s header.

On GATE 1: it stays recorded as a model decision under delegation, and the final report tells the user so explicitly.
The installer claim was re-read at the oldest accepted CLI: pharn-cli `v0.5.0`'s `install-capabilities.ts` copies the
floor directory recursively minus `*.test.*` files and `test-fixtures/`, so both new modules reach it.

## Prose summary

The plan closes both follow-ups with the shapes the user named, reproduced first, and adds the straddle test. Both
passes found the same fail-open hole independently: the entry guarded two ways the core can fail (load, throw) but not
the third (return something outside its contract). The independent agent's sharpest finding is that the straddle
test as planned would not have detected the one mutation specific to a straddle — the test needed a world the live
re-derivation does not reproduce. The rest are residuals to state, sweep misses, and test precision.

## Verdict

ADVISORY VERDICT: 14 concerns raised (inline pass: 1 blocking-severity, 3 minor; independent agent: 3 important, 7
minor), 13 taken into the plan and 1 needing no change. For the human to weigh — this is not a statement that the
plan is sound.
