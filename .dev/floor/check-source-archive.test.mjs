// .dev/floor/check-source-archive.test.mjs — apparatus tests for the source-archive checker (CORE-383).
//
// Two kinds of fixture, because the checker models two things (its header):
//   - HAND-BUILT TARS for every refusal of pharn-cli's extractor (51a96d29), enumerated as one table the suite iterates
//     (L67: the external tool's refusal set is the fixture list, not the author's examples). A hard link is only
//     reachable this way: git never writes one.
//   - REAL `git archive` output from temp repositories, where git itself decides the headers: a symlink (mode 120000),
//     a `:` name, and a leaf too long for ustar (git writes a pax `x` header) are added with `git update-index
//     --cacheinfo`, so no filesystem has to hold them.
// Every RED fixture has a clean twin that is GREEN, so a RED comes from the planted entry (negative control).

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CLI_LIMITS, RULES, archiveTar, checkArchive, describeBytes, escapeUnsafe } from "./check-source-archive.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const CHECKER = join(HERE, "check-source-archive.mjs");
const ROOT = "pharn-oss-0123456789abcdef0123456789abcdef01234567";

// ── A minimal ustar writer (the shape git archive writes) ─────────────────────────────────────────────────────────────

function octal(value, width) {
  return value.toString(8).padStart(width - 1, "0") + "\0";
}

/** One header block (+ padded payload) — every field overridable so a fixture can break exactly one rule. */
function entry({ name, prefix = "", type = "0", data = Buffer.alloc(0), magic = "ustar\x0000", size, checksum, nameBytes } = {}) {
  const h = Buffer.alloc(512);
  (nameBytes ?? Buffer.from(name, "utf8")).copy(h, 0);
  h.write(octal(0o644, 8), 100, "latin1");
  h.write(octal(0, 8), 108, "latin1");
  h.write(octal(0, 8), 116, "latin1");
  h.write(size ?? octal(data.length, 12), 124, "latin1");
  h.write(octal(0, 12), 136, "latin1");
  h.write(type, 156, "latin1");
  h.write(magic, 257, "latin1");
  Buffer.from(prefix, "utf8").copy(h, 345);
  h.fill(0x20, 148, 156);
  let sum = 0;
  for (const b of h) sum += b;
  h.write(checksum ?? octal(sum, 7) + " ", 148, "latin1");
  const pad = Buffer.alloc((512 - (data.length % 512)) % 512);
  return Buffer.concat([h, data, pad]);
}

const END = Buffer.alloc(1024);
const GLOBAL = entry({ name: "pax_global_header", type: "g", data: Buffer.from("52 comment=0123456789abcdef0123456789abcdef01234567\n") });
const ROOT_DIR = entry({ name: `${ROOT}/`, type: "5" });
const file = (rel, body = "x\n") => entry({ name: `${ROOT}/${rel}`, data: Buffer.from(body) });
const tar = (...parts) => Buffer.concat([GLOBAL, ROOT_DIR, ...parts, END]);
const rules = (res) => res.findings.map((f) => f.rule);

function paxRecord(key, value) {
  const body = ` ${key}=${value}\n`;
  let len = body.length + 1;
  while (String(len).length + body.length !== len) len = String(len).length + body.length;
  return `${len}${body}`;
}

// ── The refusal table: every throw in pharn-cli's extractTar, one fixture kind each (L67) ──────────────────────────

const ENTRY_RULES = [
  ["UNSUPPORTED_TYPE", "hard link (1)", entry({ name: `${ROOT}/hard`, type: "1" }), `${ROOT}/hard`],
  ["UNSUPPORTED_TYPE", "symlink (2)", entry({ name: `${ROOT}/link`, type: "2" }), `${ROOT}/link`],
  ["UNSUPPORTED_TYPE", "char device (3)", entry({ name: `${ROOT}/c`, type: "3" }), `${ROOT}/c`],
  ["UNSUPPORTED_TYPE", "block device (4)", entry({ name: `${ROOT}/b`, type: "4" }), `${ROOT}/b`],
  ["UNSUPPORTED_TYPE", "fifo (6)", entry({ name: `${ROOT}/f`, type: "6" }), `${ROOT}/f`],
  ["UNSUPPORTED_TYPE", "contiguous (7)", entry({ name: `${ROOT}/7`, type: "7" }), `${ROOT}/7`],
  ["UNSUPPORTED_TYPE", "GNU long name (L)", entry({ name: `${ROOT}/L`, type: "L" }), `${ROOT}/L`],
  ["UNSUPPORTED_TYPE", "GNU long link (K)", entry({ name: `${ROOT}/K`, type: "K" }), `${ROOT}/K`],
  ["UNSUPPORTED_TYPE", "unknown byte (Z)", entry({ name: `${ROOT}/z`, type: "Z" }), `${ROOT}/z`],
  ["UNSAFE_CHAR", "newline", file("a\nb"), `${ROOT}/a\\u000ab`],
  ["UNSAFE_CHAR", "RTL override", file("a\u202eb"), `${ROOT}/a\\u202eb`],
  ["UNSAFE_CHAR", "leading BOM", file("\ufeffa"), `${ROOT}/\\ufeffa`],
  ["INVALID_UTF8", "lone 0xff", entry({ nameBytes: Buffer.from([...Buffer.from(`${ROOT}/`), 0xff]) }), `${ROOT}/\\xff`],
  ["ABSOLUTE_PATH", "leading /", entry({ name: `/${ROOT}/etc` }), `/${ROOT}/etc`],
  ["BACKSLASH_OR_COLON", "colon", file("a:b"), `${ROOT}/a:b`],
  ["BACKSLASH_OR_COLON", "backslash", file("a\\b"), `${ROOT}/a\\b`],
  ["DOTDOT", "..", file("../evil"), `${ROOT}/../evil`],
  ["NO_ROOT", "./ root", entry({ name: "./x" }), "./x"],
  ["SECOND_ROOT", "other root", entry({ name: "other/x" }), "other/x"],
  ["EMPTY_SEGMENT", "//", file("a//b"), `${ROOT}/a//b`],
  ["EMPTY_SEGMENT", "/./", file("a/./b"), `${ROOT}/a/./b`],
  ["NOTHING_BELOW_ROOT", "file at the root", entry({ name: ROOT }), ROOT],
  [
    "PAX_EXTENDED_HEADER",
    "x header",
    Buffer.concat([
      entry({ name: "abc.paxheader", type: "x", data: Buffer.from(paxRecord("path", `${ROOT}/${"p".repeat(120)}`)) }),
      entry({ name: "abc.data" }),
    ]),
    `${ROOT}/${"p".repeat(120)}`,
  ],
];

for (const [rule, label, bad, shown] of ENTRY_RULES) {
  test(`${rule} (${label}) → RED, the entry named`, () => {
    assert.ok(Object.hasOwn(RULES, rule), `${rule} is in the closed rule set`);
    const res = checkArchive(tar(file("ok.md"), bad));
    assert.equal(res.ok, false);
    assert.deepEqual(rules(res), [rule]);
    assert.equal(res.findings[0].entry, shown);
    // negative control: the same archive without the planted entry is GREEN
    assert.equal(checkArchive(tar(file("ok.md"))).ok, true);
  });
}

test("EMPTY_PATH → RED (a header whose name and prefix are both empty)", () => {
  const res = checkArchive(tar(entry({ name: "" })));
  assert.deepEqual(rules(res), ["EMPTY_PATH"]);
});

const FRAMING = [
  ["BAD_CHECKSUM", entry({ name: `${ROOT}/a`, checksum: "0000000 " })],
  ["BAD_MAGIC", entry({ name: `${ROOT}/a`, magic: "gnutar" })],
  ["NON_OCTAL", entry({ name: `${ROOT}/a`, size: "9999" })],
  ["TRUNCATED", entry({ name: `${ROOT}/a`, size: octal(4096, 12) })],
];
for (const [rule, bad] of FRAMING) {
  test(`${rule} → RED, and the walk stops there`, () => {
    const res = checkArchive(Buffer.concat([GLOBAL, ROOT_DIR, bad, file("after\nnewline"), END]));
    assert.deepEqual(rules(res), [rule], "nothing after a framing failure is judged");
  });
}

test("NO_END_MARKER → RED for a tar with no zero block, and for zero bytes (L34)", () => {
  assert.deepEqual(rules(checkArchive(Buffer.concat([GLOBAL, ROOT_DIR, file("a")]))), ["NO_END_MARKER"]);
  assert.deepEqual(rules(checkArchive(Buffer.alloc(0))), ["NO_END_MARKER"]);
});

test("DATA_AFTER_END → RED for a non-zero byte after the end marker", () => {
  const bad = Buffer.concat([tar(file("a")), Buffer.from([0, 0, 1])]);
  assert.deepEqual(rules(checkArchive(bad)), ["DATA_AFTER_END"]);
});

test("EMPTY_ARCHIVE → RED for an end marker and nothing else (no vacuous GREEN, L34)", () => {
  assert.deepEqual(rules(checkArchive(END)), ["EMPTY_ARCHIVE"]);
  assert.deepEqual(rules(checkArchive(Buffer.concat([ROOT_DIR, END]))), ["EMPTY_ARCHIVE"], "the root directory is not an entry");
});

test("every rule in the closed set has a fixture above (the enumeration is the deliverable, L29)", () => {
  const covered = new Set([...ENTRY_RULES.map(([r]) => r), ...FRAMING.map(([r]) => r)]);
  for (const r of [
    "EMPTY_PATH",
    "NO_END_MARKER",
    "DATA_AFTER_END",
    "EMPTY_ARCHIVE",
    "TOO_MANY_ENTRIES",
    "TOO_LARGE_COMPRESSED",
    "TOO_LARGE_EXTRACTED",
  ])
    covered.add(r);
  assert.deepEqual([...covered].sort(), Object.keys(RULES).sort());
});

test("several offending entries → one finding each, not the first only", () => {
  const res = checkArchive(
    tar(entry({ name: `${ROOT}/l1`, type: "2" }), file("ok"), entry({ name: `${ROOT}/h1`, type: "1" }), file("a:b"))
  );
  assert.deepEqual(rules(res), ["UNSUPPORTED_TYPE", "UNSUPPORTED_TYPE", "BACKSLASH_OR_COLON"]);
  assert.deepEqual(
    res.findings.map((f) => f.entry),
    [`${ROOT}/l1`, `${ROOT}/h1`, `${ROOT}/a:b`]
  );
});

test("a ustar path split over prefix + name is rebuilt before the rules run", () => {
  const res = checkArchive(tar(entry({ prefix: `${ROOT}/${"d".repeat(60)}`, name: "leaf.md" })));
  assert.equal(res.ok, true, JSON.stringify(res.findings));
  assert.equal(res.entries, 2);
});

// ── The three limits, at the edge and one past it (the CLI refuses only ABOVE each) ─────────────────────────────

test("TOO_MANY_ENTRIES: at the cap GREEN, one past RED; the global header counts, the root directory does not", () => {
  const files = [file("a"), file("b"), file("c")];
  const at = { ...CLI_LIMITS, maxEntries: 4 }; // g + 3 files
  assert.equal(checkArchive(tar(...files), at).ok, true);
  const res = checkArchive(tar(...files, file("d")), at);
  assert.deepEqual(rules(res), ["TOO_MANY_ENTRIES"]);
  assert.match(res.findings[0].detail, /^5 entries > 4$/);
});

test("TOO_LARGE_EXTRACTED: a tar exactly at the cap GREEN, one byte cap below it RED", () => {
  const t = tar(file("a"));
  assert.equal(checkArchive(t, { ...CLI_LIMITS, maxTotalBytes: t.length }).ok, true);
  assert.deepEqual(rules(checkArchive(t, { ...CLI_LIMITS, maxTotalBytes: t.length - 1 })), ["TOO_LARGE_EXTRACTED"]);
});

test("TOO_LARGE_COMPRESSED: Node's gzip size at the cap GREEN, below it RED", () => {
  const t = tar(file("a", "y".repeat(5000)));
  const { gzipBytes } = checkArchive(t);
  assert.equal(checkArchive(t, { ...CLI_LIMITS, maxArchiveBytes: gzipBytes }).ok, true);
  assert.deepEqual(rules(checkArchive(t, { ...CLI_LIMITS, maxArchiveBytes: gzipBytes - 1 })), ["TOO_LARGE_COMPRESSED"]);
});

test("the defaults are pharn-cli 51a96d29's constants (src/lib/repo.ts), and checkArchive uses them with no argument (L41)", () => {
  assert.deepEqual({ ...CLI_LIMITS }, { maxEntries: 20_000, maxTotalBytes: 128 * 1024 * 1024, maxArchiveBytes: 32 * 1024 * 1024 });
  assert.ok(Object.isFrozen(CLI_LIMITS));
  const parts = [];
  for (let i = 0; i < 20_000; i += 1) parts.push(entry({ name: `${ROOT}/f${i}` })); // + the global header = 20,001
  const res = checkArchive(tar(...parts));
  assert.deepEqual(rules(res), ["TOO_MANY_ENTRIES"]);
  assert.match(res.findings[0].detail, /^20001 entries > 20000$/);
  assert.equal(checkArchive(tar(...parts.slice(1))).ok, true, "20,000 including the global header is at the cap");
});

// ── Display is escaped and total (L62) ───────────────────────────────────────────────────────────────────────────

test("finding text never carries a raw control or format character, and the quoting helpers cannot throw", () => {
  const res = checkArchive(tar(file("x\u001b[2Jy"), file("p\u2028q")));
  // An independent oracle (L74): code-point ranges written here, not the checker's own predicate.
  const raw = (s) =>
    [...s].some((c) => {
      const o = c.codePointAt(0);
      return o < 0x20 || (o >= 0x7f && o <= 0x9f) || o === 0x2028 || o === 0x2029 || o === 0x202e;
    });
  assert.equal(res.findings.length, 2);
  for (const f of res.findings) assert.equal(raw(f.entry), false, f.entry);
  assert.equal(escapeUnsafe("a\u0007b"), "a\\u0007b");
  assert.equal(describeBytes(Buffer.from([0x41, 0x5c, 0x0a, 0xff])), "A\\x5c\\x0a\\xff");
});

// ── Real git archive output ──────────────────────────────────────────────────────────────────────────────────────

const GIT_ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "t",
  GIT_AUTHOR_EMAIL: "t@t",
  GIT_COMMITTER_NAME: "t",
  GIT_COMMITTER_EMAIL: "t@t",
};
const git = (dir, ...args) => execFileSync("git", ["-C", dir, ...args], { env: GIT_ENV, encoding: "utf8" }).trim();

/** A temp repo with one ordinary file, plus whatever index entries `extra` adds as [mode, path, content]. */
function withRepo(extra, fn) {
  const dir = mkdtempSync(join(tmpdir(), "source-archive-"));
  try {
    git(dir, "init", "-q");
    writeFileSync(join(dir, "README.md"), "hello\n");
    git(dir, "add", "README.md");
    for (const [mode, path, content] of extra) {
      const tmp = join(dir, ".blob");
      writeFileSync(tmp, content);
      const blob = git(dir, "hash-object", "-w", tmp);
      rmSync(tmp);
      git(dir, "update-index", "--add", "--cacheinfo", `${mode},${blob},${path}`);
    }
    git(dir, "commit", "-q", "--no-verify", "-m", "fixture");
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const runCli = (...args) => spawnSync(process.execPath, [CHECKER, ...args], { encoding: "utf8", env: GIT_ENV });

test("git archive: a clean repo is GREEN through the CLI with pharn-cli's default limits (no override, L41)", () => {
  withRepo([], (dir) => {
    const r = runCli(dir);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(r.stdout, /^SOURCE-ARCHIVE: GREEN — .* 2 entries \(cap 20000\)/);
  });
});

test("git archive: the root is pharn-oss-<full sha>/ and the pax global header carries the commit", () => {
  withRepo([], (dir) => {
    const { sha, tar: t } = archiveTar(dir);
    assert.match(sha, /^[0-9a-f]{40}$/);
    assert.equal(t[156], "g".charCodeAt(0), "git archive opens with a pax global header");
    assert.ok(t.includes(Buffer.from(`pharn-oss-${sha}/README.md`)));
  });
});

test("git archive: a symlink (mode 120000) → RED UNSUPPORTED_TYPE naming it", () => {
  withRepo([["120000", ".claude/skills/linked", "../../.agents/skills/linked"]], (dir) => {
    const r = runCli(dir);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /^- \[UNSUPPORTED_TYPE\] pharn-oss-[0-9a-f]{40}\/\.claude\/skills\/linked — type '2' \(symbolic link\)$/m);
  });
});

test("git archive: a `:` name → RED BACKSLASH_OR_COLON naming it", () => {
  withRepo([["100644", "docs/a:b.md", "x\n"]], (dir) => {
    const r = runCli(dir);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, /^- \[BACKSLASH_OR_COLON\] pharn-oss-[0-9a-f]{40}\/docs\/a:b\.md$/m);
  });
});

test("git archive: a path segment too long for ustar → git writes a pax `x` header → RED naming the real path", () => {
  const leaf = `${"n".repeat(120)}.md`;
  withRepo([["100644", `docs/${leaf}`, "x\n"]], (dir) => {
    const r = runCli(dir);
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp(`^- \\[PAX_EXTENDED_HEADER\\] pharn-oss-[0-9a-f]{40}/docs/${leaf.replace(".", "\\.")} — `, "m"));
    assert.equal((r.stdout.match(/^- \[/gm) ?? []).length, 1, "the entry after the x header is not reported again");
  });
});

test("git archive: export-ignore is honoured, as codeload honours it", () => {
  withRepo(
    [
      ["100644", ".gitattributes", "skip export-ignore\n"],
      ["120000", "skip", "elsewhere"],
    ],
    (dir) => {
      const r = runCli(dir);
      assert.equal(r.status, 0, r.stdout + r.stderr);
    }
  );
});

test("--ref judges another commit, not the working tree", () => {
  withRepo([["120000", "link", "x"]], (dir) => {
    git(dir, "rm", "-q", "--cached", "link");
    git(dir, "commit", "-q", "--no-verify", "-m", "drop the link");
    assert.equal(runCli(dir).status, 0);
    assert.equal(runCli("--ref", "HEAD~1", dir).status, 1);
  });
});

test("unusable input → exit 2, never a verdict", () => {
  const notRepo = mkdtempSync(join(tmpdir(), "source-archive-norepo-"));
  try {
    assert.equal(runCli(notRepo).status, 2);
  } finally {
    rmSync(notRepo, { recursive: true, force: true });
  }
  assert.equal(runCli(join(tmpdir(), "does-not-exist-core-383")).status, 2);
  withRepo([], (dir) => {
    assert.equal(runCli("--ref", "no-such-ref", dir).status, 2);
    assert.equal(runCli("--ref", "--output=/tmp/x", dir).status, 2);
    assert.equal(runCli("--bogus", dir).status, 2);
  });
});

// ── The real repo ────────────────────────────────────────────────────────────────────────────────────────────────

test("this repo's HEAD archive is GREEN — pharn-cli can install it", () => {
  const r = runCli(REPO);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

// ── ✧ WIRING PINS — the checker guards nothing unless something invokes it ───────────────────────────────────────

test("✧ package.json wires check:archive to this checker, and `check` runs it", () => {
  const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
  assert.equal(pkg.scripts["check:archive"], "node .dev/floor/check-source-archive.mjs .");
  assert.match(pkg.scripts.check, /&& npm run check:archive &&/);
});

test("✧ ci.yml's check job runs check:archive, and its step is not disabled by an `if:`", () => {
  // ci.yml runs each gate as its own step and never `npm run check`, so `check`-only wiring would never fire on a PR.
  // HONEST RESIDUAL (P0): this pins the workflow FILE; that GitHub runs the job, and that release.yml keeps waiting for
  // the `check` job, are harness-layer facts.
  const ci = readFileSync(join(REPO, ".github", "workflows", "ci.yml"), "utf8");
  const step = ci.match(/^ {6}- name: [^\n]*\n(?: {8}[^\n]*\n)*? {8}run: npm run check:archive[ \t]*$/m);
  assert.ok(step, "ci.yml must contain a step whose `run:` is `npm run check:archive`");
  const ifs = step[0]
    .split("\n")
    .filter((l) => /^ {8}if:/.test(l))
    .map((l) => l.trim());
  assert.deepEqual(ifs, ["if: ${{ always() && steps.install.outcome == 'success' }}"]);
  const jobs = ci.slice(ci.indexOf("\njobs:"));
  assert.ok(jobs.indexOf("  check:\n") < jobs.indexOf(step[0]), "the step sits in the check job release.yml waits for");
});
