#!/usr/bin/env node
/**
 * Regenerates the public Angular SDK example pages in the examples.ezoic.com
 * repo from this repo's compiled scenario bundles.
 *
 * This is the "regression duty" for roadmap item 11: whenever this SDK's core
 * behavior changes, rebuild the scenario bundles (`npm run build:site-demos:single`)
 * and re-run this script so `examples.ezoic.com/site/angular-sdk/*.html` reflect
 * the current compiled integration rather than drifting stale.
 *
 * For each scenario it reads the compiled single-file page at
 * `dist/site-demos/<slug>.html`, extracts the inlined <style>/<script> assets
 * and the app body, and wraps them in the examples.ezoic.com house-style page
 * template. It also writes a group landing page. It never touches the target
 * repo's top-level `site/index.html` — that one landing-page link is added by
 * hand (the final message reminds the operator).
 *
 * Usage:
 *   node examples/site-demos/publish-to-examples-site.mjs [targetRepoPath]
 * targetRepoPath defaults to ../examples.ezoic.com (sibling directory).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..', '..');
const distDir = join(repoRoot, 'dist', 'site-demos');

const targetRepo = resolve(repoRoot, process.argv[2] ?? '../examples.ezoic.com');
const outDir = join(targetRepo, 'site', 'angular-sdk');

/** Minimum plausible byte count for extracted app body; smaller means broken. */
const MIN_BODY_BYTES = 1000;

/** SDK version stamped into each generated page, read at run time. */
const sdkVersion = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')).version;

/**
 * Per-scenario content for the house page template. `snippet` is the real
 * TypeScript/HTML excerpt from the component; it is HTML-escaped before display.
 */
const SCENARIOS = [
  {
    slug: 'basic',
    title: 'Basic display placement — Ezoic Angular SDK examples',
    description:
      'A compiled Angular integration of @ezoic/angular-sdk: one explicit-id <ezoic-ad> display placement between two paragraphs.',
    explainerHeading: 'What this demonstrates',
    explainerBody:
      'A real, compiled Angular app using <code>@ezoic/angular-sdk</code>. A single ' +
      '<code>&lt;ezoic-ad&gt;</code> component with an explicit placeholder id renders the bare ' +
      'placeholder div the Ezoic runtime scans for and requests the ad as the component mounts — ' +
      'no manual command queue. This is the canonical display integration.',
    snippet:
      '// app.config.ts — bootstrap the SDK once\n' +
      'provideEzoic({}, withRouterRefresh(), withRewardedAds({ loaderUrl: REWARDED_LOADER_URL }))\n' +
      '\n' +
      '<!-- display.component.ts template — one explicit-id placement -->\n' +
      '<ezoic-ad [id]="113" [required]="true" [sizes]="[\'728x90\', \'320x50\']" />',
  },
  {
    slug: 'zero-config',
    title: 'Zero-config placement — Ezoic Angular SDK examples',
    description:
      'A compiled Angular integration of @ezoic/angular-sdk: a semantic location name resolved to a reserved 900-range placeholder id at runtime.',
    explainerHeading: 'What this demonstrates',
    explainerBody:
      'Instead of a numeric id, the <code>&lt;ezoic-ad&gt;</code> component names a semantic ' +
      '<code>location</code> and the SDK resolves it to a reserved 900-range placeholder id at ' +
      'runtime. Sizes are still required because zero-config placements carry no ' +
      'dashboard-configured sizing, and location placements default to <code>required: true</code>. ' +
      'Today the SDK resolves the name via <code>ezstandalone.GetGeneratedIdAsync</code> (falling ' +
      'back to an internal id-to-location map); it does not yet use the newer id-less ' +
      '<code>showAds</code> primitive, so this is a zero-config placement, not an id-less integration.',
    snippet:
      '<!-- zero-config.component.ts template -->\n' +
      '<ezoic-ad location="under_first_paragraph" required [sizes]="[\'300x250\']" />',
  },
  {
    slug: 'spa',
    title: 'SPA navigation — Ezoic Angular SDK examples',
    description:
      'A compiled Angular integration of @ezoic/angular-sdk: two routed pages whose placements refresh on navigation via withRouterRefresh().',
    explainerHeading: 'What this demonstrates',
    explainerBody:
      'Two routed pages each mount a different explicit placeholder id. Because ' +
      '<code>withRouterRefresh()</code> is enabled, navigating between them tears down the ' +
      "departing page's placement and requests the arriving page's fresh — the flow a real " +
      'single-page app relies on to refresh ads on route changes, with no full page reload.',
    snippet:
      '// app.routes.ts — two pages, two ids\n' +
      "{ path: 'spa-a', component: SpaAComponent },\n" +
      "{ path: 'spa-b', component: SpaBComponent },\n" +
      '\n' +
      '// app.config.ts — refresh ads on router navigation\n' +
      'provideEzoic({}, withRouterRefresh())\n' +
      '\n' +
      '<!-- spa-a mounts [id]=102, spa-b mounts [id]=103 -->\n' +
      '<ezoic-ad [id]="102" />',
  },
  {
    slug: 'dynamic',
    title: 'Dynamic content — Ezoic Angular SDK examples',
    description:
      'A compiled Angular integration of @ezoic/angular-sdk: placements that mount after initial load when content is added.',
    explainerHeading: 'What this demonstrates',
    explainerBody:
      'Placements do not have to exist at first paint. A local signal gates two extra ' +
      '<code>&lt;ezoic-ad&gt;</code> placements that mount after the reader clicks "Load more ' +
      'content"; the SDK requests the newly mounted placeholders in a batched follow-up call — the ' +
      'same pattern as loading a comment thread or an infinite-scroll section.',
    snippet:
      '// dynamic.component.ts — a local signal gates the extra placements\n' +
      'protected readonly showMore = signal(false);\n' +
      '\n' +
      '<!-- template -->\n' +
      '@if (showMore()) {\n' +
      '  <ezoic-ad [id]="104" />\n' +
      '  <ezoic-ad [id]="105" />\n' +
      '}',
  },
  {
    slug: 'rewarded',
    title: 'Rewarded ads — Ezoic Angular SDK examples',
    description:
      'A compiled Angular integration of @ezoic/angular-sdk: the imperative EzoicRewardedService driving request/show/requestAndShow.',
    explainerHeading: 'What this demonstrates',
    explainerBody:
      'Rewarded ads are imperative. The injected <code>EzoicRewardedService</code> exposes ' +
      '<code>request</code>, <code>show</code> and <code>requestAndShow</code>, each returning a ' +
      "Promise that resolves with the runtime's outcome. Each button logs the resolved " +
      '<code>status</code>/<code>reward</code>/message. Calls resolve to a non-granting fallback ' +
      'until the site-specific rewarded loader is live.',
    snippet:
      '// rewarded.component.ts — inject the service, await the outcome\n' +
      'private readonly rewarded = inject(EzoicRewardedService);\n' +
      '\n' +
      "const outcome = await this.rewarded.requestAndShow({ rewardName: 'demo-reward' });",
  },
  {
    slug: 'video',
    title: 'Video — Ezoic Angular SDK examples',
    description:
      'A compiled Angular integration of @ezoic/angular-sdk: an Open Video inline embed and an Ezoic video placeholder.',
    explainerHeading: 'What this demonstrates',
    explainerBody:
      'The SDK offers two video surfaces. <code>&lt;ezoic-video-embed&gt;</code> injects the Open ' +
      'Video script and mounts a floating, autoplaying player into its own host element; ' +
      '<code>&lt;ezoic-video&gt;</code> emits a bare div the Ezoic video runtime discovers and ' +
      'fills, with a publisher-chosen div id.',
    snippet:
      '<!-- video.component.ts template -->\n' +
      '<ezoic-video-embed videoId="demo-video-id" playlist="demo-playlist" float autoplay />\n' +
      '<ezoic-video divId="demo-video-slot-1" />',
  },
];

/** HTML-escapes text for safe display inside markup and <pre><code>. */
function htmlEscape(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Extracts the inlined <style> and <script> tags from the compiled page's
 * <head>. These carry the app's CSS (and any head scripts) that must move into
 * the wrapper page's head so the widget renders correctly.
 */
function extractHeadAssets(html) {
  const headMatch = /<head[^>]*>([\s\S]*?)<\/head>/i.exec(html);
  if (!headMatch) {
    throw new Error('publish: could not find <head> in compiled page.');
  }
  const headInner = headMatch[1];
  const tags = headInner.match(/<style\b[\s\S]*?<\/style>|<script\b[\s\S]*?<\/script>/gi) ?? [];
  const assets = tags.join('\n');
  if (assets.trim().length === 0) {
    throw new Error('publish: extracted no <style>/<script> assets from compiled page <head>.');
  }
  return assets;
}

/**
 * Extracts the full <body> inner content of the compiled page: the hash-preset
 * script, <app-root>, and the inlined module script. Fails loudly on empty or
 * suspiciously small content rather than writing a broken page.
 */
function extractBodyInner(html) {
  const bodyMatch = /<body[^>]*>([\s\S]*?)<\/body>/i.exec(html);
  if (!bodyMatch) {
    throw new Error('publish: could not find <body> in compiled page.');
  }
  const bodyInner = bodyMatch[1];
  const byteLength = Buffer.byteLength(bodyInner, 'utf8');
  if (byteLength < MIN_BODY_BYTES) {
    throw new Error(
      `publish: extracted body is only ${byteLength} bytes (< ${MIN_BODY_BYTES}); refusing to write a broken page.`,
    );
  }
  return bodyInner;
}

/** The shared site navigation with the new Angular SDK entry added. */
function siteNav() {
  return `    <nav class="site-nav">
      <a href="/idless/">Id-less showAds</a>
      <a href="/placeholders/">Placement IDs</a>
      <a href="/game-sdk/">Web Game SDK</a>
      <a href="/angular-sdk/">Angular SDK</a>
      <a href="https://docs.ezoic.com">Docs</a>
      <a href="https://github.com/ezoic/examples.ezoic.com">GitHub</a>
    </nav>`;
}

/** Builds a single scenario page. */
function renderScenarioPage(scenario, headAssets, bodyInner) {
  const examplesSource = `https://github.com/ezoic/examples.ezoic.com/blob/master/site/angular-sdk/${scenario.slug}.html`;
  const sdkSource = 'https://github.com/ezoic/ezoic-angular-sdk/tree/master/examples/site-demos';
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${htmlEscape(scenario.title)}</title>
<meta name="description" content="${htmlEscape(scenario.description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Reddit+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/assets/site.css">
${headAssets}
</head>
<body>
<!-- Built from @ezoic/angular-sdk v${sdkVersion} (examples/site-demos) -->
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/">Ezoic <span>Examples</span></a>
${siteNav()}
  </div>
</header>

<main class="wrap prose article">
  <div class="explainer">
    <h2>${htmlEscape(scenario.explainerHeading)}</h2>
    <div class="explainer-body">${scenario.explainerBody}</div>
  </div>

  <div class="snippet-label">Integration used on this page</div>
  <pre class="snippet"><code>${htmlEscape(scenario.snippet)}</code></pre>

  <p class="source-row"><a class="source-link" href="${examplesSource}">View source on GitHub &rarr;</a></p>
  <p class="source-row">SDK example source: <a class="source-link" href="${sdkSource}">@ezoic/angular-sdk (examples/site-demos) &rarr;</a></p>

  <article>
${bodyInner}
  </article>
</main>

<script src="/assets/site.js"></script>
</body>
</html>
`;
}

/** Builds the group landing page (hero + card grid + footer). */
function renderLandingPage() {
  const cards = SCENARIOS.map((s) => {
    const label = LANDING_CARDS[s.slug];
    return `      <a class="card" href="/angular-sdk/${s.slug}">
        <span class="tag">${label.tag}</span>
        <h3>${label.heading}</h3>
        <p>${label.body}</p>
        <span class="card-cta">Open the example &rarr;</span>
      </a>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Angular SDK examples — @ezoic/angular-sdk | Ezoic Examples</title>
<meta name="description" content="Compiled Angular integrations of @ezoic/angular-sdk: basic display, zero-config placement, SPA navigation, dynamic content, rewarded ads and video.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Reddit+Mono:wght@400;500&display=swap">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<!-- Built from @ezoic/angular-sdk v${sdkVersion} (examples/site-demos) -->
<header class="site-header">
  <div class="wrap">
    <a class="brand" href="/">Ezoic <span>Examples</span></a>
${siteNav()}
  </div>
</header>

<main class="wrap">
  <section class="hero">
    <p class="eyebrow">Ezoic Examples</p>
    <h1>Angular SDK examples — <span class="accent">@ezoic/angular-sdk</span></h1>
    <p>Six real, compiled Angular integrations of the official <code>@ezoic/angular-sdk</code>. Each
    page embeds an actual built Angular bundle — not hand-written vanilla JS — so you can read the
    exact component code a publisher would ship.</p>
  </section>

  <section class="section">
    <h2 class="section-title">Scenarios</h2>
    <div class="card-grid">
${cards}
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="wrap">
    <span>Ezoic Examples</span>
    <nav>
      <a href="https://docs.ezoic.com">docs.ezoic.com</a>
      <a href="https://www.ezoic.com">www.ezoic.com</a>
    </nav>
  </div>
</footer>
</body>
</html>
`;
}

/** Card copy for the landing page, keyed by slug. */
const LANDING_CARDS = {
  basic: {
    tag: 'display',
    heading: 'Basic display',
    body: 'One explicit-id <code>&lt;ezoic-ad&gt;</code> display placement dropped between two paragraphs.',
  },
  'zero-config': {
    tag: 'zero-config',
    heading: 'Zero-config placement',
    body: 'A semantic <code>location</code> name resolved to a reserved 900-range placeholder id at runtime.',
  },
  spa: {
    tag: 'routing',
    heading: 'SPA navigation',
    body: 'Two routed pages whose placements refresh on navigation via <code>withRouterRefresh()</code>.',
  },
  dynamic: {
    tag: 'dynamic',
    heading: 'Dynamic content',
    body: 'Placements that mount after initial load when the reader loads more content.',
  },
  rewarded: {
    tag: 'rewarded',
    heading: 'Rewarded ads',
    body: 'The imperative <code>EzoicRewardedService</code> driving request, show and requestAndShow.',
  },
  video: {
    tag: 'video',
    heading: 'Video',
    body: 'An Open Video inline embed and an Ezoic video placeholder.',
  },
};

function main() {
  mkdirSync(outDir, { recursive: true });

  let written = 0;
  for (const scenario of SCENARIOS) {
    const compiledPath = join(distDir, `${scenario.slug}.html`);
    let compiled;
    try {
      compiled = readFileSync(compiledPath, 'utf8');
    } catch {
      throw new Error(
        `publish: compiled page not found at ${compiledPath}. ` +
          'Run "npm run build:site-demos:single" first.',
      );
    }

    const headAssets = extractHeadAssets(compiled);
    const bodyInner = extractBodyInner(compiled);
    const page = renderScenarioPage(scenario, headAssets, bodyInner);

    const outPath = join(outDir, `${scenario.slug}.html`);
    writeFileSync(outPath, page, 'utf8');
    written += 1;
    console.log(`Wrote ${outPath} (${Buffer.byteLength(page, 'utf8')} bytes)`);
  }

  const landing = renderLandingPage();
  const landingPath = join(outDir, 'index.html');
  writeFileSync(landingPath, landing, 'utf8');
  written += 1;
  console.log(`Wrote ${landingPath} (${Buffer.byteLength(landing, 'utf8')} bytes)`);

  console.log(`\nDone: ${written} file(s) written under ${outDir}`);
  console.log(
    '\nReminder: this script does NOT edit the site-wide landing page. Add ONE card linking to ' +
      '/angular-sdk/ to the card-grid in site/index.html by hand.',
  );
}

main();
