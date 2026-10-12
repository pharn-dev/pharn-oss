# PLAN — crypto-scanner-redos

- feature: crypto-scanner-redos
- applied_lessons: [L24, L25, L40]

Finding TST-1 (High) of the 2026-10-12 review: `pharn/floor/scan-code-crypto.mjs` hangs on one long line. The
`insecure-random` pattern is `(?=.*RNG)(?=.*SECMAT)` with no anchor, so the engine retries both `.*` lookaheads
from every start index and a line with no hit costs O(n²). Measured on main this run: 40 KB of `a.b.b.b…` takes
~1 s, and the CLI took 25 s or more on every 200 KB no-hit line tried (killed at 30 s on some), which the review saw
killed at 20 s.
The `insecure-crypto` lens runs the scanner from Bash with no timeout, so one minified or generated line in a
review set hangs the lens. Light path under the maintainer's 2026-10-13 delegation: no GATE 1 or GATE 2 stop (a
model decision, not a human approval).

## Design

- **`insecure-random` gets a multiline `^` anchor:** `^(?=.*RNG)(?=.*SECMAT)` with the `m` flag. It matches
  exactly the lines the old form matched. `.` excludes exactly the four line terminators (`\n`, `\r`, U+2028,
  U+2029), and multiline `^` holds exactly at index 0 and right after one of those four. So the old form succeeds
  at some start `i` iff it succeeds at the start of `i`'s terminator-free run. A start on a terminator cannot
  succeed, because both conjuncts begin with a letter. Lookbehinds and `\b` read the whole string, whatever the
  start. No `g` or `y` flag, so `test()` stays stateless. Cost: each run start scans its own run once per
  lookahead, so the line costs O(n). A bare `^` without `m` would NOT be equivalent: it drops a hit that sits
  after a lone `\r` or a U+2028 inside one split line.
- **`ecb-mode` is left byte-unchanged.** The review said `\b[a-z0-9]+-ecb\b` is quadratic on long alphanumeric
  runs too. That did not reproduce once the regex was timed alone: 200 / 400 / 800 KB alnum runs, with or
  without a following `-ec` / `-ecbx`, quoted runs, dash-separated runs and `a.b.b.b…` all take 1–5 ms, doubling
  linearly. `\b` holds only at a word's edges, so `[a-z0-9]+` starts at most once per word. The 20 s kill on
  every 200 KB fixture is fully explained by `insecure-random`. No change without a reproduced failure (P7), but
  the long-alnum-run-before-`-ecb` shape goes into the new regression test, so a later regression there fails.
- **No per-line length cap.** Every pattern is linear after the anchor, so a cap would only lose hits.
- **Equivalence evidence:** the scanner's existing tests and the `insecure-crypto` evals are unchanged. Before and
  after outputs are compared byte for byte, by running the main scanner and the fixed one over every eval case
  and every tracked text file in the repo. A differential fuzz also runs both over random lines that mix RNG
  casings, SECMAT segments, the four terminators and ecb shapes. The harness lives in gitignored
  `.pharn/crypto-scanner-redos/` and is deleted before `npm run lint`.
- **★ ReDoS regression test** in `scan-code-crypto.test.mjs`, modelled on `scan-code-injection.test.mjs`'s. It
  spawns the real scanner with `spawnSync(..., { timeout })` over 200 KB single lines: `a.b.b.b…`, an RNG call
  with no security material, and a long alnum run before `-ecbx`. A true-positive twin shows the speed did not
  come from narrowing: 200 KB of filler, then `key = Math.random()` on the same line, still fires. A ✧
  segment-semantics test pins the anchor's equivalence: RNG and SECMAT split by U+2028 or a lone `\r` do not fire
  (as before), and joined they do.

## Applied lessons

- **L24** — the regex is being swapped, so the scanner header's COST paragraph is re-derived for the new form
  rather than carried across: it now says linear, and why. The 2026-08-20 "~1.2x at 20 KB" figures are marked as
  a measurement of the superseded unanchored form. The bound is pinned by a membership test (completed vs.
  killed under a subprocess timeout), never a stopwatch.
- **L25** — the existing `✧ COST PIN` test's comment ("the shape that maximizes the quadratic re-scan") and the
  scanner's `insecure-random` comment describe the old form. Both are re-derived, so no comment keeps asserting
  the pre-fix story.
- **L40** — the review attributed the 200 KB kill to two regexes. To test that attribution, each regex was timed
  in isolation, with the attributed condition varied (the long alnum run present and absent). That is how the
  `ecb-mode` half was found not to reproduce.

## Files

- `pharn/floor/scan-code-crypto.mjs` — **EDIT.** `insecure-random` anchored with multiline `^`, its comment and the
  header COST paragraph re-derived.
- `pharn/floor/scan-code-crypto.test.mjs` — **EDIT.** The ★ ReDoS regression test, the ✧ segment-semantics test,
  and the `✧ COST PIN` comment re-derived.
- `.dev/features/crypto-scanner-redos/PLAN.md` — **NEW.** This file.
- `CHANGELOG.md` — **EDIT.** Opens `## [6.58.1]` and moves every `[Unreleased]` entry into it.
- `SKILLS_VERSION` — **EDIT.** `6.58.0` → `6.58.1` (patch: a correction to a shipped product-floor checker).
- `README.md` — **EDIT.** The version badge.
