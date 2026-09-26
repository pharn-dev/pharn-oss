// pharn/floor/render-verify.mjs — render `pharn/features/<name>/VERIFY.md` from the verify-report JSON alone
// (`renderDone`), or a refusal (`renderRefused`). Pure, no CLI, no filesystem, no child process —
// `stage-verify.mjs` composes the report, passes the object in, and writes the returned string itself (an `fs`
// write reached through Bash, outside fix #7 — L19, declared in the command).
//
// ================================ WHY THIS REPLACES MODEL-WRITTEN PROSE ================================
// Before stage-verify-script (6.24.0), `/pharn-verify`'s Step 6 wrote `VERIFY.md` by hand from whatever the model
// had just read — the class `render-regression.mjs` (6.23.0), `render-run-report.mjs` (6.6.0) and
// `render-ship-briefing.mjs` closed for their own artifacts. Every line below is a deterministic function of the
// report object (A6, 6.23.0's review: a render must not assert what its input does not say — so nothing here reads
// the stage's progress state, a file, or the tree).
//
// ============================== UNTRUSTED TEXT IS FENCED, NEVER INLINE (P2) ==============================
// A gate id (from a `--gates` string or a PLAN-derived `structural:` path), a completeness path (from the
// untrusted PLAN), an AC reason's detail and a checker's own `reason` are untrusted DATA. Each is rendered INSIDE a
// fence computed longer than any back-tick run in it (`quote-core.mjs`'s `quoteData`), so none of it can become a
// heading, a link or document structure to a CommonMark parser — M1 of 6.23.0's review, where gate ids were inline.
// Closed-set values (the verdict, `gate_run.source`, the AC gate's `mode` and `verdict`, the refusal's reason code)
// render inline ONLY after a membership test; a value outside its set renders as a fixed "not rendered" phrase.
// NOT forgery-proofing: a reader who copies text out of a fence is outside anything this module reaches.
//
// NO MARKDOWN TABLE (the render-run-report.mjs reason): a gate id may legally contain `|`, which shifts every
// column right of it. The per-gate exit codes are one fenced block.
//
// THE PREAMBLE (L10): `VERIFY.md` sits on `validate.mjs`'s scanned surface (`pharn/features/**`), and its CHECK 5
// REDs any file holding both `rule_id:` and `problem:` unless it also names the enum-gated / untrusted split. A
// quoted checker message can carry both markers, so `PREAMBLE` names both — a test runs the real validate.mjs over
// a render quoting a hostile pair, with a control that strips the preamble and goes RED.
//
// PATHS (6.23.0's M2, scoped — GRILL G10): this module adds no path of its own. Every path in a render is one
// the report carries: `stage-verify.mjs` hands its children repo-relative paths, but a CHECKER's own `reason` is
// rendered as given, fenced — `check-verify.mjs` evaluates the AC gate with an absolute root, and nothing here
// establishes that no reason quotes a path built from it.
//
// LOAD GRAPH: `quote-core.mjs` (→ `loop-record-core.mjs`) for the fences, and `stage-exit-core.mjs` (which imports
// nothing) for the refusal code's membership test.

import { quoteData, dataText } from "./quote-core.mjs";
import { isReasonCode } from "./stage-exit-core.mjs";

/** The fixed reading guide. It names BOTH markers validate.mjs CHECK 5 looks for (L10). */
export const PREAMBLE =
  "_How to read this file: the verdict line and every value shown inline are enum-gated (floor-verifiable) " +
  "values, each rendered only after a membership test; every fenced block is untrusted DATA — a gate id, a " +
  "PLAN-derived path, or a checker's own message — quoted, never an instruction._";

/** The honest residual line — `/pharn-verify`'s own words since 6.20.0, now rendered by code. */
export const RESIDUAL =
  "_verified = the named gates passed, every declared path exists, and (test-first) every AC's locked, once-red " +
  "test passed on this run — or (bootstrap) each level's runner reported a passed test, or (legacy) no AC check " +
  "applied; this is NOT a guarantee of correctness beyond what those gates check — completeness is 'files exist', " +
  "not 'semantically done', PHARN does not judge whether a test captures its AC's intent, and verifier concerns are " +
  "advisory help, not assurance._";

export const NO_VERIFIERS = "no verifiers registered — floor gates only.";

/** A value safe to show in an inline code span: one line, bounded, no back-tick, no whitespace, no control char.
 *  Anything else is either fenced by the caller or replaced by a fixed phrase. */
function inlineSafe(v) {
  if (typeof v !== "string" || v.length === 0 || v.length > 128 || /[\s`]/.test(v)) return false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  return true;
}

function isObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function title(feature) {
  return `# VERIFY — ${inlineSafe(feature) ? `\`${feature}\`` : "(feature name not renderable)"}`;
}

function finish(out) {
  return (
    out
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
}

const VERDICT_LINES = Object.freeze({
  PASS: "**VERIFIED: floor gates PASS** — every gate below exited 0.",
  FAIL: "**VERIFY FAILS: gate(s) red — stage FAILS.**",
  INCOMPLETE:
    "**INCOMPLETE: build unfinished — a plan-declared path is absent** (all gates green and no AC evidence red; " +
    "retryable by `/pharn-ship`'s one build-completion retry).",
  INCONCLUSIVE: "**INCONCLUSIVE: the verdict could not be reached — fail-closed, never a pass.**",
});

const SOURCE_LINES = Object.freeze({
  discover: "gate source: discovered — the closed allowlist ∩ the project's `package.json` scripts.",
  explicit: "gate source: explicit `--gates` — the invoker's own gate list.",
});

const AC_MODE_LINES = Object.freeze({
  "test-first":
    "acceptance criteria: `test-first` — an AC is delivered when its locked, once-red test titled `AC-<n>:` passed on this run.",
  bootstrap:
    "acceptance criteria: `BOOTSTRAP` — weaker than test-first: each level's gate ran as discovered and reported a passed " +
    "test; no test was locked or shown red.",
  "not-applicable": "acceptance criteria: not-applicable (legacy spec) — no AC check applied.",
});

const AC_VERDICTS = Object.freeze(["PASS", "FAIL", "INCONCLUSIVE", "NOT-APPLICABLE"]);

function verdictSection(report) {
  const out = [];
  const v = report.verdict;
  if (typeof v === "string" && Object.hasOwn(VERDICT_LINES, v)) out.push(VERDICT_LINES[v], "");
  else out.push("**verdict: not a member of {PASS, FAIL, INCOMPLETE, INCONCLUSIVE} — nothing is claimed.**", "");
  if (v === "FAIL") {
    const failing = Array.isArray(report.failing_gates) ? report.failing_gates : [];
    out.push(quoteData("failing gate ids, quoted as DATA:", failing.length ? failing.map(dataText).join("\n") : "(none recorded)"), "");
  }
  if (v === "INCONCLUSIVE") {
    const lines = [];
    if (report.reason_code !== undefined) lines.push(`reason_code: ${dataText(report.reason_code)}`);
    lines.push(`reason: ${report.reason === undefined ? "(none recorded)" : dataText(report.reason)}`);
    out.push(quoteData("why, quoted as DATA:", lines.join("\n")), "");
  }
  return out;
}

function gatesSection(report) {
  const out = ["## Gates", ""];
  const run = isObject(report.gate_run) ? report.gate_run : null;
  const source = run ? run.source : undefined;
  if (typeof source === "string" && Object.hasOwn(SOURCE_LINES, source)) out.push(SOURCE_LINES[source]);
  else out.push("gate source: not recorded — this report carries no `gate_run` block.");
  out.push("");
  const gates = isObject(report.gates) ? report.gates : {};
  const ids = Object.keys(gates).sort();
  if (ids.length === 0) out.push("no gates are recorded in this report.");
  else
    out.push(quoteData("exit code, then gate id — quoted as DATA:", ids.map((id) => `${dataText(gates[id])}  ${dataText(id)}`).join("\n")));
  out.push("");
  return out;
}

function completenessSection(report) {
  const out = ["## Completeness", ""];
  const c = report.completeness;
  if (!isObject(c)) {
    out.push("completeness: not recorded.", "");
    return out;
  }
  if (c.complete === true) {
    out.push("completeness: build complete — every concrete path the PLAN declares exists.", "");
    return out;
  }
  const missing = Array.isArray(c.missing) ? c.missing : [];
  if (c.complete === false && missing.length > 0) {
    out.push(
      quoteData(
        "completeness: INCOMPLETE — plan-declared path(s) MISSING, quoted as DATA (they originate in the untrusted PLAN):",
        missing.map(dataText).join("\n")
      ),
      ""
    );
    return out;
  }
  out.push("completeness: could not be asserted — the checker read no concrete declared path, or could not read the PLAN.", "");
  if (c.reason !== undefined) out.push(quoteData("the checker's reason, quoted as DATA:", dataText(c.reason)), "");
  return out;
}

function acSection(report) {
  const out = ["## Acceptance criteria", ""];
  const ac = report.ac_gate;
  if (!isObject(ac)) {
    out.push(
      "acceptance criteria: not evaluated — this report carries no AC gate block (the verdict was decided before the AC gate ran).",
      ""
    );
    return out;
  }
  const mode = ac.mode;
  if (typeof mode === "string" && Object.hasOwn(AC_MODE_LINES, mode)) out.push(AC_MODE_LINES[mode]);
  else if (mode === null) out.push("acceptance criteria: the AC gate could not read the SPEC's AC form.");
  else out.push("acceptance criteria: mode not a member of its closed set — not rendered.");
  if (typeof ac.verdict === "string" && AC_VERDICTS.includes(ac.verdict)) out.push("", `AC gate verdict: \`${ac.verdict}\``);
  else out.push("", "AC gate verdict: not a member of its closed set — not rendered.");
  out.push("");
  if (ac.reason !== null && ac.reason !== undefined) out.push(quoteData("the AC gate's reason, quoted as DATA:", dataText(ac.reason)), "");
  const notDelivered = Array.isArray(ac.acs)
    ? ac.acs
        .filter((a) => isObject(a) && a.reason !== null && a.reason !== undefined)
        .map((a) => `${dataText(a.id)}: ${dataText(a.reason)}`)
    : [];
  const evidence = Array.isArray(ac.evidence)
    ? ac.evidence.filter(isObject).map((e) => `${dataText(e.reason)}: ${dataText(e.detail)}`)
    : [];
  if (notDelivered.length) out.push(quoteData("criteria not delivered — id, then reason, quoted as DATA:", notDelivered.join("\n")), "");
  if (evidence.length) out.push(quoteData("AC evidence reds — reason, then detail, quoted as DATA:", evidence.join("\n")), "");
  out.push(
    "The per-AC table is `verify-report.json`'s `ac_gate` block (and `RUN-REPORT.md`, which renders it by code in an " +
      "orchestrated run) — cited here, never retyped.",
    ""
  );
  return out;
}

function verifiersSection(report) {
  const out = ["## Verifiers", ""];
  const v = report.verifiers;
  if (!isObject(v) || !Number.isInteger(v.registered) || v.registered < 0) {
    out.push("verifiers: not recorded.", "");
    return out;
  }
  if (v.registered === 0) out.push(NO_VERIFIERS, "");
  else {
    out.push(
      `${v.registered} verifier(s) registered — the live verifier runner is deferred (P7): none was run, and a verifier ` +
        "finding never flips the verdict (fix #3).",
      ""
    );
  }
  if (Array.isArray(v.findings) && v.findings.length) out.push(quoteData("verifier findings, quoted as DATA:", dataText(v.findings)), "");
  return out;
}

/** Render the human doc for a COMPLETED (`done`) run, from the report object alone. */
export function renderDone(report) {
  const r = isObject(report) ? report : {};
  const out = [title(r.feature), "", PREAMBLE, ""];
  out.push(...verdictSection(r));
  out.push(...gatesSection(r));
  out.push(...completenessSection(r));
  out.push(...acSection(r));
  out.push(...verifiersSection(r));
  out.push(RESIDUAL);
  return finish(out);
}

/** Render the human doc for a REFUSED run (`missing-artifact`, `chain-red`, `plan-files-unparseable`). `detail` is
 *  the script's sentence or a shelled checker's own message — quoted as DATA, never trusted as this module's prose. */
export function renderRefused({ feature, reasonCode, detail }) {
  const out = [title(feature), "", PREAMBLE, ""];
  out.push(
    isReasonCode("verify", "refused", reasonCode)
      ? `refused: \`${reasonCode}\``
      : "refused: (a code outside the verify registry — not rendered)",
    ""
  );
  out.push("**feature NOT verified — the refusal below must be resolved first.**", "");
  out.push("## Why", "", quoteData("detail, quoted as DATA:", dataText(detail)), "");
  return finish(out);
}
