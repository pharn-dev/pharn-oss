#!/usr/bin/env node
// .dev/floor/lessons-index-core.mjs — the DEV PROFILE of the lessons index (build apparatus).
//
// A THIN WRAPPER since 6.69.0 (audit ARCH-6). The grammar — the `## L<n>` heading, the tag line, the row format,
// the title refusals, the CHECK-5 refusal — lives ONLY in pharn/floor/lessons-index-core.mjs. This file used to be
// a hand-kept second copy of it, held equal by ✧ text pins; that copy is retired (lessons-learned L35: when one
// fact is stored twice, retire the second copy). The dependency points `.dev/` -> `pharn/`, the only direction an
// install allows (it ships `pharn/floor/` without `.dev/`).
//
// What this file still owns, because it is genuinely different on the build-apparatus surface:
//   1. the PROFILE — canon at `.dev/memory-bank/`, the output a COMMITTED `docs/lessons-index.md`, the regenerate
//      hint `npm run docs:generate`, no cache paragraph, and a columns paragraph that reads BOTH absence markers
//      as unexpected (every dev canon entry passed the promote gate; the product keeps the benign reading of `-`);
//   2. canon MUST exist here — buildIndex() refuses the product's benign `no-canon` status with a throw, because
//      rendering a plausible-looking EMPTY index would be a lie that regenerates cleanly.
// A ✧ closure test in lessons-index-core.test.mjs refuses any other top-level declaration in this file, so the
// grammar cannot quietly grow back here.
//
// WHAT THIS DOES AND DOES NOT BUY (P0). The guarantee downstream is BYTE-EQUALITY: the committed index equals what
// the shared core recomputes from canon under this profile (check-lessons-index.mjs). It is NOT a guarantee that
// the index is TRUE, and `type` / `concepts` are model-drafted values a human ratified at the promote gate —
// selecting on them is ADVISORY context selection. "The index was consulted" NEVER means "the relevant lessons
// were read".
//
// Non-LLM, stdlib-only.

import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  buildIndex as coreBuildIndex,
  renderIndex as coreRenderIndex,
  parseLessons,
  STATUS_NO_CANON,
  TYPE_ENUM,
  CHARS_PER_TOKEN,
  ABSENT,
  MALFORMED,
} from "../../pharn/floor/lessons-index-core.mjs";

export { parseLessons, TYPE_ENUM, CHARS_PER_TOKEN, ABSENT, MALFORMED };

export const DEV_PROFILE = Object.freeze({
  canonPath: ".dev/memory-bank/lessons-learned.md",
  outPath: "docs/lessons-index.md",
  gen: ".dev/floor/gen-lessons-index.mjs",
  regen: "npm run docs:generate",
  storageNote: "",
  columnsNote:
    `Columns: \`id | type | concepts | title | promoted | ~tokens\`. \`${ABSENT}\` is rendered in THREE columns\n` +
    `and does NOT mean the same thing in each — read it against the column it sits in. In \`type\`/\`concepts\`:\n` +
    `every canon entry carries a tag line, so BOTH markers there are unexpected — \`${ABSENT}\` = no tag line,\n` +
    `i.e. an entry that reached canon without the promote gate's \`type\`/\`concepts\`; \`${MALFORMED}\` = a tag line\n` +
    `is present but failed its gate. Read that entry in canon either way. In \`promoted\`: \`${ABSENT}\` = the\n` +
    `entry has no \`- promoted: <date>\` line in its provenance block — a DIFFERENT defect, and one the\n` +
    `\`untagged\` count above does not measure, so a \`0 untagged\` header and a \`${ABSENT}\` in this column are\n` +
    `not a contradiction. \`~tokens\` is \`ceil(chars / ${CHARS_PER_TOKEN})\` over the FULL section\n` +
    `(heading through the line before the next \`##\`), an ESTIMATE with a confidence band, never a measurement\n` +
    `(\`pharn/LIMITS.md §1c\`). Titles are canon free text, reproduced verbatim as DATA.\n`,
});

export const CANON_PATH = DEV_PROFILE.canonPath;
export const OUT_PATH = DEV_PROFILE.outPath;

/** Render the whole dev index document (the shared renderer, under the dev profile). */
export function renderIndex(entries) {
  return coreRenderIndex(entries, DEV_PROFILE);
}

/**
 * Build the dev index. Returns { entries, content }. Throws (fail-closed, P5) when canon is missing, unreadable,
 * holds no `## L<n> ` heading, or is invalid — on this surface canon always exists, so an empty index is never
 * rendered as fact.
 */
export function buildIndex(targetDir) {
  let built;
  try {
    built = coreBuildIndex(targetDir, DEV_PROFILE);
  } catch (e) {
    if (e && typeof e.code === "string") {
      // An I/O failure other than absence (EACCES, EISDIR, …) — the shared core rethrows it raw.
      throw new Error(`lessons-index: canon is missing or unreadable: ${CANON_PATH} — refusing to render an empty index as fact`, {
        cause: e,
      });
    }
    throw e; // a present-but-invalid canon: duplicate id, unsafe title, CHECK-5 hazard
  }
  if (built.status === STATUS_NO_CANON) {
    // The shared core's benign status covers an ABSENT canon and one with zero lessons alike; the two messages
    // below are this surface's historical ones, told apart by presence (the refusal itself is the same).
    if (!existsSync(join(targetDir, CANON_PATH))) {
      throw new Error(`lessons-index: canon is missing or unreadable: ${CANON_PATH} — refusing to render an empty index as fact`);
    }
    throw new Error(`lessons-index: no \`## L<n> \` headings found in ${CANON_PATH} — refusing to render an empty index as fact`);
  }
  return { entries: built.entries, content: built.content };
}
