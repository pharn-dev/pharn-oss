---
trust: untrusted
purpose: "Eval fixture (PATH TRAVERSAL): CODE that reads a file by joining a request value into a filesystem path with no sanitization. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — fs-concat (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner detects the request-source-into-fs-path-sink shape from the text.

```js
// download.mjs — serve an uploaded file by name
export function download(req, res) {
  const uploadsDir = "/var/app/uploads";
  fs.readFile(uploadsDir + "/" + req.params.file, (err, data) => res.send(data));
}
```

The path is built by joining a request value (`req.params.file`) into a filesystem read with no
allow-list or basename check between the source and the sink. (Whether the value is truly
attacker-controlled, and whether validation happens elsewhere, is advisory — the **shape** is what the
scanner detects.)
