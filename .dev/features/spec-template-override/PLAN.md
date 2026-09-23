# PLAN — spec-template-override

- spec_content_hash: edc3d07df3ef76f983fe3763671eb66aa37c242f46f0e4c0fbca30ce091a5d2c
- applied_lessons: [L15, L17, L19, L22, L29, L33, L34, L35, L36, L37, L41, L45, L50, L52, L54, L55, L56]
- increment: Let a project replace PHARN's default SPEC template with its own file at ONE fixed, hook-protected path (`pharn.spec-template.md` at the project root), resolved deterministically (project template if present, else `pharn-default`), validated before it can be pinned, and filled by `/pharn-spec` (and so by `/pharn-loop`'s `--model-approve` run) through a new `check-spec.mjs --resolve-template-ref` mode.
- layer(s): pharn-contracts (the `spec-template` contract + the default template), the product floor (`spec-template-core.mjs`, `check-spec.mjs`), the product `.claude/` surface (`pharn-spec.md`; `protect-trusted-paths.cjs` as a HUMAN-APPLIED patch), repo meta (README, CLAUDE.md, CHANGELOG, SKILLS_VERSION).
- constitution_refs: [P0, P2, P3, P4, P5, P6, P7]

## Correcting the record: the brief against the live repo (P6)

Measured this run on branch `feat/spec-template-override` off `main` = `d96ef03` (`SKILLS_VERSION` 6.13.0).

1. **"Existing `check-spec` tests pass unchanged" cannot hold for two of them.** Both are consequences of
   edits the brief itself asks for, not of a design choice here:
   - `fillTemplate()` (`pharn/floor/check-spec.test.mjs:552-558`) replaces the literal placeholder
     `<output of check-spec.mjs --template-ref pharn-default>`. The brief's id-agnostic template edit
     changes that placeholder, so the helper's `.replace` would no-op and its catch-all
     `/<[^>\n]+>/g → "filled"` would write `spec_template: filled` — a rule-7 RED in every shipped-template
     probe. The helper's placeholder string is updated; nothing it asserts changes.
   - `★ WIRING` (`check-spec.test.mjs:993-1006`) pins exactly one `--template-ref pharn-default` line in
     `pharn-spec.md` and executes it. The brief replaces that line with `--resolve-template-ref`, so the
     test is re-pointed at the new line, keeping its shape: exactly one pinned line, executed from the
     repo root, plus a negative control.

   Every other existing test in `check-spec.test.mjs`, and every hook test, stays byte-unchanged.

2. **The shipped contract makes a false claim about the default template, and so does `/pharn-spec`.**
   `pharn/pharn-contracts/spec-template.md:161-163` ("In an install the template sits where the
   fail-closed write guard's default lets an agent write") and `.claude/commands/pharn-spec.md:291-293`
   ("which the fail-closed write guard's default leaves writable") are **false** in an install. Probed
   this run (L37: execute the guard, do not read it) in a scratch install (`pharn.config.json` with a
   `skillsVersion`, the two real hooks): a Write to `pharn/pharn-contracts/templates/spec-template.md`
   with no scope → `enforce-writes-scope.cjs` **exit 2**. The install default is `pharn/features/**` only
   (`.claude/hooks/enforce-writes-scope.cjs:223-224`, since #188). The real weakness is different: with
   a scope that names it → **exit 0**, and `protect-trusted-paths.cjs` → **exit 0**. So any PLAN whose
   `## Files` names the shipped template can write it. Both sentences are corrected in this increment
   because both files are edited anyway.
3. **Line cites in the brief, checked.** `spec-template-core.mjs:67` (`TEMPLATES`) ✓;
   `pharn-spec.md:135-142` (Step 3 names `pharn-default`) ✓ and `:152` (follow each guidance comment) ✓;
   `protect-trusted-paths.cjs:331` (`DEFAULT_PROTECTED`) ✓; `check-spec.mjs:373-375` (the missing-id
   usage error) ✓; `pharn-loop.md:239` (invokes `/pharn-spec --model-approve`) ✓;
   `protect-trusted-paths.test.cjs:67-71` (`declaredProtected()` parses the source) ✓, `:423` (the
   `.claude/` entries) ✓, `:433` (EVERY declared entry is denied) ✓. The brief's `check-spec.mjs:330-380`
   holds `emitTemplateRef` (`:335-348`) and `main` (`:350-387`).
4. **"Confirm a new DEFAULT_PROTECTED entry is covered with no hook-test edit" — confirmed, with the
   neighbours checked too.** `:433` iterates `declaredProtected()`, so a new entry is exercised the day it
   lands; the F4 invariant (`:445-458`) is satisfied, because `vendor/third-party/pharn.spec-template.md` is
   allowed by exact path; the setter agreement test (`set-writes-scope.test.cjs:467-477`) filters on the
   `.claude/` prefix, so a root entry does not disturb it; `check-bash-reconcile.test.mjs:315-317` only
   requires the control surface to be a SUBSET of `DEFAULT_PROTECTED`. **But the hook file itself cannot
   be written by the agent**: it is its own `DEFAULT_PROTECTED` entry (CLAUDE.md hard constraint #1).
   The brief does not say so. The edit is delivered as a human-applied patch, following
   `hook-cwd-anchoring` (see "Chain sequencing").
5. **Discovery 3 — does reconcile's "would have been DENIED" include `DEFAULT_PROTECTED`? Yes.**
   `pharn/floor/check-bash-reconcile.mjs:51` delegates trusted-path denial to
   `protect-trusted-paths.cjs`, and `:436-449` runs it for every candidate; for a non-canon path the
   re-ask under scope (`:445`) still denies, so the path lands in `escapes` as
   `denied_by: protect-trusted-paths.cjs`. So a **non-adversarial Bash write to `pharn.spec-template.md`
   inside the anchor→verify window is detected** (verify `FAIL`) once the patch is in, exactly as for
   `LIMITS.md`. Outside that window it is not detected, and a git-ignored project template is outside the
   reconciled set (`reconcile-ignore.json` `derived_ignore`). It is not in `always_reconciled`, and adding
   it would be an addition with no triggering failure (P7).
6. **Discovery 5 — `/pharn-loop` inherits resolution with no loop edit. Confirmed, with one observation.**
   `pharn-loop.md:239` invokes `/pharn-spec --model-approve` and reads only its outcome. An invalid
   project template makes `/pharn-spec` refuse at Step 3.1, which is row S9 ("a stage refuses before
   emitting its verdict"). `/pharn-spec` writes nothing before Step 3, so the stop happens before
   `pharn/features/<name>/` exists, and `pharn-loop.md:227-229` then writes no record. Observation, not
   fixed here: that sentence's parenthetical lists "S1, a failed S3, or S6 before a Draft is written" and
   does not name this S9 case. Named follow-up `loop-s9-before-feature-dir`.
7. **Decision (a) is verifiable from here, and the brief assumed it was not.** A local `pharn-cli`
   checkout exists (`~/Projects/pharn-cli`, fetched this run, `origin/main` = `2fffcb3`). Read at that
   commit: `pharn.spec-template.md` and `spec-template` occur **nowhere** in the repo (`git grep`); its
   root-level writes are `pharn.config.json` (`src/lib/install-manifest.ts:56`), `pharn.records.json`
   (`src/lib/install-records.ts:39`), the trusted docs and the license copy (`src/lib/constants.ts`); its
   deletes are one capability directory (`src/commands/remove.ts:94`) and lock-file corpses
   (`src/lib/project-lock.ts:266`). So today's CLI neither writes nor deletes the path. This is a read of
   another repo's source at one commit (advisory): a future CLI could change it, and nothing in this repo
   can check that.
8. **Decision (b) is confirmed.** `pharn-cli` installs the floor at `pharn/floor`
   (`src/lib/constants.ts:87`, `PHARN_FLOOR_DIR`), and this repo's floor sits at `pharn/floor/` too, so
   `join(HERE, "..", "..", "pharn.spec-template.md")` names `<project-root>/pharn.spec-template.md` in
   both. `check-spec.test.mjs`'s `withInstallTree()` (`:907-922`) already builds that layout, and the new
   tests extend it.
9. **`pharn/features/README.md` needs no change** (grill m-P6): read in full this run, it names neither the
   template nor the protected set.

## Design

### The registry (`spec-template-core.mjs`)

`TEMPLATES` becomes `id → { rel, shipped }`, still a `Map` (L15), still the only place an id or a path is
written (L41):

| id              | rel (from `pharn/floor/`)                         | shipped |
| --------------- | ------------------------------------------------- | ------- |
| `pharn-default` | `../pharn-contracts/templates/spec-template.md`   | yes     |
| `project`       | `../../pharn.spec-template.md` (the project root) | no      |

- `project` is a **static** member. Rule 7's `TEMPLATES.has(id)` never touches the filesystem, so a SPEC
  pinned `project@sha256:…` passes rule 7 whether or not the file exists, including after it is deleted.
- **The `pharn-` prefix is reserved for shipped templates:** `id.startsWith("pharn-") === shipped` for
  every entry. That is a closure test over the registry (L36), not a runtime check: the registry is a
  constant, so the test is where a violation can appear.
- New exports, all pure (path arithmetic or constants, no fs): `isShippedTemplate(id)`,
  `projectRoot()` (`join(HERE, "..", "..")`), `PROJECT_TEMPLATE_ID = "project"`, `TEMPLATE_REFUSALS`, and
  `validateTemplate()`.
- The header's "every export is pure" line stays true. The `lstat` work lives in `check-spec.mjs`, which
  already reads files (P3: the core changes when the template CONTRACT changes; the CLI changes when how a
  template is found and read changes).

### The validator — `validateTemplate({ raw, body, firstLine, baseRequired })`

A pure function over a template's already-split frontmatter and body, applied to **every** template,
`pharn-default` included. It returns `{ refusals: [{ code, detail }] }`. `baseRequired` is passed in by
`check-spec.mjs` (its `REQUIRED_SECTIONS`), exactly as `checkTemplate` already takes it, so the base four
are stored once (L35). It reuses `sectionsOf` / `spanned` / `AC_START_RE` / `VERIFY_LIKE_RE` /
`OUT_OF_SCOPE_RE` / `TEMPLATE_KEY_LINE_RE`: one visibility model and one grammar for SPECs and templates.
`sectionsOf`'s line objects gain a `hidden` flag (the index is already computed); `checkTemplate` ignores
it, so SPEC verdicts cannot move.

**The closed refusal set** (`TEMPLATE_REFUSALS`, frozen, the ONE enumeration the tests iterate — L29):

| code                 | refused when                                                                                                                                                                                                                          | produced by      |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `frontmatter`        | no `---` frontmatter block                                                                                                                                                                                                            | `check-spec.mjs` |
| `template-key`       | the frontmatter has no line starting `spec_template:`                                                                                                                                                                                 | validator        |
| `section`            | a required heading (base four + `Assumptions`) has no visible occurrence (missing, or only inside a column-0 fence / comment / raw block), **or** a template section appears more than once                                           | validator        |
| `ac-example`         | the visible lines of `## Acceptance Criteria` hold no item that starts `- **AC-<n>**`, reads Given → When → Then, and has exactly one verify-like continuation. The level is **not** checked (the default's example is a placeholder) | validator        |
| `out-of-scope-label` | no visible column-0 `**Out of scope…**` label under `## Scope`                                                                                                                                                                        | validator        |
| `absent`             | `--template-ref project` and no directory entry case-folds to the file's name                                                                                                                                                         | `check-spec.mjs` |
| `outside-root`       | the resolved path is not strictly inside `projectRoot()` (a `..` or absolute `relative()`), checked FIRST, before any filesystem call                                                                                                 | `check-spec.mjs` |
| `name-case`          | a directory entry case-folds to a path component's name but is not spelled exactly like it (e.g. `PHARN.SPEC-TEMPLATE.MD`), whether or not the exact spelling also exists                                                             | `check-spec.mjs` |
| `symlink`            | any path component from the root down is a symlink, **dangling included** (L54)                                                                                                                                                       | `check-spec.mjs` |
| `not-regular-file`   | the leaf exists and is not a regular file (a directory, a FIFO)                                                                                                                                                                       | `check-spec.mjs` |
| `unreadable`         | `readdir`, `lstat`, `open` or `read` fails for any other reason                                                                                                                                                                       | `check-spec.mjs` |

- **One addition beyond the brief's list, stated:** a duplicated template section is a `section` refusal.
  Rule 1(c) already REDs a SPEC with a duplicated section, and the `ac-example` / `out-of-scope-label`
  checks need ONE section to read. The check reuses rule 1(c)'s definition (P7: no new rule; the brief's
  `section` code now names both halves of the section check).
- **Dependent checks SKIP when their section is missing, hidden or duplicated** (grill I1), exactly as
  `checkTemplate`'s `only()` does. So a template with no visible `## Scope` refuses `section` alone, never
  `section` + `out-of-scope-label`. Every refusal fixture can then trip exactly one code.
- **`name-case` (grill I2) makes resolution platform-independent.** On a case-insensitive volume (APFS by
  default) `lstat("pharn.spec-template.md")` finds `PHARN.SPEC-TEMPLATE.MD`; on a case-sensitive one it
  returns ENOENT. So the same checkout would resolve to different templates on different machines, while
  the hook (which case-folds) denies writes to the variant on both. The component walk therefore reads
  the parent directory and compares names exactly: a case-folded match that is not an exact match is a
  refusal, identically on every filesystem. The fold is the hook's (`NFC`, then
  `toUpperCase().toLowerCase()`). The hook's Windows trailing dot/space strip is not mirrored: on POSIX
  `pharn.spec-template.md.` is a different file that the checker never reads (a named bound).
- **"Validated" means a MINIMUM SHAPE, never "can be filled to GREEN"** (grill m6). A template whose
  Acceptance Criteria section also holds a visible prose line passes the validator, and a faithful fill of
  it REDs rule 2. The contract says so.
- `absent` / `outside-root` / `name-case` / `symlink` / `not-regular-file` apply to **non-shipped** ids only
  (`!isShippedTemplate(id)`, a Map membership test, P5). The shipped default keeps today's read path and
  today's `unreadable` message, which `check-spec.test.mjs:932-940` pins.
- **A refusal never echoes template text** (P2 discipline, the same as rule 7): the detail names a
  heading from the closed section list, a file line number, or the code.

### `check-spec.mjs`

- **`--resolve-template-ref`** (no argument; an extra argument is a usage error):
  1. **Containment first** (grill m4), pure path arithmetic: `relative(projectRoot(), templatePath("project"))`
     must not be empty, absolute or `..`-led, else `outside-root`. No filesystem call happens before it.
  2. **Walk the components from the root.** For each one, `readdir` its parent. If no entry case-folds to
     the component's name, the template is **absent**, so resolve `pharn-default`: read, validate, print
     `pharn-default@sha256:<digest>`. If an entry matches only case-insensitively, refuse `name-case`. If
     it matches exactly, `lstat` it: a symlink (**dangling included**, since `readdir` lists it — L54) is
     `symlink`, and an intermediate that is not a directory, or a leaf that is not a regular file, is
     `not-regular-file`. A missing entry in the directory listing is the **only** absence proof.
  3. **Read the leaf through an `O_RDONLY | O_NOFOLLOW | O_NONBLOCK` descriptor, and `fstat` it** (grill m5).
     This closes the swap-in-a-symlink and swap-in-a-FIFO windows between the `lstat` and the read. The
     `ELOOP` → `symlink` and `fstat`-not-a-file → `not-regular-file` branches are reachable only by a race,
     so no deterministic test reaches them (a named bound). Then validate and print
     `project@sha256:<digest>`.
  4. **Any refusal → exit 1, stdout empty,** `check-spec: template "<id>" refused (<code>): <detail>` on
     stderr. **Never a fallback to the default** once any entry case-folds to the name.
- **`--template-path <id>`** (NEW, grill m12 — L6: the file to fill is a structural fact, so it is read from
  a structured location, not from stderr prose): prints the known id's path **relative to the project
  root** on stdout, from the registry alone. There is no filesystem call; the resolve mode is what judges
  the file. An unknown id exits 1 and a missing id is a usage error, exactly as for `--template-ref`. The
  earlier plan's stderr "resolved template … from <path>" line is dropped.
- **`--template-ref <id>`** keeps its contract: a missing id is a usage error, an unknown id exits 1 with
  `unknown template id`. A known id now also runs the validator (and, for `project`, the file checks)
  before printing. Its output SHAPE and exit contract are unchanged. For `pharn-default` its **digest
  changes once**, because this increment edits the template's bytes (grill m9); the `:881-889` test stays
  unedited and passes because it recomputes the digest from the file.
- The digest stays `bodyHash()` over the whole file after the BOM strip, so a CRLF project template
  prints the same value as its LF spelling.
- Validation (the default mode) is **unchanged**: rule 7 stays provenance only and never reads a template
  file.
- Header and usage line gain the new mode.

### The default template (`pharn/pharn-contracts/templates/spec-template.md`) — id-agnostic

- Frontmatter placeholder: `spec_template: <the line check-spec.mjs --resolve-template-ref prints>`.
- Top guidance comment: "A PHARN SPEC template — PHARN's shipped default, or a project's own copy of it at
  `pharn.spec-template.md` …", and the pinned instruction becomes the exact
  `node pharn/floor/check-spec.mjs --resolve-template-ref` line.
- The `pharn-default` digest changes with this edit. That is correct and harmless, because the digest is
  provenance only and no check compares it. A test pins that the default no longer spells `pharn-default`,
  so a copy does not inherit a claim about its own id.

### The contract (`pharn/pharn-contracts/spec-template.md`)

- Templates table gains the `project` row, plus a new section **"The project template"**:
  - the fixed path;
  - **why it is fixed and protected rather than configurable** (the brief's rationale, stated in the
    contract: a template's guidance comments are instructions `/pharn-spec` follows; a path read from the
    unprotected `pharn.config.json` would let a build agent point every future `/pharn-spec` at a file it
    wrote, a persistent instruction channel, P2);
  - denied by path whether or not the file exists;
  - the consequence for users: a human edits it directly, as with `LIMITS.md`;
  - the Bash bound and reconcile's window;
  - the resolution rule, the refusal table (cited from the core, not restated beyond the codes), and the
    reserved `pharn-` prefix;
  - provenance: deleting or renaming the file never REDs an Approved `project@…` SPEC. **The converse,
    stated:** rule 7 does not validate, so a hand-typed `project@sha256:<any 64 hex>` passes it too. The
    validator gates what the two print modes emit, never what a SPEC declares;
  - the validator checks a **minimum shape**, never that a faithful fill will be GREEN (grill m6);
  - three named bounds (grill m3, m5, m7):
    - a symlinked `pharn/floor` moves `projectRoot()` to the link target's grandparent, so the checker can
      read a file the project's hook does not guard, and `outside-root` cannot see it;
    - `/pharn-spec`'s later Read of the file is not tied to the digested bytes;
    - reconcile's window opens at `/pharn-dev-build`'s anchor, AFTER `/pharn-spec` ran, so a Bash write that
      steered this run's SPEC is never detected.
- The contract's `purpose:` frontmatter line names the project template too (grill m-purpose).
- The frontmatter table's `spec_template` source becomes `--resolve-template-ref` (or `--template-ref <id>`).
- The **"DO NOT authenticate the template"** bullet is rewritten per correction 2.
- The **Agreement** bullet gains that the validator runs on the shipped default too.
- **Out of scope, named as the follow-up (decision c):** template-declared extra REQUIRED sections.

### `/pharn-spec` (`.claude/commands/pharn-spec.md`)

- `reads:` gains `pharn.spec-template.md`; `version` 0.2.0 → 0.3.0; the description says "the resolved
  template" in place of "the shipped default template".
- **Step 3.1** runs the ONE pinned line `node pharn/floor/check-spec.mjs --resolve-template-ref` and pins
  its stdout line verbatim. On exit 1 it stops and reports the refusal code. It never fills from memory and
  never falls back to the default by hand.
- **Step 3.2 (new)** runs the pinned line `node pharn/floor/check-spec.mjs --template-path <id>`, where
  `<id>` is the part of that line before `@` (one of the registry's ids), and reads and fills the file it
  prints.
- **Guarantee audit / P0 lines:** "the shipped default template" becomes "the resolved template". It adds
  that a project template's guidance is the project's human-only instruction to the model: trusted by
  path and by fix #2 on the tool surface, not by the model's judgment.
- **Trust audit:** the template bullet is rewritten (correction 2, plus the project template's protection
  and its Bash bound).
- **Determinism audit:** resolution is a directory-listing membership test plus the validator. The terminal fallback
  for an invalid project template is a stop, reported to the human, never a guess.

### The hook (`.claude/hooks/protect-trusted-paths.cjs`) — HUMAN-APPLIED

One `DEFAULT_PROTECTED` entry, `"pharn.spec-template.md"`, with a comment block stating the instruction
channel it closes, that it is denied by path whether or not the file exists (the `.pharn/writes-scope.json`
precedent), and its Bash bound. The file header's "Protected by default" paragraph gains one sentence. The
agent cannot write this file, so `/pharn-dev-build` writes the change as
`.dev/features/spec-template-override/proposed/human-only.patch`, together with its sha256 and an
`apply.sh` modelled on `.dev/features/hook-cwd-anchoring/proposed/apply.sh`.

## Chain sequencing (the human-applied step)

1. `/pharn-dev-build` writes every agent-writable file plus `proposed/` and runs the floor. The
   hook-agreement and hook-denial tests in `check-spec.test.mjs` are **expected RED** until the patch is
   applied. They assert the patched behaviour, the designed stop recorded in `hook-cwd-anchoring`'s
   `VERIFY.md`. The build reports them and halts for the human.
2. **The human runs** `sh .dev/features/spec-template-override/proposed/apply.sh`. It refuses on `main`,
   runs a reconcile checkpoint on the build epoch, runs `git apply --check` and then `git apply`, checks
   the pinned sha256, and runs EVERY hook suite (`.claude/hooks/*.test.cjs`, grill m10) plus
   `check-bash-reconcile.test.mjs` and `check-spec.test.mjs` on the applied bytes. On any failure it
   restores the hook from HEAD and commits nothing. On success it makes a path-scoped commit of the hook
   alone, re-sets the scope from this PLAN, and re-anchors (`--by spec-template-override-apply`).
   **The window this leaves, stated (grill I-reconcile):** the re-anchor resets the epoch, so verify's
   `reconcile` gate judges only apply→verify. The build epoch is judged once, by `apply.sh`'s opening
   checkpoint, which must be `CLEAN` before anything is applied.
3. The chain resumes at `/pharn-dev-regress`. **L17, pre-declared:** `check-regress scope` compares against
   base, so the human-applied hook commit will read as "escaped `## Files`". That is expected, and it is
   disproved by fix #2 denying the agent that path (exit 2, re-measured at build).

## Files

- `pharn/floor/spec-template-core.mjs` — the registry's `project` entry and `shipped` flag,
  `isShippedTemplate`, `projectRoot`, `PROJECT_TEMPLATE_ID`, `TEMPLATE_REFUSALS`, `validateTemplate`, the
  `hidden` line flag, the case fold, header, and rule 7's RED remedy text (`:360`, `:365`: "copy the line
  `--template-ref <id>` prints" → the resolve mode, grill m8) — product floor
- `pharn/floor/check-spec.mjs` — `--resolve-template-ref`, `--template-path`, the file checks, the
  validator in `--template-ref`, usage, and the header, whose P3 sentence names the template-CLI axis it
  hosts (grill m-P3) — product floor
- `pharn/floor/check-spec.test.mjs` — the new tests below; two existing tests edited per correction 1 —
  floor test (apparatus)
- `pharn/pharn-contracts/templates/spec-template.md` — id-agnostic placeholder and top guidance comment —
  pharn-contracts (L-1)
- `pharn/pharn-contracts/spec-template.md` — the project template section, table row, corrected bullets —
  pharn-contracts (L-1)
- `.claude/commands/pharn-spec.md` — `reads:`, version, description, Step 3, audits — product command
- `pharn/floor/README.md` — the `check-spec.mjs` paragraph (`--resolve-template-ref`) and the
  protected-set paragraph (the project template) — product floor doc (ships)
- `README.md` — badge 6.13.0 → 6.14.0; the Guarantees table (the protected-set row and the spec-template
  row); a short "Your own SPEC template" subsection under "The pipeline" (copy the default to
  `pharn.spec-template.md`, edit it outside Claude's write tools, human-only by design, and an existing
  install is protected only after `pharn update` replaces the hook, grill m-update); plus any
  `CURRENT-STATE` bytes `npm run docs:generate` rewrites. That regeneration is a Bash write (L19),
  declared here — repo meta
- `CLAUDE.md` — hard constraint #1 and the writes-scope "fix #7 composes with fix #2" sentence name the
  project template — repo meta
- `SKILLS_VERSION` — 6.13.0 → 6.14.0 (MINOR: a new capability; re-read `main` at build time and take the
  next minor if it moved). **`MIN_CLI` stays 0.5.0** (grill I-mincli): no installed path relocates, the
  project template is created by the user and never installed, and an older CLI installs this tree
  intact — repo meta
- `CHANGELOG.md` — `## [6.14.0] - <date>` directly above `[6.13.0]`, every `[Unreleased]` entry moved in,
  this increment's entry at the top of `### Added` — repo meta
- `.dev/features/spec-template-override/proposed/human-only.patch` — the hook diff, produced by Bash
  (`diff -u` of a scratch copy) because the agent cannot write the hook — dev artifact
- `.dev/features/spec-template-override/proposed/human-only.sha256` — the post-apply sha256 of the hook,
  written by `shasum` through Bash — dev artifact
- `.dev/features/spec-template-override/proposed/apply.sh` — the human-run apply step — dev artifact

### Human-applied or human-only — NOT written by the build

- `.claude/hooks/protect-trusted-paths.cjs` — its own `DEFAULT_PROTECTED` entry; fix #2 denies the agent.
  Delivered as `proposed/human-only.patch` and applied by `apply.sh`, run by a human.
- `LIMITS.md` (§1d, beside the `spec_template` opt-in sentence at `:88-90`) — suggested: "A project
  template (`pharn.spec-template.md`) is protected like the trusted docs on the
  Write/Edit/MultiEdit/NotebookEdit surface only; a Bash write reaches it (§6), and reconcile detects a
  non-adversarial one only between build and verify."
- `THREAT-MODEL.md` §2 — suggested: the project template as an instruction input to `/pharn-spec`,
  trusted by path, mitigated by the pre-write hook (primitive #1), with the Bash residual.
- `pharn/ARCHITECTURE.md` §4 (`:134-135`) — optional: "(+ templates/spec-template.md, the default SPEC
  template it defines; a project may supply its own at `pharn.spec-template.md`)".

All three docs stay accurate without these edits. They would only be incomplete about a new surface, so
the suggestions are follow-ups, not blockers.

## Contracts satisfied

- `pharn/pharn-contracts/spec-template.md` — extended: it gains the `project` id and its rules, and the
  core and CLI conform to it (P4: the core cites the contract; the contract cites the core's refusal set
  rather than restating its regexes).
- `pharn/ARCHITECTURE.md §6` spec row (`SPEC.md` + `spec_template` provenance) — unchanged; the provenance
  bound is preserved (rule 7 never reads a template file).
- `pharn/ARCHITECTURE.md §2` primitive #1 (pre-write hook) — the project template joins its protected set.

## Evals to write (P1) — tests, since `check-spec` is a floor checker, not a `role:` capability

Every refusal test asserts exit 1, empty stdout, and **exactly** its code (a fixture that trips ONLY that
reason — L34's control: the base fixture, a copy of the default template placed at the project path,
resolves GREEN first).

- **R0 control** — in a sandbox install tree with no project template, `--resolve-template-ref` prints exactly
  `REF` (`pharn-default@…`) and `--template-path pharn-default` prints
  `pharn/pharn-contracts/templates/spec-template.md`.
- **R1** — a valid project template (the default, copied) → `project@sha256:<sha256 of the file>`, and
  `--template-path project` prints `pharn.spec-template.md`. The digest is computed independently of the
  checker.
- **R2 `TEMPLATE_REFUSAL_CASES`** — one enumeration, iterated. Its mutants:
  - drop each of the five required headings, one mutant per heading, each → `section` ALONE (Scope and
    Acceptance Criteria included: their dependent checks skip, grill I1);
  - the Acceptance Criteria heading inside a column-0 fence (and a second mutant inside an HTML comment)
    → `section`;
  - a duplicated `## Scope` → `section`;
  - no AC item, an item missing `Then`, an item with zero verify lines, an item with two verify lines →
    `ac-example`;
  - the Out-of-scope label deleted → `out-of-scope-label`;
  - the `spec_template:` line deleted → `template-key`;
  - no frontmatter → `frontmatter`;
  - the project path a symlink to a VALID template inside the root → `symlink`;
  - a dangling symlink → `symlink` (never a fallback to the default — L54);
  - a directory at the path → `not-regular-file`;
  - a registry mutant pointing outside the root (a sandbox copy of the core with the path literal
    replaced, L4-style, asserting the anchor exists before replacing) → `outside-root`;
  - `--template-ref project` with no file → `absent`;
  - a case variant `PHARN.SPEC-TEMPLATE.MD` at the root → `name-case`, on every filesystem (grill I2);
  - an unreadable file (mode `000`, skipped when running as root) → `unreadable`.
- **R3 closure (L29, L34, L36)** — every member of `TEMPLATE_REFUSALS` has at least one case, and every
  case's code is a member. So a code added later without a fixture fails, and so does a fixture with a
  typo'd code.
- **R4** — the shipped default passes `validateTemplate` (direct import), and a filled copy of it is GREEN
  as a Draft and as an Approved SPEC (the existing probe, placeholder updated).
- **R5** — `--template-ref pharn-default` prints the same line with a valid project template present in
  the sandbox (unchanged contract).
- **R6** — `--template-ref project` with a valid file → `project@…`; with an invalid one → exit 1 with the
  code.
- **R7** — a SPEC filled from the project template and pinned `project@…` is GREEN as a Draft and as an
  Approved spec (`template "project"`). **The same SPEC is still GREEN after the project template file is
  deleted** (rule 7 membership is static).
- **R8** — a `project@sha256:<64 hex>` SPEC is GREEN in the REAL repo, which has no project template. This
  is the static-membership half without a sandbox.
- **R9 ✧ agreement (L35: both copies must exist, because the hook must not import the floor)** —
  `relative(projectRoot(), templatePath("project"))` is a member of the hook's `DEFAULT_PROTECTED`, parsed
  from source the way `declaredProtected()` does it. **Expected RED until the patch is applied.**
- **R10** — the REAL hook denies `Write`, `Edit`, `MultiEdit` and `NotebookEdit` payloads for
  `pharn.spec-template.md` (exit 2), and allows `vendor/pharn.spec-template.md` (exit 0 — the negative
  control, so the deny is not vacuous). **Expected RED until the patch is applied.**
- **R11 reserved prefix** — for every registry id, `id.startsWith("pharn-") === isShippedTemplate(id)`,
  and every shipped id resolves under `pharn-contracts/templates/`.
- **R12 ★ WIRING (L22, L45)** — `pharn-spec.md` pins exactly ONE
  `node pharn/floor/check-spec.mjs --resolve-template-ref` line and exactly ONE
  `node pharn/floor/check-spec.mjs --template-path <id>` line. Both are executed under `sh -c` from the repo
  root, the second with `<id>` taken from the first line's output, and the printed path must exist. The
  expected id is `pharn-default` when the repo has no `pharn.spec-template.md`, and otherwise any registry
  id (grill m-R12). The negative control is each line with a misspelled flag → exit 1.
- **R13** — the default template does not spell `pharn-default` anywhere.
- **R14** — CRLF: a CRLF copy of a valid project template prints the same `project@…` digest as its LF
  spelling.
- **R15** — usage: `--resolve-template-ref extra` → exit 1 with usage; `--template-path` with no id → exit 1
  with usage; `--template-path acme` → exit 1 `unknown template id`; the bare usage line names both new
  modes.
- **R16 broken install (grill I-broken)** — a sandbox with NO project template and NO shipped default →
  `--resolve-template-ref` exits 1, prints nothing on stdout, and says `unreadable` with the default's path
  on stderr.
- **Coverage (reported in SHIP.md, not a test — a dev feature keeps no BUILD.md):**
  `node --test --experimental-test-coverage pharn/floor/check-spec.test.mjs`, line % for
  `check-spec.mjs` and `spec-template-core.mjs`, target ≥ 90 %. Spawned children count because they
  inherit `NODE_V8_COVERAGE` (measured in `spec-template`'s PLAN: 97.83 %), and the report says so. The
  hook is covered by its own unchanged suite; the patch adds one array entry and comments.

## Guarantee audit (P0)

- "`project` is always a known template id; deleting its file never REDs an Approved SPEC" → **floor:
  enum** (`TEMPLATES.has`, static; R7, R8).
- "a template that fails the validator is never printed by `--template-ref` / `--resolve-template-ref`" →
  **floor: regex / presence + exit code** (R2).
- "an invalid or non-regular project template never silently falls back to the default" → **floor**:
  "no directory entry case-folds to the name" is the only branch to the default; every other state is
  exit 1 (R2: name-case / symlink / dangling / directory / unreadable).
- "the same checkout resolves to the same template on every filesystem" → **floor: regex/membership**
  (an exact name compare over a `readdir` listing; R2 `name-case`).
- "a symlink or FIFO swapped in between the check and the read is not followed or blocked on" →
  **floor by kind (the kernel's `O_NOFOLLOW`), untested by construction**: only a race reaches those
  branches.
- "the project template cannot be written through Write/Edit/MultiEdit/NotebookEdit" → **floor: hook**,
  once the human applies the patch (R9, R10). **Bounded:** Bash reaches it (`LIMITS.md §6`); reconcile
  DETECTS a non-adversarial Bash write only inside the anchor→verify window and only when the file is not
  git-ignored; nothing prevents it. That window opens AFTER `/pharn-spec` ran, so a Bash write that steered
  this run's SPEC is never detected (grill m7).
- "`/pharn-spec` fills the template resolution selected, and pins the printed line" → **advisory**
  (command prose). R12 pins that the command names the line and that the line runs, never that a run
  executed it.
- "a SPEC's `spec_template` names the template it came from, and that template validated" →
  **advisory / provenance.** Rule 7 checks the value's shape and id membership only; a hand-typed value
  passes, and a digest is compared with nothing.
- "the validator sees the headings a renderer shows" → **advisory.** It shares `spanned()`'s column-0
  model and inherits its stated limits; no reference-parser differential (L55/L56, residual
  `spec-ac-grammar-differential`).
- "the installer never writes or deletes `pharn.spec-template.md`" → **advisory**: read from `pharn-cli`
  source at `2fffcb3`, never checked by anything in this repo.
- "a project template's guidance is the project's human-only instruction" → **floor for the tool surface
  (hook), advisory beyond it** (Bash, a human editing it with anything).

## Trust audit (P2)

- **The project template is TRUSTED input, and that is the reason it is protected.** Its guidance
  comments steer `/pharn-spec`. P2 says a trusted file must be write-protected at the floor, not merely
  located in a trusted path. The fixed path plus the `DEFAULT_PROTECTED` entry is that protection on the
  tool surface. A configurable path would make the pointer itself untrusted, writable state, which is
  exactly the channel the brief names.
- **Nothing from the template's text reaches a verdict except structure.** The validator reads headings
  from a closed list, line shapes, and one key line. A refusal names a code, a heading from the closed
  list, or a line number, never template text.
- **The filled SPEC body stays DATA,** exactly as today. The template changes what `/pharn-spec` is told to
  write, never how `check-spec.mjs` judges it (rule 7 stays provenance only).
- **The shipped default's weakness is corrected in the prose** (correction 2). A scope naming it, or a Bash
  write, reaches it. It is not protected here, because no failure has been recorded against it (P7).
  Named follow-up: `protect-shipped-spec-template`.

## Determinism audit (P5)

- Resolution: containment (path arithmetic) → a directory listing with an exact-name compare → the file
  checks and the validator. No entry that case-folds to the name → the default. No classification.
- The validator: presence / regex / count over structure; `TEMPLATE_REFUSALS` is a closed set with a
  closure test.
- Terminal fallback for an invalid project template: **stop and report to the human** (`/pharn-spec` exit
  1, `/pharn-loop` S9), never a guess and never the default.
- `/pharn-spec` learns which file to fill from `--template-path <id>` on stdout (registry-derived), not from
  a model lookup or from stderr prose (L6).

## Applied lessons

- **L15** — the registry stays a `Map`; `isShippedTemplate`/`templatePath` are own-key tests, and R2's
  unknown-id cases keep `__proto__` / `constructor` unknown (the existing `:891-898` test, unedited).
- **L17** — the human-applied hook commit will read as "escaped `## Files`" at regress; pre-declared in
  Chain sequencing, with fix #2's exit 2 as the disproof.
- **L19** — three Bash writes are declared in `## Files`: the `diff -u` patch, `shasum` and
  `npm run docs:generate`. Formatters run on this increment's files by path only.
- **L22** — `/pharn-spec` gets pinned command lines, not a described technique, and learns the path from the
  checker's own stdout (`--template-path`) rather than from prose.
- **L29** — `TEMPLATE_REFUSALS` is the one enumeration, and R2/R3 iterate it; five required headings means
  five mutants, not one.
- **L33** — the "writable in an install" sentence has expired (since #188) in two shipped files; both are
  corrected. The sweep is WRAP-TOLERANT (grill m8: both sentences wrap, so a line grep for
  `write guard's default` returns zero): it joins each file's lines before matching, across `pharn/`,
  `.claude/`, `README.md` and `CLAUDE.md`.
- **L34** — every refusal case runs against a base fixture proven GREEN first (R1 is the control), and R3
  asserts the case set is non-empty per code.
- **L35** — the project path is stored in the core and in the hook. Both must exist, because the hook must
  not import the floor. So R9 pins their agreement, and the base-four sections are passed into the
  validator, not copied.
- **L36** — R3 is a closure over codes in both directions, and R11 is a closure over the registry's ids
  (the reserved prefix).
- **L37** — correction 2 was found by executing both guards in a scratch install. The contract's new
  sentences about the project template's protection are to be re-probed at build against the patched
  hook (R10), never read off it.
- **L41** — `--resolve-template-ref` takes no argument, so its only path is the default path. R0 exercises
  it with no project file, and R12 exercises it from the real repo root, not a sandbox.
- **L45** — R12 executes the committed `/pharn-spec` line under `sh -c` from the repo root, with a
  negative control.
- **L50** — the sweep for the replaced `--template-ref pharn-default` instruction goes by REFERENT (every
  cite of that line, and of `pharn-default` as "the" template): `pharn-spec.md:2,135,142,268`,
  `spec-template.md:54`, the template's `:5,9,15`, `pharn/floor/README.md:33`, `README.md:342`, and rule
  7's own RED remedy text at `spec-template-core.mjs:360,365` (grill m8 found that one). A wrap-tolerant
  sweep is re-run at build.
- **L52** — the "one test per X" remedies here name their sets: one refusal fixture per `TEMPLATE_REFUSALS`
  member, and one hook payload per write tool in the `PreToolUse` matcher (four), not "a test for the
  hook".
- **L54** — absence is judged from the parent's directory LISTING, which includes a dangling symlink, never
  from a stat that follows links. So a dangling symlink is a `symlink` refusal with its own test, never a
  silent fallback.
- **L55** — the validator reuses `spanned()`/`sectionsOf()` rather than a second model. Its hidden-heading
  mutants include a fence AND a comment.
- **L56** — per L56's discipline the build probes the new hidden-heading refusal with markdown-it (in
  `node_modules`, run from scratch, never pinned as a dependency) over both mutants and the unmodified
  default, and records the result in SHIP.md. The differential stays the named residual.

## Grill dispositions (folded in before build)

Source: `GRILL.md` (advisory). Every finding was ADOPTED; none was declined. Each disposition is written
into the section it changes, and this list is the index.

| grill finding                                                    | disposition                                                                              |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| reconcile window narrows after `apply.sh` re-anchors (important) | stated in Chain sequencing step 2                                                        |
| `MIN_CLI` unstated (important)                                   | `## Files`: stays 0.5.0, with the reason                                                 |
| broken install under resolve (important)                         | new test R16                                                                             |
| R12 assumes no local project template (minor; overlaps ind. 11)  | R12 accepts any registry id when a local file exists; R0 runs in a sandbox               |
| check-spec's second axis (P3, minor)                             | check-spec's header names the template-CLI axis it hosts                                 |
| `pharn/features/README.md` unrecorded (minor)                    | correction 9                                                                             |
| `pharn update` as the path to protection (minor)                 | README subsection sentence                                                               |
| contract `purpose:` line (minor)                                 | contract edit                                                                            |
| ind. 1 — dependent checks must skip (important)                  | stated under the refusal table; R2 asserts `section` ALONE                               |
| ind. 2 — case-variant filename differs by platform (important)   | new `name-case` refusal (directory listing + exact compare); R2 case                     |
| ind. 3 — symlinked `pharn/floor` moves the root (minor)          | named bound (contract + residuals)                                                       |
| ind. 4 — containment after the walk (minor)                      | containment is step 1, before any filesystem call                                        |
| ind. 5 — TOCTOU windows (minor)                                  | `O_NOFOLLOW\|O_NONBLOCK` + `fstat` for the read; the Read-by-`/pharn-spec` window named  |
| ind. 6 — "validated" ≠ "fillable to GREEN" (minor)               | stated in the plan and the contract                                                      |
| ind. 7 — reconcile opens after `/pharn-spec` (minor)             | guarantee audit + contract                                                               |
| ind. 8 — sweeps miss wrapped lines and the rule-7 remedy (minor) | wrap-tolerant sweep; `spec-template-core.mjs:360,365` added to `## Files` and L50's list |
| ind. 9 — "byte-unchanged" wording (minor)                        | reworded: shape and contract unchanged, digest changes once                              |
| ind. 10 — `apply.sh` test list narrow (minor)                    | every hook suite                                                                         |
| ind. 12 — stderr as the path channel (P2/L6, minor)              | new `--template-path <id>` stdout mode; the stderr line is dropped                       |

## Review dispositions — GATE 2 fix round (the human chose "Fix F1 in code")

Source: `REVIEW.md`. The human's GATE-2 choice covered F1 plus the cheap advisory fixes, all inside `## Files`.

| review finding                                                          | disposition                                                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| F1 (blocking): a symlinked `pharn/` silently skips the project template | new refusal `symlinked-root`: realpath of the INVOKED root (from argv[1]) must equal `projectRoot()`; new fixture   |
| visible rules untested (important)                                      | two fixtures, one per `inBlock` guard; each guard's removal now REDs 2 tests (mutation-checked)                     |
| contributor route to the template (important, P2)                       | named in the contract's bounds, `/pharn-spec`'s trust audit and the README                                          |
| check-spec's second axis (important, P3)                                | NOT changed: the brief fixed the location; the header states the axis, and a split is left to the human (see below) |
| `--template-path` in the refused-template exit line (minor)             | header corrected                                                                                                    |
| README says `AC-1` (minor)                                              | now `AC-<n>`                                                                                                        |
| hard-coded base sections in tests (minor)                               | one `BASE_REQUIRED` constant, pinned to check-spec's `REQUIRED_SECTIONS` literal                                    |
| CLAUDE.md re-wrap (minor)                                               | restored                                                                                                            |
| hook allows `pharn.spec-template.md/x` (minor)                          | NOT changed here: the hook is human-only; named follow-up `protect-spec-template-subtree`                           |
| `foldName` vs `toKey` not pinned (minor)                                | NOT changed; named with the hook follow-up                                                                          |
| `/pharn-loop` table lacks the template stop (minor)                     | NOT changed (loop edit out of scope); folded into follow-up `loop-s9-before-feature-dir`                            |

**P3, left to the human:** a split would move `readProjectTemplate`, `invokedRootMismatch`, `readShippedTemplate`
and the three emit functions to their own module. It is recorded as follow-up `template-cli-split` rather than done
here, because the brief placed the modes in `check-spec.mjs` and a move now would re-open the WIRING and coverage
work for no behaviour change.

## Named residuals and follow-ups (not built here)

- `template-required-sections` (decision c) — template-declared extra REQUIRED sections. Not now: there is
  no recorded need (P7), and rules derived from a template read at validation time would let a later
  template edit RED an Approved spec.
- `loop-s9-before-feature-dir` — `pharn-loop.md:227-229`'s parenthetical does not name an S9 refusal at
  `/pharn-spec` Step 3 (correction 6).
- `protect-shipped-spec-template` — the shipped default stays writable under a scope that names it
  (correction 2).
- `spec-ac-grammar-differential` — inherited (L55/L56).
- **Named bounds, not follow-ups:** a symlinked `pharn/floor` moves `projectRoot()`, and nothing detects
  it; the `O_NOFOLLOW`/`fstat` branches are race-only and untested; `/pharn-spec`'s Read of the file is
  not tied to the digested bytes; the hook's Windows trailing-dot/space fold is not mirrored by the
  checker.
- The three trusted-doc suggestions above (human-only).

## Resolved at GATE 1 (2026-09-23, answered by the human through the approval form)

- **(a) Path:** `pharn.spec-template.md` at the project root. `pharn-cli@2fffcb3` never names, writes
  or deletes it (correction 7); that stays advisory for future CLIs.
- **(b) Layout:** `join(HERE, "..", "..", "pharn.spec-template.md")`, confirmed from `pharn-cli`'s
  `PHARN_FLOOR_DIR = 'pharn/floor'` and this repo's layout (correction 8).
- **(c) Extra required sections:** NOT now; named follow-up `template-required-sections`.
- **The human-applied hook step:** the `hook-cwd-anchoring` shape. The build stages `proposed/`, the
  chain halts after build, the human runs `apply.sh`, and the chain resumes at `/pharn-dev-regress`.
- **The duplicate-section refusal:** included, as a `section` refusal.
- **Plan:** approved as written.

No question remains open.
