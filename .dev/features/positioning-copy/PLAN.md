# PLAN — positioning copy: "get features shipped right", Git trail second

- spec_content_hash: 75088a82d113bc52cdd3d5fb2e44533e81cba5f520877f5eaa441ced45fb0fd6 # fix #4
- applied_lessons: [L1, L50]
- increment: Rewrite user-facing positioning copy in the root README and package.json (description, keywords) away from "audit-grade" toward "get features shipped right with Claude Code, with every step kept in Git". Copy only.
- layer(s): repo-meta (README, package.json, CHANGELOG) — no product-surface bytes, so no SKILLS_VERSION bump
- constitution_refs: [P0, P6, P7]
- stage model: plan — written in the main session; effort not routed

## Applied lessons

- **L1** — the meta-docs a copy change invalidates are enumerated by referent: README hero, README prose that restates the hero, `package.json` description and keywords, and the CHANGELOG entry. `docs/capabilities/**` and the README `## Current state` region are generated and are not edited.
- **L50** — the sweep is by referent ("PHARN is positioned as audit-grade"), not by one spelling: `audit-grade`, `auditable`, `audit`, `paper trail`, `engineering record` were all searched. Hits that name a real mechanism (AC-test evidence, the `auditor` role enum, the `pharn-audits` module) stay; hits outside scope are listed as flagged, not edited.

## Trigger (P7)

The maintainer's positioning decision: "audit-grade" framing is removed from user-facing copy; the primary promise is shipping features right with Claude Code, the secondary one is that spec, plan and checks stay in Git.

## Discovery (P6)

Searched with `rg -in "audit|attest|compliance|evidence|reviewable"` and the referent spellings above, skipping `node_modules`, `CHANGELOG.md` and `.claude/worktrees`. No `llms.txt` exists. `docs/capabilities/**` has no hits. No positioning copy lives in `.claude/commands/` or skills.

Flagged, NOT edited: `pharn/ARCHITECTURE.md` (trusted, human-only), `pharn/features/README.md:23` (product surface, would bump), `CLAUDE.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`.

## Files

- `.dev/features/positioning-copy/PLAN.md` — this plan — layer dev artifact
- `README.md` — EDIT. Hero tagline and intro, "What PHARN is" lead-in, "Why it exists" close, one "auditable" in Current limitations — layer repo-meta
- `package.json` — EDIT. `description` and the `audit` keyword only — layer repo-meta
- `CHANGELOG.md` — EDIT. One new `[Unreleased]` entry — layer repo-meta
