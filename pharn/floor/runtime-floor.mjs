// pharn/floor/runtime-floor.mjs — refuse to run a floor CLI on a Node that would make it a silent no-op.
//
// WHY IT EXISTS (audit finding P1-A, 2026-10-07; CHANGELOG [6.50.0]). Every floor CLI that gates its entry point on
// `if (import.meta.main)` relies on a property Node added in 22.18 / 24.2. On an older Node `import.meta.main` is
// `undefined`, the gated block never runs, and the process exits 0 having printed nothing. Reproduced on Node 20.13.1
// and 22.16.0: `check-regress.mjs verdict` over a real regression, `check-bash-reconcile.mjs --require-baseline` with no
// baseline, `check-test-stage.mjs` with no SPEC, `check-loop-fresh.mjs`, `run-gates.mjs init` and `stage-verify.mjs` all
// exited 0 with empty output, while Node 22.18 and 24 gave the correct non-zero verdicts. The installer admits Node 20.
//
// WHAT IT DOES. Imported for its side effect as the FIRST import of every gated CLI under both floors, it writes one line
// to stderr and exits 2 when the runtime is below the floor: `import.meta.main` is not a boolean, OR `process.versions.node`
// is older than MIN_NODE (or unparseable). ES modules evaluate their imports in order, depth first, so this module runs
// before any sibling module and before the importing CLI's own body. Exit 2 is the floor's "no usable verdict" code; every
// caller already treats a non-zero exit as a stop. Three CLIs take no static import on purpose (check-instruction-files,
// check-loop-fresh, check-quick-scope: a module that cannot load must map to their own exit 2, never a crash); they carry
// the feature check inline, with REFUSAL_TAIL verbatim, and import this module dynamically inside their `try`.
//
// THE RULE IS THE DOCUMENTED FLOOR, NOT ONLY THE FEATURE. Node 22.18–24.1 has `import.meta.main`, and the audit saw 22.18
// behave. The README has stated "Node 24.2 or newer" since before this file, CI and every contributor gate run Node 24,
// and no other line has been tested anywhere else, so the refusal follows the documented floor. The feature test stays as
// a second condition so a runtime that reports a new version without the property is still refused.
//
// HONEST SCOPE (P0). FLOOR, by construction plus tests: on a runtime below the floor, every gated CLI that imports this
// module first exits 2 with REFUSAL_TAIL on stderr and nothing on stdout. `.dev/floor/entry-point-guard.test.mjs` pins that
// every gated CLI under both floors carries the guard in the pinned position, and spawns each one under a faked
// `process.versions.node`. NOT covered: a floor script with NO entry gate (it runs on any Node and is not affected by the
// defect this file answers), any API a checker uses that an old Node lacks (it would fail loudly, not silently), and a
// caller that ignores exit codes. The faked-version spawn cannot remove `import.meta.main` itself; the feature branch is
// exercised for real only by the opt-in probe in that test (`PHARN_OLD_NODE=<path to an old node>`), by the pure function
// below, and by the run recorded in `.dev/features/node-runtime-floor/`.
//
// Non-LLM, stdlib-only. It must stay import-free so nothing can fail before the check.

/** The documented floor, as numbers. */
export const MIN_NODE = Object.freeze([24, 2, 0]);

/** The fixed sentence every refusal carries. The three inline copies must contain it byte for byte (pinned by a test). */
export const REFUSAL_TAIL =
  "The PHARN floor checkers need Node >= 24.2.0: each gates its CLI on import.meta.main, and on an older Node a checker exits 0 having checked nothing. Upgrade Node, then re-run.";

/** Exit code for a refusal: the floor's "no usable verdict". */
export const REFUSAL_EXIT = 2;

/**
 * Is `version` (a `process.versions.node` string such as "24.13.1") at or above MIN_NODE?
 * Anything that is not three dot-separated non-negative integers (a leading `v` allowed) is NOT — fail closed.
 */
export function meetsFloor(version) {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(version));
  if (!m) return false;
  const got = [Number(m[1]), Number(m[2]), Number(m[3])];
  for (let i = 0; i < 3; i++) {
    if (got[i] > MIN_NODE[i]) return true;
    if (got[i] < MIN_NODE[i]) return false;
  }
  return true;
}

/**
 * The refusal line for this runtime, or null when it may run.
 * @param {boolean} hasMain  whether `import.meta.main` is a boolean in the calling module
 * @param {string} nodeVersion  `process.versions.node`
 * @returns {string|null}
 */
export function runtimeFloorRefusal(hasMain, nodeVersion) {
  if (hasMain === true && meetsFloor(nodeVersion)) return null;
  return `PHARN floor: refusing to run on Node ${String(nodeVersion)}. ${REFUSAL_TAIL}`;
}

const refusal = runtimeFloorRefusal(typeof import.meta.main === "boolean", process.versions.node);
if (refusal !== null) {
  process.stderr.write(`${refusal}\n`);
  process.exit(REFUSAL_EXIT);
}
