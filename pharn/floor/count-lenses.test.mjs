// pharn/floor/count-lenses.test.mjs — hermetic tests for the deterministic lens-membership counter.
//
// NO `claude -p`, NO git, NO network. Each test builds a small repo in an os.tmpdir() scratch dir and
// asserts the public surface (exit code + stdout JSON) by subprocess — mirroring count-verifiers.test.mjs.
//
// The ★ tests are load-bearing — they are the whole reason lens membership is FLOOR, not a grep:
//   • a `role: lens` string in PROSE or a fenced code block NEVER registers (registered:0);
//   • a `role: lens` in REAL `---`-fenced frontmatter registers as exactly one;
//   • a frontmatter `role: lens` under an EXCLUDED segment (.claude/commands/) is NOT a product lens — this
//     is the /pharn-dev-review case: the review COMMAND declares role: lens but is the reviewer, not a
//     reviewed lens, so it must not be spawned by the parallel review (count matches validate.mjs's surface);
//   • parity with validate.mjs's parseFrontmatter (quoted value, >=4-dash fence, CRLF) so membership never
//     diverges from the structural authority.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const CL = join(here, "count-lenses.mjs");

function run(targetDir) {
  return spawnSync(process.execPath, [CL, targetDir], { encoding: "utf8" });
}
function json(r) {
  return JSON.parse(r.stdout);
}
function withRepo(files, fn) {
  const root = mkdtempSync(join(tmpdir(), "pharn-countl-"));
  try {
    for (const [rel, body] of Object.entries(files)) {
      const p = join(root, rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, body);
    }
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// --- fixtures -------------------------------------------------------------------------------------
const REAL_LENS = `---
name: some-lens
role: lens
kind: pharn-owned
version: 0.1.0
---

# A real lens
Its frontmatter declares role: lens — this is a DECLARATION.
`;

// frontmatter present but WITHOUT a role; the body merely talks about lenses (prose DATA).
const PROSE_MENTION = `---
name: prose-talker
kind: pharn-owned
version: 0.1.0
---

# Notes about lenses
This file's frontmatter has no role. In prose we mention role: lens, which is DATA about lenses,
not a declaration of one.
`;

// no frontmatter at all; a fenced code block documents how a lens is declared.
const CODEBLOCK_MENTION = `# How to declare a lens

\`\`\`yaml
role: lens
\`\`\`

The block above is documentation, not this file's own frontmatter.
`;

// a real verifier capability whose BODY also mentions role: lens — must count as 0 lenses.
const VERIFIER_WITH_PROSE = `---
name: a-verifier
role: verifier
kind: pharn-owned
version: 0.1.0
---

# A verifier
We note here that a sibling would set role: lens — prose, not our frontmatter.
`;

// frontmatter quotes the value — must still register (quote-stripping mirrors validate.mjs).
const QUOTED_LENS = `---
name: quoted-lens
role: "lens"
kind: pharn-owned
version: 0.1.0
---

# Quoted
`;

// a >=4-dash opening fence (`----`) declaring role: lens. validate.mjs's loose `startsWith("---")` parses
// it as frontmatter; this counter mirrors that byte-for-byte and MUST agree.
const FOURDASH_LENS = `----
role: lens
---
# body
`;

// CRLF frontmatter — validate.mjs strips the trailing \r via each value's .trim(), so role resolves to
// "lens"; this counter must match.
const CRLF_LENS = "---\r\nname: x\r\nrole: lens\r\n---\r\n# body\r\n";

// --- tests ----------------------------------------------------------------------------------------

test("★ role: lens in PROSE and in a CODE BLOCK never registers (membership is frontmatter, not grep)", () => {
  withRepo({ "pharn-review/a.md": PROSE_MENTION, "pharn-review/b.md": CODEBLOCK_MENTION }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 0, lenses: [] });
  });
});

test("★ a real `role: lens` in `---`-fenced frontmatter registers as exactly one", () => {
  withRepo({ "pharn-review/some-lens/some-lens.md": REAL_LENS }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 1, lenses: ["pharn-review/some-lens/some-lens.md"] });
  });
});

test("★ THE /pharn-dev-review CASE: a role: lens under .claude/commands/ is NOT a product lens → excluded", () => {
  withRepo(
    { "pharn-review/real/real.md": REAL_LENS, ".claude/commands/pharn-dev-review.md": REAL_LENS, ".dev/floor/fake.md": REAL_LENS },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.deepEqual(json(r), { registered: 1, lenses: ["pharn-review/real/real.md"] });
    }
  );
});

test("frontmatter role: verifier + body prose role: lens → 0 (only the declared role counts)", () => {
  withRepo({ "pharn-review/v.md": VERIFIER_WITH_PROSE }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 0, lenses: [] });
  });
});

test('a quoted `role: "lens"` registers (quote-stripping mirrors validate.mjs)', () => {
  withRepo({ "pharn-review/q.md": QUOTED_LENS }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 1, lenses: ["pharn-review/q.md"] });
  });
});

test("a >=4-dash opening fence (`----`) registers, matching validate.mjs's loose fence", () => {
  withRepo({ "pharn-review/four.md": FOURDASH_LENS }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 1, lenses: ["pharn-review/four.md"] });
  });
});

test("CRLF frontmatter registers (parity with validate.mjs's slice/trim/split line parse)", () => {
  withRepo({ "pharn-review/crlf.md": CRLF_LENS }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 1, lenses: ["pharn-review/crlf.md"] });
  });
});

// ENF-3 (6.64.4): a leading UTF-8 BOM used to hide the declaration from both this counter and validate.mjs (0 and
// "GREEN — 0 capabilities checked"). Twin pair (L4): the BOM'd file registers exactly as its clean twin, and
// validate.mjs counts the same file, so the two still agree on membership.
test("✧ ENF-3: a BOM'd lens registers as its clean twin does, and validate.mjs counts it too", () => {
  const bom = String.fromCharCode(0xfeff); // never a literal: it would be invisible in every diff
  for (const [name, body] of [
    ["clean.md", REAL_LENS],
    ["bom.md", bom + REAL_LENS],
  ]) {
    withRepo({ [`pharn-review/${name}`]: body }, (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.deepEqual(json(r), { registered: 1, lenses: [`pharn-review/${name}`] });
      const v = spawnSync(process.execPath, [join(here, "validate.mjs"), root], { encoding: "utf8" });
      assert.match(v.stdout, /\b1 capabilities checked/, `${name}: validate.mjs must count the same file`);
    });
  }
});

test("multiple lenses are returned sorted", () => {
  withRepo({ "pharn-review/z/z.md": REAL_LENS, "pharn-review/a/a.md": REAL_LENS }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 2, lenses: ["pharn-review/a/a.md", "pharn-review/z/z.md"] });
  });
});

test("empty dir (no .md) → registered 0, exit 0 (a clean empty slot, not an error)", () => {
  withRepo({}, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 0, lenses: [] });
  });
});

test("a nonexistent target dir → nonzero exit, no stdout (fail-closed, P5)", () => {
  withRepo({}, (root) => {
    const r = run(join(root, "does-not-exist"));
    assert.notEqual(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });
});
