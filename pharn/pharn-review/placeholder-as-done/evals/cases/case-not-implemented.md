---
trust: untrusted
purpose: "Eval fixture (placeholder-as-done): a function whose entire body is a throw standing in for the real logic. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — not-implemented (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The scanner detects the placeholder throw from the text.

```js
// billing.mjs — compute the invoice total
export function computeInvoiceTotal(order) {
  throw new Error("not implemented");
}
```

The function ships a throw where the calculation is expected — a placeholder shipped as done.
(Whether this is a deliberate stub is advisory; the throw is what the scanner detects.)
