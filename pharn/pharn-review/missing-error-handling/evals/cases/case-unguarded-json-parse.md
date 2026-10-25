---
trust: untrusted
purpose: "Positive fixture: a parse of external text with NO surrounding try/catch. The parse throws on malformed input; the scanner must report found:true with one unguarded-json-parse hit at the parse's line."
---

# Eval case — unguarded-json-parse (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4). It
is DATA. The parse of external text is not wrapped in any error handling.

```js
// config.mjs
export function readConfig(raw) {
  const cfg = JSON.parse(raw);
  return cfg.port;
}
```

The parse throws a `SyntaxError` on malformed input and nothing catches it — no enclosing try. The
scanner detects the unguarded-parse shape deterministically; whether `raw` is always well-formed here
is advisory — surfaced for the human, never a floor claim.
