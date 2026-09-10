// .dev/floor/walker-exclusion.test.mjs — the `.claude/` scan-exclusion probe over EVERY capability walker.
//
// NO `claude -p`, NO git, NO network. Each behavioural test builds a small repo in an os.tmpdir() scratch
// dir and drives each walker's real public surface (subprocess exit + stdout for the four CLIs, the
// exported function for the catalog core).
//
// WHY THIS EXISTS (P7 — the trigger, measured rather than supposed). Every walker's EXCLUDE_SEGMENTS named
// `.claude/commands/` — ONE member of the `.claude/` subtree — so every OTHER `.claude/` subtree was walked
// as this repo's product surface. Claude Code's own worktree feature puts a full nested checkout at
// `.claude/worktrees/<name>/` (git-ignored via `.git/info/exclude`, so `git status` stays clean), and with
// one present, measured in this repo: `validate.mjs` reported 72 capabilities instead of 36 AND STILL EXITED
// 0, `count-lenses` 44 instead of 22, `count-grillers` 26 instead of 13, `npm run docs:check` went RED with
// `duplicate page slug "seam-resolver"`, and `npm test` failed 2 of 3055. The doubling is silent on the one
// checker whose exit code gates a build.
//
// WHY THE SET IS THE DELIVERABLE (lessons-learned L29). The remedy is quantified over "every walker", so
// what ships is the ENUMERATION — `WALKERS` below — with each rule ITERATING it, never an assertion authored
// for whichever walker happened to be in front of the author. A walker added to that array is covered by
// every rule here for free; a walker added to the repo and NOT to that array is covered by nothing, which is
// this file's own honest bound and the reason `WALKERS` sits at the top rather than inline in one test.
//
// WHY CLOSURE, NOT A SECOND MEMBER (lessons-learned L36). Adding `.claude/worktrees/` would re-certify only
// the spelling its author was looking at: an arbitrarily named `.claude/<x>/` reproduces the defect
// identically (asserted below with a name that is not `worktrees`). Rule 1 therefore forbids ANY
// `.claude`-prefixed member narrower than `.claude` itself, so the per-member repair fails this suite.
//
// THE THREE LAYERS, and only the first is the closure claim:
//   1. STRUCTURAL — the declaration names `${sep}.claude${sep}` and nothing narrower. Proves what the source
//      SAYS. It reads the constant's source TEXT, which is the substring-over-contents shape L6 warns about;
//      it is used because the constant is not exported and there is no structured location to read it from —
//      the same reason `constSource()` exists in lessons-index-core.test.mjs. The bound is stated, not
//      waved away: layer 1 never proves what the walker DOES.
//   2. BEHAVIOURAL — each walker's own count is unchanged by a nested checkout, for two structurally
//      different paths. This is what proves the effect.
//   3. NON-VACUITY (lessons-learned L34) — the baseline count is asserted NON-ZERO first, so a walker that
//      excluded everything would FAIL this suite rather than satisfy it. The fixture deliberately carries a
//      `role: verifier` capability for this reason alone: `count-verifiers` reads 0 against the real repo, and
//      "0 before, 0 after" is exactly the vacuous pass L34 names.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { enumerateCapabilities } from "./capability-catalog-core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");

function runCli(rel, targetDir) {
  return spawnSync(process.execPath, [join(repoRoot, rel), targetDir], { encoding: "utf8" });
}

// --- THE ENUMERATION — every rule below iterates this, and nothing else -----------------------------
//
// `count` returns the walker's own notion of "how many capabilities did I see under this target".
// `source` is the repo-relative file whose EXCLUDE_SEGMENTS declaration rule 1 reads.
const WALKERS = [
  {
    id: "validate",
    source: "pharn/floor/validate.mjs",
    count: (dir) => {
      const r = runCli("pharn/floor/validate.mjs", dir);
      const m = /(\d+) capabilities checked/.exec(r.stdout);
      assert.ok(m, `validate.mjs printed no capability count for ${dir}: ${r.stdout}${r.stderr}`);
      return Number(m[1]);
    },
  },
  {
    id: "count-lenses",
    source: "pharn/floor/count-lenses.mjs",
    count: (dir) => JSON.parse(runCli("pharn/floor/count-lenses.mjs", dir).stdout).registered,
  },
  {
    id: "count-grillers",
    source: "pharn/floor/count-grillers.mjs",
    count: (dir) => JSON.parse(runCli("pharn/floor/count-grillers.mjs", dir).stdout).registered,
  },
  {
    id: "count-verifiers",
    source: "pharn/floor/count-verifiers.mjs",
    count: (dir) => JSON.parse(runCli("pharn/floor/count-verifiers.mjs", dir).stdout).registered,
  },
  {
    id: "capability-catalog-core",
    source: ".dev/floor/capability-catalog-core.mjs",
    count: (dir) => enumerateCapabilities(dir).length,
  },
];

// --- fixture ----------------------------------------------------------------------------------------
//
// One capability per role the walkers count, each with the evals validate.mjs requires (P1), so every
// walker's baseline is NON-ZERO — the layer-3 control.
function capability(name, role) {
  return `---
name: ${name}
role: ${role}
kind: pharn-owned
applies: ["universal"]
version: 1.0.0
---

# ${name} — a minimal valid capability used as a walker-exclusion fixture
`;
}

const FIXTURE = {
  "pharn/pharn-review/probe-lens/probe-lens.md": capability("probe-lens", "lens"),
  "pharn/pharn-review/probe-lens/evals/cases/case-1.md": "# Case 1\n",
  "pharn/pharn-review/probe-lens/evals/expected/expected-1.md": "# Expected 1\n",
  "pharn/pharn-pipeline/grillers/probe-griller/probe-griller.md": capability("probe-griller", "griller"),
  "pharn/pharn-pipeline/grillers/probe-griller/evals/cases/case-1.md": "# Case 1\n",
  "pharn/pharn-pipeline/grillers/probe-griller/evals/expected/expected-1.md": "# Expected 1\n",
  "pharn/pharn-core/probe-verifier/probe-verifier.md": capability("probe-verifier", "verifier"),
  "pharn/pharn-core/probe-verifier/evals/cases/case-1.md": "# Case 1\n",
  "pharn/pharn-core/probe-verifier/evals/expected/expected-1.md": "# Expected 1\n",
  // The case the exclusion has ALWAYS covered: a real role-bearing frontmatter in a stage command. It must
  // stay excluded under the widened segment — the widening must not be a behaviour change here.
  ".claude/commands/pharn-dev-review.md": capability("pharn-dev-review", "lens"),
};

function withRepo(fn) {
  const root = mkdtempSync(join(tmpdir(), "pharn-walkerex-"));
  try {
    for (const [rel, body] of Object.entries(FIXTURE)) {
      const p = join(root, rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, body);
    }
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// A nested checkout: the fixture's own `pharn/` tree copied under `.claude/<sub>/`, which is what a git
// worktree of this repo materializes there.
function nestCheckout(root, sub) {
  cpSync(join(root, "pharn"), join(root, ".claude", sub, "pharn"), { recursive: true });
}

// --- LAYER 1 — the CLOSURE assertion (structural) ---------------------------------------------------

test("★ L36 closure: every walker excludes `.claude` WHOLESALE — no narrower `.claude`-prefixed member", () => {
  for (const w of WALKERS) {
    const src = readFileSync(join(repoRoot, w.source), "utf8");
    const decl = /const EXCLUDE_SEGMENTS\s*=\s*\[([\s\S]*?)\]/.exec(src);
    assert.ok(decl, `${w.source}: no EXCLUDE_SEGMENTS declaration found — the enumeration names a walker this rule cannot read`);

    // Every `.claude`-mentioning entry in the declaration, as written.
    const claudeEntries = decl[1].match(/`\$\{sep\}\.claude[^`]*`/g) ?? [];
    assert.deepEqual(
      claudeEntries,
      ["`${sep}.claude${sep}`"],
      `${w.source}: expected exactly one \`.claude\` entry, excluding the subtree WHOLESALE. A narrower member ` +
        `(e.g. \`.claude/commands/\` or \`.claude/worktrees/\`) certifies only the spelling its author saw — ` +
        `that is the per-member repair L36 forbids. Found: ${JSON.stringify(claudeEntries)}`
    );
  }
});

// --- LAYER 3 first — NON-VACUITY, so layer 2 cannot pass over an empty domain (L34) -----------------

test("★ L34 non-vacuity: every walker sees a NON-ZERO baseline in the fixture", () => {
  withRepo((root) => {
    for (const w of WALKERS) {
      const n = w.count(root);
      assert.ok(
        n > 0,
        `${w.id}: baseline count is ${n} — a walker that excluded everything would satisfy the unchanged-count ` +
          `rule vacuously, so this suite refuses to run it over an empty domain`
      );
    }
  });
});

// --- LAYER 2 — BEHAVIOURAL, over two structurally different nested paths ----------------------------

for (const sub of ["worktrees/wt1", "zzz-arbitrary"]) {
  test(`★ a nested checkout at .claude/${sub}/ does NOT change any walker's count`, () => {
    withRepo((root) => {
      const before = WALKERS.map((w) => [w.id, w.count(root)]);
      nestCheckout(root, sub);
      const after = WALKERS.map((w) => [w.id, w.count(root)]);
      assert.deepEqual(
        after,
        before,
        `a nested checkout under .claude/${sub}/ changed a walker's count — it is being walked as product surface`
      );
    });
  });
}

// The `zzz-arbitrary` case above is the load-bearing half: it is not named `worktrees`, so a fix that added
// `.claude/worktrees/` as a second member would pass the first case and FAIL this one. Kept as its own test
// rather than a loop variable comment, because the two names test different claims — the first that the
// observed instance is fixed, the second that the CLASS is.

// --- the control: widening must not lose what the old segment already caught ------------------------

test("★ control: a real role-bearing frontmatter under .claude/commands/ is still excluded", () => {
  withRepo((root) => {
    // The fixture ships a `role: lens` at .claude/commands/pharn-dev-review.md — the /pharn-dev-review case.
    // If the widened segment stopped excluding it, count-lenses would read 2 rather than 1.
    assert.equal(JSON.parse(runCli("pharn/floor/count-lenses.mjs", root).stdout).registered, 1);
    assert.equal(enumerateCapabilities(root).length, 3);
  });
});

// --- the COST of the widening, pinned so it stays stated rather than forgotten ---------------------

test("★ the accepted cost: a capability authored under .claude/ is NOT counted (bounded, not free)", () => {
  // Raised at review as R1. The widening's justification — "nothing under `.claude/` is a capability" —
  // is true of PHARN's own tree and NOT of a user's, and these walkers ship to users. A capability a user
  // authored under `.claude/<x>/` was counted before this change and is not counted after.
  //
  // This test does NOT argue the trade is right; it makes the trade VISIBLE. If a future change intends
  // to start counting user capabilities under `.claude/`, this test fails and forces the decision to be
  // re-taken rather than drifted into. That is the difference between an accepted cost and a silent one.
  withRepo((root) => {
    mkdirSync(join(root, ".claude/my-caps/thing/evals/cases"), { recursive: true });
    mkdirSync(join(root, ".claude/my-caps/thing/evals/expected"), { recursive: true });
    writeFileSync(join(root, ".claude/my-caps/thing/thing.md"), capability("thing", "lens"));
    writeFileSync(join(root, ".claude/my-caps/thing/evals/cases/case-1.md"), "# Case 1\n");
    writeFileSync(join(root, ".claude/my-caps/thing/evals/expected/expected-1.md"), "# Expected 1\n");

    const lenses = JSON.parse(runCli("pharn/floor/count-lenses.mjs", root).stdout);
    assert.equal(lenses.registered, 1, "the user's .claude/-authored lens is deliberately NOT counted");
    assert.ok(!lenses.lenses.some((p) => p.includes(".claude/")), "no .claude/ path may appear in the counted set");
    // And the loss is SILENT — the checker does not warn. Asserted so the silence is on record too.
    const r = runCli("pharn/floor/validate.mjs", root);
    assert.equal(r.status, 0, "validate exits 0 despite the user's capability being dropped — no warning is emitted");
  });
});

test("★ the enumeration is not silently empty", () => {
  // WALKERS is this file's whole deliverable (L29); an empty or truncated array would make every rule
  // above pass while checking nothing. Its members are named so a deletion is a diff a reviewer sees.
  assert.deepEqual(
    WALKERS.map((w) => w.id),
    ["validate", "count-lenses", "count-grillers", "count-verifiers", "capability-catalog-core"]
  );
});
