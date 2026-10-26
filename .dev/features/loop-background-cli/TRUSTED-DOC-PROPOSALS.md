# Trusted-doc proposals — loop-background-cli

`pharn/LIMITS.md` and `pharn/THREAT-MODEL.md` are human-only: the write hook denies them to the agent (CLAUDE.md, hard
constraint 1). This file holds the exact text proposed for each, as the human chose at GATE 1 ("I write text, you
apply"). **Applied by the human on 2026-10-26, after `/pharn-dev-verify`, with `git apply`:** both sections below, as
written here (the LIMITS bullet's headless sentence was corrected before that apply, from review finding 1). An
earlier apply at 12:51 UTC, inside the build's window, was undone at 12:54 (`REGRESSION.md`).

## When to apply (L68)

Apply **after `/pharn-dev-verify`** of this increment, and **commit** the edit on this branch
(`measure/loop-interactive-cli-attempt1`) before running `npm run check`. Reconcile cannot tell who wrote a file: an
edit made inside the build's anchor→verify window reads as an escape and fails verify, and an uncommitted trusted-doc
edit fails `check:reconcile` (the always-reconciled control surface is anchored in committed blob ids).

Two more things a LIMITS edit can turn red:

- `.dev/floor/stage-load-budget.test.mjs` counts the trusted docs in the stages that read them; the bullet below adds
  about 1.2 KB to `pharn/LIMITS.md`. If the test goes red, its message names the `STAGE_LOAD_CEILINGS` row to raise
  (measured bytes + 10%, rounded up to the next 512).
- A trusted-doc edit changes product bytes. It ships in 7.1.2 only if it lands in this PR; then add one sentence to
  the `[7.1.2]` CHANGELOG entry naming it. If it lands later, it needs its own bump and entry.

## 1. `pharn/LIMITS.md` §8 — one bullet

**Where:** in §8 ("The declared per-stage model configuration is not the executed one"), after the bullet that starts
"**What is not routed runs on the session's model, and the run records why.**" and before "**Deleting the block loses
routing as well as the check.**".

**Text:**

```markdown
- **How a routed stage agent is launched is the harness's choice; `/pharn-loop` waits either way.** Claude Code
  decides whether an Agent call runs in the foreground or the background, and PHARN does not control it. Measured on
  Claude Code 2.1.310's interactive CLI (PHARN 7.1.1, `.dev/measurements/loop-interactive-cli-2026-10-26.md`): every
  stage agent was launched in the background with no `run_in_background` sent, six Agent calls in two runs, and
  `stage-agent.mjs finish --budget-ms` waited each one out; one `--quick` run completed. The residual
  (`pharn/floor/stage-agent-core.mjs`, `stage-agent-background`) is therefore handled by that wait, not gone, and a
  harness that changes its default again changes nothing in PHARN. Headless `claude -p --permission-mode auto` is
  the other measured path: its stage agents ran in the foreground on 6.73.2, which sent `run_in_background: false`;
  headless under 7.1.1, which sends no such parameter, is not measured. One run is not a bound: a stage longer than
  one 570 s wait, the wait's cap, whether `TaskStop` stops an agent left running, other Claude Code versions and a
  full loop are not measured.
```

**And, at the end of §8, beside the two existing provenance comments:**

```markdown
<!-- §8 gained the launch bullet in .dev/features/loop-background-cli, applied by a human (SKILLS_VERSION 7.1.2). -->
```

(Change `7.1.2` if it lands in a later version.)

## 2. `pharn/THREAT-MODEL.md` §5 — one clause in item (4)

**Where:** §5, the paragraph that numbers the free-text channels, item "(4) The **stage-report** channel (6.27.0)".

**Replace:**

```markdown
the Agent tool returns that agent's
final text into the orchestrator's context — a model consuming another model's free text.
```

**With:**

```markdown
that agent's final text reaches the
orchestrator's context — as the Agent tool's result, or, when the harness launched the agent in the background, as
Claude Code's later completion notice (measured on Claude Code 2.1.310's interactive CLI,
`.dev/measurements/loop-interactive-cli-2026-10-26.md`) — a model consuming another model's free text.
```

The rest of item (4) stands: only `finish`'s exit code and closed first line are floor, and the stop is still decided
from the floor verdicts on disk.

## Not proposed

- **`pharn/THREAT-MODEL.md` §4** ("Bypasses the red-team found") names no routed-stage bypass, and a background launch
  is not one, so nothing there is stale.
- **`pharn/ARCHITECTURE.md`** does not describe routed stages (`grep -n -i 'route\|stage agent\|Agent tool'` finds only
  the `.claude/agents/` lines), so there is no sentence to correct.
