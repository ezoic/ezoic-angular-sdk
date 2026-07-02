# @ezoic/angular-sdk

Official Ezoic SDK for Angular. It wraps the Ezoic `ezstandalone` client integration so Angular
apps can manage ad scripts, placeholders, SPA navigation, consent (CMP), display ads, rewarded ads
and video with idiomatic standalone components, providers and services.

[![CI](https://github.com/ezoic/ezoic-angular-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/ezoic/ezoic-angular-sdk/actions/workflows/ci.yml)

> **Status: early development (0.x).** The package is being built incrementally toward full feature
> coverage. The API is not yet stable and the package is not yet published to npm. See the
> [changelog](./CHANGELOG.md) and [roadmap](#roadmap).

## Requirements

- Angular 20, 21 or 22
- Node.js 20 or newer (for local development)

## Installation

The package is not yet published to the npm registry. To try it today, build it from source (see
[Development](#development)) and install the packed tarball:

```bash
npm run build
cd dist/angular-sdk && npm pack   # produces ezoic-angular-sdk-<version>.tgz
# then in your app:
npm install /path/to/ezoic-angular-sdk-<version>.tgz
```

Once published, installation will be:

```bash
npm install @ezoic/angular-sdk
```

## What's included

This is the package skeleton (roadmap item 1). It currently exports a small set of verified,
framework-agnostic primitives that the higher-level components and services build on:

- `EZOIC_SDK_VERSION` — the package version.
- Placeholder id contract helpers:
  - `EZOIC_PLACEHOLDER_ID_PREFIX` — `"ezoic-pub-ad-placeholder-"`.
  - `MIN_PLACEHOLDER_ID` / `MAX_PLACEHOLDER_ID` — `1` / `999`.
  - `isValidPlaceholderId(id)` — validates a placeholder id.
  - `placeholderElementId(id)` — builds the placeholder element id.

```ts
import { isValidPlaceholderId, placeholderElementId } from '@ezoic/angular-sdk';

isValidPlaceholderId(101); // true
placeholderElementId(101); // 'ezoic-pub-ad-placeholder-101'
```

Display-ad components, script-injection providers, SPA routing helpers, consent services, rewarded
ads and video wrappers are on the roadmap below.

## Roadmap

1. Package skeleton — current
2. Provider + script management (`provideEzoic`)
3. Display ads (`<ezoic-ad>`)
4. SPA routing integration
5. Zero-config placements (location names)
6. CMP / consent + config
7. Rewarded ads
8. Video (Ezoic outstream/instream + Humix)
9. Docs + demo app

## Development

```bash
npm install
npm run lint         # ESLint (angular-eslint flat config)
npm run format:check # Prettier
npm test             # Jest (jest-preset-angular, jsdom)
npm run build        # ng-packagr build to dist/angular-sdk
```

The build output in `dist/angular-sdk` is the publishable package (Angular Package Format).

## Contributing

Issues and pull requests are welcome. Please run `npm run lint`, `npm test` and `npm run build`
before submitting.

## Ad integration reference

For the underlying Ezoic ad integration that this SDK wraps, see the official Ezoic documentation:
<https://docs.ezoic.com/docs/ezoicads/integration/>

## License

[MIT](./LICENSE)
