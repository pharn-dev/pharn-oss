// pharn/floor/route-token-core.test.mjs — the route token grammar (stage-model-routing, 6.27.0).
//
// Each assertion names the mutant that turns it red (L60): the membership tests fail if a set member is
// dropped from the regex; the near-miss tests fail if the regex loses an anchor or a guard; the parity test
// fails if a config alias is added to check-model-config.mjs without a routing decision here.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AGENT_MODELS,
  INLINE_REASONS,
  AGENT_PREFIX,
  INLINE_PREFIX,
  ROUTE_TOKEN_MAX,
  ROUTE_TOKEN_RE,
  isRouteToken,
  agentToken,
  inlineToken,
} from "./route-token-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** Every token the grammar is meant to admit — built from the two closed sets, never re-typed. */
const ALL_TOKENS = [...AGENT_MODELS.map((m) => `${AGENT_PREFIX}${m}`), ...INLINE_REASONS.map((r) => `${INLINE_PREFIX}${r}`)];

test("L34 — both sets are non-empty and duplicate-free, so the rules below cannot pass vacuously", () => {
  assert.equal(AGENT_MODELS.length, 4, "the Agent tool's four aliases, read in Claude Code 2.1.281");
  assert.equal(INLINE_REASONS.length, 10, "the ten inline reasons of the plan's Design §4 table");
  assert.equal(new Set(AGENT_MODELS).size, AGENT_MODELS.length);
  assert.equal(new Set(INLINE_REASONS).size, INLINE_REASONS.length);
  assert.ok(Object.isFrozen(AGENT_MODELS) && Object.isFrozen(INLINE_REASONS), "the sets are frozen");
});

test("every real token is accepted — mutant: a member dropped from the regex's alternation", () => {
  for (const t of ALL_TOKENS) assert.equal(isRouteToken(t), true, `${t} must be a route token`);
  assert.ok(
    ALL_TOKENS.every((t) => t.length <= ROUTE_TOKEN_MAX),
    "the length bound admits every real token"
  );
});

test("near-misses are refused — mutant: an unanchored or case-insensitive regex, or a missing clean-scalar guard", () => {
  const near = [
    "agent:gpt",
    "agent:inherit", // a CONFIG alias that is not an agent model: it routes inline with its own reason
    "agent:claude-opus-5-5",
    "inline:other",
    "inline:agent",
    "Agent:opus",
    "AGENT:OPUS",
    "agent:Opus",
    "agent: opus",
    "agent :opus",
    "agent:opus ",
    " agent:opus",
    "agent:opus\n",
    "agent:opus\r\n",
    "agent:op\u0000us",
    "agent:opus\u0000",
    "\tagent:opus",
    "agent:",
    "inline:",
    "agent",
    "inline",
    "",
    "agent:opusinline:floor-only",
    "agent:opus|inline:floor-only",
    "agent:opus\u007f",
    `inline:${"a".repeat(80)}`,
  ];
  for (const t of near) assert.equal(isRouteToken(t), false, `${JSON.stringify(t)} must NOT be a route token`);
});

test("L14 composition, measured: the clean-scalar guard runs BEFORE the regex, and each refuses on its own", () => {
  // On Node 24 the anchored regex already refuses a trailing newline (L14's stated mechanism does not
  // reproduce here — measured, and reported in the plan). The guard stays as defense in depth; this
  // pins that BOTH layers refuse the value, so removing either one still leaves a refusal.
  assert.equal(ROUTE_TOKEN_RE.test("agent:opus\n"), false, "the regex alone refuses a trailing newline on this runtime");
  assert.equal(isRouteToken("agent:opus\n"), false);
  // A NUL inside a value the regex could never match anyway — the guard is what names it.
  assert.equal(isRouteToken("agent:opus\u0000"), false);
});

test("totality — a non-string of any shape returns false and never throws (L62)", () => {
  const hostile = JSON.parse('{"toString":1}');
  assert.throws(() => String(hostile), TypeError, "CONTROL: this value really does make String() throw");
  for (const v of [undefined, null, 0, 1, true, [], ["agent:opus"], {}, hostile, [hostile], () => "agent:opus", Symbol("x")]) {
    assert.equal(isRouteToken(v), false);
    assert.equal(agentToken(v), null);
    assert.equal(inlineToken(v), null);
  }
});

test("every set member is [a-z-] only, so the regex built from the sets needs no escaping", () => {
  // Mutant: a member added with a metacharacter (`.`, `|`, `(`) would widen the alternation silently.
  for (const m of [...AGENT_MODELS, ...INLINE_REASONS]) assert.match(m, /^[a-z][a-z-]*$/, `${m} carries a character the regex would read`);
});

test("agentToken / inlineToken build exactly the grammar's tokens, and refuse a non-member", () => {
  for (const m of AGENT_MODELS) assert.equal(agentToken(m), `agent:${m}`);
  for (const r of INLINE_REASONS) assert.equal(inlineToken(r), `inline:${r}`);
  assert.equal(agentToken("inherit"), null, "inherit is not an agent model");
  assert.equal(agentToken("floor-only"), null);
  assert.equal(inlineToken("opus"), null);
  assert.equal(inlineToken("toString"), null, "an inherited property name is not a member (L15)");
});

// ✧ PARITY (L31) — AGENT_MODELS is a copy of a platform fact AND of the config checker's alias set. Read the
// checker's SOURCE (it runs `process.exit(main())` at import, so it cannot be imported), find its one
// `MODEL_ALIASES` literal, and require AGENT_MODELS to equal it minus `inherit`. A new config alias then
// fails here until someone decides how it routes.
function checkerAliases(source) {
  const m = source.match(/^const MODEL_ALIASES = \[([^\]]*)\];$/m);
  assert.ok(m, "the checker's `const MODEL_ALIASES = [...]` line must be found — else the parity test is vacuous (L60)");
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

test("✧ PARITY: AGENT_MODELS equals check-model-config.mjs's MODEL_ALIASES minus `inherit`", () => {
  const aliases = checkerAliases(readFileSync(join(HERE, "check-model-config.mjs"), "utf8"));
  assert.ok(aliases.includes("inherit"), "the checker still accepts `inherit` — the one alias that is not an agent model");
  assert.deepEqual([...AGENT_MODELS].sort(), aliases.filter((a) => a !== "inherit").sort());
});

test("✧ PARITY DISCRIMINATES — a checker source with one more alias fails the comparison", () => {
  const real = readFileSync(join(HERE, "check-model-config.mjs"), "utf8");
  const mutant = real.replace('"inherit"];', '"inherit", "gemini"];');
  assert.notEqual(mutant, real, "precondition: the mutation must change the source (L34)");
  const aliases = checkerAliases(mutant);
  assert.notDeepEqual([...AGENT_MODELS].sort(), aliases.filter((a) => a !== "inherit").sort());
});
