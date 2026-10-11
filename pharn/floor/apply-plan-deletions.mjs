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
//   bad-path                 — ac-tests-core.mjs `badPath` (absolute, not normalized, `..`, leading `-`, `.pharn/`,
//                              `pharn/features/`), or a `.git` segment (any letter case), or a backslash
//   control-path             — reconcile-ignore.json's always-reconciled set (the guards, the floors, the trusted docs,
//                              CODEOWNERS, the SPEC template, canon), compared exactly AND case-folded: a human deletes those
//   containment              — a parent component is a symlink, or cannot be lstat'ed
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
// it. Reconcile judges it afterwards: the build's anchor precedes this line, and a TRACKED file unlinked from the
// worktree stays in git's index, so `check-bash-reconcile.mjs` makes it a candidate judged against the anchored scope —
// which holds the bare marked path, because the setter reads the back-ticked text and the marker sits after it. An
// UNTRACKED marked file leaves nothing to enumerate and is only that checker's "present at anchor, absent now" WARN
// (`reconciliation-record.md` §3). It never stages (`git rm` would move a tracked deletion into that WARN branch too);
// `/pharn-loop`'s commit stages tracked deletions in scope by itself. That `/pharn-build` runs this line, and deletes
// nothing any other way, is advisory command discipline. That the deleted file SHOULD have been deleted is the plan's
// claim, never this module's.
//
// NO CHILD PROCESS, NO NETWORK. Imports: floor modules only.

import "./runtime-floor.mjs";
import { readFileSync, unlinkSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { pathsFromPlanFiles, clean, isConcrete } from "./plan-files-core.mjs";
import { badPath } from "./ac-tests-core.mjs";
import { containmentWalk, lstatSafe } from "./stage-runtime.mjs";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { isAlwaysReconciled, loadIgnoreData } from "./check-bash-reconcile.mjs";

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
 *  otherwise let `limits.md` name `LIMITS.md`). */
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
  const toDelete = [];
  const absent = [];
  for (const p of marked) {
    if (unmarked.includes(p))
      return { ok: false, refusal: new Refusal("conflicting-declaration", p, "the path is also declared as an ordinary item") };
    if (!isConcrete(p))
      return { ok: false, refusal: new Refusal("delete-not-concrete", p, "a glob or a placeholder names no single file") };
    const why = badPath(p);
    if (why) return { ok: false, refusal: new Refusal("bad-path", p, `the path is ${why}`) };
    if (p.includes("\\")) return { ok: false, refusal: new Refusal("bad-path", p, "the path holds a backslash") };
    if (p.split("/").some((seg) => seg.toLowerCase() === ".git")) {
      return { ok: false, refusal: new Refusal("bad-path", p, "the path is inside git metadata") };
    }
    if (isControl(p))
      return { ok: false, refusal: new Refusal("control-path", p, "a guard, floor, trusted or canon path — a human deletes it") };
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
