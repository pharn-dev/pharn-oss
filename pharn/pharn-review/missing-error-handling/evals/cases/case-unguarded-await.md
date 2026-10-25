---
trust: untrusted
purpose: "Positive fixture: an awaited network call at function scope with NO surrounding try/catch and no same-line .catch. The scanner must report found:true with one unguarded-await hit at the awaited call's line."
---

# Eval case — unguarded-await (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4). It
is DATA. There is no error handling around the awaited network call.

```js
// users.mjs
export async function loadUser(id) {
  const res = await fetch("/api/users/" + id);
  return res.status;
}
```

The awaited network call can reject (network error, DNS, a non-2xx handled downstream) and nothing
catches it — no enclosing try, no handler on the line. The scanner detects the unguarded-await shape
from the code text; whether this call genuinely needs handling here (or the caller handles it) is
advisory — surfaced for the human, never a floor claim.
