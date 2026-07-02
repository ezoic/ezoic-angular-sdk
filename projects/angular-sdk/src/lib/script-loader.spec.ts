import { EZOIC_CMP_SCRIPT_URLS, EZOIC_SA_SCRIPT_URL, resolveEzoicOptions } from './ezoic-config';
import { EZOIC_SDK_SCRIPT_ATTR, injectEzoicScripts, injectRewardedLoader } from './script-loader';
import { EzoicWindow } from './ezstandalone.types';

const REWARDED_LOADER_URL = 'https://example.com/porpoiseant/ezadloadrewarded.js';

function injectedScripts(): HTMLScriptElement[] {
  return Array.from(
    document.querySelectorAll<HTMLScriptElement>(`script[${EZOIC_SDK_SCRIPT_ATTR}]`),
  );
}

function markers(): string[] {
  return injectedScripts().map((s) => s.getAttribute(EZOIC_SDK_SCRIPT_ATTR) ?? '');
}

function reset(): void {
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  (window as unknown as EzoicWindow).ezstandalone = undefined;
}

describe('injectEzoicScripts', () => {
  beforeEach(reset);
  afterEach(reset);

  it('injects CMP, cmd-stub, header and analytics in order by default', () => {
    injectEzoicScripts(document, resolveEzoicOptions());
    expect(markers()).toEqual(['cmp', 'cmp', 'cmd-stub', 'header', 'analytics']);
  });

  it('sets the CMP script URLs in the documented order', () => {
    injectEzoicScripts(document, resolveEzoicOptions());
    const cmp = injectedScripts().filter((s) => s.getAttribute(EZOIC_SDK_SCRIPT_ATTR) === 'cmp');
    expect(cmp.map((s) => s.getAttribute('src'))).toEqual([...EZOIC_CMP_SCRIPT_URLS]);
  });

  it('sets data-cfasync="false" before src on CMP scripts only', () => {
    injectEzoicScripts(document, resolveEzoicOptions());
    for (const script of injectedScripts()) {
      const marker = script.getAttribute(EZOIC_SDK_SCRIPT_ATTR);
      if (marker === 'cmp') {
        expect(script.getAttribute('data-cfasync')).toBe('false');
        const names = script.getAttributeNames();
        expect(names.indexOf('data-cfasync')).toBeLessThan(names.indexOf('src'));
      } else {
        expect(script.getAttribute('data-cfasync')).toBeNull();
      }
    }
  });

  it('marks the header script async and points it at sa.min.js', () => {
    injectEzoicScripts(document, resolveEzoicOptions());
    const header = injectedScripts().find(
      (s) => s.getAttribute(EZOIC_SDK_SCRIPT_ATTR) === 'header',
    );
    expect(header?.getAttribute('src')).toBe(EZOIC_SA_SCRIPT_URL);
    expect(header?.async).toBe(true);
  });

  it('places the cmd-stub before the header script', () => {
    injectEzoicScripts(document, resolveEzoicOptions());
    const order = markers();
    expect(order.indexOf('cmd-stub')).toBeLessThan(order.indexOf('header'));
  });

  it('initializes window.ezstandalone.cmd as an array', () => {
    injectEzoicScripts(document, resolveEzoicOptions());
    const ez = (window as unknown as EzoicWindow).ezstandalone;
    expect(Array.isArray(ez?.cmd)).toBe(true);
  });

  it('does not duplicate scripts when called twice', () => {
    injectEzoicScripts(document, resolveEzoicOptions());
    injectEzoicScripts(document, resolveEzoicOptions());
    expect(markers()).toEqual(['cmp', 'cmp', 'cmd-stub', 'header', 'analytics']);
  });

  it('omits CMP scripts when cmp is disabled', () => {
    injectEzoicScripts(document, resolveEzoicOptions({ cmp: false }));
    expect(markers()).toEqual(['cmd-stub', 'header', 'analytics']);
  });

  it('omits the analytics script when analytics is disabled', () => {
    injectEzoicScripts(document, resolveEzoicOptions({ analytics: false }));
    expect(markers()).toEqual(['cmp', 'cmp', 'cmd-stub', 'header']);
  });

  it('uses a custom header script URL when provided', () => {
    const scriptUrl = 'https://www.ezojs.com/ezoic/sa.es6.min.js';
    injectEzoicScripts(document, resolveEzoicOptions({ scriptUrl }));
    const header = injectedScripts().find(
      (s) => s.getAttribute(EZOIC_SDK_SCRIPT_ATTR) === 'header',
    );
    expect(header?.getAttribute('src')).toBe(scriptUrl);
  });

  it('does not re-inject a header script already present in the host HTML', () => {
    const existing = document.createElement('script');
    existing.async = true;
    // Protocol-relative host tag, as shown in the Ezoic docs snippet.
    existing.setAttribute('src', '//www.ezojs.com/ezoic/sa.min.js');
    document.head.appendChild(existing);

    injectEzoicScripts(document, resolveEzoicOptions());

    const headerTags = Array.from(
      document.querySelectorAll<HTMLScriptElement>('script[src]'),
    ).filter((s) => (s.getAttribute('src') ?? '').endsWith('/ezoic/sa.min.js'));
    expect(headerTags).toHaveLength(1);
    // The SDK recognised the existing tag and did not add its own header script.
    expect(markers()).not.toContain('header');
  });
});

describe('injectRewardedLoader', () => {
  function resetRewarded(): void {
    document.head.querySelectorAll('script').forEach((s) => s.remove());
    (window as unknown as EzoicWindow).ezRewardedAds = undefined;
  }

  beforeEach(resetRewarded);
  afterEach(resetRewarded);

  it('injects the rewarded stub before the loader script', () => {
    injectRewardedLoader(document, REWARDED_LOADER_URL);
    const order = markers();
    expect(order.indexOf('rewarded-cmd-stub')).toBeLessThan(order.indexOf('rewarded'));
  });

  it('marks the loader script async and points it at the loader URL', () => {
    injectRewardedLoader(document, REWARDED_LOADER_URL);
    const loader = injectedScripts().find(
      (s) => s.getAttribute(EZOIC_SDK_SCRIPT_ATTR) === 'rewarded',
    );
    expect(loader?.getAttribute('src')).toBe(REWARDED_LOADER_URL);
    expect(loader?.async).toBe(true);
  });

  it('initializes window.ezRewardedAds.cmd as an array', () => {
    injectRewardedLoader(document, REWARDED_LOADER_URL);
    const api = (window as unknown as EzoicWindow).ezRewardedAds;
    expect(Array.isArray(api?.cmd)).toBe(true);
  });

  it('is idempotent: one loader and one stub when called twice', () => {
    injectRewardedLoader(document, REWARDED_LOADER_URL);
    injectRewardedLoader(document, REWARDED_LOADER_URL);
    expect(markers().filter((m) => m === 'rewarded')).toHaveLength(1);
    expect(markers().filter((m) => m === 'rewarded-cmd-stub')).toHaveLength(1);
  });

  it('dedupes the loader by host and pathname ignoring query params', () => {
    injectRewardedLoader(document, REWARDED_LOADER_URL);
    injectRewardedLoader(document, `${REWARDED_LOADER_URL}?cb=123&gcb=456`);
    expect(markers().filter((m) => m === 'rewarded')).toHaveLength(1);
  });
});
