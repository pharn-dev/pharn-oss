# The Floor

This directory is the **deterministic floor** — the only part of this repo's build loop that
actually _guarantees_ anything (`CONSTITUTION.md` P0). It is non-LLM, dependency-free (Node stdlib),
and cannot be talked out of its verdict by prompt injection. Everything else — the commands, the
review lenses — is **advisory orchestration** that _invokes_ the floor.

**All three** of the floor primitives in `ARCHITECTURE.md §2` are files here or in `../../.claude/hooks/`.
The table below names the ones this page documents in depth — it is a **reading guide, not an
inventory**. For the live count of checkers in this directory, see the generated `## Current state`
block in the root `README.md`: it is rendered from the tree and held to byte-equality by
`npm run docs:check`, so it cannot go stale unnoticed. This page deliberately does **not** restate that
number — a hand-maintained second copy is exactly what drifted here before (it read "three files" long
after the directory passed forty).

| file                                            | primitive                                | enforces                                                          |
| ----------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------- |
| `validate.mjs`                                  | enum / regex / structural check          | P1, P3, P4; fixes #1, #5, #6                                      |
| `check-structural.mjs`                          | enum / regex-substring / path-resolution | `structural[]` of an eval `expected` (P0, P1)                     |
| `check-spec.mjs`                                | content-hash (+ enum / presence / regex) | the approved-intent pin, fix #4; the opt-in `spec-template` shape |
| `../../.claude/hooks/protect-trusted-paths.cjs` | pre-write hook                           | P2; fix #2                                                        |
| `../../.claude/hooks/enforce-writes-scope.cjs`  | pre-write hook                           | P2, P5; fix #7                                                    |

**Content-hash is a file primitive too.** `check-spec.mjs` owns the product spec pin
(`spec_content_hash`): `--hash` emits the digest `/pharn-spec` pins on approval, and the default mode
re-verifies it, with `check-spec-approved.mjs` and `check-plan-spec-agree.mjs` shelling it rather than
re-implementing the hash. The digest is taken over the SPEC **body** with line endings folded to LF, so
a CRLF checkout does not read as drift — see `bodyHash()` for the exact bound. (The dev loop's own pin
over `pharn/ARCHITECTURE.md` uses the same fold via `../../.dev/floor/hash-doc.mjs`, which ships to nobody.)

**The SPEC template is opt-in.** For a SPEC whose frontmatter declares `spec_template`, `check-spec.mjs` also
enforces, through `spec-template-core.mjs`, the shape defined in `../pharn-contracts/spec-template.md` (sections, the acceptance-criteria
grammar, clarification markers), and `--template-ref <id>` prints the value `/pharn-spec` writes into that
key. A SPEC without the key is validated exactly as before. A valid acceptance-criteria grammar means the
criteria are **phrased** testably, never that any test exists, runs, or passes.

## Run the validator

```bash
node pharn/floor/validate.mjs <pharn-repo-dir>     # default: current dir
```

Point it at the PHARN repo being built. It exits **non-zero on any RED finding**. It deliberately
ignores this repo's own tooling (`.claude/commands/`, `.dev/`, `pharn/floor/`) — those are advisory, not built
PHARN capabilities. `/pharn-dev-build` runs it automatically and halts on RED; you can also run it yourself.

What it checks (all deterministic):

1. capability frontmatter present + required fields, role/kind/coupling enums (`ARCHITECTURE §3.1–3.2`)
2. every capability has non-empty `evals/cases` + `evals/expected` (P1)
3. every `enforces` rule_id is produced by ≥1 eval fixture (P1, **fix #6** — semantic binding, not just namespace)
4. finding templates separate enum-gated from free-text/untrusted fields (**fix #1**)
5. no sibling reference in `reads:` across `pharn-stack-*` / `pharn-skills-*` modules (P3)
6. the four archetype maps agree, _if_ `pharn/pharn-contracts/archetype-maps.json` exists (**fix #5**)
7. `applies` is present and its values are archetype-enum members (`ARCHITECTURE §5`)
8. no capability-canon file cites a **relocated** floor checker — a literal `.dev/floor/<x>` where `pharn/floor/<x>` exists, which would ENOENT and silently degrade that command's deterministic sub-check (P6)

## Run the structural checker

```bash
node pharn/floor/check-structural.mjs <expected.json> <actual.json> [repoDir]
```

`check-structural.mjs` **executes** the `structural[]` reduction that `pharn/pharn-contracts/eval-format.md`
documents. Given an eval's `expected` (normalized to JSON) and a skill's already-produced finding
output (a JSON array of `finding-shape` objects), it evaluates the four structural kinds —
`finding_count`, `field_equals`, `file_resolves`, `needle_absent_from_enum_gated` — plus the one
`skill_kind` rule (`deterministic` forbids a non-empty `semantic[]`), and exits **non-zero on any
RED**. Each kind reduces to a floor primitive (`ARCHITECTURE §2`): an enum/count check, an equality
check, path resolution, or a substring scan over the **enum-gated** fields only (`type`, `rule_id`,
`severity`, `file` — never `problem` / `evidence`, which are untrusted free-text DATA). It does **not**
run the skill; it checks an output the skill already produced.

**What this changes (P0).** Before, `eval-format.md` labeled `structural[]`
**floor-reducible-but-not-yet-enforced** and named this checker as the backstop. With it landed,
`structural[]` is **floor-executable and CI-tested**, and the invokers now exist at the verify/eval
stages — `/pharn-verify` and `/pharn-dev-verify` run it per committed eval pair, and `/pharn-dev-eval`
runs it over each live-emitted run via `.dev/floor/check-variance.mjs` (`/pharn-dev-build` still does
**not** invoke it): when the checker is run, if a model laundered an untrusted needle (e.g. `skip
authz`) into an enum-gated field, or routed a `deterministic` skill's judgment through `semantic[]`,
that is a deterministic **RED**, not a hope — the enforcement moment is the verify/eval stage, never
the write.

**Honest scope (P0) — the boundary that keeps this from overselling.** The checker enforces
`structural[]` **over a provided finding output**. It does **not** run the skill and does **not**
guarantee the model _produces_ a clean, un-laundered output under injection — that is the named
residual (`LIMITS §2`, `THREAT-MODEL §5`, attempt 0). The trip-wire moves onto the floor; the model's
behavior under injection does not become guaranteed. `semantic[]` stays **advisory** — the checker
never evaluates a `judge` string (no LLM).

## Wire the write-guard hooks

Two `PreToolUse` hooks are wired in `.claude/settings.json` (committed), both on
`Write|Edit|MultiEdit|NotebookEdit`; a deny from **either** blocks. **Wire them with the command form that
ships** — `node "${CLAUDE_PROJECT_DIR}"/.claude/hooks/<guard>.cjs`. Claude Code runs a hook in Claude's
_current_ directory, so a relative `node .claude/hooks/…` stops starting after any `cd` into a
subdirectory: node exits 1, which Claude Code treats as a non-blocking error, and both guards go silently
off (measured; the shipped form until `6.1.0`). Each guard then judges the **git working tree that contains
Claude's current directory** — a subdirectory keeps the repo root, a session inside a worktree is judged as
that worktree — and `LIMITS.md §7` states the bounds that remain. **`protect-trusted-paths.cjs` (fix #2)**
blocks any write to a protected path. Paths are matched **repo-relative and exact**, case-folded, against
the guard's own location (plus the work tree Claude is in, when it belongs to the same repository) — never
by bare basename, so a user's own `docs/ARCHITECTURE.md` stays writable. **Git metadata is denied too**: any
`.git` path segment under a guarded root, because those entries decide which tree each guard judges and
`.git/hooks` / `.git/config` run code on the next git command.
The default set is the four trusted spec docs (`pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`,
`THREAT-MODEL.md`, `LIMITS.md`), `CODEOWNERS` at each of the three locations GitHub honors (root,
`.github/`, `docs/`) — the GitHub-layer write-guard itself — and **the two pre-write guards' own control
surface**: both settings files that can wire the hooks (`.claude/settings.json` and
`.claude/settings.local.json`) plus the four hook scripts
(`protect-trusted-paths.cjs`, `enforce-writes-scope.cjs`, `set-writes-scope.cjs`,
`require-loop-record.cjs`). Each hook is re-read
fresh on every tool call, so a write to one would disarm that guard on the very next write. Extend the
set further with the `PHARN_PROTECTED` env var (comma-separated; an entry containing `/` is an exact
repo-relative path, a bare name still matches that basename at any depth). Confirm it works:

```bash
echo '{"tool_name":"Edit","tool_input":{"file_path":"pharn/CONSTITUTION.md"}}' | node .claude/hooks/protect-trusted-paths.cjs   # → exit 2, denied
echo '{"tool_name":"Write","tool_input":{"file_path":".claude/settings.json"}}' | node .claude/hooks/protect-trusted-paths.cjs  # → exit 2, denied
echo '{"tool_name":"Write","tool_input":{"file_path":"docs/ARCHITECTURE.md"}}' | node .claude/hooks/protect-trusted-paths.cjs  # → exit 0, allowed (a user's OWN doc)
```

**`enforce-writes-scope.cjs` (fix #7)** is the runtime scope-enforcement hook: it denies any write
outside the active scope in `.pharn/writes-scope.json` (fail-closed to a default-safe-set when none is
set). Confirm it works:

```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"pharn/floor/x.mjs"}}' | node .claude/hooks/enforce-writes-scope.cjs  # → exit 2, denied (no scope; fail-closed)
echo '{"tool_name":"Write","tool_input":{"file_path":"README.md"}}' | node .claude/hooks/enforce-writes-scope.cjs  # → exit 2, denied (root file outside default-safe-set)
```

The **setter** (`set-writes-scope.cjs`) is separate from both hooks: it refuses to _authorize_ those
same control-surface paths at scope-set time — exits non-zero and writes nothing if the parsed scope names
one, unless the operator passes `--allow-claude-dir`. That early refusal is not runtime enforcement;
**`enforce-writes-scope.cjs`** enforces whatever scope was emitted on every write. `.claude/commands/**`
and the hooks' own `*.test.cjs` are deliberately in neither protected set nor the refusal set.
**Bounded, and stated (P0):** the two `PreToolUse` hooks cover the `Write|Edit|MultiEdit` surface only
— Bash-tool writes bypass them entirely, for these paths exactly as for the trusted docs.

## Honest scope (P0, P7)

Checks **4 and 5 are best-effort.** Markdown has no `import` statement to lint, so they reduce a
class of mistakes — they do not eliminate it (`ARCHITECTURE §4` caveat; `LIMITS`). The floor
guarantees the _structural_ invariants it can compute deterministically; it does **not** guarantee
content is correct — that is `/pharn-dev-review`'s advisory job. A GREEN floor means "the shape is sound,"
never "the architecture is right." Claiming otherwise would be the exact disease P0 exists to
prevent.
