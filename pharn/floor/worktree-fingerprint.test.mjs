// pharn/floor/worktree-fingerprint.test.mjs — the worktree content-hash's suite.
//
// The central risk this suite exists to exclude is VACUITY (lessons-learned L34): an over-broad exclusion
// makes `fp_before === fp_after` ALWAYS, so the runner's "no edit between gates" claim degrades to a
// tautology while every test stays green. So every "stable" assertion below is PAIRED with a control
// proving the same fixture's fingerprint DOES move on an ordinary edit. Rules quantified over the
// excluded set iterate EVERY member (L52), not the one in front of the author.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, appendFileSync, rmSync, readFileSync, symlinkSync, unlinkSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  fingerprint,
  isExcluded,
  EXCLUDED_ARTIFACTS,
  INCLUDED_ARTIFACTS,
  ALGO,
  STATE_ROOT_SEGMENT,
  featureRoots,
} from "./worktree-fingerprint.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const FEATURE = "demo";

/** A throwaway git repo. `gitignorePharn` is a PARAMETER, not a constant, because the whole point of the
 *  `.pharn/` exclusion is the install that does NOT ignore it — a fixture that always ignored it would
 *  leave the exclusion unexercised, which is the L41 blind spot in its exact shape. */
function repo({ gitignorePharn = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "wfp-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe" });
  git("init", "-q", ".");
  git("config", "user.email", "t@t");
  git("config", "user.name", "t");
  if (gitignorePharn) writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
  mkdirSync(join(dir, `pharn/features/${FEATURE}`), { recursive: true });
  writeFileSync(join(dir, "a.txt"), "a\n");
  writeFileSync(join(dir, `pharn/features/${FEATURE}/PLAN.md`), "# PLAN\n");
  git("add", "-A");
  git("commit", "-qm", "init");
  return { dir, git, fp: () => fingerprint(dir, { feature: FEATURE }).digest };
}

test("the digest is STABLE across repeated runs over an unchanged tree", () => {
  const { dir, fp } = repo();
  try {
    assert.equal(fp(), fp());
    assert.equal(fingerprint(dir, { feature: FEATURE }).algo, ALGO);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("NON-VACUITY: the digest MOVES on an edit, an add, a delete, and an untracked non-ignored file", () => {
  const { dir, git, fp } = repo();
  try {
    const base = fp();
    appendFileSync(join(dir, "a.txt"), "edit\n");
    const afterEdit = fp();
    assert.notEqual(afterEdit, base, "an edit to a tracked file did not move the digest");

    writeFileSync(join(dir, "b.txt"), "b\n");
    const afterUntracked = fp();
    assert.notEqual(afterUntracked, afterEdit, "an UNTRACKED non-ignored file did not move the digest");

    git("add", "-A");
    git("commit", "-qm", "b");
    const afterAdd = fp();
    // Committing the same bytes must NOT move it: HEAD is deliberately not part of the digest.
    assert.equal(afterAdd, afterUntracked, "committing identical content moved the digest");

    rmSync(join(dir, "b.txt"));
    assert.notEqual(fp(), afterAdd, "a delete did not move the digest");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("L41 — `.pharn/` is excluded EVEN IN A FIXTURE THAT DOES NOT GIT-IGNORE IT, incl. a mark-phase append", () => {
  // The exclusion is inert when git-ignore already hides `.pharn/`, which is the case in THIS repo. The
  // install that does not ignore it is the one the exclusion exists for, so that is the fixture here.
  const { dir, fp } = repo({ gitignorePharn: false });
  try {
    // Control first: prove the enumeration really does see `.pharn/` in this fixture, or the assertion
    // below would pass because there was nothing to exclude.
    mkdirSync(join(dir, ".pharn/cost", FEATURE), { recursive: true });
    appendFileSync(join(dir, ".pharn/cost", FEATURE, "markers.jsonl"), JSON.stringify({ seq: 1, kind: "stage-start" }) + "\n");
    const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], { cwd: dir, encoding: "utf8" });
    assert.ok(untracked.includes(".pharn"), "fixture is wrong: git already hides .pharn/, so the exclusion is untested");

    const a = fp();
    appendFileSync(join(dir, ".pharn/cost", FEATURE, "markers.jsonl"), JSON.stringify({ seq: 2, kind: "stage-start" }) + "\n");
    mkdirSync(join(dir, ".pharn/pharn-verify/gates"), { recursive: true });
    writeFileSync(join(dir, ".pharn/pharn-verify/gates/0-test.out"), "x".repeat(4096));
    assert.equal(fp(), a, "a .pharn/ write moved the digest — the runner's own logs would refuse every run");

    // The paired non-vacuity control: the SAME fixture still moves on an ordinary edit.
    appendFileSync(join(dir, "a.txt"), "z\n");
    assert.notEqual(fp(), a, "the digest is inert in this fixture — the exclusion is over-broad");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("L52 — the digest is UNCHANGED by EVERY member of EXCLUDED_ARTIFACTS, and by a nested lens findings.json", () => {
  assert.ok(EXCLUDED_ARTIFACTS.length > 0, "EXCLUDED_ARTIFACTS is empty — this rule would be vacuous");
  const { dir, fp } = repo();
  try {
    const base = fp();
    for (const name of EXCLUDED_ARTIFACTS) {
      writeFileSync(join(dir, `pharn/features/${FEATURE}/${name}`), `content of ${name}\n`);
      assert.equal(fp(), base, `writing the EXCLUDED artifact ${name} moved the digest`);
    }
    mkdirSync(join(dir, `pharn/features/${FEATURE}/lenses/trust-fence`), { recursive: true });
    writeFileSync(join(dir, `pharn/features/${FEATURE}/lenses/trust-fence/findings.json`), "[]\n");
    assert.equal(fp(), base, "a nested lens findings.json moved the digest");

    // Non-vacuity: a STRAY file under the same directory is NOT excluded and must move it.
    writeFileSync(join(dir, `pharn/features/${FEATURE}/stray.md`), "x\n");
    assert.notEqual(fp(), base, "a stray file in the feature dir was silently excluded");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("L39 — the digest IS CHANGED by EVERY member of INCLUDED_ARTIFACTS (the divergence from reconcile)", () => {
  assert.ok(INCLUDED_ARTIFACTS.length > 0, "INCLUDED_ARTIFACTS is empty — this rule would be vacuous");
  const { dir, fp } = repo();
  try {
    for (const name of INCLUDED_ARTIFACTS) {
      const before = fp();
      writeFileSync(join(dir, `pharn/features/${FEATURE}/${name}`), `content of ${name} ${Math.random()}\n`);
      assert.notEqual(
        fp(),
        before,
        `${name} is exempt to reconcile but MUST be included here — a change to it changes what a gate decides`
      );
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an excluded NAME under ANOTHER slug is NOT excluded — the exemption is per-feature", () => {
  const { dir, fp } = repo();
  try {
    const base = fp();
    mkdirSync(join(dir, "pharn/features/other"), { recursive: true });
    writeFileSync(join(dir, "pharn/features/other/VERIFY.md"), "x\n");
    assert.notEqual(fp(), base, "another feature's VERIFY.md was excluded by this feature's exemption");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("with NO feature named, nothing is excluded on the artifact axis (fail-closed, opt-in)", () => {
  const { dir } = repo();
  try {
    const a = fingerprint(dir, { feature: null }).digest;
    writeFileSync(join(dir, `pharn/features/${FEATURE}/VERIFY.md`), "x\n");
    assert.notEqual(fingerprint(dir, { feature: null }).digest, a, "an artifact was exempted with no --feature supplied");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("isExcluded: the state root, both feature roots, and the refusals", () => {
  assert.ok(isExcluded(".pharn", FEATURE));
  assert.ok(isExcluded(`${STATE_ROOT_SEGMENT}anything/at/all`, FEATURE));
  for (const root of featureRoots(FEATURE)) {
    assert.ok(isExcluded(`${root}VERIFY.md`, FEATURE), `${root} was not honoured`);
    assert.equal(isExcluded(`${root}src.ts`, FEATURE), false, `${root} excluded a non-artifact`);
  }
  // A crafted slug cannot build a traversing prefix: the shape gate runs before any startsWith.
  assert.equal(isExcluded("pharn/features/../../etc/passwd", ".."), false);
  assert.equal(isExcluded("pharn/features/demo/lenses/a/b/findings.json", FEATURE), false, "a DEEPER lens path must not be excluded");
});

test("the fingerprint is correct when the project root is a git SUBDIRECTORY", () => {
  const outer = mkdtempSync(join(tmpdir(), "wfp-outer-"));
  try {
    const git = (cwd, ...a) => execFileSync("git", a, { cwd, stdio: "pipe" });
    git(outer, "init", "-q", ".");
    git(outer, "config", "user.email", "t@t");
    git(outer, "config", "user.name", "t");
    const inner = join(outer, "packages", "app");
    mkdirSync(inner, { recursive: true });
    writeFileSync(join(outer, "outer.txt"), "outer\n");
    writeFileSync(join(inner, "inner.txt"), "inner\n");
    git(outer, "add", "-A");
    git(outer, "commit", "-qm", "init");

    const a = fingerprint(inner, { feature: FEATURE });
    assert.ok(a.ok);
    // The set is scoped to the subdirectory: an edit OUTSIDE it must not move the inner digest, and an
    // edit INSIDE it must. Both directions, because either alone is satisfiable by a broken enumeration.
    appendFileSync(join(outer, "outer.txt"), "changed\n");
    assert.equal(fingerprint(inner, { feature: FEATURE }).digest, a.digest, "an edit outside the project root moved its digest");
    appendFileSync(join(inner, "inner.txt"), "changed\n");
    assert.notEqual(fingerprint(inner, { feature: FEATURE }).digest, a.digest, "an edit inside the project root did not move its digest");
  } finally {
    rmSync(outer, { recursive: true, force: true });
  }
});

test("a non-git directory is a FAIL-CLOSED refusal, never a partial hash", () => {
  const dir = mkdtempSync(join(tmpdir(), "wfp-nogit-"));
  try {
    const r = fingerprint(dir, { feature: FEATURE });
    assert.equal(r.ok, false);
    assert.match(r.reason, /git/i);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("the path/digest stream is length-prefixed — two trees cannot collide by field-boundary ambiguity", () => {
  // ("ab","c") and ("a","bc") would produce one stream without the length prefix. Asserted on the real
  // digests rather than by reading the code, so a refactor that drops the prefix fails here.
  const mk = (names) => {
    const dir = mkdtempSync(join(tmpdir(), "wfp-amb-"));
    execFileSync("git", ["init", "-q", "."], { cwd: dir, stdio: "pipe" });
    execFileSync("git", ["config", "user.email", "t@t"], { cwd: dir, stdio: "pipe" });
    execFileSync("git", ["config", "user.name", "t"], { cwd: dir, stdio: "pipe" });
    for (const [n, c] of names) writeFileSync(join(dir, n), c);
    return dir;
  };
  const d1 = mk([["ab", "1"]]);
  const d2 = mk([["a", "1"]]);
  try {
    assert.notEqual(fingerprint(d1, {}).digest, fingerprint(d2, {}).digest);
  } finally {
    rmSync(d1, { recursive: true, force: true });
    rmSync(d2, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------------------------------
// ✧ The PARTITION test — the obligation set this increment creates (L29/L31), and its L43 bound.
// ---------------------------------------------------------------------------------------------------

test("✧ PARTITION — EXCLUDED ∪ INCLUDED === reconcile-ignore.json pipeline_artifacts.names", () => {
  // A new pipeline artifact now FAILS here until someone classifies it for BOTH consumers: reconcile
  // asks "may this change after the build anchor?", this asks "does a change here alter what the gates
  // judged?". The answers diverge on the INCLUDED names, which is why this is a partition
  // and not an equality against one list.
  //
  // BOUND (L43), stated rather than implied: this certifies that the THREE stores AGREE, never that the
  // set is CORRECT. All three can be stale together the day a new artifact lands and nobody classifies
  // it. It buys "no silent divergence", not "the set is right".
  const ignore = JSON.parse(readFileSync(join(REPO, "pharn/floor/reconcile-ignore.json"), "utf8"));
  // Since 6.17.0 the fingerprint classifies EVERY pipeline artifact, including the pre-anchor ones reconcile does
  // not exempt (reconcile-ignore.json `pre_anchor_artifacts`).
  const names = [...ignore.pipeline_artifacts.names, ...ignore.pre_anchor_artifacts.names];
  assert.ok(
    Array.isArray(names) && names.length > 0,
    "reconcile-ignore pipeline_artifacts.names is empty — the partition would be vacuous"
  );

  const union = [...EXCLUDED_ARTIFACTS, ...INCLUDED_ARTIFACTS].sort();
  assert.deepEqual(union, [...names].sort(), "the fingerprint's partition of the pipeline artifacts diverged from reconcile-ignore.json");

  // The two halves must be DISJOINT, or a name could satisfy the union while being classified twice.
  const overlap = EXCLUDED_ARTIFACTS.filter((n) => INCLUDED_ARTIFACTS.includes(n));
  assert.deepEqual(overlap, [], `a name is in BOTH halves of the partition: ${overlap.join(", ")}`);
});

test("✧ PARTITION — reconcile-ignore.json and check-regress.mjs PIPELINE_ARTIFACTS still agree (the pre-existing pair)", () => {
  // The third store. check-bash-reconcile.test.mjs already pins this pair; re-asserted here so a reader
  // of the partition sees the whole obligation set in one place rather than inferring it.
  const ignore = JSON.parse(readFileSync(join(REPO, "pharn/floor/reconcile-ignore.json"), "utf8"));
  const src = readFileSync(join(REPO, "pharn/floor/check-regress.mjs"), "utf8");
  const block = src.match(/const PIPELINE_ARTIFACTS = \[([\s\S]*?)\];/);
  assert.ok(block, "check-regress.mjs no longer carries the PIPELINE_ARTIFACTS literal this test reads");
  const listed = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(listed, [...ignore.pipeline_artifacts.names, ...ignore.pre_anchor_artifacts.names].sort());
});

test("the CLI entry point is exercised — a default no test reaches is a default that can be wrong (L41)", () => {
  // Coverage showed main() reached by nothing: every other test calls fingerprint() directly, which is
  // exactly the hermetic-fixture blind spot L41 names. Both branches are driven here, by subprocess.
  const dir = mkdtempSync(join(tmpdir(), "wfp-cli-"));
  try {
    execFileSync("git", ["init", "-q", "."], { cwd: dir, stdio: "pipe" });
    writeFileSync(join(dir, "a.txt"), "a\n");
    const CLI = join(HERE, "worktree-fingerprint.mjs");

    // Success path, including the `--base` default (no --base supplied → "."), run with cwd = the fixture.
    const ok = execFileSync(process.execPath, [CLI, "--feature", FEATURE], { cwd: dir, encoding: "utf8" });
    const parsed = JSON.parse(ok);
    assert.equal(parsed.algo, ALGO);
    assert.match(parsed.digest, /^[0-9a-f]{64}$/);
    assert.ok(parsed.paths >= 1, "the CLI reported no paths over a non-empty tree");

    // Explicit --base agrees with the default, so the default is not merely unexercised but CORRECT.
    const viaFlag = JSON.parse(execFileSync(process.execPath, [CLI, "--base", ".", "--feature", FEATURE], { cwd: dir, encoding: "utf8" }));
    assert.equal(viaFlag.digest, parsed.digest, "the --base default disagrees with an explicit '.'");

    // Failure path: a non-git directory must exit 2 and print nothing on stdout (fail-closed).
    const bad = mkdtempSync(join(tmpdir(), "wfp-cli-nogit-"));
    try {
      const r = spawnSync(process.execPath, [CLI], { cwd: bad, encoding: "utf8" });
      assert.equal(r.status, 2, "a non-git directory did not exit 2");
      assert.equal(r.stdout.trim(), "", "the failure path wrote a digest to stdout");
      assert.match(r.stderr, /worktree-fingerprint:/);
    } finally {
      rmSync(bad, { recursive: true, force: true });
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// SYMLINKS (6.20.8, .dev/features/reconcile-symlink-target/PLAN.md) — the fingerprint hashes through hashFile,
// which now hashes EVERY link by its link text. The same trees as the reconciler's cases; every "unchanged" case
// is paired with a "moves" control on the same fixture (L34).

/** repo() plus a tracked CLAUDE.md -> AGENTS.md, OTHER.md with the same bytes, a directory link, a dangling link,
 *  and a link to a file outside the repo. Returns the outside file's path too. */
function linkRepo() {
  const r = repo();
  const outside = mkdtempSync(join(tmpdir(), "wfp-outside-"));
  writeFileSync(join(outside, "shared.md"), "shared v1\n");
  writeFileSync(join(r.dir, "AGENTS.md"), "agents v1\n");
  writeFileSync(join(r.dir, "OTHER.md"), "agents v1\n");
  mkdirSync(join(r.dir, "vendored"));
  writeFileSync(join(r.dir, "vendored/SKILL.md"), "skill\n");
  symlinkSync("AGENTS.md", join(r.dir, "CLAUDE.md"));
  symlinkSync("vendored", join(r.dir, "dir-link"));
  symlinkSync("gone", join(r.dir, "dangling"));
  symlinkSync(join(outside, "shared.md"), join(r.dir, "shared-link"));
  r.git("add", "-A");
  r.git("commit", "-qm", "links");
  return {
    ...r,
    outside,
    done: () => (rmSync(r.dir, { recursive: true, force: true }), rmSync(outside, { recursive: true, force: true })),
  };
}

test("★ links: editing AGENTS.md moves the digest (control) — through AGENTS.md's own entry", () => {
  const r = linkRepo();
  try {
    const before = r.fp();
    writeFileSync(join(r.dir, "AGENTS.md"), "agents v2\n");
    assert.notEqual(r.fp(), before, "control: an edit of a tracked file moves the fingerprint");
  } finally {
    r.done();
  }
});

test("★ links: RE-POINTING CLAUDE.md between two same-content files moves the digest (unmoved through 6.20.7)", () => {
  const r = linkRepo();
  try {
    const before = r.fp();
    unlinkSync(join(r.dir, "CLAUDE.md"));
    symlinkSync("OTHER.md", join(r.dir, "CLAUDE.md"));
    assert.notEqual(r.fp(), before);
  } finally {
    r.done();
  }
});

test("★ links: a change to a link's target OUTSIDE the repo leaves the digest unchanged — it is not a repo change", () => {
  const r = linkRepo();
  try {
    const before = r.fp();
    writeFileSync(join(r.outside, "shared.md"), "shared v2\n");
    assert.equal(r.fp(), before, "up to 6.20.7 the link carried the outside file's bytes and moved the digest");
    unlinkSync(join(r.dir, "shared-link"));
    symlinkSync(join(r.outside, "elsewhere.md"), join(r.dir, "shared-link"));
    assert.notEqual(r.fp(), before, "control: re-pointing that same link moves it");
  } finally {
    r.done();
  }
});

test("links: a directory link and a dangling link are stable untouched and move on re-point (the 6.17.1 treatment, kept)", () => {
  const r = linkRepo();
  try {
    const before = r.fp();
    assert.equal(r.fp(), before, "stable over an unchanged tree");
    unlinkSync(join(r.dir, "dir-link"));
    symlinkSync("pharn", join(r.dir, "dir-link"));
    const afterDir = r.fp();
    assert.notEqual(afterDir, before, "a re-pointed directory link moves it");
    unlinkSync(join(r.dir, "dangling"));
    symlinkSync("gone-elsewhere", join(r.dir, "dangling"));
    assert.notEqual(r.fp(), afterDir, "a re-pointed dangling link moves it");
  } finally {
    r.done();
  }
});

// ✧ GOLDEN — "Bump ALGO on ANY change to what is hashed" as a TEST, not a sentence. 6.17.1 changed what is hashed
// without bumping it; 6.20.8 changed it again (L20: the recurrence earns a check). One fixed tree holding every
// link kind has ONE recorded digest per ALGO: a change to hashing that moves this tree's digest fails here until
// ALGO is bumped and a digest recorded for it. BOUND, stated: a change invisible on THIS tree is not caught.
// The /2 value was cross-checked when recorded by recomputing it by hand from the documented composition (sorted
// `len \0 path \0 sha256 \0` triples; a link contributes sha256("symlink\0" + text)), not copied from the output.
const GOLDEN = Object.freeze({
  "worktree-fingerprint/2+sha256": "95c9ef03cb8a321936a6cbd47b23acf8d83a73bad2decc1e416f0cc5ec2a6e22",
});

function goldenTree() {
  const dir = mkdtempSync(join(tmpdir(), "wfp-golden-"));
  const git = (...a) => execFileSync("git", a, { cwd: dir, stdio: "pipe" });
  git("init", "-q", ".");
  writeFileSync(join(dir, ".gitignore"), ".pharn/\n");
  writeFileSync(join(dir, "a.txt"), "a\n");
  mkdirSync(join(dir, "sub"));
  writeFileSync(join(dir, "sub/f.txt"), "f\n");
  symlinkSync("a.txt", join(dir, "file-link"));
  symlinkSync("sub", join(dir, "dir-link"));
  symlinkSync("nowhere", join(dir, "dangling"));
  return dir;
}

test("✧ GOLDEN: the digest of a fixed tree holding every link kind is the one recorded for the live ALGO", () => {
  const dir = goldenTree();
  try {
    const r = fingerprint(dir);
    assert.ok(r.ok, r.reason);
    assert.equal(r.paths, 6, "the fixture's reconciled set (untracked, not ignored) is exactly its six paths");
    assert.ok(Object.hasOwn(GOLDEN, ALGO), `no golden digest recorded for ${ALGO} — record one when bumping ALGO`);
    assert.equal(
      r.digest,
      GOLDEN[ALGO],
      "what the fingerprint hashes changed without an ALGO bump — bump ALGO and record the new digest (worktree-fingerprint.mjs, UPGRADES)"
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
