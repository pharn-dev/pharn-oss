// .dev/features/selective-skill-reads/measure.mjs — static byte measurement for MEASUREMENTS.md.
//
// Usage (repo root): node .dev/features/selective-skill-reads/measure.mjs [extraRosterDir ...]
//
// For each roster it prints: the mode the catalogue picks, the SKILL.md body bytes a read-all consumer reads
// (the pre-6.47.0 behaviour), the catalogue's own bytes (what the consumer's Bash call returns), the selection
// skill's bytes (read only in `select` mode), the bytes of the must-read entries (metadata not `ok`), and —
// for the eval fixtures — the bytes of the paths each candidate sample was OBSERVED reading (transcript Read
// calls, recorded in EVAL.md). STATIC BYTES, never tokens: no bytes/4 conversion is made or implied.
import { statSync, readdirSync, mkdtempSync, cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { buildCatalogue } from "../../../pharn/floor/installed-skills-core.mjs";

// The fixture skills are stored under `<case>/skills/` (never `.claude/skills/`, which Claude Code would load as
// this repo's own skills); materialize a scratch repo before measuring, exactly as the consumer test does.
function materialize(caseDir) {
  const root = mkdtempSync(join(tmpdir(), "pharn-skillsel-measure-"));
  for (const entry of readdirSync(caseDir)) {
    if (entry !== "skills") cpSync(join(caseDir, entry), join(root, entry), { recursive: true });
  }
  mkdirSync(join(root, ".claude"), { recursive: true });
  cpSync(join(caseDir, "skills"), join(root, ".claude", "skills"), { recursive: true });
  return root;
}

const SKILL = "pharn/pharn-core/installed-skill-selection/installed-skill-selection.md";
const SKILL_BYTES = statSync(SKILL).size;
const FIX = ".dev/floor/test-fixtures/skill-selection";

// Observed candidate reads (both samples read the same set in every case — EVAL.md).
const OBSERVED = {
  "c1-ui-copy": ["ui-copy-style", "vitest-conventions"],
  "c2-orm-wrapper": ["drizzle-orm", "feature-flags"],
  "c3-tenancy": ["route-handlers", "tenant-scoping"],
  "c4-legacy-no-frontmatter": ["data-export", "feature-flags", "i18n-strings", "tailwind-theme"],
  "c5-misleading-metadata": ["slack-messages", "http-client"],
  "c6-lens-validation": ["zod-schemas", "drizzle-orm"],
  "c7-fallback-heavy": ["api-pagination", "auth-session", "date-formatting", "error-handling"],
};

function row(label, dir, selectedDirs) {
  const cat = buildCatalogue(dir);
  const catBytes = Buffer.byteLength(JSON.stringify(cat) + "\n");
  const body = (s) => (typeof s.bytes === "number" ? s.bytes : 0);
  const baseline = cat.skills.reduce((a, s) => a + body(s), 0);
  const mustRead = cat.skills.filter((s) => s.metadata !== "ok" && s.metadata !== "unsafe").reduce((a, s) => a + body(s), 0);
  let selected = null;
  if (selectedDirs) selected = cat.skills.filter((s) => selectedDirs.includes(s.dir)).reduce((a, s) => a + body(s), 0);
  const procedure = cat.mode === "select" ? SKILL_BYTES : 0;
  const reads = cat.mode === "select" ? selected : cat.mode === "read-all" ? baseline : 0;
  const candidate = reads === null ? null : catBytes + procedure + reads;
  return {
    roster: label,
    mode: `${cat.mode} (${cat.mode_reason})`,
    skills: cat.count,
    baseline_body_bytes: baseline,
    catalogue_bytes: catBytes,
    procedure_bytes: procedure,
    must_read_bytes: mustRead,
    selected_body_bytes: reads,
    candidate_total_bytes: candidate,
    net_bytes: candidate === null ? null : candidate - baseline,
    bodies_read: cat.mode === "select" ? `${selectedDirs ? selectedDirs.length : "?"}/${cat.count}` : `${cat.count}/${cat.count}`,
  };
}

const rows = [];
for (const c of Object.keys(OBSERVED)) {
  const root = materialize(join(FIX, c));
  try {
    rows.push(row(c, root, OBSERVED[c]));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
for (const extra of process.argv.slice(2)) {
  // A real roster has no observed selection: report the read-all bound and the two scenario ends
  // (selection reads only the must-read entries; selection reads everything).
  const r = row(extra, extra, null);
  rows.push(r);
}
console.log(JSON.stringify({ selection_skill_bytes: SKILL_BYTES, rows }, null, 2));
