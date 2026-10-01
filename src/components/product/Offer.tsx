// Plans, AdmitLabs clients and the FAQ. Prices, plan length and reminders come from config; the
// full comparison is the same table of what each plan sees that the dashboard's Plan page shows.

import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CellText } from '@/components/ui/Results';
import { ENTITLEMENTS, type EntitlementGroup } from '@/config/entitlements';
import { TIER_LABELS, TIERS } from '@/domain/types';
import { appLink } from '@/lib/urls';
import { CLIENTS, FAQ, FAQ_TITLE, PLANS } from '@/product/content';
import { Eyebrow } from './Sections';
import styles from './product.module.css';

const GROUPS: readonly EntitlementGroup[] = ['Audit', 'Rivals', 'Demand', 'Other'];

export function Plans() {
  return (
    <section id="plans" className={`${styles.section} ${styles.ruled}`} data-theme="dark" aria-labelledby="plans-title">
      <div className={styles.container}>
        <div className={`${styles.head} ${styles.headCenter}`}>
          <Eyebrow>Plans</Eyebrow>
          <h2 id="plans-title" className={styles.title}>
            {PLANS.title[0]}{' '}
            <br />
            {PLANS.title[1]}
          </h2>
          <p className={styles.lede}>{PLANS.lede}</p>
        </div>
        <ul className={styles.plans}>
          {PLANS.cards.map((card) => (
            <li key={card.key} className={`${styles.plan} ${card.key === 'paid' ? 'invert' : ''} ${styles.reveal}`} aria-labelledby={`plan-${card.key}`}>
              <div className={styles.planTop}>
                <h3 id={`plan-${card.key}`} className={styles.planName}>
                  {card.name}
                </h3>
                <p className={styles.price}>
                  <span className={`${styles.priceValue} num`}>{card.price}</span>
                  <span className={styles.priceTerm}>{card.term}</span>
                </p>
                <p className={styles.planLine}>{card.line}</p>
              </div>
              <ul className={styles.points}>
                {card.points.map((point) => (
                  <li key={point} className={styles.point}>
                    <Icon name="check" size={16} />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <div className={styles.planFoot}>
                <ButtonLink href={appLink('/login')} variant={card.key === 'paid' ? 'primary' : 'secondary'} block iconAfter="arrowRight">
                  {card.cta}
                </ButtonLink>
                {card.note ? <p className={styles.planNote}>{card.note}</p> : null}
              </div>
            </li>
          ))}
        </ul>
        <p className={styles.fine}>{PLANS.fine}</p>
        <details className={styles.compare}>
          <summary className={styles.compareSummary}>
            Compare every feature
            <Icon name="chevronDown" size={16} />
          </summary>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <caption className="visually-hidden">What each plan sees, by feature</caption>
              <thead>
                <tr>
                  <th scope="col">Feature</th>
                  {TIERS.map((tier) => (
                    <th key={tier} scope="col">
                      {TIER_LABELS[tier]}
                    </th>
                  ))}
                </tr>
              </thead>
              {GROUPS.map((group) => (
                <tbody key={group}>
                  <tr className={styles.groupRow}>
                    <th scope="colgroup" colSpan={TIERS.length + 1}>
                      {group}
                    </th>
                  </tr>
                  {ENTITLEMENTS.filter((row) => row.group === group).map((row) => (
                    <tr key={row.key}>
                      <th scope="row">{row.label}</th>
                      {TIERS.map((tier) => (
                        <td key={tier} className={row.cells[tier].access === 'none' ? styles.no : undefined}>
                          <CellText text={row.cells[tier].text} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              ))}
            </table>
          </div>
        </details>
      </div>
    </section>
  );
}

export function ForClients() {
  return (
    <section className={styles.section} data-theme="dark" aria-labelledby="clients-title">
      <div className={styles.container}>
        <div className={`${styles.clients} invert ${styles.reveal}`}>
          <div className={styles.head} style={{ marginBottom: 0 }}>
            <Eyebrow>{CLIENTS.eyebrow}</Eyebrow>
            <h2 id="clients-title" className={styles.title}>
              {CLIENTS.title[0]}{' '}
              <br />
              {CLIENTS.title[1]}
            </h2>
            <p className={styles.lede}>{CLIENTS.text}</p>
          </div>
          <div className={styles.clientsSide}>
            <p className={styles.clientsLine}>{CLIENTS.line}</p>
            <AnchorButton href={`mailto:${CLIENTS.email}`} icon="mail">
              {CLIENTS.cta}
            </AnchorButton>
            <p className={styles.clientsEmail}>{CLIENTS.email}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className={`${styles.section} ${styles.ruled}`} data-theme="dark" aria-labelledby="faq-title">
      <div className={`${styles.container} ${styles.faqGrid}`}>
        <div className={styles.head}>
          <Eyebrow>FAQ</Eyebrow>
          <h2 id="faq-title" className={styles.title}>
            {FAQ_TITLE}
          </h2>
          <p className={styles.lede}>
            Something else? Write to <a href={`mailto:${CLIENTS.email}`}>{CLIENTS.email}</a>.
          </p>
        </div>
        <div className={styles.faqList}>
          {FAQ.map((item) => (
            <details key={item.question} className={styles.faqItem}>
              <summary className={styles.faqQuestion}>
                {item.question}
                <Icon name="plus" size={18} />
              </summary>
              <p className={styles.faqAnswer}>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
