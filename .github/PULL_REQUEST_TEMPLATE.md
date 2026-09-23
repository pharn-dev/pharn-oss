<!--
Thanks for contributing to PHARN! Please read CONTRIBUTING.md and CLAUDE.md first.
Keep one logical change per PR; split mechanical reformat from real edits.
-->

## What this changes

A short description of the change and the problem it solves.

Closes #<!-- issue number -->

## Type of change

- [ ] `feat` — new capability (skill / lens / validator / verifier / griller / auditor), command, or rule
- [ ] `fix` — bug fix
- [ ] `docs` — docs-only change
- [ ] `chore` / `refactor` — tooling or internal restructure, no behavior change

## Checklist

- [ ] I read the four trusted docs (`pharn/CONSTITUTION.md` → `pharn/ARCHITECTURE.md` → `THREAT-MODEL.md` → `LIMITS.md`) and did **not** edit them — they are human-only and hook-protected.
- [ ] No constitutional principle (P0–P7) is violated.
- [ ] If this adds a Capability: it has a `role:` and ships evals (`evals/cases/` + `evals/expected/`), and every `enforces` rule_id is produced by ≥1 eval case (P1).
- [ ] Findings cite a file-qualified `rule_id`; no guarantee is claimed without a floor reduction, otherwise it is labeled `advisory` (P0).
- [ ] CHANGELOG.md has at least one new entry (dated when it sits under `[Unreleased]`); a bump has its own `## [X.Y.Z] - YYYY-MM-DD` section
- [ ] `SKILLS_VERSION` bumped if the released surface changed (no check enforces this — it is on you and the reviewer).

## Quality gates

- [ ] `npm run check` passes locally (every gate `package.json`'s `scripts.check` chains — the authoritative list).
- [ ] `node pharn/floor/validate.mjs .` is GREEN.

## Notes for the reviewer

Anything the reviewer should look at first — the reviewer reads eval cases before the capability body.
