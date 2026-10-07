#!/usr/bin/env node
// .dev/features/hook-hardening/apply-hook-patch.mjs — HUMAN-RUN. Applies the audit's P3-Q and P3-R fixes to three
// write-guard hooks, which the agent's write tools may not touch (CLAUDE.md hard constraint 1). Run it from the repo
// root on the hook-hardening branch, read the diff, then commit:
//
//     node .dev/features/hook-hardening/apply-hook-patch.mjs && git diff .claude/hooks/
//
// It refuses (exit 1, nothing written) unless every file's current bytes hash to the pinned BEFORE value, and it checks
// every result against the pinned AFTER value before writing anything. Re-running after a successful apply is a no-op.
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
const sha = (s) => createHash("sha256").update(s).digest("hex");
const FILES = [
  {
    rel: ".claude/hooks/protect-trusted-paths.cjs",
    before: "8884f32c1fec45d5f92b8c5a7afc77148d4ee7f571e168f73c750c90fde6911f",
    after: "37b8955a0c696cc1374702f8c7b44f52d4609dac78b42fd5a24bebfe0786a4d7",
    edits: [
      [
        "  while (pending.length) {\n    const seg = pending.shift();\n",
        "  // Read the queue by index: `shift()` is O(n) per call, so draining a long tail past MAX_RESOLVED_SEGMENTS was\n  // quadratic (25k segments 2.7 s, 100k 31 s; audit P3-Q, 2026-10-07). Same segments, same order, same verdict.\n  let at = 0;\n  while (at < pending.length) {\n    const seg = pending[at++];\n",
        2,
      ],
      ["      pending = segs.concat(pending);\n", "      pending = segs.concat(pending.slice(at));\n      at = 0;\n", 1],
      [
        '        .filter((x) => x && x !== ".")\n        .concat(pending);\n',
        '        .filter((x) => x && x !== ".")\n        .concat(pending.slice(at));\n      at = 0;\n',
        1,
      ],
    ],
  },
  {
    rel: ".claude/hooks/enforce-writes-scope.cjs",
    before: "cfc9ad3d4df0dc935b652f21e46ea220751c476db92cb4b9d08bd9e4f672a333",
    after: "e018e9a5746bca63c8555478c6e7f5c5c74b33092cc5f4fd86331fa505ac168a",
    edits: [
      [
        "  while (pending.length) {\n    const seg = pending.shift();\n",
        "  // Read the queue by index: `shift()` is O(n) per call, so draining a long tail past MAX_RESOLVED_SEGMENTS was\n  // quadratic (25k segments 2.7 s, 100k 31 s; audit P3-Q, 2026-10-07). Same segments, same order, same verdict.\n  let at = 0;\n  while (at < pending.length) {\n    const seg = pending[at++];\n",
        1,
      ],
      [
        '        .filter((x) => x && x !== ".")\n        .concat(pending);\n',
        '        .filter((x) => x && x !== ".")\n        .concat(pending.slice(at));\n      at = 0;\n',
        1,
      ],
    ],
  },
  {
    rel: ".claude/hooks/set-writes-scope.cjs",
    before: "42e6db9fc605ab495c7903aa4069e42b35c2630db83948292cb8619857248331",
    after: "fa566784804ba3bbfd1cae92de93b8208eda99cf720792042542222f1fe5445d",
    edits: [
      [
        '// exact-membership test below. NOT a realpath; see the header\'s HONEST BOUND.\nfunction normalizeForTest(entry) {\n  return path.posix.normalize(String(entry).replace(/\\\\/g, "/"));\n}\n',
        '// exact-membership test below. NOT a realpath; see the header\'s HONEST BOUND. Since the audit\'s P3-R (2026-10-07) it\n// also folds Unicode to NFC and case to lower, the way protect-trusted-paths.cjs keys its denylist: on a\n// case-insensitive volume `.CLAUDE/hooks/…` names the same file, and the refusal must not be the layer that misses it.\nfunction normalizeForTest(entry) {\n  return path.posix.normalize(String(entry).replace(/\\\\/g, "/")).normalize("NFC").toLowerCase();\n}\n',
        1,
      ],
    ],
  },
];
const out = [];
for (const f of FILES) {
  const cur = readFileSync(f.rel, "utf8");
  if (sha(cur) === f.after) {
    console.log(`already applied: ${f.rel}`);
    continue;
  }
  if (sha(cur) !== f.before) {
    console.error(`REFUSED: ${f.rel} is not the reviewed version (sha256 ${sha(cur)}). Nothing written.`);
    process.exit(1);
  }
  let next = cur;
  for (const [o, n] of f.edits) next = next.split(o).join(n);
  if (sha(next) !== f.after) {
    console.error(`REFUSED: ${f.rel} did not patch to the pinned result. Nothing written.`);
    process.exit(1);
  }
  out.push([f.rel, next]);
}
for (const [rel, next] of out) {
  writeFileSync(rel, next);
  console.log(`patched: ${rel}`);
}
