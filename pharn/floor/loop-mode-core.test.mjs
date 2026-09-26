// pharn/floor/loop-mode-core.test.mjs — the ONE reading of a /pharn-loop run's mode (6.27.0, loop-quick-mode).
//
// Every fixture is a SPEC filled from PHARN's own shipped template (never a hand-typed shape), so a quick reading here
// is the same reading a real /pharn-spec --quick Draft gets. The ✧ PARITY test runs `check-spec.mjs --spec-kind` — the
// CLI /pharn-loop's Step 3 kind read and /pharn-grill --quick shell — over EVERY fixture and requires `loopModeOf` to
// read `quick` exactly when that CLI prints `quick` (L39: one reading, two consumers, held equal). The ★ control flips
// ONLY the kind line and requires the mode to flip with it (L40: the attribution is probed with the condition varied).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LOOP_MODES, loopModeOf } from "./loop-mode-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECK_SPEC = join(HERE, "check-spec.mjs");
const TEMPLATE = readFileSync(join(HERE, "..", "pharn-contracts", "templates", "spec-template.md"), "utf8");
const TEMPLATE_REF = spawnSync(process.execPath, [CHECK_SPEC, "--template-ref", "pharn-default"], { encoding: "utf8" }).stdout.trim();
const TEMPLATE_LINE = `spec_template: ${TEMPLATE_REF}`;

/** A Draft filled from the shipped template: one `unit` criterion, every placeholder filled, no guidance left. */
function draft() {
  return TEMPLATE.replace(/<!--\s*pharn:guidance[\s\S]*?-->\n?/g, "")
    .replace("spec_id: <name>", "spec_id: demo")
    .replace("<the line check-spec.mjs --resolve-template-ref prints>", TEMPLATE_REF)
    .replace("<unit | integration | e2e>", "unit")
    .replace(/<[^>\n]+>/g, "filled");
}

/** Insert `line` as a frontmatter line directly after the `spec_template:` line. */
const withFrontmatterLine = (text, line) => text.replace(`${TEMPLATE_LINE}\n`, `${TEMPLATE_LINE}\n${line}\n`);

/** The Approved form of `text`: `state: Approved` and the pin `check-spec.mjs --hash` computes. */
function approve(dir, text) {
  const p = join(dir, "SPEC.md");
  writeFileSync(p, text);
  const h = spawnSync(process.execPath, [CHECK_SPEC, "--hash", p], { encoding: "utf8" });
  assert.equal(h.status, 0, `fixture: --hash failed: ${h.stderr}`);
  return text.replace("state: Draft", "state: Approved").replace('spec_content_hash: ""', `spec_content_hash: ${h.stdout.trim()}`);
}

/** Each case: a name, how to lay the feature directory out, and the mode it must read. L52 — one case per member. */
const CASES = [
  { name: "a templated spec_kind: quick SPEC in Draft", mode: "quick", spec: () => withFrontmatterLine(draft(), "spec_kind: quick") },
  {
    name: "a templated spec_kind: quick SPEC, Approved and pinned",
    mode: "quick",
    spec: (dir) => approve(dir, withFrontmatterLine(draft(), "spec_kind: quick")),
  },
  {
    name: "a quick SPEC reverted the Step-6a way (Draft, empty hash, no approved_by) — any state reads the kind",
    mode: "quick",
    spec: (dir) =>
      approve(dir, withFrontmatterLine(draft(), "spec_kind: quick"))
        .replace("state: Approved", "state: Draft")
        .replace(/spec_content_hash: [0-9a-f]+/, 'spec_content_hash: ""'),
  },
  {
    name: "spaces and a tab around the value (trimmed, as the pin reads it)",
    mode: "quick",
    spec: () => withFrontmatterLine(draft(), "spec_kind:  quick\t"),
  },
  { name: "no kind line (a feature SPEC)", mode: "full", spec: () => draft() },
  { name: "an explicit spec_kind: feature", mode: "full", spec: () => withFrontmatterLine(draft(), "spec_kind: feature") },
  { name: "spec_kind: test-infra", mode: "full", spec: () => withFrontmatterLine(draft(), "spec_kind: test-infra") },
  { name: "a non-member value (bogus)", mode: "full", spec: () => withFrontmatterLine(draft(), "spec_kind: bogus") },
  { name: "a case variant (QUICK)", mode: "full", spec: () => withFrontmatterLine(draft(), "spec_kind: QUICK") },
  { name: "two kind lines", mode: "full", spec: () => withFrontmatterLine(draft(), "spec_kind: quick\nspec_kind: quick") },
  {
    name: "a body whose first line is the kind line (kind-in-body)",
    mode: "full",
    spec: () => draft().replace(/^(---\r?\n[\s\S]*?\r?\n---\r?\n)/, "$1spec_kind: quick\n"),
  },
  {
    name: "a LEGACY SPEC (no spec_template) carrying spec_kind: quick",
    mode: "full",
    spec: () => withFrontmatterLine(draft(), "spec_kind: quick").replace(`${TEMPLATE_LINE}\n`, ""),
  },
  { name: "no frontmatter at all", mode: "full", spec: () => "# SPEC\n\nspec_kind: quick\n" },
  { name: "no SPEC.md", mode: "full", spec: null },
  { name: "a DIRECTORY named SPEC.md", mode: "full", spec: "directory" },
];

/** Lay one case out in a fresh feature directory, run `fn(dir)`, and clean up. */
function withCase(c, fn) {
  const dir = mkdtempSync(join(tmpdir(), "loop-mode-"));
  try {
    if (c.spec === "directory") mkdirSync(join(dir, "SPEC.md"));
    else if (typeof c.spec === "function") writeFileSync(join(dir, "SPEC.md"), c.spec(dir));
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("✧ LOOP_MODES is exactly [full, quick], frozen (L34)", () => {
  assert.deepEqual([...LOOP_MODES], ["full", "quick"]);
  assert.ok(Object.isFrozen(LOOP_MODES));
});

test("✧ L34 — the case set is non-vacuous: both modes are reached, and quick only by a positive reading", () => {
  assert.ok(CASES.length >= 15, `the enumeration must stay counted (${CASES.length})`);
  assert.ok(CASES.some((c) => c.mode === "quick") && CASES.some((c) => c.mode === "full"));
});

for (const c of CASES) {
  test(`loopModeOf — ${c.name} → ${c.mode}`, () => {
    withCase(c, (dir) => assert.equal(loopModeOf(dir), c.mode));
  });
}

test("✧ PARITY (L39) — on EVERY fixture, loopModeOf is quick iff `check-spec.mjs --spec-kind` prints `quick`", () => {
  let quick = 0;
  for (const c of CASES) {
    withCase(c, (dir) => {
      const r = spawnSync(process.execPath, [CHECK_SPEC, "--spec-kind", join(dir, "SPEC.md")], { encoding: "utf8" });
      const cliQuick = r.status === 0 && r.stdout === "quick\n";
      assert.equal(
        loopModeOf(dir) === "quick",
        cliQuick,
        `${c.name}: loopModeOf ${loopModeOf(dir)}, CLI exit ${r.status} ${JSON.stringify(r.stdout)}`
      );
      if (cliQuick) quick++;
    });
  }
  assert.ok(quick >= 3, "non-vacuous: the CLI printed quick on the quick fixtures");
});

test("★ CONTROL (L40) — flipping ONLY the kind line flips the mode, both ways", () => {
  const dir = mkdtempSync(join(tmpdir(), "loop-mode-flip-"));
  try {
    const quick = withFrontmatterLine(draft(), "spec_kind: quick");
    writeFileSync(join(dir, "SPEC.md"), quick);
    assert.equal(loopModeOf(dir), "quick");
    writeFileSync(join(dir, "SPEC.md"), quick.replace("spec_kind: quick", "spec_kind: feature"));
    assert.equal(loopModeOf(dir), "full", "the same SPEC with only its kind flipped reads full");
    writeFileSync(join(dir, "SPEC.md"), quick);
    assert.equal(loopModeOf(dir), "quick", "and back");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("never throws — a non-string feature directory reads full (fail toward the stricter table)", () => {
  for (const bad of [undefined, null, 42, {}]) assert.equal(loopModeOf(bad), "full", JSON.stringify(bad));
});
