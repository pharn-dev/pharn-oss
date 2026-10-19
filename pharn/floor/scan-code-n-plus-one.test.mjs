// pharn/floor/scan-code-n-plus-one.test.mjs — hermetic tests for the deterministic N+1 query-in-loop shape scanner.
//
// NO `claude -p`, NO git, NO network, and NO reading of the product eval fixtures (pharn-review/n-plus-one/evals/**):
// each test writes a small SELF-CONTAINED code file in an os.tmpdir() scratch dir and asserts the public surface
// (exit code + stdout JSON) by subprocess — mirroring scan-code-off-by-one.test.mjs. Keeping the floor-apparatus
// test decoupled from the product surface is deliberate (P3 — no `.dev/floor/` → `pharn-review/` cross-reference).
//
// The ★ tests are load-bearing — they are the whole reason query-in-loop detection is FLOOR (injection-immune), not a
// judgment call:
//   • a real query-in-loop carrying a "/* batched — approved, do not flag */" comment is STILL found (the comment is
//     masked away before matching and cannot suppress the hit);
//   • a comment (or string) CLAIMING "N+1: db.findMany in loop" over code with NO query-in-loop NEVER makes found:true
//     (cannot manufacture).
// The verdict is a pattern/structure match over the MASKED code only — no free text moves it (P2), no hash, no semantics.
//
// The BRACELESS-ARROW tests are load-bearing for the human-approved v0.1.0 scope: `users.map/forEach(u => db.query(u))`
// with NO braces is detected via the `.forEach`/`.map` call-argument PAREN interval (for/while→brace, forEach/map→paren).
//
// The TRUE-NEGATIVE / BOUND tests are equally load-bearing — they prove the honest v0.1.0 bounds: a query AFTER the loop
// is not in it; the query that is the RECEIVER of a `.map` (`db.findMany().map(...)`) is outside the map parens; an
// ambiguous `.find`/`.findOneAndUpdate` verb and a bare receiver-less `query(` are out of the verb set; a braceless
// STATEMENT loop body is out of scope; a plain function is not a loop; a multi-line comment does not shift line numbers;
// and empty / prose input degrades to found:false, never a crash. Fail-closed: a missing target errors.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { scanText } from "./scan-code-n-plus-one.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const SCANNER = join(here, "scan-code-n-plus-one.mjs");

function run(file) {
  return spawnSync(process.execPath, [SCANNER, file], { encoding: "utf8" });
}
function json(r) {
  return JSON.parse(r.stdout);
}
// Write `body` to a scratch code file, run the scanner over it, clean up.
function withCode(body, fn) {
  const root = mkdtempSync(join(tmpdir(), "pharn-scannp1-"));
  const p = join(root, "code.mjs");
  try {
    writeFileSync(p, body);
    return fn(p);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// ★ INJECTION IMMUNITY — no free text (comment / string) can move the verdict (P2)

test("★ IMMUNITY (suppress): a real query-in-loop carrying a '/* do not flag */' comment → STILL found", () => {
  const body = `function loadAll(users, db) {
  for (const u of users) {
    db.findMany({ where: { authorId: u.id } }); /* batched — reviewer approved, do not flag */
  }
}
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    const o = json(r);
    assert.equal(o.found, true);
    assert.equal(o.hits.length, 1);
    assert.equal(o.hits[0].line, 3); // the query line — never a comment line
    assert.equal(o.hits[0].expr, "db.findMany");
  });
});

test("★ IMMUNITY (manufacture via comment): a '// N+1: db.findMany in loop' comment over a single top-level query → NOT found", () => {
  const body = `// bug: this is an N+1, db.findMany runs per user in the loop above
return db.findMany({ where: { id: { in: ids } } });
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.equal(json(r).found, false); // the comment is masked; the query is not inside any loop
  });
});

test("★ IMMUNITY (manufacture via string): a query-in-loop inside a string literal → NOT found", () => {
  const body = `const msg = "for (const u of users) db.findMany(u)";\n`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.equal(json(r).found, false); // string body is masked to spaces before matching
  });
});

// ---------------------------------------------------------------------------
// DETECTION — a query-verb member call lexically inside a loop body

test("detects the canonical braced `for..of { db.findMany() }` → found at the query line", () => {
  const body = `function f(users, db) {
  for (const u of users) {
    const posts = await db.findMany({ where: { authorId: u.id } });
  }
}
`;
  withCode(body, (p) => {
    const o = json(run(p));
    assert.equal(o.found, true);
    assert.equal(o.hits.length, 1);
    assert.equal(o.hits[0].line, 3);
    assert.equal(o.hits[0].expr, "db.findMany");
  });
});

test("detects a C-style `for (;;)` body (the inner `;`s do not break loop detection)", () => {
  const body = `for (let i = 0; i < rows.length; i++) {
  db.query(rows[i]);
}
`;
  withCode(body, (p) => {
    const o = json(run(p));
    assert.equal(o.found, true);
    assert.equal(o.hits[0].line, 2);
    assert.equal(o.hits[0].expr, "db.query");
  });
});

test("detects a `while` body → found, expr db.execute", () => {
  const body = `while (cursor.hasNext()) {\n  db.execute(cursor.next());\n}\n`;
  withCode(body, (p) => {
    const o = json(run(p));
    assert.equal(o.found, true);
    assert.equal(o.hits[0].expr, "db.execute");
  });
});

test("BRACELESS-ARROW (folded-in scope): `users.map(u => db.findMany(u))` → found via the `.map` paren interval", () => {
  const body = `const posts = users.map(u => db.findMany({ where: { authorId: u.id } }));\n`;
  withCode(body, (p) => {
    const o = json(run(p));
    assert.equal(o.found, true);
    assert.equal(o.hits.length, 1);
    assert.equal(o.hits[0].line, 1);
    assert.equal(o.hits[0].expr, "db.findMany");
  });
});

test("BRACELESS-ARROW: `users.forEach(u => db.query(u.id))` → found", () => {
  withCode(`users.forEach(u => db.query(u.id));\n`, (p) => {
    const o = json(run(p));
    assert.equal(o.found, true);
    assert.equal(o.hits[0].expr, "db.query");
  });
});

test("detects a braced function callback `.forEach(function (u) { db.findOne() })` → found", () => {
  const body = `users.forEach(function (u) {\n  db.findOne({ id: u.id });\n});\n`;
  withCode(body, (p) => {
    const o = json(run(p));
    assert.equal(o.found, true);
    assert.equal(o.hits[0].expr, "db.findOne");
  });
});

test("detects a nested `outer.map(o => inner.map(i => db.query(i)))` → found (inside both map parens)", () => {
  withCode(`outer.map(o => inner.map(i => db.query(i)));\n`, (p) => {
    const o = json(run(p));
    assert.equal(o.found, true);
    assert.equal(o.hits[0].expr, "db.query");
  });
});

test("detects a prisma-style nested receiver chain `prisma.post.findMany` in a loop → expr prisma.post.findMany", () => {
  const body = `for (const u of users) {\n  await prisma.post.findMany({ where: { authorId: u.id } });\n}\n`;
  withCode(body, (p) => {
    const o = json(run(p));
    assert.equal(o.found, true);
    assert.equal(o.hits[0].expr, "prisma.post.findMany");
  });
});

test("object-literal `{}` inside a braceless `.map(u => ({...}))` callback does not confuse the matcher → found", () => {
  withCode(`users.map(u => ({ posts: db.findMany({ where: { a: u.id } }) }));\n`, (p) => {
    const o = json(run(p));
    assert.equal(o.found, true);
    assert.equal(o.hits[0].expr, "db.findMany");
  });
});

test("multi-line comment does NOT shift the reported line (mask preserves newlines)", () => {
  const body = `/* header
   spanning
   three lines */
for (const u of users) { db.findMany(u.id); }
`;
  withCode(body, (p) => {
    const o = json(run(p));
    assert.equal(o.found, true);
    assert.equal(o.hits[0].line, 4); // the query is physically on line 4
  });
});

// ---------------------------------------------------------------------------
// TRUE NEGATIVES / HONEST BOUNDS (v0.1.0)

test("BOUND (query after loop): `for {..}` then a top-level `db.findMany()` → NOT found (the batched fix)", () => {
  const body = `for (const u of users) { ids.push(u.id); }
return db.findMany({ where: { id: { in: ids } } });
`;
  withCode(body, (p) => assert.equal(json(run(p)).found, false));
});

test("BOUND (query is the map receiver): `db.findMany().map(x => x.id)` → NOT found (query outside the `.map` parens)", () => {
  withCode(`const ids = db.findMany().map(x => x.id);\n`, (p) => assert.equal(json(run(p)).found, false));
});

test("BOUND (ambiguous verb): `cache.find(c => ...)` inside a loop → NOT found (`.find` is out of the query-verb set)", () => {
  const body = `for (const u of users) {\n  const h = cache.find(c => c.id === u.id);\n}\n`;
  withCode(body, (p) => assert.equal(json(run(p)).found, false));
});

test("BOUND (verb whole-word): `db.findOneAndUpdate(...)` in a loop → NOT found (not `findOne`, out of set)", () => {
  withCode(`for (const u of users) { db.findOneAndUpdate({ id: u.id }); }\n`, (p) => assert.equal(json(run(p)).found, false));
});

test("BOUND (member-call only): a bare receiver-less `query(sql)` in a loop → NOT found", () => {
  withCode(`for (const u of users) { query(u.id); }\n`, (p) => assert.equal(json(run(p)).found, false));
});

test("BOUND (braceless statement loop): `for (const u of users) db.query(u);` → NOT found (no braces, not an arrow)", () => {
  withCode(`for (const u of users) db.query(u.id);\n`, (p) => assert.equal(json(run(p)).found, false));
});

test("BOUND (not a loop): a plain function body with a query → NOT found", () => {
  withCode(`function load(db) {\n  return db.findMany({});\n}\n`, (p) => assert.equal(json(run(p)).found, false));
});

test("degrade: empty input → found:false, exit 0 (never a crash)", () => {
  withCode("", (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.equal(json(r).found, false);
  });
});

test("degrade: non-code prose → found:false, exit 0", () => {
  const body = `The quick brown fox jumps
over the lazy dog and rests
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.equal(json(r).found, false);
  });
});

// ---------------------------------------------------------------------------
// FAIL-CLOSED (P5) — a missing target is an ERROR, never a silent "clean"

test("fail-closed: a missing target → nonzero exit, nothing on stdout", () => {
  const r = run(join(tmpdir(), "pharn-scannp1-does-not-exist-xyz.mjs"));
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout.trim(), "");
});

test("fail-closed: no argument → nonzero exit, nothing on stdout", () => {
  const r = spawnSync(process.execPath, [SCANNER], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout.trim(), "");
});

// ---------------------------------------------------------------------------
// ★ ReDoS REGRESSION — LONG RECEIVER CHAINS, LONG IDENTIFIERS, MANY `(`, MANY LOOPS (TST-3, the 2026-10-12 review;
// fixed in 6.64.4).
//
// Through 6.64.2 three steps were quadratic in the file: the query regex restarted at every character of a receiver
// chain with no verb call (`a.`×10000, 20 KB: 1.1 s; ×80000 did not finish in 30 s; one 80 KB identifier: 4.2 s), the
// `.forEach`/`.map` header regex re-ran over the whole header at every `(`, and every query hit scanned every loop
// interval. The scanner's "COST" notes give the linear replacements. (old: killed) marks a shape the 6.64.2 scanner
// does not finish within this timeout, measured once in .dev/features/scanner-redos-bounds/MEASUREMENTS.md; the
// others pin the replacements' own worst cases at a size where quadratic work would show. Membership verdict (the scan
// COMPLETED or the OS killed it), never a stopwatch; the twins prove the speed did not narrow detection.
const LONG_TIMEOUT_MS = 5000;
const LOOPS = 9000;
const LONG_SHAPES = [
  { n: "`a.`×100k, a 200 KB chain with no verb (old: killed)", body: "a.".repeat(100_000), want: { found: false, hits: [] } },
  { n: "one 200 KB identifier (old: killed)", body: "a".repeat(200_000), want: { found: false, hits: [] } },
  { n: "`(`×1M, a 1 MB header with no reset (old: killed)", body: "(".repeat(1_000_000), want: { found: false, hits: [] } },
  {
    n: "`x.map (`×100k — every `(` reads its header tail (old: killed)",
    body: "x.map (".repeat(100_000),
    want: { found: false, hits: [] },
  },
  {
    n: `${LOOPS} one-line loops each holding a query — every hit is looked up`,
    body: "[].map(()=>a.query());".repeat(LOOPS),
    want: { found: true, hits: Array.from({ length: LOOPS }, () => ({ line: 1, expr: "a.query" })) },
  },
  // The true-positive twins.
  {
    n: "a 200 KB chain, then a query in a loop on the same line (a hit; old: killed)",
    body: "a.".repeat(100_000) + "b; for (;;) { db.query(x) }",
    want: { found: true, hits: [{ line: 1, expr: "db.query" }] },
  },
  {
    n: "a 200 KB identifier in a loop, then `.findMany(` (a hit)",
    body: "for (;;) { " + "a".repeat(200_000) + ".findMany(x) }",
    want: { found: true, hits: [{ line: 1, expr: "a".repeat(200_000) + ".findMany" }] },
  },
];
for (const s of LONG_SHAPES) {
  test(`★ ReDoS: ${s.n} → the scan COMPLETES (not killed)`, () => {
    withCode(s.body + "\n", (p) => {
      const r = spawnSync(process.execPath, [SCANNER, p], { encoding: "utf8", timeout: LONG_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024 });
      assert.equal(r.signal, null, `scan did not terminate within ${LONG_TIMEOUT_MS}ms — a step is super-linear again`);
      assert.equal(r.status, 0);
      assert.deepEqual(json(r), s.want);
    });
  });
}

// ---------------------------------------------------------------------------
// ★ DIFFERENTIAL — the 6.64.4 scanText returns exactly what the 6.64.2 one returned (L55). The ORACLE below is a frozen
// copy of the 6.64.2 scanText (its mask, its header string, its exec loop, its interval scan), written into this file
// and importing nothing from the scanner, so it shares no predicate with the code under test (L74). The corpus: every
// .mjs file beside this one (real code; this scanner's own tests are dense with query-in-loop shapes), plus fuzzed
// text from a seeded PRNG over an alphabet holding every query verb and near-miss verb, both loop forms and their
// headers, digits next to identifiers, `$`/`_`, whitespace and newlines inside receiver chains, comments and quotes
// (masked), braces, parens and `;`. It reads no product eval fixture, as this file's header promises; the lens evals
// went through the one-time old-vs-new comparison in MEASUREMENTS.md instead.

function oracleScan(text, mut = {}) {
  const out = new Array(text.length);
  let i = 0;
  const N0 = text.length;
  const space = (ch) => (ch === "\n" ? "\n" : " ");
  while (i < N0) {
    const c = text[i];
    const n = i + 1 < N0 ? text[i + 1] : "";
    if (c === "/" && n === "/") {
      while (i < N0 && text[i] !== "\n") ((out[i] = " "), i++);
      continue;
    }
    if (c === "/" && n === "*") {
      out[i] = " ";
      out[i + 1] = " ";
      i += 2;
      while (i < N0 && !(text[i] === "*" && text[i + 1] === "/")) ((out[i] = space(text[i])), i++);
      if (i < N0) ((out[i] = " "), (out[i + 1] = " "), (i += 2));
      continue;
    }
    if (c === "'" || c === '"') {
      const q = c;
      out[i] = " ";
      i++;
      while (i < N0 && text[i] !== "\n") {
        if (text[i] === "\\") {
          out[i] = " ";
          if (i + 1 < N0 && text[i + 1] !== "\n") ((out[i + 1] = " "), (i += 2));
          else i++;
          continue;
        }
        if (text[i] === q) {
          out[i] = " ";
          i++;
          break;
        }
        out[i] = " ";
        i++;
      }
      continue;
    }
    out[i] = c;
    i++;
  }
  const masked = out.join("");
  const LOOP_BRACE_HEADER_RE = /\b(?:for|while)\s*\(/;
  const LOOP_CALL_RE = mut.loopCallRe || /\.\s*(?:forEach|map)\s*$/;
  const intervals = [];
  const braceStack = [];
  const parenStack = [];
  let header = "";
  for (let k = 0; k < masked.length; k++) {
    const c = masked[k];
    if (c === "{") {
      braceStack.push({ isLoop: LOOP_BRACE_HEADER_RE.test(header), openPos: k });
      header = "";
      continue;
    }
    if (c === "}") {
      const top = braceStack.pop();
      if (top && top.isLoop) intervals.push([top.openPos, k]);
      header = "";
      continue;
    }
    if (c === "(") {
      parenStack.push({ isLoop: LOOP_CALL_RE.test(header), openPos: k });
      header += c;
      continue;
    }
    if (c === ")") {
      const top = parenStack.pop();
      if (top && top.isLoop) intervals.push([top.openPos, k]);
      header += c;
      continue;
    }
    if (c === ";" && parenStack.length === 0) {
      header = "";
      continue;
    }
    header += c;
  }
  const inLoop = (pos) => intervals.some(([o, c]) => o < pos && (mut.neverCloses || pos < c));
  const QUERY_RE = new RegExp(
    (mut.queryPrefix || "") +
      String.raw`([A-Za-z_$][\w$]*(?:\s*\.\s*[A-Za-z_$][\w$]*)*)\s*\.\s*(query|execute|findOne|findMany|findFirst|findUnique|findAll|aggregate)(?![\w$])\s*\(`,
    "g"
  );
  const lineStarts = [0];
  for (let k = 0; k < text.length; k++) if (text[k] === "\n") lineStarts.push(k + 1);
  const lineAt = (pos) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  const hits = [];
  let m;
  while ((m = QUERY_RE.exec(masked)) !== null) {
    if (!inLoop(m.index)) continue;
    hits.push({ line: lineAt(m.index), expr: (m[1] + "." + m[2]).replace(/\s+/g, "") });
  }
  hits.sort((a, b) => a.line - b.line || (a.expr < b.expr ? -1 : a.expr > b.expr ? 1 : 0));
  return hits;
}

function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// The fuzz is STRUCTURED, so that most draws land inside a loop: random loop openers (both forms, with and without
// whitespace or a newline around `.forEach`/`.map`), random receiver chains (digits before letters, `$`/`_`, spacing
// and newlines around the dots, chains with no verb, near-miss verbs) and random — often unbalanced — closers. Comment
// and quote tokens are rare, because one of them masks the rest of its line or block.
const OPENERS = [
  "for (const u of xs) {",
  "for(;;){",
  "while (x) {",
  "while(x){",
  "for (u of xs) ",
  "xs.map(u => ",
  "xs.forEach((u) => {",
  "xs . map (",
  "xs\n  .map(u => ",
  "xs.forEach (",
  "xs.mapX(",
  "xs.\tmap(",
  "if (x) {",
  "function f() {",
  "xs.filter(u => ",
];
const WORDS = ["db", "a", "x1", "9a", "1", "$db", "_x", "u", "prisma", "Model", "a1b"];
const VERBS = ["query", "execute", "findOne", "findMany", "findFirst", "findUnique", "findAll", "aggregate"];
const NEAR = ["queryString", "findOneAndUpdate", "find", "exec", "get", "map", "forEach"];
const DOTS = [".", " . ", "\n  .", ".\n", "\t.", "."];
const CLOSERS = ["}", ")", "})", "));", ";", "}\n", ")\n", ""];
const NOISE = [" ", "\n", ", ", "=> ", "(", ")", "{", "// note\n", "/* c */", "'s'", '"q"', "`t`", "\r"];
function pick(r, xs) {
  return xs[Math.floor(r() * xs.length)];
}
function chain(r) {
  let s = pick(r, WORDS);
  const n = Math.floor(r() * 4);
  for (let k = 0; k < n; k++) s += pick(r, DOTS) + pick(r, WORDS);
  const end = r();
  if (end < 0.55) s += pick(r, DOTS) + pick(r, VERBS) + (r() < 0.8 ? "(" : " (");
  else if (end < 0.75) s += pick(r, DOTS) + pick(r, NEAR) + "(";
  return s;
}
function fuzzText(seed, count) {
  const r = prng(seed);
  let s = "";
  for (let k = 0; k < count; k++) {
    const t = r();
    if (t < 0.25) s += pick(r, OPENERS);
    else if (t < 0.6) s += chain(r);
    else if (t < 0.85) s += pick(r, CLOSERS);
    else s += pick(r, NOISE);
  }
  return s;
}
// The fuzz first, so a mutant test stops at the first text that separates it. Then the real files beside this one.
const FUZZ = Array.from({ length: 60 }, (_, k) => fuzzText(0xc0de + k, 400));
const HERE_FILES = readdirSync(here)
  .filter((f) => f.endsWith(".mjs"))
  .sort()
  .map((f) => readFileSync(join(here, f), "utf8"));
const CORPUS_TEXTS = [...FUZZ, ...HERE_FILES];

test("★ DIFFERENTIAL: scanText === the frozen 6.64.2 scanText on every .mjs file here and every fuzzed text", () => {
  let hitTotal = 0;
  for (const [k, t] of CORPUS_TEXTS.entries()) {
    const want = oracleScan(t);
    hitTotal += want.length;
    assert.deepEqual(scanText(t), want, `corpus text #${k} differs`);
  }
  assert.ok(hitTotal > 100, `the corpus must exercise the scanner (only ${hitTotal} oracle hits)`);
});

// ★ NEGATIVE CONTROLS (L60): each edge the new code re-decides — a match starting mid-word after a digit, the
// interval's close (the coverage array's `-1`), the whitespace in the `.forEach`/`.map` test — is a place this corpus
// must be able to see a difference. Each oracle MUTANT below changes exactly one of those edges and must disagree with
// scanText somewhere. (An interval's OPEN edge has no such mutant: a match starts with a letter, never at the `{`/`(`
// the interval opens on, so `<` and `<=` there cannot differ on any input.)
const ORACLE_MUTANTS = [
  { n: "a match may start only at a word start (`(?<![\\w$])`)", mut: { queryPrefix: String.raw`(?<![\w$])` } },
  { n: "a loop interval never closes", mut: { neverCloses: true } },
  { n: "no whitespace allowed around the `.forEach`/`.map` word", mut: { loopCallRe: /\.(?:forEach|map)$/ } },
];
for (const o of ORACLE_MUTANTS) {
  test(`★ NEGATIVE CONTROL: an oracle mutant — ${o.n} — disagrees with scanText on the corpus`, () => {
    const differs = CORPUS_TEXTS.some((t) => JSON.stringify(oracleScan(t, o.mut)) !== JSON.stringify(scanText(t)));
    assert.ok(differs, "no corpus text separates this mutant from scanText: the corpus cannot see this edge");
  });
}
