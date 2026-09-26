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
  assert.deepEqual(STAGES, ["regress"]);
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
  assert.equal(validateStageExit({ ...base, stage: "verify" }).ok, false, "verify is not yet a registered stage");
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
