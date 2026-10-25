// handfix-7: the dev-floor and fixture fallout of the move —
//  (a) fixtures that linked the WHOLE pharn/ dir into a scratch tree: the state root now lives under pharn/, so the
//      new `pharn`-segment refusal rejects them (and without it the scratch would land INSIDE the repo). pharn/ becomes
//      a real directory whose shipped members are linked one by one;
//  (b) double-escaped regex sources built with new RegExp(`…`) — a fifth spelling the rewrite's rules do not reach;
//  (c) a command byte ceiling raised as a visible diff (the rewrite lengthened pharn-dev-regress.md by 35 bytes);
//  (d) the load-closure rule's project-artifact exemption: pharn/memory-bank/, pharn/.run/ and pharn/spec-template.md
//      are the PROJECT's files that now live under pharn/, exactly like pharn/features/.
const fs = require("fs");
function edit(f, fn) {
  const s = fs.readFileSync(f, "utf8");
  const t = fn(s);
  if (t === s) throw new Error(`${f}: no change`);
  fs.writeFileSync(f, t);
  console.log("ok", f);
}
function once(s, a, b) {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(`${n}x ${a.slice(0, 80)}`);
  return s.replace(a, () => b);
}
const LINK_RE = (repo, dir) => new RegExp(`^( *)symlinkSync\\(join\\(${repo}, "pharn"\\), join\\(${dir}, "pharn"\\)\\);$`, "gm");
const perMember = (repo, dir) => (m, ind) =>
  `${ind}// 7.0.0: the state root is pharn/.run, and a symlinked pharn is refused (it would carry scratch into the repo),\n` +
  `${ind}// so pharn/ is a real directory here whose shipped members are linked one by one.\n` +
  `${ind}mkdirSync(join(${dir}, "pharn"));\n` +
  `${ind}for (const e of readdirSync(join(${repo}, "pharn"))) {\n` +
  `${ind}  if (![".run", ".backup", "features", "memory-bank"].includes(e)) symlinkSync(join(${repo}, "pharn", e), join(${dir}, "pharn", e));\n` +
  `${ind}}`;

// (a)
edit(".dev/floor/command-hygiene.test.mjs", (s) => s.replace(LINK_RE("REPO_ROOT", "dir"), perMember("REPO_ROOT", "dir")));
edit("pharn/floor/ship-outcome-core.test.mjs", (s) => {
  s = once(s, `import { mkdtempSync, rmSync, writeFileSync, mkdirSync, symlinkSync, readFileSync } from "node:fs";`, `import { mkdtempSync, rmSync, writeFileSync, mkdirSync, symlinkSync, readFileSync, readdirSync } from "node:fs";`);
  const t = s.replace(LINK_RE("REPO", "cwd"), perMember("REPO", "cwd"));
  if (t.split("for (const e of readdirSync(join(REPO, \"pharn\")))").length !== 3) throw new Error("ship-outcome: expected 2 sites");
  return t;
});
edit("pharn/floor/stage-direct.test.mjs", (s) => {
  s = once(s, `import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";`, `import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";`);
  return s.replace(LINK_RE("REPO", "root"), perMember("REPO", "root"));
});

// (b) + (c)
edit(".dev/floor/command-hygiene.test.mjs", (s) => {
  const a = "\\\\s+memory-bank\\\\/lessons-learned\\\\.md";
  if (s.split(a).length - 1 !== 4) throw new Error(`hygiene: ${s.split(a).length - 1} double-escaped canon sites, want 4`);
  s = s.split(a).join("\\\\s+pharn\\\\/memory-bank\\\\/lessons-learned\\\\.md");
  return once(s, `  "pharn-dev-regress.md": 22528, // 20,234 B`, `  "pharn-dev-regress.md": 25088, // 22,563 B (7.0.0: the pharn/.run/ paths lengthened it by 35 B)`);
});

// (d)
edit(".dev/floor/stage-load-budget.test.mjs", (s) => {
  s = once(s, " * still matches. `pharn/features/` (the project's own artifacts) is skipped by readClosureOffenders.", " * still matches. The project's own files under `pharn/` (PROJECT_ARTIFACTS) are skipped by readClosureOffenders.");
  s = once(
    s,
    `const PROJECT_ARTIFACTS = "pharn/features/";`,
    `// The PROJECT's own files that live under pharn/ — never PHARN-shipped, so never in a load set. 7.0.0 added the last three
// (pharn-footprint-move: canon, runtime scratch and the project SPEC template moved under pharn/).
const PROJECT_ARTIFACTS = Object.freeze(["pharn/features/", "pharn/memory-bank/", "pharn/.run/", "pharn/spec-template.md"]);`
  );
  return once(s, `    if (path.startsWith(PROJECT_ARTIFACTS) || set.has(path)) continue;`, `    if (PROJECT_ARTIFACTS.some((p) => path.startsWith(p)) || set.has(path)) continue;`);
});
