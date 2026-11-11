# REVIEW — loop-s16-rerun-notes

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Everything below is advisory
judgment over the diff (10 files), which is treated as `trust: untrusted`; nothing in it read as an instruction.

## Floor-gate findings

None. No guarantee is claimed without a floor reduction, no Capability or `rule_id` is added (so no eval binding is
owed, and `validate` agrees), and no sibling reference is introduced.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/guides/floor-checks.md:410"
  problem: "The rewritten comment line runs to about 170 characters while its neighbours wrap near 120, so the guide's fenced block reads unevenly; prettier and markdownlint leave fenced text alone, so no gate flags it."
  evidence: "# key that is not its file stem, `pharn-test.md`, so the reverse pass tests the map's FILE names), a DIFFERENT filename prefix, and a DIFFERENT fresh-install posture. The DISTINCT"
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-loop.md:786"
  problem: "The by-hand route sentence describes other commands' behaviour (`/pharn-spec` resuming a Draft, `/pharn-ship` resuming through it) as plain fact; it is accurate to their current text but is advisory description, and nothing pins it if those commands change."
  evidence: "or `/pharn-ship` naming the same feature, whose `/pharn-spec` resumes the existing SPEC"
```

## Lens notes

- **L-floor (P0).** The re-run sentence restates S2, which is floor where it holds (`feature-name.mjs --fresh`). The
  `docs/limitations.md` sentence describes `check-model-config.mjs agreement`, an equality check, and labels nothing as
  a guarantee. The new hygiene test pins the text's presence and nothing more; its three controls (L60) show each
  asserted sentence, removed, is reported.
- **L-eval (P1).** No Capability, no `enforces`; nothing owed. The count corrections use open forms (L47), so no new
  number can expire.
- **L-trust (P2).** The two quoted grill findings stay in the plan and grill log as DATA; the built files carry none of
  their text.
- **L-axis (P3).** The prose pin is a separate test (the grill's P3 point applied). Each file changes for one reason;
  the `pharn.config.json` edit touches only the `_models_stages_note` string, no key or value.
- **Dated record kept (L78).** `.claude/hooks/writes-scope-release.test.cjs:112` and
  `.dev/floor/command-hygiene.test.mjs:5379` say "eleven" about the state at 6.24.0 and 6.70.0; both were true then and
  are left as written.

## Lesson candidate

None. The one recurring shape in this run, a count sweep run in one spelling (`GRILL.md` finding 1), is exactly
`L33`'s remedy (a), caught here by the grill and fixed by changing the counts' form; it adds no new mechanism.

**Verdict: GREEN — 0 floor-gate findings, 2 minor advisory findings.**
