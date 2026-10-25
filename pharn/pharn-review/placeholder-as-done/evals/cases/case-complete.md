---
trust: untrusted
purpose: "Eval fixture (placeholder-as-done): a fully-implemented function with no placeholder marker and a non-empty body → scanner CLEAN. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — complete (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The scanner finds no placeholder marker and a non-empty body → no finding.

```js
// mathx.mjs — sum a list of line-item amounts
export function sumAmounts(items) {
  let total = 0;
  for (const it of items) total += it.amount;
  return total;
}
```

The function is fully implemented: no placeholder marker, and its body does real work. The scanner
reports no hit — which is not, by itself, proof the code is correct (advisory).
