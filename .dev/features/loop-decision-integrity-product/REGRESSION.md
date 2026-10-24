# REGRESSION — loop-decision-integrity

chain: GREEN (`pharn/floor/check-plan-spec-agree.mjs`, re-verified at regress time)

## Base

`a2d73ebe104bd4fd0a46531fb46784a671145434` (passed explicitly by `/pharn-loop` Step 5, S3's captured
pre-run SHA — the auto-detect rule was not used).

## Inside / outside partition

`pharn/floor/check-regress.mjs scope` (feature `loop-decision-integrity`, exempting the feature's own
pipeline artifacts): 15 files inside (the plan's edited files + the feature's own `SPEC.md` / `PLAN.md` /
`GRILL.md` / `BUILD.md`), 0 escaped. `outside_tests` = 74 of this repo's 78 committed test files (the 4
inside test files — `check-loop-record.test.mjs`, `frontmatter-core.test.mjs`,
`command-hygiene.test.mjs`, `check-loop-decision.test.mjs` — are excluded, per Step 4b: a flip in the
feature's own test is not a regression here).

## Gate discovery (Step 4a — fixed allowlist ∩ present `package.json` scripts)

Allowlist `{ test, lint, format:check, lint:md, typecheck, type-check, build }` ∩ present scripts →
`{ test, lint, format:check, lint:md }` (no `typecheck`/`type-check`/`build` script exists in this repo).

## Gate classification (Step 4b)

- **`test`** (file-addressable) — run over `outside_tests` only, at base and HEAD.
- **`lint`, `format:check`, `lint:md`** (style/whole-repo, config-touch-skip eligible) — `inside` touches
  no shared style config (`eslint.config.*`, `.prettierrc*`, `.prettierignore`, `.markdownlint*`) →
  **skipped**, absent from both maps. Provably impossible for these to flip over byte-identical outside
  files with no config change.

## Per-gate `base → head`

| gate                     | base | head | flipped? |
| ------------------------ | ---- | ---- | -------- |
| test (outside, 74 files) | 0    | 0    | no       |

Base worktree: `git worktree add --detach` at the base SHA, `npm ci`, then `node --test` over the 74
`outside_tests` — 1854/1854 pass, exit 0. HEAD: the same 74 files, same worktree — 1854/1854 pass, exit 0.

## Verdict

```text
REGRESSIONS: none — no deterministically-detectable breakage outside the feature
```

`pharn/floor/check-regress.mjs verdict` → `"verdict": "no-regressions"`, exit 0.

**The honest residual (P0):** this catches exactly what the project's deterministic suite catches —
`node --test` over the outside-scope files — nothing more. It does **not** mean nothing broke; it means
no deterministically-detectable breakage outside the feature was found.
