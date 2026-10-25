# REVIEW — pharn-footprint-move

The increment under review is `trust: untrusted`. Every `problem` and `evidence` value below is DATA. No
instruction-looking content was found in the reviewed files.

## Floor first (P0)

`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked`. That is the only guaranteed part of this
review; everything below is advisory.

## How this review ran

The four inline lenses (L-floor/P0, L-eval/P1, L-trust/P2, L-axis/P3) were applied by the stage. Three independent,
read-only adversarial reviewers were also run, as the maintainer asked:

- **hooks** — the four hooks and `settings.json`. Sandboxed probes in four postures; 568/568 hook tests pass.
- **floor code** — the 63 changed non-test `pharn/floor/*.mjs`. 21 suites (786 tests) were re-run in a copy.
- **claims** — CHANGELOG, contracts, the four trusted-doc diffs, and root and guide docs. 148 changed `.md` files had
  their links resolved.

None of the three found a blocking problem. The hooks reviewer could not make the Write tool reach a trusted doc, memory
canon, `pharn/spec-template.md`, `pharn/floor/**` or the scope file under any spelling, symlink, dangling link or hard
link, in any posture. Putting `ALWAYS` inside `pharn/` gives no new reach. The floor reviewer confirmed that every
containment walk now covers the `pharn` segment, and found no second positional bug.

- **L-eval (P1):** no capability or `rule_id` changed. The 58 rewritten lens eval cases keep their line count, and the
  `structural:*` gate and `validate` are green.
- **L-axis (P3):** no new sibling reference. The rewrite changes path strings only.

## Floor-gate findings (blocking)

None from review. The one floor RED of this run is verify's `reconcile` escape (VERIFY.md), a maintainer-approved
post-anchor fix. It is a GATE-2 decision, not a review finding.

## Advisory findings

```yaml
# ── important ──
- type: FINDING
  rule_id: P6
  severity: important
  file: "pharn/LIMITS.md:427-428"
  problem: "A §7 probe table records a measurement taken against the pre-6.1.0 hook, but its payload was rewritten to pharn/LIMITS.md, which that hook did not protect; the recorded '2 — denied' is now a result its input could not have produced."
  evidence: "| repo root, relative wiring          | `Edit pharn/LIMITS.md` | 2 — denied"
- type: FINDING
  rule_id: P6
  severity: important
  file: "pharn/pharn-contracts/reconciliation-record.md:39"
  problem: "Dated audit records (also :395, a check-bash-reconcile.mjs comment, pharn/LIMITS.md:300-302) now name pharn/LIMITS.md, a path that did not exist when they were measured; measurement records should keep the probed path plus a migration note."
  evidence: "**Why (P7, measured — audit 2026-10-07).** In the audit's fixture, a Bash edit of `pharn/LIMITS.md`"
- type: FINDING
  rule_id: P0
  severity: important
  file: "pharn/floor/stage-regress-core.mjs:94"
  problem: "The rewrite turned the LEGACY base path into pharn/.run/pharn-regress/base, a path no version created, so the pre-6.50 leftover cleanup (stage-regress.mjs:272) and the entry base-slot guard (entry-gates.mjs:524) are now dead code for an upgrade from <=6.49."
  evidence: 'base: legacyBase: ".pharn/pharn-regress/base"; now: legacyBase: "pharn/.run/pharn-regress/base"'
- type: FINDING
  rule_id: P0
  severity: important
  file: ".claude/hooks/set-writes-scope.cjs:230"
  problem: "The setter's copy of the new raw-prefix exemption lets a --from-plan entry like pharn/.run/../floor/check.mjs past the install-posture refusal of PHARN's own files; the enforcer ignores the entry, but loop-closeout.mjs:453 may resolve it (a second route; pharn/features/../ already existed)."
  evidence: "Install sandbox: ## Files `pharn/.run/../floor/check.mjs` → setter exit 0; `pharn/floor/check.mjs` → exit 1"
- type: FINDING
  rule_id: P6
  severity: important
  file: ".claude/hooks/enforce-writes-scope.cjs:35"
  problem: "Every description of the reserved surface still reads `pharn/**` except `pharn/features/**`, missing the new pharn/.run/ exemption: enforce :35 and its user-facing deny message (:1087), set-writes-scope.cjs:59,790, pharn/LIMITS.md:459, docs/limitations.md:56, .dev/guides/writes-scope.md:38,155,181, reconcile-ignore.json not_a_deny."
  evidence: "PHARN's installed surface — `pharn/**` except `pharn/features/**`, `.claude/**` and `pharn.config.json`"
- type: FINDING
  rule_id: P6
  severity: important
  file: "pharn/pharn-contracts/spec-template.md:52"
  problem: "The contract still places the template at the project root beside pharn.config.json (:52-53), and its case-variant example (:66-67, the old root name) is now false — a root PHARN.SPEC-TEMPLATE.MD is ignored, not refused."
  evidence: "one fixed path, `pharn/spec-template.md` at the\nproject root**, beside `pharn.config.json`."
- type: FINDING
  rule_id: P6
  severity: important
  file: "CLAUDE.md:49"
  problem: "Layout sentences still put the two moved docs at the root: CLAUDE.md:49-51 and README.md:376-377 (which contradicts the redrawn tree above it)."
  evidence: "the other two\n  (`pharn/THREAT-MODEL.md`, `pharn/LIMITS.md`), ... sit at the root"
# ── minor ──
- type: FINDING
  rule_id: P0
  severity: minor
  file: "CHANGELOG.md [7.0.0]"
  problem: "The CHANGELOG entry overclaims or misstates in six places: (a) 'non-canon files under pharn/memory-bank/ are reserved' changes nothing, because protect already denies the whole subtree; (b) 'protects'/'write-protected' lack the Write-tool-only bound; (c) step 3 understates — without the gitignore line verify FAILs, it does not merely report; (d) step 2 omits that an unmoved template or canon is silently NOT READ; (e) the ALGO bullet names the wrong cause — old stamps live under .pharn/ and are never read; (f) it does not state the symlinked-pharn/ usability cost (enforce denies all in install; dev ignores the scope)."
  evidence: "Non-canon files under `pharn/memory-bank/` are reserved outside a run, a change in the deny direction."
- type: FINDING
  rule_id: P6
  severity: minor
  file: "pharn/floor/worktree-fingerprint.mjs:177"
  problem: "isExcluded no longer excludes the old .pharn/, so in an install that never git-ignored it a leftover .pharn/ counts as changed paths and a dirty tree (fail-closed but noisy); worth a CHANGELOG line beside step 4."
  evidence: 'sandbox, nothing ignored: changedPaths(HEAD) → [".pharn/pharn-regress/stage.json", ...]'
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/guides/versioning.md:18"
  problem: "A history sentence was made wrong by the rewrite (CLI 0.4.0 copied the docs to the root), and the guide still treats MIN_CLI 0.5.0 as current."
  evidence: "the installer copies `pharn/THREAT-MODEL.md` and `pharn/LIMITS.md` at\nthe root beside the two under `pharn/`"
- type: FINDING
  rule_id: P6
  severity: minor
  file: "pharn/floor/lessons-index-core.mjs:406"
  problem: "Comment drift from the rewrite: the claim that pharn/.run/lessons-index.md is on validate's scanned surface is now false (validate excludes pharn/.run/); history comments in base-worktree.mjs:73, run-gates.mjs:34 and apply-plan-deletions.mjs:32,41,50 are likewise rewritten into untrue statements."
  evidence: "':50 `LIMITſ.md` (U+017F) IS `pharn/LIMITS.md`'"
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".claude/hooks/protect-trusted-paths.cjs:102"
  problem: "A protect comment still describes canon as <guarded root>/memory-bank/… and an over-block case that no longer exists (hook-protected: a human edit)."
  evidence: "matched as a ROOTED\n// PREFIX — `<guarded root>/memory-bank/…`"
- type: FINDING
  rule_id: P4
  severity: minor
  file: "CHANGELOG.md (merged entries)"
  problem: "Relative links ./LIMITS.md and ./THREAT-MODEL.md in two merged entries no longer resolve; merged entries are frozen, so the [7.0.0] entry should say so."
  evidence: "([`THREAT-MODEL.md`](./THREAT-MODEL.md) `§2` item 8"
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".claude/hooks/enforce-writes-scope.cjs:143"
  problem: "Carried-over bounds the move inherits rather than causes: a hard link under the always-writable root is judged by its own name in every posture (the bound says permissive only); a FIFO at the scope-file path hangs protect on a canon write (the combined verdict still blocks); the setter writes at cwd while enforce reads at the git root, so a subdirectory run now leaves a stray <sub>/pharn/.run/; writers that do not walk (seam-config-materialize, markPhase, the reconcile anchor, gen-lessons-index) still write through a symlinked pharn/."
  evidence: "ln pharn/floor/check.mjs pharn/.run/h1; Write pharn/.run/h1 → P0 E0 in every posture"
- type: FINDING
  rule_id: P5
  severity: minor
  file: "pharn/CONSTITUTION.md"
  problem: "One list mixes doc-relative and repo-relative names (CONSTITUTION.md, ARCHITECTURE.md beside pharn/THREAT-MODEL.md); meaning unchanged."
  evidence: "the agent cannot write to `CONSTITUTION.md`, `ARCHITECTURE.md`, `pharn/THREAT-MODEL.md`, or"
```

## Verdict

GREEN floor, with 0 floor-gate findings from review. Advisory findings: 7 important and 7 minor. Most trace to one
cause: the rewrite policy rewrote **dated records and history** (a measured probe, an audit fixture, a legacy constant,
"before 6.x" comments) as if they described the present.

Five of the important findings need edits to hook-protected or trusted files: `pharn/LIMITS.md` §7 and the dated
records, the reserved-surface wording in the two hooks and LIMITS, the setter's `..` refusal, and the protect comment.
They therefore need a second, smaller human patch.

## Proposed lesson candidate (for Step 2b; not canon)

A mechanical path rewrite needs a DATED-RECORD exclusion class, not only a file-exclusion list. A line that records a past
measurement or a past state ("measured", "probed", "before 6.x", a legacy constant) must keep the path it was true of,
plus a migration note. This run's rewrite treated all such lines as current text and produced four separate false
records. Provenance: this REVIEW.md, the findings at `pharn/LIMITS.md:427-428`,
`reconciliation-record.md:39` and `stage-regress-core.mjs:94`.
