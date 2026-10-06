// .dev/features/claude-md-bootstrap/split.mjs — ONE-OFF migration for the `claude-md-bootstrap` increment.
//
// Reads the BASE root CLAUDE.md from git (never the working tree, so a re-run is reproducible) and writes:
//   • the new root CLAUDE.md — base lines kept BYTE-FOR-BYTE by range, plus the few NEW lines declared below;
//   • ten `.dev/guides/*.md` files — base lines moved VERBATIM by range, under navigation headings.
// Every range is in base line numbers (1-indexed, inclusive). check-migration.mjs, beside this file, verifies the
// accounting independently. Bash write (L19): it writes exactly the paths PLAN.md `## Files` declares.
//
// Usage: node .dev/features/claude-md-bootstrap/split.mjs   (from the repo root)

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

export const BASE = "6ff4dd1ac064087660c03e20b48571868ab45863";

export function baseLines() {
  const text = execFileSync("git", ["show", `${BASE}:CLAUDE.md`], { encoding: "utf8", maxBuffer: 1 << 26 });
  const lines = text.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines; // lines[i - 1] is base line i
}

const range = (L, a, b) => L.slice(a - 1, b);

// ---------------------------------------------------------------- NEW root lines (the only text not in base)
export const NEW_INDEX = [
  "## Guidance index — read before the action it governs",
  "",
  "Read the named source in your own context before the action: another agent's or session's read does not count, and",
  "after compaction re-read anything no longer in view. If unsure whether a line applies, read it. If a source is missing",
  "or unreadable, halt and ask (P6).",
  "",
  "- Planning or editing a write guard, a writes-scope, `--allow-claude-dir` or `.pharn/` state, or after a write is",
  "  denied: `.dev/guides/writes-scope.md`.",
  "- Bumping `SKILLS_VERSION` or `MIN_CLI`, moving an installed path, or changing a contract or frontmatter shape that",
  "  existing installs read: `.dev/guides/versioning.md`.",
  "- Planning a change to, running or citing a floor CLI (`pharn/floor/`, `.dev/floor/`, `.claude/hooks/`): its `##`",
  "  section in `.dev/guides/floor-{checks,gates,ac-tests,orchestration}.md` (`grep -n '<file>' .dev/guides/floor-*.md`).",
  "- Planning or editing a `.claude/commands/pharn-*.md` product command or part: `.dev/guides/product-commands.md`.",
  "- Changing a lessons step, `check-plan-lessons`, a lessons index or memory-bank handling: `.dev/guides/lessons.md`.",
  "- A `docs:check` RED or an `ENUM_ERROR`: `.dev/guides/generated-docs.md`.",
  "- Proposing a product capability catalog or `/pharn-eval`: `.dev/guides/deferred-decisions.md`.",
  '- Writing a CHANGELOG entry or opening a PR: `CONTRIBUTING.md`, "Run the gates before you push" and "CHANGELOG entries".',
  "",
];
export const NEW_FAILCLOSED_TAIL = [
  "  `.claude/**`, and root files stay **denied** until an explicit `writes:` declaration names them. The installed-project",
  "  posture: `.dev/guides/writes-scope.md`.",
];
export const NEW_DENY_TAIL = [
  "  scope-setter** — _never_ to bypass the hook (an in-repo write routed through Bash is a bypass). The five deny",
  "  bodies: `.dev/guides/writes-scope.md`.",
];

// ---------------------------------------------------------------- the root, by base range
export function buildRoot(L) {
  return [
    ...range(L, 1, 20),
    ...NEW_INDEX,
    ...range(L, 21, 51),
    ...range(L, 86, 106),
    "",
    ...range(L, 134, 152),
    ...range(L, 163, 196),
    ...range(L, 1433, 1498),
    ...NEW_FAILCLOSED_TAIL,
    L[1571 - 1],
    ...NEW_DENY_TAIL,
    ...range(L, 1622, 1637),
    "",
    ...range(L, 1661, 1742),
    ...range(L, 1765, 1768),
    ...range(L, 1803, 1818),
    "",
    ...range(L, 1903, 1912),
  ];
}

// ---------------------------------------------------------------- the guides
const SOURCE = "root `CLAUDE.md` at `6ff4dd1` (SKILLS_VERSION 6.46.0)";
function header(title, readWhen, extra = []) {
  return [
    `# ${title}`,
    "",
    `Moved out of the always-loaded ${SOURCE} by \`claude-md-bootstrap\`. The text is the moved text, unchanged except`,
    "for the `##` headings added for navigation and the leading indentation Prettier normalizes. The root `CLAUDE.md`",
    "still holds the rules every session needs; this file adds detail and does not override them.",
    "",
    `**Read when:** ${readWhen}`,
    ...extra,
    "",
  ];
}
const section = (h, lines) => [`## ${h}`, "", ...lines, ""];
const fenced = (h, lines) => section(h, ["```bash", ...lines, "```"]);

const FLOOR_NOTE = [
  "",
  "Read only the section for the CLI you are touching. Positional words inside an entry (`above`, `below`, `further up`)",
  "come from the single code block this text was moved from, so the entry they name may now sit in another",
  "`.dev/guides/floor-*.md` file: search for it by file name.",
];

// Each floor entry: [first base line, last base line, heading]. Blocks are the blank-separated entries of base 198–1430.
const FLOOR = {
  "floor-checks.md": {
    title: "Floor CLI reference — checks, provenance, config and repo-meta",
    readWhen:
      "before planning a change to, running, or citing one of the CLIs below (and `CLAUDE.md`'s SKILLS_VERSION rules decide whether the change bumps).",
    entries: [
      [198, 218, "`validate.mjs` — the deterministic floor"],
      [220, 222, "`check-structural.mjs` — an eval's structural assertions"],
      [224, 238, "`check-plan-lessons.mjs` — the `applied_lessons` declaration"],
      [240, 267, "`reconcile-baseline.mjs` / `check-bash-reconcile.mjs` — Bash-write reconciliation"],
      [269, 290, "`run-marker.mjs` — the run marker"],
      [292, 313, "`feature-name.mjs` — a feature name before any shell line"],
      [1178, 1197, "`pharn/floor/check-provenance.mjs` — product provenance"],
      [1199, 1211, "`pharn/floor/gen-lessons-index.mjs` / `check-lessons-index.mjs` — product lessons index"],
      [1213, 1228, "`.dev/floor/check-provenance.mjs` — dev provenance"],
      [1230, 1271, "`check-model-config.mjs` — product model configuration"],
      [1349, 1366, "`.dev/floor/check-config.mjs` — dev model configuration"],
      [1368, 1383, "`check-specified-markers.mjs` — specified markers"],
      [1385, 1390, "`.dev/floor/gen-lessons-index.mjs` / `check-lessons-index.mjs` — dev lessons index"],
      [1392, 1407, "`check-version-badge.mjs` — README badge"],
      [1409, 1426, "`check-contributing-gates.mjs` — CONTRIBUTING gate list"],
      [1428, 1430, "Write-guard hook self-test"],
    ],
  },
  "floor-gates.md": {
    title: "Floor CLI reference — the gate runner and the regress/verify/build stage scripts",
    readWhen: "before planning a change to, running, or citing one of the CLIs below.",
    entries: [
      [315, 378, "`run-gates.mjs` / `worktree-fingerprint.mjs` — the gate runner"],
      [380, 390, "Gate exclusion (`gates.exclude`)"],
      [392, 421, "Per-test results (`PHARN_TEST_RESULTS`)"],
      [651, 667, "`check-verify.mjs --stamp` / `check-regress.mjs verdict` — the stamp surface"],
      [669, 730, "`stage-regress.mjs` — the /pharn-regress stage script"],
      [732, 748, "Base-evidence reuse (regress)"],
      [750, 776, "Head→verify gate reuse"],
      [778, 812, "`stage-verify.mjs` — the /pharn-verify stage script"],
      [814, 831, "`install-drift.mjs` — the head install check"],
      [833, 850, "`build-gate.mjs` — /pharn-build's project gate"],
      [852, 879, "`check-quick-scope.mjs` — the quick scope check"],
      [881, 890, "`check-instruction-files.mjs` — the instruction-growth gate"],
      [892, 913, "`pre-run-snapshot.mjs` — the pre-run snapshot"],
      [915, 923, "`entry-gates.mjs` — the entry gates"],
    ],
  },
  "floor-ac-tests.md": {
    title: "Floor CLI reference — acceptance-criteria tests",
    readWhen: "before planning a change to, running, or citing one of the CLIs below.",
    entries: [
      [423, 489, "`check-ac-tests.mjs` / `ac-tests-lock.mjs` / `check-red-run.mjs` — AC tests and the red run"],
      [491, 511, "`check-test-stage.mjs` — the test-stage gate"],
      [513, 562, "`check-verify.mjs --ac-gate` — the AC gate"],
    ],
  },
  "floor-orchestration.md": {
    title: "Floor CLI reference — /pharn-loop and /pharn-ship stops, records, ledgers and routing",
    readWhen: "before planning a change to, running, or citing one of the CLIs below.",
    entries: [
      [564, 576, "`check-loop.mjs` — the /pharn-loop stop core"],
      [578, 620, "`check-loop-fresh.mjs` — freshness"],
      [622, 649, "`require-loop-record.cjs` — the /pharn-loop stop guard"],
      [925, 936, "`check-loop-record.mjs` — loop-record shape"],
      [938, 952, "`check-loop-decision.mjs` — re-derive a loop decision"],
      [954, 969, "`loop-closeout.mjs` / `ship-closeout.mjs` — the closeouts"],
      [971, 1062, "`mark-phase.mjs` / `render-cost-ledger.mjs` / `check-cost-ledger.mjs` — the cost ledger"],
      [1064, 1106, "`ship-outcome-core.mjs` — a /pharn-ship run's ledger outcome"],
      [1108, 1161, "`render-run-report.mjs` — RUN-REPORT.md"],
      [1163, 1176, "`render-ship-briefing.mjs` / `check-ship-briefing.mjs` — the GATE-2 briefing"],
      [1273, 1327, "`stage-agent.mjs` — stage-model routing"],
      [1329, 1347, "`stage-direct.mjs` — the direct stage call"],
    ],
  },
};

const PROSE = {
  "writes-scope.md": [
    "Writes-scope (fix #7) — detail",
    "before planning or editing a write guard, a hook's wiring, a writes-scope, the setter's `--allow-claude-dir` flag, or anything under `.pharn/`; and after any write is denied. The root `CLAUDE.md` section \"Writes-scope (fix #7 — fail-closed)\" and hard constraint 1 hold the rules; this file holds the postures, the deny bodies and the reasons.",
    [
      [153, 162, "Why `.pharn/writes-scope.json` is guarded by protect-trusted-paths (hard constraint 1)"],
      [1493, 1531, "Fail-closed — every posture (dev, unsignalled, installed)"],
      [1532, 1543, "Every write is judged at every target it can reach"],
      [1544, 1563, "A PHARN run keeps the fail-closed default standing (installed projects)"],
      [1564, 1570, "The root every scope entry is relative to"],
      [1571, 1613, "When a write is blocked — the five deny bodies"],
      [1615, 1621, "The setter refuses to scope the guards themselves"],
      [1638, 1659, "What under `.pharn/` is load-bearing"],
    ],
  ],
  "versioning.md": [
    "Versioning — the installer, MIN_CLI and CHANGELOG cites",
    'before editing `SKILLS_VERSION` or `MIN_CLI`, relocating an installed path, or changing a contract or frontmatter shape that existing installs read. The bump rules stay in the root `CLAUDE.md` ("SKILLS_VERSION discipline"); the CHANGELOG rules are owned by `CONTRIBUTING.md` ("CHANGELOG entries").',
    [
      [52, 63, "The installer, and what SKILLS_VERSION versions"],
      [65, 84, "`MIN_CLI`"],
      [129, 132, "Cite the CHANGELOG by version section"],
    ],
  ],
  "product-commands.md": [
    "Product commands — the command budget and part files",
    'before planning or editing a `.claude/commands/pharn-*.md` product command or one of its part files. `CONTRIBUTING.md` ("Editing product commands") summarizes the same rules for contributors.',
    [
      [1769, 1784, "A product command keeps what a run executes"],
      [1785, 1802, "A command's text a run needs at only ONE point may live in a PART file"],
    ],
  ],
  "lessons.md": [
    "Lessons — `applied_lessons` and the lessons indexes",
    'before changing a plan or grill stage\'s lessons step, `pharn/floor/check-plan-lessons.mjs`, either lessons index, or how a command reads a memory-bank. These points elaborate the root `CLAUDE.md` bullet "Every PLAN declares `applied_lessons` (floor-checked)"; `/pharn-dev-plan` Step 1.4 holds the sweep a plan runs.',
    [
      [1743, 1764, "`applied_lessons` — sub-check D, re-verification, a project with no memory-bank"],
      [1864, 1901, "The lessons index is an address book"],
    ],
  ],
  "generated-docs.md": [
    "Generated docs — when `docs:check` is RED",
    'on a `docs:check` RED, before regenerating, and on an `ENUM_ERROR`. The rule itself stays in the root `CLAUDE.md` bullet "Three doc regions are GENERATED — never hand-edit them."',
    [[1819, 1826, "Short-circuits and the one case regenerating cannot fix"]],
  ],
  "deferred-decisions.md": [
    "Deferred decisions — what the product surface deliberately does not have yet",
    "before proposing a generated capability catalog for users or a product `/pharn-eval`. `.dev/floor/specified-primitives.json` registers both forward claims below as `check:markers` sites.",
    [
      [1827, 1848, "No product capability catalog"],
      [1849, 1863, "No product `/pharn-eval`"],
    ],
  ],
};

export function buildGuides(L) {
  const out = {};
  for (const [file, g] of Object.entries(FLOOR)) {
    const body = header(g.title, g.readWhen, FLOOR_NOTE);
    for (const [a, b, h] of g.entries) body.push(...fenced(h, range(L, a, b)));
    out[file] = body;
  }
  for (const [file, [title, readWhen, secs]] of Object.entries(PROSE)) {
    const body = header(title, readWhen);
    for (const [a, b, h] of secs) body.push(...section(h, range(L, a, b)));
    out[file] = body;
  }
  return out;
}

export const GUIDE_RANGES = () => {
  const r = [];
  for (const [file, g] of Object.entries(FLOOR)) for (const [a, b] of g.entries) r.push([file, a, b]);
  for (const [file, [, , secs]] of Object.entries(PROSE)) for (const [a, b] of secs) r.push([file, a, b]);
  return r;
};

if (import.meta.main) {
  const L = baseLines();
  if (L.length !== 1912) throw new Error(`expected 1912 base lines, got ${L.length}`);
  writeFileSync("CLAUDE.md", buildRoot(L).join("\n") + "\n");
  mkdirSync(".dev/guides", { recursive: true });
  for (const [file, lines] of Object.entries(buildGuides(L))) {
    while (lines.at(-1) === "") lines.pop();
    writeFileSync(`.dev/guides/${file}`, lines.join("\n") + "\n");
  }
  console.log("wrote CLAUDE.md and", Object.keys(buildGuides(L)).length, "guides");
}
