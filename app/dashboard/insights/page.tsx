"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
    AlertTriangle,
    ArrowUpRight,
    CalendarRange,
    CircleHelp,
    Clock3,
    RefreshCw,
    Repeat2,
    X,
} from "lucide-react";
import DashboardInsightCard from "@/app/components/dashboard/DashboardInsightCard";
import {
    Account,
    AccountsAPI,
    apiErrorMessage,
    DashboardAPI,
    DashboardResponse,
    RecurringCandidate,
    RecurringCandidatesAPI,
    Subscription,
    SubscriptionsAPI,
} from "@/app/lib/api";
import { formatDate, formatMoney, toLocalISO } from "@/app/lib/format";
import { cn } from "@/app/lib/utils";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { PROJECTION_DISCLAIMER } from "@/app/lib/calculators";
import SubscriptionForm, { subscriptionInputForCandidate } from "@/app/components/dashboard/SubscriptionForm";
import { useToast } from "@/app/components/ui/Toast";

function currentMonthStart() {
    const date = new Date();
    date.setDate(1);
    return toLocalISO(date);
}

export default function InsightsScreen() {
    const { toast } = useToast();
    const [startDate, setStartDate] = useState(currentMonthStart);
    const [endDate, setEndDate] = useState(() => toLocalISO());
    const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [activeCandidate, setActiveCandidate] = useState<RecurringCandidate | null>(null);
    const [trackedCandidateKeys, setTrackedCandidateKeys] = useState<Set<string>>(() => new Set());
    const [candidateWorkingKey, setCandidateWorkingKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadInsights = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [dashboardResult, accountsResult, subscriptionsResult] = await Promise.allSettled([
                DashboardAPI.get({
                start_date: startDate,
                end_date: endDate,
                tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
                }),
                AccountsAPI.list(),
                SubscriptionsAPI.list(),
            ]);
            if (dashboardResult.status === "rejected") throw dashboardResult.reason;
            setDashboard(dashboardResult.value.data);
            setAccounts(accountsResult.status === "fulfilled" ? accountsResult.value.data : []);
            setSubscriptions(subscriptionsResult.status === "fulfilled" ? subscriptionsResult.value.data : []);
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t calculate insights for this range."));
        } finally {
            setLoading(false);
        }
    }, [endDate, startDate]);

    useEffect(() => { void loadInsights(); }, [loadInsights]);

    const isTracked = (candidate: RecurringCandidate) => trackedCandidateKeys.has(candidate.candidate_key)
        || subscriptions.some((subscription) => {
            const sameMerchant = candidate.merchant.trim() && subscription.merchant.trim().toLowerCase() === candidate.merchant.trim().toLowerCase();
            const sameLabel = subscription.name.trim().toLowerCase() === candidate.label.trim().toLowerCase();
            return Boolean(sameMerchant || sameLabel);
        });

    const dismissCandidate = async (candidate: RecurringCandidate) => {
        setCandidateWorkingKey(candidate.candidate_key);
        setError("");
        try {
            await RecurringCandidatesAPI.saveDecision({
                candidate_key: candidate.candidate_key,
                merchant: candidate.merchant,
                category: candidate.category,
                decision: "dismissed",
            });
            setDashboard((current) => current ? { ...current, recurring_candidates: current.recurring_candidates.filter((item) => item.candidate_key !== candidate.candidate_key) } : current);
            toast({ title: `${candidate.label} dismissed`, description: "This pattern will stay out of the recurring review queue." });
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t dismiss this recurring pattern."));
        } finally {
            setCandidateWorkingKey(null);
        }
    };

    const candidateSaved = async (candidate: RecurringCandidate, subscription: Subscription) => {
        await RecurringCandidatesAPI.saveDecision({
            candidate_key: candidate.candidate_key,
            merchant: candidate.merchant,
            category: candidate.category,
            decision: "tracked",
        });
        setSubscriptions((current) => [...current, subscription]);
        setTrackedCandidateKeys((current) => new Set(current).add(candidate.candidate_key));
        setActiveCandidate(null);
        toast({ title: `${candidate.label} is now tracked`, description: `Next due ${formatDate(subscription.next_due_date)}.` });
    };

    return (
        <>
            <div className="space-y-7 pb-12">
                <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Explainable analysis</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight font-rounded sm:text-4xl">Insights, with the numbers behind them.</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Explains noteworthy changes and records needing attention—without repeating the dashboard or report breakdowns.</p>
                    </div>
                    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-white p-2 dark:bg-zinc-900 sm:flex-row sm:items-center">
                        <label className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-zinc-500"><CalendarRange className="h-4 w-4 text-accent" /><span className="sr-only">Start date</span><input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} className="bg-transparent outline-none" /></label>
                        <span className="hidden text-zinc-300 sm:block">→</span>
                        <label className="rounded-xl px-3 py-2 text-xs font-bold text-zinc-500"><span className="sr-only">End date</span><input type="date" value={endDate} min={startDate} max={toLocalISO()} onChange={(event) => setEndDate(event.target.value)} className="bg-transparent outline-none" /></label>
                        <button onClick={() => void loadInsights()} className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" aria-label="Refresh insights"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /></button>
                    </div>
                </header>

                {error && dashboard && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">{error} <button onClick={() => void loadInsights()} className="ml-2 font-bold underline">Try again</button></div>}

                {loading && !dashboard ? (
                    <PageSkeleton />
                ) : error && !dashboard ? (
                    <div className="rounded-panel border border-red-200 bg-red-50 p-8 dark:border-red-900/40 dark:bg-red-950/20"><AlertTriangle className="h-6 w-6 text-red-500" /><h2 className="mt-3 text-lg font-bold">Insights unavailable</h2><p className="mt-2 text-sm text-red-700/70 dark:text-red-300/70">{error}</p><button onClick={() => void loadInsights()} className="mt-5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white">Try again</button></div>
                ) : dashboard && (
                    <>
                        <section className="grid gap-4 md:grid-cols-2">
                            <article className="rounded-panel border border-border bg-white p-7 dark:bg-zinc-900"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Correction queue</p><h2 className="mt-2 text-3xl font-bold font-rounded">{dashboard.review_items.length}</h2></div><Clock3 className="h-6 w-6 text-accent" /></div><p className="mt-3 text-sm leading-6 text-zinc-500">Transactions missing a usable category or linked account in this period.</p>{dashboard.review_items.length > 0 ? <Link href="/dashboard#review-queue" className="mt-5 inline-flex min-h-10 items-center rounded-xl bg-amber-50 px-4 text-xs font-bold text-amber-700 dark:bg-amber-950/30 dark:text-amber-300">Review and correct</Link> : <div className="mt-5 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">Nothing needs correction.</div>}</article>
                            <Link href="#recurring-candidates" className="rounded-panel border border-border bg-white p-7 transition hover:border-accent hover:shadow-sm focus:outline-none focus:ring-4 focus:ring-accent/10 dark:bg-zinc-900"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Recurring review</p><h2 className="mt-2 text-3xl font-bold font-rounded">{dashboard.recurring_candidates.length}</h2></div><Repeat2 className="h-6 w-6 text-accent" /></div><p className="mt-3 text-sm leading-6 text-zinc-500">Detected payment patterns waiting for your track or dismiss decision.</p><span className="mt-5 inline-flex min-h-10 items-center text-xs font-bold text-accent">Open recurring queue <ArrowUpRight className="ml-2 h-3.5 w-3.5" /></span></Link>
                        </section>

                        <section>
                            <div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">What changed</p><h2 className="mt-1 text-xl font-bold font-rounded">Insight cards</h2></div><span className="text-xs text-zinc-400">Compared with the preceding equal-length period</span></div>
                            {dashboard.insights.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{dashboard.insights.map((insight) => <DashboardInsightCard key={`${insight.kind}-${insight.title}`} insight={insight} period={{ start_date: startDate, end_date: endDate }} />)}</div> : <div className="rounded-panel border border-dashed border-border p-8 text-center text-sm text-zinc-400">Add more transactions to unlock comparisons and patterns.</div>}
                        </section>

                        <section id="recurring-candidates" className="scroll-mt-28 rounded-panel border border-border bg-white p-6 dark:bg-zinc-900 sm:p-8">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-accent"><Repeat2 className="h-4 w-4" /><p className="text-xs font-bold uppercase tracking-[0.18em]">Recurring review</p></div><h2 className="mt-2 text-xl font-bold font-rounded">Patterns worth confirming</h2></div><span className="inline-flex items-center gap-1 text-xs text-zinc-400"><CircleHelp className="h-3.5 w-3.5" /> A candidate is not saved as a subscription automatically.</span></div>
                            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{dashboard.recurring_candidates.length ? dashboard.recurring_candidates.map((candidate) => {
                                const tracked = isTracked(candidate);
                                return <article key={candidate.candidate_key} className="rounded-2xl border border-border p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-bold">{candidate.label}</p><p className="mt-1 text-xs text-zinc-400">{candidate.interval_guess} · {candidate.occurrences} occurrences · {candidate.category}</p></div>{tracked ? <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:bg-emerald-950/30">Tracked</span> : candidate.review_due && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:bg-amber-950/30">Review</span>}</div><p className="mt-5 text-2xl font-bold font-rounded">{formatMoney(candidate.average_amount)}</p><div className="mt-4 flex items-center justify-between text-xs"><span className="text-zinc-400">Expected {formatDate(candidate.next_expected_date)}</span><span className="font-bold text-zinc-500">{Math.round(candidate.confidence * 100)}% match</span></div><div className="mt-5 flex gap-2 border-t border-border pt-4">{tracked ? <p className="flex min-h-10 items-center text-xs font-semibold text-emerald-600">Already in Subscriptions</p> : <><button disabled={candidateWorkingKey === candidate.candidate_key} onClick={() => setActiveCandidate(candidate)} className="inline-flex min-h-10 flex-1 items-center justify-center rounded-xl bg-accent px-4 text-xs font-bold text-zinc-950">Track this</button><button disabled={candidateWorkingKey === candidate.candidate_key} onClick={() => void dismissCandidate(candidate)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-zinc-100 px-3 text-xs font-bold text-zinc-500 disabled:opacity-50 dark:bg-zinc-800"><X className="h-3.5 w-3.5" /> Dismiss</button></>}</div></article>;
                            }) : <p className="col-span-full rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-400 dark:bg-zinc-800">No stable recurring pattern yet.</p>}</div>
                        </section>

                        <aside className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-200"><ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0" /><p><strong>How this works:</strong> totals are calculated from confirmed entries inside the selected dates. Comparisons use the immediately preceding range of equal length; anomaly and recurring rules are deterministic backend templates. {PROJECTION_DISCLAIMER}</p></aside>
                    </>
                )}
            </div>
            {activeCandidate && <SubscriptionForm accounts={accounts} initial={subscriptionInputForCandidate(activeCandidate)} onClose={() => setActiveCandidate(null)} onSaved={(subscription) => candidateSaved(activeCandidate, subscription)} />}
        </>
    );
}
