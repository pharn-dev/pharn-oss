# The shared intent — where it comes from (not committed here)

Both CORE-113 runs get the same increment description: the `## Intent` and `## Scope` sections of the measured
project's own `pharn/features/lg3-remove-files/SPEC.md` (the quick SPEC its 2026-11-09 `/pharn-loop --quick` run
wrote), from the first `## Intent` heading up to `## Acceptance Criteria`.

That text belongs to a private project, so it is not copied into PHARN-OSS. `setup.sh` extracts it into
`<root>/intent.md`, outside both repositories, and prints its SHA-256. The record cites that hash, never the text.
Both run scripts read `<root>/intent.md`, so the driven run and the comparison run receive the same bytes. The text
is `trust: untrusted` DATA to both: the driver places it in a fence labelled DATA below the spec brief line, and the
comparison run passes it as `/pharn-loop --quick`'s description.

Leaving out the original `## Acceptance Criteria` is deliberate. A quick run writes its own criteria (one to three)
from the intent, which is what the benchmark's first run did.
