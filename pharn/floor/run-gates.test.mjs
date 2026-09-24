// pharn/floor/run-gates.test.mjs — the runner CLI's suite.
//
// Every test drives the REAL CLI as a subprocess, so the script is exercised through its argv rather than
// imported. That is NOT the same as executing a command's PINNED line, and this header used to claim it
// was: for a whole release line these tests passed hand-typed arguments, the one pinned line that passes
// `--cwd` (/pharn-regress's base side) was never run, and it failed at `init` in every real run
// (lessons-learned L45 — the invocation layer is covered only by executing the invocation). The ★ WIRING
// test at the end executes /pharn-regress's committed lines; /pharn-verify's pinned lines are still
// exercised only through equivalent hand-typed arguments. Refusal tests pair with a non-vacuity control so
// a green run means the rule fired and not that the runner refuses everything (L34), and rules over a set
// iterate every member (L52).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  symlinkSync,
  statSync,
  copyFileSync,
  realpathSync,
  chmodSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { RESULTS_ENV, resultsFileName } from "./gate-run-core.mjs";
import { testRecord } from "./test-results-core.mjs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "run-gates.mjs");
const OUT = ".pharn/gates";
const FEATURE = "demo";

/** Run the CLI and return {code, json}. stdout is always one JSON document, so a caller branches on the
 *  exit code and reads the document — never on prose. */
function cli(cwd, args, opts = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: "utf8", ...opts });
  let json = null;
  try {
    json = JSON.parse(r.stdout);
  } catch {
    /* a crash path — the caller asserts on `code` and `raw` */
  }
  return { code: r.status, json, raw: r.stdout + r.stderr };
}

function repo({ scripts = { test: 'node -e "process.exit(0)"' }, gitignorePharn = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "rg-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe" });
  git("init", "-q", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  if (gitignorePharn) writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
  mkdirSync(join(dir, `pharn/features/${FEATURE}`), { recursive: true });
  writeFileSync(join(dir, `pharn/features/${FEATURE}/PLAN.md`), "# PLAN\n\n## Files\n\n- `a.txt` — a\n");
  writeFileSync(join(dir, "a.txt"), "a\n");
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fx", scripts }, null, 2));
  git("add", "-A");
  git("commit", "-qm", "init");
  return dir;
}

const initArgs = (extra = []) => ["init", "--stage", "verify", "--feature", FEATURE, "--out", OUT, "--discover", "package.json", ...extra];
const runArgs = (ms = 30000) => ["run", "--next", "--out", OUT, "--timeout-ms", String(ms)];

/** Drive `run --next` to completion; returns every call's parsed document. */
function drain(dir, ms = 30000, max = 20) {
  const calls = [];
  for (let i = 0; i < max; i++) {
    const r = cli(dir, runArgs(ms));
    calls.push(r);
    if (r.code === 3 || r.code === 2) break;
  }
  return calls;
}

function stamp(dir) {
  return JSON.parse(readFileSync(join(dir, OUT, "stamp.json"), "utf8"));
}

function withRepo(fn, opts) {
  const dir = repo(opts);
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------------------------------

test("init resolves the set, prints the ordered ids, and writes an in-progress record", () => {
  withRepo(
    (dir) => {
      const r = cli(dir, initArgs());
      assert.equal(r.code, 0);
      assert.deepEqual(r.json.ids, ["test", "lint", "reconcile"]);
      assert.equal(r.json.source, "discover");
      assert.ok(existsSync(join(dir, OUT, "state.json")));
      assert.ok(!existsSync(join(dir, OUT, "stamp.json")), "init must not write a stamp");
    },
    { scripts: { test: "true", lint: "true" } }
  );
});

test("L34 — an EMPTY SOURCE set exits 3 and writes NO state, even though the injected entries exist", () => {
  withRepo(
    (dir) => {
      const r = cli(dir, initArgs());
      assert.equal(r.code, 3, "an empty source set must route to the existing no-gates stop");
      assert.equal(r.json.reason_code, "empty-source-set");
      assert.ok(!existsSync(join(dir, OUT, "state.json")), "a refused init must leave no state behind");
      // Control: ONE allowlisted script makes the same fixture resolvable.
      writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts: { test: "true" } }));
      assert.equal(cli(dir, initArgs()).code, 0);
    },
    { scripts: { unrelated: "true" } }
  );
});

test("init RECREATES <out>, so no stale log or stamp survives an earlier run", () => {
  withRepo(
    (dir) => {
      cli(dir, initArgs());
      writeFileSync(join(dir, OUT, "stale.out"), "old");
      cli(dir, initArgs());
      assert.ok(!existsSync(join(dir, OUT, "stale.out")), "init did not wipe <out>");
    },
    { scripts: { test: "true" } }
  );
});

test("CONTAINMENT: --out outside, equal to, or symlinked through the state root is REFUSED (L52: each case)", () => {
  withRepo(
    (dir) => {
      const cases = [
        [
          ["init", "--stage", "verify", "--feature", FEATURE, "--out", "elsewhere/gates", "--discover", "package.json"],
          "outside the state root",
        ],
        [["init", "--stage", "verify", "--feature", FEATURE, "--out", ".pharn", "--discover", "package.json"], "equal to the state root"],
        [["init", "--stage", "verify", "--feature", FEATURE, "--out", "../escape", "--discover", "package.json"], "traversing out"],
      ];
      for (const [args, why] of cases) {
        const r = cli(dir, args);
        assert.equal(r.code, 2, `accepted --out ${why}`);
        assert.equal(r.json.reason_code, "path-containment", `wrong reason_code for ${why}`);
      }
      // The symlink case: a component of the path is a link, which `lstat` sees and `stat` would follow.
      mkdirSync(join(dir, ".pharn"), { recursive: true });
      mkdirSync(join(dir, "outside-target"), { recursive: true });
      symlinkSync(join(dir, "outside-target"), join(dir, ".pharn", "linked"));
      const r = cli(dir, ["init", "--stage", "verify", "--feature", FEATURE, "--out", ".pharn/linked/gates", "--discover", "package.json"]);
      assert.equal(r.code, 2, "accepted a --out traversing a symlink");
      assert.equal(r.json.reason_code, "path-containment");
      // Non-vacuity control: the ordinary path is accepted by the same fixture.
      assert.equal(cli(dir, initArgs()).code, 0);
    },
    { scripts: { test: "true" } }
  );
});

// L54 — `existsSync` is not an absence test inside a containment walk. It stats, stat follows a link, so a
// DANGLING link read as absent and the walk stopped before lstat saw it. A FILE component read as absent
// for everything beneath it. Both reached `mkdirSync` and CRASHED (stack trace, no document). Every case
// below must end in a closed `path-containment` document instead. The RED on the unfixed code comes from
// the document assertions (r.json / reason_code). The "target not created" checks are safety assertions
// that also held before the fix, because the crash wrote nothing.
test("CONTAINMENT: a DANGLING link, a FILE component and a dangling STATE ROOT are refused, never a crash (L54, L52)", () => {
  const cases = [
    {
      why: "a dangling symlink component",
      out: ".pharn/linked/gates",
      target: "missing-target",
      setup: (dir) => {
        mkdirSync(join(dir, ".pharn"), { recursive: true });
        symlinkSync(join(dir, "missing-target"), join(dir, ".pharn", "linked"));
      },
    },
    {
      why: "a regular FILE as a component",
      out: ".pharn/afile/gates",
      target: null,
      setup: (dir) => {
        mkdirSync(join(dir, ".pharn"), { recursive: true });
        writeFileSync(join(dir, ".pharn", "afile"), "not a directory");
      },
    },
    {
      why: "a dangling symlink as the state root itself",
      out: ".pharn/gates",
      target: "missing-root",
      setup: (dir) => symlinkSync(join(dir, "missing-root"), join(dir, ".pharn")),
    },
  ];
  for (const c of cases) {
    withRepo(
      (dir) => {
        c.setup(dir);
        const r = cli(dir, ["init", "--stage", "verify", "--feature", FEATURE, "--out", c.out, "--discover", "package.json"]);
        assert.equal(r.code, 2, `accepted --out through ${c.why}`);
        assert.ok(r.json, `${c.why}: no document on stdout — the runner crashed instead of refusing`);
        assert.equal(r.json.reason_code, "path-containment", `${c.why}: wrong reason_code`);
        if (c.target) assert.ok(!existsSync(join(dir, c.target)), `${c.why}: the link target was created`);
      },
      { scripts: { test: "true" } }
    );
  }
  // Non-vacuity control (L34): the ordinary --out is accepted on a clean fixture.
  withRepo((dir) => assert.equal(cli(dir, initArgs()).code, 0), { scripts: { test: "true" } });
});

test("init refuses a scope JSON with a non-empty `escaped`, or an `inconclusive` verdict", () => {
  withRepo(
    (dir) => {
      const sj = join(dir, "scope.json");
      const base = [
        "init",
        "--stage",
        "regress",
        "--side",
        "head",
        "--feature",
        FEATURE,
        "--out",
        OUT,
        "--discover",
        "package.json",
        "--scope-json",
        "scope.json",
      ];

      writeFileSync(sj, JSON.stringify({ escaped: ["src/x.ts"], outside_tests: [], outside_eval_pairs: [] }));
      let r = cli(dir, base);
      assert.equal(r.code, 2);
      assert.equal(r.json.reason_code, "bad-scope-json");

      writeFileSync(sj, JSON.stringify({ escaped: [], verdict: "inconclusive", outside_tests: [] }));
      r = cli(dir, base);
      assert.equal(r.code, 2);
      assert.equal(r.json.reason_code, "bad-scope-json");

      writeFileSync(sj, JSON.stringify({ escaped: [], outside_tests: ["t/*.test.js"] }));
      r = cli(dir, base);
      assert.equal(r.code, 2, "a glob-shaped outside_tests entry must be refused");
      assert.equal(r.json.reason_code, "bad-scope-json");

      // Control: a clean scope JSON is accepted by the same fixture.
      writeFileSync(sj, JSON.stringify({ escaped: [], verdict: "ok", outside_tests: ["t/a.test.js"], outside_eval_pairs: [] }));
      assert.equal(cli(dir, base).code, 0);
    },
    { scripts: { test: "true" } }
  );
});

test("regress --side base REQUIRES --spec-from, and copies the head spec VERBATIM", () => {
  withRepo(
    (dir) => {
      const noSpec = cli(dir, [
        "init",
        "--stage",
        "regress",
        "--side",
        "base",
        "--feature",
        FEATURE,
        "--out",
        OUT,
        "--discover",
        "package.json",
      ]);
      assert.equal(noSpec.code, 2);
      assert.equal(noSpec.json.reason_code, "usage-error");

      writeFileSync(join(dir, "scope.json"), JSON.stringify({ escaped: [], outside_tests: ["t/a.js"], outside_eval_pairs: [] }));
      const head = cli(dir, [
        "init",
        "--stage",
        "regress",
        "--side",
        "head",
        "--feature",
        FEATURE,
        "--out",
        ".pharn/head",
        "--discover",
        "package.json",
        "--scope-json",
        "scope.json",
      ]);
      assert.equal(head.code, 0);
      const base = cli(dir, [
        "init",
        "--stage",
        "regress",
        "--side",
        "base",
        "--feature",
        FEATURE,
        "--out",
        ".pharn/base",
        "--spec-from",
        ".pharn/head",
      ]);
      assert.equal(base.code, 0);
      assert.deepEqual(base.json.ids, head.json.ids, "the base side did not copy the head spec verbatim");
    },
    { scripts: { test: "true", lint: "true" } }
  );
});

// ---------------------------------------------------------------------------------------------------
// run --next — order, exit mapping, and the failing-gate-is-data rule
// ---------------------------------------------------------------------------------------------------

test("run --next walks the entries IN SPEC ORDER and finalizes on the last one", () => {
  withRepo(
    (dir) => {
      cli(dir, initArgs());
      const calls = drain(dir);
      assert.deepEqual(
        calls.filter((c) => c.json && c.json.ran).map((c) => c.json.ran),
        ["test", "lint", "reconcile"]
      );
      const last = calls[calls.length - 2];
      assert.equal(last.json.finalized, true);
      assert.equal(calls[calls.length - 1].code, 3, "a call after the last entry must exit 3");
      assert.ok(existsSync(join(dir, OUT, "stamp.json")));
      assert.ok(!existsSync(join(dir, OUT, "state.json")), "the in-progress record must be removed on finalize");
    },
    { scripts: { test: "true", lint: "true" } }
  );
});

test("a FAILING gate is DATA, not a runner error — exit 0 with a non-zero recorded exit", () => {
  withRepo(
    (dir) => {
      cli(dir, initArgs());
      const calls = drain(dir);
      const lint = calls.find((c) => c.json && c.json.ran === "lint");
      assert.equal(lint.code, 0, "a red gate must not be a runner error");
      assert.equal(lint.json.exit, 7);
      assert.equal(stamp(dir).runs.find((r) => r.id === "lint").exit, 7);
    },
    { scripts: { test: "true", lint: 'node -e "process.exit(7)"' } }
  );
});

test("EXIT MAPPING covers 0, a non-zero code, 127 (ENOENT), 126 (EACCES) and 128+n (signal)", () => {
  withRepo(
    (dir) => {
      // A non-executable file for the EACCES case, invoked directly via --gates argv-free shell form.
      const noexec = join(dir, "noexec.sh");
      writeFileSync(noexec, "#!/bin/sh\nexit 0\n", { mode: 0o644 });
      assert.equal(statSync(noexec).mode & 0o111, 0, "fixture is wrong: noexec.sh is executable");

      const gates = [
        'node -e "process.exit(0)"::zero',
        'node -e "process.exit(5)"::five',
        "definitely-not-a-real-binary-xyz::enoent",
        "./noexec.sh::eacces",
        // NOTE: no literal comma in this token — `--gates` splits on commas, so `process.kill(a,b)` would
        // be torn in two. The bound is documented in run-gates.mjs's header; this fixture respects it.
        "sh -c 'kill -TERM $$'::signalled",
      ].join(",");
      const r = cli(dir, ["init", "--stage", "verify", "--feature", FEATURE, "--out", OUT, "--gates", gates]);
      assert.equal(r.code, 0);
      drain(dir);
      const map = Object.fromEntries(stamp(dir).runs.map((x) => [x.id, x.exit]));
      assert.equal(map.zero, 0);
      assert.equal(map.five, 5);
      // The shell reports these conventional codes for its own child; the runner maps a direct spawn
      // failure to the same numbers, so a reader sees one vocabulary either way.
      assert.equal(map.enoent, 127, "ENOENT did not map to 127");
      assert.equal(map.eacces, 126, "EACCES did not map to 126");
      assert.equal(map.signalled, 128 + 15, "a SIGTERM death did not map to 128+n");
    },
    { scripts: { test: "true" } }
  );
});

test("a TIMEOUT records 124 + timed_out, and the whole PROCESS GROUP is dead afterwards", () => {
  withRepo(
    (dir) => {
      const marker = join(dir, "grandchild.pid");
      // The gate backgrounds a grandchild, so killing only the immediate child would leave it running —
      // which is precisely what the process-group kill exists to prevent.
      const gate = `sh -c 'sleep 60 & echo $! > ${marker}; wait'`;
      cli(dir, ["init", "--stage", "verify", "--feature", FEATURE, "--out", OUT, "--gates", `${gate}::slow`]);
      const r = cli(dir, runArgs(700));
      assert.equal(r.code, 0);
      assert.equal(r.json.exit, 124, "a timeout must record 124");
      assert.equal(r.json.timed_out, true);

      const pid = Number(readFileSync(marker, "utf8").trim());
      assert.ok(Number.isInteger(pid) && pid > 0, "the fixture never recorded a grandchild pid");
      // Give the SIGKILL escalation a moment, then assert the grandchild is gone.
      execFileSync("sh", ["-c", "sleep 3"]);
      let alive = true;
      try {
        process.kill(pid, 0);
      } catch {
        alive = false;
      }
      assert.equal(alive, false, `the grandchild ${pid} survived the group kill`);
    },
    { scripts: { test: "true" } }
  );
});

test("argv entries never reach a shell: `;` and `$(…)` are LITERAL arguments", () => {
  withRepo(
    (dir) => {
      // A discovered gate runs as `npm run <id>`; to test argv handling directly the entry is built via
      // a structural extra, whose argv is fixed by the core. The proof is that check-structural receives
      // the metacharacter-bearing path as ONE argument and reports it not-found rather than executing it.
      mkdirSync(join(dir, "cap/evals/expected"), { recursive: true });
      const nasty = "cap/evals/expected/a;$(touch pwned).json";
      writeFileSync(join(dir, "cap/evals/expected/plain.json"), "[]");
      cli(dir, ["init", "--stage", "verify", "--feature", FEATURE, "--out", OUT, "--gates", "true::t", "--extra", JSON.stringify([nasty])]);
      drain(dir);
      assert.ok(!existsSync(join(dir, "pwned")), "a $(…) in an argv operand was executed by a shell");
    },
    { scripts: { test: "true" } }
  );
});

test("a SHELL entry appends files as POSITIONAL args — `a b` stays one arg and `$(x)` stays literal", () => {
  withRepo(
    (dir) => {
      // The gate prints each positional arg on its own line; the assertion is on the recorded output.
      const sj = join(dir, "scope.json");
      writeFileSync(sj, JSON.stringify({ escaped: [], outside_tests: ["a b.js", "$(touch pwned).js"], outside_eval_pairs: [] }));
      const r = cli(dir, [
        "init",
        "--stage",
        "regress",
        "--side",
        "head",
        "--feature",
        FEATURE,
        "--out",
        OUT,
        "--gates",
        'printf "[%s]\\n"::test',
        "--scope-json",
        "scope.json",
      ]);
      assert.equal(r.code, 0);
      drain(dir);
      const log = readFileSync(join(dir, OUT, "0-test.out"), "utf8");
      assert.match(log, /\[a b\.js\]/, "a filename with a space was word-split into two arguments");
      assert.match(log, /\[\$\(touch pwned\)\.js\]/, "a $(…) filename was expanded by the shell");
      assert.ok(!existsSync(join(dir, "pwned")), "a $(…) filename was executed");
    },
    { scripts: { test: "true" } }
  );
});

test("a file-addressable gate with NO files records 0 / ran:false / reason no-files — never a silent skip", () => {
  withRepo(
    (dir) => {
      writeFileSync(join(dir, "scope.json"), JSON.stringify({ escaped: [], outside_tests: [], outside_eval_pairs: [] }));
      cli(dir, [
        "init",
        "--stage",
        "regress",
        "--side",
        "head",
        "--feature",
        FEATURE,
        "--out",
        OUT,
        "--discover",
        "package.json",
        "--scope-json",
        "scope.json",
      ]);
      drain(dir);
      const t = stamp(dir).runs.find((r) => r.id === "test");
      assert.equal(t.exit, 0);
      assert.equal(t.ran, false);
      assert.equal(t.reason, "no-files");
    },
    { scripts: { test: 'node -e "process.exit(3)"' } }
  );
});

test("a large gate output survives (written by fd, never through a pipe buffer)", () => {
  withRepo(
    (dir) => {
      const big = 5 * 1024 * 1024;
      cli(dir, [
        "init",
        "--stage",
        "verify",
        "--feature",
        FEATURE,
        "--out",
        OUT,
        "--gates",
        `node -e "process.stdout.write('x'.repeat(${big}))"::loud`,
      ]);
      drain(dir, 60000);
      const s = statSync(join(dir, OUT, "0-loud.out"));
      assert.equal(s.size, big, "the gate's output was truncated");
      assert.equal(stamp(dir).runs[0].exit, 0, "a large output turned into a runner error");
      assert.match(stamp(dir).runs[0].stdout_sha256, /^[0-9a-f]{64}$/);
    },
    { scripts: { test: "true" } }
  );
});

// ---------------------------------------------------------------------------------------------------
// The lock
// ---------------------------------------------------------------------------------------------------

test("a LIVE lock makes a concurrent run refuse `lock-busy`", () => {
  withRepo(
    (dir) => {
      cli(dir, initArgs());
      writeFileSync(join(dir, OUT, "lock"), JSON.stringify({ pid: process.pid, started_ms: Date.now(), timeout_ms: 30000 }));
      const r = cli(dir, runArgs());
      assert.equal(r.code, 2);
      assert.equal(r.json.reason_code, "lock-busy");
    },
    { scripts: { test: "true" } }
  );
});

test("a DEAD-PID lock and an AGED lock are both recovered (neither path is reachable end-to-end)", () => {
  // Both states need a crashed runner, so an end-to-end run cannot produce them. Constructing the state
  // directly is what keeps these branches from being code no test reaches (lessons-learned L41).
  withRepo(
    (dir) => {
      cli(dir, initArgs());
      // (1) dead pid — pid 2^22-1 is above the default max and is reliably absent.
      writeFileSync(join(dir, OUT, "lock"), JSON.stringify({ pid: 4194303, started_ms: Date.now(), timeout_ms: 30000 }));
      assert.equal(cli(dir, runArgs()).code, 0, "a dead-pid lock was not recovered");
      // (2) aged — a LIVE pid (our own) but older than timeout + grace, so pid reuse cannot hold it.
      writeFileSync(
        join(dir, OUT, "lock"),
        JSON.stringify({ pid: process.pid, started_ms: Date.now() - 10 * 60 * 1000, timeout_ms: 1000 })
      );
      assert.equal(cli(dir, runArgs()).code, 0, "an aged lock was not recovered");
    },
    { scripts: { test: "true", lint: "true" } }
  );
});

test("an UNREADABLE lock record is RECOVERED — a record that does not parse cannot be judged live", () => {
  // The branch the claim-site restructure makes distinct: readJson fails, `lock` is null, and
  // isStaleLock(null) is true. Its non-vacuity control is the LIVE-lock test above — a WELL-FORMED live
  // record still refuses, so this is not a runner that recovers from everything (lessons-learned L34).
  withRepo(
    (dir) => {
      cli(dir, initArgs());
      writeFileSync(join(dir, OUT, "lock"), "{ not json");
      assert.equal(cli(dir, runArgs()).code, 0, "a malformed lock was not recovered");
    },
    { scripts: { test: "true" } }
  );
});

test("the lock has ONE exclusive-create call site — a second `wx` on the name re-forms the TOCTOU pair (CWE-367)", () => {
  // The ENUMERATION is the deliverable, not an assertion for whichever member was in front of the author
  // (L29): commit 81cb673 removed the `existsSync(lp)` member of this pair and the pair simply re-formed
  // around the second `openSync` it added, because CodeQL's js/file-system-race counts `openSync` as a
  // CHECK as well as a USE. It is a CLOSURE, not a presence test, and it matches any flags rather than
  // the one spelling in front of the author (L36) — a site added later fails whatever it opens `lp` for.
  //
  // Comments are stripped first, block then line: the rationale above the claim NAMES `openSync(lp, …)`
  // in prose, so an enumeration over raw text would be satisfied by a file with two code sites and one
  // fewer comment. The assertion is over CODE; prose is not evidence either way.
  const code = readFileSync(CLI, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  assert.deepEqual(
    code.match(/openSync\(lp\b[^)]*\)/g),
    ['openSync(lp, "wx")'],
    "every claim must go through the ONE site — a first site DOMINATES a second, which is the pair CodeQL reports"
  );
});

test("the lock is RELEASED after a normal call, so the next call proceeds", () => {
  withRepo(
    (dir) => {
      cli(dir, initArgs());
      assert.equal(cli(dir, runArgs()).code, 0);
      assert.ok(!existsSync(join(dir, OUT, "lock")), "the lock survived a normal call");
      assert.equal(cli(dir, runArgs()).code, 0);
    },
    { scripts: { test: "true", lint: "true" } }
  );
});

// ---------------------------------------------------------------------------------------------------
// finalize
// ---------------------------------------------------------------------------------------------------

test("finalize REFUSES with `tree-changed-between-gates` when a gate's neighbour saw a different tree", () => {
  withRepo(
    (dir) => {
      // The first gate mutates a TRACKED file, so gate 2's fp_before differs from gate 1's fp_after only
      // if the mutation lands BETWEEN them — which is what the hand-edit below simulates deterministically.
      cli(dir, initArgs());
      cli(dir, runArgs()); // test
      const statePath = join(dir, OUT, "state.json");
      const st = JSON.parse(readFileSync(statePath, "utf8"));
      st.runs[0].fp_after = "f".repeat(64); // a tree state no later gate saw
      writeFileSync(statePath, JSON.stringify(st));
      const calls = drain(dir);
      const refused = calls.find((c) => c.code === 2);
      assert.ok(refused, "finalize did not refuse a broken fingerprint chain");
      assert.equal(refused.json.reason_code, "tree-changed-between-gates");
      assert.ok(!existsSync(join(dir, OUT, "stamp.json")), "a refused finalize must write no stamp");
    },
    { scripts: { test: "true", lint: "true" } }
  );
});

test("a SELF-MUTATING gate is RECORDED (mutated: true), never refused — reconcile judges that write", () => {
  withRepo(
    (dir) => {
      cli(dir, ["init", "--stage", "verify", "--feature", FEATURE, "--out", OUT, "--gates", "sh -c 'echo changed >> a.txt'::writer"]);
      drain(dir);
      const s = stamp(dir);
      const w = s.runs.find((r) => r.id === "writer");
      assert.equal(w.mutated, true, "a gate that wrote a tracked file was not recorded as mutating");
      assert.notEqual(w.fp_before, w.fp_after);
      assert.equal(s.finalized, true, "a self-mutating gate must not refuse the stamp");
    },
    { scripts: { test: "true" } }
  );
});

test("finalize NEVER writes a results.json — the stamp is the only store of the map (L35)", () => {
  withRepo(
    (dir) => {
      cli(dir, initArgs());
      drain(dir);
      const entries = execFileSync("ls", ["-1", join(dir, OUT)], { encoding: "utf8" })
        .split("\n")
        .filter(Boolean);
      assert.ok(!entries.includes("results.json"), `a results.json was written: ${entries.join(", ")}`);
      assert.ok(entries.includes("stamp.json"));
    },
    { scripts: { test: "true" } }
  );
});

test("the stamp carries aux.completeness OUTSIDE runs[] (GRILL R1 — INCOMPLETE must stay reachable)", () => {
  withRepo(
    (dir) => {
      cli(dir, initArgs());
      drain(dir);
      const s = stamp(dir);
      assert.ok(Number.isInteger(s.aux.completeness), "aux.completeness was not captured");
      assert.ok(!s.runs.some((r) => r.id === "completeness"), "completeness leaked into runs[] — INCOMPLETE would become unreachable");
      assert.ok(!s.required.includes("completeness"));
    },
    { scripts: { test: "true" } }
  );
});

test("`run --next` REQUIRES --timeout-ms — floor code carries no harness-specific default (L41)", () => {
  withRepo(
    (dir) => {
      cli(dir, initArgs());
      const r = cli(dir, ["run", "--next", "--out", OUT]);
      assert.equal(r.code, 2);
      assert.equal(r.json.reason_code, "usage-error");
      assert.match(r.json.reason, /--timeout-ms/);
    },
    { scripts: { test: "true" } }
  );
});

test("`run --next` before an init is `stamp-missing`, not a crash", () => {
  withRepo(
    (dir) => {
      mkdirSync(join(dir, OUT), { recursive: true });
      const r = cli(dir, runArgs());
      assert.equal(r.code, 2);
      assert.equal(r.json.reason_code, "stamp-missing");
    },
    { scripts: { test: "true" } }
  );
});

test("the bare CLI and an unknown subcommand emit a usage document, never a stack trace", () => {
  withRepo(
    (dir) => {
      for (const args of [[], ["frobnicate"], ["run"]]) {
        const r = cli(dir, args);
        assert.equal(r.code, 2, `\`${args.join(" ")}\` did not exit 2`);
        assert.equal(r.json.reason_code, "usage-error");
      }
    },
    { scripts: { test: "true" } }
  );
});

// ---------------------------------------------------------------------------------------------------
// PATH RESOLUTION — `--cwd` moves where gates RUN, never where the runner's records live
//
// Every test above runs with the default `--cwd .`, so the non-default value was covered by nothing
// (lessons-learned L41) — and /pharn-regress's base side, the ONE caller that passes it, failed at `init`
// with `spec-mismatch` for as long as it existed (L45). The rule is quantified over a SET of operands, so
// the set is materialized once and iterated (L52), and its size is asserted so an emptied list cannot pass
// (L34).
// ---------------------------------------------------------------------------------------------------

const SUB = "sub";

/** A repo whose SUBDIRECTORY carries a DIFFERENT manifest, so a resolution against `--cwd` is observable
 *  as a different gate set, a missing scope file, or a record in the wrong place. */
function subRepo(dir) {
  mkdirSync(join(dir, SUB), { recursive: true });
  writeFileSync(join(dir, SUB, "package.json"), JSON.stringify({ scripts: { lint: "true" } }));
  writeFileSync(join(dir, "scope.json"), JSON.stringify({ escaped: [], outside_tests: [], outside_eval_pairs: [] }));
}

const regressHead = (out, extra = [], scope = "scope.json") => [
  "init",
  "--stage",
  "regress",
  "--side",
  "head",
  "--feature",
  FEATURE,
  "--out",
  out,
  "--discover",
  "package.json",
  "--scope-json",
  scope,
  ...extra,
];

const PATH_OPERANDS = [
  {
    operand: "--out",
    check(dir) {
      const r = cli(dir, [...initArgs(), "--cwd", SUB]);
      assert.equal(r.code, 0, `init with --cwd ${SUB} refused: ${r.raw}`);
      assert.ok(existsSync(join(dir, OUT, "state.json")), "the record must land in the INVOKING directory's state root");
      assert.ok(!existsSync(join(dir, SUB, OUT)), "the record must NOT land under --cwd (the pre-fix location)");
    },
  },
  {
    operand: "--discover",
    check(dir) {
      const r = cli(dir, [...initArgs(), "--cwd", SUB]);
      assert.equal(r.code, 0, r.raw);
      // The invoking directory's manifest carries `test`; the subdirectory's carries only `lint`.
      assert.deepEqual(r.json.ids, ["test", "reconcile"], "--discover must read the invoking directory's manifest");
    },
  },
  {
    operand: "--scope-json",
    check(dir) {
      // scope.json exists ONLY in the invoking directory; resolved against --cwd it would be unreadable.
      const r = cli(dir, regressHead(".pharn/head", ["--cwd", SUB]));
      assert.equal(r.code, 0, `--scope-json was not read from the invoking directory: ${r.raw}`);
    },
  },
  {
    operand: "--spec-from",
    check(dir) {
      const head = cli(dir, regressHead(".pharn/head"));
      assert.equal(head.code, 0, head.raw);
      const base = cli(dir, [
        "init",
        "--stage",
        "regress",
        "--side",
        "base",
        "--feature",
        FEATURE,
        "--out",
        ".pharn/base",
        "--spec-from",
        ".pharn/head",
        "--cwd",
        SUB,
      ]);
      assert.equal(base.code, 0, `--spec-from was resolved against --cwd: ${base.raw}`);
      assert.deepEqual(base.json.ids, head.json.ids);
    },
  },
];

test("✧ L34/L52 — the path-operand set is counted, so an emptied list cannot pass vacuously", () => {
  assert.equal(PATH_OPERANDS.length, 4);
  assert.deepEqual(PATH_OPERANDS.map((p) => p.operand).sort(), ["--discover", "--out", "--scope-json", "--spec-from"]);
});

for (const p of PATH_OPERANDS) {
  test(`PATH RESOLUTION — ${p.operand} resolves against the INVOKING directory, not --cwd`, () => {
    withRepo(
      (dir) => {
        subRepo(dir);
        p.check(dir);
      },
      { scripts: { test: "true" } }
    );
  });
}

test("--cwd still decides where the gates RUN (the half of its meaning that stays)", () => {
  withRepo(
    (dir) => {
      subRepo(dir);
      cli(dir, ["init", "--stage", "verify", "--feature", FEATURE, "--out", OUT, "--gates", "pwd::where", "--cwd", SUB]);
      drain(dir);
      const where = readFileSync(join(dir, OUT, "0-where.out"), "utf8").trim();
      assert.equal(where.split("/").pop(), SUB, `the gate ran in ${where}, not in --cwd`);
      assert.equal(stamp(dir).finalized, true);
    },
    { scripts: { test: "true" } }
  );
});

/** Stand up a real base worktree at /pharn-regress's literal path, from a repo with one commit. */
function withBaseWorktree(fn) {
  return withRepo(
    (dir) => {
      const sha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();
      mkdirSync(join(dir, ".pharn/pharn-regress"), { recursive: true });
      writeFileSync(
        join(dir, ".pharn/pharn-regress/scope.json"),
        JSON.stringify({ escaped: [], outside_tests: [], outside_eval_pairs: [] })
      );
      return fn(dir, sha);
    },
    { scripts: { test: "true", lint: "true" } }
  );
}

test("the regress PAIR end to end through a real git worktree: the base stamp lands in the invoking state root", () => {
  withBaseWorktree((dir, sha) => {
    execFileSync("git", ["worktree", "add", "-q", "--detach", ".pharn/pharn-regress/base", sha], { cwd: dir });
    assert.equal(cli(dir, regressHead(".pharn/pharn-regress/head", [], ".pharn/pharn-regress/scope.json")).code, 0);
    const base = cli(dir, [
      "init",
      "--stage",
      "regress",
      "--side",
      "base",
      "--feature",
      FEATURE,
      "--out",
      ".pharn/pharn-regress/base-gates",
      "--spec-from",
      ".pharn/pharn-regress/head",
      "--cwd",
      ".pharn/pharn-regress/base",
    ]);
    assert.equal(base.code, 0, `the base init refused: ${base.raw}`);
    for (const out of [".pharn/pharn-regress/head", ".pharn/pharn-regress/base-gates"]) {
      for (let i = 0; i < 10; i++) {
        const r = cli(dir, ["run", "--next", "--out", out, "--timeout-ms", "30000"]);
        assert.notEqual(r.code, 2, `the ${out} drain hit a runner error: ${r.raw}`);
        if (r.code === 3) break;
      }
    }
    const baseStamp = join(dir, ".pharn/pharn-regress/base-gates/stamp.json");
    assert.ok(existsSync(baseStamp), "the base stamp is not in the invoking directory's state root");
    // Negative control: the pre-fix location, INSIDE the base worktree, stays empty.
    assert.ok(!existsSync(join(dir, ".pharn/pharn-regress/base/.pharn")), "a record was written inside the base worktree");
    const s = JSON.parse(readFileSync(baseStamp, "utf8"));
    assert.equal(s.head, sha, "the base stamp must record the base worktree's HEAD");
    assert.equal(s.side, "base");
    assert.equal(s.finalized, true);
  });
});

// ---------------------------------------------------------------------------------------------------
// ★ WIRING — the COMMITTED /pharn-regress lines, executed (lessons-learned L45)
//
// The fix lives in this runner; the file that INVOKES it is `.claude/commands/pharn-regress.md`, and a
// suite that only spawns the runner by path cannot see a gap between the two. So the pinned lines are
// EXTRACTED from the command and run, one block per shell (L44), with only their placeholders substituted.
//
// Fixture-supplied, and named here rather than implied: `.pharn/pharn-regress/scope.json` (the Step-3
// `scope` line's operands are placeholder LISTS, and that partition is not what this pins) and the floor
// modules the lines invoke, copied into the fixture so `node pharn/floor/…` resolves as it does in a repo.
// ---------------------------------------------------------------------------------------------------

const REGRESS_CMD = join(HERE, "..", "..", ".claude", "commands", "pharn-regress.md");
const FLOOR_MODULES = [
  "run-gates.mjs",
  "gate-run-core.mjs",
  "worktree-fingerprint.mjs",
  "reconcile-baseline.mjs",
  "check-regress.mjs",
  // run-gates.mjs reads `--ac-tests` through ac-tests-core.mjs (6.18.0), which reads `## Files` through plan-files-core.
  "ac-tests-core.mjs",
  "plan-files-core.mjs",
];

/** Fenced blocks of a command, as arrays of lines. */
function fencedBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*```/.test(line)) {
      if (cur) {
        blocks.push(cur);
        cur = null;
      } else cur = [];
      continue;
    }
    if (cur) cur.push(line);
  }
  return blocks;
}

/** Exactly ONE block matching `re`, as the text a shell receives. */
function pinned(blocks, re, label) {
  const hits = blocks.filter((b) => re.test(b.join("\n")));
  assert.equal(hits.length, 1, `expected exactly one pinned ${label} block in pharn-regress.md, found ${hits.length}`);
  return hits[0].join("\n");
}

test("★ WIRING — /pharn-regress's COMMITTED base-side lines produce a base stamp and a verdict (L45)", () => {
  const blocks = fencedBlocks(readFileSync(REGRESS_CMD, "utf8"));
  const lines = {
    worktreeAdd: pinned(blocks, /^git worktree add --detach \.pharn\/pharn-regress\/base /m, "worktree add"),
    headInit: pinned(blocks, /run-gates\.mjs init --stage regress --side head\b/, "head init"),
    baseInit: pinned(blocks, /run-gates\.mjs init --stage regress --side base\b/, "base init"),
    headDrain: pinned(blocks, /run-gates\.mjs run --next --out \.pharn\/pharn-regress\/head /, "head drain"),
    baseDrain: pinned(blocks, /run-gates\.mjs run --next --out \.pharn\/pharn-regress\/base-gates /, "base drain"),
    verdict: pinned(blocks, /check-regress\.mjs verdict/, "verdict"),
    remove: pinned(blocks, /^git worktree remove --force \.pharn\/pharn-regress\/base\s*$/m, "worktree remove"),
  };
  assert.match(
    lines.baseInit,
    /--cwd \.pharn\/pharn-regress\/base\b/,
    "the pinned base init no longer passes --cwd — this test pins the wrong line"
  );

  withBaseWorktree((dir, sha) => {
    mkdirSync(join(dir, "pharn/floor"), { recursive: true });
    for (const m of FLOOR_MODULES) copyFileSync(join(HERE, m), join(dir, "pharn/floor", m));
    execFileSync("git", ["add", "-A"], { cwd: dir });
    execFileSync("git", ["commit", "-qm", "floor"], { cwd: dir });
    const base = execFileSync("git", ["rev-parse", "HEAD"], { cwd: dir, encoding: "utf8" }).trim();
    assert.notEqual(base, sha, "precondition: the floor copy is committed, so the base worktree carries it");

    const sub = (text) => {
      const out = text
        .replaceAll("<name>", FEATURE)
        .replaceAll("<base SHA>", base)
        .replaceAll("<the resolved 40-hex base SHA>", base)
        .replaceAll("<inside, comma-separated>", "a.txt");
      assert.doesNotMatch(out, /<[a-z][^>]*>/, `an unsubstituted placeholder remains in: ${out}`);
      return out;
    };
    const sh = (text) => spawnSync("sh", ["-c", sub(text)], { cwd: dir, encoding: "utf8" });
    const drainPinned = (text) => {
      for (let i = 0; i < 10; i++) {
        const r = sh(text);
        assert.notEqual(r.status, 2, `a pinned drain hit a runner error: ${r.stdout}${r.stderr}`);
        if (r.status === 3) return;
      }
      assert.fail("a pinned drain never reported nothing-left");
    };

    assert.equal(sh(lines.worktreeAdd).status, 0, "the pinned worktree line failed");
    let r = sh(lines.headInit);
    assert.equal(r.status, 0, `the pinned head init failed: ${r.stdout}`);
    r = sh(lines.baseInit);
    assert.equal(r.status, 0, `the pinned BASE init failed — the defect this increment repairs: ${r.stdout}`);
    drainPinned(lines.headDrain);
    drainPinned(lines.baseDrain);
    // Negative control: nothing landed at the pre-fix location inside the worktree.
    assert.ok(!existsSync(join(dir, ".pharn/pharn-regress/base/.pharn")), "a record was written inside the base worktree");

    r = sh(lines.verdict);
    assert.equal(r.status, 0, `the pinned verdict failed: ${r.stdout}`);
    assert.equal(JSON.parse(r.stdout).verdict, "no-regressions");

    // The stamp outlives the worktree Step 6 removes, so a later reader of the regress evidence finds it.
    assert.equal(sh(lines.remove).status, 0, "the pinned worktree removal failed");
    assert.ok(!existsSync(join(dir, ".pharn/pharn-regress/base")), "the worktree was not removed");
    r = sh(lines.verdict);
    assert.equal(r.status, 0, `the verdict no longer reproduces after the worktree removal: ${r.stdout}`);
  });
});

// ---------------------------------------------------------------------------------------------------
// Per-test results (6.15.0): the env var, the per-gate file, and results_sha256.
// ---------------------------------------------------------------------------------------------------

/** A gate helper the tests install as a script: it acts on `process.env.PHARN_TEST_RESULTS` per its argv. */
const RESULTS_GATE = `
const fs = require("fs");
const p = process.env.${RESULTS_ENV};
const [mode, arg] = process.argv.slice(2);
if (mode === "print") console.log(p + "|" + process.env.PHARN_PROBE);
if (mode === "write") fs.writeFileSync(p, arg);
if (mode === "copy") fs.writeFileSync(p, fs.readFileSync(arg));
if (mode === "symlink") { fs.writeFileSync("target.json", "{}"); fs.symlinkSync(require("path").resolve("target.json"), p); }
if (mode === "fifo") require("child_process").execFileSync("mkfifo", [p]);
process.exit(Number(process.env.GATE_EXIT || 0));
`;

function withResultsRepo(scripts, fn) {
  withRepo(
    (dir) => {
      writeFileSync(join(dir, "rgate.cjs"), RESULTS_GATE);
      return fn(dir);
    },
    { scripts }
  );
}

function drainWith(dir, env) {
  for (let i = 0; i < 20; i++) {
    // A bounded spawn: a runner that BLOCKS (the FIFO case) must fail this test, never hang it.
    const r = cli(dir, runArgs(), { env: { ...process.env, ...env }, timeout: 60000 });
    if (r.code === null) throw new Error("the runner did not finish within 60 s — it blocked");
    if (r.code === 3 || r.code === 2) return r;
  }
  throw new Error("drain did not terminate");
}

test("the results env var reaches EVERY gate, points inside <out>, differs per gate, and the rest of the env is inherited", () => {
  withResultsRepo({ test: "node rgate.cjs print", lint: "node rgate.cjs print" }, (dir) => {
    assert.equal(cli(dir, initArgs()).code, 0);
    assert.equal(drainWith(dir, { PHARN_PROBE: "kept" }).code, 3);
    const outReal = realpathSync(join(dir, OUT));
    const seen = [];
    for (const [seq, id] of [
      [0, "test"],
      [1, "lint"],
    ]) {
      const line = readFileSync(join(dir, OUT, `${seq}-${id}.out`), "utf8")
        .split("\n")
        .find((l) => l.includes("|"));
      const [value, probe] = line.trim().split("|");
      assert.equal(value, join(outReal, resultsFileName(seq, id)), `${id}: the var is not this gate's own path inside <out>`);
      assert.equal(probe, "kept", `${id}: the inherited environment was not passed through`);
      seen.push(value);
    }
    assert.notEqual(seen[0], seen[1], "two gates were handed the same results path");
  });
});

test("results_sha256 is the sha256 of the file a gate wrote, and null for a gate that wrote none", () => {
  withResultsRepo({ test: "node rgate.cjs write results-bytes", lint: "node rgate.cjs none" }, (dir) => {
    cli(dir, initArgs());
    drainWith(dir, {});
    const runs = stamp(dir).runs;
    const byId = Object.fromEntries(runs.map((r) => [r.id, r]));
    assert.equal(byId.test.results_sha256, createHash("sha256").update("results-bytes").digest("hex"));
    assert.equal(byId.lint.results_sha256, null);
    assert.equal(byId.reconcile.results_sha256, null);
    assert.equal(byId.test.mutated, false, "writing the results file under <out> must not move the fingerprint");
  });
});

test("a SYMLINK or a FIFO at the results path is never followed or blocked on — results_sha256 is null", () => {
  for (const mode of ["symlink", "fifo"]) {
    withResultsRepo({ test: `node rgate.cjs ${mode}` }, (dir) => {
      cli(dir, initArgs());
      const t0 = Date.now();
      drainWith(dir, {});
      assert.ok(Date.now() - t0 < 20000, `${mode}: the runner blocked`);
      assert.equal(stamp(dir).runs.find((r) => r.id === "test").results_sha256, null, mode);
    });
  }
});

test("a STALE results file (a crashed attempt's, re-run without init's wipe) is cleared before the gate runs", () => {
  withResultsRepo({ test: "node rgate.cjs none" }, (dir) => {
    cli(dir, initArgs());
    writeFileSync(join(dir, OUT, resultsFileName(0, "test")), '{"stale":true}');
    drainWith(dir, {});
    assert.equal(stamp(dir).runs.find((r) => r.id === "test").results_sha256, null, "the stale file was hashed as this run's");
  });
});

test("a DIRECTORY left at the results path (a gate that ran `mkdir $PHARN_TEST_RESULTS`) is cleared, not refused", () => {
  withResultsRepo({ test: "node rgate.cjs none" }, (dir) => {
    cli(dir, initArgs());
    const p = join(dir, OUT, resultsFileName(0, "test"));
    mkdirSync(join(p, "nested"), { recursive: true });
    assert.equal(drainWith(dir, {}).code, 3);
    assert.equal(stamp(dir).runs.find((r) => r.id === "test").results_sha256, null);
  });
});

test("a results path that STILL cannot be removed (permissions) is REFUSED as path-containment, never hashed", (t) => {
  if (typeof process.getuid === "function" && process.getuid() === 0) return t.skip("root ignores directory permissions");
  withResultsRepo({ test: "node rgate.cjs none" }, (dir) => {
    cli(dir, initArgs());
    // The lock lives in <out>, so <out> itself must stay writable (a read-only <out> is `lock-busy` first). An
    // unremovable CHILD of a directory at the results path is what makes the recursive remove fail.
    const locked = join(dir, OUT, resultsFileName(0, "test"), "locked");
    mkdirSync(locked, { recursive: true });
    writeFileSync(join(locked, "f"), "stale");
    chmodSync(locked, 0o555);
    try {
      const r = cli(dir, runArgs());
      assert.equal(r.code, 2);
      assert.equal(r.json.reason_code, "path-containment");
    } finally {
      chmodSync(locked, 0o755);
    }
  });
});

test("an INHERITED PHARN_TEST_RESULTS is overridden — each gate sees only its own path", () => {
  withResultsRepo({ test: "node rgate.cjs print" }, (dir) => {
    cli(dir, initArgs());
    drainWith(dir, { [RESULTS_ENV]: "/somewhere/else.json", PHARN_PROBE: "x" });
    const line = readFileSync(join(dir, OUT, "0-test.out"), "utf8")
      .split("\n")
      .find((l) => l.includes("|"));
    assert.equal(line.split("|")[0], join(realpathSync(join(dir, OUT)), resultsFileName(0, "test")));
  });
});

test("END TO END — a gate that writes a real vitest report yields the exact per-test record through testRecord", () => {
  const fixture = join(HERE, "test-fixtures", "test-results", "vitest.json");
  withResultsRepo({ test: `node rgate.cjs copy ${fixture}` }, (dir) => {
    writeFileSync(join(dir, "pharn.config.json"), JSON.stringify({ testResults: { test: "vitest-json" } }));
    cli(dir, initArgs());
    drainWith(dir, { GATE_EXIT: "1" }); // the captured run exited 1 (one test fails)
    const s = stamp(dir);
    const rec = testRecord({ stamp: s, outDir: join(dir, OUT), gateId: "test", root: dir });
    assert.equal(rec.ok, true, rec.reason);
    assert.equal(rec.exit, 1);
    assert.deepEqual(rec.counts, { passed: 2, failed: 1, skipped: 2 });
    // Control: the same stamp read as if the gate had exited 0 is the forgery signal.
    const lie = JSON.parse(JSON.stringify(s));
    lie.runs.find((r) => r.id === "test").exit = 0;
    assert.equal(testRecord({ stamp: lie, outDir: join(dir, OUT), gateId: "test", root: dir }).reason_code, "results-exit-contradiction");
  });
});

// ---------------------------------------------------------------------------------------------------
// Refusal paths the suite had not reached (added with 6.15.0 so the runner's line coverage clears 90%;
// each case is one malformed input with the accepted input as its control — L34).
// ---------------------------------------------------------------------------------------------------

test("init REFUSES a malformed --gates string with its own reason_code (bad-gates), never a partial set", () => {
  withRepo(
    (dir) => {
      const r = cli(dir, initArgs(["--gates", "npm test,,npm run lint"]));
      assert.equal(r.code, 2);
      assert.equal(r.json.reason_code, "bad-gates");
      assert.equal(cli(dir, initArgs(["--gates", "npm test"])).code, 0, "control: a well-formed --gates is accepted");
    },
    { scripts: { test: "true" } }
  );
});

test("regress head REFUSES an outside_eval_pairs entry that is not {expected, actual}, or not colocated", () => {
  withRepo(
    (dir) => {
      const sj = join(dir, "scope.json");
      const args = [
        "init",
        "--stage",
        "regress",
        "--side",
        "head",
        "--feature",
        FEATURE,
        "--out",
        OUT,
        "--discover",
        "package.json",
        "--scope-json",
        "scope.json",
      ];
      const EXP = "cap/evals/expected/x.json";
      for (const pair of ["cap/evals/expected/x.json", { expected: EXP }, { expected: EXP, actual: "elsewhere/findings.json" }]) {
        writeFileSync(sj, JSON.stringify({ escaped: [], outside_tests: [], outside_eval_pairs: [pair] }));
        const r = cli(dir, args);
        assert.equal(r.code, 2, JSON.stringify(pair));
        assert.equal(r.json.reason_code, "bad-scope-json", JSON.stringify(pair));
      }
      writeFileSync(
        sj,
        JSON.stringify({ escaped: [], outside_tests: [], outside_eval_pairs: [{ expected: EXP, actual: "cap/findings.json" }] })
      );
      const ok = cli(dir, args);
      assert.equal(ok.code, 0, "control: a colocated pair is accepted");
      assert.ok(ok.json.ids.includes(`structural:${EXP}`));
    },
    { scripts: { test: "true" } }
  );
});

test("regress base REFUSES a --spec-from record that carries no gate entries (spec-mismatch)", () => {
  withRepo(
    (dir) => {
      const head = join(dir, ".pharn", "head");
      mkdirSync(head, { recursive: true });
      writeFileSync(
        join(head, "state.json"),
        JSON.stringify({ stage: "regress", side: "head", feature: FEATURE, entries: [], runs: [], required: [] })
      );
      const r = cli(dir, [
        "init",
        "--stage",
        "regress",
        "--side",
        "base",
        "--feature",
        FEATURE,
        "--out",
        ".pharn/base",
        "--spec-from",
        ".pharn/head",
      ]);
      assert.equal(r.code, 2);
      assert.equal(r.json.reason_code, "spec-mismatch");
    },
    { scripts: { test: "true" } }
  );
});

test("run --next REFUSES a glob-shaped file entry that reached the record (bad-scope-json), never runs it", () => {
  withRepo(
    (dir) => {
      assert.equal(cli(dir, initArgs()).code, 0);
      const statePath = join(dir, OUT, "state.json");
      const st = JSON.parse(readFileSync(statePath, "utf8"));
      st.entries[0].files = ["t/*.test.js"];
      writeFileSync(statePath, JSON.stringify(st));
      const r = cli(dir, runArgs());
      assert.equal(r.code, 2);
      assert.equal(r.json.reason_code, "bad-scope-json");
    },
    { scripts: { test: "true" } }
  );
});

// ---------------------------------------------------------------------------------------------------
// The e2e gate end to end (6.16.0): discovered from the manifest, run after `build`, its own results file,
// and a red e2e gate fails verify exactly like a red `test` gate.
// ---------------------------------------------------------------------------------------------------

test("E2E END TO END — `test` and `test:e2e` each write their own report; each record derives; the test record is untouched", () => {
  const vitest = join(HERE, "test-fixtures", "test-results", "vitest.json");
  const playwright = join(HERE, "test-fixtures", "test-results", "playwright.json");
  withResultsRepo(
    { test: `node rgate.cjs copy ${vitest}`, build: "node rgate.cjs none", "test:e2e": `node rgate.cjs copy ${playwright}` },
    (dir) => {
      writeFileSync(
        join(dir, "pharn.config.json"),
        JSON.stringify({ testResults: { test: "vitest-json", "test:e2e": "playwright-json" } })
      );
      const init = cli(dir, initArgs());
      assert.deepEqual(init.json.ids, ["test", "build", "test:e2e", "reconcile"], "the e2e gate must run AFTER build");
      drainWith(dir, { GATE_EXIT: "1" }); // both captured runs exited 1
      const s = stamp(dir);
      const byId = Object.fromEntries(s.runs.map((r) => [r.id, r]));
      assert.notEqual(byId.test.results_sha256, byId["test:e2e"].results_sha256, "the two gates share a results file");
      for (const [seq, id] of [
        [0, "test"],
        [2, "test:e2e"],
      ]) {
        assert.ok(existsSync(join(dir, OUT, resultsFileName(seq, id))), `${id}'s own results file is missing`);
      }
      const unit = testRecord({ stamp: s, outDir: join(dir, OUT), gateId: "test", root: dir });
      const e2e = testRecord({ stamp: s, outDir: join(dir, OUT), gateId: "test:e2e", root: dir });
      assert.equal(unit.ok, true, unit.reason);
      assert.equal(unit.format, "vitest-json");
      assert.deepEqual(unit.counts, { passed: 2, failed: 1, skipped: 2 }, "the e2e gate changed the test gate's record");
      assert.equal(e2e.ok, true, e2e.reason);
      assert.equal(e2e.format, "playwright-json");
      assert.deepEqual(e2e.counts, { passed: 4, failed: 2, skipped: 2 });
    }
  );
});

test("E2E VERDICT — a red e2e gate fails verify exactly like a red test gate (check-verify --stamp)", () => {
  const CHECK_VERIFY = join(HERE, "check-verify.mjs");
  for (const [redId, scripts] of [
    ["test:e2e", { test: "true", "test:e2e": 'node -e "process.exit(1)"' }],
    ["test", { test: 'node -e "process.exit(1)"', "test:e2e": "true" }],
    [null, { test: "true", "test:e2e": "true" }],
  ]) {
    withRepo(
      (dir) => {
        cli(dir, initArgs());
        drain(dir);
        const r = spawnSync(process.execPath, [CHECK_VERIFY, "--stamp", join(dir, OUT, "stamp.json"), "--feature", FEATURE], {
          cwd: dir,
          encoding: "utf8",
        });
        // The fixture repo has no pharn/floor/, so the injected `reconcile` gate is red in EVERY case, which makes
        // the overall verdict FAIL regardless. The claim under test is over the PROJECT gates, and the all-green
        // control below proves the filtered list is not empty for free.
        const projectRed = JSON.parse(r.stdout).failing_gates.filter((g) => g !== "reconcile");
        assert.deepEqual(projectRed, redId === null ? [] : [redId]);
      },
      { scripts }
    );
  }
});

test("E2E AT REGRESS (runner level) — the head init drops an e2e script, prints it as e2e_excluded, and the base copies the set", () => {
  withRepo(
    (dir) => {
      writeFileSync(join(dir, "scope.json"), JSON.stringify({ escaped: [], outside_tests: ["t/a.test.js"], outside_eval_pairs: [] }));
      const head = cli(dir, [
        "init",
        "--stage",
        "regress",
        "--side",
        "head",
        "--feature",
        FEATURE,
        "--out",
        ".pharn/head",
        "--discover",
        "package.json",
        "--scope-json",
        "scope.json",
      ]);
      assert.equal(head.code, 0, head.raw);
      assert.deepEqual(head.json.ids, ["test"]);
      assert.deepEqual(head.json.e2e_excluded, ["test:e2e"]);
      const base = cli(dir, [
        "init",
        "--stage",
        "regress",
        "--side",
        "base",
        "--feature",
        FEATURE,
        "--out",
        ".pharn/base",
        "--spec-from",
        ".pharn/head",
      ]);
      assert.equal(base.code, 0, base.raw);
      assert.deepEqual(base.json.ids, ["test"], "the base side must copy the head set, e2e excluded");
      // The stamp shape is untouched: the report lives in init's output only.
      assert.ok(!Object.hasOwn(JSON.parse(readFileSync(join(dir, ".pharn/head/state.json"), "utf8")), "e2e_excluded"));
    },
    { scripts: { test: "true", "test:e2e": "true" } }
  );
});

// ---------------------------------------------------------------------------------------------------
// --stage ac-test (6.18.0) — /pharn-test's red run
// ---------------------------------------------------------------------------------------------------

const AC_PATH = `pharn/features/${FEATURE}/AC-TESTS.md`;
const acMapping = (rows) =>
  ["---", `spec_id: ${FEATURE}`, `spec_content_hash: ${"a".repeat(64)}`, "---", "", "## Mapping", "", ...rows, ""].join("\n");
const AC_ROWS_OK = [
  "- AC-1 | unit | `tests/ac/u.test.js` | t",
  "- AC-2 | integration | `tests/ac/i.test.js` | t",
  "- AC-3 | e2e | `tests/e2e/x.spec.js` | t",
];
/** Each gate records its argv under .pharn/ (outside the fingerprint) and exits 1 — the red run's normal shape. */
const RECORDER = (id) =>
  `node -e "require('fs').writeFileSync('.pharn/argv-${id}.json', JSON.stringify(process.argv.slice(1))); process.exit(1)"`;
const acInit = (extra = []) => [
  "init",
  "--stage",
  "ac-test",
  "--feature",
  FEATURE,
  "--out",
  OUT,
  "--discover",
  "package.json",
  "--ac-tests",
  AC_PATH,
  ...extra,
];
function withAcRepo(fn, { rows = AC_ROWS_OK, scripts } = {}) {
  return withRepo(
    (dir) => {
      mkdirSync(join(dir, ".pharn"), { recursive: true });
      writeFileSync(join(dir, AC_PATH), acMapping(rows));
      return fn(dir);
    },
    { scripts: scripts ?? { test: RECORDER("test"), "test:e2e": RECORDER("e2e"), lint: RECORDER("lint"), build: RECORDER("build") } }
  );
}

test("ac-test: init selects exactly the levels' gates and each gate receives exactly its mapped files after `--`", () => {
  withAcRepo((dir) => {
    const init = cli(dir, acInit());
    assert.equal(init.code, 0, init.raw);
    const calls = drain(dir);
    assert.equal(calls.at(-1).code, 3, JSON.stringify(calls.map((c) => c.json)));
    const st = stamp(dir);
    assert.equal(st.stage, "ac-test");
    assert.deepEqual(st.required, ["test", "test:e2e"], "lint and build are discovered but no level needs them");
    assert.deepEqual(
      st.runs.map((r) => [r.id, r.files, r.exit]),
      [
        ["test", ["tests/ac/i.test.js", "tests/ac/u.test.js"], 1],
        ["test:e2e", ["tests/e2e/x.spec.js"], 1],
      ]
    );
    assert.ok(!st.runs.some((r) => r.id === "reconcile"), "no reconcile at ac-test");
    assert.equal(st.aux.completeness, null, "no completeness capture at ac-test");
    const argvOf = (id) => JSON.parse(readFileSync(join(dir, `.pharn/argv-${id}.json`), "utf8"));
    assert.deepEqual(argvOf("test"), ["tests/ac/i.test.js", "tests/ac/u.test.js"]);
    assert.deepEqual(argvOf("e2e"), ["tests/e2e/x.spec.js"], "the e2e gate is file-restricted too (grill G6)");
    assert.ok(!existsSync(join(dir, ".pharn/argv-lint.json")), "lint never ran");
  });
});

test("ac-test: init REFUSES each flag that would put the set back in a caller's hands, and each bad --ac-tests (grill G4/G5)", () => {
  withAcRepo((dir) => {
    writeFileSync(join(dir, "scope.json"), "{}");
    for (const [why, args] of [
      ["--gates", acInit(["--gates", "npm test::test"])],
      ["--extra", acInit(["--extra", "[]"])],
      ["--skip-style", acInit(["--skip-style"])],
      ["--side", acInit(["--side", "head"])],
      ["--scope-json", acInit(["--scope-json", "scope.json"])],
      ["--spec-from", acInit(["--spec-from", OUT])],
      ["--base", acInit(["--base", "pharn/features"])],
      ["--gates with a flag-shaped value", acInit(["--gates", "--x"])],
      ["--extra with no value", acInit(["--extra"])],
      ["no --ac-tests", ["init", "--stage", "ac-test", "--feature", FEATURE, "--out", OUT, "--discover", "package.json"]],
      ["no --discover", ["init", "--stage", "ac-test", "--feature", FEATURE, "--out", OUT, "--ac-tests", AC_PATH]],
      [
        "another feature's mapping",
        ["init", "--stage", "ac-test", "--feature", "other", "--out", OUT, "--discover", "package.json", "--ac-tests", AC_PATH],
      ],
      ["an unreadable mapping", acInit().map((a) => (a === AC_PATH ? `pharn/features/${FEATURE}/NOPE.md` : a))],
      ["--ac-tests at verify", [...initArgs(), "--ac-tests", AC_PATH]],
    ]) {
      const r = cli(dir, args);
      assert.equal(r.code, 2, `${why}: ${r.raw}`);
      assert.equal(r.json.reason_code, "usage-error", why);
    }
    assert.equal(cli(dir, acInit()).code, 0, "control: the same repo inits cleanly");
  });
  for (const [why, rows] of [
    ["a leading `-` file", ["- AC-1 | unit | `-u` | t"]],
    ["a --config file", ["- AC-1 | unit | `--config=evil.js` | t"]],
    ["a malformed line", ["- AC-1 | unit | tests/x.js | t"]],
    ["no rows", []],
  ]) {
    withAcRepo(
      (dir) => {
        const r = cli(dir, acInit());
        assert.equal(r.code, 2, `${why}: ${r.raw}`);
        assert.equal(r.json.reason_code, "usage-error", why);
      },
      { rows }
    );
  }
});

test("ac-test: a level with no discovered gate refuses init (coverage-violation), nothing written", () => {
  withAcRepo(
    (dir) => {
      const r = cli(dir, acInit());
      assert.equal(r.code, 2, r.raw);
      assert.equal(r.json.reason_code, "coverage-violation");
      assert.match(r.json.reason, /AC-3 \(e2e\)/);
      assert.ok(!existsSync(join(dir, OUT, "state.json")));
    },
    { scripts: { test: RECORDER("test") } }
  );
});

test("ac-test: a record whose entry lost its files is refused at run, never run with an empty list (L16)", () => {
  withAcRepo((dir) => {
    assert.equal(cli(dir, acInit()).code, 0);
    const statePath = join(dir, OUT, "state.json");
    const st = JSON.parse(readFileSync(statePath, "utf8"));
    st.entries[0].files = [];
    writeFileSync(statePath, JSON.stringify(st));
    const r = cli(dir, runArgs());
    assert.equal(r.code, 2, r.raw);
    assert.match(r.json.reason, /carries no mapped files/);
    assert.ok(!existsSync(join(dir, ".pharn/argv-test.json")), "the gate never ran");
  });
});
