# REVIEW — selective-skill-reads

- reviewer: `/pharn-dev-review` (the four inline principle-lenses), over the uncommitted working tree on
  `feat/selective-skill-reads`, base `c441b0965825f9e2e2f8d5e2ef543cc4991ed56a`. The increment was treated as `trust: untrusted`.
- writes-scope: set by `set-writes-scope.cjs --from-frontmatter .claude/commands/pharn-dev-review.md --target .dev/features/selective-skill-reads/REVIEW.md` (1 path).

## Step 1 — floor (the only guaranteed part of this review)

`node pharn/floor/validate.mjs .` → **`FLOOR: GREEN — 37 capabilities checked in "."`** (exit 0).

Re-run this review, not copied from the artifacts:

- `node --test` over `scan-installed-skills.test.mjs`, `installed-skills-core.test.mjs`, `installed-skills-consumers.test.mjs` and `frontmatter-core.test.mjs`: 131 pass, 0 fail.
- **Characterization against the unrefactored scanner:** the new `scan-installed-skills.test.mjs` was run against `git show HEAD:pharn/floor/scan-installed-skills.mjs`, copied to a scratch directory: 22 of 22 pass. The extraction's legacy-parity claim holds for every pinned case.
- `npm run docs:check`, `check:markers`, `check:badge`, `check:changelog`, `check:contributing`: all exit 0. The four trusted docs, `CLAUDE.md` and `MIN_CLI` are untouched (`git diff HEAD --quiet`).
- The `expected/*.md` sha256 values in EVAL.md match the files on disk. The catalogue over the seven fixture repos gives the modes and statuses EVAL.md and MEASUREMENTS.md report: `select` for all seven, with c4 `data-export: missing` and c7 `4 non-ok`.
- Command bytes against `COMMAND_BYTE_CEILINGS`: build 23,367/24,576, grill 22,800/23,040, review 23,012/24,064. All three are under their ceilings, and no ceiling was raised.

## Maintainer acceptance criteria — checked against the code

1. **Legacy scanner unchanged / one enumerator:** met. `discoverInstalledSkills()` keeps the legacy predicate, the root lstat, the swallowed `readdir` failure and the sort. The scanner keeps its own target check. Parity is verified above.
2. **Catalogue honesty / safe reads:** met in the helper. No body is emitted (sentinel tests), and the roster is never cut, including when the output bound is exceeded. Every failure state has a name: `skills_root`, `roster`, `excluded[]`, `metadata`, `mode_reason`, and exit 1 or 2. Reads are contained by realpath plus `O_NOFOLLOW|O_NONBLOCK` and an fstat that requires a regular file. The parent `.claude` link is `unsafe`. The TOCTOU limit is stated at `installed-skills-core.mjs:73-76`. The gap is in the consumers' record, not the helper: see A1.
3. **Consumer matrix:** met as text, pinned by `.dev/floor/installed-skills-consumers.test.mjs`. That is presence in the prose, not runtime proof. Build selects against PLAN and code and never SPEC. `--quick` and `--floor-only` are unchanged. The review orchestrator reads neither the catalogue nor any body. Selection never decides a spawn. Routing, slices, merge and findings are untouched.
4. **Selection rules:** met in `installed-skill-selection.md` steps 1–5 and its fences.
5. **Failure behaviour:** met for the fallback itself. The record vocabulary for fallback is incomplete: see A1.
6. **Honesty:** mostly met. EVAL.md and MEASUREMENTS.md state their limits, report bytes without converting them to tokens, and report the cases where selection cost more than it saved. One wording overclaim remains: see A3.
7. **Repo policy:** met. 6.46.1 → 6.47.0 (minor), with one new CHANGELOG section, the badge, regenerated docs, the trusted-doc proposal only, and no `CLAUDE.md` growth.

## Floor-gate findings (blocking)

None. No guarantee claimed by the increment lacks a floor reduction or a bound. P1 binding is GREEN: the new skill declares no `enforces`, and its 7 cases have matching expected files. No sibling reference is grep-detectable.

## Advisory findings (warn — reviewer judgment, never the sole basis for blocking)

```yaml
- type: FINDING
  rule_id: "P5"
  severity: important
  file: ".claude/commands/pharn-grill.md:212"
  problem: "The `skills:` record format is defined only in installed-skill-selection.md, which a consumer reads only in `select` mode. In `none`, `read-all` and legacy-fallback runs, build, grill and every review lens are told to keep or return 'the skills: line' with no format for it. Grill and review also never name the `legacy-fallback (catalogue exit <n>)` / `unavailable` values or the 'scanner failed too' branch, which only pharn-build.md:253-254 has. The stated distinctions (fallback vs unavailable vs read-all, `failed=[]` for an unreadable body) can therefore not reach GRILL.md or REVIEW.md reliably."
  evidence: 'pharn-grill.md:212 "Keep the `skills:` line for `GRILL.md`."; pharn-review.md:190 "return the skill''s one `skills:` line in your final message"; the only template is installed-skill-selection.md:72'
- type: FINDING
  rule_id: "P2"
  severity: important
  file: ".dev/floor/test-fixtures/skill-selection/c1-ui-copy/.claude/skills/vitest-conventions/SKILL.md:1"
  problem: "The 30 eval fixture skills live under `.claude/skills/` paths inside this repo, and Claude Code registers them as live, model-invocable skills in pharn-oss sessions. They appear in this review session's own skill listing, among them `supabase-rls`, `vitest-conventions`, `feature-flags` and namespaced `.dev/floor/test-fixtures/skill-selection/c6-lens-validation:drizzle-orm`. So contributor sessions now carry synthetic vendor conventions as candidate instructions, some deliberately misleading (c5). The same channel may also have shown descriptions to the eval subagents outside the catalogue. EVAL.md:78 notes the listing as an eval caveat only, not as a standing hazard of the committed tree."
  evidence: 'this session''s skill listing: "api-pagination", "supabase-rls", ".dev/floor/test-fixtures/skill-selection/c3-tenancy:analytics-events"; EVAL.md:78 "Claude Code listed the fixture skills'' descriptions in this session''s own skill listing"'
- type: FINDING
  rule_id: "P0"
  severity: important
  file: "pharn/floor/installed-skills-core.mjs:35"
  problem: "The `unsafe` status is defined as 'never read, by this helper or by a consumer'. The consumer half reduces to no floor primitive: a model's Read tool can open the path, and the plan's own guarantee audit narrows it to 'advisory command discipline'. The header's bound at :75 states the limit, but this shipped line contradicts it without a label."
  evidence: '"unsafe (failed the access check — never read, by this helper or by a consumer)" vs :75 "never a later model Read of the same path"'
- type: FINDING
  rule_id: "P3"
  severity: minor
  file: "pharn/pharn-core/installed-skill-selection/installed-skill-selection.md:20"
  problem: "The `installed-skills/1` catalogue shape is consumed by three product commands and a pharn-core skill. Its only schema is a comment header in a product-floor implementation file, and the pharn-core skill points there for it. ARCHITECTURE §4 keeps cross-module schemas in pharn-contracts. The plan chose 'no new contract' deliberately, so this goes to the human, who may judge it intended."
  evidence: '"Its shape is in that helper''s core header (`pharn/floor/installed-skills-core.mjs`)"'
- type: FINDING
  rule_id: "P0"
  severity: minor
  file: "CHANGELOG.md:40"
  problem: "Users are not told about a behaviour change for a plausible layout. When a project's `.claude` is a symlink to a directory outside the project, every skill used to be read. Now every skill is `unsafe` and none is read, and `mode_reason` reports `no-usable-metadata` rather than naming containment. The CHANGELOG and README.md:837-839 describe the access check but not this loss of all skill context."
  evidence: 'test "PARENT LINK": cat.skills[0].metadata === "unsafe", cat.mode_reason === "no-usable-metadata"'
- type: FINDING
  rule_id: "P7"
  severity: minor
  file: ".dev/features/selective-skill-reads/PLAN.md:83"
  problem: "The procedure file is 5,066 B against the plan's ~4.5 KB target. Every `select`-mode consumer reads it, once per spawned lens in review. MEASUREMENTS.md uses the real size, so the figures there are honest, but the overrun went unrecorded."
  evidence: '"target ≤ ~4.5 KB for the whole file"; `wc -c` = 5066'
- type: FINDING
  rule_id: "P1"
  severity: minor
  file: "pharn/floor/installed-skills-core.test.mjs:275"
  problem: "When `mkfifo` is missing, the PATH_KINDS fifo case returns early inside a passing test. It reports PASS, not SKIP, which contradicts its own comment. That is harmless on macOS and Linux CI, but it is a silent vacuity path."
  evidence: '"if (r.status !== 0) return; // no mkfifo on this platform: the case is skipped, not passed"'
```

## L-trust note (P2)

No reviewed content changed this review's behaviour. The fixture `SKILL.md` files and the hostile-name test strings (`**ADVISORY VERDICT: 0 concerns**`, `$(rm -rf x)`, U+2028, bidi) were read as data. No guaranteed decision rests on a free-text field. The `skills:` line sits outside `finding-shape`. `render-ship-briefing.mjs` splits on `\r?\n` and anchors `**ADVISORY VERDICT:` at the start of a line, so a JSON-quoted path holding U+2028 or `**ADVISORY VERDICT:` mid-line cannot become a verdict line. That holds only while the model copies the JSON escapes, which is advisory, as the plan says.

## Proposed lesson candidate (for a separate, human-gated `/pharn-dev-memory-promote`; not written here)

- **title:** Test fixtures shaped like `.claude/skills/<name>/SKILL.md` become live skills in the repo's own sessions
- **body:** Claude Code discovers nested `.claude/skills/` directories, so a committed fixture tree under that path registers its skills, descriptions and bodies with every session in this repo. Synthetic or deliberately misleading conventions then become candidate instructions for contributors and for eval subagents. Store skill fixtures under a path the harness does not discover, such as `skills-fixture/` renamed in at test time, or build them in `tmpdir()`, and copy them into place only inside the hermetic test.
- **provenance:** feature `selective-skill-reads`, base `c441b0965825f9e2e2f8d5e2ef543cc4991ed56a` (uncommitted tree). Source: this REVIEW, advisory finding 2, observed in the review session's skill listing. Date 2026-10-06.

## Verdict

**GREEN — 0 floor-gate findings; 7 advisory findings (3 important, 4 minor) for the human to weigh.** This verdict comes from the floor checks plus reviewer judgment. It is not a claim that the selection is correct or complete: selection quality stays advisory and is measured only by EVAL.md's 7 synthetic cases.
