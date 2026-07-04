import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EzoicAdComponent } from '@ezoic/angular-sdk';
import { EventLogService } from './event-log.service';

/**
 * "SPA navigation" scenario, page A. Mounts explicit id 922 and links to page B.
 * Navigating between the two pages exercises the router-refresh teardown/request
 * flow enabled by `withRouterRefresh()`.
 */
@Component({
  selector: 'app-spa-a',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EzoicAdComponent, RouterLink],
  template: `
    <h1>SPA navigation — page A</h1>
    <p>
      This page mounts explicit placeholder id 922. Follow the link below to page B: because
      <code>withRouterRefresh()</code> is enabled, navigating tears down this page's placement and
      requests page B's fresh — no full page reload.
    </p>

    <ezoic-ad [id]="922" [required]="true" [sizes]="['300x250', '336x280']" />

    <p><a routerLink="/spa-b">Go to page B &rarr;</a></p>
  `,
})
export class SpaAComponent {
  private readonly eventLog = inject(EventLogService);

  constructor() {
    this.eventLog.add(
      'SPA scenario page A mounted: <ezoic-ad [id]="922" required sizes=[300x250,336x280]>',
    );
  }
}
