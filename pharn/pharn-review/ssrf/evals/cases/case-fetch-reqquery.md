---
trust: untrusted
purpose: "Eval fixture (SSRF): CODE makes an outbound fetch to a URL taken straight from a request query value, with no allow-list. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — fetch-reqquery (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner detects the request-source-into-outbound-URL-sink shape from the text.

```js
// proxy.mjs — fetch a URL on behalf of the caller
export async function proxy(req, res) {
  const upstream = await fetch(req.query.url);
  res.send(await upstream.text());
}
```

The outbound request target is taken directly from a request value (`req.query.url`) with no allow-list
or URL-host check between the source and the `fetch` sink. (Whether the value is truly attacker-controlled,
and whether validation happens elsewhere, is advisory — the **shape** is what the scanner detects.)
