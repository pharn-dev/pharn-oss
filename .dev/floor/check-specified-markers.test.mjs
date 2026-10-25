// .dev/floor/check-specified-markers.test.mjs — apparatus tests for the specified-marker checker.
//
// L4: an authored fixture passes by construction. These tests therefore drive the RED paths with real
// fixture trees + fixture manifests (via --manifest), and the ✧ cases are MUTANTS — each asserts the
// checker fails when the thing it guards is broken, not merely that it passes when everything is fine.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, symlinkSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const CHECKER = join(HERE, "check-specified-markers.mjs");
const REPO = join(HERE, "..", "..");

const MARKER = "`pre-egress` _(specified; ships with the guarded surface)_ — blocks a network call";

/** Run the checker; never throws. Returns {code, out}. */
function run(target, manifest) {
  const args = [CHECKER, target];
  if (manifest) args.push("--manifest", manifest);
  try {
    const out = execFileSync(process.execPath, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

/** Build a throwaway target tree + manifest. `opts.hookName` present => the primitive is "live". */
function fixture(opts = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-markers-"));
  mkdirSync(join(dir, ".claude", "hooks"), { recursive: true });
  if (opts.hookName) writeFileSync(join(dir, ".claude", "hooks", opts.hookName), "// stub\n");
  writeFileSync(join(dir, "DOC.md"), opts.docBody ?? `intro\n${MARKER}\noutro\n`);

  const manifest = {
    specified_primitives: [
      {
        id: "pre-egress",
        probe: opts.probe ?? { type: "dir-contains", dir: ".claude/hooks", substring: "egress" },
        sites: opts.sites ?? [{ file: "DOC.md", marker: MARKER }],
      },
    ],
    named_artifacts: opts.named ?? [],
  };
  const mPath = join(dir, "manifest.json");
  writeFileSync(mPath, JSON.stringify(manifest));
  return { dir, mPath, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

// ---------------------------------------------------------------- the two correct states are GREEN

test("GREEN — primitive absent and the marker is present (the F7 steady state)", () => {
  const f = fixture();
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /GREEN/);
});

test("GREEN — primitive live and the marker has been removed (the correct post-ship state)", () => {
  const f = fixture({ hookName: "pre-egress.cjs", docBody: "intro\nno annotation here\noutro\n" });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 0, r.out);
});

// ---------------------------------------------------------------- ✧ direction 1: the primitive ships

test("✧ RED — the primitive SHIPPED but the marker remains (the doc now understates a real protection)", () => {
  const f = fixture({ hookName: "pre-egress.cjs" });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /IS NOW LIVE/);
  assert.match(r.out, /REMOVE the marker/);
  assert.match(r.out, /DOC\.md/);
});

test("✧ the live-probe is a SUBSTRING match on the filename, so any *egress* file trips it", () => {
  const f = fixture({ hookName: "my-pre-egress-hook.cjs" });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 1, r.out);
});

test("a same-directory file NOT matching the substring leaves the primitive not-live", () => {
  const f = fixture({ hookName: "unrelated.cjs" });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 0, r.out);
});

// ------------------------------------------------------------- ✧ direction 2: the marker is deleted

test("✧ RED — the marker was DELETED while the primitive is still absent (silent return to overclaiming)", () => {
  const f = fixture({ docBody: "intro\nblocks a network call to a domain not on a hardcoded allowlist.\noutro\n" });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /annotation is GONE/);
  assert.match(r.out, /still absent/);
});

test("✧ RED — a one-character edit to the marker counts as deleted (exact substring, not fuzzy)", () => {
  const f = fixture({ docBody: `intro\n${MARKER.replace("specified;", "specified:")}\noutro\n` });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 1, r.out);
});

test("✧ RED — a site file that cannot be read is reported, never skipped", () => {
  const f = fixture({ sites: [{ file: "NOPE.md", marker: MARKER }] });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /could not be read/);
});

// -------------------------------------------------------------------- ✧ fail-closed on a bad manifest

test("✧ exit 2 — an unknown probe type fails CLOSED, never a silent GREEN", () => {
  const f = fixture({ probe: { type: "vibes", dir: ".claude/hooks" } });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /unknown probe type/);
});

test("✧ exit 2 — an unreadable manifest fails CLOSED", () => {
  const f = fixture();
  const r = run(f.dir, join(f.dir, "does-not-exist.json"));
  f.cleanup();
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /manifest unusable/);
});

test("✧ exit 2 — a manifest with no specified_primitives array fails CLOSED", () => {
  const f = fixture();
  writeFileSync(f.mPath, JSON.stringify({ nothing: true }));
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 2, r.out);
});

test("✧ exit 2 — a primitive with non-array sites fails CLOSED", () => {
  const f = fixture();
  writeFileSync(
    f.mPath,
    JSON.stringify({
      specified_primitives: [{ id: "pre-egress", probe: { type: "path", path: "DOC.md" }, sites: "DOC.md" }],
    })
  );
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /sites.*must be an array/);
});

test("✧ exit 2 — a site lacking string file/marker fields fails CLOSED", () => {
  const f = fixture();
  writeFileSync(
    f.mPath,
    JSON.stringify({
      specified_primitives: [{ id: "pre-egress", probe: { type: "path", path: "DOC.md" }, sites: [{ file: "DOC.md" }] }],
    })
  );
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /string `file` and `marker`/);
});

test("✧ exit 2 — a named-artifact lacking required string fields fails CLOSED", () => {
  const f = fixture({ named: [{ id: "ghost", cited_in: "DOC.md" }] });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /citation.*must be a string/);
});

// ------------------------------------------------------------------------------ named-artifact half

test("✧ RED — a doc citing an artifact that does not exist (the security-secrets name-drift class)", () => {
  const f = fixture({
    named: [{ id: "ghost", cited_in: "DOC.md", citation: "intro", must_exist: "pharn/pharn-review/ghost" }],
  });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /does not exist/);
});

test("✧ RED — the citation itself drifting out of the doc is caught", () => {
  const f = fixture({
    named: [{ id: "x", cited_in: "DOC.md", citation: "a name no longer present", must_exist: ".claude" }],
  });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /name drifted/);
});

test("✧ RED — obsolete legacy citation coexisting with the corrected name is caught", () => {
  const f = fixture({
    docBody: "intro\nsecrets-in-code lens and security-secrets lens\noutro\n",
    named: [
      {
        id: "secrets-in-code",
        cited_in: "DOC.md",
        citation: "secrets-in-code lens",
        forbidden: ["security-secrets lens"],
        must_exist: ".claude",
      },
    ],
  });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /obsolete name/);
  assert.match(r.out, /remove the legacy citation/);
});

test("✧ exit 2 — a named-artifact with non-array forbidden fails CLOSED", () => {
  const f = fixture({
    named: [
      {
        id: "secrets-in-code",
        cited_in: "DOC.md",
        citation: "secrets-in-code lens",
        forbidden: "security-secrets lens",
        must_exist: ".claude",
      },
    ],
  });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /forbidden.*must be an array/);
});

// ------------------------------------------------------------------------------------- integration

test("integration — the REAL repo is GREEN against the REAL manifest", () => {
  const r = run(REPO);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /GREEN/);
  // The count is asserted as a floor, not a fixed number: adding an annotation must not break this.
  const m = r.out.match(/GREEN — (\d+) annotation/);
  assert.ok(m && Number(m[1]) >= 11, `expected >= 11 annotations, got: ${r.out}`);
});

test("the GREEN line states its own P0 bound (the manifest is not a discovery mechanism)", () => {
  const r = run(REPO);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /never means the docs are accurate/);
});

// ------------------------------------------------------ forward-looking claims (the second class)
//
// Same two directions, different vocabulary: direction 1 is the claim EXPIRING (artifact landed, hedge
// remains), direction 2 is the hedge being DELETED while the artifact is still absent. L4 again — the
// RED paths are driven with real fixture trees, and the ✧ cases are mutants.

const HEDGE = "no `pharn-eval` command exists";

/**
 * Fixture for the forward-claim class. `opts.landed` creates the probed artifact;
 * `opts.hedge === false` omits the hedge sentence from the doc.
 * `opts.forward` overrides the manifest's forward_claims wholesale (including omitting it).
 */
function fwFixture(opts = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-forward-"));
  mkdirSync(join(dir, ".claude", "commands"), { recursive: true });
  if (opts.landed) writeFileSync(join(dir, ".claude", "commands", "pharn-eval.md"), "# stub\n");
  writeFileSync(join(dir, "DOC.md"), opts.hedge === false ? "intro\noutro\n" : `intro\n${HEDGE}\noutro\n`);

  const manifest = { specified_primitives: [] };
  if (!opts.omitForward) {
    manifest.forward_claims = opts.forward ?? [
      {
        id: "pharn-eval",
        probe: { type: "path", path: ".claude/commands/pharn-eval.md" },
        sites: [{ file: "DOC.md", marker: HEDGE }],
      },
    ];
  }
  const mPath = join(dir, "manifest.json");
  writeFileSync(mPath, JSON.stringify(manifest));
  return { dir, mPath, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test("GREEN — artifact absent and the hedge is present (the steady state)", () => {
  const f = fwFixture();
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /GREEN/);
});

test("GREEN — artifact landed and the hedge was re-derived away (the healthy transition)", () => {
  const f = fwFixture({ landed: true, hedge: false });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 0, r.out);
});

test("✧ DIRECTION 1 — the artifact LANDED and the hedge remains: the claim EXPIRED, RED", () => {
  const f = fwFixture({ landed: true });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /EXPIRED/);
  assert.match(r.out, /pharn-eval/);
  assert.match(r.out, /DOC\.md/);
});

test("✧ DIRECTION 1 names the marker to re-derive, not merely the file", () => {
  const f = fwFixture({ landed: true });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.match(r.out, /marker: /);
  assert.match(r.out, /no `pharn-eval` command exists/);
});

test("✧ DIRECTION 2 — the hedge was DELETED while the artifact is still absent, RED", () => {
  const f = fwFixture({ hedge: false });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /is GONE/);
  assert.match(r.out, /implies something exists that does not/);
});

test("✧ L34 — a PRESENT but EMPTY forward_claims array is exit 2 (EMPTY_CLASS), never GREEN", () => {
  const f = fwFixture({ forward: [] });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /EMPTY_CLASS/);
  assert.match(r.out, /vacuously/);
});

test("✧ L34 — the EMPTY_CLASS refusal names the escape (omit the key), so the honest state stays expressible", () => {
  const f = fwFixture({ forward: [] });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.match(r.out, /OMIT the `forward_claims` key/);
});

test("GREEN — OMITTING forward_claims entirely is the expressible 'none registered' state", () => {
  const f = fwFixture({ omitForward: true });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /0 registered claim/);
});

test("✧ a forward_claims key that is not an array fails CLOSED (exit 2)", () => {
  const f = fwFixture({ forward: { id: "not-an-array" } });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /not an array/);
});

test("✧ a forward-claim site whose file cannot be read is RED, not a silent skip", () => {
  const f = fwFixture({
    forward: [
      {
        id: "pharn-eval",
        probe: { type: "path", path: ".claude/commands/pharn-eval.md" },
        sites: [{ file: "NOPE.md", marker: HEDGE }],
      },
    ],
  });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /could not be read/);
});

test("✧ a malformed forward-claim record fails CLOSED (exit 2), same validator as primitives", () => {
  const f = fwFixture({ forward: [{ id: "pharn-eval", probe: { type: "path", path: "x" } }] });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /`sites` must be an array/);
});

test("✧ an unknown probe type on a forward claim fails CLOSED, never 'not landed'", () => {
  const f = fwFixture({
    forward: [{ id: "pharn-eval", probe: { type: "vibes" }, sites: [{ file: "DOC.md", marker: HEDGE }] }],
  });
  const r = run(f.dir, f.mPath);
  f.cleanup();
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /unknown probe type/);
});

test("integration — the REAL manifest registers at least one forward claim (the class stays live)", () => {
  const r = run(REPO);
  assert.equal(r.code, 0, r.out);
  const m = r.out.match(/across (\d+) registered claim/);
  assert.ok(m && Number(m[1]) >= 1, `expected >= 1 registered forward claim, got: ${r.out}`);
});

test("the GREEN line reports the forward-claim counts, so a silently emptied class is visible", () => {
  const r = run(REPO);
  assert.match(r.out, /forward-claim site\(s\) across \d+ registered claim\(s\)/);
});

// ------------------------------------------------ the REAL registrations, driven in BOTH directions
//
// The tests above prove the checker's MECHANICS with synthetic fixtures. These prove the REAL manifest
// entries — real probe, real marker bytes, real doc files — actually fire. L4 again, one level up: a
// registration that is merely PRESENT passes `check:markers` by construction, exactly as an authored
// fixture passes by construction. The only way to know an entry guards anything is to break it.
//
// L29/L36: the enumeration is the deliverable. REGISTERED_IDS is the closed set every rule below
// iterates, and `closure` pins it against the live manifest — so an entry added, removed or renamed
// later fails HERE rather than silently escaping every rule. A per-member assertion written for
// whichever entry the author was looking at is precisely what L36 says not to ship.

const MANIFEST_PATH = join(HERE, "specified-primitives.json");
const REAL_MANIFEST = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

/** Every `specified_primitives` id the manifest is expected to carry. Closure-pinned below. */
const REGISTERED_IDS = [
  "pre-egress",
  "archetype-maps",
  "pharn-estimate",
  "pharn-audits",
  "seam-record",
  "community-privilege",
  "rule_id-roster",
  "constitution-injection",
];

/** The five registrations the `specified-marker-registration` increment added or extended. */
const NEW_REGISTRATIONS = ["seam-record", "community-privilege", "rule_id-roster", "constitution-injection", "archetype-maps"];

const entryFor = (id) => REAL_MANIFEST.specified_primitives.find((p) => p.id === id);

/**
 * Materialize a throwaway tree holding the REAL doc files this entry's sites name, each optionally
 * mutated. `opts.live` additionally creates the artifact the entry's REAL probe looks for.
 * The sub-manifest carries the one real entry, so the other entries' docs need not be copied.
 */
function realFixture(id, opts = {}) {
  const entry = entryFor(id);
  const dir = mkdtempSync(join(tmpdir(), "pharn-real-markers-"));

  // Accumulate per FILE, not per site, then write once. Several sites of one entry share a doc
  // (three of seam-record's four are pharn/THREAT-MODEL.md), so a write-per-site loop re-reads the pristine
  // file and silently overwrites the mutation — leaving only the LAST site of each file actually
  // testable. That bug shipped in this helper's first draft and every direction-2 case except the
  // per-file last one went green against an unmutated doc: L36 one more time, a rule passing for the
  // member the author happened to look at.
  const bodies = new Map();
  for (const site of entry.sites) {
    if (!bodies.has(site.file)) bodies.set(site.file, readFileSync(join(REPO, site.file), "utf8"));
  }
  if (opts.dropMarker !== undefined) {
    const target = entry.sites[opts.dropMarker];
    const mutated = bodies.get(target.file).split(target.marker).join("<<< marker removed by the test >>>");
    assert.notEqual(mutated, bodies.get(target.file), `the mutation was a no-op — ${target.file} does not contain the registered marker`);
    bodies.set(target.file, mutated);
  }
  for (const [rel, body] of bodies) {
    const dest = join(dir, rel);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, body);
  }

  if (opts.live) {
    const probe = entry.probe;
    if (probe.type === "path") {
      mkdirSync(join(dir, dirname(probe.path)), { recursive: true });
      writeFileSync(join(dir, probe.path), "// stub — the primitive shipped\n");
    } else {
      mkdirSync(join(dir, probe.dir), { recursive: true });
      writeFileSync(join(dir, probe.dir, `${probe.substring}-probe.stub`), "// stub — the primitive shipped\n");
    }
  }

  const mPath = join(dir, "manifest.json");
  writeFileSync(mPath, JSON.stringify({ specified_primitives: [entry] }));
  return { dir, mPath, entry, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

// ------------------------------------------------------------------------- closure over the manifest

test("✧ closure — REGISTERED_IDS equals the live manifest's id set exactly (no entry escapes the rules below)", () => {
  const live = REAL_MANIFEST.specified_primitives.map((p) => p.id);
  assert.deepEqual(
    [...live].sort(),
    [...REGISTERED_IDS].sort(),
    "an entry was added, removed or renamed — update REGISTERED_IDS and give it both-direction coverage"
  );
});

test("✧ L34 — the enumerations are non-empty, so the per-entry rules below cannot pass vacuously", () => {
  assert.ok(REGISTERED_IDS.length > 0);
  assert.ok(NEW_REGISTRATIONS.length > 0);
  for (const id of NEW_REGISTRATIONS) assert.ok(entryFor(id), `${id} is not in the manifest`);
});

// ------------------------------------------------------- every registered marker must be UNIQUE
//
// Direction 2 is `src.includes(site.marker)` — a PRESENCE test over the whole file. It only detects a
// deletion when the marker occurs EXACTLY ONCE: a string appearing twice keeps the check green after one
// of the two is removed. THREAT-MODEL's ai_docs and seam-record rows are the live instance — their right
// cells are byte-identical, which is why those two markers span their row-distinctive LEFT cell. This
// rule generalizes that fix instead of asserting it for the pair someone happened to look at (L36), and
// it ranges over EVERY entry, so the four pre-existing registrations are retro-covered.

for (const id of REGISTERED_IDS) {
  test(`✧ every \`${id}\` marker occurs EXACTLY ONCE in its doc (presence-test => uniqueness is load-bearing)`, () => {
    for (const site of entryFor(id).sites) {
      const src = readFileSync(join(REPO, site.file), "utf8");
      const n = src.split(site.marker).length - 1;
      assert.equal(n, 1, `${id} -> ${site.file}: marker occurs ${n}x, expected exactly 1: ${JSON.stringify(site.marker.slice(0, 80))}`);
    }
  });
}

// --------------------------------------------------- the new registrations, direction 1 and direction 2

for (const id of NEW_REGISTRATIONS) {
  test(`✧ DIRECTION 1 — \`${id}\` SHIPS while its markers remain => RED`, () => {
    const f = realFixture(id, { live: true });
    const r = run(f.dir, f.mPath);
    f.cleanup();
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /IS NOW LIVE/);
    assert.match(r.out, /REMOVE the marker/);
  });

  test(`✧ the \`${id}\` steady state is GREEN (primitive absent + markers present), so direction 1 is a real transition`, () => {
    const f = realFixture(id);
    const r = run(f.dir, f.mPath);
    f.cleanup();
    assert.equal(r.code, 0, r.out);
  });

  test(`✧ \`${id}\`'s probe is NOT live in the real repo today (L37 — probed, not read off the manifest)`, () => {
    const f = realFixture(id); // markers intact, no probe artifact
    // The steady-state GREEN above already proves "not live" for the temp tree; this asserts it of the
    // REAL tree, which is what makes today's `check:markers` GREEN mean "absent + present" and not
    // "live + removed" — two states the checker reports identically.
    const r = run(REPO);
    f.cleanup();
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /\(0 now live\)/);
  });

  const sites = entryFor(id).sites;
  for (let i = 0; i < sites.length; i++) {
    test(`✧ DIRECTION 2 — \`${id}\` site ${i + 1}/${sites.length} (${sites[i].file}) marker DELETED while absent => RED`, () => {
      const f = realFixture(id, { dropMarker: i });
      const r = run(f.dir, f.mPath);
      f.cleanup();
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /annotation is GONE/);
      assert.match(r.out, /still absent/);
      assert.ok(r.out.includes(sites[i].file), `the RED must name the site file, got: ${r.out}`);
    });
  }
}

// ------------------------------------------------------------ direction 3: the marker sweep (ENF-8)
//
// A NEW hedge nobody registered is invisible to directions 1 and 2. The sweep asserts CLOSURE over the
// phrase (L36): every hit on the files git would commit lies inside a registered marker, or sits in a
// file on the closed `marker_sweep.exempt` list. L4/L60: each ✧ case below is a mutant whose one
// property the sweep must catch — an extra hit, a hit in a registered file, a re-wrapped hit, a stale
// exemption — and the fixture trees are real git work trees, because the sweep's file set is git's.

const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const GIT_ID = ["-c", "user.name=pharn-test", "-c", "user.email=pharn-test@example.invalid", "-c", "commit.gpgsign=false"];

/**
 * A git work tree with DOC.md holding the registered MARKER. `opts.files` adds files ({rel: body});
 * `opts.sweep` is the manifest's `marker_sweep` (default `{exempt: []}`; `null` omits the key);
 * `opts.manifestOutside` writes the manifest to a separate temp dir; `opts.noGit` skips `git init`;
 * `opts.primitives` / `opts.forward` override the manifest's classes.
 */
function swFixture(opts = {}) {
  const dir = mkdtempSync(join(tmpdir(), "pharn-sweep-"));
  if (!opts.noGit) git(dir, "init", "-q");
  if (!opts.empty) writeFileSync(join(dir, "DOC.md"), `intro\n${MARKER}\noutro\n`);
  for (const [rel, body] of Object.entries(opts.files ?? {})) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), body);
  }
  const manifest = {
    specified_primitives: opts.primitives ?? [
      {
        id: "pre-egress",
        probe: { type: "dir-contains", dir: ".claude/hooks", substring: "egress" },
        sites: [{ file: "DOC.md", marker: MARKER }],
      },
    ],
  };
  if (opts.forward) manifest.forward_claims = opts.forward;
  if (opts.sweep !== null) manifest.marker_sweep = opts.sweep ?? { exempt: [] };
  const mDir = opts.manifestOutside ? mkdtempSync(join(tmpdir(), "pharn-sweep-manifest-")) : dir;
  const mPath = join(mDir, "manifest.json");
  writeFileSync(mPath, JSON.stringify(manifest));
  const cleanup = () => {
    rmSync(dir, { recursive: true, force: true });
    if (mDir !== dir) rmSync(mDir, { recursive: true, force: true });
  };
  return { dir, mPath, cleanup };
}

const HEDGE_LINE = "the frobnicator _(specified; ships with the guarded surface)_ guards it";

function sweepRun(opts, setup) {
  const f = swFixture(opts);
  try {
    if (setup) setup(f.dir);
    return run(f.dir, f.mPath);
  } finally {
    f.cleanup();
  }
}

test("GREEN — sweep on, the only hit is registered; the fixture manifest inside the tree is exempt by construction", () => {
  const r = sweepRun({});
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /marker sweep: 1 phrase hit\(s\) all registered, 0 exempt, across 1 file\(s\) \(0 exemption\(s\)\)/);
});

test("✧ DIRECTION 3 — an UNREGISTERED hedge in another file is RED, naming file:line and the remedy", () => {
  const r = sweepRun({ files: { "notes/NEW.md": `one\n${HEDGE_LINE}\n` } });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /notes\/NEW\.md:2: an UNREGISTERED "specified" annotation/);
  assert.match(r.out, /marker_sweep\.exempt/);
});

test("✧ DIRECTION 3 is per HIT — a second hedge in an already-registered doc is RED", () => {
  const r = sweepRun({}, (dir) => writeFileSync(join(dir, "DOC.md"), `intro\n${MARKER}\n\n${HEDGE_LINE}\n`));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /DOC\.md:4: an UNREGISTERED/);
});

test("✧ DIRECTION 3 sees a re-wrapped, re-cased hedge (variant spellings, L33)", () => {
  const r = sweepRun({ files: { "WRAP.md": "x _(specified; Ships with the\nguarded   surface)_ y\n" } });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /WRAP\.md:1: an UNREGISTERED/);
});

test("GREEN — hits in an exempt FILE and under an exempt DIRECTORY prefix are counted as exempt", () => {
  const sweep = {
    exempt: [
      { path: "HISTORY.md", reason: "release history" },
      { path: "trail/", reason: "audit trail" },
    ],
  };
  const r = sweepRun({ sweep, files: { "HISTORY.md": `${HEDGE_LINE}\n${HEDGE_LINE}\n`, "trail/a/PLAN.md": `${HEDGE_LINE}\n` } });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /1 phrase hit\(s\) all registered, 3 exempt, across 3 file\(s\) \(2 exemption\(s\)\)/);
});

test("✧ STALE_EXEMPTION — an exemption that covers no hit is RED (an allowlist entry outlives its reason)", () => {
  const r = sweepRun({ sweep: { exempt: [{ path: "HISTORY.md", reason: "release history" }] }, files: { "HISTORY.md": "no hedge\n" } });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /"HISTORY\.md": STALE_EXEMPTION/);
});

test("✧ exit 2 — an exemption may never cover a file holding a registered site (either class, file or prefix)", () => {
  const cases = [
    { path: "DOC.md", forward: undefined },
    {
      path: "guides/",
      forward: [{ id: "fc", probe: { type: "path", path: "nope" }, sites: [{ file: "guides/D.md", marker: "not built" }] }],
    },
  ];
  for (const c of cases) {
    const r = sweepRun({ sweep: { exempt: [{ path: c.path, reason: "r" }] }, forward: c.forward, files: { "guides/D.md": "not built\n" } });
    assert.equal(r.code, 2, `${c.path}: ${r.out}`);
    assert.match(r.out, /holds a registered site — a guarded doc is never exempt/);
  }
});

test("✧ exit 2 — every malformed `marker_sweep` shape fails CLOSED, never a silent GREEN", () => {
  const bad = [
    [[], /must be an object with an `exempt` array/],
    [{ exempt: {} }, /must be an object with an `exempt` array/],
    [{ exempt: [null] }, /needs a string `path` and a non-empty string `reason`/],
    [{ exempt: [{ path: "X.md" }] }, /needs a string `path` and a non-empty string `reason`/],
    [{ exempt: [{ path: "X.md", reason: "  " }] }, /needs a string `path` and a non-empty string `reason`/],
    [{ exempt: [{ path: "", reason: "r" }] }, /must be repo-relative/],
    [{ exempt: [{ path: "/abs.md", reason: "r" }] }, /must be repo-relative/],
    [{ exempt: [{ path: "../up.md", reason: "r" }] }, /must be repo-relative/],
    [{ exempt: [{ path: "./X.md", reason: "r" }] }, /must be repo-relative/],
    [{ exempt: [{ path: "a//b.md", reason: "r" }] }, /must be repo-relative/],
    [{ exempt: [{ path: "a\\b.md", reason: "r" }] }, /must be repo-relative/],
    [
      {
        exempt: [
          { path: "X.md", reason: "r" },
          { path: "X.md", reason: "r" },
        ],
      },
      /is listed twice/,
    ],
  ];
  for (const [sweep, re] of bad) {
    const r = sweepRun({ sweep });
    assert.equal(r.code, 2, `${JSON.stringify(sweep)}: ${r.out}`);
    assert.match(r.out, re, JSON.stringify(sweep));
  }
});

test("✧ exit 2 — an EMPTY site marker is refused (it is present in every file, so it could never go missing)", () => {
  const primitives = [{ id: "p", probe: { type: "path", path: "nope" }, sites: [{ file: "DOC.md", marker: "" }] }];
  const r = sweepRun({ primitives, sweep: null });
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /the marker non-empty/);
});

test("✧ exit 2 — the sweep refuses a target that is not a git work tree", () => {
  const r = sweepRun({ noGit: true });
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /`git ls-files` failed .* needs a git work tree/);
});

test("✧ exit 2 — a git tree that lists NO files is refused (a sweep over nothing certifies nothing, L34)", () => {
  const r = sweepRun({ empty: true, manifestOutside: true, primitives: [] });
  assert.equal(r.code, 2, r.out);
  assert.match(r.out, /listed no files/);
});

test("the scan set is git's: an untracked file is swept, a gitignored one is not", () => {
  const files = { ".gitignore": "IGNORED.md\n", "IGNORED.md": `${HEDGE_LINE}\n` };
  assert.equal(sweepRun({ files }).code, 0, "a gitignored hedge must not be swept");
  const r = sweepRun({ files: { ...files, "UNTRACKED.md": `${HEDGE_LINE}\n` } });
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /UNTRACKED\.md:1/);
  assert.doesNotMatch(r.out, /IGNORED\.md/);
});

test("a tracked file deleted from the working tree has no bytes to sweep and is skipped", () => {
  const r = sweepRun({ files: { "GONE.md": `${HEDGE_LINE}\n` } }, (dir) => {
    git(dir, "add", "GONE.md");
    unlinkSync(join(dir, "GONE.md"));
  });
  assert.equal(r.code, 0, r.out);
});

test("a nested repository and a LINKED worktree inside the tree are skipped (measured, not assumed)", () => {
  const r = sweepRun({}, (dir) => {
    git(dir, "add", "-A");
    git(dir, ...GIT_ID, "commit", "-q", "-m", "base");
    // A linked worktree carries a `.git` FILE; its DOC.md copy holds the hedge at a path no site names.
    git(dir, "worktree", "add", "-q", join(dir, ".claude", "worktrees", "sib"));
    mkdirSync(join(dir, "sub"));
    git(join(dir, "sub"), "init", "-q");
    writeFileSync(join(dir, "sub", "N.md"), `${HEDGE_LINE}\n`);
    const listed = git(dir, "ls-files", "--others", "--exclude-standard");
    assert.match(listed, /^\.claude\/worktrees\/sib\/$/m, `expected the worktree as ONE dir/ entry: ${listed}`);
    assert.match(listed, /^sub\/$/m, `expected the nested repo as ONE dir/ entry: ${listed}`);
  });
  assert.equal(r.code, 0, r.out);
});

test("a symlink is never followed out of the tree", { skip: process.platform === "win32" && "symlinks need privileges on Windows" }, () => {
  const outside = mkdtempSync(join(tmpdir(), "pharn-sweep-outside-"));
  writeFileSync(join(outside, "FAR.md"), `${HEDGE_LINE}\n`);
  try {
    const r = sweepRun({}, (dir) => symlinkSync(join(outside, "FAR.md"), join(dir, "LINK.md")));
    assert.equal(r.code, 0, r.out);
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
});

test(
  "✧ an UNREADABLE listed file is RED, never a silently clean one",
  { skip: (process.platform === "win32" || process.getuid?.() === 0) && "chmod 000 does not deny root or Windows" },
  () => {
    const r = sweepRun({ files: { "LOCKED.md": `${HEDGE_LINE}\n` } }, (dir) => chmodSync(join(dir, "LOCKED.md"), 0o000));
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /LOCKED\.md: listed for the marker sweep but could not be read \(EACCES\)/);
  }
);

test("OPT-IN — with no `marker_sweep` key the sweep is OFF and says so (the real manifest is pinned ON below)", () => {
  const r = sweepRun({ sweep: null, files: { "NEW.md": `${HEDGE_LINE}\n` } });
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /marker sweep: OFF/);
});

// ------------------------------------------------------------- direction 3 over the REAL repo

/** The closed exemption set. Adding one is a reviewed edit HERE as well as in the manifest (L36). */
const REAL_EXEMPT = [
  "CHANGELOG.md",
  ".dev/features/",
  ".dev/floor/check-specified-markers.mjs",
  ".dev/floor/check-specified-markers.test.mjs",
];

test("✧ integration — the REAL manifest turns the sweep ON, and its exemption set is exactly the pinned list", () => {
  assert.ok(Object.hasOwn(REAL_MANIFEST, "marker_sweep"), "deleting `marker_sweep` would switch direction 3 off");
  assert.deepEqual(
    REAL_MANIFEST.marker_sweep.exempt.map((e) => e.path),
    REAL_EXEMPT,
    "the exemption list changed — update REAL_EXEMPT in the same reviewed edit"
  );
});

test("✧ integration — the REAL repo sweep is GREEN over a non-empty set of registered hits", () => {
  const r = run(REPO);
  assert.equal(r.code, 0, r.out);
  const m = r.out.match(/marker sweep: (\d+) phrase hit\(s\) all registered, (\d+) exempt/);
  assert.ok(m, r.out);
  assert.ok(Number(m[1]) >= 20, `expected >= 20 registered hits on the trusted docs, got ${m[1]}`);
  assert.ok(Number(m[2]) > 0, "every pinned exemption must cover hits, or it would be STALE");
});

test("✧ the REAL sweep fires — dropping the CHANGELOG exemption REDs on the real CHANGELOG's hits", () => {
  const dir = mkdtempSync(join(tmpdir(), "pharn-sweep-real-"));
  try {
    const m = structuredClone(REAL_MANIFEST);
    m.marker_sweep.exempt = m.marker_sweep.exempt.filter((e) => e.path !== "CHANGELOG.md");
    const mPath = join(dir, "manifest.json");
    writeFileSync(mPath, JSON.stringify(m));
    const r = run(REPO, mPath);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /CHANGELOG\.md:\d+: an UNREGISTERED/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
