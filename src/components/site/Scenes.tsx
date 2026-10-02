// The three moments a student lives, as small pieces of real product: a search where the
// institution is the answer, a review and its proof, and an enquiry that someone receives. Made
// up (src/site/scenes.ts), decorative, and drawn in HTML so they stay sharp and light. Parts
// marked `wide` show only where there is room (the shared stage on a wide screen).

import { Icon, type IconName } from '@/components/ui/Icon';
import { ENQUIRY_SCENE, INSTITUTION, REVIEW, SEARCH } from '@/site/scenes';
import styles from './system.module.css';

export function SearchScene() {
  return (
    <div className={styles.search}>
      <p className={styles.searchBar}>
        <Icon name="search" size={17} />
        <span className={styles.query}>{SEARCH.query}</span>
        <span className={styles.caret} />
      </p>
      <div className={`${styles.answer} ${styles.wide}`}>
        <p className={styles.answerLabel}>
          <Icon name="spark" size={14} />
          {SEARCH.ai.label}
        </p>
        <p className={styles.answerText}>
          <strong>{SEARCH.ai.lead}</strong> {SEARCH.ai.rest}
        </p>
        <span className={styles.source}>{INSTITUTION.site}</span>
      </div>
      <div className={`${styles.result} ${styles.top}`}>
        <span className={styles.favicon}>{SEARCH.top.initial}</span>
        <div>
          <p className={styles.site}>
            <strong>{SEARCH.top.name}</strong>
            {SEARCH.top.path}
          </p>
          <p className={styles.resultTitle}>{SEARCH.top.title}</p>
          <p className={styles.resultLine}>{SEARCH.top.line}</p>
        </div>
      </div>
      <div className={`${styles.result} ${styles.dim} ${styles.wide}`}>
        <span className={styles.favicon}>{SEARCH.next.initial}</span>
        <div>
          <p className={styles.site}>
            <strong>{SEARCH.next.name}</strong>
            {SEARCH.next.path}
          </p>
          <p className={styles.resultTitle}>{SEARCH.next.title}</p>
        </div>
      </div>
    </div>
  );
}

export function TrustScene() {
  return (
    <div className={styles.trust} data-theme="light">
      <div className={styles.rating}>
        <span className={`${styles.ratingValue} num`}>{REVIEW.rating}</span>
        <div>
          <span className={styles.stars}>
            {[0, 1, 2, 3, 4].map((star) => (
              <Icon key={star} name="star" size={15} fill="currentColor" strokeWidth={1} />
            ))}
          </span>
          <p className={styles.count}>
            <span className="num">{REVIEW.count}</span> {REVIEW.countLabel}
          </p>
        </div>
      </div>
      <p className={styles.quote}>{REVIEW.quote}</p>
      <p className={`${styles.author} ${styles.wide}`}>
        <span className={styles.avatar}>{REVIEW.initials}</span>
        {REVIEW.author}
      </p>
      <ul className={styles.proofs}>
        {REVIEW.proofs.map((proof, index) => (
          <li key={proof.label} className={index === 2 ? styles.wide : undefined}>
            <Icon name={proof.icon as IconName} size={16} />
            {proof.label}
            {proof.value ? <span className={`${styles.proofValue} num`}>{proof.value}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EnquiryScene() {
  return (
    <div className={styles.enquiryScene}>
      <div className={styles.enquiry}>
        <p className={styles.enquiryTitle}>{ENQUIRY_SCENE.title}</p>
        <p className={styles.facts}>
          {ENQUIRY_SCENE.facts.map((fact) => (
            <span key={fact.label}>
              {fact.label} <strong>{fact.value}</strong> {fact.rest}
            </span>
          ))}
        </p>
        {ENQUIRY_SCENE.fields.map((field, index) => (
          <div key={field.label} className={`${styles.field} ${index === 0 ? styles.wide : ''}`}>
            <p className={styles.fieldLabel}>{field.label}</p>
            <p className={`${styles.fieldBox} ${index === 1 ? styles.focus : ''}`}>
              <span className={styles.typed}>{field.value}</span>
            </p>
          </div>
        ))}
        <p className={styles.send}>
          {ENQUIRY_SCENE.send}
          <Icon name="arrowRight" size={15} />
        </p>
      </div>
      <p className={styles.received} data-theme="light">
        <Icon name="checkCircle" size={18} />
        {ENQUIRY_SCENE.received}
        <span>{ENQUIRY_SCENE.when}</span>
      </p>
    </div>
  );
}
