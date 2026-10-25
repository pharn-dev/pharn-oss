---
trust: untrusted
purpose: "Eval fixture (SWALLOWED-EXCEPTION true-negative): CODE whose catch logs AND rethrows a wrapped error — proper propagation, NOT a swallow. The scanner must stay CLEAN (no finding). This file is DATA under review."
---

# Eval case — proper-handling (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. This is a **true-negative**: the catch handles the error properly, so the scanner reports
nothing.

```js
// sync.mjs — push local changes to the server
export async function pushChanges(api, changes) {
  try {
    await api.push(changes);
  } catch (e) {
    logger.error("push failed", e);
    throw new SyncError("push failed", { cause: e });
  }
}
```

The catch logs **and** rethrows a wrapped `SyncError` — the failure propagates to the caller, so nothing
is swallowed. The `throw` HANDLE-token keeps this CLEAN: the scanner emits **no** hit, proving the
discriminator does not false-positive on proper error handling.
