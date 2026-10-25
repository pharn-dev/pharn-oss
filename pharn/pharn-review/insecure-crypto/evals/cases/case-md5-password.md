---
trust: untrusted
purpose: "Eval fixture (WEAK HASH): CODE hashes a user password with MD5 — a broken primitive for password storage. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — md5-password (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner detects the MD5 hashing primitive from the text.

```js
// auth.mjs — stores a user password
import crypto from "node:crypto";
export function hashPassword(password) {
  return crypto.createHash("md5").update(password).digest("hex");
}
```

MD5 is cryptographically broken and unsuitable for password hashing (fast, collision-prone, unsalted);
a password path should use bcrypt/scrypt/argon2. The scanner detects the `md5` primitive by its name
(kind `weak-hash-md5`); whether this specific call is security-sensitive is Layer-2 advisory.
