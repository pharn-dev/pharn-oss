# GRILL — loop-cost-6-73-2

Plan: `.dev/features/loop-cost-6-73-2/PLAN.md` · spec-hash: match (`2c84959c…12e`) · **Step 1b lessons declaration:
GREEN** (`check-plan-lessons.mjs` exit 0 — L19, L40, L64, L66 resolve and are referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194020 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is
  the observability griller's judgment.

## Findings

### Inline interrogation

```yaml
- type: FINDING
  rule_id: P6
  severity: important
  file: ".dev/features/loop-cost-6-73-2/PLAN.md:105"
  problem: "The ledger's token figures are copied by measure.mjs without the ledger first being checked; a ledger with coverage other than complete, or one the installed check-cost-ledger REDs, would be reported as if whole."
  evidence: "the helper copies `cost.json`'s token classes; the ledger itself is FLOOR recompute-checked by `check-cost-ledger` at emission"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/loop-cost-6-73-2/PLAN.md:64"
  problem: "Headless `claude -p` differs from the interactive sessions of every earlier run in more than the Agent call: no AskUserQuestion is reachable, so a run that would have asked a human stops or proceeds differently, and 'minutes waiting for a human' is 0 by construction rather than by measurement."
  evidence: "Headless `claude -p --permission-mode auto`, not an interactive session."
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/loop-cost-6-73-2/PLAN.md:26"
  problem: "The README's cost figure will be a two-run result for one small feature; without the feature's size beside it, a reader takes it as the cost of 'a loop'."
  evidence: 'the README''s quantifier stays "these two runs", never "a run" or "a loop"'
```

### By griller

- **a11y** — the change touches no UI. No finding.
- **architecture** — apparatus file, README and CHANGELOG only; no module, no sibling reference. Fit recognized.
- **comprehension** — the deviations section records why each departure from the request was made. Rationale
  recognized.
- **coupling** — no shared mutable state inside the repo; the one cross-run hazard (`.pharn/` and git-dir records)
  is handled by the reset and L66. Clean seams recognized.
- **documentation** — the only public surface touched is the README, and the change is itself documentation; the
  measurement file is linked from it. No finding.
- **error-handling** — the possible `measure.mjs` branch must report an absent or non-`derived` `entry` as such, never
  as zero (the helper's own "absent, never a zero" rule). Folded into the inline P6 finding's spirit; no separate
  finding.
- **i18n** — scanner clean; no user-facing text in an app. No finding.
- **migrations** — no persisted schema. No finding.
- **observability** — a measurement record, nothing operational is built. No finding.
- **performance** — no runtime code path changes. No finding.
- **privacy** — scanner clean. Transcripts hold the home path and session ids; the helper redacts the home directory
  to `~`, and the record quotes counts, sizes and ids only. No finding.
- **security** — scanner clean; no secret is read or written. No finding.
- **testability** — verification is present: L64's restatement check, and the inline P6 finding asks for a ledger check
  before the figures are used. Presence recognized.

## Verdict

Advisory only. The one deterministic stop (Step 1b) is GREEN. Three findings, none gating: check each ledger with the
installed `check-cost-ledger` before copying its figures; state in the record that headless mode makes the human-wait
figure 0 by construction; keep the feature's size beside the README figure.
