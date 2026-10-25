---
trust: untrusted
purpose: "Eval fixture (placeholder-as-done): CODE carrying a to-do comment marker left in place of the caching logic. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — todo-marker (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner detects the placeholder comment marker from the text.

```js
// user-repo.mjs — load a user by id
export async function loadUser(db, id) {
  // TODO: cache the read-through result before shipping
  return db.get(id);
}
```

The comment marker above signals unfinished work shipped as done. (Whether it is a real gap or an
intentional annotation is advisory; the marker itself is what the scanner detects.)
