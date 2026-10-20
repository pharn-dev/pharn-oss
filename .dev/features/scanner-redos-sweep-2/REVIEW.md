# REVIEW — scanner-redos-sweep-2

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`, exit 0 (before and after
the merge of `origin/main`). Everything below is advisory.

Inputs: the four inline lenses applied by the builder, plus an **independent adversarial reviewer** (a separate
subagent, read-only on the repo, probes in its own scratchpad) that tried to break the old-vs-new equivalence and
checked every claim against the code and tests. Its report is quoted here as DATA (P2); nothing in it was followed as
an instruction, and no instruction-looking text addressed to an agent was found in the reviewed files.

## Equivalence probe (the independent reviewer)

About 750,000 old-vs-new `scanText` comparisons, both scanners, **0 divergences**: 150k random-token inputs (every call
head, try / await / JSON.parse / `.catch(`, all backtick and comment forms, CRLF, U+2028, NBSP, `é`, surrogate pairs and
a lone surrogate, indicator near-misses `Xtimeout` / `timeoutX` / `_timeout` / `$timeout`), 300k timeout-focused and
300k error-handling-focused inputs, and 34 hand-written edge cases (a `(` inside a template interior,
`` `fetch(${timeout})` ``, an escaped backtick before an indicator, `try {}await`, `try{try{}}await`,
`try {{}await x()}`). Its reading of why the arguments hold matches the code comments: the template mask writes only a
space or `\n`, so the characters at `callOpen` / `callClose` are never word characters; the stack pairing equals the
per-open depth scan; merged integer intervals `[o+1, c−1]` equal `o < p < c`; `HANDLED_RE` has no `g` flag. It
confirmed the oracle is a literal copy of HEAD's code with comments stripped and imports nothing from the scanners
(L74).

## Floor-gate findings (blocking)

None.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: "pharn/floor/scan-code-missing-error-handling.test.mjs:415"
  problem: "No ★ ReDoS row reached the old per-op loop over every try range, although both the test comment and the scanner's COST paragraph name it as a quadratic cause; a regression restoring only that loop passed all nine rows."
  evidence: "reviewer: a mutant restoring `for (const [o,c] of tryRanges)` in guarded() passed all 9 error-handling ★ rows and was KILLED at 5 s on \"try{}\".repeat(40000) + \"\\n\" + \"await x()\\n\".repeat(20000)"
  disposition: "FIXED — that shape is now a ★ row labelled (old: killed); the frozen 6.71.0 CLI was measured killed on it and the new one finishes in about 1.5 s under load (MEASUREMENTS §4)."
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/scan-code-missing-error-handling.test.mjs:419"
  problem: "The comment said the first seven shapes were quadratic in 6.71.0, but the seventh (try{}×100k then one await) was linear."
  evidence: "so the first seven shapes cost O(N²)"
  disposition: "FIXED — the comment now names which old cost each row reaches and which rows were already linear."
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/scan-code-missing-error-handling.test.mjs:423"
  problem: "The comment said the dotted-chain rows pin that AWAIT_RE gives a chain back once rather than once per start, but both rows had a single start."
  evidence: "they pin that AWAIT_RE's `[\\w$.]+` gives its chain back once, not once per start"
  disposition: "FIXED — a many-starts row was added ((await + a 40-char chain)×10k) and the comment reworded."
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/scan-code-missing-differential.test.mjs:8"
  problem: "'A fixed corpus' overstates it: the corpus reads every .mjs under pharn/floor/ at test time, so it is deterministic for a given tree, not fixed."
  evidence: "on every document of a fixed corpus"
  disposition: "FIXED — reworded in the test header, both scanner COST paragraphs and the CHANGELOG bound."
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/scan-code-missing-timeout.test.mjs:280"
  problem: "The ★ rows called themselves 'never a stopwatch', yet in practice they are a 5 s wall-clock cap with about 2× headroom under heavy load (1.1–2.7 s measured by the reviewer), which could flake on a slow runner."
  evidence: "Membership verdict (completed vs killed), never a stopwatch"
  disposition: "FIXED (wording) — both test headers and the CHANGELOG bounds now state the cap and the measured headroom. The 5 s cap and the 230–400 KB sizes are kept: they match the 6.65.1 precedent, and a smaller size would weaken the old-killed margin."
- type: FINDING
  rule_id: P7
  severity: minor
  file: "pharn/floor/scan-code-missing-error-handling.mjs:310"
  problem: "Sorting tryRanges by start is a no-op: TRY_RE.exec already yields opens in ascending order, so removing it is an equivalent mutant."
  evidence: "for (const [o, c] of [...tryRanges].sort((a, b) => a[0] - b[0]))"
  disposition: "ACCEPTED, no change — it keeps the merge correct without relying on the push order, and costs O(t log t), which the COST paragraph already states."
```

## The four lenses (builder's pass)

- **L-floor (P0):** the only guarantee-shaped statements are the ★ rows (a membership verdict under a timeout, for those
  shapes) and the unchanged detection guarantees. "Same verdict as 6.71.0" and "linear" are labelled advisory in the
  headers, the CHANGELOG and MEASUREMENTS. No finding beyond those above.
- **L-eval (P1):** no capability, rule or `rule_id` changed; `validate` is GREEN, and both lenses' eval cases run through
  old and new `scanText` in the differential. Each of the 14 negative controls names one property, and a near-miss is
  aimed at each.
- **L-trust (P2):** the masks that make both scanners injection-immune feed the same reads as before (pairing over
  `masked` for timeout, over the suppression copy for error handling; indicator and `.catch(` reads over the
  suppression copy). Two mutants pin that: "indicator starts read from `masked`" and "`.catch(` reads `masked` lines".
- **L-axis (P3):** each scanner keeps its own copy of the pairing and binary-search helpers — the family's stated
  deferred-duplication stance. The new test imports only the two `scanText` exports and writes its mutant copies to
  `os.tmpdir()`, so there is no sibling reference.

**Verdict: GREEN — 0 floor findings; 6 advisory findings, 5 fixed and 1 accepted.**

## Proposed lesson candidate (not promoted — batch rule: lessons deferred)

- A ★ timeout row pins a cost only for the slow steps its shape reaches. With several quadratic steps fixed at once,
  a row set built from the "measured shapes" can leave one step unreached, as happened here with the per-op range loop.
  Remedy: for each slow step named in the cost paragraph, restore it alone in a mutant and show some ★ row is killed by
  it — L60's per-property negative control, applied to cost instead of output. Source: this REVIEW, finding 1
  (`scan-code-missing-error-handling.test.mjs:415`).
