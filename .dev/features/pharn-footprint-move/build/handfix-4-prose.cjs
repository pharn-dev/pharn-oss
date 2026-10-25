// handfix-4: sentences that DESCRIBE the layout, made false by a correct path swap ("pharn/spec-template.md at the
// project root", "pharn/LIMITS.md stay at root"). Protected files are fixed here too: apply.py is generated from
// this copy, so the maintainer's patch carries these edits.
const fs = require("fs");
function ed(f, pairs) {
  let s = fs.readFileSync(f, "utf8");
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${f}: ${n}x ${a.slice(0, 80)}`);
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(f, s);
  console.log("ok", f);
}

ed(".claude/commands/pharn-spec.md", [["`pharn/spec-template.md` at the project root when it exists", "`pharn/spec-template.md` when it exists"]]);
ed("CLAUDE.md", [
  [
    "**Since 6.14.0 it also protects the project's own SPEC template, `pharn/spec-template.md` at the root**, by",
    "**Since 6.14.0 it also protects the project's own SPEC template, `pharn/spec-template.md`** (at the root as\n   `pharn.spec-template.md` before 7.0.0), by",
  ],
]);
ed("docs/pipeline.md", [["to `pharn/spec-template.md` at the project root and edit it", "to `pharn/spec-template.md` and edit it"]]);
ed("pharn/pharn-contracts/spec-template.md", [
  ["| `project`       | `pharn/spec-template.md`, at the project root (optional) | no      |", "| `project`       | `pharn/spec-template.md` (optional)                      | no      |"],
  [
    'It "exists" when an entry in the project root case-folds to its name.',
    'It "exists" when each segment of its path, `pharn` in the project root and then `spec-template.md` in it, has an entry that case-folds to that segment.',
  ],
]);
ed("pharn/floor/spec-template-core.mjs", [[`["project", { rel: join("..", "..", "pharn/spec-template.md"), shipped: false }],`, `["project", { rel: join("..", "..", "pharn", "spec-template.md"), shipped: false }],`]]);
ed(".markdownlint-cli2.jsonc", [
  [
    "  // CONSTITUTION.md + ARCHITECTURE.md relocated under pharn/ (runtime-layout move); pharn/THREAT-MODEL.md +\n  // pharn/LIMITS.md stay at root. pharn/floor/test-fixtures",
    "  // All four live under pharn/: CONSTITUTION.md + ARCHITECTURE.md since the runtime-layout move, THREAT-MODEL.md +\n  // LIMITS.md since 7.0.0 (pharn-footprint-move). pharn/floor/test-fixtures",
  ],
]);
ed(".prettierignore", [
  [
    "# CONSTITUTION.md + ARCHITECTURE.md relocated under pharn/ (runtime-layout move); pharn/THREAT-MODEL.md +\n# pharn/LIMITS.md stay at root (dev docs, not installed).",
    "# All four live under pharn/: CONSTITUTION.md + ARCHITECTURE.md since the runtime-layout move, THREAT-MODEL.md +\n# LIMITS.md since 7.0.0 (pharn-footprint-move).",
  ],
]);
ed("README.md", [["plus `pharn/THREAT-MODEL.md` and\n  `pharn/LIMITS.md` at the root,", "plus `pharn/THREAT-MODEL.md` and\n  `pharn/LIMITS.md`,"]]);
// ── protected (carried by apply.py) ──
ed(".claude/hooks/protect-trusted-paths.cjs", [
  ["the project's own SPEC template, pharn/spec-template.md at the root (see the entry in", "the project's own SPEC template, pharn/spec-template.md (see the entry in"],
  [
    "// is a user's OWN unrelated pharn/memory-bank/ at the guarded root — structural, exactly as for the\n// root-level pharn/THREAT-MODEL.md / pharn/LIMITS.md / CODEOWNERS entries.",
    "// is a user's OWN unrelated pharn/memory-bank/ at the guarded root — structural, exactly as for the\n// pharn/THREAT-MODEL.md / pharn/LIMITS.md / CODEOWNERS entries.",
  ],
  [
    "// • Root-level entries (pharn/THREAT-MODEL.md, pharn/LIMITS.md, CODEOWNERS) still over-block a user's own\n//   same-named file at the guarded root. That is structural: PHARN's own copies live there.",
    "// • Fixed-path entries (pharn/THREAT-MODEL.md, pharn/LIMITS.md, CODEOWNERS) still over-block a user's own\n//   file at that path. That is structural: PHARN's own copies live there.\n//   (Migration, 7.0.0: a root LIMITS.md or THREAT-MODEL.md is a user's own file again.)",
  ],
]);
ed("pharn/LIMITS.md", [["the project's own, `pharn/spec-template.md` at the project root\n(6.14.0)", "the project's own, `pharn/spec-template.md`\n(6.14.0; migration: the root `pharn.spec-template.md` before 7.0.0)"]]);
ed("pharn/THREAT-MODEL.md", [["`pharn/spec-template.md` at the project root (6.14.0).", "`pharn/spec-template.md` (6.14.0;\n   migration: the root `pharn.spec-template.md` before 7.0.0)."]]);
