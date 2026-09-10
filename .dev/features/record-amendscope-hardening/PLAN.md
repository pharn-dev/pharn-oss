# PLAN — record-amendscope-hardening

- spec_content_hash: 83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487 # fix #4
- applied_lessons: [L1, L20, L35]
- increment: Record commit `c338b9d`'s product-surface change on the version surface — `SKILLS_VERSION` 5.1.0 → 5.1.1, a `CHANGELOG.md` entry, and the README badge — discharging the CLAUDE.md rule that every product-surface byte change bumps and is recorded.
- layer(s): none — no capability, contract or floor checker is added or changed; this increment touches only the root version surface and repo-meta
- constitution_refs: [P0, P4, P6, P7]

## Applied lessons

- L1 — This increment IS an instance of L1's shape, applied in the direction L1 prescribes: a change to
  a fact asserted in meta-docs must name those meta-docs in `## Files`. `SKILLS_VERSION`'s value is
  asserted in two other places (the README shields badge, the `CHANGELOG.md` version key), so all three
  are listed below rather than left for a later sweep to catch. L1's own provenance is the same failure
  in the same files (`0de6f7b` shipped a floor command without touching `CLAUDE.md` or `CHANGELOG.md`).
- L20 — L20 sets the escalation bar at a second occurrence, and this is at least a third for one shape:
  `.dev/floor/check-skills-version-recorded.mjs`'s own header records `6c5ae8e` and `e4e8529` as commits
  that "shipped product-surface bytes with no `SKILLS_VERSION` bump and no CHANGELOG entry", and
  `c338b9d` is another. L20 is therefore cited as the reason the **Open questions** section asks whether
  to build the detecting check now, rather than as something this increment silently defers.
- L35 — L35 is the qualifier on L20 and it was asked **before** proposing a remedy, which is the order
  L35 insists on: _must the second copy exist?_ Here the answer is yes and it is already argued in the
  repo — `check-skills-version-recorded.mjs`'s header establishes that the CHANGELOG's version string is
  a **join key** binding a number to a description, not a redundant copy, so draining it (the
  `package.json` `0.0.0` remedy L35 records) is unavailable. That is why this plan proposes no new
  identity and adds no third store: it writes the two bound copies the repo already maintains.

## Files

- `SKILLS_VERSION` — bump 5.1.0 → 5.1.1 — layer n/a (root version file)
- `CHANGELOG.md` — add the entry recording `c338b9d` under `[Unreleased]` — layer n/a (repo-meta)
- `README.md` — move the shields badge 5.1.0 → 5.1.1 so `check:badge` stays GREEN — layer n/a (repo-meta)

## Contracts satisfied

- None in `pharn/pharn-contracts` — this increment adds no contract and changes no artifact shape. The
  governing rule is `CLAUDE.md`'s "SKILLS_VERSION discipline" section, cited not restated (P4).

## Evals to write (P1)

- None, by membership test: P1 binds **capabilities**, and a file becomes a capability the moment its
  frontmatter carries a `role:` key. No file in `## Files` carries one, and none is added, so the
  obligation does not attach. `pharn/floor/validate.mjs` should still report the same capability count
  before and after — an unchanged count is the check that this claim is true.

## What is being recorded (the discovery, measured live this run — P6)

`c338b9d` ("fix", 2026-09-10) changed `pharn/floor/reconcile-baseline.mjs`, hardening `amendScope` and
`--show` against a TOCTOU (CWE-367): an `existsSync` probe followed by a separate `readFileSync` became a
single `openSync` descriptor read with ENOENT distinguished in the `catch` and the descriptor released in
a `finally`. It also added one test. It touched neither `SKILLS_VERSION` nor `CHANGELOG.md`.

`pharn/floor/*.mjs` (excluding `*.test.mjs`) is named explicitly in CLAUDE.md's bump-triggering set, so
the bump is owed. Measured at HEAD rather than argued:

- `git log -1 -- SKILLS_VERSION` → `26ab408`, which set `5.1.0`.
- product-surface files changed in `26ab408..HEAD` → exactly one, `pharn/floor/reconcile-baseline.mjs`.
- commits in that range → exactly one, `c338b9d`.

**Bump size.** Patch, 5.1.0 → **5.1.1**: a correction to bytes already carried on the product surface,
not a new capability (`amendScope` and `--show` both shipped in 5.1.0; their observable contract is
unchanged — the same return shapes, the same exit codes, the same message strings). See the first Open
question for the one reading under which this is instead a 5.1.0 amendment.

## Guarantee audit (P0)

- "the README badge agrees with `SKILLS_VERSION`" → **floor: enum-regex** — `.dev/floor/check-version-badge.mjs`,
  wired as `check:badge`.
- "`SKILLS_VERSION`'s value appears in `CHANGELOG.md` as a complete version token" → **floor: enum-regex**
  — `.dev/floor/check-skills-version-recorded.mjs`, wired as `check:changelog`.
- "the bump TRACKS the product bytes that changed" → **advisory, and this is the gap the increment
  surfaced.** Nothing verifies it. `check:changelog` asks only whether the CURRENT value is recorded, and
  `check:badge` disclaims the class in its own header ("a badge matching a wrong bump stays GREEN"). Both
  gates were exit 0 at `c338b9d` with the bump missing — verified live this run, not inferred. Do not
  write that this increment closes that gap; it discharges one instance of it.
- "5.1.1 is the correct SemVer size" → **advisory** — CLAUDE.md's patch/minor/major rule is prose applied
  by judgment; no checker reads it.
- "the CHANGELOG entry describes `c338b9d` accurately" → **advisory** — no checker reads entry prose.

## Trust audit (P2)

No untrusted artifact is ingested. The one piece of free text consulted is `c338b9d`'s commit message
(`fix`), read as DATA to identify the commit and never followed as an instruction; the entry's content is
derived from the diff, which is read directly.

## Determinism audit (P5)

The increment contains no branch. Its inputs are three literal file edits whose correctness is checked by
two existing floor gates (`check:badge`, `check:changelog`), each a membership/regex test. The one
judgment — bump size — is escalated to the human at the halt below, which is P5's prescribed terminal
fallback.

## Open questions (HALT)

- **Bump size: 5.1.1, or fold into the unreleased 5.1.0 entry?** 5.1.0 is committed but never released —
  the whole line sits under `[Unreleased]` and `MIN_CLI` currently refuses every published CLI, so these
  bytes have reached no install. Under CLAUDE.md's wording ("patch = a correction to bytes that already
  **shipped**") an unshipped correction could legitimately amend the 5.1.0 entry instead. Recommending
  5.1.1 on repo precedent: `[Unreleased]` already carries per-change bumps of exactly this form (the
  `3.1.0 → 3.1.1` entry), so the section is evidently keyed by change, not by release.
- **Build the detector now, or record the trigger and defer?** This is L20's bar met and passed — a third
  occurrence of a defect whose only remedy is "remember to bump". A check is constructible and would be
  deterministic: compare `git log -1 -- SKILLS_VERSION` against `git diff --name-only <that>..HEAD` over
  the bump-triggering set, which is the same git-as-floor-input precedent `check-bash-reconcile.mjs`
  already sets. It is **not** in this plan's `## Files` — it is a separate increment with its own
  enumeration problem (the bump-triggering set becomes a maintained list, which is L29/L36 territory) and
  its own false-positive risk (a bump landing in a sibling commit of the same PR is correct practice and
  would RED). Asking rather than assuming, per P5 and P7.
