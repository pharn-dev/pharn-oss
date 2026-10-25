/* eslint-disable -- BUILD RECORD: the script that produced pharn-footprint-move, replayed against a scratch copy (see
   PLAN.md "Revision 3"); it is never run in this tree, and the new-tests/ files are fragments appended to the hook suites. */
// ============================== 7.0.0 — the loop state moved to pharn/.run/pharn-loop/ (pharn-footprint-move) ====
// A missed site here would make the Stop guard silently inert, so: the guard blocks on a marker at the NEW path, a
// marker left only at the OLD path does not count (the migration note says to finish or abandon runs first), and
// --open refuses a symlink at EITHER segment of the scratch root.
test("★ 7.0.0 the guard blocks on a marker at pharn/.run/pharn-loop/ and ignores one left at the old .pharn/", () => {
  withFixture({}, (root) => {
    assert.ok(isBlock(run(root)), "the new path is honoured");
  });
  withFixture({ marker: false }, (root) => {
    const old = path.join(root, ".pharn", "pharn-loop", NAME);
    fs.mkdirSync(old, { recursive: true });
    fs.writeFileSync(
      path.join(old, "active.json"),
      JSON.stringify({ schema: SCHEMA, name: NAME, session_id: SID, started_at: new Date(NOW - 60000).toISOString(), cap: 3 })
    );
    assert.equal(run(root), "", "a marker at the old root is never read");
  });
});

test("★ 7.0.0 --open refuses a symlink at EITHER segment of the scratch root, and writes nothing through it", () => {
  for (const at of [["pharn"], ["pharn", ".run"]]) {
    withFixture({ marker: false, featureDir: false }, (root) => {
      const elsewhere = fs.mkdtempSync(path.join(os.tmpdir(), "rlr-out-"));
      fs.mkdirSync(path.join(elsewhere, ".run"), { recursive: true });
      if (at.length === 2) fs.mkdirSync(path.join(root, "pharn"), { recursive: true });
      fs.symlinkSync(at.length === 1 ? elsewhere : path.join(elsewhere, ".run"), path.join(root, ...at));
      assert.equal(
        markerMode(["--open", NAME, "--cap", "3"], { root, env: { CLAUDE_CODE_SESSION_ID: SID }, stderr: quiet }),
        2,
        at.join("/")
      );
      assert.deepEqual(fs.readdirSync(path.join(elsewhere, ".run")), [], `${at.join("/")}: nothing written through the link`);
      fs.rmSync(elsewhere, { recursive: true, force: true });
    });
  }
});
