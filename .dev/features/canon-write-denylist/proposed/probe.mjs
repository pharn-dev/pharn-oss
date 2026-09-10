#!/usr/bin/env node
// Standalone probe for the PROPOSED protect-trusted-paths.cjs (canon-write-denylist).
//
// WHY IT EXISTS. The increment could not be built — all three guard scripts are protected by the very
// hook being changed, so the patch is handed to a human instead (see ../BUILD.md). A patch that has only
// been READ is exactly what lessons-learned L37 says not to trust: "a doc stating a guard's bounds must
// be PROBED against the guard, not read off it". So the proposed hook is staged into a throwaway fixture
// repo and EXECUTED here, and every bound this increment claims is an exit code printed below.
//
// Run:  node .dev/features/canon-write-denylist/proposed/probe.mjs
// Exits 0 iff every expectation holds. It writes only under os.tmpdir().

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOOK_SRC = path.join(HERE, "protect-trusted-paths.cjs");

const root = fs.mkdtempSync(path.join(os.tmpdir(), "canon-probe-"));
for (const d of [
  ".claude/hooks",
  ".claude/commands",
  "memory-bank",
  ".dev/memory-bank",
  ".pharn",
  "pharn/pharn-core",
  "src/vendor/memory-bank",
]) {
  fs.mkdirSync(path.join(root, d), { recursive: true });
}
fs.copyFileSync(HOOK_SRC, path.join(root, ".claude/hooks/protect-trusted-paths.cjs"));
fs.writeFileSync(path.join(root, "memory-bank/lessons-learned.md"), "# Lessons learned\n");
fs.writeFileSync(path.join(root, ".dev/memory-bank/lessons-learned.md"), "# Lessons learned\n");
fs.writeFileSync(path.join(root, "pharn/CONSTITUTION.md"), "# c\n");
fs.writeFileSync(path.join(root, "pharn/pharn-core/x.md"), "x\n");
fs.writeFileSync(path.join(root, "src/vendor/memory-bank/x.md"), "x\n");

// --- symlink + hard-link fixtures (the alias vectors) ---
try {
  fs.symlinkSync("memory-bank/lessons-learned.md", path.join(root, "alias-file.md"));
  fs.symlinkSync("memory-bank", path.join(root, "mb-dir"));
  fs.symlinkSync("memory-bank/does-not-exist.md", path.join(root, "dangling.md"));
  fs.linkSync(path.join(root, "memory-bank/lessons-learned.md"), path.join(root, "hardlink.md"));
} catch (e) {
  console.error("fixture setup (links) failed:", e.message);
}

function run(file, tool = "Write") {
  const payload = JSON.stringify({ tool_name: tool, tool_input: { file_path: file } });
  try {
    execFileSync(process.execPath, [".claude/hooks/protect-trusted-paths.cjs"], {
      cwd: root,
      input: payload,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { code: 0, stderr: "" };
  } catch (e) {
    return { code: e.status ?? -1, stderr: String(e.stderr || "") };
  }
}
const setScope = (raw) => fs.writeFileSync(path.join(root, ".pharn/writes-scope.json"), raw);
const clearScope = () => fs.rmSync(path.join(root, ".pharn/writes-scope.json"), { force: true });

let failures = 0;
let checks = 0;
function expect(label, file, wantCode) {
  checks++;
  const { code } = run(file);
  const ok = code === wantCode;
  if (!ok) failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  exit=${code} (want ${wantCode})  ${label}`);
}

// The canon enumeration is MATERIALIZED here and every rule ITERATES it, rather than being hand-written
// once per member — lessons-learned L29 (the enumeration is the deliverable) and L36 (a per-member
// presence set is not a closed set).
const CANON_PATHS = [
  "memory-bank/lessons-learned.md",
  "memory-bank/pattern-library.md",
  ".dev/memory-bank/lessons-learned.md",
  ".dev/memory-bank/pattern-library.md",
  "memory-bank/nested/deep/new.md",
  ".dev/memory-bank/nested/deep/new.md",
];
// NON-VACUITY (L34): "for each canon path, assert denied" says nothing if the list is empty.
if (CANON_PATHS.length === 0) {
  console.error("FAIL: CANON_PATHS is empty — every per-path assertion below would pass vacuously");
  process.exit(1);
}

console.log(`fixture root: ${root}\n`);

console.log("A. canon DENIED with no scope (fail-closed) — iterating the materialized enumeration");
clearScope();
for (const p of CANON_PATHS) expect(p, p, 2);

console.log("\nB. NON-VACUITY control — unrelated writes must still be ALLOWED");
for (const p of [
  "pharn/pharn-core/x.md",
  "features/foo/PLAN.md",
  "memory-banked/x.md",
  "src/vendor/memory-bank/x.md",
  ".claude/commands/pharn-plan.md",
  ".claude/hooks/protect-trusted-paths.test.cjs",
]) {
  expect(p, p, 0);
}

console.log("\nC. regression — every existing DEFAULT_PROTECTED entry still denies");
for (const p of [
  "pharn/CONSTITUTION.md",
  "pharn/ARCHITECTURE.md",
  "THREAT-MODEL.md",
  "LIMITS.md",
  "CODEOWNERS",
  ".claude/settings.json",
  ".claude/hooks/protect-trusted-paths.cjs",
  ".pharn/writes-scope.json",
]) {
  expect(p, p, 2);
}

console.log("\nD. case variants, Unicode full-fold, Windows trailing dot/space");
for (const p of [
  "MEMORY-BANK/LESSONS-LEARNED.MD",
  ".DEV/Memory-Bank/x.md",
  "Memory-Bank/Lessons-Learned.md",
  "memory-bank/lessons-learned.md.",
  "memory-bank/lessons-learned.md ",
  "memory-bank/ſomething.md",
]) {
  expect(JSON.stringify(p), p, 2);
}

console.log("\nE. symlink + hard-link aliases");
expect("file symlink -> canon", "alias-file.md", 2);
expect("dir symlink -> canon", "mb-dir/lessons-learned.md", 2);
expect("DANGLING symlink into canon", "dangling.md", 2);
expect("hard-link alias of canon", "hardlink.md", 2);

console.log("\nF. THE FINDING'S VECTOR — a scope whose origin is an untrusted PLAN.md must NOT authorize");
setScope(JSON.stringify({ scope: ["memory-bank/lessons-learned.md"], set_by: "features/foo/PLAN.md", set_at: "x" }));
expect("set_by = features/foo/PLAN.md", "memory-bank/lessons-learned.md", 2);
setScope(JSON.stringify({ scope: [".dev/memory-bank/lessons-learned.md"], set_by: ".dev/features/foo/PLAN.md", set_at: "x" }));
expect("set_by = .dev/features/foo/PLAN.md", ".dev/memory-bank/lessons-learned.md", 2);

console.log("\nG. the ESCAPE allows a genuine promote-origin scope");
setScope(JSON.stringify({ scope: ["memory-bank/lessons-learned.md"], set_by: ".claude/commands/pharn-memory-promote.md", set_at: "x" }));
expect("product promote origin", "memory-bank/lessons-learned.md", 0);
setScope(
  JSON.stringify({ scope: [".dev/memory-bank/lessons-learned.md"], set_by: ".claude/commands/pharn-dev-memory-promote.md", set_at: "x" })
);
expect("dev promote origin", ".dev/memory-bank/lessons-learned.md", 0);

console.log("\nH. the escape REFUSES every near-miss (fail-closed on each)");
const NEAR_MISSES = [
  [
    "two-entry scope",
    JSON.stringify({ scope: ["memory-bank/lessons-learned.md", "x.md"], set_by: ".claude/commands/pharn-memory-promote.md" }),
  ],
  [
    "scope names the OTHER canon file",
    JSON.stringify({ scope: ["memory-bank/pattern-library.md"], set_by: ".claude/commands/pharn-memory-promote.md" }),
  ],
  [
    "origin is a .bak of a promote command",
    JSON.stringify({ scope: ["memory-bank/lessons-learned.md"], set_by: ".claude/commands/pharn-memory-promote.md.bak" }),
  ],
  [
    "origin is a prefix-y lookalike",
    JSON.stringify({ scope: ["memory-bank/lessons-learned.md"], set_by: "evil/.claude/commands/pharn-memory-promote.md" }),
  ],
  ["set_by missing", JSON.stringify({ scope: ["memory-bank/lessons-learned.md"] })],
  ["set_by not a string", JSON.stringify({ scope: ["memory-bank/lessons-learned.md"], set_by: 7 })],
  ["scope not an array", JSON.stringify({ scope: "memory-bank/lessons-learned.md", set_by: ".claude/commands/pharn-memory-promote.md" })],
  ["empty scope", JSON.stringify({ scope: [], set_by: ".claude/commands/pharn-memory-promote.md" })],
  ["record is a JSON array", JSON.stringify(["memory-bank/lessons-learned.md"])],
  ["record is literal null", "null"],
  ["record is not JSON at all", "not json {{{"],
];
// Regression for the defect this probe FOUND: `!aliased` in the decision branch denied the legitimate
// canon path whenever that file happened to carry a second hard link. The alias must stay denied while
// the real path stays authorizable — asserted as a pair below and in G, so a re-merge fails loudly.
const HARDLINK_ALIAS_CASE = [
  "hard-link alias under a valid promote scope (alias is not the --target)",
  JSON.stringify({ scope: ["memory-bank/lessons-learned.md"], set_by: ".claude/commands/pharn-memory-promote.md" }),
  "hardlink.md",
];
if (NEAR_MISSES.length === 0) {
  console.error("FAIL: NEAR_MISSES is empty — the refusal assertions would pass vacuously");
  process.exit(1);
}
for (const [label, raw] of NEAR_MISSES) {
  setScope(raw);
  expect(label, "memory-bank/lessons-learned.md", 2);
}
setScope(HARDLINK_ALIAS_CASE[1]);
expect(HARDLINK_ALIAS_CASE[0], HARDLINK_ALIAS_CASE[2], 2);
// ...and the SAME scope must still authorize the real path (the pair is the point — see the comment
// above HARDLINK_ALIAS_CASE). A future re-merge of the inode sets breaks exactly this line.
expect("...while the same scope still authorizes the real canon path", "memory-bank/lessons-learned.md", 0);

console.log("\nI. the escape cannot leak to a NON-canon protected path");
setScope(JSON.stringify({ scope: ["pharn/CONSTITUTION.md"], set_by: ".claude/commands/pharn-memory-promote.md" }));
expect("promote origin scoped to a trusted doc", "pharn/CONSTITUTION.md", 2);
setScope(JSON.stringify({ scope: [".claude/hooks/protect-trusted-paths.cjs"], set_by: ".claude/commands/pharn-memory-promote.md" }));
expect("promote origin scoped to the guard itself", ".claude/hooks/protect-trusted-paths.cjs", 2);

console.log("\nJ. every write tool is covered, not just Write");
clearScope();
for (const tool of ["Write", "Edit", "MultiEdit", "NotebookEdit"]) {
  checks++;
  const { code } = run("memory-bank/lessons-learned.md", tool);
  const ok = code === 2;
  if (!ok) failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  exit=${code} (want 2)  tool=${tool}`);
}

console.log("\nK. deny-message BRANCHES — each remedy present in its own case, ABSENT from the other (L27/L29)");
// The branch set is materialized so a branch added later is covered by both rules for free (L29).
const DENY_BRANCHES = [
  { label: "trusted", file: "pharn/CONSTITUTION.md", mustContain: /Trusted spec is human-only/, mustNotContain: /pharn-memory-promote/ },
  {
    label: "canon",
    file: "memory-bank/lessons-learned.md",
    mustContain: /\/pharn-memory-promote/,
    mustNotContain: /Trusted spec is human-only/,
  },
];
if (DENY_BRANCHES.length < 2) {
  console.error("FAIL: DENY_BRANCHES has fewer than 2 members — 'absent from the other' is unsatisfiable");
  process.exit(1);
}
for (const b of DENY_BRANCHES) {
  const { stderr } = run(b.file);
  checks += 2;
  const has = b.mustContain.test(stderr);
  const lacks = !b.mustNotContain.test(stderr);
  if (!has) failures++;
  if (!lacks) failures++;
  console.log(`  ${has ? "ok  " : "FAIL"}  ${b.label}: own remedy present`);
  console.log(`  ${lacks ? "ok  " : "FAIL"}  ${b.label}: the OTHER branch's remedy absent`);
}
// The canon branch must NOT offer the writes-scope remedy — that is the route it refuses (L27).
{
  const { stderr } = run("memory-bank/lessons-learned.md");
  checks++;
  const ok = /CANNOT authorize/.test(stderr) && !/re-run the scope-setter/.test(stderr);
  if (!ok) failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  canon: the unreachable "declare it in writes:" remedy is not offered`);
}

console.log("\nL. no writes-scope RECORD field ever reaches a deny message (this hook has no asData() fold)");
{
  const needle = "NEEDLE-FROM-UNTRUSTED-RECORD";
  setScope(JSON.stringify({ scope: ["memory-bank/lessons-learned.md"], set_by: needle, set_at: needle }));
  const { stderr } = run("memory-bank/lessons-learned.md");
  checks++;
  const ok = !stderr.includes(needle);
  if (!ok) failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  record fields absent from the deny message`);
}

fs.rmSync(root, { recursive: true, force: true });
console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures === 0 ? 0 : 1);
