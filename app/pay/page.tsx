"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { api, apiErrorMessage } from "@/app/lib/api";
import { formatMinor } from "@/app/lib/billing-format";
import { loadRazorpayCheckout } from "@/app/lib/billing";

/**
 * The hosted pay page.
 *
 * It opens in a browser tab launched from the mobile app, so it has no Finnri
 * session and cannot be given one without putting a credential in a URL. It
 * works from an order id alone: the backend serves the order's public detail —
 * publishable key, amount, plan name — and nothing about the buyer.
 *
 * Deliberately free of the dashboard's chrome. Somebody arriving here has one
 * job, on a phone, in a tab that will close again.
 */

interface PublicOrder {
    provider: string;
    order_id: string;
    key_id: string;
    amount_minor: number;
    currency: string;
    plan_code: string;
    plan_name: string;
    status: "created" | "captured" | "failed" | "refunded";
}

type Phase =
    | { name: "loading" }
    | { name: "ready"; order: PublicOrder }
    | { name: "opening"; order: PublicOrder }
    | { name: "submitted"; order: PublicOrder }
    | { name: "settled"; order: PublicOrder }
    | { name: "error"; message: string };

function PayScreen() {
    const params = useSearchParams();
    const orderId = params.get("order")?.trim() ?? "";
    // A missing order id is knowable at render, so it is the initial state
    // rather than something an effect corrects afterwards.
    const [phase, setPhase] = useState<Phase>(() =>
        orderId
            ? { name: "loading" }
            : { name: "error", message: "This payment link is incomplete. Open it again from the Finnri app." }
    );
    // Survives the error phase, which carries a message but no order.
    const [order, setOrder] = useState<PublicOrder | null>(null);

    const openCheckout = useCallback(async (order: PublicOrder) => {
        // "Opening" covers loading the script and nothing more. Once the modal
        // is up it covers the page anyway, and leaving the button disabled
        // beyond that point is how a failed open strands somebody: Razorpay
        // reports a rejected key or a declined card through neither the
        // handler nor ondismiss, so nothing would ever re-enable it.
        setPhase({ name: "opening", order });
        try {
            const Razorpay = await loadRazorpayCheckout();
            let submitted = false;
            const checkout = new Razorpay({
                key: order.key_id,
                amount: order.amount_minor,
                currency: order.currency,
                name: "Finnri",
                description: order.plan_name,
                order_id: order.order_id,
                theme: { color: "#2D2D2D" },
                handler: () => {
                    submitted = true;
                    setPhase({ name: "submitted", order });
                },
                modal: {
                    ondismiss: () => {
                        if (!submitted) setPhase({ name: "ready", order });
                    },
                },
            });
            checkout.on("payment.failed", () => {
                setPhase({
                    name: "error",
                    message: "That payment did not go through. Nothing has been charged — you can try again.",
                });
            });
            checkout.open();
            if (!submitted) setPhase({ name: "ready", order });
        } catch (error) {
            setPhase({ name: "error", message: apiErrorMessage(error, "Could not open the payment page.") });
        }
    }, []);

    useEffect(() => {
        if (!orderId) return;
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get<PublicOrder>(`/v1/billing/checkout/${encodeURIComponent(orderId)}`);
                if (cancelled) return;
                setOrder(data);
                if (data.status === "captured") {
                    setPhase({ name: "settled", order: data });
                    return;
                }
                setOrder(data);
                setPhase({ name: "ready", order: data });
            } catch (error) {
                if (cancelled) return;
                setPhase({
                    name: "error",
                    message: apiErrorMessage(error, "We couldn’t find that payment. Start again from the Finnri app."),
                });
            }
        })();
        return () => { cancelled = true; };
    }, [orderId]);

    return (
        <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
            <div className="rounded-3xl border border-border bg-white p-7 shadow-sm dark:bg-zinc-900">
                {phase.name === "loading" && (
                    <p className="flex items-center gap-3 text-sm font-medium text-zinc-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading your order…
                    </p>
                )}

                {phase.name === "error" && (
                    <div className="flex flex-col gap-3">
                        <XCircle className="h-8 w-8 text-red-500" />
                        <h1 className="text-xl font-bold font-rounded">Something went wrong</h1>
                        <p role="alert" className="text-sm leading-6 text-zinc-500">{phase.message}</p>
                        {order && (
                            <button
                                type="button"
                                onClick={() => void openCheckout(order)}
                                className="mt-2 flex min-h-13 items-center justify-center rounded-2xl bg-accent px-6 py-4 text-base font-bold text-zinc-950"
                            >
                                Try again
                            </button>
                        )}
                    </div>
                )}

                {phase.name === "settled" && (
                    <div className="flex flex-col gap-3">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <h1 className="text-xl font-bold font-rounded">Already paid</h1>
                        <p className="text-sm leading-6 text-zinc-500">
                            {phase.order.plan_name} is active on your account. You can close this tab and return to Finnri.
                        </p>
                    </div>
                )}

                {phase.name === "submitted" && (
                    <div className="flex flex-col gap-3">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                        <h1 className="text-xl font-bold font-rounded">Payment received</h1>
                        {/* The bank confirms, not the browser. Saying "done" here and
                            having the plan not appear is how people pay twice. */}
                        <p className="text-sm leading-6 text-zinc-500">
                            Your bank is confirming it now. Close this tab and go back to Finnri — your plan appears there
                            on its own, usually within a few seconds. You do not need to pay again.
                        </p>
                    </div>
                )}

                {(phase.name === "ready" || phase.name === "opening") && (
                    <div className="flex flex-col gap-5">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">Finnri</p>
                            <h1 className="mt-1 text-xl font-bold font-rounded">{phase.order.plan_name}</h1>
                        </div>
                        <p className="text-4xl font-bold font-rounded tabular-nums">
                            {formatMinor(phase.order.amount_minor, phase.order.currency)}
                        </p>
                        <button
                            type="button"
                            onClick={() => void openCheckout(phase.order)}
                            disabled={phase.name === "opening"}
                            className="flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-accent px-6 py-4 text-base font-bold text-zinc-950 shadow-lg shadow-accent/20 disabled:opacity-60"
                        >
                            {phase.name === "opening" ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                            {phase.name === "opening" ? "Opening…" : "Pay with UPI, card or net banking"}
                        </button>
                        <p className="flex items-start gap-2 text-xs leading-5 text-zinc-500">
                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                            Payment is handled by Razorpay. Finnri never sees your card or UPI details.
                        </p>
                    </div>
                )}
            </div>
        </main>
    );
}

export default function PayPage() {
    // useSearchParams needs a Suspense boundary to prerender.
    return (
        <Suspense fallback={null}>
            <PayScreen />
        </Suspense>
    );
}
