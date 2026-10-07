// pharn/floor/reconcile-detail-core.test.mjs — reconcile-detail-core.mjs's suite (6.55.0): the stamp lookup, the
// closed log states (L34 — a garbage log is a named state, never an empty list), the parse of the checker's JSON
// document with its row cap, the one-copy reason enum (L35), and the shared renderer's trust rules (P2 — a hostile
// file name stays one JSON-quoted row inside a fence; a reason renders inline only after a membership test).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  reconcileRun,
  reconcileDetail,
  reconcileDetailLines,
  wantsReconcileSection,
  ESCAPE_REASONS,
  WIDENED_REASON,
  RECONCILE_VERDICTS,
  DETAIL_STATES,
  ESCAPE_ROW_CAP,
  RERUN_COMMAND,
} from "./reconcile-detail-core.mjs";
import * as checker from "./check-bash-reconcile.mjs";
import { reconcileEntry } from "./gate-run-core.mjs";

const HOSTILE = "src/x\n# fake heading\n```\n[click](https://evil.example)|`tick`";

function doc(over = {}) {
  return JSON.stringify({
    verdict: "ESCAPE",
    epoch: "e",
    anchored_by: "pharn-build",
    reconciled: 3,
    escapes: [],
    exempted: [],
    merged: [],
    warnings: [],
    ...over,
  });
}

/** The lines OUTSIDE fenced regions — the fence-aware scan render-verify.test.mjs uses. */
function outsideFences(md) {
  let inFence = null;
  const outside = [];
  for (const line of md.split("\n")) {
    const f = line.match(/^(`{3,})/);
    if (f) {
      if (inFence === null) inFence = f[1];
      else if (f[1].length >= inFence.length && /^`+$/.test(line.trim())) inFence = null;
      continue;
    }
    if (inFence === null) outside.push(line);
  }
  return outside;
}

test("ONE COPY (L35): the checker re-exports the core's reason enum — the same frozen object, not a second list", () => {
  assert.equal(checker.ESCAPE_REASONS, ESCAPE_REASONS);
  assert.equal(checker.WIDENED_REASON, WIDENED_REASON);
  assert.deepEqual([...ESCAPE_REASONS], ["plan-widened-after-anchor"]);
});

test("the re-run command is the runner's own reconcile argv, so the line a human copies runs the same check", () => {
  assert.equal(RERUN_COMMAND, reconcileEntry().argv.join(" "));
});

test("reconcileRun: finds the reconcile run of a parsed stamp; null without one or on a malformed stamp", () => {
  const stamp = {
    runs: [
      { seq: 0, id: "test", exit: 0 },
      { seq: 1, id: "reconcile", exit: 1, stdout_sha256: "a".repeat(64) },
    ],
  };
  assert.deepEqual(reconcileRun(stamp), { seq: 1, exit: 1, stdout_sha256: "a".repeat(64) });
  assert.equal(reconcileRun({ runs: [{ seq: 0, id: "test", exit: 0 }] }), null);
  assert.equal(reconcileRun(null), null);
  assert.equal(reconcileRun({ runs: "x" }), null);
  assert.equal(reconcileRun({ runs: [{ seq: "1", id: "reconcile", exit: 1 }] }), null);
});

test("reconcileDetail: escapes with a reason, a hostile file name and a scope label are parsed as given", () => {
  const b = reconcileDetail({
    exit: 1,
    logState: "read",
    text: doc({
      escapes: [
        { file: "src/other.js", denied_by: "writes-scope (snapshot)", reason: WIDENED_REASON, scope_set_by: "pharn/features/f/PLAN.md" },
        { file: HOSTILE, denied_by: "protect-trusted-paths.cjs" },
      ],
      merged: ["a", "b"],
    }),
  });
  assert.equal(b.state, "parsed");
  assert.equal(b.verdict, "ESCAPE");
  assert.equal(b.exit, 1);
  assert.equal(b.escapes_total, 2);
  assert.equal(b.merged_count, 2);
  assert.deepEqual(b.escapes[0], {
    file: "src/other.js",
    denied_by: "writes-scope (snapshot)",
    reason: WIDENED_REASON,
    scope_set_by: "pharn/features/f/PLAN.md",
  });
  assert.deepEqual(b.escapes[1], { file: HOSTILE, denied_by: "protect-trusted-paths.cjs" });
});

test("reconcileDetail: rows are capped at ESCAPE_ROW_CAP and the total is kept", () => {
  const escapes = Array.from({ length: ESCAPE_ROW_CAP + 5 }, (_, i) => ({ file: `f${i}`, denied_by: "g" }));
  const b = reconcileDetail({ exit: 1, logState: "read", text: doc({ escapes }) });
  assert.equal(b.escapes.length, ESCAPE_ROW_CAP);
  assert.equal(b.escapes_total, ESCAPE_ROW_CAP + 5);
  const md = reconcileDetailLines(b).join("\n");
  assert.match(md, new RegExp(`and 5 more escape\\(s\\) not listed`));
  assert.ok(md.includes(RERUN_COMMAND));
});

test("L34 — a garbage log, a wrong shape and each caller-side failure are NAMED states, never an empty list", () => {
  const bad = [
    "not json at all",
    "[]",
    JSON.stringify({ verdict: "MAYBE" }),
    doc({ escapes: "x" }),
    doc({ escapes: [{ file: 1, denied_by: "g" }] }),
    doc({ escapes: [{ file: "a", denied_by: "g", reason: 3 }] }),
    doc({ escapes: [] }), // ESCAPE with no escape: not the checker's document
    doc({ merged: [1] }),
  ];
  for (const text of bad) {
    assert.deepEqual(reconcileDetail({ exit: 1, logState: "read", text }), { state: "not-checker-json", exit: 1 }, text);
  }
  for (const s of ["log-missing", "log-unreadable", "log-digest-mismatch"]) {
    assert.deepEqual(reconcileDetail({ exit: 1, logState: s }), { state: s, exit: 1 });
  }
  assert.equal(reconcileDetail({ exit: 1, logState: "parsed" }).state, "log-unreadable", "a caller cannot claim `parsed` without text");
  assert.equal(reconcileDetail({ exit: 1, logState: "weird" }).state, "log-unreadable");
  for (const s of DETAIL_STATES.filter((x) => x !== "parsed")) {
    const lines = reconcileDetailLines({ state: s, exit: 1 }).filter(Boolean);
    assert.equal(lines.length, 1, `${s} renders exactly one line`);
    assert.ok(lines[0].includes(RERUN_COMMAND), `${s} names the re-run command`);
    assert.match(lines[0], /no row is invented/);
  }
});

test("renderer: the reason is named inline (closed member), each escape is ONE JSON-quoted row inside a fence", () => {
  const b = reconcileDetail({
    exit: 1,
    logState: "read",
    text: doc({
      escapes: [
        { file: "src/other.js", denied_by: "writes-scope (snapshot)", reason: WIDENED_REASON, scope_set_by: "PLAN.md" },
        { file: HOSTILE, denied_by: "protect-trusted-paths.cjs" },
      ],
    }),
  });
  const md = reconcileDetailLines(b).join("\n");
  assert.match(md, /^reconcile: `ESCAPE` \(exit 1\)/m);
  assert.match(md, /\*\*2 escape\(s\)\*\*/);
  assert.match(md, /Closed reasons: `plan-widened-after-anchor` ×1, no closed reason ×1\./);
  assert.ok(md.includes(`"src/other.js"  denied_by="writes-scope (snapshot)"  reason=plan-widened-after-anchor  scope_set_by="PLAN.md"`));
  assert.ok(
    md.includes(`${JSON.stringify(HOSTILE)}  denied_by="protect-trusted-paths.cjs"  reason=-  scope_set_by=-`),
    "the newline stays \\n"
  );
  const outside = outsideFences(md);
  assert.ok(!outside.some((l) => l === "# fake heading"), "the injected heading escaped its fence");
  assert.ok(!outside.some((l) => l.includes("[click](")), "the injected link escaped its fence");
  assert.ok(!outside.some((l) => l.includes("src/x")), "no part of the hostile path is outside a fence");
});

test("renderer: a reason outside the closed set is never inline — fenced with a fixed marker", () => {
  const b = reconcileDetail({ exit: 1, logState: "read", text: doc({ escapes: [{ file: "a", denied_by: "g", reason: "`evil`\n# h" }] }) });
  const md = reconcileDetailLines(b).join("\n");
  assert.match(md, /Closed reasons: none\./);
  assert.ok(md.includes(`reason=(outside the closed set) ${JSON.stringify("`evil`\n# h")}`));
  assert.ok(!outsideFences(md).some((l) => l.includes("evil")));
});

test("renderer: merged only — the count is shown, no escape rows; the checker's INCONCLUSIVE reason is fenced", () => {
  const merged = reconcileDetail({ exit: 0, logState: "read", text: doc({ verdict: "CLEAN", merged: ["a", "b", "c"] }) });
  const md = reconcileDetailLines(merged).join("\n");
  assert.match(md, /^reconcile: `CLEAN` \(exit 0\)/m);
  assert.match(md, /^3 path\(s\) classified `merged`/m);
  assert.doesNotMatch(md, /escape\(s\)\*\*/);
  const inc = reconcileDetail({ exit: 2, logState: "read", text: JSON.stringify({ verdict: "INCONCLUSIVE", reason: "no baseline\n# h" }) });
  const md2 = reconcileDetailLines(inc).join("\n");
  assert.match(md2, /^reconcile: `INCONCLUSIVE` \(exit 2\)/m);
  assert.ok(!outsideFences(md2).some((l) => l === "# h"));
});

test("wantsReconcileSection: a non-zero exit, a merged path, or a failing reconcile gate without a block — and nothing else", () => {
  assert.equal(wantsReconcileSection(null, []), false);
  assert.equal(wantsReconcileSection(null, ["reconcile"]), true);
  assert.equal(
    wantsReconcileSection({ state: "parsed", exit: 0, verdict: "CLEAN", escapes: [], escapes_total: 0, merged_count: 0 }, []),
    false
  );
  assert.equal(
    wantsReconcileSection({ state: "parsed", exit: 0, verdict: "CLEAN", escapes: [], escapes_total: 0, merged_count: 2 }, []),
    true
  );
  assert.equal(wantsReconcileSection({ state: "log-missing", exit: 1 }, []), true);
  assert.equal(wantsReconcileSection({ state: "log-missing", exit: 0 }, []), false);
});

test("an absent block renders the not-recorded line with the re-run command", () => {
  const lines = reconcileDetailLines(undefined).filter(Boolean);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /not recorded in this report/);
  assert.ok(lines[0].includes(RERUN_COMMAND));
  assert.deepEqual([...RECONCILE_VERDICTS], ["CLEAN", "ESCAPE", "NO_BASELINE", "INCONCLUSIVE"]);
});
