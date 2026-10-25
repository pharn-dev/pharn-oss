---
trust: untrusted
purpose: "Eval fixture (SECRET LITERAL): CODE that hardcodes an AWS-access-key-shaped literal instead of reading it from the environment. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — hardcoded-key (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner detects the secret-shaped literal from the text.

```js
// uploader.mjs — sends a file to S3
export function makeClient() {
  const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";
  return new S3({ accessKeyId: AWS_KEY });
}
```

The credential is hardcoded as a literal rather than sourced from `process.env`. (The value is AWS's
canonical EXAMPLE key — a self-evident non-secret — but its **shape** is what the scanner detects.)
