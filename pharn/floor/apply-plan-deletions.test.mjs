// pharn/floor/apply-plan-deletions.test.mjs — hermetic tests for the plan-declared deletion CLI (6.56.0).
//
// NO network. Each case builds a throwaway project under os.tmpdir() with `pharn/features/<name>/PLAN.md` and runs the
// REAL CLI by subprocess with that project as its cwd. The ★ cases:
//   • PATH_KINDS (L59) — every kind of thing a marked path can name, at the leaf and as a parent; only a regular file is
//     deleted, an absent path is reported, everything else refuses and deletes NOTHING;
//   • every closed refusal code is reached by a fixture, and each has a control that does not reach it (L60);
//   • validate-before-delete: one bad item among good ones deletes nothing;
//   • idempotence: a second run reports the deleted path as absent;
//   • ★ WIRING: the committed `pharn-build.md` line, read out of the command, run under `sh -c` in a project holding a
//     copy of the floor, deletes the marked file (L45: execute the line the invocation site carries, never only the
//     script by path).

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, symlinkSync, readFileSync, cpSync, lstatSync } from "node:fs";
import { tmpdir } from "node:os";
import { REFUSALS } from "./apply-plan-deletions.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "apply-plan-deletions.mjs");
const REPO = join(HERE, "..", "..");

function project(filesBody, existing = []) {
  const root = mkdtempSync(join(tmpdir(), "pharn-apd-"));
  mkdirSync(join(root, "pharn", "features", "demo"), { recursive: true });
  writeFileSync(join(root, "pharn", "features", "demo", "PLAN.md"), `# PLAN — demo\n\n## Files\n\n${filesBody}\n\n## Next\n\nend\n`);
  for (const f of existing) {
    mkdirSync(dirname(join(root, f)), { recursive: true });
    writeFileSync(join(root, f), "x\n");
  }
  return root;
}
const run = (root, args = ["--feature", "demo"]) => spawnSync(process.execPath, [CLI, ...args], { cwd: root, encoding: "utf8" });
const doc = (r) => JSON.parse(r.stdout);
const present = (root, p) => {
  try {
    lstatSync(join(root, p));
    return true;
  } catch {
    return false;
  }
};
function withProject(filesBody, existing, fn) {
  const root = project(filesBody, existing);
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("★ the trigger shape: marked regular files are deleted, unmarked ones are kept, exit 0", () => {
  const files = ["content/blog/a.mdx", ".vscode/settings.json", "src/components/ui/label.tsx", "src/keep.ts"];
  withProject(
    "- `content/blog/a.mdx` (delete) — orphan\n- `.vscode/settings.json` (delete) — orphan\n- `src/components/ui/label.tsx` (delete) — unused\n- `src/keep.ts` — edited",
    files,
    (root) => {
      const r = run(root);
      assert.equal(r.status, 0, r.stdout + r.stderr);
      assert.deepEqual(doc(r), {
        feature: "demo",
        deleted: ["content/blog/a.mdx", ".vscode/settings.json", "src/components/ui/label.tsx"],
        absent: [],
      });
      for (const f of files.slice(0, 3)) assert.equal(present(root, f), false, f);
      assert.equal(present(root, "src/keep.ts"), true, "an unmarked item is never deleted");
      // Idempotence: a second run reports them absent and deletes nothing.
      const again = run(root);
      assert.equal(again.status, 0);
      assert.deepEqual(doc(again).deleted, []);
      assert.deepEqual(doc(again).absent, ["content/blog/a.mdx", ".vscode/settings.json", "src/components/ui/label.tsx"]);
    }
  );
});

test("★ a plan with no marked item deletes nothing and exits 0 (the line runs unconditionally)", () => {
  withProject("- `src/keep.ts` — edited", ["src/keep.ts"], (root) => {
    const r = run(root);
    assert.equal(r.status, 0);
    assert.deepEqual(doc(r), { feature: "demo", deleted: [], absent: [] });
    assert.equal(present(root, "src/keep.ts"), true);
  });
});

// PATH_KINDS (L59) — every member is a fixture builder over a marked path `t/x`; `deleted` is the only success.
const PATH_KINDS = Object.freeze({
  "regular file": { make: (root) => writeFileSync(join(root, "t", "x"), "x"), want: "deleted" },
  absent: { make: () => {}, want: "absent" },
  directory: { make: (root) => mkdirSync(join(root, "t", "x")), want: "not-a-regular-file" },
  "link to a file": {
    make: (root) => {
      writeFileSync(join(root, "t", "real"), "x");
      symlinkSync(join(root, "t", "real"), join(root, "t", "x"));
    },
    want: "not-a-regular-file",
  },
  "link to a directory": { make: (root) => symlinkSync(join(root, "t"), join(root, "t", "x")), want: "not-a-regular-file" },
  "dangling link": { make: (root) => symlinkSync(join(root, "nowhere"), join(root, "t", "x")), want: "not-a-regular-file" },
  "looping link": { make: (root) => symlinkSync(join(root, "t", "x"), join(root, "t", "x")), want: "not-a-regular-file" },
});

test("★ PATH_KINDS: only a regular file is deleted; an absent one is reported; every other kind refuses, nothing followed", () => {
  for (const [kind, { make, want }] of Object.entries(PATH_KINDS)) {
    withProject("- `t/x` (delete) — kind under test\n- `t/keep` (delete) — a second, valid item", ["t/keep"], (root) => {
      make(root);
      const r = run(root);
      if (want === "deleted" || want === "absent") {
        assert.equal(r.status, 0, `${kind}: ${r.stdout}`);
        assert.ok(doc(r)[want].includes("t/x"), `${kind}: expected in ${want}[]`);
        assert.equal(present(root, "t/x"), false, kind);
      } else {
        assert.equal(r.status, 2, `${kind}: ${r.stdout}`);
        assert.equal(doc(r).reason_code, want, kind);
        assert.equal(doc(r).path, "t/x", kind);
        assert.equal(present(root, "t/x"), true, `${kind}: the refused path is left alone`);
        assert.equal(present(root, "t/keep"), true, `${kind}: validate-before-delete — nothing was deleted`);
      }
    });
  }
  assert.equal(Object.keys(PATH_KINDS).length, 7, "the enumeration is the deliverable (L29)");
});

test("★ a symlinked PARENT refuses `containment` and deletes nothing behind it", () => {
  withProject("- `lnk/secret.txt` (delete) — through a link", [], (root) => {
    const outside = mkdtempSync(join(tmpdir(), "pharn-apd-out-"));
    try {
      writeFileSync(join(outside, "secret.txt"), "keep me\n");
      symlinkSync(outside, join(root, "lnk"));
      const r = run(root);
      assert.equal(r.status, 2);
      assert.equal(doc(r).reason_code, "containment");
      assert.equal(existsSync(join(outside, "secret.txt")), true, "a file outside the project survived");
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });
});

// Each refusal reached by a fixture; each paired with a control line that does NOT reach it (L60).
const REFUSAL_CASES = Object.freeze([
  ["delete-near-miss", "- `a.ts` (Delete) — case", "- `a.ts` (delete) — case"],
  ["delete-near-miss", "- `a.ts` (deleted)", "- `a.ts` (delete)"],
  ["conflicting-declaration", "- `a.ts` (delete) — gone\n- `a.ts` — kept", "- `a.ts` (delete) — gone\n- `b.ts` — kept"],
  ["delete-not-concrete", "- `src/*.ts` (delete) — glob", "- `src/x.ts` (delete) — file"],
  ["delete-not-concrete", "- `<path>` (delete) — placeholder", "- `path` (delete) — file"],
  ["bad-path", "- `../escape.ts` (delete) — up", "- `escape.ts` (delete) — here"],
  ["bad-path", "- `/etc/hosts` (delete) — absolute", "- `etc/hosts` (delete) — relative"],
  ["bad-path", "- `.git/config` (delete) — git metadata", "- `git/config` (delete) — ordinary"],
  ["bad-path", "- `.GIT/config` (delete) — any letter case", "- `GIT/config` (delete) — ordinary"],
  ["bad-path", "- `pharn/.run/x.json` (delete) — state root", "- `pharn-x.json` (delete) — ordinary"],
  ["bad-path", "- `pharn/features/demo/PLAN.md` (delete) — the pipeline's own", "- `pharn/notes.md` (delete) — ordinary"],
  ["bad-path", "- `a\\b.ts` (delete) — backslash", "- `a/b.ts` (delete) — slash"],
  ["control-path", "- `pharn/LIMITS.md` (delete) — trusted doc", "- `LIMITS.txt` (delete) — ordinary"],
  ["control-path", "- `pharn/limits.md` (delete) — case-folded", "- `pharn/limits.txt` (delete) — ordinary"],
  ["control-path", "- `pharn/floor/validate.mjs` (delete) — a floor", "- `pharn/flooring.mjs` (delete) — ordinary"],
  ["control-path", "- `.claude/hooks/enforce-writes-scope.cjs` (delete) — a guard", "- `.claude/notes.md` (delete) — ordinary"],
  ["control-path", "- `pharn/memory-bank/lessons-learned.md` (delete) — canon", "- `memory-banks/x.md` (delete) — ordinary"],
  ["control-path", "- `pharn/spec-template.md` (delete) — the SPEC template", "- `pharn.spec.md` (delete) — ordinary"],
  // 6.56.0 GATE-2 review (F2/F3): the reserved prefixes and the control set in another ASCII letter case.
  [
    "bad-path",
    "- `PHARN/.RUN/writes-scope.json` (delete) — state root, upper case",
    "- `PHARN/.RUNX/writes-scope.json` (delete) — ordinary",
  ],
  ["bad-path", "- `PHARN/features/other/SPEC.md` (delete) — pipeline, upper case", "- `PHARN/featured/other/SPEC.md` (delete) — ordinary"],
  ["control-path", "- `.CLAUDE/settings.json` (delete) — the wiring, upper case", "- `.CLAUDE/notes.json` (delete) — ordinary"],
  ["control-path", "- `Pharn/Floor/validate.mjs` (delete) — a floor, mixed case", "- `Pharn/Flooring.mjs` (delete) — ordinary"],
]);

test("★ every refusal code is reached by its fixture and not by its control; a refusal deletes nothing", () => {
  for (const [code, line, control] of REFUSAL_CASES) {
    withProject(`${line}\n- \`victim.ts\` (delete) — a valid item`, ["victim.ts"], (root) => {
      const r = run(root);
      assert.equal(r.status, 2, `${code}: ${line} → ${r.stdout}`);
      assert.equal(doc(r).reason_code, code, line);
      assert.deepEqual(doc(r).deleted, []);
      assert.equal(present(root, "victim.ts"), true, `${code}: nothing deleted`);
    });
    withProject(`${control}\n- \`victim.ts\` (delete) — a valid item`, ["victim.ts"], (root) => {
      const r = run(root);
      assert.equal(r.status, 0, `${code} control: ${control} → ${r.stdout}`);
    });
  }
  // usage / no-plan / plan-files-unparseable — argv and PLAN-level refusals.
  withProject("- `a.ts` (delete)", [], (root) => {
    for (const args of [[], ["--feature"], ["--feature", "Bad_Slug"], ["--feature", "../x"], ["--feature", "demo", "extra"]]) {
      const r = run(root, args);
      assert.equal(r.status, 2, JSON.stringify(args));
      assert.equal(doc(r).reason_code, "usage");
    }
    const r = run(root, ["--feature", "other"]);
    assert.equal(r.status, 2);
    assert.equal(doc(r).reason_code, "no-plan");
    writeFileSync(join(root, "pharn", "features", "demo", "PLAN.md"), "# PLAN\n\nno files heading\n");
    assert.equal(doc(run(root)).reason_code, "plan-files-unparseable");
  });
  withProject("- `a.ts` (delete)", [], (root) => {
    const real = join(root, "elsewhere");
    mkdirSync(real);
    writeFileSync(join(real, "PLAN.md"), "# PLAN\n\n## Files\n\n- `a.ts` (delete)\n");
    mkdirSync(join(root, "pharn", "features", "linked"), { recursive: true });
    rmSync(join(root, "pharn", "features", "linked"), { recursive: true });
    symlinkSync(real, join(root, "pharn", "features", "linked"));
    assert.equal(doc(run(root, ["--feature", "linked"])).reason_code, "no-plan", "a PLAN reached through a symlink");
  });
  // CLOSURE (L36): every code the module declares is reached above; unlink-failed is reached below.
  const reached = new Set([
    ...REFUSAL_CASES.map((c) => c[0]),
    "usage",
    "no-plan",
    "plan-files-unparseable",
    "containment",
    "not-a-regular-file",
    "unlink-failed",
  ]);
  assert.deepEqual([...reached].sort(), [...REFUSALS].sort());
});

test(
  "★ unlink-failed: a file in a read-only directory refuses and lists what was already deleted",
  { skip: process.getuid?.() === 0 },
  () => {
    withProject("- `a/first.ts` (delete) — ok\n- `ro/second.ts` (delete) — fails", ["a/first.ts", "ro/second.ts"], (root) => {
      spawnSync("chmod", ["555", join(root, "ro")]);
      try {
        const r = run(root);
        assert.equal(r.status, 2, r.stdout);
        assert.equal(doc(r).reason_code, "unlink-failed");
        assert.deepEqual(doc(r).deleted, ["a/first.ts"]);
        assert.equal(doc(r).path, "ro/second.ts");
      } finally {
        spawnSync("chmod", ["755", join(root, "ro")]);
      }
    });
  }
);

test("★ a hostile path never reaches a shell, and its bytes reach the output only JSON-quoted", () => {
  withProject("- `src/$(touch PWNED).ts` (delete) — hostile", ["src/$(touch PWNED).ts"], (root) => {
    const r = run(root);
    assert.equal(r.status, 0, r.stdout);
    assert.deepEqual(doc(r).deleted, ["src/$(touch PWNED).ts"]);
    assert.equal(existsSync(join(root, "PWNED")), false);
  });
});

// ── THE ON-DISK IDENTITY (6.56.0 GATE-2 review, blocking finding) ───────────────────────────────────────────
// A case-insensitive volume (APFS by default) equates spellings no lexical fold reproduces: U+017F `ſ` names `s`. The
// spelling-only refusal let `pharn/LIMITſ.md` delete pharn/LIMITS.md. These rows need such a volume, so the tmpdir volume is PROBED
// and the rows are SKIPPED, with the reason, where it is case-sensitive (there `pharn/LIMITſ.md` simply names another file).
function foldsLongS() {
  const dir = mkdtempSync(join(tmpdir(), "pharn-apd-probe-"));
  try {
    writeFileSync(join(dir, "probe-s"), "x");
    return existsSync(join(dir, "probe-ſ"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const FOLDING = foldsLongS();
const FOLD_SKIP = FOLDING ? false : "the tmpdir volume does not fold U+017F to `s`, so these spellings name other files there";

// [declared spelling, the real file it reaches, expected code] — each with a control below that must still delete.
const ON_DISK_CASES = Object.freeze([
  ["pharn/LIMITſ.md", "pharn/LIMITS.md", "control-path"],
  [".claude/ſettings.json", ".claude/settings.json", "control-path"],
  ["pharn/featureſ/other/SPEC.md", "pharn/features/other/SPEC.md", "bad-path"],
  ["pharn/.run/writeſ-scope.json", "pharn/.run/writes-scope.json", "bad-path"],
  ["pharn/floor/validate.mjſ", "pharn/floor/validate.mjs", "control-path"],
]);

test(
  "★ ON-DISK: a spelling a case-insensitive volume folds onto a protected file is refused, and the file survives",
  { skip: FOLD_SKIP },
  () => {
    for (const [spelled, real, code] of ON_DISK_CASES) {
      withProject(`- \`${spelled}\` (delete) — folds onto ${real}\n- \`victim.ts\` (delete) — valid`, [real, "victim.ts"], (root) => {
        const r = run(root);
        assert.equal(r.status, 2, `${spelled}: ${r.stdout}`);
        assert.equal(doc(r).reason_code, code, spelled);
        assert.equal(present(root, real), true, `${real} survived`);
        assert.equal(present(root, "victim.ts"), true, "validate-before-delete");
      });
    }
    // CONTROL (L60): the same fold onto an ORDINARY file still deletes it — the rule judges identity, not the character.
    withProject("- `noteſ.md` (delete) — folds onto notes.md", ["notes.md"], (root) => {
      const r = run(root);
      assert.equal(r.status, 0, r.stdout);
      assert.equal(present(root, "notes.md"), false);
    });
  }
);

test("★ ON-DISK: a hard link to a trusted file is refused by device and inode, on any volume", () => {
  withProject("- `notes.md` (delete) — a hard link to pharn/LIMITS.md", ["pharn/LIMITS.md"], (root) => {
    spawnSync("ln", [join(root, "pharn/LIMITS.md"), join(root, "notes.md")]);
    assert.equal(present(root, "notes.md"), true, "the fixture made the link");
    const r = run(root);
    assert.equal(r.status, 2, r.stdout);
    assert.equal(doc(r).reason_code, "control-path");
    assert.equal(present(root, "notes.md"), true);
  });
  // CONTROL: an ordinary file beside it is deleted.
  withProject("- `notes.md` (delete) — an ordinary file", ["pharn/LIMITS.md", "notes.md"], (root) => {
    assert.equal(run(root).status, 0);
    assert.equal(present(root, "pharn/LIMITS.md"), true);
  });
});

test("★ WIRING: the committed pharn-build.md line, under sh -c, deletes the marked file (L45)", () => {
  const body = readFileSync(join(REPO, ".claude", "commands", "pharn-build.md"), "utf8");
  const start = body.search(/^## Step 3\b/m);
  const end = body.search(/^## Step 4\b/m);
  assert.ok(start > 0 && end > start, "both Step 3 and Step 4 anchors are found (L60)");
  const step3 = body.slice(start, end);
  const line = step3
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.startsWith("node pharn/floor/apply-plan-deletions.mjs"));
  assert.equal(line, "node pharn/floor/apply-plan-deletions.mjs --feature <name>");
  withProject("- `src/old.ts` (delete) — orphan\n- `src/keep.ts` — kept", ["src/old.ts", "src/keep.ts"], (root) => {
    cpSync(join(REPO, "pharn", "floor"), join(root, "pharn", "floor"), { recursive: true });
    const r = spawnSync("sh", ["-c", line.replace("<name>", "demo")], { cwd: root, encoding: "utf8" });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(present(root, "src/old.ts"), false);
    assert.equal(present(root, "src/keep.ts"), true);
  });
});
