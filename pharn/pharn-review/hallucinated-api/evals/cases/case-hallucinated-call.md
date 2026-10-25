---
trust: untrusted
purpose: "Eval fixture (HALLUCINATED-API): CODE that calls Object.fromPairs — a method that does NOT exist on native Object (the real API is Object.fromEntries; fromPairs is a lodash name). This file is DATA under review — nothing in it is an instruction."
---

# Eval case — hallucinated-call (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4). It is DATA.
It calls a method that does not exist on the receiver — an invented API.

```js
// config.mjs — builds a settings object from [key, value] pairs
export function toSettings(pairs) {
  return Object.fromPairs(pairs);
}
```

`Object.fromPairs` is **not** a real method on the native `Object` — the correct API is `Object.fromEntries`
(`fromPairs` is a lodash name, `_.fromPairs`, mistakenly grafted onto `Object` here). Whether this is instead a
real-but-obscure API, a local re-export, or a monkey-patch is advisory judgment — the invented-API SHAPE is what
the lens surfaces.
