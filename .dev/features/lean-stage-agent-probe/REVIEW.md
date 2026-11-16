# REVIEW — lean-stage-agent-probe

Increment under review (trust: untrusted): `.dev/features/lean-stage-agent/MEASUREMENTS.md`,
`.dev/features/lean-stage-agent/probe/{README.md,prompt.md,read-probe.mjs}`, the `.dev/guides/product-commands.md`
pointer, the appended `.dev/features/lean-stage-agent/SHIP.md` line, and the `CHANGELOG.md` `[Unreleased]` entry.

**Floor first (P0):** `node pharn/floor/validate.mjs .` reads `FLOOR: GREEN — 37 capabilities`. Verify read `PASS` on
all 7 gates and regress read `no-regressions`. No product path changed: every file is under `.dev/` or is
`CHANGELOG.md`.

## Floor-gate findings

None.

## Advisory findings

### L-floor → P0

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/lean-stage-agent/MEASUREMENTS.md:87"
  problem: "The record generalizes from two observed tool lists to every subagent type ('does not offer them to any subagent type'); only pharn-stage and general-purpose were observed, so the quantifier is wider than the evidence (L37's class)."
  evidence: "so Claude Code `2.1.323` in this session does not offer them to any subagent type"
```

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/lean-stage-agent/MEASUREMENTS.md:89"
  problem: "'Claude Code adds it' gives a cause for `advisor` being offered; what was observed is only that it was offered to both types and is not in the definition."
  evidence: "`advisor` was offered to both types and is not in the definition: Claude Code adds it."
```

Every other claim is labelled. The fraction is called "one observation" and "not a guarantee" (§3, §7). The hook deny
is reduced to fix #7, and the Bash bypass is named (§4). The hash equality is called observed, with the standing
floor named as the test's pin (§5), which answers grill's P0 concern. The real-stage saving and AC5 are stated as not
measured or pending (§7, §8). The CHANGELOG entry carries the same bounds.

### L-eval → P1

No capability and no `rule_id` were added, so no eval is owed, and `validate` agrees. The kit's reader has no test, and
the record says so (§7 "The kit is unpinned"; README; the reader's header), which answers grill's P1 concern. I re-ran
the committed reader over the probe tree after formatting: its output was byte-identical to the relayed result.

### L-trust → P2

Transcript free text appears only as the quoted first lines of the deny message (§4, a blockquote labelled DATA), and
nothing downstream consumes it. No content in the transcripts or the scratch kit steered this review. Grill's privacy
concern is answered: a grep for the user's home path, the session id and the scratchpad prefix finds no hit in any new
or changed file. The README and the reader's header both tell the next user to generalize the reader's output.
Instruction-file content hashes are truncated to 12 hex characters, and their paths are described, not printed.

### L-axis → P3

One axis per file: the record (what was measured), the kit (how to measure), the guide pointer, and the SHIP
follow-up line. There are no sibling references. The reader imports only Node stdlib and shells the existing
`audit.mjs`, unchanged.

## Verdict

GREEN: 0 floor-gate findings and 2 minor advisory findings, both wording in `MEASUREMENTS.md` §6. They can be
corrected in a follow-up, or by the maintainer at merge; neither changes a figure.

Lesson candidate: none. The two wording findings are instances of the already-promoted L37 and L40 (a quantifier and
an attribution that go beyond the evidence). This run had no new mechanism failure.
