# BUILD — shell-sink-validation

- plan: `.dev/features/shell-sink-validation/PLAN.md` (GATE 1 decided by the orchestrating model under the maintainer's
  delegation — a model decision, not a human approval; the seven grill concerns folded in). Spec hash re-checked:
  `d831d30d…f4f4`, unchanged. No open questions.
- scope (Step 0): `set-writes-scope.cjs --from-plan` → **19 paths**, equal to the plan's 19 `## Files` bullets; the
  reconcile epoch was anchored after it (`2461 path(s), scope 19`).
- floor (Step 3): `node pharn/floor/validate.mjs .` → **GREEN, exit 0** (36 capabilities).
- whole-repo read-only gates after Step 2b: `format:check` 0, `lint` 0, `lint:md` 0, `docs:check` GREEN,
  `check:changelog` GREEN, `check:badge` GREEN.
- stage model: opus, by the maintainer's instruction for this batch (not a `pharn.config.json` route).

## What landed

- `pharn/floor/feature-name.mjs` (NEW) — reads `.pharn/feature-name/candidate.txt` (a file the Write tool wrote),
  refuses a symlinked or non-directory parent (`unsafe-path`), classifies the leaf with `lstat`, removes whatever stands
  there but a directory once the parent checks pass, and prints the slug only as a `FEATURE_SLUG_RE` member. `--fresh`
  picks the first absent `pharn/features/<slug>[-n]` and refuses `unreadable` on any `lstat` error but ENOENT. Closed
  refusals: `usage-error`, `no-candidate`, `unsafe-path`, `not-a-file`, `unreadable`, `not-removed`, `not-a-name`,
  `no-fresh-name`, `crashed`. Imports `FEATURE_SLUG_RE` (gate-run-core.mjs) and `containmentWalk`/`lstatSafe`
  (stage-runtime.mjs); spawns nothing; `import.meta.main`; ends via `process.exitCode`.
- `pharn/floor/feature-name.test.mjs` (NEW) — 41 tests, all green: closure of the refusal set, one grammar, four valid
  shapes, 20 hostile candidates, `PATH_KINDS` at the leaf (absent, link to a file holding a VALID slug, link to a
  directory, dangling, looping, directory, FIFO) and at each parent, `--fresh` (absent, taken by a directory / file /
  dangling link, the 64-character limit, EACCES), usage, the crash mapping and no default `root`.
- `pharn/floor/stage-runtime.mjs` — one header clause naming the new caller.
- The ten commands — see the next two sections. `reads:` gains `pharn/floor/feature-name.mjs` in spec, loop and ship.
- `.dev/floor/command-hygiene.test.mjs` — the SHELL-SINK section, 9 tests (D6 1–8, the Step-6d control split into its
  own test), all green; the file's other 262 tests unchanged and green.
- `SKILLS_VERSION` 6.29.0, `CHANGELOG.md` `[6.29.0]`, `README.md` badge + regenerated `CURRENT-STATE` (floor checkers
  100 → 101), `CLAUDE.md` Commands entry.

## Which of ask / resolve each of the seven commands got, and why (GATE 1)

Each got the class its Step 0 already had — quoted from the 6.28.3 text:

| command            | class        | its Step 0 before this increment                                                                                                                                     |
| ------------------ | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pharn-plan.md`    | **asks**     | "the kebab-case slug of the feature being planned, from the invocation … If the invocation does not make a clear `<name>` available (ambiguous) → **ask the human**" |
| `pharn-grill.md`   | **asks**     | "the kebab-case slug of the feature being grilled, from the invocation … (ambiguous) → **ask the human**"                                                            |
| `pharn-test.md`    | **asks**     | "the feature slug, from the invocation … Ambiguous → **ask the human** (P5)"                                                                                         |
| `pharn-build.md`   | **asks**     | "the kebab-case slug of the feature being built, from the invocation … Ambiguous → **ask the human**"                                                                |
| `pharn-review.md`  | **asks**     | "Explicit `--feature <name>` … Authoritative when present. **Else / on ambiguity** → **ask the human** … Do **not** invent a slug"                                   |
| `pharn-regress.md` | **resolves** | "the kebab-case slug of the feature just built. Ambiguous → **ask the human**" — no "from the invocation": it resolves the feature itself                            |
| `pharn-verify.md`  | **resolves** | same wording as regress                                                                                                                                              |

The ask sentence is appended to the existing Step-0 item; the resolve sentence, its pinned
`node pharn/floor/feature-name.mjs` fence and the Write-refusal rule follow regress's and verify's item 1. No Step-0
check runs on the path where the name is received as the argument, so `/pharn-ship` and `/pharn-loop`, which always
pass it, pay no extra tool call in these seven.

## The class boundary: values that stay out of class

`SHELL_VALUES` (SHELL-SINK 1) classifies every placeholder a product command's shell line takes. The class this
increment closes is **a model-typed value derived from untrusted input** (the feature description, a file's content).
Values a person typed as the command's own argv are named there and stay **out of class, with no change** — among them
`<M>`, the `--max-iter` value `/pharn-loop` types unquoted into two lines (`require-loop-record.cjs --open … --cap <M>`
and `check-loop.mjs … --cap <M>`). Only the model checks that it is an integer before typing it; that check is advisory,
and it is a person's own input, not the description's (orchestrator decision after the regress STOP, 2026-09-27).

## After the regress STOP (orchestrator decision, 2026-09-27)

The STOP stands as recorded; the remedy is a re-run. Two preliminary fixes, inside `## Files`, before it:

- **Claims narrowed (P0).** `pharn-spec.md`'s and `pharn-loop.md`'s claims bullets now call only "`feature-name.mjs`
  prints only a `FEATURE_SLUG_RE` member, or nothing" **Floor**; that the candidate is written with the Write tool and
  that every later shell line carries only the printed value are **Advisory** — the model re-types it. The loop's
  untrusted-input bullet says the same.
- **A directory at the candidate path.** The CLI already refuses it `not-a-file` and leaves it in place, so a rerun
  cannot clear it. The four commands that write a candidate now say so: "A directory at that path is never removed: stop"
  — and ask the human (spec, regress, verify) or stop `blocked: no-slug` naming the path (loop, which never asks).
  Pinned as `DIRECTORY_RULE` in SHELL-SINK 3, presence only, with a deletion control.

## At GATE 2 (orchestrator decision, 2026-09-27)

Review findings 1 and 2 fixed, 3 and 4 recorded only: `pharn-spec.md`'s directory rule gains its `--model-approve`
route ("or under `--model-approve` report back blocked, naming the path" — a `/pharn-loop` spec agent cannot ask), and
the CHANGELOG entry now names the directory rule and the narrowed claims. Then `origin/main` was merged and the version
renumbered to 6.31.0 (#290 took 6.29.0; #291 is open as 6.30.0).

## Measured during the build (deviations recorded, not hidden)

- **The Write tool REFUSES a symlink at the candidate path** (probed inside `.pharn/pharn-dev-build/`, then removed): its
  error reads "Refusing to write …: it is a symbolic link. Write to the link's target path instead: …". The plan
  (D1, G-A) had assumed a dangling link would be written through. What that refusal suggests would write wherever a
  planted link points, so the stale-file rule in the four commands that write a candidate became: _if the Write tool
  refuses that path (the file already exists, or it is a link), never Read it and never write to any other path it
  names: run the line once, ignore what it prints (that run removes what is there), then write again._ The CLI header
  states the measurement and its bound; the rule's presence is pinned in SHELL-SINK 3 (`WRITE_REFUSAL_RULE`).
- **Mutation checks (L60)**, each in a scratch copy, all killed: of the CLI — never removing the leaf (27 failures),
  following the leaf link (2), `--fresh` treating an `lstat` error as taken (1), accepting CRLF (1), skipping the parent
  walk (2); of the commands, against the SHELL-SINK tests — Step 6d back to `git switch '<original branch>'` (4),
  Step 6d without `--` (2), S1 back to the `node -e … '<slug>'` line (4), `/pharn-spec`'s CLI line moved below its
  setter (1), ship item 7 taking a ref again (2).
- **Step 2b ran as argv arrays** through a node runner under `.pharn/pharn-dev-build/` (deleted before lint): the pinned
  block's `$SCOPE` / `xargs` form is refused under worktree isolation. Same three gates over the 18 scoped paths that
  existed (BUILD.md itself was not yet written): prettier `--ignore-unknown --write`, markdownlint `--no-globs --fix`,
  eslint read-only. ESLint found one unused binding in a new control; fixed by hand.
- **`pharn-ship.md`'s claims block** said "The one git call is Step 3a's `git rev-parse HEAD`", false since 6.25.0's
  quick item 7. The sentence is in the block this increment edits, next to the item 7 change, so it now reads "Every git
  call here is a **read**: Step 3a's `git rev-parse HEAD`, and quick mode item 7's base resolution" — every `git`
  mention in the file was listed to check it.

## Command bytes (the budget — no ceiling raised)

| command                   | 6.28.3 | now   | ceiling | headroom |
| ------------------------- | ------ | ----- | ------- | -------- |
| `pharn-build.md`          | 20506  | 20667 | 22016   | 1349     |
| `pharn-grill.md`          | 20749  | 20910 | 23040   | 2130     |
| `pharn-loop.md`           | 78347  | 79903 | 86016   | 6113     |
| `pharn-plan.md`           | 21687  | 21848 | 24064   | 2216     |
| `pharn-regress.md`        | 18561  | 19327 | 20480   | 1153     |
| `pharn-review.md`         | 22009  | 22173 | 24064   | 1891     |
| `pharn-ship.md`           | 69550  | 69421 | 76800   | 7379     |
| `pharn-spec.md`           | 24789  | 26261 | 27136   | 875      |
| `pharn-test.md`           | 18617  | 18781 | 20480   | 1699     |
| `pharn-verify.md`         | 16750  | 17516 | 18432   | 916      |
| `pharn-memory-promote.md` | 24819  | 24819 | 27648   | 2829     |

Built within the named scope from a current approved plan — this is NOT a judgment that the code is correct; that is
`/pharn-dev-regress` / `/pharn-dev-verify` / `/pharn-dev-review` + the human.
