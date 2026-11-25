# GRILL — core-383-archive-check

Plan: `.dev/features/core-383-archive-check/PLAN.md` · spec-hash check: MATCH
(`8566b4432ed6cc7035de5d925dafe3755086e23b12acacde0dcdda07a43a9167`) · Step 1b lessons-declaration verdict (FLOOR):
GREEN — `applied_lessons: L41, L67, L68, L85, L62, L34`, all 6 ids resolve and are referenced in the plan body
(`check-plan-lessons.mjs` exit 0).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194044 B of griller files, 99396 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding
is not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the observability griller's judgment.

## Findings

### error-handling / performance

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/core-383-archive-check/PLAN.md:49"
  problem: "Reading `git archive` with execFileSync's default 1 MiB maxBuffer turns any real archive (43 MB today) into an exit-2 'unusable input', and an archive over 128 MiB into an exit 2 instead of the TOO_LARGE_EXTRACTED RED the plan promises."
  evidence: "`archiveTar(repo, ref)` runs `git archive --format=tar --prefix=pharn-oss-<full sha>/ <ref>` (argv array, no shell) and returns the bytes."
```

### architecture (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/core-383-archive-check/PLAN.md:47"
  problem: "One file holds two models that change for different reasons — how codeload builds the archive (git archive, root prefix) and how pharn-cli judges it (the extractor port); acceptable as one checker, but the header should name both axes so a CLI change and a codeload change are each traced to their half."
  evidence: "`check-source-archive.mjs` has a pure core and a thin CLI"
```

### guarantee audit (P0)

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/core-383-archive-check/PLAN.md:55"
  problem: "The unsafe-character rule uses `\\p{Cf}`, whose membership follows the Unicode version of the Node that runs it; CI's Node 24 and a user's CLI runtime can disagree on a newly assigned format character. Name it among the drift bounds."
  evidence: "strict UTF-8 path fields, `prefix/name` rebuilt, unsafe-character set"
```

### testability (P1)

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/core-383-archive-check/PLAN.md:112"
  problem: "The equality edge of each limit is not listed: the CLI refuses only above the cap (`entries > max`, gunzip over maxOutputLength, fetch over maxBytes), so an archive exactly AT each cap must be GREEN and one past it RED, or an off-by-one port passes."
  evidence: "over-limit (entries, compressed, extracted, with injected small limits) → the matching `TOO_*` rule"
```

## Summary

The plan is a direct port of a real refusal set with a real trigger (three uninstallable tags). The one concern that
would change behaviour is the `execFileSync` buffer: without an explicit `maxBuffer` the checker cannot read this
repo's own archive. The rest sharpen bounds and tests: name the two modelled axes in the header, add the Unicode-
version drift to the bounds, and test each limit at its exact edge. Not applicable after reading each griller's
procedure: a11y, i18n, privacy, migrations (no UI, user text, PII or persisted schema); observability (a CI gate whose
output is its own log); documentation (the guide section, CONTRIBUTING and CHANGELOG are declared); security (no
untrusted input beyond the repo's own tree, paths escaped per L62); coupling and comprehension (constants are cited to
pharn-cli source lines).

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 1 important, 3 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b floor verdict above is separate and is not counted here.
