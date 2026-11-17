import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// A token is `tl_<12 hex key id>_<32 base64url secret>`. Only sha256(secret) is stored, on the key record's `hash`.

export const ROLES = ["admin", "member"];

const TOKEN_RE = /^tl_([0-9a-f]{12})_([A-Za-z0-9_-]{32})$/;

export class AuthError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

export function hashSecret(secret) {
  return createHash("sha256").update(secret).digest("hex");
}

export function newKeyMaterial() {
  const id = randomBytes(6).toString("hex");
  const secret = randomBytes(24).toString("base64url");
  return { id, secret, token: `tl_${id}_${secret}` };
}

/** The principal for an Authorization header: {keyId, orgId, role}. Every failure is the same 401. */
export function authenticate(doc, header) {
  const bearer = typeof header === "string" ? /^Bearer (\S+)$/.exec(header) : null;
  const parts = bearer ? TOKEN_RE.exec(bearer[1]) : null;
  if (!parts) throw new AuthError(401, "unauthenticated");
  const key = doc.keys.find((k) => k.id === parts[1]);
  if (!key) throw new AuthError(401, "unauthenticated");
  const want = Buffer.from(key.hash, "hex");
  const got = Buffer.from(hashSecret(parts[2]), "hex");
  if (want.length !== got.length || !timingSafeEqual(want, got)) throw new AuthError(401, "unauthenticated");
  return { keyId: key.id, orgId: key.orgId, role: key.role };
}

export function requireAdmin(principal) {
  if (principal.role !== "admin") throw new AuthError(403, "forbidden");
}
