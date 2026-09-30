// Plan rules (spec section 5). One paid plan only: 6 months, no yearly plan, no discounts.

export const PLAN_RULES = {
  free: {
    priceInr: 0,
  },
  paid: {
    priceInr: 9999,
    lengthMonths: 6,
    autoRenew: false,
    /** In-app reminders before the end date (email later). */
    reminderDaysBefore: [30, 7] as const,
  },
  client: {
    /** Included with AdmitLabs services. Lasts while the service is active; Admin sets it. */
    priceInr: null,
  },
} as const;
