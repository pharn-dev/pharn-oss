# PLAN — amend-wording-7102

- spec_content_hash: d19c3ae5ef62837c025d3dffb5e878c114e0c1d4a745caf51b4c114b9e7a8bcf
- applied_lessons: [L60, L64, L68]
- increment: 7.10.2 (PATCH) — CodeRabbit's two review points on #434. (1) `checkAmend` compares `## Intent` and
  `## Scope` without dropping trailing blank lines, while `pharn/LIMITS.md` §1d and `pharn/THREAT-MODEL.md` §5 (7.10.1)
  say the trailing blank lines are aside for all three; the check now drops them for Intent and Scope too, so the docs
  hold. (2) LIMITS §1d and the supervisor contract say a Bash `rm` of `SPEC.a1.md` is "neither prevented nor detected",
  but removing it while `SUPERVISOR.a1.json` (or any other `.a1` name) stays reads as `partial-archive`; only removing
  every `.a1` file the amend left goes undetected. Both sentences are narrowed (LIMITS by the maintainer's patch).
- layer(s): product floor (`pharn/floor/spec-amend-core.mjs`), pharn-contracts (`supervisor.md`), trusted docs
  (maintainer's patch), floor tests, repo meta (CHANGELOG, SKILLS_VERSION, README badge)
- constitution_refs: [P0, P4, P6, P7]

## Applied lessons

- L60 — the new test asserts each property it adds with a case that could break it: a trailing blank line added to
  Intent and to Scope passes, and a blank line added _inside_ Scope (not trailing) is still `scope-changed`, so the trim
  is shown to stop at the trailing run rather than ignoring blank lines everywhere.
- L64 — the bound is restated in five places (the code header, the contract's `check` and `Bounded` lines, LIMITS §1d,
  THREAT-MODEL §5, `docs/limitations.md`); each is re-read against `amendState` / `checkAmend` and corrected where its
  quantifier differs, not only the two sentences CodeRabbit quoted. THREAT-MODEL §5 and `docs/limitations.md` already
  hold once the code drops trailing blanks ("while the run's `SPEC.a1.md` stays on disk" is true), so they are left.
- L68 — the LIMITS §1d edit is the maintainer's, applied by a patch script the maintainer runs and committed before
  `/pharn-dev-build` Step 0 anchors, so reconcile never sees it inside the window.

## Files

- `pharn/floor/spec-amend-core.mjs` — `checkAmend` compares Intent and Scope through a `sameSection` helper that drops
  trailing blank lines (null-safe, both absent still equal); header comment says so — layer product floor
- `pharn/floor/spec-amend.test.mjs` — new test: trailing blank lines added to Intent and to Scope pass `checkAmend`; a
  blank line inserted inside Scope is `scope-changed` (control) — layer floor test
- `pharn/pharn-contracts/supervisor.md` — `check` line: "identical, line for line (trailing blank lines dropped)";
  `Bounded` line: a Bash `rm` of every `.a1` file is neither prevented nor detected, removing `SPEC.a1.md` alone reads as
  `partial-archive` at `status` and `begin` — layer pharn-contracts
- `CHANGELOG.md` — `[7.10.2]` `### Fixed`: both points, naming the 7.10.1 entry's two phrases it corrects (that entry is
  merged and stays as it is) — layer repo meta
- `SKILLS_VERSION` — 7.10.2 — layer repo meta
- `README.md` — badge 7.10.2 — layer repo meta

### The maintainer's patch (not written by the build)

- `pharn/LIMITS.md` §1d: "(while the run's `SPEC.a1.md` stays on disk: a Bash `rm` of it is neither prevented nor
  detected)" → "(while the run's `SPEC.a1.md` stays on disk: a Bash `rm` of every `.a1` file the amend left is neither
  prevented nor detected; removing `SPEC.a1.md` alone reads as `partial-archive`)". A Python script in the scratchpad,
  run by the maintainer, deleted after; committed as its own `docs(trusted)` commit before the build anchors.

## Contracts satisfied

- `pharn/pharn-contracts/supervisor.md`, "Amend-spec (7.10.0)" — the `check` and `Bounded` lines are brought to what
  `spec-amend-core.mjs` does (P4: the code header cites the contract; the contract states the rule once).

## Evals to write (P1)

- No Capability changes, so no eval. The checker's behavior is pinned by `spec-amend.test.mjs` (above).

## Guarantee audit (P0)

- "Intent and Scope are held line for line, trailing blank lines aside" → floor: enum-regex (`checkAmend`, pinned by the
  new test and the existing per-code refusal test).
- "removing `SPEC.a1.md` alone reads as `partial-archive`" → floor: enum-regex (`amendState`, already pinned by the
  `amendState` test's `new Set(["PLAN.a1.md"])` case; `spec-amend.mjs status/begin` route through it).
- "a Bash `rm` of every `.a1` file is neither prevented nor detected" → a stated limit (the `.a1` names are pipeline
  artifacts reconcile exempts), not a claim.
- Loosening the Intent/Scope comparison to trailing blank lines admits no content change: a trailing run of blank lines
  carries no text, and the per-code refusal test still refuses an Intent and a Scope edit.

## Trust audit (P2)

- No new input. Intent/Scope lines are untrusted SPEC text, as before; refusals still print codes only.

## Open questions (HALT)

- None.
