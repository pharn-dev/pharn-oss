# PLAN — instruction-growth-gate

- spec_content_hash: d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4
- applied_lessons: [L17, L34, L35, L41, L54, L59, L60, L62, L65]
- increment: a product floor checker that computes the always-loaded instruction set of a project (`--report`, advisory) and the bytes a change ADDS to it since a base commit (`--growth`, floor), wired into `/pharn-verify` as one runner-injected gate, `instruction-growth`, with its threshold read from the BASE commit.
- layer(s): product floor (`pharn/floor/`), one product command (`/pharn-verify`), two contracts (`verify-report`, `gate-run-record`)
- constitution_refs: [P0, P2, P3, P5, P6, P7]
- base: `d40667d` (main, 6.35.2), worktree `.claude/worktrees/instruction-growth-gate`

## Applied lessons

- L17 — `--growth` is a CHANGED-SINCE-BASE measure, not "written by the build". The checker's header, its JSON and the
  `/pharn-verify` bullet say so; a human's own uncommitted CLAUDE.md edit in the same tree counts, and that is a stated
  bound, not a defect to explain away at review.
- L34 — an empty set is a real, stated GREEN only where it is genuinely empty: no `CLAUDE.md` and no rules gives
  `added_bytes: 0` with `files: []` and a note `no-instruction-files`, and a test asserts the note (so "found nothing"
  and "looked at nothing" are distinguishable). Every unusable input (no base, unreadable file, git failure, bad
  threshold) is INCONCLUSIVE, never an empty GREEN.
- L35 — one owner per fact: frontmatter via `frontmatter-core.mjs` (`matchFrontmatter`, `readValue`); the HEAD set via
  `reconcile-baseline.mjs` `enumerate()`; the base choice via `stage-regress-core.mjs` `resolveBaseSource()` (BASE_RULE);
  the gate id lives once in `gate-run-core.mjs` and the checker never restates it.
- L41 — the 2048 default lives in ONE place (`instruction-files-core.mjs` `DEFAULT_GROWTH_BYTES`), and a test reaches it
  through the real CLI with NO threshold key and NO config at base (the path production takes).
- L54 — every lstat-before-read in the I/O module tests absence with `lstat` ENOENT only, never `existsSync`.
- L59 — the symlink path kinds (file link, dir link, dangling link, looping link, link out of root) are an enumeration
  the fixtures iterate, on BOTH the worktree side (lstat/readlink) and the base side (git mode 120000 link text).
- L60 — each anti-gaming property gets its own negative control: a mutant that undoes exactly that property (net
  instead of added bytes; threshold read from the working tree; gitignore not honoured; untracked files dropped), run
  once against the suite and recorded in BUILD.md as red.
- L62 — every value quoted into a refusal reason (a config value at base, a path, a `paths:` pattern) goes through a
  total quoting helper; a test feeds `{"toString":1}` as the threshold with a control proving `String()` throws on it.
- L65 — the threshold is a RECORD the gate compares against, so it must sit outside the judged stage's reach: it is read
  from the base COMMIT (`git` object), never the working tree. Named residual: the build can still move HEAD with a Bash
  `git commit` (BASE_RULE then picks the new HEAD) — detected by nothing; stated as `instruction-growth-base-binding`.

## Discovery (live, this run)

### Evidence the brief cites (verified on disk)

- `.dev/measurements/loop-wall-clock-2026-10-05.md:132-138`: "the same 16 files … 634,379 B": `CLAUDE.md` 418,456 B,
  14 `.claude/rules/*.md` 213,290 B, and `MEMORY.md` 2,633 B (auto memory — the brief's sum omits it; it is out of
  this checker's set by design). §10 (`:352-354`): 8 rules carry `description:` + `globs:`, 6 carry none, none carries
  `paths:`. CONFIRMED.
- "the growth came from features (plans routed narrative into CLAUDE.md)": USER-REPORTED, not verifiable from this
  repo; carried as such into the CHANGELOG entry.

### Claude Code loading semantics — quoted from <https://code.claude.com/docs/en/memory> (fetched 2026-10-05)

Each item: DOCUMENTED (quoted) or ASSUMED (listed again under Bounds).

1. Project instructions: "`./CLAUDE.md` or `./.claude/CLAUDE.md`". DOCUMENTED → both are in the set (the brief names
   only the root file; `.claude/CLAUDE.md` is added because the docs name it and leaving it out is a free bypass —
   decision D5).
2. "Files in subdirectories load on demand when Claude reads files in those directories." DOCUMENTED → nested
   `CLAUDE.md` excluded.
3. "CLAUDE.md and CLAUDE.local.md files in the directory hierarchy above the working directory are loaded at launch."
   → ancestors above the project root are outside the root and excluded (stated bound).
4. Imports: "Relative paths resolve relative to the file containing the import … Imported files can recursively import
   other files, with a maximum depth of four hops." / "Import parsing skips Markdown code spans and fenced code
   blocks." / "put a backslash before each space … the path ends at the first space" / "A path wrapped in quotes isn't
   imported at all". DOCUMENTED.
   ASSUMED: the token starts at line start or after whitespace (so `user@example.com` is not an import); trailing
   punctuation stays part of the path (so `@README.` names a file `README.`, which is then reported missing); an import
   inside a `.claude/rules/*.md` file is expanded too (docs say "CLAUDE.md files can import" and "Inside each
   `AGENTS.md`: `@path` imports are expanded"; rules are not named — counting them is the fail-closed direction).
5. External imports: "An import in a project-level memory file is external when its path resolves outside your working
   directory … it shows an approval dialog". DOCUMENTED → outside-root targets are not counted, reported
   `outside-root`.
6. Rules: "All `.md` files are discovered recursively" / "Rules without `paths` frontmatter are loaded at launch" /
   "`paths` is the only field Claude Code reads from a rule; any other field is ignored without an error" / `paths`
   "Accepts a YAML list or a comma-separated string" / "If the YAML between the markers doesn't parse, Claude Code
   ignores the frontmatter and loads the rule as if it had no `paths`". DOCUMENTED → `globs:` is ignored by Claude Code
   (the `globs-not-read` note is a documented fact, not an assumption); a frontmatter we cannot read as YAML counts as
   always-loaded.
   ASSUMED: (a) catch-all set `**`, `**/*`, `*` (the brief's set). The docs' table says `*.md` matches "Markdown files
   in the project root", so `*` strictly matches root-level files only; it is counted as always-loaded anyway (any root
   file read triggers it) with the `paths-catch-all` note — the over-count direction. (b) a `paths:` key with no
   patterns counts as always-loaded (`paths-empty`). (c) our YAML reading is a conservative line reader, not a YAML
   parser: an unquoted scalar starting with a YAML indicator (`*`, `&`, `!`, `%`, `@`, `` ` ``) or a tab-indented line
   marks the frontmatter `frontmatter-unparsed` → always-loaded (the Cursor-style `globs: **/*.ts` is exactly such a
   line). Over-counts, never under-counts, for the shapes it recognises; a YAML error it does not recognise is a bound.
7. Rule symlinks: "The `.claude/rules/` directory supports symlinks … Circular symlinks are detected and handled
   gracefully" / "a symlink whose target is outside your working directory [is treated] like an external import".
   DOCUMENTED → in-root link targets are followed (hop cap 8, ASSUMED), out-of-root are reported, not counted.
8. `CLAUDE.local.md`: "create a `CLAUDE.local.md` at the project root. It loads alongside `CLAUDE.md`". DOCUMENTED →
   listed by `--report` as personal; excluded from `--growth` (brief).
9. AGENTS.md: "By default, Claude reads `AGENTS.md` only when you have no `CLAUDE.md` in your working directory or above
   it" (and `CLAUDE.local.md`, `.claude/CLAUDE.md` count for that check). DOCUMENTED → `AGENTS.md` and
   `.claude/AGENTS.md` at the root are in the set only when neither `CLAUDE.md` nor `.claude/CLAUDE.md` is; the
   `CLAUDE.local.md` half of the rule is NOT applied (personal file; decision D5), and the
   `claude-md-and-agents-md` user setting is invisible to the checker (bound).
10. "Block-level HTML comments … are stripped before the content is injected" and "Claude Code skips a file over 4
    MiB" and `claudeMdExcludes`: NOT modelled — the checker counts raw bytes (over-count, stated).
11. Auto memory "Loaded into: Every session (first 200 lines or 25KB)": user-level, excluded (brief).

### Every reader of `pharn.config.json` in `pharn/floor/*.mjs`

Command: `grep -l "pharn.config.json" pharn/floor/*.mjs | grep -v "\.test\.mjs$"` → **13 files** (full output, not
truncated). None parses the file closed-key; none rejects an unknown top-level key:

| file:line                                                                | access                                                                                                                                                          |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ac-gate-core.mjs:46`                                                    | comment only, no read                                                                                                                                           |
| `check-ac-tests.mjs:38`                                                  | comment only (the `manifest` NOTE is a NAME match through `test-infra-core.mjs:176`)                                                                            |
| `check-bash-reconcile.mjs:289-292`                                       | copies the file bytes into a probe sandbox; never parses it                                                                                                     |
| `check-model-config.mjs:141-171` (`readConfig`), `:175-189` (`stagesOf`) | parses; requires a plain object; reads only `models.stages`; closed-key validation is over `models.stages` entries only (`validateStages`), never the top level |
| `check-verify.mjs:68`                                                    | comment only                                                                                                                                                    |
| `render-cost-ledger.mjs:566-571` (`readSkillsVersion`)                   | parses; reads `skillsVersion` only                                                                                                                              |
| `route-token-core.mjs:6`                                                 | comment only                                                                                                                                                    |
| `run-marker.mjs:5`                                                       | comment only                                                                                                                                                    |
| `stage-agent-core.mjs:258-259,508`                                       | message strings only                                                                                                                                            |
| `stage-agent.mjs:132,441-448`                                            | stats the path; parsing is delegated to `check-model-config.mjs resolve`                                                                                        |
| `test-infra-core.mjs:125,140,548`                                        | reads through `test-results-core.mjs` `loadResultsConfig`; pins `testResults` VALUES only                                                                       |
| `test-results-core.mjs:116-141` (`readResultsConfig`), `:150-160`        | parses; requires a plain object; reads only `testResults`; closed-key over that block's gate ids only                                                           |
| `test-results-formats.mjs:90`                                            | comment only                                                                                                                                                    |

Outside that list: `.claude/hooks/enforce-writes-scope.cjs:445-446` parses and reads `skillsVersion` only. So a new
top-level key `budget` changes no existing verdict (and is not in the AC test-infra pin, which reads `testResults` values
only). **Bound, unverifiable here:** whether `pharn-cli`'s `pharn update` preserves an unknown top-level key (its
source is in the separate `pharn-cli` repo). If it does not, a raised threshold is lost on update and the gate falls back
to the 2048 default — the strict direction.

### How built-in verify gates are wired (followed, not refactored)

- `gate-run-core.mjs:110` `RESERVED_IDS` = `reconcile`, `completeness`, `ac-delivery`, `ac-evidence`; `:306-307`
  `parseGatesSpec` refuses a reserved id; `:486` `resolveSet` refuses one in a source set.
- `gate-run-core.mjs:395-402` `reconcileEntry()` — fixed argv; `:413-418` `orderEntries(source, extras, withReconcile)`
  appends it LAST; `:528` `resolveSet` passes `stage === "verify"`, so ONLY verify gets injected entries (regress and
  ac-test never do); `:760-764` `validateStamp` holds `reconcile` last.
- `gate-run-core.mjs:238` `NON_REUSABLE_IDS`; `gate-reuse-core.mjs:163` misses `not-reusable-id` for a member;
  `gate-run-core.mjs:652` refuses a reused member in a stamp.
- `run-gates.mjs` calls `resolveSet` at init; `stage-verify.mjs` drives `run-gates init --stage verify`. Neither needs a
  change: the new entry has a FIXED argv, exactly like `reconcile`. `check-verify.mjs` is generic over gate keys, so a
  non-zero exit puts the id in `failing_gates` and the verdict is `FAIL`.
- `check-loop.mjs:140,305` treats only `reconcile` (and `ac-evidence`) as terminal; any other red is `CONTINUE` under the
  cap.
- **Doc-vs-repo mismatch (P6), surfaced, decision D1:** the brief says "using the base the verify stage already
  resolves". `/pharn-verify` resolves NO base (`grep -n base pharn/floor/stage-verify*.mjs` → no base resolution;
  `.claude/commands/pharn-verify.md:257` "No base worktree and no base install"). The bases that exist: `/pharn-regress`
  BASE_RULE (`stage-regress.mjs:433-462`, rule `stage-regress-core.mjs:225-230`), `/pharn-ship --quick` item 7
  (`pharn-ship-quick.md:92-96`, the same branches), `/pharn-loop` S3 `git rev-parse HEAD` (`pharn-loop.md:116-124`).
- `/pharn-dev-verify` does not use `run-gates.mjs` (`grep -n "run-gates\|stage-verify" .claude/commands/pharn-dev-verify.md`
  → no match), so the dev loop is unchanged by construction.
- Installer: "the installer copies `pharn/floor/` whole minus tests" (CHANGELOG [6.21.1]), so the three new modules reach
  every install with no `MIN_CLI` move.

## Decisions for acceptance (GATE 1)

- **D1 — base for the gate.** Recommended **(C)**: fixed argv `check-instruction-files.mjs --growth --base-rule`; the
  checker applies BASE_RULE's non-interactive branches (`resolveBaseSource` imported, L35): dirty tree (any porcelain
  path outside `.pharn/`) → `HEAD`; else `git merge-base HEAD origin/main`; else INCONCLUSIVE `base-unresolved` (a gate
  cannot ask). Inside `/pharn-ship`, `/pharn-loop` and `--quick` runs the tree is dirty at verify (the build is
  uncommitted until loop Step 6c), so this resolves to the same commit item 7 and loop S3 resolve. Residual
  `instruction-growth-base-binding`: a commit made during the run moves HEAD and hides what it committed. Alternative
  (A): plumb the run's resolved base through `/pharn-verify --base` → `stage-verify.mjs` → `run-gates init` → the entry
  argv, plus the three orchestrator call sites — closes the residual inside ship/loop, but touches run-gates' CLI, the
  stage progress record and three command files (contradicts "one gate wiring").
- **D2 — gate id and reuse.** Id `instruction-growth`, added to `RESERVED_IDS` and `NON_REUSABLE_IDS`. **Never reused**:
  regress never runs it (verify-only injection), and its input includes `origin/main`, which the reuse identity does not
  bind. This replaces the brief's "reused only if base, threshold and set hashes are identical" with the stricter
  "never".
- **D3 — threshold.** `budget.instructionGrowthBytes` read from `git` objects at the BASE commit; default **2048** when
  the file or the key is absent at base; present-but-malformed (not JSON, not an object, `budget` not an object, value
  not a non-negative safe integer) → INCONCLUSIVE `threshold-malformed`. RED when `added_bytes > threshold`. Escape for a
  legitimately large convention: a human raises the key in a separate commit on the base branch before the feature.
- **D4 — "added bytes".** Per file in the HEAD set: a file not in the BASE set (new, lost `paths:`, gained a catch-all,
  newly imported, renamed in) counts WHOLE; a file in both counts the bytes of its HEAD lines minus the base lines as a
  LINE MULTISET (positive part only, each line's bytes plus its newline), so removals never offset additions and a line
  moved within one file is not counted. A move ACROSS files counts (conservative). `CLAUDE.local.md` is excluded.
- **D5 — set scope beyond the brief.** Adds `.claude/CLAUDE.md` and the AGENTS.md rule (documented, items 1 and 9) and
  follows in-root rule/import symlinks; HTML comments, the 4 MiB skip and `claudeMdExcludes` are not modelled.
- **D6 — `/pharn-loop` on this RED.** verify `FAIL` with `instruction-growth` in `failing_gates` → `check-loop.mjs`
  `CONTINUE` (not terminal) → the next build gets the fix list. It cannot go green by deleting unrelated content
  (removals never offset — D4) or by raising the threshold in its tree (read from base — D3); the only route is to add
  ≤ threshold bytes to the set. An INCONCLUSIVE gate (exit 2) is also a red the loop retries to the cap — named.
- **D7 — `--report`** stays CLI-only plus docs; preflight wiring into ship/loop is the named follow-up
  `instruction-files-preflight-report`.

## Files

- `pharn/floor/instruction-files-core.mjs` — NEW, pure: closed sets (notes, reason codes, catch-alls, exits), import
  tokenizer, `paths:` reader over `frontmatter-core.mjs`, set computation over an abstract tree, line-multiset added
  bytes, threshold parsing, total quoting — layer product floor
- `pharn/floor/instruction-files.mjs` — NEW, I/O: worktree tree (`enumerate()` + lstat/readlink/no-follow read), base
  tree (`git ls-tree`/`cat-file`), BASE_RULE, threshold read at base, `evaluate(argv)` → `{code, doc}` — layer product
  floor
- `pharn/floor/check-instruction-files.mjs` — NEW, CLI entry with NO static import (the `check-quick-scope.mjs:1-116`
  pattern): exit 0/1/2, `crashed` → 2 — layer product floor
- `pharn/floor/instruction-files-core.test.mjs` — NEW tests (pure rules)
- `pharn/floor/check-instruction-files.test.mjs` — NEW tests (CLI over temp git repos, crash routing, acceptance
  fixtures)
- `pharn/floor/gate-run-core.mjs` — register: `INSTRUCTION_GROWTH_ID`, `instructionGrowthEntry()`, injected by
  `orderEntries` for verify before `reconcile`; `RESERVED_IDS` and `NON_REUSABLE_IDS` gain the id
- `pharn/floor/gate-run-core.test.mjs` — pins updated (reserved, non-reusable, order)
- `pharn/floor/gate-reuse-core.test.mjs` — pins updated if it enumerates `NON_REUSABLE_IDS`
- `pharn/floor/ac-gate-core.test.mjs` — pins updated if it enumerates `RESERVED_IDS`
- `pharn/floor/check-loop-fresh.test.mjs` — pins updated if it enumerates the reserved ids
- `pharn/floor/check-loop.test.mjs` — one case: a FAIL whose `failing_gates` is `["instruction-growth"]` is CONTINUE
- `pharn/floor/run-gates.test.mjs` — copied-floor roots gain the checker; verify order pins updated
- `pharn/floor/stage-verify.test.mjs` — copied-floor queue gains the checker; verify-level acceptance tests (5 KB
  append → FAIL with the id; one-line edit → PASS; 5 KB + raised working-tree threshold → FAIL)
- `pharn/floor/stage-regress.test.mjs` — only if its copied floor needs the checker (verify-only injection: expected no)
- `pharn/floor/stage-runtime.test.mjs` — its slow-step count pins "a, b and the injected reconcile" (added after GATE 1
  from the grill's P1 finding; test-only)
- `pharn/floor/frontmatter-core.test.mjs` — its CONSUMERS list gains the new frontmatter consumer (added after GATE 1
  from the grill's P1 finding; test-only)
- `.claude/commands/pharn-verify.md` — one reference bullet beside the `reconcile` bullet; `version:` bump
- `pharn/pharn-contracts/verify-report.md` — the gate id where built-in gates are listed
- `pharn/pharn-contracts/gate-run-record.md` — the reserved-ids line and the injected-order sentence (they enumerate the
  injected entries; leaving them would be the L50 drift)
- `CLAUDE.md` — the Commands block entry for the checker (this repo's own CLAUDE.md is NOT gated: the dev loop does not
  run it)
- `SKILLS_VERSION` — 6.35.2 → 6.36.0 (minor: a new floor checker and a new verify gate)
- `README.md` — the version badge, and the generated CURRENT-STATE region if `docs:generate` changes it
- `CHANGELOG.md` — a `## [6.36.0] - 2026-10-05` section with the measurement figures
- `.dev/features/instruction-growth-gate/BUILD.md` — the build note and the mutation-control record (a literal path: the
  plan-scope setter emits literal paths only, so the earlier `**` entry scoped nothing; `docs/capabilities/**` was dropped for
  the same reason and because only the README CURRENT-STATE count moves)

### Not touched

- `pharn/floor/run-gates.mjs`, `stage-verify.mjs`, `check-verify.mjs`, `check-loop.mjs` — no change (fixed argv; generic
  verdicts). `MIN_CLI` — stays 0.5.0: no installed path moves, an absent key defaults cleanly, and the floor is copied
  whole. `.dev/floor/**`, `/pharn-dev-verify` — unchanged. `LIMITS.md` — human-only (hook-denied); proposed §3 text below.

## Contracts satisfied

- `pharn/pharn-contracts/verify-report.md` — the verdict rule is unchanged; one more built-in gate id is named.
- `pharn/pharn-contracts/gate-run-record.md` — reserved ids and injected order (`reconcile` still last).
- `pharn/pharn-contracts/stage-exit.md` — untouched (no new stage exit).

## Evals / tests (P1; these are floor checkers, not role-bearing capabilities, so "evals" are `node --test` suites)

Core + CLI, each case naming the property it can falsify:

- no `CLAUDE.md` and no rules → report `files: []` + `no-instruction-files`; growth 0, GREEN (L34)
- `@import` chain (counted), cycle (`import-cycle`, counted once), missing target (`import-missing`, not fatal), depth 5
  (`import-depth-exceeded`, not counted), target outside root and `~/` (`outside-root`), import inside a code span and a
  fenced block (not imported), quoted path (not imported), escaped space (imported)
- rules: `paths:` (excluded), catch-all `paths:` each of `**` `**/*` `*` (counted + `paths-catch-all`), `globs:` only
  (counted + `globs-not-read`), none (counted), nested subdir (counted), comma-string and flow-list `paths`, empty
  `paths:` (`paths-empty`), YAML-indicator value (`frontmatter-unparsed`), CRLF frontmatter, BOM
- symlink kinds (L59): rule link to in-root file (followed), to in-root dir (expanded), dangling, looping, out of root
- AGENTS.md read only when no CLAUDE.md / .claude/CLAUDE.md
- growth: a rule losing `paths:` and one gaining a catch-all between base and head (whole file counts); a new UNTRACKED
  always-loaded file (counted); a gitignored one (not counted, noted); `CLAUDE.local.md` (report yes, growth no); pure
  deletion (0, GREEN); adds N + removes M > N, N > threshold → RED (anti-gaming, mutant "net bytes" → test red);
  threshold raised in the working tree only → base value applies (anti-gaming, mutant "read working tree" → red);
  threshold absent → 2048 through the real CLI (L41); valid; invalid (`threshold-malformed`); `{"toString":1}` value
  with a `String()`-throws control (L62); unresolvable base (`base-unresolved`); explicit bad `--base`
  (`base-not-commit`); unreadable file in set (`unreadable`); crash routing (unloadable core → 2 `crashed`)
- verify level (`stage-verify.test.mjs`, real CLI): 5 KB appended to `CLAUDE.md` → `verdict: FAIL`, `failing_gates`
  contains `instruction-growth`; a one-line edit → `PASS`; 5 KB + `budget.instructionGrowthBytes: 100000` in the working
  tree → still `FAIL`
- acceptance `--report` on a pharn-starter-shaped fixture (a large `CLAUDE.md`, 8 `globs:` rules + 6 bare rules): exact
  totals and 8 `globs-not-read` notes
- coverage ≥ 90% lines per new/modified `.mjs` (`node --test --experimental-test-coverage`), measured per file at build

## Guarantee audit (P0)

- "`--growth` RED means the always-loaded set (as THIS checker models it) gained more than the base threshold since the
  base" → floor: enum-regex/membership + byte arithmetic over git objects and the enumerated tree (primitive #3),
  deterministic, no model.
- "the threshold cannot be raised by the feature's own working tree" → floor: it is read only from the base commit's
  objects. NARROWED: a Bash `git commit` during the run moves HEAD and so the base (`instruction-growth-base-binding`).
- "removals never offset additions" → floor (D4 arithmetic), with a mutation control.
- "the gate runs in every product verify" → floor for the WIRING (`orderEntries` injects it for `stage === "verify"`;
  `validateStamp` needs nothing new); advisory that a run invoked `/pharn-verify` at all (unchanged).
- "the set equals what Claude Code loads" → ADVISORY. It is the documented rules (quoted above) plus the listed
  ASSUMPTIONS; the harness's set may differ (versions, settings, `claudeMdExcludes`, HTML-comment stripping).
- "`--report` tokens" → ADVISORY estimate: bytes/4, labelled per `LIMITS.md §1c`.
- "`/pharn-loop` cannot game it" → floor for the two named routes (deletion, working-tree threshold); not for a
  mid-run commit (residual) or for writing into a git-ignored file (outside the set, as the brief specifies).

## Trust audit (P2)

- Inputs are untrusted repository content: file bytes, frontmatter, import tokens, the config at base. They are used as
  path OPERANDS (normalised, containment-checked, never followed out of root), set members and byte counts — never
  executed, eval'd, or compiled into a RegExp. `git` is invoked with `execFileSync` argv arrays (no shell). Paths and
  values quoted into JSON go through a total quoting helper (L62). The JSON report carries paths (untrusted DATA); no
  verdict reads anything but integers and closed codes.

## Determinism audit (P5)

- Every branch is a membership test or integer comparison: base source (closed kinds), notes and reason codes (closed
  sets), catch-all membership, `added > threshold`. The terminal fallback of the base choice is INCONCLUSIVE (the gate
  cannot ask); a human supplies `--base` on the CLI.

## Bounds (each also lands in the checker header and the proposed LIMITS.md §3 text)

- changed-since-base, not written-by-the-build (L17); git-ignored files are outside the set; `CLAUDE.local.md` excluded
  from growth; ancestors above the root, user-level `~/.claude/**`, managed policy and auto memory excluded; the
  ASSUMED items 4, 6, 7 (hop cap), 9, 10 above; `pharn update` key preservation unverified; the base-binding residual;
  raw bytes, not tokens; INCONCLUSIVE is a red the loop retries.

## Proposed `LIMITS.md §3` text (human-applied — the agent cannot write `LIMITS.md`)

> ### 3e. The always-loaded instruction set is estimated, not measured
>
> `pharn/floor/check-instruction-files.mjs` models the files Claude Code attaches to every session from its published
> memory documentation plus stated assumptions; the harness's actual set may differ. `--report` is advisory and its
> token figure is bytes/4 (§1c). `--growth` (the `/pharn-verify` gate `instruction-growth`) counts bytes added since a
> base commit, against a threshold read from that commit. Not counted: git-ignored files, `CLAUDE.local.md`,
> subdirectory `CLAUDE.md` files, ancestors above the project root, `~/.claude/**`, managed policy files and auto
> memory. Whether `pharn update` preserves an unknown `pharn.config.json` key is not verified from this repository.

## Open questions (HALT)

- D1 (C vs A), D2 (never reused), D3 (2048), D4 (line multiset, moves within a file free), D5 (scope additions) — for the
  human's acceptance at GATE 1.

## Self-review (before the halt)

- (a) loading-semantics claims: each is quoted or listed ASSUMED (items 4, 6, 7, 9 carry explicit ASSUMED lines).
  Correction made: the brief's `*` catch-all contradicts the docs' `*.md` row; kept, labelled ASSUMED/over-count.
- (b) net vs added: D4 and every test say ADDED, positive part only. No "net" anywhere except as the mutant's name.
- (c) threshold from the working tree: nowhere; D3 reads `git` objects at base. The verify-level test proves it.
- (d) untracked files: HEAD side is `enumerate()` = `--cached --others --exclude-standard`; a test adds an UNTRACKED rule.
- (e) unusable input → GREEN: none; every unusable path is exit 2 with a closed `reason_code`. Correction made: an
  unborn HEAD at verify was going to read as an empty base (everything added); changed to `base-unresolved`.
- (f) wiring claims carry file:line (Discovery, "How built-in verify gates are wired").
- (g) reuse: stated — never reused (D2).
- (h) tests that pass with the behaviour broken: four mutation controls named (L60); each recorded red in BUILD.md.
- (i) shipped `.dev/**` cites: none planned in `pharn/**` or `.claude/commands/pharn-verify.md`; the build greps the
  new and edited shipped files for `.dev/` before the floor run. Correction made: the CHANGELOG entry's usual
  `.dev/features/<name>/` link is kept — `CHANGELOG.md` is repo-meta, not product surface (CLAUDE.md, "SKILLS_VERSION
  discipline") — and the measurement figures are quoted there with their source path, as every entry does.
- (j) absence from truncated output: the reader count is from a full `grep -l` listing (13 lines, untruncated); the
  `/pharn-dev-verify` claim is from a full-file grep with zero matches.
