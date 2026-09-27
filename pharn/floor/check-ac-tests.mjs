#!/usr/bin/env node
// pharn/floor/check-ac-tests.mjs — the deterministic check of a feature's AC-tests MAPPING
// (`pharn/features/<name>/AC-TESTS.md`), the file `/pharn-plan` writes and `/pharn-test` is scoped by.
// Contract: pharn/pharn-contracts/ac-tests.md.
//
// WHY (the decision the stage rests on): Acceptance Criteria are phrased testably (the spec-template AC grammar),
// but if the BUILD writes their tests it can write tests that fit its own implementation. So `/pharn-test` writes
// them BEFORE build, in a fresh context that sees SPEC + PLAN + this mapping, and the build may not touch them. This
// checker is the floor under that arrangement: every AC is mapped exactly once at the SPEC's own verify level, every
// test file the mapping names is a file `/pharn-test` is scoped to, and NONE of them is a file the build is scoped to.
//
// HONEST TRIGGER (P7): the maintainer's decision (the AC-delivery queue, item 03), not a dogfood failure.
//
// FLOOR (primitive #3 — enum/regex/set membership — plus #2 through the SHELLED chain check):
//   • the mapping lines' grammar, the closed level enum, and set equalities between the SPEC's AC ids, the
//     mapping's ids, AC-TESTS.md `## Files`, PLAN.md `## Files` and every other feature's AC-TESTS.md `## Files`;
//   • the SPEC pin: `check-plan-spec-agree.mjs <AC-TESTS.md> <SPEC.md>` — SHELLED, never re-implemented (P3), so
//     "Approved, un-drifted, and this mapping was made against it" has exactly one implementation. Its result is read
//     as a VERDICT (shelled-verdict-core.mjs, 6.21.1): exit 1 with its `RED — ` line is the `pin` RED; anything else
//     non-zero is a CRASH — no verdict on the pin, reported below, never a `pin` RED.
// The `## Files` of both files are read by plan-files-core.mjs — the SAME rule the build's writes-scope setter
// applies, held to it by ★ parity tests — and every path is compared AS THE SETTER SCOPES IT: `clean` (strip a
// trailing ` (…)` annotation), then `isConcrete`, then FOLDED — NFC and full case folding (ac-tests-core.mjs
// scopeKey, the write guard's fold), because APFS is case- and normalization-insensitive. So `in-plan-files` asks
// exactly "would the build be scoped to this file?". Comparing the raw text let a PLAN entry
// `tests/ac/a.test.js (gated)` through while the setter scoped the bare path (the review's blocking finding); a
// lowercase-only fold let an NFD or `ſ` spelling through (6.20.5). A MAPPING CELL is held to the opposite rule:
// it must be BYTE-IDENTICAL to a cleaned `## Files` entry, because the runner, the red run and the AC gate use
// the cell verbatim — a cell that matched only after folding was never collected (6.20.5).
//
// THE TEST INFRASTRUCTURE STAYS OUT OF THE BUILD'S SCOPE TOO (6.21.0, `test-infra-in-plan`): `/pharn-test` pins the root
// runner configs and the level gates' scripts BEFORE the build (test-infra-core.mjs), so a PLAN.md `## Files` entry the
// setter would scope to a root runner config certifies a build whose own in-scope edit reads `test-infra-changed` at
// `/pharn-verify` — no rebuild clears it. The entry is classified by test-infra-core's testInfraPathKind (the pin's own
// predicate, imported — never a second regex). Since 6.31.0 the kind also covers the root package-manager configs the
// pin hashes (`.npmrc`, `.yarnrc`, `.yarnrc.yml`) and every file the level gates' scripts NAME (test-infra-core's
// scriptNamedFiles over the tree at the invoking directory — the reporter a `pharn-json` gate loads, say; the review's
// H2 wB: a build scoped to it wrote a reporter that said `passed`). `package.json` / `pharn.config.json` get an ADVISORY
// `NOTE —` line and no RED, never changing the exit code: the build may legitimately change a dependency, and this
// checker cannot see WHICH part of the file the build will change — every part the pin reads (the level gates'
// scripts, the scripts they chain to, the `jest` key, the `testResults` formats) is still compared at verify.
//
// THE FEATURE'S OWN AC ARTIFACTS STAY OUT OF THE BUILD'S SCOPE (6.31.0, `ac-artifact-in-plan`): a PLAN.md `## Files`
// entry the setter would scope to THIS feature's AC-TESTS.md or AC-TESTS.lock.json is RED. The lock is what the AC gate
// compares the tree with — a build scoped to it re-pinned whatever it changed, with every floor check green (the
// review's H2) — and it pins AC-TESTS.md's bytes, so the two go together. Both are named as the invoking directory
// spells them: the mapping path on argv and the lock beside it, relative to the project root the setter resolves
// scope entries against. Compared FOLDED (scopeKey), which over-reports a case variant the guard would deny anyway.
//
// NOT GUARANTEED (P0), each stated:
//   • that the tests are good, assert the AC's Then, or target the right public interface — model work
//     (`/pharn-test`), advisory; the target column is checked for PRESENCE only;
//   • that the build cannot write an AC test LATER: `in-plan-files` holds for the PLAN.md it read. An edit to
//     PLAN.md after `/pharn-test` reopens it until something re-checks (the queue's item 05 makes `/pharn-build`
//     refuse without a GREEN lock). A Bash write bypasses the write hooks entirely (LIMITS.md §6);
//   • that `/pharn-test` read only SPEC, PLAN and AC-TESTS.md — `reads:` is not enforced (ARCHITECTURE §3.1);
//   • that the files the level gates' scripts name are ALL of what those gates run — the token pass is a closed,
//     literal rule, and what it does not read is listed once, in test-infra-core.mjs's header.
//
// TRUST (P2): all three files are untrusted DATA. Verdicts range over ids, a closed level enum, paths and the chain
// check's exit code. The target text is never interpreted; a RED quotes at most a bounded id or path.
//
// Usage:
//   node pharn/floor/check-ac-tests.mjs <AC-TESTS.md> <SPEC.md> <PLAN.md> [--features-dir <dir>]
//     --features-dir: where the OTHER features' AC-TESTS.md live, for `claimed-elsewhere` (default: the directory
//     two levels above AC-TESTS.md, i.e. `pharn/features` for `pharn/features/<name>/AC-TESTS.md`).
//
//   node pharn/floor/check-ac-tests.mjs --spec <SPEC.md>
//     decide BEFORE any mapping exists what the SPEC gets: exit 0 templated (prints the ids and levels), 3 legacy,
//     4 bootstrap (`spec_kind: test-infra`, 6.18.0 — no mapping; prints the levels the lock records), 2 unusable.
//     /pharn-plan and /pharn-test branch on it.
//
// Exit (full mode): 0 GREEN · 1 RED (every kind, legacy-spec included: a mapping for a SPEC without
//       `spec_template` means the key was removed after mapping — it sits outside the body hash, so the pin cannot
//       see it) · 2 unusable input (a named file absent/unreadable, a missing --features-dir, bad usage) — and, since
//       6.21.1, the chain check CRASHED while no kind is RED: the FIRST line is then `UNUSABLE child-crashed — …`,
//       which check-test-stage.mjs reads as UNUSABLE. With a RED kind the exit stays 1 and the crash is named on a
//       line before the closing `RED — N … failed`.

import { readFileSync, readdirSync, lstatSync, realpathSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { specAcceptanceCriteria, specVerdict, SPEC_KINDS, TEST_FIRST_KINDS } from "./spec-template-core.mjs";
import { clean, pathsFromPlanFiles } from "./plan-files-core.mjs";
import { LEVELS, badPath, mappingOf, scopeKey, scopedPath } from "./ac-tests-core.mjs";
import { isPackageManagerConfigName, scriptNamedFiles, testInfraPathKind } from "./test-infra-core.mjs";
import { childCrashedLine, crashedDetail, shelledVerdict } from "./shelled-verdict-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECK_PLAN_SPEC_AGREE = join(HERE, "check-plan-spec-agree.mjs");
/** The lock's file name, beside AC-TESTS.md. A literal, NOT imported from ac-tests-lock.mjs — that module's load graph
 *  (red-run-core, gate-run-core, a spawn of check-spec-approved) has no business in a mapping checker; a ✧ parity test
 *  pins the two spellings equal. */
export const LOCK_NAME = "AC-TESTS.lock.json";

/** The closed set of RED kinds. In full mode every one exits 1, `legacy-spec` included; exit 3 is `--spec` mode's
 *  legacy verdict (specVerdict), never this set's. */
export const KINDS = Object.freeze([
  "ac-artifact-in-plan",
  "bad-path",
  "claimed-elsewhere",
  "duplicate-ac",
  "in-plan-files",
  "legacy-spec",
  "level-mismatch",
  "malformed-line",
  "missing-ac",
  "no-files",
  "pin",
  "spec-kind",
  "test-infra-in-plan",
  "unknown-ac",
  "unlisted-file",
  "unmapped-file",
]);

export { LEVELS, MAPPING_RE, badPath, mappingOf, scopeKey } from "./ac-tests-core.mjs";

const SHOWN = 80;

function shown(v) {
  const t = String(v);
  return JSON.stringify(t.length > SHOWN ? `${t.slice(0, SHOWN)}…` : t);
}

/**
 * The pure check (no chain check, no filesystem beyond what the caller passes). `acArtifacts` — THIS feature's
 * AC-TESTS.md and AC-TESTS.lock.json, spelled relative to the project root — and `scriptFiles` — the files the level
 * gates' scripts name (test-infra-core scriptNamedFiles) — are REQUIRED arrays (L41): an omitted one would silently
 * switch its RED off.
 * @param {{acTestsText: string, specText: string, planText: string, others: {feature: string, files: string[]}[], acArtifacts: string[], scriptFiles: string[]}} input
 * @returns {{legacy: boolean, findings: {kind: string, detail: string}[], notes: string[]}}
 */
export function checkMapping({ acTestsText, specText, planText, others, acArtifacts, scriptFiles }) {
  if (!Array.isArray(acArtifacts) || !acArtifacts.every((p) => typeof p === "string"))
    throw new TypeError("checkMapping: `acArtifacts` must be an array of paths (this feature's AC-TESTS.md and lock)");
  if (!Array.isArray(scriptFiles) || !scriptFiles.every((p) => typeof p === "string"))
    throw new TypeError("checkMapping: `scriptFiles` must be an array of paths (the files the level gates' scripts name)");
  const findings = [];
  const red = (kind, detail) => {
    if (!KINDS.includes(kind)) throw new Error(`internal: ${kind} is not a member of KINDS`);
    findings.push({ kind, detail });
  };

  const spec = specAcceptanceCriteria(specText);
  if (!spec.templated) {
    red(
      "legacy-spec",
      "the SPEC has no `spec_template`, yet a mapping exists — the key was removed after mapping (it is outside the body hash, so the pin cannot see it)"
    );
    return { legacy: true, findings, notes: [] };
  }
  if (!TEST_FIRST_KINDS.includes(spec.kind)) {
    // A non-test-first SPEC (today: `test-infra`) is a bootstrap increment with no mapping (its lock is written by
    // --write-bootstrap). A mapping here means the kind changed after mapping — the pin covers the kind
    // (check-spec.mjs pinHash), so `pin` REDs too unless the SPEC was re-approved. `feature` and `quick` (6.25.0)
    // are both TEST_FIRST_KINDS: a quick SPEC gets the SAME AC evidence as a feature SPEC, just fewer criteria.
    red(
      "spec-kind",
      spec.kind === null
        ? spec.kindInBody
          ? "the SPEC's body opens with a `spec_kind:` line, which the approval pin cannot tell from the frontmatter key — run check-spec.mjs"
          : `the SPEC's \`spec_kind\` is not one of {${SPEC_KINDS.join(", ")}} — run check-spec.mjs`
        : `the SPEC is \`spec_kind: ${spec.kind}\`, a bootstrap increment: it gets no AC-TESTS.md mapping`
    );
    return { legacy: false, findings, notes: [] };
  }
  if (spec.sections !== 1 || spec.items.length === 0) {
    // check-spec.mjs REDs this shape itself; here it is refused rather than read as "no criteria to map" (L34).
    red("missing-ac", "the SPEC's `## Acceptance Criteria` is absent, duplicated or empty — run check-spec.mjs");
  }

  // Every entry as the setter would scope it (clean, then concrete), so the mapping, PLAN.md and every other
  // feature are compared in the one spelling the hook enforces.
  const files = pathsFromPlanFiles(acTestsText);
  const fileList = (files.ok ? files.value : []).map(clean);
  if (fileList.length === 0) red("no-files", "AC-TESTS.md has no `## Files` list naming at least one test file");
  for (const f of fileList) {
    const why = badPath(f);
    if (why) red("bad-path", `\`## Files\` entry ${shown(f)} is ${why}`);
  }

  const mapping = mappingOf(acTestsText);
  if (!mapping.present) red("malformed-line", "AC-TESTS.md has no `## Mapping` section");
  if (mapping.extraSections > 0) red("malformed-line", "AC-TESTS.md has more than one `## Mapping` section — only one is read");
  for (const n of mapping.malformed) {
    red("malformed-line", `line ${n}: not \`- AC-<n> | <unit|integration|e2e> | \`<test file>\` | <public target>\``);
  }

  // AC ids: exactly once each, at the SPEC's level.
  const specLevel = new Map(spec.items.map((it) => [it.id, it.level]));
  const count = new Map();
  for (const r of mapping.rows) count.set(r.id, (count.get(r.id) ?? 0) + 1);
  for (const it of spec.items) {
    if (!count.has(it.id)) red("missing-ac", `${it.id} (SPEC line ${it.line}) has no mapping line`);
  }
  for (const [id, n] of count) {
    if (n > 1) red("duplicate-ac", `${id} has ${n} mapping lines — exactly one is allowed`);
  }
  // A cell is matched to `## Files` BYTE-EXACTLY (the cleaned entry): the runner, the red run and the AC gate all
  // consume the cell verbatim, so a cell that equals an entry only after folding names a path no test is reported
  // under. The fold still decides whether to SAY so — the detail then names the entry to copy.
  const listedByKey = new Map();
  for (const f of fileList) {
    const k = scopeKey(f);
    if (k !== null && !listedByKey.has(k)) listedByKey.set(k, f);
  }
  const mappedCells = new Set();
  for (const r of mapping.rows) {
    if (!specLevel.has(r.id)) {
      red("unknown-ac", `line ${r.line}: ${r.id} is not an Acceptance Criterion of the SPEC`);
    } else if (specLevel.get(r.id) !== r.level) {
      red(
        "level-mismatch",
        `line ${r.line}: ${r.id} is mapped at \`${r.level}\` but the SPEC says \`${specLevel.get(r.id) ?? "a malformed level"}\``
      );
    }
    mappedCells.add(r.file);
    // A placeholder/glob listed in `## Files` too is already a bad-path there; one that is NOT listed is unlisted.
    if (!fileList.includes(r.file)) {
      const k = scopeKey(r.file);
      const near = k === null ? undefined : listedByKey.get(k);
      red(
        "unlisted-file",
        near === undefined
          ? `line ${r.line}: ${shown(r.file)} is not in AC-TESTS.md \`## Files\``
          : `line ${r.line}: ${shown(r.file)} differs from the \`## Files\` entry ${shown(near)} only in letter case or Unicode form — spell the cell byte-for-byte as listed (the runner and the red run use it verbatim)`
      );
    }
  }
  for (const f of fileList) {
    if (scopeKey(f) !== null && !mappedCells.has(f)) red("unmapped-file", `\`## Files\` entry ${shown(f)} is mapped by no AC line`);
  }

  // The build exclusion: what the setter would scope from PLAN.md names none of them (case-folded).
  const plan = pathsFromPlanFiles(planText);
  const planKeys = new Set((plan.ok ? plan.value : []).map(scopeKey).filter((k) => k !== null));
  for (const f of fileList) {
    const k = scopeKey(f);
    if (k !== null && planKeys.has(k)) red("in-plan-files", `${shown(f)} is in PLAN.md \`## Files\`, so the build would be scoped to it`);
  }

  // The feature's own AC artifacts stay out of the build's scope (6.31.0): the lock is what the AC gate compares the tree
  // with, and it pins AC-TESTS.md — a build scoped to either could re-pin what it changed.
  const artifactKeys = new Map();
  for (const p of acArtifacts) {
    const k = scopeKey(p);
    if (k !== null) artifactKeys.set(k, p);
  }
  // The files the level gates' scripts name (6.31.0), compared the same way.
  const namedKeys = new Map();
  for (const p of scriptFiles) {
    const k = scopeKey(p);
    if (k !== null) namedKeys.set(k, p);
  }

  // The test infrastructure the lock pins stays out of the build's scope too (6.21.0): a root runner or (6.31.0)
  // package-manager config in PLAN.md is RED — every write the build could make there changes the pin — and so is a
  // file a level gate's script names; a manifest is an advisory NOTE only.
  const notes = [];
  for (const entry of plan.ok ? plan.value : []) {
    const k = scopeKey(entry);
    if (k !== null && artifactKeys.has(k)) {
      red(
        "ac-artifact-in-plan",
        `PLAN.md \`## Files\` names ${shown(entry)}, this feature's ${shown(basename(artifactKeys.get(k)))} — /pharn-test writes it before the build and the AC gate judges the build against it, so the build may never be scoped to it; drop the entry`
      );
    }
    const kind = testInfraPathKind(entry);
    if (kind === "config") {
      const what = isPackageManagerConfigName(scopedPath(entry)) ? "a root package-manager config" : "a root runner config";
      red(
        "test-infra-in-plan",
        `PLAN.md \`## Files\` names ${shown(entry)}, ${what} /pharn-test pins before the build — the build's edit would read test-infra-changed at /pharn-verify; put the runner change in a \`spec_kind: test-infra\` increment first (via /pharn-ship), then plan this feature without it`
      );
    } else if (kind === "manifest") {
      notes.push(
        `PLAN.md \`## Files\` names ${shown(entry)}: the build may change it (a dependency, say), but not the level gates' scripts, their pre/post scripts, the scripts they chain to, package.json's \`jest\` key or the \`testResults\` formats /pharn-test pinned — that reads test-infra-changed at /pharn-verify. ADVISORY: this checker cannot see which part the build will change.`
      );
    } else if (k !== null && namedKeys.has(k)) {
      red(
        "test-infra-in-plan",
        `PLAN.md \`## Files\` names ${shown(entry)}, a file a level gate's script names (${shown(namedKeys.get(k))}) — /pharn-test pins it before the build, so the build's edit would read test-infra-changed at /pharn-verify; put the change in a \`spec_kind: test-infra\` increment first (via /pharn-ship), then plan this feature without it`
      );
    }
  }

  // Feature ownership: no other feature's AC-TESTS.md claims the same file.
  const owner = new Map();
  for (const o of others) {
    for (const f of o.files) {
      const k = scopeKey(f);
      if (k !== null && !owner.has(k)) owner.set(k, o.feature);
    }
  }
  for (const f of fileList) {
    const k = scopeKey(f);
    if (k !== null && owner.has(k)) red("claimed-elsewhere", `${shown(f)} is already an AC test file of feature ${shown(owner.get(k))}`);
  }

  return { legacy: false, findings, notes };
}

/** Every OTHER feature directory's AC-TESTS.md `## Files`, read from `featuresDir`. A directory without one, or
 *  an unreadable one, contributes nothing; a symlinked entry is skipped (never followed). */
export function otherFeatures(featuresDir, self) {
  const out = [];
  let names;
  try {
    names = readdirSync(featuresDir).sort();
  } catch {
    return out;
  }
  for (const name of names) {
    if (name === self) continue;
    const dir = join(featuresDir, name);
    try {
      if (!lstatSync(dir).isDirectory()) continue;
      const parsed = pathsFromPlanFiles(readFileSync(join(dir, "AC-TESTS.md"), "utf8"));
      if (parsed.ok) out.push({ feature: name, files: parsed.value });
    } catch {
      /* no AC-TESTS.md there */
    }
  }
  return out;
}

function readOrExit(path, label) {
  try {
    return readFileSync(path, "utf8");
  } catch (e) {
    console.log(`UNUSABLE — ${label} is not readable (${path}): ${e.code ?? e.message}`);
    process.exit(2);
  }
}

/** A path's real location when it exists (so `/var/…` and `/private/var/…` agree on macOS), else its resolved form. */
function canon(p) {
  try {
    return realpathSync(p);
  } catch {
    return resolve(p);
  }
}

/** THIS feature's AC artifacts — the mapping path on argv and the lock beside it — spelled relative to the invoking
 *  directory, the project root the writes-scope setter resolves `## Files` entries against (POSIX separators). A
 *  mapping outside that directory yields `..`-led spellings no setter scope entry opens (the guard's own containment). */
export function ownArtifacts(acPath, cwd) {
  const rel = relative(canon(cwd), canon(dirname(resolve(cwd, acPath))))
    .split(sep)
    .join("/");
  const at = (n) => (rel === "" ? n : `${rel}/${n}`);
  return [at(basename(acPath)), at(LOCK_NAME)];
}

/** The mapped levels the lock's pin will range over: the SPEC's criteria levels and the mapping rows', each a member of
 *  LEVELS (a mismatch between the two is already `level-mismatch`). */
function pinLevels(specText, acTestsText) {
  const levels = new Set();
  for (const it of specAcceptanceCriteria(specText).items) if (LEVELS.includes(it.level)) levels.add(it.level);
  for (const r of mappingOf(acTestsText).rows) if (LEVELS.includes(r.level)) levels.add(r.level);
  return [...levels].sort();
}

function main(argv) {
  const args = argv.slice(2);
  if (args[0] === "--spec") {
    if (args.length !== 2) {
      console.log("usage: check-ac-tests.mjs --spec <SPEC.md>");
      return 2;
    }
    const v = specVerdict(readOrExit(args[1], "SPEC.md"));
    console.log(v.line);
    return v.code;
  }
  const fd = args.indexOf("--features-dir");
  let featuresDir = null;
  if (fd !== -1) {
    featuresDir = args[fd + 1];
    if (!featuresDir || featuresDir.startsWith("--")) {
      console.log("UNUSABLE — --features-dir needs a directory");
      return 2;
    }
    args.splice(fd, 2);
    try {
      if (!lstatSync(featuresDir).isDirectory()) throw new Error("not a directory");
    } catch (e) {
      // Fail-closed: a features dir that is not there would make `claimed-elsewhere` vacuously GREEN.
      console.log(`UNUSABLE — --features-dir ${featuresDir} is not a directory (${e.code ?? e.message})`);
      return 2;
    }
  }
  if (args.length !== 3) {
    console.log("usage: check-ac-tests.mjs <AC-TESTS.md> <SPEC.md> <PLAN.md> [--features-dir <dir>] | --spec <SPEC.md>");
    return 2;
  }
  const [acPath, specPath, planPath] = args;
  const acTestsText = readOrExit(acPath, "AC-TESTS.md");
  const specText = readOrExit(specPath, "SPEC.md");
  const planText = readOrExit(planPath, "PLAN.md");
  const self = basename(dirname(resolve(acPath)));
  const others = otherFeatures(featuresDir ?? dirname(dirname(resolve(acPath))), self);
  const acArtifacts = ownArtifacts(acPath, process.cwd());
  // The files the level gates' scripts name, over the tree at the invoking directory (the root the lock's pin reads).
  // A tree the pin cannot read yields a NOTE, not a RED: /pharn-test's lock refuses that same tree, so no build starts.
  const levels = pinLevels(specText, acTestsText);
  const named = levels.length ? scriptNamedFiles({ root: process.cwd(), levels }) : { ok: true, paths: [] };
  const scriptFiles = named.ok ? named.paths : [];

  const { findings, notes } = checkMapping({ acTestsText, specText, planText, others, acArtifacts, scriptFiles });
  if (!named.ok) {
    notes.push(
      `the files the level gates' scripts name could not be read (${named.reason}) — none was checked against PLAN.md \`## Files\`; /pharn-test's lock refuses the same tree`
    );
  }
  // The SPEC pin, SHELLED (P3): AC-TESTS.md carries spec_id + spec_content_hash exactly as PLAN.md does. Since 6.21.1
  // its result is read as a VERDICT (shelled-verdict-core.mjs): `pin` only when the chain check REDs. A crash is no
  // verdict on the pin, never a `pin` RED — check-test-stage.mjs reads this checker's RED as `mapping-red`, which
  // /pharn-loop stops on as S13.
  const chain = spawnSync(process.execPath, [CHECK_PLAN_SPEC_AGREE, acPath, specPath], { encoding: "utf8" });
  const pin = shelledVerdict(chain);
  if (pin === "red") {
    findings.unshift({
      kind: "pin",
      detail: `AC-TESTS.md's spec_id/spec_content_hash do not match the current Approved, un-drifted SPEC (check-plan-spec-agree.mjs exit ${chain.status})`,
    });
  }
  const crash =
    pin === "crashed" ? childCrashedLine(crashedDetail("check-plan-spec-agree.mjs", chain, "the SPEC pin was not checked")) : null;
  // A NOTE never changes the exit code (advisory, P0); it prints on the RED and the GREEN path alike. On the RED path it
  // goes BEFORE the closing summary, so the closing line stays the `RED — ` line check-test-stage.mjs reads a verdict by.
  const printNotes = () => {
    for (const n of notes) console.log(`NOTE — ${n}`);
  };
  if (findings.length) {
    for (const f of findings) console.log(`RED — ${f.kind}: ${f.detail}`);
    // A definite RED is a verdict whatever the pin would have said: the crash is named, never counted (6.21.1).
    if (crash) console.log(crash);
    printNotes();
    console.log(`\nRED — ${findings.length} AC-tests mapping check(s) failed`);
    return 1;
  }
  if (crash) {
    // No RED and no pin verdict: unusable, the report FIRST — check-test-stage.mjs reads it there (6.21.1).
    console.log(crash);
    printNotes();
    return 2;
  }
  const rows = mappingOf(acTestsText).rows.length;
  // The GREEN line claims only what was checked: when the named files could not be read, it says so (the NOTE says why).
  const namedClaim = named.ok
    ? "no file a level gate's script names, "
    : "(the files a level gate's script names NOT checked — see the NOTE), ";
  console.log(
    `GREEN — ${rows} AC(s) mapped once each at the SPEC's level; every test file listed, none in PLAN.md \`## Files\` (as the setter scopes ` +
      `it), none claimed by another feature; no root runner or package-manager config, ${namedClaim}and neither ` +
      `this feature's AC-TESTS.md nor its lock in PLAN.md; the SPEC pin holds. NOTE (P0): this checks the MAPPING, never that the tests are good.`
  );
  printNotes();
  return 0;
}

if (import.meta.main) process.exit(main(process.argv));
