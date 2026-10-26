// pharn/floor/check-run-isolation-core.mjs — the PURE rules of /pharn-loop's ENTRY ISOLATION CHECK (loop-isolation-stop,
// 7.1.0): the frozen evidence lists, the outcome, the exit decision, the one witness grammar and the one line every
// reader prints. No filesystem, no environment, no child process, no clock: the execution half,
// `check-run-isolation.mjs`, builds a plain PROBE object from the machine and hands it in (P3 — this file changes when
// a RULE changes, that one when a probe or the CLI does; the pre-run-snapshot precedent).
//
// ==================================== WHY (P7) ====================================
// The 2026-10-12 independent review's SEC-1, SEC-3 and SEC-5 each reproduced a way an unattended run reaches code or
// canon with no prompt. Each was narrowed in its own PR, and each left the residual pharn/LIMITS.md §6 names: the only true
// prevention is OS-level sandboxing of the Bash process, which PHARN does not implement. Until 7.1.0 /pharn-loop met
// that residual with one advisory sentence. This check turns it into a refusal at entry: an unattended run starts only
// where there is evidence of an isolated environment holding none of the listed credentials, or after the operator
// passed `--accept-host-execution`, which the record and the commit message then name.
//
// ==================================== THE RULE ====================================
// ISOLATION_CODES — one hit = evidence of an isolated environment. CREDENTIAL_CODES — evaluated regardless of
// isolation, because a container holding the user's secrets is not isolated for SEC-1's purpose; one hit =
// credentialed. `classify(evidence)`:
//   no isolation code                         → HOST
//   an isolation code and a credential code   → ISOLATED_WITH_CREDENTIALS
//   an isolation code and no credential code  → ISOLATED
// `evaluate(probe, accept)` adds the exit: ISOLATED → 0; HOST / ISOLATED_WITH_CREDENTIALS → 0 with the flag, else 2
// (`not-isolated` / `credentials-present`). Evidence that could not be gathered is never an outcome: an unreadable
// HOME is `unreadable-home`, a `git config` that could not be read is `probe-failed`, and the flag accepts NEITHER —
// it accepts a known risk, never an unknown one (GATE 1, question 2).
//
// THE SELECTION RULE for CREDENTIAL_CODES: a file or env var whose presence alone gives a process write, push or deploy
// access to a remote system (git hosting, a package registry, a cloud account, a deploy platform). NOT on the list, each
// with its reason (pharn/pharn-contracts/loop-record.md, "The isolation field"): GITHUB_TOKEN (ephemeral and scoped by
// the workflow's `permissions:` in Actions, and present in every run there; in a codespace it is long-lived, but the
// codespace's credential helper is already a signal); ANTHROPIC_API_KEY and ~/.claude/ (the agent's own model
// credential — always present, the exfiltration residual this stop does not touch); ~/.docker/config.json and
// ~/.kube/config (either can hold only non-secret settings, and no failure has named them yet, P7).
//
// ==================================== HONEST SCOPE (P0) ====================================
// • FLOOR: the verdict over a probe — closed lists, string equality, set membership. Nothing here judges.
// • ADVISORY, and struck as a guarantee: "the environment is isolated" and "no credential is reachable". Every probe
//   input is environment-supplied: the operator can set PHARN_ISOLATED=1, plant /.dockerenv or empty HOME, and so can a
//   project's own `.claude/settings.json` `env` block, which is project content. The check binds the honest operator,
//   not the hostile one. The lists are closed and partial by design: a token in a project `.env`, a keychain, a cloud
//   metadata endpoint or the model credential are outside them.
// • The floor sees argv, never who typed `--accept-host-execution`.
//
// TRUST (P2): a probe holds booleans and env strings; only frozen codes and fixed phrases leave this file, so no value
// from the environment or a file ever reaches a message, a record or a commit (L62). TOTAL: every export returns for
// any input, a parsed-JSON value or a hostile object included.

/** Isolation evidence, in output order. The ONE owner (L35); the contract's table is pinned to it. */
export const ISOLATION_CODES = Object.freeze([
  "fs:dockerenv",
  "fs:containerenv",
  "fs:proc1-cgroup",
  "env:REMOTE_CONTAINERS",
  "env:CODESPACES",
  "env:GITPOD_WORKSPACE_ID",
  "env:GITHUB_ACTIONS",
  "operator:PHARN_ISOLATED",
]);

/** Credential signals, in output order. The ONE owner (L35); the contract's table is pinned to it. */
export const CREDENTIAL_CODES = Object.freeze([
  "cred:ssh-dir",
  "cred:ssh-agent",
  "cred:gh-hosts",
  "cred:env:GH_TOKEN",
  "cred:git-credentials",
  "cred:credential-helper",
  "cred:netrc",
  "cred:aws-credentials",
  "cred:npmrc-home",
  "cred:npmrc-repo",
  "cred:env:NPM_TOKEN",
  "cred:env:AWS_ACCESS_KEY_ID",
  "cred:env:AWS_SECRET_ACCESS_KEY",
  "cred:env:VERCEL_TOKEN",
  "cred:env:SUPABASE_ACCESS_TOKEN",
  "cred:env:STRIPE_SECRET_KEY",
]);

export const OUTCOMES = Object.freeze(["ISOLATED", "HOST", "ISOLATED_WITH_CREDENTIALS"]);

/** The closed refusal reasons the CLI prints on stderr. */
export const REASONS = Object.freeze(["not-isolated", "credentials-present", "unreadable-home", "probe-failed", "usage", "crashed"]);

/** The env isolation codes: name → the exact value that counts (null = any non-empty value). */
export const ISOLATION_ENV = Object.freeze([
  Object.freeze({ code: "env:REMOTE_CONTAINERS", name: "REMOTE_CONTAINERS", value: "true" }),
  Object.freeze({ code: "env:CODESPACES", name: "CODESPACES", value: "true" }),
  Object.freeze({ code: "env:GITPOD_WORKSPACE_ID", name: "GITPOD_WORKSPACE_ID", value: null }),
  Object.freeze({ code: "env:GITHUB_ACTIONS", name: "GITHUB_ACTIONS", value: "true" }),
  Object.freeze({ code: "operator:PHARN_ISOLATED", name: "PHARN_ISOLATED", value: "1" }),
]);

/** The credential env vars: each counts when set to a non-empty value. The code is `cred:env:<name>`. */
export const CREDENTIAL_ENV = Object.freeze([
  "GH_TOKEN",
  "NPM_TOKEN",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "VERCEL_TOKEN",
  "SUPABASE_ACCESS_TOKEN",
  "STRIPE_SECRET_KEY",
]);

/** Every env var the probe reads, beyond the two above: the home directory and the agent socket. */
export const PROBE_ENV = Object.freeze(["HOME", "USERPROFILE", "SSH_AUTH_SOCK"]);

/** `/proc/1/cgroup` naming one of these runtimes is container evidence. */
export const CGROUP_RE = /docker|containerd|podman|lxc|kubepods/;

/** The probe's boolean credential facts → their codes, in CREDENTIAL_CODES order (env codes are read from `env`). */
const FACT_CODES = Object.freeze([
  ["home", "sshDir", "cred:ssh-dir"],
  [null, "sshAgent", "cred:ssh-agent"],
  ["home", "ghHosts", "cred:gh-hosts"],
  ["home", "gitCredentials", "cred:git-credentials"],
  [null, "credentialHelper", "cred:credential-helper"],
  ["home", "netrc", "cred:netrc"],
  ["home", "awsCredentials", "cred:aws-credentials"],
  ["home", "npmrc", "cred:npmrc-home"],
  ["repo", "npmrc", "cred:npmrc-repo"],
]);

const ISO_SET = new Set(ISOLATION_CODES);
const CRED_SET = new Set(CREDENTIAL_CODES);
const ORDER = new Map([...ISOLATION_CODES, ...CREDENTIAL_CODES].map((c, i) => [c, i]));
const RECORD_KEYS = Object.freeze(["outcome", "evidence", "accepted_host_execution"]);

const isRecord = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const own = (o, k) => (isRecord(o) && Object.hasOwn(o, k) ? o[k] : undefined);
const nonEmpty = (v) => typeof v === "string" && v !== "";

/** The outcome a list of codes reduces to. Codes outside both lists are ignored here (the parser refuses them). */
export function classify(evidence) {
  const list = Array.isArray(evidence) ? evidence : [];
  const iso = list.some((c) => ISO_SET.has(c));
  const cred = list.some((c) => CRED_SET.has(c));
  if (!iso) return "HOST";
  return cred ? "ISOLATED_WITH_CREDENTIALS" : "ISOLATED";
}

/** The evidence codes a probe holds, in frozen order. A fact counts only when it is exactly `true`. */
export function evidenceOf(probe) {
  const env = own(probe, "env");
  const fs = own(probe, "fs");
  const hits = new Set();
  if (own(fs, "dockerenv") === true) hits.add("fs:dockerenv");
  if (own(fs, "containerenv") === true) hits.add("fs:containerenv");
  const cg = own(fs, "proc1Cgroup");
  if (typeof cg === "string" && CGROUP_RE.test(cg)) hits.add("fs:proc1-cgroup");
  for (const e of ISOLATION_ENV) {
    const v = own(env, e.name);
    if (e.value === null ? nonEmpty(v) : v === e.value) hits.add(e.code);
  }
  for (const [group, key, code] of FACT_CODES) {
    const holder = group === null ? probe : own(probe, group);
    if (own(holder, key) === true) hits.add(code);
  }
  for (const name of CREDENTIAL_ENV) if (nonEmpty(own(env, name))) hits.add(`cred:env:${name}`);
  return [...hits].sort((a, b) => ORDER.get(a) - ORDER.get(b));
}

/**
 * The decision over a probe. `{ exit: 0 | 2, reason: null | REASONS member, record: null | {outcome, evidence,
 * accepted_host_execution} }`. `record` is null when the evidence is unknown (unreadable HOME, a failed probe, a
 * non-object probe) — then there is nothing true to record.
 */
export function evaluate(probe, accept = false) {
  const flag = accept === true;
  if (!isRecord(probe)) return { exit: 2, reason: "crashed", record: null };
  if (own(own(probe, "home"), "ok") !== true) return { exit: 2, reason: "unreadable-home", record: null };
  if (typeof own(probe, "credentialHelper") !== "boolean") return { exit: 2, reason: "probe-failed", record: null };
  const evidence = evidenceOf(probe);
  const outcome = classify(evidence);
  const record = { outcome, evidence, accepted_host_execution: flag };
  if (outcome === "ISOLATED" || flag) return { exit: 0, reason: null, record };
  return { exit: 2, reason: outcome === "HOST" ? "not-isolated" : "credentials-present", record };
}

/** The one rendering of a record — the CLI's stdout line, and the bytes LOOP.md's `isolation:` value must equal. */
export function renderIsolationLine(record) {
  return JSON.stringify({
    outcome: own(record, "outcome"),
    evidence: own(record, "evidence"),
    accepted_host_execution: own(record, "accepted_host_execution"),
  });
}

/**
 * The ONE witness grammar (L35): the text of `pharn/.run/pharn-loop/<name>/isolation.json`, or LOOP.md's `isolation:`
 * value, → the record, or null. Exactly one line (one trailing newline allowed), canonical bytes (what
 * renderIsolationLine prints), exactly the three keys, closed values, codes from the lists in frozen order without
 * repeats, and an outcome equal to what the codes classify to.
 */
export function parseIsolationLine(text) {
  if (typeof text !== "string" || text.length > 4096) return null;
  const line = text.endsWith("\n") ? text.slice(0, -1) : text;
  if (line === "" || line.includes("\n") || line.includes("\r")) return null;
  let doc;
  try {
    doc = JSON.parse(line);
  } catch {
    return null;
  }
  if (!isRecord(doc)) return null;
  const keys = Object.keys(doc);
  if (keys.length !== RECORD_KEYS.length || !RECORD_KEYS.every((k, i) => keys[i] === k)) return null;
  const { outcome, evidence, accepted_host_execution: accepted } = doc;
  if (typeof outcome !== "string" || !OUTCOMES.includes(outcome)) return null;
  if (typeof accepted !== "boolean" || !Array.isArray(evidence)) return null;
  let last = -1;
  for (const c of evidence) {
    if (typeof c !== "string" || !ORDER.has(c) || ORDER.get(c) <= last) return null;
    last = ORDER.get(c);
  }
  if (classify(evidence) !== outcome) return null;
  const record = { outcome, evidence: [...evidence], accepted_host_execution: accepted };
  return renderIsolationLine(record) === line ? record : null;
}

/** Did a run with this record get past the check? (A refused run writes no record — GATE 1, question 1.) */
export function admitted(record) {
  const outcome = own(record, "outcome");
  return outcome === "ISOLATED" || (OUTCOMES.includes(outcome) && own(record, "accepted_host_execution") === true);
}

export const ACCEPTED_SUFFIX = " (host execution accepted by operator)";

/** Marks a witness no admitted run can write (a refused outcome without the flag): the run should have stopped at S15. */
export const NOT_ADMITTED_SUFFIX = " — NOT ADMITTED: the check refuses this outcome, so the run should have stopped at S15";

/** The one human line every reader prints: `isolation: <outcome>` [+ the accepted suffix | the not-admitted marker], or
 *  the not-recorded line. */
export function isolationLine(record, name = "<name>") {
  if (!isRecord(record) || !OUTCOMES.includes(own(record, "outcome"))) {
    return `isolation: not recorded (no usable pharn/.run/pharn-loop/${name}/isolation.json)`;
  }
  if (!admitted(record)) return `isolation: ${record.outcome}${NOT_ADMITTED_SUFFIX}`;
  return `isolation: ${record.outcome}${record.accepted_host_execution === true ? ACCEPTED_SUFFIX : ""}`;
}

const WAYS_OUT =
  "Run the loop in a container that mounts none of your credentials; set PHARN_ISOLATED=1 if you run it in a sandbox " +
  "this check does not detect; or re-run with --accept-host-execution before the description and own the risk " +
  "(pharn/LIMITS.md §6).";

/** The fixed stderr text per reason. No value from the probe ever enters it (L62). */
export const REFUSAL_TEXT = Object.freeze({
  "not-isolated": `no evidence of an isolated environment was found. ${WAYS_OUT}`,
  "credentials-present": `the environment looks isolated but holds a listed credential (see the evidence codes on stdout). ${WAYS_OUT}`,
  "unreadable-home":
    "HOME (or USERPROFILE) is unset, not absolute, or not a readable directory, so the credential files cannot be " +
    "checked. Set HOME to a readable directory; --accept-host-execution does not accept unknown evidence (pharn/LIMITS.md §6).",
  "probe-failed":
    "`git config` could not be read to look for a credential helper, so the evidence is incomplete. Fix git, then " +
    "re-run; --accept-host-execution does not accept unknown evidence (pharn/LIMITS.md §6).",
  usage: "usage: node pharn/floor/check-run-isolation.mjs --feature <name> [--accept-host-execution]",
  crashed: "the check failed internally, so no verdict exists. Treat it as a refusal (pharn/LIMITS.md §6).",
});

/** The one stderr line for a reason. */
export function refusalLine(reason) {
  const text = Object.hasOwn(REFUSAL_TEXT, reason) ? REFUSAL_TEXT[reason] : REFUSAL_TEXT.crashed;
  const code = REASONS.includes(reason) ? reason : "crashed";
  return `check-run-isolation: refused ${code} — ${text}`;
}
