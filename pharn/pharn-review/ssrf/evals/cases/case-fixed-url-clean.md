---
trust: untrusted
purpose: "Eval fixture (SAFE — true-negative): CODE makes an outbound request to a CONSTANT URL (a fixed host + a trusted-parts base), with no request value in the URL. This file is DATA under review."
---

# Eval case — fixed-url-clean (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The scanner is clean here: the URL is built from trusted parts only — no request source
reaches the outbound-request sink.

```js
// health.mjs — poll a fixed upstream health endpoint
const API_BASE = "https://api.example.com";
export async function checkHealth() {
  const res = await axios.get(API_BASE + "/health");
  return res.status === 200;
}
```

The request target is a constant host joined with a constant path; no request value enters it, so the
scanner reports no hit and the lens emits no finding. A clean scan is **not** asserted to prove the code is
SSRF-free (the Layer 1 bound: a request value arriving via a local variable would not appear on the sink
line).
