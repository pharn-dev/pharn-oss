# GRILL — spec-template

Plan: `.dev/features/spec-template/PLAN.md` (approved at GATE 1, 2026-09-23). Spec-hash check: the
recomputed `pharn/ARCHITECTURE.md` digest `2f8b9264…d77e838` **equals** the plan's `spec_content_hash`
(no drift). **Step 1b lessons-declaration verdict (FLOOR): GREEN**:
`check-plan-lessons.mjs` exit 0 ("all 19 cited id(s) resolve … and are referenced in the plan body").
That verdict covers the DECLARATION only, never whether the lessons were applied.

Method: the inline Step-2 axes, the 13 registered grillers (`count-grillers.mjs` →
`{"registered":13}`), the five `scan-plan-*` scanners, and one independent adversarial pass run by a
separate read-only agent. That agent probed its claims against the live code and, where it says so,
against markdown-it (a transitive devDependency). All findings below are advisory (fix #3): the free text
quotes the untrusted plan as DATA.

## Findings — trust and guarantee audit (P0 / P2)

```yaml
- type: FINDING
  rule_id: P0
  severity: blocking
  file: ".dev/features/spec-template/PLAN.md:315"
  problem: "The guarantee 'nothing else sits in the AC section' is labeled floor, but rule 2's closure constrains only column-0 unordered list lines and pre-item text; a later column-0 paragraph, an ordered `1.` item, a `###` line, or a `- **AC-n**` indented 1-3 spaces is absorbed into the previous item or ignored, and the spec stays GREEN."
  evidence: "Rule 2: 'every column-0 list line is an AC item start … and the section holds no non-blank text before the first item'. Probed with markdown-it: 'AC-2: Given…' after a blank line renders as its own <p> outside AC-1's <li>; '1. **AC-3** …' renders as its own <ol>."
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/spec-template/PLAN.md:326"
  problem: "'--template-ref prints the template's content hash → floor: content-hash' mislabels the mode: primitive #2 detects mutation of a pinned artifact, and by the plan's own account nothing ever compares this digest."
  evidence: "'Provenance only: no check compares it with the current template'"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/spec-template/PLAN.md:146"
  problem: "T8 is called L55's 'differential probe against the renderer', but the shipped template is written by the same author; L55's remedy is a reference parser, so T8 certifies the author's own model of the grammar."
  evidence: '''The differential probe against the "renderer" is the shipped template itself (T8 below).'''
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/spec-template/PLAN.md:124"
  problem: "'a variant spelling is counted' overclaims: a case- and whitespace-tolerant marker regex misses `[NEEDS-CLARIFICATION`, `[NEEDS_CLARIFICATION` and `[NEED CLARIFICATION`, so an Approved spec carrying one of those passes."
  evidence: "Rule 3: '(case-insensitive, whitespace-tolerant, so a variant spelling is counted, which fails closed)'"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/spec-template/PLAN.md:336"
  problem: "'Legacy specs validate exactly as before → floor-by-test (T1–T3)' rests on the fixture sample; an old-vs-new differential over every fixture and every committed SPEC would back the word 'exactly'."
  evidence: "'Legacy specs validate exactly as before' → floor-by-test (T1–T3)."
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/spec-template/PLAN.md:113"
  problem: "Near-miss spellings of the opt-in key (`spec-template:`, `Spec_Template:`) silently select the legacy path and skip all seven rules; the key is the only thing between a --model-approve run and the rules."
  evidence: '''The key''s presence is the switch ("spec_template" in fm).'''
```

## Findings — determinism and robustness (P5)

```yaml
- type: FINDING
  rule_id: P5
  severity: important
  file: ".dev/features/spec-template/PLAN.md:117"
  problem: "Neither the CRLF split nor trailing-whitespace tolerance is specified for the new line grammar, and no templated CRLF case is planned; an Approved templated spec is re-validated at five downstream stages, so a false RED on a Windows checkout stops the whole pipeline."
  evidence: "'Section bodies come from one new sectionsOf(body)…'; a plausible verify regex rejects `  - verify: unit ` and `…unit\\r` (probed)."
```

## Findings — scope and honesty (P7 / documentation / error-handling)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/spec-template/PLAN.md:182"
  problem: "Revising an EXISTING legacy SPEC is undefined once the inline skeleton is deleted: migrating it REDs on section/ac, keeping it legacy leaves no skeleton to follow; /pharn-ship can reach this path."
  evidence: "'Step 3: the inline skeleton is DELETED (P4)'; pharn-spec.md Step 1.1 resumes or revises an existing SPEC."
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/spec-template/PLAN.md:208"
  problem: "Decision (c) adds a `not approved` stop, which makes a fifth /pharn-loop sentence false: the Step 7 honest line 'The SPEC was approved by the model, not a person.'"
  evidence: "pharn-loop.md:692-693 honest line; the plan lists four sentences to change."
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/spec-template/PLAN.md:226"
  problem: "check-spec.test.mjs:413-416 says 'a fourth read-only mode is covered by adding one string'; --template-ref cannot join READ_ONLY_MODES (it takes an id, not a path), and 'no existing case edited' leaves that comment false."
  evidence: "'pharn/floor/check-spec.test.mjs — new tests only; no existing case edited'"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/spec-template/PLAN.md:211"
  problem: "CLAUDE.md and the [Unreleased] entry defer the stale `CHANGELOG.md:1817-1818` cite at pharn/floor/gate-run-core.mjs:15 to 'the next product-surface increment because fixing it bumps'; this is that increment and the plan neither fixes nor re-defers it."
  evidence: "CLAUDE.md:126-127; CHANGELOG [Unreleased] 'Deferred.' bullet (fix: cite `CHANGELOG [6.3.0]`)."
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/spec-template/PLAN.md:171"
  problem: "The 'no own test key' warning misses npm init's default placeholder script, the commonest runner-less project; and 'ALLOWLIST runs no e2e gate' is imprecise: a project's test script may itself run e2e."
  evidence: "npm init -y writes \"test\": \"echo \\\"Error: no test specified\\\" && exit 1\"."
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/spec-template/PLAN.md:234"
  problem: "The CHANGELOG plan does not say whether the emptied [Unreleased] group headings stay or go (both are legal)."
  evidence: "'with every [Unreleased] entry moved in under its group'"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/spec-template/PLAN.md:249"
  problem: "Coverage and the grep proof are 'reported in BUILD.md', but no dev feature keeps a BUILD.md and it is not in ## Files, so the set scope would deny it."
  evidence: "'Coverage (reported in BUILD.md, not a test)'"
```

## Grillers — dispositions (13 registered)

- **testability (P1):** a verification approach is present (T1–T12, coverage, grep proof); presence was
  recognized. Adequacy concerns are the findings above.
- **architecture (P3):**
  - fit recognized: the template and contract sit in `pharn-contracts` (L-1), the floor reads down into it,
    and there is no leaf→leaf reference;
  - no new mechanism where one exists: `--template-ref` reuses `bodyHash`.
- **coupling (P3):** one real ordering dependency, and it is declared rather than hidden: `/pharn-spec`
  must run `--template-ref` before writing the SPEC. `check-loop-fresh`'s sandbox is unaffected, since
  `validate` never reads the template.
- **security (P2):**
  - `scan-plan-secrets` returned `{"found":false}`;
  - the P2 concern (a default-writable template steering `/pharn-spec`) is already declared in the plan's
    trust audit;
  - the near-miss-key concern is listed above.
- **error-handling (P7):** the failure modes are declared (unknown id, unreadable template, missing
  argument). The CRLF gap is listed above.
- **documentation (P7):** the public surface (the CLI mode, the contract, the floor README row, the
  README guarantees row) is documented. The legacy-revise gap is listed above.
- **comprehension (P7):** the rationale is captured for the opt-in key, the Map registry, the no-default
  id and the YAML placeholder. Uncaptured: why `AC-<n>` excludes leading zeros. The build states it:
  `AC-01` vs `AC-1` would be two spellings of one id.
- **privacy:** `scan-plan-pii` returned `{"found":false}`. No personal data is handled.
- **i18n:** `scan-plan-i18n` returned `{"found":false}`. Not applicable: this is a CLI checker and markdown
  prose.
- **migrations:** `scan-plan-migrations` got vocabulary hits only ("revert" is the SPEC-state revert).
  There is no data migration; the legacy SPEC path is the compatibility story, covered above.
- **observability:** vocabulary hits only ("metrics" is the Success Metrics section). Not applicable to a
  checker CLI.
- **performance:** no concern. The checker adds a linear pass per section.
- **a11y:** not applicable (no UI).

## Summary

The dominant concern is **grammar closure**. As planned, the AC rule polices only one of the column-0
shapes that markdown renders outside an item, so the "nothing else sits in the AC section" guarantee is
open exactly where L36 predicts. The fix is small and deterministic:

- every non-blank line after the first item must be an AC item start or an indented continuation;
- the count of `**AC-<n>**` tokens must equal the item count.

The rest splits into three groups:

- **honesty:** T8's label, `--template-ref`'s label, and the marker-variant claim;
- **robustness:** CRLF and trailing whitespace;
- **scope sentences:** the legacy-revise path, the fifth loop sentence, the test-file comment, and the
  deferred `gate-run-core.mjs` cite that CLAUDE.md schedules for exactly this increment.

The near-miss key RED is not adopted: it would add a RED to a SPEC without `spec_template`, and the brief
forbids any new legacy RED. It stays a named residual.

ADVISORY VERDICT: 14 concerns raised (1 blocking-severity, 13 advisory) — for the human to weigh before
/pharn-dev-build.
