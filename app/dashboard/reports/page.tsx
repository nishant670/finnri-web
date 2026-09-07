"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowDownRight,
    ArrowUpRight,
    CalendarRange,
    CircleAlert,
    Download,
    IndianRupee,
    Landmark,
    RefreshCw,
    Store,
    Tags,
    Wallet,
} from "lucide-react";
import { TransactionFilterPanel, useTransactionFilters } from "@/app/components/dashboard/TransactionFilters";
import { Account, AccountsAPI, apiErrorMessage, ReportsAPI, TransactionReportResponse } from "@/app/lib/api";
import { formatMoney } from "@/app/lib/format";
import { downloadReportRollupsCSV } from "@/app/lib/export-report";
import { transactionHref } from "@/app/lib/transaction-links";
import { cn } from "@/app/lib/utils";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { useToast } from "@/app/components/ui/Toast";

const chartLoading = () => <div className="h-full animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" aria-hidden="true" />;
const CategoryMixChart = dynamic(
    () => import("@/app/components/charts/ReportCharts").then((module) => module.CategoryMixChart),
    { ssr: false, loading: chartLoading },
);
const MonthlyTrendChart = dynamic(
    () => import("@/app/components/charts/ReportCharts").then((module) => module.MonthlyTrendChart),
    { ssr: false, loading: chartLoading },
);

function EmptyPanel({ label }: { label: string }) {
    return <div className="grid min-h-52 place-items-center rounded-2xl bg-zinc-50 p-6 text-center text-sm font-semibold text-zinc-400 dark:bg-zinc-800">{label}</div>;
}

export default function ReportsScreen() {
    const { toast } = useToast();
    const router = useRouter();
    const [report, setReport] = useState<TransactionReportResponse | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exportError, setExportError] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const filterController = useTransactionFilters("month");
    const { entryParams, amountError, dateError } = filterController;

    useEffect(() => {
        AccountsAPI.list().then((response) => setAccounts(response.data)).catch(() => setAccounts([]));
    }, []);

    const loadReport = useCallback(async () => {
        setLoading(true);
        setError("");
        if (amountError || dateError) {
            setError(amountError || dateError);
            setLoading(false);
            return;
        }
        try {
            const response = await ReportsAPI.transactionSummary(entryParams());
            setReport(response.data);
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t load transaction reports."));
        } finally {
            setLoading(false);
        }
    }, [amountError, dateError, entryParams]);

    useEffect(() => {
        const timer = window.setTimeout(() => void loadReport(), 250);
        return () => window.clearTimeout(timer);
    }, [loadReport]);

    const categoryChart = useMemo(() => report?.by_category.map((item) => ({
        name: item.label,
        amount: item.amount,
        percentage: item.percentage,
    })) || [], [report]);
    const monthChart = useMemo(() => report?.by_month.map((item) => ({
        month: item.month,
        expense: item.expense,
        income: item.income,
        net: item.net_cashflow,
    })) || [], [report]);
    const byType = useMemo(() => new Map(report?.by_type.map((item) => [item.type, item]) || []), [report]);
    const hasData = Boolean(report?.summary.transaction_count);
    const drilldownHref = (overrides: Parameters<typeof transactionHref>[0]) => transactionHref({ ...entryParams(), ...overrides });
    const exportReportRows = async () => {
        if (!report) return;
        setExportError("");
        setIsExporting(true);
        try {
            downloadReportRollupsCSV(report);
            toast({ title: `${report.summary.transaction_count.toLocaleString("en-IN")} filtered record${report.summary.transaction_count === 1 ? "" : "s"} summarized`, description: "Category, merchant, account, month, type, and headline rollups exported." });
        } catch (requestError) {
            setExportError(apiErrorMessage(requestError, "We couldn’t export these report rows."));
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <>
            <div className="space-y-7 pb-12">
                <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Advanced reports</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight font-rounded sm:text-4xl">Transaction reports</h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Your user-filtered analysis and export workspace for category, merchant, account, month, and type totals.</p>
                    </div>
                    <div className="flex flex-wrap gap-2"><button onClick={() => void exportReportRows()} disabled={!report || isExporting || Boolean(amountError || dateError)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-bold text-zinc-600 disabled:opacity-40 dark:bg-zinc-900 dark:text-zinc-300"><Download className="h-4 w-4" />{isExporting ? "Exporting…" : `Export ${(report?.summary.transaction_count || 0).toLocaleString("en-IN")} filtered record${report?.summary.transaction_count === 1 ? "" : "s"}`}</button><button onClick={() => void loadReport()} className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl border border-border bg-white px-4 text-sm font-bold text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh</button></div>
                </header>

                <TransactionFilterPanel controller={filterController} accounts={accounts} searchLabel="Search reports" />
                {exportError && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><p>{exportError}</p></div>}
                {error && report && <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">{error} <button onClick={() => void loadReport()} className="ml-2 font-bold underline">Try again</button></div>}

                {loading && !report ? (
                    <PageSkeleton />
                ) : error && !report ? (
                    <div className="rounded-panel border border-red-200 bg-red-50 p-8 dark:border-red-900/40 dark:bg-red-950/20"><CircleAlert className="h-6 w-6 text-red-500" /><h2 className="mt-4 text-lg font-bold">Reports unavailable</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-red-700/70 dark:text-red-300/70">{error}</p><button onClick={() => void loadReport()} className="mt-5 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white">Try again</button></div>
                ) : report && (
                    <>
                        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {[
                                { label: "Expense", value: formatMoney(byType.get("expense")?.amount || 0), detail: `${byType.get("expense")?.transaction_count || 0} expense records`, icon: ArrowDownRight, tone: "text-rose-600 bg-rose-50 dark:bg-rose-950/30" },
                                { label: "Income", value: formatMoney(byType.get("income")?.amount || 0), detail: `${byType.get("income")?.transaction_count || 0} income records`, icon: ArrowUpRight, tone: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" },
                                { label: "Net cash flow", value: formatMoney(report.summary.net_cashflow), detail: report.summary.net_cashflow >= 0 ? "Income above expense" : "Expense above income", icon: Landmark, tone: "text-accent bg-accent/10" },
                                { label: "Records", value: report.summary.transaction_count.toLocaleString("en-IN"), detail: "Matching filters", icon: IndianRupee, tone: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30" },
                            ].map((card) => (
                                <article key={card.label} className="rounded-panel border border-border bg-white p-6 shadow-sm dark:bg-zinc-900">
                                    <div className={cn("grid h-11 w-11 place-items-center rounded-2xl", card.tone)}><card.icon className="h-5 w-5" /></div>
                                    <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">{card.label}</p>
                                    <p className="mt-2 break-words text-2xl font-bold tracking-tight font-rounded">{card.value}</p>
                                    <p className="mt-1 text-xs text-zinc-500">{card.detail}</p>
                                </article>
                            ))}
                        </section>

                        {!hasData ? (
                            <EmptyPanel label="No confirmed transactions match these report filters." />
                        ) : (
                            <>
                                <section className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
                                    <div className="rounded-panel border border-border bg-white p-6 dark:bg-zinc-900 sm:p-8">
                                        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent"><Tags className="h-4 w-4" /></span><div><h2 className="font-bold font-rounded">Category mix</h2><p className="text-xs text-zinc-400">Expense distribution · select a bar to inspect</p></div></div>
                                        <div className="mt-7 h-[320px] min-w-0">
                                            {categoryChart.length ? <CategoryMixChart data={categoryChart} onSelectCategory={(category) => router.push(drilldownHref({ type: "expense", category }))} /> : <EmptyPanel label="No expense categories in this range." />}
                                        </div>
                                    </div>
                                    <div className="rounded-panel border border-border bg-white p-6 dark:bg-zinc-900 sm:p-8">
                                        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30"><Store className="h-4 w-4" /></span><div><h2 className="font-bold font-rounded">Top merchants</h2><p className="text-xs text-zinc-400">Largest expense merchants</p></div></div>
                                        <div className="mt-6 space-y-2">{report.by_merchant.length ? report.by_merchant.slice(0, 6).map((merchant, index) => <Link key={merchant.key} href={drilldownHref({ type: "expense", q: merchant.label })} className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-3 hover:bg-accent/10 focus:outline-none focus:ring-4 focus:ring-accent/10 dark:bg-zinc-800 dark:hover:bg-zinc-700"><span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-xs font-bold text-zinc-500 dark:bg-zinc-900">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{merchant.label}</p><p className="text-xs text-zinc-400">{merchant.transaction_count} records</p></div><p className="text-sm font-bold">{formatMoney(merchant.amount)}</p></Link>) : <EmptyPanel label="No merchant spending in this range." />}</div>
                                    </div>
                                </section>

                                <section className="grid gap-6 xl:grid-cols-2">
                                    <div className="rounded-panel border border-border bg-white p-6 dark:bg-zinc-900 sm:p-8">
                                        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"><CalendarRange className="h-4 w-4" /></span><div><h2 className="font-bold font-rounded">Monthly trend</h2><p className="text-xs text-zinc-400">Expense and income over time</p></div></div>
                                        <div className="mt-7 h-[300px] min-w-0">
                                            {monthChart.length ? <MonthlyTrendChart data={monthChart} /> : <EmptyPanel label="Monthly trend appears after dated records." />}
                                        </div>
                                    </div>
                                    <div className="rounded-panel border border-border bg-white p-6 dark:bg-zinc-900 sm:p-8">
                                        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent"><Wallet className="h-4 w-4" /></span><div><h2 className="font-bold font-rounded">Account usage</h2><p className="text-xs text-zinc-400">Expense totals by payment source</p></div></div>
                                        <div className="mt-6 divide-y divide-border">{report.by_account.length ? report.by_account.map((account) => account.account_id ? <Link key={`${account.account_id}-${account.account_name}`} href={drilldownHref({ type: "expense", account_id: account.account_id })} className="flex min-h-16 items-center gap-4 py-3 hover:text-accent focus:outline-none focus:ring-4 focus:ring-accent/10"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{account.account_name}</p><p className="text-xs text-zinc-400">{account.transaction_count} records · {account.percentage.toFixed(1)}%</p></div><p className="text-sm font-bold">{formatMoney(account.amount)}</p></Link> : <div key={`${account.account_id}-${account.account_name}`} className="flex min-h-16 items-center gap-4 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{account.account_name}</p><p className="text-xs text-zinc-400">{account.transaction_count} records · {account.percentage.toFixed(1)}%</p></div><p className="text-sm font-bold">{formatMoney(account.amount)}</p></div>) : <EmptyPanel label="No account spending in this range." />}</div>
                                    </div>
                                </section>
                            </>
                        )}
                    </>
                )}
            </div>
        </>
    );
}
