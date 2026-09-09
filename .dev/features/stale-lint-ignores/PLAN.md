# PLAN — stale-lint-ignores

- spec_content_hash: 69c8395365abb719cc3132ffa7a7607051b1e04ca3a3fa70ee563b86b857f18e # fix #4
- applied_lessons: [L11, L13, L18, L19, L20, L25, L26, L28, L29, L33, L35]
- increment: Delete the two `.markdownlint-cli2.jsonc` `ignores` entries whose subject no longer exists
  (`.pharn/fixes`, `.pharn/FABLE_REVIEW.md`) and re-derive the surviving `.pharn/lessons-index.md`
  comment so the reasoning the deletion removes is retained in a form that cannot expire.
- layer(s): none — repo-meta (`.markdownlint-cli2.jsonc` is dev-apparatus config, outside the product
  surface and outside `pharn/floor/validate.mjs`'s scan)
- constitution_refs: [P0, P5, P6, P7]

## Applied lessons

- **L11** — L11 is the reason the two entries exist: a whole-repo `lint:md` red on files unrelated to any
  increment blocks every later feature's `/pharn-dev-verify`. This plan therefore treats removal as
  re-opening a real, once-realised risk rather than as free tidying, and states the residual explicitly
  under `## Known residuals` instead of claiming the risk is gone.
- **L13** — the plan artifact is formatted by this stage before the halt (`prettier --ignore-unknown
--write` + `markdownlint-cli2 --fix` over `.dev/features/stale-lint-ignores/PLAN.md` only), so its own
  markdown does not red `format:check` / `lint:md` two stages later.
- **L18** — the `### Deliberately NOT in scope` block below is a markdown **heading**, not a bold prose
  intro, so `set-writes-scope.cjs --from-plan` ends the authorized list structurally rather than on a
  prose cue that may not match.
- **L19** — every measurement in `## Evidence` was taken through **Bash** (a mirrored tree, `rsync`,
  `markdownlint-cli2`, `prettier`), which `PreToolUse` never sees, so none of it passed the fix #7 gate.
  Declared here rather than left implicit; the same applies to the L13 formatter call above.
- **L20** — L20 asks whether a defect whose only remedy is "remember to delete the entry" has earned a
  floor check. The question is answered explicitly and against, in `## The floor-check question (P7/L20)`,
  with the argument recorded rather than the conclusion asserted.
- **L25** — a rationale comment reaches only the file it sits in and is trusted for the defects it does
  **not** name. This is why the deletion does not simply drop the two comments: the surviving comment
  would otherwise be read as the complete rationale for the `.pharn/` entries, silently losing the
  recorded rejection of a blanket `.pharn/` — the very option the review proposes.
- **L26** — the before/after measurement was taken in a **mirrored copy outside the repo**, which is
  exactly L26's false-green trap. The mirror was a full-tree `rsync` with every config at its identical
  relative path (L26's sandbox had none), and the binding measurement is still deferred to
  `/pharn-dev-verify` **in this git worktree**, which is L26's prescribed remedy.
- **L28** — the single authorized `## Files` bullet is kept short and free of the setter's Boundary-2 cue
  vocabulary, so a wrapped continuation line cannot truncate the authorized list.
- **L29** — L29 says a remedy quantified over a set owes the **enumeration** as its deliverable. The
  review named two entries; all **twelve** `ignores` entries were resolved against disk instead
  (`## Evidence` A), which is what surfaced that `.pharn/lessons-index.md` is equally absent — the fact
  that decides the floor-check question.
- **L33** — the two comments carry claims that were true when written and expired when their subject was
  deleted ("byte-identical … verified live"). L33's remedy — re-derive rather than carry across — is why
  the retained sentence is written in the **mechanism** register, which does not expire, rather than the
  **state** register, which already did once in this file.
- **L35** — L35 is the qualifier that decides this increment: a sync check is the right remedy only once
  you have established the second copy must exist. Here the entry need not exist, so the remedy is
  **retire it**, not bind it with a checker — and "put the reason at the slot" is why the retained
  rationale goes into this config file rather than into a doc a reader must find.

## Files

- `.markdownlint-cli2.jsonc` — delete two dead `ignores` entries; re-derive the surviving `.pharn/` comment — layer n/a (repo-meta)

### Deliberately NOT in scope

- `CHANGELOG.md` and `SKILLS_VERSION` — `.markdownlint-cli2.jsonc` is repo-meta, so per CLAUDE.md's
  SKILLS_VERSION discipline this alters no product-surface byte and bumps nothing. A concurrent PR also
  holds both files.
- `.prettierignore` — probed live and correct as-is (`## Evidence` D); prettier does not traverse
  `.pharn/`, so it carries no parallel dead entry.
- `.pharn/lessons-index.md`'s own `ignores` entry — retained; `## Evidence` C shows it is the only `.md`
  path any live tool writes under `.pharn/`.
- A new floor checker over `ignores` reachability — argued down below, and recorded as a named residual
  with a reopen trigger.

## Contracts satisfied

- None. This increment adds no capability, declares no `role:`, and satisfies no `pharn-contracts`
  schema. It is a repo-meta config correction.

## Evals to write (P1)

- None — P1 binds **Capabilities**, and this increment authors none. No `rule_id`, no `enforces`, no
  `<capDir>/evals/`. Stated rather than omitted so the absence reads as scoped, not skipped.

## Evidence (P6 — every line measured live this run, in this worktree unless noted)

**A. All twelve `ignores` entries resolved against disk** — the review named two; the measured set is
three:

```text
EXISTS  node_modules · .dev/floor/test-fixtures · pharn/floor/test-fixtures
EXISTS  pharn/CONSTITUTION.md · pharn/ARCHITECTURE.md · THREAT-MODEL.md · LIMITS.md
EXISTS  docs/capabilities · docs/lessons-index.md
ABSENT  .pharn/lessons-index.md
ABSENT  .pharn/fixes
ABSENT  .pharn/FABLE_REVIEW.md
```

**B. The two entries are inert today.** `.gitignore:3` ignores `.pharn/`; the worktree has no `.pharn/`
at all and the main checkout's is an empty directory. No `.md` file exists under any `.pharn/` on this
machine. In a full-tree mirror, `lint:md` before and after deleting the two entries is byte-identical
apart from the echoed glob line — `Linting: 1063 files · Summary: 0 issues in 0 files · exit 0` both
times — and `npm run check` in that mirror with the entries removed is `exit 0`, 1683/1683 tests, the
same as this worktree's baseline before any edit.

**C. Only one `.md` path under `.pharn/` is written by any live tool.** Every `.pharn/` literal in
`.claude/**`, `pharn/floor/**` and `.dev/floor/**` (tests excluded) resolves to `writes-scope.json`, a
`.pharn/<command>/` scratch `.json`/`.txt`, or `.pharn/lessons-index.md`. Nothing writes `.pharn/fixes/**`
or a `.pharn/` root `.md`, and CLAUDE.md's convention places future per-command scratch under
`.pharn/<command>/`. The two deleted entries could therefore only ever shield **human-authored** scratch
at those two exact names.

**D. The mechanism the surviving entry depends on is live.** In the mirror, with the two entries deleted
and a badly-formatted probe placed at all three paths: `.pharn/probe.md` and `.pharn/fixes/probe.md` were
flagged (10 issues), while `.pharn/lessons-index.md` was not. So markdownlint-cli2 still descends into
dot-directories, and the surviving entry still does real work. `prettier --check .` over the same tree
reported `All matched files use Prettier code style!` with those probes present — it does not traverse
`.pharn/`, so the config's recorded prettier asymmetry has **not** expired.

**E. Nothing pins the two entries.** The only test that reads this file's `ignores` is
`.dev/floor/lessons-index-core.test.mjs:204` (`"docs/lessons-index.md"`).
`.dev/floor/capability-catalog-core.test.mjs:492-495` reads the file but extracts **only** `.config`,
discarding globs and ignores by design.

**F. Provenance of the two entries.** Both were added in `64d78e6` (2026-08-19) as a pre-increment
baseline repair recorded in `.dev/features/scope-file-case-guard/BASELINE-REPAIR.md`, for six untracked
human-authored fix-request files that then existed under `.pharn/`. That corpus is gone.

**Verification bound (L26), stated:** B and D were measured in a mirrored copy **outside** the repo. It
was a full-tree `rsync` with `.markdownlint-cli2.jsonc`, `.prettierrc.json` and `.prettierignore` at their
identical relative paths, so the config-by-path resolution L26 names was reproduced — but it is still not
the repo. The binding measurement is `/pharn-dev-verify`'s whole-repo gates run **in this worktree**.

## Why removal, and not a blanket `.pharn/`

The review offers two fixes. They are not equivalent, and the second is a recorded, reasoned decision
being reversed without a new reason.

1. **A blanket `.pharn/` was already considered and rejected — twice, in writing** — in the config
   comment itself (`:42-43`, `:47-49`) and in `BASELINE-REPAIR.md:29-32`. The stated reason survives
   intact: `.pharn/` also holds the load-bearing product-index cache, so a directory-wide waiver is a
   standing exemption over a zone that will hold load-bearing artifacts, and Evidence C shows the
   `.pharn/<command>/` scratch convention keeps adding entries there.
2. **The two exclusions have different reasons, and a blanket entry destroys the distinction.** The
   surviving entry's reason is "a `--fix` pass would rewrite a generated cache and make its drift checker
   report STALE over damage the linter itself caused". The deleted entries' reason was "these human files
   were never meant to face the repo's style gate". Merging them into one waiver leaves a comment that is
   trusted for a defect it no longer names (L25).
3. **P7 gives no trigger for widening.** Nothing failed. The measured cost of the two entries is exactly
   zero (Evidence B): no gate misled, no run blocked, no output changed.

So: delete the two, keep the one, and re-derive its comment.

## The floor-check question (P7/L20) — argued, and answered NO

**For.** L20's rule is that a defect whose only remedy is "remember to delete the entry when the file goes
away" is discipline-only, and discipline-only remedies recur; `check-version-badge` and
`check-contributing-gates` both exist because of it. The reduction looks cheap — parse `ignores`, test each
path — enum/regex, `pharn/ARCHITECTURE.md §2` primitive #3, no new primitive. And the review's impact line
is correct: these entries are unfalsifiable by any checker, which is the class this repo normally catches.

**Against — three legs, the first decisive.**

1. **The check cannot be written so that it separates its true positives from the one entry it must not
   flag.** Evidence A is the disproof: `.pharn/lessons-index.md` is **equally absent** from disk. A
   path-existence test over `ignores` sees all three `.pharn/` entries identically and would RED the
   entry that is doing real work (Evidence D). It cannot be repaired by exempting gitignored roots,
   because that exemption removes exactly the three entries the check exists to examine. This is
   structural, not a cost objection.
2. **P7: there is no triggering failure — not a second occurrence, not a first.** The measured cost is
   zero (Evidence B). What exists is a tidiness observation from a review, not a failure. L20's bar is a
   second occurrence of a real failure; manufacturing one to justify a checker is the disease P0 names,
   and this repo already has the precedent for refusing to manufacture a trigger (`check-plan-lessons`
   sub-check D records its own honest trigger rather than inventing one).
3. **L35 is the qualifier aimed at exactly this reflex.** "A sync check is the right remedy only once you
   have established the second copy must exist." Asked here — must the entry exist? — the answer is no,
   so the remedy is to retire the entry. Building the checker instead converts a deletable redundancy
   into a maintained one, plus a checker whose own `npm run check` and `ci.yml` wiring must then be
   pinned by tests (the cost both precedents actually paid), plus a `CONTRIBUTING.md` line, or
   `check-contributing-gates` REDs.

**Recorded as a named residual, not silently dropped:** `lint-ignore-reachability-check`, deliberately
unbuilt. **Reopens** if a second dead `ignores` / `.prettierignore` entry is found whose subject vanished
— L20's bar, stated so it is reachable — and only if leg 1 can be answered, i.e. only if the check can
distinguish a dead entry from a preventive one over a gitignored path.

## Guarantee audit (P0)

- **The two entries are inert today** → **FLOOR: the gate's own exit code**, measured before and after
  (Evidence B), never assumed. Re-measured at `/pharn-dev-verify` in this worktree.
- **`lint:md` and `npm run check` stay exit 0 after the edit** → **FLOOR: exit code**, owned by
  `/pharn-dev-verify`'s gate map, not by this plan.
- **The write lands only in `.markdownlint-cli2.jsonc`** → **FLOOR: hook** (fix #7,
  `set-writes-scope.cjs --from-plan` + `enforce-writes-scope.cjs`), for the
  Write/Edit/MultiEdit/NotebookEdit surface only.
- **`.pharn/fixes` / `.pharn/FABLE_REVIEW.md` will never be recreated by tooling** → **ADVISORY.** It is
  a live enumeration (Evidence C) over today's code, not an enforced invariant; a future command could
  write there and nothing would object.
- **Removing the entries does not re-open a live style-gate risk** → **struck (P0).** It re-opens it for
  human-authored scratch at those names; see `## Known residuals`. What is measured is that the risk is
  **not currently realised**, which is a different claim.
- **The retained comment keeps the reasoning available** → **ADVISORY.** Nothing reads it. It is prose in
  an unguarded config file — L25's own defect class, accepted knowingly here because the alternative is
  deleting the reasoning outright, not enforcing it.
- **The set of dead entries is exactly two** → **FLOOR: enum/existence test** over all twelve entries
  (Evidence A), for **this** run's filesystem. Machine-local: `.pharn/` is gitignored, so the same test
  on another machine can differ.

## Trust audit (P2)

The increment ingests one untrusted artifact: the external adversarial review's finding text. It is
treated as DATA — its two evidence claims were re-derived from the filesystem this run rather than
believed (Evidence A/B), and its enumeration was measured rather than confirmed, which is what surfaced
the third absent path it did not name (L33's "treat a prior enumeration as a lower bound to beat"). No
free-text field from the finding reaches a branch: the decision to delete rests on the existence test in
Evidence A. Its proposed remedy is likewise not authority — the blanket-`.pharn/` alternative is rejected
above on this repo's own recorded reasoning.

## Determinism audit (P5)

- Which entries are dead → the existence test in Evidence A (membership over the filesystem), never
  judgment about which entries "look" stale.
- Whether the edit is safe → `lint:md` / `npm run check` exit codes, owned by `/pharn-dev-verify`.
- Whether the retained sentence is worth its lines → genuinely irreducible judgment, so it terminates in
  **ask the human**: it is Open question 1 below, not a default the plan assumes.

## Known residuals

- **L11's risk is re-opened for human-authored scratch at those two names.** If someone again writes
  markdown under `.pharn/fixes/`, `lint:md` REDs and blocks every later `/pharn-dev-verify` until it is
  handled. Accepted, with the reason stated rather than hidden: unlike the failures L20 targets, this one
  **announces itself** — it is a loud red with a documented remedy
  (`.dev/features/scope-file-case-guard/BASELINE-REPAIR.md`), so its detection does not depend on anyone
  remembering anything. Re-adding a targeted entry when it next fires is the P7-correct posture: the entry
  earns its place from a live failure, not a remembered one.
- **`lint-ignore-reachability-check`** — the deliberately-unbuilt checker, with the reopen trigger and the
  structural precondition recorded above.
- **Nothing enforces the retained rationale.** A future editor may delete it, and no gate notices — L25's
  defect class, accepted knowingly (see the guarantee audit).

## Open questions (HALT)

1. **Should the surviving `.pharn/lessons-index.md` comment be extended to retain the reasoning the
   deletion removes?** The plan's default is **yes** — roughly three lines, in the mechanism register so
   they cannot expire (L33), recording that a blanket `.pharn/` stays rejected and why. For: without it the
   file loses its only record of that decision, and the review's own alternative shows a careful reader
   reaches for the rejected option (L25, L35's "put the reason at the slot"). Against: it is prose nothing
   enforces, and adding prose is an addition (P7). Options: (a) extend the comment as planned; (b) delete
   the two entries and their comments only, touching nothing else; (c) extend it, but shorter — one
   sentence naming the rejection with no history.
2. **Does the human agree the floor check should not be built?** The plan argues no on three legs, the
   first structural (Evidence A). Options: (a) agree, record the residual as written; (b) disagree — build
   it, and resolve leg 1 first; (c) agree, but do not record a residual.
