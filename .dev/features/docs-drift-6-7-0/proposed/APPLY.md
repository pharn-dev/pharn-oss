# APPLY — `pharn/ARCHITECTURE.md` §5 gains `RUN-REPORT.md`

**This half is structurally human-only.** `pharn/ARCHITECTURE.md` is one of the four trusted docs and
`.claude/hooks/protect-trusted-paths.cjs` denies the agent's write tools on it. Probed live while
staging this patch: an `Edit` payload naming `pharn/ARCHITECTURE.md` → **exit 2, denied**; the control,
an `Edit` naming `README.md` → **exit 0, allowed**. So the patch is staged rather than applied, and the
three routes past the hook were each refused rather than taken (a Bash write — `CLAUDE.md` forbids
routing an in-repo write through Bash to dodge the guard; unwiring the hook in `settings.json` — itself
protected; `PHARN_PROTECTED` — it only extends the set).

## What it changes and why

§5's durable-files sentence names `findings.json`, `ship-record.json` and `cost.json`, and omits
`RUN-REPORT.md`. It earns its place by the **same criterion that sentence already uses** — committed on
a green `/pharn-loop` stop, left in the working tree otherwise. Dereferenced rather than assumed
(`lessons-learned` **L50**): `.claude/commands/pharn-loop.md:492` stages
`["SPEC.md", …, "LOOP.md", "cost.json", "RUN-REPORT.md"]`, so the artifact is committed on green.

**The precedent is this repo's own, applied once and skipped the next release.** `SKILLS_VERSION` 6.5.2
patched this exact sentence to add `cost.json`
(`.dev/features/loop-cost-ledger/architecture-patch/`). 6.6.0 shipped `RUN-REPORT.md` and did not, and
6.7.0 did not either — its plan scoped `README.md` to the GENERATED region only, so the meta-doc sweep
**L1** prescribes never ran. Nothing detected it: the trusted docs are `.prettierignore`d and
markdownlint-excluded, `validate.mjs` does not walk root docs, and all ten `npm run check` gates were
GREEN with the sentence stale (**L43** — a consistency check over mirrored copies certifies their
agreement, never the fact).

## Apply steps — all four, in this order

The enumeration is the deliverable (**L29**): steps 2–4 are not optional tidying, they are what keeps
`check:badge` and `check:changelog` GREEN after step 1.

1. **Apply the patch.** Verified with `git apply --check` at the real path before staging:

   ```bash
   git apply .dev/features/docs-drift-6-7-0/proposed/architecture.patch
   ```

2. **Bump `SKILLS_VERSION` `6.7.0` → `6.7.1`.** A trusted doc is product surface, and this is a
   correction to bytes that already shipped, so `CLAUDE.md`'s bump-size rule makes it **patch**.

   ```bash
   printf '6.7.1\n' > SKILLS_VERSION
   ```

3. **Update the README shields badge to `6.7.1`.** `check:badge` string-compares the badge to
   `SKILLS_VERSION`; skipping this REDs `npm run check`. The badge is located by its shields URL
   pattern `img.shields.io/badge/pharn-<x>-`.

4. **Record the bump in `CHANGELOG.md`.** `check:changelog` requires the live `SKILLS_VERSION` to appear
   at a version-token boundary. A ready-to-paste bullet, to join the existing `### Fixed` group at its
   top:

   > - **`pharn/ARCHITECTURE.md` §5 now names `RUN-REPORT.md` among the durable per-feature artifacts**
   >   (`SKILLS_VERSION` 6.7.0 → **6.7.1**, patch: a correction to bytes that already shipped)
   >   ([`pharn/ARCHITECTURE.md`](./pharn/ARCHITECTURE.md) §5,
   >   [`.dev/features/docs-drift-6-7-0/`](./.dev/features/docs-drift-6-7-0/)) — the sentence named
   >   `findings.json`, `ship-record.json` and `cost.json` while `RUN-REPORT.md`, shipped in 6.6.0, meets
   >   the same criterion that sentence uses and is staged for the green-stop commit at
   >   `.claude/commands/pharn-loop.md:492`. 6.5.2 had patched this exact sentence for `cost.json`; the
   >   next release did not repeat it, because its plan scoped `README.md` to the generated region only
   >   and the [[L1]] meta-doc sweep never ran. Applied by the maintainer outside the agent loop, the
   >   doc being hook-denied to the agent.

5. **Verify.** `npm run check` — expect all ten gates GREEN.

## One consequence, stated rather than discovered

`spec_content_hash` moves `aada03c9f7165f944aef66db8ee9eb9df809c0fad2d5d67c268ac2d620566b3d` →
`31450bf51abb80ee68b95a67b4b9728284efeace82ae5ca78be1f67b21b72134` (computed against the patched file
while staging). **That is fix #4 behaving correctly**, not a breakage: every committed PLAN pinning the
old value has already been built, and a plan written-but-unbuilt would now correctly refuse as drifted.

## What this patch does NOT do

It adds no checker. **L43**'s named detector — bind `SKILLS_VERSION` to the product-surface paths
changed since it last moved — stays deferred with its two recorded design problems (the bump-triggering
set becomes a maintained enumeration; a bump landing in a sibling commit of the same PR). Naming the
missing check does not build it, and this file must not be read as having closed anything.
