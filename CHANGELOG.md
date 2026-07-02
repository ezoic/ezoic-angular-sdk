# Changelog

All notable changes to `@ezoic/angular-sdk` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial Angular library package skeleton (`@ezoic/angular-sdk`) built with ng-packagr (Angular
  Package Format), targeting Angular 20–22 with standalone-first APIs (no NgModule required).
- TypeScript strict configuration, ESLint (angular-eslint flat config) + Prettier, and a karma-free
  Jest test setup (jest-preset-angular, jsdom).
- GitHub Actions CI (format check, lint, test, build and `npm pack` verification) on a Node 20 and
  22 matrix.
- Verified placeholder-id primitives: `EZOIC_PLACEHOLDER_ID_PREFIX`, `MIN_PLACEHOLDER_ID`,
  `MAX_PLACEHOLDER_ID`, `isValidPlaceholderId`, `placeholderElementId`.
- `EZOIC_SDK_VERSION` export, kept in sync with the package manifest via a unit test.

[Unreleased]: https://github.com/ezoic/ezoic-angular-sdk/commits/master
