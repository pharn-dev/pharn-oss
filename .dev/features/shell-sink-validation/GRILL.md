# GRILL — shell-sink-validation

**Header.** Plan: `.dev/features/shell-sink-validation/PLAN.md` (as amended at GATE 1). Spec-hash check:
`d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4` recomputed by `.dev/floor/hash-doc.mjs` —
**equal** to the plan's `spec_content_hash`. **Step 1b lessons-declaration verdict (FLOOR, its own clock):**
`check-plan-lessons.mjs` exit 0 — `GREEN — applied_lessons: L5, L19, L21, L22, L27, L29, L33, L35, L36, L37, L38,
L41, L44, L45, L49, L52, L54, L59, L60, L62, L64 … all 21 cited id(s) resolve … and are referenced in the plan body`.
That verdict covers the declaration only, never that the lessons were applied.

Stage model: opus, set by the maintainer's instruction for this batch; run inline in the orchestrated
`/pharn-dev-ship`, effort not routed. The griller is the same model that wrote the plan, which this log states
rather than hides: the interrogation below is advisory, and the independent reads are the review lenses at the
end of the chain.

## Griller membership (FLOOR — `count-grillers.mjs`)

`{"registered":13,…}` — a11y, architecture, comprehension, coupling, documentation, error-handling, i18n,
migrations, observability, performance, privacy, security, testability. Each was applied inline (the live isolated
runner is deferred, P7). Scanner results over the PLAN (Layer 1, deterministic):

- `scan-plan-secrets.mjs` → `{"found":false,"hits":[]}`
- `scan-plan-pii.mjs` → `{"found":false,"hits":[]}`
- `scan-plan-i18n.mjs` → `{"found":false,"hits":[]}`
- `scan-plan-migrations.mjs` → `{"mentions":false,"hits":[]}`
- `scan-plan-observability.mjs` → `{"mentions":true,…}` on the words "spans" (markdown code spans) and "logging" —
  incidental vocabulary, not declared observability; see the observability note below.

## Findings (advisory — the enum-gated / free-text split honored)

### Security (griller Layer 2, P2)

```yaml
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/features/shell-sink-validation/PLAN.md:116"
  problem: "A candidate file that already exists — left by a crash between the Write and the CLI, or committed by a hostile checkout that does not ignore .pharn/ — meets the Write tool's rule that an existing file must be Read before it is overwritten, so the model's natural recovery reads untrusted file content into its context; the plan consumes the file only after a successful read and says nothing about this path."
  evidence: "- **Consume:** the file is removed once read (only `ENOENT` counts as absence; any other failure refuses `not-removed`), so a stale candidate is never read by a later run."
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/shell-sink-validation/PLAN.md:113"
  problem: "Between the containment walk over .pharn/feature-name and the unlink of candidate.txt, a concurrently swapped parent symlink would make the unlink remove a file outside .pharn/; the plan states no bound for that gap, while the stage scripts name the same walk-then-write gap for themselves."
  evidence: "- **Read, safely:** `containmentWalk` over `.pharn` → `.pharn/feature-name` (a symlink or non-directory component refuses, L54)"
```

### Determinism and drift (inline axis, P5 / P6)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/shell-sink-validation/PLAN.md:135"
  problem: "The retry rule lets the model pick a different slug after a refusal even when the name was given to it — typed by the human or threaded by an orchestrator such as /pharn-loop, whose S1 already chose it — so a retry could silently move /pharn-spec to a different feature directory than every other stage uses."
  evidence: "refusal: pick a slug of `a`–`z`, `0`–`9` and `-` and repeat once, then ask the human; under `--model-approve`, report back blocked"
```

### Performance / termination (griller, P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".dev/features/shell-sink-validation/PLAN.md:120"
  problem: "--fresh advances past every candidate whose lstat does not report ENOENT; an lstat error of another kind (EACCES on an unreadable pharn/features) would read as taken for every suffix, so the loop would only end at the 64-character limit — on the order of 10^(64 - slug length) iterations, a hang rather than a refusal."
  evidence: "print the first of `<slug>`, `<slug>-2`, `<slug>-3`, … whose `pharn/features/<x>` `lstat` reports ENOENT (a dangling link counts as taken)"
```

### Comprehension (griller, P7)

```yaml
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/shell-sink-validation/PLAN.md:115"
  problem: "The 4096-byte read bound is an unexplained magic value: the slug grammar already caps a valid candidate at 64 bytes plus one newline, so any file over 65 bytes is not a name and the extra read and the separate too-large code carry no information."
  evidence: "`O_RDONLY | O_NOFOLLOW | O_NONBLOCK`, `fstat` again, at most 4096 bytes."
```

### Scope accounting (inline axis, P6)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/shell-sink-validation/PLAN.md:1"
  problem: "The increment request names pharn/floor/stage-agent-core.mjs (its brief and report lines) as a sink file, and the plan never says why that module needs no change, so a reader cannot tell a deliberate exclusion from an omission."
  evidence: "the plan's ## Files and ## Design name no stage-agent-core.mjs edit and no sentence about it"
```

### Eval / test coverage (inline axis, P1)

```yaml
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/shell-sink-validation/PLAN.md:209"
  problem: "The executed pin runs the committed lines over 'hostile candidates' without naming the set, so the test can be written for the one or two payloads in front of its author (L52) rather than every shape the CLI must refuse."
  evidence: "over hostile candidates written byte-for-byte to the candidate path: exit 2, empty stdout, no canary, candidate removed"
```

## The other grillers (applied; no finding warranted)

- **testability** — presence recognized: D6 and the CLI's own suite declare the verification, each property with
  a named control.
- **error-handling** — present: a closed refusal set, a crash read as no name, a bounded retry and ask; the
  stale-file path is the one gap, raised above under security.
- **architecture** — fit recognized: the new module imports `FEATURE_SLUG_RE` from its one owner and the
  containment walk from `stage-runtime.mjs`, which `scope-inputs.mjs` and `quick-scope-core.mjs` already import from
  outside the stage scripts; no sibling reference, no new contract.
- **coupling** — the candidate file is shared mutable state between the model's Write and the CLI, but the
  ordering is declared (write, then run), it is consumed on read, and its tree-wide concurrency bound is named
  (`candidate-concurrency`); no hidden ordering.
- **documentation** — present: the CLI header is its spec, and a `CLAUDE.md` entry and the CHANGELOG are in
  `## Files`.
- **observability** — the scanner's hits are incidental vocabulary; a deterministic local CLI whose only output is
  its verdict (a name on stdout, or a fixed refusal line) needs no telemetry. No finding.
- **privacy** — scanner clean; no personal data handled. No finding.
- **a11y, i18n, migrations** — `applies:` ssr/spa/backend; the increment adds no UI, no user-facing string and no
  persisted schema. Scanners clean. No finding.

## Summary

The plan's core move holds up under interrogation: a value that never passes through a shell until code has put it
in `FEATURE_SLUG_RE` cannot break any quoting downstream, and the enumeration is explicit about where the line is
drawn. The concerns are at the edges of the new mechanism: what happens when the candidate file already exists
(the Write tool's read-before-overwrite rule would pull untrusted content into context), a retry rule that could
change a name the model was given, a `--fresh` loop that treats every lstat error as "taken" and so would hang
instead of refusing, an unexplained read bound, one unstated exclusion (`stage-agent-core.mjs`), and an unnamed
hostile-candidate set.

ADVISORY VERDICT: 7 concerns raised (0 blocking-severity, 3 important, 4 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b lessons-declaration verdict above is a separate floor clock and is not counted here.
