
// ============================== 7.0.0 — the scratch root moved under pharn/ (pharn-footprint-move) ==============
// The old ALWAYS glob (`.pharn/**`) sat OUTSIDE pharn/; the new one (`pharn/.run/**`) sits INSIDE it, beside the
// trusted docs, canon and the floor. This is the regression the move could cause, so it is one table iterated over
// every posture (L29): ALWAYS must make NONE of these writable — nor any spelling that walks out of pharn/.run/.
const POSTURES_7 = [
  ["dev", (c) => seedDevRepo(c)],
  ["unsignalled", (c) => seedUnsignalled(c)],
  ["install-permissive", (c) => seedInstalledProject(c)],
  [
    "install-safeset",
    (c) => {
      seedInstalledProject(c);
      writeMarker(c, "pharn-ship", "demo");
      return c;
    },
  ],
  [
    "scoped-to-nothing",
    (c) => {
      seedDevRepo(c);
      setScope(c, ["src/unrelated.js"]);
      return c;
    },
  ],
];
const NOT_WRITABLE_7 = [
  "pharn/CONSTITUTION.md",
  "pharn/ARCHITECTURE.md",
  "pharn/THREAT-MODEL.md",
  "pharn/LIMITS.md",
  "pharn/spec-template.md",
  "pharn/memory-bank/lessons-learned.md",
  "pharn/memory-bank/x.md",
  "pharn/floor/x.mjs",
  "pharn/.run/../floor/x.mjs",
  "pharn/.run/../LIMITS.md",
  "pharn/.run/../../pharn/THREAT-MODEL.md",
  "pharn/.run/x/../../memory-bank/lessons-learned.md",
  "PHARN/.RUN/../floor/x.mjs",
  "pharn/.run/writes-scope.json",
];

for (const [posture, seed] of POSTURES_7) {
  test(`★ 7.0.0 ALWAYS (pharn/.run/**) widens nothing beyond itself — ${posture}`, () => {
    const cwd = seed(tmp());
    fs.mkdirSync(join(cwd, "pharn", "floor"), { recursive: true });
    for (const p of NOT_WRITABLE_7) assert.equal(hook(cwd, p).status, 2, `${posture}: ${p} must stay denied`);
    // non-vacuity: the scratch root itself IS writable in every posture, or the table proves nothing
    assert.equal(hook(cwd, "pharn/.run/pharn-x/notes.json").status, 0, `${posture}: pharn/.run/** must be writable`);
  });
}

test("★ 7.0.0 a symlinked pharn/.run that reaches pharn/floor carries no write there (judged at its target)", () => {
  for (const [posture, seed] of POSTURES_7) {
    const cwd = seed(tmp());
    fs.mkdirSync(join(cwd, "pharn", "floor"), { recursive: true });
    fs.rmSync(join(cwd, "pharn", ".run"), { recursive: true, force: true });
    fs.symlinkSync("floor", join(cwd, "pharn", ".run"));
    assert.equal(hook(cwd, "pharn/.run/x.mjs").status, 2, `${posture}: the write would land in pharn/floor/x.mjs`);
  }
});

test("★ 7.0.0 install posture outside a run: pharn/.run/ is exempt from the reserved surface AS WRITTEN, nothing beside it", () => {
  const cwd = seedInstalledProject(tmp());
  const cases = [
    ["pharn/.run/notes.json", 0],
    ["pharn/.run/pharn-ship/demo/x.json", 0],
    ["pharn/features/demo/SPEC.md", 0], // control: the older exemption is unchanged
    ["pharn/.runx/notes.json", 2],
    ["pharn/run/notes.json", 2],
    ["PHARN/.run/notes.json", 2], // B2: the exemption is matched as written, so a case variant stays reserved
    ["pharn/.run", 2], // the directory name alone is not under the exemption
    ["pharn/pharn-review/x.md", 2],
    // the OLD scratch root is a user's own path again (7.0.0): no longer ALWAYS, and not reserved
    [".pharn/notes.json", 0],
  ];
  for (const [p, want] of cases) assert.equal(hook(cwd, p).status, want, p);
});

test("★ 7.0.0 dev posture: the OLD .pharn/ is no longer always-writable — a write there needs a declared scope", () => {
  const cwd = seedDevRepo(tmp());
  assert.equal(hook(cwd, ".pharn/notes.json").status, 2);
  assert.equal(hook(cwd, "pharn/.run/notes.json").status, 0);
  setScope(cwd, [".pharn/ci.yml"]);
  assert.equal(hook(cwd, ".pharn/ci.yml").status, 0, "a declared path is writable, as any other");
});

test("★ 7.0.0 a symlink at EITHER segment of the scratch root makes the install posture deny-all (malformed scope)", () => {
  for (const at of [["pharn"], ["pharn", ".run"]]) {
    const cwd = seedInstalledProject(tmp());
    const other = join(cwd, "elsewhere");
    fs.mkdirSync(join(other, ".run"), { recursive: true });
    if (at.length === 2) fs.mkdirSync(join(cwd, "pharn"), { recursive: true });
    fs.symlinkSync(at.length === 1 ? other : join(other, ".run"), join(cwd, ...at));
    const r = hook(cwd, "src/app.js");
    assert.equal(r.status, 2, `a link at ${at.join("/")}: an ordinary write is denied`);
  }
});
