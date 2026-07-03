#!/usr/bin/env node
/**
 * Inlines the built demo app (`dist/demo/browser/index.html` + its
 * content-hashed `.js`/`.css` assets) into a single self-contained HTML file
 * at `dist/angular_sdk_demo.html`.
 *
 * Why: the single-file output is meant to be embedded verbatim inside a
 * server response served at a fixed URL path, so it cannot reference
 * relative asset paths that depend on where the HTML itself was served from.
 *
 * Note: the output will NOT contain any Ezoic ad-serving or CMP scripts
 * (e.g. a `sa.min.js` loader or gatekeeperconsent.com tags) as literal
 * `<script src>` tags — those are third-party, per-site, and injected into
 * the page at runtime by the SDK itself once it bootstraps in the browser.
 * This script only inlines the demo app's own local build output.
 *
 * Usage: node examples/demo/inline.mjs
 * Exits non-zero (via thrown error) on any missing asset or failed assertion,
 * making it usable as a CI regression gate.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..', '..');
const browserDir = join(repoRoot, 'dist', 'demo', 'browser');
const inputHtmlPath = join(browserDir, 'index.html');
const outputPath = join(repoRoot, 'dist', 'angular_sdk_demo.html');

const REQUIRED_FEATURE_SUBSTRINGS = [
  'ezoic-pub-ad-placeholder-',
  'top_of_page',
  'under_first_paragraph',
  'mid_content',
  'setIsSinglePageApplication',
  'cmp.gatekeeperconsent.com',
  'the.gatekeeperconsent.com',
  'sa.min.js',
  'open.video',
  'porpoiseant',
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

function assertRequiredFeatureSubstrings(html) {
  const missing = REQUIRED_FEATURE_SUBSTRINGS.filter((substring) => !html.includes(substring));
  if (missing.length > 0) {
    throw new Error(
      `inline.mjs: output is missing required feature substring(s): ${missing.join(', ')}`,
    );
  }
}

function main() {
  if (!existsSync(inputHtmlPath)) {
    throw new Error(
      `inline.mjs: built demo not found at ${inputHtmlPath}. Run "npm run build:demo" first.`,
    );
  }

  let html = readFileSync(inputHtmlPath, 'utf8');

  html = removeStylesheetNoscriptFallback(html);

  const { html: htmlWithStyles, stylesheetCount } = inlineStylesheets(html);
  html = htmlWithStyles;

  const { html: htmlWithScripts, scriptCount } = inlineScripts(html);
  html = htmlWithScripts;

  assertNoRemainingLocalAssetRefs(html);
  assertRequiredFeatureSubstrings(html);

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, html, 'utf8');

  const { size } = statSync(outputPath);
  console.log(`Wrote ${outputPath} (${size} bytes)`);
  console.log(
    `inlined ${scriptCount} script(s), ${stylesheetCount} stylesheet(s); all assertions passed`,
  );
}

main();
