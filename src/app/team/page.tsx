import type { Metadata } from 'next';
import { Stat, Tag } from '@/components/ui/Data';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Card, PageHeader } from '@/components/ui/Layout';
import { formatDate, hostAndPath } from '@/domain/format';
import { effectiveTier } from '@/domain/tiers';
import { INSTITUTION_TYPE_LABELS, TIER_LABELS, type InstitutionType, type Tier } from '@/domain/types';
import { requireTeamViewer } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';
import styles from './team.module.css';

// The title only names the page for the team, so the team area stays invisible to everyone else.
export async function generateMetadata(): Promise<Metadata> {
  const viewer = await getViewer();
  return { title: viewer?.teamRole ? 'Institutions' : 'Page not found' };
}

interface Row {
  id: string;
  name: string;
  website: string;
  type: InstitutionType;
  city: string;
  state: string;
  status: 'prospect' | 'signed_up' | 'rival_record';
  tier: Tier | null;
  endsAt: string | null;
  programs: number;
  createdAt: string;
}

const STATUS_LABEL: Readonly<Record<Row['status'], string>> = {
  prospect: 'Prospect',
  signed_up: 'Signed up',
  rival_record: 'Rival record',
};

export default async function TeamHomePage() {
  await requireTeamViewer();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('institutions')
    .select('id, name, type, city, state, website, created_at, institution_status(claimed, is_prospect), plans(tier, starts_at, ends_at), programs(count)')
    .order('name');

  if (error) throw new Error(`Could not load institutions: ${error.message}`);

  const now = new Date();
  const rows: Row[] = (data ?? []).map((institution) => {
    const status = institution.institution_status;
    const plan = institution.plans;
    const tier = plan ? effectiveTier({ tier: plan.tier, startsAt: new Date(plan.starts_at), endsAt: plan.ends_at ? new Date(plan.ends_at) : null }, now) : null;
    return {
      id: institution.id,
      name: institution.name,
      website: institution.website,
      type: institution.type,
      city: institution.city,
      state: institution.state,
      status: status?.is_prospect ? 'prospect' : status?.claimed ? 'signed_up' : 'rival_record',
      tier: status?.claimed ? (tier ?? 'free') : null,
      endsAt: plan?.ends_at ?? null,
      programs: institution.programs[0]?.count ?? 0,
      createdAt: institution.created_at,
    };
  });

  const count = (status: Row['status']) => rows.filter((row) => row.status === status).length;

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Institution',
      render: (row) => (
        <span className={styles.nameCell}>
          <span className={styles.name}>{row.name}</span>
          <span className={styles.site}>{hostAndPath(row.website)}</span>
        </span>
      ),
    },
    { key: 'type', header: 'Type', render: (row) => INSTITUTION_TYPE_LABELS[row.type] },
    { key: 'city', header: 'City', render: (row) => `${row.city}, ${row.state}` },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <Tag variant={row.status === 'prospect' ? 'solid' : row.status === 'signed_up' ? 'outline' : 'quiet'}>{STATUS_LABEL[row.status]}</Tag>,
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (row) =>
        row.tier ? (
          <span className={styles.plan}>
            {TIER_LABELS[row.tier]}
            {row.tier === 'paid' && row.endsAt ? <span className={styles.muted}>Ends {formatDate(row.endsAt)}</span> : null}
          </span>
        ) : (
          <span className={styles.muted}>None</span>
        ),
    },
    { key: 'programs', header: 'Programs', align: 'end', numeric: true, render: (row) => row.programs },
    { key: 'added', header: 'Added', align: 'end', render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="AdmitLabs team"
        title="Institutions"
        description="Every institution in Drishti: signed up, rival records and prospects. Prospects and private notes are visible to the team only."
      />

      <div className={styles.stats}>
        <Card padding="sm">
          <Stat label="Institutions" value={rows.length} />
        </Card>
        <Card padding="sm">
          <Stat label="Signed up" value={count('signed_up')} />
        </Card>
        <Card padding="sm">
          <Stat label="Rival records" value={count('rival_record')} sub="Not signed up yet" />
        </Card>
        <Card padding="sm">
          <Stat label="Prospects" value={count('prospect')} sub="Team only" />
        </Card>
      </div>

      <Card>
        <DataTable caption="All institutions" hideCaption columns={columns} rows={rows} rowKey={(row) => row.id} />
      </Card>

      <p className={styles.fine}>Search, filters, bulk Audit, notes and share links arrive with the team tools in Phase 6.</p>
    </div>
  );
}
