// .dev/floor/source-nul-guard.test.mjs — the family guard against a RAW NUL byte in floor source.
//
// WHY IT LIVES HERE, and why it has no paired checker. It sweeps BOTH floors, so it may only live on
// the `.dev/` side: a user's install ships `pharn/floor/` WITHOUT `.dev/`, so the dependency may point
// `.dev/` → `pharn/` and never the reverse — the same reason `.dev/floor/entry-point-guard.test.mjs`
// and `.dev/floor/lessons-index-core.test.mjs` sweep from here. Like those, it tests a property across
// a directory walk rather than one sibling checker, so there is no `.mjs` to pair with, and inventing
// one for a single membership test would be the speculative addition P7 forbids.
//
// WHAT IT GUARDS. `pharn/floor/merge-findings.mjs` needs a NUL as a dedup-key separator and states the
// convention at its own constant: "Built via `fromCharCode` so the SOURCE stays printable ASCII."
// `pharn/floor/scan-code-missing-error-handling.mjs` needed the same separator and embedded TWO RAW NUL
// BYTES instead (at what were lines 314 and 320) — one inside a comment, one inside the live key
// template. A raw NUL makes the file read as BINARY to line-oriented tooling, and the consequence was
// MEASURED on the pre-fix file rather than assumed: `grep "const key" <file>` printed NOTHING and exited
// 1, while the string was demonstrably present in the bytes. A silent miss at exit 1 is indistinguishable
// from "not there", which is how two raw NULs survived in a shipped floor file.
//
// AND THE OBVIOUS SECOND DETECTOR DOES NOT HOLD — stated because assuming it is what lets the next one
// through. `git diff` did NOT flag this file: it sniffs roughly the first 8000 bytes for a NUL, and these
// sat at offset 18809, so the hunk rendered as ordinary text. Whether git notices depends on WHERE the
// byte lands, which is not a property anyone controls. That is precisely why this guard reads the whole
// buffer instead of trusting either tool.
//
// WHY A TEST AND NOT A BETTER COMMENT (P7 — the trigger is an observed defect, not a hypothetical).
// `.dev/memory-bank/lessons-learned.md` **L25**: a rationale comment reaches only the file it sits in.
// The `merge-findings.mjs` comment was correct, and the sibling that needed it never saw it. **L20**:
// a lesson whose only remedy is discipline recurs, and the second occurrence earns a floor check —
// this convention had exactly two sites and the second one violated it. Per **L29** the deliverable is
// the ENUMERATION, so `FLOORS` below is materialized once and every rule iterates it; per **L36** the
// file list is DISCOVERED from the filesystem rather than hardcoded, and the test is over the raw BYTE
// rather than any textual spelling of it, so a NUL introduced by a different authoring route is still
// caught.
//
// ── Honest scope (P0) — what a green run does and does NOT buy ───────────────────────────────────────
// FLOOR (what green means): no non-test `.mjs` file DIRECTLY under `pharn/floor/` or `.dev/floor/`
//   contains the byte 0x00; the swept set is non-empty in both directories; and the predicate that
//   decides this actually fires on a NUL-bearing buffer and stays silent on a NUL-free one.
// NOT guaranteed, and each bound is a real hole rather than a formality:
//   • ONE BYTE VALUE. It tests 0x00 and nothing else. Every other control character, and every
//     non-ASCII byte, passes untouched. "The source is printable ASCII" is NOT what green means — that
//     claim would be the "written in the contract" → "therefore guaranteed" disease P0 names.
//   • TWO DIRECTORIES, NON-RECURSIVELY. `.claude/hooks/*.cjs` and `.claude/commands/**` — which are
//     product surface too — every `*.md`, and both `test-fixtures/` subtrees are OUTSIDE the sweep.
//     (Measured at authoring time: neither fixture directory holds a `.mjs`, so the non-recursive walk
//     loses nothing TODAY. It would silently lose coverage the day one is added.)
//   • TEST FILES ARE EXCLUDED, including this one. The `!endsWith(".test.mjs")` filter mirrors
//     `entry-point-guard.test.mjs`'s `floorScripts`; a raw NUL in a test file is not caught here.
//   • It says nothing about whether a NUL that IS present is correctly constructed or correctly used.
//     `merge-findings.mjs` and the repaired scanner both still USE a NUL at runtime — that is the
//     point; only the SOURCE encoding is constrained.
//
// Non-LLM, stdlib-only. Determinism (P5): the only branch is a byte-membership test over a sorted,
// filesystem-discovered list; failures name every offending file and line and are handed to a human.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

/**
 * The swept surface, materialized in ONE place so every rule below iterates it (L29). A floor script
 * added later is covered for free; a THIRD floor directory would be added here and nowhere else.
 */
const FLOORS = [
  ["pharn/floor", join(REPO, "pharn", "floor")],
  [".dev/floor", join(REPO, ".dev", "floor")],
];

/**
 * The forbidden byte, built the way the convention requires so THIS file stays printable ASCII too.
 * Writing it as a literal here would make the guard an instance of the defect it exists to catch.
 */
const NUL_BYTE = 0;
const NUL_CHAR = String.fromCharCode(NUL_BYTE);

/** Non-test `.mjs` files directly under `dir`, sorted so failures are filesystem-order-independent. */
function floorScripts(dir) {
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".mjs") && !e.name.endsWith(".test.mjs"))
    .map((e) => e.name)
    .sort();
}

/**
 * THE PREDICATE, extracted so it can be tested in BOTH directions rather than only exercised.
 * Returns the 1-based line numbers holding a raw NUL — empty when the buffer is clean.
 */
function nulLines(buf) {
  if (!buf.includes(NUL_BYTE)) return [];
  const lines = [];
  buf
    .toString("latin1")
    .split("\n")
    .forEach((line, i) => {
      if (line.includes(NUL_CHAR)) lines.push(i + 1);
    });
  return lines;
}

for (const [label, dir] of FLOORS) {
  // L34: "for each X, assert P" says nothing when there are no X. The sweep below is a per-file
  // assertion set whose expected result is an EMPTY offender list, so a broken walk and a clean
  // directory are indistinguishable at the verdict unless the domain is asserted non-empty first.
  test(`✧ ${label} — the swept set is non-empty (the sweep cannot pass vacuously)`, () => {
    const scripts = floorScripts(dir);
    assert.ok(
      scripts.length > 0,
      `${label}: discovered 0 non-test .mjs scripts. The directory moved or the walk broke — ` +
        `every per-file rule below would pass vacuously.`
    );
  });

  test(`✧ no non-test .mjs under ${label} contains a raw NUL byte`, () => {
    const offenders = [];
    for (const name of floorScripts(dir)) {
      const at = nulLines(readFileSync(join(dir, name)));
      if (at.length > 0) offenders.push(`${label}/${name} → line(s) ${at.join(", ")}`);
    }
    assert.deepEqual(
      offenders,
      [],
      `raw NUL byte(s) in floor source. Build the byte with \`String.fromCharCode(0)\` and interpolate ` +
        `it, the way pharn/floor/merge-findings.mjs does — a raw NUL makes grep-based sweeps ` +
        `MISS matching lines, and can make the file binary to git diff depending on the byte's OFFSET:\n  ${offenders.join("\n  ")}`
    );
  });
}

test("✧ the predicate actually fires — a NUL-bearing buffer is flagged, a clean one is not", () => {
  // Driven by SYNTHETIC fixtures on purpose, and this test is the load-bearing half of the file.
  // After the repair the sweep's expected result is an empty offender list, so a predicate that could
  // never return true would leave every rule above green forever — the L34 vacuity argument applied one
  // level down, to the PREDICATE rather than the domain. Raised as finding F1 by /pharn-dev-grill on
  // this increment's plan (.dev/features/nul-bytes-scanner/GRILL.md) and closed here.
  const clean = Buffer.from("const a = 1;\nconst b = 2;\n", "utf8");
  assert.deepEqual(nulLines(clean), [], "a NUL-free buffer must produce no offenders");

  const dirty = Buffer.from(`const a = 1;\nconst k = \`x${NUL_CHAR}y\`;\nconst b = 3;\n`, "utf8");
  assert.deepEqual(nulLines(dirty), [2], "a raw NUL on line 2 must be reported as line 2");

  // The two-NUL, two-line shape of the defect this guard was written for.
  const asShipped = Buffer.from(`a${NUL_CHAR}\nb\nc${NUL_CHAR}\n`, "utf8");
  assert.deepEqual(nulLines(asShipped), [1, 3], "every offending line must be reported, not just the first");
});
