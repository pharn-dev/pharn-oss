import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRegressBase } from "./regress-base-core.mjs";
import { gitSync } from "./stage-runtime.mjs";
import { SHA_RE } from "./gate-run-core.mjs";

test("resolveRegressBase: explicit ref resolves via git argv, not shell", () => {
  const head = gitSync(["rev-parse", "HEAD"]);
  assert.ok(head.ok);
  const sha = head.stdout.trim();
  assert.ok(SHA_RE.test(sha));
  const r = resolveRegressBase({ explicitRef: "HEAD" });
  assert.equal(r.ok, true);
  assert.equal(r.sha, sha);
});

test("resolveRegressBase: garbage ref is base-not-commit", () => {
  const r = resolveRegressBase({ explicitRef: "not-a-ref-$(touch x)" });
  assert.equal(r.ok, false);
  assert.equal(r.reason_code, "base-not-commit");
});
