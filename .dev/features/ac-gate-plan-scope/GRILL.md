# GRILL — ac-gate-plan-scope

Plan: `.dev/features/ac-gate-plan-scope/PLAN.md` (as amended at GATE 1). Spec-hash check: `pharn/ARCHITECTURE.md`
recomputes to `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4`, equal to the plan's pin (no drift).
**Step 1b — `applied_lessons` re-verification (FLOOR): `check-plan-lessons.mjs` exit 0, GREEN** — all 17 cited ids
resolve in `.dev/memory-bank/lessons-learned.md` and are referenced in the plan body. That verdict covers the
DECLARATION only, never that the lessons were applied.

Grillers discovered by `count-grillers.mjs`: 13 registered, each applied inline below. Scanner outputs over the plan
(deterministic, FLOOR as outputs): `scan-plan-secrets` `{"found":false}`, `scan-plan-pii` `{"found":false}`,
`scan-plan-i18n` `{"found":false}`, `scan-plan-observability` `{"mentions":false}`, `scan-plan-migrations`
`{"mentions":true,"hits":[{"line":140},{"line":263}]}` (the `/3` migration prose — evidence, not a pass).

The plan is `trust: untrusted` to this stage; no instruction-looking content was found in it.

## Findings

### Built-in interrogation

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/ac-gate-plan-scope/PLAN.md:107"
  problem: "A2's file scan now also runs over A7's chained values and every pre/post value, so a file a test-reachable BUILD step names is pinned: a bundler's entry (`tsup src/index.ts`, `esbuild src/index.ts`) becomes 'test infrastructure' (every feature that edits it is RED at plan time), and a named OUTPUT with an executed extension (`--outfile=dist/index.js`) is rewritten by the gate itself, so a stale copy present at `--write` reads test-infra-changed after the red run or the build."
  evidence: "A2: 'The candidates of every pinned gate's `script`, `pre` and `post` values …'; A7: 'scanned again, both for further chains and for A2's script-named files'."
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/ac-gate-plan-scope/PLAN.md:335"
  problem: "A8 records the sha256 of the root `.npmrc` in a COMMITTED lock; a project `.npmrc` is where registry credentials live, and a digest of a file holding a low-entropy secret lets anyone who reads the lock test guesses offline. The plan says the digest is 'never echoed' but does not state this bound."
  evidence: "'The `jest` key and every package-manager config are reduced to a sha256 and never echoed (a `.npmrc` can hold a registry token).'"
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/ac-gate-plan-scope/PLAN.md:182"
  problem: "A7 defines a CLOSED set of token sequences (npm/pnpm/yarn × run/run-script/rum/urn, test/t/tst, start/stop/restart, the pnpm/yarn shorthand, `node --run`) and an own-property rule, but the test list names only 'the candidate rule table'; per L52 the suite must iterate EVERY member of the sequence set with a control, plus the own-property negative (`toString`), a cycle, and the hop bound at 8 and 9."
  evidence: "'`run` / `run-script` / `rum` / `urn` → the next non-flag token is the id; `test` / `t` / `tst` → `test`; `start` / `stop` / `restart` …'"
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/ac-gate-plan-scope/PLAN.md:107"
  problem: "The plan does not say what the token pass does with a chained script whose value is not a string, a `scripts` field that is not an object, or an `lstat` error other than absence (EACCES) on a named path; each must refuse the pin (fail-closed), as a non-string level-gate script already does."
  evidence: "A2: 'an absent path, a directory, or a path under a non-directory … is skipped; a symlink or any other kind REFUSES the pin'."
```

### Griller: migrations (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: important
  file: ".dev/features/ac-gate-plan-scope/PLAN.md:140"
  problem: "The lock schema moves to /4 and the plan declares the forward migration (/3 still read) but not the way BACK: a 6.28.x floor's shape check refuses a /4 schema, so after a rollback every feature locked under 6.29 reads lock-unusable until /pharn-test is re-run under the older floor. That irreversibility is not labelled."
  evidence: "A4: '`/3` (6.20.0–6.28.x) is still read … `--record-red-run` writes only on a `/4` test-first lock.' — no rollback direction."
```

### Griller: architecture (P3)

```yaml
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/ac-gate-plan-scope/PLAN.md:173"
  problem: "A6 introduces key-sorted canonical JSON while `pharn/floor/loop-fresh-core.mjs:265` already has a private `canonical()`; importing that one would invert the dependency (loop-fresh-core imports test-infra-core), so a second small implementation is defensible, but the plan does not say so."
  evidence: "A6: 'the sha256 of the key's value in CANONICAL JSON (keys sorted at every level, serialized directly …)'."
```

### Griller: comprehension (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/ac-gate-plan-scope/PLAN.md:188"
  problem: "Three values carry no captured WHY: `MAX_CHAIN_HOPS = 8`, the 256-level nesting cap in A6, and 'examples ≤ 3' in B3; the next maintainer cannot tell a measured bound from an arbitrary one."
  evidence: "'REFUSES the pin past 8 hops (`MAX_CHAIN_HOPS`)'; 'Nesting deeper than 256 levels refuses the pin'; '(examples ≤ 3 ids, sorted)'."
```

### Griller: documentation (P7)

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/ac-gate-plan-scope/PLAN.md:278"
  problem: "The README edits listed cover the badge, the anomaly rule, the pin list and pharn-json guidance, but not the two costs a user will actually hit — a chained build step is pinned (`test-infra-changed` when a feature edits it) and a file a script names literally is pinned — nor their remedies."
  evidence: '''`README.md` — EDIT. The badge 6.29.0; the two sentences stating the whole-record rule; the pin list in "What verify proves"; the pharn-json reporter guidance''.'
```

### Grillers with no finding

- **testability (P1)** — presence recognized: `## Evals to write`, the per-file test list, the before/after world
  measurements and the ★ HOOK probes. Adequacy concern raised above (the chain-sequence set, L52).
- **security (P2)** — scanner clean; the concerns this plan raises are its own subject (H2) and are designed against;
  the `.npmrc` digest bound is raised above.
- **error-handling (P7)** — declaration recognized (refusals for symlinks, depth, unreadable manifests); the gaps are
  raised above as minor.
- **observability (P6)** — the change adds no runtime service or operation; floor CLIs report through their exit codes
  and printed lines. No finding.
- **performance (P7)** — the token pass is linear in script length with an 8-hop bound; the record's anomaly split is
  linear; `unmapped_anomalies` is a bounded summary. No scaling risk recognized.
- **privacy (P2)** — scanner clean; no personal data. (The `.npmrc` credential bound is filed under security above.)
- **coupling (P3)** — clean seams: the token rule lives in one module and both consumers import it; the anomaly
  scope lives beside the one match rule. No entanglement.
- **a11y (P7)**, **i18n (P7)** — no UI surface and no user-facing strings (`scan-plan-i18n` clean). No finding.

## Summary

The plan closes both review findings and the GATE-1 amendment with deterministic rules and states its bounds. The one
design problem the interrogation surfaced is the A2/A7 interaction: once chained and pre/post values are scanned for
named files, build steps reached from the test gate leak into the pin — a bundler's entry becomes infrastructure, and
a literally named OUTPUT is rewritten by the gate. Excluding the targets of output flags (`--out…`, `-o`) and of shell
redirects from the candidate rule keeps the closed literal form and removes the output half; the entry half remains a
stated fail-closed cost for the human at GATE 2. The other important items are the unlabelled `/4` rollback, the
`.npmrc` digest bound, and the L52 enumeration the chain rule's tests owe.

ADVISORY VERDICT: 8 concerns raised (4 important-severity, 4 minor-severity) — for the human to weigh before
/pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and is not part of this tally.
