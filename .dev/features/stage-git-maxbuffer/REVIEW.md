# REVIEW — stage-git-maxbuffer

- reviewed: the working-tree increment on `70cb51c` (6.28.2) — six product-floor modules, five floor test files,
  `CHANGELOG.md` `[6.28.3]`, `SKILLS_VERSION`, the README badge, and this feature's `PLAN.md`, `GRILL.md` and `BUILD.md`.
- stage model: opus, by the maintainer's instruction for this batch. **A self-review**: the agent that planned and
  built the increment reviewed it inline (the batch forbids spawning a reviewer). Weigh it as such; an independent
  review would be stronger.
- floor first (Step 1): `node pharn/floor/validate.mjs .` → **GREEN, exit 0** (36 capabilities).
- trust (P2): the increment under review is `trust: untrusted`. Nothing in it read as an instruction to the reviewer.
- probes this stage ran (L37): `gitFailureDetail` over REAL node error objects — ENOBUFS with a Buffer stderr and with a
  string stderr, a timeout (`ETIMEDOUT` with `SIGTERM`), a git exiting 128 with a message; each gave the documented
  text. Two of the build's negative controls re-run in a temp copy of the floor: the review emitter without its
  ceiling turns its ★ LISTING test red, and `gitSync` without its ceiling turns regress's ★ LISTING test red.

## Verdict

**GREEN — 0 floor-gate (blocking) findings.** Advisory: 1 important, 3 minor.

## Floor-gate findings (blocking)

None. Every guarantee the increment claims either reduces to the floor or is labelled: the ★ GIT CEILING and
★ GIT-FAILED DETAIL closures are enum/regex checks run by `npm test`, each with its bound stated where it lives
(presence of a `maxBuffer`, not its size; the `<fn>("git"` spelling; the name-level `rev-parse`/`merge-base`
exemption; a lexical scan of three modules); the crossing behaviour is tested behaviour, measured past 1 MiB and never
claimed at the 256 MiB ceiling; `validate` is GREEN; no capability, `rule_id` or contract changed (L-eval has nothing
to bind); no file gained a second axis of change or a sibling reference (L-axis).

## Advisory findings

### L-floor (P0)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/stage-regress.mjs:208"
  problem: "The argv-size limit recorded under regress-inside-echo-list is measured on darwin at about 1 MiB of changed names, but Linux's documented per-argument cap is 131,072 bytes, so on CI's platform and many users' the same verdict-phase stop would come at roughly 128 KiB of changed names — a feature touching a couple of thousand files — which makes that follow-up the next likely availability failure after this one. The claim 'a big repo with a modest change' is accurate, but 'modest' is platform-dependent and about eight times smaller on Linux."
  evidence: "Linux caps one argument at 131,072 bytes, its documented MAX_ARG_STRLEN — not measured here."
```

Disposition: recorded, not fixed (GATE 1 Q3). Recommendation for the maintainer: prioritize
`regress-inside-echo-list`'s array-safe verdict input, and measure the Linux limit once (a CI probe) before relying on
the 128 KiB figure.

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".dev/features/stage-git-maxbuffer/GRILL.md:124"
  problem: "The grill log keeps the plan-time phrase 'the ceiling allocates nothing up front (measured at plan time)', which goes past what was measured; the build corrected it in the CHANGELOG and BUILD.md to the measurement (twenty calls did not raise the resident size), and the grill log is left as that stage's record."
  evidence: "the ceiling allocates nothing up front (measured at plan time)"
```

```yaml
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/render-review-assignments.mjs:142"
  problem: "The emitter's catch still maps every git failure — a bad base, a missing repository, and now only an overflow past 256 MiB — to the refusal 'the git merge-base diff yielded nothing', so that refusal can still name the wrong cause; the comment states it, the refusal text does not."
  evidence: 'the catch still reads as an empty diff (the documented "not a git repo" branch), so the refusal can still name the wrong cause.'
```

Disposition: named for a follow-up — the refusal could carry the git failure's cause the way `gitFailureDetail` now
does for the stage scripts. Out of this finding's scope.

### L-eval (P1)

No capability, eval or `rule_id` is touched; `validate` agrees. The new tests carry their falsifiers (L60): the
build's table of ten mutant runs, each red, and the two this review re-ran.

### L-trust (P2)

No finding. `gitFailureDetail` puts git's stderr — which can carry contributor-chosen file names — into `git-failed`
details exactly as raw stderr went there before, now followed by fixed text and node's error code. The thin commands
present `detail` as quoted DATA, `stage-verify.mjs` still quotes it through `dataText`, an `unusable` exit writes no
artifact, and no proceed/stop decision reads a `detail`.

### L-axis (P3)

```yaml
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/floor/stage-verify.test.mjs:360"
  problem: "The mutation anchor ', maxBuffer: GIT_MAX_BUFFER' is spelled in four test files and the ~12-line big-tree builder in five, so a respelling of gitSync's options object turns four suites red at once — loudly, since each asserts its anchor before mutating, never silently."
  evidence: 'const CEILING_OPT = ", maxBuffer: GIT_MAX_BUFFER";'
```

Disposition: accepted. Each suite in this floor builds its own fixtures, and a shared helper would either ship (a
non-test module under `pharn/floor/`) or run as a test file.

## Proposed lesson candidate (for `/pharn-dev-memory-promote`; not written here)

- **title:** A present-tense "unchanged" claim is dated — the next change to that behaviour falsifies it, and nothing
  reads it
- **type:** `contract` · **concepts:** `doc-drift`, `temporal-state`, `dated-claim`, `shipped-surface`,
  `lesson-recurrence`
- **source:** `.dev/features/stage-git-maxbuffer/BUILD.md` ("What landed", the `stage-regress.mjs` and
  `scope-inputs.mjs` bullets) + this `REVIEW.md` (this candidate).
- **body (DATA, drafted):** Three comment sentences in two shipped modules said the stage's detail strings were
  "unchanged", kept "byte for byte", or that the script "keeps every detail string it printed before". Each was true of
  the refactor that wrote it (6.26.0's extraction, 6.28.0's move) and became false the moment this increment changed the
  `git-failed` details — in files the increment was editing anyway, with every gate green and no checker reading the
  claims. The non-test `pharn/floor/*.mjs` modules carried 75 lines matching "byte for byte", "byte-identical", "is
  unchanged" or "are unchanged" at the base commit (`git grep -i`; 74 after this increment's rewording) — not every one
  a claim about behaviour, but each a place the same drift can land. The three were caught only because the build
  grepped its own diff's neighbourhood
  (L64's discipline). Remedy: write such a claim anchored to the change it describes — "the 6.26.0 extraction left
  every detail text unchanged" — never as a standing property of the file; and when an increment changes a behaviour,
  grep that module's header for the words above before handing off. **Honest trigger (P7):** three sentences, one
  increment, caught at build before review, never shipped false — by L20's bar a first occurrence of this claim
  shape, and a sibling of L33's "not yet built" class (a claim that expires when later work lands), with the polarity
  reversed. For the human at the ship gate to take or decline.

## Honest residual

This review is advisory and self-authored. Its floor content is `validate` GREEN, already gated at build and verify.
A defect none of the four lenses looked for is not excluded by a GREEN here.
