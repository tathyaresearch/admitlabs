import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { Card, PageHeader, Section } from '@/components/ui/Layout';
import { istParts } from '@/domain/dates';
import { formatDate, hostAndPath } from '@/domain/format';
import { requireTeamViewer } from '@/lib/auth/guards';
import { getViewer } from '@/lib/auth/viewer';
import { createClient } from '@/lib/supabase/server';
import { deleteRivalAdAction } from './actions';
import { AdForm } from './AdForm';
import styles from './ads.module.css';

// The title only names the page for the team, so the team area stays invisible to everyone else.
export async function generateMetadata(): Promise<Metadata> {
  const viewer = await getViewer();
  return { title: viewer?.teamRole ? 'Rival ads' : 'Page not found' };
}

export default async function RivalAdsPage() {
  await requireTeamViewer();
  const supabase = await createClient();
  const [links, ads] = await Promise.all([
    supabase.from('rivals').select('rival_institution_id, institutions!rivals_rival_institution_id_fkey(name)'),
    supabase.from('rival_ads').select('id, promise, source_url, entered_at, institutions(name)').order('entered_at', { ascending: false }).limit(50),
  ]);
  if (links.error) throw new Error(`Could not load rivals: ${links.error.message}`);
  if (ads.error) throw new Error(`Could not load ads: ${ads.error.message}`);

  const rivals = [
    ...new Map((links.data ?? []).map((row) => [row.rival_institution_id, { id: row.rival_institution_id, name: row.institutions?.name ?? 'Rival' }])).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));
  const { year, month, day } = istParts(new Date());
  const today = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="AdmitLabs team"
        title="Rival ads"
        description="What rivals promise in their ads, entered by hand until a provider can collect them. Paid and Client institutions tracking the rival see each one with its link and date."
      />

      <Section id="add" title="Add an ad" description="Only rivals someone tracks are listed.">
        <Card>
          <AdForm rivals={rivals} today={today} />
        </Card>
      </Section>

      <Section id="entered" title="Entered ads" description="The latest 50, newest first.">
        <Card>
          {ads.data?.length ? (
            <ul className={styles.list}>
              {ads.data.map((ad) => (
                <li key={ad.id} className={styles.item}>
                  <div>
                    <p className={styles.promise}>&ldquo;{ad.promise}&rdquo;</p>
                    <p className={styles.meta}>
                      <span>{ad.institutions?.name ?? 'Rival'}</span>
                      <span>Seen {formatDate(ad.entered_at)}</span>
                      <a href={ad.source_url} target="_blank" rel="noreferrer">
                        {hostAndPath(ad.source_url)}
                        <span className="visually-hidden"> (opens in a new tab)</span>
                      </a>
                    </p>
                  </div>
                  <form action={deleteRivalAdAction}>
                    <input type="hidden" name="ad" value={ad.id} />
                    <Button type="submit" variant="quiet" size="sm">
                      Remove<span className="visually-hidden"> this ad</span>
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>No ads entered yet.</p>
          )}
        </Card>
      </Section>
    </div>
  );
}
