# GRILL — hook-hardening-batch

Plan: `.dev/features/hook-hardening-batch/PLAN.md` · spec-hash: `2c84959c…db12e`, matches the plan's
`spec_content_hash` · **Step 1b lessons declaration (FLOOR): GREEN**, `check-plan-lessons.mjs` exit 0 (L26, L27,
L31, L37, L64, L68, L73 resolve and are referenced in the body).

grillers: 13 registered, 13 printed (pharn/floor/griller-extract.mjs) — 194015 B of griller files, 99391 B printed;
deep omission: 13 pharn-owned, 0 other; left out where present: guarantee-audit (13), machine-readable-emission (13),
two-layers (13), layer-1 (13), finding-output (13); kept whole: none

## Deterministic plan scans (`pharn/floor/grill-scan.mjs`)

Advisory: each finding below gates nothing. The scanners detect a pattern's presence on a line; a scanner finding is
not the griller's judgment.

Findings: none (no secrets, PII or i18n scanner hit).

- `scan-plan-migrations`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  migrations griller's judgment.
- `scan-plan-observability`: mentions false. Not a finding: whether the plan needs or adequately declares this is the
  observability griller's judgment.

## Findings

### error-handling (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/hook-hardening-batch/PLAN.md:50"
  problem: "The hooksPath discovery declares a refusal only for an unreadable LOCAL config; it does not say what an unreadable global, XDG or system config does, nor a `.git` file with no parsable `gitdir:` line or an unreadable `commondir`."
  evidence: "every `core.hooksPath` value found (Q3), resolved against the project root"
```

Recommended for build: ENOENT (and ENOTDIR) on an optional file is "not there"; any other error on any config file
the class reads, an unparsable `.git` pointer, or an unreadable `commondir` refuses the plan (fail-closed), with a
message naming the file and the opt-in.

### testability (P1)

Presence recognized (`## Evals to write (P1)`, the per-file test lines in `## Files`). Layer 2:

```yaml
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/hook-hardening-batch/PLAN.md:112"
  problem: "The plan does not say how a 'read error' and a 'module-level throw' are produced in a test, so either could silently become a test of something else."
  evidence: "Empty, whitespace and unreadable (stdin is a directory) stdin deny; a module-level throw exits 2."
```

Recommended for build: pass a directory file descriptor as the child's stdin (`fs.openSync(dir, "r")` in `stdio[0]`,
which `readFileSync(0)` rejects with `EISDIR`), and assert the fixed detail text in stderr so the deny is the
read-error branch, not the empty-input one. For the handler, a mutant copy (`{ link: false }`) with a top-level throw
inserted after the handler's registration exits 2; the structural pin in the cross-copy test covers the shipped file.

### security (P2)

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/hook-hardening-batch/PLAN.md:50"
  problem: "A git config value can take forms the plan does not cover — a quoted value with escapes, a trailing comment, `~/` and `~user/` prefixes, a key spelled in another case — and a parser that misses one under-refuses."
  evidence: "every `core.hooksPath` value found (Q3), resolved against the project root, when it lies inside it"
```

Recommended for build: match the section name and key case-insensitively; handle `"…"` with `\\`, `\"`, `\t`, `\n`
escapes and `#`/`;` comments outside quotes; expand `~/` with the home directory; a `~user/` form that cannot be
expanded is not inside the root, so it reserves nothing — say so. Continuation lines (a trailing backslash) are
read as their first line only; state it among the limits. Every value seen counts (union), so a repeated key cannot
hide an earlier one.

### architecture (P3)

Fit recognized: the new class stays inside the setter beside the existing refusals; the two copy-pairs it touches
are kept byte-equal or pinned (L31). No finding.

### coupling (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/hook-hardening-batch/PLAN.md:51"
  problem: "Applying the on-disk-identity check to the existing PHARN-surface refusal as well (Approach 3 says the new class matches on-disk; the GATE-1 summary mentioned both) is a second change folded into SEC-5's."
  evidence: "Matching on `toKey()` (folded), and — L73 — also on each entry's on-disk spelling"
```

Recommended for build: apply the on-disk spelling to both refusals through one helper (it only adds refusals, so
the PHARN-surface one can only get stricter), and name it in the CHANGELOG as its own bullet so the two changes stay
attributable. Ask if the orchestrator prefers the new class only.

### documentation (P7)

Presence recognized: `HUMAN-PATCH.md`, the dev guide, the setter header and the CHANGELOG are planned. No finding.

### comprehension (P7)

Presence recognized: each change carries its reason (the audit id and the reproduced behaviour). No finding.

### performance

The discovery reads at most five small files and realpaths each plan entry's nearest existing ancestor once per
setter call. No finding.

### a11y, i18n, privacy, migrations, observability

The change touches no UI, no user-facing text in another language, no personal data, no schema and no production
runtime. No finding from any of the five.

## Summary

The plan is a guard hardening plus a human-run patch. The concerns are about the edges of the new git-config reader
(what an unreadable or odd file does, which value forms count) and about naming how two test conditions are
produced. One coupling note asks that the on-disk check on the existing refusal be stated as its own change.

ADVISORY VERDICT: 5 concerns raised (0 blocking-severity, 3 important, 2 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and is not part of this tally.
