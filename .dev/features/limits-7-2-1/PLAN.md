# PLAN — limits-7-2-1

- spec_content_hash: d5a974303fd0b9568945c60423ae5a89c57d7b65f5baa03657e317fbe64f33a5
- applied_lessons: [L68]
- increment: Ship the two human-only `pharn/LIMITS.md` edits proposed by the 7.2.0 batch: §6, `pharn/.run/` is outside
  the reconciled set (#408, `.dev/features/reconcile-state-root/HUMAN-PATCH.md`); §8, the wait's cap fired once
  and is no longer listed as not measured (#410, `.dev/features/stage-wait-capped/REVIEW.md`). The maintainer applied
  them with a patch script, and they are committed in `2b1dc3c2`. This increment mirrors the §8 sentence in
  `docs/limitations.md` and bumps `SKILLS_VERSION` to 7.2.1 (patch: a correction to shipped bytes), moving PR #413's
  `[Unreleased]` entry into the new section.
- layer(s): version files, one public doc.
- constitution_refs: [P0, P7]
- approval: NOT a `/pharn-dev-plan` output. The maintainer asked for the LIMITS.md text to land in PR #413.

## Files

- `.dev/features/limits-7-2-1/PLAN.md`
- `docs/limitations.md`
- `SKILLS_VERSION`
- `README.md`
- `CHANGELOG.md`

## Applied lessons

- L68: the trusted-doc edit was committed on its own (`2b1dc3c2`) BEFORE this increment's reconcile anchor, so the
  always-reconciled control surface compares against a committed blob, not an uncommitted maintainer edit.
