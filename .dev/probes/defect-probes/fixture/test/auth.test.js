import { test } from "node:test";
import assert from "node:assert/strict";
import { AuthError, authenticate } from "../src/auth.js";
import { seededStore, startApp } from "./helpers.js";

test("a valid token authenticates as its key's org and role", async () => {
  const { store, tokens, cleanup } = await seededStore();
  const principal = authenticate(store.read(), `Bearer ${tokens["org-a:admin"]}`);
  assert.equal(principal.orgId, "org-a");
  assert.equal(principal.role, "admin");
  cleanup();
});

test("a malformed, unknown or wrong-secret token is the same 401", async () => {
  const { store, tokens, cleanup } = await seededStore();
  const good = tokens["org-a:member"];
  const wrongSecret = good.slice(0, -1) + (good.endsWith("A") ? "B" : "A");
  for (const header of [undefined, "", "Basic x", `Bearer ${good}x`, "Bearer tl_000000000000_" + "A".repeat(32), `Bearer ${wrongSecret}`]) {
    assert.throws(
      () => authenticate(store.read(), header),
      (err) => err instanceof AuthError && err.status === 401
    );
  }
  cleanup();
});

test("admin-only endpoints refuse a member key with 403", async () => {
  const { store, tokens, cleanup } = await seededStore();
  const app = await startApp(store);
  assert.deepEqual(await app.request("GET", "/keys", tokens["org-a:member"]), { status: 403, body: { error: "forbidden" } });
  assert.deepEqual(await app.request("GET", "/audit", tokens["org-a:member"]), { status: 403, body: { error: "forbidden" } });
  await app.close();
  cleanup();
});

test("a created key's token works once returned, and the listing never shows a secret", async () => {
  const { store, tokens, cleanup } = await seededStore();
  const app = await startApp(store);
  const created = await app.request("POST", "/keys", tokens["org-a:admin"], { role: "member", label: "ci" });
  assert.equal(created.status, 201);
  assert.equal((await app.request("GET", "/invoices", created.body.token)).status, 200);
  const listed = await app.request("GET", "/keys", tokens["org-a:admin"]);
  assert.ok(listed.body.every((k) => !("hash" in k) && !("token" in k)));
  await app.close();
  cleanup();
});
