"use client";

import Link from "next/link";
import { Clock3, Sparkles } from "lucide-react";
import { EntitlementError } from "@/app/lib/api";
import { formatTime } from "@/app/lib/format";
import { planDisplayName } from "@/app/lib/plans";
import { useAuth } from "@/app/context/AuthContext";

interface PaywallProps {
    error: EntitlementError;
    featureLabel?: string;
    compact?: boolean;
}

export default function Paywall({ error, featureLabel, compact = false }: PaywallProps) {
    const { user, beginGuestClaim } = useAuth();
    const feature = error.featureLabel || featureLabel || "This feature";
    const resetTime = error.resetAt ? formatTime(error.resetAt) : null;
    const allowancePaused = error.status === 429;

    return (
        <section
            aria-label={allowancePaused ? `${feature} allowance` : `${feature} plan requirement`}
            className={`flex items-start gap-3 rounded-2xl border p-4 sm:p-5 ${allowancePaused ? "border-border bg-track" : "border-accent/40 bg-selected"}`}
        >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] bg-card text-accent">
                {allowancePaused ? <Clock3 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </span>
            <div className="min-w-0">
                <h3 className="font-bold">{allowancePaused ? `${feature} will be back soon` : `Unlock ${feature}`}</h3>
                <p className="mt-0.5 text-sm leading-6 text-muted">
                    {allowancePaused
                        ? resetTime ? `AI is back at ${resetTime}. You can keep entering transactions by hand until then.` : "Your daily allowance resets soon. You can keep entering transactions by hand until then."
                        : error.requiredPlan ? `Part of ${planDisplayName(error.requiredPlan)}.` : "Available with a Finnri pass."}
                </p>
                {!allowancePaused && error.requiredCredits != null && (
                    <p className="mt-1 text-[13px] font-semibold text-muted">
                        Needs {error.requiredCredits} credit{error.requiredCredits === 1 ? "" : "s"}
                        {error.availableCredits != null ? ` · ${error.availableCredits} available` : ""}
                    </p>
                )}
                {!allowancePaused && user?.is_guest && (
                    <button type="button" onClick={beginGuestClaim} className="mt-3 inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-bold text-on-accent">Save your workspace to continue</button>
                )}
                {!allowancePaused && !user?.is_guest && !compact && (
                    <Link href="/dashboard/billing" className="mt-3 inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-bold text-on-accent">See passes</Link>
                )}
            </div>
        </section>
    );
}
