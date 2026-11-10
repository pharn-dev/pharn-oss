// pharn/floor/regular-file.mjs — read one input file safely (7.7.0, loop-grill-triage review A4): opened once with
// O_NOFOLLOW, checked (fstat) and read through that one descriptor, so a final-component link is refused and the file
// cannot be swapped between the check and the read (L54). One copy for the floor CLIs that read a model-written input
// by path — grill-findings.mjs and grill-triage.mjs — instead of a copy in each (L35); check-loop-record.mjs keeps its
// own witness reader, whose contract differs (fixed refusal phrases, a 4 KiB bound, a located path, never an argument).
//
// Returns `{ok: true, bytes}` or `{ok: false, reason}`. The reason names the path and label the caller passed, never
// any content (P2), and is a fixed phrase per cause: not found (ENOENT), not a regular file (a link — ELOOP — a
// directory, a FIFO …), larger than `max` bytes, or could not be read (any other error). Never throws (L62).
// A parent directory that is a link is followed, as every path-taking CLI here follows it; containment is not this
// module's job.

import { closeSync, constants, fstatSync, openSync, readFileSync } from "node:fs";

/** Read `path` as bytes; `label` names it in a refusal; `max` is the size cap in bytes. */
export function readRegularFile(path, label, max) {
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const st = fstatSync(fd);
    if (!st.isFile()) return { ok: false, reason: `${label} is not a regular file: ${path}` };
    if (st.size > max) return { ok: false, reason: `${label} is larger than ${max} bytes: ${path}` };
    return { ok: true, bytes: readFileSync(fd) };
  } catch (e) {
    if (e?.code === "ENOENT") return { ok: false, reason: `${label} not found: ${path}` };
    if (e?.code === "ELOOP") return { ok: false, reason: `${label} is not a regular file: ${path}` };
    return { ok: false, reason: `${label} could not be read: ${path}` };
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}
