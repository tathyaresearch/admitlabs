import { ComingSoon } from '@/components/shell/ComingSoon';

export const metadata = { title: 'Demand' };

export default function DemandPage() {
  return (
    <ComingSoon title="Demand" question="What are students asking, wanting and worrying about?" phase={4} icon="demand">
      Rising and falling courses, the top student questions, top worries, what students say about you and your rivals, the admission season, and
      content ideas. Always grouped, never about one person.
    </ComingSoon>
  );
}
