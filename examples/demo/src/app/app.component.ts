import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { EZOIC_SDK_VERSION, EzoicRewardedService, EzoicService } from '@ezoic/angular-sdk';
import { ConsentPanelComponent } from './consent-panel.component';
import { DemoStateService } from './demo-state.service';
import { EventLogPanelComponent } from './event-log-panel.component';
import { EventLogService } from './event-log.service';
import { ServicePlaygroundComponent } from './service-playground.component';

/**
 * Demo shell. Hosts the router nav, the primary control buttons (load-more,
 * simulate-navigation, show-rewarded), the SDK ready/status line, the consent
 * panel, the imperative service playground, the router outlet and the event
 * log. Ready-state and rewarded-status changes are mirrored into the event log
 * via effects.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ConsentPanelComponent,
    EventLogPanelComponent,
    ServicePlaygroundComponent,
  ],
  template: `
    <div class="app-shell">
      <header class="app-header">
        <nav class="app-nav">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }"
            >Home</a
          >
          <a routerLink="/article" routerLinkActive="active">Article</a>
        </nav>
        <span class="status-line">
          sdk v{{ sdkVersion }} · ready: {{ ezoic.ready() }} · browser: {{ ezoic.isBrowser }} ·
          rewarded: {{ rewarded.status() }}
        </span>
      </header>

      <div class="controls">
        <button type="button" (click)="toggleMoreAds()">
          {{ demoState.showMoreAds() ? 'Hide extra ads' : 'Load more ads' }}
        </button>
        <button type="button" (click)="simulateNavigation()">Simulate SPA navigation</button>
        <button type="button" (click)="showRewardedAd()">Show rewarded ad</button>
      </div>

      <router-outlet />

      <app-service-playground />
      <app-consent-panel />
      <app-event-log-panel />
    </div>
  `,
})
export class AppComponent {
  protected readonly ezoic = inject(EzoicService);
  protected readonly rewarded = inject(EzoicRewardedService);
  protected readonly demoState = inject(DemoStateService);
  protected readonly sdkVersion = EZOIC_SDK_VERSION;
  private readonly router = inject(Router);
  private readonly eventLog = inject(EventLogService);

  constructor() {
    effect(() => {
      this.eventLog.add(`EzoicService.ready() = ${this.ezoic.ready()}`);
    });
    effect(() => {
      this.eventLog.add(`Rewarded runtime status = ${this.rewarded.status()}`);
    });
  }

  /** Flips the shared dynamic-content signal that Home reads to mount extra ads. */
  protected toggleMoreAds(): void {
    const shown = this.demoState.toggleMoreAds();
    this.eventLog.add(`Load-more toggled: extra incontent ads ${shown ? 'shown' : 'hidden'}`);
  }

  /** Programmatically navigates between Home and Article to drive SPA ad refresh. */
  protected async simulateNavigation(): Promise<void> {
    const target = this.router.url.startsWith('/article') ? '/' : '/article';
    this.eventLog.add(`Programmatic SPA navigation → ${target}`);
    await this.router.navigateByUrl(target);
  }

  /** Requests and shows a rewarded ad, logging the resolved outcome. */
  protected async showRewardedAd(): Promise<void> {
    this.eventLog.add('Rewarded requestAndShow() invoked');
    const outcome = await this.rewarded.requestAndShow({ rewardName: 'demo-reward' });
    this.eventLog.add(
      `Rewarded outcome: status=${outcome.status} reward=${outcome.reward} msg="${outcome.msg}"`,
    );
  }
}
