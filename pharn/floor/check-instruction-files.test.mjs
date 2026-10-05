// pharn/floor/check-instruction-files.test.mjs — the instruction-files CLI over real throwaway git repositories: the
// advisory `--report`, the floor `--growth` (its base, its threshold read AT THE BASE, its untracked/ignored handling),
// every refusal by its closed reason_code, and the entry's crash routing (a crash is exit 2 `crashed`, never 1 or 0).
// The anti-gaming properties each carry a negative control (L60); their mutation runs are recorded in
// .dev/features/instruction-growth-gate/BUILD.md.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { EXIT as CORE_EXIT, REASON_CODES, DEFAULT_GROWTH_BYTES } from "./instruction-files-core.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "check-instruction-files.mjs");

function repo(files = {}) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "ifc-")));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe", encoding: "utf8" });
  git("init", "-q", "-b", "work", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  write(dir, files);
  return { dir, git };
}
function write(dir, files) {
  for (const [p, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), content);
  }
}
function commit(fx, msg = "c") {
  fx.git("add", "-A");
  fx.git("commit", "-q", "--allow-empty", "-m", msg);
  return fx.git("rev-parse", "HEAD").trim();
}
function run(cwd, args, cli = CLI) {
  const r = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
  let doc = null;
  try {
    doc = JSON.parse(r.stdout);
  } catch {
    /* asserted by the caller */
  }
  return { code: r.status, doc, raw: r.stdout + r.stderr };
}
function withRepo(files, fn) {
  const fx = repo(files);
  try {
    return fn(fx);
  } finally {
    rmSync(fx.dir, { recursive: true, force: true });
  }
}
const kb = (n, tag = "x") =>
  Array.from({ length: n }, (_, i) => `${tag} line ${String(i).padStart(4, "0")} ${"-".repeat(20)}`).join("\n") + "\n";

// ── --report ────────────────────────────────────────────────────────────────────────────────────────
test("ACCEPTANCE --report on a pharn-starter-shaped project: exact totals, 8 globs-not-read notes, personal listed, not counted", () => {
  const files = { "CLAUDE.md": kb(4000, "claude"), ".gitignore": "CLAUDE.local.md\n", "CLAUDE.local.md": "mine\n", "src/a.js": "1\n" };
  for (let i = 0; i < 8; i++)
    files[`.claude/rules/cursor-${i}.md`] = `---\ndescription: rule ${i}\nglobs: "src/**/*.ts"\n---\n${kb(300, `g${i}`)}`;
  for (let i = 0; i < 6; i++) files[`.claude/rules/plain-${i}.md`] = kb(200, `p${i}`);
  withRepo(files, ({ dir }) => {
    const r = run(dir, ["--report"]);
    assert.equal(r.code, 0, r.raw);
    assert.equal(r.doc.verdict, "reported");
    assert.equal(r.doc.files.length, 15);
    const expected = Object.entries(files)
      .filter(([p]) => p === "CLAUDE.md" || p.startsWith(".claude/rules/"))
      .reduce((s, [, c]) => s + Buffer.byteLength(c), 0);
    assert.equal(r.doc.total_bytes, expected);
    assert.equal(r.doc.estimated_tokens, Math.ceil(expected / 4));
    assert.match(r.doc.estimate_basis, /estimate/);
    assert.equal(r.doc.notes.filter((n) => n.code === "globs-not-read").length, 8);
    assert.deepEqual(r.doc.personal, { path: "CLAUDE.local.md", bytes: 5, counted_by_growth: false });
    assert.deepEqual(r.doc.path_scoped, []);
  });
});

test("--report: no CLAUDE.md at all → an empty set with its note, exit 0; a git-ignored CLAUDE.md is noted, never counted", () => {
  withRepo({ "src/a.js": "1\n" }, ({ dir }) => {
    const r = run(dir, ["--report"]);
    assert.equal(r.code, 0, r.raw);
    assert.equal(r.doc.total_bytes, 0);
    assert.deepEqual(r.doc.notes, [{ code: "no-instruction-files", path: "" }]);
    assert.equal(r.doc.personal, null);
  });
  withRepo({ ".gitignore": "CLAUDE.md\n", "CLAUDE.md": "ignored\n" }, ({ dir }) => {
    const r = run(dir, ["--report"]);
    assert.equal(r.doc.total_bytes, 0);
    assert.ok(
      r.doc.notes.some((n) => n.code === "git-ignored-not-counted" && n.path === "CLAUDE.md"),
      JSON.stringify(r.doc.notes)
    );
  });
  withRepo({ "CLAUDE.md": "x\n" }, ({ dir }) => {
    mkdirSync(join(dir, "CLAUDE.local.md"));
    const r = run(dir, ["--report"]);
    assert.ok(r.doc.notes.some((n) => n.code === "personal-not-regular"));
  });
});

// ── --growth ────────────────────────────────────────────────────────────────────────────────────────
test("ACCEPTANCE --growth: a 5 KB section appended to CLAUDE.md is over (exit 1); a one-line edit is within (exit 0)", () => {
  withRepo({ "CLAUDE.md": kb(50) }, (fx) => {
    const base = commit(fx);
    writeFileSync(join(fx.dir, "CLAUDE.md"), kb(50) + "## Feature notes\n" + "y".repeat(5 * 1024) + "\n");
    const r = run(fx.dir, ["--growth", "--base", base]);
    assert.equal(r.code, 1, r.raw);
    assert.equal(r.doc.verdict, "over");
    assert.equal(r.doc.base, base);
    assert.equal(r.doc.base_source, "explicit");
    assert.equal(r.doc.threshold, DEFAULT_GROWTH_BYTES);
    assert.equal(r.doc.threshold_source, "default", "the default reached through the CLI with no config at base (L41)");
    assert.equal(r.doc.added_bytes, "## Feature notes\n".length + 5 * 1024 + 1);
    writeFileSync(join(fx.dir, "CLAUDE.md"), kb(50).replace("x line 0003", "x line 0003 — use pnpm"));
    const ok = run(fx.dir, ["--growth", "--base", base]);
    assert.equal(ok.code, 0, ok.raw);
    assert.equal(ok.doc.verdict, "within");
    assert.ok(ok.doc.added_bytes > 0 && ok.doc.added_bytes < 100);
  });
});

test("★ ANTI-GAMING — the threshold is read at the BASE: raising it in the working tree changes nothing (control: the same raise at base does)", () => {
  withRepo({ "CLAUDE.md": "a\n" }, (fx) => {
    const base = commit(fx);
    writeFileSync(join(fx.dir, "CLAUDE.md"), "a\n" + "y".repeat(5000) + "\n");
    writeFileSync(join(fx.dir, "pharn.config.json"), JSON.stringify({ budget: { instructionGrowthBytes: 100000 } }));
    const r = run(fx.dir, ["--growth", "--base", base]);
    assert.equal(r.code, 1, r.raw);
    assert.equal(r.doc.threshold, DEFAULT_GROWTH_BYTES);
  });
  // Control: the SAME raise, committed on the base before the change, is honoured.
  withRepo({ "CLAUDE.md": "a\n", "pharn.config.json": JSON.stringify({ budget: { instructionGrowthBytes: 100000 } }) }, (fx) => {
    const base = commit(fx);
    writeFileSync(join(fx.dir, "CLAUDE.md"), "a\n" + "y".repeat(5000) + "\n");
    const c = run(fx.dir, ["--growth", "--base", base]);
    assert.equal(c.code, 0, c.raw);
    assert.equal(c.doc.threshold, 100000);
    assert.equal(c.doc.threshold_source, "config");
  });
});

test("★ ANTI-GAMING — deleting unrelated content does not offset an addition (control: the net change is negative)", () => {
  const big = kb(400, "old");
  withRepo({ "CLAUDE.md": "keep\n" + big }, (fx) => {
    const base = commit(fx);
    const added = "z".repeat(3000) + "\n";
    writeFileSync(join(fx.dir, "CLAUDE.md"), "keep\n" + added);
    const r = run(fx.dir, ["--growth", "--base", base]);
    assert.ok(Buffer.byteLength(added) - Buffer.byteLength(big) < 0, "control: the net change is negative");
    assert.equal(r.doc.added_bytes, Buffer.byteLength(added));
    assert.equal(r.code, 1, r.raw);
  });
});

test("--growth: a pure deletion adds 0 (exit 0); untracked always-loaded files count; git-ignored ones do not; CLAUDE.local.md never does", () => {
  withRepo({ "CLAUDE.md": kb(30), ".gitignore": ".claude/rules/ignored.md\nCLAUDE.local.md\n" }, (fx) => {
    const base = commit(fx);
    writeFileSync(join(fx.dir, "CLAUDE.md"), "short\n");
    const del = run(fx.dir, ["--growth", "--base", base]);
    assert.equal(del.code, 0, del.raw);
    assert.equal(del.doc.added_bytes, 6, "only the one new line `short` counts; the 30 removed lines offset nothing");
    write(fx.dir, {
      ".claude/rules/untracked.md": "u".repeat(3000) + "\n",
      ".claude/rules/ignored.md": "i".repeat(9000) + "\n",
      "CLAUDE.local.md": "p".repeat(9000),
    });
    const r = run(fx.dir, ["--growth", "--base", base]);
    assert.equal(r.code, 1, r.raw);
    assert.deepEqual(r.doc.files.map((f) => f.path).sort(), [".claude/rules/untracked.md", "CLAUDE.md"]);
    assert.equal(r.doc.files.find((f) => f.path === ".claude/rules/untracked.md").entered_set, true);
  });
});

test("--growth: a rule losing `paths:` or gaining a catch-all counts WHOLE; staying scoped counts nothing", () => {
  const body = kb(100, "rule");
  withRepo(
    {
      ".claude/rules/a.md": `---\npaths:\n  - "src/**"\n---\n${body}`,
      ".claude/rules/b.md": `---\npaths:\n  - "src/**"\n---\n${body}`,
      ".claude/rules/c.md": `---\npaths:\n  - "src/**"\n---\n${body}`,
    },
    (fx) => {
      const base = commit(fx);
      writeFileSync(join(fx.dir, ".claude/rules/a.md"), `---\ndescription: lost paths\n---\n${body}`);
      writeFileSync(join(fx.dir, ".claude/rules/b.md"), `---\npaths:\n  - "**"\n---\n${body}`);
      writeFileSync(join(fx.dir, ".claude/rules/c.md"), `---\npaths:\n  - "lib/**"\n---\n${body}x\n`);
      const r = run(fx.dir, ["--growth", "--base", base]);
      assert.equal(r.code, 1, r.raw);
      assert.deepEqual(
        r.doc.files.map((f) => [f.path, f.entered_set]),
        [
          [".claude/rules/a.md", true],
          [".claude/rules/b.md", true],
        ]
      );
      assert.equal(
        r.doc.added_bytes,
        Buffer.byteLength(`---\ndescription: lost paths\n---\n${body}`) + Buffer.byteLength(`---\npaths:\n  - "**"\n---\n${body}`)
      );
    }
  );
});

test("--growth --base-rule: a dirty tree measures against HEAD; a clean tree against merge-base origin/main; neither → base-unresolved", () => {
  withRepo({ "CLAUDE.md": "a\n" }, (fx) => {
    const first = commit(fx);
    writeFileSync(join(fx.dir, "CLAUDE.md"), "a\nb\n");
    const second = commit(fx);
    // Clean, no origin/main → INCONCLUSIVE (a gate cannot ask).
    const clean = run(fx.dir, ["--growth", "--base-rule"]);
    assert.equal(clean.code, 2, clean.raw);
    assert.equal(clean.doc.reason_code, "base-unresolved");
    // Clean, origin/main at the first commit → merge-base = first; growth = the committed line.
    fx.git("update-ref", "refs/remotes/origin/main", first);
    const mb = run(fx.dir, ["--growth", "--base-rule"]);
    assert.equal(mb.code, 0, mb.raw);
    assert.deepEqual([mb.doc.base, mb.doc.base_source, mb.doc.added_bytes], [first, "merge-base", 2]);
    // Dirty (outside .pharn/) → HEAD.
    writeFileSync(join(fx.dir, "CLAUDE.md"), "a\nb\nc\n");
    const dirty = run(fx.dir, ["--growth", "--base-rule"]);
    assert.deepEqual([dirty.doc.base, dirty.doc.base_source, dirty.doc.added_bytes], [second, "head", 2]);
    // Control: a change under .pharn/ alone is not "dirty" (the state root, as BASE_RULE reads it).
    writeFileSync(join(fx.dir, "CLAUDE.md"), "a\nb\n");
    write(fx.dir, { ".pharn/scratch.txt": "s" });
    const st = run(fx.dir, ["--growth", "--base-rule"]);
    assert.equal(st.doc.base_source, "merge-base", st.raw);
  });
});

test("--growth: an unborn HEAD with a dirty tree is base-unresolved, never an empty base", () => {
  withRepo({ "CLAUDE.md": "x".repeat(5000) }, ({ dir }) => {
    const r = run(dir, ["--growth", "--base-rule"]);
    assert.equal(r.code, 2, r.raw);
    assert.equal(r.doc.reason_code, "base-unresolved");
  });
});

test("--growth: the threshold at base — valid raises it, malformed is threshold-malformed (exit 2), a non-file entry too", () => {
  for (const [cfg, code, reason] of [
    [JSON.stringify({ budget: { instructionGrowthBytes: 10 } }), 1, null],
    [JSON.stringify({ budget: { instructionGrowthBytes: 9999 } }), 0, null],
    ["{not json", 2, "threshold-malformed"],
    [JSON.stringify({ budget: { instructionGrowthBytes: "big" } }), 2, "threshold-malformed"],
    ['{"budget":{"instructionGrowthBytes":{"toString":1}}}', 2, "threshold-malformed"],
  ]) {
    withRepo({ "CLAUDE.md": "a\n", "pharn.config.json": cfg }, (fx) => {
      const base = commit(fx);
      writeFileSync(join(fx.dir, "CLAUDE.md"), "a\n" + "b".repeat(100) + "\n");
      const r = run(fx.dir, ["--growth", "--base", base]);
      assert.equal(r.code, code, `${cfg}: ${r.raw}`);
      if (reason) assert.equal(r.doc.reason_code, reason);
    });
  }
  withRepo({ "CLAUDE.md": "a\n", "real.json": "{}" }, (fx) => {
    symlinkSync("real.json", join(fx.dir, "pharn.config.json"));
    const base = commit(fx);
    const r = run(fx.dir, ["--growth", "--base", base]);
    assert.equal(r.doc.reason_code, "threshold-malformed", r.raw);
  });
});

test("--growth: a `git replace` of the base config cannot change the threshold (--no-replace-objects; control: plain cat-file sees the replacement)", () => {
  withRepo({ "CLAUDE.md": "a\n", "pharn.config.json": JSON.stringify({ budget: { instructionGrowthBytes: 10 } }) }, (fx) => {
    const base = commit(fx);
    const oldBlob = fx.git("rev-parse", `${base}:pharn.config.json`).trim();
    writeFileSync(join(fx.dir, "forged.json"), JSON.stringify({ budget: { instructionGrowthBytes: 100000 } }));
    const forged = fx.git("hash-object", "-w", "forged.json").trim();
    fx.git("replace", oldBlob, forged);
    rmSync(join(fx.dir, "forged.json"));
    assert.match(fx.git("cat-file", "blob", oldBlob), /100000/, "control: a plain read sees the replacement");
    writeFileSync(join(fx.dir, "CLAUDE.md"), "a\n" + "b".repeat(500) + "\n");
    const r = run(fx.dir, ["--growth", "--base", base]);
    assert.equal(r.doc.threshold, 10, r.raw);
    assert.equal(r.code, 1);
  });
});

test("refusals: every bad input exits 2 with its closed reason_code, never 0 or 1", () => {
  withRepo({ "CLAUDE.md": "a\n" }, (fx) => {
    commit(fx);
    for (const args of [
      [],
      ["--report", "--growth"],
      ["--growth"],
      ["--growth", "--base-rule", "--base", "HEAD"],
      ["--report", "--base", "HEAD"],
      ["--growth", "--base"],
      ["--growth", "--base", "-x"],
      ["--bogus"],
      ["--report", "--report"],
      ["--growth", "--base-rule", "--base-rule"],
      ["--growth", "--base", "HEAD", "--base", "HEAD"],
    ]) {
      const r = run(fx.dir, args);
      assert.equal(r.code, 2, `${args.join(" ")}: ${r.raw}`);
      assert.equal(r.doc.reason_code, "usage-error", args.join(" "));
    }
    const nc = run(fx.dir, ["--growth", "--base", "nope"]);
    assert.equal(nc.doc.reason_code, "base-not-commit");
  });
  const plain = realpathSync(mkdtempSync(join(tmpdir(), "ifc-nogit-")));
  try {
    const r = run(plain, ["--report"]);
    assert.equal(r.code, 2);
    assert.equal(r.doc.reason_code, "git-failed");
  } finally {
    rmSync(plain, { recursive: true, force: true });
  }
});

test("refusal: an unreadable file in the set is `unreadable` (exit 2), never skipped", { skip: process.getuid?.() === 0 }, () => {
  withRepo({ "CLAUDE.md": "a\n", ".claude/rules/r.md": "r\n" }, (fx) => {
    const base = commit(fx);
    chmodSync(join(fx.dir, ".claude/rules/r.md"), 0o000);
    try {
      const r = run(fx.dir, ["--growth", "--base", base]);
      assert.equal(r.code, 2, r.raw);
      assert.equal(r.doc.reason_code, "unreadable");
    } finally {
      chmodSync(join(fx.dir, ".claude/rules/r.md"), 0o644);
    }
  });
});

test("--growth: an in-root rule symlink is followed on both sides; an out-of-root one is noted and not counted", () => {
  withRepo({ "CLAUDE.md": "a\n", "shared/conv.md": "c\n" }, (fx) => {
    const base = commit(fx);
    mkdirSync(join(fx.dir, ".claude/rules"), { recursive: true });
    symlinkSync("../../shared/conv.md", join(fx.dir, ".claude/rules/conv.md"));
    symlinkSync("/etc/hosts", join(fx.dir, ".claude/rules/out.md"));
    const r = run(fx.dir, ["--growth", "--base", base]);
    assert.equal(r.code, 0, r.raw);
    assert.deepEqual(r.doc.files, [{ path: ".claude/rules/conv.md", added_bytes: 2, entered_set: true }]);
    assert.ok(r.doc.notes.some((n) => n.code === "outside-root" && n.path === ".claude/rules/out.md"));
    commit(fx);
    const again = run(fx.dir, ["--growth", "--base", "HEAD"]);
    assert.equal(again.doc.added_bytes, 0, "the base side follows the committed link too");
  });
});

// ── GATE 2 review fixes, through the real CLI ───────────────────────────────────────────────────────────────────
test("GATE 2 — a project root BELOW the git top level (a monorepo package) is measured, not refused", () => {
  withRepo(
    {
      "CLAUDE.md": "monorepo root — not this project's\n",
      "app/CLAUDE.md": "a\n",
      "app/pharn.config.json": JSON.stringify({ budget: { instructionGrowthBytes: 10 } }),
      "pharn.config.json": JSON.stringify({ budget: { instructionGrowthBytes: 100000 } }),
    },
    (fx) => {
      const base = commit(fx);
      const app = join(fx.dir, "app");
      writeFileSync(join(app, "CLAUDE.md"), "a\n" + "b".repeat(100) + "\n");
      writeFileSync(join(fx.dir, "CLAUDE.md"), "z".repeat(9000));
      const r = run(app, ["--growth", "--base-rule"]);
      assert.equal(r.code, 1, r.raw);
      assert.deepEqual([r.doc.base, r.doc.base_source], [base, "head"]);
      assert.equal(r.doc.threshold, 10, "the PROJECT's config at the base, not the monorepo root's");
      assert.deepEqual(r.doc.files, [{ path: "CLAUDE.md", added_bytes: 101, entered_set: false }], "only the project's files count");
      const rep = run(app, ["--report"]);
      assert.equal(rep.code, 0, rep.raw);
      assert.deepEqual(
        rep.doc.files.map((f) => f.path),
        ["CLAUDE.md"]
      );
    }
  );
});

test("GATE 2 — a case-variant `claude.md` and `.Claude/rules/` are counted, with no false git-ignored note", () => {
  withRepo({ "src/a.js": "1\n" }, (fx) => {
    const base = commit(fx);
    write(fx.dir, { "claude.md": "c".repeat(3000) + "\n", ".Claude/rules/a.md": "r\n" });
    const r = run(fx.dir, ["--growth", "--base", base]);
    assert.equal(r.code, 1, r.raw);
    assert.deepEqual(
      r.doc.files.map((f) => f.path),
      [".claude/rules/a.md", "CLAUDE.md"]
    );
    assert.ok(!r.doc.notes.some((n) => n.code === "git-ignored-not-counted"), JSON.stringify(r.doc.notes));
    assert.ok(r.doc.notes.some((n) => n.code === "case-variant" && n.path === "CLAUDE.md"));
  });
});

test("GATE 2 — a submodule holding the rules: --report notes it unread; a moved submodule is `submodule-changed`; an unmoved one is 0", () => {
  const sub = repo({ "big.md": "x".repeat(10001) });
  try {
    commit(sub);
    withRepo({ "CLAUDE.md": "a\n" }, (fx) => {
      fx.git("-c", "protocol.file.allow=always", "submodule", "add", "-q", sub.dir, ".claude/rules");
      const base = commit(fx);
      const rep = run(fx.dir, ["--report"]);
      assert.ok(
        rep.doc.notes.some((n) => n.code === "submodule-not-read" && n.path === ".claude/rules"),
        JSON.stringify(rep.doc.notes)
      );
      const same = run(fx.dir, ["--growth", "--base", base]);
      assert.equal(same.code, 0, same.raw);
      assert.equal(same.doc.added_bytes, 0);
      // Move the submodule to a new commit (checked out, not staged).
      const inner = (...a) => execFileSync("git", a, { cwd: join(fx.dir, ".claude/rules"), stdio: "pipe", encoding: "utf8" });
      inner("config", "user.email", "t@t");
      inner("config", "user.name", "t");
      writeFileSync(join(fx.dir, ".claude/rules/more.md"), "y".repeat(5000));
      inner("add", "-A");
      inner("commit", "-q", "-m", "more");
      const moved = run(fx.dir, ["--growth", "--base", base]);
      assert.equal(moved.code, 2, moved.raw);
      assert.equal(moved.doc.reason_code, "submodule-changed");
    });
  } finally {
    rmSync(sub.dir, { recursive: true, force: true });
  }
});

test("GATE 2 — a staged rename INTO .pharn/ is a dirty tree for --base-rule (either path counts), as regress reads it", () => {
  withRepo({ "CLAUDE.md": "a\n", "src/x.js": "1\n" }, (fx) => {
    const head = commit(fx);
    fx.git("mv", "src/x.js", ".pharn-moved.js"); // control first: an ordinary rename is dirty
    assert.equal(run(fx.dir, ["--growth", "--base-rule"]).doc.base_source, "head");
    fx.git("mv", ".pharn-moved.js", "src/x.js");
    mkdirSync(join(fx.dir, ".pharn"));
    fx.git("mv", "src/x.js", ".pharn/x.js");
    const r = run(fx.dir, ["--growth", "--base-rule"]);
    assert.equal(r.code, 0, r.raw);
    assert.deepEqual([r.doc.base, r.doc.base_source], [head, "head"]);
  });
});

test("GATE 2 — an in-root absolute link spelled through the temp-dir alias is followed, not read as outside-root", () => {
  withRepo({ "CLAUDE.md": "a\n", "docs/rules/r.md": "r".repeat(3000) + "\n" }, (fx) => {
    const base = commit(fx);
    // `fx.dir` is the realpath; join(tmpdir(), basename) is the spelling a process may hold (/var vs /private/var).
    const alias = join(tmpdir(), fx.dir.split("/").pop(), "docs", "rules");
    mkdirSync(join(fx.dir, ".claude"), { recursive: true });
    symlinkSync(alias, join(fx.dir, ".claude/rules"));
    const r = run(fx.dir, ["--growth", "--base", base]);
    assert.equal(r.code, 1, r.raw);
    assert.deepEqual(
      r.doc.files.map((f) => f.path),
      [".claude/rules/r.md"]
    );
  });
});

// ── the entry: crash routing ──────────────────────────────────────────────────────────────────────────
function floorCopy(overrides = {}) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), "ifc-floor-")));
  const seen = new Set();
  const queue = ["check-instruction-files.mjs"];
  while (queue.length) {
    const m = queue.shift();
    if (seen.has(m)) continue;
    seen.add(m);
    for (const [, dep] of readFileSync(join(HERE, m), "utf8").matchAll(/["']\.\/([a-z0-9-]+\.mjs)["']/g)) queue.push(dep);
  }
  for (const m of seen) copyFileSync(join(HERE, m), join(dir, m));
  for (const [m, src] of Object.entries(overrides)) writeFileSync(join(dir, m), src);
  return dir;
}

test("★ the entry maps a module that cannot load, a throw, and an out-of-contract result to exit 2 `crashed` — the unbroken copy is the control", () => {
  withRepo({ "CLAUDE.md": "a\n" }, (fx) => {
    const base = commit(fx);
    writeFileSync(join(fx.dir, "CLAUDE.md"), "a\n" + "b".repeat(5000) + "\n");
    const src = readFileSync(join(HERE, "instruction-files.mjs"), "utf8");
    const cases = [
      ["control", {}, 1, "over"],
      ["load", { "instruction-files.mjs": "this is not javascript (" }, 2, "inconclusive"],
      [
        "throw",
        {
          "instruction-files.mjs": src.replace(
            "export function evaluate(argv, cwd = process.cwd()) {",
            "export function evaluate() {\n  throw new Error('boom');"
          ),
        },
        2,
        "inconclusive",
      ],
      ["contract", { "instruction-files.mjs": src.replace("code: over ? EXIT.over : EXIT.ok,", "code: EXIT.ok,") }, 2, "inconclusive"],
    ];
    for (const [name, overrides, code, verdict] of cases) {
      if (name !== "control" && name !== "load")
        assert.notEqual(overrides["instruction-files.mjs"], src, `mutation anchor for ${name} not found`);
      const floor = floorCopy(overrides);
      try {
        const r = run(fx.dir, ["--growth", "--base", base], join(floor, "check-instruction-files.mjs"));
        assert.equal(r.code, code, `${name}: ${r.raw}`);
        assert.equal(r.doc.verdict, verdict, name);
        if (code === 2) assert.equal(r.doc.reason_code, "crashed", name);
      } finally {
        rmSync(floor, { recursive: true, force: true });
      }
    }
  });
});

test("✧ the entry has NO static import, and its two second copies (EXIT, the crash code) equal the core's", () => {
  const src = readFileSync(CLI, "utf8");
  assert.doesNotMatch(src, /^\s*import\s/m, "a static import could fail before the entry's try");
  const exit = src.match(/const EXIT = Object\.freeze\((\{[^}]+\})\)/);
  assert.ok(exit, "the EXIT copy must be present");
  assert.deepEqual(Function(`return ${exit[1]}`)(), { ...CORE_EXIT });
  const crashed = src.match(/const CRASHED = "([a-z-]+)"/);
  assert.ok(crashed && REASON_CODES.includes(crashed[1]));
});

test("the entry in-process: run() maps each failure of the loaded module to exit 2 `crashed`; the real module is the control", async () => {
  const entry = await import("./check-instruction-files.mjs");
  const doc = (r) => JSON.parse(r.text);
  const real = await entry.run(["--bogus"]);
  assert.equal(real.code, 2);
  assert.equal(doc(real).reason_code, "usage-error", "control: the real module answers with its own refusal");
  const cases = [
    ["cannot load", () => Promise.reject(new Error("syntax\nsecond line"))],
    [
      "throws",
      async () => ({
        evaluate: () => {
          throw JSON.parse('{"toString":1}');
        },
      }),
    ],
    ["no document", async () => ({ evaluate: () => ({ code: 0 }) })],
    ["bad exit", async () => ({ evaluate: () => ({ code: 7, doc: { verdict: "within" } }) })],
    ["not an object", async () => ({ evaluate: () => ({ code: 0, doc: [1] }) })],
    ["wrong verdict", async () => ({ evaluate: () => ({ code: 1, doc: { verdict: "within" } }) })],
  ];
  for (const [name, load] of cases) {
    const r = await entry.run([], load);
    assert.equal(r.code, 2, name);
    assert.equal(doc(r).verdict, "inconclusive", name);
    assert.equal(doc(r).reason_code, "crashed", name);
  }
  assert.equal(entry.firstLineOf(JSON.parse('{"message":{"toString":1}}')), "a thrown value with no string form");
  assert.ok(doc(entry.crashed("x", new Error("y".repeat(400)))).reason.includes("…"), "a long first line is bounded");
  assert.equal(entry.outsideContract(0, JSON.stringify({ verdict: "reported" })), null);
});
