// handfix-2: every capability walker excludes the scratch root and the CLI's backup dir (PLAN revision 2, grill
// architecture P3). Five walkers, one test that iterates them all (L29).
const fs = require("fs");
function ed(f, pairs) {
  let s = fs.readFileSync(f, "utf8");
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${f}: ${n}x ${a.slice(0, 70)}`);
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(f, s);
  console.log("ok", f);
}
const WHY =
  "  // 7.0.0: the runtime scratch root and the CLI's backup dir, which holds full capability copies (pharn-cli 0.14 BACKUP_DIR).\n";
for (const f of ["pharn/floor/validate.mjs", ".dev/floor/capability-catalog-core.mjs"])
  ed(f, [
    [
      "  `${sep}pharn${sep}floor${sep}`,\n",
      "  `${sep}pharn${sep}floor${sep}`,\n" + WHY + "  `${sep}pharn${sep}.run${sep}`,\n  `${sep}pharn${sep}.backup${sep}`,\n",
    ],
  ]);
for (const f of ["pharn/floor/count-grillers.mjs", "pharn/floor/count-lenses.mjs", "pharn/floor/count-verifiers.mjs"])
  ed(f, [
    [
      "const EXCLUDE_SEGMENTS = [`${sep}.claude${sep}`, `${sep}.dev${sep}`, `${sep}node_modules${sep}`, `${sep}.git${sep}`];",
      "// 7.0.0: `pharn/.run/` (runtime scratch) and `pharn/.backup/` (the CLI's backup, full capability copies) too.\nconst EXCLUDE_SEGMENTS = [\n  `${sep}.claude${sep}`,\n  `${sep}.dev${sep}`,\n  `${sep}node_modules${sep}`,\n  `${sep}.git${sep}`,\n  `${sep}pharn${sep}.run${sep}`,\n  `${sep}pharn${sep}.backup${sep}`,\n];",
    ],
  ]);
const T = ".dev/floor/walker-exclusion.test.mjs";
let s = fs.readFileSync(T, "utf8");
const anchor = 'test("★ the enumeration is not silently empty", () => {';
if (s.split(anchor).length !== 2) throw new Error("anchor");
s = s.replace(
  anchor,
  () => `// 7.0.0 (pharn-footprint-move): the runtime scratch root moved under pharn/ (\`pharn/.run/\`), and pharn-cli 0.14
// keeps its backups at \`pharn/.backup/\` — FULL capability copies. Every walker must skip both, or a backup would
// double the rosters that dispatch /pharn-grill, /pharn-review and /pharn-verify. The negative control copies the
// same tree to a sibling the exclusion must NOT reach (\`pharn/.runx/\`), so the test can see a miss.
test("★ 7.0.0: every walker skips pharn/.run/ and pharn/.backup/ — and still counts a look-alike sibling", () => {
  for (const w of WALKERS) {
    withRepo((root) => {
      const base = w.count(root);
      for (const sub of ["pharn/.backup/20261025-000000", "pharn/.run/pharn-loop/x"]) {
        for (const mod of ["pharn-review", "pharn-pipeline", "pharn-core"]) {
          cpSync(join(root, "pharn", mod), join(root, sub, "pharn", mod), { recursive: true });
        }
      }
      assert.equal(w.count(root), base, \`\${w.id}: a capability copy under pharn/.run or pharn/.backup was counted\`);
      for (const mod of ["pharn-review", "pharn-pipeline", "pharn-core"]) {
        cpSync(join(root, "pharn", mod), join(root, "pharn", ".runx", "pharn", mod), { recursive: true });
      }
      // A walker that REFUSES the duplicate (the catalog throws on a repeated slug) has reached the copy too.
      let seen;
      try {
        seen = w.count(root) > base;
      } catch {
        seen = true;
      }
      assert.ok(seen, \`\${w.id}: the control copy under pharn/.runx/ was not counted — the probe is blind\`);
    });
  }
});

${anchor}`
);
fs.writeFileSync(T, s);
console.log("ok", T);
