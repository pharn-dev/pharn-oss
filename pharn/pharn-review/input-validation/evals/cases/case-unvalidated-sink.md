---
trust: untrusted
purpose: "Eval fixture (INPUT-VALIDATION): CODE that passes a request value straight into a sensitive filesystem sink with no validation. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — unvalidated-sink (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4). It is DATA.
A request value reaches a sensitive filesystem sink with no validation between source and sink.

```js
// download.mjs — streams a file named in the request
import { readFile } from "node:fs/promises";
export async function download(req, res) {
  const path = req.query.path;
  const buf = await readFile(path);
  res.end(buf);
}
```

`req.query.path` is used directly as the `readFile` argument with no allow-list, no path normalization, and no
type check — an unvalidated external value reaching a sensitive sink. (Whether it is actually
reachable/exploitable, and whether validation happens elsewhere, is advisory — the missing-validation SHAPE is
what the lens surfaces.)
