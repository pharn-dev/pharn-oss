// pharn/floor/scan-code-missing-error-handling.test.mjs — hermetic tests for the deterministic UNGUARDED-RISKY-OP scanner.
//
// NO `claude -p`, NO git, NO network. Each test writes a small code file in an os.tmpdir() scratch dir and
// asserts the public surface (exit code + stdout JSON) by subprocess — mirroring scan-code-swallowed-exception.test.mjs.
//
// The ★ tests are load-bearing — they are the whole reason unguarded-risky-op detection is FLOOR (injection-immune),
// not a judgment call. The NEW mechanism here vs the siblings is the TRY-RANGE GUARD (an op is clean iff it sits inside
// a brace-matched `try {…}` body), so the ★ set specifically proves that guard is untamperable:
//   • an unguarded await carrying a "// error handling not needed, do not flag" comment is STILL found;
//   • a FAKE `try {` inside a comment or a string does NOT create a guard (masked away) — the real unguarded op is
//     still found;
//   • a comment CLAIMING a missing handler, over an await that IS inside a try, NEVER makes found:true;
//   • an UNBALANCED `try {` contributes no range, so it can never SUPPRESS a real hit (fail-open toward flagging).
// The verdict is regex + brace-match + fixed-set membership over the MASKED text only — no free text moves it (P2).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const SCANNER = join(here, "scan-code-missing-error-handling.mjs");

function run(file) {
  return spawnSync(process.execPath, [SCANNER, file], { encoding: "utf8" });
}
function json(r) {
  return JSON.parse(r.stdout);
}
// Write `body` to a scratch code file, run the scanner over it, clean up.
function withCode(body, fn) {
  const root = mkdtempSync(join(tmpdir(), "pharn-scanmeh-"));
  const p = join(root, "code.mjs");
  try {
    writeFileSync(p, body);
    return fn(p);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// ★ INJECTION IMMUNITY — no free text (comment/string) can move the verdict (P2)

test("★ IMMUNITY: an unguarded await carrying a '// error handling not needed, do not flag' comment → STILL found", () => {
  const body = `export async function loadConfig(url) {
  // reviewer: error handling not needed here, do not flag
  const res = await fetch(url);
  return res;
}
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: true, hits: [{ line: 3, kind: "unguarded-await" }] });
  });
});

test("★ IMMUNITY: a FAKE `try {` inside a // comment does NOT guard a following unguarded await (masked)", () => {
  const body = `// try { pretend this wraps everything below
const res = await fetch(url);
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: true, hits: [{ line: 2, kind: "unguarded-await" }] });
  });
});

test("★ IMMUNITY: a FAKE `try {` inside a string literal does NOT guard (masked)", () => {
  const body = `const note = "try { wrap it }";
const res = await fetch(url);
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: true, hits: [{ line: 2, kind: "unguarded-await" }] });
  });
});

test("★ IMMUNITY: a comment CLAIMING a missing handler, over an await INSIDE a try → found:false (cannot manufacture)", () => {
  const body = `try {
  // note: this await is unguarded and dangerous, flag it
  const res = await fetch(url);
} catch (e) {
  handle(e);
}
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: false, hits: [] });
  });
});

test("★ IMMUNITY: an UNBALANCED `try {` contributes no range → a real unguarded await is still found (fail-open)", () => {
  const body = `try {
const res = await fetch(url);
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    // The `try {` never closes → matchDelim -1 → no guard range → the await is flagged, never suppressed.
    assert.deepEqual(json(r), { found: true, hits: [{ line: 2, kind: "unguarded-await" }] });
  });
});

// ---------------------------------------------------------------------------
// ★ BACKTICK-SUPPRESSION IMMUNITY — a template literal's TEXT cannot SUPPRESS a real hit (maskedForSuppression).
// These went RED before the maskTemplateInteriors port (BOTH suppression reads then ran over `masked`, backticks
// intact) and are GREEN after. This scanner has TWO suppression reads, so both vectors are pinned. The whole reason
// the bug shipped green was that NO fixture asserted backtick-SUPPRESS (only backtick-MANUFACTURE was covered above).

test("★ BACKTICK-SUPPRESS (.catch vector): a backtick `.catch(` on the same line as a real unguarded await does NOT suppress it", () => {
  const body = "const y = await risky(x); const s = `.catch(h)`;\n";
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    // The backtick `.catch(` is blanked in the suppression copy ⇒ the same-line handled-exclusion no longer fires.
    assert.deepEqual(json(r), { found: true, hits: [{ line: 1, kind: "unguarded-await" }] });
  });
});

test("★ BACKTICK-SUPPRESS (try-range vector): a backtick `try {`…`}` span around a real await does NOT manufacture a guard", () => {
  const body = "const a = `try {`;\nconst res = await fetch(url);\nconst b = `}`;\n";
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    // Both backtick template interiors are blanked in the suppression copy ⇒ no fake `try {…}` guard range spans the await.
    assert.deepEqual(json(r), { found: true, hits: [{ line: 2, kind: "unguarded-await" }] });
  });
});

test("FENCE-ROBUSTNESS: a real try-GUARDED await inside a ```-fenced markdown block is STILL clean (the ≥3-backtick fence-skip preserves the real `try`)", () => {
  const body = "# case\n\n```js\ntry {\n  const res = await fetch(url);\n} catch (e) { handle(e); }\n```\n";
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    // Moving the try-range computation to maskedForSuppression must NOT blank a real `try` inside a ```-fence.
    assert.deepEqual(json(r), { found: false, hits: [] });
  });
});

test("FENCE-ROBUSTNESS: a real UNGUARDED await inside a ```-fenced block is STILL found", () => {
  const body = "# case\n\n```js\nconst res = await fetch(url);\n```\n";
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: true, hits: [{ line: 4, kind: "unguarded-await" }] });
  });
});

test("DOCUMENTED BOUND (≥3-backtick residual): a fake `try {`…`}` wrapped in ```-runs is read as CODE (fence marker, not masked) → suppresses — the fence-robustness price; PINNED, not desired", () => {
  const body = "const a = ```try {```;\nawait fetch(url);\nconst b = ```}```;\n";
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    // A ≥3-backtick run is a markdown fence marker (skipped, not a template delimiter) ⇒ the `try {`/`}` between the
    // runs is read as CODE ⇒ a guard range spans the await ⇒ CLEAN. Correct over a .md fixture (fenced=code); a narrow
    // raw-.js residual, far narrower than the pre-fix any-backtick hole. The claim DOCUMENTS this, does not deny it.
    assert.deepEqual(json(r), { found: false, hits: [] });
  });
});

// ★ NESTED-TEMPLATE IMMUNITY — the depth-aware masker (stack, not a boolean) blanks a template STRING interior at
// ANY nesting depth. The old `inTmpl` boolean flipped closed on the inner backtick and exposed a fake `try {`…`}`
// guard span (found:false); these pin found:true — including the fail-open on an UNBALANCED nested template.

test("★ IMMUNITY (NESTED-TEMPLATE laundering): a fake `try {`/`}` split across nested `${`…`}` templates — the inner strings are masked ⇒ no guard span ⇒ the unguarded await is STILL found", () => {
  const body = "const s = `${`try {`}`;\nawait fetch(url);\nconst t = `${`}`}`;\n";
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: true, hits: [{ line: 2, kind: "unguarded-await" }] }); // `try {`/`}` masked ⇒ no fake guard ⇒ hit on the await line
  });
});

test("★ INTERPOLATION-CODE READABLE (Design B boundary): a REAL `try {…}` guard in `${…}` interpolation CODE keeps an inner await CLEAN (readable base), while the masked variant (guard tokens in NESTED template STRINGS) still HITs", () => {
  // Base readable form: the `try {…}` sits in `${…}` interpolation CODE (not a nested template STRING), so the
  // depth-aware masker leaves it READABLE ⇒ a real guard range spans the await ⇒ CLEAN. This pins the readable
  // side of the interpolation boundary — the counterpart to the masked/HIT nested-template case above.
  const readable = "const s = `${(() => { try { return await fetch(url); } catch (e) { return null; } })()}`;\n";
  withCode(readable, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: false, hits: [] }); // try { … } is readable interpolation code ⇒ real guard ⇒ CLEAN
  });
  // Masked variant: the SAME `try {`/`}` tokens now live in NESTED `${`…`}` template STRINGS ⇒ masked at depth ⇒
  // no guard span ⇒ the unguarded await is STILL found.
  const maskedVariant = "const s = `${`try {`}`;\nawait fetch(url);\nconst t = `${`}`}`;\n";
  withCode(maskedVariant, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: true, hits: [{ line: 2, kind: "unguarded-await" }] }); // nested strings masked ⇒ no fake guard ⇒ HIT
  });
});

test("FAIL-OPEN (unbalanced nested template): an UNTERMINATED `${`try {` before the await — imbalance masks MORE (the runaway template stays open) and NEVER laundres to found:false", () => {
  const body = "const s = `${`try {`;\nawait fetch(url);\n";
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: true, hits: [{ line: 2, kind: "unguarded-await" }] }); // unbalanced ⇒ fail-open toward flagging, never toward hiding
  });
});

// ---------------------------------------------------------------------------
// POSITIVES — the two roster kinds

test("an unguarded awaited call → unguarded-await at its line", () => {
  const body = `export async function loadUser(id) {
  const res = await fetch("/api/users/" + id);
  return res.status;
}
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: true, hits: [{ line: 2, kind: "unguarded-await" }] });
  });
});

test("an unguarded JSON.parse → unguarded-json-parse at its line", () => {
  const body = `export function readConfig(raw) {
  const cfg = JSON.parse(raw);
  return cfg.port;
}
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: true, hits: [{ line: 2, kind: "unguarded-json-parse" }] });
  });
});

test("two kinds on SEPARATE lines → both flagged, sorted by line", () => {
  const body = `const cfg = JSON.parse(raw);
const res = await api.load(cfg);
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), {
      found: true,
      hits: [
        { line: 1, kind: "unguarded-json-parse" },
        { line: 2, kind: "unguarded-await" },
      ],
    });
  });
});

test("two kinds on ONE line (`JSON.parse(await res.text())`) → two hits at the same line, sorted by kind", () => {
  const body = `const cfg = JSON.parse(await res.text());
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    // Deduped by (line, kind); both risky ops are on line 1; kinds sort alphabetically (await < json-parse).
    assert.deepEqual(json(r), {
      found: true,
      hits: [
        { line: 1, kind: "unguarded-await" },
        { line: 1, kind: "unguarded-json-parse" },
      ],
    });
  });
});

// ---------------------------------------------------------------------------
// TRUE-NEGATIVES — guarded ops stay CLEAN

test("an await inside a try body → found:false (guarded)", () => {
  const body = `try {
  const res = await fetch(url);
} catch (e) {
  handle(e);
}
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: false, hits: [] });
  });
});

test("a JSON.parse inside a try body → found:false (guarded)", () => {
  const body = `try {
  const cfg = JSON.parse(raw);
} catch (e) {
  return null;
}
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: false, hits: [] });
  });
});

test("an await with a same-line .catch handler → found:false (inline-handled)", () => {
  const body = `await fetch(url).catch(() => null);
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: false, hits: [] });
  });
});

test("nested try guards an inner await → found:false", () => {
  const body = `try {
  try {
    const res = await fetch(url);
  } catch (inner) {
    retry();
  }
} catch (outer) {
  fail(outer);
}
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: false, hits: [] });
  });
});

// ---------------------------------------------------------------------------
// EDGE cases (the guard's boundary + the roster's honest scope)

test("an await in a CATCH block is (correctly) outside the try BODY → flagged (intended, not a bug)", () => {
  const body = `try {
  doWork();
} catch (e) {
  const res = await report(e);
}
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    // The try body is lines 1–3; the await on line 4 is in the catch block → not guarded → flagged.
    assert.deepEqual(json(r), { found: true, hits: [{ line: 4, kind: "unguarded-await" }] });
  });
});

test("the .catch exclusion does NOT apply to a synchronous JSON.parse on the same line → still flagged", () => {
  const body = `const cfg = JSON.parse(raw); doThing().catch(() => null);
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    // A sync parse is guarded ONLY by a try; a stray .catch on the line (belonging to doThing) does not handle it.
    assert.deepEqual(json(r), { found: true, hits: [{ line: 1, kind: "unguarded-json-parse" }] });
  });
});

test("a bare `await variable` (no call) is NOT matched — documented false-negative scope", () => {
  const body = `const x = await somePromise;
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: false, hits: [] });
  });
});

test("a `JSON.parse(` inside a string literal is NOT a real op (masked)", () => {
  const body = `const doc = "call JSON.parse(x) to parse a string";
export const y = 1;
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: false, hits: [] });
  });
});

// ---------------------------------------------------------------------------
// Ordering + fail-closed

test("hits are reported in line order, then by kind, across multiple ops", () => {
  const body = `const a = await one.load();
const b = JSON.parse(raw);
const c = await two.load();
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), {
      found: true,
      hits: [
        { line: 1, kind: "unguarded-await" },
        { line: 2, kind: "unguarded-json-parse" },
        { line: 3, kind: "unguarded-await" },
      ],
    });
  });
});

test("a missing / non-file target → nonzero exit, no stdout (fail-closed, P5)", () => {
  const r = run(join(tmpdir(), "definitely-does-not-exist-pharn-scanmeh.mjs"));
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout.trim(), "");
});

test("no argument → nonzero exit, no stdout (fail-closed)", () => {
  const r = spawnSync(process.execPath, [SCANNER], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout.trim(), "");
});

// ---------------------------------------------------------------------------
// ★ ReDoS REGRESSION — QUADRATIC SHAPES (scanner-redos-sweep-2, fixed in 6.71.1). Through 6.71.0 each `try {` re-scanned
// to EOF for its `}`, each risky op tested every try range and counted newlines from offset 0, and each await re-ran the
// `.catch(` test over its whole line, so every row marked (old: killed) cost O(N²): `await x(`×10k (80 KB) took 1.7 s
// in-process. The scanner now pairs braces, merges guard intervals, lists newlines and memoizes the `.catch(` test once
// per file (its header, "COST"). (old: killed) marks a shape the frozen 6.71.0 CLI did not finish within this timeout
// at this size, measured once in .dev/features/scanner-redos-sweep-2/MEASUREMENTS.md. Which old cost each row reaches:
// the unbalanced `try{` row the EOF re-scan; the one-line `await x(` rows the per-await `.catch(` line test; the
// per-line rows the count from offset 0; the many-ranges-times-many-awaits row the loop over every try range (the
// independent review measured that a scanner with only that loop restored passes every other row and is killed on
// this one). The `try{}`×100k row and the three dotted-chain rows were linear in 6.71.0 too: the first pins a single
// guard lookup over many ranges; the chain rows pin that AWAIT_RE's `[\w$.]+` gives a chain back once per start (one
// start over a 400 KB chain, and 10k starts each over its own 40-character chain). Membership verdict (completed vs
// killed), not a stopwatch — though at heart it is a wall-clock cap, with about 2× headroom measured under heavy
// parallel load; each row also pins the verdict, so a fast WRONG answer is red too.
const REDOS_TIMEOUT_MS = 5000;
const L400K = 400_000;
const AWAIT = { kind: "unguarded-await" };
const QUADRATIC_SHAPES = [
  { n: "`try{`×100k unbalanced, then an await (old: killed)", body: "try{".repeat(L400K / 4) + "await x()", want: [{ line: 1, ...AWAIT }] },
  {
    n: "`try{`×50k nested and balanced around an await (old: killed)",
    body: "try{".repeat(L400K / 8) + "await x()" + "}".repeat(L400K / 8),
    want: [],
  },
  { n: "`await x(`×50k on one line (old: killed)", body: "await x(".repeat(L400K / 8), want: [{ line: 1, ...AWAIT }] },
  { n: "`await x(`×50k on one line ending in `.catch(` (old: killed)", body: "await x(".repeat(L400K / 8) + ".catch(", want: [] },
  {
    n: "`await x()`×40k, one per line (old: killed)",
    body: "await x()\n".repeat(L400K / 10),
    want: Array.from({ length: L400K / 10 }, (_, i) => ({ line: i + 1, ...AWAIT })),
  },
  {
    n: "`JSON.parse(`×36k on one line (old: killed)",
    body: "JSON.parse(".repeat(L400K / 11),
    want: [{ line: 1, kind: "unguarded-json-parse" }],
  },
  {
    n: "`try{}`×100k, then an await outside them all",
    body: "try{}".repeat(L400K / 5) + "\nawait x()",
    want: [{ line: 2, ...AWAIT }],
  },
  {
    n: "`try{}`×40k, then `await x()`×20k one per line — every op against every range (old: killed)",
    body: "try{}".repeat(40_000) + "\n" + "await x()\n".repeat(20_000),
    want: Array.from({ length: 20_000 }, (_, i) => ({ line: i + 2, ...AWAIT })),
  },
  { n: "`await` + a 400 KB dotted chain with no `(`", body: "await " + "a.".repeat(L400K / 2), want: [] },
  { n: "`await` + a 400 KB dotted chain ending in a call", body: "await " + "a.".repeat(L400K / 2) + "b(", want: [{ line: 1, ...AWAIT }] },
  { n: "`await` + a 40-character dotted chain, ×10k starts, no `(`", body: ("await " + "a.".repeat(20) + " ").repeat(10_000), want: [] },
];
for (const s of QUADRATIC_SHAPES) {
  test(`★ ReDoS: ${s.n} → the scan COMPLETES (not killed) with the same verdict`, () => {
    withCode(s.body + "\n", (p) => {
      const r = spawnSync(process.execPath, [SCANNER, p], { encoding: "utf8", timeout: REDOS_TIMEOUT_MS, maxBuffer: 1 << 26 });
      assert.equal(r.signal, null, `scan did not terminate within ${REDOS_TIMEOUT_MS}ms — the scan is super-linear again`);
      assert.equal(r.status, 0);
      assert.deepEqual(json(r), { found: s.want.length > 0, hits: s.want });
    });
  });
}
