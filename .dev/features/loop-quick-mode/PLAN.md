# PLAN — loop-quick-mode: `/pharn-loop --quick`, the unattended loop for a quick SPEC

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4 # fix #4
- applied_lessons: [L1, L2, L3, L5, L6, L7, L10, L13, L14, L15, L17, L18, L19, L20, L21, L22, L25, L26, L27, L28, L29, L30, L31, L33, L34, L35, L36, L37, L38, L39, L40, L41, L42, L43, L44, L45, L46, L47, L49, L50, L52, L57, L58, L60, L61, L62]
- increment: `/pharn-loop --quick` runs a `spec_kind: quick` SPEC unattended — the model writes and approves it, the grill runs its floor stops only, test-first evidence stays, `/pharn-regress` is skipped (its scope check is kept), and `check-loop.mjs` decides every stop over `/pharn-verify`'s verdict alone, in a mode read from the SPEC's pinned kind, never from a flag; its green is `STOP_GREEN_QUICK`, which is not `STOP_GREEN`.
- layer(s): product floor (`pharn/floor/`), `pharn-contracts` (L-1, schemas only), product commands (`.claude/commands/pharn-*.md`), shipped doc (`pharn/floor/README.md`), trusted doc `LIMITS.md` (a human-applied patch), repo-meta (`CLAUDE.md`, `README.md`, `CHANGELOG.md`, `SKILLS_VERSION`). No `role:` capability.
- constitution_refs: [P0, P1, P2, P3, P5, P6, P7]
- stage model: plan — opus — set by the maintainer's instruction; routed via Agent subagent; effort not routed
- base: branch `loop-quick-mode` at `eec6535` = `origin/main` `ec06f7b` (6.24.0) plus the unmerged Phase 3.1 `ship-quick-mode` (6.25.0), including its human-applied trusted docs (`fb8bf5b`). `SKILLS_VERSION` 6.25.0, `MIN_CLI` 0.5.0. Bumps to **6.26.0** (minor). `stage-verify-script` (Phase 1.2) is also slated for 6.26.0 and `stage-model-routing` (Phase 2.2) bumps too; whichever merges later renumbers by diff.
- roadmap: Phase 3.2 of the token-reduction roadmap (maintainer-approved 2026-09-25).

## Applied lessons

- **L1** — every meta-doc that states a fact this changes is in `## Files`: `CLAUDE.md` (the four loop-checker Commands entries, a new `check-loop.mjs` entry, the spine paragraph, two "Step 6c stays gated on `STOP_GREEN`" comments), `README.md` (badge, the `/pharn-loop --quick` usage, the commands row, the paper-trail lines, the token-cost bullet, the regenerated inventory), `pharn/floor/README.md`, `CHANGELOG.md`, `SKILLS_VERSION`, and `LIMITS.md` through the patch.
- **L2** — the quick loop's bounds are written into the durable artifacts (`pharn-loop.md`'s `## Quick mode`, `loop-record.md`, `cost-ledger.md`, `spec-template.md`, the headers of `check-loop.mjs`, `loop-fresh-core.mjs` and `loop-mode-core.mjs`, the LIMITS patch), and every floor claim below cites an op read this run (`specAcceptanceCriteria`, `check-loop.mjs`'s table, `loop-fresh-core.mjs`'s checks A–J, `check-loop-decision.mjs`'s live re-run).
- **L3** — the SPEC's kind becomes load-bearing for the loop's STOP, so every consumer of the stop and of the record was re-audited (Discovery, "Consumers of the decision"): both checkers' decision enums, `readOutcome`, `check-cost-ledger` rule 7, `render-run-report.mjs`, Steps 6a/6c/6d and the staging list.
- **L5** — the one floor input the mode adds (the SPEC's kind) is read by code, never passed by the model; the one model-assembled input set a quick iteration keeps (the scope check's `--changed` / `--declared`) is labelled advisory and named as a pending follow-up.
- **L6** — the mode is read from the SPEC's structured frontmatter through the one kind reading, and the record's mode from `LOOP.md`'s frontmatter envelope only — never grepped from prose.
- **L7** — `/pharn-loop`'s `writes:` stays `[SPEC.md, LOOP.md]`: a quick run writes a subset of the same artifacts, so no declaration grows.
- **L10** — `LOOP.md` and the quick `GRILL.md` sit on `validate.mjs`'s scanned surface; neither carries a finding object, so CHECK 5 is not engaged (the quick `GRILL.md` shape is 3.1's, unchanged).
- **L13** — the build formats every file it writes (Build procedure), and this stage formats this PLAN.
- **L14** — the new `mode` envelope field passes `cleanScalar` before exact membership, in both loop-record checkers.
- **L15** — the mode and decision vocabularies are `Set`s tested with `.has()`, never plain-object lookups.
- **L17** — the quick scope check is changed-since-`<base sha>`, with the same `--feature` exemptions `/pharn-regress` passes, so its false-positive profile is exactly the full loop's regress partition's.
- **L18** — this plan's exclusion block is its own `###` heading.
- **L19** — every Bash write is declared: `npm run docs:generate`'s README rewrite, the patch generator's two outputs and its scratch, and the scoped formatter runs; quick mode adds no Bash write to `/pharn-loop` (it removes one, the report render).
- **L20** — its prescribed check was run by hand at this stage: `set-writes-scope.cjs --from-plan` over this PLAN printed `32 path(s)` against the 32 `## Files` bullets, and the `###` exclusion block contributed none (Discovery).
- **L21** — the scope check's inside set is listed per file (`git diff --name-only` plus `git ls-files --others`), never from `git status`.
- **L22** — every new command line is pinned: the `--spec-kind` line, the git listing block, the quick scope line, and the invocations `/pharn-spec --quick --model-approve <description>` and `/pharn-grill <name> --quick`.
- **L25** — rationale comments that state the old story are re-derived, not carried: `check-loop.mjs`'s input-signature and trust notes, `loop-fresh-core.mjs`'s "why a separate checker" and its check table, the structural notes in `check-loop-record.mjs` and `check-loop-decision.mjs`, and `render-run-report.mjs`'s Step-6c comment.
- **L26** — the LIMITS patch is checked against this repo's real paths (`git apply --check` on the working tree, before anything is written), and `apply.sh` re-runs `validate` and `check:markers` on the applied bytes at the real path; the generator never writes a trusted-doc path, not even a scratch copy under that name.
- **L27** — each new stop names a remedy reachable from its own branch: S6c (narrow the intent, or re-run without `--quick`), a quick-mode RERUN naming `regress` (S11 — the SPEC no longer reads quick; a person inspects it), and the scope STOP (S9 — declare the path through a re-plan, or revert the change, as for `/pharn-regress`'s `scope-escaped`).
- **L28** — every `## Files` bullet is one line, so no wrapped continuation can meet the setter's exclusion cue.
- **L29** — each set is materialized once and iterated: the quick skip set, the check-applicability table, the loop's decision vocabulary, the quick question paths, and `STUCK_POINTS` with S6c.
- **L30** — every check a quick iteration names is a pinned line the command invokes (the kind read, the git listing, the scope line, and the unchanged freshness and stop lines); nothing is asked for in prose.
- **L31** — `/pharn-ship --quick` and `/pharn-loop --quick` are a deliberate pair, so their obligation set is enumerated once (Design §5, "The pair's obligations") with each side's answer written — including the one the loop deliberately does NOT take, the run-start mode marker (Design §8).
- **L33** — the sentences that expire when this lands are in `## Files`: `/pharn-spec`'s "report back blocked … No shipped command passes both today" (two sites) and its description's kind clause, `spec-template.md`'s "never under `--model-approve`", `pharn-grill.md`'s "`/pharn-ship --quick` invokes this form", `LIMITS.md §3a`'s "The manual flag is `/pharn-ship --quick`", and the floor README's `--spec-kind` consumer list.
- **L34** — every new enumeration asserts its size (`LOOP_MODES` 2, the quick skip set, the decision vocabulary 5, `STUCK_POINTS` 15), and the quick FRESH control passes because every verify check genuinely ran over a real `check-verify.mjs` report.
- **L35** — one owner per fact: the loop's mode rule lives only in `loop-mode-core.mjs`, read by `check-loop.mjs` and `loop-fresh-core.mjs`; the kind reading stays `spec-template-core.mjs`'s; and the loop writes no run-start mode marker, which would be a second, unverified copy of the SPEC's kind.
- **L36** — closures, not presence: every `STOP_GREEN`-prefixed token in the command corpus must be a member of {`STOP_GREEN`, `STOP_GREEN_QUICK`}; both record checkers accept exactly the stop tokens `check-loop.mjs` can emit; the hygiene `blocked:` closure gains `not-quick`.
- **L37** — each quantified claim is probed with a member expected to fail: a feature SPEC never yields `STOP_GREEN_QUICK` and a quick one never `STOP_GREEN`; stale regress evidence on disk never changes a quick decision; a drifted kind is caught by check I.
- **L38** — the Step-6c scope re-derivation is unchanged, and `APPLY.md`'s out-of-order case re-runs the plan setter before re-anchoring.
- **L39** — the `spec_kind:` line gains one more reader (the loop's mode); it reads through the same function `check-spec.mjs --spec-kind` prints, and a parity test holds "quick for the loop" equal to "`quick` from the CLI" on every fixture.
- **L40** — the attribution "the kind, not a flag, selects the table" is probed with the condition varied: the same reports under a flipped kind change the table, and an argv flag changes nothing (it is refused).
- **L41** — each default is exercised: reports with no `SPEC.md` beside them (every existing `check-loop.mjs` fixture) read full; an absent record `mode` and an absent JSON `mode` both read full in `check-loop-decision.mjs`.
- **L42** — `check-loop-decision.mjs` re-derives AFTER Step 6a reverted the SPEC to Draft, so the mode reading keys on the kind line (untouched by the revert), never on `state` (which the revert changes); probed.
- **L43** — the record↔re-derivation mode agreement certifies agreement between files, never provenance; the contract and the checker say so.
- **L44** — no new pinned block carries shell state: the kind line, the git listing and the scope line are self-contained, with `<base sha>` and `<name>` substituted literally.
- **L45** — ★ WIRING tests execute the COMMITTED `check-loop.mjs` line and both committed `check-loop-fresh.mjs` lines over a quick fixture, not only the scripts by path.
- **L46** — the scope-inputs-by-code remedy is named with its status (pending, `quick-scope-inputs-by-code`), not implied by this plan.
- **L47** — no new closed count in prose: S6c is a sub-row, so "S1–S13" stays true; the LIMITS text says "the gated manual flag" and "the unattended one", never "two flags"; `spec-template.md`'s "both shell this mode" becomes an open form.
- **L49** — the Discovery sweep states which sites are checker-backed (the hygiene pins, the checkers' own tests) and which are only read (README, CLAUDE.md, contracts, LIMITS).
- **L50** — the sweep runs by referent: every cite of `check-loop.mjs`'s input signature, of "only `STOP_GREEN` commits", of "`--quick` with `--model-approve` is blocked", and of the `--spec-kind` consumer list.
- **L52** — tests are per member: one per quick decision form, one per quick-mode check id, one per skip-set member, one per quick question path.
- **L57** — the scoped formatter runs pass explicit paths with `prettier --ignore-unknown` and `markdownlint-cli2 --no-globs`.
- **L58** — the record's mode is bound to a referent that changes during Step 6 (the SPEC's `state` and pin): the fixed part (the kind line) is compared, the changing part never; a later human edit of the kind is a stated bound.
- **L60** — every new ★ test names the edit that must turn it red and runs it, and asserts every slicing anchor is found first.
- **L61** — this stage's and the build's scratch live under `.pharn/<command>/` with no `.md` names, outside `lint:md`'s reach.
- **L62** — nothing untrusted is quoted through `String()`: the `mode` refusal names the closed vocabulary and quotes the offending value with `JSON.stringify` of a string it already proved is a string.

## Trigger (P7)

- **The maintainer's roadmap Phase 3.2 (2026-09-25)**, with the quick-mode decisions that bind here: a `spec_kind: quick` mini-SPEC of 1–3 `unit` / `integration` criteria; the grill runs its checkers only; test-first stays, in that light form; no regress baseline; no `BRIEFING.md`; no `RUN-REPORT.md`; `cost.json` kept.
- **The recorded cost trigger is 3.1's**: a user's own `cost.json` ledgers showed PHARN's stages at ~81% of relative cost on three small fixes, with `/pharn-regress` ~63% of that. `/pharn-loop` runs `/pharn-regress` on EVERY iteration (a base worktree, an install, the suite at base and at head), so its share is multiplied by the iteration count.
- **3.1 left the loop's decisions to this phase in writing**: `/pharn-spec --quick --model-approve` "report[s] back blocked … which flag `/pharn-loop` quick-awareness gets, if ever, is a separate, later increment" (`pharn-spec.md` `## --quick`), and 3.1's `## Deferred` names `loop-quick` — "`/pharn-loop --quick`, `check-loop` verify-only mode, freshness and record".

## Discovery (P6) — live state read this run

- **HEAD** `eec6535` after `git merge --ff-only loop-quick-mode` (fast-forward from `ec06f7b`); `npm ci` run. `SKILLS_VERSION` 6.25.0, `MIN_CLI` 0.5.0. The ARCHITECTURE pin above is `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` = `d831d30d…` (3.1's post-apply pin). **Lessons index:** `node .dev/floor/check-lessons-index.mjs .` → exit **0** (GREEN); every candidate was then read in full from `.dev/memory-bank/lessons-learned.md` (all 62 entries were read this run).
- **The 3.1 record** (`.dev/features/ship-quick-mode/`): PLAN (including every amendment section), GRILL, REVIEW (both rounds), SHIP and `proposed/` were read. The defects this plan is shaped against, each with its answer here:
  - **F1, the stale-marker `gate2`** (a safety argument over an advisory marker, probed only with a wrong VALUE, never ABSENT) → the loop's mode is not a marker at all: it is the SPEC's pinned kind, read by the stop core itself (Design §1); the green token carries the mode in-band, so the ledger copy cannot over-claim when some marker is missing (Design §4, §8); and the loop writes no mode marker whose absence could matter (Design §8).
  - **F2, the first-token rule stated as an impossibility** → labelled ADVISORY at every site, the floor backstop named (the SPEC's kind, read at Step 3 and by the stop), and its bound stated — under `--model-approve` the model writes AND approves the kind, so no person is told the trade before the run (Design §5, Guarantee audit).
  - **F3, the scope check dropped unnamed** → kept, per iteration, between the build and the verify (Design §5 item 5), and named KEPT in the record, the summary, the README and the LIMITS patch.
  - **N1–N3** → every "undetermined either way"-style quantifier is avoided; no stored decision is re-dated; LIMITS §6's "only if" is Q1.
  - **3.1's open deviation** (the call counts were never re-derived on the build's HEAD) → the build procedure here makes that re-count a step with its own `BUILD.md` record.
- **`/pharn-loop` at base** (`.claude/commands/pharn-loop.md`, 76,680 B, 44 fenced bash blocks): Step 1a (slug, fresh directory S2, base S3, snapshot, Stop-guard `--open`, run-start marker) → Step 3 `/pharn-spec --model-approve` + `check-spec-approved` → Step 4 `/pharn-plan`, `/pharn-grill`, `/pharn-test --unattended` + `check-test-stage --require-test-first` → Step 5 per iteration: build, regress, verify (each bracketed by a stage-start and an orchestrator marker), `check-loop-fresh.mjs --iter <N> --front`, `check-loop.mjs … --iter <N> --cap <M>` → Step 6 revert (6a), record + `check-loop-record` + `check-loop-decision` + run-stop + ledger + ledger check + `render-run-report` (6b), commit on `STOP_GREEN` (6c), undo (6d) → Step 7 summary → Final (`--clear`, Stop-guard `--close`). The stuck-point table has S1–S13 plus S6b.
- **`check-loop.mjs`** (291 lines): exactly two positional report paths plus `--iter` / `--cap`; any other flag is INCONCLUSIVE (exit 2). Design C, top-down: bad input → INCONCLUSIVE 2; unmeasured → STOP_TERMINAL 4; `ac-evidence` → 4; `reconcile` → 4; verify PASS ∧ regress `no-regressions` → STOP_GREEN 0; a measurable red under the cap → CONTINUE 3; at the cap → STOP_CAP 1. Output keys `{verify_verdict, regress_verdict, floor_green, iter, cap, decision, terminal_cause, reason}` (pinned by a key-set test). It imports only `node:fs`; its header says "no child process" and "input signature is exactly { verify-report.json, regression-report.json, iter, cap }". It ends through the flush rule's sentinel (`cli-stdout-flush.test.mjs` pins the pattern statically).
- **`loop-fresh-core.mjs`** (888 lines; CLI `check-loop-fresh.mjs` loads it with `import()` and maps a load failure or a throw to INCONCLUSIVE `checker-crashed`): checks A (reports exist), B (reason_code), C (three stamps validate), D (report↔stamp hash), J (logs and per-test results hashes), E (live re-derivation of both reports), H (base stamp head = `--base`), F (verify stamp final = live tree), G (regress head final = verify init), I (`--front`: SPEC approved, chain, lessons, `GRILL.md`, test stage). First failure decides; fabrication (J/E/H) before staleness (F/G). The document keys `{verdict, stage_to_rerun, reason_code, reason, checks, reruns_used}` are written in BOTH files and pinned equal by a test.
- **`check-loop-record.mjs`** (shape; `DECISION_ENUM` {STOP_GREEN, STOP_CAP, STOP_TERMINAL, INCONCLUSIVE}; optional `cap`; extra keys ignored) and **`check-loop-decision.mjs`** (re-runs `check-loop.mjs` over the record's sibling reports with its `iterations` and `cap`, compares the token; skips a blocked stop; its own in-file `DECISION_ENUM`). No test holds the two enums equal today.
- **The kind reading**: `spec-template-core.mjs` `specAcceptanceCriteria(text).kind` — `feature` for a legacy SPEC or no kind line, the member the one `spec_kind:` line names, `null` for two lines, a non-member or a body-first kind line. `check-spec.mjs --spec-kind` prints exactly that (an empty line for `null`); `/pharn-ship`'s GATE-1 backstop and `/pharn-grill --quick` shell it. The approval pin (`pinHash`) covers the `spec_kind:` line, so flipping it after approval is drift for every consumer.
- **`/pharn-spec`** today: `--quick` with `--model-approve` → "report back blocked, write nothing quick" (`## --quick` and Step 4a); Step 3 "Neither `test-infra` nor `quick` is ever written under `--model-approve`"; the description repeats it. Fit checks (1) ≤ 3 criteria, (2) no `e2e`, (3) a findable `test` runner; under `--model-approve` every Step-2 warning becomes an `## Assumptions` line.
- **The ledger path for a loop**: `render-cost-ledger.mjs` `readOutcome` copies `decision`, `iterations` and `blocked` VERBATIM from `LOOP.md`'s envelope (`OUTCOME_KEYS` is closed); `check-cost-ledger.mjs` rule 7 checks `decision` as a bounded token, not a vocabulary. A loop ledger with no `LOOP.md` falls through to `ship-outcome-core.mjs`'s derivation, whose mode comes from the run-start marker.
- **The Step-6c staging builder** keeps an artifact only when it is a regular file (or a tracked deletion); `REGRESSION.md`, `regression-report.json` and `RUN-REPORT.md` are dropped when absent. S2 guarantees a fresh feature directory, so a quick run's directory never holds them.
- **Consumers of the decision and the record** (L3), each read, classified: `check-loop-record.mjs` enum → **changes**; `check-loop-decision.mjs` enum and compare → **changes**; `render-cost-ledger.mjs` `readOutcome` → **unchanged** (any token, copied); `check-cost-ledger.mjs` rule 7 → **unchanged** (bounded token); `render-run-report.mjs` → **one comment** (the decision renders as fenced data; `isQuickShip` stays ship-only, and a quick loop's fresh directory holds no regression report for `## Verdicts` to mislabel); `pharn-loop.md` Steps 5.4/6a/6c/6d/7 → **change** (the decisive sentences name both green tokens); `ship-outcome-core.mjs` → **unchanged** (it never reads `LOOP.md`).
- **This PLAN's own scope parse (L18, L20):** `node .claude/hooks/set-writes-scope.cjs --from-plan .dev/features/loop-quick-mode/PLAN.md` → exit 0, `32 path(s)`, equal to the 32 `## Files` bullets; nothing under `### Explicitly not touched by the agent` entered the scope. (It overwrote this stage's single-file scope; the Final step's `--clear` releases it.)
- **Hygiene pins this touches** (`.dev/floor/command-hygiene.test.mjs`), each read: `STUCK_POINTS` (length 14, closure over `blocked:` spellings); the freshness wiring (EXACTLY ONE decision-time line, ONE commit-gate line and ONE `check-loop.mjs` line in `pharn-loop.md`, so the quick section must not repeat them); `PHASE_MARKER_WIRING` (the loop's stage set and one run-start without `--mode`); `QUICK_MODE_WIRING` (exactly one `--mode` line in the corpus, in `pharn-ship.md` — this plan adds none); OBLIGATIONS (the ledger, its check and the report line stay in the command); the cross-block variable rule; the commit-block order rule (keyed on the `### Step 6c` prefix and the `git commit --pathspec-from-file` shape, not on the message).
- **Siblings.** `stage-verify-script` (read with `git show stage-verify-script:.dev/features/stage-verify-script/PLAN.md`): it keeps `check-verify.mjs`'s code and output fields, writes `verify-report.json` from the checker's fields verbatim at the same stamp path (`DEFAULT_STAMPS.verify` derived from its `VERIFY_PATHS`), keeps `check-loop.mjs`'s bytes, and adds a "★ LOOP-FRESH over REAL outputs" test. **Confirmed: it does not change the verify evidence `check-loop-fresh` reads** (report fields, stamp, `gate_run.stamp_sha256`, logs), so the quick mode's verify-only checks are unaffected. It does edit `loop-fresh-core.mjs` (the `DEFAULT_STAMPS.verify` derivation and two step cites), `pharn-loop.md` (verify's stage-exit mapping beside regress's), `pharn-verify.md` (a rewrite) and `command-hygiene.test.mjs`: textual merges, semantically independent. `stage-model-routing` has no plan on its branch yet (`eec6535`); it will edit `pharn-loop.md`'s stage invocations, so the lines this plan edits there are named one by one (Design §5, "Edits to existing lines").

### The referent sweep (L50), classified

- **R1 — "`check-loop.mjs`'s inputs are ONLY the two verdict reports + iter/cap"** (the structural claim; its referent gains the SPEC's kind). Becomes false, edited: `pharn-loop.md` (description; the guarantee audit's STRUCTURAL bullet), `check-loop.mjs` header (input signature, trust), `check-loop-decision.mjs` header, `check-loop-record.mjs` header, `loop-fresh-core.mjs` header ("why a separate checker"), `loop-record.md` ("Unchanged by this contract"), `CLAUDE.md` (the freshness entry). Stays true, unchanged: `check-ship.mjs` (the DEV loop's core); `pharn/features/loop-decision-integrity/*` (a dogfood run's committed record, history).
- **R2 — "only `STOP_GREEN` commits" / "on `STOP_GREEN`"**. Becomes false, edited: `pharn-loop.md` (description, "What an unattended run changes", Steps 5.4, 6a, 6c, 6d, the guarantee audit's commit bullets), `pharn-ship.md` (two sentences about `/pharn-loop`, in Step 3b and in `## /pharn-ship --loop`), `loop-record.md` (the SPEC-revert and commit sentences), `CLAUDE.md` (two "Step 6c stays gated on `STOP_GREEN`" comments and the `check-loop-decision` entry), `check-loop-decision.mjs` header, `render-run-report.mjs` (one comment). Stays true: every sentence defining `STOP_GREEN` itself as verify PASS ∧ regress `no-regressions`.
- **R3 — "`--quick` with `--model-approve` is blocked" / "`quick` is never written under `--model-approve`"**. Becomes false, edited: `pharn-spec.md` (description, `## --quick`, Step 3, Step 4a), `spec-template.md` (`spec_kind`, the `quick` bullet). History, not swept: 3.1's PLAN and CHANGELOG [6.25.0] (frozen).
- **R4 — the consumers of the kind reading**. Incomplete or a closed count, edited: `spec-template.md` ("`/pharn-ship`'s … and `/pharn-grill --quick`'s … both shell this mode" → an open form), `pharn/floor/README.md` (the `--spec-kind` sentence), `pharn-grill.md` ("`/pharn-ship --quick` invokes this form").
- **R5 — "the manual flag is `/pharn-ship --quick`"** (`LIMITS.md §3a`) → the patch. **LIMITS §6's "fires only if `/pharn-regress` runs — or … `/pharn-ship --quick`'s item 7"** → Q1.
- **Stays true, not edited, with the reason:** `pharn/ARCHITECTURE.md §6`'s "Quick mode" paragraph (its subject is `/pharn-ship --quick`, and every sentence in it holds; incomplete, not false — the pin does not move, D13); `pharn-verify.md`'s "a `/pharn-ship --quick` run starts no `/pharn-regress`" (true of its subject; `stage-verify-script` rewrites this file); `README.md`'s `/pharn-ship --quick` paragraph; `mark-phase.mjs` and `CLAUDE.md`'s "`/pharn-ship --quick`'s one caller" of `--mode` (still the only caller: the loop writes no mode marker, D7); `ac-tests.md` ("`/pharn-loop` … never … approves a `test-infra` SPEC" — a quick SPEC is test-first); `THREAT-MODEL.md` (no new ingestion path: `--model-approve` over the project template is surface 9 already).
- **Coverage (L49).** Checker-backed after this build: the decision vocabulary (closures over the checkers and the corpus), the mode vocabulary, `STUCK_POINTS`, the quick-section pins and the ★ WIRING tests. Read-only verified, no checker: README, `CLAUDE.md`, the contracts' prose, the LIMITS text.

## Design

### 1. The mode — bound to `spec_kind`, in one module (`pharn/floor/loop-mode-core.mjs`, NEW)

- **`LOOP_MODES = ["full", "quick"]`** (closed, frozen) and **`loopModeOf(featureDir)`**: read `<featureDir>/SPEC.md`; return `"quick"` iff the text reads `specAcceptanceCriteria(text).kind === QUICK_KIND` — the one kind reading, exactly what `check-spec.mjs --spec-kind` prints — and `"full"` for everything else: no `SPEC.md` (ENOENT), an unreadable one, no frontmatter, a legacy SPEC (whose `spec_kind` is never read as quick), `feature`, `test-infra`, an invalid kind, two kind lines, a body-first kind line, and any throw.
- **Only a positive reading selects quick.** `full` is the stricter table (it demands a regression verdict a quick run never produces), so every doubt fails toward more evidence: in a full run nothing changes, and in a quick run a doubtful SPEC stops INCONCLUSIVE (Design §2) or at S11 (Design §3).
- **Read in ANY state (D2).** Step 6a reverts a non-green stop's SPEC to Draft (it edits `state`, `spec_content_hash` and `approved_by` only) BEFORE Step 6b's `check-loop-decision.mjs` re-derives the stop. The kind line is untouched by that revert, so the mode read keys on it and never on `state` (L42, L58). That the kind is the APPROVED, un-drifted one is established at the moment it matters by `check-loop-fresh.mjs` check I (`check-spec-approved` + `check-plan-spec-agree`; the pin covers the kind line), which both pinned freshness lines run (`--front`), at the decision and again at the commit gate.
- **Which SPEC.** `check-loop.mjs` reads the SPEC beside its first positional (`dirname(<verify-report.json>)/SPEC.md`); `loop-fresh-core.mjs` reads `pharn/features/<feature>/SPEC.md`. In `/pharn-loop` both are the same file. No argv names a SPEC or a mode, so a model cannot select the table by a flag (P5); a report pair copied next to another feature's SPEC is caught at the commit by `check-loop-decision.mjs`, which re-derives from `LOOP.md`'s own directory.
- Imports: `node:fs`, `node:path`, `./spec-template-core.mjs` only. Header: the rule, the any-state reason, the fail-toward-full rule, its two readers, and its bound (it reads a token; it proves nothing about who chose it).

### 2. `check-loop.mjs` — a verify-only table for a quick SPEC

- **The mode.** After the argv parse, `const { loopModeOf } = await import("./loop-mode-core.mjs")` inside a `try`; a load failure or a throw reads `"full"` (D3). So the quick machinery can fail only toward full: a full run still decides exactly as today, and a quick run then finds no regression report and stops INCONCLUSIVE. No flag selects the mode: the parser still refuses every flag but `--iter` and `--cap`.
- **Full mode: byte-identical decisions** to 6.25.0 (every existing case is a fixture with no `SPEC.md` beside it, which reads full).
- **Quick mode** — the regression report is **never opened**, present or not, stale or fresh. `v` = verify's verdict; `r` = null. Top-down:
  - bad verify input (missing / unparseable / `.verdict` outside its enum / FAIL with an unreadable `failing_gates`), or bad `--iter` / `--cap` → **INCONCLUSIVE** exit 2;
  - `v === "INCONCLUSIVE"` → **STOP_TERMINAL** exit 4 (`unmeasured`);
  - FAIL with `ac-evidence` → **STOP_TERMINAL** 4 (`ac-evidence`); FAIL with `reconcile` → **STOP_TERMINAL** 4 (`reconcile`);
  - `v === "PASS"` → **`STOP_GREEN_QUICK`** exit **0**;
  - `v ∈ {FAIL, INCOMPLETE}` ∧ `iter < cap` → **CONTINUE** 3; at the cap → **STOP_CAP** 1.
- **`STOP_GREEN_QUICK` is not `STOP_GREEN`** (D4). It names where the run ended first and the mode second — 3.1's `gate2-quick` rule — and every consumer compares `decision` by equality. A quick SPEC can never yield `STOP_GREEN`, and a full one never `STOP_GREEN_QUICK`: the token is bound to the SPEC's kind at the floor.
- **Output** gains one key, `mode` (`"full"` | `"quick"`; `null` only on an argv refusal, before any path is known); in quick mode `regress_verdict` is `null` and `floor_green` means verify PASS. The reason strings say which table decided. `terminal_cause` is unchanged.
- **The structural claim, restated exactly (replacing "inputs are ONLY the two verdict reports + iter/cap" at every R1 site):** _`check-loop.mjs`'s inputs are the two verdict reports, `--iter` / `--cap`, and ONE token of the feature's own SPEC — its `spec_kind`, read by the one kind reading from the `SPEC.md` beside the verify report — which chooses the table (verify-only for `quick`, in which the regression report is not read at all). There is still no review, finding, severity, record or fingerprint input, so no advisory stage can gate the stop._
- The flush rule holds: `emit` still sets `process.exitCode` and throws the sentinel; `main` becomes `async` and the top level is `try { await main(); } catch (e) { if (e !== EMITTED) throw e; }` (the pattern `cli-stdout-flush.test.mjs` pins).

### 3. `check-loop-fresh.mjs` / `loop-fresh-core.mjs` — which checks apply in quick mode

The mode is read once per evaluation with `loopModeOf(ctx.featureDir)` (a static import: the CLI already turns a load failure into INCONCLUSIVE `checker-crashed`).

| check                                | full mode                                | quick mode                                                      |
| ------------------------------------ | ---------------------------------------- | --------------------------------------------------------------- |
| A — reports exist and parse          | verify + regress                         | **verify only**                                                 |
| B — `reason_code` lapse / refusal    | verify + regress                         | **verify only**                                                 |
| C — stamps validate                  | verify, regress head, regress base       | **verify stamp only**                                           |
| D — report bound to stamp            | verify + regress (both sides)            | **verify only**                                                 |
| J — logs and results hashes          | all three stamps                         | **verify stamp only**                                           |
| E — live re-derivation               | `check-verify` + `check-regress verdict` | **`check-verify` only** (with `--ac-gate` over an unmoved tree) |
| H — base stamp head = `--base`       | yes                                      | **skipped** (no base stamp)                                     |
| F — verify stamp = live tree         | yes                                      | **yes** (the run stays tree-bound)                              |
| G — regress head final = verify init | yes                                      | **skipped** (no regress stamp)                                  |
| I — the front (`--front`)            | yes                                      | **yes** (a quick SPEC reads READY test-first)                   |

- A quick run is still **tree-bound (F)** and **checked for fabrication (J, E, D, C)**, in the same fabrication-before-staleness order. **Stale regress evidence is never read**: a regression report or regress stamps on disk (another feature's, or a full run's) change nothing in quick mode.
- The skipped pair `QUICK_SKIPPED = ["G", "H"]` is materialized once (L29); `checks.G` / `checks.H` read `"skipped"`.
- **The document gains `mode`** as its last key (`"full"` | `"quick"`; `null` when the checker stops before reading it — a usage error, or `checker-crashed` in the CLI). `DOC_KEYS` changes in BOTH files, and the existing "three facts written in both files" test pins them equal.
- **A quick run that meets a full-mode freshness verdict.** If the SPEC stops reading quick mid-run (a drift, a deletion, an unreadable file), the checker reads full and check A asks to re-run `regress`. `/pharn-loop`'s quick section maps a RERUN naming `regress` to **S11**, never to a regress run (Design §5 item 6). A kind flipped after approval (the pin unchanged) is caught either way: flipped TO `quick` over a full run's evidence, the quick column passes and check I stops it (the pin covers the kind line, so `check-spec-approved` is RED → STOP `front-stage-red`); flipped AWAY from `quick` in a quick run, check A asks for `regress` first, which the quick section maps to S11.
- Header re-derived (L25): the check table gains the quick column, "why a separate checker" states the restated R1 claim, and the bounds add one line: the mode is read from the SPEC, whose approval is this checker's own check I.

### 4. The record — `LOOP.md`'s `mode`, `STOP_GREEN_QUICK`, and the two checkers

- **`loop-record.md`** (contract): `decision` ∈ {`STOP_GREEN`, `STOP_GREEN_QUICK`, `STOP_CAP`, `STOP_TERMINAL`, `INCONCLUSIVE`} — `STOP_GREEN_QUICK` (6.26.0): verify `PASS` in a quick run, no regression verdict read, NOT `STOP_GREEN`. A sixth, **optional** envelope field `mode` ∈ {`full`, `quick`} — absent means `full`, so every pre-6.26.0 record keeps its meaning; a quick run writes `mode: quick` on every record, blocked ones included; a full run may omit it. The rule of the contract gains: `check-loop-record.mjs` checks `mode`'s shape and the decision↔mode consistency; `check-loop-decision.mjs` requires the recorded mode to equal the re-derived one — agreement, never provenance (L43). "Unchanged by this contract" restates the R1 claim. The canonical template keeps its GREEN test and gains no line.
- **`check-loop-record.mjs`**: `DECISION_ENUM` + `STOP_GREEN_QUICK`; `mode`, when present: `cleanScalar(v, 16)` then exact membership (L14, L15), else RED naming the vocabulary; **cross-field** — `STOP_GREEN_QUICK` requires `mode: quick`, and `STOP_GREEN` forbids it (both enum tests, primitive #3). The GREEN line names the mode.
- **`check-loop-decision.mjs`**: `DECISION_ENUM` + `STOP_GREEN_QUICK`; the record's `mode` shape-checked as above, absent → `full`; after the live re-run, the re-derived `mode` (absent in the JSON → `full`) must equal the record's, else RED `MODE_MISMATCH`, reported beside any decision mismatch. The blocked-stop skip is unchanged: a blocked record's `mode` is shape-checked by `check-loop-record.mjs` and otherwise advisory.
- **Why the re-derivation stays right after Step 6a** (D2): `check-loop.mjs` reads the kind line, which the revert leaves in place, so a quick `STOP_CAP` record re-derives `STOP_CAP` in quick mode over a reverted Draft (a ★ test builds exactly that shape).

### 5. `/pharn-loop --quick` — the command (`.claude/commands/pharn-loop.md`)

A new section **`## Quick mode — /pharn-loop --quick (6.26.0)`**, placed after Step 2 (the stuck-point table) and before Step 3. It opens with what a quick run keeps and skips, the mode binding (the kind, never a flag), and "every other line of Steps 1–7 and the Final step runs exactly as written; only what is listed here changes". Its deltas, in step order:

1. **Entry.** `/pharn-loop --quick [--max-iter N] <description>`. `--quick` counts only as the FIRST token of the arguments and is removed before the description is passed on. **ADVISORY (P0):** an instruction to the orchestrating model; nothing parses the invocation. The backstops: item 2's kind read (a floor read, obeyed by this command), and — independently — the stop itself, whose table is the SPEC's kind. **The bound, wider than `/pharn-ship`'s:** under `--model-approve` the model writes AND approves the kind, so no person is told the trade before the run; the record, the commit message and the summary name the mode afterwards.
2. **Step 3.** Invoke `/pharn-spec --quick --model-approve <description>`. Its reports map as today (thin intent → S6, a clarification marker → S6b), plus **a fit-check miss → S6c** (`blocked: not-quick`). After `check-spec-approved.mjs` exits 0, run the pinned kind read and proceed only on exit 0 and the exact token `quick`; anything else is **S6c**:

   ```bash
   node pharn/floor/check-spec.mjs --spec-kind pharn/features/<name>/SPEC.md
   ```

3. **Step 4.** Invoke `/pharn-grill <name> --quick` (the quick `GRILL.md`: `mode: quick`, both floor results, `interrogation NOT performed — skipped by mode (quick)`); its markers and both exits are read as written. `/pharn-plan` and `/pharn-test --unattended` are unchanged, and so is the Step-4 test-stage gate (`--require-test-first`: a quick SPEC is test-first).
4. **Step 5, sub-step 1 (build).** Unchanged, except that from iteration 2 on only `verify-report.json`'s fields are handed over as DATA (there is no regression report).
5. **Step 5, sub-step 2 — `/pharn-regress` SKIPPED, its scope check KEPT.** No `/pharn-regress` and no `pharn-regress` markers. After the build's orchestrator marker and before verify's stage-start, run the scope partition over this iteration's tree. List the changed and untracked files against the loop's own base:

   ```bash
   git diff --name-only --no-renames '<base sha>'
   git ls-files --others --exclude-standard
   ```

   `inside` = both lists, minus any path under `.pharn/`; the declared set = `PLAN.md`'s `## Files` paths plus `AC-TESTS.md`'s `## Files` paths — exactly the inputs `/pharn-regress`'s script builds in its `partition` phase (`pharn/floor/stage-regress.mjs`, cited not restated). Then the pinned line (the same literal `/pharn-ship --quick` item 7 pins):

   ```bash
   node pharn/floor/check-regress.mjs scope --changed "<inside, comma-separated>" --declared "<PLAN.md ## Files paths, plus AC-TESTS.md ## Files paths when that file exists>" --feature "<name>"
   ```

   Exit 0 → verify. Exit 1 → **S9** (`blocked: stage-refused`) — the row a full run's `/pharn-regress` `scope-escaped` refusal maps to, with the same remedy. Any other exit → S9, fail-closed. Running it and assembling its inputs are ADVISORY (L5 — named follow-up `quick-scope-inputs-by-code`); its exit is FLOOR.

6. **Step 5, sub-step 3 (freshness).** The same pinned line; the checker reads the SPEC's kind itself and applies the quick column of Design §3. A RERUN naming `verify` re-runs verify inside the iteration as written; **a RERUN naming `regress` is S11** — a quick run never runs `/pharn-regress`, and the checker asks for it only when the SPEC no longer reads quick.
7. **Step 5, sub-step 4 (the stop).** The same pinned line; `check-loop.mjs` reads the kind itself. **Exit 0 is `STOP_GREEN_QUICK`**. Every other exit, `terminal_cause` and row is as written (`ac-evidence` → S13).
8. **Step 6.** A quick run's green stop is `STOP_GREEN_QUICK`: Step 6a reverts on anything else, and Step 6c commits on it with a GREEN `<decision-check>`. The record carries `mode: quick`, its body lists each iteration's verify verdict and scope result, and it holds a `## Not checked in quick mode` section: **regressions outside the feature** (no base comparison ran; the scope check did); **the plan interrogation** (`/pharn-grill --quick` ran its two floor stops only); and **`RUN-REPORT.md`** (not rendered; `cost.json` is). Step 6b's run-stop, ledger and ledger check run unchanged — **`cost.json` is kept** — and **its `render-run-report.mjs` line is SKIPPED**. The staging builder is unchanged (Design §7).
9. **Step 7.** The summary names the mode and the not-checked list, reports verify and scope per iteration (no regress), prints the ledger table but no report tables (no `RUN-REPORT.md` exists), and its honest line adds: _"It ran in quick mode: no regression outside the feature was looked for, and the plan was not interrogated."_

**What quick mode claims, and what it does not** — the section carries the Guarantee-audit bullets below marked (quick), in its own words.

#### The quick question paths (every question a quick run can meet, mapped — L29, L52)

| source                                | question / outcome                                                                       | row                                                                          |
| ------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `/pharn-spec --quick --model-approve` | thin intent                                                                              | S6                                                                           |
| `/pharn-spec --quick --model-approve` | a clarification marker left in the Draft                                                 | S6b                                                                          |
| `/pharn-spec --quick --model-approve` | fit checks (1)–(2) missed: more than three criteria, or one observable only end-to-end   | **S6c**                                                                      |
| `/pharn-spec --quick --model-approve` | a refused template                                                                       | S9 (as today under `--model-approve`)                                        |
| the Step-3 kind read                  | exit ≠ 0, or any token but `quick`                                                       | **S6c**                                                                      |
| `/pharn-grill <name> --quick`         | its eligibility refusal (kind ≠ `quick`) or either floor stop RED                        | S9                                                                           |
| `/pharn-test --unattended`            | no runner with per-test results (`check-red-run --preflight` exit 1) / any other refusal | S12 / S9 (as today)                                                          |
| `/pharn-build`                        | seam config / plan ambiguity / seam `ask` / a refusal                                    | S5 / S7 / S8 / S9 (as today)                                                 |
| the scope check                       | exit 1 (escaped) or any non-zero exit                                                    | **S9**                                                                       |
| `/pharn-verify`                       | no gates / a refusal / another ask                                                       | S4 / S9 / S10 (as today, plus `stage-verify-script`'s mapping when it lands) |
| `check-loop-fresh.mjs`                | RERUN `verify`                                                                           | re-run in the iteration (as today)                                           |
| `check-loop-fresh.mjs`                | RERUN `regress`                                                                          | **S11** (quick only)                                                         |
| `check-loop-fresh.mjs`                | STOP `empty-source-set` / `ac-evidence-invalid` / any other; INCONCLUSIVE                | S4 / S13 / S11; S11 (as today)                                               |
| `check-loop.mjs`                      | exit 4 `terminal_cause: ac-evidence`                                                     | S13 (as today)                                                               |

- **New stuck-point sub-row S6c** (D9), placed after S6b: trigger — "`/pharn-spec --quick --model-approve` reports the intent does not fit a quick SPEC (more than three criteria, or a criterion observable only end-to-end), or a `--quick` run's Step-3 kind read prints anything but `quick`"; rule — "stop `blocked: not-quick` — a person narrows the intent, or re-runs `/pharn-loop` without `--quick`; the run never widens a quick request into a full one". S6c is a spec-stage sub-row like S6b, so "S1–S13" stays true (L47). S9's rule text gains "a `--quick` run's scope check exiting non-zero".

#### The stop mapping (quick)

`check-loop.mjs` exits keep their meaning: 0 green (`STOP_GREEN_QUICK`), 1 `STOP_CAP`, 2 `INCONCLUSIVE`, 3 `CONTINUE`, 4 `STOP_TERMINAL` (`unmeasured` / `reconcile` → Step 6 as emitted, `ac-evidence` → S13). A full-mode run that meets `STOP_GREEN_QUICK` — its SPEC reads quick although it was invoked without `--quick` (a deviation `/pharn-spec` forbids) — does not commit: a full run's Step 6c commits only `STOP_GREEN`, so it ends uncommitted and reverted, and `check-loop-decision.mjs` REDs the record's full mode against the re-derived quick one. That costs one wasted run and never over-claims (D8).

#### The pair's obligations (L31) — `/pharn-ship --quick` vs `/pharn-loop --quick`

| obligation                | `/pharn-ship --quick` (6.25.0)                                    | `/pharn-loop --quick` (this plan)                                                        |
| ------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| the mini-SPEC             | `/pharn-spec --quick`, a human approves at GATE 1, told the trade | `/pharn-spec --quick --model-approve`, the model approves; no one is told before the run |
| the kind read             | `--spec-kind` after the GATE-1 backstop, STOP on ≠ `quick`        | the same line at Step 3, S6c on ≠ `quick`                                                |
| where the mode is read    | the run-start marker (`--mode quick`), for the ledger outcome     | the SPEC's kind, for the stop (`check-loop.mjs`, `check-loop-fresh.mjs`)                 |
| the grill                 | `/pharn-grill <name> --quick`                                     | the same                                                                                 |
| the tests                 | unchanged (test-first)                                            | unchanged (test-first)                                                                   |
| regress base comparison   | skipped                                                           | skipped, every iteration                                                                 |
| the scope check           | kept (item 7, plus Step 2b)                                       | kept, every iteration                                                                    |
| verify and its AC gate    | unchanged                                                         | unchanged                                                                                |
| freshness                 | none (`/pharn-ship` runs no freshness check)                      | `check-loop-fresh.mjs`, the quick column                                                 |
| `BRIEFING.md`             | skipped                                                           | never written by the loop (unchanged)                                                    |
| `RUN-REPORT.md`           | skipped                                                           | skipped                                                                                  |
| `cost.json`               | kept                                                              | kept                                                                                     |
| the run-start mode marker | written                                                           | **not written** (D7 — L35)                                                               |
| the green token           | `gate2-quick` (derived)                                           | `STOP_GREEN_QUICK` (declared, re-derivable)                                              |
| the not-checked list      | `SHIP.md`                                                         | `LOOP.md` and the summary                                                                |

#### Edits to existing lines of `pharn-loop.md` (named for the `stage-model-routing` merge)

Line numbers are at `eec6535`; every other line is untouched, and no pinned line is added or duplicated outside `## Quick mode`.

- `:2` description — one quick sentence; "Only a STOP_GREEN result is committed" → a green stop (`STOP_GREEN`, or `STOP_GREEN_QUICK` under `--quick`); the R1 inputs clause restated.
- `:43` `version` — 0.10.0 → 0.11.0. `:8-40` `reads:` — add `pharn/features/<name>/AC-TESTS.md` and `pharn/floor/check-regress.mjs`.
- `:92` "Only `STOP_GREEN` is committed" → a green stop. `:98-100` "Every iteration re-runs `/pharn-regress`" — add "(a quick run skips it — `## Quick mode`)".
- `:104` Step 1 — one pointer line to `## Quick mode`.
- `:235` (after the S6b row) — the S6c row; `:238` S9's rule cell gains the quick scope check.
- `:289` Step 3 and `:332` Step 4 — one pointer clause each (the quick invocations).
- `:405` Step 5.2 — "SKIPPED in Quick mode: the scope check runs instead (`## Quick mode` item 5)".
- `:444` Step 5.3 RERUN bullet — "(a quick run: a RERUN naming `regress` is S11 — `## Quick mode` item 6)".
- `:482` Step 5.4 exit-0 bullet — names `STOP_GREEN_QUICK` for a quick run.
- `:503`, `:505` Step 6a heading and first sentence, `:524` — "a green stop". `:556` — "(for a green stop, …)".
- `:617-620` Step 6b report render — "SKIPPED in Quick mode — `## Quick mode` item 8; `cost.json` is still emitted above".
- `:632` and `:643-648` Step 6c — "a green stop". `:742` the commit message — `STOP_GREEN` → `<decision>` (substituted literally: one of the two green tokens, copied from `check-loop.mjs`'s JSON; the Trust section already calls it "an enum decision").
- `:756` Step 6d — "on a green stop".
- `:783` Step 7 per-iteration verdicts and `:801` the run-report bullet — quick pointers; `:811` the honest line — the quick sentence.
- `:822` and `:914-916` guarantee audit (the Design C bullet gains the quick table; STRUCTURAL restated per R1), `:887-913` the commit bullets (a green stop), `:929-931` Trust (control flow also reads the SPEC's kind token), `:989` "The loop iterates only `build → regress → verify`" (quick: `build → verify`).

### 6. `/pharn-spec --quick --model-approve` (`.claude/commands/pharn-spec.md`) — 3.1's blocked path, decided (D10)

- `## --quick`: the "`--quick` with `--model-approve` → report back blocked" bullet is replaced. **With `--model-approve` (6.26.0, `/pharn-loop --quick`) the model writes AND approves the quick SPEC.** Fit checks (1) and (2) have no one to ask: when the intent cannot be written as at most three `unit` / `integration` criteria without dropping or inventing intent, report back **blocked: the intent does not fit a quick SPEC** and write nothing quick (the caller stops — `/pharn-loop`'s S6c). Fit check (3), a findable `test` runner, becomes an `## Assumptions` line like every other `--model-approve` warning; the test stage's floor preflight decides it (S12). Step 4's trade sentence is not shown — there is no gate — and the loop's record and summary carry the not-checked list instead. **Backstop:** rule 9 REDs a quick Draft with more than three criteria or an `e2e` level, so such a SPEC can never be approved.
- Step 3: "Neither `test-infra` nor `quick` is ever written under `--model-approve`" → `test-infra` never; `quick` under `--model-approve` only together with `--quick`.
- Step 4a: the first bullet becomes the quick branch (the fit-check refusal above), plus: **a Draft carrying `spec_kind: quick` is never approved under `--model-approve` without `--quick`** — report back blocked (the injection-shaped deviation, refused at the one point the model approves).
- The description's kind clause and `version` follow. The hygiene pins on this file (the `--model-approve` branch, the literal `spec_kind: quick`, the Step-4 trade sentence, the ADVISORY first-token label) keep holding.

### 7. The Step 6c commit — what a quick run commits, and the enumerations

- A quick run commits `SPEC.md`, `PLAN.md`, `AC-TESTS.md`, `AC-TESTS.lock.json`, the quick `GRILL.md`, `BUILD.md`, `VERIFY.md`, `verify-report.json`, `LOOP.md`, `cost.json`, the plan's `## Files` and the lock's pinned tests. It commits no `REGRESSION.md`, `regression-report.json` or `RUN-REPORT.md`, because it never writes them and the builder keeps only regular files that exist.
- **No enumeration changes.** The five `RUN-REPORT.md` enumerations (`PIPELINE_ARTIFACTS`, `reconcile-ignore.json` `pipeline_artifacts.names`, the Step-6c artifact list, `.prettierignore`, `.markdownlint-cli2.jsonc`) keep their members, because a full run still writes those files; the builder's existence filter drops what a quick run did not write.
- **Bound, stated:** the filter is existence-based, not run-bound. S2's fresh directory (a command rule, ADVISORY) is why no earlier run's `REGRESSION.md` can be swept into a quick commit.

### 8. The ledger — `cost.json` kept; the outcome's quick form

- `cost.json` is emitted and checked unchanged (Step 6b's run-stop, `render-cost-ledger.mjs --command /pharn-loop`, `check-cost-ledger.mjs`). **No ledger code change and no schema change.**
- **Does the copied outcome need a quick form? Yes — through the token itself (D4).** `readOutcome` copies `LOOP.md`'s `decision` verbatim, so a quick green reaches `outcome.decision` as `STOP_GREEN_QUICK` — self-describing, and DECLARED and re-derivable (`check-loop-decision.mjs`), with no marker involved. That is the F1 lesson applied: a claim the ledger carries must not depend on an advisory marker being present. Rule 7 accepts any bounded token, so an older checker reads such a ledger GREEN.
- **Non-green quick stops** (`STOP_CAP`, `STOP_TERMINAL`, `INCONCLUSIVE`) carry no mode in `outcome` (its key set is closed; adding `mode` would make every older checker RED a new ledger). The mode is in `LOOP.md`, which `outcome.source: "LOOP.md"` names, and the ledger's `by_stage_iteration_model` holds no `pharn-regress` rows.
- **No run-start `--mode quick` marker for the loop (D7).** For `/pharn-ship` the marker is the mode's only record, because a quick SPEC may run the full ship flow. For the loop the SPEC's kind IS the mode, the stop reads it, and `LOOP.md` records it verified; a marker would be a third, unverified copy (L35). The one reader it would feed, the no-`LOOP.md` fallback derivation, then reads such a ledger as full: no regress stage-start after the build → `stop:pharn-verify`, the under-claiming direction.
- `cost-ledger.md` gains two sentences: the `LOOP.md` source's vocabulary includes `STOP_GREEN_QUICK` (6.26.0), which is not `STOP_GREEN` and claims no regression verdict; and `/pharn-loop --quick` writes no mode marker (its mode is the SPEC's kind, recorded in `LOOP.md`).

### 9. Hygiene pins (`.dev/floor/command-hygiene.test.mjs`)

- `STUCK_POINTS` gains `{ id: "S6c", blocked: "not-quick" }`; the count assertion becomes 15 ("S1–S13 plus S6b and S6c").
- **`LOOP_QUICK_WIRING`** (one materialized object, L29), each rule with a mutation control that must turn it red (L60):
  - the `## Quick mode — /pharn-loop --quick (6.26.0)` section exists and the next heading is found (both anchors asserted before slicing);
  - inside it, exactly once in the file: the `--spec-kind` line, the two-line git listing block, and the quick scope line (the same literal as `QUICK_SCOPE_LINE`); the invocations `/pharn-spec --quick --model-approve` and `/pharn-grill <name> --quick`;
  - the skip set named in the section: `/pharn-regress` with its markers, and the `render-run-report.mjs` line; "`cost.json` is kept";
  - a pointer at each skip site: Step 5.2, Step 5.3's RERUN bullet (S11), Step 6b's render line, Step 7's report bullet;
  - `STOP_GREEN_QUICK` named at Step 5.4's exit-0 bullet, Step 6a and Step 6c's heading;
  - the first-token rule labelled ADVISORY; the three not-checked items; the S6c row;
  - `pharn-spec.md`: the misfit refusal present, and "No shipped command passes both today" absent everywhere (the L33 closure);
  - `pharn-grill.md` names `/pharn-loop --quick` as an invoker.
- **`STOP_GREEN` closure (L36):** every `STOP_GREEN[A-Z_]*` token in the command corpus is `STOP_GREEN` or `STOP_GREEN_QUICK`; control: `STOP_GREEN_Q` fails.
- `QUICK_MODE_WIRING` is unchanged and still holds (the loop adds no `--mode` line); the freshness wiring still finds ONE decision line, ONE commit-gate line and ONE stop line; `PHASE_MARKER_WIRING` and OBLIGATIONS unchanged.

### 10. The human-only patch — `LIMITS.md` only (D14)

- **§3a.** The first sentence of 3.1's paragraph, "**The manual flag is `/pharn-ship --quick` (6.25.0), and it trades checks for cost.**", becomes "**The gated manual flag is …**", and a second paragraph follows (the build may tighten the wording; the facts are fixed here):

  > **The unattended one is `/pharn-loop --quick` (6.26.0), and nobody is told the trade before it runs.** The model
  > writes and approves the `spec_kind: quick` SPEC itself (`approved_by: model`), and `check-loop.mjs` decides every
  > stop over `/pharn-verify`'s verdict alone. The decision's mode is that SPEC's pinned kind, never a flag, so a full
  > SPEC still needs a regression verdict. It keeps the grill's floor stops, the test-first evidence, the scope check
  > and the freshness check (a quick run's verify evidence must still describe the live tree and reproduce from its
  > stamp). It leaves out the regression check, the plan interrogation and `RUN-REPORT.md` (`cost.json` is still
  > written). Its green stop is `STOP_GREEN_QUICK`, which is not `STOP_GREEN` and claims no regression check; the
  > record, the commit message and the summary name the mode after the run. The person who typed `--quick` chose it,
  > and the model's reading of that flag is advisory, as for `/pharn-ship`.

- **§6** — only if Q1 → (a): the scope check's first bound gains `/pharn-loop --quick`'s per-iteration check beside `/pharn-ship --quick`'s item 7.
- **`pharn/ARCHITECTURE.md` is not touched (D13)**: its §6 "Quick mode" paragraph is about `/pharn-ship --quick`, and every sentence in it stays true. The pin does not move, so no sibling plan needs re-pinning. The loop's line there is a named catch-up (`architecture-loop-quick-line`).
- **Generator** `.dev/features/loop-quick-mode/handoff/make-patch.mjs` (committed, 3.1's precedent). It imports 3.1's exported pure checks (`applyOnce`, `markerPreservationReds`, `checkFive`, `hashDoc`, `FailedGeneration`) from `.dev/features/ship-quick-mode/handoff/make-patch.mjs` rather than copying them (L35). It reads `LIMITS.md`, applies each edit in memory (each `find` exactly once), asserts marker preservation against `.dev/floor/specified-primitives.json` (§3b's registered strings sit next door) and CHECK 5, then diffs scratch copies under `.pharn/pharn-dev-build/loop-quick-mode-patch/` (`.before` / `.after` names — never a trusted path, never `.md`, L61). It runs `git apply --check` on stdin BEFORE writing anything, writes `proposed/human-only.patch` and `proposed/human-only.sha256`, and removes its scratch.
- **`apply.sh`**, pinned verbatim here because the human runs it with their own privileges (3.1's grill G4). It carries no stage-exit check and no ARCHITECTURE step (neither applies), and no reconcile checkpoint or re-anchor (3.1's G2 — a GATE-2 apply follows the last verify):

  ```sh
  #!/bin/sh
  # apply.sh — the HUMAN-run apply step for .dev/features/loop-quick-mode: LIMITS.md §3a (and §6 if Q1 chose it).
  # Read proposed/human-only.patch first. Run from the repo root, on the phase branch, at GATE 2 after the last
  # /pharn-dev-verify:
  #   sh .dev/features/loop-quick-mode/proposed/apply.sh
  set -eu
  F=.dev/features/loop-quick-mode/proposed
  [ "$(git branch --show-current)" != "main" ] || { echo "apply.sh: refusing to commit a trusted-doc change on main" >&2; exit 1; }
  git apply --check "$F/human-only.patch"
  git apply "$F/human-only.patch"
  if ! { shasum -a 256 -c "$F/human-only.sha256" && node pharn/floor/validate.mjs . && node .dev/floor/check-specified-markers.mjs .; }; then
    git checkout -- LIMITS.md
    echo "apply.sh: FAILED - LIMITS.md was restored from the index (git checkout --), which is HEAD unless you staged edits to it; nothing was committed" >&2
    exit 1
  fi
  git commit -q -m "docs(trusted): /pharn-loop --quick in LIMITS.md (human-applied)" -- LIMITS.md
  echo "apply.sh: applied, checked and committed. pharn/ARCHITECTURE.md is untouched, so the spec pin does not move."
  ```

- **`APPLY.md`**: what to read (`git apply --stat`), what the script does, when to apply (GATE 2, after the last `/pharn-dev-verify`, before the merge), the regeneration command after a sibling merge (whole-file sums: `stage-model-routing` patches LIMITS §8, so whichever lands second regenerates), and the out-of-order case (applied before a verify: the plan setter, then `reconcile-baseline.mjs --anchor`, then resume at `/pharn-dev-verify` — L17, L38).

### 11. Version

**Minor, 6.25.0 → 6.26.0**: a newly shipped mode, a new floor module, a new decision token and a new record field. Nothing invalidates an install: every pre-6.26.0 record, report and ledger reads as before (absent `mode` = full; full-mode decisions byte-identical). **`MIN_CLI` stays 0.5.0**: no installed path moves, and a CLI that copies `pharn/floor/` and `.claude/commands/` per file lands the new module. **The directions that do not read back** (G11's precedent): an install rolled back below 6.26.0 REDs a `LOOP.md` carrying `STOP_GREEN_QUICK` in both loop-record checkers, and its `check-loop.mjs` reads a quick run as full (INCONCLUSIVE: no regression report); an older `check-cost-ledger.mjs` still reads such a ledger GREEN. The CHANGELOG says so.

## Success measure (the orchestrator's item 6) — counted from the commands at `eec6535`

A "call" is one fenced block the command prescribes, or one Read/Write the step requires; happy path, no re-run.

| per iteration (Step 5)                                                         | full                                                           | quick                                                               | difference                                                                       |
| ------------------------------------------------------------------------------ | -------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| stages invoked                                                                 | 3 (`/pharn-build`, `/pharn-regress`, `/pharn-verify`)          | 2                                                                   | **`/pharn-regress` skipped**                                                     |
| phase-marker calls                                                             | 6                                                              | 4                                                                   | −2                                                                               |
| `/pharn-regress`'s own calls (setter, script, `--clear`; +1 per budget resume) | 3                                                              | 0                                                                   | −3                                                                               |
| `/pharn-regress`'s prompt re-read                                              | 19,526 B                                                       | 0                                                                   | −19.5 KB                                                                         |
| `/pharn-regress`'s script work                                                 | a base worktree, a base install, the suite at base and at head | none                                                                | removed                                                                          |
| the scope check                                                                | inside `/pharn-regress`                                        | the git listing (1) + its line (1) + the declared paths (0–2 Reads) | +2 to +4                                                                         |
| freshness + stop                                                               | 2                                                              | 2                                                                   | 0 (the quick freshness run spawns one checker fewer: no `check-regress verdict`) |
| **loop-level calls**                                                           | **11** (8 + regress's 3)                                       | **8–10**                                                            | **−1 to −3, plus the regress stage's prompt, turns and wall time**               |

| per run (once)       | full                                                                                                                                              | quick                                                                     | difference                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------------- |
| Step 3               | `/pharn-spec --model-approve` + `check-spec-approved`                                                                                             | + the kind read                                                           | +1                                                    |
| `/pharn-grill`       | ≥ 10 + n (setter, three reads, two floor stops, the skills scan + n `SKILL.md` reads, the griller count + ≥ 1 griller read, the write, `--clear`) | ≈ 7 (setter, existence, kind read, two floor stops, the write, `--clear`) | **≥ −3 − n**, and the interrogation's findings output |
| Step 6b/7 run report | render + print                                                                                                                                    | none                                                                      | −2                                                    |

So a run of k iterations prescribes about `k·(1…3) + (3 + n) + 1` fewer calls, and k fewer regress stages — where most of the saved time sits for a small change (a base install plus two suite runs per iteration). The build re-counts every figure on its own HEAD and records them in `BUILD.md` (3.1 left this undone). **Measured later, outside this build:** a downstream quick loop's `cost.json` beside a full loop's for a comparable fix — structurally, no `pharn-regress` rows, `outcome.decision` `STOP_GREEN_QUICK`, and no `RUN-REPORT.md`; measured, the `pharn-grill` rows' output and the relative-cost share against the ~81% baseline. The success threshold is the maintainer's (roadmap 0.3), not one set here.

## Decisions for GATE 1 (each overridable)

1. **D1 — the mode is the feature SPEC's kind**, read by `check-loop.mjs` and `check-loop-fresh.mjs` through one reader (`loop-mode-core.mjs`), never a flag and never a marker.
2. **D2 — the kind is read in any state**, because Step 6a's revert precedes `check-loop-decision.mjs`; approval is check I's, at the decision and at the commit gate.
3. **D3 — `check-loop.mjs` loads the reader dynamically, and any failure reads full**, so the quick machinery can fail only toward the stricter table.
4. **D4 — a distinct green token, `STOP_GREEN_QUICK`** (exit 0), rather than `STOP_GREEN` qualified by a mode field: the ledger copies `decision` verbatim, so the token must carry its own claim.
5. **D5 — `LOOP.md` gains an optional `mode`** (absent = full), shape- and consistency-checked by `check-loop-record.mjs` and compared by `check-loop-decision.mjs`.
6. **D6 — freshness in quick mode is the verify half of A–E and J, plus F and I; G and H are skipped**, and the document gains `mode`.
7. **D7 — the loop writes no `--mode quick` run-start marker** (L35).
8. **D8 — no kind read is added to a FULL run's Step 3**: a full run over a quick SPEC decides as quick, ends on `STOP_GREEN_QUICK`, which a full run never commits, and so ends uncommitted and reverted. This keeps the full-mode lines untouched.
9. **D9 — the new stuck point is sub-row S6c, `blocked: not-quick`**, so "S1–S13" stays true.
10. **D10 — `/pharn-spec --quick --model-approve` is allowed**: fit checks (1)–(2) stop (S6c), fit check (3) becomes an `## Assumptions` line (S12 decides), and a quick Draft is never approved without `--quick`.
11. **D11 — the scope check stays at the command level, with model-assembled inputs** (3.1 parity). The stronger alternative — fold it into `check-loop-fresh.mjs` in quick mode, inputs built by code, re-checked at the commit gate, no extra call — needs a new `REASON_CODES` member and a second copy of the partition's inside rule in the checker `stage-verify-script` is also editing. It is named `quick-scope-inputs-by-code` (pending, L46) and covers both quick modes at once.
12. **D12 — no `RUN-REPORT.md` in quick mode; `render-run-report.mjs` keeps its logic** (one comment re-derived), because a quick loop's fresh directory holds no regression report for `## Verdicts` to mislabel.
13. **D13 — no `pharn/ARCHITECTURE.md` edit.**
14. **D14 — the patch touches `LIMITS.md` only**, applied at GATE 2 after the last verify.
15. **D15 — no dev twin**: `/pharn-dev-ship --loop` gets no quick mode (apparatus; L31's question asked and answered, as 3.1's Decision 10).

## Files

- `.dev/features/loop-quick-mode/PLAN.md` — this plan — layer dev artifact
- `.dev/features/loop-quick-mode/BUILD.md` — NEW. The build record: the call counts re-derived on the build's HEAD, each probe with its exit code, the generator's output and refusal probes — layer dev artifact
- `pharn/floor/loop-mode-core.mjs` — NEW. `LOOP_MODES` and `loopModeOf(featureDir)`, the one reading of a loop run's mode (Design §1) — layer product floor
- `pharn/floor/check-loop.mjs` — EDIT. The mode via a dynamic import (failure reads full), the verify-only table, `STOP_GREEN_QUICK`, the `mode` output key, async `main`, the header re-derived — layer product floor
- `pharn/floor/loop-fresh-core.mjs` — EDIT. The mode read, the quick column of checks A–J, `QUICK_SKIPPED`, the `mode` document key, the header re-derived — layer product floor
- `pharn/floor/check-loop-fresh.mjs` — EDIT. `DOC_KEYS` and the crash document gain `mode`; header — layer product floor
- `pharn/floor/check-loop-record.mjs` — EDIT. `STOP_GREEN_QUICK`, the optional `mode` field and the decision↔mode rule, the header — layer product floor
- `pharn/floor/check-loop-decision.mjs` — EDIT. `STOP_GREEN_QUICK`, the `mode` shape and agreement, the header — layer product floor
- `pharn/floor/render-run-report.mjs` — EDIT, one comment: Step 6c is gated on a green stop — layer product floor
- `pharn/floor/README.md` — EDIT. The `--spec-kind` sentence's consumers, an open form — layer shipped doc
- `pharn/pharn-contracts/loop-record.md` — EDIT. `STOP_GREEN_QUICK`, the `mode` field, the checkers' new rules, the R1 and R2 sentences — layer pharn-contracts
- `pharn/pharn-contracts/cost-ledger.md` — EDIT. Two sentences: the `LOOP.md` vocabulary includes `STOP_GREEN_QUICK`, and the loop writes no mode marker — layer pharn-contracts
- `pharn/pharn-contracts/spec-template.md` — EDIT. The `quick` kind under `--model-approve --quick`, its readers (an open form), the rule-9 rationale's approver — layer pharn-contracts
- `.claude/commands/pharn-loop.md` — EDIT. `## Quick mode`, the S6c row, and the named line edits (Design §5) — layer product command
- `.claude/commands/pharn-spec.md` — EDIT. The `--quick --model-approve` branch (Design §6), the description, the version — layer product command
- `.claude/commands/pharn-grill.md` — EDIT. One sentence (`/pharn-loop --quick` invokes `--quick` too) and the version — layer product command
- `.claude/commands/pharn-ship.md` — EDIT. Two sentences on what `/pharn-loop` commits (a green stop) and iterates, and the version — layer product command
- `pharn/floor/loop-mode-core.test.mjs` — NEW. Every reading, the any-state rule, the fail-toward-full cases, the parity with `check-spec.mjs --spec-kind` — layer product floor tests
- `pharn/floor/check-loop.test.mjs` — EDIT. The quick table, the token binding both ways, the flag refusal, the import fallback, ★ WIRING, the key set, the decision closure — layer product floor tests
- `pharn/floor/check-loop-fresh.test.mjs` — EDIT. A quick fixture, each quick-mode check broken alone, stale regress evidence ignored, the flipped and drifted kind, ★ WIRING, `DOC_KEYS` — layer product floor tests
- `pharn/floor/check-loop-record.test.mjs` — EDIT. `STOP_GREEN_QUICK`, `mode` shapes, the cross-field rule, the enum closure — layer product floor tests
- `pharn/floor/check-loop-decision.test.mjs` — EDIT. Quick records over quick and feature SPECs, the post-revert re-derivation, mode mismatch, enum parity — layer product floor tests
- `.dev/floor/command-hygiene.test.mjs` — EDIT. `STUCK_POINTS` + S6c, `LOOP_QUICK_WIRING`, the `STOP_GREEN` closure, mutation controls — layer dev tests
- `CLAUDE.md` — EDIT. A `check-loop.mjs` Commands entry; the `check-loop-fresh`, `check-loop-record` and `check-loop-decision` entries; the two Step-6c comments; the spine paragraph — layer repo-meta
- `README.md` — EDIT. Badge 6.26.0, the `/pharn-loop --quick` usage, the commands row, the paper-trail lines, the token-cost bullet, and the CURRENT-STATE region regenerated by `npm run docs:generate` (floor checkers 87 → 88; a declared Bash write) — layer repo-meta
- `CHANGELOG.md` — EDIT. `## [6.26.0]` (the build's date), moving any `[Unreleased]` entry, with the rollback directions — layer repo-meta
- `SKILLS_VERSION` — EDIT. `6.25.0` → `6.26.0` — layer repo-meta
- `.dev/features/loop-quick-mode/handoff/make-patch.mjs` — NEW. The committed LIMITS patch generator (Design §10) — layer dev artifact
- `.dev/features/loop-quick-mode/proposed/human-only.patch` — NEW. Written by `make-patch.mjs` (a declared Bash write) — layer dev artifact
- `.dev/features/loop-quick-mode/proposed/human-only.sha256` — NEW. Written by `make-patch.mjs` (a declared Bash write) — layer dev artifact
- `.dev/features/loop-quick-mode/proposed/apply.sh` — NEW. The human-run apply script, byte-for-byte from Design §10 — layer dev artifact
- `.dev/features/loop-quick-mode/proposed/APPLY.md` — NEW. What to read, when to apply, what it does — layer dev artifact

### Explicitly not touched by the agent

- `LIMITS.md` — human-only (fix #2); it travels in `proposed/human-only.patch`, applied by `apply.sh`.
- `pharn/ARCHITECTURE.md`, `pharn/CONSTITUTION.md`, `THREAT-MODEL.md`, `CODEOWNERS`, `.claude/settings.json`, `.claude/settings.local.json`, the four hook scripts, `pharn.spec-template.md` — human-only and byte-identical.
- `MIN_CLI` — stays `0.5.0`.
- `pharn/floor/mark-phase.mjs`, `ship-outcome-core.mjs`, `render-cost-ledger.mjs`, `check-cost-ledger.mjs`, `run-window-core.mjs` — no loop mode marker (D7), no ledger change (Design §8).
- `pharn/floor/spec-template-core.mjs`, `check-spec.mjs`, `check-regress.mjs`, `stage-regress.mjs`, `check-verify.mjs`, `gate-run-core.mjs`, `reconcile-ignore.json`, `worktree-fingerprint.mjs` — reused as they are.
- `.claude/commands/pharn-verify.md`, `pharn-regress.md`, `pharn-test.md`, `pharn-plan.md`, `pharn-build.md`, `pharn-review.md` — no quick behaviour there; `pharn-verify.md`'s one `/pharn-ship --quick` sentence stays true and `stage-verify-script` rewrites that file.
- `.claude/commands/pharn-dev-*.md` — no dev quick mode (D15).

## Build procedure (pinned — L19, L22, L26, L44, L57)

1. `/pharn-dev-build` Step 0 as written: the setter from this PLAN, then `--anchor`.
2. Write the agent files above with the Write/Edit tools, `handoff/make-patch.mjs` included.
3. Format only this build's own files: `npx prettier --ignore-unknown --write <the written paths>` and `npx markdownlint-cli2 --no-globs --fix <the written .md paths>` — never over the tree (L57).
4. `npm run docs:generate` — regenerates README's CURRENT-STATE region (floor checkers 87 → 88); a declared Bash write to `README.md` (the other two generated regions come back byte-identical).
5. `node .dev/features/loop-quick-mode/handoff/make-patch.mjs` — ONE invocation; it writes the patch and the sums (declared Bash writes).
6. Write `proposed/apply.sh` (byte-for-byte from Design §10) and `proposed/APPLY.md`; format `APPLY.md` as in step 3.
7. `node pharn/floor/validate.mjs .` and `npm test`; the build's floor halts on RED.
8. `BUILD.md` records only commands already run, each with its exit code: the success-measure counts re-derived on the build's HEAD; the probes named under "Evals and tests"; the generator's output and one refusal per in-memory check (a `find` matching twice, a replacement dropping a registered marker string, a CHECK-5 text stripped of its split words).

## Chain sequencing

1. `/pharn-dev-grill` → `/pharn-dev-build` → the floor → `/pharn-dev-regress` → `/pharn-dev-verify` → `/pharn-dev-review` → GATE 2. **Verify is green WITHOUT the patch**: the readers of `LIMITS.md`'s bytes are `validate.mjs` CHECK 5 (the file holds neither `rule_id:` nor `problem:`) and `check:markers` (the §3a and §6 edits leave every registered string byte-identical, which the generator asserts); no test reads its prose, and `pharn/ARCHITECTURE.md` does not move.
2. The human applies the patch at GATE 2, after the last `/pharn-dev-verify` and before the merge; `APPLY.md` carries the out-of-order case.
3. After a sibling merges into `main`: re-run `make-patch.mjs` if `LIMITS.md` moved (its sums are whole-file), and renumber the version and the CHANGELOG section by diff.

## Contracts satisfied

- `pharn/pharn-contracts/loop-record.md` — amended: `STOP_GREEN_QUICK`, the optional `mode`, the checkers' new rules, R1/R2 restated.
- `pharn/pharn-contracts/cost-ledger.md` — amended by two sentences; the schema stays `pharn-cost-ledger/2` and `OUTCOME_KEYS` is unchanged.
- `pharn/pharn-contracts/spec-template.md` — amended: `quick` under `--model-approve --quick`; rule 9 unchanged.
- `pharn/pharn-contracts/gate-run-record.md`, `verify-report.md`, `ac-tests.md`, `stage-exit.md` — unchanged: the quick run's verify evidence, AC gate and stage exits are the full run's.
- `pharn/pharn-contracts/finding-shape.md` — unchanged: neither `LOOP.md` nor the quick `GRILL.md` carries a finding.

## Evals and tests to write (P1)

No `role:` capability is added, so no eval pair is owed. Each test names the negative control that must turn it red (L60).

- **`loop-mode-core.test.mjs`.** `quick` for a templated `spec_kind: quick` SPEC in Draft AND Approved state; `full` for no kind line, `test-infra`, `bogus`, two kind lines, a body-first kind line, a legacy SPEC carrying `spec_kind: quick`, no frontmatter, no `SPEC.md`, and a directory named `SPEC.md`. ✧ Parity: on every fixture, `loopModeOf` is `quick` iff `check-spec.mjs --spec-kind` prints `quick` (L39). Control: flipping only the kind line flips the mode (L40). ✧ `LOOP_MODES` is exactly `["full", "quick"]`, frozen.
- **`check-loop.test.mjs`.** The quick table, one case per form (L52): PASS → `STOP_GREEN_QUICK` 0 with NO regression report, with a stale `no-regressions` report and with a `regressions` report on disk (never read — the probe); FAIL and INCOMPLETE → CONTINUE / STOP_CAP; INCONCLUSIVE → STOP_TERMINAL `unmeasured`; `ac-evidence` and `reconcile` → STOP_TERMINAL with their causes; a malformed verify report → INCONCLUSIVE; `mode: "quick"`, `regress_verdict: null`. Full mode: every existing case unchanged, plus a feature SPEC beside the reports → `mode: "full"`, identical decisions. ★ The token is bound both ways: over enumerated verdict pairs, a feature SPEC never yields `STOP_GREEN_QUICK` and a quick SPEC never yields `STOP_GREEN`. ★ `--quick` and `--mode quick` in argv → INCONCLUSIVE (refused). ★ The import fallback: a copied floor whose `loop-mode-core.mjs` throws at load decides a full case exactly as before and a quick case INCONCLUSIVE. ★ WIRING (L45): the committed stop line from `pharn-loop.md`, executed in a quick feature directory → `STOP_GREEN_QUICK`; control: a feature SPEC there → INCONCLUSIVE. The key-set test gains `mode`. ✧ Closure: the `decision = "…"` assignments in the source are exactly `STOP_GREEN`, `STOP_GREEN_QUICK`, `STOP_CAP`, `STOP_TERMINAL` and `CONTINUE`, and `INCONCLUSIVE` appears only in the refusal objects; the record enum is those stop tokens plus `INCONCLUSIVE`, `CONTINUE` excluded.
- **`check-loop-fresh.test.mjs`.** A quick fixture (the front with `spec_kind: quick`, re-pinned; only verify evidence). FRESH with A–E, J, F and I `pass`, G and H `skipped`, `mode: "quick"`. Each quick-mode check broken alone: no verify report → RERUN verify; no verify stamp → RERUN; an unbound report → RERUN; an edited log → STOP (J); a forged verdict → STOP (E); a moved tree → RERUN verify (F); a red front → STOP (I). ★ Stale regress evidence (another feature's regress stamps and report) → still FRESH in quick mode; control: the same files in full mode → STOP. ★ The kind flipped to `feature` and re-pinned with only verify evidence → RERUN `regress` (`report-missing`). ★ A FEATURE fixture whose SPEC gains `spec_kind: quick` after approval (pin unchanged) → the quick column passes, then STOP `front-stage-red` at I; the reverse flip over a quick fixture → RERUN `regress` at A. ★ WIRING: both committed lines over the quick fixture → FRESH; then a changed tree → RERUN verify at the decision and STOP at the commit gate. `DOC_KEYS` + `mode` pinned in both files; the crash document carries `mode: null`. ✧ `QUICK_SKIPPED` is exactly `["G", "H"]`.
- **`check-loop-record.test.mjs`.** `STOP_GREEN_QUICK` + `mode: quick` → GREEN; `STOP_GREEN_QUICK` with `mode: full` or none → RED; `STOP_GREEN` + `mode: quick` → RED; `mode` values `full` / `quick` GREEN (the envelope parser trims surrounding spaces and matching quotes, as for every field), `QUICK`, `fast`, `full,quick` and a value carrying a tab RED; a blocked quick record (`INCONCLUSIVE`, `blocked: not-quick`, `mode: quick`) → GREEN; the contract template still GREEN. ✧ The accepted decisions equal `check-loop.mjs`'s stop tokens.
- **`check-loop-decision.test.mjs`.** A quick `STOP_GREEN_QUICK` record over a quick fixture → GREEN; ★ a quick `STOP_CAP` record over a SPEC reverted the Step-6a way (`state: Draft`, empty hash, no `approved_by`) → GREEN (L42/L58); a quick `STOP_CAP` record with no `mode` → RED `MODE_MISMATCH` (absent reads full); record `mode: quick` over a feature SPEC → RED; a `STOP_GREEN` record over a quick SPEC → RED (decision mismatch); a blocked quick record → SKIPPED. ✧ Its enum equals `check-loop-record.mjs`'s (behavioural: each token through both).
- **`command-hygiene.test.mjs`.** Design §9, each rule with its mutation control: drop the kind line, move it out of the section, drop a skip pointer, respell `STOP_GREEN_QUICK` as `STOP_GREEN_Q`, drop the ADVISORY label, restore "No shipped command passes both today" in `pharn-spec.md`, add a second quick scope line.
- **The generator** (`handoff/make-patch.mjs`, dev apparatus): `BUILD.md` records one refusal of each imported check with an input it must refuse, and one successful generation (`git apply --check` clean, the printed sums).

## Guarantee audit (P0)

- (quick) **"A quick loop's stop is decided over `/pharn-verify`'s verdict alone"** → **FLOOR** (`check-loop.mjs`: enum membership over one verdict + `iter >= cap`, tested). The regression report is not read.
- (quick) **"The mode is the SPEC's pinned kind, never a flag"** → the read is **FLOOR** (membership over the one kind reading; no argv selects a mode — the parser refuses every other flag; tested). That the kind is the APPROVED, un-drifted one is **FLOOR at the moment `check-loop-fresh.mjs` check I runs** (content-hash; the pin covers the kind line). That I runs before the stop is **ADVISORY** orchestration (the command's order) — the same standing today's report binding has.
- (quick) **"A full SPEC never skips the regression verdict"** → **FLOOR**: any SPEC not positively quick reads full, which requires `no-regressions` for green (tested per member, the unloadable reader included).
- (quick) **"`STOP_GREEN_QUICK` ⇔ a quick SPEC"** → **FLOOR** (tested both ways).
- (quick) **"A quick run is tree-bound and checked for fabrication"** → **FLOOR** (`check-loop-fresh.mjs` F, J, E, D, C over the verify evidence; tested). Bounds unchanged: tree identity, not recency; agreement, never provenance.
- (quick) **"No regression outside the feature is looked for"** → a stated limit, not a claim.
- (quick) **"A changed file outside the declared files stops a quick loop"** → the exit is **FLOOR** (`check-regress.mjs scope`); running it and assembling its inputs are **ADVISORY** (L5), bounded as `/pharn-regress`'s `scope-escaped` remedy states (a plan that rewrites its own `## Files` defeats it).
- **"The recorded decision and mode agree with a live re-derivation"** → **FLOOR** for a non-blocked stop (`check-loop-decision.mjs`, tested); agreement between files, never provenance (L43). A blocked stop's `mode` is shape-checked only.
- **"A record's decision and mode are consistent"** → **FLOOR** (`check-loop-record.mjs`: enum over the pair).
- (quick) **"A quick loop commits only `STOP_GREEN_QUICK` with a GREEN decision check"; "a full run never commits `STOP_GREEN_QUICK`"** → the token is **FLOOR**; the commit branch is **ADVISORY** (command prose), exactly as for `STOP_GREEN` today.
- (quick) **"`--quick` is read only as the first token"** → **ADVISORY**. Backstops: the Step-3 kind read (a floor read, obeyed advisorily) and the stop's own mode. **Bound:** the floor sees the SPEC, never the invocation; under `--model-approve` the model writes and approves the kind, so a misread `--quick` runs quick with every floor check green and nobody told before the run — the record, the commit message and the summary say so after.
- **"`/pharn-spec --quick --model-approve` refuses a misfit"** → the judgment is **ADVISORY**; rule 9 is the **FLOOR** backstop (a quick SPEC with more than three criteria, or an `e2e` one, cannot be approved).
- (quick) **"No `RUN-REPORT.md`; `cost.json` kept"** → **ADVISORY** (command prose); the hygiene pins prove the prose says so, never that a run obeyed it.
- **"The ledger never claims a regress check for a quick green"** → **FLOOR relative to the record**: the copied decision is `STOP_GREEN_QUICK`, re-derivable; no marker is involved.
- **"The change is small"** → not a claim.
- **"The human-only patch keeps green every gate that reads `LIMITS.md`"** → **FLOOR at apply time** (`apply.sh` runs the sums, `validate` and `check:markers` on the applied bytes and restores the file on failure); the generator's in-memory checks are an earlier copy of the same predicates.

## Trust audit (P2)

- **New inputs.** The SPEC text reaches `loopModeOf` and yields only a closed token; its body is never interpreted. `LOOP.md`'s `mode` (an untrusted, model-written field) is shape-gated and compared; it never selects a table. `check-loop-fresh.mjs` reads the same closed token.
- **The flag is not read from the description.** `--quick` counts only as the first token; elsewhere it is description text, passed on as DATA (ADVISORY — see the guarantee audit). The injection-shaped path — a description that asks for `spec_kind: quick` in a full run — is refused at Step 4a (a quick Draft is never approved without `--quick`, advisory) and, failing that, ends as an uncommitted `STOP_GREEN_QUICK` (D8).
- **Unread intent, executed** — unchanged in kind and smaller in reach: a quick run executes the project's gates at head only (no base suite).
- **Outputs.** The not-checked list and the S6c row are fixed text; control flow still reads only exit codes, enum verdicts, `failing_gates` membership and the kind token.
- **Residual.** `LIMITS.md §2`, unchanged; the loop's Handoff channel is unchanged.

## Determinism audit (P5)

- Every new branch is a membership test: the kind is `quick` or not; the Step-3 read prints exactly `quick`; the record's `mode` is a member; the decision↔mode pair is a member of the allowed pairs; the RERUN stage is `regress` or `verify`. The first-token test is one the MODEL applies (advisory).
- Every judgment case stops: a fit-check miss (S6c), a kind mismatch (S6c), a scope escape (S9), a quick RERUN of regress (S11). None guesses, and none widens a quick request into a full run.

## Deferred — named, not dropped

- `quick-scope-inputs-by-code` — build the quick scope check's `--changed` / `--declared` inputs by code (a tested helper, or a quick-mode check inside `check-loop-fresh.mjs`, re-run at the commit gate), for both quick modes. Pending (L46); trigger: this plan's own L5 bound.
- `architecture-loop-quick-line` — one sentence in `pharn/ARCHITECTURE.md §6` naming `/pharn-loop --quick`, at a trusted-docs catch-up after the in-flight phases merge (the pin moves then, once).
- `loop-quick-run-report` — make `render-run-report.mjs`'s `## Verdicts` regress line name a quick loop, if a quick loop ever renders a report (none does, by the maintainer's decision).
- `quick-size-signal` (3.1's, still open) — any measurement of change size.

## Open questions (HALT)

- **Q1 — `LIMITS.md §6`'s scope-check bound becomes an understated "only if".** §6 says `check-regress.mjs scope` "fires only if `/pharn-regress` runs — or, since 6.25.0, `/pharn-ship --quick`'s item 7". Once `/pharn-loop --quick` runs the same partition every iteration, that "only if" is false, in the safe (understating) direction — the shape 3.1's re-review N3 fixed. The brief says to keep this increment's LIMITS edit inside §3a, because `stage-model-routing` patches §8.
  - (a) Add one clause to §6 in the same patch. It is disjoint from §8's hunk, and the whole-file sums already force whichever LIMITS patch lands second to regenerate, so the section does not change the merge cost.
  - (b) Keep the patch inside §3a and name the §6 clause as owed by a later trusted-docs catch-up (N3's own alternative).
  - **Recommendation: (a)** — a trusted doc should not ship a sentence this increment makes false, and the brief's reason (a §8 collision) does not reach §6. If the orchestrator holds to the brief, (b) is safe: nothing reads the sentence.
