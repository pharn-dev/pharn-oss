# PLAN — gate-run-stamp: the verify/regress floor input map is produced by tested code

- spec_content_hash: 31450bf51abb80ee68b95a67b4b9728284efeace82ae5ca78be1f67b21b72134 # fix #4
- applied_lessons: [L5, L6, L11, L17, L19, L20, L22, L23, L24, L29, L30, L31, L34, L35, L36, L39, L41, L42, L43, L44, L45, L46, L50, L52]
- increment: A tested runner produces the `{gate-id: exit-int}` map `check-verify.mjs` / `check-regress.mjs verdict` consume, records it in a stamp whose coverage the checkers re-verify, so neither the keys nor the values of the floor's input are typed by the model.
- layer(s): pharn/floor (checkers + runner), pharn-contracts (the stamp shape), .claude/commands (the two invoking product stages) # pharn/ARCHITECTURE.md §4
- constitution_refs: [P0, P3, P5, P6, P7]

## Applied lessons

- L5 — This increment **is** L5's remedy, moved from discipline to code: L5 says a floor verdict is only as
  trustworthy as the orchestration that captures its inputs, and the whole increment relocates that capture
  out of `pharn-verify.md`'s Bash (`:212`, `:229`, `:230`, `:234`, `:269`) into `run-gates.mjs`.
- L6 — The checkers read the map from the stamp's **structured** `runs[]` array, never by grepping the
  runner's stdout; `--stamp` is mutually exclusive with the positional map so there is one structured source.
- L11 — Drove the "Consequences" row below: removing the skip means a project red at base FAILs verify every
  iteration and honestly reaches `STOP_CAP`. L11 is why that is stated as a consequence rather than discovered.
- L17 — The fingerprint asks "does a change here alter what the gates judged?" while `reconcile` asks "may
  this path change after the build anchor?" — L17 is the record of those two questions being conflated, and
  it is why this plan keeps the two path-sets apart instead of reusing `reconcile-ignore.json`.
- L19 — `run-gates.mjs` writes its state, logs and stamp through **Bash**, outside fix #7. Declared here, not
  implied covered; the write target is confined to the state root, which is git-ignored in this repo.
- L20 — The escalation trigger. #222 (`CHANGELOG.md:1817`) is a recorded real recurrence of a discipline-only
  remedy, so a floor check is earned rather than manufactured.
- L22 — Every runner call in both commands ships as a **pinned literal line**, never prose describing how to
  capture an exit code; the existing `=$?` prose is what L22 predicts accumulates wrong implementations.
- L23 — The runner's own logs live under the git-ignored state root, so a stage that writes an artifact does
  not redden a whole-repo gate it owns. Checked deliberately because L23's conflict is invisible on the happy path.
- L24 — The fingerprint cost was **measured live this run**, not inherited: ~463 ms cold / ~75–85 ms warm over
  1925 paths (three runs, stable digest). Recorded below rather than asserted.
- L29 — ALLOWLIST, STYLE_SET, the `reason_code` set and the reserved ids are each materialized **once** in
  `gate-run-core.mjs` with the rules iterating them, never asserted for whichever member was in front of me.
- L30 — The decisive argument **against** splitting coverage out of this increment: a runner that executes
  only what it is handed still lets the asked-for gate be the skipped one. Coverage ships with the runner.
- L31 — Checked and recorded: this increment creates **no** new dev/product copy-pair. `check-verify.mjs` and
  `check-regress.mjs` are product-only, `/pharn-dev-verify` / `-regress` stay flag-less, so no obligation set is opened.
- L34 — Every per-item rule gets an explicit non-empty-domain guard; the `init` exit-3 case pins that an empty
  **source** set refuses even though the injected entries exist, which is the vacuous-pass shape here.
- L35 — The stamp is the **only** store of the map: no `results.json` is written beside it. A second copy plus
  an equality check would certify agreement, not the fact.
- L36 — `reason_code` gets a **closure** assertion over the stems the modules actually emit, not one presence
  test per member, because it is a parameterized value and that is where a variant spelling lands.
- L39 — The reason the fingerprint's excluded set is **not** `reconcile-ignore.json`'s: one declaration read by
  two consumers asking different questions is right for one and silently wrong for the other.
- L41 — Every default the new modules carry is either exercised by a no-argument test or exists in exactly one
  place; `--timeout-ms` is deliberately **required** so no harness-specific default exists to go unexercised.
- L42 — Re-running `check-bash-reconcile.mjs` as the last injected gate answers "would the guards deny this
  **now**", not "did they deny it then". Stated as a bound on the injected entry, not glossed.
- L43 — The honest bound, carried in the core header and on stdout: the stamp certifies **internal
  consistency**; a self-consistent fabricated stamp passes, and a test builds one to prove it.
- L44 — The `run --next` loop is several Bash calls, so no pinned block may carry shell state into the next;
  every value a later line needs is printed by the block that computes it and substituted literally.
- L45 — The fix must reach production: the commands' pinned invocation lines are **extracted and executed** in
  a temp git repo, with a negative control on the pre-fix hand-map form. A suite that only spawns the runner by path cannot see that gap.
- L46 — L20's own prescribed check is still unbuilt, which is why #222 recurred. This plan therefore records
  each deferred piece's **status and trigger** below, so a reader can tell a shipped remedy from a sentence.
- L50 — The D9 sweep runs on **two axes**: the referent (`results.json`, `--complete`, `reconcile.json`,
  `completeness.json` — every cite of the paths and flags that move) first, then the claim's spellings.
- L52 — Each test rule below names the **SET** it must range over ("one case per `reason_code`", "one case per
  excluded name"), never the singular phrasing that licenses covering one member and declaring it done.

## Files

**Scope resolved at GATE 1: Option B — the brief's D1–D9 in full.** I recommended the narrower Option A and
the maintainer widened it to the full brief after reading the sizing evidence (Q1 below records both the
recommendation and the decision, per P6's "the terminal fallback is ask the human"). The deferred pieces named
in my recommendation — the standalone `worktree-fingerprint.mjs`, the feature-artifact excluded set, `algo`
versioning, the reconcile partition test, and the full lock — are therefore **IN**.

- `pharn/floor/gate-run-core.mjs` — pure spec/stamp grammar, `--gates` grammar, coverage rules, the closed `reason_code` set, ALLOWLIST + STYLE_SET; no `child_process` — layer pharn/floor
- `pharn/floor/gate-run-core.test.mjs` — unit + closure tests over every enumeration — layer pharn/floor
- `pharn/floor/worktree-fingerprint.mjs` — git + hashing; reuses `enumerate`/`hashFile`; `algo` versioning; the `.pharn/` exclusion and the feature-artifact `EXCLUDED_ARTIFACTS` constant — layer pharn/floor
- `pharn/floor/worktree-fingerprint.test.mjs` — stability, per-mutation change cases, one case per excluded name, the reconcile partition test — layer pharn/floor
- `pharn/floor/run-gates.mjs` — the CLI: `init` / `run --next` / automatic finalize, process groups, timeouts, the full lock — layer pharn/floor
- `pharn/floor/run-gates.test.mjs` — execution, ordering, exit mapping, finalize refusal, containment, lock recovery — layer pharn/floor
- `pharn/pharn-contracts/gate-run-record.md` — the stamp shape, defined once — layer pharn-contracts
- `pharn/floor/check-verify.mjs` — add `--stamp <p> --feature <n>`; flag-less behavior byte-identical — layer pharn/floor
- `pharn/floor/check-verify.test.mjs` — the stamp cases + the equivalence cases — layer pharn/floor
- `pharn/floor/check-regress.mjs` — add `verdict --base-stamp/--head-stamp` — layer pharn/floor
- `pharn/floor/check-regress.test.mjs` — the stamp cases + the equivalence cases — layer pharn/floor
- `.claude/commands/pharn-verify.md` — Step 3/5 rewiring, read-site + audit sweep, `version:` bump — layer .claude/commands
- `.claude/commands/pharn-regress.md` — Step 3.4/4/5 rewiring, audit sweep, `version:` bump — layer .claude/commands
- `.claude/commands/pharn-loop.md` — D9 sweep of the `--complete` wiring cite only, `version:` bump — layer .claude/commands
- `.claude/commands/pharn-ship.md` — D9 sweep of the Step-2/2b cites only, `version:` bump — layer .claude/commands
- `pharn/pharn-contracts/verify-report.md` — document the additive `gate_run` / `reason_code` shape — layer pharn-contracts
- `pharn/pharn-contracts/regression-report.md` — same — layer pharn-contracts
- `.dev/floor/command-hygiene.test.mjs` — the `=$?` prohibition + DISCRIMINATES control, the stamp-flag rule over every fenced call site, the invocation test — layer .dev/floor
- `CLAUDE.md` — the runner block in the cost-ledger block's style — layer repo-meta
- `CHANGELOG.md` — the entry, with the consequences stated plainly — layer repo-meta
- `SKILLS_VERSION` — 6.7.1 → 6.8.0 (minor: newly shipped product-floor checkers + a new contract) — layer repo-meta
- `docs/capabilities/README.md` — regenerated by `npm run docs:generate` (Bash write, L19) — layer docs
- `README.md` — the `CURRENT-STATE` region regenerated, **never hand-edited** — layer repo-meta
- `.dev/features/gate-run-stamp/architecture-patch/APPLY.md` — the proposed `pharn/ARCHITECTURE.md` §4 contract-list text for a HUMAN to apply; the agent cannot write that file (GRILL R2) — layer .dev

### Explicitly NOT in this increment

- `MIN_CLI` — untouched. The CLI copies all of `pharn/floor` except tests, so new floor files install
  correctly under the current minimum; no relocation and no contract shape change invalidates an install.
- PR 2 (loop freshness) and PR 3 (the `Stop` hook) — the stamp's `fingerprint.final` is **written** here and
  **compared against the live tree** there. Writing a field whose only consumer is the next increment is a P7
  cost accepted explicitly at GATE 1, not an oversight; it is recorded as such rather than justified away.
- `/pharn-dev-verify` / `/pharn-dev-regress` — stay flag-less (no dev twin, no copy-pair; L31).
- `/pharn-build` Step 4's prose-run project gate — the same L30 shape, recorded as a follow-up.

## Contracts satisfied

- `pharn/pharn-contracts/gate-run-record.md` (**new**) — defines the stamp once; the runner writes it and both
  checkers read it, so the shape has one owner (P4 — cited by both, restated by neither).
- `pharn/pharn-contracts/verify-report.md` — extended with the additive, advisory `gate_run` block.
- `pharn/pharn-contracts/regression-report.md` — same, with a per-side block.
- `pharn/pharn-contracts/reconciliation-record.md` — cited, **not** modified: the runner writes only inside the
  git-ignored state root, so it needs no `reconcile-ignore.json` exemption.

## Evals to write (P1)

No `role:`-bearing capability is added, so P1's capability-eval obligation does not attach. The floor checkers
carry `*.test.mjs` suites instead, which is the existing convention for `pharn/floor/*` (they are floor
infrastructure, not Capabilities — `check-verify.mjs:4-6`). Concretely:

- `gate-run-core` → one case per `reason_code` member + a closure assertion over emitted stems (L36, L52).
- `gate-run-core` → one refusal case per reserved-id / duplicate-id / malformed-`--gates` rule; the empty
  **source** set exits 3 although injected entries exist (L34's non-vacuous guard).
- `run-gates` → ordering; exit mapping for 0, non-zero, 127, 126, 128+n; `;` and `$(…)` in argv not
  interpreted; `files: []` → `0` with `ran:false`; a glob file refused; a path outside/equal-to/symlinked
  through the state root refused.
- `run-gates` → finalize is automatic on the last entry, refuses with `tree-changed-between-gates`, records a
  self-mutating gate, writes atomically, and **never** writes a `results.json` (L35).
- `run-gates` → **the fingerprint mutation control (GRILL R4, L34).** A fixture gate that writes a TRACKED,
  non-ignored file must move `fp_after` away from `fp_before` **through `run --next`**, not through a direct
  call to the hashing module. Without it an over-broad exclusion makes the between-gates claim a tautology
  while every unit test stays green — the vacuous pass aimed at this increment's own headline guarantee. The
  negative control is its pair: a gate writing only under the state root must leave the fingerprint equal.
- `run-gates` → **`--extra` operand derivation (GRILL R5).** `<actual>` is **derived, never supplied**: for
  `structural:<expected>` the runner resolves `<actual>` as the `findings.json` colocated with the
  capability directory that owns `<expected>`, per `finding-shape.md`'s emission contract and matching
  `pharn-verify.md:199-215` today. A supplied or mismatched `<actual>` is refused, so the one
  feature-specific gate does not keep a model-typed operand inside the map this increment exists to close.
- `run-gates` → `aux.completeness` is recorded **outside** `runs[]`, and a test asserts an incomplete build
  still yields verify `INCOMPLETE` (exit 3), not `FAIL` — the R1 regression, pinned rather than trusted.
- `check-verify` / `check-regress` → every INCONCLUSIVE case with its `reason_code`; valid stamps give the
  **identical** verdict to the flag-less run over equivalent maps for every existing fixture; existing tests
  unchanged; **a self-consistent fabricated stamp passes**, proving the L43 bound rather than stating it.
- `command-hygiene` → no `<var>=$?` in any fenced block of the two commands, with a DISCRIMINATES test on the
  real pre-fix text; every fenced `check-verify.mjs` / `check-regress.mjs verdict` call carries the stamp
  flags; the pinned lines are extracted and **executed** in a temp git repo (L45), where `test` exits 0 and
  `lint` exits 1, so verify must give `FAIL` with `failing_gates: ["lint"]`.

## Guarantee audit (P0)

- "The map's **values** are the exit codes the runner recorded from the listed argv" → **floor: enum-regex**
  (the stamp's `runs[].exit` are integers written by tested code; the checkers compare them).
- "The map's **keys** cover the discovered allowlist, plus `reconcile`" → **floor: enum-regex** (set
  membership, enforced at `init`, re-checked by the checkers from the stamp).
- "**Build-completeness is captured by the runner but is NOT a gate**" → **floor: enum-regex**, and the
  separation is the claim (GRILL **R1**, resolved before build). The runner records
  `check-build-complete.mjs`'s exit under `aux.completeness` — a **sibling of** `runs[]`, never a member —
  and `check-verify.mjs` reads it onto its **existing** `--complete` path. Folding it into the `gates` map
  would make an incomplete build a red gate, so the verdict would be `FAIL` (exit 1) and **`INCOMPLETE`
  (exit 3) would become unreachable** — silently disabling `/pharn-ship` Step 2b's single bounded rebuild
  (`pharn-ship.md:315-321`, which fires only on `INCOMPLETE`) and collapsing `check-loop.mjs`'s
  `v ∈ {FAIL, INCOMPLETE}` distinction (`:43`, `:79`). `--complete` together with `--stamp` is therefore
  **not** a usage error, contrary to D7: it is the required pairing. `reconcile` is the opposite case and
  **is** a gate, exactly as it is today (`pharn-verify.md:234-235`).
- "No edit happened between gate runs" → **floor: content-hash** (`fp_before`/`fp_after` equality across
  consecutive entries; a mismatch refuses the stamp).
- "`reconcile` ran last" → **floor: enum-regex** (position membership in `runs[]`).
- "The stamp is internally consistent" → **floor**, and **bounded**: it never means the stamp is _true_. A
  self-consistent fabricated stamp passes (L43); a stamp plus logs written via Bash is the `LIMITS.md §6` class.
- "The gates a project _should_ have are the ones discovered" → **advisory.** The allowlist ∩ `package.json`
  is a membership test, but that the allowlist is the _right_ set is judgment. Unchanged from today.
- "The stage ran at all" / "the report on disk is the checker's output" / "the tree has not moved since the
  gates ran" → **NOT claimed here.** These are increment 2, and this plan must not be read as covering them.
- "Who wrote `--gates`" → **advisory**; only `source: explicit|discover` is recorded.
- "The runner's own writes are gated" → **advisory.** They are Bash writes outside fix #7 (L19), confined by
  a containment check to the state root — which is code, not a hook.

## Trust audit (P2)

- **`PLAN.md` `## Files`** (untrusted) reaches the runner only through `check-build-complete.mjs`'s own
  fixed argv in the injected `aux.completeness` entry. The plan never names a gate, never supplies argv, and
  cannot widen the set — which is what keeps L39's "untrusted document controls a floor helper's
  authorization set" from reopening here.
- **Gate stdout/stderr** are untrusted free text. They are written to files **by fd** and only their sha256
  is recorded in the stamp; **no verdict reads their content**, and neither checker opens them. The bytes
  reach a human through the report as quoted DATA, never as an instruction.
- **`--gates` tokens** are untrusted CLI operands. Shell entries run via `/bin/sh -c '<cmd> "$@"' sh <files…>`
  so file names are positional args, never interpolated; argv entries never touch a shell.
- **The stamp** is produced by tested code but lives in the writable tree, so it inherits `LIMITS.md §6`: a
  Bash writer can forge it. Recorded as a named non-guarantee, not as a residual to be discovered later.

## Determinism audit (P5)

- Every new branch is a membership test: `reason_code` ∈ the closed set; gate id ∈ ALLOWLIST ∪ reserved;
  `source` ∈ {explicit, discover}; `stage` ∈ {verify, regress}; `side` ∈ {base, head}; exit-code integer
  comparison. No LLM classification drives any of them.
- The terminal fallback is unchanged and still a question: `init` exit 3 routes to the **existing** no-gates
  HALT (loop S4, `pharn-loop.md:176`), never to a guessed gate set.
- Every runner exit 2 routes to the stage's **existing** fail-closed INCONCLUSIVE artifact, now carrying a
  `reason_code` — fail-closed, never a silent pass.

## Open questions (HALT) — RESOLVED at GATE 1

All four were put to the maintainer as selectable forms before this plan was approved. Both the
recommendation and the decision are recorded, because a plan that records only the outcome cannot be
audited against the reasoning that produced it (P6).

**Q1 — scope. DECIDED: Option B, the brief's D1–D9 in full.** Measured against this repo's own history,
D1–D9 is roughly twice the largest increment attempted here: recent `## Files` counts are 3, 4, 5, 6, 11, 14,
16, 18, 18, 29 (median ~14), and the 29 belongs to `loop-cost-ledger`, whose size is what produced **L52**.
It also introduces execution machinery with **zero precedent in this tree** — a live grep finds no
`detached`, no process-group kill and no subprocess timeout anywhere in `pharn/floor/` or `.dev/floor/`.
**I recommended the narrower Option A; the maintainer read that evidence and chose Option B.** The concern is
recorded here rather than dropped, and the mitigation is carried into `## Evals to write`: every rule below
names the SET it ranges over (L52), because increment size is precisely what makes a one-member test read as
discharged.

**Q2 — the fingerprint's excluded set (D6). DECIDED: ship BOTH sets now.** A correction to the brief's own
reasoning, surfaced during discovery: it justifies excluding `.pharn/` by pointing at PR 2's cross-stage
binding, which under-sells it. The exclusion is load-bearing **in this increment**, because `enumerate()`
derives exclusion from git-ignore (`reconcile-baseline.mjs:78`) and the runner writes its own logs and state
under `.pharn/`. In an install that does not git-ignore `.pharn/`, `fp_after(k)` ≠ `fp_before(k+1)` for
**every** gate, so every run would refuse `tree-changed-between-gates`. The **feature-artifact** excluded set
is the opposite case and its cost is stated rather than hidden: within a single stage's gate window nothing
writes `REGRESSION.md`, `VERIFY.md`, `cost.json` or `LOOP.md`, so in THIS increment those members are
exercised only by their own unit tests, never by an end-to-end path (L34's vacuous shape, L41's unreached
default). Shipping them now is a knowing P7 cost taken for the partition test's standing CI value.

**Q2a — the new obligation set this decision creates (L29/L31/L43), recorded because it did not exist
before.** With `EXCLUDED_ARTIFACTS` added there will be **three** stores of the pipeline-artifact name set:
`check-regress.mjs` `PIPELINE_ARTIFACTS` (`:86-104`, 17 names), `reconcile-ignore.json`
`pipeline_artifacts.names` (`:29-47`, 17 names), and the new constant (13 excluded + 4 deliberately
included). The existing pair is already pinned set-equal by `check-bash-reconcile.test.mjs`. The partition
test must therefore bind the THIRD store to that pair as a **partition** — excluded ∪ {SPEC.md, PLAN.md,
GRILL.md, BUILD.md} == `names` — and the build must not add a fourth ad-hoc copy. **L43's bound applies and
is stated: the partition test certifies the three stores AGREE, never that the set is correct** — all three
can be stale together the day a new pipeline artifact lands and nobody classifies it.

**Q3 — the lock (D4). DECIDED: the full lock per D4.** The brief asserts "parallel Bash calls are real" with
no recorded failure; they are real in this harness, so the atomic claim is clearly justified. Pid-liveness
probing and age-based stale-lock recovery with a pid-reuse grace period handle a **crashed runner**, which
has not been observed — a P7 cost I flagged and the maintainer accepted. Consequence carried into the tests:
the dead-pid and aged-lock recovery paths are reachable by **no** end-to-end run, so each needs a test that
constructs the state directly, or it is a default nothing exercises (L41).

**Q4 — `<T>` and the Bash-call timeout. Bounds read live, number deferred to build.** Claude Code's Bash tool
defaults to **120000 ms** and caps at **600000 ms**, read from the live tool contract this run, not from
memory. The tool's timeout must exceed `<T>`, and the tool cannot exceed 600 s, so `<T>` has a hard ceiling
around 540 s — meaning a project whose suite runs longer than ~9 minutes **cannot be gated by this runner at
all**. That is a real bound on the shipped capability and belongs in the contract and the CLAUDE.md block.
This repo's own `npm test` duration was **not** measured this run; the build MUST measure it before pinning
`<T>`, rather than inheriting a number (L24).

**Q5 — the incident evidence. DECIDED: proceed ("do everything"), hypotheses kept and labelled.** The brief's
evidence block is an unfilled placeholder (`<!-- paste the failing run's LOOP.md + RUN-REPORT.md + final
summary here -->`). Per its own instruction that is said plainly here, and root causes **6** (harness Bash
timeouts) and **7** (pre-existing reds) are carried as **labelled hypotheses**, not as findings — in the
PLAN, the CHANGELOG and both command audits. The increment's P7 trigger does not rest on them: **#222 at
`CHANGELOG.md:1817-1818` is a recorded real failure** ("skipped `/pharn-grill`, `/pharn-regress` and
`/pharn-verify` entirely, hand-executed the equivalent work by judgment"). Root cause 6 additionally gains
independent support from Q4's measured tool bounds, which are a fact about the harness rather than an
inference about the run.

### Grill findings carried forward (GRILL.md, advisory — none gates the build)

`/pharn-dev-grill` raised 9 concerns. **R1, R2, R4 and R5 are RESOLVED in this plan** (above). The remaining
five are accepted with notes and stay recorded rather than silently dropped: **R3** (P3 — `gate-run-core.mjs`
may carry more than one axis; kept whole for this increment, to be re-judged at `/pharn-dev-review`),
**R6** (P5 — the empty-gate-set route is an interactive HALT under `/pharn-verify` and an unattended
`blocked: no-gates` stop under `/pharn-loop`; both fail-closed, and the command audits must name both),
**R7** (P7 — the size mitigation is a test-authoring rule, so the build MUST follow a staged order with
`validate` + `npm test` at named checkpoints), **R8** (P7 — the L46 body line now over-describes the two
surviving deferrals), and **R9** (P7 — gate-log growth under `.pharn/` is bounded per stage by `init`'s
recreate and is otherwise unbounded across iterations; say so plainly in the contract).

### Correcting the record (claims in the brief checked against live state)

- **`main` has moved.** The brief pins `8cefbd4` / SKILLS_VERSION 6.7.0; live `main` is **`51b8f47`** /
  **6.7.1** (a revert plus a docs commit that edited `pharn/ARCHITECTURE.md §5` and the README). Expected bump
  is therefore 6.7.1 → **6.8.0**, not 6.7.0 → 6.8.0.
- **`README.md:408` is wrong on both the line and the remedy.** The contract list is at **`README.md:418`**
  and sits **inside the generated `CURRENT-STATE` region**. It must be regenerated with
  `npm run docs:generate`, never hand-edited — CLAUDE.md names editing between those markers as drift.
- **`pharn-regress.md` contains no `=$?` capture at all** — a full-file grep for `$?` returns nothing. Root
  cause 3's "hand-typed exit code" is real but takes a different form: `:237` "Empty `outside_tests` → record
  `0`" is a _prose instruction to write a literal into the map_, and `:263-264` asks the model to "assemble
  each side into a flat map". The five `=$?` captures are verify-only (`:212`, `:229`, `:230`, `:234`, `:269`
  — the brief lists four of the five and omits `:229`).
- **`CHANGELOG.md:1816` is off by one** — the #222 incident sentence begins at **`:1817`**.
- **`check-bash-reconcile.mjs` prints only JSON on stdout** (one `console.log`, `:290`; no `console.error`, no
  `process.stderr` write). But `pharn-verify.md:234` redirects `2>&1` into `reconcile.json`, so an uncaught
  throw would still corrupt that file. Narrow, real, and worth fixing while the line is being rewritten.
- **No report consumer breaks on an additive `gate_run` / `reason_code`.** Read, not assumed — all seven read
  named fields only: `check-loop.mjs:133`, `check-ship.mjs:139-140`, `check-loop-decision.mjs:171-172`,
  `check-ship-briefing.mjs:323,330`, `render-ship-briefing.mjs:357-358`, `render-run-report.mjs:571-572`,
  `ship-outcome-core.mjs:117,182-183`. None validates a closed top-level key set.
- **Regress's base worktree has no literal path today.** `pharn-regress.md:230` uses `git worktree add
--detach "$TMP" "<base SHA>"` with `$TMP` unbound — which is L44's shape exactly, so D8's "literal printed
  path" is a fix the command needs regardless of this increment.
- **D3's "Order" bullet is truncated in the brief** — it reads "then compleconcile\`", and D7's "Additive
  oute \`gate_run\` field" is likewise cut. The intended order (allowlist, then `structural:*` sorted, then
  completeness, then `reconcile` last) is inferable, but it should be restated before it is built.
- **Claims that checked out unchanged:** `check-verify.mjs:56-57` / `check-regress.mjs:37-38` (the "no child
  process" headers), `check-bash-reconcile.mjs:131` (the `enumerate`/`hashFile` import), `pharn-loop.md:95`
  (no `--gates`), `:274-275` (the `--complete` wiring), `:597-599` (reconcile's advisory bound),
  `command-hygiene.test.mjs:1311` (the dev-canon cite rule), `pharn-verify.md:235` (the results.json line),
  and the 10-contract count.

### Measured this run (L24 — never inherited)

- Tree fingerprint over `enumerate(".")`: **1925 paths**, **~463 ms cold**, **~75–85 ms warm** (three
  consecutive runs, identical digest). Two fingerprints per gate × ~10 gates ≈ **1.5–9 s** added per verify
  run — acceptable, but it must be stated in the contract rather than discovered by a user.
- `.pharn/` **is** git-ignored in this repo (`.gitignore:3`), so `enumerate()` already excludes it here. The
  exclusion only bites in an install that does not — which is exactly the case Q2 turns on.
