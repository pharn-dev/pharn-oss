#!/usr/bin/env node
// pharn/floor/check-plan-spec-agree.mjs — the deterministic spec→plan HASH-CHAIN re-verification for /pharn-grill.
//
// Floor primitives (ARCHITECTURE §2): #3 (enum) for the SPEC's state === "Approved", and #2 (content-hash)
// for the chain equality — the PLAN's carried spec_content_hash MUST equal the SPEC's CURRENT body hash. It
// is the floor reduction of the §6 grill stage's first responsibility downstream of /pharn-plan: a PLAN may
// proceed only if it was made against the CURRENT Approved, un-drifted SPEC (the §6 Keystone — "if the spec
// is edited after the plan, the hash diverges and it is detectable, not silent" — fix #4). /pharn-grill is
// the FIRST consumer that ENFORCES /pharn-spec's pin downstream of /pharn-plan; the pin is NOT decorative.
// Cited, not restated (P4).
//
// WHY a wrapper over the existing gates (the reuse, P3): the SPEC's Approved-and-un-drifted check ALREADY
// exists as check-spec-approved.mjs (which itself wraps check-spec.mjs), and the canonical body hash is
// ALREADY emitted by check-spec.mjs --hash. This file shells BOTH as CLIs (NOT sibling imports, P3 — the
// same separation check-spec-approved / check-regress / check-verify use to re-run other floor gates) and
// adds exactly TWO new assertions on top: planSpecId === specSpecId (IDENTITY) and planHash === specHash
// (CONTENT). The SPEC side of both is SHELLED, so the state-enum, the body hash, and the spec_id all come
// from check-spec.mjs and cannot drift from what it just verified.
//
// The PLAN side is a LOCAL parse of the PLAN's frontmatter, but since 6.20.5 its VALUE reader is not a copy:
// `readField` / `readValue` come from frontmatter-core.mjs, the same `readValue` check-spec.mjs's parseSpec
// uses (until then this file carried a private DUPLICATE, moved there byte-for-byte). So the two halves read a
// field VALUE with ONE implementation. What stays local is this file's choice of the frontmatter block (FM_RE)
// and of the key — agreement there is still a CONVENTION the tests DETECT (frontmatter-core.test.mjs executes
// both CLIs over duplicated, quoted and commented keys), never a floor op that PREVENTS divergence. Said
// plainly because an earlier draft of this header claimed the parses "can never drift", which was false.
//
// WHY IDENTITY as well as content: the content pin alone lets a PLAN name spec A while carrying spec B's body
// hash — the hash matches, the chain reads GREEN, and the record is MISLABELED. Pinning the body without
// pinning the name proves the plan was made against SOME current approved spec, never against THE one it
// claims. Both halves are needed for "this plan implements this spec" to be a floor statement.
//
// NON-LLM. Node stdlib only (child_process to invoke the sibling CLIs; no network, no eval, no deps).
//
// Honest scope (P0): it guarantees the PLAN was made against the CURRENT Approved, un-drifted SPEC — the
// spec→plan hash chain holds at grill time. It does NOT — cannot — judge whether the PLAN is good, complete,
// or sound; /pharn-grill's interrogation surfaces that (advisory) and NEVER gates. "passed
// check-plan-spec-agree" means ONLY "the plan was made against the current approved spec", NEVER "the plan
// is good" — that conflation is the P0 disease this repo exists to prevent. Two clocks: this checker's
// VERDICT is floor; /pharn-grill's ACT of invoking it and obeying the exit code is ADVISORY command
// orchestration (exactly as /pharn-plan reads check-spec-approved, and /pharn-dev-ship reads a sub-stage verdict).
//
// Trust (P2): the PLAN and SPEC bodies are untrusted DATA. The verdict ranges ONLY over the enum-gated /
// floor-verifiable values — the gate's exit code (state enum + body-hash equality, inside check-spec) and
// the two 64-hex digests — NEVER over either file's prose meaning. The carried planHash is regex-gated to
// 64-hex (HASH_RE) BEFORE the compare, so an instruction-looking needle in that field is rejected as
// not-a-hash (the ★ tests prove a needle in plan/spec prose does not move the verdict).
//
// Usage:
//   node pharn/floor/check-plan-spec-agree.mjs <PLAN.md> <SPEC.md>
//       exit 0 iff the SPEC is Approved+un-drifted AND the PLAN's carried spec_content_hash equals the
//       SPEC's current body hash (GREEN); exit 1 otherwise (spec Draft / drift / malformed, or a stale /
//       broken chain, or a missing / malformed carried hash), printing a clear RED.
//
// Exit: 0 only when the chain holds; 1 on every refusal (fail-closed).

import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { FM_RE, readField, stripBom } from "./frontmatter-core.mjs";

// Resolve the sibling CLIs RELATIVE TO THIS FILE (import.meta.url), never the cwd — so the chain check
// behaves identically no matter where /pharn-grill is invoked from (mirrors check-spec-approved.mjs:47-48).
const here = dirname(fileURLToPath(import.meta.url));
const CHECK_SPEC_APPROVED = join(here, "check-spec-approved.mjs");
const CHECK_SPEC = join(here, "check-spec.mjs");

const HASH_RE = /^[0-9a-f]{64}$/; // a SHA-256 hex digest — the enum-gate applied to BOTH hashes (P2/P5)

// Extract ONE carried frontmatter field from the PLAN (or undefined when there is no frontmatter / no such
// line), using check-spec.mjs's exact key/value parse so the two never disagree on what a field is — since
// 6.20.5 literally the same code: frontmatter-core.mjs's `readField` (key grammar) and `readValue` (quote
// first, then an unquoted ` #` comment), which this file carried as private copies until then.
// Deterministic; no LLM. Parameterized by key rather than copied twice: both carried fields are read the
// SAME way by construction, so a future change to the parse cannot fix one reader and miss the other.
//
// LAST-wins on a DUPLICATE key, deliberately — matching check-spec.mjs's parseSpec (which assigns into an
// object, so the last line wins) and matching YAML. An earlier first-wins spelling was a real hole: a PLAN
// could declare `spec_id:` twice, and this checker would compare the FIRST while parseSpec — and every
// other reader — sees the SECOND, so the identity assertion passed on an id that was not the plan's
// effective one. Reading the last match is what makes the "never disagree" sentence above TRUE rather than
// merely intended.
function readCarried(text, key) {
  const m = text.match(FM_RE);
  if (!m) return undefined;
  return readField(m[1], key);
}

// The PLAN's carried CONTENT pin (fix #4) — what the spec body hashed to when the plan was made.
function readCarriedHash(text) {
  return readCarried(text, "spec_content_hash");
}

// The PLAN's declared IDENTITY — which spec this plan claims to implement (the §6 root identity).
function readCarriedSpecId(text) {
  return readCarried(text, "spec_id");
}

function red(msg) {
  console.log(`RED — ${msg}`);
  return 1;
}

function gate(planPath, specPath) {
  // (1) REUSE check-spec-approved.mjs: the SPEC must be Approved + un-drifted + well-shaped. This is the
  //     first link — a plan made against a Draft / drifted / malformed spec cannot have a valid chain.
  //     Shelling keeps the state-enum + body-hash logic in ONE place (P3/P4).
  const g = spawnSync(process.execPath, [CHECK_SPEC_APPROVED, specPath], { encoding: "utf8" });
  if (g.error) {
    return red(`could not run check-spec-approved.mjs (${CHECK_SPEC_APPROVED}): ${g.error.message}`);
  }
  if (g.status !== 0) {
    // Surface its OWN message verbatim, so a Draft vs drift vs malformed refusal stays distinguishable
    // (the user learns whether to approve, re-approve, or fix the spec — P5: a clear message, not a guess).
    const out = (g.stdout || "") + (g.stderr || "");
    if (out.trim()) process.stdout.write(out.endsWith("\n") ? out : out + "\n");
    return red(`SPEC is not Approved+un-drifted (${specPath}) — cannot verify the spec→plan chain; approve/re-approve via /pharn-spec`);
  }

  // (2) REUSE check-spec.mjs --hash: the SPEC's CURRENT body hash (the single source of body-extraction, so
  //     this can never disagree with what check-spec verified in step 1). Trim the trailing newline it
  //     prints (check-spec.mjs writes `hash + "\n"`), then enum-gate to 64-hex — fail-closed otherwise.
  const h = spawnSync(process.execPath, [CHECK_SPEC, "--hash", specPath], { encoding: "utf8" });
  if (h.error) {
    return red(`could not run check-spec.mjs --hash (${CHECK_SPEC}): ${h.error.message}`);
  }
  if (h.status !== 0) {
    const out = (h.stdout || "") + (h.stderr || "");
    if (out.trim()) process.stdout.write(out.endsWith("\n") ? out : out + "\n");
    return red(`check-spec.mjs --hash failed for ${specPath} — cannot recompute the spec body hash`);
  }
  const specHash = (h.stdout || "").trim();
  if (!HASH_RE.test(specHash)) {
    return red(`check-spec.mjs --hash did not return a sha256 for ${specPath} (got ${JSON.stringify(specHash)})`);
  }

  // (3) REUSE check-spec.mjs --spec-id: the SPEC's DECLARED identity, from the SAME single SPEC parser that
  //     produced the body hash in step (2) — never re-parsed here, so the wrapper cannot drift from the spec
  //     checker about what `spec_id` is (P4, the identical reuse the hash already uses).
  const s = spawnSync(process.execPath, [CHECK_SPEC, "--spec-id", specPath], { encoding: "utf8" });
  if (s.error) {
    return red(`could not run check-spec.mjs --spec-id (${CHECK_SPEC}): ${s.error.message}`);
  }
  if (s.status !== 0) {
    const out = (s.stdout || "") + (s.stderr || "");
    if (out.trim()) process.stdout.write(out.endsWith("\n") ? out : out + "\n");
    return red(`check-spec.mjs --spec-id failed for ${specPath} — cannot read the spec's declared identity`);
  }
  // No empty-check here, deliberately: an empty specSpecId is unreachable (step (1)'s gate REDs a
  // spec_id-less spec), and if it ever became reachable the identity assertion below still fails closed —
  // an empty SPEC id equals only an empty PLAN id, which the plan-side guard REDs first. A separate branch
  // would be unreachable code that no test through the public surface could pin, so it is not written.
  const specSpecId = (s.stdout || "").trim();

  // (4) Read the PLAN's CARRIED spec_content_hash and enum-gate it to 64-hex BEFORE the compare, so a needle
  //     in that field is rejected as not-a-hash (P2 — the verdict ranges only over hashes, never prose).
  let planText;
  try {
    planText = stripBom(readFileSync(planPath, "utf8"));
  } catch (e) {
    return red(`PLAN.md is unreadable (${planPath}): ${e.message}`);
  }
  // (5) The IDENTITY assertion — set membership (ARCHITECTURE §2 primitive #3): is the PLAN's declared
  //     spec_id the single member of the set the SPEC defines? A byte equality over two parsed field values,
  //     NEVER a comparison of what either name MEANS (P2 — no judgment, no similarity, no normalization
  //     beyond the trim/quote/comment handling both sides share). Checked BEFORE the hash on purpose: a PLAN
  //     naming a different spec is not "stale", it is about a DIFFERENT feature, and comparing the two bodies'
  //     hashes would answer a question nobody asked. Both ids are rendered with JSON.stringify so a value
  //     bearing control characters cannot forge a verdict line in this checker's own stdout — the per-line
  //     frontmatter parse already makes a raw newline unreachable, so this is the second layer, not the
  //     load-bearing one, and it is named as such rather than sold as a hole that was closed.
  //
  //     BOTH sides are compared TRIMMED, and that symmetry is load-bearing. The SPEC's id arrives over
  //     stdout, where leading/trailing spaces cannot survive the transport unambiguously (emitSpecId
  //     appends a newline and the reader must strip it), so trimming only the SPEC side made two
  //     BYTE-IDENTICAL files disagree: a quoted `spec_id: "  FEAT-1  "` parses to `  FEAT-1  ` on the PLAN
  //     side and to `FEAT-1` after transport — a false RED of exactly the class this checker exists to
  //     remove. Padding is not identity, and trimming cannot make two DISTINCT ids collide, so the
  //     symmetric trim is both safe and required.
  const planSpecId = (readCarriedSpecId(planText) ?? "").trim();
  if (planSpecId === "") {
    return red(
      `PLAN.md carries no spec_id in its frontmatter (${planPath}) — the record's identity is UNPINNED, so ` +
        `"which spec does this plan implement" has no answer; re-plan via /pharn-plan`
    );
  }
  if (planSpecId !== specSpecId) {
    return red(
      `spec→plan IDENTITY mismatch: the PLAN's spec_id (${JSON.stringify(planSpecId)}) != the SPEC's spec_id ` +
        `(${JSON.stringify(specSpecId)}) — the plan NAMES a different spec than the one it is pinned to, so the ` +
        `record would be mislabeled even if the body hash agreed; re-plan via /pharn-plan against the intended spec`
    );
  }

  // (6) The CONTENT assertion's input.
  const planHash = readCarriedHash(planText);
  if (planHash === undefined) {
    return red(
      `PLAN.md carries no spec_content_hash in its frontmatter (${planPath}) — re-plan via /pharn-plan ` +
        `(the carried pin is what the chain check reads)`
    );
  }
  if (!HASH_RE.test(planHash)) {
    return red(`PLAN.md spec_content_hash is not a sha256 (${planPath}): ${JSON.stringify(planHash)} — re-plan via /pharn-plan`);
  }

  // (7) The CONTENT assertion — the plan's carried hash MUST equal the spec's current body hash. Equal →
  //     the plan was made against the current approved spec (GREEN). Unequal → the spec changed after the
  //     plan was made → the plan is STALE (RED, fail-closed).
  if (planHash !== specHash) {
    return red(
      `spec→plan chain BROKEN: PLAN's carried spec_content_hash (${planHash}) != the SPEC's current body hash (${specHash}) — ` +
        `the spec changed after the plan was made; re-plan via /pharn-plan (or, if the spec change is intended, re-approve via /pharn-spec then re-plan)`
    );
  }

  console.log(
    `GREEN — spec→plan hash chain holds; the plan declares the SPEC's own spec_id (${JSON.stringify(specSpecId)}) ` +
      `and was made against the current Approved, un-drifted spec (${planPath} ↔ ${specPath})`
  );
  return 0;
}

function main() {
  const planPath = process.argv[2];
  const specPath = process.argv[3];
  if (!planPath || !specPath) {
    console.log("RED — usage: node pharn/floor/check-plan-spec-agree.mjs <PLAN.md> <SPEC.md>");
    return 1;
  }
  return gate(planPath, specPath);
}

process.exit(main());
