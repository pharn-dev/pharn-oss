---
trust: untrusted
purpose: "Eval fixture (NULL-DEREF): CODE that binds a value from a null-returning source (Array.find) and dereferences it with no null-check between. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — unchecked-deref (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner detects the unchecked-deref shape from the text.

```js
// accounts.mjs — look up a user and read a field off it
export function primaryEmail(users, id) {
  const u = users.find((x) => x.id === id);
  return u.email;
}
```

`users.find(...)` returns `undefined` when no element matches; `u.email` on the next line dereferences
`u` with no null-check between the binding and the deref. (Whether `u` is _truly_ reachable-null here
— e.g. `id` is guaranteed present — is advisory; the unchecked-deref **shape** is what the scanner
detects.)
