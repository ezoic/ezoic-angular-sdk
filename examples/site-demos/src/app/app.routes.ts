import { Routes } from '@angular/router';
import { DisplayComponent } from './display.component';
import { DynamicComponent } from './dynamic.component';
import { RewardedComponent } from './rewarded.component';
import { SpaAComponent } from './spa-a.component';
import { SpaBComponent } from './spa-b.component';
import { VideoComponent } from './video.component';
import { ZeroConfigComponent } from './zero-config.component';

/**
 * One route per scenario. Each compiled scenario page is served standalone in
 * the public site and presets its own initial hash before Angular bootstraps,
 * so a single built bundle covers every route.
 */
export const routes: Routes = [
  { path: 'display', component: DisplayComponent, title: 'Basic display — Ezoic Angular SDK' },
  {
    path: 'zero-config',
    component: ZeroConfigComponent,
    title: 'Zero-config placement — Ezoic Angular SDK',
  },
  { path: 'spa-a', component: SpaAComponent, title: 'SPA navigation (A) — Ezoic Angular SDK' },
  { path: 'spa-b', component: SpaBComponent, title: 'SPA navigation (B) — Ezoic Angular SDK' },
  { path: 'dynamic', component: DynamicComponent, title: 'Dynamic content — Ezoic Angular SDK' },
  { path: 'rewarded', component: RewardedComponent, title: 'Rewarded ads — Ezoic Angular SDK' },
  { path: 'video', component: VideoComponent, title: 'Video — Ezoic Angular SDK' },
  { path: '', redirectTo: 'display', pathMatch: 'full' },
  { path: '**', redirectTo: 'display' },
];
