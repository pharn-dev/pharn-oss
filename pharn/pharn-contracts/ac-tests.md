---
name: ac-tests
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for a feature's Acceptance-Criteria tests written BEFORE the build: the AC-TESTS.md mapping /pharn-plan writes and /pharn-test is scoped by, the rules pharn/floor/check-ac-tests.mjs enforces over it, and the AC-TESTS.lock.json pharn/floor/ac-tests-lock.mjs writes to pin the tests. Schema only, zero behavior (P3, pharn/ARCHITECTURE.md §4)."
---

# Contract — ac-tests

> A `pharn-contracts` schema (zero behavior, no `role:` — it is not a Capability). Enforcers **cite** it and
> **conform** to it; they do not restate its semantics (P4).

## Why it exists

Acceptance Criteria are phrased testably (`spec-template.md`, the AC grammar), but if the build writes their tests
it can write tests that fit its own implementation. So the tests are written **before** the build, by `/pharn-test`,
from the Approved SPEC, the PLAN and a mapping, and the build may not modify them. This contract defines that
mapping and the lock that pins the result.

**Honest trigger (P7):** the maintainer's decision (the AC-delivery queue), not a dogfood failure. In 6.17.0 the stage
runs standalone: `/pharn-ship` and `/pharn-loop` do not call it, and nothing runs the tests it writes.

## `pharn/features/<name>/AC-TESTS.md` — the mapping

Written by `/pharn-plan` (Step 4c) for a SPEC that carries `spec_template`. A legacy SPEC has no AC ids and gets no
mapping.

```markdown
---
spec_id: <name>
spec_content_hash: <the SPEC's pinned hash — the same value PLAN.md carries>
---

## Files

- `tests/ac/reset.unit.test.ts` — the tests for AC-1

## Mapping

- AC-1 | unit | `tests/ac/reset.unit.test.ts` | src/reset.ts#resetPassword(token: string): Promise<void>
```

- **Frontmatter:** `spec_id` and `spec_content_hash`, exactly the fields `check-plan-spec-agree.mjs` reads, so the
  mapping is bound to the current Approved SPEC by the same checker that binds PLAN.md.
- **`## Files`:** exactly the test files, one back-tick path per list item. It is `/pharn-test`'s writes-scope
  (`set-writes-scope.cjs --from-plan AC-TESTS.md`), read by the same `## Files` rule as a PLAN
  (`plan-files-core.mjs`, held to the setter by a parity test).
- **`## Mapping`:** one line per AC, matching

  ```text
  ^- (AC-[1-9][0-9]*) \| (unit|integration|e2e) \| `([^`\s][^`]*)` \| (\S.*)$
  ```

  The id and level come from the SPEC; the file is a `## Files` entry. The **public target** is the interface the
  test drives: a URL plus a visible role or text for `e2e`, a route plus method for `integration`, a module path,
  export and signature for `unit`. A unit test written first needs that interface decided before the build, which
  is why the target is the plan's job. The floor checks the target only for presence.

**Why a separate file:** the setter reads a file's first `## Files`, so the test files cannot live in PLAN.md
without joining the build's scope, and a second extractor would mean editing a protected hook.

## The checker — `check-ac-tests.mjs <AC-TESTS.md> <SPEC.md> <PLAN.md> [--features-dir <dir>]`

| kind                | RED when                                                                                                       |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| `legacy-spec`       | the SPEC has no `spec_template` (exit **3**, checked first)                                                    |
| `pin`               | `check-plan-spec-agree.mjs <AC-TESTS.md> <SPEC.md>` is non-zero (Draft, drifted, stale or mislabeled)          |
| `malformed-line`    | a non-blank line under `## Mapping` does not match, or there is no `## Mapping`                                |
| `missing-ac`        | a SPEC AC has no mapping line, or the SPEC's Acceptance Criteria section is absent or duplicated               |
| `duplicate-ac`      | an AC has more than one mapping line                                                                           |
| `unknown-ac`        | a mapped id is not a SPEC AC                                                                                   |
| `level-mismatch`    | a mapped level differs from the SPEC's `verify:` level                                                         |
| `unlisted-file`     | a mapped file is not in `## Files`                                                                             |
| `unmapped-file`     | a `## Files` entry is mapped by no line                                                                        |
| `in-plan-files`     | a test file is in PLAN.md `## Files`, so the build would be scoped to it                                       |
| `claimed-elsewhere` | another feature's AC-TESTS.md `## Files` already names the file                                                |
| `no-files`          | there is no `## Files`, or it names nothing                                                                    |
| `bad-path`          | a `## Files` entry is a placeholder or glob, absolute, not normalized, or under `.pharn/` or `pharn/features/` |

Exit **0** GREEN · **1** RED (every kind; a `legacy-spec` here means a mapping exists for a SPEC whose
`spec_template` was removed — it sits outside the body hash, so the pin cannot see it) · **2** unusable input (a
named file absent or unreadable, a `--features-dir` that is not a directory, bad usage).

`check-ac-tests.mjs --spec <SPEC.md>` decides **before any mapping exists** whether a SPEC has AC ids: **0**
templated (prints the ids and levels), **3** legacy, **2** unusable. `/pharn-plan` and `/pharn-test` branch on it.

**Paths are compared as the writes-scope setter scopes them:** each `## Files` entry of AC-TESTS.md, PLAN.md and
every other feature goes through the setter's `clean` (a trailing `(…)` annotation is stripped) and `isConcrete`,
and the comparison is case-folded, because APFS is case-insensitive. A PLAN entry `tests/ac/a.test.js (gated)` or
`Tests/ac/a.test.js` is therefore `in-plan-files`. A second `## Mapping` section is `malformed-line`.
AC ids and levels are read by `specAcceptanceCriteria()` in `spec-template-core.mjs`, through the same item parser
`check-spec.mjs` checks with.

## `pharn/features/<name>/AC-TESTS.lock.json` — the lock

Written by `ac-tests-lock.mjs --write <name>` at the end of `/pharn-test`, checked by `--check <name>`. Every digest
is computed by the script.

```json
{
  "schema": "ac-tests-lock/1",
  "feature": "<name>",
  "spec": { "spec_id": "<name>", "spec_content_hash": "<sha256>" },
  "mapping": { "path": "pharn/features/<name>/AC-TESTS.md", "sha256": "<sha256>" },
  "files": [{ "path": "tests/ac/reset.unit.test.ts", "sha256": "<sha256>" }],
  "red_run": null,
  "test_infra": null
}
```

- The key set is **closed at every level** (top, `spec`, `mapping`, each `files` entry), `files` is unique and
  sorted, and under `ac-tests-lock/1` `red_run` and `test_infra` must be `null` (the stage that fills one bumps the
  schema). A lock that breaks any of this is unusable (exit 2), never a verdict.
- `files` is sorted by path and names every `## Files` entry. Each must be a regular file, and so must AC-TESTS.md: a
  missing file or a symlink refuses the write. Test-file paths resolve against the current directory (the project
  root); the mapping path is compared by its real location, never as spelled.
- `red_run` and `test_infra` are **reserved named sections** that later stages fill: evidence that the tests failed
  before the build, and a pin of the test infrastructure. `--write` always resets both to `null`, because a rewrite
  means the tests changed and any evidence about the old ones is stale.
- `--check` REDs, naming the path and never the content, when AC-TESTS.md changed, a test file changed, went
  missing or stopped being a regular file, a `## Files` entry was added or dropped, or the spec pin changed.

## Artifacts, regress and reconcile

`AC-TESTS.md` and `AC-TESTS.lock.json` are pipeline artifacts (`check-regress.mjs` `PIPELINE_ARTIFACTS`), so
`/pharn-regress` does not report them as build escapes; `/pharn-regress` also declares AC-TESTS.md's `## Files`
alongside PLAN.md's, because those test files are `/pharn-test`'s writes.

For **reconcile** the two differ, deliberately. `AC-TESTS.md` is exempt, like `PLAN.md`: it is a plan file, and a
re-plan after `/pharn-build`'s anchor legitimately rewrites it. The **lock** is not exempt
(`reconcile-ignore.json` `pre_anchor_artifacts`): it pins the tests, and nothing changes it after the anchor, so a
build-window change to it, or to an AC test file, stays visible to `/pharn-verify`'s reconcile gate. A re-plan that
leaves the lock stale is caught by `ac-tests-lock.mjs --check`.

## What it proves, and what it does not (P0)

- **Floor:** the mapping is complete and consistent with the current Approved SPEC (enum/regex/set membership, and
  content-hash through the shelled chain check); `/pharn-test` can write only the mapped files, and the build's
  scope excludes them (the fix #7 hook); the lock pins the files as written (content-hash).
- **Bounded:** the build exclusion holds for the PLAN.md the checker read. An edit to PLAN.md after `/pharn-test`
  reopens it until something re-checks; `/pharn-build` does not re-check in 6.17.0. A Bash write bypasses every
  write hook (`LIMITS.md §6`), and `/pharn-test` runs before the reconcile anchor, so its own Bash writes are not
  reconciled.
- **Advisory:** that the tests are right, assert the AC's Then, or drive a good public target; that `/pharn-test`
  read only SPEC, PLAN and AC-TESTS.md (`reads:` is not enforced). The lock certifies that the files are the ones
  it recorded, never who wrote them: a self-consistent rewrite of tests and lock passes.
- `/pharn-test` can write **only** mapped test files. A shared helper or fixture lives inside one of them or is
  written by the build.
- **A mapped test file is assumed NEW.** Nothing checks that it did not already exist: an existing project test
  mapped here would be rewritten by `/pharn-test`, and `/pharn-regress`, which declares AC-TESTS.md's files, would
  treat it as the feature's own and drop it from the regression comparison. `/pharn-plan` is told to map only new
  files. That is a stated bound, not a check (no run has failed on it — P7).
