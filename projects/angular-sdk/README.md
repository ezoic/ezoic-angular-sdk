# @ezoic/angular-sdk

Official Ezoic SDK for Angular — wraps the Ezoic `ezstandalone` client integration (script
management, display ads, SPA routing, consent, rewarded ads and video) as idiomatic Angular
standalone components, providers and services.

> **Status: early development (0.x).** API not yet stable. See the
> [repository](https://github.com/ezoic/ezoic-angular-sdk) for the roadmap and changelog.

## Requirements

- Angular 20, 21 or 22

## Usage

Register the SDK once in your `ApplicationConfig`, then drop `<ezoic-ad>` components where you want
placeholders:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideEzoic } from '@ezoic/angular-sdk';

export const appConfig: ApplicationConfig = {
  providers: [provideEzoic()],
};
```

```ts
import { Component } from '@angular/core';
import { EzoicAdComponent } from '@ezoic/angular-sdk';

@Component({
  selector: 'app-article',
  imports: [EzoicAdComponent],
  template: `
    <ezoic-ad [id]="101" />
    <ezoic-ad [id]="102" required [sizes]="['728x90']" />
    <ezoic-ad location="under_first_paragraph" />
  `,
})
export class ArticleComponent {}
```

Give `<ezoic-ad>` either a numeric `[id]` (1–999) or a semantic `location` name (zero-config, resolved
to a reserved 900–999 id) — exactly one of the two. Placeholders that mount in the same tick are
batched into a single `showAds` call and torn down on destroy. `EzoicService` also exposes `showAds`
/ `displayMore` / `destroyPlaceholders` / `destroyAll` / `refreshAds` / `isEzoicUser` /
`resolveLocationId` for imperative and dynamic-content flows. See the
[repository README](https://github.com/ezoic/ezoic-angular-sdk#readme) for the full guide.

Consent, rewarded ads and video wrappers are on the roadmap.

## Documentation

- SDK repository: <https://github.com/ezoic/ezoic-angular-sdk>
- Ezoic ad integration docs: <https://docs.ezoic.com/docs/ezoicads/integration/>

## License

MIT
