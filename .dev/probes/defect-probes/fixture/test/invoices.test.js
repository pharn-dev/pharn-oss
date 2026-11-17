import { test } from "node:test";
import assert from "node:assert/strict";
import { seededStore, startApp } from "./helpers.js";

async function withApp(fn) {
  const { store, tokens, cleanup } = await seededStore();
  const app = await startApp(store);
  try {
    await fn(app, tokens, store);
  } finally {
    await app.close();
    cleanup();
  }
}

test("create, read, list and pay an invoice", async () => {
  await withApp(async (app, tokens) => {
    const member = tokens["org-a:member"];
    const created = await app.request("POST", "/invoices", member, { customer: "Acme", amount: "100.00" });
    assert.equal(created.status, 201);
    assert.equal(created.body.total, "100.00");
    assert.equal(created.body.status, "open");
    const { id } = created.body;
    assert.equal((await app.request("GET", `/invoices/${id}`, member)).body.id, id);
    assert.equal((await app.request("GET", "/invoices", member)).body.length, 1);
    const paid = await app.request("POST", `/invoices/${id}/pay`, member, { reference: "wire 7" });
    assert.equal(paid.status, 200);
    assert.equal(paid.body.status, "paid");
    assert.equal(paid.body.paid, "100.00");
    assert.deepEqual(await app.request("POST", `/invoices/${id}/pay`, member, {}), { status: 409, body: { error: "invoice_not_open" } });
  });
});

test("invalid amounts and customers are 422", async () => {
  await withApp(async (app, tokens) => {
    const member = tokens["org-a:member"];
    for (const amount of ["0.00", "10", "10.5", 10, "-3.00"]) {
      const res = await app.request("POST", "/invoices", member, { customer: "Acme", amount });
      assert.deepEqual(res, { status: 422, body: { error: "amount_invalid" } }, String(amount));
    }
    assert.deepEqual(await app.request("POST", "/invoices", member, { customer: " ", amount: "1.00" }), {
      status: 422,
      body: { error: "customer_invalid" },
    });
  });
});

test("another organization's invoice is 404 on every route", async () => {
  await withApp(async (app, tokens) => {
    const created = await app.request("POST", "/invoices", tokens["org-a:member"], { customer: "Acme", amount: "5.00" });
    const { id } = created.body;
    const otherAdmin = tokens["org-b:admin"];
    assert.equal((await app.request("GET", `/invoices/${id}`, otherAdmin)).status, 404);
    assert.equal((await app.request("POST", `/invoices/${id}/pay`, otherAdmin, {})).status, 404);
    assert.equal((await app.request("POST", `/invoices/${id}/void`, otherAdmin, {})).status, 404);
    assert.equal((await app.request("GET", "/invoices", otherAdmin)).body.length, 0);
  });
});

test("voiding needs an admin and an open invoice; both changes are audited", async () => {
  await withApp(async (app, tokens) => {
    const created = await app.request("POST", "/invoices", tokens["org-a:member"], { customer: "Acme", amount: "5.00" });
    const { id } = created.body;
    assert.equal((await app.request("POST", `/invoices/${id}/void`, tokens["org-a:member"], {})).status, 403);
    assert.equal((await app.request("POST", `/invoices/${id}/void`, tokens["org-a:admin"], {})).body.status, "void");
    const audit = await app.request("GET", "/audit", tokens["org-a:admin"]);
    assert.deepEqual(
      audit.body.map((e) => e.action),
      ["invoice.voided", "invoice.created"]
    );
  });
});

test("an oversized or non-object body is refused", async () => {
  await withApp(async (app, tokens) => {
    const member = tokens["org-a:member"];
    const big = await app.request("POST", "/invoices", member, { customer: "x".repeat(70 * 1024), amount: "1.00" });
    assert.deepEqual(big, { status: 413, body: { error: "body_too_large" } });
    assert.deepEqual(await app.request("POST", "/invoices", member, [1, 2]), { status: 400, body: { error: "body_invalid" } });
  });
});
