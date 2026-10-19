# MEASUREMENTS — scanner-redos-bounds

All timings were taken on 2026-10-19 on a shared machine whose load average was 38–63 while they ran. Read them as
order-of-magnitude figures and growth ratios; none is a benchmark. The scripts lived under
`.pharn/scanner-redos-bounds/` (gitignored scratch), and the 6.64.2 scanners were copied there unchanged before the
build (`old/`).

## 1. Before: the audit's shapes reproduced (in-process `scanText`, 6.64.2)

| shape                             | size  | time    | size ×2 | time    |
| --------------------------------- | ----- | ------- | ------- | ------- |
| `query(`×4000 / ×8000             | 24 KB | 231 ms  | 48 KB   | 1005 ms |
| `exec(`×4000 / ×8000              | 20 KB | 200 ms  | 40 KB   | 806 ms  |
| `.innerHTML=`×4000 / ×8000        | 44 KB | 62 ms   | 88 KB   | 239 ms  |
| `fetch(`×4000 / ×8000             | 24 KB | 223 ms  | 48 KB   | 893 ms  |
| `fs.a(`×4000 / ×8000              | 20 KB | 194 ms  | 40 KB   | 768 ms  |
| `path.join(`×4000 / ×8000         | 40 KB | 351 ms  | 80 KB   | 1453 ms |
| `.sendFile(`×4000 / ×8000         | 40 KB | 357 ms  | 80 KB   | 1457 ms |
| N+1 `a.`×8000 / ×16000            | 16 KB | 686 ms  | 32 KB   | 2754 ms |
| N+1 one identifier, 40 KB / 80 KB | 40 KB | 1007 ms | 80 KB   | 4206 ms |
| N+1 `(`×16000 / ×32000            | 16 KB | 26 ms   | 32 KB   | 87 ms   |
| N+1 `x(`×16000 / ×32000           | 32 KB | 43 ms   | 64 KB   | 169 ms  |

Every row grows about 4× per doubling, so each is quadratic. Two rows were not named by the audit:
html-injection's `[^;]*?` span (`.innerHTML=`) and the N+1 header test on many `(`. Both are fixed here. The N+1
interval lookup (O(hits × intervals)) is quadratic by construction. On 9000 one-line loops it took 1.2 s.

## 2. After: the ★ shapes through the real CLI, 6.64.2 against this change, 5 s timeout

`oldnew.mjs` spawns each scanner's CLI on a one-line file. "same" means the two stdout documents are byte-equal.
This change ships as 6.64.5. It was built as 6.64.3 and renumbered twice, as `main` released its own 6.64.3
and 6.64.4.

| scanner        | shape                                              | 6.64.2    | new    | output |
| -------------- | -------------------------------------------------- | --------- | ------ | ------ |
| injection      | `query(`×33k (200 KB)                              | KILLED@5s | 81 ms  | –      |
| injection      | `exec(`×40k (200 KB)                               | KILLED@5s | 134 ms | –      |
| injection      | `.innerHTML=`×91k (1 MB)                           | KILLED@5s | 87 ms  | –      |
| injection      | `query()`×28k                                      | 76 ms     | 102 ms | same   |
| injection      | `query(")` + `query(x)`×25k                        | 57 ms     | 96 ms  | same   |
| injection      | `.innerHTML=x;`×15k                                | 113 ms    | 105 ms | same   |
| injection      | twin: `query(`×33k + concat                        | 84 ms     | 93 ms  | same   |
| injection      | twin: `query()`×28k + `query("a" + b)`             | 150 ms    | 83 ms  | same   |
| injection      | twin: `.innerHTML=`×91k + concat                   | 64 ms     | 79 ms  | same   |
| ssrf           | `fetch(`×33k                                       | KILLED@5s | 62 ms  | –      |
| ssrf           | `axios.get(`×20k                                   | KILLED@5s | 86 ms  | –      |
| ssrf           | `fetch()`×28k                                      | 62 ms     | 72 ms  | same   |
| ssrf           | twin: `fetch(`×33k + source                        | 67 ms     | 100 ms | same   |
| ssrf           | twin: `fetch()`×28k + `fetch(req.query.u)`         | 94 ms     | 68 ms  | same   |
| path-traversal | `path.join(`×20k                                   | KILLED@5s | 139 ms | –      |
| path-traversal | `.sendFile(`×20k                                   | KILLED@5s | 158 ms | –      |
| path-traversal | `fs.a(`×40k                                        | KILLED@5s | 109 ms | –      |
| path-traversal | `fs.a()`×33k                                       | 86 ms     | 210 ms | same   |
| path-traversal | twin: `path.join(`×20k + source                    | 97 ms     | 150 ms | same   |
| path-traversal | twin: `fs.a()`×33k + `fs.readFile(req.params.f)`   | 123 ms    | 119 ms | same   |
| n-plus-one     | `a.`×100k (200 KB)                                 | KILLED@5s | 407 ms | –      |
| n-plus-one     | one 200 KB identifier                              | KILLED@5s | 330 ms | –      |
| n-plus-one     | `(`×1M (1 MB)                                      | KILLED@5s | 471 ms | –      |
| n-plus-one     | `x.map (`×100k                                     | KILLED@5s | 824 ms | –      |
| n-plus-one     | 9000 one-line loops, each with a query             | 1229 ms   | 393 ms | same   |
| n-plus-one     | twin: 200 KB chain + a loop query on the same line | KILLED@5s | 451 ms | –      |
| n-plus-one     | twin: a 200 KB identifier `.findMany(` in a loop   | 545 ms    | 538 ms | same   |

13 of the 27 shapes kill the 6.64.2 scanner, and the ★ test labels mark those with "(old: killed)". This is a
one-time measurement. The suite does not keep the old scanners, so the negative control behind the ★ timeout tests is
this table, not a test. The unmarked shapes are the new code's own worst cases (L24): many spans that fail at once, a
quoted string whose scan runs past its span, and many loop hits. The 6.64.2 scanner was not slow on them, and they are
there to keep the new code linear.

In-process growth after the change (`np1check.mjs`, N+1, 100 K → 800 K characters): `{`×N 23 → 1084 ms, `x(`×N
133 → 1089 ms, loops 227 → 578 ms. These are noisy under this load but roughly linear, with no 4× step per doubling.

## 3. Same output, old against new (one-time, not maintained)

- `allfiles.mjs` covered every tracked text file of this repo, 2,999 of them (git ls-files, regular, ≤ 2 MB, no NUL
  in the first 8,000 bytes). Old hits: injection 56, ssrf 65, path-traversal 82, n-plus-one 20. Files with differing
  output: **0** for each scanner. The lens eval cases are among those files.
- Re-run after the probe fix in §5: 2,999 files, 0 differing for each scanner. The old-hit counts rose by one each
  for the three sink scanners (57, 66, 83), because the edited header of `sink-span-core.mjs` now quotes sink-shaped
  text, and both versions read that file the same way.
- `bigfuzz.mjs`:
  - 300,000 fuzzed lines per sink scanner gave identical output (old hits: injection 165,196, ssrf 75,099,
    path-traversal 114,683);
  - 3,000 structured fuzz texts for N+1 gave identical output (76,457 old hits).

## 4. The sweep over all 18 scanners (`sweep.mjs`) and the deferral

The same generic shapes, at 20 K and 40 K units, flagged only a ratio ≥ 2.5×. Before the change:

- `scan-code-missing-error-handling.mjs`: `try{`×N 640 → 1887 ms (×2.9), `await x(`×N 235 → 1458 ms (×6.2)
- `scan-code-missing-timeout.mjs`: `fetch(`×N 312 → 1138 ms (×3.6)
- `scan-code-n-plus-one.mjs`, `scan-code-ssrf.mjs`: the shapes this increment fixes

After the change, the injection, SSRF and path-traversal scanners show no flagged shape. The N+1 scanner shows only
noise-level ratios, re-measured as linear above. The two other scanners are unchanged and stay super-linear:

- missing-error-handling: `await x(` ×5.6;
- missing-timeout: `fetch(` ×5.4.

They use different mechanisms, outside TST-2 and TST-3. At GATE 1 they were deferred to the named follow-up
`scanner-redos-sweep-2`. That was a model decision under the maintainer's delegation, made by the batch orchestrator.

## 5. The independent probe, and the one fix it caused

A subagent with no part in the build tried to make old and new `scanText` disagree. It reported no output divergence
after about 2.6 M fuzzed whole-scanner inputs, 1.2 M component-level inputs, 12.4 M exhaustively enumerated short token
strings and 448 hand-written cases. Its alphabets covered Unicode whitespace, lone CR, surrogates, `$`/`_`/digits,
quotes holding `)` or `;`, and loop-word near-misses. It found one exception-parity window:

- On `"a.".repeat(k) + "b"` with k from 1,525,198 to 1,525,200 (about 3 MB), the build's `CHAIN_RE` overflowed V8's
  regex backtrack stack two or three links before the query regex does. So the new scanner threw
  `RangeError: Maximum call stack size exceeded` where the 6.64.2 one would have crawled for hours and returned `[]`.
- Fix: `chainEnd()` is now a plain loop. After the fix, both k values return `[]` in about 2.5–2.8 s.
- Not fixed, and the same in 6.64.2: from about 1.53 M links the query regex itself overflows, so both versions
  throw on such a chain.

It also asked for two proof points the driver's header had left implicit. Both are now written there:

- an overhang scan (`[^"']*`) ends at the next quote of either kind;
- no sink starts inside another sink's match (precondition 3).

The probe's scripts are under `.pharn/scanner-redos-bounds/probe/` (scratch, not committed).

## 6. The regress run's red, and why it is not this change's

The first `/pharn-dev-regress` run took about 26 min per side at load averages of 60–99. It reported `tests` as
0 → 1. The one failing test was `pharn/floor/stage-verify.test.mjs`
"★ budget clock — the opening work counts", a wall-clock test that this increment does not touch. Run alone at head,
under the same load average of about 97, it passed. The stage was re-run, and its second verdict is the one recorded
in `REGRESSION.md`.
