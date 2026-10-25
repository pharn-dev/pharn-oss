/* eslint-disable -- BUILD RECORD: the script that produced pharn-footprint-move, replayed against a scratch copy (see
   PLAN.md "Revision 3"); it is never run in this tree, and the new-tests/ files are fragments appended to the hook suites. */
// handfix-9: the full-suite fallout, second round.
//  (A) GENERIC, floor test files only: the scratch root gained a parent, so a fixture that creates `pharn/.run`
//      non-recursively, or plants a file/link AT `pharn/.run`, needs `pharn/` first.
//  (B) expectations the move shifted: sort order, moved case variants, a mutant anchor, the README badge, the
//      .gitignore form, a walk that now records the `pharn` segment too.
//  (C) worktree-fingerprint: what is hashed changed (the excluded state root moved), so ALGO bumps to /3 per the
//      module's own rule, with a golden digest recomputed independently (it reproduces /2 from the old fixture).
const fs = require("fs");
const path = require("path");
function once(s, a, b, f) {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(`${f}: ${n}x ${a.slice(0, 90)}`);
  return s.replace(a, () => b);
}
function ed(f, pairs) {
  let s = fs.readFileSync(f, "utf8");
  for (const [a, b] of pairs) s = once(s, a, b, f);
  fs.writeFileSync(f, s);
  console.log("ok", f);
}

// ── (A) ──
const testFiles = [
  ...fs.readdirSync("pharn/floor").map((f) => `pharn/floor/${f}`),
  ...fs.readdirSync(".dev/floor").map((f) => `.dev/floor/${f}`),
].filter((f) => /\.test\.mjs$/.test(f));
const V = "([\\w.]+)";
const NONREC = new RegExp(`mkdirSync\\(join\\(${V}, "pharn", "\\.run"\\)\\)`, "g");
const AT_WRITE = new RegExp(`^( *)(fs\\.)?writeFileSync\\(join\\(${V}, "pharn", "\\.run"\\), `, "gm");
const AT_LINK = new RegExp(`^( *)(fs\\.)?symlinkSync\\(([^;]*?), join\\(${V}, "pharn", "\\.run"\\)\\);`, "gm");
let changedA = 0;
for (const f of testFiles) {
  let s = fs.readFileSync(f, "utf8");
  const before = s;
  s = s.replace(NONREC, (m, v) => `mkdirSync(join(${v}, "pharn", ".run"), { recursive: true })`);
  const mk = (ind, fsp, v) => `${ind}${fsp || ""}mkdirSync(join(${v}, "pharn"), { recursive: true });\n`;
  s = s.replace(AT_WRITE, (m, ind, fsp, v) => mk(ind, fsp, v) + m);
  s = s.replace(AT_LINK, (m, ind, fsp, src, v) => mk(ind, fsp, v) + m);
  if (s !== before) {
    if (!/\bmkdirSync\b[^\n]*from "node:fs"|import \{[^}]*\bmkdirSync\b[^}]*\} from "node:fs"/.test(s) && !/\bfs\.mkdirSync/.test(s))
      throw new Error(`${f}: needs mkdirSync imported`);
    fs.writeFileSync(f, s);
    changedA++;
    console.log("ok (A)", f);
  }
}
if (changedA === 0) throw new Error("(A) changed nothing");

// ── (B) ──
ed("README.md", [["img.shields.io/badge/pharn-6.75.0-blue", "img.shields.io/badge/pharn-7.0.0-blue"]]);
ed("pharn/floor/apply-plan-deletions.test.mjs", [
  [
    '["control-path", "- `limits.md` (delete) — case-folded", "- `limits.txt` (delete) — ordinary"],',
    '["control-path", "- `pharn/limits.md` (delete) — case-folded", "- `pharn/limits.txt` (delete) — ordinary"],',
  ],
  ['["LIMITſ.md", "pharn/LIMITS.md", "control-path"],', '["pharn/LIMITſ.md", "pharn/LIMITS.md", "control-path"],'],
  ["spelling-only refusal let `LIMITſ.md` delete pharn/LIMITS.md.", "spelling-only refusal let `pharn/LIMITſ.md` delete pharn/LIMITS.md."],
  ["(there `LIMITſ.md` simply names another file)", "(there `pharn/LIMITſ.md` simply names another file)"],
]);
ed("pharn/floor/check-bash-reconcile.test.mjs", [
  [
    'assert.deepEqual([...r.json.merged].sort(), ["pharn/LIMITS.md", "dep.json", "pharn/floor/new.mjs"]);',
    'assert.deepEqual([...r.json.merged].sort(), ["dep.json", "pharn/LIMITS.md", "pharn/floor/new.mjs"]);',
  ],
]);
ed("pharn/floor/check-regress.test.mjs", [
  [
    'assert.deepEqual(json(r).escape_exempt.sort(), ["pharn/THREAT-MODEL.md", "pharn/ARCHITECTURE.md"]);',
    'assert.deepEqual(json(r).escape_exempt.sort(), ["pharn/ARCHITECTURE.md", "pharn/THREAT-MODEL.md"]);',
  ],
]);
ed("pharn/floor/check-instruction-files.test.mjs", [
  [
    `test("--growth --base-rule: a dirty tree measures against HEAD; a clean tree against merge-base origin/main; neither → base-unresolved", () => {
  withRepo({ "CLAUDE.md": "a\\n" }, (fx) => {`,
    `test("--growth --base-rule: a dirty tree measures against HEAD; a clean tree against merge-base origin/main; neither → base-unresolved", () => {
  // A tracked file under pharn/, as every install has (7.0.0: the state root lives there). Without one, git reports the
  // untracked scratch as \`?? pharn/\` and the tree reads dirty — the bound stage-regress.mjs and instruction-files.mjs state.
  withRepo({ "CLAUDE.md": "a\\n", "pharn/keep.md": "k\\n" }, (fx) => {`,
  ],
]);
for (const f of ["pharn/floor/instruction-files.mjs", "pharn/floor/stage-regress.mjs"]) {
  const s = fs.readFileSync(f, "utf8");
  const anchor = f.endsWith("instruction-files.mjs")
    ? "/** Dirty = any porcelain path outside the project's `pharn/.run/` state root."
    : "// only for an install that does not ignore it (GRILL G2's own scenario).";
  const note = f.endsWith("instruction-files.mjs")
    ? "/** BOUND (7.0.0): when `pharn/` holds no tracked file, git reports an untracked scratch root as `pharn/` itself, which\n *  reads dirty — the safe direction (HEAD as the base). Every install tracks files under `pharn/`. */\n"
    : "// BOUND (7.0.0): when `pharn/` holds no tracked file, git reports an untracked scratch root as `pharn/` itself, which\n// reads dirty — the same safe direction. Every install tracks files under `pharn/`.\n";
  const t = f.endsWith("instruction-files.mjs") ? once(s, anchor, note + anchor, f) : once(s, anchor, anchor + "\n" + note.trimEnd(), f);
  fs.writeFileSync(f, t);
  console.log("ok", f);
}
ed("pharn/floor/reconcile-baseline.test.mjs", [
  ["assert.match(gi, /^pharn\\/\\.run\\/\\*$/m,", "assert.match(gi, /^pharn\\/\\.run\\/\\*?$/m,"],
]);
ed("pharn/floor/check-spec.test.mjs", [
  [
    `    name: "a case variant PHARN.SPEC-TEMPLATE.MD sits at the root (same verdict on every filesystem)",
    code: "name-case",
    setup: (root) => writeFileSync(join(root, "PHARN.SPEC-TEMPLATE.MD"), DEFAULT_TEXT),`,
    `    name: "a case variant pharn/SPEC-TEMPLATE.MD sits where the template belongs (same verdict on every filesystem)",
    code: "name-case",
    setup: (root) => {
      mkdirSync(join(root, "pharn"), { recursive: true });
      writeFileSync(join(root, "pharn", "SPEC-TEMPLATE.MD"), DEFAULT_TEXT);
    },`,
  ],
  [
    `    coreEdit: ['join("..", "..", "pharn/spec-template.md")', 'join("..", "..", "..", "pharn/spec-template.md")'],`,
    `    coreEdit: ['join("..", "..", "pharn", "spec-template.md")', 'join("..", "..", "..", "pharn", "spec-template.md")'],`,
  ],
]);
ed("pharn/floor/stage-work.test.mjs", [
  [
    `    assert.deepEqual(raced, [join(root, "pharn", ".run"), join(root, "pharn", ".run", "cost"), join(root, "pharn", ".run", "cost", "feat")]);`,
    `    assert.deepEqual(raced, [
      join(root, "pharn"), // 7.0.0: the state root's parent is a component of the chain too
      join(root, "pharn", ".run"),
      join(root, "pharn", ".run", "cost"),
      join(root, "pharn", ".run", "cost", "feat"),
    ]);`,
  ],
]);

// ── (C) ──
ed("pharn/floor/worktree-fingerprint.mjs", [
  [`export const ALGO = "worktree-fingerprint/2+sha256";`, `export const ALGO = "worktree-fingerprint/3+sha256";`],
  [
    "//   • UPGRADES, and why ALGO moved to /2 in 6.20.8.",
    "//   • UPGRADES. 7.0.0 moved ALGO to /3: the excluded state root moved from `.pharn/` to `pharn/.run/`, which changes\n//     what is hashed on any tree holding either path untracked and not ignored. Same consumers, same cost as below.\n//   • Why ALGO moved to /2 in 6.20.8.",
  ],
]);
ed("pharn/floor/worktree-fingerprint.test.mjs", [
  [
    `  "worktree-fingerprint/2+sha256": "95c9ef03cb8a321936a6cbd47b23acf8d83a73bad2decc1e416f0cc5ec2a6e22",\n`,
    `  "worktree-fingerprint/2+sha256": "95c9ef03cb8a321936a6cbd47b23acf8d83a73bad2decc1e416f0cc5ec2a6e22",
  // 7.0.0 (pharn-footprint-move): recomputed by hand from the same composition; the recomputation reproduces the /2 value
  // above from the old fixture (\`.gitignore\` = ".pharn/"), and gives this one for the fixture as it now stands.
  "worktree-fingerprint/3+sha256": "2f45eea8fcac334ba0e43f049e36ac21057a493e5b2637470462219e3af3f687",\n`,
  ],
]);
ed("pharn/pharn-contracts/gate-run-record.md", [
  [
    "- **`fingerprint.algo` moved to `worktree-fingerprint/2+sha256` in 6.20.8.**",
    "- **`fingerprint.algo` moved to `worktree-fingerprint/3+sha256` in 7.0.0**, because the excluded state root moved\n  from `.pharn/` to `pharn/.run/`. A stamp recorded under `/2` reads as a moved tree: one re-run, the fail-closed\n  direction.\n- **`fingerprint.algo` moved to `worktree-fingerprint/2+sha256` in 6.20.8.**",
  ],
]);
