// pharn/floor/loop-record-core.mjs — the ONE implementation of the loop-record's `## Handoff` grammar.
//
// Floor infrastructure, NOT a Capability (no `role:`; it lives in the floor-ignored dir). It carries no
// verdict and no exit code: it is a pure reader that two consumers share.
//
//   • pharn/floor/check-loop-record.mjs — asks a STRUCTURAL question (are the three subsections present,
//     in order, each with a non-blank body?) and owns the RED.
//   • pharn/floor/render-run-report.mjs — asks for the BODIES, to quote them verbatim as untrusted DATA.
//
// ── WHY A SHARED CORE, and not a second copy (L35) ───────────────────────────────────────────────────
// The question "must the second copy exist?" is asked BEFORE choosing a remedy, never after. Here the
// answer is no: both consumers ship in `pharn/floor/`, so a user's install carries both or neither, and
// the dev/product split that FORCES the deliberate `check-provenance.mjs` / `lessons-index-core.mjs`
// copy-pairs does not apply. The alternative — re-implementing the fence rule in the renderer — would
// create a pair with nothing ranging over it (L31: the second copy is where the obligation drops).
//
// The stakes are not hypothetical. check-loop-record.mjs's own header records this grammar being wrong
// TWICE before the CommonMark 4.5 rule landed: a blind fence toggle fail-OPENED (a `~~~` block "closed"
// by ``` left two subsections inside a code block while all three still read as present) and
// fail-CLOSED on the escape hatch the checker itself prescribes (quoting the record's own outline needs
// a nested fence, and the four-backtick idiom broke the toggle). A rule with that history is exactly the
// rule that must not be re-derived from local context.
//
// ── NO CROSS-TREE IMPORT (P3) ────────────────────────────────────────────────────────────────────────
// Nothing here imports from `.dev/`. That tree is the build apparatus, excluded wholesale at packaging
// ("ship root minus .dev/"), so a product-floor module importing from it would be GREEN in this repo and
// BROKEN in every install — a failure `npm run check` cannot see. Same discipline the two consumers keep.
//
// ── Honest scope (P0) ────────────────────────────────────────────────────────────────────────────────
// What this module IS: a line-oriented reader implementing CommonMark's fence-pairing rule (4.5) and the
//   0-3-space ATX heading allowance, so headings inside fenced blocks are DATA about the shape and never
//   a declaration of it (L6).
// What it is NOT: a Markdown parser, and not forgery-proofing. A LINE-INITIAL `### next_steps` in a body
//   IS that heading to every CommonMark parser, and no reader can invent a notion of "intended as prose".
//   check-loop-record.mjs's exact-list-equality is what REFUSES such a record; this module only reports
//   what is there. Claiming otherwise is the P0 disease — see that file's header, cited not restated (P4).
//
// NON-LLM. Node stdlib only — in fact zero imports. No network, no eval, no child processes.

/** The Handoff subsections, in NORMATIVE ORDER. An array, not a Set: order is part of the shape, so the
 *  consumer's check is list equality rather than set membership. */
export const HANDOFF_SECTIONS = ["investigated", "learned", "next_steps"];

// Structure regexes. All allow the 0-3 leading spaces CommonMark allows on an ATX heading, and `{0,3}`
// rather than `\s*` is deliberate: at 4+ spaces the line is an indented code block, not a heading.
// Anchoring these at column 0 while the fence scan tolerated indentation was a real fail-OPEN — a
// 3-space-indented `### smuggled` inside the Handoff is a heading to every CommonMark parser.

/** The section heading, matched exactly. */
export const HANDOFF_RE = /^ {0,3}##[ \t]+Handoff[ \t]*$/;

/** A level-3 heading. `####` does not match — `#` is not the required whitespace. */
export const SUB_RE = /^ {0,3}###[ \t]+(.*)$/;

/** Ends the section at the next `#`/`##` heading. */
export const HEADING_RE = /^ {0,3}#{1,2}[ \t]+\S/;

/** A fence delimiter line: 0-3 spaces, then a run of 3+ backticks or 3+ tildes, then anything (the info
 *  string on an opener; whitespace only on a closer). `handoffSections` implements the CommonMark 4.5
 *  pairing rule against it. */
export const FENCE_RE = /^ {0,3}((?:`{3,}|~{3,}))(.*)$/;

/**
 * Collect the `## Handoff` sections of `body` and, for the FIRST one, the level-3 headings it contains,
 * whether each is followed by at least one non-blank line, and each one's RAW body lines.
 *
 * @param {string} body
 * @returns {{count: number, subs: string[], nonEmpty: boolean[], bodies: string[]}}
 *   `count` — how many `## Handoff` headings exist, so a duplicate section is REFUSED by the consumer
 *     rather than silently first-wins.
 *   `subs` — the level-3 heading titles, in document order.
 *   `nonEmpty` — per heading, whether any non-blank line follows it before the next heading.
 *   `bodies` — per heading, the raw lines between it and the next heading, joined with "\n" and stripped
 *     of leading/trailing blank lines. VERBATIM otherwise: no unescaping, no normalization, no trimming
 *     of interior whitespace. This is untrusted DATA (P2) — a consumer quotes it, never executes it.
 *
 * `bodies` is ADDITIVE. `count` / `subs` / `nonEmpty` are byte-for-byte the pre-extraction behaviour, and
 * check-loop-record.mjs's existing suite is the regression net for that (L41's lesson inverted: the
 * shared path is the one every test already exercises).
 */
export function handoffSections(body) {
  const lines = body.split(/\r?\n/);
  let openFence = null; // { char, len } while a fenced block is open; null otherwise
  let count = 0;
  let inSection = false;
  const subs = [];
  const nonEmpty = [];
  const bodies = [];

  // Mark the CURRENT subsection as carrying content. Content before the first `###` is ignored — it
  // belongs to the section's own preamble, not to any subsection.
  const markContent = () => {
    if (inSection && subs.length > 0) nonEmpty[nonEmpty.length - 1] = true;
  };
  // Append a RAW line to the current subsection's body, on the same "only inside a subsection" rule.
  const keep = (line) => {
    if (inSection && bodies.length > 0) bodies[bodies.length - 1].push(line);
  };

  for (const line of lines) {
    // Fenced blocks: their CONTENT counts as body content (a subsection whose body is a code block is
    // not empty), but they are NEVER structural — a fenced `### learned` is DATA about the shape, never
    // a declaration of it (L6).
    //
    // The pairing follows CommonMark 4.5 rather than toggling on any fence-looking line: a block closes
    // ONLY on a delimiter of the SAME character whose run is at least as long as the opener's, with
    // nothing but whitespace after it.
    const fence = line.match(FENCE_RE);
    if (fence) {
      const marker = fence[1];
      if (openFence === null) {
        openFence = { char: marker[0], len: marker.length };
      } else if (marker[0] === openFence.char && marker.length >= openFence.len && fence[2].trim() === "") {
        openFence = null;
      }
      // a non-matching delimiter while a block is open is ordinary content, not a close
      markContent();
      keep(line);
      continue;
    }
    if (openFence !== null) {
      if (line.trim().length > 0) markContent();
      keep(line);
      continue;
    }

    if (HANDOFF_RE.test(line)) {
      count++;
      inSection = count === 1; // only the first section is collected; a second makes it RED anyway
      continue;
    }
    if (!inSection) continue;

    const sub = line.match(SUB_RE);
    if (sub) {
      subs.push(sub[1].trim());
      nonEmpty.push(false);
      bodies.push([]);
      continue;
    }
    if (HEADING_RE.test(line)) {
      inSection = false; // the section ends at the next `#`/`##` heading
      continue;
    }
    if (line.trim().length > 0) markContent();
    keep(line);
  }

  return {
    count,
    subs,
    nonEmpty,
    // Strip leading/trailing blank lines only. Interior content is untouched, so "verbatim" stays true.
    bodies: bodies.map((ls) => {
      let a = 0;
      let b = ls.length;
      while (a < b && ls[a].trim() === "") a++;
      while (b > a && ls[b - 1].trim() === "") b--;
      return ls.slice(a, b).join("\n");
    }),
  };
}

/**
 * The shortest back-tick fence that can safely enclose `text` — one longer than the longest run of
 * back-ticks inside it, and never shorter than 3 (CommonMark's minimum).
 *
 * This is the mechanical half of quoting untrusted DATA: it makes the quoted block inert TO A COMMONMARK
 * PARSER, so a heading inside it cannot become a heading of the enclosing document.
 *
 * **It is NOT forgery-proofing (P0).** A reader who copies text out of the block is outside anything this
 * function can reach, and nothing parses the rendered report anyway. The claim is exactly "a CommonMark
 * parser sees one code block", never "the content is safe".
 */
export function fenceFor(text) {
  let longest = 0;
  for (const run of String(text).matchAll(/`+/g)) longest = Math.max(longest, run[0].length);
  return "`".repeat(Math.max(3, longest + 1));
}
