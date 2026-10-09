import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { SectionTitle } from '@/components/audit/PlaceBits';
import { PaidAction } from '@/components/plan/PaidAction';
import { AlertList, FreeStandings, LessonList, PlaceDetail, PlacesBoard, Ranking, RivalLine } from '@/components/rivals/City';
import { RivalCheckPanel } from '@/components/rivals/RivalCheckPanel';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { formatDate, plural } from '@/domain/format';
import { PLACES, type Place } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadRivalsPage } from '@/lib/rivals/load';
import { openingPlace, placeChecks, placeLesson } from '@/rivals/places';
import audit from '@/components/audit/places.module.css';

export const metadata = { title: 'Rivals' };

const QUESTION = 'Who’s ahead in our city?';

/** "3 rivals in Guwahati", or "3 rivals: 1 in Tezpur, 2 from a Nearby city". */
function rivalsCaption(count: number, nearby: number, city: string): string {
  if (nearby === 0) return `${plural(count, 'rival', 'rivals')} in ${city}`;
  return `${plural(count, 'rival', 'rivals')}: ${count - nearby} in ${city}, ${nearby} from a Nearby city`;
}

// Rivals answers "Who's ahead in our city?" (spec 8.4), as the version 2 mock was approved: the
// month's one line, the ranking, place by place (each place opens check by check), what to learn
// from them and the alerts. Free sees ahead or behind each rival and the line, then what Paid adds.
export default async function RivalsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  const [data, params] = await Promise.all([loadRivalsPage(viewer), searchParams]);
  const owner = role === 'owner';

  if (data.rivals.length === 0) {
    if (owner) redirect('/rivals/choose');
    return (
      <div className={audit.page}>
        <PageHead title="Rivals" question={QUESTION} />
        <EmptyState icon="rivals" title="No rivals picked yet">
          The owner of your account picks 3 to 5 rivals to track. They show here once picked.
        </EmptyState>
      </div>
    );
  }

  const change = data.change;
  const changeAction =
    owner && (change.kind === 'available' || change.kind === 'anytime') ? (
      <ButtonLink href="/rivals/choose" variant="secondary" size="sm" icon="rivals">
        Change rivals
      </ButtonLink>
    ) : undefined;
  const changeNote =
    owner && change.kind === 'used'
      ? `Changed on ${formatDate(change.changedOn)}. You can change them again from ${formatDate(change.nextOn)}`
      : owner && change.kind === 'available'
        ? 'You can change them once a month'
        : null;

  const notice =
    params.saved === '1' ? (
      <Notice tone="inverse" icon="check" title="Your rivals are saved.">
        {viewer.tier !== 'free' ? 'Drishti has checked each one. How you compare is below.' : data.free?.hasAudit === false ? 'Drishti has checked each one. Where you stand shows once your first Audit is ready.' : 'Drishti has checked each one. Where you stand is below.'}
      </Notice>
    ) : undefined;
  const nearby = data.rivals.filter((rival) => rival.city !== institution.city).length;

  if (data.free) {
    return (
      <div className={audit.page}>
        <div className={audit.top}>
          <PageHead
            title="Rivals"
            question={QUESTION}
            caption={[rivalsCaption(data.rivals.length, nearby, institution.city), 'Checked on the 1st of each month', 'Free keeps the rivals you picked']}
          />
          {notice}
        </div>
        {data.line ? <RivalLine line={data.line} /> : null}
        {data.free.hasAudit || notice ? null : (
          <Notice icon="stopwatch" title="Your first Audit is being checked by the AdmitLabs team.">
            Where you stand against each rival shows once it is ready. Drishti has already checked your rivals.
          </Notice>
        )}
        <section className={audit.block} aria-labelledby="stand-title">
          <SectionTitle id="stand-title" icon="rivals" title="Ahead or behind" help="Each rival against you, from your latest Audit and theirs." />
          <FreeStandings standings={data.free.standings.map((rival) => ({ ...rival, nearby: rival.city !== institution.city }))} hasAudit={data.free.hasAudit} />
        </section>
        <section className={audit.unlock} aria-labelledby="unlock-title">
          <div>
            <h2 id="unlock-title" className={audit.unlockTitle}>
              Paid shows how you compare
            </h2>
            <ul className={audit.unlockList}>
              <li>
                <Icon name="lock" size={14} />
                The ranking, with each rival&apos;s Discovered, Trusted and Chosen
              </li>
              <li>
                <Icon name="lock" size={14} />
                Place by place and check by check, with what was found for each
              </li>
              <li>
                <Icon name="lock" size={14} />
                What to learn from them, 3 lessons a month
              </li>
              <li>
                <Icon name="lock" size={14} />
                {data.free.teaser.moves
                  ? `Alerts: ${plural(data.free.teaser.moves, 'move', 'moves')} by your rivals in the last 30 days, and every new one as it happens`
                  : 'Alerts when a rival starts a program, changes fees, starts ads or gets many new reviews'}
              </li>
            </ul>
          </div>
          <div className={audit.unlockAction}>
            <PaidAction viewer={viewer} />
          </div>
        </section>
      </div>
    );
  }

  const full = data.full;
  if (!full) return null;
  const names = new Map(data.rivals.map((rival) => [rival.id, rival.name]));
  const requested = typeof params.place === 'string' && (PLACES as readonly string[]).includes(params.place) ? (params.place as Place) : null;
  const opened = requested ?? openingPlace(full.view, institution.id);
  const openedPlace = full.view.places.find((place) => place.key === opened);
  const rows = placeChecks(full.across, opened);
  const lesson = openedPlace
    ? placeLesson({ place: openedPlace, rows, sides: full.sides, posts: full.posts, institutionType: institution.type })
    : null;
  const caption = [
    rivalsCaption(data.rivals.length, nearby, institution.city),
    full.lastScored ? `Checked ${formatDate(full.lastScored)}` : 'Being checked now',
    full.lastChecked ? `Alerts checked ${formatDate(full.lastChecked)}` : 'Alerts checked every Monday',
    ...(changeNote ? [changeNote] : []),
  ];

  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <PageHead title="Rivals" question={QUESTION} caption={caption} actions={changeAction} />
        {notice}
      </div>

      {data.line ? <RivalLine line={data.line} /> : null}
      {full.you ? null : (
        <Notice icon="info" title="Your first Audit is on its way.">
          How you compare shows once your own Audit is ready.
        </Notice>
      )}

      <section className={audit.block} aria-labelledby="ranking-title">
        <SectionTitle
          id="ranking-title"
          icon="rivals"
          title="The ranking"
          help={`You and your rivals${nearby ? '' : ` in ${institution.city}`}, from each one’s latest Audit. Discovered, Trusted and Chosen out of 100; the overall score small, after them.`}
        />
        <Ranking rows={full.view.ranking} rivalHref={(id) => `/rivals/${id}`} />
      </section>

      <section className={audit.block} aria-labelledby="places-title">
        <SectionTitle
          id="places-title"
          icon="globe"
          title="Place by place"
          help="The same five places as your Audit. Open a place to see each check, what was found for each side, and what to learn from the one ahead."
        />
        <PlacesBoard view={full.view} opened={opened} />
        {openedPlace ? (
          <PlaceDetail place={openedPlace} view={full.view} rows={rows} sides={full.sides} lesson={lesson} institutionType={institution.type} city={institution.city} />
        ) : null}
      </section>

      <section className={audit.block} aria-labelledby="learn-title">
        <SectionTitle id="learn-title" icon="spark" title="What to learn from them" help="Learned from your rivals this month. Take the idea, never copy." />
        <LessonList lessons={full.lessons} names={names} empty={<p className={audit.quiet}>What to learn from your rivals arrives with your next Audit.</p>} />
      </section>

      <section className={audit.block} aria-labelledby="alerts-title">
        <SectionTitle
          id="alerts-title"
          icon="bell"
          title="Alerts"
          help="The last 30 days: new programs, fee changes, new pages, admission dates, ads and big jumps in reviews. Each links to where it was found."
        />
        <AlertList alerts={full.alerts} names={names} empty="Nothing new from your rivals in the last 30 days. Drishti checks every Monday and tells you when it finds something." />
      </section>

      {full.across.length ? (
        <Suspense fallback={null}>
          <RivalCheckPanel rows={full.across} sides={full.acrossSides} institutionType={institution.type} />
        </Suspense>
      ) : null}
    </div>
  );
}
