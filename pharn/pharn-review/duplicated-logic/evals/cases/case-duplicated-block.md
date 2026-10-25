---
trust: untrusted
purpose: "Eval fixture (DUPLICATED-LOGIC): CODE with a block of cart math copy-pasted across two functions. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — duplicated-block (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner detects the exact duplicated block from the text.

```js
// pricing.mjs — two entry points over the same cart math
export function priceCart(cart) {
  const items = cart.items;
  let total = 0;
  for (const it of items) {
    total += it.price * it.qty;
  }
  const tax = total * 0.2;
  return total + tax;
}
export function priceQuote(cart) {
  const items = cart.items;
  let total = 0;
  for (const it of items) {
    total += it.price * it.qty;
  }
  const tax = total * 0.2;
  return { total, tax };
}
```

The five-line cart-math block (`const items…` through `const tax…`) is byte-identical in both
functions — copy-pasted logic. (Whether it is worth extracting into a shared helper is advisory; the
exact duplicated **shape** is what the scanner detects.)
