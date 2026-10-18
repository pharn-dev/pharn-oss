// .dev/features/grill-griller-slim/measure.mjs — the measurement behind PLAN.md and MEASUREMENTS.md (review finding CTX-1).
//
// Usage: node .dev/features/grill-griller-slim/measure.mjs [--base <rev>] [--corpus <root>]... [--install <root>]...
//   --base     the commit the plan measured "today" against (default 44b12e8, origin/main when it was planned);
//              the base griller files are read with `git show <rev>:<path>` from this repo.
//   --corpus   a repo holding pharn/features/*/ or .dev/features/*/ feature dirs (default: this repo only).
//   --install  a PHARN install with a pharn.config.json `archetypes` list (selection candidate A).
//
// Prints JSON with six parts:
//   1. `bytes`: per griller — the file and its 6.60.0 extract at the base; the file, its 6.60.0 extract, the shipped
//      extract without the intro, and the shipped extract at HEAD. The 6.60.0 extract of a text is the shipped trim of
//      that text with its `kind: pharn-owned` line respelled to a same-length non-`pharn-owned` value: the kind gate
//      then leaves out only the scope-`all` pair, which is exactly the 6.60.0 rule, and no byte count moves.
//   2. `sections`: each `##` / `###` section's share of the base 6.60.0 extract.
//   3. `audit`: per griller at the base — the bytes of `## The two layers`, `### Layer 1` and `## Finding output`; and at
//      HEAD whether the Finding-output `rule_id` / `severity` are restated in the griller's `## Procedure`.
//   4. `scan`: the bytes grill-scan.mjs prints per committed PLAN.md (mean, median, max) in each corpus.
//   5. `select`: the four selection candidates (A archetype, B `## Files` path classes, C both, D a subagent each).
//      Findings are counted by a heading heuristic over committed full-mode GRILL.md files: a FINDING under a `##`–`####`
//      heading naming the axis. A LOWER bound — a finding not filed under its axis heading is not counted.
//      `## Files` paths come from plan-files-core.mjs's `pathsFromPlanFiles` (L69); a plan whose entries are not all
//      concrete paths counts as "cannot decide, skip nothing" (L71).
//   6. `subagents`: candidate D's arithmetic, from the measured first-request prefix it cites.
// Read-only: writes nothing.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve, basename, extname, dirname } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const args = process.argv.slice(2);
const opt = (flag) => args.flatMap((a, i) => (a === flag && i + 1 < args.length ? [args[i + 1]] : []));
const BASE = opt("--base")[0] ?? "44b12e8";
const CORPORA = (opt("--corpus").length ? opt("--corpus") : [REPO]).map((r) => resolve(r));
const INSTALLS = opt("--install").map((r) => resolve(r));

const floor = (f) => pathToFileURL(join(REPO, "pharn/floor", f)).href;
const { extractGrillers, trimGriller } = await import(floor("griller-extract.mjs"));
const { runScans, renderScanSection } = await import(floor("grill-scan.mjs"));
const { pathsFromPlanFiles } = await import(floor("plan-files-core.mjs"));

const B = (s) => Buffer.byteLength(s);
const pct = (part, whole) => Math.round((1000 * part) / whole) / 10;
const KIND_LINE = /^kind: pharn-owned$/m;
const SAME_LENGTH_OTHER = "kind: pharn-0wned"; // 17 bytes, like `kind: pharn-owned`; frontmatterKind reads kind-other

/** The 6.60.0 extract of a griller text (see the header): only the scope-`all` sections left out. */
function shallowText(text) {
  if (!KIND_LINE.test(text)) throw new Error("a committed griller without `kind: pharn-owned`");
  const t = trimGriller(text.replace(KIND_LINE, SAME_LENGTH_OTHER));
  if (t.deep === true || t.whole !== null) throw new Error("the respelled kind still admitted the deep members");
  return t.text.replace(SAME_LENGTH_OTHER, "kind: pharn-owned");
}

/** A file's bytes at the base commit, read with `git show` (argv form, no shell). */
function atBase(path) {
  const r = spawnSync("git", ["-C", REPO, "show", `${BASE}:${path}`], { encoding: "utf8", maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`git show ${BASE}:${path} exited ${r.status}: ${r.stderr}`);
  return r.stdout;
}

/** Heading-to-next-heading chunks of a text, fence-aware: [{head, text}]; the frontmatter is its own chunk. */
function sections(text) {
  const fmEnd = text.startsWith("---") ? text.indexOf("\n", text.indexOf("\n---", 3) + 1) + 1 : 0;
  const out = [{ head: "(frontmatter)", text: text.slice(0, fmEnd) }];
  let cur = { head: "(preamble)", lines: [] };
  let fence = null;
  const body = text.slice(fmEnd).split("\n");
  body.forEach((l, i) => {
    const f = l.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (f && f[1][0] === fence[0] && f[1].length >= fence.length && l.trim() === f[1]) fence = null;
    } else if (f) fence = f[1];
    else if (/^#{1,6} /.test(l)) {
      out.push({ head: cur.head, text: cur.lines.join("") });
      cur = { head: l, lines: [] };
    }
    cur.lines.push(i < body.length - 1 ? `${l}\n` : l);
  });
  out.push({ head: cur.head, text: cur.lines.join("") });
  return out.filter((s) => s.text !== "");
}
const sectionBytes = (text, re) =>
  sections(text)
    .filter((s) => re.test(s.head))
    .reduce((a, s) => a + B(s.text), 0);

// ── 1. bytes ────────────────────────────────────────────────────────────────────────────────────────

const run = extractGrillers(REPO);
if (!run.ok) throw new Error(run.reason);
const grillers = run.entries.map((e) => {
  const name = e.path.split("/").at(-2);
  const head = readFileSync(join(REPO, e.path), "utf8");
  const base = atBase(e.path);
  const shipped = e.trimmed.text;
  if (e.trimmed.deep !== true) throw new Error(`${e.path}: the shipped extract did not admit the deep members`);
  return {
    name,
    path: e.path,
    applies: JSON.parse(head.match(/^applies:\s*(\[.*\])/m)[1]),
    base,
    head,
    shipped,
    row: {
      name,
      baseFile: B(base),
      baseExtract: B(shallowText(base)),
      headFile: B(head),
      headExtract660: B(shallowText(head)),
      shippedWithoutIntro: B(shipped) + sectionBytes(shallowText(head), /^## The two layers/),
      shipped: B(shipped),
    },
  };
});
const sum = (k) => grillers.reduce((a, g) => a + g.row[k], 0);
const totals = Object.fromEntries(
  Object.keys(grillers[0].row)
    .filter((k) => k !== "name")
    .map((k) => [k, sum(k)])
);
const baseExtractTotal = totals.baseExtract;

// ── 2. sections ─────────────────────────────────────────────────────────────────────────────────────

const share = {};
for (const g of grillers) {
  for (const s of sections(shallowText(g.base))) {
    // The `#` title and the prose under it count as the preamble: everything before the first `##`.
    const key = /^##/.test(s.head)
      ? `${s.head.match(/^#+/)[0]} ${s.head
          .replace(/^#+ /, "")
          .replace(/[—(:].*$/, "")
          .trim()}`
      : /^# /.test(s.head)
        ? "(preamble)"
        : s.head;
    share[key] = (share[key] ?? 0) + B(s.text);
  }
}
const sectionShares = Object.entries(share)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 12)
  .map(([section, bytes]) => ({ section, bytes, pct: pct(bytes, baseExtractTotal) }));

// ── 3. audit ────────────────────────────────────────────────────────────────────────────────────────

function h2(text, prefix) {
  const at = text.search(new RegExp(`^## ${prefix}`, "m"));
  if (at === -1) return "";
  const rest = text.slice(at + 3);
  const end = rest.search(/^## /m);
  return end === -1 ? rest : rest.slice(0, end);
}
const audit = grillers.map((g) => {
  const base660 = shallowText(g.base);
  const fo = h2(g.head, "Finding output");
  const proc = h2(g.head, "Procedure");
  const rid = fo.match(/^\s*rule_id: "?([A-Za-z0-9-]+)/m)?.[1];
  const sev = fo.match(/^\s*severity: ([a-z]+)/m)?.[1];
  return {
    name: g.name,
    twoLayers: sectionBytes(base660, /^## The two layers/),
    layer1: sectionBytes(base660, /^### Layer 1/),
    findingOutput: sectionBytes(base660, /^## Finding output/),
    rule_id: rid,
    ridInProcedure: Boolean(rid) && proc.includes(`rule_id: ${rid}`),
    severity: sev,
    sevInProcedure: Boolean(sev) && proc.includes(`severity: ${sev}`),
    presenceKept: g.shipped.includes("\n### Presence — what counts as a declaration\n"),
  };
});
const auditTotals = {
  twoLayers: audit.reduce((a, r) => a + r.twoLayers, 0),
  layer1: audit.reduce((a, r) => a + r.layer1, 0),
  findingOutput: audit.reduce((a, r) => a + r.findingOutput, 0),
};

// ── corpus helpers ──────────────────────────────────────────────────────────────────────────────────

/** Every feature dir in a corpus root holding a PLAN.md (and whether it holds a GRILL.md). */
function featureDirs(root) {
  const out = [];
  for (const base of ["pharn/features", ".dev/features"]) {
    const d = join(root, base);
    if (!existsSync(d)) continue;
    for (const n of readdirSync(d).sort()) {
      const p = join(d, n);
      try {
        if (statSync(p).isDirectory() && existsSync(join(p, "PLAN.md")))
          out.push({ dir: p, rel: `${base}/${n}`, grill: existsSync(join(p, "GRILL.md")) });
      } catch {
        // an unreadable entry is not a feature dir
      }
    }
  }
  return out;
}

/** The corpus root's HEAD commit, read from its .git files (no git process outside this repo). */
function headOf(root) {
  try {
    const head = readFileSync(join(root, ".git", "HEAD"), "utf8").trim();
    if (!head.startsWith("ref: ")) return head.slice(0, 7);
    const ref = head.slice(5);
    const loose = join(root, ".git", ref);
    if (existsSync(loose)) return readFileSync(loose, "utf8").trim().slice(0, 7);
    const packed = readFileSync(join(root, ".git", "packed-refs"), "utf8")
      .split("\n")
      .find((l) => l.endsWith(` ${ref}`));
    return packed ? packed.slice(0, 7) : null;
  } catch {
    return null;
  }
}

const AXIS = {
  a11y: /\ba11y\b|accessib/i,
  i18n: /\bi18n\b|locali[sz]|internationali[sz]/i,
  migrations: /migration/i,
};
function axisFindings(grill) {
  const out = Object.fromEntries(Object.keys(AXIS).map((k) => [k, 0]));
  let cur = [];
  let fence = false;
  for (const l of grill.split("\n")) {
    if (/^\s*(```|~~~)/.test(l)) fence = !fence;
    if (!fence && /^#{2,4} /.test(l)) {
      cur = Object.keys(AXIS).filter((k) => AXIS[k].test(l));
      continue;
    }
    if (cur.length && /type:\s*"?FINDING\b/.test(l)) for (const k of cur) out[k]++;
  }
  return out;
}
const isFull = (g) => !/^mode: (quick|floor-only)/m.test(g) && !/interrogation NOT performed/.test(g);

// ── 4. scan ─────────────────────────────────────────────────────────────────────────────────────────

const scan = CORPORA.map((root) => {
  const sizes = [];
  let refused = 0;
  for (const f of featureDirs(root)) {
    const r = runScans(join(f.dir, "PLAN.md"));
    if (!r.ok) {
      refused++;
      continue;
    }
    sizes.push(B(renderScanSection(`${f.rel}/PLAN.md`, r.results)));
  }
  sizes.sort((a, b) => a - b);
  const mean = sizes.length ? Math.round(sizes.reduce((a, b) => a + b, 0) / sizes.length) : 0;
  return { root: basename(root), plans: sizes.length, refused, mean, median: sizes[sizes.length >> 1] ?? 0, max: sizes.at(-1) ?? 0 };
});

// ── 5. select ───────────────────────────────────────────────────────────────────────────────────────

const textOf = Object.fromEntries(grillers.map((g) => [g.name, g.row.baseExtract]));
const selectedBy = (archetypes) =>
  grillers.filter((g) => g.applies.includes("universal") || g.applies.some((a) => archetypes.includes(a))).map((g) => g.name);

const UI_EXT = new Set([
  ".tsx",
  ".jsx",
  ".vue",
  ".svelte",
  ".astro",
  ".html",
  ".htm",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".styl",
  ".mdx",
  ".hbs",
  ".handlebars",
  ".ejs",
  ".pug",
  ".njk",
  ".liquid",
  ".erb",
  ".twig",
]);
const UI_SEG = new Set(["app", "pages", "components", "views", "ui", "layouts", "templates", "emails", "routes"]);
const I18N_SEG = new Set(["messages", "locales", "locale", "i18n", "l10n", "translations", "lang", "langs"]);
const I18N_EXT = new Set([".po", ".pot", ".xlf", ".xliff", ".arb", ".ftl"]);
const SCHEMA_SEG = new Set([
  "migrations",
  "migration",
  "migrate",
  "drizzle",
  "prisma",
  "db",
  "database",
  "schema",
  "schemas",
  "supabase",
  "seeds",
  "seed",
]);
const SCHEMA_EXT = new Set([".sql", ".prisma"]);
const SCRIPT_EXT = new Set([".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"]);
/** The path classes of one plan's `## Files` under a UI-class mode: strict (UI extensions), wide (+ UI dirs), script. */
function classes(paths, mode) {
  const c = { ui: false, i18n: false, schema: false };
  for (const p of paths) {
    const dirs = p.toLowerCase().split("/").slice(0, -1);
    const ext = extname(p).toLowerCase();
    if (UI_EXT.has(ext)) c.ui = true;
    if (mode === "wide" && dirs.some((s) => UI_SEG.has(s))) c.ui = true;
    if (mode === "script" && SCRIPT_EXT.has(ext)) c.ui = true;
    if (I18N_EXT.has(ext) || dirs.some((s) => I18N_SEG.has(s))) c.i18n = true;
    if (SCHEMA_EXT.has(ext) || dirs.some((s) => SCHEMA_SEG.has(s)) || /schema/.test(basename(p).toLowerCase())) c.schema = true;
  }
  return c;
}
/** The grillers candidate B skips for a plan; a plan it cannot decide skips nothing (L71). */
function bSkips(paths, mode) {
  if (paths === null || paths.length === 0 || paths.some((p) => /[<>*?]/.test(p) || p.endsWith("/") || p === ".")) return new Set();
  const c = classes(paths, mode);
  const s = new Set();
  if (!c.ui) s.add("a11y");
  if (!c.ui && !c.i18n) s.add("i18n");
  if (!c.schema) s.add("migrations");
  return s;
}

function readArchetypes(root) {
  try {
    return JSON.parse(readFileSync(join(root, "pharn.config.json"), "utf8")).archetypes ?? null;
  } catch {
    return null;
  }
}
const installedIn = (root) => {
  const d = join(root, "pharn/pharn-pipeline/grillers");
  return existsSync(d) ? readdirSync(d).filter((n) => textOf[n] !== undefined) : [];
};

// A: archetype selection at run time, in each install (it saves the bytes of installed grillers it would not select).
const A_installs = INSTALLS.map((root) => {
  const installed = installedIn(root);
  const archetypes = readArchetypes(root) ?? [];
  const sel = new Set(selectedBy(archetypes));
  const skipped = installed.filter((n) => !sel.has(n));
  return { root: basename(root), archetypes, installed: installed.length, skipped, savedBytes: skipped.reduce((a, n) => a + textOf[n], 0) };
});

function corpusSelection(root) {
  const archetypes = readArchetypes(root);
  const installed = installedIn(root);
  const inst = new Set(installed.length ? installed : grillers.map((g) => g.name));
  const instBytes = [...inst].reduce((a, n) => a + textOf[n], 0);
  const full = featureDirs(root)
    .filter((f) => f.grill)
    .map((f) => ({ ...f, grillText: readFileSync(join(f.dir, "GRILL.md"), "utf8") }))
    .filter((f) => isFull(f.grillText));
  const plans = full.map((f) => {
    const pr = pathsFromPlanFiles(readFileSync(join(f.dir, "PLAN.md"), "utf8"));
    return { name: basename(f.dir), paths: pr.ok ? pr.value : null, findings: axisFindings(f.grillText) };
  });
  // A over this corpus: by its recorded archetypes; with none recorded (this repo), under each single archetype.
  const A = (archetypes ? [archetypes] : [["lib"], ["ssr"], ["backend"], ["spa"]]).map((arch) => {
    const aSkip = [...inst].filter((n) => !selectedBy(arch).includes(n));
    const lost = Object.fromEntries(aSkip.map((n) => [n, { findings: 0, plans: 0 }]));
    for (const p of plans) for (const n of aSkip) if (p.findings[n]) ((lost[n].findings += p.findings[n]), lost[n].plans++);
    return {
      archetypes: arch,
      recorded: Boolean(archetypes),
      skipped: aSkip,
      savedPct: pct(
        aSkip.reduce((a, n) => a + textOf[n], 0),
        instBytes
      ),
      lost,
    };
  });
  // B over this corpus, under each UI-class mode; the mean saving overall and per skipped griller.
  const B_ = {};
  for (const mode of ["strict", "wide", "script"]) {
    const r = { skipped: {}, lost: {}, lostPlans: {}, meanSavedPct: 0, meanSavedPctBy: {}, undecided: 0 };
    let saved = 0;
    const savedBy = {};
    for (const p of plans) {
      const sk = bSkips(p.paths, mode);
      if (sk.size === 0) r.undecided += p.paths === null || p.paths.some((x) => /[<>*?]/.test(x)) ? 1 : 0;
      for (const n of sk) {
        if (!inst.has(n)) continue;
        r.skipped[n] = (r.skipped[n] ?? 0) + 1;
        saved += textOf[n];
        savedBy[n] = (savedBy[n] ?? 0) + textOf[n];
        if (p.findings[n]) {
          r.lost[n] = (r.lost[n] ?? 0) + p.findings[n];
          r.lostPlans[n] = (r.lostPlans[n] ?? 0) + 1;
        }
      }
    }
    r.meanSavedPct = plans.length ? pct(saved / plans.length, instBytes) : 0;
    for (const [n, b] of Object.entries(savedBy)) r.meanSavedPctBy[n] = Math.round((10000 * b) / plans.length / instBytes) / 100;
    B_[mode] = r;
  }
  return { root: basename(root), head: headOf(root), installed: inst.size, fullGrills: plans.length, A, B: B_ };
}
const select = { A_installs, corpora: CORPORA.map(corpusSelection) };
// C: A then B. In every install A skips nothing (A_installs), so C's skips are B's — stated by computation, not assumed.
select.C = { reducesToB: A_installs.every((i) => i.savedBytes === 0) };

// ── 6. subagents (candidate D) ──────────────────────────────────────────────────────────────────────

// The first request of a fresh `general-purpose` subagent cache-wrote 68,223–129,646 tokens in 29 agents in this repo
// (.dev/measurements/pipeline-performance-audit-2026-09-29.md, line 36). Tokens are bytes/4 (LIMITS.md §1c) — estimates.
const PREFIX_MIN = 68223;
const subagents = {
  grillers: grillers.length,
  prefixTokensAtLeast: grillers.length * PREFIX_MIN,
  grillerTextTokens: Math.round(baseExtractTotal / 4),
};

console.log(
  JSON.stringify(
    {
      base: BASE,
      bytes: { rows: grillers.map((g) => g.row), totals },
      sections: sectionShares,
      audit: { rows: audit, totals: auditTotals },
      scan,
      select,
      subagents,
    },
    null,
    1
  )
);
