# PLAN — reconcile-merged-paths

- feature: reconcile-merged-paths
- spec_content_hash: 75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6
- applied_lessons: [L1, L17, L32, L34, L42, L48, L64, L68]
- increment: the reconciler classifies a candidate whose change since the anchor is fully explained by upstream commits merged into HEAD as `merged` (reported, not an escape); everything else stays RED.
- layer(s): product floor (`pharn/floor/`), pharn-contracts (`reconciliation-record.md`)
- constitution_refs: [P0, P2, P5, P6, P7]

## The defect (P7 — a real, measured failure)

Audit 2026-10-07 finding **P3-L**: on the maintainer's main checkout, the 2026-10-06 baseline reports 9
escapes, every one a legitimate later merge (two dependabot bumps, the 6.49.1 docs PR — which touched trusted
docs). The same false RED is the standing note in the maintainer's memory "main moved mid-ship": after a
ship agent merges `origin/main` into its branch, the verify `reconcile` gate REDs on every file main changed.
The baseline compares bytes against the last anchor; a `git merge` moves bytes without any write tool, so
every merged path reads as "a write reached it outside the guarded tool surface". That is a
changed-since-anchor fact reported as a wrote-outside-scope claim on the designed workflow (L17).

Reproduced at plan time by reading the code: `check-bash-reconcile.mjs` has no notion of HEAD for ordinary
paths (`controlSurfaceChanges()` diffs against HEAD only for `always_reconciled` and only for uncommitted
changes), and `reconcile-baseline.mjs` records no commit at all.

## Approach

1. **`reconcile-baseline.mjs --anchor` records `anchored_head`** — `git rev-parse --verify -q HEAD^{commit}`
   at anchor, or `null` (unborn HEAD / git error). Additive field, `RECORD_VERSION` stays `1`, exactly the
   5.1.0 `scope_amendments` precedent (absent on an older record ⇒ read as `null`).
2. **`check-bash-reconcile.mjs` classifies `merged`** — only over paths that would otherwise be ESCAPES
   (so an authorized path is never re-labelled, and no git call is made on a clean run). A path P is
   `merged` iff ALL of these hold, each a byte/oid equality or a git exit code (P5), and any git failure
   leaves P an escape (fail closed):
   - (a) the baseline records `anchored_head` X, and current HEAD H resolves and differs from X;
   - (b) X is an ancestor of H (`git merge-base --is-ancestor`) — the change lies in commits X..H;
   - (c) the upstream ref resolves: `refs/remotes/origin/HEAD` (symbolic) → U. Absent ⇒ no classification;
   - (d) **anchored bytes = X's blob**: the baseline entry for P equals the digest of P's blob at X (or P is
     absent from both the baseline and X) — so the anchor state of P was exactly X's committed state;
   - (e) **current bytes = H's blob**: `hashFile(P)` equals the digest of P's blob at H — no uncommitted
     edit on top;
   - (f) **H's blob = U's blob**: same oid and mode — the anti-laundering condition. A commit the build makes
     itself during the window is not on upstream, so its bytes differ from U's and P stays an escape.
     Digest = SHA-256 of blob bytes, or of `symlink\0` + blob for mode 120000 (the baseline's own rule);
     only modes 100644 / 100755 / 120000 qualify.
3. **Output:** a new `merged: [path…]` array beside `exempted`; a `warnings[]` line naming the HEAD move
   (X → H, the upstream ref) and the count; and when HEAD moved but classification was unavailable, a warning
   saying why (legacy baseline, not an ancestor, no upstream ref). The verdict enum is unchanged and still
   closed; exit codes unchanged. `merged` applies to every escape kind — protect-trusted-paths denials (a
   trusted doc or canon changed on main), the control surface (`pharn/floor/**` changed on main), and
   writes-scope denials — because the condition is about where the bytes came from, not which guard denied.
4. **Contract, guide, README, CHANGELOG** describe the class and its bounds; every restatement probed (L64).

### Decision taken at plan time (orchestrator may override at GATE 1)

The brief says "record HEAD at anchor (and on amend)". This plan records it **at anchor only**. The
classification's base is necessarily the anchor — the baseline's `entries` were hashed then — so a head on an
amendment would be a field nothing reads, which P7 forbids adding. If the orchestrator wants it recorded on
amend anyway, the change is one line in `amendScope()` plus a contract row, with no verdict effect.

## Applied lessons

- L1 — the meta-docs this changes are named in `## Files`: the contract, the floor-checks guide, the README
  limits paragraph and badge, CHANGELOG, SKILLS_VERSION, and the regenerated docs.
- L17 — this is L17's failure class on the reconciler: a merge is changed-since-anchor, not written-by-the-build;
  the fix separates the two by provenance (committed upstream blobs), and keeps everything else RED.
- L32 — `refs/remotes/origin/HEAD` → `origin/main` is a mutable alias. The classification compares blob **oids**
  (identity), never names; a stale fetch only makes the classification miss (the loud RED stays), and a ref
  moved by Bash is outside the non-adversarial claim — stated in the contract.
- L34 — every new condition (a)–(f) gets a NON-VACUITY test where only that condition fails and the path stays
  an ESCAPE, plus the positive case; the suite cannot pass by classifying everything `merged`.
- L42 — HEAD and the upstream ref are read NOW, the anchor's head is fixed THEN; the contract names which part
  of the referent may move after the record (HEAD, the upstream ref) and why each read is safe in its direction.
- L48 — the change converts some loud REDs to non-RED, so it must not create a silent direction: every merged
  path is listed in `merged[]` and named in a warning; nothing is dropped unreported.
- L64 — each restatement of the new bound (README, guide, contract, CHANGELOG, file headers) is probed against
  the tests before hand-off, not just the primary sentence.
- L68 — reconcile still has no attribution: `merged` is provenance-by-content (the bytes are upstream's), not
  attribution; an uncommitted human edit of a trusted doc mid-window is still an escape, unchanged.

## Files

- `pharn/floor/reconcile-baseline.mjs` — **EDIT.** record `anchored_head` at `--anchor`; header note.
- `pharn/floor/check-bash-reconcile.mjs` — **EDIT.** `merged` classification over escapes, output field,
  warnings, header bound 6/new bound text.
- `pharn/floor/reconcile-baseline.test.mjs` — **EDIT.** pin `anchored_head` (a commit sha; `null` on unborn HEAD).
- `pharn/floor/check-bash-reconcile.test.mjs` — **EDIT.** positive merged case, the build's-own-commit
  anti-laundering case, and one non-vacuity case per condition (a)–(f).
- `pharn/pharn-contracts/reconciliation-record.md` — **EDIT.** `anchored_head` row, `merged[]` in §2, the class
  and its bounds.
- `.dev/guides/floor-checks.md` — **EDIT.** the reconcile section names the merged class.
- `README.md` — **EDIT.** the shell-writes limits paragraph names the merged class; version badge.
- `pharn/floor/stage-runtime.test.mjs` — **EDIT.** (added at build) its GIT CEILING enumeration (L29) lists every
  git spawn in a shipped floor module; the new `rev-parse` in reconcile-baseline.mjs and the two argv helpers in
  check-bash-reconcile.mjs join it.
- `CLAUDE.md` — **EDIT.** (added at build, L64 restatement sweep) the Writes-scope paragraph's "Denied ⇒ the
  `reconcile` gate fails" restatement names the merged class.
- `pharn/floor/README.md` — **EDIT.** (added at build, L64) the same restatement in the floor index.
- `CHANGELOG.md` — **EDIT.** the 6.51.0 entry.
- `SKILLS_VERSION` — **EDIT.** 6.49.2 → 6.51.0 (minor: new classification in a shipped checker; 6.50.0 is
  claimed by the parallel runtime-floor PR, which merges first — renumber by diff when main moves).

## Contracts satisfied

- `pharn/pharn-contracts/reconciliation-record.md` — extended (additive record field, additive verdict field);
  verdict enum unchanged and closed.
- `pharn/pharn-contracts/finding-shape.md` — findings still emitted only for escapes; `merged` carries paths only.

## Evals to write (P1)

No Capability is added (floor checker only), so P1's eval obligation is discharged by `node --test` cases:

- merged after an upstream merge → CLEAN, `merged: [path]` (fails on main today: ESCAPE).
- the build commits an out-of-scope path itself, then merges upstream → that path ESCAPE, upstream's path merged.
- per condition: legacy baseline without `anchored_head` (a); anchored head not an ancestor (b); no
  `origin/HEAD` (c); path dirty at anchor (d); uncommitted edit on top of a merged path (e); HEAD blob ≠
  upstream blob (f) → each an ESCAPE.
- a trusted doc / control-surface path changed on upstream and merged → merged, CLEAN.
- `--anchor` records `anchored_head` equal to `git rev-parse HEAD`.
- GATE-1 additions (orchestrator): (b) is exercised by a real REBASE — HEAD moved, X not an ancestor of H →
  no classification, a warning naming why, verdict stays ESCAPE; (d) is exercised by an UNCOMMITTED edit to P
  at anchor time that main then changes and the merge brings in → P stays an escape.

## GATE 1

Approved as written, including `anchored_head` at anchor only — a **delegated model decision by the
orchestrator, not a human approval**. Two tests added above; version moved to 6.51.0.

## Guarantee audit (P0)

- "a merged path is classified `merged`, not an escape" → floor: content-hash (SHA-256 equalities) +
  enum/regex (git object-id equality, exit codes). No model judgment.
- "a commit the build makes itself cannot be laundered" → floor **within the non-adversarial claim**: condition
  (f) holds unless the build's bytes equal upstream's. Bounded and stated: the upstream ref is a local ref Bash
  can move, and a build that pushes its own commit to the upstream branch and fetches it makes those bytes
  upstream's — both outside the non-adversarial claim the contract already states. Bytes that equal upstream's
  are upstream's content whoever wrote them; that is the classification's meaning, not a bypass.
- "everything else stays RED" → floor: every condition failure and every git failure leaves the path in
  `escapes[]`; pinned by the non-vacuity tests.
- "the detector got stronger" → **struck**; this buys precision (fewer false REDs), never strength (L42's bound).

## Trust audit (P2)

- Paths, ref names and git output are untrusted DATA: git is invoked with `execFileSync` + argv, `rev:path`
  operands and `--literal-pathspecs` so a filename is never a pathspec pattern; nothing is interpolated into a
  shell. `merged[]` holds paths only; findings stay as today.

## Open questions (HALT)

None — the one judgment call (record head on amend) is resolved above with a stated default for the GATE-1
reviewer to accept or override.
