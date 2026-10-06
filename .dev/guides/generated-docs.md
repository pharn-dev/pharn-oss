# Generated docs — when `docs:check` is RED

Moved out of the always-loaded root `CLAUDE.md` at `6ff4dd1` (SKILLS_VERSION 6.46.0) by `claude-md-bootstrap`. The text is the moved text, unchanged except
for the `##` headings added for navigation and the leading indentation Prettier normalizes. The root `CLAUDE.md`
still holds the rules every session needs; this file adds detail and does not override them.

**Read when:** on a `docs:check` RED, before regenerating, and on an `ENUM_ERROR`. The rule itself stays in the root `CLAUDE.md` bullet "Three doc regions are GENERATED — never hand-edit them."

## Short-circuits and the one case regenerating cannot fix

- **Both `docs:*` scripts are `&&`-chained, so a first RED short-circuits the rest.** One run reports
  the first failing region only; re-run after fixing. This is deliberate — the portable alternative
  would be the repo's first `sh`-only script (`.dev/memory-bank/lessons-learned.md` L16: a remedy can
  itself be a portability trap) — and it costs little, because `npm run docs:generate` regenerates
  **all** regions, so the remedy is the same command either way.
- **The one exception where regenerating does NOT help:** an `ENUM_ERROR` (a duplicate lesson id, an
  unsafe title, unreadable canon). The generator refuses on the same invalid input, so the checker says
  so explicitly and names the canon file instead of prescribing a regenerate that cannot succeed.
