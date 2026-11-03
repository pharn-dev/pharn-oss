# REVIEW — family-grammar-crlf

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked` (exit 0). Verify PASS,
regress `no-regressions` (VERIFY.md, REGRESSION.md).

Reviewed by the agent that built the increment (batch worker G4), so this is a self-review; weigh it as such. The
increment was treated as untrusted input: no instruction-looking content was found in the changed files.

**Verdict: GREEN — 0 floor-gate findings; 5 advisory findings.**

## Floor-gate findings (blocking)

None. Every guarantee the increment adds reduces to a floor primitive: the shared reader and the displaced-fence RED
are enum/regex (frontmatter-core.mjs, validate.mjs), the symlink rule is an `lstat` type test
(capability-files-core.mjs), the zero-capability INCONCLUSIVE is an integer + membership test, and each is pinned by a
test shown failing on the pre-fix modules (below). The closure tests are labelled lexical in their own comments.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:39"
  problem: 'The entry says the closure tests ''refuse an eighth copy of the fence or of the line grammar'' without saying they are lexical; a copy spelled another way (a different key class, a fence test not written as startsWith("---")) passes them.'
  evidence: "Closure tests now refuse an eighth copy of the fence or of the line grammar."
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/floor/check-config.test.mjs:199"
  problem: "The mutant run (pre-fix modules under the new tests) was executed for the five product test files only; the two .dev CRLF twins (check-config, capability-catalog-core) were reasoned to fail on the pre-fix code, not run."
  evidence: "✧ CRLF dev commands are read as their LF twins; a displaced fence reads as no model"
- type: FINDING
  rule_id: P7
  severity: minor
  file: "pharn/floor/check-model-config.mjs:250"
  problem: "A command with a displaced fence is reported as 'has no `model:`', which is true from the platform's side but does not name the cause; a reader may look for a missing key rather than a leading blank line."
  evidence: "if (!lf || lf.displaced) return {};"
- type: FINDING
  rule_id: P2
  severity: minor
  file: "pharn/floor/validate.mjs:310"
  problem: "Every validate finding renders its `file` raw, so a directory NAME carrying a newline can forge a `- [blocking]` line; the new P6/symlinked-dir finding renders a link path the same way. Pre-existing for all findings, out of this increment's scope."
  evidence: "relative(TARGET, dir)"
- type: FINDING
  rule_id: P3
  severity: minor
  file: "pharn/floor/griller-extract.mjs:134"
  problem: "On a displaced griller, count-grillers registers it while griller-extract's own fence reads kind-missing (loaded with fewer sections omitted), so the two disagree on that one input; fail-safe, and validate REDs the file."
  evidence: 'if (!text.startsWith("---")) return "kind-missing";'
```

## Lens notes

- **L-floor (P0).** Bounds are stated where the claims are made: the displaced lead is `[\s\p{Cf}]` only; a link to
  an `.md` file is still followed; a linked `pharn` root is followed (GATE 1); a capability root whose only entries
  are not `.md` stays GREEN — 0; the flush round-trip discriminates only where pipes are asynchronous.
- **L-eval (P1).** No capability or `enforces` changed. Mutant proof (scratch copy of `pharn/floor` with the seven
  touched modules reverted, new tests kept): every new ★/✧ test in validate, capability-files-core, cli-stdout-flush
  and check-model-config failed; frontmatter-core.test.mjs failed at import, and with only the consumers reverted its
  loose-family test and both closures failed. One existing test, griller-extract's "symlinked DIRECTORY" refusal,
  stopped being reachable by its old route and was moved to the linked-root route (PLAN.md "Added during build").
- **L-trust (P2).** The new findings carry fixed `problem` text and a `relative()` path; no frontmatter value or
  link target is echoed. The symlink rule removes a path by which out-of-tree bytes entered the verdict.
- **L-axis (P3).** frontmatter-core.mjs keeps one axis (reading frontmatter); `.dev` imports `pharn/floor` (the
  allowed arrow, L77); no sibling module reference added.

## Proposed lesson

None. The recurring shape here — a parity fixture that put `role:` on the one line the defect leaves intact — is
L60's (a mutant alphabet that cannot violate the property), and L60 was applied; the harness slip in the regress
runner (object-shaped eval pairs read as strings) was caught and repaired within the run and has no second
occurrence yet (L20's bar).
