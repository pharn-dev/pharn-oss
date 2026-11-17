// The audit log is append-only. Every state change records who did it (the acting key) and what it touched.

export function record(doc, { orgId, actor, action, target, details = {} }, now = new Date()) {
  doc.audit.push({ at: now.toISOString(), orgId, actor, action, target, details });
}

export function listForOrg(doc, orgId, { limit = 100 } = {}) {
  return doc.audit
    .filter((entry) => entry.orgId === orgId)
    .slice(-limit)
    .reverse();
}
