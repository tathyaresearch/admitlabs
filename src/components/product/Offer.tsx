// Plans, AdmitLabs clients and the FAQ. Prices, plan length and reminders come from config; the
// full comparison is the same table of what each plan sees that the dashboard's Plan page shows.

import { AnchorButton, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { CellText } from '@/components/ui/Results';
import { ENTITLEMENTS, type EntitlementGroup } from '@/config/entitlements';
import { TIER_LABELS, TIERS } from '@/domain/types';
import { appLink } from '@/lib/urls';
import { CLIENTS, FAQ, FAQ_TITLE, PLANS } from '@/product/content';
import sections from '@/components/site/sections.module.css';
import site from '@/components/site/site.module.css';
import { Title, vars } from './Sections';
import styles from './product.module.css';

const GROUPS: readonly EntitlementGroup[] = ['Audit', 'Rivals', 'Demand', 'Other'];

/** Free and Paid side by side, Paid on ivory, then the fine print and every feature compared. */
export function Plans() {
  return (
    <section id="plans" className={styles.plans} data-theme="dark" aria-labelledby="plans-title">
      <div className={site.container}>
        <div className={`${styles.plansHead} ${site.reveal}`}>
          <Title id="plans-title" lines={PLANS.title} />
          <p className={`${site.lede} ${styles.lede}`}>{PLANS.lede}</p>
        </div>
        <ul className={styles.planList}>
          {PLANS.cards.map((card, index) => {
            const paid = card.key === 'paid';
            return (
              <li
                key={card.key}
                className={`${styles.plan} ${paid ? styles.planPaid : ''} ${site.reveal}`}
                style={vars({ '--order': index })}
                data-theme={paid ? 'light' : 'dark'}
                aria-labelledby={`plan-${card.key}`}
              >
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
                  <ButtonLink href={appLink('/login')} variant={paid ? 'primary' : 'secondary'} size="lg" block iconAfter="arrowRight" className={paid ? site.ctaInk : site.ghost}>
                    {card.cta}
                  </ButtonLink>
                  {card.note ? <p className={styles.planNote}>{card.note}</p> : null}
                </div>
              </li>
            );
          })}
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

/** For AdmitLabs clients: one ivory block, the promise and who to write to. */
export function ForClients() {
  return (
    <section className={styles.clientsSection} data-theme="dark" aria-labelledby="clients-title">
      <div className={site.container}>
        <div className={`${styles.clients} ${site.reveal}`} data-theme="light">
          <div className={styles.clientsWords}>
            <Title id="clients-title" lines={CLIENTS.title} light={false} />
            <p className={styles.clientsFor}>{CLIENTS.forWhom}</p>
            <p className={styles.clientsText}>{CLIENTS.text}</p>
          </div>
          <div className={styles.clientsSide}>
            <p className={styles.clientsLine}>{CLIENTS.line}</p>
            <AnchorButton href={`mailto:${CLIENTS.email}`} icon="mail" size="lg" className={site.ctaInk}>
              {CLIENTS.cta}
            </AnchorButton>
            <p className={styles.clientsEmail}>{CLIENTS.email}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

/** The website's FAQ, with the product's questions. */
export function Faq() {
  return (
    <section id="faq" className={`${sections.faq} ${site.grain}`} data-theme="dark" aria-labelledby="faq-title">
      <div className={`${site.container} ${sections.faqGrid}`}>
        <div className={`${sections.faqHead} ${site.reveal}`}>
          <h2 id="faq-title" className={`${site.title} ${site.titleLight} ${styles.heading}`}>
            {FAQ_TITLE}
          </h2>
          <p className={`${site.lede} ${styles.lede}`}>
            Something else? Write to <a href={`mailto:${CLIENTS.email}`}>{CLIENTS.email}</a>.
          </p>
        </div>
        <div className={sections.faqList}>
          {FAQ.map((item) => (
            <details key={item.question} className={`${sections.faqItem} ${site.reveal}`}>
              <summary className={sections.faqQuestion}>
                {item.question}
                <Icon name="plus" size={18} />
              </summary>
              <p className={sections.faqAnswer}>{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
