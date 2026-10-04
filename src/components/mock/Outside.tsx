// Version 2 mock (Step 2, development only): what lives outside the dashboard. The public
// enquiry form a Client's tracking link opens, and the two emails (the monthly summary and the
// Audit ready email), shown as the local test inbox would show them.

import type { ReactNode } from 'react';
import { ProductLockup } from '@/components/ui/Brand';
import { Icon } from '@/components/ui/Icon';
import { EFFORT_LABELS } from '@/domain/types';
import { CLIENT_DEMAND, ENQUIRY_CARD, type MockRivals } from './data-more';
import type { MockAudit } from './model';
import styles from './mock.module.css';

// The public form -----------------------------------------------------------------------------------

function FormFields() {
  return (
    <div className={styles.formStack}>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Your name</span>
        <span className={styles.input}>&nbsp;</span>
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Phone</span>
        <span className={styles.input}>+91</span>
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Email</span>
        <span className={styles.input}>&nbsp;</span>
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Course</span>
        <span className={styles.input}>
          Data Analytics <Icon name="chevronDown" size={16} />
        </span>
      </label>
      <label className={styles.field}>
        <span className={styles.fieldLabel}>Your city</span>
        <span className={styles.input}>&nbsp;</span>
      </label>
      <p className={styles.consent}>Your details go to Brightpath Skills Academy so they can contact you about admission.</p>
      <span className={styles.submit}>Send my enquiry</span>
    </div>
  );
}

function FormFoot() {
  return (
    <p className={styles.formFoot}>
      A form by <ProductLockup size="sm" motion="still" byline={false} /> for Brightpath Skills Academy. Your details go to the academy only.
    </p>
  );
}

export function PublicFormView({ option, done = false }: { option: 1 | 2; done?: boolean }) {
  if (done) {
    return (
      <div className={styles.formPage} data-theme="light">
        <div className={styles.formCard}>
          <p className={styles.formCollege}>Brightpath Skills Academy</p>
          <Icon name="checkCircle" size={32} />
          <h1 className={styles.formThanks}>Thanks. Brightpath Skills Academy will contact you soon.</h1>
          <p className={styles.quiet}>You asked about Data Analytics. Keep your phone close: they usually call within a day.</p>
        </div>
        <FormFoot />
      </div>
    );
  }
  if (option === 2) {
    return (
      <div className={styles.formPage2} data-theme="light">
        <header className={`invert ${styles.formBand}`}>
          <p className={styles.formBandCollege}>Brightpath Skills Academy</p>
          <h1 className={styles.formBandTitle}>Ask about Data Analytics</h1>
          <p className={styles.formBandLine}>3 months, weekend batch too. Guwahati.</p>
        </header>
        <div className={styles.formBody}>
          <FormFields />
          <FormFoot />
        </div>
      </div>
    );
  }
  return (
    <div className={styles.formPage} data-theme="light">
      <div className={styles.formCard}>
        <p className={styles.formCollege}>Brightpath Skills Academy</p>
        <h1 className={styles.formTitle}>Ask about Data Analytics</h1>
        <p className={styles.quiet}>Leave your details and the admissions team will call you.</p>
        <FormFields />
      </div>
      <FormFoot />
    </div>
  );
}

// The emails ----------------------------------------------------------------------------------------

function MailFrame({ from, to, subject, children }: { from: string; to: string; subject: string; children: ReactNode }) {
  return (
    <div className={styles.mailPage} data-theme="light">
      <div className={styles.mailMeta}>
        <p className={styles.mailInbox}>
          <Icon name="mail" size={16} /> Local test inbox
        </p>
        <dl className={styles.mailHead}>
          <div>
            <dt>From</dt>
            <dd>{from}</dd>
          </div>
          <div>
            <dt>To</dt>
            <dd>{to}</dd>
          </div>
          <div>
            <dt>Subject</dt>
            <dd className={styles.strongText}>{subject}</dd>
          </div>
        </dl>
      </div>
      <article className={styles.mail}>
        <header className={`invert ${styles.mailTop}`}>
          <ProductLockup size="md" motion="still" />
        </header>
        <div className={styles.mailBody}>{children}</div>
        <footer className={styles.mailFoot}>You get this as part of your institution’s Drishti. Turn it off in Settings, Notifications. AdmitLabs, hello@admitlabs.in</footer>
      </article>
    </div>
  );
}

function MailWords({ audit }: { audit: MockAudit }) {
  return (
    <div className={styles.mailWords}>
      {audit.words.map((word) => (
        <div key={word.pillar} className={styles.mailWord}>
          <span className={styles.mailWordName}>{word.name}</span>
          <span className={styles.mailWordValue}>{word.word}</span>
          <span className={styles.mailWordNote}>{word.moved ?? word.question}</span>
        </div>
      ))}
    </div>
  );
}

export function SummaryEmailView({ audit, rivals }: { audit: MockAudit; rivals: MockRivals }) {
  const fix = audit.topFixes[0];
  const lesson = rivals.lessons[0];
  const idea = CLIENT_DEMAND.idea;
  const move = rivals.alerts[0];
  return (
    <MailFrame
      from="Drishti by AdmitLabs <hello@admitlabs.in>"
      to="owner@brightpath-skills.example"
      subject={`Your September: Visibility ${audit.words[0]?.word}, Trust ${audit.words[1]?.word}, Chosen ${audit.words[2]?.word}`}
    >
      <p className={styles.mailKicker}>September 2026 · {audit.name}</p>
      <h1 className={styles.mailTitle}>Here’s your month in short.</h1>
      <h2 className={styles.mailH2}>How you’re doing</h2>
      <MailWords audit={audit} />
      <h2 className={styles.mailH2}>3 things to do this month</h2>
      <ol className={styles.mailList}>
        {fix ? (
          <li>
            <span className={styles.strongText}>{fix.title}</span>
            <span className={styles.mailMetaLine}>
              From your Audit · Impact {fix.impact} · Effort {EFFORT_LABELS[fix.effort]}
            </span>
          </li>
        ) : null}
        {lesson ? (
          <li>
            <span className={styles.strongText}>{lesson.title}</span>
            <span className={styles.mailMetaLine}>Learned from {lesson.rival}</span>
          </li>
        ) : null}
        <li>
          <span className={styles.strongText}>{idea.title}</span>
          <span className={styles.mailMetaLine}>
            Make these 3 · {idea.format} · {idea.program}
          </span>
        </li>
      </ol>
      <h2 className={styles.mailH2}>One rival move</h2>
      {move ? (
        <p className={styles.mailText}>
          <span className={styles.strongText}>{move.rival}</span>: {move.text}
        </p>
      ) : null}
      <h2 className={styles.mailH2}>Your enquiries</h2>
      <p className={styles.mailText}>
        Your content brought <span className={styles.strongText}>{ENQUIRY_CARD.thisMonth} enquiries</span> in September, {ENQUIRY_CARD.change} more than in August. Most came from {ENQUIRY_CARD.topLink}.
      </p>
      <div className={styles.mailButtons}>
        <span className={styles.mailButton}>Open Drishti</span>
        <span className={styles.mailButtonQuiet}>Download the September report (PDF)</span>
      </div>
    </MailFrame>
  );
}

export function ReadyEmailView({ audit }: { audit: MockAudit }) {
  return (
    <MailFrame
      from="Drishti by AdmitLabs <hello@admitlabs.in>"
      to="owner@northbank-college.example"
      subject={`Your free Audit is ready: Visibility ${audit.words[0]?.word}, Trust ${audit.words[1]?.word}, Chosen ${audit.words[2]?.word}`}
    >
      <p className={styles.mailKicker}>Free Audit · {audit.name} · BBA</p>
      <h1 className={styles.mailTitle}>Your free Audit is ready.</h1>
      <p className={styles.mailText}>Drishti checked what students see about Northbank College on Google, your website, social media and more. The AdmitLabs team looked it over before it came to you.</p>
      <MailWords audit={audit} />
      <h2 className={styles.mailH2}>Fix these first</h2>
      <ol className={styles.mailList}>
        {audit.topFixes.map((fix) => (
          <li key={fix.id}>
            <span className={styles.strongText}>{fix.title}</span>
            <span className={styles.mailMetaLine}>
              {fix.label} · Impact {fix.impact} · Effort {EFFORT_LABELS[fix.effort]}
            </span>
            <span className={styles.mailLink}>Let AdmitLabs fix this</span>
          </li>
        ))}
      </ol>
      <div className={styles.mailButtons}>
        <span className={styles.mailButton}>See your Audit</span>
      </div>
      <div className={styles.mailBox}>
        <h2 className={styles.mailH2}>Want the full picture?</h2>
        <p className={styles.mailText}>Paid shows every check with its proof, all your programs, your rivals in full and what students in Guwahati ask, with a summary every month. ₹24,999 + GST for 6 months, no auto-renew.</p>
        <span className={styles.mailButtonQuiet}>Ask for Paid</span>
      </div>
      <p className={styles.mailSmall}>Your next free Audit comes on 10 December.</p>
    </MailFrame>
  );
}
