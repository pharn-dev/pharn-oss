#!/usr/bin/env node
// pharn/floor/check-quick-scope.mjs — the SCOPE CHECK the two quick modes keep (6.27.0, loop-quick-mode GATE 2, review
// F1): `/pharn-ship --quick`'s item 7 and every `/pharn-loop --quick` iteration. It asks `/pharn-regress`'s partition
// question without the rest of that stage: does every path changed since <base> fall inside the plan's declared writes,
// or inside one of the closed exemptions? Exit 0 clean · 1 escaped · 2 inconclusive.
//
// ============================== THE RECORDED FAILURE (P7), AND WHY THIS FILE EXISTS ==============================
// 6.25.0's pinned line had the MODEL list the changed and declared paths and paste them into DOUBLE-QUOTED shell
// arguments of `check-regress.mjs scope`. Inside "…" a shell still expands `$VAR`, `$(…)` and backticks, so in the
// review's reproductions (`.dev/features/loop-quick-mode/REVIEW.md`, F1): a file named `src/$(touch INJECTED).js` ran
// in the orchestrator's own shell; an untracked `src/x$Q.js` expanded to the declared `src/x.js` (exit 0, a false pass);
// and a name holding a comma split into pieces that were each declared or exempt (exit 0 again). The same literal had
// shipped in `/pharn-ship --quick` since 6.25.0; `/pharn-loop --quick` would have run it unattended.
//
// THE FIX, by construction: the pinned line carries exactly two values — the feature slug and a resolved 40-hex base —
// and this file validates both: the slug against gate-run-core.mjs's FEATURE_SLUG_RE (the loop's own S1 slug rule), the
// base against SHA_RE AND `git rev-parse --verify --quiet <base>^{commit}`. Everything else is computed here, by code:
//   • the declared writes and the changed paths by pharn/floor/scope-inputs.mjs — the ONE owner stage-regress.mjs's
//     partition phase also calls (PLAN.md ∪ AC-TESTS.md `## Files`; `git diff --name-only --no-renames -z <base>` ∪
//     `git ls-files -z --others --exclude-standard`, minus `.pharn/`);
//   • the verdict by check-regress.mjs's exported `partitionScope` — the rule its `scope` CLI applies, with the same
//     closed exemptions (this feature's pipeline artifacts, the four trusted docs) — L35, never a copy.
// Paths travel as ARRAYS end to end: no shell, no comma/newline list grammar, no trim and no flag scan ever reads one.
// The DECLARED patterns get check-regress.mjs's `normPath`, exactly as its `parseList` applies it; a git path gets
// nothing, because a real file name may begin or end with a space.
//
// ================================ WHAT IT DOES NOT DO — stated, never implied (P0) ================================
// • It compares CHANGED SINCE <base>, never WRITTEN BY THE BUILD (L17), and it carries check-regress.mjs's closed
//   exemptions. A plan that rewrites its own `## Files` authorizes whatever it names — check-regress.mjs's header, and
//   its named follow-up. A git-ignored path is never listed, so it is outside this partition.
// • It LEAVES NO RECORD: its JSON goes to stdout, and nothing writes it anywhere. In /pharn-loop nothing downstream
//   re-checks it (check-loop-fresh.mjs skips G and H in quick mode; the commit gate does not re-run it); /pharn-ship
//   copies its result into SHIP.md, a model-written line.
// • The only shell text left is the pinned line itself; the slug and the base reach it inside single quotes, and a
//   caller that types anything else there is outside this file's reach (the loop's S1 slug rule; a SHA git printed).
// • That a caller RUNS it, and obeys its exit code, is advisory orchestration (L19); the verdict is floor.
//
// TRUST (P2): git paths and `## Files` text are untrusted, attacker-nameable strings. They are compared as data and
// printed only inside JSON (JSON.stringify escapes every control character); `problem` strings are free-text DATA.
// Nothing is evaluated; git runs as an argument vector (stage-runtime.mjs's `gitSync`).
//
// THE FLUSH RULE (the check-verify.mjs rule): `emit` sets process.exitCode and unwinds with a module-private sentinel,
// never an immediate exit, so a piped reader gets the whole document. An unexpected throw is caught at the top and
// reported as inconclusive (`crashed`, exit 2) — never as exit 1, which means "escaped".
//
// Usage: node pharn/floor/check-quick-scope.mjs --feature <name> --base <40-hex>   (from the repo root)
// Exit: 0 clean · 1 escaped (a blocking P0 fix #7 finding per path) · 2 inconclusive, `reason_code` one of
//       usage-error | base-not-commit | path-containment | plan-unreadable | plan-files-unparseable | git-failed | crashed.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FEATURE_SLUG_RE, SHA_RE } from "./gate-run-core.mjs";
import { containmentWalk, gitSync } from "./stage-runtime.mjs";
import { declaredWrites, changedPaths } from "./scope-inputs.mjs";
import { partitionScope, scopeFindings, normPath } from "./check-regress.mjs";

const FEATURES_DIR = "pharn/features";
const FLAGS = new Set(["--feature", "--base"]);
const USAGE = "usage: check-quick-scope.mjs --feature <name> --base <40-hex>";

/** The closed refusal vocabulary (exported so the tests iterate it — L29). */
export const REASON_CODES = Object.freeze([
  "usage-error",
  "base-not-commit",
  "path-containment",
  "plan-unreadable",
  "plan-files-unparseable",
  "git-failed",
  "crashed",
]);

const EMITTED = Symbol("check-quick-scope: emitted");
function emit(obj, code) {
  console.log(JSON.stringify(obj, null, 2));
  process.exitCode = code;
  throw EMITTED;
}
function inconclusive(reasonCode, reason) {
  emit({ verdict: "inconclusive", reason_code: reasonCode, reason }, 2);
}

/** Pairwise: every even position is a known flag seen once, followed by its value. Nothing else is accepted. */
function parseArgs(args) {
  const values = new Map();
  for (let i = 0; i < args.length; i += 2) {
    const a = args[i];
    if (!FLAGS.has(a)) inconclusive("usage-error", `unexpected argument ${JSON.stringify(a)} — ${USAGE}`);
    if (values.has(a)) inconclusive("usage-error", `${a} given twice — ${USAGE}`);
    if (i + 1 >= args.length) inconclusive("usage-error", `${a} requires a value — ${USAGE}`);
    values.set(a, args[i + 1]);
  }
  for (const f of FLAGS) if (!values.has(f)) inconclusive("usage-error", `${f} is required — ${USAGE}`);
  return { feature: values.get("--feature"), base: values.get("--base") };
}

function main(argv) {
  const { feature, base } = parseArgs(argv.slice(2));
  if (!FEATURE_SLUG_RE.test(feature)) {
    inconclusive("usage-error", `--feature must be a plain slug matching ${FEATURE_SLUG_RE}, got ${JSON.stringify(feature)}`);
  }
  if (!SHA_RE.test(base)) inconclusive("usage-error", `--base must be a resolved 40-hex commit SHA, got ${JSON.stringify(base)}`);
  const rev = gitSync(["rev-parse", "--verify", "--quiet", `${base}^{commit}`]);
  if (!rev.ok || rev.stdout.trim() !== base) inconclusive("base-not-commit", `--base ${base} does not name a commit in this repository`);

  const cwd = process.cwd();
  const featureDir = `${FEATURES_DIR}/${feature}`;
  const walk = containmentWalk(cwd, join(cwd, featureDir));
  if (!walk.ok) inconclusive("path-containment", `${featureDir}: ${walk.reason}`);

  let planText;
  try {
    planText = readFileSync(`${featureDir}/PLAN.md`, "utf8");
  } catch (e) {
    inconclusive("plan-unreadable", `${featureDir}/PLAN.md cannot be read (${e && e.code ? e.code : "error"})`);
  }
  const declaredRes = declaredWrites(planText, `${featureDir}/AC-TESTS.md`);
  if (!declaredRes.ok) inconclusive("plan-files-unparseable", `${featureDir}/PLAN.md: ${declaredRes.reason}`);
  const declared = [...new Set(declaredRes.value.map(normPath).filter(Boolean))];

  const changed = changedPaths(base);
  if (!changed.ok) {
    const cmd = changed.which === "diff" ? "git diff --name-only --no-renames -z <base>" : "git ls-files -z --others --exclude-standard";
    inconclusive("git-failed", `${cmd} failed: ${changed.stderr.trim()}`);
  }
  const inside = changed.value;

  const { escaped, escapeExempt } = partitionScope({ inside, declared, feature });
  const doc = { feature, base, inside, declared, escaped, escape_exempt: escapeExempt };
  if (escaped.length) emit({ ...doc, findings: scopeFindings(escaped) }, 1);
  emit(doc, 0);
}

if (import.meta.main) {
  try {
    main(process.argv);
  } catch (e) {
    if (e !== EMITTED) {
      // A bug, not a verdict: the stack goes to stderr, a fixed reason to stdout, and the exit is 2 — never 1.
      console.error(e && e.stack ? e.stack : e);
      console.log(
        JSON.stringify({ verdict: "inconclusive", reason_code: "crashed", reason: "check-quick-scope.mjs threw; see stderr" }, null, 2)
      );
      process.exitCode = 2;
    }
  }
}
