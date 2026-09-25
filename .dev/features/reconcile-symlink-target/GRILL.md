# GRILL — reconcile-symlink-target

**Header.**

- Plan: `.dev/features/reconcile-symlink-target/PLAN.md` (as amended with the GATE-1 notes).
- Spec-hash check: **MATCH** (`4950796f…c7f` recomputed with `.dev/floor/hash-doc.mjs` = the plan's pin).
- **Step 1b lessons-declaration verdict (FLOOR): GREEN.** `check-plan-lessons.mjs` exited 0. All 8 cited ids (L59, L54,
  L51, L36, L34, L37, L1, L57) resolve in canon and are referenced in the plan body. This covers the declaration only.
  It never says whether the lessons were applied.

Grillers discovered: 13 (`count-grillers.mjs`). The deterministic plan scanners reported nothing:

- `scan-plan-secrets`: `{"found":false}`
- `scan-plan-pii`: `{"found":false}`
- `scan-plan-i18n`: `{"found":false}`
- `scan-plan-migrations`: `{"mentions":false}`
- `scan-plan-observability`: `{"mentions":false}`

Applied inline: performance, testability, security and documentation. The other nine raised nothing: a11y, architecture,
comprehension, coupling, error-handling, i18n, migrations, observability and privacy. The change is one hashing
function's classification, two consumers' reason strings, tests, and contract text. It touches no UI, no network, no
user data and no schema key. The baseline `version` question (a migrations-shaped concern) was decided at GATE 1
(stays `1`, stated and tested).

## Findings

### Performance (griller: performance)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/reconcile-symlink-target/PLAN.md:47"
  problem: "Readlink-FIRST makes every regular file throw EINVAL. Measured, classification only, over this repo's 2220 reconciled paths (5 runs, median): 49.6 ms readlink-first vs 35.7 ms no-follow-open-first. That is +~14 ms per fingerprint, and the runner takes two per gate. The plan re-measures nothing, but the fingerprint header's bound ('1925 paths, ~463 ms cold, ~75-85 ms warm') was measured on the old implementation (L24), and its path count is already stale (2220 today)."
  evidence: '1. `readlinkSync(abs, { encoding: "buffer" })` FIRST (L59: ask the link itself before any follow-call).'
```

Recommendation: open with `O_RDONLY | O_NOFOLLOW | O_NONBLOCK` FIRST, and ask `readlink` only after that open fails.
L59 still holds, because a no-follow open never answers for a link's target: on a link it fails (`ELOOP`, measured on
darwin this run). A regular file then never depends on `readlink`'s `EINVAL` semantics, which also removes a platform
dependency. The ordered closure pin becomes `["openSync(abs", "readlinkSync(abs"]` plus the `O_NOFOLLOW` pin. Stated
bound: where `O_NOFOLLOW` is absent (`?? 0`), the open follows the link and a link→file hashes by target bytes, the
pre-6.20.5 rule. Then re-measure the fingerprint and restate the dated bound in its header and in `gate-run-record.md`,
which carries the same numbers.

### Testability (griller: testability)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/reconcile-symlink-target/PLAN.md:134"
  problem: "The plan says agreement with the live guard is verified by EXECUTING the copied real hooks in the end-to-end fixture. For an EXPLICIT scope, check-bash-reconcile.mjs never executes enforce-writes-scope.cjs: it uses its own duplicated matcher, and runs the hooks only for protect-trusted-paths and the fail-closed default. As planned, the ★ test verifies the reconciler's verdict only. The guard half rests on a plan-time probe that is not in the suite."
  evidence: 'L37 — the claim "the reconciler now agrees with the live guard" is verified by EXECUTING the copied real hooks in the end-to-end fixture (the suite''s `makeRepo` copies them)'
```

Recommendation: in the ★ `CLAUDE.md -> AGENTS.md` test, spawn the fixture's own `enforce-writes-scope.cjs` under the
same scope, in the ✧ PARITY test's shape (`cwd: dir`). Assert a Write to `CLAUDE.md` exits 0 and a Write to `AGENTS.md`
exits 0. Add the control: a Write to `OTHER.md` exits 2. Then assert the reconciler agrees on the edit-through case.

### Security (griller: security)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/reconcile-symlink-target/PLAN.md:52"
  problem: "The race sentence reads as if nothing is followed. O_NOFOLLOW covers the FINAL path component only. If an ancestor directory is swapped for a symlink after enumeration, both readlink and open still follow it. That hazard predates this change and does not grow, but the comment and contract should say 'final component'."
  evidence: "A name swapped to a symlink between step 1 and step 2 makes the no-follow open fail → `null` → a candidate: the race resolves fail-closed, never to another file's bytes"
```

### Documentation / honesty (griller: documentation)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/reconcile-symlink-target/PLAN.md:112"
  problem: "After the fix, a RE-POINTED link that no recorded scope names still gets the checker's one uniform sentence: 'the write guards would have DENIED a write to it (writes-scope (snapshot))'. For a link re-pointed to an IN-scope target, the live guard would ALLOW a Write to that path, because it resolves through the link. So the sentence is false in that case. It is the same class of untrue text the review finding named, narrowed to re-points. The plan covers it only as a contract bound. Nothing pins the sentence (grepped this run), so the reworded text would be cheap if chosen."
  evidence: "A RE-POINTED link is judged under the link's own path: the scope must name the link path itself. The guards cannot see a re-point at all (a Write writes through the link), so the reconciler's finding for it describes the recorded scope, not a guard decision — stated in the contract."
```

Recommendation (minimum): state this residual in the contract AND in the CHANGELOG entry, not only in the contract.
Rewording the finding text is optional and changes a shipped output string.

## Summary

The design addresses the root cause, and the upgrade analysis holds up. Every fingerprint consumer compares `algo`, so
a pre-upgrade stamp is refused even on a link-free tree where the digests are equal. The plan lists all four consumers
and their reason strings. Three concerns are worth acting on before or during the build:

- the classification order costs a measurable ~14 ms per fingerprint and leans on `readlink`'s errno for every file;
  open-first avoids both and still honours L59;
- the ★ end-to-end test should execute the guard itself, so "agrees with the guard" is proven inside the suite and not
  only by a plan-time probe (L37);
- the re-point sentence should be disclosed where a reader of the CHANGELOG will see it.

The security note is wording only.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 3 important, 1 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and is not part of this tally.
