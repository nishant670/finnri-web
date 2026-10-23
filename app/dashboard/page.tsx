"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ChevronRight,
    CircleAlert,
    Download,
    Plus,
    RefreshCw,
    Sparkles,
} from "lucide-react";
import AddTransactionModal from "@/app/components/dashboard/AddTransactionModal";
import BudgetProgressCard from "@/app/components/dashboard/BudgetProgressCard";
import DashboardInsightCard from "@/app/components/dashboard/DashboardInsightCard";
import TransactionDetailsDrawer from "@/app/components/dashboard/TransactionDetailsDrawer";
import CategoryTile from "@/app/components/ui/CategoryTile";
import { apiErrorMessage, DashboardAPI, DashboardResponse, SplitBill, Transaction } from "@/app/lib/api";
import { formatDate, formatDateRange, formatMoney, toLocalISO } from "@/app/lib/format";
import { downloadTransactionsCSV } from "@/app/lib/export-transactions";
import { transactionHref } from "@/app/lib/transaction-links";
import { cn } from "@/app/lib/utils";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { useToast } from "@/app/components/ui/Toast";

const DailySpendingChart = dynamic(() => import("@/app/components/charts/DailySpendingChart"), {
    ssr: false,
    loading: () => <div className="h-full animate-pulse rounded-xl bg-track" aria-hidden="true" />,
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
        <div className="rounded-2xl border border-border bg-card p-8 text-center sm:p-10">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-selected text-accent"><Sparkles className="h-6 w-6" /></span>
            <h2 className="mt-4 text-xl font-bold">Your first insight starts with one transaction</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Log one expense or income and Finnri starts showing you where your money goes.</p>
            <button onClick={onAdd} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-bold text-on-accent"><Plus className="h-5 w-5" /> Add a transaction</button>
        </div>
    );
}

const PRESETS = [["month", "This month"], ["30d", "30 days"], ["90d", "90 days"]] as const;

/** Section heading with an optional ink link on the right (boards R9-Dash*). */
function SectionTitle({ title, href, linkLabel, detail }: { title: string; href?: string; linkLabel?: string; detail?: string }) {
    return (
        <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-bold">{title}</h2>
            {href && linkLabel ? <Link href={href} className="inline-flex items-center gap-0.5 text-sm font-bold hover:underline">{linkLabel}<ChevronRight className="h-4 w-4" /></Link> : null}
            {detail ? <p className="text-sm text-muted">{detail}</p> : null}
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
            setError(apiErrorMessage(requestError, "We couldn’t load your dashboard. Check your connection and try again."));
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

    const periodLabel = dashboard ? formatDateRange(dashboard.period.start, dashboard.period.end) : "";
    const addTransaction = () => { setEditing(null); setIsModalOpen(true); };
    const recentDays = dailyChartData.filter((item) => item.count > 0).slice(-8);

    const presetControl = (
        <div className="flex h-12 rounded-full bg-track p-1" role="group" aria-label="Dashboard period">
            {PRESETS.map(([value, label]) => (
                <button
                    key={value}
                    onClick={() => setPreset(value)}
                    aria-pressed={preset === value}
                    className={cn("min-h-10 flex-1 whitespace-nowrap rounded-full px-4 text-sm transition sm:flex-none", preset === value ? "bg-card font-bold shadow-sm dark:bg-border" : "font-medium text-muted hover:text-foreground")}
                >{label}</button>
            ))}
        </div>
    );
    const refreshButton = (
        <button onClick={() => void loadDashboard(true)} disabled={loading || refreshing} aria-label={refreshing ? "Updating" : "Refresh"} title="Refresh" className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border disabled:opacity-50"><RefreshCw className={cn("h-5 w-5", (loading || refreshing) && "animate-spin")} /></button>
    );
    const exportButton = (iconOnly: boolean) => (
        <button onClick={() => void exportPeriod()} disabled={!dashboard || isExporting} aria-label="Export period" className={cn("inline-flex h-12 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border text-[15px] font-bold disabled:opacity-40", iconOnly ? "w-12" : "px-5")}><Download className="h-5 w-5" />{iconOnly ? null : isExporting ? "Exporting…" : "Export period"}</button>
    );

    return (
        <>
            <div className="space-y-5 pb-12">
                <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="hidden lg:block">
                        <h1 className="text-[32px] font-bold leading-10">Overview</h1>
                        <p className="mt-1 text-[15px] text-muted">{periodLabel ? `${periodLabel} · ` : ""}totals, guardrails, attention and latest activity</p>
                    </div>
                    <h1 className="sr-only lg:hidden">Overview</h1>
                    <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1 lg:flex-none">{presetControl}</div>
                        <div className="hidden lg:block">{exportButton(false)}</div>
                        {refreshButton}
                        <button onClick={addTransaction} className="hidden h-12 shrink-0 items-center gap-2 rounded-full bg-accent px-6 text-[15px] font-bold text-on-accent lg:inline-flex"><Plus className="h-5 w-5" /> Add transaction</button>
                    </div>
                </header>

                {error && dashboard && <div className="flex items-start gap-3 rounded-2xl border border-negative/40 bg-negative/10 p-4 text-sm"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-negative" /><div className="flex-1"><p>{error}</p><button onClick={() => void loadDashboard(true)} className="mt-2 font-bold underline">Try again</button></div></div>}
                {exportError && <div className="flex items-start gap-3 rounded-2xl border border-negative/40 bg-negative/10 p-4 text-sm"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-negative" /><p>{exportError}</p></div>}

                {loading && !dashboard ? (
                    <PageSkeleton />
                ) : error && !dashboard ? (
                    <div className="rounded-2xl border border-border bg-card p-8"><CircleAlert className="h-6 w-6 text-negative" /><h2 className="mt-4 text-lg font-bold">Dashboard unavailable</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{error}</p><button onClick={() => void loadDashboard()} className="mt-5 min-h-11 rounded-full bg-accent px-5 text-sm font-bold text-on-accent">Try again</button></div>
                ) : !hasData ? <EmptyState onAdd={addTransaction} /> : dashboard && (
                    <>
                        {/* Phones: one summary card (board R9-Dash). */}
                        <section className="overflow-hidden rounded-2xl border border-border bg-card lg:hidden" aria-label="Period summary">
                            <div className="p-5">
                                <p className="text-sm font-semibold text-muted">Spent · {periodLabel}</p>
                                <p className="mt-1 text-4xl font-bold tabular-nums">{formatMoney(dashboard.summary.total_spent)}</p>
                                <p className="mt-1 text-[15px] text-muted">{dashboard.summary.transaction_count} transactions</p>
                            </div>
                            <div className="grid grid-cols-3 border-t border-border">
                                <Metric label="Income" value={formatMoney(dashboard.summary.total_income)} />
                                <Metric label="Net cash flow" value={formatMoney(net)} tone={net < 0 ? "negative" : undefined} divider />
                                <Metric label="Daily average" value={formatMoney(dashboard.summary.daily_average)} divider />
                            </div>
                        </section>
                        <div className="flex gap-3 lg:hidden">
                            <button onClick={addTransaction} className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-accent px-5 text-[15px] font-bold text-on-accent"><Plus className="h-5 w-5" /> Add transaction</button>
                            {exportButton(true)}
                        </div>

                        {/* Desktop: four figures (board R9-DashDesktop). */}
                        <section className="hidden gap-4 lg:grid lg:grid-cols-4" aria-label="Period summary">
                            {[
                                { label: "Spent", value: formatMoney(dashboard.summary.total_spent), detail: `${dashboard.summary.transaction_count} transactions` },
                                { label: "Income", value: formatMoney(dashboard.summary.total_income), detail: "Confirmed income" },
                                { label: "Net cash flow", value: formatMoney(net), detail: net >= 0 ? "Positive for this period" : "Spending is above income", negative: net < 0 },
                                { label: "Daily average", value: formatMoney(dashboard.summary.daily_average), detail: "Expense pace" },
                            ].map((card) => (
                                <article key={card.label} className="rounded-2xl border border-border bg-card px-5 py-4">
                                    <p className="text-sm font-semibold text-muted">{card.label}</p>
                                    <p className={cn("mt-1 text-[28px] font-bold leading-9 tabular-nums", card.negative && "text-negative")}>{card.value}</p>
                                    <p className="text-sm text-muted">{card.detail}</p>
                                </article>
                            ))}
                        </section>

                        <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
                            {topInsight && (
                                <section className="lg:order-2">
                                    <SectionTitle title="Worth noticing" href="/dashboard/insights" linkLabel="All insights" />
                                    <DashboardInsightCard insight={topInsight} period={transactionPeriod} featured />
                                </section>
                            )}

                            <section className="lg:order-1">
                                <SectionTitle title="Spending trend" detail={`${dailyTransactionCount} purchase${dailyTransactionCount === 1 ? "" : "s"} · ${spendingDayCount} spending day${spendingDayCount === 1 ? "" : "s"}`} />
                                <div className="overflow-hidden rounded-2xl border border-border bg-card xl:grid xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                                    <div className="h-[230px] min-w-0 p-4 xl:h-auto xl:min-h-[300px]">
                                        {dailyChartData.length ? (
                                            <DailySpendingChart
                                                data={dailyChartData}
                                                average={dashboard.summary.daily_average}
                                                onSelectDate={(date) => router.push(transactionHref({ type: "expense", start_date: date, end_date: date }))}
                                            />
                                        ) : <div className="grid h-full place-items-center text-sm font-semibold text-muted">Your daily spending shows up here once you log an expense.</div>}
                                    </div>
                                    {recentDays.length > 0 && (
                                        <div className="border-t border-border xl:border-l xl:border-t-0 xl:py-3">
                                            <p className="hidden px-5 pb-1 text-sm font-semibold text-muted xl:block">By day</p>
                                            {recentDays.map((day) => (
                                                <Link key={day.date} href={transactionHref({ type: "expense", start_date: day.date, end_date: day.date })} className="flex min-h-[52px] items-center justify-between border-b border-border px-5 text-[15px] last:border-b-0 hover:bg-track xl:min-h-10 xl:border-b-0 xl:text-sm">
                                                    <span className="font-bold">{formatDate(day.date)}</span>
                                                    <span className="tabular-nums"><span className="font-bold">{formatMoney(day.amount)}</span><span className="text-muted"> · {day.count} txn</span></span>
                                                </Link>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {dashboard.review_items.length > 0 && (
                            <section id="review-queue" aria-labelledby="review-queue-heading">
                                <div className="mb-3"><h2 id="review-queue-heading" className="text-[17px] font-bold">Review {dashboard.review_items.length} transaction{dashboard.review_items.length === 1 ? "" : "s"}</h2><p className="mt-0.5 text-sm text-muted">These are missing a category or an account. Fix one and it drops off this list.</p></div>
                                <div className={cn("overflow-hidden rounded-2xl border border-border bg-card", dashboard.review_items.length > 1 && "lg:grid lg:grid-cols-2")}>{dashboard.review_items.map((item) => (
                                    <button key={item.id} onClick={() => setSelectedTransaction(item)} className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-track focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/20">
                                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-warning-surface text-sm font-bold text-warning">!</span>
                                        <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium">{item.merchant || item.title}</span><span className="mt-0.5 block text-sm text-warning">{!item.category || item.category.toLowerCase() === "uncategorized" ? "Needs a category" : "Needs an account"}{item.category_suggestions?.length ? <span className="text-muted"> · Suggested: {item.category_suggestions.join(", ")}</span> : null}</span></span>
                                        <span className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-sm font-bold">Correct</span>
                                    </button>
                                ))}</div>
                            </section>
                        )}

                        {dashboard.budget_statuses.length > 0 && (
                            <section aria-labelledby="budget-progress-heading">
                                <div className="mb-3 flex items-baseline justify-between gap-3"><h2 id="budget-progress-heading" className="text-[17px] font-bold">Budget progress</h2><Link href="/dashboard/tools#budgets" className="inline-flex items-center gap-0.5 text-sm font-bold hover:underline">Manage budgets <ChevronRight className="h-4 w-4" /></Link></div>
                                <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">{dashboard.budget_statuses.slice(0, 3).map((budget) => <BudgetProgressCard key={budget.budget_id} budget={budget} compact />)}</div>
                            </section>
                        )}

                        <section aria-labelledby="recent-heading">
                            <div className="mb-3 flex items-baseline justify-between gap-3"><h2 id="recent-heading" className="text-[17px] font-bold">Recent transactions</h2><Link href="/dashboard/transactions" className="inline-flex items-center gap-0.5 text-sm font-bold hover:underline">View all <ChevronRight className="h-4 w-4" /></Link></div>
                            {dashboard.recent_transactions.length ? (
                                <div className="overflow-hidden rounded-2xl border border-border bg-card">
                                    <div className="hidden grid-cols-[2fr_1.6fr_1.2fr_0.9fr_1fr] gap-4 border-b border-border px-4 py-3 text-sm font-semibold text-muted lg:grid">
                                        <span>Merchant</span><span>Category</span><span>Account</span><span>Date</span><span className="text-right">Amount</span>
                                    </div>
                                    {dashboard.recent_transactions.map((transaction) => {
                                        const income = transaction.type === "income";
                                        const amount = `${income ? "+" : "−"}${formatMoney(transaction.amount)}`;
                                        return (
                                            <button key={transaction.id} onClick={() => setSelectedTransaction(transaction)} className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-track lg:grid lg:grid-cols-[2fr_1.6fr_1.2fr_0.9fr_1fr] lg:gap-4">
                                                <span className="flex min-w-0 flex-1 items-center gap-3">
                                                    <CategoryTile category={transaction.category} />
                                                    <span className="min-w-0">
                                                        <span className="block truncate text-[15px] font-medium lg:font-bold">{transaction.merchant || transaction.title}</span>
                                                        <span className="block truncate text-sm text-muted lg:hidden">{transaction.category} · {transaction.account?.name || transaction.mode}</span>
                                                    </span>
                                                </span>
                                                <span className="hidden truncate text-sm lg:block">{transaction.category}</span>
                                                <span className="hidden truncate text-sm lg:block">{transaction.account?.name || transaction.mode}</span>
                                                <span className="hidden text-sm lg:block">{formatDate(transaction.date)}</span>
                                                <span className="shrink-0 text-right">
                                                    <span className={cn("block text-[15px] font-bold tabular-nums", income && "text-positive")}>{amount}</span>
                                                    <span className="block text-sm text-muted lg:hidden">{formatDate(transaction.date)}</span>
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : <div className="rounded-2xl border border-border bg-card px-5 py-8 text-center"><p className="text-sm font-semibold text-muted">No recent transactions in this period.</p><p className="mt-1 text-xs text-muted">Older matching records are still available from View all.</p></div>}
                        </section>
                    </>
                )}
            </div>
            <AddTransactionModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditing(null); }} transaction={editing?.transaction} linkedSplitBill={editing?.splitBill} splitDataAvailable={editing?.splitDataAvailable} onSaved={(saved) => { setSelectedTransaction(saved); void loadDashboard(true); }} />
            <TransactionDetailsDrawer isOpen={Boolean(selectedTransaction) && !isModalOpen} onClose={() => setSelectedTransaction(null)} onChanged={() => { void loadDashboard(true); }} onEdit={(transaction, splitBill, splitDataAvailable) => { setEditing({ transaction, splitBill, splitDataAvailable }); setIsModalOpen(true); }} reviewStatus={dashboard?.review_items.some((item) => item.id === selectedTransaction?.id) ? "needs_review" : undefined} transaction={selectedTransaction} />
        </>
    );
}

/** One cell of the phone summary card's bottom strip. */
function Metric({ label, value, tone, divider = false }: { label: string; value: string; tone?: "negative"; divider?: boolean }) {
    return (
        <div className={cn("min-w-0 px-3 py-3 sm:px-4", divider && "border-l border-border")}>
            <p className="truncate text-[13px] text-muted">{label}</p>
            <p className={cn("truncate text-base font-bold tabular-nums", tone === "negative" && "text-negative")}>{value}</p>
        </div>
    );
}
