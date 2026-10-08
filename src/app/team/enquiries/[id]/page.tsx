import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CameIn } from '@/components/team/CameIn';
import { LeadDetailsForm, OwnerForm, StatusForm } from '@/components/team/EnquiryForms';
import { ActionButton, NoteForm } from '@/components/team/InstitutionPanels';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Notice } from '@/components/ui/Feedback';
import { TextField } from '@/components/ui/Form';
import { PageHead } from '@/components/ui/Layout';
import { formatDate, formatDateTime } from '@/domain/format';
import { isFullTeam, TIER_LABELS } from '@/domain/types';
import { leadTitle, sourceLine, TEAM_LEAD_STATUS_LABELS } from '@/enquiries/model';
import { activityLine, followUpWords, indiaToday } from '@/enquiries/view';
import { requireTeamViewer } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { findInstitutions, loadLead } from '@/lib/team/enquiries';
import { loadTeamPeople } from '@/lib/team/load';
import { formatPhone } from '@/site/enquiry';
import { addLeadNoteAction, linkInstitutionAction, makeClientAction, saveLeadAction, setOwnerAction, setStatusAction } from '../actions';
import audit from '@/components/audit/audit.module.css';
import styles from '@/components/team/team.module.css';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? '';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const viewer = await getViewer();
  const { id } = await params;
  if (!viewer?.teamRole || !UUID.test(id)) return { title: 'Page not found' };
  const page = await loadLead(id);
  return { title: page ? `Enquiry: ${leadTitle(page.lead)}` : 'Page not found' };
}

// One lead (spec section 27): where it stands (status, owner, next follow-up), how to reach them,
// the college it is in Drishti and, once Won, Make Client; then what came in, the details, notes
// and History. A Client manager opens only the leads they own: anything else is not found.
export default async function LeadPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireTeamViewer();
  const full = isFullTeam(viewer.teamRole);
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const query = await searchParams;
  const [page, people] = await Promise.all([loadLead(id), full ? loadTeamPeople() : Promise.resolve([])]);
  if (!page) notFound();
  const { lead, institution, activity, names } = page;
  const today = indiaToday(new Date());
  const find = one(query.find).trim().slice(0, 80);
  const matches = find && !lead.madeClientAt ? await findInstitutions(find) : [];
  const owners = people.filter((person) => person.userId && !person.pending).map((person) => ({ value: person.userId as string, label: person.name ?? person.email }));
  const nameOf = (userId: string | null) => (userId ? (names.get(userId) ?? 'Someone on the team') : 'Drishti');
  const institutionName = (institutionId: string | null) => (institutionId && institution?.id === institutionId ? institution.name : institutionId ? 'a college' : null);
  const notes = activity.filter((row) => row.kind === 'note');
  const history = activity.filter((row) => row.kind !== 'note');

  return (
    <div className={audit.page}>
      <PageHead
        back={{ href: '/team/enquiries', label: 'Enquiries' }}
        title={leadTitle(lead)}
        question="What’s next with them?"
        caption={[
          [lead.name ? lead.institution : null, lead.city].filter(Boolean).join(', ') || 'No institution yet',
          sourceLine(lead.source, lead.sourceDetail),
          `Came in ${formatDate(lead.createdAt)}`,
          ...(lead.cameBack ? [`Came back ${formatDate(lead.lastInAt)}`] : []),
        ]}
      />
      {one(query.joined) === '1' ? (
        <Notice icon="info" title="That phone or email was here already.">
          What you added joined this lead, so there is never a second one. It is in History below.
        </Notice>
      ) : null}

      <div className={styles.split}>
        <section className={styles.panel} aria-labelledby="stands-title">
          <h2 id="stands-title" className={styles.panelTitle}>
            Where it stands
          </h2>
          <StatusForm action={setStatusAction.bind(null, lead.id)} status={lead.status} reason={lead.lostReason} note={lead.lostNote} />
          {full ? (
            <OwnerForm action={setOwnerAction.bind(null, lead.id)} owner={lead.ownerId} options={owners} />
          ) : (
            <p className={styles.formNote}>Owner: {lead.ownerId === viewer.userId ? 'you' : (lead.owner ?? 'nobody yet')}. Admins and Team members give a lead its owner.</p>
          )}
          <p className={styles.formNote}>Next follow-up: {followUpWords(lead.nextFollowUp, lead.status, today)}. Change it under Details.</p>
        </section>

        <section className={styles.panel} aria-labelledby="reach-title">
          <h2 id="reach-title" className={styles.panelTitle}>
            How to reach them
          </h2>
          <dl className={styles.leadContact}>
            <div>
              <dt>Name</dt>
              <dd>{lead.name ?? 'Not known yet'}</dd>
            </div>
            <div>
              <dt>Institution</dt>
              <dd>{[lead.institution, lead.city].filter(Boolean).join(', ') || 'Not known yet'}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>
                {lead.phone ? (
                  <a className={styles.link} href={`tel:${lead.phone}`}>
                    {formatPhone(lead.phone)}
                  </a>
                ) : (
                  'None yet'
                )}
              </dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                {lead.email ? (
                  <a className={styles.link} href={`mailto:${lead.email}`}>
                    {lead.email}
                  </a>
                ) : (
                  'None yet'
                )}
              </dd>
            </div>
            <div>
              <dt>What they want</dt>
              <dd>{lead.wants ?? 'Not written yet'}</dd>
            </div>
            <div>
              <dt>In Drishti</dt>
              <dd>
                {institution ? (
                  <Link className={styles.link} href={`/team/institutions/${institution.id}`}>
                    {institution.name}
                    {institution.claimed ? `, ${institution.tier ? TIER_LABELS[institution.tier] : 'Free'}` : ', not signed up'}
                  </Link>
                ) : (
                  'Not linked to a college'
                )}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      {lead.status === 'won' ? (
        <section className={styles.panel} aria-labelledby="client-title">
          <h2 id="client-title" className={styles.panelTitle}>
            Make them a Client
          </h2>
          {lead.madeClientAt && institution ? (
            <div className={styles.inlineForm}>
              <p className={styles.itemBody}>
                Made a Client on {formatDate(lead.madeClientAt)}: {institution.name}. Onboarding started.
              </p>
              <ButtonLink href={`/team/institutions/${institution.id}/brain`} size="sm" variant="secondary" iconAfter="arrowRight">
                Their Client Brain
              </ButtonLink>
            </div>
          ) : !full ? (
            <p className={styles.formNote}>Won. An Admin or a Team member makes them a Client.</p>
          ) : institution?.claimed ? (
            <>
              <p className={styles.itemBody}>
                {institution.name} has signed up{institution.tier === 'client' ? ' and is a Client already' : ''}. Make Client sets their plan to Client and starts onboarding: their Client Brain opens, and their first Client Audit runs now.
              </p>
              <div className={styles.inlineForm}>
                <ActionButton
                  action={makeClientAction.bind(null, lead.id)}
                  label="Make Client"
                  size="md"
                  confirm={`${institution.name} becomes a Client now: their plan is set to Client and onboarding starts.`}
                />
              </div>
            </>
          ) : (
            <p className={styles.itemBody}>
              {institution
                ? `${institution.name} has not signed up for Drishti yet. Once they sign up, Make Client sets their plan and starts onboarding.`
                : 'Link them to their college in Drishti first (below). A college that has not signed up yet signs up first, then you make them a Client here.'}
            </p>
          )}
        </section>
      ) : null}

      {!lead.madeClientAt ? (
        <section className={styles.panel} aria-labelledby="college-title">
          <h2 id="college-title" className={styles.panelTitle}>
            Their college in Drishti
          </h2>
          {institution ? (
            <div className={styles.inlineForm}>
              <p className={styles.itemBody}>Linked to {institution.name}.</p>
              <form action={linkInstitutionAction.bind(null, lead.id, null)}>
                <Button type="submit" size="sm" variant="quiet">
                  Take the link off
                </Button>
              </form>
            </div>
          ) : (
            <p className={styles.formNote}>Link them to their college, so the team sees both together and can make them a Client once they are Won.</p>
          )}
          <form method="get" className={styles.inlineForm} role="search" aria-label="Find their college">
            <TextField id="find-college" name="find" type="search" label={institution ? 'Link another college' : 'Find their college'} placeholder="Name or website" defaultValue={find} />
            <Button type="submit" variant="secondary" icon="search">
              Find
            </Button>
          </form>
          {find ? (
            matches.length ? (
              <ul className={styles.linkResults}>
                {matches.map((match) => (
                  <li key={match.id} className={styles.linkResult}>
                    <span>
                      {match.name}
                      <span className={styles.rowSub}>
                        {' '}
                        {match.city}, {match.claimed ? (match.tier ? TIER_LABELS[match.tier] : 'Free') : 'not signed up'}
                      </span>
                    </span>
                    <form action={linkInstitutionAction.bind(null, lead.id, match.id)}>
                      <Button type="submit" size="sm" variant="secondary">
                        Link
                      </Button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={styles.empty}>No college in Drishti matches “{find}”.</p>
            )
          ) : null}
        </section>
      ) : null}

      <section className={audit.section} aria-labelledby="came-title">
        <h2 id="came-title" className={styles.sectionTitle}>
          What came in
        </h2>
        <div className={styles.rows}>
          <CameIn enquiries={page.cameIn} />
        </div>
      </section>

      <section className={styles.panel} aria-labelledby="details-title">
        <h2 id="details-title" className={styles.panelTitle}>
          Details
        </h2>
        <LeadDetailsForm
          action={saveLeadAction.bind(null, lead.id)}
          values={{ name: lead.name, institution: lead.institution, city: lead.city, phone: lead.phone ? formatPhone(lead.phone) : null, email: lead.email, wants: lead.wants, nextFollowUp: lead.nextFollowUp }}
        />
      </section>

      <div className={styles.split}>
        <section className={styles.panel} aria-labelledby="notes-title">
          <h2 id="notes-title" className={styles.panelTitle}>
            Notes
          </h2>
          <NoteForm action={addLeadNoteAction.bind(null, lead.id)} />
          {notes.length ? (
            <ul className={styles.history}>
              {notes.map((row) => (
                <li key={row.id} className={styles.historyItem}>
                  <p className={styles.historyNote}>{row.body}</p>
                  <p className={styles.itemMeta}>
                    <span>{nameOf(row.by)}</span>
                    <span>{formatDateTime(row.at)}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>No notes yet. Add what you hear on calls, so whoever picks it up knows.</p>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="history-title">
          <h2 id="history-title" className={styles.panelTitle}>
            History
          </h2>
          <ul className={styles.history}>
            {history.map((row) => (
              <li key={row.id} className={styles.historyItem}>
                <p className={styles.historyText}>{activityLine(row, nameOf, institutionName)}</p>
                <p className={styles.itemMeta}>
                  <span>{row.kind === 'created' || row.kind === 'came_back' ? (row.by ? nameOf(row.by) : 'Drishti') : nameOf(row.by)}</span>
                  <span>{formatDateTime(row.at)}</span>
                </p>
              </li>
            ))}
          </ul>
          <p className={styles.formNote}>Status now: {TEAM_LEAD_STATUS_LABELS[lead.status]}.</p>
        </section>
      </div>
    </div>
  );
}
