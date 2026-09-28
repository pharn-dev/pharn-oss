import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
  {
    ignores: [
      "node_modules/**",
      ".dev/floor/test-fixtures/**",
      "pharn/floor/test-fixtures/**",
      // Other Claude Code sessions' worktrees. They are git-excluded (.git/info/exclude), not tracked, so this removes
      // no repo file from lint coverage. Flat config does not skip dot-directories, so without it a bare `lint` in a
      // main checkout lints every nested worktree: measured, a .mjs with two lint errors in a nested copy of HEAD failed it.
      // The markdownlint twin is `.markdownlint-cli2.jsonc`'s `.claude/worktrees` entry. Bound: it is tied to where
      // Claude Code places worktrees today. If that location moves, the entry silently matches nothing.
      ".claude/worktrees/**",
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
