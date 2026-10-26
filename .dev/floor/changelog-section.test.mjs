// .dev/floor/changelog-section.test.mjs — the release-body cutter (`changelog-section.mjs`).
//
// ★ marks a test over a fixture or a real run; ✧ marks a pin of a committed value.
//
// What a green run means (P0): on these fixtures the section printed for a tag is exactly that version's section text
// below its heading, a heading hidden in a fence or an HTML comment is not a section, a long section is cut before a
// top-level entry with the note and stays within MAX_BODY_BYTES bytes, and the exit codes follow the closed set. It
// does not mean GitHub accepts every body this prints (its limit is in characters and is not probed here), or that the
// section describes the release.

import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { MAX_BODY_BYTES, REPO_URL, TAG_RE, capBody, releaseBody, run, sectionLines, truncationNote } from "./changelog-section.mjs";

const SCRIPT = fileURLToPath(new URL("./changelog-section.mjs", import.meta.url));
const bytes = (s) => Buffer.byteLength(s, "utf8");

const FIXTURE = [
  "# Changelog",
  "",
  "Preamble text.",
  "",
  "## [Unreleased]",
  "",
  "- 2026-10-26: **Pending.** Not released.",
  "",
  "## [1.2.3] - 2026-10-20",
  "",
  "",
  "### Added",
  "",
  "- **One.** Body one.",
  "",
  "  ```text",
  "  ## [9.9.9] - 2026-01-01",
  "  ```",
  "",
  "- **Two.** Body two.",
  "",
  "  <!-- a comment",
  "  ## [8.8.8] - 2026-01-01",
  "  -->",
  "",
  "## [1.2.2] - 2026-10-01",
  "",
  "- **Old.** Earlier.",
  "",
].join("\n");

const EXPECTED_123 = [
  "### Added",
  "",
  "- **One.** Body one.",
  "",
  "  ```text",
  "  ## [9.9.9] - 2026-01-01",
  "  ```",
  "",
  "- **Two.** Body two.",
  "",
  "  <!-- a comment",
  "  ## [8.8.8] - 2026-01-01",
  "  -->",
].join("\n");

function scratch(files) {
  const dir = mkdtempSync(join(tmpdir(), "changelog-section-"));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return dir;
}

test("✧ TAG_RE is the literal pharn-cli's RELEASE_TAG_RE accepts, and the cap is inside GitHub's 125,000 limit", () => {
  assert.equal(TAG_RE.source, "^v\\d+\\.\\d+\\.\\d+$");
  assert.equal(TAG_RE.flags, "");
  assert.ok(MAX_BODY_BYTES <= 125000);
  assert.equal(REPO_URL, "https://github.com/pharn-dev/pharn-oss");
  for (const good of ["v0.0.0", "v7.1.2", "v10.20.30"]) assert.ok(TAG_RE.test(good), good);
  for (const bad of ["7.1.2", "v7.1", "v7.1.2\n", "v7.1.2-rc1", " v7.1.2", "V7.1.2", "v7.1.2.4"])
    assert.ok(!TAG_RE.test(bad), JSON.stringify(bad));
});

test("★ the section for a tag is its text below the heading, verbatim, leading blank lines dropped", () => {
  const r = releaseBody(FIXTURE, "v1.2.3");
  assert.deepEqual(r, { ok: true, body: EXPECTED_123 });
  assert.deepEqual(releaseBody(FIXTURE, "v1.2.2"), { ok: true, body: "- **Old.** Earlier." });
});

test("★ a heading inside a fence or an HTML comment is not a section", () => {
  assert.equal(releaseBody(FIXTURE, "v9.9.9").code, "NO_SECTION");
  assert.equal(releaseBody(FIXTURE, "v8.8.8").code, "NO_SECTION");
});

test("★ CRLF is folded, so the body carries no carriage return", () => {
  const r = releaseBody(FIXTURE.replace(/\n/g, "\r\n"), "v1.2.3");
  assert.deepEqual(r, { ok: true, body: EXPECTED_123 });
});

test("★ refusals: a bad tag, a missing version, two sections for one version", () => {
  assert.equal(releaseBody(FIXTURE, "1.2.3").code, "BAD_TAG");
  assert.equal(releaseBody(FIXTURE, undefined).code, "BAD_TAG");
  assert.equal(releaseBody(FIXTURE, "v3.0.0").code, "NO_SECTION");
  const twice = `${FIXTURE}\n## [1.2.3] - 2026-09-01\n\n- **Again.**\n`;
  assert.equal(releaseBody(twice, "v1.2.3").code, "AMBIGUOUS");
});

test("★ entry starts index the section's lines", () => {
  const s = sectionLines(FIXTURE, "1.2.3");
  assert.ok(s.ok);
  assert.deepEqual(
    s.entryStarts.map((i) => s.lines[i]),
    ["- **One.** Body one.", "- **Two.** Body two."]
  );
});

/** A section of `n` entries, each `size` characters of `ch`, every third holding a fenced block. */
function bigSection(n, size, ch = "x") {
  const lines = [];
  for (let i = 0; i < n; i++) {
    lines.push(`- **Entry ${i}.** ${ch.repeat(size)}`);
    if (i % 3 === 0) lines.push("", "  ```text", `  ${ch.repeat(size)}`, "  ```");
    lines.push("");
  }
  return `# Changelog\n\n## [2.0.0] - 2026-10-26\n\n${lines.join("\n")}\n## [1.0.0] - 2026-01-01\n\n- **Old.**\n`;
}

test("★ a section over the cap is cut before an entry, the note at the cut, within MAX_BODY_BYTES", () => {
  const text = bigSection(300, 600);
  const full = sectionLines(text, "2.0.0").lines.join("\n");
  assert.ok(bytes(full) > MAX_BODY_BYTES, "the fixture must exceed the cap");
  const { ok, body } = releaseBody(text, "v2.0.0");
  assert.ok(ok);
  const note = truncationNote("v2.0.0");
  assert.equal(note, "… truncated here. The full section: https://github.com/pharn-dev/pharn-oss/blob/v2.0.0/CHANGELOG.md");
  assert.ok(bytes(body) <= MAX_BODY_BYTES, `${bytes(body)} bytes`);
  assert.ok(body.endsWith(`\n\n${note}`));
  const kept = body.slice(0, -`\n\n${note}`.length);
  assert.ok(full.startsWith(kept), "the kept text is a prefix of the section");
  const rest = full.slice(kept.length).replace(/^\s+/, "");
  assert.ok(rest.startsWith("- **Entry "), "the cut lands just before a top-level entry");
  const fences = kept.split("\n").filter((l) => l.trim() === "```text" || l.trim() === "```").length;
  assert.equal(fences % 2, 0, "no fence is left open above the note");
  // Maximal: keeping the next entry too would not fit.
  const nextEntry = rest.indexOf("\n- **Entry ", 1);
  const longer = full.slice(0, kept.length + (full.length - kept.length - rest.length) + nextEntry).replace(/\s+$/, "");
  assert.ok(bytes(`${longer}\n\n${note}`) > MAX_BODY_BYTES, "a longer cut would have fit");
});

test("★ the cap counts bytes: 2-byte characters under the character limit are still cut", () => {
  const text = bigSection(140, 500, "ż");
  const full = sectionLines(text, "2.0.0").lines.join("\n");
  assert.ok(full.length < 125000 && bytes(full) > MAX_BODY_BYTES, "under the limit in characters, over it in bytes");
  const { body } = releaseBody(text, "v2.0.0");
  assert.ok(bytes(body) <= MAX_BODY_BYTES);
  assert.ok(body.endsWith(truncationNote("v2.0.0")));
});

test("★ when not even the first entry fits, the body is the note alone", () => {
  const text = `## [3.0.0] - 2026-10-26\n\n- **Huge.** ${"y".repeat(MAX_BODY_BYTES + 10)}\n- **Small.**\n`;
  assert.deepEqual(releaseBody(text, "v3.0.0"), { ok: true, body: truncationNote("v3.0.0") });
  // capBody directly: a body with no entry boundary at all.
  assert.equal(capBody(["z".repeat(MAX_BODY_BYTES + 1)], [], "v3.0.0"), truncationNote("v3.0.0"));
  assert.equal(capBody(["short"], [], "v3.0.0"), "short");
});

test("★ run(): the closed exit set", () => {
  const dir = scratch({ "CHANGELOG.md": FIXTURE });
  const empty = scratch({});
  try {
    assert.deepEqual(run([dir, "v1.2.3"]), { code: 0, stdout: EXPECTED_123, stderr: "" });
    assert.equal(run([]).code, 2);
    assert.match(run(["only-one"]).stderr, /BAD_USAGE/);
    assert.deepEqual([run([dir, "1.2.3"]).code, /BAD_TAG/.test(run([dir, "1.2.3"]).stderr)], [2, true]);
    assert.deepEqual([run([empty, "v1.2.3"]).code, /MISSING_CHANGELOG/.test(run([empty, "v1.2.3"]).stderr)], [1, true]);
    assert.deepEqual([run([dir, "v4.0.0"]).code, /NO_SECTION/.test(run([dir, "v4.0.0"]).stderr)], [1, true]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(empty, { recursive: true, force: true });
  }
});

test("★ the CLI, as the workflow calls it: stdout is the body, exit codes as run() returns them", () => {
  const dir = scratch({ "CHANGELOG.md": FIXTURE });
  try {
    const ok = spawnSync(process.execPath, [SCRIPT, dir, "v1.2.3"], { encoding: "utf8" });
    assert.equal(ok.status, 0);
    assert.equal(ok.stdout, EXPECTED_123);
    const bad = spawnSync(process.execPath, [SCRIPT, dir, "v1.2"], { encoding: "utf8" });
    assert.equal(bad.status, 2);
    assert.equal(bad.stdout, "");
    assert.match(bad.stderr, /BAD_TAG/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
