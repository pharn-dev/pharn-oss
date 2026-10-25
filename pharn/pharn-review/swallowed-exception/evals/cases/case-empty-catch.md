---
trust: untrusted
purpose: "Eval fixture (SWALLOWED-EXCEPTION): CODE with an empty catch block that silently swallows a failed write. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — empty-catch (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner detects the empty-catch shape from the text.

```js
// upload.mjs — persist an uploaded file
export async function saveUpload(store, file) {
  try {
    await store.put(file.key, file.body);
  } catch (e) {}
}
```

The catch block above is empty: a failed `store.put(...)` is swallowed with no rethrow, no recovery,
and no log. (Whether swallowing is acceptable here — e.g. a truly best-effort write — is advisory; the
empty-catch **shape** is what the scanner detects.)
