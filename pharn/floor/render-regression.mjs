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
import { ALLOWLIST, EXCLUSION_DECLARED_IN } from "./gate-run-core.mjs";
import { headInstallLine } from "./install-drift-core.mjs";

/** A gate id, git path, or command string rendered INLINE — always with fixed text before it on the same
 *  line, so a leading `#`/`>`/`-` in the value cannot become document structure. `String()` first: a gate
 *  id is always a string by construction, but this keeps the function total. */
function inline(v) {
  return String(v);
}

/** A gate id from the report's entry block (6.49.0), JSON-escaped so a newline or a backtick can never leave its inline
 *  span (the ids are allowlisted by the derived stamp's validator, and the render does not rely on that). TOTAL (L62). */
function idText(v) {
  try {
    return typeof v === "string" ? JSON.stringify(v).slice(1, -1).replace(/`/g, "\\u0060") : "?";
  } catch {
    return "?";
  }
}

function section(title, lines) {
  return [`## ${title}`, "", ...lines, ""];
}

/** The pre-run snapshot's lines (6.37.0, regress-pre-run-snapshot) — `block` is scope.json's `pre_run_snapshot`
 *  (`{status, unchanged}`), or absent. Nothing for an absent block or for `no-delivery-run` (no open run — a standalone
 *  regress, whose render stays byte-identical); otherwise the status, and the subtracted paths quoted as DATA. The status is a closed
 *  enum (pre-run-snapshot-core.mjs PRE_RUN_STATUSES); it is still rendered through `dataText`, inline after fixed text. */
export function preRunLines(block) {
  if (block === null || typeof block !== "object" || block.status === "no-delivery-run") return [];
  const unchanged = Array.isArray(block.unchanged) ? block.unchanged : [];
  if (block.status !== "applied") {
    return [`pre-run snapshot: not applied (${dataText(block.status)}) — every undeclared changed path is counted.`];
  }
  if (unchanged.length === 0) return ["pre-run snapshot: applied — no undeclared path was already changed when this run began."];
  return [
    `already changed when this run began (${unchanged.length}) — the run's pre-run snapshot recorded these with exactly the ` +
      "bytes they hold now, so they are reported, NOT counted as this build's escape (a re-run records an earlier run's " +
      "escape the same way; pre-run-snapshot-core.mjs states the bounds):",
    "",
    quoteData("", unchanged.join("\n")),
  ];
}

/** 6.42.0 (loop-entry-preflight, review R1) — the run's ENTRY GATES' own writes, from scope.json's `entry_gate_changes`
 *  (`{status, unchanged}`), or nothing when the block is absent (no entry record — every earlier render is unchanged).
 *  The status is a closed enum, rendered through `dataText`; the subtracted paths are quoted as DATA. */
export function entryGateLines(block) {
  if (block === null || typeof block !== "object") return [];
  const unchanged = Array.isArray(block.unchanged) ? block.unchanged : [];
  if (block.status !== "applied") {
    return [`entry gates' changes: not applied (${dataText(block.status)}) — every undeclared changed path is counted.`];
  }
  if (unchanged.length === 0) return ["entry gates' changes: applied — no undeclared path is one the run's entry gates changed."];
  return [
    `changed by this run's entry gates (${unchanged.length}) — a gate of /pharn-verify's set, run on the starting tree ` +
      "before the build, rewrote these, and they still hold the bytes it left, so they are reported, NOT counted as this " +
      "build's escape (entry-gates.mjs states the bounds):",
    "",
    quoteData("", unchanged.join("\n")),
  ];
}

/** 6.36.0 — the discovered gates the project's declaration EXCLUDED, from the report's `gate_run.head.excluded` (copied
 *  from the HEAD stamp; the base side runs the head's set), DIRECTLY under the verdict line: both sides compared only
 *  the gates that ran (P0). An id renders inline only after an ALLOWLIST membership test, the source only as the one
 *  sanctioned value. No block → no line, so a report without one renders exactly as before 6.36.0. */
function exclusionLines(report) {
  const run = report.gate_run && typeof report.gate_run === "object" ? report.gate_run.head : null;
  const x = run && typeof run === "object" && run.excluded && typeof run.excluded === "object" ? run.excluded : null;
  if (x === null || Array.isArray(x)) return [];
  const ids = Array.isArray(x.ids) ? x.ids : [];
  const known = ids.filter((id) => typeof id === "string" && ALLOWLIST.includes(id));
  const where =
    x.declared_in === EXCLUSION_DECLARED_IN
      ? "the project's `pharn.config.json` `gates.exclude`"
      : "a declaration whose source is not one this renderer recognizes";
  const unknown = ids.length - known.length;
  return [
    `**${ids.length} discovered gate(s) EXCLUDED and NOT RUN on either side** by ${where}: ` +
      (known.length ? known.map((id) => `\`${id}\``).join(", ") : "(no allowlisted id to show)") +
      (unknown > 0 ? ` (+${unknown} id(s) outside the allowlist, not rendered)` : "") +
      " — a regression in an excluded gate cannot be seen here.",
    "",
  ];
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
/** regress-base-integrity: how the base was chosen, in words — keyed by a closed BASE_SOURCES member (never free text). */
const BASE_SOURCE_TEXT = Object.freeze({
  explicit: "named with --base",
  "dirty-head": "HEAD, because the working tree was dirty (no --base)",
  "merge-base": "the merge-base with origin/main (no --base, clean tree)",
});

/** The base line, plus the dirty-head warning: under that rule anything already COMMITTED on the branch is inside the
 *  base, so its breakage reads `pre_existing` (audit P1-B). Nothing renders for a value outside the closed set. */
function baseLines(base, baseSource) {
  const how = Object.hasOwn(BASE_SOURCE_TEXT, baseSource) ? ` — chosen by: ${BASE_SOURCE_TEXT[baseSource]}` : "";
  const lines = [`base: \`${inline(base)}\`${how}`, ""];
  if (baseSource === "dirty-head") {
    lines.push(
      "**The base is HEAD (dirty-tree rule):** anything already committed on this branch sits INSIDE the base, so a " +
        "regression it caused reads `pre_existing` here. If any of the build is committed, re-run with `--base <the commit " +
        "the build started from>` (as /pharn-ship and /pharn-loop do).",
      ""
    );
  }
  return lines;
}

export function renderDone({ feature, base, baseSource = null, report, scope, progress }) {
  const out = [];
  out.push(`# REGRESSION — ${feature}`, "");
  out.push(...baseLines(base, baseSource));

  // A6 (GATE 2 review) — rendered ABOVE the verdict line, not six-plus lines below it, so a reader sees a failed
  // base-commit install BEFORE the headline "NO REGRESSIONS", never after. Since regress-base-integrity a gate red at
  // both base and head over such an install is refused (`base-install-unreliable`) instead of reported, so this line
  // now only ever accompanies a report with no such gate, or a verdict that already stops. The "reads red" clause is CONDITIONED on the report's own
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
        " A gate red at BOTH base and head under this install no longer reads as no regressions: the stage refuses " +
        "`base-install-unreliable` instead (regress-base-integrity; the former `regress-failed-install-false-green` " +
        "bound is closed for an install that exits non-zero or times out) — so a report that renders this line has " +
        "either no such gate or a verdict that already stops.",
      ""
    );
  }

  out.push(verdictLine(report.verdict, report.regressions), "");
  out.push(...exclusionLines(report));
  // regress-base-integrity: base runs the runner killed at --timeout-ms (`base_timed_out`, check-regress.mjs). An id is
  // quoted through `dataText` after fixed prose, like every gate id here.
  if (Array.isArray(report.base_timed_out) && report.base_timed_out.length) {
    out.push(
      `**${report.base_timed_out.length} base gate run(s) TIMED OUT** (${report.base_timed_out.map(dataText).join(", ")}) — a ` +
        "killed base run is not a base result: wherever the table below files it, a red head on that gate makes the verdict " +
        "inconclusive, and a green head means nothing was masked.",
      ""
    );
  }

  // BASE-evidence reuse (6.33.0): ONE line, from the report's own `base_evidence` block. Every value in it is this
  // floor's own — a boolean, a closed-enum member, a hex digest — never untrusted text.
  const be = progress.baseEvidence;
  if (be) {
    if (be.reused) {
      out.push(
        `BASE evidence: REUSED — the run marker, the reuse record, the stamp and its logs agree with this invocation's BASE requirement (sha256 \`${inline(be.requirement_sha256)}\`; that an earlier /pharn-regress of this run produced them is advisory), so this invocation created no base worktree, ran no install and ran no base gate; \`gate_run.base.stamp_sha256\` in regression-report.json names the stamp.`,
        ""
      );
    } else if (be.source === "entry" && be.entry) {
      // 6.49.0 — taken from this run's entry gates. Every value is the floor's own: digests, a commit, enum ids.
      out.push(
        `BASE evidence: taken from this run's ENTRY gates — the run marker, the entry offer, the pre-run snapshot, the entry stamp (sha256 \`${inline(be.entry.entry_stamp_sha256)}\`) and its logs agree with this invocation's BASE slots at \`${inline(be.entry.base)}\`, so this invocation created no base worktree, ran no install and spawned no base gate (retained evidence not reused: \`${inline(be.miss)}\`). The base stamp marks every slot \`reused\` from the entry run (${be.entry.reused_ids.map((x) => `\`${idText(x)}\``).join(", ")}${be.entry.no_files_ids.length ? `; nothing to run: ${be.entry.no_files_ids.map((x) => `\`${idText(x)}\``).join(", ")}` : ""}). That they equal what a fresh BASE worktree would give is NOT claimed: the entry gates ran in this tree's real start environment.`,
        ""
      );
    } else {
      out.push(
        `BASE evidence: produced by this invocation (not reused: \`${inline(be.miss)}\`${be.entry && be.entry.miss ? `; entry evidence not used: \`${inline(be.entry.miss)}\`` : ""}); ` +
          (be.recorded
            ? "recorded for reuse by a later /pharn-regress of this run."
            : `not recorded for reuse (\`${inline(be.notRecordedWhy ?? "unknown")}\`).`),
        ""
      );
    }
  }

  if (installFailed) {
    // Already rendered above, before the verdict — no redundant install-info line here.
  } else if (be && be.reused) {
    out.push("install: none run by this invocation (the BASE evidence was reused).", "");
  } else if (be && be.source === "entry") {
    out.push("install: none run by this invocation (the BASE evidence came from this run's entry gates).", "");
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

  // 6.40.0 — the HEAD side's install check (install-drift-core.mjs): one line, every value a validated enum or integer.
  // Rendered when the caller passes the key (stage-regress.mjs always does; null renders "not recorded").
  if (Object.hasOwn(progress, "headInstall")) out.push(headInstallLine(progress.headInstall), "");

  out.push(
    ...section("Scope", [
      `inside (${scope.inside.length}):`,
      "",
      scope.inside.length ? quoteData("", scope.inside.join("\n")) : "_(none)_",
      "",
      `declared (${scope.declared.length}):`,
      "",
      scope.declared.length ? quoteData("", scope.declared.join("\n")) : "_(none)_",
      // regress-base-integrity: the declared globs the write hook drops (set-writes-scope.cjs keeps concrete paths only).
      ...(Array.isArray(scope.unenforced_globs) && scope.unenforced_globs.length
        ? [
            "",
            `not enforced by the write hook (${scope.unenforced_globs.length}) — globs this partition honors but set-writes-scope.cjs drops, so a Write-tool write they cover is denied:`,
            "",
            quoteData("", scope.unenforced_globs.join("\n")),
          ]
        : []),
      ...(scope.escape_exempt && scope.escape_exempt.length
        ? [
            "",
            `escape-exempt (${scope.escape_exempt.length}) — this feature's own pipeline artifacts or a hook-protected trusted doc, never a build escape:`,
            "",
            quoteData("", scope.escape_exempt.join("\n")),
          ]
        : []),
      ...(preRunLines(scope.pre_run_snapshot).length ? ["", ...preRunLines(scope.pre_run_snapshot)] : []),
      ...(entryGateLines(scope.entry_gate_changes).length ? ["", ...entryGateLines(scope.entry_gate_changes)] : []),
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
 *  `scope-escaped`, `head-install-drift`). `detail` is an already-composed sentence (or fenced-ready text) the CLI assembled from
 *  a shelled checker's own message or a git/plan-scan finding; it is quoted as untrusted DATA here rather
 *  than trusted as this renderer's own prose. `preRun` (6.37.0) is the partition's `pre_run_snapshot` block, passed
 *  with a `scope-escaped` refusal so the paths it did NOT count are named beside the ones it did. */
export function renderRefused({ feature, reasonCode, detail, preRun = null, entryGates = null, baseInfo = null, cleanupResult = null }) {
  const out = [];
  out.push(`# REGRESSION — ${feature}`, "");
  out.push(`refused: \`${inline(reasonCode)}\``, "");
  // regress-base-integrity: a refusal after the base phase names the base and how it was chosen.
  if (baseInfo && typeof baseInfo.base === "string") out.push(...baseLines(baseInfo.base, baseInfo.baseSource));
  out.push("**regression NOT measured — the refusal below must be resolved first.**", "");
  out.push(...section("Why", [quoteData("detail, quoted as DATA:", dataText(detail))]));
  const pre = preRunLines(preRun);
  if (pre.length) out.push(...section("Pre-run snapshot", pre));
  const ent = entryGateLines(entryGates);
  if (ent.length) out.push(...section("Entry gates' changes", ent));
  // regress-base-integrity: a refusal decided AFTER the base side ran (`base-install-unreliable`) reports a failed cleanup
  // the same way a completed run does.
  if (cleanupResult && cleanupResult.ok === false) {
    out.push(
      ...section("Cleanup", [
        "removing the base worktree FAILED — the next fresh start removes the leftover worktree.",
        "",
        quoteData("error, quoted as DATA:", dataText(cleanupResult.error ?? "(no detail)")),
      ])
    );
  }
  return (
    out
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd() + "\n"
  );
}
