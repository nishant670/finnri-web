"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Loader2, Plus } from "lucide-react";
import AddTransactionModal from "@/app/components/dashboard/AddTransactionModal";
import TransactionDetailsDrawer from "@/app/components/dashboard/TransactionDetailsDrawer";
import { PeriodPicker, TransactionFilterPanel, useTransactionFilters } from "@/app/components/dashboard/TransactionFilters";
import { buttonSecondary, EmptyPanel, ErrorNotice, iconButton, PageHeader, Panel } from "@/app/components/dashboard/kit";
import CategoryTile from "@/app/components/ui/CategoryTile";
import { Account, AccountsAPI, apiErrorMessage, EntriesAPI, ReportsAPI, SplitBill, Transaction, TransactionReportSummary } from "@/app/lib/api";
import { formatDateRange, formatMoney, formatRupees } from "@/app/lib/format";
import { downloadTransactionsCSV } from "@/app/lib/export-transactions";
import { cn } from "@/app/lib/utils";
import Skeleton from "@/app/components/ui/Skeleton";
import { useToast } from "@/app/components/ui/Toast";

type TransactionEditDraft = { transaction: Transaction; splitBill: SplitBill | null; splitDataAvailable: boolean };

const PAGE_SIZE = 25;
const dayHeading = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" });

function dayLabel(date: string) {
    const [y, m, d] = date.split("-").map(Number);
    const value = new Date(y, m - 1, d);
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    if (value.toDateString() === today.toDateString()) return "Today";
    if (value.toDateString() === yesterday.toDateString()) return "Yesterday";
    return dayHeading.format(value);
}

type DayGroup = { date: string; rows: Transaction[]; spent: number; received: number; complete: boolean };

/**
 * A page of rows under day headings. A day's total is only shown when the
 * whole day is on this page: the first day may have begun on the page before,
 * and the last may carry on to the next.
 */
function groupByDay(rows: Transaction[], page: number, totalPages: number): DayGroup[] {
    const groups: DayGroup[] = [];
    for (const row of rows) {
        let group = groups.at(-1);
        if (!group || group.date !== row.date) {
            group = { date: row.date, rows: [], spent: 0, received: 0, complete: true };
            groups.push(group);
        }
        group.rows.push(row);
        if (row.type === "income") group.received += row.amount;
        else group.spent += row.amount;
    }
    if (groups.length && page > 1) groups[0].complete = false;
    if (groups.length && page < totalPages) groups[groups.length - 1].complete = false;
    return groups;
}

function TransactionRow({ transaction, onOpen }: { transaction: Transaction; onOpen: () => void }) {
    const income = transaction.type === "income";
    return (
        <button type="button" onClick={onOpen} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-track sm:px-5 lg:grid-cols-[36px_minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_8rem] lg:gap-4">
            <CategoryTile category={transaction.category} />
            <span className="min-w-0">
                <span className="block truncate text-[15px] font-semibold">{transaction.merchant || transaction.title}</span>
                <span className="block truncate text-[13px] text-muted lg:hidden">{transaction.category} · {transaction.account?.name || transaction.mode}</span>
                {transaction.merchant && transaction.title && transaction.title !== transaction.merchant ? <span className="hidden truncate text-[13px] text-muted lg:block">{transaction.title}</span> : null}
            </span>
            <span className="hidden truncate text-sm lg:block">{transaction.category}</span>
            <span className="hidden truncate text-sm text-muted lg:block">{transaction.account?.name || transaction.mode}</span>
            <span className={cn("shrink-0 text-right text-[15px] font-bold tabular-nums", income && "text-positive")}>{income ? "+" : "−"}{formatMoney(transaction.amount)}</span>
        </button>
    );
}

export default function TransactionsScreen() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const entryIDParam = searchParams.get("entry_id");
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [error, setError] = useState("");
    const [exportError, setExportError] = useState("");
    const [isExporting, setIsExporting] = useState(false);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState<TransactionReportSummary | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [editing, setEditing] = useState<TransactionEditDraft | null>(null);
    const filterController = useTransactionFilters("30d");
    const { filters, entryParams, amountError, dateError, update, range } = filterController;

    useEffect(() => { AccountsAPI.list().then((response) => setAccounts(response.data)).catch(() => setAccounts([])); }, []);
    const loadTransactions = useCallback(async () => {
        setLoading(true); setError("");
        if (amountError || dateError) { setError(amountError || dateError); setLoading(false); setHasLoaded(true); return; }
        try {
            const [response, report] = await Promise.all([
                EntriesAPI.list(entryParams(true)),
                ReportsAPI.transactionSummary(entryParams()).catch(() => null),
            ]);
            setTransactions(response.data.entries); setTotalPages(Math.max(1, response.data.total_pages)); setTotal(response.data.total);
            setSummary(report ? report.data.summary : null);
        } catch (requestError) { setError(apiErrorMessage(requestError, "We couldn’t load your transactions.")); }
        finally { setLoading(false); setHasLoaded(true); }
    }, [amountError, dateError, entryParams]);
    useEffect(() => { const timer = window.setTimeout(() => void loadTransactions(), 250); return () => window.clearTimeout(timer); }, [loadTransactions]);
    useEffect(() => {
        if (!entryIDParam || !/^\d+$/.test(entryIDParam)) return;
        let active = true;
        EntriesAPI.get(Number(entryIDParam))
            .then((response) => { if (active) setSelectedTransaction(response.data); })
            .catch((requestError) => {
                if (active) toast({
                    title: "Transaction unavailable",
                    description: apiErrorMessage(requestError, "This notification’s transaction could not be opened."),
                });
            });
        return () => { active = false; };
    }, [entryIDParam, toast]);

    const exportCurrentView = async () => {
        setExportError(""); setIsExporting(true);
        try { await downloadTransactionsCSV(entryParams(false)); toast({ title: `${total.toLocaleString("en-IN")} transaction${total === 1 ? "" : "s"} exported` }); }
        catch (requestError) { setExportError(apiErrorMessage(requestError, "We couldn’t export your transactions.")); }
        finally { setIsExporting(false); }
    };
    const closeModal = () => { setIsModalOpen(false); setEditing(null); };
    const closeSelectedTransaction = () => {
        setSelectedTransaction(null);
        if (!entryIDParam) return;
        const next = new URLSearchParams(searchParams.toString());
        next.delete("entry_id");
        router.replace(next.size ? `/dashboard/transactions?${next.toString()}` : "/dashboard/transactions");
    };
    const handleSaved = async (saved: Transaction) => { setTransactions((current) => current.map((item) => item.id === saved.id ? saved : item)); await loadTransactions(); if (editing) setSelectedTransaction(saved); };

    const days = useMemo(() => groupByDay(transactions, filters.page, totalPages), [transactions, filters.page, totalPages]);
    const first = total ? (filters.page - 1) * PAGE_SIZE + 1 : 0;
    const last = Math.min(filters.page * PAGE_SIZE, total);
    const pager = (
        <span className="flex items-center gap-2">
            <span className="text-[13px] tabular-nums text-muted">{first}–{last} of {total.toLocaleString("en-IN")}</span>
            <button type="button" disabled={filters.page <= 1 || loading} onClick={() => update({ page: filters.page - 1 })} className={cn(iconButton, "h-9 w-9")} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button>
            <button type="button" disabled={filters.page >= totalPages || loading} onClick={() => update({ page: filters.page + 1 })} className={cn(iconButton, "h-9 w-9")} aria-label="Next page"><ChevronRight className="h-4 w-4" /></button>
        </span>
    );

    return <>
        <div className="space-y-5 pb-12">
            <PageHeader
                title="Transactions"
                description={range ? formatDateRange(range.start_date, range.end_date) : "All time"}
                actions={<>
                    <PeriodPicker controller={filterController} allowAll />
                    <button type="button" onClick={() => void exportCurrentView()} disabled={isExporting || !total} className={iconButton} aria-label={isExporting ? "Exporting" : "Export these transactions as CSV"} title="Export CSV">{isExporting ? <Loader2 className="h-[18px] w-[18px] animate-spin" /> : <Download className="h-[18px] w-[18px]" />}</button>
                    <button type="button" onClick={() => { setEditing(null); setIsModalOpen(true); }} className={buttonSecondary}><Plus className="h-4 w-4" /> Add</button>
                </>}
            />
            <TransactionFilterPanel controller={filterController} accounts={accounts} searchLabel="Search transactions" searchInHeader />
            {exportError && <ErrorNotice message={exportError} />}
            {error && <ErrorNotice message={error} onRetry={() => void loadTransactions()} />}

            {hasLoaded && total > 0 && (
                <section aria-label="Totals for these transactions" className="flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-2xl bg-track px-5 py-3.5 text-[15px]">
                    <span><span className="font-bold tabular-nums">{total.toLocaleString("en-IN")}</span> <span className="text-muted">transaction{total === 1 ? "" : "s"}</span></span>
                    {summary && <>
                        <span><span className="text-muted">Spent </span><span className="font-bold tabular-nums">{formatRupees(summary.total_expense)}</span></span>
                        <span><span className="text-muted">Received </span><span className="font-bold tabular-nums text-positive">{formatRupees(summary.total_income)}</span></span>
                        <span><span className="text-muted">Net </span><span className={cn("font-bold tabular-nums", summary.net_cashflow < 0 ? "text-negative" : "text-positive")}>{summary.net_cashflow < 0 ? "−" : "+"}{formatRupees(Math.abs(summary.net_cashflow))}</span></span>
                    </>}
                </section>
            )}

            {!hasLoaded ? (
                <Panel className="space-y-3 p-4">{[0, 1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-14" />)}</Panel>
            ) : transactions.length === 0 ? (
                <EmptyPanel title="No transactions match" body="Try another period, or clear a filter." />
            ) : (
                <div className={cn("space-y-4 transition-opacity", loading && "opacity-60")} aria-busy={loading}>
                    {days.map((day) => (
                        <section key={day.date} aria-label={dayLabel(day.date)}>
                            <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
                                <h2 className="text-sm font-bold">{dayLabel(day.date)}</h2>
                                {day.complete && <p className="text-[13px] tabular-nums text-muted">{day.spent > 0 ? `Spent ${formatMoney(day.spent)}` : ""}{day.spent > 0 && day.received > 0 ? " · " : ""}{day.received > 0 ? `Received ${formatMoney(day.received)}` : ""}</p>}
                            </div>
                            <Panel className="divide-y divide-border overflow-hidden">
                                {day.rows.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} onOpen={() => setSelectedTransaction(transaction)} />)}
                            </Panel>
                        </section>
                    ))}
                    {totalPages > 1 && <div className="flex justify-end">{pager}</div>}
                </div>
            )}
        </div>
        <AddTransactionModal isOpen={isModalOpen} onClose={closeModal} transaction={editing?.transaction} linkedSplitBill={editing?.splitBill} splitDataAvailable={editing?.splitDataAvailable} onSaved={handleSaved} />
        <TransactionDetailsDrawer isOpen={Boolean(selectedTransaction) && !isModalOpen} transaction={selectedTransaction} onEdit={(transaction, splitBill, splitDataAvailable) => { setEditing({ transaction, splitBill, splitDataAvailable }); setIsModalOpen(true); }} onClose={closeSelectedTransaction} onChanged={() => { void loadTransactions(); }} />
    </>;
}
