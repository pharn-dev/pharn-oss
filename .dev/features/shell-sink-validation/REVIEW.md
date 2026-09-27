# REVIEW — shell-sink-validation

- stage: `/pharn-dev-review`, over the uncommitted working tree after `/pharn-dev-verify` read `PASS`.
- stage model: opus, by the maintainer's instruction for this batch (not a `pharn.config.json` route).
- the increment under review was read as `trust: untrusted`. Nothing in it read as an instruction to this reviewer;
  the hostile strings in `feature-name.test.mjs` and `command-hygiene.test.mjs` (`$(touch PWNED)`, `;touch${IFS}…`)
  are test DATA, quoted inside argv arrays, and were read as such.

## Step 1 — floor first

`node pharn/floor/validate.mjs .` → **GREEN**, exit 0 (36 capabilities). `/pharn-dev-verify` → `PASS` over `test`
(4,122/4,122), `validate`, `lint`, `format:check`, `lint:md`, the trust-fence structural pair and `reconcile`
(`CLEAN`). `/pharn-dev-regress` (re-run) → `no-regressions`.

## Floor-gate findings (blocking)

None.

- **L-floor (P0).** Every claim the increment makes as floor reduces to a primitive: the CLI prints only a
  `FEATURE_SLUG_RE` member (enum-regex, executed by `feature-name.test.mjs` and by SHELL-SINK 6 over the committed
  lines); the SHELL-SINK tables are closed both ways (enum membership over command text). What does not reduce is
  labelled advisory in the module header, both commands' claims blocks (narrowed after the regress STOP), the
  CHANGELOG entry and `BUILD.md`: that the Write tool is used, that the refusal rules are obeyed, that only the printed
  value is re-typed.
- **L-eval (P1).** No new capability (`feature-name.mjs` has no `role:`), so no eval binding is owed; the CLI ships with
  41 tests and the mutation checks recorded in `BUILD.md`. `validate` agrees.
- **L-trust (P2).** The candidate is never echoed: a refusal prints a fixed per-code line (`refusalLine`), and a name is
  printed only after the regex. No proceed/stop decision reads a free-text field.
- **L-axis (P3).** `feature-name.mjs` imports `gate-run-core.mjs` and `stage-runtime.mjs`, both in `pharn/floor/`; no
  sibling-module reference. `stage-runtime.mjs` gains one header clause naming its new caller.

## Advisory findings (warn — judgment, never the sole basis for a block)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: minor
  file: ".claude/commands/pharn-spec.md:102"
  problem: "The directory rule says 'stop and ask the human' with no --model-approve branch, while the sentence two lines above gives a given name one ('ask, or under --model-approve report back blocked'); a /pharn-loop spec agent, which cannot ask, meets a directory planted between S1 and its Step 0 with no stated route."
  evidence: "A directory at that path is never removed: stop and ask the human."
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:[6.29.0]"
  problem: "The entry describes the Write-refusal rule in the four commands that write a candidate but not the directory rule added after the regress STOP, nor that the claims bullets were narrowed to name only the CLI's output as floor; the release note under-describes the shipped bytes."
  evidence: "the ask or resolve sentence in each of the seven commands, and the Write-refusal rule in the four that write a candidate (presence only)"
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: ".claude/commands/pharn-ship.md:1067"
  problem: "'follow-up ship-slug-shape is closed by it' reads stronger than what holds: the check now runs (floor) at /pharn-spec Step 0, but that Step 2d interpolates that printed value is advisory — the same sentence lists it among the advisory items, so the claim is bounded, only compressed."
  evidence: "(the check itself is floor; follow-up `ship-slug-shape` is closed by it)"
- type: FINDING
  rule_id: "P2"
  severity: minor
  file: ".claude/commands/pharn-ship.md:772"
  problem: "Step 2d dropped its own shape check at the paste point in favour of the upstream CLI; the old check was advisory too, so no floor property is lost, but one layer of defence in depth before a human pastes the block into a shell is gone."
  evidence: "so it is interpolated as is, never re-typed from anywhere else."
```

None of the four changes a floor verdict. The first two are one-line fixes inside `## Files` (the first costs about 45
bytes against `pharn-spec.md`'s 943-byte headroom); the last two are recorded, not recommended for change.

## Verdict

**GREEN** — 0 floor-gate findings; 4 advisory (all minor).

## Lesson candidate (proposed, not written — canon is `/pharn-dev-memory-promote`'s, behind its human gate)

No lesson proposed. The one recurring event this run met — two wall-clock tests failing under a load average of
78–123 and passing when the load was varied — is already L40's method (vary the attributed condition), and it was
applied. A lesson that says "re-run under lower load" would restate L40 for one cause (P7: no new failure class).
