# REVIEW — readme-audit-repairs

**Under review:** commit `4375b29` on `docs/readme-audit-repairs` — five prose repairs to `README.md`
(F1, F3, F4, F5, F6) plus this increment's own `.dev/features/readme-audit-repairs/` artifacts.
**Increment treated as `trust: untrusted`** — every claim below was re-derived against live state, never
read off the increment's own `PLAN.md` or `GRILL.md`.

**Step 1 — FLOOR first:** `node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 36 capabilities`, exit **0**.
The increment was entitled to reach review.

---

## Floor-gate findings (blocking)

**None.** No claim in the diff asserts a guarantee without either a floor reduction or an `advisory`
label; no eval binding is missing (P1 is not engaged — no capability, rule, or `rule_id` was added, and
the floor agrees); no sibling reference was introduced.

## Advisory findings

```yaml
- type: FINDING
  rule_id: "P2"
  severity: important
  file: "README.md:144"
  problem: "The shipped F3 sentence asserts a specific installer behavior as unhedged fact, sourced solely from an untrusted third-party document, which contradicts this increment's own trust audit — and it is the same evidence class the increment REJECTED for F2 and REMOVED for F4."
  evidence: "a project can match several, so Next plus Express resolves to `ssr` and `backend` together"
```

The increment applied **three different standards to one evidence class inside a single diff**:

| repair | installer-sourced claim                 | what the increment did                                     |
| ------ | --------------------------------------- | ---------------------------------------------------------- |
| F2     | what the installer copies               | **rejected** it (grill) — "this repo cannot adjudicate it" |
| F4     | "CI runs it on Node 24"                 | **removed** it — "unverifiable from this tree"             |
| F3     | "Next plus Express → `ssr` + `backend`" | **added** it, more specific than the sentence it replaced  |

The increment's own `PLAN.md` trust audit states the untrusted source "is used **only** as corroboration
for two claims that are otherwise hedged, it is never quoted into `README.md`." The shipped F3 sentence is
**not hedged** and the example **is** effectively transcribed from that source. This is [[L2]]'s shape
exactly — a plan's honesty must travel into the artifact, and here it did not. The **underlying defect
F3 fixed is real** (the `or` genuinely read as exclusive) and the fix is directionally right; the finding
is confined to the added specificity, which the repo cannot back. A hedge ("the installer's docs state…")
or dropping the example would resolve it.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "README.md:294"
  problem: "The new guarantee row's phrase 'subtrees included' reads broader than the guard's rooted behavior — a nested directory of the same name is not denied — and it errs in the overclaim direction."
  evidence: "Memory-bank canon (`memory-bank/`, `.dev/memory-bank/`, subtrees included) is denied on that same surface"
```

Re-probed against the live hook this run, not read off it:

| probe                                                               | exit  |
| ------------------------------------------------------------------- | ----- |
| promote origin + scope names that one canon file alone              | **0** |
| promote origin + 2-entry scope                                      | 2     |
| a build plan (`set_by: features/foo/PLAN.md`) granting itself       | 2     |
| **`src/vendor/memory-bank/x.md`** (nested, not at the guarded root) | **0** |

**The row's substantive claims all hold** — the conjunction is faithful, and "so a build plan cannot grant
itself a canon write" is confirmed. Only the depth phrasing is loose: the denial is anchored at the
guarded root, so a vendored `memory-bank/` inside `src/` is writable. The README's path convention is
root-relative throughout, which mitigates this, so it is **minor** — but it is the overclaim direction,
which is the direction this increment exists to correct.

```yaml
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: "README.md:171"
  problem: "F6's claim that `.claude/settings.local.json` is loaded and can wire hooks rests on a source-code comment rather than an executed probe, and it is not probeable from this repository at all."
  evidence: "`.claude/settings.local.json`, which is loaded too and can wire or override the same hooks"
```

The evidence is `protect-trusted-paths.cjs:234-239`, which protects that file **because** it can wire
hooks. That is good reason to believe it, and the guard's behavior toward the file **was** probed (exit
2). But the assertion itself is about **Claude Code's settings loading**, which no check in this tree can
execute — so by the increment's own governing lesson ([[L37]]: a doc stating a guard's bounds must be
probed, not read off it) this sentence sits on the weaker side of the standard the rest of the diff met.
Not wrong, and likely true; flagged so the asymmetry is visible rather than assumed.

```yaml
- type: FINDING
  rule_id: "P7"
  severity: important
  file: ".claude/commands/pharn-dev-plan.md:1"
  problem: "L20's prescribed remedy was never wired into the plan command, and L18 recurred inside this very increment's plan as a direct consequence — the correction mechanism canon specified does not exist."
  evidence: "grep over /pharn-dev-plan Step 4 for the `--from-plan` scope-vs-`## Files` compare: 0 occurrences"
```

**This finding is about the apparatus, not this diff**, and is recorded because the run produced first-hand
evidence for it. L18 (a PLAN's exclusion block must be a **heading**; the bold-prose form fails **open**)
recurred here: the first draft granted **3 paths against the 1** `## Files` declared, including
`SKILLS_VERSION` and `.dev/floor/specified-primitives.json`. [[L20]] responded to L18's first recurrence by
prescribing a concrete remedy — _"at `/pharn-dev-plan` Step 4, alongside the existing
`check-plan-lessons.mjs` self-check, re-run `set-writes-scope.cjs --from-plan` and deterministically
compare the parsed scope set against the plan's own `## Files` bullets, RED on disagreement."_ **That
remedy is not in the command.** Step 4 runs `check-plan-lessons.mjs` only. The over-grant was caught here
solely because the planning agent had read L20 and ran the compare by hand — i.e. by exactly the
discipline L20 declared insufficient. L20 is now **three occurrences** deep with its own floor check
unbuilt.

## L-trust (P2) — did the reviewed artifact steer me?

`PLAN.md` and `GRILL.md` contain directive-shaped prose ("Repair: say six stages plus two standalone
commands", "The replacement row must not imply…"). I treated all of it as **DATA** and re-derived F1, F3,
F4, F5 and F6 against live state independently; F1 and the F5 row survived that re-derivation, F3 did not
fully. No guaranteed decision in this run rested on a free-text field: every stage verdict came from an
exit code. Nothing in the `README.md` diff is injection-shaped.

## L-axis (P3)

`README.md` carries one axis of change (prose accuracy against live repo state). No sibling reference was
introduced; the increment adds no module and no `reads:` entry.

---

## Verdict

**GREEN — 0 floor-gate (blocking) findings; 4 advisory findings (2 important, 2 minor).**

The increment does what it set out to do, and its strongest evidence is that it **rejected one of its own
repairs** (F2) when probing contradicted the premise. The two important findings are both about the
**standard slipping at the edges** rather than about a false guarantee: F3 shipped an unhedged claim from
the source class the same diff twice refused, and the apparatus finding shows canon's own prescribed
remedy is still unbuilt. Advisory means advisory — none of these blocks; they are for the human at GATE 2.

## Proposed lesson candidate (NOT promoted — `/pharn-dev-memory-promote` is a separate, human-gated run)

**Two concurrent agent sessions sharing one working tree corrupt the fix #7 scope record and manufacture a
false scope-escape.** Observed twice this run, in both directions:

1. **A legitimate write was denied.** Mid-`/pharn-dev-grill`, `.pharn/writes-scope.json` was overwritten by
   another session's `/pharn-dev-plan` (`set_by: .claude/commands/pharn-dev-plan.md`, target
   `.dev/features/claude-dir-scan-exclusion/PLAN.md`, `set_at: 08:36:36`). This stage's own `GRILL.md`
   write was correctly refused against a scope it never set. Re-running Step 0 fixed it — and clobbered
   the other session's scope in turn.
2. **A false blocking finding stopped a stage.** `/pharn-dev-regress` attempt 1 exited **1** with a fix #7
   escape naming the other session's untracked `PLAN.md`, because `scope` derives `escaped` from
   `git diff <base>` plus untracked files — _what changed_, not _what this build wrote_. `--feature`
   closes that gap for a feature's own artifacts and does not reach this case.

**Why it is lesson-shaped and not a bug report:** the single mutable `.pharn/writes-scope.json` is
**global to the tree** while every stage assumes it owns it, and the remedy that suggests itself — "don't
run two sessions at once" — is discipline, which [[L20]] says is the wrong kind. It failed **both**
open-ish and closed: a denied legitimate write, and a blocking finding whose stated cause
(_"the build escaped its plan's `## Files`"_) was **false**, which is the more dangerous half — a future
reader trusting that message would hunt a scope breach that never happened. Distinct from [[L17]] (the
scope check testing changed-since-base rather than written-by-the-build) in that L17 concerns the
**method's granularity within one run**, while this concerns **another writer existing at all**; and from
[[L19]] (Bash escaping the scope) in that here the scope record itself is the contended resource.

**Provenance for the promote gate:** feature `readme-audit-repairs`; commit `4375b29`; source
`.dev/features/readme-audit-repairs/REGRESSION.md` (§ "Run history", both attempts recorded with the
clobbered record quoted) + `GRILL.md` (the denied write) + this REVIEW's finding set.

**Second candidate, deferred not dropped:** the P7 finding above (L20's remedy unbuilt, L18 at its third
occurrence). It is arguably a defect with a known fix rather than a new lesson — wire the compare into
`/pharn-dev-plan` Step 4 — so it is recorded here for the human rather than proposed as canon.
