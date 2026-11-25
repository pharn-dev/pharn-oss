# REGRESSION — core-381-skill-symlinks

- base: `1755d6b8f7c261f3ac6bfe559edcb967fe775d23` (working tree dirty → `base = HEAD`)
- inside (61 paths): the seven removed `.claude/skills/*` symlink entries, the 44 copied skill files, `skills-lock.json`,
  `eslint.config.mjs`, `.markdownlint-cli2.jsonc`, `package.json`, `SKILLS_VERSION`, `README.md`, `pharn-install.json`,
  `CHANGELOG.md`, and this feature's `PLAN.md` / `GRILL.md` (`escape_exempt`). `escaped`: none.
- outside: 206 test files; 1 eval pair (`expected-injection-comment.json` ↔ `.dev/features/trust-fence/findings.json`).
- Style gates ran because `inside` touches `eslint.config.mjs` and `.markdownlint-cli2.jsonc`. The base worktree got its
  devDeps by linking the main checkout's installed `node_modules` instead of `npm ci`: `package-lock.json` is
  byte-identical at base and head (checked with `git diff --quiet`), so it is the same tree without a download.

| gate                   | base → head |
| ---------------------- | ----------- |
| tests                  | 0 → 0       |
| validate               | 0 → 0       |
| structural:trust-fence | 0 → 0       |
| lint                   | 0 → 0       |
| format:check           | 0 → 0       |
| lint:md                | 0 → 0       |

Per-test: base 7134 passed / 0 failed / 1 skipped; head 7134 passed / 0 failed / 1 skipped; `new_failures`: none.
`regressions[]`: none. `pre_existing[]`: none.

REGRESSIONS: none — no deterministically-detectable breakage outside the feature.

Residual: this catches what the suite and the named gates catch, nothing more.
