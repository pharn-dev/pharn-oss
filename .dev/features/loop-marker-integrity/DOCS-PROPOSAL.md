# DOCS-PROPOSAL — loop-marker-integrity (batch audit-2026-11-03, G2)

Exact replacement text for the trusted docs this increment invalidates. The agent cannot write these files
(protect-trusted-paths.cjs); the orchestrator folds this into the owner-run docs script. Line numbers are as of
`origin/batch/audit-2026-11-03` (== main `dd0bb3d3`). Each block replaces the quoted lines verbatim; nothing else in
the file moves. Version cites say `7.3.0`, the batch release.

## 1. `pharn/LIMITS.md:154-155` (§3a) — who chose quick under `/pharn-loop`

Review SPEC: "the person who typed `--quick`" does not exist under `/pharn-loop`, whose model writes and approves the
quick SPEC (`pharn/floor/loop-mode-core.mjs:36-38`, `.claude/commands/pharn-loop.md` "the model writes AND approves the
kind").

Old (`pharn/LIMITS.md:154-155`):

```text
> record, the commit message and the summary name the mode after the run. The person who typed `--quick` chose it,
> and the model's reading of that flag is advisory, as for `/pharn-ship`.
```

New:

```text
> record, the commit message and the summary name the mode after the run. Under `/pharn-loop` the SPEC's kind is the
> model's: it writes and approves the quick SPEC. Since 7.3.0 the run's Stop-guard marker records the mode the run was
> opened with, at Step 1a before any SPEC exists (`require-loop-record.cjs --open … --mode <mode>`), and
> `check-loop-decision.mjs` refuses to commit a record whose mode differs from it (`MODE_UNWITNESSED`). That binds the
> kind to a value fixed at entry; it is not proof of what the person typed — the model reads its own argv to fill
> `<mode>`, and the marker is run-writable state (agreement between files, never provenance).
```

## 2. `pharn/LIMITS.md:411-412` (§6) — the override is no longer pre-approved

Old (`pharn/LIMITS.md:411-412`):

```text
  unless it finds a container marker and none of a fixed list of credentials, or the operator passed
  `--accept-host-execution` (`pharn/pharn-contracts/loop-record.md`, "The isolation field"). The verdict over its probe
```

New:

```text
  unless it finds a container marker and none of a fixed list of credentials, or the operator passed
  `--accept-host-execution` (`pharn/pharn-contracts/loop-record.md`, "The isolation field"). Since 7.3.0 the line that
  passes the flag is not in `/pharn-loop`'s `allowed-tools` and the CLI accepts the flag only as its first argument, so
  no pre-approved line can carry it: Claude Code's own permission settings decide whether the person is asked before it
  runs. In auto mode, or under an allow rule of the person's, it may still run without asking, and then the model's
  reading of its own argv is what lifts the stop. The verdict over its probe
```

## 3. `pharn/LIMITS.md:419-421` (§6) — the same bullet: who chose, and who can rewrite the witness

Old (`pharn/LIMITS.md:419-421`):

```text
  - **The floor sees argv, never who typed the flag, and the record of it is run-writable.** The record, the run report
    and the commit message repeat the witness file `pharn/.run/pharn-loop/<name>/isolation.json`. That file is
    git-ignored `pharn/.run/` state that the Write tool reaches in every posture and that a `Bash` write reaches too,
```

New:

```text
  - **The floor sees argv, never who typed the flag, and the record of it is run-writable.** Not pre-approving the
    flagged line (7.3.0) moves the choice to Claude Code's permission prompt, which a person answers in the default
    mode and nobody answers in auto mode; PHARN sees neither. The record, the run report
    and the commit message repeat the witness file `pharn/.run/pharn-loop/<name>/isolation.json`. That file is
    git-ignored `pharn/.run/` state. Since 7.3.0 the write tools are denied it (`protect-trusted-paths.cjs` refuses every
    Write/Edit/MultiEdit/NotebookEdit below `pharn/.run/pharn-loop/`), but a `Bash` write reaches it,
```

## 4. `pharn/LIMITS.md:564-569` (§7) — the Stop guard's marker: re-open refusal and its residual

Old (`pharn/LIMITS.md:567-569`):

```text
  and is satisfied by any non-empty file. A hook that cannot start, times out, or crashes lets the turn
  end, which is the safe direction for a guard that ends turns. Its wiring is exec form, so the
  quote-character bound above does not apply to it.
```

New:

```text
  and is satisfied by any non-empty file. A hook that cannot start, times out, or crashes lets the turn
  end, which is the safe direction for a guard that ends turns. Its wiring is exec form, so the
  quote-character bound above does not apply to it. Since 7.3.0 its `--open` refuses to overwrite an open marker and
  publishes the marker whole (a tmp file and a rename), and `protect-trusted-paths.cjs` denies the write tools every
  file below `pharn/.run/pharn-loop/`, `pharn/.run/pharn-ship/` and `pharn/.run/pharn-review/` (the runs' markers and
  witnesses, which only PHARN's CLIs write), so neither the marker's own pinned line nor the Write tool can rewrite the
  cap and mode the run opened with, and a crash cannot leave a torn marker. **What still reaches the marker, stated:** a
  `Bash` write, which no hook sees; and `--close`, which is pre-approved too because the Final step needs it, so
  `--close`, then `--open` with a new cap, then `pre-run-snapshot.mjs --capture` re-opens a run in three pre-approved
  lines, and every check that compares the record's cap or mode with the marker's then agrees. That is agreement
  between files the run can write, never provenance.
```

## 5. `pharn/THREAT-MODEL.md:177-178` (8c) — the override is not pre-approved

Old (`pharn/THREAT-MODEL.md:177-178`):

```text
the loop refuses to start without evidence of an isolated environment holding none of a fixed list of credentials,
unless the operator passes `--accept-host-execution` (`pharn/floor/check-run-isolation.mjs`). The record, the run
```

New:

```text
the loop refuses to start without evidence of an isolated environment holding none of a fixed list of credentials,
unless the operator passes `--accept-host-execution` (`pharn/floor/check-run-isolation.mjs`). Since 7.3.0 the line that
passes it is not pre-approved, so the harness's permission settings, not the loop's grant, decide whether a person
confirms it; in auto mode nobody may. The record, the run
```
