import { ComingSoon } from '@/components/shell/ComingSoon';

export const metadata = { title: 'Rivals' };

export default function RivalsPage() {
  return (
    <ComingSoon title="Rivals" question="Who's ahead of us, and what are they doing?" phase={3} icon="rivals">
      Head to head scores, where you lead and where they lead, their best content and what to learn from it, and their moves this month. Rivals never
      know who tracks them.
    </ComingSoon>
  );
}
