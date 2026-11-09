import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/app/components/LegalPage";
import { discountPercent, formatMinor } from "@/app/lib/billing-format";
import { fetchPublishedPrices, intervalDuration } from "@/app/lib/public-plans";

export const metadata: Metadata = {
    title: "Pricing | Finnri",
    description: "Finnri paid-pass prices, durations, AI credits, and purchase terms in INR.",
};

// Prices are read from the API on the server; see `app/lib/public-plans.ts`.
export const revalidate = 3600;

export default async function PricingPage() {
    const { plans } = await fetchPublishedPrices();

    return (
        <LegalPage title="Pricing" effectiveDate="7 October 2026" intro={<p>Finnri&apos;s paid access is sold as fixed-duration, one-time passes in Indian rupees. Passes do not renew automatically.</p>}>
            <section>
                <h2>Published plans</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                    {plans.map((plan) => (
                        <article key={plan.code} className="rounded-2xl border border-border bg-card p-5">
                            <h3 className="text-lg font-bold">{plan.name}</h3>
                            <p className="mt-2 flex flex-wrap items-baseline gap-2">
                                <span className="text-3xl font-bold text-foreground">{formatMinor(plan.offer?.price_minor ?? plan.price_minor ?? 0, plan.currency)}</span>
                                {plan.offer ? (
                                    <s className="text-sm">{formatMinor(plan.offer.original_price_minor, plan.currency)}</s>
                                ) : discountPercent(plan) != null && plan.list_price_minor != null && (
                                    <s className="text-sm">{formatMinor(plan.list_price_minor, plan.currency)}</s>
                                )}
                            </p>
                            {plan.offer && <p className="mt-1 text-xs font-bold text-eyebrow">{plan.offer.label} · {plan.offer.percent_off}% off your first pass</p>}
                            <p className="mt-2 text-sm">{intervalDuration(plan.billing_interval)} · {plan.included_credits.toLocaleString("en-IN")} credits</p>
                            <p className="mt-1 text-sm">Up to {plan.daily_credit_limit.toLocaleString("en-IN")} credits per day</p>
                        </article>
                    ))}
                </div>
                <p className="mt-5 text-sm">Struck-through amounts are the full price. These are the same plans the app offers. The amount you will be charged is shown again on the checkout screen before any payment is taken.</p>
            </section>
            <section><h2>Free plan</h2><p>Manual tracking, accounts, search, split groups and CSV export are free with no time limit. Signing in with Google adds a one-time trial of AI credits for voice and text capture; a guest session gets a smaller trial. No payment details are needed to use the free plan.</p></section>
            <section><h2>What a paid pass includes</h2><p>Paid passes increase your AI credits, which pay for AI capture, bill scans and statement reads. Budgets, insights and subscription reminders are free for everyone. The checkout screen confirms the selected plan, amount, and currency before payment.</p></section>
            <section><h2>One-time purchase; no automatic renewal</h2><p>Finnri currently creates a separate one-time payment for each pass. There is no automatic debit mandate. Access ends after the stated duration unless you explicitly buy another pass; buying early queues the new paid period after an active period.</p></section>
            <section><h2>Lifetime access</h2><p>Lifetime access is not available through self-serve checkout. Eligible customers with at least three paid months may request an individual quote from inside Finnri. Any quote states its price and terms before payment.</p></section>
            <section><h2>Taxes and changes</h2><p>Displayed consumer prices are in INR and include applicable taxes unless checkout states otherwise. Finnri may change prices for future purchases, but a change does not shorten a pass already paid for.</p><p className="mt-5"><Link href="/login">Open Finnri to choose a plan</Link></p></section>
        </LegalPage>
    );
}
