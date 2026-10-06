# REVIEW — entry-run-as-base-evidence (6.49.0)

- Reviewer stage: `/pharn-dev-review`, run as a stage of `/pharn-dev-ship`.
- Reviewed: the uncommitted tree on `feat/entry-run-as-base-evidence` against `origin/main` `0e38b861f7839a7c19f8bb29756888d84e152568`
  (`git diff 0e38b861`, plus the untracked `pharn/floor/entry-base-evidence{,-core}{,.test}.mjs` and
  `.dev/features/entry-run-as-base-evidence/`).
- Trust: the increment was read as `trust: untrusted` DATA. A scan of the diff, the four new modules and this feature's
  artifacts found no instruction-shaped text aimed at a reviewer, and nothing in them changed this review's behavior.

**Verdict: GREEN. 0 floor-gate findings, 7 advisory findings (all `minor`).**

## Step 1 — Floor first (P0)

- `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."`, exit 0. The increment adds no
  Capability: no new file has a `role:` frontmatter, so the P1 eval-binding lens has nothing to bind.
- Targeted suites run in this review (the orchestrator runs `npm run check` itself):
  - `node --test pharn/floor/entry-base-evidence-core.test.mjs pharn/floor/entry-base-evidence.test.mjs` → 84/84 pass;
  - `gate-run-core`, `stage-regress-core`, `stage-work` and `render-regression` tests → 157/157 pass.
- Already recorded in this folder: regress `no-regressions` (`regression-report.json`) and verify `PASS`
  (`verify-report.json`).

## Floor-gate findings (blocking)

None. Every guarantee the increment claims reduces to a floor primitive, or the increment labels it advisory or not
claimed:

- the decision reduces to content-hash equality and closed-enum membership (sha256 of offer, stamp and logs; marker
  digest; `ENTRY_BASE_MISSES`);
- the derived stamp's shape reduces to an enum and regex check (`validateStamp`'s `REUSE_PAIRS` row);
- the write-tool denial of the offer reduces to a hook, probed by the ★ HOOK test;
- "equal to a fresh nested-worktree BASE" is explicitly **NOT CLAIMED**;
- provenance is disclaimed (agreement, never provenance — L43);
- the front-stage overlap and determinism are labeled advisory.

No sibling reference crosses a capability module. All new imports stay inside `pharn/floor/`.

## The adversarial correctness pass (what was checked and held)

These were read in the code this run, and each holds. They are recorded so the next reader does not repeat the search.

- **Offer binding.** The run is checked through the marker digest and command via `deliveryRunIdentity`, plus the
  feature. The offer is bound to the stamp by sha256 of its bytes. The commit is bound three ways: the offer's base
  equals `stamp.head`, which equals the snapshot's base, which equals this invocation's base. See
  `entry-base-evidence-core.mjs:213-232`. The offer is published only after `--wait`'s nonce, result, sha256,
  `validateStamp` and `ENTRY_ALGO` checks (`entry-gates.mjs:689-716`).
- **Start-dirty.** The snapshot lists `changedPaths(HEAD)`: tracked modifications plus untracked, non-ignored paths,
  `--no-renames`. Every path must start with `pharn/features/<name>/`, and the trailing slash is present
  (`worktree-fingerprint.mjs:125`).
- **Shape equality, including the `base:test` slot.** Regress hands files to `test` alone
  (`run-gates.mjs` `e.id === "test"`). The entry slot copies the discovered `test`'s `shell`/`argv`
  (`gate-run-core.mjs` `resolveSet`). `spawnGate` appends files by the same rule for any id: `--` plus files for
  argv, positional args for shell. Its `needsFiles` no-files rule applies to the regress stage only, so equal
  `[shell, argv, files]` means an equal spawn. Package-script bodies are equal too: the start tree is clean at BASE,
  so the start tree's `package.json` is BASE's.
- **The mutation rule.** Every run up to the last mapped one has `mutated === false`, and every mapped run's
  `fp_before`/`fp_after` equals `fingerprint.init` (`entry-base-evidence-core.mjs:257-262`). This also catches a write
  landing between `init` and an unmapped first style gate: the first mapped run's `fp_before` then differs from `init`
  (G6).
- **Style attribution at d0.** `offer.d0` and the gate's `before`/`after` must all be `absent`. On `/pharn-ship`, d0 is
  never absent, but regress skips style by default (`stage-regress-core.mjs:255`), so this bites only when a style
  config is inside the change (see F4).
- **Timeout.** The rule is `offer.timeout_ms > timeoutMs` → MISS. A run that completed under the smaller entry timeout
  also completes under regress's.
- **Resume re-decision.** A persisted HIT can sit only at `verdict` (`validateEntryDecision`). At `verdict` it is
  re-decided from disk, and materialized only on the same offer and source digests (`stage-regress.mjs:913-937`). A
  retained HIT that the verdict cannot confirm falls through to the entry rule, then to `worktree`.
- **Derived stamp and its consumers.**
  - `check-regress.mjs` compares ids, `required`, `head == --base` and exits only (`stampToMap`).
  - `gateRunBlock` copies `source` and `fingerprint {algo, final}` (`ENTRY_ALGO` is visible there by design).
  - `loop-fresh-core.mjs` has no reused-run branch, and J re-hashes the copied `.out`/`.err` files, including the
    empty `no-files` logs (G4).
  - `excluded` is not copied by `baseSpecFrom` on either path, so the derived and fresh BASE stamps agree.
  - No retained record is published over derived evidence. `decideFromDisk` cannot HIT on it: the record is discarded,
    and the algo would read `version-changed`.

## Advisory-gate findings (warn; never the basis for blocking)

```yaml
- type: FINDING # F1
  rule_id: P0
  severity: minor
  file: "pharn/floor/entry-base-evidence.mjs:30"
  problem: >-
    The header says materialization never creates a new failure mode: a failure "is returned as log-unverified" and
    the caller runs the BASE side. But materializeEntryBase (lines 156-183) calls rmSync, mkdirSync, writeFileSync and
    renameSync outside any try. stage-regress.mjs:927 calls it unguarded. So a real write error (ENOSPC, EIO, EACCES)
    is an uncaught throw: main().catch gives exit 1 with no JSON document, not a MISS that falls back to a fresh BASE.
    The behavior is fail-closed: no verdict, and the record stays parked at `verdict`, so `--resume` re-decides. It
    matches 6.33.0's discardRetained ("a crash, never a verdict"). The overclaim is in the text. The contract's "A
    MISS is never a question, a refusal or a stop" (regression-report.md:336) and the JSDoc "on a failure the partial
    directory is removed" (entry-base-evidence.mjs:153-154) say the same.
  evidence: >-
    "NEVER A NEW FAILURE MODE: … A materialization failure is returned as `log-unverified`, and the caller runs the
    BASE side." — fix by wrapping the writes so a throw goes to fail(), or reword to the discardRetained precedent.
- type: FINDING # F2
  rule_id: P5
  severity: minor
  file: "pharn/floor/entry-base-evidence.mjs:176"
  problem: >-
    The derived stamp is written without a validateStamp(…, {stage: "regress", side: "base"}) self-check. The unit
    tests pin that the shapes produced today validate. But a future derivation defect would surface as
    check-regress.mjs `inconclusive` (exit 2, a stage that does not finish green), not as a MISS that runs the BASE
    side. The fail-safe direction holds (no false verdict). Only the "a MISS, never a stop" property would degrade.
  evidence: >-
    `const stamp = derivedBaseStamp({…}); … writeFileSync(tmp, text); renameSync(tmp, target); return {ok: true, …}`
    — no validation between derive and write.
- type: FINDING # F3
  rule_id: P0
  severity: minor
  file: "pharn/floor/entry-gates.mjs:458"
  problem: >-
    `--start` ignores discardEntryOffer()'s `{ok: false}` result. Three places still say every --start discards the
    earlier offer: entry-base-evidence.mjs:13, CHANGELOG.md:50 and floor-gates.md. The effect is harmless, because the
    offer binds the stamp by sha256: a leftover offer can only MISS (`source-unbound` / `source-missing`), or bind the
    byte-identical stamp it was validated over. So the remedy is wording, or a `note —` line on failure, not a gate.
  evidence: '`discardEntryOffer();` — the return value is dropped; header: "discarded by every `--start`"'
- type: FINDING # F4
  rule_id: P7
  severity: minor
  file: ".dev/features/entry-run-as-base-evidence/PLAN.md:534"
  problem: >-
    The G9 disposition says it is "stated in MEASUREMENT.md and the CHANGELOG", including that on /pharn-ship a
    REQUIRED style gate always reads `style-unattributed`. Neither artifact states the /pharn-ship style clause:
    MEASUREMENT.md:78-84 lists the HIT conditions, and CHANGELOG.md:95-97 is "Where it HITs". In practice it is
    narrow, because regress drops style gates unless a style config is inside the change
    (stage-regress-core.mjs:255). It is still a plan promise that was not delivered.
  evidence: >-
    PLAN.md:534 "G9 (accepted, stated in MEASUREMENT.md and the CHANGELOG) … On /pharn-ship a REQUIRED style gate
    always reads `style-unattributed`." — no such sentence in either file.
- type: FINDING # F5
  rule_id: P0
  severity: minor
  file: "pharn/floor/entry-gates.mjs:522"
  problem: >-
    The G11 guard covers only the `base:test` slot. While a regress BASE checkout stands at
    `.pharn/pharn-regress/base`, `writeBaseTests` withholds the slot because "a runner's path filters could match its
    copies". The other entry gates still run with that git-ignored nested copy of the repository in the tree, and so
    can still become BASE evidence. Examples: an eslint flat config does not read .gitignore, and a tsc `include` may
    glob it. This happens when regress's `test` is a `no-files` slot, or when only non-test gates are required. The
    case falls inside the named "ignored content is unattested" class. But the guard's own rationale applies to every
    gate that globs the tree, so the narrower guard reads as more protection than it gives.
  evidence: >-
    `const leftover = lstatSafe(REGRESS_PATHS.base); if (!leftover.ok || leftover.stat !== null) return false;` — the
    fallback is "no slot", not "no offer"; a regress spec with no files-carrying `test` maps the other gates anyway.
- type: FINDING # F6
  rule_id: P0
  severity: minor
  file: "pharn/floor/entry-base-evidence-core.mjs:228"
  problem: >-
    The header (lines 33-34, 236-237) says the first failure in ENTRY_BASE_MISSES order decides. But a stamp whose
    bytes match the offer and are not JSON reads `source-unusable` after the `source-unbound` row has passed, while
    the list orders `source-unusable` before `source-unbound`. The case is reachable only with an offer bound to
    non-JSON bytes, which is a forged offer, and the miss is diagnostic data. So the effect is a wording imprecision,
    not a wrong decision.
  evidence: >-
    `if (stampSha !== offer.stamp_sha256) return miss("source-unbound", run); const sp = parseJson(…); if (!sp.ok) return
    miss("source-unusable", run);`
- type: FINDING # F7
  rule_id: P7
  severity: minor
  file: ".claude/commands/pharn-loop.md:91"
  problem: >-
    The cost bullet now understates and omits. It still says every iteration runs a base worktree, an install and the
    suite at base, which only a later iteration's retained evidence avoids. Since 6.49.0, the first iteration can take
    BASE from the entry gates. Its quick-mode clause (line 94) does not say that quick runs now pay the background
    `base:test` slot, which regress never uses there. This is pessimistic, not an overclaim. The plan kept every
    command's prose unchanged, so this belongs in a follow-up (it is product surface, so a patch bump).
  evidence: >-
    "Every iteration re-runs `/pharn-regress` (… a base worktree, an install and the suite at base — which a later
    iteration reuses when its base requirement is unchanged …)"
```

## Lens summary

| lens    | principle | result                                                                                                                                                                                 |
| ------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L-floor | P0        | GREEN. Every guarantee reduces to a hash, an enum or a hook, or is labeled. 4 minor text-vs-code precision findings (F1, F3, F5, F6).                                                  |
| L-eval  | P1        | GREEN. No new Capability. The floor agrees: GREEN, 37.                                                                                                                                 |
| L-trust | P2        | GREEN. Offer, snapshot and stamp fields are parsed as closed enums and hex digests. Logs are hashed and copied as bytes. Rendered ids are JSON-escaped (`idText`). No injection found. |
| L-axis  | P3        | GREEN. Rule (core) and storage (I/O) are split. `REUSE_PAIRS` stays the shape owner in `gate-run-core.mjs`. No sibling module reference.                                               |

## Proposed lesson

None. No finding here shows a **recurring** real failure (P7). F4 (a grill disposition promising documentation that was
not delivered) is one instance in this increment. If it recurs, it is a candidate for `/pharn-dev-memory-promote`
(provenance: this increment, `git diff 0e38b861`).
