# @ezoic/angular-sdk

Official Ezoic SDK for Angular — wraps the Ezoic `ezstandalone` client integration (script
management, display ads, SPA routing, consent, rewarded ads and video) as idiomatic Angular
standalone components, providers and services.

> **Status: early development (0.x).** API not yet stable. See the
> [repository](https://github.com/ezoic/ezoic-angular-sdk) for the roadmap and changelog.

## Requirements

- Angular 20, 21 or 22

## Usage

```ts
import { isValidPlaceholderId, placeholderElementId } from '@ezoic/angular-sdk';

isValidPlaceholderId(101); // true
placeholderElementId(101); // 'ezoic-pub-ad-placeholder-101'
```

Display-ad components, providers, SPA routing, consent, rewarded ads and video wrappers are on the
roadmap.

## Documentation

- SDK repository: <https://github.com/ezoic/ezoic-angular-sdk>
- Ezoic ad integration docs: <https://docs.ezoic.com/docs/ezoicads/integration/>

## License

MIT
