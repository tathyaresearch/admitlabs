import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { LeadForm } from '@/components/leads/LeadForm';
import { ProductLockup } from '@/components/ui/Brand';
import { Icon } from '@/components/ui/Icon';
import { consentLine } from '@/leads/text';
import { formStartToken, loadLeadForm } from '@/lib/leads/form';
import { APP_OPEN } from '@/lib/urls';
import { submitLeadAction } from './actions';
import styles from '@/components/leads/form.module.css';

// The enquiry form a Client's tracking link opens (spec section 23), at admitlabs.in/enquire/<code>.
// Hosted by Drishti, for the college: the student's details go to it only. Never indexed. While
// Drishti is not open yet, not found, like every other dashboard page.

const CODE = /^[a-z0-9]{6,16}$/;

export const viewport: Viewport = { themeColor: '#f2e8d6', colorScheme: 'light' };

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const robots = { index: false, follow: false } as const;
  const { code } = await params;
  const form = APP_OPEN && CODE.test(code) ? await loadLeadForm(code) : null;
  const title = !form ? 'Enquiry form' : form.open ? `Ask ${form.college} about ${form.programName}` : `${form.college}: this form is closed`;
  return { title: { absolute: title }, robots, referrer: 'no-referrer' };
}

function Foot({ college }: { college: string }) {
  return (
    <p className={styles.foot}>
      <span>A form by</span>
      <ProductLockup size="sm" motion="still" byline={false} />
      <span>for {college}. Your details go to them only.</span>
    </p>
  );
}

export default async function EnquirePage({ params }: { params: Promise<{ code: string }> }) {
  if (!APP_OPEN) notFound();
  const { code } = await params;
  if (!CODE.test(code)) notFound();
  const form = await loadLeadForm(code);
  if (!form) notFound();

  return (
    <div className={styles.page} data-theme="light">
      <style href="drishti-enquire" precedence="default">
        {'html,body{background:var(--lt-surface-sunken)}'}
      </style>
      <main className={styles.main}>
        {form.open ? (
          <LeadForm
            action={submitLeadAction.bind(null, code)}
            college={form.college}
            programName={form.programName}
            programId={form.programId}
            programs={form.programs}
            consent={consentLine(form.college)}
            started={formStartToken()}
          />
        ) : (
          <div className={styles.card}>
            <p className={styles.college}>{form.college}</p>
            <Icon name="lock" size={28} />
            <h1 className={styles.thanks}>This form is closed.</h1>
            <p className={styles.quiet}>
              {form.closedReason === 'archived' ? `${form.college} no longer takes enquiries through this link.` : `${form.college} does not take enquiries through this form right now.`}
            </p>
          </div>
        )}
        <Foot college={form.college} />
      </main>
    </div>
  );
}
