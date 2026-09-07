/**
 * Pure display helpers for billing.
 *
 * Kept apart from `billing.ts` because that module pulls in the axios client,
 * and the test harness compiles plain TypeScript with `tsc` and runs it under
 * `node --test` — no bundler, no path aliases. Arithmetic on money is exactly
 * the part worth testing, so it lives where it can be.
 */

export type BillingInterval = "weekly" | "monthly" | "quarterly" | "yearly" | "lifetime_quote";

export interface PricedPlan {
    price_minor: number | null;
    list_price_minor: number | null;
}

/** Paise to a displayable rupee amount. Whole rupees drop the ".00". */
export function formatMinor(amountMinor: number, currency = "INR"): string {
    const major = amountMinor / 100;
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        minimumFractionDigits: Number.isInteger(major) ? 0 : 2,
        maximumFractionDigits: 2,
    }).format(major);
}

const INTERVAL_LABELS: Record<BillingInterval, string> = {
    weekly: "week",
    monthly: "month",
    quarterly: "3 months",
    yearly: "year",
    lifetime_quote: "lifetime",
};

export function intervalLabel(interval: BillingInterval): string {
    return INTERVAL_LABELS[interval] ?? interval;
}

/**
 * The saving against the list price, as a whole percentage.
 *
 * Returns null rather than 0 when there is nothing to shout about, so the
 * caller drops the badge instead of rendering "Save 0%". A list price below
 * the sale price is treated the same way — a negative discount is a data
 * error, not something to advertise.
 */
export function discountPercent(plan: PricedPlan): number | null {
    if (plan.price_minor == null || plan.list_price_minor == null) return null;
    if (plan.list_price_minor <= plan.price_minor) return null;
    const percent = Math.round((1 - plan.price_minor / plan.list_price_minor) * 100);
    return percent > 0 ? percent : null;
}
