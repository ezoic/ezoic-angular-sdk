# Contributing to @ezoic/angular-sdk

Thanks for your interest in improving the Ezoic SDK for Angular. This guide
covers the local setup and the checks that must pass before a change is merged.

## Prerequisites

- **Node.js 20+** (CI runs on Node 20 and 22).
- **Angular 20+** tooling (installed locally via `npm ci`).

## Setup

```bash
npm ci
```

## Dev loop

```bash
npm run build         # build the library to dist/angular-sdk (ng-packagr)
npm test              # run the Jest unit suite
npm run lint          # ESLint via ng lint (library only)
npm run format:check  # Prettier check across the repo
npm run build:demo    # build the examples/demo app against the local library
npm run start:demo    # serve the demo at http://localhost:4200
```

The demo app under `examples/demo` imports the library through the workspace
path mapping (`@ezoic/angular-sdk` → `dist/angular-sdk`), so **build the library
first** (`npm run build`) before building or serving the demo. The demo is
intentionally excluded from `ng lint` and Jest.

## Code style

- **Prettier** enforces formatting: `printWidth: 100`, `singleQuote: true`. Run
  `npm run format` before committing.
- **ESLint** (Angular ESLint) enforces lint rules on the library source.
- Prefer standalone components, `inject()`, signals, and
  `ChangeDetectionStrategy.OnPush`.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/), for example:

```
feat: add rewarded-ads content locker helper
fix: guard runtime reads during server-side rendering
docs: clarify zero-config location placements
```

## Pull requests

- CI (lint + test + build on Node 20 and 22) must be **green** before merge.
- Keep changes focused and include tests for new behavior and error paths.
- Update documentation when behavior changes.

## Publishing

Publishing to npm is a **maintainer-only** step handled from a release branch.
Do not run `npm publish` in a contribution.
