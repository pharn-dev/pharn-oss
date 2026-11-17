# SPIKE-DIFF — the generated manifest against pharn-cli's `installManifest`

Measured 2026-11-16, read-only against pharn-cli `main` at `b66d1aa2` (package 0.19.0), whose working tree was clean.
The CLI's own functions are the reference — `collectExpectedInstallPaths`, `parseCapabilityIndex`, `isInstallRootPath`,
`model-config.ts`'s constants and `readUpstreamModels` — imported from its `src/` by the harness below. The harness
borrows nothing from pharn-oss except the manifest it reads, and implements the manifest's glob grammar itself (L74).

Trees, each extracted with `git archive` (the bytes codeload serves):

- **v7.19.0** — the current release. It has no manifest, so this branch's generator was run over it
  (`node .dev/floor/gen-install-manifest.mjs <tree>`; no git there, so the declared-roots walk supplied the file list).
- **this branch** (SKILLS 7.20.0 when measured, before #453 took that number; the increment ships as 7.21.0) — its
  committed `pharn-install.json`.
- **`b42684b5^`** — the last flat-layout tree (#86 moved everything under `pharn/` on 2026-07-10, SKILLS 1.0.0). No
  release tag is flat: the first tag is v7.1.2.

Every capability was selected on the CLI side (35, the whole index), so the CLI's set is its largest.

## Layout `pharn` (what `detectLayout` picks for both v7.19.0 and this branch)

| Tree        | CLI paths | Manifest files | CLI only | Manifest only           | Source differs | Owner differs |
| ----------- | --------- | -------------- | -------- | ----------------------- | -------------- | ------------- |
| v7.19.0     | 613       | 614            | none     | `.claude/settings.json` | none           | none          |
| this branch | 613       | 614            | none     | `.claude/settings.json` | none           | none          |

The one difference, explained:

- **`.claude/settings.json`** (manifest: surface `settings`, policy `if-absent`). The CLI copies it outside its
  manifest, in `install-capabilities.ts`, only when the project has none, and records it only when it wrote it fresh.
  The manifest declares it with that policy instead of leaving it out, so the CLI can drop the special case. Not a
  disagreement about what is installed.

Agreements worth naming, because the ticket expected differences there:

- **`.claude/agents/pharn-review-lens.md` and `pharn-stage.md`** are in both: the CLI has installed `.claude/agents/`
  since its C2.7 release, so the ticket's evidence for that gap predates pharn-cli 0.19.0.
- **`LICENSE`** maps to `pharn/LICENSE` in both.
- **Trusted docs**: all four at `pharn/` in both. The CLI's root-doc fallback (`PHARN_ROOT_FALLBACK_DOCS`, root
  `THREAT-MODEL.md`/`LIMITS.md` for a pre-7.0 clone) does not fire on either tree, because both carry the `pharn/`
  copies; the manifest declares no fallback (it describes its own tree only).
- **Floor test apparatus**: the CLI excludes `test-fixtures` and `fixtures` under the floor; the manifest excludes
  `pharn/floor/test-fixtures/**`. The extra `fixtures` name matches nothing in either tree, so no file differs.
- **Hooks**: the CLI also accepts `*.mjs` hooks; the manifest declares `.claude/hooks/*.cjs` (the product surface's
  rule). No `.mjs` hook exists, so no file differs.
- **`pharn/features/README.md`**: the CLI resolves it with a fallback to root `features/README.md` for an older
  clone; both trees carry the `pharn/` copy.
- **Installable but not bump-triggering**: `LICENSE`, `pharn/features/README.md` and `pharn/floor/README.md` are in
  both sets and outside `PRODUCT_SURFACE`. The first two are repo meta; the floor README ships without ever triggering
  a bump (recorded in the RFC as an observation).

## Layout `flat`

**Over the same trees** (forced, since `detectLayout` never picks it for them): the CLI's flat paths would be 48
(v7.19.0) / 51 (this branch) entries — the 24 `.claude` commands, hooks and agents (the same paths in every layout, and
in the manifest), `PHARN-LICENSE`, and 23 / 26 files under `.dev/floor/` (the flat layout's floor directory, which in a
pharn-layout tree is this repository's build apparatus). No CLI installs that set: it installs a clone in the clone's
own layout. This is why the manifest declares one `dest` per file, at `pharn`.

**Over the last flat tree** (`b42684b5^`): the CLI detects `flat` and would install 443 paths. Every one of them lies
inside the manifest's `installRoots.legacy` globs or its `.claude/` include globs, outside `exclude` — 0 outside. So the
legacy roots bound every record key a flat install could hold. That tree has no manifest, and no flat tree ever will:
the CLI falls back to its derivation for it (CORE-194, for one minor; `flat` is removed in pharn-cli v0.22.0).

## Install roots against `isInstallRootPath`

Over this branch's 614 `dest`s: every one lies in `installRoots.include` and outside `exclude`. The CLI's
`isInstallRootPath` accepts all of them except `.claude/settings.json`, which its install-root bound leaves out on
purpose (a preserved settings file is never pharn's). The manifest's roots include it, because an install can write
and record it (policy `if-absent`). CORE-194 decides whether the record-key bound keeps that exception.

## Capability index

`parseCapabilityIndex`: 35 entries, no `unknown`. Manifest: 35. Equal as `role:name:applies`, with `applies` compared
in the CLI's own shape (`"universal"` or the archetype array) — no translation needed. The two `pharn-core` skills are
in neither list: the CLI copies them as the `core` surface, and so does the manifest.

## Models

`stages`, `aliases`, `modelIdPattern` and `effortLevels` equal the CLI's `PRODUCT_STAGES`, `MODEL_ALIASES`,
`MODEL_ID_RE.source` and `EFFORT_LEVELS`; `models.defaults` equals the block `readUpstreamModels` reads from the tree's
root `pharn.config.json`, and the CLI's `checkModelsBlock` finds it `valid`. Same result on both trees.

## Verdict

With every capability selected, the manifest names exactly the CLI's install set plus `.claude/settings.json`
(declared with its copy policy), at the same destinations and from the same sources. The capability index and the models
rules and defaults agree. The flat layout is unreachable from a manifest-bearing tree, and the legacy roots cover the
last flat tree's whole install set. A measurement of two trees, not a gate: the drift check keeps the manifest equal to
the tree, never equal to the CLI.

## Reproduce

From a pharn-cli checkout (read-only: the harness imports `src/` and writes nothing), with `tsx` from its devDependencies:

```bash
git -C <pharn-oss> archive <ref> | tar -x -C <tree>               # a fresh, empty <tree> directory
node <pharn-oss>/.dev/floor/gen-install-manifest.mjs <tree>         # only for a tree without its own manifest
git -C <pharn-oss> archive b42684b5^ | tar -x -C <flat-tree>        # optional: the last flat tree
cd <pharn-cli> && npx tsx <harness>.mts <pharn-cli> <tree> <tree>/pharn-install.json [<flat-tree>]
```

Save the harness as a `.mts` file (outside a package, `tsx` reads a `.ts` file as CommonJS, which has no top-level
`await`):

```ts
// Spike harness (read-only): diff pharn-cli's own install derivation against a pharn-install.json.
// Run from a pharn-cli checkout:  npx tsx <this file> <pharn-cli dir> <clone dir> <manifest.json> [<flat clone dir>]
// It imports pharn-cli's src/ modules and reads the two trees; it writes nothing.
import { readFileSync } from "node:fs";
import { relative } from "node:path";
import { pathToFileURL } from "node:url";

const [cliDir, cloneDir, manifestPath, flatDir] = process.argv.slice(2);
const lib = (m: string) => import(pathToFileURL(`${cliDir}/src/lib/${m}.ts`).href);
const { collectExpectedInstallPaths } = await lib("install-manifest");
const { parseCapabilityIndex } = await lib("capability-index");
const { detectLayout } = await lib("layout");
const { isInstallRootPath } = await lib("install-surfaces");
const mc = await lib("model-config");
const { readUpstreamModels } = await lib("upstream-models");

// The manifest's glob grammar, implemented here independently of pharn-oss (L74): `*` one segment, `**` any.
// One segment against one glob segment: `*` matches any run of characters; everything else is literal.
const segOk = (g: string, s: string): boolean => {
  const parts = g.split("*");
  if (parts.length === 1) return g === s;
  if (!s.startsWith(parts[0]!) || !s.endsWith(parts[parts.length - 1]!)) return false;
  let at = parts[0]!.length;
  for (const mid of parts.slice(1, -1)) {
    const k = s.indexOf(mid, at);
    if (k < 0) return false;
    at = k + mid.length;
  }
  return s.length - at >= parts[parts.length - 1]!.length;
};
const globOk = (g: string, path: string): boolean => {
  const G = g.split("/");
  const P = path.split("/");
  const go = (i: number, j: number): boolean => {
    if (i === G.length) return j === P.length;
    if (G[i] === "**") {
      for (let k = j; k <= P.length; k++) if (go(i + 1, k)) return true;
      return false;
    }
    return j < P.length && segOk(G[i]!, P[j]!) && go(i + 1, j + 1);
  };
  return go(0, 0);
};
const inGlobs = (gs: string[], p: string) => gs.some((g) => globOk(g, p));

const m = JSON.parse(readFileSync(manifestPath, "utf8"));
const report: Record<string, unknown> = { skillsVersion: m.skillsVersion, detectedLayout: detectLayout(cloneDir) };
const idx = parseCapabilityIndex(cloneDir);
const all = idx.capabilities.map((c: any) => ({ ...c, matched: "manual" }));
const cliMap = (dir: string, layout: "pharn" | "flat", caps = all) =>
  new Map([...collectExpectedInstallPaths({ repoDir: dir, capabilities: caps, layout })].map(([d, s]) => [d, relative(dir, s)]));

// 1. pharn layout, every capability selected.
const cli = cliMap(cloneDir, "pharn");
const man = new Map(m.files.map((f: any) => [f.dest, f]));
report.pharn = {
  cliPaths: cli.size,
  manifestFiles: m.files.length,
  cliOnly: [...cli.keys()].filter((d) => !man.has(d)),
  manifestOnly: [...man.keys()]
    .filter((d) => !cli.has(d))
    .map((d) => `${d} (${(man.get(d) as any).surface}, ${(man.get(d) as any).policy})`),
  sourceMismatch: [...cli].filter(([d, s]) => man.has(d) && (man.get(d) as any).path !== s),
  ownerMismatch: m.files
    .filter(
      (f: any) => f.surface === "capability" && !f.path.startsWith(`${m.capabilities.find((c: any) => c.name === f.capability)?.dir}/`)
    )
    .map((f: any) => f.path),
};
// 2. flat layout over the same tree (detectLayout never picks it for this tree).
const flatSame = cliMap(cloneDir, "flat");
report.flatOnSameTree = {
  cliPaths: flatSame.size,
  byRoot: Object.entries(
    [...flatSame.keys()].reduce(
      (a: Record<string, number>, d) => (
        (a[
          d
            .split("/")
            .slice(0, d.startsWith(".claude") ? 2 : 1)
            .join("/")
        ] =
          (a[
            d
              .split("/")
              .slice(0, d.startsWith(".claude") ? 2 : 1)
              .join("/")
          ] ?? 0) + 1),
        a
      ),
      {}
    )
  ),
  inManifestDests: [...flatSame.keys()].filter((d) => man.has(d)).length,
};
// 3. the last flat tree: every path the CLI would install there lies inside the manifest's legacy roots or the
//    `.claude` include roots (the same in every layout).
if (flatDir) {
  const fidx = parseCapabilityIndex(flatDir);
  const flat = cliMap(
    flatDir,
    "flat",
    fidx.capabilities.map((c: any) => ({ ...c, matched: "manual" }))
  );
  const claudeRoots = m.installRoots.include.filter((g: string) => g.startsWith(".claude/"));
  report.lastFlatTree = {
    detected: detectLayout(flatDir),
    cliPaths: flat.size,
    outsideLegacyAndClaudeRoots: [...flat.keys()].filter(
      (d) => !inGlobs([...m.installRoots.legacy, ...claudeRoots], d) || inGlobs(m.installRoots.exclude, d)
    ),
  };
}
// 4. install roots vs the CLI's isInstallRootPath, over every manifest dest.
report.roots = {
  destsCliRejects: m.files.filter((f: any) => !isInstallRootPath(f.dest)).map((f: any) => f.dest),
  destsOutsideInclude: m.files
    .filter((f: any) => !inGlobs(m.installRoots.include, f.dest) || inGlobs(m.installRoots.exclude, f.dest))
    .map((f: any) => f.dest),
};
// 5. capability index.
const key = (c: any) => `${c.role}:${c.name}:${JSON.stringify(c.applies)}`;
report.capabilities = {
  cli: idx.capabilities.length,
  unknown: idx.unknown,
  manifest: m.capabilities.length,
  cliOnly: idx.capabilities.map(key).filter((k: string) => !m.capabilities.map(key).includes(k)),
  manifestOnly: m.capabilities.map(key).filter((k: string) => !idx.capabilities.map(key).includes(k)),
};
// 6. models.
const up = readUpstreamModels(cloneDir);
report.models = {
  stagesEqual: JSON.stringify(m.models.rules.stages) === JSON.stringify(mc.PRODUCT_STAGES),
  aliasesEqual: JSON.stringify(m.models.rules.aliases) === JSON.stringify(mc.MODEL_ALIASES),
  idPatternEqual: m.models.rules.modelIdPattern === mc.MODEL_ID_RE.source,
  effortEqual: JSON.stringify(m.models.rules.effortLevels) === JSON.stringify(mc.EFFORT_LEVELS),
  defaultsEqualUpstreamBlock: up.kind === "ok" && JSON.stringify(up.block) === JSON.stringify(m.models.defaults),
  defaultsPassCliChecker: mc.checkModelsBlock(m.models.defaults).kind,
};
process.stdout.write(`${JSON.stringify(report, null, 1)}\n`);
```
