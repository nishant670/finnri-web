"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, CreditCard, Loader2, ShieldAlert, Sparkles } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
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
import { discountPercent, formatMinor, intervalLabel } from "@/app/lib/billing-format";

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

    return (
        <div className="mx-auto max-w-4xl space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-bold font-rounded tracking-tight dark:text-white">Plan &amp; billing</h1>
                <p className="mt-1 text-sm font-medium text-zinc-500">
                    Pay by UPI, card, or net banking. Every plan is a one-off purchase — nothing renews on its own.
                </p>
            </div>

            {loading && (
                <div className="flex items-center gap-3 rounded-panel border border-border bg-white p-6 text-sm font-medium text-zinc-500 dark:bg-zinc-900">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading your plan…
                </div>
            )}

            {!loading && loadError && (
                <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    {loadError}
                </p>
            )}

            {!loading && !loadError && status && <CurrentPlanCard status={status} />}

            {user?.is_guest && (
                <section className="rounded-panel border border-amber-200 bg-amber-50 p-6 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
                    <div className="flex items-start gap-4">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                            <ShieldAlert className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="font-bold">Save your workspace before you buy</h2>
                            <p className="mt-1 text-sm leading-6 opacity-75">
                                A plan is tied to an account. Save this guest workspace first so the plan you buy stays with your data.
                            </p>
                        </div>
                    </div>
                </section>
            )}

            {purchase.phase === "error" && (
                <p role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    {purchase.message}
                </p>
            )}

            {purchase.phase === "confirmed" && (
                <p role="status" className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> Payment confirmed — your plan is active.
                </p>
            )}

            {purchase.phase === "pending" && (
                <p role="status" className="rounded-2xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-700 dark:bg-blue-950/30 dark:text-blue-200">
                    Your payment is still being confirmed by the bank. This page updates on its own once it lands — you do not need to pay again.
                </p>
            )}

            {!loading && !loadError && !checkoutAvailable && purchasable.length > 0 && (
                <p className="rounded-2xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    Checkout is not open yet. These are the plans it will offer.
                </p>
            )}

            {!loading && !loadError && (
                <div className="grid gap-4 sm:grid-cols-2">
                    {purchasable.map((plan) => (
                        <PlanCard
                            key={plan.code}
                            plan={plan}
                            busy={busy}
                            pendingCode={"planCode" in purchase ? purchase.planCode : undefined}
                            disabled={busy || Boolean(user?.is_guest)}
                            onBuy={() => handleBuy(plan)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function CurrentPlanCard({ status }: { status: BillingStatus }) {
    const isPaid = Boolean(status.plan) && status.subscription_status === "active";
    return (
        <section className="rounded-panel border border-border bg-white p-6 shadow-sm dark:bg-zinc-900 sm:p-8">
            <div className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                    <h2 className="text-lg font-bold font-rounded">{status.plan?.name ?? "Finnri Free"}</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                        {isPaid && status.current_period_end
                            ? `Active until ${formatDate(new Date(status.current_period_end))}. It will not renew on its own.`
                            : "You’re on the free plan."}
                    </p>
                </div>
            </div>
            <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
                <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
                    <dt className="text-xs font-bold uppercase tracking-wider text-zinc-400">Credits left</dt>
                    <dd className="mt-1 font-bold">{status.credits.total_credits_remaining.toLocaleString("en-IN")}</dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
                    <dt className="text-xs font-bold uppercase tracking-wider text-zinc-400">Today’s limit</dt>
                    <dd className="mt-1 font-bold">{status.credits.daily_credits_remaining} of {status.credits.daily_limit}</dd>
                </div>
                <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
                    <dt className="text-xs font-bold uppercase tracking-wider text-zinc-400">Status</dt>
                    <dd className="mt-1 font-bold capitalize">{status.subscription_status.replace(/_/g, " ")}</dd>
                </div>
            </dl>
        </section>
    );
}

function PlanCard({
    plan,
    busy,
    pendingCode,
    disabled,
    onBuy,
}: {
    plan: BillingPlan;
    busy: boolean;
    pendingCode?: string;
    disabled: boolean;
    onBuy: () => void;
}) {
    const saving = discountPercent(plan);
    const isThisPlanBusy = busy && pendingCode === plan.code;

    return (
        <section className="flex flex-col rounded-panel border border-border bg-white p-6 shadow-sm dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-bold font-rounded">{plan.name}</h3>
                {saving != null && (
                    <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
                        Save {saving}%
                    </span>
                )}
            </div>

            <p className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-bold font-rounded">
                    {plan.price_minor != null ? formatMinor(plan.price_minor, plan.currency) : "—"}
                </span>
                <span className="text-sm font-medium text-zinc-500">/ {intervalLabel(plan.billing_interval)}</span>
            </p>
            {saving != null && plan.list_price_minor != null && (
                <p className="mt-1 text-xs font-medium text-zinc-400">
                    <s>{formatMinor(plan.list_price_minor, plan.currency)}</s> at full price
                </p>
            )}

            <ul className="mt-5 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                    {plan.included_credits.toLocaleString("en-IN")} AI credits
                </li>
                <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                    Up to {plan.daily_credit_limit} credits a day
                </li>
                <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
                    Budgets, insights, splits and exports
                </li>
            </ul>

            <button
                type="button"
                onClick={onBuy}
                disabled={disabled || !plan.checkout_enabled}
                className="mt-6 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-white shadow-lg shadow-accent/20 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
                {isThisPlanBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                {isThisPlanBusy ? "Working…" : plan.checkout_enabled ? `Buy ${plan.name}` : "Coming soon"}
            </button>
        </section>
    );
}
