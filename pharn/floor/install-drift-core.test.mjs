// pharn/floor/install-drift-core.test.mjs — the HEAD install check's pure rule: every state and every not-checked why,
// in its order; the per-key comparison (changed / missing / missing-unchecked / extraneous) over members and
// non-members; the cap and the sort; the measured shapes (pharn-starter's optional platform binaries, the stale
// @sentry/core); the report block's closed shape; the one rendered line; and the L62 controls (`{"toString":1}`).

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  STATES,
  REFUSING_STATES,
  NOT_CHECKED_WHYS,
  COUNT_KEYS,
  MISMATCH_CAP,
  NPM_LOCKFILES,
  comparePackages,
  installCheck,
  refuses,
  detailText,
  headInstallBlock,
  validateHeadInstallBlock,
  headInstallLine,
} from "./install-drift-core.mjs";
import { quoteData } from "./quote-core.mjs";

const NPM_ONLY = { npm: true, pnpm: false, yarn: false, bun: false };
const lockOf = (packages) => ({ kind: "ok", value: { name: "fx", lockfileVersion: 3, packages: { "": { name: "fx" }, ...packages } } });
const hiddenOf = (packages) => ({ kind: "ok", value: { name: "fx", lockfileVersion: 3, packages } });
const pkg = (version, extra = {}) => ({
  version,
  resolved: `https://registry.npmjs.org/x/-/x-${version}.tgz`,
  integrity: `sha512-${version}`,
  ...extra,
});
const npm = (over = {}) => ({
  manifest: true,
  families: NPM_ONLY,
  lockfile: "package-lock.json",
  lock: lockOf({ "node_modules/a": pkg("1.0.0") }),
  nodeModules: "dir",
  hidden: hiddenOf({ "node_modules/a": pkg("1.0.0") }),
  ...over,
});

// ── the closed sets ───────────────────────────────────────────────────────────────────────────────────
test("the closed sets: four states, two of which refuse; nine whys in evaluation order; four counts", () => {
  assert.deepEqual(STATES, ["clean", "drifted", "not-installed", "not-checked"]);
  assert.deepEqual(REFUSING_STATES, ["drifted", "not-installed"]);
  assert.deepEqual(NOT_CHECKED_WHYS, [
    "no-manifest",
    "no-lockfile",
    "several-lockfile-families",
    "unmeasured-family",
    "lockfile-unreadable",
    "lockfile-unsupported",
    "node-modules-unreadable",
    "no-hidden-lockfile",
    "hidden-lockfile-unreadable",
  ]);
  assert.deepEqual(COUNT_KEYS, ["changed", "missing", "extraneous", "missing_unchecked"]);
  assert.deepEqual(NPM_LOCKFILES, ["npm-shrinkwrap.json", "package-lock.json"], "npm's own precedence");
});

// ── the states, each over a member and the nearest non-member ────────────────────────────────────────
test("clean: every compared entry agrees; no remedy is offered (L27)", () => {
  const r = installCheck(npm());
  assert.equal(r.state, "clean");
  assert.equal(r.why, null);
  assert.equal(r.remedy, null);
  assert.equal(refuses(r), false);
});

test("drifted: the measured @sentry/core case — a CHANGED version refuses, remedy npm ci", () => {
  const r = installCheck(
    npm({
      lock: lockOf({ "node_modules/@sentry/core": pkg("11.0.0") }),
      hidden: hiddenOf({ "node_modules/@sentry/core": pkg("10.75.0") }),
    })
  );
  assert.equal(r.state, "drifted");
  assert.equal(r.remedy, "npm ci");
  assert.equal(refuses(r), true);
  assert.deepEqual(r.counts, { changed: 1, missing: 0, extraneous: 0, missing_unchecked: 0 });
  assert.deepEqual(r.mismatches, [{ path: "node_modules/@sentry/core", kind: "changed", lockfile: "11.0.0", installed: "10.75.0" }]);
});

test("not-installed: a countable package and no node_modules refuses; an empty or all-dev lockfile is clean", () => {
  const r = installCheck(npm({ nodeModules: "absent", hidden: null }));
  assert.equal(r.state, "not-installed");
  assert.equal(r.remedy, "npm ci");
  assert.deepEqual(r.counts, { changed: 0, missing: 1, extraneous: 0, missing_unchecked: 0 });
  // npm writes no node_modules for a lockfile with no packages (measured) — that is clean, not "not installed"
  const empty = installCheck(npm({ lock: lockOf({}), nodeModules: "absent", hidden: null }));
  assert.equal(empty.state, "clean");
  // GATE 1: only dev/peer/optional entries and no node_modules — the omit=dev install — never refuses
  const dev = installCheck(npm({ lock: lockOf({ "node_modules/v": pkg("1.0.0", { dev: true }) }), nodeModules: "absent", hidden: null }));
  assert.equal(dev.state, "clean");
  assert.deepEqual(dev.counts, { changed: 0, missing: 0, extraneous: 0, missing_unchecked: 1 });
});

test("not-checked: every why, first-applies order, each with its nearest passing control", () => {
  const cases = [
    ["no-manifest", { manifest: false }],
    ["no-lockfile", { families: { npm: false, pnpm: false, yarn: false, bun: false } }],
    ["several-lockfile-families", { families: { ...NPM_ONLY, yarn: true } }],
    ["unmeasured-family", { families: { npm: false, pnpm: true, yarn: false, bun: false }, lockfile: null }],
    ["lockfile-unreadable", { lock: { kind: "unreadable" } }],
    ["lockfile-unsupported", { lock: { kind: "ok", value: { lockfileVersion: 1, dependencies: {} } } }],
    ["node-modules-unreadable", { nodeModules: "unreadable", hidden: null }],
    ["no-hidden-lockfile", { hidden: { kind: "absent" } }],
    ["hidden-lockfile-unreadable", { hidden: { kind: "unreadable" } }],
    ["hidden-lockfile-unreadable", { hidden: { kind: "ok", value: { packages: [] } } }],
  ];
  for (const [why, over] of cases) {
    const r = installCheck(npm(over));
    assert.equal(r.state, "not-checked", why);
    assert.equal(r.why, why);
    assert.equal(refuses(r), false, `${why} never refuses — it proceeds exactly as before the check`);
    assert.equal(r.remedy, null);
    assert.deepEqual(r.counts, { changed: 0, missing: 0, extraneous: 0, missing_unchecked: 0 });
  }
  // the order: no-manifest beats a second family; a second family beats an unreadable lockfile
  assert.equal(installCheck(npm({ manifest: false, families: { ...NPM_ONLY, pnpm: true } })).why, "no-manifest");
  assert.equal(installCheck(npm({ families: { ...NPM_ONLY, bun: true }, lock: { kind: "unreadable" } })).why, "several-lockfile-families");
  // each family but npm names itself
  for (const f of ["pnpm", "yarn", "bun"]) {
    const r = installCheck(npm({ families: { npm: false, pnpm: false, yarn: false, bun: false, [f]: true }, lockfile: null }));
    assert.equal(r.family, f);
  }
});

// ── the comparison ────────────────────────────────────────────────────────────────────────────────────
test("changed: version, link, integrity when both carry one, else resolved — and nothing else", () => {
  const one = (l, h) => comparePackages({ "node_modules/a": l }, { "node_modules/a": h }).counts.changed;
  assert.equal(one(pkg("1.0.0"), pkg("1.0.0")), 0);
  assert.equal(one(pkg("1.0.0"), pkg("1.0.1")), 1, "version");
  assert.equal(one(pkg("1.0.0"), { ...pkg("1.0.0"), integrity: "sha512-other" }), 1, "integrity, both present");
  assert.equal(one(pkg("1.0.0"), { ...pkg("1.0.0"), resolved: "https://mirror.example/x.tgz" }), 0, "a registry host alone is not drift");
  const noIntegrity = { version: "1.0.0", resolved: "git+ssh://git@github.com/x/y.git#aaa" };
  assert.equal(one(noIntegrity, { ...noIntegrity }), 0);
  assert.equal(
    one(noIntegrity, { ...noIntegrity, resolved: "git+ssh://git@github.com/x/y.git#bbb" }),
    1,
    "resolved, when integrity is absent"
  );
  assert.equal(one({ resolved: "packages/a", link: true }, { resolved: "packages/a", link: true }), 0);
  assert.equal(one({ resolved: "packages/a", link: true }, pkg("1.0.0")), 1, "a link against an install");
  assert.equal(one(pkg("1.0.0"), { ...pkg("1.0.0"), license: "MIT", engines: {} }), 0, "other fields are not compared");
});

test("missing vs missing-unchecked (GATE 1): only an entry with none of dev/peer/optional/devOptional is drift", () => {
  for (const flag of ["dev", "peer", "optional", "devOptional"]) {
    const r = comparePackages({ "node_modules/a": pkg("1.0.0", { [flag]: true }) }, {});
    assert.deepEqual(r.counts, { changed: 0, missing: 0, extraneous: 0, missing_unchecked: 1 }, flag);
    // a flag that is present but not `true` does not exempt it
    const f = comparePackages({ "node_modules/a": pkg("1.0.0", { [flag]: "yes" }) }, {});
    assert.equal(f.counts.missing, 1, `${flag}: "yes"`);
  }
  assert.equal(comparePackages({ "node_modules/a": pkg("1.0.0") }, {}).counts.missing, 1);
  // but a PRESENT dev package whose version moved is still `changed` — the flag exempts absence only
  assert.equal(comparePackages({ "node_modules/a": pkg("2.0.0", { dev: true }) }, { "node_modules/a": pkg("1.0.0") }).counts.changed, 1);
});

test("measured shape — pharn-starter: 271 absent entries, every one optional, read clean", () => {
  const lock = { "node_modules/next": pkg("16.0.0") };
  const hidden = { "node_modules/next": pkg("16.0.0") };
  for (let i = 0; i < 271; i++) lock[`node_modules/@img/sharp-x${i}`] = pkg("0.34.0", { optional: true, os: ["linux"], cpu: ["x64"] });
  const r = installCheck(npm({ lock: lockOf(lock), hidden: hiddenOf(hidden) }));
  assert.equal(r.state, "clean");
  assert.equal(r.counts.missing_unchecked, 271);
});

test("extraneous: in npm's record only; a workspace folder entry or the root is never compared", () => {
  const r = comparePackages({}, { "node_modules/stray": pkg("1.0.0") });
  assert.deepEqual(r.counts, { changed: 0, missing: 0, extraneous: 1, missing_unchecked: 0 });
  assert.deepEqual(r.mismatches, [{ path: "node_modules/stray", kind: "extraneous", lockfile: null, installed: "1.0.0" }]);
  const ws = comparePackages({ "": { name: "root" }, "packages/a": { version: "1.0.0" } }, { "packages/a": { version: "9.9.9" } });
  assert.deepEqual(ws.counts, { changed: 0, missing: 0, extraneous: 0, missing_unchecked: 0 });
  const nested = comparePackages({ "packages/a/node_modules/b": pkg("1.0.0") }, {});
  assert.equal(nested.counts.missing, 1, "a workspace's own node_modules IS an install");
});

test("the list: sorted by path, capped at MISMATCH_CAP, while the counts stay complete", () => {
  const lock = {};
  for (let i = 0; i < MISMATCH_CAP + 7; i++) lock[`node_modules/p${String(100 - i)}`] = pkg("1.0.0");
  const r = installCheck(npm({ lock: lockOf(lock), hidden: hiddenOf({}) }));
  assert.equal(r.state, "drifted");
  assert.equal(r.counts.missing, MISMATCH_CAP + 7);
  assert.equal(r.mismatches.length, MISMATCH_CAP);
  const paths = r.mismatches.map((m) => m.path);
  assert.deepEqual(paths, [...paths].sort());
  assert.match(detailText(r), new RegExp(`The first ${MISMATCH_CAP} of ${MISMATCH_CAP + 7} mismatches, by path:`));
});

// ── L62: any JSON value, never a throw ────────────────────────────────────────────────────────────────
test("L62 — a lockfile value that makes String() throw is compared and shown without a throw", () => {
  const evil = JSON.parse('{"toString":1}');
  assert.throws(() => String(evil), TypeError, "the control: this value really does make String() throw");
  const r = installCheck(
    npm({
      lock: lockOf({ "node_modules/a": { version: evil, integrity: evil } }),
      hidden: hiddenOf({ "node_modules/a": { version: evil } }),
    })
  );
  assert.equal(r.state, "drifted", "a non-string field is never equal, so it reads as changed");
  assert.equal(r.mismatches[0].lockfile, null, "a non-string version is shown as null");
  assert.doesNotThrow(() => detailText(r));
  assert.doesNotThrow(() => installCheck(npm({ lock: lockOf({ "node_modules/a": evil }), hidden: hiddenOf({ "node_modules/a": [] }) })));
});

test("G3 — a lockfile key with a newline and a backtick run stays on one line and inside one fence", () => {
  const key = "node_modules/x\n# heading\n```\nnot-a-fence";
  const r = installCheck(npm({ lock: lockOf({ [key]: pkg("1.0.0") }), hidden: hiddenOf({}) }));
  const detail = detailText(r);
  const listLine = detail.split("\n").find((l) => l.startsWith("- missing "));
  assert.ok(listLine.includes(JSON.stringify(key)), "the key is JSON-quoted on its one line");
  assert.equal(
    detail.split("\n").some((l) => l.startsWith("# heading")),
    false
  );
  const fenced = quoteData("detail, quoted as DATA:", detail).split("\n");
  const fence = fenced[2].replace(/text$/, "");
  assert.equal(fenced.filter((l) => l === fence).length, 1, "exactly one closing fence — the key opened none");
});

// ── the detail text and the remedy (L27) ──────────────────────────────────────────────────────────────
test("detailText: only for a refusing result; names the counts, the remedy and every listed mismatch", () => {
  assert.throws(() => detailText(installCheck(npm())), /refusing result only/);
  const r = installCheck(npm({ hidden: hiddenOf({ "node_modules/a": pkg("0.9.0"), "node_modules/z": pkg("1.0.0") }) }));
  const d = detailText(r);
  assert.match(d, /differs in 1 changed, 0 missing and 1 extraneous package\(s\)/);
  assert.match(d, /^Remedy: run `npm ci` in the project root, then re-run\.$/m);
  assert.match(d, /^All 2 mismatch\(es\), by path:$/m);
  const ni = detailText(installCheck(npm({ nodeModules: "absent", hidden: null })));
  assert.match(ni, /^package-lock.json lists 1 package\(s\) that every install includes, and there is no node_modules directory/);
  assert.match(ni, /Remedy: run `npm ci`/);
});

// ── the report block and its line ─────────────────────────────────────────────────────────────────────
test("headInstallBlock: enums and integers only; validateHeadInstallBlock is closed both ways and state-consistent", () => {
  const block = headInstallBlock(installCheck(npm()));
  assert.deepEqual(block, {
    state: "clean",
    why: null,
    family: "npm",
    lockfile: "package-lock.json",
    counts: { changed: 0, missing: 0, extraneous: 0, missing_unchecked: 0 },
  });
  assert.equal(validateHeadInstallBlock(block).ok, true);
  for (const r of [
    installCheck(npm({ manifest: false })),
    installCheck(npm({ families: { npm: false, pnpm: true, yarn: false, bun: false }, lockfile: null })),
    installCheck(npm({ hidden: hiddenOf({}) })),
    installCheck(npm({ nodeModules: "absent", hidden: null })),
  ]) {
    assert.equal(validateHeadInstallBlock(headInstallBlock(r)).ok, true, r.state);
  }
  const bad = [
    null,
    [],
    { ...block, extra: 1 },
    { state: block.state, why: null, family: "npm", lockfile: "package-lock.json" },
    { ...block, state: "fine" },
    { ...block, why: "no-lockfile" },
    { ...block, state: "not-checked", why: "made-up" },
    { ...block, family: "cargo" },
    { ...block, lockfile: "yarn.lock" },
    { ...block, counts: { ...block.counts, changed: -1 } },
    { ...block, counts: { ...block.counts, more: 0 } },
    { ...block, counts: { ...block.counts, changed: 1 } }, // a clean block with drift
    { ...block, state: "drifted" }, // a drifted block with none
    { state: "not-checked", why: "no-lockfile", family: null, lockfile: null, counts: { ...block.counts, missing: 1 } },
    { ...block, state: "not-installed", counts: { ...block.counts, missing: 1, changed: 1 } },
  ];
  for (const b of bad) assert.equal(validateHeadInstallBlock(b).ok, false, JSON.stringify(b));
});

test("headInstallLine: says what was compared for clean (L43), warns for not-checked, and reads 'not recorded' for null or a bad block", () => {
  const clean = headInstallLine(headInstallBlock(installCheck(npm())));
  assert.match(clean, /^HEAD install: checked — npm's record of the installed tree agrees with `package-lock.json`\./);
  assert.match(clean, /is not itself checked/);
  assert.doesNotMatch(clean, /correct/);
  const withUnchecked = headInstallLine({
    ...headInstallBlock(installCheck(npm())),
    counts: { changed: 0, missing: 0, extraneous: 0, missing_unchecked: 3 },
  });
  assert.match(withUnchecked, /\(3 absent dev\/peer\/optional package\(s\) not counted\)/);
  const nc = headInstallLine(
    headInstallBlock(installCheck(npm({ families: { npm: false, pnpm: true, yarn: false, bun: false }, lockfile: null })))
  );
  assert.match(nc, /^HEAD install: NOT CHECKED \(`unmeasured-family`, pnpm\) — .*a red gate may come from the install/);
  assert.match(headInstallLine(null), /^HEAD install: not recorded/);
  assert.match(headInstallLine({ state: "clean" }), /^HEAD install: not recorded/, "an invalid block is never rendered as a state");
});

test("installCheck requires its inputs and the npm lockfile's name (caller errors, never the tree's content)", () => {
  assert.throws(() => installCheck(undefined), /requires its inputs/);
  assert.throws(() => installCheck(npm({ lockfile: null })), /npm lockfile's name/);
});
