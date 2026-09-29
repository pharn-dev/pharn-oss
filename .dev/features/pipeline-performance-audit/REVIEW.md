# REVIEW — pipeline-performance-audit

Reviewed by `/pharn-dev-review` on 2026-09-29. The increment under review is `trust: untrusted`. Every `problem` /
`evidence` value below inherits that tag and is quoted DATA (P2).

**Scope.** An analysis-only increment:

- `PLAN.md` and `GRILL.md`;
- `audit.mjs`, a read-only helper;
- `.dev/measurements/pipeline-performance-audit-2026-09-29.md`, the report;
- one `CHANGELOG.md` `[Unreleased]` entry;
- the stage artifacts (`REGRESSION.md`, `regression-report.json` `no-regressions`, `VERIFY.md`, `verify-report.json`
  `PASS`).

No product-surface byte changed (`git status`: only `CHANGELOG.md` modified, plus the two untracked apparatus paths), so
there is correctly no `SKILLS_VERSION` bump.

## Step 1 — Floor first (P0)

- `node pharn/floor/validate.mjs .` → **exit 0**, `FLOOR: GREEN — 36 capabilities checked`.
- `npm run check:changelog` → GREEN (`1 dated [Unreleased] entr(ies)`).
- `node .dev/floor/check-changelog-entry.mjs --base-ref HEAD` → GREEN (1 new entry; no merged entry or released heading
  changed).
- `node .dev/features/pipeline-performance-audit/audit.mjs --self-test` → `{"ok": true, "checks": 14, "failed": []}`,
  exit 0.

That is the only guaranteed part of this review. **No floor gate reads the report's figures** (VERIFY.md says so), so
everything below is **advisory**.

## Reproduction of the report's figures (advisory, re-run live)

| report figure                                                                                                                                                                                                                                                                                                          | re-run                                                                                                                                                                                                                                                                                          | result                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| §1 ledger table (69 / 0 / 0 / 0·0·0, 56 + 13, `partial` ×69, GREEN ×69, 49 multi-context, 3 shared window starts, 2 exclusion reasons)                                                                                                                                                                                 | `audit.mjs --ledgers ~/Projects/pharn-starter/pharn/features/*/cost.json`                                                                                                                                                                                                                       | **matches** exactly (the 49 are all 6.12.1)                             |
| byte figures (43,164 / 35,982 / 11,091 / 11,223 / 31,211 / 28,179; 7,958; 19,848 / 17,929; 172,421 / 387,549; briefs 2,498–4,063)                                                                                                                                                                                      | `audit.mjs --static --project ~/Projects/pharn-starter` at `c9737b4`                                                                                                                                                                                                                            | **matches**                                                             |
| route `inline:config-red` on every routed cell for pharn-starter                                                                                                                                                                                                                                                       | same run                                                                                                                                                                                                                                                                                        | **matches** (every `project_route` exit 3)                              |
| pinned blocks: Step 1a 5, Step 3 5, Step 4 14, Step 5 10; close 6b 8, 6c 5, Step 7 1, Final 2                                                                                                                                                                                                                          | same run                                                                                                                                                                                                                                                                                        | **matches** as section counts (but see F2 on what they count)           |
| 29,581 B (2,498 + 7,958 + 19,125, ship test) … 37,485 B (3,266 + 7,958 + 26,261, quick-loop spec)                                                                                                                                                                                                                      | arithmetic                                                                                                                                                                                                                                                                                      | **follows**                                                             |
| 7.4k–9.4k tokens; 7–9% of 102,546                                                                                                                                                                                                                                                                                      | 29,581 / 4 = 7,395; 37,485 / 4 = 9,371; 7.2% and 9.1%                                                                                                                                                                                                                                           | **follows** arithmetically (see F5 on whether it may be stated)         |
| 66 = 5 + 5 + 14 + 10 + 16 + 5 + (2 × 4) + 3; 19 = 10 + 1 + 8                                                                                                                                                                                                                                                           | arithmetic                                                                                                                                                                                                                                                                                      | the sums **follow**; the inputs do not all hold (F2)                    |
| "about 60 of the 66" deterministic                                                                                                                                                                                                                                                                                     | 66 − 5 Agent calls − 3 model file operations − 2 slash-command invocations = 56                                                                                                                                                                                                                 | **does not follow** (F2)                                                |
| 37,777 B = 19,848 + 17,929; ~9.4k tokens                                                                                                                                                                                                                                                                               | 37,777 / 4 = 9,444                                                                                                                                                                                                                                                                              | **follows**                                                             |
| ~0.5M = 5 × 102,546; ~1M = 10 × 10⁵                                                                                                                                                                                                                                                                                    | 512,730; 1,000,000                                                                                                                                                                                                                                                                              | **follow** arithmetically (see F3 on the token class)                   |
| 2.25× = 387,549 / 172,421                                                                                                                                                                                                                                                                                              | 2.248                                                                                                                                                                                                                                                                                           | **follows**                                                             |
| CH1: 37 transcripts, min 34,936, median 102,546, max 129,648; 15 with ~31k cache read; opus since 09-27 122,475–129,648                                                                                                                                                                                                | `find ~/.claude/projects/-Users-…-pharn-oss -path '*/subagents/agent-*.jsonl' -mtime -8 -exec audit.mjs --prefix {} +` → now 38 transcripts, median 102,781, max 130,176 (this review's own agent added one). Recomputed without that transcript: n 37, min 34,936, median 102,546, max 129,648 | **right when taken**; see F4 (population) and F9 (selection not stated) |
| CF1 10.1–10.6 s → 4.4 s; checkouts / installs / base gates 1 / 1 / 3 → 0; all gates 6 → 3                                                                                                                                                                                                                              | `.dev/features/regress-base-reuse/MEASUREMENT.md`                                                                                                                                                                                                                                               | **matches**                                                             |
| CF2 4.8–4.9 s → 2.5 s; verify 4 → 2; total 12 → 10; `test` 0.3 s                                                                                                                                                                                                                                                       | `.dev/features/verify-head-gate-reuse/MEASUREMENT.md`                                                                                                                                                                                                                                           | **matches**                                                             |
| code claims: `ROUTE_POLICY` cells; `test` ∈ `NON_REUSABLE_IDS`; effort inherited; brief rule 7; `/pharn-build` Step 4; cap default 3; 570 s budget; `ship-closeout-script`, `gate-process-duration`, `stage-agent-effort` named; regress HEAD runs the outside-scope test subset; pharn-starter's `models` block shape | read live (`stage-agent-core.mjs`, `gate-run-core.mjs:238`, `pharn-loop.md`, `pharn-build.md`, `stage-regress.mjs:504/542`, `CHANGELOG [6.32.0]`, `[6.35.0]`, pharn-starter `pharn.config.json`)                                                                                                | **all correct**                                                         |

- **Home paths.** No committed file of the increment contains a home-directory path. A grep for `/Users/`, the
  account name, `/home/` and `/private/tmp` finds nothing, and the helper's printed paths are `~`-redacted.
- **"Do not optimize yet" and "Recommended next increments".** Both follow from the evidence in their structure: every
  candidate is gated on real-run confirmation or on E1. One exception, the first "Do not optimize yet" row, rests on
  F5.

## Lenses

- **L-floor (P0).** The report claims no floor guarantee. Its "What this audit may claim" block labels the estimates
  and root causes advisory. But the report states discipline rules of its own and does not keep them:
  - "Token classes are always kept apart" (broken: F3);
  - "Figures with different sources are never expressed as percentages of each other" (broken: F5);
  - "Every number carries a source and a precision" (broken: F9).

  Several headline sentences also state more than static or controlled evidence can carry (F1, F4, F5, F7). All of
  these are advisory, because no guaranteed decision rests on the report.

- **L-eval (P1).** No `role:`-bearing capability was added, so no eval binding is owed. The floor agrees: validate is
  GREEN over 36 capabilities, the same set as before. The helper's `--self-test` covers the version compare,
  `classify` and the block counter. It does **not** cover `storedProfile`, which is where F6 lives.
- **L-trust (P2).**
  - The helper prints no free text from pharn-starter or from the transcripts. It prints only enum and numeric fields,
    the checker's exit, WARN count and context count, and slugs as directory names.
  - The checker is spawned with an argv array and no shell.
  - The report quotes no untrusted artifact text.
  - Nothing in the reviewed files addressed this reviewer or changed its behaviour.
- **L-axis (P3).** `audit.mjs` imports `pharn/floor/shelled-verdict-core.mjs` and `stage-agent-core.mjs`. That is the
  permitted `.dev/` → `pharn/` direction, and there is no sibling reference. The helper's four modes all serve this
  one audit.

## Floor-gate findings (blocking)

None.

## Advisory findings (warn — each rests on reviewer judgment of free text or severity)

```yaml
# F1
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/measurements/pipeline-performance-audit-2026-09-29.md:20"
  problem: "The headline 'Most orchestrator requests are deterministic ceremony' (and §4.1's 'Orchestrator requests are mostly ceremony') is a claim about the share of a real run's orchestrator requests, but the evidence is a static count of PINNED calls whose denominator (all orchestrator requests, pinned or not) is unmeasured — the report itself says unpinned verdict reads, resumes, re-runs and extra reads are not counted, and the 6.32.0 entry measured pre-routing /pharn-loop runs at a median of about 200 requests against this count of 66; what the static pass supports is 'most PINNED orchestrator calls are deterministic'."
  evidence: "report:20 '**Most orchestrator requests are deterministic ceremony.** In a one-iteration `/pharn-loop`, about 66 orchestrator tool calls are pinned or mandated (estimate).' report:247 'This is a lower bound: unpinned verdict reads, `continue` resumes, re-runs and any extra reads the model makes are not counted.' CHANGELOG [6.32.0]: 'a `/pharn-loop` run made 11–426 requests (median about 200)'"
# F2
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/measurements/pipeline-performance-audit-2026-09-29.md:244"
  problem: "The 66-call estimate sums per-section pinned-block counts as if each were a green-path call, so it is neither the green-path count nor a lower bound: (a) Step 4's 14 includes `check-red-run.mjs --preflight`, which runs only when `check-test-stage.mjs` exits non-zero, so a green run executes 13; (b) it omits mandated calls — the model's Write of LOOP.md in Step 6b, and, because Step 5 pins `/pharn-regress --base <base sha>` and `/pharn-verify` with no name argument, each thin caller's Step 0 slug Write plus its `feature-name.mjs` line; (c) '(2 × 4)' is never reconciled with the sentence's '3 pinned blocks'; and (d) 'About 60 of the 66' does not follow — 66 − 5 Agent calls − 3 model file operations − 2 invocations = 56."
  evidence: "report:241-245 '2 inline stage invocations each carrying 3 pinned blocks of their own (scope set, run, release). Add 3 model file operations … about 5 + 5 + 14 + 10 + 16 + 5 + (2 × 4) + 3 = **66**' report:247-248 'This is a lower bound … About 60 of the 66 run a deterministic script' pharn-loop.md:476-480 'non-zero → decide the row with the checker … node pharn/floor/check-red-run.mjs --preflight' pharn-regress.md Step 0 'A `<name>` this command did not receive as its argument is resolved only through `pharn/floor/feature-name.mjs`: write the slug alone … with the Write tool'"
# F3
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/measurements/pipeline-performance-audit-2026-09-29.md:178"
  problem: "The report says token classes are always kept apart, yet its CH1 headline figure is a blend of three classes (uncached input + cache write + cache read), the ~0.5M per-run figure multiplies that blend, and C1's '~1M cache-read tokens per run' reuses a subagent's first-request figure, which is mostly cache WRITE, as the orchestrator's per-request cache READ; the class-separated numbers the helper already prints differ materially (cache write alone: median 87,766 over the same 37 transcripts, vs the blended 102,546)."
  evidence: "report:48 'Token classes are always kept apart.' report:178-181 'The total of uncached input, cache write and cache read per first request was: min 34,936, median 102,546' report:254-255 'For 5 agents at CH1's median that is about 0.5M first-request tokens per run [e]' report:329-330 'on the order of 10⁵ tokens of cache read per request here, so ~1M cache-read tokens per run [e]'"
# F4
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/measurements/pipeline-performance-audit-2026-09-29.md:23"
  problem: "CH1 is described as general-purpose (and, in the CHANGELOG, stage-agent) first requests, but the helper does not filter by agent type: 6 of the 37 are Explore agents (34,936–46,734 tokens — the whole low tail) and 2 are claude-code-guide agents on haiku, and none is a product stage agent; a PHARN stage agent is always spawned as `general-purpose`, and over the 29 general-purpose transcripts the range is 68,225–129,648 (median 103,607), so the '35k–130k' range in the headline, §4.2 and the CHANGELOG describes a different population from the one the claim is about."
  evidence: "report:23-24 'A new general-purpose subagent's first request carried 102,546 tokens at the median (35k–130k, 37 transcripts).' CHANGELOG.md:35 'a fresh stage agent's first request carrying 35k–130k tokens of fixed prefix, median 102,546, over 37 subagent transcripts in this repo' subagent meta: agent-a8e7deaa2ae78c444 'Explore', agent-a9348ab2f315d84af 'claude-code-guide' (model claude-haiku-4-5)"
# F5
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/measurements/pipeline-performance-audit-2026-09-29.md:190"
  problem: "The '7–9%' that grounds the first 'Do not optimize yet' row expresses a static estimate as a percentage of a CH-sourced figure, which the report's own label rule forbids; §8 then calls it a 'measured contribution' although it is an estimate; it calls it a share of 'a stage agent's first-request context' although the brief, CONSTITUTION.md and the stage command all enter AFTER the first request (the agent's prompt is one line); and the byte sum omits the `pharn/ARCHITECTURE.md §6` read that /pharn-plan, /pharn-grill and /pharn-build prescribe (§6 alone is 4,754 B, the file 23,435 B), so the ratio's numerator understates PHARN-owned text for those three stages."
  evidence: "report:47-48 'Figures with different sources are never expressed as percentages of each other.' report:190-191 'roughly 7–9% of CH1's median prefix [e]' report:470 'PHARN-owned text is roughly 7–9% of a stage agent's first-request context [e] … Negligible measured contribution next to the prefix' pharn-build.md:49 'Read the `pharn/ARCHITECTURE.md §6` build-stage row'"
# F6
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/pipeline-performance-audit/audit.mjs:120"
  problem: "`by_stage_context` labels a request 'main' only when `sidechain === false`, treating 'the session's main thread' as 'the orchestrator'; the cost-ledger contract says that since 6.29.0 the orchestrator may itself be an agent (membership.context `agent:<id>`), whose own rows are `sidechain: true`, so for any /pharn-loop or /pharn-ship run started inside an agent every orchestrator request is counted as 'agent' — and C1/C2's one pre-registered adoption gate ('`main`-context requests are at least 20% of a run's requests') would read near 0% and stop; the function is not covered by --self-test and has never run on a real ledger (0 eligible), and §5's 'requests[].sidechain separates the orchestrator's rows from the agents' rows' carries the same conflation."
  evidence: 'audit.mjs:120 ''const key = `${r.stage ?? "(unattributed)"} · ${r.sidechain === true ? "agent" : "main"}`;'' cost-ledger.md:473-474 ''Since 6.29.0 that holds whether the orchestrator is the session''s own thread or itself an agent'' cost-ledger.md:105 ''"context": "agent:<the agent id that printed the run''s markers>"'' report:344-345 ''In real ledgers, `main`-context requests are at least 20% of a run''s requests. That threshold is pre-registered here.'''
# F7
- type: FINDING
  rule_id: "P6"
  severity: important
  file: ".dev/measurements/pipeline-performance-audit-2026-09-29.md:98"
  problem: "§1 attributes to its sources more than they say: (a) CHANGELOG [6.32.0] does not say its 37 orchestrator transcripts predate 6.27.0 routing, and does not place them in pharn-starter (it says 'on the maintainer's machine'); (b) the checker's WARN reports how many contexts a run-window/1 ledger's rows come from, which is not proof of FOREIGN rows (a run's own spawned agents are contexts that run-window/2 also counts), yet §1 and §8 read the 49 as rows of concurrent or other contexts; (c) the PLAN's inventory item, the 2026-09-21 `pharn-loop-run` transcript (this repo's worktree, SKILLS_VERSION 6.6.0 on that date), is dropped from 'Other real run records' without a word, though the PLAN said the build re-counts each. The exclusion conclusions themselves still hold on independent evidence (pharn-starter records 6.12.1; 6.6.0 < 6.32.0)."
  evidence: "report:97-98 'pharn-starter's install record reads 6.12.1 since 2026-09-23, and the 6.32.0 entry says its 37 predate 6.27.0 routing.' CHANGELOG [6.32.0] 'measured in 37 orchestrator transcripts on the maintainer's machine' report:88 '`run-window/1` counts concurrent contexts' rows. The checker names 49 such ledgers.' report:479 '49 carry other contexts' rows (L24)' PLAN.md:47-48 'one real `/pharn-loop` transcript in `~/.claude/projects/…pharn-loop-run/`, dated 2026-09-21'"
# F8
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/pipeline-performance-audit/audit.mjs:276"
  problem: "The header says the helper 'writes nothing', but `--static --project` shells `stage-agent.mjs route … --name demo-feature` with cwd set to this checkout, and route, on exit 0, calls `clearResult`, which unlinks `.pharn/<pharn-ship|pharn-loop>/demo-feature/stage-result.json` if one exists; the recorded run deleted nothing only because every pharn-starter route exited 3, so a project whose config routes would make the helper perform a delete."
  evidence: "audit.mjs:3 'It prints one JSON document on stdout and writes nothing: no file, no .pharn/ state, no git write.' stage-agent.mjs:514-515 'if (d.exit === 0) { const why = clearResult(root, o.command, o.name);' stage-agent.mjs:325 'unlinkSync(path);'"
# F9
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/measurements/pipeline-performance-audit-2026-09-29.md:7"
  problem: "The report's sourcing rules are stated more strongly than they are kept: 'Every number below is printed by audit.mjs' is false for the CF1/CF2 figures (read from the two MEASUREMENT.md files) and the 2026-09-23 install date; §1's ledger counts and the §2 table's byte figures carry no source/precision label, and the label set has no member for real PRE-optimization evidence; C2's 'about −10 to −13' has no formula although derived figures promise one; and CH1's input set (the `find … -mtime -8` over this project's `subagents/` transcripts) is not stated, so the 37 / 102,546 cannot be reproduced once the window moves (today: 38, median 102,781)."
  evidence: "report:7-8 'Every number below is printed by `.dev/features/pipeline-performance-audit/audit.mjs`. The mode is given with each figure, or the figure is arithmetic on printed numbers with its formula shown.' report:36 'Each figure carries a **source** and a **precision**' report:120 '`audit.mjs --prefix` over this repo's subagent transcripts' report:362 'Requests: about −10 to −13 per run [S·e]'"
# F10
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/pipeline-performance-audit/audit.mjs:255"
  problem: "Smaller helper defects: (a) every build brief is measured at `--iteration 2` only (loop 4,063 B; iteration 1 is 3,598 B), undisclosed, so the report's '2,498–4,063 B' upper end applies only to a rebuild; (b) a crashed or unusable checker blocks the token metric but adds no closed reason, so such a ledger leaves the token denominator without appearing in `excluded_by_reason` (the rule says no exclusion is silent); (c) a ledger that parses to a non-object (e.g. `null`) throws in `classify` and crashes the whole run; (d) `--project` with no value silently drops the project section."
  evidence: 'audit.mjs:255 ''if (stage === "pharn-build") argv.push("--iteration", "2");'' audit.mjs:78 ''if (checker === "red") reasons.push("ledger-red");'' audit.mjs:147-153 ''ledger = JSON.parse(readFileSync(p, "utf8")); … const c = classify(ledger, …'' report:168 ''then its brief, 2,498–4,063 B [S·m]'''
```

## Verdict

**GREEN — 0 floor-gate findings.** 10 advisory findings, 0 of blocking severity:

- **important ×5:** F1, F3, F5, F6, F7;
- **minor ×5:** F2, F4, F8, F9, F10.

The floor passed, and the stage artifacts agree: regress `no-regressions`, verify `PASS`, both CHANGELOG checks GREEN.
Every figure the brief asked to re-check reproduces, or reproduces as of when it was taken. The report is honest about
its central limit: 0 of 69 real runs are post-optimization, and every candidate is gated on real-run confirmation.

The advisory findings are about the report stating more than its evidence carries, in its own words:

- a pinned-call count read as a share of requests (F1);
- token classes blended despite its own rule (F3);
- a cross-source percentage called "measured" (F5);
- a citation the source does not make (F7).

One helper defect bears on the recommendations: F6 would misread the one pre-registered adoption gate for any run
started inside an agent. Fix it before the helper's first real-ledger pass.

## Lesson candidate (proposed, not written — P2/P7)

None proposed. The nearest candidate is "a context split read from `sidechain` conflates the session's main thread
with the orchestrator" (F6). This is its first occurrence, and nothing has consumed the helper's output on real data
yet, so it does not meet P7's real-recurrence bar (L20: the second occurrence is the trigger). If a later
cost-ledger consumer repeats it, propose it then, with provenance `pipeline-performance-audit` / F6.

## Re-review after the GATE-2 fix build (2026-09-29)

Re-reviewed by `/pharn-dev-review` after the fix build. The sections above are the first review, kept as written. The
increment is still `trust: untrusted`, and every `problem` / `evidence` value below is quoted DATA (P2).

### Floor, re-run

- `node pharn/floor/validate.mjs .` → **exit 0**, `FLOOR: GREEN — 36 capabilities checked`.
- `node .dev/features/pipeline-performance-audit/audit.mjs --self-test` → `{"ok": true, "checks": 25, "failed": []}`,
  exit 0.
- `npm run check:changelog` → GREEN (`1 dated [Unreleased] entr(ies)`). `node .dev/floor/check-changelog-entry.mjs
--base-ref HEAD` → GREEN (1 new entry).
- Stage artifacts: `regression-report.json` `no-regressions` (the base map is reused from the first run, and
  `REGRESSION.md` says so); `verify-report.json` `PASS`, `failing_gates: []`.

No floor gate reads the report's figures, so everything below is **advisory**.

### Figures re-run (advisory)

- **`audit.mjs --static --project ~/Projects/pharn-starter`** at `c9737b4`. Every byte figure reproduces:
  - 43,164 / 35,982 / 11,091 / 11,223 / 31,211 / 28,179; 19,848 / 17,929; 7,958; §6 4,754; 172,421 / 387,549;
  - briefs 2,498–4,063 B, with the loop build at 3,598 (iteration 1) and 4,063 (iteration 2).

  Every routed cell for pharn-starter prints `inline:config-red`, exit 3. The block counts per section match (Step 1a
  5, Step 3 5, Step 4 14, Step 5 10; close 6b 8, 6c 5, Step 7 1, Final 2).

- **`audit.mjs --ledgers ~/Projects/pharn-starter/pharn/features/*/cost.json`.** Universe 69; included 0 / 0;
  denominators 0 / 0 / 0; `pre-optimization-version` ×69, `membership-run-window-1` ×56; 6.12.1 ×56, 6.7.0 ×13;
  `partial` ×69; GREEN ×69; 49 multi-context (all 6.12.1); shared window starts 10 / 2 / 2;
  `eligible_excluded_by_metric` empty. This matches §1.
- **`find … -path '*/subagents/agent-*.jsonl' -exec audit.mjs --since 2026-09-23 --until 2026-09-29T07:00 --prefix
{} +`.** 37 transcripts:
  - `general-purpose` 29: cache write 68,223 / 91,759 / 129,646; cache read 0 / 30,927 / 31,428, non-zero in 15;
    uncached input 2;
  - `Explore` 6: cache write 34,934–46,732;
  - `claude-code-guide` 2, on haiku: 72,869–73,357.

  This matches §3 and the CHANGELOG. The fixed window leaves out this re-review's own agent, as intended.

- **Arithmetic, against the command text.**
  - Inputs. `pharn-loop.md`: Step 1a 5; Step 3 5; Step 4 14, of which `check-red-run --preflight` (`pharn-loop.md:479`)
    runs only after a non-zero `check-test-stage`, so 13; Step 5 10. `pharn-loop-close.md`: 6b 8, 6c 5, Step 7 1,
    Final 2, so 16; 6a's 2 and 6d's 1 are off the green path. `pharn-regress.md` / `pharn-verify.md`: the invocation,
    the Step 0 slug Write and `feature-name.mjs` line, the scope set, the script and the release, so 6 each. The loop
    pins both without a name (`pharn-loop.md:535`).
  - 5 + 5 + 13 + 10 + 16 + (2 × 6) + 5 + 4 = 70. 57 = 49 + 2 × 4. The other 13 = 5 + 2 + 2 + 4. 23 = 10 + 12 + 1, of
    which 18 are deterministic. All **follow**.
  - 5 × 91,759 = 458,795 (about 459k) and 5 × 30,927 = 154,635 (about 155k): **follow** (see R3 on "up to").
  - C1 −10 = 5 × 2. C2 −10 to −13 = 14 − k for k 1–4, and the tail is 6 + 5 + 1 + 2 = 14 (see R3 on which two blocks
    precede the Write). C3 −6 = 2 × 3. 37,777 / 4 = 9,444 and 43,164 / 4 = 10,791. 2,498 + 7,958 + 19,125 = 29,581
    and 3,266 + 7,958 + 26,261 = 37,485. All **follow**.
- **Home paths.** None in any file of the increment. A grep for `/Users/`, the account name, `/private/` and
  `/var/folders` hits only the first review's own list of those patterns.

### F1–F10 status

- **F1 — fixed.** Report:25-28, "Most PINNED orchestrator calls are deterministic … The share of ALL orchestrator
  requests these make in a real run is **not** known"; report:585 strikes "most orchestrator requests are ceremony".
- **F2 — fixed.** (a) report:283-284 counts Step 4 as 13; (b) report:288-294 adds each inline stage's slug Write and
  `feature-name.mjs` line, and the `LOOP.md` Write; (c) report:296 uses (2 × 6) and names the six; (d) report:297-299
  derives 57 as 49 + 2 × 4. 70 is now a valid green-path lower bound. Mandated calls it still leaves out are R2.
- **F3 — fixed.** Report:59-60 keeps the classes apart; report:213-218 tabulates CH1 per class; report:320-321 gives
  459k cache write and 155k cache read separately. The blended ~0.5M and ~1M figures are gone.
- **F4 — fixed.** audit.mjs:396-403 and 417-418 group by the `.meta.json` agent type. Report:147-149 and 212-220 use
  the 29 `general-purpose` agents only, and the CHANGELOG says "over 29 such subagents in this repo".
- **F5 — fixed.** Report:232-233, "No ratio of the two is stated (different sources)"; report:204 and 230 add §6
  (4,754 B); report:545 no longer calls the share "measured".
- **F6 — fixed.** audit.mjs:141-145 (`requestRole`) compares the row's context with `membership.context`, and the
  self-tests at audit.mjs:472-494 cover a run started inside an agent. Report:344-347 and 415-416 use the orchestrator
  role.
- **F7 — fixed.** (a) Report:113-114 cites `.dev/features/orchestrator-context/PLAN.md`, whose line 288 does say
  "predate 6.27.0 routing"; (b) report:101-103 says the WARN does not prove foreign rows; (c) report:109-110 lists the
  `pharn-loop-run` transcript and excludes it by date.
- **F8 — fixed.** audit.mjs:4-6 states the exception; audit.mjs:307, 332 and 339 run the route probe with its cwd in a
  temp directory that is then removed. `brief` writes nothing (stage-agent.mjs:526-538).
- **F9 — fixed as raised.** Report:12-14 names the CF1/CF2 and install-date exceptions; report:67 labels §1 `[H·m]`
  and report:176 the §2 table; report:48 adds `H`; report:434-435 gives 14 − k; report:140-149 states CH1's input set
  over a fixed window. The fix added a quoted figure outside that list (R3).
- **F10 — fixed.** (a) audit.mjs:315 renders the build brief at iterations 1 and 2, and report:200-201 says which is
  which; (b) audit.mjs:100 names `checker-<verdict>` per metric; (c) audit.mjs:190 reads a non-object as `unreadable`
  (re-run: `null` and `[1]` both read `unreadable`, no crash); (d) audit.mjs:533 exits 2 on a bare `--project`
  (re-run: exit 2).

### Lenses, re-applied

- **L-floor (P0).** The report still claims no floor guarantee. Its own discipline rules now hold, except where R1–R3
  say otherwise.
- **L-eval (P1).** No `role:`-bearing capability was added. validate is GREEN over the same 36 capabilities.
- **L-trust (P2).** The new route probe and the `--prefix` grouping print only closed tokens, numbers, basenames, model
  ids and the `.meta.json` agent type. The checker and probes are still spawned with argv arrays and no shell. Nothing
  in the reviewed files addressed this reviewer or changed its behaviour.
- **L-axis (P3).** The same two imports, in the permitted `.dev/` → `pharn/` direction. No sibling reference.

### Floor-gate findings (blocking)

None.

### New advisory findings

```yaml
# R1
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/measurements/pipeline-performance-audit-2026-09-29.md:32"
  problem: "The report and the CHANGELOG say unconditionally that the project's `test` gate runs at least three times per iteration, but at regress `test` runs only over the outside-feature test files and is recorded `no-files`, without running, when that subset is empty (a case the regress script proceeds through silently, such as every test file being declared by the PLAN or AC-TESTS.md); the static floor is therefore two (the build agent's gate and verify), with three or four only when an outside-feature test file exists."
  evidence: 'report:32 ''**The project''s `test` gate runs at least three times per iteration:**'' CHANGELOG [Unreleased] ''the project''s `test` gate running at least three times per iteration'' run-gates.mjs:964-967 ''if (needsFiles && next.files.length === 0 && rec.stage === "regress") { exit = 0; ran = false; reason = "no-files";'' stage-regress.mjs:636-638 ''An EMPTY outside-scope partition with a NON-empty universe (every discovered test happens to live INSIDE the feature) is legitimate and must proceed silently'''
# R2
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/measurements/pipeline-performance-audit-2026-09-29.md:304"
  problem: "70 is called 'the count of pinned or mandated calls', but the green path mandates further orchestrator calls it leaves out: Step 1b's lookup of a prior LOOP.md, Step 6b's Read of the loop-record contract, Step 6c's post-commit `git rev-parse HEAD`, and Step 7's reads of RUN-REPORT.md and the pre-run snapshot; so 70 is a lower bound on that count (up to about 75 with these). Separately, 'every call is a model request' does not hold for independent calls issued in one turn, which the loop command itself says add no request."
  evidence: "report:304-305 'So 70 is the count of pinned or mandated calls, not the run's request count.' report:27 'Every call is a model request that carries the orchestrator's whole context.' pharn-loop.md:171 'Look for `pharn/features/<slug>-<N>/LOOP.md` with the highest existing `<N>`' pharn-loop-close.md:50-51 'Read the contract and follow its canonical template' pharn-loop-close.md:250 'On success, capture the SHA for the summary (`git rev-parse HEAD`).' pharn-loop-close.md:311 'print `pharn/features/<name>/RUN-REPORT.md`'s `## Tokens` table and its `## Files` list' pharn-loop-close.md:308 'any committed path that was already dirty in the pre-run snapshot' pharn-loop.md:321 '(two Reads in one turn add no request)'"
# R3
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/measurements/pipeline-performance-audit-2026-09-29.md:420"
  problem: "Small inaccuracies the fix build introduced: (a) C2 names 'the LOOP.md scope set and its amend' as the two close blocks that must precede the LOOP.md Write, but those two lines are one fenced block, and the second pre-Write block is Step 6b's `git rev-parse HEAD` commit capture (the 14-block tail still holds); (b) the sourcing note lists two exceptions to 'figures come from audit.mjs', but the fix added a third quoted figure, CHANGELOG [6.32.0]'s 11–426 requests, median about 200; (c) 'up to about 155k' is five times the median hit (30,927), not the largest (5 × 31,428 = 157,140), and 155k is missing from the claims block's list of estimates; (d) the 459k, 155k and 9.4k figures carry a precision label (`[e]`) but no source, although the label rule says every figure carries both."
  evidence: "report:420-421 'Two of them (the `LOOP.md` scope set and its amend) must precede the model's `LOOP.md` Write.' pharn-loop-close.md:43-46 (one bash fence holding set-writes-scope.cjs and reconcile-baseline.mjs --amend-scope) pharn-loop-close.md:62-64 'git rev-parse HEAD 2>/dev/null || echo unknown' report:12-14 'There are two exceptions: CF1/CF2 are quoted from their `MEASUREMENT.md` files, and pharn-starter's install date' report:305-306 'the 6.32.0 entry measured pre-routing loop runs at 11–426 requests, median about 200 `[H·m]`' report:321 'plus up to about 155k cache-read tokens [e] (5 × 30,927)' report:579 'Every estimate: 70 calls, 57, 23 per iteration, about 459k, −10, −10 to −13, −6, about 9.4k, about 10.8k.' report:43 'Each figure carries a **source** and a **precision**'"
```

None of R1–R3 changes a recommendation. R1 and R2 are structural statements a little stronger than the code supports.
R3's items are wording and labels.

### Re-review verdict

**GREEN — 0 floor-gate findings.** F1–F10: all 10 fixed. **3 open advisory findings** (R1, R2, R3, all minor), none of
blocking severity. The report's own claim that it "applies the review's findings F1–F10", and the CHANGELOG's "the
review's ten advisory findings were fixed", both hold. R1 also applies to the CHANGELOG entry's wording.

No lesson candidate is proposed (P7): R1–R3 are first occurrences.
