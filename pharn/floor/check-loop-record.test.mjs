// pharn/floor/check-loop-record.test.mjs — black-box tests for the deterministic loop-record shape check.
//
// Run as a subprocess (mirrors check-plan-lessons.test.mjs / check-loop.test.mjs) so the checker keeps its
// dependency-free, top-level-exec contract: we assert only on its public surface (exit code + RED/GREEN
// stdout). Records are written to a fresh temp dir per run — nothing touches the real pharn/features/ tree.
//
// The marked test groups pin the things that would otherwise be silent forks:
//   ✧ AGREEMENT — the canonical template is extracted from pharn/pharn-contracts/loop-record.md and must
//     pass the checker, so THE CONTRACT AND THE CHECKER cannot drift apart (P4); without it, an edit to
//     either side is invisible. Scoped honestly (P0): the binding is TWO-way. Nothing here reads
//     .claude/commands/pharn-loop.md, so the command's agreement rests on its CITING the contract rather
//     than restating the shape — discipline, not a floor guarantee.
//   ★ COLLISION — a LINE-INITIAL `### <name>` in a Handoff body IS that heading; markdown has no notion
//     of "intended as prose". So exact list equality does NOT buy forgery-proofing (nothing can) — it
//     buys UNAMBIGUITY: the collision necessarily yields an extra/duplicate/reordered heading, which a
//     set-membership or first-wins check would have passed. The inline back-ticked form is prose and
//     stays GREEN; both boundaries are pinned below (P2).
//   ✦ L14 — the control-char guard composes BEFORE each anchored shape regex, never replaces it. See the
//     split note above those tests: the char-code SCAN is redundant today, the LENGTH BOUND is not — it
//     is the sole rejecter of an over-long `iterations`, and has its own test.
//   ✦ L6 — the envelope is read ONLY from `---`-fenced frontmatter; a `decision:` line in prose or inside
//     a fenced block is DATA ABOUT the record, never a declaration of it.
//   ✦ L15 — prototype-named keys are inert. Honestly scoped: the envelope-Map half is UNREACHABLE (only
//     four literal key names are ever looked up), so that test pins an outcome, not the Map; the
//     REACHABLE surface is the enum lookup, which has its own test.
//   ⌇ MARKDOWN FIDELITY — the structure scan must agree with a real CommonMark parser on fence pairing
//     and on the 0-3 leading spaces an ATX heading may carry. Both were live fail-OPEN defects.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const CHECKER = join(here, "check-loop-record.mjs");
const CONTRACT = join(here, "..", "pharn-contracts", "loop-record.md");

const SHA = "59def15eade582f2df662ab2129d107667267790";

// A valid Handoff: the three subsections, in order, each with a non-blank body.
const HANDOFF = [
  "## Handoff",
  "",
  "### investigated",
  "",
  "ruled out the sidecar approach.",
  "",
  "### learned",
  "",
  "the setter resolves one --target.",
  "",
  "### next_steps",
  "",
  "wire the reads: entry.",
  "",
].join("\n");

// Build a record. `fm` overrides envelope fields; `handoff` replaces the whole Handoff block.
function record({ fm = {}, handoff = HANDOFF, body = "" } = {}) {
  const fields = { decision: "STOP_GREEN", iterations: "2", commit: SHA, date: "2026-08-06", ...fm };
  const lines = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${v}`);
  return `---\n${lines.join("\n")}\n---\n\n# LOOP — a feature\n\n- the stages that ran\n${body}\n${handoff}`;
}

// `raw` writes the file verbatim (bypassing the record() builder); passing text === null with no `raw`
// omits the file entirely, so the checker is handed a path that does not exist.
function run(text, { args, raw } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-loop-record-"));
  try {
    const p = join(dir, "LOOP.md");
    const content = raw ?? text;
    if (content !== null && content !== undefined) writeFileSync(p, content);
    const r = spawnSync(process.execPath, args ?? [CHECKER, p], { encoding: "utf8" });
    return { status: r.status, out: (r.stdout || "") + (r.stderr || "") };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

// ── ✧ AGREEMENT: the contract's canonical template must pass the checker ─────────────────────────────

test("✧ the canonical template in loop-record.md passes the checker (contract <-> checker cannot drift)", () => {
  const contract = readFileSync(CONTRACT, "utf8");
  const region = contract.match(/LOOP-RECORD-TEMPLATE:BEGIN[\s\S]*?LOOP-RECORD-TEMPLATE:END/);
  assert.ok(region, "the LOOP-RECORD-TEMPLATE markers must exist in pharn/pharn-contracts/loop-record.md");
  const fenced = region[0].match(/```text\r?\n([\s\S]*?)```/);
  assert.ok(fenced, "the marked region must contain one ```text fenced template");
  const r = run(null, { raw: fenced[1] });
  assert.equal(r.status, 0, `the contract's own template must be GREEN, got: ${r.out}`);
  assert.match(r.out, /^GREEN — /m);
});

// ── The happy paths: every stop decision, and the honest-absence commit ───────────────────────────────

for (const decision of ["STOP_GREEN", "STOP_CAP", "STOP_TERMINAL", "INCONCLUSIVE"]) {
  test(`a well-formed record with decision ${decision} → GREEN`, () => {
    const r = run(record({ fm: { decision } }));
    assert.equal(r.status, 0, r.out);
    assert.match(r.out, new RegExp(`decision ${decision}`));
  });
}

test("commit `unknown` (git rev-parse HEAD failed) → GREEN — an honest absence, not a fabricated SHA", () => {
  const r = run(record({ fm: { commit: "unknown" } }));
  assert.equal(r.status, 0, r.out);
});

test("a 7-char short SHA → GREEN", () => {
  assert.equal(run(record({ fm: { commit: "59def15" } })).status, 0);
});

test("GREEN output states the honest scope (P0) — never 'continuity achieved'", () => {
  const r = run(record());
  assert.match(r.out, /ADVISORY/);
  assert.match(r.out, /NEVER means "continuity was achieved"/);
});

test("extra frontmatter keys and extra body sections are IGNORED, not RED", () => {
  const r = run(record({ fm: { spec_id: "abc", note: "anything" }, body: "\n## Pointers\n\n- see VERIFY.md\n" }));
  assert.equal(r.status, 0, r.out);
});

// ── decision: exact enum membership; CONTINUE is deliberately excluded ────────────────────────────────

test("decision CONTINUE → RED (a record is written only at a STOP)", () => {
  const r = run(record({ fm: { decision: "CONTINUE" } }));
  assert.equal(r.status, 1);
  assert.match(r.out, /CONTINUE is deliberately EXCLUDED/);
});

test("decision lowercase → RED (membership is case-sensitive)", () => {
  assert.equal(run(record({ fm: { decision: "stop_green" } })).status, 1);
});

test("decision outside the enum → RED", () => {
  assert.equal(run(record({ fm: { decision: "STOP_MAYBE" } })).status, 1);
});

test("decision absent → RED, naming the field as MANDATORY", () => {
  const r = run(record({ fm: { decision: undefined } }));
  assert.equal(r.status, 1);
  assert.match(r.out, /declares no `decision`/);
  assert.match(r.out, /MANDATORY/);
});

// ── iterations: a positive integer ────────────────────────────────────────────────────────────────────

for (const bad of ["0", "-1", "2.5", "two", "", " "]) {
  test(`iterations ${JSON.stringify(bad)} → RED`, () => {
    const r = run(record({ fm: { iterations: bad } }));
    assert.equal(r.status, 1);
    assert.match(r.out, /positive integer/);
  });
}

test("iterations absent → RED", () => {
  assert.equal(run(record({ fm: { iterations: undefined } })).status, 1);
});

test("iterations 1 → GREEN (the lower bound is inclusive)", () => {
  assert.equal(run(record({ fm: { iterations: "1" } })).status, 0);
});

// ── commit / date: anchored shape, plus ✦ L14 (the control-char guard composed before the shape regex)
//
// Stated HONESTLY (P0), and split, because a blanket "the guard is redundant" would be FALSE:
//   - the CHAR-CODE SCAN is redundant today for all four fields — values are trimmed and parsed
//     line-by-line, so L14's trailing-newline vector cannot reach one, and each anchored regex has a
//     character class narrow enough to reject an interior control char on its own. The two ✦ tests just
//     below therefore pin the OUTCOME (such a value is refused), not the mechanism that caught it.
//   - the LENGTH BOUND is NOT redundant for `iterations`: ITER_RE (`^\d+$`) is the only unbounded value
//     grammar in the file, so cleanScalar's 16-char cap is the SOLE rejecter of an over-long numeric
//     value, and it is pinned by its own test below. Deleting it would widen the field silently.
// The composition is kept per L14 so a future parser change cannot reopen the closed half either.

for (const bad of ["ABC1234", "abc123", "ggggggg", "", "59def15!"]) {
  test(`commit ${JSON.stringify(bad)} → RED`, () => {
    const r = run(record({ fm: { commit: bad } }));
    assert.equal(r.status, 1);
    assert.match(r.out, /`commit`/);
  });
}

for (const bad of ["2026-8-6", "06-08-2026", "2026/08/06", "today", ""]) {
  test(`date ${JSON.stringify(bad)} → RED`, () => {
    assert.equal(run(record({ fm: { date: bad } })).status, 1);
  });
}

test("✦ L14: a commit carrying an interior control character is REJECTED", () => {
  // An interior tab survives the trim, so it reaches the value; both the guard and COMMIT_RE refuse it.
  const r = run(record({ fm: { commit: `${SHA}\tx` } }));
  assert.equal(r.status, 1);
});

test("✦ L14: a date carrying a control character is REJECTED", () => {
  assert.equal(run(record({ fm: { date: `2026-08${String.fromCharCode(7)}06` } })).status, 1);
});

test("✦ L15: frontmatter keys named after prototype members are inert (the OUTCOME, not the Map)", () => {
  // Stated HONESTLY (P0), because the obvious claim is false: this does NOT prove the envelope must be a
  // Map. `gate()` looks up only the four LITERAL key names, none an Object.prototype member, so the
  // plain-object leak is UNREACHABLE on this path — a faithful plain-object port of `envelope()` passes
  // this whole suite. The Map is kept as L14-style composition (do not re-derive, per call site, whether
  // today's code happens to make the hole reachable). What this pins is the outcome; the REACHABLE L15
  // surface is the enum lookup, pinned by the next test.
  // Written RAW: `__proto__:` in an object literal sets the PROTOTYPE rather than an own property, so the
  // record() builder would never emit that line at all and the test would silently prove nothing.
  const raw = `---\ndecision: STOP_GREEN\niterations: 2\ncommit: ${SHA}\ndate: 2026-08-06\ntoString: STOP_TERMINAL\n__proto__: 99\nhasOwnProperty: x\n---\n\n# LOOP — a feature\n\n${HANDOFF}`;
  const r = run(null, { raw });
  assert.equal(r.status, 0, r.out); // the four real fields are read; the prototype-named keys are inert
  assert.match(r.out, /decision STOP_GREEN/); // NOT STOP_TERMINAL — no inherited member displaced it
});

test("✦ L15 (the REACHABLE surface): `decision: toString` → RED, never a prototype-member hit", () => {
  // This is where an arbitrary record-supplied string is actually indexed against a container. A plain
  // object with a `key in obj` presence test would ACCEPT `toString` here; DECISION_ENUM.has() does not.
  const r = run(record({ fm: { decision: "toString" } }));
  assert.equal(r.status, 1);
  assert.match(r.out, /expected one of/);
});

test("✦ L14 (the LOAD-BEARING half): an over-long `iterations` is rejected by the LENGTH bound alone", () => {
  // ITER_RE is the file's only unbounded value grammar, so for this field cleanScalar's 16-char cap is
  // the sole rejecter — it is NOT redundant with the shape regex, unlike the other three fields.
  const r = run(record({ fm: { iterations: "99999999999999999" } }));
  assert.equal(r.status, 1);
  assert.match(r.out, /positive integer/);
});

// ── ★ FORGERY: untrusted body text must not be able to satisfy the structural assertion ───────────────

test("★ a body that OUTLINES the sections (line-initial `### next_steps`) duplicates a heading → RED", () => {
  // What exact-equality actually buys, stated precisely: a line-initial `### next_steps` inside a body IS
  // the next_steps heading — markdown has no notion of "intended as prose", and no checker can invent one.
  // So this is NOT forgery-proofing. It is UNAMBIGUITY: the collision necessarily produces an EXTRA,
  // DUPLICATE, or REORDERED heading, and exact list equality refuses that, where a set-membership or
  // first-wins check would have passed a record whose section boundaries are not where they read.
  const outlined = [
    "## Handoff",
    "",
    "### investigated",
    "",
    "the record shape.",
    "",
    "### learned",
    "",
    "the sections are:",
    "",
    "### next_steps",
    "",
    "…and this text is now IN it.",
    "",
    "### next_steps",
    "",
    "write it.",
    "",
  ].join("\n");
  const r = run(record({ handoff: outlined }));
  assert.equal(r.status, 1);
  assert.match(r.out, /EXACTLY \[investigated, learned, next_steps\]/);
});

test("★ the same name INLINE in a body (back-ticked, not line-initial) is prose → GREEN", () => {
  const inline = [
    "## Handoff",
    "",
    "### investigated",
    "",
    "the record needs a `### next_steps` heading.",
    "",
    "### learned",
    "",
    "only a line-initial form is structural.",
    "",
    "### next_steps",
    "",
    "write it.",
    "",
  ].join("\n");
  assert.equal(run(record({ handoff: inline })).status, 0);
});

test("★ a duplicated `### learned` → RED", () => {
  const dup = [
    "## Handoff",
    "",
    "### investigated",
    "",
    "a.",
    "",
    "### learned",
    "",
    "b.",
    "",
    "### learned",
    "",
    "c.",
    "",
    "### next_steps",
    "",
    "d.",
    "",
  ].join("\n");
  assert.equal(run(record({ handoff: dup })).status, 1);
});

test("★ the three subsections out of order → RED", () => {
  const swapped = ["## Handoff", "", "### learned", "", "a.", "", "### investigated", "", "b.", "", "### next_steps", "", "c.", ""].join(
    "\n"
  );
  const r = run(record({ handoff: swapped }));
  assert.equal(r.status, 1);
  assert.match(r.out, /in that order/);
});

test("★ an extra `### notes` subsection → RED (the three are the ONLY level-3 headings)", () => {
  assert.equal(run(record({ handoff: `${HANDOFF}\n### notes\n\nextra.\n` })).status, 1);
});

test("★ but the SAME forged line inside a fenced block is DATA, not a heading → GREEN (L6)", () => {
  const fencedQuote = [
    "## Handoff",
    "",
    "### investigated",
    "",
    "the shape is:",
    "",
    "```text",
    "### next_steps",
    "```",
    "",
    "### learned",
    "",
    "quoting a heading must be fenced.",
    "",
    "### next_steps",
    "",
    "done.",
    "",
  ].join("\n");
  const r = run(record({ handoff: fencedQuote }));
  assert.equal(r.status, 0, r.out);
});

// ── Handoff presence + non-blank bodies ───────────────────────────────────────────────────────────────

test("no `## Handoff` section → RED, naming it mandatory on every stop path", () => {
  const r = run(record({ handoff: "" }));
  assert.equal(r.status, 1);
  assert.match(r.out, /no `## Handoff` section/);
  assert.match(r.out, /including INCONCLUSIVE/);
});

test("two `## Handoff` sections → RED", () => {
  const r = run(record({ handoff: `${HANDOFF}\n${HANDOFF}` }));
  assert.equal(r.status, 1);
  assert.match(r.out, /2 `## Handoff` sections/);
});

for (const missing of ["investigated", "learned", "next_steps"]) {
  test(`a Handoff missing \`### ${missing}\` → RED`, () => {
    const kept = ["## Handoff", ""];
    for (const s of ["investigated", "learned", "next_steps"]) {
      if (s !== missing) kept.push(`### ${s}`, "", "content.", "");
    }
    assert.equal(run(record({ handoff: kept.join("\n") })).status, 1);
  });
}

for (const empty of ["investigated", "learned", "next_steps"]) {
  test(`\`### ${empty}\` present but with an EMPTY body → RED`, () => {
    const lines = ["## Handoff", ""];
    for (const s of ["investigated", "learned", "next_steps"]) {
      lines.push(`### ${s}`, "");
      if (s !== empty) lines.push("content.", "");
    }
    const r = run(record({ handoff: lines.join("\n") }));
    assert.equal(r.status, 1);
    assert.match(r.out, new RegExp(`\\[${empty}\\]`));
    assert.match(r.out, /advisory and unreachable/); // the honest scope travels with the refusal
  });
}

test("a subsection whose only body is a fenced code block counts as non-empty → GREEN", () => {
  const fencedBody = [
    "## Handoff",
    "",
    "### investigated",
    "",
    "```text",
    "a fenced note",
    "```",
    "",
    "### learned",
    "",
    "b.",
    "",
    "### next_steps",
    "",
    "c.",
    "",
  ].join("\n");
  assert.equal(run(record({ handoff: fencedBody })).status, 0);
});

test("a `## Pointers` heading after the Handoff ends the section; its `###` headings are not counted", () => {
  const r = run(record({ handoff: `${HANDOFF}\n## Pointers\n\n### VERIFY\n\nsee it.\n` }));
  assert.equal(r.status, 0, r.out);
});

// ── ✦ L6: the envelope is read ONLY from the structured location ──────────────────────────────────────

test("✦ L6: a record with NO frontmatter → RED, even when the body carries `decision:` in prose", () => {
  const r = run(null, { raw: `# LOOP — a feature\n\ndecision: STOP_GREEN\niterations: 2\ncommit: ${SHA}\ndate: 2026-08-06\n\n${HANDOFF}` });
  assert.equal(r.status, 1);
  assert.match(r.out, /no `---`-fenced YAML frontmatter/);
});

test("✦ L6: a fenced `decision:` in the BODY never displaces the real frontmatter value", () => {
  // The fixture must carry VALID frontmatter that CONFLICTS with the fenced body value — otherwise the
  // record is refused by the no-frontmatter gate before the body is ever reached, and the test measures
  // nothing. Here the frontmatter says STOP_CAP and a fenced body block says STOP_GREEN: GREEN, and the
  // reported value must be the frontmatter's. This fails under a whole-file-scan mutant; the earlier
  // no-frontmatter form did not.
  const raw = `---\ndecision: STOP_CAP\niterations: 2\ncommit: ${SHA}\ndate: 2026-08-06\n---\n\n# LOOP — a feature\n\n\`\`\`text\ndecision: STOP_GREEN\n\`\`\`\n\n${HANDOFF}`;
  const r = run(null, { raw });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /decision STOP_CAP/);
});

// ── ⌇ MARKDOWN FIDELITY: fence pairing (CommonMark 4.5) and indented ATX headings ─────────────────────
//
// Both of these were live fail-OPEN defects found by running the checker against micromark and
// markdown-it as oracles. A blind fence toggle and column-0-anchored heading regexes let the checker
// report a Handoff structure that is NOT the one a Markdown reader sees.

test("⌇ a `~~~` block whose body contains a lone ``` line stays OPEN → GREEN", () => {
  // The realistic case: Step 4 asks the roll-up to quote standing reds as DATA, and such a quote may
  // itself contain a ``` line. A blind toggle treated that as a close, desynchronized, and produced the
  // factually false "loop-record has no `## Handoff` section" on a record that plainly has one.
  const body = ["", "~~~text", "failing_gates:", "```", "~~~", ""].join("\n");
  const r = run(record({ body }));
  assert.equal(r.status, 0, r.out);
});

test("⌇ a `~~~` block 'closed' by ``` is NOT closed — its headings stay content → RED", () => {
  // The fail-OPEN direction: the checker used to report all three subsections present for a record whose
  // rendered Handoff contains only `### investigated`, the other two being code-block content.
  const handoff = [
    "## Handoff",
    "",
    "### investigated",
    "",
    "~~~text",
    "not a close:",
    "```",
    "",
    "### learned",
    "",
    "a.",
    "",
    "### next_steps",
    "",
    "b.",
    "",
  ].join("\n");
  const r = run(record({ handoff }));
  assert.equal(r.status, 1);
  assert.match(r.out, /EXACTLY \[investigated, learned, next_steps\]/);
});

test("⌇ a four-backtick fence may nest a ```-fenced quote of the record's own outline → GREEN", () => {
  // The escape hatch the checker's own RED message prescribes REQUIRES a nested fence, and the standard
  // four-backtick idiom broke the blind toggle — so the prescribed remedy used to fail.
  const handoff = [
    "## Handoff",
    "",
    "### investigated",
    "",
    "the record's outline is:",
    "",
    "````text",
    "```text",
    "### next_steps",
    "```",
    "````",
    "",
    "### learned",
    "",
    "a.",
    "",
    "### next_steps",
    "",
    "b.",
    "",
  ].join("\n");
  const r = run(record({ handoff }));
  assert.equal(r.status, 0, r.out);
});

test("⌇ an indented `### smuggled` inside the Handoff IS a heading → RED (was a silent GREEN)", () => {
  // CommonMark allows 0-3 leading spaces on an ATX heading. Anchoring at column 0 while FENCE_RE
  // tolerated indentation meant a 3-space-indented heading was invisible, and the checker returned GREEN
  // while asserting the three were the ONLY level-3 headings there.
  const handoff = [
    "## Handoff",
    "",
    "### investigated",
    "",
    "a.",
    "",
    "   ### smuggled",
    "",
    "b.",
    "",
    "### learned",
    "",
    "c.",
    "",
    "### next_steps",
    "",
    "d.",
    "",
  ].join("\n");
  const r = run(record({ handoff }));
  assert.equal(r.status, 1);
  assert.match(r.out, /smuggled/);
});

test("⌇ an indented `  ## Pointers` still terminates the Handoff → GREEN", () => {
  // The same asymmetry produced false REDs: an indented h2 is a real terminator, so the section must end
  // there and the following `### VERIFY` must not be collected.
  const r = run(record({ handoff: `${HANDOFF}\n  ## Pointers\n\n### VERIFY\n\nsee it.\n` }));
  assert.equal(r.status, 0, r.out);
});

test("⌇ a 4-space-indented `### x` is an indented code block, NOT a heading → GREEN", () => {
  // `{0,3}` rather than `\s*` is the point: at 4+ spaces the line stops being structural.
  const handoff = [
    "## Handoff",
    "",
    "### investigated",
    "",
    "a code sample:",
    "",
    "    ### not a heading",
    "",
    "### learned",
    "",
    "b.",
    "",
    "### next_steps",
    "",
    "c.",
    "",
  ].join("\n");
  assert.equal(run(record({ handoff })).status, 0);
});

// ── Branches that were documented but unpinned (each verified by a mutant the suite missed) ───────────

test("double-quoted envelope scalars are accepted, and the UNQUOTED value is what is read", () => {
  // Quote-stripping is load-bearing and was documented only in a code comment: /pharn-loop's frontmatter
  // is model-written, so quoted YAML scalars are a realistic emission, and the contract's canonical
  // template uses only unquoted values — so the ✧ agreement test never reaches this path.
  const raw = `---\ndecision: "STOP_GREEN"\niterations: "2"\ncommit: "${SHA}"\ndate: "2026-08-06"\n---\n\n# LOOP — a feature\n\n${HANDOFF}`;
  const r = run(null, { raw });
  assert.equal(r.status, 0, r.out);
  assert.match(r.out, /decision STOP_GREEN/);
});

test("a line-initial `#### deeper note` in a subsection body is content, not a fourth subsection", () => {
  const handoff = [
    "## Handoff",
    "",
    "### investigated",
    "",
    "#### deeper note",
    "",
    "a.",
    "",
    "### learned",
    "",
    "b.",
    "",
    "### next_steps",
    "",
    "c.",
    "",
  ].join("\n");
  assert.equal(run(record({ handoff })).status, 0);
});

test("a `## Handoff notes` section does NOT count as the Handoff → RED", () => {
  // HANDOFF_RE's trailing anchor is what keeps a prefix match from hijacking the section.
  const handoff = [
    "## Handoff notes",
    "",
    "### investigated",
    "",
    "a.",
    "",
    "### learned",
    "",
    "b.",
    "",
    "### next_steps",
    "",
    "c.",
    "",
  ].join("\n");
  const r = run(record({ handoff }));
  assert.equal(r.status, 1);
  assert.match(r.out, /no `## Handoff` section/);
});

// ── Fail-closed I/O and argv ──────────────────────────────────────────────────────────────────────────

test("a missing record file → RED (never a silent pass)", () => {
  const r = run(null);
  assert.equal(r.status, 1);
  assert.match(r.out, /unreadable/);
});

test("no argv → RED with the usage line", () => {
  const r = run(record(), { args: [CHECKER] });
  assert.equal(r.status, 1);
  assert.match(r.out, /usage: node pharn\/floor\/check-loop-record\.mjs <LOOP\.md>/);
});

test("extra argv → RED (a malformed invocation is bad input, fail-closed)", () => {
  const r = run(record(), { args: [CHECKER, "a.md", "b.md"] });
  assert.equal(r.status, 1);
  assert.match(r.out, /usage:/);
});
