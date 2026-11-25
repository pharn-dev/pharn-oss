# pharn command notes (0.9.0 baseline, checked against 0.16.1)

Source: the CLI's own README and `docs/commands/*` at 0.9.0, and at 0.16.1 for
what changed since; lines marked 0.20.0 come from the CLI's `main` for that
unreleased version. Where 0.10.0
changes a command (`status --json`, `update --dry-run`, `update --json`), see
[json.md](json.md); the rest below still holds, except where a line names a
later version: 0.14.0 moved PHARN's root files under `pharn/`, 0.15.0 changed
the default release channel, 0.16.0 added the `.gitignore` lines, and 0.20.0
makes `--json` imply `--dry-run` and every `update` plan.

## Command surface

| Command | Options it takes | Writes |
| ------- | ---------------- | ------ |
| `pharn list` | `--json` | never |
| `pharn status` | `--strict`, `--no-drift`, `--json` (0.10.0+) | never |
| `pharn update` | `--yes`/`-y`, `--force`, `--ref latest\|main`, `--dry-run`, `--json` (0.10.0+; before 0.20.0 only with `--dry-run`, from 0.20.0 it implies `--dry-run`), `--compact` (0.11.0+; from 0.20.0 it implies `--json`) | yes, never with `--dry-run`, `--json` or `--compact` |
| `pharn add [name]` | none | yes |
| `pharn remove [name]` | none (alias `pharn rm`, 0.13.0+) | yes |
| `pharn init` | `--ref`, `--archetype <list>`, `--yes`/`-y`, `--dry-run`, `--json` (before 0.20.0 only with `--dry-run`, from 0.20.0 it implies `--dry-run`) | yes, never with `--dry-run` |
| `pharn uninstall` | `--yes`/`-y` | yes |

A bare `pharn` with no command runs `init`. The agent never runs `init` or
`uninstall` in any form (SKILL.md, section 5).

Any other option is refused (on 0.9.0 that includes `status --json`): ``Unsupported option for `status`: "--json"`` on
stderr, usage text, exit 1.

`init`, `add`, `remove` and `update` take an advisory lock at `pharn/.lock`
(CLI 0.14.0+) or `.pharn.lock` (older CLIs); a second writer refuses with
exit 1. `list` and `status` never take it. An older CLI does not see the new
lock, so never run two CLI versions in one project at once.

## status

- Reads `pharn.config.json`; missing or pre-archetype config exits 1 with a
  hint to run `pharn init`.
- Sections: version (up to date or update available), drift, `MODELS`, `NODE`,
  `HOOKS`.
- Drift lists: differs from upstream (may be your edit or upstream moving),
  missing, unreadable (symlink or non-regular file).
- `status` compares bytes only; `update` also reads `pharn.records.json` to
  tell your edits from upstream's changes, so a file listed as differing may be
  upgraded cleanly by `update`.
- `--no-drift` skips the clone (version check only).
- `--strict` exits 1 on outdated, differing, missing, unreadable, or an
  unwired hook. `MODELS` and `NODE` notes never affect it.
- Layout: when the install is recorded at one layout (`flat` or `pharn`) and
  the fetched clone ships the other, a `LAYOUT` note prints. Before 0.20.0 it
  is advisory and drift is still listed; `pharn update` moves the install, and
  if it answers "Already up to date", `pharn update --force` moves it but
  overwrites edited files (backed up first). From 0.20.0 (unreleased) it
  replaces the `DRIFT` note, neither the file drift nor `NOT SHIPPED UPSTREAM`
  is checked, and `--strict` exits 1; a plain `pharn update` moves the install
  at any skills version, with no `--force`, unless the install is ahead of its
  source (`ahead-of-release` or `ahead-of-main`): `update` refuses that before
  it plans, so the mismatch stays. Then name the choices, `--force` (which
  downgrades) or, on the release channel, `--ref main`, and run neither
  without the person's consent. `--no-drift` cannot see a mismatch.
- It needs network (GitHub) unless `--no-drift`.

## update

- Needs Node >= 24.2.0; older exits 1 with nothing written, even with `--yes`
  or `--force`.
- Off a TTY it exits 1 before any network call unless `--yes` is passed.
  `--force` does not imply `--yes`.
- Per-file decision: missing -> write; identical to upstream -> no-op;
  identical to what pharn recorded -> write (updated); edited
  (`modified`), no record (`unrecorded`) or no records file
  (`unverifiable`) -> SKIP, or back up then overwrite with `--force`.
- Never overwrites your edits. It does delete in two cases: from 0.13.0 the
  directories of capabilities it drops (`plan.capabilities.changes`), and from
  0.14.0, on a `pharn`-layout install, root `THREAT-MODEL.md` / `LIMITS.md`
  copies still exactly as pharn wrote them. From pharn-oss SKILLS 7 it also
  moves `memory-bank/` and `pharn.spec-template.md` under `pharn/` (SKILL.md,
  Root layout migration). Never touches
  `.claude/settings.json`; it prints a `HOOKS`
  note naming hooks upstream wires that the project does not, each as JSON
  ready to paste under its event.
- Capabilities added with `pharn add` (`manual`) survive an update. Membership
  changes are printed under `CAPABILITIES` (ADDED, REMOVED, KEPT).
- Before 0.20.0, "Already up to date" at the same skills version does not
  restore files a newer CLI started installing; `status` shows them as
  missing. The fix is `update --force` (explain it first), or wait for the
  next version bump.
- From 0.20.0 (unreleased) there is no same-version shortcut: every `update`
  downloads pharn-oss (about 2.5 MB) and plans. A plain `update` restores
  missing files, adds ignore-file lines, moves a layout and reinstalls a
  removed auto-selected capability, with no `--force`. A run whose plan
  changes nothing asks nothing, writes nothing, exits 0 and ends `Up to date.`
  (or `Nothing to change.` when it keeps an edit); its dry run says
  `Nothing would be written.`.
- Installs from before pharn 0.4.0 have no records: the first update skips
  every differing file as `unverifiable`.
- `--ref latest` follows verified releases and is recorded in the config;
  `--ref main` switches back. Only use when the person asks for the channel.
  Since CLI 0.15.0 a new install follows verified releases (`latest`) by
  default, and an install that records no `ref` stays on `main`. When no
  verified release can be resolved, nothing is written and stderr starts
  `Could not resolve the latest verified pharn-dev/pharn-oss release`. The
  causes are no release published yet, `api.github.com` unreachable, or its
  unauthenticated rate limit of 60 requests an hour used up. The message names
  `pharn init --ref main` and `pharn update --ref main`; pass `--ref` only when
  the person asks.
- Backups go to `pharn/.backup/<timestamp>/` (CLI 0.14.0+) or
  `.pharn-backup/<timestamp>/` (older CLIs; 0.14.0 leaves existing ones where
  they are). Neither is ever pruned.
- CLI 0.16.0+ appends `pharn/.run/` and `pharn/.backup/` to the project's root
  `.gitignore` (a comment line, then the missing lines, append-only, in the
  file's own line endings; a line that already covers an entry is respected).
  A symlinked, non-regular or unreadable `.gitignore` is not written: the run
  names the lines to add. At the same skills version a `.gitignore` missing
  either line re-opens the "Already up to date" return (from 0.20.0 every run
  plans and adds them), so the next `update` runs once to add them. CLIs
  before 0.16.0 leave `.gitignore` to the person.
- From CLI 0.13.0 an update lists the recorded files upstream no longer ships
  (`ORPHANED`, left for the person to delete) and the surfaces pharn-oss ships
  no file for (`NOT SHIPPED`); json.md has `plan.orphans` and
  `plan.absentUpstream`.

## add and remove

- `add` refuses when the upstream `SKILLS_VERSION` or layout differs from the
  recorded one, or when the CLI is older than upstream's `MIN_CLI` (below). It
  backs up any destination file it would overwrite with different bytes.
- `remove` needs no network, deletes only that capability's directory, prunes
  its records, and never touches `CONSTITUTION.md` (`pharn/CONSTITUTION.md` on
  the `pharn` layout) or the memory bank (`pharn/memory-bank/` after the 0.14.0
  migration, `memory-bank/` before).
- A name installed as both griller and lens needs `griller:` or `lens:`.
- `add` and `remove` leave `.gitignore` as it is.

## uninstall

Run by the person in their own terminal, never by the agent. It needs no
network. It deletes only the recorded files whose hash still matches, then the
directories that leaves empty, `pharn.records.json`, and `pharn.config.json`
after copying it to `pharn/.backup/<timestamp>/`. It asks once (default No);
`--yes`/`-y` skips the question, and off a terminal it refuses without
`--yes`. It keeps edited and unrecorded files, `.claude/settings.json`,
`.claude/settings.local.json`, every `pharn/.backup/` directory and the
`.gitignore` lines, and prints the hooks still wired to a script it removed.

## MIN_CLI refusal

pharn-oss can declare the oldest CLI its content needs in a root `MIN_CLI`
file. When the installed CLI is older, `init`, `add` and `update` (its dry run
included) refuse before writing anything: exit 1, stdout empty in JSON mode,
and one line on stderr (the same wording from 0.9.0 through 0.16.1; the two
versions vary). Shown wrapped here; match on its start, `This pharn is too old
for the current github.com/pharn-dev/pharn-oss`:

```text
This pharn is too old for the current github.com/pharn-dev/pharn-oss: it requires @pharn-dev/pharn v0.14.0 or newer, and v0.13.0 is installed. Upgrade (`npm install -g @pharn-dev/pharn@latest`, or run `npx @pharn-dev/pharn@latest`), then re-run this command. Nothing was written.
```

Tell the person to upgrade the CLI first, the way they installed it (for a
project-local install, `npm i -D @pharn-dev/pharn@latest`; never run it
yourself). Then re-check the version (SKILL.md section 1) and run the update
flow again. `status` does not check `MIN_CLI`, so it cannot confirm the fix;
`npx @pharn-dev/pharn@latest <command>` runs the newest CLI without
installing it, but downloads: ask first. `--force` does
not get past `MIN_CLI`. A missing or malformed `MIN_CLI` file refuses nothing.

## list --json

One object, nothing else on stdout:

```json
{
  "mode": "archetype",
  "skillsVersion": "1.0.0",
  "archetypes": ["ssr"],
  "capabilities": [
    { "name": "a11y", "role": "griller", "source": "auto" }
  ]
}
```

`source` is `auto` or `manual`, and is omitted for installs that predate it.

## Exit codes

0 success, skips included. 1 refusal or failure. 130 interrupted.
