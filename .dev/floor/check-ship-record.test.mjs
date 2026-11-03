// .dev/floor/check-ship-record.test.mjs — tests for the per-PR "product bytes moved, so a green dev-chain record is
// in the PR" checker (dev-verdict-discipline, 7.3.0; review 2026-11-03 HIGH "the practised dev loop has merged past
// red floor verdicts").
//
// What these pin, by group:
//   P  the block grammar: every BLOCK_TEMPLATES member's concrete values parse, every malformed shape is a defect,
//      fenced and indented lines are not block lines, and the 257 committed legacy SHIP.md files read as legacy;
//   G  hermetic git fixtures for every verdict and every REFUSAL_STATES member (L29 — a closure test iterates the
//      constant), including the recorded failure's shape (a product change whose only record shows verify FAIL);
//   W  wiring (L45): the npm script and the ci.yml step are pinned as committed strings, and the committed CI run
//      block is EXECUTED (its checker path pointed at this checkout's real file, never a hand-copied module list —
//      L81) in a shallow checkout of a test merge commit, GREEN with a green record and RED without one.
//
// ── Honest scope (P0) ────────────────────────────────────────────────────────────────────────────────────────────
// A green run means the committed strings and the checker's behaviour on these fixtures are as pinned. It does NOT
// mean CI ran the step on a given PR, and a green verdict is presence + agreement, never coverage or provenance
// (the checker's header, "BOUNDS").

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BLOCK_KEYS,
  BLOCK_TEMPLATES,
  GREEN_VALUES,
  HUMAN_ONLY,
  REFUSAL_STATES,
  INPUT_STATES,
  FIX,
  REGRESS_VALUES,
  VERIFY_VALUES,
  STOP_STAGES,
  parseBlock,
  isGreen,
  main,
} from "./check-ship-record.mjs";
import { parseGateChain } from "./check-contributing-gates.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECKER = join(HERE, "check-ship-record.mjs");
const REPO = join(HERE, "..", "..");

const HOME_DIR = mkdtempSync(join(tmpdir(), "pharn-ssr-home-"));
after(() => rmSync(HOME_DIR, { recursive: true, force: true }));

function cleanEnv(extra = {}) {
  return {
    PATH: `${dirname(process.execPath)}:${process.env.PATH ?? "/usr/bin:/bin"}`,
    HOME: HOME_DIR,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "t",
    GIT_AUTHOR_EMAIL: "t@example.invalid",
    GIT_COMMITTER_NAME: "t",
    GIT_COMMITTER_EMAIL: "t@example.invalid",
    ...extra,
  };
}

function git(cwd, args, env = cleanEnv()) {
  return execFileSync("git", args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function run(args, cwd) {
  const r = spawnSync(process.execPath, [CHECKER, ...args], { cwd, env: cleanEnv(), encoding: "utf8" });
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

function put(root, rel, text) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}

const HEX = "a".repeat(64);
const BLOCK_GREEN = BLOCK_KEYS.map((k) => `${k}: ${GREEN_VALUES[k]}`).join("\n");
const ship = (block) => `# SHIP — demo\n\nSome prose.\n\n${block}\n\nlesson: none — nothing new.\n`;
const verifyReport = (over = {}) =>
  JSON.stringify({
    feature: "demo",
    gates: { test: 0 },
    verdict: "PASS",
    failing_gates: [],
    gate_run: { stamp_sha256: HEX, source: "explicit" },
    ...over,
  });
const regressReport = (verdict = "no-regressions") => JSON.stringify({ verdict });

/** A repo on `main` with SKILLS_VERSION, one product file and one non-product file. */
function repo() {
  const root = mkdtempSync(join(tmpdir(), "pharn-ssr-"));
  git(root, ["init", "-q", "-b", "main"]);
  put(root, "SKILLS_VERSION", "1.0.0\n");
  put(root, "pharn/floor/x.mjs", "export const x = 1;\n");
  put(root, "README.md", "readme\n");
  git(root, ["add", "."]);
  git(root, ["commit", "-qm", "base"]);
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

/** A green record (SHIP.md + both reports) for `slug`, with optional overrides. */
function record(root, { slug = "demo", block = BLOCK_GREEN, verify = verifyReport({ feature: slug }), regress = regressReport() } = {}) {
  put(root, `.dev/features/${slug}/SHIP.md`, ship(block));
  if (verify !== null) put(root, `.dev/features/${slug}/verify-report.json`, verify);
  if (regress !== null) put(root, `.dev/features/${slug}/regression-report.json`, regress);
}

/** Run against a fixture: base = main's first commit, head = the working tree. */
function judgeFixture(setup) {
  const { root, cleanup } = repo();
  try {
    setup(root);
    return run(["--base-ref", "main"], root);
  } finally {
    cleanup();
  }
}

const block = (values) => BLOCK_KEYS.map((k) => `${k}: ${values[k] ?? GREEN_VALUES[k]}`).join("\n");

// ── P: the block grammar ─────────────────────────────────────────────────────────────────────────────────────────

test("P1: the green block parses, is present, defect-free and green", () => {
  const b = parseBlock(ship(BLOCK_GREEN));
  assert.equal(b.present, true);
  assert.deepEqual(b.defects, []);
  assert.equal(isGreen(b.values), true);
});

test("P2 (L29): EVERY closed-set value of EVERY key parses; only the GREEN_VALUES member is green", () => {
  const perKey = {
    "verdict-grill": ["exit 0", "exit 1", "exit 2", ...STOP_STAGES.map((s) => `not-reached (${s})`)],
    "verdict-build": ["exit 0", "exit 1", "exit 127", ...STOP_STAGES.map((s) => `not-reached (${s})`)],
    "verdict-regress": [...REGRESS_VALUES, ...STOP_STAGES.map((s) => `not-reached (${s})`)],
    "verdict-verify": [...VERIFY_VALUES, ...STOP_STAGES.map((s) => `not-reached (${s})`)],
    "run-ended": ["GATE 2", ...STOP_STAGES.map((s) => `STOP ${s}`)],
  };
  assert.deepEqual(Object.keys(perKey), [...BLOCK_KEYS], "one value list per key");
  for (const [k, values] of Object.entries(perKey)) {
    for (const v of values) {
      const b = parseBlock(block({ [k]: v }));
      assert.deepEqual(b.defects, [], `${k}: ${v} must parse`);
      assert.equal(isGreen(b.values), v === GREEN_VALUES[k], `${k}: ${v} green-ness`);
    }
  }
});

test("P3: every malformed shape is a defect — missing, repeated, unknown key, out-of-set value, spacing", () => {
  const cases = [
    [BLOCK_GREEN.replace(/^run-ended: .*$/m, ""), /run-ended missing/],
    [`${BLOCK_GREEN}\nverdict-verify: PASS`, /verdict-verify repeated/],
    [`${BLOCK_GREEN}\nverdict-test: exit 0`, /unknown key/],
    [block({ "verdict-verify": "pass" }), /verdict-verify: "pass" is not in its closed set/],
    [block({ "verdict-build": "exit 01" }), /verdict-build/],
    [block({ "run-ended": "STOP <stage>" }), /run-ended/],
    [block({ "verdict-regress": "not-reached (<stage>)" }), /verdict-regress/],
    [BLOCK_GREEN.replace("verdict-grill: exit 0", "verdict-grill:exit 0"), /exactly one space/],
  ];
  for (const [text, re] of cases) {
    const b = parseBlock(text);
    assert.equal(b.present, true);
    assert.ok(
      b.defects.some((d) => re.test(d)),
      `${re} not among ${JSON.stringify(b.defects)}`
    );
  }
});

test("P4: a block line inside a code fence or indented is NOT a block line (a template quoted in prose is not a record)", () => {
  assert.equal(parseBlock("```text\nverdict-verify: FAIL\n```\n").present, false);
  assert.equal(parseBlock("~~~\nrun-ended: STOP verify\n~~~\n").present, false);
  assert.equal(parseBlock("- verdict-verify: FAIL\n  run-ended: STOP verify\n").present, false);
  // and the fence closes: a real line after it is read
  assert.equal(parseBlock(`\`\`\`\nx\n\`\`\`\n${BLOCK_GREEN}\n`).present, true);
});

test("P5: every committed SHIP.md written before 7.3.0 reads as LEGACY (no block), not malformed", () => {
  const dir = join(REPO, ".dev", "features");
  let n = 0;
  for (const d of readdirSync(dir)) {
    const p = join(dir, d, "SHIP.md");
    if (d === "dev-verdict-discipline" || !existsSync(p)) continue;
    n++;
    assert.equal(parseBlock(readFileSync(p, "utf8")).present, false, `${d}/SHIP.md reads as carrying a block`);
  }
  assert.ok(n > 100, `expected the committed legacy records (L34), found ${n}`);
});

test("P6: BLOCK_TEMPLATES is derived from the value sets (the command's spelling binds to this grammar)", () => {
  assert.ok(BLOCK_TEMPLATES.includes(`verdict-regress: <${REGRESS_VALUES.join("|")}>`));
  assert.ok(BLOCK_TEMPLATES.includes(`verdict-verify: <${VERIFY_VALUES.join("|")}>`));
  for (const k of BLOCK_KEYS) {
    assert.ok(
      BLOCK_TEMPLATES.some((t) => t.startsWith(`${k}: `)),
      `no template for ${k}`
    );
  }
});

// ── G: hermetic git fixtures ─────────────────────────────────────────────────────────────────────────────────────

test("G1: no product path changed → GREEN, even with no record", () => {
  const r = judgeFixture((root) => put(root, "README.md", "changed\n"));
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /SHIP-RECORD: GREEN — no product-surface path that needs a dev-chain record changed/);
});

test("G2: only a human-only trusted doc changed → GREEN (HUMAN_ONLY, GATE 1 decision 1)", () => {
  assert.equal(HUMAN_ONLY.length, 4);
  const r = judgeFixture((root) => put(root, "pharn/LIMITS.md", "a human edit\n"));
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /1 human-only trusted doc\(s\) changed, which need no record/);
});

test("G3: a product path with NO record → RED NO_SHIP_RECORD (no light mode on product surface)", () => {
  const r = judgeFixture((root) => put(root, "pharn/floor/x.mjs", "export const x = 2;\n"));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /\[NO_SHIP_RECORD\] 1 product-surface path\(s\) changed but no \.dev\/features\/<name>\/SHIP\.md is in the diff/);
  assert.match(r.out, /"pharn\/floor\/x\.mjs"/);
});

test("G4: a product path with a green, matched record → GREEN", () => {
  const r = judgeFixture((root) => {
    put(root, "pharn/floor/x.mjs", "export const x = 2;\n");
    record(root);
  });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /SHIP-RECORD: GREEN — 1 product-surface path\(s\) changed; green record\(s\): "\.dev\/features\/demo\/SHIP\.md"/);
  assert.match(r.out, /presence, not coverage/, "the bound is printed on GREEN too");
});

test("G5 ★ the recorded failure (scanner-redos-sweep-2 shape): product change + a record showing verify FAIL → RED", () => {
  const r = judgeFixture((root) => {
    put(root, "pharn/floor/x.mjs", "export const x = 2;\n");
    record(root, { block: block({ "verdict-verify": "FAIL" }), verify: verifyReport({ verdict: "FAIL" }) });
  });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /\[RECORD_NOT_GREEN\] "\.dev\/features\/demo\/SHIP\.md" records "[^"]*verdict-verify: FAIL/);
  assert.match(r.out, /\[NO_SHIP_RECORD\]/);
});

test("G6: a STOP record is RED even beside another feature's green record (no record may show a red run)", () => {
  const r = judgeFixture((root) => {
    put(root, "pharn/floor/x.mjs", "export const x = 2;\n");
    record(root);
    record(root, {
      slug: "other",
      block: block({ "verdict-regress": "not-reached (verify)", "verdict-verify": "FAIL", "run-ended": "STOP verify" }),
      verify: null,
      regress: null,
    });
  });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /\[RECORD_NOT_GREEN\] "\.dev\/features\/other\/SHIP\.md"/);
  assert.doesNotMatch(r.out, /\[NO_SHIP_RECORD\]/, "one green record exists");
});

test("G7: a malformed block → RED RECORD_MALFORMED", () => {
  const r = judgeFixture((root) => {
    put(root, "pharn/floor/x.mjs", "export const x = 2;\n");
    record(root, { block: "verdict-verify: PASS\nrun-ended: GATE 2" });
  });
  assert.equal(r.code, 1, r.out);
  assert.match(
    r.out,
    /\[RECORD_MALFORMED\] "\.dev\/features\/demo\/SHIP\.md": verdict-grill missing; verdict-build missing; verdict-regress missing\./
  );
});

test("G8: a green block whose reports disagree → RED REPORT_MISMATCH, one case per report defect", () => {
  const cases = [
    [{ verify: null }, /verify-report\.json is absent/],
    [{ verify: "{not json" }, /verify-report\.json is absent or not a readable JSON object/],
    [{ verify: verifyReport({ verdict: "FAIL" }) }, /does not read verdict PASS/],
    [{ verify: verifyReport({ feature: "someone-else" }) }, /is not this feature's/],
    [{ verify: verifyReport({ gate_run: undefined }) }, /no gate_run\.stamp_sha256/],
    [{ verify: verifyReport({ gate_run: { stamp_sha256: "nothex" } }) }, /no gate_run\.stamp_sha256/],
    [{ regress: null }, /regression-report\.json is absent/],
    [{ regress: regressReport("regressions") }, /does not read verdict no-regressions/],
  ];
  for (const [over, re] of cases) {
    const r = judgeFixture((root) => {
      put(root, "pharn/floor/x.mjs", "export const x = 2;\n");
      record(root, over);
    });
    assert.equal(r.code, 1, `${re}: ${r.out}`);
    assert.match(r.out, /\[REPORT_MISMATCH\] "\.dev\/features\/demo\/SHIP\.md" is green but/);
    assert.match(r.out, re);
  }
});

test("G9: a symlinked report is never followed — it reads as absent (P2)", () => {
  const r = judgeFixture((root) => {
    put(root, "pharn/floor/x.mjs", "export const x = 2;\n");
    record(root, { verify: null });
    put(root, "elsewhere.json", verifyReport());
    symlinkSync(join(root, "elsewhere.json"), join(root, ".dev/features/demo/verify-report.json"));
  });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /verify-report\.json is absent or not a readable JSON object/);
});

test("G10 (GATE 1 decision 2, the stated bound): a LEGACY record beside a green one passes; alone it is NO_SHIP_RECORD", () => {
  const legacy = (root) => put(root, ".dev/features/old/SHIP.md", "# SHIP — old\n\nverify: PASS, in prose\n");
  const together = judgeFixture((root) => {
    put(root, "pharn/floor/x.mjs", "export const x = 2;\n");
    legacy(root);
    record(root);
  });
  assert.equal(together.code, 0, together.out);
  const alone = judgeFixture((root) => {
    put(root, "pharn/floor/x.mjs", "export const x = 2;\n");
    legacy(root);
  });
  assert.equal(alone.code, 1, alone.out);
  assert.match(alone.out, /none of its 1 record\(s\) is green and matched \(1 without a verdict block\)/);
});

test("G11: a record committed on the BASE is not this PR's record", () => {
  const { root, cleanup } = repo();
  try {
    record(root);
    git(root, ["add", "-A"]);
    git(root, ["commit", "-qm", "an earlier feature's record"]);
    git(root, ["tag", "base"]);
    put(root, "pharn/floor/x.mjs", "export const x = 2;\n");
    const r = run(["--base-ref", "base"], root);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /\[NO_SHIP_RECORD\]/);
  } finally {
    cleanup();
  }
});

test("G12: the input states — bad usage, unreadable base, a non-root target (exit 2)", () => {
  const { root, cleanup } = repo();
  try {
    const bad = run(["--nope"], root);
    assert.equal(bad.code, 2);
    assert.match(bad.out, /\[BAD_USAGE\]/);
    const base = run(["--base-ref", "no-such-ref"], root);
    assert.equal(base.code, 2);
    assert.match(base.out, /\[BASE_UNREADABLE\]/);
    mkdirSync(join(root, "sub"));
    const head = run(["--base-ref", "main", "sub"], root);
    assert.equal(head.code, 2);
    assert.match(head.out, /\[HEAD_UNREADABLE\]/);
  } finally {
    cleanup();
  }
});

test("✧ CLOSURE (L29): every REFUSAL_STATES member is produced above, has its own FIX, and INPUT_STATES ⊂ it", () => {
  const produced = [
    "BAD_USAGE",
    "BASE_UNREADABLE",
    "HEAD_UNREADABLE",
    "NO_SHIP_RECORD",
    "RECORD_MALFORMED",
    "RECORD_NOT_GREEN",
    "REPORT_MISMATCH",
  ];
  assert.deepEqual([...produced].sort(), [...REFUSAL_STATES].sort());
  for (const s of REFUSAL_STATES) assert.equal(typeof FIX[s], "string", `${s} has no FIX`);
  assert.equal(new Set(Object.values(FIX)).size, REFUSAL_STATES.length, "one remedy per state, none shared (L27)");
  for (const s of INPUT_STATES) assert.ok(REFUSAL_STATES.includes(s));
});

test("✧ main() runs in-process and writes through io.out", () => {
  let out = "";
  assert.equal(main(["--nope"], { out: (s) => (out += s) }), 2);
  assert.match(out, /\[BAD_USAGE\]/);
});

// ── W: wiring ────────────────────────────────────────────────────────────────────────────────────────────────────

const SCRIPT = "check:ship-record";
const SCRIPT_LINE = "node .dev/floor/check-ship-record.mjs --merge-base origin/main .";
const STEP = "Dev-chain record check";
const CI_IF = "if: ${{ always() && steps.install.outcome == 'success' && github.event_name == 'pull_request' }}";
const CI_RUN = ['git fetch --no-tags --depth=2 origin "$GITHUB_SHA"', "node .dev/floor/check-ship-record.mjs --base-ref HEAD^1"];

function ciStep() {
  const ci = readFileSync(join(REPO, ".github", "workflows", "ci.yml"), "utf8").replace(/\r\n/g, "\n");
  const start = ci.indexOf(`      - name: ${STEP}\n`);
  assert.ok(start >= 0, "ci.yml must carry the step by its name");
  const rest = ci.slice(start + 1);
  const next = rest.search(/^ {6}- /m);
  return ci.slice(start, next === -1 ? ci.length : start + 1 + next);
}

function runLines(blockText) {
  const m = blockText.match(/^ {8}run: \|\n((?: {10}[^\n]*\n?)+)/m);
  assert.ok(m, "the step must carry a literal `run: |` block");
  return m[1]
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => l.slice(10));
}

test("✧ W1: package.json carries check:ship-record on --merge-base origin/main, OUT of `npm run check`", () => {
  const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
  assert.equal(pkg.scripts[SCRIPT], SCRIPT_LINE);
  assert.ok(!parseGateChain(pkg.scripts.check).includes(SCRIPT), "it needs a base, so it stays out of `check`");
});

test("✧ W2: the ci.yml step — pull requests only, not disabled, its two run lines, nothing interpolated", () => {
  const b = ciStep();
  assert.ok(
    b.split("\n").some((l) => l.trim() === CI_IF),
    b
  );
  assert.deepEqual(runLines(b), CI_RUN);
  assert.ok(!runLines(b).join("\n").includes("${{"));
  assert.doesNotMatch(b, /^ {8}env:/m);
});

/** EXECUTE the committed run block (L45) in a depth-1 checkout of a test merge commit, the checker path pointed at
 *  this checkout's real file (no hand-copied module list — L81). */
function executeCiBlock({ green }) {
  const root = mkdtempSync(join(tmpdir(), "pharn-ssr-ci-"));
  const env = cleanEnv();
  try {
    const seed = join(root, "seed");
    mkdirSync(seed);
    git(seed, ["init", "-q", "-b", "main"], env);
    put(seed, "SKILLS_VERSION", "1.0.0\n");
    put(seed, "pharn/floor/x.mjs", "export const x = 1;\n");
    git(seed, ["add", "."], env);
    git(seed, ["commit", "-qm", "base"], env);
    git(seed, ["switch", "-qc", "pr"], env);
    put(seed, "pharn/pharn-core/skill.md", "a product change\n");
    if (green) record(seed);
    git(seed, ["add", "."], env);
    git(seed, ["commit", "-qm", "pr"], env);
    git(seed, ["switch", "-q", "main"], env);
    put(seed, "pharn/floor/y.mjs", "export const y = 1;\n"); // main moves: not the PR's change
    git(seed, ["add", "."], env);
    git(seed, ["commit", "-qm", "main moved"], env);
    git(seed, ["merge", "-q", "--no-ff", "-m", "test merge", "pr"], env);
    const merge = git(seed, ["rev-parse", "HEAD"], env);
    git(root, ["clone", "-q", "--bare", seed, "bare.git"], env);
    const work = join(root, "work");
    mkdirSync(work);
    git(work, ["init", "-q"], env);
    git(work, ["remote", "add", "origin", `file://${join(root, "bare.git")}`], env);
    git(work, ["fetch", "-q", "--no-tags", "--depth=1", "origin", merge], env);
    git(work, ["checkout", "-q", "--detach", merge], env);
    const lines = runLines(ciStep()).map((l) => l.replace("node .dev/floor/check-ship-record.mjs", `node ${JSON.stringify(CHECKER)}`));
    const r = spawnSync("bash", ["-e", "-c", lines.join("\n")], { cwd: work, env: { ...env, GITHUB_SHA: merge }, encoding: "utf8" });
    return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("✧ W3 EXECUTED: the committed CI block is GREEN on a test merge whose PR carries a green record", () => {
  const { code, out } = executeCiBlock({ green: true });
  assert.equal(code, 0, out);
  assert.match(out, /SHIP-RECORD: GREEN — 1 product-surface path\(s\) changed/);
  assert.match(out, /--base-ref HEAD\^1/);
});

test("✧ W3 EXECUTED NEGATIVE CONTROL: the same block is RED without the record, listing only the PR's path", () => {
  const { code, out } = executeCiBlock({ green: false });
  assert.equal(code, 1, out);
  assert.match(out, /\[NO_SHIP_RECORD\] 1 product-surface path\(s\) changed/);
  assert.match(out, /"pharn\/pharn-core\/skill\.md"/);
  assert.doesNotMatch(out, /pharn\/floor\/y\.mjs/, "main's own change is not the PR's");
});
