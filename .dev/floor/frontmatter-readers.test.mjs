// .dev/floor/frontmatter-readers.test.mjs — the .dev/floor frontmatter readers agree with pharn/floor/frontmatter-core.mjs
// (6.65.2, frontmatter-parser-parity — audit ENF-3 / ENF-4).
//
// The dev twin of pharn/floor/frontmatter-core.test.mjs's two closures. L31: the second copy of an obligation needs its
// own enumeration, and a pharn/floor test must not reach into .dev/ (a user's install ships pharn/floor without .dev/).
// The predicates are the same spellings as there. Both closures are LEXICAL: they range over source text, so a module
// that strips one variable and tests the fence on another, or that spells the key class differently, passes them — the
// per-site tests (check-config, capability-catalog-core, and the BOM'd part below) are what read behaviour.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { frontmatterFields, withoutFrontmatter } from "./command-family.mjs";

const DEV_FLOOR = new URL(".", import.meta.url).pathname;
const ANCHOR_IDIOM_RE = /\bFM_RE\b|\bmatchFrontmatter\(|startsWith\("---"|\/\^---/;
const APPLIES_STRIP_RE = /\bstripBom\(|\bmatchFrontmatter\(/;
const LINE_GRAMMAR_RE = /\^(?:-\[ \\t\]\+)?\(\[A-Za-z_\]/;

function devFloorModules() {
  return readdirSync(DEV_FLOOR)
    .filter((n) => n.endsWith(".mjs") && !n.endsWith(".test.mjs"))
    .map((n) => [n, readFileSync(join(DEV_FLOOR, n), "utf8")]);
}

test("✧ .dev/floor: every module that tests the frontmatter fence strips the BOM first (closure; L60 controls)", () => {
  const readers = devFloorModules().filter(([, src]) => ANCHOR_IDIOM_RE.test(src));
  const names = readers.map(([n]) => n);
  for (const n of ["capability-catalog-core.mjs", "check-config.mjs", "command-family.mjs"]) {
    assert.ok(names.includes(n), `L34: the idiom must find ${n}`);
  }
  assert.deepEqual(
    readers.filter(([, src]) => !APPLIES_STRIP_RE.test(src)).map(([n]) => n),
    [],
    "strip the BOM with pharn/floor/frontmatter-core.mjs stripBom (or read through matchFrontmatter) before the fence test"
  );
  assert.match('if (!text.startsWith("---")) return {};', ANCHOR_IDIOM_RE);
  assert.doesNotMatch('if (!text.startsWith("---")) return {};', APPLIES_STRIP_RE);
});

test("✧ .dev/floor: no module declares its own `key: value` line grammar (closure; L60 controls)", () => {
  assert.deepEqual(
    devFloorModules()
      .filter(([, src]) => LINE_GRAMMAR_RE.test(src))
      .map(([n]) => n),
    [],
    "read `key: value` lines with pharn/floor/frontmatter-core.mjs fieldEntries"
  );
  assert.match(String.raw`const kv = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);`, LINE_GRAMMAR_RE);
  assert.doesNotMatch(String.raw`const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);`, LINE_GRAMMAR_RE);
});

test("✧ ENF-3: a BOM'd part reads and strips exactly as its clean twin (frontmatterFields, withoutFrontmatter)", () => {
  const bom = String.fromCharCode(0xfeff); // never a literal: it would be invisible in every diff
  const clean = '---\npart_of: pharn-loop.md\npart: "quick"\npart: close\n---\n# Title\nbody\n';
  assert.deepEqual(frontmatterFields(bom + clean), frontmatterFields(clean));
  assert.deepEqual(frontmatterFields(clean), { part_of: "pharn-loop.md", part: "close" }, "the last copy of a repeated key wins");
  assert.equal(withoutFrontmatter(bom + clean), "# Title\nbody\n");
  assert.equal(withoutFrontmatter(clean), "# Title\nbody\n");
  assert.equal(frontmatterFields(`${bom}# no frontmatter\n`), null, "not a mask: no block is still no block");
});
