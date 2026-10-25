// handfix-6: the release bytes — README install tree, .gitignore, SKILLS_VERSION, MIN_CLI, CHANGELOG [7.0.0].
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

// ── README: the install tree, redrawn (root = .claude/, pharn/, pharn.config.json) ──
ed("README.md", [
  [
    `│   ├── CONSTITUTION.md            # trusted docs (human-only)
│   ├── ARCHITECTURE.md
│   ├── floor/*.mjs                # the deterministic checkers
│   ├── pharn-contracts/           # artifact shapes
│   ├── pharn-pipeline/grillers/   # plan interrogators
│   ├── pharn-review/              # code lenses
│   └── features/<name>/           # per increment, written as you run the pipeline — commit these:
│                                  # SPEC PLAN GRILL AC-TESTS (+ .lock.json) BUILD REGRESSION VERIFY, then SHIP + BRIEFING
│                                  # (/pharn-ship) or LOOP (/pharn-loop), and RUN-REPORT + cost.json
├── pharn/THREAT-MODEL.md                # the other two trusted docs
├── pharn/LIMITS.md
├── pharn.config.json              # skills version + installed commit + models.stages
└── pharn/.run/                        # runtime scratch — add to .gitignore
\`\`\``,
    `│   ├── CONSTITUTION.md            # the four trusted docs (human-only)
│   ├── ARCHITECTURE.md
│   ├── THREAT-MODEL.md
│   ├── LIMITS.md
│   ├── floor/*.mjs                # the deterministic checkers
│   ├── pharn-contracts/           # artifact shapes
│   ├── pharn-pipeline/grillers/   # plan interrogators
│   ├── pharn-review/              # code lenses
│   ├── memory-bank/               # your promoted lessons and patterns (/pharn-memory-promote) — commit these
│   ├── spec-template.md           # optional: your own SPEC template, edited by hand
│   ├── features/<name>/           # per increment, written as you run the pipeline — commit these:
│   │                              # SPEC PLAN GRILL AC-TESTS (+ .lock.json) BUILD REGRESSION VERIFY, then SHIP + BRIEFING
│   │                              # (/pharn-ship) or LOOP (/pharn-loop), and RUN-REPORT + cost.json
│   ├── .run/                      # runtime scratch — gitignore it
│   └── .backup/                   # pharn-cli's backups from \`pharn update\` — gitignore it
└── pharn.config.json              # skills version + installed commit + models.stages
\`\`\`

Add these three lines to your \`.gitignore\`. The middle one is pharn-cli's lock file:

\`\`\`gitignore
pharn/.run/
pharn/.lock*
pharn/.backup/
\`\`\`

Reconcile exempts runtime scratch only through git-ignore. Without the first line, every \`/pharn-verify\` reports
\`pharn/.run/**\` as changed paths. Before 7.0.0 the scratch lived at \`.pharn/\`, and \`memory-bank/\`, the SPEC template
and two of the trusted docs sat at the project root (migration: CHANGELOG [7.0.0]).`,
  ],
]);

// ── .gitignore: the old scratch stays ignored (ci.yml is out of scope), the new paths join it ──
ed(".gitignore", [
  [
    "pharn/.run/*\n!.pharn/ci.yml\n",
    ".pharn/*\n!.pharn/ci.yml\n# 7.0.0: runtime scratch, pharn-cli's backups and its lock file live under pharn/ now. `.pharn/` stays ignored\n# for its `ci.yml` exception (pharn-ci still reads `.pharn/ci.yml`) and for scratch left by a pre-7.0.0 checkout.\npharn/.run/\npharn/.backup/\npharn/.lock*\n",
  ],
]);

fs.writeFileSync("SKILLS_VERSION", "7.0.0\n");
fs.writeFileSync("MIN_CLI", "0.14.0\n");
console.log("ok SKILLS_VERSION 7.0.0, MIN_CLI 0.14.0");

// ── CHANGELOG: open [7.0.0] directly above [6.75.0] and MOVE the [Unreleased] entry into it, unchanged ──
const ENTRY = `- **BREAKING — PHARN's root footprint moves under \`pharn/\`: \`THREAT-MODEL.md\` → \`pharn/THREAT-MODEL.md\`, \`LIMITS.md\`
  → \`pharn/LIMITS.md\`, \`memory-bank/\` → \`pharn/memory-bank/\`, \`pharn.spec-template.md\` → \`pharn/spec-template.md\`,
  and the runtime scratch \`.pharn/\` → \`pharn/.run/\`.** An installed project's PHARN files at the root are now
  \`.claude/\`, \`pharn/\` and the JSON files. \`MIN_CLI\` is \`0.14.0\`: an older CLI would look for the two docs and the
  canon at the old paths.
  - Migration, in this order:
    1. Finish or abandon any open \`/pharn-ship\`, \`/pharn-loop\` or \`/pharn-review\` run first. A run marker or reconcile
       baseline left under \`.pharn/\` is never read again, so an interrupted loop's Stop guard is off.
    2. Run \`pharn update\` with \`@pharn-dev/pharn\` 0.14.0 or later. It moves \`memory-bank/\` and the SPEC template, and
       removes the root copies of the two docs that you never edited. If it reports a move it could not make, make
       that move by hand: until then the root \`memory-bank/\` is not write-protected.
    3. Add \`pharn/.run/\`, \`pharn/.backup/\` and \`pharn/.lock*\` to \`.gitignore\`. This is required: reconcile exempts
       scratch only through git-ignore, so without it every \`/pharn-verify\` reports \`pharn/.run/**\`.
    4. Delete the old \`.pharn/\`, except \`.pharn/ci.yml\`.
  - There is no automatic way back to 6.x. A downgrade means moving the four paths back by hand.
  - The write guards follow the move. \`protect-trusted-paths.cjs\` protects the four moved paths and the
    \`pharn/memory-bank/\` canon, with the same case-fold, trailing dot/space and symlink handling. It no longer
    protects the old root names, which are a user's own files again. \`enforce-writes-scope.cjs\`'s always-writable
    root is \`pharn/.run/**\`. In an installed project outside a run it is exempt from the reserved \`pharn/**\` surface,
    exactly as \`pharn/features/**\` is, and matched as written. A symlink at \`pharn\` or at \`pharn/.run\` is refused
    wherever a symlink at \`.pharn\` was. Non-canon files under \`pharn/memory-bank/\` are reserved outside a run, a
    change in the deny direction. The \`/pharn-loop\` Stop guard reads \`pharn/.run/pharn-loop/\`.
  - Every floor walk that starts at the state root now also refuses a symlink at \`pharn\` above it (\`build-gate\`,
    \`run-gates\`, \`run-marker\`, \`stage-agent\`, \`stage-direct\`). The five capability walkers (\`validate\`, the
    catalog, \`count-grillers\`, \`count-lenses\`, \`count-verifiers\`) skip \`pharn/.run/\`, and also \`pharn/.backup/\`,
    where pharn-cli 0.14 keeps full capability copies.
  - \`worktree-fingerprint\`'s ALGO moves from \`/2\` to \`/3\`, because the state root it excludes moved. A gate stamp
    recorded before the update reads as a moved tree once, so that stage re-runs (the fail-closed direction).
  - Not moved: \`.pharn/ci.yml\`, because pharn-ci still reads it there.
  - Follow-ups in other repositories, not done here:
    - \`pharn-dev/skills\`: \`plugins/pharn/skills/pharn-cli/references/commands.md\` still documents \`.pharn.lock\`,
      \`.pharn-backup/\` and \`memory-bank/\`.
    - \`pharn-dev/pharn-ci\`: probe \`pharn/ci.yml\` before \`.pharn/ci.yml\`. This repository then moves its \`ci.yml\` and
      drops the gitignore exception.
    - \`pharn-dev/phargus\`: a downstream install, which picks the move up through \`pharn update\`.
`;
const C = "CHANGELOG.md";
let c = fs.readFileSync(C, "utf8");
const startKey = "\n### Changed\n\n- 2026-10-25: **The pharn-ci gate moves to v0.2.0";
const endKey = "\n## [6.75.0] - 2026-10-25\n";
const i = c.indexOf(startKey), j = c.indexOf(endKey);
if (i < 0 || j < 0 || j < i || c.split(startKey).length !== 2) throw new Error("CHANGELOG anchors");
const moved = c.slice(i + "\n### Changed\n\n".length, j); // the [Unreleased] entry, byte for byte
c = c.slice(0, i) + "\n## [7.0.0] - 2026-10-25\n\n### Changed\n\n" + ENTRY + "\n" + moved + c.slice(j);
fs.writeFileSync(C, c);
console.log("ok", C);
