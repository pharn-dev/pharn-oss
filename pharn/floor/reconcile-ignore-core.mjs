// pharn/floor/reconcile-ignore-core.mjs — the ONE owner of reconcile-ignore.json's loader and the always-reconciled
// matcher (6.57.0, deletion-follow-ups).
//
// WHY A CORE (P3, L35). Two floor modules ask the same question — "is this path on the always-reconciled control
// surface?" — over the same data file: `check-bash-reconcile.mjs` (to never exempt such a path, and to reconcile it
// against HEAD) and `apply-plan-deletions.mjs` (to refuse deleting it). Until 6.57.0 the helper imported both functions
// from the reconcile CLI module, so that CLI's exports were a shared API with a second reason to change (the 6.56.0
// review's P3 finding; follow-up `apply-deletions-core-extract`). The four names below were MOVED here verbatim; the
// CLI imports and re-exports them under the same names, so no existing importer changed (L72), and a test pins that
// both modules expose the same function objects (`reconcile-ignore-core.test.mjs`).
//
// WHAT IT IS NOT (P0): pure data loading and string membership. It reads one JSON file and tests paths against its
// lists; it executes no guard and decides no verdict. The set's CONTENT is pinned elsewhere (set-equal to
// protect-trusted-paths.cjs's lists, in check-bash-reconcile.test.mjs) — this module only owns how it is read.
//
// No `main`, no child process, no network. Imports: node: built-ins only.

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
export const IGNORE_DATA_PATH = join(HERE, "reconcile-ignore.json");

export function loadIgnoreData(path = IGNORE_DATA_PATH) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const exempt = (raw.exempt?.paths ?? []).map((e) => String(e.path));
  const neverExempt = (raw.never_exempt?.paths ?? []).map(String);
  const alwaysExact = (raw.always_reconciled?.exact ?? []).map(String);
  const humanOnly = (raw.always_reconciled?.human_only ?? []).map(String);
  const humanOnlyPrefixes = (raw.always_reconciled?.human_only_prefixes ?? []).map(String);
  const alwaysPrefixes = (raw.always_reconciled?.prefixes ?? []).map(String);
  // A `never_exempt` member may NEVER be exempted, whatever `exempt` says. Enforced here (not only in a
  // test) so a bad edit fails closed at RUN time rather than only under `npm test`.
  const offenders = exempt.filter((p) => neverExempt.includes(p));
  if (offenders.length) {
    return { ok: false, reason: `reconcile-ignore.json exempts a never_exempt path: ${offenders.join(", ")}` };
  }
  const pipelineNames = (raw.pipeline_artifacts?.names ?? []).map(String);
  return { ok: true, exempt, neverExempt, alwaysExact, humanOnly, humanOnlyPrefixes, alwaysPrefixes, pipelineNames };
}

// The human-only half (6.53.0): the four trusted docs, CODEOWNERS at its three locations, the project SPEC template,
// and the whole memory-bank canon subtree, dev and product. Listed in reconcile-ignore.json, pinned to the hook.
export function isHumanOnly(rel, data) {
  return (data.humanOnly ?? []).includes(rel) || (data.humanOnlyPrefixes ?? []).some((p) => rel.startsWith(p));
}

export function isAlwaysReconciled(rel, data) {
  return data.alwaysExact.includes(rel) || data.alwaysPrefixes.some((p) => rel.startsWith(p)) || isHumanOnly(rel, data);
}
