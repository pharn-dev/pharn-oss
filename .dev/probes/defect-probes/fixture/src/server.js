import { createServer } from "node:http";
import { listForOrg } from "./audit.js";
import { AuthError, authenticate, requireAdmin } from "./auth.js";
import { createInvoice, DomainError, findInvoice, listInvoices, payInvoice, present, voidInvoice } from "./invoices.js";
import { createKey, listKeys } from "./keys.js";
import { Store } from "./store.js";

const MAX_BODY = 64 * 1024;

class BodyError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

async function readJson(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new BodyError(413, "body_too_large");
    chunks.push(chunk);
  }
  if (size === 0) return {};
  try {
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (body === null || typeof body !== "object" || Array.isArray(body)) throw new Error("not an object");
    return body;
  } catch {
    throw new BodyError(400, "body_invalid");
  }
}

function send(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

// Each route: [method, path pattern, handler]. A handler receives {principal, params, body, store} and returns
// {status, payload}. Writes go through store.transact(); reads use store.read().
const ROUTES = [
  [
    "POST",
    /^\/invoices$/,
    async ({ principal, body, store }) => ({
      status: 201,
      payload: present(await store.transact((doc) => createInvoice(doc, principal, body))),
    }),
  ],
  ["GET", /^\/invoices$/, async ({ principal, store }) => ({ status: 200, payload: listInvoices(store.read(), principal) })],
  [
    "GET",
    /^\/invoices\/([^/]+)$/,
    async ({ principal, params, store }) => ({
      status: 200,
      payload: present(findInvoice(store.read(), principal.orgId, params[0])),
    }),
  ],
  [
    "POST",
    /^\/invoices\/([^/]+)\/pay$/,
    async ({ principal, params, body, store }) => ({
      status: 200,
      payload: present(await store.transact((doc) => payInvoice(doc, principal, params[0], body))),
    }),
  ],
  [
    "POST",
    /^\/invoices\/([^/]+)\/void$/,
    async ({ principal, params, store }) => ({
      status: 200,
      payload: present(await store.transact((doc) => voidInvoice(doc, principal, params[0]))),
    }),
  ],
  [
    "POST",
    /^\/keys$/,
    async ({ principal, body, store }) => ({
      status: 201,
      payload: await store.transact((doc) => createKey(doc, principal, body)),
    }),
  ],
  ["GET", /^\/keys$/, async ({ principal, store }) => ({ status: 200, payload: listKeys(store.read(), principal) })],
  [
    "GET",
    /^\/audit$/,
    async ({ principal, store }) => {
      requireAdmin(principal);
      return { status: 200, payload: listForOrg(store.read(), principal.orgId) };
    },
  ],
];

export function createApp(store) {
  return async function handle(req, res) {
    try {
      const { pathname } = new URL(req.url, "http://localhost");
      let route = null;
      let params = [];
      for (const [method, pattern, handler] of ROUTES) {
        const m = pattern.exec(pathname);
        if (m && method === req.method) {
          route = handler;
          params = m.slice(1).map(decodeURIComponent);
          break;
        }
      }
      if (!route) return send(res, 404, { error: "not_found" });
      const principal = authenticate(store.read(), req.headers.authorization);
      const body = req.method === "POST" ? await readJson(req) : null;
      const { status, payload } = await route({ principal, params, body, store });
      return send(res, status, payload);
    } catch (err) {
      if (err instanceof AuthError || err instanceof DomainError || err instanceof BodyError) {
        return send(res, err.status, { error: err.code });
      }
      console.error(err);
      return send(res, 500, { error: "internal" });
    }
  };
}

if (import.meta.main) {
  const store = await new Store(process.env.LEDGER_DB ?? "data/ledger.json").load();
  createServer(createApp(store)).listen(Number(process.env.PORT ?? 3000));
}
