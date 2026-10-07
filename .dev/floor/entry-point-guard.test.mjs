// .dev/floor/entry-point-guard.test.mjs — the family guard for every floor CLI's entry-point test.
//
// WHY IT LIVES HERE, and why it has no paired checker. It sweeps BOTH floors, so it may only live on
// the `.dev/` side: a user's install ships `pharn/floor/` WITHOUT `.dev/`, so the dependency may point
// `.dev/` → `pharn/` and never the reverse (the same reason `.dev/floor/lessons-index-core.test.mjs`
// pins the two lessons-index copies from here). Like `.dev/floor/command-hygiene.test.mjs` it tests a
// VOCABULARY across a directory walk rather than one sibling checker, so there is no `.mjs` to pair
// with, and inventing one for a single membership test would be the speculative addition P7 forbids.
//
// WHAT IT GUARDS. Ten floor CLIs shipped this guard:
//
//     if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) main();
//
// `import.meta.url` is PERCENT-ENCODED; `process.argv[1]` is raw. The two therefore never match when
// the script's path holds a space or a non-ASCII character, `main()` never runs, and the process exits
// **0 having checked nothing** — a floor checker that silently certifies. Reproduced live before the
// repair: `check-lessons-index.mjs --verdict` from a spaced directory printed NOTHING at exit 0, while
// `/pharn-plan` branches on that token's membership in a closed set. The correct test is:
//
//     if (import.meta.main) main();           // Node >= 24.2
//
// Measured on a probe module invoked four ways (this is why `pathToFileURL(argv[1]).href` is ALSO
// banned as a repair, not merely the raw template):
//
//   invocation        | `file://${argv[1]}` | pathToFileURL(argv[1]).href | import.meta.main
//   plain path        | runs                | runs                        | runs
//   path with a space | SILENT NO-OP        | runs                        | runs
//   non-ASCII path    | SILENT NO-OP        | runs                        | runs
//   through a symlink | SILENT NO-OP        | SILENT NO-OP                | runs
//
// The command line is PINNED here rather than described (L22): the idiom was previously prescribed only
// by example, and ten files copied it wrong.
//
// THE RUNTIME FLOOR (6.50.0, audit finding P1-A). `import.meta.main` itself is the next silent no-op: on a
// Node without it (before 22.18 / 24.2) every gated CLI exits 0 having checked nothing. Reproduced on 20.13.1
// and 22.16.0. So every gated CLI under both floors now carries `pharn/floor/runtime-floor.mjs`, which exits 2
// with a fixed sentence below the floor. The last section of this file pins (4) the guard's POSITION in every
// gated CLI — the first static import, or, for the three CLIs that take no static import by design, an inline
// feature check above the gate plus a dynamic import inside their `try` — and (5) the BEHAVIOR: every gated CLI
// spawned under a faked `process.versions.node` of 22.16.0 exits 2 with the sentence on stderr and nothing on
// stdout. The fake cannot remove `import.meta.main`; set `PHARN_OLD_NODE` to an old node binary to run (6), the
// same sweep on a real old runtime, which CI does not do.
//
// ── Honest scope (P0) — what a green run does and does NOT buy ───────────────────────────────────────
// FLOOR (what green means): (1) no executable line under either floor carries one of the two BANNED
//   spellings; (2) every non-test `.mjs` under either floor that HAS an entry guard spells it
//   `import.meta.main`; (3) THREE scripts — `check-ship-briefing.mjs`, `check-lessons-index.mjs`,
//   `render-cost-record.mjs` — produce byte-identical output and an identical exit code across FOUR path
//   shapes: normal, spaced, non-ASCII, and symlinked. (Three probes over four shapes; the fourth test in
//   this file is the import control, which is vacuous under `import.meta.main` and is NOT coverage.)
// NOT guaranteed, and the denominator is the reason: MOST floor scripts have NO entry guard at all —
//   they call `main()` unconditionally, so checks (1) and (2) are VACUOUSLY green over them. GUARDED_MIN
//   below pins the guarded count against silent erosion, but this file cannot distinguish "the guard is
//   correct" from "there is no guard", and it never claims to. Check (1) is a negative assertion over
//   two KNOWN-BAD strings — a novel wrong spelling (a hand-rolled `decodeURI`, an `endsWith()` suffix
//   match) passes untouched; it pins a vocabulary, not a behavior. The probes cover four path shapes over
//   three scripts, not all path shapes over all scripts. And `executableSource()` can MISS as well as
//   over-match — see its own docstring, which names the direction rather than claiming a one-way bias.
//   "The sweep is green" NEVER means "every entry guard in the repo is correct".
//
// Non-LLM, stdlib-only.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, cpSync, rmSync, symlinkSync, readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const PRODUCT_FLOOR = join(REPO, "pharn", "floor");
const DEV_FLOOR = join(REPO, ".dev", "floor");

/** The one correct entry-point test. Pinned as a literal (L22) — never described in prose alone. */
const CORRECT_GUARD = "import.meta.main";

/**
 * The banned spellings, as literal substrings. BOTH are banned deliberately: the raw template is the
 * shipped defect, and `pathToFileURL(...).href` is the near-miss repair that still no-ops through a
 * symlink, so admitting it would leave the repo with two spellings of one guard — the L22 shape that
 * let this defect reach ten files.
 */
const BANNED = ["file://${process.argv[1]}", "pathToFileURL(process.argv[1]).href"];

/**
 * Lower bound on how many non-test floor scripts carry an entry guard, measured live at the repair
 * (5 under pharn/floor, 6 under .dev/floor). Asserted as a FLOOR, not equality: adding a guarded CLI
 * must not fail the suite, but silently dropping guards until the sweep is vacuous must.
 */
const GUARDED_MIN = { product: 5, dev: 6 };

/**
 * Strip whole-line comments so a file may DISCUSS a banned spelling without tripping the sweep —
 * `.dev/floor/hash-doc.mjs` documents both wrong forms in its own header and must stay green.
 *
 * BOUND, stated in BOTH directions — this is a heuristic over the repo's comment style, not a JS parse,
 * and it is not one-way safe:
 *   • OVER-detection (false RED, loud and harmless): a banned spelling inside a multi-line string
 *     literal, or after code on a `doThing(); // …` line, is swept. Nobody has written either.
 *   • UNDER-detection (false GREEN, the dangerous direction): a line is DROPPED whenever its trimmed
 *     form opens with `//`, `*`, or `/*`. An executable statement beginning with `*` — a continuation
 *     line of a multiplication, say — would therefore be skipped. Prettier does not produce that shape
 *     in this repo (verified: no such line exists under either floor), which is why the rule is
 *     acceptable, NOT because the rule cannot miss. Treat "green" accordingly.
 * The `*` and `/*` cases exist so a file may DISCUSS a banned spelling in its own header:
 * `.dev/floor/hash-doc.mjs` does exactly that, on purpose.
 */
function executableSource(text) {
  return text
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*");
    })
    .join("\n");
}

/** Non-test `.mjs` files directly under `dir`, sorted so failures are filesystem-order-independent. */
function floorScripts(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".mjs") && !e.name.endsWith(".test.mjs"))
    .map((e) => e.name)
    .sort();
}

/** Spawn a script; never throws. Returns {code, stdout, stderr}. */
function run(script, args, opts = {}) {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: "utf8", ...opts });
  return { code: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" };
}

// ── The sweep (checks 1 + 2) ──────────────────────────────────────────────────────────────────────

for (const [label, dir] of [
  ["pharn/floor", PRODUCT_FLOOR],
  [".dev/floor", DEV_FLOOR],
]) {
  test(`✧ no executable line under ${label} carries a banned entry-guard spelling`, () => {
    const offenders = [];
    for (const name of floorScripts(dir)) {
      const src = executableSource(readFileSync(join(dir, name), "utf8"));
      for (const bad of BANNED) if (src.includes(bad)) offenders.push(`${label}/${name} → ${bad}`);
    }
    assert.deepEqual(offenders, [], `banned entry-guard spelling(s) found. Use \`if (${CORRECT_GUARD}) …\`:\n  ${offenders.join("\n  ")}`);
  });

  test(`✧ every guarded script under ${label} spells its guard \`${CORRECT_GUARD}\``, () => {
    const scripts = floorScripts(dir);
    const guarded = scripts.filter((n) => executableSource(readFileSync(join(dir, n), "utf8")).includes(CORRECT_GUARD));
    const min = label === "pharn/floor" ? GUARDED_MIN.product : GUARDED_MIN.dev;

    // The denominator, asserted rather than assumed — see the honest-scope note above: the sweep is
    // vacuous over the unguarded majority, so its reach must not silently shrink.
    assert.ok(
      guarded.length >= min,
      `${label}: ${guarded.length} of ${scripts.length} script(s) carry an entry guard, below the ` +
        `pinned floor of ${min}. A guard was removed rather than repaired, or a CLI lost its guard.`
    );
  });
}

test("✧ hash-doc.mjs — the reference site — still carries the correct guard", () => {
  // It is the one file that documents WHY, and the repair left it byte-unchanged; if it ever drifts,
  // the rationale the other sites point at drifts with it.
  const src = executableSource(readFileSync(join(DEV_FLOOR, "hash-doc.mjs"), "utf8"));
  assert.ok(src.includes(CORRECT_GUARD), `.dev/floor/hash-doc.mjs must use \`${CORRECT_GUARD}\``);
});

test("✧ a file may DISCUSS a banned spelling in a comment without tripping the sweep", () => {
  // Driven by a SYNTHETIC fixture on purpose. An earlier draft asserted that `.dev/floor/hash-doc.mjs`
  // still CONTAINS the banned string as a precondition, which coupled a test about the stripper to the
  // exact wording of another file's comment — rewording that comment (which the very next iteration did)
  // would have RED'd this test for no reason. The live file's correctness is already covered: it is in
  // the sweep like every other script, and by the reference-site test below.
  const fixture = [
    "// a line comment mentioning `file://${process.argv[1]}`",
    " *  a jsdoc body mentioning pathToFileURL(process.argv[1]).href",
    "/* an opening block line mentioning file://${process.argv[1]} */",
    "if (import.meta.main) main();",
  ].join("\n");

  const stripped = executableSource(fixture);
  for (const bad of BANNED) {
    assert.ok(!stripped.includes(bad), `a comment form leaked into the swept source: ${bad}`);
  }
  assert.ok(stripped.includes(CORRECT_GUARD), "the executable line must SURVIVE stripping");
});

// ── The behavioral probes (check 3) ───────────────────────────────────────────────────────────────

/**
 * Copies pharn/floor/ into hostile-path fixture dirs ONCE for the probes below.
 * `mkdtempSync` gives a unique root per run — `node --test` runs files in parallel, and a fixed path
 * (the `/tmp/space dir` of the original reproduction) would let one worker's teardown delete a fixture
 * another is mid-spawn on, producing a flaky red indistinguishable from a real guard failure.
 */
const ROOT = mkdtempSync(join(tmpdir(), "pharn entry guard "));
const SPACED = join(ROOT, "with space");
const UNICODE = join(ROOT, "ünï-非ascii");
const LINKED = join(ROOT, "via-symlink");
mkdirSync(SPACED, { recursive: true });
mkdirSync(UNICODE, { recursive: true });
cpSync(PRODUCT_FLOOR, SPACED, { recursive: true });
cpSync(PRODUCT_FLOOR, UNICODE, { recursive: true });
symlinkSync(SPACED, LINKED, "dir");

test.after(() => rmSync(ROOT, { recursive: true, force: true }));

/** The four invocation shapes every probe is run through. `normal` is the control. */
const SHAPES = [
  ["normal", PRODUCT_FLOOR],
  ["spaced", SPACED],
  ["non-ASCII", UNICODE],
  ["symlinked", LINKED],
];

/** The closed token set `check-lessons-index.mjs --verdict` must print (P5 — membership, never prose). */
const VERDICT_TOKENS = new Set(["NO_CANON", "COLD", "GREEN", "STALE", "ENUM_ERROR"]);

test("✧ check-ship-briefing.mjs REDs identically from every path shape", () => {
  const control = run(join(PRODUCT_FLOOR, "check-ship-briefing.mjs"), ["/nonexistent/BRIEFING.md"]);
  assert.equal(control.code, 1, "precondition: the control invocation must RED");
  assert.match(control.stdout, /^RED — /, "precondition: the control must print a RED line");

  for (const [label, dir] of SHAPES) {
    const got = run(join(dir, "check-ship-briefing.mjs"), ["/nonexistent/BRIEFING.md"]);
    assert.equal(got.code, control.code, `${label}: exit ${got.code} != control ${control.code} — main() did not run`);
    assert.equal(got.stdout, control.stdout, `${label}: stdout differs from the control invocation`);
  }
});

test("✧ check-lessons-index.mjs --verdict prints a real token from every path shape", () => {
  const control = run(join(PRODUCT_FLOOR, "check-lessons-index.mjs"), [REPO, "--verdict"]);
  const token = control.stdout.trim();
  assert.ok(VERDICT_TOKENS.has(token), `precondition: control printed ${JSON.stringify(token)}, not a member`);

  for (const [label, dir] of SHAPES) {
    const got = run(join(dir, "check-lessons-index.mjs"), [REPO, "--verdict"]);
    // The defect's sharpest form: an empty stdout at exit 0, which is a member of NO token set.
    assert.ok(VERDICT_TOKENS.has(got.stdout.trim()), `${label}: printed ${JSON.stringify(got.stdout)} — not a token`);
    assert.equal(got.stdout, control.stdout, `${label}: token differs from the control invocation`);
    assert.equal(got.code, control.code, `${label}: exit ${got.code} != control ${control.code}`);
  }
});

test("✧ render-cost-record.mjs still receives its argv slice and propagates its exit code", () => {
  // The one-liner site — `process.exit(main(process.argv.slice(2)))` — is the only shape among the ten
  // that passes arguments and forwards a return value, so a careless guard swap can drop either half
  // while every other probe here stays green. The exact message pins the slice: without it `main()`
  // would report the node binary path as the unknown argument instead.
  const control = run(join(PRODUCT_FLOOR, "render-cost-record.mjs"), ["--nope"]);
  assert.equal(control.code, 2, "precondition: an unknown argument must exit 2, not 0 or 1");
  assert.equal(control.stderr, "render-cost-record: unknown argument --nope\n");

  for (const [label, dir] of SHAPES) {
    const got = run(join(dir, "render-cost-record.mjs"), ["--nope"]);
    assert.equal(got.code, 2, `${label}: exit ${got.code} — the return value stopped propagating`);
    assert.equal(got.stderr, control.stderr, `${label}: stderr differs — the argv slice was dropped`);
  }
});

test("importing a guarded script does not execute its main()", () => {
  // Kept as a regression net for the guard's OTHER job, but counted honestly: under `import.meta.main`
  // this holds by the runtime's own definition, so it cannot fail. It is not coverage of the repair.
  const spec = JSON.stringify(pathToFileURL(join(PRODUCT_FLOOR, "check-ship-briefing.mjs")).href);
  const r = spawnSync(process.execPath, ["--input-type=module", "-e", `await import(${spec}); console.log("OK");`], {
    encoding: "utf8",
  });
  assert.equal(r.status, 0, `importing must not exit the process: ${r.stderr}`);
  assert.equal(r.stdout.trim(), "OK");
});

// ── The runtime floor (checks 4–6, 6.50.0) ────────────────────────────────────────────────────────

/** The guard module and the literals every gated CLI must carry (L22 — pinned, never described). */
const RUNTIME_FLOOR = join(PRODUCT_FLOOR, "runtime-floor.mjs");
const { REFUSAL_TAIL } = await import(pathToFileURL(RUNTIME_FLOOR).href);
const STATIC_IMPORT = { product: 'import "./runtime-floor.mjs";', dev: 'import "../../pharn/floor/runtime-floor.mjs";' };
const DYNAMIC_IMPORT = 'await import("./runtime-floor.mjs");';
const INLINE_CHECK = 'if (typeof import.meta.main !== "boolean") {';
/** The CLIs that take NO static import on purpose (a module that cannot load must map to their exit 2). Closed set. */
const NO_STATIC_IMPORT = ["check-instruction-files.mjs", "check-loop-fresh.mjs", "check-quick-scope.mjs"];
/** Lower bound on gated CLIs, measured at 6.50.0 (39 product, 9 dev), so the sweep cannot go vacuous unnoticed. */
const GATED_MIN = { product: 39, dev: 9 };

/** Every gated CLI under `dir`: a non-test script whose executable source uses `import.meta.main`. */
function gatedClis(dir) {
  return floorScripts(dir).filter(
    (n) => n !== "runtime-floor.mjs" && executableSource(readFileSync(join(dir, n), "utf8")).includes(CORRECT_GUARD)
  );
}

const STATIC_IMPORT_RE = /^import[\s{"'*]/;

for (const [label, dir, kind] of [
  ["pharn/floor", PRODUCT_FLOOR, "product"],
  [".dev/floor", DEV_FLOOR, "dev"],
]) {
  test(`✧ every gated CLI under ${label} carries the runtime floor in the pinned position`, () => {
    const clis = gatedClis(dir);
    assert.ok(clis.length >= GATED_MIN[kind], `${label}: ${clis.length} gated CLI(s), below the pinned ${GATED_MIN[kind]}`);
    const offenders = [];
    for (const name of clis) {
      const lines = readFileSync(join(dir, name), "utf8").split("\n");
      const firstImport = lines.find((l) => STATIC_IMPORT_RE.test(l));
      if (kind === "product" && NO_STATIC_IMPORT.includes(name)) {
        const src = lines.join("\n");
        if (firstImport !== undefined) offenders.push(`${name}: listed as import-free but has \`${firstImport}\``);
        const check = src.indexOf(INLINE_CHECK);
        const gate = src.indexOf("\nif (import.meta.main)");
        if (check < 0 || gate < 0 || check > gate) offenders.push(`${name}: no inline feature check above its gate`);
        if (!src.includes(REFUSAL_TAIL)) offenders.push(`${name}: the inline refusal is not REFUSAL_TAIL byte for byte`);
        if (!src.includes(DYNAMIC_IMPORT)) offenders.push(`${name}: no \`${DYNAMIC_IMPORT}\` inside its try`);
      } else if (firstImport !== STATIC_IMPORT[kind]) {
        offenders.push(`${name}: first import is ${JSON.stringify(firstImport)}, not ${JSON.stringify(STATIC_IMPORT[kind])}`);
      }
    }
    assert.deepEqual(offenders, [], `runtime floor missing or misplaced:\n  ${offenders.join("\n  ")}`);
  });
}

test("✧ the import-free set is closed: each listed CLI exists, is gated, and takes no static import", () => {
  const gated = gatedClis(PRODUCT_FLOOR);
  for (const name of NO_STATIC_IMPORT) assert.ok(gated.includes(name), `${name} is not a gated product CLI`);
});

/** A preload that makes `process.versions.node` read as an old release before any floor module evaluates. */
const FAKE_OLD =
  "data:text/javascript," +
  encodeURIComponent(
    'Object.defineProperty(process, "versions", { value: { ...process.versions, node: "22.16.0" }, configurable: true });'
  );

/** Spawn every gated CLI of both floors with `bin` and `pre` (argv before the script), from a scratch cwd. */
function sweep(bin, pre) {
  const cwd = mkdtempSync(join(tmpdir(), "pharn-runtime-floor-"));
  try {
    const results = [];
    for (const [dir, rel] of [
      [PRODUCT_FLOOR, "pharn/floor"],
      [DEV_FLOOR, ".dev/floor"],
    ]) {
      for (const name of gatedClis(dir)) {
        const r = spawnSync(bin, [...pre, join(dir, name)], { cwd, encoding: "utf8", timeout: 30_000 });
        results.push({ cli: `${rel}/${name}`, code: r.status, stdout: r.stdout ?? "", stderr: r.stderr ?? "" });
      }
    }
    return results;
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function assertAllRefused(results, what) {
  const bad = results
    .filter((r) => r.code !== 2 || r.stdout !== "" || !r.stderr.includes(REFUSAL_TAIL))
    .map((r) => `${r.cli}: exit ${r.code}, stdout ${r.stdout.length}B, stderr ${JSON.stringify(r.stderr.slice(0, 160))}`);
  assert.deepEqual(bad, [], `${what}: these CLIs did not refuse:\n  ${bad.join("\n  ")}`);
}

test("✧ under a faked Node 22.16.0 every gated CLI refuses: exit 2, empty stdout, the pinned sentence", () => {
  const results = sweep(process.execPath, [`--import=${FAKE_OLD}`]);
  assert.ok(results.length >= GATED_MIN.product + GATED_MIN.dev, `swept only ${results.length} CLI(s)`);
  assertAllRefused(results, "faked 22.16.0");
});

test(
  "✧ on a real old Node (PHARN_OLD_NODE) every gated CLI refuses",
  { skip: process.env.PHARN_OLD_NODE ? false : "set PHARN_OLD_NODE to an old node binary to run this probe" },
  () => {
    assertAllRefused(sweep(process.env.PHARN_OLD_NODE, []), `PHARN_OLD_NODE=${process.env.PHARN_OLD_NODE}`);
  }
);
