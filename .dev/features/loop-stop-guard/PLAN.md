# PLAN — loop-stop-guard

- spec_content_hash: 2f8b92646bdf31d51169f46c74c14c10debdb456291fb0213be63cfc4d77e838
- applied_lessons: [L18, L19, L22, L31, L34, L35, L36, L37, L40, L41, L44, L45, L50, L52]
- increment: a `Stop` hook refuses to end a turn while an unattended `/pharn-loop` run is open in this session and has written no `LOOP.md` — bounded, session-bound, fail-open, and inert until a human wires it.
- layer(s): `.claude/hooks/` (a new deterministic hook, product surface), `.claude/commands/pharn-loop.md` (product command), `.dev/floor` (hygiene pins)
- constitution_refs: [P0, P2, P3, P5, P6, P7]

## Why (P7)

The original incident (`CHANGELOG.md` §6.3.0) was a run that finished early and wrote a summary naming the
gates it had skipped. #230 made the gate map tested code. #242 made a stale or skipped stage re-run
instead of being reported. What stays true after both is that nothing stops the model from **ending the
turn anyway**: the re-run instruction is command prose. `.claude/settings.json` wires only `PreToolUse`.
This increment adds the one missing refusal. While a loop run is open in this session, ending the turn
requires a record. A run that genuinely cannot continue satisfies it by writing a blocked record, which
is the honest ending the loop already knows how to produce and what S11 exists for.

## Correcting the record (prompt 3/3, re-verified at `1a8b027`, SKILLS 6.10.0)

The platform facts were read from the RAW hooks reference, fetched to the scratchpad. A model summary of
the page was used first, and it hallucinated two defaults (see L37).

- **"after 8 consecutive Stop-hook blocks it ends the turn"** — confirmed verbatim: "Claude Code overrides
  the hook and ends the turn after 8 consecutive blocks."
- **"`CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` moves that threshold"** — **not documented.** The string appears
  **0** times in the page (`grep -c`). The summary model twice invented a default (5, then 10) for it. The
  guard's own cap is therefore bounded against the documented 8 and names the env var nowhere.
- **"Exit 2 on Stop … Exit 1 and every other non-zero code are non-blocking"** — confirmed. The exit-code
  table says Stop exit 2 "Prevents Claude from stopping, continues the conversation", and any exit other
  than 2 without valid JSON is a non-blocking error.
- **There is a THIRD channel the prompt does not name.** `hookSpecificOutput.additionalContext` is
  "non-error feedback that continues the conversation". It has the same loop protections, and "no hook
  error notification is shown". So the cosmetic "Stop hook error" (anthropics/claude-code#34600) is
  specific to `decision: "block"` / exit 2.
- **Input fields** — confirmed: `stop_hook_active`, `last_assistant_message`, plus the common `session_id`,
  `cwd`, `permission_mode`, `transcript_path`, and two the prompt omits, `background_tasks` and
  `session_crons`.
- **Exec form** — confirmed: `args` present means no shell. Path placeholders are substituted into
  `command` and each `args` element, and the page says "Prefer exec form for any hook that references a
  path placeholder".
- **Timeout default 600 s**, and a canceled hook "renders no decision" — confirmed.
- **Handlers run in the current directory**, and `CLAUDE_PROJECT_DIR` is substituted and exported —
  confirmed. The page ALSO says `${CLAUDE_PROJECT_DIR}` stays at the session's start root inside a
  worktree while `cwd` follows Claude. That is why the guard resolves its root from its own cwd, exactly
  as the two write guards do.
- **pharn-cli** is at `f853390`, not `cc2c8c4`. The cited facts still hold there:
  `src/lib/install-capabilities.ts` copies `.claude/hooks/*.cjs` minus tests, and writes `settings.json`
  only when absent (`settingsPreserved`).

## Phase 0 answers

1. The platform facts: see above.
2. **D2's rejection holds.** `/pharn-ship` opens `run-start` at `pharn-ship.md:129`, before the GATE-1 turn
   ends at `:170`. It uses the same `DEFAULT_BASE` (`mark-phase.mjs:77`, `.pharn/cost`), and a marker line
   carries `{kind, session_id, …}` with no command field (`mark-phase.mjs:190-240`). So a markers-based
   guard would block every `/pharn-ship` SPEC-approval turn.
3. **`CLAUDE_CODE_SESSION_ID` reaches Bash**, measured in this session: the variable equals the session's
   id (`3ce90533-…`, the scratchpad directory's name). It is therefore also the value a Stop payload's
   `session_id` carries. There is no committed `markers.jsonl` in this repo to cross-check, and the bound
   is stated: if the variable were ever unset, the marker records `null`, which matches no session, and
   the guard is INERT for that run (fail-open), never blocking.
4. **What #242 shipped:** `pharn/floor/check-loop-fresh.mjs`, exits `0 FRESH · 1 RERUN · 2 INCONCLUSIVE ·
4 STOP`, ledger `.pharn/pharn-loop/<name>/freshness.jsonl`, stuck point **S11** `blocked:
stale-evidence`, outcome `not committed: evidence stale`.
5. **No test assumes one hook event.** `hook-wiring.test.cjs:44` reads only `settings.hooks.PreToolUse`.
   One trusted sentence would become incomplete (still true): `pharn/CONSTITUTION.md:119-120`, "wires two
   `PreToolUse` write-guards and no prompt hook". It goes to the PR body as proposed human text.
6. **Inert-path cost:** measured at build, reported in `VERIFY.md` and the PR.

## Applied lessons

- L18 — the exclusion block is a `###` heading.
- L19 — the marker writer and remover are Bash-run: declared as such, never described as gate-covered.
- L22 — the marker is opened and closed by pinned lines that call the hook script's own `--open` /
  `--close` modes. There is no `node -e` for a model to re-type.
- L31 — `workTreeRoot()` becomes a THREE-way copy, and the existing ✧ byte-equality pin is widened to
  all three files.
- L34 — every inert case is paired with a blocking control on the same fixture, so "exit 0" cannot mean
  "the guard never looks".
- L35 — the marker's schema lives in ONE file, the hook, which both writes it (`--open`) and reads it. It
  is not a pinned `node -e` in the command plus a reader in the hook.
- L36 — the block message is from a closed set, and a test pins every message the hook can emit.
- L37 — the platform facts were PROBED against the raw page, not read off a summary. The summary was
  wrong twice.
- L40 — the wiring test's negative control varies the attributed condition: a mistyped (relative) path
  from a subdirectory fails to start, so the test can tell the fix from the defect.
- L41 — every default (`K = 3`, the 24 h ceiling, the absent `PHARN_STOP_GUARD_MAX`) is exercised by a
  test that sets nothing.
- L44 — the new pinned lines carry no shell state.
- L45 — the wiring entry is EXECUTED in exec form from a subdirectory, and the loop's pinned
  `--open`/`--close` lines are extracted and executed.
- L50 — the sweep is by referent: every cite of "two hooks" / "three hook scripts" / "PreToolUse only" /
  the settings `_comment`.
- L52 — the inert conditions, the blocking conditions and the fail-open conditions are each a counted
  set, iterated.

## Design (HALT 1 decided under the user's delegation)

**Recommendation: build it, with its leverage stated plainly.** It cannot make a model do work. It turns
"finished early with a summary about skipped gates" from a silent ending into an ending that must first
write a record, up to K times. The smaller alternative, a marker plus a louder Step 7 sentence, is
exactly the discipline-only remedy L20 says recurs. The blast radius (a false block costs a person a
turn) is bounded by session binding, the plan-mode skip, the age ceiling, the counter and fail-open, and
each of those has its own test.

- **D1 kept.** `.claude/hooks/require-loop-record.cjs`: stdlib-only, no network, no LLM, no child
  process. `workTreeRoot()` is copied byte-for-byte, and the ✧ pin becomes three-way. There is no slug
  regex: the reader takes the name from a `readdir` entry (one segment by construction), `lstat`s it and
  containment-checks it. The writer (`--open`) refuses any name that is not a single plain segment.
- **D2 kept, with one change: the marker has ONE owner (L35).** The hook script has three modes:
  - `--open <name> --cap <M>` writes `.pharn/pharn-loop/<name>/active.json` =
    `{schema: "pharn-loop-active/1", name, session_id, started_at, cap}`, with `session_id` taken from
    `CLAUDE_CODE_SESSION_ID`;
  - `--close <name>` removes it;
  - no arguments means the Stop guard, reading the payload on stdin.

  `/pharn-loop` Step 1a runs `--open` right after the pre-run snapshot. The Final step runs `--close`
  beside `set-writes-scope.cjs --clear`, with the Final step's ADVISORY framing.

- **D3 kept.** It blocks only when a run is open for THIS session and `pharn/features/<name>/LOOP.md` is
  absent or empty (whitespace-only counts as empty). It never judges record quality: a LOOP.md that
  `check-loop-record.mjs` would RED still ends the turn (a test pins that). It never checks freshness. It
  is inert when the session differs, `permission_mode` is `plan`, the marker is older than 24 h, or no
  marker exists. **It fails OPEN on anything unexpected**, the reverse of the write guards, and the header
  says why.
- **D4 kept.** The counter lives in `.pharn/pharn-loop/<name>/stop-blocks.json`, keyed by session.
  `K = 3`, overridden by `PHARN_STOP_GUARD_MAX` (a positive integer ≤ 7, so it always sits under the
  platform's documented 8). After K it allows the stop with a `systemMessage`, so the person sees that
  the run ended without a record.
- **D5 — the channel: exit 0 with JSON `{"decision":"block","reason":…}`, NOT exit 2.** The reason is the
  fail-open stance: with JSON-at-exit-0, the ONLY way to block is a complete, parsed document, so a crash,
  a partial write or any non-zero exit is non-blocking by construction. The write guards fail closed and
  rightly use exit 2; this guard fails open, so it uses the opposite channel. The same channel carries the
  budget-exhausted `systemMessage`. `additionalContext` (no "Stop hook error" label) was weighed and
  rejected for now. `decision: "block"` is the long-standing documented field. The "Stop hook error" label
  is cosmetic and is named in the PR. Switching the channel is a one-line follow-up.
- **D6 kept.** The Stop entry in exec form is
  `{"type":"command","command":"node","args":["${CLAUDE_PROJECT_DIR}/.claude/hooks/require-loop-record.cjs"],"timeout":10}`,
  matcher-less. `settings.json` is protected (fix #2), so the exact diff goes to
  `.dev/features/loop-stop-guard/settings-patch/APPLY.md` and the PR body, **unapplied**. The order is the
  hook file first, then the wiring; roll back in reverse. `hook-wiring.test.cjs` gains a SECOND shape for
  the matcher-less exec-form entry. The existing PreToolUse reader is not widened.
- **D7 kept.** CLAUDE.md gets a block, `pharn-loop.md` gets the two steps and one Guarantee-audit line,
  and README counts are regenerated. Human-only text (`LIMITS.md §7`, `pharn/CONSTITUTION.md:119-120`)
  goes to `APPLY.md` and the PR body.
- **Bumps:** `SKILLS_VERSION` 6.10.0 → **6.11.0** (minor: a newly shipped product hook and a new loop
  capability). `pharn-loop.md` `version:` 0.7.0 → **0.8.0**. **`MIN_CLI` untouched**: the CLI copies
  `.cjs` hooks minus tests, and an older CLI installs this tree correctly.
- **Not protected by fix #2, stated.** The new hook is NOT in `protect-trusted-paths.cjs`'s control list,
  because adding it would mean editing a hook-protected file, so a Write-tool edit could disarm it. That
  is proportionate for a FAIL-OPEN, advisory guard, where a model can already disarm it by deleting the
  marker through Bash. It is named in the header and the PR as a human follow-up. A Bash edit to it is
  still caught by `reconcile`, because `.claude/hooks/*` is always-reconciled.

## Files

- `.claude/hooks/require-loop-record.cjs` — NEW: the Stop guard plus its `--open`/`--close` marker modes;
  header carries WHAT IT CANNOT DO verbatim, the fail-open stance, the two caps, the bounds — hook
- `.claude/hooks/require-loop-record.test.cjs` — NEW: inert / blocking / budget / `stop_hook_active` /
  fail-open / containment / marker modes / the loop's pinned lines executed — hook test
- `.claude/hooks/hook-wiring.test.cjs` — a second, matcher-less exec-form shape: the committed Stop entry
  is either absent (not yet wired — reported) or exactly the expected one; the expected entry is EXECUTED
  from a subdirectory with a negative control — hook test
- `.claude/hooks/enforce-writes-scope.test.cjs` — the ✧ `workTreeRoot()` byte-equality pin becomes
  three-way — hook test
- `.claude/commands/pharn-loop.md` — Step 1a `--open`, the Final step `--close`, one Guarantee-audit
  line, the Trust line, `version: 0.8.0` — product command
- `.dev/floor/command-hygiene.test.mjs` — the open/close lines each spelled once, in order, with a
  DISCRIMINATES mutant for each — dev apparatus
- `.dev/features/loop-stop-guard/settings-patch/APPLY.md` — the exact `settings.json` diff and the
  proposed `LIMITS.md §7` / `CONSTITUTION.md:119-120` text, for a human — dev apparatus
- `CLAUDE.md` — a block for the guard, and the "hooks wired" sentences swept — repo meta
- `CHANGELOG.md` — `[Unreleased]` → `### Added`, `6.11.0` — repo meta
- `SKILLS_VERSION` — `6.11.0` — repo meta
- `README.md` — the badge, and the generated hook-script count (3 → 4) — repo meta

### Written by `npm run docs:generate` (Bash, declared — L19/L39)

- `README.md`'s `CURRENT-STATE` region (hook scripts 3 → 4).
- `docs/capabilities/README.md` — only if the generator changes it.

### Deliberately NOT in scope

- `.claude/settings.json` — protected (fix #2). Its diff is staged for a human.
- `.claude/hooks/protect-trusted-paths.cjs`, `.claude/hooks/enforce-writes-scope.cjs`,
  `.claude/hooks/set-writes-scope.cjs` — protected, and unchanged. Only their tests move.
- `pharn/floor/**` — no floor checker changes. The freshness checker is #242's.
- The four trusted docs — proposed text only.
- `MIN_CLI`, and `/pharn-ship` (it stops for human gates by design).

## Guarantee audit (P0)

- **"While a loop run is open in this session, a turn end is refused up to K times unless a `LOOP.md`
  exists"** → **advisory infrastructure, not a new floor primitive.** The decision is a deterministic hook
  (membership + file-existence tests), but it acts only when Claude Code STARTS it (`LIMITS.md §7`), and
  its whole purpose is to refuse, never to force work. It becomes "hook-grade" only once a human wires
  it. Until then it is inert, and the wiring test says so.
- **"It never blocks on record quality or freshness"** → a test pins that a check-loop-record-RED `LOOP.md`
  still ends the turn.
- **"A false block is bounded"** → FLOOR within the hook: session equality, the `plan` membership test, an
  age comparison, a counter compare. Each is tested. Claude Code's own 8-block override is the outer bound,
  and it is the platform's, not ours.
- **NOT claimed, repeated verbatim in the header:** it cannot make a model do work; it cannot judge a
  record; it cannot tell a real record from a fabricated one (`touch LOOP.md` satisfies it); it only runs
  when Claude Code starts it; it reaches existing installs only by hand.

## Trust audit (P2)

- The payload is Claude Code's JSON. The guard reads `session_id` (string equality), `permission_mode`
  (membership) and `cwd`. It never reads `last_assistant_message` or `transcript_path`, and never quotes
  either.
- The marker and counter are `.pharn/` state Bash can write. They are shape-checked, `lstat`-ed and
  containment-checked, and any anomaly is INERT (fail-open).
- The block `reason` re-enters Claude's context as an instruction. It comes from a closed set, and the
  only variable is a JSON-quoted relative path built from a validated `readdir` entry.

## Determinism audit (P5)

Every branch is membership, string equality, an integer compare, or file existence. The terminal fallback
is "allow the stop", which is fail-open, and on the budget path it tells the person.

## Tests

- **Inert (each paired with a blocking control):** no marker; another session; `permission_mode: plan`;
  an aged marker; a `/pharn-ship` run in progress (cost markers with `run-start`, no `active.json`) — the
  regression that killed the markers design.
- **Blocking:** open and no LOOP.md; open and an empty or whitespace-only LOOP.md. A non-empty LOOP.md
  that `check-loop-record.mjs` REDs is ALLOWED (D3).
- **Budget:** K blocks then allow with `systemMessage`; the counter persists across calls; another session
  starts fresh; `PHARN_STOP_GUARD_MAX` moves K; an invalid value falls back to 3.
- **`stop_hook_active: true`** does not allow by itself; `false` on a re-entry does not reset the counter.
- **Fail-open (a counted set):** unreadable marker, corrupt JSON, missing directory, unwritable counter,
  malformed stdin, missing `session_id`.
- **Containment:** an entry that is a symlink out of the state root is ignored.
- **Marker modes:** `--open` writes the schema with the env session id; `--close` removes it; a non-plain
  name is refused.
- **Wiring:** the expected exec-form entry runs from a subdirectory and blocks. A negative control (a
  relative path from the subdirectory) does not start.
- **Parity:** `workTreeRoot()` is byte-equal across all three hooks.
- **Loop hygiene:** `--open` in Step 1a and `--close` in the Final step, each spelled once, with a
  DISCRIMINATES mutant for each. The pinned lines are executed end to end against a fixture.
- ≥90% line coverage on the new hook.

## Open questions (HALT)

- None. GATE 1 is delegated for this batch. HALT 2's `settings.json` diff is staged for the human by
  design, not asked.
