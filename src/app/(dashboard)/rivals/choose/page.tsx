import Link from 'next/link';
import { RivalChooser } from '@/components/rivals/RivalChooser';
import { Notice } from '@/components/ui/Feedback';
import { PageHead } from '@/components/ui/Layout';
import { RIVAL_RULES } from '@/config/rivals';
import { formatDate, formatMonth } from '@/domain/format';
import { refreshResetsOn } from '@/domain/schedule';
import { INSTITUTION_TYPE_LABELS } from '@/domain/types';
import { requireInstitutionViewer } from '@/lib/auth/guards';
import { loadPrograms } from '@/lib/audit/load';
import { loadChangeState, loadRivalList, loadSuggestions } from '@/lib/rivals/load';
import { canChangeRivals, type RivalChangeState } from '@/rivals/rules';
import { suggestionReason } from '@/rivals/text';
import audit from '@/components/audit/audit.module.css';

export const metadata = { title: 'Choose rivals' };

function saveNote(change: RivalChangeState, tier: string, now: Date): string {
  if (change.kind === 'first_setup') {
    if (tier === 'free') return 'On Free you pick once and keep these rivals. Paid can change them once a month.';
    if (tier === 'paid') return 'Your first pick does not use your monthly change.';
    return 'You can change them any time.';
  }
  if (change.kind === 'available') return `Saving a new list uses your change for ${formatMonth(now)}. The next one opens on ${formatDate(refreshResetsOn(now))}.`;
  return 'You can change them any time.';
}

export default async function ChooseRivalsPage() {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  const [rivals, suggestions, programs] = await Promise.all([loadRivalList(institution.id), loadSuggestions(institution.id), loadPrograms(institution.id)]);
  const change = await loadChangeState(institution.id, viewer.tier, rivals.length > 0);
  const now = new Date();

  let body;
  if (role !== 'owner') {
    body = (
      <Notice icon="info" title="Only the owner chooses rivals.">
        You can see everything your plan includes on the Rivals page.
      </Notice>
    );
  } else if (!canChangeRivals(change)) {
    body =
      change.kind === 'used' ? (
        <Notice icon="info" title={`You changed your rivals on ${formatDate(change.changedOn)}.`}>
          Paid can change them once a month. You can change them again from {formatDate(change.nextOn)}.
        </Notice>
      ) : (
        <Notice icon="info" title="On Free, your rivals stay as you picked them.">
          Paid can change them once a month. <Link href="/plan">See what Paid adds</Link>.
        </Notice>
      );
  } else {
    body = (
      <RivalChooser
        institution={{ type: institution.type, website: institution.website }}
        current={rivals.map((rival) => ({ id: rival.id, name: rival.name, sub: `${INSTITUTION_TYPE_LABELS[rival.type]}, ${rival.city}` }))}
        suggestions={suggestions.map((rival) => ({
          id: rival.id,
          name: rival.name,
          sub: `${INSTITUTION_TYPE_LABELS[rival.type]}, ${rival.city}`,
          reason: suggestionReason(rival.sameCity, rival.sharedPrograms, rival.state),
        }))}
        programs={programs.filter((program) => !program.archived).map((program) => ({ id: program.id, name: program.name }))}
        saveNote={saveNote(change, viewer.tier, now)}
      />
    );
  }

  return (
    <div className={audit.page}>
      <PageHead
        back={rivals.length ? { href: '/rivals', label: 'Rivals' } : undefined}
        title={rivals.length ? 'Change your rivals' : 'Choose your rivals'}
        question="Who should Drishti track for you?"
        caption={[`${RIVAL_RULES.min} to ${RIVAL_RULES.max} institutions`, 'Public information only. Rivals never know who tracks them.']}
      />
      {body}
    </div>
  );
}
