# PLAN — shell-sink-validation: no model-typed value derived from untrusted input reaches a shell line before tested code has validated it

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4 # fix #4
- applied_lessons: [L5, L19, L21, L22, L27, L29, L33, L35, L36, L37, L38, L41, L44, L45, L49, L52, L54, L59, L60, L62, L64]
- increment: a feature name reaches a shell line only after a new product-floor CLI, `pharn/floor/feature-name.mjs`, has read it from a file the Write tool wrote and printed it as a member of `FEATURE_SLUG_RE`; `/pharn-loop`'s failed-commit undo returns to the original checkout without typing git output; `/pharn-ship --quick` no longer takes a base ref from the description; every value a product command's shell line takes is classified in one closed table the suite enforces
- layer(s): product floor (`pharn/floor/feature-name.mjs`, NEW; `pharn/floor/stage-runtime.mjs`, a header line); product commands (`.claude/commands/pharn-*.md`, ten of them); tests (`pharn/floor/feature-name.test.mjs`, NEW; `.dev/floor/command-hygiene.test.mjs`); repo-meta (`SKILLS_VERSION`, `CHANGELOG.md`, `README.md`, `CLAUDE.md`). No contract, hook, settings file or trusted doc changes.
- constitution_refs: [P0, P2, P3, P5, P6, P7]
- stage model: plan — opus — set by the maintainer's instruction for this batch (recorded here, never as a `pharn.config.json` route); run inline in the orchestrated `/pharn-dev-ship`, effort not routed
- base: worktree branch `worktree-agent-ae292c29714fe25d0`, cut from `main` at `70cb51c` (6.28.2, #285), then fast-forwarded (`git merge --ff-only origin/main`) to `f255f0c` (6.28.3, #286 stage-git-maxbuffer) after GATE 1. `SKILLS_VERSION` 6.28.3, `MIN_CLI` 0.5.0; `pharn/ARCHITECTURE.md` unchanged, so the pin above holds (re-hashed this run). Bumps to **6.29.0** (minor: a newly shipped floor CLI); two other minors are in flight, so it is renumbered at GATE 2 if one merges first — it was: **6.30.0** (#290 took 6.29.0; this PR merges ahead of #291).
- gate1: APPROVED 2026-09-27 by the orchestrating model under the maintainer's delegation — a MODEL decision, NOT a human approval. The four decisions below stand; Q1 → (A), tightened; the `git checkout -` bound is to be stated in the command and pinned by an executed control. Every change is listed under `## Amended at GATE 1`.
- grill: amended after `/pharn-dev-grill` (`GRILL.md`, 7 advisory concerns, all taken); `## Amended after grill` lists what changed. The one `## Files` addition since GATE 1 is `BUILD.md`, the build note GATE 1 asked for; no product file was added or removed.

## Applied lessons

- **L5** — input capture is a trust boundary, so the capture moves out of the shell: the model writes the candidate with the Write tool (no shell parser) and code reads it; no pinned line carries the candidate at all.
- **L19** — every Bash-side write is declared: the CLI removes its own `.pharn/feature-name/candidate.txt` (gitignored, outside the reconciled set) and nothing else; the build's scratch runners live under `.pharn/pharn-dev-build/` and are deleted before lint.
- **L21** — the CLI refuses a malformed candidate rather than trusting its caller: a second line, a CR, a space, a NUL, an oversized file, a symlink, a directory or a FIFO each exit 2 with a closed code, and nothing is printed.
- **L22** — the validation is a pinned command line with NO placeholder (`node pharn/floor/feature-name.mjs`, plus `--fresh` in the loop), so the model has nothing to choose and nothing to substitute.
- **L27** — each refusal code prints a remedy that is reachable for that code (write the candidate / pick a slug of `a`–`z`, `0`–`9`, `-` / a human removes what stands at the path), asserted per code, never one shared message.
- **L29** — the enumeration is the deliverable: `SHELL_VALUES` (every placeholder a product-command shell line takes, each with its class) and `NAME_ORIGINS` (where each command's `<name>` comes from) are materialized once in `.dev/floor/command-hygiene.test.mjs`, and every rule iterates them.
- **L33** — the fix retracts sentences, and each is edited in this increment: `pharn-loop.md`'s claim that "the slug's validation line itself carries the candidate", `pharn-ship.md`'s Step 2d shape check and its `ship-slug-shape` follow-up, and ship `## Quick mode` item 7's invoker-ref branch.
- **L35** — one owner per fact: `FEATURE_SLUG_RE` is imported from `gate-run-core.mjs` (no fourth copy of the grammar) and the containment walk from `stage-runtime.mjs` (`containmentWalk`, `lstatSafe`), whose header gains the new caller.
- **L36** — the placeholder table is CLOSED over the corpus: a placeholder on a product-command shell line that is not a member fails, so `<original branch>` or `<ref>` coming back fails, and a new command with a `<name>` shell line fails until it is classified.
- **L37** — the new undo line's bounds were probed, not read off `git help`: `git checkout - --` restores a hostile-named branch and a detached original (exit 0); with no `HEAD` reflog (`core.logAllRefUpdates=false` from `git init`) it exits 128 and restores nothing, where plain `git checkout -` silently overwrote a locally edited file named `-`; and an intervening checkout makes it land on the wrong target (exit 0) — each measured, and the last two become executed controls.
- **L38** — the candidate file is one per tree, as the scope record is; the CLI CONSUMES it (removes it after reading), so a later run that skipped its Write reads `no-candidate`, and two concurrent sessions can at worst swap two valid names — the bound is stated, never presented as solved.
- **L41** — the CLI takes no path argument and has no default to override: the candidate path is a constant under the invoking directory, and the tests run the real CLI in a throwaway directory rather than passing a path.
- **L44** — the printed name is substituted literally into later blocks, and the new undo line needs no value from an earlier block at all; the existing cross-block-variable pin keeps running over `pharn-loop.md`.
- **L45** — the suite EXECUTES each committed validation line and the committed undo block, read out of the command files, against hostile values — never only the script by path.
- **L49** — the sweep's coverage boundary is stated: the placeholder closure sees bash/sh fence lines, the Agent brief-prompt lines and inline command spans that start with a known command word; an inline command spelled otherwise is outside it.
- **L52** — each executed rule ranges over the SET: every command classified `validates` runs its own committed line, not one member standing for both.
- **L54** — the containment walk treats only an `lstat` ENOENT as absence; `--fresh` counts a dangling link at `pharn/features/<x>` as taken, where 6.28.2's `[ -e … ]` read it as absent.
- **L59** — the candidate path is never followed: `lstat` classifies it first, and the open carries `O_NOFOLLOW | O_NONBLOCK`; the suite's `PATH_KINDS` enumerates regular file, link to a file, link to a directory, dangling link, looping link, directory and FIFO, at the leaf and at each parent.
- **L60** — each asserted property has a control that turns it red: the 6.28.2 lines themselves (S1's validator, `/pharn-spec`'s setter, Step 6d's switch, ship item 7's rev-parse) each run their payload in a throwaway directory, and each new pin is mutated once.
- **L62** — no refusal ever quotes the candidate's bytes: the stderr line is a fixed string per code, so a hostile value cannot make the refusal throw or print.
- **L64** — every restatement of a bound in this increment (the CHANGELOG entry, the `CLAUDE.md` entry, the claims blocks, the CLI header) is probed against the test that pins it before hand-off.

## Trigger (P7) — reproduced live this run, not inherited from the audit

A read-only injection audit of the product commands' pinned lines (quoted in the increment request as DATA) named
three findings. Each was re-run here against the **committed 6.28.2 lines**, in a throwaway directory, with a canary
file standing in for a payload (`.pharn/pharn-dev-plan/probe-slug.mjs`, `probe-branch.mjs`, deleted before lint):

| finding | committed line (6.28.2)                                                                   | value                                                                         | result                                                                                |
| ------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1a      | `pharn-loop.md` S1: `node -e '…regex…' '<slug>'`                                          | `x'$(touch PWNED_S1)'`                                                        | **exit 0** and the canary exists — the validator runs the payload, then reports green |
| 1b      | `pharn-spec.md` Step 0: `set-writes-scope.cjs … --target pharn/features/<name>/SPEC.md`   | `fix-login;touch${IFS}PWNED_SPEC;x`                                           | canary exists (the first sink, before GATE 1)                                         |
| 1c      | a single-quoted `--name '<name>'` line (the stage-agent brief line's shape)               | `fix-login'$(touch PWNED_Q)'`                                                 | canary exists                                                                         |
| 2       | `pharn-loop.md` Step 6d: `git switch '<original branch>'`, value from S3's `symbolic-ref` | branch `fix';touch${IFS}PWNED_BRANCH;'x` (`check-ref-format --branch` exit 0) | canary exists; `fatal: invalid reference: fix`; checkout left on `pharn-loop/demo`    |
| 3       | `pharn-ship.md` quick item 7 (inline): `git rev-parse --verify <ref>^{commit}`            | `HEAD;touch${IFS}PWNED_REF;:`                                                 | canary exists                                                                         |

## The enumeration (L29 — the deliverable)

Measured this run over the product commands' shell lines: every non-comment line of a `bash`/`sh` fence, every
Agent brief-prompt line (a `text` fence line starting `Run exactly this line, then follow what it prints:`), and
every inline code span starting with a command word (`node`, `git`, `npx`, `npm`, `GIT_…=`, `cat`, `mkdir`,
`test`, `gh`).

### Where `<name>` comes from, per command (166 shell lines carry `<name>`/`<slug>`: 180 `<name>` and 3 `<slug>` occurrences)

| command                   | lines | where the value comes from today                                                                                                             | after this increment                                                                                    |
| ------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `pharn-spec.md`           | 4     | Step 0.1 derives it from the user's description (untrusted by the command's own statement); first sink Step 0.2's setter, unquoted, no check | **validates**: Step 0 writes the candidate, runs the CLI, and only the printed value reaches the setter |
| `pharn-loop.md`           | 65    | S1 derives it from the description; S1's check line is itself the sink; S2 types `<slug>` twice                                              | **validates**: S1 writes the candidate and runs `feature-name.mjs --fresh`, which also does S2          |
| `pharn-ship.md`           | 59    | `/pharn-spec`, run inline, derives it (ship's first sink, Step 1's run-start, runs after spec's Step 0)                                      | **via `/pharn-spec`**: Step 1 names the CLI before its first `<name>` line; Step 2d relies on it        |
| `pharn-plan.md`           | 6     | "from the invocation … ambiguous → ask the human" (Step 0.1)                                                                                 | **asks**: a name not received as the argument is asked for — never taken from a listing or a file       |
| `pharn-grill.md`          | 4     | same wording                                                                                                                                 | **asks**                                                                                                |
| `pharn-test.md`           | 17    | "from the invocation … Ambiguous → ask the human"                                                                                            | **asks**                                                                                                |
| `pharn-build.md`          | 4     | same                                                                                                                                         | **asks**                                                                                                |
| `pharn-regress.md`        | 1     | "the kebab-case slug of the feature just built" — no "from the invocation": the command resolves it itself                                   | **resolves**: a name not received as the argument is resolved only through `feature-name.mjs`           |
| `pharn-verify.md`         | 1     | same wording as regress                                                                                                                      | **resolves**                                                                                            |
| `pharn-review.md`         | 5     | `--feature <name>` as the human typed it, "else / on ambiguity → ask the human"                                                              | **asks**                                                                                                |
| `pharn-memory-promote.md` | 0     | —                                                                                                                                            | not in the table                                                                                        |

**Where the line is drawn (the request's rule, applied; tightened at GATE 1).** A name the human typed, and a name an
orchestrator threads after it was validated at its birth, are out of class. The class is the name at its **birth**
from untrusted text — `/pharn-spec` Step 0 and `/pharn-loop` S1, the only two places a command tells the model to
derive one — and those two validate. In the seven commands that take a name, a name the command did NOT receive as
its argument is either **asked** for (the five whose Step 0 already resolves "from the invocation … else ask") or
**resolved only through `feature-name.mjs`** (regress and verify, whose Step 0 resolves "the feature just built"
itself) — never typed from a directory listing or a file's content. Following that sentence is ADVISORY; its
presence per command is pinned (D6.5), and in the two `resolves` commands the check line it names is executed (D6.6).

### Every other value a product-command shell line takes (the closed `SHELL_VALUES` table)

| placeholder                     | where it comes from                                                                 | class                                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `<name>`                        | above                                                                               | validated at birth / given                                                                                                                                                                                                                                                                                                   |
| `<route>`                       | `stage-agent.mjs route`'s printed token, `ROUTE_TOKEN_RE` (`route-token-core.mjs`)  | closed code token — out of class                                                                                                                                                                                                                                                                                             |
| `<N>`                           | the loop's own iteration counter                                                    | an integer the run keeps — out of class                                                                                                                                                                                                                                                                                      |
| `<M>`                           | `--max-iter N` as the human typed it                                                | human argv — out of class                                                                                                                                                                                                                                                                                                    |
| `<base sha>`                    | `git rev-parse HEAD` / `git merge-base HEAD origin/main` (or the literal `unknown`) | git output whose alphabet git itself fixes to hex — out of class on the PRODUCER's grammar (a property of git, not a PHARN check); `check-quick-scope.mjs` and `check-loop-fresh.mjs` also re-check `SHA_RE` and `stage-regress.mjs` resolves `--base` as argv, while `render-cost-ledger.mjs` records `--base-sha` as given |
| `<branch>`                      | printed by Step 6c's branch block from the validated `<name>`                       | derived from a validated value                                                                                                                                                                                                                                                                                               |
| `<decision>`                    | `check-loop.mjs`'s green token (`STOP_GREEN` / `STOP_GREEN_QUICK`)                  | closed code token                                                                                                                                                                                                                                                                                                            |
| `<canon-file>`                  | one of the two paths `/pharn-memory-promote` Step 0 names                           | closed choice                                                                                                                                                                                                                                                                                                                |
| `<id>`                          | `project` or `pharn-default`, the prefix of `check-spec.mjs`'s printed line         | closed code token                                                                                                                                                                                                                                                                                                            |
| `<path>`                        | a review target the human typed                                                     | human argv                                                                                                                                                                                                                                                                                                                   |
| `<target>`                      | the project directory `/pharn-build` runs `validate.mjs` over                       | the project root — not derived from input                                                                                                                                                                                                                                                                                    |
| `<resume.argv…>`                | the stage script's own printed `resume.argv`                                        | code-produced (validated there, or the human's own flags)                                                                                                                                                                                                                                                                    |
| `<chosen option's argv…>`       | a registry-held flag plus the human's answer, single-quoted                         | registry + human-typed                                                                                                                                                                                                                                                                                                       |
| **removed** `<slug>`            | S1/S2 — folded into the CLI                                                         | —                                                                                                                                                                                                                                                                                                                            |
| **removed** `<original branch>` | Step 6d — replaced by the constant `git checkout - --`                              | —                                                                                                                                                                                                                                                                                                                            |
| **removed** `<ref>`             | ship quick item 7 — the invoker-ref branch is dropped                               | —                                                                                                                                                                                                                                                                                                                            |

**`pharn/floor/stage-agent-core.mjs` needs no change, and why (grill G-E).** The request names its brief and report
lines as a sink. Those lines are rendered by code only after `stage-agent.mjs` has refused any `--name` that is not a
`FEATURE_SLUG_RE` member (`stage-agent.mjs`, `cleanScalar` + `FEATURE_SLUG_RE`), so what the brief prints is always a
valid slug. The sink is the step before it: the orchestrator's one-line Agent prompt, which carries `<name>` into the
stage agent's shell. That line is a brief-prompt line in `SHELL_VALUES` and `NAME_ORIGINS`, and the value it carries
is the name validated at its birth.

Out of the class, and out of scope (the request's list): rendered-markdown inertness (a hostile branch name still
appears in the loop's Step 7 summary, which is display), `/tmp/briefing-draft.md` and `npx` in `/pharn-ship` Step 2c,
and the stage-agent free-text residual. **`<path>` in `/pharn-review`** is the human's own explicit argument; its
directories are expanded and branch 2's merge-base diff is listed by `render-review-assignments.mjs` in code
(`expandTarget`, `resolveTarget`), so no git- or listing-derived path is ever typed into a shell line.

## Design

### D1 — `pharn/floor/feature-name.mjs` (NEW; its header is its spec — the `run-marker.mjs` precedent, no new contract, P7)

- **Input:** the constant path `.pharn/feature-name/candidate.txt` under the invoking directory, which the model
  writes with the **Write tool** — a tool call, never a shell line, so the candidate is never parsed as shell.
- **Read, safely:** `containmentWalk` over `.pharn` → `.pharn/feature-name` (a symlink or non-directory component
  refuses `unsafe-path`, L54); then `lstat` of the file itself (never followed, L59). A regular file is opened with
  `O_RDONLY | O_NOFOLLOW | O_NONBLOCK` and `fstat`ed again (it must still be a regular file). A file over 65 bytes —
  the slug grammar's own maximum, 64 characters plus one `\n` — is `not-a-name` without being read (grill G-C: no
  separate size code, no magic read bound).
- **Consume, on every outcome that can (grill G-A):** the leaf entry is removed whenever it is a regular file (read
  or not), a symlink, a FIFO, a socket or a device — `unlink` never follows — so a stale or planted candidate never
  survives one CLI run. Only a directory at the leaf is left in place (`not-a-file`, for a person to remove). Only
  `ENOENT` counts as absence; any other removal failure refuses `not-removed`, and a name is never printed from a
  file that could not be removed. **Bound, stated in the header (grill G-F):** the containment walk and the unlink
  are two steps, so a parent swapped for a symlink between them is not caught — the same walk-then-write gap the
  stage scripts name for themselves; an accounting guard against mistakes, not a race-proof one.
- **Validate:** the bytes must be `FEATURE_SLUG_RE` (imported from `gate-run-core.mjs`) plus at most one trailing
  `\n`. Nothing is trimmed or normalized — a CR, a space or a second line refuses.
- **`--fresh`** (the loop's S2, moved into code): print the first of `<slug>`, `<slug>-2`, `<slug>-3`, … for which
  `lstat` of `pharn/features/<x>` reports ENOENT (a dangling link counts as taken); **any other `lstat` error refuses
  at once, `unreadable`** — never "taken", which would walk towards the 64-character limit one suffix at a time
  (grill G-D); each candidate is re-checked against `FEATURE_SLUG_RE` (a suffix past 64 characters refuses
  `no-fresh-name`).
- **Output:** exit `0` prints exactly `<name>\n` on stdout. Exit `2` prints NOTHING on stdout and one fixed stderr
  line `feature-name: refused <code> — <remedy>`; the closed codes are `usage-error`, `no-candidate`, `unsafe-path`,
  `not-a-file`, `unreadable`, `not-removed`, `not-a-name`, `no-fresh-name`. The candidate's bytes are never quoted
  (L62). Any other exit (node's 1) is a crash — never a name, never a verdict.
- **Exports** (for its test): `takeName({ root, fresh })` → `{ ok: true, name }` | `{ ok: false, code }`, with
  `root` REQUIRED (no default, L41), and the closed `REFUSALS` table.

### D2 — the two birth points validate before any shell line carries the name

- **`/pharn-spec` Step 0** gains item 2 between "resolve" and "set the scope": write the slug alone to the candidate
  path with the Write tool, run `node pharn/floor/feature-name.mjs`, use only the printed value — and only when it
  is the slug just written (a different printed value means a file this run did not write was read: stop). **On a
  refusal, only a slug the model derived itself may be replaced (grill G-B):** pick another of `a`–`z`, `0`–`9` and
  `-` and repeat once, then ask the human. A name it was GIVEN — typed by the human, or threaded by an orchestrator
  (`/pharn-loop`'s S1 already chose it) — is never changed: ask the human, or under `--model-approve` report back
  blocked (the loop reads it as S9). It always runs — for a derived name and for a given one — so the rule has no
  branch. **If the Write tool refuses because the file already exists** (grill G-A), never Read it: run the line
  once more, ignore what it prints (the run removes the stale file), then write again.
- **`/pharn-loop` S1** replaces the `node -e … '<slug>'` line with the same Write step and
  `node pharn/floor/feature-name.mjs --fresh`; S2's shell loop is gone (item 2 becomes a one-line pointer to
  `--fresh`), so the entry costs two tool calls, as it did before. The printed value must be the slug written or
  that slug plus `-<n>`; anything else, or a non-zero exit, stops `blocked: no-slug` (spelling unchanged). The same
  existing-file rule as `/pharn-spec`'s applies to the Write.
- **`/pharn-ship` Step 1** says `<name>` is the value `/pharn-spec`'s Step 0 printed through
  `pharn/floor/feature-name.mjs`, and that the run-start line runs once it has been printed. **Step 2d** item 1 (a
  display-time shape check in prose, `ship-slug-shape`) is replaced by that fact: the displayed block interpolates the
  printed name.

### D3 — `/pharn-loop` Step 6d returns to the original checkout without typing git output

`git switch '<original branch>'` and its detached variant `git switch --detach '<base sha>'` become ONE constant
line, **`git checkout - --`**, which returns to the checkout Step 6c's `git switch -c` left — a branch or a detached
`HEAD` alike (measured). S3 still prints the original branch, for the Step 7 summary only.

**Why `--`, measured after GATE 1 (a refinement inside the approved decision, not a change of it):** without it, a
repository with no `HEAD` reflog makes git read `-` as a PATHSPEC. With a tracked file literally named `-` carrying
a local edit, plain `git checkout -` restored that file from the index — the edit gone — and exited **0**
("Updated 1 path from the index"), leaving the checkout on the new branch. `git checkout - --` exited 128
(`fatal: invalid reference: @{-1}`) with the file untouched, and behaves exactly like `git checkout -` whenever the
reflog names the previous checkout (branch original → on it; detached original → detached at it; measured).

**The bound, stated in the command (GATE 1):** `-` is this worktree's previous checkout (`@{-1}`, from its `HEAD`
reflog). The line is correct only because nothing checks out between Step 6c's branch block and Step 6d — a commit
hook that checks out, or another session in the same worktree (L38), makes `-` name that checkout instead, and the
line then succeeds silently on the wrong target (measured: an intervening `git switch -c` → exit 0, still on
`pharn-loop/demo`). With no `HEAD` reflog it exits 128, runs nothing, and leaves the checkout on the new branch,
which the Step 7 summary then reports.

### D4 — `/pharn-ship --quick` item 7 no longer takes a base from the description

`/pharn-ship` has no `--base` flag, so "`--base <ref>` if the invoker gave one" could only be read out of the
description. Item 7 resolves the base by `BASE_RULE`'s other three branches (cited, not restated): `HEAD` for a dirty
tree, else `git merge-base HEAD origin/main`, else ask the human for the base commit's 40-hex SHA — which
`check-quick-scope.mjs` already re-checks (`SHA_RE` and `git rev-parse --verify`).

### D5 — the seven commands that take a name: ask for it, or resolve it through the CLI (GATE 1, Q1 (A) tightened)

No Step-0 check is added to these seven — a check on every invocation would re-add the turns 6.23.0 and 6.26.0 cut on
every loop iteration. Each gets the ONE sentence that matches what its Step 0 already does, so the CLI runs only on
the branch where the command itself would otherwise pick a name:

- **asks** — `/pharn-plan`, `/pharn-grill`, `/pharn-test`, `/pharn-build`, `/pharn-review` (Step 0 already reads the
  name from the invocation, and asks when it is missing or ambiguous): _a `<name>` this command did not receive as
  its argument is asked for — stop and ask the human; never take one from a directory listing or a file's content._
- **resolves** — `/pharn-regress`, `/pharn-verify` (Step 0 resolves "the feature just built" itself): _a `<name>`
  this command did not receive as its argument is resolved only through `pharn/floor/feature-name.mjs` — write the
  slug alone to `.pharn/feature-name/candidate.txt` with the Write tool, run the line below, and use only the printed
  value, when it is the slug written; a refusal or any other value → ask the human; never type one from a directory
  listing or a file's content._ The line, pinned in a fence: `node pharn/floor/feature-name.mjs`. The existing-file
  rule of D2 applies to its Write too.

Both sentences are fixed strings, so the pin (D6.5) is an exact-substring test. BUILD.md records which of the two
each command got, and why (its Step 0 wording, quoted).

### D6 — the floor pins (`.dev/floor/command-hygiene.test.mjs`, a new `SHELL-SINK` section)

1. **`SHELL_VALUES` closure (L36):** every placeholder on a product-command shell line (the three kinds above) is a
   member. Controls: `<original branch>`, `<ref>` and `<slug>` spliced into a real body are each red.
2. **`NAME_ORIGINS` closure:** the product commands with a `<name>` shell line equal the table's keys, both ways;
   every class is one of `validates`, `via`, `asks`, `resolves`.
3. **`validates` / `resolves` order:** the command's pinned CLI line appears exactly once, the candidate path is
   named before it, and it precedes the command's first `<name>` shell line. Controls: the line dropped, and moved
   below the first `<name>` line, are each red.
4. **`via` order:** the named command is `validates`, and this command names `pharn/floor/feature-name.mjs` before
   its first `<name>` shell line.
5. **The per-command sentence (presence only):** each `asks` command carries the ask sentence and each `resolves`
   command the resolve sentence, verbatim, inside its Step 0 (between its `## Step 0` heading and the next `##`
   heading); neither carries the other's. Controls: each deleted, and each swapped, is red. **Bound, stated in the
   test:** it proves the sentence is present, never that a run follows it.
6. **★ EXECUTED — every `validates` and `resolves` command's committed line** (L52: the set, not one member), run
   under `sh -c` in a throwaway directory whose `pharn/floor` links to this tree's, over the named set
   `HOSTILE_CANDIDATES` (grill G-H) written byte-for-byte to the candidate path — `$(touch X)`, backticks, `;` and
   `${IFS}`, both quote kinds, a newline, a CR, a space, a leading `-`, `..` and `/`, an upper-case letter, a NUL,
   a UTF-8 BOM, a valid slug followed by CRLF, 65 characters, and the empty file: exit 2, empty stdout, no canary,
   candidate removed; a benign candidate prints itself; `--fresh` prints `<slug>-2` when `pharn/features/<slug>`
   exists.
7. **★ EXECUTED — Step 6d's committed block**, after Step 6c's committed branch block, in a throwaway git repo whose
   original branch is `fix';touch${IFS}PWNED_BRANCH;'x`: no canary, `HEAD` back on that branch, the new branch
   deleted; a detached original returns to its commit; and a tracked file named `-` with a local edit survives a
   repository with no `HEAD` reflog (the line exits non-zero and restores nothing). **★ CONTROL — the dependency made
   visible (GATE 1):** a checkout between the branch block and the undo block makes the committed undo line land on
   that checkout, not the original — it must, or the stated bound is untested. The Step 6d bound sentence's
   presence is pinned beside it.
8. **★ CONTROLS — the 6.28.2 lines, carried as literals:** S1's validator, `/pharn-spec`'s setter, Step 6d's
   `git switch`, and ship item 7's `git rev-parse --verify <ref>^{commit}`, each run once with a hostile value in a
   throwaway directory — each canary must appear, or the rule it backs is vacuous; and plain `git checkout -` (no
   `--`) must overwrite the edited `-` file in the no-reflog repo, or D6.7's `--` pin guards nothing.

`pharn/floor/feature-name.test.mjs` covers the CLI itself: every refusal code by its own input (closure over the
source, L36), `PATH_KINDS` at the leaf and at each parent, the unquoted refusal line, consumption, `--fresh`
(absent, taken, dangling, over-length), and that the module declares no copy of the slug grammar.

### D7 — meta

`SKILLS_VERSION` 6.30.0; a `CHANGELOG.md` `[6.30.0]` section (the `[Unreleased]` section holds no entry to move);
`README.md`'s badge and its generated `CURRENT-STATE` region (the floor-checker count moves by one — regenerated with
`npm run docs:generate`, never hand-edited); one `CLAUDE.md` Commands entry; `pharn/floor/stage-runtime.mjs`'s header
names its new caller. **`MIN_CLI` stays 0.5.0:** nothing is relocated and no contract or frontmatter shape changes,
so an older CLI installs a working tree; the repo's own precedent is that 6.23.0, 6.24.0, 6.26.0 and 6.28.0 each
added a floor file and `MIN_CLI` has not moved since 5.0.1 (`git log -- MIN_CLI`, this run). That `pharn update`
copies a NEW floor file is the installer's behaviour (its source is not in this tree), recorded in the token-roadmap
pre-check and not re-verified here.

## Files

- `pharn/floor/feature-name.mjs` — NEW: read the candidate the Write tool wrote, check it, consume it, print it (`--fresh` for the loop) — product floor
- `pharn/floor/feature-name.test.mjs` — NEW: the CLI's own suite — product floor tests
- `pharn/floor/stage-runtime.mjs` — header: `feature-name.mjs` is a caller of `containmentWalk` and `lstatSafe` — product floor
- `.claude/commands/pharn-spec.md` — Step 0 item 2 (write, check, use the printed name); `reads:`; claims bullet — product command
- `.claude/commands/pharn-loop.md` — S1/S2 through the CLI; S3 wording; Step 6d `git checkout -`; claims bullets; `reads:` — product command
- `.claude/commands/pharn-ship.md` — Step 1 names the CLI; quick item 7's base; Step 2d item 1; claims bullet; `reads:` — product command
- `.claude/commands/pharn-plan.md` — Step 0: the ask sentence — product command
- `.claude/commands/pharn-grill.md` — Step 0: the ask sentence — product command
- `.claude/commands/pharn-test.md` — Step 0: the ask sentence — product command
- `.claude/commands/pharn-build.md` — Step 0: the ask sentence — product command
- `.claude/commands/pharn-regress.md` — Step 0: the resolve sentence and its pinned CLI line — product command
- `.claude/commands/pharn-verify.md` — Step 0: the resolve sentence and its pinned CLI line — product command
- `.claude/commands/pharn-review.md` — Step 0: the ask sentence — product command
- `.dev/floor/command-hygiene.test.mjs` — the SHELL-SINK section (D6 1–8) — dev apparatus
- `.dev/features/shell-sink-validation/BUILD.md` — the build note: what landed, which of ask/resolve each of the seven commands got and why, the measured command bytes — dev apparatus
- `SKILLS_VERSION` — 6.30.0 — repo-meta
- `CHANGELOG.md` — the `[6.30.0]` section — repo-meta
- `README.md` — the badge, and the regenerated `CURRENT-STATE` region — repo-meta
- `CLAUDE.md` — one Commands entry for the new CLI — repo-meta

## Contracts satisfied

- `pharn/pharn-contracts/stage-exit.md` — untouched: the CLI is not a stage script and emits no `pharn-stage-exit/1`
  object; its exit codes follow `run-marker.mjs` (0 ok · 2 refusal · anything else a crash).
- `pharn/pharn-contracts/loop-record.md` — untouched: `blocked: no-slug` keeps its spelling and row (S1).
- No new contract: the CLI's header is its spec (the `run-marker.mjs` and `require-loop-record.cjs` precedent, P7).

## Evals to write (P1)

No capability (`role:`) is added or changed, so no eval set. The CLI and the command pins are covered by
`pharn/floor/feature-name.test.mjs` and the new `.dev/floor/command-hygiene.test.mjs` section (D6).

## Guarantee audit (P0)

- "`feature-name.mjs` prints only a member of `FEATURE_SLUG_RE`, or nothing" → **floor: enum-regex** (tested over
  hostile candidates, every `PATH_KINDS` member and every refusal code).
- "the candidate never passes through a shell parser" → the pinned validation lines carry no placeholder —
  **floor over the committed text** (D6.3); that the model writes the candidate with the Write tool, and not with
  `echo … >`, is **advisory**.
- "every later shell line carries only the printed value" → **advisory** — the model re-types it; bounded, because a
  value in `FEATURE_SLUG_RE` cannot break any quoting.
- "each validating command checks the name before its first `<name>` shell line" → **floor over the committed
  text** (D6.3/4) — presence and order, never proof a run executed the lines in that order.
- "every value a product-command shell line takes is classified" → **floor over the committed text** (D6.1) over
  the three line kinds; each member's CLASS is reviewed judgment (**advisory**); an inline command span that starts
  with a word outside the vocabulary is not seen (L49).
- "the loop's undo returns without typing git output" → the line is a constant, pinned and **executed** (D6.7); that
  a run executes it is **advisory**; bounds, stated in the command: `-` is this worktree's previous checkout, so the
  line is right only while nothing checks out between Step 6c's branch block and Step 6d (an intervening checkout
  makes it succeed on the wrong target — the executed control shows it); no `HEAD` reflog → exit 128, nothing
  runs, checkout left on the new branch.
- "a name a given command did not receive is asked for, or resolved only through the CLI" → the sentence's
  presence per command is **floor over the committed text** (D6.5); that a run follows it is **advisory**; in the
  two `resolves` commands the CLI line itself is executed (D6.6).
- "ship's quick base never comes from the description" → the item offers no such branch, pinned by the closure
  (`<ref>` is not a member); that the model follows the item is **advisory**.
- "`--fresh` never reuses a feature directory" → **floor: enum-regex + lstat** at choice time; bounds: a parent
  symlink (`pharn` or `pharn/features`) is followed, and a directory created between the choice and `/pharn-spec`'s
  write is not seen.
- **Named bounds, stated in the CLI header:** one candidate file per tree (two sessions can swap names — each still
  a valid slug); a VALID slug planted or left in `.pharn/feature-name/` is read only by a run whose own Write did not
  land, and the command's compare-with-what-you-wrote step (advisory) stops it — a plant can misdirect a run's name,
  never inject; in an installed project with a malformed scope record the Write is denied and the CLI refuses
  `no-candidate` (or reads such a plant, which the compare stops); following the ask/resolve sentence is advisory.
- **Struck:** "PHARN's shell lines are injection-proof" — the class closed here is a model-typed value derived from
  untrusted input; a compromised model holds the Bash tool anyway (`THREAT-MODEL.md` §1's axiom), and the closure
  pins placeholders, never a line typed outside a fence's known shapes.

## Trust audit (P2)

- **The description** (untrusted) → the model's candidate → the Write tool (no shell) → `feature-name.mjs` → a member
  of `FEATURE_SLUG_RE`, or nothing. The taint ends at the CLI: the printed value lies in a closed regular language
  whose alphabet (`a`–`z`, `0`–`9`, `-`, never leading `-`) has no shell-active character. No refusal quotes the
  candidate back.
- **Git output** (`git symbolic-ref`) is no longer typed into a shell line; it reaches only the loop's Step 7
  summary, which is display (rendered-markdown inertness is out of scope). `<base sha>` stays: git's `rev-parse` /
  `merge-base` print hex only — the class boundary rests on that producer grammar, not on the consumers, since
  `render-cost-ledger.mjs --base-sha` records its value unchecked.
- **A directory listing** (a hostile checkout's `pharn/features/<x>`) is untrusted file content; the seven commands
  that take a name ask for a missing one or resolve it only through the CLI, never from a listing (advisory, presence
  pinned), and `--fresh` reads the listing only as `lstat` presence, never as a name.

## Determinism audit (P5)

Every new branch is an exit code (`0` → use the printed value; anything else → stop / ask / report blocked) or an
`lstat` result; the retry is bounded to one before asking the human.

## Command budget

Headroom today (ceiling − bytes): build 1510, grill 2291, loop 7669, plan 2377, regress 1919, review 2055, ship 7250,
spec 2347, test 1863, verify 1682. Expected: spec about +700; each given command about +170; loop and ship net
smaller (S2, the detached variant, the invoker-ref branch and Step 2d's check leave). No ceiling should need to
rise; the build measures, and a rise, if one is needed, is the visible diff the budget rule describes.

## Open questions (HALT)

None open. Q1 (where validation runs) was answered at GATE 1 — see `## Amended at GATE 1`.

## Amended at GATE 1 (the orchestrator's decisions, under the maintainer's delegation)

- **Q1 → (A), tightened.** No Step-0 check in the seven commands that take a name. In each, a name the command did
  not receive as its argument is ASKED for, or — where its Step 0 already resolves the name itself — resolved only
  through `feature-name.mjs`: asks for plan, grill, test, build and review; resolves for regress and verify (D5).
  The sentence's presence is pinned per command, with the bound stated (D6.5).
- **`git checkout -` → its bound is stated in `/pharn-loop` Step 6d and pinned by an executed control** in which an
  intervening checkout makes the line land on the wrong target (D3, D6.7).
- **Refinement found while measuring that bound (inside the approved decision):** the pinned line is
  `git checkout - --`, because plain `git checkout -` with no `HEAD` reflog overwrote a locally edited tracked
  file named `-` and exited 0 (D3). D6.8 carries the plain form as its control.
- **Base:** fast-forwarded to `f255f0c` (6.28.3). #286 rewrote `stage-runtime.mjs`'s header list of callers; this
  plan's header edit becomes one more clause of that list (`feature-name.mjs` uses `containmentWalk` and
  `lstatSafe`), and `feature-name.mjs` spawns no git, so #286's GIT CEILING closure does not reach it.
- **The named residual `given-name-residual` is retired** (below): the tightened rule replaces the advisory-only
  sentence it named, and what remains — that a run follows the sentence — is stated in the guarantee audit.

## Amended after grill (`GRILL.md`, all seven advisory concerns taken; no file added or removed)

- **G-A** — the CLI removes the leaf entry on every outcome that can (a regular file read or not, a symlink, a FIFO,
  a socket, a device; never a directory), and the four commands that write a candidate say never to Read an existing
  one: run the CLI once, ignore its output, write again (D1, D2, D5).
- **G-B** — only a slug the model derived itself may be replaced after a refusal; a given name is never changed (D2).
- **G-C** — the size bound is the grammar's own (65 bytes); `too-large` is dropped from the closed set (D1).
- **G-D** — `--fresh` refuses `unreadable` on any `lstat` error but ENOENT (D1).
- **G-E** — why `stage-agent-core.mjs` needs no change is stated (the enumeration).
- **G-F** — the walk-then-unlink gap is a stated bound in the CLI header (D1).
- **G-H** — the executed pin ranges over a named `HOSTILE_CANDIDATES` set (D6.6).

## Decisions made from the repo (flagged for GATE 1, accepted there)

- **S2 folds into `--fresh`** rather than keeping its shell loop after the check: the entry keeps its two tool calls,
  and a dangling link at `pharn/features/<x>` now counts as taken (stricter than `[ -e ]`).
- **Step 6d uses `git checkout -`** (pinned as `git checkout - --`, above), a constant line, rather than a
  code-recorded checkout: no new module, measured on both a branch and a detached original; the no-reflog and
  intervening-checkout bounds are stated rather than engineered away (P7 — no failure recorded).
- **Step 2d's display-time shape check is replaced**, not kept beside the birth check: the follow-up
  `ship-slug-shape` is answered by the CLI.
- **The execution tests live in `.dev/floor/command-hygiene.test.mjs`**, which owns `NAME_ORIGINS`, so the set of
  validating commands is enumerated once (L35); the CLI's own behaviour lives in `pharn/floor/feature-name.test.mjs`.

## Out of scope, and named residuals

- The request's exclusions: rendered-markdown inertness, `/tmp/briefing-draft.md` and `npx` in `/pharn-ship` Step
  2c, the stage-agent free-text residual.
- `given-name-residual` — RETIRED at GATE 1 (above). What stays advisory: that a run follows the ask/resolve
  sentence the suite pins by presence.
- `candidate-concurrency` — one candidate file per tree (L38); a per-session path would need a session id the CLI
  cannot verify.
- `checkout-minus-intervening` — the Step 6d undo depends on nothing checking out between Step 6c's branch block and
  it (a commit hook, a second session in the tree); stated in the command, shown by the executed control, not
  engineered away (P7: no recorded failure).
