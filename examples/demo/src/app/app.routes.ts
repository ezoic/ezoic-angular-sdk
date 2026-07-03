import { Routes } from '@angular/router';
import { ArticleComponent } from './article.component';
import { HomeComponent } from './home.component';

/**
 * Two-route demo. Each route mounts a different set of `<ezoic-ad>` placements
 * so navigating between them exercises the SPA teardown/request flow enabled by
 * `withRouterRefresh()`.
 */
export const routes: Routes = [
  { path: '', component: HomeComponent, title: 'Home — Ezoic Angular SDK Demo' },
  { path: 'article', component: ArticleComponent, title: 'Article — Ezoic Angular SDK Demo' },
  { path: '**', redirectTo: '' },
];
