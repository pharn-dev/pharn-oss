# GRILL — spec-template-override

Plan: `.dev/features/spec-template-override/PLAN.md` (approved at GATE 1, 2026-09-23). Spec-hash check: the
recomputed `pharn/ARCHITECTURE.md` digest `edc3d07d…ce091a5d2c` **equals** the plan's `spec_content_hash`
(no drift). **Step 1b lessons-declaration verdict (FLOOR): GREEN**: `check-plan-lessons.mjs` exit 0 ("all 17
cited id(s) resolve … and are referenced in the plan body"). That verdict covers the DECLARATION only, never
whether the lessons were applied.

Method: the inline Step-2 axes, the 13 registered grillers (`count-grillers.mjs` → `{"registered":13}`), the
five `scan-plan-*` scanners, and one independent adversarial pass by a separate read-only agent (its findings
are recorded in their own section, below). All findings are advisory (fix #3): the free text quotes the
untrusted plan as DATA.

## Findings — honesty and guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/spec-template-override/PLAN.md:236"
  problem: "Chain sequencing re-anchors the reconciliation epoch inside apply.sh, so verify's reconcile gate covers only apply→verify; the build epoch is judged once, by apply.sh's checkpoint, and the plan does not state this narrowing."
  evidence: "re-sets the scope from this PLAN, and re-anchors (`--by spec-template-override-apply`)"
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/spec-template-override/PLAN.md:264"
  problem: "The plan names SKILLS_VERSION's bump but is silent on MIN_CLI; it should state MIN_CLI stays 0.5.0 and why (no installed path relocates, and the project template is created by the user, never installed)."
  evidence: "`SKILLS_VERSION` — 6.13.0 → 6.14.0 (MINOR: a new capability; re-read `main` at build time and take the next minor if it moved)"
```

## Findings — testability and error handling (P1 / P5)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/spec-template-override/PLAN.md:305"
  problem: "No case covers --resolve-template-ref when the project template is absent AND the shipped default is missing or unreadable (a broken install); the resolve path must then exit 1 (`unreadable`) and print nothing, and only --template-ref's version of that case is tested today."
  evidence: "R0 control — no project template → `--resolve-template-ref` prints exactly `REF`"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/spec-template-override/PLAN.md:349"
  problem: "R12 runs the pinned line from the real repo root and expects pharn-default; a contributor with a local pharn.spec-template.md in this repo would get a false RED, so the test should assert pharn-default only when no project file exists, and otherwise a registry id."
  evidence: "Executed under `sh -c` from the repo root → `pharn-default@…`."
```

## Findings — scope, documentation and structure (P3 / P6 / P7)

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/features/spec-template-override/PLAN.md:105"
  problem: "check-spec.mjs gains the project template's file policy (lstat walk, containment, regular-file test), a reason to change beyond §6's pin contract; the brief fixed the location, so the plan should at least update check-spec's P3 header sentence to name the template-CLI axis it already hosts (--template-ref since 6.13.0)."
  evidence: "The `lstat` work lives in `check-spec.mjs`, which already reads files"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/spec-template-override/PLAN.md:11"
  problem: "The brief's discovery item 4 names pharn/features/README.md as a doc to check; the plan's correcting-the-record list never says it was read and needs no change (it names neither the template nor the protected set)."
  evidence: "Measured this run on branch `feat/spec-template-override` off `main` = `d96ef03`"
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/spec-template-override/PLAN.md:258"
  problem: "The README subsection should say that an existing install gets the new protection only after `pharn update` replaces the hook script (hooks are in pharn-cli's update manifest, install-manifest.ts:79,127); a project template created before that update is unprotected."
  evidence: 'a short "Your own SPEC template" subsection under "The pipeline" (copy the default to `pharn.spec-template.md`, edit it outside Claude''s write tools, human-only by design)'
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: ".dev/features/spec-template-override/PLAN.md:182"
  problem: "The contract's own `purpose:` frontmatter still describes only 'the shape /pharn-spec fills'; the plan updates the body and the Templates table but not that summary line."
  evidence: 'Templates table gains the `project` row, plus a new section **"The project template"**'
```

## Independent adversarial pass

A separate read-only agent read the live code and probed its claims in the scratchpad. It ran a scratch
validator reusing the live `spanned`/`sectionsOf`/regexes, a patched copy of the hook, and markdown-it. The
repo was not modified. Probed items are marked; the rest were read. Its free text is quoted as DATA.

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/spec-template-override/PLAN.md:126"
  problem: "The refusal table never says `ac-example` and `out-of-scope-label` are SKIPPED when their section is missing, hidden or duplicated (as checkTemplate's only() does), so six mutants report two codes each and the 'exactly its code' assertion fails (probed)."
  evidence: 'drop heading line Scope  skip:["section"]  noskip:["section","out-of-scope-label"]'
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".dev/features/spec-template-override/PLAN.md:148"
  problem: "A case variant of the file (`PHARN.SPEC-TEMPLATE.MD`) is found by lstat of the lowercase path on case-insensitive APFS but is ENOENT on a case-sensitive filesystem, so the same checkout resolves to different templates by platform, while the hook denies writes to the variant on both (APFS half and hook probed; Linux half reasoned)."
  evidence: "lstat lowercase found: true"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/spec-template-override/PLAN.md:103"
  problem: "projectRoot() derives from the checker's REAL path, so a symlinked pharn/floor makes the checker read a file the project's hook does not protect, and outside-root cannot see it because both sides derive from HERE (probed); name it as a bound."
  evidence: "HERE=…/shared/pharn/floor root=…/shared while cwd was …/proj"
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".dev/features/spec-template-override/PLAN.md:148"
  problem: "The lstat walk runs before the outside-root check, so an escaping registry path whose target is absent reads as `absent` and falls back to the default; containment is pure path arithmetic and belongs first (read only)."
  evidence: '`lstat` each component of `relative(projectRoot(), templatePath("project"))` from the root'
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/spec-template-override/PLAN.md:152"
  problem: "Two time-of-check/time-of-use windows are unnamed: lstat→readFileSync follows a swapped-in symlink or blocks on a FIFO (O_NOFOLLOW|O_NONBLOCK + fstat closes it), and /pharn-spec's later Read of the file is not tied to the digested bytes (read only)."
  evidence: "Present → containment (`outside-root`), `symlink`, `not-regular-file`, read, validate"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/spec-template-override/PLAN.md:135"
  problem: "'Validated' does not mean 'can be filled to GREEN': a template with one visible prose line in its Acceptance Criteria passes the validator while the faithfully filled SPEC REDs, and the duplicate-section justification invites the stronger reading (probed)."
  evidence: "RED — ac failed: line 33: not an AC item start"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/spec-template-override/PLAN.md:54"
  problem: "The reconcile bound omits its main consequence: the anchor is set at build Step 0, after /pharn-spec (the template's only consumer) ran, so a Bash write that steers this run's spec is never detected (read only)."
  evidence: "So a **non-adversarial Bash write to `pharn.spec-template.md` inside the anchor→verify window is detected**"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/features/spec-template-override/PLAN.md:429"
  problem: 'The planned sweeps miss hits: `git grep "write guard''s default"` returns zero because both sentences wrap across lines, and the L50 list omits spec-template-core.mjs:360,365, the rule-7 remedy that says to copy the line `--template-ref <id>` prints (probed).'
  evidence: "the sweep anchors on the invariant substring `write guard's default`"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/spec-template-override/PLAN.md:162"
  problem: "The plan calls `--template-ref pharn-default`'s output 'byte-unchanged' and also says its digest changes; only the contract and shape are unchanged, and the :881 test passes because it recomputes the digest from the file (read only)."
  evidence: "`pharn-default` validates today, so its output is byte-unchanged"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/spec-template-override/PLAN.md:234"
  problem: "apply.sh's test list is narrower than the precedent's (it omits enforce-writes-scope, hook-wiring and the other hook suites); with the patched hook the wider set passed 510/510, so this is hygiene only (probed)."
  evidence: "`check-bash-reconcile.test.mjs` and `check-spec.test.mjs` on the applied bytes"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: ".dev/features/spec-template-override/PLAN.md:305"
  problem: "R0 and R12 hard-code pharn-default and so depend on the real repo having no project template (duplicates this stage's own R12 finding, extended to R0)."
  evidence: "R0 control — no project template → `--resolve-template-ref` prints exactly `REF`"
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".dev/features/spec-template-override/PLAN.md:156"
  problem: "The stderr path line is not attacker-influenced (registry constant; refusals never echo template text), but reading which file to fill from stderr is the pattern L6 warns about; a stdout-only print mode would be the structured location."
  evidence: '`check-spec: resolved template "<id>" from <path>`'
```

**Checked and found sound by the independent pass:**

- **Probed:**
  - the shipped default passes the simulated validator (LF, CRLF, BOM+CRLF), and the indented example inside
    its guidance comment is hidden; markdown-it agrees on the nine headings, the one visible AC item and the
    Out-of-scope label, and it drops the AC heading in both hidden-heading mutants;
  - the new placeholder passes the validator, the unfilled template stays RED on `guidance` and `template`,
    and the filled one is GREEN;
  - the patched hook denies the absent path, the upper-case variant, a trailing dot, `./sub/../`, and
    symlink, hard-link and dangling aliases, and allows `vendor/…`;
  - an untracked, Bash-written `pharn.spec-template.md` is reported `ESCAPE denied_by protect-trusted-paths.cjs`,
    with no scope and with a scope that names it;
  - the setter parses this PLAN to 14 paths, with the hook excluded under its subheading.
- **Checked by grep:** nothing outside `check-spec.test.mjs` pins the placeholder or the Step 3 line, and
  the CURRENT-STATE counts do not move.
- **Read:** pharn-cli `2fffcb3` copies `.claude/hooks/*.cjs`.

## Grillers — dispositions (13 registered)

- **testability (P1):** a verification approach is present (R0–R15, coverage, the markdown-it probe);
  presence was recognized. Adequacy gaps are the findings above.
- **architecture (P3):** fit recognized. The contract and template stay in `pharn-contracts` (L-1), the
  floor reads down into them, and the hook stays independent of the floor (R9 pins agreement instead of an
  import). One structural concern is recorded above (check-spec's second axis).
- **coupling (P3):** one declared ordering dependency, the human-applied hook step between build and regress.
  `/pharn-loop` is coupled only through `/pharn-spec`'s outcome (correction 6).
- **security (P2):** `scan-plan-secrets` returned `{"found":false}`. The instruction channel the brief names is
  the plan's own trust audit; the stderr path line and the case-variant question were handed to the
  independent pass (it confirmed the path is registry-derived, and found the case-variant divergence above).
- **error-handling (P7):** refusals are a closed set with codes; one missing case (broken install under
  resolve) is recorded above.
- **documentation (P7):** the contract, `/pharn-spec`, both READMEs and CLAUDE.md are in `## Files`; the
  `pharn update` sentence and the contract `purpose:` line are recorded above.
- **comprehension (P7):** the rationale for the fixed, protected path, the static registry member and the
  no-fallback rule is captured in the plan and slated for the contract.
- **privacy:** `scan-plan-pii` returned `{"found":false}`. No personal data.
- **i18n:** `scan-plan-i18n` returned `{"found":false}`. Not applicable (CLI checker and markdown prose).
- **migrations:** `scan-plan-migrations` returned `{"mentions":false}`. There is no data migration; the
  default template's digest change is provenance only.
- **observability:** `scan-plan-observability` returned `{"mentions":false}`. Not applicable.
- **performance:** no concern. One `lstat` per path component (one component) per resolve.
- **a11y:** not applicable (no UI).

## Summary

The plan's core is sound on its own terms, and the independent pass confirmed its central claims by
execution: the default template validates, the patched hook denies every alias probed, and reconcile reports
a Bash-written project template as an escape. The concerns are at the edges:

- **refusal attribution:** the dependent checks must skip when their section is missing, or the
  one-code-per-fixture tests cannot hold;
- **platform determinism:** a case-variant filename resolves differently on case-insensitive and
  case-sensitive filesystems;
- **file-read hardening:** containment first, then an `O_NOFOLLOW` open with `fstat`;
- **honesty:** the reconcile window (it opens after `/pharn-spec` and narrows again after `apply.sh`), the
  unstated `MIN_CLI` decision, "validated" versus "fillable to GREEN", and the "byte-unchanged" wording;
- **coverage:** the broken-install case under resolve, and tests that assume no local project template;
- **channel:** the file to fill is read from stderr rather than from a structured stdout mode (L6);
- **sweeps:** a wrap-tolerant search, plus the rule-7 remedy text in `spec-template-core.mjs`;
- **documentation:** `pharn update` as the path to protection, and the contract's `purpose:` line.

ADVISORY VERDICT: 20 concerns raised (0 blocking-severity, 6 important, 14 minor). This stage's own
interrogation raised 8 (4 important, 4 minor), and the independent pass raised 12 (2 important, 10 minor),
one of which overlaps this stage's R12 finding. They are for the human to weigh before /pharn-dev-build.
This is not a judgment that the plan is sound. The Step 1b floor verdict above is reported separately and
covers the declaration only.
