#!/usr/bin/env node
// pharn/floor/check-regress.mjs — the deterministic REGRESSION CORE for the /regress stage.
//
// Floor/eval infrastructure — NOT a Capability (no `role:`; the floor capability count stays 1, exactly
// like floor/check-variance.mjs and pharn/floor/check-structural.mjs, which live in this floor-ignored dir).
// It owns the WHOLE deterministic verdict of /regress so the maximum surface is in tested Node, not in
// the command's Bash. The command (.claude/commands/regress.md) owns only the I/O side-effects (git,
// worktree, running the suite, writing artifacts); this helper does the set math and the comparison.
//
// One cohesive axis — "the regress verdict" — exposed as two subcommands (ARCHITECTURE §2, floor
// primitive #3: enum / path-membership / exit-code comparison):
//
//   scope   (PARTITION, runs BEFORE the suite) — pure path-set membership over PASSED-IN lists. No git,
//           no network, no filesystem. `inside` = the changed files; assert `inside ⊆ declared writes`
//           (a changed path outside the declared `writes:` is a BLOCKING fix#7 finding — the build
//           escaped its scope); derive the OUTSIDE gate inputs (test files + committed eval pairs whose
//           files are all outside the feature).
//
//   verdict (COMPARE, runs AFTER the suite) — over two { "<gate-id>": <exit-code int> } maps captured by
//           the command at the base commit and at HEAD. Per gate-id present in BOTH:
//             base != 0                 → PRE-EXISTING (already red at baseline — EXCLUDED, never blamed
//                                          on the feature, mirroring check-variance's errored-exclusion).
//             base == 0 && head != 0    → REGRESSION (a pass→fail flip OUTSIDE the feature).
//             base == 0 && head == 0    → OK.
//           A model detects regressions UNRELIABLY; this exit-code comparison detects them RELIABLY —
//           that is the entire reason /regress has ZERO LLM-judge in its core.
//
// HONEST SCOPE (P0/P7): the verdict is a deterministic function of the gate exit codes the command
// captures. /regress therefore catches EXACTLY what its suite catches — nothing more. A regression that
// NO deterministic check covers (a broken behavior with no test/rule/eval) is INVISIBLE here. The
// guarantee is "deterministically-detectable breakage outside the feature is caught," NOT "nothing
// broke." Said plainly, not hidden.
//
// TRUST (P2): every operand is produced by deterministic tooling — gate-ids (strings), exit codes
// (ints), and file paths (git diff / path membership): the enum-gated / floor-verifiable class. NO
// free-text (`problem`/`evidence`) is ever read by the verdict. Inputs are JSON.parsed and used ONLY as
// string/int operands and set members — never eval'd, executed, spawned, imported, or sent anywhere.
// No child process, no network. No guaranteed decision rests on a tainted field.
//
// Usage:
//   node pharn/floor/check-regress.mjs scope   --changed <list> --declared <list> [--tests <list>] [--eval-pairs <list>] [--feature <name>]
//     --feature    : the increment's slug. Exempts THIS feature's own pipeline artifacts (PLAN.md,
//                    GRILL.md, …) from the escape set — they are written by their own stages, not by the
//                    build (the L17 floor check). Omit it and nothing is exempt on that axis (fail-closed).
//                    Exemptions are always REPORTED in `escape_exempt`, never silently dropped.
//   node pharn/floor/check-regress.mjs verdict <base-results.json> <head-results.json> [--base <ref>] [--inside <list>]
//     <list>       : comma/whitespace-separated repo-relative paths
//     <eval-pairs> : comma/whitespace-separated "EXPECTED::ACTUAL" tokens (the committed eval pairs)
//     results.json : a flat { "<gate-id>": <exit-code int>, ... } map written by the command
//
// Exit (both subcommands): 0 clean · 1 blocking (scope: escaped path | verdict: >=1 regression) ·
//   2 inconclusive / bad input — FAIL-CLOSED (P5), never a silent pass.

import { readFileSync, existsSync } from "node:fs";

// --- The ESCAPE-EXEMPT sets (the floor check for lessons-learned L17). -----------------------------
// `scope` computes `escaped` over `git diff <base>`, which answers "what CHANGED since base" — but it is
// REPORTED as "what the BUILD wrote". With `base = HEAD` on a working-tree dogfood those two questions
// diverge, and every sibling stage's own artifact lands in `escaped` as a BLOCKING P0 fix#7 finding on
// the correct, designed workflow. That is worse than a missing check: it trains an operator to wave
// through the one finding that must never be waved through. Measured before this fix: 11 recorded runs
// applied the exclusion BY HAND (`grep -rl 'L17' .dev/features/*/REGRESSION.md` → 12 files, one of which
// records the class not firing). L20's rule — a lesson whose only remedy is discipline WILL recur, and
// the SECOND occurrence is the trigger to give it a floor check — was 9 occurrences past due.
//
// Both exemptions are CLOSED ENUMS (ARCHITECTURE §2 primitive #3 — exact membership, no glob, no
// judgment), and neither is silent: every exempted path is reported in `escape_exempt`.
//
// NOT taken: L17's other suggested remedy — deriving "written by the build" from
// `.pharn/writes-scope.json` — is UNIMPLEMENTABLE as stated, which is a discovery, not a preference.
// That file is a single MUTABLE record every stage's Step 0 overwrites, so by the time /pharn-dev-regress
// runs it holds the regress stage's own scope, not the build's (verified live). It would require a
// durable per-build scope record, which does not exist.
//
// The pipeline's own audit artifacts, by EXACT filename. Each is written by ITS OWN stage under that
// stage's own Step-0 writes-scope — never by /pharn-dev-build — so finding one in the diff is evidence the
// PIPELINE ran, not that the build escaped its `## Files`. Exact names, deliberately NOT a `**` glob over
// the feature dir: a stray or unexpected file under the same directory is still REPORTED as an escape.
// DERIVED, not recalled: this list must cover every `pharn/features/<name>/<artifact>` any command declares.
//   grep -hoE 'pharn/features/<name>/[A-Za-z0-9._-]+' .claude/commands/*.md | sort -u
// A test pins enum ⊇ that enumeration, so a newly-added artifact fails a TEST rather than REDding a
// user's pipeline. The first cut of this enum was written from the dev loop's artifacts alone and omitted
// BUILD.md / SPEC.md / findings.json — which made /pharn-regress RED on 100% of PRODUCT runs, because
// /pharn-build writes pharn/features/<name>/BUILD.md under a SEPARATE re-scope and `--declared` is the plan's
// `## Files`, so that artifact is STRUCTURALLY never declared.
const PIPELINE_ARTIFACTS = [
  "SPEC.md",
  "PLAN.md",
  "GRILL.md",
  "BUILD.md",
  "REGRESSION.md",
  "regression-report.json",
  "VERIFY.md",
  "verify-report.json",
  "REVIEW.md",
  "findings.json",
  "SHIP.md",
  "ship-record.json",
  "BRIEFING.md",
  "LOOP.md",
];

// /pharn-review writes one findings.json per lens, NESTED: pharn/features/<name>/lenses/<lens>/findings.json.
// An exact-filename enum structurally cannot express that, so it gets its own narrow shape: exactly one
// path segment for the lens name, and the filename must still be `findings.json`. Anything deeper, or any
// other filename under lenses/, is still an escape.
const LENS_FINDINGS_RE = /^lenses\/[A-Za-z0-9._-]+\/findings\.json$/;

// A `--feature` must be a plain slug. REJECTED fail-closed otherwise (exit 2) rather than reasoned about:
// the previous code claimed a crafted value "yields a prefix that matches no path", but `--feature ..`
// builds `.dev/features/../`, which DOES match and exempted a path outside every feature directory.
// Refusing the value is what makes the claim true instead of nearly true.
// The negative lookahead is LOAD-BEARING, not decoration: `.` is inside the character class, so a bare
// `^[A-Za-z0-9._-]+$` happily admits `.` and `..` — which is the exact traversal this gate exists to
// refuse. Caught by re-running the reproduction against the "fix" instead of trusting the regex.
const FEATURE_SLUG_RE = /^(?!\.\.?$)[A-Za-z0-9._-]+$/;

// The four hook-protected trusted docs. `protect-trusted-paths.cjs` DENIES every Write|Edit|MultiEdit to
// them (exit 2), so the build cannot have produced the change — the denial is the disproof, not an
// assumption. BOUNDED, and stated: the hook gates the Write-tool surface only, so a Bash-tool write
// bypasses both it and this exemption (the L19 escape). The claim is "the build could not have written
// this WITH THE WRITE TOOL", never "no process changed it".
const TRUSTED_DOCS = ["pharn/CONSTITUTION.md", "pharn/ARCHITECTURE.md", "THREAT-MODEL.md", "LIMITS.md"];

// THE NARROWING THIS EXEMPTION INTRODUCES — the honest cost, stated because it is not obvious (P0/P7).
// A build that rewrites its OWN `pharn/features/<name>/PLAN.md` `## Files` to retroactively authorize a path it
// already wrote is NO LONGER DETECTED here: the plan edit is exempt, and the added path then reads as
// declared. Before the exemption, the plan edit itself was the tell and `scope` exited 1. Nothing else
// catches it — check-plan-spec-agree.mjs reads only `spec_content_hash` from the PLAN, and a `## Files`
// edit does not move that. This matters most for a Bash-tool write, which bypasses enforce-writes-scope.cjs
// entirely (L19) and leaves this check as the last detector. It is an ADVISORY GAP, not a guarantee.
// FOLLOW-UP (the deterministic remedy, deliberately not smuggled into this increment): have `scope` compare
// `git show <base>:pharn/features/<name>/PLAN.md`'s `## Files` against HEAD's and RED on any difference —
// primitive #3, and it restores the tell without re-opening the false positives this exemption removes.
//
// Is `file` one of THIS feature's own pipeline artifacts? Requires an explicit `--feature <name>`: with no
// feature named, nothing is exempt on this axis (fail-closed — the exemption is opt-in, never inferred).
// The slug is SHAPE-GATED before use (FEATURE_SLUG_RE), so a crafted value cannot build a traversing
// prefix; matching is then literal `startsWith` + exact membership, never a glob.
function isPipelineArtifact(file, feature) {
  if (!feature || !FEATURE_SLUG_RE.test(feature)) return false;
  for (const root of [`.dev/features/${feature}/`, `pharn/features/${feature}/`]) {
    if (!file.startsWith(root)) continue;
    const rest = file.slice(root.length);
    if (PIPELINE_ARTIFACTS.includes(rest) || LENS_FINDINGS_RE.test(rest)) return true;
  }
  return false;
}

// --- emit one JSON document to stdout, then exit. The command captures this verbatim. ---
function emit(obj, code) {
  console.log(JSON.stringify(obj, null, 2));
  process.exit(code);
}

// --- comma/newline list -> normalized, de-duplicated path array. -----------------------------------
// Split on COMMA or NEWLINE only, never on spaces. A space is a legal filename character and
// `git diff --name-only` does NOT quote it, so a whitespace split turns ONE real path into TWO tokens.
// That is not cosmetic: composed with the escape-exempt sets it LAUNDERS an escape — a single undeclared
// file named `THREAT-MODEL.md LIMITS.md` split into two tokens that are each separately exempt, and
// `scope` exited 0 where it had exited 1 before the exemption existed. `normPath` already trims each
// token, so surrounding spaces around a comma are still tolerated (`a.ts, b.ts`).
function parseList(s) {
  if (s === undefined || s === null) return [];
  const out = [];
  for (const tok of String(s).split(/[,\n\r]+/)) {
    const p = normPath(tok);
    if (p && !out.includes(p)) out.push(p);
  }
  return out;
}

// --- strip a leading "./" and trailing slashes; trim. Repo-relative, forward-slash. ---
function normPath(p) {
  return String(p).trim().replace(/^\.\//, "").replace(/\/+$/, "");
}

// --- tiny stdlib glob matcher (same dialect as the writes-scope hooks): `**` spans segments
//     (incl. `/`), `*` matches within one segment, everything else is a LITERAL char — a path with no
//     glob chars therefore reduces to exact equality. Matched by deterministic O(glob·file) dynamic
//     programming, NOT by compiling the pattern into a `new RegExp(...)`: the pattern is an untrusted
//     CLI operand, so it is never handed to the regex engine — no regex-injection / ReDoS sink (P2/P5).
//     `dp[j]` = "the remaining glob tokens match file[j..]"; the table is filled token-by-token from
//     the end, so total work is bounded by tokens × (file length + 1). ---
function globToTokens(glob) {
  const tokens = [];
  for (let i = 0; i < glob.length; i++) {
    if (glob[i] === "*") {
      if (glob[i + 1] === "*") {
        tokens.push({ t: "globstar" }); // matches any run, including "/"
        i++;
      } else {
        tokens.push({ t: "star" }); // matches any run WITHIN one segment (no "/")
      }
    } else {
      tokens.push({ t: "lit", c: glob[i] }); // exact char — would-be regex metachars are inert
    }
  }
  return tokens;
}

function globMatch(glob, file) {
  const tokens = globToTokens(glob);
  const m = file.length;
  // next[j] — can the tokens after the current one match file[j..m) ? Seeded with the empty suffix:
  // only an exhausted file (j === m) matches zero remaining tokens.
  let next = new Array(m + 1).fill(false);
  next[m] = true;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const cur = new Array(m + 1).fill(false);
    const tok = tokens[i];
    for (let j = m; j >= 0; j--) {
      if (tok.t === "lit") {
        cur[j] = j < m && file[j] === tok.c && next[j + 1];
      } else if (tok.t === "star") {
        cur[j] = next[j] || (j < m && file[j] !== "/" && cur[j + 1]);
      } else {
        cur[j] = next[j] || (j < m && cur[j + 1]); // globstar
      }
    }
    next = cur;
  }
  return next[0];
}

function matchesAny(file, patterns) {
  return patterns.some((pat) => globMatch(pat, file));
}

// --- read a flag value (`--flag value`) from an argv slice; undefined if absent. ---
function flag(args, name) {
  const i = args.indexOf(name);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined;
}

// ---------------------------------------------------------------------------------------------------
// scope — partition the changed files into inside/outside; assert inside ⊆ declared (fix #7).
// ---------------------------------------------------------------------------------------------------
function runScope(args) {
  const changedRaw = flag(args, "--changed");
  const declaredRaw = flag(args, "--declared");
  if (changedRaw === undefined || declaredRaw === undefined) {
    emit(
      {
        verdict: "inconclusive",
        reason: "scope requires --changed <list> and --declared <list>",
      },
      2
    );
  }

  const inside = parseList(changedRaw); // the changed files (from `git diff` — the command's job)
  const declared = parseList(declaredRaw); // the plan's `## Files` declared writes (patterns allowed)
  const tests = parseList(flag(args, "--tests")); // the FULL test-file universe (the command's job)

  // --tests is a LIST of REAL file paths — the command expands any globs (e.g. via `git ls-files`)
  // BEFORE calling. The partition below is exact-set membership, so a raw glob string would never
  // match an inside path and would silently bypass the inside/outside coverage. Reject glob
  // metacharacters up front (fail-closed, P5) — never a silent pass.
  const globbyTest = tests.find((t) => t.includes("*"));
  if (globbyTest !== undefined) {
    emit(
      {
        verdict: "inconclusive",
        reason: `--tests must be an expanded list of real file paths, not a glob: '${globbyTest}' (expand it first, e.g. via \`git ls-files\`)`,
      },
      2
    );
  }
  // --eval-pairs tokens are "EXPECTED::ACTUAL". A token missing the `::` separator is malformed input:
  // fail closed (P5, exit 2) rather than silently dropping it from the outside-gate set — a dropped
  // pair would silently shrink coverage, the exact silent pass this core forbids.
  const evalPairTokens = (flag(args, "--eval-pairs") || "")
    .split(/[,\n\r]+/) // comma/newline only — a space is a legal filename char (see parseList)
    .map((t) => t.trim())
    .filter(Boolean);
  const malformedPair = evalPairTokens.find((tok) => !tok.includes("::"));
  if (malformedPair !== undefined) {
    emit(
      {
        verdict: "inconclusive",
        reason: `--eval-pairs token '${malformedPair}' is missing the 'EXPECTED::ACTUAL' separator '::' — fail-closed, never silently dropped`,
      },
      2
    );
  }
  const evalPairs = evalPairTokens
    .map((tok) => {
      const cut = tok.indexOf("::");
      return { expected: normPath(tok.slice(0, cut)), actual: normPath(tok.slice(cut + 2)) };
    })
    .filter((p) => p.expected && p.actual);

  // fix #7 cross-check: every changed file must be covered by a declared `writes:` pattern. A changed
  // path matching none means the build wrote OUTSIDE its declared `## Files` — a blocking escape.
  //
  // ...EXCEPT the two closed exempt sets above (the L17 floor check): this feature's own pipeline
  // artifacts, and the hook-protected trusted docs. Neither can be a build escape, and reporting them as
  // one is a false BLOCKING finding on the correct workflow. The exemption is SUBTRACTIVE and REPORTED —
  // `escape_exempt` is always emitted, so a suppressed path is visible, never silently dropped.
  const feature = flag(args, "--feature");
  if (feature !== undefined && !FEATURE_SLUG_RE.test(feature)) {
    emit(
      {
        verdict: "inconclusive",
        reason: `--feature must be a plain slug matching ${FEATURE_SLUG_RE} (no '/', no '..', no glob): got ${JSON.stringify(feature)}`,
      },
      2
    );
  }
  const undeclared = inside.filter((f) => !matchesAny(f, declared));
  const escapeExempt = undeclared.filter((f) => TRUSTED_DOCS.includes(f) || isPipelineArtifact(f, feature));
  const exemptSet = new Set(escapeExempt);
  const escaped = undeclared.filter((f) => !exemptSet.has(f));

  // Derive the OUTSIDE gate inputs by path membership (NOT classification, P5): a test/eval is "inside"
  // iff its file is in the changed set; everything else is outside and must not regress.
  const insideSet = new Set(inside);
  const outsideTests = tests.filter((t) => !insideSet.has(t));
  const outsideEvalPairs = evalPairs.filter((p) => !insideSet.has(p.expected) && !insideSet.has(p.actual));

  if (escaped.length) {
    // Dogfood the finding object (fix #1): type/rule_id/severity/file are enum-gated (this helper's own
    // deterministic assertions → trusted); `problem` is free-text DATA. rule_id cites P0 — the
    // writes-scope is a floor guarantee (fix #7; the enforce-writes-scope hook cites P0 the same way).
    const findings = escaped.map((f) => ({
      type: "FINDING",
      rule_id: "P0",
      severity: "blocking",
      file: f,
      problem: `changed file '${f}' is outside the declared writes-scope (fix #7) — the build escaped its plan's \`## Files\``,
    }));
    emit(
      {
        inside,
        declared,
        escaped,
        escape_exempt: escapeExempt,
        findings,
        outside_tests: outsideTests,
        outside_eval_pairs: outsideEvalPairs,
      },
      1
    );
  }

  emit(
    {
      inside,
      declared,
      escaped: [],
      escape_exempt: escapeExempt,
      outside_tests: outsideTests,
      outside_eval_pairs: outsideEvalPairs,
    },
    0
  );
}

// ---------------------------------------------------------------------------------------------------
// verdict — compare two captured { gate-id: exit-code } maps; flag pass→fail flips outside the feature.
// ---------------------------------------------------------------------------------------------------
function readResultsMap(path, label) {
  if (!path) return { ok: false, reason: `${label} path not provided` };
  if (!existsSync(path)) return { ok: false, reason: `${label} not found: ${path}` };
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    return { ok: false, reason: `${label} is not valid JSON (${path}): ${e.message}` };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: `${label} must be a { "<gate-id>": <int> } object (${path})` };
  }
  const keys = Object.keys(parsed);
  if (keys.length === 0) return { ok: false, reason: `${label} is empty — no gates captured (${path})` };
  for (const k of keys) {
    if (!Number.isInteger(parsed[k])) {
      return { ok: false, reason: `${label} gate "${k}" is not an integer exit code: ${JSON.stringify(parsed[k])} (${path})` };
    }
  }
  return { ok: true, value: parsed };
}

function runVerdict(positional, args) {
  const basePath = positional[0];
  const headPath = positional[1];
  const baseRef = flag(args, "--base");
  const inside = parseList(flag(args, "--inside"));

  const base = readResultsMap(basePath, "base-results.json");
  const head = readResultsMap(headPath, "head-results.json");
  if (!base.ok || !head.ok) {
    emit({ verdict: "inconclusive", reason: [base.ok ? null : base.reason, head.ok ? null : head.reason].filter(Boolean).join("; ") }, 2);
  }

  // Fail-closed (P5): the command captures the SAME scoped gates at base and head by construction. If
  // the key sets differ, a gate ran on one side only — we cannot classify it and must NOT silently
  // pass (an uncompared gate could hide a regression). Inconclusive, naming the difference.
  const baseKeys = Object.keys(base.value);
  const headKeys = Object.keys(head.value);
  // `Object.hasOwn`, never `k in obj` (lessons-learned L15): `in` walks the prototype chain, so a gate
  // id colliding with an Object.prototype member (`toString`, `valueOf`, `constructor`) reads as PRESENT
  // in a map that does not have it. That made a genuine gate-set mismatch look shared, and the verdict
  // came back `no-regressions` at exit 0 where the contract requires inconclusive/exit 2 — a silent pass
  // in the checker whose whole promise is that there is never one.
  const onlyBase = baseKeys.filter((k) => !Object.hasOwn(head.value, k));
  const onlyHead = headKeys.filter((k) => !Object.hasOwn(base.value, k));
  if (onlyBase.length || onlyHead.length) {
    emit(
      {
        verdict: "inconclusive",
        reason: `gate set mismatch between base and head — only in base: [${onlyBase.join(", ")}], only in head: [${onlyHead.join(", ")}]`,
      },
      2
    );
  }

  const outsideGates = {};
  const regressions = [];
  const preExisting = [];
  for (const id of baseKeys.sort()) {
    const b = base.value[id];
    const h = head.value[id];
    outsideGates[id] = { base: b, head: h };
    if (b !== 0)
      preExisting.push(id); // already red at baseline — not the feature's fault
    else if (h !== 0) regressions.push(id); // GREEN → RED outside the feature = regression
    // else b === 0 && h === 0 → OK
  }

  const verdict = regressions.length ? "regressions" : "no-regressions";
  emit(
    {
      base: baseRef !== undefined ? baseRef : null,
      inside,
      outside_gates: outsideGates,
      regressions,
      pre_existing: preExisting,
      verdict,
    },
    regressions.length ? 1 : 0
  );
}

function main() {
  const sub = process.argv[2];
  const rest = process.argv.slice(3);
  // Leading positionals = args before the first `--flag` (so a flag VALUE like `--base abc123` never
  // leaks in as a positional). The command always passes the two results files first, then flags.
  const positional = [];
  for (const a of rest) {
    if (a.startsWith("--")) break;
    positional.push(a);
  }

  if (sub === "scope") return runScope(rest);
  if (sub === "verdict") return runVerdict(positional, rest);

  emit(
    {
      verdict: "inconclusive",
      reason:
        "usage: check-regress.mjs scope --changed <list> --declared <list> [--tests <list>] [--eval-pairs <list>] | verdict <base-results.json> <head-results.json> [--base <ref>] [--inside <list>]",
    },
    2
  );
}

main();
