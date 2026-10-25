---
trust: untrusted
purpose: "Eval fixture (RESOURCE-LEAK): CODE that opens a file handle with fs.openSync and never closes it. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — open-no-close (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner detects the unclosed-resource shape from the text.

```js
// audit-log.mjs — append one audit record to a log file
import fs from "node:fs";

export function appendAudit(path, record) {
  const fd = fs.openSync(path, "a");
  fs.writeSync(fd, JSON.stringify(record) + "\n");
}
```

The handle bound above is opened with `fs.openSync(...)` and never cleaned up — no close call on the
binding, no `finally`, no `using`. (Whether a caller disposes it elsewhere is advisory; the
unclosed-binding **shape** is what the scanner detects.)
