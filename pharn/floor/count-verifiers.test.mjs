// pharn/floor/count-verifiers.test.mjs — hermetic tests for the deterministic verifier-membership counter.
//
// NO `claude -p`, NO git, NO network. Each test builds a small repo in an os.tmpdir() scratch dir and
// asserts the public surface (exit code + stdout JSON) by subprocess — mirroring check-verify.test.mjs.
//
// The ★ tests are load-bearing — they are the whole reason verifier membership is FLOOR, not a grep:
//   • a `role: verifier` string in PROSE or a fenced code block NEVER registers (registered:0) — the
//     exact pipeline-integration-probe finding #3 defect (the old grep matched 8 prose files), PROVEN
//     CLOSED;
//   • a `role: verifier` in REAL `---`-fenced frontmatter registers as exactly one;
//   • a frontmatter `role: verifier` under an EXCLUDED segment (.dev/floor/) is NOT a capability — so the
//     count matches validate.mjs's surface and the live floor count stays 1;
//   • a >=4-dash opening fence (`----`) registers iff validate.mjs would — frontmatterRole now mirrors
//     validate.mjs's parseFrontmatter byte-for-byte, so the two never diverge (REVIEW.md F1, CLOSED).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const CV = join(here, "count-verifiers.mjs");

function run(targetDir) {
  return spawnSync(process.execPath, [CV, targetDir], { encoding: "utf8" });
}
function json(r) {
  return JSON.parse(r.stdout);
}
// Build a hermetic repo of { "rel/path.md": "contents" } in a scratch dir, run the helper, clean up.
function withRepo(files, fn) {
  const root = mkdtempSync(join(tmpdir(), "pharn-countv-"));
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
const REAL_VERIFIER = `---
name: some-verifier
role: verifier
kind: pharn-owned
version: 0.1.0
---

# A real verifier
Its frontmatter declares role: verifier — this is a DECLARATION.
`;

// frontmatter present but WITHOUT a role; the body merely talks about verifiers (prose DATA).
const PROSE_MENTION = `---
name: prose-talker
kind: pharn-owned
version: 0.1.0
---

# Notes about verifiers
This file's frontmatter has no role. In prose we mention role: verifier, which is DATA about
verifiers, not a declaration of one.
`;

// no frontmatter at all; a fenced code block documents how a verifier is declared.
const CODEBLOCK_MENTION = `# How to declare a verifier

\`\`\`yaml
role: verifier
\`\`\`

The block above is documentation, not this file's own frontmatter.
`;

// a real lens capability whose BODY also mentions role: verifier — must count as 0 verifiers.
const LENS_WITH_PROSE = `---
name: a-lens
role: lens
kind: pharn-owned
version: 0.1.0
---

# A lens
We note here that a sibling would set role: verifier — prose, not our frontmatter.
`;

// frontmatter quotes the value — must still register (quote-stripping mirrors validate.mjs).
const QUOTED_VERIFIER = `---
name: quoted-verifier
role: "verifier"
kind: pharn-owned
version: 0.1.0
---

# Quoted
`;

// an UNCLOSED frontmatter fence containing role: verifier (and no later --- rule) — must NOT count.
const MALFORMED_FENCE = `---
name: broken
role: verifier

# No closing fence, so there is no frontmatter block at all.
Body text.
`;

// a >=4-dash opening fence (`----`) declaring role: verifier. validate.mjs's loose `startsWith("---")`
// parses it as frontmatter; after the F1 alignment this counter MUST agree (the prior strict `^---\r?\n`
// regex returned null here). This is the exact REVIEW.md F1 divergence the increment closes.
const FOURDASH_VERIFIER = `----
role: verifier
---
# body
`;

// CRLF frontmatter — parity check: validate.mjs strips the trailing \r via each value's .trim(), so role
// resolves to "verifier"; this counter, now mirroring that algorithm, must match.
const CRLF_VERIFIER = "---\r\nname: x\r\nrole: verifier\r\n---\r\n# body\r\n";

// --- tests ----------------------------------------------------------------------------------------

test("★ THE BUG, PROVEN CLOSED: role: verifier in PROSE and in a CODE BLOCK never registers", () => {
  withRepo({ "pharn-core/a.md": PROSE_MENTION, "pharn-core/b.md": CODEBLOCK_MENTION }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 0, verifiers: [] });
  });
});

test("★ a real `role: verifier` in `---`-fenced frontmatter registers as exactly one", () => {
  withRepo({ "pharn-pipeline/checks/some-verifier.md": REAL_VERIFIER }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 1, verifiers: ["pharn-pipeline/checks/some-verifier.md"] });
  });
});

test("mixed repo: one real verifier + prose mentions + a non-verifier capability → only the real one", () => {
  withRepo(
    {
      "pharn-review/v/V.md": REAL_VERIFIER,
      "pharn-core/prose.md": PROSE_MENTION,
      "pharn-core/codeblock.md": CODEBLOCK_MENTION,
      "pharn-review/lens.md": LENS_WITH_PROSE,
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.deepEqual(json(r), { registered: 1, verifiers: ["pharn-review/v/V.md"] });
    }
  );
});

test("frontmatter role: lens + body prose role: verifier → 0 (only the declared role counts)", () => {
  withRepo({ "pharn-review/lens.md": LENS_WITH_PROSE }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 0, verifiers: [] });
  });
});

test('a quoted `role: "verifier"` registers (quote-stripping mirrors validate.mjs)', () => {
  withRepo({ "pharn-core/q.md": QUOTED_VERIFIER }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 1, verifiers: ["pharn-core/q.md"] });
  });
});

test("a malformed (unclosed) frontmatter fence containing role: verifier → 0", () => {
  withRepo({ "pharn-core/broken.md": MALFORMED_FENCE }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 0, verifiers: [] });
  });
});

test("★ F1 CLOSED: a >=4-dash opening fence (`----`) registers, matching validate.mjs's loose fence", () => {
  withRepo({ "pharn-pipeline/four.md": FOURDASH_VERIFIER }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 1, verifiers: ["pharn-pipeline/four.md"] });
  });
});

test("CRLF frontmatter registers (parity with validate.mjs's slice/trim/split line parse)", () => {
  withRepo({ "pharn-core/crlf.md": CRLF_VERIFIER }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 1, verifiers: ["pharn-core/crlf.md"] });
  });
});

// ENF-3 (6.65.2): a leading UTF-8 BOM used to hide the declaration (0 registered). Twin pair (L4), plus agreement
// with validate.mjs on the same file.
test("✧ ENF-3: a BOM'd verifier registers as its clean twin does, and validate.mjs counts it too", () => {
  const bom = String.fromCharCode(0xfeff); // never a literal: it would be invisible in every diff
  for (const [name, body] of [
    ["clean.md", REAL_VERIFIER],
    ["bom.md", bom + REAL_VERIFIER],
  ]) {
    withRepo({ [`pharn-core/${name}`]: body }, (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.deepEqual(json(r), { registered: 1, verifiers: [`pharn-core/${name}`] });
      const v = spawnSync(process.execPath, [join(here, "validate.mjs"), root], { encoding: "utf8" });
      assert.match(v.stdout, /\b1 capabilities checked/, `${name}: validate.mjs must count the same file`);
    });
  }
});

test("★ a real verifier under an EXCLUDED segment (.dev/floor/) is not a capability → 0", () => {
  withRepo({ ".dev/floor/fake-verifier.md": REAL_VERIFIER, ".claude/commands/also.md": REAL_VERIFIER }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 0, verifiers: [] });
  });
});

test("empty dir (no .md) → registered 0, exit 0 (a clean empty slot, not an error)", () => {
  withRepo({}, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 0, verifiers: [] });
  });
});

test("a nonexistent target dir → nonzero exit, no stdout (fail-closed, P5)", () => {
  withRepo({}, (root) => {
    const r = run(join(root, "does-not-exist"));
    assert.notEqual(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });
});
