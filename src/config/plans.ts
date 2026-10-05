// Plan rules (spec section 5). One paid plan, Paid, billed for one month or for 3 months. Each is
// a fixed plan price: no discount codes or offers. Every price in the product comes from here.

/** How long a Paid plan runs, in months: Monthly, or 3 months. */
export type PaidMonths = 1 | 3;

export const PAID_MONTHS: readonly PaidMonths[] = [1, 3];

/**
 * [ADJUSTABLE] Paid's two billing periods, each a fixed price with GST added on top: written
 * "₹9,999 + GST per month" and "₹24,999 + GST for 3 months". `reminderDaysBefore`: the first
 * renewal reminder (Renew now shows from then), then the last one.
 */
const PAID_PERIODS = {
  1: { priceInr: 9999, reminderDaysBefore: [7] },
  3: { priceInr: 24999, reminderDaysBefore: [30, 7] },
} as const satisfies Record<PaidMonths, { priceInr: number; reminderDaysBefore: readonly number[] }>;

/** The period shown first, on /drishti and the Plan page, and picked first for Subscribe now. */
const DEFAULT_MONTHS: PaidMonths = 3;

export const PLAN_RULES = {
  free: {
    priceInr: 0,
  },
  paid: {
    periods: PAID_PERIODS,
    defaultMonths: DEFAULT_MONTHS,
    plusGst: true,
    autoRenew: false,
  },
  client: {
    /** Included with AdmitLabs services. Lasts while the service is active; Admin sets it. */
    priceInr: null,
  },
} as const;
