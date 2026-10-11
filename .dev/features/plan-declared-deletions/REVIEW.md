# REVIEW — plan-declared-deletions (6.56.0)

- reviewer: `/pharn-dev-review`, independent (fresh context), worktree cut from `main` @ `2acb55a`, increment at `b22a225`
- scope: `git diff 2acb55a..b22a225` (26 files), read as `trust: untrusted`
- verdict: **blocked-with-1-floor-finding**

## Step 1: floor first (P0)

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."` (exit 0).
- `npm run check` → exit 0; `node --test`: 5286 tests, 5285 pass, 0 fail (1 skipped).

The floor is GREEN. The blocking finding below is a **reproduced** defect in a floor CLI's refusal set. No existing gate
covers it, so the green floor does not catch it.

## Floor-gate findings (blocking)

```yaml
- type: FINDING
  rule_id: P0
  severity: blocking
  file: "pharn/floor/apply-plan-deletions.mjs:134"
  problem: >-
    The control-path refusal compares spellings (exact + JS toLowerCase), but the unlink resolves through the
    filesystem, which on a default case-insensitive APFS volume also folds characters toLowerCase does not (U+017F
    LATIN SMALL LETTER LONG S -> "s"). So an untrusted PLAN line deletes a trusted doc or the hook wiring that
    this module, the "Floor:" bullet in pharn-build.md:303, pharn-plan.md:214 and CHANGELOG [6.56.0] all say is
    never deleted. protect-trusted-paths.cjs denies the same spelling, because it resolves the target.
  evidence: >-
    Reproduced in a scratch project (macOS, APFS): a PLAN `## Files` with "- `LIMIT\u017f.md` (delete)" and
    "- `.claude/\u017fettings.json` (delete)" ran `apply-plan-deletions.mjs --feature x` with exit 0,
    deleted: ["LIMITſ.md", ".claude/ſettings.json"], and both LIMITS.md and .claude/settings.json were GONE.
    Feeding the same LIMITſ.md path to protect-trusted-paths.cjs returns exit 2,
    "is (or resolves to) a trusted file". Reconcile's HEAD comparison would RED these two at verify, so the
    deletion is detected afterwards. It is not refused, and the .claude/settings.json deletion turns both
    write guards off for the rest of the session.
```

**Suggested fix (not applied; review does not edit built files):** judge the on-disk identity, not the spelling.
`containmentWalk` has already refused symlinked parents, and `lstat` has shown that the leaf is a regular file. So
`canon = relative(realpathSync.native(root), realpathSync.native(abs))` is the on-disk spelling. On this machine,
`realpathSync.native("PHARN/Features/x")` returned `…/pharn/features/x` and `realpathSync.native("LIMITſ.md")` returned
`…/LIMITS.md`. Re-run `badPath`, the `.git` segment test and `isControl` over `canon` too, and refuse if either
spelling trips. Pin it with tests gated on a case-insensitive-volume probe, covering the long-s and ASCII-case
spellings, each paired with a control (L60).

## Advisory-gate findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "pharn/floor/apply-plan-deletions.mjs:128"
  problem: >-
    badPath's `.pharn/` and `pharn/features/` refusals are ASCII case-sensitive (the `.git` test is folded, the
    control set is folded, these two are not), so on a case-insensitive volume a PLAN deletes runtime state and
    pipeline artifacts the CHANGELOG says are never deleted. Neither path reaches a trusted file, hence important
    rather than blocking. `.pharn/` is git-ignored, so reconcile never sees that deletion. An active-slug
    pipeline artifact is reconcile-exempt.
  evidence: >-
    Same repro: "- `.PHARN/writes-scope.json` (delete)" and "- `PHARN/features/other/SPEC.md` (delete)" are both
    deleted, exit 0. The first silently releases the live writes-scope mid-build.
    The fix for the blocking finding (re-check the realpath.native spelling) closes this too.
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/apply-plan-deletions.test.mjs:144"
  problem: >-
    REFUSAL_CASES folds case only for `.GIT/config` and `limits.md`. No row covers a case-variant `.pharn/` or
    `pharn/features/` prefix, a case-variant floor or hook path, or a Unicode case-fold spelling, so the
    findings above pass the suite.
  evidence: '["bad-path", "- `.GIT/config` (delete) — any letter case", ...] — no `.PHARN/` or `Pharn/features/` row'
- type: FINDING
  rule_id: P4
  severity: minor
  file: ".claude/commands/pharn-plan.md:212"
  problem: >-
    The docs say the marker is "one space after the closing back-tick" (pharn-plan.md:212, CHANGELOG [6.56.0], and
    check-build-complete's near-miss reason), but DELETE_MARKER_RE (plan-files-core.mjs:95) accepts any run of spaces
    or tabs. Only the core's header states the code's actual rule.
  evidence: "DELETE_MARKER_RE = /^\\s*-\\s+`[^`]+`[ \\t]+\\(delete\\)(?=[ \\t]|$)/"
- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/apply-plan-deletions.mjs:59"
  problem: >-
    The new helper is the first non-test product-floor module to import from the CLI checker
    check-bash-reconcile.mjs. That gives the checker a second reason to change (its exported data loader is now a
    shared API), the shape REVIEW F3 retired for render-verify -> check-build-complete by extracting a core.
  evidence: 'import { isAlwaysReconciled, loadIgnoreData } from "./check-bash-reconcile.mjs";'
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/apply-plan-deletions.mjs:185"
  problem: >-
    Validate-all-then-unlink: unlinkSync re-resolves the parent chain that planDeletions walked earlier, so a parent
    swapped for a symlink in between is followed. This does not matter under the stated non-adversarial model, but
    the module's bounds do not name it.
  evidence: "unlinkSync(resolve(root, p)); — no containment re-walk between the lstat in planDeletions and here"
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/plan-files-core.mjs:95"
  problem: >-
    The stated bound covers synonyms only. A correctly spelled marker placed after the description
    ("- `src/x.ts` — orphan (delete)") is also an ordinary item that nothing reports: the file stays and
    check-build-complete reads complete.
  evidence: "BOUND: a synonym — `(remove)`, `(rm)` — is an ordinary item, and nothing reports it."
```

## Lens notes

- **L-floor (P0).** The "Floor:" bullet in `pharn-build.md:303` reduces to regex + membership + `lstat`, a
  legitimate floor kind. Its membership set does not hold on the default macOS volume (blocking finding above). The
  other claims are labeled correctly: the unlink is narrowed as a Bash-side write that reconcile judges, "absent is
  not deleted by this build" is stated, and "nothing else deletes" is advisory. The `check-build-complete` claims
  (ENOENT-only absence, L54; the `declared ∪ deletions` empty-domain rule, L34) match the code.
- **Setter parity (asked).** The setter (`set-writes-scope.cjs:234`) and `plan-files-core.mjs` split lines and apply
  both boundaries and the item regex identically. Both `clean` only the back-ticked text, so a `(delete)` item scopes
  as its bare path. I found no near-miss that the two read differently: the marker is read only from the raw line
  outside the back-ticks, and `value` is unchanged. CRLF is handled (`split(/\r?\n/)` in both). The parity test
  `★ PARITY: the setter scopes a marked item's bare path` runs the real setter.
- **Completeness shape (asked).** Every new `inconclusive` / `incomplete` output keeps a boolean `complete` and
  string-array `missing` / `skipped`. The base object supplies them, and the lstat-error branch passes arrays.
  `emit` exits, so no branch falls through. `stage-verify-core.mjs checkCompleteness` accepts each one.
- **L-eval (P1).** The increment adds no Capability (`apply-plan-deletions.mjs` has no `role:`). Each refusal code is
  reached by a fixture with a control and a closure assertion over `REFUSALS`. The committed `pharn-build.md` line is
  executed under `sh -c`. Gaps are in the minor finding above.
- **L-trust (P2).** PLAN-derived paths are JSON-quoted in every reason and output, and `render-verify` fences
  `undeleted[]` with `quoteData`. Both contracts add `deletions[]` / `undeleted[]` to the untrusted-field lists.
  **No instruction-looking content was found in the reviewed files, and none changed this review's behavior.**
- **L-axis (P3).** Each file has one axis. The only cross-module reference is the minor finding above, inside
  `pharn/floor/`, not a capability-tree sibling reference.
- **CHANGELOG / CONTRIBUTING.** The bump is minor (a new floor CLI), and there is a new `## [6.56.0] - 2026-10-11`
  section directly above 6.55.0. `[Unreleased]` holds nothing, no merged entry is edited, and the README badge and
  the generated inventory (`134`) are regenerated. `check:changelog` and `docs:check` are green inside
  `npm run check`.

## Proposed lesson (candidate only — not written; `/pharn-dev-memory-promote` decides)

- **Candidate:** "A refusal that guards a filesystem action compares the filesystem's identity, not a spelling.
  Lexical normalization (case-fold, NFC) under-approximates what a case-insensitive volume equates (U+017F -> s).
  Re-check the `realpath.native` spelling, or compare `dev`/`ino`, before acting." Provenance: feature
  `plan-declared-deletions`, increment `b22a225`, source this REVIEW's blocking finding, 2026-10-11. P7 trigger: a
  reproduced failure in this increment, not a hypothetical. Check canon for an existing lesson on the hook's
  6.31.1 filesystem-target check before promoting, as a possible duplicate.

## Verdict

**blocked-with-1-floor-finding.** Recommendation: **fix-first**. Re-check `badPath` / `.git` / `isControl` over the
`realpathSync.native` spelling (closes the blocking finding and the important `.pharn/` / `pharn/features/` finding).
Add the volume-gated tests, then re-run verify and review. The minor findings can ride along or be named follow-ups.

## Re-review after fix-first (78adb0d)

This is a focused re-check of `git diff b22a225..78adb0d`, not a full new review.

Floor: `validate.mjs .` is GREEN (37). `node --test` over `apply-plan-deletions.test.mjs` and
`check-build-complete.test.mjs` gives 30/30 pass. The orchestrator reports iteration 3 regress and verify as green;
this re-check did not re-run them.

### Repro and evasions (macOS, APFS case-insensitive)

Each item ran alone, in a fresh scratch project, through the fixed helper.

| Declared `(delete)` path                                      | Exit | Result                                                                      |
| ------------------------------------------------------------- | ---- | --------------------------------------------------------------------------- |
| `LIMITſ.md` (U+017F)                                          | 2    | `control-path`, nothing deleted                                             |
| `.claude/ſettings.json`                                       | 2    | `control-path`, nothing deleted                                             |
| `.PHARN/writes-scope.json`                                    | 2    | `bad-path`, nothing deleted                                                 |
| `PHARN/features/other/SPEC.md`                                | 2    | `bad-path`, nothing deleted                                                 |
| `pharn/featureſ/other/SPEC.md`                                | 2    | `bad-path`, nothing deleted                                                 |
| `.claude/hooKs/protect-trusted-paths.cjs` (U+212A Kelvin)     | 2    | `control-path`, nothing deleted                                             |
| `PHARN/FLOOR/validate.mjs`, `LIMITS.MD`                       | 2    | `control-path`, nothing deleted                                             |
| `pharn/ﬂoor/validate.mjs` (U+FB02 ligature)                   | 2    | `control-path`, nothing deleted                                             |
| `.dev/memory-bank/leſſons-learned.md` (canon)                 | 2    | `control-path`, nothing deleted                                             |
| `LIMITS.md` plus a trailing space (trimmed by `clean`)        | 2    | `control-path`, nothing deleted                                             |
| `./LIMITS.md`, `a/../LIMITS.md`                               | 2    | `bad-path`, nothing deleted                                                 |
| `hardlink-to-limits.md` (a hard link to LIMITS.md)            | 2    | `control-path` (dev/ino), nothing deleted                                   |
| `pharn/CONSTITUTION.md.` (trailing dot)                       | 0    | reported `absent` (a distinct name on APFS), nothing deleted                |
| `café/x.md` (NFD spelling of an NFC directory, ordinary file) | 0    | deleted. Correct: normalization-equivalent and not a control path (control) |

No spelling I tried deleted a control, trusted, `.pharn/` or `pharn/features/` path.

### Per-finding status

- **Blocking (control-path spelling): FIXED.** `bad-path` and `control-path` now also run over the leaf's
  `realpathSync.native` spelling. A failed resolve, or a spelling outside the root, refuses (fail closed). Existing
  exact members are also compared by dev/ino. Volume-gated tests pin the long-s cases.
- **Important (`.pharn/` / `pharn/features/` letter case): FIXED.** The two prefixes are folded, and the on-disk
  spelling check runs as well. New table rows cover each, with controls.
- **Minor (test coverage): FIXED.** Upper-case and mixed-case rows, on-disk long-s cases and a hard-link case were
  added.
- **Minor (one space vs `[ \t]+`): FIXED, by tightening the code.** `DELETE_MARKER_RE` now requires exactly one
  space. Two spaces or a tab is a near-miss and refuses, so it fails closed. The docs, CHANGELOG and tests agree.
- **Minor (P3 import from the reconcile CLI): ADDRESSED AS A STATED BOUND.** The module header, guide and CHANGELOG
  now name it, with the follow-up `apply-deletions-core-extract`. It is not extracted, which is acceptable as a named
  follow-up.
- **Minor (TOCTOU): ADDRESSED AS A STATED BOUND.** The header, the `pharn-build.md` claims bullet ("check-then-act
  gap"), the guide and the CHANGELOG name it under the non-adversarial model.
- **Minor (marker after the description): FIXED as a stated bound.** The core header, `pharn-plan.md` and the
  CHANGELOG state it, and a `check-build-complete.test.mjs` row pins it.

### P0 prose

The `pharn-build.md` "Floor:" bullet now reads "judged as written and on disk … (regex + membership +
`lstat`/`realpath`)", carries a NARROWED clause naming the check-then-act gap, and keeps "nothing else deletes" as
advisory. `pharn-plan.md` and the CHANGELOG now say "Refused, and not deleted" with the on-disk qualification. The
module header bounds the identity to "the volume as it stands" and to platforms whose realpath returns the stored
spelling. I found no remaining unqualified "never deleted".

### New defects from the fixes

None found. One observation, not a finding: the dev/ino rule also refuses deleting an ordinary file that happens to be
a hard link to a trusted or guard file. That is conservative and fails closed.

### Re-review verdict

**GREEN: 0 floor findings outstanding.** Recommendation: **merge**. The follow-up `apply-deletions-core-extract` stays
named.
