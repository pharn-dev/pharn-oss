import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate, SCHEMA_VERSION, Store } from "../src/store.js";

function tempPath() {
  const dir = mkdtempSync(join(tmpdir(), "tally-store-"));
  return { path: join(dir, "ledger.json"), cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test("a missing file loads as an empty document at the current version", async () => {
  const { path, cleanup } = tempPath();
  const store = await new Store(path).load();
  assert.equal(store.read().schemaVersion, SCHEMA_VERSION);
  assert.deepEqual(store.read().invoices, []);
  cleanup();
});

test("a version-1 file is migrated on load: invoices gain payments, the document gains an audit log", async () => {
  const { path, cleanup } = tempPath();
  const v1 = { schemaVersion: 1, orgs: [], keys: [], invoices: [{ id: "i1", orgId: "o", totalMinor: 100, status: "open" }] };
  writeFileSync(path, JSON.stringify(v1));
  const doc = (await new Store(path).load()).read();
  assert.equal(doc.schemaVersion, 2);
  assert.deepEqual(doc.invoices[0].payments, []);
  assert.deepEqual(doc.audit, []);
  cleanup();
});

test("a file from a newer release is refused, not guessed at", () => {
  assert.throws(() => migrate({ schemaVersion: SCHEMA_VERSION + 1 }), /unsupported schema version/);
});

test("transact writes the new document, and a throwing change leaves the store unchanged", async () => {
  const { path, cleanup } = tempPath();
  const store = await new Store(path).load();
  await store.transact((doc) => doc.orgs.push({ id: "o1" }));
  assert.equal(JSON.parse(readFileSync(path, "utf8")).orgs.length, 1);
  await assert.rejects(
    store.transact((doc) => {
      doc.orgs.push({ id: "o2" });
      throw new Error("boom");
    }),
    /boom/
  );
  assert.equal(store.read().orgs.length, 1);
  assert.equal(JSON.parse(readFileSync(path, "utf8")).orgs.length, 1);
  cleanup();
});

test("concurrent transactions are serialized", async () => {
  const { path, cleanup } = tempPath();
  const store = await new Store(path).load();
  await Promise.all(Array.from({ length: 20 }, (_, i) => store.transact((doc) => doc.orgs.push({ id: `o${i}` }))));
  assert.equal(store.read().orgs.length, 20);
  cleanup();
});
