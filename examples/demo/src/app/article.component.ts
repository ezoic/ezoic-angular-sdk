import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  EzoicAdComponent,
  EzoicVideoComponent,
  EzoicVideoEmbedComponent,
} from '@ezoic/angular-sdk';

/**
 * Article route. Mounts a different explicit-id display placement than Home so
 * navigation tears down the departing route's placeholders and requests this
 * route's, plus an inline Open Video embed and an Ezoic video placeholder.
 * Generated ids carry no dashboard sizing, so sizes are passed explicitly.
 * Body copy is a second short article (First Amendment) for scroll depth and
 * distinct contextual content from the home route.
 */
@Component({
  selector: 'app-article',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EzoicAdComponent, EzoicVideoComponent, EzoicVideoEmbedComponent],
  template: `
    <h1>The First Amendment: Speech, Faith, and Public Life</h1>
    <p class="demo-note">
      This route uses a distinct explicit-id display placement so navigation replaces the home
      route's placeholders and requests this page's ads.
    </p>
    <p>
      The First Amendment is among the most quoted clauses in American law and among the most
      contested. Ratified in 1791 as part of the Bill of Rights, it forbids Congress from making
      laws respecting an establishment of religion or prohibiting its free exercise, or abridging
      freedom of speech, of the press, of peaceful assembly, or of petitioning the government for
      redress of grievances. In a single sentence it ties together conscience, expression, and
      political participation.
    </p>
    <ezoic-ad [id]="919" [required]="true" [sizes]="['300x250', '336x280']" />

    <h2>Religion: establishment and free exercise</h2>
    <p>
      The religion clauses pursue two related goals: government may not establish an official faith,
      and individuals may practice their religion without undue interference. Early state
      establishments and religious tests for office made the federal ban on establishment a sharp
      break for national power. Later controversy has turned on school prayer, public funding for
      religious institutions, holiday displays, and accommodation of religious practice in
      workplaces and prisons.
    </p>
    <p>
      Free exercise claims ask when generally applicable laws may burden religious conduct. Courts
      have drawn lines between belief—which receives near-absolute protection—and action, which
      government may regulate when it has a compelling interest and uses narrowly tailored means,
      or, under some doctrines, when the law is neutral and generally applicable. The result is a
      continuing conversation about pluralism: how a diverse nation honors conscience without
      creating exemptions that undermine shared civic rules.
    </p>

    <h2>Speech and the press</h2>
    <p>
      Freedom of speech protects political protest, artistic expression, and much ordinary
      conversation from government censorship. It does not mean that every utterance is risk-free.
      Long-standing categories such as true threats, fraud, and certain forms of unprotected
      incitement sit outside the Amendment's core. Defamation law balances reputation against open
      debate, with heightened protection for speech about public officials and public figures.
    </p>
    <p>
      The press clause reflects the Framers' experience with licensed printers and seditious libel.
      A free press investigates government, publishes unpopular views, and informs voters. Modern
      questions involve prior restraint, confidential sources, access to courtrooms and public
      records, and the status of digital intermediaries that shape what audiences see. Technology
      changes the medium; the constitutional interest in uninhibited, robust debate remains.
    </p>
    <p>
      Content-based restrictions on speech receive searching scrutiny because they target messages
      the government dislikes. Content-neutral rules about time, place, and manner—noise limits in
      parks, permit systems for large marches—are more often upheld when they leave open ample
      alternative channels. That distinction keeps order in public spaces while preventing officials
      from silencing particular viewpoints.
    </p>

    <h2>Assembly and petition</h2>
    <p>
      The rights to assemble peaceably and to petition the government protect collective action and
      formal grievance. Assemblies range from town meetings to mass demonstrations. Governments may
      impose reasonable, evenhanded logistics requirements, but they may not ban gatherings because
      of the message speakers bring. Petition encompasses lawsuits, lobbying, and appeals to
      legislators—channels that let minorities and majorities alike seek change without violence.
    </p>
    <p>
      Together with speech and press, assembly and petition form a toolkit for democratic
      accountability. Elections are periodic; these rights operate every day between elections,
      allowing citizens to criticize officials, organize associations, and demand answers.
    </p>

    <h2>Why the First Amendment still matters</h2>
    <p>
      Authoritarian systems typically begin by narrowing who may speak and what may be printed. The
      First Amendment makes that path harder by placing a constitutional barrier in front of
      official orthodoxy. It does not guarantee civility or truth; it guarantees that government may
      not pick winners in the marketplace of ideas except in carefully limited circumstances.
    </p>
    <p>
      Living under the Amendment requires habits as much as lawsuits: listening to opponents,
      distinguishing private platforms from state actors, and accepting that protected speech can be
      offensive. Those habits are difficult. They are also the price of a political community that
      resolves conflict through persuasion and votes rather than through silencing rivals. For
      publishers and readers alike, that bargain remains the Amendment's enduring lesson.
    </p>

    <h2>Inline video embed (Open Video)</h2>
    <ezoic-video-embed videoId="zn0TPhaPiju" float autoplay />

    <h2>Ezoic video placeholder</h2>
    <!-- The [id]=919 display placement above initializes page-level ads so this loads. -->
    <ezoic-video divId="demo-video-slot-1" />
  `,
})
export class ArticleComponent {}
