# PLAN — specified-markers-sweep

- spec_content_hash: 2c84959cbca0b2dc51aaad90f90d40e574732c9c5c83c0bda7e1481ecb0db12e
- applied_lessons: [L6, L20, L33, L34, L35, L36, L41, L60, L61, L75]
- increment: add a third direction to `check-specified-markers.mjs` — a closure sweep that REDs any occurrence of the "specified" marker phrase on the scanned tree that no registered site (or explicit exemption) accounts for.
- layer(s): build apparatus (`.dev/floor/`) — not a capability layer; no product-surface byte changes
- constitution_refs: [P0, P5, P6, P7]

## Trigger (P7)

Audit 2026-10-12 finding **ENF-8** (LOW, drift guard, disclosed): only REGISTERED annotations are guarded; a new
"(specified; ships with the guarded surface)" is invisible, so an overclaim can be re-annotated without a probe.
The class is not hypothetical: `specified-primitives.json` itself records that the `archetype-maps` ARCHITECTURE §4
site and the `constitution-injection` site were unregistered until a hand sweep found them (`$comment`s on those
entries). Two hand-found misses of the same class is L20's trigger for a floor check.

## Discovery (live, this run, origin/main 18037dd4, SKILLS_VERSION 6.72.0)

- `node .dev/floor/check-specified-markers.mjs .` → GREEN, 25 annotations / 8 primitives, 2 forward-claim sites.
- Lessons index freshness: `check-lessons-index.mjs .` exit 0 → two-step sweep from the index, then canon in full.
- Phrase scan (`ships\s+with\s+the\s+guarded\s+surface`, case-insensitive, over `git ls-files`), per-hit disposition
  (L75). **Every hit on the four trusted docs, `CLAUDE.md` and `finding-shape.md` is already registered** (23/23 hits —
  ARCHITECTURE 8, THREAT-MODEL 6, LIMITS 5, finding-shape 3, CLAUDE.md 1; each lies inside a registered marker's byte
  range. Corrected at build from a first-draft "25/25", which counted the 25 registered SITES: one site, THREAT-MODEL's
  archetype-maps `_Specified; the check is conditional…_`, carries no phrase, and two sites' markers cover the same
  THREAT-MODEL:115 hit — `pre-egress` and `community-privilege`). **Unregistered hits today: zero on any doc
  that makes a claim.** The rest are prose ABOUT the marker:

  | file                                          | hits | disposition                                                                  |
  | --------------------------------------------- | ---: | ---------------------------------------------------------------------------- |
  | `.dev/floor/specified-primitives.json`        |   25 | auto-exempt: the manifest the checker reads (it must quote every marker)     |
  | `.dev/features/**` (≈20 files)                |  ≈45 | exempt by prefix `.dev/features/`: build-loop audit trail, history           |
  | `CHANGELOG.md`                                |    6 | exempt: release history quoting the marker                                   |
  | `.dev/floor/check-specified-markers.mjs`      |    2 | exempt: the checker names its own vocabulary                                 |
  | `.dev/floor/check-specified-markers.test.mjs` |    1 | exempt: fixtures quote the marker                                            |
  | `.dev/guides/floor-checks.md:353`             |    1 | REPHRASE (this increment edits that section anyway), so no guide is exempted |

## Design decisions

1. **Vocabulary: the `specified` phrase only; forward claims are NOT swept.** The specified class has one invariant
   substring (`ships with the guarded surface`, L33's "shortest invariant substring") shared by every one of the 25
   registered markers that carry it. Forward claims have none: the two registered markers are bespoke sentences
   ("no `pharn-eval` command exists", "nothing under `pharn/floor/` renders one"), and the generic forward-claim
   words (`next increment|not yet built|runner yet|future increment`) hit **70 times in 45 files** outside history,
   most of them the P7 policy statements the manifest's `$forward_claims_comment` deliberately leaves unregistered.
   Sweeping them needs either a heuristic (P0/P5 forbid calling that a guarantee) or registering correct sentences.
   Stated as the residual in the checker header and the guide.
2. **Matching:** regex `ships\s+with\s+the\s+guarded\s+surface`, `gi` — whitespace-tolerant so a markdown re-wrap
   (`the\nguarded`) and a case change (`Ships`) are still seen (L33/L36 variant spellings). A hit is **covered** iff
   it lies wholly inside some occurrence of a registered `specified_primitives` site marker **in the same file**
   (per-occurrence, not per-file — a second, unregistered hedge in an already-registered doc still REDs). A hedge
   reworded without the phrase (THREAT-MODEL §4 item 5's `_Specified; the check is conditional…_` is the live
   example, registered by its own marker) stays outside the sweep — stated bound.
3. **Scanned surface: the whole working tree as git would commit it** — `git ls-files -z --cached --others
--exclude-standard` run in the target. Tracked + untracked-not-ignored, so a new doc is caught before `git add`;
   `.gitignore` / `.git/info/exclude` paths (`AGENTS.md` mirror, `.pharn/`, `node_modules/`, `coverage/`) are not
   scanned (L61's named remedy: read the tracked set, not a glob). Entries ending in `/` (a nested repo, e.g. a
   sibling worktree under `.claude/worktrees/`) and non-regular files (symlinks) are skipped; a listed path absent
   from disk (deleted, not staged) has no bytes to scan and is skipped; a regular file that cannot be read is RED,
   never skipped. Not a git work tree, or zero files listed → **exit 2** (fail-closed, L34: a sweep over nothing
   certifies nothing). This drops the header's "no child_process" property for the sweep — precedent:
   `check-surface-bump.mjs`, `check-bash-reconcile.mjs` read git too. Rejected alternative: an fs walk with a
   hand-kept skip list, which is a second copy of `.gitignore` (L35).
4. **Exemptions: a closed, explicit list in the manifest, never a pattern.** New manifest key
   `marker_sweep: { exempt: [{ path, reason }] }`. `path` is an exact repo-relative file, or a directory prefix
   ending in `/`; `reason` is required free text for the human reviewer (never read by the checker's control flow).
   The manifest file itself is exempt by construction when it sits inside the target (the address book has to quote
   what it registers). Rules, all deterministic: malformed key/entry, `..`/absolute/backslash path, or a duplicate →
   exit 2; **an exemption covering a file that holds a registered site → exit 2** (a guarded doc can never be
   exempted wholesale); **an exemption matching zero hits → RED `STALE_EXEMPTION`** (an allowlist entry that
   outlived its reason, L34 applied to the allowlist). The test pins the real exemption set by exact equality, so
   adding one is a visible test edit (L36 closure).
5. **Opt-in by key, pinned on.** Absent `marker_sweep` → no sweep (keeps the existing per-entry `realFixture`
   tests, which copy one entry's docs with a one-entry sub-manifest, meaningful — a sweep there would RED on the
   other entries' hedges in the same copied doc). An integration test pins that the REAL manifest declares
   `marker_sweep` and that the real-repo GREEN line reports a non-zero swept-hit count, so deleting the key REDs a
   test (L41: the default path is exercised by the integration run, which passes no `--manifest`).

## Files

- `.dev/floor/check-specified-markers.mjs` — add direction 3 (the sweep), its validation, the GREEN/RED lines; rewrite the header's "CANNOT DISCOVER" bound to what remains true (L33 — this increment expires that sentence)
- `.dev/floor/check-specified-markers.test.mjs` — sweep fixtures (git-init temp trees) and the real-manifest pins
- `.dev/floor/specified-primitives.json` — add `marker_sweep.exempt` (4 entries) and update the `$comment` that says nothing discovers annotations
- `.dev/guides/floor-checks.md` — the `check-specified-markers.mjs` section: direction 3, its bounds, and the phrase reworded so the guide needs no exemption
- `CHANGELOG.md` — one `## [Unreleased]` entry (apparatus only, no bump)
- `.dev/features/specified-markers-sweep/PLAN.md` — this plan

## Applied lessons

- L6 — membership stays in the manifest; the sweep never derives a site from prose, it only asserts every prose hit is accounted for. L6's failure (prose ABOUT a marker read as a marker) surfaces here as a loud RED resolved by a reviewed exemption, never as a silent registration.
- L20 — the class has two hand-found misses recorded in the manifest's own comments; this is the floor check that replaces "remember to register".
- L33 — the regex is the shortest invariant substring, whitespace/case tolerant; and this increment expires the checker's own "CANNOT DISCOVER" sentence plus the manifest/guide restatements, which are rewritten in the same diff.
- L34 — zero listed files is exit 2; an exemption with zero hits is RED; the GREEN line prints the swept-hit count so an emptied sweep is visible.
- L35 — the scan set is git's own (`--exclude-standard`), not a hand-kept copy of `.gitignore`.
- L36 — coverage is a closure over every hit, not a presence set; the exemption set is pinned closed by a test.
- L41 — the real-repo integration test runs with the DEFAULT manifest path and pins `marker_sweep` present, so the opt-in default is exercised.
- L60 — each ✧ sweep test asserts a property its mutant can violate (an extra hit, a wrapped hit, a same-file hit, a stale exemption), each checked to RED.
- L61 — scanning the git listing rather than a glob is that lesson's named remedy, and it keeps sibling worktrees and the gitignored `AGENTS.md` out.
- L75 — every measured hit is recorded with a disposition in the Discovery table above.

## Evals / tests to write (P1 — apparatus: `node --test`, no capability evals)

- GREEN: sweep on, only registered hits (fixture manifest inside the tree is auto-exempt).
- ✧ RED: an unregistered hit in another file names `file:line`; ✧ a second hit in a registered site's own file; ✧ a re-wrapped / re-cased hit.
- GREEN: hit in an exempt exact file; hit under an exempt `dir/` prefix. ✧ RED: stale exemption.
- ✧ exit 2: exemption covers a site file; malformed `marker_sweep` / `exempt` / entry; bad path; duplicate; target not a git work tree; zero files listed.
- Scan surface: untracked-unignored file scanned (RED); gitignored file not scanned; tracked-but-deleted file skipped; nested repo and symlink skipped; unreadable regular file RED (skipped when running as root).
- No `marker_sweep` key → no sweep (opt-in is real); integration: real manifest declares the key, real repo GREEN with swept hits > 0, exemption set equals the pinned list exactly.

## Guarantee audit (P0)

- "Every phrase hit on the swept tree is a registered site or exempt" → floor: enum-regex (regex match + byte-range and path-set membership). Bounded: the phrase only; ignored paths unscanned; a whole-file/prefix exemption hides any future hedge inside it (the exemption list is a human-reviewed declaration, pinned by test).
- "The sweep cannot pass over nothing" → floor: enum-regex (integer test on listed files; zero-hit exemption RED).
- "The checker discovers new overclaims" → NOT claimed. It discovers new phrase-bearing hedges; an overclaim carrying no hedge, or a hedge worded without the phrase, stays invisible (header + guide + GREEN line say so).
- Running `check:markers` at all → advisory wiring (unchanged; `npm run check` + the ci.yml step).

## Versioning

Apparatus only (`.dev/**`, a test, CHANGELOG) → **no SKILLS_VERSION bump**, an `[Unreleased]` entry. No trusted-doc,
product-surface or generated-doc change, so no HUMAN-PATCH.md.

## Resolved questions (GATE 1)

GATE 1 was decided on 2026-10-24 by the batch orchestrator under the maintainer's delegation — a model decision,
not a human approval: **APPROVED**, with these answers.

- Q1 scan surface → (a) the git listing (tracked + untracked-not-ignored). The guide states that a local untracked
  scratch file carrying the phrase REDs locally while CI never sees it, and that this is the intended direction.
- Q2 forward claims → not swept; the gap is stated plainly in the checker header, the manifest `$comment` and the
  guide.
- Q3 coordination with `chore/changelog-archive` → whichever PR merges second adjusts the manifest exemption entry
  and the pinned exemption list in the test.
