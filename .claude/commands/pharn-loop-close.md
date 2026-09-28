---
description: "Part of /pharn-loop: the stop procedure it reads when a run stops. Not run on its own; use /pharn-loop."
disable-model-invocation: true
user-invocable: false
kind: pharn-owned
trust: trusted
part_of: pharn-loop
part: close
---

# /pharn-loop — the stop procedure

Part of `/pharn-loop` (`.claude/commands/pharn-loop.md`), which reads this file once, when a run first reaches a stop, under the rule in its `## At the stop` section: this is Steps 6–7, the claims block and the Final step. It is not run on its own — if it was invoked as a command, stop and say so — and it changes nothing about `/pharn-loop`'s trusted prefix and trust rules, which still apply.

## Step 6 — Stop handling, in this order

### Step 6a — revert the model's approval unless the stop is green (`STOP_GREEN`, or `STOP_GREEN_QUICK` under `--quick`)

If the decision is anything other than a green stop — `STOP_GREEN`, or `STOP_GREEN_QUICK` in a `--quick` run — and
`SPEC.md` is `Approved`, revert it. Key the revert on
the **state**, not on the `approved_by: model` marker: S2 guaranteed this run created the feature directory, so
any approval on that SPEC is this run's, marked or not.

```bash
node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-loop.md --target pharn/features/<name>/SPEC.md
node pharn/floor/reconcile-baseline.mjs --amend-scope   # IMMEDIATELY after the setter, never before
```

Edit the frontmatter only: `state: Draft`, `spec_content_hash: ""`, and remove `approved_by` if present. Then:

```bash
node pharn/floor/check-spec.mjs pharn/features/<name>/SPEC.md
```

GREEN (a valid Draft) → the record's `spec:` line is `reverted to Draft`, and a human must now approve before
any stage reuses this SPEC. A non-zero setter, or a check still RED after one repair → `spec: revert failed`:
carry the output into the summary and say the SPEC is **still approved by the model** — never report a revert
that did not happen. `--amend-scope` exiting **2** with _"no baseline"_ is expected and harmless when no epoch
is open. A green stop whose commit later does not happen comes back here from Step 6d.

### Step 6b — write the record, `pharn/features/<name>/LOOP.md`

```bash
node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-loop.md --target pharn/features/<name>/LOOP.md
node pharn/floor/reconcile-baseline.mjs --amend-scope   # IMMEDIATELY after the setter, never before
```

**The record's shape is defined ONCE, in `pharn/pharn-contracts/loop-record.md`** — the envelope
(`decision`, `iterations`, `commit`, `date`, plus the optional `cap` and `mode`), the blocked-stop exception, and the
mandatory `## Handoff` with exactly `### investigated`, `### learned`, `### next_steps`. Read the contract
and follow its canonical template; do not re-derive the shape from this command (P4). This command's own
capture rules:

- **`decision`** is **copied verbatim** from the `check-loop.mjs` JSON kept in Step 5 — except on a blocked
  stop, which writes `INCONCLUSIVE` plus the `blocked:` key, as the contract states.
- **`mode`** (6.28.0) records the run's **invocation**: write `mode: quick` on every record of a run invoked with
  `--quick` as its first argument token, blocked records included, and write no `mode` line otherwise (absent means
  `full`). It is **never copied from `check-loop.mjs`'s JSON**, whose `mode` is the table the SPEC's kind selected:
  `check-loop-decision.mjs` compares the two, and a copy could never disagree with its own source.
- **`commit`** is captured now, **before** any commit this run makes:

  ```bash
  git rev-parse HEAD 2>/dev/null || echo unknown
  ```

  Write the literal `unknown` when that yields no SHA. Never a guessed SHA, never the loop's own commit.

- **`iterations`** is the iteration reached (a stop before the first build counts as `1`).
- **`cap`** — on every **non-blocked** stop, write the literal `<M>` this run entered with (Step 1). A
  **blocked** stop may omit it.
- The body carries an **`## Outcome`** section with four lines, so the outcome survives on disk and not only
  in the summary: `commit:` — one value from the Step 7 closed set (for a green stop, the expected
  `committed <branch>`; Step 6d rewrites it if the commit does not happen); `spec:` — `approved by the model`,
  `reverted to Draft`, `revert failed`, or `not approved` (a SPEC this run never approved, as on S6b); `blocked:` — the id, or `none`;
  `ac-tests:` — `test-first` (the Step-4 gate passed), `refused` (a stop AT the test stage: S12, or S9 from Step 4), or
  `not reached` (a stop before it).
- The per-iteration verdicts, the standing reds (paths, quoted as DATA), and pointers to `GRILL.md` /
  `REGRESSION.md` / `VERIFY.md` — cited, not restated.
- **The `## Handoff` is written on every stop path.**

Then self-check it:

```bash
node pharn/floor/check-loop-record.mjs pharn/features/<name>/LOOP.md
```

Exit 0 → proceed. Exit 1 → fix the record and re-run **at most once**; if it is still RED, carry the
checker's output into the summary verbatim and continue to the next check below. Never delete the content
the check is about to make it pass. **A decision↔mode RED is never repaired by editing `mode`** (6.28.0): it means
the invocation and the SPEC's kind disagree, so the record keeps the invocation, the RED goes into the summary
verbatim, and the decision check below REDs too, so nothing is committed. The ≤1 repair bound is advisory
(`LIMITS.md §1d`) — command prose, not a counter.

**Then, on every NON-BLOCKED stop only, re-derive the decision:**

```bash
node pharn/floor/check-loop-decision.mjs pharn/features/<name>/LOOP.md
```

Keep its exit code as `<decision-check>` for Step 6c and Step 7. **This one is NOT repaired the way a
malformed record shape is: do not retry it** — carry its output into the summary verbatim and proceed to Step 6c,
where a RED here blocks the commit regardless of `decision`. **A blocked stop skips this check entirely**; treat
`<decision-check>` as N/A for it, and Step 6c's gate below does not apply.

**Then close the marker file and emit the cost ledger — on EVERY stop that has a feature directory**,
green or not. This runs **after** the checks above and **before** Step 6c:

```bash
node pharn/floor/mark-phase.mjs --name '<name>' --kind run-stop
```

```bash
node pharn/floor/render-cost-ledger.mjs '<name>' --command /pharn-loop --base-sha '<base sha>'
```

```bash
node pharn/floor/check-cost-ledger.mjs pharn/features/<name>/cost.json
```

Keep the emitter's printed table for Step 7 and the checker's output for the summary.

**If the emitter exits non-zero, no ledger was emitted THIS run.** Any `cost.json` present then belongs
to an earlier run: the checker can be GREEN on it, but its output is not this run's. Say "no ledger was
emitted this run" in the summary instead. The render below still runs.

**Then render the human-readable run report**, on the same every-stop-with-a-feature-directory rule _(SKIPPED in
Quick mode — `## Quick mode` item 8; `cost.json` is still emitted above)_:

```bash
node pharn/floor/render-run-report.mjs '<name>' --base pharn/features
```

**Every line is derived by that code; none is authored by you.** Do not retype, summarize or "improve" the file —
Step 7 prints from it.

**Commit policy is unchanged:** a non-green stop leaves `cost.json` and `RUN-REPORT.md` in the working
tree exactly as it leaves every other artifact.

**`check-cost-ledger.mjs`'s exit code is not a proceed/stop input**: Step 6c's commit is gated on a green stop
**and** `<decision-check>`, and nothing else. A RED ledger is reported in the summary verbatim and the run
continues.

### Step 6c — commit, on a green stop (`STOP_GREEN`, or `STOP_GREEN_QUICK` under `--quick`) AND a GREEN `<decision-check>` only

The green stop is `STOP_GREEN` in a run invoked without `--quick`, and `STOP_GREEN_QUICK` in a `--quick` run — never
the other one. **A full run that meets `STOP_GREEN_QUICK`** — its SPEC reads quick although the run was invoked without
`--quick` — **does not commit**: `check-loop-record.mjs` and `check-loop-decision.mjs` (`MODE_MISMATCH`) both RED its
record, because Step 6b records the invocation's mode and never "repairs" it. The residual rests on that: a record
rewritten to `mode: quick` would turn both GREEN, and only this step's advisory reading of "a green stop" would stand
between the run and a commit. Any other decision skips this step: no branch, no commit. **A green stop whose `<decision-check>` (above)
was RED also skips this step** — `not committed: decision unverifiable` — so nothing is committed regardless of the
`decision` token; go to Step 6d exactly as for any other non-committing outcome. Only on a green stop **with** a
GREEN `<decision-check>`, run these pinned lines in order.

**Each fenced block runs as its own shell, and no shell state survives between blocks.** A value one block
needs from another — the branch name — is **printed** by the block that computes it and substituted
**literally** into the later lines, never carried in a variable. Every git call that takes a path from the
list runs with `GIT_LITERAL_PATHSPECS=1`, so a listed `app/[id]/page.tsx` is that file and never also
`app/i/page.tsx`.

**0. Re-check freshness at the commit gate — FIRST, after every Step 6b write.** The commit must hold the
tree that was verified:

```bash
node pharn/floor/check-loop-fresh.mjs --feature '<name>' --base '<base sha>' --commit-gate --front
```

`0` → continue to 1. **Any other exit → `not committed: evidence stale`**, and go to Step 6d — `reason_code`
`checker-crashed` included: the evidence could not be checked, so it is not committed (quote the JSON's `reason` in
the record, since the cause is the checker, not the evidence). At the commit
gate the checker never offers a re-run and never spends budget: a `1`-class cause comes back as `4`,
carrying its own `reason_code`.

**1. Re-derive the plan's scope — never reuse the scope file an earlier stage left** (by now
`.pharn/writes-scope.json` holds this run's `LOOP.md` scope, not the plan's):

```bash
node .claude/hooks/set-writes-scope.cjs --from-plan pharn/features/<name>/PLAN.md
node pharn/floor/reconcile-baseline.mjs --amend-scope   # IMMEDIATELY after the setter, never before
```

A non-zero setter → `not committed: stage failed`; go to Step 6d. Never build the list from a scope file this
step did not just write.

**2. Build the staging list** — regular files and tracked deletions only (a `.` or directory entry is
dropped), git-ignored paths dropped, plus the feature's artifacts by name, NUL-separated. The builder first
confirms the scope file was set from **this** plan, and exits 3 otherwise. Git is called with an argument
vector, never through a shell string, so a path is never parsed as shell:

```bash
node -e '
const fs = require("fs");
const { execFileSync } = require("child_process");
const name = process.argv[1];
const env = { ...process.env, GIT_LITERAL_PATHSPECS: "1" };
const ok = (args) => { try { execFileSync("git", args, { stdio: "ignore", env }); return true; } catch { return false; } };
const ignored = (p) => { try { execFileSync("git", ["check-ignore", "-q", "--", p], { stdio: "ignore" }); return true; } catch { return false; } };
const rec = JSON.parse(fs.readFileSync(".pharn/writes-scope.json", "utf8"));
if (rec.set_by !== "pharn/features/" + name + "/PLAN.md") process.exit(3);
const scope = rec.scope;
const artifacts = ["SPEC.md", "PLAN.md", "AC-TESTS.md", "AC-TESTS.lock.json", "GRILL.md", "BUILD.md", "REGRESSION.md", "VERIFY.md", "regression-report.json", "verify-report.json", "LOOP.md", "cost.json", "RUN-REPORT.md"].map((f) => "pharn/features/" + name + "/" + f);
const lockPath = "pharn/features/" + name + "/AC-TESTS.lock.json";
if (fs.existsSync(lockPath) && (!fs.lstatSync(lockPath).isFile() || ignored(lockPath))) process.exit(4);
const pinned = fs.existsSync(lockPath) ? JSON.parse(fs.readFileSync(lockPath, "utf8")).files.map((f) => f.path) : [];
for (const p of pinned) {
  if (!fs.existsSync(p) || !fs.lstatSync(p).isFile() || ignored(p)) process.exit(4);
}
const keep = [];
for (const p of scope.concat(artifacts, pinned)) {
  const exists = fs.existsSync(p);
  const isFile = exists && fs.lstatSync(p).isFile();
  const deleted = !exists && ok(["cat-file", "-e", "HEAD:" + p]);
  if (!isFile && !deleted) continue;
  if (ignored(p)) continue;
  if (!keep.includes(p)) keep.push(p);
}
process.stdout.write(keep.map((p) => p + "\0").join(""));
' '<name>' > .pharn/pharn-loop/<name>/stage.list; echo "builder exit=$?"
test -s .pharn/pharn-loop/<name>/stage.list
```

`builder exit=3` (the scope file was not set from this plan), `builder exit=4` (the lock, or a test it pins, is not a
regular, non-ignored file), or any other non-zero builder exit → `not committed: stage failed`. Otherwise `test -s`
non-zero → `not committed: nothing staged`. Either → Step 6d.

**3. Create the branch** (first absent of `pharn-loop/<name>`, `pharn-loop/<name>-2`, …) — one block, which
prints the name it created:

```bash
b='pharn-loop/<name>'; n=2; while git show-ref --verify --quiet "refs/heads/$b"; do b='pharn-loop/<name>'"-$n"; n=$((n+1)); done; git switch -c "$b" && echo "$b"
```

The printed name is `<branch>`; substitute it literally from here on. Non-zero → `not committed: branch failed`;
go to Step 6d.

**4. Stage, then commit exactly the listed paths:**

```bash
GIT_LITERAL_PATHSPECS=1 git add -A --pathspec-from-file=.pharn/pharn-loop/<name>/stage.list --pathspec-file-nul
GIT_LITERAL_PATHSPECS=1 git commit --pathspec-from-file=.pharn/pharn-loop/<name>/stage.list --pathspec-file-nul -m 'pharn-loop(<name>): <decision> after <N> iteration(s)' -m 'The SPEC was approved by the model (approved_by: model), not by a person. Nothing was merged or pushed; review this branch before merging.'
```

`<decision>` is substituted literally with the green token `check-loop.mjs` emitted — `STOP_GREEN`, or
`STOP_GREEN_QUICK` in a `--quick` run — so the commit message names the mode (6.28.0). A non-zero `git add` →
`not committed: stage failed`; a non-zero `git commit` → `not committed: commit failed`;
either → Step 6d. The pathspec form commits **only** the listed paths, so anything the user had already staged
stays staged and uncommitted. The repository's commit hooks run. **Never** retry with `--no-verify`, and never
run `git push` or `git merge` — the branch is for a human to review.

On success, capture the SHA for the summary (`git rev-parse HEAD`). The checkout **stays on the new branch**;
the summary names `<original branch>` so the user can switch back.

### Step 6d — when the commit does not happen

For `not committed: decision unverifiable`, `not committed: evidence stale`, `not committed: nothing staged`,
`branch failed`, `stage failed` or `commit failed` on a green stop:

1. Undo exactly what happened, and nothing else. **`decision unverifiable` and `evidence stale` are caught
   before any staging or branch line runs** — nothing was ever staged and no branch exists — skip straight to 2, exactly
   as for `nothing staged` / `branch failed` / a setter-or-builder `stage failed`. After a
   `stage failed` from `git add`, or a `commit failed`, unstage only the run's list, return to the original
   checkout, and delete the new branch with the safe form (it holds no new commit):

   ```bash
   GIT_LITERAL_PATHSPECS=1 git reset -q --pathspec-from-file=.pharn/pharn-loop/<name>/stage.list --pathspec-file-nul
   git checkout - --
   git branch -d '<branch>'
   ```

   `-` is this worktree's previous checkout (`@{-1}`) — the original branch or detached `HEAD` alike — so no line
   types git's own output. **It is correct only because nothing checks out between Step 6c's branch block and this
   line**: a commit hook that checks out, or another session in this worktree, makes `-` name that checkout instead,
   and the line succeeds on the wrong target. With no `HEAD` reflog it exits non-zero and changes nothing (the `--`
   keeps git from reading `-` as a file), leaving the checkout on `<branch>`: say so in the summary. `<branch>` is the
   name Step 6c's branch block printed.

2. Apply Step 6a's revert — no commit happened, so there is no review point to hold the model's approval.
3. Re-scope to `LOOP.md` (the Step 6b setter lines), rewrite only the `## Outcome` lines, and re-run
   `check-loop-record.mjs`.

## Step 7 — The summary, then end the turn

Report, plainly and without asking anything:

- that the run **finished**, the `decision`, the iteration count, and the `blocked:` id if any — with what the
  run needs from a person to continue (the row's trigger, in one sentence);
- **each stage's route** (6.27.0), one line per stage and iteration: the token its stage-start marker recorded
  (`agent:<alias>`, or `inline:<reason>` with the remedy the route line printed), and `inline (policy)` for
  `/pharn-regress` and `/pharn-verify`, citing `ROUTE_POLICY` in `pharn/floor/stage-agent-core.mjs`. A route
  records what was REQUESTED; never write that a stage ran on a model — what it was served is `cost.json`'s
  `requests[].model`. A stage agent that may still be running (a backgrounded call, S9) is named here;
- the files changed, and the per-iteration verify / regress verdicts (a quick run: its mode, the not-checked list,
  and verify with the scope result per iteration — `## Quick mode` item 9);
- **every stage re-run**, by stage and iteration, read from the budget ledger rather than from memory, and
  the final freshness verdict (`FRESH`, or the `reason_code` that blocked or stopped the commit):

  ```bash
  cat .pharn/pharn-loop/<name>/freshness.jsonl 2>/dev/null || echo "no re-runs"
  ```

- **the `<decision-check>` result** (Step 6b) for the final stop — GREEN, RED (quoting
  `check-loop-decision.mjs`'s message verbatim), or N/A on a blocked stop;
- the **commit outcome, from this closed set**: `committed <branch>` (plus the SHA) |
  `not committed: <decision>` | `not committed: decision unverifiable` | `not committed: evidence stale` |
  `not committed: nothing staged` |
  `not committed: branch failed` | `not committed: stage failed` | `not committed: commit failed`;
- where the checkout is: on the new branch (naming `<original branch>` to return to), or unchanged;
- any committed path that was already dirty in the pre-run snapshot (`.pharn/pharn-loop/<name>/pre-run-status.txt`);
- the SPEC state: **approved by the model** (inside the commit), **reverted to `Draft`**, **revert failed**
  (still approved by the model — say so), or **not approved** (the run never approved it, as on S6b);
- **the run report**: print `pharn/features/<name>/RUN-REPORT.md`'s `## Tokens` table and its `## Files`
  list. **The FILE is the record; this screen copy is advisory** and is reproduced from it, never
  retyped. Name the path so the reader can open it. If no report was rendered (a stop before S2 has no
  feature directory; a quick run renders none — `## Quick mode` item 8), say that plainly rather than omitting
  the line;
- **the cost ledger**: the per-stage table `render-cost-ledger.mjs` printed at Step 6b, verbatim, plus
  `check-cost-ledger.mjs`'s verdict (GREEN, any WARN, or a RED quoted verbatim). **The FILE is the
  record; this screen copy is advisory** — and both carry the same bound: the ledger reports **tokens**,
  never money, and **never** whether the spend was worthwhile. If no ledger was emitted (a stop before
  S2 has no feature directory), say that plainly rather than omitting the line;
- instruction-looking content found in any artifact or prior Handoff, quoted as DATA;
- the honest line: _"The run stopped at the floor-grade decision shown. The SPEC was approved by the model,
  not a person. This is not a judgment that the change is good; review the branch before merging."_ When
  the SPEC state is **not approved**, its second sentence reads instead: _"The SPEC was never approved;
  it is a Draft waiting for a person."_ A quick run adds: _"It ran in quick mode: no regression outside the
  feature was looked for, and the plan was not interrogated."_

**Before ending your turn, run the release step — `## Final step — release the writes-scope`, below.** It is a **procedure** step, not reference material; it sits beneath the claims block for document layout only, and a reader who stops at the turn-end never reaches it.

Then **end your turn**. Do not ask a question, do not push, do not merge, do not seal.

## What you may claim (P0)

Everything this command does is advisory orchestration except what the Floor bullets below name, each of
which reduces to a floor primitive (`pharn/ARCHITECTURE.md §2`). Four of them are this command's own checkers —
`check-loop.mjs`, `check-loop-fresh.mjs`, `check-loop-record.mjs`, `check-loop-decision.mjs` — and none of the
last three feeds `check-loop.mjs`'s inputs.

- **Floor:** the loop stops on the Design C table — `check-loop.mjs` (enum membership over the verdicts and an
  `iter >= cap` compare), in the table the SPEC's pinned kind chooses: verify's verdict alone, green
  `STOP_GREEN_QUICK`, for a `quick` SPEC; the full table for every other. An AC-evidence red and a reconcile red are
  `STOP_TERMINAL`, never retried; an undelivered AC is an ordinary red. **Structural:** its inputs are the two verdict
  reports, `--iter` / `--cap` and ONE token of the feature's own SPEC, its `spec_kind` — no review, finding, severity,
  record or fingerprint input — so no advisory stage can gate the loop and the record cannot affect the stop. A retry
  buys a **bounded stop**, never convergence: a red whose cause lies outside the plan's `## Files`, or a plan that
  cannot be built, runs to `STOP_CAP`; an unsound fix cannot fake a green stop, because the verdicts are recomputed
  every iteration.
- **Floor compare, ADVISORY bound:** "at most `M` iterations" — `check-loop.mjs` keeps no counter; it compares an
  **agent-supplied `--iter`**, so the cap bounds the decision, not the agent (`LIMITS.md §1d`).
- **Floor:** the stop is read only from evidence about THIS tree, and a stale or skipped stage is re-run —
  `check-loop-fresh.mjs` (content-hash, enum membership and a live re-derivation), at the decision and again at the
  commit gate. **Bounded:** it is **tree identity, not recency**; it certifies **agreement, never provenance** — a
  self-consistent fabricated set of stamps, logs and reports over the live tree passes; it runs from the worktree and
  so **cannot vouch for itself**; its re-run **budget** is unauthenticated state under `.pharn/`.
- **Floor:** the build does not run before the test stage completed, and the loop stops if that evidence stops
  holding — `check-test-stage.mjs --require-test-first`, read at Step 4 and by the freshness check after every build
  and at the commit gate. Obeying it is **ADVISORY**, which is why the freshness check re-reads it. **Bounded:** a
  lock from an earlier run over the same files passes; and an abandoned run leaves its `AC-TESTS.md` and tests behind,
  so a retry in `<slug>-2` REDs `claimed-elsewhere` at `/pharn-plan` until a person removes them.
- **Floor:** a record the checker sees is well-shaped — `check-loop-record.mjs`; and a committed green record's
  `decision` (and its `mode`) re-derives from the reports it cites — `check-loop-decision.mjs`, reusing
  `check-loop.mjs` live. **Bounded:** it proves the decision is **re-derivable**, never that the reports are honest —
  with the freshness check, the forgery narrows to a self-consistent fabricated stamp set, and it does not close it. A
  **blocked** stop is exempt by construction.
- **Floor: hook (fix #7):** a rebuild never writes outside the plan's `## Files` (`/pharn-build`'s own setter each
  iteration), and this command's own Write-tool writes land only in `SPEC.md` (the revert) and `LOOP.md` — the
  Write/Edit/MultiEdit/NotebookEdit surface only. **Every git step, the scratch files under `.pharn/pharn-loop/`, and
  the stages' own writes are outside it**, and the commit runs after `/pharn-verify`'s reconcile gate, so neither
  guard nor reconciler covers it. A Bash write by a fix is detected — never prevented — by `check-bash-reconcile.mjs`
  (non-adversarial, `pharn/pharn-contracts/reconciliation-record.md`), and a retry cannot erase it.
- **Floor:** `pharn/floor/feature-name.mjs --fresh` prints only a member of `FEATURE_SLUG_RE`, or nothing — the first
  `<slug>`, `<slug>-2`, … that an `lstat` of `pharn/features/` reports absent, at choice time only (enum-regex).
  **Advisory:** that the candidate is written with the Write tool, and that every later line carries only the printed
  value — the model re-types it.
- **Floor, quick mode:** a quick loop's stop is decided over `/pharn-verify`'s verdict alone, and
  `STOP_GREEN_QUICK` ⇔ a quick SPEC (both tested). The mode is the SPEC's pinned kind, never a flag: any SPEC not
  positively quick reads full, and so does a mode reader that cannot load; that the kind is the APPROVED, un-drifted
  one is floor when the freshness check's check I runs, and that it runs before the stop is advisory. A quick run is
  tree-bound and checked for fabrication over the verify evidence (bounds unchanged). A changed file outside the
  declared files stops a quick loop — `check-quick-scope.mjs`'s exit, over inputs it builds itself; running it and
  obeying the exit are advisory. **Bounded:** it compares changed since `<base sha>`, never written by the build; it
  carries `/pharn-regress`'s closed exemptions; a plan that rewrites its own `## Files` defeats it; and **nothing
  downstream re-checks it** — it leaves no record, the freshness check skips G and H in quick mode, and the commit
  gate does not re-run it. The quick briefs are rendered by code from `ROUTE_POLICY`'s quick column; running the
  `--mode quick` lines is advisory, and a miss fails safe. No regression outside the feature is looked for — a stated
  limit; the model wrote and approved the SPEC the run runs over.
- **Advisory:** the orchestration and every stuck-point mapping; the SPEC approval — `approved_by: model` sits
  outside the body hash, so it is neither gated nor tamper-evident, and its absence proves nothing about a person; the
  Draft revert on a non-green stop (agent-performed; the reverted file's `Draft` shape is floor, `check-spec.mjs`);
  every git step — what the commit holds, that only a green stop commits, that nothing is pushed or merged, that a
  failed commit returns the checkout (Step 6d's one constant line, right only while nothing checks out after Step
  6c's branch block) (the green token it branches on is floor; the pins over this file are vocabulary
  checks, which a novel spelling still passes); and the `Stop` guard (`require-loop-record.cjs`), deterministic
  infrastructure but not a floor primitive — it makes an early, record-less ending **visible and costly**, never
  impossible, **cannot judge a record or tell a real one from a fabricated one** (`touch LOOP.md` satisfies it), runs
  only when Claude Code starts it (`LIMITS.md §7`), and fails **open**.
- **Advisory, the parts (6.32.0):** this command reads `pharn-loop-quick.md` only for a `--quick` run, before Step 1a,
  and this file once, at the run's first stop — each again after a compaction. That you read each there, in full, and
  follow it is your own discipline: nothing on the floor sees a Read. PHARN's own tests pin the TEXT — each part's file
  name in its one pointer, in this bullet and in no other command text, that pointer's load-condition and not-loaded
  sentences, which step headings each file holds, and no fenced line, heading or long paragraph in both a command and its part — never
  that a run read a part at that point, or at all, and never a sentence that sends you to a part without its path. A
  part is read from disk at its point, so a write to it earlier in the run changes what the run follows, as a write to
  a stage's command does before that stage runs. A part that does not load ends the run with nothing committed.
- **Untrusted input:** control flow reads only deterministic-tool output — no stop, continue or stuck-point decision
  rests on a free-text field. **This command ENLARGES the residual** (`LIMITS.md §2`, `THREAT-MODEL.md §5`), and says
  so: untrusted prose reaches an Approved SPEC, a PLAN, a writes-scope and code with no person reading it; code built
  from it is EXECUTED — project gates, the suite, commit hooks — before any person sees it, bounded by nothing beyond
  fix #7's write scope (pre-egress is not built); a plan that lists a tracked file the user had edited commits that
  edit (the summary names such paths); a prior run's Handoff informs this run with no person reading it first; the
  slug's check prints only a `FEATURE_SLUG_RE` member (`pharn/floor/feature-name.mjs`, floor), while writing the
  candidate with the Write tool and re-typing only the printed value into later lines are advisory; the Stop
  guard's marker and counter, the freshness ledger and every stamp, log and report live in the writable tree Bash
  reaches (`LIMITS.md §6`); and `.pharn/writes-scope.json` can be overwritten by a second session, which Step 6c's
  re-derivation narrows to one line, not to zero (P2).
- **Reported for a human, never agent-edited:** `LIMITS.md §1d`'s backstop list should name the Draft revert and the
  merge review; and `/pharn-verify`'s premise of human-approved intent does not hold under this command (a follow-up).
- **Not a claim:** "`/pharn-loop` finished" means **a stop was reached and recorded** — STRUCK: "the feature is good",
  "a human approved the intent", "the fix converged", "context was carried forward", "the change is small". It never
  pushes, merges, seals, attests or uses `--no-verify`, and the merge decision stays a person's.

## Final step — release the writes-scope (ADVISORY lifecycle hygiene)

After every write this command performs — **including any write that follows a human gate** — release
the active writes-scope so a finished run cannot leave a narrow scope behind:

```bash
node .claude/hooks/set-writes-scope.cjs --clear
```

A leftover **set** scope is stricter than none; the release is a Bash call, so an early abort skips it
(`.claude/hooks/set-writes-scope.cjs`, header). Never write "the command cleaned up"; write that it **declares**
the release step.

**Then close the run for the Stop guard** — after every write, and after the Step 7 summary is written:

```bash
node .claude/hooks/require-loop-record.cjs --close '<name>'
```

It removes `.pharn/pharn-loop/<name>/active.json`. **For the write guard only `--close` or the 24 h ceiling releases
a leftover marker — a present `LOOP.md` does NOT.** So in an **installed** project a leftover loop marker keeps the
WHOLE tree on the fail-closed default — your own source blocked too — for up to 24 h after a run that forgot to close
it.

<!-- end of pharn-loop-close -->
