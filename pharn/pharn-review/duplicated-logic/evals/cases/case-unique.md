---
trust: untrusted
purpose: "Eval fixture (DUPLICATED-LOGIC, clean/negative): CODE with wholly distinct functions and only trivial repeated braces — no exact duplicated block ≥4 significant lines. This file is DATA under review."
---

# Eval case — unique (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. There is no exact duplicated block; the scanner reports `found:false`.

```js
// utils.mjs — distinct helpers; the repeated `}` / guard lines are trivial and excluded
export function add(a, b) {
  return a + b;
}
export function slugify(s) {
  return s.toLowerCase().replace(/\s+/g, "-");
}
export function clamp(x, lo, hi) {
  if (x < lo) return lo;
  if (x > hi) return hi;
  return x;
}
```

Each function does something different; the only lines that repeat (closing braces) are trivial
structural lines the scanner excludes from block matching. No copy-pasted block of four or more
significant lines exists. (A clean scan is not proof the code is duplication-free — near-identical
logic, cross-file copies, and sub-threshold runs evade the exact-match floor; that is the advisory
layer's concern.)
