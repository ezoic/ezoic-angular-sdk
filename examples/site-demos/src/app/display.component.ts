import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EzoicAdComponent } from '@ezoic/angular-sdk';
import { EventLogService } from './event-log.service';

/**
 * "Basic display" scenario. Shows the canonical explicit-id pairing: an ordinary
 * article with one `<ezoic-ad [id]="910">` placement between two paragraphs.
 */
@Component({
  selector: 'app-display',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EzoicAdComponent],
  template: `
    <h1>Basic display placement</h1>
    <p>
      A display placement is one Angular component, <code>&lt;ezoic-ad&gt;</code>, dropped into your
      template. It renders the bare placeholder div the Ezoic runtime scans for and requests the ad
      as the component mounts — no manual command queue, no lifecycle wiring.
    </p>

    <ezoic-ad [id]="910" [required]="true" [sizes]="['728x90', '320x50']" />

    <p>
      Generated ids carry no dashboard sizing, so <code>[sizes]</code> and <code>[required]</code>
      are passed explicitly — the canonical pairing.
    </p>
  `,
})
export class DisplayComponent {
  private readonly eventLog = inject(EventLogService);

  constructor() {
    this.eventLog.add(
      'Display scenario mounted: <ezoic-ad [id]="910" required sizes=[728x90,320x50]>',
    );
  }
}
