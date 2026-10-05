import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { rowSummary, type AuditView, type ItemPart, type ListItem, type PillarCheck } from '@/audit/view';
import { ChecksTable } from '@/components/audit/ChecksTable';
import { FixCards, WorkingRows } from '@/components/audit/Lists';
import { ProgramTabs } from '@/components/audit/Programs';
import { SummaryBand } from '@/components/audit/SummaryBand';
import { UnlockCard } from '@/components/audit/UnlockCard';
import { HeadToHead } from '@/components/charts/HeadToHead';
import { CityPicker } from '@/components/institution/CityPicker';
import { DEFAULT_PAID_MONTHS, PAID_PRICE_BY_MONTHS } from '@/domain/tiers';
import { APP_OPEN } from '@/lib/urls';
import { ProgramPicker } from '@/components/institution/ProgramPicker';
import { HistoryLine } from '@/components/charts/HistoryLine';
import { MonthBars } from '@/components/charts/MonthBars';
import { MonthTable } from '@/components/charts/MonthTable';
import { PartRanks } from '@/components/charts/PartRanks';
import { ScoreGauge } from '@/components/charts/ScoreGauge';
import { Sparkline } from '@/components/charts/Sparkline';
import { ThemeToggle } from '@/components/shell/ThemeToggle';
import { BrandMark, ProductLockup, Wordmark } from '@/components/ui/Brand';
import { Button, ButtonLink, IconButton } from '@/components/ui/Button';
import { CodeInput } from '@/components/ui/CodeInput';
import { PillarScores, ScoreHero, SourceLine, Stat, Tag } from '@/components/ui/Data';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { EmptyState, Notice, Skeleton, SkeletonGroup } from '@/components/ui/Feedback';
import { Checkbox, RadioGroup, SelectField, TextAreaField, TextField } from '@/components/ui/Form';
import { Icon, ICON_NAMES } from '@/components/ui/Icon';
import { Card, Eyebrow, FactList, Highlight, PageHeader, Section } from '@/components/ui/Layout';
import { LockedPanel } from '@/components/ui/LockedPanel';
import { CheckRows, FixFirst, SplitBar } from '@/components/ui/CheckSummary';
import { Delta, Difficulty, ResultBar, ScoreLabel } from '@/components/ui/Results';
import { contrastRatio } from '@/domain/contrast';
import { RESULTS } from '@/domain/types';
import { requireTeamViewer } from '@/lib/auth/guards';
import { pillarSpread, scoreTrend, type ScoreLine } from '@/rivals/trend';
import { OverlayDemo, SegmentedDemo, TabsDemo } from './Demos';
import styles from './design-system.module.css';

export const metadata: Metadata = { title: 'Design system' };

const NAV = [
  ['brand', 'Brand'],
  ['colour', 'Colour'],
  ['type', 'Type'],
  ['space', 'Space and shape'],
  ['buttons', 'Buttons'],
  ['forms', 'Forms'],
  ['results', 'Results'],
  ['audit', 'Audit'],
  ['data', 'Data'],
  ['charts', 'Charts'],
  ['layout', 'Layout'],
  ['overlays', 'Navigation and overlays'],
  ['feedback', 'Feedback'],
  ['gating', 'Plan gating'],
  ['icons', 'Icons'],
  ['themes', 'Both themes'],
] as const;

const BRAND = [
  { name: 'Black', hex: '#0A0A0C', use: 'Main dark surface' },
  { name: 'Graphite', hex: '#1E1F23', use: 'Cards on dark' },
  { name: 'Ivory', hex: '#F2E8D6', use: 'Text on dark, main light surface' },
  { name: 'Slate', hex: '#8A8D94', use: 'Captions and metadata on dark' },
] as const;

const GREYS = [
  ['975', '#141417'],
  ['930', '#242529'],
  ['925', '#26272B'],
  ['900', '#303237'],
  ['850', '#3F4146'],
  ['800', '#4D4F55'],
  ['700', '#5E6066'],
  ['600', '#74777D'],
  ['500', '#8A8D94'],
  ['400', '#A4A4A5'],
  ['300', '#BEBAB5'],
  ['200', '#D8D1C5'],
  ['150', '#E5DCCE'],
  ['100', '#ECE3D2'],
] as const;

const PAIRS = [
  { pair: 'Ivory text on Black', fg: '#F2E8D6', bg: '#0A0A0C', min: 4.5 },
  { pair: 'Ivory text on Graphite', fg: '#F2E8D6', bg: '#1E1F23', min: 4.5 },
  { pair: 'Slate captions on Black', fg: '#8A8D94', bg: '#0A0A0C', min: 4.5 },
  { pair: 'Slate captions on Graphite', fg: '#8A8D94', bg: '#1E1F23', min: 4.5 },
  { pair: 'Black text on Ivory', fg: '#0A0A0C', bg: '#F2E8D6', min: 4.5 },
  { pair: 'Grey 700 captions on Ivory', fg: '#5E6066', bg: '#F2E8D6', min: 4.5 },
  { pair: 'Slate on Ivory (not used for text)', fg: '#8A8D94', bg: '#F2E8D6', min: 4.5 },
  { pair: 'Grey 600 control borders on Black', fg: '#74777D', bg: '#0A0A0C', min: 3 },
  { pair: 'Grey 600 control borders on Ivory', fg: '#74777D', bg: '#F2E8D6', min: 3 },
] as const;

interface SampleRow {
  check: string;
  pillar: string;
  result: (typeof RESULTS)[number];
  points: string;
}

const SAMPLE_ROWS: SampleRow[] = [
  { check: 'Google search', pillar: 'Discovered', result: 'strong', points: '30 of 30' },
  { check: 'Instagram', pillar: 'Discovered', result: 'okay', points: '15 of 25' },
  { check: 'Placement proof', pillar: 'Trusted', result: 'weak', points: '9 of 30' },
  { check: 'Fees shown', pillar: 'Chosen', result: 'missing', points: '0 of 25' },
];

const SAMPLE_COLUMNS: Column<SampleRow>[] = [
  { key: 'check', header: 'Check', render: (row) => row.check },
  { key: 'pillar', header: 'Pillar', render: (row) => row.pillar },
  { key: 'result', header: 'Result', render: (row) => <ResultBar result={row.result} size="sm" /> },
  { key: 'points', header: 'Points', align: 'end', numeric: true, render: (row) => row.points },
];

const SAMPLE_CHECKED = '2026-09-10T04:30:00Z';

const samplePart = (overrides: Partial<ItemPart>): ItemPart => ({
  checkId: 'sample',
  programId: null,
  programName: null,
  result: 'okay',
  previousResult: null,
  points: 15,
  maxPoints: 25,
  checkedAt: SAMPLE_CHECKED,
  detail: null,
  ...overrides,
});

const SAMPLE_WORKING: ListItem[] = [
  {
    rank: 1,
    key: 'google_search',
    name: 'Google search',
    pillar: 'discovered',
    strength: 'okay',
    difficulty: null,
    points: 6,
    parts: [
      samplePart({
        checkId: 'w1',
        programId: 'bba',
        programName: 'BBA',
        points: 18,
        maxPoints: 30,
        detail: { finding: 'Position 8 on Google for “BBA in Guwahati”.', whyItMatters: null, howToFix: null, fixSteps: [], difficulty: null, sourceUrl: 'https://search.example' },
      }),
    ],
  },
  {
    rank: 2,
    key: 'instagram_activity',
    name: 'Instagram',
    pillar: 'discovered',
    strength: 'okay',
    difficulty: null,
    points: 5,
    parts: [
      samplePart({
        checkId: 'w2',
        previousResult: 'weak',
        detail: { finding: 'About 2.1 posts a week over the last 4 weeks. 47% of them are reels.', whyItMatters: null, howToFix: null, fixSteps: [], difficulty: null, sourceUrl: 'https://instagram.example' },
      }),
    ],
  },
];

const SAMPLE_FIXES: ListItem[] = [
  {
    rank: 1,
    key: 'placement_proof',
    name: 'Placement proof',
    pillar: 'trusted',
    strength: null,
    difficulty: 'medium',
    points: 7,
    parts: [
      samplePart({
        checkId: 'f1',
        result: 'weak',
        points: 9,
        maxPoints: 30,
        detail: {
          finding: 'Only general claims about placements for BBA, with no numbers.',
          whyItMatters: 'Placements and results are the biggest worry for most students and parents.',
          howToFix: 'Collect real numbers for BBA: how many were placed, where, and in which year. Replace the general claims on your website with those numbers.',
          fixSteps: ['Collect real numbers for BBA: how many were placed, where, and in which year.', 'Replace the general claims on your website with those numbers.'],
          difficulty: 'medium',
          sourceUrl: 'https://northbank-college.example/placements',
        },
      }),
    ],
  },
  {
    rank: 2,
    key: 'fees_shown',
    name: 'Fees shown',
    pillar: 'chosen',
    strength: null,
    difficulty: 'easy',
    points: 4.2,
    parts: [
      samplePart({ checkId: 'f2', programId: 'bca', programName: 'BCA', result: 'weak', points: 7.5 }),
      samplePart({ checkId: 'f3', programId: 'bcom', programName: 'B.Com', result: 'missing', points: 0 }),
    ],
  },
];

SAMPLE_FIXES.push({
  rank: 3,
  key: 'google_profile',
  name: 'Google profile',
  pillar: 'discovered',
  strength: null,
  difficulty: 'medium',
  points: 4.7,
  parts: [
    samplePart({
      checkId: 'f4',
      result: 'weak',
      points: 6,
      maxPoints: 20,
      detail: { finding: 'A Google profile with 4 reviews.', whyItMatters: null, howToFix: null, fixSteps: [], difficulty: 'medium', sourceUrl: 'https://maps.example' },
    }),
  ],
});

const sampleRow = (key: AreaRowSample['key'], name: string, parts: ItemPart[]) => ({
  key,
  name,
  looksAt: '',
  pillar: 'chosen' as const,
  level: 'program' as const,
  parts,
  summary: rowSummary(parts),
});
type AreaRowSample = { key: 'fees_shown' | 'program_page' | 'easy_enquiry' };

const SAMPLE_VIEW: AuditView = {
  programId: null,
  scores: { overall: 46, discovered: 44, trusted: 44, chosen: 50 },
  changes: { overall: 5, discovered: 8, trusted: 0, chosen: 6 },
  label: 'Okay',
  firstAudit: false,
  programsChanged: false,
  // Nothing Strong yet: the Okay checks only fill a short what's working.
  working: [],
  fixes: SAMPLE_FIXES,
  okay: SAMPLE_WORKING,
  areas: [
    {
      pillar: 'chosen',
      rows: [
        sampleRow('fees_shown', 'Fees shown', [samplePart({ checkId: 'r1', result: 'weak', points: 7.5, maxPoints: 25, previousResult: 'missing' })]),
        sampleRow('program_page', 'Program page', [
          samplePart({ checkId: 'r2', programName: 'BBA', result: 'strong', points: 20, maxPoints: 20 }),
          samplePart({ checkId: 'r3', programName: 'BCA', result: 'weak', points: 6, maxPoints: 20 }),
        ]),
        sampleRow('easy_enquiry', 'Easy enquiry', [samplePart({ checkId: 'r4', result: 'okay', points: 12, maxPoints: 20 })]),
      ],
    },
  ],
};

const HISTORY = [
  { month: '2026-04', score: 64 },
  { month: '2026-05', score: 66 },
  { month: '2026-06', score: 69 },
  { month: '2026-07', score: 70 },
  { month: '2026-08', score: 72 },
  { month: '2026-09', score: 73 },
];

const MONTHS = HISTORY.map((point) => point.month);
const line = (id: string, you: boolean, scores: readonly number[]): ScoreLine => ({
  id,
  name: id,
  you,
  points: scores.map((score, index) => ({ month: MONTHS[index] as string, score })),
});

const RIVAL_TREND = scoreTrend(
  [
    line('Eastgate University', true, [59, 61, 69, 72, 73, 73]),
    line('Silverline College', false, [74, 74, 74, 74, 74, 74]),
    line('Highfield University', false, [52, 52, 52, 52, 52, 51]),
    line('Northbank College', false, [41, 41, 41, 45, 45, 46]),
  ],
  6,
);

const PILLAR_SPREAD = pillarSpread({ id: 'you', name: 'Eastgate University', scores: { overall: 73, discovered: 79, trusted: 69, chosen: 70 } }, [
  { id: 'silverline', name: 'Silverline College', scores: { overall: 74, discovered: 73, trusted: 72, chosen: 76 } },
  { id: 'highfield', name: 'Highfield University', scores: { overall: 51, discovered: 44, trusted: 66, chosen: 43 } },
  { id: 'northbank', name: 'Northbank College', scores: { overall: 46, discovered: 47, trusted: 47, chosen: 44 } },
]);

const SEARCHES = [199, 217, 243, 282, 350, 515].map((count, index) => ({ month: MONTHS[index] as string, count }));

/** Eastgate's Discovered checks, weakest first, as the Audit shows them. */
const SAMPLE_PART: PillarCheck[] = [
  { key: 'ai_answers', name: 'AI answers', result: 'missing', points: 0, maxPoints: 10 },
  { key: 'google_search', name: 'Google search', result: 'weak', points: 9, maxPoints: 30 },
  { key: 'youtube', name: 'YouTube', result: 'okay', points: 6, maxPoints: 10 },
  { key: 'other_socials', name: 'Other socials', result: 'okay', points: 3, maxPoints: 5 },
  { key: 'instagram_activity', name: 'Instagram', result: 'strong', points: 25, maxPoints: 25 },
  { key: 'google_profile', name: 'Google profile', result: 'strong', points: 20, maxPoints: 20 },
];

function Specimen({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className={styles.specimen}>
      <p className={styles.specimenLabel}>{label}</p>
      <div className={styles.specimenBody}>{children}</div>
    </div>
  );
}

function ThemePreview() {
  return (
    <div className={styles.previewBody}>
      <ScoreHero score={73} change={1} />
      <div className={styles.row}>
        {RESULTS.map((result) => (
          <ResultBar key={result} result={result} />
        ))}
      </div>
      <div className={styles.row}>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="quiet">Quiet</Button>
      </div>
      <Card>
        <FactList
          items={[
            { label: 'Plan', value: 'Paid' },
            { label: 'Ends', value: '15 Oct 2026' },
          ]}
        />
      </Card>
      <Notice tone="inverse" title="Inverted block">
        The loudest thing on a page.
      </Notice>
    </div>
  );
}

export default async function DesignSystemPage() {
  // Not open yet (src/lib/urls.ts): not found, whatever address it was asked on.
  if (!APP_OPEN) notFound();
  if (process.env.NODE_ENV === 'production') await requireTeamViewer();

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Wordmark height={18} />
        <span className={styles.topbarTitle}>Design system</span>
        <ThemeToggle />
      </header>

      <div className={styles.layout}>
        <nav className={styles.nav} aria-label="Design system sections">
          <ul>
            {NAV.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <main className={styles.content} id="main">
          <PageHeader
            eyebrow="Drishti by AdmitLabs"
            title={
              <>
                Strictly <Highlight>monochrome</Highlight>. One typeface.
              </>
            }
            description="Every token and component, in every state. Contrast comes from size, weight, width, and black and ivory surface flips. Never from colour. Use the sun and moon button to switch themes."
          />

          <Section
            id="brand"
            title="Brand"
            description="The AdmitLabs wordmark: Admit at 800, Labs at 400. The product is always shown as Drishti by AdmitLabs, with the Drishti eye before the word: three lashes from 20 px up, the eye alone below that and in the favicon. Reduced motion shows every eye still."
          >
            <div className={styles.grid3}>
              <Specimen label="Wordmark">
                <Wordmark height={28} />
              </Specimen>
              <Specimen label="Mark">
                <BrandMark size={44} />
              </Specimen>
              <Specimen label="Product lockup, still (pictures, PDFs)">
                <div className={styles.stack}>
                  <ProductLockup size="sm" />
                  <ProductLockup size="md" />
                  <ProductLockup size="lg" />
                </div>
              </Specimen>
              <Specimen label="A: opens, then blinks now and then (dashboard, login)">
                <ProductLockup size="lg" motion="blink" />
              </Specimen>
              <Specimen label="C: also follows the pointer (/drishti, the website)">
                <ProductLockup size="lg" motion="follow" />
              </Specimen>
              <Specimen label="Rise: rises from behind the word once, then C (the /drishti hero, the website's Drishti section)">
                <ProductLockup size="lg" motion="rise" />
              </Specimen>
            </div>
          </Section>

          <Section id="colour" title="Colour" description="Four brand colours and the greys between them. No accent colour, no gradients, no glow.">
            <div className={styles.swatches}>
              {BRAND.map((swatch) => (
                <div key={swatch.name} className={styles.swatch}>
                  <span className={styles.swatchChip} style={{ background: swatch.hex }} />
                  <span className={styles.swatchName}>{swatch.name}</span>
                  <span className={styles.swatchHex}>{swatch.hex}</span>
                  <span className={styles.swatchUse}>{swatch.use}</span>
                </div>
              ))}
            </div>
            <div className={styles.ramp} role="list" aria-label="Grey ramp">
              {GREYS.map(([step, hex]) => (
                <div key={step} className={styles.rampStep} role="listitem">
                  <span className={styles.rampChip} style={{ background: hex }} />
                  <span className={styles.rampLabel}>{step}</span>
                  <span className={styles.rampHex}>{hex}</span>
                </div>
              ))}
            </div>
            <Card>
              <DataTable
                caption="Contrast of the pairs we use"
                columns={[
                  {
                    key: 'pair',
                    header: 'Pair',
                    render: (row: (typeof PAIRS)[number]) => (
                      <span className={styles.pair}>
                        <span className={styles.pairChip} style={{ background: row.bg, color: row.fg }}>
                          Aa
                        </span>
                        {row.pair}
                      </span>
                    ),
                  },
                  { key: 'ratio', header: 'Ratio', align: 'end', numeric: true, render: (row) => `${contrastRatio(row.fg, row.bg).toFixed(2)}:1` },
                  { key: 'needs', header: 'Needs', align: 'end', numeric: true, render: (row) => `${row.min}:1` },
                  {
                    key: 'verdict',
                    header: 'Result',
                    align: 'end',
                    render: (row) =>
                      contrastRatio(row.fg, row.bg) >= row.min ? <Tag>Passes</Tag> : <Tag variant="solid">Below the minimum</Tag>,
                  },
                ]}
                rows={PAIRS}
                rowKey={(row) => row.pair}
              />
            </Card>
          </Section>

          <Section
            id="type"
            title="Type"
            description="Bricolage Grotesque for every word: headings, text and buttons. Inter for numbers that stand on their own, with tabular figures (the .num class). Every style comes from src/styles/tokens.css."
          >
            <Card>
              <div className={styles.typeScale}>
                <Specimen label="Display: product page only, 36 to 56px, 600">
                  <p className={styles.tDisplay}>See where you stand.</p>
                </Specimen>
                <Specimen label="Page title: 24 to 28px, 600">
                  <p className={styles.tTitle}>Who&apos;s ahead of us?</p>
                </Specimen>
                <Specimen label="Section title: 17px, 600">
                  <p className={styles.tSection}>What students want this month</p>
                </Specimen>
                <Specimen label="Card title: 15px, 600">
                  <p className={styles.tCard}>What to fix first</p>
                </Specimen>
                <Specimen label="Lead: 15px, for descriptions under titles">
                  <p className={styles.tLead}>A monthly view of how your institution looks to students.</p>
                </Specimen>
                <Specimen label="Body: 14px">
                  <p>Plain language, short sentences. A low score is an opportunity to fix something, never a failure.</p>
                </Specimen>
                <Specimen label="Small and label: 13px. Caption: 12px">
                  <p className={styles.tSmall}>Checked 15 Sep 2026 on eastgate-university.example/fees</p>
                  <p className={styles.tCaption}>Captions and metadata sit in the muted text colour.</p>
                </Specimen>
                <Specimen label="Eyebrow: 12px, 500">
                  <Eyebrow>01 / Audit</Eyebrow>
                </Specimen>
                <Specimen label="Numbers in Inter, tabular figures: the score is the one big thing">
                  <div className={styles.numbers}>
                    <span className={`${styles.tScore} num`}>73</span>
                    <span className={`${styles.tScoreMedium} num`}>73</span>
                    <span className={`${styles.tScoreSmall} num`}>73</span>
                    <span className={`${styles.tMetric} num`}>{PAID_PRICE_BY_MONTHS[DEFAULT_PAID_MONTHS].amount}</span>
                  </div>
                  <p className={styles.tCaption}>Score 56 to 104px, dial 44 to 56px, number cards 24 to 28px, other numbers 22px. All 600. Numbers inside a sentence stay in Bricolage: Could add up to 4 points.</p>
                </Specimen>
              </div>
            </Card>
            <div className={styles.grid2}>
              <Card>
                <Specimen label="Weight: 400, 500, 600, 700, 800">
                  <div className={styles.weights}>
                    {[400, 500, 600, 700, 800].map((weight) => (
                      <span key={weight} style={{ fontWeight: weight }}>
                        Drishti {weight}
                      </span>
                    ))}
                  </div>
                </Specimen>
              </Card>
              <Card>
                <Specimen label="Width: 75%, 85%, 100% at 800">
                  <div className={styles.weights}>
                    {['75%', '85%', '100%'].map((width) => (
                      <span key={width} className={styles.widthSample} style={{ fontStretch: width }}>
                        73 Strong ({width})
                      </span>
                    ))}
                  </div>
                </Specimen>
              </Card>
            </div>
          </Section>

          <Section
            id="space"
            title="Space and shape"
            description="A 4px spacing scale with generous gaps between blocks, small radii and quiet hairlines. Depth comes from surface steps, never shadows."
          >
            <div className={styles.grid2}>
              <Card>
                <div className={styles.spaceScale}>
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((step) => (
                    <div key={step} className={styles.spaceRow}>
                      <span className={styles.spaceLabel}>space {step}</span>
                      <span className={styles.spaceBar} style={{ width: `var(--space-${step})` }} />
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <div className={styles.radii}>
                  {[
                    ['xs', '2px buttons, tags'],
                    ['sm', '4px fields'],
                    ['md', '8px cards'],
                    ['lg', '12px sheets'],
                  ].map(([name, use]) => (
                    <div key={name} className={styles.radius}>
                      <span className={styles.radiusBox} style={{ borderRadius: `var(--radius-${name})` }} />
                      <span className={styles.caption}>{use}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </Section>

          <Section
            id="buttons"
            title="Buttons"
            description="Primary is an inverted block: the one thing to press. Sharp 2px corners, 600 weight, 40px tall with a mouse and 44px on touch screens."
          >
            <Card>
              <div className={styles.stack}>
                <div className={styles.row}>
                  <Button size="lg">Get your free Audit</Button>
                  <Button>Primary</Button>
                  <Button size="sm">Small</Button>
                </div>
                <div className={styles.row}>
                  <Button variant="secondary" icon="download">
                    Download report
                  </Button>
                  <Button variant="secondary" iconAfter="arrowRight">
                    See what to fix
                  </Button>
                  <Button variant="quiet">Quiet</Button>
                  <ButtonLink href="/design-system#buttons" variant="quiet" iconAfter="arrowUpRight">
                    Link button
                  </ButtonLink>
                </div>
                <div className={styles.row}>
                  <Button loading>Saving</Button>
                  <Button disabled>Disabled</Button>
                  <Button variant="secondary" disabled>
                    Disabled
                  </Button>
                  <IconButton icon="bell" label="Notifications" />
                  <IconButton icon="settings" label="Settings" variant="secondary" />
                  <IconButton icon="close" label="Close" size="sm" />
                </div>
              </div>
            </Card>
          </Section>

          <Section id="forms" title="Forms" description="Labels always visible. Errors use a heavier border, an icon and a plain sentence, never colour.">
            <div className={styles.grid2}>
              <Card>
                <div className={styles.stack}>
                  <TextField id="ds-name" label="Institution name" placeholder="Northbank College" />
                  <TextField id="ds-site" label="Website" hint="The address students would type." defaultValue="northbank-college.example" />
                  <TextField id="ds-insta" label="Instagram" defaultValue="@" error="Add the Instagram handle, like @northbankcollege." />
                  <SelectField
                    id="ds-type"
                    label="Institution type"
                    defaultValue=""
                    placeholder="Choose one"
                    options={[
                      { value: 'college', label: 'College' },
                      { value: 'university', label: 'University' },
                      { value: 'skilling', label: 'Skilling institute' },
                    ]}
                  />
                </div>
              </Card>
              <Card>
                <div className={styles.stack}>
                  <TextAreaField id="ds-notes" label="Notes" hint="Private to the AdmitLabs team." placeholder="What did the principal say?" />
                  <Checkbox id="ds-check" label="Email me when a new Audit is ready" defaultChecked />
                  <RadioGroup
                    name="ds-program"
                    legend="Program for your free Audit"
                    defaultValue="bba"
                    options={[
                      { value: 'bba', label: 'BBA' },
                      { value: 'bca', label: 'BCA', hint: 'Needs its own program page for a full check.' },
                    ]}
                  />
                  <CodeInput id="ds-code" name="code" label="6-digit code" />
                </div>
              </Card>
            </div>
            <div className={styles.grid2}>
              <Card>
                <Specimen label="City picker: all of India, the state comes with the city">
                  <CityPicker id="ds-city" defaultCity="Guwahati" defaultState="Assam" />
                </Specimen>
              </Card>
              <Card>
                <Specimen label="Program picker: the fixed list, plus Other">
                  <ProgramPicker
                    id="ds-programs"
                    defaultPrograms={[
                      { name: 'BBA', programKey: 'bba' },
                      { name: 'Aviation Safety', programKey: null },
                    ]}
                  />
                </Specimen>
              </Card>
            </div>
            <Card>
              <Specimen label="Segmented control">
                <SegmentedDemo />
              </Specimen>
            </Card>
          </Section>

          <Section
            id="results"
            title="Results"
            description="Strong, Okay, Weak, Missing. A thin bar of the points earned against possible, then the word, always beside it. A part's checks: every one as a row, weakest first, where there is room; one bar split by result, each count under its piece, then what to fix first, where it is tight. Missing is a dashed outline."
          >
            <Card>
              <div className={styles.resultsGrid}>
                {(['lg', 'md', 'sm'] as const).map((size) => (
                  <div key={size} className={styles.resultsRow}>
                    <span className={styles.caption}>{size}</span>
                    {RESULTS.map((result) => (
                      <ResultBar key={result} result={result} size={size} />
                    ))}
                  </div>
                ))}
                <div className={styles.resultsRow}>
                  <span className={styles.caption}>points</span>
                  <ResultBar result="okay" points={18} max={30} />
                  <ResultBar result="missing" points={0} max={30} />
                </div>
              </div>
            </Card>
            <div className={styles.grid2}>
              <Card>
                <Specimen label="A part's checks, where there is room: every one named, weakest first">
                  <CheckRows checks={SAMPLE_PART} />
                </Specimen>
              </Card>
              <Card>
                <Specimen label="Where it is tight: one bar split by result, each count under its piece, then what to fix first">
                  <div className={styles.stack}>
                    <SplitBar checks={SAMPLE_PART} label="Discovered checks" />
                    <FixFirst check={SAMPLE_PART[0] ?? null} />
                  </div>
                </Specimen>
              </Card>
            </div>
            <div className={styles.grid3}>
              <Card>
                <Specimen label="Score labels (70 to 100, 40 to 69, 0 to 39)">
                  <div className={styles.row}>
                    <ScoreLabel score={82} />
                    <ScoreLabel score={55} />
                    <ScoreLabel score={24} />
                  </div>
                </Specimen>
              </Card>
              <Card>
                <Specimen label="Change since last Audit">
                  <div className={styles.stackTight}>
                    <Delta change={6} />
                    <Delta change={-3} />
                    <Delta change={0} />
                    <Delta change={null} />
                  </div>
                </Specimen>
              </Card>
              <Card>
                <Specimen label="How hard to fix">
                  <div className={styles.stackTight}>
                    <Difficulty value="easy" />
                    <Difficulty value="medium" />
                    <Difficulty value="hard" />
                  </div>
                </Specimen>
              </Card>
            </div>
          </Section>

          <Section
            id="audit"
            title="Audit"
            description="Readable in ten seconds: how we're doing, what to fix first, where the detail is. The verdict names the strength first, then the next step."
          >
            <ProgramTabs
              allLabel="All programs"
              active={null}
              entries={[
                { id: 'bba', name: 'BBA', state: 'scored', score: { overall: 46, change: 5 } },
                { id: 'bca', name: 'BCA', state: 'scored', score: { overall: 52, change: null } },
                { id: 'bcom', name: 'B.Com', state: 'locked' },
              ]}
            />
            <SummaryBand view={SAMPLE_VIEW} />
            <Specimen label="Fix these first">
              <FixCards items={SAMPLE_FIXES} />
            </Specimen>
            <div className={styles.grid2}>
              <Specimen label="What's working">
                <WorkingRows items={SAMPLE_WORKING} />
              </Specimen>
              <Specimen label="Checks, one row each: a program check whose programs differ shows its weakest program">
                <ChecksTable view={SAMPLE_VIEW} />
              </Specimen>
            </div>
            <UnlockCard moreFixes={14} moreStrengths={5} lockedPrograms={2} action={<Button iconAfter="arrowRight">Subscribe now</Button>} />
          </Section>

          <Section id="data" title="Data" description="One hero number per view. Every finding carries its source and the date it was checked.">
            <div className={styles.grid2}>
              <Card padding="lg">
                <ScoreHero score={73} change={1} />
              </Card>
              <Card padding="lg">
                <PillarScores
                  scores={[
                    { pillar: 'discovered', score: 81, change: 3 },
                    { pillar: 'trusted', score: 68, change: -2 },
                    { pillar: 'chosen', score: 70, change: 0 },
                  ]}
                />
              </Card>
            </div>
            <div className={styles.grid3}>
              <Card>
                <Stat label="Programs audited" value="5" sub="All programs on Paid" />
              </Card>
              <Card>
                <Stat label="Rivals tracked" value="3" sub="3 to 5 allowed" />
              </Card>
              <Card>
                <Stat label="Paid" value={PAID_PRICE_BY_MONTHS[DEFAULT_PAID_MONTHS].amount} sub={`${PAID_PRICE_BY_MONTHS[DEFAULT_PAID_MONTHS].tax} ${PAID_PRICE_BY_MONTHS[DEFAULT_PAID_MONTHS].term}`} />
              </Card>
            </div>
            <Card>
              <div className={styles.stack}>
                <SourceLine url="https://eastgate-university.example/placements#mba" checkedAt="2026-09-15T04:30:00Z" />
                <div className={styles.row}>
                  <Tag>Outline tag</Tag>
                  <Tag variant="solid">Solid tag</Tag>
                  <Tag variant="quiet">Quiet tag</Tag>
                </div>
              </div>
            </Card>
            <Card>
              <DataTable caption="Sample checks (phone: rows become cards)" columns={SAMPLE_COLUMNS} rows={SAMPLE_ROWS} rowKey={(row) => row.check} />
            </Card>
          </Section>

          <Section id="charts" title="Charts" description="Hand-built SVG. 2px lines, ringed end points, hairline grids, values labelled where they matter. Hover or use arrow keys to read a chart.">
            <div className={styles.grid3}>
              <Card className={styles.center}>
                <ScoreGauge score={81} />
              </Card>
              <Card className={styles.center}>
                <ScoreGauge score={52} />
              </Card>
              <Card className={styles.center}>
                <ScoreGauge score={27} />
              </Card>
            </div>
            <Card>
              <Specimen label="Score history, April to September 2026">
                <HistoryLine points={HISTORY} />
              </Specimen>
            </Card>
            <div className={styles.grid2}>
              <Card>
                <Specimen label="Head to head (you in the text colour, the rival in grey, each named beside its bar)">
                  <HeadToHead
                    rivalName="Silverline College"
                    rows={[
                      { label: 'Overall', you: 46, rival: 74 },
                      { label: 'Discovered', you: 44, rival: 79 },
                      { label: 'Trusted', you: 44, rival: 76 },
                      { label: 'Chosen', you: 50, rival: 82 },
                    ]}
                  />
                </Specimen>
              </Card>
              <Card>
                <Specimen label="Sparklines (every point with its value and month, as on Reports)">
                  <div className={styles.stack}>
                    <Sparkline values={[28, 33, 41, 52, 58, 63]} months={MONTHS} label="Brightpath overall score" width={196} height={72} />
                    <Sparkline values={[64, 66, 69, 70, 72, 73]} months={MONTHS} label="Eastgate overall score" width={196} height={72} />
                  </div>
                </Specimen>
              </Card>
            </div>
            <Card>
              <Specimen label="Part by part (each part ranked, real names, your row highlighted, the gap in words)">
                <PartRanks rows={PILLAR_SPREAD} />
              </Specimen>
            </Card>
            <div className={styles.grid2}>
              <Card>
                <Specimen label="Month by month (every month a number; a phone keeps the last three)">
                  <MonthTable trend={RIVAL_TREND} label="Overall score by month, you and your rivals" />
                </Specimen>
              </Card>
              <Card>
                <Specimen label="Counts by month (every month's count on its bar, the newest in the text colour)">
                  <MonthBars points={SEARCHES} title="Searches by month" valueLabel="Searches" />
                </Specimen>
              </Card>
            </div>
          </Section>

          <Section id="layout" title="Layout" description="Cards on a calm surface. An inverted card is the loudest thing on a page, so there is rarely more than one.">
            <div className={styles.grid3}>
              <Card>
                <Eyebrow>Card</Eyebrow>
                <p className={styles.cardText}>Raised surface with a hairline border.</p>
              </Card>
              <Card inverted>
                <Eyebrow>Inverted card</Eyebrow>
                <p className={styles.cardText}>Everything inside flips, including muted text.</p>
              </Card>
              <Card>
                <FactList
                  items={[
                    { label: 'Started', value: '15 Apr 2026' },
                    { label: 'Ends', value: '15 Oct 2026' },
                    { label: 'Days left', value: '15' },
                  ]}
                />
              </Card>
            </div>
          </Section>

          <Section id="overlays" title="Navigation and overlays" description="Tabs and segmented controls use arrow keys. The side panel is full screen on a phone.">
            <Card>
              <div className={styles.stack}>
                <TabsDemo />
                <OverlayDemo />
              </div>
            </Card>
          </Section>

          <Section id="feedback" title="Feedback" description="Plain words. A low score is an opportunity, never a failure.">
            <div className={styles.stack}>
              <Notice title="Your new Audit is ready" action={<Button size="sm" variant="secondary">See what changed</Button>}>
                Sample notice. Up 4 since your last Audit.
              </Notice>
              <Notice tone="inverse" title="Your Paid plan ends in 15 days, on 15 Oct 2026.">
                It does not renew on its own. When it ends you move to Free, and you keep your last Audit score.
              </Notice>
              <EmptyState icon="rivals" title="No rivals picked yet" headingLevel={3} action={<Button size="sm">Pick your rivals</Button>}>
                Drishti suggests rivals of the same type, with overlapping programs, in your city first.
              </EmptyState>
              <Card>
                <SkeletonGroup label="Loading sample">
                  <Skeleton width="40%" height="1.5rem" />
                  <Skeleton />
                  <Skeleton width="85%" />
                </SkeletonGroup>
              </Card>
            </div>
          </Section>

          <Section
            id="gating"
            title="Plan gating"
            description="Show enough to prove the data is real, blur the rest, offer one action. The blurred part is always fake placeholder content: locked data never reaches the page."
          >
            <Card>
              <LockedPanel
                title="See every check with its source"
                description="Paid shows what was found, where, and when, for every check."
                teaser={<p className={styles.caption}>17 checks, 4 of them sample rows below.</p>}
                placeholder={<DataTable caption="Placeholder" hideCaption columns={SAMPLE_COLUMNS} rows={SAMPLE_ROWS} rowKey={(row) => row.check} />}
              />
            </Card>
          </Section>

          <Section id="icons" title="Icons" description="Hand-drawn on a 24px grid, 1.75px strokes with square ends. Decorative unless they stand alone.">
            <Card>
              <ul className={styles.icons}>
                {ICON_NAMES.map((name) => (
                  <li key={name} className={styles.iconCell}>
                    <Icon name={name} size={24} />
                    <span>{name}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </Section>

          <Section id="themes" title="Both themes" description="The same components on the black surface and the ivory surface, side by side.">
            <div className={styles.grid2}>
              <div data-theme="dark" className={styles.preview}>
                <p className={styles.previewLabel}>Dark: black surface</p>
                <ThemePreview />
              </div>
              <div data-theme="light" className={styles.preview}>
                <p className={styles.previewLabel}>Light: ivory surface</p>
                <ThemePreview />
              </div>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
