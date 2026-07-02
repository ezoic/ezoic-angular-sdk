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

## Quickstart

Register the SDK once in your application config. `provideEzoic()` injects the Ezoic scripts in the
required order — the two consent (CMP) scripts first (each with `data-cfasync="false"`), then the
`ezstandalone` command-queue stub, then the async `sa.min.js` header bundle, then the analytics
script — at application startup, in the browser only.

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideEzoic } from '@ezoic/angular-sdk';

export const appConfig: ApplicationConfig = {
  providers: [provideEzoic()],
};
```

Then use `EzoicService` to queue work on the Ezoic command queue. `push` is safe to call before the
header script has loaded (the function is buffered and run in order once the runtime is ready) and is
a no-op during server-side rendering:

```ts
import { Component, inject } from '@angular/core';
import { EzoicService } from '@ezoic/angular-sdk';

@Component({ selector: 'app-root', standalone: true, template: '' })
export class AppComponent {
  private readonly ezoic = inject(EzoicService);

  ready = this.ezoic.ready; // signal<boolean>: true once scripts are injected (browser only)
}
```

### Options

`provideEzoic(options)` accepts:

| Option               | Default                  | Description                                                          |
| -------------------- | ------------------------ | -------------------------------------------------------------------- |
| `cmp`                | `true`                   | Inject the two Ezoic consent (CMP) scripts before the header script. |
| `scriptUrl`          | Ezoic `sa.min.js` URL    | Override the header bundle URL (e.g. to pin a specific build).       |
| `analytics`          | `true`                   | Inject the Ezoic analytics script after the header script.           |
| `analyticsScriptUrl` | Ezoic `analytics.js` URL | Override the analytics script URL.                                   |

Only disable `cmp` if your site already loads an Ezoic-compatible TCF consent manager — the SDK never
reorders consent after the header script.

### Server-side rendering

`provideEzoic()` is SSR-safe: on the server it injects nothing and touches no `window`/`document`
globals, so it works unchanged with Angular's built-in SSR and Angular Universal.

### Idempotency

Script injection is idempotent. A script already present in the host HTML (including a
protocol-relative `//host/path` tag) is detected and never duplicated, and the command-queue stub is
injected at most once.

## Display ads

Drop an `<ezoic-ad>` component wherever you want a placeholder. It renders a bare
`<div id="ezoic-pub-ad-placeholder-<id>">` — the element the Ezoic runtime scans for — with no
styling of its own:

```ts
import { Component } from '@angular/core';
import { EzoicAdComponent } from '@ezoic/angular-sdk';

@Component({
  selector: 'app-article',
  imports: [EzoicAdComponent],
  template: `
    <ezoic-ad [id]="101" />
    <p>…article content…</p>
    <ezoic-ad [id]="102" required [sizes]="['728x90', '320x50']" />
  `,
})
export class ArticleComponent {}
```

- **Ids** are integers in the range 1–999 (900–999 are reserved for zero-config semantic placements,
  coming in a later release). An out-of-range id throws at render time so the mistake surfaces
  immediately.
- **Batching:** every `<ezoic-ad>` that initializes in the same tick is coalesced into a single
  `showAds(...)` call. The Ezoic runtime applies its own debounce on top, so the SDK adds no extra
  timer.
- **`required` / `sizes`** map to the verified `showAds` object form
  (`{ id, required, sizes }`); each size is `WIDTHxHEIGHT` (for example `"728x90"`).
- **Teardown:** when a component is destroyed the placeholder is torn down via
  `destroyPlaceholders(id)`. Ids are reference-counted, so mounting the same id twice logs a warning
  (ids must be unique on a page) and tears down only once.
- **SSR:** the placeholder `<div>` renders on the server; ad requests happen only in the browser.

### Imperative and dynamic content

For infinite scroll, dynamically injected content or manual control, `EzoicService` exposes the
verified runtime methods. Each runs inside the command queue (safe before the runtime loads) and is a
no-op during server-side rendering:

```ts
import { Component, inject } from '@angular/core';
import { EzoicService } from '@ezoic/angular-sdk';

@Component({ selector: 'app-feed', template: '' })
export class FeedComponent {
  private readonly ezoic = inject(EzoicService);

  loadMore(): void {
    // Request placeholders added after the initial page load.
    this.ezoic.displayMore(105, 106);
  }
}
```

| Method                               | Purpose                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `showAds(...placeholders)`           | Request placeholders (id or `{ id, required?, sizes? }`).          |
| `displayMore(...ids)`                | Request additional placeholders after the initial load.            |
| `destroyPlaceholders(...ids)`        | Tear down specific placeholders.                                   |
| `destroyAll()`                       | Tear down every placeholder plus anchor, side rails and outstream. |
| `refreshAds(...ids)`                 | Re-request bids for the given header-bidding placeholders.         |
| `isEzoicUser(callback, percentage?)` | Report A/B group membership to `callback` once the runtime loads.  |

## What's included

Verified, framework-agnostic primitives and the provider/service layer:

- `provideEzoic(options)` — `ApplicationConfig` providers that inject the Ezoic scripts at startup.
- `EzoicService` — `ready` signal, `push(fn)` command-queue helper, `isBrowser` flag, and display
  passthroughs (`showAds`, `displayMore`, `destroyPlaceholders`, `destroyAll`, `refreshAds`,
  `isEzoicUser`).
- `EzoicAdComponent` (`<ezoic-ad>`) — declarative display placeholder with same-tick batching and
  automatic teardown.
- Script URL constants: `EZOIC_SA_SCRIPT_URL`, `EZOIC_CMP_SCRIPT_URLS`, `EZOIC_ANALYTICS_SCRIPT_URL`.
- `EZOIC_OPTIONS` DI token and the `EzoicOptions` / `EzoicCommand` / `EzoicPlaceholder` /
  `EzoicPlaceholderArg` / `Ezstandalone` types.
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

Display-ad components, SPA routing helpers, consent services, rewarded ads and video wrappers are on
the roadmap below.

## Roadmap

1. Package skeleton — done
2. Provider + script management (`provideEzoic`) — done
3. Display ads (`<ezoic-ad>`) — done
4. SPA routing integration — current
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
