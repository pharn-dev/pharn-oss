# REVIEW — regress-head-install-drift

**Floor first (P0):** `node pharn/floor/validate.mjs .` → GREEN (re-run after the fixes below).

**How this review was run (recorded, advisory).** An independent Opus agent with a fresh context reviewed pushed
commit `69efae6`. It probed npm 11.12.1 directly rather than relying on the plan's descriptions. The orchestrator
relayed the findings and decided, under the maintainer's delegation, to fix all five. That decision was made by a
model, not by a human. The reviewer's free text below inherits the increment's untrusted tag and is quoted as DATA
(P2). The builder wrote this file, and each fix is described in its own words beneath the finding.

## Floor-gate findings (blocking)

None. The reviewer reported 0 floor-gate findings, and validate is GREEN.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/install-drift-core.mjs:25"
  problem: "A pulled package.json + lockfile adding a devDependency (`-D is-even`) reads `clean` — missing_unchecked rose 23 → 28 — because every absent dev:true entry is unchecked; this repo's own `markdown-it/node_modules/argparse` is dev:true too."
  evidence: "Reproduced with npm 11.12.1; after `npm ci --omit=dev` the hidden record holds 0 dev:true entries."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-loop.md:236"
  problem: "The verify stage-exit mapping's refused-reason list reads as complete and lacks `head-install-drift`; the S9 trigger cell names no install mismatch."
  evidence: "- `refused` (`missing-artifact`, `chain-red`, `plan-files-unparseable`) and `unusable` → **S9**;"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/install-drift-core.mjs:49"
  problem: "'Every false clean is the behaviour before this check, never a false refusal' overstates: a workspace-filtered install (`npm ci -w a`) reads drifted, a refusal whose remedy is a full install, and nothing says no bypass is offered."
  evidence: "Reproduced: `npm ci -w a` → drifted."
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: "pharn/floor/install-drift-core.mjs:detailText"
  problem: "Each quoted lockfile path is JSON-quoted but not cut; a multi-megabyte hostile key is size, not injection — cut it to SHOWN_CHARS with quote-core's helper."
  evidence: "detailText's list line used JSON.stringify(m.path)."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:[6.40.0]"
  problem: "The entry implies the refusal arrives in seconds of the run; it arrives in seconds once the run reaches regress, after ~55 min of front stages and build in the measured run. What it saves is the gate runs and the CONTINUE iterations over a drifted tree."
  evidence: "the 92-minute run's regress started after spec/plan/grill/test/build."
```

The reviewer also confirmed the following as fine, quoted as DATA: workspaces, links, aliases, bundled packages,
lockfile v2/v3, the linked install strategy, omit=dev and optional platform packages all read clean; `npm ci` clears
drift; the comparison order is right; keys are fenced; the S9 and ship mapping holds; the scratch files are correct.

## Fixes (each decided by the orchestrator under the user's delegation)

- **R1 — fixed.** An absent `dev`, `peer` or `devOptional` entry is now `missing`, which counts as drift, when npm's
  record holds at least one present entry carrying that same flag. Present entries mean the class was installed, not
  omitted.
  - `optional` stays unchecked in every case (platform binaries).
  - A `devOptional` entry with an `os`/`cpu`/`libc` constraint also stays unchecked. This is my addition, in the safe
    direction: such an entry is a platform binary npm skips, so the class rule would otherwise refuse it on the wrong
    platform.
  - `install-drift-core.mjs` gained `installedClasses` and `absentIsDrift`, and its header rule was rewritten.
  - Tests cover both directions per flag, plus the other-class control, `optional`, and platform `devOptional`.
  - Measured with real npm (offline local tarballs): a pulled devDependency with dev installed reads `drifted`;
    `npm ci --omit=dev` reads `clean` (`missing_unchecked` 2); `npm ci` reads `clean`.
- **R2 — fixed.**
  - The verify mapping in `pharn-loop.md` now lists `head-install-drift`.
  - The S9 trigger cell now names "install unlike lockfile". The cell was reworded to keep the column width exactly
    unchanged, so the table is not re-padded.
  - `pharn-loop.md` was added to the plan's `## Files` and the scope re-set before the edit. The epoch was re-anchored
    after the main merge, with that scope.
- **R3 — fixed.**
  - The core header, the contract, CHANGELOG and CLAUDE.md now say "a false clean leaves the pre-6.40.0 behaviour; it
    never causes a refusal".
  - Each of them names the workspace-filtered install as a known refusal whose remedy is a full install, and states
    that no bypass is offered.
  - Deleting the hidden lockfile is documented nowhere.
- **R4 — fixed.** Paths and versions in the detail go through `quote-core.mjs` `shown`, which JSON-quotes and cuts to
  `SHOWN_CHARS` (64); an absent version is `null`. A test feeds a 100,000-character key and a 5,000-character version.
- **R5 — fixed.** The CHANGELOG now says the refusal comes within seconds of reaching regress, about 55 minutes into
  the measured run, not at entry. It names what is saved: the gate runs over a drifted tree, and the CONTINUE
  iterations at verify. It also notes that the entry pre-flight (#313) now surfaces a drift-caused red earlier, and
  keeps `entry-preflight-install-drift` named.

## Merge

`origin/main` 43c09ba (6.39.0, #309) is merged. `[6.39.0]` sits directly below `[6.40.0]`, and my entry's bump line
reads 6.39.0 → 6.40.0. The conflicts were in CHANGELOG, CLAUDE.md, README and SKILLS_VERSION, and I kept both sides.
`npm run check` on the merged tree first stopped at `check:reconcile`. Every path it named was one `origin/main`
changed, so I re-anchored on the merged tree before the fixes above. VERIFY.md records the re-run.

## Lesson candidate

None promoted (batch rule). One possible candidate: when a refusal exempts a class of entries to avoid a permanent
stop, the exemption should be conditioned on evidence that the class was omitted, not on the class itself. This is
the first occurrence, so it is below L20's bar.
