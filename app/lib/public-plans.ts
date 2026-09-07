import type { BillingInterval } from "@/app/lib/billing-format";

/**
 * The published price list, read from the API rather than retyped.
 *
 * `/pricing` exists because Razorpay requires a public price list, and the
 * plans it describes are database rows an owner can edit from the admin console
 * (`PUT /v1/admin/plans/:code`). A hardcoded copy of those numbers is a page
 * that can quietly start lying about what a customer will be charged — the one
 * thing a merchant-policy page must never do.
 *
 * Read on the server so the prices are in the HTML for crawlers and for a
 * reviewer who does not run scripts.
 */
export interface PublicPlan {
    code: string;
    name: string;
    billing_interval: BillingInterval;
    price_minor: number | null;
    currency: string;
    included_credits: number;
    daily_credit_limit: number;
    requires_prior_paid_months: number;
}

/** How long a pass lasts, in the plain terms the page is written in. */
const INTERVAL_DAYS: Record<string, string> = {
    weekly: "7 days",
    monthly: "30 days",
    quarterly: "90 days",
    yearly: "365 days",
};

export function intervalDuration(interval: string): string {
    return INTERVAL_DAYS[interval] ?? interval;
}

/**
 * Mirrors the backend's own `defaultBillingPlans()`, which it serves when the
 * plans table is empty. This is a last resort for the case where the API cannot
 * be reached while the page renders — without it a build outage would publish
 * a price page with no prices on it, which is worse than slightly stale ones.
 *
 * Keep in step with `internal/http/billing.go`.
 */
const FALLBACK_PLANS: PublicPlan[] = [
    { code: "weekly_pass", name: "Weekly Pass", billing_interval: "weekly", price_minor: 7900, currency: "INR", included_credits: 800, daily_credit_limit: 200, requires_prior_paid_months: 0 },
    { code: "monthly", name: "Monthly", billing_interval: "monthly", price_minor: 14900, currency: "INR", included_credits: 3600, daily_credit_limit: 250, requires_prior_paid_months: 0 },
    { code: "quarterly", name: "Quarterly", billing_interval: "quarterly", price_minor: 32900, currency: "INR", included_credits: 11000, daily_credit_limit: 300, requires_prior_paid_months: 0 },
    { code: "yearly", name: "Yearly", billing_interval: "yearly", price_minor: 79900, currency: "INR", included_credits: 48000, daily_credit_limit: 350, requires_prior_paid_months: 0 },
];

function apiBase() {
    // API_URL is the server-side name the admin BFF already uses; the public one
    // is the fallback so a deploy that only sets NEXT_PUBLIC_API_URL still works.
    return (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
}

function isSelfServe(plan: PublicPlan) {
    // Lifetime is quote-only and has its own section on the page. Anything the
    // API marks as needing prior paid months is not something a visitor can buy
    // today, so it does not belong in a table of published prices.
    return plan.billing_interval !== "lifetime_quote"
        && plan.requires_prior_paid_months === 0
        && typeof plan.price_minor === "number";
}

export interface PublishedPrices {
    plans: PublicPlan[];
    /** False when the list is the committed fallback rather than the live API. */
    live: boolean;
}

export async function fetchPublishedPrices(): Promise<PublishedPrices> {
    try {
        const response = await fetch(`${apiBase()}/v1/billing/plans`, {
            headers: { Accept: "application/json" },
            // Revalidated hourly. A price change reaches the public page within
            // the hour without a redeploy, and a brief API outage keeps serving
            // the last good render rather than falling back.
            next: { revalidate: 3600 },
        });
        if (!response.ok) throw new Error(`plans responded ${response.status}`);
        const payload = (await response.json()) as { plans?: PublicPlan[] };
        const plans = (payload.plans ?? []).filter(isSelfServe);
        if (!plans.length) throw new Error("no self-serve plans returned");
        return { plans, live: true };
    } catch {
        return { plans: FALLBACK_PLANS, live: false };
    }
}
