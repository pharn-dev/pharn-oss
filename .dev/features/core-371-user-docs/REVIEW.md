# REVIEW — core-371-user-docs

Floor first: `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. Verify run 2 `PASS`, regress
`no-regressions`. Everything below is advisory.

Reviewed: the diff of `docs/limitations.md`, `docs/pipeline.md`, `CONTRIBUTING.md`, `SECURITY.md`,
`pharn/floor/README.md`, `CHANGELOG.md` `[7.25.2]`, `SKILLS_VERSION`, the README badge and `pharn-install.json`
against `origin/main` 98996b7f, treated as untrusted. No instruction-looking content in the reviewed text.

## L-floor → P0

Each corrected sentence was re-checked against its source this run, not against the plan's own wording:

- F5: `/pharn-ship` runs `reconcile-baseline.mjs --check-epoch` in `pharn-ship-stages.md` right after the base capture
  that follows spec approval, and STOPs before `/pharn-plan`. `/pharn-loop` runs it at Step 1a. The new clause
  ("stops before its plan") holds for both.
- F3 / F4: `check-ac-types.mjs --timeout-ms 170000` (`pharn-test.md:212`); an unmeasured gate is a `NOTE`, never a
  refusal (`ac-types-core.mjs:32`). The bullet labels the code list as set membership that is wrong both ways and
  cites the module that states the bound, so no guarantee is claimed beyond the checker.
- F8: `head-reuse-offer.mjs` (6.34.0) publishes the HEAD stamp only for an open `/pharn-loop` or `/pharn-ship` marker,
  matching "in a `/pharn-ship` or `/pharn-loop` run".
- F9: the canon exception is described as the hook's own rule (a promotion-origin scope naming one canon file), and
  the run-state subtrees as `RUN_STATE_SUBTREES`. Both are floor (hook), described as such.

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "docs/limitations.md:157"
  problem: "The pharn-cli 0.18.3 floor is a fact about another repository, read once from its v0.21.5 tarball; nothing
    here re-checks it."
  evidence: "A `supervise` entry of your own needs pharn-cli 0.18.3 or newer"
```

That is the same class as the `triage` / 0.18.1 sentence beside it, which was already stated this way. The CHANGELOG
entry names the bound.

## L-eval → P1

No capability, `rule_id` or checker changes; no eval is owed. The floor agrees (GREEN).

## L-trust → P2

No finding object is emitted or changed. The external inputs (`gh api` output and the pharn-cli source) were read as
data, and no decision gates on them.

## L-axis → P3

Each file changes for its own reason: one doc per audience, plus the version files. No module reference is added.

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: "CHANGELOG.md:51"
  problem: "The [7.25.2] section also carries #489's format-fix entry under `### Fixed`. That is the move CONTRIBUTING
    requires, but it puts an unrelated test-file fix in this increment's release section."
  evidence: "- 2026-11-25: **`main`'s `npm run format:check` went red after the code-scanning autofix commits"
```

Required by the CHANGELOG rule (a bump moves every `[Unreleased]` entry); recorded so a reader of 7.25.2 knows why.

## Verdict

GREEN — 0 floor-gate findings, 2 advisory (minor). Not a judgment that the increment is good; that is GATE 2.

## Lesson candidate

None. The one surprise was environmental: verify run 1 was red on a file that `main`'s code-scanning autofix commits
had left unformatted. That is a first occurrence, and the remedy (a format fix on `main`, then re-running the stage)
already exists, so L20's bar is not met.
