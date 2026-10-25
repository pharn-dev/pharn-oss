# PLAN — entry-timeout-unmeasured: a gate the entry runner killed at its timeout is not measured, not red

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L29, L34, L35, L36, L62, L64, L72, L75]
- increment: `entryVerdict` stops counting a gate the entry runner did not measure (killed at `--timeout-ms`, or exit
  126/127) as red. It lists such gates in a new `unmeasured` field, through `gate-run-core.mjs` `unmeasuredRuns`. A new
  `--wait` status `unmeasured` (exit 6) becomes `/pharn-loop`'s new stop S14b `blocked: gates-unmeasured-at-entry`, and
  `/pharn-ship` asks Stop/Continue on it, as it does for exit 4.
- layer(s): product floor (`pharn/floor/entry-gates-core.mjs`, `entry-gates.mjs`), product commands
  (`.claude/commands/pharn-loop.md`, `pharn-ship-stages.md`); apparatus (hygiene test, floor guide); repo-meta (README
  prose and badge, CHANGELOG, SKILLS_VERSION)
- constitution_refs: [P0, P3, P4, P5, P6, P7]
- version: SKILLS_VERSION 6.73.2 → 6.74.0 (minor: a new `--wait` status, exit code, document key and stop row, which is
  new behavior. 6.59.0, the same split for verify and regress, was a minor bump too)

## The failure (P7, observed 2026-10-25)

Two measured `/pharn-loop` runs on 6.73.2 in the user project pharn-starter both ended `INCONCLUSIVE ·
gates-red-at-entry (S14)`. Sources: `.dev/measurements/loop-wall-clock-2026-10-25.md` §§1, 5, 9, 11, on branch
`docs/loop-cost-2026-10-25` (PR #392, unmerged), read this run with `git show`; the raw stamps are
`~/Projects/pharn-measure/run{1,2}/pharn-state/pharn-entry/gates/stamp.json`, read this run as DATA. Both stamps hold
the same five runs: `lint` 0, `format:check` 0, `base:test` 0, `test` **exit 143, `timed_out: true`**, `typecheck` 0.
The `base:test` slot ran the same suite and passed in about 538 s. The suite takes about 503 s run alone. The pre-run
snapshot held 0 paths. So the run stopped with "a gate was red on the tree the run started from" when no gate was
measured red: the runner's 540 s clock ran out. Verify has drawn this line since 6.59.0 (`check-verify.mjs` row 0,
INCONCLUSIVE `gate-not-measured`), and so has regress (`head_timed_out` / `base_timed_out`). The entry check is the one
reader left that counts a timeout as red.

## Discovery (read this run; `origin/main` = `471a54bb`, SKILLS_VERSION 6.73.2)

1. **The rule.** `pharn/floor/entry-gates-core.mjs:259`: `if (!(r.exit !== 0 || r.timed_out === true)) continue;`. A
   timed-out run, or one that exited 126/127, falls through to `red` (non-style) or to `red`/`unattributed` (style).
   The header's line 16 states the rule: "RED when its recorded exit is non-zero or it timed out".
2. **The one owner of "not measured".** `pharn/floor/gate-run-core.mjs:1174` `unmeasuredRuns(stamp)` → `[{id, cause}]`,
   with `cause` in `UNMEASURED_CAUSES` (`not-started`, `timed-out`). Timed out wins whatever the exit; exit in
   `NOT_STARTED_EXITS` (126, 127) means not started. `check-verify.mjs:339` reads it. `entry-gates-core.mjs` already
   imports from `gate-run-core.mjs`, the layer below it, so importing it adds no new dependency edge (P3).
3. **The statuses.** `STATUSES` = green, red, no-gates, continue, unusable. `EXIT` = 0, 4, 3, 5, 2 (never 1). `DOC_KEYS`
   is closed; `documentDefect` treats `green`/`red` as the verdict statuses that need a `CHANGES_RECORD` member
   (`entry-gates-core.mjs:311`, the only literal comparison of a status in the floor). `entry-gates.mjs` `emitDoc`
   returns `EXIT[doc.status]`. `decideDone` emits `verdict.status` and publishes the base-evidence offer on every
   decided result (its comment says "green or red"). `entry-observations.mjs:74` imports `STATUSES` as `WAIT_STATUSES`,
   so the new member reaches its validator without an edit. No test pins `WAIT_STATUSES`' members.
4. **Where 540000 comes from.** It is a literal pinned in the commands: `pharn-loop.md:76/352` (entry `--start` grant and
   line), `pharn-ship-stages.md:192`, and the same value on the regress/verify/build lines. No config key sets it.
   `pharn/pharn-contracts/stage-exit.md` explains the bound: those stages run each gate inside ONE Bash call (600 s
   cap). So raising only the entry timeout would move the stop from entry to verify. Not this increment (out of
   scope, below).
5. **The commands.** `pharn-loop.md` Step 1 (`--allow-red-entry` sentence, :236–238), Step 2 intro (":375 S4–S14
   **stop** it"), the S14 table row (:396), the Step 4 `--wait` branch (:642–656) and its Step 7 summary sentence.
   `pharn-ship-stages.md:280–284`: `4`, `2` or anything else → present `red` ids or `reason_code` and ask Stop/Continue.
   Exit 6 would fall into "anything else" today, but the text would present empty `red` ids. The quick parts
   (`pharn-loop-quick.md:32`, `pharn-ship-quick.md`) and both close parts enumerate no `--wait` exit and no S-code row:
   checked by grep this run (sweep below).
6. **Pins.** `.dev/floor/command-hygiene.test.mjs:1756` `STUCK_POINTS` (16 rows, the count asserted at :1871). A
   closure test (:1899) requires every `` `blocked: …` `` spelling in `pharn-loop.md` to be a member.
   `pharn/floor/entry-gates.test.mjs` pins the current, wrong behavior twice: `:96` "a timeout is red" and `:446` "CLI:
   a timed-out gate is red" (exit 4). The ★ WIRING test (:683) checks branch regexes within 1,900 bytes after the wait
   line. The loop's `changed_paths` is 628 bytes after it today and ship's last row 656, so there is room. `:766` pins
   the S14 row. `check-loop-record.mjs` ignores the `blocked:` value (no closed set to extend).
7. **Budgets.** `pharn-loop.md` is 61,644 B against a 65,024 ceiling and `pharn-ship-stages.md` 30,053 B against
   33,280. The additions here are well under 1 KB each.

## Design

1. **The rule (`entry-gates-core.mjs` `entryVerdict`).** Compute `unmeasured = unmeasuredRuns(stamp)` without the
   `ENTRY_BASE_TEST_ID` slot, imported from `gate-run-core.mjs` and never re-derived. In the per-run loop, `base:test`
   is skipped first (as today). Then a run in the unmeasured set is skipped, because it is reported in `unmeasured`.
   Only then is a non-zero exit red. Style attribution is unchanged for measured reds. An unmeasured STYLE gate is
   listed in `unmeasured` whatever the feature-directory digests say: the cause is the clock or a missing binary, never
   front-stage content, so attribution has nothing to weigh. The verdict gains `unmeasured: [{id, cause}]`, in run
   order.
2. **Precedence: red first.** `status` = `red` if any attributable red exists, else `unmeasured` if any unmeasured gate
   exists, else `green`. Why entry differs from verify's unmeasured-first: verify ranks unmeasured first because a FAIL
   would send `/pharn-loop` into a rebuild aimed at a hang. At entry both statuses stop the run (or both go on under
   `--allow-red-entry`), so nothing rebuilds. The measured red is the certain claim (verify cannot pass that gate unless
   the run fixes it), and the unmeasured one is the uncertain claim. The document lists both, so a red-first stop still
   names the unmeasured gates (the loop copies both into `### next_steps`). **Approved at GATE 1.**
3. **Status, exit, document.** `STATUSES` gains `unmeasured`, and `EXIT.unmeasured = 6` (0, 2, 3, 4 and 5 are taken; 1
   is never used). `DOC_KEYS` gains `unmeasured` (after `unattributed`). `entryDocument` writes `verdict.unmeasured` or
   `[]`, so every status's document carries the key. `documentDefect`:
   - the verdict statuses become `green`, `red`, `unmeasured` (each needs a `CHANGES_RECORD` member);
   - `unmeasured` must be an array of `{id, cause}`, with a non-empty string `id` and `cause` in `UNMEASURED_CAUSES`;
   - a document with status `unmeasured` must carry a non-empty `unmeasured` and an empty `red`.

   The header's VERDICT RULE and WHAT IT DOES NOT CLAIM sections say the new rule. They cite `gate-run-core.mjs`
   `unmeasuredRuns` for what "not measured" means and its bounds (a slow machine and a hang look the same), and do not
   restate them (P4).

4. **The CLI (`entry-gates.mjs`).** The header's `--wait` exit list gains `6 unmeasured`. The `decideDone` comment
   reads "green, red or unmeasured". There is no logic change: `emitDoc` already maps `EXIT[doc.status]`, and the
   base-evidence offer stays as it is. A `base:test` slot that timed out is already refused as base evidence by
   `entry-base-evidence-core.mjs:181`.
5. **`/pharn-loop` (`pharn-loop.md`).**
   - **Step 1:** `--allow-red-entry` goes on past a red **or unmeasured** gate instead of stopping at S14 or S14b.
     Reuse the one flag rather than add a second one (P7: one opt-in, same meaning: "run anyway").
     **Approved at GATE 1.**
   - **Step 2:** "S4–S14b **stop** it". A new row:
     `| S14b | Step 4's entry read exits`6`: no gate was red, but a gate was not measured on the tree the run started
from (killed at the per-gate timeout, or could not start), and`--allow-red-entry`was not given | stop`blocked:
     gates-unmeasured-at-entry`— make the gate finish inside the timeout or start, exclude it, or re-run with`--allow-red-entry`|`. The cells stay inside the table's current column widths, so Prettier does not re-pad the
     table.
   - **Step 4 branch:** `` `4` → **S14** ``: copy the `red` ids **and any `unmeasured` entries** into `### next_steps`.
     New: `` `6` → **S14b** (`blocked: gates-unmeasured-at-entry`) ``: copy the `unmeasured` entries (id and cause)
     into `### next_steps` as DATA. Then say that each gate did not finish inside the 540 s per-gate timeout, the same
     limit `/pharn-verify` runs it under, or could not start. Then name the remedies: make it faster or fix what stops
     it starting, list it in `pharn.config.json` `gates.exclude`, or re-run with `--allow-red-entry`. With
     `--allow-red-entry`, go on instead.
   - **Step 7 summary:** "any `red` or `unmeasured` ids you went on past".
   - No pinned line and no permission grant changes.
6. **`/pharn-ship` (`pharn-ship-stages.md` Step 2.3).** The branch reads: "`4` (a gate red on the tree the run started
   from), `6` (a gate not measured: killed at the per-gate timeout or unable to start), `2` or anything else → present
   the document's `red` ids, `unmeasured` entries or `reason_code` as DATA and ask …". The Stop/Continue form is
   unchanged.
7. **README (hand-written prose, outside the generated markers).** The `/pharn-loop` paragraph (:134–136) gains one
   clause: a gate that does not finish inside the per-gate timeout, or cannot start, stops it `blocked:
gates-unmeasured-at-entry`. `--allow-red-entry` covers both. The badge moves to 6.74.0.
8. **Guide.** `.dev/guides/floor-gates.md` `entry-gates.mjs` section: the S14 sentence names S14b, and the exit line
   gains `6 unmeasured`.

## Out of scope (follow-ups, named)

- **`gates-beyond-one-bash-call`** (the real fix for pharn-starter). Run regress and verify gates in a detached runner
  like the entry check's, so a gate may run longer than one Bash call. Then the per-gate timeout can grow or be
  configured. This increment makes the stop honest. It does not make a 540 s+ suite pass. On pharn-starter a loop
  still stops at entry, now as S14b, whenever the suite runs past 540 s.
- **A configurable per-gate timeout** (`pharn.config.json`). It depends on the follow-up above: raising only the entry
  timeout moves the stop to verify.
- **Renaming `--allow-red-entry`** to say it also covers an unmeasured gate. Not observed as a problem, so not done
  (P7).

## Applied lessons

- L29 — the set is `STATUSES`. `EXIT`'s parity test, `documentDefect` run over every printed document, and
  `entry-observations`' `WAIT_STATUSES` validator all iterate it, so the new member is covered by existing rules. The
  rules that are new here (closed `unmeasured` entries, the status/list agreement) get one test per member of
  `UNMEASURED_CAUSES`, not one cause.
- L34 — every per-entry check on `unmeasured` is paired with a non-empty case: a status-`unmeasured` document with
  `unmeasured: []` is a defect, and the core tests assert the list's exact contents, never "every entry is
  well-formed" over a possibly empty list.
- L35 — "not measured" has one owner, `gate-run-core.mjs` `unmeasuredRuns`. `entryVerdict` imports it. A test diffs
  `verdict.unmeasured` against `unmeasuredRuns(stamp)` minus `base:test`, and a source-closure assertion requires
  `entry-gates-core.mjs` to spell neither `timed_out === true` nor a 126/127 literal, so no second copy can grow back.
- L36 — `blocked: gates-unmeasured-at-entry` joins `STUCK_POINTS`, which the existing closure test iterates over every
  `` `blocked: …` `` spelling in `pharn-loop.md`. The WIRING test binds the prose `` `6` `` to `EXIT.unmeasured` (built
  from the constant), so the number in the command cannot drift from the code.
- L62 — the new document field holds `id`s from a validated stamp and closed `cause` tokens, and nothing is quoted into
  `detail`. If the build adds any quoted value, it goes through `shown()`. The existing hostile-value test keeps
  passing over the new key set.
- L64 — the bound "an unmeasured gate's timeout and a hang look the same" is cited from `gate-run-core.mjs`, never
  restated. The restatements this increment writes (CHANGELOG, README clause, S14b row, guide line) are probed at
  review against the code: exit 6 only when no attributable red exists, `base:test` never listed, and both causes
  covered.
- L72 — adding a member to a shared status enum. The literal comparisons were enumerated (Discovery 3): only
  `documentDefect`'s `green`/`red` test compares a status literal, and it is in `## Files`. Every command branch reads
  the exit code, and ship's "anything else" branch would have caught 6 but presented empty `red` ids, so it is edited.
- L75 — the sweep, phrase by phrase, each hit with a disposition (grep over `pharn/`, `.claude/`, `README.md`,
  `CLAUDE.md`, `CONTRIBUTING.md`, `docs/`, `.dev/guides/`, `.dev/floor/`; `pharn/features/` and old `.dev/features/`
  records are excluded, because merged records are not edited):
  - `gates-red-at-entry`:
    - `pharn-loop.md:396`, `:649` — edited (both stay; S14b added beside them).
    - `README.md:135` — edited (clause added).
    - `entry-gates.test.mjs:703` — edited (row regex for S14b added).
    - `command-hygiene.test.mjs:1772` — edited (S14b row added).
    - `CHANGELOG.md` 6.42.0 — still true (released, frozen).
  - `S14`:
    - `entry-gates-core.mjs:31` — still true (`base:test` never causes S14 or S14b; S14b is added there).
    - `entry-gates.mjs:69` — still true (same edit as :31, to name S14b).
    - `entry-base-evidence-core.mjs:55` — still true (historic "false S14 stop").
    - `pharn-loop.md:238`, `:375` — edited.
    - `entry-gates.test.mjs:766–768` — edited (S14b row pinned).
    - `.dev/guides/floor-gates.md:601` — edited.
    - `command-hygiene.test.mjs:1871` — edited (count 17).
  - `allow-red-entry`:
    - `pharn-loop.md:236–238`, `:650` — edited.
    - `pharn-loop-quick.md:32` — still true (the grammar only).
    - `entry-gates.test.mjs:704`, `:769–770` — still true.
    - `entry-gates-core.mjs:44` — still true.
    - `README.md:135` — edited.
  - timeout-as-red (`or it timed out`, `a timeout is red`, `timed-out gate is red`):
    - `entry-gates-core.mjs:16` — edited.
    - `entry-gates.test.mjs:96`, `:446` — edited (they now assert unmeasured).
  - `4 red` exit lists:
    - `entry-gates.mjs:37` — edited.
    - `.dev/guides/floor-gates.md:607` — edited.
  - `red on the tree` / `red at entry`:
    - `pharn-ship-stages.md:281` — edited.
    - `entry-gates-core.mjs:40–41` — still true (about a measured red).
    - `gate-run-record.md:274` — still true (it cites the header).
    - `entry-base-evidence.test.mjs:315` — still true (a real `typecheck` red).

L38, L43 and L66 were read in full and are not cited. This increment changes no shared scope record, no mirrored
store and no wait mechanism. The runner, the result binding and `--wait`'s read are untouched.

## Files

- `pharn/floor/entry-gates-core.mjs` — `unmeasured` in the verdict and the document, the status, exit 6, DOC_KEYS,
  `documentDefect`, header — product floor
- `pharn/floor/entry-gates.mjs` — header exit list and S14b mention, `decideDone` comment — product floor
- `pharn/floor/entry-gates.test.mjs` — core, CLI and WIRING tests (below) — test
- `.claude/commands/pharn-loop.md` — Step 1 flag sentence, Step 2 range and S14b row, Step 4 branch, Step 7 sentence
  — product command
- `.claude/commands/pharn-ship-stages.md` — Step 2.3 entry-read branch — product command
- `.dev/floor/command-hygiene.test.mjs` — `STUCK_POINTS` S14b, count 17; byte ceilings only if outgrown (not
  expected) — apparatus
- `.dev/guides/floor-gates.md` — `entry-gates.mjs` section: S14b, exit 6 — apparatus
- `SKILLS_VERSION` — 6.74.0
- `CHANGELOG.md` — the 6.74.0 section (moves any `[Unreleased]` entry present at build time)
- `README.md` — the `/pharn-loop` paragraph clause, the version badge 6.74.0 (`check:badge`)
- `.dev/features/entry-timeout-unmeasured/PLAN.md`
- `.dev/features/entry-timeout-unmeasured/GRILL.md`
- `.dev/features/entry-timeout-unmeasured/BUILD.md`
- `.dev/features/entry-timeout-unmeasured/REGRESSION.md`
- `.dev/features/entry-timeout-unmeasured/regression-report.json`
- `.dev/features/entry-timeout-unmeasured/VERIFY.md`
- `.dev/features/entry-timeout-unmeasured/verify-report.json`
- `.dev/features/entry-timeout-unmeasured/REVIEW.md`
- `.dev/features/entry-timeout-unmeasured/SHIP.md`

### Not written (excluded from the scope)

- the four trusted docs;
- every contract (`gate-run-record.md` cites the header; `cost-ledger.md` says "the document's status" without listing
  the members);
- `entry-observations.mjs`, which imports `STATUSES`;
- the quick and close parts;
- generated docs.

No capability, command file or floor file is added or removed, so `npm run docs:check` is expected GREEN. If it REDs,
the build halts and asks rather than writing an undeclared path.

## Contracts satisfied

- `pharn/pharn-contracts/gate-run-record.md` (`entry` bullet) — unchanged. It cites `entry-gates-core.mjs`'s header for
  what counts as red at entry (P4), and the header is where the rule changes.
- `pharn/pharn-contracts/stage-exit.md` — unchanged. The per-gate timeout bound it explains is what makes the
  remediation follow-up necessary. This increment does not touch it.
- `pharn/pharn-contracts/cost-ledger.md` ("Entry gate observations") — unchanged. An observation's `status` is the
  document's status, validated through the imported `STATUSES`.

## Evals to write (P1)

No Capability (`role:` file) is added or changed. Tests (each rule gets its own):

- **timed out → unmeasured, not red.** `test` with `{exit: 143, timed_out: true}` and with `{exit: 0, timed_out:
true}` gives status `unmeasured`, `unmeasured: [{id: "test", cause: "timed-out"}]`, `red: []`. Replaces `:96`;
  `mutated` and `excluded` are still reported.
- **not started → unmeasured.** Exit 126 and exit 127 (`timed_out: false`) each give `cause: "not-started"`. Control:
  exits 1, 125, 128 and 143 with `timed_out: false` stay red (a measured failure).
- **style gate.** For every `STYLE_SET` member: timed out gives `unmeasured`, never `red` or `unattributed`, whatever
  the digests (untouched and written cases).
- **precedence.** A measured red `build` plus a timed-out `test` gives status `red`, `red: ["build"]`, and
  `unmeasured` naming `test`.
- **base:test.** A timed-out slot is in `gates`, but not in `red`, `unattributed` or `unmeasured`, and the status is
  green. This extends the existing 6.49.0 test.
- **one owner (L35).** `verdict.unmeasured` deep-equals `unmeasuredRuns(stamp)` minus `base:test` over a mixed stamp.
  Source closure: `entry-gates-core.mjs` contains `unmeasuredRuns(`, and neither `timed_out === true` nor `126`/`127`.
- **EXIT.** The existing parity test covers the new member. Add `EXIT.unmeasured === 6`.
- **document closed both ways.** `documentDefect(entryDocument(…)) === null` for every status in `STATUSES` (the key is
  present, `[]` off-verdict). Defects:
  - status `unmeasured` with `unmeasured: []`;
  - status `unmeasured` with a non-empty `red`;
  - an entry with an unknown `cause`, a missing `id`, or an extra key;
  - status `unmeasured` without a `CHANGES_RECORD` member.
- **CLI.** "a timed-out gate is unmeasured" (replaces `:446`): `start(dir, "800")` then `wait` gives exit 6,
  `doc.status` `unmeasured`, `doc.unmeasured` `[{id: "test", cause: "timed-out"}]`, `doc.red` `[]`. The `wait`
  helper's `documentDefect` and `EXIT[doc.status]` checks run over it.
- **WIRING.** In `pharn-loop.md` the branch matches
  ``/`6` → \*\*S14b\*\* \(`blocked: gates-unmeasured-at-entry`\)/`` (the `6` built from `EXIT.unmeasured`) and names
  `unmeasured`. In `pharn-ship-stages.md` it names `` `6` `` and `unmeasured`. The S14b table row exists.
- **hygiene.** `STUCK_POINTS` has S14b, `gates-unmeasured-at-entry` and count 17. The existing per-row, closure and
  budget tests then range over it.

## Guarantee audit (P0)

- A timed-out or 126/127 gate is never counted red at entry. → floor: enum-regex. This is tested code over a validated
  stamp, through the one predicate `unmeasuredRuns`.
- `--wait` exits 6 exactly when no attributable red exists and an unmeasured non-`base:test` gate does. → floor:
  enum-regex (tested precedence; `EXIT` closed).
- Every printed document carries a closed `unmeasured` list. → floor: enum-regex (`documentDefect`, run over every
  CLI-test document).
- The commands map exit 6 to S14b and to ship's question. → floor: regex over the command TEXT (WIRING and hygiene
  tests). That the run follows the text → advisory.
- "Not measured" means the runner's clock ran out or the gate could not start. It is not a claim that the gate would
  pass: a slow machine, a hang and a too-small timeout look the same. → bound, cited from `gate-run-core.mjs` and
  stated in the header's WHAT IT DOES NOT CLAIM.
- That the remedies in the S14b next steps fit a given project. → advisory.
- Provenance of `.pharn/pharn-entry/` (L43, header) is unchanged. → limit, as before.

## Trust audit (P2)

No new input. Gate ids come from a validated stamp's allowlist, and `cause` is a closed token. The document gains no
free text. The loop copies `unmeasured` entries into `### next_steps` as DATA, as it already does for `red` ids.

## Decisions (resolved at GATE 1)

Human-approved at GATE 1 on 2026-10-25, by chat answer ("Approve as planned (Recommended)" in the question form). Every
question this plan had open was settled on its recommendation:

- **Precedence.** Red first (Design 2).
- **`--allow-red-entry` scope.** It also goes on past an unmeasured gate (Design 5).
- **Stop id.** `S14b` / `blocked: gates-unmeasured-at-entry`.
- **Bump size.** Minor, 6.74.0.
- **PR #392 ordering.** If `docs/loop-cost-2026-10-25` has merged by build time, its `[Unreleased]` CHANGELOG entry
  moves into 6.74.0 and its README edits are merged in; otherwise it is left alone.
