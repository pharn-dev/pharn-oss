# VERIFY — loop-driver-spike

The gates ran through `pharn/floor/run-gates.mjs` (`init`, then one `run --next` call per gate, with
`--timeout-ms 3600000`), and the verdict is `check-verify.mjs --stamp`, exit 0.

This is the **third** verify run, and all three read PASS:

1. Stamp `53d47304…`, before the GATE-2 fixes (REVIEW.md).
2. Stamp `981dd9c4…`, after them.
3. This one, after the post-PR fix for the diff-coverage gate: tests for every uncovered added line, and the two driver
   defects those tests found (SHIP.md, "After the pull request").

| gate                 | exit | wall    |
| -------------------- | ---: | ------- |
| `test` (`npm test`)  |    0 | 652.1 s |
| `validate`           |    0 | 0.1 s   |
| `lint`               |    0 | 4.8 s   |
| `format:check`       |    0 | 32.4 s  |
| `lint:md`            |    0 | 9.9 s   |
| `instruction-growth` |    0 | 0.2 s   |
| `reconcile`          |    0 | 0.6 s   |

- **Completeness** (`stamp.aux.completeness`): exit 0, every concrete `## Files` path present.
- **Stamp:** `stamp_sha256` `0a75d954…`. Fingerprint `worktree-fingerprint/3+sha256` `cb40cf8e…`.
- **The increment's own test** (`.dev/features/loop-driver-spike/driver/loop-driver.test.mjs`) is inside `npm test`
  through its `.dev/**/*.test.mjs` glob.

**VERIFIED: floor gates PASS.**

No verifiers are registered, so this verdict comes from the floor gates only.

_verified = the named gates passed; this is NOT a guarantee of correctness beyond what those gates check — verifier
concerns are advisory help, not assurance._ In particular, nothing here re-runs the spike's live measurements. The
record's figures rest on the maintainer's runs, not on these gates.
