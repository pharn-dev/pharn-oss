# VERIFY — loop-cost-ledger

**Head:** `8dacaa9` · **Verdict (FLOOR, `pharn/floor/check-verify.mjs`, exit 0): `PASS`**

## FLOOR layer — the gates that OWN the verdict

| gate           | exit | what it covers                                                                      |
| -------------- | :--: | ----------------------------------------------------------------------------------- |
| `test`         |  0   | the whole hermetic suite, **2240/2240, 0 skipped** — includes this feature's own 60 |
| `validate`     |  0   | the structural floor, 36 capabilities                                               |
| `lint`         |  0   | eslint, whole-repo                                                                  |
| `format:check` |  0   | prettier, whole-repo                                                                |
| `lint:md`      |  0   | markdownlint, whole-repo                                                            |
| `reconcile`    |  0   | `check-bash-reconcile --require-baseline` → **CLEAN**, 0 escapes, 4 exempted        |

`failing_gates[]`: **empty**. The four style/test gates are exactly the repo's `npm run check` aggregate,
so this verdict tracks the full aggregate (L9's style-gate hole, closed at verify rather than left to CI).

**No `structural:*` gate appears, and its absence is correct, not an omission.** A `structural:<expected>`
gate exists per committed eval pair **the feature ships**. This increment adds no `role:`-bearing
capability, so it ships no eval pair — exactly as `loop-decision-integrity` did. The feature-specific
correctness signal here is its own 60 tests, collected by `test`.

## The `reconcile` gate — the one worth reading closely

`reconcile: 0` (`CLEAN`) is the gate that answers fix #7's blind spot: a **Bash** write reaches every
path unguarded, and this checker re-hashes the tree and asks the **live guards**, by executing them,
whether each changed path would have been denied.

It matters here because this increment deliberately writes through Bash — the marker file and the
emitter's own `cost.json` — and because **it already caught a real defect mid-build**: the fixture files
were declared as a bare directory, which authorizes nothing inside it, and the gate returned `ESCAPE`
naming all three with `denied_by: "writes-scope (snapshot)"`. That was fixed the prescribed way
(declare the concrete paths, re-run the setter, amend the epoch — three amendments are on the record),
**never** by hand-editing the baseline, which would have silenced the detector rather than answered it.

**The bounds are the contract's, not this stage's** (`pharn/pharn-contracts/reconciliation-record.md`):
the reconciled set excludes git-ignored paths, the window is anchor→reconcile, the model is one worktree
per session, and there is **no attribution** — it reports _what_, never _who_. **`CLEAN` means no escape
was detected, never that none occurred.** And the detection is **non-adversarial**: the baseline is
unauthenticated state under `.pharn/`, which Bash reaches, so a writer who edits a denied file _and_
rewrites its baseline entry obtains a silent `CLEAN`. This is an accounting tool against tooling that
escapes its scope, not a control against an attacker.

## ADVISORY layer — verifiers

**No verifiers registered — floor gates only.** `node pharn/floor/count-verifiers.mjs .` →
`{"registered":0,"verifiers":[]}`, a deterministic **frontmatter** read, never a prose grep (a
`role: verifier` string in prose is DATA _about_ verifiers, not a declaration _of_ one). Step 2 is a
no-op and the verdict is the floor gates alone. No verifier is authored speculatively (P7).

## Verdict

**VERIFIED: floor gates PASS.**

**The honest residual (P0/P7).** _Verified_ = **the named gates passed** — that is the entire content of
the word. It is **NOT** a guarantee of correctness beyond what those gates check: a defect no test, eval,
rule or lint covers is invisible to this verdict, and the verifier layer that might have noticed it is
advisory and, today, empty. Verifier concerns would be advisory help, never assurance.

**Two bounds specific to this increment, stated because they are easy to over-read:**

- **A green `test` gate does not mean the cost ledger's numbers are right.** The 60 new tests certify the
  emitter and checker against **committed fixtures** and against each other. `check-cost-ledger.mjs`'s own
  header says the rest: it certifies a file's **internal consistency**, never that `requests[]` matches the
  transcript — and one of those tests proves it by building a self-consistent **fabricated** ledger that
  passes. That gap is closed only by `--verify-transcript`, which works only while the transcript exists.
- **This stage ran against an already-pushed commit.** The chain's ordering was broken by a mid-build
  commit to `main`; regress and verify are both green against it, but a green verify on a pushed commit is
  reassurance, not the post-review gate. `/pharn-dev-review` is next, and the human's GATE-2 decision
  after it is the thing that was actually skipped.
