// pharn/floor/feature-name.test.mjs — the feature-name gate (6.30.0, shell-sink-validation).
//
// What this file holds, and the control each part names (L60):
//   • ✧ CLOSURE (L36) — every refusal code the source emits is a member of REFUSALS, and every member is emitted.
//   • ✧ ONE GRAMMAR (L35) — the module declares no copy of the slug pattern; it imports FEATURE_SLUG_RE, and the size
//     bound is that grammar's own maximum plus one newline.
//   • ★ HOSTILE_CANDIDATES — every shape the CLI must refuse, written byte for byte: exit 2, stdout empty, the fixed
//     refusal line, the candidate removed, no command run, and no byte of the candidate echoed (L62).
//   • ★ PATH_KINDS (L59) — at the leaf (absent, regular, link to a file, link to a directory, dangling, looping,
//     directory, FIFO) and at each parent (`.pharn`, `.pharn/feature-name`): a link is asked, never followed; what it
//     points at is never read or removed.
//   • --fresh — absent, taken (a directory, a file, a dangling link), a run of taken suffixes, the 64-character limit,
//     and an lstat error that must refuse at once rather than walk (grill G-D).
//   • usage, the crash mapping (an injected `take`), and `root` with no default (L41).
// Every case runs the REAL CLI in a throwaway directory, except the crash mapping, which calls cliResult directly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { FEATURE_SLUG_RE } from "./gate-run-core.mjs";
import { CANDIDATE_REL, MAX_CANDIDATE_BYTES, REFUSALS, cliResult, refusalLine, takeName } from "./feature-name.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "feature-name.mjs");
const SOURCE = readFileSync(CLI, "utf8");

/** A fresh, real-pathed throwaway directory, removed by `done()`. */
function scratch() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "feature-name-")));
  const cand = join(dir, ...CANDIDATE_REL.split("/"));
  const put = (bytes) => {
    mkdirSync(dirname(cand), { recursive: true });
    writeFileSync(cand, bytes);
  };
  const run = (args = []) => {
    const r = spawnSync(process.execPath, [CLI, ...args], { cwd: dir, encoding: "utf8", timeout: 20000 });
    return { status: r.status, stdout: r.stdout, stderr: r.stderr, error: r.error };
  };
  const present = () => {
    try {
      lstatSync(cand);
      return true;
    } catch {
      return false;
    }
  };
  const done = () => rmSync(dir, { recursive: true, force: true });
  return { dir, cand, put, run, present, done };
}

const refusedAs = (r, code) => {
  assert.equal(r.status, 2, `expected exit 2 (${code}): ${r.stdout}${r.stderr}`);
  assert.equal(r.stdout, "", "a refusal prints nothing on stdout");
  assert.equal(r.stderr, refusalLine(code), `expected exactly the fixed ${code} line`);
};

// ── ✧ CLOSURE and ONE GRAMMAR ──────────────────────────────────────────────────────────────────────────────────

test("✧ CLOSURE (L36) — every refusal code in the source is a REFUSALS member, and every member is emitted", () => {
  const emitted = new Set([...SOURCE.matchAll(/refuse\("([a-z-]+)"\)/g)].map((m) => m[1]));
  const members = new Set(Object.keys(REFUSALS));
  assert.ok(emitted.size >= 8, "the scan found the refusals (a broken scan must not pass vacuously, L34)");
  assert.deepEqual(
    [...emitted].filter((c) => !members.has(c)),
    [],
    "a code emitted but not a member"
  );
  assert.deepEqual(
    [...members].filter((c) => !emitted.has(c)),
    [],
    "a member never emitted"
  );
  for (const [code, remedy] of Object.entries(REFUSALS)) {
    assert.ok(typeof remedy === "string" && remedy.length > 0 && !remedy.includes("\n"), `${code}: one non-empty line`);
    assert.equal(refusalLine(code), `feature-name: refused ${code} — ${remedy}\n`);
  }
  // CONTROL: a code outside the table is caught by the same comparison.
  const planted = new Set([...emitted, "made-up"]);
  assert.deepEqual(
    [...planted].filter((c) => !members.has(c)),
    ["made-up"]
  );
});

test("✧ ONE GRAMMAR (L35) — no copy of the slug pattern; the size bound is the grammar's own maximum plus one newline", () => {
  assert.match(SOURCE, /import \{ FEATURE_SLUG_RE \} from "\.\/gate-run-core\.mjs";/);
  assert.doesNotMatch(SOURCE, /\[a-z0-9\]\[a-z0-9-\]/, "the module must not declare its own slug pattern");
  assert.equal(MAX_CANDIDATE_BYTES, 64 + 1);
  assert.ok(FEATURE_SLUG_RE.test("a".repeat(64)) && !FEATURE_SLUG_RE.test("a".repeat(65)), "the grammar's maximum is 64");
  assert.equal(CANDIDATE_REL, ".pharn/feature-name/candidate.txt");
  assert.match(SOURCE, /^if \(import\.meta\.main\) \{/m, "the entry guard is the house idiom");
});

// ── The name that passes ──────────────────────────────────────────────────────────────────────────────────────

for (const [label, bytes, name] of [
  ["a plain slug", "fix-login", "fix-login"],
  ["a slug and one newline", "fix-login\n", "fix-login"],
  ["the longest slug and one newline (65 bytes)", `${"a".repeat(64)}\n`, "a".repeat(64)],
  ["a digit first", "2fa-setup", "2fa-setup"],
]) {
  test(`a valid candidate — ${label}: exit 0, the name alone on stdout, the file consumed`, () => {
    const s = scratch();
    try {
      s.put(bytes);
      const r = s.run();
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout, `${name}\n`);
      assert.equal(r.stderr, "");
      assert.equal(s.present(), false, "the candidate is consumed");
      refusedAs(s.run(), "no-candidate"); // consumed means a second run finds nothing
    } finally {
      s.done();
    }
  });
}

// ── ★ HOSTILE_CANDIDATES ──────────────────────────────────────────────────────────────────────────────────────

const HOSTILE_CANDIDATES = [
  { what: "command substitution", bytes: "x$(touch PWNED)" },
  { what: "backticks", bytes: "x`touch PWNED`" },
  { what: "a semicolon and ${IFS}", bytes: "fix;touch${IFS}PWNED;x" },
  { what: "a single quote", bytes: "fix'$(touch PWNED)'" },
  { what: "a double quote", bytes: 'fix"$(touch PWNED)"' },
  { what: "a second line", bytes: "fix\ntouch PWNED" },
  { what: "two newlines", bytes: "fix-login\n\n" },
  { what: "CRLF", bytes: "fix-login\r\n" },
  { what: "a CR", bytes: "fix\rlogin" },
  { what: "a space", bytes: "fix login" },
  { what: "a leading dash", bytes: "-rf" },
  { what: "a dotdot", bytes: ".." },
  { what: "a slash", bytes: "a/b" },
  { what: "an upper-case letter", bytes: "Fix-login" },
  { what: "a NUL", bytes: "fix\u0000login" },
  { what: "a UTF-8 BOM", bytes: Buffer.from([0xef, 0xbb, 0xbf, ...Buffer.from("fix-login")]) },
  { what: "a non-ASCII letter", bytes: "fix-lógin" },
  { what: "65 characters", bytes: "a".repeat(65) },
  { what: "the empty file", bytes: "" },
  { what: "a large file (never read)", bytes: "a".repeat(100_000) },
];

for (const h of HOSTILE_CANDIDATES) {
  test(`★ HOSTILE — ${h.what}: refused not-a-name, consumed, nothing run, nothing echoed`, () => {
    const s = scratch();
    try {
      s.put(h.bytes);
      const r = s.run();
      refusedAs(r, "not-a-name");
      assert.equal(s.present(), false, "a refused candidate is still consumed (grill G-A)");
      assert.equal(existsSync(join(s.dir, "PWNED")), false, "a command in the candidate ran");
      assert.ok(!r.stderr.includes("PWNED") && !r.stderr.includes("touch"), "the refusal quotes no byte of the candidate (L62)");
    } finally {
      s.done();
    }
  });
}

test("★ the refusal line never carries the candidate — a distinctive canary is absent from stderr", () => {
  const s = scratch();
  try {
    s.put("CANARY-Zq9-Upper");
    const r = s.run();
    refusedAs(r, "not-a-name");
    assert.ok(!r.stderr.includes("CANARY"), "stderr must not echo the candidate");
  } finally {
    s.done();
  }
});

// ── ★ PATH_KINDS — the leaf ───────────────────────────────────────────────────────────────────────────────────

test("★ PATH_KINDS leaf — absent: no-candidate, and absent .pharn too", () => {
  const s = scratch();
  try {
    refusedAs(s.run(), "no-candidate");
    mkdirSync(join(s.dir, ".pharn", "feature-name"), { recursive: true });
    refusedAs(s.run(), "no-candidate");
  } finally {
    s.done();
  }
});

test("★ PATH_KINDS leaf — a link to a file holding a VALID slug: refused not-a-file, the link removed, the target never read or touched", () => {
  const s = scratch();
  try {
    const target = join(s.dir, "elsewhere.txt");
    writeFileSync(target, "fix-login\n");
    mkdirSync(dirname(s.cand), { recursive: true });
    symlinkSync(target, s.cand);
    const r = s.run();
    refusedAs(r, "not-a-file");
    assert.equal(s.present(), false, "the link is removed");
    assert.equal(readFileSync(target, "utf8"), "fix-login\n", "the target is intact");
  } finally {
    s.done();
  }
});

test("★ PATH_KINDS leaf — a link to a directory, a dangling link and a looping link: each refused not-a-file and removed", () => {
  for (const make of [
    (s) => {
      mkdirSync(join(s.dir, "adir"));
      symlinkSync(join(s.dir, "adir"), s.cand);
    },
    (s) => symlinkSync(join(s.dir, "nowhere"), s.cand),
    (s) => symlinkSync(s.cand, s.cand),
  ]) {
    const s = scratch();
    try {
      mkdirSync(dirname(s.cand), { recursive: true });
      make(s);
      refusedAs(s.run(), "not-a-file");
      assert.equal(s.present(), false, "the link is removed");
      if (existsSync(join(s.dir, "adir"))) assert.ok(lstatSync(join(s.dir, "adir")).isDirectory(), "the linked directory is intact");
    } finally {
      s.done();
    }
  }
});

test("★ PATH_KINDS leaf — a directory: refused not-a-file and LEFT in place (a person removes it)", () => {
  const s = scratch();
  try {
    mkdirSync(s.cand, { recursive: true });
    refusedAs(s.run(), "not-a-file");
    assert.ok(lstatSync(s.cand).isDirectory());
  } finally {
    s.done();
  }
});

test("★ PATH_KINDS leaf — a FIFO: refused not-a-file and removed, without blocking", (t) => {
  const s = scratch();
  try {
    mkdirSync(dirname(s.cand), { recursive: true });
    const mk = spawnSync("mkfifo", [s.cand]);
    if (mk.status !== 0) {
      t.skip("mkfifo is unavailable here");
      return;
    }
    const r = s.run();
    assert.equal(r.error, undefined, "the CLI must not block on a FIFO");
    refusedAs(r, "not-a-file");
    assert.equal(s.present(), false);
  } finally {
    s.done();
  }
});

// ── ★ PATH_KINDS — each parent ────────────────────────────────────────────────────────────────────────────────

test("★ PATH_KINDS parents — a symlinked .pharn or .pharn/feature-name: unsafe-path, and the file behind it is never read or removed", () => {
  for (const linkAt of [".pharn", ".pharn/feature-name"]) {
    const s = scratch();
    try {
      // The real directory holds a VALID candidate; the link makes it reachable at the candidate path.
      const real = join(s.dir, "real");
      const realCand = linkAt === ".pharn" ? join(real, "feature-name", "candidate.txt") : join(real, "candidate.txt");
      mkdirSync(dirname(realCand), { recursive: true });
      writeFileSync(realCand, "fix-login\n");
      if (linkAt === ".pharn/feature-name") mkdirSync(join(s.dir, ".pharn"));
      symlinkSync(real, join(s.dir, ...linkAt.split("/")));
      refusedAs(s.run(), "unsafe-path");
      assert.equal(readFileSync(realCand, "utf8"), "fix-login\n", `${linkAt}: the file behind the link is intact`);
    } finally {
      s.done();
    }
  }
});

test("★ PATH_KINDS parents — a regular file, or a dangling link, standing where a directory belongs: unsafe-path", () => {
  for (const [at, make] of [
    [".pharn", (p) => writeFileSync(p, "x")],
    [".pharn/feature-name", (p) => writeFileSync(p, "x")],
    [".pharn/feature-name", (p) => symlinkSync(join(dirname(p), "nowhere"), p)],
  ]) {
    const s = scratch();
    try {
      const p = join(s.dir, ...at.split("/"));
      mkdirSync(dirname(p), { recursive: true });
      make(p);
      refusedAs(s.run(), "unsafe-path");
    } finally {
      s.done();
    }
  }
});

// ── --fresh ──────────────────────────────────────────────────────────────────────────────────────────────────

test("--fresh — the slug when pharn/features/<slug> is absent; the first absent suffix when it is taken", () => {
  const s = scratch();
  try {
    const features = join(s.dir, "pharn", "features");
    s.put("demo");
    assert.equal(s.run(["--fresh"]).stdout, "demo\n");
    mkdirSync(join(features, "demo"), { recursive: true });
    s.put("demo");
    assert.equal(s.run(["--fresh"]).stdout, "demo-2\n");
    mkdirSync(join(features, "demo-2"));
    s.put("demo");
    assert.equal(s.run(["--fresh"]).stdout, "demo-3\n");
  } finally {
    s.done();
  }
});

test("--fresh — a file and a dangling link each count as taken (L54: an lstat ENOENT is the only absence)", () => {
  for (const make of [(p) => writeFileSync(p, "x"), (p) => symlinkSync(join(dirname(p), "nowhere"), p)]) {
    const s = scratch();
    try {
      const features = join(s.dir, "pharn", "features");
      mkdirSync(features, { recursive: true });
      make(join(features, "demo"));
      s.put("demo");
      const r = s.run(["--fresh"]);
      assert.equal(r.status, 0, r.stderr);
      assert.equal(r.stdout, "demo-2\n");
    } finally {
      s.done();
    }
  }
});

test("--fresh — a suffix that would pass 64 characters refuses no-fresh-name", () => {
  const s = scratch();
  try {
    const features = join(s.dir, "pharn", "features");
    const long = "a".repeat(64);
    mkdirSync(join(features, long), { recursive: true });
    s.put(long);
    refusedAs(s.run(["--fresh"]), "no-fresh-name");
    const s62 = "b".repeat(62); // s62-2 … s62-9 are 64 characters; s62-10 is 65
    for (const n of ["", "-2", "-3", "-4", "-5", "-6", "-7", "-8", "-9"]) mkdirSync(join(features, `${s62}${n}`));
    s.put(s62);
    refusedAs(s.run(["--fresh"]), "no-fresh-name");
  } finally {
    s.done();
  }
});

test("--fresh — an lstat error other than ENOENT refuses unreadable at once, never walks the suffixes (grill G-D)", (t) => {
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    t.skip("permissions do not bind root");
    return;
  }
  const s = scratch();
  const features = join(s.dir, "pharn", "features");
  try {
    mkdirSync(features, { recursive: true });
    chmodSync(features, 0o000);
    s.put("demo");
    const started = Date.now();
    refusedAs(s.run(["--fresh"]), "unreadable");
    assert.ok(Date.now() - started < 15000, "a refusal, not a walk towards the 64-character limit");
  } finally {
    chmodSync(features, 0o755);
    s.done();
  }
});

// ── usage, the crash mapping, and `root` ─────────────────────────────────────────────────────────────────────

test("usage — any argument but a lone --fresh refuses usage-error and leaves the candidate untouched", () => {
  for (const args of [["--x"], ["--fresh", "--fresh"], ["fix-login"], ["--fresh", "x"]]) {
    const s = scratch();
    try {
      s.put("fix-login");
      refusedAs(s.run(args), "usage-error");
      assert.equal(s.present(), true, `${JSON.stringify(args)}: a usage refusal removes nothing`);
    } finally {
      s.done();
    }
  }
});

test("the crash mapping — a throw, a non-slug name and an unknown code are each `crashed`, never a printed name", () => {
  const cases = [
    () => {
      throw new Error("boom");
    },
    () => ({ ok: true, name: "x;touch PWNED" }),
    () => ({ ok: false, code: "made-up" }),
    () => null,
  ];
  for (const take of cases) {
    const out = cliResult([], "/nowhere", take);
    assert.deepEqual(out, { exitCode: 2, stdout: "", stderr: refusalLine("crashed") });
  }
  // CONTROL: the same seam, handed a valid result, prints it.
  assert.deepEqual(
    cliResult([], "/nowhere", () => ({ ok: true, name: "fix-login" })),
    {
      exitCode: 0,
      stdout: "fix-login\n",
      stderr: "",
    }
  );
});

test("takeName has no default root (L41) — no root, a relative root and a non-boolean fresh each refuse usage-error", () => {
  assert.deepEqual(takeName(), { ok: false, code: "usage-error" });
  assert.deepEqual(takeName({ root: "relative/dir" }), { ok: false, code: "usage-error" });
  assert.deepEqual(takeName({ root: "/abs", fresh: "yes" }), { ok: false, code: "usage-error" });
});
