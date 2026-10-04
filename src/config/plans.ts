// Plan rules (spec section 5). One paid plan only: 6 months, no yearly plan, no discounts.

export const PLAN_RULES = {
  free: {
    priceInr: 0,
  },
  paid: {
    /** [ADJUSTABLE] Written "₹24,999 + GST" with "for 6 months": GST is added on top. */
    priceInr: 24999,
    plusGst: true,
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
