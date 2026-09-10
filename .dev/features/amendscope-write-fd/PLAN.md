# PLAN — amendscope-write-fd

- spec_content_hash: 83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487 # fix #4
- applied_lessons: [L1, L29, L37]
- increment: Close the WRITE half of `amendScope()`'s check-then-use race — the record is read through a
  descriptor and then rewritten through its PATH, which CodeQL still reports as `js/file-system-race`
  (alert 5, high) on the analysis of this branch's current head.
- layer(s): none — `pharn/floor/` is floor infrastructure, not a capability; no contract, no `role:`
- constitution_refs: [P0, P5, P6, P7]

## Applied lessons

- L1 — `pharn/floor/reconcile-baseline.mjs` is named in CLAUDE.md's bump-triggering set, so this
  increment invalidates three meta-doc facts at once: `SKILLS_VERSION`, the `CHANGELOG.md` entry keyed
  to it, and the README shields badge that must agree with it. L1's remedy is to name those meta-docs in
  `## Files` rather than leave them to a later sweep, so all three are listed below. This is the same
  discipline the immediately preceding increment (`record-amendscope-hardening`) existed to discharge
  after `c338b9d` shipped product bytes without them.
- L29 — This is L29's exact shape, one increment later and in the same function. The TOCTOU pair has TWO
  members, read and write; `c338b9d` fixed the read, and its `★ amendScope reads the baseline through ONE
descriptor` test asserted the read half — a per-member assertion that read as a discharged per-set rule.
  Both survived review and a green suite while the write half stood. Per L29 the deliverable is the
  ENUMERATION, materialized where the rules iterate it: the replacement test matches EVERY `\w+Sync(abs`
  occurrence in the region and requires the list to be exactly `["openSync(abs"]`, so a path-addressed
  call added later — of any name, closing the variant-spelling hole L36 names — fails without anyone
  having to remember this class.
- L37 — L37 says a claim about a floor op must be PROBED against the op, not read off it. The prior fix
  was read off the source (an `openSync` appears, therefore the race is closed) and CodeQL disagreed on
  the very next analysis. What can be executed here is executed: the truncation behaviour is asserted by
  a test that FAILS without `ftruncateSync` (the padded-record case below), and the enumeration is
  asserted over the source region rather than over one member. What CANNOT be executed is stated instead
  of glossed: no CodeQL CLI is installed on this machine (`which codeql` → not found), so the claim
  "alert 5 is resolved" is settled by the next analysis on push, NOT by anything in this repo.

## Files

- `pharn/floor/reconcile-baseline.mjs` — `amendScope()` reads AND writes one `r+` descriptor
- `pharn/floor/reconcile-baseline.test.mjs` — replace the read-only pin with the enumeration; add the truncation test
- `SKILLS_VERSION` — bump 5.1.1 → 5.1.2 (patch: a correction to bytes already on the product surface)
- `CHANGELOG.md` — the `[Unreleased]` → `### Fixed` entry recording the bump
- `README.md` — move the shields badge 5.1.1 → 5.1.2 so `check:badge` stays GREEN
- `.dev/features/amendscope-write-fd/PLAN.md` — this file (apparatus; no bump)

## Contracts satisfied

- `pharn/pharn-contracts/reconciliation-record.md` — unchanged. The record's SHAPE, its fields and the
  bounds it states are untouched; only the syscalls that put the same bytes on disk change. Cited, not
  restated (P4).

## Evals to write (P1)

- None, by membership test: P1 binds capabilities, and a file becomes a capability the moment its
  frontmatter carries `role:`. No file in `## Files` carries one and none is added, so the obligation
  does not attach. The floor's own coverage obligation is discharged by `*.test.mjs` instead, which is
  where every other `pharn/floor/` checker's is.

## What is being fixed (measured live this run — P6)

`gh api repos/pharn-dev/pharn-oss/code-scanning/alerts/5` reports `js/file-system-race`
(CWE-367, security-severity high) at `pharn/floor/reconcile-baseline.mjs:216`, with the check it pairs
against at `:189`. The analysis carrying it (`2026-09-10T15:50:56Z`) ran on the merge of this branch's
CURRENT head `a331f22`, whose parents are `7035087` and `a331f22` — i.e. the alert is live against the
code as it stands, AFTER `c338b9d`'s read-side fix, not a stale instance of the defect that fix removed.

The surviving pair is:

- `:189` `fd = openSync(abs, "r")` — the file is opened and its bytes parsed through the DESCRIPTOR.
- `:216` `writeFileSync(abs, …)` — the amended record is written back through the PATH, which is
  re-resolved. Between the two the name can be replaced, unlinked, or pointed at a symlink, so the file
  that receives the amendment need not be the file whose bytes were amended.

The fix is the one CodeQL's own guidance names: use the descriptor for both. `amendScope()` now opens
`r+` once, reads that descriptor, and replaces its contents in place — `ftruncateSync(fd, 0)` followed by
a `writeSync` loop at offset 0 — closing the descriptor in a `finally` that spans both.

**Two things move, and naming them is what a patch entry is for.**

1. `ftruncateSync` is load-bearing, not ceremony. `writeFileSync(fd, …)` neither truncates nor seeks, so
   a record that got SHORTER would keep the previous tail as trailing garbage. The path write it replaces
   truncated implicitly (`O_TRUNC`); the fd write must do it explicitly. Asserted by a test that pads the
   record with 4 KiB of (JSON-legal) trailing whitespace and requires the amended file to be byte-exactly
   its own canonical serialization.
2. One error message changes. Opening `r+` needs write permission, so a read-only or otherwise
   unwritable record now fails at OPEN rather than at the write, and reports
   `cannot open …: <message>` where it previously reported `cannot write …: <message>`. Both are exit 2
   with nothing written, so the fail-closed behaviour is identical; the string a caller sees is not.
   `ENOENT` is unaffected — `r+` does not create, so the `"no baseline at … — run --anchor first"`
   message that `★ FAIL-CLOSED: --amend-scope with NO baseline` pins is byte-identical.

## Guarantee audit (P0)

- "the amendment lands in the file whose bytes were parsed" → **floor: the operation itself.** After the
  open, no operation in the function addresses a NAME; the kernel binds the descriptor to one inode.
  This is a property of the syscalls, verified structurally by the enumeration test — not a check that
  runs at reconciliation time.
- "no path-addressed fs call is ever added back to this region" → **floor: enum-regex (primitive #3)** —
  the replacement `★` test, which matches every `\w+Sync(abs` in the region and requires the list to
  equal `["openSync(abs"]`.
- "a shorter record leaves no trailing bytes" → **floor: the padded-record test**, which fails if
  `ftruncateSync` is removed.
- "CodeQL alert 5 is resolved" → **advisory, and it must not be written as anything else.** No CodeQL
  CLI is installed here, so nothing in this run executes the analyzer that raised it. The structural
  property the rule tests is what has been changed; whether the rule agrees is settled by the next
  analysis on push. Recording this because the previous increment's failure was precisely to treat a
  correct reading as a verification (L37).
- "the write is ATOMIC" → **struck. Not claimed, and it never was.** Truncate-then-write has a window in
  which a crash leaves a partial record — the same window `writeFileSync`'s `O_TRUNC` had. Downstream
  that is not a silent pass: `check-bash-reconcile.mjs` reports an unparseable baseline as
  `INCONCLUSIVE` at exit 2 (fail-closed, P5). An atomic replacement would mean write-temp-then-rename,
  which re-introduces a path operation and a second inode, and no observed failure asks for it (P7).
- "5.1.2 is the correct bump size" → **advisory** — CLAUDE.md's patch/minor/major rule is prose applied
  by judgment; no checker reads it. Patch: a correction to bytes 5.1.0 already put on the product
  surface, no capability added, every success path byte-identical.

## Trust audit (P2)

The one untrusted input consulted is the CodeQL alert body fetched over `gh api`. It is read as DATA —
a rule id, a path, two line numbers — and every claim taken from it was re-derived against local bytes
(the lines were read at those numbers; the analysis commit was resolved against `gh api commits`).
Nothing in the alert's `help` prose is followed as an instruction. The baseline record itself is
unchanged in trust: `pharn/pharn-contracts/reconciliation-record.md` already concedes it is
unauthenticated state in a writable tree, and this increment does not touch that bound.

## Determinism audit (P5)

No branch is added. `r+` versus `r` is a constant; the write loop's condition is a byte count. The one
judgment in the increment — the bump size — is CLAUDE.md's rule applied by a human, and it is recorded
in the CHANGELOG entry where a reader can dispute it.

## Known residuals

- **The window is narrowed to zero for THIS function only.** `--anchor`'s `mkdirSync` + `writeFileSync`
  creates the record rather than amending one, so it has no read to race against; `--show` reads through
  a descriptor and writes nothing. No other `pharn/floor/` file was audited for this class in this
  increment.
- **`snapshotScope()` still reads `.pharn/writes-scope.json` by path.** That is a single read with no
  paired check, so it is not this rule's shape, and the scope file's trust bound is already stated in
  `pharn/pharn-contracts/reconciliation-record.md`.
