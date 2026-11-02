"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { CalendarClock, ChevronRight, Download, Plus, Repeat2, Sparkles, X } from "lucide-react";
import AddTransactionModal from "@/app/components/dashboard/AddTransactionModal";
import BudgetRow from "@/app/components/dashboard/BudgetProgressCard";
import DashboardInsightCard from "@/app/components/dashboard/DashboardInsightCard";
import TransactionDetailsDrawer from "@/app/components/dashboard/TransactionDetailsDrawer";
import { PeriodPicker, useTransactionFilters } from "@/app/components/dashboard/TransactionFilters";
import { buttonPrimary, buttonSecondary, EmptyPanel, ErrorNotice, iconButton, PageHeader, Panel, RankedBars, SectionTitle, Stat, StatStrip } from "@/app/components/dashboard/kit";
import CategoryTile from "@/app/components/ui/CategoryTile";
import { apiErrorMessage, DashboardAPI, DashboardResponse, RecurringCandidate, RecurringCandidatesAPI, SplitBill, Subscription, SubscriptionsAPI, Transaction } from "@/app/lib/api";
import { formatDate, formatDateRange, formatMoney, formatRupees, toLocalISO } from "@/app/lib/format";
import { changeSentence, comparisonRange, DateRange, daysIn, isWithinOneMonth, percentChange, presetRange, wholeMonthOf } from "@/app/lib/period";
import { downloadTransactionsCSV } from "@/app/lib/export-transactions";
import { transactionHref } from "@/app/lib/transaction-links";
import { cn } from "@/app/lib/utils";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { useToast } from "@/app/components/ui/Toast";

const SpendLine = dynamic(() => import("@/app/components/charts/SpendLine"), {
    ssr: false,
    loading: () => <div className="h-full animate-pulse rounded-xl bg-track" aria-hidden="true" />,
});

const timeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const COMING_UP_DAYS = 14;

function addDays(value: string, days: number) {
    const [y, m, d] = value.split("-").map(Number);
    return toLocalISO(new Date(y, m - 1, d + days));
}

/** Running totals for each day of a range, from the API's per-day spending. */
function runningTotals(daily: DashboardResponse["daily_spending"], range: DateRange, upTo?: string) {
    const byDate = new Map(daily.map((day) => [day.date, day.amount]));
    const totals: number[] = [];
    let total = 0;
    for (let date = range.start_date; date <= range.end_date && (!upTo || date <= upTo); date = addDays(date, 1)) {
        total += byDate.get(date) || 0;
        totals.push(total);
    }
    return totals;
}

function dueLabel(subscription: Subscription) {
    const days = subscription.days_until_due;
    if (days < 0) return `Overdue by ${-days} day${days === -1 ? "" : "s"}`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `Due in ${days} days · ${formatDate(subscription.next_due_date)}`;
}

type TransactionEditDraft = { transaction: Transaction; splitBill: SplitBill | null; splitDataAvailable: boolean };

type OverviewData = { current: DashboardResponse; comparison: DashboardResponse | null; line: DashboardResponse | null; lineRange: DateRange | null };

export default function DashboardHome() {
    const { toast } = useToast();
    const controller = useTransactionFilters("month");
    const range = useMemo(() => controller.range ?? presetRange("month")!, [controller.range]);
    const [data, setData] = useState<OverviewData | null>(null);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exportError, setExportError] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [editing, setEditing] = useState<TransactionEditDraft | null>(null);
    const [dismissing, setDismissing] = useState<string | null>(null);
    const [showAllAttention, setShowAllAttention] = useState(false);
    const { start_date: startDate, end_date: endDate } = range;

    const loadDashboard = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const tz = timeZone();
            const current = (await DashboardAPI.get({ start_date: startDate, end_date: endDate, tz })).data;
            const compareRange = current.period.previous_start && current.period.previous_end
                ? { start_date: current.period.previous_start, end_date: current.period.previous_end }
                : comparisonRange({ start_date: startDate, end_date: endDate });
            // A month is drawn against the whole month before it; any other
            // period against the same number of days before it.
            const lineRange = isWithinOneMonth({ start_date: startDate, end_date: endDate }) ? wholeMonthOf(compareRange.start_date) : compareRange;
            const sameWindow = lineRange.start_date === compareRange.start_date && lineRange.end_date === compareRange.end_date;
            const [comparison, line] = await Promise.allSettled([
                DashboardAPI.get({ ...compareRange, tz }),
                sameWindow ? Promise.resolve(null) : DashboardAPI.get({ ...lineRange, tz }),
            ]);
            const comparisonData = comparison.status === "fulfilled" ? comparison.value.data : null;
            const lineData = sameWindow ? comparisonData : line.status === "fulfilled" && line.value ? line.value.data : null;
            setData({ current, comparison: comparisonData, line: lineData, lineRange: lineData ? lineRange : null });
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t load your dashboard. Check your connection and try again."));
        } finally {
            setLoading(false);
        }
    }, [endDate, startDate]);

    useEffect(() => { void loadDashboard(); }, [loadDashboard]);
    useEffect(() => {
        SubscriptionsAPI.list("active").then((response) => setSubscriptions(response.data)).catch(() => setSubscriptions([]));
    }, []);

    const dashboard = data?.current ?? null;
    const summary = dashboard?.summary;
    const spent = summary?.total_spent || 0;
    const income = summary?.total_income || 0;
    const net = income - spent;
    const compareRange = dashboard?.period.previous_start && dashboard.period.previous_end
        ? { start_date: dashboard.period.previous_start, end_date: dashboard.period.previous_end }
        : comparisonRange(range);
    const previousSpent = summary?.spend_change_comparable === false ? 0 : summary?.previous_total_spent ?? data?.comparison?.summary.total_spent ?? 0;
    const spendSentence = changeSentence(spent, previousSpent, compareRange);
    const spendChange = percentChange(spent, previousSpent);
    const incomeChange = data?.comparison ? percentChange(income, data.comparison.summary.total_income) : null;
    const hasData = Boolean(summary?.transaction_count);

    const chart = useMemo(() => {
        if (!dashboard) return null;
        const monthAxis = isWithinOneMonth(range);
        const axisRange = monthAxis ? wholeMonthOf(range.start_date) : range;
        return {
            axisDays: daysIn(axisRange),
            current: runningTotals(dashboard.daily_spending, axisRange, range.end_date),
            previous: data?.line && data.lineRange ? runningTotals(data.line.daily_spending, data.lineRange) : null,
            axisStart: axisRange.start_date,
            previousStart: data?.lineRange?.start_date ?? null,
        };
    }, [dashboard, data, range]);

    const reviewItems = dashboard?.review_items ?? [];
    const insights = useMemo(() => {
        // The hero already states the period comparison and the tiles the top
        // category, so those cards would only repeat them here.
        const list = (dashboard?.insights ?? []).filter((item) => item.kind !== "period_comparison" && item.kind !== "top_category");
        return [...list.filter((item) => item.severity === "warning"), ...list.filter((item) => item.severity !== "warning")];
    }, [dashboard]);
    const candidates = (dashboard?.recurring_candidates ?? []).filter((candidate) => !subscriptions.some((subscription) => {
        const merchant = candidate.merchant.trim().toLowerCase();
        return (merchant && subscription.merchant.trim().toLowerCase() === merchant) || subscription.name.trim().toLowerCase() === candidate.label.trim().toLowerCase();
    }));
    const attentionCount = reviewItems.length + insights.length + candidates.length;
    // Three rows keep the column beside the chart; the rest open on request.
    const attentionRoom = showAllAttention ? Infinity : Math.max(0, 3 - (reviewItems.length ? 1 : 0));
    const shownInsights = insights.slice(0, attentionRoom);
    const shownCandidates = candidates.slice(0, Math.max(0, attentionRoom - shownInsights.length));
    const hiddenAttention = insights.length + candidates.length - shownInsights.length - shownCandidates.length;

    const comingUp = subscriptions
        .filter((subscription) => subscription.status === "active" && subscription.days_until_due <= COMING_UP_DAYS)
        .sort((a, b) => a.days_until_due - b.days_until_due);
    const comingUpTotal = comingUp.reduce((total, subscription) => total + subscription.amount, 0);

    const categories = dashboard?.top_categories ?? [];
    const topCategory = categories[0];
    const topAccount = dashboard?.account_spending?.[0];
    const periodLabel = formatDateRange(range.start_date, range.end_date);

    const exportPeriod = async () => {
        setExportError("");
        setIsExporting(true);
        try {
            await downloadTransactionsCSV(range);
            toast({ title: `${summary?.transaction_count || 0} transaction${summary?.transaction_count === 1 ? "" : "s"} exported` });
        } catch (requestError) {
            setExportError(apiErrorMessage(requestError, "We couldn’t export this period."));
        } finally {
            setIsExporting(false);
        }
    };

    const dismissCandidate = async (candidate: RecurringCandidate) => {
        setDismissing(candidate.candidate_key);
        try {
            await RecurringCandidatesAPI.saveDecision({ candidate_key: candidate.candidate_key, merchant: candidate.merchant, category: candidate.category, decision: "dismissed" });
            setData((current) => current ? { ...current, current: { ...current.current, recurring_candidates: current.current.recurring_candidates.filter((item) => item.candidate_key !== candidate.candidate_key) } } : current);
            toast({ title: `${candidate.label} dismissed`, description: "It won’t be suggested as a repeat payment again." });
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t dismiss this pattern."));
        } finally {
            setDismissing(null);
        }
    };

    const addTransaction = () => { setEditing(null); setIsModalOpen(true); };

    return (
        <>
            <div className="space-y-5 pb-12">
                <PageHeader
                    title="Overview"
                    description={hasData ? `${periodLabel} · ${summary?.transaction_count} transaction${summary?.transaction_count === 1 ? "" : "s"}` : periodLabel}
                    actions={<>
                        <PeriodPicker controller={controller} />
                        <button type="button" onClick={() => void exportPeriod()} disabled={!dashboard || isExporting} aria-label={isExporting ? "Exporting" : "Export this period as CSV"} title="Export CSV" className={iconButton}><Download className="h-[18px] w-[18px]" /></button>
                        <button type="button" onClick={addTransaction} className={buttonSecondary}><Plus className="h-4 w-4" /> Add</button>
                    </>}
                />

                {error && dashboard && <ErrorNotice message={error} onRetry={() => void loadDashboard()} />}
                {exportError && <ErrorNotice message={exportError} />}

                {loading && !dashboard ? <PageSkeleton /> : error && !dashboard ? (
                    <ErrorNotice message={error} onRetry={() => void loadDashboard()} />
                ) : !hasData ? (
                    <EmptyPanel
                        title="Nothing logged in this period"
                        body="Log a spend in the Finnri app, or add one here, and this page fills with where your money went."
                        action={<button type="button" onClick={addTransaction} className={buttonPrimary}><Plus className="h-4 w-4" /> Add a transaction</button>}
                    />
                ) : dashboard && summary && (
                    <>
                        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                            <Panel aria-label="Spending this period" className={cn("flex flex-col overflow-hidden", loading && "opacity-70 transition-opacity")}>
                                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 px-5 pt-5">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-muted">Spent · {periodLabel}</p>
                                        <p className="font-display mt-1 text-[40px] font-bold leading-none tabular-nums sm:text-[48px]">{formatRupees(spent)}</p>
                                        {spendSentence && <p className={cn("mt-2 text-[15px] font-semibold", spendChange !== null && Math.round(spendChange) > 0 ? "text-negative" : spendChange !== null && Math.round(spendChange) < 0 ? "text-positive" : "text-muted")}>{spendSentence}</p>}
                                    </div>
                                    <p className="pb-1 text-sm text-muted">{formatRupees(summary.daily_average)} a day · {summary.expense_count ?? dashboard.daily_spending.reduce((total, day) => total + day.count, 0)} spends</p>
                                </div>
                                <div className="h-[250px] px-3 pb-3 pt-4 sm:h-[280px] sm:px-5 xl:h-auto xl:min-h-[280px] xl:flex-1">
                                    {chart && (
                                        <SpendLine
                                            axisDays={chart.axisDays}
                                            current={chart.current}
                                            previous={chart.previous}
                                            currentLabel={isWithinOneMonth(range) ? new Intl.DateTimeFormat("en-IN", { month: "long" }).format(new Date(`${range.start_date}T12:00:00`)) : "This period"}
                                            previousLabel={chart.previousStart && isWithinOneMonth(range) ? new Intl.DateTimeFormat("en-IN", { month: "long" }).format(new Date(`${chart.previousStart}T12:00:00`)) : "Period before"}
                                            dayLabel={(index) => formatDate(addDays(chart.axisStart, index))}
                                            previousDayLabel={(index) => (chart.previousStart ? formatDate(addDays(chart.previousStart, index)) : "")}
                                        />
                                    )}
                                </div>
                            </Panel>

                            <section id="attention" aria-labelledby="attention-heading" className="scroll-mt-24">
                                <SectionTitle id="attention-heading" title="Needs attention" detail={attentionCount ? `${attentionCount}` : undefined} />
                                {attentionCount === 0 ? (
                                    <EmptyPanel title="All clear" body="Nothing unusual this period, and every transaction has a category and an account." />
                                ) : (
                                    <Panel className="divide-y divide-border">
                                        {reviewItems.length > 0 && (
                                            <div id="review-queue" className="px-4 py-4 sm:px-5">
                                                <p className="text-[15px] font-bold">{reviewItems.length} transaction{reviewItems.length === 1 ? " needs" : "s need"} a category or account</p>
                                                <div className="mt-2 space-y-1">
                                                    {reviewItems.slice(0, 3).map((item) => (
                                                        <button key={item.id} type="button" onClick={() => setSelectedTransaction(item)} className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-track">
                                                            <CategoryTile category={item.category} />
                                                            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{item.merchant || item.title} · {formatMoney(item.amount)}</span><span className="block truncate text-[13px] text-warning">{!item.category || item.category.toLowerCase() === "uncategorized" ? "Needs a category" : "Needs an account"}{item.category_suggestions?.length ? <span className="text-muted"> · try {item.category_suggestions.join(", ")}</span> : null}</span></span>
                                                            <span className="text-sm font-bold">Fix</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {shownInsights.map((insight) => <DashboardInsightCard key={`${insight.kind}-${insight.title}`} insight={insight} period={range} />)}
                                        {shownCandidates.map((candidate) => (
                                            <div key={candidate.candidate_key} className="flex items-start gap-3 px-4 py-4 sm:px-5">
                                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-selected text-accent"><Repeat2 className="h-[18px] w-[18px]" strokeWidth={1.8} /></span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-baseline justify-between gap-3"><h3 className="truncate text-[15px] font-bold">{candidate.label} looks {candidate.interval_guess.toLowerCase()}</h3><p className="shrink-0 text-[15px] font-bold tabular-nums">{formatMoney(candidate.average_amount)}</p></div>
                                                    <p className="mt-0.5 text-sm text-muted">Seen {candidate.occurrences} times · next around {formatDate(candidate.next_expected_date)}. Track it as a repeat payment in the app.</p>
                                                    <button type="button" disabled={dismissing === candidate.candidate_key} onClick={() => void dismissCandidate(candidate)} className="mt-1 inline-flex min-h-9 items-center gap-1 text-sm font-semibold text-muted hover:text-foreground disabled:opacity-50"><X className="h-4 w-4" /> Not a repeat</button>
                                                </div>
                                            </div>
                                        ))}
                                        {(hiddenAttention > 0 || showAllAttention) && (
                                            <button type="button" onClick={() => setShowAllAttention((open) => !open)} aria-expanded={showAllAttention} className="flex w-full items-center justify-center gap-1 px-4 py-3 text-sm font-bold hover:bg-track">
                                                {showAllAttention ? "Show fewer" : `Show ${hiddenAttention} more`}<ChevronRight className={cn("h-4 w-4 transition-transform", showAllAttention ? "-rotate-90" : "rotate-90")} />
                                            </button>
                                        )}
                                    </Panel>
                                )}
                            </section>
                        </div>

                        <StatStrip label="Period figures">
                            <Stat label="Received" value={formatRupees(income)} change={incomeChange} goodWhen="up" detail={income > 0 ? "vs period before" : "No income logged"} />
                            <Stat label="Net" value={`${net < 0 ? "−" : "+"}${formatRupees(Math.abs(net))}`} tone={net < 0 ? "negative" : "positive"} detail={net < 0 ? "Spent more than received" : "Received more than spent"} />
                            <Stat text label="Top category" value={topCategory ? topCategory.category : "—"} detail={topCategory ? `${formatRupees(topCategory.amount)} · ${Math.round(topCategory.percentage)}% of spending` : undefined} />
                            <Stat text label="Paid most with" value={topAccount ? topAccount.account_name : "—"} detail={topAccount ? `${formatRupees(topAccount.amount)} · ${Math.round(topAccount.percentage)}%` : undefined} />
                        </StatStrip>

                        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
                            <section aria-labelledby="where-heading">
                                <SectionTitle id="where-heading" title="Where it went" href="/dashboard/reports" linkLabel="Full report" />
                                {categories.length ? (
                                    <Panel>
                                        <RankedBars
                                            label="Spending by category"
                                            rows={categories.map((category) => ({
                                                key: category.category,
                                                label: category.category,
                                                amount: formatRupees(category.amount),
                                                share: category.amount / categories[0].amount,
                                                sub: `${Math.round(category.percentage)}% of spending`,
                                                change: category.change_comparable === false ? null : category.change,
                                                href: transactionHref({ ...range, type: "expense", category: category.category }),
                                                leading: <CategoryTile category={category.category} />,
                                            }))}
                                        />
                                    </Panel>
                                ) : <EmptyPanel title="No spending in this period" />}
                            </section>

                            <section aria-labelledby="coming-heading">
                                <SectionTitle id="coming-heading" title="Coming up" detail={comingUp.length ? `${formatRupees(comingUpTotal)} in ${COMING_UP_DAYS} days` : undefined} href="/dashboard/tools" linkLabel="All bills" />
                                {comingUp.length ? (
                                    <Panel className="divide-y divide-border">
                                        {comingUp.slice(0, 6).map((subscription) => (
                                            <Link key={subscription.id} href="/dashboard/tools#subscriptions" className="flex items-center gap-3 px-4 py-3 hover:bg-track sm:px-5">
                                                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-[10px]", subscription.days_until_due < 0 ? "bg-warning-surface text-warning" : "bg-track text-muted")}><CalendarClock className="h-[18px] w-[18px]" strokeWidth={1.8} /></span>
                                                <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold">{subscription.name}</span><span className={cn("block truncate text-[13px]", subscription.days_until_due < 0 ? "font-semibold text-warning" : "text-muted")}>{dueLabel(subscription)}{subscription.account?.name ? ` · ${subscription.account.name}` : ""}</span></span>
                                                <span className="shrink-0 text-[15px] font-bold tabular-nums">{formatMoney(subscription.amount)}</span>
                                            </Link>
                                        ))}
                                    </Panel>
                                ) : <EmptyPanel title={`Nothing due in the next ${COMING_UP_DAYS} days`} body="Bills, EMIs and SIPs you track in the app show here before they’re due." />}
                            </section>
                        </div>

                        <div className={cn("grid gap-5 lg:items-start", dashboard.budget_statuses.length > 0 && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]")}>
                            {dashboard.budget_statuses.length > 0 && (
                                <section aria-labelledby="budget-heading">
                                    <SectionTitle id="budget-heading" title="Budgets this month" href="/dashboard/tools#budgets" linkLabel="All budgets" />
                                    <Panel className="divide-y divide-border">{dashboard.budget_statuses.slice(0, 4).map((budget) => <BudgetRow key={budget.budget_id} budget={budget} />)}</Panel>
                                </section>
                            )}

                            <section aria-labelledby="recent-heading">
                                <SectionTitle id="recent-heading" title="Recent transactions" href={transactionHref(range)} linkLabel="View all" />
                                {dashboard.recent_transactions.length ? (
                                    <Panel className="divide-y divide-border overflow-hidden">
                                        {dashboard.recent_transactions.map((transaction) => {
                                            const isIncome = transaction.type === "income";
                                            return (
                                                <button key={transaction.id} type="button" onClick={() => setSelectedTransaction(transaction)} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-track sm:px-5">
                                                    <CategoryTile category={transaction.category} />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-[15px] font-semibold">{transaction.merchant || transaction.title}</span>
                                                        <span className="block truncate text-[13px] text-muted">{transaction.category} · {transaction.account?.name || transaction.mode}</span>
                                                    </span>
                                                    <span className="shrink-0 text-right">
                                                        <span className={cn("block text-[15px] font-bold tabular-nums", isIncome && "text-positive")}>{isIncome ? "+" : "−"}{formatMoney(transaction.amount)}</span>
                                                        <span className="block text-[13px] text-muted">{formatDate(transaction.date)}</span>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                        <Link href={transactionHref(range)} className="flex items-center justify-center gap-1 px-4 py-3 text-sm font-bold hover:bg-track">All transactions in this period <ChevronRight className="h-4 w-4" /></Link>
                                    </Panel>
                                ) : <EmptyPanel title="No transactions in this period" />}
                            </section>
                        </div>

                        <p className="flex items-center gap-2 text-[13px] text-muted"><Sparkles className="h-4 w-4 shrink-0" /> Totals count confirmed transactions only. Changes compare with {formatDateRange(compareRange.start_date, compareRange.end_date)}.</p>
                    </>
                )}
            </div>
            <AddTransactionModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditing(null); }} transaction={editing?.transaction} linkedSplitBill={editing?.splitBill} splitDataAvailable={editing?.splitDataAvailable} onSaved={(saved) => { setSelectedTransaction(saved); void loadDashboard(); }} />
            <TransactionDetailsDrawer isOpen={Boolean(selectedTransaction) && !isModalOpen} onClose={() => setSelectedTransaction(null)} onChanged={() => { void loadDashboard(); }} onEdit={(transaction, splitBill, splitDataAvailable) => { setEditing({ transaction, splitBill, splitDataAvailable }); setIsModalOpen(true); }} reviewStatus={reviewItems.some((item) => item.id === selectedTransaction?.id) ? "needs_review" : undefined} transaction={selectedTransaction} />
        </>
    );
}
