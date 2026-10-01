import Link from 'next/link';
import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import styles from './Layout.module.css';

/**
 * The top of every redesigned page: the title (the same word as in the sidebar) and the one
 * question the page answers, with an optional caption and actions on the right.
 */
export function PageHead({
  title,
  question,
  caption,
  actions,
  titleAs: Title = 'h1',
}: {
  title: ReactNode;
  question: ReactNode;
  caption?: ReactNode;
  actions?: ReactNode;
  /** 'p' in a picture of a page (the product page), so the real page keeps its one h1. */
  titleAs?: 'h1' | 'p';
}) {
  return (
    <header className={styles.pageHead}>
      <div className={styles.pageHeadText}>
        <Title className={styles.pageHeadTitle}>{title}</Title>
        <p className={styles.pageHeadQuestion}>{question}</p>
        {caption ? <p className={styles.pageHeadCaption}>{caption}</p> : null}
      </div>
      {actions ? <div className={styles.pageActions}>{actions}</div> : null}
    </header>
  );
}

/** Page title block: eyebrow, title, description, actions. One per page. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className={styles.pageHeader}>
      <div className={styles.pageHeaderText}>
        {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
        <h1 className={styles.pageTitle}>{title}</h1>
        {description ? <p className={styles.pageDescription}>{description}</p> : null}
        {meta ? <div className={styles.pageMeta}>{meta}</div> : null}
      </div>
      {actions ? <div className={styles.pageActions}>{actions}</div> : null}
    </header>
  );
}

export function Section({
  title,
  description,
  actions,
  id,
  children,
  headingLevel = 2,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  id?: string;
  children: ReactNode;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className={styles.section} aria-labelledby={id ? `${id}-title` : undefined} id={id}>
      <div className={styles.sectionHead}>
        <div className={styles.sectionText}>
          <Heading id={id ? `${id}-title` : undefined} className={headingLevel === 2 ? styles.sectionTitle : styles.sectionTitleSmall}>
            {title}
          </Heading>
          {description ? <p className={styles.sectionDescription}>{description}</p> : null}
        </div>
        {actions ? <div className={styles.sectionActions}>{actions}</div> : null}
      </div>
      {children}
    </section>
  );
}

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** An inverted block: the loudest thing on the page. Use sparingly. */
  inverted?: boolean;
  interactive?: boolean;
}

export function Card({ as: Tag = 'div', padding = 'md', inverted, interactive, className, children, ...rest }: CardProps) {
  return (
    <Tag
      className={[styles.card, styles[`pad-${padding}`], inverted ? `invert ${styles.inverted}` : '', interactive ? styles.interactive : '', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** A whole card that links somewhere. */
export function CardLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={[styles.card, styles['pad-md'], styles.interactive, styles.cardLink, className].filter(Boolean).join(' ')}>
      {children}
    </Link>
  );
}

/** A small uppercase label above a title, like "01 / Audit". */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={[styles.eyebrow, className].filter(Boolean).join(' ')}>{children}</p>;
}

/** An inverted word inside a headline, as on admitlabs.in. Works inside inverted blocks too. */
export function Highlight({ children }: { children: ReactNode }) {
  return <mark className={styles.highlight}>{children}</mark>;
}

/** Label and value pairs, for facts like plan dates. */
export function FactList({ items }: { items: ReadonlyArray<{ label: string; value: ReactNode }> }) {
  return (
    <dl className={styles.facts}>
      {items.map((item) => (
        <div key={item.label} className={styles.fact}>
          <dt>{item.label}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
