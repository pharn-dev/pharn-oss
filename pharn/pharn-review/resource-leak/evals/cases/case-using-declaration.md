---
trust: untrusted
purpose: "Eval fixture (RESOURCE-LEAK, true-negative): CODE that acquires a handle with a `using` (explicit resource management / RAII) declaration. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — using-declaration (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner recognizes the `using` binding as auto-disposed and reports it
CLEAN.

```js
// read-blob.mjs — read a blob with explicit resource management
import fs from "node:fs";

export function readBlob(path) {
  using fd = fs.openSync(path, "r");
  return fs.readFileSync(fd);
}
```

The handle bound above uses a `using` declaration (TC39 explicit resource management), so it is
disposed automatically at scope exit; the scanner classifies it CLEAN and emits no finding.
