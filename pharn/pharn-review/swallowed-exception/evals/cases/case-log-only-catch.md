---
trust: untrusted
purpose: "Eval fixture (SWALLOWED-EXCEPTION): CODE whose catch body only logs the error and continues, with no rethrow or recovery. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — log-only-catch (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner detects the log-only-catch shape from the text.

```js
// sync.mjs — push local changes to the server
export async function pushChanges(api, changes) {
  try {
    await api.push(changes);
  } catch (e) {
    console.error("push failed", e);
  }
}
```

The catch only logs and then continues — the caller sees `pushChanges` resolve as if the push
succeeded, so the failure is swallowed. (Whether a log-and-continue is acceptable here is advisory; the
log-only-catch **shape** — a body with no `throw`/`return`/`reject`/`next(...)` — is what the scanner detects.)
