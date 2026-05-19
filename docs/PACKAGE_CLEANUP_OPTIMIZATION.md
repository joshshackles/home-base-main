# Package cleanup and optimization

## What changed

- Removed `tsconfig.tsbuildinfo` from the shipped package. It is a local TypeScript incremental build cache and does not need to be versioned or deployed.
- Expanded `.gitignore` to exclude generated caches, dependency folders, local environment files, logs, coverage output, local storage, and editor/OS noise.
- Added `npm run package:cleanliness` to fail fast if generated/cache files are accidentally packaged again.
- Added the cleanliness check into the full `npm run verify` chain.

## Why this matters

`tsconfig.tsbuildinfo` can grow quickly as the app grows. It does not affect production runtime, but it can bloat commits, zip packages, diffs, and uploads. Removing it keeps the repository focused on source files and migrations.

## Current optimization scan

The removed TypeScript cache was the largest file in the package at roughly 2.2 MB. The next largest files are legitimate source/docs files such as `prisma/schema.prisma`, `src/app/admin/actions.ts`, and `CHANGELOG.md`.

Those files are valid to keep, but future optimization opportunities are:

1. Split very large action files by domain.
2. Move long changelog history into versioned docs if it grows too large.
3. Keep sample data small and avoid shipping generated exports.
4. Continue excluding `.next`, `node_modules`, `.vercel`, `coverage`, local uploads, and TypeScript build info.

## Developer workflow

If `tsconfig.tsbuildinfo` is already tracked in git, remove it once with:

```bash
git rm --cached tsconfig.tsbuildinfo
```

Then commit the `.gitignore` update.
