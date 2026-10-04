import { PaidAction } from '@/components/plan/PaidAction';
import { RivalChooser, type ChooserRow } from '@/components/rivals/RivalChooser';
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
import audit from '@/components/audit/places.module.css';

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

// Choosing rivals answers "Who should Drishti track for you?" (spec 8.2): your city first, then,
// when it has fewer than 3, the nearest bigger city's, marked Nearby city; or one you add.
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
        <Notice icon="info" title="On Free, your rivals stay as you picked them." action={<PaidAction viewer={viewer} variant="secondary" size="sm" note={false} />}>
          Paid can change them once a month.
        </Notice>
      );
  } else {
    // Your rivals first, then the suggestions, each in its city's group.
    const current: ChooserRow[] = rivals.map((rival) => ({
      id: rival.id,
      name: rival.name,
      sub: `${INSTITUTION_TYPE_LABELS[rival.type]}, ${rival.city}. One of your rivals now.`,
      nearby: rival.city !== institution.city,
    }));
    const suggested: ChooserRow[] = suggestions.map((rival) => ({
      id: rival.id,
      name: rival.name,
      sub: suggestionReason(rival.type, rival.city, rival.sharedPrograms),
      nearby: !rival.sameCity,
    }));
    const rows = [...current, ...suggested];
    body = (
      <RivalChooser
        institution={{ type: institution.type, website: institution.website, city: institution.city, state: institution.state }}
        nearCity={suggestions.find((rival) => !rival.sameCity)?.city ?? null}
        local={rows.filter((row) => !row.nearby)}
        nearby={rows.filter((row) => row.nearby)}
        picked={rivals.map((rival) => rival.id)}
        programs={programs.filter((program) => !program.archived).map((program) => ({ id: program.id, name: program.name }))}
        saveNote={saveNote(change, viewer.tier, now)}
      />
    );
  }

  return (
    <div className={audit.page}>
      <div className={audit.top}>
        <PageHead
          back={rivals.length ? { href: '/rivals', label: 'Rivals' } : undefined}
          title={rivals.length ? 'Change your rivals' : 'Choose your rivals'}
          question="Who should Drishti track for you?"
          caption={[`Pick ${RIVAL_RULES.min} to ${RIVAL_RULES.max} rivals`, viewer.tier === 'free' ? 'Free keeps the rivals you pick' : 'Public information only. Rivals never know who tracks them.']}
        />
      </div>
      {body}
    </div>
  );
}
