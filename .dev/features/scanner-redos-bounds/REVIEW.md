# REVIEW — scanner-redos-bounds

Increment under review: the working-tree build on `d5453a17`, covering the ten `pharn/floor/` files, `SKILLS_VERSION`,
`CHANGELOG.md` and `README.md`. It is reviewed as `trust: untrusted`. Nothing in the reviewed files or in the probe
report addressed the reviewer as an instruction.

The review has two parts:

- the four inline lenses below;
- an **independent adversarial probe**: a subagent that took no part in the build. Its report is quoted as DATA in
  `MEASUREMENTS.md` §5.

## Floor first (P0)

`node pharn/floor/validate.mjs .` → exit 0, `FLOOR: GREEN — 37 capabilities checked`. Re-run after every fix
below.

## Floor-gate findings (blocking)

None.

## Advisory findings

### Fixed in this review round

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "pharn/floor/scan-code-n-plus-one.mjs:157"
  problem: "The build's regex chain-end scan (CHAIN_RE) overflowed V8's regex stack about two links before the query regex does, so on a ~3 MB chain the new scanner threw where 6.64.2 returned [] (slowly), contradicting the 'same output' claim on that window."
  evidence: 'probe: "a.".repeat(k) + "b", k = 1525198..1525200 — new: RangeError: Maximum call stack size exceeded; old: same regex at the same start fails cleanly'
```

Disposition: fixed. `chainEnd()` is now a plain loop, and both window inputs return `[]`. The query regex's own
overflow at about 1.53 M links is unchanged from 6.64.2 and is stated in the scanner and in the CHANGELOG bounds.
Both one-time comparisons (all tracked files; big fuzz) were re-run after the fix, with 0 differences.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/sink-span-core.mjs:20"
  problem: "Two steps the linear bound and the skip rely on were asserted without justification: why overhang scans past R cannot overlap, and that no sink starts inside another sink's match."
  evidence: "plus each target match's own overhang past `R` (a taint operator's quoted string runs to the next quote; those runs do not overlap either)"
```

Disposition: fixed. The header now gives the reason (`[^"']*` stops at the next quote of either kind) and states
precondition 3.

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/sink-span-core.mjs:90"
  problem: "Each pattern's skip limit must model the span its source uses, and nothing checked the pairing: a SPAN pattern given the `;` limit would skip past the call's `)` and drop hits, and only the differential's corpus could notice."
  evidence: "compileSinkPattern(sink, rest, limit) — `limit` is `parenSpanLimit` or `semicolonSpanLimit`, matching the span `rest` begins with"
```

Disposition: fixed. `compileSinkPattern` now throws at import when `rest` does not begin with its limit's span
source. A new test pins both real pairings as controls, plus both swapped pairings and an unknown limit.

### Not changed (advisory)

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/scan-code-injection.test.mjs:415"
  problem: "The ★ timeout tests' negative control (each '(old: killed)' shape kills 6.64.2) is a one-time measurement; the suite keeps no old scanner, so a future change that made these shapes no longer adversarial would not be noticed."
  evidence: "(old: killed) — measured once, not maintained, in .dev/features/scanner-redos-bounds/MEASUREMENTS.md"
```

Disposition: accepted as stated. Keeping a frozen 6.64.2 scanner as a spawnable CLI would put about 20 s of
deliberately killed runs into every `npm test`. The labels and MEASUREMENTS.md say this is one-time.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/scan-code-n-plus-one.test.mjs:283"
  problem: "The ★ tests use a 5 s wall-clock kill; on this shared machine the new scans took up to ~850 ms at load ~60, a ~6× margin that a much heavier load could erase, turning a timing test red without a code change."
  evidence: "const LONG_TIMEOUT_MS = 5000;"
```

Disposition: accepted. This is the same budget as the crypto suite's ★ tests. The verdict is still a membership test,
and a red terminates.

## Lens summaries

- **L-floor (P0):** every new claim carries its label in the headers and the CHANGELOG:
  - "same verdict as 6.64.2": argued and tested over a fixed corpus, never guaranteed;
  - "linear": derived and measured, never a floor claim.

  The only floor-grade verdicts are the ★ timeout tests (did the scan complete) and `validate`.

- **L-eval (P1):** no capability, rule or `rule_id` changed. The four lenses' evals are unchanged and `validate` is
  GREEN.
- **L-trust (P2):** the scanners' inputs and outputs are unchanged in shape. No new free-text field is emitted. The
  probe report was read as DATA.
- **L-axis (P3):**
  - `sink-span-core.mjs` has one axis, the sink-skip driver, and lives beside `code-scanner-cli.mjs`, which the same
    scanners already share.
  - The `SPAN` literal stays declared in each scanner, under its ✧ PIN.
  - The pairing finding above was the only cross-file coupling not already checked, and it is now checked.

## Verdict

GREEN: 0 floor-gate findings. Of 5 advisory findings, 3 are fixed and 2 are accepted as stated.

## Lesson candidate (proposed, not promoted)

A regex engine's backtrack-stack limit is part of the input domain. When a rewrite swaps one regex for another, or
adds a regex the old path did not run, the inputs on which the scanner THROWS can move, even when every input that
completes gives identical output. A differential that compares only results never sees this. Exception parity, meaning
the same inputs throw, has to be probed at the size where the engine overflows.

Source: this REVIEW's first finding; `MEASUREMENTS.md` §5. Per this batch's instructions (COMMON.md), it is recorded
in SHIP.md as `lesson: deferred` and is not promoted here.
