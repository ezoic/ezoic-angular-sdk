import { DOCUMENT, DestroyRef, Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { EzoicWindow } from './ezstandalone.types';
import { TcfAddEventListenerCallback, TcfApi, TcfEventStatus } from './tcf.types';

/**
 * How often, and for how long, the service waits for `__tcfapi` to appear.
 *
 * The window is deliberately bounded: `provideEzoic` injects the CMP scripts
 * first at bootstrap, so `__tcfapi` normally appears within a few hundred ms.
 * If it has not appeared after ~10 s the CMP is almost certainly blocked (an
 * ad/consent blocker or a network failure) and unbounded polling would only
 * burn CPU without ever registering. Consumers that must handle an unusually
 * late CMP can re-create the service (it re-runs this poll on construction).
 */
const TCF_POLL_INTERVAL_MS = 250;
const TCF_POLL_MAX_ATTEMPTS = 40; // ~10 s total

/**
 * Exposes IAB TCF v2.2 consent state from the active Ezoic CMP (`window.__tcfapi`)
 * as Angular signals.
 *
 * Inject it wherever you need to react to consent — for example to defer
 * non-essential work until a TC string is available. The service registers a
 * TCF event listener as soon as the CMP is present (polling briefly for it,
 * since the CMP loads asynchronously) and removes the listener on teardown.
 *
 * All state stays at its initial value during server-side rendering; the
 * service touches no browser global on the server.
 *
 * Signals can be adapted to observables with `toObservable` from
 * `@angular/core/rxjs-interop` if your code prefers RxJS.
 */
@Injectable({ providedIn: 'root' })
export class EzoicConsentService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  /** `true` when running in a browser; `false` during server-side rendering. */
  readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly _ready = signal(false);
  private readonly _tcString = signal<string | null>(null);
  private readonly _gdprApplies = signal<boolean | null>(null);
  private readonly _eventStatus = signal<TcfEventStatus | null>(null);

  /**
   * Emits `true` once a usable TC string is available (TCF `eventStatus` is
   * `tcloaded` or `useractioncomplete`). Stays `false` during server-side
   * rendering and until the CMP resolves consent.
   */
  readonly ready = this._ready.asReadonly();

  /** The current TCF consent string, or `null` before it is available. */
  readonly tcString = this._tcString.asReadonly();

  /**
   * Whether GDPR applies to the current visitor, or `null` before the CMP
   * reports it.
   */
  readonly gdprApplies = this._gdprApplies.asReadonly();

  /** The latest TCF event status, or `null` before the first event. */
  readonly eventStatus = this._eventStatus.asReadonly();

  private listenerId: number | null = null;
  private pollHandle: ReturnType<typeof setInterval> | null = null;

  constructor() {
    if (!this.isBrowser) {
      return;
    }
    this.startListening();
    this.destroyRef.onDestroy(() => this.stopListening());
  }

  /**
   * Registers the TCF listener once `__tcfapi` is present, polling briefly for
   * it because the CMP script loads asynchronously after the SDK boots.
   */
  private startListening(): void {
    if (this.tryRegister()) {
      return;
    }
    let attempts = 0;
    this.pollHandle = setInterval(() => {
      attempts += 1;
      if (this.tryRegister() || attempts >= TCF_POLL_MAX_ATTEMPTS) {
        this.clearPoll();
      }
    }, TCF_POLL_INTERVAL_MS);
  }

  /** Registers the listener if the CMP API is available; reports whether it did. */
  private tryRegister(): boolean {
    const api = this.tcfApi();
    if (!api) {
      return false;
    }
    const callback: TcfAddEventListenerCallback = (data, success) => {
      if (!success || !data) {
        return;
      }
      if (typeof data.listenerId === 'number') {
        this.listenerId = data.listenerId;
      }
      if (data.eventStatus) {
        this._eventStatus.set(data.eventStatus);
      }
      if (typeof data.gdprApplies === 'boolean') {
        this._gdprApplies.set(data.gdprApplies);
      }
      if (typeof data.tcString === 'string') {
        this._tcString.set(data.tcString);
      }
      if (data.eventStatus === 'tcloaded' || data.eventStatus === 'useractioncomplete') {
        this._ready.set(true);
      }
    };
    api('addEventListener', 2, callback);
    return true;
  }

  /** Removes the registered TCF listener and stops any pending poll. */
  private stopListening(): void {
    this.clearPoll();
    const api = this.tcfApi();
    if (api && this.listenerId !== null) {
      api('removeEventListener', 2, () => undefined, this.listenerId);
    }
    this.listenerId = null;
  }

  private clearPoll(): void {
    if (this.pollHandle !== null) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
  }

  private tcfApi(): TcfApi | undefined {
    const win = this.document.defaultView as EzoicWindow | null;
    return typeof win?.__tcfapi === 'function' ? win.__tcfapi : undefined;
  }
}
