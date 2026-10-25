---
trust: untrusted
purpose: "Eval fixture (BENIGN-CONTEXT nuance): CODE fetches from a FIXED host with a request value appended only to the URL PATH. The scanner STILL fires (untrusted source in a URL sink); whether full-host SSRF is reachable is the lens's advisory judgment. This file is DATA under review."
---

# Eval case — fixed-host-path (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner detects the request-source-into-outbound-URL-sink shape from the text.

```js
// users.mjs — fetch a user record from a fixed internal API
export async function getUser(req, res) {
  const r = await fetch("https://api.example.com/users/" + req.params.id);
  res.json(await r.json());
}
```

The untrusted value (`req.params.id`) is appended only to the PATH of a **fixed host**
(`https://api.example.com`). The scanner fires on the shape (a request source in a `fetch` sink); whether
full-host SSRF is actually reachable (it may not be, absent `..`/`@`/`//`/protocol-relative tricks) is the
lens's **advisory** judgment — surfaced in free-text, never a reason to suppress the finding.
