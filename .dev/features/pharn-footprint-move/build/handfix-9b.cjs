// handfix-9b: the two left after round two.
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
ed("pharn/floor/apply-plan-deletions.test.mjs", [
  [
    '["bad-path", "- `.PHARN/writes-scope.json` (delete) — state root, upper case", "- `.PHARNX/writes-scope.json` (delete) — ordinary"],',
    '["bad-path", "- `PHARN/.RUN/writes-scope.json` (delete) — state root, upper case", "- `PHARN/.RUNX/writes-scope.json` (delete) — ordinary"],',
  ],
]);
ed("pharn/floor/seam-config-materialize.test.mjs", [
  [
    'const r = run(undefined, (dir) => writeFileSync(join(dir, "pharn", ".run"), "not a directory"));',
    'const r = run(undefined, (dir) => {\n    mkdirSync(join(dir, "pharn"), { recursive: true });\n    writeFileSync(join(dir, "pharn", ".run"), "not a directory");\n  });',
  ],
]);
