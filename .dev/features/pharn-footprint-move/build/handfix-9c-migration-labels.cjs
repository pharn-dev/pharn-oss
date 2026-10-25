// handfix-a (runs after 9b): every remaining old-path line in .claude/ + pharn/ is migration material — a comment
// explaining the move, or a test proving an old root path is a user's own file again — so each says "migration", the
// word the PLAN's acceptance grep exempts. Nothing here changes behaviour.
const fs = require("fs");
function ed(f, pairs) {
  let s = fs.readFileSync(f, "utf8");
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${f}: ${n}x ${a.slice(0, 90)}`);
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(f, s);
  console.log("ok", f);
}
ed(".claude/hooks/enforce-writes-scope.cjs", [["runtime scratch root (7.0.0, moved from `.pharn/`,", "runtime scratch root (7.0.0 migration: moved from `.pharn/`,"]]);
ed(".claude/hooks/protect-trusted-paths.cjs", [["//   (Migration, 7.0.0: a root LIMITS.md", "//   (migration, 7.0.0: a root LIMITS.md"]]);
ed(".claude/hooks/enforce-writes-scope.test.cjs", [
  ["// The old ALWAYS glob (`.pharn/**`) sat OUTSIDE pharn/;", "// The migration: the old ALWAYS glob (`.pharn/**`) sat OUTSIDE pharn/;"],
  ['    [".pharn/notes.json", 0],', '    [".pharn/notes.json", 0], // migration: the old root'],
  ['test("★ 7.0.0 dev posture: the OLD .pharn/ is no longer always-writable', 'test("★ 7.0.0 dev posture (migration): the OLD .pharn/ is no longer always-writable'],
  ['  assert.equal(hook(cwd, ".pharn/notes.json").status, 2);', '  assert.equal(hook(cwd, ".pharn/notes.json").status, 2); // migration: the old root'],
]);
ed(".claude/hooks/protect-trusted-paths.test.cjs", [
  ['  "LIMITS.md",\n  "THREAT-MODEL.md",\n  "memory-bank/lessons-learned.md",\n  "pharn.spec-template.md",\n  ".pharn/writes-scope.json",\n',
   '  "LIMITS.md", // migration: the old root paths below are a user\'s own files since 7.0.0\n  "THREAT-MODEL.md", // migration\n  "memory-bank/lessons-learned.md", // migration\n  "pharn.spec-template.md", // migration\n  ".pharn/writes-scope.json", // migration\n'],
  ['  const OLD = ["THREAT-MODEL.md", "LIMITS.md", "memory-bank/lessons-learned.md", "pharn.spec-template.md", ".pharn/writes-scope.json"];',
   '  // migration: the pre-7.0.0 root paths\n  const OLD = ["THREAT-MODEL.md", "LIMITS.md", "memory-bank/lessons-learned.md", "pharn.spec-template.md", ".pharn/writes-scope.json"]; // migration'],
]);
ed(".claude/hooks/require-loop-record.test.cjs", [
  ['and ignores one left at the old .pharn/", () => {', 'and ignores one left at the old .pharn/ (migration)", () => {'],
  ['    const old = path.join(root, ".pharn", "pharn-loop", NAME);', '    const old = path.join(root, ".pharn", "pharn-loop", NAME); // migration: the pre-7.0.0 path'],
]);
ed(".claude/hooks/set-writes-scope.test.cjs", [['  assert.ok(!fs.existsSync(join(cwd, ".pharn")), "nothing is written at the OLD root");', '  assert.ok(!fs.existsSync(join(cwd, ".pharn")), "nothing is written at the OLD root"); // migration']]);
ed("pharn/floor/worktree-fingerprint.mjs", [["//   • UPGRADES. 7.0.0 moved ALGO to /3: the excluded state root moved from `.pharn/` to", "//   • UPGRADES. 7.0.0 moved ALGO to /3 (the migration): the excluded state root moved from `.pharn/` to"]]);
ed("pharn/floor/worktree-fingerprint.test.mjs", [['old fixture (`.gitignore` = ".pharn/")', 'old, pre-migration fixture (`.gitignore` = ".pharn/")']]);
ed("pharn/pharn-contracts/gate-run-record.md", [["because the excluded state root moved\n  from `.pharn/` to `pharn/.run/`.", "because the excluded state root moved (the\n  migration) from `.pharn/` to `pharn/.run/`."]]);
