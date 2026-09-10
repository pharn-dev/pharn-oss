#!/usr/bin/env node
// pharn/floor/check-bash-reconcile.mjs — the deterministic BASH-WRITE RECONCILIATION verdict.
//
// Floor/eval infrastructure — NOT a Capability (no `role:`), like check-verify.mjs / check-regress.mjs /
// check-build-complete.mjs in this floor-ignored dir. It owns ONE axis — "did anything change that the
// write guards would have DENIED?" — and its baseline half lives in pharn/floor/reconcile-baseline.mjs
// (P3, one axis per file).
//
// ============================ WHAT IT GUARANTEES, AND WHAT IT DOES NOT =============================
//
// THE CLAIM, and it is deliberately this narrow (P0):
//   "A NON-ADVERSARIAL write to a path the active writes-scope would have DENIED is DETECTED, and fails
//    the stage."
//
//   "Non-adversarial" is load-bearing, not hedging — see bound 5. The baseline is unauthenticated state
//   inside the writable tree, so a writer who also rewrites it defeats detection on ordinary paths. This
//   is an ACCOUNTING tool against tooling that escapes its scope, NOT a control against an attacker.
//
//   NOT "Bash writes are prevented." Detection is strictly weaker than prevention. The only true
//   prevention is OS-level sandboxing of the Bash process, which PHARN does not implement and cannot —
//   it is harness-layer, environment-dependent, not expressible in markdown methodology (LIMITS.md §6).
//   NOT "all Bash writes are detected" — only those to DENIED paths, inside the reconciled set, between
//   two anchors, in one worktree. Every one of those four bounds is stated below.
//   NOT "a clean verdict means no escape occurred" — it means none was detected.
//
// WHY IT EXISTS (P7 — a real, recurring failure, never a hypothetical). Both `PreToolUse` guards match
// `Write|Edit|MultiEdit|NotebookEdit`; a Bash write reaches every path, is not denied, and — no
// `PostToolUse` hook being wired — leaves no record. lessons-learned L19 named this in 2026-08-05 with a
// DISCIPLINE-ONLY remedy ("declare it honestly"). L20's rule is that such a remedy WILL recur and the
// SECOND occurrence is the trigger for a floor check. It recurred at least three times: L19's own
// repo-wide-formatter instance, L38's writes-scope contention, and /pharn-*memory-promote's
// docs/lessons-index.md generator write. The trigger is met and is NOT manufactured.
//
// WHY DETECTION AND NOT PREVENTION — the decisive fact, verified against the live documentation rather
// than assumed (the task that commissioned this asked specifically not to assume it): a `PostToolUse`
// hook CANNOT block. Its exit 2 is documented as "Shows stderr to Claude" — the tool has already run —
// and the event carries no `permissionDecision` field. The strongest thing a hook there can do is put
// text in front of the model, which the model may ignore: ADVISORY by construction. Calling that a
// guarantee would be the exact P0 disease this repo exists to prevent. Enforcement therefore lives HERE,
// in a checker whose exit code check-verify.mjs already folds into a verdict stages branch on.
//
// FLOOR REDUCTION (pharn/ARCHITECTURE.md §2): primitive #2 (content-hash, changed-vs-anchor) composed
// with primitive #3 (path/enum membership, permitted-vs-denied). ZERO model judgment in the verdict, and
// NO shell parsing anywhere — shell parsing is undecidable and a verb denylist is a heuristic, which P0
// forbids labelling a guarantee. This file never reads a Bash command string; it compares hashes and
// paths, so `sed -i`, a here-doc, `node -e`, a Makefile target and a compiled binary are all equally
// visible. That is the whole reason the design is a reconciler and not a command filter.
//
// HOW "DENIED" IS DECIDED — DELEGATED, never re-derived (the task's constraint, and lessons-learned L37's
// rule that a quantified claim is verified by EXECUTING the op, not by re-reading it):
//   • trusted-path / canon / control-surface denial  -> EXECUTE .claude/hooks/protect-trusted-paths.cjs
//   • the fail-closed DEFAULT, when no scope was set  -> EXECUTE .claude/hooks/enforce-writes-scope.cjs
//     in a probe sandbox that reproduces the two runtime signals its defaultSafeSet() reads (a
//     pharn.config.json `skillsVersion`, and `.dev/floor/` presence) with NO scope file present. The
//     default set is therefore never copied into this file, and a future change to it is inherited.
//   • an EXPLICIT scope -> matched here, against the scope SNAPSHOTTED in the baseline.
//
// THE ONE DUPLICATION, bounded and pinned: globToRegExp below is a faithful copy of the matcher in
// enforce-writes-scope.cjs. It cannot be delegated, because the hook resolves the scope from disk and by
// reconciliation time that file holds a LATER stage's scope (lessons-learned L38 — one mutable record,
// global to the tree; check-regress.mjs documents the same trap). check-bash-reconcile.test.mjs carries a
// PARITY test over shared cases — the check-build-complete.mjs precedent, which re-implements the
// setter's `## Files` parser under the same discipline. Example-based, not a proof of equivalence: the
// two must be updated together.
//
// TRUST (P2): every path here is `trust: untrusted` DATA — used only as readFileSync arguments, object
// keys, and regex OPERANDS (never regex SOURCE; a crafted filename cannot alter the matcher). `git` is
// invoked with execFileSync + an argv array, so no shell parses a filename. No network, no eval.
//
// ================================== THE BOUNDS, STATED, NOT HIDDEN ==================================
//  1. THE RECONCILED SET is `tracked ∪ untracked-not-ignored`. A git-ignored path is INVISIBLE — by
//     design (it is what makes `.pharn/` scratch, `runs/**` and `node_modules/` free) and by consequence
//     (a Bash write there is never reported). See pharn/floor/reconcile-ignore.json.
//  2. THE WINDOW is anchor -> reconcile (build -> verify). A write before the anchor is baked into the
//     baseline and is invisible; a later anchor RESETS, which is why anchoring is at build ONLY.
//  3. ONE WORKTREE. Two agent sessions sharing a tree share `.pharn/`, so a second session's writes can
//     surface as this one's escape. That is lessons-learned L38 exactly; this checker inherits the
//     hazard and cannot fix it. Named as a bound in LIMITS.md; the structural remedy is L38's own.
//  4. NO ATTRIBUTION. It answers "this path changed and the guards would have denied it", never "who".
//  5. DELETING OR FORGING THIS CHECKER'S STATE is possible through the very channel it monitors — but it
//     is LOUD, not silent. Two independent reasons: with `--require-baseline` (what /verify passes) an
//     absent baseline is INCONCLUSIVE; and the control surface is reconciled against COMMITTED BLOB IDS
//     on EVERY run — with a baseline and without one — so rewriting a guard's baseline entry to match
//     the edited file does not clear it. An earlier draft ran that blob-id comparison only in the
//     no-baseline branch, which meant the guarantee this header claims was strictly wider than the one
//     the code implemented; caught in review, and the test named "reconciled against HEAD even WITH a
//     baseline present" exists to keep it caught.
//
//     BUT THE CLAIM MUST BE NARROWED FURTHER, AND THIS IS THE MOST IMPORTANT SENTENCE IN THIS HEADER:
//     that argument holds ONLY for the always-reconciled control surface. For an ORDINARY path the
//     baseline IS the reference, the baseline lives under `.pharn/` — which Bash reaches — and nothing
//     authenticates it. So a writer who edits a denied file AND rewrites that file's baseline entry to
//     the new hash gets a SILENT `CLEAN`: no escape, no warning, no INCONCLUSIVE. Therefore:
//       • WHAT THIS DETECTS: a Bash write by a NON-ADVERSARIAL writer — a stage's own tooling, a
//         formatter, a generator, a script, a mistake. That is the entire population of L19/L20's
//         observed failures, and it is what the increment was built for.
//       • WHAT THIS DOES NOT DETECT: an ADVERSARY who also rewrites the baseline. Against that actor
//         only the control surface holds, because only it is anchored in committed git objects.
//     "Cannot be disabled quietly" is therefore STRUCK for ordinary paths and TRUE only for the control
//     surface. Closing it needs authenticated state outside the worktree — the same harness-layer
//     category as the OS sandbox in LIMITS.md §6, and just as absent. Raised in review; the accepted
//     remedy offered there was "narrow the documented guarantee", and this is that narrowing.
//  6. A COMMITTED change moves HEAD too, so the control-surface fallback cannot see it. The backstop
//     there is Code-Owner review, which is where CODEOWNERS already sits.
//  7. THIS FILE CANNOT VOUCH FOR ITSELF. /pharn-*verify runs the WORKTREE copy of this checker through
//     Bash, so a modified checker can print `CLEAN` without reconciling anything. `pharn/floor/` is in
//     `always_reconciled`, which means a modified checker is detected — BY ITSELF, which is circular and
//     is not a guarantee. A real fix loads the checker from an immutable installation outside the
//     worktree; PHARN has no such location, so this is stated rather than solved.
//  8. THE ANCHOR IS ADVISORY (lessons-learned L19 — it is a Bash call, outside the PreToolUse gate). A
//     run that SKIPS it does not reliably fail: `--require-baseline` is satisfied by whatever earlier
//     epoch is still on disk, so the reconciliation silently ranges over the wrong window. Only a tree
//     that has NEVER anchored yields INCONCLUSIVE. Binding a record to a specific successful build
//     would need a pending/committed lifecycle this does not implement.
//
// Usage:
//   node pharn/floor/check-bash-reconcile.mjs [--base <dir>] [--require-baseline] [--json]
//
// Verdict enum (printed as `.verdict`): CLEAN | ESCAPE | NO_BASELINE | INCONCLUSIVE
// Exit: 0 CLEAN or NO_BASELINE · 1 ESCAPE · 2 INCONCLUSIVE / bad input — FAIL-CLOSED (P5).
//   NO_BASELINE is exit 0 BY DESIGN, and only without --require-baseline: a fresh clone or a CI checkout
//   has never anchored, and REDding there would make every first run a false alarm — the same posture
//   pharn/floor/check-lessons-index.mjs takes for COLD. /verify passes --require-baseline because a
//   build DID run, so there an absent baseline is a real refusal.

import { readFileSync, existsSync, statSync, mkdtempSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { enumerate, hashFile, RECORD_VERSION, RECORD_PATH } from "./reconcile-baseline.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const IGNORE_DATA_PATH = join(HERE, "reconcile-ignore.json");
export const VERDICTS = ["CLEAN", "ESCAPE", "NO_BASELINE", "INCONCLUSIVE"];

// --- the hook's matcher, copied faithfully (see THE ONE DUPLICATION above). `**` spans segments; `*`
// --- matches within one segment; everything else literal. A bare path matches only itself.
export function globToRegExp(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        re += ".*";
        i++;
      } else {
        re += "[^/]*";
      }
    } else if ("\\^$.|?+()[]{}".includes(c)) {
      re += "\\" + c;
    } else {
      re += c;
    }
  }
  return new RegExp("^" + re + "$");
}

export function matchesAny(rel, globs) {
  return globs.some((g) => globToRegExp(g).test(rel));
}

export function loadIgnoreData(path = IGNORE_DATA_PATH) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  const exempt = (raw.exempt?.paths ?? []).map((e) => String(e.path));
  const neverExempt = (raw.never_exempt?.paths ?? []).map(String);
  const alwaysExact = (raw.always_reconciled?.exact ?? []).map(String);
  const alwaysPrefixes = (raw.always_reconciled?.prefixes ?? []).map(String);
  // A `never_exempt` member may NEVER be exempted, whatever `exempt` says. Enforced here (not only in a
  // test) so a bad edit fails closed at RUN time rather than only under `npm test`.
  const offenders = exempt.filter((p) => neverExempt.includes(p));
  if (offenders.length) {
    return { ok: false, reason: `reconcile-ignore.json exempts a never_exempt path: ${offenders.join(", ")}` };
  }
  const pipelineNames = (raw.pipeline_artifacts?.names ?? []).map(String);
  return { ok: true, exempt, neverExempt, alwaysExact, alwaysPrefixes, pipelineNames };
}

// --- A stage's OWN pipeline artifact (lessons-learned L17). `features/<slug>/<NAME>` or the same under
// --- `.dev/`, where <NAME> is EXACT membership in the closed enum — never a `**` glob over the feature
// --- dir, so a stray file there is still reported. <slug> is shape-gated so a crafted `..` cannot build
// --- a traversing prefix (the same refusal check-regress.mjs's FEATURE_SLUG_RE makes, for the same
// --- reason: the previous shape "yields a prefix that matches no path" was nearly true, not true).
const PIPELINE_RE = /^(?:\.dev\/)?features\/(?!\.\.?\/)([A-Za-z0-9._-]+)\/(.+)$/;

// The ACTIVE feature slug, derived from the scope record's own `set_by` (a PLAN path). Narrowing the
// exemption to that one feature matters: exempting a pipeline filename under ANY slug lets a write to
// `features/<anything>/SHIP.md` pass unexamined, and an exemption set wide enough to swallow the rule is
// the failure this whole increment was weighed against. When no slug is derivable (no snapshot, or a
// `set_by` that is not a feature path) the exemption stays slug-agnostic — that is strictly no wider
// than before, and it is the honest fallback rather than a guess.
export function activeFeatureSlug(scopeSnapshot) {
  const setBy = scopeSnapshot?.set_by;
  if (typeof setBy !== "string") return null;
  const m = PIPELINE_RE.exec(setBy.replace(/\\/g, "/"));
  return m ? m[1] : null;
}

export function isPipelineArtifact(rel, data, activeSlug = null) {
  const m = PIPELINE_RE.exec(rel);
  if (!m) return false;
  const slug = m[1];
  if (slug === "." || slug === "..") return false;
  if (activeSlug !== null && slug !== activeSlug) return false;
  const tail = m[2];
  if (data.pipelineNames.includes(tail)) return true;
  return /^lenses\/[A-Za-z0-9._-]+\/findings\.json$/.test(tail);
}

export function isAlwaysReconciled(rel, data) {
  return data.alwaysExact.includes(rel) || data.alwaysPrefixes.some((p) => rel.startsWith(p));
}

// --- EXECUTE a hook against one candidate path and read its exit code. -----------------------------
// 0 = it would have allowed the write; 2 = it would have denied it. Anything else is unusable input and
// the caller treats it as INCONCLUSIVE (fail-closed) rather than guessing a direction.
function askHook(hookAbs, rel, cwd) {
  const payload = JSON.stringify({ tool_name: "Write", tool_input: { file_path: rel } });
  const r = spawnSync(process.execPath, [hookAbs], { input: payload, cwd, encoding: "utf8" });
  if (r.error || r.status === null) return { ok: false, reason: `hook did not run: ${hookAbs}` };
  // ONLY 0 and 2 are answers. Anything else — a crash, a usage error, a future exit code — is NOT an
  // allow. Reading `status !== 2` as "permitted" would turn any hook malfunction into a false CLEAN,
  // which is fail-OPEN in the one place this file must not be (P5). Caught in review, not by a test.
  if (r.status === 0) return { ok: true, denied: false };
  if (r.status === 2) return { ok: true, denied: true };
  return {
    ok: false,
    reason: `hook ${hookAbs} answered with an unexpected exit code ${r.status} for '${rel}' — not treated as permission`,
  };
}

// --- the probe sandbox: reproduce ONLY the two runtime signals enforce-writes-scope.cjs's
// --- defaultSafeSet() reads, with NO scope file, so the hook itself computes the fail-closed default.
function makeDefaultProbeSandbox(root) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-reconcile-"));
  const cfg = resolve(root, "pharn.config.json");
  if (existsSync(cfg)) {
    try {
      copyFileSync(cfg, join(dir, "pharn.config.json"));
    } catch {
      /* absent signal is a valid state; the hook handles it */
    }
  }
  try {
    if (statSync(resolve(root, ".dev/floor")).isDirectory()) mkdirSync(join(dir, ".dev/floor"), { recursive: true });
  } catch {
    /* not a dev repo */
  }
  return dir;
}

function emit(obj, code) {
  console.log(JSON.stringify(obj, null, 2));
  process.exit(code);
}

function main(argv) {
  const args = argv.slice(2);
  let baseDir = ".";
  let requireBaseline = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--base") baseDir = args[++i];
    else if (args[i] === "--require-baseline") requireBaseline = true;
    else if (args[i] === "--json") {
      /* default output is already JSON; accepted for symmetry with siblings */
    } else {
      emit({ verdict: "INCONCLUSIVE", reason: `unknown argument: ${args[i]}` }, 2);
    }
  }
  if (!baseDir) emit({ verdict: "INCONCLUSIVE", reason: "--base requires a directory" }, 2);
  const root = resolve(baseDir);
  if (!existsSync(root)) emit({ verdict: "INCONCLUSIVE", reason: `--base is not a directory: ${baseDir}` }, 2);

  let data;
  try {
    const d = loadIgnoreData();
    if (!d.ok) emit({ verdict: "INCONCLUSIVE", reason: d.reason }, 2);
    data = d;
  } catch (e) {
    emit({ verdict: "INCONCLUSIVE", reason: `cannot read reconcile-ignore.json: ${e.message}` }, 2);
  }

  const protectHook = resolve(root, ".claude/hooks/protect-trusted-paths.cjs");
  const scopeHook = resolve(root, ".claude/hooks/enforce-writes-scope.cjs");
  if (!existsSync(protectHook) || !existsSync(scopeHook)) {
    // No guards wired => the writes-scope guarantee does not exist in this tree, so the premise of a
    // reconciliation is void. Fail closed rather than report a reassuring CLEAN (P5).
    emit({ verdict: "INCONCLUSIVE", reason: "a write guard is absent — nothing to reconcile against" }, 2);
  }

  // --- the baseline -------------------------------------------------------------------------------
  const baselineAbs = resolve(root, RECORD_PATH);
  const warnings = [];
  let baseline = null;
  if (existsSync(baselineAbs)) {
    try {
      baseline = JSON.parse(readFileSync(baselineAbs, "utf8"));
    } catch (e) {
      emit({ verdict: "INCONCLUSIVE", reason: `baseline is unparseable: ${e.message}` }, 2);
    }
    if (!baseline || typeof baseline !== "object" || !baseline.entries || typeof baseline.entries !== "object") {
      emit({ verdict: "INCONCLUSIVE", reason: "baseline is present but malformed (no `entries` map)" }, 2);
    }
    if (Number(baseline.version) > RECORD_VERSION) {
      emit({ verdict: "INCONCLUSIVE", reason: `baseline schema v${baseline.version} is newer than this checker (v${RECORD_VERSION})` }, 2);
    }
    if (Number(baseline.version) < RECORD_VERSION) {
      // Legacy records are TOLERATED AT READ — an older epoch still names real paths and real hashes.
      warnings.push(`baseline schema v${baseline.version} is older than v${RECORD_VERSION}; read as legacy`);
    }
  }

  const en = enumerate(root);
  if (!en.ok) emit({ verdict: "INCONCLUSIVE", reason: en.reason }, 2);

  // --- the control surface, reconciled ALWAYS and against COMMITTED BLOB IDS ------------------------
  // Not "always when there is no baseline" — ALWAYS. The baseline lives under `.pharn/`, which Bash
  // reaches, so a caller that can edit a guard can also rewrite that guard's baseline entry to the new
  // hash; the path then matches its baseline and never becomes a candidate. Comparing the control
  // surface to `HEAD` instead anchors it in something the monitored channel cannot rewrite in place.
  // This is the difference between the guarantee this file CLAIMS and the one an earlier draft
  // implemented, and it was caught in review rather than by a test.
  function controlSurfaceChanges() {
    try {
      const out = execFileSync("git", ["diff", "--name-only", "HEAD", "--"], { cwd: root, encoding: "utf8", maxBuffer: 1 << 26 });
      return out
        .split("\n")
        .filter(Boolean)
        .filter((rel) => isAlwaysReconciled(rel, data));
    } catch {
      warnings.push("control-surface blob-id reconciliation unavailable (no git HEAD) — baseline comparison only");
      return null;
    }
  }

  // --- candidates ---------------------------------------------------------------------------------
  let candidates = [];
  if (baseline) {
    const seen = new Set();
    for (const rel of en.paths) {
      seen.add(rel);
      const now = hashFile(resolve(root, rel));
      if (now === null) {
        // FAIL-CLOSED: a path we cannot hash is a path we cannot clear. Treating it as a warning and
        // continuing would let "make it unreadable" suppress a denied change (P5).
        warnings.push(`unreadable during reconcile, treated as changed: ${rel}`);
        candidates.push(rel);
        continue;
      }
      const before = baseline.entries[rel];
      if (before === undefined || before !== now) candidates.push(rel);
    }
    const cs = controlSurfaceChanges();
    if (cs) for (const rel of cs) if (!candidates.includes(rel)) candidates.push(rel);
    for (const rel of Object.keys(baseline.entries)) {
      // A deletion is not an escape: nothing was WRITTEN. Reported so it is never silently swallowed.
      if (!seen.has(rel)) warnings.push(`present at anchor, absent now: ${rel}`);
    }
  } else {
    if (requireBaseline) {
      emit({ verdict: "INCONCLUSIVE", reason: `no baseline at ${RECORD_PATH}, and --require-baseline was passed` }, 2);
    }
    // No anchor: ordinary-path detection is unavailable, but the ALWAYS-RECONCILED control surface still
    // is — against committed blob ids, which live outside anything the monitored channel can rewrite in
    // place. Same call as the baseline branch makes; one implementation, two entry points.
    candidates = controlSurfaceChanges() ?? [];
  }

  // --- exemptions ---------------------------------------------------------------------------------
  const exempted = [];
  const activeSlug = activeFeatureSlug(baseline?.scope_snapshot ?? null);
  candidates = candidates.filter((rel) => {
    if (isAlwaysReconciled(rel, data)) return true; // never exemptible
    if (data.exempt.includes(rel) || isPipelineArtifact(rel, data, activeSlug)) {
      exempted.push(rel);
      return false;
    }
    return true;
  });

  // --- permitted vs denied ------------------------------------------------------------------------
  const scopeSnapshot = baseline?.scope_snapshot ?? null;
  let sandbox = null;
  const escapes = [];
  for (const rel of candidates) {
    const p = askHook(protectHook, rel, root);
    if (!p.ok) emit({ verdict: "INCONCLUSIVE", reason: p.reason }, 2);
    if (p.denied) {
      escapes.push({ file: rel, denied_by: "protect-trusted-paths.cjs" });
      continue;
    }
    // An EXPLICIT scope is authoritative whatever its length. `{"scope": []}` means "this stage may
    // write nothing", NOT "no scope was set" — CLAUDE.md makes the same point about why `--clear`
    // DELETES the record rather than writing an empty array, since an empty array is truthy and denies
    // everything. Gating on `length > 0` fell through to the *more permissive* fail-closed default,
    // which is fail-OPEN on the strictest scope a stage can declare. An absent scope is `null`
    // (snapshotScope never returns `[]` for an absent file), so the two states stay distinguishable.
    if (scopeSnapshot && Array.isArray(scopeSnapshot.scope)) {
      if (!matchesAny(rel, scopeSnapshot.scope)) {
        escapes.push({ file: rel, denied_by: "writes-scope (snapshot)", scope_set_by: scopeSnapshot.set_by });
      }
      continue;
    }
    if (sandbox === null) sandbox = makeDefaultProbeSandbox(root);
    const d = askHook(scopeHook, rel, sandbox);
    if (!d.ok) emit({ verdict: "INCONCLUSIVE", reason: d.reason }, 2);
    if (d.denied) escapes.push({ file: rel, denied_by: "writes-scope (fail-closed default)" });
  }

  const base = {
    verdict: baseline ? (escapes.length ? "ESCAPE" : "CLEAN") : escapes.length ? "ESCAPE" : "NO_BASELINE",
    epoch: baseline?.epoch ?? null,
    anchored_by: baseline?.anchored_by ?? null,
    reconciled: candidates.length,
    escapes,
    exempted,
    warnings,
  };
  if (escapes.length) {
    base.findings = escapes.map((e) => ({
      type: "FINDING",
      rule_id: "P0",
      severity: "blocking",
      file: e.file,
      problem: `'${e.file}' changed since the reconciliation anchor, and the write guards would have DENIED a write to it (${e.denied_by}) — a write reached it outside the guarded tool surface`,
    }));
  }
  emit(base, escapes.length ? 1 : 0);
}

if (import.meta.main) main(process.argv);
