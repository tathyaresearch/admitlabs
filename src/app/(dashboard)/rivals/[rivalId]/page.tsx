import { notFound, redirect } from 'next/navigation';
import { Suspense } from 'react';
import { SectionTitle, Tag } from '@/components/audit/PlaceBits';
import { MonthTable } from '@/components/charts/MonthTable';
import { PostCards } from '@/components/rivals/Activity';
import { AlertList, LessonList, PlaceDetail, PlacesBoard, Ranking } from '@/components/rivals/City';
import { RivalCheckPanel } from '@/components/rivals/RivalCheckPanel';
import { Notice } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/Layout';
import { formatDate, formatMonth, hostAndPath } from '@/domain/format';
import { INSTITUTION_TYPE_LABELS, PLACES, type Place } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadActions, loadRivalDetail, type ActionRow } from '@/lib/rivals/load';
import { whereTheyLead, whereYouLead } from '@/rivals/compare';
import { openingPlace, placeChecks, placeLesson, rivalSummary } from '@/rivals/places';
import { admissionPushText, reviewTrendNote, rivalCheckName, sideWords } from '@/rivals/text';
import { admissionPush } from '@/rivals/timing';
import audit from '@/components/audit/places.module.css';
import city from '@/components/rivals/city.module.css';

export const metadata = { title: 'Rival' };

// One rival answers "Where do they lead us?" (spec 8.4): how they lead you in a sentence, you and
// them with the three words, when their admissions open and their Google rating, place by place
// with every check side by side, what to learn from them, their alerts and best posts, and the
// score month by month. Paid and Client: Free sees ahead or behind on the Rivals page.
export default async function RivalPage({ params, searchParams }: { params: Promise<{ rivalId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireInstitutionViewer();
  if (viewer.tier === 'free') redirect('/rivals');
  const [{ rivalId }, query] = await Promise.all([params, searchParams]);
  const institution = viewer.membership.institution;
  const [detail, lessons] = await Promise.all([loadRivalDetail(viewer, rivalId), loadActions(institution.id)]);
  if (!detail) notFound();

  const { rival, you } = detail;
  const theirs = detail.audits.get(rival.id) ?? null;
  const comparisons = detail.comparisons.get(rival.id) ?? [];
  const theyLead = whereTheyLead(comparisons);
  const youLead = whereYouLead(comparisons);
  const names = new Map([[rival.id, rival.name]]);
  const push = admissionPush(detail.alerts, new Date());
  const reviews = detail.reviews.latest?.rating === null ? null : detail.reviews.latest;
  const requested = typeof query.place === 'string' && (PLACES as readonly string[]).includes(query.place) ? (query.place as Place) : null;
  const opened = requested ?? openingPlace(detail.view, institution.id);
  const openedPlace = detail.view.places.find((place) => place.key === opened);
  const rows = placeChecks(detail.across, opened);
  const lesson = openedPlace ? placeLesson({ place: openedPlace, rows, sides: detail.sides, posts: detail.posts, institutionType: institution.type }) : null;

  // What to learn from them: this month's lessons from them, or else where they lead you.
  const fromThem = lessons.filter((item) => item.rivalId === rival.id);
  const whereAhead: ActionRow[] = theyLead.slice(0, 3).map((item, index) => ({
    rank: index + 1,
    text: rivalCheckName(item.key, institution.type, institution.city),
    detail: `${rival.name}: ${sideWords(item.them)}. You: ${sideWords(item.you)}.`,
    rivalId: rival.id,
    checkKey: item.key,
    effort: null,
    month: '',
  }));

  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <PageHead
          back={{ href: '/rivals', label: 'Rivals' }}
          title={rival.name}
          question={`Where does ${rival.name} lead us?`}
          caption={[
            `${INSTITUTION_TYPE_LABELS[rival.type]} in ${rival.city}${detail.nearby ? ', a Nearby city' : ''}`,
            <a key="site" href={rival.website} target="_blank" rel="noreferrer">
              {hostAndPath(rival.website)}
              <span className="visually-hidden"> (opens in a new tab)</span>
            </a>,
            theirs ? `Checked ${formatDate(theirs.runAt)}` : 'Being checked now',
          ]}
        />
      </div>

      {theirs && you ? (
        <p className={city.bigLine}>{rivalSummary({ theyLead: theyLead.map((item) => item.key), youLead: youLead.length, institutionType: institution.type })}</p>
      ) : (
        <Notice icon="info" title={theirs ? 'Your first Audit is on its way.' : `Drishti is checking ${rival.name} now.`}>
          How you compare shows once both Audits are ready.
        </Notice>
      )}

      <section className={audit.block} aria-labelledby="sides-title">
        <SectionTitle id="sides-title" icon="rivals" title="You and them" help="From each one’s latest Audit. The score is small on purpose: the words say more." />
        <Ranking rows={detail.view.ranking} />
        <div className={city.facts}>
          <div className={audit.card}>
            <p className={audit.columnTitle}>Admissions open</p>
            <p className={city.factValue}>{admissionPushText(push?.detectedAt ?? null)}</p>
            <p className={audit.quiet}>{push?.description ?? 'Drishti looks for their admission dates on their website every Monday.'}</p>
          </div>
          <div className={audit.card}>
            <p className={audit.columnTitle}>Google reviews</p>
            {reviews?.rating ? (
              <p className={city.factValue}>
                <span className="num">{reviews.rating.toFixed(1)}</span> from <span className="num">{reviews.reviewCount}</span> {reviews.reviewCount === 1 ? 'review' : 'reviews'}
              </p>
            ) : (
              <p className={city.factValue}>None found yet</p>
            )}
            <p className={audit.quiet}>{reviewTrendNote(detail.reviews)}</p>
          </div>
        </div>
      </section>

      {theirs && you ? (
        <section className={audit.block} aria-labelledby="places-title">
          <SectionTitle
            id="places-title"
            icon="globe"
            title="Place by place"
            help="The same five places as your Audit. Open a place to see every check side by side, what was found for each of you, and what to learn from them."
          />
          <PlacesBoard view={detail.view} opened={opened} />
          {openedPlace ? (
            <PlaceDetail place={openedPlace} view={detail.view} rows={rows} sides={detail.sides} lesson={lesson} institutionType={institution.type} city={institution.city} />
          ) : null}
        </section>
      ) : null}

      {theirs && you ? (
        <section className={audit.block} aria-labelledby="learn-title">
          <SectionTitle
            id="learn-title"
            icon="spark"
            title={`What to learn from ${rival.name}`}
            help={fromThem.length ? 'Learned from them this month. Take the idea, never copy.' : 'Where they lead you, biggest first. Open one to see what was found for each of you.'}
          />
          <LessonList
            lessons={fromThem.length ? fromThem : whereAhead}
            names={names}
            empty={<p className={audit.quiet}>They do not lead you on any check right now. Keep it going.</p>}
          />
        </section>
      ) : null}

      <section className={audit.block} aria-labelledby="alerts-title">
        <SectionTitle id="alerts-title" icon="bell" title="Their alerts" help="Everything Drishti has seen them change, newest first. Checked every Monday." />
        <AlertList alerts={detail.alerts} names={names} showRival={false} empty="Nothing seen yet. Drishti checks their website, Google profile and ads every Monday." />
      </section>

      <section className={audit.block} aria-labelledby="posts-title">
        <SectionTitle
          id="posts-title"
          icon="share"
          title="Their best posts"
          help={detail.posts[0] ? `Their best posts from ${formatMonth(detail.posts[0].month.slice(0, 7))}, and what to learn from each. Take the idea, never copy the post.` : 'Their best posts each month, and what to learn from each.'}
        />
        <div className={audit.card}>
          <PostCards posts={detail.posts} names={names} showRival={false} />
        </div>
      </section>

      {you && detail.trend.months.length > 1 ? (
        <section className={audit.block} aria-labelledby="months-title">
          <SectionTitle id="months-title" icon="demand" title="Month by month" help={`Your score and theirs, from each month’s Audit. ${rival.name} is checked on the 1st of each month.`} />
          <div className={audit.card}>
            <MonthTable trend={detail.trend} label={`Score by month, you and ${rival.name}`} />
          </div>
        </section>
      ) : null}

      {detail.nearby ? (
        <p className={audit.quiet}>
          <Tag>Nearby city</Tag> {rival.name} is in {rival.city}, the nearest bigger city to {institution.city}.
        </p>
      ) : null}

      {detail.across.length ? (
        <Suspense fallback={null}>
          <RivalCheckPanel rows={detail.across} sides={detail.acrossSides} institutionType={institution.type} />
        </Suspense>
      ) : null}
    </div>
  );
}
