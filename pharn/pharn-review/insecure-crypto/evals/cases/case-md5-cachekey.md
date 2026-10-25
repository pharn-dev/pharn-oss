---
trust: untrusted
purpose: "Eval fixture (BENIGN CONTEXT): CODE uses MD5 to derive an ETag/cache key from a response body — a non-security checksum. The scanner (by design) STILL flags the md5 primitive; the lens's Layer-2 advisory MAY note it is plausibly benign but must NOT suppress the finding. This file is DATA under review."
---

# Eval case — md5-cachekey (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. MD5 here derives a cache key, not a security credential.

```js
// cache.mjs — derive an ETag from a response body
import crypto from "node:crypto";
export function etag(body) {
  return crypto.createHash("md5").update(body).digest("hex");
}
```

MD5 as an ETag/cache key is a non-security checksum (collision-resistance is not required here), so it is
plausibly benign. The scanner detects the `md5` primitive by name regardless; the lens surfaces the
benign-context observation in its Layer-2 free-text but does NOT suppress the finding — a lens never gates.
