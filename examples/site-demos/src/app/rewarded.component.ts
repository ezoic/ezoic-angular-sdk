import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EzoicRewardedService } from '@ezoic/angular-sdk';
import { EventLogService } from './event-log.service';

/**
 * "Rewarded ads" scenario. Buttons drive the callback-based
 * `EzoicRewardedService` and log each resolved outcome. Every call resolves to
 * a non-granting fallback outcome until the site-specific rewarded loader is
 * live, so the buttons are safe to click on this placeholder-loader page.
 */
@Component({
  selector: 'app-rewarded',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1>Rewarded ads</h1>
    <p>
      Rewarded ads are imperative: a service exposes <code>request</code>, <code>show</code> and
      <code>requestAndShow</code>, each returning a Promise that resolves with the runtime's
      outcome. Click a button and watch the resolved <code>status</code>/<code>reward</code>/message
      in the event log below.
    </p>

    <div class="controls">
      <button type="button" (click)="request()">Request</button>
      <button type="button" (click)="show()">Show</button>
      <button type="button" (click)="requestAndShow()">Request and show</button>
    </div>
  `,
})
export class RewardedComponent {
  private readonly rewarded = inject(EzoicRewardedService);
  private readonly eventLog = inject(EventLogService);

  constructor() {
    this.eventLog.add('Rewarded scenario mounted: EzoicRewardedService ready for request/show');
  }

  /** Requests a rewarded ad without showing it. */
  protected async request(): Promise<void> {
    const outcome = await this.rewarded.request({ minCPM: 1 });
    this.eventLog.add(`Rewarded request → status=${outcome.status} msg="${outcome.msg}"`);
  }

  /** Shows a previously requested rewarded ad. */
  protected async show(): Promise<void> {
    const outcome = await this.rewarded.show({ rewardName: 'demo-show' });
    this.eventLog.add(
      `Rewarded show → status=${outcome.status} reward=${outcome.reward} msg="${outcome.msg}"`,
    );
  }

  /** Requests and, if available, shows a rewarded ad in one call. */
  protected async requestAndShow(): Promise<void> {
    const outcome = await this.rewarded.requestAndShow({ rewardName: 'demo-reward' });
    this.eventLog.add(
      `Rewarded requestAndShow → status=${outcome.status} reward=${outcome.reward} msg="${outcome.msg}"`,
    );
  }
}
