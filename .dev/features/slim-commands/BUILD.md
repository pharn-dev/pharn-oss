# BUILD — slim-commands (the product commands slimmed, a claims block each, a byte budget; 6.28.1)

- plan: `.dev/features/slim-commands/PLAN.md` (GATE 1 recorded in the plan as the orchestrator's decision under the
  maintainer's delegation; the grill's G1–G12 folded in `## Amended after grill`), built in an isolated worktree from
  the branch pointer `slim-commands` (`59f2112`, fast-forwarded), whose base is `origin/main` `b627409` (6.28.0).
- stage model: build — opus — set by the maintainer's instruction, overriding pharn.config.json; routed via Agent
  subagent; effort not routed.
- date: 2026-09-27.
- verdict: `node pharn/floor/validate.mjs .` → **exit 0**, `FLOOR: GREEN — 36 capabilities checked in "."`.

Every line below records a command this build ran, with its exit code, or a measurement a scratch script printed.
The scratch scripts lived under `.pharn/pharn-dev-build/` (`.mjs`/`.json`/`.log`, never `.md`) and were deleted before
the final lint; what they printed is quoted here.

## Step 0 — scope, anchor, drift

- `git merge --ff-only slim-commands` → exit 0; `npm ci` → exit 0.
- `node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/slim-commands/PLAN.md` → exit 0, `18 path(s)`
  (the 18 `## Files` bullets; the `### Explicitly not touched` block contributed none).
- `node pharn/floor/reconcile-baseline.mjs --anchor --by pharn-dev-build` → exit 0; the baseline reads epoch
  `2026-09-27T08:55:20.494Z`, `anchored_by: pharn-dev-build`, 2,431 entries, the 18-entry scope snapshot.
- `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` → `d831d30d…f4f4`, equal to the plan's `spec_content_hash` — no
  drift. `## Open questions (HALT)`: none open (Q1 resolved (a) at GATE 1).
- Baseline suite before any edit: `npm test` → exit 0, 4,007 tests, 4,007 pass.

## The waves, and the suite after each (§6 item 4)

| Wave | What                                                                                                                                                  | `npm test`                                                                                                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1    | eleven descriptions; nine claims blocks; eleven `version:` patch bumps; tail audits and `## The two layers` deleted; nine release pointers re-pointed | exit 1 — 4,006 / 4,007 (one re-point, below); after it `node --test .dev/floor/command-hygiene.test.mjs` exit 0, 257 / 257 |
| 2    | `pharn-ship.md` and `pharn-loop.md` bodies                                                                                                            | exit 0 — 4,007 / 4,007                                                                                                     |
| 3    | the other seven bodies (`memory-promote`, `spec`, `review`, `build`, `grill`, `plan`, `test`)                                                         | exit 0 — 4,007 / 4,007                                                                                                     |

After wave 3 one sentence was **restored** (inbound-cite search, below): `/pharn-review` Step 3's "would this scanner
hit **now**, not what was assigned **then**" distinction, which `pharn/floor/merge-findings.mjs:116` cites.

## The re-point (§6 item 3) — one, inside `command-hygiene.test.mjs`

- **What went red.** The `NAMED_LIMITS` controls test replays GATE-2 review E1: it asserts that the OLD anchor set is
  satisfied by a mutant of `pharn-verify.md`'s named-limits section. The anchor `deferred` was satisfied only by
  `pharn-verify.md`'s old `description:` ("the runner is deferred, P7"), which D1 shortened.
- **Why a re-point and not a restore.** The description is not a pinned sentence the plan keeps: D1 removes every
  claim from descriptions, and the claim itself stays in `pharn-verify.md`'s `## The two layers` and its verifier-slot
  section. The replay is evidence about E1's measurement, so it now reads the description E1 was measured with.
- **Before:** `oldAnchors.every((a) => mutant.includes(a))`, each mutant being the live file.
- **After:** ``oldAnchors.every((a) => `${VERIFY_DESCRIPTION_AT_E1}\n${mutant}`.includes(a))``, where
  `VERIFY_DESCRIPTION_AT_E1` is a frozen literal of the pre-6.28.1 description clause, used by that replay only, with
  a comment saying why; plus a new control, `assert.ok(!oldAnchors.every((a) => repros[1][1].includes(a)), …)` — the
  mutant without the frozen clause does not carry every anchor, so the replay is what carries it (L60). The
  `NAMED_LIMITS` predicate itself, and its own controls, are unchanged.

## Success measure — measured on the final tree (§8)

Bytes are `Buffer.byteLength` after folding `\r\n` to `\n`; a description is its parsed value (the raw scalar is 2
bytes longer — the quotes). "Estimate" is §5's target (G2: an estimate, never a constraint). Ceiling = measured bytes
+10%, rounded up to the next multiple of 512 (§7); headroom = ceiling − bytes (G9).

| Command                 |    Base |     Now | Change | Estimate | Ceiling | Headroom | Description base → now | Lines base → now |
| ----------------------- | ------: | ------: | -----: | -------: | ------: | -------: | ---------------------: | ---------------: |
| pharn-ship.md           | 124,078 |  69,392 | −44.1% |   70,000 |  76,800 |    7,408 |            2,438 → 228 |    1,660 → 1,095 |
| pharn-loop.md           | 112,538 |  78,077 | −30.6% |   72,000 |  86,016 |    7,939 |            4,614 → 237 |    1,477 → 1,151 |
| pharn-memory-promote.md |  39,685 |  24,692 | −37.8% |   26,000 |  27,648 |    2,956 |            1,577 → 165 |        570 → 420 |
| pharn-spec.md           |  37,149 |  24,474 | −34.1% |   23,000 |  27,136 |    2,662 |            2,658 → 205 |        461 → 344 |
| pharn-review.md         |  36,909 |  21,540 | −41.6% |   25,000 |  24,064 |    2,524 |              548 → 153 |        494 → 325 |
| pharn-build.md          |  36,583 |  20,001 | −45.3% |   22,000 |  22,016 |    2,015 |            1,811 → 172 |        444 → 285 |
| pharn-grill.md          |  35,075 |  20,749 | −40.8% |   22,000 |  23,040 |    2,291 |            1,951 → 191 |        471 → 328 |
| pharn-plan.md           |  34,722 |  21,590 | −37.8% |   21,000 |  24,064 |    2,474 |            2,362 → 186 |        477 → 350 |
| pharn-test.md           |  24,904 |  18,491 | −25.8% |   19,000 |  20,480 |    1,989 |            2,036 → 177 |        360 → 316 |
| pharn-regress.md        |  19,683 |  18,540 |  −5.8% |   19,000 |  20,480 |    1,940 |            1,110 → 179 |        272 → 269 |
| pharn-verify.md         |  18,418 |  16,729 |  −9.2% |   17,500 |  18,432 |    1,703 |            1,659 → 170 |        246 → 243 |
| **total**               | 519,744 | 334,275 | −35.7% |  336,500 |         |          |         22,764 → 2,063 |                  |

(Lines are `split("\n").length`, the survival script's count.) The descriptions fell by 91%; the largest is 237 bytes,
13 under the budget.

### Missed estimates, and why (G2 — recorded, never met by cutting)

- **`pharn-loop.md`, 78,077 against ~72,000.** What remains is pinned or executed: the Step 2 stuck-point table (every
  row, pinned by `stage-agent-core.test.mjs` and the closure tests), Step 6's record/ledger/commit lines and their
  order pins, `## Quick mode`'s `LOOP_QUICK_SECTION_PINS` sentences and quick-only rows, and the claims block, which
  carries the loop's bounds verbatim (G5) — the loop's audits held more distinct bounds than any other command.
- **`pharn-spec.md`, 24,474 against ~23,000.** Steps 1, 3 and 5 are executed text with pinned lines (the template
  resolution, the `check-spec.mjs` calls, the pin) and were left byte-identical; `## --quick` is pinned by the ship and
  loop quick-mode tests.
- **`pharn-plan.md`, 21,590 against ~21,000.** Step 4c's mapping instructions are executed and pinned
  (`check-ac-tests` wiring), and Step 1's lessons sweep is `LESSONS_SWEEP_WIRING`.
- The total, 334,275, is inside the 336,500 estimate.

### Per session (ESTIMATE, not a measurement — `LIMITS.md §1c`)

The descriptions' parsed text went from 22,764 to 2,063 bytes. In the listing the planning session observed, seven were
cut at 1,535 characters and two were shown by name only; every one now fits whole. At ~4 characters a token that is
roughly 2,600 fewer tokens per request of every session. The per-run savings in §8 are estimates from these bytes; M3,
the maintainer's measurement after `pharn update`, is the real number.

## The survival check (§6 item 5) — quoted, per wave

`node .pharn/pharn-dev-build/survive.mjs <wave>` → exit 0 each time, comparing each command with its base
(`git show b6274095:<file>`). Columns: bytes after the wave · lines removed/added in THIS wave (G12) · fenced lines
missing · fenced lines extra · base headings missing that the plan does not remove · loop `blocked:`/stuck-point ids
missing · decision-token lines (G3) not present verbatim / decision-token lines in the base.

| Command        | Wave 1                                      | Wave 2                                       | Wave 3                                     |
| -------------- | ------------------------------------------- | -------------------------------------------- | ------------------------------------------ |
| ship           | 104,621 · −253/+65 · 0 · 0 · 0 · – · 80/404 | 69,392 · −494/+117 · 0 · 0 · 0 · – · 228/404 | unchanged                                  |
| loop           | 97,692 · −195/+62 · 0 · 0 · 0 · 0 · 65/391  | 78,077 · −300/+107 · 0 · 0 · 0 · 0 · 171/391 | unchanged                                  |
| memory-promote | 31,113 · −120/+37 · 0 · 0 · 0 · – · 39/108  | unchanged                                    | 24,692 · −96/+29 · 0 · 0 · 0 · – · 56/108  |
| spec           | 27,273 · −120/+34 · 0 · 0 · 0 · – · 51/105  | unchanged                                    | 24,474 · −50/+19 · 0 · 0 · 0 · – · 59/105  |
| review         | 32,215 · −91/+36 · 0 · 0 · 0 · – · 36/90    | unchanged                                    | 21,362 · −164/+48 · 0 · 0 · 0 · – · 58/90  |
| build          | 28,885 · −107/+38 · 0 · 0 · 0 · – · 45/114  | unchanged                                    | 20,001 · −127/+37 · 0 · 0 · 0 · – · 75/114 |
| grill          | 27,544 · −98/+29 · 0 · 0 · 0 · – · 37/130   | unchanged                                    | 20,749 · −97/+23 · 0 · 0 · 0 · – · 69/130  |
| plan           | 25,884 · −116/+35 · 0 · 0 · 0 · – · 37/99   | unchanged                                    | 21,590 · −63/+17 · 0 · 0 · 0 · – · 53/99   |
| test           | 21,763 · −50/+35 · 0 · 0 · 0 · – · 18/74    | unchanged                                    | 18,491 · −45/+16 · 0 · 0 · 0 · – · 30/74   |
| regress        | 18,540 · −5/+2 · 0 · 0 · 0 · – · 2/59       | unchanged                                    | unchanged                                  |
| verify         | 16,729 · −5/+2 · 0 · 0 · 0 · – · 2/51       | unchanged                                    | unchanged                                  |

Totals after each wave: 432,259 · 377,415 · 334,097 bytes (334,275 final: the review Step 3 restore, and the
prettier-driven re-wrap of two lines whose code span had been split across a line break). The planned missing
headings are exactly the tail-audit, `## The two layers` and `/pharn-ship --loop` headings (and none else).

### Decision-token lines (G3) — their disposition, grouped by section

The survival script listed every base line outside a fence carrying a decision token and absent verbatim from the new
file. The lists are dispositioned **by section**, not line by line (a deviation from §6 item 5's per-line listing, stated
here; the per-line output was scratch). Every group falls in one of the plan's three dispositions:

- **Tail audits and `## The two layers`** (ship 78, loop 63, memory-promote 37, spec 49, review 35, build 43, grill 35,
  plan 35, test 16) → the claims block, each bullet mapped below (G5).
- **Preamble** (one per command — the old `description:` line) → the description-claim maps below.
- **The H1 opening paragraphs** (ship 5, loop 7, memory-promote 3, spec 2, review 2, build 5, grill 11, plan 1, test 3,
  regress 1, verify 1 — the "PRODUCT command" blockquotes and "honest claim" blockquotes) → the claims block (the
  honest-claim and two-clocks text) or the boundary owner `pharn/features/README.md` (the blockquote).
- **In-body steps** (the rest: ship 139 across Steps 1–3b, `## Running a stage` and `## Quick mode`; loop 101 across
  Steps 1a–7 and `## Quick mode`; 3–24 in each stage command) → rationale removed with its owner named in the ledger
  below, or an instruction clause kept (reworded only where the sentence mixed instruction and rationale — every such
  instruction was re-checked present by grep after wave 3, e.g. `/pharn-review`'s "nothing at all for
  `scanner-assigned`", `/pharn-test`'s "Never continue to the build", `/pharn-plan`'s "Cite only what you will
  discuss"), or a Final-step paragraph → the one-sentence release note citing `.claude/hooks/set-writes-scope.cjs`'s
  header.

## Description-claim maps (§1) — old clause → where it lives now

### pharn-verify (D9)

- "Verify a built feature in the USER's codebase — the seventh product-pipeline stage" → new description (what) +
  the body's opening paragraph.
- "Since 6.26.0 … THIN CALLER … stage-verify.mjs … pins ONE line and branches on its EXIT CODE (stage-exit.md)" →
  already stated: the body's "Since 6.26.0 you are a THIN CALLER" paragraph and Step 1.
- "FLOOR: the verdict is check-verify.mjs's absolute exit-code threshold … plus the AC GATE … a legacy SPEC is
  reported not-applicable, never silently green" → already stated: `## What you may claim, and the honest residuals`
  and `## The two layers`.
- "ADVISORY: role: verifier capabilities are counted and none is run (the runner is deferred, P7); a verifier
  finding never flips the verdict (fix #3)" → already stated: `## The two layers` and `## The verifier plug-in slot`.
- "Emits verify-report.json + VERIFY.md (rendered by render-verify.mjs)" → new description names both; Step 1 `0`.
- "'/pharn-verify verified it' means EXACTLY 'the named gates passed' … NEVER 'the feature is correct'" → already
  stated: the claims section's correctness residual.
- "PHARN does not judge whether a test captures its AC's intent (P0)" → owner `pharn/pharn-contracts/ac-tests.md`,
  "The AC gate", and `pharn/floor/ac-gate-core.mjs`'s header.

### pharn-regress (D9)

- "Detect regressions OUTSIDE the just-built feature … the sixth stage" → new description (what).
- "Since 6.23.0 … THIN CALLER … stage-regress.mjs" → already stated: the body's thin-caller paragraph and Step 1.
- "The verdict is still a deterministic exit-code comparison (check-regress.mjs) — ZERO LLM-judge" → already
  stated: `## The two natures` item 1; `## Determinism audit (P5)`.
- "Emits regression-report.json + REGRESSION.md" → new description names both.
- "FLOOR verdict; ADVISORY orchestration" → already stated: `## The two natures`.
- "'/pharn-regress produced a report' NEVER means 'nothing broke'" → already stated: `## What you may claim, and the
one honest residual`.

### pharn-test

- "Write each AC's test BEFORE the build, then RUN them and require each to FAIL" → new description (what).
- "runs after /pharn-grill and before /pharn-build" → new description (when).
- "/pharn-ship and /pharn-loop (with --unattended) run it there (6.19.0), and /pharn-build refuses without its
  evidence" → context, not this command's claim: owners `pharn-ship.md` Step 2, `pharn-loop.md` Step 4,
  `pharn-build.md` Step 0, `ac-tests.md` "The test-stage gate". Step 0 item 2 keeps `--unattended`.
- "reads the Approved SPEC, the PLAN and the mapping … title AC-<n>: … importing the target inside the test body"
  → Steps 1 and 3.
- "pins them with a script-written AC-TESTS.lock.json" → Step 4; claims Floor "the lock records the red run".
- "runs them through run-gates.mjs --stage ac-test" → Step 5. "records the red run in the lock" → Step 6.
- "FLOOR: SPEC Approved and un-drifted …, chain …, mapping complete (… --spec exits 3 legacy, 4 bootstrap)" →
  claims Floor bullet 1; Step 0 item 3.
- "every AC's level has a runner with per-test results (check-red-run --preflight …, never a nested run)" → claims
  Floor "a level with no runner stops the run"; Step 2b.
- "every AC's test was collected and FAILED before the build … no escape hatch for a pass" → claims Floor; Step 5.
- "the writes-scope lets this stage write ONLY the mapped test files and the lock — a Bash write bypasses both
  hooks" → claims Floor "writes only the mapped test files and the lock", Bash bound verbatim.
- "A spec_kind: test-infra SPEC gets a BOOTSTRAP lock instead … weaker, and recorded as such" → claims "Weaker,
  stated"; Step B.
- "ADVISORY: the tests themselves …" → claims Advisory + the Floor bullet's bound ("a test failing on its own typo
  reads the same").
- "'/pharn-test wrote tests and they failed' NEVER means 'the tests are right'" → claims Not-a-claim.

### pharn-plan

- "Turn an Approved SPEC.md into an implementation PLAN.md — the second stage" → new description.
- "deterministic APPROVED-INPUT GATE … A Draft or drifted SPEC → HALT, never a plan" → claims Floor 1; Step 2.
- "emits an advisory PLAN.md that carries spec_id + spec_content_hash forward (fix #4)" → Step 4; claims Advisory
  ("carried forward as a deterministic copy, not re-verified at THIS stage").
- "FLOOR (check-spec-approved.mjs …) … first downstream consumer that ENFORCES /pharn-spec's pin" → claims Floor 1.
- "ALSO FLOOR (check-plan-lessons.mjs): DECLARE applied_lessons … (D) is NOT proof of reading" → claims Floor 2,
  bound verbatim (`L3: considered.`).
- "lessons sweep is TWO-STEP … closed token set … degrade to 'read canon in full and say so', NEVER to a block" →
  Step 1 item 3.
- "index check is FLOOR but NARROWED … 'the index was consulted' NEVER means 'the relevant lessons were read'" →
  claims "Floor, narrowed" + Not-a-claim.
- "ADVISORY: the plan's CONTENT … whether the cited lessons were GENUINELY applied" → claims Advisory.
- "'/pharn-plan produced it' NEVER means 'the plan is sound'; 'the plan cited L1' NEVER means 'applied L1'" →
  claims Not-a-claim.

### pharn-grill

- "Interrogate an approved PLAN.md AND deterministically re-verify TWO things — the third stage" → new description.
- "FLOOR (1) check-plan-spec-agree.mjs … FIRST downstream consumer that RE-VERIFIES the pin … else RED" → claims
  Floor 1; Step 2 (remedies kept).
- "(2) check-plan-lessons.mjs FIRST stage that did NOT author applied_lessons … (D) never proof it was read" →
  claims Floor 2, bound verbatim.
- "A project with NO memory-bank is unblocked by construction" → claims Floor 2; Step 2b.
- "ADVISORY: interrogate the PLAN … emit GRILL.md of finding-shape findings" → claims Advisory; Steps 3, 4.
- "The interrogation NEVER blocks; those two checks are the ONLY deterministic stops" → claims Advisory ("never
  gates"); the opening paragraph's two-natures text was removed in wave 3 and its claim is the block's.
- "--quick runs BOTH floor stops and skips the interrogation …" → new description; `## --quick mode` (untouched).
- "'/pharn-grill produced a GRILL.md' … NEVER 'the plan is good', NEVER lessons genuinely APPLIED" → claims Floor
  1/2 + Not-a-claim.

### pharn-build

- "Build the USER's code from an approved PLAN.md — the fifth stage, FIRST stage that writes the user's
  implementation files" → new description; the body's opening paragraph.
- "THREE floor gates, all REUSED checkers" → the claims intro ("Every one is a REUSED checker or hook").
- "(1) HASH-CHAIN GATE … THIRD downstream consumer … re-checked at BUILD time" → claims Floor 1; Step 2.
- "(2) WRITES-SCOPE … ONLY the paths ## Files authorizes … fail-closed if no parseable scope" → claims Floor 3;
  Step 0 item 3.
- "(3) TEST-STAGE GATE (check-test-stage.mjs) … else REFUSE" → claims Floor 2; Step 0 item 2.
- "ADVISORY: the implementation itself" → claims Advisory.
- "'/pharn-build produced code' NEVER means 'the code is correct'" → claims Not-a-claim.

### pharn-review

- "Review a codebase with lenses IN PARALLEL as subagents, then DETERMINISTICALLY merge+dedup into one
  findings.json" → new description.
- "Membership FLOOR (count-lenses.mjs, frontmatter not prose)" → claims Floor 1; Step 2.
- "merge+dedup FLOOR (merge-findings.mjs, keyed on enum-gated fields only)" → claims Floor 2; Step 5.
- "Parallel spawn + per-lens slicing + each lens's judgment ADVISORY" → claims Advisory; Steps 3, 4. (The opening
  "Two clocks" blockquote was removed in wave 3; its claims are the same bullets.)
- "'/pharn-review produced findings' NEVER means 'the code is correct/safe' — a lens can't decide approve (§7); the
  merge only assembles" → claims Not-a-claim + Floor 2 ("It assembles; it does not judge") + Advisory ("a lens
  never gates — §7").

### pharn-spec

- "Turn a user's prose intent into a structured, human-approved SPEC.md — the head of the pipeline" → new
  description; the opening paragraph.
- "INTERROGATES the intent for gaps (advisory — never gates)" → new description ("surface gaps"); claims Advisory;
  Step 2.
- "EMITS a Draft by filling the RESOLVED template … an existing but invalid project template is a stop, never a
  fallback" → new description; claims "Floor, for what the checker PRINTS"; Step 3 item 1.
- "HALTS for explicit human approval; only on approval … flip, spec_id, pin (fix #4)" → new description; Steps 4, 5.
- "FLOOR (check-spec.mjs): sections, state enum, spec_id, hash pin with spec_kind line" → claims Floor 1.
- "for a SPEC that declares spec_template (opt-in): the template's shape" → claims Floor 2; the rule list → owner
  `pharn/pharn-contracts/spec-template.md`, "The rules".
- "at most one valid spec_kind (feature|test-infra|quick …)" → Step 3 item 3 and Step 4a.
- "--quick writes a spec_kind: quick mini-SPEC … misfit refused, never widened" → new description; `## --quick`.
- "A valid AC grammar means the criteria are PHRASED testably — never that any test exists" → claims Floor 2.
- "ADVISORY/HUMAN … The model NEVER self-approves" → claims Advisory/human; Step 4.
- "'/pharn-spec produced it' NEVER means 'the intent is sound'" → claims Not-a-claim.
- "ONE EXCEPTION: --model-approve … approved_by: model — never presented as a human's approval" → claims
  Advisory/human; Step 4a ("It is never presented as a human sign-off").

### pharn-memory-promote

- "Prepare and GATE the promotion of ONE lesson/pattern to the USER's memory-bank" → new description ("when the
  user asks to keep it").
- "automates the MECHANICS … then HALTS for explicit human accept/deny" → Steps 0–5; new description ("nothing is
  written until the user accepts").
- "does NOT decide what is canon; the model NEVER self-promotes" → Step 5; claims Advisory/human.
- "FLOOR: no CANDIDATE reaches the gate without provenance, unique id, target enum, well-SHAPED type/concepts;
  write lands only in declared file" → claims Floor 1 + Floor 3 + Advisory (the rendered tag-line residual).
- "FLOOR, NARROWED: commit admits unknown … no diff pointer" → claims Floor 1, bound verbatim.
- "ADVISORY/HUMAN: lesson true/general/worth; values describe; rendered tag line; the halt itself" → claims
  Advisory + Advisory/human.
- "'memory-promote promoted it' NEVER means 'the lesson is sound'; 'typed floor' NEVER means 'about the floor'" →
  claims Not-a-claim.

### pharn-ship

- "Run the PRODUCT pipeline in order … [human approves] … [human decides merge/fix/abandon]" → new description
  (both gates named); the opening paragraph.
- "The eighth, terminal pipeline stage (§6), a GATED meta-orchestrator" → the opening paragraph.
- "the agent INVOKES each stage (advisory); WHETHER to proceed is read from each stage's STRUCTURAL floor verdict …
  NEVER the agent's judgment" → claims Floor 1 + Advisory; Step 2 ("Read BOTH exit codes" kept).
- "Reuses the seven product stage commands …; reimplements none" → the opening paragraph.
- "Two human gates … NON-NEGOTIABLE; NO --yolo, NO self-approval" → `## The two human gates`; claims Not-a-claim.
- "at most ONE bounded build-completion retry on INCOMPLETE" → claims Floor 3; Step 2b.
- "--loop is still a separate follow-up (/pharn-loop ships the capability)" → claims Not-a-claim.
- "`/pharn-ship --quick` runs a shorter spine … gate2-quick, which is not gate2" → new description; `## Quick
mode`; claims "Floor, reused" (the cost-ledger outcome).
- "At GATE 2 (Step 2c), also renders BRIEFING.md … never a self-issued seal, never a GATE-2 precondition" → claims
  "Floor, never gating"; Step 2c.
- "FLOOR verdicts; ADVISORY orchestration" → claims intro + Floor 1.
- "'/pharn-ship reached the end' NEVER means 'the feature is good'" → claims Not-a-claim, verbatim.

### pharn-loop

- "Run the PRODUCT pipeline UNATTENDED to a deterministic stop, then report" → new description ("only when the
  user asks").
- "/pharn-spec --model-approve (approved_by: model) → plan → grill → test --unattended → build → regress → verify,
  iterating" → new description; Steps 3–5; `## What an unattended run changes`.
- "until check-loop.mjs (Design C) says stop … undelivered AC is ordinary FAIL" → Step 5 item 4; claims Floor 1.
- "--quick … STOP_GREEN_QUICK, which is not STOP_GREEN" → new description; `## Quick mode`; claims Floor 1.
- "NO human gate inside the run: every sub-stage question maps to ONE stuck-point table (S1–S13)" → `## What an
unattended run changes` + Step 2; claims Advisory.
- "check-loop-fresh.mjs before the stop and before the commit … RE-RUN … counted budget … S11" → Step 5 item 3 +
  Step 6c item 0; claims Floor 3.
- "writes LOOP.md per loop-record.md; check-loop-record.mjs; check-loop-decision.mjs …; commit gated on it" →
  Steps 6b/6c; claims Floor 5.
- "Only a green stop committed, NEW LOCAL BRANCH … else nothing committed, SPEC reverted to Draft" → `## What an
unattended run changes` + Steps 6a, 6c; new description; claims Advisory.
- "Never pushes, never merges, never seals. Ends with a summary, not a question." → claims Not-a-claim; Step 7.
- "At EVERY stop with a feature dir emits cost.json … attributionSkill names the orchestrator" → Step 6b; the reason
  → owners `pharn/pharn-contracts/cost-ledger.md` and `pharn/floor/mark-phase.mjs`'s header.
- "ledger records TOKENS, no price table; ANNOTATES and gates NOTHING (fix #3)" → Step 6b + Step 7.
- "check-loop.mjs's inputs are the two reports, iter/cap and ONE SPEC token — structural" → claims Floor 1
  ("Structural"), verbatim.
- "FLOOR: stop decision, freshness, record shape; ADVISORY: orchestration, self-approval, stuck-point mapping,
  every VCS step" → claims Floor 1/3/5 + Advisory.
- "'/pharn-loop finished' … NEVER 'feature is good', 'a human approved the intent', 'the fix converged'" → claims
  Not-a-claim, verbatim.

## Audit-bullet maps (§2, G5) — every removed audit or two-layers bullet → a block bullet carrying its bound, an owner, or a duplicate

Abbreviations: TL = `## The two layers`, GA = Guarantee audit bullet n, TA/TR = Trust, DA/DE = Determinism, ND =
"does NOT do", DR = doc-reconciliation.

### pharn-test

- GA1 writes tests only from a current Approved SPEC, a plan, a complete mapping → claims Floor 1 (checkers and
  primitives verbatim); "the SPEC pin shelled to check-plan-spec-agree.mjs" → owner `ac-tests.md` "What it proves".
- GA2 writes only the mapped test files + "a Bash write bypasses the hook (LIMITS.md §6)" → claims Floor 2, bound
  verbatim.
- GA3 the build cannot write an AC test file + bounds → claims Floor 3 carries "reopens it until /pharn-build
  re-checks it first thing" and "a filesystem equivalence wider than that fold is not modelled"; the fold detail and
  "never measured against APFS's own folding table" → owner `ac-tests.md` "The checker", paths paragraph.
- GA4 every AC's test collected and failed + both bounds (failed = the record's status / a typo; agreement, not
  provenance) → claims Floor 4, both bounds verbatim.
- GA5 the lock records the red run + "digests recorded, not re-checkable after the next run wipes <out>" → claims
  Floor 5, verbatim.
- GA6 a level with no runner stops the run + "the stop, the question and the closed line are this command's
  discipline" → claims Floor 6, verbatim.
- GA7, GA8 (tests assert the AC — ADVISORY; reads only SPEC/PLAN/AC-TESTS.md — ADVISORY) → claims Advisory,
  verbatim.
- GA9 reconciliation bound → claims Bound bullet; "No anchor is added here: an anchor RESETS the baseline" → owner
  `ac-tests.md` "What it proves" ("/pharn-test runs before the reconcile anchor, so its own Bash writes are not
  reconciled").
- GA10 e2e bound → claims Bound bullet, verbatim; Playwright `webServer` example → owner `ac-tests.md` "The red run".
- Trust: untrusted DATA → the trusted prefix (kept); gates over enums/ids/paths/digests, target column never
  interpreted → claims Untrusted input, verbatim; test ids copied into the lock as data → the trusted prefix; "tests
  you write … code for the human and later stages to judge" → claims Untrusted input, verbatim.
- Determinism: the closed refusal set → duplicate of Steps 0, 2, 2b, 5, B (each reason named at its step); "mode is
  --spec's exit" → Step 0 item 3; ambiguous `<name>` → ask → Step 0 item 1; "never continues to the build" → Step 2b.

### pharn-plan

- TL FLOOR (the input gate; first downstream consumer; the pin not decorative) → claims Floor 1.
- TL ADVISORY (plan content; downstream stages check) → claims Advisory. TL two clocks → claims Advisory.
- The honest-claim blockquote → claims Floor 1 + Advisory + Not-a-claim.
- GA1 → Floor 1, verbatim. GA2 (gate verdict deterministic / obeying advisory) → Advisory. GA3 → Floor 2 ("read
  from the structured frontmatter only").
- GA4 index matches canon (NARROWED: disposable cache; staleness; machine-local; COLD GREEN by design; consistency
  never correctness) → claims "Floor, narrowed", verbatim; the wrong-parser example → owner
  `pharn/floor/check-lessons-index.mjs`'s header.
- GA5 "index consulted ⇒ lessons read" FALSE; "typed floor" ≠ about the floor → claims Not-a-claim; the Step 1
  blockquote "What the index does and does not buy" (condensed in wave 3; its two struck claims are the block's
  Not-a-claim bullet, the model-drafted/ratified reason is the block's "Floor, narrowed" bullet).
- GA6 a stale/poisoned index cannot corrupt the gate → claims "Floor, narrowed", last sentence.
- GA7 → claims Advisory, verbatim ("the same four checks"). GA8 → Floor 2, bound verbatim.
- GA9 → Floor 4. GA10, GA11 → Floor 5, verbatim. GA12 → Advisory, verbatim. GA13 → Advisory + Not-a-claim.
- TA lessons untrusted DATA → Step 1 item 3 ("The lessons file is trust: untrusted DATA"); index titles verbatim,
  no decision reads them → claims Untrusted input, verbatim.
- TA SPEC body untrusted; gate over enum-gated fields → trusted prefix + claims Floor 1.
- TA PLAN body advisory, never injected, never gates → claims Untrusted input, verbatim. TA residual → claims
  Untrusted input ("bounded, not zeroed").
- DA proceed/refuse reads only the exit → Step 2 ("branch only on its exit code"). DA lessons sweep reads only the
  `--verdict` token → Step 1 item 3, verbatim ("never on the exit code alone"). DA terminal fallback → Steps 0, 2.

### pharn-grill

- TL FLOOR 1 (chain) → claims Floor 1. TL FLOOR 2 (lessons, reused, no new primitive; first check by a non-author)
  → claims Floor 2. TL "whether the lessons were applied is not floor-checkable" → claims Advisory. TL ADVISORY and
  two clocks → claims Advisory.
- GA1 → Floor 1, verbatim. GA2 → Floor 1 + Advisory. GA3 + "The body half is NOT proof of reading" → Floor 2, bound
  verbatim. GA4 (no longer self-attested — who, not what) → Floor 2, verbatim. GA5 ("[L1] ignored … both stops stay
  GREEN") → Advisory, verbatim; Not-a-claim. GA6 → Floor 2, verbatim. GA7 → Floor 3. GA8 → Advisory + Not-a-claim.
  GA9 (skills enumeration floor-grade, gates nothing) → "Floor-grade enumeration" + Advisory.
- TA inputs untrusted; chain over a state enum + two 64-hex digests; lessons over a regex-gated value + heading
  membership → claims Untrusted input, verbatim; "the checker's ★ tests prove a needle does not move the verdict" →
  owner `pharn/floor/check-plan-spec-agree.mjs` and its tests.
- TA outputs split → duplicate of `## Finding output` (untouched). TA installed skills untrusted → Step 3's skills
  paragraph + claims Untrusted input. TA residual → claims Untrusted input, verbatim.
- DA exit-code-only branches → Steps 2, 2b. DA terminal fallbacks → Steps 0, 1, 2.

### pharn-build

- TL FLOOR (1)–(4): chain, writes-scope hook, floor staying GREEN, test-stage gate → claims Floor 1, 3, 4, 2.
- TL ADVISORY implementation → Advisory. TL two clocks + "MUST hard-stop on a non-zero setter exit" → claims Floor 3
  ("the refuse … is command discipline, which is why Step 0 hard-stops on it"); the instruction duplicates Step 0
  item 3 (kept: "HALT on a non-zero exit from EITHER line").
- GA1 → Floor 1, verbatim. GA2 (test stage completed; obeying advisory; not provenance; the NOT-APPLICABLE bound)
  → claims Floor 2, bounds verbatim; the loop's refusal → owners `ac-tests.md` "The test-stage gate" and
  `pharn-loop.md` (S9).
- GA3 → Floor 1 + Advisory. GA4, GA5, GA6 → Floor 3, verbatim. GA7 → Not-a-claim. GA8 → "Floor-grade enumeration"
  - Not-a-claim; the Step 2b honest split (condensed in wave 3 into the Step 2b trust paragraph and the block).
- GA9 (seam-config validated FLOOR; recognizing and running it DOUBLY advisory; resolved correctly NOT a claim) →
  claims Floor 5 + Not-a-claim; the resolver bound → owner `pharn/pharn-core/seam-resolver/seam-resolver.md`
  (confidence gate, terminal ask) and Step 2c item 2.
- TA PLAN untrusted; SPEC hashed, not read; chain over an enum + two digests; scope path membership → claims
  Untrusted input, verbatim. TA not reading SPEC advisory → Advisory, verbatim. TA outputs never injected →
  Untrusted input, verbatim. TA skills untrusted → Step 2b + Untrusted input. TA residual → Untrusted input,
  verbatim. TA seam-config untrusted → Untrusted input; Step 2c item 1 (RED → HALT).
- DA exit codes / hook denies → Steps 0, 2, 4. DA skill discovery drives no branch → Step 2b. DA seam gate → Step 2c.
  DA terminal fallbacks → Steps 0–3.

### pharn-review

- GA1 → Floor 1. GA2 → Floor 2. GA3 → Floor 3. GA4 (parallel / reads only its slice / code has issue X — ADVISORY)
  → Advisory.
- GA5 slice ASSIGNED, FLOOR when the record is the emitter's output → Floor 4, verbatim. GA6 record's values NOT
  VERIFIED (self-declared `generated_by`; consistent fabrication passes; the measured hand-authored record exits 0
  GREEN) → Floor 4, verbatim — the measurement `pharn/floor/merge-findings.mjs:81` cites is kept word for word;
  `generated_by` detail → owner `pharn/floor/check-review-assignments.mjs`'s header.
- GA7 lens READ/reviewed struck → Not-a-claim; Step 1b's "never that a lens read, reviewed, covered or examined it";
  owner `render-review-assignments.mjs`'s header. GA8 → Advisory, verbatim. GA9 → Floor 4, verbatim; Step 6b.
  GA10 → enumeration + Advisory.
- GA11 backstop label deterministic → Floor 5; "no lens declares its class" → owner `merge-findings.mjs`'s header
  ("DERIVED, NEVER DECLARED"). GA12 → Floor 3, verbatim. GA13 scanner-assigned ≠ regex matched → Not-a-claim;
  owner `merge-findings.mjs`'s header. GA14 → Floor 5, verbatim ("resolves to unknown"); slice-miss reason → owner
  `merge-findings.mjs`'s header. GA15 → Floor 5 + Not-a-claim. GA16 → Advisory, verbatim.
- GA17 "a skill cannot suppress" struck; scanner-bound match only; scanner-less no backstop → Not-a-claim +
  Untrusted input; Step 3b carve-out byte-identical; "visible … narrows … closes none" → owner `merge-findings.mjs`'s
  header. GA18 → Not-a-claim.
- Trust → Untrusted input, verbatim; the trusted prefix and Step 3b (untouched).
- ND no approve/seal → Not-a-claim. ND no guarantee code correct/safe; scanner detects a SHAPE → Not-a-claim
  (duplicate; each lens's own scanner bound is its capability text). ND no new floor primitive → the block's intro.

### pharn-spec

- TL FLOOR (1)–(4) + kind-in-body in every state → claims Floor 1, verbatim; the kind-in-body reason → owner
  `spec-template.md`, "`spec_kind`". TL FLOOR (5) template rules → Floor 2; the rule list → owner `spec-template.md`,
  "The rules". TL ADVISORY/HUMAN → Advisory/human.
- The honest-claim blockquote → Floor 1/2 + Not-a-claim.
- GA1–GA4 → Floor 1. GA5 (template shape, bounded three ways) → Floor 2, verbatim. GA6, GA7 → Advisory. GA8
  (approval not offered while a marker remains — ADVISORY backstopped by FLOOR) → Advisory, verbatim.
- GA9 `spec_template` computed; provenance; hand-typed passes → "Floor, for what the checker PRINTS"; "never typed"
  → Step 3 item 1 ("never compute, shorten or retype a digest").
- GA10 → "Floor, for what the checker PRINTS", verbatim + Advisory; refusal list → owner `spec-template.md` "The
  project template". GA11 → verbatim ("every failure is a refusal (exit 1), never a fallback"); case-fold and
  symlinked-root detail → owner `spec-template.md` "The project template".
- GA12 guidance FLOOR on the write-tool surface; ADVISORY beyond → "Floor on the Write/… surface only" (Bash bound
  verbatim); the reconcile window → owner `spec-template.md` "The project template".
- GA13 → Advisory. GA14 (a human approved THIS intent; `--model-approve` ungated, not tamper-evident) →
  Advisory/human, verbatim; the self-flip remark → duplicate of Floor 1. GA15 → Advisory + Not-a-claim.
- TA prose → body DATA, never injected → Untrusted input, verbatim; the trusted prefix. TA gate isolation →
  Untrusted input, verbatim. TA template trusted by PATH; hook-protected fixed path; shipped default not protected;
  no floor trace → the block's four bullets; the fixed-path reason → owner `spec-template.md` "The project template";
  the shipped-default scope detail → owner `spec-template.md` "What the rules ARE and are NOT (P0)".
- DA → Step 3 items 1–3, Step 2's last bullet, Steps 4, 4a and `## --quick` (the rule 9 backstop), all kept.

### pharn-memory-promote

- TL FLOOR (1) candidate checks, (2) the write lands in the declared file → Floor 1, Floor 3. TL FLOOR NARROWED
  (commit `unknown`; §5's triple, the diff third declared missing rather than faked) → Floor 1, bound verbatim. TL
  ADVISORY/HUMAN → Advisory/human.
- The honest-claim blockquote (two clocks; nothing forces the command to run, `LIMITS.md §1d`) → the block's intro,
  verbatim + Not-a-claim.
- GA1 → Floor 1, verbatim. GA2 (no duplicate id, bounded: first token after `##`; a foreign scheme; Step 2 branch 3) → Floor 1, verbatim. GA3 (target one of two prescription files) → Floor 1; the enum pin → owner
  `pharn/floor/check-provenance.mjs`.
- GA4 canon-arg binding + NARROWED + history → Floor 2, bounds verbatim; the history → CHANGELOG [3.0.6] and
  `check-provenance.mjs`'s header ("CANON-ARG BINDING").
- GA5 type/concepts FLOOR; two clocks → Floor 1 + the intro. GA6 Step 6b ADVISORY twice → Advisory, verbatim. GA7 →
  Advisory/human + Not-a-claim. GA8 rendered tag line ADVISORY (`lesson-tagline-render-check`) → Advisory, verbatim;
  "substitute, don't recompose" → Step 6. GA9 → Floor 3, verbatim. GA10, GA11 → Advisory/human (+ Not-a-claim).
- TA body untrusted → the trusted prefix. TA propagation → Untrusted input. TA gate isolation → Untrusted input,
  verbatim. TA type/concepts laundering closure → Step 2's last bullet + Floor 1. TA residuals (misleading tag;
  the surface this command opens) → Untrusted input, verbatim.
- DA → Step 0 item 1, Step 2's three-way branch, Steps 4, 5 — all kept.

### pharn-ship

- The `--loop` section → Not-a-claim ("no --loop flag — the unattended capability is /pharn-loop, which keeps
  neither human gate") + Floor 3 (a single block, no loop); `/pharn-loop`'s behaviour → owner `pharn-loop.md`.
- GA1 → Advisory. GA2 (route from config, FLOOR given config) → "Floor, given the config", verbatim. GA3 (a routed
  stage ran on its model — never a guarantee; marker = request; served model evidence, not proof; effort struck) →
  same bullet, verbatim; owner `pharn/floor/stage-agent-core.mjs`'s header. GA4 (result SHAPE; content is the agent's
  claim; the routed-build exception) → the same bullet + Floor 1 (the exception, verbatim).
- GA5 → Floor 1, verbatim. GA6 (verdicts over tested gate maps; the stamp is consistency, not provenance) → "Floor,
  given the stamp", verbatim; completeness outside the map → owner `gate-run-record.md`. GA7 (retry) → Floor 3,
  verbatim. GA8 (gate discovery advisory; the exit floor) → Floor 1; the stage scripts' discovery → owners
  `stage-regress-core.mjs`, `stage-verify-core.mjs`.
- GA9 (reads the verify verdict THIS run produced; regress half `ship-regress-exit-binding`) → Advisory, verbatim.
  GA10 → Advisory, verbatim. GA11 (writes only three artifacts — the hook; the deny floor, the intended scope
  advisory; NARROWED) → "Floor: hook (fix #7)", verbatim; the history (the per-artifact `--target` fix) → CHANGELOG.
  GA12 (BRIEFING.md — the one new primitive; not gating) → "Floor, never gating", verbatim; owner
  `ship-briefing.md`. GA13 (no git write; not floor by absence) → Advisory, verbatim.
- GA14 (cost.json/RUN-REPORT.md every exit — ADVISORY; position is a property of the bytes) → Advisory, verbatim;
  the hygiene pin is dev-only and not cited in the shipped block. GA15 (views recompute; NARROWED) → "Floor, reused",
  verbatim; owner `cost-ledger.md`. GA16 (outcome two halves) → same bullet, verbatim; owner
  `ship-outcome-core.mjs`'s header. GA17 → same bullet's last sentence; owner `render-run-report.mjs`'s header. GA18
  → "Its exit gates nothing (fix #3)" + Not-a-claim. GA19 (the ledger does not account for the whole run) →
  "window-bound and single-session" + owner `cost-ledger.md` ("Run membership"; "The start boundary, and why
  `/pharn-ship` needs a pending one", which holds "The request that ISSUES a boundary call precedes the marker it
  writes").
- GA20 (net: one new primitive; the retry's primitive is verify's; the routing read) → the intro + Floor 1 + the
  config bullet. GA21 → Not-a-claim, verbatim.
- TR control flow reads only enum-gated classes → Untrusted input, verbatim. TR stage free text quoted DATA →
  Untrusted input, verbatim; the trusted prefix. TR user description → duplicate (the trusted prefix and
  `/pharn-spec`). TR stage-agent report (exit + closed line floor; control flow never uses the prose — ADVISORY; §5
  residual bounded, not zeroed) → Untrusted input + the config bullet; the relay rules → `## Running a stage` "A
  question, round-tripped" (kept) and owner `stage-agent-core.mjs`'s header (brief rule 5, "no larger than inline").
  TR BRIEFING frontmatter from JSON/frontmatter only → Untrusted input + "always labelled"; the ★ tests → owner
  `render-ship-briefing.mjs`'s tests. TR residual → Untrusted input.
- ND no `--yolo`/self-grilling/self-approval → Not-a-claim; `## The two human gates`. ND no auto-act at GATE 2 →
  Not-a-claim. ND no new gating primitive; the quick kind read; the routing read; one non-gating primitive → the
  intro + Floor 1 + the config bullet + "Floor, never gating" + "Floor, quick mode". ND no git WRITES → Advisory +
  Not-a-claim. ND no `--loop` → Not-a-claim + Floor 3. ND no routing of spec/regress/verify; no effort routing →
  the config bullet ("effort is not routed"); `## Running a stage` (kept). ND `--quick` is not `--yolo` → `## Quick
mode`'s opening sentence.
- DR (§6 names ship terminal; no automated decision or seal) → Not-a-claim; `## The two human gates`; owner
  `pharn/ARCHITECTURE.md §6`.
- Wave 2, `## Quick mode`'s own audit ("What quick mode claims, and what it does not") → the block's "Floor, quick
  mode" bullet (rule 9; the same AC evidence; the two named gating reads and the kind read's two-way bound, verbatim;
  the scope check's rewrite-its-own-`## Files` bound, verbatim; the omissions advisory; the marker bound — "a skipped
  or wrong mode marker never yields `gate2`" verbatim, its case list → owner `ship-outcome-core.mjs`'s header) and
  Not-a-claim ("the change is small"). The first-token bullet `FIRST_TOKEN_ADVISORY` pins stays inside the section,
  under "**What quick mode claims** — the rest is in `## What you may claim`:".
- Step 2d's own audit ("there is NO floor element in this step. Zero.") and Step 3b's audit → the block's Advisory
  bullet (slug check, `gh`, no git WRITE) and the attestation Floor bullet, verbatim.
- Cross-references re-pointed in wave 1: the opening blockquote ("Guarantee audit" below → the claims block), the
  two-gates paragraph, Step 3b's `/pharn-loop` note → "`/pharn-loop`'s `## What you may claim`", the release pointer.

### pharn-loop

- GA1 → Floor 1, verbatim. GA2 (test stage before build; policy flag; both bounds) → the test-stage Floor bullet,
  both bounds verbatim; the policy flag → Step 4; S12 → Step 2 row S12 + Step 4 ("never by relayed text").
- GA3 (AC-evidence red never retried) → Floor 1 + Advisory; the AC gate's bounds → owner `ac-gate-core.mjs`'s
  header; the re-derivation → owner `loop-fresh-core.mjs`'s header (check E). GA4 (reconcile red never retried;
  stamp forgery) → Floor 1 + the record bullet ("the forgery narrows to a self-consistent fabricated stamp set");
  owners `gate-run-record.md`, `loop-fresh-core.mjs`.
- GA5 (the stop read only from THIS tree; seven checks; four bounds) → the freshness Floor bullet, all four bounds
  verbatim; the seven checks → Step 5 item 3 and owner `loop-fresh-core.mjs`'s header.
- GA6 → "Floor compare, ADVISORY bound", verbatim. GA7, GA8, GA9 → "Floor: hook (fix #7)", verbatim.
- GA10 → the record bullet + Advisory. GA11 (decision re-derived; bounds; blocked exempt) → the record bullet,
  verbatim; retroactivity → owners `check-loop-decision.mjs`'s header and `loop-record.md`.
- GA12, GA13 → Advisory, verbatim; "Forging Approved stays LIMITS §1d" → owner `LIMITS.md §1d`.
- GA14 (every question maps to one row; the hygiene test pins presence + closure) → Advisory; the
  `.dev/floor/command-hygiene.test.mjs` cite is dead for an install (L33) — retired, not replaced.
- GA15 → Advisory, verbatim. GA16 → Floor 1 "Structural", verbatim.
- GA17 Stop guard (deterministic; visible and costly, never impossible; cannot judge; `touch LOOP.md`; `LIMITS.md
§7`; fails open) → Advisory, verbatim — **except** "inert until a human wires it", which is FALSE (the shipped
  `.claude/settings.json` has wired it since 6.12.0): dropped (L25); owner `.claude/hooks/require-loop-record.cjs`'s
  header.
- GA18 → Not-a-claim, verbatim.
- TR control flow reads only deterministic output → Untrusted input, verbatim. TR untrusted prose reaches the
  approved pin; ENLARGES the residual → Untrusted input, verbatim; the bound list → duplicates of the hook, Advisory
  and Not-a-claim bullets; "canon denylist" → `pharn-memory-promote.md`'s claims block. TR code EXECUTED before a
  person sees it → Untrusted input, verbatim. TR staging list; literal pathspecs → Untrusted input, verbatim; Step 6c.
  TR slug + commit message → Untrusted input; Step 1a S1 and the Step 6c commit line. TR prior Handoff → Untrusted
  input, verbatim; Step 1b. TR Stop-guard marker/counter → Untrusted input; the rest → owner
  `require-loop-record.cjs`'s header. TR freshness ledger + stamps; the single mutable scope file → Untrusted input,
  verbatim.
- DE → Step 5 items 3–4, Step 2's opening paragraph, Step 2 ("S4–S13 stop it") — all kept.
- ND no push/merge/seal/attestation; no `--no-verify`; no retry of unmeasured/AC-evidence/reconcile; no guess at a
  stuck point; no model approval left behind; no unbounded iteration; no re-spec/re-plan; no presenting the model's
  approval as a person's → Not-a-claim, Floor 1, Floor compare, Advisory, and Steps 2, 5, 6c, 7 (each kept).
- DR `LIMITS.md §1d` backstop list; `/pharn-verify`'s trust premise → "Reported for a human", verbatim. DR §6 → Not-a-claim
  ("the merge decision stays a person's"); owner `pharn/ARCHITECTURE.md §6`.
- Wave 2, `## Quick mode`'s own audit → the block's "Floor, quick mode" bullet (the verify-only stop and the
  `STOP_GREEN_QUICK` ⇔ quick binding; the mode read and its check-I bound; the fabrication checks; the scope check
  with "nothing downstream re-checks it" and its three reasons, verbatim; the quick briefs and "a miss fails safe")
  and Not-a-claim ("the change is small"); the `LOOP_QUICK_SECTION_PINS` sentences stay in the section.
- Cross-references re-pointed in wave 1: Step 1b "(see Trust)" → "(see the claims block)"; the release pointer.

## The rationale ledger (§3) — per section, what left and which owner holds it

Kept in every section: steps, pinned lines, fenced blocks, exit/verdict/stuck-point mappings, prompts, human gates,
trusted prefixes and P2 fences. What left, by section (bytes: base → now):

### pharn-ship.md

- Preamble (7,326 → 3,401): the "PRODUCT command" blockquote → `pharn/features/README.md` (the boundary); "Two
  clocks" → the claims intro; the `--quick` note's floor-backstop sentence → "Floor, quick mode".
- Step 1 (4,111 → 2,270): the pending-start and `run-start` rationale and bounds → `cost-ledger.md`, "The start
  boundary, and why `/pharn-ship` needs a pending one" and "Run membership" (both cited in place).
- `## Running a stage` (5,833 → 5,277): the opening "why" (a command's `model:` lasts its turn) → CHANGELOG [6.27.0]
  and `stage-agent-core.mjs`'s header; the unpinned bounds sentences (hang, request vs served model) → the claims
  config bullet + `stage-agent-core.mjs`'s header.
- `## Quick mode` (17,074 → 10,614): item 7's security-history narrative → CHANGELOG [6.28.0] and
  `quick-scope-core.mjs`'s header; the scope check's mechanism → `check-quick-scope.mjs` / `scope-inputs.mjs`
  headers; the re-build's re-anchor aside; the "not removed, deliberately" explanation of stale artifacts →
  `render-run-report.mjs`'s header; the quick audit → the claims block (mapped above); the two-gating-reads paragraph
  → "Floor, quick mode".
- Step 2 (20,786 → 16,415): the spec-inline "why" → CHANGELOG [6.27.0]; the run-marker "why" → `run-marker.mjs`'s
  header; the grill divergence note → `pharn-grill.md` (the two stops); the regress-residual narrative →
  `stage-exit.md`'s exit table and `regression-report.md`; the chain-consumer paragraph → each stage's own gate;
  the "no product /review stage" note → `pharn/ARCHITECTURE.md §6`.
- Step 2b (6,698 → 3,813): the precedence rationale → `check-verify.mjs`'s header and `verify-report.md`; the
  6.20.4 and 6.26.0 histories → CHANGELOG [6.20.4], [6.26.0]; "why the iteration number" → `cost-ledger.md`; the
  retry audit → the claims Floor 3 bullet (mapped above).
- Step 2c (7,527 → 3,022): the three-`--target` explanation and the `--amend-scope` rationale → `set-writes-scope.cjs`
  and `reconciliation-record.md`; the HONEST TRIGGER note → CHANGELOG; the "Why --target is not optional"
  blockquote (history) → CHANGELOG; render/format details → `ship-briefing.md`, `render-ship-briefing.mjs`.
- Step 2d (4,920 → 2,046): the injection-surface reasoning and the Step 2d audit → the claims Advisory bullet
  (verbatim bounds) and follow-up `ship-slug-shape`.
- Step 3 (4,896 → 3,999): the "why this call is required here" two reasons → the setter's one-`--target` rule
  (`set-writes-scope.cjs`); one clause kept: re-scope to `SHIP.md` now.
- Step 3a (10,757 → 3,592): the position rationale, the git-READ note, the outcome derivation → `ship-outcome-core.mjs`'s
  header and `cost-ledger.md`; the two-cost-figures note → `cost-ledger.md` / `ship-record.md`; the ADVISORY/fix #3
  paragraphs → the claims "Floor, reused" and Advisory bullets.
- Step 3b (8,000 → 5,375): the cost-block rendering detail → `cost-ledger.md` "One row per request" and
  `render-cost-record.mjs`; the Step 3b audit → the attestation Floor bullet.
- Final step (1,712 → 554): "Why this exists" and the posture paragraph → `.claude/hooks/set-writes-scope.cjs`'s
  header (cited) and `enforce-writes-scope.cjs`'s header.

### pharn-loop.md

- Preamble (9,392 → 3,315): the four-primitives paragraph → the claims intro; the "PRODUCT command" blockquote (its
  "use /pharn-ship if you want to approve" sentence survives in the description's "only when the user asks" and
  `## What an unattended run changes`); "Two clocks" → the claims intro and Advisory bullet.
- Step 1 (7,515 → 4,783): the cap-key deferral note; the L21 citation (kept: "`-uall` lists an untracked
  directory as its files"); the Stop-guard paragraph, including the stale "acts only once a human has wired it" and
  its dead `.dev/` cite → `require-loop-record.cjs`'s header; the run-start window rationale → `cost-ledger.md` "Run
  membership".
- Step 2 (11,257 → 10,091): the regress/verify stage-exit mapping histories (A7, GRILL G5 disclosures) → CHANGELOG
  [6.23.0], [6.26.0]; every mapping row kept.
- `## Running a stage` (5,716 → 5,247): the opening "why" and the bounds sentences → as for ship.
- `## Quick mode` (18,688 → 11,585): the mode-binding paragraph (except its pinned sentence) → `loop-mode-core.mjs`'s
  header; item 5's mechanism → `quick-scope-core.mjs` / `scope-inputs.mjs`; the question table reduced to its four
  quick-only rows (S6c ×2, the scope check's S9, the `regress` RERUN's S11) under a pointer to Step 2 for the rest;
  the D8 paragraph condensed (its outcome — no commit, `MODE_MISMATCH` — kept); the quick audit → the claims block.
- Step 5 (10,149 → 7,254): the per-iteration marker rationale → `cost-ledger.md`; the stamp/completeness paragraph →
  `gate-run-record.md`; the FRESH-means detail → `loop-fresh-core.mjs`'s header (the tree-identity bound is kept in the
  claims block); "What a retry does and does NOT buy" → the claims Floor 1 bullet.
- Step 6 (18,051 → 14,912): the `cap` and Handoff rationale → `loop-record.md`; the decision-check rationale →
  `check-loop-decision.mjs`'s header; the ledger ADVISORY paragraphs → `cost-ledger.md` and the claims block; the
  `git check-ignore` history → CHANGELOG [6.19.0]; the L38 citation (the instruction "never reuse the scope file an
  earlier stage left" kept).
- Final step (2,775 → 1,096): as for ship; the `--close` paragraph condensed to its instruction and the write-guard
  bound (owner `enforce-writes-scope.cjs`'s header, "RUN MARKERS ARE READ, NEVER PARSED").

### The seven stage commands

- **Every one:** the "PRODUCT command" blockquote → `pharn/features/README.md`; the Step 0 setter paragraph's
  `CLAUDE.md, "Writes-scope"` cite (CLAUDE.md is not installed) → `set-writes-scope.cjs`'s header; the Final step as
  for ship.
- **pharn-memory-promote** (−14,993): the "most cautious stage" rationale → `THREAT-MODEL.md §2 #3`; the TYPE-ENUM
  ratification history → `check-provenance.mjs`; Step 0's `--amend-scope` "Why" → `reconciliation-record.md`; Step 2's
  duplicate-id bound → the claims Floor 1 bullet (verbatim); Step 6's format and Step 6b rationale → the claims
  Advisory bullet.
- **pharn-spec** (−12,675): the two layers and the opening restatement → the claims block; Step 4's "What this is,
  stated exactly" → Step 4a (kept: "never presented as a human sign-off") and `LIMITS.md §1d`.
- **pharn-review** (−15,369): Step 0's two measured blockquotes → condensed into one blockquote keeping the release
  instruction, the no-setter reason and the true width ("writes only inside `pharn/features/**` or `.pharn/**`"),
  whose measurements the CHANGELOG records (the entry that added Step 0, and [6.24.0] for the run marker); Step 1b's
  measured history → CHANGELOG; Step 5's degenerate-key
  blockquote → condensed, keeping "never read a merged scalar triple as one lens's verdict", with the key detail owned
  by `merge-findings.mjs`'s header; Step 6's asymmetry and cause-neutral blockquotes → condensed to their instructions
  (the banned words, cause-neutral text, MD028); Step 6b's P7 note → the claims Floor 4 bullet
  (`review-assignments-gate`).
- **pharn-build** (−16,582): the opening three-gate restatement → the claims block; Step 0's scope-source note and
  anchor rationale → `reconciliation-record.md` and `LIMITS.md §6`; Step 2b's honest split → the claims enumeration
  bullet; Step 2c's extraction and "DOUBLY advisory" paragraphs → the claims Floor 5 bullet and
  `seam-resolver.md`.
- **pharn-grill** (−14,326): the opening two-natures, honest-claim and divergence blockquotes → the claims block;
  Step 2b's "Why this stage" (P7) → CHANGELOG [2.8.0]; Step 3b's griller runner deferral → the claims Advisory bullet
  and `count-grillers.mjs`.
- **pharn-plan** (−13,132): the two layers → the claims block; Step 1's index blockquote → condensed to its
  instructions (read canon in full on `?`); Step 4b's two-clocks blockquote → the claims Floor 2 bullet.
- **pharn-test** (−6,413): the opening "why tests before the build" and honest-claim blockquote → the claims block and
  `ac-tests.md`; Step 2b's `/pharn-loop` explanation → `pharn-loop.md` Step 4 and `check-test-stage.mjs`.
- **pharn-regress, pharn-verify (D9):** only the description and the blockquote.

### Condensed rather than purely deleted (flagged for the review)

The editing rule is "delete, never paraphrase". Where an instruction and its rationale were interleaved across a
paragraph, the build kept the instruction clauses and joined them, which re-words the paragraph: `pharn-review.md`
Step 0's blockquote, Step 5's degenerate-key blockquote and Step 6's asymmetry paragraph; `pharn-loop.md`'s D8
paragraph in `## Quick mode` and its Step 1a Stop-guard paragraph; the `--close` paragraph; each command's Final
step sentence; and `pharn-ship.md`'s "What quick mode claims" lead-in. No fenced line, pinned literal or heading
changed in any of them (the survival check and the suite).

## Inbound cites (§3, G4) — the pinned search, every line marked

`git grep -n -E "(/pharn-(ship|loop|spec|plan|grill|test|build|review|memory-promote)|pharn-(ship|loop|spec|plan|grill|test|build|review|memory-promote)\.md)[^|]{0,30}(Step [0-9][a-z]*|item [0-9]+|## )" -- pharn/pharn-contracts 'pharn/floor/*.mjs' '.claude/hooks/*.cjs' THREAT-MODEL.md LIMITS.md pharn/ARCHITECTURE.md ':!*.test.*'`
→ exit 0, 41 lines. Each resolves: the text it relies on is still at the cited step or item.

- `require-loop-record.cjs:21` — Step 6b + the 6c commit gate: resolves.
- `require-loop-record.cjs:71` — Step 1a's `--open`: resolves.
- `THREAT-MODEL.md:65`, `:89` — `pharn-review.md` Step 3b's carve-out, byte-identical: resolves.
- `check-lessons-index.mjs:37` — `/pharn-plan` Step 1 runs it: resolves.
- `check-loop-decision.mjs:32` — `/pharn-loop` Step 6c's commit gate: resolves.
- `check-loop.mjs:31`, `:79`, `:99`, `:326` — Step 6a's revert, Step 6c's commit, `/pharn-build` Step 0's re-anchor:
  resolve.
- `check-quick-scope.mjs:3`, `quick-scope-core.mjs:2` — `/pharn-ship --quick`'s item 7: resolves (numbering frozen).
- `check-verify.mjs:83`, `:100`; `gate-run-core.mjs:50`; `run-gates.mjs:582`; `gate-run-record.md:116`;
  `verify-report.md:290` — `/pharn-ship` Step 2b's single rebuild, heading unchanged: resolve.
- `loop-fresh-core.mjs:189` — Step 1a creates `.pharn/pharn-loop/<name>/`: resolves.
- `loop-mode-core.mjs:16`, `:20` — `## Quick mode`'s S11 row (kept among the quick-only rows) and Step 6a: resolve.
- `merge-findings.mjs:116` — `/pharn-review` Step 3's now/then distinction: **resolves after the restore** (it was
  removed in wave 3 and put back byte for byte).
- `merge-findings.mjs:126`, `:132`, `:212` — Steps 5, 1b, 4: resolve.
- `render-cost-ledger.mjs:787` — `/pharn-loop` Step 7's table: resolves.
- `render-review-assignments.mjs:34`, `:49`, `:89`, `:115`, `:241` — `/pharn-review` Step 1 (untouched): resolve.
- `render-run-report.mjs:12`, `:28` — `/pharn-loop` Step 6c, render before the commit: resolve.
- `stage-agent-core.mjs:267`, `:494` — `pharn-loop.md` Step 2's stuck-point table: resolves.
- `ac-tests.md:27` — `/pharn-plan` Step 4c: resolves.
- `cost-ledger.md:665` — `/pharn-ship` Step 3a: resolves.
- `loop-record.md:126`, `:257` — `/pharn-loop` Step 6c: resolves.
- `spec-template.md:182`, `:223` — `/pharn-ship`'s `## Quick mode`, `/pharn-spec` Step 4a: resolve.

**Three section-name cites outside that search** (found by a referent sweep, L50): `merge-findings.mjs:63`
("/pharn-review's own guarantee audit STRIKES 'a skill cannot suppress a finding'") → the claims block's Not-a-claim
carries it; `merge-findings.mjs:81` ("records this as MEASURED — a hand-authored record exits 0 GREEN") → the claims
Floor 4 bullet keeps the measurement verbatim; `render-review-assignments.mjs:16` ("its Guarantee audit already strikes
'each reads only its slice'") → the claims Advisory bullet. Each **resolves by content**, but the three name a heading
that is now `## What you may claim` — heading-name drift, and D3 forbids editing the modules here (open issue below).

## The budget test (§7) — written, and each control confirmed red

- `COMMAND_BYTE_CEILINGS` from the measurement above (eleven entries), `DESCRIPTION_MAX_BYTES = 250`, R1–R5 each over
  the whole set, one control per property, the P0 bounds in the section header.
- `node --test --test-name-pattern "BUDGET" .dev/floor/command-hygiene.test.mjs` → first run exit 1: R3's control
  expected the text "cannot parse", but the reader's message says "not one double-quoted scalar this reader can parse".
  The two control regexes were corrected to `/not one double-quoted scalar/` → exit 0, 5 / 5.
- **Each rule run once red against the real corpus** — `node .pharn/pharn-dev-build/mutate.mjs` → exit 0, running the
  BUDGET tests over a mutated copy of `.claude/commands/` (only `COMMANDS_DIR` changed in a copy of the test):

  | Mutation                                  | Exit | Red  |
  | ----------------------------------------- | ---: | ---- |
  | none                                      |    0 | none |
  | an extra `pharn-zz.md`                    |    1 | R1   |
  | `pharn-test.md` removed                   |    1 | R1   |
  | `pharn-ship.md` one byte over its ceiling |    1 | R2   |
  | `pharn-loop.md` description of 251 bytes  |    1 | R3   |
  | `pharn-review.md` description "… (P0)."   |    1 | R4   |
  | `pharn-build.md` claims heading removed   |    1 | R5   |
  | `pharn-build.md` claims heading doubled   |    1 | R5   |

## Commands run, with exit codes (after the waves)

- `npx prettier --ignore-unknown --check` over the eleven commands → exit 0 after one fix: two lines whose code span
  had been split across a line break (`pharn-ship.md`'s `--spec-kind`, `pharn-review.md`'s `PHARN ✓ reviewed`) were
  re-worded so no span is split, then `--check` → exit 0.
- `npx markdownlint-cli2 --no-globs` over the eleven commands → exit 0.
- `npx prettier --ignore-unknown --write .dev/floor/command-hygiene.test.mjs CLAUDE.md README.md CHANGELOG.md
SKILLS_VERSION` → exit 0 (the test file re-wrapped; the rest unchanged).
- `npx eslint .dev/floor/command-hygiene.test.mjs` → exit 0.
- `npx markdownlint-cli2 --no-globs CLAUDE.md README.md CHANGELOG.md` → exit 0, 0 issues.
- `npm run check:changelog` (shape) → exit 0, `CHANGELOG.md's newest section is "## [6.28.1] - 2026-09-27", matching
SKILLS_VERSION "6.28.1"`.
- `node pharn/floor/validate.mjs .` → exit 0, `FLOOR: GREEN — 36 capabilities checked in "."`.
- `npm test` → exit 0, 4,012 tests, 4,012 pass (4,007 + the five BUDGET tests).
- This file, then `npx prettier --ignore-unknown --write` and `npx markdownlint-cli2 --no-globs --fix` on it, the
  scratch deleted, and `npm run check` and `npm run check:changelog-entry` — their exits are in the stage report,
  because they ran after this file was written.

## Deviations from the plan, stated

- **One in-scope edit through Bash.** The R3 control-regex correction above was applied with a `node -e` string
  replace on `.dev/floor/command-hygiene.test.mjs`, not with the Edit tool. The path is in `## Files` (so the scope
  and the reconcile gate cover it); the deviation is from the orchestrator's "use the Edit tool" rule, recorded here.
- **Decision-token dispositions are grouped by section** (above), not listed line by line.
- **Three estimates missed** (above); the total is inside its estimate.
- **Condensed paragraphs** (above) — instruction clauses joined where they were interleaved with rationale.

## Open issues (named, not fixed here)

- **Heading-name drift** in `merge-findings.mjs:63`, `:81` and `render-review-assignments.mjs:16` ("guarantee audit"):
  the content they cite is in `/pharn-review`'s `## What you may claim`; re-point when those headers next change
  (D3 forbids editing them here).
- **`pharn-ship.md` Step 3 still cites `CLAUDE.md`, "Writes-scope"** (CLAUDE.md does not ship); so do the thin callers
  `pharn-regress.md` and `pharn-verify.md`, left alone by D9. A one-clause re-point to `set-writes-scope.cjs`'s header
  would be the fix.
- **`pharn-review.md` Step 3b's "twelve lines above"** was already stale at the base (the carve-out is byte-identical,
  THREAT-MODEL cites it) — left as it was.
- The named follow-ups of the plan stand: `quick-mode-on-demand`, `dev-command-slim`, `ship-closeout-script`,
  `description-claim-paraphrase`, `reads-trim`.
