# PLAN — slim-commands: short descriptions, one claims block, rationale out of the product commands, and a size budget

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4 # fix #4
- applied_lessons: [L1, L2, L6, L10, L13, L19, L20, L22, L25, L29, L33, L34, L35, L36, L37, L44, L47, L49, L50, L52, L57, L60, L61]
- increment: the eleven product commands keep what a model executes — steps, pinned lines, stop and exit mappings — plus one `## What you may claim` block; each frontmatter `description:` shrinks to at most 250 bytes saying what the command does and when to use it, its FLOOR/ADVISORY claims moving into that block; rationale, history and measurement narratives leave the bodies, because each already has an owner that ships (a contract, a floor module's header, a trusted-doc section) or a CHANGELOG section; and `.dev/floor/command-hygiene.test.mjs` gains a closed per-command byte ceiling and a per-description ceiling that fail when exceeded.
- layer(s): product commands (`.claude/commands/pharn-*.md`); dev tests (`.dev/floor/command-hygiene.test.mjs`); repo-meta (`CLAUDE.md`, `README.md`, `CHANGELOG.md`, `SKILLS_VERSION`). No contract, floor module, hook, settings file or trusted doc changes. No `role:` capability.
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]
- stage model: plan — opus — set by the maintainer's instruction; routed via Agent subagent; effort not routed
- base: branch `slim-commands` at `db3a81f`, whose tree is byte-identical to `origin/main` `b627409` (6.28.0, #284 merged; `git diff --quiet` exit 0, checked this run). `SKILLS_VERSION` 6.28.0, `MIN_CLI` 0.5.0. Bumps to **6.28.1** (patch, D7). #282 (another session's 6.26.1) is open; whichever merges second renumbers by diff.
- roadmap: Phase 4.1 of the token-reduction roadmap (maintainer-approved 2026-09-25): "slim the commands (rationale to contracts, keep a 'What you may claim' block, size budget test, short descriptions)". M3 is the maintainer's measurement.
- gate1: APPROVED 2026-09-27 by the orchestrator under the maintainer's 2026-09-25 delegation — a MODEL decision, NOT a human approval. D1–D10 accepted as written; Q1 → (a): the quick-mode sections stay in their commands, slimmed, and reading them on demand is the named follow-up `quick-mode-on-demand`, revisited after M3. No trusted doc, contract or new file is touched. Re-based on the pointer `83b1f89` (this plan's `d82b87b` merged with `main` `b627409`, tree unchanged).
- grill: amended after `/pharn-dev-grill` (`GRILL.md`); `## Amended after grill` lists what changed. Stage model: opus — set by the maintainer's instruction; routed via Agent subagent; effort not routed.

## Applied lessons

- **L1** — every meta-doc stating a fact this changes is in `## Files`: `CLAUDE.md` (a new convention bullet for the command budget and the command shape), `README.md` (the badge), `CHANGELOG.md`, `SKILLS_VERSION`. Checked and left alone: the three generated regions (`npm run docs:check` reads command NAMES, the contract count and the floor count, none of which moves), the README's hand-written command table, `CONTRIBUTING.md` (the budget lives inside the existing `test` gate, so the gate list it pins does not change).
- **L2** — each command's honesty travels with it: the claims block carries the command's FLOOR/ADVISORY split and its struck claims, and every Floor bullet names a checker that exists and ships (the bullets are condensed from the current audit sections and descriptions, never invented); no new "enforced by" appears anywhere.
- **L6** — the budget test reads each `description:` from the file's frontmatter block (the structured location) and command membership from the directory listing by the `pharn-` / `pharn-dev-` name split the installer also uses — never a grep over prose.
- **L10** — no file under `pharn/` changes, so `validate.mjs`'s scanned surface is untouched; the build still runs it.
- **L13** — the build formats only the files it wrote, and this stage formats this PLAN.
- **L19** — every Bash write is declared: the scoped formatter runs, and the build's scratch measurement and survival scripts under `.pharn/pharn-dev-build/` (gitignored, never `.md`). No generator runs: the generated regions do not move (L1).
- **L20** — the description bloat recurred increment after increment (6.28.0 alone added about 740 B to `/pharn-loop`'s, `loop-quick-mode` REVIEW F7), so a remembered "keep it short" would recur; the remedy is a floor check, the budget test.
- **L22** — pinned lines and every instruction stay byte-identical; the build deletes rationale and never re-words a pinned line or a step (Design §3, "Editing rule").
- **L25** — a command's copy of an owner's bound goes stale when the owner changes. Live instance: `pharn-loop.md` Step 1a still says the Stop guard "acts only once a human has wired it", citing `.dev/features/loop-stop-guard/settings-patch/APPLY.md`, while the shipped `.claude/settings.json` has wired it since 6.12.0. The command's copy is retired and the owner cited.
- **L29** — the budget test's domain is the product-command set, materialized once and iterated by every rule.
- **L33** — expired or dead prose found in the commands leaves with the rationale it sits in: the stale wiring sentence above, and three `.dev/` cites an install cannot follow (`pharn-loop.md` Step 1a and its Guarantee audit, `pharn-ship.md` Step 2c).
- **L34** — the budget test asserts its domain is non-empty and counted before any per-file rule runs.
- **L35** — a command restating a contract or a module header is a second copy; the remedy is to retire the command's copy and cite the owner, not to add a sync check.
- **L36** — the budget table is closed over the corpus in both directions: a product command on disk with no entry fails, and an entry naming no file fails.
- **L37** — the listing observation is recorded as measured (Discovery), the pin inventory was probed by executing the suite rather than read off the tests, and the savings are labelled estimates.
- **L44** — no fenced block is split, merged or re-ordered; each stays its own shell, and the build's survival check compares fenced lines one by one.
- **L47** — the claims blocks and the `CLAUDE.md` bullet use open forms ("the product commands", never "eleven") where a count would expire; only the budget table itself, which a test closes, enumerates.
- **L49** — this plan's sweep states its coverage boundary (Guarantee audit): sizes, descriptions, block presence and pinned lines are checker-backed; the completeness of the claim mapping and the absence of lost unpinned instructions are not.
- **L50** — cites were swept by referent, not by phrase, in both directions. Outward: every `.dev/` path in the product commands (three) and every PHARN dev-lesson id (`L<n>`), which names canon an install does not ship and shares the `L<n>` shape of the user's own `memory-bank/` ids. Inward: every cite of a section this plan removes — none outside the commands (a `git grep` over `pharn/`, `.claude/`, the root docs and the trusted docs), and the in-command ones listed in Design §3, each re-pointed or deleted.
- **L52** — the budget test ranges over the set — every command, every description — with one negative control per asserted property.
- **L57** — the build's markdownlint runs carry `--no-globs` and a path list.
- **L60** — each asserted property has its own control that turns it red: over-ceiling bytes, an over-long description, a claim word, a missing block, and a map missing or adding one command.
- **L61** — the build's scratch is `.mjs`/`.json` under `.pharn/`, never `.md`, so no local `lint:md` goes red on it.

## Trigger (P7)

1. **The user's ledgers.** A user's own `cost.json` ledgers put PHARN's stages at about 48% of relative cost on large features and about 81% on three small fixes (the roadmap's trigger, recorded 2026-09-25, weights input 1 · cache write 1.25/2 · cache read 0.1 · output 5).
2. **Two costs repeat on every run.** An orchestrator's command body is re-read from cache on every request of its run, and an inline stage's body joins that context once it is invoked and stays for the rest of the run. Every product command's `description:` sits in the skill listing of EVERY session in a user's project, PHARN run or not.
3. **Observed in this session (a platform observation, not a floor fact).** This session's context lists the product commands with their descriptions. A description longer than 1,535 characters is cut there, with an ellipsis (measured exactly for five by locating the displayed tail in the file — `pharn-build`, `pharn-grill`, `pharn-plan`, `pharn-ship`, `pharn-spec`; `/pharn-verify`'s and `/pharn-loop`'s are cut too). `/pharn-test` and `/pharn-memory-promote` are listed by NAME ONLY — no "when to use" text reaches the model at all. When `main` moved mid-session, the changed descriptions were listed again. Whether Claude Code budgets the listing, and how, is undocumented (a `claude-code-guide` check this run: "UNDOCUMENTED" for the per-description cap, the total budget and the injection rule).
4. **The reviews already named the bytes.** `stage-model-routing` REVIEW A9: about 6 KB of rationale in `pharn-ship.md` and `pharn-loop.md`. `loop-quick-mode` REVIEW F7: 4.9 KB of rationale inside `pharn-loop.md`'s `## Quick mode`, 2 KB of its question table restating Step 2, and the question whether that section could be read on demand.

## Discovery (P6) — live state read this run

**Baseline, re-measured at `db3a81f`** (bytes of the file; description = the raw frontmatter value, quotes included; it equals the orchestrator's table byte for byte):

| File                    |   Bytes | Description | Lines |
| ----------------------- | ------: | ----------: | ----: |
| pharn-ship.md           | 124,078 |       2,440 | 1,660 |
| pharn-loop.md           | 112,538 |       4,616 | 1,477 |
| pharn-memory-promote.md |  39,685 |       1,579 |   570 |
| pharn-spec.md           |  37,149 |       2,660 |   461 |
| pharn-review.md         |  36,909 |         550 |   494 |
| pharn-build.md          |  36,583 |       1,813 |   444 |
| pharn-grill.md          |  35,075 |       1,953 |   471 |
| pharn-plan.md           |  34,722 |       2,364 |   477 |
| pharn-test.md           |  24,904 |       2,038 |   360 |
| pharn-regress.md        |  19,683 |       1,112 |   272 |
| pharn-verify.md         |  18,418 |       1,661 |   246 |
| **total**               | 519,744 |      22,786 |       |

**Where the bytes are (heading outline, measured).** In every non-thin command the tail sections — `## Guarantee audit`, `## Trust (audit)`, `## Determinism audit`, `## What … does NOT do`, `## A doc-reconciliation … surfaces`, and `pharn-ship.md`'s `## /pharn-ship --loop — deferred` — are claim labelling and rationale: 23.3 KB in `pharn-ship.md`, 16.7 KB in `pharn-loop.md`, 4.3–8.2 KB in each of the seven stage commands. `## The two layers` (five commands, 1.5–3.0 KB each) is floor/advisory labelling. The `## Quick mode` sections are 17.1 KB (ship) and 18.7 KB (loop), roughly half executed deltas and half rationale and audit. The rest of the rationale is inline: `ADVISORY (P0)` paragraphs after pinned lines, version narratives, restated contract and module bounds.

**The pin inventory — probed by execution, not read (L37).** The full suite was run once with a scratch preload that recorded every string and regex probe a test process made against product-command text, with the text it matched (`.pharn/pharn-dev-plan/pinprobe.mjs`, scratch; ADVISORY — a probe that builds its needle at run time or matches fewer than 12 characters is missed, so this is a lower bound). The suite passed under it (exit 0). Findings:

- **24 test files probe product-command text:** `.dev/floor/command-hygiene.test.mjs` (most pins), `.dev/floor/check-provenance.test.mjs`, the hook suites `enforce-writes-scope`, `require-loop-record`, `set-writes-scope`, `writes-scope-release`, and under `pharn/floor/`: `check-bash-reconcile`, `check-loop-fresh`, `check-loop`, `check-provenance`, `check-quick-scope`, `check-red-run`, `check-regress`, `check-spec`, `check-test-stage`, `gate-run-core`, `merge-findings`, `render-regression`, `render-run-report`, `run-marker`, `ship-outcome-core`, `stage-regress-core`, `stage-regress`, `stage-verify`. At least one more reads a command with short needles the probe filtered out (`stage-agent-core.test.mjs` scans `pharn-loop.md`'s `| S<n> |` table rows) — so the build's full-suite runs, not this list, are authoritative.
- **The tail audit sections and every `## The two layers` section carry no recorded probe** in nine of the eleven commands. The exceptions are small: `pharn-verify.md`'s audit and named limits hold `NAMED_LIMITS` anchors (kept — the thin callers are left alone, D9), `pharn-regress.md`'s Determinism audit holds `gate-run-core`'s `(minus the e2e ids)`, and `pharn-build.md`'s audit holds one `--from-frontmatter …` closure hit (a closure pin only fails on an addition). So replacing the tail audits with the claims block needs no re-pointing.
- **The pins sit in the steps**: matched text is about 9.7 KB of `pharn-ship.md` and 11.2 KB of `pharn-loop.md`, and 0.6–2.2 KB of each other command. Many pinned sentences are honesty labels a GATE-2 review asked for — `This rule is ADVISORY (P0)…`, `control flow never uses the agent's prose is **ADVISORY**`, `` `THREAT-MODEL.md §5`'s free-text residual ``, the not-checked lists, `**Why Step 1a's snapshot and`--open`lines stop as S9` — and the section-scoped helpers (`quickModeSection()`, `loopQuickSection()`, `sectionOf(file, start, end)`, the `## Running a stage` slice) read them inside a named section. Headings are anchors: `LOOP_QUICK_HEADING`, `## Running a stage (6.27.0) — …`, `### Step 6c`, `## Step 2b — The single build-completion retry`.
- **Order-sensitive whole-file pins** (`loop-quick-mode` grill G7): `render-run-report.test.mjs` takes the FIRST occurrence of the render invocation and requires it after the ledger check and before `### Step 6c —`; `check-loop-fresh.test.mjs` counts the lines that start `node pharn/floor/check-loop-fresh.mjs`; `check-test-stage.test.mjs` pins fenced lines; `run-marker.test.mjs` and `require-loop-record.test.cjs` filter a file's lines and execute them; `LOOP_QUICK_FORBIDDEN` bars those literals from `## Quick mode`; and `command-hygiene.test.mjs`'s release-pointer rule requires the pointer to sit above the LAST line matching `/end (your|the) turn/i`, so deleting text below the pointer can move that line above it.

**The installer — read in the local `pharn-cli` checkout** (`4f0610a`, one commit on top of the `0.7.0` release `9374ee1` that touches only that repo's own `CONSTITUTION.md` and `THREAT-MODEL.md`): `init` and `update` copy the top-level `pharn-*.md` files of `.claude/commands/` except `pharn-dev-*` (never a subdirectory — `copyFilteredDir` keeps `entry.isFile()` only), the top-level non-test `.cjs` hooks, the four trusted docs, `pharn/pharn-contracts/` and `pharn/pharn-core/` whole, `pharn/floor/` minus tests and fixtures, `pharn/features/README.md` and the license; `src/` never reads a command's `description:`. **So this increment's shape — the same eleven files, rewritten in place — needs no installer change, and `MIN_CLI` stays.** Not checked, and stated: that the published npm `0.7.0` tarball equals this checkout, and the copy rules of CLIs between `0.5.0` and `0.7.0` (irrelevant here, because no file is added or moved).

**Trusted-doc cites into the commands.** Only `THREAT-MODEL.md` cites a command section: `.claude/commands/pharn-review.md` Step 3b, twice. That step keeps its carve-out byte for byte (also pinned by `CARVE_OUT_ANCHOR`).

**Descriptions pinned by nothing.** No test asserts a description's text. The probes that land inside a description are closure scans — the `STOP_GREEN`-token closure and `check-regress.test.mjs`'s pipeline-artifact closure — which an edit that only removes text cannot fail. The other frontmatter probes are the `writes:` lines, the frontmatter fence, and one `reads:` entry (`"pharn/floor/check-loop-fresh.mjs"` in `pharn-loop.md`).

**Dead and expired cites in shipped prose (L33, L50).** `pharn-loop.md` Step 1a (a stale "acts only once a human has wired it" and `.dev/features/loop-stop-guard/settings-patch/APPLY.md`), its Guarantee audit (`.dev/floor/command-hygiene.test.mjs`), `pharn-ship.md` Step 2c (`.dev/features/product-features-relocation/REVIEW.md` F3). Across ten commands, 91 bare `L<n>` tokens: most name PHARN's dev lessons (canon an install does not receive), some are format examples of the user's own ids (`[L1, L2]`, `L3: considered.`), which stay.

**Cites INTO the sections this plan removes.** A `git grep` over `pharn/`, `.claude/`, the root docs and the trusted docs finds none outside the commands themselves. Inside them: `pharn-build.md:227` ("see Trust audit"), `pharn-loop.md:227` ("see Trust"), `pharn-loop.md:493` ("the audit bullet below"), `pharn-ship.md:75` ("Guarantee audit" below), `:104` ("What `/pharn-ship` does NOT do"), `:934` ("the guarantee-audit's …"), `:1366` (`/pharn-loop`'s "What `/pharn-loop` does NOT do"), `pharn-review.md:335` ("see the audit below"), and the release pointer's second sentence in every setter-invoking command ("it sits beneath the audit sections for document layout only") — its pinned first sentence stays.

## Design

### 1. Descriptions — at most 250 bytes, what and when, no claims

- **The budget:** the parsed `description:` value is at most **250 UTF-8 bytes**, for every product command. Drafts measured at grill: 153–237 bytes each, 2,063 bytes in total (−91% from 22,786); the largest leaves 13 bytes of headroom.
- **What a description says:** what the command does, when to use it (its place in the pipeline, or its trigger), and its mode flag if it has one. Example (the `/pharn-verify` draft, 170 bytes): _"Verify a built feature: run the project's gates once at HEAD plus the acceptance-criteria gate (verify-report.json, VERIFY.md). Run after /pharn-build and /pharn-regress."_
- **The "when" for a command that commits, approves on its own or writes canon is the user's request (grill G1).** A description is also the text a model uses to decide whether to invoke a command itself, and after this increment all eleven are listed in full (two were name-only). So `/pharn-loop` (the model approves its own SPEC and commits a branch), `/pharn-ship` and `/pharn-memory-promote` (writes canon once the user accepts) each name the user's request as the trigger — never a situation the model may infer. Whether the platform lets a model invoke a command at all, and how it chooses, is undocumented; this wording is ADVISORY and bounds nothing.
- **What it never says:** a claim. No `FLOOR`, `ADVISORY`, `NEVER means` or `(P<n>)`, and no version tag. A claim squeezed into 250 bytes loses its bound, which is the P0 disease in miniature; the claim's home is the body's claims block (§2).
- **Where every current claim goes:** into that command's `## What you may claim` block, as a bullet the build writes or finds already there. `BUILD.md` carries one mapping table per command — old description clause → block bullet (or "already stated: <section>"). None may be dropped.
- **Format:** one line, a double-quoted YAML scalar, as today.
- **The drafts** — the byte count, then the literal value; the build may improve any of them within the budget and the rules above:

  ```text
  pharn-spec (205): Turn a feature idea into pharn/features/<name>/SPEC.md: surface gaps, fill the SPEC template, stop for human approval, then pin it. The pipeline's first stage; `--quick` writes a 1–3 criterion mini-SPEC.
  pharn-plan (186): Turn an Approved, unchanged SPEC.md into PLAN.md with its declared files and applied lessons (plus AC-TESTS.md for a templated SPEC). Run after the SPEC is approved, before /pharn-grill.
  pharn-grill (191): Re-check a PLAN against its approved SPEC and its applied_lessons, then question it for gaps and write GRILL.md. Run after /pharn-plan, before /pharn-test; `--quick` runs the two checks only.
  pharn-test (177): Write each acceptance criterion's test before the build, run them, require each to fail, and pin the evidence in AC-TESTS.lock.json. Run after /pharn-grill, before /pharn-build.
  pharn-build (172): Build the user's code from an approved PLAN.md, writing only the files its ## Files names, once the spec chain and the test-stage evidence check out. Run after /pharn-test.
  pharn-regress (179): Check for regressions outside the feature: run the project's gates at the base commit and at HEAD and compare them (regression-report.json, REGRESSION.md). Run after /pharn-build.
  pharn-verify (170): Verify a built feature: run the project's gates once at HEAD plus the acceptance-criteria gate (verify-report.json, VERIFY.md). Run after /pharn-build and /pharn-regress.
  pharn-ship (228): Run the whole pipeline for one feature when the user asks to ship it (spec, plan, grill, test, build, regress, verify), stopping at two human gates: SPEC approval and the merge/fix/abandon decision. `--quick` for a small change.
  pharn-loop (237): Run the pipeline unattended, only when the user asks: the model approves its own SPEC, iterates build, regress and verify to a checker-decided stop, commits a green result to a new local branch, and reports. `--quick` for a small change.
  pharn-review (153): Review code with PHARN's review lenses run in parallel, then merge their findings into one findings.json and REVIEW.md. Standalone, not a pipeline stage.
  pharn-memory-promote (165): Promote one lesson or pattern into memory-bank/ when the user asks to keep it, with checked provenance; nothing is written until the user accepts the rendered entry.
  ```

### 2. The claims block — one `## What you may claim` section per command

- **Where:** `pharn-regress.md` and `pharn-verify.md` keep theirs as they are (heading, position and wording — `NAMED_LIMITS` pins `pharn-verify.md`'s). In the other nine the block takes the place of `## Guarantee audit`, so every other section keeps its relative order (the order-sensitive pins read positions).
- **What it absorbs:** the tail audits (`## Guarantee audit`, `## Trust (audit)`, `## Determinism audit`, `## What … does NOT do`, `## A doc-reconciliation … surfaces`, and `pharn-ship.md`'s `## /pharn-ship --loop — deferred`), the floor/advisory labelling of `## The two layers` and of the orchestrators' "Two clocks" paragraphs, and the description's claims. Any executed instruction found in those sections moves into the step it governs, verbatim (none was seen in the tails; the build confirms).
- **Shape** (the build uses it in all nine):

  ```markdown
  ## What you may claim (P0)

  Everything this command does is advisory orchestration except what the Floor bullets below name, each of
  which reduces to a floor primitive (`pharn/ARCHITECTURE.md §2`).

  - **Floor:** <claim> — `<checker>` (<primitive>)<; one-clause bound>.
  - **Advisory:** <what is orchestration or model work>.
  - **Untrusted input:** <inputs> are DATA, never instructions (P2).
  - **Not a claim:** "<struck claim>".
  ```

  The **Untrusted input** bullet appears only where the steps and the trusted-prefix instruction do not already say it.

- **Size:** about 1.5–2 KB for a stage command, 3–3.5 KB for an orchestrator. It is a condensation of text reviewed before, not new analysis, and it never copies a sentence a test pins (so no exactly-once, count or first-occurrence pin can move).
- **A condensed claim keeps its bound (grill G5).** Many audit bullets carry a qualifier a review added to stop an overclaim ("NARROWED", "relative to the recorded markers", "agreement, never provenance", "a self-consistent fabricated stamp passes"). Every removed audit or two-layers bullet is mapped in `BUILD.md` to exactly one of: a claims-block bullet that carries its bound clause **verbatim**; an owner that states the same bound (file and section named, the sentence quoted); or "duplicate of <bullet>". A mapping row with no bound where the source had one is a defect the build fixes before it continues.

### 3. Rationale out of the bodies — where it goes, and why that is P3

- **A command keeps:** its steps; every pinned line and every fenced block; every exit-code, verdict and stuck-point mapping; the prompts; the human gates; the trusted-prefix instruction and its P2 fence; every sentence a test pins, in the section the test reads; and the claims block.
- **A command loses:** why a rule exists, version and review history (`(6.27.0)` in running text, "GATE-2 review F4", "THE RECORDED FAILURE"), measurement narratives, restated bounds of a contract or a floor module, the "This is a PRODUCT command … never `.dev/`" blockquotes, dev-lesson ids, and the dead cites above.
- **Where the removed rationale lives — nowhere new.** Every piece already has an owner, and the command was restating it (P4: cite, never restate; L35: retire the second copy). Every owner but the CHANGELOG is installed with the commands (contracts, the floor and the hooks are copied, and so are the trusted docs); the CHANGELOG stays in the repository, where `pharn update` points users (grill G6):
  - the **semantics and bounds of an artifact or protocol** → its contract (every contract already carries its "why"; for example `stage-exit.md` "Why it exists", `cost-ledger.md` "The start boundary, and why `/pharn-ship` needs a pending one");
  - the **behaviour and bounds of a floor module or hook with no contract** → its header, which is that module's spec (`stage-agent-core.mjs`, `run-marker.mjs`, `quick-scope-core.mjs`, `ship-outcome-core.mjs`, `require-loop-record.cjs`);
  - **limits** → their `LIMITS.md` section (§3a quick mode's trade, §6 Bash, §7 the guards, §8 routing, §9 the AC evidence) or `THREAT-MODEL.md`;
  - **history** → its CHANGELOG version section, cited as `CHANGELOG [x.y.z]` only where a rule needs its reason at the point of use.

  A removed sentence leaves at most a one-clause cite behind. **A bound no owner states stays in the command** as one clause of the claims block — never deleted (P0). The build checks the owner for each removed paragraph; `BUILD.md` records, per section, what left and where its owner is.

- **Why no contract or module is edited, and no new file is added.** `pharn/ARCHITECTURE.md §4` defines `pharn-contracts` as "schemas only, ZERO behavior" and enumerates its files; the rationale of a schema belongs to the schema and is already there, while command procedure does not belong there at all. A new contract would need that enumeration amended by a human, and nothing here needs one. Keeping contracts and `.mjs` headers byte-identical also keeps this increment clear of #282, which edits `cost-ledger.md` and `ship-record.md`.
- **The P3 gain.** Today a command changes for two reasons: its procedure, and any change to a bound it restates (L25 — the stale Stop-guard sentence is what that looks like). After this, a command changes when its procedure changes, and a bound changes in its owner.
- **Editing rule (L22).** Delete, never paraphrase. A sentence that mixes an instruction with its rationale keeps the instruction clause byte for byte and loses the rationale clause; a definition the steps rely on (what a stage agent is, what a route token means) is kept as an instruction. No heading is renamed or moved (headings are anchors, inside and outside the tests), no fenced block is touched, and no pinned literal is newly quoted anywhere a first-occurrence pin would read it first.
  - **Numbering is frozen (grill G4).** A numbered item that is cited or pinned keeps its number: the Step 2 stages, the `## Quick mode` items (1–12 in `pharn-ship.md`, 1–9 in `pharn-loop.md`), the Step 1a entry steps and every stuck-point row. Removing an item's rationale never removes the item; an item emptied of everything but rationale keeps its number and one line.
  - **No reflow (grill G10).** A paragraph that holds a pinned sentence is not re-wrapped after a deletion; uneven lines stay. Several pins match a literal line break inside a sentence. (`prettier` keeps prose wrapping as written, since the repo sets no `proseWrap`.)
- **Cross-references (L50).** Every in-command cite of a removed section (Discovery lists them) points at the claims block afterwards, or is deleted with the sentence it sits in; the release pointer keeps its pinned first sentence, and its second sentence says where the Final step now sits.
- **Inbound cites into the commands (grill G4).** 41 lines in shipped files (measured at grill with the search below) cite a command step or item by number — for example `quick-scope-core.mjs` and `check-quick-scope.mjs` ("`/pharn-ship --quick`'s item 7"), `loop-mode-core.mjs` (`## Quick mode`, Step 6a), `check-loop.mjs` (Steps 6a and 6c, `/pharn-build` Step 0), `require-loop-record.cjs` (Steps 1a and 6b), `spec-template.md` (`/pharn-spec` Step 4a, `/pharn-ship`'s `## Quick mode`), `render-cost-ledger.mjs` (Step 7), `merge-findings.mjs` and `render-review-assignments.mjs` (`/pharn-review` Steps 1–5), and `THREAT-MODEL.md` (`/pharn-review` Step 3b). None of these files may be edited here (D3), so a cite that would dangle cannot be repaired in this increment: the text it relies on stays. The build lists every such cite — the pinned search below, its output quoted into `BUILD.md` — and marks each "resolves: <the text it relies on is still at the cited step or item>".

  ```bash
  git grep -n -E "(/pharn-(ship|loop|spec|plan|grill|test|build|review|memory-promote)|pharn-(ship|loop|spec|plan|grill|test|build|review|memory-promote)\.md)[^|]{0,30}(Step [0-9][a-z]*|item [0-9]+|## )" -- pharn/pharn-contracts 'pharn/floor/*.mjs' '.claude/hooks/*.cjs' THREAT-MODEL.md LIMITS.md pharn/ARCHITECTURE.md ':!*.test.*'
  ```

### 4. Mode-specific sections — they stay, slimmed (Q1, resolved (a) at GATE 1)

- **Decision for this increment:** `## Quick mode` stays in `pharn-ship.md` and `pharn-loop.md`, as do `pharn-spec.md`'s `## --quick` and `pharn-grill.md`'s `## --quick mode`. Each is slimmed like the rest: its rationale paragraphs go, its quick guarantee audit folds into the claims block except the text a test pins inside the section (`pharn-ship.md`'s first-token bullet and its two first-token sentences, `FIRST_TOKEN_ADVISORY`; `pharn-loop.md`'s `LOOP_QUICK_SECTION_PINS`), and `pharn-loop.md`'s question table keeps only its quick-only rows (the S6c pair, the scope check's S9, the `regress` RERUN's S11) under a one-line pointer to Step 2 for the rest. Expected: about 8–9 KB each, from 17.1 and 18.7 KB.
- **Why not an on-demand file now.** A file read with the Read tool only under `--quick` would save a further 8–9 KB per full-run orchestrator request, but no location satisfies all three constraints without a human decision:
  1. **Not under `.claude/commands/`:** a markdown file there, or in a subdirectory, registers as a slash command, and `pharn-cli` copies top-level `pharn-*.md` files only.
  2. **Installed by the CLI:** outside the commands, only `pharn/pharn-contracts/**`, `pharn/pharn-core/**` and `pharn/floor/**` qualify (read in `0.7.0`'s source; the CLIs between `0.5.0` and `0.7.0` were not checked).
  3. **Consistent with `pharn/ARCHITECTURE.md §4`:** "Stages live in commands, not in a module … the modules under `pharn/` hold only the capabilities those stages invoke", and `pharn-contracts` is "schemas only, ZERO behavior". A quick-mode procedure is stage behaviour.
- The only way through is a human amendment of §4 — Q1's option (b), deferred at GATE 1 as `quick-mode-on-demand` and revisited after M3.

### 5. Per-command map and targets

**Targets are estimates, never constraints (grill G2).** The editing rule (§3) wins over every number here: a target the build cannot reach by deleting rationale is missed, recorded in `BUILD.md` with the reason, and never met by cutting an instruction, pinned or not. A section-by-section estimate made at grill puts `pharn-ship.md` nearer 73 KB than 70 KB. The ceilings come from what the build measures (§7). Every command: the description (§1), the claims block replacing the tail audits (§2), and the "PRODUCT command" blockquote removed.

| Command                 |  Before | Estimate | What else goes                                                                                                                                                                                                                                                                                                                                     |
| ----------------------- | ------: | -------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pharn-ship.md           | 124,078 |   70,000 | the "Two clocks" paragraph; `## Running a stage`'s opening "why" and its unpinned Bounds sentences (A9); `## Quick mode` per §4; Step 2's backstop reasoning, run-marker "why", grill-divergence note and regress-residual narrative (the membership rule stays); unpinned rationale in Steps 2b–3b; the `--loop` section → one Not-a-claim bullet |
| pharn-loop.md           | 112,538 |   72,000 | the "Two clocks" paragraph; Step 1a's Stop-guard paragraph (the stale wiring sentence and its dead cite) and its ledger paragraph; `## Running a stage`'s opening "why" (A9); `## Quick mode` per §4 (D8 paragraph, mode-binding paragraph except its pinned sentence, the quick audit); unpinned rationale in Steps 5–7                           |
| pharn-memory-promote.md |  39,685 |   26,000 | `## The two layers`; rationale in Steps 0–6b (the tag-line entry contract stays: it is executed)                                                                                                                                                                                                                                                   |
| pharn-spec.md           |  37,149 |   23,000 | `## The two layers`; rationale in `## --quick` and Steps 2–5                                                                                                                                                                                                                                                                                       |
| pharn-review.md         |  36,909 |   25,000 | Step 0's "why no setter" rationale; rationale in Steps 1–7 — Step 3b's carve-out stays byte for byte (THREAT-MODEL cites it)                                                                                                                                                                                                                       |
| pharn-build.md          |  36,583 |   22,000 | `## The two layers`; rationale in Steps 0–5                                                                                                                                                                                                                                                                                                        |
| pharn-grill.md          |  35,075 |   22,000 | `## The two layers`; rationale in Steps 1–4 and `## Finding output`                                                                                                                                                                                                                                                                                |
| pharn-plan.md           |  34,722 |   21,000 | `## The two layers`; rationale in Steps 1–4c                                                                                                                                                                                                                                                                                                       |
| pharn-test.md           |  24,904 |   19,000 | rationale in Steps 0–B                                                                                                                                                                                                                                                                                                                             |
| pharn-regress.md        |  19,683 |   19,000 | description only, plus the "PRODUCT command" blockquote (D9)                                                                                                                                                                                                                                                                                       |
| pharn-verify.md         |  18,418 |   17,500 | description only, plus the "PRODUCT command" blockquote (D9)                                                                                                                                                                                                                                                                                       |
| **total**               | 519,744 |  336,500 | expected nearer 320 KB: the pinned text in every command is far below its target                                                                                                                                                                                                                                                                   |

### 6. Pins — the strategy

1. **Default: every pinned literal survives byte for byte, in the file and section where its test reads it.** No re-pointing is planned. The probe shows the tail audits are unpinned, so the claims block needs none.
2. **Headings and order stay.** No heading's text changes, version tag included, and sections keep their relative order. "Exactly once" pins stay exactly once, and no pinned literal is newly quoted before the occurrence a first-occurrence pin reads (G7's rule, applied to every command).
3. **A pinned sentence that is only rationale is kept anyway**, unless it is false or dead. Then, and only then, the build re-points its test **inside `.dev/floor/command-hygiene.test.mjs`** (the one test file in `## Files`) to the equivalent claims-block text, keeps its mutation control red (L60), and lists the re-point in `BUILD.md` with before and after. A pin in any other test file is never re-pointed: its text stays.
4. **The build runs the whole suite after each wave** (Build procedure). A red test means text was removed that should have stayed: the build restores it.
5. **Survival check (scratch, advisory evidence).** After each wave, a scratch script compares each command with its base (`git show db3a81f:<file>`) and prints:
   - every fenced-block line of the base present in the new file with the same multiplicity;
   - every base heading present, except the tail-audit and two-layers headings this plan removes (listed);
   - every `blocked: <id>` and stuck-point id of `pharn-loop.md` present;
   - **(grill G3) every base line outside a fence that carries a decision token — `STOP`, `HALT`, `**Non-zero`, `→`, an exit-code phrase (`` exit `<n>` `` or `` `<n>` — ``), `S<n>` (a row id), `ask the human`, `hand to the human`, `never`, `only` — present verbatim in the new file**, or listed with its disposition: moved to the claims block (quoted there), rationale (the owner named), or restored. The token list is a heuristic, not a proof: an instruction with none of the tokens is covered by the editing rule and the review alone.

   Any other exception is restored or listed in `BUILD.md` with a reason (expected: none). The script and its output stay under `.pharn/pharn-dev-build/`; `BUILD.md` quotes the output, and records per command the lines kept and removed in each wave, so the review can read the deletions wave by wave (grill G12).

### 7. The budget test (`.dev/floor/command-hygiene.test.mjs`, a new section)

- **What is budgeted: both** — each command's file bytes (what the platform inserts as the prompt), and each description's bytes (what every session carries).
- **The data, one closed table:** `COMMAND_BYTE_CEILINGS = { "pharn-build.md": …, … }`, eleven entries, and `DESCRIPTION_MAX_BYTES = 250`.
- **Ceilings are measured, with stated headroom:** after the slim, ceiling = the file's measured bytes + 10%, rounded up to the next multiple of 512. The header states the rule and that raising a ceiling is a deliberate, visible diff in the PR that needs it. `BUILD.md` lists each command's absolute headroom in bytes (grill G9: about 7 KB for an orchestrator, close to the +12% growth A9 flagged, so a reviewer sees what can pass without a ceiling change).
- **Rules, each over the whole set (L29, L52):**
  - **R1, closure (L34, L36):** the product commands on disk — `.claude/commands/pharn-*.md` minus `pharn-dev-*` — equal the table's keys: non-empty and counted, no command without an entry, no entry without a file;
  - **R2, body:** each file's `Buffer.byteLength`, measured after folding `\r\n` to `\n` (so a CRLF checkout measures what the repository holds — the `hash-doc.mjs` precedent), is at most its ceiling;
  - **R3, description:** each description, read from the frontmatter block as one double-quoted scalar (a description the reader cannot parse fails the rule), is at most 250 UTF-8 bytes;
  - **R4, no claim vocabulary:** no description matches `/\b(FLOOR|ADVISORY)\b|NEVER means|\(P[0-7]\)/`;
  - **R5, the claims block:** each command has exactly one heading line starting `## What you may claim`, counted outside fenced blocks (the suite already parses fences — `fencedBlocks`).
- **Controls, one per property (L60):**
  - R2 fails on the real body plus the bytes that put it one over its ceiling;
  - R3 fails on a 251-byte value and passes a 250-byte one;
  - R4 fails on today's `pharn-review.md` description, carried as a literal fixture;
  - R5 fails on the real body with its block's heading removed, and on one with the heading doubled;
  - R1 fails on the table missing one key and on the table with an extra key.
- **Bounds (P0), in its header:** it bounds bytes and vocabulary, never meaning; a paraphrased claim ("ensures", "guarantees") passes R4; R5 proves the block exists, never that it is complete or true; the dev commands are outside it (D8).

### 8. Success measure — before, expected after, and the token estimate

- **Bytes:** before 519,744 B in the bodies and 22,786 B in the descriptions; expected about 320–336 KB (−35 to −38%) and about 2.0 KB (−91%). `BUILD.md` records the measured value per command and per description.
- **Per session, every session of a user's project (ESTIMATE).** In this session's listing the product descriptions display 12,376 characters: seven cut at 1,535, `/pharn-regress` and `/pharn-review` shown whole, `/pharn-test` and `/pharn-memory-promote` not shown. After: about 2,000, all eleven shown whole. At about 4 characters per token, roughly 2,600 fewer tokens on every request of every session, read from cache after the first — and two commands regain their "when to use" text.
- **Per request of a PHARN run (ESTIMATE).**
  - `/pharn-ship`: its own body sheds about 54–61 KB. The inline stages whose bodies join its context add their savings for the rest of the run (`/pharn-spec` about 14–17 KB; regress and verify about 1.5 KB each). That is up to roughly 17–20K fewer cache-read tokens per orchestrator request once its inline stages have run.
  - `/pharn-loop`: about 40–47 KB, roughly 10–12K tokens per request. Each iteration's inline regress and verify add their smaller savings again, because a re-invoked command's body enters the context again.
  - A routed stage's agent saves its own command's delta on each of its requests (for example `/pharn-build`, about 14–17 KB).
  - At the roadmap's weights, a cache-read token costs a tenth of an input token.
- **Bound (P0, `LIMITS.md §1c`).** Every token figure here is an estimate from bytes; the measured runtime cost is the real number, and M3, measured by the maintainer in their own project after `pharn update`, is the success measure. PHARN reads no transcript to claim a saving.

### 9. Version, installer, `MIN_CLI`

- **6.28.1, a patch.** Every change corrects or clarifies bytes that already ship; no capability, command, checker, contract or frontmatter key is added, and nothing an install holds becomes invalid. The budget test is apparatus and bumps nothing by itself.
- **`MIN_CLI` stays `0.5.0`:** the same eleven files at the same paths; no new location (Discovery, "The installer").
- **An install that edited a command** keeps its edit on `pharn update` (the CLI skips a file it cannot prove pristine unless `--force` — read in `pharn-cli`'s `src/lib/update-decision.ts` at grill), so the saving reaches such a project only for the commands it did not edit.
- **Each edited command's `version:` field bumps its patch** (for example `pharn-ship.md` 0.11.0 → 0.11.1), the convention every command edit follows (grill G7).
- **`reads:` stays byte-identical in every command (grill G8).** `stage-model-routing` REVIEW A9 noted a `reads:` entry the orchestrator never opens, and `reads:` is part of the bytes a command costs, but trimming it is a separate question (a test pins one entry, `"pharn/floor/check-loop-fresh.mjs"`), named as the follow-up `reads-trim`.

## Decisions for GATE 1 (each overridable)

- **D1** — Description budget 250 bytes each, what and when only, no claim vocabulary; claims go to the claims block with a per-command mapping in `BUILD.md` (§1).
- **D2** — One `## What you may claim` block per command, in `## Guarantee audit`'s place; regress's and verify's stay as they are (§2).
- **D3** — Rationale is retired to the owners that already hold it; no contract, module, hook or trusted doc is edited, and no file is added; a bound no owner states stays as one claims-block clause (§3).
- **D4** — The mode-specific sections stay in their commands, slimmed; the on-demand move is Q1 (§4), resolved (a) at GATE 1.
- **D5** — Pins: every pinned literal survives in place; re-pointing only for a false or dead pinned sentence, only inside `command-hygiene.test.mjs`, each listed (§6).
- **D6** — The budget test as §7: both bodies and descriptions, measured ceilings with 10% headroom rounded up to 512 B, closure, a vocabulary rule, a block-presence rule, a control per property.
- **D7** — 6.28.1 (patch); `MIN_CLI` unchanged (§9).
- **D8** — The `pharn-dev-*` commands are out of scope: apparatus, whose descriptions cost this repository's sessions, not a user's. Named follow-up `dev-command-slim`.
- **D9** — The thin callers (`pharn-regress.md`, `pharn-verify.md`) get the new description and lose the "PRODUCT command" blockquote, nothing more: their bodies were slimmed in 6.23.0 and 6.26.0 and are pinned densely (`NAMED_LIMITS`, `STAGE_SCRIPT_WIRING`).
- **D10** — No stage's deterministic work moves into code here. None of the candidates is small and clear; the nearest is `/pharn-ship` Step 3a's close-out sequence (named follow-up `ship-closeout-script`).

## Amended after grill

`/pharn-dev-grill` (`GRILL.md`): Step 1b GREEN, exit 0; 12 advisory concerns, 0 blocking-severity, 5 important, 7 minor. Each is folded in place, marked "grill G<n>" at the site; no decision moved and no question was opened.

- **G1 (important)** — a description is also a model's invocation trigger, and all eleven will now be listed in full. §1 adds the rule that `/pharn-loop`, `/pharn-ship` and `/pharn-memory-promote` name the user's request as their trigger, and their drafts say so (237, 228 and 165 bytes; total 2,063).
- **G2 (important)** — §5's targets read as upper bounds, an incentive to cut instructions to hit a number. They are now estimates: the editing rule wins, and a missed target is recorded, never met by cutting.
- **G3 (important)** — the survival check covered fenced lines, headings and row ids but not prose instructions. §6 item 5 adds every line carrying a decision token, run after each wave, and the per-wave line counts.
- **G4 (important)** — the inbound sweep covered section names only; 41 shipped lines cite a command step or numbered item. §3 freezes cited and pinned numbering and pins the cite search, whose every line `BUILD.md` marks "resolves".
- **G5 (important)** — condensing a review-narrowed audit bullet can re-broaden it. §2 maps every removed audit or two-layers bullet to a claims bullet carrying its bound verbatim, an owner stating the same bound, or a duplicate.
- **G6 (minor)** — the CHANGELOG is not installed; §3 says so.
- **G7 (minor)** — each edited command's `version:` bumps its patch (§9, Build procedure).
- **G8 (minor)** — `reads:` stays byte-identical; follow-up `reads-trim` (§9, Deferred).
- **G9 (minor)** — `BUILD.md` lists each ceiling's absolute headroom; D6's 10% rule is unchanged.
- **G10 (minor)** — no reflow of a paragraph holding a pinned sentence (§3).
- **G11 (minor)** — the claims block's opening sentence names the Floor bullets, hooks included, not only "verdicts" (§2).
- **G12 (minor)** — `BUILD.md` records kept and removed lines per command per wave, for the review (§6 item 5).

## Files

- `.dev/features/slim-commands/PLAN.md` — this plan — layer dev artifact
- `.dev/features/slim-commands/BUILD.md` — NEW. The build record: measured before/after per command and per description, the ceilings and each one's absolute headroom, the description-claim mapping, the audit-bullet mapping with bounds (§2), the per-section rationale ledger (what left, which owner holds it), the inbound-cite list marked "resolves" (§3), any re-point, any missed target and why (§5), the survival-check output and the kept/removed line counts per wave, every command run with its exit code — layer dev artifact
- `.claude/commands/pharn-ship.md` — EDIT. Description, claims block, slim (§5) — layer product command
- `.claude/commands/pharn-loop.md` — EDIT. Description, claims block, slim (§5) — layer product command
- `.claude/commands/pharn-memory-promote.md` — EDIT. Description, claims block, slim (§5) — layer product command
- `.claude/commands/pharn-spec.md` — EDIT. Description, claims block, slim (§5) — layer product command
- `.claude/commands/pharn-review.md` — EDIT. Description, claims block, slim (§5) — layer product command
- `.claude/commands/pharn-build.md` — EDIT. Description, claims block, slim (§5) — layer product command
- `.claude/commands/pharn-grill.md` — EDIT. Description, claims block, slim (§5) — layer product command
- `.claude/commands/pharn-plan.md` — EDIT. Description, claims block, slim (§5) — layer product command
- `.claude/commands/pharn-test.md` — EDIT. Description, claims block, slim (§5) — layer product command
- `.claude/commands/pharn-regress.md` — EDIT. Description and the blockquote only (D9) — layer product command
- `.claude/commands/pharn-verify.md` — EDIT. Description and the blockquote only (D9) — layer product command
- `.dev/floor/command-hygiene.test.mjs` — EDIT. The budget section (§7) with its controls; any re-point allowed by §6 item 3 — layer dev tests
- `CLAUDE.md` — EDIT. One convention bullet: what a product command keeps, where its rationale lives, the budget test and how a ceiling is raised — layer repo-meta
- `README.md` — EDIT. The badge, `6.28.1` — layer repo-meta
- `CHANGELOG.md` — EDIT. `## [6.28.1]` above `## [6.28.0]` with the measured before/after — layer repo-meta
- `SKILLS_VERSION` — EDIT. `6.28.1` — layer repo-meta

### Explicitly not touched by the agent

- `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`, `LIMITS.md`, `CODEOWNERS`, `.claude/settings.json`, `.claude/settings.local.json`, the four hook scripts, `pharn.spec-template.md` — human-only, byte-identical.
- `pharn/pharn-contracts/**` (so neither of #282's two files), `pharn/floor/**`, `pharn/pharn-core/**` — owners cited, never edited (D3).
- Every test file except `.dev/floor/command-hygiene.test.mjs` — their pins stay satisfied by keeping their text (D5).
- `.claude/commands/pharn-dev-*.md` (D8), `MIN_CLI` (D7), `pharn.config.json`, the generated regions (`docs/**`, README `CURRENT-STATE`).

## Build procedure (pinned — L13, L19, L22, L44, L57)

1. `/pharn-dev-build` Step 0 as written: the setter from this PLAN, then `--anchor`.
2. **Wave 1 — descriptions and claims blocks, all eleven commands.** Write the claims blocks (nine), shorten every description, bump each edited command's `version:` patch, delete the tail audits and `## The two layers`. Then `npm test` and the survival check (§6 item 5); a red test means restore the text it reads (§6 item 4).
3. **Wave 2 — `pharn-ship.md` and `pharn-loop.md` bodies**, per §3's editing rule and §4. Then `npm test` and the survival check.
4. **Wave 3 — the other seven bodies** (§5). Then `npm test` and the survival check.
5. Run the inbound-cite search (§3) and mark each line in `BUILD.md`; quote the three survival-check outputs.
6. Measure each file and description; write `COMMAND_BYTE_CEILINGS` from the measurements (§7); write the budget section and run each control once, confirming it red.
7. `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `SKILLS_VERSION`.
8. Format only this build's files: `npx prettier --ignore-unknown --write <the written paths>` and `npx markdownlint-cli2 --no-globs --fix <the written .md paths>` — never over the tree (L57).
9. `node pharn/floor/validate.mjs .`, `npm test`, then `npm run check`; the build halts on any RED.
10. `BUILD.md` records only what was run, each with its exit code (the Files entry lists its contents).

## Contracts satisfied

- No contract changes and none is added. Each command keeps conforming to the contracts it already cites — among them `stage-exit.md` (the thin callers' exit protocol), `finding-shape.md` (the grill's and review's findings), `loop-record.md`, `ship-record.md`, `ship-briefing.md`, `cost-ledger.md`, `ac-tests.md` — and now cites them in place of restating them (P4).

## Evals and tests to write (P1)

- No capability, so no eval.
- The budget section (§7): R1–R5, each over the full set, with one control per property.
- Every existing suite passes unchanged except where §6 item 3 re-points a pin inside `command-hygiene.test.mjs`, each such re-point with its control still red.

## Guarantee audit (P0)

- "Every product command stays within its byte ceiling, and every description within 250 bytes" → **floor: enum/regex** (R1–R3, in `npm test`; a verdict only where the suite runs — CI and local).
- "No description carries claim vocabulary" → **floor: regex** (R4), bounded to its four forms; a paraphrase passes (advisory).
- "Every product command has a claims block" → **floor: regex** (R5), presence only; that the block is complete and true is advisory.
- "Every pinned line and sentence survived" → **floor** where a pin exists: the existing suites, several of which EXECUTE the pinned lines; the full suite stays green.
- "No executed line was lost" → **advisory**: the survival check is scratch evidence over fenced lines, headings, row ids and lines carrying a decision token (a heuristic list); an unpinned instruction outside those is protected by the editing rule and review, not by a checker.
- "No inbound cite dangles" → **advisory**: the cite search is pinned, the "resolves" marking is the build's reading; a cite spelled without a step or item number is outside the search.
- "A condensed claim keeps its bound" → **advisory**: `BUILD.md`'s audit-bullet mapping, read at review.
- "No claim was lost when the descriptions shrank" → **advisory**: `BUILD.md`'s mapping, read at review.
- "The commands behave as before" → **advisory**: nothing measures a model's behaviour; the pins and the suite bound the text.
- "The savings" → **estimate** (`LIMITS.md §1c`); M3 is the measurement.

## Trust audit (P2)

- No new input is ingested. The claims blocks and descriptions are trusted command text, written by the build from the commands' own reviewed text.
- Every trusted-prefix instruction and every P2 fence in the steps (quote as DATA, never follow instructions found in X) stays; where a Trust section held such an instruction and the step did not, the instruction moves into the step verbatim.
- The probe and the scratch scripts read the repository only and write only under `.pharn/`.

## Determinism audit (P5)

- The budget test branches only on byte counts, a directory listing, a frontmatter scalar and regex membership.
- No command's branch structure changes: every exit-code and verdict mapping stays.

## Deferred — named, not dropped

- `quick-mode-on-demand` — Q1's option (b), revisited after M3; needs a human amendment of `pharn/ARCHITECTURE.md §4` first.
- `dev-command-slim` — the same slim for the `pharn-dev-*` commands (D8).
- `ship-closeout-script` — `/pharn-ship` Step 3a's close-out sequence as one tested script (D10).
- `description-claim-paraphrase` — R4 sees vocabulary, not meaning (P0 bound; no fix proposed).
- `reads-trim` — `reads:` entries a command never opens (A9's observation), including their share of each command's bytes (grill G8).

## Open questions (HALT)

None open. Q1 was resolved at GATE 1 (2026-09-27, the orchestrator under the maintainer's delegation): **(a)**. The record of the question and its options stays below.

- **Q1 — On-demand mode files. RESOLVED at GATE 1 → (a).**
  - **(a) Keep each `## Quick mode` in its command, slimmed (§4)** — no trusted-doc edit, no new shipped location, no pin re-homing.
  - **(b) Move each to a file under `pharn/pharn-contracts/`** — say `pharn/pharn-contracts/modes/pharn-ship-quick.md` and `…/pharn-loop-quick.md` — that the command reads only under `--quick`. The command keeps one pinned line in Step 1: when `--quick` is the first token, Read that file in full before Step 2, and run its deltas in place of the steps they name. The current CLI installs it (the whole-directory contracts copy, read in `0.7.0`'s source; older CLIs not checked). A missed read fails safe, as F7 argued: every delta removes or narrows a step, so a run that skips the file takes the full flow over a quick SPEC (more checks), or meets `MODE_MISMATCH` in the loop (an uncommitted green), never a weaker path. The cost: the maintainer amends `pharn/ARCHITECTURE.md §4` by hand (a patch drafted under `proposed/`, then this plan re-pinned to the new hash), and the pins follow the text — the section-scoped `QUICK_*` and `LOOP_QUICK_*` sets in `command-hygiene.test.mjs` (`QUICK_SKIP_SET`, `QUICK_SCOPE_LINE`, `FIRST_TOKEN_ADVISORY`'s three `pharn-ship.md` sites, `LOOP_QUICK_HEADING`, `LOOP_QUICK_SECTION_PINS`, `LOOP_QUICK_FORBIDDEN`, the `--mode` closure) and `check-quick-scope.test.mjs`'s executed lines move from "exactly once in the command" to "exactly once in the file and zero in the command", plus a new pin that each command carries its read line exactly once. It saves a further 8–9 KB per full-run orchestrator request, in each orchestrator.
  - **(c) A new directory outside the copied surfaces** — rejected: every current CLI would install a tree missing the file, so it needs a `pharn-cli` release and a `MIN_CLI` bump first.
  - **Recommendation: (a) now; revisit (b) after M3**, if full runs still show the quick bytes as material.
