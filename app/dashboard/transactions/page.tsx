"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, CircleAlert, Download, Loader2, Plus } from "lucide-react";
import AddTransactionModal from "@/app/components/dashboard/AddTransactionModal";
import TransactionDetailsDrawer from "@/app/components/dashboard/TransactionDetailsDrawer";
import { TransactionFilterPanel, useTransactionFilters } from "@/app/components/dashboard/TransactionFilters";
import { Account, AccountsAPI, apiErrorMessage, EntriesAPI, SplitBill, Transaction } from "@/app/lib/api";
import { formatDate, formatMoney } from "@/app/lib/format";
import { downloadTransactionsCSV } from "@/app/lib/export-transactions";
import { cn } from "@/app/lib/utils";
import Skeleton from "@/app/components/ui/Skeleton";
import { useToast } from "@/app/components/ui/Toast";

type TransactionEditDraft = { transaction: Transaction; splitBill: SplitBill | null; splitDataAvailable: boolean };

function TransactionCard({ transaction, onOpen }: { transaction: Transaction; onOpen: () => void }) {
    return <button type="button" onClick={onOpen} className="w-full rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-accent/40">
        <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="truncate text-sm font-bold">{transaction.merchant || transaction.title}</p><p className="mt-1 text-xs text-text-muted">{formatDate(transaction.date)} · {transaction.category}</p></div><p className={cn("shrink-0 text-sm font-bold", transaction.type === "income" && "text-emerald-600")}>{transaction.type === "income" ? "+" : "−"}{formatMoney(transaction.amount)}</p></div>
        <p className="mt-3 text-xs text-zinc-400">{transaction.account?.name || transaction.mode}</p>
    </button>;
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [editing, setEditing] = useState<TransactionEditDraft | null>(null);
    const filterController = useTransactionFilters("30d");
    const { filters, entryParams, amountError, dateError, update } = filterController;

    useEffect(() => { AccountsAPI.list().then((response) => setAccounts(response.data)).catch(() => setAccounts([])); }, []);
    const loadTransactions = useCallback(async () => {
        setLoading(true); setError("");
        if (amountError || dateError) { setError(amountError || dateError); setLoading(false); setHasLoaded(true); return; }
        try {
            const response = await EntriesAPI.list(entryParams(true));
            setTransactions(response.data.entries); setTotalPages(Math.max(1, response.data.total_pages)); setTotal(response.data.total);
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

    return <>
        <div className="space-y-6 pb-12">
            <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Confirmed records</p><h1 className="mt-2 text-3xl font-bold tracking-tight font-rounded sm:text-4xl">Transactions</h1><p className="mt-2 text-sm text-zinc-500">Search, filter, inspect, add, edit, duplicate, or delete real entries.</p></div><div className="flex gap-3"><button onClick={() => void exportCurrentView()} disabled={isExporting} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-zinc-600 disabled:opacity-40 dark:text-zinc-300">{isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Export CSV</button><button onClick={() => { setEditing(null); setIsModalOpen(true); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-zinc-950 shadow-lg shadow-accent/20"><Plus className="h-4 w-4" /> Add</button></div></header>
            <TransactionFilterPanel controller={filterController} accounts={accounts} searchLabel="Search transactions" />
            {exportError && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><p>{exportError}</p></div>}
            {error && <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div><p>{error}</p><button onClick={() => void loadTransactions()} className="mt-2 font-bold underline">Try again</button></div></div>}
            <section className="overflow-hidden rounded-panel border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6"><p className="text-sm font-bold">{total.toLocaleString("en-IN")} matching records</p><p className="text-xs text-zinc-400">Page {filters.page} of {totalPages}</p></div>
                {!hasLoaded ? <div className="space-y-3 p-4">{[0,1,2,3,4].map((item) => <Skeleton key={item} className="h-16" />)}</div> : transactions.length === 0 ? <p className="grid h-64 place-items-center text-sm text-zinc-400">No transactions match these filters.</p> : <>
                    <div className={cn("space-y-3 p-4 transition-opacity md:hidden", loading && "opacity-60")} aria-busy={loading}>{transactions.map((transaction) => <TransactionCard key={transaction.id} transaction={transaction} onOpen={() => setSelectedTransaction(transaction)} />)}</div>
                    <div className={cn("hidden transition-opacity md:block", loading && "opacity-60")} aria-busy={loading}><table className="w-full text-left"><thead className="bg-zinc-50 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-300"><tr><th className="px-6 py-4">Date</th><th className="px-6 py-4">Merchant</th><th className="px-6 py-4">Category</th><th className="px-6 py-4">Account</th><th className="px-6 py-4 text-right">Amount</th></tr></thead><tbody className="divide-y divide-border">{transactions.map((transaction) => <tr key={transaction.id} tabIndex={0} role="button" aria-label={`Open ${transaction.merchant || transaction.title}, ${formatMoney(transaction.amount)}`} onClick={() => setSelectedTransaction(transaction)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedTransaction(transaction); } }} className="cursor-pointer transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"><td className="px-6 py-4 text-sm text-zinc-500">{formatDate(transaction.date)}</td><td className="px-6 py-4"><p className="text-sm font-bold">{transaction.merchant || transaction.title}</p><p className="mt-0.5 text-xs capitalize text-zinc-400">{transaction.type}</p></td><td className="px-6 py-4 text-sm text-zinc-500">{transaction.category}</td><td className="px-6 py-4 text-sm text-zinc-500">{transaction.account?.name || transaction.mode}</td><td className={cn("px-6 py-4 text-right text-sm font-bold", transaction.type === "income" && "text-emerald-600")}>{transaction.type === "income" ? "+" : "−"}{formatMoney(transaction.amount)}</td></tr>)}</tbody></table></div>
                </>}
                <div className="flex items-center justify-end gap-2 border-t border-border p-4"><button disabled={filters.page <= 1 || loading} onClick={() => update({ page: filters.page - 1 })} className="grid h-10 w-10 place-items-center rounded-xl border border-border disabled:opacity-30" aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></button><button disabled={filters.page >= totalPages || loading} onClick={() => update({ page: filters.page + 1 })} className="grid h-10 w-10 place-items-center rounded-xl border border-border disabled:opacity-30" aria-label="Next page"><ChevronRight className="h-4 w-4" /></button></div>
            </section>
        </div>
        <AddTransactionModal isOpen={isModalOpen} onClose={closeModal} transaction={editing?.transaction} linkedSplitBill={editing?.splitBill} splitDataAvailable={editing?.splitDataAvailable} onSaved={handleSaved} />
        <TransactionDetailsDrawer isOpen={Boolean(selectedTransaction) && !isModalOpen} transaction={selectedTransaction} onEdit={(transaction, splitBill, splitDataAvailable) => { setEditing({ transaction, splitBill, splitDataAvailable }); setIsModalOpen(true); }} onClose={closeSelectedTransaction} onChanged={() => { void loadTransactions(); }} />
    </>;
}
