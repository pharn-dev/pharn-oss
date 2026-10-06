# Versioning — the installer, MIN_CLI and CHANGELOG cites

Moved out of the always-loaded root `CLAUDE.md` at `6ff4dd1` (SKILLS_VERSION 6.46.0) by `claude-md-bootstrap`. The text is the moved text, unchanged except
for the `##` headings added for navigation and the leading indentation Prettier normalizes. The root `CLAUDE.md`
still holds the rules every session needs; this file adds detail and does not override them.

**Read when:** before editing `SKILLS_VERSION` or `MIN_CLI`, relocating an installed path, or changing a contract or frontmatter shape that existing installs read. The bump rules stay in the root `CLAUDE.md` ("SKILLS_VERSION discipline"); the CHANGELOG rules are owned by `CONTRIBUTING.md` ("CHANGELOG entries").

## The installer, and what SKILLS_VERSION versions

The installer is **real, published, and NOT in this tree** — `npx @pharn-dev/pharn@latest init`, whose
source lives in the separate `pharn-cli` repo. Do not read the absence of installer code here as
evidence it does not exist. It fetches this repository, records the exact installed commit in the
user's `pharn.config.json`, and its `pharn status` / `pharn update` compare that install against this
file. **Bounded, and stated:** the versioning UNIT is the product surface, which is not the same set as
"files an install contains" — the installer copies only the capabilities selected for the project, never
the whole `pharn/` capability tree. **All four trusted docs DO land**, and all four bump. Since
`@pharn-dev/pharn` 0.4.0 (pharn-cli `7c54820`) the installer copies `THREAT-MODEL.md` and `LIMITS.md` at
the root beside the two under `pharn/`, and `MIN_CLI` (0.5.0) makes every CLI that honors it refuse
anything older. The gate cannot reach a pre-0.4.0 CLI, because `minCliGate` itself first shipped in
0.4.0. Such a CLI omits the two root docs, and it is already broken on this tree by the 5.0.0
relocation.

## `MIN_CLI`

**`MIN_CLI` (repo root) is the OTHER version file, and it is not a second `SKILLS_VERSION`.** One bare
SemVer line + trailing newline, nothing else. It declares the minimum `@pharn-dev/pharn` version that can
install this tree, and the CLI's `minCliGate()` refuses a **strictly older** CLI with an actionable
message instead of letting it half-install. **Bump it only when an older CLI would install a BROKEN
tree** — a relocation of an installed path, a frontmatter/contract change that invalidates existing
installs — never merely because `SKILLS_VERSION` moved; most releases leave it untouched. It went in at
`0.5.0` with the 5.0.0 `features/` → `pharn/features/` relocation, because a pre-0.5.0 CLI looks for the
boundary contract at the old root, finds nothing, and — both of its readers being existence-guarded —
installs it **silently, with no error and no warning**. It did **not** move for 6.27.0's stage-model routing,
although `models.stages` became a run-time input then: a pre-0.7.0 CLI writes a block (`opus-4-8`/`sonnet-5`,
a top-level `default`) that `check-model-config.mjs` REDs, so every routed stage of such an install runs inline
as `inline:config-red` — loudly, with `pharn update` from a CLI ≥ 0.7.0 (which migrates the block) named as the
remedy — and no product command gates on that checker. That is a degraded install, not a BROKEN one, so the bar
above is not met (GATE-2 review A2, which reversed a 0.7.0 bump made at GATE 1).
**FAIL-OPEN IN ONE DIRECTION ONLY, and that is the thing to know (P0):** absent, unreadable, malformed
and incomparable all mean _"no constraint"_, so a typo cannot brick the fleet — it **silently disables
the gate** instead. Nothing in this repo checks the file: no floor primitive reads it, so its correctness
is care, not a guarantee. The named residual is `min-cli-format-check`, deliberately unbuilt — P7's bar
is a real failure and there has not been a first one. What it CANNOT do is make an old CLI understand a
new layout; it converts a silent half-install into a clean refusal, which is the whole benefit.

## Cite the CHANGELOG by version section

- **Cite the CHANGELOG by version section, never by line number:** `CHANGELOG [6.3.0]`, not
  `CHANGELOG.md:1817`. Every entry added above a line moves it, so a line cite goes stale on the next PR.
  `pharn/floor/gate-run-core.mjs:15` was the recorded instance; it was deferred until an increment that
  bumps anyway, and 6.13.0 fixed it.
