import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "node_modules/**",
      ".dev/floor/test-fixtures/**",
      "pharn/floor/test-fixtures/**",
      // The defect probe set (CORE-90): hashed bytes, and its fixture project is ES modules in `.js` files, which this
      // config reads as CommonJS. The `.prettierignore` twin says why the bytes are pinned.
      ".dev/probes/**",
      // Other Claude Code sessions' worktrees. They are git-excluded (.git/info/exclude), not tracked, so this removes
      // no repo file from lint coverage. Flat config does not skip dot-directories, so without it a bare `lint` in a
      // main checkout lints every nested worktree: measured, a .mjs with two lint errors in a nested copy of HEAD failed it.
      // The markdownlint twin is `.markdownlint-cli2.jsonc`'s `.claude/worktrees` entry. Bound: it is tied to where
      // Claude Code places worktrees today. If that location moves, the entry silently matches nothing.
      ".claude/worktrees/**",
      // Codex's "import from Claude Code" output: `.gitignore` excludes `/.agents/`, so this removes no repo file from
      // lint coverage. Flat config does not read `.gitignore` or skip dot-directories, so a bare `lint` in a checkout
      // holding the import linted its third-party scripts and went red. The markdownlint twin is
      // `.markdownlint-cli2.jsonc`'s `.agents` entry. Bound: tied to where the importer writes today.
      ".agents/**",
      // The security-audit skill, a byte-for-byte copy of cloudflare/security-audit-skill that `skills-lock.json` pins by
      // `computedHash` (copy mode since 7.25.6; it was a symlink before). Third-party bytes: a fix would make the copy drift
      // from its pin, and measured, its `validate-findings.cjs` fails `no-unused-vars` once. The markdownlint twin is
      // `.markdownlint-cli2.jsonc`'s `.claude/skills/security-audit` entry. Bound: it names this one skill.
      ".claude/skills/security-audit/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.js", "**/*.cjs"],
    languageOptions: { sourceType: "commonjs", globals: { ...globals.node } },
  },
  {
    files: ["**/*.mjs"],
    languageOptions: { sourceType: "module", globals: { ...globals.node } },
  },
  prettier,
];
