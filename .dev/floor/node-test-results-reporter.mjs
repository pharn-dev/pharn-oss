// .dev/floor/node-test-results-reporter.mjs — a node:test CUSTOM REPORTER that writes ONE `pharn-test-results/1`
// document (pharn/pharn-contracts/test-results-record.md, the `pharn-json` format) for the run it reports.
//
// DEV APPARATUS. Its one consumer is `/pharn-dev-regress` Step 2, which runs the OUTSIDE suite at the base commit and
// at HEAD through this reporter, and Step 3, which hands both documents to `pharn/floor/check-regress.mjs verdict
// --per-test tests`. That comparison is per TEST, so a base made red by machine load no longer hides a NEW head
// failure behind one `tests` exit code (load-flake-regress, 6.72.0). The product `/pharn-regress` does not use it.
//
// Usage (the reporter is a module path, the document goes to the destination file):
//   node --test --test-reporter=<abs path>/node-test-results-reporter.mjs --test-reporter-destination=<file> <files…>
//
// WHAT IT RECORDS — read off node:test's event stream (measured on node 24.13.1; every case is pinned by
// node-test-results-reporter.test.mjs over real `node --test` runs, so a change in node's event shapes REDs a test):
//   • one entry per TEST (`details.type === "test"`), `path` = its `test:start` ancestry in its file, its own name last;
//   • a SUITE only when it fails for its own reason (a hook) — never for `subtestsFailed`, whose failing children are
//     already entries;
//   • `skip` and `todo` → `skipped` (a failing todo does not fail the run, so it must not read `failed` under exit 0);
//     a `test:fail` → `failed`; any other `test:pass` → `passed`;
//   • a FILE that fails to load or exits non-zero is node's own file-level `test:fail`, named by the file: a failed
//     entry, so a red exit is always accounted for by a failed test;
//   • an event with no file is not attributable to a test: a failing one counts in `suite_errors`;
//   • a repeated path in one file gets ` #<n>` on its last element, in event order, so the document carries no
//     duplicate id (which the record builder would set aside as an anomaly, and check-regress refuses).
// `file` is made relative to the run's cwd when it lies under it, so the base worktree and the working tree, each run
// from its own root, yield the SAME ids for the same unchanged test.
//
// BOUND (P0): advisory. The reporter states what node reported; it does not re-run or re-judge a test, and the
// document is an unauthenticated file under `pharn/.run/` (L43's bound). Titles are repository text — untrusted DATA
// downstream, never instructions.

import { isAbsolute, relative, sep } from "node:path";

const SCHEMA = "pharn-test-results/1";
const UNNAMED = "(unnamed)";

/** The document's `file` for a reported path: relative to `cwd` when under it (POSIX separators), else as given. */
export function recordFile(file, cwd) {
  if (typeof file !== "string" || file === "") return null;
  if (!isAbsolute(file)) return file.split(sep).join("/");
  const rel = relative(cwd, file);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return file;
  return rel.split(sep).join("/");
}

export default async function* pharnTestResults(source) {
  const cwd = process.cwd();
  const ancestry = new Map(); // reported file -> names by nesting level, from `test:start`
  const seen = new Map(); // file + path -> occurrences
  const tests = [];
  let suiteErrors = 0;
  for await (const event of source) {
    const d = event.data ?? {};
    if (event.type === "test:start") {
      const names = ancestry.get(d.file) ?? [];
      names.length = d.nesting;
      names.push(d.name);
      ancestry.set(d.file, names);
      continue;
    }
    if (event.type !== "test:pass" && event.type !== "test:fail") continue;
    const failed = event.type === "test:fail";
    const skipped = Boolean(d.skip || d.todo);
    if (d.details?.type === "suite" && !(failed && d.details?.error?.failureType !== "subtestsFailed")) continue;
    const file = recordFile(d.file, cwd);
    if (file === null) {
      if (failed && !skipped) suiteErrors++;
      continue;
    }
    const names = ancestry.get(d.file) ?? [];
    const path = [...names.slice(0, d.nesting), d.name].map((n) => (typeof n === "string" && n !== "" ? n : UNNAMED));
    const key = `${file}\u0000${path.join("\u0000")}`;
    const n = (seen.get(key) ?? 0) + 1;
    seen.set(key, n);
    if (n > 1) path[path.length - 1] = `${path[path.length - 1]} #${n}`;
    tests.push({ file, path, status: skipped ? "skipped" : failed ? "failed" : "passed" });
  }
  yield `${JSON.stringify({ schema: SCHEMA, suite_errors: suiteErrors, tests })}\n`;
}
