// pharn/floor/test-fixtures/virtual-clock/preload.mjs — TEST FIXTURE, never shipped (pharn/floor/test-fixtures/** is
// apparatus). It injects the clock into ONE stage process, so a test of the BUDGET ARITHMETIC measures what the fixture
// says instead of how loaded the machine is (load-flake-regress, 6.72.0).
//
//   node --import <abs path to this file>?git=<arg>,<arg>&ms=<n>[&exact=1][&once=1] <stage script> …
//
// In that process `Date.now()` is FROZEN at its value when this module loads, and moves only by `ms` after each
// `git` call (execFileSync / spawnSync, as stage-runtime.mjs's gitSync makes it) whose argv starts with the `git`
// list — exactly that argv with `exact=1`, the first such call only with `once=1`. So "a slow opening `git` call"
// costs exactly `ms` of budget at any load, and nothing else costs any: a budget window the fixture sizes is then
// decided by the code under test alone. It replaces the PATH shim that slept for real, which could not keep a
// sub-second window for the work AFTER the slow call (the old-clock mutant, the wide-window control) under load.
//
// Only this process's `Date.now()` is virtual: children (git, run-gates.mjs, the gates) keep the real clock, and
// `new Date()` / `performance.now()` are untouched. The stage scripts read `Date.now()` for the budget and for a
// delivery run's identity; the fixtures that load this open no delivery run.

import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";

const q = new URL(import.meta.url).searchParams;
const match = (q.get("git") ?? "").split(",").filter(Boolean);
const stepMs = Number(q.get("ms"));
const exact = q.get("exact") === "1";
const once = q.get("once") === "1";
if (match.length === 0 || !Number.isSafeInteger(stepMs) || stepMs <= 0) {
  throw new Error("virtual-clock preload: needs ?git=<arg>[,<arg>…]&ms=<positive integer>");
}

const frozenAt = Date.now();
let offsetMs = 0;
let fired = false;
Date.now = () => frozenAt + offsetMs;

const isMatch = (file, args) =>
  file === "git" &&
  Array.isArray(args) &&
  (exact ? args.length === match.length : args.length >= match.length) &&
  match.every((a, i) => args[i] === a);

for (const name of ["execFileSync", "spawnSync"]) {
  const real = childProcess[name];
  childProcess[name] = function virtualClockWrapped(file, args, ...rest) {
    try {
      return real.call(this, file, args, ...rest);
    } finally {
      if (isMatch(file, args) && !(once && fired)) {
        fired = true;
        offsetMs += stepMs;
      }
    }
  };
}
syncBuiltinESMExports();
