# PLAN — review-dropped-findings

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L6, L25, L29, L34, L36, L41, L60, L62]
- increment: `pharn/floor/merge-findings.mjs` stops losing lens output silently. A lens `findings.json` that cannot be
  read, is not JSON or is not an array no longer aborts the whole merge; a finding whose enum-gated fields fail
  validation is no longer reported on stderr only. Both are written to a new deterministic sidecar
  `merge-report.json` beside `<out.json>`, the merge exits `3` (merged, incomplete) instead of `0`, and `/pharn-review`
  Step 5 branches on that exit and Step 6 renders a `## Merge incomplete` section with an `INCOMPLETE` verdict. The
  free-text quoting helper becomes total (L62), which fixes a live crash found during discovery.
- layer(s): product floor (`pharn/floor/merge-findings.mjs` + its test); product command
  (`.claude/commands/pharn-review.md`); dev apparatus (`.dev/floor/` budget tests, only if a ceiling must move).
- constitution_refs: [P0, P2, P4, P5, P6, P7]

## The problem, re-verified live (P6)

Audit finding LOOP-7 / ENF-12 (LOW, 2026-10-12), re-read against `origin/main` at `18037dd` (SKILLS_VERSION 6.72.0).
Each part was reproduced with fixtures under `.pharn/rdf/` in this worktree:

1. **A lens that never wrote `findings.json`** — ALREADY FIXED, dropped from this increment. 6.64.0
   (`review-lens-grouping`) added `pharn/floor/lens-groups.mjs`'s `unwritten` list (`absent` / `stale`), which
   `/pharn-review` Step 4 re-checks after the groups return and Step 6 renders as "did not finish".
2. **A lens `findings.json` that is not valid JSON** — STILL OPEN. `merge-findings.mjs:369` calls `die()`: exit 1,
   nothing written, for EVERY lens (measured: `printf '[{"type":'` in one lens file → `input is not valid JSON`, exit
   1, no `out.json`). The same holds for an unreadable path (`:363`) and a non-array (`:371`). `/pharn-review` Step 5
   names no branch on the merge's exit at all, so the model improvises. `lens-groups.mjs`'s `unwritten` does not
   catch it either: it checks presence and mtime, and a fresh malformed file is "written".
3. **A finding with a malformed enum-gated field** — STILL OPEN. It is dropped with its details on stderr only
   (`:463-466`); stdout carries only a `dropped` count and Step 5/6 never mention either. Measured: one finding with
   `file: "src/x.js"` (no `:line`) → `out.json` is `[]`, exit 0 — `REVIEW.md` would read "0 findings", i.e. clean.
4. **NEW, found during discovery (L62):** `asText()` (`:209-211`) quotes free text with `String(v)`, which throws on
   parsed JSON `{"toString":1}`. Measured: a VALID finding whose `problem` is that object crashes the merge with an
   uncaught TypeError (node exit 1, nothing written) — one lens's free-text field takes down every lens's findings.

## Design

### D1 — Where the dropped / unreadable record goes: a sidecar `merge-report.json`

`findings.json` stays a bare JSON array: `pharn/pharn-contracts/finding-shape.md` §Emission defines it as an array,
and `check-structural.mjs` reads it as one, so wrapping it would be a breaking shape change. The record goes to
`<dir of out.json>/merge-report.json`, always written (an empty record on a complete merge overwrites a stale
non-empty one from an earlier run). Its path is derived, not a flag, mirroring `--assignments`' default beside
`<out.json>`; a test exercises it through the CLI exactly as `/pharn-review` calls it (L41). Shape
(`schema: "merge-report/v1"`):

```json
{
  "schema": "merge-report/v1",
  "complete": false,
  "unreadable": [{ "source": "b", "path": "…/lenses/b/findings.json", "reason": "invalid-json" }],
  "dropped": [
    {
      "source": "a",
      "failed": ["file"],
      "raw": { "type": "…", "rule_id": "…", "severity": "…", "file": "…", "problem": "…", "evidence": "…" }
    }
  ]
}
```

- `reason` is a closed, exported enum `UNREADABLE_REASONS = ["unreadable", "invalid-json", "not-an-array"]`. The
  parser's own error message is NOT recorded (it quotes bytes of the lens file, i.e. untrusted content); it stays on
  stderr, as today.
- `failed` is a list from a closed, exported enum `DROP_FIELDS = ["not-an-object", "type", "rule_id", "severity",
"file"]`, in that order: WHICH enum-gated checks failed. Trusted-derived (computed here, P5).
- `raw` holds the dropped finding's six fields, each coerced through the now-total `asText` — UNTRUSTED DATA (those
  values are exactly the ones that failed validation, so they may carry a laundering payload). Including them is
  what makes a dropped real finding readable by the human instead of merely counted. A non-object finding records
  its `asText` rendering under `raw.problem` with the other fields `""`.
- `source` is the existing trusted path-derived lens id (`sourceIdOf`).

### D2 — Exit codes: a named non-clean state, not a failed merge

| exit | meaning                                                                                         | `out.json` / report |
| ---- | ----------------------------------------------------------------------------------------------- | ------------------- |
| `0`  | complete: every input read, nothing dropped                                                     | both written        |
| `3`  | INCOMPLETE: every READABLE input merged; ≥1 entry in `unreadable[]` or `dropped[]`              | both written        |
| `1`  | usage error or a write failure — nothing usable                                                 | not written / stale |
| `2`  | (not produced by this script; `runtime-floor.mjs`'s Node-version refusal, which prints nothing) | not written         |

**Why not fail the merge (justification).** Aborting is what loses the 21 other lenses' findings today: one
malformed file and the human gets NO review. A merge that proceeds and NAMES what it could not use is strictly more
information, and the non-zero exit keeps the state from reading as clean. **Why not exit 0 + a field.** P5: the
command branches on the exit code; a field the model must notice is a discipline, while a distinct exit is a
membership test. `3` (not `2`) because `2` is already the runtime refusal's code for every floor CLI.

### D3 — Determinism (P5) — the byte-identical-under-permutation property is kept and extended

`unreadable[]` sorts by `(path, source, reason)`; `dropped[]` sorts by `(source, JSON.stringify(raw),
failed.join())`. No array INDEX is recorded — it would change when intra-array order is permuted, breaking the
existing ★ determinism test's property. The ★ determinism test is extended to assert `merge-report.json` bytes are
identical under reversed input order and reversed intra-array order, with dropped AND unreadable entries present.

### D4 — `/pharn-review` Step 5 / Step 6 (the command step that tells the model what to do)

Step 5 gains a branch on the merge's exit (P5): `0` → Step 6; `3` → Step 6, rendering the incomplete state below;
anything else → STOP, report the stderr line to the human, run Step 7, end the turn. **The recovery for an
unreadable lens is named and is NOT a retry loop** (see Open question 1): the merged result for every other lens
stands, the unreadable lens is named, and the human re-runs `/pharn-review` (or that lens) if they want it.

Step 6 gains: on exit `3`, a `## Merge incomplete` section rendered from `merge-report.json` — one plain line per
`unreadable[]` entry (`<source>: did not merge (<reason>)`), and per `dropped[]` entry a plain line naming its
`source` and `failed` fields followed by its `raw` values in ONE `>` blockquote (quoted DATA, P2 — never a heading,
never a list item outside the quote); and the advisory verdict line begins `ADVISORY (INCOMPLETE):` with the two
counts. The `## What you may claim` floor bullet on the merge is updated to name the report and the bound (below).
Rationale stays in `merge-findings.mjs`'s header, which the command cites (product-commands guide, P4).

### D5 — Bump: MINOR, 6.72.0 → 6.73.0

A new shipped artifact (`merge-report.json`, schema `merge-report/v1`) and a new exit code from a shipped floor CLI,
plus command bytes. Precedent: 6.4.0 (`merge-findings.mjs` gained the derived `backstop` field + `/pharn-review`
bytes) was minor. Not major: no contract or finding shape changes — `findings.json` is byte-identical for a
complete merge, and the only consumer of the exit code is `/pharn-review` Step 5, shipped in the same release.
`MIN_CLI` unchanged (no installed path moves). Renumber against `origin/main` at PR time if B lands first.

## Applied lessons

- L6 — `/pharn-review` branches on the merge's EXIT CODE and renders from the structured `merge-report.json`, never
  from parsing stderr prose; the dropped details move off stderr into a structured location.
- L25 — the header's "Fail-closed: … writing NOTHING" and "DROPPED and reported" claims are re-derived and rewritten
  for the new behavior, not carried across; the stderr-only report was a checker certifying "clean" by staying quiet
  on stdout/exit, which this closes.
- L29 — the two reason sets are materialized once as exported enums (`UNREADABLE_REASONS`, `DROP_FIELDS`) and the
  tests iterate them: one fixture per unreadable reason, one per drop field.
- L34 — a test asserts the incomplete path is non-vacuous (≥1 entry of each list in the fixture), and a complete merge
  is asserted to write a report with both lists EMPTY and exit 0 — silence and asserted-silence are distinct.
- L36 — closure: every `reason` / `failed` value emitted across the test corpus is a member of its exported enum.
- L41 — the derived report path (beside `<out.json>`) is exercised by the CLI the way `/pharn-review` calls it, not
  only via a fixture override (there is no override flag at all).
- L60 — each new property gets its negative control: the permutation test is run once with the report sort removed
  (must go red); the closure test's corpus must contain every enum member; the Step-5 command pin asserts its anchor
  is found before slicing.
- L62 — `asText` becomes total (try `String(v)`, fall back to `Object.prototype.toString.call(v)`), with a
  `{"toString":1}` test on a valid finding's `problem` AND on a dropped finding's `raw` field, each with a control
  asserting `String()` really throws on that value.

## Files

- `pharn/floor/merge-findings.mjs` — total `asText`; collect unreadable inputs instead of `die`; per-drop `failed`
  fields; write `merge-report.json`; exit 3 when incomplete; stdout gains an `unreadable` count; header rewritten
  for the new contract — layer product floor
- `pharn/floor/merge-findings.test.mjs` — update the three fail-closed tests (now exit 3, partial merge, named
  entry) and the dropped tests' exit (0 → 3); add: report shape + enums closure, per-reason / per-field enumeration,
  determinism of report bytes under permutation, L62 crash tests, complete-merge empty report, stale-report
  overwrite, usage/write exit 1 — layer product floor (test; no bump)
- `.claude/commands/pharn-review.md` — Step 5 exit branch + named recovery; Step 6 `## Merge incomplete` render
  rule and `INCOMPLETE` verdict; `## What you may claim` merge bullet — layer product command
- `.dev/floor/command-hygiene.test.mjs` — a pin that Step 5 names the `3` branch and the stop branch (anchors
  asserted found, L60); raise `COMMAND_BYTE_CEILINGS["pharn-review.md"]` only if measured bytes exceed 30720, by the
  measured + 10% rule — layer dev apparatus
- `.dev/floor/stage-load-budget.test.mjs` — only if the `pharn-review` stage total exceeds its ceiling — layer dev
  apparatus
- `SKILLS_VERSION` — 6.72.0 → 6.73.0 — repo meta
- `CHANGELOG.md` — a new `## [6.73.0]` section — repo meta
- `README.md` — version badge only (`check:badge`), plus the generated `CURRENT-STATE` region if `docs:generate`
  changes it — repo meta
- `docs/capabilities/**` — only what `npm run docs:generate` rewrites — generated
- `.dev/features/review-dropped-findings/GRILL.md`, `REGRESSION.md`, `regression-report.json`, `VERIFY.md`,
  `verify-report.json`, `REVIEW.md`, `SHIP.md` — stage artifacts
- `pharn/floor/check-regress.mjs` — add `merge-report.json` to `PIPELINE_ARTIFACTS` (amendment A1) — layer product
  floor
- `pharn/floor/check-regress.test.mjs` — classify `merge-report.json` as machine-written by `merge-findings.mjs` in
  the ★ ENUMERATION test (amendment A1) — layer product floor (test)
- `pharn/floor/reconcile-ignore.json` — add `merge-report.json` to `pipeline_artifacts.names` (amendment A1) — layer
  product floor
- `pharn/floor/worktree-fingerprint.mjs` — add `merge-report.json` to `EXCLUDED_ARTIFACTS` (amendment A1) — layer
  product floor
- `.prettierignore` — add `pharn/features/*/merge-report.json` beside its siblings (amendment A1) — repo meta

## Amendment A1 — after the first regress RED (a model decision under the orchestrator's delegation, 2026-10-23)

The first `/pharn-dev-regress` run returned `regressions` (exit 1): one new head failure outside the feature,
`pharn/floor/check-regress.test.mjs` "★ recurrence guard: the enum covers EVERY pharn/features/<name>/ artifact the
commands declare". Cause: Step 5 now names `pharn/features/<name>/merge-report.json`, a new per-feature artifact, and
the pipeline-artifact enumeration did not hold it. Left alone, a `/pharn-review` run inside a pipeline feature would
read its own report as a build escape at regress and at reconcile. The fix is the same one each sibling artifact
got (`findings.json`, `assignments.json`): add the name to the four stores the parity tests bind together —
`PIPELINE_ARTIFACTS`, `reconcile-ignore.json` `pipeline_artifacts.names`, `worktree-fingerprint.mjs`
`EXCLUDED_ARTIFACTS` (a post-build artifact), and `.prettierignore` (machine-written `JSON.stringify(…, null, 2)` with
string arrays, which prettier would reflow).

- **No `ALGO` bump in `worktree-fingerprint.mjs`.** The new exclusion changes the digest only for a tree that holds
  `pharn/features/<feature>/merge-report.json`, and no release before 6.73.0 writes that file, so no stamp recorded
  by an earlier release covered such a tree. The golden-digest test pins this: its tree has no such file.
- **Before re-anchoring,** the open epoch was reconciled: `check-bash-reconcile.mjs --base . --require-baseline` →
  `CLEAN`, zero escapes. The build was re-scoped from this amended `## Files` and re-anchored, so the files above are
  declared before they are written (no `plan-widened-after-anchor`).

## Contracts satisfied

- `pharn/pharn-contracts/finding-shape.md` §Emission — `findings.json` stays the array it defines; the merged output
  keeps the six required fields + the documented additive `sources[]`. `merge-report.json` is a NEW sidecar of the
  merge step, not a finding-shape artifact; its shape is owned by `merge-findings.mjs`'s header (the merge's output
  has no contract file today, and adding one is not this increment's — P7).
- §"The rule of the contract" — no guaranteed decision reads `raw` or any free text; the exit code is computed from
  two list lengths.

## Evals to write (P1)

- No Capability (no `role:`) is added or changed, so no eval pair. The checker's behavior is specified by
  `merge-findings.test.mjs` (subprocess tests: every added line is executed in a child `node`, which the pharn-ci
  diff-coverage gate counts).

## Guarantee audit (P0)

- "an unreadable / non-JSON / non-array lens file is named in `merge-report.json` and the merge exits 3" → floor:
  enum-regex (JSON.parse + Array.isArray + a closed reason enum), tested.
- "a dropped finding is named, with which enum-gated checks failed" → floor: enum-regex (the existing validators,
  their results recorded per field), tested.
- "`merge-report.json` bytes are invariant under input permutation" → floor: deterministic sort, tested.
- "the merge no longer crashes on a non-stringable free-text value" → floor: a total function, tested (L62).
- "`/pharn-review` renders the incomplete state and does not call the review clean" → ADVISORY (command prose; nothing
  reads `REVIEW.md`). The pin in `command-hygiene.test.mjs` checks the text is present, never that a run obeys it.
- "the human can read a dropped finding's substance" → ADVISORY; the `raw` values are untrusted DATA, possibly hostile.
- NOT claimed: that a lens whose file was unreadable reviewed anything; that `complete: true` means every lens ran
  (an absent lens file is never an input — that is `lens-groups.mjs`'s `unwritten`, unchanged); that a stale lens
  file (an earlier run's) is excluded from the merge — it is merged, and `unwritten` names it `stale`.

## Trust audit (P2)

- Lens `findings.json` (untrusted: the lens read untrusted code) → `raw.*` in `merge-report.json` carries the dropped
  finding's values verbatim as DATA (JSON-escaped). They never reach `out.json`, the dedup key, the exit code or any
  `failed`/`reason`/`source` value. In `REVIEW.md` they are rendered only inside a `>` blockquote; the trusted-derived
  `source` and `failed` names go on the plain line before it, mirroring the `backstop` placement rule.
- The JSON parser's error message (which quotes lens-file bytes) is NOT copied into the report — stderr only.

## Determinism audit (P5)

- Step 5's branch is a membership test over the exit code {0, 3, other}. The terminal fallback (other) is STOP and
  report to the human.

## Open questions (HALT)

None remain — all three were answered at GATE 1 (below).

## GATE 1 — APPROVED (a model decision by the orchestrator, under the maintainer's delegation, 2026-10-23)

Not a human approval: the batch orchestrator decided GATE 1 under the maintainer's delegation
(`.pharn/batch-2026-10-23/COMMON.md`). Its answers and conditions:

1. **Recovery for an unreadable lens:** no automatic retry (P7). Step 5's exit-3 branch NAMES the human re-run
   (re-run `/pharn-review`, or the named lens) as the recovery.
2. **Bump:** minor, **6.73.0** (A lands 6.72.1 and B 6.72.2 first; a minor above them stays 6.73.0 — renumber by diff
   only if main moves to something else).
3. **Raw free text: included, with a condition (it AMENDS D1).** Each dropped value is stored ALREADY QUOTED: the
   record's per-finding object is named `quoted` (not `raw`), and each of its six values is
   `JSON.stringify(asText(v))` — control characters and newlines escaped, so the value is ONE line — capped at
   `QUOTED_CAP` (exported) characters with a deterministic `…(+N chars)` suffix when longer. The quoting is done by
   the CHECKER, not left to the rendering model, so "a raw multi-line value cannot end the `>` block and forge report
   structure" is a floor property (a total function + a test), the same reason `validate.mjs`'s `showPath` quotes.
   Step 6 renders each `quoted` value verbatim on its own `>` line. A test feeds raw values containing `"\n## Verdict"`
   and `"\n- [blocking]"` and asserts each recorded value has no control character, starts with `"`, and is within the
   cap — plus a control showing the unquoted value DOES contain the newline. Every `raw` in D1 / D3 / Trust audit
   above reads as `quoted` under this amendment; the sort key in D3 becomes `JSON.stringify(quoted)`.
4. **Condition 2 — every caller handles exit 3.** Swept live (`grep -rn merge-findings` over `.claude/`, `pharn/`,
   `.dev/floor/`, `.github/`, excluding `.dev/features/` history and the CHANGELOG): the ONLY invoker is
   `/pharn-review` Step 5 (`.claude/commands/pharn-review.md:249`) plus `merge-findings.test.mjs`. Every other hit is
   prose or a comment: `pharn-dev-review.md:110-111` describes `/pharn-review` and runs no merge (its lenses are
   inline, no `findings.json`), so the dev twin needs NO branch; `validate.mjs`, `count-lenses.mjs`,
   `check-provenance.mjs`, `scan-code-missing-error-handling.mjs`, `lens-groups.mjs` and `source-nul-guard.test.mjs`
   cite it in comments; `check-regress.test.mjs:228` is a fixture string; `command-hygiene.test.mjs:4911` is a
   description string. `/pharn-ship` / `/pharn-loop` and their parts do not reference it. So Step 5's explicit
   `0 / 3 / other→STOP` branch covers every caller, and no caller can read 3 as success-by-default.
