import { Injectable, Signal, signal } from '@angular/core';

/**
 * Root event log for the scenario demo. Feature actions append timestamped
 * messages that the on-page log panel renders newest-first, giving a visible
 * trace of every SDK interaction the demo performs.
 */
@Injectable({ providedIn: 'root' })
export class EventLogService {
  private readonly _log = signal<readonly string[]>([]);

  /** The current log entries, newest first. */
  readonly log: Signal<readonly string[]> = this._log.asReadonly();

  /** Appends a timestamped message to the front of the log. */
  add(msg: string): void {
    const stamp = new Date().toLocaleTimeString();
    this._log.update((entries) => [`[${stamp}] ${msg}`, ...entries]);
  }
}
