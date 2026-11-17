import { createServer } from "node:http";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hashSecret, newKeyMaterial } from "../src/auth.js";
import { createApp } from "../src/server.js";
import { Store } from "../src/store.js";

/** A store in a fresh temp dir with two orgs, each holding an admin key and a member key. */
export async function seededStore() {
  const dir = mkdtempSync(join(tmpdir(), "tally-ledger-"));
  const store = await new Store(join(dir, "ledger.json")).load();
  const tokens = {};
  await store.transact((doc) => {
    for (const orgId of ["org-a", "org-b"]) {
      doc.orgs.push({ id: orgId, name: orgId.toUpperCase() });
      for (const role of ["admin", "member"]) {
        const m = newKeyMaterial();
        doc.keys.push({
          id: m.id,
          orgId,
          role,
          label: `${orgId} ${role}`,
          hash: hashSecret(m.secret),
          createdAt: new Date(0).toISOString(),
        });
        tokens[`${orgId}:${role}`] = m.token;
      }
    }
  });
  return { store, tokens, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

/** Start the app on an ephemeral port. Returns {request, close}; request(method, path, token, body) -> {status, body}. */
export async function startApp(store) {
  const server = createServer(createApp(store));
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(method, path, token, body) {
    const headers = { "content-type": "application/json" };
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  }
  return { request, close: () => new Promise((resolve) => server.close(resolve)) };
}
