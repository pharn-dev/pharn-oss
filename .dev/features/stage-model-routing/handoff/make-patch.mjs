#!/usr/bin/env node
// .dev/features/stage-model-routing/handoff/make-patch.mjs — generate the HUMAN-ONLY patch for LIMITS.md §8 that
// this increment's build cannot write itself (fix #2 — the four trusted docs are Write/Edit/MultiEdit/NotebookEdit-
// denied, and this build writes none of them through Bash either). The `ship-quick-mode` precedent, narrowed to the
// one file this increment changes: pharn/ARCHITECTURE.md is NOT touched, so the ARCHITECTURE pin does not move.
//
// IT NEVER WRITES A TRUSTED-DOC PATH. It reads LIMITS.md, computes the edited text ENTIRELY IN MEMORY, and writes only
// scratch under `.pharn/pharn-dev-build/stage-model-routing-patch/` (removed before exit, success or failure) and
// `../proposed/human-only.patch` + `../proposed/human-only.sha256` beside this script. A person applies the patch
// with `proposed/apply.sh` at GATE 2 (see APPLY.md); that is the only step that writes LIMITS.md.
//
// ALWAYS AGAINST THE LIVE FILE (PLAN.md, Chain sequencing 7): every find below is a LITERAL of the bytes §8 holds
// today, so a sibling that edits §8 first makes the generator REFUSE rather than overwrite its edit — the remedy is
// to re-read §8 and update the finds, never to widen them. A sibling that edits OTHER sections of LIMITS.md
// (`loop-quick-mode` touches §3a and §6) only needs a re-run: the patch and its sum are regenerated from the live
// bytes, and `git apply --check` runs on the assembled patch before anything is written.
//
// THREE CHECKS, each a PURE EXPORTED FUNCTION behind the `import.meta.main` guard, so BUILD.md's probes can call
// them with a deliberately bad input and record the refusal (L60):
//   1. `applyOnce`             — a find must match EXACTLY once, else nothing is written.
//   2. `markerPreservationReds`— every site `.dev/floor/specified-primitives.json` registers against LIMITS.md keeps
//                                its marker exactly as present or absent as before (check-specified-markers's own
//                                predicate, reduced in memory).
//   3. `noCarriageReturn`      — the edited text carries no CR (a CRLF edit would change every line's bytes).
//
// Usage: node .dev/features/stage-model-routing/handoff/make-patch.mjs   (run from the repo root)
// Exit: 0 — the patch and its sum were written; stdout prints the post-apply sha256 of LIMITS.md.
//       1 — a find matched zero or several times, a check failed, or `git apply --check` refused; nothing is
//           written on the patch side (the check reads the patch from stdin before either file is written).

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join } from "node:path";

const REPO = process.cwd(); // run from the repo root, exactly as APPLY.md pins it
const LIMITS_PATH = join(REPO, "LIMITS.md");
const MARKERS_JSON = join(REPO, ".dev", "floor", "specified-primitives.json");
const SCRATCH = join(REPO, ".pharn", "pharn-dev-build", "stage-model-routing-patch");
const PROPOSED = join(REPO, ".dev", "features", "stage-model-routing", "proposed");

/** The version the revised text names. A renumber on merge (PLAN.md, Chain sequencing 5) edits this one line. */
export const VERSION = "6.27.0";

/** Thrown by every check on a refusal; caught once, at the bottom, so a refusal prints ONE line and exits 1. */
export class FailedGeneration extends Error {}
const fail = (msg) => {
  throw new FailedGeneration(msg);
};

/** The raw-bytes sha256 `shasum -a 256 -c` compares. */
export const sha256 = (text) => createHash("sha256").update(text).digest("hex");

/** CHECK 1 — replace `find` with `replace`, requiring EXACTLY ONE occurrence, else throw. */
export function applyOnce(text, find, replace, label) {
  const count = text.split(find).length - 1;
  if (count !== 1) fail(`${label}: find string matched ${count} time(s), expected exactly 1 — nothing written`);
  return text.split(find).join(replace);
}

/** CHECK 2 — marker preservation. Returns violation messages (empty = clean); pure, no throw. */
export function markerPreservationReds({ file, before, after, sites }) {
  const reds = [];
  for (const site of sites) {
    if (site.file !== file) continue;
    const was = before.includes(site.marker);
    const isNow = after.includes(site.marker);
    if (was !== isNow) {
      reds.push(
        `marker preservation: ${file}'s registered marker ${JSON.stringify(site.marker.slice(0, 80))} was ` +
          `${was ? "present" : "absent"} and is now ${isNow ? "present" : "absent"}`
      );
    }
  }
  return reds;
}

/** CHECK 3 — no carriage return in the edited text. Pure. */
export function noCarriageReturn(text) {
  return !text.includes("\r");
}

/** Every marker site the manifest registers, flattened (the three sections check-specified-markers reads). */
export function manifestSites(manifest) {
  const sites = [];
  for (const p of manifest.specified_primitives ?? []) for (const s of p.sites ?? []) sites.push(s);
  for (const a of manifest.named_artifacts ?? []) sites.push({ file: a.cited_in, marker: a.citation });
  for (const c of manifest.forward_claims ?? []) for (const s of c.sites ?? []) sites.push(s);
  return sites;
}

// ── §8, the bytes it holds today (the FIND) ──────────────────────────────────────────────────────────────────────
export const S8_BODY_FIND = [
  "`pharn.config.json`'s `models.stages` block declares a `model` and an `effort` for each product stage,",
  "and `pharn/floor/check-model-config.mjs` holds that block in EQUALITY with the product `/pharn-*`",
  "commands' static `model:` / `effort:` frontmatter, in both directions (the set is that checker's",
  "`PRODUCT_STAGES` map — read it there). That check is real and",
  "it is floor (enum/regex, `ARCHITECTURE.md §2` primitive #3). What it certifies is narrower than the",
  "config's presence suggests.",
  "",
  '- **Struck claim:** "PHARN runs each stage on its configured model" — or any reading of a green',
  "  `check-model-config` as evidence that `/pharn-plan` ran on Opus. The checker's own stdout carries the",
  "  disclaimer: `NOTE (P0): this is config↔frontmatter EQUALITY — never proof a stage RAN under that model.`",
  "- **True statement:** two files in this repository agree with each other. Model and effort are applied by",
  "  the Claude Code platform, invisible to any hook, hash or enum, so **no floor primitive in PHARN observes",
  "  what a stage actually ran under**. An agreement check is also structurally blind to both copies being",
  "  wrong together.",
  "- **The block is not a runtime control, and the scope of that statement is exact.** Nothing reads",
  "  `models.stages` at run time to select a model. The files that mention it are the two checkers that",
  "  validate it (`pharn/floor/check-model-config.mjs`, `.dev/floor/check-config.mjs`) and their tests'",
  "  fixtures — a live sweep of the repository, which is weaker than a probe and is stated as such: a",
  "  negative existential is not something executing a check can settle. This is **not** the broader claim",
  "  that `pharn.config.json` is unread — that file **is** read at run time, by",
  "  `.claude/hooks/enforce-writes-scope.cjs` (`skillsVersion`, to choose its posture), by",
  "  `pharn/floor/check-bash-reconcile.mjs` (which copies it into a probe sandbox), and by others since",
  "  (`testResults`, read by `pharn/floor/test-results-core.mjs`, 6.15.0). The block is a source of",
  "  truth the frontmatter is held to, nothing more. PHARN does not attempt to apply a model and fall short;",
  "  it does not attempt it at all.",
  "- **Deleting the block loses the check rather than failing it.** Probed, not reasoned about: a config with",
  "  no `models.stages`, and an absent config file, each exit **0 GREEN by design** — the",
  "  `check-lessons-index` NO_CANON / COLD precedent, the honest normal state of an install that does not use",
  "  the block.",
  "- **Two further bounds are the CHECKER's claims, cited rather than adopted.** They describe Claude Code's",
  "  behaviour and no file in this repository can settle them, so they are not asserted here.",
  '  `pharn/floor/check-model-config.mjs:32-38` states that the override "applies for the rest of the current',
  '  turn" — so a stage invoked as a step inside `/pharn-ship` or `/pharn-loop` runs inside the',
  "  orchestrator's turn and gets no per-stage routing — and that an organization `availableModels` allowlist,",
  "  or auto mode, can decline a value silently. Read them there.",
  "",
].join("\n");

// ── §8, revised (the REPLACE) — open forms throughout (L47): no closed count of readers or of routed stages ────────
export const S8_BODY_REPLACE = [
  "`pharn.config.json`'s `models.stages` block declares a `model` and an `effort` for each product stage.",
  "Each thing that reads it answers a different question:",
  "",
  "- **The agreement check.** `pharn/floor/check-model-config.mjs` holds the block in EQUALITY with the product",
  "  `/pharn-*` commands' static `model:` / `effort:` frontmatter, in both directions (the set is that checker's",
  "  `PRODUCT_STAGES` map — read it there). The frontmatter is what a stage runs under when a person invokes it",
  "  directly. That check is real and it is floor (enum/regex, `ARCHITECTURE.md §2` primitive #3).",
  `- **Stage routing (${VERSION}).** \`/pharn-ship\` and \`/pharn-loop\` run each stage their routing policy routes as a`,
  "  Claude Code subagent, and `pharn/floor/stage-agent.mjs` reads the block at run time, through that checker's",
  "  `resolve`, to choose the model that subagent is requested on. The DECISION is floor (a closed policy table",
  "  and the checker's own exit codes, tested); APPLYING it is the platform's, and the orchestrating model passes",
  "  the model to the Agent call — advisory.",
  "",
  "What either certifies is narrower than the config's presence suggests.",
  "",
  '- **Struck claim:** "PHARN runs each stage on its configured model" — or any reading of a green',
  "  `check-model-config`, or of an `agent:<alias>` route on a marker, as evidence that `/pharn-plan` ran on",
  "  Opus. The checker's own stdout carries the disclaimer: `NOTE (P0): this is config↔frontmatter EQUALITY —",
  "  never proof a stage RAN under that model.`",
  "- **True statement:** for a routed stage PHARN REQUESTS the configured model, and the stage's marker records",
  "  that request; `cost.json` records the model each request was SERVED — evidence from a transcript format the",
  "  platform does not document, not a floor primitive. Model and effort are applied by the Claude Code",
  "  platform, invisible to any hook, hash or enum, so **no floor primitive in PHARN observes what a stage",
  "  actually ran under**. An agreement check is also structurally blind to both copies being wrong together.",
  "- **Effort is not routed.** The Agent tool takes no effort, so a routed stage runs at the effort it inherits;",
  "  the declared `effort` reaches a stage only when a person invokes the stage command directly.",
  "- **What is not routed runs on the session's model, and the run records why.** A stage the routing policy",
  "  keeps inline, a stage that falls back (the inline reasons `pharn/floor/stage-agent-core.mjs`'s header",
  "  lists), and the orchestrators themselves all run on the model of the session running the orchestrator, not",
  "  on one chosen for the stage. A stage that could have been routed records its reason on its marker; the",
  "  policy's own inline stages are named as such in the run's summary.",
  "- **Deleting the block loses routing as well as the check.** Probed, not reasoned about: a config with no",
  "  `models.stages`, and an absent config file, each exit **0 GREEN by design** in the checker — the",
  "  `check-lessons-index` NO_CANON / COLD precedent, the honest normal state of an install that does not use",
  "  the block — and every stage that could have been routed then runs inline, recording `no-stages` or",
  "  `no-config`.",
  "- **Two further bounds are the CHECKER's claims, cited rather than adopted.** They describe Claude Code's",
  "  behaviour and no file in this repository can settle them, so they are not asserted here.",
  "  `pharn/floor/check-model-config.mjs`'s header states, under \"TURN SCOPE\", that a command's model override",
  '  "applies for the rest of the current turn" — so a stage run inline as a step inside `/pharn-ship` or',
  "  `/pharn-loop` runs inside the orchestrator's turn and does not get its frontmatter model — and, under",
  '  "PLATFORM VETO", that an organization `availableModels` allowlist, or auto mode, can decline a value',
  "  silently. What a declined model does to an Agent call is not documented either. Read them there.",
  "",
].join("\n");

export const S8_COMMENT_FIND =
  "<!-- §8 was drafted in .dev/features/model-routing-limit and applied by a human (SKILLS_VERSION 6.4.1). -->\n";

export const S8_COMMENT_REPLACE =
  S8_COMMENT_FIND + `<!-- §8 was revised in .dev/features/stage-model-routing and applied by a human (SKILLS_VERSION ${VERSION}). -->\n`;

/** The whole edit, in memory. Throws FailedGeneration on any refusal. */
export function editLimits(original) {
  let edited = applyOnce(original, S8_BODY_FIND, S8_BODY_REPLACE, "LIMITS.md §8 body");
  edited = applyOnce(edited, S8_COMMENT_FIND, S8_COMMENT_REPLACE, "LIMITS.md §8 provenance comment");
  return edited;
}

function main() {
  let original;
  try {
    original = readFileSync(LIMITS_PATH, "utf8");
  } catch (e) {
    fail(`cannot read LIMITS.md: ${e.message}`);
  }
  const edited = editLimits(original);

  const manifest = JSON.parse(readFileSync(MARKERS_JSON, "utf8"));
  const reds = markerPreservationReds({ file: "LIMITS.md", before: original, after: edited, sites: manifestSites(manifest) });
  if (reds.length) fail(reds[0]);
  if (!noCarriageReturn(edited)) fail("LIMITS.md's edited text contains a CR — a CRLF edit would change every line");

  rmSync(SCRATCH, { recursive: true, force: true });
  mkdirSync(SCRATCH, { recursive: true });
  mkdirSync(PROPOSED, { recursive: true });
  writeFileSync(join(SCRATCH, "limits.before"), original);
  writeFileSync(join(SCRATCH, "limits.after"), edited);
  const r = spawnSync("git", ["diff", "--no-index", "--", "limits.before", "limits.after"], { cwd: SCRATCH, encoding: "utf8" });
  // git diff --no-index: exit 1 means "differs" — the success case. 0 = identical (a generator bug).
  if (r.status === 0) fail("the edited LIMITS.md is byte-identical to the original — nothing to patch");
  if (r.status !== 1) fail(`git diff --no-index exited ${r.status} unexpectedly: ${r.stderr}`);
  const patchText = r.stdout.split("a/limits.before").join("a/LIMITS.md").split("b/limits.after").join("b/LIMITS.md");

  // `git apply --check` against the REAL working tree, on STDIN, BEFORE either proposed/ file is written.
  const check = spawnSync("git", ["apply", "--check", "-"], { cwd: REPO, input: patchText, encoding: "utf8" });
  if (check.status !== 0) fail(`git apply --check refused the assembled patch: ${check.stderr || check.stdout}`);

  writeFileSync(join(PROPOSED, "human-only.patch"), patchText);
  writeFileSync(join(PROPOSED, "human-only.sha256"), `${sha256(edited)}  LIMITS.md\n`);
  console.log(`LIMITS.md after the patch: sha256 ${sha256(edited)}`);
  console.log(`LIMITS.md now:             sha256 ${sha256(original)}`);
}

if (import.meta.main) {
  try {
    main();
  } catch (e) {
    if (!(e instanceof FailedGeneration)) throw e; // an unexpected bug — surface the real stack
    console.error(`make-patch: ${e.message}`);
    process.exitCode = 1;
  } finally {
    rmSync(SCRATCH, { recursive: true, force: true });
  }
}
