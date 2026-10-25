// handfix-8: the PLAN's new security tests for the four hooks (surfaces 1–4), appended to each hook's own suite.
const fs = require("fs");
const SP =
  "/private/tmp/claude-501/-Users-pgalarowicz-Projects-pharn-oss--claude-worktrees-suspicious-swirles-f50d57/d50332a1-7bff-47d4-84fd-7d4ee5ac9e88/scratchpad/new-tests";
for (const [src, dst] of [
  ["enforce.cjs", ".claude/hooks/enforce-writes-scope.test.cjs"],
  ["protect.cjs", ".claude/hooks/protect-trusted-paths.test.cjs"],
  ["setter.cjs", ".claude/hooks/set-writes-scope.test.cjs"],
  ["loop.cjs", ".claude/hooks/require-loop-record.test.cjs"],
]) {
  fs.appendFileSync(dst, fs.readFileSync(`${SP}/${src}`, "utf8"));
  console.log("ok (appended)", dst);
}
