# PLAN — ci-permissions

- spec_content_hash: 69c8395365abb719cc3132ffa7a7607051b1e04ca3a3fa70ee563b86b857f18e # fix #4
- applied_lessons: [L2, L13, L18, L19, L20, L25, L26, L28, L29, L31, L35, L36]
- increment: Declare the workflow-level `permissions:` key (`contents: read`) in `.github/workflows/ci.yml` — the one workflow of four that declares none.
- layer(s): none — repo-meta CI config, outside the `pharn/` capability tree (`pharn/ARCHITECTURE.md §4`)
- constitution_refs: [P0, P5, P6, P7]

## Applied lessons

- **L2** — a claim may cite only a LIVE floor op. This increment's `## Guarantee audit` therefore refuses to call GitHub's token scoping a PHARN
  guarantee: it reduces to none of `pharn/ARCHITECTURE.md §2`'s three primitives, so it is recorded as platform-enforced repo hygiene, which is
  the framing `gitleaks.yml`'s own header already uses for a CI-layer control.
- **L13** — every artifact-writing stage formats its own artifact. This plan, and each later stage artifact under `.dev/features/ci-permissions/`,
  is prettier + markdownlint'd immediately after being written, before the stage halts.
- **L18** — the exclusion block below is a `###` **heading**, never a bold prose intro, so `set-writes-scope.cjs --from-plan` bounds the authorized
  list structurally rather than by matching wording.
- **L19** — the formatter is a Bash write and escapes fix #7 entirely, so every format command in this increment names its single target path;
  no repo-wide `npm run format` is run at any stage.
- **L20** — a discipline-only remedy has earned a floor check on its **second** occurrence. This is the **first** recorded occurrence of the
  "a new workflow forgot `permissions:`" defect, so this increment deliberately adds **no** checker; the decision is recorded below under
  `## Deliberately not built`, not silently omitted.
- **L25** — a rationale comment reaches only the file it sits in and is trusted for the defects it does **not** name. The `permissions:` key is
  therefore added **bare**, matching both read-only precedents; a "nothing here needs more" comment would read as a completed audit to the next
  contributor adding a SARIF-uploading step. The reasoning lives in this audit trail instead.
- **L26** — a patch verified against a copy outside the repo is judged under different config resolution than the repo enforces. Verification runs
  `npm run check` inside this `git worktree` at the real path, which is precisely the remedy L26 prescribes; the baseline was captured the same way
  (exit 0, 1683/1683 tests) before any edit.
- **L28** — the `## Files` bullet is a single unwrapped line whose description avoids the setter's exclusion-cue vocabulary, so an authorized item's
  own text cannot truncate the parsed list.
- **L29** — a remedy quantified over a set owes the enumeration as its deliverable. The permission audit below therefore enumerates **all twelve**
  live `ci.yml` steps, discovered by reading the file this run, rather than reasoning about the interesting one.
- **L31** — a deliberate copy-set creates an obligation nothing ranges over, and the second copy is where it is dropped. That is the exact diagnosis
  here: four workflow files each owe a `permissions:` declaration, three carry one, and no enumeration anywhere ranges over the set.
- **L35** — before reaching for a sync check, ask whether the second copy must exist. Here it must: `permissions:` is per-workflow GitHub
  configuration with no repo-level slot to drain authority into, so L35's "retire, don't bind" move is unavailable and L31's enumeration remains the
  only remedy shape — which is why the L20 trigger, not the remedy's availability, is what defers it.
- **L36** — a per-member presence set is not a closed set. The audit below is presence over the twelve steps that exist today; it says nothing about
  a step added later, and that bound is stated in the guarantee audit rather than left for a reader to infer.

## Files

- `.github/workflows/ci.yml` — insert the workflow-level `permissions:` key, value `contents: read`, between the `on:` block and `jobs:` — layer n/a (repo-meta)

### Deliberately NOT in scope

- `CHANGELOG.md` and `SKILLS_VERSION` — CI config is repo-meta, which `CLAUDE.md`'s SKILLS_VERSION discipline exempts from both the bump and the
  entry; a concurrent branch also owns both files.
- `.github/workflows/{codeql,floor,gitleaks}.yml` — all three already declare `permissions:`; re-deriving them is a separate question with no
  triggering failure (P7).
- Any `ci.yml` **step** — no step is added, removed, renamed or reordered, and the job stays named `check`, because branch protection requires the
  status checks `check`, `floor`, `gitleaks`, `Analyze (javascript-typescript)` and `Socket Security: Project Report` by name.
- Any new floor checker or test asserting that every workflow declares `permissions:` — see `## Deliberately not built`.

## Discovery (P6 — read live this run, never asserted from memory)

- All four workflow files read in full. `ci.yml` declares **no** `permissions:` key at workflow level **or** job level; `grep -rn permissions .github/`
  returns exactly three hits — `floor.yml:12` and `gitleaks.yml:18` (workflow level, column 0) and `codeql.yml:16` (job level, indented four spaces).
- **House style, read from the two read-only precedents.** `floor.yml:11-15` and `gitleaks.yml:17-21` are **byte-identical** in shape (verified with
  `sed | cat -e`): a blank line, then `permissions:` at column 0, then `contents: read` indented by exactly two spaces, then a blank line, then
  `jobs:` — placed after the `on:` block, at workflow level, with **no** inline comment on the key. Note the portability detail worth recording,
  since L16/L22 are about exactly this class: `cat -A` is GNU-only and BSD `cat` rejects it, so the byte check used `cat -e`.
  `codeql.yml` is the deliberate exception and scopes at **job** level because that job needs `security-events: write` (SARIF upload) plus
  `actions: read`. A workflow needing only reads uses the workflow-level bare key; this increment follows that, not the CodeQL shape.
- `ci.yml` is confirmed the only workflow running `npm ci` (`grep -ln "npm ci" .github/workflows/*.yml` → one file), as the review states.
- No `.npmrc` exists; every `resolved` host in `package-lock.json` is `registry.npmjs.org`; `package.json` declares zero runtime `dependencies`. So
  `npm ci` reaches no GitHub Packages registry and consumes no token.
- `ci.yml` contains no reference to `secrets.`, `github.token`, `GITHUB_TOKEN`, `GH_TOKEN` or the `gh` CLI.
- **Three test files parse `ci.yml`, and none is disturbed by this edit.** `.dev/floor/check-version-badge.test.mjs:294-301` and
  `.dev/floor/lessons-index-core.test.mjs:218-225` each match a step with `/^ {6}- name: …\n(?: {8}…)*? {8}run: npm run <gate>$/m` plus its `if:`
  line; `.dev/floor/check-contributing-gates.test.mjs:257-261` additionally asserts `ci.yml` contains no `run: npm run check` aggregate. All three
  are anchored inside the `jobs:` block at six- and eight-space indents; a column-0 `permissions:` key adds no `run:` line and shifts no indentation.
- `.dev/floor/specified-primitives.json` names no workflow file, so `check:markers` has nothing to say about this change.
- `.github/workflows/**` is **not** in `.prettierignore`, and `npx prettier --check .github/workflows/ci.yml` reports the file compliant today, so
  the edit must land prettier-clean.
- Baseline captured before any edit, in this worktree, at the real path (L26): `npm run check` → exit 0, `1683/1683` tests pass.

## Per-step permission audit (P5, L29 — all twelve live steps enumerated)

The question each row answers is "does this step consume `GITHUB_TOKEN` for anything beyond reading repository contents?" Steps 3–12 are the
`npm run …` / `node …` gates: each is a local process over the checked-out tree, spawns no network call to GitHub, and reads no token.

| #   | Step (line)                          | What it does                                         | Needs more than `contents: read`?                    |
| --- | ------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------- |
| 1   | `actions/checkout` (12)              | Clones the repo; `persist-credentials: false`        | No — `contents: read` is exactly what checkout needs |
| 2   | `actions/setup-node` (15)            | Installs Node 24; `cache: npm` via the cache service | No — see the bound below                             |
| 3   | `Install` (19)                       | `npm ci` from `registry.npmjs.org`                   | No — no `.npmrc`, no GitHub Packages, no token       |
| 4   | `Format check` (24)                  | `npm run format:check` (prettier, local FS)          | No                                                   |
| 5   | `Markdown lint` (27)                 | `npm run lint:md` (markdownlint-cli2, local FS)      | No                                                   |
| 6   | `Lint` (30)                          | `npm run lint` (eslint, local FS)                    | No                                                   |
| 7   | `Validate floor` (33)                | `node pharn/floor/validate.mjs .` (stdlib, local FS) | No                                                   |
| 8   | `Docs drift check` (36)              | `npm run docs:check` (two stdlib checkers)           | No                                                   |
| 9   | `Specified-marker check` (39)        | `npm run check:markers` (stdlib checker)             | No                                                   |
| 10  | `Version badge check` (42)           | `npm run check:badge` (stdlib checker)               | No                                                   |
| 11  | `CONTRIBUTING gate-chain check` (45) | `npm run check:contributing` (stdlib checker)        | No                                                   |
| 12  | `Test` (48)                          | `npm test` — `node --test` over the three suites     | No                                                   |

**Nothing in the job does any of the things that would demand a wider scope.** Read live this run: no step uploads SARIF (no
`github/codeql-action/upload-sarif`), comments on a PR, writes a check run, publishes a release, pushes a commit or tag, uploads or downloads an
artifact, or invokes the `gh` CLI. The `npm test` suites spawn only `node_modules/.bin/prettier` and `node_modules/.bin/markdownlint-cli2` against
temporary fixture directories; grepping the three suites for real network or `git` invocations returns only fixture **strings** the scanners analyse
as text, never an executed call.

**The bound on rows 1–2, stated rather than glossed (P0/P6).** These are third-party actions whose internal token use cannot be read from this repo.
The in-repo evidence that they work under `contents: read` is `floor.yml`, which runs the **same pinned SHA** of both `actions/checkout` and
`actions/setup-node` under a workflow-level `contents: read` today. The one option with no in-repo precedent is `cache: npm` (row 2), which `floor.yml`
does not use: the Actions cache is served by the cache service against `ACTIONS_RUNTIME_TOKEN`, not `GITHUB_TOKEN`, and is therefore not governed by
the `permissions:` key at all — but that is documented platform behaviour, not something this repo can verify, and it is the single row of twelve
resting on it. If the cache silently stops restoring after this change, that row is the place to look first.

## Contracts satisfied

- None. `.github/workflows/**` is repo-meta: it declares no `role:`, sits outside `pharn/`, and is not scanned by `pharn/floor/validate.mjs`. No
  contract in `pharn/pharn-contracts/` governs it (P4 — cited, not restated).

## Evals to write (P1)

- None, and P1 is not waived by omission. P1 binds a **Capability** — a `.md` file whose frontmatter carries a `role:` — and this increment adds no
  capability, no `rule_id` and no `enforces` entry. A YAML workflow key has no eval surface: nothing here is LLM-invoked, so there is nothing an
  `evals/cases/*` fixture could exercise.

## Guarantee audit (P0)

- **"`ci.yml` declares `permissions: contents: read`"** → **advisory** within PHARN's vocabulary. It is a byte fact in a file no PHARN floor checker
  reads: `validate.mjs` never walks `.github/`, and `check:markers` / `check:badge` / `check:contributing` each read a different named file. It is
  verifiable by opening the file; it reduces to none of `pharn/ARCHITECTURE.md §2`'s three primitives.
- **"`GITHUB_TOKEN` is restricted to read-only repository contents in `ci.yml` runs"** → **platform-enforced, and NOT a PHARN floor guarantee.**
  GitHub Actions applies the key deterministically at the harness layer, which is real enforcement — but it is the same boundary `LIMITS.md §1d`
  draws around harness-layer signals and the one `gitleaks.yml`'s own header already draws around itself: a CI-layer control is **repo hygiene**, not
  part of PHARN's floor and not a P0 guarantee about the PHARN being built. Nothing in this repo can observe that GitHub honoured it.
- **"every step in `ci.yml` needs no more than `contents: read`"** → **advisory.** It is a model-produced audit over the twelve steps read live this
  run. Ten of twelve are local processes and are settled by reading the file; two are third-party actions, corroborated by `floor.yml` running the
  same pinned SHAs under `contents: read`, with the `cache: npm` option resting on documented platform behaviour (named above).
- **"a step added later is covered"** → **struck (L36).** The audit is a **presence** check over today's twelve steps, not a **closure** assertion
  over the set. A thirteenth step that uploads SARIF would need `security-events: write` and would fail under this key — loudly, which is the
  fail-closed direction, but nothing warns its author in advance.
- **"the edit cannot break branch protection"** → **advisory.** The workflow-level key changes no job name, and the job stays `check`; but that the
  five required status checks still match is a GitHub-side fact this repo cannot read.
- **No new floor primitive is introduced, and none is claimed.**

## Trust audit (P2)

- **Input:** the external adversarial review's finding `ci-permissions-missing`. It is another model's output — `THREAT-MODEL.md §2` surface #7 — so
  it is `trust: untrusted` free text.
- **Propagation:** the finding's prose is quoted as DATA in this plan and steers nothing. Every load-bearing statement above was **re-derived** from
  reading the four live workflow files this run (P6): the absence of the key, the two read-only precedents' byte shape, the `npm ci` uniqueness
  claim, and the twelve-step enumeration. Had the review been wrong on any of them, the discovery section would contradict it — as it does on one
  point, recorded below.
- **Correction to the review, surfaced not suppressed.** The review's evidence cites `codeql.yml:16`, `floor.yml:12`, `gitleaks.yml:18` as workflows
  that "all do" declare `permissions:`. That is true but flattens a real distinction: `codeql.yml`'s is **job-level** and grants
  `security-events: write` + `actions: read`, so it is not a precedent for the value this increment adds. The minimal fix the review proposes
  (`permissions:` / `contents: read` at the top of `ci.yml`) is nonetheless what the two genuine read-only precedents do, and is what this plan
  adopts.
- No untrusted text reaches any enum-gated or floor-verifiable field; nothing in this increment is executed from the review's prose.

## Determinism audit (P5)

- The single branch — "is `contents: read` sufficient?" — is decided by an enumeration over the live file (a membership test over twelve steps),
  never by classifying the workflow's purpose.
- Where the enumeration cannot be settled from this repo (the two third-party actions' internal token use), the chain does **not** end in a guess:
  the bound is stated in the audit and carried to the human at GATE 1 as an open question below.
- The `permissions:` block's shape is copied byte-for-byte from the two existing read-only workflows rather than composed, so no wording choice is
  left to a model.

## Deliberately not built (P7, L20, L31, L35)

A test asserting that **every** file under `.github/workflows/` declares a `permissions:` key would range over exactly the obligation set L31 names,
and L35's prior question resolves in favour of building one eventually: the four copies genuinely must exist, since `permissions:` is per-workflow
GitHub configuration with no repo-level slot whose authority could be drained instead. So the remedy shape is available and correct.

It is **not** built here, for two reasons that are recorded rather than assumed. First, **L20's trigger is not met**: this is the first recorded
occurrence of the defect, and L20 sets the second occurrence as the bar for converting a discipline-only remedy into a floor check. Manufacturing a
trigger would be the P0 disease. Second, this increment is scoped to a single file by explicit human direction, and adding a checker plus its test
plus its `npm run check` and `ci.yml` wiring — each of which the `check-version-badge` and `check-contributing-gates` precedents show must itself be
pinned by a test — is a larger increment than the smallest coherent one (P7, and `/pharn-dev-plan` Step 2).

**Reopens when** a second workflow lands or is amended without a `permissions:` key. Named residual: `workflow-permissions-enumeration`.

## Open questions (HALT) — ALL THREE RESOLVED by the human at GATE 1

Recorded here rather than left outside the document, so the artifact does not read as unresolved to a later reader. The answers are the human's, given
at the GATE-1 approval halt; the model did not self-approve any of them.

1. **Comment or bare key? → RESOLVED: bare key, no comment.** This plan adds the key **bare**, byte-matching `floor.yml`/`gitleaks.yml`, on L25's
   reasoning that a rationale comment would read as a completed audit to the next contributor adding a SARIF-uploading step. The alternative — a one-
   or two-line comment naming the least-privilege intent, closer to `floor.yml`'s file-header prose — was put to the human and declined; the reasoning
   lives in this audit trail instead.
2. **Workflow level or job level? → RESOLVED: workflow level.** This plan uses **workflow** level, matching both read-only precedents, so a job added
   later inherits `contents: read` rather than the org default and a job needing more must declare its own and fail loudly otherwise. Job level would
   have confined the grant to `check`; the human chose the inheriting form.
3. **The `cache: npm` residual. → RESOLVED: the bound is ACCEPTED and stays stated.** Row 2 of the audit is the one claim resting on documented
   platform behaviour rather than an in-repo read: no workflow here runs `cache: npm` under a declared `permissions:` key today. The human accepted
   that bound explicitly, including the instruction to keep the failure signature written down — **if cache restore breaks after this change, row 2 is
   the row to look at first.** An honest, named bound was judged the right outcome over dropping `cache: npm` from scope.
