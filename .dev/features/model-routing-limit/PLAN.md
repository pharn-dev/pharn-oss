# PLAN — model-routing-limit

- spec_content_hash: 83890d9741dd2f63bfe5112a3fcd6d8c49fd3795233eee719e271eba16fd9487
- applied_lessons: [L1, L25, L26, L35, L37, L43]
- increment: Record in `LIMITS.md` that PHARN's declared per-stage model/effort configuration is not
  the executed configuration — `pharn.config.json`'s `models.stages` is a source of truth the static
  command frontmatter is held to, and nothing observes what a stage actually ran under. Documentation
  only: no checker logic, no config values, no command frontmatter changes.
- layer(s): none (trusted doc + repo-meta; `LIMITS.md` is product surface per CLAUDE.md's
  bump-triggering set, so a `SKILLS_VERSION` bump and a `CHANGELOG` entry ARE owed — unlike the
  `bash-write-claim-wording` precedent, which touched only repo-meta)
- constitution_refs: [P0, P3, P4, P5, P6, P7]

## Applied lessons

- **L1** — Meta-doc sweep run against live state this run, not assumed. Five meta-surfaces state a fact
  this increment moves: `README.md` (`:24` the shields **version badge**, `:158-160` pointer, `:325`
  guarantee-table row, `:499-509` the limitation bullet), `CHANGELOG.md`, `SKILLS_VERSION`, and
  `pharn/floor/check-model-config.mjs`'s header. Each is named in `## Files` or in
  `### Deliberately NOT in scope` below, never left implicit. Verified the generated `CURRENT-STATE`
  region (`README.md:401-410`) is untouched by every edit proposed here, so `npm run docs:generate`
  owes nothing.
  **AMENDED after the first `/pharn-dev-regress`, and the correction is recorded rather than quietly
  folded in (L33).** The first version of this line said "four meta-surfaces" and **omitted the badge
  at `README.md:24`**, which `.dev/floor/check-version-badge.mjs` holds to byte-equality with
  `SKILLS_VERSION`. The bump to `6.3.1` therefore flipped the `tests` gate `0 → 1` and the run STOPped
  with verdict `regressions`. **The sweep enumerated the sites its author was looking at** — exactly the
  shape **L36** describes — and a floor check, not a re-reading, is what caught it. Recorded because a
  claim of a completed sweep that was in fact partial is the more dangerous artifact: it reads as
  discharged.
- **L25** — A rationale comment reaches only the file it sits in. This is the whole P4 ownership
  argument: the four bullets at `check-model-config.mjs:28-46` are a correct, careful analysis sitting
  where **no user will ever read it**, which is the same failure shape as `hash-doc.mjs`'s header
  reaching ten sibling CLIs that shipped the wrong idiom anyway. The remedy is to move the statement to
  the file whose declared purpose is to hold it and leave a pointer behind — not to write a better
  comment.
- **L26** — The patch target is hook-denied, so it can only be verified against a copy. This plan pins
  the verification to the **real path**: the patch is generated and `git apply --check`ed inside this
  worktree, which is a real checkout of this repo with `.prettierrc.json` and `.markdownlint-cli2.jsonc`
  resolving normally. **Narrowed by live discovery, and the narrowing matters:** `LIMITS.md` is listed
  in BOTH `.prettierignore` and the markdownlint `ignores`, so no style gate judges the patched file
  itself — L26's config-resolution trap therefore lands not on `LIMITS.md` but on the OTHER files this
  increment touches (`README.md`, `CHANGELOG.md`), which are fully gated and must be verified by running
  `npm run check` here.
- **L35** — Asked L35's question BEFORE reaching for a sync check: must the second copy exist? Live
  discovery found this fact already stored **four** times (checker header `:24-46`, the checker's own
  runtime NOTE line, `README.md:325`, `README.md:499-509`) and **zero** times in `LIMITS.md`. Adding a
  fifth store bound by nothing is the defect L35 names. So this plan designates exactly ONE owner and
  proposes **draining** the others to pointers, rather than adding a consistency gate over five copies.
- **L37** — Probed rather than read off, and the probe changed two of the plan's own conclusions.
  (1) `protect-trusted-paths.cjs` on `LIMITS.md` → **exit 2** with a `.dev/features/**` control at
  **exit 0**, so the staged-patch shape is FORCED, not chosen. (2) Running the checker against a
  config with no `models.stages`, and against an absent config, both → **GREEN, exit 0**, which
  reclassifies the fresh-install bullet from Layer 2 to Layer 1. (3) A two-arm hook probe proved
  `pharn.config.json` IS read at run time, exposing a false universal quantifier in the checker's own
  header (F1 below) — exactly L37's "the quantifier is where the drift lands".
- **L43** — This lesson is Layer 1's thesis in canon form and is cited as such rather than restated: a
  consistency check over several stores of one fact certifies their **agreement**, never the fact.
  `check-model-config.mjs` GREEN says `models.stages` and the ten commands' frontmatter agree; it is
  structurally blind to both being wrong together, and to the executed model differing from both. The
  new `LIMITS.md` section states that bound in LIMITS' own voice, which is the Layer-1 claim.

## STEP-1 — the trigger, demonstrated (P7); both cancel branches checked and neither fires

P7 admits an addition only on a real failure, never a hypothetical. All three readings are repo-settled
below, live this run at `231e422`.

**(a) The bound exists and is stated as severe — confirmed verbatim.** `check-model-config.mjs:28` reads
`NOT guaranteed — and these are real holes, not formalities:`, followed by bullets at `:29-31` (the
stage is not proven to have run under that model), `:32-35` (TURN SCOPE), `:36-38` (PLATFORM VETO),
`:39-43` (FRESH-INSTALL POSTURE). The brief's line numbers held exactly; a **fifth** bullet at `:43-46`
(`model_tier:` is a different, platform-inert field) was not in the brief and is noted here rather than
silently inherited.

**(b) `LIMITS.md` does not carry it — whole-file search, not a head-limited grep.** Ran
`grep -nEi "model|effort|opus|sonnet|haiku|rout|pharn\.config|models\.stages|frontmatter|tier" LIMITS.md`
over all **295** lines. Every hit is unrelated: `:5` frontmatter purpose line, `:29`/`:35`/`:93`/`:95`/
`:139`/`:205` are `THREAT-MODEL` references or "the model that may be compromised", `:50-51`/`:61` are
`est_tokens`/`Approved` frontmatter, `:99`-`:128` are the token **cost model**, `:162` is the §5 sink
sentence handled below. **Zero** hits state that the declared model configuration is not the executed
one. The file's own sections are `:15, :90, :99, :133, :148, :179` **and `:259` (§7)** — the brief listed
six; live state has **seven**, §7 having landed in 6.1.0. Recorded because the brief's own line numbers
were dated 2026-09-18 and this is the drift it predicted.

**CANCEL BRANCH 1 — does not fire.** No existing statement of this limit anywhere in `LIMITS.md`.

**CANCEL BRANCH 2 — does not fire, and §5 is worse than neutral.** Read `§5` in full (`:148-177`). Its
axis is observability-interrogated-at-plan-time; its `pharn.config.json` mention at `:162` reads
_"`pharn.config.json` carries only model/stage settings and `ship.requireAttestation`"_ and exists to
argue **there is no configured telemetry sink**. It does not frame the config as inert — it treats the
model/stage settings as the real thing the config **does** carry, in contrast to telemetry which it does
not. So §5 does not cover the ground, and a sentence inserted there would sit on a different axis (P3).

**(c) The config reads as a promise — partially, and the live picture is not the brief's.**
`pharn.config.json` ships at the root declaring `opus` for spec, plan, grill, review and memory-promote
(`:5,6,7,13,14`). But `README.md` already carries a correction: a pointer at `:158-160` and a full
limitation bullet at `:499-509`. **This weakens (c) and strengthens the increment's actual trigger**,
which is sharper than "nobody says it": the limit is said in two places that cannot carry it —

1. a floor script's comment header, which by **L25** reaches only that file; and
2. `README.md:419`'s `## Current limitations`, which live discovery confirms sits **outside** the
   generated `CURRENT-STATE` markers (`:401-410`) and is therefore hand-written, **unguarded** prose —
   CLAUDE.md's own words for that region.

— while the file whose frontmatter purpose line (`LIMITS.md:5`) is _"What PHARN does NOT guarantee"_,
and whose §1 note (`:10-11`) says _"If a claim elsewhere contradicts a limit named here, the limit
wins"_, is silent. A limit that exists only in unguarded prose and a script comment has no authoritative
home, and per **L43** the four existing stores can go stale together with every gate green.

## F1 — a false universal quantifier found while probing (P6; surfaced, not fixed here)

`check-model-config.mjs:10-11` states: _"nothing in this repo reads `pharn.config.json` at run time"_.
**That sentence is false as written**, and it is the exact wording trap the brief warned about, already
shipped inside the file that owns the claim.

Demonstrated by execution (L37), two arms differing only in the presence of the config file, against
`enforce-writes-scope.cjs` with an identical `Write` payload for `.dev/features/x/PLAN.md`:

| arm                                      | result                   |
| ---------------------------------------- | ------------------------ |
| no `pharn.config.json`                   | **exit 0** — allowed     |
| `pharn.config.json` with `skillsVersion` | **denied**, deny message |

The live decision path is `enforce-writes-scope.cjs:462` → `defaultSafeSet()` `:244` →
`isPharnInstalledProject()` `:236` → `fs.readFileSync(… "pharn.config.json")` `:228`. A second
functional reader is `pharn/floor/check-bash-reconcile.mjs:273-276`, which copies the file into its
probe sandbox.

**The true sentence is BLOCK-SCOPED:** nothing reads **`models.stages`** to select a model at run time.
Confirmed by enumerating the readers of that key in non-test code — only the two checkers
(`check-model-config.mjs:160-166`, `.dev/floor/check-config.mjs:110`), i.e. the things that _check_ it,
never a router. **Any sentence in the new `LIMITS.md` text phrased as "the config is not read" is FALSE
and must not ship.**

## The two layers, with one bullet RECLASSIFIED by probe

**LAYER 1 — repo-verifiable, asserted in LIMITS' own voice.** `check-model-config.mjs` GREEN
establishes only that two files in this repo agree: `models.stages` and the ten product commands'
static frontmatter. Verified live: `agreement` → GREEN, and its own stdout carries
`NOTE (P0): this is config↔frontmatter EQUALITY — never proof a stage RAN under that model`. Per L43
that agreement is blind to both stores being wrong together. "check-model-config GREEN" must never read
as "/pharn-plan ran on opus".

**Also Layer 1 — the fresh-install posture, MOVED from Layer 2 by probe.** The brief assigned this to
Layer 2 (platform claims). It is not: it is a property of the checker, settleable here, and settled —
`agreement --config <a config with no models.stages>` → **GREEN exit 0**, and `--config <absent path>`
→ **GREEN exit 0**. So a user who deletes the block **loses this check rather than failing it**, which
LIMITS may assert in its own voice.

**LAYER 2 — platform claims, ATTRIBUTED, never adopted.** Turn scope (`:32-35`) and platform veto
(`:36-38`) describe Claude Code behaviour. No file in this repository can settle whether a
slash-command invoked from inside another command's body gets its own turn — I confirmed I cannot
verify it from here, so the text must read _"the checker's header states…"_ and cite, never assert.

## The P4 ownership decision (exactly one owner, or they drift)

P4 governs **enforcers**: they cite rule IDs and never restate rule text. `LIMITS.md` is not an
enforcer — it is the document whose declared job **is** the bounds. The asymmetry that settles it:

- A limit discoverable only inside a floor script's comment is one the user never sees (**L25**).
- `LIMITS.md:10-11` already claims precedence: _"If a claim elsewhere contradicts a limit named here,
  the limit wins."_ A file claiming precedence over statements of limits, while silent on this one, is
  the drift risk — not the cure for it.

**Proposed owner: `LIMITS.md`.** The checker header keeps a SHORT bounds summary (it is load-bearing
for a reader editing the checker) plus an explicit pointer, and its false quantifier at `:10-11` is
corrected to the block-scoped sentence. `README.md` is **drained** per L35 rather than bound by a new
gate. Exactly which of the other three stores get drained vs. kept is OPEN-2/OPEN-3 below.

## Files

The `proposed/` artifacts and this `PLAN.md` are this stage's **own** artifacts under the fail-closed
default safe-set (`.dev/features/**`). The root-file edits below require their own narrowed scope at
build time; stated because **L7** requires the declaration to equal exactly what is written.

- `.dev/features/model-routing-limit/proposed/LIMITS.md.patch` — NEW. Exact unified diff adding the new
  limit section, generated by exact-match substitution and verified with `git apply --check` in this
  worktree. Human-applied. — layer: none (apparatus, never ships)
- `.dev/features/model-routing-limit/proposed/APPLY.md` — NEW. The human-apply hand-off: apply order,
  the `SKILLS_VERSION`/`CHANGELOG` coupling, and the verification record (the
  `canon-write-denylist` / `bash-write-claim-wording` precedent). — layer: none (apparatus)
- `.dev/features/model-routing-limit/proposed/README.md.patch` — NEW (**OPEN-3(i), selected**). Drains
  `README.md:499-509` to a short statement + pointer at the new `LIMITS.md §8`, **keeping** the `:325`
  table row (OPEN-3(iii)) and the `:158-160` pointer, whose target text changes. Staged as a patch even
  though `README.md` is agent-writable, so the human applies one coherent set. — layer: none (repo-meta)
- `.dev/features/model-routing-limit/proposed/check-model-config.mjs.patch` — NEW (**OPEN-3(ii),
  selected**). **Header comment prose only**: replaces `:10-11`'s false universal quantifier with the
  block-scoped sentence and adds a back-pointer to `LIMITS.md §8`. **No executable line is touched** —
  the build stage must verify that by diffing, and `check-model-config.test.mjs` must stay green.
  Staged as a patch for one coherent application, not because the file is write-protected (it is not).
  — layer: none (apparatus artifact; the PATCHED file is product surface)
- `.dev/features/model-routing-limit/proposed/pharn.config.json.patch` — NEW (**OPEN-3(iv), selected**).
  Adds one top-level pointer key naming `LIMITS.md §8`. **Probed GREEN on both checkers** before
  proposing; the build stage re-runs both (`check-model-config.mjs validate` and
  `.dev/floor/check-config.mjs validate`) against the patched file and records the exit codes. Declared
  model/effort **values are untouched**. — layer: none (root config)
- `CHANGELOG.md` — EDIT. One `[Unreleased]` entry recording the limit, the `6.3.1` bump, and F1's
  disposition. **Joins the EXISTING `### Added` group** — `## [Unreleased]` runs from `:9` to the
  `## [5.0.0]` heading, so it already contains one; MD024 is `siblings_only` and a second group is a
  RED. — layer: none (repo-meta)
- `SKILLS_VERSION` — EDIT, `6.3.0` → `6.3.1` (**OPEN-4, selected: patch**). Per OPEN-4 the human lands
  this in the SAME commit as the `LIMITS.md` patch; `APPLY.md` carries that ordering as an instruction,
  not as a hope. — layer: none (repo-meta)
- `README.md` — EDIT, **`:24` only**: the shields version badge `pharn-6.3.0-blue` → `pharn-6.3.1-blue`.
  **ADDED BY AMENDMENT** after the first regress RED. — layer: none (repo-meta)

**The agent/human split is by KIND, and the line is drawn deliberately** (this is the resolution of the
grill's blocking-severity finding, `GRILL.md` finding 1). **Version bookkeeping is the agent's**:
`SKILLS_VERSION`, the `CHANGELOG.md` entry, and the `README.md:24` badge move together, in the working
tree, because `check-version-badge.mjs` holds two of them in byte-equality and a floor gate must not be
left red between stages. **Content is the human's**: the `LIMITS.md` §8 text, the `README.md` limitation
bullet, the checker-header prose and the config key ship as patches. `README.md` is therefore touched by
**both** routes — the agent's badge edit at `:24` and the human's bullet patch at `:499-509` — which is
safe because they are disjoint hunks (verified: the staged `README.md.patch` still applies cleanly after
the badge edit).

### Deliberately NOT in scope

- `LIMITS.md` — trusted doc, hook-denied to this agent (**probed: exit 2**, control exit 0). Patch is
  staged for a human; the agent never writes it.
- `pharn/floor/check-model-config.mjs`'s **LOGIC** — untouched per the brief. Only its header comment
  changes (OPEN-3(ii)); every executable line is out of scope, and the build stage proves that by diff
  plus a green `check-model-config.test.mjs`.
- `pharn.config.json`'s declared **model/effort values** — untouched. Only one additive pointer key is
  proposed (OPEN-3(iv)); no stage's model changes.
- Any command's frontmatter; `MIN_CLI` (no relocation, no contract change, so per CLAUDE.md it stays).
- Any mechanism to observe or enforce the executed model. Platform-level and invisible to hook, hash or
  enum by the checker's own account; building one would be the fabricated guarantee P0 forbids. If the
  build stage starts designing a detector, that is scope creep and is cut.
- The loop-record version-field question — settled at `pharn/pharn-contracts/loop-record.md:108`.

## Contracts satisfied

- None. This increment adds no capability and no contract. It records a limit, which `LIMITS.md`'s own
  frontmatter purpose line (`:5`) names as that file's job, and which P7 requires be labeled as a limit
  rather than sold as a guarantee.

## Evals to write (P1)

- **None, and this is not an exemption being claimed.** P1 binds **Capabilities** — a `.md` file whose
  frontmatter carries a `role:`. This increment writes no `role:`-bearing file and no `rule_id`, so
  there is nothing for an eval fixture to produce. The verification that replaces it is stated in
  APPLY.md: `git apply --check` for the patch, and `npm run check` run in this worktree after the
  human applies it (L26 — at the real path, under the repo's own config resolution).

## Guarantee audit (P0)

- "`LIMITS.md` now states this limit" → **advisory**. Nothing reads `LIMITS.md` prose: `validate.mjs`
  excludes root docs, `check-capability-catalog` guards only the `CURRENT-STATE` markers, and
  `check-specified-markers.mjs` reads only its own hand-maintained manifest (run live: GREEN, 25
  annotations / 2 forward-claims / 2 named artifacts — and its own NOTE says an overclaim not in the
  manifest is invisible to it). The text's accuracy is human-ratified, not floor-checked.
- "The patched file cannot be written by the agent" → **FLOOR: hook (fix #2)**. Probed: exit 2, control
  exit 0. **NARROWED (L19/§6):** that is the `Write|Edit|MultiEdit|NotebookEdit` surface only; a `Bash`
  write reaches `LIMITS.md`, as `LIMITS.md §6`'s own probe table records.
- "The patch applies cleanly" → **FLOOR: enum/regex-class** (`git apply --check` exit code), verified
  at build time in this worktree.
- "config↔frontmatter agree" → **FLOOR: enum-regex** (`check-model-config.mjs`), and it is the very
  claim the new text bounds. **It never reduces to "the stage ran under that model"** — no floor
  primitive can observe that, which is the limit being recorded.
- "Per-stage routing reaches stages run inside `/pharn-ship` / `/pharn-loop`" → **struck, not
  downgraded.** The new text asserts nothing here; it attributes the turn-scope claim to the checker's
  header, because this repo cannot settle it.
- "A `SKILLS_VERSION` bump is owed" → **advisory** (a CLAUDE.md rule, enforced by no checker over this
  path; `check-skills-version-recorded.mjs` binds the CHANGELOG key, not the trusted-doc edit — the
  exact blindness **L43** records).

## Trust audit (P2)

No untrusted artifact is ingested. Every input is a repo-local, human-authored trusted file read this
run (`LIMITS.md`, `README.md`, `pharn.config.json`, the two checkers, the hooks, canon). The lesson
titles quoted from `docs/lessons-index.md` are canon free text reproduced as DATA, never as
instructions. The probe fixtures under the scratchpad are agent-authored and are read only for their
**exit codes** — an enum-gated value — never for prose.

## Determinism audit (P5)

- The trigger is a whole-file `grep` over `LIMITS.md` plus three executed probes — membership and exit
  codes, no LLM classification.
- The shape (staged patch vs. direct edit) is decided by the hook's **exit code**, not by preference.
- The layer assignment of each Layer-2 bullet is decided by "can this repo settle it?" — answered by
  execution where possible (fresh-install posture: yes, probed) and by an explicit **"I cannot verify
  this from here, so attribute it"** where not (turn scope, platform veto). That is P5's terminal
  fallback: the unresolvable case is handed to the human as an attribution, never guessed.
- Every remaining open question below terminates at the human, never at a default.

## Open questions — RESOLVED at the options halt (human-selected, 2026-09-21)

All four were put to the human as a selectable form before any build-stage write. Recorded here as
answers, not as recommendations, so the build stage branches on a human decision and not on a default
(P5's terminal fallback).

- **OPEN-1 — WHERE → a NEW `## 8.` section in `LIMITS.md`.** Rejected and recorded rather than dropped:
  a fifth `§1` entry (the section is titled "The four irreducible limits" `:15`, and this limit is not
  irreducible in §1's sense — it is a bound on what a live check covers), an insertion into `§5`
  (different axis, P3), and a pointer-only stub (leaves ownership with a script comment and unguarded
  prose — the very condition the trigger names). Shape follows the **§6/§7 precedent**: a numbered
  section naming a surface the guards do not cover, carrying a **struck-claim / true-statement** pair.
- **OPEN-2 — LAYER 2 → carry turn scope AND platform veto**, each attributed to the checker's header in
  one compact sentence, neither adopted as LIMITS' own. `model_tier:` is **excluded**: it is PHARN's own
  capability frontmatter (`ARCHITECTURE §3.1`), platform-inert, and not a routing limit. The
  fresh-install posture is **not** part of this answer — the probe moved it to Layer 1, so LIMITS
  asserts it directly.
- **OPEN-3 — all four sub-answers selected.** (i) **Drain** `README.md:499-509` to a short statement +
  pointer (L35 — retire the copy, do not bind it). (ii) **Fix** `check-model-config.mjs:10-11`'s false
  universal quantifier (F1) to the block-scoped sentence and add a back-pointer — **header prose only;
  the checker's logic is untouched**. (iii) **Keep** `README.md:325`'s guarantee-table row as is — the
  bound already travels in the row's own text, which is the `bash-write-claim-wording` precedent.
  (iv) **Add** a top-level pointer key to `pharn.config.json` — probed GREEN on **both** checkers
  (11 stages, unchanged), putting the reason at the slot that creates the false impression.
- **OPEN-4 — BUMP → patch, `6.3.0` → `6.3.1`, applied by the human in ONE commit.** Patch because this
  is a clarification to bytes that already shipped — no new capability, command or checker. `APPLY.md`
  must instruct the human to land the `LIMITS.md` patch together with the `SKILLS_VERSION` and
  `CHANGELOG` edits, so the version never claims a limit the file does not yet carry. The rejected
  alternative is recorded with its cost: an agent-side bump now opens a window where `SKILLS_VERSION`
  reads `6.3.1` against an unpatched `LIMITS.md`, and **nothing detects it** —
  `check-skills-version-recorded.mjs` binds the CHANGELOG key, not the trusted-doc edit, which is
  exactly the blindness **L43** records.

### One classification ambiguity, stated rather than guessed (P6)

`pharn.config.json` is **not** enumerated in CLAUDE.md's bump-triggering set, and **not** in its
repo-meta exemption list either; the installer writes a _different_ config into a user's project. So
whether OPEN-3(iv) is itself a bump-triggering byte is genuinely ambiguous. **It forces no decision
here:** the increment already bumps to `6.3.1` for `LIMITS.md`, and every edit in `## Files` folds into
that one bump either way. Flagged for a human to settle in CLAUDE.md separately, not resolved by this
increment.
