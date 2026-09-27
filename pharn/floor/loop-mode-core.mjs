// pharn/floor/loop-mode-core.mjs — the ONE reading of a `/pharn-loop` run's MODE (6.28.0, loop-quick-mode).
//
// A module, not a CLI: it prints nothing and exits nothing. Floor infrastructure, NOT a Capability (no `role:`).
//
// ── THE RULE ─────────────────────────────────────────────────────────────────────────────────────────────
// A loop run's mode is its feature SPEC's pinned kind, never a flag and never a marker: `loopModeOf(featureDir)` reads
// `<featureDir>/SPEC.md` and returns `"quick"` iff the one kind reading — spec-template-core.mjs's
// `specAcceptanceCriteria(text).kind`, exactly what `check-spec.mjs --spec-kind` prints — is `quick` (QUICK_KIND).
// Everything else is `"full"`: no SPEC.md, an unreadable one, a directory named SPEC.md, no frontmatter, a LEGACY SPEC
// (whose `spec_kind` is never read as quick — the one reading reports `feature` for it), `feature`, `test-infra`, an
// invalid value, two `spec_kind:` lines, a body that opens with a `spec_kind:` line, and any throw.
//
// ── ONLY A POSITIVE READING SELECTS QUICK — every doubt fails toward the stricter table ────────────────────────
// `full` is the stricter table: it demands a regression verdict a quick run never produces. So a doubtful SPEC can cost
// a quick run a stop (check-loop.mjs finds no regression report and stops INCONCLUSIVE; check-loop-fresh.mjs asks for a
// `regress` re-run, which /pharn-loop's `## Quick mode` maps to S11), and can never let a full run skip the regression
// verdict.
//
// ── READ IN ANY STATE (D2) ───────────────────────────────────────────────────────────────────────────────────
// The SPEC's `state` is never read. /pharn-loop's Step 6a reverts a non-green stop's SPEC to Draft (it edits `state`,
// `spec_content_hash` and `approved_by` only) BEFORE Step 6b's check-loop-decision.mjs re-derives the stop through
// check-loop.mjs, so a reading keyed on `state` would flip the table between the stop and its re-derivation (L42, L58:
// the kind line is the fixed part, the approval the changing one). That the kind is the APPROVED, un-drifted one is
// established where it matters by check-loop-fresh.mjs check I (check-spec-approved + check-plan-spec-agree; the pin
// covers the `spec_kind:` line), which both of /pharn-loop's freshness lines run with `--front`, at the decision and
// again at the commit gate.
//
// ── ITS READERS, and why one module (L35) ────────────────────────────────────────────────────────────────────
// `loopModeOf` has two readers: check-loop.mjs, which picks its decision table from it (loaded with import(), so a
// load failure reads `full`), and loop-fresh-core.mjs, which picks the checks that apply (a static import: its CLI
// already maps a load failure to INCONCLUSIVE `checker-crashed`). `LOOP_MODES` is the closed vocabulary a LOOP.md's
// optional `mode` field is shape-checked against, by check-loop-record.mjs and check-loop-decision.mjs. The kind
// reading itself stays spec-template-core.mjs's: this file adds a rule over it, never a second parser.
//
// ── BOUND (P0) ───────────────────────────────────────────────────────────────────────────────────────────────
// It reads a token. It proves nothing about who chose it: under `/pharn-spec --model-approve` the model writes AND
// approves the kind, and nothing here sees the invocation. What it guarantees is that the table follows the pinned
// SPEC rather than an argument a model could pass.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QUICK_KIND, specAcceptanceCriteria } from "./spec-template-core.mjs";

/** The closed mode vocabulary, in a fixed order. Membership is `.includes` on this frozen array (L15). */
export const LOOP_MODES = Object.freeze(["full", "quick"]);

/** The mode of the loop run whose feature directory is `featureDir`: `"quick"` iff its SPEC.md reads `spec_kind:
 *  quick` through the one kind reading, else `"full"`. Never throws. */
export function loopModeOf(featureDir) {
  try {
    const text = readFileSync(join(featureDir, "SPEC.md"), "utf8");
    return specAcceptanceCriteria(text).kind === QUICK_KIND ? "quick" : "full";
  } catch {
    return "full";
  }
}
