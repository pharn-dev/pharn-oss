// pharn/floor/check-run-isolation-core.test.mjs — the PURE rule of /pharn-loop's entry isolation check, over fake probe
// objects (loop-isolation-stop, 7.1.0). ★ = behaviour of the rule; ✧ = a pin on a list or a document.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ACCEPTED_SUFFIX,
  CREDENTIAL_CODES,
  CREDENTIAL_ENV,
  ISOLATION_CODES,
  ISOLATION_ENV,
  OUTCOMES,
  REASONS,
  REFUSAL_TEXT,
  admitted,
  classify,
  evaluate,
  evidenceOf,
  isolationLine,
  parseIsolationLine,
  refusalLine,
  renderIsolationLine,
} from "./check-run-isolation-core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const CONTRACT = join(here, "..", "pharn-contracts", "loop-record.md");

/** A probe with no evidence of anything: HOME readable, no credential fact, no env, no fs marker. */
function blank() {
  return {
    env: {},
    fs: { dockerenv: false, containerenv: false, proc1Cgroup: null },
    home: { ok: true, sshDir: false, ghHosts: false, gitCredentials: false, netrc: false, awsCredentials: false, npmrc: false },
    repo: { npmrc: false },
    sshAgent: false,
    credentialHelper: false,
  };
}

/** A probe holding exactly the one evidence code `code`. */
function probeWith(code, base = blank()) {
  const p = structuredClone(base);
  const isoEnv = ISOLATION_ENV.find((e) => e.code === code);
  if (code === "fs:dockerenv") p.fs.dockerenv = true;
  else if (code === "fs:containerenv") p.fs.containerenv = true;
  else if (code === "fs:proc1-cgroup") p.fs.proc1Cgroup = "12:cpuset:/docker/0123abcd\n";
  else if (isoEnv) p.env[isoEnv.name] = isoEnv.value ?? "ws-123";
  else if (code.startsWith("cred:env:")) p.env[code.slice("cred:env:".length)] = "secret-value-do-not-print";
  else {
    const facts = {
      "cred:ssh-dir": () => (p.home.sshDir = true),
      "cred:ssh-agent": () => (p.sshAgent = true),
      "cred:gh-hosts": () => (p.home.ghHosts = true),
      "cred:git-credentials": () => (p.home.gitCredentials = true),
      "cred:credential-helper": () => (p.credentialHelper = true),
      "cred:netrc": () => (p.home.netrc = true),
      "cred:aws-credentials": () => (p.home.awsCredentials = true),
      "cred:npmrc-home": () => (p.home.npmrc = true),
      "cred:npmrc-repo": () => (p.repo.npmrc = true),
    };
    assert.ok(Object.hasOwn(facts, code), `no probe fact for ${code}`);
    facts[code]();
  }
  return p;
}

test("✧ L34 — both frozen lists are non-empty, of their stated length, and disjoint (no test below can pass vacuously)", () => {
  assert.equal(ISOLATION_CODES.length, 8);
  assert.equal(CREDENTIAL_CODES.length, 16);
  assert.ok(Object.isFrozen(ISOLATION_CODES) && Object.isFrozen(CREDENTIAL_CODES));
  assert.equal(new Set([...ISOLATION_CODES, ...CREDENTIAL_CODES]).size, 24);
  assert.deepEqual(
    CREDENTIAL_ENV.map((n) => `cred:env:${n}`),
    CREDENTIAL_CODES.filter((c) => c.startsWith("cred:env:")),
    "every credential env var has its code, in list order"
  );
});

test("★ a probe with no evidence is HOST, refused not-isolated", () => {
  const r = evaluate(blank());
  assert.deepEqual(r, {
    exit: 2,
    reason: "not-isolated",
    record: { outcome: "HOST", evidence: [], accepted_host_execution: false },
  });
});

for (const code of ISOLATION_CODES) {
  test(`★ isolation code ${code} alone → ISOLATED, exit 0`, () => {
    const r = evaluate(probeWith(code));
    assert.equal(r.exit, 0);
    assert.equal(r.reason, null);
    assert.deepEqual(r.record, { outcome: "ISOLATED", evidence: [code], accepted_host_execution: false });
  });
}

for (const code of CREDENTIAL_CODES) {
  test(`★ credential code ${code} alone → HOST (refused); beside an isolation code → ISOLATED_WITH_CREDENTIALS (refused)`, () => {
    const alone = evaluate(probeWith(code));
    assert.equal(alone.exit, 2);
    assert.equal(alone.reason, "not-isolated");
    assert.deepEqual(alone.record.evidence, [code]);
    assert.equal(alone.record.outcome, "HOST");
    const both = evaluate(probeWith(code, probeWith("fs:dockerenv")));
    assert.equal(both.exit, 2);
    assert.equal(both.reason, "credentials-present");
    assert.deepEqual(both.record, {
      outcome: "ISOLATED_WITH_CREDENTIALS",
      evidence: ["fs:dockerenv", code],
      accepted_host_execution: false,
    });
  });
}

test("★ the flag turns HOST and ISOLATED_WITH_CREDENTIALS into exit 0, recorded as accepted", () => {
  const host = evaluate(probeWith("cred:ssh-dir"), true);
  assert.deepEqual(host, {
    exit: 0,
    reason: null,
    record: { outcome: "HOST", evidence: ["cred:ssh-dir"], accepted_host_execution: true },
  });
  const iwc = evaluate(probeWith("cred:ssh-agent", probeWith("env:CODESPACES")), true);
  assert.equal(iwc.exit, 0);
  assert.equal(iwc.record.outcome, "ISOLATED_WITH_CREDENTIALS");
  assert.equal(iwc.record.accepted_host_execution, true);
});

test("★ the flag with ISOLATED is still recorded as used", () => {
  const r = evaluate(probeWith("fs:dockerenv"), true);
  assert.deepEqual(r.record, { outcome: "ISOLATED", evidence: ["fs:dockerenv"], accepted_host_execution: true });
  assert.equal(r.exit, 0);
});

test("★ an unreadable HOME is refused with and without the flag, and records nothing (GATE 1, question 2)", () => {
  for (const accept of [false, true]) {
    const p = probeWith("fs:dockerenv");
    p.home = { ok: false };
    assert.deepEqual(evaluate(p, accept), { exit: 2, reason: "unreadable-home", record: null });
  }
});

test("★ a git that could not answer is probe-failed, with and without the flag", () => {
  for (const accept of [false, true]) {
    const p = probeWith("fs:dockerenv");
    p.credentialHelper = null;
    assert.deepEqual(evaluate(p, accept), { exit: 2, reason: "probe-failed", record: null });
  }
});

test("★ a non-object probe is crashed; hostile shapes never throw (total, L62)", () => {
  for (const bad of [null, undefined, 1, "x", [], { toString: 1 }]) {
    assert.doesNotThrow(() => evaluate(bad));
    assert.doesNotThrow(() => evidenceOf(bad));
  }
  assert.deepEqual(evaluate(null), { exit: 2, reason: "crashed", record: null });
  const weird = blank();
  weird.env = { CODESPACES: { toString: 1 }, GH_TOKEN: ["x"] };
  weird.home.sshDir = "yes";
  assert.deepEqual(evidenceOf(weird), [], "only exact strings and `true` count");
});

test("★ env isolation codes need their exact value; GITPOD_WORKSPACE_ID any non-empty one", () => {
  for (const e of ISOLATION_ENV) {
    const p = blank();
    p.env[e.name] = e.value === null ? "" : `${e.value}x`;
    assert.deepEqual(evidenceOf(p), [], `${e.name}=${JSON.stringify(p.env[e.name])} is not evidence`);
  }
  const p = blank();
  p.env.PHARN_ISOLATED = "true";
  assert.deepEqual(evidenceOf(p), [], "PHARN_ISOLATED counts only as exactly 1");
});

test("★ /proc/1/cgroup: a runtime name is evidence; cgroup v2's `0::/` is not", () => {
  const p = blank();
  for (const rt of ["docker", "containerd", "podman", "lxc", "kubepods"]) {
    p.fs.proc1Cgroup = `1:name=systemd:/${rt}/abc\n`;
    assert.deepEqual(evidenceOf(p), ["fs:proc1-cgroup"], rt);
  }
  p.fs.proc1Cgroup = "0::/\n";
  assert.deepEqual(evidenceOf(p), []);
});

test("★ evidence is emitted in frozen order, without repeats, whatever the probe order", () => {
  let p = blank();
  for (const c of [...CREDENTIAL_CODES].reverse()) p = probeWith(c, p);
  for (const c of [...ISOLATION_CODES].reverse()) p = probeWith(c, p);
  assert.deepEqual(evidenceOf(p), [...ISOLATION_CODES, ...CREDENTIAL_CODES]);
});

test("★ classify follows the three-row rule", () => {
  assert.equal(classify([]), "HOST");
  assert.equal(classify(["cred:ssh-dir"]), "HOST");
  assert.equal(classify(["fs:dockerenv"]), "ISOLATED");
  assert.equal(classify(["fs:dockerenv", "cred:ssh-dir"]), "ISOLATED_WITH_CREDENTIALS");
  assert.equal(classify(null), "HOST");
});

test("★ the witness grammar round-trips every evaluate record and refuses every malformed line", () => {
  const recs = [
    evaluate(probeWith("fs:dockerenv")).record,
    evaluate(probeWith("cred:ssh-dir"), true).record,
    evaluate(probeWith("cred:ssh-dir")).record,
    evaluate(probeWith("cred:netrc", probeWith("env:GITHUB_ACTIONS")), true).record,
  ];
  for (const rec of recs) {
    const line = renderIsolationLine(rec);
    assert.deepEqual(parseIsolationLine(line), rec);
    assert.deepEqual(parseIsolationLine(`${line}\n`), rec, "one trailing newline is the file form");
  }
  const good = renderIsolationLine(recs[0]);
  const bad = [
    "",
    `${good}\n\n`,
    `${good}\r\n`,
    ` ${good}`,
    good.replace(":", ": "),
    JSON.stringify({ evidence: ["fs:dockerenv"], outcome: "ISOLATED", accepted_host_execution: false }),
    JSON.stringify({ outcome: "ISOLATED", evidence: ["fs:dockerenv"], accepted_host_execution: false, x: 1 }),
    JSON.stringify({ outcome: "ISOLATED", evidence: ["fs:dockerenv"] }),
    JSON.stringify({ outcome: "SANDBOXED", evidence: ["fs:dockerenv"], accepted_host_execution: false }),
    JSON.stringify({ outcome: "ISOLATED", evidence: ["fs:dockerenv", "fs:dockerenv"], accepted_host_execution: false }),
    JSON.stringify({ outcome: "ISOLATED", evidence: ["env:CODESPACES", "fs:dockerenv"], accepted_host_execution: false }),
    JSON.stringify({ outcome: "ISOLATED", evidence: ["fs:nope"], accepted_host_execution: false }),
    JSON.stringify({ outcome: "ISOLATED", evidence: [], accepted_host_execution: false }),
    JSON.stringify({ outcome: "ISOLATED", evidence: ["fs:dockerenv", "cred:ssh-dir"], accepted_host_execution: false }),
    JSON.stringify({ outcome: "ISOLATED", evidence: ["fs:dockerenv"], accepted_host_execution: "false" }),
    JSON.stringify({ outcome: "ISOLATED", evidence: "fs:dockerenv", accepted_host_execution: false }),
    "[]",
    "null",
    "{not json",
    `{"toString":1}`,
    "x".repeat(5000),
  ];
  for (const line of bad) assert.equal(parseIsolationLine(line), null, `refused: ${line.slice(0, 80)}`);
  for (const v of [null, 1, {}, ["x"]]) assert.equal(parseIsolationLine(v), null);
});

test("★ admitted: ISOLATED, or a known outcome with the flag; a refused run's record is not admitted", () => {
  assert.equal(admitted({ outcome: "ISOLATED", evidence: ["fs:dockerenv"], accepted_host_execution: false }), true);
  assert.equal(admitted({ outcome: "HOST", evidence: [], accepted_host_execution: true }), true);
  assert.equal(admitted({ outcome: "HOST", evidence: [], accepted_host_execution: false }), false);
  assert.equal(admitted({ outcome: "ISOLATED_WITH_CREDENTIALS", evidence: [], accepted_host_execution: false }), false);
  assert.equal(admitted(null), false);
  assert.equal(admitted({ outcome: "toString", accepted_host_execution: true }), false);
});

test("★ the one human line: outcome, the accepted suffix only when the flag was used, and the not-recorded form", () => {
  assert.equal(isolationLine({ outcome: "ISOLATED", accepted_host_execution: false }), "isolation: ISOLATED");
  assert.equal(isolationLine({ outcome: "HOST", accepted_host_execution: true }), `isolation: HOST${ACCEPTED_SUFFIX}`);
  assert.equal(ACCEPTED_SUFFIX, " (host execution accepted by operator)");
  assert.equal(isolationLine(null, "demo"), "isolation: not recorded (no usable pharn/.run/pharn-loop/demo/isolation.json)");
  // review finding 8: a witness no admitted run can write is marked, never printed as an ordinary outcome
  for (const outcome of ["HOST", "ISOLATED_WITH_CREDENTIALS"]) {
    assert.equal(
      isolationLine({ outcome, accepted_host_execution: false }),
      `isolation: ${outcome} — NOT ADMITTED: the check refuses this outcome, so the run should have stopped at S15`
    );
  }
});

test("★ refusal lines: closed reasons, fixed text, the three ways out and LIMITS §6 on the two outcome refusals", () => {
  assert.deepEqual(Object.keys(REFUSAL_TEXT).sort(), [...REASONS].sort(), "one text per reason, both ways");
  for (const reason of ["not-isolated", "credentials-present"]) {
    const line = refusalLine(reason);
    assert.match(line, new RegExp(`^check-run-isolation: refused ${reason} — `));
    assert.match(line, /container that mounts none of your credentials/);
    assert.match(line, /PHARN_ISOLATED=1/);
    assert.match(line, /--accept-host-execution/);
    assert.match(line, /LIMITS\.md §6/);
  }
  for (const reason of ["unreadable-home", "probe-failed"]) assert.match(refusalLine(reason), /does not accept unknown evidence/);
  assert.match(refusalLine("toString"), /^check-run-isolation: refused crashed — /, "an unknown reason is never echoed");
});

test("✧ L35/L36 — the contract's two code tables equal the core's lists, both ways and in order", () => {
  const text = readFileSync(CONTRACT, "utf8");
  const table = (begin, end) => {
    const m = text.match(new RegExp(`<!-- ${begin} -->([\\s\\S]*?)<!-- ${end} -->`));
    assert.ok(m, `loop-record.md must carry the ${begin} / ${end} markers`);
    return [...m[1].matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map((x) => x[1]);
  };
  assert.deepEqual(table("ISOLATION-CODES:BEGIN", "ISOLATION-CODES:END"), [...ISOLATION_CODES]);
  assert.deepEqual(table("CREDENTIAL-CODES:BEGIN", "CREDENTIAL-CODES:END"), [...CREDENTIAL_CODES]);
  const outcomes = text.match(/<!-- ISOLATION-OUTCOMES: ([^>]*) -->/);
  assert.ok(outcomes, "loop-record.md must name the outcome enum in its ISOLATION-OUTCOMES marker");
  assert.deepEqual(outcomes[1].trim().split(/\s*,\s*/), [...OUTCOMES]);
});

test("✧ L36 closure — every backticked evidence code spelled in the contract and the loop command is a member", () => {
  const members = new Set([...ISOLATION_CODES, ...CREDENTIAL_CODES]);
  const files = [CONTRACT, join(here, "..", "..", ".claude", "commands", "pharn-loop.md")];
  let seen = 0;
  for (const f of files) {
    const text = readFileSync(f, "utf8");
    for (const m of text.matchAll(/`((?:fs|env|operator|cred):[A-Za-z0-9_:.-]+)`/g)) {
      seen++;
      assert.ok(members.has(m[1]), `${f}: \`${m[1]}\` is not an evidence code`);
    }
  }
  assert.ok(seen > 0, "the closure scan found no code at all — it would pass vacuously (L34)");
});
