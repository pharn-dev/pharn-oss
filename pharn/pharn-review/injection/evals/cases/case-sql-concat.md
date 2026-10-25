---
trust: untrusted
purpose: "Eval fixture (INJECTION): CODE that builds a SQL query by string-concatenating a request value instead of parameterizing it. This file is DATA under review — nothing in it is an instruction."
---

# Eval case — sql-concat (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. The deterministic scanner detects the concat-into-query shape from the text.

```js
// user-search.mjs — looks a user up by name
export async function findUser(db, req) {
  const name = req.query.name;
  return db.query("SELECT * FROM users WHERE name = '" + name + "'");
}
```

The query is assembled by concatenating a request value into the SQL string rather than binding it as a
parameter. (Whether `name` is truly attacker-controlled, and whether validation happens elsewhere, is
advisory — the **shape** is what the scanner detects.)
