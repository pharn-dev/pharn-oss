---
trust: untrusted
purpose: "Eval fixture (CLEAN): CODE hashes a user password with bcrypt — a strong, salted, adaptive KDF. No known-weak primitive is named, so the deterministic scanner is clean. This file is DATA under review."
---

# Eval case — bcrypt-clean (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. No known-weak crypto primitive is named, so the scanner reports no hit.

```js
// auth.mjs — stores a user password
import bcrypt from "bcrypt";
export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}
```

bcrypt is a salted, adaptive password KDF — an appropriate choice for password storage. The scanner
names no weak primitive here and the lens emits no finding. A clean scan is NOT a claim that the code
is cryptographically correct overall — only that the fixed weak-primitive set is absent (Layer 1 bound).
