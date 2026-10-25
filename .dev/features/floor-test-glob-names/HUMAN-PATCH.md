# HUMAN-PATCH — floor-test-glob-names (7.0.1)

`pharn/LIMITS.md` is a trusted doc: the write hook denies the agent, and CLAUDE.md forbids a Bash edit. This is the
exact edit proposed for a maintainer to apply by hand, **after `/pharn-dev-verify`** (L68), so it never lands inside the
build's anchor→verify window.

## File

`pharn/LIMITS.md`, §9 "The Acceptance-Criteria evidence is agreement, not provenance", the **Agreement, never
provenance** bullet (line 632 at 7.0.0).

## Old text

```markdown
configuration outside the project root or the runner's version (`pharn/floor/test-infra-core.mjs` states
```

## New text

```markdown
configuration outside the project root or the runner's version (`pharn/floor/ac-test-infra-core.mjs` states
```

## Reason

7.0.1 renames `pharn/floor/test-infra-core.mjs` to `pharn/floor/ac-test-infra-core.mjs`, because Node's default
`node --test` patterns match `test-*.mjs` and a bare `node --test` in an install ran it as one of the project's own
tests. The bullet's cite points at the module whose header states the full list of what the pin does not see; that
header moved with the file, unchanged. Only the path changes. The line keeps its length within Prettier's 140 columns
(verified by applying this edit in a throwaway copy of the tree and running `npm run check` there, L26).

## After applying

Commit it on its own (L68): an uncommitted trusted-doc edit REDs `npm run check`'s reconcile. Recommended: apply it on
the 7.0.1 branch before merge, so 7.0.1 never ships a trusted doc citing a module that no longer exists (GRILL.md,
documentation finding). Then no further bump is needed, and the CHANGELOG [7.0.1] sentence that lists this cite as not
covered is updated in the same PR. If it lands later, it is a patch with its own CHANGELOG entry.
