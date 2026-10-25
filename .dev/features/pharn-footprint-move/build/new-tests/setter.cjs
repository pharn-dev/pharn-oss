
// ============================== 7.0.0 — the scope file moved to pharn/.run/ (pharn-footprint-move) ==============
// The CONTROL_SURFACE ↔ DEFAULT_PROTECTED parity pin covers only the `.claude/`-prefixed members, so it cannot see a
// scope-file path the setter and the enforcer disagree on. These two tests can: one behavioural (the enforcer honours
// what the setter wrote, and --clear removes exactly that file), one a ✧ pin over the three copies of the path (L31).
test("★ 7.0.0 the setter writes exactly the file the enforcer reads — set, honoured, cleared", () => {
  const cwd = seedDevRepo(tmp());
  assert.equal(enforce(cwd, "src/legit.ts").status, 2, "control: no scope, so the dev default-safe-set denies src/");
  const r = setter(cwd, "--from-plan", planWith(cwd, "src/legit.ts"));
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(join(cwd, "pharn", ".run", "writes-scope.json")), "the record is at pharn/.run/");
  assert.ok(!fs.existsSync(join(cwd, ".pharn")), "nothing is written at the OLD root");
  assert.equal(enforce(cwd, "src/legit.ts").status, 0, "the enforcer reads the record the setter wrote");
  assert.equal(enforce(cwd, "src/other.ts").status, 2, "and only that scope");
  assert.equal(setter(cwd, "--clear").status, 0);
  assert.ok(!fs.existsSync(join(cwd, "pharn", ".run", "writes-scope.json")));
  assert.equal(enforce(cwd, "src/legit.ts").status, 2, "after --clear the default applies again");
});

test("✧ 7.0.0 PIN: the scope-file path is the same in the setter, the enforcer and the protect list (L31)", () => {
  const read = (f) => fs.readFileSync(join(__dirname, f), "utf8");
  assert.match(read("enforce-writes-scope.cjs"), /^const SCOPE_FILE = "pharn\/\.run\/writes-scope\.json";$/m);
  assert.match(read("protect-trusted-paths.cjs"), /^ {2}"pharn\/\.run\/writes-scope\.json",$/m);
  const setterSrc = read("set-writes-scope.cjs");
  assert.match(setterSrc, /path\.resolve\(process\.cwd\(\), "pharn", "\.run", "writes-scope\.json"\)/, "--clear");
  assert.match(setterSrc, /path\.resolve\(process\.cwd\(\), "pharn", "\.run"\);\n.*\n.*"writes-scope\.json"/, "the write");
});

test("★ 7.0.0 promotion origin: a symlink at EITHER segment of the scratch root keeps the refusal standing", () => {
  for (const seg of ["pharn", "pharn/.run"]) {
    const cwd = promoteTree();
    const elsewhere = fs.mkdtempSync(join(os.tmpdir(), "pharn-sws-out-"));
    fs.mkdirSync(join(elsewhere, ".run", "pharn-loop"), { recursive: true });
    if (seg === "pharn/.run") fs.mkdirSync(join(cwd, "pharn"), { recursive: true });
    fs.symlinkSync(seg === "pharn" ? elsewhere : join(elsewhere, ".run"), join(cwd, ...seg.split("/")));
    const r = promote(cwd);
    assert.equal(r.status, 1, `${seg}: ${r.stderr}`);
    assert.match(r.stderr, new RegExp(`${seg.replace(/[./]/g, "\\$&")} \\(a symbolic link\\)`));
    fs.rmSync(elsewhere, { recursive: true, force: true });
  }
});
