# PLAN — spec-unscopable-criteria

- spec_content_hash: ab4dbd928b96b51bdb54ee12b91e87a95d1ba144013a26b8f20ffa9b4122c7fd
- applied_lessons: [L6, L29, L34, L35, L60, L67, L74, L80, L81]
- increment: before a SPEC is approved and pinned, `/pharn-spec` runs a new floor CLI that lists the acceptance criteria mentioning a path the writes-scope setter refuses from a plan in this project; a human sees them as a gap, and under `--model-approve` the model moves the ones that need that write into a `## Needs a person` section, which the run report copies.
- layer(s): product floor (`pharn/floor/`), product commands (`.claude/commands/pharn-spec.md`, `pharn-loop.md`, `pharn-loop-close.md`); apparatus tests and guides
- constitution_refs: [P0, P2, P4, P5, P6, P7]
- skills_version: 7.3.2 → 7.4.0 (minor: a newly shipped checker)

## The failure (P7 trigger)

Measured 2026-11-10 on 7.3.1 in an installed project: `/pharn-spec --model-approve` approved and pinned a SPEC whose
AC-13 required correcting `CLAUDE.md`. `set-writes-scope.cjs` refuses a `--from-plan` scope naming an instruction file
in an installed project (7.3.0), so the run learned this only at the plan stage and stopped S10 after about 17 minutes,
33 requests and about 6.2M cache-read tokens. `/pharn-plan` documents the refusal (advisory); `/pharn-spec` and
`check-spec.mjs` do not.

## Design

**One owner, no second copy: the new CLI asks the setter itself.** `set-writes-scope.cjs` exports nothing (it runs
`main()` on load) and is guard control surface, so the agent cannot add an export (hook-denied; a human edit). Copying
`isInstructionFile` / `isReserved` into the product floor would be the second copy L35 says to retire. Instead
`pharn/floor/check-spec-unscopable.mjs` writes a throwaway one-section PLAN (`## Files` with the candidate tokens) under
`os.tmpdir()` and runs `node .claude/hooks/set-writes-scope.cjs --check --from-plan <tmp>` with the project root as
cwd — the same relative setter path `loop-closeout.mjs` already runs. `--check` (7.3.0) runs every parse and refusal and
writes nothing. So the verdict is the setter's own, in this project's posture: in an installed project it refuses the
instruction files and PHARN's own surface (and canon, CI exec-config, `.mcp.json`, the guard control surface); in a dev
or unsignalled tree it refuses those two only while a product run is open, and the CLI then reports nothing — which is
exactly what the plan stage would meet.

**Probed this run** (scratch installed fixture, setter copied in, `git init`): `CLAUDE.md`, `docs/agents.md`,
`pharn/floor/x.mjs`, `pharn/CONSTITUTION.md`, `.claude/`, `.github/workflows/ci.yml` → exit 1; `pharn/features/x/a.md`,
`api/users`, `e.g`, `src/app.ts` → exit 0; same `CLAUDE.md` with no `pharn.config.json` (dev posture, no run) → exit 0.

**Candidate tokens (enum-regex, deterministic).** For each AC item (from the canonical AC parser in
`spec-template-core.mjs`, L6 — never a fresh grep of the section), over its lines except the verify line: maximal runs of
`[A-Za-z0-9._/-]`; strip leading `-`, `/`, `./`, `../` (repeated) and trailing `.` / `-`; keep a token holding `/` or a
`.` followed by an alphanumeric; at most 255 chars. Leading-`/` stripping keeps a URL route (`/api/users`) from reading
as an absolute path the setter refuses for a different reason.

**Spawns.** No candidate → exit 0, no spawn. Otherwise one batch spawn with every unique token: exit 0 → CLEAR. Non-zero
→ one spawn per token to attribute; a batch refused with no single token refused → exit 2 (cannot attribute). Spawn
error, signal or timeout (30 s) → exit 2. The setter's printed reason is never parsed (L6): only exit codes are read.

**CLI.** `node pharn/floor/check-spec-unscopable.mjs pharn/features/<name>/SPEC.md`, run from the project root.

- exit 0 `CLEAR — no acceptance criterion mentions a path the setter refuses from a plan here`
- exit 1 `MENTIONS — …` then one line per hit: ``AC-<n> (line <L>): `<token>` `` and a fixed bound line: a hit means
  the criterion MENTIONS such a path, never that it requires writing it.
- exit 2 `UNUSABLE <code> — …` for: usage, unreadable SPEC, a SPEC with no templated criteria (legacy, or the AC
  section missing/duplicated), no setter at `.claude/hooks/set-writes-scope.cjs`, a failed spawn, an unattributable
  batch refusal.
- Prints only AC ids, line numbers and tokens from the `[A-Za-z0-9._/-]` alphabet — never criterion prose (P2).

**`/pharn-spec`.**

- Step 3, after the Draft validates GREEN: run the CLI (pinned line). Exit 2 → say the check did not run and why; it
  never blocks.
- Step 4 (a human approves): before the approval question, list each hit as a gap to resolve — if the criterion needs
  that file written, no plan in this project can scope it; options: reword it, move it to `## Needs a person`, or keep
  it (the plan stage will stop unless the human runs the setter with the operator flag). Approval is still offered: the
  human decides.
- Step 4a (`--model-approve`): for each hit, the model judges (advisory) whether the criterion requires writing the
  path. Requires → move the item, unchanged and with its id written plain, into a `## Needs a person` section (one
  bullet each) and delete it from Acceptance Criteria. Only cites it → keep it and add one `## Assumptions` line saying
  it asks for no write to that path, so a reader can challenge it. Re-run `check-spec.mjs` (GREEN) and the CLI. If no
  criterion would remain → report back blocked on thin intent (S6); nothing is approved.
- Claims block: one Floor bullet (the CLI's verdict = which criteria carry a token the setter's `--check` refuses as a
  plan entry, here) and the Advisory half (mentions ≠ requires; tokenizer misses; the judgment; the move).
- `reads:` gains the CLI.

**`## Needs a person` is NOT a template section.** The contract already allows headings the template does not name and
never checks them (`spec-template.md`, "Sections"), so no contract or `check-spec.mjs` change is needed; `/pharn-plan`,
`/pharn-test` and the AC gate read only `## Acceptance Criteria`, so a moved criterion leaves the build.

**Run report.** `render-run-report.mjs` gains `## Needs a person` (after `## Outcome`): the SPEC section's lines copied
in a `quoteData` fence (untrusted, model-written), or `None — the SPEC has no \`## Needs a person\` section.`, or a
no-readable-SPEC line.`/pharn-loop`'s Step 7 summary (in`pharn-loop-close.md`) gains a bullet naming them, from the
report or, for a quick run (no report), from the SPEC.`pharn-loop.md`'s S6 trigger names the all-criteria case.

## Applied lessons

- L6 — criteria come from `spec-template-core.mjs`'s AC parser (a new export), and the setter's verdict is read from its
  exit code only, never grepped out of its printed refusal.
- L29 — the setter-class enumeration is the deliverable: the test iterates one token per refused class (instruction file
  at root and nested and case-folded, `.claude/**`, `pharn/floor/**`, a trusted doc, `pharn.config.json`, canon,
  `.github/workflows/**`) plus the exempt members (`pharn/features/**`, `pharn/.run/**`, a source path, a URL route).
- L34 — a SPEC with no criteria is UNUSABLE (exit 2), never a vacuous CLEAR; a test pins it.
- L35 — the path lists are not copied: the CLI runs the setter, so its one copy stays the owner.
- L60 — the both-directions tests each come with a control that makes the property fail (dev posture flips the edit
  case to CLEAR; a token change flips a hit).
- L67 — the tokenizer models free text it cannot fully parse; its misses (bare `CONSTITUTION.md`, a path with spaces, a
  file named only in prose) are listed as known-so-far bounds, never a complete list.
- L74 — the tests' expectations are hand-written per token, not computed by calling the setter's own predicates.
- L80 — the fixture takes an installed project's posture (`pharn.config.json` with `skillsVersion`, a fresh `git init`),
  never this repo's dev posture; a second fixture takes the dev posture on purpose.
- L81 — the test copies the setter alone into its scratch tree, and asserts from the setter's own source that every
  `require(` it makes is a Node builtin, so a new local import fails that assertion by name.

## Files

- `pharn/floor/check-spec-unscopable.mjs` — new CLI (above) — product floor
- `pharn/floor/check-spec-unscopable.test.mjs` — tests: both directions, the class enumeration, posture, UNUSABLE
  paths, P2 output, L81 import guard, the new core exports — apparatus (never ships)
- `pharn/floor/spec-template-core.mjs` — export `specAcceptanceCriteriaText(text)` (id, line, lines) and
  `specSectionLines(text, name)` + `NEEDS_PERSON_SECTION` — product floor
- `pharn/floor/render-run-report.mjs` — the `## Needs a person` section — product floor
- `pharn/floor/render-run-report.test.mjs` — SECTIONS closure 8 → 9; section present / absent / unreadable — apparatus
- `pharn/floor/README.md` — one table row for the new CLI — product floor doc
- `.claude/commands/pharn-spec.md` — Step 3 run, Step 4 gap, Step 4a move, claims, `reads:` — product command
- `.claude/commands/pharn-loop.md` — S6 trigger names the all-criteria case — product command
- `.claude/commands/pharn-loop-close.md` — Step 7 summary bullet — product command
- `.dev/floor/command-hygiene.test.mjs` — raise `pharn-spec.md`'s ceiling (and the loop files' if measured over) by
  the measured + 10% rule — apparatus
- `.dev/guides/floor-checks.md` — a `##` section for the new CLI — apparatus
- `.dev/guides/floor-orchestration.md` — the run report's new section — apparatus
- `SKILLS_VERSION` — 7.3.2 → 7.4.0
- `CHANGELOG.md` — `## [7.4.0]` section with this entry
- `README.md` — version badge, and the generated floor-checker count (`npm run docs:generate`)

### Explicitly not touched

- `.claude/hooks/set-writes-scope.cjs` — guard control surface; the CLI runs it, never edits or copies it
- `pharn/floor/check-spec.mjs`, `pharn/pharn-contracts/spec-template.md`, the shipped template — unknown headings are
  already allowed; no rule changes
- `.claude/commands/pharn-plan.md` — its advisory note stays as is
- the four trusted docs

## Contracts satisfied

- `spec-template.md` "Sections" — `## Needs a person` is a heading the template does not name, allowed and unchecked.
- `cost-ledger.md` — untouched; the run report still copies, never authors (its header's trust split).

## Evals to write (P1)

Floor checkers are not Capabilities; the obligation is tests (`node --test`):

- edit direction: AC "When the user corrects `CLAUDE.md` Then `CLAUDE.md` names …", installed fixture → exit 1, `AC-1`
  and `CLAUDE.md` listed.
- cite direction: AC "Given the conventions CLAUDE.md states When … Then the API returns 200", installed → exit 1 too
  (the floor sees a mention; the test name says the floor cannot tell edit from cite).
- control: the edit AC in a dev-posture fixture (no `pharn.config.json`) → exit 0.
- class enumeration (L29): one fixture AC per refused class → each hit; exempt members → none.
- attribution: two ACs, one hit → only that id listed.
- UNUSABLE: no criteria / legacy SPEC / unreadable / no setter → exit 2 (L34).
- P2: an AC carrying instruction-looking prose → stdout holds none of it.
- L81: setter's `require(` set ⊆ Node builtins.
- render-run-report: section copied in a fence; `None` when absent; SECTIONS closure.

## Guarantee audit (P0)

- "the CLI lists every criterion carrying a token the setter refuses as a plan entry in this project" → floor:
  enum-regex (the tokenizer) + the setter's own refusals (its membership tests), read by exit code.
- "a listed criterion requires a write the setter would refuse" → advisory. A path-token membership test proves a
  mention, never a required write; the CLI and the command say so.
- "every such criterion is found" → advisory: the tokenizer misses bare names the setter only refuses with a prefix,
  paths with spaces, files named in prose. Known-so-far list.
- "under `--model-approve` the criteria needing a person are moved" → advisory (model judgment). Nothing checks that a
  remaining hit got its Assumptions line.
- "the run report lists them" → floor for the copy (deterministic render of the SPEC section), advisory for its
  completeness (it copies what the model wrote).
- "the check never blocks approval" → by construction: no proceed/stop reads its exit code except the model's own
  move step; the plan stage's setter refusal stays the backstop (floor, hook-side).

## Trust audit (P2)

- SPEC body (untrusted) → tokens from a closed alphabet, printed with AC ids and lines only; never criterion prose.
- The setter's stderr (derived from those tokens) → discarded; only its exit code is read.
- `## Needs a person` (model-written, untrusted) → copied into RUN-REPORT.md inside a computed fence, as DATA.

## Determinism audit (P5)

- Every branch is an exit-code or regex membership test. The one judgment (requires vs cites) is the model's under
  `--model-approve`, made visible as a moved item or an Assumptions line; with a human it is the human's.

## Resolved at GATE 1 (2026-11-10)

- The refused set is the setter's whole `--check` verdict (instruction files and PHARN's surface, plus canon, CI
  exec-config, `.mcp.json` and the guard control surface) — the human chose it over a narrowed copy. Plan approved as
  written.

## Open questions (HALT)

- none
