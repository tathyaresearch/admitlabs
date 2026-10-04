// Home's smaller cards (spec section 13), as the version 2 mock was approved: the rivals' one line
// with the latest alert, one demand highlight in honest words (a count only when the keyword tool
// gives one), and for a Client the month's enquiries. Server components.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { MonthBars, type MonthCount } from '@/components/charts/MonthBars';
import { Found, TrendWordLabel } from '@/components/demand/Signals';
import { Icon, type IconName } from '@/components/ui/Icon';
import { trendWord } from '@/demand/text';
import { previousMonth } from '@/domain/dates';
import { formatCount, formatDate, formatMonthName, plural } from '@/domain/format';
import { soFarWords, type LeadsSummary } from '@/leads/summary';
import type { Highlight } from '@/lib/demand/load';
import type { RivalMove } from '@/lib/home/load';
import audit from '@/components/audit/places.module.css';
import styles from './today.module.css';

function Card({ id, icon, title, link, children }: { id: string; icon: IconName; title: string; link: { href: string; text: string } | null; children: ReactNode }) {
  return (
    <section className={`${audit.card} ${styles.growCard}`} aria-labelledby={id}>
      <div className={styles.cardHead}>
        <h2 id={id} className={audit.cardTitle}>
          <Icon name={icon} size={18} />
          {title}
        </h2>
        {link ? (
          <Link href={link.href} className={styles.headLink}>
            {link.text}
            <Icon name="arrowRight" size={16} />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/** The rivals' one line, with the latest alert on Paid and Client. */
export function RivalsLineCard({ city, line, latest, hasRivals, owner }: { city: string; line: string | null; latest: RivalMove | null; hasRivals: boolean; owner: boolean }) {
  if (!hasRivals) {
    return (
      <Card id="rivals-card-title" icon="rivals" title={`Your rivals in ${city}`} link={owner ? { href: '/rivals/choose', text: 'Pick rivals' } : { href: '/rivals', text: 'Open Rivals' }}>
        <p className={audit.quiet}>{owner ? 'Pick the colleges you compete with. They never know who tracks them.' : 'The owner of your account picks the rivals to track.'}</p>
      </Card>
    );
  }
  return (
    <Card id="rivals-card-title" icon="rivals" title={`Your rivals in ${city}`} link={{ href: '/rivals', text: 'Open Rivals' }}>
      <p className={styles.oneLine}>{line ?? 'Your rivals are being checked. Where you stand shows here soon.'}</p>
      {latest ? (
        <p className={`${audit.quiet} ${styles.foot}`}>
          Latest: <span className={audit.strongText}>{latest.rivalName}</span> {latest.description}, {formatDate(latest.detectedAt)}.
        </p>
      ) : null}
    </Card>
  );
}

/** One demand highlight: the fastest rise for your programs, in words, with its source. */
export function DemandHighlightCard({ highlight, history, city, nextUpdate }: { highlight: Highlight | null; history: readonly MonthCount[]; city: string; nextUpdate: string }) {
  if (!highlight) {
    return (
      <Card id="demand-card-title" icon="demand" title="What students want" link={{ href: '/demand', text: 'Open Demand' }}>
        <p className={audit.quiet}>What students in {city} search for and ask shows here after the next update, on {nextUpdate}. It is grouped, never personal.</p>
      </Card>
    );
  }
  const word = trendWord(highlight.changePct);
  return (
    <Card id="demand-card-title" icon="demand" title="What students want" link={{ href: '/demand', text: 'Open Demand' }}>
      <p className={audit.quiet}>Rising fastest in {highlight.region} this month</p>
      <p className={styles.oneLine}>{highlight.text}</p>
      <p className={styles.metaLine}>
        <TrendWordLabel word={word} />
        <span>{highlight.programName}</span>
        {highlight.count !== null ? (
          <span>
            About <span className="num">{formatCount(highlight.count)}</span> searches a month
          </span>
        ) : null}
        <Found url={highlight.countSource ?? highlight.sourceUrl} platform={highlight.countSource ? 'keywords' : 'trends'} at={highlight.foundAt} />
      </p>
      <MonthBars points={history} title="Searches by month" valueLabel="Searches" grow />
    </Card>
  );
}

/** A Client's enquiries this month, against last month to the same day, the link that brought the most, and the months before. */
export function EnquiriesCard({ summary, thisMonth, lastMonth }: { summary: LeadsSummary; thisMonth: string; lastMonth: string }) {
  const months: MonthCount[] = [
    { month: previousMonth(lastMonth), count: summary.monthBefore },
    { month: lastMonth, count: summary.lastMonth },
    { month: thisMonth, count: summary.thisMonth },
  ];
  return (
    <Card id="enquiries-card-title" icon="enquiry" title="Enquiries this month" link={{ href: '/leads', text: 'See all leads' }}>
      <p className={styles.kpiLine}>
        <span className={`${styles.kpiValue} num`}>{formatCount(summary.thisMonth)}</span>
        <span className={audit.quiet}>{soFarWords(summary.thisMonth, summary.lastMonthToDate, lastMonth)}</span>
      </p>
      {summary.top ? (
        <p className={audit.quiet}>
          Most {summary.top.month === 'this' ? 'this month' : `in ${formatMonthName(lastMonth)}`} from <span className={audit.strongText}>{summary.top.link.name}</span>: {plural(summary.top.count, 'enquiry', 'enquiries')}
        </p>
      ) : (
        <p className={audit.quiet}>Each enquiry your content brings shows here as it arrives.</p>
      )}
      <MonthBars points={months} title="Enquiries by month" valueLabel="Enquiries" grow />
    </Card>
  );
}
