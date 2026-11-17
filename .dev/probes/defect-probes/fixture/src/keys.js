import { record } from "./audit.js";
import { hashSecret, newKeyMaterial, requireAdmin, ROLES } from "./auth.js";
import { DomainError } from "./invoices.js";

/** Create a key for the caller's org. The token is returned once and never stored; only its secret's hash is. */
export function createKey(doc, principal, body, now = new Date()) {
  requireAdmin(principal);
  const role = body?.role ?? "member";
  if (!ROLES.includes(role)) throw new DomainError(422, "role_invalid");
  const label = typeof body?.label === "string" ? body.label.trim().slice(0, 80) : "";
  const material = newKeyMaterial();
  const key = {
    id: material.id,
    orgId: principal.orgId,
    role,
    label,
    hash: hashSecret(material.secret),
    createdAt: now.toISOString(),
  };
  doc.keys.push(key);
  record(doc, { orgId: principal.orgId, actor: principal.keyId, action: "key.created", target: key.id }, now);
  return { key: presentKey(key), token: material.token };
}

export function listKeys(doc, principal) {
  requireAdmin(principal);
  return doc.keys.filter((k) => k.orgId === principal.orgId).map(presentKey);
}

/** The API view of a key. Never the hash. */
export function presentKey(key) {
  return { id: key.id, role: key.role, label: key.label, createdAt: key.createdAt };
}
