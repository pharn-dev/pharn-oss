// pharn/floor/stage-exit-core.mjs — the SHARED stage-exit contract, `pharn-contracts/stage-exit.md`'s
// code half. Every stage script (pharn/floor/stage-regress.mjs since 6.23.0, pharn/floor/stage-verify.mjs
// since 6.26.0) emits exactly one JSON object per exit, built and validated through this module, so the
// envelope, the exit-code table and the closed reason_code / question vocabularies exist in ONE place rather
// than being re-typed per stage (P3 — the registry is KEYED BY STAGE, and each stage script adds its own
// entry rather than a new file).
//
// Floor infrastructure, NOT a Capability (no `role:`; it lives in the floor-ignored dir). Pure: no
// filesystem, no child_process, no network, no clock, no randomness.
//
// ================================== WHY A STAGE SCRIPT NEEDS THIS ==================================
// A `/pharn-*` command used to prescribe a HALT/ask/refuse in prose, and the model relayed it however it
// read the moment — a fixed reason_code and a fixed question text turn "ask the human something like…"
// into an ENUM (P5) a caller can branch on by MEMBERSHIP, never by re-reading free text. GRILL G17 is why
// `done`'s `verdict` is documented as a transient COPY rather than a second source of truth: the report on
// disk is named as the only place a machine consumer may read the verdict from.
//
// =========================================== THE ENVELOPE ===========================================
//   { "schema": "pharn-stage-exit/1", "status": <STATUSES>, "stage": <a REGISTRY key>, "feature": <slug>|null }
// plus, per `status`, EXACTLY the additional keys below — closed in BOTH directions (`validateStageExit`):
//   done     -> verdict, report, render
//   refused  -> reason_code, render
//   question -> reason_code, question, options, resume
//   continue -> phase, resume
//   unusable -> reason_code, detail
//
// EXIT CODES (the table `pharn/pharn-contracts/stage-exit.md` restates for a human):
//   0 done · 2 unusable · 3 refused · 4 question · 5 continue · anything else (1 included) = CRASHED —
//   node's own uncaught-throw code, so 1 is deliberately never a member of a deliberate emission (L62,
//   and the 6.21.1 "a crash is not read as a verdict" lesson this module structurally inherits: there is
//   no branch that could accidentally choose exit 1).
//
// ============================== THE QUESTION — FIXED TEXT, NO INTERPOLATION ==============================
// `question` and every option's `label` are FIXED strings keyed by `(stage, reason_code)` in `REGISTRY`.
// Nothing from a project file, a git ref, or a child's stdout is ever spliced into them (P2 — the object
// carries no untrusted free text). An option is `{id, label, argv, value}`:
//   • `argv`  — the flag delta to APPEND to the ORIGINAL fresh invocation's `resume.argv`, with the
//     literal token `"<value>"` replaced by the human's answer (`substituteArgv`). `argv: null` means
//     "stop, do not re-invoke".
//   • `value` — `null` (the option carries no answer, e.g. `--no-tests`) or `{kind}`, `kind` one of the
//     CLOSED `VALUE_KINDS`. Every kind is shape-checked control-char-free, bounded, and without a leading
//     `-` (`validateAnswer`); `git-commit` and `pathspec-list` are ADDITIONALLY held to a closed,
//     shell-metacharacter-free charset (GRILL G11), because those two answers are appended into a shell
//     line by command prose. `gates-spec` and `shell-command` are the human's own shell text, exactly as
//     `--gates`/`--install` already are — this module does not attempt to sanitize a shell command, it
//     only refuses control characters and a leading dash.
// The stage RE-VALIDATES an answer on re-invocation (an argv flag is parsed and shape-checked exactly like
// any other); this module supplies the one shared shape check, `validateAnswer`.
//
// ==================================== THE BUDGET DECISION (GRILL G5) ====================================
// `mayStartSlowStep` lives HERE, not in a stage-specific core, because it drives the shared `continue`
// status and every stage script reuses it UNCHANGED (through `stage-runtime.mjs`'s budget tracker) rather
// than importing a sibling stage's core or copying the rule (L35). The FIRST slow step of an invocation always starts (L58 — a script must make
// progress on every invocation, and it is what keeps partition -> head init -> the first head gate
// contiguous); after that, a step starts only while `elapsed + timeoutMs <= budgetMs`. With `budgetMs`
// absent (a code caller, never a Bash-tool caller — roadmap 2.1/2.2), nothing is budgeted.
//
// TRUST (P2): every operand this module touches is a string, an integer, or a plain object built by a
// stage script from its OWN closed choices (a reason_code, a phase name, an argv array). Nothing here
// reads a file, spawns a process, or interpolates untrusted text into a rendered string.

/** ------------------------------------------------------------------------------------------------
 *  Small helpers (the isCleanToken pattern this floor repeats per module rather than sharing — see
 *  gate-run-core.mjs's copy, mark-phase.mjs's, lessons-index-core.mjs's: each floor primitive owns its
 *  own tiny shape check rather than depending on a sibling for it).
 *  ---------------------------------------------------------------------------------------------- */
function isCleanToken(v, max = 256) {
  if (typeof v !== "string" || v.length === 0 || v.length > max) return false;
  for (let i = 0; i < v.length; i++) {
    const c = v.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return false;
  }
  return true;
}

function isNonEmptyString(v) {
  return typeof v === "string" && v.length > 0;
}

// M8 — a SEPARATE copy from gate-run-core.mjs's own FEATURE_SLUG_RE (this module imports NOTHING —
// see the header — so it cannot import that one instead). EXPORTED so a parity test can compare the two
// live regex objects rather than a re-typed literal; `stage-exit-core.test.mjs` pins them equal.
export const FEATURE_SLUG_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** ------------------------------------------------------------------------------------------------
 *  THE ENVELOPE + EXIT TABLE.
 *  ---------------------------------------------------------------------------------------------- */
export const SCHEMA = "pharn-stage-exit/1";

export const STATUSES = Object.freeze(["done", "refused", "question", "continue", "unusable"]);

/** status -> exit code. `1` is deliberately absent from every value here: it is node's own
 *  uncaught-throw / failed-module-load code, so a deliberate emission never chooses it (see the header). */
export const EXIT_CODE = Object.freeze({ done: 0, unusable: 2, refused: 3, question: 4, continue: 5 });

/** The closed SET of codes a deliberate exit may use — exactly `{0, 2, 3, 4, 5}`, and `1` is absent. */
export const EXIT_CODE_SET = Object.freeze(
  Object.values(EXIT_CODE)
    .slice()
    .sort((a, b) => a - b)
);

const STATUS_BY_CODE = Object.freeze(Object.fromEntries(Object.entries(EXIT_CODE).map(([s, c]) => [c, s])));

/** The status a deliberate exit code names, or `null` for anything outside the table (a CRASH — the
 *  caller must read "no status" as "no verdict", never guess one, per the header). */
export function statusForExitCode(code) {
  return Object.hasOwn(STATUS_BY_CODE, code) ? STATUS_BY_CODE[code] : null;
}

/** The additional keys EVERY status requires, beyond the four envelope keys. Closed in both directions by
 *  `validateStageExit` (L36 — a per-member presence set is satisfied by a variant spelling; only closure
 *  fails on an extra or a missing key). */
const STATUS_KEYS = Object.freeze({
  done: Object.freeze(["verdict", "report", "render"]),
  refused: Object.freeze(["reason_code", "render"]),
  question: Object.freeze(["reason_code", "question", "options", "resume"]),
  continue: Object.freeze(["phase", "resume"]),
  unusable: Object.freeze(["reason_code", "detail"]),
});

const ENVELOPE_KEYS = Object.freeze(["schema", "status", "stage", "feature"]);

/** ------------------------------------------------------------------------------------------------
 *  THE ANSWER-VALUE KINDS (GRILL G11).
 *  ---------------------------------------------------------------------------------------------- */
export const VALUE_KINDS = Object.freeze(["git-commit", "gates-spec", "shell-command", "pathspec-list"]);

/** `git-commit` / `pathspec-list` answers are held to this closed, shell-metacharacter-free charset,
 *  because command prose appends them into a shell line (single-quoted; GRILL G11). Letters, digits,
 *  `.`, `_`, `-`, `/` cover a SHA, a branch name (`origin/main`), and a repo-relative path; `pathspec-list`
 *  additionally allows `,` (the list separator) and `*` (a git pathspec glob). No quote, no `$`, no
 *  backtick, no `;`/`&`/`|`/`(`/`)`/`<`/`>`/whitespace/newline. */
const GIT_COMMIT_CHARSET_RE = /^[A-Za-z0-9._/-]+$/;
const PATHSPEC_LIST_CHARSET_RE = /^[A-Za-z0-9._/,*-]+$/;

/**
 * Shape-check a human's answer to a question option, by `kind` (`option.value.kind`).
 * Returns `{ok: true}` or `{ok: false, reason}`. NEVER throws on untrusted input — an unrecognized `kind`
 * is a caller bug (thrown), but the ANSWER itself only ever produces a `reason`.
 */
export function validateAnswer(kind, answer) {
  if (!VALUE_KINDS.includes(kind)) throw new Error(`internal: '${kind}' is not a member of VALUE_KINDS`);
  if (!isCleanToken(answer, 4096)) {
    return { ok: false, reason: "the answer must be a non-empty, control-char-free string of at most 4096 characters" };
  }
  if (answer.startsWith("-")) {
    return { ok: false, reason: "the answer may not begin with '-' (it would be read as a flag)" };
  }
  if (kind === "git-commit" && !GIT_COMMIT_CHARSET_RE.test(answer)) {
    return { ok: false, reason: `a git-commit answer must match ${GIT_COMMIT_CHARSET_RE} (letters, digits, '.', '_', '-', '/' only)` };
  }
  if (kind === "pathspec-list" && !PATHSPEC_LIST_CHARSET_RE.test(answer)) {
    return {
      ok: false,
      reason: `a pathspec-list answer must match ${PATHSPEC_LIST_CHARSET_RE} (letters, digits, '.', '_', '-', '/', ',', '*' only)`,
    };
  }
  // gates-spec / shell-command: the human's own shell text, exactly as --gates/--install are today. This
  // module refuses only control characters and a leading dash; it is not a shell sanitizer.
  return { ok: true };
}

/** Append an option's `argv` delta to a `resume.argv`, substituting the literal token `"<value>"` with the
 *  human's answer. `argvTemplate: null` (a "stop" option) returns `null` — never re-invoked. */
export function substituteArgv(argvTemplate, answer) {
  if (argvTemplate === null) return null;
  return argvTemplate.map((tok) => (tok === "<value>" ? answer : tok));
}

const OPTION_KEYS = Object.freeze(["id", "label", "argv", "value"]);

function isValidOption(opt) {
  if (opt === null || typeof opt !== "object" || Array.isArray(opt)) return false;
  // Closed in both directions (F1): exactly {id, label, argv, value} — no missing key, no extra one.
  const keys = Object.keys(opt);
  if (keys.length !== OPTION_KEYS.length || !OPTION_KEYS.every((k) => keys.includes(k))) return false;
  if (!isCleanToken(opt.id, 64)) return false;
  if (!isNonEmptyString(opt.label)) return false;
  if (opt.argv !== null && !(Array.isArray(opt.argv) && opt.argv.every((t) => typeof t === "string" && t.length > 0))) return false;
  if (opt.value !== null) {
    if (typeof opt.value !== "object" || Array.isArray(opt.value)) return false;
    if (!VALUE_KINDS.includes(opt.value.kind)) return false;
    if (Object.keys(opt.value).length !== 1) return false; // closed: {kind} only
  }
  return true;
}

/** F1 — a shape-valid option is not enough: `id`, `label`, every `argv` token, and `value.kind` must
 *  byte-equal the REGISTRY's own fixed option at the same position. A forged label, a forged argv, an
 *  added option, or a removed option must all fail this, not merely `isValidOption`'s shape check. Options
 *  are POSITIONAL (the registry's own array order), so this is a plain index-wise structural comparison —
 *  no generic deep-equal is pulled in for a shape this narrow (id: string, label: string, argv: null |
 *  string[], value: null | {kind}). */
function optionsMatchRegistry(candidate, registryOptions) {
  if (candidate.length !== registryOptions.length) return false;
  for (let i = 0; i < candidate.length; i++) {
    const c = candidate[i];
    const r = registryOptions[i];
    if (c.id !== r.id) return false;
    if (c.label !== r.label) return false;
    if (c.argv === null || r.argv === null) {
      if (c.argv !== r.argv) return false;
    } else {
      if (c.argv.length !== r.argv.length) return false;
      for (let j = 0; j < c.argv.length; j++) if (c.argv[j] !== r.argv[j]) return false;
    }
    if (c.value === null || r.value === null) {
      if (c.value !== r.value) return false;
    } else if (c.value.kind !== r.value.kind) {
      return false;
    }
  }
  return true;
}

/** ------------------------------------------------------------------------------------------------
 *  THE PER-STAGE REGISTRY. Keyed by stage (P3 — each stage script adds its own key, touching nothing
 *  below). Every question's text and every option's label are FIXED here; a stage script never composes
 *  one at runtime.
 *  ---------------------------------------------------------------------------------------------- */
export const REGISTRY = Object.freeze({
  regress: Object.freeze({
    question: Object.freeze({
      "base-unresolved": Object.freeze({
        question:
          "The base commit could not be resolved automatically: the working tree is clean (so base is not HEAD) and " +
          "`git merge-base HEAD origin/main` did not resolve (a detached checkout, a shallow clone, or no `origin/main`). " +
          "Which commit should the comparison use as its base?",
        options: Object.freeze([
          Object.freeze({
            id: "base",
            label: "Supply a base ref or commit",
            argv: Object.freeze(["--base", "<value>"]),
            value: Object.freeze({ kind: "git-commit" }),
          }),
        ]),
      }),
      // GRILL G12: the fixed text names all three causes a discovered set can empty into, so the human
      // is not left guessing which of them applies.
      "no-gates": Object.freeze({
        question:
          "No deterministic gate was found to run. This can be because: (1) no --gates was given and package.json " +
          "declares none of the allowlisted scripts; (2) the discovered scripts are e2e-only, which /pharn-regress " +
          "never runs (e2e is verify-only); or (3) every discovered gate was style-only and the config-touch rule " +
          "skipped it because no shared style config changed. Which gates should run, if any?",
        options: Object.freeze([
          Object.freeze({
            id: "gates",
            label: "Name the gates explicitly",
            argv: Object.freeze(["--gates", "<value>"]),
            value: Object.freeze({ kind: "gates-spec" }),
          }),
          Object.freeze({ id: "stop", label: "Stop — there is nothing to run", argv: null, value: null }),
        ]),
      }),
      "install-unresolved": Object.freeze({
        question:
          "The base worktree's dependency-install command could not be determined: there is a package.json but no " +
          "recognized single lockfile (none of package-lock.json/npm-shrinkwrap.json, pnpm-lock.yaml, yarn.lock, " +
          "bun.lock/bun.lockb — or more than one family is present). How should dependencies be installed at the base commit?",
        options: Object.freeze([
          Object.freeze({
            id: "install",
            label: "Supply the install command",
            argv: Object.freeze(["--install", "<value>"]),
            value: Object.freeze({ kind: "shell-command" }),
          }),
          Object.freeze({ id: "no-install", label: "Skip the install step", argv: Object.freeze(["--no-install"]), value: null }),
        ]),
      }),
      // GRILL G16: fires whenever the universe empties WITHOUT an explicit --no-tests, including a
      // --tests pathspec that matched no file, so a typo never silently runs no tests.
      "tests-unresolved": Object.freeze({
        question:
          "The outside-scope test-file universe is empty (either the default rule matched nothing, or --tests " +
          "matched no file), and --no-tests was not given. Is an empty test universe intended?",
        options: Object.freeze([
          Object.freeze({
            id: "tests",
            label: "Supply a test pathspec",
            argv: Object.freeze(["--tests", "<value>"]),
            value: Object.freeze({ kind: "pathspec-list" }),
          }),
          Object.freeze({
            id: "no-tests",
            label: "Confirm that no tests should run",
            argv: Object.freeze(["--no-tests"]),
            value: null,
          }),
        ]),
      }),
    }),
    refused: Object.freeze(["missing-artifact", "chain-red", "plan-files-unparseable", "scope-escaped"]),
    unusable: Object.freeze([
      "usage-error",
      "no-feature",
      "path-containment",
      "unrepresentable-path",
      "git-failed",
      "child-crashed",
      "child-refused",
      "no-progress",
      "progress-malformed",
    ]),
  }),
  // stage-verify-script (6.26.0): `/pharn-verify`'s vocabulary. ONE question — verify has no base, no install and
  // no test partition to ask about — and it fires only on the runner's own empty source set (`run-gates.mjs init`
  // exit 3), which an explicit `--gates` never reaches, so the answer's `--gates` is the only one on the re-run.
  verify: Object.freeze({
    question: Object.freeze({
      // Verify's one cause (no --gates, and no allowlisted script or no package.json), plus the caveat the AC gate
      // makes true: a level gate named through --gates is not the discovered `npm run <id>` the AC-test lock pinned.
      "no-gates": Object.freeze({
        question:
          "No deterministic gate was found to run: no --gates was given, and package.json is absent or declares none " +
          "of the allowlisted gate scripts. For a SPEC written from the template, gates named with --gates are read by " +
          "the AC gate as not the discovered `npm run <id>` (test-infra-changed for a test-first SPEC, ac-untested for a " +
          "spec_kind: test-infra one), so adding the missing script to package.json is the better answer there. Which " +
          "gates should run, if any?",
        options: Object.freeze([
          Object.freeze({
            id: "gates",
            label: "Name the gates explicitly",
            argv: Object.freeze(["--gates", "<value>"]),
            value: Object.freeze({ kind: "gates-spec" }),
          }),
          Object.freeze({ id: "stop", label: "Stop — there is nothing to run", argv: null, value: null }),
        ]),
      }),
    }),
    refused: Object.freeze(["missing-artifact", "chain-red", "plan-files-unparseable"]),
    unusable: Object.freeze([
      "usage-error",
      "no-feature",
      "path-containment",
      "git-failed",
      "child-crashed",
      "child-refused",
      "no-progress",
      "progress-malformed",
    ]),
  }),
});

export const STAGES = Object.freeze(Object.keys(REGISTRY));

/** Is `code` a registered reason_code for `(stage, status)`? `status` must be one of `refused | question |
 *  unusable` — `done` and `continue` carry no reason_code, by the envelope's own closed key sets. */
export function isReasonCode(stage, status, code) {
  const reg = REGISTRY[stage];
  if (!reg) return false;
  if (status === "question") return Object.hasOwn(reg.question, code);
  if (status === "refused" || status === "unusable") return Array.isArray(reg[status]) && reg[status].includes(code);
  return false;
}

/** Every `reason_code` this stage's registry names, across `refused`, `question` and `unusable` — the
 *  membership set a stage script's own literal emissions are tested for closure against (GRILL G36-style:
 *  every literal a script emits must be a registry member). */
export function allReasonCodes(stage) {
  const reg = REGISTRY[stage];
  if (!reg) return [];
  return [...reg.refused, ...Object.keys(reg.question), ...reg.unusable];
}

/** ------------------------------------------------------------------------------------------------
 *  BUILDERS. Each throws on a caller-side programming error (an unregistered stage or reason_code — never
 *  reachable from untrusted input, since a stage script chooses its own reason_code from its own registry
 *  import) and otherwise returns a plain object satisfying `validateStageExit`.
 *  ---------------------------------------------------------------------------------------------- */
function assertStage(stage) {
  if (!STAGES.includes(stage)) throw new Error(`internal: '${stage}' is not a registered stage-exit stage`);
}

function assertFeature(feature) {
  if (feature !== null && !(isCleanToken(feature, 64) && FEATURE_SLUG_RE.test(feature))) {
    throw new Error(`internal: feature must be a plain slug or null, got ${JSON.stringify(feature)}`);
  }
}

export function doneExit({ stage, feature, verdict, report, render }) {
  assertStage(stage);
  assertFeature(feature);
  if (!isNonEmptyString(verdict)) throw new Error("internal: doneExit requires a non-empty string verdict");
  if (!isNonEmptyString(report)) throw new Error("internal: doneExit requires a non-empty string report path");
  if (!isNonEmptyString(render)) throw new Error("internal: doneExit requires a non-empty string render path");
  return { schema: SCHEMA, status: "done", stage, feature, verdict, report, render };
}

export function refusedExit({ stage, feature, reasonCode, render }) {
  assertStage(stage);
  assertFeature(feature);
  if (!isReasonCode(stage, "refused", reasonCode)) {
    throw new Error(`internal: '${reasonCode}' is not a registered 'refused' reason_code for stage '${stage}'`);
  }
  if (!isNonEmptyString(render)) throw new Error("internal: refusedExit requires a non-empty string render path");
  return { schema: SCHEMA, status: "refused", stage, feature, reason_code: reasonCode, render };
}

export function unusableExit({ stage, feature, reasonCode, detail }) {
  assertStage(stage);
  assertFeature(feature);
  if (!isReasonCode(stage, "unusable", reasonCode)) {
    throw new Error(`internal: '${reasonCode}' is not a registered 'unusable' reason_code for stage '${stage}'`);
  }
  if (!isNonEmptyString(detail)) throw new Error("internal: unusableExit requires a non-empty string detail");
  return { schema: SCHEMA, status: "unusable", stage, feature, reason_code: reasonCode, detail };
}

export function continueExit({ stage, feature, phase, resumeArgv }) {
  assertStage(stage);
  assertFeature(feature);
  if (!isNonEmptyString(phase)) throw new Error("internal: continueExit requires a non-empty string phase");
  if (!Array.isArray(resumeArgv) || !resumeArgv.every((t) => typeof t === "string")) {
    throw new Error("internal: continueExit requires resumeArgv to be a string array");
  }
  return { schema: SCHEMA, status: "continue", stage, feature, phase, resume: { argv: resumeArgv } };
}

export function questionExit({ stage, feature, reasonCode, resumeArgv }) {
  assertStage(stage);
  assertFeature(feature);
  if (!isReasonCode(stage, "question", reasonCode)) {
    throw new Error(`internal: '${reasonCode}' is not a registered 'question' reason_code for stage '${stage}'`);
  }
  if (!Array.isArray(resumeArgv) || !resumeArgv.every((t) => typeof t === "string")) {
    throw new Error("internal: questionExit requires resumeArgv to be a string array");
  }
  const entry = REGISTRY[stage].question[reasonCode];
  return {
    schema: SCHEMA,
    status: "question",
    stage,
    feature,
    reason_code: reasonCode,
    question: entry.question,
    options: entry.options,
    resume: { argv: resumeArgv },
  };
}

/** ------------------------------------------------------------------------------------------------
 *  THE VALIDATOR — closed in BOTH directions: every key `status` requires must be present, and no key
 *  outside that status's set may appear (L36).
 *  ---------------------------------------------------------------------------------------------- */
export function validateStageExit(obj) {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false, reason: "a stage-exit object must be a JSON object" };
  }
  if (obj.schema !== SCHEMA) return { ok: false, reason: `schema must be ${JSON.stringify(SCHEMA)}, got ${JSON.stringify(obj.schema)}` };
  if (!STATUSES.includes(obj.status)) return { ok: false, reason: `status must be one of ${STATUSES.join(" | ")}` };
  if (!STAGES.includes(obj.stage))
    return { ok: false, reason: `stage must be one of ${STAGES.join(" | ")}, got ${JSON.stringify(obj.stage)}` };
  if (obj.feature !== null && !(isCleanToken(obj.feature, 64) && FEATURE_SLUG_RE.test(obj.feature))) {
    return { ok: false, reason: "feature must be a plain slug or null" };
  }

  const required = [...ENVELOPE_KEYS, ...STATUS_KEYS[obj.status]];
  const allowed = new Set(required);
  for (const k of Object.keys(obj)) {
    if (!allowed.has(k)) return { ok: false, reason: `status ${JSON.stringify(obj.status)} does not admit key ${JSON.stringify(k)}` };
  }
  for (const k of required) {
    if (!Object.hasOwn(obj, k)) return { ok: false, reason: `status ${JSON.stringify(obj.status)} requires key ${JSON.stringify(k)}` };
  }

  if (obj.status === "done") {
    if (!isNonEmptyString(obj.verdict)) return { ok: false, reason: "done.verdict must be a non-empty string" };
    if (!isNonEmptyString(obj.report)) return { ok: false, reason: "done.report must be a non-empty string (a path)" };
    if (!isNonEmptyString(obj.render)) return { ok: false, reason: "done.render must be a non-empty string (a path)" };
    return { ok: true };
  }
  if (obj.status === "refused") {
    if (!isReasonCode(obj.stage, "refused", obj.reason_code)) {
      return { ok: false, reason: `refused.reason_code ${JSON.stringify(obj.reason_code)} is not registered for stage ${obj.stage}` };
    }
    if (!isNonEmptyString(obj.render)) return { ok: false, reason: "refused.render must be a non-empty string (a path)" };
    return { ok: true };
  }
  if (obj.status === "unusable") {
    if (!isReasonCode(obj.stage, "unusable", obj.reason_code)) {
      return { ok: false, reason: `unusable.reason_code ${JSON.stringify(obj.reason_code)} is not registered for stage ${obj.stage}` };
    }
    if (!isNonEmptyString(obj.detail)) return { ok: false, reason: "unusable.detail must be a non-empty string" };
    return { ok: true };
  }
  if (obj.status === "continue") {
    if (!isNonEmptyString(obj.phase)) return { ok: false, reason: "continue.phase must be a non-empty string" };
    if (obj.resume === null || typeof obj.resume !== "object" || Array.isArray(obj.resume)) {
      return { ok: false, reason: "continue.resume must be an object" };
    }
    if (Object.keys(obj.resume).length !== 1 || !Array.isArray(obj.resume.argv) || !obj.resume.argv.every((t) => typeof t === "string")) {
      return { ok: false, reason: "continue.resume must be exactly {argv: string[]}" };
    }
    return { ok: true };
  }
  // question
  if (!isReasonCode(obj.stage, "question", obj.reason_code)) {
    return { ok: false, reason: `question.reason_code ${JSON.stringify(obj.reason_code)} is not registered for stage ${obj.stage}` };
  }
  const entry = REGISTRY[obj.stage].question[obj.reason_code];
  if (obj.question !== entry.question) return { ok: false, reason: "question.question must be the FIXED text for this reason_code" };
  if (!Array.isArray(obj.options)) return { ok: false, reason: "question.options must be an array" };
  for (const opt of obj.options) {
    if (!isValidOption(opt)) return { ok: false, reason: `question.options entry is malformed: ${JSON.stringify(opt)}` };
  }
  // F1 — shape alone is not the floor claim: `options` must byte-equal the registry's OWN fixed option
  // list for this (stage, reason_code) — every id/label/argv/value.kind, and no added or removed option.
  if (!optionsMatchRegistry(obj.options, entry.options)) {
    return { ok: false, reason: "question.options must deep-equal the registry's FIXED options for this reason_code" };
  }
  if (obj.resume === null || typeof obj.resume !== "object" || Array.isArray(obj.resume)) {
    return { ok: false, reason: "question.resume must be an object" };
  }
  if (Object.keys(obj.resume).length !== 1 || !Array.isArray(obj.resume.argv) || !obj.resume.argv.every((t) => typeof t === "string")) {
    return { ok: false, reason: "question.resume must be exactly {argv: string[]}" };
  }
  return { ok: true };
}

/** ------------------------------------------------------------------------------------------------
 *  THE BUDGET DECISION (GRILL G5) — shared by every stage script's `continue` status. See the header.
 *  ---------------------------------------------------------------------------------------------- */
export function mayStartSlowStep({ elapsedMs, timeoutMs, budgetMs, slowStepsThisInvocation }) {
  if (!Number.isInteger(elapsedMs) || elapsedMs < 0)
    throw new Error("internal: mayStartSlowStep requires a non-negative integer elapsedMs");
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) throw new Error("internal: mayStartSlowStep requires a positive integer timeoutMs");
  if (!Number.isInteger(slowStepsThisInvocation) || slowStepsThisInvocation < 0) {
    throw new Error("internal: mayStartSlowStep requires a non-negative integer slowStepsThisInvocation");
  }
  if (slowStepsThisInvocation === 0) return true; // the first-always rule (L58)
  if (budgetMs === null || budgetMs === undefined) return true; // unbudgeted: run to completion
  if (!Number.isInteger(budgetMs) || budgetMs < 0) throw new Error("internal: mayStartSlowStep requires a non-negative integer budgetMs");
  return elapsedMs + timeoutMs <= budgetMs;
}
