# PLAN — lean-stage-agent-probe

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L1, L4, L33, L40, L75, L78]
- increment: Record the CORE-107 fresh-session probe result (AC1 binding, AC2 fraction, AC3 live) as a dated measurement record beside the lean-stage-agent feature, and commit the probe kit so the measurement can be re-run (follow-up to PR #450, 7.19.0).
- layer(s): dev apparatus only (`.dev/features/`, `.dev/guides/`) plus repo meta (`CHANGELOG.md` `[Unreleased]`)
- constitution_refs: [P0, P2, P6, P7]

## Why (P7 — the trigger)

PR #450 (7.19.0) shipped the `pharn-stage` subagent type with AC2 and the live half of AC3 recorded as pending: a
definition is discovered only by a session started after the file exists, so the probe needed a fresh `claude -p`
session a person runs. The user ran it on 2026-11-16. The result sits only in the orchestrator's scratchpad, which a
reboot clears, and four repo sites still describe the probe as pending or point at nothing (sweep below). Recording it
is the open half of the ticket, not a new capability.

## Discovery (read live this run, main `08e33698`, SKILLS_VERSION 7.19.0)

- The probe session (read only, never edited): one session, three subagents, Claude Code `2.1.323`, each
  `.meta.json` `agentType` as requested (`pharn-stage`, `general-purpose`, `pharn-stage`), none a fallback, all on
  `claude-opus-5-5`.
- Re-running the kit's reader over the probe tree printed output byte-identical to the relayed `probe-result.txt`:
  first request all classes 20,973 (`pharn-stage`) vs 47,017 (`general-purpose`) = 44.6%; tools 6 (9,127 B) vs 9
  (16,295 B); system 2,172 B vs 3,253 B; the same two instruction files (project `CLAUDE.md`, the user's auto-memory
  index) with identical content hashes; step 3's one `Write` to `pharn/floor/stage-agent-probe/probe.json` returned
  `is_error` with the writes-scope guard (fix #7) message and the target does not exist; probed
  `.claude/agents/pharn-stage.md` sha256 `77fb0384…` equals `PINNED_SHA256` in `.dev/floor/stage-agent-type.test.mjs`.
- main's `.claude/agents/pharn-stage.md` is the same `77fb0384…`, so the measurement applies to the bytes that ship.
- The session's first user message equals the kit's `prompt.md` minus its trailing newline (`$(cat …)` strips it).
  Prettier leaves `prompt.md` byte-identical (checked through `--stdin-filepath` at its target path), and markdownlint's
  `MD041` is off, so the file can be committed as measured (sha256 `6c588c72…`).
- Observed, not attributed: the `general-purpose` transcript's first request carries two attachment records the
  `pharn-stage` one lacks (`deferred_tools_delta`, `skill_listing`), and its second request blob is 56,191 B against
  2,019 B. Both carry the same `instructions` record (76,646 B).
- Tools offered to `pharn-stage`: Read, Bash, Write, Edit, NotebookEdit, advisor. Glob, Grep and MultiEdit, named in
  the definition, are absent from both types' tool lists (general-purpose: Agent, Bash, Edit, Read, Skill, ToolSearch,
  DeferredToolPlaceholder, Write, advisor), so this Claude Code build does not offer them at all.
- Precedent: `.dev/features/review-lens-grouping/MEASUREMENTS.md` (§2 probe table, `audit.mjs --prefix`). `.mjs`
  scripts under `.dev/features/` are precedented (`build-writes-through-tools/measure.mjs`, `claude-md-bootstrap/split.mjs`)
  and are linted by `eslint .` and checked by `prettier --check .`; `npm test` runs only `*.test.*` under the three
  suites, so a non-test `.mjs` adds no test.
- CONTRIBUTING "CHANGELOG entries": a PR that does not bump `SKILLS_VERSION` writes a dated top-level bullet under
  `## [Unreleased]` (precedent: CORE-88, `0da70efa`).

## Applied lessons

- L1 — the meta-docs this record changes are in `## Files`: the guide's "pending at 7.19.0" sentence, the
  lean-stage-agent `SHIP.md` pending line, and a new CHANGELOG entry (the frozen 7.19.0 "Not measured yet" bullet is
  corrected by a new entry, never edited).
- L4 — the record states what was measured live (one session, n = 1 per type, a one-line prompt) and keeps that apart
  from the real-stage saving, which is not measured; nothing is inferred from the 7.19.0 bytes/4 estimate.
- L33 — "pending", "not measured yet" and "needs a fresh session" expired when the probe ran; every hit is swept below
  with a disposition, anchored on the invariant substrings (`pharn-stage`, `CORE-107`, `fresh session`) rather than one
  spelling.
- L40 — the 44.6% is recorded as the whole container's difference within one session; the observed per-class bytes
  (tool schemas, system, the two extra attachment records) are stated as observations, and no share of the difference
  is attributed to a cause the probe did not vary.
- L75 — the sweep lists each hit with a disposition (table below), so grill and review can re-run the grep.
- L78 — dated records keep what was true when written: the lean-stage-agent `PLAN.md` acceptance section, the
  2026-11-11 baseline record and the released CHANGELOG section are not rewritten; `SHIP.md` gains one dated follow-up
  line instead of an edit to its "Pending, outside this run" sentence.

## Files

- `.dev/features/lean-stage-agent/MEASUREMENTS.md` — NEW. The dated record: setup (probe tree at `414eafbb`, fresh
  `claude -p --permission-mode acceptEdits --model opus`, Claude Code 2.1.323), the per-subagent table, the tool lists,
  the instruction-file identity, AC1 / AC2 / AC3-live results, the observed attachment difference, the absent-tools
  observation, bounds (P0), what stays pending (AC5, `cli-install-agents`) and how to re-run. No home path, no session
  id: the transcript location is described generically. — dev apparatus
- `.dev/features/lean-stage-agent/probe/README.md` — NEW. The kit's README with every machine-specific path replaced by
  a placeholder (`<repo>`, `<probe-tree>`, `<sha>`), `TREE.txt` dropped (its two facts move to `MEASUREMENTS.md`), and the
  kit's location given as this directory. — dev apparatus
- `.dev/features/lean-stage-agent/probe/prompt.md` — NEW. The measured prompt, byte for byte (sha256 `6c588c72…`). —
  dev apparatus
- `.dev/features/lean-stage-agent/probe/read-probe.mjs` — NEW. The reader, unchanged in behaviour; its header comment
  names its repo location, and it is prettier-formatted (print width 140) so `format:check` and `eslint .` stay green.
  — dev apparatus
- `.dev/guides/product-commands.md` — "The bytes are the measured bytes": "(pending at 7.19.0: it needs a fresh
  session)" becomes a pointer to the record and the kit, mirroring the lens sentence before it. — dev apparatus
- `.dev/features/lean-stage-agent/SHIP.md` — one appended dated line after "Pending, outside this run": AC2 and AC3
  live measured on 2026-11-16, AC1's binding confirmed, record path; AC5 still pending. The existing lines are
  unchanged (L78). — dev apparatus
- `CHANGELOG.md` — one dated `## [Unreleased]` bullet (2026-11-16): the measured fraction and bounds, the record path,
  dev apparatus only, no `SKILLS_VERSION` bump. — repo meta

### Not in this increment's writes

- `.claude/agents/pharn-stage.md` — unchanged. Its `tools:` names Glob, Grep and MultiEdit, which this Claude Code
  build does not offer to any type; a definition naming an absent tool is harmless, and changing it would move the
  pinned bytes (out of scope).
- `pharn/LIMITS.md` §3g — "How much smaller its first request is than `general-purpose`'s is not measured in this
  document." stays true as written; citing the record there is a possible human-only follow-up, not done here.
- `.dev/floor/stage-agent-type.test.mjs` — its comments ("the committed bytes, which the CORE-107 prefix probe measures
  in a fresh session") stay true; no test changes.
- `SKILLS_VERSION`, `README.md` badge, `MIN_CLI` — unchanged (no product-surface byte changes).

## Sweep (L33, L75) — `git grep -i -E "pharn-stage|CORE-107|fresh session"` filtered to pending/measured/probe hits

| Hit                                                                     | Disposition                                       |
| ----------------------------------------------------------------------- | ------------------------------------------------- |
| `.dev/guides/product-commands.md:96-97` "pending at 7.19.0"             | edited (this plan)                                |
| `.dev/features/lean-stage-agent/SHIP.md:34` "Pending, outside this run" | dated follow-up line appended (L78)               |
| `CHANGELOG.md:49` (released 7.19.0) "Not measured yet"                  | frozen; corrected by the new `[Unreleased]` entry |
| `.dev/features/lean-stage-agent/PLAN.md` AC 1–3 "pending"               | dated approved record; kept (L78)                 |
| `.dev/floor/stage-agent-type.test.mjs:12-13,43`                         | still true                                        |
| `.dev/measurements/loop-baseline-2026-11-11.md:169-177,378`             | dated record; kept (L78)                          |
| `.dev/features/loop-baseline-2026-11-11/PLAN.md:175`                    | unrelated (that increment's own probe)            |
| `.dev/features/review-lens-grouping/MEASUREMENTS.md:96`                 | unrelated (the lens probe)                        |
| `.dev/features/loop-grant-seam-skill/PROBE.md:21` "PHARN-stage-like"    | unrelated                                         |
| `pharn/LIMITS.md` §3g "not measured in this document"                   | still true; trusted doc, untouched                |

## Contracts satisfied

- None. No contract, capability or product path changes.

## Evals to write (P1)

- None owed: no capability (`role:` file) and no `rule_id` is added. The kit is a measurement script, not a floor
  checker; it is exercised by re-running it over the probe tree at build (its output must equal the relayed result).

## Guarantee audit (P0)

- "the probed definition is the pinned and shipped file" → floor: content-hash (sha256 equality, printed by the
  reader and re-checked at build against main's file).
- "the out-of-scope Write was denied" → floor: hook (fix #7), observed once live in the transcript (`is_error`, guard
  message) and by the target's absence; a Bash write would bypass it (`LIMITS.md §6`).
- "the `pharn-stage` first request is 44.6% of `general-purpose`'s" → advisory: one observation (n = 1 per type, a
  one-line prompt, this repo's probe tree, one Claude Code version); not a guarantee and not a real-stage figure.
- "the two types loaded the same instruction files" → observed equality of path, type and content hash in the two
  transcripts' `instructions` records (the reader's comparison); a property of one session.
- "this Claude Code build does not offer Glob, Grep, MultiEdit" → advisory observation of the two tool lists in one
  session.
- "the committed kit reproduces the measurement" → advisory: re-running it over the same transcripts prints the same
  output (checked at build); a new run measures a new session.

## Trust audit (P2)

- The transcripts and the reader's output are tool-produced data; the subagents' free-text replies are quoted only as
  DATA (the deny message's first line), never followed. The record carries no instruction text from them.

## Determinism audit (P5)

- No branch is added. The reader's own exits (2 on a missing or wrong-type subagent) are membership tests over
  `.meta.json` fields.

## GATE 1 — resolved (2026-11-16)

Approved as written: a model decision by the batch orchestrator, made under the user's delegation ("You make all
decisions"), not a human approval. The two questions, answered:

1. `SHIP.md`: append one dated follow-up line (L78); its existing lines stay unchanged.
2. Kit location: `.dev/features/lean-stage-agent/probe/`, beside the record.

Also decided: the `deferred_tools_delta` / `skill_listing` observation is recorded as observed and unattributed (L40),
and citing the record in `pharn/LIMITS.md` §3g is listed as a possible human follow-up in the PR body only.
