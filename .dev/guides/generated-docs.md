# Generated docs — when `docs:check` is RED

Moved out of the always-loaded root `CLAUDE.md` at `6ff4dd1` (SKILLS_VERSION 6.46.0) by `claude-md-bootstrap`. The text began as the moved text, plus
the `##` headings added for navigation and the leading indentation Prettier normalizes; later increments edit it. The root `CLAUDE.md`
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

## The install manifest (`pharn-install.json`, 7.21.0)

`npm run docs:generate` also writes the root `pharn-install.json`, the install manifest pharn-cli reads
([`docs/install-manifest.md`](../../docs/install-manifest.md); the rules are in `.dev/floor/install-manifest-core.mjs`),
and `docs:check` holds it byte-equal through `.dev/floor/check-install-manifest.mjs`. It is not a doc region, but it
regenerates the same way, and it changes more often: any change to an installed file (a capability, a contract, a
product command, hook or agent, a product-floor file, a trusted doc, `LICENSE`, `pharn/features/README.md`), to a
capability's `applies`, to the root `models` block, or to `SKILLS_VERSION` (every bump) needs a regeneration.

Its `ENUM_ERROR` is a refusal by the core, not drift: a symlinked or otherwise non-regular installable path, a surface
or capability role contributing nothing, a malformed `SKILLS_VERSION` or `applies`, a duplicate destination, or a
griller or lens outside its subtree. Regenerating refuses the same way, so the message names what to fix.
