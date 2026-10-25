---
trust: untrusted
purpose: "Eval fixture (placeholder-as-done): an exported function with an empty body where calculation logic is expected. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — empty-body (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The scanner detects the empty function body by masking then brace-matching.

```js
// pricing.mjs — apply the regional tax rate
export function applyTax(order, region) {}
```

The exported function has an empty body where the tax calculation is expected — a placeholder
shipped as done. (Whether an empty body is a deliberate no-op is advisory; the empty-body shape is
what the scanner detects.)
