// .dev/floor/check-specified-markers.test.mjs — apparatus tests for the specified-marker checker.
//
// L4: an authored fixture passes by construction. These tests therefore drive the RED paths with real
// fixture trees + fixture manifests (via --manifest), and the ✧ cases are MUTANTS — each asserts the
// checker fails when the thing it guards is broken, not merely that it passes when everything is fine.

import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
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
  // (three of seam-record's four are THREAT-MODEL.md), so a write-per-site loop re-reads the pristine
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
