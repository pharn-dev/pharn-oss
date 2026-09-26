---
name: stage-exit
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for the stage-exit protocol a stage SCRIPT (pharn/floor/stage-regress.mjs today; a future stage-verify.mjs) uses to report its outcome: the JSON envelope, the exit-code table, and the closed question/answer round trip. Schema only, zero behavior (P3, pharn/ARCHITECTURE.md §4). Code half: pharn/floor/stage-exit-core.mjs."
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
restated). This contract is that one shape, **keyed by stage** so a second stage script (roadmap Phase
1.2's `stage-verify.mjs`) adds a registry entry, not a new file.

## The envelope

Every deliberate exit prints **exactly one** `pharn-stage-exit/1` JSON object on stdout, then ends:

```json
{
  "schema": "pharn-stage-exit/1",
  "status": "done | refused | question | continue | unusable",
  "stage": "regress",
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
- **`unusable`** adds `reason_code`, `detail`. Nothing new. An argv refusal (before containment) removes
  nothing; a later `unusable` removed only this feature's stale prior report, in the script's "fresh"
  phase.

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

- `argv` — the flag delta to **append** to the ORIGINAL fresh invocation's `resume.argv`, with the literal
  token `"<value>"` replaced by the human's answer. `argv: null` means "stop, do not re-invoke".
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

Keyed by stage; `regress` is the only member today.

- **`question`** — `base-unresolved`, `no-gates` (its fixed text names all three causes a discovered set
  can empty into), `install-unresolved`, `tests-unresolved`.
- **`refused`** — `missing-artifact`, `chain-red`, `plan-files-unparseable`, `scope-escaped`.
- **`unusable`** — `usage-error`, `no-feature`, `path-containment`, `unrepresentable-path`, `git-failed`,
  `child-crashed`, `child-refused`, `no-progress`, `progress-malformed`.

`/pharn-loop`'s mapping from a stage-exit object to its own stuck-point table (a paragraph beside its
Step 2 table, not restated here):

- `question no-gates` → S4;
- every other `question` → S10;
- `refused` and `unusable` → S9;
- a crash (an exit outside the table) → S9;
- `continue` is handled inside the thin command (it re-runs the resume line) and never reaches the loop.

## The budget (`--budget-ms`) and `continue`

A **slow step** (a base-commit install, or one gate run) starts only if it is the FIRST slow step of the
current invocation, or `elapsed + timeoutMs <= budgetMs` (`mayStartSlowStep`, `stage-exit-core.mjs` — the
one shared decision every stage script's `continue` status is built on). The first-always rule guarantees
progress on every invocation. With no `--budget-ms` (a code caller, never a Bash-tool caller), nothing is
budgeted and the script runs to completion. `continue`'s own `resume.argv` is always `["--resume"]`: a
resumed invocation reads everything else it needs from its own progress record, so the resume line itself
carries no state.

## Guarantee audit (P0)

- **"The exit code names the status"** → **floor**: enum (the closed `{0,2,3,4,5}` table; anything else is
  a crash, never guessed at).
- **"A `question`/`refused`/`unusable` object's `reason_code` is a registered member"** → **floor**:
  `isReasonCode`/`validateStageExit`, enum membership.
- **"The question's text and option labels are exactly the registry's fixed strings"** → **floor**: byte
  equality against `REGISTRY`, checked by `validateStageExit`.
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
stage script shells (`check-regress.mjs`, `check-plan-spec-agree.mjs`), cited in each stage's own command
and never re-derived here.
