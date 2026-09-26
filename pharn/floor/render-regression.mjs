// pharn/floor/render-regression.mjs — render `pharn/features/<name>/REGRESSION.md` from ALREADY-PARSED
// data: the `check-regress.mjs verdict` report, the `check-regress.mjs scope` output, and the stage's own
// progress record. Pure, no CLI, no filesystem, no child process — `stage-regress.mjs` reads every input
// off disk and passes plain objects in, then writes the returned string itself (fs.writeFileSync, L19: a
// Bash write outside fix #7, declared as such).
//
// ================================ WHY THIS REPLACES MODEL-WRITTEN PROSE ================================
// Before `stage-regress-script` (6.23.0), `/pharn-regress`'s command prose wrote `REGRESSION.md` by hand
// from whatever it had just read — the same class of defect `render-run-report.mjs` (6.6.0) and
// `render-ship-briefing.mjs` closed for their own artifacts: a rendered report is either DERIVED BY CODE
// from committed sources, or it is model-typed prose a reader cannot audit against anything. Every line
// below is a deterministic function of its three inputs.
//
// ============================== NO ABSOLUTE PATH ANYWHERE (GRILL G10) ==============================
// `/pharn-loop` commits `REGRESSION.md`, and a shelled child's refusal text can quote whatever path it was
// handed. `stage-regress.mjs` therefore hands every child REPO-RELATIVE paths only, and this renderer
// never resolves, joins-from-cwd, or otherwise widens a path it is given — it only quotes what it
// receives. A render test asserts no rendered outcome matches an absolute-path pattern (imported by the
// TEST only, so this module's own load graph never grows for it — G10/G6's shared reasoning).
//
// ============================== UNTRUSTED TEXT IS FENCED, NEVER INLINE (P2) ==============================
// A gate id (from a `--gates` string), a child's stdout/stderr line, and a scope-escape `problem` are all
// untrusted free text that this repo's finding-shape contract requires to be rendered as DATA, never as an
// instruction. Every MULTI-LINE or attacker-shaped value goes through `quoteData`/`dataText`
// (`quote-core.mjs` — GRILL G6: this module does NOT import `render-run-report.mjs`, so it never pulls the
// cost-ledger graph into `/pharn-regress`'s load path). A gate id embedded INLINE is always preceded by
// fixed prose text on the same line, so it can never sit at column 0 and be read as an ATX heading by a
// CommonMark parser — the same discipline `render-run-report.mjs` documents for its own identity strings.
//
// NO MARKDOWN TABLE ANYWHERE, for the same reason `render-run-report.mjs` states for its own tables: a
// gate id is shape-gated only to "clean token" (control-char-free, bounded) — it may legally contain a `|`
// — and one pipe silently shifts every column right of it in a table. The per-gate comparison is therefore
// rendered as one prose line per gate, not a table.
//
// TRUST (P2): every value this module reads from its inputs is either enum-gated by its producer
// (`verdict`, `reason_code`, exit-code integers) or quoted as DATA before being embedded. Nothing here is
// executed, evaluated, or treated as an instruction.

import { quoteData, dataText } from "./quote-core.mjs";

/** A gate id, git path, or command string rendered INLINE — always with fixed text before it on the same
 *  line, so a leading `#`/`>`/`-` in the value cannot become document structure. `String()` first: a gate
 *  id is always a string by construction, but this keeps the function total. */
function inline(v) {
  return String(v);
}

function section(title, lines) {
  return [`## ${title}`, "", ...lines, ""];
}

function verdictLine(verdict, regressions) {
  if (verdict === "no-regressions") {
    return "**verdict: NO REGRESSIONS** — no deterministically-detectable breakage outside the feature.";
  }
  if (verdict === "regressions") {
    const n = Array.isArray(regressions) ? regressions.length : 0;
    return `**verdict: ${n} REGRESSION(S) OUTSIDE THE FEATURE — STAGE FAILS.**`;
  }
  return "**verdict: INCONCLUSIVE** — the comparison could not be completed; see the quoted reason below.";
}

/** Render the human doc for a COMPLETED (`done`) run. `report` is `check-regress.mjs verdict`'s parsed
 *  stdout; `scope` is `check-regress.mjs scope`'s parsed stdout; `progress` is the stage's final in-memory
 *  progress state (never re-read from a deleted file — `stage-regress.mjs` holds it before removing the
 *  record). */
export function renderDone({ feature, base, report, scope, progress }) {
  const out = [];
  out.push(`# REGRESSION — ${feature}`, "");
  out.push(`base: \`${inline(base)}\``, "");

  // A6 (GATE 2 review) — rendered ABOVE the verdict line, not six-plus lines below it: this is the ONLY
  // signal of a failed base-commit install (no machine consumer reads it — the recorded, deliberately
  // unclosed `regress-failed-install-false-green` bound), so a reader must see it BEFORE the headline
  // "NO REGRESSIONS", never after. The "reads red" clause is CONDITIONED on the report's own
  // `pre_existing`, never an unconditional "every base gate" — an install failure does not guarantee
  // every base gate failed (it can fail fast before any gate even attempts to run, or a gate may not
  // depend on the failed install step at all).
  const installFailed =
    progress.install.kind === "cmd" && progress.installResult && progress.installResult.ran && progress.installResult.exit !== 0;
  if (installFailed) {
    const preExisting = Array.isArray(report.pre_existing) ? report.pre_existing : [];
    out.push(
      `**THE BASE-COMMIT INSTALL FAILED** (exit ${progress.installResult.exit}${progress.installResult.timedOut ? ", timed out" : ""}) — ` +
        (preExisting.length
          ? `base gates MAY read red as a result; the ${preExisting.length} gate(s) classified \`pre_existing\` below ` +
            "(rather than blamed on the feature) could include ones this install failure caused to fail, not this feature's own change."
          : "base gates MAY read red as a result and be classified `pre_existing` below rather than blamed on the feature — " +
            "none were, this run.") +
        " This line is the ONLY signal of that failure; no machine consumer reads it (the recorded, deliberately unclosed " +
        "`regress-failed-install-false-green` bound).",
      ""
    );
  }

  out.push(verdictLine(report.verdict, report.regressions), "");

  if (installFailed) {
    // Already rendered above, before the verdict — no redundant install-info line here.
  } else if (progress.install.kind === "none") {
    out.push(`install: none${progress.install.reason ? ` (${inline(progress.install.reason)})` : ""}`, "");
  } else {
    out.push(
      `install${progress.install.unmeasured ? " (UNMEASURED — no run of this stage has exercised this command)" : ""}:`,
      "",
      quoteData("", dataText(progress.install.cmd)),
      ""
    );
  }

  out.push(
    ...section("Scope", [
      `inside (${scope.inside.length}):`,
      "",
      scope.inside.length ? quoteData("", scope.inside.join("\n")) : "_(none)_",
      "",
      `declared (${scope.declared.length}):`,
      "",
      scope.declared.length ? quoteData("", scope.declared.join("\n")) : "_(none)_",
      ...(scope.escape_exempt && scope.escape_exempt.length
        ? [
            "",
            `escape-exempt (${scope.escape_exempt.length}) — this feature's own pipeline artifacts or a hook-protected trusted doc, never a build escape:`,
            "",
            quoteData("", scope.escape_exempt.join("\n")),
          ]
        : []),
    ])
  );

  const gateIds = Object.keys(report.outside_gates ?? {}).sort();
  const gateLines = gateIds.map((id) => {
    const g = report.outside_gates[id];
    const cls = g.base !== 0 ? "pre-existing (already red at base)" : g.head !== 0 ? "REGRESSION" : "ok";
    return `gate: base exit ${dataText(g.base)} -> head exit ${dataText(g.head)} — ${cls} — id (quoted, untrusted): ${dataText(id)}`;
  });
  out.push(
    ...section("Gates", [
      gateLines.length ? gateLines.join("\n") : "_(no gates ran)_",
      ...(progress.e2eExcluded && progress.e2eExcluded.length
        ? ["", `not run at regress (verify-only): ${progress.e2eExcluded.map(dataText).join(", ")}`]
        : []),
      ...(progress.styleSkipped ? ["", "style gates were SKIPPED (config-touch rule: no shared style config changed in scope)."] : []),
    ])
  );

  out.push(
    ...section("Pre-existing and regressions", [
      `pre_existing (${(report.pre_existing ?? []).length}): ${(report.pre_existing ?? []).length ? report.pre_existing.map(dataText).join(", ") : "(none)"}`,
      `regressions (${(report.regressions ?? []).length}): ${(report.regressions ?? []).length ? report.regressions.map(dataText).join(", ") : "(none)"}`,
    ])
  );

  if (report.verdict === "inconclusive" && report.reason) {
    out.push(...section("Why inconclusive", [quoteData("reason, quoted as DATA:", dataText(report.reason))]));
  }

  if (progress.cleanupResult && progress.cleanupResult.ok === false) {
    out.push(
      ...section("Cleanup", [
        "removing the base worktree FAILED after the verdict was already written — the verdict above is unaffected; " +
          "the next fresh start removes the leftover worktree.",
        "",
        quoteData("error, quoted as DATA:", dataText(progress.cleanupResult.error ?? "(no detail)")),
      ])
    );
  }

  out.push(
    "_/pharn-regress catches exactly what the project's own deterministic suite catches, nothing more — but " +
      "deterministically. This is not a claim that nothing broke._"
  );
  return (
    out
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
}

/** Render the human doc for a REFUSED run (`chain-red`, `missing-artifact`, `plan-files-unparseable`,
 *  `scope-escaped`). `detail` is an already-composed sentence (or fenced-ready text) the CLI assembled from
 *  a shelled checker's own message or a git/plan-scan finding; it is quoted as untrusted DATA here rather
 *  than trusted as this renderer's own prose. */
export function renderRefused({ feature, reasonCode, detail }) {
  const out = [];
  out.push(`# REGRESSION — ${feature}`, "");
  out.push(`refused: \`${inline(reasonCode)}\``, "");
  out.push("**regression NOT measured — the refusal below must be resolved first.**", "");
  out.push(...section("Why", [quoteData("detail, quoted as DATA:", dataText(detail))]));
  return (
    out
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
}
