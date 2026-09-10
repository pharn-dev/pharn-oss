# PLAN — skills-version-recorded

- spec_content_hash: bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299 # fix #4
- applied_lessons: [L2, L4, L6, L14, L19, L20, L27, L29, L32, L34, L35, L36, L37] # MANDATORY — floor-checked
- increment: Add `.dev/floor/check-skills-version-recorded.mjs` — a fail-closed apparatus gate that REDs unless
  `SKILLS_VERSION`'s literal value appears in `CHANGELOG.md` as a complete version token — wire it into
  `scripts.check` AND as its own `ci.yml` step, and record the current version `3.0.2` in `CHANGELOG.md`.
- layer(s): none — build apparatus (`.dev/floor/`) + repo-meta (`package.json`, `ci.yml`, `CONTRIBUTING.md`,
  `CHANGELOG.md`); **no product-surface bytes change, so `SKILLS_VERSION` does NOT bump**
- constitution_refs: [P0, P5, P6, P7]

## Applied lessons

- L2 — the honesty travels with the ARTIFACT, and every cited floor op is verified LIVE this run: the
  "WHAT THIS DOES NOT GUARANTEE" bounds are written into the checker's own header (durable), not left in this
  ephemeral PLAN, and each bound is **probed** rather than reasoned (see `## Probes`).
- L4 — an authored fixture passes by construction, so every failure case is a ✧ MUTANT: each test asserts the
  checker **REDs** when the thing it guards is broken. The decisive evidence is not a fixture at all — it is
  the checker run against the **real historical bytes** of `f71f501` (probe P3).
- L6 — a membership fact is read from its STRUCTURED location: the needle comes from the `SKILLS_VERSION`
  file, never from prose about a version. The honest bound is the same one `check-version-badge.mjs` states —
  a CHANGELOG has **no** structured location for a version string, so the haystack side is prose scanning, and
  that is stated as a narrowing rather than hidden.
- L14 — the shape regex COMPOSES with the clean-scalar guard, never replaces it: `isCleanScalar` (type +
  length bound + control-char scan) runs **before** `VERSION_RE`. Load-bearing here in a way it is not for the
  badge checker: this checker **searches for** the version, so an empty or pathological needle is a
  false-GREEN vector (an empty string is a substring of every file), not merely a mismatch.
- L19 — a stage's Bash-run tooling escapes `writes:` scope: the build formats **only its own written files**
  (`npx prettier --write <the six paths>`), never `npm run format`, and the `git show` probes write **only**
  to the out-of-repo scratchpad, which is declared here rather than pretended to be gated.
- L20 — the trigger, and it is met with a **measured second occurrence**, not an inflated one: `6c5ae8e` and
  `e4e8529` shipped product-surface bytes with no bump and no entry (the review's finding), and `f71f501`
  (PR #188) then bumped `3.0.1 → 3.0.2` and recorded `3.0.2` **nowhere** — verified live, `0` occurrences in
  the CHANGELOG bytes at that commit. A defect whose only remedy is "remember to update it" has recurred, so
  it has earned a floor check.
- L27 — reachability per branch: the FIX text is **branch-specific**, not one shared paragraph. "Add the
  version to a CHANGELOG entry" is the remedy for `UNRECORDED` only; it is unreachable advice for
  `MISSING_VERSION` (there is no version to record) and for `MISSING_CHANGELOG` (there is no file to record it
  in), so those branches print their own remedy and a test asserts each remedy is **present in its own branch
  and absent from the others**.
- L29 — the remedy is quantified over the refusal-state set, so the ENUMERATION is the deliverable: the six
  states live in one exported `REFUSAL_STATES` array, and the tests **iterate that array** rather than
  asserting whichever member was in front of the author.
- L32 — a verification method consulting a mutable ALIAS proves reachability, not identity: the historical
  probe reads the **immutable bytes** `git show f71f501:CHANGELOG.md`, never `origin/main` or a branch name,
  because a ref is exactly the mutable pointer L32 names.
- L34 — a per-item assertion set says nothing over an empty domain: the rendering-closure test asserts the
  rendering list is **non-empty** before iterating it, and the against-this-repo test asserts the scanner
  found **at least one** accepted occurrence — otherwise "every rendering is accepted" would be true for free.
- L35 — its question is asked FIRST, and answered, before L20's escalation is allowed to apply. **Must the
  second copy exist?** For the CHANGELOG's version string: **yes** — it is not a redundant identity like
  `package.json`'s drained `version`, it is the **join key** that binds a version number to the description of
  what changed in it. Draining it is not available (a changelog with no version keys is not a changelog), and
  CLAUDE.md's own discipline mandates it. Only because that answer is "yes" is a sync check the right remedy.
  For the two shared **constants** the answer is "no, strictly" — see `## Design decisions` (3).
- L36 — a parameterized value acquires variant spellings, so the check must not pin one: the version is
  rendered in this CHANGELOG as `` `2.6.2` ``, `**2.5.1**`, bare `2.3.4`, `## [1.0.0]` and inside a badge URL
  (`pharn-2.5.1`) — measured, not assumed. Requiring back-ticks (the `check-contributing-gates` move) would
  RED correct entries and train authors to satisfy markup instead of recording a version, so the anchor is a
  **numeric/word boundary**, and the tests assert the closure over that measured rendering set.
- L37 — a guard's bounds are PROBED, not read off the guard: every quantified sentence in the header
  ("only", "never", "not") is backed by an executed case with its exit code recorded in `## Probes`, including
  the two the checker deliberately **excludes** (`v2.0.0` in the semver URL, `v7.0.1` in an action pin) — the
  unlisted exception is exactly where L37 says the drift lands.

## Files

- `.dev/floor/check-skills-version-recorded.mjs` — the checker: fail-closed, stdlib-only, six named refusal
  states, `SKILLS_VERSION` validated FIRST — layer none (build apparatus)
- `.dev/floor/check-skills-version-recorded.test.mjs` — ✧ mutant tests, the refusal-state enumeration, the
  rendering closure, the non-vacuity guards, and BOTH wiring pins — layer none (apparatus; never ships)
- `package.json` — add `check:changelog` and chain it in `scripts.check` — layer none (repo-meta)
- `.github/workflows/ci.yml` — add its own install-gated step (CI never runs `npm run check`) — layer none
- `CONTRIBUTING.md` — name `` `check:changelog` `` as a back-ticked token, or `check:contributing` REDs on
  this very increment — layer none (repo-meta)
- `CHANGELOG.md` — record `3.0.2` on the entry that caused the bump, and describe this increment — layer none

**Deliberately NOT written (the audit half of the enumeration — L29):**

- `SKILLS_VERSION` — **must not move.** Per CLAUDE.md's bump-triggering set, `.dev/**`, `package.json`, CI,
  `CONTRIBUTING.md` and `CHANGELOG.md` are all apparatus/repo-meta. A bump here would be the defect the gate
  is being built to catch, committed by the gate's own increment.
- `README.md` — its shields badge is pinned to `SKILLS_VERSION` by `check-version-badge.mjs`; since the
  version does not move, the badge must not either.
- `docs/lessons-index.md`, `docs/capabilities/**` — generated regions; no capability, contract, command, hook
  or **product**-floor checker changes, and no lesson is promoted by the build, so `npm run docs:generate`
  has nothing to regenerate. Confirmed by running `npm run docs:check` at the end of the build.
- The four trusted docs — hook-denied, and nothing here needs them.

## Contracts satisfied

- None. This increment adds no capability and touches no `pharn-contracts` schema — it is a deterministic
  apparatus checker. It cites `pharn/ARCHITECTURE.md §2` primitive #3 (enum/regex) as its floor reduction,
  per P4: cited, not restated.

## Evals to write (P1)

- P1 governs **Capabilities** (`role:`-bearing markdown). This increment authors none — it is a floor
  checker, whose analogue is a `node --test` suite. That suite is `## Files` row 2 and is written **with** the
  checker in the same build, exactly as the two precedents (`check-version-badge`, `check-contributing-gates`)
  were. The enumeration of what it must assert:
  - GREEN: version recorded → exit 0. Plus GREEN with a trailing newline in `SKILLS_VERSION`.
  - ✧ `UNRECORDED` → exit 1: the reproduced historical defect (`SKILLS_VERSION` `3.0.2`, a realistic CHANGELOG
    that never names it).
  - ✧ `UNRECORDED` on a NEAR MISS → exit 1, **naming the near miss**: `3.0.20` present, `3.0.2` not; `13.0.2`
    present; `3.0.2.1` present; `v3.0.2` present. A bare substring test would call all four GREEN.
  - ✧ `MISSING_VERSION` / `ENUM_ERROR` (blank, multi-line, control-char, wrong shape) / `MISSING_CHANGELOG` /
    `EMPTY_CHANGELOG` → exit 1 each, no stack trace.
  - ✧ NON-VACUITY (L34): an empty needle can never be searched for — asserted directly on the pure function,
    and the rendering list is asserted non-empty before it is iterated.
  - ✧ DISCRIMINATION: two CHANGELOGs identical but for the version token give exit 1 and exit 0.
  - ✧ CLOSURE over the measured rendering set (L36): every rendering this repo's CHANGELOG actually uses is
    accepted, and the two measured exclusions (`v2.0.0`, `v7.0.1`) are rejected.
  - ✧ REFUSAL-STATE ENUMERATION (L29): the tests iterate `REFUSAL_STATES`; every member has a case.
  - ✧ PER-BRANCH REMEDY REACHABILITY (L27): present in its own branch AND absent from the others.
  - ✧ PRECEDENCE: both inputs broken → the `SKILLS_VERSION` refusal wins, deterministically.
  - ✧ CONTROL-CHAR OUTPUT: a hostile version is escaped in stdout, never emitted raw (P2).
  - ✧ CONSTANT PIN vs `check-version-badge.mjs`: `VERSION_RE.source`, `MAX_LEN` and `isCleanScalar`'s verdicts
    must AGREE across the deliberate copy-pair.
  - ✧ WIRING PINS, both of them: `package.json` wires `check:changelog` to this file and `scripts.check` runs
    it; `ci.yml` contains a step whose `run:` is `npm run check:changelog` and whose `if:` is the sibling
    install-gate — matching only the `run:` would let `if: false` leave a dead guard green.
  - GREEN against this repo (after the CHANGELOG record lands).

## Guarantee audit (P0)

- "the literal `SKILLS_VERSION` value appears in `CHANGELOG.md` as a complete version token" → **floor:
  enum-regex** (`pharn/ARCHITECTURE.md §2` primitive #3). Both sides read live; the needle is shape-validated;
  the comparison is `indexOf` plus a character-class boundary test. Zero LLM.
- "no input state is GREEN by default" → **floor: enum-regex.** Six named refusal states; a missing or
  non-directory target exits 1 before anything is read.
- "the CHANGELOG entry is CORRECT / complete / describes the right change" → **ADVISORY, and it is the
  headline bound.** This checker proves a string appears. **A version recorded against a wrong bump stays
  GREEN**; so does a version pasted into an unrelated sentence. Stated in the header, in the CHANGELOG entry
  and in the PR body, per the task's own instruction and P0.
- "`SKILLS_VERSION` is CORRECT" → **ADVISORY.** Inherited unchanged from `check-version-badge.mjs`: nothing
  here can tell a right bump from a wrong one, or catch a bump that never happened.
- "a version token found IS a PHARN version record" → **ADVISORY, and measured.** The boundary rule excludes
  the two live look-alikes in this file (`v2.0.0`, `v7.0.1`), but a future third-party version equal to
  `SKILLS_VERSION` and rendered without a letter prefix would satisfy the check. Named residual:
  `changelog-record-position`, deliberately unbuilt (P7 — no occurrence yet, and pinning a position would
  re-pin a rendering, which is the L36 defect).
- "this checker RUNS" → **floor for the WIRING, advisory for the EXECUTION.** The two wiring pins are tests
  over `package.json` and `ci.yml` bytes. That GitHub executed the job, that the workflow is enabled, and that
  branch protection requires it are harness-layer facts no test in this repo can reach — "the wiring is
  pinned" NEVER means "the check ran".
- "the `## [Unreleased]` structure is correct / the repo has release identity" → **NOT CLAIMED.** See
  `## Design decisions` (4). No tag is cut; no release heading is written.

## Trust audit (P2)

- `CHANGELOG.md` is repo-authored and read as **DATA**: the checker searches it for a byte sequence and never
  parses instructions from it. No branch anywhere reads its prose.
- `SKILLS_VERSION` is the only value that steers behaviour, and it is **fenced before use**: `isCleanScalar`
  (control-char + length) then `VERSION_RE`, so the needle reaching the scan is provably a
  `<major>.<minor>.<patch>` scalar. Everything echoed to stdout goes through `JSON.stringify`, so a hostile
  byte is escaped rather than emitted raw into a terminal (the `check-version-badge` precedent).
- No untrusted third-party input is ingested; taint reaches no gate.

## Determinism audit (P5)

- Every branch is a membership/shape test: file readable (try/catch), `isCleanScalar` (char-code scan),
  `VERSION_RE.test`, `indexOf` + a character-class boundary test, and an integer occurrence count. No LLM
  classification anywhere, and no fallback chain — an unusable input is a **named refusal**, which is the
  fail-closed direction, not a guess.

## Design decisions

1. **The anchor is a numeric/word BOUNDARY, not a bare substring and not required markup.** A bare substring
   is not falsifiable enough: `3.0.2` occurs inside `3.0.20`, `13.0.2` and `3.0.2.1`, so a CHANGELOG that
   recorded only a neighbouring version would GREEN. Requiring back-ticks — the move
   `check-contributing-gates.mjs` makes, and makes correctly — is **wrong here, for a stated reason**: there
   the token was `test`, an ordinary English word, so markup was the only thing separating a declaration from
   prose; here the token is a dotted numeric triple that does not occur in prose, and the collision risk is
   **numeric, not lexical**. The rule: an occurrence counts iff the character before is not `[0-9A-Za-z.]` and
   the character after is not a digit, not a letter, and not a `.` followed by a digit. Sentence-final
   `3.0.2.` therefore counts; `3.0.2.1` does not.
2. **The `UNRECORDED` message names any NEAR MISS it saw.** Without it an author looks at a CHANGELOG visibly
   containing "3.0.2", concludes the checker is broken, and reaches for a bypass — L27's failure mode exactly.
3. **`VERSION_RE` / `MAX_LEN` / `isCleanScalar` are a deliberate second copy, pinned — not a shared core and
   not a sibling import.** L35's question, asked before choosing: must the copy exist? Strictly, no. But the
   two alternatives are worse **here**: (a) importing them from `check-version-badge.mjs` is a **leaf→leaf**
   import, the shape `pharn/ARCHITECTURE.md §4` forbids and one with **zero precedent** in this repo — every
   floor import verified live this run points at a `*-core.mjs` bottom, never at another checker; (b)
   extracting a `version-core.mjs` means editing a **live, working guard** for a second axis of change with no
   triggering failure (P7) — `frontmatter-core.mjs` was extracted at **six** copies and a reproduced BOM
   defect, not at two and none. So: copy, and pin the pair by ✧ test — the `check-provenance` precedent, and
   the L31 remedy (something must RANGE OVER the pair). Recorded because L35 says the question is asked before
   the remedy, never after.
4. **`## [Unreleased]` is NOT cut into a `## [3.0.2]` section, deliberately.** A `## [3.0.2] - <date>` heading
   asserts a **release**; `git tag -l` is **empty** (verified live), so there is no released artifact behind
   such a heading — writing one would be "written in the changelog" masquerading as "therefore released",
   which is the P0 disease in this file's own shape. Cutting a release and tagging it is a human decision
   about release identity (the task says so of tags; the same reasoning governs the heading). The finding's
   minimum ask — record the string — is satisfied by the file's **own established convention**: an entry names
   the version it shipped in its prose (`` `2.6.1` ``, `2.7.13 → **2.7.14**`). Follow-up for a human:
   `changelog-release-sections` — cut `[Unreleased]` into keyed sections and cut the matching tags.
5. **Chain position: immediately after `check:badge`.** The two `SKILLS_VERSION` gates then read together. The
   chain is `&&`-linked, so a first RED short-circuits the rest; that is unchanged and already documented.

## Probes (L37 — executed, with exit codes; not read off the source)

Run live this run, before the plan was written:

| #   | probe                                                | result                                                                    |
| --- | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| P1  | `cat SKILLS_VERSION`                                 | `3.0.2`                                                                   |
| P2  | `grep -c '3\.0\.2' CHANGELOG.md` at HEAD             | **`0`** — the defect is live on `main` right now                          |
| P3  | `git show f71f501:CHANGELOG.md \| grep -c '3\.0\.2'` | **`0`** — the historical bytes of PR #188                                 |
| P4  | `git show f71f501 -- SKILLS_VERSION`                 | `-3.0.1` / `+3.0.2` — the bump that went unrecorded                       |
| P5  | `git tag -l`                                         | **empty** — no release identity exists (finding 1)                        |
| P6  | `git show 6c5ae8e --stat`                            | `pharn/ARCHITECTURE.md` only; no `SKILLS_VERSION`, no `CHANGELOG.md`      |
| P7  | `git show e4e8529 --stat`                            | `pharn/floor/check-plan-lessons.mjs` + two `pharn-*` commands; no bump    |
| P8  | rendering census over `CHANGELOG.md`                 | `` `2.6.2` `` / `**2.5.1**` / bare `2.3.4` / `## [1.0.0]` / `pharn-2.5.1` |
| P9  | letter-prefixed look-alikes in `CHANGELOG.md`        | exactly two: `v2.0.0` (semver URL), `v7.0.1` (action pin)                 |

P9 is the one that changed the design: `2.0.0` is a **real past `SKILLS_VERSION`**, and the semver URL in the
file's header is permanent — so a bare-boundary rule would have GREENed a `2.0.0` release vacuously. Excluding
a letter-prefixed occurrence is therefore a measured requirement, not a stylistic preference.

Probes still owed **at build**, before the gates are declared green:

- P10 — the new checker against the repo **before** the `CHANGELOG.md` edit → must exit **1** with
  `[UNRECORDED]`.
- P11 — the new checker against the **historical** bytes (`f71f501`'s CHANGELOG + `SKILLS_VERSION` `3.0.2`,
  reconstructed in the scratchpad) → must exit **1**. This is "it would have caught the real defect".
- P12 — the new checker against the repo **after** the edit → must exit **0**.

## Open questions (HALT)

- None unresolved. The two judgment calls a human might want to overrule are recorded above as
  `## Design decisions` (3) — the deliberate constant copy-pair rather than a shared core — and (4) — leaving
  `## [Unreleased]` uncut and cutting no tag. Both are argued from live measurements, and both are reversible
  in a later increment.
