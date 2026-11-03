"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import MonthBars, { type MonthBar } from "@/app/components/charts/MonthBars";
import { PeriodPicker, TransactionFilterPanel, useTransactionFilters } from "@/app/components/dashboard/TransactionFilters";
import { EmptyPanel, ErrorNotice, iconButton, Monogram, PageHeader, Panel, RankedBars, type RankedRow, SectionTitle, Segmented, Stat, StatStrip } from "@/app/components/dashboard/kit";
import CategoryTile from "@/app/components/ui/CategoryTile";
import { Account, AccountsAPI, apiErrorMessage, ReportsAPI, TransactionReportResponse } from "@/app/lib/api";
import { formatDateRange, formatRupees, toLocalISO } from "@/app/lib/format";
import { daysIn, percentChange } from "@/app/lib/period";
import { downloadReportRollupsCSV } from "@/app/lib/export-report";
import { transactionHref } from "@/app/lib/transaction-links";
import { PageSkeleton } from "@/app/components/ui/Skeleton";
import { useToast } from "@/app/components/ui/Toast";

type Breakdown = "categories" | "merchants" | "accounts";
const BREAKDOWNS = [{ value: "categories", label: "Categories" }, { value: "merchants", label: "Merchants" }, { value: "accounts", label: "Accounts" }] as const;
const TREND_MONTHS = 12;

const plural = (count: number, word: string) => `${count.toLocaleString("en-IN")} ${word}${count === 1 ? "" : "s"}`;

/** The first day of the month `back` months before this one. */
function monthStart(back: number) {
    const now = new Date();
    return toLocalISO(new Date(now.getFullYear(), now.getMonth() - back, 1));
}

export default function ReportsScreen() {
    const { toast } = useToast();
    const [report, setReport] = useState<TransactionReportResponse | null>(null);
    const [previous, setPrevious] = useState<TransactionReportResponse | null>(null);
    const [trend, setTrend] = useState<TransactionReportResponse | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exportError, setExportError] = useState("");
    const [breakdown, setBreakdown] = useState<Breakdown>("categories");
    const controller = useTransactionFilters("month");
    const { entryParams, filterParams, amountError, dateError, range, comparison } = controller;

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
            const [current, before, months] = await Promise.all([
                ReportsAPI.transactionSummary(entryParams()),
                comparison ? ReportsAPI.transactionSummary({ ...filterParams(), ...comparison }).catch(() => null) : Promise.resolve(null),
                // The trend always shows a year, whatever the period, so a single
                // month never shrinks it to one point.
                ReportsAPI.transactionSummary({ ...filterParams(), start_date: monthStart(TREND_MONTHS - 1), end_date: toLocalISO() }).catch(() => null),
            ]);
            setReport(current.data);
            setPrevious(before ? before.data : null);
            setTrend(months ? months.data : null);
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t load this report."));
        } finally {
            setLoading(false);
        }
    }, [amountError, comparison, dateError, entryParams, filterParams]);

    useEffect(() => {
        const timer = window.setTimeout(() => void loadReport(), 250);
        return () => window.clearTimeout(timer);
    }, [loadReport]);

    const summary = report?.summary;
    const previousSummary = previous?.summary;
    const hasData = Boolean(summary?.transaction_count);
    const days = range ? daysIn(range) : null;

    const months = useMemo<MonthBar[]>(() => {
        const byMonth = new Map(trend?.by_month.map((row) => [row.month, row]) ?? []);
        const startMonth = range?.start_date.slice(0, 7);
        const endMonth = range?.end_date.slice(0, 7);
        return Array.from({ length: TREND_MONTHS }, (_, index) => {
            const month = monthStart(TREND_MONTHS - 1 - index).slice(0, 7);
            const row = byMonth.get(month);
            return { month, spent: row?.expense ?? 0, received: row?.income ?? 0, selected: Boolean(startMonth && endMonth && month >= startMonth && month <= endMonth) };
        });
    }, [range, trend]);

    const rows = useMemo<RankedRow[]>(() => {
        if (!report) return [];
        const scoped = (overrides: Parameters<typeof transactionHref>[0]) => transactionHref({ ...entryParams(), ...overrides });
        if (breakdown === "accounts") {
            const before = new Map(previous?.by_account.map((row) => [row.account_id, row.amount]) ?? []);
            const top = report.by_account[0]?.amount || 1;
            return report.by_account.map((row) => ({
                key: `${row.account_id}-${row.account_name}`,
                label: row.account_name,
                amount: formatRupees(row.amount),
                share: row.amount / top,
                sub: `${Math.round(row.percentage)}% · ${plural(row.transaction_count, "spend")}`,
                change: previous ? percentChange(row.amount, before.get(row.account_id) ?? 0) : undefined,
                href: row.account_id ? scoped({ type: "expense", account_id: row.account_id }) : undefined,
                leading: <Monogram name={row.account_name} />,
            }));
        }
        const list = breakdown === "categories" ? report.by_category : report.by_merchant;
        const before = new Map((breakdown === "categories" ? previous?.by_category : previous?.by_merchant)?.map((row) => [row.key, row.amount]) ?? []);
        const top = list[0]?.amount || 1;
        return list.slice(0, 12).map((row) => ({
            key: row.key,
            label: row.label,
            amount: formatRupees(row.amount),
            share: row.amount / top,
            sub: `${Math.round(row.percentage)}% · ${plural(row.transaction_count, "spend")}`,
            change: previous ? percentChange(row.amount, before.get(row.key) ?? 0) : undefined,
            href: scoped(breakdown === "categories" ? { type: "expense", category: row.label } : { type: "expense", q: row.label }),
            leading: breakdown === "categories" ? <CategoryTile category={row.label} /> : <Monogram name={row.label} />,
        }));
    }, [breakdown, entryParams, previous, report]);

    const exportReport = () => {
        if (!report) return;
        setExportError("");
        try {
            downloadReportRollupsCSV(report);
            toast({ title: "Report exported", description: "Totals by category, merchant, account, month and type." });
        } catch (requestError) {
            setExportError(apiErrorMessage(requestError, "We couldn’t export this report."));
        }
    };

    const description = range
        ? `${formatDateRange(range.start_date, range.end_date)}${comparison ? ` · compared with ${formatDateRange(comparison.start_date, comparison.end_date)}` : ""}`
        : "All time";

    return (
        <div className="space-y-5 pb-12">
            <PageHeader
                title="Reports"
                description={description}
                actions={<>
                    <PeriodPicker controller={controller} allowAll />
                    <button type="button" onClick={exportReport} disabled={!report || !hasData} className={iconButton} aria-label="Export this report as CSV" title="Export CSV"><Download className="h-[18px] w-[18px]" /></button>
                </>}
            />
            <TransactionFilterPanel controller={controller} accounts={accounts} searchLabel="Search within this report" />
            {exportError && <ErrorNotice message={exportError} />}
            {error && report && <ErrorNotice message={error} onRetry={() => void loadReport()} />}

            {loading && !report ? <PageSkeleton /> : error && !report ? (
                <ErrorNotice message={error} onRetry={() => void loadReport()} />
            ) : report && summary && (
                <>
                    <StatStrip label="Report totals">
                        <Stat label="Spent" value={formatRupees(summary.total_expense)} change={previousSummary ? percentChange(summary.total_expense, previousSummary.total_expense) : undefined} goodWhen="down" detail={plural(summary.expense_count, "spend")} />
                        <Stat label="Received" value={formatRupees(summary.total_income)} change={previousSummary ? percentChange(summary.total_income, previousSummary.total_income) : undefined} goodWhen="up" detail={plural(summary.income_count, "payment")} />
                        <Stat label="Net" value={`${summary.net_cashflow < 0 ? "−" : "+"}${formatRupees(Math.abs(summary.net_cashflow))}`} tone={summary.net_cashflow < 0 ? "negative" : "positive"} detail={summary.net_cashflow < 0 ? "Spent more than received" : "Received more than spent"} />
                        <Stat label="Spent a day" value={days ? formatRupees(summary.total_expense / days) : "—"} change={days && previousSummary && comparison ? percentChange(summary.total_expense / days, previousSummary.total_expense / daysIn(comparison)) : undefined} goodWhen="down" detail={days ? `over ${plural(days, "day")}` : "Pick a period"} />
                    </StatStrip>

                    <section aria-labelledby="trend-heading">
                        <SectionTitle id="trend-heading" title="Last 12 months" detail="Highlighted: the months in this period" />
                        <Panel className="p-4 sm:p-5">{trend ? <MonthBars data={months} /> : <p className="py-10 text-center text-sm text-muted">The 12-month trend didn’t load.</p>}</Panel>
                    </section>

                    <section aria-labelledby="breakdown-heading">
                        <SectionTitle id="breakdown-heading" title="Where it went" action={<Segmented label="Break down by" options={BREAKDOWNS} value={breakdown} onChange={setBreakdown} />} />
                        {!hasData || rows.length === 0 ? <EmptyPanel title="No spending matches this report" body="Try another period, or clear a filter." /> : (
                            <Panel><RankedBars label={`Spending by ${breakdown}`} rows={rows} /></Panel>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
