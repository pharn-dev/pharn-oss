# HUMAN-PATCH — test-infra-pin-all-gates (6.66.0, audit SEC-4)

`LIMITS.md` is a trusted doc: the write hook denies the agent, and the batch rules forbid a Bash edit. This is the
exact edit proposed for a maintainer to apply by hand, outside the build's anchor→verify window (L68).

## File

`LIMITS.md`, §9 "The Acceptance-Criteria evidence is agreement, not provenance", the **Agreement, never provenance**
bullet (lines 559-563 at 6.65.1).

## Old text

```markdown
- **Agreement, never provenance.** The tests, the reporter config, the `package.json` scripts and
  `pharn.config.json` are agent-editable. `results-exit-contradiction`, the lock and the
  test-infrastructure pin NARROW a forged report and never close it: a self-consistent fabricated lock,
  stamp and results set over the live tree passes. The pin also does not see, among others, a setup file
  a config imports, configuration read from the environment, script chaining, npm's own configuration or
  the runner's version (`pharn/floor/test-infra-core.mjs` states the full list).
```

## New text

```markdown
- **Agreement, never provenance.** The tests, the reporter config, the `package.json` scripts and
  `pharn.config.json` are agent-editable. `results-exit-contradiction`, the lock and the
  test-infrastructure pin NARROW a forged report and never close it: a self-consistent fabricated lock,
  stamp and results set over the live tree passes. Since 6.66.0 the pin covers the command of every
  allowlisted gate the project has (its `package.json` script, `pre`/`post` scripts and the scripts it
  chains to), not only the AC level gates'. It DETECTS a change at `/pharn-verify`; it never prevents one,
  and by then the changed command has already run at the build gate, regress and verify. For a gate no AC
  level maps to (`lint`, `typecheck`, `build`, …) it pins the command only, never what the command reads:
  the files it names and its own configuration (`eslint.config.*`, `tsconfig.json`, a Prettier config)
  stay agent-editable. The pin also does not see, among others, a setup file a config imports,
  configuration read from the environment, a chain through another runner (`npm-run-all`, `turbo`), npm
  configuration outside the project root or the runner's version (`pharn/floor/test-infra-core.mjs` states
  the full list).
```

## Reason

- The old bullet says scripts are agent-editable but not that, before 6.66.0, every non-level gate's value
  (`scripts.lint`, `typecheck`, `build`, …) ran unpinned inside the scope `/pharn-verify` reports on (audit SEC-4).
  6.66.0 closes that for the command and leaves what the command reads open; the limit doc should state both and
  the detection-only nature.
- Two phrases are stale since 6.31.0, when the pin began reading chains and the root `.npmrc`: "script chaining"
  (the token pass follows `npm run` / `pnpm` / `yarn` / `node --run` chains; only other runners stay unread) and
  "npm's own configuration" (the root `.npmrc` is hashed; the user and global npmrc are not).
- What backs each new sentence, in `pharn/floor/test-infra-core.test.mjs`:
  - EXECUTED: "6.66.0 CLOSURE" (every allowlisted gate is pinned); "6.66.0 STATED BOUND, probed" (named files and
    configs are not pinned); the 6.31.0 STATED BOUNDS probe (another runner's chain stays unread).
  - Only STATED, header-pinned by a needle test (the sentence is present, not proven): "detection, never
    prevention". That one follows from the order of the stages (the gates run before verify's AC gate recomputes
    the pin), not from a test.

## After applying

Commit it on its own (L68): an uncommitted trusted-doc edit REDs `npm run check`'s reconcile. No `SKILLS_VERSION` bump
is needed beyond 6.66.0 if it lands in the same release; otherwise it is a patch with its own CHANGELOG entry.
