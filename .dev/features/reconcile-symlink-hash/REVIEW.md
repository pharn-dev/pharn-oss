# REVIEW — reconcile-symlink-hash

**Floor first (P0):** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities checked`. `/pharn-dev-verify`
recorded `PASS` over 7 gates, including `reconcile` `CLEAN` against this build's own anchor.

**Verdict: GREEN — 0 floor-gate findings, 4 advisory findings (all minor).**

## What was reviewed

- `pharn/floor/reconcile-baseline.mjs` — `hashFile` gains the link-text fallback (`LINK_TEXT_ERRNOS`, `hashLinkText`)
  and its rationale block.
- `pharn/floor/reconcile-baseline.test.mjs` and `check-bash-reconcile.test.mjs` — `PATH_KINDS`, the re-point rule,
  the errno closure, the CWE-367 closure pin, the downstream-compatibility pin, the non-UTF-8 case, and the e2e
  CLEAN/ESCAPE pair.
- `pharn/floor/worktree-fingerprint.mjs` (a header bound only), `reconciliation-record.md`, `SKILLS_VERSION`, the
  README badge, and `CHANGELOG.md` `[6.16.1]`.

All four grill concerns were answered in the build. F1: the link is read as a Buffer and the raw bytes are hashed.
F2: the contract §3 row is corrected. F3: the shipped contract table words the row as "the open succeeds, not a
regular file", and the FIFO case is stated separately. F4: `hashLinkText` sits inside the pinned region, and the
closure found it.

**Measured, not argued.** A scratch mutation run (`.pharn/pharn-dev-build/mutate.mjs`, since deleted) built three
wrong modules and ran the new tests against each:

| mutant                                              | killed by                                                     |
| --------------------------------------------------- | ------------------------------------------------------------- |
| old behaviour (`null` for a non-file / failed open) | 4 `PATH_KINDS` link rows, re-point, compat, non-UTF-8, anchor |
| any-errno fallback (the downstream patch's shape)   | `PATH_KINDS — symlink to an unreadable regular file`          |
| `readlinkSync(abs)` read as a string                | the CWE-367 closure pin, and the non-UTF-8 case               |

The pre-fix checker returned `ESCAPE` on the e2e scenario (the reproduction in `PLAN.md`), and the fixed one returns
`CLEAN`.

## Floor-gate findings (blocking)

None.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/pharn-contracts/reconciliation-record.md:133"
  problem: "The contract states the fallback errno set in prose (ENOENT / ENOTDIR / ELOOP), a second copy of LINK_TEXT_ERRNOS. The closure test pins the module against the PATH_KINDS rows, not against this table, so a change to the set would leave the contract stale with every gate green (L35's shape). Accepted for now: a schema doc has to state the rule it documents, and the CHANGELOG names the same three codes. A parity pin would be a third store to keep in sync."
  evidence: "| a symlink whose target does not resolve: open fails `ENOENT` / `ENOTDIR` / `ELOOP` | SHA-256 of `symlink\\0` + raw link text |"
- type: FINDING
  rule_id: P1
  severity: minor
  file: "pharn/floor/reconcile-baseline.test.mjs:233"
  problem: "Only the EACCES row kills the any-errno mutant, and that row is skipped under root, where a mode-000 file stays readable. On a root runner the one deliberate divergence from the downstream patch would go unpinned, and the suite would still be green. ci.yml runs on ubuntu-latest as the non-root runner user, so CI exercises it. The skip reason is printed, not hidden."
  evidence: 'skip: IS_ROOT && "root reads a mode-000 file, so the unreadable state cannot be built"'
- type: FINDING
  rule_id: P0
  severity: minor
  file: "pharn/floor/reconcile-baseline.mjs:170"
  problem: "hashFile now makes a second path-addressed call, readlinkSync(abs), after openSync(abs). That is the shape CodeQL's js/file-system-race has flagged in this file twice before. It is not a race on hashed bytes (readlink returns the name's own text in one syscall, and the fd's bytes are never hashed on this path), but a static query may still report it. If CodeQL flags it on the PR, the reply is this reasoning plus the closure pin. Restructuring would reintroduce the lstat-then-open pair, which IS a race."
  evidence: '.update(readlinkSync(abs, { encoding: "buffer" }))'
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md:40"
  problem: "The CHANGELOG says at least eight downstream runs ended STOP_TERMINAL on the links. Measured this run, twelve STOP_TERMINAL loop records in pharn-starter (excluding the fix run itself) name `.claude/skills`, and in two of them (remove-motion, delete-a11y-tests) the links were not the only escape. 'At least eight' is a true lower bound, and it states the conservative count, never an inflated one."
  evidence: "At least eight of its `/pharn-loop` runs ended `STOP_TERMINAL` on those links."
```

## Lenses

- **L-floor (P0).** Every new claim reduces to content-hash or enum membership: link-text hashing, re-point
  detection, errno membership, and the null-stays-candidate rule. The claims that do not reduce are struck in the
  contract and in the CHANGELOG: files seen through the link, collision-freedom against a forger, and a clean first
  reconcile after the upgrade. None is sold as a guarantee.
- **L-eval (P1).** No Capability changed, so no eval is owed. The module's behavior is specified by `PATH_KINDS`
  (nine kinds, one enumeration iterated by every rule, per L29/L52), the errno closure (L36), and the e2e pair with
  its non-vacuity mirror (L34).
- **L-trust (P2).** Link text is attacker-choosable, and it only ever reaches `createHash().update()`. It is not
  printed, parsed or followed, and no output field carries it. Nothing in the reviewed files read as an instruction.
  The downstream records this increment cites were treated as DATA, and the mechanism was re-derived from source.
- **L-axis (P3).** `hashFile` keeps its one axis (what is the content identity of a reconciled path). No sibling
  reference was added. `check-bash-reconcile.mjs` needed no code change.

## Proposed lesson candidate (for a human; never written here)

- **target:** `.dev/memory-bank/lessons-learned.md`
- **type:** `floor` · **concepts:** `[symlink, follow-semantics, lesson-recurrence, floor-escalation, input-domain]`
- **title:** L54 recurred a third time: a call that FOLLOWS a link decided a question about the link itself
- **body (draft):** `openSync` follows a symlink, so `hashFile` answered "what is this link?" with the facts of its
  target. A directory target and a missing target both became "unhashable". This is L54's mechanism (`existsSync`
  reads a dangling link as absent) in a third floor site, after `run-gates.mjs`'s `assertContained` and the
  `check-loop-fresh.mjs` draft. It shipped for the whole 4.0.0–6.16.0 line because no fixture in either reconciler
  suite contained a symlink: the input domain was "regular files" by omission. By L20 the third occurrence earns a
  check. The candidate remedy is that every `pharn/floor/` module which stats, opens or hashes an ENUMERATED path
  carries a `PATH_KINDS`-style enumeration that includes the three link kinds (to a directory, dangling, looping).
- **provenance:** feature `reconcile-symlink-hash`, source `.dev/features/reconcile-symlink-hash/REVIEW.md`
  (this candidate) and `PLAN.md` § The defect. The commit is captured by `/pharn-dev-memory-promote`, never here.
