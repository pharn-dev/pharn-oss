# REVIEW — install-manifest

Reviewed: the increment of `PLAN.md` (branch `przemek/core-193-c81-spike-and-rfc-pharn-oss-declares-its`), treated as
untrusted. Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Nothing in the
reviewed files read as an instruction to the reviewer.

Re-read after the revision recorded in `PLAN.md` ("Revision after GATE 2"): the `CLAUDE.md` sentence moved to
`.dev/guides/generated-docs.md`, `CLAUDE.md` is byte-equal to `main`, and the findings below are unchanged by it.

## Floor-gate findings

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: pharn/floor/route-token-core.test.mjs:115
  problem: "A comment says check-model-config.mjs cannot be imported; since 7.21.0 it can, without side effects."
  evidence: "it runs `process.exitCode = main()` at import, so it cannot be imported"
```

The parity test it explains still reads the checker's source and still holds (the `const MODEL_ALIASES = [` line is
unchanged). Left as is on purpose: editing an existing test file in this PR would show up in pharn-ci's test-integrity
check for no behaviour change. A later PR can reword the comment, or switch the test to the export.

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: .dev/floor/check-surface-bump.mjs:119
  problem: "pharn/floor/README.md is installed into every project but is outside PRODUCT_SURFACE, so an edit to it reaches installs without a SKILLS_VERSION bump."
  evidence: "installable paths outside PRODUCT_SURFACE are exactly LICENSE, pharn/features/README.md and pharn/floor/README.md"
```

Surfaced by this increment's closure test, not caused by it; recorded in the RFC and SPIKE-DIFF as an observation. The
fix (a `pharn/floor/*.md` member in `PRODUCT_SURFACE` and in CLAUDE.md's list, together) is a separate decision.

Every other claim checked reduces to a floor primitive or is labelled advisory: byte equality (the drift checker), set
membership (the closure test over `PRODUCT_SURFACE`, the per-surface tests), the checker's own bindings for the model
rules (an import plus a deep-equality test), and the spike called a measurement, not a gate. The schema doc separates
what the generator refuses to break from what the CLI must still check, and says the drift check is consistency, not
correctness.

### L-eval → P1

No capability is added or changed, so no eval is owed; `validate` agrees (37 capabilities, GREEN). The new modules are
specified by 45 tests, one per surface rule with a negative control, one per refusal, and real-tree binding tests.

### L-trust → P2

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: .dev/floor/install-manifest-core.mjs
  problem: "Capabilities come from the catalog's filesystem walk while files come from git's list, so a git-ignored copy of a capability elsewhere in the tree is seen by one and not the other."
  evidence: "the capability set is the catalog's `enumerateCapabilities` ... the file list is `gitListing`"
```

The direction is fail-closed: such a copy reads as a griller or lens outside its subtree and refuses generation loudly,
never a silent wrong manifest. Reusing the catalog's walk keeps the manifest's capability set equal to the catalog's by
construction, which is the reason it was chosen. The manifest is emitted as data for a consumer that validates it; no
decision in this repository rests on a free-text field of it.

### L-axis → P3

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: .dev/floor/install-manifest-core.mjs
  problem: "The core imports a per-PR gate CLI (check-surface-bump.mjs) for its glob matcher and version regex."
  evidence: 'import { matchesGlob, VERSION_RE } from "./check-surface-bump.mjs";'
```

Accepted at grill: one glob grammar for both declarations is what lets the closure test compare them, and the import is
side-effect free (`import.meta.main`-gated). The `.dev/ → pharn/` import of `check-model-config.mjs` is the permitted
direction.

## Verdict

GREEN — 0 floor-gate findings, 4 advisory (1 important, 3 minor).

## Lesson candidate

None proposed. No finding is a recurrence-prone mechanism failure whose remedy would otherwise be "remember next time":
the `PRODUCT_SURFACE` gap is a one-off rule omission the new closure test now names, and the stale comment is a
one-line follow-up.
