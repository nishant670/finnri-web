import { api } from "@/app/lib/api";
import type { BillingInterval } from "@/app/lib/billing-format";

export { discountPercent, formatMinor, intervalLabel } from "@/app/lib/billing-format";
export type { BillingInterval } from "@/app/lib/billing-format";

export interface BillingPlan {
    code: string;
    name: string;
    billing_interval: BillingInterval;
    /** Paise. Null on a plan whose price has not been set. */
    price_minor: number | null;
    list_price_minor: number | null;
    currency: string;
    included_credits: number;
    daily_credit_limit: number;
    requires_login: boolean;
    requires_prior_paid_months: number;
    /**
     * False whenever the backend has no payment provider configured, and
     * always false for lifetime, which is sold by quote rather than off a
     * price tag. The buy button is drawn from this and nothing else.
     */
    checkout_enabled: boolean;
    feature_gates: string[];
}

export interface CreditSummary {
    total_credits_remaining: number;
    daily_limit: number;
    daily_credits_used: number;
    daily_credits_remaining: number;
    reset_at: string;
    trial_expires_at?: string;
}

export interface BillingStatus {
    plan?: BillingPlan;
    subscription_status: string;
    current_period_start?: string;
    current_period_end?: string;
    credits: CreditSummary;
    lifetime_eligibility: {
        eligible: boolean;
        paid_months_completed: number;
        required_paid_months: number;
    };
}

export interface CheckoutOrder {
    provider: string;
    order_id: string;
    key_id: string;
    amount_minor: number;
    currency: string;
    plan_code: string;
    plan_name: string;
    payment_id: number;
    success_url?: string;
}

export async function fetchBillingPlans(): Promise<BillingPlan[]> {
    const { data } = await api.get<{ plans: BillingPlan[] }>("/v1/billing/plans");
    return data.plans ?? [];
}

export async function fetchBillingStatus(): Promise<BillingStatus> {
    const { data } = await api.get<BillingStatus>("/v1/billing/status");
    return data;
}

export async function createCheckoutOrder(planCode: string): Promise<CheckoutOrder> {
    const { data } = await api.post<CheckoutOrder>("/v1/billing/checkout", { plan_code: planCode });
    return data;
}

const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

interface RazorpayOptions {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    prefill?: { name?: string; email?: string; contact?: string };
    theme?: { color?: string };
    handler?: (response: RazorpayHandlerResponse) => void;
    modal?: { ondismiss?: () => void };
}

export interface RazorpayHandlerResponse {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
}

interface RazorpayConstructor {
    new (options: RazorpayOptions): { open: () => void };
}

declare global {
    interface Window {
        Razorpay?: RazorpayConstructor;
    }
}

/**
 * Loads Razorpay's checkout script on demand.
 *
 * It is not in the document head because the marketing pages, the legal pages
 * and every dashboard screen that never sells anything would all pay for it.
 * Repeat calls reuse the tag that is already there.
 */
export function loadRazorpayCheckout(): Promise<RazorpayConstructor> {
    if (typeof window === "undefined") {
        return Promise.reject(new Error("Razorpay checkout is browser-only"));
    }
    if (window.Razorpay) return Promise.resolve(window.Razorpay);

    return new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);
        const script = existing ?? document.createElement("script");

        const settle = () => {
            if (window.Razorpay) resolve(window.Razorpay);
            else reject(new Error("Razorpay checkout loaded but did not initialise"));
        };
        script.addEventListener("load", settle, { once: true });
        script.addEventListener("error", () => reject(new Error("Could not reach Razorpay checkout")), { once: true });

        if (!existing) {
            script.src = RAZORPAY_SCRIPT_SRC;
            script.async = true;
            document.body.appendChild(script);
        } else if (existing.dataset.loaded === "true") {
            settle();
        }
        script.dataset.loaded = "true";
    });
}

export type OpenCheckoutOutcome = "dismissed" | "submitted";

/**
 * Opens Razorpay checkout for an order.
 *
 * The resolved value says only what the person did with the dialog. It is
 * deliberately not an entitlement: the browser cannot be trusted to report its
 * own purchase, so the caller confirms by polling /v1/billing/status, which
 * changes when the signed webhook has been processed.
 */
export async function openCheckout(
    order: CheckoutOrder,
    prefill: { name?: string; email?: string; contact?: string } = {},
): Promise<OpenCheckoutOutcome> {
    const Razorpay = await loadRazorpayCheckout();
    return new Promise((resolve) => {
        let settled = false;
        const settle = (outcome: OpenCheckoutOutcome) => {
            if (settled) return;
            settled = true;
            resolve(outcome);
        };

        new Razorpay({
            key: order.key_id,
            amount: order.amount_minor,
            currency: order.currency,
            name: "Finnri",
            description: order.plan_name,
            order_id: order.order_id,
            prefill,
            theme: { color: "#2D2D2D" },
            handler: () => settle("submitted"),
            modal: { ondismiss: () => settle("dismissed") },
        }).open();
    });
}
