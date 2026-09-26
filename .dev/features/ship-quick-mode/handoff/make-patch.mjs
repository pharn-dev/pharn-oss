#!/usr/bin/env node
// .dev/features/ship-quick-mode/handoff/make-patch.mjs — generate the HUMAN-ONLY patch for LIMITS.md §3a and
// §6 (the §6 line since the re-review's N3) and pharn/ARCHITECTURE.md §6 (and §4, conditionally) that this
// increment's build cannot write itself
// (fix #2 — the trusted docs are Write/Edit/MultiEdit/NotebookEdit-denied). Committed under `handoff/` — a
// deliberate deviation from the precedent that deleted its staging sources — so the orchestrator can
// RE-RUN it after a sibling phase merges and the ARCHITECTURE pin moves again (PLAN.md, "Chain sequencing"
// item 3). Node stdlib only: `spawnSync` with ARGV ARRAYS only, never a shell string, `$VAR` or heredoc —
// the forms an isolated worktree refuses (lessons-learned, "worktree isolation vs pinned shell forms").
//
// IT NEVER WRITES A TRUSTED-DOC PATH. It reads LIMITS.md and pharn/ARCHITECTURE.md, computes the edited
// text ENTIRELY IN MEMORY, and writes only: scratch under `.pharn/pharn-dev-build/ship-quick-mode-patch/`
// (removed before exit, success or failure), and `../proposed/human-only.patch` +
// `../proposed/human-only.sha256` beside this script — never `LIMITS.md` or `pharn/ARCHITECTURE.md`
// themselves. The human applies the patch with `proposed/apply.sh` at GATE 2 (see APPLY.md), which is the
// only step that actually writes those two files.
//
// FOUR CHECKS are PURE EXPORTED FUNCTIONS, behind the `import.meta.main` guard below, so the build (and
// BUILD.md's own probes) can call them directly with a deliberately bad input and record the refusal
// (L60 — a check never seen failing proves nothing):
//   1. `applyOnce` — the find/replace-exactly-once rule every edit below goes through.
//   2. `markerPreservationReds` — for every site `.dev/floor/specified-primitives.json` registers against
//      LIMITS.md or pharn/ARCHITECTURE.md, the edited text must contain that exact marker string iff the
//      original did. The in-memory reduction of `check-specified-markers.mjs`'s own predicate.
//   3. `checkFive` — validate.mjs's own predicate, reduced in memory: a text holding both `rule_id:` and
//      `problem:` must also show the enum-gated/floor-verifiable + free-text/untrusted split vocabulary.
//   4. `contractsCompleteness` — the §4 name list (current, or with `stage-exit` inserted) must equal the
//      actual `pharn/pharn-contracts/*.md` stems on disk, so a contract that merged under a different name
//      fails LOUDLY (grill G9) rather than shipping a §4 line that disagrees with what merged.
// A fifth check — NO CR in the edited ARCHITECTURE.md text, what `hash-doc.test.mjs`'s LF-identity test
// reads — is a one-line `.includes("\r")` test, inlined rather than named, since there is nothing to probe
// beyond the literal character.
//
// THE §4 EDIT IS CONDITIONAL on `pharn/pharn-contracts/stage-exit.md` existing AT GENERATION TIME (the
// `stage-regress-script` sibling's own contract) — decided AFTER `contractsCompleteness` passes.
//
// Usage: node .dev/features/ship-quick-mode/handoff/make-patch.mjs   (run from the repo root)
// Exit: 0 — the patch and its sums were written, stdout prints `stage-exit: present|absent` and the new
//           ARCHITECTURE pin (for APPLY.md).
//       1 — a `find` matched zero or >1 times, a preservation/CHECK-5/no-CR assertion failed, the §4
//           completeness assertion failed, or `git apply --check` refused the assembled patch. Nothing is
//           written on the trusted-doc/patch side — the check reads the patch from stdin, before either
//           proposed/ file is written (a GATE-2 review fix: it used to write the patch first) — and a
//           partially written scratch dir is removed either way.

import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, lstatSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";

const REPO = process.cwd(); // run from the repo root, exactly as the build procedure pins it
const LIMITS_PATH = join(REPO, "LIMITS.md");
const ARCH_PATH = join(REPO, "pharn", "ARCHITECTURE.md");
const CONTRACTS_DIR = join(REPO, "pharn", "pharn-contracts");
const MARKERS_JSON = join(REPO, ".dev", "floor", "specified-primitives.json");
const SCRATCH = join(REPO, ".pharn", "pharn-dev-build", "ship-quick-mode-patch");
const PROPOSED = join(REPO, ".dev", "features", "ship-quick-mode", "proposed");

/** Thrown by every check below on a refusal; caught once, at the bottom, so a refusal prints ONE clear
 *  line — never a raw Node stack trace — and always exits 1 having removed any scratch this run created. */
export class FailedGeneration extends Error {}
const fail = (msg) => {
  throw new FailedGeneration(msg);
};

// The same fold check-spec.mjs's bodyHash() and .dev/floor/hash-doc.mjs use — reimplemented inline (2
// lines) rather than imported, so this generator has no import graph beyond node:fs/crypto/child_process.
export const hashDoc = (text) => createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");

/** CHECK 1 — replace `find` in `text` with `replace`, requiring EXACTLY ONE occurrence — else throws
 *  `FailedGeneration`. Used for every edit this generator makes; probed directly with a 2-occurrence input. */
export function applyOnce(text, find, replace, label) {
  const count = text.split(find).length - 1;
  if (count !== 1) fail(`${label}: find string matched ${count} time(s), expected exactly 1 — nothing written`);
  return text.split(find).join(replace);
}

/** CHECK 2 — MARKER PRESERVATION. Returns the list of violation messages (empty = clean) for one file's
 *  before/after pair against `sites` (each `{file, marker}`, as `.dev/floor/specified-primitives.json`
 *  registers them) — pure, no throw, so a probe can inspect the array directly. `main()` fails on the
 *  first one found. */
export function markerPreservationReds({ file, before, after, sites }) {
  const reds = [];
  for (const site of sites) {
    if (site.file !== file) continue;
    const was = before.includes(site.marker);
    const isNow = after.includes(site.marker);
    if (was !== isNow) {
      reds.push(
        `marker preservation: ${file}'s registered marker ${JSON.stringify(site.marker.slice(0, 80))} ` +
          `was ${was ? "present" : "absent"} and is now ${isNow ? "present" : "absent"} — the edit must not move a registered marker`
      );
    }
  }
  return reds;
}

/** CHECK 3 — validate.mjs's own CHECK 5 predicate, reduced in memory. Returns `{ok, reason}`, pure. */
export function checkFive(text) {
  if (!(/rule_id:/.test(text) && /problem:/.test(text))) return { ok: true, reason: null };
  const showsEnumGated = /enum-gated|floor-verifiable/i.test(text);
  const showsFreeText = /free[- ]text|untrusted/i.test(text);
  if (showsEnumGated && showsFreeText) return { ok: true, reason: null };
  return { ok: false, reason: "holds both rule_id: and problem: but not the enum-gated/free-text split vocabulary" };
}

/** CHECK 4 — the §4 completeness assertion (grill G9). `currentNames` is the list PARSED from the live
 *  ARCHITECTURE.md text; `actualStems` is what is really under pharn/pharn-contracts/*.md;
 *  `stageExitPresent` decides whether `stage-exit` belongs in the expected list. Returns
 *  `{ok, missing, extra}` — pure, no throw, so BUILD.md's probe can feed a stem list with one dropped. */
export function contractsCompleteness({ currentNames, actualStems, stageExitPresent }) {
  const expectedNames = [...currentNames];
  if (stageExitPresent) {
    const i = expectedNames.indexOf("spec-template");
    if (i === -1) fail("pharn/ARCHITECTURE.md §4's list has no `spec-template` to insert `stage-exit` before");
    expectedNames.splice(i, 0, "stage-exit");
  }
  const expectedSorted = [...expectedNames].sort();
  const missing = actualStems.filter((s) => !expectedSorted.includes(s));
  const extra = expectedSorted.filter((s) => !actualStems.includes(s));
  return { ok: missing.length === 0 && extra.length === 0, missing, extra };
}

function main() {
  // ── 1. Read the two trusted docs (READ only — never written by this script) ────────────────────────
  let limitsOriginal, archOriginal;
  try {
    limitsOriginal = readFileSync(LIMITS_PATH, "utf8");
    archOriginal = readFileSync(ARCH_PATH, "utf8");
  } catch (e) {
    fail(`cannot read a trusted doc: ${e.message}`);
  }

  // ── 2. LIMITS.md §3a: drop the false clause, add the quick-mode paragraph ──────────────────────────
  const LIMITS_FIND =
    "_breadth_. `quick-mode` exists as a manual flag; there is no automatic proportionality between\n" +
    "breadth and change size. You pay the most for what there is the most of (small changes). This is\n" +
    "the largest practical token problem and it is not yet solved.\n";

  // GATE-2 review fixes (2026-09-26): F1 — "never `gate2`" becomes "is not `gate2`" with the reason and where its
  // marker bounds live; F2 — the flag is read by the orchestrating model (advisory), backed by the SPEC's pinned
  // kind; F3 — `/pharn-regress`'s scope check is KEPT, and the list is an open form ("It leaves out:"), not a count.
  // Re-review N3: the kept scope check points at §6's bounds for it, and §6 (below) names quick mode as a caller.
  const LIMITS_REPLACE =
    "_breadth_. You pay the most for what there is the most of (small changes). This is\n" +
    "the largest practical token problem and it is not yet solved.\n" +
    "\n" +
    "> **The manual flag is `/pharn-ship --quick` (6.25.0), and it trades checks for cost.** A human chooses it for\n" +
    "> a `spec_kind: quick` SPEC: one to three acceptance criteria, each verified at `unit` or `integration`. It\n" +
    "> keeps both human gates, the grill's two floor stops, the test-first evidence for those criteria,\n" +
    "> `/pharn-regress`'s scope check (a changed file outside the plan's `## Files` still stops the run, within\n" +
    "> the bounds §6 states for that check) and `/pharn-verify` with its AC gate. It leaves out: **the regression\n" +
    "> check** — no regression outside the feature is looked for, because nothing compares base and head; **the\n" +
    "> plan interrogation** — `/pharn-grill --quick` runs its floor stops and no griller; and **`BRIEFING.md` and\n" +
    "> `RUN-REPORT.md`** (`cost.json` is still written). Its ledger outcome is `gate2-quick`, which is not\n" +
    "> `gate2`: `gate2` needs a `pharn-regress` stage-start, which a quick run never writes (the bounds of\n" +
    "> trusting those Bash-written markers are in `pharn-contracts/cost-ledger.md`). The `--quick` flag is read by\n" +
    "> the orchestrating model, so honoring it is advisory; what backs it is the SPEC's approved, pinned\n" +
    "> `spec_kind: quick`. Nothing measures whether a change is small: the kind and the flag are what a person\n" +
    "> chose, and a quick SPEC run without the flag takes the full pipeline. There is still no AUTOMATIC\n" +
    "> proportionality, and `/pharn-review`'s lens fan-out is unchanged.\n";

  let limitsEdited = applyOnce(limitsOriginal, LIMITS_FIND, LIMITS_REPLACE, "LIMITS.md §3a");

  // ── 2b. LIMITS.md §6 (re-review N3): the scope check's first bound, "it fires only if `/pharn-regress` runs",
  // went stale when quick mode began running the same partition itself (`## Quick mode` item 7). It understated
  // the check — the safe direction — and no gate reads it, but a trusted doc must not say what is false.
  const LIMITS_S6_FIND = "  `/pharn-regress` runs; it compares _changed since base_, not _written by the build_; it carries\n";
  const LIMITS_S6_REPLACE =
    "  `/pharn-regress` runs — or, since 6.25.0, `/pharn-ship --quick`'s item 7, which runs the same partition\n" +
    "  without the rest of that stage; it compares _changed since base_, not _written by the build_; it carries\n";
  limitsEdited = applyOnce(limitsEdited, LIMITS_S6_FIND, LIMITS_S6_REPLACE, "LIMITS.md §6");

  // ── 3. pharn/ARCHITECTURE.md §6: one paragraph after the `test` paragraph ──────────────────────────
  const ARCH_S6_FIND =
    "every build. Shape and bounds: `pharn-contracts/ac-tests.md` (cited, not restated — P4; `LIMITS.md §9`).\n" + "\n" + "**Keystone:**";

  const ARCH_S6_REPLACE =
    "every build. Shape and bounds: `pharn-contracts/ac-tests.md` (cited, not restated — P4; `LIMITS.md §9`).\n" +
    "\n" +
    "**Quick mode** (`/pharn-ship --quick`, 6.25.0) runs a shorter spine for a small change: a `spec_kind: quick`\n" +
    "SPEC (one to three criteria, each `unit` or `integration`), `plan`, the grill's floor stops without its\n" +
    "interrogation, `test`, `build`, `regress`'s scope check alone, and `verify` as above — **no `regress` base\n" +
    "comparison**, so nothing looks for a regression outside the feature. Both human gates stay, and the ledger\n" +
    "outcome is `gate2-quick`, which is not `gate2`. Bounds: `LIMITS.md §3a`; shape:\n" +
    "`pharn-contracts/spec-template.md`, `pharn-contracts/cost-ledger.md`.\n" +
    "\n" +
    "**Keystone:**";

  let archEdited = applyOnce(archOriginal, ARCH_S6_FIND, ARCH_S6_REPLACE, "pharn/ARCHITECTURE.md §6");

  // ── 4. pharn/ARCHITECTURE.md §4: conditional on stage-exit.md, gated by contractsCompleteness ──────
  const stageExitPresent = existsSync(join(CONTRACTS_DIR, "stage-exit.md"));

  // Parse the CURRENT §4 name list from the live text (never hand-copied), so a re-run after a sibling
  // merge re-derives it rather than trusting a snapshot taken today.
  const S4_LIST_START = "schemas only, ZERO behavior:";
  const S4_LIST_END = "\n                             (+ templates/spec-template.md,";
  const s4Start = archOriginal.indexOf(S4_LIST_START);
  const s4End = archOriginal.indexOf(S4_LIST_END);
  if (s4Start === -1 || s4End === -1 || s4End <= s4Start) {
    fail("could not locate pharn/ARCHITECTURE.md §4's pharn-contracts name list — the anchors moved");
  }
  const currentNames = archOriginal
    .slice(s4Start + S4_LIST_START.length, s4End)
    .split(",")
    .map((s) => s.trim().replace(/\s*\(incl\.[^)]*\)\s*$/, ""))
    .filter(Boolean);

  // The ACTUAL contract stems on disk (top-level pharn/pharn-contracts/*.md only — never templates/).
  const actualStems = readdirSync(CONTRACTS_DIR)
    .filter((f) => f.endsWith(".md") && lstatSync(join(CONTRACTS_DIR, f)).isFile())
    .map((f) => f.slice(0, -3))
    .sort();

  const completeness = contractsCompleteness({ currentNames, actualStems, stageExitPresent });
  if (!completeness.ok) {
    fail(
      "pharn/ARCHITECTURE.md §4's list disagrees with pharn/pharn-contracts/*.md on disk — " +
        `missing from §4: [${completeness.missing.join(", ")}]; listed but absent on disk: [${completeness.extra.join(", ")}]. ` +
        "Fix this generator's §4 parsing/expectation (or the contract's own name) before regenerating."
    );
  }

  if (stageExitPresent) {
    archEdited = applyOnce(
      archEdited,
      "gate-run-record, test-results-record, ac-tests, spec-template",
      "gate-run-record, test-results-record, ac-tests, stage-exit, spec-template",
      "pharn/ARCHITECTURE.md §4"
    );
  }

  // ── 5. THE REMAINING IN-MEMORY ASSERTIONS (grill G1) — before anything is written ──────────────────

  // (a) MARKER PRESERVATION.
  const manifest = JSON.parse(readFileSync(MARKERS_JSON, "utf8"));
  const sites = [];
  for (const p of manifest.specified_primitives ?? []) for (const s of p.sites ?? []) sites.push(s);
  for (const a of manifest.named_artifacts ?? []) sites.push({ file: a.cited_in, marker: a.citation });
  for (const c of manifest.forward_claims ?? []) for (const s of c.sites ?? []) sites.push(s);

  const pairs = [
    { file: "LIMITS.md", before: limitsOriginal, after: limitsEdited },
    { file: "pharn/ARCHITECTURE.md", before: archOriginal, after: archEdited },
  ];
  for (const p of pairs) {
    const reds = markerPreservationReds({ ...p, sites });
    if (reds.length) fail(reds[0]);
  }

  // (b) CHECK 5, on each edited text.
  for (const [text, label] of [
    [limitsEdited, "LIMITS.md"],
    [archEdited, "pharn/ARCHITECTURE.md"],
  ]) {
    const r = checkFive(text);
    if (!r.ok) fail(`CHECK 5: ${label}'s edited text ${r.reason}`);
  }

  // (c) NO CR in the edited ARCHITECTURE.md — what hash-doc.test.mjs's LF-identity test reads.
  if (archEdited.includes("\r")) {
    fail("pharn/ARCHITECTURE.md's edited text contains a CR — hash-doc.test.mjs's LF-identity test would fail");
  }

  // ── 6. Write the before/after texts to scratch, diff them, rewrite headers, assemble the patch ────
  rmSync(SCRATCH, { recursive: true, force: true });
  mkdirSync(SCRATCH, { recursive: true });
  mkdirSync(PROPOSED, { recursive: true });

  // Scratch names are never a trusted-doc path — a bare label, distinct from the real path, that git
  // diff's own "a/"/"b/" prefixing turns into "a/<label>.before" / "b/<label>.after".
  const files = [
    { label: "limits", realPath: "LIMITS.md", before: limitsOriginal, after: limitsEdited },
    { label: "architecture", realPath: "pharn/ARCHITECTURE.md", before: archOriginal, after: archEdited },
  ];

  const diffSections = [];
  for (const f of files) {
    const beforeName = `${f.label}.before`;
    const afterName = `${f.label}.after`;
    writeFileSync(join(SCRATCH, beforeName), f.before);
    writeFileSync(join(SCRATCH, afterName), f.after);

    const r = spawnSync("git", ["diff", "--no-index", "--", beforeName, afterName], { cwd: SCRATCH, encoding: "utf8" });
    // git diff --no-index: exit 1 means "differs" — the SUCCESS case here. Exit 0 means identical (a bug
    // in this generator: the find/replace produced no change). Anything else is a real error.
    if (r.status === 0) fail(`${f.realPath}: the edited text is byte-identical to the original — nothing to patch`);
    if (r.status !== 1) fail(`${f.realPath}: git diff --no-index exited ${r.status} unexpectedly: ${r.stderr}`);

    // Rewrite the scratch-relative headers (git's OWN "a/"/"b/" prefix on the bare labels) to the REAL
    // repo paths git apply must resolve — never a double prefix, since the labels carry no "a/"/"b/" of
    // their own.
    const rewritten = r.stdout.split(`a/${beforeName}`).join(`a/${f.realPath}`).split(`b/${afterName}`).join(`b/${f.realPath}`);
    diffSections.push(rewritten);
  }

  const patchText = diffSections.join("");

  // ── 7. git apply --check against the REAL working tree, on STDIN (writes nothing) ─────────────────
  // The check runs BEFORE either proposed/ file is written (GATE-2 review): a refused patch leaves the previous
  // patch and sums pair untouched, so the header's "nothing is written on the patch side" holds, and a fresh
  // patch can never sit beside a stale sums file. `git apply` reads a patch from stdin when given `-`.
  const check = spawnSync("git", ["apply", "--check", "-"], { cwd: REPO, input: patchText, encoding: "utf8" });
  if (check.status !== 0) fail(`git apply --check refused the assembled patch: ${check.stderr || check.stdout}`);

  // ── 8. Write the patch, then proposed/human-only.sha256 (shasum -c format) from the IN-MEMORY texts ─
  writeFileSync(join(PROPOSED, "human-only.patch"), patchText);
  const sha256Lines = files.map((f) => `${hashDoc(f.after)}  ${f.realPath}\n`).join("");
  writeFileSync(join(PROPOSED, "human-only.sha256"), sha256Lines);

  // ── 9. Print what APPLY.md and the build's BUILD.md need ──────────────────────────────────────────
  console.log(`stage-exit: ${stageExitPresent ? "present" : "absent"}`);
  console.log(`new ARCHITECTURE pin: ${hashDoc(archEdited)}`);
}

// Run as CLI only when invoked directly — `import.meta.main`, never a `file://` + argv[1] compare (which
// silently no-ops on spaced/non-ASCII/symlinked paths). This is what lets BUILD.md's probes `import` the
// four checks above without triggering a real generation run.
if (import.meta.main) {
  try {
    main();
  } catch (e) {
    if (!(e instanceof FailedGeneration)) throw e; // an unexpected bug — surface the real stack
    console.error(`make-patch: ${e.message}`);
    process.exitCode = 1;
  } finally {
    // Always remove scratch, success or failure — it is never the artifact.
    rmSync(SCRATCH, { recursive: true, force: true });
  }
}
