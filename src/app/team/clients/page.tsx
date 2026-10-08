import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { SelectField } from '@/components/ui/Form';
import { Icon } from '@/components/ui/Icon';
import { PageHead } from '@/components/ui/Layout';
import { formatDate, plural } from '@/domain/format';
import { isFullTeam } from '@/domain/types';
import { requireTeamViewer } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { loadClients, loadTeamPeople } from '@/lib/team/load';
import { attentionReasons } from '@/team/attention';
import { clientBrainLine, managersLine, matchesManager, parseManagerFilter } from '@/team/clients';
import audit from '@/components/audit/audit.module.css';
import styles from '@/components/team/team.module.css';

export async function generateMetadata(): Promise<Metadata> {
  const viewer = await getViewer();
  return { title: viewer?.teamRole ? 'Clients' : 'Page not found' };
}

// The team's Clients (spec section 27): each with its Brain, who looks after it and what waits for
// review, opening the Client's page (its Client Brain is a tab there). A Client manager sees the
// Clients assigned to them; the full team sees every Client and can show one person's.
export default async function ClientsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireTeamViewer();
  const full = isFullTeam(viewer.teamRole);
  const now = new Date();
  const [clients, people, query] = await Promise.all([loadClients(now), full ? loadTeamPeople() : Promise.resolve([]), searchParams]);
  const filter = full ? parseManagerFilter(query.manager) : ({ kind: 'any' } as const);
  const shown = clients.filter((client) => matchesManager(filter, client.managers.map((manager) => manager.userId)));
  const managers = people.filter((person) => person.role === 'client_manager' && person.userId);
  const unassigned = clients.filter((client) => !client.managers.length).length;

  return (
    <div className={audit.page}>
      <PageHead
        title="Clients"
        question={full ? 'How is each Client doing?' : 'Which Clients do you look after?'}
        caption={[
          plural(clients.length, 'Client', 'Clients'),
          full ? (unassigned ? `${unassigned} without a Client manager` : 'Each has a Client manager') : 'Assigned to you by the team',
          'Each opens its page, with its Client Brain',
        ]}
      />

      {full && clients.length ? (
        <form method="get" action="/team/clients" className={styles.clientFilter} role="search" aria-label="Show Clients by Client manager">
          <SelectField
            id="clients-manager"
            name="manager"
            label="Looked after by"
            defaultValue={filter.kind === 'person' ? filter.userId : filter.kind === 'none' ? 'none' : ''}
            options={[{ value: '', label: 'Anyone' }, { value: 'none', label: 'No Client manager yet' }, ...managers.map((person) => ({ value: person.userId as string, label: person.name ?? person.email }))]}
          />
          <Button type="submit" variant="secondary">
            Show
          </Button>
        </form>
      ) : null}

      {shown.length ? (
        <div className={styles.list}>
          <div className={`${styles.listHead} ${styles.clientHead}`} aria-hidden="true">
            <span>Client</span>
            <span>Client Brain</span>
            <span>Looked after by</span>
            <span>Client since</span>
            <span />
          </div>
          {shown.map((client) => {
            const reasons = [
              ...(client.waiting ? [{ key: 'waiting', text: `${plural(client.waiting, 'thing waits', 'things wait')} for review` }] : []),
              ...attentionReasons(client, now).filter((reason) => reason.key !== 'client_onboarding'),
            ];
            return (
              <Link key={client.id} href={`/team/institutions/${client.id}`} className={`${styles.listRow} ${styles.clientRow}`}>
                <span className={styles.rowName}>
                  {client.name}
                  <span className={styles.rowSub}>
                    {client.city}
                    <span className={styles.clientPhoneOnly}>. {clientBrainLine(client.brain)}. {managersLine(client.managers.map((manager) => manager.name))}</span>
                  </span>
                  {reasons.length ? (
                    <>
                      <span className="visually-hidden">Needs attention: </span>
                      <span className={styles.rowReasons}>
                        {reasons.map((reason) => (
                          <span key={reason.key} className={styles.rowReason}>
                            {reason.text}
                          </span>
                        ))}
                      </span>
                    </>
                  ) : null}
                </span>
                <span className={styles.rowCell}>
                  <span className={styles.rowStatus}>{clientBrainLine(client.brain)}</span>
                </span>
                <span className={styles.rowCell}>{managersLine(client.managers.map((manager) => (manager.userId === viewer.userId ? 'You' : manager.name)))}</span>
                <span className={styles.rowCell}>{client.clientSince ? formatDate(client.clientSince) : 'Not known'}</span>
                <Icon name="chevronRight" size={16} className={styles.chevron} />
              </Link>
            );
          })}
        </div>
      ) : clients.length ? (
        <EmptyState icon="search" title="No Clients match" headingLevel={2}>
          Show Clients looked after by anyone, or by another Client manager.
        </EmptyState>
      ) : (
        <EmptyState icon="briefcase" title={full ? 'No Clients yet' : 'No Clients assigned to you yet'} headingLevel={2}>
          {full
            ? 'An institution becomes a Client when an Admin makes it one on its page, or when a won enquiry is made a Client.'
            : 'When the team assigns you a Client, it shows here with its page and Client Brain.'}
        </EmptyState>
      )}
    </div>
  );
}
