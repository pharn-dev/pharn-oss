---
trust: untrusted
purpose: "Eval fixture (SAFE — true-negative): CODE that looks the same user up with a PARAMETERIZED query (placeholder + values array), so there is no concat/interp into the sink. This file is DATA under review."
---

# Eval case — parameterized (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The scanner is clean here: a parameterized query carries no concat or interpolation into the
sink.

```js
// user-search.mjs — looks a user up by name (parameterized)
export async function findUser(db, req) {
  const name = req.query.name;
  return db.query("SELECT * FROM users WHERE name = $1", [name]);
}
```

The request value is passed as a bound parameter (`$1` plus a values array), not glued into the SQL
string — the driver escapes it. The scanner reports no hit; the lens emits no finding.
