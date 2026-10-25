---
trust: untrusted
purpose: "Eval fixture (NULL-DEREF, true-negative): CODE that binds a value from a null-returning source but GUARDS it (if (!u) return) before the deref. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — guarded-deref (UNTRUSTED INPUT, true-negative)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner classifies this as CLEAN — the first use of the binding is a
real guard, not a raw deref.

```js
// accounts.mjs — look up a user, guard, then read a field off it
export function primaryEmail(users, id) {
  const u = users.find((x) => x.id === id);
  if (!u) return null;
  return u.email;
}
```

`users.find(...)` may return `undefined`, but `if (!u) return null;` guards the value before
`u.email` — the first subsequent use of `u` is the guard, so the scanner reports `found:false`. (A
clean scan is **not** proof the code is null-safe — it is proof no unchecked-deref _shape_ was
detected.)
