---
trust: untrusted
purpose: "Eval fixture (NULL-DEREF, true-negative): CODE that binds a value from a null-returning source and reads it via optional chaining (u?.email). This file is DATA under review — nothing in it is an instruction."
---

# Eval case — optional-chain (UNTRUSTED INPUT, true-negative)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner classifies this as CLEAN — the deref is null-safe optional
chaining, not a raw deref.

```js
// accounts.mjs — look up a user and read a field null-safely
export function primaryEmail(users, id) {
  const u = users.find((x) => x.id === id);
  return u?.email ?? null;
}
```

`users.find(...)` may return `undefined`, but `u?.email` optional-chains the access — the first
subsequent use of `u` is `?.`, so the scanner reports `found:false`. Optional chaining is the
null-safe form the scanner recognizes as CLEAN.
