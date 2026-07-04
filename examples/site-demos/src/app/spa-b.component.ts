import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EzoicAdComponent } from '@ezoic/angular-sdk';
import { EventLogService } from './event-log.service';

/**
 * "SPA navigation" scenario, page B. Mounts a different explicit id (923) than
 * page A so navigating between them exercises the router-refresh
 * teardown/request flow enabled by `withRouterRefresh()`.
 */
@Component({
  selector: 'app-spa-b',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EzoicAdComponent, RouterLink],
  template: `
    <h1>SPA navigation — page B</h1>
    <p>
      This page mounts explicit placeholder id 923 — a different id than page A. Navigating back
      tears down this placement and re-requests page A's via <code>withRouterRefresh()</code>, the
      same flow a real single-page app relies on to refresh ads on route changes.
    </p>

    <ezoic-ad [id]="923" />

    <p><a routerLink="/spa-a">&larr; Back to page A</a></p>
  `,
})
export class SpaBComponent {
  private readonly eventLog = inject(EventLogService);

  constructor() {
    this.eventLog.add('SPA scenario page B mounted: <ezoic-ad [id]="923">');
  }
}
