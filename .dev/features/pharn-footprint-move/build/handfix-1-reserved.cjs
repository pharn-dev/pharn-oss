// handfix-1: isReserved() exempts the scratch root `pharn/.run/` as WRITTEN, beside `pharn/features/` (PLAN, "Correcting
// the record"). Both copies change together; the setter's ✧ PIN test holds them byte-equal (L31).
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
const OLD = `  if (key.startsWith("pharn/") && !rel.startsWith("pharn/features/")) return true;`;
const NEW = `  if (key.startsWith("pharn/") && !rel.startsWith("pharn/features/") && !rel.startsWith("pharn/.run/")) return true;`;
ed(".claude/hooks/enforce-writes-scope.cjs", [
  [OLD, NEW],
  [
    `// RESERVED iff the folded key equals \`pharn.config.json\`, or starts with \`.claude/\`, or starts with \`pharn/\`
// while the UNFOLDED path does not start with \`pharn/features/\`. B2 (GATE-2 review):`,
    `// RESERVED iff the folded key equals \`pharn.config.json\`, or starts with \`.claude/\`, or starts with \`pharn/\`
// while the UNFOLDED path starts with neither \`pharn/features/\` nor \`pharn/.run/\`. The second exception is the
// runtime scratch root (7.0.0, moved from \`.pharn/\`, which sat outside \`pharn/\` and was never reserved): without it
// the move would deny, outside a run, every scratch write the old root allowed. Its one guarded file,
// \`pharn/.run/writes-scope.json\`, is denied before this test is reached. B2 (GATE-2 review):`,
  ],
]);
ed(".claude/hooks/set-writes-scope.cjs", [[OLD, NEW]]);
