import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { EZOIC_OPTIONS } from './ezoic-config';
import { EzoicAdComponent } from './ezoic-ad.component';
import { provideEzoic } from './provide-ezoic';
import { withRouterRefresh } from './with-router-refresh';
import { EzoicWindow } from './ezstandalone.types';

interface RuntimeSpies {
  showAds: jest.Mock;
  destroyPlaceholders: jest.Mock;
  setIsSinglePageApplication: jest.Mock;
}

function mockRuntime(): RuntimeSpies {
  const spies: RuntimeSpies = {
    showAds: jest.fn(),
    destroyPlaceholders: jest.fn(),
    setIsSinglePageApplication: jest.fn(),
  };
  (window as unknown as EzoicWindow).ezstandalone = { cmd: [], ...spies };
  return spies;
}

/** Runs and clears everything currently queued on `ezstandalone.cmd`. */
function drain(): void {
  const ez = (window as unknown as EzoicWindow).ezstandalone;
  if (!ez || !Array.isArray(ez.cmd)) {
    return;
  }
  const queued = [...ez.cmd];
  ez.cmd.length = 0;
  queued.forEach((fn) => fn());
}

/** Lets the registry's queued microtask (batched showAds) run, then drains. */
async function settle(): Promise<void> {
  await Promise.resolve();
  drain();
}

function reset(): void {
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  (window as unknown as EzoicWindow).ezstandalone = undefined;
}

@Component({
  selector: 'ezoic-route-a',
  standalone: true,
  imports: [EzoicAdComponent],
  template: '<ezoic-ad [id]="101" />',
})
class RouteAComponent {}

@Component({
  selector: 'ezoic-route-b',
  standalone: true,
  imports: [EzoicAdComponent],
  template: '<ezoic-ad [id]="201" />',
})
class RouteBComponent {}

describe('withRouterRefresh with the real Angular Router', () => {
  beforeEach(reset);
  afterEach(reset);

  it('drives per-route showAds/destroyPlaceholders through <ezoic-ad> component churn', async () => {
    const spies = mockRuntime();
    TestBed.configureTestingModule({
      providers: [
        { provide: EZOIC_OPTIONS, useValue: {} },
        provideRouter([
          { path: 'a', component: RouteAComponent },
          { path: 'b', component: RouteBComponent },
        ]),
        provideEzoic({}, withRouterRefresh()),
      ],
    });

    const harness = await RouterTestingHarness.create();
    drain();
    // Boot marks the page as an SPA so new-pageview showAds route through refresh().
    expect(spies.setIsSinglePageApplication).toHaveBeenCalledWith(true);

    await harness.navigateByUrl('/a');
    await settle();
    expect(spies.showAds).toHaveBeenCalledWith(101);
    expect(spies.destroyPlaceholders).not.toHaveBeenCalled();

    await harness.navigateByUrl('/b');
    await settle();
    // Departing route 'a' tears down 101; arriving route 'b' requests 201.
    expect(spies.destroyPlaceholders).toHaveBeenCalledWith(101);
    expect(spies.showAds).toHaveBeenCalledWith(201);
    expect(spies.destroyPlaceholders.mock.invocationCallOrder[0]).toBeLessThan(
      spies.showAds.mock.invocationCallOrder[1],
    );
  });
});
