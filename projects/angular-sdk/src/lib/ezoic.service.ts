import { DOCUMENT, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EZOIC_OPTIONS, resolveEzoicOptions } from './ezoic-config';
import { injectEzoicScripts } from './script-loader';
import { EzoicCommand, EzoicWindow } from './ezstandalone.types';

/**
 * Core Ezoic SDK service. Handles one-time header-script injection at
 * application startup and provides a browser-only, SSR-safe helper for queuing
 * work on the `ezstandalone` command queue.
 *
 * Configure it with `provideEzoic` in your `ApplicationConfig`; do not add it to
 * a component `providers` array.
 */
@Injectable({ providedIn: 'root' })
export class EzoicService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly options = resolveEzoicOptions(
    inject(EZOIC_OPTIONS, { optional: true }) ?? undefined,
  );
  private readonly _ready = signal(false);

  /** `true` when running in a browser; `false` during server-side rendering. */
  readonly isBrowser = isPlatformBrowser(this.platformId);

  /**
   * Emits `true` once the header scripts have been injected and the command
   * queue is available. Stays `false` during server-side rendering.
   */
  readonly ready = this._ready.asReadonly();

  /**
   * Injects the Ezoic header scripts and marks the SDK ready. Invoked once at
   * application startup by `provideEzoic`. Safe to call repeatedly: it is a
   * no-op after the first successful run and during server-side rendering.
   */
  initialize(): void {
    if (!this.isBrowser || this._ready()) {
      return;
    }
    injectEzoicScripts(this.document, this.options);
    this._ready.set(true);
  }

  /**
   * Queues a function on `ezstandalone.cmd`. Before the header script finishes
   * loading the function is buffered and run in order once the runtime is
   * ready; afterwards it runs immediately. No-op during server-side rendering.
   *
   * @param command Function to run inside the Ezoic command queue.
   */
  push(command: EzoicCommand): void {
    if (!this.isBrowser) {
      return;
    }
    const win = this.document.defaultView as EzoicWindow | null;
    if (!win) {
      return;
    }
    if (!win.ezstandalone) {
      win.ezstandalone = { cmd: [] };
    } else if (!Array.isArray(win.ezstandalone.cmd)) {
      win.ezstandalone.cmd = [];
    }
    win.ezstandalone.cmd.push(command);
  }
}
