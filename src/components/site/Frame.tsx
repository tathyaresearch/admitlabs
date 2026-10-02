// The website's frame: two fine rails on the content column's edges, a rule across at the top and
// at the bottom, and a small cross where they meet. Decoration only, under the content. The
// section places the rules with --rule-top and --rule-bottom.

import styles from './site.module.css';

/** With `draw`, the lines draw in on load and the crosses follow (the hero). `bottom: false`
 *  leaves out the lower rule and its crosses; `rails: false` the two upright lines. */
export function Frame({ draw = false, bottom = true, rails = true }: { draw?: boolean; bottom?: boolean; rails?: boolean }) {
  return (
    <div className={`${styles.frame} ${draw ? styles.frameDraw : ''}`} aria-hidden="true">
      {rails ? (
        <>
          <span className={`${styles.rail} ${styles.railStart}`} />
          <span className={`${styles.rail} ${styles.railEnd}`} />
        </>
      ) : null}
      <span className={`${styles.rule} ${styles.ruleTop}`} />
      <span className={`${styles.mark} ${styles.markTopStart}`} />
      <span className={`${styles.mark} ${styles.markTopEnd}`} />
      {bottom ? (
        <>
          <span className={`${styles.rule} ${styles.ruleBottom}`} />
          <span className={`${styles.mark} ${styles.markBottomStart}`} />
          <span className={`${styles.mark} ${styles.markBottomEnd}`} />
        </>
      ) : null}
    </div>
  );
}
