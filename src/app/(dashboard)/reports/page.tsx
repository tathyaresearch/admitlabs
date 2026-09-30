import { ComingSoon } from '@/components/shell/ComingSoon';

export const metadata = { title: 'Reports' };

export default function ReportsPage() {
  return (
    <ComingSoon title="Reports" question="Your month on one page" phase={5} icon="reports">
      A short PDF every month: your score, what&apos;s working, what to fix, your rivals, what students want, and 3 things to do. Readable in 5
      minutes.
    </ComingSoon>
  );
}
