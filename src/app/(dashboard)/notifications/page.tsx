import { ComingSoon } from '@/components/shell/ComingSoon';

export const metadata = { title: 'Notifications' };

export default function NotificationsPage() {
  return (
    <ComingSoon title="Notifications" question="What changed" phase={2} icon="bell">
      A note when your new Audit is ready, and alerts when a rival makes a move or a student question suddenly grows.
    </ComingSoon>
  );
}
