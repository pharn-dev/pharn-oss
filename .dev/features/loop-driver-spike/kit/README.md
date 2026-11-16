# CORE-113 kit — one driven quick loop, then the same feature through `/pharn-loop --quick`

Dev apparatus for the loop-driver spike (`../PLAN.md`, record `../RECORD.md`). Run each step **from a terminal**. Do
not run them from inside a Claude Code session: the driver and the comparison each start headless `claude -p`
sessions, and Claude Code's auto-mode classifier refuses a nested headless session.

Every path below is an argument. Nothing is read from the environment, and no step carries a value into the next.
`<root>` is a scratch directory outside both repositories, for example `/private/tmp/claude-501/core-113`. The
measured project (`~/Projects/pharn-app`) is only read: the kit makes a no-hardlinks clone of it and removes the
clone's `origin` remote, so no run can push.

## The steps, in order (run them sequentially, never in parallel)

The two model runs share the machine's CPU with the project's test suite. An earlier record blamed machine load for
`test` timeouts, so run them one after the other, with nothing else heavy running, or their minutes are not
comparable.

1. **Set up the measure base** (a few minutes; it runs `npx @pharn-dev/pharn@latest update --yes`):

   ```bash
   bash <kit>/kit/setup.sh <root> ~/Projects/pharn-app <pharn-oss checkout at 7.19.0>
   ```

   It prints the intent's SHA-256, the `pharn-stage.md` SHA-256, the `skillsVersion` after the update, the commit, and
   `pharn status`. Expect `skillsVersion` 7.19.0.

2. **Preflight — the project's gates once on the measure base** (about 15 minutes; `test` alone took about 9 minutes
   on this machine on 2026-11-08):

   ```bash
   bash <kit>/kit/preflight.sh <root>
   ```

   It prints `exit=` and `minutes=` for `lint`, `format:check`, `typecheck` and `test`, and writes
   `<root>/preflight.txt`. **If `test` is red here, stop and report**: both runs would stop at the entry check (S14).
   If `test` took more than 30 minutes, also stop: `gates.timeoutMs` is 30 minutes, the most PHARN accepts.

3. **The driven run** (likely 60–120 minutes):

   ```bash
   bash <kit>/kit/run-driver.sh <root> driver-1 <a word you choose, e.g. blue-otter>
   ```

   Its progress is one line per step. Outputs: `<root>/runs/driver-1/out/` (`steps.jsonl`, `sessions/`,
   `sessions.json`, `stdout/`, `notes.txt`, `summary.json`) and the feature's files in
   `<root>/runs/driver-1/tree/pharn/features/lg3-remove-files/` (`LOOP.md`, `cost.json`, `SPEC.md`, …).

4. **The comparison run**, after step 3 has finished (likely 60–120 minutes):

   ```bash
   bash <kit>/kit/run-loop.sh <root> loop-1
   ```

   Outputs: `<root>/runs/loop-1/out/loop.jsonl` (the session's stream), `session-id.txt`, `loop-exit.txt`, and the
   feature's files in `<root>/runs/loop-1/tree/pharn/features/<the slug the run chose>/` (`LOOP.md`, `cost.json`).

5. **Send back** the paths. Nothing needs copying: `measure.mjs` reads them in place.

   ```bash
   node <kit>/driver/measure.mjs --driver <root>/runs/driver-1/out \
     --driver-cost <root>/runs/driver-1/tree/pharn/features/lg3-remove-files/cost.json \
     --loop <root>/runs/loop-1/out --loop-cost <root>/runs/loop-1/tree/pharn/features/<slug>/cost.json
   ```

## What each run does

- **Driven run.** A node process runs the quick loop's pinned floor lines itself, in the order
  `.claude/commands/pharn-loop.md` and its quick part give them. Each model stage (spec, plan, test, build) runs as
  one `claude -p --agent pharn-stage --model <the configured alias> --effort <the configured effort>
--permission-mode auto` session. The quick grill runs as one `claude -p "/pharn-grill <name> --quick"` session on
  the config's `loop` model. Between the test stage and the first build, two probes run:
  - a session asked to write `loop-driver-probe.txt` at the project root, which the write guard should deny;
  - a session asked to put one question, then resumed with your answer word and asked to write it to
    `pharn/.run/loop-driver/<name>/answer.txt`.

  The probes are excluded from the cost comparison.

- **Comparison run.** One `claude -p --permission-mode auto "/pharn-loop --quick --accept-host-execution <intent>"`
  session, exactly as earlier headless loops ran.
- **Both** pass `--accept-host-execution`, because on this machine the isolation check finds credentials. Each run
  executes the project's own tests on this host, unattended.
- **Neither** uses `--dangerously-skip-permissions`, `bypassPermissions` or `--allowedTools`.
- **Cap:** 3 iterations for both.

## Bounds

- Each run is one sample on one machine.
- The question probe's answer is typed before the question is seen. It measures that a resumed session keeps its
  context and acts on a relayed answer, never a person reading the question.
- `pharn-stage.md` is copied into the measure base. A real install today lacks it (pharn-cli `cli-install-agents`), so
  `/pharn-loop` there falls back to `general-purpose`.
- `/pharn-build`'s own project gate keeps a 540 s timeout (named follow-up `build-gate-declared-timeout`). The build
  may report `gate:fail` on a slow `test`, which does not stop either loop.
