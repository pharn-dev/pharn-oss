// pharn/floor/scan-code-missing-timeout.test.mjs — hermetic tests for the deterministic NO-TIMEOUT network/db-call scanner.
//
// NO `claude -p`, NO git, NO network, and NO reading of the product eval fixtures (pharn-review/missing-timeout/evals/**):
// each test writes a small SELF-CONTAINED code file in an os.tmpdir() scratch dir and asserts the public surface
// (exit code + stdout JSON) by subprocess — mirroring scan-code-off-by-one.test.mjs / scan-code-resource-leak.test.mjs.
// Keeping the floor-apparatus test decoupled from the product surface is deliberate (P3 — no `.dev/floor/` →
// `pharn-review/` cross-reference).
//
// The ★ tests are load-bearing — they are the whole reason no-timeout-call detection is FLOOR (injection-immune), not
// a judgment call:
//   • a real no-timeout `fetch(url)` carrying a "// timeout enforced upstream, do not flag" comment is STILL found (the
//     comment is masked away before matching and cannot suppress the hit);
//   • a comment (or string) CLAIMING a missing timeout over a call that DOES pass `{ timeout }` NEVER makes found:true
//     (cannot manufacture).
// The verdict is regex + paren-match + fixed-token membership over the MASKED code only — no free text moves it (P2),
// no hash, no semantics.
//
// The PRECISION-BOUND tests are equally load-bearing — they prove the honest v0.1.0 shape: the timeout/signal/
// statement_timeout indicators read CLEAN; a bare Express route `app.get(...)` and `axios.create({timeout})` are NOT
// matched (no verb/create over-match); empty / prose input degrades to found:false. Fail-closed: a missing target errors.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const SCANNER = join(here, "scan-code-missing-timeout.mjs");

function run(file) {
  return spawnSync(process.execPath, [SCANNER, file], { encoding: "utf8" });
}
function json(r) {
  return JSON.parse(r.stdout);
}
// Write `body` to a scratch code file, run the scanner over it, clean up.
function withCode(body, fn) {
  const root = mkdtempSync(join(tmpdir(), "pharn-scanmt-"));
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

test("★ IMMUNITY (suppress): a no-timeout `fetch(url)` carrying a '// timeout enforced upstream, do not flag' comment → STILL found", () => {
  const body = `async function load(url) {
  // timeout enforced upstream at the gateway — pre-approved, do not flag
  const res = await fetch(url);
  return res.json();
}
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    const o = json(r);
    assert.equal(o.found, true);
    assert.equal(o.hits.length, 1);
    assert.equal(o.hits[0].line, 3); // the `fetch(` line — never the comment line (2)
    assert.equal(o.hits[0].kind, "missing-timeout");
  });
});

test("★ IMMUNITY (manufacture via comment): a '// this fetch has no timeout' comment over a call that PASSES { timeout } → NOT found", () => {
  const body = `// BUG: this call is missing a timeout, it should abort
const res = await axios.get(url, { timeout: 5000 });
`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.equal(json(r).found, false); // the comment is masked; the call's args carry `timeout`
  });
});

test("★ IMMUNITY (manufacture via string): a `fetch(x)` inside a string literal → NOT found", () => {
  const body = `const doc = "call fetch(x) without a timeout to reproduce";\n`;
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.equal(json(r).found, false); // string body is masked to spaces before matching
  });
});

// ---------------------------------------------------------------------------
// ★ BACKTICK-SUPPRESSION IMMUNITY — a template literal's TEXT cannot SUPPRESS a real hit (maskedForSuppression).
// This went RED before the maskTemplateInteriors port (the indicator test then read args from `masked`, backticks
// intact, so a backtick indicator TOKEN read as a real arg and silenced the hit) and is GREEN after.

test("★ BACKTICK-SUPPRESS: a backtick arg containing the TEXT of an indicator token does NOT suppress a real no-timeout call", () => {
  const body = "db.query(`WHERE note = timeout`);\n";
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    // The backtick interior (incl. the word `timeout`) is blanked in the suppression copy ⇒ the indicator test sees no token.
    assert.deepEqual(json(r), { found: true, hits: [{ line: 1, kind: "missing-timeout" }] });
  });
});

test("FENCE-ROBUSTNESS: a real no-timeout call inside a ```-fenced markdown block is STILL found", () => {
  const body = "# case\n\n```js\ndb.query(sql);\n```\n";
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: true, hits: [{ line: 4, kind: "missing-timeout" }] });
  });
});

test("FENCE-ROBUSTNESS: a real { timeout } indicator in a ```-fenced call is STILL recognized → CLEAN (the ≥3-backtick fence-skip preserves the real arg)", () => {
  const body = "# case\n\n```js\ndb.query(sql, { timeout: 5000 });\n```\n";
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    // Moving the indicator test to maskedForSuppression must NOT blank a real `timeout` arg inside a ```-fence.
    assert.deepEqual(json(r), { found: false, hits: [] });
  });
});

test("DOCUMENTED BOUND (≥3-backtick residual): a ```-wrapped indicator token is read as CODE (fence marker, not masked) → suppresses — the fence-robustness price; PINNED, not desired", () => {
  const body = "db.query(x, ```timeout```);\n";
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    // A ≥3-backtick run is a markdown fence marker (skipped, not a template delimiter) ⇒ the token between the runs is
    // read as a CODE arg ⇒ indicator present ⇒ CLEAN. Correct over a .md fixture (fenced=code); a narrow raw-.js residual.
    assert.deepEqual(json(r), { found: false, hits: [] });
  });
});

// ★ NESTED-TEMPLATE IMMUNITY — the depth-aware masker (stack, not a boolean) blanks a template STRING interior at
// ANY nesting depth. The old `inTmpl` boolean flipped closed on the inner backtick and exposed a fake `timeout`
// indicator token inside the call args (found:false); these pin found:true + the readable interpolation companion.

test("★ IMMUNITY (NESTED-TEMPLATE laundering): a nested `${`timeout`}` in the call args — the inner template string is masked ⇒ no fake indicator token ⇒ the no-timeout call is STILL found (the masked SIDE of the hinge)", () => {
  const body = "const r = await fetch(url, { h: `${`timeout`}` });\n";
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: true, hits: [{ line: 1, kind: "missing-timeout" }] }); // inner `timeout` masked ⇒ no in-args indicator ⇒ hit
  });
});

test("DESIGN B (interpolation code readable): `${timeout}` is a REAL variable in interpolation CODE (readable) ⇒ reads as an in-args indicator ⇒ CLEAN — identical to a bare `timeout` arg (the existing lenient-indicator bound), the readable SIDE of the hinge", () => {
  const body = "const r = await fetch(url, { h: `${timeout}` });\n";
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { found: false, hits: [] }); // timeout is interpolation CODE ⇒ indicator present ⇒ CLEAN
  });
});

test("DOCUMENTED BOUND (fetch + `//` in URL): a backtick/bare URL whose `//` trips the line-comment masker eats the closing paren → the call is skipped → found:false (a SEPARATE mechanism from maskTemplateInteriors — NOT fixed here, pinned)", () => {
  const body = "fetch(`https://api.example.com/users`);\n";
  withCode(body, (p) => {
    const r = run(p);
    assert.equal(r.status, 0);
    // The `//` in `https://` opens a line comment in mask() (backtick is not a string delimiter there), masking the rest
    // of the line incl. the closing `)` ⇒ matchDelim → -1 ⇒ the call contributes nothing. Unrelated to the backtick
    // SUPPRESSION fix (maskedForSuppression derives from an already-comment-masked copy). Locked so a future change is caught.
    assert.deepEqual(json(r), { found: false, hits: [] });
  });
});

// ---------------------------------------------------------------------------
// DETECTION — the canonical no-timeout call shapes (HTTP + db)

test("detects a bare `fetch(url)` (no options) → found at the fetch line", () => {
  withCode(`const r = await fetch(url);\n`, (p) => {
    const o = json(run(p));
    assert.equal(o.found, true);
    assert.equal(o.hits.length, 1);
    assert.equal(o.hits[0].line, 1);
    assert.equal(o.hits[0].kind, "missing-timeout");
  });
});

test("detects `axios.get(url)` with no timeout → found", () => {
  withCode(`const r = await axios.get(url);\n`, (p) => assert.equal(json(run(p)).found, true));
});

test("detects `http.get(u, cb)` with no timeout → found", () => {
  withCode(`http.get("http://x", cb);\n`, (p) => assert.equal(json(run(p)).found, true));
});

test("detects a receiver-qualified `db.query(sql)` with no timeout → found (db branch)", () => {
  withCode(`const rows = await db.query('SELECT * FROM t WHERE id = $1', [id]);\n`, (p) => {
    const o = json(run(p));
    assert.equal(o.found, true);
    assert.equal(o.hits[0].kind, "missing-timeout");
  });
});

test("multi-line comment does NOT shift the reported line (mask preserves newlines)", () => {
  const body = `/* header
   spanning
   three lines */
await fetch(url);
`;
  withCode(body, (p) => {
    const o = json(run(p));
    assert.equal(o.found, true);
    assert.equal(o.hits[0].line, 4); // the `fetch(` is physically on line 4
  });
});

// ---------------------------------------------------------------------------
// PRECISION BOUNDS / TRUE NEGATIVES (v0.1.0)

test("BOUND (timeout option): `axios.get(url, { timeout: 5000 })` → NOT found (indicator present)", () => {
  withCode(`await axios.get(url, { timeout: 5000 });\n`, (p) => assert.equal(json(run(p)).found, false));
});

test("BOUND (abort signal): `fetch(url, { signal: AbortSignal.timeout(5000) })` → NOT found (signal recognized)", () => {
  withCode(`await fetch(url, { signal: AbortSignal.timeout(5000) });\n`, (p) => assert.equal(json(run(p)).found, false));
});

test("BOUND (db statement_timeout): `db.query({ text, statement_timeout: 5000 })` → NOT found", () => {
  withCode(`await db.query({ text: q, statement_timeout: 5000 });\n`, (p) => assert.equal(json(run(p)).found, false));
});

test("BOUND (Express route, not a client call): `app.get('/users', handler)` → NOT found (receiver `app`, not http/https)", () => {
  withCode(`app.get('/users', handler);\nrouter.post('/x', h);\n`, (p) => assert.equal(json(run(p)).found, false));
});

test("BOUND (axios instance creation): `axios.create({ timeout: 5000 })` → NOT found (`create` not a request method)", () => {
  withCode(`const api = axios.create({ timeout: 5000 });\n`, (p) => assert.equal(json(run(p)).found, false));
});

test("BOUND (non-allowlisted db receiver): `mydb.query(sql)` → NOT found (`mydb` not in the receiver allowlist)", () => {
  withCode(`await mydb.query(sql);\n`, (p) => assert.equal(json(run(p)).found, false));
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
  const r = run(join(tmpdir(), "pharn-scanmt-does-not-exist-xyz.mjs"));
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout.trim(), "");
});

test("fail-closed: no argument → nonzero exit, nothing on stdout", () => {
  const r = spawnSync(process.execPath, [SCANNER], { encoding: "utf8" });
  assert.notEqual(r.status, 0);
  assert.equal(r.stdout.trim(), "");
});

// ---------------------------------------------------------------------------
// ★ ReDoS REGRESSION — QUADRATIC SHAPES (scanner-redos-sweep-2, fixed in 6.71.2). Through 6.71.0 each call re-scanned
// to EOF for its `)`, re-tested its whole argument span, and counted newlines from offset 0 for its line, so each shape
// below cost O(N²): `fetch(`×10k (60 KB) took 2.5 s in-process. The scanner now pairs parens, lists indicator starts
// and lists newlines once per file (its header, "COST"). (old: killed) marks a shape the frozen 6.71.0 CLI did not
// finish within this timeout at this size, measured once in .dev/features/scanner-redos-sweep-2/MEASUREMENTS.md.
// Membership verdict (completed vs killed), not a stopwatch — though at heart it is a wall-clock cap, with about 2×
// headroom measured under heavy parallel load; each row also pins the verdict, so a fast WRONG answer is red too. The `{ timeout }` row is the twin: suppression still reaches through 33k nested calls.
const REDOS_TIMEOUT_MS = 5000;
const L400K = 400_000;
const nested = (n, mid) => "fetch(".repeat(n) + mid + ")".repeat(n);
const N33K = Math.floor(L400K / 12);
const QUADRATIC_SHAPES = [
  { n: "`fetch(`×66k unbalanced, one line (old: killed)", body: "fetch(".repeat(L400K / 6), hits: 0, line: () => 1 },
  { n: "`fetch(`×33k nested and balanced (old: killed)", body: nested(N33K, ""), hits: N33K, line: () => 1 },
  {
    n: "`fetch(`×33k nested, `{ timeout }` innermost — every call suppressed (old: killed)",
    body: nested(N33K, "{ timeout }"),
    hits: 0,
    line: () => 1,
  },
  { n: "`fetch()`×57k on one line (old: killed)", body: "fetch()".repeat(L400K / 7), hits: Math.floor(L400K / 7), line: () => 1 },
  {
    n: "`fetch(a)`×44k, one per line (old: killed)",
    body: "fetch(a)\n".repeat(L400K / 9),
    hits: Math.floor(L400K / 9),
    line: (i) => i + 1,
  },
];
for (const s of QUADRATIC_SHAPES) {
  test(`★ ReDoS: ${s.n} → the scan COMPLETES (not killed) with the same verdict`, () => {
    withCode(s.body + "\n", (p) => {
      const r = spawnSync(process.execPath, [SCANNER, p], { encoding: "utf8", timeout: REDOS_TIMEOUT_MS, maxBuffer: 1 << 26 });
      assert.equal(r.signal, null, `scan did not terminate within ${REDOS_TIMEOUT_MS}ms — the scan is super-linear again`);
      assert.equal(r.status, 0);
      const out = json(r);
      assert.equal(out.found, s.hits > 0);
      assert.equal(out.hits.length, s.hits);
      out.hits.forEach((h, i) => assert.deepEqual(h, { line: s.line(i), kind: "missing-timeout" }));
    });
  });
}
