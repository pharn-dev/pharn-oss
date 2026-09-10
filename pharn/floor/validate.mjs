#!/usr/bin/env node
// pharn/floor/validate.mjs — the deterministic floor for PHARN.
//
// This is the only GUARANTEED part of this repo's build loop (CONSTITUTION P0).
// It is non-LLM, dependency-free (Node stdlib only), and exits non-zero on any RED finding.
//
// It checks structural invariants of the PHARN repo being BUILT:
//   1. capability frontmatter present + required fields           (ARCHITECTURE §3.1)
//   2. every capability has non-empty evals/cases + evals/expected (P1)
//   3. every `enforces` rule_id is produced by >=1 eval fixture — EXACT value membership, read from
//      each fixture's structured location, never a substring scan  (P1, fix #6)
//   4. `coupling` is a valid enum value where present               (enum check, §3.2)
//   4b. `applies` is present AND every value is an archetype-enum member  (required + enum, §5)
//   5. finding templates separate enum-gated from free-text fields  (fix #1, best-effort)
//   6. no forbidden sibling reference                               (P3, best-effort)
//   7. archetype maps agree, if an archetype-maps manifest exists   (fix #5, conditional)
//   8. the capability canon names a relocated floor checker at its LIVE path (P6, enum/regex)
//
// Usage:  node pharn/floor/validate.mjs [targetDir]      (default: cwd)
// The targetDir must EXIST and be a DIRECTORY: an absent or non-directory target is a RED (see the
// guard below), never a GREEN over zero capabilities. Two things it does NOT establish, both of which
// still report GREEN over zero capabilities: that the target is the RIGHT directory (a valid-but-wrong
// one walks to nothing), and that the target is READABLE (`statSync` needs search permission on the
// PARENT, not read permission on the target, so a chmod-000 directory passes the guard and `walk()`'s
// per-directory swallow does the rest).
// Honest scope: checks 5 and 6 are BEST-EFFORT — markdown has no import statement to lint, so they
// reduce a class of mistakes, they do not eliminate it (see ARCHITECTURE §4 caveat, LIMITS).
//
// It deliberately does NOT validate this repo's own tooling (.claude/commands, .dev/) — those
// are advisory orchestration, not built PHARN capabilities. Point this at the PHARN repo.

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const TARGET = process.argv[2] || ".";

// The target is INPUT, and an unusable input is a RED — never a GREEN over zero files. A path that
// does not exist (a typo, a wrong cwd, a moved checkout) or that is not a directory makes the
// capability walk VACUOUS: `walk()` below swallows the readdirSync failure by design, so the run
// printed `GREEN — 0 capabilities checked in /no/such/dir` and exited 0 — a fabricated pass, and
// invisible to a CI step that reads only the exit code. A checker must REJECT a wrongly-shaped input
// rather than trust its caller (.dev/memory-bank/lessons-learned.md L21 — cited, not restated, P4).
//
// Floor primitive #3 (presence + type test; ARCHITECTURE §2). Runs BEFORE the walk, so the refusal
// can never be confused with a completed scan. Two branches, each carrying a message that is true for
// IT and false for the other — one shared message would print an untrue sentence on whichever branch
// it did not describe (L27).
//
// NARROWED, and stated: this proves the target EXISTS and is a DIRECTORY — nothing more. It does NOT
// prove the RIGHT directory was passed: a valid-but-wrong one (a sibling repo, a parent dir) still
// walks to zero capabilities and still reports GREEN. It does NOT prove the target is READABLE
// either: `statSync` resolves through search permission on the PARENT, so a directory whose contents
// cannot be listed passes here, and `walk()`'s swallow then yields the same GREEN over zero. Both
// residuals are live, and the second is one permission bit from the case this guard removes — so the
// class closed here is the bad PATH, not the fabricated GREEN in general. `GREEN` never meant "the
// right target", and does not mean it now.
// The target is echoed into the human render, so it is rendered as QUOTED DATA (P2) rather than
// spliced in raw. A path may legally contain a newline, and a raw splice let one forge an extra
// `- [blocking] …` line that no check produced — a fabricated line shaped exactly like a real finding.
// `JSON.stringify` quotes the value and escapes its control characters, so a rendered path is always
// exactly one line and always visibly a value rather than report structure. Bounded either way, and
// the bound is why this is small: every consumer in the repo branches on the exit code, never on this
// text. Used by BOTH renders — the refusal below and the GREEN line at the end of the file — because
// the property belongs to the path, not to one call site.
const showPath = (p) => JSON.stringify(p);

function refuseTarget(problem) {
  console.log(`FLOOR: RED — 1 finding(s), target not validated\n`);
  console.log(`- [blocking] P6/bad-target  ${showPath(TARGET)}`);
  console.log(`    ${problem}`);
  process.exit(1);
}
if (!existsSync(TARGET)) {
  refuseTarget("the target path does not exist, so nothing could be checked; walking it would report GREEN over zero capabilities");
}
let targetStat;
try {
  targetStat = statSync(TARGET);
} catch {
  // Unreadable, or raced away between the two syscalls. Either way it cannot be SHOWN to be a
  // directory, so it is refused (fail-closed). Caught deliberately: a bare `statSync(TARGET).isDirectory()`
  // would throw here, and an uncaught stack trace is not the canonical finding shape (§8) a reader
  // of this floor is entitled to — even though its exit code would also be non-zero.
  targetStat = null;
}
if (targetStat === null || !targetStat.isDirectory()) {
  refuseTarget(
    "the target path is not a readable directory, so nothing could be checked; walking it would report GREEN over zero capabilities"
  );
}

const COUPLING_ENUM = ["agnostic", "framework-seam", "framework-specific"];
const ROLE_ENUM = ["skill", "lens", "validator", "verifier", "griller", "auditor"];
const KIND_ENUM = ["pharn-owned", "vendor-official", "community"];
// `applies` = which archetypes a capability is scoped to. Reuses ARCHITECTURE §5's archetype enum
// {ssr, backend, spa, lib} verbatim + a `universal` wildcard meaning "all archetypes" (does NOT
// redefine the archetype enum). REQUIRED field: every capability must declare a valid `applies`
// (absent or empty → RED); each declared value must be an enum member.
const APPLIES_ENUM = ["universal", "ssr", "backend", "spa", "lib"];
// CHECK 6's exemption set: the two modules ARCHITECTURE §4's tree places BELOW every other module —
// `pharn-contracts` (L-1, the root: "Everything depends on this") and `pharn-core` (L0, directly above
// it). "Sharing flows only through the bottom" is exactly the statement that these two may be depended
// on from anywhere, which is why the exemption is keyed on the module being READ (the target), not on
// the module doing the reading. See the CHECK 6 block for the bound this set does and does not carry.
const BASE_MODULES = ["pharn-contracts", "pharn-core"];
// A `reads:` value is a path or an artifact reference, so module names are separated from their
// surroundings by a path separator, whitespace, or a comma. Splitting on those and ANCHORING each token
// is what keeps `docs/pharn-notes.md` from reading as a module named `pharn-notes`: the `.` leaves the
// token unanchorable. A bare substring scan has no such edge and false-REDs that shape.
const REF_SEPARATOR_RE = /[\\/\s,]+/;
const MODULE_TOKEN_RE = /^pharn-[A-Za-z0-9-]+$/;
// `pharn/floor` holds the deterministic checkers + their test-fixtures (incl. the deliberately-RED
// fixture) — tooling, never product capabilities — so it is excluded from the capability scan exactly
// as `.dev/` (its pre-relocation home) always was. The product surface remains pharn/pharn-*/**.
const EXCLUDE_SEGMENTS = [
  `${sep}.claude${sep}commands${sep}`,
  `${sep}.dev${sep}`,
  `${sep}pharn${sep}floor${sep}`,
  `${sep}node_modules${sep}`,
  `${sep}.git${sep}`,
];

const findings = [];
function finding(severity, rule_id, file, problem) {
  findings.push({ type: "FINDING", rule_id, severity, file, problem });
}

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, acc);
    else if (name.endsWith(".md")) acc.push(p);
  }
  return acc;
}

// --- tiny dependency-free frontmatter parser (handles the subset PHARN uses) ---
function parseFrontmatter(text) {
  if (!text.startsWith("---")) return { fm: null, body: text };
  const end = text.indexOf("\n---", 3);
  if (end === -1) return { fm: null, body: text };
  const raw = text.slice(3, end).trim();
  const body = text.slice(end + 4);
  const fm = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      val = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      val = val.replace(/^["']|["']$/g, "");
    }
    fm[key] = val;
  }
  return { fm, body };
}

function isExcluded(file) {
  const norm = sep + relative(TARGET, file);
  return EXCLUDE_SEGMENTS.some((seg) => norm.includes(seg));
}

function nonEmptyDir(dir) {
  return existsSync(dir) && statSync(dir).isDirectory() && readdirSync(dir).filter((f) => !f.startsWith(".")).length > 0;
}

function capabilityDir(file) {
  // a capability file lives at <capDir>/<NAME>.md ; evals are at <capDir>/evals/
  return file.slice(0, file.lastIndexOf(sep));
}

// --- CHECK 3's rule_id extraction (fix #6) -------------------------------------------------------
//
// The enforces↔eval binding is a MEMBERSHIP fact, so it is read from the fixture's STRUCTURED
// location and tested by EXACT equality — never by scanning concatenated fixture text for a
// substring. The substring form this replaced was false-GREEN two ways, both reproduced live:
//   * PREFIX COLLISION — `SEC-1` is a substring of `SEC-12`, so a capability declaring
//     `enforces: ["security.md SEC-1"]` passed while its only fixture produced `SEC-12`.
//   * FREE-TEXT LAUNDERING — any prose mention satisfied the binding, and the live fixtures are full
//     of them (`semantic[].judge` sentences reading "reported as a FLOOR finding (rule_id P2)"), so a
//     fixture that asserts nothing about a rule could still bind it.

// JSON fixtures: the structured location pharn-contracts/eval-format.md defines — cited, not restated
// (P4). Same shape check-structural.mjs executes: assertions.structural[] entries whose `kind` is
// `field_equals` over `field: rule_id` contribute their `value`. A non-string `value` is not a rule id
// and is dropped rather than coerced (String(v) would mint members like "[object Object]").
function ruleIdsFromExpectedJson(parsed) {
  const out = [];
  if (!parsed || typeof parsed !== "object") return out;
  const assertions = parsed.assertions;
  if (!assertions || typeof assertions !== "object") return out;
  if (!Array.isArray(assertions.structural)) return out;
  for (const a of assertions.structural) {
    if (!a || typeof a !== "object") continue;
    if (a.kind !== "field_equals" || a.field !== "rule_id") continue;
    if (typeof a.value !== "string") continue;
    const v = a.value.trim();
    if (v) out.push(v);
  }
  return out;
}

// Non-JSON fixtures: BEST-EFFORT, and deliberately weaker than the JSON path — say so rather than let
// the two read as equivalent. eval-format.md writes `expected` as `evals/expected/*.md`, whose finding
// block carries an anchored `rule_id: <value>` line, so dropping this path would false-RED a
// contract-conformant .md-only capability. But markdown has no structured location to read: this is a
// regex over free-form text, so a `rule_id:` line QUOTED from untrusted case content would bind. What
// it does buy over the old substring scan is that a bare PROSE mention ("…(rule_id P2)…", a `purpose:`
// sentence) no longer binds — the line must be shaped like a declaration.
// Anchored per line under /m (where `$` matches before each \n, lessons-learned.md L14); the value is
// trimmed and compared by equality, so this cannot re-admit substring behavior.
const RULE_ID_LINE = /^[\s>*-]*rule_id:[ \t]*(?:"([^"\n]*)"|'([^'\n]*)'|([^#"'\n]*?))[ \t]*(?:#.*)?$/gm;
function ruleIdsFromExpectedLines(text) {
  const out = [];
  RULE_ID_LINE.lastIndex = 0; // the /g regex is module-scoped: reset before every use
  for (const m of text.matchAll(RULE_ID_LINE)) {
    const v = (m[1] ?? m[2] ?? m[3] ?? "").trim();
    if (v) out.push(v);
  }
  return out;
}

// True iff s contains any C0 control char or DEL (charcode < 32 or === 127). Charcode scan, not a
// regex literal — the same idiom merge-findings.mjs uses, and for the same two reasons: a control-char
// regex literal is unreadable in source, and eslint's no-control-regex forbids it.
function hasControlChar(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 32 || c === 127) return true;
  }
  return false;
}

// Name the values the fixtures DID declare — without this, a prefix collision reads as "SEC-1 has no
// eval" while the fixture plainly says SEC-12 and the maintainer stares at it. Bounded on purpose:
// control-char-bearing or over-long values are dropped rather than echoed into the report (L14), and
// the list is capped, so a fixture cannot use this message as an output channel.
function summarizeProduced(produced) {
  const clean = [...produced].filter((v) => v.length <= 60 && !hasControlChar(v)).sort();
  if (!clean.length) return " (no expected fixture declares any rule_id)";
  const shown = clean.slice(0, 8);
  const more = clean.length - shown.length;
  return ` (fixtures declare: ${shown.join(", ")}${more ? `, +${more} more` : ""})`;
}

// ---------------------------------------------------------------------------

const allMd = walk(TARGET);
const capabilities = [];

for (const file of allMd) {
  if (isExcluded(file)) continue;
  const text = readFileSync(file, "utf8");
  const { fm, body } = parseFrontmatter(text);

  // a "capability" = a role-bearing markdown file (ARCHITECTURE §3.1)
  if (fm && fm.role) {
    capabilities.push({ file, fm, body });
  }

  // CHECK 5 (best-effort): finding-template files must show the enum-gated / free-text split (fix #1)
  const hasFindingTemplate = /rule_id:/.test(text) && /problem:/.test(text);
  if (hasFindingTemplate) {
    const showsEnumGated = /enum-gated|floor-verifiable/i.test(text);
    const showsFreeText = /free[- ]text|untrusted/i.test(text);
    if (!(showsEnumGated && showsFreeText)) {
      finding(
        "blocking",
        "P0/fix#1",
        relative(TARGET, file),
        "finding template does not document the enum-gated vs free-text (untrusted) split — a guaranteed decision could rest on a tainted field"
      );
    }
  }
}

for (const cap of capabilities) {
  const rel = relative(TARGET, cap.file);
  const fm = cap.fm;

  // CHECK 1: required frontmatter fields
  for (const req of ["name", "role", "kind", "version"]) {
    if (!fm[req]) finding("blocking", "P1/ARCH§3.1", rel, `missing required frontmatter field: ${req}`);
  }
  if (fm.role && !ROLE_ENUM.includes(fm.role)) finding("blocking", "ARCH§3.1", rel, `role not in enum: ${fm.role}`);
  if (fm.kind && !KIND_ENUM.includes(fm.kind)) finding("blocking", "ARCH§3.1", rel, `kind not in enum: ${fm.kind}`);
  if (fm.seal && fm.kind !== "pharn-owned") finding("blocking", "ARCH§3.1", rel, "seal present on a non-pharn-owned capability");

  // CHECK 4: coupling enum (only when present)
  if (fm.coupling && !COUPLING_ENUM.includes(fm.coupling)) {
    finding("blocking", "ARCH§3.2", rel, `coupling not in enum: ${fm.coupling}`);
  }

  // CHECK 4b: applies REQUIRED + enum — archetype scoping (ARCH §5 enum + `universal` wildcard)
  const applies = Array.isArray(fm.applies) ? fm.applies : fm.applies ? [fm.applies] : [];
  if (applies.length === 0) {
    finding("blocking", "ARCH§5/applies", rel, "missing required frontmatter field: applies");
  }
  for (const a of applies) {
    if (!APPLIES_ENUM.includes(a)) {
      finding("blocking", "ARCH§5/applies", rel, `applies value not in enum: ${a}`);
    }
  }

  // CHECK 2: evals present
  const evalsDir = join(capabilityDir(cap.file), "evals");
  const casesDir = join(evalsDir, "cases");
  const expectedDir = join(evalsDir, "expected");
  const hasCases = nonEmptyDir(casesDir);
  const hasExpected = nonEmptyDir(expectedDir);
  if (!hasCases || !hasExpected) {
    finding(
      "blocking",
      "P1",
      rel,
      `capability has no evals (need non-empty evals/cases + evals/expected) [cases:${hasCases} expected:${hasExpected}]`
    );
  }

  // CHECK 3: every enforces rule_id is produced by >=1 eval case (fix #6)
  const enforces = Array.isArray(fm.enforces) ? fm.enforces : fm.enforces ? [fm.enforces] : [];
  if (enforces.length && hasExpected) {
    const produced = new Set(); // the rule_id VALUES the fixtures declare — exact membership, never substring
    for (const name of readdirSync(expectedDir).sort()) {
      if (name.startsWith(".")) continue; // dotfiles are not fixtures (mirrors nonEmptyDir)
      const p = join(expectedDir, name);
      // Directories are skipped, not read: this scan is one level deep, exactly as before. The skip
      // is decided by the READ ITSELF — `readFileSync` on a directory throws `EISDIR` — and NOT by a
      // preceding `statSync`. A stat-then-read pair is a time-of-check/time-of-use window (CodeQL
      // `js/file-system-race`), and the stat bought nothing here: the read already refuses a
      // directory, so one syscall replaces two and the window closes. FAIL-CLOSED, and stated: any
      // other error code — including a directory reported as something other than EISDIR on a
      // platform that does so — falls through to the blocking finding below, never to a silent skip.
      let text;
      try {
        text = readFileSync(p, "utf8");
      } catch (e) {
        if (e.code === "EISDIR") continue; // a subdirectory is not a fixture
        finding(
          "blocking",
          "P1/fix#6",
          rel,
          `expected fixture "${name}" is unreadable (${e.code || e.message}) — the enforces binding cannot be verified against it`
        );
        continue;
      }
      if (name.endsWith(".json")) {
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          // FAIL-CLOSED: a fixture that cannot be parsed is not evidence of a binding. Before this
          // check existed the parse failure fell through to "" and a sibling fixture silently carried
          // the binding. The message is free-text (fix #1) and may quote a short JSON snippet — DATA.
          finding(
            "blocking",
            "P1/fix#6",
            rel,
            `expected fixture "${name}" is not parseable JSON (${e.message}) — the enforces binding cannot be verified against it`
          );
          continue;
        }
        for (const v of ruleIdsFromExpectedJson(parsed)) produced.add(v);
      } else {
        for (const v of ruleIdsFromExpectedLines(text)) produced.add(v);
      }
    }
    for (const id of enforces) {
      // "Produced" = the declared id (file-qualified) or its bare form is a MEMBER of the set above.
      const declared = String(id).trim();
      const bare = declared.split(/\s+/).pop(); // "security.md SEC-1" -> "SEC-1"
      if (!produced.has(declared) && !produced.has(bare)) {
        finding(
          "blocking",
          "P1/fix#6",
          rel,
          `enforces rule_id "${id}" has no eval case that produces it — no expected fixture declares that exact rule_id value${summarizeProduced(produced)}`
        );
      }
    }
  } else if (enforces.length && !hasExpected) {
    finding("blocking", "P1/fix#6", rel, `declares enforces ${JSON.stringify(enforces)} but has no expected fixtures to bind them`);
  }

  // CHECK 6 (best-effort): no forbidden cross-module reference (P3)
  //
  // RULE: a `reads:` value may name only the capability's OWN module or a BASE_MODULES member. Any other
  // `pharn-<name>` module token it names is a RED — the leaf→leaf reference P3 forbids.
  //
  // WHY THE MATCHER WIDENED. This check previously matched `pharn-(?:stack|skills)-*` only. Both of
  // those module families are UNBUILT, and the two sibling modules that DO exist — pharn-pipeline and
  // pharn-review — were unmatchable, so the only floor expression of P3 could not fire on the live tree:
  // zero of the committed capabilities could reach it under any value they could legally hold, and zero
  // tests reached the RED branch. A check that cannot fire is not a weaker guarantee than one that can;
  // it is the appearance of one, which is the P0 disease aimed at the floor itself. Surfaced by an
  // adversarial review of this repo (finding `check6-vacuous`), so the trigger is an observed defect in
  // a shipped checker, not a hypothetical (P7).
  //
  // WHY THE EXEMPTION MOVED SIDES, which is the load-bearing half. The old guard read
  // `ownModule !== "pharn-contracts" && ownModule !== "pharn-core"` under a comment saying those modules
  // are "allowed to be DEPENDED ON" — a property of a module being READ, applied to the module doing the
  // reading. Widening the matcher without moving it is not a smaller change, it is a broken one: every
  // capability outside the base declares `reads: ["pharn/pharn-contracts/finding-shape.md"]`, so a
  // target-blind widening REDs all of them — 35 correct declarations, measured before the change, the
  // defect .dev/memory-bank/lessons-learned.md L3 names. The exemption therefore keys on the TARGET
  // module, and the reader-side skip is gone, so a base-module capability's own reads: is checkable too.
  //
  // NARROWED, and stated — FOUR distinct bounds, none of which the widening closes:
  //   1. It is a MEMBERSHIP set, not a layer RANK. A capability inside pharn-contracts naming pharn-core
  //      is admitted, though §4's tree puts core ABOVE contracts. Modelling rank would mean inventing an
  //      ordering for modules nobody has built (pharn-audits, pharn-stack-<fw>, pharn-skills-*) — the
  //      speculation P7 forbids — and pharn-contracts holds no role:-bearing file to make it a real case.
  //   2. It reads a DECLARATION, never a dependency. Markdown has no `import` (ARCHITECTURE §4's labeled
  //      caveat — cited, not restated, P4), so an empty or untruthful `reads:` is invisible here.
  //   3. Even a TRUTHFUL declaration evades it when the path never spells the module: a relative
  //      `../injection/injection.md` reaching a sibling directory names no module token and is GREEN.
  //      That is a property of name-matching, not of this regex, and no tightening of the pattern
  //      reaches it.
  //   4. A BARE FILENAME reference evades it: `reads: ["pharn-stack-next.md"]` splits to the single
  //      token `pharn-stack-next.md`, whose `.` leaves it unanchorable, so CHECK 6 stays GREEN. The
  //      PREVIOUS substring matcher caught that shape, so this is a real NARROWING and is recorded as
  //      one rather than left to be rediscovered — raised by an automated review of the widening PR.
  //      It is ACCEPTED, not overlooked, because the two shapes are LEXICALLY INDISTINGUISHABLE:
  //      stripping the extension to catch `pharn-stack-next.md` equally converts `docs/pharn-notes.md`
  //      into the module token `pharn-notes` and REDs a correct declaration. The trade is a false
  //      NEGATIVE against a false POSITIVE, and L3 settles it — a rule that turns correct declarations
  //      into blocks is the defect this repo keeps hitting, and CHECK 6 is labeled best-effort. Every
  //      `reads:` value in the live corpus is path-shaped (`pharn/pharn-contracts/finding-shape.md`,
  //      `pharn-stack-next/tokens.md`), where the module IS its own segment and matches; measured, not
  //      assumed. If a bare-filename `reads:` ever lands, this bound is the thing to revisit.
  // Widening changed what the grep can SEE. It did not change what a declaration PROVES.
  const ownModule = (rel.split(sep).find((s) => s.startsWith("pharn-")) || "").trim();
  const reads = Array.isArray(fm.reads) ? fm.reads : fm.reads ? [fm.reads] : [];
  if (ownModule) {
    for (const r of reads) {
      const value = String(r);
      // EVERY module token in the value is examined, not just the first match: a value naming
      // pharn-contracts before a sibling would otherwise launder the sibling behind an exempt prefix.
      const seen = new Set(); // one finding per module per value, not one per occurrence
      for (const target of value.split(REF_SEPARATOR_RE)) {
        if (!MODULE_TOKEN_RE.test(target)) continue;
        if (target === ownModule || BASE_MODULES.includes(target) || seen.has(target)) continue;
        seen.add(target);
        // `value` is a hand-written frontmatter string — free text (fix #1), and on a user's repo not
        // necessarily written by whoever runs the floor. It is rendered through showPath() for the same
        // reason the target path is: a value may legally contain a newline, and a raw splice would let
        // one forge an extra `- [blocking] …` line that no check produced. `target` IS spliced raw, and
        // that is safe by construction rather than by trust — it matched MODULE_TOKEN_RE, so it cannot
        // hold a control character or a separator.
        finding(
          "blocking",
          "P3",
          rel,
          `cross-module reference in reads: ${showPath(value)} names module ${target} — a capability may reference only its own module or the base modules (${BASE_MODULES.join(", ")}); move the shared thing down into pharn-contracts`
        );
      }
    }
  }
}

// CHECK 7 (conditional): archetype maps agree, if a manifest declares them (fix #5)
const archManifest = join(TARGET, "pharn", "pharn-contracts", "archetype-maps.json");
if (existsSync(archManifest)) {
  try {
    const maps = JSON.parse(readFileSync(archManifest, "utf8"));
    const mapNames = ["constitution", "phases", "grillers", "planSections"];
    const present = mapNames.filter((k) => maps[k]);
    if (present.length) {
      const archetypeSets = present.map((k) => new Set(Object.keys(maps[k])));
      const union = new Set(archetypeSets.flatMap((s) => [...s]));
      for (const k of present) {
        for (const a of union) {
          if (!maps[k][a])
            finding(
              "blocking",
              "fix#5",
              "pharn/pharn-contracts/archetype-maps.json",
              `archetype "${a}" missing from map "${k}" — the four archetype maps disagree`
            );
        }
      }
    }
  } catch (e) {
    finding("blocking", "fix#5", "pharn/pharn-contracts/archetype-maps.json", `archetype-maps.json is unparseable: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// CHECK 8: the capability canon must name a relocated floor checker at its LIVE path (P6).
//
// When the checkers moved .dev/floor/ -> pharn/floor/, CHANGELOG 1.1.2 rewrote their own line-2
// self-headers but not the capability bodies that INVOKE them, so a lens's Layer-1 sub-check still
// named the old directory and ENOENTed — the strongest deterministic sub-check silently degrading to
// judgment, with the audit record citing a command that errored. That hand-fix was a discipline-only
// remedy and the canon rotted anyway; per .dev/memory-bank/lessons-learned.md L20 the second
// occurrence is the trigger to give the class a deterministic check rather than another reminder.
//
// RULE: a literal `.dev/floor/<B>` is RED iff <TARGET>/pharn/floor/<B> is a real file — i.e. the cite
// names a file that MOVED. The existence gate is the whole decision, and it cuts both ways:
//   - it FORCED the scan-plan relocation. The five scan-plan-* grill-scanners once lived only in
//     .dev/floor/, so they were dead in every install (which ships pharn/ without .dev/) — a real
//     defect this check could not see, because with no twin there was nothing to point at. Moving
//     them to pharn/floor/ is what made their canon cites flag here, which is exactly how the
//     relocation was driven to completion rather than left half-done. Pinned by a test.
//   - it structurally cannot flag scan-plan-{a11y,comprehension,docs,error-handling,performance}.mjs,
//     named in griller prose as scanners that are NOT built (resident nowhere). No twin, no flag —
//     the same gate, the opposite outcome, and no name list to keep in sync.
//
// SCOPE: the capability canon only — every pharn/pharn-* module, DISCOVERED FROM THE TARGET at run
// time rather than fixed in a list, so a module added later (pharn-audits, pharn-stack-<fw>, …) is
// covered the day it lands instead of being a silent blind spot in the very check meant to stop
// floor-rot. The `pharn-` prefix IS the exclusion, and it is the same predicate the writes-scope
// guard already partitions on (.claude/hooks/enforce-writes-scope.cjs DEFAULT_SAFE_SET):
//   - NOT pharn/floor (no `pharn-` prefix): it holds the INTENTIONAL dev-references (the cross-copy
//     agreement pin's home, and the "deliberately does NOT import the packaged-away copy" notes) plus
//     the deliberately-RED fixtures. Inside pharn/floor an intentional dev-ref and a stale ref are
//     byte-indistinguishable.
//   - NOT the trusted pharn/*.md docs: they are files, not pharn-* module dirs — and human-only,
//     hook-governed, a different governance class.
//   - NOT .dev/: the apparatus references .dev/floor/ by design.
//   - NOT the root docs: CLAUDE.md, CHANGELOG.md and docs/lessons-index.md correctly cite the DEV
//     copy of a deliberate copy-pair (check-provenance, check-lessons-index, gen-lessons-index,
//     lessons-index-core all exist in BOTH floors on purpose), so a TARGET-wide walk would report 31
//     correct sentences as drift. Canon cites zero copy-pair files, which is what makes it safe.
// EXCLUDE_SEGMENTS is applied on top as defence-in-depth.
//
// Honest bound (P0): a genuinely stale ref that later appears inside pharn/floor is NOT caught here —
// that surface stays a manual concern. And this proves only that the cited file EXISTS; it never runs
// it, checks its arguments, or knows the body invokes it correctly. It is also GREEN when the target
// has no pharn/floor at all (no twin anywhere), and silently empty-scoped when the target has no
// pharn/ at all — both correct, both fail-open paths, named.

// Discovered, not fixed. Mirrors walkExts's two guards below: a missing <TARGET>/pharn and a per-entry
// stat failure (a broken symlink) each degrade to a skip, never a crash of the validator. .sort() is
// load-bearing, not cosmetic — findings are emitted in loop order and readdirSync's order is
// filesystem-dependent, so an unsorted scope would make one tree report in different orders on
// different machines. Sorted, it is byte-identical in behavior to the four-name list it replaces.
function canonDirs() {
  let entries;
  try {
    entries = readdirSync(join(TARGET, "pharn"));
  } catch {
    return [];
  }
  const dirs = [];
  for (const name of entries) {
    if (!/^pharn-/.test(name)) continue;
    let st;
    try {
      st = statSync(join(TARGET, "pharn", name));
    } catch {
      continue;
    }
    if (st.isDirectory()) dirs.push(name);
  }
  return dirs.sort();
}
const CANON_DIRS = canonDirs();
const FLOOR_REF_RE = /\.dev\/floor\/([A-Za-z0-9._-]+\.(?:mjs|cjs))/g;

// validate's capability walk (above) is .md-only; the eval judges are .json, so collect both here.
function walkExts(dir, exts, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkExts(p, exts, acc);
    else if (exts.some((e) => name.endsWith(e))) acc.push(p);
  }
  return acc;
}

for (const d of CANON_DIRS) {
  for (const file of walkExts(join(TARGET, "pharn", d), [".md", ".json"])) {
    if (isExcluded(file)) continue;
    const rel = relative(TARGET, file);
    const seen = new Set(); // one finding per stale checker per file, not one per occurrence
    let text;
    try {
      text = readFileSync(file, "utf8");
    } catch {
      continue;
    }
    for (const m of text.matchAll(FLOOR_REF_RE)) {
      const base = m[1];
      if (seen.has(base)) continue;
      // The gate: a twin in pharn/floor means the file MOVED and this cite is stale. No twin means
      // there is nothing to point at, so the cite is left alone.
      if (!existsSync(join(TARGET, "pharn", "floor", base))) continue;
      seen.add(base);
      finding(
        "blocking",
        "P6/floor-path",
        rel,
        `cites .dev/floor/${base}, but that checker now lives at pharn/floor/${base} — the cited path does not resolve, so the command ENOENTs and its deterministic check silently degrades`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Report — findings in the canonical shape (ARCHITECTURE §8)
const blocking = findings.filter((f) => f.severity === "blocking");
if (findings.length === 0) {
  console.log(`FLOOR: GREEN — ${capabilities.length} capabilities checked in ${showPath(TARGET)}`);
  process.exit(0);
}
console.log(
  `FLOOR: ${blocking.length ? "RED" : "GREEN-with-warnings"} — ${findings.length} finding(s), ${capabilities.length} capabilities checked\n`
);
for (const f of findings) {
  console.log(`- [${f.severity}] ${f.rule_id}  ${f.file}`);
  console.log(`    ${f.problem}`);
}
process.exit(blocking.length ? 1 : 0);
