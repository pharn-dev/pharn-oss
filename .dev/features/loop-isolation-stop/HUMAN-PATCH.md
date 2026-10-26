# HUMAN-PATCH — loop-isolation-stop (6.76.0)

`LIMITS.md` and `THREAT-MODEL.md` are human-only (fix #2): the write tools are denied, and an agent's `Bash` write
would be the bypass CLAUDE.md forbids. This file holds the exact text for a person to apply.

**When (GATE 1, question 4; lessons-learned L68):** after `/pharn-dev-verify`, before the pull request. Apply both
edits, **commit them** (an uncommitted trusted-doc edit REDs `npm run check`'s reconcile — L68), then re-run
`npm run check`. `stage-load-budget.test.mjs` counts the trusted docs in every stage's load, so a ceiling may need
re-measuring after this lands. That is an agent edit to a test file, made after you commit.

The `.claude/commands/pharn-loop*.md` text and the CLI's refusal already cite `LIMITS.md §6`. The section exists today,
so nothing breaks before this patch lands; the patch makes §6 say what the citation points at.

## 1. `LIMITS.md` §6 — one bullet, inserted after "The only true prevention is OS-level sandboxing …"

**Anchor.** Insert the bullet below directly after the §6 bullet that begins "The only true prevention is OS-level
sandboxing of the Bash process" and ends "Until an environment supplies it, this stays a named limit, not a
guarantee.", and before the paragraph that begins "Why this is not one of §1's four irreducible limits."

```markdown
- **An unattended `/pharn-loop` refuses to start without evidence of a sandbox (6.76.0), and that is all it does.**
  The sandbox above stays harness-layer, and PHARN still does not implement one. What this version adds is a refusal:
  `/pharn-loop`'s Step 1a runs `pharn/floor/check-run-isolation.mjs`, which stops the run (S15, `blocked: not-isolated`)
  unless it finds a container marker and none of a fixed list of credentials, or the operator passed
  `--accept-host-execution` (`pharn/pharn-contracts/loop-record.md`, "The isolation field"). The verdict over its probe
  is floor (closed lists, string equality, set membership). That the environment really is isolated is not:
  - **The evidence and the override are operator-fakeable by design.** `PHARN_ISOLATED=1`, a planted `/.dockerenv`, an
    emptied `HOME`, and so is a project's own `.claude/settings.json` `env` block, which is project content. The check
    binds the honest operator, not the hostile one. The override exists because the lists cannot know every sandbox
    or every credential: an operator who knows their environment must be able to say so, and the record, the run
    report and the commit message then repeat that they did.
  - **The floor sees argv, never who typed the flag, and the record of it is run-writable.** The record, the run report
    and the commit message repeat the witness file `.pharn/pharn-loop/<name>/isolation.json`. That file is git-ignored
    `.pharn/` state that the Write tool reaches in every posture and that a `Bash` write reaches too, and reconcile
    never sees it. So those lines name the flag faithfully only while nobody rewrites the witness, and the record
    check's RED does not gate the commit. Agreement between files the run can write, never provenance.
  - **The lists are closed and partial.** A token in a project `.env`, a keychain, a cloud metadata endpoint, or a
    credential named nowhere on the list is not seen. A container the list does not recognize needs `PHARN_ISOLATED=1`.
  - **The agent's own model credential is always present.** `ANTHROPIC_API_KEY` (or the session's `~/.claude/` login)
    is how the agent runs at all, so a compromised run can still send data out through it. That exfiltration residual
    is untouched by this stop.
  - `/pharn-ship` runs no such check: a person approves its SPEC and decides at its end.
```

## 2. `THREAT-MODEL.md` §4 — one item, added after item 8b

**Anchor.** Under the bold line "Not closeable — relabeled as limits (LIMITS.md), not bugs:", insert the item below
directly after item 8b (it begins "8b. The fence is enforced by the same model that may be compromised" and ends "so
residual injection moves only advisory judgments."), and before the horizontal rule that closes §4.

```markdown
8c. **An unattended run's `Bash` escape is closed only by a sandbox** — the 2026-10-12 review's SEC-1, SEC-3 and SEC-5
each reproduced prompt-free execution in an unattended `/pharn-loop`, and each fix left the same residual. Since 6.76.0
the loop refuses to start without evidence of an isolated environment holding none of a fixed list of credentials,
unless the operator passes `--accept-host-execution` (`pharn/floor/check-run-isolation.mjs`). The record, the run
report and the commit message repeat the outcome from a witness file the run itself can rewrite. That is a refusal,
not a closure: the evidence is environment-supplied and fakeable, the lists are partial, and the agent's own model
credential is always present (`LIMITS.md §6`).
```
