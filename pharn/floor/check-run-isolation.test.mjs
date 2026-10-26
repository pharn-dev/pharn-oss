// pharn/floor/check-run-isolation.test.mjs — the EXECUTION half of /pharn-loop's entry isolation check: the real CLI
// spawned against temp HOMEs, links, sockets and a temp fs root (loop-isolation-stop, 7.1.0). ★ = behaviour.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildProbe, credentialHelper, parseArgs, run } from "./check-run-isolation.mjs";
import { CREDENTIAL_ENV, ISOLATION_ENV, evaluate } from "./check-run-isolation-core.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, "check-run-isolation.mjs");
const SECRET = "s3cr3t-VALUE-must-never-print-7f3a";

/** A sandbox: an empty HOME, a project dir (cwd) and a scratch dir, plus an env that holds nothing of the machine's. */
function sandbox() {
  const root = mkdtempSync(join(tmpdir(), "pharn-isolation-"));
  const home = join(root, "home");
  const project = join(root, "project");
  mkdirSync(home);
  mkdirSync(project);
  const env = {
    PATH: process.env.PATH,
    HOME: home,
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: join(home, ".gitconfig"),
  };
  return { root, home, project, env, done: () => rmSync(root, { recursive: true, force: true }) };
}

function cli(sb, args = ["--feature", "demo"], extraEnv = {}) {
  const r = spawnSync(process.execPath, [CLI, ...args], { cwd: sb.project, env: { ...sb.env, ...extraEnv }, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

const lines = (s) => s.split("\n").filter((l) => l !== "");

test("★ an empty HOME on a host is HOST: exit 2 `not-isolated`, the record on stdout, one stderr line", () => {
  const sb = sandbox();
  try {
    const r = cli(sb);
    assert.equal(r.status, 2);
    assert.equal(lines(r.stdout).length, 1);
    assert.deepEqual(JSON.parse(r.stdout), { outcome: "HOST", evidence: [], accepted_host_execution: false });
    assert.equal(lines(r.stderr).length, 1);
    assert.match(r.stderr, /^check-run-isolation: refused not-isolated — /);
  } finally {
    sb.done();
  }
});

test("★ PHARN_ISOLATED=1 with an empty HOME is ISOLATED: exit 0, nothing on stderr", () => {
  const sb = sandbox();
  try {
    const r = cli(sb, undefined, { PHARN_ISOLATED: "1" });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, `{"outcome":"ISOLATED","evidence":["operator:PHARN_ISOLATED"],"accepted_host_execution":false}\n`);
    assert.equal(r.stderr, "");
  } finally {
    sb.done();
  }
});

test("★ each HOME credential file is a hit (PHARN_ISOLATED=1 → credentials-present); the flag accepts it", () => {
  const cases = [
    ["cred:ssh-dir", (h) => (mkdirSync(join(h, ".ssh")), writeFileSync(join(h, ".ssh", "id_ed25519"), SECRET))],
    [
      "cred:gh-hosts",
      (h) => (mkdirSync(join(h, ".config", "gh"), { recursive: true }), writeFileSync(join(h, ".config", "gh", "hosts.yml"), SECRET)),
    ],
    ["cred:git-credentials", (h) => writeFileSync(join(h, ".git-credentials"), `https://u:${SECRET}@example.invalid\n`)],
    ["cred:netrc", (h) => writeFileSync(join(h, ".netrc"), `machine example.invalid password ${SECRET}\n`)],
    ["cred:aws-credentials", (h) => (mkdirSync(join(h, ".aws")), writeFileSync(join(h, ".aws", "credentials"), SECRET))],
    ["cred:npmrc-home", (h) => writeFileSync(join(h, ".npmrc"), `//registry.npmjs.org/:_authToken=${SECRET}\n`)],
  ];
  for (const [code, plant] of cases) {
    const sb = sandbox();
    try {
      plant(sb.home);
      const r = cli(sb, undefined, { PHARN_ISOLATED: "1" });
      assert.equal(r.status, 2, code);
      assert.match(r.stderr, /refused credentials-present/, code);
      assert.deepEqual(JSON.parse(r.stdout).evidence, ["operator:PHARN_ISOLATED", code], code);
      const ok = cli(sb, ["--feature", "demo", "--accept-host-execution"], { PHARN_ISOLATED: "1" });
      assert.equal(ok.status, 0, code);
      assert.equal(JSON.parse(ok.stdout).accepted_host_execution, true);
      assert.ok(!(r.stdout + r.stderr + ok.stdout + ok.stderr).includes(SECRET), `${code}: a file's content leaked`);
    } finally {
      sb.done();
    }
  }
});

test("★ .ssh: absent and empty are no hit; a file, a link to a dir outside HOME, a dangling link are hits (L54, L59)", () => {
  const kinds = [
    ["absent", () => {}, false],
    ["empty dir", (sb) => mkdirSync(join(sb.home, ".ssh")), false],
    ["known_hosts only", (sb) => (mkdirSync(join(sb.home, ".ssh")), writeFileSync(join(sb.home, ".ssh", "known_hosts"), "x")), true],
    ["a regular file", (sb) => writeFileSync(join(sb.home, ".ssh"), "x"), true],
    [
      "link to a dir outside HOME",
      (sb) => (
        mkdirSync(join(sb.root, "keys")),
        writeFileSync(join(sb.root, "keys", "id"), SECRET),
        symlinkSync(join(sb.root, "keys"), join(sb.home, ".ssh"))
      ),
      true,
    ],
    [
      "link to an EMPTY dir (never followed)",
      (sb) => (mkdirSync(join(sb.root, "e")), symlinkSync(join(sb.root, "e"), join(sb.home, ".ssh"))),
      true,
    ],
    ["dangling link", (sb) => symlinkSync(join(sb.root, "nowhere"), join(sb.home, ".ssh")), true],
  ];
  for (const [label, plant, hit] of kinds) {
    const sb = sandbox();
    try {
      plant(sb);
      const r = cli(sb, undefined, { PHARN_ISOLATED: "1" });
      assert.equal(JSON.parse(r.stdout).evidence.includes("cred:ssh-dir"), hit, label);
    } finally {
      sb.done();
    }
  }
});

test("★ .npmrc: without _authToken no hit; with it a hit (home and repo); a dir or a FIFO there is a hit and never hangs", () => {
  const sb = sandbox();
  try {
    writeFileSync(join(sb.home, ".npmrc"), "registry=https://registry.npmjs.org/\n");
    assert.deepEqual(JSON.parse(cli(sb, undefined, { PHARN_ISOLATED: "1" }).stdout).evidence, ["operator:PHARN_ISOLATED"]);
    writeFileSync(join(sb.project, ".npmrc"), `//r/:_authToken=${SECRET}\n`);
    const r = cli(sb, undefined, { PHARN_ISOLATED: "1" });
    assert.deepEqual(JSON.parse(r.stdout).evidence, ["operator:PHARN_ISOLATED", "cred:npmrc-repo"]);
    assert.ok(!(r.stdout + r.stderr).includes(SECRET));
    rmSync(join(sb.home, ".npmrc"));
    mkdirSync(join(sb.home, ".npmrc"));
    assert.ok(JSON.parse(cli(sb, undefined, { PHARN_ISOLATED: "1" }).stdout).evidence.includes("cred:npmrc-home"), "a directory");
  } finally {
    sb.done();
  }
  if (process.platform === "win32") return;
  const fifo = sandbox();
  try {
    const mk = spawnSync("mkfifo", [join(fifo.home, ".npmrc")]);
    if (mk.status !== 0) return; // no mkfifo on this host: the directory case above covers the non-regular branch
    const t0 = Date.now();
    const r = cli(fifo, undefined, { PHARN_ISOLATED: "1" });
    assert.ok(Date.now() - t0 < 20_000, "a FIFO at .npmrc must not block the probe");
    assert.ok(JSON.parse(r.stdout).evidence.includes("cred:npmrc-home"), "a FIFO is a hit");
  } finally {
    fifo.done();
  }
});

test("★ SSH_AUTH_SOCK: a real listening socket is a hit, a dead path is not, empty is not", async () => {
  const sb = sandbox();
  const sock = join(sb.root, "agent.sock");
  const server = createServer();
  await new Promise((res) => server.listen(sock, res));
  try {
    const live = spawnSync(process.execPath, [CLI, "--feature", "demo"], {
      cwd: sb.project,
      env: { ...sb.env, PHARN_ISOLATED: "1", SSH_AUTH_SOCK: sock },
      encoding: "utf8",
    });
    assert.deepEqual(JSON.parse(live.stdout).evidence, ["operator:PHARN_ISOLATED", "cred:ssh-agent"]);
    for (const v of [join(sb.root, "dead.sock"), join(sb.root, "nofile", "x.sock"), ""]) {
      const r = cli(sb, undefined, { PHARN_ISOLATED: "1", SSH_AUTH_SOCK: v });
      assert.deepEqual(JSON.parse(r.stdout).evidence, ["operator:PHARN_ISOLATED"], `SSH_AUTH_SOCK=${JSON.stringify(v)}`);
    }
  } finally {
    await new Promise((res) => server.close(res));
    sb.done();
  }
});

test("★ a credential helper in git config is a hit — plain and URL-scoped (`gh auth setup-git`); an empty value is not", () => {
  const forms = [
    ["[credential]\n\thelper = store\n", true],
    ['[credential "https://github.com"]\n\thelper = !gh auth git-credential\n', true],
    ["[credential]\n\thelper =\n", false],
    ["[user]\n\tname = x\n", false],
  ];
  for (const [cfg, hit] of forms) {
    const sb = sandbox();
    try {
      writeFileSync(join(sb.home, ".gitconfig"), cfg);
      const r = cli(sb, undefined, { PHARN_ISOLATED: "1" });
      assert.equal(r.status === 0 ? false : JSON.parse(r.stdout).evidence.includes("cred:credential-helper"), hit, cfg);
    } finally {
      sb.done();
    }
  }
});

test("★ every credential env var is a hit by name, and its value never prints (L62)", () => {
  const sb = sandbox();
  try {
    const env = { PHARN_ISOLATED: "1" };
    for (const n of CREDENTIAL_ENV) env[n] = `${SECRET}-${n}`;
    const r = cli(sb, undefined, env);
    assert.equal(r.status, 2);
    assert.deepEqual(JSON.parse(r.stdout).evidence, ["operator:PHARN_ISOLATED", ...CREDENTIAL_ENV.map((n) => `cred:env:${n}`)]);
    assert.ok(!(r.stdout + r.stderr).includes(SECRET), "an env value leaked");
  } finally {
    sb.done();
  }
});

test("★ the env isolation codes: each alone with an empty HOME is ISOLATED", () => {
  for (const e of ISOLATION_ENV) {
    const sb = sandbox();
    try {
      const r = cli(sb, undefined, { [e.name]: e.value ?? "ws-1" });
      assert.equal(r.status, 0, `${e.name}: ${r.stderr}`);
      assert.deepEqual(JSON.parse(r.stdout).evidence, [e.code]);
    } finally {
      sb.done();
    }
  }
});

test("★ HOME unset, relative or a file → unreadable-home (exit 2, empty stdout), and USERPROFILE is the fallback", () => {
  const sb = sandbox();
  try {
    writeFileSync(join(sb.root, "afile"), "x");
    for (const home of ["", "relative/home", join(sb.root, "afile"), join(sb.root, "missing")]) {
      const r = spawnSync(process.execPath, [CLI, "--feature", "demo", "--accept-host-execution"], {
        cwd: sb.project,
        env: { PATH: process.env.PATH, HOME: home, PHARN_ISOLATED: "1" },
        encoding: "utf8",
      });
      assert.equal(r.status, 2, `HOME=${home}`);
      assert.equal(r.stdout, "");
      assert.match(r.stderr, /^check-run-isolation: refused unreadable-home — /);
    }
    const viaProfile = spawnSync(process.execPath, [CLI, "--feature", "demo"], {
      cwd: sb.project,
      env: { PATH: process.env.PATH, USERPROFILE: sb.home, GIT_CONFIG_NOSYSTEM: "1", PHARN_ISOLATED: "1" },
      encoding: "utf8",
    });
    assert.equal(viaProfile.status, 0, viaProfile.stderr);
  } finally {
    sb.done();
  }
});

test("★ usage: a bad slug, a missing or repeated flag, or an unknown argument is `usage`, exit 2, empty stdout", () => {
  const sb = sandbox();
  try {
    for (const args of [
      [],
      ["--feature"],
      ["--feature", "Bad Name"],
      ["--feature", "a", "--feature", "b"],
      ["--feature", "a", "--x"],
      ["--accept-host-execution"],
    ]) {
      const r = cli(sb, args, { PHARN_ISOLATED: "1" });
      assert.equal(r.status, 2, args.join(" "));
      assert.equal(r.stdout, "");
      assert.match(r.stderr, /^check-run-isolation: refused usage — /);
    }
    assert.deepEqual(parseArgs(["--accept-host-execution", "--feature", "a"]), { feature: "a", accept: true });
  } finally {
    sb.done();
  }
});

test("★ crashed: a probe that throws is exit 2 `crashed` with nothing on stdout; an unloadable module is node's own non-zero", () => {
  const r = run(["--feature", "demo"], {
    buildProbe: () => {
      throw new Error(SECRET);
    },
  });
  assert.equal(r.code, 2);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, /^check-run-isolation: refused crashed — /);
  assert.ok(!r.stderr.includes(SECRET));
  const sb = sandbox();
  try {
    copyFileSync(CLI, join(sb.root, "check-run-isolation.mjs"));
    const s = spawnSync(process.execPath, [join(sb.root, "check-run-isolation.mjs"), "--feature", "demo"], { encoding: "utf8" });
    assert.notEqual(s.status, 0, "a CLI whose modules cannot load must not exit 0");
    assert.equal(s.stdout, "");
  } finally {
    sb.done();
  }
});

test("★ the fs markers under a temp fs root (A11): each kind of /.dockerenv, /run/.containerenv, /proc/1/cgroup", () => {
  const sb = sandbox();
  try {
    const fsRoot = join(sb.root, "fsroot");
    mkdirSync(join(fsRoot, "run"), { recursive: true });
    mkdirSync(join(fsRoot, "proc", "1"), { recursive: true });
    const probe = () => buildProbe({ fsRoot, env: sb.env, cwd: sb.project, git: () => false });
    assert.deepEqual(evaluate(probe()).record.evidence, []);
    writeFileSync(join(fsRoot, ".dockerenv"), "");
    assert.deepEqual(evaluate(probe()).record.evidence, ["fs:dockerenv"]);
    rmSync(join(fsRoot, ".dockerenv"));
    symlinkSync(join(fsRoot, "nowhere"), join(fsRoot, ".dockerenv"));
    assert.deepEqual(evaluate(probe()).record.evidence, ["fs:dockerenv"], "a dangling link is still an entry");
    rmSync(join(fsRoot, ".dockerenv"));
    mkdirSync(join(fsRoot, "run", ".containerenv"));
    assert.deepEqual(evaluate(probe()).record.evidence, ["fs:containerenv"]);
    rmSync(join(fsRoot, "run", ".containerenv"), { recursive: true });
    writeFileSync(join(fsRoot, "proc", "1", "cgroup"), "0::/\n");
    assert.deepEqual(evaluate(probe()).record.evidence, [], "cgroup v2 root names no runtime");
    writeFileSync(join(fsRoot, "proc", "1", "cgroup"), "11:devices:/kubepods/burstable/pod1\n");
    assert.deepEqual(evaluate(probe()).record.evidence, ["fs:proc1-cgroup"]);
    rmSync(join(fsRoot, "proc", "1", "cgroup"));
    writeFileSync(join(sb.root, "real-cgroup"), "1:docker:/x\n");
    symlinkSync(join(sb.root, "real-cgroup"), join(fsRoot, "proc", "1", "cgroup"));
    assert.deepEqual(evaluate(probe()).record.evidence, [], "a linked cgroup file is not read");
  } finally {
    sb.done();
  }
});

test("★ credentialHelper: a git that cannot spawn is null (probe-failed), never `no helper`", () => {
  const sb = sandbox();
  try {
    assert.equal(credentialHelper({ PATH: join(sb.root, "empty-bin") }, sb.home, sb.project), null);
    const p = buildProbe({ env: { ...sb.env, PATH: join(sb.root, "empty-bin"), PHARN_ISOLATED: "1" }, cwd: sb.project });
    assert.deepEqual(evaluate(p, true), { exit: 2, reason: "probe-failed", record: null });
  } finally {
    sb.done();
  }
});

// ── 7.1.0: the probe fails closed when a credential path cannot be opened, read or listed ─────────────────────────────
import fsModule from "node:fs";
import { syncBuiltinESMExports } from "node:module";

/** Runs `fn` with one fs call failing for paths ending in `suffix`: `openSync` / `readdirSync` throw EACCES on the path,
 *  `readSync` throws EIO on a descriptor opened on it. Every other call reaches the real fs. Production code imports
 *  these names from node:fs, so `syncBuiltinESMExports` carries the swap to it and back. */
function withFsFault(call, suffix, fn) {
  const real = { openSync: fsModule.openSync, readSync: fsModule.readSync, readdirSync: fsModule.readdirSync };
  const hit = (p) => typeof p === "string" && p.endsWith(suffix);
  const fault = (code) => Object.assign(new Error(`${code}: injected ${call} fault`), { code });
  const fds = new Set();
  fsModule.openSync = (p, ...rest) => {
    if (call === "openSync" && hit(p)) throw fault("EACCES");
    const fd = real.openSync(p, ...rest);
    if (hit(p)) fds.add(fd);
    return fd;
  };
  fsModule.readSync = (fd, ...rest) => {
    if (call === "readSync" && fds.has(fd)) throw fault("EIO");
    return real.readSync(fd, ...rest);
  };
  fsModule.readdirSync = (p, ...rest) => {
    if (call === "readdirSync" && hit(p)) throw fault("EACCES");
    return real.readdirSync(p, ...rest);
  };
  syncBuiltinESMExports();
  try {
    return fn();
  } finally {
    Object.assign(fsModule, real);
    syncBuiltinESMExports();
  }
}

test("★ an .npmrc that cannot be opened or read, or a .ssh that cannot be listed, is a hit (fail-closed)", () => {
  const sb = sandbox();
  try {
    writeFileSync(join(sb.home, ".npmrc"), "registry=https://registry.npmjs.org/\n");
    mkdirSync(join(sb.home, ".ssh"));
    const evidence = () => evaluate(buildProbe({ env: sb.env, cwd: sb.project, git: () => false })).record.evidence;
    assert.deepEqual(evidence(), [], "a token-free .npmrc and an empty .ssh are no hit");
    assert.deepEqual(withFsFault("openSync", ".npmrc", evidence), ["cred:npmrc-home"], "an .npmrc that cannot be opened");
    assert.deepEqual(withFsFault("readSync", ".npmrc", evidence), ["cred:npmrc-home"], "an .npmrc whose read fails");
    assert.deepEqual(withFsFault("readdirSync", ".ssh", evidence), ["cred:ssh-dir"], "a .ssh that cannot be listed");
    assert.deepEqual(evidence(), [], "the real fs is back after each fault");
  } finally {
    sb.done();
  }
});
