// handfix-seg.cjs — the PLAN's hand-fix table (SEG), code sites. Run from the root of a tree the rewrite already ran
// over. Every edit is exact-once; a miss throws.
const fs = require("fs");
function ed(f, pairs) {
  let s = fs.readFileSync(f, "utf8");
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${f}: ${n}x ${a.slice(0, 70)}`);
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(f, s);
  console.log("ok", f);
}

// ── scratch-root symlink walks: both segments ─────────────────────────────────────────────────────────────
ed(".claude/hooks/enforce-writes-scope.cjs", [
  [
    `function dotPharnStateBad() {
  const dot = path.join(ROOT, "pharn", ".run");
  try {
    const st = fs.lstatSync(dot);
    if (st.isSymbolicLink()) return true;
  } catch (err) {
    if (err && err.code === "ENOENT") return false;
    return true;
  }
  return false;
}`,
    `function dotPharnStateBad() {
  // Both segments (7.0.0): the scratch root is \`pharn/.run\`, and an lstat of that path alone follows a symlink
  // at \`pharn\` without seeing it. A link at either segment is malformed; ENOENT at either is absence.
  for (const dot of [path.join(ROOT, "pharn"), path.join(ROOT, "pharn", ".run")]) {
    try {
      const st = fs.lstatSync(dot);
      if (st.isSymbolicLink()) return true;
    } catch (err) {
      if (err && err.code === "ENOENT") return false;
      return true;
    }
  }
  return false;
}`,
  ],
  [
    `  try {
    const dot = fs.lstatSync(path.join(root, "pharn", ".run"));
    if (dot.isSymbolicLink()) {
      return { runs: [], scanErrorDirs: RUN_STATE.map((s) => s.dir) };
    }
  } catch (err) {
    if (!err || err.code !== "ENOENT") return { runs: [], scanErrorDirs: RUN_STATE.map((s) => s.dir) };
  }`,
    `  // Both segments of the scratch root (7.0.0), as dotPharnStateBad(): a link at \`pharn\` or at \`pharn/.run\`.
  for (const seg of [path.join(root, "pharn"), path.join(root, "pharn", ".run")]) {
    try {
      const dot = fs.lstatSync(seg);
      if (dot.isSymbolicLink()) {
        return { runs: [], scanErrorDirs: RUN_STATE.map((s) => s.dir) };
      }
    } catch (err) {
      if (!err || err.code !== "ENOENT") return { runs: [], scanErrorDirs: RUN_STATE.map((s) => s.dir) };
      break; // absent: nothing below it can hold a run
    }
  }`,
  ],
]);
ed(".claude/hooks/require-loop-record.cjs", [
  [
    `  for (const p of [path.join(root, "pharn", ".run"), stateDir, dir, file]) {`,
    `  for (const p of [path.join(root, "pharn"), path.join(root, "pharn", ".run"), stateDir, dir, file]) {`,
  ],
]);
ed(".claude/hooks/set-writes-scope.cjs", [
  [
    `  try {
    if (fs.lstatSync(path.join(root, "pharn", ".run")).isSymbolicLink()) {
      unreadable("pharn/.run (a symbolic link)");
      return lines;
    }
  } catch (e) {
    if (!e || e.code !== "ENOENT") unreadable(".pharn");
    return lines;
  }`,
    `  // Both segments of the scratch root (7.0.0): a link at \`pharn\` reaches \`pharn/.run\` unseen.
  for (const seg of ["pharn", "pharn/.run"]) {
    try {
      if (fs.lstatSync(path.join(root, seg)).isSymbolicLink()) {
        unreadable(\`\${seg} (a symbolic link)\`);
        return lines;
      }
    } catch (e) {
      if (!e || e.code !== "ENOENT") unreadable(seg);
      return lines;
    }
  }`,
  ],
]);
ed("pharn/floor/run-marker.mjs", [
  [
    `  const candidates = [join(root, "pharn", ".run"), join(root, "pharn", ".run", command), dir, join(dir, MARKER)];`,
    `  const candidates = [
    join(root, "pharn"),
    join(root, "pharn", ".run"),
    join(root, "pharn", ".run", command),
    dir,
    join(dir, MARKER),
  ];`,
  ],
]);

// ── walks that start AT the state root ──────────────────────────────────────────────────────────────────
ed("pharn/floor/run-gates.mjs", [
  [
    `const STATE_ROOT = ".pharn";`,
    `const STATE_ROOT = "pharn/.run";

/** 7.0.0: the state root sits under \`pharn/\`. A walk that STARTS at the state root lstats the root itself, and that
 *  lstat follows a symlink at \`pharn\` without seeing it, so each such walk first refuses a link at either segment.
 *  ENOENT ends the check (nothing below an absent segment can be a link); any other lstat error refuses. */
function stateRootLinkFree(base) {
  let cur = resolve(base);
  for (const part of STATE_ROOT.split("/")) {
    cur = join(cur, part);
    let st;
    try {
      st = lstatSync(cur);
    } catch (e) {
      return Boolean(e && e.code === "ENOENT");
    }
    if (st.isSymbolicLink()) return false;
  }
  return true;
}`,
  ],
  [
    `function assertContained(outDir, base) {
  const rootAbs = resolve(base, STATE_ROOT);`,
    `function assertContained(outDir, base) {
  if (!stateRootLinkFree(base)) fail("path-containment", \`refusing a state root that traverses a symlink at pharn or \${STATE_ROOT}\`);
  const rootAbs = resolve(base, STATE_ROOT);`,
  ],
  [
    `function noLinkInside(base, relPath) {
  const rootAbs = resolve(base, STATE_ROOT);`,
    `function noLinkInside(base, relPath) {
  if (!stateRootLinkFree(base)) return false;
  const rootAbs = resolve(base, STATE_ROOT);`,
  ],
]);
ed("pharn/floor/build-gate.mjs", [
  [`const STATE_ROOT = ".pharn";`, `const STATE_ROOT = "pharn/.run";`],
  [
    `  const rootAbs = resolve(STATE_ROOT);
  for (const p of [paths.root, out, paths.targets, paths.times(mode)]) {`,
    `  const rootAbs = resolve(STATE_ROOT);
  // 7.0.0: the walks below start AT the state root, whose own lstat follows a link at \`pharn\` above it. Walk the
  // two segments from the project root first, so a link at \`pharn\` or \`pharn/.run\` is refused too.
  const top = containmentWalk(resolve("."), rootAbs);
  if (!top.ok) unusable(\`path-containment: \${STATE_ROOT} \${top.reason}\`);
  for (const p of [paths.root, out, paths.targets, paths.times(mode)]) {`,
  ],
]);

// ── constants and comparisons ───────────────────────────────────────────────────────────────────────────
for (const f of ["pharn/floor/stage-regress.mjs", "pharn/floor/stage-verify.mjs"])
  ed(f, [
    [`const STATE_ROOT = ".pharn";`, `const STATE_ROOT = "pharn/.run"; // walked from the project root, so both segments are lstat'ed`],
  ]);
ed("pharn/floor/seam-config-materialize.mjs", [[`const OUT_DIR = ".pharn";`, `const OUT_DIR = "pharn/.run";`]]);
ed("pharn/floor/stage-agent.mjs", [
  [
    `/** The three state-root components, relative, for messages. */
function stateParts(command, name) {
  return [".pharn", \`pharn/.run/\${command}\`, \`pharn/.run/\${command}/\${name}\`];
}`,
    `/** The state-root components, relative, for messages. Both segments of the scratch root are walked (7.0.0). */
function stateParts(command, name) {
  return ["pharn", "pharn/.run", \`pharn/.run/\${command}\`, \`pharn/.run/\${command}/\${name}\`];
}`,
  ],
  // the run's own directory is the LAST component: the list grew a member, so a fixed index would point one level up
  [`  const dir = join(root, rel[2]);`, `  const dir = join(root, rel[rel.length - 1]); // the run's own directory: the LAST component`],
  [`absent component, or -1 when all three exist as real directories`, `absent component, or -1 when every one exists as a real directory`],
]);
ed("pharn/floor/stage-direct.mjs", [
  [`  for (const rel of [".pharn", LOCK_DIR]) {`, `  for (const rel of ["pharn", "pharn/.run", LOCK_DIR]) {`],
]);
ed("pharn/floor/ac-tests-core.mjs", [
  [`  if (p === ".pharn" || p.startsWith("pharn/.run/")) return`, `  if (p === "pharn/.run" || p.startsWith("pharn/.run/")) return`],
]);
ed("pharn/floor/apply-plan-deletions.mjs", [
  [
    `    if (lower === ".pharn" || lower.startsWith("pharn/.run/") || lower.startsWith("pharn/features/")) {`,
    `    if (lower === "pharn/.run" || lower.startsWith("pharn/.run/") || lower.startsWith("pharn/features/")) {`,
  ],
]);
ed("pharn/floor/test-infra-core.mjs", [
  [
    `  if (segs[0] === "node_modules" || segs[0] === ".pharn") return false;`,
    `  if (segs[0] === "node_modules" || (segs[0] === "pharn" && segs[1] === ".run")) return false;`,
  ],
]);
ed("pharn/floor/worktree-fingerprint.mjs", [
  [
    `  if (file === ".pharn" || file.startsWith(STATE_ROOT_SEGMENT)) return true;`,
    `  if (file === "pharn/.run" || file.startsWith(STATE_ROOT_SEGMENT)) return true;`,
  ],
]);
