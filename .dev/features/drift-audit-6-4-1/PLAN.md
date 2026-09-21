# PLAN — drift-audit-6-4-1

- spec_content_hash: 83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487
- applied_lessons: [L1, L2, L7, L18, L19, L25, L26, L28, L33, L35, L36, L37, L40, L43, L46, L47, L49]
- increment: Resync the docs to what the last seven merged PRs (#218–#224) made true — retract the closed "single/one place" and "the one capability" claims at the sites #221 missed, repair the dead `README.md` cites orphaned by #166, document `check-loop-decision.mjs` in `CLAUDE.md` and `README.md`, and correct the stale `LIMITS.md` version marker — shipped as `SKILLS_VERSION` 6.4.2, with every trusted-doc byte staged as a human-applied patch.
- layer(s): pharn-contracts (one shipped contract); root trusted docs and root meta-docs; one product command; `.dev/` apparatus
- constitution_refs: [P0, P2, P4, P6, P7]

## Trigger (P7) — each item measured live this run, none asserted from memory

| #   | Site                                                                                | Defect                                                                                                                                                                                                                                                                                                                        | Evidence                                                                                                                                                                                      |
| --- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `CLAUDE.md:749`                                                                     | Asserts "the one residual". `THREAT-MODEL.md §5` retracted that in #221 and now names more than one.                                                                                                                                                                                                                          | Read `THREAT-MODEL.md:134-155` and `LIMITS.md:90-96`                                                                                                                                          |
| 2   | `pharn/pharn-contracts/finding-shape.md:125-126`                                    | "the single place the trust model is not provable on paper" — the same retracted claim, on the shipped surface.                                                                                                                                                                                                               | Read; Sweep A below                                                                                                                                                                           |
| 3   | `pharn/ARCHITECTURE.md:320`                                                         | "the one place the trust model is not provable on paper" — same claim, trusted doc.                                                                                                                                                                                                                                           | Read; Sweep A below                                                                                                                                                                           |
| 4   | `(README.md)` cite at `CLAUDE.md:749`, `ARCHITECTURE.md:321`, `THREAT-MODEL.md:150` | README has carried no mention of attempt 0 since #166 (`f7c3caa`). Before it, README pointed at `pharn/pharn-review/trust-fence/`. Predates the seven PRs; #221 re-authored `THREAT-MODEL.md:150` and kept the cite.                                                                                                          | `grep -i "attempt 0" README.md` → no hit; `git show f7c3caa^:README.md` shows the old pointer                                                                                                 |
| 5   | `CLAUDE.md:218-225`                                                                 | The `check-loop-record` block says agreement of `decision` is "never checked". True of that file; but `check-loop-decision.mjs` (6.3.0) does check it and gates the `/pharn-loop` commit, and CLAUDE.md never mentions it. `cap` is not mentioned.                                                                            | Read `check-loop-decision.mjs:1-70`, `check-loop-record.mjs:30-57`, `pharn-loop.md` Steps 6b/6c; `grep check-loop-decision CLAUDE.md` → no hit; live probe on the real record → GREEN, exit 0 |
| 6   | `LIMITS.md:342`                                                                     | Marker reads `SKILLS_VERSION 6.3.1`; §8 shipped as 6.4.1 (renumbered on merge).                                                                                                                                                                                                                                               | Read; staged patch exists and `git apply --check` exits 0 this run                                                                                                                            |
| 7   | `README.md:377-381`, `:492-493`                                                     | **Not a defect — included at the maintainer's explicit direction** (Step-1 form, "Include both"). Neither sentence is false today; both under-state (the commit gate; the installed-skill channel). Recorded as such rather than given a trigger.                                                                             | Form answer; README read at those lines                                                                                                                                                       |
| 8   | `LIMITS.md:146`                                                                     | Dead cite: "(`README.md`, the experiment agenda)". README has no experiment agenda; the agenda's home is `CLAUDE.md:743`. Same root cause as row 4 (#166). **Found by the grill's first run, not by this plan's sweep.**                                                                                                      | grep for experiment, agenda, oracle and v0.80 in `README.md` → one unrelated hit (`:76`, "not a correctness oracle"); `grep -i "experiment agenda"` over the repo, audit trails excluded      |
| 9   | `.claude/commands/pharn-review.md:210-212`                                          | Shipped product command (3.0.8, #197). A dead `(README.md, …)` cite **and** the closed quantifier "the one capability this repo's experiment agenda exists to measure", while `CLAUDE.md:748` says the agenda "targets four unknowns". Same family as rows 1–4. **Found by the grill's first run, not by this plan's sweep.** | Read `:203-222`; `git log -S"experiment agenda exists to"` → `4e64b1d` (#197); no test pins the quantifier (`command-hygiene.test.mjs` matches back-ticked lens names only)                   |

## Applied lessons

- L1 — Meta-doc sweep done: `CLAUDE.md`, `README.md`, `CHANGELOG.md` and `SKILLS_VERSION` are named in `## Files`; `docs/**` is checked by `docs:check` in verify, and no role-bearing capability file is touched.
- L2 — `finding-shape.md` is a contract: the replacement sentence adds no "enforced by" claim. The new statements about `check-loop-decision.mjs` cite a floor op that was read this run and also executed (probe on the real `LOOP.md`, exit 0).
- L7 — `## Files` equals exactly what build writes: no canon, no trusted doc, no `pharn/floor/**`. The human-only edits appear only as staged patch files.
- L18 — The exclusion block is a heading (`### Deliberately NOT in scope`), and the setter's printed path count is read against the ten declared paths.
- L19 — Every Bash step is scoped: `git apply --check`, scratch-copy substitution, and prettier/markdownlint on the edited files only. No repo-wide formatter runs, and `docs:generate` is not run (`docs:check` is).
- L25 — The new `check-loop-decision` text is re-derived from the shipped checker and `pharn-loop.md` Steps 6b/6c, not copied from a header comment. "Never checked" is re-scoped to the one file it is true of.
- L26 — Trusted-doc patches are verified at the real path: applied in a local clone of this repository at HEAD carrying the working-tree edits, with `npm run check` run there — never in a scratchpad copy.
- L28 — Continuation lines in `## Files` avoid the exclusion-cue vocabulary, and the printed count is read.
- L33 — The sweep uses the shortest invariant substrings and treats its own result as a lower bound (Sweep A, then Sweep B, then a live re-read of every hit). The grill's re-run then found two more sites of the same family, which is why this plan was amended: the lower bound was exceeded inside the increment that names the lesson.
- L35 — README and shipped-doc text points at the owner (`THREAT-MODEL.md §2/§5`, `check-loop-decision.mjs`) instead of restating it. The existing LIMITS marker patch is referenced by path, not copied into a second patch.
- L36 — Closure, not presence: after the patches apply, the same greps are re-run and every remaining hit must match a classified row of the sweep table, so a variant spelling of any member fails.
- L37 — Each quantified sentence written or kept is probed by execution over an expected-excluded member, and the exit codes are recorded (V1–V3). E7's universal was tightened after the grill showed the loop command itself contradicts it (`spec: revert failed`).
- L40 — Where a sentence attributes an outcome to a condition ("a RED decision-check means no commit"), the condition is varied: the checker is run on a GREEN and a RED record. The Step 6c commit half is command prose, and it is labelled read-not-executed.
- L43 — `check:badge` and `check:changelog` will certify that `6.4.2` agrees across stores, never that a patch bump is right. The bump is justified by listing the product-surface bytes touched, and the human applies every patch before committing.
- L46 — The floor check the maintainer deferred is recorded with its status: pending, no trigger invented. L20's second-occurrence bar is arguably met (L33's shape recurred at #221, and again in this plan's own first sweep), and the deferral is the maintainer's choice.
- L47 — Every replacement uses an open form ("not the only", "names more than this one", "the capability attempt 0 measures"). None introduces a count, and none fixes an ordinal ("first"). Separately, canon's L47 entry has no `promoted:` line (the index shows `-`); flagged to the human, not edited here.
- L49 — The Sweep declaration below states, per surface, what a checker covers, so the declaration's reliability is bounded where the next reader meets it.

## Sweep declaration (L49) — a lower bound, with its coverage stated

**Queries (shortest invariant substrings, case-insensitive), run this session over the whole repo excluding `.git` and `node_modules`:** `provable on paper`, `one residual`, `single residual`, `only residual`, `sole residual`, `the one place`, `single place`, `only place`, `verified by reasoning` (the grill re-ran this exact string), `attempt 0 targets`, `target of attempt 0`, `why **attempt 0**`, `attempt 0 is the`, `experiment agenda`, `the one capability`, `the single capability` (`attempt 0` matched with `.` for the space or hyphen). The last three were added after the grill showed the first set could not reach a sibling defect. Historical records (`.dev/features/**`, `CHANGELOG.md`) were listed separately and are not edited.

| Hit                                                                                                                                                    | Class                                                                  | Action                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------- |
| `CLAUDE.md:749`, `pharn/ARCHITECTURE.md:320`, `pharn/pharn-contracts/finding-shape.md:126`                                                             | stale closed quantifier                                                | fix (E1, E3, E4)                |
| `THREAT-MODEL.md:150`, plus the `(README.md)` cites at `CLAUDE.md:749` and `pharn/ARCHITECTURE.md:321`                                                 | dead cite (no closed quantifier at `THREAT-MODEL.md:150`)              | fix (E1, E4, E5)                |
| `LIMITS.md:146`                                                                                                                                        | dead cite to a README agenda that does not exist                       | fix (E10)                       |
| `.claude/commands/pharn-review.md:210-212`                                                                                                             | dead cite **and** closed quantifier ("the one capability … exists to") | fix (E11)                       |
| `LIMITS.md:95-96`                                                                                                                                      | already corrected in #221 ("not the only")                             | none                            |
| `THREAT-MODEL.md:145`                                                                                                                                  | quotes the retracted phrase on purpose                                 | none                            |
| `pharn/pharn-contracts/eval-format.md:167`                                                                                                             | "the target of attempt 0" — no quantifier, and true                    | none                            |
| `.claude/commands/pharn-{plan,build,grill,regress}.md`, `pharn/floor/README.md:81`, `pharn/floor/check-structural.mjs:14`                              | cite attempt 0 as "the same residual"; no quantifier                   | none                            |
| `.claude/commands/pharn-review.md:434`, `CHANGELOG.md:468`                                                                                             | "the probe the experiment agenda points at" — a concept reference      | none                            |
| `CONTRIBUTING.md:10,37,43`, `SECURITY.md:69`, `pharn/features/README.md` cites                                                                         | accurate cites to files and sections that exist                        | none                            |
| `LIMITS.md:67`, `.claude/commands/pharn-regress.md:341`, `.claude/commands/pharn-verify.md:475`, other `the one place` hits in `pharn/` and `.claude/` | **a different claim** — not examined for truth                         | out of class; stated, not swept |

**Coverage boundary (the L49 obligation).** No checker reads any sentence in this table for truth. `finding-shape.md`, `CLAUDE.md`, `README.md` and `pharn-review.md` are held to prettier and markdownlint, or to a closure test over back-ticked lens names — style and lens membership only; the four trusted docs are excluded from both. So this sweep's completeness rests on the greps alone: it is a lower bound, and the grill has already shown it can be exceeded. Two classes were swept differently. Closed-quantifier spellings and the two anchor phrases (`attempt 0`, `experiment agenda`) ran over the whole repo. Root-`README.md` cites carrying a claim were enumerated over the four trusted docs, `pharn/**`, `.claude/**`, `.dev/floor/**` (non-test), `CONTRIBUTING.md`, `SECURITY.md` and non-generated `docs/**`. **Not swept:** `.github/**`, `.dev/memory-bank/**` beyond the anchor phrases, and root config files. "The sweep found N" means N that these queries and enumerations reach.

## The edits — exact intent (constraints are what is approved; wording may be tightened at build within them)

**E1 — `CLAUDE.md:749-752`, experiment-agenda sentence.** Open form, no count, no ordinal, dead cite dropped, owners cited.

```text
external review would catch; **attempt 0 targets the free-text channel, a residual that cannot be verified by
reasoning** — whether the trust-fence holds through the finding object under real injection. `THREAT-MODEL.md §5`
and `LIMITS.md §2` own the residuals, and name more than this one. Everything else is enum-checks, hooks, and
content-hashes: either on the floor or labeled a limit.
```

**E2 — `CLAUDE.md:218-225`, the `check-loop-record` block plus a new `check-loop-decision` block.** (a) scope "never checked" to "by this checker" and point at the sibling; (b) add the optional fifth envelope field `cap`; (c) add the new entry.

```text
# RE-DERIVE a loop-record's `decision` (added 6.3.0): does it reduce, via a LIVE re-run of check-loop.mjs against the
# reports the record cites, to the token it recorded? Floor (primitive #3): shells check-loop.mjs as a CLI (spawnSync,
# never a sibling import) with the record's own `iterations` and `cap` and compares tokens. A mismatch, a missing or
# malformed report, or a NON-BLOCKED record with no `cap` (optional to check-loop-record.mjs, required here) is RED,
# fail-closed. A blocked stop (INCONCLUSIVE + a `blocked` key) never consulted check-loop.mjs and is SKIPPED, GREEN.
# Runs strictly AFTER a stop exists and gates only /pharn-loop's Step 6c commit, never the stop: a STOP_GREEN whose
# re-derivation is RED is not committed ("not committed: decision unverifiable"). BOUND, and the point: it proves the
# decision is RE-DERIVABLE from the cited reports, NOT that the reports are honest — a self-consistent forged pair
# still passes — and the ACT of running it is command prose (advisory); only its verdict is floor. Exit: 0 GREEN or
# SKIPPED · 1 RED.
node pharn/floor/check-loop-decision.mjs <LOOP.md>
```

**E3 — `pharn/pharn-contracts/finding-shape.md:125-126`** (shipped; a reason for the bump). Mirrors the wording `LIMITS.md §2` already carries, human-approved in #221: "This is **not the only** place the trust model is not provable on paper (`THREAT-MODEL.md §5` names the known ones) — it is the one attempt 0 targets."

**E4 — `pharn/ARCHITECTURE.md:320-321`** (trusted; patch). "This is **not the only** place the trust model is not provable on paper (`THREAT-MODEL.md §5` names the known ones) — it is the one **attempt 0** targets (`pharn/pharn-review/trust-fence/`)." The dead `(README.md)` cite is re-pointed to the probe itself, which is what the old README sentence pointed at before #166.

**E5 — `THREAT-MODEL.md:150`** (trusted; patch). One token: `(`README.md`)` → `(`pharn/pharn-review/trust-fence/`)`. The sentence beside it already says what attempt 0 targets; only the cite was dead.

**E6 — `LIMITS.md:342`** (trusted). The existing staged patch `.dev/features/model-routing-limit/proposed/LIMITS-version-marker.patch` (`6.3.1` → `6.4.1`; `git apply --check` exit 0 this run) is applied by the human as part of this bundle. It records the version §8 shipped under, so it does **not** become 6.4.2.

**E7 — `README.md:377-381`, the `/pharn-loop` paragraph.** "Only a green result is committed, to a new local branch, and only if its recorded decision re-derives from the reports it cites (`check-loop-decision.mjs` re-runs `check-loop.mjs` and compares); a green that does not re-derive is not committed. That proves the decision is re-derivable, not that the reports are honest — a self-consistent forged pair still passes. Every other outcome reverts the spec to `Draft`, or the run says it could not." The last clause is the open form: Step 6a's `spec: revert failed` branch contradicts a closed "every … reverts". The preceding README paragraph already states that orchestration is advisory.

**E8 — `README.md:492-493`, the prompt-injection bullet.** Append: "That includes skills you install yourself: a `.claude/skills/<name>/SKILL.md` reaches product stages as untrusted context, and a hostile one can talk a lens out of reporting a real finding, which then never reaches you. That is only partly bounded; `THREAT-MODEL.md` §2 (item 8) and §5 state it in full." It names no stage list and no lens count, so it has nothing to go stale.

**E9 — bookkeeping.** `SKILLS_VERSION` `6.4.1` → `6.4.2` (patch: corrections to bytes that already shipped; `MIN_CLI` untouched); README badge `:24`; one `CHANGELOG.md` entry at the top of the existing `### Fixed` group under `## [Unreleased]` (MD024 is `siblings_only`, so no second group), naming the human-applied half and the deferred follow-up. The product-surface bytes touched are `finding-shape.md`, `pharn-review.md`, `ARCHITECTURE.md`, `THREAT-MODEL.md` and `LIMITS.md`; `CLAUDE.md` and `README.md` are repo-meta and do not bump.

**E10 — `LIMITS.md:146`** (trusted; new patch). "…discovered by building and measuring, not by more review (`README.md`, the experiment agenda)." → "…discovered by building and measuring, not by more review." The dead parenthetical is **dropped, not re-pointed**: no trusted doc cites `CLAUDE.md` (grep this run, no hits), and pointing a trusted doc at an agent-editable file would invert the trust direction. It is a same-line replacement, so the line count is unchanged and it applies beside the E6 marker patch without an offset.

**E11 — `.claude/commands/pharn-review.md:210-212`** (shipped command; bump-triggering). "(`README.md`, `THREAT-MODEL.md §5`) — the one capability this repo's experiment agenda exists to measure." → "(`THREAT-MODEL.md §5`) — the capability attempt 0 measures." Nothing else in the passage moves: `trust-fence` stays back-ticked and the scanner-less set is untouched, so the closure test in `.dev/floor/command-hygiene.test.mjs` keeps its pin. It is run before and after.

## Files

- `CLAUDE.md` — EDIT. Two hunks: the experiment-agenda sentence (E1) and the loop-record block (E2). Repo-meta, no bump. — layer: root meta-doc
- `README.md` — EDIT. Three hunks: badge `:24` (E9), the `/pharn-loop` paragraph (E7), the prompt-injection bullet (E8). Repo-meta, no bump. — layer: root meta-doc
- `pharn/pharn-contracts/finding-shape.md` — EDIT. One sentence at `:125-126` (E3). Product surface, a reason for the bump. — layer: pharn-contracts
- `.claude/commands/pharn-review.md` — EDIT. One passage at `:210-212` (E11). Product surface, a shipped command. — layer: product `.claude/` command
- `SKILLS_VERSION` — EDIT. `6.4.1` → `6.4.2`, patch (E9). — layer: root meta
- `CHANGELOG.md` — EDIT. One entry in the existing `### Fixed` group (E9). — layer: root meta
- `.dev/features/drift-audit-6-4-1/proposed/ARCHITECTURE.md.patch` — NEW. Unified diff, one hunk at `:320-321` (E4). Human-applied. — layer: `.dev/` apparatus
- `.dev/features/drift-audit-6-4-1/proposed/THREAT-MODEL.md.patch` — NEW. Unified diff, one line at `:150` (E5). Human-applied. — layer: `.dev/` apparatus
- `.dev/features/drift-audit-6-4-1/proposed/LIMITS.md.patch` — NEW. Unified diff, one line at `:146` (E10). Human-applied. — layer: `.dev/` apparatus
- `.dev/features/drift-audit-6-4-1/proposed/APPLY.md` — NEW. The human applier's note: apply order, the ordering constraints below, and the verification record. — layer: `.dev/` apparatus

### Deliberately NOT in scope

- `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`, `LIMITS.md` — hook-denied, reached only through the staged patches
- `.dev/features/model-routing-limit/proposed/LIMITS-version-marker.patch` — referenced by path (L35), left as it is
- `.dev/floor/command-hygiene.test.mjs` — run before and after E11; its carve-out closure test is the pin, and it stays as it is
- `pharn/pharn-contracts/eval-format.md` — swept, no change: its sentence carries no quantifier
- `.dev/memory-bank/lessons-learned.md` — canon, promote path only; the L47 gap is flagged to the human
- `docs/**` — generated regions; `docs:check` runs, `docs:generate` does not
- `pharn/floor/**`, `MIN_CLI`, `pharn.config.json`, `package.json` — no change
- `.pharn/reconcile/baseline.json` — never hand-edited; the build's own `--anchor` is its only writer

## Contracts satisfied

- `finding-shape.md` — this increment corrects that contract's own residual paragraph. It stays consistent with the owners, `THREAT-MODEL.md §5` and `LIMITS.md §2`, and restates neither (P4, L35).
- `pharn/pharn-contracts/loop-record.md` — cited, not restated, for the `cap` field and the blocked-stop exemption that E2 describes (P4).

## Evals to write (P1)

None. No Capability is added or changed: `finding-shape.md` is a contract with no `role:`, `pharn-review.md` is a command outside the capability walk, and no `rule_id` is introduced. The increment's evidence is executed probes and gates (Verification plan), not eval fixtures; that is stated so the absence cannot read as an omission.

## Verification plan — executed, not read (L37, L40, L26)

- **V1 — the `check-loop-decision` claims (E2, E7).** `node --test pharn/floor/check-loop-decision.test.mjs` (its ★ cases run the GREEN, mismatch-RED, missing-report-RED, blocked-skip-GREEN, no-`cap`-RED and wrong-`cap` paths). Live probe on `pharn/features/loop-decision-integrity/LOOP.md` → exit 0 (already run this session). The stated BOUND is executed in a scratch dir outside the repo: a hand-authored report pair that genuinely reduces to green plus a `LOOP.md` claiming `STOP_GREEN` → GREEN, i.e. a self-consistent forgery passes. The `cap` split is executed with one record lacking `cap`: `check-loop-record.mjs` → GREEN, `check-loop-decision.mjs` → RED. The Step 6c commit-gating half, and Step 6a's `spec: revert failed` branch that shaped E7's wording, are command prose: read and labelled read-not-executed.
- **V2 — the installed-skills claim (E8).** `grep -l scan-installed-skills .claude/commands/*.md` names the product stages that consume the channel, and `pharn/floor/scan-installed-skills.mjs`'s header is re-read for "gates nothing". Recorded as a read plus a grep, not as a proof of what a model does with the text.
- **V3 — the patches (L26).** Exact-match substitution on a scratch copy, each `old` string asserted to occur exactly once; `git apply --check` exit 0 for each new patch and for the marker patch against the live tree. Then, in a local clone at HEAD carrying the working-tree edits, with dev dependencies linked from the live tree (no network; the tracked eslint, prettier and markdownlint configs still resolve by path there): apply every patch in APPLY.md's list, commit, run `npm run check`, and record a per-gate table showing that every gate ran, not only that the chain exited 0. `check:reconcile` is expected `NO_BASELINE`, which is GREEN by design in a fresh clone.
- **V4 — closure (L33, L36).** In that clone, re-run the sweep's queries with the strings exactly as listed. Every remaining hit must match a row of the sweep table, and no root-`README.md` cite may remain at an attempt-0 or experiment-agenda site, `LIMITS.md:146` and `pharn-review.md:211` included.
- **V5 — live-tree gates.** Prettier `--check` and markdownlint on every markdown file edited, `npm run docs:check`, `check:badge`, `check:changelog`, `node pharn/floor/validate.mjs .`, `node --test .dev/floor/command-hygiene.test.mjs` before and after E11, and the whole `npm test` with the live count recorded (never asserted from this document). The pinned test at `pharn/floor/check-bash-reconcile.test.mjs:565` must still find `non-adversarial` in both `CLAUDE.md` and `README.md`.

## Sequencing and the human hand-off — stated because nothing detects a mistake here (L43)

1. The chain (build → regress → verify → review) runs with the trusted docs **unchanged**, so the spec hash pinned above stays valid throughout.
2. At GATE 2 the human applies the patches APPLY.md lists — **not earlier**. Applying `ARCHITECTURE.md.patch` changes the spec hash, and any re-run of build afterwards would refuse with "the spec drifted".
3. Apply **every one before committing.** `SKILLS_VERSION` 6.4.2 and the CHANGELOG entry assert that the trusted-doc corrections exist; if a patch is skipped, the bump over-claims and no gate notices. The `model-routing-limit` APPLY.md records the same constraint.
4. **Commit first, then run `npm run check`.** A `git apply` is a Bash write, so `check:reconcile` reports an uncommitted change to a trusted doc as an escape. Committing makes the blob the committed one.
5. This run performs no git operation: no commit and no push.

## Guarantee audit (P0)

- "The corrected and added sentences are true" → **advisory.** Nothing reads them, and the probes are a point-in-time check at authoring, not a guarantee.
- "`SKILLS_VERSION`, the README badge and the CHANGELOG version key agree" → **floor: enum-regex** (`check-version-badge`, `check-skills-version-recorded`). Agreement only (L43): a wrong bump also passes.
- "The agent did not write the trusted docs" → **floor: hook** (`protect-trusted-paths.cjs`), on the Write/Edit/MultiEdit/NotebookEdit surface only. A Bash write bypasses it (`LIMITS.md §6`), which is why the patches are applied by a human and the reconcile gate exists.
- "The patches apply cleanly" → **floor: exit code** of `git apply --check`, at generation time. A tree that moves afterwards invalidates it, so APPLY.md says to re-run `--check`.
- "Generated doc regions are in sync" → **floor: content-hash** (`docs:check`, byte-equality) — consistency, not truth.
- "A `STOP_GREEN` whose decision fails to re-derive is not committed" (E2, E7) → **floor for the verdict** (`check-loop-decision.mjs`, primitive #3). The **act** of running it is `/pharn-loop` command prose, hence advisory. The bound is written into both sentences: re-derivable, not honest.
- "A hostile installed skill can suppress a finding, only partly bounded" (E8) → **advisory**, cited to `THREAT-MODEL.md §2` item 8 and §5, and claiming no protection.
- "The edited `pharn-review.md` passage still names exactly the scanner-less lenses" (E11) → **floor: enum-regex, run as a test** (`command-hygiene.test.mjs`, a closure test over back-ticked lens names). It pins the lens set, never the truth of the sentence around it; the sentence is advisory.

## Trust audit (P2)

Nothing untrusted steers any decision here. The plan read `.dev/features/**` audit trails, lesson canon and earlier findings as **DATA** (quoted, never followed), and no instruction-looking content was found in them. Every proceed/stop in the chain reads an exit code or a verdict enum. No new ingestion path is added, and the increment changes no guaranteed decision.

## Determinism audit (P5)

Every branch is a membership or exit-code test: sweep hits are classified against a closed table, the patches by `git apply --check`, the gates by exit codes. Bump size follows CLAUDE.md's rule (a correction to bytes that already shipped is a patch). Where judgment is irreducible — the wording of E1–E11 — the fallback is the human at GATE 1 and GATE 2.

## Open questions (HALT)

None remain. Each was put to the maintainer and resolved:

- README optional additions (E7, E8) → **"Include both."** They are in scope, recorded as direction rather than as a defect (Trigger row 7).
- A floor check for retracted-claim spellings → **"Defer."** Not built. Status for canon-readers (L46): **pending; L20's bar is arguably met; deferred at the maintainer's choice; no trigger is invented here.** A checker would need a maintained list of retracted claims (the L29/L36 cost) and its own design pass.
- Two same-family sites the grill's first run found outside the approved plan (Trigger rows 8 and 9) → **"Amend the plan to include both."** E10 and E11 are added; this plan is the amended version.

## Surfaced for the human at GATE 1 — decisions taken, and side effects

- **Amendment history.** v1 was approved at GATE 1 with eight paths. The grill's first run found two same-family sites that v1's sweep could not reach (`LIMITS.md:146`, `pharn-review.md:210-212`), and the maintainer chose "Amend". This is v2: ten paths, E10 and E11 added, E7's wording tightened to an open form, the sweep's query list corrected to the strings actually run. **It needs re-approval**, and the grill re-runs on it.
- **Decision taken, veto with "Approve with changes":** the dead cite is _re-pointed_ to `pharn/pharn-review/trust-fence/` in E4 and E5, not dropped (it is what the pre-#166 README pointed at, and it exists on disk); and E3/E4 _mirror_ the wording the maintainer already applied at `LIMITS.md:95-96` instead of draining to a bare pointer. Draining would leave fewer mirrors (L35) at the cost of a less informative sentence and a departure from wording already approved.
- **Decision taken for E10 and E11, veto the same way:** E10 _drops_ the dead parenthetical rather than re-pointing it, because no trusted doc cites `CLAUDE.md` and citing an agent-editable file from a trusted doc inverts the trust direction. E11 cites the owner, `THREAT-MODEL.md §5`, and says "the capability attempt 0 measures", a definite description that stays true if a later attempt measures something else.
- **Side effect of the chain, not of this plan's edits:** `/pharn-dev-build` Step 0 runs `reconcile-baseline.mjs --anchor`, which resets `.pharn/reconcile/baseline.json`. That clears the stale Sep 18 epoch behind today's `check:reconcile` ESCAPE (75 files, traced earlier this session to the #218–#224 pulls). It is the sanctioned writer, not a hand-edit, but it does discard that epoch's escape record. Reject this plan if you would rather keep the stale baseline as it is.
- `origin/docs/drift-audit-6.4.1` exists on the remote (empty, at `d9f2133`). This session did not push it. The branch name says 6.4.1 while the bump is 6.4.2; both are left as they are.
- Canon's L47 entry has no `promoted:` line (the lessons index shows `-`). Flagged, not edited: canon changes only through the gated promote path.
