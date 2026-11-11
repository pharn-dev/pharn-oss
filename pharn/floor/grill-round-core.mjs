// pharn/floor/grill-round-core.mjs — the re-plan round of a full /pharn-loop (7.8.0, loop-replan-rounds): which round
// the next grill writes, which round a re-plan reads, and whether a `replan` triage verdict may start another round.
// The PURE half: it decides over a listing of which files exist and over documents the caller has read; no file,
// process or network I/O. The CLI half, which lists, reads and renames, is `pharn/floor/grill-round.mjs` (P3).
//
// CONTRACT: `pharn/pharn-contracts/grill-triage.md`, "Rounds (7.8.0)" — cited, not restated (P4). In short: at most
// REPLAN_CAP re-plan rounds; round r's four live files (PLAN.md, GRILL.md, grill-findings.json, grill-triage.json) are
// renamed to their `.r<r>` names when a `replan` verdict starts round r + 1.
//
// WHY (P7): the 7.7.0 triage measurement (.dev/features/loop-grill-triage/TRIAGE-CHECK-MEASUREMENT.md) — all five
// measured full loops escalated, three of them `replan`, and every one stopped at S16 for a person. A round lets the
// loop revise its own plan before it stops.
//
// ONE COPY OF THE ROUND (L35): no counter file. The round is the findings file's own `round`, and the number of
// complete archived rounds on disk; `next` checks that the two agree (L43: agreement between run-written files, never
// that a re-plan fixed anything).
//
// CLOSED SET (L29, L36): ARCHIVE_NAMES is derived from REPLAN_CAP and frozen; every artifact list that must know the
// archives is bound to it by a test. A gap (round 2 archived without round 1) or a partial round (some of a round's
// four files, not all) is refused, never read as a smaller count.
//
// REFUSALS NAME CODES, NEVER VALUES (P2, L62): a defect is a closed code; no file content is ever quoted.
//
// FLOOR (primitive #3): the round arithmetic, the closed archive set, the verdict and round agreement `next` requires.
// ADVISORY: that a re-plan addresses what triage escalated (a model's judgment, re-judged by a fresh grill and triage),
// and that the caller acts on the exit code (/pharn-loop Step 4).

export const SCHEMA = "pharn-grill-round/1";

/** Two re-plan rounds: a full loop plans, grills and triages at most REPLAN_CAP + 1 = 3 times. */
export const REPLAN_CAP = 2;

/** The four files one round leaves, in the order `next` archives them. */
export const LIVE_NAMES = Object.freeze(["PLAN.md", "GRILL.md", "grill-findings.json", "grill-triage.json"]);

/** Round r's archive name for one live file: `GRILL.md` → `GRILL.r1.md`, `grill-findings.json` → `grill-findings.r1.json`. */
export function archiveName(live, round) {
  const dot = live.lastIndexOf(".");
  return `${live.slice(0, dot)}.r${round}${live.slice(dot)}`;
}

/** Round r's four archive names, in LIVE_NAMES order. */
export function roundArchives(round) {
  return LIVE_NAMES.map((n) => archiveName(n, round));
}

/** Every archive name a run can leave: rounds 1..REPLAN_CAP (the last round is never archived). Frozen. */
export const ARCHIVE_NAMES = Object.freeze(Array.from({ length: REPLAN_CAP }, (_, i) => roundArchives(i + 1)).flat());

/** Exit codes. RED is 1 and usage is 2, so the cap takes 5. */
export const EXIT = Object.freeze({ ok: 0, red: 1, usage: 2, cap: 5 });

export const DEFECT_CODES = Object.freeze([
  "gap",
  "partial-round",
  "not-regular",
  "live-missing",
  "findings-invalid",
  "triage-invalid",
  "not-replan",
  "round-mismatch",
  "archive-exists",
  "rename-failed",
  "rename-partial",
]);

export const DEFECT_HINTS = Object.freeze({
  gap: "a round's archives are present while an earlier round's are not; restore the missing round or remove the later one",
  "partial-round": "a round has some of its four archives (PLAN, GRILL, grill-findings, grill-triage) but not all",
  "not-regular": "a live file or an archive is a link, a directory or another non-regular file",
  "live-missing": "next needs all four live files of the round: PLAN.md, GRILL.md, grill-findings.json, grill-triage.json",
  "findings-invalid": "grill-findings.json breaks its contract; run grill-findings.mjs check for the codes",
  "triage-invalid": "grill-triage.json breaks its contract or does not bind to grill-findings.json; run grill-triage.mjs check",
  "not-replan": "next starts a round only after a `replan` verdict (grill-triage.mjs check exit 3)",
  "round-mismatch": "grill-findings.json's round must equal 1 + the number of archived rounds",
  "archive-exists": "a destination archive already exists; next never overwrites one",
  "rename-failed": "a rename failed; the files already moved were moved back, so the round is as it was",
  "rename-partial": "a rename failed and moving back failed too; the names that exist are listed, restore them by hand",
});

/** A defect list as one line of codes. Values never appear. */
export function formatDefects(codes) {
  return codes.join(", ");
}

/** One fixed hint line per distinct code, in DEFECT_CODES order. */
export function defectHints(codes) {
  return DEFECT_CODES.filter((c) => codes.includes(c)).map((c) => `  ${c}: ${DEFECT_HINTS[c]}`);
}

/**
 * The archived rounds a listing shows. `present` is a Set of the ARCHIVE_NAMES that exist as regular files. Returns
 * `{ok: true, archived}` — the count of complete rounds 1..k — or `{ok: false, codes}` on a gap or a partial round.
 * Never vacuous (L34): an empty set is an explicit `archived: 0`.
 */
export function archivedRounds(present) {
  const complete = [];
  const codes = [];
  for (let r = 1; r <= REPLAN_CAP; r++) {
    const have = roundArchives(r).filter((n) => present.has(n)).length;
    if (have === LIVE_NAMES.length) complete.push(r);
    else if (have > 0) codes.push("partial-round");
  }
  if (codes.length > 0) return { ok: false, codes: ["partial-round"] };
  const k = complete.length;
  if (k > 0 && complete[k - 1] !== k) return { ok: false, codes: ["gap"] };
  return { ok: true, archived: k };
}

/**
 * Which round a re-plan reads. `live` is `{triageBinds}`: true when a live grill-triage.json passes its check against
 * the live findings AND those findings carry round `archived + 1` — the state an S16 stop leaves. Then the stopped
 * round's live files are read; otherwise the newest complete archive; otherwise nothing (a first plan).
 */
export function replanFrom(archived, triageBinds) {
  if (triageBinds) return "live";
  if (archived > 0) return `r${archived}`;
  return null;
}

/** `current`'s answer: the round the next grill writes and what a re-plan reads. */
export function currentRound(archived, triageBinds) {
  return { schema: SCHEMA, round: archived + 1, archived, replan_from: replanFrom(archived, triageBinds) };
}

/**
 * `next`'s decision, given the archive count, the live findings round, the triage verdict (`proceed` | `replan` |
 * `spec`) and which round-`round` destinations already exist. Returns `{action: "advance", round, archived}`,
 * `{action: "cap"}` or `{action: "refuse", codes}`. Validity of the two live files is the caller's (it imports the two
 * grill cores and refuses with `findings-invalid` / `triage-invalid` before asking).
 */
export function decideNext({ archived, findingsRound, verdict, destinationsPresent }) {
  if (verdict !== "replan") return { action: "refuse", codes: ["not-replan"] };
  if (findingsRound !== archived + 1) return { action: "refuse", codes: ["round-mismatch"] };
  if (findingsRound > REPLAN_CAP) return { action: "cap" };
  if (destinationsPresent > 0) return { action: "refuse", codes: ["archive-exists"] };
  return { action: "advance", round: findingsRound + 1, archived: findingsRound };
}
