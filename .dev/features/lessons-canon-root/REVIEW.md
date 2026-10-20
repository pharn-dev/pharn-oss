# REVIEW — lessons-canon-root

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked` (exit 0, at build). Everything
below is advisory: four inline lenses over the built increment, read as `trust: untrusted` DATA. No instruction-looking
content was found in the reviewed files.

Verdict: **GREEN — 0 floor-gate findings, 6 advisory** (2 important, 4 minor). The two important ones and two of the
minor ones are fixed in this increment (see "Disposition").

## Floor-gate findings

None. No guarantee is claimed without a floor reduction; no capability or `rule_id` is added, so P1 has nothing new
to bind; no sibling reference crosses module roots (the new import edges are `pharn/floor/*` → `pharn/floor/canon-root.mjs`
and `.dev/floor/*` → `pharn/floor/*`, the allowed direction).

## Advisory findings

### L-floor (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: "pharn/floor/check-provenance.mjs:279"
  problem: "The exported checkProvenance() trusts its canonRoot argument; only the CLI path runs it through canon-root.mjs, so an importer can pass a root the grammar refuses (e.g. '../x') and get a target enum outside the grammar's stated set."
  evidence: "export function checkProvenance(candidatePath, canonPath, { canonRoot = DEFAULT_CANON_ROOT, ... })"
```

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/lessons-index-core.mjs:97"
  problem: "productProfile(root) likewise interpolates an unvalidated root into canonPath and into the regenerate hint the header and FIX line print; the header comment says callers pass validated roots, which is a convention, not a check."
  evidence: "export function productProfile(root = DEFAULT_CANON_ROOT) {"
```

### L-trust (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/lessons-canon-root/PLAN.md:1"
  problem: "Two pipeline-artifact edits were made through Bash (PLAN.md's GATE-1 section via python, GRILL.md's line cites via sed -i), both inside the active writes-scope and before the build anchor; and the build re-anchored once after the plan's ## Files gained pharn-memory-promote.md. None is an escape the guards would deny, but each is a write the reconcile epoch never saw."
  evidence: "re-anchored: 3034 path(s), scope 32 entr(ies)"
```

### L-axis (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/floor/check-lessons-index.mjs:51"
  problem: "The dev checker parses and renders canon twice (once through the dev buildIndex for its refusal, once inside the shared checker), and the dev generator likewise; correct, but the refusal could be read off the shared verdict instead."
  evidence: "buildIndex(targetDir);"
```

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/floor/lessons-index-core.test.mjs:267"
  problem: "The thinness closure reads top-level const/let/var/function/class declarations only; an `export { x as y }` re-export, an `export default`, or a declaration on the same line as other code would pass it."
  evidence: "function topLevelDeclarations(src) {"
```

```yaml
- type: FINDING
  rule_id: P4
  severity: minor
  file: ".dev/guides/floor-checks.md:217"
  problem: "The product check-provenance section still opens 'PRODUCT twin of check-provenance (below)' after the twin was retired."
  evidence: "# PRODUCT twin of check-provenance (below): validate a promotion candidate for a USER's memory-bank."
```

## Disposition (GATE 2, delegated)

- P0 checkProvenance root — **fix**: validate with `parseCanonRoot` inside the function (a RED line and exit 2), plus a
  test.
- P0 productProfile root — **fix**: validate a non-default root with `parseCanonRoot` and throw on refusal, plus a test.
- P2 Bash artifact edits / re-anchor — **record** in SHIP.md (orchestration deviations; no product effect).
- P3 double parse — **accept**: ~210 KB read twice in a dev-only gate; the wrapper stays free of a second verdict map.
- P3 closure blind spots — **accept, stated**: the bound is written in the test header ("reads SOURCE TEXT for
  top-level declarations"); add the `export {`/`export default` cases only if a wrapper ever needs them.
- P4 stale "twin" wording — **fix**.

## Proposed lesson candidate (for SHIP.md, deferred — not promoted in this batch)

L31 and L35 both describe the check-provenance and lessons-index dev/product pairs as copies that "cannot be merged
because a user's install ships `pharn/floor/` without `.dev/`". That reason forbids only `pharn/` → `.dev/` imports.
The allowed direction, `.dev/` → `pharn/`, was already used by every dev checker's runtime-floor import. The pairs
were merged by making the dev side a thin wrapper. Candidate: _a dependency-direction rule forbids one arrow, not both
— before keeping a copy-pair "because the install strips one side", check whether the stripped side can import the
shipped one._ Source: this REVIEW.md + PLAN.md "Applied lessons" (L35).
