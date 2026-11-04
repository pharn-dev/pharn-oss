#!/usr/bin/env node
// pharn/floor/check-spec-approved.mjs — the deterministic APPROVED-INPUT GATE for /pharn-plan.
//
// Floor primitives (ARCHITECTURE §2): #3 (enum) for `state === "Approved"`, and — REUSED, not
// re-implemented — #3 (presence/enum) + #2 (content-hash) via check-spec.mjs for shape, the state
// enum, spec_id, and the Approved-pin (spec_content_hash == sha256(body)). It is the floor reduction of
// the §6 plan-stage PRECONDITION: a PLAN may be produced only from an Approved, un-drifted SPEC
// (fix #4). /pharn-plan is the FIRST downstream consumer that ENFORCES /pharn-spec's pin, so the pin is
// NOT decorative. Cited, not restated (P4).
//
// WHY a wrapper over check-spec.mjs (the reuse): check-spec.mjs returns GREEN for a valid DRAFT — a
// Draft is a legal spec state, and /pharn-spec must validate Drafts too — so `check-spec GREEN` ALONE
// is not the gate. This file adds the ONE assertion check-spec deliberately omits — `state ===
// "Approved"` — on TOP of check-spec's exact verification. It shells to check-spec.mjs as a CLI (NOT a
// sibling import, P3 — the same separation check-regress / check-verify use to re-run other floor
// gates), so the content-hash logic lives in exactly ONE place and can never drift between the two.
//
// THE SAME NOW HOLDS FOR `state`, AND IT DID NOT USED TO — the correction is worth stating, because the
// sentence above was true of the hash and FALSE of the state enum for as long as both were written here.
// This file carried a private `readState()`: FIRST-wins across duplicate keys, no comment strip, against
// check-spec's LAST-wins + comment-stripped parseSpec. Two checkers, one file, two answers — in BOTH
// directions. A frontmatter with `state: Approved` followed by `state: Draft` made validate read Draft
// while this GATE read Approved and returned exit 0 "Approved and un-drifted": a FAIL-OPEN, on the one
// gate whose entire job is to let only human-approved intent downstream. And a template-faithful
// `state: Approved # ratified 2026-08-18` made this gate RED a spec validate called GREEN. Both are now
// reproduced as tests. The state is read through `check-spec.mjs --state` — the same CLI shell-out, the
// same single-source discipline — and this file holds NO frontmatter parser of its own.
//
// Honestly bounded (P0), in the same terms check-spec.mjs's bodyHash already uses for the hash: that no
// THIRD parse of `state` is ever re-introduced is DISCIPLINE, not a floor op. The tests DETECT a divergent
// re-implementation (one asserts this source contains no frontmatter-parse construct at all); they do not
// PREVENT one. That bound is written here rather than upgraded into a claim the floor cannot back — the
// previous bound on this very defect was also prose, was also correct when written, and is what rotted.
//
// NON-LLM. Node stdlib only (child_process to invoke the sibling CLI; no network, no eval, no deps).
//
// Honest scope (P0): it guarantees a SPEC is Approved + un-drifted + well-shaped — the deterministic
// PRECONDITION of planning. It does NOT — cannot — judge whether the resulting PLAN is correct, or the
// intent wise. "passed check-spec-approved" means ONLY "the input spec is approved and unchanged",
// NEVER "the plan will be good" — that conflation is the P0 disease this repo exists to prevent. And
// note the two clocks: this checker's VERDICT is floor; /pharn-plan's ACT of invoking it and obeying
// the exit code is ADVISORY command orchestration (exactly as /pharn-dev-ship reads a sub-stage verdict).
//
// Trust (P2): the SPEC body is untrusted human intent (DATA). The verdict ranges ONLY over the
// enum-gated / floor-verifiable fields (the `state` enum + check-spec's section-presence + body-hash
// equality) — NEVER over the intent's meaning. No guaranteed decision rests on the free-text intent
// (mirrors fix #1; the ★ test proves an instruction-looking needle in the intent does not move it).
//
// Usage:
//   node pharn/floor/check-spec-approved.mjs <SPEC.md>   exit 0 iff Approved + un-drifted + well-shaped
//                                                        (GREEN); exit 1 otherwise (Draft / drift /
//                                                        malformed / unreadable), printing a clear RED.
//
// Exit: 0 only for an Approved, un-drifted, well-shaped SPEC; 1 on every refusal (fail-closed).

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Resolve check-spec.mjs RELATIVE TO THIS FILE (import.meta.url), never the cwd — so the gate behaves
// identically no matter where /pharn-plan is invoked from (mirrors how check-spec.test.mjs locates the
// checker under test). A cwd-relative path would silently break the reuse off the repo root.
const here = dirname(fileURLToPath(import.meta.url));
const CHECK_SPEC = join(here, "check-spec.mjs");

const STATE_APPROVED = "Approved"; // the one member of the {Draft, Approved} state enum a plan may come from

// DELIBERATELY ABSENT: any frontmatter regex, key/value split, or quote/comment handling. `state` is read
// ONLY through `check-spec.mjs --state` (see gate step 2). Re-adding a parse here — even one that looks
// equivalent today — re-creates the divergence documented in this file's header. The test suite asserts
// this absence structurally, not merely behaviourally.

function red(msg) {
  console.log(`RED — ${msg}`);
  return 1;
}

function gate(specPath) {
  // (1) REUSE check-spec.mjs's EXACT verification (shape + state-enum + spec_id + Approved-pin/hash):
  //     a Draft → GREEN(0); an Approved+matching → GREEN(0); an Approved+drift / malformed / missing
  //     section / unreadable → RED(1). Shelling keeps the content-hash logic in ONE place (P4).
  const r = spawnSync(process.execPath, [CHECK_SPEC, specPath], { encoding: "utf8" });
  if (r.error) {
    return red(`could not run check-spec.mjs (${CHECK_SPEC}): ${r.error.message}`);
  }
  if (r.status !== 0) {
    // Surface check-spec's OWN message verbatim, so a DRIFT ("…drifted; re-approve…"), a MALFORMED, or
    // a missing-section refusal is distinguishable from the Draft refusal below — the user learns
    // whether to re-approve, fix the spec, or first approve it, never a generic fail (P5: the terminal
    // fallback is a CLEAR message, not a guess).
    const out = (r.stdout || "") + (r.stderr || "");
    if (out.trim()) process.stdout.write(out.endsWith("\n") ? out : out + "\n");
    return red(`check-spec.mjs rejected ${specPath} (see its output above) — cannot plan from an invalid or drifted spec`);
  }

  // (2) check-spec said GREEN ⇒ state ∈ {Draft, Approved} and (if Approved) the pin matches. Add the
  //     ONE assertion check-spec omits: the spec MUST be Approved. A Draft is intent NOT yet
  //     human-approved — planning from it would let unapproved intent flow downstream.
  //
  //     The state comes from check-spec.mjs --state — the SAME parse validate just used, one process
  //     later — never from a read of our own. This is the whole point of the file's header note. The
  //     capture is pinned to the exact shape check-plan-spec-agree.mjs already uses for --hash/--spec-id
  //     (L22: prescribe the command line, do not leave a technique to be re-derived), and it is an
  //     input-capture boundary (L5): a spawn failure or a non-zero child exit is a RED, never a state.
  const s = spawnSync(process.execPath, [CHECK_SPEC, "--state", specPath], { encoding: "utf8" });
  if (s.error) {
    return red(`could not run check-spec.mjs --state (${CHECK_SPEC}): ${s.error.message}`);
  }
  if (s.status !== 0) {
    const out = (s.stdout || "") + (s.stderr || "");
    if (out.trim()) process.stdout.write(out.endsWith("\n") ? out : out + "\n");
    return red(`could not read the spec state from ${specPath} (see check-spec's output above)`);
  }
  // .trim() strips the transport's trailing newline. It is the identity map on any value check-spec would
  // emit — readValue already trims — so the capture cannot silently alter a value that survived the
  // canonical parse; and the kv regex ends at `$` (JS `.` excludes \r and \n), so a frontmatter value
  // cannot carry a newline and cannot forge a second stdout line. Pinned by a hostile-value test.
  const state = (s.stdout || "").trim();
  if (state !== STATE_APPROVED) {
    return red(
      // `state` is now always a string (the transport cannot yield undefined), so the old `?? "(none)"`
      // could never fire and an absent field would have printed a bare `""`. Test the empty string
      // explicitly instead. JSON.stringify escapes control characters, so an untrusted frontmatter value
      // reaching this message as DATA cannot forge a verdict line in this checker's own stdout (P2).
      `spec state ${JSON.stringify(state === "" ? "(none)" : state)} is not ${JSON.stringify(STATE_APPROVED)} — ` +
        `approve the intent via /pharn-spec before planning (a Draft has not been marked Approved)`
    );
  }

  console.log(`GREEN — spec Approved and un-drifted; safe to plan (${specPath})`);
  return 0;
}

function main() {
  const specPath = process.argv[2];
  if (!specPath) {
    console.log("RED — usage: node pharn/floor/check-spec-approved.mjs <SPEC.md>");
    return 1;
  }
  return gate(specPath);
}

process.exit(main());
