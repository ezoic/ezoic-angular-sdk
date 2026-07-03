import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EzoicService } from '@ezoic/angular-sdk';
import { EventLogPanelComponent } from './event-log-panel.component';
import { EventLogService } from './event-log.service';

/**
 * Minimal shell for a single-scenario embed. Each compiled page is served
 * standalone per scenario in the public site (presetting its own initial hash),
 * so there is deliberately no cross-scenario nav bar here — that would be
 * misleading chrome for a single-scenario embed. The active scenario renders in
 * the router outlet and the always-visible event log shows every SDK
 * interaction. An effect mirrors `EzoicService.ready()` transitions into the
 * log so readers can see the runtime come up.
 */
@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, EventLogPanelComponent],
  template: `<router-outlet /><app-event-log-panel />`,
})
export class AppComponent {
  private readonly ezoic = inject(EzoicService);
  private readonly eventLog = inject(EventLogService);

  constructor() {
    effect(() => {
      this.eventLog.add(`EzoicService.ready() = ${this.ezoic.ready()}`);
    });
  }
}
