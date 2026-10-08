// The Client Brain's shared pieces (spec section 26): a fact's row with where it came from and
// when, the one loud tag (Needs checking), links with a neutral icon and their place's name, the
// password note, Ask the brain, the status card and the list of sections.

import Link from 'next/link';
import type { ReactNode } from 'react';
import { BRAIN_SECTIONS, SECTION_INFO, type BrainSection } from '@/brain/model';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { KpiBar } from '@/components/ui/Kpi';
import { BrandLogo } from '@/components/ui/Marks';
import { formatDate, hostAndPath } from '@/domain/format';
import styles from './brain.module.css';

export const QUESTION = 'What does our AdmitLabs team know about us?';

/** A Brain page's address with its query: the section open, a form, a fact's history, a question. */
export function brainHref(base: string, params: { section?: BrainSection | 'overview' | null; edit?: string | null; history?: string | null; ask?: string | null; hash?: string }): string {
  const query = new URLSearchParams();
  if (params.section && params.section !== 'overview') query.set('section', params.section);
  if (params.edit) query.set('edit', params.edit);
  if (params.history) query.set('history', params.history);
  if (params.ask) query.set('ask', params.ask);
  const text = query.toString();
  return `${base}${text ? `?${text}` : ''}${params.hash ? `#${params.hash}` : ''}`;
}

/** The icon for a link, by its address: the real one-colour logo for Instagram and YouTube, a line icon for every other place. */
export function LinkLine({ href, text, label }: { href: string; text?: string; label?: string }) {
  const host = (() => {
    try {
      return new URL(href).hostname.toLowerCase();
    } catch {
      return '';
    }
  })();
  const brand = host.includes('instagram') ? 'instagram' : host.includes('youtube') ? 'youtube' : null;
  const place: { name: string; icon: IconName } = host.includes('drive.google') || host.includes('drive.')
    ? { name: 'Google Drive', icon: 'folder' }
    : host.includes('docs.google')
      ? { name: 'Google Docs', icon: 'note' }
      : host.includes('facebook')
        ? { name: 'Facebook', icon: 'share' }
        : host.includes('maps') || host.includes('google')
          ? { name: 'Google', icon: 'mapPin' }
          : { name: 'Website', icon: 'globe' };
  return (
    <span className={styles.linkLine}>
      <span className={styles.linkKind}>
        {brand ? <BrandLogo brand={brand} size={14} /> : <Icon name={place.icon} size={14} />}
        {label ?? (brand === 'instagram' ? 'Instagram' : brand === 'youtube' ? 'YouTube' : place.name)}
      </span>
      <a href={href} className={styles.link} target="_blank" rel="noreferrer">
        {text ?? hostAndPath(href)}
        <Icon name="external" size={12} />
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
    </span>
  );
}

/** The one loud tag: a fact old enough to check again. */
export function NeedsChecking() {
  return (
    <span className={`invert ${styles.checkTag}`}>
      <Icon name="history" size={12} />
      Needs checking
    </span>
  );
}

export function StateTag({ children }: { children: ReactNode }) {
  return <span className={styles.stateTag}>{children}</span>;
}

/** On every Brain page. */
export function PasswordNote({ team = false }: { team?: boolean }) {
  return (
    <p className={styles.passwordNote}>
      <Icon name="lock" size={14} />
      <span>No passwords or logins here. Use a password manager. For social media, {team ? 'the team gets' : 'your AdmitLabs team gets'} access through each platform’s own invite.</span>
    </p>
  );
}

/** Ask the brain: a plain form, so the answer comes back with the page. */
export function AskBox({ action, value = '', example, section }: { action: string; value?: string; example: string; section?: string | null }) {
  return (
    <form className={styles.ask} role="search" aria-label="Ask the brain" action={action}>
      <label htmlFor="ask" className={styles.askLabel}>
        <Icon name="search" size={18} />
        <span>Ask the brain</span>
      </label>
      {section ? <input type="hidden" name="section" value={section} /> : null}
      <input id="ask" name="ask" className={styles.askInput} defaultValue={value} placeholder={example} autoComplete="off" maxLength={200} />
      <Button type="submit" size="sm">
        Ask
      </Button>
    </form>
  );
}

export interface BandCell {
  label: string;
  word?: string;
  number?: number;
  suffix?: string;
  bar?: number;
  note: string;
}

/** Three cards side by side; on a phone, one card with a row each. */
export function Band({ cells, label }: { cells: readonly BandCell[]; label: string }) {
  return (
    <section className={styles.band} aria-label={label}>
      {cells.map((cell) => (
        <div key={cell.label} className={styles.cell}>
          <p className={styles.cellLabel}>{cell.label}</p>
          {cell.word ? (
            <p className={styles.cellWord}>{cell.word}</p>
          ) : (
            <p className={styles.cellValue}>
              <span className="num">{cell.number}</span>
              {cell.suffix ? <span className={cell.suffix === '%' ? `${styles.cellSuffix} num` : styles.cellSuffix}>{cell.suffix}</span> : null}
            </p>
          )}
          {cell.bar !== undefined ? (
            <span className={styles.cellBar}>
              <KpiBar value={cell.bar} />
            </span>
          ) : null}
          <p className={styles.cellNote}>{cell.note}</p>
        </div>
      ))}
    </section>
  );
}

/** The sections as a list on the left (a row on a phone), each opening at its own address. */
export function SectionNav({ base, current, flags, hints }: { base: string; current: BrainSection | 'overview'; flags: Partial<Record<BrainSection, string>>; hints?: Partial<Record<BrainSection, string>> }) {
  return (
    <nav aria-label="Brain sections">
      <ul className={styles.nav}>
        <li>
          <Link href={base} className={styles.navItem} aria-current={current === 'overview' ? 'page' : undefined} scroll={false}>
            <span className={styles.navName}>
              <Icon name="brain" size={16} />
              Overview
            </span>
            <span className={styles.navHint}>To check, missing, changes</span>
          </Link>
        </li>
        {BRAIN_SECTIONS.map((id) => (
          <li key={id}>
            <Link href={brainHref(base, { section: id })} className={styles.navItem} aria-current={current === id ? 'page' : undefined} scroll={false}>
              <span className={styles.navName}>
                <Icon name={SECTION_INFO[id].icon} size={16} />
                {SECTION_INFO[id].name}
                {flags[id] ? <span className={styles.navFlag}>{flags[id]}</span> : null}
              </span>
              <span className={styles.navHint}>{hints?.[id] ?? SECTION_INFO[id].hint}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SectionHead({ section, title }: { section: BrainSection; title?: string }) {
  const info = SECTION_INFO[section];
  return (
    <div className={styles.sectionHead}>
      <h2 className={styles.sectionTitle}>
        <Icon name={info.icon} size={20} className={styles.sectionIcon} />
        {title ?? info.name}
      </h2>
      <p className={styles.sectionIntro}>{info.intro}</p>
    </div>
  );
}

/** "Added by Ritu Bora, 6 Mar 2026", "Found by Drishti on collegeguide.example, 1 Oct 2026". */
export function stampText(verb: string, who: string, at: string): string {
  return `${verb} by ${who}, ${formatDate(at)}`;
}
