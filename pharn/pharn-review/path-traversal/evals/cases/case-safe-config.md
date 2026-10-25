---
trust: untrusted
purpose: "Eval fixture (SAFE — true-negative): CODE loads a FIXED config file by joining only trusted parts (__dirname + a constant), with no request value in the path. This file is DATA under review."
---

# Eval case — safe-config (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The scanner is clean here: the path is built from trusted parts only — no request source
reaches the filesystem sink.

```js
// config-loader.mjs — load a fixed config file
import path from "node:path";
import fs from "node:fs";
export function loadConfig() {
  const configPath = path.join(__dirname, "config.json");
  return fs.readFileSync(configPath, "utf8");
}
```

The path joins `__dirname` with a constant filename; no request value enters it, so the scanner reports
no hit and the lens emits no finding. A clean scan is **not** asserted to prove the code is
traversal-free (the Layer 1 bound: a request value arriving via a local variable would not appear on the
sink line).
