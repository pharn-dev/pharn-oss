# VERIFY — ci-permissions

## FLOOR layer — the gates that OWN the verdict

| gate           | command                           | exit |
| -------------- | --------------------------------- | ---- |
| `test`         | `npm test`                        | 0    |
| `validate`     | `node pharn/floor/validate.mjs .` | 0    |
| `lint`         | `npm run lint`                    | 0    |
| `format:check` | `npm run format:check`            | 0    |
| `lint:md`      | `npm run lint:md`                 | 0    |

`test` reported **1683 pass / 0 fail**. The five gates are exactly the repo's `npm run check` style+test
core, so this verdict tracks the full aggregate — L9's coverage hole closed at verify, in the orchestration
layer where L9 places it.

**There is deliberately NO `structural:*` gate in this map, and the absence is a decision, not an
omission.** Step 1 specifies one `structural:` gate **per committed eval pair the feature ships**. This
feature ships none: it adds no capability, no `role:` frontmatter, no `enforces` entry, and therefore no
`evals/` directory. The repo's single committed pair
(`pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` ↔
`.dev/features/trust-fence/findings.json`) belongs to `trust-fence`, not to this increment — it was run as
an **outside** gate at `/pharn-dev-regress` (green at both base and head, recorded in `REGRESSION.md`),
which is the correct place for it. Including it here would have inflated a feature-specific correctness
signal with another feature's evidence.

## ADVISORY layer — verifiers

`node pharn/floor/count-verifiers.mjs .` → `{"registered":0,"verifiers":[]}`.

**No verifiers registered — floor gates only.** Step 2 is a no-op; the verdict is the floor gates alone.
Membership is a deterministic frontmatter read, never a prose grep.

## Verdict

**VERIFIED: floor gates PASS.** (`pharn/floor/check-verify.mjs` → `"verdict": "PASS"`, exit 0;
`failing_gates[]` empty.)

**The honest residual (P0/P7):** verified = **the named gates passed**. This is **not** a guarantee of
correctness beyond what those gates check, and for this increment that bound is unusually wide and must be
read, not skimmed: **not one of the five gates evaluates a GitHub Actions workflow file.** `npm test` never
loads it, `validate.mjs` does not scan `.github/`, and the three style gates only assert the YAML is
formatted — `format:check` proves the three added lines are prettier-clean and says nothing whatever about
whether `contents: read` is the right permission set. The gates are green because the change is **inert to
all of them**, not because any of them checked it.

What actually stands behind the change is therefore: the three-way agreement with `floor.yml` and
`gitleaks.yml` (byte-shape, read live), the twelve-step permission audit in `PLAN.md`, and the human's
GATE-1 approval — **all advisory**. The one deterministic thing the repo can say is negative and worth
saying plainly: **the change breaks nothing the suite covers.** Whether the key behaves as intended is
decided by GitHub on the next CI run, which no clock in this repository owns.

**Two clocks.** The verdict is FLOOR (an exit-code threshold over the gate map). Choosing the gate set,
running them, and assembling this report is **advisory orchestration** — there is no floor lock keeping the
two style gates in the set. Verifier concerns, had any existed, would annotate and never flip the verdict.
