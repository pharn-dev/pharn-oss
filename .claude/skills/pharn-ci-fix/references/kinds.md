# The eight fix kinds

pharn-ci 0.9.0 gives every message and every finding one `kind` from a closed
list, and one fixed `hint` sentence for its message code or signal id. Both
come from two fixed tables in pharn-ci's core
(`packages/core/src/fix/table.ts`); they are never written by a model and
never look at the code. So a hint says what kind of change fixes a finding
when the finding is real, never whether it is real, and two findings of one id
differ only in `target`.

The sections below follow the schema's order. Each says what the kind asks,
what you do, and what you never do for it. Message codes that carry a signal id
(`TEST_INTEGRITY_TI03`, `POLICY_P09`, `INJECTION_PI03`, `DEPENDENCY_D05`,
`SETUP_STALE_SI01`) have the kind of that signal.

## `add-test`

Add tests that run the changed code. You write tests, nothing else: the change
under review stays as it is, and so do the gate, the coverage settings and the
existing tests.

- `DIFF_COVERAGE_BELOW_THRESHOLD`: follow `pharn-ci-cover`'s method for the
  listed uncovered lines (re-check them, report what tests cannot reach). This
  skill does not repeat it.
- `TESTS_NOT_EXERCISING_CHANGES`: add or change tests that import the changed
  source files the message names and assert on what they do.

## `restore-test`

Restore a test that was deleted, removed or turned off (TI01 to TI04,
`TEST_FILES_DELETED`). This undoes part of the pull request, so do it only for a
finding the person asked you to fix, after you show them the change at the
`target` (`git diff <base>...HEAD -- '<path>'`). Bring the test back as it was
at the base (`git show <base>:'<path>'`, then put back the removed test, or
remove the added `.skip`, `.only`, `fit` or `fdescribe`). Never write a new,
weaker test in its place and call it restored. If the deletion looks meant (the
code it tested was removed too), say so and ask.

## `restore-assertion`

Restore the assertions or expected values a test had (TI05 to TI07, and from
0.11.0 TI17, an assertion that always passes). Same rule as `restore-test`:
only on request, after showing the change. Put back the assertion or the
expected value from the base; for TI17, an assertion that can fail in place of
the always-true matcher, helper or wildcard. When a TI07 test was edited to
match changed code, the code may be wrong: say which, and never pin the new
value to make the run pass.

## `revert-config`

Revert the change to a config, script, workflow or settings file (TI09 to TI11,
TI13, TI14, P09, P13). Only on request, after showing the change. A revert puts
back the base version of the lines the finding names, which keeps the gate where
it was: the same tests run, under the same rules, over the same files. A revert
never removes more than the change added, and never touches a line the finding
does not name.

## `remove-dependency`

Remove the dependency the change adds (D01 to D03, D05). Only on request, after
showing the change. Remove it from the manifest, regenerate the lockfile with
the project's package manager (ask before running an install), and say which
code imports it, since that code no longer works. Never swap it for another
package on your own: picking one is the person's decision.

## `request-review`

A person should look at the change and confirm it; an agent cannot decide that
(TI08, TI12, TI15, TI16, P02 to P06, P08, P11, PI01 to PI05, D04, the
`AGENT_CONFIG_SECRET_S01` to `S11` codes, `CONFIG_CHANGED_IN_DIFF`,
`COVERAGE_FILE_TRACKED`). You change no code for it. Name the finding, its
`target` and its hint, and say who should look (a reviewer, a maintainer, the
policy owner). For D04 the hint also says to regenerate the lockfile: offer
that, and leave the decision that the manifest change was meant to a person.
For a secret finding, never repeat the value; the hint says to remove, rotate
and load it from the environment, which a maintainer does.

## `split-pr`

Split the change into smaller pull requests (P14, the org policy's size caps).
You propose a split: which files go together and in what order, each part
under the caps the message names. You never create branches, move commits or
open pull requests.

## `none`

No code change fixes this; the hint says what to check. It covers the
operational messages (a coverage file that is missing or empty, a diff that was
unavailable, a policy that could not be fetched, a JUnit file that was refused)
and the signals no code change fixes (P01, P07, P10, SI01 to SI04). You change
no code for it. Say what the hint asks the person to check, and for the verdict
use `pharn-ci-explain`. SI01 to SI03 point at an agent instruction file that
names something missing: offer to update the instruction, and make that edit
only when the person asks for it.

## What a fix does not tell you

- A hint is generic. It cannot tell a real problem from a meant change.
- A hint never proves a fix was made or was right. The next run's report is the
  only check.
- A message has no `target`; a message that names several files points at none.
- P12 has no entry: pharn-ci produces no P12 finding.
- A report that did not go through pharn-ci's `check()` (the accept label and
  the upload outcome rebuild some messages) may have fewer fixes. An entry with
  no `fix` is counted in the helper's `withoutFix`; read its code with
  `pharn-ci-explain`.
- A `kind` this list does not hold comes from a newer pharn-ci. The helper
  reports it as a problem: treat that entry as having no fix, and say the skill
  needs an update.
