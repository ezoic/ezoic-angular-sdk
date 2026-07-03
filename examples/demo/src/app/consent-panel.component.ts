import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EzoicConsentService } from '@ezoic/angular-sdk';

/**
 * Renders live IAB TCF consent state exposed by {@link EzoicConsentService} as
 * signals. The TC string is truncated because the full encoded value is long.
 */
@Component({
  selector: 'app-consent-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel">
      <h2>Consent state (EzoicConsentService)</h2>
      <dl class="kv">
        <dt>isBrowser</dt>
        <dd>{{ consent.isBrowser }}</dd>
        <dt>ready</dt>
        <dd>{{ consent.ready() }}</dd>
        <dt>gdprApplies</dt>
        <dd>{{ consent.gdprApplies() ?? '—' }}</dd>
        <dt>eventStatus</dt>
        <dd>{{ consent.eventStatus() ?? '—' }}</dd>
        <dt>tcString</dt>
        <dd>{{ tcPreview() }}</dd>
      </dl>
    </section>
  `,
})
export class ConsentPanelComponent {
  protected readonly consent = inject(EzoicConsentService);

  /** Truncated TC string suitable for display. */
  protected readonly tcPreview = computed(() => {
    const tc = this.consent.tcString();
    if (!tc) {
      return '—';
    }
    return tc.length > 24 ? `${tc.slice(0, 24)}…` : tc;
  });
}
