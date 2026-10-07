// pharn/floor/runtime-floor.test.mjs — the refusal rule of runtime-floor.mjs, as a pure function.
//
// The wiring (every gated CLI imports it first, and refuses under a faked old version) is pinned from
// .dev/floor/entry-point-guard.test.mjs, which sweeps both floors; this file pins only the rule.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { MIN_NODE, REFUSAL_TAIL, REFUSAL_EXIT, meetsFloor, runtimeFloorRefusal } from "./runtime-floor.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

test("✧ the floor is 24.2.0 and a refusal exits 2", () => {
  assert.deepEqual([...MIN_NODE], [24, 2, 0]);
  assert.equal(REFUSAL_EXIT, 2);
  assert.ok(Object.isFrozen(MIN_NODE));
});

test("✧ meetsFloor: at or above 24.2.0 passes, below fails, across every component", () => {
  for (const v of ["24.2.0", "24.2.1", "24.13.1", "24.10.0", "25.0.0", "26.1.0", "100.0.0", "v24.2.0"]) {
    assert.equal(meetsFloor(v), true, v);
  }
  // 24.10 > 24.2 numerically, never lexically; 22.18 has import.meta.main but is below the documented floor.
  for (const v of ["24.1.9", "24.0.0", "22.18.0", "22.16.0", "20.13.1", "18.20.4", "0.0.0"]) {
    assert.equal(meetsFloor(v), false, v);
  }
});

test("✧ meetsFloor fails closed on anything that is not three integers", () => {
  for (const v of ["", "24", "24.2", "24.2.0-pre", "24.x.0", "abc", " 24.2.0", "24.2.0 ", "-24.2.0", undefined, null, 24.2]) {
    assert.equal(meetsFloor(v), false, String(v));
  }
});

test("✧ runtimeFloorRefusal: null only when import.meta.main is a boolean AND the version meets the floor", () => {
  assert.equal(runtimeFloorRefusal(true, "24.13.1"), null);
  for (const [hasMain, v] of [
    [false, "24.13.1"], // a runtime reporting a new version without the property is still refused
    [true, "22.18.0"],
    [false, "22.16.0"],
    [false, "20.13.1"],
    ["true", "24.13.1"], // only a real boolean true counts
    [true, "garbage"],
  ]) {
    const got = runtimeFloorRefusal(hasMain, v);
    assert.equal(typeof got, "string", `${hasMain}/${v}`);
    assert.equal(got, `PHARN floor: refusing to run on Node ${v}. ${REFUSAL_TAIL}`);
  }
});

test("✧ the refusal sentence names the floor and the failure it prevents", () => {
  assert.match(REFUSAL_TAIL, /Node >= 24\.2\.0/);
  assert.match(REFUSAL_TAIL, /import\.meta\.main/);
  assert.match(REFUSAL_TAIL, /exits 0 having checked nothing/);
});

test("on the running Node the module is silent and exits 0 (the control)", () => {
  const r = spawnSync(process.execPath, [join(HERE, "runtime-floor.mjs")], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, "");
  assert.equal(r.stderr, "");
});
