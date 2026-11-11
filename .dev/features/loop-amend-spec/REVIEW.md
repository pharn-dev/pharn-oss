# REVIEW — loop-amend-spec (7.10.0)

Reviewed: the working-tree diff of `feat/loop-amend-spec` against `ddfaf751` (31 changed `## Files` paths, three of them
new), treated as `trust: untrusted` (P2).

## Step 1 — floor

- `node pharn/floor/validate.mjs .` → GREEN, re-run at review time.
- `verify-report.json` → PASS (8 gates, `reconcile` included); `regression-report.json` → no-regressions (second run;
  the first run's regression and its fix are in `REGRESSION.md`).

## Floor-gate findings

None. Each guarantee reduces to a floor primitive or is labelled advisory:

- the third decision and one amend per run: `supervisor-core.mjs` enum plus `amend-used` over `SPEC.a1.md` on disk, and
  `spec-amend.mjs begin` refusing an existing archive (enum/regex; L35);
- the append-only rule: `spec-amend-core.mjs checkAmend`, line equality over the Intent, Scope and criteria sections,
  and the archived criteria as a prefix with each id, lines and verify level kept (enum/regex);
- approval and the pin: `check-spec-approved.mjs`, reused as a CLI (content-hash);
- the commit's amend paragraph: tested `loop-closeout.mjs` over the checked amend, AC ids only;
- the report section: a tested renderer, criterion lines and the archived reason fenced;
- `/pharn-spec` cannot write the archive: its `writes:` is `SPEC.md` alone (the fix #7 hook), plus a hygiene pin that no
  command's `writes:` names an `.a1` name.

The bound on "once per run" (a Bash `rm` of `SPEC.a1.md`) and on the added criteria's correctness are stated in the
contract, the CLI header, the close part's claims, `docs/limitations.md` and the trusted docs.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/LIMITS.md:95"
  problem: "The trusted docs (LIMITS §1d, THREAT-MODEL §5) say the intent, the scope and every earlier criterion stay byte-identical; the check compares each section's lines exactly but not the `## Intent` / `## Scope` heading line's own spelling, so a heading re-cased or re-spaced passes. The contract says 'line for line', which is what holds."
  evidence: "the floor holds the intent, the scope and every earlier criterion byte-identical to the archived"
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/spec-amend.mjs:131"
  problem: "RUN-REPORT.md's `## SPEC amendment` shows the archived decision's reason after a shape read only: SUPERVISOR.a1.json is not re-checked against the archived findings and triage, unlike `## Known risk`'s live decision. It is fenced and labelled untrusted DATA, but the section does not say the reason was not re-checked."
  evidence: "function archivedReason(dir) {"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".claude/commands/pharn-loop.md:475"
  problem: "No real /pharn-loop run has taken the amend branch: the branch order, S18 and the grants are pinned by hygiene tests over the command text, and every CLI path by unit tests, but the end-to-end amend (a second spec agent, then a second front) is unmeasured until a run escalates on `spec` and the supervisor picks it."
  evidence: "| S18  | the supervisor decided `amend-spec` (`supervisor.mjs check` exits `4`) and a line of the amend branch exits non-zero"
```

## L-eval (P1)

No Capability. `spec-amend.test.mjs` drives a six-criterion templated SPEC at three verify levels and a real
`amend-spec` decision over an escalated round: a round-1 amend and an amend at the cap, every `check` refusal by code
(Intent, Scope, a removed, edited, re-levelled and reordered criterion, nothing added, a prefix break, unpinned), every
`begin` refusal (a second amend, `stop`, no decision, a partial archive, a link, a failed rename and both partial
undos), the binding test over the four artifact lists, and that no output carries SPEC text. The supervisor gains exit 4
and `amend-used`; the closeout 3 tests; the report 4; hygiene pins S18, the amend branch order and the `.a1` writes pin.
Diff coverage measured locally: 634/634 added lines.

## L-trust (P2)

Untrusted text reaches no decision: the checks read section lines and parser-built AC ids; refusals print codes and AC
ids; the commit gets AC ids and the slug; the report fences the criterion lines and the archived reason with
`quoteData`. Test fixtures carry injection-shaped criterion and Intent text and assert it never reaches output or argv.

## L-axis (P3)

One axis per file: the contract (schema), `spec-amend-core.mjs` (pure rules), `spec-amend.mjs` (I/O), the commands
(procedure). `spec-amend.mjs` imports `supervisor.mjs`'s `readSupervision`, and `loop-closeout.mjs` and
`render-run-report.mjs` import `spec-amend.mjs`'s `readAmend` — floor siblings in one layer, the pattern 7.9.0 set; no
capability-module crossing.

## Proposed lesson

None.

VERDICT: GREEN — 0 floor-gate findings, 3 advisory (all minor).
