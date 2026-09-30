import { ComingSoon } from '@/components/shell/ComingSoon';

export const metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <ComingSoon title="Settings" question="Your institution's details" phase={2} icon="settings">
      Institution details, programs, social links and the people who can see your dashboard. Arrives with onboarding.
    </ComingSoon>
  );
}
