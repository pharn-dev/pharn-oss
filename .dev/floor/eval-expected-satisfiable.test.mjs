// .dev/floor/eval-expected-satisfiable.test.mjs — every committed capability eval can be passed by an output
// that meets its own pins.
//
// THE TRIGGER (P7). `pharn/pharn-review/swallowed-exception/evals/expected/expected-intentional-comment.json`
// pinned `file` to `…/case-intentional-comment.md:16` (`file_resolves`) and also forbade the needle `intentional`
// in every enum-gated field, `file` included. The ideal finding therefore exited 1 from
// `pharn/floor/check-structural.mjs`, and the eval could not be passed by any output. It sat from #50 (2026-07-04)
// until #356 ran the lens on that case and found it, because nothing ever fed an expected file an output that meets
// its own pins. A note in canon would be a discipline-only remedy, which recurs (L20); #356 found it by coincidence
// (L53), so this test makes the detection standing.
//
// WHAT IT CHECKS. For every capability expected JSON under `pharn/` (`…/evals/expected/*.json`, DISCOVERED by a walk,
// never listed — L29, L36), build a WITNESS output from that file's own pins and run the real checker over it. Any
// non-zero exit fails the test, naming the file and the checker's output. The pass/fail decision belongs to the
// checker (L55, L74): this file never re-derives which fields are enum-gated or how a needle matches.
//
// What a RED from test 1 can mean, because the checker checks everything it is given:
//   • a needle that is a substring of a value the same file pins (the #356 defect), or two pins that contradict;
//   • a `file_resolves` path that no longer exists, or whose line is past the end of the file (the checker resolves
//     the witness `file` against the repo), so renaming or shortening a case file turns this test red too;
//   • a malformed assertion (an unknown kind, op or field), which the checker REDs by itself.
//
// THE WITNESS, the only model this file owns:
//   • one finding whose `type`, `rule_id`, `severity`, `file`, `problem` and `evidence` are all "";
//   • each `field_equals` sets its `field` to its `value` (only when `field` is one of those six keys; any other field
//     is left to the checker, which REDs it), and each `file_resolves` sets `file` to its `value`;
//   • the count is read from the FIRST `finding_count` in file order: `value` for `==` or `>=`, `min(1, value)` for
//     `<=`; 1 when the file has no `finding_count`, or when the value is not a non-negative integer (the checker REDs
//     that assertion). The witness is that many copies. No committed file has two `finding_count` assertions today
//     (measured by /pharn-dev-grill on this increment); one that did could only get a false RED here.
// An empty string contains no non-empty needle, and the checker REDs an empty needle by itself. A construction error
// can only produce a false RED, which is loud. It cannot produce a false GREEN, because a GREEN is an output the
// checker accepted.
//
// ── Honest scope (P0) ────────────────────────────────────────────────────────────────────────────────────────────
// FLOOR (what green means): the real `check-structural.mjs` exits 0 on the witness of every walked file; the walked
// set is non-empty and holds the file that failed; each pin branch of the construction (`file_resolves`,
// `field_equals`) is shown to carry a contradiction to a RED; and the witness for the failed file is the pinned
// finding, compared against hand-written literals.
// NOT guaranteed:
//   • UNPINNED FIELDS. The witness fills only what a file pins. A needle that collides with what a correct finding
//     would put in an unpinned field (a case path holding a needle, in a file with no `file_resolves`) passes here.
//   • A file whose witness is `[]` (`finding_count == 0`, 42 files when this landed) passes every per-finding
//     assertion vacuously. That is correct for "can be passed", and it says nothing about those files' needles.
//   • A GREEN means the eval CAN be passed, never that the live lens passes it. Live measurement is /pharn-dev-eval.
//   • Only `pharn/` is walked; `.dev/**` and any sibling checkout under `.claude/worktrees/` are not.
//
// PLACEMENT. It sweeps the product surface from `.dev/`, the direction a user install allows (an install ships
// `pharn/` without `.dev/`), with no paired checker, like `source-nul-guard.test.mjs` and `entry-point-guard.test.mjs`.
// `npm test` collects it through `.dev/**/*.test.mjs`.
//
// Trust (P2): the needles and the case paths come from `trust: untrusted` fixtures. They are copied into the witness
// as JSON strings and handed to the checker by file path; nothing here evaluates them or puts them on a command line
// (`spawnSync` with an argv array whose members are this file's own paths). Non-LLM, stdlib-only. Determinism (P5):
// the walk is sorted, and the construction branches only on `kind` and `op` membership.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname, basename, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const CHECKER = join(REPO, "pharn", "floor", "check-structural.mjs");

/** The member that failed (#356). Test 1 asserts it is in the walked set (L52). */
const FAILED_MEMBER = "pharn/pharn-review/swallowed-exception/evals/expected/expected-intentional-comment.json";

const SCRATCH = mkdtempSync(join(tmpdir(), "pharn-eval-satisfiable-"));
after(() => rmSync(SCRATCH, { recursive: true, force: true }));

/** Every `<…>/evals/expected/*.json` under `dir`, as repo-relative `/` paths. Symlinks are not followed. */
function walkExpected(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkExpected(p, out);
    else if (e.isFile() && e.name.endsWith(".json") && basename(dirname(p)) === "expected" && basename(dirname(dirname(p))) === "evals") {
      out.push(relative(REPO, p).split(sep).join("/"));
    }
  }
  return out;
}

/** The swept set, materialized once; every assertion below iterates it (L29). */
const EXPECTED = walkExpected(join(REPO, "pharn")).sort();

const FINDING_KEYS = ["type", "rule_id", "severity", "file", "problem", "evidence"];

/** The witness count for one `finding_count` assertion (the rule in the header). */
function countFor(a) {
  if (!Number.isInteger(a.value) || a.value < 0) return 1;
  if (a.op === "==" || a.op === ">=") return a.value;
  if (a.op === "<=") return Math.min(1, a.value);
  return 1;
}

/** Build the witness output an expected file's own pins describe. */
function witnessFor(expected) {
  const structural = expected && expected.assertions && expected.assertions.structural;
  const finding = Object.fromEntries(FINDING_KEYS.map((k) => [k, ""]));
  let count = 1;
  if (Array.isArray(structural)) {
    for (const a of structural) {
      if (!a || typeof a !== "object") continue;
      if (a.kind === "field_equals" && FINDING_KEYS.includes(a.field)) finding[a.field] = a.value;
      else if (a.kind === "file_resolves") finding.file = a.value;
    }
    const firstCount = structural.find((a) => a && a.kind === "finding_count");
    if (firstCount) count = countFor(firstCount);
  }
  return Array.from({ length: count }, () => ({ ...finding }));
}

let seq = 0;
/** Run the real checker over `actual`, with `expectedPath` resolved against the repo. */
function runChecker(expectedPath, actual) {
  const actualPath = join(SCRATCH, `actual-${++seq}.json`);
  writeFileSync(actualPath, JSON.stringify(actual));
  const r = spawnSync(process.execPath, [CHECKER, expectedPath, actualPath, REPO], { encoding: "utf8" });
  return { status: r.status, out: `${r.stdout || ""}${r.stderr || ""}`.trim() };
}

/** Write a JSON value to scratch and return its path. */
function writeScratch(name, value) {
  const p = join(SCRATCH, name);
  writeFileSync(p, JSON.stringify(value));
  return p;
}

test("✧ every committed capability expected JSON under pharn/ is passed by the witness its own pins describe", () => {
  // L34: an empty walk would make the per-file loop pass vacuously, so the domain is asserted first.
  assert.ok(EXPECTED.length > 0, "walked 0 `evals/expected/*.json` files under pharn/: the walk broke or moved");
  assert.ok(
    EXPECTED.includes(FAILED_MEMBER),
    `the walked set lacks ${FAILED_MEMBER}, the member whose failure (#356) this test exists for`
  );
  const failures = [];
  for (const rel of EXPECTED) {
    const expected = JSON.parse(readFileSync(join(REPO, rel), "utf8"));
    const r = runChecker(join(REPO, rel), witnessFor(expected));
    if (r.status !== 0) failures.push(`${rel} (exit ${r.status}):\n    ${r.out.split("\n").join("\n    ")}`);
  }
  assert.deepEqual(
    failures,
    [],
    `${failures.length} of ${EXPECTED.length} expected file(s) cannot be passed by an output that meets their own ` +
      `pins (check-structural.mjs over the witness):\n  ${failures.join("\n  ")}`
  );
});

test("✧ negative control, file_resolves branch: the swallowed-exception eval with its bare `intentional` needle REDs", () => {
  const committed = JSON.parse(readFileSync(join(REPO, FAILED_MEMBER), "utf8"));
  // The anchor (L60): exactly one needle starts with `intentional`, and the mutant must carry the bare word, so a
  // future edit that drops the needle fails here instead of leaving the control unable to fire.
  const anchors = committed.assertions.structural.filter(
    (a) => a.kind === "needle_absent_from_enum_gated" && a.needle.startsWith("intentional")
  );
  assert.equal(anchors.length, 1, "expected exactly one `intentional…` needle in the committed file");
  const mutant = structuredClone(committed);
  for (const a of mutant.assertions.structural) {
    if (a.kind === "needle_absent_from_enum_gated" && a.needle.startsWith("intentional")) a.needle = "intentional";
  }
  const r = runChecker(writeScratch("mutant-intentional.json", mutant), witnessFor(mutant));
  assert.notEqual(r.status, 0, `the pre-fix shape must RED, got exit ${r.status}:\n${r.out}`);
  assert.ok(
    r.out.includes('needle "intentional" found in enum-gated field "file"'),
    `the RED must name the needle in \`file\` (the #356 shape):\n${r.out}`
  );
});

test("✧ negative control, field_equals branch: a needle equal to a pinned rule_id REDs on rule_id", () => {
  const synthetic = {
    skill_kind: "llm",
    assertions: {
      structural: [
        { kind: "finding_count", op: "==", value: 1 },
        { kind: "field_equals", field: "rule_id", value: "P2" },
        { kind: "needle_absent_from_enum_gated", needle: "P2" },
      ],
    },
  };
  const r = runChecker(writeScratch("synthetic-rule-id.json", synthetic), witnessFor(synthetic));
  assert.notEqual(r.status, 0, `a needle equal to a pinned value must RED, got exit ${r.status}:\n${r.out}`);
  assert.ok(r.out.includes('needle "P2" found in enum-gated field "rule_id"'), `the RED must name the field rule_id:\n${r.out}`);
});

test("✧ the witness carries the pins: the failed member's witness is the pinned finding, and the count rule holds", () => {
  // Hand-written literals, never values read back from the file the witness was built from (L74): a reference
  // re-derived from the construction's own input could not catch the construction dropping a pin.
  const committed = JSON.parse(readFileSync(join(REPO, FAILED_MEMBER), "utf8"));
  assert.deepEqual(witnessFor(committed), [
    {
      type: "FINDING",
      rule_id: "P2",
      severity: "important",
      file: "pharn/pharn-review/swallowed-exception/evals/cases/case-intentional-comment.md:16",
      problem: "",
      evidence: "",
    },
  ]);
  const lengthFor = (structural) => witnessFor({ assertions: { structural } }).length;
  assert.equal(lengthFor([]), 1, "no finding_count → one finding");
  assert.equal(lengthFor([{ kind: "finding_count", op: "==", value: 0 }]), 0, "== 0 → no finding");
  assert.equal(lengthFor([{ kind: "finding_count", op: "==", value: 2 }]), 2, "== 2 → two findings");
  assert.equal(lengthFor([{ kind: "finding_count", op: ">=", value: 3 }]), 3, ">= 3 → three findings");
  assert.equal(lengthFor([{ kind: "finding_count", op: "<=", value: 4 }]), 1, "<= 4 → one finding");
  assert.equal(lengthFor([{ kind: "finding_count", op: "<=", value: 0 }]), 0, "<= 0 → no finding");
  assert.equal(
    lengthFor([
      { kind: "finding_count", op: ">=", value: 2 },
      { kind: "finding_count", op: "<=", value: 3 },
    ]),
    2,
    "two finding_count assertions → the first one in file order decides"
  );
});
