// .dev/floor/check-surface-bump.test.mjs — tests for the per-PR "product bytes moved, so SKILLS_VERSION moved"
// checker (surface-bump-check, audit 2026-10-12 ARCH-2).
//
// What these pin, by group:
//   C  classification: one generated sample per PRODUCT_SURFACE include pattern is IN, one per exclude pattern is
//      OUT although it sits inside an include (L29 — the tests iterate the constant, not a hand-picked member), and
//      the paths the header decides OUT stay out (each named, so a later widening is a visible test edit);
//   B  the CLAUDE.md binding: the back-ticked tokens of the "bump-triggering set" bullet EQUAL the constant's two
//      lists (closure in both directions, L36), every anchor is asserted found before slicing (L60), and each
//      property has a negative control on a mutated copy of the bullet;
//   G  hermetic git fixtures for every verdict and every REFUSAL_STATES member, including the two the plan names as
//      load-bearing: a merge from main that brings product paths in is NOT this PR's change, and a bump in a
//      sibling commit of the same PR counts;
//   W  wiring (L45): the npm script and the ci.yml step are pinned as committed strings, and the committed CI run
//      block is EXECUTED in a shallow checkout of a test merge commit, GREEN with a bump and RED without one.
//
// ── Honest scope (P0) ────────────────────────────────────────────────────────────────────────────────────────────
// A green run means the committed strings and the checker's behaviour on these fixtures are as pinned. It does NOT
// mean CI ran the step on a given PR (admin merges and direct pushes skip it), and the binding proves the constant
// and CLAUDE.md AGREE — never that they name what an install really receives.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, copyFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PRODUCT_SURFACE,
  REFUSAL_STATES,
  INPUT_STATES,
  FIX,
  matchesGlob,
  isProductSurface,
  parseArgs,
  judge,
  main,
} from "./check-surface-bump.mjs";
import { parseGateChain } from "./check-contributing-gates.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECKER = join(HERE, "check-surface-bump.mjs");
const REPO = join(HERE, "..", "..");

// ── helpers ──────────────────────────────────────────────────────────────────────────────────────────────────────

const HOME_DIR = mkdtempSync(join(tmpdir(), "pharn-sbc-home-"));
after(() => rmSync(HOME_DIR, { recursive: true, force: true }));

/** An environment built from scratch: nothing inherited but PATH. */
function cleanEnv(extra = {}) {
  return {
    PATH: `${dirname(process.execPath)}:${process.env.PATH ?? "/usr/bin:/bin"}`,
    HOME: HOME_DIR,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_AUTHOR_NAME: "t",
    GIT_AUTHOR_EMAIL: "t@example.invalid",
    GIT_COMMITTER_NAME: "t",
    GIT_COMMITTER_EMAIL: "t@example.invalid",
    ...extra,
  };
}

function git(cwd, args, env = cleanEnv()) {
  return execFileSync("git", args, { cwd, env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

/** Run the CLI as a child (the real entry point, so the `import.meta.main` gate is exercised); never throws. */
function run(args, cwd) {
  const r = spawnSync(process.execPath, [CHECKER, ...args], { cwd, env: cleanEnv(), encoding: "utf8" });
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

function put(root, rel, text) {
  mkdirSync(dirname(join(root, rel)), { recursive: true });
  writeFileSync(join(root, rel), text);
}

/** A repo on `main` with SKILLS_VERSION 1.0.0, one product file and one non-product file. */
function repo() {
  const root = mkdtempSync(join(tmpdir(), "pharn-sbc-"));
  git(root, ["init", "-q", "-b", "main"]);
  put(root, "SKILLS_VERSION", "1.0.0\n");
  put(root, "pharn/floor/x.mjs", "export const x = 1;\n");
  put(root, "README.md", "readme\n");
  git(root, ["add", "."]);
  git(root, ["commit", "-qm", "base"]);
  return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

function commitAll(root, msg) {
  git(root, ["add", "-A"]);
  git(root, ["commit", "-qm", msg]);
}

/** One concrete path a pattern matches: `**` → `a/b`, `*` inside a segment → `z`. */
function sampleFor(pattern) {
  return pattern
    .split("/")
    .map((s) => (s === "**" ? "a/b" : s.replaceAll("*", "z")))
    .join("/");
}

// ── C: classification ────────────────────────────────────────────────────────────────────────────────────────────

test("C1 (L29): a sample for EVERY include pattern is product surface — iterated from the constant", () => {
  assert.ok(PRODUCT_SURFACE.include.length >= 14, "the set is not empty or truncated (L34)");
  for (const p of PRODUCT_SURFACE.include) {
    const s = sampleFor(p);
    assert.ok(matchesGlob(p, s), `${p} must match its own sample ${s}`);
    assert.ok(isProductSurface(s), `${s} (from ${p}) must be product surface`);
  }
});

test("C2 (L29): a sample for EVERY exclude pattern, placed inside an include, is NOT product surface", () => {
  const inside = {
    "**/*.test.*": ["pharn/floor/z.test.mjs", ".claude/hooks/z.test.cjs", "pharn/pharn-core/a/z.test.md"],
    ".claude/commands/pharn-dev-*.md": [".claude/commands/pharn-dev-ship.md"],
  };
  assert.deepEqual(Object.keys(inside).sort(), [...PRODUCT_SURFACE.exclude].sort(), "one case list per exclude pattern");
  for (const [p, paths] of Object.entries(inside)) {
    for (const s of paths) {
      assert.ok(
        PRODUCT_SURFACE.include.some((i) => matchesGlob(i, s)),
        `${s} must sit inside an include, or the case proves nothing (L60)`
      );
      assert.ok(matchesGlob(p, s), `${p} must match ${s}`);
      assert.equal(isProductSurface(s), false, `${s} is excluded by ${p}`);
    }
  }
});

test("C3: the paths the header decides OUT are not product surface (each a named decision)", () => {
  for (const s of [
    "pharn/floor/README.md", // shipped status unknown to this repo (GATE 1, Q1)
    "pharn/floor/test-fixtures/green/x.mjs",
    "pharn/floor/fixtures/cost-ledger/a.json",
    "pharn/features/README.md",
    "pharn/features/loop-decision-integrity/SPEC.md",
    "pharn.spec-template.md",
    ".claude/settings.local.json",
    ".claude/worktrees/agent-x/pharn/floor/x.mjs",
    ".claude/commands/README.md",
    ".claude/agents/other.md",
    "pharn/pharn-pipeline/other/x.md",
    "CLAUDE.md",
    "README.md",
    "CHANGELOG.md",
    "SKILLS_VERSION",
    "MIN_CLI",
    "package.json",
    ".github/workflows/ci.yml",
    "docs/capabilities/x.md",
    ".dev/floor/check-surface-bump.mjs",
    ".dev/features/x/PLAN.md",
  ]) {
    assert.equal(isProductSurface(s), false, s);
  }
});

test("C4: the decided-IN members named at GATE 1 are product surface", () => {
  for (const s of [
    "pharn/floor/lens-family-map.json",
    "pharn/floor/lens-scanner-map.json",
    "pharn/floor/reconcile-ignore.json",
    "pharn/floor/validate.mjs",
    ".claude/commands/pharn-ship-quick.md",
  ]) {
    assert.ok(isProductSurface(s), s);
  }
});

test("C5: the glob matcher — `*` stays inside one segment, `**` spans zero or more", () => {
  assert.ok(matchesGlob("pharn/floor/*.mjs", "pharn/floor/a.mjs"));
  assert.ok(!matchesGlob("pharn/floor/*.mjs", "pharn/floor/sub/a.mjs"), "* never crosses /");
  assert.ok(!matchesGlob("pharn/floor/*.mjs", "pharn/floor/a.mjs.bak"));
  assert.ok(matchesGlob("pharn/pharn-core/**", "pharn/pharn-core/x.md"), "** matches one level");
  assert.ok(matchesGlob("pharn/pharn-core/**", "pharn/pharn-core/a/b/c.md"), "** matches many levels");
  assert.ok(!matchesGlob("pharn/pharn-core/**", "pharn/pharn-corex/a.md"));
  assert.ok(matchesGlob("**/*.test.*", "a.test.mjs"), "** matches zero leading segments");
  assert.ok(!matchesGlob("**/*.test.*", "a/test.mjs"));
  assert.ok(!matchesGlob(".claude/settings.json", ".claude/settings.jsonx"));
  assert.ok(!matchesGlob("LIMITS.md", "limits.md"), "case-sensitive, as git reports names");
});

// ── B: the CLAUDE.md binding ─────────────────────────────────────────────────────────────────────────────────────

const LABEL = "**The bump-triggering set (the product surface), concretely:**";
const NEVER = "**Never in it, even inside those:**";
const CHECKED = "**Checked:**";

/**
 * The bullet's two token lists, or { error } when an anchor is missing (L60: never slice on an absent anchor).
 * The bullet runs from its label to the next top-level bullet, and every anchor must sit INSIDE it; whitespace
 * is collapsed inside the bullet so a formatter's re-wrap cannot move an anchor.
 */
function bulletLists(text) {
  const t = text.replace(/\r\n/g, "\n");
  const a = t.indexOf(LABEL);
  if (a === -1) return { error: "label" };
  const end = t.indexOf("\n- ", a);
  if (end === -1) return { error: "end" };
  const bullet = t.slice(a + LABEL.length, end).replace(/\s+/g, " ");
  const n = bullet.indexOf(NEVER);
  if (n === -1) return { error: "never" };
  const c = bullet.indexOf(CHECKED, n);
  if (c === -1) return { error: "checked" };
  const toks = (s) => [...s.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
  return { include: toks(bullet.slice(0, n)), exclude: toks(bullet.slice(n + NEVER.length, c)) };
}

/** Set equality in both directions, reported as the two differences. */
function diff(listed, constant) {
  return { missing: constant.filter((x) => !listed.includes(x)), extra: listed.filter((x) => !constant.includes(x)) };
}

const CLAUDE = readFileSync(join(REPO, "CLAUDE.md"), "utf8");

test("✧ B1 (L36 closure): CLAUDE.md's bullet lists EXACTLY PRODUCT_SURFACE.include and .exclude", () => {
  const lists = bulletLists(CLAUDE);
  assert.equal(lists.error, undefined, `CLAUDE.md lost the ${lists.error} anchor of the bump-triggering bullet`);
  assert.deepEqual(diff(lists.include, PRODUCT_SURFACE.include), { missing: [], extra: [] }, "include list");
  assert.deepEqual(diff(lists.exclude, PRODUCT_SURFACE.exclude), { missing: [], extra: [] }, "exclude list");
  assert.equal(new Set(lists.include).size, lists.include.length, "no token listed twice");
});

test("✧ B2 negative controls (L60): a dropped, an added and a swapped token each break the binding", () => {
  const dropped = CLAUDE.replace("`pharn/floor/*.json`", "pharn/floor/*.json");
  assert.deepEqual(diff(bulletLists(dropped).include, PRODUCT_SURFACE.include).missing, ["pharn/floor/*.json"]);
  const added = CLAUDE.replace("`LIMITS.md`;", "`LIMITS.md`, `pharn/floor/README.md`;");
  assert.notEqual(added, CLAUDE, "the mutation must apply");
  assert.deepEqual(diff(bulletLists(added).include, PRODUCT_SURFACE.include).extra, ["pharn/floor/README.md"]);
  const swapped = CLAUDE.replace("`**/*.test.*` and", "and");
  assert.notEqual(swapped, CLAUDE, "the mutation must apply");
  assert.deepEqual(diff(bulletLists(swapped).exclude, PRODUCT_SURFACE.exclude).missing, ["**/*.test.*"]);
  for (const [anchor, key] of [
    [LABEL, "label"],
    [NEVER, "never"],
    [CHECKED, "checked"],
  ]) {
    const spelled = new RegExp(anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+"));
    const mutated = CLAUDE.replace(spelled, "**renamed:**");
    assert.notEqual(mutated, CLAUDE, `the ${key} mutation must apply`);
    assert.equal(bulletLists(mutated).error, key, `a renamed ${key} anchor is reported, never sliced past`);
  }
});

// ── G: git fixtures ──────────────────────────────────────────────────────────────────────────────────────────────

test("G1: a PR that changes a product path without a bump is RED NOT_BUMPED (exit 1) and lists the path", () => {
  const { root, cleanup } = repo();
  try {
    git(root, ["switch", "-qc", "pr"]);
    put(root, "pharn/floor/x.mjs", "export const x = 2;\n");
    commitAll(root, "edit");
    const r = run(["--merge-base", "main", "."], root);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /\[NOT_BUMPED\] 1 product-surface path\(s\) changed but SKILLS_VERSION is still "1\.0\.0": "pharn\/floor\/x\.mjs"/);
    assert.match(r.out, /FIX \(NOT_BUMPED\)/);
  } finally {
    cleanup();
  }
});

test("G2: the same change WITH a bump in a SIBLING commit of the PR is GREEN (the PR's net diff, never per commit)", () => {
  const { root, cleanup } = repo();
  try {
    git(root, ["switch", "-qc", "pr"]);
    put(root, "pharn/floor/x.mjs", "export const x = 2;\n");
    commitAll(root, "edit");
    put(root, "SKILLS_VERSION", "1.0.1\n");
    commitAll(root, "bump");
    const r = run(["--merge-base", "main", "."], root);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /GREEN — 1 product-surface path\(s\) changed; SKILLS_VERSION "1\.0\.0" -> "1\.0\.1"/);
  } finally {
    cleanup();
  }
});

test("G3: a PR that touches only non-product paths is GREEN and says no product path changed", () => {
  const { root, cleanup } = repo();
  try {
    git(root, ["switch", "-qc", "pr"]);
    put(root, "README.md", "changed\n");
    put(root, "pharn/floor/x.test.mjs", "test\n");
    put(root, ".claude/commands/pharn-dev-ship.md", "dev\n");
    commitAll(root, "meta");
    const r = run(["--merge-base", "main", "."], root);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /GREEN — no product-surface path changed \(3 path\(s\) compared\)/);
  } finally {
    cleanup();
  }
});

test("✧ G4: product files a merge from main brought in are NOT this PR's change (--merge-base after merging main)", () => {
  const { root, cleanup } = repo();
  try {
    git(root, ["switch", "-qc", "pr"]);
    put(root, "README.md", "pr change\n");
    commitAll(root, "pr");
    git(root, ["switch", "-q", "main"]);
    put(root, "pharn/floor/y.mjs", "export const y = 1;\n");
    put(root, "SKILLS_VERSION", "1.1.0\n");
    commitAll(root, "main moved with a bump");
    git(root, ["switch", "-q", "pr"]);
    git(root, ["merge", "-q", "--no-edit", "main"]);
    const r = run(["--merge-base", "main", "."], root);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /no product-surface path changed \(1 path\(s\) compared\)/, "only README.md is this PR's");
  } finally {
    cleanup();
  }
});

test("G4 negative control: against the OLD base the merged-in product file IS listed — so G4 is not vacuous (L60)", () => {
  const { root, cleanup } = repo();
  try {
    const oldBase = git(root, ["rev-parse", "HEAD"]);
    git(root, ["switch", "-qc", "pr"]);
    put(root, "README.md", "pr change\n");
    commitAll(root, "pr");
    git(root, ["switch", "-q", "main"]);
    put(root, "pharn/floor/y.mjs", "export const y = 1;\n");
    commitAll(root, "main moved WITHOUT a bump");
    git(root, ["switch", "-q", "pr"]);
    git(root, ["merge", "-q", "--no-edit", "main"]);
    const stale = run(["--base-ref", oldBase, "."], root);
    assert.equal(stale.code, 1, stale.out);
    assert.match(stale.out, /"pharn\/floor\/y\.mjs"/);
    const fresh = run(["--merge-base", "main", "."], root);
    assert.equal(fresh.code, 0, fresh.out);
  } finally {
    cleanup();
  }
});

test("G5: head is the WORKING TREE — an uncommitted edit and an untracked new product file each RED", () => {
  const { root, cleanup } = repo();
  try {
    put(root, "pharn/floor/x.mjs", "export const x = 3;\n");
    const edited = run(["--base-ref", "HEAD", "."], root);
    assert.equal(edited.code, 1, edited.out);
    assert.match(edited.out, /"pharn\/floor\/x\.mjs"/);
    git(root, ["checkout", "-q", "--", "pharn/floor/x.mjs"]);
    put(root, ".claude/agents/pharn-new.md", "agent\n");
    const untracked = run(["--base-ref", "HEAD", "."], root);
    assert.equal(untracked.code, 1, untracked.out);
    assert.match(untracked.out, /"\.claude\/agents\/pharn-new\.md"/);
    put(root, "SKILLS_VERSION", "1.1.0\n");
    const bumped = run(["--base-ref", "HEAD", "."], root);
    assert.equal(bumped.code, 0, bumped.out);
  } finally {
    cleanup();
  }
});

test("G6: a move OUT of the surface counts as deleting a surface path (--no-renames)", () => {
  const { root, cleanup } = repo();
  try {
    mkdirSync(join(root, "attic"));
    renameSync(join(root, "pharn/floor/x.mjs"), join(root, "attic/x.mjs"));
    commitAll(root, "move out");
    const r = run(["--base-ref", "HEAD^1", "."], root);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /"pharn\/floor\/x\.mjs"/);
  } finally {
    cleanup();
  }
});

test("G7: a sibling worktree under .claude/worktrees/ is one untracked entry and never product surface", () => {
  const { root, cleanup } = repo();
  try {
    const wt = join(root, ".claude", "worktrees", "agent-x");
    mkdirSync(wt, { recursive: true });
    git(wt, ["init", "-q", "-b", "main"]);
    put(wt, "pharn/floor/x.mjs", "export const x = 9;\n");
    git(wt, ["add", "."]);
    git(wt, ["commit", "-qm", "inner"]);
    const listed = git(root, ["ls-files", "--others", "--exclude-standard"]);
    assert.equal(listed, ".claude/worktrees/agent-x/", "git lists the nested repository as ONE directory entry");
    const r = run(["--base-ref", "HEAD", "."], root);
    assert.equal(r.code, 0, r.out);
  } finally {
    cleanup();
  }
});

test("G8: SKILLS_VERSION's trailing newline alone is not a bump", () => {
  assert.equal(judge({ paths: ["LIMITS.md"], baseVersion: "1.0.0", headVersion: "1.0.0" }).ok, false);
  const { root, cleanup } = repo();
  try {
    put(root, "LIMITS.md", "limits\n");
    put(root, "SKILLS_VERSION", "1.0.0");
    const r = run(["--base-ref", "HEAD", "."], root);
    assert.equal(r.code, 1, r.out);
  } finally {
    cleanup();
  }
});

test("✧ R (L29): every REFUSAL_STATES member is reached, with its own FIX and the exit its class promises", () => {
  assert.deepEqual(Object.keys(FIX).sort(), [...REFUSAL_STATES].sort(), "one FIX per state, no extras");
  assert.ok(INPUT_STATES.every((s) => REFUSAL_STATES.includes(s)));
  const { root, cleanup } = repo();
  const seen = new Map();
  const note = (r) => {
    const m = r.out.match(/- \[([A-Z_]+)\]/);
    assert.ok(m, r.out);
    seen.set(m[1], r.code);
  };
  try {
    note(run(["--base-ref"], root));
    note(run(["--base-ref", "main", "--merge-base", "main"], root));
    note(run(["--base-ref", "-oops"], root));
    note(run(["--base-ref", "no-such-ref"], root));
    note(run(["--base-ref", "main", join(root, "missing")], root));
    put(root, "pharn/floor/x.mjs", "export const x = 4;\n");
    note(run(["--base-ref", "main", "."], root));
    rmSync(join(root, "SKILLS_VERSION"));
    const headGone = run(["--base-ref", "main", "."], root);
    assert.match(headGone.out, /\[HEAD_UNREADABLE\].*SKILLS_VERSION/, headGone.out);
    git(root, ["add", "-A"]);
    git(root, ["commit", "-qm", "drop version"]);
    put(root, "SKILLS_VERSION", "1.0.0\n");
    const baseGone = run(["--base-ref", "HEAD", "."], root);
    assert.match(baseGone.out, /\[BASE_UNREADABLE\].*version step/, baseGone.out);
  } finally {
    cleanup();
  }
  for (const s of REFUSAL_STATES) {
    assert.ok(seen.has(s), `state ${s} was never reached`);
    assert.equal(seen.get(s), INPUT_STATES.includes(s) ? 2 : 1, `exit for ${s}`);
  }
});

test("R3 (GATE-2 review R1): a subdirectory target is HEAD_UNREADABLE, never a mixed root/cwd-relative path set", () => {
  const { root, cleanup } = repo();
  try {
    put(root, "pharn/floor/SKILLS_VERSION", "1.0.0\n");
    put(root, "pharn/floor/x.mjs", "export const x = 5;\n");
    const r = run(["--base-ref", "HEAD", "pharn/floor"], root);
    assert.equal(r.code, 2, r.out);
    assert.match(r.out, /\[HEAD_UNREADABLE\].*not the repository root \(it is "pharn\/floor\/"\)/);
    const fromRoot = run(["--base-ref", "HEAD", "."], root);
    assert.equal(fromRoot.code, 1, "negative control: the same change judged from the root is RED");
  } finally {
    cleanup();
  }
});

test("R2: parseArgs refuses a second target and an unknown flag, and defaults the target to cwd", () => {
  assert.match(parseArgs(["--base-ref", "main", "a", "b"]).error, /more than one target/);
  assert.match(parseArgs(["--base-file", "x"]).error, /unknown flag/);
  assert.deepEqual(parseArgs(["--merge-base", "origin/main"]).target, ".");
  let out = "";
  assert.equal(main(["--nope"], { out: (s) => (out += s) }), 2);
  assert.match(out, /\[BAD_USAGE\]/);
});

// ── W: wiring ────────────────────────────────────────────────────────────────────────────────────────────────────

const SCRIPT = "check:surface-bump";
const SCRIPT_LINE = "node .dev/floor/check-surface-bump.mjs --merge-base origin/main .";
const STEP = "SKILLS_VERSION surface-bump check";
const CI_IF = "if: ${{ always() && steps.install.outcome == 'success' && github.event_name == 'pull_request' }}";
const CI_RUN = ['git fetch --no-tags --depth=2 origin "$GITHUB_SHA"', "node .dev/floor/check-surface-bump.mjs --base-ref HEAD^1"];

/** The step's block from its `- name:` line to the next step; asserts the name is present (L60). */
function ciStep() {
  const ci = readFileSync(join(REPO, ".github", "workflows", "ci.yml"), "utf8").replace(/\r\n/g, "\n");
  const start = ci.indexOf(`      - name: ${STEP}\n`);
  assert.ok(start >= 0, "ci.yml must carry the step by its name");
  const rest = ci.slice(start + 1);
  const next = rest.search(/^ {6}- /m);
  return ci.slice(start, next === -1 ? ci.length : start + 1 + next);
}

function runLines(block) {
  const m = block.match(/^ {8}run: \|\n((?: {10}[^\n]*\n?)+)/m);
  assert.ok(m, "the step must carry a literal `run: |` block");
  return m[1]
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => l.slice(10));
}

test("✧ W1: package.json carries check:surface-bump on --merge-base origin/main, OUT of `npm run check`", () => {
  const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
  assert.equal(pkg.scripts[SCRIPT], SCRIPT_LINE);
  assert.ok(!parseGateChain(pkg.scripts.check).includes(SCRIPT), "it needs a base, so it stays out of `check`");
});

test("✧ W2: the ci.yml step — pull requests only, its two run lines, nothing interpolated into run:", () => {
  const block = ciStep();
  assert.ok(
    block.split("\n").some((l) => l.trim() === CI_IF),
    block
  );
  assert.deepEqual(runLines(block), CI_RUN);
  assert.ok(!runLines(block).join("\n").includes("${{"));
  assert.doesNotMatch(block, /^ {8}env:/m);
});

/**
 * EXECUTE the committed run block (L45) the way actions/checkout prepares a pull_request run: a depth-1 fetch of
 * GitHub's test merge commit, checked out detached, GITHUB_SHA set, under `bash -e` (GitHub's default shell).
 * The PR's base side also moved — main gained a bumped product file — so the run proves HEAD^1 excludes it.
 */
function executeCiBlock({ prBumps }) {
  const root = mkdtempSync(join(tmpdir(), "pharn-sbc-ci-"));
  const env = cleanEnv();
  try {
    const seed = join(root, "seed");
    mkdirSync(seed);
    git(seed, ["init", "-q", "-b", "main"], env);
    put(seed, "SKILLS_VERSION", "1.0.0\n");
    put(seed, "pharn/floor/x.mjs", "export const x = 1;\n");
    git(seed, ["add", "."], env);
    git(seed, ["commit", "-qm", "base"], env);
    git(seed, ["switch", "-qc", "pr"], env);
    put(seed, "pharn/pharn-core/skill.md", "a product change\n");
    if (prBumps) put(seed, "SKILLS_VERSION", "1.1.0\n");
    git(seed, ["add", "."], env);
    git(seed, ["commit", "-qm", "pr"], env);
    git(seed, ["switch", "-q", "main"], env);
    // main moves on its own side (a product file; SKILLS_VERSION left alone so the test merge stays clean)
    put(seed, "pharn/floor/y.mjs", "export const y = 1;\n");
    git(seed, ["add", "."], env);
    git(seed, ["commit", "-qm", "main moved"], env);
    git(seed, ["merge", "-q", "--no-ff", "-m", "test merge", "pr"], env);
    const merge = git(seed, ["rev-parse", "HEAD"], env);
    git(seed, ["update-ref", "refs/pull/1/merge", merge], env);
    git(root, ["clone", "-q", "--bare", seed, "bare.git"], env);
    git(seed, ["push", "-q", join(root, "bare.git"), "refs/pull/1/merge"], env);

    const work = join(root, "work");
    mkdirSync(work);
    git(work, ["init", "-q"], env);
    git(work, ["remote", "add", "origin", `file://${join(root, "bare.git")}`], env);
    git(work, ["fetch", "-q", "--no-tags", "--depth=1", "origin", merge], env);
    git(work, ["checkout", "-q", "--detach", merge], env);
    // The checker and its imports, placed where the committed line expects them; ignored so they are not
    // "this PR's" untracked files (the real checkout tracks them).
    mkdirSync(join(work, ".dev", "floor"), { recursive: true });
    for (const f of ["check-surface-bump.mjs", "check-changelog-entry.mjs", "changelog-core.mjs"])
      copyFileSync(join(HERE, f), join(work, ".dev", "floor", f));
    mkdirSync(join(work, "pharn", "floor"), { recursive: true });
    copyFileSync(join(REPO, "pharn", "floor", "runtime-floor.mjs"), join(work, "pharn", "floor", "runtime-floor.mjs"));
    writeFileSync(join(work, ".git", "info", "exclude"), ".dev/\npharn/floor/runtime-floor.mjs\n");

    const r = spawnSync("bash", ["-e", "-c", runLines(ciStep()).join("\n")], {
      cwd: work,
      env: { ...env, GITHUB_SHA: merge },
      encoding: "utf8",
    });
    return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("✧ W3 EXECUTED: the committed CI block is GREEN on a test merge whose PR bumps", () => {
  const { code, out } = executeCiBlock({ prBumps: true });
  assert.equal(code, 0, out);
  assert.match(out, /SURFACE-BUMP: GREEN — 1 product-surface path\(s\) changed; SKILLS_VERSION "1\.0\.0" -> "1\.1\.0"/);
  assert.match(out, /--base-ref HEAD\^1/, "the default target (cwd) and HEAD^1 were what it read");
});

test("✧ W3 EXECUTED NEGATIVE CONTROL: the same block is RED when the PR does not bump, listing only the PR's path", () => {
  const { code, out } = executeCiBlock({ prBumps: false });
  assert.equal(code, 1, out);
  assert.match(out, /\[NOT_BUMPED\] 1 product-surface path\(s\) changed/);
  assert.match(out, /"pharn\/pharn-core\/skill\.md"/);
  assert.doesNotMatch(out, /pharn\/floor\/y\.mjs/, "main's own change is not the PR's");
});
