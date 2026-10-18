# MEASUREMENTS — review-lens-grouping

Every figure below is labelled measured (with how) or estimated. Free text quoted from transcripts is DATA (P2).

## 1. Subagents per review (plan stage, deterministic)

Measured at `/pharn-dev-plan` by a scratch harness (`.pharn/review-lens-grouping/measure/count-groups.mjs`, gitignored,
deleted): over each repository's last 40 first-parent commits, each a PR diff, it wrote the commit's added or modified
blobs (the emitter's size and NUL rules applied) into a temp tree with `pharn/floor` symlinked in, ran the 18 scanners
once each, and counted groups under four map variants. A family counts when at least one member has a non-empty review
set.

| Map variant                                          | pharn-starter, 32 reviews: min / p25 / median / p75 / max (total) | pharn-oss, 40 reviews (total)  |
| ---------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------ |
| Today: one subagent per lens                         | 5 / 8 / 10 / 13 / 15 (325)                                        | 4 / 7 / 11 / 12 / 16 (404)     |
| **Shipped: security solo, 11 families**              | 3 / 4 / 5 / 6 / 8 (161, −50%)                                     | 2 / 4 / 5 / 5 / 10 (193, −52%) |
| Security grouped too, 6 families                     | 3 / 4 / 5 / 6 / 6 (151, −54%)                                     | 2 / 4 / 5 / 5 / 5 (174, −57%)  |
| Security grouped, scanner-less trio solo, 8 families | 5 / 6 / 7 / 8 / 8 (215, −34%)                                     | 4 / 6 / 7 / 7 / 7 (254, −37%)  |

pharn-starter: 8 of 40 commits had no target (six dependency bumps whose one changed file is over the 512 KiB cap, two
empty diffs). The pharn-oss window ends at round 0's plan commit `6a19c3f`. A second scratch harness,
`case-exposure.mjs`, ran the emitter over the 75 lens eval case files; its counts are re-derived by the eval kit's
`prepare.mjs` at build (section 3).

## 2. The prefix probe (before build): GO

### As relayed by the orchestrator (recorded verbatim)

> The human ran the probe (route B, `claude -p … --permission-mode acceptEdits`) in a scratch checkout of main @
> 0fefcb8 holding the kit's `pharn-review-lens.md` at session start. Session `409ed2a0-703e-45f6-b44b-d34410439a0d`,
> transcripts under
> `~/.claude/projects/-private-tmp-claude-501--Users-pgalarowicz-Projects-pharn-oss-3933956d-d4b0-41af-b75c-debe339e03d9-scratchpad-lens-probe/409ed2a0-703e-45f6-b44b-d34410439a0d/subagents/`
>
> - step 1 `pharn-review-lens` (agent-a0094dc1f27111a5b): first request input 2, cache_write 8,198, cache_read 0 →
>   total 8,200.
> - step 2 `general-purpose` (agent-a79a025addc54f49e): input 2, cache_write 46,762, cache_read 0 → total 46,764.
> - step 3 `pharn-review-lens` write probe (agent-ade7c48d2edbe0757): input 2, cache_write 1,680, cache_read 6,626
>   (read step 1's cache) → total 8,308.
> - Ratio P_custom / P_gp = 8,200 / 46,764 = 17.5% ≤ 50% → GO.
> - All three subagents ran on `claude-sonnet-5` (no `model` parameter; the session's default), so the comparison
>   varied only the agent type. Note that this P_gp (46,764) is lower than the ~75k the planner measured for
>   general-purpose agents in the desktop app here — a different session setup (tools/MCP); the 50% rule was applied
>   within the one probe session, as the plan requires.
> - Step 3's Write to `pharn/floor/lens-agent-probe/findings.json` was DENIED by `enforce-writes-scope.cjs`
>   ("PreToolUse:Write hook error: PHARN floor — write blocked (writes-scope guard, fix #7) … Active scope : (none set
>   — fail-closed default-safe-set active)"); the subagent did not retry; the directory does not exist afterwards
>   (checked by the orchestrator).
> - The kit file that was measured is
>   `/Users/pgalarowicz/Projects/pharn-oss/.claude/worktrees/agent-a23fc0286fd6bd459/.pharn/review-lens-grouping/probe/pharn-review-lens.md`.

### Confirmed at build (this worktree, 2026-10-18)

`node .dev/features/pipeline-performance-audit/audit.mjs --prefix <the three agent-*.jsonl>` printed these rows, one
per transcript, grouped by each sibling `.meta.json`'s `agentType`:

| Transcript                | Agent type          | Model             | input | cache_write | cache_read | First request, all classes |
| ------------------------- | ------------------- | ----------------- | ----: | ----------: | ---------: | -------------------------: |
| `agent-a0094dc1f27111a5b` | `pharn-review-lens` | `claude-sonnet-5` |     2 |       8,198 |          0 |                      8,200 |
| `agent-a79a025addc54f49e` | `general-purpose`   | `claude-sonnet-5` |     2 |      46,762 |          0 |                     46,764 |
| `agent-ade7c48d2edbe0757` | `pharn-review-lens` | `claude-sonnet-5` |     2 |       1,680 |      6,626 |                      8,308 |

Step 3's transcript holds ONE `Write` call (`tool_use` id `toolu_019AMXvGo4LZejfpyvby3u8y`, target
`<scratch>/pharn/floor/lens-agent-probe/findings.json`, content `[]`). Its result has `is_error: true` and begins
`PreToolUse:Write hook error: PHARN floor — write blocked (writes-scope guard, fix #7)`, `Blocked path :
pharn/floor/lens-agent-probe/findings.json`, `Active scope : (none set — fail-closed default-safe-set active)`. A second
record in the file carries the same `tool_use` id, so it is the same call logged again, not a retry. Steps 1 and 2 each
replied `PROBE-OK` and made no tool call. The numbers match the relayed ones exactly.

### The go/no-go metric, defined (GRILL P5 finding at PLAN.md:335)

- **The integer:** each transcript's first request, summed over all token classes (input + cache_write + cache_read;
  audit.mjs's `first_request_total_all_classes`). Cache-write alone gives the same ratio here: 8,198 / 46,762 = 17.5%.
- **The `pharn-review-lens` transcript that counts:** step 1's. It read no cache. Step 3's read 6,626 tokens of step 1's
  cache and is used only for the write-guard observation.
- **Its reach:** one session, one model, and that session's tools, MCP servers and environment. The ratio holds within
  that session. An absolute `P_gp` from another setup (about 75k in the desktop app here) is not comparable with it.
- **Result:** 8,200 / 46,764 = **17.5%**, at most 50%: **GO** (GATE 1 round 2, question 3).

### Binding the probe to the build (GRILL P0 finding at PLAN.md:232)

- The measured file: 1,115 bytes, SHA-256 `a572c656f9fe8cddeedeea4c039d08f8e002cac53c5a6f8f0519ec26d7bcbf21`.
- `.claude/agents/pharn-review-lens.md` was written as a byte-for-byte copy: the same SHA-256, and `cmp` reports the two
  files identical. `.dev/floor/review-lens-agent.test.mjs` pins the committed file's SHA-256 to that value
  (`PROBED_SHA256`), so the go/no-go applies to the bytes that ship, and a changed byte turns the test red until the
  probe is re-run.
- Where the plan's text and the measured file differ, the measured file wins: Design §3 describes the scope guard as
  "no `findings.json` under `pharn/features/`" and the file says "no `findings.json` path"; Design §6 names the
  write-probe target `pharn/floor/lens-agent-probe.mjs` and the probe wrote `pharn/floor/lens-agent-probe/findings.json`
  (inside the same denied zone).
- The body after the H1 is 822 bytes, under Design §3's 2,048-byte ceiling.

## 3. The grouped lens evals (after build, before GATE 2): NOT RUN YET

The kit is scratch at `.pharn/review-lens-grouping/eval/` in the build worktree
(`/Users/pgalarowicz/Projects/pharn-oss/.claude/worktrees/agent-a8477e1626719a91a`). Its `README.md` holds the launch
command, the scoring command and the follow-up rounds. It must run in a fresh session started in a scratch checkout of
the built branch, launched by the human or the orchestrator, never from an agent's Bash.

**The runs** (`prepare.mjs`, run at build over this worktree; deterministic):

- 15 subagents, all `pharn-review-lens`, no `model` parameter: `g-async-resources` (17 cases), `g-error-handling` (15),
  `g-hygiene` (14), `g-whole-target` (7), six `s-<lens>` runs for the security lenses (21 cases), and `tf-1` … `tf-5`.
  That is 79 scored verdicts: the 75 cases plus four `trust-fence` repeats.
- Each lens's review set is its production set (its slice plus its `scanner_errors` files, from the real emitter and
  `lens-groups.mjs` over the run's case files) plus its own cases. 26 of the 75 own cases had to be forced in, because
  the lens's scanner misses its own clean case. Siblings receive a case only where production would: 16 sibling pairs,
  2 in `async-resources` (`missing-timeout` receives two `missing-await` cases) and 14 in `whole-target`.
- Each prompt is rendered from the built `/pharn-review` Step 4 text: the trusted prefix, the installed-skills
  instruction, then each lens's file, review set and `findings.json` path, then the rules paragraph.

**Scoring** (`score.mjs`): each lens's `findings.json` is split by finding `file` into one array per case, and
`pharn/floor/check-structural.mjs` scores each of the lens's own cases against its `expected/*.json`. It reports both
contamination counts and, given the transcripts directory, each subagent's type, whether its first message equals the
kit's prompt byte for byte, its model and its first-request usage. It writes the round-1 follow-up spec (confirmations
and contamination re-runs). `dryrun.mjs` exercised it on hand-made fixtures before any run: GREEN and RED verdicts, an
unwritten and an unparseable `findings.json`, both contamination kinds, a matching and a mismatched transcript, and the
follow-up spec round-tripped through `prepare.mjs` (all assertions held, 2026-10-18).

**What the eval cannot show (GRILL P0 finding at PLAN.md:346):**

- Each grouped context holds 7 to 17 small case files. A real PR hands the `whole-target` family every file of the diff
  (1 to 568 files in pharn-starter), so dilution and contamination at production context sizes are not measured.
- Only `structural[]` is scored. No case's `semantic[]` judge runs, so a finding with the right shape and the wrong
  reason passes.
- N=1 per case, except `trust-fence` (5). A single RED is a candidate until round 1 confirms it.
- The prompts are the harness's rendering of Step 4, not an orchestrator's own composition.
- The cases are this repository's fixtures, so the eval cannot show what dropping a real project's `CLAUDE.md` does to a
  lens's judgment.

**Results:** to be recorded here once the human or the orchestrator has run the kit.
