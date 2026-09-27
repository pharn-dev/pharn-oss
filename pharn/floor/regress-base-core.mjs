// pharn/floor/regress-base-core.mjs — resolve the regress/quick base commit by BASE_RULE (6.28.5, LOW L1).
// ONE owner for the git work `/pharn-regress`'s `base` phase and `/pharn-ship --quick` item 7 share: explicit
// ref wins; else a dirty tree → HEAD; else merge-base HEAD origin/main; else ask. Refs reach git ONLY through
// `gitSync` argv arrays — never through shell interpolation in command prose.

import { gitSync } from "./stage-runtime.mjs";
import { resolveBaseSource } from "./stage-regress-core.mjs";
import { isExcluded } from "./worktree-fingerprint.mjs";
import { SHA_RE } from "./gate-run-core.mjs";

function porcelainPath(line) {
  return line.slice(3).trim();
}

/**
 * @param {{ explicitRef?: string | null }} opts
 * @returns {{ ok: true, sha: string } | { ok: false, reason_code: "base-not-commit" | "base-unresolved" | "git-failed", reason: string }}
 */
export function resolveRegressBase({ explicitRef = null } = {}) {
  if (explicitRef !== null && explicitRef !== "") {
    const r = gitSync(["rev-parse", "--verify", "--quiet", `${explicitRef}^{commit}`]);
    const sha = r.ok ? r.stdout.trim() : "";
    if (!r.ok || !SHA_RE.test(sha)) {
      return {
        ok: false,
        reason_code: "base-not-commit",
        reason: `--from-ref ${JSON.stringify(explicitRef)} does not resolve to a commit in this repository`,
      };
    }
    return { ok: true, sha };
  }

  const porcelain = gitSync(["status", "--porcelain"]);
  if (!porcelain.ok) {
    return { ok: false, reason_code: "git-failed", reason: `git status failed: ${porcelain.detail}` };
  }
  const workingTreeDirty = porcelain.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .some((line) => !isExcluded(porcelainPath(line), null));

  const mb = gitSync(["merge-base", "HEAD", "origin/main"]);
  const hasMergeBase = mb.ok && SHA_RE.test(mb.stdout.trim());
  const source = resolveBaseSource({ workingTreeDirty, hasMergeBase });

  if (source.kind === "head") {
    const head = gitSync(["rev-parse", "HEAD"]);
    const sha = head.ok ? head.stdout.trim() : "";
    if (!head.ok || !SHA_RE.test(sha)) {
      return {
        ok: false,
        reason_code: "git-failed",
        reason: "git rev-parse HEAD failed" + (head.ok ? "" : `: ${head.detail}`),
      };
    }
    return { ok: true, sha };
  }
  if (source.kind === "merge-base") return { ok: true, sha: mb.stdout.trim() };
  return {
    ok: false,
    reason_code: "base-unresolved",
    reason: "working tree is clean and git merge-base HEAD origin/main is unavailable — supply --from-ref",
  };
}
