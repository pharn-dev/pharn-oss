# REVIEW — loop-driver-spike

**Floor first.** `node pharn/floor/validate.mjs .` is GREEN (37 capabilities). This increment adds no capability, so
the floor has nothing of its own to check here. `/pharn-dev-verify` read PASS over `test`, `validate`, `lint`,
`format:check`, `lint:md`, `instruction-growth` and `reconcile`, with completeness exit 0.

The increment under review is `trust: untrusted`. Nothing in the reviewed files, the run outputs, or the quoted model
text (the question probe's question, the tool results) asked this review to do anything, and nothing was followed.

## Floor-gate findings

None.

## Advisory findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/loop-driver-spike/driver/driver-core.mjs:17"
  problem: "The header says the interpreter's conditionals are of four kinds only, but the region also branches on a step's static shape (its kind, whether it captures, redirects or resumes) and on errors (try/catch turning a throw into exit 70 or a blocked S9); RECORD.md §3 repeats the four."
  evidence: "The interpreter's conditionals are of four kinds only: (1) the exit-code lookup itself, (2) its own bounds … (3) argument validation, and (4) assembling the record"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/loop-driver-spike/kit/README.md:60"
  problem: "Step 5 runs measure.mjs from the kit copy, but measure.mjs imports pharn/floor/transcript-core.mjs by a repository-relative path, so it resolves only inside a PHARN-OSS checkout; the line also omits --transcripts, without which output tokens are under-reported."
  evidence: "node <kit>/driver/measure.mjs --driver <root>/runs/driver-1/out \\"
- type: FINDING
  rule_id: P2
  severity: minor
  file: ".dev/features/loop-driver-spike/kit/intent.md:1"
  problem: "The plan said kit/intent.md would hold the increment description; it holds the extraction rule instead, because the description is a private project's text. The deviation is stated in the file and in RECORD.md, and is the safer direction."
  evidence: "That text belongs to a private project, so it is not copied into PHARN-OSS."
```

## The four lenses, briefly

- **L-floor (P0).** Every claim in RECORD.md is labelled measured (from the runs' outputs), floor (the product
  checkers inside the closeout, and the hook's deny), or advisory (the no-go, the reading of S6c as variance). Its
  struck list names the three tempting overclaims. No figure was found that is not in the runs' outputs:
  - per-session tokens: the transcripts, read with `sessionRequests`;
  - minutes: the steps log and the transcripts' timestamps;
  - shares: the per-context sums.

  The one inaccuracy is the four-kinds sentence above.

- **L-eval (P1).** No capability and no `rule_id`, so there is no eval obligation. The apparatus test runs in CI's
  `npm test`.
- **L-trust (P2).** The driver branches on exit codes only. Closed tokens go through `token-exit.mjs`. The model's
  prose is logged as DATA and never parsed, and RECORD.md quotes it fenced or in quotes. The private intent text never
  enters the repository: only its SHA-256 does.
- **L-axis (P3).** One reason to change per file: program and interpreter, IO, token mapping, measurement, test, kit.
  The import direction is `.dev/` → `pharn/` only: the test imports `loop-record-core.mjs`, and `measure.mjs` imports
  `transcript-core.mjs`. No sibling module reference.

## Verdict

GREEN — 0 floor-gate findings, 3 advisory (1 important, 2 minor). The first two can be fixed inside the plan's
`## Files`.

## Proposed lesson candidate (for the GATE-2 step; not written to canon here)

- **Candidate:** a headless `claude -p --output-format stream-json` stream carries each message's usage as it was
  streamed. Its `output_tokens` under-reports the request: 278 against the session result's 14,006 in `driver-1`'s spec
  session. So a measurement reads per-request tokens from the transcript with the ledger's reader, never from the
  stream.
- **Source:** this REVIEW.md and RECORD.md §4. The measure script now does this, and the docstring of its
  `transcriptRequests` names it.
