// handfix-5: floor tests for the `pharn` segment the 7.0.0 walks gained (PLAN, the hand-fix table) — a link at
// `pharn`, above the state root, is refused by every walk that now checks it.
const fs = require("fs");
function ed(f, pairs) {
  let s = fs.readFileSync(f, "utf8");
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${f}: ${n}x ${a.slice(0, 80)}`);
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(f, s);
  console.log("ok", f);
}
function append(f, text) {
  fs.appendFileSync(f, text);
  console.log("ok (appended)", f);
}

// run-marker: the existing ANY-component table gains `pharn` itself, and its pharn/.run case creates pharn/ first
ed("pharn/floor/run-marker.test.mjs", [
  [
    `  // pharn/.run itself is a symlink
  const dir1 = tmp();
  const realDir = tmp();
  symlinkSync(realDir, join(dir1, "pharn", ".run"));`,
    `  // pharn itself is a symlink (7.0.0: the scratch root sits under pharn/, so both segments are walked)
  const realDir = tmp();
  const dir0 = tmp();
  symlinkSync(realDir, join(dir0, "pharn"));
  assert.equal(openRun({ root: dir0, command: "pharn-ship", name: "demo" }).ok, false);
  assert.equal(closeRun({ root: dir0, command: "pharn-ship", name: "demo" }).ok, false, "close refuses the same alias");

  // pharn/.run itself is a symlink
  const dir1 = tmp();
  mkdirSync(join(dir1, "pharn"), { recursive: true });
  symlinkSync(realDir, join(dir1, "pharn", ".run"));`,
  ],
]);

// stage-agent: the PATH_KINDS component table gains `pharn`
ed("pharn/floor/stage-agent.test.mjs", [
  [
    `const components = [["pharn", ".run"], ["pharn", ".run", "pharn-ship"], ["pharn", ".run", "pharn-ship", "demo"]];`,
    `const components = [["pharn"], ["pharn", ".run"], ["pharn", ".run", "pharn-ship"], ["pharn", ".run", "pharn-ship", "demo"]];`,
  ],
  [`  assert.equal(cases, 12);\n});`, `  assert.equal(cases, 16);\n});`],
]);

// run-gates: --out and the reuse source both walk from AT the state root, so a link at `pharn` is checked first
append(
  "pharn/floor/run-gates.test.mjs",
  `
import { existsSync as existsRG7, mkdirSync as mkdirRG7, renameSync as renameRG7, symlinkSync as symlinkRG7 } from "node:fs";

// 7.0.0 (pharn-footprint-move): the state root is pharn/.run, so its PARENT can be a link. A walk that starts AT the
// state root lstats the root itself, and that lstat follows a link at \`pharn\` unseen — stateRootLinkFree() closes it.
test("CONTAINMENT (7.0.0): a symlink at \`pharn\`, the state root's parent, is refused as path-containment", () => {
  withRepo(
    (dir) => {
      assert.equal(cli(dir, initArgs()).code, 0, "non-vacuity: the ordinary layout is accepted");
      const real = join(dir, "pharn-real");
      if (existsRG7(join(dir, "pharn"))) renameRG7(join(dir, "pharn"), real);
      else mkdirRG7(real, { recursive: true });
      symlinkRG7(real, join(dir, "pharn"));
      const r = cli(dir, initArgs());
      assert.equal(r.code, 2, "accepted a state root reached through a link at pharn");
      assert.equal(r.json.reason_code, "path-containment");
    },
    { scripts: { test: "true" } }
  );
});
`
);

// build-gate: the same, through containmentWalk from the project root down to the state root
append(
  "pharn/floor/build-gate.test.mjs",
  `
import { renameSync as renameBG7 } from "node:fs";

test("UNUSABLE (7.0.0) — a symlink at \`pharn\`, above the state root, is refused as path-containment; nothing runs", () => {
  withProject({}, (dir) => {
    const real = join(dir, "pharn-real");
    if (existsSync(join(dir, "pharn"))) renameBG7(join(dir, "pharn"), real);
    else mkdirSync(real, { recursive: true });
    symlinkSync(real, join(dir, "pharn"));
    const r = full(dir);
    assert.equal(r.status, EXIT.unusable, r.stdout);
    assert.match(r.stdout, /path-containment: pharn\\/\\.run .*symlink/);
  });
});
`
);

// stage-direct: the lock's component list gained \`pharn\`
append(
  "pharn/floor/stage-direct.test.mjs",
  `
import { renameSync as renameSD7 } from "node:fs";

test("runDirect (7.0.0) — a link at \`pharn\`, above the lock's state root, refuses \`lock-unusable\`; nothing runs", () => {
  const root = scratchRoot();
  try {
    const real = join(root, "pharn-real");
    if (existsSync(join(root, "pharn"))) renameSD7(join(root, "pharn"), real);
    else mkdirSync(real, { recursive: true });
    symlinkSync(real, join(root, "pharn"));
    const r = direct(root, fresh("pharn-verify"));
    assert.deepEqual([r.exit, r.out], [2, ""]);
    assert.match(r.err.join("\\n"), /^refused \\(lock-unusable\\) — pharn is not a directory/);
    assert.equal(existsSync(join(root, ".ran")), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
`
);
