// handfix-3: the test-side hand fixes — root paths the rewrite's anchors cannot see (after a link name, inside a
// .gitignore string, as an absolute stand-in, as array segments), and the protect tables whose root members
// MOVED. Nested look-alikes (`src/.pharn/…`, `backup/LIMITS.md.bak`) stay: their job is to stay unprotected.
const fs = require("fs");
function ed(f, pairs) {
  let s = fs.readFileSync(f, "utf8");
  for (const [a, b, all] of pairs) {
    const n = s.split(a).length - 1;
    if (n === 0 || (n > 1 && !all)) throw new Error(`${f}: ${n}x ${a.slice(0, 80)}`);
    s = all ? s.split(a).join(b) : s.replace(a, () => b);
  }
  fs.writeFileSync(f, s);
  console.log("ok", f);
}

// ── hooks ──────────────────────────────────────────────────────────────────────────────────────────────
ed(".claude/hooks/enforce-writes-scope.test.cjs", [
  [
    `fs.symlinkSync("../.pharn/writes-scope.json", join(cwd, "src", "evil-scope"));`,
    `fs.symlinkSync("../pharn/.run/writes-scope.json", join(cwd, "src", "evil-scope"));`,
  ],
]);
ed(".claude/hooks/protect-trusted-paths.test.cjs", [
  // F4 (b): case variants of the MOVED docs and of every other moved protected path (PLAN, surface 1; L73)
  [
    `  "threat-model.md",\n  "Limits.MD",\n`,
    `  "pharn/threat-model.md",\n  "pharn/Limits.MD",\n  "PHARN/LIMITS.md",\n  "PHARN/.RUN/WRITES-SCOPE.JSON",\n  "pharn/Memory-Bank/lessons-learned.md",\n  "pharn/Spec-Template.md",\n  "pharn/LIMITS.md.",\n  "pharn/LIMITS.md ",\n  "pharn/.run/writes-scope.json.",\n`,
  ],
  [`for (const p of ["pharn/CONſTITUTION.md", "LIMITſ.md", `, `for (const p of ["pharn/CONſTITUTION.md", "pharn/LIMITſ.md", `],
  [
    `for (const p of ["./pharn/ARCHITECTURE.md", "pharn/../pharn/ARCHITECTURE.md", "pharn/features/../../LIMITS.md"]) {`,
    `for (const p of [\n  "./pharn/ARCHITECTURE.md",\n  "pharn/../pharn/ARCHITECTURE.md",\n  "pharn/features/../LIMITS.md",\n  "pharn/.run/../LIMITS.md",\n  "pharn/.run/../../pharn/THREAT-MODEL.md",\n  "pharn/.run/../memory-bank/lessons-learned.md",\n]) {`,
  ],
  // F4 (a): the OLD root paths are a user's own files again (7.0.0) — never over-blocked
  [
    `  "app/user-docs/ARCHITECTURE.md",\n`,
    `  "app/user-docs/ARCHITECTURE.md",\n  "LIMITS.md",\n  "THREAT-MODEL.md",\n  "memory-bank/lessons-learned.md",\n  "pharn.spec-template.md",\n  ".pharn/writes-scope.json",\n`,
  ],
  // the subpath tests: the OUTER project's own pharn/LIMITS.md — create its pharn/ first
  [
    `  fs.writeFileSync(join(outer, "pharn/LIMITS.md"), "the USER's own file\\n");`,
    `  fs.mkdirSync(join(outer, "pharn"), { recursive: true });\n  fs.writeFileSync(join(outer, "pharn/LIMITS.md"), "the USER's own file\\n");`,
    true,
  ],
  // a link at the root followed by a root-relative path
  [`"s\\\\x/memory-bank/lessons-learned.md"`, `"s\\\\x/pharn/memory-bank/lessons-learned.md"`, true],
  [`"s\\\\x/LIMITS.md"`, `"s\\\\x/pharn/LIMITS.md"`, true],
]);

// ── dev apparatus ──────────────────────────────────────────────────────────────────────────────────────
ed(".claude/commands/pharn-dev-regress.md", [
  [`<working tree>/.pharn/pharn-dev-regress/`, `<working tree>/pharn/.run/pharn-dev-regress/`, true],
]);
ed(".dev/floor/node-test-results-reporter.test.mjs", [
  [`<working tree>\\/\\.pharn\\/pharn-dev-regress\\/`, `<working tree>\\/pharn\\/\\.run\\/pharn-dev-regress\\/`],
]);
ed(".dev/floor/command-hygiene.test.mjs", [[`"node pharn/floor/a.mjs && rm -rf .pharn"`, `"node pharn/floor/a.mjs && rm -rf pharn/.run"`]]);

// ── product floor tests ────────────────────────────────────────────────────────────────────────────────
ed("pharn/floor/build-gate.test.mjs", [
  [`'fs.mkdirSync(".pharn", { recursive: true });',`, `'fs.mkdirSync("pharn/.run", { recursive: true });',`],
]);
ed("pharn/floor/check-bash-reconcile.test.mjs", [
  [`gitignore = "node_modules/\\n.pharn/\\nrunned/\\n"`, `gitignore = "node_modules/\\npharn/.run/\\nrunned/\\n"`],
]);
ed("pharn/floor/reconcile-baseline.test.mjs", [[`"ignored/\\n.pharn/\\n"`, `"ignored/\\npharn/.run/\\n"`]]);
ed("pharn/floor/check-build-complete.test.mjs", [[`root/.pharn/writes-scope.json`, `root/pharn/.run/writes-scope.json`]]);
ed("pharn/floor/check-loop-fresh.test.mjs", [
  [`/mkdir '\\.\\/\\.pharn\\/pharn-loop\\/demo'/`, `/mkdir '\\.\\/pharn\\/\\.run\\/pharn-loop\\/demo'/`],
]);
ed("pharn/floor/entry-base-evidence.test.mjs", [
  [`[\\\\\\\\/]\\\\.pharn[\\\\\\\\/]pharn-entry`, `[\\\\\\\\/]pharn[\\\\\\\\/]\\\\.run[\\\\\\\\/]pharn-entry`],
]);
ed("pharn/floor/entry-observations.test.mjs", [[`    mkdirSync(".pharn");\n`, `    mkdirSync("pharn/.run", { recursive: true });\n`]]);
ed("pharn/floor/feature-name.test.mjs", [
  [
    `for (const linkAt of [".pharn", "pharn/.run/feature-name"]) {`,
    `for (const linkAt of ["pharn", "pharn/.run", "pharn/.run/feature-name"]) {`,
  ],
  [
    `const realCand = linkAt === ".pharn" ? join(real, "feature-name", "candidate.txt") : join(real, "candidate.txt");`,
    `const realCand =\n        linkAt === "pharn"\n          ? join(real, ".run", "feature-name", "candidate.txt")\n          : linkAt === "pharn/.run"\n            ? join(real, "feature-name", "candidate.txt")\n            : join(real, "candidate.txt");`,
  ],
  [
    `if (linkAt === "pharn/.run/feature-name") mkdirSync(join(s.dir, "pharn", ".run"));`,
    `if (linkAt !== "pharn") mkdirSync(join(s.dir, ...linkAt.split("/").slice(0, -1)), { recursive: true });`,
  ],
  [
    `[".pharn", (p) => writeFileSync(p, "x")],`,
    `["pharn", (p) => writeFileSync(p, "x")],\n    ["pharn/.run", (p) => writeFileSync(p, "x")],`,
  ],
]);
ed("pharn/floor/gate-reuse-core.test.mjs", [
  [`"/work/project/.pharn/pharn-regress/base"`, `"/work/project/pharn/.run/pharn-regress/base"`],
]);
ed("pharn/floor/regress-base-reuse-core.test.mjs", [
  [`"/r/.pharn/pharn-ship/demo/active.json"`, `"/r/pharn/.run/pharn-ship/demo/active.json"`],
]);
ed("pharn/floor/run-gates.test.mjs", [
  [`"--out", ".pharn", "--discover"`, `"--out", "pharn/.run", "--discover"`],
  [`"pharn/.run/pharn-regress/base/.pharn"`, `"pharn/.run/pharn-regress/base/pharn/.run"`],
]);
ed("pharn/floor/run-marker.test.mjs", [
  [
    `  { at: [".pharn"], command: "pharn-review", label: "pharn/.run itself" },\n`,
    `  { at: ["pharn", ".run"], command: "pharn-review", label: "pharn/.run itself" },\n`,
  ],
  [`{ at: [".pharn", `, `{ at: ["pharn", ".run", `, true],
  [`plant(dir, [".pharn", `, `plant(dir, ["pharn", ".run", `, true],
  [
    `const LOOP_PLANTS = [[".pharn"], [".pharn", "pharn-loop"], [".pharn", "pharn-loop", "demo-run"]];`,
    `const LOOP_PLANTS = [["pharn", ".run"], ["pharn", ".run", "pharn-loop"], ["pharn", ".run", "pharn-loop", "demo-run"]];`,
  ],
]);
ed("pharn/floor/stage-agent.test.mjs", [
  [
    `const components = [[".pharn"], [".pharn", "pharn-ship"], [".pharn", "pharn-ship", "demo"]];`,
    `const components = [["pharn", ".run"], ["pharn", ".run", "pharn-ship"], ["pharn", ".run", "pharn-ship", "demo"]];`,
  ],
  [`"the marker cannot be written through a dangling .pharn"`, `"the marker cannot be written through a dangling pharn/.run"`],
]);
ed("pharn/floor/stage-verify.test.mjs", [
  [`"a symlinked .pharn",`, `"a symlinked pharn/.run",`],
  [`"a dangling .pharn",`, `"a dangling pharn/.run",`],
]);
ed("pharn/floor/worktree-fingerprint.test.mjs", [
  [`untracked.includes(".pharn")`, `untracked.includes("pharn/.run")`],
  [`isExcluded(".pharn", FEATURE)`, `isExcluded("pharn/.run", FEATURE)`],
]);
ed("pharn/floor/seam-config-materialize.test.mjs", [
  [`fs.mkdirSync('.pharn',{recursive:true})`, `fs.mkdirSync('pharn/.run',{recursive:true})`],
]);
