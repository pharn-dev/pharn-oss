# VERIFY — readme-writes-scope-default

- verdict: **`PASS`** (see `verify-report.json`) — every named gate exited 0
- verifiers run: **none** (zero `role: verifier` capabilities exist — P7)

## Floor layer (owns the verdict)

| gate                         | exit                        |
| ---------------------------- | --------------------------- |
| `format:check`               | 0                           |
| `lint`                       | 0                           |
| `lint:md`                    | 0                           |
| `docs:check`                 | 0                           |
| `check:markers`              | 0                           |
| `check:badge`                | 0                           |
| `check:changelog`            | 0                           |
| `check:contributing`         | 0                           |
| `test` (1931/1931)           | 0                           |
| `pharn/floor/validate.mjs .` | 0 (GREEN — 36 capabilities) |

Two gates are load-bearing for this increment specifically:

- **`check:badge`** — `VERSION-BADGE: GREEN — README.md badge "3.2.1" matches SKILLS_VERSION "3.2.1"`.
- **`check:changelog`** — `SKILLS-VERSION-RECORDED: GREEN — CHANGELOG.md records SKILLS_VERSION "3.2.1"`.

## The grill's finding 3, resolved by EXECUTION rather than by reasoning

The plan's `## Files` declared no `docs/**` path while `CLAUDE.md` requires regenerating the capability
catalog after changing "a capability, contract, command, hook, or floor checker" — and this increment edits
a command. `npm run docs:check` is **GREEN** at head, so the three generated regions
(`docs/capabilities/**`, the README `CURRENT-STATE` block, `docs/lessons-index.md`) did not drift: the
catalog renders command **frontmatter**, and this change touched only body prose. The absent declaration
was therefore correct (**L7** — declare what is written, nothing aspirational), and no `docs:generate` run
was needed.

**Bound (P0):** `PASS` means EXACTLY "the named gates passed" — never that the two corrected sentences are
true. Nothing in this chain reads either file's prose. Their evidence is the recorded probe, not a gate.
