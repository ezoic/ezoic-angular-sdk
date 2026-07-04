import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { EzoicAdComponent } from '@ezoic/angular-sdk';
import { EventLogService } from './event-log.service';

/**
 * "Dynamic content" scenario. A local signal gates two extra placements that
 * mount after initial load when the reader clicks "Load more content"; the SDK
 * batches the follow-up request for the newly mounted placeholders.
 */
@Component({
  selector: 'app-dynamic',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EzoicAdComponent],
  template: `
    <h1>Dynamic content</h1>
    <p>
      Placements do not have to exist at first paint. Click the button to append more content: the
      two placements below mount after initial load, and the SDK requests them in a batched
      follow-up call — the same pattern as loading a comment thread or an infinite-scroll section.
    </p>

    <div class="controls">
      <button type="button" (click)="toggle()">
        {{ showMore() ? 'Hide extra content' : 'Load more content' }}
      </button>
    </div>

    @if (showMore()) {
      <h2>Dynamically added placements</h2>
      <p>These incontent placements mounted after the button click.</p>
      <ezoic-ad [id]="915" [required]="true" [sizes]="['300x250', '336x280']" />
      <ezoic-ad [id]="916" [required]="true" [sizes]="['300x250']" />
    }
  `,
})
export class DynamicComponent {
  private readonly eventLog = inject(EventLogService);

  /** Whether the extra placements are currently mounted. */
  protected readonly showMore = signal(false);

  constructor() {
    this.eventLog.add('Dynamic scenario mounted: extra placements 915/916 hidden until toggled');
  }

  /** Toggles the dynamic placements and logs the transition. */
  protected toggle(): void {
    const shown = !this.showMore();
    this.showMore.set(shown);
    this.eventLog.add(
      `Load-more toggled: extra placements 915/916 ${shown ? 'mounted' : 'removed'}`,
    );
  }
}
