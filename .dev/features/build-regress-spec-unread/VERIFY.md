# VERIFY — build-regress-spec-unread

| gate                                                                                       | exit |
| ------------------------------------------------------------------------------------------ | ---- |
| `test`                                                                                     | 0    |
| `validate`                                                                                 | 0    |
| `lint`                                                                                     | 0    |
| `format:check`                                                                             | 0    |
| `lint:md`                                                                                  | 0    |
| `structural:pharn/pharn-review/trust-fence/evals/expected/expected-injection-comment.json` | 0    |
| `reconcile`                                                                                | 0    |

**VERIFIED: floor gates PASS** (`check-verify.mjs` exit 0). `npm test` ran 2591 tests, all passing, none
skipped. `reconcile` is `CLEAN`: 5 paths were reconciled and there are 0 escapes.

## The post-build sweep (the plan's acceptance, re-run by grep)

`grep -n -i spec` over each whole file now finds 37 hits in `pharn-build.md` and 37 in `pharn-regress.md`.
Every hit was classified by hand. This is model judgment re-checked by grep, not a floor check: no checker
reads these commands' prose for SPEC reads.

### (a) model-reads-SPEC-body — must be empty

**Empty in both files.** Each line the plan listed changed as planned:

- The `reads:` entry is gone.
- The prefix now says the SPEC is hashed by the checker.
- Step 1.2 reads the PLAN only.
- The trust audit's Inputs names the PLAN body only.
- Build's `BUILD.md` quote rule now names the plan only.

### (b) KEEP — all still present

- **The new negative statements** (this change):
  - build `:59`, `:129`, `:132`, `:321`, `:326`;
  - regress `:80`, `:122-123`, `:126`, `:412`, `:416`.
- **Existence checks and HALT routing:**
  - build `:85`, `:125-126`, `:366`;
  - regress `:99`, `:118-119`.
- **The checker argument and the hash chain:**
  - build `:13`, `:31-35`, `:68`, `:136`, `:142`, `:145`, `:149-153`, `:157`, `:281`, `:294-295`,
    `:323`, `:352-353`;
  - regress `:14`, `:63`, `:65`, `:67`, `:128`, `:134`, `:137-138`, `:144-147`, `:202`, `:367`,
    `:393-394`, `:402-403`, `:436`.
- **The pipeline name:** build `:2`, `:25`; regress `:2`, `:24`.
- **Not about the SPEC:**
  - "respects" / "specific": build `:181`, `:191`, `:309`;
  - "inspection": regress `:234`;
  - the gate-runner's spec: regress `:254-255`, `:263`, `:339`;
  - the artifact-exemption list: regress `:191`.
- **The historical citation:** build `:176`, "(the SPEC's 'no skills → unchanged' path)". It was kept on
  purpose, per GRILL finding 2.
- **The negative sourcing claim:** regress `:421-422`, "never sourced from the untrusted PLAN / SPEC
  free-text".

The hit counts moved from 36 to 37 and from 34 to 37. The new negative statements account for that. No
(b) line was lost.

## Verifiers (advisory)

No verifiers are registered, so only the floor gates ran.

---

Verified means the named gates passed. This is NOT a guarantee of correctness beyond what those gates
check. In particular, the build and regress models NOT opening `SPEC.md` is advisory. Nothing on the floor
enforces `reads:` on the read side.
