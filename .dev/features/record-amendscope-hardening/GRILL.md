# GRILL — record-amendscope-hardening

Interrogation of the approved `PLAN.md`. **The only proceed/stop input here is a floor exit code**; every
finding below is model judgment and gates nothing (fix #3 — an LLM-assigned `severity` is never read as a
floor verdict).

## Floor verdict (the one branch input)

```text
node pharn/floor/check-plan-lessons.mjs .dev/features/record-amendscope-hardening/PLAN.md \
  .dev/memory-bank/lessons-learned.md
GREEN — applied_lessons: L1, L20, L35; all 3 cited id(s) resolve and are referenced in the plan body.
exit: 0
```

**exit 0 → proceed.** Bound, restated because it is the whole point: GREEN means the **declaration** is
well-formed, never that L1, L20 and L35 were genuinely applied.

Spec-hash check (advisory here; `/pharn-dev-build` is where drift blocks): the plan pins
`83890d97…16fd9487` and `node .dev/floor/hash-doc.mjs pharn/ARCHITECTURE.md` returns the same value this
run. No drift.

## The interrogation

### Q1 — Does `## Files` name every site the bump invalidates? (L1's question, asked directly)

**Answered YES, by measurement rather than by reading the plan.** Swept every file asserting the literal
`5.1.0` and classified each:

| site                                             | verdict                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| `SKILLS_VERSION`                                 | in `## Files` — the fact itself                                        |
| `README.md:24` (shields badge)                   | in `## Files` — bound by `check:badge`                                 |
| `CHANGELOG.md`                                   | in `## Files` — the join key                                           |
| `pharn/pharn-contracts/reconciliation-record.md` | **must NOT change** — see Q2                                           |
| `package-lock.json`                              | not ours — third-party dep pins (`estraverse`, `slash`)                |
| `.dev/features/**`                               | historical build records; `.dev/` is apparatus and never version-swept |

Two negative checks that would each have widened `## Files` had they come back the other way, run rather
than assumed: the README's generated `CURRENT-STATE` region carries **no** version string, so
`npm run docs:generate` is not implicated and `docs:check` cannot fight this edit; and root
`pharn.config.json` holds only `models.stages` + `ship.requireAttestation`, no version key. (The
version-bearing `pharn.config.json` is the one the **installer** writes into a user's project — a
different file, per CLAUDE.md.)

### Q2 — The trap this increment could walk into: a naive version sweep

**`pharn/pharn-contracts/reconciliation-record.md` mentions `5.1.0` twice, and both are HISTORICAL and
correct:** _"absent on a pre-5.1.0 record"_ (line 76) and _"Why ONE snapshot was not enough —
`scope_amendments` (5.1.0)"_ (line 86). They name **when the field was introduced**, which does not move
when the patch version does.

Rewriting them to `5.1.1` would be wrong twice over: it would falsify a true statement about the record
format, and — because that file is on the product surface — it would itself be an unbumped
product-surface change, i.e. the very defect this increment exists to discharge. Flagged because
"find every `5.1.0` and update it" is the obvious wrong implementation of this plan, and the plan's
`## Files` is what structurally prevents it: the file is not listed, so fix #7 denies the write.

### Q3 — Is the `[Unreleased]` insertion point unambiguous?

Yes. The section's own HTML comment states the rule (`markdownlint` MD024 is `siblings_only`, so exactly
one heading per type; a new entry joins its existing group **at that group's top**). `[Unreleased]`
carries `### Deferred` (:15), `### Fixed` (:53), `### Changed — BREAKING` (:1337), `### Added` (:1378),
`### Changed` (:1864). A TOCTOU hardening is a **fix**, so the entry joins `### Fixed` at its top. No new
heading is opened.

### Q4 — Is the P7 justification real, or manufactured?

**Real, and the plan states the measurement honestly rather than the largest available number.** A
per-commit sweep of all 222 commits finds 34 that touch the bump-triggering set without touching
`SKILLS_VERSION` — but that count is **inflated and the plan does not use it**, because the discipline is
a bump per _change_, not per _commit_, and a bump landing in a sibling commit of the same PR is correct
practice. The defensible statement is the one the plan makes: at HEAD, `26ab408..HEAD` contains exactly
one commit and exactly one product-surface file, and no bump has followed.

### Q5 — Does the plan overclaim anywhere? (P0)

No, and one line is worth quoting because it is the easy overclaim to make and the plan declines it:
_"Do not write that this increment closes that gap; it discharges one instance of it."_ The guarantee
audit correctly labels "the bump TRACKS the product bytes that changed" as **advisory** and names both
gates that were exit 0 while the bump was missing.

## Findings (ADVISORY — these gate nothing)

- **F1 — `severity: advisory`.** The deferred detector (GATE 1 answer: defer) leaves the gap open. This
  is the third occurrence of the shape, and L20's own text says a second occurrence is evidence the
  discipline remedy is the wrong kind. Deferring is a legitimate human call — it was made explicitly at
  GATE 1, with the two design problems named — but it should be recorded in `SHIP.md`'s `deferred:` list
  with the trigger measured, so a fourth occurrence meets a standing record rather than a fresh
  discovery.
- **F2 — `severity: advisory`.** `c338b9d`'s commit message is the bare word `fix`. Nothing on the floor
  reads commit messages and none of this repo's gates care, so this is style, not a defect — but the
  CHANGELOG entry this increment writes is now the **only** durable description of what that commit did,
  which raises the entry's burden. Noted so the entry is written to carry that weight.

## Verdict

Floor gate **exit 0** → **proceed to `/pharn-dev-build`**. Both findings are advisory and neither is a
stop.
