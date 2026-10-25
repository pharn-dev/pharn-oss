# PLAN — loop-6-72-cost-prep

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L11, L19, L66]
- increment: Prepare, but never run, a reproducible two-run cost measurement of `/pharn-loop` on PHARN 6.73.1 (asked: 6.72.0; see Q1) over
  pharn-starter's `billing-plan-catalog` at the 2026-10-05 run's base commit, and record the preparation in
  `.dev/measurements/loop-6.72-prep.md`.
- layer(s): build apparatus only (`.dev/measurements/`, `.dev/features/`); no product surface, no `SKILLS_VERSION` bump
- constitution_refs: [P0, P5, P6, P7]

## Applied lessons

- L11 — the readiness step runs the project's gates at the base SHA BEFORE the loop does: a gate already red at base
  would block every verify (and, in 6.72, stop the loop at entry, S14), so a base-red gate is a STOP for the human,
  never a feature defect to fix.
- L19 — `git worktree add`, `npm ci`, the global CLI install, `pharn update` and the project gates are Bash writes the
  fix #7 hooks never see. They land outside this repository (pharn-starter's worktree, the global npm prefix) and are
  declared under `## Outside this repository` below rather than presented as scoped.
- L66 — every run gets its own output directory (`~/Projects/pharn-measure/run1/`, `run2/`), and run 2 starts from a
  `git clean -fdx` tree, so run 2 can never read run 1's `.pharn/` files as its own.

## Discovery (read-only, this run)

- **Baseline SHA: `42d419cd4de63fe2c11bcf3260d3401c8c707f7b`** [R·m]. Two independent records agree:
  `pharn/features/billing-plan-catalog/cost.json` `base_sha`, and `LOOP.md` frontmatter `commit:`. The RUN-REPORT
  repeats it (`base`). The commit is `refactor(db): rename the database's last "team" names to "workspace" (A3a)
(#186)`, 2026-10-04 21:10 +0200, on pharn-starter `main`'s first-parent line. Note: `main` had already moved one
  commit (`4bce1607`, docs, 2026-10-05 00:39 +0200) before the run started at 10:38 +0200; the run's checkout had not
  pulled it. The recorded base is what the run used, so it is the baseline.
- **The feature directory is absent at the base** (`git ls-tree 42d419cd pharn/features/billing-plan-catalog` is
  empty); it first appears in `bd14d35a` (2026-10-07). `CLAUDE.md` at the base is 418,525 B (the 10-05 record measured
  418,456 B attached; the ~69 B gap is not explained here).
- **SPEC on pharn-starter `main`:** blob `bf975f39…`, 15,949 B, sha256 `0857fd21…908cae8`, `state: Draft`,
  `spec_content_hash: ""` — the run's model-approved SPEC, reverted to Draft at its stop. pharn-starter's current
  checkout is `docs/sync-positioning`, whose SPEC is byte-identical; the copy will be taken with
  `git show main:<path>` regardless.
- **The 6.35 run's transcript `f4b646c1…` is no longer on disk**, so whether `main`'s SPEC equals the SPEC the run
  wrote cannot be verified, and the run's original `/pharn-loop` description is lost. The 6.35 spec agent produced
  4,999–6,192 output tokens (RUN-REPORT / 10-05 record), consistent with writing the 230-line SPEC in-run.
- **The project's PostToolUse hook at the base is `npm run tsc`** (`.claude/settings.json`), still the broken form.
  The PreToolUse hooks there use the pre-6.31 relative form `node .claude/hooks/…`.
- **pharn-cli:** not installed globally (`pharn: command not found`); npm `latest` is `0.13.0`.

### Blocker B1 — the installer has no SHA option

pharn-cli 0.13.0's source (`~/Projects/pharn-cli`, `v0.13.0-4-g268205f0`, deps-only past the tag):
`src/lib/release.ts:47` `export type RefChoice = 'main' | 'latest';`. `main` installs the tip of pharn-oss `main`
(today `9ee54c8b`, **6.73.1**); `latest` needs a published release and pharn-oss has none, so it exits 1. No flag or
environment variable names a commit. So the prompt's "install … @ 18037dd4 with the installer's SHA option" cannot be
done as written, and the prompt forbids hand-copying.

Between 6.72.0 (`18037dd4`) and `main` there are six commits (6.72.1, 6.72.2, 6.72.3, ENF-8, 6.73.0, 6.73.1). None
changes a loop stage's command text; product changes are `loop-closeout.mjs` (bounded git calls), `check-spec.mjs`,
`spec-template-core.mjs`, `gate-run-core.mjs`, `check-bash-reconcile.mjs`, `merge-findings.mjs` (review only), and
the two write hooks (NUL path, scratchpad).

### Blocker B2 — 6.72's `/pharn-loop` never reads a pre-existing SPEC

6.72's entry is `/pharn-loop [--allow-red-entry] [--max-iter N] <increment description>` — a description, not a
feature name. S1 derives a slug, and S2 (`pharn/floor/feature-name.mjs --fresh`) takes the first of `<slug>`,
`<slug>-2`, … for which `pharn/features/<x>` does not exist — any existing entry counts as taken. So with the SPEC
copied to `pharn/features/billing-plan-catalog/SPEC.md`, `/pharn-loop billing-plan-catalog` runs as
`billing-plan-catalog-2`, and `/pharn-spec --model-approve` writes a new SPEC from the three-word description (or
stops `needs-clarification`, S6b). The copied SPEC is never read, and the protocol's copy-out paths
(`pharn/features/billing-plan-catalog/…`) and branch name (`pharn-loop/billing-plan-catalog`) would name the wrong
run.

### Anticipated (decided in readiness, after GATE 1)

- **S14 at entry.** On 2026-10-05 `build` was red at base and head. If it is still red at the base on today's
  toolchain, 6.72 stops at entry (`blocked: gates-red-at-entry`) unless `--allow-red-entry` is given. Per the prompt,
  any base-red gate unrelated to the feature is a STOP for the human.
- **`pharn update`, not `init`.** The base already carries PHARN 6.35.0, and `init --yes` refuses a re-install. An
  update keeps files the project changed unless `--force`, and never edits `.claude/settings.json`; `pharn status`
  names any settings entry 6.72 needs that is missing. Both are recorded, nothing is forced or added without the
  human.

## Files

- `.dev/measurements/loop-6.72-prep.md` — the prep record: SHA and reasoning, install result, every readiness check,
  GO/BLOCKED — apparatus
- `CHANGELOG.md` — one `[Unreleased]` entry (apparatus-only, no bump), in case this lands as a PR — repo-meta

## Outside this repository

Bash and Write targets the fix #7 hooks of this repository do not judge (L19). Each is created only after GATE 1:

- `~/Projects/pharn-starter-6.72/` — `git -C ~/Projects/pharn-starter worktree add` at the baseline SHA (detached);
  `npm ci`, the installer and the gates write inside it.
- `~/Projects/pharn-measure/reference/SPEC.md` — the byte-identical copy of `main`'s SPEC, kept OUTSIDE the
  worktree (Q2): a reference to diff each run's in-run SPEC against, never read by a run.
- `~/Projects/pharn-measure/reference/intent.md` — the SPEC's `## Intent` section body, verbatim, as the
  description the human pastes after `/pharn-loop` (Q2).
- `~/Projects/pharn-starter-6.72/RUN-PROTOCOL.md` — the human's run protocol. The path keeps the prompt's `6.72`
  name although the install is 6.73.1 (Q1); the prep file keeps `loop-6.72-prep.md` for the same reason.
- the global npm prefix — `npm i -g @pharn-dev/pharn@latest`.

## Contracts satisfied

- None. No capability, contract or floor checker changes. Labels follow `.dev/measurements/loop-wall-clock-2026-10-05.md`
  (R/S source, m/e precision, token classes separate, nothing priced); this prep record uses `S` for static readings
  of the new worktree and `R` only for figures read from the 2026-10-05 run's surviving files.

## Evals to write (P1)

- None: no capability is added.

## Guarantee audit (P0)

- "the baseline SHA is the commit the 2026-10-05 run started from" → advisory: two recorded fields agree
  (`cost.json` `base_sha`, `LOOP.md` `commit`); both were written by that run's own tooling, and nothing re-derives
  them.
- "the reference SPEC is byte-identical to `main`'s" → floor-grade comparison (content-hash: sha256 of the copy
  equals sha256 of `git show main:<path>`), recorded in the prep file.
- "the installed SKILLS_VERSION is 6.73.1" → enum/regex read of the installed `SKILLS_VERSION` file; advisory that
  every installed file is at that version (`pharn status` drift report, recorded).
- "the protocol is reproducible" → advisory. Run-to-run variance is model behaviour; the protocol only fixes the
  inputs it can (tree, SPEC bytes, PHARN version, toolchain recorded).
- "nothing was run on the loop" → advisory (agent discipline); no `/pharn-loop` is invoked by this increment.

## Trust audit (P2)

- pharn-starter files (`cost.json`, `LOOP.md`, `RUN-REPORT.md`, the SPEC) are another project's run output: values
  read from them are copied as DATA (SHAs, sizes, enum strings); free text is quoted, never followed.

## Resolved at GATE 1 (2026-10-25, by the human, via the form)

- Q1 (B1) → **install `main`'s tip (6.73.1)** with pharn-cli `latest` (`pharn update`, the base already carries
  6.35.0) and record the version. The measurement is of 6.73.1, not 6.72.0.
- Q2 (B2) → **pass the Intent, no copy.** Nothing is copied into `pharn/features/`. Each run is `/pharn-loop` followed
  by the SPEC's `## Intent` text, so the spec stage writes the SPEC in-run, as the 6.35 run's did. `main`'s SPEC is
  kept byte-identical outside the tree as a reference. The readiness check of the SPEC's shape still runs, on the
  reference copy, from inside the worktree's installed floor.
- Plan approved as amended. No open questions remain.
