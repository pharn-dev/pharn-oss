# PLAN — core-313-p4-rescore

- spec_content_hash: f058fca367fabcdfecf939dc70bfb43deaadedb1b0e810b790c4aeb156d6775d
- applied_lessons: [L64, L75, L78]
- increment: correct the CORE-112 record's grill-effort verdict after a hand re-score of `grill-medium` p4/r2 (the
  medium grill caught the planted AC-4 omission at `PLAN.md:15`, off the manifest's anchors), keep the scorer as it is
  and say why, and add a hand-check rule for a `catch-lost` reading to the probe set's README (Linear CORE-313, under
  epic CORE-293)
- layer(s): build apparatus only — `.dev/measurements/` (the record), `.dev/probes/` (the probe set's README, not a
  hashed input), repo-meta (`CHANGELOG.md` `[Unreleased]`). Nothing under `pharn/` or `.claude/`; no `.dev/floor/`
  change. No `SKILLS_VERSION` bump; `MIN_CLI` unchanged; no shipped default changes.
- constitution_refs: [P0, P2, P5, P6, P7]

## Discovery (read this run)

- `.dev/measurements/stage-model-tuning-2026-11-17.md:11` reads "grill effort high → medium: `does-not-support`, because
  one catch was lost (p4)". The same verdict is restated at `:229` (section heading), `:243-244` (catches line) and
  `:258` (Defaults row). `CHANGELOG.md:149` restates it inside the merged 2026-11-17 CORE-112 entry.
- `.dev/features/stage-model-tuning/runs/pairs/grill-medium.json`: `reading: does-not-support`, `catch_lost: 1`,
  `catch_gained: 1`, `comparable: 8`, control chain USD 13.0979, variant 11.1998.
- Re-run today, `defect-probe-score.mjs score --probe p4` over the four committed p4 variant runs: `grill-medium` r1
  `caught` (G1-1 at `PLAN.md:78`), r2 `no-anchor-match`, `grill-sonnet` r1 and r2 `caught` (G1-1 at `PLAN.md:78`).
  The CORE-90 control runs (`.dev/features/defect-probe-set/run-outputs/p4/r1`, `r2`) cite the omission at
  `PLAN.md:78` too. So 5 of the 6 p4 grill runs cite `:78`, and one cites `:15`.
- Manifest p4 (sha256 `bfbad249…9a22`, unchanged): `defect: omission`, anchors `SPEC.md:44-46` slack 1 and
  `PLAN.md:78` slack 0 (the `## Acceptance mapping` heading), `expected_disposition: replan`.
- `grill-medium/p4/r2/grill-findings.json` G1-1: `file` `pharn/features/api-key-rotation/PLAN.md:15`, severity
  `blocking`. Its `problem` names SPEC AC-4 (`DELETE /keys/:id` → 204, then `401 key_revoked`) as having no step,
  file, stored field or acceptance mapping. Its `evidence` quotes `probes/p4/PLAN.md:15` verbatim ("… a small set:
  create, list, rotate.", the route list without revoke) and says the Acceptance mapping skips AC-4.
  `grill-triage.json` disposes G1-1 `replan`, which equals the probe's `expected_disposition`.
- `.dev/probes/defect-probes/README.md:87-90` already states one omission miss class (a whole-plan absence cited at the
  plan's first line). `PLAN.md:15` is not the first line, so this is a second, unstated off-anchor case.
- `defect-probe-score.mjs:24-27` (TRUST, P2): the scorer reads only `file`, `id`, `severity` and `disposition`;
  `problem` and `evidence` are never read.

## Hand re-score (the AC 1 result, ADVISORY)

`grill-medium` p4/r2 is **caught by hand**: G1-1 names the planted defect (the uncovered AC-4), is triaged `replan`
(the expected disposition), and cites a line that carries the omission (the route list without revoke). Read with that
run as caught, the arm's catches are control 7, variant 8, none lost, one gained (p1/r2, the control's invalid triage
file). Rule 4 (`catch-lost`) no longer applies. Rule 5 holds: chain USD 13.10 → 11.20 (−14%). So the corrected
reading is **`supports-change` / `no-visible-regression-and-saving`**, by hand. The floor reading in
`runs/pairs/grill-medium.json` stays `does-not-support` / `catch-lost`, because the scorer did not change. The record
says both, and labels the corrected one advisory: it rests on reading G1-1's free text.

## Scorer decision (AC 2): do not change `defect-probe-score.mjs`

The ticket's test is "fix it only if the probe set would otherwise keep producing wrong verdicts". It would, but only
in one direction, and every fix available makes it wrong in the other direction or breaks the pre-registration:

1. **A token or text match is a trust change, not a fix.** Recognising "names the planted defect at another anchor"
   means reading `problem` / `evidence`, which are another model's free text. The scorer is built never to read them
   (P2). A catch decided from them is no longer floor (P0). It would be the same advisory class as
   `caught-at-plan`, but applied to every grill run.
2. **A new anchor is post-hoc fitting.** Adding `PLAN.md:15` to p4 changes the manifest's bytes. Both records pin
   sha256 `bfbad249…`, and the pairing reader refuses any other manifest with `--manifest-sha256`. The anchor would also
   be chosen after seeing the run that cited it. The next run can cite step 7 or step 1 instead (each also lacks the
   revoke route or field).
3. **The error the scorer makes is the conservative one.** A catch at an unlisted line scores as a miss. That can
   only move a reading towards `does-not-support`, which never changes a default. A free-text or widened rule's false
   matches move it towards `supports-change`, the direction that changes a default.
4. **Measured rate (re-scored this plan, all 24 committed p1–p4 grill runs of the three arms):** 1 of 6 p4 runs
   cites off the anchors; all 18 p1–p3 runs match an anchor (control p1/r2 matches, then fails on its triage file). Every `catch-lost`
   reading turns on single runs, so checking those runs by hand costs a few minutes per record.

**Instead,** the probe README gains a rule, stated after the existing omission-miss bullet. Before a record states
`does-not-support` / `catch-lost`, it opens each lost pair's variant run. If a finding names the planted defect and is
triaged anything but `proceed`, the record says so and reports the reading both ways (floor and by hand). This is
discipline (ADVISORY), triggered by this real failure (P7). The scorer, the manifest and their tests stay as they are.

## Follow-up (AC 3, outside the repo)

The corrected reading supports medium on the probe chain, so a separate Linear task is opened under CORE-293 (team
Core, project pharn-oss): "Decide the shipped grill effort default (high → medium) with E1 loop pairs". It covers the
change and its prerequisites: E1's loop pairs in the measured project; the served effort is recorded nowhere; and a
combined sonnet + medium grill was never measured, so the two supported arms do not compose by assumption. This
increment changes no default. The record's Defaults row cites the new task's id. The task is created at build time,
before the record is edited, so the id is real.

## Applied lessons

- L64 — every restatement of the grill-effort verdict is a new sentence, so each one is checked and corrected on its
  own: the summary line `:11`, the section heading `:229`, the catches line `:243-244` and the Defaults row `:258`. The
  CHANGELOG restatement (`:149`) is merged, so it gets a new entry.
- L75 — the sweep below lists each phrase, every hit (`path:line`) and one disposition per hit.
- L78 — dated records keep what was true when written: the merged CHANGELOG entry, the stage-model-tuning audit trail
  (`PLAN.md`, `GRILL.md`, `SHIP.md`) and `runs/pairs/grill-medium.json` (the reader's output, verbatim) are not edited.
  The record gets a dated correction section, and each corrected line points to it, so the original verdict stays
  readable.

## Sweep (L75)

Phrases: `grill-medium`, `grill effort`, `catch-lost`, `p4/r2`, `medium-effort`, `effort medium`, `does-not-support`,
plus the referent axis `stage-model-tuning` / `CORE-112`, over `.dev`, `docs`, `README.md`, `CHANGELOG.md` (excluding
the `runs/` files and `.mjs`).

- `.dev/measurements/stage-model-tuning-2026-11-17.md:11, :229, :243, :258` — edited (the verdict).
- `.dev/measurements/stage-model-tuning-2026-11-17.md:5, :69, :78, :86, :98-99, :134, :137, :145, :171` —
  still true (arm name, pre-registration, rule text, budget, spend).
- `CHANGELOG.md:149` — merged, frozen; a new `[Unreleased]` entry corrects it (L78).
- `.dev/features/stage-model-tuning/PLAN.md:22-39, :85, :175-176, :204, :216`, `GRILL.md:57-72`, `SHIP.md:14` —
  dated audit trail, pre-run, not edited (L78). None states the result.
- `.dev/probes/defect-probes/README.md:137, :159` — still true (override mechanism; the reading names).
- `.dev/guides/floor-checks.md:358, :373, :385-386` — still true (the reader's rule text).
- `.dev/measurements/defect-probes-main-7.19.0.md:73` — still true (a control p4/r2 timing row).
- `.dev/measurements/loop-baseline-2026-11-11.md:103, :389` — still true (pre-CORE-112 status).
- `.dev/features/stage-effort-routing/{PLAN.md:85,130,156,212, EFFORT-PROBE.md:60,71, SHIP.md:46}` — still true
  (they name CORE-112's effort pairs as where effort is measured, not a result).
- `.dev/features/defect-probe-set/{PLAN.md:52,299-300, REVIEW.md:28}` — still true (unrelated to the verdict).

## Files

- `.dev/measurements/stage-model-tuning-2026-11-17.md` — dated correction section (hand re-score of `grill-medium`
  p4/r2 with the G1-1 evidence, the corrected catches and reading, both readings side by side), the summary line, the
  `grill-medium` heading and catches line, the Defaults row (citing the follow-up task), and a P0 line saying the hand
  re-score is advisory — layer build apparatus
- `.dev/probes/defect-probes/README.md` — after the omission-miss bullet: the measured off-anchor case and the
  hand-check rule for a `catch-lost` reading, with why the scorer does not read free text — layer build apparatus
- `CHANGELOG.md` — one `[Unreleased]` `### Fixed` entry dated 2026-11-23 correcting the merged CORE-112 entry's
  grill-effort line — layer repo-meta

### Explicitly not touched

- `.dev/floor/defect-probe-score.mjs`, `.dev/floor/stage-model-pairs.mjs` and their tests: no scorer change (decision
  above).
- `.dev/probes/defect-probes/manifest.json` and every hashed probe input: the sha256 both records pin stays valid.
- `.dev/features/stage-model-tuning/**` (audit trail and run files, including `runs/pairs/grill-medium.json`) (L78).
- `SKILLS_VERSION`, `MIN_CLI`, every `pharn/**` and `.claude/**` file; the shipped `effort: high` on `/pharn-grill`.

## Contracts satisfied

- None. No capability, contract or floor checker changes. The record follows CORE-112's own pre-registered reading
  rules (`stage-model-tuning-2026-11-17.md` "The reading"); the hand re-score sits beside them and does not replace
  them.

## Evals to write (P1)

- None: no capability and no checker changes. The hand re-score is reproducible from committed files:
  `defect-probe-score.mjs score --probe p4` over `runs/grill-medium/p4/r2` prints `no-anchor-match` with `matched: []`,
  and G1-1's `file`, `problem` and triage line are in the committed JSON.

## Guarantee audit (P0)

- "the scorer scores `grill-medium` p4/r2 `no-anchor-match`" → floor: enum-regex (`scoreRun`), re-run this plan.
- "the floor reading of `grill-medium` is `does-not-support` / `catch-lost`" → floor: the committed reader output,
  unchanged.
- "p4/r2's G1-1 names the planted AC-4 omission, so the run is a catch" → advisory (a human-style reading of model free
  text).
- "the corrected reading is `supports-change`" → advisory: the pre-registered rule applied to a hand-scored catch.
- "chain USD 13.10 → 11.20" → floor-derived figures already in the pair JSON; USD as a price stays advisory.
- "medium effort was served" → advisory, unrecorded (the record's existing bound, restated beside the corrected
  reading).
- "the README rule prevents a wrong `catch-lost` verdict" → advisory discipline; nothing checks a record against it.

## Trust audit (P2)

- `grill-findings.json` `problem` / `evidence` (another model's output) are read **by the planner for the hand
  re-score only**. They are quoted in the record as data (paraphrased, short), never fed to a tool and never used for
  a floor decision. The scorer's trust boundary is unchanged.

## Determinism audit (P5)

- No new branch in any tool. The hand re-score is labelled advisory. The README rule's trigger (a `catch-lost`
  reading) is a membership test on the reader's output. Its judgment step (does a finding name the planted defect)
  ends in a human-readable statement that reports both readings, never a silent override.

## Open questions (HALT)

- GATE 1: approve the scorer decision (no change, README hand-check rule instead) and opening the follow-up Linear task
  under CORE-293 at build time.
