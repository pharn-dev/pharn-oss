# PLAN — run-gates-dangling-link-containment

- spec_content_hash: 2f8b92646bdf31d51169f46c74c14c10debdb456291fb0213be63cfc4d77e838
- applied_lessons: [L4, L34, L52, L54]
- increment: `run-gates.mjs`'s containment walk proves absence with `lstat` ENOENT instead of `existsSync`, so a dangling symlink or a file component is refused as `path-containment` rather than crashing `init`.
- layer(s): `pharn/floor/` (one product-floor checker and its suite)
- constitution_refs: [P0, P5, P7]

## Why (a real failure — P7)

`.dev/features/loop-freshness/REVIEW.md`, advisory finding 1, is now canon as L54. `assertContained`
(`pharn/floor/run-gates.mjs:147`) walks every component of `--out` and uses `if (!existsSync(cur)) break;`
as its absence test (`:162`). `existsSync` stats, and stat follows a link. The consequences:

- A **dangling** symlink component reads as absent, so the walk stops before `lstat` ever sees it.
- A component that is a **regular file** also reads as absent for everything beneath it (ENOTDIR).

**Reproduced at `daaa999` in a scratch repo:**

- `init --out .pharn/linked/gates` with `.pharn/linked` → a missing target: an uncaught `ENOENT … mkdir`
  from `startRecord` (`:449`), a stack trace, exit 2, **no JSON on stdout** and no `reason_code`.
- `--out .pharn/afile/gates` with `.pharn/afile` a regular file: the same crash shape.
- In both cases nothing was written outside the state root. The runner **fails closed** by crashing, but
  not in the way the contract promises. A caller that branches on the closed `reason_code` set gets no
  document at all.

## Discovery (live)

- **Call sites.** `assertContained` has exactly two callers:
  - `runInit` (`:331`) — this is the crash path.
  - `runNext` (`:634`) — it reads `state.json` first (`:624`), so a dangling `--out` there already exits
    `stamp-missing` with a document, before containment is ever reached.

  The fix is in the one shared function, so both callers get it.

- **Other `existsSync` uses in the file:** `:347` (`--spec-from`), `:624` and `:625`. None of them is a
  containment test. `:624` / `:625` read paths below an `--out` that has not been containment-checked
  yet. That is a READ-before-check ordering, and the contract's containment rule ("every path this
  runner writes or deletes") covers writes. It is named here and not changed (see Not in scope).
- **The current test** (`run-gates.test.mjs:127`, "CONTAINMENT … (L52: each case)") covers outside,
  equal-to-root, `../`, and a LIVE symlink. It has no dangling-link case and no file-component case.
  That gap is why the defect shipped in #230.
- **Contract.** `gate-run-record.md` does not describe the walk, and CLAUDE.md's "containment-checked, no
  symlink component" becomes more true. Neither changes.

## The change

In `assertContained`, replace the `existsSync` guard with an `lstat` whose ENOENT is the only absence
proof:

```js
let st;
try {
  st = lstatSync(cur);
} catch (e) {
  if (e && e.code === "ENOENT") break; // lstat does not follow links, so a dangling one never lands here
  fail("path-containment", `cannot lstat ${cur}: ${e.message}`);
}
if (st.isSymbolicLink()) fail("path-containment", `refusing a --out path that traverses a symlink at ${cur}`);
```

- A dangling link is lstat'ed as a symlink and refused.
- A file component produces ENOTDIR on the next component. That is refused as `path-containment`
  ("cannot lstat"), which is the branch that already existed.
- The comment above the walk gains the reason `existsSync` is not the test here (L54).
- `existsSync` stays imported: `:347` and `:624` still use it.

## Files

- `pharn/floor/run-gates.mjs` — `assertContained`: `lstat`-ENOENT as the absence test; comment names why
  — product floor
- `pharn/floor/run-gates.test.mjs` — a CONTAINMENT test iterating three cases: (a) a DANGLING symlink
  component (`.pharn/linked` → missing), (b) a FILE component (`.pharn/afile/gates`), and (c) a dangling
  STATE ROOT (`.pharn` → missing). Each asserts exit 2 and a parsed stdout document with
  `reason_code: "path-containment"`, and (a) and (c) assert that the link's target was not created. The
  ordinary-path accept on a clean fixture is the non-vacuity control (L34) — test

- `CHANGELOG.md` — `[Unreleased]` → `### Fixed`, carrying `6.12.1` — repo meta
- `SKILLS_VERSION` — `6.12.1` — repo meta
- `README.md` — the shields badge only — repo meta

### Deliberately NOT in scope

- `runNext`'s read-before-containment ordering (`:624`–`:634`). It reads, never writes, through an
  unchecked `--out`, and a dangling one already yields `stamp-missing`. No observed failure, so nothing is
  built (P7). It is named here so the next reader does not rediscover it.
- A general floor check banning `existsSync` in containment code (L54's "unbuilt" half). It would be a
  pattern over source text and would pin one shape. There is no trigger beyond the two instances this
  increment and #242 have now both fixed.
- `.dev/memory-bank/lessons-learned.md` L54, whose "(1) … is the named follow-up" becomes history. Canon
  is annotated only through the ordinary gated path, and a build plan cannot write canon (the canon
  denylist). A historical sentence stays true.

## Applied lessons

- L54 — this is its instance (1), fixed as that entry prescribes: `lstat` with a try/catch, plus a
  dangling-component case.
- L52 — the refusal rule ranges over a set of path shapes (dangling link, file component, dangling
  state root). The test iterates every member, not only the one the review named.
- L34 — every refusal pairs with the non-vacuity control already in the test: the ordinary `--out` is
  accepted by the same fixture.
- L4 — the new test is run against the UNFIXED code first and must fail there. A test that passes before
  the fix proves nothing. The red/green result is reported in `VERIFY.md`.

## Guarantee audit (P0)

- "A `--out` with a symlink component, dangling or live, is refused before anything is created" → FLOOR
  (enum/filesystem check in tested code, `run-gates.test.mjs`), within the bounds already stated. It is
  checked once per invocation, so a component swapped between the check and the `mkdirSync` is a TOCTOU
  window the header does not claim to close.
- "A refusal is a closed `reason_code` document, not a crash" → FLOOR, for the file-component and
  dangling cases the test iterates. Other `lstat` errors (EACCES, ELOOP) take the same branch, but no
  test reaches them. That is stated, not claimed.

## Trust (P2) / Determinism (P5)

No new input. The branch is `e.code === "ENOENT"`, a membership test; anything else fails closed.

## Acceptance

- The new test fails on `daaa999`'s `run-gates.mjs` and passes after the fix.
- `npm run check` GREEN.

## Open questions (HALT)

- None. GATE 1 is decided by the model under the user's standing delegation for `/pharn-dev-ship` runs.
