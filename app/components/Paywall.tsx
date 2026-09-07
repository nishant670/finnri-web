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
            className={`rounded-2xl border p-5 ${allowancePaused
                ? "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-100"
                : "border-accent/25 bg-accent/5 text-zinc-900 dark:text-white"}`}
        >
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${allowancePaused ? "bg-blue-100 text-blue-600 dark:bg-blue-900/40" : "bg-accent/10 text-accent"}`}>
                {allowancePaused ? <Clock3 className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
            </span>
            <h3 className="mt-4 font-bold">
                {allowancePaused ? `${feature} will be back soon` : `Unlock ${feature}`}
            </h3>
            <p className="mt-1 text-sm leading-6 opacity-75">
                {allowancePaused
                    ? resetTime ? `AI is back at ${resetTime}. You can keep entering transactions manually until then.` : "Your daily allowance will reset soon. You can keep working manually until then."
                    : error.requiredPlan ? `${feature} is included with ${planDisplayName(error.requiredPlan)}.` : `${feature} needs an upgraded Finnri account.`}
            </p>
            {!allowancePaused && error.requiredCredits != null && (
                <p className="mt-2 text-xs font-semibold opacity-70">
                    Needs {error.requiredCredits} credit{error.requiredCredits === 1 ? "" : "s"}
                    {error.availableCredits != null ? ` · ${error.availableCredits} available` : ""}
                </p>
            )}
            {!allowancePaused && user?.is_guest && (
                <button type="button" onClick={beginGuestClaim} className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-accent px-4 text-xs font-bold text-zinc-950">
                    Save workspace to continue
                </button>
            )}
            {!allowancePaused && !user?.is_guest && !compact && (
                <Link href="/dashboard/settings" className="mt-4 inline-flex min-h-10 items-center rounded-xl bg-accent px-4 text-xs font-bold text-zinc-950">
                    Review account options
                </Link>
            )}
        </section>
    );
}
