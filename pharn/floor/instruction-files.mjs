// pharn/floor/instruction-files.mjs — the I/O half of the instruction-files checker. It builds the two TREES the pure
// rules in pharn/floor/instruction-files-core.mjs read (that module's header is the spec: the set, the measure, the
// bounds), resolves the base commit, reads the threshold at that commit, and returns `{code, doc}`. It prints nothing
// and never exits; the CLI entry is pharn/floor/check-instruction-files.mjs.
//
// THE TWO TREES:
//   • HEAD — the working tree as `reconcile-baseline.mjs`'s `enumerate()` lists it: `tracked ∪ untracked-not-ignored`
//     (the reconciled set, one owner — L35). A git-ignored file is outside it; a deleted tracked file reads as absent.
//     Every entry is lstat'ed and read through O_NOFOLLOW (L54, L59): a link is followed only by the core's resolver,
//     inside the root.
//   • BASE — the base commit's own objects (`git ls-tree -r -z`, `git cat-file blob`), read with
//     `--no-replace-objects` so a `git replace` ref cannot substitute a different base content or threshold.
//
// THE BASE (GATE 1 decision D1). `--base <ref>` names it (a commit, resolved with `git rev-parse --verify`). The gate
// passes `--base-rule` instead, which applies the non-interactive branches of /pharn-regress's BASE_RULE
// (`stage-regress-core.mjs` `resolveBaseSource`, the one owner of the decision): a dirty working tree (any porcelain
// path outside `.pharn/`) → HEAD; else `git merge-base HEAD origin/main`; else INCONCLUSIVE `base-unresolved`, because
// a gate cannot ask. Inside /pharn-ship and /pharn-loop the build is uncommitted at verify, so the tree is dirty and the
// base is the commit those runs started from. BOUND (`instruction-growth-base-binding`): with a dirty tree only the
// UNCOMMITTED growth is measured, so growth committed before verify — by the build through Bash, by a person between
// stages, or in an earlier session — is not seen. A clean tree with no `origin/main` cannot be measured by the gate
// (INCONCLUSIVE); run the CLI with `--base`.
//
// THE THRESHOLD is `budget.instructionGrowthBytes` in pharn.config.json AT THE BASE COMMIT, never in the working tree,
// so a change cannot raise its own gate (lessons-learned L65). pharn.config.json is not write-protected, which is why the
// working-tree copy is never read. To allow a legitimately large convention, a person raises the key in its own commit
// on the base branch before the change. A key a later `pharn update` drops (not verifiable from this repository) falls
// back to the default — the strict direction.
//
// TRUST (P2): paths and file contents are untrusted DATA; git runs as an argument vector, never through a shell; a ref
// operand that starts with `-` is refused before git sees it.

import { execFileSync } from "node:child_process";
import { lstatSync, openSync, fstatSync, readFileSync, readlinkSync, closeSync, realpathSync, constants as fsConstants } from "node:fs";
import { basename, dirname, join } from "node:path";
import { enumerate } from "./reconcile-baseline.mjs";
import { isExcluded } from "./worktree-fingerprint.mjs";
import { resolveBaseSource } from "./stage-regress-core.mjs";
import {
  SCHEMA,
  EXIT,
  CONFIG_FILE,
  ROOT_FILES,
  AGENTS_FILES,
  PERSONAL_FILE,
  parseThreshold,
  computeSet,
  growth,
  reportBody,
  foldPath,
  shown,
} from "./instruction-files-core.mjs";

const USAGE =
  "usage: check-instruction-files.mjs --report | --growth (--base <ref> | --base-rule)   (run from the project root: the directory whose instruction files are measured)";
const SHA_RE = /^[0-9a-f]{40}$/;
/** A file larger than this is refused as unreadable rather than read whole (Claude Code itself skips files over 4 MiB). */
export const READ_MAX_BYTES = 64 * 1024 * 1024;
const GIT_MAX_BUFFER = 1 << 28;

class Refusal extends Error {
  constructor(reason_code, reason) {
    super(reason);
    this.reason_code = reason_code;
  }
}

function git(args, { cwd, buffer = false } = {}) {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: buffer ? "buffer" : "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: GIT_MAX_BUFFER,
    });
  } catch (e) {
    const err = e && e.stderr ? String(e.stderr).trim().split("\n")[0] : "";
    throw new Refusal(
      "git-failed",
      `git ${args
        .filter((a) => !a.startsWith("--no-replace"))
        .slice(0, 2)
        .join(" ")} failed${err ? `: ${err}` : ""}`
    );
  }
}

/** git that may fail without that being a refusal: `{ok, out}`. */
function gitMaybe(args, cwd) {
  try {
    return {
      ok: true,
      out: execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: GIT_MAX_BUFFER }),
    };
  } catch {
    return { ok: false, out: "" };
  }
}

/** ------------------------------------------------------------------------------------------------
 *  The HEAD tree over the working directory.
 *  ---------------------------------------------------------------------------------------------- */
/** An absolute path with its longest existing prefix resolved through realpath (so `/tmp/x` reads as `/private/tmp/x`
 *  on darwin); the input unchanged when no prefix resolves. Never throws. */
export function canonAbs(text) {
  const tail = [];
  let head = text;
  for (let i = 0; i < 256 && head.length > 1; i++) {
    try {
      return join(realpathSync(head), ...tail.slice().reverse());
    } catch {
      tail.push(basename(head));
      head = dirname(head);
    }
  }
  return text;
}

export function worktreeTree(root, rootAbs) {
  const en = enumerate(root);
  if (!en.ok) throw new Refusal("enumeration-failed", en.reason);
  const paths = en.paths;
  const listed = new Set(paths);
  const lstatOrNull = (p) => {
    try {
      return lstatSync(join(root, p));
    } catch (e) {
      if (e && e.code === "ENOENT") return null;
      throw new Refusal("unreadable", `cannot stat ${shown(p)}: ${e && e.code ? e.code : "error"}`);
    }
  };
  return {
    rootAbs,
    canon: canonAbs,
    listed,
    list: () => paths,
    kind(p) {
      if (!listed.has(p)) return null;
      const st = lstatOrNull(p);
      if (st === null) return null;
      if (st.isSymbolicLink()) return "link";
      if (st.isDirectory()) return "submodule"; // git lists a directory only as a gitlink
      return st.isFile() ? "file" : "other";
    },
    /** The submodule's checked-out commit when it is initialised, else the commit the index records. */
    submoduleId(p) {
      const h = gitMaybe(["rev-parse", "--verify", "--quiet", "HEAD^{commit}"], join(root, p));
      const head = h.out.trim();
      if (h.ok && SHA_RE.test(head) && gitMaybe(["rev-parse", "--show-prefix"], join(root, p)).out.trim() === "") return head;
      const idx = gitMaybe(["ls-files", "-s", "-z", "--", p], root).out.split("\0")[0] ?? "";
      return idx.split(" ")[1] ?? "unknown";
    },
    linkText(p) {
      try {
        return readlinkSync(join(root, p), "utf8");
      } catch (e) {
        throw new Refusal("unreadable", `cannot read the link ${shown(p)}: ${e && e.code ? e.code : "error"}`);
      }
    },
    read(p) {
      let fd;
      try {
        fd = openSync(join(root, p), fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
        const st = fstatSync(fd);
        if (!st.isFile()) throw new Error("not a regular file");
        if (st.size > READ_MAX_BYTES) throw new Error(`larger than ${READ_MAX_BYTES} bytes`);
        return readFileSync(fd);
      } catch (e) {
        throw new Refusal("unreadable", `cannot read ${shown(p)}: ${e && e.code ? e.code : e && e.message ? e.message : "error"}`);
      } finally {
        if (fd !== undefined) closeSync(fd);
      }
    },
  };
}

/** ------------------------------------------------------------------------------------------------
 *  The BASE tree over a commit's objects.
 *  ---------------------------------------------------------------------------------------------- */
/** `prefix` is the project root's path inside the repository (`git rev-parse --show-prefix`, "" at the top level): only
 *  entries under it are the project's, and they are keyed relative to it, as the HEAD tree's are. */
export function baseTree(root, sha, rootAbs, prefix = "") {
  const raw = git(["--no-replace-objects", "ls-tree", "-r", "-z", "--full-tree", sha], { cwd: root, buffer: true }).toString("utf8");
  const entries = new Map();
  for (const rec of raw.split("\0")) {
    if (!rec) continue;
    const tab = rec.indexOf("\t");
    const [mode, , oid] = rec.slice(0, tab).split(" ");
    const path = rec.slice(tab + 1);
    if (path.startsWith(prefix)) entries.set(path.slice(prefix.length), { mode, oid });
  }
  const paths = [...entries.keys()];
  const read = (p) => {
    const e = entries.get(p);
    const buf = git(["--no-replace-objects", "cat-file", "blob", e.oid], { cwd: root, buffer: true });
    if (buf.length > READ_MAX_BYTES)
      throw new Refusal("unreadable", `${shown(p)} at the base commit is larger than ${READ_MAX_BYTES} bytes`);
    return buf;
  };
  return {
    rootAbs,
    canon: canonAbs,
    list: () => paths,
    kind(p) {
      const e = entries.get(p);
      if (!e) return null;
      if (e.mode === "120000") return "link";
      if (e.mode === "160000") return "submodule";
      return e.mode === "100644" || e.mode === "100755" ? "file" : "other";
    },
    submoduleId: (p) => entries.get(p).oid,
    linkText: (p) => read(p).toString("utf8"),
    read,
  };
}

/** ------------------------------------------------------------------------------------------------
 *  The base commit: `{sha, source}`.
 *  ---------------------------------------------------------------------------------------------- */
/** Dirty = any porcelain path outside the project's `.pharn/` state root. Porcelain paths are repo-relative, so the
 *  project prefix is stripped before the state-root test. A rename or copy is dirty when EITHER of its two paths is
 *  outside the state root — as stage-regress.mjs reads the whole `old -> new` line (GATE 2 review). */
function porcelainDirty(root, prefix) {
  const out = git(["status", "--porcelain", "-z"], { cwd: root });
  const recs = out.split("\0");
  const counts = (p) => !isExcluded(p.startsWith(prefix) ? p.slice(prefix.length) : p, null);
  for (let i = 0; i < recs.length; i++) {
    const rec = recs[i];
    if (rec.length < 4) continue;
    const paths = [rec.slice(3)];
    if (/[RC]/.test(rec.slice(0, 2))) paths.push(recs[++i] ?? ""); // a rename/copy: the next record is its origin path
    if (paths.some(counts)) return true;
  }
  return false;
}

export function resolveBase(root, { ref = null, rule = false, prefix = "" }) {
  if (ref !== null) {
    const r = gitMaybe(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], root);
    const sha = r.out.trim();
    if (!r.ok || !SHA_RE.test(sha)) throw new Refusal("base-not-commit", `--base ${shown(ref)} does not resolve to a commit`);
    return { sha, source: "explicit" };
  }
  if (!rule) throw new Refusal("usage-error", USAGE);
  const workingTreeDirty = porcelainDirty(root, prefix);
  const mb = gitMaybe(["merge-base", "HEAD", "origin/main"], root);
  const hasMergeBase = mb.ok && SHA_RE.test(mb.out.trim());
  const source = resolveBaseSource({ workingTreeDirty, hasMergeBase });
  if (source.kind === "head") {
    const h = gitMaybe(["rev-parse", "--verify", "--quiet", "HEAD^{commit}"], root);
    if (!h.ok || !SHA_RE.test(h.out.trim()))
      throw new Refusal("base-unresolved", "the working tree is dirty but HEAD names no commit (an unborn branch?) — pass --base");
    return { sha: h.out.trim(), source: "head" };
  }
  if (source.kind === "merge-base") return { sha: mb.out.trim(), source: "merge-base" };
  throw new Refusal(
    "base-unresolved",
    "the working tree is clean and `git merge-base HEAD origin/main` found no commit — a gate cannot ask; run the CLI with --base <ref>"
  );
}

/** The threshold at the base commit. */
export function thresholdAt(base) {
  const k = base.kind(CONFIG_FILE);
  if (k === null) return parseThreshold(null);
  if (k !== "file")
    return { ok: false, reason_code: "threshold-malformed", reason: `${CONFIG_FILE} at the base commit is not a regular file` };
  return parseThreshold(base.read(CONFIG_FILE).toString("utf8"));
}

/** Root instruction files present on disk but outside the enumerated tree (git-ignored). */
function ignoredRootNotes(root, tree) {
  const out = [];
  for (const p of [...ROOT_FILES, ...AGENTS_FILES]) {
    if (tree.listed.has(p) || foldPath(tree, p) !== null) continue; // listed, or listed under another letter case
    try {
      lstatSync(join(root, p));
      out.push({ code: "git-ignored-not-counted", path: p });
    } catch {
      /* absent */
    }
  }
  return out;
}

function personalEntry(root) {
  let st;
  try {
    st = lstatSync(join(root, PERSONAL_FILE));
  } catch {
    return { personal: null, notes: [] };
  }
  if (!st.isFile()) return { personal: null, notes: [{ code: "personal-not-regular", path: PERSONAL_FILE }] };
  return { personal: { path: PERSONAL_FILE, bytes: st.size, counted_by_growth: false }, notes: [] };
}

/** ------------------------------------------------------------------------------------------------
 *  argv → `{code, doc}`. A Refusal becomes the inconclusive document; any other throw propagates (the entry reports it
 *  as `crashed`).
 *  ---------------------------------------------------------------------------------------------- */
function parseArgs(argv) {
  const a = { mode: null, ref: null, rule: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--report" || t === "--growth") {
      if (a.mode !== null) throw new Refusal("usage-error", USAGE);
      a.mode = t.slice(2);
    } else if (t === "--base-rule") {
      if (a.rule) throw new Refusal("usage-error", USAGE);
      a.rule = true;
    } else if (t === "--base") {
      const v = argv[++i];
      if (a.ref !== null || typeof v !== "string" || v.length === 0 || v.startsWith("-")) throw new Refusal("usage-error", USAGE);
      a.ref = v;
    } else throw new Refusal("usage-error", `unknown argument ${shown(t)} — ${USAGE}`);
  }
  if (a.mode === null) throw new Refusal("usage-error", USAGE);
  if (a.mode === "report" && (a.rule || a.ref !== null)) throw new Refusal("usage-error", USAGE);
  if (a.mode === "growth" && a.rule === (a.ref !== null)) throw new Refusal("usage-error", USAGE);
  return a;
}

/** The project root is the working directory — where /pharn-verify runs every gate — which may sit BELOW the git top
 *  level (a monorepo package; GATE 2 review). `prefix` is its path inside the repository ("" at the top level). */
function projectRoot(cwd) {
  const p = gitMaybe(["rev-parse", "--show-prefix"], cwd);
  if (!p.ok) throw new Refusal("git-failed", "not inside a git work tree");
  try {
    return { rootAbs: realpathSync(cwd), prefix: p.out.trim() };
  } catch {
    throw new Refusal("git-failed", "cannot resolve the working directory");
  }
}

export function evaluate(argv, cwd = process.cwd()) {
  let mode = null;
  try {
    const args = parseArgs(argv);
    mode = args.mode;
    const { rootAbs, prefix } = projectRoot(cwd);
    const head = worktreeTree(rootAbs, rootAbs);
    const headSet = computeSet(head);
    const extraNotes = ignoredRootNotes(rootAbs, head);
    if (mode === "report") {
      const p = personalEntry(rootAbs);
      const body = reportBody(headSet);
      body.notes = [...body.notes, ...extraNotes, ...p.notes];
      return { code: EXIT.ok, doc: { schema: SCHEMA, mode, verdict: "reported", ...body, personal: p.personal } };
    }
    const base = resolveBase(rootAbs, { ref: args.ref, rule: args.rule, prefix });
    const bt = baseTree(rootAbs, base.sha, rootAbs, prefix);
    const th = thresholdAt(bt);
    if (!th.ok) throw new Refusal(th.reason_code, th.reason);
    const g = growth(computeSet(bt), headSet);
    if (g.unmeasured.length > 0) {
      throw new Refusal(
        "submodule-changed",
        `a submodule the instruction set reaches moved since the base (${g.unmeasured.map(shown).join(", ")}); its content is not read, so the growth there is unmeasured`
      );
    }
    const over = g.added_bytes > th.value;
    return {
      code: over ? EXIT.over : EXIT.ok,
      doc: {
        schema: SCHEMA,
        mode,
        verdict: over ? "over" : "within",
        base: base.sha,
        base_source: base.source,
        threshold: th.value,
        threshold_source: th.source,
        added_bytes: g.added_bytes,
        files: g.files,
        notes: [...headSet.notes, ...extraNotes],
      },
    };
  } catch (e) {
    if (!(e instanceof Refusal)) throw e;
    return {
      code: EXIT.inconclusive,
      doc: { schema: SCHEMA, mode, verdict: "inconclusive", reason_code: e.reason_code, reason: e.message },
    };
  }
}
