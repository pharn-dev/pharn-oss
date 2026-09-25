# BUILD — review-leftovers-0924

- Plan: `.dev/features/review-leftovers-0924/PLAN.md` (GATE 1 and the post-grill amendments recorded there).
- Spec hash (Step 1): `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` printed
  `4950796f5342df20a298fe22812e45dec3c15317592bd2358a31e149d2dc1c7f`, equal to the plan's pin. No open questions.
- Step 0: `set-writes-scope.cjs --from-plan` set 24 paths; `reconcile-baseline.mjs --anchor --by pharn-dev-build`
  anchored 2264 paths with that scope.
- **Floor (Step 3): `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`, exit 0.**

## What landed

- **Item 1 (D1, G9):** `ac-tests.md` "The test-infrastructure pin" now claims only the listed parts: a change to one
  of them reads `test-infra-changed` at `--check` and at the AC gate, and the pin is not the whole runner.
- **Item 2 (D2):** the full-mode table's `legacy-spec` row says it exits 1 like every kind (3 is `--spec` mode's);
  the `KINDS` comment in `check-ac-tests.mjs` says the same. Already pinned by the existing `onlyKind` test.
- **Item 3 (D3):** `/pharn-ship`'s §6 note: "it realizes §6's terminal stage as a meta-orchestrator over every stage
  before it". No count, no "not yet".
- **Item 5 (D5, G10):** all fifteen line cites in `gate-run-core.mjs` and the one in `check-plan-spec-agree.mjs`
  became name cites. The consumer sentence is dated to 6.8.0 and names `check-loop-fresh.mjs`. A re-run of the plan's
  grep over both files finds no `file:line` cite.
- **Item 6 (D6, G7, G8):** `check-spec.mjs` emits `kind-in-body` for the layout RED; `pin` is only the hash RED.
  `/pharn-spec`'s Draft list, the explanation and the re-validate branch key on the kind token (every RED `pin` →
  recompute; any other kind → Draft). `spec-template.md` and two comments follow.
- **Item 4 (D4, G1–G6):** `render-run-report.mjs`:
  - `dataText(v)`: `String()` for every primitive (byte-identical by construction, `±Infinity` included);
    `JSON.stringify` for a non-null object or array, inside a `try` whose catch renders
    `(value nested too deeply to render)`.
  - `isRecord` guards every entry array: `ac_gate.acs` → `(not an AC entry)  <json>`, `ac_gate.evidence` →
    `evidence  (not an evidence entry)  <json>`, `by_stage_iteration_model` → a `(not a row)` table row.
  - Sites moved onto `dataText`: `acGateLines` (every field, each `tests[]` element), `verdictsSection`
    (`failing_gates`, `regressions`), `outcomeSection` (`iterations`), `measurementLabel` (`start`, `end`, `session`,
    `excluded_requests`), `tokensSection` (every cell, `TOTAL`, `unattributed`). The width computation is a
    `reduce`, not a spread.
  - Verdict tokens (G5): `verdictLines()` renders a verdict inline only when it is a member of
    `VERIFY_VERDICTS` / `REGRESS_VERDICTS`; absent → `unknown` (as before); any other value → `unknown` plus the value
    quoted as DATA in a fence. The header's EXCEPTION now names one inline kind (file paths).
  - Header: a paragraph stating the rule, the three-file domain, and the size bound as measured.

## A build-time addition to D4, recorded (not in the approved plan's text)

Writing the header's narrowed EXCEPTION ("ONE kind of untrusted value is rendered inline: a FILE PATH") required
probing it (L37), and it was false for a second value: `filesSection` rendered `base_sha` from `cost.json` inline,
three times. Probing further found a real defect in the same line: `base_sha` went to `git diff --name-only <base>`
unchecked, and `git diff --name-only --output=<file>` WRITES that file (measured in a scratch repo; the suite's control
repeats it). A crafted `base_sha` therefore made the renderer write an arbitrary path, and a newline in it could open
a heading. Fixed inside the planned file and axis (untrusted JSON values rendered or used safely): `COMMIT_RE`
(40 or 64 lowercase hex) is checked before git sees the value; anything else renders `n/a — \`base_sha\` is not a full
commit id …`without echoing it. Every existing test's`base_sha`is a real 40-hex id,`unknown`, or absent, so no
existing expectation moved. Flagged for`/pharn-dev-review`.

## Tests

- `check-spec.test.mjs`: the four layout tests now expect `kind-in-body` (they failed 4/209 against the new kind
  before the update, which shows they exercise it). New: the two kinds are disjoint (`pin` alone for a drifted or
  malformed hash, `kind-in-body` alone for the collision, `["kind-in-body", "pin"]` in emission order for both); ★
  WIRING: `/pharn-spec`'s re-validate step names each kind the checker emits, as a back-ticked token, with a negative
  control. Suite 211/211. The three suites that shell `check-spec` (`check-ac-tests`, `check-spec-approved`,
  `check-plan-spec-agree`) 87/87.
- `render-run-report.test.mjs`: the reported case through the CLI WRITE path; `dataText` over 13 primitives and the
  hostile objects (each with a control that `String()` throws) and the 20,000-deep value; ★ DOMAIN CLOSURE over a `/2`
  fixture with a bounded membership (every node × {`null`, `{"toString":1}`} + a `null` per array; the 16 known crash
  sites asserted among the walked paths; renders counted); the verdict-string smuggle; `base_sha` option injection
  (with a control that git's `--output` does write); size (20,000-deep values and 250,000 rows, exit 0 through the
  CLI). The F1 header pin moved to the narrowed wording. Suite 77/77.
- **Discrimination, measured:** the same test file run against the pre-fix `render-run-report.mjs` (HEAD's copy in a
  scratch tree, with only `dataText` appended so the import resolves) fails all five behaviour tests and the header pin.
  Its other failures there were the scratch tree lacking `.claude/commands/`.
- **Runtime, measured (G6):** the DOMAIN CLOSURE test ~95 ms (no mutant spawns git: `base_sha: "unknown"`); the size
  test ~0.9 s; the whole renderer suite 3.4–6.3 s across runs.

## Step 2b (format) and the whole-repo confirmations

- The pinned block formatted the 24 scoped paths (the 7 not-yet-written stage artifacts are reported missing by
  prettier, harmless); markdownlint applied MD038 to `/pharn-spec` (spaces trimmed inside two code spans); eslint over
  the 9 JS paths printed nothing.
- `npm run format:check` exit 0; `npm run lint` exit 0; `npm run docs:check` GREEN; `check:changelog` and
  `check-version-badge` GREEN.
- `npm run lint:md` reports 18 errors, **all under `.agents/skills/`**: a gitignored (`.gitignore:12 /.agents/`),
  untracked directory dated 2026-09-24 22:56, before this session, that CI never has. None is in a file this increment
  touched. `/pharn-dev-verify` measures in a clean copy.

Floor GREEN. The build does not judge the content; that is `/pharn-dev-review`'s advisory job.

## Iteration 2 — the GATE-2 fix pass (REVIEW.md findings 1–7)

GATE 2 was held by the orchestrator under the user's delegation. Its decision was **fix**, within the plan's
`## Files`, with the scope re-set from the plan (`--from-plan`, 24 paths). There was no re-anchor, so the build's
reconciliation epoch stands.

- **F1:** the `ac-tests.md` pin sentence names the real outputs: a `--check` RED ("test infrastructure changed — …",
  `lock-red` at the test-stage gate) and `test-infra-changed` at the AC gate.
- **F2:** the CHANGELOG entry was corrected before merge:
  - no "every value" claim, since type-checked values are not stringified;
  - `failing_gates` added to the measured sites, as an open list with no count;
  - the closure test is described as one fixture's nodes, with its bound;
  - the `base_sha` narrowing is disclosed.
- **F3:** the header's rule is "type- or membership-checked first, or `dataText`", and it states the closure test's
  bound. The EXCEPTION now reads "ONE kind of UNCHECKED untrusted value … inline" and names the three checked inline
  values: the command, `base_sha` and the verdicts. The F1 prose pin follows, wrap-tolerant.
- **F4:** the DOMAIN CLOSURE test adds a newline-bearing string mutant. It checks structure with a fence-aware
  `structure()` that has its own control test, and asserts that one injected line changes the result. **Measured:**
  with the inline-verdict guard undone in a scratch copy, the test FAILS, as does the G5 test. Before this, it passed.
- **F5:** the ★ WIRING test asserts every anchor is found and slices a whitespace-flattened command. It pins the kinds
  per branch: `pin` only in "every RED is `pin` → recompute", and `kind-in-body` only in "any other kind → Draft" and
  in the Draft step. **Measured in a scratch copy:**

  | drift in the command                             | result |
  | ------------------------------------------------ | ------ |
  | `kind-in-body` moved into the recompute branch   | FAIL   |
  | `kind-in-body` removed from the whole Draft step | FAIL   |
  | the Step 4 heading renamed                       | FAIL   |
  | no drift (control)                               | pass   |

- **F6:** `COMMIT_RE` widened from full 40/64 lowercase hex to **7–64 hex digits, either case**. Measured in a scratch
  repo: git accepts both an uppercase id and a 7-character one. Every commit-id spelling still reaches git, and a
  new positive test renders the diff for full, uppercase and abbreviated ids. Neither hole reopens: no member can
  start with `-` or hold a newline, and the refused set in the test covers `--output=…`, a newline, `HEAD`, `main`,
  a 6-digit hex and a leading `-`. Symbolic refs stay refused, and that narrowing is stated in the comment and in the
  CHANGELOG. **This build-time addition to D4 is ratified at GATE 2 under delegation.**
- **F7:** accepted, not changed. The verdict enums are a third copy, and the comment now says so and why: drift fails
  SAFE, because a new verdict renders `unknown` with its value quoted.

Re-checked: `validate` GREEN (36), eslint and prettier clean on the scoped paths, `check:changelog` and the badge
GREEN, `check-spec.test.mjs` 211/211, `render-run-report.test.mjs` 78/78.
