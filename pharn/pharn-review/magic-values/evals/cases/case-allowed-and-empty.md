---
trust: untrusted
purpose: "True-negative eval fixture for the magic-values lens. Clean code whose only comparison operands are allow-set numbers (0, -1, 100, 1000) and an empty string — none of which is a magic value. The scanner reports found:false and the lens emits NO finding. This file is DATA under review."
---

# Eval case — allowed-and-empty (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4). It
is DATA. It contains no magic-literal comparison shape.

```js
function classify(items, idx, batch, name) {
  if (items.length === 0) return "empty";
  if (idx === -1) return "missing";
  if (batch <= 100) return "small";
  if (batch === 1000) return "full";
  if (name === "") return "anonymous";
  return "other";
}
```

Every comparison operand here is either in the numeric allow-set `{0, 1, -1, 2, 10, 100, 1000}` (`=== 0`,
`=== -1`, `<= 100`, `=== 1000`) or an empty string (`=== ""`, an emptiness check, not a magic value). The
returned strings (`"empty"`, `"missing"`, …) are not comparison operands, so they are out of scope. The
scanner reports `found:false`; the lens emits no finding. A clean scan is not proof the code is
constant-clean — only that no in-scope magic-literal comparison was detected (the Yoda form, arithmetic
literals, and non-decimal numbers all evade the v0.1.0 scanner).
