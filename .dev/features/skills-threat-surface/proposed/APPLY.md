# APPLY — model the user-installed-skill attack surface in `THREAT-MODEL.md`

**Status: PROPOSED — NOT APPLIED. A human must apply this.**

`THREAT-MODEL.md` and `LIMITS.md` are trusted docs (`trust: trusted`, `editable_by: "human only"`).
`.claude/hooks/protect-trusted-paths.cjs` denies every `Write`/`Edit`/`MultiEdit`/`NotebookEdit` to
them, and **no write was attempted** by this increment. The route `CLAUDE.md` forbids — routing an
in-repo write through `Bash` to dodge the guard — was **not taken**.

## What to run — ALL THREE, as ONE atomic edit

```bash
git apply .dev/features/skills-threat-surface/proposed/THREAT-MODEL.md.patch
git apply .dev/features/skills-threat-surface/proposed/LIMITS.md.patch
git apply .dev/features/skills-threat-surface/proposed/specified-primitives.json.patch
```

**Applying any one alone leaves the repo inconsistent, and in one direction it is a hard RED:**

| applied                      | consequence                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| manifest only                | **RED, exit 1** — `check:markers` direction 2: a registered site whose marker is absent from the doc. Breaks CI.           |
| `THREAT-MODEL.md` only       | GREEN but **unguarded** — the new `scan-installed-skills.mjs` citation can drift to a wrong name with nothing noticing.    |
| `THREAT-MODEL.md` + manifest | GREEN, but `LIMITS.md` still asserts there is **one** residual while `§5` now says two — and `LIMITS.md` wins on conflict. |

All three were verified together against the live worktree: `git apply --check` over all three,
**exit 0**.

## Why the agent could not apply it (probed, not assumed — `lessons-learned` L37)

| payload                                                             | hook                        | verdict             |
| ------------------------------------------------------------------- | --------------------------- | ------------------- |
| `{"tool_name":"Edit","tool_input":{"file_path":"THREAT-MODEL.md"}}` | `protect-trusted-paths.cjs` | **exit 2** — denied |
| `{"tool_name":"Write",…{"file_path":".dev/features/…/PLAN.md"}}`    | `protect-trusted-paths.cjs` | exit 0 — allowed    |

Probed inside this worktree, not inherited from the main checkout: per `LIMITS.md §7` the guards
judge the tree Claude is in, so the jurisdiction claim was re-established here rather than assumed.

## What each hunk does

### `THREAT-MODEL.md` — 3 hunks

1. **`§2` gains item 8, a NEW numbered surface.** Not an extension of item 6: a community Capability
   is **gated** (`validate.mjs` enum-checks `kind`, restricts `seal` to `kind: pharn-owned`), while a
   `.claude/skills/` drop is gated by **nothing** — `validate.mjs` never scans `.claude/`. Folding
   them together would have let item 6's `seal`-gating read as covering skills.
2. **`§3` gains the paired row** (`§2`↔`§3` are keyed 1:1). The Floor cell says
   **"ENUMERATION ONLY … GATES NOTHING … No primitive is specified or planned for this row"**, and
   deliberately does **not** carry `_(specified; ships with the guarded surface)_`, which four of the
   seven existing Floor cells do carry — that marker asserts a protection that **will ship**, and
   nothing is coming here.
3. **`§5` retracts its quantifier in the HEADING** — "The one residual" → "The residuals" — and names
   the known ones. The correction is made **in the heading**, not by appending a paragraph beneath an
   unchanged one; a paragraph under a false quantifier leaves the false quantifier standing (L37).
   **The replacement is an OPEN form ("this is not the only such place"), not a new count.** That was a
   review finding on this increment's own first draft, which said "there are two such places": a closed
   count is exactly as brittle as "one" the day a third is found, and nothing in this repo reads shipped
   prose to notice. `LIMITS.md`'s mirrored sentence was opened the same way, so the two files do not
   rebuild the mirror at a new value.

### `LIMITS.md` — 2 hunks (quantifier retraction ONLY)

`:95` and `:141` asserted the same **count** that hunk 3 makes false. Neither restates `§1a`, so this
is a **retraction, not a restatement** — P4-safe by construction. `§1a` itself is untouched:
`THREAT-MODEL.md` cites it and re-argues nothing.

### `.dev/floor/specified-primitives.json` — 1 hunk (`named_artifacts` ONLY)

Registers the `scan-installed-skills.mjs` citation so it cannot drift to a name the repo does not
have (the `secrets-in-code` precedent). **No `forward_claims` entry is added, and that is reasoned,
not forgotten** — the entry's own `$comment` carries the reasoning: a forward claim requires a
mandatory `probe` naming a real path (`isLive()` throws → **exit 2, fail-closed**), and "a gate that
reads the skills roster" has no such path. This manifest already refused exactly that for the
live-griller-runner and verifier-runner classes: _"a probe would have to invent one. Deferred rather
than guessed (P6)."_

## L26 bound — stated, and checked rather than hoped

L26 warns that a patch verified against a copy **outside** the repo runs under different rules,
because `eslint` / `prettier` / `markdownlint` resolve config by **path**.

- **`THREAT-MODEL.md` / `LIMITS.md`: the vector is absent.** Both are listed in `.prettierignore:42`
  and in `.markdownlint-cli2.jsonc:16` — **no style gate resolves over either file in either
  location**. Confirmed live: `markdownlint-cli2`'s own glob line prints `!THREAT-MODEL.md`.
- **`.dev/floor/specified-primitives.json`: the vector is REAL and was closed.** That file is **not**
  prettier-ignored, so `npm run format:check` covers it. The patched result was checked with the
  repo's config passed **explicitly** — `prettier --config .prettierrc.json --parser json --check` →
  **"All matched files use Prettier code style!", exit 0** — which removes the path-resolution
  dependency L26 names rather than hoping it did not apply.
- The patched manifest was also parsed: **valid JSON**, `named_artifacts` 2 → 3,
  `must_exist` resolves on disk, `forward_claims` **unchanged at 2**, `specified_primitives`
  unchanged at 8.

## What was NOT verified, stated so it is not mistaken for done

**The post-apply `npm run check:markers` GREEN was never executed.** Only the **pre-apply** state was
run — and it is a **RED by design** (the registered site's marker is absent until hunk 1 lands), which
is exactly what makes the three patches atomic. Verifying the GREEN would require applying the
patches, which the guard forbids the agent from doing. **The applier should run `npm run check` after
applying**; that is the first execution of the post-apply state, and nothing in this increment can
stand in for it.

Likewise unverified: that the new `§2`/`§3` text is **accurate** or **sufficient**. It was written to
be weaker than every neighbouring row, on purpose; whether it is weak enough is human judgment.

## `SKILLS_VERSION` consequence for the applier

`THREAT-MODEL.md` and `LIMITS.md` are two of the four trusted docs and **are** in the bump-triggering
set (`CLAUDE.md`, "SKILLS_VERSION discipline") even though the installer never copies them into a
user's project. `.dev/floor/specified-primitives.json` is `.dev/` apparatus and bumps **nothing**.

- **`SKILLS_VERSION` 6.1.0 → 6.1.1** — **patch**: a correction/clarification to bytes that already
  shipped. No new capability, no shape change.
- A **`CHANGELOG.md`** entry is owed in the same edit.
- **`MIN_CLI` stays `0.5.0`** — no installed path moves, so no older CLI would install a broken tree.

## What this patch does NOT do

- **It adds no protection whatsoever.** It makes an unmodeled surface modeled. That is the whole
  claim. The enumeration was already deterministic and already gated nothing; none of that changes.
- It changes no behavior, no checker, no hook, no command step, and adds no field to any output.
- It adds **no** per-`SKILL.md` digest, lock file, drift detection, or classification of what a skill
  does — all explicitly deferred. Named future trigger, recorded so it is not lost: **if the
  `coverage-record` increment lands**, the review record will need to state _which version_ of a skill
  informed a run and will be unable to. That is a real failure at that point; it is not one now.
