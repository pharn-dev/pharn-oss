// .dev/floor/instruction-growth-wiring.test.mjs — THIS REPO'S INSTRUCTION-GROWTH WIRING (stage-load-budget, review finding
// CTX-2, 2026-10-12).
//
// WHAT IT PINS. `pharn/floor/check-instruction-files.mjs --growth` measures the bytes a change adds to the always-loaded
// instruction set (here: CLAUDE.md). Until stage-load-budget it ran only inside a user's `/pharn-verify`; this repo's own
// CLAUDE.md (189 KB → 28 KB at 6.46.1) had no gate. Two invokers now run it, and this file pins both (L45 — a fix that
// lives in the invoker must be pinned AND executed where the invoker is):
//   W1 the npm script `check:instruction-growth` (`--growth --base-rule`), and that it stays OUT of `npm run check`: with no
//      origin/main, `--base-rule` cannot pick a base and exits 2, so the aggregate would go red on such a clone;
//   W2 ci.yml's "Instruction-growth check" step: pull requests only, after a successful install, its two `run:` lines
//      (fetch the merge commit's first parent, then `--growth --base HEAD^1`), and no `${{ }}` interpolated into `run:`;
//   W3 the committed CI `node` line, executed in a two-commit fixture repository: +100 B of CLAUDE.md exits 0 `within`,
//      +3,000 B exits 1 `over` (the negative control), both on the 2,048 B default budget.
// Moved here unchanged from `.dev/floor/stage-load-budget.test.mjs` at that increment's GATE-2 fix pass (REVIEW.md P3: one
// reason to change per file — this one changes with ci.yml and package.json, that one with the stage load sets).
//
// ── Honest scope (P0) ─────────────────────────────────────────────────────────────────────────────────────────────────
// FLOOR (what a green run means): the committed script and step strings are as pinned, and the committed `node` line
//   yields `within` / `over` on the two fixtures.
// NOT guaranteed, and never claimed:
//   - that CI ran the step on a given PR (an admin merge skips required checks; a direct push to main is not a PR);
//   - the `git fetch` line: it needs GitHub's merge ref, so it is pinned as text and never run here;
//   - the verdict's reach: `--growth` is a floor verdict over instruction-files-core.mjs's MODEL of the loader, with that
//     header's known-so-far under-count routes (pharn/LIMITS.md §3e, L67), and a per-PR budget never bounds growth spread over
//     many PRs.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseGateChain } from "./check-contributing-gates.mjs";

const REPO = fileURLToPath(new URL("../../", import.meta.url));

const GROWTH_SCRIPT = "check:instruction-growth";
const GROWTH_SCRIPT_LINE = "node pharn/floor/check-instruction-files.mjs --growth --base-rule";
const CI_STEP_NAME = "Instruction-growth check";
const CI_IF = "if: ${{ always() && steps.install.outcome == 'success' && github.event_name == 'pull_request' }}";
const CI_FETCH = 'git fetch --no-tags --depth=2 origin "$GITHUB_SHA"';
const CI_RUN = "node pharn/floor/check-instruction-files.mjs --growth --base HEAD^1";

/** A ci.yml step's block, from its `- name:` line to the next step or EOF; null when the name is absent (L60). */
function ciStepBlock(ci, name) {
  const lines = ci.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((l) => l.trim() === `- name: ${name}`);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++)
    if (/^\s*- name:/.test(lines[i])) {
      end = i;
      break;
    }
  return lines.slice(start, end);
}

test("✧ W1: package.json carries check:instruction-growth, and keeps it OUT of `npm run check` (it needs a base)", () => {
  const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
  assert.equal(pkg.scripts[GROWTH_SCRIPT], GROWTH_SCRIPT_LINE);
  assert.ok(!parseGateChain(pkg.scripts.check).includes(GROWTH_SCRIPT), "`--base-rule` is inconclusive with no origin/main");
  // CONTROL (L60): a chain that names it is seen.
  assert.ok(parseGateChain(`${pkg.scripts.check} && npm run ${GROWTH_SCRIPT}`).includes(GROWTH_SCRIPT));
});

test("✧ W2: ci.yml runs the instruction-growth check on pull requests, against the merge commit's first parent", () => {
  const ci = readFileSync(join(REPO, ".github", "workflows", "ci.yml"), "utf8");
  const block = ciStepBlock(ci, CI_STEP_NAME);
  assert.ok(block, `ci.yml must carry the step "${CI_STEP_NAME}"`);
  const trimmed = block.map((l) => l.trim());
  assert.ok(trimmed.includes(CI_IF), "the step's `if:` (pull requests only, after a successful install)");
  assert.ok(trimmed.includes("run: |"));
  const runAt = trimmed.indexOf("run: |");
  assert.deepEqual(trimmed.slice(runAt + 1).filter(Boolean), [CI_FETCH, CI_RUN]);
  assert.ok(!trimmed.slice(runAt).join("\n").includes("${{"), "nothing is interpolated into `run:`");
  // CONTROLS (L60): an absent name is null (never a slice to EOF), and the block stops at the next step.
  assert.equal(ciStepBlock(ci, "No such step"), null);
  assert.ok(!block.slice(1).some((l) => /^\s*- name:/.test(l)));
});

test("✧ W3: the committed CI command line, run in a two-commit repository, passes +100 B and fails +3,000 B of CLAUDE.md", () => {
  const ci = readFileSync(join(REPO, ".github", "workflows", "ci.yml"), "utf8");
  const line = ciStepBlock(ci, CI_STEP_NAME)
    .map((l) => l.trim())
    .find((l) => l.startsWith("node "));
  const [node, script, ...args] = line.split(/\s+/);
  assert.equal(node, "node");
  assert.equal(script, "pharn/floor/check-instruction-files.mjs");
  const lines = (n, tag) => Array.from({ length: n }, (_, i) => `${tag} ${String(i).padStart(4, "0")}`).join("\n") + "\n";
  for (const [grow, code, verdict] of [
    [100, 0, "within"],
    [3000, 1, "over"],
  ]) {
    const dir = realpathSync(mkdtempSync(join(tmpdir(), "slb-")));
    try {
      const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
      git("init", "-q", "-b", "work", ".");
      git("config", "user.email", "t@t");
      git("config", "user.name", "t");
      writeFileSync(join(dir, "CLAUDE.md"), lines(50, "base"));
      git("add", "-A");
      git("commit", "-q", "-m", "base");
      let added = "";
      for (let i = 0; Buffer.byteLength(added) < grow; i++) added += `grown line ${String(i).padStart(4, "0")}\n`;
      writeFileSync(join(dir, "CLAUDE.md"), lines(50, "base") + added);
      git("add", "-A");
      git("commit", "-q", "-m", "grow");
      const r = spawnSync(process.execPath, [join(REPO, script), ...args], { cwd: dir, encoding: "utf8" });
      const doc = JSON.parse(r.stdout);
      assert.equal(r.status, code, r.stdout + r.stderr);
      assert.equal(doc.verdict, verdict);
      assert.equal(doc.threshold_source, "default");
      assert.equal(doc.added_bytes, Buffer.byteLength(added));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});
