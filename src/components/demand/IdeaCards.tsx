// 5 content ideas (spec 9.4): numbered cards, like "Fix these first". Each one is built on a
// real student question, and shows how often it was asked, where, and in which language.

import { countWords, LANGUAGE_TAGS, PLATFORM_LABELS } from '@/demand/text';
import type { IdeaRow } from '@/demand/view';
import { Source } from './Source';
import audit from '@/components/audit/audit.module.css';
import styles from './demand.module.css';

export function IdeaCards({ ideas, showProgram }: { ideas: readonly IdeaRow[]; showProgram: boolean }) {
  return (
    <ol className={styles.ideaGrid}>
      {ideas.map((idea, index) => {
        const question = idea.question;
        const platform = typeof question?.meta.platform === 'string' ? question.meta.platform : null;
        const language = question ? LANGUAGE_TAGS[question.language] : null;
        return (
          <li key={idea.key}>
            <article className={styles.idea}>
              <span className={styles.ideaTop}>
                <span className={`${audit.fixNumber} num`}>
                  <span className="visually-hidden">Idea </span>
                  {index + 1}
                </span>
                {showProgram ? <span className={styles.ideaTag}>{idea.programName}</span> : null}
              </span>
              <p className={styles.ideaText}>{idea.text}</p>
              {question ? (
                <p className={styles.ideaBasis}>
                  <span className={styles.ideaBasisLabel}>Built on a real question</span>
                  &ldquo;{question.text}&rdquo;
                </p>
              ) : null}
              <p className={styles.ideaFoot}>
                <span>
                  {question ? countWords('question', question.count) : 'A real student question'}
                  {platform ? ` on ${PLATFORM_LABELS[platform] ?? platform}` : ''}
                  {language ? `. ${language}` : ''}
                </span>
                <Source url={idea.sourceUrl} label="Where it was asked" />
              </p>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
