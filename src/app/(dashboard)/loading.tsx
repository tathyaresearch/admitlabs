import { PageSkeleton } from '@/components/ui/Skeleton';

// Shown straight away while a dashboard page loads. The sidebar stays as it is.
export default function Loading() {
  return <PageSkeleton />;
}
