// pharn/floor/instruction-files-core.test.mjs — the pure rules of the instruction-files checker, over in-memory trees.
// Each test names the property it can falsify; the anti-gaming properties carry their own negative control (L60), and
// the mutation runs recorded in .dev/features/instruction-growth-gate/BUILD.md were made against exactly these tests.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EXIT,
  VERDICTS,
  NOTE_CODES,
  REASON_CODES,
  DEFAULT_GROWTH_BYTES,
  CATCH_ALL_PATTERNS,
  MAX_IMPORT_HOPS,
  shown,
  parseThreshold,
  classifyRule,
  parseImports,
  targetRel,
  resolvePath,
  computeSet,
  addedBytes,
  growth,
  reportBody,
} from "./instruction-files-core.mjs";

/** An in-memory tree: `files` maps a path to its text, `links` maps a path to its link text. */
/** An in-memory tree: `files` maps a path to its text, `links` a path to its link text, `subs` a submodule path to its
 *  commit; `canon` is the optional absolute-path canonicaliser. */
function tree(files = {}, links = {}, rootAbs = "/proj", subs = {}, canon = undefined) {
  const paths = [...Object.keys(files), ...Object.keys(links), ...Object.keys(subs)].sort();
  return {
    rootAbs,
    canon,
    list: () => paths,
    kind: (p) => (Object.hasOwn(subs, p) ? "submodule" : Object.hasOwn(links, p) ? "link" : Object.hasOwn(files, p) ? "file" : null),
    linkText: (p) => links[p],
    submoduleId: (p) => subs[p],
    read: (p) => Buffer.from(files[p], "latin1"),
  };
}
const set = (files, links) => computeSet(tree(files, links));
const keys = (s) => [...s.files.keys()].sort();
const codes = (s) => s.notes.map((n) => `${n.code}:${n.path}`).sort();
const B = (s) => Buffer.from(s, "latin1");

// ── closed sets ─────────────────────────────────────────────────────────────────────────────────────
test("closed sets are frozen, duplicate-free, and the exits are 0/1/2", () => {
  for (const s of [VERDICTS, NOTE_CODES, REASON_CODES, CATCH_ALL_PATTERNS]) {
    assert.ok(Object.isFrozen(s));
    assert.equal(new Set(s).size, s.length);
  }
  assert.deepEqual({ ...EXIT }, { ok: 0, over: 1, inconclusive: 2 });
  assert.ok(REASON_CODES.includes("crashed"));
  assert.equal(DEFAULT_GROWTH_BYTES, 2048);
});

test("shown never throws, even on a value whose String() throws (L62) — with the control", () => {
  const hostile = JSON.parse('{"toString":1}');
  assert.throws(() => String(hostile), TypeError, "control: String() really throws on this value");
  assert.equal(typeof shown(hostile), "string");
  assert.equal(typeof shown(10n), "string"); // JSON.stringify throws on a BigInt
  assert.equal(shown(undefined), "[object Undefined]");
  assert.ok(shown("x".repeat(500)).endsWith("…"));
});

// ── the threshold ───────────────────────────────────────────────────────────────────────────────────
test("parseThreshold: absent file / budget / key → the default; a valid value is read; malformed is refused", () => {
  assert.deepEqual(parseThreshold(null), { ok: true, value: 2048, source: "default" });
  assert.deepEqual(parseThreshold("{}"), { ok: true, value: 2048, source: "default" });
  assert.deepEqual(parseThreshold('{"budget":{}}'), { ok: true, value: 2048, source: "default" });
  assert.deepEqual(parseThreshold('{"budget":{"instructionGrowthBytes":0}}'), { ok: true, value: 0, source: "config" });
  assert.deepEqual(parseThreshold('{"budget":{"instructionGrowthBytes":9000}}'), { ok: true, value: 9000, source: "config" });
  for (const bad of [
    "not json",
    "[]",
    "null",
    '{"budget":3}',
    '{"budget":[]}',
    '{"budget":{"instructionGrowthBytes":-1}}',
    '{"budget":{"instructionGrowthBytes":1.5}}',
    '{"budget":{"instructionGrowthBytes":"2048"}}',
    '{"budget":{"instructionGrowthBytes":1e300}}',
    '{"budget":{"instructionGrowthBytes":{"toString":1}}}',
  ]) {
    const r = parseThreshold(bad);
    assert.equal(r.ok, false, bad);
    assert.equal(r.reason_code, "threshold-malformed", bad);
    assert.equal(typeof r.reason, "string");
  }
  // An inherited key is not a budget (own-property test, L15).
  assert.deepEqual(parseThreshold('{"__proto__":{"budget":{"instructionGrowthBytes":1}}}'), { ok: true, value: 2048, source: "default" });
});

// ── rule frontmatter ────────────────────────────────────────────────────────────────────────────────
test("classifyRule: no frontmatter, globs only, paths, catch-alls, empty paths — each decided", () => {
  assert.deepEqual(classifyRule("# rule\n"), { loaded: true, notes: [] });
  assert.deepEqual(classifyRule('---\ndescription: x\nglobs: "src/**/*.ts"\n---\nbody\n'), { loaded: true, notes: ["globs-not-read"] });
  assert.deepEqual(classifyRule('---\npaths:\n  - "src/**/*.ts"\n---\nbody\n'), { loaded: false, notes: [] });
  assert.deepEqual(classifyRule('---\npaths: "src/**/*.ts, lib/*.ts"\n---\n'), { loaded: false, notes: [] });
  assert.deepEqual(classifyRule('---\npaths: ["src/**/*.ts", "lib/*.ts"]\n---\n'), { loaded: false, notes: [] });
  assert.deepEqual(classifyRule("---\npaths: src/a.ts\n---\n"), { loaded: false, notes: [] });
  for (const p of CATCH_ALL_PATTERNS) {
    assert.deepEqual(classifyRule(`---\npaths:\n  - "${p}"\n---\n`), { loaded: true, notes: ["paths-catch-all"] }, p);
    assert.deepEqual(classifyRule(`---\npaths: ["src/*.ts", "${p}"]\n---\n`), { loaded: true, notes: ["paths-catch-all"] }, p);
  }
  assert.deepEqual(classifyRule("---\npaths:\n---\n"), { loaded: true, notes: ["paths-empty"] });
  assert.deepEqual(classifyRule("---\npaths: []\n---\n"), { loaded: true, notes: ["paths-empty"] });
  assert.deepEqual(classifyRule('---\npaths:\n  - ""\nother: 1\n---\n'), { loaded: true, notes: ["paths-empty"] });
});

test("classifyRule: CRLF and a BOM read the same as LF", () => {
  assert.deepEqual(classifyRule('---\r\npaths:\r\n  - "src/**"\r\n---\r\nbody\r\n'), { loaded: false, notes: [] });
  assert.deepEqual(classifyRule('﻿---\npaths:\n  - "src/**"\n---\n'), { loaded: false, notes: [] });
});

test("classifyRule: YAML the line reader cannot vouch for is `frontmatter-unparsed` — always loaded", () => {
  const unparsed = { loaded: true, notes: ["frontmatter-unparsed"] };
  // The Cursor shape: an unquoted `**/*.ts` is a YAML alias — Claude Code drops the frontmatter, so `paths` scopes nothing.
  assert.deepEqual(classifyRule('---\nglobs: **/*.ts\npaths:\n  - "src/**"\n---\n'), unparsed);
  assert.deepEqual(classifyRule("---\npaths:\n  - **/*.ts\n---\n"), unparsed);
  assert.deepEqual(classifyRule('---\npaths: ["a"]\npaths: ["b"]\n---\n'), unparsed, "a duplicated key");
  assert.deepEqual(classifyRule('---\npaths:\n\t- "src/**"\n---\n'), unparsed, "a tab indentation");
  assert.deepEqual(classifyRule('---\nnot a yaml line\npaths: ["src/**"]\n---\n'), unparsed, "an unrecognised line");
  assert.deepEqual(classifyRule("---\npaths: [unterminated\n---\n"), unparsed, "a flow list that does not close");
  assert.deepEqual(classifyRule('---\nmeta:\n  tag: &a x\npaths: ["src/**"]\n---\n'), unparsed, "an anchor in a nested value");
  // Valid shapes stay readable: comments, nested maps, folded continuations.
  assert.deepEqual(classifyRule('---\n# c\nmeta:\n  k: v\ndescription: a long\n  folded line\npaths:\n  # c\n  - "src/**"\n---\n'), {
    loaded: false,
    notes: [],
  });
});

// ── imports ─────────────────────────────────────────────────────────────────────────────────────────
test("parseImports: documented syntax — spaces escaped, quotes not imported, code spans and fences skipped", () => {
  assert.deepEqual(parseImports("See @README for x and @package.json.\n- git @docs/git.md\n"), ["README", "package.json.", "docs/git.md"]);
  assert.deepEqual(parseImports("@Design\\ Docs/api.md\n"), ["Design Docs/api.md"]);
  assert.deepEqual(parseImports("@\"quoted.md\" and @'q.md'\n"), []);
  assert.deepEqual(parseImports("inline `@code.md` and ``@x.md``\n"), []);
  assert.deepEqual(parseImports("```\n@fenced.md\n```\n@after.md\n"), ["after.md"]);
  assert.deepEqual(parseImports("~~~~\n@a.md\n~~~\n@b.md\n~~~~\n@c.md\n"), ["c.md"], "a shorter closing fence does not close");
  assert.deepEqual(parseImports("mail me at someone@example.com\n"), [], "an @ after a non-space is not an import (ASSUMED)");
  assert.deepEqual(parseImports("a\r\n@b.md\r\n"), ["b.md"]);
});

test("targetRel: relative, absolute under the root, `~`, and escapes", () => {
  assert.equal(targetRel("", "a/b.md", "/proj"), "a/b.md");
  assert.equal(targetRel("docs", "../x.md", "/proj"), "x.md");
  assert.equal(targetRel("", "../x.md", "/proj"), null);
  assert.equal(targetRel("", "/proj/x.md", "/proj"), "x.md");
  assert.equal(targetRel("", "/proj", "/proj"), "");
  assert.equal(targetRel("", "/elsewhere/x.md", "/proj"), null);
  assert.equal(targetRel("", "/proj/x.md", ""), null);
  assert.equal(targetRel("", "~/.claude/x.md", "/proj"), null);
  assert.equal(targetRel("a", ".", "/proj"), "a");
  assert.equal(targetRel("", "", "/proj"), null);
});

// ── the set ─────────────────────────────────────────────────────────────────────────────────────────
test("no instruction files: an empty set WITH the `no-instruction-files` note (L34 — looked, found nothing)", () => {
  const s = set({ "src/a.js": "x" });
  assert.equal(s.files.size, 0);
  assert.deepEqual(codes(s), ["no-instruction-files:"]);
});

test("root files: CLAUDE.md and .claude/CLAUDE.md; AGENTS.md only when neither exists", () => {
  assert.deepEqual(keys(set({ "CLAUDE.md": "a", ".claude/CLAUDE.md": "b", "AGENTS.md": "c" })), [".claude/CLAUDE.md", "CLAUDE.md"]);
  assert.deepEqual(keys(set({ "AGENTS.md": "c", ".claude/AGENTS.md": "d" })), [".claude/AGENTS.md", "AGENTS.md"]);
  const s = set({ "AGENTS.md": "c" });
  assert.equal(s.files.get("AGENTS.md").via, "agents");
  assert.deepEqual(keys(set({ "sub/CLAUDE.md": "nested", "CLAUDE.local.md": "personal" })), [], "nested and personal are not in the set");
});

test("rules: no paths / globs / catch-all / nested subdir counted; paths-scoped left out and listed", () => {
  const s = set({
    ".claude/rules/plain.md": "plain",
    ".claude/rules/glob.md": '---\nglobs: "src/**"\n---\nG',
    ".claude/rules/all.md": '---\npaths:\n  - "**"\n---\nA',
    ".claude/rules/scoped.md": '---\npaths:\n  - "src/**"\n---\nS',
    ".claude/rules/deep/nested/x.md": "nested",
    ".claude/rules/notes.txt": "not markdown",
  });
  assert.deepEqual(keys(s), [".claude/rules/all.md", ".claude/rules/deep/nested/x.md", ".claude/rules/glob.md", ".claude/rules/plain.md"]);
  assert.deepEqual(s.scoped, [".claude/rules/scoped.md"]);
  assert.deepEqual(codes(s), ["globs-not-read:.claude/rules/glob.md", "paths-catch-all:.claude/rules/all.md"]);
});

test("imports: a chain is counted, a cycle is noted once, a missing target is noted (never fatal), outside-root is noted", () => {
  const s = set({
    "CLAUDE.md": "top @a.md @missing.md @../out.md @~/home.md @/elsewhere/x.md @docs",
    "a.md": "@b/c.md",
    "b/c.md": "@../a.md @../CLAUDE.md",
    "docs/x.md": "d",
  });
  assert.deepEqual(keys(s), ["CLAUDE.md", "a.md", "b/c.md"]);
  assert.equal(s.files.get("b/c.md").via, "import");
  assert.deepEqual(codes(s), [
    "import-cycle:b/c.md",
    "import-cycle:b/c.md",
    "import-missing:CLAUDE.md",
    "import-not-a-file:CLAUDE.md",
    "outside-root:CLAUDE.md",
    "outside-root:CLAUDE.md",
    "outside-root:CLAUDE.md",
  ]);
});

test(`imports: depth cap — ${MAX_IMPORT_HOPS} hops are counted, the next is noted and not counted`, () => {
  const files = { "CLAUDE.md": "@h1.md" };
  for (let i = 1; i <= MAX_IMPORT_HOPS + 1; i++) files[`h${i}.md`] = `@h${i + 1}.md`;
  const s = set(files);
  assert.deepEqual(keys(s), ["CLAUDE.md", ...Array.from({ length: MAX_IMPORT_HOPS }, (_, i) => `h${i + 1}.md`)].sort());
  assert.ok(codes(s).includes(`import-depth-exceeded:h${MAX_IMPORT_HOPS}.md`));
});

test("imports from rules are followed too (ASSUMED, the over-count side)", () => {
  // Relative to the importing file's own directory, as documented.
  assert.deepEqual(keys(set({ ".claude/rules/r.md": "@../../docs/conv.md", "docs/conv.md": "c" })), [".claude/rules/r.md", "docs/conv.md"]);
  assert.deepEqual(codes(set({ ".claude/rules/r.md": "@docs/conv.md", "docs/conv.md": "c" })), ["import-missing:.claude/rules/r.md"]);
});

test("symlink kinds (L59): file link and dir link followed in-root; dangling, looping and out-of-root links noted", () => {
  const s = set(
    { "shared/one.md": "one", "shared/deep/two.md": "two", "real.md": "real" },
    {
      "CLAUDE.md": "real.md",
      ".claude/rules/file.md": "../../real.md",
      ".claude/rules/dir": "../../shared",
      ".claude/rules/dangling.md": "../../nope.md",
      ".claude/rules/loop.md": "loop2.md",
      ".claude/rules/loop2.md": "loop.md",
      ".claude/rules/out.md": "/etc/passwd",
      ".claude/rules/outdir": "../../../elsewhere",
    }
  );
  assert.deepEqual(keys(s), ["CLAUDE.md", ".claude/rules/dir/deep/two.md", ".claude/rules/dir/one.md", ".claude/rules/file.md"].sort());
  assert.equal(s.files.get("CLAUDE.md").bytes, 4);
  const c = codes(s);
  for (const want of [
    "link-loop:.claude/rules/loop.md",
    "link-loop:.claude/rules/loop2.md",
    "outside-root:.claude/rules/out.md",
    "outside-root:.claude/rules/outdir",
  ]) {
    assert.ok(c.includes(want), `${want} in ${c}`);
  }
  assert.ok(!keys(s).includes(".claude/rules/dangling.md"), "a dangling link is not counted");
});

test("a rules directory link that loops back onto itself is noted once, never walked forever", () => {
  const s = set({ ".claude/rules/a.md": "A" }, { ".claude/rules/self": "." });
  assert.deepEqual(keys(s), [".claude/rules/a.md"]);
  assert.deepEqual(codes(s), ["link-loop:.claude/rules/self"]);
});

test("the rules directory itself as a link: in-root followed, out-of-root noted", () => {
  assert.deepEqual(keys(set({ "conf/r.md": "R" }, { ".claude/rules": "../conf" })), [".claude/rules/r.md"]);
  const out = set({}, { ".claude/rules": "/elsewhere" });
  assert.deepEqual(codes(out), ["no-instruction-files:", "outside-root:.claude/rules"]);
});

// ── added bytes ─────────────────────────────────────────────────────────────────────────────────────
test("addedBytes: appended lines count with their newline; a pure deletion adds 0", () => {
  assert.equal(addedBytes(B("a\nb\n"), B("a\nb\nccc\n")), 4);
  assert.equal(addedBytes(B("a\nb\nccc\n"), B("a\n")), 0);
  assert.equal(addedBytes(B("a\n"), B("a\nno-newline")), 10);
  assert.equal(addedBytes(B(""), B("")), 0);
  assert.equal(addedBytes(B("a\r\n"), B("a\r\nb\r\n")), 3, "CRLF bytes are counted as written");
  assert.equal(addedBytes(B(""), Buffer.from("é\n", "utf8")), 3, "bytes, not characters");
});

test("★ ANTI-GAMING — removals never offset additions: adds N and removes M > N still reports N (control: net would be ≤ 0)", () => {
  const removed = Array.from({ length: 100 }, (_, i) => `old line ${i} with some filler text`).join("\n") + "\n";
  const base = B(`keep\n${removed}`);
  const head = B("keep\nnew one\nnew two\n");
  const n = addedBytes(base, head);
  assert.equal(n, "new one\nnew two\n".length);
  assert.ok(head.length - base.length < 0, "control: the NET change is negative, so a net measure would read 0");
});

test("★ MULTISET, not a set — a copy of an existing line counts; a line moved within the file is free", () => {
  assert.equal(addedBytes(B("dup\nx\n"), B("dup\nx\ndup\n")), 4, "a second copy of an existing line is added bytes");
  assert.equal(addedBytes(B("a\nb\nc\n"), B("c\na\nb\n")), 0, "a reorder adds nothing");
});

test("growth: a file new to the set counts whole; one in both counts its added lines; listing is sorted", () => {
  const base = set({ "CLAUDE.md": "one\n", ".claude/rules/r.md": '---\npaths:\n  - "src/**"\n---\nR\n' });
  const head = set({ "CLAUDE.md": "one\ntwo\n", ".claude/rules/r.md": "---\nglobs: x\n---\nR\n", ".claude/rules/new.md": "N\n" });
  const g = growth(base, head);
  assert.deepEqual(g.files, [
    { path: ".claude/rules/new.md", added_bytes: 2, entered_set: true },
    { path: ".claude/rules/r.md", added_bytes: head.files.get(".claude/rules/r.md").bytes, entered_set: true },
    { path: "CLAUDE.md", added_bytes: 4, entered_set: false },
  ]);
  assert.equal(g.added_bytes, 2 + head.files.get(".claude/rules/r.md").bytes + 4);
});

test("growth: a rule that gains a catch-all counts whole; an unchanged set adds 0 and lists nothing", () => {
  const scoped = '---\npaths:\n  - "src/**"\n---\nbody line\n';
  const all = '---\npaths:\n  - "**"\n---\nbody line\n';
  const g = growth(set({ ".claude/rules/r.md": scoped }), set({ ".claude/rules/r.md": all }));
  assert.equal(g.added_bytes, Buffer.byteLength(all));
  const same = set({ "CLAUDE.md": "x\n" });
  assert.deepEqual(growth(same, set({ "CLAUDE.md": "x\n" })), { added_bytes: 0, files: [], unmeasured: [] });
});

test("reportBody: totals, the bytes/4 estimate labelled as such, scoped rules and notes carried", () => {
  const s = set({
    "CLAUDE.md": "12345678",
    ".claude/rules/s.md": '---\npaths: ["a"]\n---\n',
    ".claude/rules/g.md": "---\nglobs: x\n---\nG",
  });
  const r = reportBody(s);
  assert.equal(r.total_bytes, 8 + s.files.get(".claude/rules/g.md").bytes);
  assert.equal(r.estimated_tokens, Math.ceil(r.total_bytes / 4));
  assert.match(r.estimate_basis, /estimate/);
  assert.deepEqual(r.path_scoped, [".claude/rules/s.md"]);
  assert.deepEqual(
    r.files.map((f) => f.path),
    [".claude/rules/g.md", "CLAUDE.md"]
  );
  assert.deepEqual(r.notes, [{ code: "globs-not-read", path: ".claude/rules/g.md" }]);
});

// ── GATE 2 review fixes, each enumerated over its input kinds (L67) ───────────────────────────────────────────────
test("GATE 2 — a `paths` value that is not a string or a list of strings loads always (`paths-unrecognised`); strings stay scoped", () => {
  const unrecognised = { loaded: true, notes: ["paths-unrecognised"] };
  for (const v of ["~", "null", "Null", "NULL", "true", "False", "0", "1.5", "-3", "0x1f", ".inf", "{}", "{a: b}", "|", ">-"]) {
    assert.deepEqual(classifyRule(`---\npaths: ${v}\n---\n`), unrecognised, `paths: ${v}`);
  }
  for (const item of ["~", "null", "0", "true", "{a: b}", "[x]"]) {
    assert.deepEqual(classifyRule(`---\npaths:\n  - ${item}\n---\n`), unrecognised, `- ${item}`);
    assert.deepEqual(classifyRule(`---\npaths: ["src/**", ${item}]\n---\n`), unrecognised, `[…, ${item}]`);
  }
  assert.deepEqual(classifyRule("---\npaths: |\n  **\n---\n"), unrecognised, "a block scalar holding a catch-all");
  // Controls: the same characters QUOTED are strings, and a plain glob is a pattern.
  for (const v of ['"null"', "'0'", '"~"', "src/null/**", "docs/0/**"]) {
    assert.deepEqual(classifyRule(`---\npaths: ${v}\n---\n`), { loaded: false, notes: [] }, `paths: ${v}`);
  }
});

test("GATE 2 — the fixed names match case-insensitively (`case-variant`), on the root files, AGENTS.md and the rules directory", () => {
  for (const name of ["claude.md", "Claude.MD", ".claude/claude.md"]) {
    const s = set({ [name]: "x\n" });
    const want = name.startsWith(".claude") ? ".claude/CLAUDE.md" : "CLAUDE.md";
    assert.deepEqual(keys(s), [want], name);
    assert.deepEqual(codes(s), [`case-variant:${want}`], name);
  }
  assert.deepEqual(keys(set({ "agents.md": "a\n" })), ["AGENTS.md"]);
  const r = set({ ".Claude/Rules/a.md": "A\n", ".claude/rules/upper.MD": "B\n" });
  assert.deepEqual(
    keys(r).sort(),
    [".claude/rules/upper.MD"],
    "an exact `.claude/rules` wins; a differently-cased directory beside it is not walked"
  );
  assert.deepEqual(keys(set({ ".Claude/Rules/a.md": "A\n" })), [".claude/rules/a.md"]);
  assert.deepEqual(keys(set({ ".claude/rules/x.MD": "X\n" })), [".claude/rules/x.MD"], "a rule's `.md` matches in any case");
  // Control: the exact spelling carries no note.
  assert.deepEqual(codes(set({ "CLAUDE.md": "x\n" })), []);
});

test("GATE 2 — a submodule on the way to a member is not read: noted, its commit compared; a moved one is unmeasured", () => {
  const sub = (id) => computeSet(tree({ "CLAUDE.md": "@vendor/x.md\n" }, {}, "/proj", { ".claude/rules": id, vendor: id }));
  const base = sub("a".repeat(40));
  assert.deepEqual(codes(base), ["submodule-not-read:.claude/rules", "submodule-not-read:CLAUDE.md"]);
  assert.deepEqual(growth(base, sub("a".repeat(40))).unmeasured, [], "control: the same commits measure as unchanged");
  assert.deepEqual(growth(base, sub("b".repeat(40))).unmeasured, [".claude/rules", "vendor"]);
  const fresh = computeSet(tree({}, {}, "/proj", { ".claude/rules": "c".repeat(40) }));
  assert.deepEqual(growth(computeSet(tree({})), fresh).unmeasured, [".claude/rules"], "a submodule new to the set is unmeasured");
  const nested = computeSet(tree({ "CLAUDE.md": "x\n" }, {}, "/proj", { ".claude": "d".repeat(40) }));
  assert.deepEqual(codes(nested), ["submodule-not-read:.claude/CLAUDE.md", "submodule-not-read:.claude/rules"]);
});

test("GATE 2 — an absolute link spelled through an alias of the root resolves in-root through `canon`; without it, outside", () => {
  const canon = (t) => t.replace(/^\/tmp\//, "/private/tmp/");
  const files = { "docs/rules/r.md": "R\n" };
  const links = { ".claude/rules": "/tmp/proj/docs/rules" };
  assert.deepEqual(keys(computeSet(tree(files, links, "/private/tmp/proj", {}, canon))), [".claude/rules/r.md"]);
  assert.deepEqual(
    codes(computeSet(tree(files, links, "/private/tmp/proj"))),
    ["no-instruction-files:", "outside-root:.claude/rules"],
    "control"
  );
  assert.equal(targetRel("", "/tmp/proj/a.md", "/private/tmp/proj", canon), "a.md");
  assert.equal(targetRel("", "/elsewhere/a.md", "/private/tmp/proj", canon), null);
});

test("✧ every note code the module emits is a NOTE_CODES member (L36 closure over the source)", async () => {
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("./instruction-files-core.mjs", import.meta.url), "utf8");
  const emitted = new Set([...src.matchAll(/note\(\s*"([a-z-]+)"/g)].map((m) => m[1]));
  for (const m of src.matchAll(/notes: \["([a-z-]+)"\]/g)) emitted.add(m[1]);
  assert.ok(emitted.size >= 8, `the scan found ${emitted.size} codes — the regex must still match the source`);
  for (const c of emitted) assert.ok(NOTE_CODES.includes(c), `${c} is emitted but not in NOTE_CODES`);
  assert.ok(resolvePath(tree({}), "").state === "dir");
});
