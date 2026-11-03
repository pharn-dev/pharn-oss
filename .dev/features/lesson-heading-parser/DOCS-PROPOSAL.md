# DOCS-PROPOSAL — lesson-heading-parser (canon L14; owner-applied, never by the agent)

Canon is human-only (`protect-trusted-paths.cjs` denies `.dev/memory-bank/**` to every non-promote scope, and this
batch never invokes a promote command). This file carries the exact text for the owner's docs script. No trusted doc
(`pharn/{CONSTITUTION,ARCHITECTURE,THREAT-MODEL,LIMITS}.md`) needs a change for this increment.

## The defect (measured, Node 24.13.1, 2026-11-03)

```text
/^P[0-7]$/.test("P2\n")                        → false
/^[a-z0-9-]+$/.test("enum-gate\n")             → false
/^[A-Za-z][\w.-]*\.md [A-Z]+-\d+$/.test("security.md SEC-1\n") → false
/^[a-z0-9-]+$/m.test("enum-gate\n")            → true   (the `m` flag is what matches before a newline)
/^P[0-7]$/.test("P2\n".trim())                 → true   (the real vector: a trim before the regex)
```

Canon L14 states the first and third are `true` (Perl/Python `$` semantics). Its remedy, guard first and then the
anchored regex, is still right, and it is load-bearing exactly where the value is trimmed first: L14's own
`RULE_ID_OK` composition calls `.trim()` before both regexes.

## Option A (recommended) — correct L14's sentence in place

`.dev/memory-bank/lessons-learned.md:422-425`, old:

```text
`isCleanScalar` / `hasControlChar` guard — never as a replacement. JavaScript `$` (without the `m` flag)
matches at end-of-string OR just before a single trailing newline, so `/^P[0-7]$/.test("P2\n") === true`
and `/^…\d+$/.test("security.md SEC-1\n") === true`. A shape regex used ALONE would re-admit a
trailing-newline control-char vector — exactly the laundering the control-char guard exists to reject.
```

new:

```text
`isCleanScalar` / `hasControlChar` guard — never as a replacement. JavaScript `$` (without the `m` flag)
matches ONLY at end of input (`/^P[0-7]$/.test("P2\n") === false`; it is Perl's and Python's `$` that also
match before a trailing newline), but a validator that `.trim()`s or line-splits BEFORE its anchored regex
re-opens the hole: `/^P[0-7]$/.test("P2\n".trim()) === true`. A shape regex alone, over a trimmed value,
would re-admit a trailing-newline control-char vector — exactly the laundering the control-char guard
exists to reject. (Corrected 2026-11-03: the original sentence stated Perl semantics; measured on Node 24.)
```

After applying: `npm run docs:generate` (L14's `~tokens` in `docs/lessons-index.md` changes), commit canon and the
index together, then `npm run docs:check` GREEN. Commit it OUTSIDE an open build epoch (L68), or the always-reconciled
canon path REDs that build's reconcile.

## Option B — a correction entry (only if the owner prefers to leave L14's bytes untouched)

The house precedent (L35 → L77) promotes a correction as a new entry through `/pharn-dev-memory-promote`. The
candidate below is filled in at GATE 2 (its `source` is this run's REVIEW.md) and validated with
`node .dev/floor/check-provenance.mjs <candidate.json> .dev/memory-bank/lessons-learned.md`; the result is recorded
under it.
