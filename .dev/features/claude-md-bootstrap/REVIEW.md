# REVIEW — claude-md-bootstrap

**Floor first (P0):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. `/pharn-dev-verify`
re-ran it inside a PASS verdict (`verify-report.json`). The increment adds no capability, so the L-eval lens has nothing
to bind.

The increment under review is `trust: untrusted`. Nothing in the moved text or the new lines read as an instruction to
this reviewer beyond the repo's own conventions, which are what the text is.

## Floor-gate findings (blocking)

None. No new guarantee claim lacks a floor reduction:

- the size figures are `wc -c`;
- the growth verdict is the checker's;
- the "verbatim" claim in each guide header is backed by `check-migration.mjs` (one-off, exit 0);
- the "each guide is read before its action" property is stated as an instruction, never as a guarantee.

## Advisory findings (model judgment — inform, never block)

```yaml
- type: FINDING
  rule_id: "P6"
  severity: important
  file: "CLAUDE.md:29"
  problem: "The index sends readers to versioning.md only when bumping SKILLS_VERSION/MIN_CLI or moving an installed path. The guide's own trigger also covers changing a contract or frontmatter shape that installs read, which is where the MIN_CLI 'BROKEN tree' rule matters. A planner making that change is not routed to the rule."
  evidence: "- Bumping `SKILLS_VERSION` or `MIN_CLI`, or moving an installed path: `.dev/guides/versioning.md`."
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: "CLAUDE.md:36"
  problem: "'Cite the CHANGELOG by version section, never by line number' left the root. Its two owners (versioning.md, CONTRIBUTING 'CHANGELOG entries') are reached only through the 'writing a CHANGELOG entry or opening a PR' trigger. A cite written in a module header or contract while doing other work is not covered."
  evidence: '- Writing a CHANGELOG entry or opening a PR: `CONTRIBUTING.md`, "Run the gates before you push" and "CHANGELOG entries".'
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: "CLAUDE.md:30"
  problem: "The floor-CLI trigger includes 'running', and every dev stage runs floor CLIs from pinned lines. Read literally, it routes each stage to a guide section it does not need, which turns a conditional read into a near-universal one for stage runs."
  evidence: "- Planning a change to, running or citing a floor CLI (`pharn/floor/`, `.dev/floor/`, `.claude/hooks/`): its `##`"
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: ".dev/guides/floor-gates.md:1"
  problem: "The four floor guides (134 KB) carry the old CLAUDE.md summaries of module headers and contracts verbatim. The restatement problem (L64) moved with them; it was not removed. Deduplication against the owners was not verified."
  evidence: "# Floor CLI reference — the gate runner and the regress/verify/build stage scripts"
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".dev/guides/writes-scope.md:11"
  problem: "Moved paragraphs keep deictic words written for their old place. In the guide, 'It is covered **here**' and 'this hook' rely on the added heading for their meaning, and two floor entries carry 'above' cites that were already wrong in the base (base lines 270, 1058). The floor guides' header note covers 'above/below' but not 'here'."
  evidence: "It is covered **here** instead because this hook already case-folds"
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: ".dev/guides/writes-scope.md:13"
  problem: "The first lines of two writes-scope bullets now exist in both the root and writes-scope.md (about 0.7 KB). An edit to one copy can miss the other, and an agent that reads the guide sees them twice."
  evidence: "- **Fail-closed — in a dev checkout or an unsignalled tree, always; in an installed project, only while"
```

## Lens notes

- **L-floor (P0):** the CHANGELOG entry and `MEASUREMENTS.md` keep the checker's own bound, that it models the loader
  rather than being it. They claim no quality, runtime or cost result, and they label the scenario table a static
  walkthrough. The one shipped edit (`cost-ledger.md`) removes a now-false location claim and changes no rule.
- **L-eval (P1):** no capability and no `enforces` rule_id were added. The existing pins still hold the moved
  referents: `check-bash-reconcile.test.mjs` (NON-ADVERSARIAL in `CLAUDE.md`), `check:markers` (sites re-pointed),
  `docs:check`, `check:badge` and `check:changelog`.
- **L-trust (P2):** no untrusted input is involved. The guides are not hook-protected, but neither is `CLAUDE.md`, so
  this is not a new exposure. The pointers name fixed repo paths only.
- **L-axis (P3):** each guide has one reason to change, except `floor-orchestration.md`, which groups three
  subsystems as a reference index (see GRILL). No sibling reference was added under `pharn/`.

## Proposed lesson candidate (for `/pharn-dev-ship` Step 2b — not written to canon here)

`/pharn-dev-regress` Step 1.3 says only to read the PLAN's `## Files` back-tick paths. It pins no extractor. This
run's hand-written one split on the first literal "## Files", which also appears in an Applied-lessons line. It passed
an empty `--declared`, and `scope` reported every planned file as escaped (exit 1, loud, re-run correctly). That is
L22's class (a shell technique prescribed in prose accumulates wrong implementations) in a step L22 has not reached.
The canonical `## Files` parser already exists (`set-writes-scope.cjs`).

Provenance: feature `claude-md-bootstrap`; source `.dev/features/claude-md-bootstrap/REGRESSION.md` "Run note".

## Verdict

GREEN — 0 floor findings. 6 advisory findings (1 important, 5 minor) for the human to weigh at GATE 2.
