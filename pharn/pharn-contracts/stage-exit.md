---
name: stage-exit
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for the stage-exit protocol a stage SCRIPT (pharn/floor/stage-regress.mjs, pharn/floor/stage-verify.mjs) uses to report its outcome: the JSON envelope, the exit-code table, and the closed question/answer round trip. The registry is keyed by stage; each stage script adds its own entry. Schema only, zero behavior (P3, pharn/ARCHITECTURE.md §4). Code half: pharn/floor/stage-exit-core.mjs."
---

# Contract — stage-exit

> A `pharn-contracts` schema (zero behavior, no `role:` — it is not a Capability). Enforcers **cite** it
> and **conform** to it; they do not restate its semantics (P4). The principles (P0, P2, P5) live in
> `pharn/CONSTITUTION.md`; the floor primitives in `pharn/ARCHITECTURE.md §2`.

## Why it exists (P7 — a recorded failure, not a hypothetical)

`stage-regress-script` (6.23.0) moved every deterministic step of `/pharn-regress` out of command prose
and into a tested script, `pharn/floor/stage-regress.mjs`. A script that can pause and resume, ask a
structured question, or refuse needs **one** way to say so — otherwise each new stage script would invent
its own shape, and a thin command reading it would re-derive a protocol from prose again, which is the
exact class of defect `pharn/floor/gate-run-record.md` closed for the gate-run stamp (P7, cited not
restated). This contract is that one shape, **keyed by stage**: each stage script adds its own registry entry,
not a new file — `stage-verify-script` (6.26.0) added `verify` that way. The mechanics both scripts share (the
argv rules, the containment walk, the budget tracker, the drain) live once, in `pharn/floor/stage-runtime.mjs`.

## The envelope

Every deliberate exit prints **exactly one** `pharn-stage-exit/1` JSON object on stdout, then ends:

```json
{
  "schema": "pharn-stage-exit/1",
  "status": "done | refused | question | continue | unusable",
  "stage": "regress | verify",
  "feature": "<slug> | null"
}
```

`feature` is `null` only when an argv refusal happens before `<name>` resolves. Each `status` adds an
**additional, closed** key set — closed in **both** directions (`validateStageExit`): every key the status
requires must be present, and no key outside that status's set may appear.

- **`done`** adds `verdict`, `report`, `render`. The machine report and the human render both exist.
  `verdict` is a **transient copy** for a one-line relay — never stored, never a second source of truth.
  The report file is the ONLY place a machine consumer reads the verdict from.
- **`refused`** adds `reason_code`, `render`. The human render exists, naming the refusal; no machine
  report.
- **`question`** adds `reason_code`, `question`, `options`, `resume`. Nothing new; nothing slow has run.
- **`continue`** adds `phase`, `resume`. The progress record exists; re-run `resume.argv`.
- **`unusable`** adds `reason_code`, `detail`. What already happened depends on WHEN it fires (GATE 2
  M5, corrected in round 2 as N1 — the first correction still overclaimed the cleanup). For `regress`, in
  the script's own order:
  - **Before the feature slug parses and the containment walk passes** (`usage-error` with
    `feature: null`, or `path-containment` itself), nothing has been removed or written.
  - **A `usage-error` from the rest of argv** (`--timeout-ms`, `--budget-ms`, a mutually exclusive pair, …)
    fires AFTER this feature's stale prior report was removed but BEFORE the scratch clear. So an earlier
    run's `.pharn/pharn-regress/` scratch survives it: its progress record and its base worktree. An
    out-of-flow `--resume` would then revive that earlier run from its own record (measured). The thin
    command runs `--resume` only after a `continue` exit, so that revival is reachable only outside the
    documented flow.
  - **Every later stop** (`no-feature` onward) has removed the stale report AND cleared `.pharn/pharn-regress/`
    (GRILL G14: one run per worktree at a time, so another run's in-progress record goes with it). From
    "drain-head" onward the stop may have written NEW state: this run's own progress record (a checkpoint is
    persisted at the top of every phase from "drain-head" through "verdict"), a base-commit checkout, install
    logs, gate stamps.
  - None of that is a verdict; only a `done` exit's `report` file is one.
  - A `--resume` invocation's own `unusable` (`no-progress`, `progress-malformed`, `path-containment`, its
    `usage-error`) removes nothing.
  - **A removal that fails** for any reason other than absence is a crash (exit 1, no document), never a `2`
    (since 6.26.0's GATE 2 fix — both stage scripts remove through `stage-runtime.mjs`'s `removeIfPresent`, where
    only `ENOENT` is absence). Before, `regress` swallowed every unlink error, so an unremovable earlier
    `regression-report.json` survived beside a later `unusable`, and the two bullets above did not hold for it.

  For `verify` (6.26.0), in the script's own order — the stage's scratch is cleared BEFORE the rest of argv is
  validated, which is the one difference from `regress` above (the removal rule is the same, shared):
  - **Before the slug parses, or at `path-containment` itself**, nothing has been removed: an earlier
    `verify-report.json`, `VERIFY.md` and progress record survive together.
  - **Any later `unusable`** (a `usage-error` from the rest of argv included) has removed THIS feature's earlier
    report and render AND cleared `.pharn/pharn-verify/`, its progress record first. From the runner's `init` on,
    this run's `gates/` may exist, and from "drain" on this run's own progress record.
  - **A `--resume`'s own stop** removes nothing, but may follow gates it ran, whose logs stay.
  - **A removal that fails** for any reason other than absence is a crash (exit 1, no document), never a `2` — so
    no refusal and no `unusable` can follow a removal that did not happen.
  - The one window left for an earlier run's record to outlive its removed report: a kill between the report
    removal and the record's unlink.

## The exit-code table

| code | status     |
| ---- | ---------- |
| 0    | `done`     |
| 2    | `unusable` |
| 3    | `refused`  |
| 4    | `question` |
| 5    | `continue` |

**Any other code — 1 included — is a CRASH, never a verdict.** Node exits 1 on an uncaught throw or a
failed module load, so a deliberate emission never chooses it: the exit-code set `{0, 2, 3, 4, 5}` is
closed, and `1` is asserted absent from it. A caller reading a non-member code must not guess a status —
present whatever stdout/stderr exist and stop (the 6.21.1 "a crash is not read as a verdict" lesson this
contract inherits structurally: there is no branch that could accidentally choose exit 1 as a status).

## The question — fixed text, no interpolation (P2)

`question` and every option's `label` are **fixed strings**, keyed by `(stage, reason_code)` in
`stage-exit-core.mjs`'s `REGISTRY`. Nothing from a project file, a git ref, or a child's stdout is ever
spliced into them — the object carries **no untrusted free text**.

An option is `{id, label, argv, value}`:

- `argv` — the flag delta to **append** to the question's `resume.argv`, with the literal token `"<value>"`
  replaced by the human's answer. `argv: null` means "stop, do not re-invoke". A question's `resume.argv` is
  the ORIGINAL fresh invocation's argv MINUS the flags that question replaces (N3, GATE-2 round 2): for
  `tests-unresolved` any `--tests <value>` pair is removed, because the original `--tests` is exactly what
  did not resolve, and a repeated flag is read first-occurrence-wins (`--tests` beside `--no-tests` is a
  `usage-error`). The other three `regress` questions remove nothing, because each fires only when the flag
  it asks for was absent: `base-unresolved` without `--base`, and `install-unresolved` without `--install`
  or `--no-install`. `no-gates` never follows an explicit `--gates`: that value is not style- or
  e2e-filtered, so it either yields at least one gate or the runner refuses it (an empty token →
  `unusable child-refused`, probed). `verify`'s one question, `no-gates`, removes nothing either: it fires only
  on the runner's own empty source set, which an explicit `--gates` never reaches, so its `resume.argv` is the
  original argv, unchanged.
- `value` — `null` (the option carries no answer, e.g. `--no-tests`) or `{kind}`, `kind` one of the closed
  `VALUE_KINDS`:

  - **`git-commit`** — control-char-free, bounded, no leading `-`, AND a closed
    shell-metacharacter-free charset (letters, digits, `.`, `_`, `-`, `/`).
  - **`pathspec-list`** — the same baseline, plus `,` and `*`.
  - **`gates-spec`** — the same baseline only — the human's own shell text, exactly as `--gates` is
    today.
  - **`shell-command`** — the same baseline only — the human's own shell text, exactly as `--install`
    is today.

  `git-commit` and `pathspec-list` are held to the tighter charset because a thin command **appends** the
  answer into a shell line (single-quoted); `gates-spec`/`shell-command` are not sanitized beyond the
  baseline because they ARE shell text by design.

That is the whole round trip for both callers named in the header: the thin command relays the question to
the human and re-runs; a future node orchestrator (roadmap 2.1 route B) validates the object, asks, and
re-invokes `resume.argv` with the chosen `argv`, with no model in between. **The stage re-validates the
answer on re-invocation** — a shape check on an argv flag is not a one-time trust decision.

## The `regress` vocabulary

Keyed by stage; `regress` and `verify` are its members.

- **`question`** — `base-unresolved`, `no-gates` (its fixed text names all three causes a discovered set
  can empty into), `install-unresolved`, `tests-unresolved`.
- **`refused`** — `missing-artifact`, `chain-red`, `plan-files-unparseable`, `scope-escaped`.
  - **The `scope-escaped` remedy has a named blind spot (M3, GATE-2 round 2).** The remedy is to declare
    the escaped path in `PLAN.md`'s `## Files` via `/pharn-plan`, or to revert the change. But `scope`
    exempts this feature's own `PLAN.md` from the escape check (`--feature`, lessons L17), so a `PLAN.md`
    whose `## Files` was rewritten to authorize a path already written — by the build, or by anyone after
    it — then reads as declared, not escaped. Nothing else catches it: `check-plan-spec-agree.mjs` reads
    only the PLAN's `spec_content_hash`, which a `## Files` edit does not move. A widening therefore rests
    on a human reading that `PLAN.md` diff. The deterministic remedy, comparing the base and HEAD
    `## Files`, is a follow-up named in `check-regress.mjs`'s honest-scope block.
- **`unusable`** — `usage-error`, `no-feature`, `path-containment`, `unrepresentable-path`, `git-failed`,
  `child-crashed`, `child-refused`, `no-progress`, `progress-malformed`.

`/pharn-loop`'s mapping from a stage-exit object to its own stuck-point table (a paragraph beside its
Step 2 table, not restated here):

- `question no-gates` → S4;
- every other `question` → S10;
- `refused` and `unusable` → S9;
- a crash (an exit outside the table) → S9;
- `continue` is handled inside the thin command (it re-runs the resume line) and never reaches the loop.

## The `verify` vocabulary (6.26.0, `stage-verify-script`)

- **`question`** — `no-gates` only. Its fixed text names verify's one cause (no `--gates`, and `package.json` absent
  or declaring none of the allowlisted scripts) and the caveat the AC gate makes true: for a SPEC written from the
  template, a gate named with `--gates` is not the discovered `npm run <id>` the AC-test lock pinned
  (`test-infra-changed` / `ac-untested`), so adding the missing script is the better answer there. Options:
  `--gates <value>` (`gates-spec`) or stop.
- **`refused`** — `missing-artifact`, `chain-red`, `plan-files-unparseable`. Each writes `VERIFY.md` naming the
  refusal and **no** `verify-report.json`.
- **`unusable`** — `usage-error`, `no-feature`, `path-containment`, `git-failed`, `child-crashed`, `child-refused`,
  `no-progress`, `progress-malformed`. `child-crashed` covers a shelled checker that crashed (the chain check, the
  verifier count, the verdict call whose exit disagrees with its printed verdict) AND a completeness capture that
  is not the checker's shape — a crashed `check-build-complete.mjs` is refused here, before any gate runs, never
  read as an incomplete build. `child-refused` is the runner refusing, a lapse (`lock-busy`,
  `tree-changed-between-gates`, …) included: inside one script those lapses need a concurrent process or an
  external writer, so stopping is the fail-closed direction.

`/pharn-loop`'s mapping for `verify` follows the same rule as `regress`: `question no-gates` → S4; `refused` and
`unusable` → S9; a crash → S9; `continue` is handled inside the thin command. **New S9 stops as of 6.26.0 (the A7
disclosure):** a crashed completeness checker (before, it read `INCOMPLETE`, which `check-loop.mjs` CONTINUEs — a
rebuild iteration, up to the cap), a runner refusal with a lapse included (before, a fail-closed report
`check-loop-fresh.mjs` B could route to one re-run), and an unparseable `## Files` (before, the gates ran and the
verdict read `INCONCLUSIVE`).

## The `regress` install command (GATE 1 Q3 — M10, GATE 2 review: this table had gone missing here)

Read at the BASE commit, from exactly one lockfile family present there (`--install` overrides it
entirely; no `package.json` at all needs no install):

- `package-lock.json` or `npm-shrinkwrap.json` → `npm ci` — **MEASURED**.
- `pnpm-lock.yaml` → `pnpm install --frozen-lockfile` — **UNMEASURED** (nobody has run this command from
  this stage).
- `yarn.lock` → `yarn install --frozen-lockfile` — **UNMEASURED**.
- `bun.lock` or `bun.lockb` → `bun install --frozen-lockfile` — **UNMEASURED**.

Zero or two-or-more families present → `question install-unresolved`. The same four lines, with the same
labels, are the `INSTALL_RULE` table in `stage-regress-core.mjs`'s own header — this section cites that
table rather than re-deriving it (P4), so the two never say something different.

## The budget (`--budget-ms`) and `continue`

A **slow step** (a base-commit install, or one gate run) starts only if it is the FIRST slow step of the
current invocation, or `elapsed + timeoutMs <= budgetMs` (`mayStartSlowStep`, `stage-exit-core.mjs` — the
one shared decision every stage script's `continue` status is built on). The first-always rule guarantees
progress on every invocation. With no `--budget-ms` (a code caller, never a Bash-tool caller), nothing is
budgeted and the script runs to completion. `continue`'s own `resume.argv` is always `["--resume"]`: a
resumed invocation reads everything else it needs from its own progress record, so the resume line itself
carries no state.

**The clock, stated exactly (GATE-2 round 2).** For `regress`, `elapsed` is measured from the top of the
invocation's own entry point (`runFresh`/`runResume`), so a fresh invocation's opening fast work counts
against the budget: argv, containment, the chain check, the base, the partition and head init. Before
round 2 the clock started after head init, and that work went uncharged. Two bounds remain, named:

- node's own startup and module loading before the entry point are not counted;
- the fast work after the last permitted slow step is unbudgeted: `run --next`'s fingerprints, the
  worktree checkout, base init, the verdict and the render.

So the pinned `--timeout-ms 540000 --budget-ms 570000` keeps a run under the 600 s Bash cap only while
that uncounted work fits the remaining 30 s. A second or later slow step ends by budget time 570 s. When
the first slow step is the long one, it starts after the opening work and runs up to 540 s.

For `verify` the clock is the same (`stage-runtime.mjs`'s `makeBudget`, one owner for both stages), the opening
work is argv, containment, the removal, the chain check, the eval-pair listing, the verifier count and the
runner's `init`, and the only slow steps are the gates. The unbudgeted tail after the last permitted gate is
`run --next`'s fingerprints, the verdict call, the report composition, the render and the writes.

**A kill mid-invocation (GATE-2 round 2).** For `regress`, a progress record is persisted at the top of
every phase from "drain-head" through "verdict". A hard kill (a harness timeout, say) therefore leaves the
record at the phase it interrupted, and `--resume` re-runs that phase from its start. That includes a kill
during `git worktree add`: git leaves that worktree locked and half-populated, and the script
force-removes it before re-adding (measured, and tested by killing a real `add` mid-checkout). What a kill
still costs:

- the interrupted phase's own work is repeated (a gate through `run-gates.mjs`'s stale-lock recovery, an
  install from scratch);
- the killed process group's orphans are `run-gates.mjs`'s existing named bound.

For `verify`, the record is persisted at the top of "drain" and of "verdict" — exactly its resumable phases, a set
a test pins equal to the checkpoint call sites — and it stays parked at "verdict" through "render". A resume
re-derives the verdict from the same durable stamp: over an UNCHANGED tree it reproduces the interrupted run's
report, but the AC gate also reads live files (the lock, the SPEC, the mapping), so after the tree moved it may
not. `/pharn-loop`'s `check-loop-fresh.mjs` F catches a moved tree; `/pharn-ship` has no such check. A kill
before "drain" leaves no record of that run, and `--resume` answers `no-progress`.

## Guarantee audit (P0)

- **"The exit code names the status"** → **floor**: enum (the closed `{0,2,3,4,5}` table; anything else is
  a crash, never guessed at).
- **"A `question`/`refused`/`unusable` object's `reason_code` is a registered member"** → **floor**:
  `isReasonCode`/`validateStageExit`, enum membership.
- **"The question's text and every option's full shape — `id`, `label`, `argv`, `value.kind` — are exactly
  the registry's fixed values, closed against an added, removed, or relabeled option"** → **floor**: byte
  equality against `REGISTRY`, checked by `validateStageExit` (F1, GATE 2: a per-option shape check alone
  was not this — `stage-exit-core.test.mjs` carries a forged-label, forged-argv, extra-key, added-option
  and removed-option control for each).
- **"The object carries no untrusted free text"** → holds for `question`/`continue` (fixed text +
  argv/phase strings the stage itself chose) and for `done` (a report/render **path**, never content). It
  does **not** hold for `refused.render`/`unusable.detail`'s **referenced content** — the render a
  `refused` exit points at, and the `detail` string an `unusable` exit carries, may quote an untrusted
  checker message or path; each caller's own trust audit states how that text is fenced downstream. This
  contract governs the **envelope**, not what a caller does with a rendered artifact.
- **"`done.verdict` is authoritative"** → **not a claim**, and deliberately so (GRILL G17): it is a
  transient copy for a one-line relay. The `report` **file** is the only verdict source a machine consumer
  may read.

## Residual (named, not hidden — `LIMITS.md §2`)

This contract governs the **shape** of a stage's exit, never whether the stage's underlying computation is
correct. A stage script that fabricates a self-consistent `done` object with a wrong `verdict` value still
validates against this contract — `validateStageExit` checks structure and registry membership, never that
the reported outcome matches reality. That guarantee, where it exists at all, belongs to the checkers a
stage script shells (`check-regress.mjs`, `check-verify.mjs`, `check-plan-spec-agree.mjs`), cited in each
stage's own command and never re-derived here.

**`done.verdict` and `continue.phase` accept any non-empty string (M6, GATE 2 review — named, not closed
here), for EVERY stage, `verify` included (6.26.0).** Unlike `options[]`, neither is checked against a
per-stage enum.

- `verdict` is the checker's own output — `check-regress.mjs verdict`'s, whose vocabulary
  `regression-report.md` owns, and `check-verify.mjs`'s, whose vocabulary `verify-report.md` owns. The thin
  commands read the REPORT's verdict, never this transient copy.
- `phase` is the stage's own phase name, whose sets `stage-regress-core.mjs` and `stage-verify-core.mjs` own.

**The reason for deferring, corrected in GATE-2 round 2.** An earlier version said that closing this would
put per-stage knowledge into this shared module, "the split `REGISTRY` exists to avoid". That was wrong.
`REGISTRY` exists to HOLD per-stage vocabularies, keyed by stage (the `regress` question, refused and
unusable sets). A per-stage verdict list and continue-phase list would follow the same pattern.

What closing it would actually cost: `stage-exit-core.mjs` imports nothing, so each list would be a second
copy of a vocabulary another module owns, and each would need a parity test against its owner (the M8
precedent).

No real failure motivates that now (P7). The deferral is recorded so the silence reads as a decision, not
an oversight.
