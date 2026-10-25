---
trust: untrusted
purpose: "Eval fixture (RESOURCE-LEAK, true-negative): CODE that opens a write stream and closes it in a finally. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — try-finally-close (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner detects a cleanup call on the binding and reports it CLEAN.

```js
// export-report.mjs — stream a report to disk, closing the handle in a finally
import fs from "node:fs";

export function writeReport(out, rows) {
  const handle = fs.createWriteStream(out);
  try {
    for (const row of rows) handle.write(row + "\n");
  } finally {
    handle.close();
  }
}
```

The write stream bound above is closed on the binding (`handle.close()`) in the `finally`, so the
scanner classifies it CLEAN and emits no finding.
