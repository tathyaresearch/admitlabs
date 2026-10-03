// Content ideas that say what to make (B6): the format and the program, the real question it
// answers (how often and where it was asked), the rising search behind it when there is one, and
// how big a job it is. The format and the effort are the ones stored with the idea.

import { Source } from '@/components/demand/Source';
import { Icon, type IconName } from '@/components/ui/Icon';
import { countWords, PLATFORM_LABELS } from '@/demand/text';
import type { IdeaRow } from '@/demand/view';
import { EFFORT_LABELS, IDEA_FORMAT_LABELS, LANGUAGE_LABELS, type IdeaFormat } from '@/domain/types';
import styles from './demand.module.css';

const FORMAT_ICONS: Readonly<Record<IdeaFormat, IconName>> = { post: 'grid', reel: 'video', video: 'video', faq: 'forum', page: 'webPage' };

export function IdeaList({ ideas, start = 1, place, showProgram }: { ideas: readonly IdeaRow[]; start?: number; place: string; showProgram: boolean }) {
  return (
    <ol className={styles.ideas} start={start}>
      {ideas.map((idea, index) => {
        const question = idea.question;
        const platform = typeof question?.meta.platform === 'string' ? question.meta.platform : null;
        const rise = idea.trend?.changePct === null || idea.trend?.changePct === undefined ? null : Math.round(idea.trend.changePct);
        return (
          <li key={idea.key} className={styles.idea}>
            <span className={`${styles.ideaNumber} num`} aria-hidden="true">
              {start + index}
            </span>
            <div className={styles.ideaMain}>
              <div className={styles.ideaBody}>
                {idea.format || showProgram ? (
                  <p className={styles.ideaKicker}>
                    {idea.format ? (
                      <span className={styles.format}>
                        <Icon name={FORMAT_ICONS[idea.format]} size={13} />
                        {IDEA_FORMAT_LABELS[idea.format]}
                      </span>
                    ) : null}
                    {showProgram ? <span>For {idea.programName}</span> : null}
                  </p>
                ) : null}
                <p className={styles.ideaTitle}>{idea.text}</p>
                {question ? (
                  <div className={styles.ideaQuestion}>
                    <p className={styles.ideaQuote}>It answers: “{question.text}”</p>
                    <p className={styles.ideaMeta}>
                      <span>
                        {countWords('question', question.count)}
                        {platform ? ` on ${PLATFORM_LABELS[platform] ?? platform}` : ''}
                        {question.language !== 'en' ? `, in ${LANGUAGE_LABELS[question.language]}` : ''}
                      </span>
                      <Source url={question.sourceUrl} platform={platform ?? undefined} label="Where it was asked" />
                    </p>
                  </div>
                ) : null}
                {idea.trend ? (
                  <p className={styles.ideaTrend}>
                    <Icon name="arrowUp" size={14} />
                    <span>
                      Rising in {place}: {idea.trend.text}
                      {rise !== null && rise > 0 ? `, up ${rise}% since last month` : ''}
                    </span>
                  </p>
                ) : null}
              </div>
              {idea.effort ? (
                <p className={styles.ideaEffort}>
                  <span className={styles.ideaEffortLabel}>Effort</span>
                  {EFFORT_LABELS[idea.effort]}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
