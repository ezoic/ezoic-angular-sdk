#!/usr/bin/env node
/**
 * Inlines the built site-demos app (`dist/site-demos/browser/index.html` + its
 * content-hashed `.js`/`.css` assets) into self-contained HTML, then writes one
 * standalone file per scenario at `dist/site-demos/<slug>.html`.
 *
 * The site-demos app is a single built Angular bundle covering all scenario
 * routes. Each scenario output is the same inlined HTML with a tiny hash-preset
 * `<script>` inserted before the first module script, so it selects its route
 * before Angular bootstraps. Each output is meant to be embedded verbatim inside
 * a static publisher page served at a fixed URL path, so it must not reference
 * relative asset paths that depend on where the HTML was served from.
 *
 * Note: the output will NOT contain any Ezoic ad-serving or CMP scripts (e.g. a
 * `sa.min.js` loader or gatekeeperconsent.com tags) as literal `<script src>`
 * tags — those are third-party, per-site, and injected into the page at runtime
 * by the SDK itself once it bootstraps in the browser. This script only inlines
 * the app's own local build output; the CMP/header hostnames it asserts are
 * present as string constants compiled into the bundle.
 *
 * This build pipeline is intentionally independent of `examples/demo/inline.mjs`:
 * the inlining helpers are duplicated here rather than imported so the two
 * pipelines never couple.
 *
 * Usage: node examples/site-demos/inline.mjs
 * Exits non-zero (via thrown error) on any missing asset or failed assertion,
 * making it usable as a CI regression gate.
 */
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..', '..');
const browserDir = join(repoRoot, 'dist', 'site-demos', 'browser');
const inputHtmlPath = join(browserDir, 'index.html');
const outputDir = join(repoRoot, 'dist', 'site-demos');

/**
 * Scenario manifest: each entry produces `dist/site-demos/<slug>.html` presetting
 * `#/<route>`. `assert` lists build-time-verifiable substrings confirmed present
 * in the compiled bundle (route paths and template literals compiled by the
 * Angular AOT compiler), so a wrong route or a dropped scenario fails the build.
 */
const SCENARIOS = [
  { slug: 'basic', route: 'display', assert: ['728x90', '320x50'] },
  { slug: 'zero-config', route: 'zero-config', assert: ['under_first_paragraph', '300x250'] },
  { slug: 'spa', route: 'spa-a', assert: ['spa-b'] },
  { slug: 'dynamic', route: 'dynamic', assert: ['Load more content'] },
  { slug: 'rewarded', route: 'rewarded', assert: ['demo-reward', 'demo-show'] },
  { slug: 'video', route: 'video', assert: ['demo-video-id', 'demo-video-slot-1'] },
];

/** Substrings every scenario output must contain (CMP + header script hosts). */
const COMMON_REQUIRED_SUBSTRINGS = [
  'cmp.gatekeeperconsent.com',
  'the.gatekeeperconsent.com',
  'sa.min.js',
];

function isRemoteUrl(url) {
  return /^(https?:)?\/\//i.test(url);
}

function readLocalAsset(href) {
  const assetPath = join(browserDir, href);
  if (!existsSync(assetPath)) {
    throw new Error(`inline.mjs: referenced local asset "${href}" does not exist at ${assetPath}`);
  }
  return readFileSync(assetPath, 'utf8');
}

function inlineStylesheets(html) {
  const linkTagPattern = /<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi;
  let stylesheetCount = 0;

  const result = html.replace(linkTagPattern, (tag) => {
    const hrefMatch = /href=["']([^"']+)["']/i.exec(tag);
    if (!hrefMatch) {
      return tag;
    }
    const href = hrefMatch[1];
    if (isRemoteUrl(href)) {
      return tag;
    }
    const css = readLocalAsset(href).replace(/<\/style/gi, '<\\/style');
    stylesheetCount += 1;
    return `<style>${css}</style>`;
  });

  return { html: result, stylesheetCount };
}

function inlineScripts(html) {
  const scriptTagPattern = /<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>\s*<\/script>/gi;
  let scriptCount = 0;

  const result = html.replace(scriptTagPattern, (tag, src) => {
    if (isRemoteUrl(src)) {
      return tag;
    }
    const js = readLocalAsset(src).replace(/<\/script/gi, '<\\/script');
    scriptCount += 1;
    return `<script type="module">${js}</script>`;
  });

  return { html: result, scriptCount };
}

function removeStylesheetNoscriptFallback(html) {
  // The Beasties critical-CSS inliner adds a <noscript> fallback that only
  // re-declares the stylesheet <link> for no-JS clients. Once the stylesheet
  // is inlined that fallback is dead weight and would leave a dangling
  // reference to a file that's no longer written out separately.
  return html.replace(/<noscript>\s*<link\b[^>]*rel=["']stylesheet["'][^>]*>\s*<\/noscript>/gi, '');
}

function assertNoRemainingLocalAssetRefs(html) {
  const danglingAssetPattern = /(?:src|href)=["'](?!https?:|\/\/)[^"']*\.(?:js|css)["']/i;
  const match = danglingAssetPattern.exec(html);
  if (match) {
    throw new Error(`inline.mjs: output still references an external local asset: ${match[0]}`);
  }
}

/**
 * Inserts the hash-preset script immediately before the first inlined
 * `<script type="module">` so it runs before Angular bootstraps and picks up the
 * initial route. Throws when no module script is present (the bundle failed to
 * inline as expected).
 */
function insertHashPreset(html, route) {
  const marker = '<script type="module">';
  const index = html.indexOf(marker);
  if (index === -1) {
    throw new Error(
      'inline.mjs: no inlined <script type="module"> found to anchor the hash-preset script.',
    );
  }
  const preset = `<script>if (!location.hash || location.hash === '#/') { location.hash = '#/${route}'; }</script>`;
  return html.slice(0, index) + preset + html.slice(index);
}

function assertScenarioSubstrings(html, scenario) {
  const hashSubstring = `location.hash = '#/${scenario.route}'`;
  const required = [...scenario.assert, hashSubstring, ...COMMON_REQUIRED_SUBSTRINGS];
  const missing = required.filter((substring) => !html.includes(substring));
  if (missing.length > 0) {
    throw new Error(
      `inline.mjs: scenario "${scenario.slug}" output is missing required substring(s): ${missing.join(', ')}`,
    );
  }
}

/**
 * Guards the examples.ezoic.com house rule: a page must never contain the
 * literal id-less-snippet shape `showAds({` (an object-literal call with no
 * `id` key), or the production sa.min.js document-order scanner (API
 * reference §"Id-less showAds", tier ③ anchor resolution) could mistake this
 * inlined bundle's own `<script>` tag for a hand-written id-less snippet.
 * The SDK's compiled output calls `showAds(...)` via spread/rest forwarding
 * (`showAds(...t)`), never an inline object literal, so this should never
 * fire for site-demos — it exists to catch a future SDK source change (or a
 * minifier/bundler change) that would silently reintroduce the risky shape.
 */
function assertNoIdlessSnippetShape(html, scenario) {
  const idlessSnippetPattern = /showAds\(\s*\{/;
  if (idlessSnippetPattern.test(html)) {
    throw new Error(
      `inline.mjs: scenario "${scenario.slug}" output contains the literal id-less-snippet shape ` +
        '"showAds({" — this could be mistaken for a hand-written id-less snippet by the production ' +
        'document-order scanner. Investigate what introduced an inline object-literal showAds() call ' +
        'into the compiled bundle before shipping.',
    );
  }
}

function main() {
  if (!existsSync(inputHtmlPath)) {
    throw new Error(
      `inline.mjs: built site-demos not found at ${inputHtmlPath}. Run "npm run build:site-demos" first.`,
    );
  }

  let html = readFileSync(inputHtmlPath, 'utf8');

  html = removeStylesheetNoscriptFallback(html);

  const { html: htmlWithStyles, stylesheetCount } = inlineStylesheets(html);
  html = htmlWithStyles;

  const { html: htmlWithScripts, scriptCount } = inlineScripts(html);
  html = htmlWithScripts;

  assertNoRemainingLocalAssetRefs(html);

  for (const scenario of SCENARIOS) {
    const scenarioHtml = insertHashPreset(html, scenario.route);
    assertScenarioSubstrings(scenarioHtml, scenario);
    assertNoIdlessSnippetShape(scenarioHtml, scenario);

    const outputPath = join(outputDir, `${scenario.slug}.html`);
    writeFileSync(outputPath, scenarioHtml, 'utf8');
    const { size } = statSync(outputPath);
    console.log(`Wrote ${outputPath} (${size} bytes) → #/${scenario.route}`);
  }

  console.log(
    `inlined ${scriptCount} script(s), ${stylesheetCount} stylesheet(s); ` +
      `wrote ${SCENARIOS.length} scenario file(s); all assertions passed`,
  );
}

main();
