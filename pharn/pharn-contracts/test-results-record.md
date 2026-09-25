---
name: test-results-record
trust: trusted
layer: pharn-contracts
purpose: "Single source of truth for the per-test record: how a project opts in, where its test run writes a machine-readable results file, how pharn/floor/test-results-core.mjs derives {test-id → passed | failed | skipped} from it, and the closed reasons it refuses with. Schema only, zero behavior (P3, pharn/ARCHITECTURE.md §4)."
---

# Contract — test-results-record

> A `pharn-contracts` schema (zero behavior, no `role:` — it is not a Capability). Enforcers **cite** it and
> **conform** to it; they do not restate its semantics (P4). The stamp it binds to is
> `gate-run-record.md`'s; the principles live in `pharn/CONSTITUTION.md`.

## Why it exists

The floor sees only whole-gate exit codes. It cannot say whether one named test ran and passed: a suite exits
0 with `it.skip("AC-1: …")`. The per-test record is the deterministic view that closes that gap, derived by
tested code from a file the project's own test run writes, never typed by a model and never parsed from human
log output.

**Honest trigger (P7).** No dogfood run failed on this. It was built at the maintainer's direction, for a gap
demonstrable on any project. In 6.15.0 no stage read the record. Since 6.18.0 `/pharn-test`'s red run reads it
(`check-red-run.mjs`, `ac-tests.md`), where a refused record is a RED by its own reason; since 6.20.0 `/pharn-verify`'s
AC gate reads it too (`check-verify.mjs --ac-gate`, `ac-tests.md` "The AC gate"), so a verify verdict computed with
that flag depends on the record — a refused one is `INCONCLUSIVE` over otherwise-green gates. The regress verdict,
and a verify verdict computed without the flag, are unchanged for every stamp the runner writes; what also changed
is that a stamp carrying a malformed `results_sha256` is refused (`gate-run-record.md`, "Per-test results"), and the
runner refuses to run a gate whose results path it cannot clear.

## Opting in

A project names the reporter format for each gate in `pharn.config.json`:

```json
{ "testResults": { "test": "vitest-json" } }
```

- **Keys** are gate ids from a closed set, `RESULTS_GATES`: `test`, plus the e2e gates `test:e2e` and `e2e`
  (6.16.0, `E2E_SET` in `gate-run-core.mjs`). A key outside it makes the whole block `config-invalid`. An e2e
  gate is discovered at `/pharn-verify` only, so its record exists on a verify stamp — or on a regress stamp only
  when the caller named the gate in an explicit `--gates` string (never read there).
- **Values** name only the format, from a closed set, `RESULTS_FORMATS`:

| format            | producer                                  | notes                                              |
| ----------------- | ----------------------------------------- | -------------------------------------------------- |
| `jest-json`       | Jest's built-in `--json --outputFile=<f>` | the shape vitest's `json` reporter copies (6.22.0) |
| `pharn-json`      | any runner, through a reporter you write  | PHARN's own schema, below (6.22.0)                 |
| `playwright-json` | Playwright's built-in `json` reporter     | multi-project runs supported                       |
| `vitest-json`     | vitest's built-in `json` reporter         | Jest's `--json` shape, which vitest emits          |

Each reporter format ships with its test runner, so no extra dependency is installed. Each reporter adapter was
checked against reports captured from the real reporter: vitest 5.0.1, `@playwright/test` 1.63.0, and Jest 30.5.2
and 29.7.0. No other version is claimed. `pharn-json` is the framework-neutral route: PHARN defines it, so it does
not change when a runner does, and any runner can emit it.

**A Jest project uses `jest-json`, not `vitest-json`.** Jest's report is the shape vitest copies, so `vitest-json`
also parses it, as it did before 6.22.0. But `vitest-json` reads neither `invocations` nor `failing`, so under it a
Jest pass on a retry and a Jest `test.failing` both read `passed`. Refusing a Jest report under `vitest-json` would
change the verdict for any project already configured that way, so it is left to the named follow-up
`vitest-json-refuses-jest-shape`.

Three things to know about the Jest format:

- **The script needs a POSIX shell.** Jest has no config option for its JSON report, so the flags go in the `test`
  script (README, "Per-test results"). That `${…:+…}` form needs a POSIX shell.
- **File arguments are patterns.** Jest reads the file arguments PHARN passes (`--stage ac-test` hands each gate its
  mapped files) as path patterns, not exact paths. So a similarly named test file can run too, and its tests enter
  the record, where a flaky or duplicate one voids it. `--runTestsByPath` is Jest's exact-path mode.
- **`invocations` is required.** Both measured versions write it on every test; a report without it is refused.

Two neutral formats were weighed and not chosen (measured 2026-09-25):

- **CTRF**'s schema is still pre-1.0, and its reporters are 0.0.x third-party packages.
- **JUnit XML** is not one format. `jest-junit` drops a file that fails to load (unless its
  `reportTestSuiteErrors` option is set) and reports `test.todo` as a pass, and producers disagree on where the
  file and the test's own title go. Reading it would also need an XML
  parser in a floor that is JSON-only.

**The config is not guarded.** No hook protects `pharn.config.json`, so a build can switch the record off or
change the format. Treat a change to this block like a change to the test script.

## Where the file lives, and how the project learns it

The runner (`run-gates.mjs`) spawns **every** gate with one extra environment variable:

- **`PHARN_TEST_RESULTS`** — the absolute path `<out>/<seq>-<id>.test-results.json`, where `<out>` is the
  stage's runner directory under `.pharn/` (for example `.pharn/pharn-verify/gates`). Same name for every
  gate, a different value per gate, so a later gate cannot overwrite an earlier gate's file.

The project's reporter config reads the variable. PHARN chooses the path; the project never names one. That
keeps every write and delete inside the runner's own state root, lets `init`'s wipe of `<out>` clear every
earlier run's file (runner behaviour pinned by tests, not a floor primitive), and keeps the file out of the
worktree fingerprint (`.pharn/` is excluded), so writing it never marks a gate as having mutated the tree.

Before a gate runs, the runner removes whatever is at that path (a file, a symlink without following it, or a
directory); `init`'s wipe does not cover an entry re-run after a stale lock. A path it still cannot remove is a
runner refusal (`path-containment`). After the gate, the runner records `results_sha256` on the gate's `runs[]` entry: the sha256 of a
regular file at the path, else `null`. The file is read through a descriptor opened without following a link
or blocking (`O_NOFOLLOW | O_NONBLOCK`) and checked with `fstat`, so a symlink, FIFO or device yields `null`.
Both behaviours are runner code pinned by tests, not a floor primitive.

## The record

`testRecord({ stamp, outDir, gateId, root })` in `test-results-core.mjs`. All four inputs are required;
`root` is the directory the gate ran in, because a finalized stamp does not record it, and it is where
`pharn.config.json` is read. The result is either a record:

```json
{
  "ok": true,
  "gate": "test",
  "format": "vitest-json",
  "results_sha256": "<sha256>",
  "exit": 1,
  "counts": { "passed": 2, "failed": 1, "skipped": 2 },
  "suite_errors": 0,
  "tests": [
    {
      "id": "tests/math.test.js::checkout › totals › AC-2: sums line items",
      "file": "tests/math.test.js",
      "title": "AC-2: sums line items",
      "status": "passed"
    }
  ]
}
```

or a refusal `{ "ok": false, "reason_code": "<member of RECORD_REASONS>", "reason": "<text>" }`.

- **`id`** is `<file>::<title path joined by " › ">`. For vitest and Jest the path is the `describe` titles and
  the test title. For Playwright it is the project name, then the `describe` titles, then the test title: a
  multi-project run reports the same test once per project, and the project keeps the ids unique. For
  `pharn-json` it is the document's own `path`. Empty titles are dropped (`pharn-json` refuses them instead).
- **`file`** is the reporter's path made relative to `root` when it is absolute and under `root`. Playwright's
  path is first resolved against its `config.rootDir`; a resolved path outside `root` is kept absolute. A
  relative path the reporter gives, including every Playwright path when the report has no absolute
  `config.rootDir`, is kept exactly as given. A `pharn-json` path must be absolute or a clean relative POSIX
  path (below).
- **`title`** is the test's own leaf title, so a consumer can match a prefix such as `AC-1:` without a
  `describe` wrapper getting in the way.
- **`status`** is one of `passed`, `failed`, `skipped`:

| format            | → passed                                 | → failed     | → skipped                    |
| ----------------- | ---------------------------------------- | ------------ | ---------------------------- |
| `vitest-json`     | `passed`                                 | `failed`     | `skipped`, `pending`, `todo` |
| `jest-json`       | `passed`                                 | `failed`     | `skipped`, `pending`, `todo` |
| `playwright-json` | `expected` with `expectedStatus: passed` | `unexpected` | `skipped`                    |
| `pharn-json`      | `passed`                                 | `failed`     | `skipped`                    |

Anything else is `unknown-status`, including a flaky test or an expected failure that the report marks:

- **Playwright** — `flaky` (a pass only on a retry), and an expected failure (`test.fail()`, reported
  `expected` with `expectedStatus: failed`).
- **Jest** — a `passed` test with `invocations` above 1 (it passed only on a retry), and a `passed` test with
  `failing: true` (a `test.failing` whose body failed, as declared).

Neither is a plain pass nor a plain fail. A `test.failing` whose body passed is reported `failed`, and is a failed
test, as Playwright's `unexpected` is. A Jest report must carry `invocations` on every test, as both measured
versions do; a report without it is `results-malformed`, whatever produced it.

**What a report does not mark, it cannot refuse.** These were measured on real runs, and each is pinned by a test
over its capture:

- vitest 5.0.1 reports `test.fails` and a pass on retry as a plain `passed`;
- Jest 29.7.0 has no `failing` field, so a `test.failing` reads as its raw status (its retries are marked).

In these cases the record says `passed`. A `pharn-json` producer is responsible for not reporting either case as a
plain pass.

- **`suite_errors`** counts failures no test owns: a vitest or Jest file that failed with no failed test
  (typically a file that could not be imported), each entry of Playwright's top-level `errors[]`, and
  `pharn-json`'s own `suite_errors`. Their messages are not read.
- **`tests`** is sorted by `id`. It may be **empty**: an `ok` record with zero tests is a run that ran none, and
  a consumer that needs tests must check for them itself.

## The neutral format (`pharn-json`)

A document PHARN defines, so a runner with no built-in format PHARN reads can still produce a per-test record.
Your reporter writes it to `PHARN_TEST_RESULTS`, and `pharn.config.json` names it like any other format
(`{ "testResults": { "test": "pharn-json" } }`). A minimal document:

```json
{
  "schema": "pharn-test-results/1",
  "suite_errors": 0,
  "tests": [
    { "file": "tests/cart.test.js", "path": ["checkout", "AC-1: sums line items"], "status": "passed" },
    { "file": "tests/cart.test.js", "path": ["AC-2: rejects an empty cart"], "status": "failed" }
  ]
}
```

The rules are strict, and each violation is `results-malformed` unless noted:

- **Keys.** The document has exactly the keys `schema`, `suite_errors` and `tests`. Each test has exactly `file`,
  `path` and `status`. An extra key, including `__proto__`, and a missing key are both refused.
- **`schema`** is exactly `pharn-test-results/1`. A later version will be a new format name, never a new meaning
  for this one.
- **`suite_errors`** is a non-negative integer and is required: a file that failed to load, or any failure no test
  owns, is counted here. A producer cannot leave it out.
- **`file`** is an absolute path, or a clean relative POSIX path: no `.`, `..` or empty segment, no backslash. An
  absolute path under the gate's root is made relative, as for the other formats. A `./tests/a.test.js` is refused
  by name, because it could never equal a mapped path.
- **`path`** is a non-empty array of non-empty strings, the `describe` titles first and the test's own title last.
  The last element is the record's `title`.
- **`status`** is `passed`, `failed` or `skipped`, and nothing else. Any other string is `unknown-status`, never
  mapped.

`tests: []` is a valid document: a run that ran nothing. "passed" is the producer's word, exactly as for a
built-in reporter.

## The closed reasons

A refusal voids the **whole** record; there is no partial list.

| reason_code                  | when                                                                                                                                                                          |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `stamp-invalid`              | `validateStamp` refuses the stamp                                                                                                                                             |
| `gate-absent`                | the stamp has no run with that gate id                                                                                                                                        |
| `not-configured`             | no `pharn.config.json`, no `testResults` key, or the gate is not named                                                                                                        |
| `config-invalid`             | the config or the block is malformed, names a gate outside `RESULTS_GATES`, or a format outside `RESULTS_FORMATS`                                                             |
| `results-unavailable`        | the gate timed out, the stamp predates the field, the gate wrote no file or did not run, or — despite a recorded hash — the file is absent, unopenable, or not a regular file |
| `results-hash-mismatch`      | the file no longer hashes to `results_sha256`                                                                                                                                 |
| `results-malformed`          | the file is not JSON, or not the format's shape (for Jest, a test without `invocations`; for `pharn-json`, any rule above)                                                    |
| `over-cap`                   | over 32 MiB, over 100 000 tests, a test id over 4 096 UTF-16 code units, or Playwright `describe` nesting deeper than 256                                                     |
| `unknown-status`             | a status outside the table above                                                                                                                                              |
| `duplicate-test-id`          | two tests share an id (for example a title containing `" › "` that collides with a nested one)                                                                                |
| `results-exit-contradiction` | the gate exited 0 but the file reports a failed test or a suite error                                                                                                         |

The converse — a non-zero exit with every test passed — is **not** a contradiction: a coverage threshold, a
type check or a lint step inside the `test` script can fail the script with every test green, and the gate
already fails on its exit code.

## Trust (P2)

The results file is written by project code, so it is **untrusted data**, and so is everything the record
copies out of it: `tests[].id`, `tests[].file`, `tests[].title`, and every refusal `reason`. Only `status`,
`counts`, `suite_errors`, `exit`, `gate`, `format`, `results_sha256` and `reason_code` are drawn from closed sets
or computed by PHARN. A consumer that shows a title or a reason to a model must fence it as quoted data, never
pass it as an instruction. A raw value quoted inside a `reason` is cut to 64 characters.

## What it proves, and what it does not (P0)

- **Floor:** the record is derived from the exact bytes the runner hashed (content-hash), through a closed
  status map and closed reasons (enum/regex). No model types any of it.
- **Not provenance.** The hash certifies that the file is the one the runner saw, never that its contents are
  true. The `test` script and the reporter config are project code a build can edit, so a forged file is
  possible. `results-exit-contradiction` narrows that and does not close it. "passed" means the project's
  reporter said so; PHARN does not re-run or re-judge a test. Since 6.20.0 the lock's test-infrastructure pin
  (`ac-tests.md`, "The test-infrastructure pin") narrows it further for the AC gate. It covers the level gates'
  scripts, their `testResults` formats and the root runner configs, and not a `jest` key inside `package.json`.
  That pin's full list of what it does not catch is in that section.
- **An unmarked expected failure or retry reads as a pass.** See "What a report does not mark", above.
- **A live referent.** A detached process started by the gate can still write the file after the runner hashed
  it. The record never follows such a write: it is refused as `results-hash-mismatch`.
- **Regress records are partial, and unread.** On `/pharn-regress`'s sides the `test` gate receives only the
  test files outside the feature, so its record covers only those. The base commit may predate the reporter
  setup. No consumer reads a regress record, and a base-side `results-unavailable` can never affect regress.
- **Only the configured gates mean anything.** `results_sha256` is recorded on every run; on a gate outside
  `RESULTS_GATES` it is never read.
