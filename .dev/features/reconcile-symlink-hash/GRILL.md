# GRILL — reconcile-symlink-hash

**Header.**

- Plan: `.dev/features/reconcile-symlink-hash/PLAN.md`.
- Spec-hash check: **MATCH** (`edc3d07d…5d2c`).
- **Step 1b lessons-declaration verdict (FLOOR): GREEN.** `check-plan-lessons.mjs` exited 0, and all 8 cited ids
  (L1, L2, L17, L29, L34, L52, L54, L57) resolve and are referenced in the plan body. This covers the declaration
  only. It never says whether the lessons were applied.

Grillers discovered: 13 (`count-grillers.mjs`). The deterministic plan scanners reported nothing:

- `scan-plan-secrets`: `{"found":false}`
- `scan-plan-pii`: `{"found":false}`
- `scan-plan-i18n`: `{"found":false}`
- `scan-plan-migrations`: `{"mentions":false}`
- `scan-plan-observability`: `{"mentions":false}`

Applied inline: testability, error-handling, security, documentation and architecture. The other eight (a11y,
comprehension, coupling, i18n, migrations, observability, performance, privacy) raised nothing. The change is one
fallback branch in one hashing function, plus tests and doc lines. It touches no UI, no network, no user data and no
schema key. `readlinkSync` runs only on the non-file or failed-open path, so the fingerprint's measured cost is
unaffected.

## Findings

```yaml
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/reconcile-symlink-hash/PLAN.md:74"
  problem: "The adopted digest `sha256(\"symlink\\0\" + readlinkSync(abs))` decodes the link text as UTF-8 (readlinkSync's default encoding), so two link targets that differ only in invalid UTF-8 bytes decode to the same U+FFFD string and hash equal. The guarantee-audit claim 're-pointing such a link is still detected' is then false for those targets. enumerate() rejects non-UTF-8 PATHNAMES, but a link's TARGET text is not a pathname it enumerates. Remedy: read the link as a Buffer and hash the raw bytes after the `symlink\\0` prefix. For every valid-UTF-8 target that is byte-identical to the downstream digest, so pharn-starter compatibility is kept. Add a PATH_KINDS-adjacent case, skipped where the filesystem refuses a non-UTF-8 link target."
  evidence: "its digest domain is adopted byte-for-byte: `sha256(\"symlink\\0\" + readlinkSync(abs))`"
- type: FINDING
  rule_id: P0
  severity: important
  file: ".dev/features/reconcile-symlink-hash/PLAN.md:50"
  problem: "The plan edits reconciliation-record.md because its `entries` row becomes false (L2). The same contract's section 3 lists 'a path unreadable during reconcile' under WARN with 'verdict unaffected', but check-bash-reconcile.mjs (lines 379-384, and the REVIEW test 'an unreadable path is treated as CHANGED') makes such a path a candidate, so it can produce an ESCAPE. That row describes the same referent this increment changes, what happens when hashFile returns null, and a reader of the edited contract would still be told the old rule. Correct it in the same edit (L50: sweep the cites of the referent, not only the spelling being changed)."
  evidence: '`reconciliation-record.md`''s `entries` row today reads "SHA-256 of its bytes", which becomes false for a link'
- type: FINDING
  rule_id: P0
  severity: minor
  file: ".dev/features/reconcile-symlink-hash/PLAN.md:92"
  problem: "The table row 'symlink → directory / non-regular target → link text' overstates. A link to a FIFO blocks at open (the plan's own Out of scope says so), and a link to a socket fails open with ENXIO/EOPNOTSUPP, which is outside LINK_TEXT_ERRNOS, so it stays null and remains a standing candidate. Word the row as 'a non-regular target that opens (directory, device)' and let the unreadable/other-errno row own the rest."
  evidence: "| symlink → directory / non-regular target | `sha256(\"symlink\\0\" + linkText)` — **new** |"
- type: FINDING
  rule_id: P1
  severity: minor
  file: ".dev/features/reconcile-symlink-hash/PLAN.md:102"
  problem: "The CWE-367 closure pin ranges over the source between `export function hashFile` and `export function snapshotScope`. The link-text helper must sit inside that region, or the closure either fails on a correct file or never sees the readlink call. The plan does not say where the helper goes. State it, so the pin covers the new call rather than being satisfied beside it."
  evidence: 'the path-addressed `*Sync(abs` calls in the `hashFile` region are exactly `["openSync(abs", "readlinkSync(abs"]`'
```

## Summary

- **Security.** The errno gate is the right call. The downstream patch's any-error fallback would let `chmod 000` on
  a link's target silence a change to a denied file, which is the evasion the existing REVIEW test pins for plain
  paths. F1 is the one real hole in the adopted formula: a lossy decode makes the "re-pointing is detected" claim
  false for a class of targets. Hashing bytes closes it at no compatibility cost.
- **Testability.** The `PATH_KINDS` enumeration plus the errno closure is the L29/L52 shape. The e2e CLEAN case has
  its ESCAPE mirror on the same fixture (L34). The root-skip on the `EACCES` row is stated, not hidden. F4 is about
  keeping the source pin honest.
- **Error-handling.** Every unexpected errno keeps returning `null`, so the fallback cannot turn an unknown failure
  into a stable digest. The unknown-errno direction stays fail-closed.
- **Documentation.** L2 is applied to the `entries` row. F2 asks for the neighbouring §3 row, which is already wrong
  about the same null-hash referent. The upgrade straddle and the collision bound are both stated, not implied away.
- **Architecture.** One function in one module keeps its axis (P3). `worktree-fingerprint.mjs` is a doc line only,
  and `check-bash-reconcile.mjs` needs no code change because it already treats a present hash generically.

ADVISORY VERDICT: 4 concerns raised (0 blocking-severity, 2 important, 2 minor) — for the human to weigh before
/pharn-dev-build. The Step 1b floor verdict (GREEN) is reported in the header and is not counted here.
