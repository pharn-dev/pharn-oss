# Run membership by context in Claude Code transcripts — measured, 2026-09-27

**Status:** measurement record. Apparatus-only (`.dev/`), with no `SKILLS_VERSION` bump of its own.
**Raw data:** the outputs below, with the scripts that produced them embedded in §11, so every number can be
recomputed on a machine that still holds the transcripts.
**Register:** follows `LIMITS.md` — what is measured is stated, what is not is named and bounded.

This is the evidence behind the `cost-ledger-run-scope` increment (6.29.0, membership `run-window/2`). It shows why a
cost ledger's rows must be scoped to the CONTEXT that ran the run, what a transcript records that makes that
possible, and what the built rule does to the real ledgers finding H3 was about. The rule itself is defined in
`pharn/pharn-contracts/cost-ledger.md`, "Run membership", and is not restated here (P4).

---

## 0. What was measured, and what was deliberately not read

|         |                                                                                                                                                                                                          |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source  | Claude Code session transcripts (JSONL) and agent meta files under `~/.claude/projects/`, every project directory; the committed `cost.json` ledgers of one downstream project, the one finding H3 names |
| Read    | `type`, `isSidechain`, `agentId`, `timestamp`, `tool_use` block ids, meta `toolUseId`/`spawnDepth`/`parentAgentId`/`description`, and tool-result text compared for EQUALITY with a rebuilt marker line  |
| Printed | counts, shapes, 8-character session prefixes, feature slugs, and the first 40 characters of an agent's orchestrator-written description — **no message content, no environment value**                   |
| Machine | one machine, one user. **Machine-local by construction**: transcripts are never committed, so no other clone can reproduce these numbers                                                                 |

**The corpus is LIVE, and it grew between the runs below**, because the session doing the measuring is itself a
transcript (this increment ran as one of three concurrent agents of one session — an instance of the defect). The
planning runs (the morning of 2026-09-27) and the build runs (the afternoon) are both given where they differ. No count
is a standing property ([[L47]]).

Paths are shown as `…/<session>…/…`. No home path and no project-directory name appears here, because those names
carry the user's name.

---

## 1. What a marker written inside a subagent can record

Run in this increment's own Bash, which is a depth-1 background agent of the orchestrating session. Names only; no
value is printed.

- 30 environment variables match `claude` (case-insensitive), among them `CLAUDE_CODE_SESSION_ID`,
  `CLAUDE_CODE_HOST_SESSION_ID`, `CLAUDE_CODE_CHILD_SESSION`, `CLAUDE_PID` and `AI_AGENT`.
- `CLAUDE_CODE_SESSION_ID` EQUALS the orchestrating (parent) session's id, the one whose `subagents/` directory holds
  this agent's transcript.
- `CLAUDE_CODE_HOST_SESSION_ID` differs from the session id, does not contain this agent's id (the id its transcript
  file is named for), and is carried by no transcript record as a field. `CLAUDE_CODE_CHILD_SESSION`, `CLAUDE_PID` and
  `AI_AGENT` carry no agent identity.

**So a marker cannot record its own context.** Every marker a run writes from inside an agent is bound to the parent
session, and which context wrote it has to be read from the transcript afterwards.

## 2. The transcript layout

- The session's own thread writes `<session>.jsonl`.
- An Agent-tool agent writes `<session>/subagents/agent-<id>.jsonl` beside `agent-<id>.meta.json`. The meta carries
  `toolUseId`, `spawnDepth` and, from depth 2, `parentAgentId`. A nested agent is filed FLAT in the same directory.
- A Workflow-tool agent writes `<session>/subagents/workflows/wf_<id>/agent-<id>.jsonl`, with a meta carrying
  `workflowPhase` and no `toolUseId`, plus a `journal.jsonl`. The parent's Workflow tool result names the run id.

## 3. Record fields, machine-wide (`sidechain-survey.mjs`)

Every usage-bearing assistant record under the projects directory, by file kind and fields:

| file kind                 | fields                                    | planning run | build run |
| ------------------------- | ----------------------------------------- | ------------ | --------- |
| agent                     | `isSidechain: true`, `agentId` == file id | 32,147       | 35,050    |
| workflow agent            | `isSidechain: true`, `agentId` == file id | 11,488       | 11,488    |
| main                      | `isSidechain: false`, no `agentId`        | 50,590       | 50,736    |
| **any other combination** |                                           | **0**        | **0**     |

## 4. Spawn links (`link-l1.mjs`)

Every agent of every session that has a main file and a `subagents/` directory. An agent's parent is the ONE context
other than itself whose transcript holds a `tool_use` block with the meta's `toolUseId`.

| result                                                    | planning run | build run |
| --------------------------------------------------------- | ------------ | --------- |
| a unique parent, the main thread                          | 377          | 380       |
| a unique parent, another agent (all spawnDepth 2)         | 5            | 5         |
| agrees with the meta's own `parentAgentId` / `spawnDepth` | 382 / 382    | 385 / 385 |
| no meta file                                              | 1            | 1         |
| no unique parent, or a meta without `toolUseId`           | 0            | 0         |

- **Self-exclusion is load-bearing:** a fork's own file opens with a copy of its spawning `tool_use` (20 forks at
  planning), so without excluding the agent's own context a fork has two holders.
- **The parent's `toolUseResult.agentId` is not a link:** three nested agents have no such record.
- **An agent's first record follows its spawn record by 0 ms to 96 s** (build run: n = 385, p50 1.6 s, p99 67 s,
  max 96 s). So an agent the run spawns shortly before its `run-stop` can write its first line after the ledger is
  emitted. That is why `contexts` is reported only over the contexts named by the window's end: without it, such an
  agent would change the recorded set on every later re-derivation ([[L58]]).

## 5. When a meta file is written (`meta-timing.mjs`, build run)

385 agents with a meta and a timestamped first record. The meta's LAST write (its mtime) minus the agent's first
record's timestamp: minimum 5 ms, median 33 ms, p99 5.3 h, maximum 15.4 h. **Bound:** an mtime is the last write, so a
meta's FIRST write is not observable this way, and some metas are rewritten hours later. "An agent's meta exists by
the time a run that spawned it is emitted" is therefore an observed tendency (the median last write is 33 ms after the
first record, and an emission follows the run's stop by seconds at least), never a floor fact. The contract says so.

## 6. Where a command's output lands, and how a report is delivered (R1)

- **In an agent's transcript, a Bash result exists only as the `tool_result` block's `content`** (a string, or `text`
  blocks); the record carries no `toolUseResult`. The main thread carries both forms.
- **A FOREGROUND Agent call's return** is a `user` record in the calling context, `isSidechain: false` for the main
  thread, whose `tool_result` content is `text` blocks, with a `toolUseResult` holding `status`, `prompt` and `agentId`.
  A marker line an agent quotes in its final report therefore lands in the orchestrator's tool results: a second
  holder, and the run reads `unknown`.
- **A BACKGROUND agent's hand-back** reaches its parent as `queue-operation` records (`enqueue`, `dequeue`, `remove` —
  98 in the orchestrating session of this increment) and a `user` record whose content is a STRING (36 such records
  there, the human's own messages included). Neither is a tool result, and neither is read as binding evidence; nor
  is a human's chat paste.

Both directions are pinned by `render-cost-ledger.test.mjs` (`★ R1`, `★ R1 CONTROL`).

## 7. The printed marker line

`mark-phase.mjs` has printed one format since 6.5.2: `marker <seq>: <kind>[ <stage>][ iter=<n>] <ts>`, plus three
suffixes (an adopted pending start, a mode, a route), each printed only when that marker field is present. 6.29.0
moves it into one function, `markerLine()`, which the CLI prints with and the ledger rebuilds the line from.

## 8. The finding, verified — and what can no longer be re-derived

- **Session `bb54cf03…` no longer exists on this machine.** All that remains is a `desktop-released.json` whose `reason`
  is `delete` (2026-09-25T19:35:52Z). Ten committed ledgers name it, among them the three finding H3 cites
  (`invite-dialog-team-scope` 370 rows, `logger-redaction-gaps` 407, `org-http-surface` 411, of which 357, 381 and 411
  appear in another of the three). **None of them can be re-derived, by this record or by anyone.**
- **Finding H3 attributes the token-reduction roadmap's measured trigger** (PHARN's own stages at ~81% of relative cost
  on small fixes, `/pharn-regress` alone ~63%) **to ledgers of that session. That trigger cannot be re-derived under
  the corrected rule either.** This record does not say what it would have been: the rows it rested on include other
  contexts' requests, and the transcript that could separate them is gone.
- **The scale, at planning:** over the 64 committed ledgers of that project, 24,787 rows, 14,769 unique request ids,
  6,696 ids in more than one ledger. That count includes session-scoped `pharn-cost-ledger/1` ledgers of one main
  thread, a different defect that 6.9.0 already labels.

## 9. Before and after, with the BUILT code (R3)

`measure-built.mjs`, build run. For every committed ledger of the two contaminated sessions whose transcripts survive
(and one uncontaminated control session), under the ledger's OWN recorded markers and session:

- **committed** — the rows in the committed file;
- **HEAD** — re-derived by the floor at `70cb51c` (6.28.2, `run-window/1`);
- **BUILT** — re-derived by this increment's floor (`run-window/2`);
- **verify** — this increment's `check-cost-ledger.mjs --verify-transcript` over the COMMITTED file.

### Session `3c47cb74` — six `/pharn-loop` runs, each in its own agent of one session

| ledger                       | committed | HEAD | BUILT | bound to                                         | verify on the committed file             |
| ---------------------------- | --------- | ---- | ----- | ------------------------------------------------ | ---------------------------------------- |
| auth-errors-and-cache        | 393 (4)   | 393  | 185   | agent "Loop A2 auth-errors-and-cache (M5, M11)"  | RED: 208 recorded rows not the run's own |
| billing-go-live-hardening    | 464 (4)   | 464  | 233   | agent "Loop D billing-go-live-hardening (M6-M8)" | RED: 231                                 |
| image-limits-thumbnail-purge | 195 (3)   | 195  | 121   | agent "Loop C2 image-limits-thumbnail-purge (M9" | RED: 74                                  |
| invitation-accept-rules      | 365 (4)   | 365  | 201   | agent "Loop B1 invitation-accept-rules (M2,M3,M" | RED: 164                                 |
| reauth-per-session           | 369 (4)   | 369  | 190   | agent "Loop A1 reauth-per-session (M1)"          | RED: 179                                 |
| svg-preview-sandbox          | 284 (2)   | 284  | 133   | agent "Loop C1 svg-preview-sandbox (M4)"         | RED: 151                                 |

`(n)` is the number of contexts the committed rows come from. Rows shared with another ledger of the session:
**committed 1,538 / 2,070 · HEAD 1,538 / 2,070 · BUILT 0 / 1,063.**

### Session `f34b7a70` — eleven ledgers: loops in agents, loops in the main thread, and one `/pharn-ship` ledger

| ledger                   | committed          | HEAD | BUILT | bound to                                                                      | verify on the committed file               |
| ------------------------ | ------------------ | ---- | ----- | ----------------------------------------------------------------------------- | ------------------------------------------ |
| custom-roles             | 405 (3)            | 405  | 405   | agent "Run /pharn-loop for phase 4 custom roles" — its 2 nested grillers kept | GREEN                                      |
| org-activity-log         | 123 (2)            | 123  | 120   | agent "Phase 5c: org activity log"                                            | RED: 3                                     |
| org-activity-ui          | 111 (1)            | 111  | 111   | agent "Phase 5d: activity UI + permission"                                    | GREEN                                      |
| org-concurrency-gaps     | 261 (3)            | 261  | 128   | agent "Phase 5a: close org races"                                             | RED: 133                                   |
| org-email-visibility     | 200 (2)            | 200  | 101   | agent "Phase 5b: emails + invite cooldown"                                    | RED: 99                                    |
| org-foundation           | 254 (1, schema /1) | 38   | 38    | main                                                                          | GREEN (a /1 file is declined, with a WARN) |
| org-foundation-hardening | 365 (1, schema /1) | 91   | 91    | main                                                                          | GREEN (declined, as above)                 |
| org-slug-routing         | 630 (1)            | 630  | 630   | main                                                                          | GREEN                                      |
| team-invitations         | 318 (1)            | 318  | 318   | main                                                                          | GREEN                                      |
| team-management          | 341 (2)            | 341  | 341   | agent "Run pharn-loop for phase 3b team members" — its nested griller kept    | GREEN                                      |
| team-ownership-transfer  | 206 (2)            | 206  | 203   | agent "Run /pharn-loop for organizations phase "                              | RED: 3                                     |

Rows shared with another ledger of the session: **committed 908 / 3,214 · HEAD 400 / 2,724 · BUILT 0 / 2,486.** The
committed figure includes the two `/1` ledgers' session-scoped rows; the HEAD column is the like-for-like "before".

### Session `ed110cbf` — the control: one run, main thread only

`delete-a11y-tests`: committed 185, HEAD 185, BUILT 185, bound to `main`, verify GREEN. Nothing to separate, nothing
changed.

**Reading the tables.** Every measured ledger binds to exactly one context, and for every agent-orchestrated run it is
the agent whose orchestrator-written description names that run, which is an independent check of the binding. Every
row the built rule drops comes from a context outside the run's set — the main thread or another agent — and the
nested agents those runs spawned are kept (custom-roles, team-management). Where the committed file holds another
context's rows, the built `--verify-transcript` REDs it and counts them, the GATE-1 decision for legacy ledgers; where
it does not, it is GREEN.

## 10. What the extra evidence costs the emitter (G8)

`time-built.mjs`, build run: seven alternating rounds of the HEAD emitter and the built one over the same ledger's
session.

| session    | transcript | median HEAD | median BUILT |
| ---------- | ---------- | ----------- | ------------ |
| `f34b7a70` | 79.3 MB    | 6,053 ms    | 6,232 ms     |
| `3c47cb74` | 78.2 MB    | 2,998 ms    | 3,038 ms     |

The context evidence is read in the SAME pass as the requests, and a tool result is split into lines only when it
contains the binding lines' common prefix. What the rule adds is the difference between the two columns: 3% and 1%.
At planning, a separate second pass over a 57 MB / 79 MB session had cost 2.1 s / 5.1 s on top of 2.5 s / 3.4 s, which
is why the build reads everything in one pass. The two sessions' HEAD times also differ from each other, at nearly the
same size; that difference was not investigated, and it is present in both columns.

## 11. Scripts

Each ran from `.pharn/pharn-dev-build/` (build run) or `.pharn/pharn-dev-plan/` (planning run) in the increment's
worktree, read-only against the transcripts. They are kept here and not in the tree.

### `measure-built.mjs` (§9)

```js
// MEASUREMENT (read-only): re-derive every committed cost.json of the named sessions with the BUILT floor
// (run-window/2) and with the floor at HEAD (run-window/1), over the same transcript and the ledger's own recorded
// markers. Prints no absolute path: sessions by 8-char prefix, ledgers by feature slug, contexts as `main` or
// `agent` + the orchestrator-written description from the agent's meta (first 40 characters).
// Usage: node measure-built.mjs <projectsDir> <featuresDir> <scratchDir> <session-prefix>...
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

const [projectsDir, featuresDir, scratch, ...prefixes] = process.argv.slice(2);
const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

// The floor at HEAD, extracted beside nothing else, so its imports resolve among themselves.
const oldDir = join(scratch, "floor-head");
mkdirSync(oldDir, { recursive: true });
const listed = execFileSync("git", ["ls-tree", "--name-only", "HEAD", "pharn/floor/"], { cwd: repo, encoding: "utf8" }).split("\n");
for (const p of listed) {
  if (!p.endsWith(".mjs") || p.endsWith(".test.mjs")) continue;
  writeFileSync(join(oldDir, p.slice("pharn/floor/".length)), execFileSync("git", ["show", `HEAD:${p}`], { cwd: repo }));
}
const oldLedger = await import(pathToFileURL(join(oldDir, "render-cost-ledger.mjs")).href);
const newLedger = await import(pathToFileURL(join(repo, "pharn", "floor", "render-cost-ledger.mjs")).href);
const { checkLedger } = await import(pathToFileURL(join(repo, "pharn", "floor", "check-cost-ledger.mjs")).href);
const { findTranscriptDirs } = await import(pathToFileURL(join(repo, "pharn", "floor", "transcript-core.mjs")).href);
const { rowContext } = newLedger;

const describe = (projectDir, sid, ctx) => {
  if (ctx === null || ctx === undefined) return "none";
  if (ctx === "main") return "main";
  const id = ctx.slice("agent:".length);
  try {
    const meta = JSON.parse(readFileSync(join(projectDir, sid, "subagents", `agent-${id}.meta.json`), "utf8"));
    return `agent "${String(meta.description ?? "").slice(0, 40)}"`;
  } catch {
    return "agent (no meta)";
  }
};

const ledgers = [];
for (const name of readdirSync(featuresDir).sort()) {
  const f = join(featuresDir, name, "cost.json");
  if (!existsSync(f)) continue;
  let led;
  try {
    led = JSON.parse(readFileSync(f, "utf8"));
  } catch {
    continue;
  }
  const session = led.membership?.session ?? led.sessions?.[0] ?? null;
  if (typeof session !== "string" || !prefixes.some((p) => session.startsWith(p))) continue;
  ledgers.push({ name, led, session });
}

const bySession = new Map();
for (const l of ledgers) {
  const dirs = findTranscriptDirs(projectsDir, l.session);
  const key = l.session.slice(0, 8);
  if (!bySession.has(key)) bySession.set(key, []);
  if (dirs.length !== 1) {
    bySession.get(key).push({ ...l, gone: true });
    continue;
  }
  const opts = {
    name: l.name,
    command: l.led.command,
    baseSha: l.led.base_sha,
    repo: scratch,
    sessionId: l.session,
    projectsDir,
    markers: Array.isArray(l.led.markers) ? l.led.markers : [],
  };
  const before = oldLedger.deriveLedger(opts).ledger;
  const t0 = performance.now();
  const after = newLedger.deriveLedger(opts).ledger;
  const ms = performance.now() - t0;
  const verify = checkLedger(l.led, { verifyTranscript: true, projectsDir, repo: scratch });
  bySession.get(key).push({ ...l, dir: dirs[0], before, after, ms, verify });
}

const ctxCount = (rows) => new Set(rows.map((r) => rowContext(r) ?? "undecidable")).size;
for (const [key, list] of bySession) {
  console.log(`\n## session ${key} — ${list.length} ledger(s)`);
  if (list.every((x) => x.gone)) {
    console.log("  transcript: GONE (no transcript for this session on this machine)");
    for (const x of list)
      console.log(`  ${x.name}: committed rows=${x.led.requests?.length ?? 0}, method=${x.led.membership?.method ?? "-"}`);
    continue;
  }
  for (const x of list) {
    if (x.gone) {
      console.log(`  ${x.name}: transcript GONE`);
      continue;
    }
    const m = x.after.membership;
    const red = x.verify.reds.find((r) => r.includes("recorded row(s) are not the run's own")) ?? x.verify.reds[0] ?? null;
    console.log(
      `  ${x.name}: committed rows=${x.led.requests.length} (${ctxCount(x.led.requests)} ctx, ${x.led.membership?.method ?? "-"}) | HEAD re-derived rows=${x.before.requests.length} | BUILT ${m.status}${m.reason ? ` (${m.reason.slice(0, 40)}…)` : ""} rows=${x.after.requests.length} contexts=${m.contexts?.length ?? "-"} bound to ${describe(x.dir, x.session, m.context)} excluded=${m.excluded_requests} (${Math.round(x.ms)} ms) | built --verify-transcript on the committed file: ${x.verify.reds.length} RED${red ? ` — "${red.replace(/^--verify-transcript: /, "").slice(0, 150)}"` : ""}`
    );
  }
  const shared = (pick) => {
    const owners = new Map();
    for (const x of list) if (!x.gone) for (const r of pick(x)) owners.set(r.request_id, (owners.get(r.request_id) ?? 0) + 1);
    let rows = 0;
    let sharedRows = 0;
    for (const x of list)
      if (!x.gone)
        for (const r of pick(x)) {
          rows++;
          if (owners.get(r.request_id) > 1) sharedRows++;
        }
    return `${sharedRows}/${rows}`;
  };
  console.log(
    `  rows shared with another ledger of this session: committed ${shared((x) => x.led.requests)} · HEAD ${shared((x) => x.before.requests)} · BUILT ${shared((x) => x.after.requests)}`
  );
}
```

### `time-built.mjs` (§10)

```js
// MEASUREMENT (read-only): the emitter's wall time at HEAD (run-window/1, one pass) and BUILT (run-window/2, the
// same one pass plus the context evidence), alternating, N rounds, over one committed ledger's session. Prints the
// session's transcript bytes and the median of each. No path is printed.
// Usage: node time-built.mjs <projectsDir> <cost.json> <floor-head dir> <rounds>
import { readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { performance } from "node:perf_hooks";

const [projectsDir, ledgerFile, oldDir, roundsText] = process.argv.slice(2);
const repo = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const oldLedger = await import(pathToFileURL(join(oldDir, "render-cost-ledger.mjs")).href);
const newLedger = await import(pathToFileURL(join(repo, "pharn", "floor", "render-cost-ledger.mjs")).href);
const { findTranscriptDirs, transcriptFiles } = await import(pathToFileURL(join(repo, "pharn", "floor", "transcript-core.mjs")).href);

const led = JSON.parse(readFileSync(ledgerFile, "utf8"));
const sessionId = led.membership?.session ?? led.sessions?.[0];
const [dir] = findTranscriptDirs(projectsDir, sessionId);
const bytes = transcriptFiles(dir)
  .filter((f) => f.slice(dir.length + 1) === `${sessionId}.jsonl` || f.slice(dir.length + 1).startsWith(`${sessionId}/`))
  .reduce((n, f) => n + statSync(f).size, 0);
const opts = {
  name: led.name,
  command: led.command,
  baseSha: led.base_sha,
  repo: dirname(oldDir),
  sessionId,
  projectsDir,
  markers: led.markers,
};
const times = { head: [], built: [] };
const rounds = Number(roundsText);
for (let i = 0; i < rounds; i++) {
  for (const [k, m] of [
    ["head", oldLedger],
    ["built", newLedger],
  ]) {
    const t0 = performance.now();
    m.deriveLedger(opts);
    times[k].push(performance.now() - t0);
  }
}
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
console.log(
  `session ${sessionId.slice(0, 8)}: ${(bytes / 1e6).toFixed(1)} MB of transcript · ${rounds} alternating rounds · median HEAD ${Math.round(median(times.head))} ms · median BUILT ${Math.round(median(times.built))} ms`
);
```

### `meta-timing.mjs` (§5)

```js
// MEASUREMENT (read-only): for every Agent-tool agent under a projects dir, when was its meta file last written
// (mtime) relative to the agent's FIRST transcript record's timestamp? Prints counts and a distribution only.
// Usage: node meta-timing.mjs <projectsDir>
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
const deltas = [];
let noMeta = 0;
let noTs = 0;
for (const p of readdirSync(root, { withFileTypes: true })) {
  if (!p.isDirectory()) continue;
  const pdir = join(root, p.name);
  for (const s of readdirSync(pdir, { withFileTypes: true })) {
    if (!s.isDirectory()) continue;
    const sub = join(pdir, s.name, "subagents");
    let es;
    try {
      es = readdirSync(sub);
    } catch {
      continue;
    }
    for (const f of es) {
      const m = /^agent-(.+)\.jsonl$/.exec(f);
      if (!m) continue;
      let meta;
      try {
        meta = statSync(join(sub, `agent-${m[1]}.meta.json`));
      } catch {
        noMeta++;
        continue;
      }
      let first = null;
      for (const line of readFileSync(join(sub, f), "utf8").split("\n")) {
        if (!line) continue;
        try {
          const t = Date.parse(JSON.parse(line).timestamp);
          if (Number.isFinite(t)) {
            first = t;
            break;
          }
        } catch {
          // a torn line
        }
      }
      if (first === null) {
        noTs++;
        continue;
      }
      deltas.push(meta.mtimeMs - first);
    }
  }
}
deltas.sort((a, b) => a - b);
const q = (x) => Math.round(deltas[Math.min(deltas.length - 1, Math.floor(x * deltas.length))]);
console.log(
  `agents=${deltas.length} noMeta=${noMeta} noTimestamp=${noTs} · meta mtime minus first record ts (ms): min=${Math.round(deltas[0])} p50=${q(0.5)} p99=${q(0.99)} max=${Math.round(deltas.at(-1))} · meta written AFTER the first record: ${deltas.filter((d) => d > 0).length}`
);
```

### `sidechain-survey.mjs` (§3)

```js
// Read-only: over EVERY .jsonl under ~/.claude/projects, count usage-bearing assistant records by
// (file kind, isSidechain, agentId presence, agentId == file id), and the platform versions of any anomaly.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
const root = join(homedir(), ".claude", "projects");
const C = new Map();
const inc = (k) => C.set(k, (C.get(k) ?? 0) + 1);
const versions = new Map();
const walk = (d, rel) => {
  let es;
  try {
    es = readdirSync(d, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of es) {
    const p = join(d, e.name);
    if (e.isDirectory()) {
      if (e.name !== "tool-results") walk(p, `${rel}/${e.name}`);
      continue;
    }
    if (!e.name.endsWith(".jsonl")) continue;
    const kind = /\/subagents\/workflows\//.test(`${rel}/`)
      ? "workflow-agent"
      : /\/subagents$/.test(rel)
        ? "agent"
        : rel.split("/").length === 2
          ? "main"
          : "other";
    const fileId = e.name.startsWith("agent-") ? e.name.slice(6, -6) : null;
    let text;
    try {
      text = readFileSync(p, "utf8");
    } catch {
      continue;
    }
    for (const line of text.split("\n")) {
      if (!line || !line.includes('"usage"')) continue;
      let r;
      try {
        r = JSON.parse(line);
      } catch {
        continue;
      }
      if (r?.type !== "assistant" || !r.message?.usage) continue;
      const side = r.isSidechain === true ? "side" : r.isSidechain === false ? "main" : `side=${JSON.stringify(r.isSidechain)}`;
      const aid = typeof r.agentId === "string" ? (fileId && r.agentId === fileId ? "agentId==file" : "agentId!=file") : "no-agentId";
      const k = `${kind} ${side} ${aid}`;
      inc(k);
      if ((side === "side" && aid !== "agentId==file") || (side !== "side" && aid !== "no-agentId") || kind === "other") {
        if (!versions.has(k)) versions.set(k, new Set());
        versions.get(k).add(r.version);
      }
    }
  }
};
walk(root, "");
for (const [k, v] of [...C].sort())
  console.log(`${String(v).padStart(8)}  ${k}${versions.has(k) ? `  versions=${[...versions.get(k)].sort().slice(0, 6).join(",")}` : ""}`);
```

### `link-l1.mjs` (§4)

```js
// Read-only: link every agent to its parent by meta.toolUseId -> the context (excluding the agent's OWN file)
// whose transcript holds a tool_use block with that id. Compare with meta.parentAgentId / spawnDepth.
// Also: spawn tool_use timestamp vs the child's first record timestamp.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
const root = join(homedir(), ".claude", "projects");
const C = new Map();
const inc = (k) => C.set(k, (C.get(k) ?? 0) + 1);
const parse = (f) => {
  let t;
  try {
    t = readFileSync(f, "utf8");
  } catch {
    return [];
  }
  const out = [];
  for (const line of t.split("\n")) {
    if (!line) continue;
    try {
      out.push(JSON.parse(line));
    } catch {}
  }
  return out;
};
const lags = [];
for (const proj of readdirSync(root)) {
  const pdir = join(root, proj);
  let ents;
  try {
    ents = readdirSync(pdir, { withFileTypes: true });
  } catch {
    continue;
  }
  for (const e of ents) {
    if (!e.isDirectory()) continue;
    const sid = e.name;
    const sdir = join(pdir, sid, "subagents");
    const mainFile = join(pdir, `${sid}.jsonl`);
    if (!existsSync(sdir) || !existsSync(mainFile)) continue;
    const files = [["main", mainFile]];
    for (const f of readdirSync(sdir).sort())
      if (f.endsWith(".jsonl")) files.push([f.replace(/^agent-/, "").replace(/\.jsonl$/, ""), join(sdir, f)]);
    const useCtx = new Map(); // tool_use id -> [{ctx, ts}]
    const firstTs = new Map();
    for (const [ctx, f] of files) {
      const rs = parse(f);
      for (const r of rs) {
        if (!firstTs.has(ctx) && typeof r.timestamp === "string") firstTs.set(ctx, r.timestamp);
        const c = r.message?.content;
        if (r.type === "assistant" && Array.isArray(c))
          for (const b of c)
            if (b?.type === "tool_use" && typeof b.id === "string") {
              if (!useCtx.has(b.id)) useCtx.set(b.id, []);
              useCtx.get(b.id).push({ ctx, ts: r.timestamp, name: b.name });
            }
      }
    }
    for (const [ctx] of files) {
      if (ctx === "main") continue;
      let meta = null;
      try {
        meta = JSON.parse(readFileSync(join(sdir, `agent-${ctx}.meta.json`), "utf8"));
      } catch {}
      if (!meta) {
        inc("no meta");
        continue;
      }
      if (typeof meta.toolUseId !== "string") {
        inc("meta without toolUseId");
        continue;
      }
      const hits = (useCtx.get(meta.toolUseId) ?? []).filter((h) => h.ctx !== ctx);
      const ctxs = new Set(hits.map((h) => h.ctx));
      if (ctxs.size !== 1) {
        inc(`L1: ${ctxs.size} candidate parent contexts`);
        continue;
      }
      const parent = [...ctxs][0];
      inc(`L1: unique parent (${parent === "main" ? "main" : "agent"}), tool=${hits[0].name}`);
      const metaParent = meta.parentAgentId ?? (meta.spawnDepth === 1 ? "main" : null);
      inc(metaParent === parent ? "L1 == meta parent" : `L1 != meta parent (${metaParent})`);
      const spawnMs = Date.parse(hits[0].ts);
      const childMs = Date.parse(firstTs.get(ctx));
      if (Number.isFinite(spawnMs) && Number.isFinite(childMs)) lags.push(childMs - spawnMs);
      if (childMs < spawnMs) inc(`child's first record BEFORE its spawn tool_use (fork=${!!meta.isFork})`);
    }
  }
}
for (const [k, v] of [...C].sort()) console.log(`${String(v).padStart(5)}  ${k}`);
lags.sort((a, b) => a - b);
const q = (p) => lags[Math.min(lags.length - 1, Math.floor(p * lags.length))];
console.log(
  `child first record - spawn tool_use (ms): n=${lags.length} min=${lags[0]} p50=${q(0.5)} p99=${q(0.99)} max=${lags[lags.length - 1]}`
);
```

The planning run's other probes — the environment names (§1), the layout census (§2), the result and delivery shapes
(§6) and the second-pass timing (§10) — printed shapes and counts only, and the statements above carry their results.
Their scripts were not kept: each is a directory walk or a `JSON.parse` of a record, and §3 and §4's scripts show the
pattern.
