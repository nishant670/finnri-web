"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    ArrowUpRight,
    CalendarDays,
    CircleAlert,
    Download,
    IndianRupee,
    Plus,
    RefreshCw,
    Sparkles,
    TrendingDown,
    TrendingUp,
    WalletCards,
} from "lucide-react";
import AddTransactionModal from "@/app/components/dashboard/AddTransactionModal";
import BudgetProgressCard from "@/app/components/dashboard/BudgetProgressCard";
import DashboardInsightCard from "@/app/components/dashboard/DashboardInsightCard";
import TransactionDetailsDrawer from "@/app/components/dashboard/TransactionDetailsDrawer";
import { apiErrorMessage, DashboardAPI, DashboardResponse, SplitBill, Transaction } from "@/app/lib/api";
import { formatDate, formatDateRange, formatMoney, toLocalISO } from "@/app/lib/format";
import { downloadTransactionsCSV } from "@/app/lib/export-transactions";
import { transactionHref } from "@/app/lib/transaction-links";
import { cn } from "@/app/lib/utils";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { useToast } from "@/app/components/ui/Toast";

const DailySpendingChart = dynamic(() => import("@/app/components/charts/DailySpendingChart"), {
    ssr: false,
    loading: () => <div className="h-full animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" aria-hidden="true" />,
});

function rangeFor(preset: "month" | "30d" | "90d") {
    const end = new Date();
    const start = new Date(end);
    if (preset === "month") start.setDate(1);
    if (preset === "30d") start.setDate(end.getDate() - 29);
    if (preset === "90d") start.setDate(end.getDate() - 89);
    return { start_date: toLocalISO(start), end_date: toLocalISO(end), tz: Intl.DateTimeFormat().resolvedOptions().timeZone };
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="rounded-panel border border-dashed border-accent/30 bg-gradient-to-br from-white to-accent/5 p-10 text-center dark:from-zinc-900 dark:to-accent/5">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/10 text-accent"><Sparkles className="h-6 w-6" /></span>
            <h2 className="mt-5 text-xl font-bold font-rounded">Your first insight starts with one transaction</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">Add an expense or income. Finnri will turn it into category, account, merchant, and period-level insight automatically.</p>
            <button onClick={onAdd} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-zinc-950 shadow-lg shadow-accent/20"><Plus className="h-4 w-4" /> Add a transaction</button>
        </div>
    );
}

type TransactionEditDraft = {
    transaction: Transaction;
    splitBill: SplitBill | null;
    splitDataAvailable: boolean;
};

export default function DashboardHome() {
    const { toast } = useToast();
    const router = useRouter();
    const [preset, setPreset] = useState<"month" | "30d" | "90d">("month");
    const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [exportError, setExportError] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [editing, setEditing] = useState<TransactionEditDraft | null>(null);

    const loadDashboard = useCallback(async (background = false) => {
        if (background) setRefreshing(true);
        else setLoading(true);
        setError("");
        try {
            const response = await DashboardAPI.get(rangeFor(preset));
            setDashboard(response.data);
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t load your dashboard. Check that the FINNRI API is running, then try again."));
        } finally {
            if (background) setRefreshing(false);
            else setLoading(false);
        }
    }, [preset]);

    useEffect(() => { void loadDashboard(); }, [loadDashboard]);

    const net = (dashboard?.summary.total_income || 0) - (dashboard?.summary.total_spent || 0);
    const topInsight = dashboard?.insights.find((item) => item.severity === "warning") || dashboard?.insights[0];
    const hasData = Boolean(dashboard?.summary.transaction_count);
    const dailyChartData = useMemo(() => dashboard?.daily_spending.map((item) => ({ ...item, label: formatDate(item.date) })) || [], [dashboard]);
    const dailyTransactionCount = dailyChartData.reduce((total, item) => total + item.count, 0);
    const spendingDayCount = dailyChartData.filter((item) => item.count > 0).length;
    const transactionPeriod = dashboard ? { start_date: dashboard.period.start, end_date: dashboard.period.end } : { start_date: toLocalISO(), end_date: toLocalISO() };
    const exportPeriod = async () => {
        setExportError("");
        setIsExporting(true);
        try {
            await downloadTransactionsCSV(transactionPeriod);
            toast({ title: `${dashboard?.summary.transaction_count || 0} transaction${dashboard?.summary.transaction_count === 1 ? "" : "s"} exported` });
        } catch (requestError) {
            setExportError(apiErrorMessage(requestError, "We couldn’t export this overview period."));
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <div className="space-y-5 pb-12">
                <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Financial overview</p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                            <h1 className="text-3xl font-bold tracking-tight font-rounded sm:text-4xl">Overview</h1>
                            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-zinc-500 shadow-sm ring-1 ring-border dark:bg-zinc-900"><CalendarDays className="h-3.5 w-3.5 text-accent" /> {dashboard ? formatDateRange(dashboard.period.start, dashboard.period.end) : "Your money, in context"}</span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-500">Your fast current-state briefing: totals, guardrails, attention, and latest activity.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button onClick={() => void exportPeriod()} disabled={!dashboard || isExporting} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-bold text-zinc-600 disabled:opacity-40 dark:bg-zinc-900 dark:text-zinc-300"><Download className="h-4 w-4" />{isExporting ? "Exporting…" : "Export period"}</button>
                        <button onClick={() => { setEditing(null); setIsModalOpen(true); }} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-zinc-950 shadow-lg shadow-accent/20 hover:bg-[#ff7953]"><Plus className="h-4 w-4" /> Add transaction</button>
                    </div>
                </header>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex w-fit rounded-xl border border-border bg-white p-1 dark:bg-zinc-900" aria-label="Dashboard period">
                        {([['month', 'This month'], ['30d', '30 days'], ['90d', '90 days']] as const).map(([value, label]) => (
                            <button key={value} onClick={() => setPreset(value)} className={cn("min-h-10 rounded-lg px-4 text-xs font-bold transition", preset === value ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white")}>{label}</button>
                        ))}
                    </div>
                    <button onClick={() => void loadDashboard(true)} disabled={loading || refreshing} className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-3 text-xs font-bold text-zinc-500 hover:bg-white disabled:opacity-50 dark:hover:bg-zinc-900"><RefreshCw className={cn("h-4 w-4", (loading || refreshing) && "animate-spin")} /> {refreshing ? "Updating…" : "Refresh"}</button>
                </div>

                {error && dashboard && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div className="flex-1"><p>{error}</p><button onClick={() => void loadDashboard(true)} className="mt-2 font-bold underline">Try again</button></div></div>}
                {exportError && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><p>{exportError}</p></div>}

                {loading && !dashboard ? (
                    <PageSkeleton />
                ) : error && !dashboard ? (
                    <div className="rounded-panel border border-red-200 bg-red-50 p-8 dark:border-red-900/40 dark:bg-red-950/20"><CircleAlert className="h-6 w-6 text-red-500" /><h2 className="mt-4 text-lg font-bold">Dashboard unavailable</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-red-700/70 dark:text-red-300/70">{error}</p><button onClick={() => void loadDashboard()} className="mt-5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white">Try again</button></div>
                ) : !hasData ? <EmptyState onAdd={() => setIsModalOpen(true)} /> : dashboard && (
                    <>
                        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                { label: "Spent", value: formatMoney(dashboard.summary.total_spent), detail: `${dashboard.summary.transaction_count} transactions`, icon: TrendingDown, tone: "text-rose-600 bg-rose-50 dark:bg-rose-950/30" },
                                { label: "Income", value: formatMoney(dashboard.summary.total_income), detail: "Confirmed income", icon: TrendingUp, tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
                                { label: "Net cash flow", value: formatMoney(net), detail: net >= 0 ? "Positive for this period" : "Spending is above income", icon: WalletCards, tone: "text-accent bg-accent/10" },
                                { label: "Daily average", value: formatMoney(dashboard.summary.daily_average), detail: "Expense pace", icon: IndianRupee, tone: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30" },
                            ].map((card) => <article key={card.label} className="rounded-panel border border-border bg-white p-6 shadow-sm dark:bg-zinc-900"><div className={cn("grid h-11 w-11 place-items-center rounded-2xl", card.tone)}><card.icon className="h-5 w-5" /></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">{card.label}</p><p className="mt-2 text-2xl font-bold tracking-tight font-rounded">{card.value}</p><p className="mt-1 text-xs text-zinc-500">{card.detail}</p></article>)}
                        </section>

                        {topInsight && (
                            <section>
                                <div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Worth noticing</p><Link href="/dashboard/insights" className="inline-flex items-center gap-2 text-xs font-bold text-accent">Explore all insights <ArrowRight className="h-4 w-4" /></Link></div>
                                <DashboardInsightCard insight={topInsight} period={transactionPeriod} featured />
                            </section>
                        )}

                        {dashboard.review_items.length > 0 && (
                            <section id="review-queue" className="rounded-panel border border-amber-200 bg-amber-50/60 p-6 dark:border-amber-900/50 dark:bg-amber-950/20 sm:p-8" aria-labelledby="review-queue-heading">
                                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Needs correction</p><h2 id="review-queue-heading" className="mt-2 text-xl font-bold font-rounded">Review {dashboard.review_items.length} transaction{dashboard.review_items.length === 1 ? "" : "s"}</h2><p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">These records are missing a category or linked account. Open one to correct it; it leaves this queue after the required field is saved.</p></div>
                                <div className="mt-5 grid gap-3 lg:grid-cols-2">{dashboard.review_items.map((item) => (
                                    <button key={item.id} onClick={() => setSelectedTransaction(item)} className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-white p-4 text-left hover:border-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-200/50 dark:border-amber-900/50 dark:bg-zinc-900">
                                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-sm font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">!</span>
                                        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{item.merchant || item.title}</span><span className="mt-1 block text-xs text-zinc-500">{!item.category || item.category.toLowerCase() === "uncategorized" ? "Category required" : "Linked account required"}{item.category_suggestions?.length ? ` · Suggested: ${item.category_suggestions.join(", ")}` : ""}</span></span>
                                        <span className="text-xs font-bold text-amber-700 dark:text-amber-300">Correct</span>
                                    </button>
                                ))}</div>
                            </section>
                        )}

                        {dashboard.budget_statuses.length > 0 && (
                            <section aria-labelledby="budget-progress-heading" className="rounded-panel border border-border bg-zinc-100/70 p-6 dark:bg-zinc-950 sm:p-8">
                                <div className="flex items-end justify-between gap-4">
                                    <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Monthly guardrails</p><h2 id="budget-progress-heading" className="mt-2 text-xl font-bold font-rounded">Budget progress</h2></div>
                                    <Link href="/dashboard/tools#budgets" className="inline-flex items-center gap-1 text-xs font-bold text-accent">Manage budgets <ArrowUpRight className="h-4 w-4" /></Link>
                                </div>
                                <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{dashboard.budget_statuses.slice(0, 3).map((budget) => <BudgetProgressCard key={budget.budget_id} budget={budget} compact />)}</div>
                            </section>
                        )}

                        <section className="rounded-panel border border-border bg-white p-6 dark:bg-zinc-900 sm:p-8">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Daily pace</p><h2 className="mt-2 text-xl font-bold font-rounded">Spending trend</h2></div>
                                <p className="text-xs font-semibold text-zinc-400">{dailyTransactionCount} purchase{dailyTransactionCount === 1 ? "" : "s"} across {spendingDayCount} spending day{spendingDayCount === 1 ? "" : "s"}</p>
                            </div>
                            <div className="mt-7 h-[280px] min-w-0">
                                {dailyChartData.length ? (
                                    <DailySpendingChart
                                        data={dailyChartData}
                                        onSelectDate={(date) => router.push(transactionHref({ type: "expense", start_date: date, end_date: date }))}
                                    />
                                ) : <div className="grid h-full place-items-center rounded-2xl bg-zinc-50 text-sm font-semibold text-zinc-400 dark:bg-zinc-800">Daily spending appears after confirmed expenses.</div>}
                            </div>
                            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {dailyChartData.filter((item) => item.count > 0).slice(-8).map((day) => (
                                    <Link key={day.date} href={transactionHref({ type: "expense", start_date: day.date, end_date: day.date })} className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 text-xs hover:bg-accent/10 focus:outline-none focus:ring-4 focus:ring-accent/10 dark:bg-zinc-800">
                                        <span className="font-bold">{formatDate(day.date)}</span>
                                        <span className="text-zinc-500">{formatMoney(day.amount)} · {day.count} txn</span>
                                    </Link>
                                ))}
                            </div>
                            <p className="mt-3 text-xs text-zinc-400">Hover for detail, or select a bar/day to inspect the purchases.</p>
                        </section>

                        <section className="rounded-panel border border-border bg-white p-6 dark:bg-zinc-900 sm:p-8">
                            <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">Latest activity</p><h2 className="mt-2 text-xl font-bold font-rounded">Recent transactions</h2></div><Link href="/dashboard/transactions" className="inline-flex items-center gap-1 text-xs font-bold text-accent">View all <ArrowUpRight className="h-4 w-4" /></Link></div>
                            <div className="mt-6 divide-y divide-border">{dashboard.recent_transactions.length ? dashboard.recent_transactions.map((transaction) => <button key={transaction.id} onClick={() => setSelectedTransaction(transaction)} className="flex min-h-16 w-full items-center gap-4 py-3 text-left"><span className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-100 text-sm font-bold text-zinc-500 dark:bg-zinc-800">{(transaction.merchant || transaction.title || "?").slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{transaction.merchant || transaction.title}</p><p className="truncate text-xs text-zinc-400">{transaction.category} · {transaction.account?.name || transaction.mode}</p></div><div className="text-right"><p className={cn("text-sm font-bold", transaction.type === "income" ? "text-emerald-600" : "text-zinc-900 dark:text-white")}>{transaction.type === "income" ? "+" : "−"}{formatMoney(transaction.amount)}</p><p className="text-xs text-zinc-400">{formatDate(transaction.date)}</p></div></button>) : <div className="rounded-2xl bg-zinc-50 px-5 py-8 text-center dark:bg-zinc-800/60"><p className="text-sm font-semibold text-zinc-500">No recent transactions in this period.</p><p className="mt-1 text-xs text-zinc-400">Older matching records are still available from View all.</p></div>}</div>
                        </section>
                    </>
                )}
            </div>
            <AddTransactionModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditing(null); }} transaction={editing?.transaction} linkedSplitBill={editing?.splitBill} splitDataAvailable={editing?.splitDataAvailable} onSaved={(saved) => { setSelectedTransaction(saved); void loadDashboard(true); }} />
            <TransactionDetailsDrawer isOpen={Boolean(selectedTransaction) && !isModalOpen} onClose={() => setSelectedTransaction(null)} onChanged={() => { void loadDashboard(true); }} onEdit={(transaction, splitBill, splitDataAvailable) => { setEditing({ transaction, splitBill, splitDataAvailable }); setIsModalOpen(true); }} reviewStatus={dashboard?.review_items.some((item) => item.id === selectedTransaction?.id) ? "needs_review" : undefined} transaction={selectedTransaction} />
        </>
    );
}
