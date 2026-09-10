// .claude/hooks/protect-trusted-paths.test.cjs — black-box tests for the pre-write floor hook.
//
// The hook reads a PreToolUse payload from stdin and exits 2 (deny) on a trusted path,
// 0 (allow) otherwise. We drive it as a subprocess and assert on exit code + stderr.
//
// TWO HARNESSES, and the difference is load-bearing. The hook anchors its protected set to its OWN
// location (<root>/.claude/hooks/<this file>), NOT to cwd. So:
//   • run()    drives the REAL hook in this repo; relative paths resolve against cwd, which `npm test`
//              sets to the repo root, and the anchor is this repo.
//   • runIn()  drives the hook INSTALLED into a throwaway sandbox at <sb>/.claude/hooks/ (a symlink to
//              the real file — see sandbox()). That is the only way to exercise a different root —
//              symlink fixtures, subpath installs, cwd variation — and it mirrors how the hook ships.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const { join, dirname } = require("node:path");

const HOOK = join(__dirname, "protect-trusted-paths.cjs");

function run(payload, cwd) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    ...(cwd ? { cwd } : {}),
  });
}

function tmp() {
  return fs.realpathSync(fs.mkdtempSync(join(os.tmpdir(), "pharn-fix2-")));
}

// Build a throwaway repo with this hook INSTALLED at its real relative location, plus any listed files.
//
// The install is a SYMLINK to the real hook by default, not a copy — deliberately. A copy is a different
// file, so every sandbox assertion would exercise (and report coverage for) a duplicate rather than the
// script that actually ships. The symlink is also the more honest fixture: it is exactly the
// dotfiles/stow install shape, and the hook guards BOTH the as-invoked root (this sandbox) and the
// symlink-resolved one, so sandbox paths still resolve against the sandbox.
//
// MUTANTS MUST PASS { link: false }. Writing modified source through a symlink would overwrite the real
// hook in this repo; mutantSandbox() below asserts it is editing a plain file before it writes.
function sandbox(files = [], { link = true } = {}) {
  const dir = tmp();
  fs.mkdirSync(join(dir, ".claude", "hooks"), { recursive: true });
  const dest = join(dir, ".claude", "hooks", "protect-trusted-paths.cjs");
  if (link) fs.symlinkSync(HOOK, dest);
  else fs.copyFileSync(HOOK, dest);
  for (const f of files) {
    const p = join(dir, f);
    fs.mkdirSync(dirname(p), { recursive: true });
    fs.writeFileSync(p, "trusted\n");
  }
  return dir;
}

function runIn(dir, payload, cwd) {
  return spawnSync(process.execPath, [join(dir, ".claude", "hooks", "protect-trusted-paths.cjs")], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    cwd: cwd || dir,
  });
}

// Read the hook's own DEFAULT_PROTECTED so derived tests cannot go stale (L4).
function declaredProtected() {
  const src = fs.readFileSync(HOOK, "utf8").replace(/^[ \t]*\/\/.*$/gm, "");
  const m = src.match(/^const DEFAULT_PROTECTED = \[([\s\S]*?)^\];/m);
  assert.ok(m, "protect-trusted-paths.cjs must declare a top-level `const DEFAULT_PROTECTED = [ … ];`");
  return (m[1].match(/"([^"]*)"/g) || []).map((s) => s.slice(1, -1));
}

// A copy of the hook with one source substitution applied, installed in its own sandbox (L4 mutants).
function mutantSandbox(files, anchor, replacement) {
  const dir = sandbox(files, { link: false });
  const target = join(dir, ".claude", "hooks", "protect-trusted-paths.cjs");
  assert.ok(!fs.lstatSync(target).isSymbolicLink(), "a mutant must never be written through a symlink to the real hook");
  const src = fs.readFileSync(target, "utf8");
  assert.ok(src.includes(anchor), `mutant anchor not found in source: ${anchor}`);
  fs.writeFileSync(target, src.replace(anchor, replacement));
  return dir;
}

const TRUSTED = ["pharn/CONSTITUTION.md", "pharn/ARCHITECTURE.md", "THREAT-MODEL.md", "LIMITS.md", ".github/CODEOWNERS"];

test("blocks writes to a trusted spec doc", () => {
  const r = run({ tool_name: "Write", tool_input: { file_path: "pharn/CONSTITUTION.md" } });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /BLOCKED by PHARN floor/);
});

test("blocks writes to .github/CODEOWNERS (the GitHub-layer write-guard)", () => {
  const r = run({ tool_name: "Edit", tool_input: { file_path: ".github/CODEOWNERS" } });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /BLOCKED by PHARN floor/);
});

test("allows writes to an ordinary file", () => {
  const r = run({ tool_name: "Write", tool_input: { file_path: "src/foo.js" } });
  assert.equal(r.status, 0);
});

// --- Symlink escape: a write to an innocent path that RESOLVES to a trusted doc is denied. These run in
// a sandbox INSTALL, because the guarded root is the hook's own location. ---

test("blocks a Write to a committed symlink that resolves to a trusted doc (leaf symlink)", () => {
  const sb = sandbox(["pharn/CONSTITUTION.md"]);
  fs.mkdirSync(join(sb, "pharn", "features"), { recursive: true });
  fs.symlinkSync(join("..", "..", "pharn", "CONSTITUTION.md"), join(sb, "pharn", "features", "notes.md"));
  const r = runIn(sb, { tool_name: "Write", tool_input: { file_path: "pharn/features/notes.md" } });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /BLOCKED by PHARN floor/);
});

test("blocks a Write through a symlinked PARENT dir onto a trusted doc (ancestor resolves)", () => {
  const sb = sandbox(["pharn/CONSTITUTION.md"]);
  fs.mkdirSync(join(sb, "pharn", "features"), { recursive: true });
  fs.symlinkSync(join("..", ".."), join(sb, "pharn", "features", "evil")); // pharn/features/evil -> repo root
  const r = runIn(sb, { tool_name: "Write", tool_input: { file_path: "pharn/features/evil/pharn/CONSTITUTION.md" } });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /BLOCKED by PHARN floor/);
});

test("blocks a deeply-nested symlink resolving onto pharn/CONSTITUTION.md, and reports the resolution", () => {
  const sb = sandbox(["pharn/CONSTITUTION.md"]);
  fs.mkdirSync(join(sb, "a", "b", "c"), { recursive: true });
  fs.symlinkSync(join("..", "..", "..", "pharn", "CONSTITUTION.md"), join(sb, "a", "b", "c", "notes.md"));
  const r = runIn(sb, { tool_name: "Write", tool_input: { file_path: "a/b/c/notes.md" } });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /a\/b\/c\/notes\.md ->/);
});

test("blocks a Write to a committed symlink that resolves to .claude/settings.json", () => {
  const sb = sandbox([".claude/settings.json"]);
  fs.mkdirSync(join(sb, "pharn", "features"), { recursive: true });
  fs.symlinkSync(join("..", "..", ".claude", "settings.json"), join(sb, "pharn", "features", "notes.md"));
  const r = runIn(sb, { tool_name: "Write", tool_input: { file_path: "pharn/features/notes.md" } });
  assert.equal(r.status, 2);
});

test("allows a real (non-symlink) file in a nested allowed dir (no false positive from realpath)", () => {
  const sb = sandbox(["pharn/features/notes.md"]);
  const r = runIn(sb, { tool_name: "Write", tool_input: { file_path: "pharn/features/notes.md" } });
  assert.equal(r.status, 0);
});

// --- LEXICAL `..` AFTER A SYMLINKED DIRECTORY. path.resolve() collapses `..` lexically, which is NOT
// what the filesystem does: with `a -> pharn/sub`, `a/../ARCHITECTURE.md` collapses to an unprotected
// path while the OS opens pharn/ARCHITECTURE.md. Demonstrated by performing the write, so the fixture
// asserts the guard denies it AND that the naive resolution would have hit the trusted file. ---

test("✧ blocks `..` applied after a SYMLINKED directory (lexical collapse is not filesystem semantics)", () => {
  const sb = sandbox(["pharn/ARCHITECTURE.md", "pharn/CONSTITUTION.md", "pharn/sub/keep.md"]);
  fs.symlinkSync(join(sb, "pharn", "sub"), join(sb, "a"));
  // Prove the vector is real the only honest way: PERFORM the write and see which file changed. Note
  // that fs.realpathSync() cannot be used to show this — it resolves `..` lexically too (it calls
  // path.resolve first), which is exactly why the hook resolves segment by segment instead.
  assert.equal(require("node:path").resolve(sb, "a/../ARCHITECTURE.md"), join(sb, "ARCHITECTURE.md"));
  fs.writeFileSync(sb + "/a/../ARCHITECTURE.md", "through-the-symlink\n");
  assert.equal(fs.readFileSync(join(sb, "pharn", "ARCHITECTURE.md"), "utf8"), "through-the-symlink\n");
  assert.ok(!fs.existsSync(join(sb, "ARCHITECTURE.md")), "the lexical target was never created");
  for (const p of ["a/../ARCHITECTURE.md", "a/../CONSTITUTION.md", "a/../../pharn/ARCHITECTURE.md"]) {
    assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: p } }).status, 2, p);
  }
  // and an ordinary write through the same symlink is still allowed
  assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: "a/new.md" } }).status, 0);
});

test("✧ MUTANT: lexical `path.resolve` before realpath re-opens the symlink+`..` bypass", () => {
  const anchorSrc = "  while (pending.length) {";
  const sb = mutantSandbox(["pharn/ARCHITECTURE.md", "pharn/sub/keep.md"], anchorSrc, "  return path.resolve(CWD, raw);\n" + anchorSrc);
  fs.symlinkSync(join(sb, "pharn", "sub"), join(sb, "a"));
  assert.equal(
    runIn(sb, { tool_name: "Write", tool_input: { file_path: "a/../ARCHITECTURE.md" } }).status,
    0,
    "the lexical mutant MUST allow it — that is the bypass being reproduced"
  );
  const good = sandbox(["pharn/ARCHITECTURE.md", "pharn/sub/keep.md"]);
  fs.symlinkSync(join(good, "pharn", "sub"), join(good, "a"));
  assert.equal(runIn(good, { tool_name: "Write", tool_input: { file_path: "a/../ARCHITECTURE.md" } }).status, 2);
});

// --- THE ANCHOR. The protected set is relative to the hook's OWN location, never cwd. Anchoring to cwd
// silently disabled the entire guard whenever the agent ran from a subdirectory, and left PHARN
// unprotected when installed at a subpath of a larger project. Both are pinned here. ---

test("✧ still blocks every trusted path when cwd is a SUBDIRECTORY, not the repo root", () => {
  const sb = sandbox(TRUSTED.concat([".claude/settings.json", "pharn/floor/x.mjs", "docs/keep.md"]));
  for (const cwd of [join(sb, "pharn"), join(sb, "pharn", "floor"), join(sb, "docs")]) {
    for (const f of TRUSTED) {
      const r = runIn(sb, { tool_name: "Write", tool_input: { file_path: join(sb, f) } }, cwd);
      assert.equal(r.status, 2, `${f} must stay denied with cwd=${cwd}`);
    }
  }
});

test("✧ still blocks a RELATIVE trusted path resolved from a subdirectory cwd", () => {
  const sb = sandbox(["pharn/CONSTITUTION.md"]);
  // cwd = <sb>/pharn, so "CONSTITUTION.md" resolves to <sb>/pharn/CONSTITUTION.md.
  const r = runIn(sb, { tool_name: "Write", tool_input: { file_path: "CONSTITUTION.md" } }, join(sb, "pharn"));
  assert.equal(r.status, 2);
});

test("✧ guards its own root when PHARN is installed at a SUBPATH of a larger project", () => {
  const outer = tmp();
  const inner = join(outer, "vendor", "pharn-oss");
  fs.mkdirSync(join(inner, ".claude", "hooks"), { recursive: true });
  fs.copyFileSync(HOOK, join(inner, ".claude", "hooks", "protect-trusted-paths.cjs"));
  fs.mkdirSync(join(inner, "pharn"), { recursive: true });
  fs.writeFileSync(join(inner, "pharn", "CONSTITUTION.md"), "trusted\n");
  fs.writeFileSync(join(outer, "LIMITS.md"), "the USER's own file\n");
  const hook = join(inner, ".claude", "hooks", "protect-trusted-paths.cjs");
  const at = (file_path, cwd) =>
    spawnSync(process.execPath, [hook], { input: JSON.stringify({ tool_name: "Write", tool_input: { file_path } }), encoding: "utf8", cwd })
      .status;
  // cwd is the OUTER project, as it would be for an agent working on the user's repo.
  assert.equal(at(join(inner, "pharn", "CONSTITUTION.md"), outer), 2, "PHARN's own doc must stay guarded");
  assert.equal(at(join(outer, "LIMITS.md"), outer), 0, "the USER's own root LIMITS.md must NOT be guarded");
});

test("✧ blocks an ABSOLUTE path whose ROOT prefix is spelled in a different case", () => {
  // path.relative() compares case-SENSITIVELY, so a differently-cased root relativizes to a `../` escape
  // while naming the very same file on a case-insensitive volume. Folding the prefix is what closes it.
  const sb = sandbox(["pharn/CONSTITUTION.md", "THREAT-MODEL.md"]);
  const i = [...sb].findIndex((c) => /[a-z]/i.test(c));
  assert.ok(i !== -1, "sandbox path must contain a letter to flip");
  const c = sb[i];
  const varied = sb.slice(0, i) + (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()) + sb.slice(i + 1);
  assert.notEqual(varied, sb);
  for (const f of ["pharn/CONSTITUTION.md", "THREAT-MODEL.md"]) {
    assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: join(varied, f) } }).status, 2, f);
  }
});

// --- F3: the guard's own control surface (settings.json + the three hook scripts) ---

for (const p of [
  ".claude/settings.json",
  ".claude/hooks/protect-trusted-paths.cjs",
  ".claude/hooks/enforce-writes-scope.cjs",
  ".claude/hooks/set-writes-scope.cjs",
]) {
  test(`blocks writes to the guards' own control surface: ${p}`, () => {
    const r = run({ tool_name: "Write", tool_input: { file_path: p } });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /BLOCKED by PHARN floor/);
  });
}

test("blocks an Edit to a control file (not just Write)", () => {
  const r = run({ tool_name: "Edit", tool_input: { file_path: ".claude/hooks/enforce-writes-scope.cjs" } });
  assert.equal(r.status, 2);
});

test("blocks a MultiEdit whose edits[] reaches a control file", () => {
  const r = run({
    tool_name: "MultiEdit",
    tool_input: { edits: [{ file_path: "src/ok.js" }, { file_path: ".claude/settings.json" }] },
  });
  assert.equal(r.status, 2);
});

// --- Negative / anti-widening: the entries must NOT reach a user's own files. ---

for (const p of [
  "settings.json",
  ".vscode/settings.json",
  "config/settings.json",
  "src/enforce-writes-scope.cjs",
  "src/hooks/set-writes-scope.cjs",
  "vendor/protect-trusted-paths.cjs",
]) {
  test(`allows a user's own file that only SHARES a basename with a control file: ${p}`, () => {
    assert.equal(run({ tool_name: "Write", tool_input: { file_path: p } }).status, 0);
  });
}

for (const p of [".claude/hooks/protect-trusted-paths.test.cjs", ".claude/hooks/set-writes-scope.test.cjs"]) {
  test(`allows the hooks' own test files: ${p}`, () => {
    assert.equal(run({ tool_name: "Write", tool_input: { file_path: p } }).status, 0);
  });
}

test("allows writes to .claude/commands/* (not part of the guarded control surface)", () => {
  assert.equal(run({ tool_name: "Write", tool_input: { file_path: ".claude/commands/pharn-dev-plan.md" } }).status, 0);
});

// --- F4 (a): must not OVER-BLOCK a user's own file that merely shares a trusted doc's name. Before the
// repo-relative-exact matcher every one of these exited 2. ---

for (const p of [
  "app/user-docs/ARCHITECTURE.md",
  "some/dir/CONSTITUTION.md",
  "docs/THREAT-MODEL.md",
  "docs/ARCHITECTURE.md",
  "vendor/LIMITS.md",
  "app/docs/architecture.md",
  "packages/ui/docs/CONSTITUTION.md",
]) {
  test(`allows a user's OWN doc that only shares a trusted doc's name: ${p}`, () => {
    assert.equal(run({ tool_name: "Write", tool_input: { file_path: p } }).status, 0);
  });
}

// --- F4 (b): must not UNDER-BLOCK a case variant of a real trusted doc. On a case-insensitive volume
// these open the very same bytes, and realpath returns the spelling as given rather than normalizing. ---

for (const p of [
  "pharn/constitution.md",
  "pharn/Architecture.MD",
  "pharn/ARCHITECTURE.MD",
  "threat-model.md",
  "Limits.MD",
  ".github/codeowners",
  ".CLAUDE/settings.json",
]) {
  test(`blocks a case variant of a real trusted path: ${p}`, () => {
    const r = run({ tool_name: "Write", tool_input: { file_path: p } });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /BLOCKED by PHARN floor/);
  });
}

// FULL case folding, not simple case mapping: `ſ` (U+017F) lowercases to ITSELF, yet the filesystem
// opens the real file through that spelling. Verified by reading the file, not by consulting a table.
for (const p of ["pharn/CONſTITUTION.md", "LIMITſ.md", "pharn/ARCHITECTURE.md".replace("S", "ſ")]) {
  test(`blocks a full-case-fold variant that a bare toLowerCase() would miss: ${p}`, () => {
    assert.equal(run({ tool_name: "Write", tool_input: { file_path: p } }).status, 2);
  });
}

// --- F4 (c): CODEOWNERS at all three GitHub-recognized locations. ---

for (const p of ["CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"]) {
  test(`blocks CODEOWNERS at a GitHub-recognized location: ${p}`, () => {
    assert.equal(run({ tool_name: "Write", tool_input: { file_path: p } }).status, 2);
  });
}

test("allows a CODEOWNERS at a location GitHub does not honor", () => {
  assert.equal(run({ tool_name: "Write", tool_input: { file_path: "config/CODEOWNERS" } }).status, 0);
});

// --- F4 (d): lexical re-spellings must not walk past the exact test; outside the guarded root is never
// protected. ---

for (const p of ["./pharn/ARCHITECTURE.md", "pharn/../pharn/ARCHITECTURE.md", "pharn/features/../../LIMITS.md"]) {
  test(`blocks a lexical re-spelling of a protected path: ${p}`, () => {
    assert.equal(run({ tool_name: "Write", tool_input: { file_path: p } }).status, 2);
  });
}

test("blocks an ABSOLUTE path naming a trusted doc inside the guarded root", () => {
  assert.equal(run({ tool_name: "Write", tool_input: { file_path: join(process.cwd(), "pharn", "ARCHITECTURE.md") } }).status, 2);
});

test("allows a path outside the guarded root (not a file this hook guards)", () => {
  assert.equal(run({ tool_name: "Write", tool_input: { file_path: "/etc/passwd" } }).status, 0);
});

test("allows a same-named trusted doc in a DIFFERENT repo", () => {
  const other = sandbox([]); // has its own hook, but we drive THIS repo's hook against its files
  fs.mkdirSync(join(other, "pharn"), { recursive: true });
  fs.writeFileSync(join(other, "pharn", "CONSTITUTION.md"), "someone else's\n");
  assert.equal(run({ tool_name: "Write", tool_input: { file_path: join(other, "pharn", "CONSTITUTION.md") } }).status, 0);
});

// --- F4 (e): suffixed names are a different key and must not be over-blocked. ---

for (const p of [
  ".claude/settings.json.bak",
  ".claude/hooks/set-writes-scope.cjs.example",
  "backup/.claude/settings.json.bak",
  "pharn/features/CONSTITUTION.md.bak",
  ".claude/hooks/protect-trusted-paths.cjs.bak",
  "docs/ARCHITECTURE.mdx",
  "backup/LIMITS.md.bak",
  "pharn/ARCHITECTURE.md.bak",
]) {
  test(`allows a suffixed path that only shares a protected fragment prefix: ${p}`, () => {
    assert.equal(run({ tool_name: "Write", tool_input: { file_path: p } }).status, 0);
  });
}

// --- Regression: the pre-existing protected set still blocks ---

for (const p of TRUSTED) {
  test(`still blocks the pre-existing trusted path: ${p}`, () => {
    assert.equal(run({ tool_name: "Write", tool_input: { file_path: p } }).status, 2);
  });
}

test("malformed stdin JSON is not treated as a write (allow, no crash)", () => {
  const r = spawnSync(process.execPath, [HOOK], { input: "{not json", encoding: "utf8" });
  assert.equal(r.status, 0);
});

test("a non-write tool is ignored even when its input names a control file", () => {
  assert.equal(run({ tool_name: "Read", tool_input: { file_path: ".claude/settings.json" } }).status, 0);
});

test("a toolName-less payload carrying a path is still treated as a write", () => {
  assert.equal(run({ tool_input: { path: "pharn/ARCHITECTURE.md" } }).status, 2);
});

test("a non-string file_path does not crash the hook", () => {
  for (const file_path of [42, null, ["pharn/ARCHITECTURE.md"], { toString: () => "x" }]) {
    const r = run({ tool_name: "Write", tool_input: { file_path } });
    assert.ok(r.status === 0 || r.status === 2, `unexpected exit ${r.status} for ${JSON.stringify(file_path)}`);
  }
});

// ✧ Derived, not restated: every `.claude/` entry the hook declares must be denied (L4).
test("✧ every `.claude/` entry declared in DEFAULT_PROTECTED is actually denied (derived from source)", () => {
  const claudeEntries = declaredProtected().filter((p) => p.startsWith(".claude/"));
  assert.ok(claudeEntries.length >= 4, "the guards' own control surface must be in the protected set");
  for (const p of claudeEntries) {
    assert.equal(run({ tool_name: "Write", tool_input: { file_path: p } }).status, 2, `${p} must be denied`);
  }
});

// ✧ Derived: the same coverage over the WHOLE declared set, so an entry added later is exercised the day
// it lands rather than the day someone remembers to add a literal here (L4).
test("✧ every entry declared in DEFAULT_PROTECTED is denied at its declared path (derived from source)", () => {
  const entries = declaredProtected();
  assert.ok(entries.length >= 11, "the declared set must cover the four docs, CODEOWNERS x3, and the control surface");
  for (const p of entries) {
    assert.equal(run({ tool_name: "Write", tool_input: { file_path: p } }).status, 2, `${p} must be denied`);
  }
});

// ✧ Derived: THE F4 INVARIANT. For every declared entry, a user's own file that merely shares its
// basename, at a path the hook does not declare, must be ALLOWED.
test("✧ no declared entry over-blocks the same basename at depth (the F4 invariant, derived from source)", () => {
  const entries = declaredProtected();
  const declared = new Set(entries.map((e) => e.toLowerCase()));
  for (const p of entries) {
    const nested = `vendor/third-party/${p.split("/").pop()}`;
    if (declared.has(nested.toLowerCase())) continue;
    assert.equal(
      run({ tool_name: "Write", tool_input: { file_path: nested } }).status,
      0,
      `${nested} must be ALLOWED — a user's own file that merely shares a basename with the declared ${p}`
    );
  }
});

// --- ✧ MEASURED REJECTING MUTANTS (L4 — an authored assertion passes by construction). Each mutation is
// applied to a sandbox copy and confirmed to flip the behavior the corresponding test pins. ---

test("✧ MUTANT: re-introducing the basename branch flips the F4 over-block case back to a deny", () => {
  const anchor = "  if (EXTRA_KEYS.some((e) => matchesExtra(key, e))) return true;";
  const sb = mutantSandbox(
    [],
    anchor,
    "  const mutantBase = key.split('/').pop();\n" +
      "  for (const k of PROTECTED_KEYS) if (k.split('/').pop() === mutantBase) return true;\n" +
      anchor
  );
  const payload = { tool_name: "Write", tool_input: { file_path: "app/user-docs/ARCHITECTURE.md" } };
  assert.equal(runIn(sb, payload).status, 2, "the mutant MUST block — otherwise the row-3 assertion proves nothing");
  assert.equal(run(payload).status, 0, "the real hook must allow it");
});

test("✧ MUTANT: dropping the case fold lets a case variant of a trusted doc through", () => {
  const sb = mutantSandbox(["pharn/CONSTITUTION.md"], "    .toUpperCase()\n    .toLowerCase();", "    ;");
  const payload = { tool_name: "Write", tool_input: { file_path: "pharn/constitution.md" } };
  assert.equal(runIn(sb, payload).status, 0, "the un-folded mutant MUST allow it — the F4 under-block, reproduced");
  assert.equal(run(payload).status, 2, "the real hook must block it");
});

test("✧ MUTANT: a bare toLowerCase() fold lets the U+017F spelling through", () => {
  const sb = mutantSandbox(["pharn/CONSTITUTION.md"], "    .toUpperCase()\n    .toLowerCase();", "    .toLowerCase();");
  const payload = { tool_name: "Write", tool_input: { file_path: "pharn/CONſTITUTION.md" } };
  assert.equal(runIn(sb, payload).status, 0, "simple case mapping MUST miss it — that is why the fold upper-cases first");
  assert.equal(run(payload).status, 2, "the real hook must block it");
});

// --- PHARN_PROTECTED: an operator extension. A bare name keeps its ORIGINAL basename semantics, so an
// existing setting does not silently stop protecting; a slashed entry is an exact repo-relative path. ---

test("PHARN_PROTECTED still extends the list on top of the default", () => {
  const r = spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: "custom/extra.md" } }),
    encoding: "utf8",
    env: { ...process.env, PHARN_PROTECTED: "extra.md" },
  });
  assert.equal(r.status, 2);
});

test("PHARN_PROTECTED: a BARE name keeps basename semantics (backward compatible, fails closed)", () => {
  const at = (file_path) =>
    spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify({ tool_name: "Write", tool_input: { file_path } }),
      encoding: "utf8",
      env: { ...process.env, PHARN_PROTECTED: "extra.md" },
    }).status;
  assert.equal(at("extra.md"), 2);
  assert.equal(at("docs/deep/extra.md"), 2, "a bare entry still matches at any depth, as it always did");
  assert.equal(at("EXTRA.MD"), 2, "and it folds case like every other entry");
  assert.equal(at("docs/other.md"), 0);
});

// ════════════════════════════════════════════════════════════════════════════════════════════════════
// HARDENING PASS. Every test below exists because an adversarial sweep RAN this hook and found a write
// that reached a trusted file, or an input that made the hook exit 1 — which Claude Code treats as a
// NON-BLOCKING error, so the write proceeds. In a write-guard, every crash is a bypass.
// ════════════════════════════════════════════════════════════════════════════════════════════════════

// --- FAIL-CLOSED: three inputs used to exit 1 (fail-OPEN) ---

test("✧ a deleted working directory does not crash the guard (was exit 1 = fail-open)", (t) => {
  if (process.platform === "win32") return t.skip("POSIX cwd-unlink semantics");
  const sb = sandbox(["pharn/CONSTITUTION.md"]);
  const dead = tmp();
  const r = spawnSync(
    "/bin/sh",
    ["-c", `cd "${dead}" && rmdir "${dead}" && exec "${process.execPath}" "${join(sb, ".claude", "hooks", "protect-trusted-paths.cjs")}"`],
    { input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: join(sb, "pharn", "CONSTITUTION.md") } }), encoding: "utf8" }
  );
  assert.equal(r.status, 2, "must still DENY with an unusable cwd, not exit 1 and let the write through");
});

for (const payload of ["null", "42", '"str"', "[1,2]", "true"]) {
  test(`✧ a scalar/null stdin payload is handled, not crashed on: ${payload}`, () => {
    // JSON.parse("null") returns null WITHOUT throwing, so the try/catch never fired and the next
    // property access exited 1.
    const r = spawnSync(process.execPath, [HOOK], { input: payload, encoding: "utf8" });
    assert.equal(r.status, 0);
  });
}

test("✧ a pathological deep path neither crashes nor hangs, and does not mask a trusted path beside it", () => {
  const sb = sandbox(["pharn/CONSTITUTION.md"]);
  // 20k segments is ~5x the resolution cap — enough to prove the bound without a 400 KB payload
  // that dominates the run under coverage instrumentation.
  const deep = "a/".repeat(20000) + "x.md";
  const started = process.hrtime.bigint();
  const r = runIn(sb, { tool_name: "Write", tool_input: { file_path: deep } });
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  assert.equal(r.status, 0, "an absurd path is not protected — but it must not exit 1 either");
  assert.ok(ms < 20000, `resolution must stay bounded; took ${Math.round(ms)}ms`);
  // The per-path evaluation must not abort the scan: a trusted path later in the SAME payload still denies.
  const r2 = runIn(sb, {
    tool_name: "MultiEdit",
    tool_input: { edits: [{ file_path: deep }, { file_path: join(sb, "pharn", "CONSTITUTION.md") }] },
  });
  assert.equal(r2.status, 2);
});

// --- ANCHORING: the hook may be installed as a symlink ---

test("✧ a hook installed as a SYMLINK still guards the project it is linked INTO", () => {
  // Node resolves __dirname THROUGH symlinks, so a dotfiles/stow-style install anchored to the dotfiles
  // checkout and left the real project unguarded. The as-invoked path (argv[1]) is a root too.
  const dotfiles = tmp();
  fs.mkdirSync(join(dotfiles, "hooks"), { recursive: true });
  fs.copyFileSync(HOOK, join(dotfiles, "hooks", "protect-trusted-paths.cjs"));
  const sb = tmp();
  fs.mkdirSync(join(sb, ".claude", "hooks"), { recursive: true });
  fs.symlinkSync(join(dotfiles, "hooks", "protect-trusted-paths.cjs"), join(sb, ".claude", "hooks", "protect-trusted-paths.cjs"));
  fs.mkdirSync(join(sb, "pharn"), { recursive: true });
  fs.writeFileSync(join(sb, "pharn", "CONSTITUTION.md"), "trusted\n");
  const r = spawnSync(process.execPath, [".claude/hooks/protect-trusted-paths.cjs"], {
    input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: "pharn/CONSTITUTION.md" } }),
    encoding: "utf8",
    cwd: sb,
  });
  assert.equal(r.status, 2);
});

// --- SYMLINKS: a broken link still NAMES a target ---

test("✧ a dangling symlink cannot be used to CREATE a protected file", () => {
  const sb = sandbox(["pharn/CONSTITUTION.md"]);
  fs.mkdirSync(join(sb, "docs"), { recursive: true });
  fs.symlinkSync(join(sb, "docs", "CODEOWNERS"), join(sb, "notes.md")); // absolute, target absent
  fs.symlinkSync("docs/CODEOWNERS", join(sb, "rel.md")); // relative, target absent
  fs.symlinkSync(join(sb, "nowhere.md"), join(sb, "benign.md"));
  assert.ok(!fs.existsSync(join(sb, "docs", "CODEOWNERS")), "precondition: the protected file does not exist yet");
  assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: "notes.md" } }).status, 2);
  assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: "rel.md" } }).status, 2);
  assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: "benign.md" } }).status, 0);
});

test("✧ a self-referential symlink terminates instead of spinning", () => {
  const sb = sandbox([]);
  fs.symlinkSync(join(sb, "loop.md"), join(sb, "loop.md"));
  const started = process.hrtime.bigint();
  const r = runIn(sb, { tool_name: "Write", tool_input: { file_path: "loop.md" } });
  const ms = Number(process.hrtime.bigint() - started) / 1e6;
  assert.ok(r.status === 0 || r.status === 2, `must terminate with a decision, got ${r.status}`);
  assert.ok(ms < 15000, `must not spin; took ${Math.round(ms)}ms`);
});

// --- HARD LINKS: realpath cannot see through them; only the inode can ---

test("✧ a HARD LINK to a trusted doc is denied (realpath resolves symlinks only)", () => {
  const sb = sandbox(["pharn/CONSTITUTION.md", "docs/keep.md"]);
  fs.linkSync(join(sb, "pharn", "CONSTITUTION.md"), join(sb, "alias.md"));
  assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: "alias.md" } }).status, 2);
  // ...and an ordinary file is still allowed while the inode set is non-empty.
  assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: "docs/keep.md" } }).status, 0);
});

// --- CONTROL SURFACE: settings.local.json wires the same hooks ---

test("✧ .claude/settings.local.json is guarded — it configures the very hooks this file implements", () => {
  assert.equal(run({ tool_name: "Write", tool_input: { file_path: ".claude/settings.local.json" } }).status, 2);
  assert.equal(run({ tool_name: "Write", tool_input: { file_path: ".claude/settings.local.json.bak" } }).status, 0);
  assert.equal(run({ tool_name: "Write", tool_input: { file_path: "src/settings.local.json" } }).status, 0);
});

// --- CONTROL SURFACE: the writes-scope guard's INPUT, not only its code ---
//
// WHY THESE EXIST. enforce-writes-scope.cjs guards its own input with ONE byte-exact compare
// (rel === SCOPE_FILE) while its ALWAYS glob leaves the rest of .pharn/ writable. On a case-insensitive
// volume .pharn/WRITES-SCOPE.JSON is the SAME FILE, so that compare missed it and the Write tool could
// rewrite the active scope, then write anywhere fix #2 does not backstop. Reproduced live before the
// fix: enforce → 0 on the upper-case spelling, 2 on the lower-case one.
//
// The remedy is an entry in THIS hook's DEFAULT_PROTECTED rather than a widened compare over there,
// because this hook already full-case-folds, strips Windows trailing dot/space, and resolves symlinks
// segment-wise — so one entry closes the case-variant AND the dangling-alias vector at once. These
// assertions are deliberately literal (not derived): a derived test cannot fail before the entry
// exists, and an assertion that cannot fail is worthless (L4). Measured rejecting the UNPATCHED hook
// before being trusted.

test("✧ the writes-scope guard's own input is protected at its declared spelling", () => {
  assert.equal(run({ tool_name: "Write", tool_input: { file_path: ".pharn/writes-scope.json" } }).status, 2);
});

test("✧ REGRESSION: a case-variant of the scope file is denied (same inode on a case-insensitive volume)", () => {
  for (const p of [".pharn/WRITES-SCOPE.JSON", ".pharn/Writes-Scope.Json", ".pharn/writes-scope.JSON"]) {
    assert.equal(run({ tool_name: "Write", tool_input: { file_path: p } }).status, 2, `${p} must be denied`);
  }
});

test("✧ protecting the scope file does NOT over-block the rest of .pharn/", () => {
  // .pharn/ is disposable runtime scratch that stages legitimately write, and it also holds the
  // load-bearing product lessons-index cache. Over-blocking here would break the pipeline, so the
  // entry is one path and not a ".pharn/**" glob.
  for (const p of [".pharn/foo.json", ".pharn/lessons-index.md", ".pharn/writes-scope.json.bak", "src/.pharn/writes-scope.json"]) {
    assert.equal(run({ tool_name: "Write", tool_input: { file_path: p } }).status, 0, `${p} must be ALLOWED`);
  }
});

test("✧ a dangling symlink cannot be used to CREATE the scope file under another name", () => {
  const sb = sandbox();
  fs.mkdirSync(join(sb, ".pharn"), { recursive: true });
  fs.symlinkSync("writes-scope.json", join(sb, ".pharn", "alias.json")); // target absent = dangling
  assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: ".pharn/alias.json" } }).status, 2);
});

// ✧ Derived cross-copy pin, the check-provenance / CONTROL_SURFACE precedent (see the ✧ agreement guard
// in set-writes-scope.test.cjs). The literal ".pharn/writes-scope.json" now lives in TWO hooks: as
// SCOPE_FILE in enforce-writes-scope.cjs and as a DEFAULT_PROTECTED entry here. Two copies drift; this
// converts "drifts silently" into "drifts loudly". It CANNOT be folded into the existing agreement test,
// which deliberately compares only the `.claude/`-prefixed entries.
//
// NOT guaranteed (P0): that the two hooks BEHAVE alike on that path — this one case-folds and resolves
// symlinks, the other compares bytes. It pins the declarations, not the logic.
test("✧ the two guards name the SAME scope file: enforce-writes-scope SCOPE_FILE == a DEFAULT_PROTECTED entry", () => {
  const src = fs.readFileSync(join(__dirname, "enforce-writes-scope.cjs"), "utf8").replace(/^[ \t]*\/\/.*$/gm, "");
  const m = src.match(/^const SCOPE_FILE = "([^"]*)";/m);
  assert.ok(m, 'enforce-writes-scope.cjs must declare a top-level `const SCOPE_FILE = "…";`');
  assert.ok(
    declaredProtected().includes(m[1]),
    `enforce-writes-scope.cjs guards ${JSON.stringify(m[1])} but protect-trusted-paths.cjs does not declare it — ` +
      "the scope guard's input would be reachable again through a case variant; change BOTH copies"
  );
});

// --- WINDOWS TRAILING DOT/SPACE: the OS drops them, so they name the real file there ---

for (const p of ["LIMITS.md.", "LIMITS.md ", "pharn/CONSTITUTION.md.", "pharn/CONSTITUTION.md  "]) {
  test(`✧ blocks a trailing dot/space spelling of a trusted path: ${JSON.stringify(p)}`, () => {
    assert.equal(run({ tool_name: "Write", tool_input: { file_path: p } }).status, 2);
  });
}

// --- RELATIVE PATHS mean cwd, not the guarded root ---

test("✧ a relative payload path is resolved against cwd, so a user's own subdirectory file is allowed", () => {
  const sb = sandbox(["pharn/CONSTITUTION.md", "pharn/features/pharn/CONSTITUTION.md"]);
  // cwd = <root>/features, so "pharn/CONSTITUTION.md" means pharn/features/pharn/CONSTITUTION.md — the user's.
  assert.equal(
    runIn(sb, { tool_name: "Write", tool_input: { file_path: "pharn/CONSTITUTION.md" } }, join(sb, "pharn", "features")).status,
    0
  );
  // ...while the same relative path from the root still denies.
  assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: "pharn/CONSTITUTION.md" } }).status, 2);
});

// --- PHARN_PROTECTED: full backward compatibility with basenames AND path fragments ---

test("✧ PHARN_PROTECTED keeps basename semantics for a bare name", () => {
  const at = (file_path, val) =>
    spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify({ tool_name: "Write", tool_input: { file_path } }),
      encoding: "utf8",
      env: { ...process.env, PHARN_PROTECTED: val },
    }).status;
  assert.equal(at("extra.md", "extra.md"), 2);
  assert.equal(at("docs/deep/extra.md", "extra.md"), 2, "a bare entry matches at any depth, as it always did");
  assert.equal(at("EXTRA.MD", "extra.md"), 2, "and folds case like every other entry");
  assert.equal(at("other.md", "extra.md"), 0);
});

test("✧ PHARN_PROTECTED keeps PATH-FRAGMENT semantics for a slashed entry", () => {
  const at = (file_path, val) =>
    spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify({ tool_name: "Write", tool_input: { file_path } }),
      encoding: "utf8",
      env: { ...process.env, PHARN_PROTECTED: val },
    }).status;
  assert.equal(at("custom/extra.md", "custom/extra.md"), 2);
  assert.equal(at("deep/custom/extra.md", "custom/extra.md"), 2, "a fragment matches at depth — the ORIGINAL contract");
  assert.equal(at("custom/extra.md.bak", "custom/extra.md"), 0, "but only at a path boundary");
});

// --- ✧ MEASURED REJECTING MUTANTS for each hardening (L4) ---

test("✧ MUTANT: dropping the argv[1] root leaves a symlinked hook install unguarded", () => {
  const dotfiles = tmp();
  fs.mkdirSync(join(dotfiles, "hooks"), { recursive: true });
  const src = fs.readFileSync(HOOK, "utf8");
  const anchor = "dirs.push(path.dirname(path.resolve(CWD, process.argv[1])));";
  assert.ok(src.includes(anchor), "mutant anchor: the as-invoked root");
  fs.writeFileSync(join(dotfiles, "hooks", "protect-trusted-paths.cjs"), src.replace(anchor, "void 0;"));
  const sb = tmp();
  fs.mkdirSync(join(sb, ".claude", "hooks"), { recursive: true });
  fs.symlinkSync(join(dotfiles, "hooks", "protect-trusted-paths.cjs"), join(sb, ".claude", "hooks", "protect-trusted-paths.cjs"));
  fs.mkdirSync(join(sb, "pharn"), { recursive: true });
  fs.writeFileSync(join(sb, "pharn", "CONSTITUTION.md"), "trusted\n");
  const r = spawnSync(process.execPath, [".claude/hooks/protect-trusted-paths.cjs"], {
    input: JSON.stringify({ tool_name: "Write", tool_input: { file_path: "pharn/CONSTITUTION.md" } }),
    encoding: "utf8",
    cwd: sb,
  });
  assert.equal(r.status, 0, "the mutant MUST allow it — that is the dotfiles-install bypass reproduced");
});

test("✧ MUTANT: anchoring the roots to cwd disables the guard from a subdirectory", () => {
  const sb = mutantSandbox(["pharn/CONSTITUTION.md"], "  return out.length ? out : [CWD];", "  return [CWD];");
  const payload = { tool_name: "Write", tool_input: { file_path: join(sb, "pharn", "CONSTITUTION.md") } };
  assert.equal(runIn(sb, payload, join(sb, "pharn")).status, 0, "the cwd-anchored mutant MUST allow it");
  const good = sandbox(["pharn/CONSTITUTION.md"]);
  assert.equal(
    runIn(good, { tool_name: "Write", tool_input: { file_path: join(good, "pharn", "CONSTITUTION.md") } }, join(good, "pharn")).status,
    2
  );
});

test("✧ MUTANT: not resolving a dangling symlink re-opens protected-file CREATION", () => {
  const sb = mutantSandbox(
    ["pharn/CONSTITUTION.md", "docs/keep.md"],
    "      if (hops < 40 && fs.lstatSync(next).isSymbolicLink()) {",
    "      if (false) {"
  );
  fs.symlinkSync(join(sb, "docs", "CODEOWNERS"), join(sb, "notes.md"));
  assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: "notes.md" } }).status, 0, "mutant MUST allow it");
  const good = sandbox(["pharn/CONSTITUTION.md", "docs/keep.md"]);
  fs.symlinkSync(join(good, "docs", "CODEOWNERS"), join(good, "notes.md"));
  assert.equal(runIn(good, { tool_name: "Write", tool_input: { file_path: "notes.md" } }).status, 2);
});

test("✧ MUTANT: dropping the inode test re-opens the hard-link alias", () => {
  const sb = mutantSandbox(["pharn/CONSTITUTION.md"], '        if (st.nlink > 1) s.add(st.dev + ":" + st.ino);', "        void st;");
  fs.linkSync(join(sb, "pharn", "CONSTITUTION.md"), join(sb, "alias.md"));
  assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: "alias.md" } }).status, 0, "mutant MUST allow it");
  const good = sandbox(["pharn/CONSTITUTION.md"]);
  fs.linkSync(join(good, "pharn", "CONSTITUTION.md"), join(good, "alias.md"));
  assert.equal(runIn(good, { tool_name: "Write", tool_input: { file_path: "alias.md" } }).status, 2);
});

test("✧ MUTANT: dropping the non-object payload guard makes a `null` payload exit 1 (fail-open)", () => {
  const sb = mutantSandbox([], 'if (!payload || typeof payload !== "object" || Array.isArray(payload)) payload = {};', "");
  const r = spawnSync(process.execPath, [join(sb, ".claude", "hooks", "protect-trusted-paths.cjs")], { input: "null", encoding: "utf8" });
  assert.equal(r.status, 1, "the mutant MUST exit 1 — a non-blocking error, i.e. the write proceeds");
  assert.equal(spawnSync(process.execPath, [HOOK], { input: "null", encoding: "utf8" }).status, 0);
});

test("✧ MUTANT: dropping the trailing dot/space strip lets the Windows spelling through", () => {
  const sb = mutantSandbox(
    ["pharn/CONSTITUTION.md"],
    '    .map((s) => (s === "." || s === ".." ? s : s.replace(/[. ]+$/, "")))',
    "    .map((s) => s)"
  );
  assert.equal(runIn(sb, { tool_name: "Write", tool_input: { file_path: "pharn/CONSTITUTION.md." } }).status, 0, "mutant MUST allow it");
  assert.equal(run({ tool_name: "Write", tool_input: { file_path: "pharn/CONSTITUTION.md." } }).status, 2);
});
