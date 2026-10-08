import Link from 'next/link';
import type { ReactNode } from 'react';
import { AddedTag } from '@/components/details/Added';
import { NameForm } from '@/components/people/NameForm';
import { PaidAction } from '@/components/plan/PaidAction';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Card, FactList } from '@/components/ui/Layout';
import { PageHead } from '@/components/ui/Layout';
import { SCHEDULES } from '@/config/schedules';
import { nextPullOn } from '@/demand/schedule';
import { alertsAhead } from '@/domain/alerts';
import { institutionDetailLines, isEmptyProgram, programDetailLines, EMPTY_PROGRAM_DETAILS } from '@/domain/details';
import { formatDate } from '@/domain/format';
import { effectiveTier, PAID_PRICE_BY_MONTHS, planReminder } from '@/domain/tiers';
import { INSTITUTION_TYPE_LABELS, MEMBERSHIP_ROLE_LABELS, TIER_LABELS } from '@/domain/types';
import { LEAD_RULES } from '@/config/leads';
import { requireInstitutionViewer, type InstitutionViewer } from '@/lib/auth/guards';
import { loadAuditPage, nextAuditText, type AuditPageData } from '@/lib/audit/load';
import { loadAddedDetails, type AddedDetails } from '@/lib/details/load';
import { loadHasLeads } from '@/lib/leads/load';
import { loadChangeState, loadRivalList, type RivalInfo } from '@/lib/rivals/load';
import { createClient } from '@/lib/supabase/server';
import { nextReport } from '@/report/schedule';
import { canChangeRivals, type RivalChangeState } from '@/rivals/rules';
import { removeMemberAction, revokeInviteAction, setSummaryEmailAction } from './actions';
import { InstitutionDetailsForm, ProgramDetailsForm } from './DetailsForms';
import { DeleteStudentForm, LeadSettingsForm } from './LeadsForms';
import { DetailsForm, FreeProgramForm, InviteForm, ProgramsForm } from './SettingsForms';
import styles from './settings.module.css';

export const metadata = { title: 'Settings' };

// Settings answers "How is our account set up?" in plain groups (B9): Institution (with what you
// add about yourselves), Programs, Rivals, Leads (an AdmitLabs Client's), Team, Plan and
// Notifications. The groups are a list on the left (a row on a phone); each opens at its own
// address, so a page can link straight to one. Only the owner changes things; everyone else reads them.

const GROUPS = ['institution', 'programs', 'rivals', 'leads', 'team', 'plan', 'notifications'] as const;
type Group = (typeof GROUPS)[number];

const GROUP_INFO: Readonly<Record<Group, { name: string; hint: string; icon: IconName }>> = {
  institution: { name: 'Institution', hint: 'Name, city and public links', icon: 'institution' },
  programs: { name: 'Programs', hint: 'What you offer', icon: 'briefcase' },
  rivals: { name: 'Rivals', hint: 'Who you compare with', icon: 'rivals' },
  leads: { name: 'Leads', hint: 'Enquiry emails and keeping', icon: 'enquiry' },
  team: { name: 'Team', hint: 'Who can see this dashboard', icon: 'team' },
  plan: { name: 'Plan', hint: 'Your plan and its dates', icon: 'plan' },
  notifications: { name: 'Notifications', hint: 'What arrives, and when', icon: 'bell' },
};

const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function Head({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.sectionHead}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <p className={styles.sectionText}>{children}</p>
    </div>
  );
}

function Readonly({ owner }: { owner: boolean }) {
  return owner ? null : <p className={styles.sectionText}>Only the owner of this account can change these.</p>;
}

// Institution ------------------------------------------------------------------------------------

async function InstitutionGroup({ viewer, added }: { viewer: InstitutionViewer; added: AddedDetails }) {
  const { institution, role } = viewer.membership;
  const owner = role === 'owner';
  const supabase = await createClient();
  const { data: row } = await supabase.from('institutions').select('name, type, city, state, website, instagram, youtube, other_links').eq('id', institution.id).single();
  const links = (row?.other_links ?? {}) as { facebook?: string; linkedin?: string; google_maps?: string };
  const initial = {
    name: row?.name ?? '',
    type: row?.type ?? '',
    city: row?.city ?? '',
    state: row?.state ?? '',
    website: row?.website ?? '',
    instagram: row?.instagram ? `@${row.instagram}` : '',
    youtube: row?.youtube ?? '',
    facebook: links.facebook ?? '',
    linkedin: links.linkedin ?? '',
    googleMaps: links.google_maps ?? '',
  };
  const aboutLines = institutionDetailLines(added.institution, institution.type);
  return (
    <>
      <Head title="Institution">What Drishti checks: your name, type, city and the public links a student would see. Changes apply from your next Audit.</Head>
      <Readonly owner={owner} />
      <Card padding="md">
        {owner ? (
          <DetailsForm initial={initial} />
        ) : (
          <FactList
            items={[
              { label: 'Name', value: initial.name },
              { label: 'Type', value: row ? INSTITUTION_TYPE_LABELS[row.type] : '' },
              { label: 'City', value: `${initial.city}, ${initial.state}` },
              { label: 'Website', value: initial.website.replace(/^https?:\/\//, '') },
              { label: 'Instagram', value: initial.instagram || 'Not added' },
              { label: 'YouTube', value: initial.youtube || 'Not added' },
              { label: 'Facebook', value: initial.facebook || 'Not added' },
              { label: 'LinkedIn', value: initial.linkedin || 'Not added' },
              { label: 'Google Maps listing', value: initial.googleMaps || 'Not added' },
            ]}
          />
        )}
      </Card>
      <div className={styles.subhead}>
        <h3 className={styles.subheadTitle}>About {institution.name}</h3>
        <div className={styles.tabNoteRow}>
          <AddedTag />
          <p className={styles.tabNote}>Facts only you know. Drishti shows them next to what it finds, and uses them in how to fix and your report. They never change your score.</p>
        </div>
      </div>
      <Card padding="md">
        {owner ? (
          <InstitutionDetailsForm initial={added.institution} institutionType={institution.type} />
        ) : aboutLines.length ? (
          <FactList items={aboutLines} />
        ) : (
          <p className={styles.plainText}>Nothing added yet. The owner adds these.</p>
        )}
      </Card>
    </>
  );
}

// Programs ---------------------------------------------------------------------------------------

function ProgramsGroup({ viewer, audit, added }: { viewer: InstitutionViewer; audit: AuditPageData; added: AddedDetails }) {
  const owner = viewer.membership.role === 'owner';
  const programs = audit.programs.filter((program) => !program.archived);
  const freeProgram = programs.find((program) => program.id === viewer.plan?.freeProgramId);
  return (
    <>
      <Head title="Programs">Every program you offer. Removing one keeps it in past Audits. Changes apply from your next Audit.</Head>
      <Readonly owner={owner} />
      <Card padding="md">
        {owner ? (
          <ProgramsForm programs={programs.map((program) => ({ name: program.name, programKey: program.programKey }))} />
        ) : programs.length ? (
          <ul className={styles.plainList}>
            {programs.map((program) => (
              <li key={program.id}>{program.name}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.plainText}>No programs added yet. The owner adds them here.</p>
        )}
      </Card>

      {viewer.tier === 'free' ? (
        <>
          <div className={styles.subhead}>
            <h3 className={styles.subheadTitle}>Your free Audit</h3>
            <p className={styles.tabNote}>Your free Audit covers one program. Paid covers every program.</p>
          </div>
          <Card padding="md">
            {owner ? (
              <FreeProgramForm
                programs={programs.map((program) => ({ id: program.id, name: program.name }))}
                current={freeProgram?.id ?? null}
                note={`You can change it at any time. It applies at your next free Audit${audit.nextAudit ? `, on ${formatDate(audit.nextAudit.on)}` : ''}.`}
              />
            ) : (
              <p className={styles.plainText}>{freeProgram ? `Your free Audit covers ${freeProgram.name}. ${nextAuditText(audit)}.` : 'The owner has not picked a program yet.'}</p>
            )}
          </Card>
        </>
      ) : null}

      <div className={styles.subhead}>
        <h3 className={styles.subheadTitle}>Details for each program</h3>
        <div className={styles.tabNoteRow}>
          <AddedTag />
          <p className={styles.tabNote}>Fees, seats, placements and dates. Shown as added by you. Never part of your score.</p>
        </div>
      </div>
      <div className={styles.programDetails}>
        {programs.map((program) => {
          const programAdded = added.programs.get(program.id) ?? EMPTY_PROGRAM_DETAILS;
          const lines = programDetailLines(programAdded);
          return (
            <details key={program.id} className={styles.programDetail}>
              <summary className={styles.programSummary}>
                <span className={styles.programName}>
                  {program.name}
                  <span className={styles.programMeta}>{isEmptyProgram(programAdded) ? 'Nothing added yet' : lines.map((line) => line.label).join(', ')}</span>
                </span>
                <Icon name="chevronDown" size={16} className={styles.programIcon} />
              </summary>
              <div className={styles.programBody}>
                {owner ? (
                  <ProgramDetailsForm programId={program.id} programName={program.name} initial={programAdded} />
                ) : lines.length ? (
                  <FactList items={lines} />
                ) : (
                  <p className={styles.plainText}>Nothing added yet. The owner adds these.</p>
                )}
              </div>
            </details>
          );
        })}
      </div>
    </>
  );
}

// Rivals -----------------------------------------------------------------------------------------

function rivalRule(change: RivalChangeState): string {
  switch (change.kind) {
    case 'first_setup':
      return 'Pick 3 to 5 you compete with. Drishti checks them as soon as you save.';
    case 'anytime':
      return 'You can change them any time.';
    case 'available':
      return 'You can change them once a month.';
    case 'used':
      return `Changed on ${formatDate(change.changedOn)}. You can change them again from ${formatDate(change.nextOn)}.`;
    case 'locked':
      return 'On Free you keep the rivals you picked. Paid can change them once a month.';
  }
}

function RivalsGroup({ viewer, rivals, change }: { viewer: InstitutionViewer; rivals: readonly RivalInfo[]; change: RivalChangeState }) {
  const owner = viewer.membership.role === 'owner';
  const canChange = owner && canChangeRivals(change);
  return (
    <>
      <Head title="Rivals">The institutions you compare with, 3 to 5 of them. Public information only, and they never know who tracks them.</Head>
      <Card padding="md">
        {rivals.length ? (
          <ul className={styles.rows}>
            {rivals.map((rival) => (
              <li key={rival.id} className={styles.row}>
                <span className={styles.rowName}>
                  {rival.name}
                  <span className={styles.rowSub}>
                    {INSTITUTION_TYPE_LABELS[rival.type]}, {rival.city}
                    {rival.city === viewer.membership.institution.city ? null : '. Nearby city'}
                  </span>
                </span>
                {viewer.tier === 'free' ? null : (
                  <Link href={`/rivals/${rival.id}`} className={styles.rowLink}>
                    Open
                    <Icon name="arrowRight" size={14} />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.plainText}>No rivals picked yet. {owner ? 'Pick 3 to 5 you compete with.' : 'The owner of your account picks them.'}</p>
        )}
        <div className={styles.cardFoot}>
          {canChange ? (
            <ButtonLink href="/rivals/choose" variant="secondary" size="sm" icon="rivals">
              {rivals.length ? 'Change rivals' : 'Pick your rivals'}
            </ButtonLink>
          ) : null}
          <p className={styles.tabNote}>{owner ? rivalRule(change) : 'The owner of your account picks and changes your rivals.'}</p>
        </div>
      </Card>
    </>
  );
}

// Team -------------------------------------------------------------------------------------------

async function TeamGroup({ viewer }: { viewer: InstitutionViewer }) {
  const { institution, role } = viewer.membership;
  const owner = role === 'owner';
  const supabase = await createClient();
  const [peopleRows, invites] = await Promise.all([
    supabase.rpc('institution_people', { p_institution: institution.id }),
    supabase.from('invites').select('id, email, created_at').eq('institution_id', institution.id).is('accepted_at', null).order('created_at'),
  ]);
  const people = peopleRows.data ?? [];
  const invited = invites.data ?? [];
  return (
    <>
      <Head title="Team">Everyone who can see this dashboard. Members can look; only the owner changes things.</Head>
      {viewer.viewingAs ? null : (
        <Card padding="md">
          <NameForm
            name={people.find((person) => person.user_id === viewer.userId)?.name ?? null}
            hint={viewer.tier === 'client' ? 'Your Brain’s History shows it beside what you changed. Without it, your email shows.' : 'Your team sees it beside your email.'}
          />
        </Card>
      )}
      <Card padding="md">
        <ul className={styles.people}>
          {people.map((person) => (
            <li key={person.user_id} className={styles.person}>
              <span className={styles.personEmail}>
                {person.name ? `${person.name}, ${person.email}` : person.email}
                <span className={styles.personRole}>
                  {MEMBERSHIP_ROLE_LABELS[person.role]}
                  {person.user_id === viewer.userId ? ', you' : ''}
                </span>
              </span>
              {owner && person.role === 'member' ? (
                <form action={removeMemberAction}>
                  <input type="hidden" name="user" value={person.user_id} />
                  <Button type="submit" variant="quiet" size="sm">
                    Remove
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
          {invited.map((invite) => (
            <li key={invite.id} className={styles.person}>
              <span className={styles.personEmail}>
                {invite.email}
                <span className={styles.personRole}>Invited {formatDate(invite.created_at)}</span>
              </span>
              {owner ? (
                <form action={revokeInviteAction}>
                  <input type="hidden" name="invite" value={invite.id} />
                  <Button type="submit" variant="quiet" size="sm">
                    Cancel invite
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {owner ? <InviteForm /> : <p className={styles.tabNote}>The owner invites people here.</p>}
      </Card>
    </>
  );
}

// Plan -------------------------------------------------------------------------------------------

function PlanGroup({ viewer, audit }: { viewer: InstitutionViewer; audit: AuditPageData }) {
  const { tier, plan } = viewer;
  const reminder = planReminder(plan, new Date());
  const schedule = SCHEDULES[tier];
  const facts = [
    { label: 'Your plan', value: tier === 'paid' && plan?.paidMonths ? `${TIER_LABELS[tier]}, ${PAID_PRICE_BY_MONTHS[plan.paidMonths].label}` : TIER_LABELS[tier] },
    ...(plan && tier !== 'free' ? [{ label: 'Since', value: formatDate(plan.startsAt) }] : []),
    ...(tier === 'paid' && plan?.endsAt
      ? [{ label: 'Ends', value: `${formatDate(plan.endsAt)}${reminder.daysLeft !== null ? `, in ${reminder.daysLeft} ${reminder.daysLeft === 1 ? 'day' : 'days'}` : ''}. No auto-renew.` }]
      : []),
    ...(tier === 'client' ? [{ label: 'Ends', value: 'With your AdmitLabs service' }] : []),
    { label: 'Audits', value: schedule.auditEveryMonths === 1 ? 'Every month' : `Every ${schedule.auditEveryMonths} months` },
    // Only when it runs on this plan: a Paid plan ending before it says so under Ends.
    ...(audit.nextAudit && audit.nextAudit.tier === tier ? [{ label: tier === 'free' ? 'Next free Audit' : 'Next Audit', value: formatDate(audit.nextAudit.on) }] : []),
  ];
  return (
    <>
      <Head title="Plan">What you are on, and until when. Paid is monthly or for 3 months, with no auto-renew.</Head>
      <Card padding="md">
        <FactList items={facts} />
        <div className={styles.cardFoot}>
          <PaidAction viewer={viewer} />
          <Link href="/plan" className={styles.rowLink}>
            Compare plans
            <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </Card>
    </>
  );
}

// Leads ------------------------------------------------------------------------------------------

async function LeadsGroup({ viewer }: { viewer: InstitutionViewer }) {
  const { institution, role } = viewer.membership;
  const owner = role === 'owner' && !viewer.viewingAs;
  const supabase = await createClient();
  const [settings, recipients] = await Promise.all([
    supabase.from('lead_settings').select('keep_months').eq('institution_id', institution.id).maybeSingle(),
    viewer.viewingAs ? Promise.resolve({ data: [] as string[] }) : supabase.rpc('lead_alert_recipients', { p_institution: institution.id }),
  ]);
  const keepMonths = settings.data?.keep_months ?? LEAD_RULES.keepMonthsDefault;
  const emails = recipients.data ?? [];
  return (
    <>
      <Head title="Leads">Who gets an email for each new enquiry, how long enquiries are kept, and deleting a student’s data when they ask. Only {institution.name}’s own people see an enquiry: the AdmitLabs team sees counts.</Head>
      <Readonly owner={owner} />
      <Card padding="md">
        {owner ? (
          <LeadSettingsForm emails={emails} keepMonths={keepMonths} />
        ) : (
          <FactList
            items={[
              { label: 'Each new enquiry goes by email to', value: emails.length ? emails.join(', ') : 'Set by the owner' },
              { label: 'Enquiries are kept for', value: `${keepMonths} months, then deleted for good` },
            ]}
          />
        )}
      </Card>
      <div className={styles.subhead} id="delete">
        <h3 className={styles.subheadTitle}>Delete a student’s data</h3>
        <p className={styles.tabNote}>When a student asks, find every enquiry they sent by their phone number or email, and delete it for good. It cannot be undone.</p>
      </div>
      <Card padding="md">{owner ? <DeleteStudentForm /> : <p className={styles.plainText}>Only the owner of this account can delete a student’s data.</p>}</Card>
    </>
  );
}

// Notifications ----------------------------------------------------------------------------------

async function NotificationsGroup({ viewer, audit, rivals }: { viewer: InstitutionViewer; audit: AuditPageData; rivals: readonly RivalInfo[] }) {
  const now = new Date();
  const { institution, role } = viewer.membership;
  const ahead = alertsAhead({
    tier: viewer.tier,
    nextAudit: audit.nextAudit,
    hasRivals: rivals.length > 0,
    city: institution.city,
    nextUpdate: nextPullOn(now),
    // Made only while the plan is still Paid or Client on the day.
    nextReport: effectiveTier(viewer.plan, nextReport(now).on) === 'free' ? null : nextReport(now).on,
  });
  const supabase = await createClient();
  const { data: people } = await supabase.rpc('institution_people', { p_institution: institution.id });
  const free = viewer.tier === 'free';
  // Each person their own; the owner anyone's. The AdmitLabs team, viewing as, changes nothing.
  const canChange = (userId: string) => !viewer.viewingAs && (userId === viewer.userId || role === 'owner');
  return (
    <>
      <Head title="Notifications">What arrives in Notifications, and when. Each new one also shows as a count beside Notifications in the menu.</Head>
      <Card padding="md">
        <ul className={styles.ahead}>
          {ahead.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className={styles.cardFoot}>
          <Link href="/notifications" className={styles.rowLink}>
            Open Notifications
            <Icon name="arrowRight" size={14} />
          </Link>
        </div>
      </Card>
      <div className={styles.subhead} id="emails">
        <h3 className={styles.subheadTitle}>{free ? 'The Audit ready email' : 'The monthly summary by email'}</h3>
        <p className={styles.tabNote}>
          {free
            ? 'When each free Audit is ready: Visibility, Trust and Chosen, and what to fix first. Each person turns theirs on or off.'
            : 'On the 1st: how you are doing, the 3 things to do this month, one rival move and the month’s PDF. Each person turns theirs on or off.'}
        </p>
      </div>
      <Card padding="md">
        <ul className={styles.people}>
          {(people ?? []).map((person) => (
            <li key={person.user_id} className={styles.person}>
              <span className={styles.personEmail}>
                {person.name ? `${person.name}, ${person.email}` : person.email}
                <span className={styles.personRole}>
                  {MEMBERSHIP_ROLE_LABELS[person.role]}
                  {person.user_id === viewer.userId ? ', you' : ''}. {person.summary_email ? 'Gets it' : 'Turned off'}
                </span>
              </span>
              {canChange(person.user_id) ? (
                <form action={setSummaryEmailAction}>
                  <input type="hidden" name="user" value={person.user_id} />
                  <input type="hidden" name="on" value={person.summary_email ? 'false' : 'true'} />
                  <Button type="submit" variant={person.summary_email ? 'quiet' : 'secondary'} size="sm">
                    {person.summary_email ? 'Turn off' : 'Turn on'}
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireInstitutionViewer();
  const { institution, role } = viewer.membership;
  const asked = one((await searchParams).group);
  const wanted: Group = GROUPS.includes(asked as Group) ? (asked as Group) : 'institution';
  const [audit, added, rivals, hasLeads] = await Promise.all([loadAuditPage(viewer), loadAddedDetails(institution.id), loadRivalList(institution.id), loadHasLeads(viewer)]);
  const groups = GROUPS.filter((id) => id !== 'leads' || hasLeads);
  const change = await loadChangeState(institution.id, viewer.tier, rivals.length > 0);

  const group: Group = groups.includes(wanted) ? wanted : 'institution';
  let body: ReactNode;
  switch (group) {
    case 'programs':
      body = <ProgramsGroup viewer={viewer} audit={audit} added={added} />;
      break;
    case 'rivals':
      body = <RivalsGroup viewer={viewer} rivals={rivals} change={change} />;
      break;
    case 'leads':
      body = <LeadsGroup viewer={viewer} />;
      break;
    case 'team':
      body = <TeamGroup viewer={viewer} />;
      break;
    case 'plan':
      body = <PlanGroup viewer={viewer} audit={audit} />;
      break;
    case 'notifications':
      body = <NotificationsGroup viewer={viewer} audit={audit} rivals={rivals} />;
      break;
    default:
      body = <InstitutionGroup viewer={viewer} added={added} />;
  }

  return (
    <div className={styles.page}>
      <PageHead title="Settings" question="How is our account set up?" caption={role === 'owner' ? undefined : ['Only the owner of this account can change these']} />
      <div className={styles.settings}>
        <nav aria-label="Settings groups">
          <ul className={styles.sections}>
            {groups.map((id) => (
              <li key={id}>
                <Link href={id === 'institution' ? '/settings' : `/settings?group=${id}`} className={styles.section} aria-current={id === group ? 'page' : undefined} scroll={false}>
                  <span className={styles.sectionName}>
                    <Icon name={GROUP_INFO[id].icon} size={16} />
                    {GROUP_INFO[id].name}
                  </span>
                  <span className={styles.sectionHint}>{GROUP_INFO[id].hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className={styles.sectionBody}>{body}</div>
      </div>
    </div>
  );
}
