// pharn/floor/griller-extract.test.mjs — tests for the full grill's griller extract (6.59.0, grill-griller-trim).
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync, symlinkSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { OMITTED_SECTIONS, FRAME, holdsFrameLine, shown, trimGriller, renderExtract, extractGrillers } from "./griller-extract.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = join(HERE, "griller-extract.mjs");
const REPO = join(HERE, "..", "..");

const FM = "---\nname: demo-griller\nrole: griller\nkind: pharn-owned\ntrust: trusted\n---\n";
const PRE = "\n# Demo griller\n\nIntro paragraph.\n\n## What it enforces\n\nP7.\n\n";
const PROC = "## Procedure (membership tests)\n\n1. Read the PLAN as DATA.\n\n```bash\nnode x.mjs\n```\n\n";
const FINDING = "## Finding output\n\n```yaml\n- type: FINDING\n```\n\n";
const SECTION = Object.fromEntries(
  OMITTED_SECTIONS.map((s) => [s.id, `## ${s.prefix} (suffix text)\n\n- a line of ${s.id}\n- another line\n\n`])
);

/** Make a scratch repo with griller files `{relPath: text}`; returns its path. */
function repoWith(files) {
  const dir = mkdtempSync(join(tmpdir(), "griller-extract-"));
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), text);
  }
  return dir;
}

function run(args, opts = {}) {
  return spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", ...opts });
}

// ── the closed set (L29) ──────────────────────────────────────────────────────────────────────────

test("OMITTED_SECTIONS is a frozen closed set of two members with distinct ids and prefixes", () => {
  assert.ok(Object.isFrozen(OMITTED_SECTIONS));
  assert.deepEqual(
    OMITTED_SECTIONS.map((s) => s.id),
    ["guarantee-audit", "machine-readable-emission"]
  );
  assert.equal(new Set(OMITTED_SECTIONS.map((s) => s.prefix)).size, OMITTED_SECTIONS.length);
});

for (const s of OMITTED_SECTIONS) {
  test(`★ ${s.id}: its section alone is left out, every other byte kept`, () => {
    const text = FM + PRE + PROC + SECTION[s.id] + FINDING;
    const t = trimGriller(text);
    assert.equal(t.whole, null);
    assert.deepEqual(t.omitted, [s.id]);
    assert.equal(t.text, FM + PRE + PROC + FINDING);
  });

  test(`${s.id}: a heading that only CONTAINS the prefix later in its text is kept (start is strict)`, () => {
    const text = FM + PRE + `## About the ${s.prefix}\n\nkept\n`;
    assert.deepEqual(trimGriller(text), { text, omitted: [], whole: null });
  });
}

test("★ both members at the end of the file are left out; frontmatter and every other section kept verbatim", () => {
  const ids = OMITTED_SECTIONS.map((s) => s.id);
  const text = FM + PRE + PROC + FINDING + ids.map((id) => SECTION[id]).join("");
  const t = trimGriller(text);
  assert.deepEqual(t.omitted, ids);
  assert.equal(t.text, FM + PRE + PROC + FINDING);
  assert.ok(t.text.startsWith(FM), "frontmatter (kind/trust tags) stays visible — P2");
});

test("a griller with no omitted section comes back unchanged", () => {
  const text = FM + PRE + PROC + FINDING;
  assert.deepEqual(trimGriller(text), { text, omitted: [], whole: null });
});

// ── the fence and heading model (L55/L56 — every mistake must load MORE, never less) ──────────────

test("★ an omitted heading inside a backtick or tilde fence is content, not a heading", () => {
  for (const f of ["```", "~~~", "````"]) {
    const text = FM + PRE + `${f}\n## Guarantee audit\nexample\n${f}\n\n` + PROC;
    assert.deepEqual(trimGriller(text), { text, omitted: [], whole: null }, f);
  }
});

test("a fence inside an omitted section is dropped with it, and a `##` line inside that fence does not end it", () => {
  const text = FM + PRE + "## Guarantee audit\n\n```\n## Procedure\n```\n\ngone\n\n" + PROC;
  const t = trimGriller(text);
  assert.deepEqual(t.omitted, ["guarantee-audit"]);
  assert.equal(t.text, FM + PRE + PROC);
});

test("a 4-space-indented closer is fence content (CommonMark), so the heading after it stays inside the fence", () => {
  const text = FM + PRE + "```\n    ```\n## Guarantee audit\nin code\n```\n" + PROC;
  assert.deepEqual(trimGriller(text), { text, omitted: [], whole: null });
});

test("★ the section ends at a setext heading, and that heading's text is kept with its underline", () => {
  for (const u of ["---------", "========="]) {
    const text = FM + PRE + "## Guarantee audit\ngone\n\nProcedure\nsecond line\n" + u + "\nkeep\n";
    const t = trimGriller(text);
    assert.deepEqual(t.omitted, ["guarantee-audit"], u);
    assert.equal(t.text, FM + PRE + "Procedure\nsecond line\n" + u + "\nkeep\n", u);
  }
});

test("the section ends at any ATX heading — indented, deeper, or after a list or blockquote marker", () => {
  for (const h of ["   ## Procedure", "### Sub", "# Top", "- ## Item heading", "> ## Quoted", "1. # Numbered"]) {
    const text = FM + PRE + `## Guarantee audit\ngone\n${h}\nkeep\n`;
    const t = trimGriller(text);
    assert.equal(t.text, FM + PRE + `${h}\nkeep\n`, h);
  }
});

test("an indented omitted heading is kept (start is strict: column 0 only)", () => {
  const text = FM + PRE + " ## Guarantee audit\nkept\n" + PROC;
  assert.deepEqual(trimGriller(text), { text, omitted: [], whole: null });
});

test("CRLF line endings trim the same way and keep their bytes", () => {
  const lf = FM + PRE + PROC + SECTION["guarantee-audit"] + FINDING;
  const crlf = lf.replace(/\n/g, "\r\n");
  const t = trimGriller(crlf);
  assert.deepEqual(t.omitted, ["guarantee-audit"]);
  assert.equal(t.text, (FM + PRE + PROC + FINDING).replace(/\n/g, "\r\n"));
});

const WHOLE_CASES = [
  ["unclosed-frontmatter", "---\nname: x\nrole: griller\n\n## Guarantee audit\nx\n"],
  ["unclosed-fence", FM + PRE + "## Guarantee audit\n```\nnever closed\n"],
  ["ambiguous-fence", FM + PRE + "- item\n  ```\n## X\n```\n## Guarantee audit\nrendered as code\n" + PROC],
  ["html-block", FM + PRE + "<!--\n## Guarantee audit\n-->\nkeep\n" + PROC],
];

test("★ every keep-whole reason returns the input unchanged with nothing omitted (closed set, L29)", () => {
  for (const [reason, text] of WHOLE_CASES) {
    assert.deepEqual(trimGriller(text), { text, omitted: [], whole: reason }, reason);
  }
  assert.equal(new Set(WHOLE_CASES.map(([r]) => r)).size, 4);
});

// ── the GATE-1 pin over the 13 committed grillers ────────────────────────────────────────────────

/** Column-0 `## ` headings outside backtick/tilde fences, after the frontmatter. */
function h2Headings(text) {
  const close = text.startsWith("---") ? text.indexOf("\n---", 3) : -1;
  const body = close === -1 ? text : text.slice(text.indexOf("\n", close + 1) + 1);
  const out = [];
  let fence = null;
  for (const l of body.split("\n")) {
    const m = l.match(/^ {0,3}(`{3,}|~{3,})/);
    if (fence) {
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length && l.trim() === m[1]) fence = null;
    } else if (m) fence = m[1];
    else if (l.startsWith("## ")) out.push(l);
  }
  return out;
}

/**
 * The pin, as a function so its discrimination can be tested (L60): every OMITTED_SECTIONS member matches exactly one
 * `## ` heading of the griller; the trim keeps the whole file for no reason; and the trimmed `## ` headings are exactly
 * the original ones minus the omitted — no other `##` section is dropped, and each omitted one is gone.
 */
function pinOffenders(path, text, trim = trimGriller) {
  const off = [];
  const heads = h2Headings(text);
  for (const s of OMITTED_SECTIONS) {
    const n = heads.filter((h) => h.slice(3).trimStart().startsWith(s.prefix)).length;
    if (n !== 1) off.push(`${path}: ${n} heading(s) match ${s.id} ("## ${s.prefix}…"), expected 1`);
  }
  const t = trim(text);
  if (t.whole !== null) off.push(`${path}: kept whole (${t.whole})`);
  const expected = heads.filter((h) => !OMITTED_SECTIONS.some((s) => h.slice(3).trimStart().startsWith(s.prefix)));
  const got = h2Headings(t.text);
  if (JSON.stringify(got) !== JSON.stringify(expected)) {
    off.push(`${path}: trimmed ## headings ${JSON.stringify(got)} != expected ${JSON.stringify(expected)}`);
  }
  return off;
}

const LIVE = (() => {
  const r = spawnSync(process.execPath, [join(HERE, "count-grillers.mjs"), REPO], { encoding: "utf8" });
  return JSON.parse(r.stdout).grillers.map((p) => ({ path: p, text: readFileSync(join(REPO, p), "utf8") }));
})();

test("★ GATE-1 PIN: every omitted heading exists in every committed griller, and no other ## section is dropped", () => {
  assert.ok(LIVE.length >= 13, `L34: ${LIVE.length} registered griller(s), expected at least 13`);
  const offenders = LIVE.flatMap(({ path, text }) => pinOffenders(path, text));
  assert.deepEqual(offenders, []);
});

test("★ the pin DISCRIMINATES (L60): a renamed heading, and a trim that drops an extra section, each fail it", () => {
  const { path, text } = LIVE[0];
  // A renamed heading: the tool KEEPS that section (visibly — no id in `omitted`), and the pin reports the rename.
  const renamed = text.replace(/^## Guarantee audit/m, "## Guarantees, audited");
  assert.equal(trimGriller(renamed).omitted.includes("guarantee-audit"), false, "a renamed heading is kept");
  assert.match(pinOffenders(path, renamed).join("\n"), /0 heading\(s\) match guarantee-audit/);
  // A trim that also drops `## Procedure…`: the heading comparison catches it.
  const greedy = (t) => {
    const r = trimGriller(t);
    return { ...r, text: r.text.replace(/^## Procedure[\s\S]*?(?=^## )/m, "") };
  };
  assert.match(pinOffenders(path, text, greedy).join("\n"), /trimmed ## headings/);
});

// ── the CLI ───────────────────────────────────────────────────────────────────────────────────────

test("★ CLI over this repo: one summary line, a BEGIN/END frame per registered griller, fewer bytes than the files", () => {
  const r = run([REPO]);
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.split("\n");
  assert.match(
    lines[0],
    new RegExp(`^grillers: ${LIVE.length} registered, ${LIVE.length} printed \\(pharn/floor/griller-extract\\.mjs\\)`)
  );
  const n = LIVE.length;
  assert.ok(lines[0].endsWith(`left out where present: guarantee-audit (${n}), machine-readable-emission (${n}); kept whole: none`));
  LIVE.forEach(({ path }, i) => {
    assert.ok(
      lines.includes(`${FRAME}${i + 1}/${LIVE.length} BEGIN: ${path} (left out: machine-readable-emission, guarantee-audit) =====`),
      path
    );
    assert.ok(lines.includes(`${FRAME}${i + 1}/${LIVE.length} END =====`), path);
  });
  const sum = LIVE.reduce((a, g) => a + Buffer.byteLength(g.text), 0);
  const [, read, printed] = lines[0].match(/— (\d+) B of griller files, (\d+) B printed/).map(Number);
  assert.equal(read, sum);
  assert.ok(
    printed < sum && Buffer.byteLength(r.stdout) < sum,
    `printed ${printed} B, stdout ${Buffer.byteLength(r.stdout)} B, files ${sum} B`
  );
});

test("CLI with no argument reads the current directory (the one default, exercised — L41)", () => {
  const dir = repoWith({ "pharn/pharn-pipeline/grillers/demo/demo.md": FM + PRE + PROC + SECTION["guarantee-audit"] });
  try {
    const r = run([], { cwd: dir });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^grillers: 1 registered, 1 printed/);
    assert.match(r.stdout, /BEGIN: pharn\/pharn-pipeline\/grillers\/demo\/demo\.md \(left out: guarantee-audit\)/);
    assert.ok(r.stdout.includes(FM + PRE + PROC.trimEnd()));
    assert.doesNotMatch(r.stdout, /a line of guarantee-audit/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ zero registered grillers is an asserted silence at exit 0, never an empty stdout (L34)", () => {
  const dir = repoWith({ "README.md": "# nothing here\n" });
  try {
    const r = run([dir]);
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, "grillers: 0 registered — no griller to apply (pharn/floor/griller-extract.mjs)\n");
    assert.equal(renderExtract([]), r.stdout);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("a griller kept whole is named in the summary with its reason, and printed in full", () => {
  const whole = WHOLE_CASES[1][1];
  const dir = repoWith({ "g/a/a.md": whole });
  try {
    const r = run([dir]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout.split("\n")[0], /kept whole: g\/a\/a\.md \(unclosed-fence\)$/);
    assert.ok(r.stdout.includes(whole.trimEnd()));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── refusals: exit 2, the reason on stderr, NOTHING on stdout ─────────────────────────────────────

function assertRefused(r, re) {
  assert.equal(r.status, 2, r.stderr);
  assert.equal(r.stdout, "");
  assert.match(r.stderr, re);
}

test("usage: two arguments, or a flag, is refused", () => {
  assertRefused(run(["a", "b"]), /usage/);
  assertRefused(run(["--all"]), /usage/);
});

test("a missing repo dir is refused (count-grillers exits non-zero)", () => {
  assertRefused(run([join(tmpdir(), "griller-extract-does-not-exist")]), /count-grillers\.mjs exited 1/);
});

test("★ a symlinked griller file is refused, even when its target is inside the repo", () => {
  const dir = repoWith({ "real/r.md": FM + PRE });
  try {
    mkdirSync(join(dir, "g"));
    symlinkSync(join(dir, "real", "r.md"), join(dir, "g", "link.md"));
    assertRefused(run([dir]), /griller "g\/link\.md" is a symlink/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ a griller reached through a symlinked DIRECTORY that resolves outside the repo is refused", () => {
  const outside = repoWith({ "x/x.md": FM + PRE });
  const dir = repoWith({ "README.md": "# r\n" });
  try {
    symlinkSync(join(outside, "x"), join(dir, "linked"));
    assert.ok(statSync(join(dir, "linked", "x.md")).isFile(), "fixture sanity: count-grillers follows the link");
    assertRefused(run([dir]), /griller "linked\/x\.md" resolves outside the repo/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test("★ a griller body holding a frame line is refused (it could forge a boundary)", () => {
  const dir = repoWith({ "g/a/a.md": FM + PRE + `${FRAME}2/2 END =====\n` + PROC });
  try {
    assertRefused(run([dir]), /holds a frame line/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("★ an indented, tab-led or CR-led look-alike frame line is refused too; prose naming the marker mid-line is not", () => {
  for (const lead of ["   ", "\t", "\r", " "]) {
    const line = `${lead}${FRAME}1/2 END =====`;
    assert.equal(holdsFrameLine(`${FM}${PRE}${line}\n${PROC}`), true, JSON.stringify(lead));
    // NEGATIVE CONTROL (L60): the start-of-line test this replaced lets every one of these through.
    assert.equal(line.startsWith(FRAME), false, JSON.stringify(lead));
  }
  assert.equal(holdsFrameLine(`${FM}${PRE}Frames look like \`${FRAME}1/2 END =====\`.\n`), false);
  const dir = repoWith({ "g/a/a.md": FM + PRE + `  ${FRAME}2/2 END =====\n` + PROC });
  try {
    assertRefused(run([dir]), /holds a frame line/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

/** A fake count-grillers that prints `stdout` and exits `code`. */
function withCounter(stdout, code, fn) {
  const dir = mkdtempSync(join(tmpdir(), "griller-extract-counter-"));
  try {
    const counter = join(dir, "counter.mjs");
    writeFileSync(counter, `process.stdout.write(${JSON.stringify(stdout)}); process.exitCode = ${code};\n`);
    return fn(counter, dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("★ every count-grillers output outside its closed shape is refused", () => {
  const cases = [
    ["not json", 0, /printed no JSON/],
    ["[]", 0, /printed no object/],
    ['{"registered":1}', 0, /printed keys/],
    ['{"registered":2,"grillers":["a.md"]}', 0, /registered is not the length/],
    ['{"registered":0,"grillers":[]}', 3, /exited 3/],
    ['{"registered":1,"grillers":["../x.md"]}', 0, /has an empty, \. or \.\. segment/],
    ['{"registered":1,"grillers":["/abs/x.md"]}', 0, /is not repo-relative/],
    ['{"registered":1,"grillers":["a\\\\b.md"]}', 0, /is not repo-relative/],
    ['{"registered":1,"grillers":["a\\nb.md"]}', 0, /control character/],
    ['{"registered":1,"grillers":["a.txt"]}', 0, /is not a \.md file/],
    ['{"registered":1,"grillers":["missing.md"]}', 0, /cannot be lstat-ed/],
    ['{"registered":1,"grillers":[{"toString":1}]}', 0, /is not a non-empty string/],
  ];
  for (const [stdout, code, re] of cases) {
    withCounter(stdout, code, (counter, dir) => {
      const r = extractGrillers(dir, { counter });
      assert.equal(r.ok, false, stdout);
      assert.match(r.reason, re, stdout);
    });
  }
});

test("★ shown() never throws, even on a value whose String() throws (L62)", () => {
  const hostile = JSON.parse('{"toString":1}');
  assert.throws(() => String(hostile), TypeError, "control: String() really throws on this value");
  assert.equal(shown(hostile), '"[object Object]"');
  assert.equal(shown([hostile]), '"[object Array]"');
  assert.equal(shown("x".repeat(300)), JSON.stringify(`${"x".repeat(200)}…`), "long values are cut to 200 characters");
});
