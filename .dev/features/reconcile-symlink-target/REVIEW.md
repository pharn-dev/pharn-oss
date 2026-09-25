# REVIEW — reconcile-symlink-target

**Floor first (P0):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities`, exit 0. `npm test` on the
rebased tree: 3260 tests, 3258 pass, 0 fail, 2 skipped. Both skips are pre-existing environment skips ("dev toolchain
not installed" — how this worktree resolves `prettier` / `markdownlint-cli2`), and neither belongs to this increment.

**Reviewed (`trust: untrusted`):** `git diff origin/main` — `pharn/floor/{reconcile-baseline,worktree-fingerprint,
check-bash-reconcile,check-loop-fresh,red-run-core}.mjs`, nine test files, `pharn/pharn-contracts/{reconciliation-record,
gate-run-record}.md`, `SKILLS_VERSION`, the README badge, and `CHANGELOG.md`. No Capability (`role:`) is added or changed.

## Floor-gate findings (blocking)

None.

- **L-floor (P0):** every guarantee reduces to a floor primitive, and each one is pinned. A link's entry is a
  content-hash over its text: `PATH_KINDS` rows plus the closure. An edit through a link is judged under the target's
  path: content-hash plus the existing path matcher, end-to-end, with the guard EXECUTED in the fixture. A pre-upgrade
  stamp is never FRESH: `algo` equality, pinned by straddle F and G and by the `bindStamp` test. A pre-upgrade baseline
  is flagged: digest inequality, tested. `ALGO` bumps with what is hashed: the golden digest, whose bound is stated.
  Timing claims (the race) and platform claims (Windows) are labeled bounds, not guarantees.
- **L-eval (P1):** no Capability or `rule_id` is introduced, so no eval binding is owed. The floor agrees: validate
  GREEN.
- **L-trust (P2):** link text is read as a Buffer and only hashed. It is never decoded, resolved or interpolated. No
  instruction-looking content was met in the reviewed files, and none changed this review's behaviour. The escape
  finding's `problem` string stays free text, and no verdict reads it.
- **L-axis (P3):** each file changes for its own reason. `reconcile-baseline.mjs` changes how a path is hashed.
  `worktree-fingerprint.mjs` changes the identity of its algorithm. `check-loop-fresh.mjs` and `red-run-core.mjs`
  change how they report an algo mismatch. No sibling reference: the test files import only the modules they test,
  plus `worktree-fingerprint.mjs` in `check-red-run.test.mjs`, a floor-internal import the suite already makes
  elsewhere.

## Advisory findings (warn — model judgment; they gate nothing)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/worktree-fingerprint.mjs:66"
  problem: "The UPGRADES bound restates how four consumers (check-loop-fresh E/F/G, red-run-core bindStamp) react to an algo mismatch — a second copy of facts owned by those files (L35's shape). It already drifted once inside this increment, when #269 rewrote E, and needed a hand edit."
  evidence: "E, which reads an algo mismatch as a moved tree (it compares only what the stamp alone decides, so an honest report passes it and F names the cause)"
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/check-loop-fresh.test.mjs"
  problem: "The straddle block pins F and G for a PASSing verify report only. An honest pre-upgrade report that FAILED on the AC gate, read through #269's moved-tree check E (which ignores AC ids), is not exercised."
  evidence: 'test("★ UPGRADE STRADDLE — a stamp fingerprinted with the previous ALGO is never FRESH, even with an equal digest"'
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/reconcile-baseline.mjs"
  problem: "Removing the exported LINK_TEXT_ERRNOS breaks, at load time, any downstream module that imports it. Nothing in this repo does (grepped), the removal was approved at GATE 1, and the CHANGELOG names it — but an install's own local code could."
  evidence: '-export const LINK_TEXT_ERRNOS = Object.freeze(["ENOENT", "ENOTDIR", "ELOOP"]);'
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/reconciliation-record.md:160"
  problem: "The Windows divergence (no O_NOFOLLOW → a link to a regular file keeps target-byte hashing) is a stated bound with no test, because CI is POSIX only. It is correctly labeled, not claimed."
  evidence: "Where the platform has no `O_NOFOLLOW` (Windows), the open follows a link and a link to a regular file hashes by its target's bytes"
```

The grill's four concerns were folded in before the build, and each is visible in the diff. The order is now open
first: the ordered closure pin plus the re-measured bound. The guard is executed in the ★ fixture. The contract says
"final component". The CHANGELOG carries the re-point residual.

## Verdict

**GREEN** — 0 floor-gate findings; 4 advisory (all minor).

## Proposed lesson candidate

**None.** The recurrence this increment fixes is L59's own mechanism (a follow-call answering for the target), and L59
already names it and prescribes the remedy applied here: classify the link itself and enumerate the path kinds. The
other near-candidate is the fingerprint `ALGO` rule, broken without a bump in 6.17.1. It was remedied in this increment
by a golden-digest test rather than by a note, so there is no discipline-only remedy left for L20's bar.
