# Measurements — grill-griller-trim (review finding CTX-1)

Measured 2026-10-13 on branch `fix/grill-griller-trim` (merged with `origin/main` 791d205, SKILLS_VERSION 6.58.1 before
this increment's bump), Node v24.13.1. Reproduce with `node .dev/features/grill-griller-trim/measure.mjs`; it writes
nothing. Byte counts are `Buffer.byteLength`; tokens are not measured here.

## 1. What a full `/pharn-grill` loads from its grillers

|                                                                                     |   bytes |
| ----------------------------------------------------------------------------------- | ------: |
| The 13 griller files `count-grillers.mjs` lists (before: Step 3b read each in full) | 188,978 |
| Griller text `griller-extract.mjs` prints (after)                                   | 141,332 |
| Its whole stdout, with the `grillers:` line and 26 frame lines                      | 143,786 |

−47,646 B of griller text (−25.2%); −45,192 B counting the frame lines (−23.9%). The figure is the same for every plan:
every registered griller is printed, and only its `## Guarantee audit` and `## Machine-readable emission` sections are
left out (13 of each). Each griller's frontmatter is kept (4,753 B), so its `kind:` / `trust:` tags stay visible.

Not measured: the token effect on a real grill run. The 2026-10-05 grill agent (`.dev/measurements/loop-wall-clock-2026-10-05.md`
§3) made 41 requests; how many of a future run's requests follow the griller load is not known, so no token saving is
claimed. The parallel `stage-load-budget` test counts each griller file whole, so its grill row does not move.

## 2. The review's proposed selection, measured and rejected

The review proposed loading only the grillers whose `scan-plan-*` scanner hit the plan. Over every committed
`PLAN.md` (284 at measurement time, this increment's own included), skipping a scanner-backed griller on a non-hit
would have skipped:

| griller       | plans skipped |
| ------------- | ------------: |
| security      |     284 / 284 |
| privacy       |           280 |
| i18n          |           283 |
| migrations    |           233 |
| observability |           171 |

Mean bytes loaded: 117,030 (−38%). But each of those grillers judges beyond its scanner, and for migrations and
observability a non-hit is the absence case their main finding covers. The committed `GRILL.md` files show it: griller
findings filed under a heading naming that axis, on plans where its scanner had no hit — security 26, privacy 4,
i18n 1, migrations 3, observability 1, total 35 (34 before this increment's own `GRILL.md`, whose security-axis
findings are counted in the 26). A heading heuristic, so a lower bound: a finding not filed under its axis heading is
not counted. All of them would have been lost.

## 3. The extract's markdown model against markdown-it (L55/L56 probe)

A scratch probe (not committed; markdown-it 15.0.1, a transitive devDependency, so not pinned as a test — L56) compared
the lines `griller-extract.mjs` removes with the lines markdown-it renders inside an omitted `##` section (from its
heading to the next heading token):

- **The 13 committed grillers:** identical on every file (30–68 lines removed per file, the same lines markdown-it
  places in the two sections).
- **14 adversarial inputs:** an omitted heading inside a backtick, tilde or 4-backtick fence; a fence inside an omitted
  section holding a `##` line; a 4-space closer (content, not a closer); a setext heading, an indented ATX heading, a
  list-item heading and a thematic break after an omitted section; an unclosed fence; an HTML comment hiding an
  omitted heading; an indented omitted heading; a fence opened in a list item and closed by a column-0 line (L55's
  first construct); a blockquote fence; CRLF. The first probe found ONE over-drop — a setext heading's text line
  (`Procedure` above its `---------` underline) was removed with the section — fixed by keeping the paragraph above a
  setext underline; the list-item fence and the HTML comment keep the whole file. After the fix no input removes a
  non-blank line markdown-it renders outside an omitted section. The one remaining probe report on the
  fenced-`## Procedure` case is the probe's own greedy line alignment matching the wrong of two identical lines; the
  extract's output for it was checked by hand and is exact (and pinned by a test).
- Kept-but-omittable lines (safe direction, recorded): an indented omitted heading is kept; after a thematic break
  inside an omitted section the rest of it is kept.

## 4. Mutation controls (L60)

Ten scratch mutants of `griller-extract.mjs` — fence tracking off, fence opener never matching, a non-strict heading
start, setext end off, setext paragraph not restored, no HTML keep-whole, no ambiguous-fence keep-whole, no symlink
refusal, no containment check, no frame-line refusal — were each run against `griller-extract.test.mjs`. All ten were
killed by a named test.
