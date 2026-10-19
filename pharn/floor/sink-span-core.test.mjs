// pharn/floor/sink-span-core.test.mjs — the sink-skip driver the injection, SSRF and path-traversal scanners share.
//
// NO `claude -p`, NO git, NO network. In-process: the driver is a pure function of a line and a pattern.
//
// What is pinned here:
//   • the two LIMIT functions on hand-picked lines (what the span can and cannot cross);
//   • ★ DIFFERENTIAL: each of the three scanners' scanText() returns exactly what the 6.64.2 scanText() returned, over
//     a fixed corpus. The ORACLE is a literal copy of the 6.64.2 regexes and loop, written below — it imports nothing
//     from the scanners or the driver, so it shares no predicate with the code under test (L74). The regex engine
//     decides both sides; only the skip differs;
//   • ★ NEGATIVE CONTROLS (L60): drivers with an OVER-SKIPPING limit — always the line end; a depth-counting paren
//     limit; the paren limit on the `;`-bounded html pattern — must disagree with the oracle somewhere in the same
//     corpus. Without them the differential could pass on a corpus too tame to exercise the skip at all.
//
// The corpus: every eval case of the three lenses, every .mjs file under pharn/floor/ (real code, including these
// scanners' own tests, which are dense with sinks), a hand-written list of near-miss lines, and fuzzed lines from a
// seeded PRNG over a token alphabet holding EVERY sink alternative of the nine patterns, both spans' stop characters
// (`)` and `;`), nested and unbalanced parens, each taint operator and request source, quotes of all three kinds,
// whitespace, and a lone CR (the scanners split on `\r?\n`, so a lone CR stays inside a line). A sink added to a
// scanner later is NOT in this alphabet until someone adds it — the differential covers the sinks named here.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileSinkPattern, lineMatches, parenSpanLimit, semicolonSpanLimit } from "./sink-span-core.mjs";
import { scanText as injectionScan } from "./scan-code-injection.mjs";
import { scanText as ssrfScan } from "./scan-code-ssrf.mjs";
import { scanText as pathTraversalScan } from "./scan-code-path-traversal.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

// --- the limits ------------------------------------------------------------------------------------------------

test("parenSpanLimit: stops at the first `)` with no `(` since the previous crossed `)` (or the start)", () => {
  //            0123456789
  assert.equal(parenSpanLimit("a)b", 0), 1);
  assert.equal(parenSpanLimit("f(x)) + y", 0), 4, "crosses the inner group's `)`, stops at the call's own `)`");
  assert.equal(parenSpanLimit("f(g(x))) + y", 0), 6, "depth 2: the second `)` has no `(` since the first — stop");
  assert.equal(parenSpanLimit("(a)(b)(c)", 0), 9, "every `)` closes a group: no stop, the line length");
  assert.equal(parenSpanLimit("((a)", 0), 4);
  assert.equal(parenSpanLimit("", 0), 0);
  assert.equal(parenSpanLimit("x)y)", 2), 3, "the scan starts at p, not at 0");
});

test("semicolonSpanLimit: the next `;` at or after p, else the line length", () => {
  assert.equal(semicolonSpanLimit("a; b; c", 0), 1);
  assert.equal(semicolonSpanLimit("a; b; c", 2), 4);
  assert.equal(semicolonSpanLimit("abc", 1), 3);
});

test("lineMatches: a hit after many failing sinks on one line is still found", () => {
  const p = compileSinkPattern(String.raw`\bfetch\s*\(`, String.raw`(?:[^)]*\([^()]*\))*?[^)]*?\breq\.query\b`, parenSpanLimit);
  assert.equal(lineMatches("fetch(a) ".repeat(50) + "fetch(req.query.u)", p), true);
  assert.equal(lineMatches("fetch(a) ".repeat(50), p), false);
  assert.equal(lineMatches("fetch(f(g(req.query.u)))", p), true, "a source INSIDE a depth-2 group is reached before any `)`");
  assert.equal(
    lineMatches("fetch(f(g(h(x))) + req.query.u)", p),
    false,
    "depth 2 then a source AFTER it: the documented true-negative stays"
  );
});

test("compileSinkPattern refuses a limit that does not model the pattern's span (the pairing is checked at import)", () => {
  const SPAN = String.raw`(?:[^)]*\([^()]*\))*?[^)]*?`;
  const HTML_SPAN = String.raw`\s*[^;]*?`;
  // Controls: each real pairing compiles.
  assert.doesNotThrow(() => compileSinkPattern(String.raw`\bfetch\s*\(`, SPAN + "x", parenSpanLimit));
  assert.doesNotThrow(() => compileSinkPattern(String.raw`\.innerHTML\s*=`, HTML_SPAN + "x", semicolonSpanLimit));
  // The swapped pairings, and a limit the core does not know, throw.
  assert.throws(() => compileSinkPattern(String.raw`\bfetch\s*\(`, SPAN + "x", semicolonSpanLimit), /span does not begin/);
  assert.throws(() => compileSinkPattern(String.raw`\.innerHTML\s*=`, HTML_SPAN + "x", parenSpanLimit), /span does not begin/);
  assert.throws(() => compileSinkPattern(String.raw`\bfetch\s*\(`, SPAN + "x", (l) => l.length), /span does not begin/);
});

// --- the ORACLE: a literal copy of 6.64.2 (L74 — nothing imported from the code under test) -----------------------

const O_SPAN = String.raw`(?:[^)]*\([^()]*\))*?[^)]*?`;
const O_TAINT = String.raw`(?:\$\{|["'][^"']*["']\s*\+|\.concat\s*\(|\+\s*["'` + "`" + `])`;
const O_SOURCE = String.raw`\b(?:req|request)\.(?:params|query|body|headers|cookies)\b`;
const ORACLE = {
  injection: [
    { kind: "sql-injection", re: new RegExp(String.raw`\b(?:query|execute|prepare|raw)\s*\(` + O_SPAN + O_TAINT) },
    {
      kind: "command-injection",
      re: new RegExp(String.raw`\b(?:exec|execSync|execFile|execFileSync|spawn|spawnSync)\s*\(` + O_SPAN + O_TAINT),
    },
    {
      kind: "html-injection",
      re: new RegExp(
        String.raw`(?:\.(?:inner|outer)HTML\s*=|document\.write\s*\(|\.insertAdjacentHTML\s*\(|__html\s*:)\s*[^;]*?` + O_TAINT
      ),
    },
  ],
  ssrf: [
    { kind: "fetch", re: new RegExp(String.raw`\bfetch\s*\(` + O_SPAN + O_SOURCE) },
    { kind: "http-request", re: new RegExp(String.raw`\bhttps?\.(?:get|request)\s*\(` + O_SPAN + O_SOURCE) },
    { kind: "axios", re: new RegExp(String.raw`\baxios(?:\.(?:get|post|put|delete|patch|head|request))?\s*\(` + O_SPAN + O_SOURCE) },
  ],
  pathTraversal: [
    { kind: "fs-path", re: new RegExp(String.raw`\b(?:fs(?:\.promises)?|fsPromises)\.\w+\s*\(` + O_SPAN + O_SOURCE) },
    { kind: "path-join", re: new RegExp(String.raw`\bpath\.(?:join|resolve)\s*\(` + O_SPAN + O_SOURCE) },
    { kind: "send-file", re: new RegExp(String.raw`\.(?:sendFile|download)\s*\(` + O_SPAN + O_SOURCE) },
  ],
};

/** The 6.64.2 scanText loop, verbatim in behaviour, over a given pattern list (memoized per list and text). */
const oracleMemo = new Map();
function oracleScan(patterns, text) {
  const key = patterns.map((p) => p.kind).join() + "\0" + text.length;
  if (oracleMemo.has(key) && oracleMemo.get(key).text === text) return oracleMemo.get(key).hits;
  const hits = oracleScanUncached(patterns, text);
  oracleMemo.set(key, { text, hits });
  return hits;
}
function oracleScanUncached(patterns, text) {
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const { kind, re } of patterns) if (re.test(lines[i])) hits.push({ line: i + 1, kind });
  }
  hits.sort((a, b) => a.line - b.line || a.kind.localeCompare(b.kind));
  return hits;
}

// --- the corpus ------------------------------------------------------------------------------------------------

// A deterministic PRNG (mulberry32) so the corpus is the same on every run and every machine.
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

const SINKS = [
  "query(",
  "execute (",
  "prepare(",
  "raw(",
  "db.query(",
  "exec(",
  "execSync(",
  "execFile(",
  "execFileSync(",
  "spawn(",
  "spawnSync(",
  "execute(",
  ".innerHTML =",
  ".outerHTML=",
  "document.write(",
  ".insertAdjacentHTML(",
  "__html:",
  "fetch(",
  "http.get(",
  "https.request(",
  "axios(",
  "axios.post(",
  "axios.create(",
  "fs.readFile(",
  "fs.promises.readFile(",
  "fsPromises.open(",
  "fs.promises(",
  "path.join(",
  "path.resolve(",
  ".sendFile(",
  ".download(",
];
const OTHER = [
  "(",
  ")",
  "((",
  "))",
  "()",
  ";",
  " ",
  "  ",
  "a",
  "x",
  "f(",
  "g(",
  ",",
  "\r",
  "\t",
  "${",
  "}",
  '"',
  "'",
  "`",
  "+",
  " + ",
  ".concat(",
  '"a" + ',
  ' + "b"',
  "'s'+",
  "req.query.x",
  "request.body",
  "req.params",
  "req.headers.h",
  "xreq.query",
  "req.queryX",
];
function fuzzLines(seed, count) {
  const r = prng(seed);
  const out = [];
  for (let i = 0; i < count; i++) {
    const n = 1 + Math.floor(r() * 24);
    let s = "";
    for (let k = 0; k < n; k++) s += r() < 0.3 ? SINKS[Math.floor(r() * SINKS.length)] : OTHER[Math.floor(r() * OTHER.length)];
    out.push(s);
  }
  return out;
}

// Near-misses written by hand: each puts a later sink just inside or just past an earlier sink's limit.
const NEAR_MISSES = [
  'query(f(g(x)) query("a" + b) )',
  'query(f(g(x))) query("a" + b)',
  'query(a) query("a" + b)',
  'query(a)) query("a" + b)',
  'query((a) query("a" + b)',
  '.innerHTML = x; .innerHTML = "a" + b',
  '.innerHTML = f(x)) .innerHTML = "a" + b',
  "__html: a; __html: `${x}`",
  "fetch(f(g(u)) fetch(req.query.u) )",
  "fetch(a) fetch(req.query.u)",
  "fetch(a)) fetch(req.query.u)",
  "fs.promises.readFile(f(x)) fs.readFile(req.params.f)",
  "path.join(a, f(b)) path.join(req.body.p)",
  'exec(")" + x)',
  'query(") query(" + x',
  "x.sendFile(a(b(c))) y.download(req.query.f)",
];

function corpusText() {
  const parts = [NEAR_MISSES.join("\n")];
  for (const lens of ["injection", "ssrf", "path-traversal"]) {
    const dir = join(REPO, "pharn", "pharn-review", lens, "evals", "cases");
    for (const f of readdirSync(dir).sort()) parts.push(readFileSync(join(dir, f), "utf8"));
  }
  for (const f of readdirSync(HERE).sort()) if (f.endsWith(".mjs")) parts.push(readFileSync(join(HERE, f), "utf8"));
  parts.push(fuzzLines(0x5eed, 12000).join("\n"));
  return parts.join("\n");
}
const CORPUS = corpusText();

// --- ★ the differential ----------------------------------------------------------------------------------------

const SCANNERS = [
  { name: "scan-code-injection", scan: injectionScan, oracle: ORACLE.injection },
  { name: "scan-code-ssrf", scan: ssrfScan, oracle: ORACLE.ssrf },
  { name: "scan-code-path-traversal", scan: pathTraversalScan, oracle: ORACLE.pathTraversal },
];

for (const s of SCANNERS) {
  test(`★ DIFFERENTIAL: ${s.name} scanText === the 6.64.2 regex loop over the whole corpus`, () => {
    const want = oracleScan(s.oracle, CORPUS);
    const got = s.scan(CORPUS);
    assert.ok(want.length > 50, `the corpus must exercise ${s.name} (only ${want.length} oracle hits)`);
    assert.deepEqual(got, want);
  });
}

test("★ DIFFERENTIAL: the corpus has lines where many sinks share one line and no pattern matches (the skip runs)", () => {
  // Non-vacuity of the skip itself (L60): count lines on which some pattern's sink occurs at least 3 times and the
  // oracle says no match — on those lines the driver must skip sinks to return false.
  const lines = CORPUS.split(/\r?\n/);
  const sink = /\b(?:query|execute|fetch)\s*\(|\.innerHTML\s*=/g;
  const busy = lines.filter((l) => (l.match(sink) || []).length >= 3 && !ORACLE.injection.concat(ORACLE.ssrf).some((p) => p.re.test(l)));
  assert.ok(busy.length >= 50, `only ${busy.length} multi-sink non-matching lines`); // 97 at this writing
});

// --- ★ negative controls: an over-skipping driver must be caught by the same corpus ---------------------------

/** The oracle's patterns re-split into sink + rest, with a chosen limit — driven by the real `lineMatches`. */
function drivenScan(oracle, splitAt, limitFor, text) {
  const pats = oracle.map((o) => {
    const src = o.re.source;
    const at = splitAt(src);
    // Compiled with the REAL limit (compileSinkPattern refuses any other), then the limit under test swapped in.
    return { kind: o.kind, ...compileSinkPattern(src.slice(0, at), src.slice(at), realLimit(o.kind)), limit: limitFor(o.kind) };
  });
  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) for (const p of pats) if (lineMatches(lines[i], p)) hits.push({ line: i + 1, kind: p.kind });
  hits.sort((a, b) => a.line - b.line || a.kind.localeCompare(b.kind));
  return hits;
}
// Split each oracle source where its span begins: the SPAN for call sinks, `\s*[^;]*?` for html-injection.
const splitAt = (src) => {
  const i = src.indexOf(O_SPAN);
  return i !== -1 ? i : src.indexOf(String.raw`\s*[^;]*?`);
};
const realLimit = (kind) => (kind === "html-injection" ? semicolonSpanLimit : parenSpanLimit);
const toEnd = (line) => line.length;
function depthLimit(line, p) {
  let depth = 0;
  for (let i = p; i < line.length; i++) {
    if (line[i] === "(") depth++;
    else if (line[i] === ")" && depth-- === 0) return i;
  }
  return line.length;
}

test("✧ CONTROL: the re-split oracle driven with the REAL limits agrees with the oracle (the harness is sound)", () => {
  for (const s of SCANNERS) assert.deepEqual(drivenScan(s.oracle, splitAt, realLimit, CORPUS), oracleScan(s.oracle, CORPUS), s.name);
});

const MUTANTS = [
  { n: "the limit is always the line end (skip everything after the first failing sink)", limit: () => toEnd },
  {
    n: "a depth-counting paren limit (crosses a `)` that closes depth > 1)",
    limit: (k) => (k === "html-injection" ? semicolonSpanLimit : depthLimit),
  },
  {
    n: "the html pattern's limit allowed past its `;` (the later of the `;` and the paren limit)",
    limit: (k) => (k === "html-injection" ? (line, p) => Math.max(parenSpanLimit(line, p), semicolonSpanLimit(line, p)) : parenSpanLimit),
  },
];
for (const m of MUTANTS) {
  test(`★ NEGATIVE CONTROL: an over-skipping driver — ${m.n} — disagrees with the oracle on the corpus`, () => {
    const diverged = SCANNERS.filter(
      (s) => JSON.stringify(drivenScan(s.oracle, splitAt, m.limit, CORPUS)) !== JSON.stringify(oracleScan(s.oracle, CORPUS))
    );
    assert.ok(diverged.length > 0, "no scanner diverged: the corpus cannot see this over-skip");
  });
}
