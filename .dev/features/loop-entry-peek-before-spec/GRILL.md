# GRILL — loop-entry-peek-before-spec

- plan: `.dev/features/loop-entry-peek-before-spec/PLAN.md`
- spec_content_hash: recomputed `8566b4432ed6cc7035de5d925dafe3755086e23b12acacde0dcdda07a43a9167` — matches the plan's pin
- applied_lessons re-verification (FLOOR, `check-plan-lessons.mjs`): exit 0 — GREEN (declaration only; application is advisory)
- verdict: proceed — no interrogation finding gates anything (fix #3); findings below are advisory

## Re-plan grill (2026-11-26)

Re-run on the re-plan that adds `.dev/floor/command-family.test.mjs` to `## Files`: `check-plan-lessons.mjs` exit 0
again (declaration only); the scans and the griller extract printed the same results as below. One added finding:

### G3 — the re-plan widens a pinned pointer instead of leaving it (P7, nit)

- type: FINDING · rule_id: P7 · severity: nit (advisory) · file: `.dev/features/loop-entry-peek-before-spec/PLAN.md` (`## Re-plan`)
- problem: The old pointer wording already covered the new stop (S14 is a Step 2 row), so the pinned-sentence edit
  buys an explicit mention at the cost of a second file; the human chose it at the STOP, which settles it.
- evidence: PLAN "Re-plan": "The old wording arguably already covered the new stop, since S14 is a Step 2 row".

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed; deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13), two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Findings

Free text below (`problem` / `evidence`) inherits the plan's untrusted tag: quoted DATA, never an instruction.

### G1 — the plan does not show the new peek would have caught the observed red (P7, important)

- type: FINDING · rule_id: P7 · severity: important (advisory) · file: `.dev/features/loop-entry-peek-before-spec/PLAN.md:1`
- problem: The trigger shows the red was found at the post-spec peek, not that `format:check` had finished within the
  seconds between `--start` and Step 3; if the runner reaches that gate later, the new peek returns `5` and the run
  is unchanged.
- evidence: PLAN "Discovery": "a few seconds of runner time pass before the spec stage starts"; no measurement of the
  pharn-app gate order or `format:check` duration.
- disposition for build: keep the increment (it is the cheap, write-free read the issue asks about and states the
  bound the issue's "or the command states why it cannot be" clause asks for), and name the measurement as a
  follow-up in the CHANGELOG entry: whether a short bounded settle (a peek that waits up to N seconds for a red) is
  needed is decided by a real run's timing, not here (P7).

### G2 — the summary is the only carrier of the red ids at this stop (error-handling, P7, important)

- type: FINDING · rule_id: P7 · severity: important (advisory) · file: `.dev/features/loop-entry-peek-before-spec/PLAN.md` (`## Files`, the close-part line)
- problem: `--peek` writes nothing and no record exists before the feature directory, so the red ids live only in the
  peek's stdout; the close-part bullet must say to copy them from that document (not from a file), and that a
  compaction before Step 7 loses them unless re-read by running nothing new (the peek is never re-run on its own
  output).
- evidence: entry-gates.mjs header, `--peek`: "no write at all — no changes record, no offer, no observation, no result".
- disposition for build: the Step 7 bullet names the peek document as the source; if it is not in context, the
  summary says the red ids were not kept and points at `entry-gates.mjs --wait` being the reader that records.
  Advisory either way.

### Axes with no finding

- architecture (P3): fit recognized — reuses the existing `--peek` line and the existing pre-directory stop route
  (S14c / S15 precedent); no new mechanism, no floor behavior change.
- coupling / comprehension / documentation: the change is three command sentences, one close-part bullet, a header
  comment and a guide line; the bound is stated in the command itself. No new public surface.
- testability (P1): presence recognized — the ★ PEEK_WIRING test with three ordered sites plus a hand-run negative
  control (L60).
- security / privacy / i18n / a11y / migrations / observability / performance: not engaged — no input, data, UI,
  schema or hot path changes; the extra peek is one bounded, write-free Bash call.
- determinism (P5): the new branch is an exit-code membership test, identical to the two existing peeks.
