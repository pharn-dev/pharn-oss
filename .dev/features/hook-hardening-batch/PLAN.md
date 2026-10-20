# PLAN — hook-hardening-batch

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L26, L27, L31, L37, L64, L68, L73]
- increment: the two write-guard hooks deny an empty or unreadable stdin, protect-trusted-paths gets the fail-closed
  `uncaughtException` handler, the setter refuses CI workflows and git hooks directories from a plan in an installed
  project, and the trusted-doc prose the 2026-10-12 audit left open is collected into one human-run patch.
- layer(s): build apparatus (`.claude/hooks/` guards — product surface, human-applied), trusted docs (human-applied)
- constitution_refs: [P0, P2, P5, P6, P7]

Audit 2026-10-12 findings TST-4, TST-11, the remainder of SEC-5, SEC-7's prose half, CTX-13, and the THREAT-MODEL
follow-ups 6.67.0 named. Batch group O, branch `fix/hook-hardening-batch`, from `origin/main` at 6.67.1 (`fed364dc`).
Every target file below marked HUMAN is hook-protected (CLAUDE.md hard constraint 1) and is never written by the agent
through any tool, Bash included. The agent writes the tests, a sha256-pinned Python script the maintainer runs, its
readable twin, and the records — the 6.53.1 (#334, `hook-hardening/apply_protected_edits.py`) and 6.54.1 (#336)
pattern.

## Discovery (live, this run)

- **TST-4 reproduced from source.** `protect-trusted-paths.cjs:757-763` and `enforce-writes-scope.cjs:922-928`: a
  `readFileSync(0)` error returns `""`; `:811` / `:1266` parse `raw || "{}"`, so an empty or unreadable stdin becomes
  `{}`, which is not a write, and the hook exits 0. A whitespace-only stdin already denies (`JSON.parse` throws).
- **TST-11.** `enforce-writes-scope.cjs:214` registers a `process.on("uncaughtException")` that exits 2;
  `protect-trusted-paths.cjs` has none, so a throw outside its per-path `try` (message composition, the stdout write,
  module-level setup) exits 1, which Claude Code treats as non-blocking.
- **SEC-5 remainder.** `set-writes-scope.cjs:547` refuses only `isReserved()` (PHARN's own surface) from a plan in an
  installed project. `.github/workflows/**` and a git hooks directory (`.husky/`, or wherever `core.hooksPath`
  points inside the project) pass, and in scoped mode `enforce-writes-scope.cjs` then allows the write. Neither hook
  shells out to git; the setter uses no `child_process` either.
- **`isReserved()` is read by enforce in the PERMISSIVE posture only** (`:1345`, `:1350`): an installed project, no
  scope, no run open — ordinary Claude Code use outside PHARN. Its deny body says "PHARN's own installed surface …
  `pharn update`". Scoped mode never consults it. See Q1.
- **Prose inputs.** `.dev/features/audit-small-fixes/HUMAN-PATCH.md` H1: its anchor (§6, the True-statement bullet)
  is still byte-present in `LIMITS.md`; its claims re-checked against the hooks' anchored `isWrite` regex (still
  `^(Write|Edit|MultiEdit|NotebookEdit)$`) and `hook-wiring.test.cjs` (carries the `disableAllHooks` test). Not stale.
  `.dev/features/loop-grant-seam-skill/PROBE.md` (Claude Code 2.1.303, `-p`, command-file targets only).
  `.dev/measurements/loop-wall-clock-2026-10-05.md` §3 and `pipeline-performance-audit-2026-09-29.md` §3–5 for
  CTX-13. Group G's §9 draft exists in its worktree; the orchestrator hands the final text over (slot below).

## Approach

1. **TST-4 (both hooks, HUMAN).** `readStdin()` returns `null` on a read error. The caller denies through the existing
   `denyMalformedHookInput()` with a fixed detail — `stdin could not be read` for `null`, `empty input` for `""` —
   and parses `raw` without `|| "{}"`. Every other path is unchanged.
2. **TST-11 (protect, HUMAN).** Copy enforce's handler, registered right after the `require`s, before any top-level
   computation. Its stderr line names this guard; it exits 2 and never writes stdout.
3. **SEC-5 (setter only, HUMAN — Q1).** A new function `isExecConfig(rel, hookDirKeys)` and a refusal layered after
   the PHARN-surface one, same conditions (installed project, `--from-plan`), its own message and its own operator
   opt-in `--allow-exec-config` (before the mode, like the other two — Q2). The class: `.github/workflows` and below;
   `.husky` and below; and every `core.hooksPath` value found (Q3), resolved against the project root, when it lies
   inside it (a hooks directory equal to the root reserves top-level entries only). Matching on `toKey()` (folded),
   and — L73 — each discovered directory is reserved at its written path AND at its real path
   (`fs.realpathSync.native` of the nearest existing ancestor), so a `core.hooksPath` that names a symlink cannot
   hide the real directory. A plan entry that reaches a reserved directory through a symlinked parent is left to
   enforce's existing resolution, which in scoped mode judges the target the write reaches and denies it as out of
   scope (a test pins that). Revised at build, before any write (GRILL coupling finding): matching plan entries
   on-disk in the setter would duplicate that backstop. `isReserved()` and `toKey()` stay byte-equal to enforce's;
   enforce is not touched for this item.
4. **Prose (HUMAN), each sentence probed against the patched code before hand-off (L37, L64):**
   - (a) `LIMITS.md §6`: H1 verbatim (MCP write tools, `disableAllHooks`).
   - (b) `THREAT-MODEL.md §2` item 8: a skill that declares no `allowed-tools` loaded through the Skill tool with no
     grant and no prompt (measured on command-file targets, one version, `-p`); `/pharn-loop` grants only the five
     `Skill(pharn-<stage> *)` entries.
   - (c) `THREAT-MODEL.md §2`, a new item 10: a model-written PLAN is the write-scope input; executable project
     config (CI workflows, git hooks directories, `package.json` scripts) is in that class. What is refused now
     (control surface, PHARN surface, executable config in an installed project), what is not (`package.json`, any
     Bash write), and that what the refusal buys is persistence outside the run, not execution inside it (the
     loop's pinned gates already run code the build wrote — `pharn-loop.md`).
   - (d) `LIMITS.md §3b`: correct the framing; new `§3g` (CTX-13): the measured tax is a per-fresh-context prefix
     (68,223–129,646 tokens cache-written per `general-purpose` agent in this repo; 288,489–304,974 per stage agent
     in pharn-starter) times fan-out, plus at least 70 pinned orchestrator calls per green one-iteration loop, each
     re-sending the orchestrator's whole context — rule-file overlap was never measured.
   - (e) `LIMITS.md §9`: a marked slot for group G's text; `apply.py` refuses to run while the slot is unfilled.
5. **`apply.py`** (stdlib only): pins every target's current sha256, refuses on any mismatch before writing anything,
   applies exact single-occurrence replacements in memory, checks each result's sha256 against a pinned after-hash,
   writes all files, prints a summary, deletes itself. Never run by the agent in this worktree (Q4).
6. **Order (L68).** Tests + script + records are built and reviewed by `/pharn-dev-review` first; then STOP. The
   maintainer runs the script; the agent commits the applied files (always-reconciled control surface compares
   against committed blob ids, 6.53.0), runs `npm run docs:generate`, then `/pharn-dev-regress` and
   `/pharn-dev-verify` on the committed tree, then GATE 2 and the PR (Q5).

## Applied lessons

- L26 — the patch is verified at a real repo path: `apply.py` runs inside a throwaway `git worktree` under the
  session scratchpad, where `npm run check` resolves the repo's own ESLint/Prettier/markdownlint config, never on a
  loose copy.
- L27 — the new refusal has its own message whose remedies are reachable for it (`--allow-exec-config`, a human
  edit); it never names `pharn update` or `--allow-pharn-surface`, and the existing PHARN-surface message is not
  widened. A test asserts each remedy present in its own case and absent from the other.
- L31 — every copy-pair the patch touches is listed with its pin: `readStdin()` + the empty/unreadable deny in both
  guards (new parity test), the `uncaughtException` handler (new pin in the existing cross-copy test), and
  `toKey()`/`isReserved()` (existing pin, kept green by not editing either copy).
- L37 — every quantified sentence in the prose (refused/not refused, "any session", "only five") is probed against
  the patched guard or the probe record before the script's after-hashes are pinned.
- L64 — the same probe covers each restatement: the CHANGELOG entry, the dev guide bullet, `pharn-loop.md:210`'s
  setter sentence, and the setter's header.
- L68 — the human apply lands outside any anchor→verify window: regress/verify run only after the applied files are
  committed (Approach 6), and the maintainer is told that order now.
- L73 — each discovered hooks directory is compared at its on-disk identity as well as its folded spelling, and the
  on-disk identity of a plan entry is left to enforce's physical-target check, pinned by a test (Approach 3); the
  bound (a directory that does not exist yet is judged lexically) is stated.

## Files

- `.dev/features/hook-hardening-batch/PLAN.md` — NEW. This file.
- `.dev/features/hook-hardening-batch/GRILL.md` — NEW, by `/pharn-dev-grill`.
- `.dev/features/hook-hardening-batch/apply.py` — NEW. The maintainer-run, sha256-pinned, self-deleting patch.
- `.dev/features/hook-hardening-batch/HUMAN-PATCH.md` — NEW. The readable twin: every edit's file, old text, new
  text and reason, including the §9 slot.
- `.dev/features/hook-hardening-batch/BUILD.md` — NEW, by `/pharn-dev-build`.
- `.dev/features/hook-hardening-batch/REVIEW.md` — NEW, by `/pharn-dev-review`.
- `.dev/features/hook-hardening-batch/REGRESSION.md` — NEW, by `/pharn-dev-regress` (after the apply).
- `.dev/features/hook-hardening-batch/regression-report.json` — NEW, by `/pharn-dev-regress` (after the apply).
- `.dev/features/hook-hardening-batch/VERIFY.md` — NEW, by `/pharn-dev-verify` (after the apply).
- `.dev/features/hook-hardening-batch/verify-report.json` — NEW, by `/pharn-dev-verify` (after the apply).
- `.dev/features/hook-hardening-batch/SHIP.md` — NEW, by `/pharn-dev-ship`.
- `.claude/hooks/protect-trusted-paths.test.cjs` — EDIT. Empty, whitespace and unreadable (stdin is a directory)
  stdin deny; a module-level throw exits 2.
- `.claude/hooks/enforce-writes-scope.test.cjs` — EDIT. The same three stdin cases; the `uncaughtException` pin
  joins the existing cross-copy test; `readStdin()` parity; in scoped mode a write through a symlinked parent into
  `.github/workflows/` is denied (the backstop Approach 3 relies on).
- `.claude/hooks/set-writes-scope.test.cjs` — EDIT. The new class refused (workflows, `.husky`, a discovered
  `core.hooksPath`, a worktree's common config, case/trailing-dot variants, a symlinked hooksPath), `--allow-exec-config`
  opts in only before the mode, dev checkout and `--from-frontmatter` unchanged, message remedies per branch.
- `.dev/guides/writes-scope.md` — EDIT. The setter-refusal list gains the new class and flag.
- `.claude/commands/pharn-loop.md` — EDIT. Line 210's setter sentence names the new class (byte ceiling checked).
- `pharn/floor/README.md` — EDIT. The setter paragraph names the new refusal and flag (a shipped restatement, L64).
- `.dev/floor/command-hygiene.test.mjs` — EDIT. The loop grant pre-approves no setter line carrying
  `--allow-exec-config` (a negative beside the `--allow-pharn-surface` one).
- `CHANGELOG.md` — EDIT. A new version section.
- `SKILLS_VERSION` — EDIT. Bump (Q2).
- `README.md` — EDIT. The version badge.

Applied by the maintainer with `apply.py`, never by the agent: `.claude/hooks/protect-trusted-paths.cjs`,
`.claude/hooks/enforce-writes-scope.cjs`, `.claude/hooks/set-writes-scope.cjs`, `LIMITS.md`, `THREAT-MODEL.md`.

## Contracts satisfied

- `pharn/pharn-contracts/reconciliation-record.md` §4a — the applied control-surface edits are committed before any
  reconcile runs (cite, not restated).

## Evals to write (P1)

No capability changes, so no capability evals. The hook test suites are the specification: the new tests above are
RED on this branch until the script runs (stdin ×2 per hook, the handler pin, every setter refusal case) and GREEN
after; the controls (whitespace stdin, dev checkout, `--from-frontmatter`) are GREEN on both sides. `BUILD.md` lists
each test with its expected pre/post state, measured in the throwaway worktree.

## Guarantee audit (P0)

- "an empty or unreadable stdin denies" → floor: hook (exit 2), Write/Edit/MultiEdit/NotebookEdit surface only.
- "a throw outside protect's decision denies" → floor: hook (the handler exits 2); bounded to a JS exception — a
  signal or a harness that never starts the hook is outside it (`LIMITS.md §7`).
- "a plan cannot scope CI workflows or a git hooks directory in an installed project" → floor: enum/regex membership
  in the setter, a Bash-run program: an agent holding Bash can pass the opt-in or write the record (`LIMITS.md §6`).
  `core.hooksPath` discovery reads the config files named in Q3 only; includes, environment-supplied config and a
  non-default system prefix are not read — stated in the setter header and LIMITS.
- "the prose matches the code" → advisory (L37/L64 probes, recorded in BUILD.md).
- "apply.py refuses on drift" → floor: content-hash (sha256 before and after), for the bytes it was pinned to.

## Trust audit (P2)

- The PLAN's `## Files` and the project's git config files are untrusted input to the setter. The config is read for
  `core.hooksPath` values only, never executed, and only ever ADDS to the refused set (a forged value can over-refuse,
  never under-refuse). Refusal messages quote plan entries only, as today.

## Resolved at GATE 1

Decided 2026-10-20 by the batch orchestrator under the maintainer's delegation — a model decision, not a human
approval. Each question was asked with the recommendation below, and each recommendation was taken.

- Q1 — Where does the new class live? **Resolved: a separate `isExecConfig()` in the setter only.** Adding the paths
  to `isReserved()` (both copies) would also make enforce's permissive posture deny a user's own CI/hook edits outside
  any PHARN run, under a deny body that offers `pharn update` — an unreachable remedy (L27) and outside SEC-5.
- Q2 — An opt-in for a feature that genuinely edits CI? **Resolved: `--allow-exec-config`** (operator flag, before the
  mode), so the bump is **minor** (6.68.0 at today's main; renumbered at PR time).
- Q3 — hooksPath discovery without git. **Resolved as proposed:** parse `core.hooksPath` from the repo-local `config`
  (through a `.git` file's `gitdir:` and `commondir` for a worktree), `config.worktree`, `$GIT_CONFIG_GLOBAL` or
  `~/.gitconfig`, `$XDG_CONFIG_HOME/git/config` (or `~/.config/git/config`) and `/etc/gitconfig`; reserve the union of
  every value inside the root; refuse the plan when a `.git` entry exists but its local config cannot be read. The
  limits (includes and environment-supplied config are not followed) are stated in the setter header and in LIMITS.
- Q4 — Verification. **Resolved:** the agent runs `apply.py` only inside a disposable `git worktree add --detach`
  under the session scratchpad (never this worktree) — a measurement, not an apply — and removes it afterwards with
  `git worktree remove --force`, saying so in `BUILD.md`.
- Q5 — Order. **Resolved:** grill → build → `/pharn-dev-review` → STOP with the exact apply command (path relative to
  this worktree, and the cwd it must run from) for the maintainer. Regress/verify only after the maintainer runs the
  script and the agent commits the applied files. Group G's §9 text arrives from the orchestrator; if it has not by
  review, the run stops anyway and `apply.py` refuses on the empty slot meanwhile.
