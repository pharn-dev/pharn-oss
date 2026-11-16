// .dev/features/loop-driver-spike/driver/driver-core.mjs — the CORE-113 spike driver's program and interpreter.
//
// DEV APPARATUS, NEVER SHIPPED. A measurement spike (Linear CORE-113): it sequences ONE `/pharn-loop --quick` by
// running the loop's own pinned floor lines from a node process and starting one headless `claude -p` session per
// model stage. Its record is `../RECORD.md`; its plan `../PLAN.md`. No driver ships from this increment.
//
// THE SHAPE (AC2 — "every branch the spike driver takes is an exit-code membership test"):
//   * The program is DATA: `buildProgram()` returns a frozen table of steps. A step names what to run (`argv`), and
//     maps the child's EXIT CODE to an ACTION through `on` (own-property lookup), with a mandatory `otherwise`.
//   * Where the loop reads a closed token a floor script printed (a `finish` row, the spec kind, `stage_to_rerun`,
//     `reason_code`, `terminal_cause`), the step runs `token-exit.mjs`, which turns the token into an exit code first.
//     No model output is read for a decision, ever (P2).
//   * Actions are a closed vocabulary (`ACTION_RE`): `goto:<step>`, `again`, `stop:<row>`, `green`, `decision`,
//     `iterate`, `end`. `loop-driver.test.mjs` collects every action of every step and requires each to match.
//   * Every conditional in the driver sits between the INTERPRETER BEGIN / END markers below; the test strips
//     comments, strings and templates and requires zero conditional tokens elsewhere in this file and in
//     `loop-driver.mjs`. The interpreter's conditionals are of four kinds only: (1) the exit-code lookup itself,
//     (2) its own bounds (repeats of `again`, total steps), (3) argument validation, and (4) assembling the record
//     at a stop whose kind an earlier exit code already decided.
//
// What this file does NOT do: spawn, read or write anything. `loop-driver.mjs` supplies the IO (`io`), so the
// interpreter can be walked in tests with scripted exit codes.

import { isAbsolute, join } from "node:path";

/** The stuck-point rows the driver can stop on, and the `blocked:` id each records (pharn/floor/loop-record-core.mjs
 *  `BLOCKED_IDS`, cited). */
export const ROW_IDS = Object.freeze({
  S1: "no-slug",
  S3: "no-git-base",
  S4: "no-gates",
  S5: "seam-config",
  S6: "thin-intent",
  S6b: "needs-clarification",
  S6c: "not-quick",
  S7: "plan-ambiguity",
  S8: "seam-unresolved",
  S9: "stage-refused",
  S10: "unlisted-ask",
  S11: "stale-evidence",
  S12: "no-test-runner",
  S13: "ac-evidence-invalid",
  S14: "gates-red-at-entry",
  S14b: "gates-unmeasured-at-entry",
  S14c: "gates-red-cached",
  S15: "not-isolated",
  S15b: "context-too-large",
});

/** The closed action vocabulary. */
export const ACTION_RE = new RegExp(
  "^(goto:[a-z0-9-]+|again|stop:S(1|3|4|5|6|6b|6c|7|8|9|10|11|12|13|14|14b|14c|15|15b)|green|decision|iterate|end)$"
);

/** `token-exit.mjs`'s codes for the `refused-row` table: `refused S4` … `refused S10` → 10 … 18 (its header). */
export const REFUSED = Object.freeze({ S4: 10, S5: 11, S6: 12, S6b: 13, S6c: 14, S7: 15, S8: 16, S9: 17, S10: 18 });

export const BUDGET_MS = 570000; // the loop's pinned --budget-ms
export const GATE_TIMEOUT_MS = 540000; // the loop's pinned --timeout-ms
export const MAX_AGAIN = 40; // the interpreter's bound on consecutive `again` (a stage-direct or wait resume)
export const MAX_STEPS = 600; // the interpreter's bound on steps in one run
export const NODE_STEP_TIMEOUT_MS = 20 * 60 * 1000;
export const SESSION_TIMEOUT_MS = 3 * 60 * 60 * 1000;

/** Fixed probe prompts (text this spike wrote; the sessions' replies are DATA, never read for a decision). */
export const DENY_PROMPT =
  "This is a write-guard probe run by the PHARN loop-driver spike (dev apparatus). Use the Write tool exactly once to " +
  "create the file `loop-driver-probe.txt` in the current project root with the content `probe`. Do not use Bash or " +
  "any other tool. If the write is refused, do not retry it and do not try another path or tool. Then end your turn " +
  "with one line quoting the tool's result.";
export const QUESTION_PROMPT =
  "This is a question round-trip probe run by the PHARN loop-driver spike (dev apparatus). Do not use any tool. Ask " +
  "the operator exactly one short question that ends with a question mark, and then end your turn.";

const q = (s) => `'${s}'`;
const node = (ctx, script, ...args) => [ctx.node, script, ...args];
const feat = (ctx, file) => `pharn/features/${ctx.name}/${file}`;
const runDir = (ctx) => `pharn/.run/pharn-loop/${ctx.name}`;
const stdoutOf = (ctx, id) => ctx.lastStdout[id];
const tokenExit = (ctx, table, from, ...field) => [ctx.node, join(ctx.driverDir, "token-exit.mjs"), table, stdoutOf(ctx, from), ...field];

/** The pinned brief line a stage agent runs first (`pharn-loop.md` Step 3–5, `pharn-loop-quick.md` items 2 and 4). */
export function briefLine(ctx, stage, extra) {
  return `Run exactly this line, then follow what it prints: node pharn/floor/stage-agent.mjs brief --command pharn-loop --stage ${stage} --name ${q(ctx.name)}${extra}`;
}

/** The spec prompt: the brief line, then the description in a fence longer than any backtick run inside it,
 *  labelled DATA (`pharn-loop.md` `## Running a stage` item 2). */
export function specPrompt(ctx) {
  const runs = [...ctx.intent.matchAll(new RegExp("`+", "g"))].map((m) => m[0]);
  const fence = "`".repeat(Math.max(3, ...runs.map((r) => r.length + 1)));
  return `${briefLine(ctx, "pharn-spec", " --mode quick")}\n\n${fence}DATA\n${ctx.intent.trimEnd()}\n${fence}\n`;
}

export function answerPrompt(ctx) {
  return (
    `The operator's answer to your question is the word \`${ctx.answer}\`. Use the Write tool once to write exactly ` +
    `that word to \`pharn/.run/loop-driver/${ctx.name}/answer.txt\`. Do not use Bash or any other tool. Then end your turn.`
  );
}

/** The session argv (`claude -p`). `ctx.agentArgs` is `["--agent","pharn-stage"]` when the project holds that
 *  definition, else `[]`; `effortArgs` is `["--effort",<e>]` or `[]` — both set by capture steps, so no branch here. */
export function sessionArgv(ctx, { model, effortArgs, agentArgs, sessionId, prompt }) {
  return [
    ctx.claude,
    "-p",
    ...agentArgs,
    "--model",
    model,
    ...effortArgs,
    "--permission-mode",
    "auto",
    "--session-id",
    sessionId,
    "--output-format",
    "stream-json",
    "--verbose",
    prompt,
  ];
}

export function resumeArgv(ctx, { model, effortArgs, sessionId, prompt }) {
  return [
    ctx.claude,
    "-p",
    "--resume",
    sessionId,
    "--model",
    model,
    ...effortArgs,
    "--permission-mode",
    "auto",
    "--output-format",
    "stream-json",
    "--verbose",
    prompt,
  ];
}

/** `finish`'s table for a stage whose own report decides: done → `onDone`, refused → the row token, question → the
 *  inline return line then S10; anything else (unusable, a crash) → S9. */
export function reportFinish(p, onDone) {
  return { on: { 0: onDone, 3: `goto:${p}-row`, 4: `goto:${p}-question` }, otherwise: "stop:S9" };
}

/** One routed stage: start → effort → session → finish → (row token | question return). `iterArgs` gives the
 *  `--iteration <N>` pair for build, `modeArgs` the `--mode quick` pair where the quick part pins it. */
function routedStage(p, { stage, key, prompt, iterArgs = () => [], modeArgs = [], finish, rows }) {
  const it = iterArgs;
  return {
    [`${p}-start`]: {
      kind: "cmd",
      argv: (ctx) =>
        node(
          ctx,
          "pharn/floor/stage-agent.mjs",
          "start",
          "--command",
          "pharn-loop",
          "--stage",
          stage,
          "--name",
          ctx.name,
          ...it(ctx),
          ...modeArgs
        ),
      capture: { on: [0], set: (ctx, out) => (ctx.stage[p] = { alias: out.split("\n")[0].slice("agent:".length), effortArgs: [] }) },
      on: { 0: `goto:${p}-effort` },
      otherwise: "stop:S9",
    },
    [`${p}-effort`]: {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/check-model-config.mjs", "resolve", key),
      capture: { on: [0], set: (ctx, out) => (ctx.stage[p].effortArgs = ["--effort", JSON.parse(out).effort]) },
      on: {},
      otherwise: `goto:${p}-session`,
    },
    [`${p}-session`]: {
      kind: "session",
      stage: p,
      argv: (ctx, sessionId) =>
        sessionArgv(ctx, {
          model: ctx.stage[p].alias,
          effortArgs: ctx.stage[p].effortArgs,
          agentArgs: ctx.agentArgs,
          sessionId,
          prompt: prompt(ctx),
        }),
      on: {},
      otherwise: `goto:${p}-finish`,
    },
    // No --budget-ms: the session has already exited (spawned synchronously), so there is nothing to wait for and a
    // stage that never reported reads `no-result` at once (GRILL concern 2).
    [`${p}-finish`]: {
      kind: "cmd",
      argv: (ctx) =>
        node(ctx, "pharn/floor/stage-agent.mjs", "finish", "--command", "pharn-loop", "--name", ctx.name, "--stage", stage, ...it(ctx)),
      on: finish.on,
      otherwise: finish.otherwise,
    },
    [`${p}-row`]: {
      kind: "cmd",
      argv: (ctx) => tokenExit(ctx, "refused-row", `${p}-finish`),
      on: Object.fromEntries(rows.map((r) => [REFUSED[r], `stop:${r}`])),
      otherwise: "stop:S9",
    },
    [`${p}-question`]: {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/mark-phase.mjs", "--name", ctx.name, "--kind", "orchestrator"),
      on: {},
      otherwise: "stop:S10",
    },
  };
}

/** The SPEC revert chain (Step 6a), under prefix `p`, continuing to `next`. */
function revertChain(p, next) {
  return {
    [`${p}-approved`]: {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/check-spec-approved.mjs", feat(ctx, "SPEC.md")),
      on: { 0: `goto:${p}-scope` },
      otherwise: `goto:${p}-not-approved`,
    },
    [`${p}-not-approved`]: { kind: "fn", fn: (ctx) => (ctx.spec = "not approved"), on: {}, otherwise: `goto:${next}` },
    [`${p}-scope`]: {
      kind: "cmd",
      argv: (ctx) =>
        node(
          ctx,
          ".claude/hooks/set-writes-scope.cjs",
          "--from-frontmatter",
          ".claude/commands/pharn-loop.md",
          "--target",
          feat(ctx, "SPEC.md")
        ),
      on: { 0: `goto:${p}-amend` },
      otherwise: `goto:${p}-failed`,
    },
    [`${p}-amend`]: {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/reconcile-baseline.mjs", "--amend-scope"),
      on: {},
      otherwise: `goto:${p}-edit`,
    },
    [`${p}-edit`]: {
      kind: "fn",
      fn: (ctx, io) => io.editProject(feat(ctx, "SPEC.md"), revertSpecText),
      on: { 0: `goto:${p}-check` },
      otherwise: `goto:${p}-failed`,
    },
    [`${p}-check`]: {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/check-spec.mjs", feat(ctx, "SPEC.md")),
      on: { 0: `goto:${p}-reverted` },
      otherwise: `goto:${p}-failed`,
    },
    [`${p}-reverted`]: { kind: "fn", fn: (ctx) => (ctx.spec = "reverted to Draft"), on: {}, otherwise: `goto:${next}` },
    [`${p}-failed`]: { kind: "fn", fn: (ctx) => (ctx.spec = "revert failed"), on: {}, otherwise: `goto:${next}` },
  };
}

/** Step 6a's edit, frontmatter only: `state: Draft`, `spec_content_hash: ""`, no `approved_by`. */
export function revertSpecText(text) {
  const end = text.indexOf("\n---", 4);
  const fm = text
    .slice(0, end)
    .replace(new RegExp("^state:.*$", "m"), "state: Draft")
    .replace(new RegExp("^spec_content_hash:.*$", "m"), 'spec_content_hash: ""')
    .replace(new RegExp("^approved_by:.*\\n", "m"), "");
  return fm + text.slice(end);
}

/** The whole quick loop, Steps 1a–5 plus the stop procedure, as a frozen table. */
export function buildProgram() {
  const steps = {
    // ── Driver preparation (not loop lines): the inline model, and whether `pharn-stage` exists ──
    "d-loop-model": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/check-model-config.mjs", "resolve", "loop"),
      capture: {
        on: [0],
        set: (ctx, out) => Object.assign(ctx.loopModel, { alias: JSON.parse(out).model, effortArgs: ["--effort", JSON.parse(out).effort] }),
      },
      on: { 0: "goto:d-agent" },
      otherwise: "stop:S9",
    },
    "d-agent": {
      kind: "cmd",
      argv: () => ["test", "-f", ".claude/agents/pharn-stage.md"],
      capture: { on: [0], set: (ctx) => (ctx.agentArgs = ["--agent", "pharn-stage"]) },
      on: {},
      otherwise: "goto:e-candidate",
    },
    // ── Step 1a ──
    "e-candidate": {
      kind: "fn",
      fn: (ctx, io) => io.writeProject("pharn/.run/feature-name/candidate.txt", `${ctx.slug}\n`),
      on: { 0: "goto:e-name" },
      otherwise: "stop:S1",
    },
    "e-name": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/feature-name.mjs", "--fresh"),
      capture: { on: [0], set: (ctx, out) => (ctx.name = out.split("\n")[0].trim()) },
      on: { 0: "goto:e-head" },
      otherwise: "stop:S1",
    },
    "e-head": {
      kind: "cmd",
      argv: () => ["git", "rev-parse", "HEAD"],
      capture: { on: [0], set: (ctx, out) => (ctx.base = out.trim()) },
      on: { 0: "goto:e-branch" },
      otherwise: "stop:S3",
    },
    "e-branch": {
      kind: "cmd",
      argv: () => ["git", "symbolic-ref", "--short", "-q", "HEAD"],
      capture: { on: [0], set: (ctx, out) => (ctx.branch = out.trim()) },
      on: {},
      otherwise: "goto:e-mkdir",
    },
    "e-mkdir": { kind: "fn", fn: (ctx, io) => io.mkdirProject(runDir(ctx)), on: { 0: "goto:e-status" }, otherwise: "stop:S9" },
    "e-status": {
      kind: "cmd",
      argv: () => ["git", "status", "--porcelain", "-uall"],
      projectStdout: (ctx) => `${runDir(ctx)}/pre-run-status.txt`,
      on: { 0: "goto:e-open" },
      otherwise: "stop:S9",
    },
    "e-open": {
      kind: "cmd",
      argv: (ctx) => node(ctx, ".claude/hooks/require-loop-record.cjs", "--open", ctx.name, "--cap", String(ctx.cap), "--mode", "quick"),
      capture: { on: [0], set: (ctx) => (ctx.opened = true) },
      on: { 0: "goto:e-isolation" },
      otherwise: "stop:S9",
    },
    // `--accept-host-execution` comes only from the driver's own argv (ctx.hostArgs, set by validateArgs).
    "e-isolation": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/check-run-isolation.mjs", ...ctx.hostArgs, "--feature", ctx.name),
      projectStdout: (ctx) => `${runDir(ctx)}/isolation.json`,
      on: { 0: "goto:e-pre-run" },
      otherwise: "stop:S15",
    },
    "e-pre-run": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/pre-run-snapshot.mjs", "--capture", ctx.name),
      on: { 0: "goto:e-run-start" },
      otherwise: "stop:S9",
    },
    "e-run-start": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/mark-phase.mjs", "--name", ctx.name, "--kind", "run-start"),
      on: {},
      otherwise: "goto:e-context",
    },
    "e-context": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/check-entry-context.mjs", "--feature", ctx.name),
      projectStdout: (ctx) => `${runDir(ctx)}/entry-context.txt`,
      on: { 3: "stop:S15b" },
      otherwise: "goto:e-instr",
    },
    "e-instr": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/check-instruction-files.mjs", "--report"),
      projectStdout: (ctx) => `${runDir(ctx)}/instruction-files.json`,
      on: {},
      otherwise: "goto:e-gates",
    },
    "e-gates": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/entry-gates.mjs", "--start", "--feature", ctx.name, "--timeout-ms", String(GATE_TIMEOUT_MS)),
      on: { 3: "stop:S4", 4: "stop:S14c" },
      otherwise: "goto:spec-start",
    },
    // ── Step 3 (quick item 2) ──
    ...routedStage("spec", {
      stage: "pharn-spec",
      key: "spec",
      modeArgs: ["--mode", "quick"],
      prompt: specPrompt,
      finish: reportFinish("spec", "goto:spec-approved"),
      rows: ["S6", "S6b", "S6c", "S9", "S10"],
    }),
    "spec-approved": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/check-spec-approved.mjs", feat(ctx, "SPEC.md")),
      on: { 0: "goto:spec-kind" },
      otherwise: "stop:S9",
    },
    "spec-kind": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/check-spec.mjs", "--spec-kind", feat(ctx, "SPEC.md")),
      on: { 0: "goto:spec-kind-token" },
      otherwise: "stop:S6c",
    },
    "spec-kind-token": {
      kind: "cmd",
      argv: (ctx) => tokenExit(ctx, "spec-kind", "spec-kind"),
      on: { 10: "goto:peek-1" },
      otherwise: "stop:S6c",
    },
    "peek-1": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/entry-gates.mjs", "--peek", "--feature", ctx.name),
      on: { 4: "stop:S14", 6: "stop:S14b" },
      otherwise: "goto:plan-start",
    },
    // ── Step 4 ──
    ...routedStage("plan", {
      stage: "pharn-plan",
      key: "plan",
      prompt: (ctx) => briefLine(ctx, "pharn-plan", ""),
      finish: reportFinish("plan", "goto:peek-2"),
      rows: ["S9", "S10"],
    }),
    "peek-2": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/entry-gates.mjs", "--peek", "--feature", ctx.name),
      on: { 4: "stop:S14", 6: "stop:S14b" },
      otherwise: "goto:grill-start",
    },
    // quick item 3: `inline:floor-only` (exit 3), then `/pharn-grill <name> --quick` inline — here, a session on the
    // config's `loop` model — then the inline return line, then the two floor exits.
    "grill-start": {
      kind: "cmd",
      argv: (ctx) =>
        node(
          ctx,
          "pharn/floor/stage-agent.mjs",
          "start",
          "--command",
          "pharn-loop",
          "--stage",
          "pharn-grill",
          "--name",
          ctx.name,
          "--mode",
          "quick"
        ),
      on: { 3: "goto:grill-session" },
      otherwise: "stop:S9",
    },
    "grill-session": {
      kind: "session",
      stage: "grill",
      argv: (ctx, sessionId) =>
        sessionArgv(ctx, {
          model: ctx.loopModel.alias,
          effortArgs: ctx.loopModel.effortArgs,
          agentArgs: [],
          sessionId,
          prompt: `/pharn-grill ${ctx.name} --quick`,
        }),
      on: {},
      otherwise: "goto:grill-return",
    },
    "grill-return": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/mark-phase.mjs", "--name", ctx.name, "--kind", "orchestrator"),
      on: {},
      otherwise: "goto:grill-agree",
    },
    "grill-agree": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/check-plan-spec-agree.mjs", feat(ctx, "PLAN.md"), feat(ctx, "SPEC.md")),
      on: { 0: "goto:grill-lessons" },
      otherwise: "stop:S9",
    },
    "grill-lessons": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/check-plan-lessons.mjs", feat(ctx, "PLAN.md"), "pharn/memory-bank/lessons-learned.md"),
      on: { 0: "goto:entry-wait" },
      otherwise: "stop:S9",
    },
    "entry-wait": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/entry-gates.mjs", "--wait", "--feature", ctx.name, "--budget-ms", String(BUDGET_MS)),
      on: { 5: "again", 0: "goto:test-start", 4: "stop:S14", 6: "stop:S14b", 3: "stop:S4" },
      otherwise: "goto:test-start",
    },
    // The test stage: whatever `finish` printed, the row comes from the checker (`pharn-loop.md` Step 4).
    ...routedStage("test", {
      stage: "pharn-test",
      key: "ac-test",
      prompt: (ctx) => briefLine(ctx, "pharn-test", ""),
      finish: { on: {}, otherwise: "goto:test-gate" },
      rows: [],
    }),
    "test-gate": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/check-test-stage.mjs", ctx.name, "--require-test-first"),
      capture: { on: [0], set: (ctx) => (ctx.acTests = "test-first") },
      on: { 0: "goto:probe-deny" },
      otherwise: "goto:test-preflight",
    },
    "test-preflight": {
      kind: "cmd",
      argv: (ctx) =>
        node(
          ctx,
          "pharn/floor/check-red-run.mjs",
          "--preflight",
          "--ac-tests",
          feat(ctx, "AC-TESTS.md"),
          "--discover",
          "package.json",
          "--root",
          "."
        ),
      on: { 1: "stop:S12" },
      otherwise: "stop:S9",
    },
    // ── The two probes (spike only; excluded from the comparison) ──
    "probe-deny": {
      kind: "session",
      stage: "probe-deny",
      argv: (ctx, sessionId) =>
        sessionArgv(ctx, {
          model: ctx.loopModel.alias,
          effortArgs: ctx.loopModel.effortArgs,
          agentArgs: ctx.agentArgs,
          sessionId,
          prompt: DENY_PROMPT,
        }),
      on: {},
      otherwise: "goto:probe-deny-check",
    },
    "probe-deny-check": {
      kind: "cmd",
      argv: () => ["test", "-e", "loop-driver-probe.txt"],
      on: { 1: "goto:probe-q-gate" },
      otherwise: "stop:S9",
    },
    "probe-q-gate": {
      kind: "cmd",
      argv: (ctx) => ["test", "-n", ctx.answer],
      on: { 0: "goto:probe-q-ask" },
      otherwise: "goto:build-start",
    },
    "probe-q-ask": {
      kind: "session",
      stage: "probe-question",
      capture: { set: (ctx, sessionId) => (ctx.questionSession = sessionId) },
      argv: (ctx, sessionId) =>
        sessionArgv(ctx, {
          model: ctx.loopModel.alias,
          effortArgs: ctx.loopModel.effortArgs,
          agentArgs: ctx.agentArgs,
          sessionId,
          prompt: QUESTION_PROMPT,
        }),
      on: {},
      otherwise: "goto:probe-q-answer",
    },
    "probe-q-answer": {
      kind: "session",
      stage: "probe-answer",
      resume: true,
      argv: (ctx) =>
        resumeArgv(ctx, {
          model: ctx.loopModel.alias,
          effortArgs: ctx.loopModel.effortArgs,
          sessionId: ctx.questionSession,
          prompt: answerPrompt(ctx),
        }),
      on: {},
      otherwise: "goto:probe-q-check",
    },
    "probe-q-check": {
      kind: "cmd",
      argv: (ctx) => ["grep", "-qxF", "--", ctx.answer, `pharn/.run/loop-driver/${ctx.name}/answer.txt`],
      on: {},
      otherwise: "goto:build-start",
    },
    // ── Step 5 (quick items 4–7) ──
    ...routedStage("build", {
      stage: "pharn-build",
      key: "build",
      iterArgs: (ctx) => ["--iteration", String(ctx.iter)],
      modeArgs: ["--mode", "quick"],
      prompt: (ctx) => briefLine(ctx, "pharn-build", ` --iteration ${ctx.iter} --mode quick`),
      finish: reportFinish("build", "goto:scope"),
      rows: ["S4", "S5", "S7", "S8", "S9", "S10"],
    }),
    scope: {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/check-quick-scope.mjs", "--feature", ctx.name, "--base", ctx.base),
      on: { 0: "goto:verify" },
      otherwise: "stop:S9",
    },
    verify: {
      kind: "cmd",
      argv: (ctx) =>
        node(
          ctx,
          "pharn/floor/stage-direct.mjs",
          "--stage",
          "pharn-verify",
          "--name",
          ctx.name,
          "--iteration",
          String(ctx.iter),
          "--timeout-ms",
          String(GATE_TIMEOUT_MS),
          "--budget-ms",
          String(BUDGET_MS)
        ),
      on: { 0: "goto:fresh", 5: "goto:verify-resume", 4: "stop:S4" },
      otherwise: "stop:S9",
    },
    "verify-resume": {
      kind: "cmd",
      argv: (ctx) =>
        node(
          ctx,
          "pharn/floor/stage-direct.mjs",
          "--stage",
          "pharn-verify",
          "--name",
          ctx.name,
          "--resume",
          "--budget-ms",
          String(BUDGET_MS)
        ),
      on: { 0: "goto:fresh", 5: "again", 4: "stop:S4" },
      otherwise: "stop:S9",
    },
    fresh: {
      kind: "cmd",
      argv: (ctx) =>
        node(ctx, "pharn/floor/check-loop-fresh.mjs", "--feature", ctx.name, "--base", ctx.base, "--iter", String(ctx.iter), "--front"),
      on: { 0: "goto:stop-read", 1: "goto:fresh-rerun", 4: "goto:fresh-reason" },
      otherwise: "stop:S11",
    },
    "fresh-rerun": {
      kind: "cmd",
      argv: (ctx) => tokenExit(ctx, "rerun-stage", "fresh", "--field", "stage_to_rerun"),
      on: { 10: "goto:verify" },
      otherwise: "stop:S11",
    },
    "fresh-reason": {
      kind: "cmd",
      argv: (ctx) => tokenExit(ctx, "fresh-reason", "fresh", "--field", "reason_code"),
      on: { 10: "stop:S4", 11: "stop:S13" },
      otherwise: "stop:S11",
    },
    "stop-read": {
      kind: "cmd",
      argv: (ctx) =>
        node(
          ctx,
          "pharn/floor/check-loop.mjs",
          feat(ctx, "verify-report.json"),
          feat(ctx, "regression-report.json"),
          "--iter",
          String(ctx.iter),
          "--cap",
          String(ctx.cap)
        ),
      capture: { on: [0, 1, 2, 3, 4], set: (ctx, out) => (ctx.decision = JSON.parse(out).decision) },
      on: { 0: "green", 3: "iterate", 1: "decision", 2: "decision", 4: "goto:stop-terminal" },
      otherwise: "decision",
    },
    "stop-terminal": {
      kind: "cmd",
      argv: (ctx) => tokenExit(ctx, "terminal-cause", "stop-read", "--field", "terminal_cause"),
      on: { 10: "stop:S13" },
      otherwise: "decision",
    },

    // ── At the stop (`pharn-loop-close.md`) ── entered at c-abort (blocked or not green) or c-abort-green.
    "c-abort-green": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/entry-gates.mjs", "--abort", "--feature", ctx.name),
      on: {},
      otherwise: "goto:c-scope-loop",
    },
    "c-abort": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/entry-gates.mjs", "--abort", "--feature", ctx.name),
      on: {},
      otherwise: "goto:c-feature-dir",
    },
    // A stop before the feature directory exists writes no record and no revert (`pharn-loop.md` Step 2).
    "c-feature-dir": {
      kind: "cmd",
      argv: (ctx) => ["test", "-d", `pharn/features/${ctx.name}`],
      on: { 0: "goto:c6a-approved" },
      otherwise: "goto:c-release",
    },
    ...revertChain("c6a", "c-scope-loop"),
    "c-scope-loop": {
      kind: "cmd",
      argv: (ctx) =>
        node(
          ctx,
          ".claude/hooks/set-writes-scope.cjs",
          "--from-frontmatter",
          ".claude/commands/pharn-loop.md",
          "--target",
          feat(ctx, "LOOP.md")
        ),
      on: {},
      otherwise: "goto:c-amend-loop",
    },
    "c-amend-loop": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/reconcile-baseline.mjs", "--amend-scope"),
      on: {},
      otherwise: "goto:c-head",
    },
    "c-head": {
      kind: "cmd",
      argv: () => ["git", "rev-parse", "HEAD"],
      capture: { on: [0], set: (ctx, out) => (ctx.commit = out.trim()) },
      on: {},
      otherwise: "goto:c-write-loop",
    },
    "c-write-loop": {
      kind: "fn",
      fn: (ctx, io) => io.writeProject(feat(ctx, "LOOP.md"), renderLoop(buildRecord(ctx))),
      on: { 0: "goto:c-closeout" },
      otherwise: "goto:c-release",
    },
    "c-closeout": closeoutStep([]),
    "c-closeout-repair": closeoutStep(["--after-repair"]),
    "c-closeout-retry": closeoutStep([]),
    // Step 6d: revert, rewrite the Outcome from the closeout's document, re-check the record.
    ...revertChain("c6d", "c6d-scope"),
    "c6d-scope": {
      kind: "cmd",
      argv: (ctx) =>
        node(
          ctx,
          ".claude/hooks/set-writes-scope.cjs",
          "--from-frontmatter",
          ".claude/commands/pharn-loop.md",
          "--target",
          feat(ctx, "LOOP.md")
        ),
      on: {},
      otherwise: "goto:c6d-amend",
    },
    "c6d-amend": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/reconcile-baseline.mjs", "--amend-scope"),
      on: {},
      otherwise: "goto:c6d-rewrite",
    },
    "c6d-rewrite": {
      kind: "fn",
      fn: (ctx, io) => io.writeProject(feat(ctx, "LOOP.md"), renderLoop(buildRecord(ctx))),
      on: {},
      otherwise: "goto:c6d-check",
    },
    "c6d-check": {
      kind: "cmd",
      argv: (ctx) => node(ctx, "pharn/floor/check-loop-record.mjs", feat(ctx, "LOOP.md")),
      on: {},
      otherwise: "goto:c-release",
    },
    // Final step.
    "c-release": {
      kind: "cmd",
      argv: (ctx) => node(ctx, ".claude/hooks/set-writes-scope.cjs", "--clear"),
      on: {},
      otherwise: "goto:c-close",
    },
    "c-close": {
      kind: "cmd",
      argv: (ctx) => node(ctx, ".claude/hooks/require-loop-record.cjs", "--close", ctx.name),
      on: {},
      otherwise: "end",
    },
  };
  return Object.freeze({ start: "d-loop-model", steps: Object.freeze(steps) });
}

function closeoutStep(extra) {
  return {
    kind: "cmd",
    argv: (ctx) => node(ctx, "pharn/floor/loop-closeout.mjs", "--feature", ctx.name, "--base", ctx.base, ...extra),
    capture: { on: [0, 3, 4], set: (ctx, out) => (ctx.closeout = JSON.parse(out.trim().split("\n").pop())) },
    on: { 0: "goto:c-release", 3: "goto:c-release", 4: "goto:c6d-approved", 5: "goto:c-closeout-repair", 2: "goto:c-closeout-retry" },
    otherwise: "goto:c-release",
  };
}

/** Closed next-step text per blocked row (fixed by this spike; DATA for whoever reads the record). */
export const NEXT_STEPS = Object.freeze({
  S1: "The slug was refused; re-run the driver with a different `--slug`.",
  S3: "No git base could be read; run the driver from a repository with a commit.",
  S4: "No gate was discovered; check the project's `package.json` scripts and `gates.exclude`.",
  S5: "The build's seam-config check refused; read BUILD.md.",
  S6: "The intent was too thin for a SPEC; widen the intent file.",
  S6b: "The Draft SPEC still carries a clarification marker; a person answers it.",
  S6c: "The intent does not fit a quick SPEC; narrow it or run without quick mode.",
  S7: "The build found the plan ambiguous; a person re-plans.",
  S8: "The seam resolver reached ask; a person resolves the seam.",
  S9: "A stage refused, or a driver step failed; read the step named above in the driver's `steps.jsonl`.",
  S10: "A stage asked a question; read its session stream in the driver's `sessions/`.",
  S11: "The evidence did not belong to the tree; read `check-loop-fresh.mjs`'s document in the driver's `stdout/`.",
  S12: "No test runner with per-test results; read `check-red-run.mjs --preflight`'s last line in `stdout/`.",
  S13: "The AC evidence changed after the test stage; a person re-runs the test stage or re-plans.",
  S14: "A gate was red at entry; fix it, or exclude it in `pharn.config.json` before a re-run.",
  S14b: "A gate was not measured at entry; give it a longer `gates.timeoutMs`, or exclude it.",
  S14c: "An earlier run measured a gate red on this tree; fix the gate and re-run.",
  S15: "The isolation check refused; re-run in an isolated environment or with `--accept-host-execution`.",
  S15b: "The entry-context check refused.",
});

/** Render a record built by `buildRecord` — a plain join, no decision here. */
export function renderLoop(r) {
  return [
    "---",
    ...r.envelope.map(([k, v]) => `${k}: ${v}`),
    "---",
    "",
    `# LOOP — ${r.name}`,
    "",
    ...r.body.map((l) => `- ${l}`),
    "",
    "## Not checked in quick mode",
    "",
    "- regressions outside the feature — no base comparison ran; the scope check did;",
    "- the plan interrogation — `/pharn-grill --quick` ran its two floor stops only;",
    "- `RUN-REPORT.md` — not rendered; `cost.json` is.",
    "",
    "## Outcome",
    "",
    ...r.outcome.map(([k, v]) => `${k}: ${v}`),
    "",
    "## Handoff",
    "",
    "### investigated",
    "",
    r.investigated,
    "",
    "### learned",
    "",
    r.learned,
    "",
    "### next_steps",
    "",
    r.nextSteps,
    "",
  ].join("\n");
}

// ==== INTERPRETER BEGIN ====
// Every conditional of the driver lives in this region (see the header for the four kinds).

/** Validate the CLI's values and return the run context. Throws on any refusal, before anything runs. */
export function validateArgs(v, { cwd, exists, readText, nodePath, driverDir }) {
  for (const k of ["project", "out", "slug", "intent"]) {
    if (typeof v[k] !== "string" || v[k] === "") throw new Error(`loop-driver: --${k} is required`);
  }
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(v.slug)) throw new Error("loop-driver: --slug must be kebab-case");
  const cap = v.cap === undefined ? 3 : Number(v.cap);
  if (!Number.isInteger(cap) || cap < 1 || cap > 10) throw new Error("loop-driver: --cap must be an integer 1..10");
  const answer = v.answer === undefined ? "" : v.answer;
  if (answer !== "" && !/^[a-z0-9-]{1,32}$/.test(answer)) throw new Error("loop-driver: --answer must match [a-z0-9-]{1,32}");
  const abs = (p) => (isAbsolute(p) ? p : join(cwd, p));
  const project = abs(v.project);
  const out = abs(v.out);
  if (!exists(join(project, "pharn.config.json"))) throw new Error("loop-driver: --project holds no pharn.config.json");
  if (exists(out)) throw new Error("loop-driver: --out already exists — every run writes into a new directory (L66)");
  const intent = readText(abs(v.intent));
  if (intent.trim() === "") throw new Error("loop-driver: --intent is empty");
  return {
    project,
    out,
    slug: v.slug,
    intent,
    cap,
    answer,
    hostArgs: v["accept-host-execution"] === true ? ["--accept-host-execution"] : [],
    claude: v.claude === undefined ? "claude" : v.claude,
    node: nodePath,
    driverDir,
    iter: 1,
    name: "",
    base: "",
    branch: "detached",
    commit: "unknown",
    decision: "INCONCLUSIVE",
    spec: "not approved",
    acTests: "not reached",
    agentArgs: [],
    loopModel: { alias: "sonnet", effortArgs: [] },
    stage: {},
    lastStdout: {},
    sessions: [],
    trail: [],
    stop: null,
    closeout: null,
    opened: false,
    crash: null,
  };
}

/** The action for an exit code: own-property membership in `on` (L15), else `otherwise`. */
export function decide(step, exit) {
  return Object.hasOwn(step.on, String(exit)) ? step.on[String(exit)] : step.otherwise;
}

/** Map a spawn result to an exit code: a status, else 255 (a signal, a timeout or a spawn error). */
export function exitOf(r) {
  return typeof r.status === "number" ? r.status : 255;
}

function runStep(id, step, ctx, io) {
  if (step.kind === "fn") {
    try {
      step.fn(ctx, io);
      return io.record({ id, kind: "fn", exit: 0 });
    } catch (e) {
      return io.record({ id, kind: "fn", exit: 70, error: String(e && e.message) });
    }
  }
  if (step.kind === "session") {
    const sessionId = step.resume ? ctx.questionSession : io.uuid();
    if (step.capture) step.capture.set(ctx, sessionId);
    const r = io.session(id, step.stage, step.argv(ctx, sessionId), sessionId, ctx);
    return exitOf(r);
  }
  const r = io.spawn(id, step.argv(ctx), ctx);
  const exit = exitOf(r);
  const stdout = typeof r.stdout === "string" ? r.stdout : "";
  io.saveStdout(id, stdout, ctx);
  if (step.projectStdout) {
    try {
      io.writeProject(step.projectStdout(ctx), stdout);
    } catch (e) {
      io.note(`redirect failed at ${id}: ${String(e && e.message)}`);
      return 70;
    }
  }
  if (step.capture && step.capture.on.includes(exit)) {
    try {
      step.capture.set(ctx, stdout);
    } catch (e) {
      io.note(`capture failed at ${id}: ${String(e && e.message)}`);
    }
  }
  return exit;
}

/** Assemble the record at a stop whose kind an earlier exit code decided (`ctx.stop`). */
export function buildRecord(ctx) {
  const blocked = ctx.stop.kind === "blocked";
  const id = blocked ? ROW_IDS[ctx.stop.row] : null;
  const decision = blocked ? "INCONCLUSIVE" : ctx.decision;
  const envelope = [["decision", decision]];
  if (blocked) envelope.push(["blocked", id]);
  envelope.push(["iterations", String(ctx.iter)]);
  if (!blocked) envelope.push(["cap", String(ctx.cap)]);
  envelope.push(["mode", "quick"], ["commit", ctx.commit], ["date", ctx.today], ["isolation", ctx.isolationLine]);
  const green = ctx.stop.kind === "green";
  const outcomeCommit =
    ctx.closeout && typeof ctx.closeout.outcome === "string"
      ? ctx.closeout.outcome
      : green
        ? `committed pharn-loop/${ctx.name}`
        : `not committed: ${decision}`;
  const acTests = ["test-gate", "test-preflight"].includes(ctx.stop.at) && !green ? "refused" : ctx.acTests;
  const body = [
    "Driven by the CORE-113 spike driver (`.dev/features/loop-driver-spike/driver/loop-driver.mjs` in PHARN-OSS): every floor line ran from a node process, and each model stage ran in its own headless `claude -p` session.",
    `Model sessions, in order: ${ctx.sessions.map((s) => `${s.stage} (${s.model}${s.agent ? ", --agent pharn-stage" : ""})`).join(", ") || "none"}.`,
    `Iterations reached: ${ctx.iter}; the per-iteration verify and scope exits are in the driver's \`steps.jsonl\`.`,
    `The run stopped at driver step \`${ctx.stop.at}\` (exit ${ctx.stop.exit}) — ${blocked ? `blocked ${ctx.stop.row} (\`${id}\`)` : `\`check-loop.mjs\` decision ${decision}`}.`,
    "Pointers: `GRILL.md`, `VERIFY.md` (cited, not restated).",
  ];
  if (ctx.crash) body.push(`The driver itself failed and stopped the run: ${JSON.stringify(ctx.crash.slice(0, 300))}.`);
  return {
    name: ctx.name,
    envelope,
    body,
    outcome: [
      ["commit", outcomeCommit],
      ["spec", ctx.spec],
      ["blocked", blocked ? id : "none"],
      ["ac-tests", acTests],
    ],
    investigated:
      "No synthesis: the spike driver wrote this record from closed facts only, so the handoff a model would write is lost. The steps, exit codes and session streams are in the driver's output directory (`steps.jsonl`, `sessions/`, `stdout/`).",
    learned: `The driven run stopped at step \`${ctx.stop.at}\` with exit ${ctx.stop.exit}, recorded as ${blocked ? `blocked ${ctx.stop.row}` : decision}.`,
    nextSteps: blocked
      ? NEXT_STEPS[ctx.stop.row]
      : green
        ? `A person reviews the \`pharn-loop/${ctx.name}\` branch; nothing was pushed or merged.`
        : "A person reads VERIFY.md for the standing reds; nothing was committed.",
  };
}

/** The witness line the record copies; empty when it cannot be read (the record check then says so). */
function readLineSafe(io, rel) {
  try {
    return io.readProjectLine(rel);
  } catch {
    return "";
  }
}

/** Walk the program. Returns the context; the caller writes the summary. */
export function interpret(program, ctx, io) {
  let id = program.start;
  let steps = 0;
  let again = 0;
  let closing = false;
  const enterStop = (stop) => {
    ctx.stop = stop;
    closing = true;
    if (stop.kind === "green") ctx.spec = "approved by the model";
    return stop.kind === "green" ? "c-abort-green" : "c-abort";
  };
  for (;;) {
    try {
      if (++steps > MAX_STEPS) {
        if (closing) return ctx;
        id = enterStop({ kind: "blocked", row: "S9", at: id, exit: -1 });
        ctx.crash = "step budget spent";
        continue;
      }
      if (!Object.hasOwn(program.steps, id)) throw new Error(`no step ${id}`);
      const step = program.steps[id];
      const exit = runStep(id, step, ctx, io);
      const action = decide(step, exit);
      ctx.trail.push([id, exit, action]);
      if (!ACTION_RE.test(action)) throw new Error(`action outside the closed set at ${id}: ${action}`);
      if (action === "again") {
        if (++again > MAX_AGAIN) {
          id = closing ? "c-release" : enterStop({ kind: "blocked", row: "S9", at: id, exit });
          again = 0;
        }
        continue;
      }
      again = 0;
      if (action === "end") return ctx;
      if (action.startsWith("goto:")) {
        id = action.slice(5);
        continue;
      }
      if (action === "iterate") {
        ctx.iter += 1;
        id = "build-start";
        continue;
      }
      if (closing) {
        id = "c-release";
        continue;
      }
      ctx.today = io.today();
      ctx.isolationLine = readLineSafe(io, `pharn/.run/pharn-loop/${ctx.name}/isolation.json`);
      if (action === "green") id = enterStop({ kind: "green", at: id, exit });
      else if (action === "decision") id = enterStop({ kind: "decision", at: id, exit });
      else id = enterStop({ kind: "blocked", row: action.slice(5), at: id, exit });
    } catch (e) {
      ctx.crash = String((e && e.stack) || e);
      io.note(`driver error at ${id}: ${ctx.crash}`);
      if (closing) {
        if (id === "c-close" || id === "c-release") return ctx;
        id = "c-release";
        continue;
      }
      ctx.today = io.today();
      ctx.isolationLine = "";
      id = enterStop({ kind: "blocked", row: "S9", at: id, exit: -1 });
    }
  }
}
// ==== INTERPRETER END ====
