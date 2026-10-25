// handfix-mb.cjs — the R3q (quoted "memory-bank") sites, each decided by hand (PLAN revision 2).
// Moves: the PRODUCT canon default and every test that exercises it. Stays: concept tags (`concepts: ["memory-bank"]`),
// `.dev/memory-bank` segments, and canon-root's arbitrary-directory normalization example.
const fs = require("fs");
function ed(f, pairs) {
  let s = fs.readFileSync(f, "utf8");
  for (const [a, b, all] of pairs) {
    const n = typeof a === "string" ? s.split(a).length - 1 : (s.match(a) || []).length;
    if (n === 0 || (n > 1 && !all)) throw new Error(`${f}: ${n}x ${String(a).slice(0, 70)}`);
    s = typeof a === "string" ? (all ? s.split(a).join(b) : s.replace(a, () => b)) : s.replace(a, b);
  }
  fs.writeFileSync(f, s);
  console.log("ok", f);
}
// a product canon segment inside a join(): `, "memory-bank"` not preceded by ".dev"
const JOIN_MB = /(\bjoin\([^;\n]*?)(?<!"\.dev"|"pharn"), "memory-bank"/g;
function joinMb(f) {
  let s = fs.readFileSync(f, "utf8");
  let n = 0;
  for (;;) {
    const t = s.replace(JOIN_MB, (m, call) => (n++, `${call}, "pharn", "memory-bank"`));
    if (t === s) break;
    s = t;
  }
  if (n === 0) throw new Error(`${f}: no join("memory-bank") site`);
  fs.writeFileSync(f, s);
  console.log(`ok ${f} (${n} join sites)`);
}

ed(".claude/hooks/protect-trusted-paths.cjs", [
  [`const PROTECTED_SUBTREES = ["memory-bank", ".dev/memory-bank"];`, `const PROTECTED_SUBTREES = ["pharn/memory-bank", ".dev/memory-bank"];`],
  [
    "// Canon subtrees as folded prefixes WITH the trailing slash, so `memory-banked/x.md` cannot match\n// `memory-bank`.",
    "// Canon subtrees as folded prefixes WITH the trailing slash, so `pharn/memory-banked/x.md` cannot match\n// `pharn/memory-bank`.",
  ],
]);
for (const f of [
  ".claude/hooks/protect-trusted-paths.test.cjs",
  ".claude/hooks/set-writes-scope.test.cjs",
  "pharn/floor/check-lessons-index.test.mjs",
  "pharn/floor/check-provenance.test.mjs",
])
  joinMb(f);
ed("pharn/floor/check-lessons-index.test.mjs", [
  [`mkdirSync(join(dir, "pharn", "memory-bank"));`, `mkdirSync(join(dir, "pharn", "memory-bank"), { recursive: true });`, true],
]);
ed("pharn/floor/check-provenance.test.mjs", [
  [`"./memory-bank/lessons-learned.md"`, `"./pharn/memory-bank/lessons-learned.md"`],
  [`foo/memory-bank/`, `foo/pharn/memory-bank/`, true],
]);
ed("pharn/floor/canon-root.mjs", [
  ["THE DEFAULT is `memory-bank`", "THE DEFAULT is `pharn/memory-bank`"],
  ["so `./memory-bank/` and `memory-bank`", "so `./pharn/memory-bank/` and `pharn/memory-bank`"],
  [`export const DEFAULT_CANON_ROOT = "memory-bank";`, `export const DEFAULT_CANON_ROOT = "pharn/memory-bank";`],
]);
ed("pharn/floor/canon-root.test.mjs", [
  [`test("the default root is the user's memory-bank", () => {
  assert.equal(DEFAULT_CANON_ROOT, "memory-bank");`, `test("the default root is the user's pharn/memory-bank (7.0.0)", () => {
  assert.equal(DEFAULT_CANON_ROOT, "pharn/memory-bank");`],
  [`root: "memory-bank", rest: [".", "--verdict"]`, `root: "pharn/memory-bank", rest: [".", "--verdict"]`],
  [`  ["memory-bank", "memory-bank"],\n`, `  ["memory-bank", "memory-bank"],\n  ["pharn/memory-bank", "pharn/memory-bank"],\n  ["./pharn/memory-bank/", "pharn/memory-bank"],\n`],
]);
ed("pharn/floor/check-provenance.mjs", [["default `memory-bank`", "default `pharn/memory-bank`", true]]);
ed("pharn/floor/lessons-index-core.mjs", [["the user's `memory-bank`", "the user's `pharn/memory-bank`"]]);
ed(".dev/guides/floor-checks.md", [["default `memory-bank`", "default `pharn/memory-bank`"]]);
ed(".dev/guides/lessons.md", [["default `memory-bank`", "default `pharn/memory-bank`"]]);
