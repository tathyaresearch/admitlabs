'use client';

// Paid's extra refresh, once each calendar month. The server checks the limit again.

import { useActionState } from 'react';
import { refreshAuditAction, type RefreshState } from '@/app/(dashboard)/audit/actions';
import { Button } from '@/components/ui/Button';
import styles from './audit.module.css';

const IDLE: RefreshState = { status: 'idle', message: null };

export function RefreshButton({ left, resetsOn }: { left: number; resetsOn: string }) {
  const [state, action, pending] = useActionState(refreshAuditAction, IDLE);

  if (left <= 0) {
    return (
      <p className={styles.actionNote} role="status">
        {state.status === 'done' ? state.message : `This month's extra refresh is used. It comes back on ${resetsOn}.`}
      </p>
    );
  }

  return (
    <form action={action} className={styles.refresh}>
      <Button type="submit" variant="secondary" size="sm" icon="refresh" loading={pending}>
        {pending ? 'Checking again' : 'Refresh now'}
      </Button>
      <p className={styles.actionNote} role="status">
        {state.message ?? '1 extra refresh left this month'}
      </p>
    </form>
  );
}
