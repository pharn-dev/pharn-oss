// pharn/floor/shelled-verdict-core.test.mjs — the shelled-checker rule's suite (6.21.1). The rule over every result
// shape a spawnSync can return (L29: the set of shapes is the deliverable), the detail's bounds, the token's producer
// and consumer, and a ✧ closure over the premise the rule rests on: both {0, 1}-contract checkers print a `RED — ` line
// before every exit-1 return. The checkers that apply the rule are tested end to end in their own suites.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CHILD_CRASHED, RED_LINE, childCrashedLine, crashedDetail, reportsChildCrash, shelledVerdict } from "./shelled-verdict-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

test("shelledVerdict — exactly two shapes are verdicts; every other result is a crash", () => {
  const cases = [
    [{ status: 0, stdout: "GREEN — x\n" }, "green"],
    [{ status: 0, stdout: "" }, "green"],
    [{ status: 1, stdout: "RED — x\n" }, "red"],
    [{ status: 1, stdout: "echoed child output\nRED — x\n" }, "red"],
    [{ status: 1, stdout: "" }, "crashed"],
    [{ status: 1, stdout: "red — x\n" }, "crashed"],
    [{ status: 1, stdout: " RED — x\n" }, "crashed"],
    [{ status: 1, stdout: "RED - x\n" }, "crashed"],
    [{ status: 1, stdout: "", stderr: "RED — on stderr only\n" }, "crashed"],
    [{ status: 2, stdout: "RED — x\n" }, "crashed"],
    [{ status: 3, stdout: "" }, "crashed"],
    [{ status: 13, stdout: "" }, "crashed"],
    [{ status: null, signal: "SIGKILL", stdout: "" }, "crashed"],
    [{ status: null, error: Object.assign(new Error("spawn E2BIG"), { code: "E2BIG" }) }, "crashed"],
    [{ status: 0, error: new Error("maxBuffer exceeded") }, "crashed"],
    [{}, "crashed"],
    [null, "crashed"],
  ];
  const seen = new Set();
  for (const [r, want] of cases) {
    assert.equal(shelledVerdict(r), want, JSON.stringify(r));
    seen.add(want);
  }
  assert.deepEqual([...seen].sort(), ["crashed", "green", "red"], "every class was produced (L34)");
});

test("shelledVerdict over REAL processes: a RED, a GREEN, a throw at load, a missing script, exit 1 with no line, a signal", () => {
  const run = (code) => spawnSync(process.execPath, ["--input-type=module", "-e", code], { encoding: "utf8" });
  assert.equal(shelledVerdict(run('console.log("GREEN — ok")')), "green");
  assert.equal(shelledVerdict(run('console.log("RED — no"); process.exitCode = 1')), "red");
  assert.equal(shelledVerdict(run('throw new Error("boom")')), "crashed");
  assert.equal(shelledVerdict(run("process.exit(1)")), "crashed");
  assert.equal(shelledVerdict(run('process.kill(process.pid, "SIGKILL")')), "crashed");
  const missing = spawnSync(process.execPath, [join(HERE, "no-such-checker.mjs")], { encoding: "utf8" });
  assert.equal(missing.status, 1, "control: node's own code for a missing script is 1 — the RED code");
  assert.equal(shelledVerdict(missing), "crashed");
});

test("crashedDetail — how it ended, the error's OWN line (never the source line node prints first), bounded and escaped", () => {
  const thrown = spawnSync(process.execPath, ["--input-type=module", "-e", 'const x = 1;\nthrow new Error("boom \\u0007 bell")'], {
    encoding: "utf8",
  });
  assert.match(thrown.stderr, /throw new Error/, "precondition: node prints the throwing source line");
  const d = crashedDetail("x.mjs", thrown, "nothing was checked");
  assert.match(
    d,
    /^x\.mjs exited 1 without its RED line — it crashed, which is no verdict \(stderr: "Error: boom \\u0007 bell"\); nothing was checked$/
  );
  assert.doesNotMatch(d, /throw new/, "the excerpt is the error line, not the code line");
  for (const [r, re] of [
    [{ status: null, signal: "SIGKILL" }, /x\.mjs was killed \(SIGKILL\)/],
    [{ status: null, error: Object.assign(new Error("e"), { code: "EAGAIN" }) }, /x\.mjs could not be run \(EAGAIN\)/],
    [{ status: 3, stderr: "" }, /x\.mjs exited 3, which its contract \(0 GREEN, 1 RED\) does not have/],
    [{ status: 1, stderr: "TypeError: t\n" }, /\(stderr: "TypeError: t"\)/],
    [
      { status: 1, stderr: "Error [ERR_MODULE_NOT_FOUND]: Cannot find module 'a'\n" },
      /\(stderr: "Error \[ERR_MODULE_NOT_FOUND\]: Cannot find module 'a'"\)/,
    ],
    [{ status: 1, stderr: "no error line here\n" }, /x\.mjs exited 1 without its RED line — it crashed, which is no verdict; n$/],
  ]) {
    assert.match(crashedDetail("x.mjs", r, "n"), re, JSON.stringify(r));
  }
  const long = crashedDetail("x.mjs", { status: 1, stderr: `Error: ${"y".repeat(500)}\n` }, "n");
  assert.ok(long.length < 320, `bounded (${long.length})`);
  assert.match(long, /y…"\)/);
  // one line: an excerpt cannot add a line to the reporting checker's stdout
  assert.doesNotMatch(crashedDetail("x.mjs", { status: 1, stderr: "Error: a b\rc\n" }, "n"), /[\n\r]/);
});

test("the token — the producer's line is exactly what the consumer reads, and only at the START of stdout", () => {
  const line = childCrashedLine("detail");
  assert.equal(line, `${CHILD_CRASHED} — detail`);
  assert.equal(reportsChildCrash(`${line}\nNOTE — x\n`), true);
  for (const out of ["", "UNUSABLE — x\n", `RED — a\n${line}\n`, ` ${line}\n`, `${CHILD_CRASHED}\n`, null, undefined]) {
    assert.equal(reportsChildCrash(out), false, JSON.stringify(out));
  }
  assert.equal(RED_LINE.test("a\nRED — b"), true);
  assert.equal(RED_LINE.test("a RED — b"), false);
});

test("✧ L29 CLOSURE — the premise: every exit-1 path of both {0, 1}-contract checkers prints its `RED — ` line first", () => {
  let sites = 0;
  for (const checker of ["check-plan-spec-agree.mjs", "check-spec-approved.mjs"]) {
    const src = readFileSync(join(HERE, checker), "utf8");
    assert.doesNotMatch(src, /process\.exit\(\s*1\s*\)|exitCode\s*=\s*1/, `${checker}: an exit-1 route outside \`return 1\``);
    assert.match(src, /process\.exit\(main\(\)\);\s*$/, `${checker}: main()'s return is the only exit`);
    const lines = src.split("\n");
    lines.forEach((l, i) => {
      if (!/\breturn 1;/.test(l)) return;
      sites++;
      const before = lines.slice(Math.max(0, i - 3), i + 1).join("\n");
      assert.match(before, /console\.log\(`?"?RED — /, `${checker}:${i + 1} returns 1 without printing a RED line first`);
    });
    // every other refusal returns through red(), which prints the line and returns 1
    assert.match(
      src,
      /function red\(msg\) \{\n\s*console\.log\(`RED — \$\{msg\}`\);\n\s*return 1;\n\}/,
      `${checker}: red() prints, then returns 1`
    );
  }
  assert.ok(sites >= 4, `the scan found the exit-1 sites (${sites})`);
});
