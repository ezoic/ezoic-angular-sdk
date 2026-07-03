import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EventLogService } from './event-log.service';

/** Persistent panel rendering the demo event log, newest entries first. */
@Component({
  selector: 'app-event-log-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel log">
      <h2>Event log</h2>
      @if (eventLog.log().length === 0) {
        <p class="muted">No events yet.</p>
      } @else {
        <ol>
          @for (entry of eventLog.log(); track $index) {
            <li>{{ entry }}</li>
          }
        </ol>
      }
    </section>
  `,
})
export class EventLogPanelComponent {
  protected readonly eventLog = inject(EventLogService);
}
