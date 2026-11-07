"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, CreditCard, Loader2, Rocket, ShieldAlert, Sparkles } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import { buttonPrimary, buttonSecondary, ErrorNotice, PageHeader, Panel, SectionTitle } from "@/app/components/dashboard/kit";
import { cn } from "@/app/lib/utils";
import { apiErrorMessage } from "@/app/lib/api";
import { formatDate } from "@/app/lib/format";
import {
    BillingPlan,
    BillingStatus,
    createCheckoutOrder,
    fetchBillingPlans,
    fetchBillingStatus,
    openCheckout,
} from "@/app/lib/billing";
import {
    discountPercent,
    formatMinor,
    intervalLabel,
    launchOfferNotice,
    offerForViewer,
    type LaunchOfferNotice,
    type PlanOffer,
} from "@/app/lib/billing-format";

/**
 * How long to keep asking the backend whether the payment landed.
 *
 * The browser is never the authority on its own purchase — a signed webhook
 * is — so after checkout closes this page polls until the subscription it was
 * promised actually appears. UPI in particular can take several seconds to
 * settle after the dialog has already closed.
 */
const CONFIRM_POLL_INTERVAL_MS = 2000;
const CONFIRM_POLL_ATTEMPTS = 15;

type PurchaseState =
    | { phase: "idle" }
    | { phase: "opening"; planCode: string }
    | { phase: "confirming"; planCode: string }
    | { phase: "confirmed"; planCode: string }
    | { phase: "pending"; planCode: string }
    | { phase: "error"; message: string };

export default function BillingScreen() {
    const { user } = useAuth();
    const [plans, setPlans] = useState<BillingPlan[]>([]);
    const [status, setStatus] = useState<BillingStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [purchase, setPurchase] = useState<PurchaseState>({ phase: "idle" });
    const cancelled = useRef(false);

    useEffect(() => {
        cancelled.current = false;
        return () => {
            cancelled.current = true;
        };
    }, []);

    const load = useCallback(async () => {
        try {
            const [loadedPlans, loadedStatus] = await Promise.all([fetchBillingPlans(), fetchBillingStatus()]);
            if (cancelled.current) return;
            setPlans(loadedPlans);
            setStatus(loadedStatus);
            setLoadError("");
        } catch (error) {
            if (!cancelled.current) setLoadError(apiErrorMessage(error, "We couldn’t load your plan details."));
        } finally {
            if (!cancelled.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    /**
     * Polls until the subscription the payment bought shows up, then reports
     * whether it did. A false result is not a failure — a UPI collect request
     * can take minutes — so the caller says "we'll email you", not "it broke".
     */
    const waitForEntitlement = useCallback(async (previousEnd?: string): Promise<boolean> => {
        for (let attempt = 0; attempt < CONFIRM_POLL_ATTEMPTS; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, CONFIRM_POLL_INTERVAL_MS));
            if (cancelled.current) return false;
            try {
                const latest = await fetchBillingStatus();
                if (cancelled.current) return false;
                setStatus(latest);
                // A new period end is the observable proof the webhook ran.
                if (latest.current_period_end && latest.current_period_end !== previousEnd) {
                    return true;
                }
            } catch {
                // A blip mid-poll is not an answer either way; keep asking.
            }
        }
        return false;
    }, []);

    const handleBuy = async (plan: BillingPlan) => {
        setPurchase({ phase: "opening", planCode: plan.code });
        const previousEnd = status?.current_period_end;
        try {
            const order = await createCheckoutOrder(plan.code);
            const outcome = await openCheckout(order, {
                name: user?.username,
                email: user?.email,
                contact: user?.phone,
            });
            if (outcome === "dismissed") {
                setPurchase({ phase: "idle" });
                return;
            }
            setPurchase({ phase: "confirming", planCode: plan.code });
            const confirmed = await waitForEntitlement(previousEnd);
            if (cancelled.current) return;
            setPurchase({ phase: confirmed ? "confirmed" : "pending", planCode: plan.code });
            if (confirmed) void load();
        } catch (error) {
            if (cancelled.current) return;
            setPurchase({ phase: "error", message: apiErrorMessage(error, "We couldn’t start checkout. Please try again.") });
        }
    };

    const busy = purchase.phase === "opening" || purchase.phase === "confirming";
    const purchasable = plans.filter((plan) => plan.billing_interval !== "lifetime_quote");
    const checkoutAvailable = purchasable.some((plan) => plan.checkout_enabled);
    const offerNotice = launchOfferNotice(purchasable, status);

    const isPaid = Boolean(status?.plan) && status?.subscription_status === "active";
    const notice = "rounded-2xl px-4 py-3 text-sm font-medium";

    return (
        <div className="mx-auto max-w-5xl space-y-5 pb-20">
            <PageHeader title="Plan & billing" description="Pay by UPI, card or net banking. Every pass is a one-off purchase; nothing renews on its own." />

            {loading && <Panel className="flex items-center gap-3 p-5 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Loading your plan…</Panel>}
            {!loading && loadError && <ErrorNotice message={loadError} />}
            {!loading && !loadError && status && <CurrentPlanCard status={status} />}

            {user?.is_guest && (
                <section className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning-surface p-4 sm:p-5">
                    <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                    <div>
                        <h2 className="font-bold">Save your workspace before you buy</h2>
                        <p className="mt-0.5 text-sm text-muted">A pass is tied to an account. Save this guest workspace first so the pass you buy stays with your data.</p>
                    </div>
                </section>
            )}

            {purchase.phase === "error" && <ErrorNotice message={purchase.message} />}
            {purchase.phase === "confirmed" && <p role="status" className={`${notice} flex items-center gap-2 bg-positive/10 text-positive`}><CheckCircle2 className="h-4 w-4" /> Payment confirmed. Your pass is active.</p>}
            {purchase.phase === "pending" && <p role="status" className={`${notice} bg-track`}>Your payment is still being confirmed by the bank. This page updates on its own once it lands; you don’t need to pay again.</p>}
            {!loading && !loadError && !checkoutAvailable && purchasable.length > 0 && <p className={`${notice} bg-track text-muted`}>Checkout isn’t open yet. These are the passes it will offer.</p>}
            {!loading && !loadError && offerNotice && <LaunchOfferBanner notice={offerNotice} />}

            {!loading && !loadError && (
                <section aria-labelledby="passes-heading">
                    <SectionTitle id="passes-heading" title="Passes" detail="More AI credits for capture, scans and statements" />
                    <div className="grid gap-4 md:grid-cols-3">
                        {purchasable.map((plan) => (
                            <PlanCard
                                key={plan.code}
                                plan={plan}
                                offer={offerForViewer(plan, status)}
                                current={isPaid && status?.plan?.code === plan.code}
                                best={plan.billing_interval === "yearly"}
                                busy={busy}
                                pendingCode={"planCode" in purchase ? purchase.planCode : undefined}
                                disabled={busy || Boolean(user?.is_guest)}
                                onBuy={() => handleBuy(plan)}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}

function Meter({ label, used, total, detail }: { label: string; used: number; total: number; detail: string }) {
    const share = total > 0 ? Math.min(1, Math.max(0, used / total)) : 0;
    return (
        <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3"><dt className="text-[13px] font-semibold text-muted">{label}</dt><dd className="text-[13px] text-muted">{detail}</dd></div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={total} aria-valuenow={used}><div className="h-full rounded-full bg-accent" style={{ width: `${share * 100}%` }} /></div>
        </div>
    );
}

function CurrentPlanCard({ status }: { status: BillingStatus }) {
    const isPaid = Boolean(status.plan) && status.subscription_status === "active";
    const credits = status.credits;
    return (
        <Panel className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-selected text-accent"><Sparkles className="h-5 w-5" /></span>
                    <div>
                        <p className="text-[13px] font-semibold text-muted">Your plan</p>
                        <h2 className="font-display text-2xl font-bold">{status.plan?.name ?? "Finnri Free"}</h2>
                        <p className="mt-0.5 text-sm text-muted">{isPaid && status.current_period_end ? `Active until ${formatDate(new Date(status.current_period_end))}. It won’t renew on its own.` : "You’re on the free plan."}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-display text-[32px] font-bold leading-none tabular-nums">{credits.total_credits_remaining.toLocaleString("en-IN")}</p>
                    <p className="mt-1 text-[13px] text-muted">AI credits left</p>
                </div>
            </div>
            <dl className="mt-5 grid gap-4 sm:max-w-md">
                <Meter label="Used today" used={credits.daily_credits_used} total={credits.daily_limit} detail={`${credits.daily_credits_used} of ${credits.daily_limit} · resets ${formatDate(credits.reset_at)}`} />
            </dl>
        </Panel>
    );
}

/**
 * Mirrors the app's Plans banner. Someone who has already bought at the launch
 * price is told why their prices are the regular ones rather than left to
 * wonder; spots left are named only when the server says few remain.
 */
function LaunchOfferBanner({ notice }: { notice: LaunchOfferNotice }) {
    return (
        <section className="flex items-start gap-3 rounded-2xl border border-accent/40 bg-selected p-4 sm:p-5">
            <Rocket className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div className="min-w-0">
                <h2 className="font-bold">Launch offer · {notice.percentOff}% off every pass</h2>
                <p className="mt-0.5 text-sm text-muted">
                    {notice.used
                        ? "You’ve already used the launch price. Thanks for being early."
                        : notice.spotsLeft != null
                          ? `For a limited time · only ${notice.spotsLeft} launch spot${notice.spotsLeft === 1 ? "" : "s"} left`
                          : "For a limited time, once per account"}
                </p>
            </div>
        </section>
    );
}

function PlanCard({
    plan,
    offer,
    current,
    best,
    busy,
    pendingCode,
    disabled,
    onBuy,
}: {
    plan: BillingPlan;
    /** The launch offer this viewer would be charged, or null for the regular price. */
    offer: PlanOffer | null;
    current: boolean;
    best: boolean;
    busy: boolean;
    pendingCode?: string;
    disabled: boolean;
    onBuy: () => void;
}) {
    // While the launch offer is this viewer's, it replaces the list-price saving:
    // checkout charges the offer price, so that is the price to show.
    const saving = offer ? null : discountPercent(plan);
    const price = offer ? offer.price_minor : plan.price_minor;
    const isThisPlanBusy = busy && pendingCode === plan.code;

    return (
        <section className={cn("flex flex-col rounded-2xl border bg-card p-5", current ? "border-accent" : "border-border")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[17px] font-bold">{plan.name}</h3>
                <span className="flex gap-1.5">
                    {current && <span className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-bold text-on-accent">Current</span>}
                    {offer && <span className="rounded-full bg-selected px-2.5 py-0.5 text-[11px] font-bold">{offer.percent_off}% off</span>}
                    {!offer && best && saving != null && <span className="rounded-full bg-positive/15 px-2.5 py-0.5 text-[11px] font-bold text-positive">Best value · save {saving}%</span>}
                    {!offer && !best && saving != null && <span className="rounded-full bg-positive/15 px-2.5 py-0.5 text-[11px] font-bold text-positive">Save {saving}%</span>}
                </span>
            </div>
            <p className="mt-3 flex items-baseline gap-1.5">
                <span className="font-display text-[32px] font-bold leading-none tabular-nums">{price != null ? formatMinor(price, plan.currency) : "—"}</span>
                <span className="text-sm text-muted">/ {intervalLabel(plan.billing_interval)}</span>
            </p>
            {offer && <p className="mt-1 text-[13px] text-muted"><s>{formatMinor(offer.original_price_minor, plan.currency)}</s> · launch price for your first pass</p>}
            {saving != null && plan.list_price_minor != null && <p className="mt-1 text-[13px] text-muted"><s>{formatMinor(plan.list_price_minor, plan.currency)}</s> at full price</p>}
            <ul className="mb-5 mt-4 space-y-1.5 text-sm">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />{plan.included_credits.toLocaleString("en-IN")} AI credits</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />Up to {plan.daily_credit_limit} credits a day</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />Budgets, insights and reminders</li>
            </ul>
            <button type="button" onClick={onBuy} disabled={disabled || !plan.checkout_enabled} className={cn("mt-auto w-full", current ? buttonSecondary : buttonPrimary, "h-11")}>
                {isThisPlanBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {isThisPlanBusy ? "Working…" : !plan.checkout_enabled ? "Coming soon" : current ? "Buy again" : `Buy ${plan.name}`}
            </button>
        </section>
    );
}
