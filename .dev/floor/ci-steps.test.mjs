// .dev/floor/ci-steps.test.mjs — ✧ pins that two of ci.yml's gate steps exist and are not switched off (7.3.0).
//
// WHY (audit 2026-11-03). `npm run check` and CLAUDE.md say the floor validator and the specified-marker check run in
// CI, but no test held ci.yml to it: deleting the "Validate floor" step, or giving it `if: false`, left every suite
// green. `docs:check` already has this pin (lessons-index-core.test.mjs, L2); this file applies the same shape to the
// validator (in ci.yml and floor.yml) and to `check:markers`. The `if:` assertion is the load-bearing half: matching the
// `run:` line alone would pass a step that never runs.
//
// HONEST RESIDUAL (P0): this pins the workflow FILE. That GitHub ran the job, that the workflow is enabled and that
// branch protection requires the check are harness-layer facts no in-repo test can see.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name) => readFileSync(new URL(`../../.github/workflows/${name}`, import.meta.url), "utf8");
const INSTALL_GATED_IF = "if: ${{ always() && steps.install.outcome == 'success' }}";

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The step (its `- name:` line through its `run:` line) whose `run:` is exactly `run`, or null. */
function stepRunning(yml, run) {
  const re = new RegExp(`^ {6}- name: [^\\n]*\\n(?: {8}[^\\n]*\\n)*? {8}run: ${escape(run)}[ \\t]*$`, "m");
  return yml.match(re)?.[0] ?? null;
}

/** The step's `if:` lines (zero or one in a valid step). */
const ifLines = (step) => step.split("\n").filter((l) => /^ {8}if:/.test(l));

for (const [file, run, expectIf] of [
  ["ci.yml", "node pharn/floor/validate.mjs .", INSTALL_GATED_IF],
  ["ci.yml", "npm run check:markers", INSTALL_GATED_IF],
  ["floor.yml", "node pharn/floor/validate.mjs .", null],
]) {
  test(`✧ ${file} runs \`${run}\`, and its step is not disabled by an \`if:\``, () => {
    const step = stepRunning(read(file), run);
    assert.ok(step, `${file} must contain a step whose \`run:\` is \`${run}\``);
    const ifs = ifLines(step).map((l) => l.trim());
    if (expectIf === null) assert.deepEqual(ifs, [], `${file}'s step must run unconditionally`);
    else assert.deepEqual(ifs, [expectIf], `${file}'s step must carry the install-gated \`if:\` of its sibling steps`);
  });
}

test("✧ the step pin DISCRIMINATES (L4): a disabled, conditioned or missing step fails it", () => {
  const ci = read("ci.yml");
  const run = "node pharn/floor/validate.mjs .";
  const step = stepRunning(ci, run);
  assert.ok(step);
  const disabled = ci.replace(step, step.replace(INSTALL_GATED_IF, "if: false"));
  assert.deepEqual(
    ifLines(stepRunning(disabled, run)).map((l) => l.trim()),
    ["if: false"]
  );
  assert.notDeepEqual(
    ifLines(stepRunning(disabled, run)).map((l) => l.trim()),
    [INSTALL_GATED_IF]
  );
  assert.equal(stepRunning(ci.replace(step, ""), run), null, "a deleted step is not found");
  assert.equal(stepRunning(ci.replace(`run: ${run}`, `run: echo ${run}`), run), null, "a changed command is not the step");
});
