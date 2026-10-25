// handfix-3b: fixtures that plant at pharn/.run need pharn/ to exist first (the scratch root gained a parent).
const fs = require("fs");
const MK = '  fs.mkdirSync(join(cwd, "pharn"), { recursive: true });\n';
function ed(f, pairs) {
  let s = fs.readFileSync(f, "utf8");
  for (const a of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${f}: ${n}x ${a.slice(0, 80)}`);
    s = s.replace(a, () => MK + a);
  }
  fs.writeFileSync(f, s);
  console.log("ok", f);
}
ed(".claude/hooks/enforce-writes-scope.test.cjs", [
  '  fs.writeFileSync(join(cwd, "pharn", ".run"), "planted");\n',
  '  fs.symlinkSync(join(cwd, "other-pharn"), join(cwd, "pharn", ".run"));\n',
]);
ed(".claude/hooks/set-writes-scope.test.cjs", ['  fs.writeFileSync(join(cwd, "pharn", ".run"), "not a directory\\n");\n']);
