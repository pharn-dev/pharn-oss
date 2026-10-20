# REVIEW — envelope-duplicate-keys

Floor first: `node pharn/floor/validate.mjs .` reports **GREEN** (37 capabilities). No Capability, eval or `enforces`
entry changed.

The increment is `trust: untrusted` to this review. Nothing in the diff is instruction-shaped. The only
instruction-like strings are refusal messages ("Keep one line per key"), which are output text, not directives to
the reviewer.

**Verdict: GREEN — 0 floor-gate findings, 4 advisory findings: R1 fixed, R2 and R3 accepted as stated bounds, R4
noted.**

## Floor-gate findings

None.

- **L-floor (P0).** Every new claim reduces to a membership/count test over the keys the line grammar captured
  (primitive #3), or to tested code. The closure is labelled lexical in its test header and in the CHANGELOG.
- **L-eval (P1).** Not applicable: no Capability changed. `validate` and the floor agree.
- **L-trust (P2).** No guaranteed decision reads a free-text field. A refusal prints keys (grammar
  `[A-Za-z_][\w-]*`) and counts, never a value, and the tests assert that.
- **L-axis (P3).** The helper sits in the shared core that all five readers already imported. No sibling reference
  was added.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P4
  severity: important
  file: "pharn/pharn-contracts/cost-ledger.md:301"
  problem: "The cost-ledger contract described the declared outcome and its fall-through as 'a loop ledger with no
    LOOP.md'; after this increment a LOOP.md whose envelope repeats a key also falls through, so the contract no longer
    named every input that reaches the derivation."
  evidence: "starts them again inside one iteration, and a loop ledger with no `LOOP.md` reaches this derivation."
```

**R1 — FIXED.** One sentence was added at `:301`, and `:810` now reads "a loop ledger whose `LOOP.md` is absent or
declares no single readable `decision`". The path joined `## Files` as PLAN "Amendment 1", after the build anchor, so
`reconcile` will report it as `plan-widened-after-anchor` until the epoch closes. This is recorded and accepted at
the delegated GATE 2.

```yaml
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/frontmatter-core.mjs:197"
  problem: "describeRepeats prints repeated keys verbatim; the line grammar bars control characters but not length,
    so a hostile envelope with a very long repeated key yields a very long RED line."
  evidence: "return repeated.map(({ key, count }) => `\\`${key}\\` ×${count}`).join(\", \");"
```

**R2 — accepted bound.** The output is still one line, contains no control character, and gates nothing beyond the
RED it already is. Every other refusal in these checkers prints `recordPath` unbounded too. A length cap would be
an addition with no observed trigger (P7).

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/frontmatter-core.test.mjs:316"
  problem: "The closure's comment filter is line-prefix based; a frontmatterEntries( call inside a template literal
    or a block comment's interior line not starting with '*' would be counted as a call."
  evidence: "const codeOf = (src) => src.split(\"\\n\").filter((l) => !/^\\s*(\\/\\/|\\/\\*|\\*)/.test(l))"
```

**R3 — accepted bound.** The closure is labelled LEXICAL. A false call makes the closure fail loudly (an unlisted
envelope reader), never pass quietly, so the error is in the safe direction.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/render-run-report.mjs:373"
  problem: "The non-ship derived reason is chosen by 'command is not /pharn-ship', so a ledger from any third
    emitter (none exists; check-cost-ledger closes the command set) would also read 'no LOOP.md with a single readable
    decision'."
  evidence: 'cost && cost.command === SHIP_COMMAND ? [...] : ["this run has no `LOOP.md` with a", ...]'
```

**R4 — noted.** The sentence stays true for any non-ship emitter: none writes a readable `LOOP.md` declaration the
ledger copied, or the source would be `LOOP.md`. No change.

## Proposed lesson candidate

None proposed for canon. The increment applied L29, L31 and L35 as written, and nothing recurred. A candidate about
regress/verify under heavy shared-machine load (seven timing tests red at both BASE and HEAD) is deferred in
`SHIP.md`. It is an environment note, not a mechanism failure, and does not clear L20's bar.
