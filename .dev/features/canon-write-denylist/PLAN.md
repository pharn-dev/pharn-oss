# PLAN — canon-write-denylist

- spec_content_hash: bed2c2a58c113a374056ab23d2c74fe1a3395fa62be12e7a654e3b260552e299
- applied_lessons: [L3, L7, L19, L20, L25, L27, L29, L31, L33, L34, L36, L37]
- increment: Add `memory-bank/` and `.dev/memory-bank/` as rooted-subtree entries in
  `protect-trusted-paths.cjs`, with an escape that fires only for a writes-scope whose ORIGIN is one of
  the two promote commands — so a canon write can no longer be authorized by a `## Files` entry in an
  untrusted `PLAN.md`.
- layer(s): the floor (`.claude/hooks/`) — not a `pharn-*` capability layer
- constitution_refs: [P0, P2, P5, P6, P7]

## The failure this closes (P7 — a real, observed failure, twice)

`THREAT-MODEL.md:67` maps **memory-bank poisoning** — which `THREAT-MODEL.md:46-47` calls the "worst
persistence vector", silent and cumulative — to the floor primitive **"pre-write hook"**, with no
`(specified; …)` marker, i.e. asserted as a live guarantee. Probed live this run, that mapping does not
hold:

```text
$ echo '{"tool_name":"Write","tool_input":{"file_path":"memory-bank/lessons-learned.md"}}' \
    | node .claude/hooks/protect-trusted-paths.cjs ; echo EXIT=$?
EXIT=0        # ALLOWED — zero `memory-bank` references exist in that hook today
```

The composed verdict is therefore decided entirely by `enforce-writes-scope.cjs`, whose scope for
`/pharn-build` and `/pharn-dev-build` is parsed from an **untrusted `PLAN.md`'s `## Files`**
(`set-writes-scope.cjs --from-plan`). `set-writes-scope.cjs`'s `CONTROL_SURFACE` refusal covers only the
four `.claude/` control paths — never canon. So a `## Files` entry naming a canon file grants a direct,
ungated canon write, and **no human approves a product `PLAN.md`**.

**Two prior occurrences, both already in canon — this is L20's trigger, not a hypothetical:**

1. **L7** — `/review`'s `writes:` over-declaration resolved a two-path scope the pre-write hook then
   PERMITTED, "silently granting `/review` a direct, ungated canon write". Observed live.
2. **L20** — `product-capability-catalog`'s `## Files` over-grant resolved **6 paths against the 2 the
   human approved**, and the over-grant "reached … `.dev/memory-bank/lessons-learned.md` itself — a
   direct canon write, the exact power **L7** says a stage must never hold." Observed live at build
   Step 0, through **`--from-plan`** — the exact vector this increment closes.

L7 names the residual explicitly ("nothing enumerates every command's `writes:` for canon paths — a
named, P7-eligible residual"), and both `.claude/commands/pharn-memory-promote.md:453-458` and
`.dev/floor/check-provenance.test.mjs:410-414` record the follow-up slug `canon-write-denylist`, for
which no feature dir and no code exist (verified live: `grep -rn canon-write-denylist` hits only those
two sites plus CHANGELOG prose and three `.dev/features/product-memory-promote/` audit trails).

## Files

- `.claude/hooks/protect-trusted-paths.cjs` — add `PROTECTED_SUBTREES` (rooted subtree denial for
  `memory-bank` + `.dev/memory-bank`), `CANON_INODES` (hard-link aliases of the four named canon files),
  the scope-origin escape `canonWriteAuthorized()`, and a second deny-message branch — layer: floor
- `.claude/hooks/protect-trusted-paths.test.cjs` — deny/case-variant/symlink/hard-link fixtures, the
  escape's allow + four refuse cases, a closure assertion and a non-vacuity control — layer: floor (test)
- `.claude/hooks/enforce-writes-scope.test.cjs` — amend the two `memory-bank` scope tests' comments to
  state the jurisdiction split, and add nothing to their assertions — layer: floor (test)
- `.claude/commands/pharn-memory-promote.md` — expire the now-false follow-up sentence at its guarantee
  audit; bump `version:` — layer: product command
- `.claude/commands/pharn-dev-memory-promote.md` — expire the "retro-tagged … travelling the ordinary
  gated build path" paragraph, which names a route this increment closes; bump `version:` — layer: dev
  command
- `.dev/floor/check-provenance.test.mjs` — expire its HONEST BOUND comment naming the same follow-up —
  layer: dev floor (test)
- `.claude/commands/pharn-dev-ship.md` — expire its `writes:` comment block's reasoning ("the canon path
  is reachable ONLY by invoking `/pharn-dev-memory-promote`, **which declares it itself**"), whose stated
  mechanism this increment supersedes — layer: dev command **(added at the GATE-1 amendment, GRILL F2)**
- `.dev/floor/command-hygiene.test.mjs` — expire its restatement of L7's residual — layer: dev floor
  (test) **(added at the GATE-1 amendment, GRILL F2)**
- `README.md` — one `## Current limitations` bullet stating what the denylist does and does not cover —
  layer: repo meta
- `CHANGELOG.md` — the `[Unreleased]` entry, recording the bump — layer: repo meta
- `SKILLS_VERSION` — `3.0.2` → `3.0.9` (assigned; parallel PRs are open) — layer: repo meta
- `docs/capabilities/**`, `README.md` CURRENT-STATE region — only if `npm run docs:generate` changes
  bytes (the command `version:` bumps are rendered) — layer: generated

**Not touched.** `pharn/CONSTITUTION.md`, `pharn/ARCHITECTURE.md`, `THREAT-MODEL.md`, `LIMITS.md`,
`CODEOWNERS` (hook-protected, human-only). `enforce-writes-scope.cjs` and `set-writes-scope.cjs`
(unchanged — see the jurisdiction note below). `.dev/features/product-memory-promote/*` (audit trails
are never rewritten). The root `REVIEW.md`.

## Design

### 1. Rooted-subtree denial, not a basename or fragment match

`DEFAULT_PROTECTED` is an exact-match list, and its header records why: the earlier basename and
path-fragment branches were REMOVED because both over-matched at depth. A canon **subtree** cannot be
expressed as an exact path, so it gets its own structure — `PROTECTED_SUBTREES = ["memory-bank",
".dev/memory-bank"]` — matched as `<subtree>/…` against the target's path **relative to a guarded root**.
That is still trust-by-location; it is a directory rather than a file, and it is _not_ a return to the
removed branches: a fragment match denied a user's `docs/ARCHITECTURE.md` anywhere in the tree, whereas
this denies only what actually sits under the guarded root's canon directory.

It reuses, rather than reimplements, every existing hardening in the file (the constraint that put this
in _this_ hook rather than in `enforce-writes-scope.cjs` — the same reasoning the file's own header gives
for `.pharn/writes-scope.json`): `toKey()`'s full case fold + NFC + Windows trailing-dot/space strip,
`ROOT_PREFIXES` (both `__dirname` and `argv[1]` spellings, each plus its realpath),
`resolveWriteTarget()`'s segment-wise symlink resolution with dangling-link handling, and the
fail-closed `try`/`catch` around the decision.

### 2. The escape, and exactly what it is not (the honest answer to "non-self-grantable")

A hook receives its input on **stdin from `PreToolUse`**, never on argv, so `set-writes-scope.cjs`'s
`--allow-claude-dir` mechanism is not literally available. The authorization signal instead lives in the
**ORIGIN** of the active writes-scope record. `canonWriteAuthorized()` permits a canon write only when
**all** of:

1. `<root>/.pharn/writes-scope.json` parses to a plain object; **and**
2. its `set_by`, normalized and folded, is an exact member of the literal array
   `[".claude/commands/pharn-memory-promote.md", ".claude/commands/pharn-dev-memory-promote.md"]`; **and**
3. its `scope` is an array of exactly **one** string whose folded key equals the write target's folded
   key.

Anything else — a throw, a missing file, a non-object, a two-path scope, a scope naming a _different_
canon file — returns `false`, i.e. **denied**. Set membership over a literal array, `ARCHITECTURE.md §2`
primitive #3; no new primitive is invented.

**What this genuinely is (P0, stated as narrowly as it is true).** `set_by` is written from the setter's
**argv** (`record = { scope, set_by: file, … }`), so **no `writes:` declaration and no `## Files` entry
can set it for itself** — precisely the property `set-writes-scope.cjs`'s header claims for
`--allow-claude-dir`. `/pharn-build` and `/pharn-dev-build` invoke `--from-plan <PLAN.md>`, whose `set_by`
is the plan path, so the finding's exact vector is closed **structurally**, not by discipline.

**What this is NOT, and it must not be sold as more.** It is **not** non-self-grantable against an agent
holding Bash. `set-writes-scope.cjs` writes its record with `fs.writeFileSync`, which `PreToolUse` never
sees, so an agent can run the setter with promote-shaped argv — or forge the record outright — without
any human gate. **No such mechanism was found, and this plan does not pretend one exists.** The reason
that is not fatal is that it grants nothing new: an agent with Bash could already append to canon
directly (`cat >> memory-bank/lessons-learned.md`), which this hook has never covered and cannot.
What changes is that on the **Write/Edit/MultiEdit/NotebookEdit** surface a canon write now requires a
**separate, explicit, auditable act** that a build plan cannot cause — instead of arriving as an
unremarkable in-scope build write. That is a narrowing, not a closure, and the code says so.

**The escape is also not evidence a human approved.** The floor cannot verify a form answer
(`LIMITS.md §1d`); the promote commands' accept/deny halt remains advisory, exactly as it is today.

### 3. Two deny-message branches, each with a remedy reachable in its own case

The existing message ends "a human edits it outside the agent loop" — correct for a trusted doc and
**wrong for canon**, whose reachable remedy is to route the write through `/pharn-memory-promote` /
`/pharn-dev-memory-promote` (which set a promote-origin scope), or to have a human edit canon by hand.
Printing the trusted-doc sentence on a canon deny is the exact shape L27 names. So the canon branch gets
its own text, and per L29 the two branches are materialized as one array the tests iterate — with the
"present in its own case AND **absent from the other**" assertion form L27's second half requires.

### 4. A capability this deliberately REMOVES, stated rather than discovered later

`.claude/commands/pharn-dev-memory-promote.md:100-106` documents a second, legitimate canon-write route:
the L1–L17 retro-tagging increment travelled "the **ordinary gated build path** — declared in its PLAN's
`## Files`, scoped by `set-writes-scope.cjs --from-plan`, approved by a human at the plan gate."
**This increment closes that route**, because it is byte-for-byte the vector the finding names and the
floor cannot tell an honest retag plan from a poisoned one. The cost is real and accepted: a future canon
**annotation** increment must be a human hand-edit outside the agent loop, or run under a deliberately-set
promote-origin scope. Both remedies are reachable and both are named in the canon deny message (L27).
That paragraph is edited in this increment rather than left to expire (L33).

## Contracts satisfied

- `pharn/ARCHITECTURE.md §2` primitive #1 (pre-write hook) and #3 (enum/regex membership) — cited, not
  restated (P4). No fourth primitive is introduced.
- `pharn/ARCHITECTURE.md §5` — promotion to canon as a **gated** action; this increment moves the "only
  through the gate" half from an unenforced expectation toward the write surface's floor.
- `THREAT-MODEL.md §3` row `memory poisoning → pre-write hook` — the row this increment makes
  substantially true on the guarded tool surface. **The trusted doc is not edited** (hook-protected,
  human-only): the change only _reduces_ the row's overclaim, and §4 item 2 already carries the global
  Bash bound, so no doc edit is required to keep it honest.

## Evals to write (P1)

`.claude/hooks/*.cjs` are floor scripts, not `role:`-bearing capabilities, so P1's `evals/cases` +
`evals/expected` contract does not range over them; their specification is `node --test`
(`CONTRIBUTING.md:79` — "changes to the executable floor ship with tests"). New tests in
`.claude/hooks/protect-trusted-paths.test.cjs`:

- **closure over the canon enumeration (L36)** — one materialized array of canon paths (the four named
  files + one nested path per subtree), with every deny rule **iterating** it, so a member added later is
  covered by every rule for free; no per-member hand-written assertion.
- **case variants** — `MEMORY-BANK/LESSONS-LEARNED.MD`, `.DEV/Memory-Bank/x.md`, and a full-fold case
  (`ﬅ`/`ſ`-class) → denied.
- **Windows trailing dot/space** — `memory-bank/lessons-learned.md.` → denied.
- **symlink aliases** — a file symlink onto a canon file; a symlinked _directory_ (`mb -> memory-bank`);
  a **dangling** symlink pointing into `memory-bank/` (the create-with-attacker-content vector) → denied.
- **hard-link alias** — a second link to a canon file, written by its alias name → denied.
- **escape ALLOWS** — `set_by` = a promote command, single-entry scope equal to the target → exit 0.
- **escape REFUSES (four cases)** — `set_by` = `features/foo/PLAN.md` (**the finding's exact vector**);
  a two-path scope; a scope naming the _other_ canon file; an absent/malformed record → exit 2.
- **non-vacuity control (L34)** — assert the fixture array's length is non-zero, and assert an
  unrelated in-repo write (`pharn/pharn-core/x.md`) still exits **0**, so the suite cannot pass by
  denying everything.
- **regression guards** — every existing `DEFAULT_PROTECTED` entry still denies; `.claude/commands/**`
  and `*.test.cjs` still allow.
- **deny-message branch coverage (L27/L29)** — each branch's remedy present in its own case and absent
  from the other.

## Guarantee audit (P0)

- "A Write/Edit/MultiEdit/NotebookEdit to `memory-bank/**` or `.dev/memory-bank/**` is denied unless the
  active writes-scope's origin is a promote command and its single entry is that exact path" → **floor:
  hook + enum-regex** (`protect-trusted-paths.cjs`, exact membership over two literal arrays).
- "A `## Files` entry in an untrusted `PLAN.md` cannot authorize a canon write" → **floor: hook.**
  `set_by` is argv-derived at set time; no declared path can change it.
- "A canon write requires a human accept" → **ADVISORY.** Unchanged. The floor cannot verify a form
  answer (`LIMITS.md §1d`); the escape keys on the scope's ORIGIN, never on an approval.
- "Canon cannot be written" → **STRUCK.** Bash-tool writes bypass `PreToolUse` entirely — the largest
  hole in this guard, unnarrowed by any path matching, and stated in the code, the CHANGELOG, the README
  bullet and the PR body.
- "The escape is not self-grantable" → **NARROWED and stated.** True against a `writes:` / `## Files`
  declaration (floor). **False** against an agent holding Bash, which can run the setter with
  promote-shaped argv or forge the record. No stronger mechanism was found; the strictest honest thing is
  what ships.
- "Case variants, symlink aliases and hard-link aliases of a canon path are denied" → **floor: hook**,
  inherited from the existing `toKey` / `resolveWriteTarget` / inode machinery, with the bound that a
  hard-link alias of an **unnamed** file inside a canon subtree is not caught (only the four named canon
  files are inode-collected; a recursive subtree walk on every tool call is the hang risk the file's own
  header warns about, and creating a hard link needs Bash anyway).
- "PHARN vendored at a subpath of a larger project is guarded" → **STRUCK**, inherited unchanged from the
  file's existing honest bounds.
- "The two promote commands still work" → **ADVISORY** (verified by test + by reading both commands'
  Step 0/Step 6, not guaranteed by the floor): both set a **1-path** `--from-frontmatter` scope naming
  their own command file, which is exactly what condition (2)+(3) admit.

## Trust audit (P2)

- **Input.** `.pharn/writes-scope.json` is read by the hook. It is **not** a trusted artifact: it is
  agent-writable through Bash. Treat it as untrusted DATA.
- **Propagation.** Only two fields reach the decision, and both through **exact membership over a literal
  array** (`set_by`) or a **string-equality against the write target's own folded key** (`scope[0]`). No
  free text is read, nothing is interpolated into an instruction, and the record can only be consulted to
  **permit** — every parse failure, type mismatch and shape mismatch lands on **deny**.
- **Blast radius of a forged record.** It grants exactly one canon path on the Write surface — strictly
  less than the direct `cat >>` the same actor already has. Stated, not hidden.
- **The canon deny message** quotes no untrusted content: it prints the blocked path (already folded by
  the existing code path) and two fixed remedies.

## Determinism audit (P5)

- Every branch is a membership / equality / presence test: subtree prefix membership, `set_by` array
  membership, scope-length integer test, folded-key string equality, inode set membership. No LLM
  classification.
- The terminal fallback on any unexpected error is **deny**, and the message asks a human — never a
  guess.

## Open questions (HALT)

1. **The write-guard hooks are not firing against this session's tool calls, and this increment must edit
   a file the guard protects.** Probed live: an `Edit` to `.claude/hooks/protect-trusted-paths.cjs` with a
   deliberately non-matching `old_string` returned the tool's own "String to replace not found" rather
   than a hook deny, so no `PreToolUse` deny occurred — while the hook itself, run by hand on the same
   payload, exits **2**. The guard is armed in the file and not in the loop here. **Nothing was disarmed
   to achieve this**: no settings file was edited, no flag passed, no hook bypassed. `/pharn-dev-build`
   will still run `set-writes-scope.cjs --from-plan --allow-claude-dir`, which is the flag's documented
   purpose ("the increments that genuinely edit a guard"), so the audit trail is correct regardless of
   whether the hook is enforcing. Proceed, or stop and hand the hook edit to a human?
2. **`THREAT-MODEL.md:67` is the doc that overclaims, and it is hook-protected/human-only.** This
   increment makes the row _more_ true and therefore needs no edit to stay honest. Should a sharpened
   sentence nonetheless be proposed to a human for hand-application, or is the README bullet sufficient?
3. **Closing the retag route (Design §4) removes a documented capability.** Accept the cost as planned, or
   scope a narrower denylist (the four named canon files only, leaving the subtrees writable)?

## GATE-1 amendment — the grill's two blocking-severity findings, folded in

`/pharn-dev-grill` ran after the first approval and raised 7 concerns (2 blocking-severity). Grill
findings gate nothing (fix #3), but two were correct and cheap, so the approver amended this plan rather
than carrying them into the build as known defects. Recorded here rather than silently edited, so the
diff between the approved plan and the built one is legible:

- **F1 / F7 (P0) — `.claude/hooks/protect-trusted-paths.cjs:88` becomes false.** Its header says
  "Composes with `set-writes-scope.cjs` … **The two are independent: this denylist holds no matter what
  scope was set**". Once the canon branch consults the scope record, that is no longer unqualified. The
  sentence is **re-derived** in this increment (L25: when the thing a comment describes is repaired,
  re-derive the claim rather than carry it across) — the independence claim is kept for the
  `DEFAULT_PROTECTED` entries, where it remains true, and explicitly narrowed for the canon branch.
  §2's "closed structurally" also carries its qualifier **in the same sentence**, not the next paragraph.
- **F2 (P6) — the doc-site enumeration was a lower bound, and a second substring beat it.** L33's remedy
  (b) says treat any prior enumeration as a lower bound to beat; a sweep on `ungated` (rather than
  `canon-write-denylist`) returned two further expiring sites, now added to `## Files` above. **Both
  sweeps are recorded so the next reader inherits the method, not just the result.**
- **F3 (P3) — the new cross-hook coupling is named and pinned.** The escape reads a record shape
  `set-writes-scope.cjs` emits, so a ✧ test asserts the setter's live output actually satisfies
  `canonWriteAuthorized()`'s three conditions — a shape contract, not two independently-drifting beliefs.
- **F4 (P5) — the "exactly one entry" invariant lives in the commands, so pin it there.** A test runs the
  setter `--from-frontmatter` over **both real promote command files** and asserts each resolves to
  exactly 1 path (L3's re-audit + L7's "pin the resolved scope with a test"). A future `writes:` widening
  then fails loudly in CI instead of silently making canon unwritable at runtime.
- **F5 (P7) — `CANON_INODES`'s trigger is stated honestly.** It answers **no observed failure**: creating a
  hard link needs Bash, and an actor with Bash can append to canon directly. Its actual justification is
  **parity with the existing `PROTECTED_INODES` coverage** plus L31, and the code comment says exactly
  that rather than implying a failure drove it — the `check-plan-lessons` sub-check D precedent.
- **F6 (P2) — the no-record-text property of the canon deny message is made load-bearing in a test.** This
  hook has no `asData()` fold, so a test asserts no scope-record field appears in any deny message.

## GATE 1 — approval, and who gave it (recorded, not assumed)

**Approved as written.** The approver was **not an interactive human**: the parent session explicitly
delegated the GATE-1 and GATE-2 approver role to this agent for this task, and there is no human on this
side of the loop. That is recorded here rather than left to be inferred, because `/pharn-dev-plan`'s halt
is **advisory** (P0 — `LIMITS.md §1d`: the floor cannot verify a human said yes), so an unlabelled
"approved" would read as a human gate that did not occur. A human reviewing the PR is the first real
human gate this increment passes.

Answers to the three open questions:

1. **Proceed.** The guard is armed in the file and not in this session's tool loop; nothing was disarmed,
   bypassed, or reconfigured to establish that, and it was found by probing rather than assuming (L37).
   `CONTRIBUTING.md:79` treats `.claude/hooks/*.cjs` changes as an ordinary contribution that ships with
   tests, and `--allow-claude-dir` exists precisely for "the increments that genuinely edit a guard", so
   the build stage will pass it and the audit trail stays correct either way. **The session's inability
   to be blocked is itself reported to the human in the PR body** — it is a fact about the environment,
   not a licence.
2. **README bullet ships; the `THREAT-MODEL.md` sentence is REPORTED, never applied.** The row becomes
   more true, so no edit is required for honesty, and the doc is human-only. Exact suggested replacement
   text is handed to the human in the PR body and the final report for hand-application if wanted.
3. **Accept the cost; keep the subtree scope.** A four-file denylist would leave `memory-bank/<anything
else>.md` writable, and canon is a directory a user may legitimately extend beyond the promote enum's
   two prescription files (`pharn/ARCHITECTURE.md §5` names four state files). Denying the subtree is the
   honest boundary; denying only the names an author happened to enumerate is exactly the presence-not-
   closure defect **L36** names.

## Applied lessons

- **L3** — the field being made load-bearing here is `set_by`, previously carried for the deny message's
  origin line only; every existing producer of it was audited this run (both setter modes, all 18
  command frontmatters, both promote commands' Step 0) before it was allowed to gate anything.
- **L7** — this increment is L7's own named residual ("nothing enumerates every command's `writes:` for
  canon paths"), closed from the other side: instead of enumerating declarations, the write surface
  denies canon regardless of what any declaration says.
- **L19** — the Bash-escape bound is the honest ceiling on the whole increment and is written into the
  code comment, the guarantee audit, the CHANGELOG and the PR body rather than left implicit.
- **L20** — the second occurrence is the trigger, and it is met: L7's `/review` over-declaration and
  L20's own `product-capability-catalog` `--from-plan` over-grant are two observed canon-write grants, so
  this earns a floor check rather than another discipline note.
- **L25** — the rationale is not left as a comment hoping to reach the reader: the reachability rule and
  the branch set are made **enforceable** by tests that iterate them, and the comments that described the
  old behaviour are re-derived rather than carried across.
- **L27** — the trusted-doc remedy is unreachable for a canon deny, so the canon branch gets its own
  message and each branch's remedy is asserted present in its own case and **absent from the other**.
- **L29** — the deliverable is the **enumeration**: one materialized array of canon paths and one of
  deny-message branches, with every rule iterating them, rather than assertions written for whichever
  member was in front of the author.
- **L31** — `memory-bank/` and `.dev/memory-bank/` are a deliberate copy-pair, so the obligation set was
  swept on **both** sides: subtree entry, inode coverage, escape membership, test fixtures, and the stale
  prose in **both** promote commands (the dev twin's retag paragraph would otherwise have been the
  dropped half).
- **L33** — three sentences expire the moment this lands (the product command's follow-up line, the dev
  command's retag paragraph, the dev test's HONEST BOUND comment); all three were found by grepping the
  shortest invariant substring (`canon-write-denylist`, then `ordinary gated build path`) and are edited
  in this increment, not left for a later repair pass.
- **L34** — the new per-fixture assertions would pass vacuously over an empty fixture array, so a
  non-vacuity control asserts the array is non-empty **and** that an unrelated write still exits 0.
- **L36** — the canon enumeration carries a parameterized shape (`<subtree>/<file>`), so the tests assert
  **closure** over the materialized array rather than one presence assertion per spelling the author
  happened to type.
- **L37** — every bound in this plan was **probed by executing the hook**, not read off it: the
  `EXIT=0` on `memory-bank/lessons-learned.md` above, and the `EXIT=2` on the hook's own path, are
  recorded exit codes, and the same discipline governs each bound claimed at build.
