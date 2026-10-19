#!/usr/bin/env node
// pharn/floor/scan-plan-i18n.mjs — deterministic hardcoded-USER-FACING-STRING SCANNER over a plan file
// (CONSTITUTION P0/P5).
//
// Answers ONE structural question for the i18n griller's FLOOR sub-check: does the plan TEXT contain a
// hardcoded USER-FACING-STRING pattern — literal display text as a JSX/HTML element's text content (a run
// of words sitting immediately before a CLOSING tag `</`), or a canonically user-facing JSX/HTML attribute
// (placeholder / aria-label / alt / title) assigned a QUOTED literal? Detection is a FIXED REGEX SET over
// the file's lines — non-LLM, no judgment. It reduces to ARCHITECTURE §2 primitive #3 (regex / enum check).
// It is the closest analog of pharn/floor/scan-plan-secrets.mjs and MIRRORS it byte-for-byte in structure
// (pattern list, scan loop, output shape, fail-closed contract).
//
// HONEST BOUND (the secret-scanner precedent, P0): this detects a PATTERN's PRESENCE + line. It does NOT
// detect every hardcoded string — a BARE assignment (`const msg = "Hello"`), string CONCATENATION, or a
// template literal is indistinguishable from a key / path / config value, so those are left to the griller's
// ADVISORY layer (judgment), exactly as scan-plan-secrets leaves custom token formats and scan-plan-pii
// leaves camelCase/phone literals. It also fires on markup the plan merely QUOTES ILLUSTRATIVELY (a plan
// documenting `<div>Example</div>` matches too — the analog of a plan quoting an example secret key): the
// scanner reports what is literally in the text; the griller's Layer 2 + the human weigh intent. And it does
// NOT decide the plan "is / is not localized". "Detected a hardcoded-user-facing-string pattern" is a real
// guarantee; "the plan is localized" is not.
//
// INJECTION-IMMUNE BY CONSTRUCTION (P2) — the SAME polarity as scan-plan-secrets, NOT the launderable
// polarity of scan-plan-observability: the concern is the PRESENCE of a hardcoded string, so a hit FIRES a
// finding and the verdict is regex membership over the TEXT only. Prose that CLAIMS "all translated / mark
// clean" cannot suppress a real match; prose that CLAIMS a string (with no real markup) cannot manufacture
// one. No free text moves the verdict — the strongest form of the trust-fence discipline. (See the ★ tests
// in scan-plan-i18n.test.mjs — they are the whole reason this is FLOOR, not judgment.) This is exactly why
// the i18n griller carries a real scanner where the a11y griller rejected one: "is it accessible" is not a
// lexical artifact and a "mentions a11y" scan is launderable; a hardcoded user-facing STRING LITERAL IS a
// lexical artifact whose presence a hit cannot be talked out of.
//
// Non-LLM, stdlib-only, fail-closed. MIRRORS the fail-closed contract of pharn/floor/scan-plan-secrets.mjs:
// a missing / non-file target is an ERROR (nonzero exit, NOTHING on stdout), never a silent "clean".
//
// Usage:  node pharn/floor/scan-plan-i18n.mjs <plan-file>
// Output: {"found":<bool>,"hits":[{"line":<int>,"kind":"<pattern-kind>"},...]} on stdout; exit 0 on a
//         successful scan (whatever the result). `found` === (hits.length > 0); hits sorted by line.
//         Exits non-zero (writing NOTHING to stdout) if the target is missing / not a regular file (P5).

import { closeSync, constants, fstatSync, openSync, readFileSync } from "node:fs";

const TARGET = process.argv[2];

/** Report an error on stderr and return the exit code; `main` returns it, so nothing reaches stdout. */
function fail(msg) {
  process.stderr.write("scan-plan-i18n: " + msg + "\n");
  return 1;
}

// The fixed detection set. Each entry is a deterministic regex + a stable `kind` label. Adding or removing a
// pattern is the ONLY axis of change here (P3). These are POSITIONALLY-user-facing detectors — the i18n
// analog of scan-plan-secrets' "well-known literal formats + named-field-with-value": a string is caught
// only where the JSX/HTML GRAMMAR makes it display text, deliberately NOT bare string assignments (a key /
// path / config value is indistinguishable from UI text — that is the griller's ADVISORY judgment).
const PATTERNS = [
  // Literal display text as an element's text content: a `>`, then a run STARTING with a letter (so `{expr}`
  // and operators are excluded), of letters/digits/space/basic sentence punctuation ONLY (≥2 chars), sitting
  // immediately before a CLOSING tag `</`. Requiring the trailing `</` is the discipline that anchors to real
  // element text and keeps false positives low: `<button>Delete Account</button>` HITS, while the idiomatic
  // translation form `<button>{t('x')}</button>` (a `{` after `>`) and comparison prose `if (a > b) return c
  // < d` / a markdown blockquote `> Note: …` (no `</`) do NOT.
  { kind: "jsx-text-literal", re: />\s*[A-Za-z][A-Za-z0-9 ,.!?:;'-]+<\// },
  // A canonically user-facing JSX/HTML attribute assigned a QUOTED literal with >=2 letters. The idiomatic
  // form `placeholder={t('x')}` uses a brace, not a quote, so it does NOT match; `defaultMessage="…"` / `id=`
  // are deliberately EXCLUDED (alongside an id, defaultMessage is the CORRECT i18n mechanism, not a violation).
  {
    kind: "user-facing-attribute-literal",
    re: /\b(?:placeholder|aria-label|alt|title)\s*=\s*["'][^"']*[A-Za-z]{2,}[^"']*["']/i,
  },
];

function main() {
  if (!TARGET) return fail("usage: scan-plan-i18n.mjs <plan-file>");
  // Fail-closed (P5): a missing / non-file target is an ERROR, never a silent empty (= "clean") result.
  // ONE descriptor (the griller-extract.mjs 6.60.1 form, CodeQL js/file-system-race): the type check and the read see
  // the same file, so the path cannot be swapped between them. O_NOFOLLOW refuses a symlink at the final component
  // (ELOOP; since 6.67.1 a symlinked plan is refused, as grill-scan.mjs already refuses one); O_NONBLOCK keeps a FIFO
  // from blocking the open, and fstat then refuses it as not a regular file.
  const notFile = () => fail(`target file not found (or not a regular file): ${TARGET}`);
  let fd;
  try {
    fd = openSync(TARGET, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (e) {
    if (e && ["ENOENT", "ENOTDIR", "ELOOP"].includes(e.code)) return notFile();
    return fail(`could not read target: ${e.message}`);
  }
  let text;
  try {
    if (!fstatSync(fd).isFile()) return notFile();
    text = readFileSync(fd, "utf8");
  } catch (e) {
    return fail(`could not read target: ${e.message}`);
  } finally {
    closeSync(fd);
  }

  const hits = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    for (const { kind, re } of PATTERNS) {
      if (re.test(lines[i])) hits.push({ line: i + 1, kind });
    }
  }
  // Deterministic order: by line, then by kind (a line matching >1 pattern yields >1 hit, stably ordered).
  hits.sort((a, b) => a.line - b.line || a.kind.localeCompare(b.kind));

  process.stdout.write(JSON.stringify({ found: hits.length > 0, hits }) + "\n");
  return 0;
}

// THE FLUSH RULE (6.20.4; this CLI since 6.67.1, TST-5): the exit code is SET and the process ends naturally, after
// Node has drained stdout — grill-scan.mjs JSON.parses this document through spawnSync, and an immediate exit
// dropped queued writes past a pipe's 64 KiB buffer on darwin. pharn/floor/cli-stdout-flush.test.mjs pins it.
process.exitCode = main();
