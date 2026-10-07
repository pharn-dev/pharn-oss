# Floor CLI reference — checks, provenance, config and repo-meta

Moved out of the always-loaded root `CLAUDE.md` at `6ff4dd1` (SKILLS_VERSION 6.46.0) by `claude-md-bootstrap`. The text is the moved text, unchanged except
for the `##` headings added for navigation and the leading indentation Prettier normalizes. The root `CLAUDE.md`
still holds the rules every session needs; this file adds detail and does not override them.

**Read when:** before planning a change to, running, or citing one of the CLIs below (and `CLAUDE.md`'s SKILLS_VERSION rules decide whether the change bumps).

Read only the section for the CLI you are touching. Positional words inside an entry (`above`, `below`, `further up`)
come from the single code block this text was moved from, so the entry they name may now sit in another
`.dev/guides/floor-*.md` file: search for it by file name.

## `validate.mjs` — the deterministic floor

```bash
# Run the deterministic floor against the PHARN repo being built (default: cwd).
# Exits non-zero on any RED (blocking) finding. /pharn-dev-build runs it automatically.
# CHECK 8 (added 2.3.4) additionally REDs a canon file that cites a RELOCATED floor checker: a literal
# `.dev/floor/<B>` where `pharn/floor/<B>` exists — the cite names a file that MOVED, so the command
# ENOENTs and its deterministic sub-check silently degrades to judgment. Scoped POSITIVELY to the
# capability canon — every `pharn/pharn-*` module, DISCOVERED from the target at run time and sorted, so
# a module added later is covered the day it lands and the emission order is filesystem-independent —
# over `.md` AND `.json` — validate's
# capability walk is `.md`-only, but the eval judges are `.json`. NOT pharn/floor (it holds the
# intentional dev-refs + the deliberately-RED fixtures), NOT `.dev/`, and NOT the root docs — CLAUDE.md
# and CHANGELOG.md correctly cite the DEV copy of a deliberate copy-pair (check-provenance,
# check-lessons-index, gen-lessons-index, lessons-index-core live in BOTH floors on purpose), so a
# repo-wide walk would report those correct sentences as drift. Existence-gated, and that gate cuts
# both ways: it FORCED the 2.4.0 `scan-plan-*` relocation (moving the five scanners to `pharn/floor/`
# is what made their canon cites flag here, driving the move to completion), while it still
# structurally CANNOT flag the never-built `scan-plan-*` ghosts — no twin, no flag, no name list.
# NARROWED, and stated: it proves the cited file EXISTS, never that the body invokes it correctly; a
# stale ref appearing inside pharn/floor is not caught (indistinguishable there from an intentional
# dev-ref); it is GREEN when the target has no pharn/floor at all; and its scope is silently empty when
# the target has no pharn/ at all.
node pharn/floor/validate.mjs [target-dir]
```

## `check-structural.mjs` — an eval's structural assertions

```bash
# Execute an eval's structural[] assertions against a skill's finding output (a JSON array).
# Exits non-zero on any RED — e.g. a needle laundered into an enum-gated field.
node pharn/floor/check-structural.mjs <expected.json> <actual.json> [repoDir]
```

## `check-plan-lessons.mjs` — the `applied_lessons` declaration

```bash
# Check that a PLAN DECLARES which promoted lessons it applied (the `applied_lessons` field).
# Floor, FOUR sub-checks: the field is present + well-formed (`none` | `[L<n>…]`) + every cited id
# resolves to a `## L<n> ` heading + (D, added 3.0.0) every cited id is REFERENCED in the plan BODY, so a
# citation costs a line and a header list cannot be pasted over a body that never mentions a lesson. The
# header region carrying the declaration is deliberately NOT the body, so the declaration cannot satisfy
# itself; `none` is exempt from (D) (no id to reference); the id match is `\b`-anchored, so `L33` in the
# body does NOT satisfy a citation of `L3`. ADVISORY (never checked): whether the lessons were genuinely
# applied. (D) is NOT proof of reading — a body line reading `L3: considered.` satisfies it; it raises a
# citation's PRICE, it does not measure comprehension. HONEST TRIGGER (P7): (D) answered no observed
# failure — measured over the 150 committed PLAN.md files, 52 cited >=1 id and ZERO omitted one from the
# body, so L20's "second occurrence" bar was NOT met; it was added at the maintainer's explicit direction
# (P5 — ask the human), and this comment says so rather than inventing a trigger.
# Both /pharn-plan and /pharn-dev-plan self-run it before their halt; both grill stages RE-verify it
# (2.8.0), and both ship stages read its exit code. Exits non-zero on RED.
node pharn/floor/check-plan-lessons.mjs <PLAN.md> <lessons-learned.md>
```

## `reconcile-baseline.mjs` / `check-bash-reconcile.mjs` — Bash-write reconciliation

```bash
# ANCHOR a reconciliation epoch / DETECT a write the write-guards would have denied — the fix #7 blind
# spot. Both PreToolUse guards match Write|Edit|MultiEdit|NotebookEdit only, so a Bash write reaches every
# path unblocked and (no PostToolUse being wired) unrecorded. L19 named that in 2026-08-05 with a
# discipline-only remedy; L20 says the SECOND occurrence earns a floor check and it recurred at least
# three times, so this is that check. `--anchor` runs at /pharn-*build Step 0 AFTER the scope-setter and
# snapshots the live scope INTO the baseline (by verify time .pharn/writes-scope.json holds a LATER
# stage's scope — L38); the checker re-hashes at /pharn-*verify and asks the LIVE guards, by EXECUTING
# them, whether each changed path would have been denied. Denied => `reconcile` gate fails => verify FAIL.
# DELEGATED, not re-derived (L37): trusted-path/canon denial runs protect-trusted-paths.cjs; the
# fail-closed DEFAULT runs enforce-writes-scope.cjs in a probe sandbox reproducing THREE runtime signals
# (6.24.0, up from two): a pharn.config.json skillsVersion, .dev/floor/ presence, and a FRESH run marker
# (written by run-marker.mjs's own openRun()), so the sandbox always answers with the STRICT in-run
# default rather than the newer install-posture permissive one — the only defensible answer for a probe
# with no write history to consult (L42). The marker's openRun() result is CHECKED: a refused marker throws,
# and the main-loop caller maps that to INCONCLUSIVE, never to a permissive probe. Exactly ONE matcher is duplicated (the
# explicit-scope glob — undelegatable, since the hook reads the scope from disk) and a parity test RUNS
# the real hook over shared cases. NOT git status: that answers changed-since-BASE, misses a write that
# restores HEAD bytes, and counts every legitimate Edit — the exact conflation L17 records in
# check-regress.mjs. DETECTED, NEVER PREVENTED (OS-level sandboxing is the only true prevention and is not
# implemented); bounds — ignored paths are outside the reconciled set, the window is anchor->verify, one
# worktree per session, no attribution. NO_BASELINE is GREEN by design (a fresh clone never anchored, the
# check-lessons-index COLD posture); /pharn-*verify passes --require-baseline, where absence is a refusal.
# Since 6.24.0 `--anchor` itself REFUSES (exit 2, nothing written) when there is no usable scope to
# snapshot (D6) — an explicit `{"scope": []}` IS a scope and anchors; both shipped callers set one first.
# Contract: pharn/pharn-contracts/reconciliation-record.md. Data: pharn/floor/reconcile-ignore.json.
# Exit: 0 CLEAN|NO_BASELINE · 1 ESCAPE · 2 INCONCLUSIVE / no usable scope to anchor (D6).
node pharn/floor/reconcile-baseline.mjs --anchor [--base <dir>] [--by <label>]
node pharn/floor/check-bash-reconcile.mjs [--base <dir>] [--require-baseline]
```

## `runtime-floor.mjs` — the Node runtime floor

```bash
# Refuse to run a floor CLI on a Node that would make it a silent no-op (6.50.0, audit finding P1-A). Every floor CLI
# gated on `if (import.meta.main)` exits 0 having checked nothing on a Node without that property (before 22.18 / 24.2),
# reproduced on 20.13.1 and 22.16.0. This module is imported for its SIDE EFFECT as the FIRST static import of every
# gated CLI under both floors (`import "./runtime-floor.mjs";`, or `import "../../pharn/floor/runtime-floor.mjs";` from
# .dev/floor). Below the floor — `import.meta.main` not a boolean, or `process.versions.node` older than 24.2.0 or
# unparseable — it writes one line to stderr ending in REFUSAL_TAIL and exits 2, before any sibling module evaluates.
# Three CLIs take no static import by design (check-instruction-files, check-loop-fresh, check-quick-scope: a module
# that cannot load maps to their own exit 2); they carry the feature check INLINE above their gate, with REFUSAL_TAIL
# verbatim, and `await import("./runtime-floor.mjs")` inside their `try`. A new gated CLI must carry the guard too:
# .dev/floor/entry-point-guard.test.mjs pins the position in every gated CLI and spawns each one under a faked
# `process.versions.node` of 22.16.0 (exit 2, empty stdout, the sentence on stderr). The fake cannot remove
# `import.meta.main`; `PHARN_OLD_NODE=<old node binary> node --test .dev/floor/entry-point-guard.test.mjs` runs the
# same sweep on a real old runtime (CI does not). FLOOR: the refusal on a runtime below the floor, for every CLI that
# carries the guard. NOT covered: ungated scripts (unaffected by this defect), an API an old Node lacks (fails loudly),
# a caller that ignores exit codes. Exit: 2 refusal; otherwise the module is silent and the CLI runs as before.
node pharn/floor/runtime-floor.mjs   # silent exit 0 on a supported Node
```

## `run-marker.mjs` — the run marker

```bash
# WRITE / REMOVE the run marker that holds an INSTALLED project's write guard fail-closed while PHARN is
# actually working (6.24.0, D3) — see "Writes-scope" above for the posture it feeds. `<command>` is one of
# the closed pair `{pharn-review, pharn-ship}`; `pharn-loop` is REFUSED (its marker has its own owner,
# require-loop-record.cjs — one schema, one writer, L35). Writes/removes
# `.pharn/<command>/<name>/active.json` = `{schema, command, name, session_id, started_at}`; the guard
# reads only the marker's PRESENCE (lstat, never followed) and its mtime (24h ceiling, symmetric) —
# NEVER its contents. `--open` overwrites (refreshes the age); `--close` is idempotent. `/pharn-ship` opens
# right after its GATE-1 resume backstop and closes in Step 3a (every exit that ends the run);
# `/pharn-review` opens just before Step 3 (after its last ask-the-human point) and closes in its own
# Step 7. Both lines are Bash calls outside the PreToolUse gate (L19) — ADVISORY: a run that skips `--open`
# is simply unguarded between its own scoped steps, and one that skips `--close` leaves the fail-closed
# default standing for at most 24h. Both commands STOP when `--open` exits non-zero (GATE-2 review, S1: a
# FILE planted at `.pharn`, `.pharn/<command>` or `.pharn/<command>/<name>` used to crash the writer with
# exit 1 and a stack trace, and neither command stopped); run-marker.test.mjs EXECUTES each command's pinned
# line — the WHOLE line, so a suffix like `|| true` is caught — against such a planted file. `/pharn-loop`,
# which never calls this script, STOPs the same way (S9) when its own Step 1a snapshot line or its
# `require-loop-record.cjs --open` line exits non-zero — that writer is a human-only hook and still crashes
# with exit 1 on a planted file (re-review R2); run-marker.test.mjs executes those two lines too. No new contract
# (P7): the guard reads only a path and an age, and this script's own header is its spec, the
# require-loop-record.cjs precedent. Exit: 0 ok · 2 refusal on ANY failure, never a crash; no marker written.
node pharn/floor/run-marker.mjs --open <pharn-review|pharn-ship> <name>
node pharn/floor/run-marker.mjs --close <pharn-review|pharn-ship> <name>
```

## `feature-name.mjs` — a feature name before any shell line

```bash
# CHECK A FEATURE NAME BEFORE ANY SHELL LINE CARRIES IT (added 6.30.0, shell-sink-validation). THE RECORDED FAILURE (P7,
# reproduced): where a command derived the feature slug from the user's description (/pharn-spec Step 0, so /pharn-ship,
# and /pharn-loop S1), the only check ran INSIDE a node process, after the shell had parsed the line carrying it — the
# loop's own `node -e … '<slug>'` validator ran `x'$(touch PWNED)'` and exited 0, and /pharn-spec's unquoted setter ran
# `;touch${IFS}PWNED;` before GATE 1. Now the model writes the slug alone to `.pharn/feature-name/candidate.txt` with the
# WRITE tool (no shell parses it); this CLI refuses a symlinked or non-directory `.pharn` / `.pharn/feature-name`, reads
# the file without following it, removes whatever stands at the path but a directory once those checks pass, and prints
# the slug only as a FEATURE_SLUG_RE member (imported, L35). `--fresh` also picks the first `<slug>`, `<slug>-2`, … that
# pharn/features/ lacks (the loop's old S2 shell loop) and refuses on any lstat error but ENOENT. The seven commands that
# take a name as their argument ask for a missing one (plan grill test build review) or resolve it only through this CLI
# (regress verify). The Write tool refuses a link at the path and names the link's target as the path to write instead
# (measured), so every caller says: never Read it, never write elsewhere — run the CLI once, it removes the entry. Same
# release: /pharn-loop Step 6d returns with the constant `git checkout - --` (its bound is stated there: `-` is this
# worktree's previous checkout, so a checkout in between sends it elsewhere), and /pharn-ship --quick item 7 takes no
# ref from the description. FLOOR: the printed value is a FEATURE_SLUG_RE member (tested); `.dev/floor/command-hygiene.
# test.mjs`'s SHELL-SINK section closes SHELL_VALUES (every placeholder a product command's shell line takes) and
# NAME_ORIGINS both ways, pins order and the per-command sentences (presence only), and EXECUTES the committed lines.
# ADVISORY: that the model uses the Write tool, obeys the refusal rule and re-types only the printed value. BOUND: one
# candidate file per tree (L38). Exit: 0 the name on stdout · 2 refusal (closed REFUSALS, `crashed` included), nothing on
# stdout · node's own 1 = the entry file did not load (a run from outside the project root). No contract (P7): the
# module's header is its spec. Ships: bumps SKILLS_VERSION.
node pharn/floor/feature-name.mjs [--fresh]
```

## `pharn/floor/check-provenance.mjs` — product provenance

```bash
# PRODUCT twin of check-provenance (below): validate a promotion candidate for a USER's memory-bank.
# Same primitive #3 checks; TARGET_ENUM is `memory-bank/{lessons-learned,pattern-library}.md` (the two
# PRESCRIPTION files, deliberately NOT ARCHITECTURE §5's four state files), and COMMIT_RE additionally
# admits the literal `unknown` — a user's project need not be a git repo, so an honest absence is a
# member and a fabricated SHA is not. FLOOR, NARROWED and stated: "well-shaped provenance" therefore
# does NOT imply a diff pointer. Run by /pharn-memory-promote before its human accept/deny gate.
# CANON-ARG BINDING (added 3.0.6, both copies): argv[3] must NAME the candidate's declared `target` —
# a relative arg must EQUAL it segment-wise, an absolute one must END with it at a segment boundary —
# else a `canon-arg` RED. Before this the duplicate-id verdict ranged over WHATEVER FILE THE CALLER
# NAMED while the enum test only ever saw `cand.target`, so a candidate whose id was already taken in
# its declared target exited 0 GREEN against any other file. NARROWED: the absolute form is a SUFFIX
# test (a same-named file under a different root still matches; the comparison is cwd-INDEPENDENT by
# construction), it never proves the declaration named the APT member, and it never proves the WRITE
# lands there — that is fix #7. Gated on the target-enum check passing, so a non-member target still
# reports exactly one true reason.
# A DELIBERATE second copy of .dev/floor/check-provenance.mjs, not a shared core (the alternative made
# the gate's membership set a CLI argument); the two are pinned to agree on every shared constant by
# ✧ tests in .dev/floor/check-provenance.test.mjs, which also assert the two TARGET_ENUMs/COMMIT_REs
# differ deliberately. Exits non-zero on any RED.
node pharn/floor/check-provenance.mjs <candidate.json> <canon-file.md>
```

## `pharn/floor/gen-lessons-index.mjs` / `check-lessons-index.mjs` — product lessons index

```bash
# PRODUCT twin of the lessons index (dev pair below): generate / drift-check a one-line-per-lesson address
# book over a USER's memory-bank/lessons-learned.md, rendered to the GITIGNORED CACHE .pharn/lessons-index.md.
# The checker prints one of five tokens — NO_CANON | COLD | GREEN | STALE | ENUM_ERROR — and `--verdict`
# prints ONLY that token, so a caller branches on set MEMBERSHIP, never on prose and never on the exit code
# alone (NO_CANON/COLD/GREEN all exit 0). FLOOR, NARROWED: a byte comparison over a DISPOSABLE CACHE — a
# STALENESS check, NOT the dev pair's "committed == recomputed" byte-equality, and its coverage is
# machine-local (a fresh clone is COLD). NO_CANON (no memory-bank yet) and COLD (no cache yet) are GREEN BY
# DESIGN — the honest normal state of a fresh install; STALE is the only drift RED, because it is the only
# state where the cache could MISLEAD a selection. Consistency, never correctness; and "the index was
# consulted" NEVER means "the relevant lessons were read". Run by /pharn-plan's sweep (read) and
# /pharn-memory-promote Step 6b (refresh, advisory, a Bash write outside fix #7 — L19).
node pharn/floor/gen-lessons-index.mjs [target-dir]
node pharn/floor/check-lessons-index.mjs [target-dir] [--verdict]
```

## `.dev/floor/check-provenance.mjs` — dev provenance

```bash
# Validate a memory-bank promotion candidate: mandatory provenance shape + duplicate-id + target enum,
# plus the entry tag fields — `type` (closed enum, exact membership) and `concepts` (1–6 unique tags, each
# control-char-free lowercase/digit/hyphen, <=32 chars). Both are REQUIRED on new candidates; legacy canon
# entries are never scanned. SHAPE only — that the values DESCRIBE the entry is advisory (human-ratified at
# the Step-5 gate), so a `type`-keyed filter is context selection, never a guarantee.
# Carries the SAME canon-arg binding as the product twin (above), plus two patches BACK-PORTED in 3.0.6
# that had shipped product-only for a whole release line — isGregorianDate (this copy accepted the
# non-existent 2026-02-31) and the whitespace-free id check (it accepted `L99 extra`, and .trim()ed
# "L1\n" into a COLLIDING token). The checker gating PHARN's OWN canon had been the weaker of the two.
# The ✧ guard missed it because it compared `const` DECLARATIONS and both patches live in the validation
# BODY (L31); check-provenance.test.mjs now adds a shared-FUNCTION-body pin and CROSS_COPY_BEHAVIOURS,
# which EXECUTES both checkers on one input and requires the same verdict. NARROWED (L36): a PRESENCE
# set over behaviours a review NAMED — it cannot DISCOVER an unnamed divergence, so a green run still
# never means "the two copies behave identically".
# Exits non-zero on any RED. /pharn-dev-memory-promote runs it before the human accept/deny gate (never writes on RED).
node .dev/floor/check-provenance.mjs <candidate.json> <canon-file.md>
```

## `check-model-config.mjs` — product model configuration

```bash
# PRODUCT-surface twin of check-config (below), but NOT a copy-pair: hold pharn.config.json's
# `models.stages` in EQUALITY with the ELEVEN /pharn-* product commands' platform `model:`/`effort:`
# frontmatter. Same three modes (validate | resolve <stage> | agreement) and the same primitive #3, over a
# DIFFERENT closed map (PRODUCT_STAGES: spec plan grill build regress verify ship loop review
# memory-promote ac-test — `ac-test` is the one key that is not its file stem, `pharn-test.md`, so the reverse
# pass tests the map's FILE names), a DIFFERENT filename prefix, and a DIFFERENT fresh-install posture. The DISTINCT
# BASENAME is deliberate: unlike check-provenance / lessons-index-core, the two files share almost no
# substance, so no ✧ shared-constant obligation set is implied.
# MECHANISM, read live (P6): Claude Code selects a COMMAND's model from STATIC FRONTMATTER and nothing
# else — `model:`/`effort:` are real platform-honored command-frontmatter fields, and no command can switch
# its OWN model at run time. So, for a stage a person runs directly, the config is the SOURCE OF TRUTH the
# frontmatter is held to. Since 6.27.0 the block has a SECOND reader, at run time: `stage-agent.mjs route`
# (below) shells this checker's `resolve` to pick the model a /pharn-ship or /pharn-loop STAGE AGENT is
# REQUESTED on. Simulating routing in prose would still be the P0 disease — the route decision is tested code.
# FLOOR: config shape/enums; a `default` entry; every stage key a PRODUCT stage (a `bulid` typo is RED —
# on this surface it governs nothing); the own-property resolve with a `default` fallback (L15); and
# BIDIRECTIONAL agreement over the closed map — no mapped command missing, no UNMAPPED product command
# carrying model:/effort:, and an empty walk is RED, never a vacuous GREEN (L34).
# NARROWED, and stated three ways: (1) it NEVER proves a stage RAN under that model — the platform applies
# model/effort, invisible to any hook/hash/enum; (2) TURN SCOPE — the frontmatter override lasts the invoking
# turn, so a stage run INLINE as a step inside /pharn-ship or /pharn-loop (a policy-inline stage, a routing
# fallback, the orchestrators themselves) does not get its frontmatter model; since 6.27.0 a ROUTED stage gets
# its model from the Agent call instead, and its EFFORT keeps this bound; and (observed once, 2026-10-05) a command
# a MODEL invokes through the Skill tool does not get its frontmatter model at all — only a person's slash invocation
# did (the checker's header, TURN SCOPE); (3) an org availableModels allowlist
# or auto mode can decline a value SILENTLY. `model_tier:` is a DIFFERENT,
# platform-inert field (ARCHITECTURE §3.1) and is untouched — the parser matches keys exactly (L6).
# GREEN BY DESIGN on no pharn.config.json and on a config with no `models.stages` (the check-lessons-index
# NO_CANON/COLD precedent — the honest normal state of an install that does not use the block); the cost
# is stated: deleting the block loses the check rather than failing it.
# Gated by its own *.test.mjs live run, exactly as the dev twin is — no separate npm script, deliberately
# (L35: a parallel script + chain + CI step + CONTRIBUTING token would be a fourth identity to sync).
# THE ONE SHARED-CONFIG GOTCHA, stated because it is not obvious and it BINDS THIS REPO: `models.stages`
# is now read by BOTH checkers, and this one REDs on any key outside PRODUCT_STAGES ∪ {default}. So a
# DEV-ONLY stage key — `eval` is the live candidate, the one dev command with no product twin — CANNOT be
# added to the config as things stand: it would RED here even though `.dev/floor/check-config.mjs` would
# accept it. That is deliberate (on a user's surface such a key governs nothing, so it must not sit there
# looking like a control), and the consequence is a real constraint, not a bug: giving a dev-only stage
# its own model would need a separate namespace, and that decision has not been made. Today the dev
# surface's three wired stages (plan, build, review) are all product stages too, so nothing is blocked.
# Ships: bumps SKILLS_VERSION. Exits non-zero on RED.
node pharn/floor/check-model-config.mjs [validate | resolve <stage> | agreement]
```

## `.dev/floor/check-config.mjs` — dev model configuration

```bash
# Validate pharn.config.json (per-stage model/effort) and check that the wired /pharn-dev-* command
# frontmatter AGREES with it. Config-validity + config↔frontmatter consistency only — NOT proof a stage
# ran under that model (the platform applies model/effort; that binding is advisory).
# TWO DIFFERENT FILES SHARE THIS NAME, and only the first is what this checker reads:
#   (1) THIS repo's root pharn.config.json — the `models.stages` block above;
#   (2) the pharn.config.json the INSTALLER writes into a USER's project — skillsVersion + the exact
#       installed commit, which `pharn status` / `pharn update` compare against SKILLS_VERSION.
# `models.stages` is NO LONGER dev-apparatus-only: since 3.2.0 the SAME map is the source of truth for
# the eleven PRODUCT commands' frontmatter (check-model-config.mjs, above). This checker therefore scopes
# its agreement to a CLOSED `DEV_WIRED` set {plan, build, review} rather than "every non-default config
# stage" — otherwise a product-only key (`spec`, `loop`) would send it looking for a pharn-dev-spec.md
# that does not exist and RED a correct repo. A materialized set, NOT a filesystem probe: an existence
# test would silently stop checking a RENAMED dev command (L29/L36). Its REVERSE pass is re-keyed onto
# DEV_WIRED too and is now STRICTLY STRONGER — before, it asked "does a config stage exist?", so
# pharn-dev-grill.md could have gained a `model:` unnoticed the moment `grill` existed for the product
# surface. Adding model:/effort: to a dev command means adding its stage to DEV_WIRED in the same edit.
# Exits non-zero on RED.
node .dev/floor/check-config.mjs [validate | resolve <stage> | agreement]
```

## `check-specified-markers.mjs` — specified markers

```bash
# Bind PHARN's own "(specified; ships with the guarded surface)" annotations to reality, BOTH ways.
# The four trusted docs asserted floor primitives that do not exist as running checks (no pre-egress
# hook; no archetype-maps manifest, so validate CHECK 7 never fires; no /pharn-estimate) and NOTHING
# detected it — they are .prettierignore'd AND markdownlint-excluded, and no checker reads their prose.
# FLOOR (enum/regex, primitive #3), two directions: (1) a primitive that SHIPS while its markers remain
# → RED naming every site (the doc now UNDERSTATES a live protection — it fires exactly when the repo
# gets BETTER, which is when nobody is looking); (2) a marker DELETED while the primitive is still
# absent → RED (a silent return to overclaiming). Also checks `named_artifacts`: a doc citing a shipped
# artifact by a name it does not have (the `security-secrets` → `secrets-in-code` drift).
# Membership comes from the STRUCTURED .dev/floor/specified-primitives.json, never from scanning prose
# — L6, whose defect recurred inside this very increment's REVIEW.md.
# NARROWED, and stated: it CANNOT DISCOVER a new overclaim (the manifest is a hand-maintained address
# book — "the manifest checked out" NEVER means "the docs are true"), and the probe tests file
# EXISTENCE, never that a hook is WIRED in settings.json or works. Apparatus: no SKILLS_VERSION bump.
# Wired into `npm run check` as `check:markers`. Exits non-zero on RED; exit 2 on an unusable manifest.
node .dev/floor/check-specified-markers.mjs [target-dir] [--manifest <path>]
```

## `.dev/floor/gen-lessons-index.mjs` / `check-lessons-index.mjs` — dev lessons index

```bash
# Regenerate / drift-check the derived one-line index over .dev/memory-bank/lessons-learned.md.
# Both are folded into `npm run docs:generate` / `npm run docs:check` (the latter inside `npm run check`),
# so promoting a lesson without regenerating is a loud RED. FLOOR: byte-equality (committed == recomputed)
# — consistency, NOT that the index is true, and NEVER that anyone read a lesson. Exits non-zero on RED.
node .dev/floor/gen-lessons-index.mjs [target-dir]
node .dev/floor/check-lessons-index.mjs [target-dir]
```

## `check-version-badge.mjs` — README badge

```bash
# Assert the README's shields version badge agrees with SKILLS_VERSION. FLOOR (enum/regex, primitive #3):
# the badge value is located by its shields URL PATTERN (`img.shields.io/badge/pharn-<x>-`) — never a line
# number, since editing the README shifts lines — and string-compared to the file. Added 2.5.1-era because
# the badge read `version-1.0.0` through the WHOLE 2.x line and nothing noticed: it sits in the README's
# UNGUARDED prose, OUTSIDE the CURRENT-STATE markers check-capability-catalog holds to byte-equality. Per
# L20 a defect whose only remedy is "remember to update it" has earned a floor check, so this is one.
# Fail-closed everywhere: >1 badge is AMBIGUOUS-RED (never first-match-wins), a hyphen-bearing SKILLS_VERSION
# is a NAMED REFUSAL (shields encodes a literal `-` as `--`, so a pre-release cannot round-trip), and
# SKILLS_VERSION is validated FIRST so two simultaneous REDs cannot race.
# NARROWED, and stated: it proves the two strings AGREE, never that SKILLS_VERSION is CORRECT (a badge
# matching a wrong bump stays GREEN) and never that the version story READS coherently. It does NOT read a
# structured location — a README badge has none, which is the honest bound on L6, not a claim against it.
# Wired into `npm run check` as `check:badge` AND as its own ci.yml step — ci.yml runs each script
# individually and never `npm run check`, so `check`-only wiring would never fire on a PR; both wirings are
# pinned by tests. Apparatus: no SKILLS_VERSION bump. Exits non-zero on RED.
node .dev/floor/check-version-badge.mjs [target-dir]
```

## `check-contributing-gates.mjs` — CONTRIBUTING gate list

```bash
# Assert CONTRIBUTING.md names every gate in package.json's `scripts.check`. FLOOR (enum/regex, primitive
# #3): the gate set is PARSED from the `scripts.check` STRING — the checker hardcodes no gate name — and
# each must appear in CONTRIBUTING.md as a BACK-TICKED token. The back-ticks are load-bearing, not
# cosmetic: a bare substring test would make the `test` gate unfalsifiable, since the word appears in
# ordinary prose. Added because CONTRIBUTING read "format:check + lint + lint:md + test" while the chain
# had grown to SEVEN — `docs:check`, `check:markers` and `check:badge` were added and the sentence never
# was, so every contributor editing a capability hit a `docs:check` RED the docs had not warned them
# about. Per L20 a defect whose only remedy is "remember to update it" has earned a floor check; the
# `check-version-badge` precedent fired on the same lesson. Fail-closed on every unusable input
# (MISSING_PACKAGE | NO_CHECK_SCRIPT | EMPTY_CHAIN | MISSING_DOC) — no input state is GREEN by default.
# NARROWED, and stated: it proves each gate is NAMED, never that CONTRIBUTING DESCRIBES it correctly (a
# doc listing all seven and explaining each wrongly stays GREEN), and it does NOT check the REVERSE
# direction — a gate removed from the chain but still documented is GREEN, deliberately, because
# CONTRIBUTING legitimately names non-chain scripts (`docs:generate`, `format`) and the two shapes are
# indistinguishable from these two files alone. Wired into `npm run check` as `check:contributing` AND as
# its own ci.yml step (ci.yml runs each script individually and never `npm run check`); both wirings are
# pinned by tests. Apparatus: no SKILLS_VERSION bump. Exits non-zero on RED.
node .dev/floor/check-contributing-gates.mjs [target-dir]
```

## Write-guard hook self-test

```bash
# Self-test the write-guard hook:
echo '{"tool_name":"Edit","tool_input":{"file_path":"pharn/CONSTITUTION.md"}}' | node .claude/hooks/protect-trusted-paths.cjs   # → exit 2, denied
echo '{"tool_name":"Write","tool_input":{"file_path":"pharn/pharn-core/rules/x.md"}}' | node .claude/hooks/protect-trusted-paths.cjs  # → exit 0, allowed
```
