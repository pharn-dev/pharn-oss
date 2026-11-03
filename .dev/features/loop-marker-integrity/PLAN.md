# PLAN — loop-marker-integrity

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L14, L15, L26, L27, L29, L35, L36, L43, L52, L62, L68, L81]
- increment: make the /pharn-loop Stop-guard marker witness the run's mode and refuse a re-open, close the open `blocked:` vocabulary, and drop the pre-approved `--accept-host-execution` grant (batch audit-2026-11-03, group G2)
- layer(s): pharn-contracts (loop-record.md), product floor (pharn/floor), product commands (.claude/commands/pharn-loop\*.md), hook (.claude/hooks/require-loop-record.cjs — human patch), dev apparatus (tests, guides)
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

Batch context: worker G2 of the 2026-11-03 review batch. Branch `fix/loop-marker-integrity` from
`origin/batch/audit-2026-11-03` (== main `dd0bb3d3`, SKILLS_VERSION 7.2.1). No `SKILLS_VERSION` / `MIN_CLI` / badge
bump here (the orchestrator bumps once to 7.3.0); prose that cites the version a behaviour lands in says `7.3.0`.
GATE 1 and GATE 2 are decided by the batch orchestrator (a model) under the owner's delegation — never recorded as a
human approval.

## Applied lessons

- L14 — the new `blocked:` membership check runs AFTER `cleanScalar` (compose, never replace); and the comment at
  `check-loop-record.mjs:143-147` that states the false JS fact (`/^\d+$/.test("2\n")` is TRUE — measured `false` on
  Node 24 this run) is corrected to say why the guard is kept anyway. Canon L14 itself is G9's (not edited here).
- L15 — the marker's new `mode` is read with `Object.hasOwn` and tested with `Set.has` over `LOOP_MODES`; `BLOCKED_IDS`
  is a frozen array tested through a `Set`, never a plain-object index.
- L26 — `apply.py` is proven in a throwaway `git clone` of this branch at the real repo layout, where the patched
  hook is judged by the repo's own eslint/prettier config and `npm test` + the hook suites run — never a sandbox copy.
- L27 — the new `--open` refusal ("a marker is already open for this run") names its one reachable remedy,
  `--close <name>`, which is a pinned line of the Final step; the usage message names the new `--mode` grammar.
- L29 — the blocked-stop vocabulary becomes ONE materialized enumeration, `BLOCKED_IDS` in `loop-record-core.mjs`,
  that both checkers iterate; the tests range over the whole set, not one member.
- L35 — the id list has one owner in code. The contract's copy is a rendered list between markers pinned equal both
  ways, and the dev hygiene table `STUCK_POINTS` (which also carries the S-row mapping the code does not need) is bound
  to it by set equality rather than kept as an unbound third copy.
- L36 — closure both ways: every `BLOCKED_IDS` member is in the contract list and in the command's stuck-point table,
  and every id either names is a member; a made-up id is RED in `check-loop-record.mjs` and is no longer SKIPPED by
  `check-loop-decision.mjs`.
- L43 — the marker's `mode` makes the record's mode agree with a value written at Step 1a, before any SPEC exists;
  that is still agreement between files the run can write, never provenance, and the plan, contract and docs proposal
  say so (the model types `<mode>` from its reading of its own argv).
- L52 — the "every id is GREEN" test EXTRACTS the ids from `pharn-loop.md`'s stuck-point table (the S-table's
  `blocked: <id>` cells) rather than from a hand list, so it covers the member set the command actually uses.
- L62 — no new refusal quotes marker or record text: `MODE_UNWITNESSED` names the two modes from the closed set, and
  `BLOCKED_UNKNOWN` quotes the value only through `JSON.stringify` of a string already proved clean.
- L68 — the hook change is a human-only write. It lands as its own commit (owner runs `apply.py`) BEFORE the build's
  reconciliation anchor is (re-)taken, per the batch protocol, so reconcile never sees it mid-window.
- L81 — `check-loop-decision.mjs` gains an import (`loop-record-core.mjs`); grep finds no test that copies a hand list
  of these modules into a scratch tree (`git grep` over `*.test.*`), and the full `npm test` at verify is the check.

## Findings and what each becomes

1. **HIGH — the model can pick the quick table in a run nobody invoked with `--quick`** (review §3; axis4).
   FIXED: Step 1a's pinned `--open` line gains `--mode <mode>` (`<mode>` = `quick` for the quick form, else `full`);
   the hook writes `mode` into `active.json`; `check-loop-decision.mjs` reads it (own-property, absent → `full`) and
   REDs **`MODE_UNWITNESSED`** when the record's mode differs — beside `MODE_MISMATCH` (record vs the SPEC's kind) this
   makes a full-invoked run over a model-written quick SPEC uncommittable. The quick part's "writes no mode marker …
   a second, unverified copy" sentence (`pharn-loop-quick.md:32-34`) is struck. Bound: the model still types `<mode>`
   from its own reading of its argv — what changes is that it is fixed at Step 1a, before the spec stage writes the
   kind, and a later change of mind REDs.
2. **HIGH — a pre-approved `--open * --cap *` line lets a run re-open its marker with a larger cap.** FIXED (design
   choice below, D1): `--open` refuses (exit 2, nothing written) when anything already exists at the marker path. The
   refresh semantics an earlier review called "by design" belong to `run-marker.mjs` (`/pharn-ship`, `/pharn-review`
   markers — no cap; `run-marker.mjs:20-31`), not to the loop marker, whose only writer opens it once at Step 1a. Bound
   (stated, not closed): `--close *` is also pre-approved (the Final step needs it), so `--close` then `--open` then a
   re-capture still re-opens a run; that is three pinned lines and the L43 agreement bound, named in the hook header,
   the contract and the docs proposal.
3. **HIGH — `--accept-host-execution` is pre-approved in `/pharn-loop`'s `allowed-tools`.** FIXED (D3): the grant
   `pharn-loop.md:76` is deleted; the flagged line stays pinned in Step 1a, so Claude Code's own permission settings
   decide whether the person is asked before it runs (Step 1a runs seconds after the person typed the flag). The
   loop-no-prompts derivation test gets ONE closed exclusion constant for that line, asserted pinned and covered by NO
   grant; plus a corpus test that no `allowed-tools` entry in any `.claude/commands/pharn-*.md` contains
   `--accept-host-execution`.
4. **MEDIUM — `blocked:` is an open vocabulary.** FIXED: frozen `BLOCKED_IDS` (the 18 ids of the stuck-point table)
   exported from `pharn/floor/loop-record-core.mjs`, rendered between `<!-- LOOP-BLOCKED-IDS:BEGIN/END -->` markers in
   `loop-record.md`; `check-loop-record.mjs` REDs `BLOCKED_UNKNOWN` for a non-member (A8); `check-loop-decision.mjs`
   SKIPS only a member and REDs a non-member (fail-closed, no re-derivation attempted).
5. **LOW — `--open` writes `active.json` non-atomically.** FIXED: after the D1 `lstat` refusal, write
   `active.json.tmp-<pid>` and `renameSync` it onto `active.json` — the form the counter's own `persist()` already uses
   (`require-loop-record.cjs:244-248`); any write failure removes the tmp and exits 2 with no marker. (Amended at
   grill, finding 2: a `linkSync` publish would also make a concurrent second `--open` lose, but it needs hard-link
   support, and on a volume without it every run would stop at S9; no run issues two concurrent opens of one name, and
   one that did could only write a cap it could have typed in the first.)
6. **SPEC — `/pharn-loop` says it "cannot end its turn".** FIXED: `pharn-loop.md:535` → "must not end its turn to
   wait: the `Stop` guard refuses a turn end up to three times, then lets it end with a warning, and nobody is there to
   resume it"; a command-hygiene vocabulary pin that `cannot end its turn` is absent.
7. **overflow SPEC — `pharn-loop-quick.md:33-34` vs `loop-record.md:148-149` and `LIMITS.md:154`.** FIXED in the quick
   part and the contract (the record's mode is the invocation, now witnessed by the marker); `LIMITS.md:154` →
   DOCS-PROPOSAL.md.
8. **overflow SPEC — `pharn-loop.md:8-52` `reads:` (42 entries / 990 KB, four missing paths).** WON'T FIX, with
   evidence: (a) none of `pharn-loop.md`'s own `reads:` entries is missing (checked every non-placeholder entry with
   `existsSync` this run); the four missing paths the review lists sit in OTHER commands and are conditionally-present
   targets, not stale references — `pharn/memory-bank/*` (product canon, created on first promotion; `/pharn-plan`'s
   `NO_CANON` branch, `pharn-plan.md:77`), `pharn/spec-template.md` (the project's optional template, hook-protected by
   path whether or not it exists — CLAUDE.md hard constraint 1), `.dev/memory-bank/pattern-library.md`
   (`pharn-dev-memory-promote.md:166`, :377 "Bootstrap (the file does not exist yet)"); (b) the cost premise is wrong:
   "frontmatter `reads:` loads nothing" (`.dev/guides/product-commands.md` §"A command's text a run needs at only ONE
   point", 6.32.0), so the 990 KB is never paid; (c) `reads:` entries are consumed by a test
   (`.dev/floor/command-hygiene.test.mjs:1952` requires `"pharn/floor/check-loop-fresh.mjs"` in it), so a trim is not
   "nothing consumes them".
9. **overflow — `check-loop-record.mjs:143-144` L14 false-fact comment.** FIXED (L14 line above).

## Design decisions (for GATE 1)

- **D1 — refuse, do not refresh.** `--open` exits 2 when `lstat(active.json)` finds anything, with the message
  `require-loop-record: a marker is already open for this run — close it first: node .claude/hooks/require-loop-record.cjs --close <name>`.
  Rationale: the loop has one `--open` per run (Step 1a, `pharn-loop.md:319`), every run gets a fresh name (S2), and
  `pre-run-snapshot.mjs` already treats a re-opened marker as another run (`pre-run-snapshot-core.mjs:37-38`), so no
  legitimate path re-opens. A leftover marker from a run that crashed before its feature directory existed makes the
  next run of the same slug stop at S9 once; that stop's Final step runs `--close '<name>'` (`pharn-loop-close.md:410`),
  so the run after it starts. Rejected: refusing only on a DIFFERENT cap/mode (still lets an equal-cap re-open reset
  `started_at`, the Stop guard's 24 h age and the snapshot binding), and the review's second half — a
  `sha256(active.json)` vs pre-run-snapshot `marker_sha256` comparison in `check-loop-decision.mjs` — because the
  re-capture that would re-bind the snapshot is itself a pre-approved line (`pre-run-snapshot.mjs --capture *`), so it
  adds a git-dir read and a `git` spawn to the decision check for no gain against the actor the finding names. Named
  as the stated bound instead.
- **D2 — one pinned `--open` line with a `<mode>` placeholder**, not a second `--open` line in the quick part: four
  tests pin "exactly one `--open` line" in the family (`loop-closeout.test.mjs:404-405`,
  `require-loop-record.test.cjs:432-441`, `pre-run-snapshot.test.mjs` WIRING, `command-hygiene.test.mjs:1991`), and
  one line keeps one grant. `<mode>` joins `SHELL_VALUES` ("a closed choice: `full`, or `quick` when /pharn-loop read
  `--quick` as the first argument token"); the hook accepts `--mode full|quick` and refuses anything else, and the
  flag stays optional at the hook (absent → no key → read as `full`) so every existing fixture that opens with
  `--open demo --cap 3` keeps working. Cost, stated (grill finding 3): a quick run in flight across an upgrade, whose
  marker the older hook wrote without `mode`, records `mode: quick` against a marker read as `full` → RED
  `MODE_UNWITNESSED`, not committed — the fail-closed direction; the contract says so.
- **D3 — the `--accept-host-execution` line stays pinned and becomes the loop's one ungranted line.** The review's
  "the operator runs the flagged line by hand before `/pharn-loop`" cannot work as written: the witness path is
  `pharn/.run/pharn-loop/<name>/isolation.json` and `<name>` is chosen at S1/S2, inside the run. With the grant gone,
  Claude Code's permission system — not the model — decides whether the line runs without asking (default mode asks;
  auto mode or a person's allow rule may not: ADVISORY, the person's setting). Alternative considered and NOT taken
  (would need the orchestrator's go-ahead): an operator env var (`PHARN_ACCEPT_HOST_EXECUTION=1`) set before
  launching Claude Code — prompt-free for an honest operator, but a breaking change to the documented flag across
  README, docs/, the contract, LIMITS and THREAT-MODEL.
- **D4 — `BLOCKED_IDS` lives in `loop-record-core.mjs`** (the loop-record contract's shared reader, already imported
  by `check-loop-record.mjs`; one axis — it changes when the loop-record contract changes, P3), not a new module (no
  new file, no catalogue churn). Its header's first line is reworded from "the ONE implementation of the loop-record's
  `## Handoff` grammar" to the loop-record's shared vocabulary (the Handoff grammar and the blocked-stop ids), so the
  file's own description stays true (grill finding 4). `check-loop-decision.mjs` imports it, as it already imports
  `loop-mode-core.mjs`.
  `loop-closeout.mjs`'s shape-only `BLOCKED_RE` (`:137`, `:414`) is left alone: a blocked stop never commits, the
  record check's RED now precedes it, and `loop-closeout.mjs` is G6's file in this batch.

## Files

- `.dev/features/loop-marker-integrity/PLAN.md` — this plan — dev apparatus
- `.dev/features/loop-marker-integrity/GRILL.md` — the grill log — dev apparatus
- `.dev/features/loop-marker-integrity/BUILD-NOTES.md` — build notes (the human-patch sequence, measurements) — dev apparatus
- `.dev/features/loop-marker-integrity/apply.py` — the owner-run hook patch (batch protocol); written here, NEVER committed — dev apparatus
- `.dev/features/loop-marker-integrity/DOCS-PROPOSAL.md` — exact replacement text for LIMITS.md / THREAT-MODEL.md (human-applied by the orchestrator's script) — dev apparatus
- `pharn/floor/loop-record-core.mjs` — export the frozen `BLOCKED_IDS` — product floor
- `pharn/floor/check-loop-record.mjs` — A8 `blocked` membership (`BLOCKED_UNKNOWN`); L14 comment corrected — product floor
- `pharn/floor/check-loop-record.test.mjs` — made-up id RED; every table id GREEN (extracted from the command); contract list == `BLOCKED_IDS` both ways — product floor tests
- `pharn/floor/check-loop-decision.mjs` — marker `mode` read (`MODE_UNWITNESSED`); blocked skip only for a member (`BLOCKED_UNKNOWN`) — product floor
- `pharn/floor/check-loop-decision.test.mjs` — quick SPEC + `mode: quick` record + marker without mode → RED `MODE_UNWITNESSED`; marker `mode: quick` → GREEN; non-member blocked → RED; real `--open --mode quick` marker read — product floor tests
- `pharn/floor/pre-run-snapshot-core.mjs` — header: "every `--open` rewrites the marker" → a re-opened run needs `--close` first and is still another run — product floor
- `pharn/floor/pre-run-snapshot.mjs` — header line 19 likewise — product floor
- `pharn/floor/pre-run-snapshot.test.mjs` — WIRING substitutes `<mode>` — product floor tests
- `pharn/pharn-contracts/loop-record.md` — the frozen blocked-id list between markers; `mode` witnessed by the marker (`MODE_UNWITNESSED`); the re-open refusal and its bound — contract
- `.claude/commands/pharn-loop.md` — Step 1a `--open … --mode <mode>` + its refusal; grant set (`--open * --cap * --mode *`, flagged isolation line ungranted); "No prompt" bullet names the one ungranted line; :535 turn-end wording — product command
- `.claude/commands/pharn-loop-quick.md` — item 1: `<mode>` is `quick`; strike the "writes no mode marker" sentence — product command part
- `.claude/hooks/require-loop-record.test.cjs` — `--open` twice → exit 2, first bytes kept; `--mode quick|full` written, bad mode refused; atomic write (stubbed failing write leaves no `active.json`, no tmp); pinned line substitutes `<mode>` — hook tests (writable)
- `.dev/floor/command-hygiene.test.mjs` — `LOOP_GUARD_OPEN` gains `--mode <mode>`; `SHELL_VALUES` `<mode>`; the one ungranted line + corpus test (no `allowed-tools` entry contains `--accept-host-execution`); `cannot end its turn` absent; `STUCK_POINTS` ids == `BLOCKED_IDS` — dev apparatus
- `.dev/guides/floor-orchestration.md` — `require-loop-record.cjs` usage + refusal; `check-loop-record.mjs` / `check-loop-decision.mjs` new REDs — dev apparatus
- `pharn/floor/check-run-isolation.mjs` — BUILD AMENDMENT A1: `--accept-host-execution` accepted only as the FIRST argument — product floor
- `pharn/floor/check-run-isolation-core.mjs` — A1: the `usage` refusal text names the new order — product floor
- `pharn/floor/check-run-isolation.test.mjs` — A1: a trailing flag is `usage`; the leading one is accepted — product floor tests
- `pharn/floor/entry-gates.test.mjs` — A1: the WIRING pin's flagged line in its new order — product floor tests
- `.claude/hooks/protect-trusted-paths.test.cjs` — AMENDMENT A2: the Write tools are denied the three run-state subtrees, per path, both passes, with the runstate deny body — hook tests (writable)
- `.claude/commands/pharn-loop-close.md` — A2: the witness sentence no longer says the Write tool reaches it — product command part
- `pharn/floor/run-marker.mjs` — A2: its header no longer says the Write tool can plant a file at `pharn/.run/<command>/<name>` — product floor
- `pharn/floor/regress-base-reuse-core.mjs` — A2 (review LOW): the marker-identity comment ("each `--open` rewrites it", "no reader reads a marker's fields") corrected — product floor
- `pharn/floor/stage-regress.test.mjs` — two `other-run` tests re-opened the loop marker with a second `--open`; under D1 a re-open is `--close` then `--open` (found by `npm test` in the apply.py proof clone) — product floor tests
- `pharn/floor/run-marker.test.mjs` — two WIRING tests execute the loop's `--open` line and must substitute `<mode>` (found by the build's first `npm test`) — product floor tests
- `.dev/guides/floor-gates.md` — A1: the isolation CLI usage line — dev apparatus
- `.claude/hooks/require-loop-record.cjs` — MAINTAINER-APPLIED (apply.py, owner, 2026-11-03), committed in `bc9c9bc8` before the re-anchor; listed after the fact so `/pharn-dev-regress`'s scope check reads the truth (the `hook-hardening-batch` precedent); no write tool can reach it — hook
- `.claude/hooks/protect-trusted-paths.cjs` — MAINTAINER-APPLIED likewise (A2), same commit — hook
- `README.md` — one sentence: the line that accepts host execution is not pre-approved — repo meta
- `CHANGELOG.md` — `## [Unreleased]` entries — repo meta

## Build amendment A1 (found at build, after GATE 1 — reported to the orchestrator)

The new test "each LOOP_UNGRANTED_LINES line is … covered by NO grant" went RED on the first run: deleting the flagged
grant was not enough, because the UNFLAGGED grant `Bash(node pharn/floor/check-run-isolation.mjs --feature * >
pharn/.run/pharn-loop/*/isolation.json)` matches `--feature '<name>' --accept-host-execution > …` — the `*` absorbs the
flag (a measured failure of D3 as planned, not a hypothetical). Fix: `check-run-isolation.mjs` accepts
`--accept-host-execution` only as its FIRST argument (anywhere else is `usage`, exit 2 → S15), and the pinned flagged
line becomes `node pharn/floor/check-run-isolation.mjs --accept-host-execution --feature '<name>' > …`. No granted
pattern starts that way, and the granted pattern can no longer carry the flag to a CLI that honours it. Bound: this
reasons over Claude Code's `*` as "any text", the reading `bashGrantRe` encodes; the harness's real matcher is not
asserted here (ADVISORY).

## Amendment A2 (the orchestrator's independent review of apply.py, before hand-over)

1. CONFIRMED HIGH: the Write tool could overwrite `pharn/.run/pharn-loop/<name>/active.json` (any cap, any mode)
   prompt-free — `enforce-writes-scope.cjs` always allows `pharn/.run/**`, and `protect-trusted-paths.cjs` had no entry
   for it — so the `--open` refusal closed only the CLI route. Measured this run: no product command or part
   (`git grep` over `.claude/commands/pharn-*.md` and `.claude/agents/*.md`) writes ANY file under
   `pharn/.run/pharn-loop/**`, `pharn/.run/pharn-ship/**` or `pharn/.run/pharn-review/**` with the Write or Edit tool;
   every file there is written by a CLI (the markers — `require-loop-record.cjs`, `run-marker.mjs`; the isolation
   witness — `check-run-isolation.mjs`'s redirect; a stage result — `stage-agent.mjs report`; freshness, closeout,
   stage list, stamps — their floor scripts). So `protect-trusted-paths.cjs` gains a closed `RUN_STATE_SUBTREES` rule
   over the three directories, judged like git metadata (literal, real and physical targets; no escape, regardless of
   scope), with its own deny body naming the CLIs that own the files. A subtree, not a file list, because a list of
   today's file names would leave tomorrow's out (L29/L36). The directory paths themselves stay writable (a planted
   FILE there already fails closed). Remaining route, stated: a Bash write still reaches every one of these files.
2. LOW: `--close` crashed (EISDIR) on a directory at the marker path. It now refuses a non-regular-file marker (exit 2,
   "a human must remove it"), and `--open`'s refusal promises `--close` only for a regular-file marker.
3. LOW: `regress-base-reuse-core.mjs:48-52` corrected.
4. INFO: the `wx` failure path removes the tmp only when this process created it.

## Human-applied patch (NOT in `## Files` — the setter refuses a hook script, and a human writes it)

- `.claude/hooks/require-loop-record.cjs` — via `.dev/features/loop-marker-integrity/apply.py` (never committed;
  stdlib Python, pinned BEFORE/AFTER sha256, check-all-then-write-all): `markerMode` `--open <name> --cap <M> [--mode
full|quick]`, `mode` written into the marker when given; refuse (exit 2) when anything exists at the marker path;
  write tmp → `renameSync`, every write failure exit 2 with no marker; usage text; header: THE MARKER block
  (grammar, refusal, its bound), and the stale "NOT PROTECTED by protect-trusted-paths.cjs" paragraph (`:88-90`) —
  false since the hook joined that guard's list (`protect-trusted-paths.cjs:395`) — corrected. Sequence (L68): build
  writes + commit → apply.py proven in a clone → **APPLY READY** stop → owner applies → AFTER hashes verified → commit
  "loop-marker-integrity: maintainer-applied human patch" → re-run build Step 0 (setter, then `--anchor`) → regress /
  verify / review. Consequence, stated (grill finding 5): the re-anchor starts a new epoch, so this build's own
  Write-tool writes, all committed before it, sit outside every reconcile window; the hooks judged each of them at
  write time, and `git diff origin/batch/audit-2026-11-03` is the record of what changed.

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md` — the envelope's `blocked` key gains its closed set; `mode` keeps its meaning
  (the invocation) and gains a witness; `cap`'s marker paragraph gains the re-open refusal. Cited, not restated, by
  both checkers (P4).
- `pharn/pharn-contracts/finding-shape.md` — untouched; no finding object changes.

## Evals to write (P1)

No Capability is added or changed (no `role:` file), so no `evals/` case is owed; the behaviour tests are the
`node --test` cases named in `## Files`:

- `check-loop-record`: `blocked: totally-made-up-id` → exit 1 `BLOCKED_UNKNOWN`; each id extracted from the
  stuck-point table → exit 0; a `blocked` value with a control char → exit 1.
- `check-loop-decision`: quick SPEC, record `mode: quick` / `STOP_GREEN_QUICK`, marker with no `mode` → exit 1
  `MODE_UNWITNESSED`; same with marker `mode: quick` → exit 0; full record + marker `mode: quick` → exit 1; blocked
  non-member → exit 1 (not SKIPPED); blocked member → exit 0 SKIPPED.
- hook: `--open` twice → second exit 2, `active.json` bytes unchanged; `--mode quick` → marker `mode: "quick"`;
  `--mode fast` / `--mode` alone → exit 2, nothing written; a `writeFileSync` stubbed to write half and throw → exit 2,
  no `active.json`, no tmp left.
- command corpus: no `allowed-tools` entry in any `.claude/commands/pharn-*.md` contains `--accept-host-execution`;
  the flagged isolation line is pinned in Step 1a and covered by no grant; `cannot end its turn` absent.

## Guarantee audit (P0)

- "`--open` cannot overwrite an open marker" → floor: the hook's `lstat` refusal before any write (a writer, Bash-run —
  ADVISORY that a run calls it; a Bash `rm` or `--close` first still re-opens, and two concurrent opens of one name race
  between the `lstat` and the `rename`: stated bounds).
- "a full-invoked run over a quick SPEC is not committed" → floor: enum equality in `check-loop-decision.mjs`
  (`MODE_UNWITNESSED` + `MODE_MISMATCH`), gating Step 6c — GIVEN the marker was opened with the true `<mode>`; that the
  model typed the true mode is advisory (L43: agreement, never provenance).
- "a made-up `blocked:` id is refused" → floor: set membership over `BLOCKED_IDS` (primitive #3), after `cleanScalar`.
- "the contract's id list, the code's and the command's stuck-point table agree" → floor: test-time set equality (a
  `node --test` assertion over committed text), not a runtime check.
- "the `--accept-host-execution` line is not pre-approved" → floor: test-time membership over the committed
  `allowed-tools` list. That Claude Code then asks the person is harness behaviour — ADVISORY.
- "the marker is never torn" → floor-adjacent: `renameSync` publishes a fully written file; a crash before the rename
  leaves only a tmp the guard never reads (the guard reads `active.json` only).

## Trust audit (P2)

- The marker is run-writable state (`pharn/.run/**`); its new `mode` is reduced to one of two enum tokens before any
  comparison and never quoted. The record's `blocked` value is untrusted model-typed text: it is quoted only through
  `JSON.stringify` of a control-char-free string, and it now decides a SKIP only by exact set membership. No free text
  reaches a decision.

## Open questions (HALT)

- None blocking. D1 (refuse, not refresh; the snapshot-hash half declined) and D3 (prompt via permission settings, not
  an env var) are the two calls for the orchestrator to confirm or overturn at GATE 1.
