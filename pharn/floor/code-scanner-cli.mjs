// pharn/floor/code-scanner-cli.mjs — the shared command-line front end of the 18 `scan-code-*.mjs` code scanners
// (CONSTITUTION P0/P5). A library, not a CLI: each scanner keeps its own detection in `scanText(text)` and hands
// this module its argv.
//
// WHY ONE FRONT END (P7 — the triggering failure, measured). `/pharn-review`'s prefilter
// (`render-review-assignments.mjs`) used to spawn `node <scanner> <file>` once per (mapped lens × target file):
// 18 × N node processes at 27–83 ms each, ≈59 min for this repo's 2,908 files under load and hours for a 24k-file
// tree (review finding CTX-3, `.dev/features/review-fanout/MEASUREMENTS.md`). A batch mode lets the emitter spawn
// each scanner ONCE per review. Writing that mode 18 times would be 18 chances to get it subtly different, so it
// lives here once and every scanner calls it.
//
// THE TWO MODES.
//   <code-file>        — the single-file contract every scanner always had, byte for byte: stdout
//                        `{"found":<bool>,"hits":[…]}` + "\n", exit 0. A missing / non-regular / unreadable target
//                        or no argument → one `<scanner>: …` line on stderr, NOTHING on stdout, exit 1 (fail-closed:
//                        a target the scanner could not read is never reported as "clean", P5).
//   --files <list|->   — the list is NUL-separated paths (`-` = stdin; empty entries dropped, so a trailing NUL is
//                        fine; NUL because a path may contain a newline but never a NUL). Stdout is ONE JSON
//                        document `{"results":[…]}` + "\n" with one entry per list entry, in list order: the
//                        single-file object with `file` (the path exactly as given) in front —
//                        `{"file","found","hits"}` — or `{"file","error":"<message>"}` for an entry the single-file
//                        mode would refuse, carrying that refusal's message. Exit 0 once the list was read; exit 1
//                        with NOTHING on stdout when the flag has no value, extra arguments follow it, or the list
//                        cannot be read.
//
// WHAT "THE SAME AS N SINGLE-FILE RUNS" RESTS ON, AND ITS BOUND (P0). One process now scans many files, so any
// state a scanner keeps at module level could carry from file i to file i+1 — a `/g` regex's `lastIndex`, a
// counter, a cache. Each scanner's `scanText` is written to keep nothing between calls, and
// `code-scanner-cli.test.mjs` compares batch output against real single-file runs for every scanner over a fixed
// corpus, with a deliberately stateful mutant as its negative control. That is a differential test over THAT
// corpus (L55): carried state that no corpus file triggers is not excluded by it.
//
// THE FLUSH RULE (6.20.4). A batch document over a large target is far past 64 KiB, and on darwin a piped stdout is
// cut at 65,536 bytes when the process ends at once (`process.exit()` drops what is still queued).
// `render-review-assignments.mjs` JSON-parses this output, so a cut document would turn every file into a scanner
// error. Hence `runScannerCli` RETURNS the exit code and each scanner ends with
// `process.exitCode = runScannerCli(…)`, letting Node drain stdout; `cli-stdout-flush.test.mjs` pins every scanner.
//
// Stdlib-only. NO entry guard here and no runtime-floor import: this module never runs on its own; each scanner
// carries both.

import { readFileSync, statSync, existsSync } from "node:fs";

/** The batch flag. */
export const FILES_FLAG = "--files";

/** The list separator — built from its code so this source stays printable ASCII (source-nul-guard.test.mjs). */
const NUL = String.fromCharCode(0);

/**
 * Scan one path exactly as single-file mode always did: `{found, hits}` on a clean read, else `{error}` carrying the
 * refusal message single-file mode prints. Never throws for a path it cannot read.
 * @param {string} path
 * @param {(text: string) => object[]} scanText  the scanner's pure detector; returns the sorted hits
 */
export function scanFile(path, scanText) {
  let isFile;
  try {
    isFile = existsSync(path) && statSync(path).isFile();
  } catch {
    isFile = false; // the path vanished or became unreadable between the two calls
  }
  if (!isFile) return { error: `target file not found (or not a regular file): ${path}` };
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch (e) {
    return { error: `could not read target: ${e.message}` };
  }
  const hits = scanText(text);
  return { found: hits.length > 0, hits };
}

/**
 * Run one scanner's command line. Returns the exit code; the caller assigns it to `process.exitCode` and lets the
 * process end on its own (the flush rule). Writes the verdict to stdout and every refusal to stderr.
 * @param {string} name      the scanner's name, e.g. "scan-code-secrets" — the prefix of every stderr line
 * @param {(text: string) => object[]} scanText
 * @param {string[]} argv    `process.argv.slice(2)`
 */
export function runScannerCli(name, scanText, argv) {
  const refuse = (msg) => {
    process.stderr.write(`${name}: ${msg}\n`);
    return 1;
  };
  if (argv[0] === FILES_FLAG) {
    if (argv.length !== 2) return refuse(`usage: ${name}.mjs ${FILES_FLAG} <nul-separated-list | ->`);
    let raw;
    try {
      raw = readFileSync(argv[1] === "-" ? 0 : argv[1]);
    } catch (e) {
      return refuse(`could not read the file list: ${e.message}`);
    }
    const entries = raw
      .toString("utf8")
      .split(NUL)
      .filter((p) => p !== "");
    const results = entries.map((file) => ({ file, ...scanFile(file, scanText) }));
    process.stdout.write(JSON.stringify({ results }) + "\n");
    return 0;
  }
  const target = argv[0];
  if (!target) return refuse(`usage: ${name}.mjs <code-file>  |  ${name}.mjs ${FILES_FLAG} <nul-separated-list | ->`);
  const verdict = scanFile(target, scanText);
  if (verdict.error !== undefined) return refuse(verdict.error);
  process.stdout.write(JSON.stringify(verdict) + "\n");
  return 0;
}
