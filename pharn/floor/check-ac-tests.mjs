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
//     "Approved, un-drifted, and this mapping was made against it" has exactly one implementation.
// The `## Files` of both files are read by plan-files-core.mjs — the SAME rule the build's writes-scope setter
// applies, held to it by ★ parity tests — and every path is compared AS THE SETTER SCOPES IT: `clean` (strip a
// trailing ` (…)` annotation), then `isConcrete`, then case-folded, because APFS is case-insensitive. So
// `in-plan-files` asks exactly "would the build be scoped to this file?". Comparing the raw text let a PLAN entry
// `tests/ac/a.test.js (gated)` through while the setter scoped the bare path (the review's blocking finding).
//
// NOT GUARANTEED (P0), each stated:
//   • that the tests are good, assert the AC's Then, or target the right public interface — model work
//     (`/pharn-test`), advisory; the target column is checked for PRESENCE only;
//   • that the build cannot write an AC test LATER: `in-plan-files` holds for the PLAN.md it read. An edit to
//     PLAN.md after `/pharn-test` reopens it until something re-checks (the queue's item 05 makes `/pharn-build`
//     refuse without a GREEN lock). A Bash write bypasses the write hooks entirely (LIMITS.md §6);
//   • that `/pharn-test` read only SPEC, PLAN and AC-TESTS.md — `reads:` is not enforced (ARCHITECTURE §3.1).
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
//       see it) · 2 unusable input (a named file absent/unreadable, a missing --features-dir, bad usage).

import { readFileSync, readdirSync, lstatSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { specAcceptanceCriteria } from "./spec-template-core.mjs";
import { clean, pathsFromPlanFiles } from "./plan-files-core.mjs";
import { badPath, mappingOf, scopeKey } from "./ac-tests-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECK_PLAN_SPEC_AGREE = join(HERE, "check-plan-spec-agree.mjs");

/** The closed set of RED kinds (plus `legacy-spec`, which is its own exit code). */
export const KINDS = Object.freeze([
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
 * The pure check (no chain check, no filesystem beyond what the caller passes).
 * @param {{acTestsText: string, specText: string, planText: string, others: {feature: string, files: string[]}[]}} input
 * @returns {{legacy: boolean, findings: {kind: string, detail: string}[]}}
 */
export function checkMapping({ acTestsText, specText, planText, others }) {
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
    return { legacy: true, findings };
  }
  if (spec.kind !== "feature") {
    // A test-infra SPEC is a bootstrap increment with no mapping (its lock is written by --write-bootstrap). A mapping
    // here means the kind changed after mapping — the pin covers the kind (check-spec.mjs pinHash), so `pin` REDs
    // too unless the SPEC was re-approved.
    red(
      "spec-kind",
      spec.kind === null
        ? "the SPEC's `spec_kind` is not one of {feature, test-infra} — run check-spec.mjs"
        : "the SPEC is `spec_kind: test-infra`, a bootstrap increment: it gets no AC-TESTS.md mapping"
    );
    return { legacy: false, findings };
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
  const fileKeys = new Set();
  for (const f of fileList) {
    const why = badPath(f);
    if (why) red("bad-path", `\`## Files\` entry ${shown(f)} is ${why}`);
    const k = scopeKey(f);
    if (k !== null) fileKeys.add(k);
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
  const mappedKeys = new Set();
  for (const r of mapping.rows) {
    if (!specLevel.has(r.id)) {
      red("unknown-ac", `line ${r.line}: ${r.id} is not an Acceptance Criterion of the SPEC`);
    } else if (specLevel.get(r.id) !== r.level) {
      red(
        "level-mismatch",
        `line ${r.line}: ${r.id} is mapped at \`${r.level}\` but the SPEC says \`${specLevel.get(r.id) ?? "a malformed level"}\``
      );
    }
    const k = scopeKey(r.file);
    if (k !== null) mappedKeys.add(k);
    // A placeholder/glob listed in `## Files` too is already a bad-path there; one that is NOT listed is unlisted.
    const listedVerbatim = k === null && fileList.includes(clean(r.file));
    if (!listedVerbatim && (k === null || !fileKeys.has(k)))
      red("unlisted-file", `line ${r.line}: ${shown(r.file)} is not in AC-TESTS.md \`## Files\``);
  }
  for (const f of fileList) {
    const k = scopeKey(f);
    if (k !== null && !mappedKeys.has(k)) red("unmapped-file", `\`## Files\` entry ${shown(f)} is mapped by no AC line`);
  }

  // The build exclusion: what the setter would scope from PLAN.md names none of them (case-folded).
  const plan = pathsFromPlanFiles(planText);
  const planKeys = new Set((plan.ok ? plan.value : []).map(scopeKey).filter((k) => k !== null));
  for (const f of fileList) {
    const k = scopeKey(f);
    if (k !== null && planKeys.has(k)) red("in-plan-files", `${shown(f)} is in PLAN.md \`## Files\`, so the build would be scoped to it`);
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

  return { legacy: false, findings };
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

function main(argv) {
  const args = argv.slice(2);
  if (args[0] === "--spec") {
    if (args.length !== 2) {
      console.log("usage: check-ac-tests.mjs --spec <SPEC.md>");
      return 2;
    }
    // Precedence, fixed (grill G10): unreadable 2 → legacy 3 → invalid spec_kind 2 → no usable criteria 2 →
    // test-infra 4 → templated 0.
    const spec = specAcceptanceCriteria(readOrExit(args[1], "SPEC.md"));
    if (!spec.templated) {
      console.log("LEGACY — the SPEC has no `spec_template`: no AC ids, so no AC-TESTS.md is written");
      return 3;
    }
    if (spec.kind === null) {
      console.log("UNUSABLE — the SPEC's `spec_kind` is not one of {feature, test-infra} — run check-spec.mjs");
      return 2;
    }
    if (spec.sections !== 1 || spec.items.length === 0) {
      console.log("UNUSABLE — the SPEC's `## Acceptance Criteria` is absent, duplicated or empty — run check-spec.mjs");
      return 2;
    }
    if (spec.kind === "test-infra") {
      if (spec.items.some((i) => i.level === null)) {
        console.log("UNUSABLE — a criterion's verify level is malformed, so the bootstrap levels are unknown — run check-spec.mjs");
        return 2;
      }
      const levels = [...new Set(spec.items.map((i) => i.level))].sort();
      console.log(`BOOTSTRAP — spec_kind: test-infra; no AC-TESTS.md; the lock records levels: ${levels.join(", ")}`);
      return 4;
    }
    console.log(`TEMPLATED — ${spec.items.length} AC(s): ${spec.items.map((i) => `${i.id} (${i.level ?? "malformed level"})`).join(", ")}`);
    return 0;
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

  const { findings } = checkMapping({ acTestsText, specText, planText, others });
  // The SPEC pin, SHELLED (P3): AC-TESTS.md carries spec_id + spec_content_hash exactly as PLAN.md does.
  const chain = spawnSync(process.execPath, [CHECK_PLAN_SPEC_AGREE, acPath, specPath], { encoding: "utf8" });
  if (chain.status !== 0) {
    findings.unshift({
      kind: "pin",
      detail: `AC-TESTS.md's spec_id/spec_content_hash do not match the current Approved, un-drifted SPEC (check-plan-spec-agree.mjs exit ${chain.status})`,
    });
  }
  if (findings.length) {
    for (const f of findings) console.log(`RED — ${f.kind}: ${f.detail}`);
    console.log(`\nRED — ${findings.length} AC-tests mapping check(s) failed`);
    return 1;
  }
  const rows = mappingOf(acTestsText).rows.length;
  console.log(
    `GREEN — ${rows} AC(s) mapped once each at the SPEC's level; every test file listed, none in PLAN.md \`## Files\` (as the setter scopes ` +
      `it), none claimed by another feature; the SPEC pin holds. NOTE (P0): this checks the MAPPING, never that the tests are good.`
  );
  return 0;
}

if (import.meta.main) process.exit(main(process.argv));
