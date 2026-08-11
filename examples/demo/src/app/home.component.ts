import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EzoicAdComponent } from '@ezoic/angular-sdk';
import { DemoStateService } from './demo-state.service';

/**
 * Home route. Demonstrates zero-config semantic placements (900-range),
 * an explicit generated-id placement, and dynamic-content placements
 * that mount after initial load when the shell's "Load more ads" button flips
 * the shared `showMoreAds` signal. Generated ids carry no dashboard sizing, so
 * every placement below passes explicit sizes. Body copy is a short article so
 * the page has real paragraph structure and scroll depth for contextual demand.
 */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EzoicAdComponent],
  template: `
    <h1>The United States Constitution: A Living Framework</h1>
    <p class="demo-note">
      This page demonstrates zero-config semantic placements (900-range ids), an explicit
      generated-id placement, and dynamic placements that mount after initial load. Each placement
      passes position-appropriate sizes; the platform filters to the site's configured allowed
      sizes.
    </p>

    <ezoic-ad location="top_of_page" required [sizes]="headerFooterSizes" />
    <p>
      The Constitution of the United States is the supreme law of the land and the oldest written
      national constitution still in force. Ratified in 1788 and effective from 1789, it replaced
      the Articles of Confederation with a stronger federal structure while preserving state
      authority in areas not delegated to the national government. Its text is short by modern
      standards, yet it has guided more than two centuries of legislation, court decisions, and
      public debate about liberty, power, and self-government.
    </p>
    <ezoic-ad location="under_first_paragraph" required [sizes]="contentSizes" />

    <h2>Origins and the Constitutional Convention</h2>
    <p>
      After independence, the thirteen states operated under the Articles of Confederation, a
      compact that left Congress without reliable taxing power or an independent executive. Trade
      disputes, unpaid war debts, and local unrest—most famously Shays' Rebellion in
      Massachusetts—convinced many leaders that a more durable union was required. In May 1787,
      delegates gathered in Philadelphia with a mandate that began as revision of the Articles and
      soon became a wholesale redesign of national government.
    </p>
    <p>
      The Convention's debates were intense and often secret. Large states favored representation by
      population; small states insisted on equal votes in at least one chamber. The resulting
      Connecticut Compromise created a bicameral Congress: a House apportioned by population and a
      Senate with two members from each state. Slavery produced painful bargains—including the
      three-fifths clause and a delayed ban on the international slave trade—that later generations
      condemned and that the Civil War and subsequent amendments overturned in law.
    </p>
    <p>
      Thirty-nine delegates signed on September 17, 1787. Ratification moved to state conventions.
      Federalists argued that energy in government was essential; Anti-Federalists warned that
      distant power would erode local liberty. The promise of a bill of rights helped tip several
      close contests. By mid-1788, nine states had ratified, meeting the threshold to begin.
    </p>

    <ezoic-ad location="mid_content" required [sizes]="contentSizes" />

    <h2>Structure of the Articles</h2>
    <p>
      The Constitution opens with a Preamble that states the purposes of the union: justice,
      domestic tranquility, common defense, general welfare, and the blessings of liberty. Article I
      vests legislative power in Congress and enumerates specific authorities—taxing, spending,
      regulating commerce among the states, declaring war, and raising armies—while the Necessary
      and Proper Clause allows Congress to enact laws needed to carry those powers into effect.
    </p>
    <p>
      Article II establishes a single President as chief executive, chosen through the Electoral
      College, with duties that include faithful execution of the laws, command of the armed forces,
      and negotiation of treaties subject to Senate consent. Article III creates a federal judiciary
      headed by a Supreme Court, with Congress authorized to establish lower courts. Lifetime tenure
      during good behavior was meant to insulate judges from short-term political pressure.
    </p>
    <p>
      Articles IV through VII address relations among the states, the amendment process, debts and
      supremacy, and ratification. The Supremacy Clause in Article VI declares the Constitution,
      federal statutes, and treaties the supreme law, binding on state judges. Together these
      articles invent a system of separated powers and checks and balances: each branch can limit
      the others, and federalism divides authority between national and state governments.
    </p>

    <h2>The Bill of Rights</h2>
    <p>
      Many ratification debates turned on whether the original text sufficiently protected
      individual liberties. James Madison introduced amendments in the First Congress. Ten were
      ratified by 1791 and are known collectively as the Bill of Rights. They restrain federal power
      over speech, press, religion, assembly, arms, housing of soldiers, searches and seizures,
      criminal procedure, and reserved rights of the people and the states.
    </p>
    <p>
      The First Amendment protects religion, speech, press, assembly, and petition. The Fourth
      guards against unreasonable searches. The Fifth through Eighth detail criminal-procedure
      rights, due process, and limits on bail and punishment. The Ninth and Tenth emphasize that
      enumeration of rights does not deny others retained by the people, and that powers not
      delegated remain with the states or the people. Later, the Fourteenth Amendment's Due Process
      Clause became the main vehicle for applying most of these protections against the states—a
      development known as incorporation.
    </p>
    <ezoic-ad [id]="910" [required]="true" [sizes]="contentSizes" />
    <p class="demo-note">
      The placement above uses an explicit generated id with the same rectangle-led size set as
      other content positions; generated ids carry no dashboard sizing of their own.
    </p>

    <h2>How Amendments Are Made</h2>
    <p>
      Article V sets two paths to propose amendments and two paths to ratify them. Congress may
      propose an amendment by a two-thirds vote of both houses, or two-thirds of the state
      legislatures may call a convention for proposing amendments—a route never used to date. An
      amendment becomes part of the Constitution when ratified by three-fourths of the states,
      either through their legislatures or through state conventions, as Congress may direct.
    </p>
    <p>
      The high thresholds make change deliberate. Only twenty-seven amendments have been adopted.
      Early amendments refined elections and judicial power; the Reconstruction Amendments abolished
      slavery, defined citizenship, and sought to guarantee equal protection and voting rights.
      Later amendments authorized the income tax, provided for direct election of senators, extended
      the vote to women and to citizens eighteen and older, limited presidential terms, and
      addressed presidential succession and congressional pay.
    </p>

    <h2>Why the Constitution Endures</h2>
    <p>
      Endurance is not the same as stasis. The Constitution survives because its structure is both
      firm and flexible: firm enough to constrain temporary majorities, flexible enough to absorb
      new states, technologies, and social movements through amendment, statute, and interpretation.
      Judicial review—established in practice early in the republic—allows courts to measure
      legislation against constitutional text, while elections and federalism keep political
      contests open across many arenas.
    </p>
    <p>
      Disagreement remains constant—over federal power versus state autonomy, individual rights
      versus collective security, and equality under law. Those arguments are the design in motion.
      The document allocates authority, protects a core of liberty, and leaves successive
      generations the duty of governing within that framework. Its relevance depends less on
      ceremony than on citizens who understand its text, insist on its limits, and amend it when the
      people conclude the charter itself must change.
    </p>

    <ezoic-ad location="bottom_of_page" [required]="false" [sizes]="headerFooterSizes" />
    <p class="demo-note">
      Location placements default to <code>required: true</code>. The footer placement above passes
      <code>[required]="false"</code> to make one best-effort request while still supplying sizes.
    </p>

    @if (demoState.showMoreAds()) {
      <h2>Dynamically added placements</h2>
      <p class="demo-note">
        These incontent ids mounted after initial load; the SDK batches a follow-up request.
      </p>
      <ezoic-ad [id]="915" [required]="true" [sizes]="['300x250', '336x280']" />
      <ezoic-ad [id]="916" [required]="true" [sizes]="['300x250']" />
    }
  `,
})
export class HomeComponent {
  protected readonly demoState = inject(DemoStateService);

  /**
   * Header/footer size set. Includes phone-form-factor 320x50 plus common rectangles;
   * the platform filters to the site's configured allowed sizes per position/form factor.
   */
  protected readonly headerFooterSizes = [
    '728x90',
    '970x90',
    '970x250',
    '300x250',
    '336x280',
    '320x50',
  ];

  /**
   * Content-position size set. Rectangle sizes are where content-position demand concentrates;
   * the platform filters client sizes to the site's configured allowed sizes per position/form
   * factor.
   */
  protected readonly contentSizes = ['300x250', '336x280', '580x400', '728x90'];
}
