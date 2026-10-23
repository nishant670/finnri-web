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

/**
 * The launch offer on one plan, as `GET /v1/billing/plans` sends it while the
 * offer runs (`LAUNCH_OFFER_STARTS_AT` on the API). The plan's own
 * `price_minor` stays the regular price; this is what checkout charges an
 * eligible first-time buyer.
 */
export interface PlanOffer {
    code: string;
    label: string;
    percent_off: number;
    price_minor: number;
    original_price_minor: number;
    ends_at: string;
    /** Sent only when few places remain. */
    spots_left?: number | null;
}

/** The offer as it applies to the signed-in user, from billing status. */
export interface LaunchOfferStatus {
    active: boolean;
    /** False once this user has bought at the launch price. */
    eligible: boolean;
    code: string;
    label: string;
    percent_off: number;
    ends_at?: string;
    spots_left?: number | null;
}

/**
 * The offer this viewer would actually be charged on a plan, or null.
 *
 * The plan list is public and cannot know who is asking. Billing status can:
 * once the user has bought at the launch price, or the offer has sold out, it
 * says so, and the page must show the regular price checkout will charge.
 * With no status (signed out), the public offer stands.
 */
export function offerForViewer(
    plan: { offer?: PlanOffer | null },
    status?: { launch_offer?: LaunchOfferStatus | null } | null,
): PlanOffer | null {
    if (!plan.offer) return null;
    if (status && (!status.launch_offer?.active || !status.launch_offer.eligible)) return null;
    return plan.offer;
}

export interface LaunchOfferNotice {
    percentOff: number;
    /** Named only when the server reports few places left. */
    spotsLeft: number | null;
    /** True when this user has already bought at the launch price. */
    used: boolean;
}

/**
 * What the banner above the plans says, or null when no offer runs. Someone
 * who has used the offer still sees it, told why their prices are regular.
 */
export function launchOfferNotice(
    plans: { offer?: PlanOffer | null }[],
    status?: { launch_offer?: LaunchOfferStatus | null } | null,
): LaunchOfferNotice | null {
    const offer = status
        ? (status.launch_offer?.active ? status.launch_offer : null)
        : (plans.find((plan) => plan.offer)?.offer ?? null);
    if (!offer) return null;
    return {
        percentOff: offer.percent_off,
        spotsLeft: offer.spots_left ?? null,
        used: Boolean(status) && !status?.launch_offer?.eligible,
    };
}
