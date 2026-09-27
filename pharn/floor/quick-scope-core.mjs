// pharn/floor/quick-scope-core.mjs — the SCOPE CHECK the two quick modes keep (6.28.0, loop-quick-mode GATE 2, review
// F1): `/pharn-ship --quick`'s item 7 and every `/pharn-loop --quick` iteration. It asks `/pharn-regress`'s partition
// question without the rest of that stage: does every path changed since <base> fall inside the plan's declared writes,
// or inside one of the closed exemptions? This module is the CHECKER; its CLI is pharn/floor/check-quick-scope.mjs, an
// entry with no static import that loads this module with import() (the round-2 re-review's R2 — that file's header
// says why). `evaluate` RETURNS `{code, doc}`: 0 clean · 1 escaped · 2 inconclusive. It prints nothing and never exits.
//
// ============================== THE RECORDED FAILURE (P7), AND WHY THIS CHECK EXISTS ==============================
// 6.25.0's pinned line had the MODEL list the changed and declared paths and paste them into DOUBLE-QUOTED shell
// arguments of `check-regress.mjs scope`. Inside "…" a shell still expands `$VAR`, `$(…)` and backticks, so in the
// review's reproductions (`.dev/features/loop-quick-mode/REVIEW.md`, F1): a file named `src/$(touch INJECTED).js` ran
// in the orchestrator's own shell; an untracked `src/x$Q.js` expanded to the declared `src/x.js` (exit 0, a false pass);
// and a name holding a comma split into pieces that were each declared or exempt (exit 0 again). The same literal had
// shipped in `/pharn-ship --quick` since 6.25.0; `/pharn-loop --quick` would have run it unattended.
//
// THE FIX, by construction: the pinned line carries exactly two values — the feature slug and a resolved 40-hex base —
// and this module validates both: the slug against gate-run-core.mjs's FEATURE_SLUG_RE (the loop's own S1 slug rule),
// the base against SHA_RE AND `git rev-parse --verify --quiet <base>^{commit}`. Everything else is computed here, by code:
//   • the declared writes and the changed paths by pharn/floor/scope-inputs.mjs — the ONE owner stage-regress.mjs's
//     partition phase also calls (PLAN.md ∪ AC-TESTS.md `## Files`; `git diff --name-only --no-renames -z <base>` ∪
//     `git ls-files -z --others --exclude-standard`, minus `.pharn/`);
//   • the verdict by check-regress.mjs's exported `partitionScope` — the rule its `scope` CLI applies, with the same
//     closed exemptions (this feature's pipeline artifacts, the four trusted docs) — L35, never a copy.
// Paths travel as ARRAYS end to end: no shell, no comma/newline list grammar, no trim and no flag scan ever reads one.
// The DECLARED patterns get check-regress.mjs's `normPath`, exactly as its `parseList` applies it; a git path gets
// nothing, because a real file name may begin or end with a space. So an untracked nested repository, which git lists
// with a trailing slash (`vendor/lib/`), is compared as that entry: a plan declaring the bare `vendor/lib` does not cover
// it, while `vendor/**` or `vendor/lib/**` does.
//
// ================================ WHAT IT DOES NOT DO — stated, never implied (P0) ================================
// • It compares CHANGED SINCE <base>, never WRITTEN BY THE BUILD (L17), and it carries check-regress.mjs's closed
//   exemptions. A plan that rewrites its own `## Files` authorizes whatever it names — check-regress.mjs's header, and
//   its named follow-up. A git-ignored path is never listed, so it is outside this partition.
// • It LEAVES NO RECORD: the entry prints its JSON to stdout, and nothing writes it anywhere. In /pharn-loop nothing
//   downstream re-checks it (check-loop-fresh.mjs skips G and H in quick mode; the commit gate does not re-run it);
//   /pharn-ship copies its result into SHIP.md, a model-written line.
// • The only shell text left is the pinned line itself; the slug and the base reach it inside single quotes, and a
//   caller that types anything else there is outside this module's reach (the loop's S1 slug rule; a SHA git printed).
// • That a caller RUNS it, and obeys its exit code, is advisory orchestration (L19); the verdict is floor.
//
// TRUST (P2): git paths and `## Files` text are untrusted, attacker-nameable strings. They are compared as data and
// printed only inside JSON (JSON.stringify escapes every control character); `problem` strings are free-text DATA.
// Nothing is evaluated; git runs as an argument vector (stage-runtime.mjs's `gitSync`).
//
// A throw that is not this module's own verdict propagates out of `evaluate` on purpose: the entry reports it as exit 2
// `crashed`, never as a verdict.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FEATURE_SLUG_RE, SHA_RE } from "./gate-run-core.mjs";
import { containmentWalk, gitSync } from "./stage-runtime.mjs";
import { declaredWrites, changedPaths } from "./scope-inputs.mjs";
import { partitionScope, scopeFindings, normPath } from "./check-regress.mjs";

const FEATURES_DIR = "pharn/features";
const FLAGS = new Set(["--feature", "--base"]);
const USAGE = "usage: check-quick-scope.mjs --feature <name> --base <40-hex>";

/** The closed refusal vocabulary (exported so the tests iterate it — L29). `crashed` is the entry's alone: it reports a
 *  module that cannot load, a throw while checking, or a result outside this module's contract. */
export const REASON_CODES = Object.freeze([
  "usage-error",
  "base-not-commit",
  "path-containment",
  "plan-unreadable",
  "plan-files-unparseable",
  "git-failed",
  "crashed",
]);

/** The exit code of each verdict. check-quick-scope.mjs restates it, because it must not import this module statically;
 *  a test pins the two copies equal (L35: the second copy exists because it must, and the pin is its price). */
export const EXIT = Object.freeze({ clean: 0, escaped: 1, inconclusive: 2 });

/** This module's own verdict, thrown to unwind from any depth and caught in `evaluate` alone. */
const VERDICT = Symbol("quick-scope-core: verdict");
function finish(doc, code) {
  throw { [VERDICT]: true, code, doc };
}
function inconclusive(reasonCode, reason) {
  finish({ verdict: "inconclusive", reason_code: reasonCode, reason }, EXIT.inconclusive);
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

function check(args) {
  const { feature, base } = parseArgs(args);
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
    inconclusive("git-failed", `${cmd} failed: ${changed.detail}`);
  }
  const inside = changed.value;

  const { escaped, escapeExempt } = partitionScope({ inside, declared, feature });
  const doc = { feature, base, inside, declared, escaped, escape_exempt: escapeExempt };
  if (escaped.length) finish({ ...doc, findings: scopeFindings(escaped) }, EXIT.escaped);
  finish(doc, EXIT.clean);
}

/**
 * Run the check over the CLI's flags (`process.argv.slice(2)`, from the repo root). Returns `{code, doc}`. Any throw that
 * is not this module's own verdict propagates, so the entry can report it as `crashed` rather than as a verdict.
 * @param {string[]} args
 * @returns {{code: number, doc: object}}
 */
export function evaluate(args) {
  try {
    check(args);
  } catch (e) {
    if (e !== null && typeof e === "object" && e[VERDICT] === true) return { code: e.code, doc: e.doc };
    throw e;
  }
  throw new Error("the check ended without a verdict"); // unreachable: check() always finishes
}
