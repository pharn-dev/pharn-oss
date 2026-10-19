// pharn/floor/count-grillers.test.mjs — hermetic tests for the deterministic griller-membership counter.
//
// NO `claude -p`, NO git, NO network. Each test builds a small repo in an os.tmpdir() scratch dir and
// asserts the public surface (exit code + stdout JSON) by subprocess — mirroring count-verifiers.test.mjs.
//
// The ★ tests are load-bearing — they are the whole reason griller membership is FLOOR, not a grep:
//   • a `role: griller` string in PROSE or a fenced code block NEVER registers (registered:0);
//   • a `role: griller` in REAL `---`-fenced frontmatter registers as exactly one;
//   • THE STAGE-COMMAND EXCLUSION: a real `role: griller` under `.claude/commands/` — the shape of the
//     grill STAGE command pharn-dev-grill.md, which itself declares role: griller — is NOT a counted
//     griller, so count-grillers agrees with validate.mjs's capability surface (the live griller count is
//     the PRODUCT griller only, not the stage command);
//   • a >=4-dash opening fence (`----`) registers iff validate.mjs would — frontmatterRole mirrors
//     validate.mjs's parseFrontmatter byte-for-byte, so the two never diverge.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const CG = join(here, "count-grillers.mjs");

function run(targetDir) {
  return spawnSync(process.execPath, [CG, targetDir], { encoding: "utf8" });
}
function json(r) {
  return JSON.parse(r.stdout);
}
// Build a hermetic repo of { "rel/path.md": "contents" } in a scratch dir, run the helper, clean up.
function withRepo(files, fn) {
  const root = mkdtempSync(join(tmpdir(), "pharn-countg-"));
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
const REAL_GRILLER = `---
name: some-griller
role: griller
kind: pharn-owned
version: 0.1.0
---

# A real griller
Its frontmatter declares role: griller — this is a DECLARATION.
`;

// frontmatter present but WITHOUT a role; the body merely talks about grillers (prose DATA).
const PROSE_MENTION = `---
name: prose-talker
kind: pharn-owned
version: 0.1.0
---

# Notes about grillers
This file's frontmatter has no role. In prose we mention role: griller, which is DATA about
grillers, not a declaration of one.
`;

// no frontmatter at all; a fenced code block documents how a griller is declared.
const CODEBLOCK_MENTION = `# How to declare a griller

\`\`\`yaml
role: griller
\`\`\`

The block above is documentation, not this file's own frontmatter.
`;

// a real lens capability whose BODY also mentions role: griller — must count as 0 grillers.
const LENS_WITH_PROSE = `---
name: a-lens
role: lens
kind: pharn-owned
version: 0.1.0
---

# A lens
We note here that a sibling would set role: griller — prose, not our frontmatter.
`;

// frontmatter quotes the value — must still register (quote-stripping mirrors validate.mjs).
const QUOTED_GRILLER = `---
name: quoted-griller
role: "griller"
kind: pharn-owned
version: 0.1.0
---

# Quoted
`;

// an UNCLOSED frontmatter fence containing role: griller (and no later --- rule) — must NOT count.
const MALFORMED_FENCE = `---
name: broken
role: griller

# No closing fence, so there is no frontmatter block at all.
Body text.
`;

// a >=4-dash opening fence (`----`) declaring role: griller. validate.mjs's loose `startsWith("---")`
// parses it as frontmatter; this counter mirrors that, so it MUST agree.
const FOURDASH_GRILLER = `----
role: griller
---
# body
`;

// CRLF frontmatter — parity check with validate.mjs's slice/trim/split line parse.
const CRLF_GRILLER = "---\r\nname: x\r\nrole: griller\r\n---\r\n# body\r\n";

// the grill STAGE command's shape: a real role: griller frontmatter, but it lives under .claude/commands/.
const STAGE_COMMAND = `---
description: "the grill stage command — interrogates a plan"
role: griller
kind: pharn-owned
version: 0.1.0
---

# /pharn-dev-grill — the grill STAGE (a command, NOT a counted griller capability)
`;

// --- tests ----------------------------------------------------------------------------------------

test("★ THE #16 DISCIPLINE: role: griller in PROSE and in a CODE BLOCK never registers", () => {
  withRepo({ "pharn-core/a.md": PROSE_MENTION, "pharn-core/b.md": CODEBLOCK_MENTION }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 0, grillers: [] });
  });
});

test("★ a real `role: griller` in `---`-fenced frontmatter registers as exactly one", () => {
  withRepo({ "pharn-pipeline/grillers/testability/testability.md": REAL_GRILLER }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 1, grillers: ["pharn-pipeline/grillers/testability/testability.md"] });
  });
});

test("★ THE STAGE-COMMAND EXCLUSION: a real role: griller under .claude/commands/ (pharn-dev-grill.md shape) → 0", () => {
  withRepo({ ".claude/commands/pharn-dev-grill.md": STAGE_COMMAND }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 0, grillers: [] });
  });
});

test("mixed repo: one real griller + prose mentions + a non-griller capability → only the real one", () => {
  withRepo(
    {
      "pharn-pipeline/g/G.md": REAL_GRILLER,
      "pharn-core/prose.md": PROSE_MENTION,
      "pharn-core/codeblock.md": CODEBLOCK_MENTION,
      "pharn-review/lens.md": LENS_WITH_PROSE,
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.deepEqual(json(r), { registered: 1, grillers: ["pharn-pipeline/g/G.md"] });
    }
  );
});

test("frontmatter role: lens + body prose role: griller → 0 (only the declared role counts)", () => {
  withRepo({ "pharn-review/lens.md": LENS_WITH_PROSE }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 0, grillers: [] });
  });
});

test('a quoted `role: "griller"` registers (quote-stripping mirrors validate.mjs)', () => {
  withRepo({ "pharn-core/q.md": QUOTED_GRILLER }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 1, grillers: ["pharn-core/q.md"] });
  });
});

test("a malformed (unclosed) frontmatter fence containing role: griller → 0", () => {
  withRepo({ "pharn-core/broken.md": MALFORMED_FENCE }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 0, grillers: [] });
  });
});

test("★ a >=4-dash opening fence (`----`) registers, matching validate.mjs's loose fence", () => {
  withRepo({ "pharn-pipeline/four.md": FOURDASH_GRILLER }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 1, grillers: ["pharn-pipeline/four.md"] });
  });
});

test("CRLF frontmatter registers (parity with validate.mjs's slice/trim/split line parse)", () => {
  withRepo({ "pharn-core/crlf.md": CRLF_GRILLER }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 1, grillers: ["pharn-core/crlf.md"] });
  });
});

// ENF-3 (6.64.3): a leading UTF-8 BOM used to hide the declaration (0 registered). Twin pair (L4), plus agreement
// with validate.mjs on the same file.
test("✧ ENF-3: a BOM'd griller registers as its clean twin does, and validate.mjs counts it too", () => {
  const bom = String.fromCharCode(0xfeff); // never a literal: it would be invisible in every diff
  for (const [name, body] of [
    ["clean.md", REAL_GRILLER],
    ["bom.md", bom + REAL_GRILLER],
  ]) {
    withRepo({ [`pharn-pipeline/${name}`]: body }, (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.deepEqual(json(r), { registered: 1, grillers: [`pharn-pipeline/${name}`] });
      const v = spawnSync(process.execPath, [join(here, "validate.mjs"), root], { encoding: "utf8" });
      assert.match(v.stdout, /\b1 capabilities checked/, `${name}: validate.mjs must count the same file`);
    });
  }
});

test("a real griller under an EXCLUDED segment (.dev/floor/) is not a capability → 0", () => {
  withRepo({ ".dev/floor/fake-griller.md": REAL_GRILLER }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 0, grillers: [] });
  });
});

test("empty dir (no .md) → registered 0, exit 0 (a clean empty slot, not an error)", () => {
  withRepo({}, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { registered: 0, grillers: [] });
  });
});

test("a nonexistent target dir → nonzero exit, no stdout (fail-closed, P5)", () => {
  withRepo({}, (root) => {
    const r = run(join(root, "does-not-exist"));
    assert.notEqual(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });
});
