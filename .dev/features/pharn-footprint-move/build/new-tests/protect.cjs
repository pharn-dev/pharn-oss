/* eslint-disable -- BUILD RECORD: the script that produced pharn-footprint-move, replayed against a scratch copy (see
   PLAN.md "Revision 3"); it is never run in this tree, and the new-tests/ files are fragments appended to the hook suites. */
// ============================== 7.0.0 — the protected paths moved under pharn/ (pharn-footprint-move) ===========
// The four moved members (two trusted docs, the scope file, the SPEC template) and the canon subtree, reached through
// a symlinked ALIAS of pharn/ — segment-wise resolution must judge the target, exactly as for the two docs that were
// always there (L73: an identity check, not a spelling check). One table, iterated (L29).
const MOVED_7 = [
  "pharn/THREAT-MODEL.md",
  "pharn/LIMITS.md",
  "pharn/.run/writes-scope.json",
  "pharn/spec-template.md",
  "pharn/memory-bank/lessons-learned.md",
  "pharn/memory-bank/pattern-library.md",
];

test("★ 7.0.0 every moved protected path is denied through a symlinked alias of pharn/", () => {
  const sb = sandbox(MOVED_7);
  fs.symlinkSync("pharn", join(sb, "alias"));
  for (const p of MOVED_7) {
    const viaAlias = "alias/" + p.slice("pharn/".length);
    assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: p } }).status, 2, p);
    assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: viaAlias } }).status, 2, viaAlias);
  }
  // control: an ordinary file behind the same alias is not protected
  assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: "alias/features/demo/SPEC.md" } }).status, 0);
});

test("★ 7.0.0 the OLD root paths are a user's own files in a sandbox too — present or absent, never denied", () => {
  const OLD = ["THREAT-MODEL.md", "LIMITS.md", "memory-bank/lessons-learned.md", "pharn.spec-template.md", ".pharn/writes-scope.json"];
  for (const present of [false, true]) {
    const sb = sandbox(present ? OLD : []);
    for (const p of OLD)
      assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: p } }).status, 0, `${p} (present: ${present})`);
  }
});
