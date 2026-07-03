import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EzoicRewardedService, EzoicService } from '@ezoic/angular-sdk';
import { EventLogService } from './event-log.service';

/**
 * Imperative playground that exercises the remaining {@link EzoicService} and
 * {@link EzoicRewardedService} members not already driven by the declarative
 * components. Every button calls the real SDK and logs the outcome to the event
 * log. All calls are SSR-safe no-ops until the Ezoic runtime loads, so they are
 * safe to invoke at any time.
 */
@Component({
  selector: 'app-service-playground',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel">
      <h2>Service playground</h2>
      <div class="controls">
        <button type="button" (click)="runPrivacyControls()">Privacy controls</button>
        <button type="button" (click)="runFormatToggles()">Format toggles</button>
        <button type="button" (click)="readFormatGetters()">Read format getters</button>
        <button type="button" (click)="resolveLocation()">Resolve location id</button>
        <button type="button" (click)="checkEzoicUser()">Check Ezoic user</button>
        <button type="button" (click)="runDisplayPassthroughs()">Display passthroughs</button>
        <button type="button" (click)="runVideoPassthroughs()">Video passthroughs</button>
        <button type="button" (click)="initRewardedPlacements()">Init rewarded placements</button>
        <button type="button" (click)="requestRewarded()">Rewarded: request</button>
        <button type="button" (click)="showRewarded()">Rewarded: show</button>
        <button type="button" (click)="overlayRewarded()">Rewarded: overlay</button>
        <button type="button" (click)="contentLockerRewarded()">Rewarded: content locker</button>
        <button type="button" (click)="teardownAds()">Teardown placements</button>
        <button type="button" (click)="destroyEverything()">Destroy all</button>
      </div>
    </section>
  `,
})
export class ServicePlaygroundComponent {
  private readonly ezoic = inject(EzoicService);
  private readonly rewarded = inject(EzoicRewardedService);
  private readonly eventLog = inject(EventLogService);

  /** Signals CMP presence and opts the visitor out of personalization. */
  protected runPrivacyControls(): void {
    this.ezoic.enableConsent();
    this.ezoic.setDisablePersonalizedAds(true);
    this.ezoic.setDisablePersonalizedStatistics(true);
    this.eventLog.add('Privacy: enableConsent + disable personalized ads/statistics');
  }

  /** Applies the write-only format/config setters (anchor, interstitial, config, SPA, outstream). */
  protected async runFormatToggles(): Promise<void> {
    this.ezoic.setEzoicAnchorAd(true);
    this.ezoic.setInterstitialAllowed(true, { closeButtonDelay: 5 });
    this.ezoic.setIsSinglePageApplication(true);
    this.ezoic.setAutoRefresh(true);
    this.ezoic.config({ reservePlaceholderSpace: true, anchorAdPosition: 'bottom' });
    const outstream = await this.ezoic.setOutstreamAllowed(true);
    this.eventLog.add(`Format toggles applied; setOutstreamAllowed → ${outstream}`);
  }

  /** Reads the promise-returning format getters and logs their resolved values. */
  protected async readFormatGetters(): Promise<void> {
    const [anchorClosed, interstitial, outstream] = await Promise.all([
      this.ezoic.hasAnchorAdBeenClosed(),
      this.ezoic.isInterstitialAllowed(),
      this.ezoic.isOutstreamAllowed(),
    ]);
    this.eventLog.add(
      `Getters: anchorClosed=${anchorClosed} interstitial=${interstitial} outstream=${outstream}`,
    );
  }

  /** Resolves a semantic location name to a placeholder id. */
  protected async resolveLocation(): Promise<void> {
    const id = await this.ezoic.resolveLocationId('under_first_paragraph');
    this.eventLog.add(`resolveLocationId('under_first_paragraph') → ${id}`);
  }

  /** Reports whether the visitor is in the Ezoic A/B group (callback based). */
  protected checkEzoicUser(): void {
    this.ezoic.isEzoicUser((isUser) => {
      this.eventLog.add(`isEzoicUser callback → ${isUser}`);
    }, 100);
  }

  /** Exercises the imperative display command queue and header-bidding refresh. */
  protected runDisplayPassthroughs(): void {
    this.ezoic.push(() => this.eventLog.add('Custom ezstandalone.cmd command ran'));
    this.ezoic.showAds({ id: 105, required: false, sizes: ['300x250'] });
    this.ezoic.displayMore(106);
    this.ezoic.refreshAds(101);
    this.eventLog.add('Display: push + showAds(105) + displayMore(106) + refreshAds(101)');
  }

  /** Registers and loads an extra video placeholder imperatively. */
  protected runVideoPassthroughs(): void {
    this.ezoic.defineVideo('demo-video-slot-2');
    this.ezoic.displayMoreVideo('demo-video-slot-2');
    this.eventLog.add('Video: defineVideo + displayMoreVideo(demo-video-slot-2)');
  }

  /** Configures which site-wide rewarded placements are enabled. */
  protected initRewardedPlacements(): void {
    this.ezoic.initRewardedAds({ anchor: true, interstitial: true, video: true, sideRails: true });
    this.eventLog.add('initRewardedAds() with all placements enabled');
  }

  /** Requests a rewarded ad without showing it. */
  protected async requestRewarded(): Promise<void> {
    const outcome = await this.rewarded.request({ minCPM: 1 });
    this.eventLog.add(`Rewarded request → status=${outcome.status} msg="${outcome.msg}"`);
  }

  /** Shows a previously requested rewarded ad. */
  protected async showRewarded(): Promise<void> {
    const outcome = await this.rewarded.show({ rewardName: 'demo-show' });
    this.eventLog.add(`Rewarded show → status=${outcome.status} reward=${outcome.reward}`);
  }

  /** Requests a rewarded ad behind a confirmation overlay. */
  protected async overlayRewarded(): Promise<void> {
    const outcome = await this.rewarded.requestWithOverlay(
      {
        header: 'Watch an ad',
        body: ['Unlock demo content by watching a short ad.'],
        accept: 'Watch',
        cancel: 'No thanks',
      },
      { lockScroll: true },
    );
    this.eventLog.add(`Rewarded overlay → status=${outcome.status} reward=${outcome.reward}`);
  }

  /** Locks content behind a rewarded ad, running a callback once granted. */
  protected async contentLockerRewarded(): Promise<void> {
    const outcome = await this.rewarded.contentLocker(
      () => this.eventLog.add('Content-locker reward-granted callback ran'),
      { rewardName: 'demo-locker' },
    );
    this.eventLog.add(`Content locker → status=${outcome.status} msg="${outcome.msg}"`);
  }

  /** Tears down the imperatively created display/video placeholders. */
  protected teardownAds(): void {
    this.ezoic.destroyPlaceholders(105, 106);
    this.ezoic.destroyVideoPlaceholders('demo-video-slot-2');
    this.ezoic.newPage();
    this.eventLog.add(
      'Teardown: destroyPlaceholders(105,106) + destroyVideoPlaceholders + newPage',
    );
  }

  /** Tears down every selected placeholder plus anchor, side rails and outstream. */
  protected destroyEverything(): void {
    this.ezoic.destroyAll();
    this.eventLog.add('destroyAll() invoked');
  }
}
