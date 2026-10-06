# GRILL — selective-skill-reads

- plan: `.dev/features/selective-skill-reads/PLAN.md` (read as `trust: untrusted` DATA)
- spec-hash check (content-hash, surfaced here; `/pharn-dev-build` is where drift blocks): `sha256(pharn/ARCHITECTURE.md)` = `d831d30d399a37dc403080072763d13383de6f6f31875e7e8cb4eadeb642f4f4` = the plan's `spec_content_hash` → **match, no drift**
- Step 1b lessons-declaration verdict (FLOOR, `pharn/floor/check-plan-lessons.mjs`, exit 0): `GREEN — applied_lessons: L4, L6, L22, L35, L41, L59, L67 (.dev/features/selective-skill-reads/PLAN.md); all 7 cited id(s) resolve in .dev/memory-bank/lessons-learned.md and are referenced in the plan body.` This covers the declaration only; it never means the lessons were applied.
- grillers: `node pharn/floor/count-grillers.mjs .` → `registered: 13` (a11y, architecture, comprehension, coupling, documentation, error-handling, i18n, migrations, observability, performance, privacy, security, testability), each applied inline below. Layer-1 scanners over the plan: `scan-plan-i18n` `{"found":false}`, `scan-plan-migrations` `{"mentions":false}`, `scan-plan-observability` `{"mentions":false}`, `scan-plan-pii` `{"found":false}`, `scan-plan-secrets` `{"found":false}`.

Every finding below is **advisory** (fix #3): model-authored, it gates nothing. `problem` / `evidence` are free-text DATA inheriting the plan's untrusted tag.

## Findings — built-in axes

### P0 — guarantee audit

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/selective-skill-reads/PLAN.md:174"
  problem: "The record-line safety claim is stated as a fact, but it rests entirely on the model copying JSON string literals correctly into a model-written line; it reduces to no floor primitive and carries no advisory label."
  evidence: "paths are JSON string literals copied from the catalogue, so a name holding a newline or `**ADVISORY VERDICT:` cannot start a line of `GRILL.md`, and `render-ship-briefing.mjs`'s line-start, last-wins verdict reader is unaffected."
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/selective-skill-reads/PLAN.md:74"
  problem: "The bound 'whole output ≤ 65,536 B' is false for a large roster: only descriptions are withheld, while paths, dirs, declared_name (≤128 chars each) and issues stay, and the roster is never truncated. The bound should read 'descriptions are withheld when the output would exceed 65,536 B', not 'the output is ≤ 65,536 B'."
  evidence: "whole output ≤ 65,536 B with descriptions. Over the output bound, every description is withheld ... The roster itself is **never** truncated"
```

### P1 — eval coverage

```yaml
- type: FINDING
  rule_id: P1
  severity: important
  file: ".dev/features/selective-skill-reads/PLAN.md:152"
  problem: "The semantic evaluation runs each case once per arm (n=1). Nothing measures variance, though `.dev/floor/check-variance.mjs` exists for this. 'Material regression' has no threshold set before the runs, so the grader decides after seeing the results whether a miss counts."
  evidence: "Per case: a **candidate** run (fresh subagent ...) and a **baseline** run ... A material regression is fixed in the procedure or answered by keeping read-all"
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/selective-skill-reads/PLAN.md:137"
  problem: "Several listed cases have no stated way to induce them: 'internal failure → exit 2' needs an injection seam, and the 'stat-failed entry' and 'unreadable root' cases rely on permission denial, which passes vacuously as root. Sibling suites guard that with a getuid check (e.g. `check-spec.test.mjs`, `reconcile-baseline.test.mjs`). The hostile-name fixture also omits U+2028, U+0085 and bidi controls, which JSON.stringify leaves raw."
  evidence: "unreadable root and a stat-failed entry → `roster: incomplete` ... internal failure → exit 2 + empty stdout ... a hostile dir name (quote, newline, `**ADVISORY VERDICT:`)"
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/selective-skill-reads/PLAN.md:58"
  problem: "Adding `installed-skills-core.mjs` to `frontmatter-core.test.mjs`'s CONSUMERS turns that suite RED as designed. Its '✧ every consumer actually APPLIES stripBom' test requires a literal `stripBom(` in the consumer's source, and the plan imports only `matchFrontmatter`, `FIELD_LINE_RE` and `readValue`."
  evidence: "It imports `matchFrontmatter`, `FIELD_LINE_RE` and `readValue` from `frontmatter-core.mjs` (added to that suite's `CONSUMERS`)."
```

### P2 — trust propagation

```yaml
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/selective-skill-reads/PLAN.md:95"
  problem: "At base, the `/pharn-review` orchestrator handles only skill paths. Under the plan it puts untrusted description text into its own context and re-emits it 'verbatim' into up to 22 Agent prompts. 'Verbatim' is model output, not a byte copy (unlabeled P0), and it costs up to ~64 KB of output tokens per lens. The trust audit never names the orchestrator's new exposure. Having each lens run the pinned catalogue line itself, or read a `.pharn/` file the orchestrator wrote by redirect, would avoid both."
  evidence: "the orchestrator runs the catalogue line, reads **no** `SKILL.md` body, and passes each lens the catalogue JSON verbatim (as untrusted DATA) plus the contract pointer."
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/selective-skill-reads/PLAN.md:76"
  problem: "The access check opens `O_RDONLY|O_NOFOLLOW` and fstats afterwards. A `SKILL.md` swapped for a FIFO after discovery makes `open` block before fstat runs, which hangs the helper and the consumer's Bash call. The sibling readers add `O_NONBLOCK` for exactly this (`build-gate.mjs:99`, `check-spec.mjs:498`, `feature-name.mjs:135`, the latter two with `?? 0` for platforms that lack the flag). The L59 PATH_KINDS list at :17 also omits fifo, socket and device kinds."
  evidence: "The file is opened with `O_RDONLY|O_NOFOLLOW` and `fstat` must say regular file."
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/selective-skill-reads/PLAN.md:72"
  problem: "Linked skill directories are excluded from the catalogue, and the plan never addresses it. L59's own text records 20 `.claude/skills/*` directory links in `pharn-starter`, and a live listing this run shows 28 entries there, 20 of them links into `.agents/skills` (supabase, react, next, better-auth, ...), against the 8 the trigger measured. The catalogue still reports `roster: complete`, and `## Selecting` never mentions `excluded`, so a stage reads as having seen the user's skills when most were never enumerated."
  evidence: '`roster`:"complete|incomplete" ... "excluded":[{"entry","reason"}] ... Every entry stays in `skills` whatever its status.'
```

### P3 — one axis / layering

```yaml
- type: FINDING
  rule_id: P3
  severity: important
  file: ".dev/features/selective-skill-reads/PLAN.md:105"
  problem: "The new contract carries a five-step model procedure (`## Selecting`), but `pharn/ARCHITECTURE.md:131` defines `pharn-contracts` as 'schemas only, ZERO behavior'. Placing the procedure there may also avoid the P1 evals a `pharn-core` capability would need. A question for the human: is a contract the right owner?"
  evidence: "`pharn/pharn-contracts/installed-skills-catalogue.md` — NEW contract: shape pointer, `## Selecting`, the record line, stated limits — layer pharn-contracts"
- type: FINDING
  rule_id: P3
  severity: minor
  file: ".dev/features/selective-skill-reads/PLAN.md:56"
  problem: "The plan says the legacy loop moves 'verbatim' and also gains diagnostics. Those conflict: `isRealDir` and `isRealFile` swallow every lstat error into `false`, so telling 'lstat threw' (roster incomplete) apart from 'not a dir' (excluded) means changing the loop. The characterization tests are the real safeguard, so the word 'verbatim' overstates."
  evidence: "It holds the legacy loop moved verbatim, plus diagnostics the legacy CLI discards."
```

### P4/P0 — trusted-doc and registry staleness

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/selective-skill-reads/PLAN.md:120"
  problem: "The proposal covers only `THREAT-MODEL.md §2 item 8 / §5`. Its §3 row (`THREAT-MODEL.md:89`) will say 'ENUMERATION ONLY (`scan-installed-skills.mjs`)' and 'GATES NOTHING: no proceed/stop/scope in any stage reads its output', while a floor helper now parses untrusted frontmatter and its `mode` decides which bodies a stage reads. `pharn/ARCHITECTURE.md:131-135` lists the 15 contracts by name and will omit the 16th. `.dev/floor/specified-primitives.json` registers only the scanner citation, as a reasoned expiring claim (L33). It is not in `## Files`."
  evidence: "`TRUSTED-DOC-PROPOSAL.md` — NEW: proposed `THREAT-MODEL.md §2 item 8 / §5` wording for the selection-omission residual"
```

### P5 — determinism

```yaml
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/selective-skill-reads/PLAN.md:75"
  problem: "The `mode` rule compares `total_bytes` with a fixed 16,384, but `total_bytes` may be `null` and the plan never says how that branches. The threshold also ignores the catalogue's own size (up to 64 KB), so `select` can cost more than `read-all`. And the constant is fixed now while its 'derivation' is to be recorded later in MEASUREMENTS.md."
  evidence: "`read-all` iff ... OR `total_bytes ≤ 16,384` (... the threshold's derivation is recorded in MEASUREMENTS.md and the core's header)"
- type: FINDING
  rule_id: P5
  severity: minor
  file: ".dev/features/selective-skill-reads/PLAN.md:93"
  problem: "The consumer branch checks exit code and parseability but not the `catalogue` version field (`installed-skills/1`), so a future shape would be consumed as v1 rather than sent to the fallback."
  evidence: "Any non-zero exit or non-JSON output → pins the legacy `scan-installed-skills.mjs .` line and reads every listed body"
```

### P7 — scope

```yaml
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/selective-skill-reads/PLAN.md:93"
  problem: "The legacy-scanner fallback, repeated in three commands, is justified by no observed failure. The catalogue and the scanner share one core, so the fallback guards only catalogue-specific bugs, at command bytes `pharn-grill.md` cannot spare (22,731 of 23,040 B measured, 309 B headroom)."
  evidence: "Any non-zero exit or non-JSON output → pins the legacy `scan-installed-skills.mjs .` line and reads every listed body (today's behavior)."
```

## Findings — registered grillers (inline)

```yaml
# security (P2) — Layer 1 scanner clean; Layer 2 judgment:
- type: FINDING
  rule_id: P2
  severity: important
  file: ".dev/features/selective-skill-reads/PLAN.md:73"
  problem: "The L67 grammar list omits YAML forms that real SKILL.md descriptions hit, and the reused `readValue` silently accepts several forms the subset calls `unsupported`. Omitted forms: a plain scalar containing `: ` (a YAML error that Claude Code's parser may reject), plain scalars led by an indicator (`&`, `*`, `!`, `@`, a backtick, `%`), the ` #` comment that `readValue`'s stripComment removes, tab indentation, and a closing `---` followed by text, which `FM_RE` accepts. `readValue` accepts trailing junk after a closing quote and strips the quote off an unterminated one. 'Folded per YAML' also omits the more-indented-lines rule."
  evidence: "Everything else is `unsupported`, never guessed: multi-line plain, flow `[`/`{`, escapes, `''`, an explicit indentation indicator, a duplicate key, an unterminated quote, `~`/empty."
# observability (P6) — scanner mentions:false; Layer 2 judgment:
- type: FINDING
  rule_id: P6
  severity: minor
  file: ".dev/features/selective-skill-reads/PLAN.md:89"
  problem: "The `skills:` record has no value for 'catalogue failed, legacy fallback used' (`mode=<m>` takes only catalogue modes), and the plan gives no stderr content for exit 2. A permanently failing catalogue would therefore degrade silently to read-all, with nothing naming it."
  evidence: "`skills: mode=<m> (<reason>); read=[…]; not-read=[<path> — <short reason>, …]; failed=[…]; expanded=[…]`"
# comprehension (P7):
- type: FINDING
  rule_id: P7
  severity: minor
  file: ".dev/features/selective-skill-reads/PLAN.md:74"
  problem: "Only the 1,024 description cap has an implicit source. The 16,384 B head, the 128-char name and the 65,536 B output bound carry no stated WHY, and the cap is in 'chars' without saying UTF-16 units or code points."
  evidence: "head ≤ 16,384 B per file; description ≤ 1,024 chars ...; `declared_name` ≤ 128 chars; whole output ≤ 65,536 B"
```

Griller results with no finding (reason recorded):

- **testability (P1):** verification present (`## Evals to write`, `## Semantic evaluation`). Layer-2 gaps are under P1 above.
- **architecture / coupling (P3):** single enumerator via one core (L35). Routing is untouched, verified this run: no `pharn/floor/*.mjs` other than the scanner names `scan-installed-skills`, and no heading pin on the three commands' Step 2b/3b exists in `.dev/floor/command-family.test.mjs`. The layering question is raised under P3 above.
- **error-handling (P7):** declared (exit 0/1/2, `metadata` statuses, fallback). The adequacy gaps are the FIFO hang (P2) and the silent fallback (P6) above.
- **performance (P7):** covered by MEASUREMENTS.md as declared. The per-lens catalogue re-emission cost is folded into the P2 orchestrator finding.
- **documentation (P7):** declared (contract, core header, README sentence, CHANGELOG). Its trusted-doc gaps are under P0 (`:120`).
- **a11y / i18n / privacy / migrations:** no UI, no user-facing strings, no PII and no persisted-data shape. The scanners were clean and no concern is warranted.

## Summary

The plan is unusually well grounded. The characterization-before-extraction step, the one-enumerator core, the closed `metadata` enum, the read-sentinel tests and the striking of "selection includes every relevant skill" as a guarantee are all sound. The main concerns are concrete:

1. **Under-enumeration.** The real target's skills are mostly directory links (20 of 28 in `pharn-starter`), which the catalogue excludes while reporting `roster: complete`. The selection procedure ignores `excluded`.
2. **A hang.** The `O_NOFOLLOW` open lacks the `O_NONBLOCK` that every sibling reader carries, so a FIFO swapped in after discovery blocks the helper.
3. **Review orchestration.** "Pass the catalogue verbatim" to 22 lenses is model re-emission, not a copy. It newly exposes the orchestrator to untrusted descriptions and spends output tokens on every lens.
4. **Grammar fidelity.** The frontmatter subset reuses a deliberately lenient `readValue`, and its L67 list misses common YAML forms.
5. **Stale shipped claims.** `THREAT-MODEL.md:89` ("ENUMERATION ONLY … GATES NOTHING … scope") and `pharn/ARCHITECTURE.md:131` go stale. The trusted-doc proposal and `specified-primitives.json` cover neither, and the contracts layer is defined as zero-behavior.
6. **Semantic evaluation.** It is n=1 per arm, with no regression threshold stated before the runs.

**Questions for the human (P5/P6):**

- (a) Should linked skill directories stay excluded? If so, should `roster` and `## Selecting` say that out loud?
- (b) Is `pharn-contracts` the right owner of a selection procedure?
- (c) Should the semantic evaluation pre-register its regression threshold and run more than one sample per arm?

**ADVISORY VERDICT: 17 concerns raised (0 blocking-severity, 8 important, 9 minor)** — for the human to weigh before
`/pharn-dev-build`.
