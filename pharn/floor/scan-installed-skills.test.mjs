// pharn/floor/scan-installed-skills.test.mjs — hermetic tests for the user-installed-skill enumerator.
//
// NO `claude -p`, NO git, NO network. Each test builds a small repo in an os.tmpdir() scratch dir and
// asserts the public surface (exit code + stdout JSON) by subprocess — mirroring count-grillers.test.mjs.
//
// SCOPE HONESTY (from the grill): these tests prove DISCOVERY — that the enumerator lists exactly the
// installed SKILL.md files (or none). They do NOT — and cannot — prove that a STAGE "surfaces/uses" a
// skill; that incorporation is advisory model work with no deterministic surface. A green suite means the
// FLOOR half (enumeration) holds, never that the stages respect the skills.
//
// The ★ tests are load-bearing:
//   • the SPEC's two cases: one installed skill → count 1 + its path; NO `.claude/skills/` → count 0,
//     exit 0 ("no skills → unchanged", fail-SAFE, NOT an error);
//   • hygiene: exactly one level (a nested `.claude/skills/a/b/SKILL.md` does not register `b`); a dir
//     without a SKILL.md does not register; a SYMLINKED skill dir / SKILL.md is skipped (no tree escape);
//     a dir NAME with quotes/newlines is emitted safely (JSON.stringify escapes it);
//   • fail-CLOSED only on a bad TARGET repo: a nonexistent target dir → nonzero exit, no stdout.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";

const here = dirname(fileURLToPath(import.meta.url));
const SS = join(here, "scan-installed-skills.mjs");

function run(targetDir) {
  return spawnSync(process.execPath, [SS, targetDir], { encoding: "utf8" });
}
function json(r) {
  return JSON.parse(r.stdout);
}
// Build a hermetic repo of { "rel/path": "contents" } in a scratch dir, run the helper, clean up. A
// trailing-slash key with empty body creates an empty directory (for the no-SKILL.md case).
function withRepo(files, fn) {
  const root = mkdtempSync(join(tmpdir(), "pharn-scanskills-"));
  try {
    for (const [rel, body] of Object.entries(files)) {
      if (rel.endsWith("/")) {
        mkdirSync(join(root, rel), { recursive: true });
        continue;
      }
      const p = join(root, rel);
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, body);
    }
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// --- tests ----------------------------------------------------------------------------------------

test("★ SPEC case A: one installed skill → count 1 + its repo-relative path", () => {
  withRepo({ ".claude/skills/supabase/SKILL.md": "# Supabase skill\nUse RLS.\n" }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), {
      count: 1,
      skills: [{ name: "supabase", path: ".claude/skills/supabase/SKILL.md" }],
    });
  });
});

test("★ SPEC case B: NO .claude/skills/ → count 0, exit 0 (fail-SAFE, 'no skills → unchanged')", () => {
  withRepo({ "README.md": "# a repo with no skills\n" }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { count: 0, skills: [] });
  });
});

test("multiple skills → sorted by name, each with its path", () => {
  withRepo(
    {
      ".claude/skills/zeta/SKILL.md": "# z\n",
      ".claude/skills/alpha/SKILL.md": "# a\n",
      ".claude/skills/mid/SKILL.md": "# m\n",
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.deepEqual(json(r), {
        count: 3,
        skills: [
          { name: "alpha", path: ".claude/skills/alpha/SKILL.md" },
          { name: "mid", path: ".claude/skills/mid/SKILL.md" },
          { name: "zeta", path: ".claude/skills/zeta/SKILL.md" },
        ],
      });
    }
  );
});

test("★ HYGIENE: a skill dir with NO SKILL.md does not register", () => {
  withRepo(
    {
      ".claude/skills/real/SKILL.md": "# real\n",
      ".claude/skills/empty/": "", // directory, no SKILL.md
      ".claude/skills/other/README.md": "# not a SKILL.md\n",
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.deepEqual(json(r), { count: 1, skills: [{ name: "real", path: ".claude/skills/real/SKILL.md" }] });
    }
  );
});

test("★ HYGIENE: exactly one level — a NESTED SKILL.md does not register the nested dir", () => {
  withRepo(
    {
      ".claude/skills/top/SKILL.md": "# top\n",
      ".claude/skills/top/nested/SKILL.md": "# nested — must be ignored\n",
    },
    (root) => {
      const r = run(root);
      assert.equal(r.status, 0);
      // only `top` registers; `nested` is one level too deep.
      assert.deepEqual(json(r), { count: 1, skills: [{ name: "top", path: ".claude/skills/top/SKILL.md" }] });
    }
  );
});

test("★ HYGIENE: a SYMLINKED skill dir is skipped (no tree escape)", () => {
  withRepo(
    {
      ".claude/skills/real/SKILL.md": "# real\n",
      "outside/evil/SKILL.md": "# outside the skills tree\n",
    },
    (root) => {
      // symlink .claude/skills/link -> ../../outside/evil (a skill dir reachable only via the link)
      symlinkSync(join(root, "outside", "evil"), join(root, ".claude", "skills", "link"), "dir");
      const r = run(root);
      assert.equal(r.status, 0);
      // the symlinked `link` is skipped; only the real dir registers.
      assert.deepEqual(json(r), { count: 1, skills: [{ name: "real", path: ".claude/skills/real/SKILL.md" }] });
    }
  );
});

test("★ HYGIENE: a symlinked SKILL.md inside a real dir is skipped (not a real file)", () => {
  withRepo(
    {
      "outside/target.md": "# link target\n",
      ".claude/skills/linky/": "", // real dir, SKILL.md will be a symlink
    },
    (root) => {
      symlinkSync(join(root, "outside", "target.md"), join(root, ".claude", "skills", "linky", "SKILL.md"), "file");
      const r = run(root);
      assert.equal(r.status, 0);
      // linky's SKILL.md is a symlink → not a real file → linky does not register.
      assert.deepEqual(json(r), { count: 0, skills: [] });
    }
  );
});

test("a dir NAME with a quote/newline is emitted safely (JSON.stringify escapes it)", () => {
  const weird = 'we"ird\nname';
  withRepo({ [`.claude/skills/${weird}/SKILL.md`]: "# weird\n" }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    // output must be valid JSON (no corruption) and round-trip the exact name.
    const parsed = json(r);
    assert.equal(parsed.count, 1);
    assert.equal(parsed.skills[0].name, weird);
    assert.equal(parsed.skills[0].path, `.claude/skills/${weird}/SKILL.md`);
  });
});

test("an EMPTY .claude/skills/ directory (present but no entries) → count 0, exit 0", () => {
  withRepo({ ".claude/skills/": "" }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { count: 0, skills: [] });
  });
});

test("★ FAIL-CLOSED on a bad TARGET: a nonexistent target dir → nonzero exit, no stdout (P5)", () => {
  withRepo({}, (root) => {
    const r = run(join(root, "does-not-exist"));
    assert.notEqual(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });
});

// --- characterization (6.47.0, selective-skill-reads) ------------------------------------------------
// Written and run against the scanner BEFORE its loop moved into installed-skills-core.mjs, and unchanged
// after, so the extraction is held to the legacy behaviour rather than to a description of it. Several
// cases pin behaviour the catalogue reports differently (an unreadable root, a `.claude` link leaving the
// target): this file pins only what the legacy roster prints.

test("characterization: the exact stdout bytes — one JSON line, a trailing newline, nothing else", () => {
  withRepo({ ".claude/skills/b/SKILL.md": "# b\n", ".claude/skills/a/SKILL.md": "# a\n" }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.equal(
      r.stdout,
      '{"count":2,"skills":[{"name":"a","path":".claude/skills/a/SKILL.md"},{"name":"b","path":".claude/skills/b/SKILL.md"}]}\n'
    );
    assert.equal(r.stderr, "");
  });
});

test("characterization: ordering is code-unit order (uppercase before lowercase, digits first)", () => {
  withRepo({ ".claude/skills/beta/SKILL.md": "x", ".claude/skills/Alpha/SKILL.md": "x", ".claude/skills/9z/SKILL.md": "x" }, (root) => {
    assert.deepEqual(
      json(run(root)).skills.map((s) => s.name),
      ["9z", "Alpha", "beta"]
    );
  });
});

test("characterization (L41): no target argument → the current directory", () => {
  withRepo({ ".claude/skills/here/SKILL.md": "# here\n" }, (root) => {
    const r = spawnSync(process.execPath, [SS], { encoding: "utf8", cwd: root });
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { count: 1, skills: [{ name: "here", path: ".claude/skills/here/SKILL.md" }] });
  });
});

test("characterization: a target that is a FILE → exit 1, no stdout", () => {
  withRepo({ "f.txt": "x" }, (root) => {
    const r = run(join(root, "f.txt"));
    assert.equal(r.status, 1);
    assert.equal(r.stdout, "");
  });
});

test("characterization: extra arguments after the target are ignored", () => {
  withRepo({ ".claude/skills/a/SKILL.md": "x" }, (root) => {
    const r = spawnSync(process.execPath, [SS, root, "--catalogue", "extra"], { encoding: "utf8" });
    assert.equal(r.status, 0);
    assert.equal(json(r).count, 1);
  });
});

test("characterization: `.claude/skills` itself a symlink → count 0 (the root is lstat'ed)", () => {
  withRepo({ "elsewhere/x/SKILL.md": "x", ".claude/": "" }, (root) => {
    symlinkSync(join(root, "elsewhere"), join(root, ".claude", "skills"), "dir");
    assert.deepEqual(json(run(root)), { count: 0, skills: [] });
  });
});

test("characterization: `.claude/skills` a regular FILE, or `.claude` a file → count 0, exit 0", () => {
  withRepo({ ".claude/skills": "not a dir" }, (root) => {
    assert.deepEqual(json(run(root)), { count: 0, skills: [] });
  });
  withRepo({ ".claude": "not a dir" }, (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(json(r), { count: 0, skills: [] });
  });
});

test("characterization: PARENT LINK — a `.claude` symlink leaving the target IS followed, and its skills ARE listed", () => {
  // The legacy roster lstat's `.claude/skills` and below, never `.claude` itself. The catalogue keeps this
  // roster (one enumerator) and marks such entries `unsafe`, never reading them.
  withRepo({ "outside/skills/far/SKILL.md": "# far\n", "repo/README.md": "x" }, (root) => {
    symlinkSync(join(root, "outside"), join(root, "repo", ".claude"), "dir");
    assert.deepEqual(json(run(join(root, "repo"))), {
      count: 1,
      skills: [{ name: "far", path: ".claude/skills/far/SKILL.md" }],
    });
  });
});

test("characterization: entry kinds — a file entry, a SKILL.md that is a directory, dangling and looping links register nothing", () => {
  withRepo(
    {
      ".claude/skills/ok/SKILL.md": "x",
      ".claude/skills/README.md": "a file entry",
      ".claude/skills/dirskill/SKILL.md/": "",
    },
    (root) => {
      const skills = join(root, ".claude", "skills");
      symlinkSync(join(root, "gone"), join(skills, "dangling"), "dir");
      symlinkSync(join(skills, "loop"), join(skills, "loop"), "dir");
      assert.deepEqual(json(run(root)), { count: 1, skills: [{ name: "ok", path: ".claude/skills/ok/SKILL.md" }] });
    }
  );
});

const IS_ROOT = typeof process.getuid === "function" && process.getuid() === 0;

test("characterization: an UNREADABLE `.claude/skills` → silently count 0, exit 0", { skip: IS_ROOT && "root ignores mode bits" }, () => {
  withRepo({ ".claude/skills/a/SKILL.md": "x" }, (root) => {
    const skills = join(root, ".claude", "skills");
    chmodSync(skills, 0o000);
    try {
      const r = run(root);
      assert.equal(r.status, 0);
      assert.deepEqual(json(r), { count: 0, skills: [] });
    } finally {
      chmodSync(skills, 0o755);
    }
  });
});

test(
  "characterization: a skill dir whose SKILL.md cannot be lstat'ed is silently skipped",
  { skip: IS_ROOT && "root ignores mode bits" },
  () => {
    withRepo({ ".claude/skills/a/SKILL.md": "x", ".claude/skills/b/SKILL.md": "x" }, (root) => {
      const b = join(root, ".claude", "skills", "b");
      chmodSync(b, 0o000);
      try {
        assert.deepEqual(json(run(root)), { count: 1, skills: [{ name: "a", path: ".claude/skills/a/SKILL.md" }] });
      } finally {
        chmodSync(b, 0o755);
      }
    });
  }
);

test("characterization: two dirs whose SKILL.md declare the same frontmatter name stay two entries", () => {
  withRepo(
    {
      ".claude/skills/one/SKILL.md": "---\nname: same\n---\n",
      ".claude/skills/two/SKILL.md": "---\nname: same\n---\n",
    },
    (root) => {
      assert.deepEqual(
        json(run(root)).skills.map((s) => s.name),
        ["one", "two"]
      );
    }
  );
});
