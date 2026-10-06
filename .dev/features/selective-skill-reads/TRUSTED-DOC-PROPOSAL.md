# Proposed trusted-doc edits — selective-skill-reads (for a human to apply)

`THREAT-MODEL.md` and `pharn/ARCHITECTURE.md` are human-only: `protect-trusted-paths.cjs` denies the agent's write
tools on both. Nothing in 6.47.0 depends on these edits, and nothing in this increment's floor reads them. They keep
the trusted docs from going stale against the shipped behaviour. **Apply them in a separate commit after this
increment's verify** (L68: a human-only edit inside the build's anchor→verify window reads as an escape at
reconcile). Applying them changes `pharn/ARCHITECTURE.md`'s content-hash, which the next `/pharn-dev-plan` re-pins.

## 1. `THREAT-MODEL.md` §2, item 8 — the delivery sentence (currently lines 57–59)

Current:

> `/pharn-build`, `/pharn-grill` and `/pharn-review` enumerate these (`pharn/floor/scan-installed-skills.mjs`) and
> feed the bodies to the model as untrusted context; `/pharn-review` hands them to **each lens subagent it spawns**.

Proposed:

> `/pharn-build`, full `/pharn-grill` and each `/pharn-review` lens subagent list these through a body-free
> catalogue (`pharn/floor/catalogue-installed-skills.mjs`, over the same discovery as
> `pharn/floor/scan-installed-skills.mjs`) and feed the model the catalogue's descriptions plus the bodies of the
> skills they select (`pharn/pharn-core/installed-skill-selection/`), all as untrusted context.

## 2. `THREAT-MODEL.md` §3, the surface-8 row (currently line 89)

In the "Guarantee" cell, replace the first text below with the second. Keep "it **GATES NOTHING**" and "No primitive
is specified or planned for this row" unchanged; both stay true.

```text
**ENUMERATION ONLY** (`scan-installed-skills.mjs`)
**ENUMERATION ONLY** (`scan-installed-skills.mjs`; its catalogue `catalogue-installed-skills.mjs` shares the discovery)
```

## 3. `THREAT-MODEL.md` §5 — add a third named channel after "(2) The **suppression** channel …"

Proposed text:

> (3) The **selection-omission** channel on surface 8 (6.47.0): a stage now reads only the skill bodies it judges
> relevant from a body-free catalogue, plus every skill whose metadata it cannot read cleanly. A skill whose
> description is narrower than its body — benign or hostile — can be skipped, and its convention or its argument
> about a finding then never reaches the stage. The conservative rules in
> `pharn/pharn-core/installed-skill-selection/installed-skill-selection.md` narrow this; nothing structural closes
> it, and the catalogue's `ok` status means only "syntactically readable", never "a complete account". Measured in
> `.dev/features/selective-skill-reads/EVAL.md`, not bounded by it.

## 4. `pharn/ARCHITECTURE.md` §4, the layer tree (currently line 138)

Current:

> `└─ pharn-core          L0   seam-resolver — the seam MECHANISM, framework-agnostic.`

Proposed:

> `└─ pharn-core          L0   seam-resolver — the seam MECHANISM, framework-agnostic; installed-skill-selection — the advisory procedure for choosing which installed skills to read.`

(Wrap to the block's width as the human prefers; the line sits inside a fenced `text` block.)
