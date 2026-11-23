# Proposed `LIMITS.md` §5 — for a human to apply

`LIMITS.md` is one of the four trusted docs and is **hook-denied to the agent**
(`.claude/hooks/protect-trusted-paths.cjs:130-133`). Verified live this run:

```console
$ echo '{"tool_name":"Edit","tool_input":{"file_path":"LIMITS.md"}}' | node .claude/hooks/protect-trusted-paths.cjs
BLOCKED by PHARN floor: LIMITS.md is (or resolves to) a trusted file (CONSTITUTION P2 / fix #2).
exit=2
```

So this text is **produced, never applied** — the precedent at `.claude/commands/pharn-ship.md`
("reported, never agent-edited").

## Where it goes

**Append at the end of `LIMITS.md`, after `## 4. What "good architecture" means here`.**
**Renumber nothing.** The existing section ids are load-bearing and cited from code:
`pharn/floor/scan-installed-skills.mjs:21` cites `LIMITS.md §1a`, and
`pharn/floor/lessons-index-core.mjs:78,316` cite `§1c`. Appending a new top-level `## 5.` leaves
every existing id untouched. A new `### 1e` was deliberately **not** used: `## 1` is titled "The
four irreducible limits", and a fifth entry under it would contradict its own heading.

## The text (apply verbatim)

```markdown
***

## 5. Observability is interrogated at plan time only

The `observability` griller (`pharn/pharn-pipeline/grillers/observability/`) reads **the PLAN** and
nothing else. Its scanner, `pharn/floor/scan-plan-observability.mjs`, is one of five `scan-plan-*`
scanners; there is no `scan-code-*` counterpart, and no lens in `pharn/pharn-review/` reads code for
telemetry wiring.

The consequence, stated plainly: **a plan may declare telemetry, pass the grill, and the diff that
results may wire none — with every floor green.** Nothing downstream re-checks the promise against
the code. `/pharn-verify` re-runs the project's own gates; if the project has no telemetry test,
neither does PHARN.

Two reasons this is a limit rather than a gap awaiting a fix:

- **There is no configured sink.** `pharn.config.json` carries only model/stage settings and
  `ship.requireAttestation`; `pharn/pharn-contracts/seam-config.md` names no telemetry concept. A
  project cannot tell PHARN what its logger is, so any code-side check must hardcode a name set and
  will misread every custom sink.
- **Absence is not injection-immune the way presence is.** For a concern whose shape is _absence_, a
  scanner hit is GOOD and therefore _suppresses_ — the inverse of `scan-plan-secrets.mjs`. On code,
  masking stops a comment from suppressing, but a real dead `logger.debug()` call still does.

`pharn/floor/scan-code-swallowed-exception.mjs` is the nearest existing check and is not this: it
reads logger calls inside `catch` bodies with **inverted polarity** — logging there is evidence the
error was _swallowed_. A catch that rethrows and emits nothing is CLEAN to every check PHARN ships.

Reopens when a real failure surfaces it (P7) — a dogfood or eval run where a plan-declared signal
was absent from the built code — or when a sink becomes declarable.
```

## Apply these three lines in the SAME commit

The `LIMITS.md` append is a **product-surface** byte change (the four trusted docs are in
`CLAUDE.md`'s bump-triggering set), so it carries a **patch** bump — "a correction/clarification to
bytes that already shipped" (`CLAUDE.md`, bump-size rule). This increment deliberately did **not**
bump, because nothing it wrote is product surface; bumping ahead of the append would claim a change
that had not landed.

1. `SKILLS_VERSION` — `2.6.0` → `2.6.1`
2. `README.md` — the shields badge `pharn-2.6.0-` → `pharn-2.6.1-` (required by
   `.dev/floor/check-version-badge.mjs`, wired as `check:badge` in `npm run check` **and** as its own
   `ci.yml` step; leaving it stale is a RED in both)
3. `CHANGELOG.md` — the `[Unreleased]` entry this increment already wrote names the pending bump;
   change its "pending" wording to state that `2.6.1` landed.

Then re-run `npm run check` — it must stay exit 0.

## If you decline to apply it

Nothing in the tree is inconsistent: no bump was made, no badge moved, and the CHANGELOG entry
records the investigation and the deferral rather than asserting the append exists. Delete the
CHANGELOG entry's final paragraph and the record stands as a pure investigation.
