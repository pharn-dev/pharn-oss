# MEASUREMENTS — scanner-redos-sweep-2

Machine: Apple M2, Node v24.13.1, 2026-10-20, with other agent sessions running in parallel — so absolute times are
noisy and slower than an idle box; the growth ratios and the killed/completed verdicts are the result. Scratch scripts
lived under `.pharn/sweep2/` (gitignored): `measure.mjs` (in-process `scanText`), `killcheck.mjs` (both CLIs under a
5 s `spawnSync` timeout), `bigdiff.mjs` (one-time old-vs-new comparison). "old" is `git show origin/main:` of each
scanner at `dd69efd5` (6.71.0), with only its two sibling imports re-pointed.

## 1. In-process, old (6.71.0): quadratic — about 4× per doubling

| shape                    | 10k units | 20k units | 40k units |
| ------------------------ | --------: | --------: | --------: |
| timeout `fetch(`×N       |     2.5 s |     9.9 s |    30.8 s |
| timeout `fetch(`×N `)`×N |     4.2 s |    15.5 s |    64.9 s |
| timeout `fetch()`×N      |     1.7 s |     8.7 s |    25.2 s |
| timeout `fetch(a)\n`×N   |     1.6 s |     7.9 s |    28.5 s |
| timeout `db.query(`×N    |     1.9 s |     6.9 s |    28.7 s |
| eh `try{`×N              |     0.9 s |     4.0 s |    15.1 s |
| eh `try{`×N `}`×N        |     1.1 s |     4.2 s |    15.8 s |
| eh `await x(`×N          |     1.7 s |     7.9 s |    36.4 s |
| eh `await x()\n`×N       |     2.3 s |     8.0 s |    33.3 s |
| eh `JSON.parse(`×N       |     1.2 s |     9.4 s |    39.7 s |

Linear in the old code already (each ≤ 7 ms at 40k): `try{ await x(`×N `}` (every op is guarded, so the old code
returned before its per-hit line count), `try{}`×N then one await, and the three `AWAIT_RE` dotted-chain shapes below.

## 2. In-process, new (6.71.2): linear within noise

| shape                    | 20k | 40k | 80k | 160k | 320k |
| ------------------------ | --: | --: | --: | ---: | ---: |
| timeout `fetch(`×N       | 127 | 308 | 291 |  792 | 1213 |
| timeout `fetch(`×N `)`×N | 206 | 179 | 482 |  668 | 1425 |
| timeout `fetch()`×N      | 124 |  66 | 142 |  674 |  871 |
| timeout `fetch(a)\n`×N   |  87 | 152 | 203 |  420 |  687 |
| timeout `db.query(`×N    |  27 | 289 | 150 |  296 | 1178 |
| eh `try{`×N              | 128 |  96 |  95 |  394 |  490 |
| eh `try{`×N `}`×N        |  23 |  30 | 349 |  362 |  485 |
| eh `await x(`×N          |  19 |  58 | 231 |  555 |  879 |
| eh `try{ await x(`×N `}` |  13 | 109 | 105 |  323 |  489 |
| eh `await x()\n`×N       |  59 | 168 | 254 |  252 | 1668 |
| eh `JSON.parse(`×N       |  54 | 202 | 312 |  377 |  895 |
| eh `try{}`×N, then await |  11 |  65 |  94 |  225 |  323 |

(ms; 320k units is 1–3 MB of input. Ratios per doubling scatter between about 1× and 2.5× under the parallel load;
none shows the old 4×.)

## 3. `AWAIT_RE` on a long dotted chain (asked for by the orchestrator's discovery notes)

`/\bawait\s+[\w$.]+\s*\(/g` after `await` + `a.`×N: old and new identical (the regex did not change) and linear —
3.6 / 5.6 / 9.6 / 28 / 124 ms at 20k–320k units with no `(`, about the same with a `b(` at the end, and with
`await a.a.…a.` repeated (many starts, each over its own 40-char chain). The greedy `[\w$.]+` gives its chain back one
character at a time, and each retry fails on the next character (a `[\w$.]` character is neither `\s` nor `(`), so
one start costs O(chain); starts sit on distinct `await` words. Two ★ rows pin it (§4).

## 4. ★ shapes — both CLIs under a 5 s `spawnSync` timeout (`killcheck.mjs 400000`)

| scanner | shape                                 |   bytes | old (6.71.0)        | new (6.71.2)        |
| ------- | ------------------------------------- | ------: | ------------------- | ------------------- |
| timeout | `fetch(` unbalanced                   | 399,996 | KILLED              | found=false, 259 ms |
| timeout | `fetch(` nested, balanced             | 233,331 | KILLED              | 33,333 hits, 365 ms |
| timeout | `fetch(` nested, `{ timeout }` inside | 233,342 | KILLED              | found=false, 308 ms |
| timeout | `fetch()` one line                    | 399,994 | KILLED              | 57,142 hits, 514 ms |
| timeout | `fetch(a)` per line                   | 399,996 | KILLED              | 44,444 hits, 534 ms |
| eh      | `try{` unbalanced + await             | 400,009 | KILLED              | 1 hit, 281 ms       |
| eh      | `try{` nested + await                 | 250,009 | KILLED              | found=false, 311 ms |
| eh      | `await x(` one line                   | 400,000 | KILLED              | 1 hit, 331 ms       |
| eh      | `await x(` one line + `.catch(`       | 400,007 | KILLED              | found=false, 216 ms |
| eh      | `await x()` per line                  | 400,000 | KILLED              | 40,000 hits, 637 ms |
| eh      | `JSON.parse(` one line                | 399,993 | KILLED              | 1 hit, 371 ms       |
| eh      | `await` + dotted chain, no `(`        | 400,006 | found=false, 269 ms | found=false, 353 ms |
| eh      | `await` + dotted chain + `(`          | 400,008 | 1 hit, 371 ms       | 1 hit, 243 ms       |

Added after the independent review (GATE-2 fix round, `killcheck2.mjs`, measured while the regress baseline suite ran
in parallel — so the new times are higher):

| scanner | shape                                        |   bytes | old (6.71.0)         | new (6.71.2)          |
| ------- | -------------------------------------------- | ------: | -------------------- | --------------------- |
| eh      | `try{}`×40k then `await x()`×20k per line    | 400,001 | KILLED               | 20,000 hits, 1,511 ms |
| eh      | (`await` + 40-char dotted chain, no `(`)×10k | 470,000 | found=false, 1042 ms | found=false, 987 ms   |

The first is the one shape that reaches only the old per-op loop over every try range: the reviewer measured that a
scanner with only that loop restored passes every other ★ row and is killed on this one. The test rows carry
"(old: killed)" exactly on the 12 KILLED shapes. `try{}`×100k then one await and the three dotted-chain shapes are ★
rows without the label (old: linear, §1 and §3). Headroom: under the heaviest parallel load seen here the new CLI took
up to about 2.7 s on a ★ shape (the reviewer's measurement), against the 5 s cap — about 2×, not the 8–20× the idle
numbers suggest.

## 5. One-time identity check (`bigdiff.mjs 7 100000`) — not a maintained check

Old vs new `scanText`, both scanners: all 3,109 tracked text files (no NUL byte) → 0 differences (149 timeout and 750
error-handling oracle hits); 100,000 seeded fuzz texts over a 32-token alphabet → 0 differences (12,448 timeout and
89,577 error-handling oracle hits). The maintained check is `pharn/floor/scan-code-missing-differential.test.mjs`
(about 18 s locally, under load).
