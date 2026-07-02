import { EZOIC_CMP_SCRIPT_URLS, ResolvedEzoicOptions } from './ezoic-config';
import { EzoicWindow } from './ezstandalone.types';

/**
 * Marker attribute set on every script element the SDK injects. Its value
 * labels the role of the script (`cmp`, `cmd-stub`, `header`, `analytics`) and
 * lets the loader recognise and skip scripts it already added.
 */
export const EZOIC_SDK_SCRIPT_ATTR = 'data-ezoic-sdk';

const MARKER_CMP = 'cmp';
const MARKER_CMD_STUB = 'cmd-stub';
const MARKER_HEADER = 'header';
const MARKER_ANALYTICS = 'analytics';
const MARKER_REWARDED_CMD_STUB = 'rewarded-cmd-stub';
const MARKER_REWARDED = 'rewarded';

interface ScriptAttributes {
  /** Set `async` on the element. */
  async?: boolean;
  /** Set `data-cfasync="false"` (before `src`) on the element. */
  cfasync?: boolean;
}

/**
 * Injects the Ezoic header scripts into `doc` in the required order:
 *
 * 1. the two CMP consent scripts (each with `data-cfasync="false"` before
 *    `src`), when {@link ResolvedEzoicOptions.cmp} is enabled;
 * 2. the command-queue stub that initializes `window.ezstandalone.cmd`;
 * 3. the async header bundle (`sa.min.js`);
 * 4. the analytics script, when {@link ResolvedEzoicOptions.analytics} is
 *    enabled.
 *
 * Idempotent: a script whose `src` already resolves to the same URL — whether
 * injected by a previous call or present in the host HTML — is not injected
 * again, and the command-queue stub is injected at most once. The command queue
 * is also initialized directly (not only via the inline stub) so it exists even
 * when a strict Content-Security-Policy blocks inline scripts.
 *
 * Callers must ensure this only runs in a browser; it performs no platform
 * check of its own.
 */
export function injectEzoicScripts(doc: Document, options: ResolvedEzoicOptions): void {
  const head = doc.head;
  if (!head) {
    return;
  }

  if (options.cmp) {
    for (const url of EZOIC_CMP_SCRIPT_URLS) {
      appendExternalScript(doc, head, url, MARKER_CMP, { cfasync: false });
    }
  }

  ensureCommandQueue(doc);
  appendCommandQueueStub(doc, head);

  appendExternalScript(doc, head, options.scriptUrl, MARKER_HEADER, { async: true });

  if (options.analytics) {
    appendExternalScript(doc, head, options.analyticsScriptUrl, MARKER_ANALYTICS, {});
  }
}

/**
 * Injects the site-specific rewarded-ads loader into `doc`.
 *
 * `loaderUrl` is the publisher's `{host}/porpoiseant/ezadloadrewarded.js` URL;
 * the SDK never hardcodes it. In order it:
 *
 * 1. initializes `window.ezRewardedAds.cmd` directly (so it exists even when a
 *    strict Content-Security-Policy blocks inline scripts);
 * 2. appends the inline command-queue stub once;
 * 3. appends the loader as an async external script.
 *
 * Idempotent: the stub is injected at most once, and the loader is deduplicated
 * by host + pathname, so re-injecting the same loader with different query
 * params (for example callback overrides) does not add a second tag.
 *
 * Callers must ensure this only runs in a browser; it performs no platform
 * check of its own.
 */
export function injectRewardedLoader(doc: Document, loaderUrl: string): void {
  const head = doc.head;
  if (!head) {
    return;
  }

  ensureRewardedCommandQueue(doc);
  appendRewardedCommandQueueStub(doc, head);

  appendExternalScript(doc, head, loaderUrl, MARKER_REWARDED, { async: true });
}

/** Initializes `window.ezstandalone.cmd` without relying on the inline stub. */
function ensureCommandQueue(doc: Document): void {
  const win = doc.defaultView as EzoicWindow | null;
  if (!win) {
    return;
  }
  if (!win.ezstandalone) {
    win.ezstandalone = { cmd: [] };
  } else if (!Array.isArray(win.ezstandalone.cmd)) {
    win.ezstandalone.cmd = [];
  }
}

/** Appends the inline command-queue stub once, mirroring the documented tag. */
function appendCommandQueueStub(doc: Document, head: HTMLHeadElement): void {
  if (doc.querySelector(`script[${EZOIC_SDK_SCRIPT_ATTR}="${MARKER_CMD_STUB}"]`)) {
    return;
  }
  const el = doc.createElement('script');
  el.setAttribute(EZOIC_SDK_SCRIPT_ATTR, MARKER_CMD_STUB);
  el.textContent =
    'window.ezstandalone = window.ezstandalone || {}; ' +
    'window.ezstandalone.cmd = window.ezstandalone.cmd || [];';
  head.appendChild(el);
}

/** Initializes `window.ezRewardedAds.cmd` without relying on the inline stub. */
function ensureRewardedCommandQueue(doc: Document): void {
  const win = doc.defaultView as EzoicWindow | null;
  if (!win) {
    return;
  }
  if (!win.ezRewardedAds) {
    win.ezRewardedAds = { cmd: [] };
  } else if (!Array.isArray(win.ezRewardedAds.cmd)) {
    win.ezRewardedAds.cmd = [];
  }
}

/** Appends the inline rewarded command-queue stub once. */
function appendRewardedCommandQueueStub(doc: Document, head: HTMLHeadElement): void {
  if (doc.querySelector(`script[${EZOIC_SDK_SCRIPT_ATTR}="${MARKER_REWARDED_CMD_STUB}"]`)) {
    return;
  }
  const el = doc.createElement('script');
  el.setAttribute(EZOIC_SDK_SCRIPT_ATTR, MARKER_REWARDED_CMD_STUB);
  el.textContent =
    'window.ezRewardedAds = window.ezRewardedAds || {}; ' +
    'window.ezRewardedAds.cmd = window.ezRewardedAds.cmd || [];';
  head.appendChild(el);
}

/** Appends an external `<script src>` unless an equivalent one already exists. */
function appendExternalScript(
  doc: Document,
  head: HTMLHeadElement,
  url: string,
  marker: string,
  attrs: ScriptAttributes,
): void {
  if (scriptExists(doc, url)) {
    return;
  }
  const el = doc.createElement('script');
  el.setAttribute(EZOIC_SDK_SCRIPT_ATTR, marker);
  if (attrs.cfasync === false) {
    // Set before `src` so Cloudflare Rocket Loader leaves the script untouched.
    el.setAttribute('data-cfasync', 'false');
  }
  if (attrs.async) {
    el.async = true;
  }
  el.src = url;
  head.appendChild(el);
}

/** Returns `true` when any `<script src>` already resolves to `url`. */
function scriptExists(doc: Document, url: string): boolean {
  const target = scriptKey(doc, url);
  const scripts = doc.querySelectorAll('script[src]');
  for (const script of Array.from(scripts)) {
    const src = script.getAttribute('src');
    if (src && scriptKey(doc, src) === target) {
      return true;
    }
  }
  return false;
}

/**
 * Identity key for a script URL: host + pathname, ignoring protocol, query and
 * hash. This treats a protocol-relative host tag (`//host/path`) and an
 * absolute `https://host/path` as the same script, so the loader does not
 * duplicate a script the host page already declared.
 */
function scriptKey(doc: Document, url: string): string {
  try {
    const parsed = new URL(url, doc.baseURI);
    return parsed.host + parsed.pathname;
  } catch {
    return url;
  }
}
