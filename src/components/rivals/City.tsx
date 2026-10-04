// Rivals in your city (spec 8.4), the parts of the Rivals page and of a rival's page, as the
// version 2 mock was approved: the month's one line, the ranking, place by place (a table on a
// wide screen, a card per place on a phone), the opened place check by check with what to learn
// from the one ahead, the lessons and the alerts; and Free's ahead or behind. Server components:
// the check panel opens from ?check=<key>, a place from ?place=<key>.

import Link from 'next/link';
import type { ReactNode } from 'react';
import type { StoredFinding } from '@/audit/places';
import { PLACE_ICONS, ProofLine, Tag } from '@/components/audit/PlaceBits';
import { Icon } from '@/components/ui/Icon';
import { CheckIcon } from '@/components/ui/Marks';
import { ResultBar } from '@/components/ui/Results';
import { checksForPlace, getCheck } from '@/domain/checks';
import { formatDate, hostAndPath } from '@/domain/format';
import type { ScoreLabel } from '@/domain/scores';
import { EFFORT_LABELS, FINDING_KIND_LABELS, type CheckResult, type InstitutionType, type Place } from '@/domain/types';
import type { ActionRow, MoveRow } from '@/lib/rivals/load';
import type { AcrossCell, AcrossRow } from '@/rivals/across';
import type { Standing } from '@/rivals/compare';
import { placeLeadText, type PlaceLesson, type PlaceRow, type PlaceSide, type RankingRow, type RivalPlacesView } from '@/rivals/places';
import { MOVE_KIND_LABELS, rivalCheckName, STANDING_LABELS } from '@/rivals/text';
import audit from '@/components/audit/places.module.css';
import styles from './city.module.css';

const WORD_RESULT: Readonly<Record<ScoreLabel, CheckResult>> = { Strong: 'strong', Okay: 'okay', Weak: 'weak' };

type Side = Pick<PlaceSide, 'id' | 'name' | 'you' | 'nearby'>;

const placeHref = (place: Place) => `?place=${place}#opened`;
const checkHref = (place: Place, key: string) => `?place=${place}&check=${key}`;

export function RivalLine({ line }: { line: string }) {
  return <p className={styles.bigLine}>{line}</p>;
}

/** A side's name: "You" with your name as a tag, or the rival's, with "Nearby city" when it is from another city. */
function SideName({ side, rivalHref }: { side: Side; rivalHref?: (id: string) => string | null }) {
  const href = !side.you && rivalHref ? rivalHref(side.id) : null;
  return (
    <span className={styles.sideName}>
      {side.you ? 'You' : href ? (
        <Link href={href} className={styles.sideLink}>
          {side.name}
        </Link>
      ) : (
        side.name
      )}
      {side.you ? <Tag strong>{side.name}</Tag> : null}
      {side.nearby ? <Tag>Nearby city</Tag> : null}
    </span>
  );
}

/** You and each rival, highest score first, with the three words and the small score. */
export function Ranking({ rows, rivalHref }: { rows: readonly RankingRow[]; rivalHref?: (id: string) => string | null }) {
  return (
    <div className={audit.card}>
      <ol className={styles.ranking}>
        {rows.map((row) => (
          <li key={row.id} className={[styles.rankRow, row.you ? styles.rankYou : ''].join(' ')}>
            <span className={`${styles.rankPlace} num`}>{row.place ?? ''}</span>
            <SideName side={row} rivalHref={rivalHref} />
            {row.words.length ? (
              <span className={styles.rankWords}>
                {row.words.map((word) => (
                  <span key={word.pillar} className={styles.rankWord}>
                    <span className={styles.rankWordName}>{word.name}</span>
                    {word.word}
                  </span>
                ))}
              </span>
            ) : (
              <span className={styles.rankNote}>{row.you ? 'Your first Audit is on its way.' : 'Drishti is checking them now.'}</span>
            )}
            <span className={styles.rankScore}>
              {row.overall !== null ? (
                <>
                  <span className="num">{row.overall}</span>
                  <span className="visually-hidden"> out of 100</span>
                </>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function sideOrder(view: RivalPlacesView): Side[] {
  return view.ranking.map((row) => ({ id: row.id, name: row.name, you: row.you, nearby: row.nearby }));
}

/** A scored place's cell: its word, and "Leads" for the side that leads it. */
function PlaceWord({ place, side }: { place: PlaceRow; side: Side }) {
  const cell = place.cells[side.id];
  if (!place.scored) return <span className={styles.gridNote}>{cell?.note ?? 'Not checked yet'}</span>;
  if (!cell?.word) return <span className={styles.gridNote}>Not checked yet</span>;
  return (
    <span className={styles.gridCell}>
      <span className={styles.gridWord}>{cell.word}</span>
      {cell.leads ? <span className={styles.leadsMark}>Leads</span> : null}
    </span>
  );
}

/** On a wide page: the five places down, you and each rival across. */
function PlaceGrid({ view, opened }: { view: RivalPlacesView; opened: Place }) {
  const sides = sideOrder(view);
  return (
    <div className={[audit.card, styles.gridCard, styles.gridOnly].join(' ')}>
      <div className={styles.gridScroll}>
        <table className={styles.placeGrid}>
          <thead>
            <tr>
              <th scope="col">Place</th>
              {sides.map((side) => (
                <th key={side.id} scope="col">
                  {side.you ? 'You' : side.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {view.places.map((place) => (
              <tr key={place.key} className={place.key === opened ? styles.gridOpen : undefined}>
                <th scope="row">
                  <Link href={placeHref(place.key)} scroll={false} className={styles.gridPlace} aria-current={place.key === opened ? 'true' : undefined}>
                    <Icon name={PLACE_ICONS[place.key]} size={16} />
                    {place.name}
                  </Link>
                </th>
                {sides.map((side) => (
                  <td key={side.id} className={place.cells[side.id]?.leads && place.key !== opened ? styles.gridLead : undefined}>
                    <PlaceWord place={place} side={side} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={audit.quiet}>Website, Google and Social media say who leads. What people say and Other places show what was found for each side. Open a place to see it check by check.</p>
    </div>
  );
}

/** On a phone: a card per place, each side in a row. */
function PlaceCards({ view }: { view: RivalPlacesView }) {
  const sides = sideOrder(view);
  return (
    <div className={[styles.placeCards, styles.cardsOnly].join(' ')}>
      {view.places.map((place) => (
        <section key={place.key} className={audit.card} aria-labelledby={`place-card-${place.key}`}>
          <div className={styles.placeCardHead}>
            <h3 id={`place-card-${place.key}`} className={audit.cardTitle}>
              <Link href={placeHref(place.key)} scroll={false} className={styles.placeCardTitle}>
                <Icon name={PLACE_ICONS[place.key]} size={18} />
                {place.name}
              </Link>
            </h3>
            <span className={audit.quiet}>{placeLeadText(place, sides)}</span>
          </div>
          <ul className={styles.sideRows}>
            {sides.map((side) => {
              const cell = place.cells[side.id];
              return (
                <li key={side.id} className={[styles.sideRow, side.you ? styles.sideRowYou : ''].join(' ')}>
                  <span className={styles.sideRowName}>
                    {side.you ? 'You' : side.name}
                    {cell?.leads ? <span className={styles.leadsMark}>Leads</span> : null}
                  </span>
                  {place.scored && cell?.word ? (
                    <ResultBar result={WORD_RESULT[cell.word]} share={cell.share ?? 0} showPoints={false} size="sm" />
                  ) : (
                    <span className={styles.gridNote}>{place.scored ? 'Not checked yet' : (cell?.note ?? 'Not checked yet')}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Place by place: the table on a wide page, the cards on a phone. */
export function PlacesBoard({ view, opened }: { view: RivalPlacesView; opened: Place }) {
  return (
    <div className={styles.board}>
      <PlaceGrid view={view} opened={opened} />
      <PlaceCards view={view} />
    </div>
  );
}

function Result({ cell }: { cell: AcrossCell | null | undefined }) {
  const summary = cell?.summary;
  if (!summary || summary.kind === 'none') return <span className={styles.gridNote}>Not checked</span>;
  return summary.kind === 'single' ? (
    <ResultBar result={summary.result} share={summary.share} showPoints={false} size="sm" />
  ) : (
    <ResultBar result={summary.weakest.result} share={summary.weakest.share} showPoints={false} size="sm" />
  );
}

/** A finding as one row: its kind, the line, the link and the date. */
function FindingRow({ finding }: { finding: StoredFinding }) {
  return (
    <li className={styles.findingRow}>
      <span>
        <Tag strong={finding.kind === 'bad' || finding.kind === 'unanswered'}>{FINDING_KIND_LABELS[finding.kind]}</Tag> <span className={audit.strongText}>{finding.sourceName}</span>
      </span>
      <ProofLine proof={{ url: finding.sourceUrl, date: finding.checkedAt, line: finding.line, program: null, byTeam: false }} compact />
    </li>
  );
}

/**
 * The opened place. Website, Google and Social media: each check, each side's result and who
 * leads, opening the check panel, then what to learn from the one ahead. What people say and Other
 * places: what was found for each side, with its link and date.
 */
export function PlaceDetail({
  place,
  view,
  rows,
  sides,
  lesson,
  institutionType,
  city,
}: {
  place: PlaceRow;
  view: RivalPlacesView;
  /** The place's checks across you and your rivals. */
  rows: readonly AcrossRow[];
  sides: readonly PlaceSide[];
  lesson: PlaceLesson | null;
  institutionType: InstitutionType;
  city: string;
}) {
  const ordered = sideOrder(view);
  const title = (
    <h3 className={audit.cardTitle}>
      <Icon name={PLACE_ICONS[place.key]} size={18} />
      {place.name}, {place.scored ? 'check by check' : 'what was found'}
    </h3>
  );
  if (!place.scored) {
    return (
      <section id="opened" className={[audit.card, styles.opened].join(' ')} aria-label={`${place.name}, what was found`}>
        <div className={styles.placeCardHead}>
          {title}
          <span className={audit.quiet}>No leader here: what was found for each side</span>
        </div>
        <div className={styles.sideFindings}>
          {ordered.map((side) => {
            const found = (sides.find((candidate) => candidate.id === side.id)?.findings ?? []).filter((finding) => finding.place === place.key);
            return (
              <div key={side.id} className={styles.sideFinding}>
                <p className={styles.sideFindingHead}>
                  <span>{side.you ? 'You' : side.name}</span>
                  <span className={audit.quiet}>{place.cells[side.id]?.note ?? 'Not checked yet'}</span>
                </p>
                {found.length ? (
                  <ul className={styles.findingList}>
                    {found.map((finding) => (
                      <FindingRow key={finding.id} finding={finding} />
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    );
  }
  const checks = checksForPlace(place.key).flatMap((definition) => rows.filter((row) => row.key === definition.key));
  return (
    <section id="opened" className={[audit.card, styles.opened].join(' ')} aria-label={`${place.name}, check by check`}>
      <div className={styles.placeCardHead}>
        {title}
        <span className={audit.quiet}>Open a check to see what was found for each side</span>
      </div>
      {checks.length ? (
        <div className={styles.gridScroll}>
          <table className={[styles.placeGrid, ordered.length <= 2 ? styles.placeGridNarrow : ''].join(' ')}>
            <thead>
              <tr>
                <th scope="col">Check</th>
                {ordered.map((side) => (
                  <th key={side.id} scope="col">
                    {side.you ? 'You' : side.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {checks.map((row) => (
                <tr key={row.key}>
                  <th scope="row">
                    <Link href={checkHref(place.key, row.key)} scroll={false} className={styles.checkLink}>
                      <CheckIcon check={row.key} size={15} />
                      {rivalCheckName(row.key, institutionType, city)}
                    </Link>
                  </th>
                  {ordered.map((side) => {
                    const leads = (row.lead === 'rival' && row.leaders.includes(side.id)) || (row.lead === 'you' && side.you);
                    return (
                      <td key={side.id} className={leads ? styles.gridLead : undefined}>
                        <span className={styles.gridCell}>
                          <Result cell={row.cells[side.id]} />
                          {leads ? <span className={styles.leadsMark}>Leads</span> : null}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={audit.quiet}>Check by check shows once your Audit and a rival&apos;s have been compared.</p>
      )}
      {lesson ? (
        <p className={styles.learn}>
          <span className={styles.learnLabel}>{lesson.title}</span>
          {lesson.text}
        </p>
      ) : null}
    </section>
  );
}

/** What to learn from them: this month's lessons. Take the idea, never copy. */
export function LessonList({ lessons, names, empty }: { lessons: readonly ActionRow[]; names: ReadonlyMap<string, string>; empty: ReactNode }) {
  if (lessons.length === 0) return <div className={audit.card}>{empty}</div>;
  return (
    <div className={audit.card}>
      <ol className={styles.lessons}>
        {lessons.map((lesson, index) => (
          <li key={`${lesson.rank}-${lesson.text}`} className={styles.lesson}>
            <span className={`${styles.lessonIndex} num`}>{index + 1}</span>
            <span className={styles.lessonBody}>
              <span className={styles.lessonFrom}>From {lesson.rivalId ? (names.get(lesson.rivalId) ?? 'a rival') : 'your rivals'}</span>
              {lesson.checkKey ? (
                <Link href={checkHref(getCheck(lesson.checkKey).place, lesson.checkKey)} scroll={false} className={[styles.lessonTitle, styles.checkLink].join(' ')}>
                  {lesson.text}
                </Link>
              ) : (
                <span className={styles.lessonTitle}>{lesson.text}</span>
              )}
              {lesson.detail ? <span className={audit.quiet}>{lesson.detail}</span> : null}
              {lesson.effort ? (
                <span className={audit.tags}>
                  <Tag>Effort {EFFORT_LABELS[lesson.effort]}</Tag>
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Alerts, newest first: what changed, who, and where it was found. */
export function AlertList({ alerts, names, showRival = true, empty }: { alerts: readonly MoveRow[]; names: ReadonlyMap<string, string>; showRival?: boolean; empty: string }) {
  if (alerts.length === 0) {
    return (
      <div className={audit.card}>
        <p className={audit.quiet}>{empty}</p>
      </div>
    );
  }
  return (
    <div className={audit.card}>
      <ul className={styles.alerts}>
        {alerts.map((alert) => (
          <li key={alert.id} className={styles.alertRow}>
            <span className={styles.alertDay}>{formatDate(alert.detectedAt)}</span>
            <span className={styles.alertBody}>
              <span className={styles.alertHead}>
                <Tag strong={alert.kind === 'started_ads' || alert.kind === 'reviews_jump'}>{MOVE_KIND_LABELS[alert.kind]}</Tag>
                {showRival ? <span className={audit.strongText}>{names.get(alert.rivalId) ?? 'A rival'}</span> : null}
              </span>
              <span>{alert.description}</span>
              <span className={styles.alertSource}>
                {alert.kind === 'started_ads' ? <span>Entered by the AdmitLabs team</span> : null}
                <a href={alert.sourceUrl} target="_blank" rel="noreferrer">
                  {hostAndPath(alert.sourceUrl)}
                  <span className="visually-hidden"> (opens in a new tab)</span>
                </a>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Free: ahead or behind each rival, no scores and no order that hints at one. Until your own first Audit is ready, the rivals only. */
export function FreeStandings({ standings, hasAudit }: { standings: ReadonlyArray<{ id: string; name: string; nearby: boolean; standing: Standing }>; hasAudit: boolean }) {
  const order: Standing[] = ['ahead', 'level', 'behind', 'unscored'];
  const sorted = [...standings].sort((a, b) => order.indexOf(a.standing) - order.indexOf(b.standing) || a.name.localeCompare(b.name));
  return (
    <div className={audit.card}>
      <ul className={styles.standings}>
        {sorted.map((rival) => (
          <li key={rival.id} className={styles.standing}>
            <span className={styles.sideName}>
              {rival.name}
              {rival.nearby ? <Tag>Nearby city</Tag> : null}
            </span>
            <span className={styles.standingWord}>{hasAudit ? STANDING_LABELS[rival.standing] : 'After your first Audit'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
