// .dev/floor/release-workflow.test.mjs — pins `.github/workflows/release.yml` and EXECUTES its `run:` blocks.
//
// ★ marks an executed test; ✧ marks a pin of committed text.
//
// WHY THE BLOCKS ARE EXECUTED (lessons-learned L45). The release guard lives in the workflow's `run:` blocks, not in a
// script a suite would spawn, so a test of a copy of the logic would cover the copy. Each ★ test below extracts a block
// from the committed YAML and runs it as GitHub runs a `run:` step (`bash --noprofile --norc -eo pipefail`), with a
// stub `gh` first on PATH that answers from canned output and logs every call. The negative controls (a failed check,
// a tag at another commit, a non-main ref) must exit 1.
//
// WHAT THE STUB DOES NOT MODEL (L67 — a list known so far, not complete): pagination (`--paginate` is passed through
// and ignored), rate limits and partial failures inside one call, the `--jq` engine (the stub returns the filter's
// OUTPUT, so the filters are checked separately below with `jq -r`, while gh runs gojq — the same language, not the
// same engine), the ruleset, GitHub's concurrency queue, and `gh release create`'s own behaviour. The CHANGELOG step's
// two checkers have their own suites; its lines are pinned as text here, because `--base-ref HEAD^1` depends on the
// local branch.
//
// THE CROSS-REPO PIN (L43). `TAG_RE` and `SKILLS_VERSION_FILE` must equal pharn-cli's RELEASE_TAG_RE language
// (`src/lib/validate.ts`) and SKILLS_VERSION_FILE (`src/lib/constants.ts`). They cannot be imported across
// repositories, so the literals below are COPIES: a green pin certifies agreement with the copy, not with pharn-cli's
// live source.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TAG_RE, releaseBody } from "./changelog-section.mjs";

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const WORKFLOW = readFileSync(join(REPO, ".github/workflows/release.yml"), "utf8").replace(/\r\n/g, "\n");
const LINES = WORKFLOW.split("\n");

/** pharn-cli `src/lib/validate.ts` RELEASE_TAG_RE is `/^v(\d+\.\d+\.\d+)$/`; this is its language without the group. */
const PHARN_CLI_TAG_RE = "^v\\d+\\.\\d+\\.\\d+$";
/** pharn-cli `src/lib/constants.ts` SKILLS_VERSION_FILE. */
const PHARN_CLI_SKILLS_VERSION_FILE = "SKILLS_VERSION";
/** Ruleset 18045407's required status checks, read 2026-10-26 (`gh api repos/pharn-dev/pharn-oss/rulesets/18045407`). */
const RULESET_REQUIRED = [
  "floor",
  "check",
  "Analyze (javascript-typescript)",
  "Socket Security: Project Report",
  "Socket Security: Pull Request Alerts",
];
/** The ones that post on a push to main, each with the app whose run counts (GATE 1, Q1). */
const REQUIRED = [
  "github-actions floor",
  "github-actions check",
  "github-actions Analyze (javascript-typescript)",
  "socket-security Socket Security: Project Report",
];
const STEPS = ["Resolve the release", "Wait for the required checks", "CHANGELOG checks", "Release body", "Tag and release"];
const SHA = "1111111111111111111111111111111111111111";
const OTHER = "2222222222222222222222222222222222222222";

const indentOf = (l) => l.length - l.trimStart().length;

/** A step's lines, from its `- name:` line to the next step. Throws when absent, so no test passes vacuously. */
function stepLines(name) {
  const start = LINES.findIndex((l) => l.trim() === `- name: ${name}`);
  assert.notEqual(start, -1, `step "${name}" not found`);
  const ind = indentOf(LINES[start]);
  let end = LINES.length;
  for (let i = start + 1; i < LINES.length; i++)
    if (LINES[i].trim() !== "" && indentOf(LINES[i]) <= ind) {
      end = i;
      break;
    }
  return LINES.slice(start, end);
}

/** A step's `run: |` block, dedented. */
function runBlock(name) {
  const lines = stepLines(name);
  const at = lines.findIndex((l) => l.trim() === "run: |");
  assert.notEqual(at, -1, `step "${name}" has no "run: |" block`);
  const ind = indentOf(lines[at]);
  const body = [];
  for (const l of lines.slice(at + 1)) {
    if (l.trim() !== "" && indentOf(l) <= ind) break;
    body.push(l);
  }
  const cut = indentOf(body.find((l) => l.trim() !== ""));
  return body.map((l) => l.slice(cut)).join("\n");
}

/** The job-level `env:` map, with the one block scalar (REQUIRED_CHECKS) read as its lines. */
function jobEnv() {
  const at = LINES.findIndex((l) => l === "    env:");
  assert.notEqual(at, -1, "the job has no env: block");
  const env = {};
  let block = null;
  for (const l of LINES.slice(at + 1)) {
    if (l.trim() === "" || l.trim().startsWith("#")) continue;
    const ind = indentOf(l);
    if (ind <= 4) break;
    if (block && ind >= 8) {
      env[block].push(l.trim());
      continue;
    }
    block = null;
    const m = /^ {6}([A-Z_]+): ?(.*)$/.exec(l);
    assert.ok(m, `unexpected env line: ${l}`);
    if (m[2] === "|") {
      block = m[1];
      env[block] = [];
    } else env[m[1]] = m[2].replace(/^'(.*)'$/, "$1");
  }
  return env;
}

// ─── ✧ pins of the committed text ─────────────────────────────────────────────────────────────────────────────────

test("✧ triggers: a push to main and a manual dispatch, nothing else", () => {
  const at = LINES.indexOf("on:");
  assert.notEqual(at, -1);
  assert.deepEqual(LINES.slice(at, at + 5), ["on:", "  push:", "    branches: [main]", "  workflow_dispatch:", ""]);
  assert.ok(
    !/pull_request/.test(
      WORKFLOW.split("\n")
        .filter((l) => !l.trim().startsWith("#"))
        .join("\n")
    ),
    "no pull_request trigger"
  );
});

test("✧ least privilege: no workflow permissions; the job alone gets contents: write and checks: read", () => {
  assert.ok(LINES.includes("permissions: {}"));
  const at = LINES.indexOf("    permissions:");
  assert.notEqual(at, -1);
  assert.deepEqual(LINES.slice(at + 1, at + 3), ["      contents: write", "      checks: read"]);
  assert.ok(indentOf(LINES[at + 3]) <= 4, "the job permissions hold exactly two entries");
  assert.equal(WORKFLOW.match(/^\s*permissions:/gm).length, 2);
});

test("✧ concurrency: one release group, a running release is never cancelled", () => {
  const at = LINES.indexOf("concurrency:");
  assert.deepEqual(LINES.slice(at, at + 3), ["concurrency:", "  group: release", "  cancel-in-progress: false"]);
});

test("✧ checkout keeps no credentials and fetches the parent; every action is SHA-pinned as in ci.yml", () => {
  assert.match(WORKFLOW, /actions\/checkout@[0-9a-f]{40} # v[\d.]+\n {8}with:\n {10}persist-credentials: false\n {10}fetch-depth: 2\n/);
  const ci = readFileSync(join(REPO, ".github/workflows/ci.yml"), "utf8");
  const uses = WORKFLOW.split("\n").filter((l) => /^\s*-?\s*uses:/.test(l));
  assert.equal(uses.length, 2);
  for (const l of uses) {
    const m = /uses: ([\w.-]+\/[\w./-]+)@([0-9a-f]{40}) # (v[\d.]+)$/.exec(l);
    assert.ok(m, `not SHA-pinned: ${l}`);
    assert.ok(ci.includes(`${m[1]}@${m[2]} # ${m[3]}`), `${m[1]} is pinned differently from ci.yml`);
  }
});

test("✧ the steps, in order, and every step after Resolve is skipped once the release exists", () => {
  const names = LINES.filter((l) => /^ {6}- name: /.test(l)).map((l) => l.replace(/^ {6}- name: /, ""));
  assert.deepEqual(names, STEPS);
  for (const name of STEPS.slice(1)) assert.ok(stepLines(name).includes("        if: ${{ steps.resolve.outputs.action != 'done' }}"), name);
});

test("✧ no ${{ }} inside a run: block, and the token reaches only the three steps that call gh", () => {
  for (const name of STEPS) assert.ok(!runBlock(name).includes("${{"), `${name} interpolates into run:`);
  const withToken = STEPS.filter((name) => stepLines(name).some((l) => l.trim() === "GH_TOKEN: ${{ github.token }}"));
  assert.deepEqual(withToken, ["Resolve the release", "Wait for the required checks", "Tag and release"]);
  for (const name of STEPS) assert.equal(runBlock(name).includes("gh "), withToken.includes(name), name);
});

test("✧ TAG_RE and SKILLS_VERSION_FILE equal pharn-cli's, and changelog-section.mjs uses the same pattern", () => {
  const env = jobEnv();
  assert.equal(env.TAG_RE, PHARN_CLI_TAG_RE);
  assert.equal(TAG_RE.source, PHARN_CLI_TAG_RE);
  assert.equal(env.SKILLS_VERSION_FILE, PHARN_CLI_SKILLS_VERSION_FILE);
});

test("✧ the poll bound: every 60 s, at most 45 times, inside the job's 60-minute timeout", () => {
  const env = jobEnv();
  assert.equal(env.POLL_INTERVAL_S, "60");
  assert.equal(env.POLL_MAX, "45");
  assert.ok(LINES.includes("    timeout-minutes: 60"));
  assert.ok((Number(env.POLL_INTERVAL_S) * Number(env.POLL_MAX)) / 60 < 60);
});

test("✧ REQUIRED_CHECKS is exactly the ruleset's checks that post on a push, each with its app", () => {
  const env = jobEnv();
  assert.deepEqual(env.REQUIRED_CHECKS, REQUIRED);
  const names = REQUIRED.map((l) => l.slice(l.indexOf(" ") + 1));
  for (const n of names) assert.ok(RULESET_REQUIRED.includes(n), `${n} is not a required check`);
  assert.deepEqual(
    RULESET_REQUIRED.filter((n) => !names.includes(n)),
    ["Socket Security: Pull Request Alerts"]
  );
});

test("✧ the CHANGELOG step runs the two checkers on this commit", () => {
  assert.equal(
    runBlock("CHANGELOG checks"),
    "node .dev/floor/check-skills-version-recorded.mjs .\nnode .dev/floor/check-changelog-entry.mjs --base-ref HEAD^1"
  );
});

// ─── the --jq filters, run through jq (gh's own engine is gojq) ────────────────────────────────────────────────────

const JQ_CASES = [
  {
    filter: '.[] | select(.ref == "refs/tags/" + env.TAG) | [.object.type, .object.sha] | @tsv',
    input: [
      { ref: "refs/tags/v1.2.30", object: { type: "commit", sha: OTHER } },
      { ref: "refs/tags/v1.2.3", object: { type: "tag", sha: "abc" } },
    ],
    out: "tag\tabc",
  },
  { filter: "[.object.type, .object.sha] | @tsv", input: { object: { type: "commit", sha: SHA } }, out: `commit\t${SHA}` },
  {
    filter: ".[] | select(.tag_name == env.TAG) | [.draft, .prerelease] | @tsv",
    input: [
      { tag_name: "v1.2.4", draft: true, prerelease: false },
      { tag_name: "v1.2.3", draft: false, prerelease: false },
    ],
    out: "false\tfalse",
  },
  {
    filter: '.check_runs[] | [.id, .app.slug, .name, .status, (.conclusion // "")] | @tsv',
    input: {
      check_runs: [
        { id: 7, app: { slug: "github-actions" }, name: "check", status: "in_progress", conclusion: null },
        { id: 8, app: { slug: "socket-security" }, name: "Socket Security: Project Report", status: "completed", conclusion: "success" },
      ],
    },
    out: "7\tgithub-actions\tcheck\tin_progress\t\n8\tsocket-security\tSocket Security: Project Report\tcompleted\tsuccess",
  },
  { filter: ".sha", input: { sha: "deadbeef" }, out: "deadbeef" },
];

test("★ every --jq filter in the workflow yields what the run blocks parse (jq -r over a recorded shape)", (t) => {
  const filters = STEPS.flatMap((name) => [...runBlock(name).matchAll(/--jq '([^']*)'|--jq (\.sha)\b/g)].map((m) => m[1] ?? m[2]));
  assert.deepEqual([...filters].sort(), JQ_CASES.map((c) => c.filter).sort(), "every filter has a case, and every case a filter");
  if (spawnSync("jq", ["--version"]).status !== 0) {
    t.skip("jq is not installed here; CI's ubuntu-latest has it");
    return;
  }
  for (const c of JQ_CASES) {
    const r = spawnSync("jq", ["-r", c.filter], {
      input: JSON.stringify(c.input),
      encoding: "utf8",
      env: { ...process.env, TAG: "v1.2.3" },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout.replace(/\n$/, ""), c.out, c.filter);
  }
});

// ─── ★ the run blocks, executed against a stub gh ──────────────────────────────────────────────────────────────────

const STUB = `#!/usr/bin/env node
const fs = require("fs");
const args = process.argv.slice(2);
fs.appendFileSync(process.env.STUB_LOG, JSON.stringify(args) + "\\n");
const cfg = JSON.parse(fs.readFileSync(process.env.STUB_CONFIG, "utf8"));
const key = args.join(" ");
for (const [i, r] of cfg.routes.entries()) {
  if (!key.includes(r.match)) continue;
  let reply = r;
  if (r.sequence) {
    const counter = process.env.STUB_CONFIG + "." + i;
    const n = fs.existsSync(counter) ? Number(fs.readFileSync(counter, "utf8")) : 0;
    fs.writeFileSync(counter, String(n + 1));
    reply = r.sequence[Math.min(n, r.sequence.length - 1)];
  }
  process.stdout.write(reply.stdout ?? "");
  process.exit(reply.code ?? 0);
}
process.stderr.write("stub gh: no route for " + key + "\\n");
process.exit(1);
`;

/** Run step `name`'s block with `routes` for the stub, in `cwd`, with `env` on top of the GitHub defaults. */
function runStep(name, { routes = [], env = {}, files = {}, cwd } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "release-workflow-"));
  try {
    const bin = join(dir, "bin");
    mkdirSync(bin);
    writeFileSync(join(bin, "gh"), STUB);
    chmodSync(join(bin, "gh"), 0o755);
    const work = join(dir, "work");
    mkdirSync(work);
    for (const [f, text] of Object.entries(files)) writeFileSync(join(work, f), text);
    writeFileSync(join(dir, "config.json"), JSON.stringify({ routes }));
    writeFileSync(join(dir, "log"), "");
    writeFileSync(join(dir, "output"), "");
    writeFileSync(join(dir, "step.sh"), runBlock(name));
    const job = jobEnv();
    const r = spawnSync("bash", ["--noprofile", "--norc", "-eo", "pipefail", join(dir, "step.sh")], {
      cwd: cwd ?? work,
      encoding: "utf8",
      env: {
        PATH: `${bin}${delimiter}${process.env.PATH}`,
        HOME: process.env.HOME,
        TAG_RE: job.TAG_RE,
        SKILLS_VERSION_FILE: job.SKILLS_VERSION_FILE,
        POLL_INTERVAL_S: "0",
        POLL_MAX: "3",
        REQUIRED_CHECKS: `${job.REQUIRED_CHECKS.join("\n")}\n`,
        GITHUB_REF: "refs/heads/main",
        GITHUB_SHA: SHA,
        GITHUB_REPOSITORY: "pharn-dev/pharn-oss",
        GITHUB_OUTPUT: join(dir, "output"),
        RUNNER_TEMP: dir,
        STUB_LOG: join(dir, "log"),
        STUB_CONFIG: join(dir, "config.json"),
        ...env,
      },
    });
    const calls = readFileSync(join(dir, "log"), "utf8")
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    const outputs = Object.fromEntries(
      readFileSync(join(dir, "output"), "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => l.split("="))
    );
    let notes = null;
    try {
      notes = readFileSync(join(dir, "release-notes.md"), "utf8");
    } catch {
      /* absent unless the body step ran */
    }
    return { status: r.status, stdout: r.stdout, stderr: r.stderr, calls, outputs, notes };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const VERSION = { SKILLS_VERSION: "1.2.3\n" };
const REFS = "git/matching-refs/tags/v1.2.3";
const RELEASES = "releases?per_page=100";

test("★ resolve: no tag yet → tag-and-release", () => {
  const r = runStep("Resolve the release", { files: VERSION, routes: [{ match: REFS, stdout: "" }] });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(r.outputs, { tag: "v1.2.3", action: "tag-and-release" });
});

test("★ resolve: an annotated tag at this commit with a published release → exit 0, already released", () => {
  const r = runStep("Resolve the release", {
    files: VERSION,
    routes: [
      { match: REFS, stdout: "tag\tabc\n" },
      { match: "git/tags/abc", stdout: `commit\t${SHA}\n` },
      { match: RELEASES, stdout: "false\tfalse\n" },
    ],
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.outputs.action, "done");
  assert.match(r.stdout, /already released: v1\.2\.3/);
});

test("★ resolve: a tag at this commit with no release (an earlier run failed) → release-only", () => {
  const r = runStep("Resolve the release", {
    files: VERSION,
    routes: [
      { match: REFS, stdout: `commit\t${SHA}\n` },
      { match: RELEASES, stdout: "" },
    ],
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.outputs.action, "release-only");
});

const REFUSALS = [
  ["a tag at another commit is never moved", { routes: [{ match: REFS, stdout: `commit\t${OTHER}\n` }] }, /TAG_ELSEWHERE/],
  [
    "an annotated tag that resolves to another commit",
    {
      routes: [
        { match: REFS, stdout: "tag\tabc\n" },
        { match: "git/tags/abc", stdout: `commit\t${OTHER}\n` },
      ],
    },
    /TAG_ELSEWHERE/,
  ],
  [
    "a tag on something other than a commit",
    {
      routes: [
        { match: REFS, stdout: "tag\tabc\n" },
        { match: "git/tags/abc", stdout: "tree\tfff\n" },
      ],
    },
    /TAG_NOT_COMMIT/,
  ],
  [
    "a draft release a person made is left alone",
    {
      routes: [
        { match: REFS, stdout: `commit\t${SHA}\n` },
        { match: RELEASES, stdout: "true\tfalse\n" },
      ],
    },
    /RELEASE_NOT_PUBLISHED/,
  ],
  ["the tag API failing", { routes: [{ match: REFS, code: 1 }] }, /API: cannot list tags/],
  [
    "the release API failing",
    {
      routes: [
        { match: REFS, stdout: `commit\t${SHA}\n` },
        { match: RELEASES, code: 1 },
      ],
    },
    /API: cannot list releases/,
  ],
];

for (const [label, opts, message] of REFUSALS) {
  test(`★ resolve refuses (exit 1): ${label}`, () => {
    const r = runStep("Resolve the release", { files: VERSION, ...opts });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, message);
    assert.deepEqual(r.outputs, {}, "no output is written on a refusal");
  });
}

for (const [label, opts, message] of [
  ["a ref other than main", { files: VERSION, env: { GITHUB_REF: "refs/heads/feature" } }, /NOT_MAIN/],
  ["no SKILLS_VERSION", {}, /NO_VERSION/],
  ["a SKILLS_VERSION that is not X.Y.Z", { files: { SKILLS_VERSION: "1.2\n" } }, /BAD_VERSION/],
  ["a SKILLS_VERSION with a second line", { files: { SKILLS_VERSION: "1.2.3\nv9.9.9\n" } }, /BAD_VERSION/],
]) {
  test(`★ resolve refuses before any API call: ${label}`, () => {
    const r = runStep("Resolve the release", opts);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, message);
    assert.deepEqual(r.calls, []);
  });
}

const CHECKS = "check-runs?per_page=100";
const run = (id, app, name, status, conclusion = "") => `${id}\t${app}\t${name}\t${status}\t${conclusion}`;
const ALL_GREEN = [
  run(10, "github-actions", "floor", "completed", "success"),
  run(11, "github-actions", "check", "completed", "success"),
  run(12, "github-actions", "Analyze (javascript-typescript)", "completed", "success"),
  run(13, "socket-security", "Socket Security: Project Report", "completed", "success"),
  run(14, "github-actions", "gitleaks", "completed", "failure"),
];
const checksRoute = (rows) => ({ match: CHECKS, stdout: `${rows.join("\n")}\n` });
const polls = (r) => r.calls.filter((c) => c.join(" ").includes(CHECKS)).length;

test("★ wait: every required check succeeded → exit 0 on the first poll (an unrequired red check is ignored)", () => {
  const r = runStep("Wait for the required checks", { routes: [checksRoute(ALL_GREEN)] });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /all 4 required checks succeeded/);
  assert.equal(polls(r), 1);
});

test("★ wait: a required check that failed ends the job at once", () => {
  const rows = ALL_GREEN.map((l) => (l.includes("\tcheck\t") ? run(11, "github-actions", "check", "completed", "failure") : l));
  const r = runStep("Wait for the required checks", { routes: [checksRoute(rows)] });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /CHECK_FAILED: check \(github-actions\) concluded failure/);
  assert.equal(polls(r), 1);
});

test("★ wait: a missing required check runs to the bound, then fails", () => {
  const rows = ALL_GREEN.filter((l) => !l.includes("Socket"));
  const r = runStep("Wait for the required checks", { routes: [checksRoute(rows)] });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /TIMEOUT: .* after 3 polls/);
  assert.equal(polls(r), 3);
});

test("★ wait: a run with the right name from another app does not count", () => {
  const rows = ALL_GREEN.map((l) => (l.includes("\tcheck\t") ? run(11, "some-other-app", "check", "completed", "success") : l));
  const r = runStep("Wait for the required checks", { routes: [checksRoute(rows)] });
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /waiting for check \(github-actions\): no run yet/);
});

test("★ wait: in progress, then success → exit 0 on the second poll", () => {
  const first = ALL_GREEN.map((l) => (l.includes("\tfloor\t") ? run(10, "github-actions", "floor", "in_progress") : l));
  const r = runStep("Wait for the required checks", {
    routes: [{ match: CHECKS, sequence: [{ stdout: `${first.join("\n")}\n` }, { stdout: `${ALL_GREEN.join("\n")}\n` }] }],
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /poll 1: waiting for floor \(github-actions\): in_progress/);
  assert.equal(polls(r), 2);
});

test("★ wait: the highest id decides — a re-run supersedes the run it re-ran, both ways", () => {
  const rerunGreen = [...ALL_GREEN, run(5, "github-actions", "check", "completed", "failure")];
  assert.equal(runStep("Wait for the required checks", { routes: [checksRoute(rerunGreen)] }).status, 0);
  const rerunRed = [...ALL_GREEN, run(99, "github-actions", "check", "completed", "cancelled")];
  const r = runStep("Wait for the required checks", { routes: [checksRoute(rerunRed)] });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /CHECK_FAILED: check \(github-actions\) concluded cancelled/);
});

test("★ wait: a failed API call is one empty poll, retried within the bound", () => {
  const r = runStep("Wait for the required checks", {
    routes: [{ match: CHECKS, sequence: [{ code: 1 }, { stdout: `${ALL_GREEN.join("\n")}\n` }] }],
  });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /::warning::poll 1: the check-runs API call failed; retrying/);
});

test("★ wait: an empty required-check list fails instead of passing vacuously (L34)", () => {
  const r = runStep("Wait for the required checks", { env: { REQUIRED_CHECKS: "\n  \n" }, routes: [checksRoute(ALL_GREEN)] });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /NO_REQUIRED_CHECKS/);
  assert.equal(polls(r), 0);
});

test("★ release body: the committed step writes this repository's current section, as changelog-section.mjs cuts it", () => {
  const version = readFileSync(join(REPO, "SKILLS_VERSION"), "utf8").trim();
  const r = runStep("Release body", { cwd: REPO, env: { TAG: `v${version}` } });
  assert.equal(r.status, 0, r.stderr);
  const expected = releaseBody(readFileSync(join(REPO, "CHANGELOG.md"), "utf8"), `v${version}`);
  assert.ok(expected.ok && expected.body.length > 0);
  assert.equal(r.notes, expected.body);
});

const tagRoutes = [
  { match: "git/tags -f", stdout: "abcdef\n" },
  { match: "git/refs -f", stdout: "" },
  { match: "release create", stdout: "" },
];

test("★ tag and release: the tag object on this commit, its ref, then a published release", () => {
  const r = runStep("Tag and release", { env: { TAG: "v1.2.3", ACTION: "tag-and-release" }, routes: tagRoutes });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(r.calls.length, 3);
  assert.deepEqual(r.calls[0], [
    "api",
    "repos/pharn-dev/pharn-oss/git/tags",
    "-f",
    "tag=v1.2.3",
    "-f",
    "message=v1.2.3",
    "-f",
    `object=${SHA}`,
    "-f",
    "type=commit",
    "--jq",
    ".sha",
  ]);
  assert.deepEqual(r.calls[1], ["api", "repos/pharn-dev/pharn-oss/git/refs", "-f", "ref=refs/tags/v1.2.3", "-f", "sha=abcdef", "--silent"]);
  const create = r.calls[2];
  assert.deepEqual(create.slice(0, 3), ["release", "create", "v1.2.3"]);
  for (const flag of ["--verify-tag", "--latest"]) assert.ok(create.includes(flag), flag);
  assert.equal(create[create.indexOf("--title") + 1], "v1.2.3");
  assert.match(create[create.indexOf("--notes-file") + 1], /release-notes\.md$/);
  assert.ok(!create.includes("--draft") && !create.includes("--prerelease"));
});

test("★ tag and release: release-only creates the release and leaves the tag alone", () => {
  const r = runStep("Tag and release", { env: { TAG: "v1.2.3", ACTION: "release-only" }, routes: tagRoutes });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(
    r.calls.map((c) => c.slice(0, 2)),
    [["release", "create"]]
  );
});

test("★ tag and release: an existing ref is not overwritten, and no release follows", () => {
  const routes = [{ match: "git/tags -f", stdout: "abcdef\n" }, { match: "git/refs -f", code: 1 }, tagRoutes[2]];
  const r = runStep("Tag and release", { env: { TAG: "v1.2.3", ACTION: "tag-and-release" }, routes });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /TAG_REF/);
  assert.ok(!r.calls.some((c) => c[0] === "release"));
});

test("★ tag and release: an unknown action fails", () => {
  const r = runStep("Tag and release", { env: { TAG: "v1.2.3", ACTION: "done" }, routes: tagRoutes });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /BAD_ACTION/);
  assert.deepEqual(r.calls, []);
});
