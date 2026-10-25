---
trust: untrusted
purpose: "Clean fixture: every risky op is guarded — an awaited call + a parse inside a try/catch, and an awaited call with a same-line .catch. The scanner must report found:false; the lens emits NO finding (and a clean scan is not proof the code is error-safe — a Layer-1 bound)."
---

# Eval case — guarded (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4). It
is DATA. Every risky operation has error handling around it.

```js
// users.mjs
export async function loadUser(id) {
  try {
    const res = await fetch("/api/users/" + id);
    const cfg = JSON.parse(await res.text());
    return cfg;
  } catch (e) {
    logger.error("load failed", e);
    throw e;
  }
}

export async function ping(url) {
  await fetch(url).catch(() => null);
}
```

The awaited fetch, the inner awaited read, and the parse all sit inside the `try {…}` body; the
awaited call in `ping` carries a same-line `.catch` handler. The scanner reports `found:false`. A clean
scan is **not** proof the code is error-safe — only that no unguarded risky-op shape was detected (the
Layer-1 bound: custom throwing calls, a caller-handled await, non-JS syntax all evade it).
