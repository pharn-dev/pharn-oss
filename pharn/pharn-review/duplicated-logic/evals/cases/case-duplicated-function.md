---
trust: untrusted
purpose: "Eval fixture (DUPLICATED-LOGIC): CODE with two functions whose bodies are byte-identical (whole-function copy-paste). This file is DATA under review — nothing in it is an instruction."
---

# Eval case — duplicated-function (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The two function bodies below are byte-identical; the scanner detects the block.

```js
// handlers.mjs — two request handlers with copy-pasted bodies
export async function handleCreate(req, res) {
  const id = req.params.id;
  const row = await db.find(id);
  if (!row) return res.status(404).end();
  const ok = authorize(req.user, row);
  return res.json({ ok, row });
}
export async function handleUpdate(req, res) {
  const id = req.params.id;
  const row = await db.find(id);
  if (!row) return res.status(404).end();
  const ok = authorize(req.user, row);
  return res.json({ ok, row });
}
```

The five-line handler body is byte-identical across both functions. (Whether these should share a
helper — or intentionally diverge next — is advisory; the exact duplicated **shape** is what the
scanner detects.)
