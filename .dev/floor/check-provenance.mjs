#!/usr/bin/env node
// .dev/floor/check-provenance.mjs — the PROVENANCE + DUPLICATE-ID + ENTRY-TAG checker for the build apparatus's
// own memory-bank (`.dev/memory-bank/`), run by /pharn-dev-memory-promote before its human accept/deny gate.
//
// A THIN WRAPPER since 6.69.0 (audit ARCH-6). Every check — target enum, canon-arg binding, provenance shape,
// Gregorian date, whitespace-free and unique id, `type` enum, `concepts` shape — is
// pharn/floor/check-provenance.mjs's checkProvenance(). This file used to be a hand-kept second copy of it; two
// product-only patches once missed it for a whole release line (lessons-learned L31), which is why the copy is
// retired rather than kept in sync (L35). The dependency points `.dev/` -> `pharn/`, the only direction an
// install (which ships without `.dev/`) allows.
//
// The two settings this surface passes, and why:
//   - canonRoot `.dev/memory-bank`: the targets are `.dev/memory-bank/{lessons-learned,pattern-library}.md`.
//   - strictCommit: `commit` must be a git SHA; the product's honest-absence literal `unknown` is REFUSED. This
//     repo always has a commit, so admitting it would buy nothing and weaken the provenance of PHARN's own canon.
//     /pharn-dev-memory-promote therefore halts and asks on a failed `git rev-parse HEAD` rather than writing it.
// A ✧ closure test (check-provenance.test.mjs) refuses any other top-level declaration here, so a validation rule
// cannot quietly grow back into this file.
//
// FLOOR, and only this: the exit code is the shared checker's (enum / regex / presence / set membership). ADVISORY:
// whether the lesson is true, general or worth canonizing, and whether `type` / `concepts` describe it.
//
// Usage:  node .dev/floor/check-provenance.mjs <candidate.json> <canon-file.md>
// Exit: 1 on any RED (prints each), 0 + "GREEN — ..." otherwise.

import "../../pharn/floor/runtime-floor.mjs";
import { checkProvenance } from "../../pharn/floor/check-provenance.mjs";

export const DEV_CANON_ROOT = ".dev/memory-bank";

if (import.meta.main) {
  process.exit(
    checkProvenance(process.argv[2], process.argv[3], {
      canonRoot: DEV_CANON_ROOT,
      strictCommit: true,
      self: ".dev/floor/check-provenance.mjs",
    })
  );
}
