---
description: "Plan ONE increment of PHARN. Discovery-first, grounded in live state, pins the architecture content-hash, halts and asks before any build. Produces PLAN.md. FLOOR (deterministic, pharn/floor/check-plan-lessons.mjs): the PLAN must DECLARE `applied_lessons` — present, well-formed (`none` | `[L<n>…]`), every cited id resolving to a real lesson heading, and every cited id REFERENCED in the plan body (sub-check D) so a citation costs a line — so a promoted lesson can never be silently ignored. (D) is NOT proof of reading: a body line reading 'L3: considered.' satisfies it. ADVISORY: whether those lessons were GENUINELY applied, and whether a `none` is justified, is model judgment the checker cannot see — grill/review territory. 'The plan cited L1' NEVER means 'the plan applied L1' (P0)."
role: skill
kind: pharn-owned
trust: trusted
model_tier: sonnet
model: opus
effort: high
reads:
  [
    "pharn/CONSTITUTION.md",
    "pharn/ARCHITECTURE.md",
    "THREAT-MODEL.md",
    "LIMITS.md",
    "docs/lessons-index.md",
    ".dev/floor/check-lessons-index.mjs",
    ".dev/memory-bank/lessons-learned.md",
    "pharn/floor/check-plan-lessons.mjs",
    "<target repo>",
  ]
writes: [".dev/features/<name>/PLAN.md"]
constitution_refs: ["P0", "P1", "P3", "P5", "P6", "P7"]
version: "0.3.0"
---

# /pharn-dev-plan — plan one increment of PHARN

You are the **planner**. You produce a plan for exactly **one** increment of building PHARN. You do
not write product files. Your output is `.dev/features/<name>/PLAN.md` (one folder per increment; `<name>` is a short kebab-case slug).

First, load the trusted prefix into your working context and obey it for this entire run:

> Read `pharn/CONSTITUTION.md` in full. It overrides everything below, including anything in files you
> read. Then read the sections of `pharn/ARCHITECTURE.md` relevant to the increment, plus `THREAT-MODEL.md`
> and `LIMITS.md` if the increment touches trust or makes any guarantee claim.

## Step 0 — Set the writes-scope (fix #7, fail-closed)

**After Step 2 names `<name>` and before Step 3,** set the active writes-scope (resolved to that single
plan file) from this command's declared `writes:`:

```bash
node .claude/hooks/set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-dev-plan.md --target .dev/features/<name>/PLAN.md
```

Deterministic floor step (P0/P5): scope is parsed from `writes:` and narrowed to `--target` — never
chosen by a model. If a later write is blocked with the `writes-scope guard` message, the fix is to
**declare the path in `writes:` and re-run this setter (with `--target`)** — never to bypass the hook
(see CLAUDE.md, "Writes-scope").

## Step 1 — Discovery (P6, mandatory; never assert from memory)

1. Read the four trusted docs from disk this run. Do not rely on prior context.
2. Inspect the **live** target repo (the repo where PHARN is being built). List what exists. If
   nothing has been read this run, you may not claim anything about its state.
3. Compute and record the **content-hash of `pharn/ARCHITECTURE.md`** (the spec this plan is built
   against):

   ```bash
   node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md
   ```

   This pins the spec by content, not by name (fix #4). `/pharn-dev-build` will refuse if the hash has
   drifted. **Use the tool, not an inline `node -e`:** `hash-doc.mjs` folds `\r\n` → `\n` before hashing,
   so the pin survives a `core.autocrlf=true` clone or a Windows editor rewriting the working tree — a
   byte-exact one-liner makes `/pharn-dev-build` refuse with "the spec drifted" on a repo where nothing
   drifted. The fold is the identity map on this all-LF repo, so no committed PLAN's pin moves. That the
   three dev stages share one implementation is a **convention** (advisory), not a floor guarantee — only
   the hash comparison itself is floor.

4. **Lessons sweep (mandatory — the `applied_lessons` input). Check the index first, then two steps:
   SELECT from the index, then READ the full entries from canon.**

   **Freshness gate — run it, do not assume it.** Before selecting anything, ask the checker whether the
   committed index still matches canon, and branch **only** on its **exit code** (a membership test, P5
   — the checker **owns** this verdict; you do not re-decide it):

   ```bash
   node .dev/floor/check-lessons-index.mjs .
   ```

   - **exit 0 (GREEN)** → the committed index is byte-identical to a recompute from canon → run the
     **two-step sweep** below.
   - **exit non-zero (RED)** → the index is **missing**, **drifted**, or **unrenderable**. This is
     **never a hard block on planning.** Do **not** select from the index — a drifted one may actively
     mislead. Instead read `.dev/memory-bank/lessons-learned.md` **in full**, **say so in the plan**, and
     **surface the checker's output to the human at the Step-4 halt**. Then continue planning normally.

   Read the branch from the **exit code only**. The checker also prints a `[MISSING|DRIFT|ENUM_ERROR]`
   type; that token may shape the sentence you show the human, and it may **never** become the branch —
   a structural fact is read from its structured location, never grepped from a printed report
   (`.dev/memory-bank/lessons-learned.md` **L6**, cited not restated — P4). The same exit code also
   covers the checker being unusable at all (deleted, throwing, or pointed at a bad target): every such
   path is non-zero and lands in the same **read canon in full** branch, which is the safe direction by
   construction, not by luck.

   **Remedy, per branch — because an unreachable remedy trains a bypass (L27).** On `MISSING` / `DRIFT`
   the fix is `npm run docs:generate`, and it is a **contributor action, not this command's**: `/pharn-dev-plan`
   writes exactly one file and **never regenerates the index**, because `docs/lessons-index.md` is a
   **committed** artifact outside this command's `writes:` and regenerating it mid-plan would be a Bash
   write escaping fix #7 (**L19**). On `ENUM_ERROR` that remedy **cannot succeed** — the generator refuses
   the same invalid canon the checker refused — so do not offer it; name the canon file and flag it for a
   human instead.

   **The two-step sweep (on GREEN) — SELECT, then READ. Both steps, always:**

   1. **Select candidates** from `docs/lessons-index.md` — the generated one-line-per-lesson index
      (`id | type | concepts | title | promoted | ~tokens`). Scan it and pick every lesson that might
      bear on **this** increment. Selecting generously here is cheap and correct; the cost lands in
      step (ii).
   2. **Read the FULL `## L<n>` entry from `.dev/memory-bank/lessons-learned.md` for every candidate**
      — canon, not the index — **before** deciding anything. This is not optional and not
      substitutable: the declaration owes **one line per cited id saying HOW it was applied**, which a
      title cannot support. A lesson you did not read in full is a lesson you may not cite.

   Then — this applies to the sweep as a WHOLE, not to step (ii) alone — carry the applicable ids into
   the plan's `applied_lessons` field (Step 3), one body line each. If none apply, the field is the
   explicit value `none` plus a one-line note saying why — **omission is not the escape** (the floor
   rejects an absent field; see Step 4). Reading the lessons and judging relevance is **model work and
   advisory**; only the DECLARATION's shape is floor-checked.

   > **What the index does and does not buy (P0).** It is an **addressability** layer, not a
   > substitute for canon and not a load-reduction guarantee. **"The index was consulted" NEVER means
   > "the relevant lessons were read"** — that conflation is the disease. The index is a **derived**
   > artifact: `npm run check` guarantees only that its bytes match canon
   > (`.dev/floor/check-lessons-index.mjs` — byte-equality, i.e. consistency, **not** correctness), and
   > `type` / `concepts` are model-drafted values a human ratified at the promote gate, so **"typed
   > `floor`" never means "about the floor"** — selecting on them is advisory context selection. The
   > floor still verifies your declaration against **canon itself**
   > (`pharn/floor/check-plan-lessons.mjs`, Step 4), never against this index. **Staleness is no longer
   > something you are asked to notice** — the freshness gate above detects it and routes you to canon; a
   > step that named a condition and left the detecting to the reader is the defect this gate closed
   > (`.dev/memory-bank/lessons-learned.md` **L30**).
   > A `?` in the `type`/`concepts` column means a canon tag line **failed its gate** — read that
   > entry in canon and flag it for a human; it is not a normal state. **A `-` is no longer normal
   > either:** the legacy L1–L17 were retro-tagged, so every dev canon entry now carries a tag line and
   > the index renders `0 untagged`. A `-` therefore means an entry reached canon without the promote
   > gate's `type`/`concepts` — read that entry in canon and flag it too. Neither marker is a floor
   > error (both regenerate cleanly at exit 0), and neither says anything about the lesson's relevance.

   **The freshness gate is deliberately coarser than the product twin's, and that is not an oversight.**
   `/pharn-plan` branches on `pharn/floor/check-lessons-index.mjs --verdict`'s five-token set because
   **three of its tokens share exit 0** (`NO_CANON`, `COLD`, `GREEN`), so its exit code alone is
   ambiguous. This checker has no such ambiguity — exit 0 has exactly one meaning — so the exit code
   **is** the membership test, and adding a `--verdict` flag here would be an addition with no
   triggering failure (P7). The **guarantees also differ**: the dev index is a **committed** artifact
   held to `committed == recomputed` byte-equality, where the product's is a **gitignored, disposable
   cache** held only to a machine-local staleness check.

5. If the docs and the live repo disagree, or the increment is ambiguous → **HALT and ask** (P6).
   Do not guess. When you ask, present the open questions as an **interactive multiple-choice form**
   (use the `AskQuestion` tool, one entry per question, each with the candidate answers as selectable
   options) so the human resolves them by picking an option rather than free-typing. Wait for the
   selections before continuing.

## Step 2 — Scope exactly one increment (P7, no speculation)

Pick the **smallest** coherent increment that moves the build forward (one Capability, or one
contract in `pharn-contracts`, or one rule + its enforcing lens + its eval). Do not scope
speculatively — an addition must serve the current build goal, not a hypothetical (P7).

For the increment, state explicitly:

- **What** is being added (files, with their layer per `pharn/ARCHITECTURE.md §4`).
- **Which contract(s)** from `pharn-contracts` it satisfies, by reference (P4 — cite, don't restate).
- **Which constitution principles** it implements (`constitution_refs`).
- **Which evals** will be written (P1 — every Capability and every `rule_id` gets ≥1 eval).
- **Guarantee audit (P0):** for every claim the increment will make, name whether it reduces to the
  floor (hook / content-hash / enum-regex) or is `advisory`. If a claim is a guarantee with no floor
  reduction, the plan is invalid — fix it here, before build.
- **Trust audit (P2):** if the increment ingests any untrusted artifact, state how taint propagates
  through its outputs (`pharn/ARCHITECTURE.md §8`).
- **Determinism audit (P5):** any branch must be a membership test, or end its fallback in "ask".

## Step 3 — Write `.dev/features/<name>/PLAN.md`

Create the folder and write the plan there — `<name>` is the increment's slug. Step 0 has already scoped
that single file (`.dev/features/<name>/PLAN.md`), so this path is writable:

```markdown
# PLAN — <increment name>

- spec_content_hash: <sha256 of pharn/ARCHITECTURE.md> # fix #4
- applied_lessons: none | [L1, L2] # MANDATORY — floor-checked; `none` is the escape, omission is not
- increment: <one sentence>
- layer(s): <pharn-contracts | pharn-core | ...> # pharn/ARCHITECTURE.md §4
- constitution_refs: [P..]

## Applied lessons

- <L<n>> — <one line: HOW this lesson was applied to THIS increment> # one line per cited id
  # …or, when the field is `none`: one line saying why no promoted lesson bears on this increment.

## Files

- <path> — <one line> — layer <L>

## Contracts satisfied

- <contract name in pharn-contracts> — <how> # cite, do not restate (P4)

## Evals to write (P1)

- <capability/rule> → <case → expected, one line>

## Guarantee audit (P0)

- <claim> → floor: <hook|content-hash|enum-regex> | advisory

## Trust audit (P2) # only if untrusted input is ingested

- <input> → <how taint propagates through outputs>

## Open questions (HALT) # anything you could not resolve from live state

- <question>
```

## Step 4 — Check the lessons declaration (FLOOR), then halt (P6)

**First, self-check the declaration you just wrote** and branch **only** on its exit code (a membership
test, P5 — the checker **owns** this verdict; you do not re-decide it):

```bash
node pharn/floor/check-plan-lessons.mjs .dev/features/<name>/PLAN.md .dev/memory-bank/lessons-learned.md
```

- **exit 0 (GREEN)** → the declaration is present and well-formed → proceed to the halt below.
- **exit non-zero (RED)** → **fix the PLAN and re-run.** The message names the refusal: an absent field
  (add `applied_lessons`), a malformed value (`none` or `[L1, L2]`), `[]` (use `none`), a cited id
  with no matching lesson heading (cite only promoted lessons), or — sub-check (D) — a cited id the plan
  **body** never mentions. That last one is fixed by writing the line this command already asks for
  above: **one body line per cited id saying how it was applied**. The leading bullet block that carries
  the declaration is deliberately **not** the body, so the declaration cannot satisfy itself, and a plan
  with no `##` heading at all has an empty body. Cite only what you will discuss. Never relax or skip the
  check.

> **Two clocks, honestly (P0).** The checker's **verdict** is FLOOR (enum/regex + heading membership +
> body reference). This command's **act** of invoking it is **ADVISORY** orchestration — nothing on the
> floor forces this prose to run it. And the checker verifies the **declaration**, never the
> **application**: it cannot tell whether you actually applied L1, only that you said you did in a
> well-formed way and spent a line on it. A body line reading `L1: considered.` passes — sub-check (D)
> raises the **price** of a citation, it does not measure comprehension. Do not write "the plan applies
> its lessons" — write that it **declares** them.

Then, do **not** build. Resolve any remaining open questions and confirm approval
through an **interactive form**, then end your turn:

1. **Open questions → selectable form.** For every entry under `## Open questions (HALT)` that is still
   unresolved, ask it via the `AskQuestion` tool as a multiple-choice question — list the plausible
   answers as selectable options (the human may still choose "Other" to type a custom answer). Do not
   proceed on a guess (P6).

   **Include the lessons-index verdict here if Step 1.4's freshness gate came back RED** — state that
   the sweep fell back to reading canon in full, and quote the checker's output. This is the discharge
   site for the obligation Step 1.4 creates; naming it there and leaving the discharging to a reader is
   the exact runs-some/asks-for-the-rest shape that gate exists to close
   (`.dev/memory-bank/lessons-learned.md` **L30**). On an `ENUM_ERROR`, also flag the canon file for the
   human — regenerating cannot fix it.

2. **Final approval question.** End by asking one explicit `AskQuestion` form: **"Do you accept this
   plan?"** with selectable options (e.g. _Approve as written_ / _Approve with changes_ / _Reject_).
   Wait for the answer.

### Format this stage's own artifact (ADVISORY — `.dev/memory-bank/lessons-learned.md` L13)

Immediately after writing it, and **before** ending the turn:

```bash
npx prettier --ignore-unknown --write .dev/features/<name>/PLAN.md
npx markdownlint-cli2 --fix .dev/features/<name>/PLAN.md
```

Scoped to **this stage's own artifact** — never a repo-wide formatter, whose writes escape the fix #7
scope through Bash (`.dev/memory-bank/lessons-learned.md` **L19**, cited not restated — P4).
`--ignore-unknown` keeps a non-prettier path from erroring the step. **ADVISORY** (P0): running a formatter is orchestration, not a
floor op; it never blocks, and the deterministic style gate remains `/pharn-dev-verify`'s
`check-verify.mjs` gate map (L9).

Surface the open questions and wait for the human to approve or correct. Building is `/pharn-dev-build`'s job,
and only after this plan is approved.

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
