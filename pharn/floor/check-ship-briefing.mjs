#!/usr/bin/env node
// pharn/floor/check-ship-briefing.mjs — the deterministic CROSS-FILE checker for the GATE-2 briefing
// artifact (`pharn/features/<name>/BRIEFING.md`), on the PRODUCT surface.
//
// Floor/eval infrastructure — NOT a Capability (no `role:`; lives in this floor-ignored dir, exactly like
// `check-loop-record.mjs` / `check-provenance.mjs`). It is the executable SoT for
// `pharn/pharn-contracts/ship-briefing.md` (cited, not restated — P4).
//
// SCOPE NOTE (P3 — a deliberate bundle, named per the `lessons-index-core.mjs` precedent this corpus's
// own grill already required elsewhere): this ONE file asserts three related but distinct things about
// the SAME artifact — (1) envelope SHAPE (enum/regex, mirrors `check-loop-record.mjs`), (2) CROSS-FILE
// EQUALITY against the sibling source files in the same directory (the genuinely NEW floor primitive this
// pair introduces — see `pharn/pharn-contracts/ship-briefing.md` "The rule of the contract"), and (3) the
// ADVISORY-marker's exactness. All three are checks over ONE artifact's trustworthiness, not three
// unrelated axes — the same justification `check-loop-record.mjs` carries for bundling envelope + Handoff
// structure. If this checker grows a fourth, unrelated concern, split it then.
//
// ── Honest scope (P0) — the split this file must never blur ───────────────────────────────────────────
// FLOOR (what the exit code guarantees): the frontmatter fields are shape-valid, and each field that has a
//   live source (SPEC.md / regression-report.json / verify-report.json / GRILL.md, resolved as SIBLINGS
//   of the given BRIEFING.md, never a separate `--base` argument) EQUALS what that source currently says.
//   All of it is ARCHITECTURE §2 primitive #3 (enum/regex/equality).
// ADVISORY (what it can NEVER check): that the `## Why this design` section's CONTENT — quoted or
//   synthesized — is accurate, complete, or the right thing to have quoted; that the PLAN's `## Files`
//   list was itself complete; that a human read any of it. "GREEN" means ONLY "this artifact's copies
//   currently match their sources", NEVER "the briefing is a faithful or sufficient summary" (P0).
// Two clocks: this checker's VERDICT is floor; `/pharn-ship`'s ACT of invoking it and surfacing the result
//   as an ANNOTATION (never a GATE-2 precondition, per this pair's own PLAN.md) is ADVISORY orchestration.
//
// ── Duplication, not import (P3 — no sibling import; a documented, tested-for divergence, matching
//    check-plan-spec-agree.mjs's readValue precedent) ──────────────────────────────────────────────────
// The field-reading logic below (readHeaderField's dual PLAN/SPEC-shape parse, the JSON verdict reader,
// the GRILL verdict-line scan) AND the frontmatter scalar codec (`yamlScalar` / `isQuotedScalar` /
// `yamlUnscalar`) are DUPLICATED from `render-ship-briefing.mjs`, not imported. The two must read a field
// the SAME way for "equals its source" to mean anything; `check-ship-briefing.test.mjs` carries ✧ PARITY
// tests asserting both copies agree on a shared fixture set, so a future edit to one side that silently
// diverges from the other is caught, not merely hoped against.
//
// The codec is named here for a reason (L25). This paragraph previously enumerated the THREE readers and
// stopped — and was read, correctly, as a completed analysis of what the two files must agree on. The
// encode/decode pair was the fourth thing, and it was the one that had actually drifted: the renderer
// escaped, nothing here unescaped, and a briefing rendered seconds earlier REDded as "stale" against its
// own unchanged source. A partial rationale narrows what the next reader thinks to check, so the fix is
// both the decoder AND this sentence — with the ✧ round-trip test as the part that does not rely on
// anyone reading either.
//
// NON-LLM. Node stdlib only (fs). No network, no eval, no deps, no child processes.
//
// Usage:
//   node pharn/floor/check-ship-briefing.mjs <BRIEFING.md>
//     SPEC.md / PLAN.md / GRILL.md / regression-report.json / verify-report.json are resolved as SIBLINGS
//     of <BRIEFING.md> (its own directory) — never a separate `--base` flag.
//
// Exit: 0 (GREEN) only when every check below holds; 1 (RED) on every refusal (fail-closed).

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { FM_RE, stripBom } from "./frontmatter-core.mjs";

const HEADING_RE = /^#{1,6}[ \t]+\S/;
const REGRESS_ENUM = new Set(["no-regressions", "regressions", "inconclusive"]);
const VERIFY_ENUM = new Set(["PASS", "FAIL", "INCOMPLETE", "INCONCLUSIVE"]);

// The exact marker heading a generated paragraph must carry — duplicated from
// render-ship-briefing.mjs's ADVISORY_HEADING (P3; pinned equal by the parity test).
const ADVISORY_HEADING = "## Why this design (ADVISORY — model-synthesized, not floor-verified; see PLAN.md/GRILL.md)";
const PLAIN_HEADING = "## Why this design";

function stripQuotes(v) {
  return v.replace(/^["']|["']$/g, "");
}
function clean(v) {
  return stripQuotes(v.replace(/\s+#.*$/, "").trim()).trim();
}

// ── DUPLICATED from render-ship-briefing.mjs: the frontmatter scalar CODEC ────────────────────────────
// The renderer writes THIS file's input through `yamlScalar`, which escapes `\` and `"`. Nothing here
// ever undid that, so a briefing whose `grill_verdict` contained a quote read back as `…\"…`, never
// equalled the live source's `…"…`, and a briefing rendered seconds earlier REDded as "stale" against an
// input that had not changed. The decoder below is the exact inverse, and it is applied at exactly ONE
// site — `readEnvelope`, which reads the renderer's own output. The two OTHER readers in this file
// (`readHeaderField` over SPEC/PLAN, `grillVerdictLine` over GRILL.md) read files the renderer never
// encoded, and they keep `clean()` untouched: decoding there would invent an unescape no writer performed
// and would break their parity with the renderer's copies. Per-branch, not blanket (L27).
//
// Kept as a DUPLICATE, not an import, per this file's documented no-sibling-import convention (P3) — the
// ✧ PARITY + ✧ round-trip tests in check-ship-briefing.test.mjs pin both copies to identical behavior.
export function yamlScalar(v) {
  return `"${String(v).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

// Is `raw` a COMPLETE double-quoted scalar? The closing quote is a real terminator only when the run of
// backslashes immediately before it is EVEN — "the previous character is not a backslash" is the obvious
// spelling and is WRONG for `yamlScalar("a\\")` → `"a\\\\"`, whose final `"` follows the second half of an
// escaped pair. See render-ship-briefing.mjs's copy for the full rationale.
export function isQuotedScalar(raw) {
  if (typeof raw !== "string" || raw.length < 2) return false;
  if (raw[0] !== '"' || raw[raw.length - 1] !== '"') return false;
  let run = 0;
  for (let i = raw.length - 2; i >= 1 && raw[i] === "\\"; i--) run++;
  return run % 2 === 0;
}

// The exact inverse of `yamlScalar`, in ONE left-to-right pass. Restricted to `[\\"]`: an unrecognized
// sequence is left INERT rather than interpreted — a codec for this writer, never a general YAML
// unescaper. A value that is not a complete quoted scalar is returned unchanged, so callers fall back.
export function yamlUnscalar(raw) {
  if (!isQuotedScalar(raw)) return raw;
  return raw.slice(1, -1).replace(/\\([\\"])/g, "$1");
}

// Read ONE value from the BRIEFING's own frontmatter — the ONLY place `yamlScalar` output is parsed.
// A complete quoted scalar is DECODED; anything else (a hand-written unquoted value, a quoted value with
// a trailing ` # comment`, a malformed scalar) falls back to today's `clean()` path unchanged. The
// `cleanScalar` shape guards downstream then run on the DECODED value — the decoder is layered BEFORE the
// guard, never in place of it (L14), so a control character cannot ride in behind an escape.
function readEnvelopeValue(raw) {
  const trimmed = raw.trim();
  return isQuotedScalar(trimmed) ? yamlUnscalar(trimmed) : clean(raw);
}

// duplicated: render-ship-briefing.mjs's readHeaderField
export function readHeaderField(text, field) {
  const fm = text.match(FM_RE);
  if (fm) {
    for (const line of fm[1].split(/\r?\n/)) {
      const kv = line.match(/^([A-Za-z_][\w-]*):[ \t]*(.*)$/);
      if (kv && kv[1] === field) return clean(kv[2]);
    }
    return undefined;
  }
  let inFence = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (HEADING_RE.test(line)) break;
    const kv = line.match(/^-[ \t]+([A-Za-z_][\w-]*):[ \t]*(.*)$/);
    if (kv && kv[1] === field) return clean(kv[2]);
  }
  return undefined;
}

// duplicated: render-ship-briefing.mjs's grillVerdictLine (★ trust-fence fix: fenced blocks skipped,
// line-initial anchor, LAST match wins; ★ line-wrap fix: accumulates consecutive physical lines up to the
// closing `**` or a paragraph boundary — see that file's header for both reproduced defects this closes)
export function grillVerdictLine(grillText) {
  const lines = grillText.split(/\r?\n/);
  let best;
  let inFence = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    if (!/^\*\*ADVISORY VERDICT:/.test(line.trim())) continue;

    let acc = "";
    for (let j = i; j < lines.length; j++) {
      const l = lines[j];
      if (j > i && (l.trim() === "" || HEADING_RE.test(l) || /^\s*(```|~~~)/.test(l))) break;
      acc += (acc ? " " : "") + l.trim();
      const closeAt = acc.indexOf("**", 2);
      if (closeAt !== -1) {
        acc = acc.slice(0, closeAt + 2);
        break;
      }
    }
    best = clean(acc.replace(/^\*\*|\*\*$/g, ""));
  }
  return best;
}

// duplicated: render-ship-briefing.mjs's readJsonVerdict (Object.hasOwn — L15, never `||`/`??`)
export function readJsonVerdict(path, enumSet) {
  if (!existsSync(path)) return "n/a";
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return "n/a";
  }
  if (parsed === null || typeof parsed !== "object" || !Object.hasOwn(parsed, "verdict")) return "n/a";
  const v = parsed.verdict;
  return typeof v === "string" && enumSet.has(v) ? v : "n/a";
}

// duplicated: render-ship-briefing.mjs's cleanScalar (L14 — composed before any anchored regex)
function cleanScalar(v, maxLen) {
  if (typeof v !== "string") return false;
  if (v.length < 1 || v.length > maxLen) return false;
  for (let i = 0; i < v.length; i++) {
    const code = v.charCodeAt(i);
    if (code < 0x20 || code === 0x7f) return false;
  }
  return true;
}

const reds = [];
function red(kind, detail) {
  reds.push({ kind, detail });
}

// Exported for the ✧ per-field tests: they assert every yamlScalar-emitted field survives the
// render→read round trip, which requires reading the envelope the way `gate()` does.
export function readEnvelope(text) {
  const m = text.match(FM_RE);
  if (!m) return null;
  const fields = new Map(); // Map, never a plain object indexed by an arbitrary key (L15)
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z_][\w-]*):[ \t]*(.*)$/);
    if (kv) fields.set(kv[1], readEnvelopeValue(kv[2]));
  }
  return fields;
}

function gate(briefingPath) {
  let text;
  try {
    text = stripBom(readFileSync(briefingPath, "utf8"));
  } catch (e) {
    return fail(`briefing is unreadable (${briefingPath}): ${e.message}`);
  }

  const fields = readEnvelope(text);
  if (fields === null) {
    return fail(`briefing has no \`---\`-fenced YAML frontmatter (${briefingPath}) — see pharn/pharn-contracts/ship-briefing.md`);
  }

  const REQUIRED = [
    "feature",
    "spec_id",
    "spec_state",
    "grill_verdict",
    "regress_verdict",
    "verify_verdict",
    "rendered_at_commit",
    "briefing_contract_version",
  ];
  for (const key of REQUIRED) {
    if (!fields.has(key)) red("envelope", `missing required frontmatter field \`${key}\``);
  }
  if (reds.length) return fail2(briefingPath);

  // ── (1) SHAPE ──────────────────────────────────────────────────────────────────────────────────────
  const feature = fields.get("feature");
  if (!cleanScalar(feature, 128))
    red("shape", `\`feature\` must be a control-char-free string of 1-128 chars, got ${JSON.stringify(feature)}`);

  const specId = fields.get("spec_id");
  if (specId !== "n/a" && !cleanScalar(specId, 128))
    red("shape", `\`spec_id\` must be "n/a" or a control-char-free string of 1-128 chars, got ${JSON.stringify(specId)}`);

  const specState = fields.get("spec_state");
  if (specState !== "n/a" && specState !== "Approved")
    red("shape", `\`spec_state\` must be "Approved" or "n/a", got ${JSON.stringify(specState)}`);

  const grillVerdict = fields.get("grill_verdict");
  if (grillVerdict !== "n/a" && !cleanScalar(grillVerdict, 256))
    red("shape", `\`grill_verdict\` must be "n/a" or a control-char-free string of 1-256 chars, got ${JSON.stringify(grillVerdict)}`);

  const regressVerdict = fields.get("regress_verdict");
  if (!REGRESS_ENUM.has(regressVerdict) && regressVerdict !== "n/a")
    red("shape", `\`regress_verdict\` not in {${[...REGRESS_ENUM].join(", ")}, n/a}, got ${JSON.stringify(regressVerdict)}`);

  const verifyVerdict = fields.get("verify_verdict");
  if (!VERIFY_ENUM.has(verifyVerdict) && verifyVerdict !== "n/a")
    red("shape", `\`verify_verdict\` not in {${[...VERIFY_ENUM].join(", ")}, n/a}, got ${JSON.stringify(verifyVerdict)}`);

  const commit = fields.get("rendered_at_commit");
  if (commit !== "unknown" && !(cleanScalar(commit, 40) && /^[0-9a-f]{7,40}$/.test(commit))) {
    red("shape", `\`rendered_at_commit\` must be a lowercase hex git SHA (7-40 chars) or "unknown", got ${JSON.stringify(commit)}`);
  }

  const version = fields.get("briefing_contract_version");
  if (!(cleanScalar(version, 32) && /^\d+\.\d+\.\d+$/.test(version))) {
    red("shape", `\`briefing_contract_version\` must be a semver string, got ${JSON.stringify(version)}`);
  }

  if (reds.length) return fail2(briefingPath);

  // ── (2) CROSS-FILE EQUALITY — resolve siblings from the BRIEFING.md's own directory ──────────────────
  const dir = dirname(briefingPath);

  let liveSpecId = "n/a";
  let liveSpecState = "n/a";
  const specPath = join(dir, "SPEC.md");
  if (existsSync(specPath)) {
    try {
      const specText = stripBom(readFileSync(specPath, "utf8"));
      liveSpecId = readHeaderField(specText, "spec_id") ?? "n/a";
      const state = readHeaderField(specText, "state");
      liveSpecState = state === "Approved" ? "Approved" : "n/a";
    } catch {
      // unreadable live SPEC.md — treated as absent (n/a), same rule the renderer uses
    }
  }
  if (specId !== liveSpecId)
    red("stale", `\`spec_id\` = ${JSON.stringify(specId)} but ${specPath} currently reads ${JSON.stringify(liveSpecId)}`);
  if (specState !== liveSpecState)
    red("stale", `\`spec_state\` = ${JSON.stringify(specState)} but ${specPath} currently reads ${JSON.stringify(liveSpecState)}`);

  let liveGrillVerdict = "n/a";
  const grillPath = join(dir, "GRILL.md");
  if (existsSync(grillPath)) {
    try {
      const line = grillVerdictLine(readFileSync(grillPath, "utf8"));
      if (line && cleanScalar(line, 256)) liveGrillVerdict = line;
    } catch {
      // unreadable live GRILL.md — treated as absent (n/a)
    }
  }
  if (grillVerdict !== liveGrillVerdict)
    red(
      "stale",
      `\`grill_verdict\` = ${JSON.stringify(grillVerdict)} but ${grillPath} currently reads ${JSON.stringify(liveGrillVerdict)}`
    );

  const liveRegress = readJsonVerdict(join(dir, "regression-report.json"), REGRESS_ENUM);
  if (regressVerdict !== liveRegress)
    red(
      "stale",
      `\`regress_verdict\` = ${JSON.stringify(regressVerdict)} but regression-report.json currently reads ${JSON.stringify(liveRegress)}`
    );

  const liveVerify = readJsonVerdict(join(dir, "verify-report.json"), VERIFY_ENUM);
  if (verifyVerdict !== liveVerify)
    red(
      "stale",
      `\`verify_verdict\` = ${JSON.stringify(verifyVerdict)} but verify-report.json currently reads ${JSON.stringify(liveVerify)}`
    );

  // ── (3) The `## Why this design` heading + ADVISORY marker exactness ─────────────────────────────────
  const body = text.slice((text.match(FM_RE) || [""])[0].length);
  const whyLines = body.split(/\r?\n/).filter((l) => /^##[ \t]+Why this design/i.test(l));
  if (whyLines.length === 0) {
    red("structure", `no \`## Why this design\` section found (${briefingPath})`);
  } else if (whyLines.length > 1) {
    red("structure", `${whyLines.length} \`## Why this design\` sections found (${briefingPath}) — exactly one is allowed`);
  } else if (whyLines[0] !== PLAIN_HEADING && whyLines[0] !== ADVISORY_HEADING) {
    red(
      "structure",
      `\`## Why this design\` heading is mangled: ${JSON.stringify(whyLines[0])} — must be exactly ${JSON.stringify(PLAIN_HEADING)} or ${JSON.stringify(ADVISORY_HEADING)}`
    );
  }
  // A PLAIN heading's body is either a real verbatim PLAN.md quote or the NO_DECISION_LINE sentinel —
  // both are legitimate and neither is distinguishable from here without re-running the heading-scan
  // (which is render-ship-briefing.mjs's job, not this checker's — see the SCOPE NOTE above). This
  // checker asserts only that the HEADING itself is one of the two well-formed forms.

  if (reds.length) return fail2(briefingPath);
  console.log(
    `GREEN — ${briefingPath}: envelope well-shaped; spec_id/spec_state, grill_verdict, regress_verdict, ` +
      `and verify_verdict all match their live sibling sources. NOTE (P0): this proves the COPIES agree ` +
      `with their sources right now — never that the briefing is a faithful or sufficient summary.`
  );
  return 0;
}

function fail(msg) {
  console.log(`RED — ${msg}`);
  return 1;
}
function fail2(path) {
  for (const r of reds) console.log(`RED — ${r.kind}: ${r.detail}`);
  console.log(`\nRED — ${reds.length} check(s) failed for ${path}`);
  return 1;
}

function main() {
  const briefingPath = process.argv[2];
  if (!briefingPath || process.argv.length > 3) {
    console.log("RED — usage: node pharn/floor/check-ship-briefing.mjs <BRIEFING.md>");
    return 1;
  }
  return gate(briefingPath);
}

// Run as CLI only when invoked directly (not when imported by a test). `import.meta.main` — NOT a
// `file://` + argv[1] compare, which silently no-ops on spaced/non-ASCII/symlinked paths.
if (import.meta.main) {
  process.exit(main());
}
