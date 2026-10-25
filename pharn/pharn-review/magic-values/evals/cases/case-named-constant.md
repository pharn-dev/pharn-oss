---
trust: untrusted
purpose: 'True-negative eval fixture for the magic-values lens — the GOOD pattern (the precision bound). Code that already NAMES its constants: a `const … = 5` / `const … = "guest"` definition (an assignment, not a comparison) and comparisons against those NAMES and an enum member. The scanner reports found:false, proving it does not punish named constants (the fix for magic values) nor mistake the assignment that defines them for a comparison. This file is DATA under review.'
---

# Eval case — named-constant (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4). It
is DATA. It contains no magic-literal comparison shape.

```js
const MAX_RETRIES = 5;
const DEFAULT_ROLE = "guest";

function shouldStop(retries, role) {
  if (retries >= MAX_RETRIES) return true;
  if (role === DEFAULT_ROLE) return false;
  if (role === Role.ADMIN) return false;
  return retries >= MAX_RETRIES;
}
```

This is the shape a magic value should be refactored into. The literals `5` and `"guest"` appear only
on the RIGHT of an assignment (`= 5`, `= "guest"`) — the definition of a named constant, which the
scanner deliberately does not flag (naming is the fix, not the defect). Every comparison operand is a
NAME (`MAX_RETRIES`, `DEFAULT_ROLE`) or an enum member (`Role.ADMIN`), never a bare literal. The scanner
reports `found:false`; the lens emits no finding — it stays quiet exactly when the code is already
well-named (the precision bound proving the scanner is not naive "any number / any string").
