# PLAN — parsed-cli-sentinel

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L29, L35, L47, L60, L75]
- increment: The named follow-up of 6.67.1 (#367, audit TST-5). Three more floor CLIs whose stdout a floor caller
  JSON-parses still end with an immediate `process.exit(...)` after printing: `count-grillers.mjs`
  (griller-extract.mjs), `count-lenses.mjs` (render-review-assignments.mjs, check-review-assignments.mjs) and
  `check-model-config.mjs` (stage-agent-core.mjs, `resolve`). Convert them to the "main" form
  (`process.exitCode = main();`), add their rows to `cli-stdout-flush.test.mjs`'s FLUSH_CLIS (static pin, crash test,
  > 64 KiB pipe round-trip each), and move their names out of the header's "NOT EVERY PARSED CLI IS HERE" paragraph.
  > Exit codes and output bytes unchanged. Two dev-only extras: a stale guide sentence and a lesson-correction
  > candidate for the maintainer. Patch bump to 6.71.1 (renumbered at PR time against `origin/main`).
- layer(s): product floor (`pharn/floor/`), build apparatus (`.dev/guides/`, `.dev/features/`), repo meta
- constitution_refs: [P0, P5, P6, P7]
- mode: LIGHT (batch 2026-10-19 follow-ups, branch `fix/parsed-cli-sentinel`) — no stage commands.

## The triggering failure (P7)

The 6.67.1 increment measured the truncation on darwin (piped stdout asynchronous: a document past 65,536 bytes is
cut at an immediate exit) and named these three, openly, as parsed CLIs still outside the set. Re-read live at
`dd69efd5` (6.71.0):

| CLI                      | ending today                                                                             | floor caller that `JSON.parse`s its stdout                          |
| ------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `count-grillers.mjs`     | top-level script; `fail()` → `process.exit(1)` (:46); `process.stdout.write` + `exit(0)` | griller-extract.mjs:306                                             |
| `count-lenses.mjs`       | top-level script; `fail()` → `process.exit(1)` (:44); `process.stdout.write` + `exit(0)` | render-review-assignments.mjs:166, check-review-assignments.mjs:424 |
| `check-model-config.mjs` | `process.exit(main())` (:440); `resolve` prints with `process.stdout.write` (:306)       | stage-agent-core.mjs:406 (`resolve`, through stage-agent.mjs)       |

Every caller fails closed on an unparseable document, so the old ending is a false refusal on darwin, never a false
pass. The documents are bounded by what is installed (griller/lens paths) or by the config (`resolve`'s model string,
which `MODEL_ID_RE` does not bound in length), so the case is rare — the fix is for parity with the set, as named.

## Fix

- **`count-grillers.mjs`, `count-lenses.mjs`** — exactly the 6.67.1 `count-verifiers.mjs` diff: `fail()` writes its
  stderr line and returns 1; the target guard, walk and print move into `main()` returning the exit code; the file
  ends with the FLUSH RULE comment and `process.exitCode = main();`. `frontmatterRole`, `walk`, `isExcluded`, the
  imports and the header stay byte-identical.
- **`check-model-config.mjs`** — already has `main()` returning a code; only the last line changes, plus the FLUSH
  RULE comment naming its caller.
- **`cli-stdout-flush.test.mjs`** — three rows, form "main", `print: "write"`:
  count-grillers / count-lenses with `crashArgs: [SCAN_FIXTURE_DIR]` (the count-verifiers row's shape: a directory
  whose walk prints `{"registered":0,…}` at exit 0); check-model-config with `crashArgs: ["resolve", "plan",
"--config", <fixture config>]`, because `resolve` is the parsed path and its first print is
  `process.stdout.write` (the validate/agreement paths print with `console.log`, which the caller does not parse).
  Three ★ >64 KiB round-trips: 800 griller files / 800 lens files under long names (the count-verifiers recipe), and
  a `resolve` over a config whose `default.model` is `claude-` + 70,000 letters (valid under `MODEL_ID_RE`, which is
  a namespace bound with no length cap). The header's SET paragraph names the three with their callers; the
  "NOT EVERY PARSED CLI IS HERE" paragraph drops their names and keeps an OPEN form (L47) with the sweep it rests on.
- **`route-token-core.test.mjs`** — one stale comment ("it runs `process.exit(main())` at import") updated to the new
  ending; the parity regex and assertions are untouched.
- **`.dev/guides/floor-gates.md`** — the 6.67.1 paragraph in the stamp-surface section gains one sentence naming the
  three (as #367 did for its seven).
- **`.dev/guides/floor-orchestration.md`** (~:146) — "lstat-regular" → the O_NOFOLLOW single-descriptor read
  `check-loop-decision.mjs` `markerCap` has used since 6.65.0 (opened `O_RDONLY|O_NOFOLLOW|O_NONBLOCK`, `fstat`
  regular-file check, read through the same descriptor).
- **`.dev/features/parsed-cli-sentinel/LESSON-CANDIDATE.md`** — the L31/L35 correction, NOT applied: the exact
  proposed entry and provenance fields for the maintainer's accept/deny through `/pharn-dev-memory-promote`, plus the
  alternative in-place annotation path the promote command's "standing division" names. Canon is not edited here.

## Caller sweep (L75 — each hit with a disposition)

`grep -n 'JSON.parse(.*stdout'` (and `JSON.parse(out`) over non-test `pharn/floor/*.mjs`, `.dev/floor/*.mjs`,
`.claude/hooks/*.cjs` at `dd69efd5`:

- build-gate.mjs:181, stage-runtime.mjs:274, stage-verify.mjs:356, stage-regress.mjs:761/:1048, entry-gates.mjs
  parseJson → run-gates — in the set since 6.67.1.
- check-loop-decision.mjs:299 → check-loop — in the set since 6.20.4.
- loop-fresh-core.mjs:592, stage-regress.mjs:1133 → check-verify / check-regress — in the set since 6.20.4.
- stage-verify.mjs:293 → count-verifiers; grill-scan.mjs:167 → scan-plan-* — in the set since 6.67.1.
- render-review-assignments.mjs:429 → scan-code-* — in the set (derived rows).
- griller-extract.mjs:306 → count-grillers — **this increment**.
- render-review-assignments.mjs:166, check-review-assignments.mjs:424 → count-lenses — **this increment**.
- stage-agent-core.mjs:406 → check-model-config `resolve` — **this increment**.
- stage-regress.mjs:860 parses `git show` output, not a floor CLI — still true, not applicable.

The sweep sees only those spellings; the header keeps the list OPEN.

## Files

- `.dev/features/parsed-cli-sentinel/PLAN.md`
- `.dev/features/parsed-cli-sentinel/LESSON-CANDIDATE.md`
- `pharn/floor/count-grillers.mjs`
- `pharn/floor/count-lenses.mjs`
- `pharn/floor/check-model-config.mjs`
- `pharn/floor/cli-stdout-flush.test.mjs`
- `pharn/floor/route-token-core.test.mjs`
- `.dev/guides/floor-gates.md`
- `.dev/guides/floor-orchestration.md`
- `SKILLS_VERSION`
- `README.md` — the version badge only (`check:badge`)
- `CHANGELOG.md`

## Lessons applied

- L29 — the remedy ("every parsed CLI ends by setting exitCode") is quantified over a set, so the deliverable is the
  set's rows in FLUSH_CLIS, iterated by the static pin and the crash test, not three bespoke assertions.
- L47 — the header's list of parsed CLIs outside the set is retracted to an OPEN form ("none known to the 6.71.1
  grep sweep; the list is open"), never a new count.
- L60 — negative control per asserted property: the new round-trips and the static pin are run once against the
  unconverted CLIs (expected: the static pin REDs for all three; on darwin the round-trips truncate at 65,536), and
  each ★ test asserts its document exceeds the pipe buffer before it asserts anything else.
- L75 — the caller sweep above lists every hit with its disposition, so grill/review can re-run the grep.
- L35 — the LESSON-CANDIDATE corrects L35's own stale reason ("cannot be merged because a user's install ships
  `pharn/floor/` without `.dev/`"), which 6.69.0 falsified by retiring the copies L35 says must both exist.

## Verification

- `node --test pharn/floor/cli-stdout-flush.test.mjs pharn/floor/count-grillers.test.mjs pharn/floor/count-lenses.test.mjs pharn/floor/route-token-core.test.mjs`
  plus the callers' suites (griller-extract, render-review-assignments, check-review-assignments, stage-agent-core,
  stage-agent, lens-groups, walker-exclusion).
- Byte-identity: each CLI's stdout/stderr/exit compared before and after on its success, missing-target and usage
  paths.
- `npm run check`, `node pharn/floor/validate.mjs .`, `npm run check:changelog-entry`, `npm run check:surface-bump`.
