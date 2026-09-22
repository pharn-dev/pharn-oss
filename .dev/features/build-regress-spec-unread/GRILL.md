# GRILL — build-regress-spec-unread

Plan: `.dev/features/build-regress-spec-unread/PLAN.md` · spec-hash: **match** (`2f8b9264…e838`) · Step 1b
lessons declaration: **GREEN** (`check-plan-lessons.mjs` exit 0).

Grillers: 13 registered. All five deterministic plan scanners reported no hits, and every axis beyond
documentation, trust and testability is inapplicable to a prose edit in two commands.

**Scope-count check (L20/L53, by hand):** `set-writes-scope.cjs --from-plan` parsed **5 paths against 5
declared bullets**.

## Findings

```yaml
- type: FINDING
  rule_id: "P0"
  severity: important
  file: ".dev/features/build-regress-spec-unread/PLAN.md:5"
  problem: "The prompt's required Step 1.2 sentence says intent fidelity is `/pharn-grill`'s job before build (AC coverage) and `/pharn-verify`'s after. Probed: `/pharn-grill` does interrogate 'Acceptance-criteria coverage → P1' (`pharn-grill.md:203-205`), as ADVISORY interrogation. `/pharn-verify`'s only intent check is its verifier slot (`pharn-verify.md:58-62`), which has ZERO verifiers registered today (`count-verifiers.mjs` → 0). Its floor gates run the project's suite, not the SPEC. Written bare, the sentence reads as if some stage GATES intent fidelity, and none does."
  evidence: "`/pharn-build` and `/pharn-regress` stop reading `SPEC.md`'s body"
```

Recommendation: keep the sentence the prompt requires, and qualify it in place. Grill's AC coverage is
advisory interrogation. Verify's is its verifier slot, which is empty today. So removing the SPEC read
here moves no gate, because none of the three stages gates intent fidelity.

```yaml
- type: FINDING
  rule_id: "P4"
  severity: minor
  file: ".dev/features/build-regress-spec-unread/PLAN.md:57"
  problem: '`pharn-build.md:173`''s ''(the SPEC''s "no skills → unchanged" path)'' is kept as a historical citation, but a reader who has just been told NOT to read SPEC.md may read it as an instruction to consult the feature''s SPEC. It is borderline (b).'
  evidence: "A historical citation, not an instruction to read"
```

Recommendation: leave the bytes (out of the plan's list), and name it in the post-build (b) list so a
reviewer sees it was a deliberate KEEP.

## Summary

This is a small, well-bounded prose change. The discovery is full-file, and it found one (a) line the
prompt missed. The chain is untouched, and the advisory label on "not reading" is present. The one real
risk is the required sentence overclaiming where intent fidelity is checked. Qualifying it in place
fixes that without dropping it.

ADVISORY VERDICT: 2 concerns raised (0 blocking-severity, 1 important, 1 minor) — for the human to weigh
before `/pharn-dev-build`. The Step 1b floor verdict is GREEN and is reported above, separately.
