import { randomUUID } from "node:crypto";
import { record } from "./audit.js";
import { requireAdmin } from "./auth.js";
import { formatMinor, MoneyError, parseMinor, sumMinor } from "./money.js";

export class DomainError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export const STATUSES = ["open", "paid", "void"];

/** The caller's invoice, or 404. The org comes from the principal, so another org's invoice is indistinguishable. */
export function findInvoice(doc, orgId, id) {
  const invoice = doc.invoices.find((inv) => inv.id === id && inv.orgId === orgId);
  if (!invoice) throw new DomainError(404, "not_found");
  return invoice;
}

function amountOf(text) {
  try {
    return parseMinor(text);
  } catch (err) {
    if (err instanceof MoneyError) throw new DomainError(422, err.code);
    throw err;
  }
}

export function createInvoice(doc, principal, body, now = new Date()) {
  const totalMinor = amountOf(body?.amount);
  if (totalMinor === 0) throw new DomainError(422, "amount_invalid");
  const customer = typeof body?.customer === "string" ? body.customer.trim() : "";
  if (customer === "" || customer.length > 200) throw new DomainError(422, "customer_invalid");
  const invoice = {
    id: randomUUID(),
    orgId: principal.orgId,
    customer,
    totalMinor,
    status: "open",
    payments: [],
    createdAt: now.toISOString(),
    paidAt: null,
  };
  doc.invoices.push(invoice);
  record(doc, { orgId: principal.orgId, actor: principal.keyId, action: "invoice.created", target: invoice.id }, now);
  return invoice;
}

/** Payment is always for the full total; a partial payment is not supported. */
export function payInvoice(doc, principal, id, body, now = new Date()) {
  const invoice = findInvoice(doc, principal.orgId, id);
  if (invoice.status !== "open") throw new DomainError(409, "invoice_not_open");
  const reference = typeof body?.reference === "string" ? body.reference.trim().slice(0, 100) : "";
  invoice.payments.push({ id: randomUUID(), amountMinor: invoice.totalMinor, reference, at: now.toISOString() });
  invoice.status = "paid";
  invoice.paidAt = now.toISOString();
  record(doc, { orgId: principal.orgId, actor: principal.keyId, action: "invoice.paid", target: invoice.id }, now);
  return invoice;
}

export function voidInvoice(doc, principal, id, now = new Date()) {
  requireAdmin(principal);
  const invoice = findInvoice(doc, principal.orgId, id);
  if (invoice.status !== "open") throw new DomainError(409, "invoice_not_open");
  invoice.status = "void";
  record(doc, { orgId: principal.orgId, actor: principal.keyId, action: "invoice.voided", target: invoice.id }, now);
  return invoice;
}

export function listInvoices(doc, principal) {
  return doc.invoices
    .filter((inv) => inv.orgId === principal.orgId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(present);
}

/** The API view of an invoice: amounts as decimal strings, no internal fields. */
export function present(invoice) {
  return {
    id: invoice.id,
    customer: invoice.customer,
    total: formatMinor(invoice.totalMinor),
    paid: formatMinor(sumMinor(invoice.payments.map((p) => p.amountMinor))),
    status: invoice.status,
    createdAt: invoice.createdAt,
    paidAt: invoice.paidAt,
  };
}
