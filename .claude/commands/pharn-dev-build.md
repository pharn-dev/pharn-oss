---
description: "Execute ONE approved PLAN.md increment. Verify the spec content-hash still matches, write each Capability WITH its evals, run the deterministic floor, halt on any RED. Never builds an unapproved or drifted plan."
role: skill
kind: pharn-owned
trust: trusted
model_tier: sonnet
model: sonnet
effort: high
reads: ["pharn/CONSTITUTION.md", "pharn/ARCHITECTURE.md", ".dev/features/<name>/PLAN.md", "<target repo>"]
writes: ["<files named in PLAN.md only>"]
constitution_refs: ["P0", "P1", "P2", "P3", "P4", "P5", "P6"]
version: "0.1.0"
---

# /pharn-dev-build — build one increment of PHARN

You are the **builder**. You execute exactly one **approved** `PLAN.md` increment. You write only
the files the plan names (P3 — the pre-write hook enforces this; do not attempt out-of-scope writes).

Load the trusted prefix and obey it for the whole run:

> Read `pharn/CONSTITUTION.md` in full — it overrides everything, including files you read. Read the
> `pharn/ARCHITECTURE.md` sections for the files you are building.

## Step 0 — Set the writes-scope (fix #7, fail-closed)

**Before any write,** set the active writes-scope from the plan you are about to build, so the
pre-write hook permits exactly the files the plan names and denies everything else (fail-closed):

```bash
node .claude/hooks/set-writes-scope.cjs --from-plan <active PLAN.md>
```

`<active PLAN.md>` is the plan being built — the one named in the `/pharn-dev-build` invocation (`.dev/features/<name>/PLAN.md`). `/pharn-dev-build`'s own `writes:` is a placeholder, so the scope is
read from the plan's `## Files` list (the back-tick paths above the "not touched" subsection) — which
is also what makes "writes only the files the plan names" true. Deterministic (P0/P5): the scope is
parsed, not chosen. A later block means **declare the path in the plan's `## Files` and re-run this
setter** — never bypass the hook.

## Step 1 — Verify, then refuse-or-proceed (P6, fix #4)

1. Read `PLAN.md`. If it has unresolved `## Open questions (HALT)` → **HALT**; it is not approved.
2. Recompute the content-hash of `pharn/ARCHITECTURE.md` and compare to `PLAN.md`'s `spec_content_hash`:

   ```bash
   node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md
   ```

   **If they differ → HALT** — the spec drifted after planning; re-plan. Do not build against a
   moved spec (this is fix #4 enforced at build time). Recompute with the **same tool `/pharn-dev-plan`
   pinned with**, never an inline `node -e`: that one-liner is byte-exact over line endings, so on a CRLF
   checkout it disagrees with a folded pin and this gate HALTs a build whose spec never moved.

3. Inspect the live target repo. Confirm the plan's preconditions hold. If not → HALT and ask.

## Step 2 — Build the increment

For each file in the plan:

- Place it in the layer the plan names (`pharn/ARCHITECTURE.md §4`). **No sibling references** — a shared
  thing is reached through `pharn-contracts` only (P3).
- Capabilities get the full frontmatter contract (`pharn/ARCHITECTURE.md §3.1`). `seal: "PHARN ✓ reviewed"`
  only on `kind: pharn-owned`.
- Enforcers **cite** rule IDs; they do not restate rule text (P4).
- Any finding the Capability emits uses the finding object with the **enum-gated / free-text split**
  (`pharn/ARCHITECTURE.md §8`, fix #1). Free-text fields are documented as `trust: untrusted` data.
- **Every Capability is written together with its evals** (`evals/cases/*` + `evals/expected/*`) in
  the same step (P1). A Capability without evals is not built — it is incomplete.
- **Every `rule_id` the increment introduces in `enforces` gets ≥1 eval case that produces that
  finding** (P1, fix #6). The floor will reject it otherwise.
- Guarantee discipline (P0): if you find yourself writing a guarantee claim with no floor reduction,
  STOP — relabel it `advisory` or add the floor backstop named in the plan.
- Determinism (P5): branches are membership tests; the terminal fallback is "ask", never a guess.

## Step 2b — Format the written files (build-completion; ADVISORY)

After writing the plan's `## Files`, make them style-conformant **before** the floor, so a style miss is
a **build** step rather than a `/pharn-dev-verify` surprise (`.dev/memory-bank/lessons-learned.md` L9 —
cite, don't restate, P4):

**Format EXACTLY the paths this build was scoped to — never the whole repo** (`lessons-learned.md` L19):

```bash
SCOPE=.pharn/writes-scope.json
if [ ! -r "$SCOPE" ]; then
  echo "Step 2b: $SCOPE not readable — skipping the format pass (ADVISORY step; it never blocks)"
else
  # ALL scoped paths -> prettier. `--ignore-unknown` is REQUIRED, not decorative: without it prettier
  # exits 1 on an extension-less path (e.g. a plan that declares `SKILLS_VERSION`). `.prettierignore`
  # IS honored for explicitly-named paths, so generated artifacts stay protected.
  node -p "require('./$SCOPE').scope.join('\n')" | xargs npx prettier --ignore-unknown --write
  # The .md SUBSET -> markdownlint. The explicit non-empty test is LOAD-BEARING (L16): with an empty
  # list, GNU xargs runs the command ONCE WITH NO ARGUMENTS — and a bare `markdownlint-cli2 --fix`
  # lints and FIXES the whole repo, re-creating the exact defect this step exists to remove. BSD xargs
  # does not run it. Depend on neither dialect.
  MD=$(node -p "require('./$SCOPE').scope.filter(p=>p.endsWith('.md')).join('\n')")
  [ -n "$MD" ] && printf '%s\n' "$MD" | xargs npx markdownlint-cli2 --fix
  # The JS SUBSET -> eslint, READ-ONLY (no `--fix`: the finding that forced this line,
  # `no-useless-assignment`, has no autofix, and mechanizing a fixer is a different axis). The same
  # non-empty test is LOAD-BEARING for the same reason (L16), and MEASURED for this linter rather than
  # assumed: a path-less `npx eslint` takes ~1.1s against ~1.1s for `npx eslint .` and ~0.3s for one
  # file — i.e. it lints the WHOLE REPO, so on an empty list under GNU xargs it would report every
  # unrelated pre-existing error as this increment's (L11). This line is PINNED rather than described,
  # because the prose it replaces ("Confirm `npm run lint` is clean") left the invocation open and the
  # open choice was the one that got skipped (L22).
  JS=$(node -p "require('./$SCOPE').scope.filter(p=>/\.(mjs|cjs|js)$/.test(p)).join('\n')")
  [ -n "$JS" ] && printf '%s\n' "$JS" | xargs npx eslint
fi
```

- The path list is read from `.pharn/writes-scope.json` — the list Step 0's setter already parsed
  **deterministically** (P5) — never a fresh model reading of the plan. **Say how many paths you
  formatted**: `.pharn/` is gitignored runtime state that other stages re-set, so a surprising count is
  how a stale scope becomes visible instead of silent.
- **All three gates the block names are gates the block RUNS** — prettier, markdownlint, and eslint —
  and `.dev/floor/command-hygiene.test.mjs` iterates that set so one cannot be silently dropped or left
  as prose. The set is pinned because the earlier form ran two and _asked_ the agent to confirm the
  third, and the asked-for one is the one that got skipped: an increment's `no-useless-assignment`
  reached `/pharn-dev-verify` as a red `lint` gate, one stage after the build had declared itself
  formatted (`.dev/features/validate-bad-target/VERIFY.md`). A remedy that reduces to "remember to
  confirm" recurs (L20); the replacement is the removal of the choice (L22), not a firmer sentence.
- Resolve any residual prettier↔markdownlint conflict (e.g. an indented fenced code block inside a list
  item), and any eslint finding, **by hand** — the eslint line is read-only by design.
- Then confirm `npm run format:check`, `npm run lint:md`, and `npm run lint` are clean repo-wide. These
  are the whole-repo READ-ONLY gates and they remain a confirmation, not a substitute: the scoped runs
  above cover this increment's own paths, and these catch an interaction with anything outside them.

<!-- COMMAND-HYGIENE:SKIP-BEGIN — historical note. The commands quoted below are the REJECTED form, recorded so the reason survives; they are not prescribed. .dev/floor/command-hygiene.test.mjs skips this region. -->

> **Why not `npm run format`, which this step prescribed until now.** That script is `prettier --write .`
> — the **whole repo** — so the step's own "just-written files" wording was false, and every build
> silently rewrote files no plan had declared. Those writes escape the fix #7 writes-scope entirely,
> because the pre-write hook gates `Write|Edit|MultiEdit` and a formatter runs through **Bash**. Observed
> live (it reformatted `.dev/floor/check-lessons-index.mjs` during an unrelated increment) and promoted
> as `.dev/memory-bank/lessons-learned.md` **L19**.

<!-- COMMAND-HYGIENE:SKIP-END -->

This step is **ADVISORY** (P0): running a formatter is orchestration, **not** a floor guarantee — the
floor gate remains `validate.mjs` (Step 3), and the deterministic style gate remains `/pharn-dev-verify`'s
`check-verify.mjs` (which already tracks `format:check` + `lint:md`, L9). Step 2b changes **no** verdict;
it only prevents a foreseeable red at verify, and it **never blocks** — if a conflict cannot be resolved,
the style miss simply surfaces at `/pharn-dev-verify` as it does today.

## Step 3 — Run the floor (the deterministic gate)

Run: `node pharn/floor/validate.mjs <target-dir>`

The floor checks, deterministically (no LLM): frontmatter present; evals present; **every
`enforces` rule_id produced by ≥1 eval**; `coupling` enum membership; the four archetype maps
agree; finding templates separate enum-gated from free-text fields; no forbidden sibling reference.

- **Any RED → HALT.** Fix the increment until the floor is GREEN. Do not proceed, do not mark the
  increment done, do not hand off to `/pharn-dev-review` with a RED floor.
- The floor is the only guarantee in this step. A green floor means the structural invariants hold —
  it does **not** mean the content is correct; that is `/pharn-dev-review`'s advisory job.

## Step 4 — Record and stop

**Before ending your turn, run the release step — `## Final step — release the writes-scope`, below.** It is a **procedure** step, not reference material; it sits beneath the audit sections for document layout only, and a reader who stops at the turn-end never reaches it.

Write a one-paragraph build note (what landed, floor status GREEN, any decisions). Update the
memory-bank `pattern-library`/`lessons-learned` **only** via a gated promotion with provenance
(`pharn/ARCHITECTURE.md §5`) — do not silently write canon (P2). End your turn. Do not self-review;
`/pharn-dev-review` is a separate run.

## Final step — release the writes-scope (ADVISORY lifecycle hygiene)

After every write this command performs — **including any write that follows a human gate** — release
the active writes-scope so a finished run cannot leave a narrow scope behind:

```bash
node .claude/hooks/set-writes-scope.cjs --clear
```

**Why this exists.** A **set** scope REPLACES `enforce-writes-scope.cjs`'s fail-closed
default-safe-set, so a leftover scope from a finished run is **stricter** than no scope at all: paths
the default permits start being denied in later sessions, with nothing naming the cause.

**ADVISORY (P0), and the bound is the point.** This is agent-run orchestration through **Bash**, so it
sits outside the `PreToolUse` gate entirely (`.dev/memory-bank/lessons-learned.md` L19) — nothing on
the floor forces it, and an early abort skips it. It degrades safely: the next command's first-step
**set** overwrites a leftover scope, which is exactly today's behavior. The floor guarantee is
unchanged and belongs to the **reader**, not to this step — **absence of a scope file = the
fail-closed default-safe-set**. Never write "the command cleaned up"; write that it **declares** the
release step.
