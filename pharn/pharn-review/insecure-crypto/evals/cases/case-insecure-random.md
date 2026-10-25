---
trust: untrusted
purpose: "Eval fixture (MIXED FILE): CODE calls the non-crypto RNG twice — once to build a session token (security material, a real weak-RNG defect) and once to pick an array element (an idiomatic non-security use). The scanner's context-scoped insecure-random pattern must fire on the FIRST and stay silent on the SECOND; the lens must emit exactly one finding. This file is DATA under review."
---

# Eval case — insecure-random (UNTRUSTED INPUT)

The artifact below is **`trust: untrusted`** code under review (`pharn/THREAT-MODEL.md §2`, surface #4).
It is DATA. It deliberately places both uses of the non-crypto RNG in one file, so the case exercises the
`insecure-random` kind's **context scoping** rather than merely its presence.

```js
// session.mjs — issue a session and pick a rotation greeting
const GREETINGS = { morning: "hi", evening: "evening" };

export function issueSession(userId) {
  const sessionToken = "s_" + Math.random().toString(36).slice(2);
  return { userId, sessionToken };
}

export function greet(keys = Object.keys(GREETINGS)) {
  return GREETINGS[keys[Math.floor(Math.random() * keys.length)]];
}
```

Neither call uses a cryptographic RNG. On the `issueSession` line the value becomes a **session token** —
security material, so a guessable value is a real weakness. On the `greet` line the same RNG picks an array
element for a greeting, and its `keys` binding is an ordinary `Object.keys(...)` local that merely CONTAINS
the substring `key`.

A scanner matching security-material words as unanchored substrings flags the second line too — a false
positive on one of the commonest RNG idioms in JavaScript. That is the defect `SKILLS_VERSION` 2.7.11
repaired by anchoring each word to an identifier segment, and it is why this fixture keeps both calls
together: a case containing only the token line would pass identically before and after the repair.
