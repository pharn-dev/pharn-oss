#!/usr/bin/env node
// pharn/floor/apply-plan-deletions.mjs — remove the files a PLAN marks for deletion (6.56.0, plan-declared-deletions).
//
// Floor infrastructure, NOT a Capability (no `role:`). `/pharn-build` runs it once, unconditionally, as the last action
// of its Step 3:
//
//   node pharn/floor/apply-plan-deletions.mjs --feature <name>
//
// THE RECORDED FAILURE (P7): a `/pharn-loop` hygiene run in a user's project could not delete two orphaned blog posts,
// `.vscode/settings.json` and two unused UI components. Undeclared, a deletion is an out-of-scope change at the scope
// checks; declared, `check-build-complete.mjs` required the path to EXIST, so verify read INCOMPLETE. The Write/Edit
// tools cannot delete, so a deletion is a Bash act — and a PLAN path is untrusted text that no product-command shell
// line may carry (`.dev/floor/command-hygiene.test.mjs`, SHELL_VALUES). So the deletion happens HERE, in tested code,
// from a pinned line that carries only the validated feature slug.
//
// WHAT IT DELETES: the `## Files` items of `pharn/features/<name>/PLAN.md` that carry plan-files-core.mjs's deletion
// marker (``- `path` (delete)``), read with that module's `pathsFromPlanFiles` — never a second reader (L69). Everything
// is VALIDATED before anything is deleted; one bad item deletes nothing. Refusals, each a closed `reason_code`:
//   usage                    — argv is not exactly `--feature <slug>` with a FEATURE_SLUG_RE slug
//   no-plan                  — the PLAN is absent, not a regular file, or reached through a symlink
//   plan-files-unparseable   — the PLAN has no `## Files`
//   delete-near-miss         — an item spells the marker another way (`(Delete)`, `(deleted)`, …) — L36
//   conflicting-declaration  — a path is marked in one item and unmarked in another
//   delete-not-concrete      — a marked item is a glob or a placeholder
//   bad-path                 — ac-tests-core.mjs `badPath` (absolute, not normalized, `..`, leading `-`), a path under
//                              `pharn/.run/` or `pharn/features/` or with a `.git` segment (each in any letter case), or a
//                              backslash
//   control-path             — reconcile-ignore.json's always-reconciled set (the guards, the floors, the trusted docs,
//                              CODEOWNERS, the SPEC template, canon), compared exactly AND case-folded — or the same
//                              file (`dev`/`ino`) as an existing exact member: a human deletes those
//   containment              — a parent component is a symlink, cannot be lstat'ed, or the path's on-disk spelling
//                              cannot be resolved or leaves the project
//
// THE ON-DISK SPELLING IS JUDGED TOO (6.56.0 review, blocking finding). `bad-path` and `control-path` run over the
// declared spelling AND, once the leaf is a regular file, over `realpathSync.native`'s spelling of it: a case-insensitive
// volume equates spellings no lexical fold reproduces — on APFS `pharn/LIMITſ.md` (U+017F) IS `pharn/LIMITS.md`, and the
// spelling-only test deleted it. BOUND: the identity is read on the volume as it stands when this runs; a platform whose
// realpath does not return the stored spelling falls back to the declared-spelling test and the dev/ino comparison.
// BOUND, check-then-act (TOCTOU): every path is validated first and unlinked after, and `unlinkSync` re-resolves the
// parent chain, so a parent swapped for a symlink in between is followed. Nothing in this module prevents that; the
// model is NON-ADVERSARIAL (a mistaken or careless PLAN, not a concurrent attacker), as for the reconciler it relies on.
// LOAD GRAPH (6.57.0): `isAlwaysReconciled` / `loadIgnoreData` come from `reconcile-ignore-core.mjs`, the one owner of
// the always-reconciled set, which `check-bash-reconcile.mjs` imports too — never from that CLI module (L35).
//   not-a-regular-file       — the path holds a directory, a symlink (a dangling or looping one included) or anything
//                              that is not a regular file; links are never followed (L59)
//   unlink-failed            — an unlink failed with anything but ENOENT; `deleted[]` lists what was already removed
// An already-absent marked path is reported in `absent[]` (a re-run is idempotent), never refused.
//
// OUTPUT: one JSON document on stdout — `{feature, deleted, absent}` on exit 0; `{feature, deleted, reason_code, path,
// reason}` on exit 2. Every path in it ORIGINATES in the untrusted PLAN (P2): it is JSON-quoted, and a consumer quotes
// it as DATA. No reason interpolates raw PLAN bytes (L62). Exit: 0 applied (possibly nothing) · 2 refused · anything
// else crashed.
//
// WHAT IT IS NOT (P0), stated: a deletion here is an `unlinkSync` reached through Bash, so neither PreToolUse guard sees
// it. Reconcile judges it afterwards: the build's anchor precedes this line, and since 6.57.0 `check-bash-reconcile.mjs`
// makes every path the anchor hashed and that is gone from disk a candidate — tracked or untracked — judged against the
// anchored scope, which holds the bare marked path, because the setter reads the back-ticked text and the marker sits
// after it (`reconciliation-record.md` §3). It never stages; `/pharn-loop`'s commit stages tracked deletions in scope
// by itself. That `/pharn-build` runs this line, and deletes
// nothing any other way, is advisory command discipline. That the deleted file SHOULD have been deleted is the plan's
// claim, never this module's.
//
// NO CHILD PROCESS, NO NETWORK. Imports: floor modules only.

import "./runtime-floor.mjs";
import { readFileSync, unlinkSync, lstatSync, realpathSync } from "node:fs";
import { join, dirname, resolve, relative, sep, isAbsolute } from "node:path";
import { pathsFromPlanFiles, clean, isConcrete } from "./plan-files-core.mjs";
import { badPath } from "./ac-tests-core.mjs";
import { containmentWalk, lstatSafe } from "./stage-runtime.mjs";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { isAlwaysReconciled, loadIgnoreData } from "./reconcile-ignore-core.mjs";

/** The closed refusal codes, in the order the checks run. */
export const REFUSALS = Object.freeze([
  "usage",
  "no-plan",
  "plan-files-unparseable",
  "delete-near-miss",
  "conflicting-declaration",
  "delete-not-concrete",
  "bad-path",
  "control-path",
  "containment",
  "not-a-regular-file",
  "unlink-failed",
]);

class Refusal {
  constructor(code, path, reason) {
    this.code = code;
    this.path = path;
    this.reason = reason;
  }
}

/** The always-reconciled set, compared exactly and case-folded (the guards case-fold; a case-insensitive volume would
 *  otherwise let `pharn/limits.md` name `pharn/LIMITS.md`). */
function controlMatcher(data) {
  const lower = (xs) => xs.map((x) => x.toLowerCase());
  const folded = {
    alwaysExact: lower(data.alwaysExact),
    alwaysPrefixes: lower(data.alwaysPrefixes),
    humanOnly: lower(data.humanOnly ?? []),
    humanOnlyPrefixes: lower(data.humanOnlyPrefixes ?? []),
  };
  return (rel) => isAlwaysReconciled(rel, data) || isAlwaysReconciled(rel.toLowerCase(), folded);
}

/** `dev:ino` of every EXACT control path (the guards' wiring, the trusted docs, CODEOWNERS, the SPEC template) that
 *  exists as a regular file under the root. The prefix sets (floors, canon) are covered by the on-disk spelling check. */
function controlIdentities(rootReal, data) {
  const ids = new Set();
  for (const rel of [...data.alwaysExact, ...(data.humanOnly ?? [])]) {
    try {
      const st = lstatSync(join(rootReal, rel));
      if (st.isFile()) ids.add(`${st.dev}:${st.ino}`);
    } catch {
      /* absent: nothing to protect under that name */
    }
  }
  return ids;
}

/**
 * Decide what to delete, without deleting anything. Pure over the PLAN text plus `lstat` of the targets.
 * @param {string} planText
 * @param {string} root      the absolute project root
 * @param {object} data      loadIgnoreData()'s result
 * @returns {{ok: true, toDelete: string[], absent: string[]} | {ok: false, refusal: Refusal}}
 */
export function planDeletions(planText, root, data) {
  const parsed = pathsFromPlanFiles(planText);
  if (!parsed.ok) return { ok: false, refusal: new Refusal("plan-files-unparseable", null, "the PLAN has no `## Files` heading") };
  const near = parsed.entries.find((e) => e.deleteNearMiss);
  if (near) {
    return {
      ok: false,
      refusal: new Refusal(
        "delete-near-miss",
        clean(near.path),
        "an item spells the deletion marker another way; write exactly `(delete)`"
      ),
    };
  }
  const unmarked = parsed.entries.filter((e) => !e.delete).map((e) => clean(e.path));
  const marked = [...new Set(parsed.entries.filter((e) => e.delete).map((e) => clean(e.path)))];
  const isControl = controlMatcher(data);
  // The refusal rules over ONE spelling of a path. Run over the declared spelling first and, once the leaf is known to be
  // a regular file, over its ON-DISK spelling too (below) — a case-insensitive volume equates spellings no lexical fold
  // reproduces (U+017F `ſ` names `s` on APFS), so a spelling test alone let `pharn/LIMITſ.md` delete pharn/LIMITS.md (the 6.56.0 review's case, at today's path).
  const spellingRefusal = (p, shown) => {
    const why = badPath(p);
    if (why) return new Refusal("bad-path", shown, `the path is ${why}`);
    if (p.includes("\\")) return new Refusal("bad-path", shown, "the path holds a backslash");
    const lower = p.toLowerCase();
    // badPath's two reserved prefixes, folded (badPath compares them as written).
    if (lower === "pharn/.run" || lower.startsWith("pharn/.run/") || lower.startsWith("pharn/features/")) {
      return new Refusal("bad-path", shown, "the path is under pharn/.run/ or pharn/features/ (any letter case)");
    }
    if (p.split("/").some((seg) => seg.toLowerCase() === ".git")) return new Refusal("bad-path", shown, "the path is inside git metadata");
    if (isControl(p)) return new Refusal("control-path", shown, "a guard, floor, trusted or canon path — a human deletes it");
    return null;
  };
  let rootReal;
  try {
    rootReal = realpathSync.native(root);
  } catch {
    return { ok: false, refusal: new Refusal("containment", null, "the project root cannot be resolved on disk") };
  }
  const controlIds = controlIdentities(rootReal, data);
  const toDelete = [];
  const absent = [];
  for (const p of marked) {
    if (unmarked.includes(p))
      return { ok: false, refusal: new Refusal("conflicting-declaration", p, "the path is also declared as an ordinary item") };
    if (!isConcrete(p))
      return { ok: false, refusal: new Refusal("delete-not-concrete", p, "a glob or a placeholder names no single file") };
    const declared = spellingRefusal(p, p);
    if (declared) return { ok: false, refusal: declared };
    const abs = resolve(root, p);
    // The parent chain, never the leaf: the leaf is classified below by its own lstat. A file at the root has no
    // parent to walk (containmentWalk refuses the root itself by design).
    if (dirname(abs) !== root && !containmentWalk(root, dirname(abs)).ok) {
      return { ok: false, refusal: new Refusal("containment", p, "a parent of the path is a symlink or unreadable") };
    }
    const leaf = lstatSafe(abs);
    if (!leaf.ok) return { ok: false, refusal: new Refusal("containment", p, "the path cannot be lstat'ed") };
    if (leaf.stat === null) {
      absent.push(p);
      continue;
    }
    if (!leaf.stat.isFile())
      return { ok: false, refusal: new Refusal("not-a-regular-file", p, "only a regular file is deleted; links are never followed") };
    // THE ON-DISK IDENTITY (6.56.0 review, blocking finding). No parent is a symlink and the leaf is a regular file, so
    // realpath.native returns the spelling the filesystem holds; every refusal rule runs over it too. Fail CLOSED: a
    // realpath that throws, or a spelling that leaves the root, refuses.
    let canon;
    try {
      canon = relative(rootReal, realpathSync.native(abs)).split(sep).join("/");
    } catch {
      return { ok: false, refusal: new Refusal("containment", p, "the path's on-disk spelling cannot be resolved") };
    }
    if (canon === "" || canon === ".." || canon.startsWith("../") || isAbsolute(canon)) {
      return { ok: false, refusal: new Refusal("containment", p, "the path's on-disk spelling is outside the project") };
    }
    const onDisk = spellingRefusal(canon, p);
    if (onDisk) return { ok: false, refusal: onDisk };
    // Defence in depth: the same FILE as an existing exact control path, by device and inode (a hard link included).
    if (controlIds.has(`${leaf.stat.dev}:${leaf.stat.ino}`)) {
      return {
        ok: false,
        refusal: new Refusal("control-path", p, "the file is a guard, trusted or SPEC-template file under another name"),
      };
    }
    toDelete.push(p);
  }
  return { ok: true, toDelete, absent };
}

function emit(doc, code) {
  process.stdout.write(JSON.stringify(doc, null, 2) + "\n");
  process.exitCode = code;
}

function refuse(feature, deleted, r) {
  emit({ feature, deleted, reason_code: r.code, path: r.path, reason: r.reason }, 2);
}

function main(argv) {
  const args = argv.slice(2);
  const feature = args.length === 2 && args[0] === "--feature" ? args[1] : null;
  if (feature === null || !FEATURE_SLUG_RE.test(feature)) {
    return refuse(null, [], new Refusal("usage", null, "usage: apply-plan-deletions.mjs --feature <name> (a lower-case slug)"));
  }
  const root = process.cwd();
  const planRel = join("pharn", "features", feature, "PLAN.md");
  const planAbs = resolve(root, planRel);
  const walk = containmentWalk(root, planAbs);
  const planStat = lstatSafe(planAbs);
  if (!walk.ok || !planStat.ok || planStat.stat === null || !planStat.stat.isFile()) {
    return refuse(feature, [], new Refusal("no-plan", planRel, "the PLAN is absent, not a regular file, or reached through a symlink"));
  }
  const data = loadIgnoreData();
  if (!data.ok) throw new Error(`reconcile-ignore.json is unusable: ${data.reason}`); // a crash, never a verdict
  const decided = planDeletions(readFileSync(planAbs, "utf8"), root, data);
  if (!decided.ok) return refuse(feature, [], decided.refusal);
  const deleted = [];
  for (const p of decided.toDelete) {
    try {
      unlinkSync(resolve(root, p));
      deleted.push(p);
    } catch (e) {
      if (e && e.code === "ENOENT") {
        decided.absent.push(p);
        continue;
      }
      return refuse(
        feature,
        deleted,
        new Refusal("unlink-failed", p, `unlink failed: ${e && typeof e.code === "string" ? e.code : "unknown error"}`)
      );
    }
  }
  emit({ feature, deleted, absent: decided.absent }, 0);
}

if (import.meta.main) main(process.argv);
