// pharn/floor/shelled-verdict-core.mjs — how a floor checker reads the result of a floor checker it SHELLS, and how
// it reports that the shelled one crashed. ONE copy (L35) of the rule three checkers apply: check-test-stage.mjs over
// its two children (6.20.6), and those children over theirs (6.21.1) — check-ac-tests.mjs over
// check-plan-spec-agree.mjs, ac-tests-lock.mjs over check-spec-approved.mjs. Contract: pharn/pharn-contracts/ac-tests.md,
// "The test-stage gate".
//
// WHY: node exits 1 on an uncaught throw or a module that failed to load — the code a checker uses for its RED. A caller
// that reads exit 1 as the RED reports a crash as evidence. Through check-test-stage.mjs that evidence was
// `mapping-red` or `lock-red`, and /pharn-loop stopped on it as S13 ("set the build aside and re-run /pharn-test") for a
// fault that says nothing about the tests (the `nested-child-crash` follow-up; .dev/features/crash-routing/).
//
// THE RULE (`shelledVerdict`), for a checker whose contract is exit 0 (GREEN) or exit 1 with a `RED — ` line on stdout:
// check-plan-spec-agree.mjs and check-spec-approved.mjs print one before every exit-1 return, which a ✧ test pins over
// their sources. Those two shapes are verdicts. ANYTHING else is a crash, and a crash is no verdict: exit 1 without the
// line, any other exit code, a kill by signal, a spawn error.
//
// THE REPORT: a checker that found no definite RED of its own while a checker it shells crashed exits 2 and prints
// `UNUSABLE child-crashed — …` as its FIRST stdout line (`childCrashedLine`). check-test-stage.mjs reads that
// (`reportsChildCrash`, together with exit 2) as UNUSABLE, never as a RED reason. A definite RED stays exit 1: it is a
// verdict whatever the crashed check would have said, and the crash is named on a later line.
//
// BOUNDS (P0): the rule tells a crash from a RED only for a checker that keeps the contract above. A future exit-1 path
// without a `RED — ` line would read as a crash, which is fail-closed (no verdict, a stop either way). A crash one level
// further down is read by the shelled checker itself as its own RED (both read any non-zero child as RED), so it
// arrives here as a verdict — the contract states where check-loop-fresh.mjs pre-empts that and where it does not. A
// spoofed `RED — ` line can only restore a RED (fail-closed). The token is read only at the START of stdout, which the
// reporting checker prints itself before any untrusted text. The premise is pinned in the SOURCE, not in delivery: both
// shelled checkers end with process.exit(main()), so on a platform whose piped stdout is asynchronous (darwin) a RED line
// past 64 KiB of output can be lost, and past spawnSync's 1 MiB maxBuffer the caller sees `r.error`. Either reads as a
// crash — no verdict, never a pass. The crash detail's stderr excerpt may carry a machine path; no command copies a
// child's diagnosis lines into a record.
//
// LOAD GRAPH (P3, stated): three checkers import this module, and through ac-tests-lock.mjs → ac-gate-core.mjs it is in
// check-verify.mjs's static graph too. A failure to load it is a crash of each importer — fail-closed everywhere it
// is read (check-loop-fresh check E reads a check-verify that prints no JSON as INCONCLUSIVE).
//
// TRUST (P2): the stderr excerpt in a crash detail is untrusted text from the crashed process — one line, bounded and
// JSON-escaped. No verdict reads it.

/** A shelled checker's RED line (6.20.6's rule, moved here from check-test-stage.mjs): line-anchored, over the FULL
 *  stdout. */
export const RED_LINE = /^RED — /m;

/** The first-line token of a checker reporting that a checker IT shells crashed. */
export const CHILD_CRASHED = "UNUSABLE child-crashed";

/** An error's own line — `Error: …`, `TypeError: …`, `Error [ERR_MODULE_NOT_FOUND]: …` — never the throwing SOURCE
 *  line node prints first (`throw new Error(…)`). */
const ERROR_LINE = /^(?:[A-Z][A-Za-z]*)?Error\b/;
const MAX_EXCERPT = 200;

/** A spawnSync result of a checker whose contract is exit 0 (GREEN) or exit 1 with a `RED — ` line: "green" | "red" |
 *  "crashed". */
export function shelledVerdict(r) {
  if (!r || r.error || r.status === null || r.status === undefined) return "crashed";
  if (r.status === 0) return "green";
  if (r.status === 1 && RED_LINE.test(r.stdout ?? "")) return "red";
  return "crashed";
}

/** One sentence: how the crashed run ended, the first error line of its stderr (bounded, JSON-escaped) when it has
 *  one, and what was therefore not checked. */
export function crashedDetail(script, r, notChecked) {
  let how;
  if (r?.error) how = `could not be run (${r.error.code ?? r.error.message})`;
  else if (r?.status === null || r?.status === undefined) how = `was killed (${r?.signal ?? "no exit code"})`;
  else if (r.status === 1) how = "exited 1 without its RED line";
  else how = `exited ${r.status}, which its contract (0 GREEN, 1 RED) does not have`;
  const line = String(r?.stderr ?? "")
    .split("\n")
    .find((l) => ERROR_LINE.test(l));
  const excerpt =
    line === undefined ? "" : ` (stderr: ${JSON.stringify(line.length > MAX_EXCERPT ? `${line.slice(0, MAX_EXCERPT)}…` : line)})`;
  return `${script} ${how} — it crashed, which is no verdict${excerpt}; ${notChecked}`;
}

/** The line a checker prints — FIRST, when it has no definite RED — to report that a checker it shells crashed. */
export function childCrashedLine(detail) {
  return `${CHILD_CRASHED} — ${detail}`;
}

/** Does a child's stdout START with that report? check-test-stage.mjs reads it only together with exit 2. */
export function reportsChildCrash(stdout) {
  return String(stdout ?? "").startsWith(`${CHILD_CRASHED} — `);
}
