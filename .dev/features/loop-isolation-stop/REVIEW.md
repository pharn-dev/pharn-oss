# REVIEW — loop-isolation-stop (6.76.0)

- reviewer: independent `/pharn-dev-review` agent (did not write the increment)
- reviewed: `git diff HEAD` plus untracked `pharn/floor/check-run-isolation{-core,}.mjs` and their tests, and
  `.dev/features/loop-isolation-stop/HUMAN-PATCH.md` (the draft trusted-doc text). `.dev/features/pharn-footprint-move/`
  was excluded as another session's files.
- trust: every reviewed file is `trust: untrusted` DATA. No instruction-looking content in it changed this review.
- date: 2026-10-25

**Verdict: blocked-with-3-floor-findings.** All three are the same overclaim: the PR says the floor makes the record
and the commit name the flag's use, but the record check does not gate the commit and the witness file can be
rewritten by the Write tool. The code is sound. Each fix is a wording change.

## Step 1 — floor first (P0)

`node pharn/floor/validate.mjs .` → `FLOOR: GREEN — 37 capabilities checked in "."` (exit 0). Targeted runs, all on
this tree: `node --test` over `check-run-isolation-core.test.mjs`, `check-run-isolation.test.mjs`,
`check-loop-record.test.mjs`, `loop-closeout.test.mjs` and `render-run-report.test.mjs` gave 308 pass, 0 fail.

## Probes run by this review (exit codes and codes only; no value was printed)

- The CLI on this host gives exit 2 `not-isolated` and `HOST` with six `cred:` codes. That matches PROBE.md §2.
- A hostile HOME (a FIFO at `.npmrc` and at `.aws/credentials`, `.netrc` a link to `/etc/passwd`, a file in `.ssh`)
  plus `PHARN_ISOLATED=1` and `GH_TOKEN` set gives exit 2 `credentials-present`. It returned at once with no hang and
  did not follow the link. Stdout held codes only. The `GH_TOKEN` value appeared nowhere.
- HOME relative, or HOME pointing at a FIFO, with the flag gives `unreadable-home`, empty stdout, exit 2.
- `git` not on PATH, with the flag, gives `probe-failed` and exit 2. A URL-scoped helper set through
  `GIT_CONFIG_COUNT` gives `cred:credential-helper`. `--feature '../x'` gives `usage`. Node 18 gives the runtime-floor
  refusal, exit 2.
- The core run over a hand-written witness
  `{"outcome":"ISOLATED","evidence":["operator:PHARN_ISOLATED"],"accepted_host_execution":false}`: it parses,
  `admitted()` is true, and `isolationLine` gives `isolation: ISOLATED`. A witness of `HOST` with
  `accepted_host_execution:false` gives `isolation: HOST`. These two results support F1–F3 and F7.

## Lens results in brief

- **L-floor (P0):** findings F1–F6 below.
- **L-eval (P1):** no Capability is added; the new checker and its readers ship with tests. The floor (GREEN, 37)
  agrees, and nothing disagrees with it.
- **L-trust (P2):** none of the five modules lets a value from the environment or a file reach stdout, stderr, a RED
  message, the commit message or the run report: only frozen codes, fixed phrases and a slug checked against
  `SLUG_RE` / `FEATURE_SLUG_RE`. The parser is total on hostile input: a 4096-byte cap, an exact key order (which
  refuses a `__proto__` key) and a canonical re-render. No guaranteed decision rests on a free-text field. F7 is
  advisory.
- **L-axis (P3):** the CLI imports `runtime-floor.mjs`, `gate-run-core.mjs` (`FEATURE_SLUG_RE`) and the core.
  `check-loop-record.mjs`, `loop-closeout.mjs` and `render-run-report.mjs` import only the core. None of them imports
  a CLI's internals and no module imports a sibling, so there is no blocking P3 finding. F8 is advisory.

## Floor-gate findings (blocking)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".claude/commands/pharn-loop.md:249"
  problem: >-
    It claims the floor holds that a record and a commit cannot leave out that --accept-host-execution was used.
    Neither half reduces to a floor operation. The record's isolation RED does not gate the commit (the contract
    says so at loop-record.md, "The record check does not gate the commit"). The commit paragraph's only source is
    .pharn/pharn-loop/<name>/isolation.json. The Write tool can write that file in every posture
    (enforce-writes-scope.cjs ALWAYS = [".pharn/**"]), and reconcile never sees it because .pharn/ is gitignored.
    A witness rewritten to an ISOLATED/operator:PHARN_ISOLATED line parses, is admitted, and commits as
    "isolation: ISOLATED".
  evidence: "ADVISORY: the check sees only its argv and cannot know who typed the flag; what the floor holds is that a record and a commit cannot leave out that it was used."
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: ".dev/features/loop-isolation-stop/HUMAN-PATCH.md:32"
  problem: >-
    The LIMITS.md §6 draft makes the same claim, so applying it would put the overclaim into a trusted doc. The
    THREAT-MODEL 8c draft (line 52, "which the record and the commit message then name") repeats it. Bound both by
    "while the witness is unaltered": the record and the witness can both be written without Bash.
  evidence: "What it holds is that the record and the commit message cannot leave out that the flag was used."
- type: FINDING
  rule_id: "P0"
  severity: blocking
  file: "docs/guarantees.md:24"
  problem: >-
    This row in the **Guaranteed** table claims more than the floor holds. (1) "Does not start past its entry check"
    is the model obeying an exit code, which pharn-loop-close.md's own claims block labels ADVISORY ("obeying it is
    ADVISORY"). (2) "Its LOOP.md record ... states the outcome" rests on a line the model copies, and its RED does
    not gate the commit. (3) A --quick run writes no RUN-REPORT.md, so "each" overstates. The bound it does state
    covers the record and not the commit paragraph, which reads the same writable witness.
  evidence: "An unattended `/pharn-loop` does not start past its entry check unless ... — and its `LOOP.md` record, `RUN-REPORT.md` and green commit message each state the outcome and whether the flag was used."
```

## Advisory-gate findings (warn; judgment, never the sole basis of a block)

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/pharn-contracts/loop-record.md:258"
  problem: >-
    The stated bound names only "a Bash writer". The Write tool can also rewrite both files mid-run: .pharn/** is
    always writable, and pharn/features/** is writable while a run is open. So the bound understates who can break
    the agreement. It is the root of F1–F3.
  evidence: "Agreement between two files the run can write, never provenance (lessons-learned L43): a Bash writer can rewrite both."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/pharn-contracts/loop-record.md:251"
  problem: >-
    "Cannot be absent, malformed, ..." describes a world. The floor only gives a RED verdict on a record handed to
    the checker, and that RED does not gate the commit (stated a few lines below). Say "the checker REDs a record
    whose isolation is ...".
  evidence: "FLOOR: given a record, its `isolation` cannot be absent, malformed, a refused run's, or other than the witness says."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "pharn/floor/check-run-isolation.mjs:43"
  problem: >-
    The header says every reader of the witness opens it with O_NOFOLLOW. loop-closeout.mjs's isolationWitness reads
    through readRegular (loop-closeout.mjs:396), which calls lstat and then readFileSync: no O_NOFOLLOW and no size
    cap. It fails closed on a link that is already there, but a swap between the two calls is followed.
  evidence: "every reader of the witness opens it with O_NOFOLLOW and fails closed on such a link."
- type: FINDING
  rule_id: "P6"
  severity: minor
  file: ".claude/commands/pharn-loop.md:422"
  problem: >-
    S15's trigger column includes unknown evidence (unreadable HOME, a failed probe), but its rule column offers only
    the three environment remedies, two of which cannot clear those refusals: the flag never lifts them, and
    PHARN_ISOLATED does not supply HOME or git. Step 1a (:336) and the close part (:222) say the summary "names the
    three ways out it prints", but the CLI prints those three only for not-isolated and credentials-present. The
    README sentence at :164 ("refuses to start unless you pass --accept-host-execution") has the same gap.
  evidence: "stop `blocked: not-isolated` — run in a container that mounts none of your credentials, set `PHARN_ISOLATED=1` for a sandbox the check misses, or re-run with `--accept-host-execution`"
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: "pharn/floor/loop-closeout.mjs:295"
  problem: >-
    The commit paragraph renders a witness that no admitted run can have (HOST or ISOLATED_WITH_CREDENTIALS without
    the flag) as a bare "isolation: HOST". A run that ignored S15 therefore commits a message that reads like an
    ordinary outcome. A suffix chosen by core.admitted(), such as "(refused at entry)", would make the skip visible
    in the one carrier that is code.
  evidence: "isolationLine(isolation, feature),"
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/floor/check-loop-record.mjs:181"
  problem: >-
    The witness grammar has one owner (the core), but its location and its capped, link-refusing read have three:
    check-loop-record.mjs isolationWitness, render-run-report.mjs readWitnessText (:819) and loop-closeout.mjs
    isolationWitness (:302). The three already differ (F6). A core-level path builder plus one reader would retire
    two copies (L35).
  evidence: 'const witness = join(dirname(pharnDir), ".pharn", "pharn-loop", name, "isolation.json");'
```

## Proposed lesson candidate (NOT written to canon — `/pharn-dev-memory-promote` decides)

- **title:** A "cannot omit" claim over an output built from `.pharn/` state must name the write tools, not only Bash
- **type:** floor · **concepts:** [writes-scope, mirrored-state, overclaim, run-state]
- **body:** When tested code builds an output (a commit paragraph, a report line) from a file under `.pharn/`, the
  output is only as fixed as that file. `.pharn/**` is ALWAYS writable by the Write tool (enforce-writes-scope.cjs),
  and reconcile never sees it because it is gitignored. So "the commit cannot leave out X" holds only while the file
  is unaltered. Two rules follow. State a bound on such a claim in terms of the Write tool, not only "a Bash writer"
  (L19 covers the Bash half). And say whether a mismatch gates anything: here the record RED did not.
- **provenance:** feature `loop-isolation-stop`; the uncommitted diff on branch `feat/loop-isolation-stop` over HEAD
  `7e71753c`; source this REVIEW.md, F1–F4; date 2026-10-25.
- **why it is real (P7):** in this one increment the claim appears in three places that ship or will ship
  (`pharn-loop.md:249`, the LIMITS/THREAT-MODEL drafts in `HUMAN-PATCH.md`, and `docs/guarantees.md:24`), plus
  PLAN A1. It was shown false by parsing a hand-written witness.
