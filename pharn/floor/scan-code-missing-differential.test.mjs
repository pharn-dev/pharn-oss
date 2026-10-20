// pharn/floor/scan-code-missing-differential.test.mjs — the 6.71.2 linear rewrites of scan-code-missing-timeout.mjs and
// scan-code-missing-error-handling.mjs return exactly what their 6.71.0 forms returned.
//
// NO `claude -p`, NO git, NO network. In-process, except that each negative control writes one mutated copy of a
// scanner into an os.tmpdir() scratch dir and imports it.
//
// What is pinned here:
//   • ★ DIFFERENTIAL: each scanner's scanText() equals the 6.71.0 scanText() on every document of a corpus that is
//     deterministic for a given tree (below — it reads every .mjs under pharn/floor/, so it grows with that dir). The
//     ORACLE is a literal copy of the 6.71.0 code (both scanners carried byte-identical mask() and
//     maskTemplateInteriors() copies; it is written once below), and it imports nothing from the scanners (L74): its
//     paren/brace match is the per-open depth scan, its line is a count from offset 0, its indicator test is the regex
//     over the args slice, its guard is a loop over every try range, its `.catch(` test re-runs per op. The new code
//     decides each of those a different way, so a disagreement on any of them shows;
//   • ★ NEGATIVE CONTROLS (L60): for each property the new code re-derives, a mutant of the NEW scanner that breaks
//     exactly that property must disagree with the oracle somewhere in the same corpus — otherwise the differential
//     could pass on a corpus too tame to exercise that step. Each mutant is a literal source replacement whose anchor
//     is asserted present exactly once before it is applied, and a ✧ CONTROL shows the harness with no edit agrees.
//
// The corpus: hand-written near-misses (one per mutant at least), seeded-PRNG fuzz documents over a token alphabet
// holding every call head and indicator token of the timeout scanner, word-boundary near-misses of the indicators,
// `try {`, awaited calls and dotted chains, `JSON.parse(`, `.catch(`, every delimiter both scanners pair, comment and
// quote openers, backticks, `${` and newlines; then every eval case of the two lenses and every .mjs file under
// pharn/floor/ (real code, dense with awaits and parens). A call head added to the scanner later is NOT in this
// alphabet until someone adds it — the differential covers the heads named here.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { scanText as timeoutScan } from "./scan-code-missing-timeout.mjs";
import { scanText as errorScan } from "./scan-code-missing-error-handling.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

// --- the ORACLE: a literal copy of 6.71.0 (L74 — nothing imported from the code under test) -----------------------

function oMask(src) {
  const out = new Array(src.length);
  let i = 0;
  const N = src.length;
  const space = (ch) => (ch === "\n" ? "\n" : " ");
  while (i < N) {
    const c = src[i];
    const n = i + 1 < N ? src[i + 1] : "";
    if (c === "/" && n === "/") {
      while (i < N && src[i] !== "\n") ((out[i] = " "), i++);
      continue;
    }
    if (c === "/" && n === "*") {
      out[i] = " ";
      out[i + 1] = " ";
      i += 2;
      while (i < N && !(src[i] === "*" && src[i + 1] === "/")) ((out[i] = space(src[i])), i++);
      if (i < N) ((out[i] = " "), (out[i + 1] = " "), (i += 2));
      continue;
    }
    if (c === "'" || c === '"') {
      const q = c;
      out[i] = " ";
      i++;
      while (i < N && src[i] !== "\n") {
        if (src[i] === "\\") {
          out[i] = " ";
          if (i + 1 < N && src[i + 1] !== "\n") ((out[i + 1] = " "), (i += 2));
          else i++;
          continue;
        }
        if (src[i] === q) {
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
  return out.join("");
}

function oMaskTemplateInteriors(src) {
  const out = src.split("");
  const N = src.length;
  const space = (ch) => (ch === "\n" ? "\n" : " ");
  const stack = [];
  const top = () => (stack.length ? stack[stack.length - 1] : null);
  let i = 0;
  while (i < N) {
    const c = src[i];
    const t = top();
    if (t && t.kind === "tmpl" && c === "\\") {
      out[i] = space(c);
      if (i + 1 < N) out[i + 1] = space(src[i + 1]);
      i += 2;
      continue;
    }
    if (c === "`") {
      if (!t || t.kind === "interp") {
        let j = i;
        while (j < N && src[j] === "`") j++;
        if (j - i >= 3) {
          i = j;
          continue;
        }
        stack.push({ kind: "tmpl" });
        i++;
        continue;
      }
      stack.pop();
      i++;
      continue;
    }
    if (t && t.kind === "tmpl" && c === "$" && i + 1 < N && src[i + 1] === "{") {
      stack.push({ kind: "interp", depth: 0 });
      i += 2;
      continue;
    }
    if (t && t.kind === "interp") {
      if (c === "{") {
        t.depth++;
        i++;
        continue;
      }
      if (c === "}") {
        if (t.depth === 0) {
          stack.pop();
          i++;
          continue;
        }
        t.depth--;
        i++;
        continue;
      }
      i++;
      continue;
    }
    if (t && t.kind === "tmpl") {
      out[i] = space(c);
      i++;
      continue;
    }
    i++;
  }
  return out.join("");
}

function oMatchDelim(s, openIdx, open, close) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === open) depth++;
    else if (s[i] === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function oLineAt(s, idx) {
  let line = 1;
  for (let i = 0; i < idx && i < s.length; i++) if (s[i] === "\n") line++;
  return line;
}

/** scan-code-missing-timeout.mjs scanText, 6.71.0. */
function oracleTimeout(text) {
  const masked = oMask(text);
  const maskedForSuppression = oMaskTemplateInteriors(masked);
  const CALL_RE = new RegExp(
    "\\b(?:" +
      "fetch" +
      "|axios(?:\\s*\\.\\s*(?:get|post|put|patch|delete|head|options|request))?" +
      "|https?\\s*\\.\\s*(?:get|request)" +
      "|(?:db|pool|client|conn|connection|database|knex|sql)\\s*\\.\\s*query" +
      ")\\s*\\(",
    "g"
  );
  const INDICATOR_RE = /\b(?:timeout|signal|statement_timeout|query_timeout|maxTimeMS)\b/;
  const hits = [];
  let m;
  while ((m = CALL_RE.exec(masked)) !== null) {
    const callOpen = m.index + m[0].length - 1;
    const callClose = oMatchDelim(masked, callOpen, "(", ")");
    if (callClose === -1) continue;
    const args = maskedForSuppression.slice(callOpen + 1, callClose);
    if (!INDICATOR_RE.test(args)) {
      hits.push({ line: oLineAt(masked, m.index), kind: "missing-timeout" });
    }
  }
  hits.sort((a, b) => a.line - b.line || a.kind.localeCompare(b.kind));
  return hits;
}

/** scan-code-missing-error-handling.mjs scanText, 6.71.0. */
function oracleError(text) {
  const masked = oMask(text);
  const maskedForSuppression = oMaskTemplateInteriors(masked);
  const TRY_RE = /\btry\b\s*\{/g;
  const tryRanges = [];
  {
    let m;
    while ((m = TRY_RE.exec(maskedForSuppression)) !== null) {
      const braceOpen = m.index + m[0].length - 1;
      const braceClose = oMatchDelim(maskedForSuppression, braceOpen, "{", "}");
      if (braceClose === -1) continue;
      tryRanges.push([braceOpen, braceClose]);
    }
  }
  function guarded(p) {
    for (const [o, c] of tryRanges) if (p > o && p < c) return true;
    return false;
  }
  const AWAIT_RE = /\bawait\s+[\w$.]+\s*\(/g;
  const JSONPARSE_RE = /\bJSON\s*\.\s*parse\s*\(/g;
  const HANDLED_RE = /\.\s*catch\s*\(/;
  const maskedForSuppressionLines = maskedForSuppression.split("\n");
  const NUL = String.fromCharCode(0);
  const seen = new Set();
  const hits = [];
  function consider(p, kind, applyCatch) {
    if (guarded(p)) return;
    const line = oLineAt(masked, p);
    if (applyCatch && HANDLED_RE.test(maskedForSuppressionLines[line - 1] ?? "")) return;
    const key = `${line}${NUL}${kind}`;
    if (seen.has(key)) return;
    seen.add(key);
    hits.push({ line, kind });
  }
  let m;
  while ((m = AWAIT_RE.exec(masked)) !== null) consider(m.index, "unguarded-await", true);
  while ((m = JSONPARSE_RE.exec(masked)) !== null) consider(m.index, "unguarded-json-parse", false);
  hits.sort((a, b) => a.line - b.line || (a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0));
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

const HEADS = [
  "fetch(",
  "fetch (",
  "fetch\n(",
  "axios(",
  "axios.get(",
  "axios . post(",
  "axios.create(",
  "http.get(",
  "https.request(",
  "db.query(",
  "pool.query(",
  "client .query(",
  "knex.query(",
  "app.get(",
  "xfetch(",
  "try {",
  "try{",
  "try",
  "await x(",
  "await a.b(",
  "await $.c (",
  "await ",
  "await\n",
  "JSON.parse(",
  "JSON . parse (",
  ".catch(",
  ". catch (",
];
const WORDS = [
  "timeout",
  "signal",
  "statement_timeout",
  "query_timeout",
  "maxTimeMS",
  "timeoutMs",
  "_signal",
  "signals",
  "mytimeout",
  "Timeout",
  "{ timeout: 5 }",
  "a.b.c",
  "x",
  "catch",
];
const OTHER = [
  "(",
  ")",
  "((",
  "))",
  "()",
  "{",
  "}",
  "{}",
  " ",
  "  ",
  "\n",
  "\n",
  ";",
  ",",
  "//",
  "/*",
  "*/",
  "'",
  '"',
  "`",
  "``",
  "```",
  "${",
  "\\",
  "\r",
];
function fuzzDocs(seed, count) {
  const r = prng(seed);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const docs = [];
  for (let i = 0; i < count; i++) {
    const n = 1 + Math.floor(r() * 60);
    let s = "";
    for (let k = 0; k < n; k++) {
      const u = r();
      s += u < 0.3 ? pick(HEADS) : u < 0.5 ? pick(WORDS) : pick(OTHER);
    }
    docs.push(s);
  }
  return docs;
}

// Near-misses written by hand, each aimed at one step the new code re-derives (the mutant it falsifies in brackets).
const NEAR_MISSES = [
  "fetch(a\nfetch(b)", // [unbalanced → EOF] an unbalanced call before a balanced one
  "fetch(a, f(b)) fetch(c)", // [FIFO pairing] the call's `)` is the second one
  "fetch(`(`) + db.query(x)", // [pairing over the suppression copy] a `(` that only the template mask hides
  "fetch(url, { timeout })", // the indicator suppresses
  "fetch(timeout)", // [indicator one past `(`] an indicator right after the `(`
  "fetch(url, `timeout`)", // [indicator in masked] template text must not suppress
  "fetch(url, { timeoutMs: 5 })", // [no word boundary] a near-miss word must not suppress
  "fetch(url, my_signal)", // same, `_` is a word character
  "fetch(url) // timeout\nfetch(u2, { signal })", // [range not bounded by callClose] an indicator AFTER the call
  "fetch\n(url)", // [line at callOpen] the head's line, not the `(`'s
  "try { a() }\nawait x()\ntry {\n await y()\n}", // a guarded op and an unguarded one
  "try { try { a() } await x() }", // [no merge] an op inside the outer try after the inner one closes
  "try {await x()}", // [lookup one past] an op at the first position inside a try body
  "try { a()\nawait x()", // [unbalanced → EOF] an unbalanced try must not guard
  "try { a( } await x()", // [FIFO braces] an unbalanced `(` does not move the brace pairing; a nested `{` does
  "try { if (a) { b() } } await x()", // [FIFO braces] the `}` that closes the try is the second one
  "await x(); `.catch(`", // [.catch in masked] template text must not handle
  "await x().catch(h)\nawait y()", // [memo keyed coarser than the line] line 1 handled, line 2 not
  "a(); b()\nawait x().catch(h)", // same, the other order
  "JSON.parse(raw).catch(h)", // JSON.parse is never handled by .catch
];

function corpus() {
  const docs = [...NEAR_MISSES, ...fuzzDocs(0x5eed2, 2500)];
  for (const lens of ["missing-timeout", "missing-error-handling"]) {
    const dir = join(REPO, "pharn", "pharn-review", lens, "evals", "cases");
    for (const f of readdirSync(dir).sort()) docs.push(readFileSync(join(dir, f), "utf8"));
  }
  for (const f of readdirSync(HERE).sort()) if (f.endsWith(".mjs")) docs.push(readFileSync(join(HERE, f), "utf8"));
  return docs;
}
const CORPUS = corpus();
const WANT = {
  timeout: CORPUS.map((d) => JSON.stringify(oracleTimeout(d))),
  error: CORPUS.map((d) => JSON.stringify(oracleError(d))),
};
const firstDivergence = (scan, want) => CORPUS.findIndex((d, i) => JSON.stringify(scan(d)) !== want[i]);

// --- ★ the differential ----------------------------------------------------------------------------------------

const SCANNERS = [
  { name: "scan-code-missing-timeout", file: "scan-code-missing-timeout.mjs", scan: timeoutScan, want: WANT.timeout },
  { name: "scan-code-missing-error-handling", file: "scan-code-missing-error-handling.mjs", scan: errorScan, want: WANT.error },
];

for (const s of SCANNERS) {
  test(`★ DIFFERENTIAL: ${s.name} scanText === the 6.71.0 scanText on every corpus document`, () => {
    const hits = s.want.reduce((n, w) => n + JSON.parse(w).length, 0);
    assert.ok(hits > 500, `the corpus must exercise ${s.name} (only ${hits} oracle hits)`);
    const i = firstDivergence(s.scan, s.want);
    assert.equal(i, -1, i === -1 ? "" : `document ${i} diverges:\n${JSON.stringify(CORPUS[i]).slice(0, 400)}`);
  });
}

test("★ DIFFERENTIAL: every near-miss is in the corpus and the fuzz reaches both unbalanced opens and suppressed calls", () => {
  // Non-vacuity of the corpus as a whole (L60); the per-property controls are the negative controls below.
  const unbalancedCalls = CORPUS.filter((d) => /fetch\s*\([^)]*$/.test(oMask(d))).length;
  const suppressed = CORPUS.filter((d) => /fetch\s*\(/.test(d) && oracleTimeout(d).length === 0).length;
  const guardedAwaits = CORPUS.filter(
    (d) => /try\s*\{[^}]*await x\(/.test(d) && !oracleError(d).some((h) => h.kind === "unguarded-await")
  ).length;
  assert.ok(unbalancedCalls >= 100, `only ${unbalancedCalls} documents end inside an open fetch(`);
  assert.ok(suppressed >= 100, `only ${suppressed} documents with a fetch( and no hit`);
  assert.ok(guardedAwaits >= 50, `only ${guardedAwaits} documents with a guarded await`);
});

// --- ★ negative controls: a mutant that breaks one re-derived property must be caught ---------------------------

const SCRATCH = mkdtempSync(join(tmpdir(), "pharn-scan-missing-diff-"));
process.on("exit", () => rmSync(SCRATCH, { recursive: true, force: true }));
let mutantSeq = 0;

/** Import a copy of the scanner `file` with each [from, to] literal replacement applied (each `from` present ONCE). */
async function mutant(file, edits) {
  let src = readFileSync(join(HERE, file), "utf8");
  for (const [from, to] of edits) {
    assert.equal(src.split(from).length - 1, 1, `${file}: mutant anchor not found exactly once: ${from}`);
    src = src.replace(from, () => to);
  }
  // The copy lives outside pharn/floor/, so its two sibling imports become absolute file URLs.
  const base = pathToFileURL(HERE).href + "/";
  for (const dep of ["runtime-floor.mjs", "code-scanner-cli.mjs"]) {
    const rel = `"./${dep}"`;
    assert.equal(src.split(rel).length - 1, 1, `${file}: import of ${dep} not found exactly once`);
    src = src.replace(rel, () => JSON.stringify(base + dep));
  }
  const p = join(SCRATCH, `m${mutantSeq++}-${file}`);
  writeFileSync(p, src);
  return (await import(pathToFileURL(p).href)).scanText;
}

for (const s of SCANNERS) {
  test(`✧ CONTROL: the mutant harness with no edit agrees with the oracle (${s.name})`, async () => {
    assert.equal(firstDivergence(await mutant(s.file, []), s.want), -1);
  });
}

const MUTANTS = [
  {
    s: 0,
    n: "an unbalanced `(` is paired to EOF instead of skipped",
    edits: [["const callClose = closeOf[callOpen];", "const callClose = closeOf[callOpen] === -1 ? masked.length : closeOf[callOpen];"]],
  },
  {
    s: 0,
    n: "parens paired first-in-first-out (a queue, not a stack)",
    edits: [["closeOf[stack.pop()] = i;", "closeOf[stack.shift()] = i;"]],
  },
  {
    s: 0,
    n: "parens paired over the suppression copy instead of `masked`",
    edits: [["const ch = masked[i];", "const ch = maskedForSuppression[i];"]],
  },
  {
    s: 0,
    n: "indicator starts read from `masked` (template text would suppress)",
    edits: [["INDICATOR_RE.exec(maskedForSuppression)", "INDICATOR_RE.exec(masked)"]],
  },
  {
    s: 0,
    n: "indicator matched without word boundaries",
    edits: [
      [
        String.raw`/\b(?:timeout|signal|statement_timeout|query_timeout|maxTimeMS)\b/g`,
        String.raw`/(?:timeout|signal|statement_timeout|query_timeout|maxTimeMS)/g`,
      ],
    ],
  },
  {
    s: 0,
    n: "the indicator lookup starts one past the first argument character",
    edits: [["firstAtOrAbove(indicatorAt, callOpen + 1)", "firstAtOrAbove(indicatorAt, callOpen + 2)"]],
  },
  {
    s: 0,
    n: "an indicator anywhere after the `(` suppresses (range not bounded by the call's `)`)",
    edits: [["indicatorAt[k] < callClose", "indicatorAt[k] >= 0"]],
  },
  {
    s: 0,
    n: "the hit's line is the `(`'s, not the call head's",
    edits: [["lineAt(m.index)", "lineAt(callOpen)"]],
  },
  {
    s: 1,
    n: "an unbalanced `try {` guards to EOF instead of nothing",
    edits: [
      [
        "const braceClose = closeOf[braceOpen];",
        "const braceClose = closeOf[braceOpen] === -1 ? maskedForSuppression.length : closeOf[braceOpen];",
      ],
    ],
  },
  {
    s: 1,
    n: "braces paired first-in-first-out (a queue, not a stack)",
    edits: [["closeOf[stack.pop()] = i;", "closeOf[stack.shift()] = i;"]],
  },
  {
    s: 1,
    n: "guard intervals never merged (a nested try hides the outer one)",
    edits: [["if (last >= 0 && lo <= guardHi[last] + 1)", "if (false)"]],
  },
  {
    s: 1,
    n: "the guard lookup misses an op at the first position inside a try body",
    edits: [["firstAtOrAbove(guardLo, p + 1) - 1", "firstAtOrAbove(guardLo, p) - 1"]],
  },
  {
    s: 1,
    n: "the `.catch(` test reads `masked` lines (template text would handle)",
    edits: [['maskedForSuppression.split("\\n")', 'masked.split("\\n")']],
  },
  {
    s: 1,
    n: "the `.catch(` memo is keyed coarser than the line (every line reads line 1's answer)",
    edits: [["const i = line - 1;", "const i = 0;"]],
  },
];
for (const m of MUTANTS) {
  const s = SCANNERS[m.s];
  test(`★ NEGATIVE CONTROL: ${s.name} with ${m.n} — disagrees with the oracle on the corpus`, async () => {
    assert.notEqual(firstDivergence(await mutant(s.file, m.edits), s.want), -1, "no document diverged: the corpus cannot see this");
  });
}
