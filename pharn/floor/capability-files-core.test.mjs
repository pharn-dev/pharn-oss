// pharn/floor/capability-files-core.test.mjs — the shared markdown list the capability readers scan (issue #407).
//
// Uses git (a scratch `git init` under os.tmpdir(), files staged with `git add`, never committed) and no network.
// The ★ tests are the regression: a git-ignored copy of pharn/ is NOT on the capability surface, through every
// consumer, and each assertion has a fixture that would fail without the fix (L60).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, unlinkSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { listMarkdownFiles, walkMarkdown } from "./capability-files-core.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// THE CONSUMERS (L29/L31): every floor reader that discovers capabilities by walking the target. A new reader joins
// this list in the same diff, and the closure test below fails while one keeps a walk of its own.
const CONSUMERS = ["validate.mjs", "count-grillers.mjs", "count-lenses.mjs", "count-verifiers.mjs"];

const GRILLER = "---\nname: g\nrole: griller\nkind: pharn-owned\n---\n\n# g\n";
const LENS = "---\nname: l\nrole: lens\nkind: pharn-owned\n---\n\n# l\n";
const VERIFIER = "---\nname: v\nrole: verifier\nkind: pharn-owned\n---\n\n# v\n";

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
}

/** A scratch tree of { "rel": "contents" }; `opts.git` runs `git init` and stages `opts.add` (default: everything). */
function withTree(files, opts, fn) {
  const root = mkdtempSync(join(tmpdir(), "pharn-capfiles-"));
  try {
    for (const [rel, body] of Object.entries(files)) {
      const p = join(root, rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, body);
    }
    if (opts.git) {
      git(root, ["init", "-q"]);
      git(root, ["add", "-A", "--", ...(opts.add ?? ["."])]);
    }
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const rels = (root, files) => files.map((f) => relative(root, f).replace(/\\/g, "/")).sort();

// The issue's shape: the project's own pharn/ tree, plus a copy of it under a git-ignored build cache.
const WITH_IGNORED_COPY = {
  ".gitignore": "build-cache/\n",
  "pharn/pharn-pipeline/grillers/g/g.md": GRILLER,
  "pharn/pharn-review/l/l.md": LENS,
  "pharn/pharn-review/v/v.md": VERIFIER,
  "build-cache/pharn/pharn-pipeline/grillers/g/g.md": GRILLER,
  "build-cache/pharn/pharn-review/l/l.md": LENS,
  "build-cache/pharn/pharn-review/v/v.md": VERIFIER,
  "docs/notes.md": "# notes\n",
};

test("★ inside a git work tree, a git-ignored copy is not listed; tracked and untracked-not-ignored files are", () => {
  withTree({ ...WITH_IGNORED_COPY, "drafts/new.md": "# untracked\n" }, { git: true, add: ["pharn", "docs", ".gitignore"] }, (root) => {
    const r = listMarkdownFiles(root);
    assert.equal(r.source, "git");
    assert.deepEqual(rels(root, r.files), [
      "docs/notes.md",
      "drafts/new.md",
      "pharn/pharn-pipeline/grillers/g/g.md",
      "pharn/pharn-review/l/l.md",
      "pharn/pharn-review/v/v.md",
    ]);
    // The falsifier (L60): the old walk lists the ignored copies.
    assert.ok(rels(root, walkMarkdown(root)).includes("build-cache/pharn/pharn-pipeline/grillers/g/g.md"));
  });
});

test("★ the target's own pharn/ stays listed when the project git-ignores it", () => {
  withTree({ ".gitignore": "pharn/\n", "pharn/pharn-pipeline/grillers/g/g.md": GRILLER, "README.md": "# r\n" }, { git: true }, (root) => {
    const r = listMarkdownFiles(root);
    assert.equal(r.source, "git");
    assert.deepEqual(rels(root, r.files), ["README.md", "pharn/pharn-pipeline/grillers/g/g.md"]);
  });
});

test("outside a git work tree, the walk runs unchanged", () => {
  withTree(WITH_IGNORED_COPY, { git: false }, (root) => {
    const r = listMarkdownFiles(root);
    assert.equal(r.source, "walk");
    assert.deepEqual(rels(root, r.files), rels(root, walkMarkdown(root)));
    assert.equal(r.files.length, 7);
  });
});

test("a target git lists nothing for (wholly ignored by its repository) falls back to the walk", () => {
  withTree({ ".gitignore": "scratch/\n", "scratch/pharn/pharn-review/l/l.md": LENS }, { git: true, add: [".gitignore"] }, (root) => {
    const r = listMarkdownFiles(join(root, "scratch"));
    assert.equal(r.source, "walk");
    assert.deepEqual(rels(join(root, "scratch"), r.files), ["pharn/pharn-review/l/l.md"]);
  });
});

test("a tracked file deleted from the work tree is not listed (nothing downstream reads a missing path)", () => {
  withTree({ "a.md": "# a\n", "b.md": "# b\n" }, { git: true }, (root) => {
    unlinkSync(join(root, "b.md"));
    assert.ok(git(root, ["ls-files"]).includes("b.md"), "fixture: b.md is still in the index");
    assert.deepEqual(rels(root, listMarkdownFiles(root).files), ["a.md"]);
  });
});

test("only .md paths, sorted, as join(target, rel)", () => {
  withTree({ "z.md": "", "a/b.md": "", "c.json": "{}", "d.md.txt": "" }, { git: true }, (root) => {
    const { files } = listMarkdownFiles(root);
    assert.deepEqual(files, [join(root, "a/b.md"), join(root, "z.md")]);
  });
});

// ── symlinks (7.3.0, family-grammar-crlf — L59: the path kinds are an enumeration, not the author's picture) ─────────
// Before 7.3.0 walkMarkdown followed every link with statSync, so a link to a directory below pharn/ imported an
// outside directory's capabilities, in BOTH rules (the git rule adds a walk of pharn/), while this module's header said
// such a link was not descended.
const PATH_KINDS = ["regular .md", "link to an .md file", "link to a directory", "dangling link", "looping link"];

/** Builds each PATH_KINDS member under `<root>/<base>/`, pointing outside at `outside` where a target is needed. */
function plantKinds(root, base, outside) {
  const d = join(root, base);
  mkdirSync(d, { recursive: true });
  writeFileSync(join(d, "regular.md"), LENS);
  symlinkSync(join(outside, "target.md"), join(d, "file-link.md"));
  symlinkSync(join(outside, "dir"), join(d, "dir-link"));
  symlinkSync(join(outside, "nowhere"), join(d, "dangling-link.md"));
  symlinkSync(join(d, "loop-b"), join(d, "loop-a"));
  symlinkSync(join(d, "loop-a"), join(d, "loop-b"));
}

function withOutside(fn) {
  const outside = mkdtempSync(join(tmpdir(), "pharn-capfiles-outside-"));
  try {
    writeFileSync(join(outside, "target.md"), LENS);
    mkdirSync(join(outside, "dir"));
    writeFileSync(join(outside, "dir", "inside.md"), LENS);
    return fn(outside);
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
}

test("★ walkMarkdown over every PATH_KIND: a file link is listed, a directory link is recorded not descended, broken links skipped", () => {
  assert.equal(PATH_KINDS.length, 5);
  withOutside((outside) =>
    withTree({}, { git: false }, (root) => {
      plantKinds(root, "pharn/pharn-review/k", outside);
      const links = [];
      const files = walkMarkdown(root, [], links);
      assert.deepEqual(rels(root, files), ["pharn/pharn-review/k/file-link.md", "pharn/pharn-review/k/regular.md"]);
      assert.deepEqual(rels(root, links), ["pharn/pharn-review/k/dir-link"]);
      assert.ok(!files.some((f) => f.endsWith("inside.md")), "nothing behind the directory link is listed");
    })
  );
});

test("★ listMarkdownFiles reports a directory link strictly below pharn/ as linkedDirs, in the walk rule and the git rule", () => {
  withOutside((outside) => {
    for (const useGit of [false, true]) {
      withTree({ "README.md": "# r\n" }, { git: useGit }, (root) => {
        plantKinds(root, "pharn/pharn-review/k", outside);
        mkdirSync(join(root, "docs"));
        symlinkSync(join(outside, "dir"), join(root, "docs", "elsewhere"));
        const r = listMarkdownFiles(root);
        assert.equal(r.source, useGit ? "git" : "walk");
        assert.deepEqual(rels(root, r.linkedDirs), ["pharn/pharn-review/k/dir-link"], "a link outside pharn/ is skipped silently");
        assert.ok(!r.files.some((f) => f.endsWith("inside.md")), `${r.source}: nothing behind a link is listed`);
      });
    }
  });
});

test("★ a `pharn` root that is itself a link is FOLLOWED in both rules, and is not reported (GATE 1)", () => {
  withOutside((outside) => {
    mkdirSync(join(outside, "dir", "pharn-review", "l"), { recursive: true });
    writeFileSync(join(outside, "dir", "pharn-review", "l", "l.md"), LENS);
    for (const useGit of [false, true]) {
      withTree({ "README.md": "# r\n" }, { git: useGit }, (root) => {
        symlinkSync(join(outside, "dir"), join(root, "pharn"));
        const r = listMarkdownFiles(root);
        assert.deepEqual(r.linkedDirs, []);
        assert.ok(rels(root, r.files).includes("pharn/pharn-review/l/l.md"), `${r.source}: ${rels(root, r.files)}`);
      });
    }
  });
});

test("★ the three counters REFUSE a directory link below pharn/ (exit 1, nothing on stdout, the link named)", () => {
  withOutside((outside) =>
    withTree({ "pharn/pharn-review/l/l.md": LENS }, { git: false }, (root) => {
      for (const script of ["count-grillers.mjs", "count-lenses.mjs", "count-verifiers.mjs"]) {
        assert.equal(spawnSync(process.execPath, [join(here, script), root], { encoding: "utf8" }).status, 0, `${script}: control`);
      }
      symlinkSync(join(outside, "dir"), join(root, "pharn", "pharn-review", "linked"));
      for (const script of ["count-grillers.mjs", "count-lenses.mjs", "count-verifiers.mjs"]) {
        const r = spawnSync(process.execPath, [join(here, script), root], { encoding: "utf8" });
        assert.equal(r.status, 1, `${script}: ${r.stdout}`);
        assert.equal(r.stdout, "");
        assert.match(r.stderr, /symlinked directory below pharn\/ not descended: "pharn\/pharn-review\/linked"/);
      }
    })
  );
});

// ── through the consumers ───────────────────────────────────────────────────────────────────────────────────────────

function runJson(script, root) {
  const r = spawnSync(process.execPath, [join(here, script), root], { encoding: "utf8" });
  assert.equal(r.status, 0, `${script} exited ${r.status}: ${r.stderr}`);
  return JSON.parse(r.stdout);
}

test("★ the three counters register the project's capabilities once, not once per ignored copy", () => {
  withTree(WITH_IGNORED_COPY, { git: true, add: ["pharn", "docs", ".gitignore"] }, (root) => {
    assert.deepEqual(runJson("count-grillers.mjs", root), { registered: 1, grillers: ["pharn/pharn-pipeline/grillers/g/g.md"] });
    assert.deepEqual(runJson("count-lenses.mjs", root), { registered: 1, lenses: ["pharn/pharn-review/l/l.md"] });
    assert.deepEqual(runJson("count-verifiers.mjs", root), { registered: 1, verifiers: ["pharn/pharn-review/v/v.md"] });
  });
  // The falsifier (L60): with no git, the same tree counts the copies — the walk's old behaviour, unchanged.
  withTree(WITH_IGNORED_COPY, { git: false }, (root) => {
    assert.equal(runJson("count-grillers.mjs", root).registered, 2);
  });
});

test("★ validate.mjs checks the project's capabilities, not the ignored copies", () => {
  const checked = (root) => {
    const r = spawnSync(process.execPath, [join(here, "validate.mjs"), root], { encoding: "utf8" });
    const m = r.stdout.match(/(\d+) capabilities checked/);
    assert.ok(m, `no capability count in: ${r.stdout}`);
    return Number(m[1]);
  };
  withTree(WITH_IGNORED_COPY, { git: true, add: ["pharn", "docs", ".gitignore"] }, (root) => assert.equal(checked(root), 3));
  withTree(WITH_IGNORED_COPY, { git: false }, (root) => assert.equal(checked(root), 6));
});

test("★ closure: every consumer takes its list from listMarkdownFiles and keeps no readdirSync walk of its own (L36)", () => {
  for (const f of CONSUMERS) {
    const src = readFileSync(join(here, f), "utf8");
    assert.match(src, /import \{ listMarkdownFiles \} from "\.\/capability-files-core\.mjs";/, `${f} imports the shared list`);
    // 7.3.0: each consumer also reads the listing's `linkedDirs`, so it keeps the whole listing, not only `.files`.
    assert.match(src, /= listMarkdownFiles\(TARGET\);/, `${f} uses it`);
    assert.match(src, /\.linkedDirs\b/, `${f} reads the symlinked directories the list did not descend`);
    // A recursive readdirSync walk of the capability surface is the copy this file retired. validate.mjs keeps two
    // scoped readdirSync uses that are not capability discovery (canonDirs and walkExts, both under pharn/, and the
    // expected-fixture listing), so the check is on the shape of the retired function, not on readdirSync itself.
    assert.doesNotMatch(src, /else if \(name\.endsWith\("\.md"\)\) acc\.push\(p\);/, `${f} still carries the old .md walk`);
  }
});
