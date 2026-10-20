# PLAN — deps-prettier-codeql

- applied_lessons: none
- increment: apply Dependabot #352–#354 as one maintainer PR (codeql init+analyze together; prettier 3.9.10; group codeql-action in dependabot.yml)

## Files

- `.github/workflows/codeql.yml` — bump init and analyze to v4.39.0 (same SHA)
- `.github/dependabot.yml` — group `github/codeql-action*` so init/analyze bump together
- `package.json` — prettier ^3.9.10
- `package-lock.json` — lockfile for prettier 3.9.10
- `CHANGELOG.md` — [Unreleased] entry (maintainer-authored dep bump)
- `.dev/features/deps-prettier-codeql/PLAN.md` — this plan
