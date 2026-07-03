import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EzoicAdComponent } from '@ezoic/angular-sdk';
import { EventLogService } from './event-log.service';

/**
 * "Zero-config placement" scenario. A semantic `location` name resolves to a
 * reserved 900-range placeholder id at runtime, with no numeric id chosen by
 * the publisher.
 */
@Component({
  selector: 'app-zero-config',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EzoicAdComponent],
  template: `
    <h1>Zero-config placement</h1>
    <p>
      Instead of choosing a numeric id, you name a semantic <code>location</code> and the SDK
      resolves it to a reserved 900-range placeholder id at runtime. The publisher never picks the
      id.
    </p>

    <ezoic-ad location="under_first_paragraph" required [sizes]="['300x250']" />

    <p>
      Sizes are still required because zero-config placements carry no dashboard-configured sizing,
      and location placements default to <code>required: true</code>. Today the SDK resolves the
      name via <code>ezstandalone.GetGeneratedIdAsync</code> (falling back to an internal
      id-to-location map); it does not yet use the newer id-less <code>showAds</code> primitive, so
      this is a "zero-config placement", not an id-less integration.
    </p>
  `,
})
export class ZeroConfigComponent {
  private readonly eventLog = inject(EventLogService);

  constructor() {
    this.eventLog.add(
      'Zero-config scenario mounted: <ezoic-ad location="under_first_paragraph" required sizes=[300x250]>',
    );
  }
}
