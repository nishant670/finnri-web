"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
    X,
    Trash2,
    Tag,
    Wallet,
    Clock,
    TriangleAlert,
    Copy,
    Loader2,
    Users,
    Pencil,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { apiErrorMessage, EntriesAPI, SplitAPI, SplitBill, Transaction } from "@/app/lib/api";
import { formatDate, formatMoney, formatTime, toLocalISO } from "@/app/lib/format";
import Dialog from "@/app/components/ui/Dialog";
import ConfirmDialog from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/Toast";

interface TransactionDetailsDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onChanged?: () => void;
    transaction: Transaction | null;
    reviewStatus?: "needs_review";
    onEdit?: (transaction: Transaction, splitBill: SplitBill | null, splitDataAvailable: boolean) => void;
}

export default function TransactionDetailsDrawer({ isOpen, onClose, onChanged, transaction, reviewStatus, onEdit }: TransactionDetailsDrawerProps) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [confirmAction, setConfirmAction] = useState<"delete" | "duplicate" | null>(null);
    const [error, setError] = useState("");
    const [splitResult, setSplitResult] = useState<{ entryID: number; bill: SplitBill | null; available: boolean } | null>(null);

    useEffect(() => {
        let active = true;
        if (!isOpen || !transaction) return;
        SplitAPI.getBillForEntry(transaction.id).then((response) => {
            if (active) setSplitResult({ entryID: transaction.id, bill: response.data, available: true });
        }).catch(() => {
            if (active) setSplitResult({ entryID: transaction.id, bill: null, available: false });
        });
        return () => { active = false; };
    }, [isOpen, transaction]);

    if (!transaction) return null;
    const splitMatchesTransaction = splitResult?.entryID === transaction.id;
    const splitBill = splitMatchesTransaction ? splitResult.bill : null;
    const splitLoadState = !splitMatchesTransaction ? "loading" : splitResult.available ? "loaded" : "unavailable";
    const transactionTime = formatTime(transaction.time);

    const handleEdit = () => onEdit?.(transaction, splitBill, splitLoadState === "loaded");

    const handleDelete = async () => {
        setLoading(true);
        setError("");
        try {
            await EntriesAPI.delete(transaction.id);
            toast({ title: `${transaction.merchant || transaction.title} deleted` });
            onChanged?.();
            onClose();
        } catch (err) {
            setError(apiErrorMessage(err, "Failed to delete transaction."));
        } finally {
            // The drawer stays mounted after a successful delete or duplicate,
            // so the flag has to clear on every path. Leaving it set on success
            // disabled Edit, Duplicate and Delete on the next entry opened.
            setLoading(false);
            setConfirmAction(null);
        }
    };

    const handleDuplicate = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await EntriesAPI.create({
                title: transaction.title,
                merchant: transaction.merchant,
                amount: transaction.amount,
                currency: "INR",
                type: transaction.type,
                source: "manual",
                // Duplication preserves the stored record exactly, including
                // title, merchant, and mode. New manual entries omit mode and
                // let account_id carry the truth.
                mode: transaction.mode,
                category: transaction.category,
                date: toLocalISO(),
                time: transaction.time,
                tags: transaction.tags,
                notes: transaction.notes,
                account_id: transaction.account_id,
            });
            toast({ title: `${response.data.merchant || response.data.title} duplicated` });
            onChanged?.();
            onClose();
        } catch (err) {
            setError(apiErrorMessage(err, "Failed to duplicate transaction."));
        } finally {
            // The drawer stays mounted after a successful delete or duplicate,
            // so the flag has to clear on every path. Leaving it set on success
            // disabled Edit, Duplicate and Delete on the next entry opened.
            setLoading(false);
            setConfirmAction(null);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onClose={onClose} labelledBy="transaction-details-title" className="justify-end p-0" panelClassName="h-dvh max-w-md rounded-none border-y-0 border-r-0">
                    <div className="drawer-enter flex h-dvh flex-col bg-card">
                        {/* Drawer Header */}
                        <div className="p-8 border-b border-border flex items-center justify-between">
                            <h3 id="transaction-details-title" className="text-xl font-bold font-rounded">Transaction Details</h3>
                            <div className="flex items-center gap-2">
                                <button onClick={onClose} className="p-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl transition-all"><X className="w-5 h-5" /></button>
                            </div>
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-10">
                            {/* Hero Detail */}
                            <div className="text-center space-y-4">
                                <div className="w-20 h-20 bg-accent/10 rounded-panel flex items-center justify-center text-accent mx-auto shadow-sm">
                                    {transaction.merchant ? transaction.merchant[0] : (transaction.title?.[0] || <Wallet className="w-8 h-8" />)}
                                </div>
                                <div>
                                    <h4 className="text-2xl font-bold font-rounded">{transaction.merchant || transaction.title || "Untitled"}</h4>
                                    <p className="text-sm text-zinc-400 font-medium">{transaction.category}</p>
                                </div>
                                <h5 className={cn("text-4xl font-bold font-rounded", transaction.type === "income" ? "text-green-500" : "dark:text-white")}>
                                    {formatMoney(transaction.amount)}
                                </h5>
                            </div>

                            {/* Meta Grid */}
                            <div className="grid grid-cols-1 gap-6">
                                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-3xl space-y-4">
                                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-400">
                                        <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Timeline</span>
                                        <span className="text-zinc-900 dark:text-white">{formatDate(transaction.date)}{transactionTime ? ` · ${transactionTime}` : ""}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-zinc-400">
                                        <span className="flex items-center gap-2"><Wallet className="w-3.5 h-3.5" /> Account</span>
                                        <span className="text-zinc-900 dark:text-white">{transaction.account?.name || transaction.mode || "Cash"}</span>
                                    </div>
                                    {reviewStatus === "needs_review" && <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-amber-600 dark:text-amber-300">
                                        <span className="flex items-center gap-2"><TriangleAlert className="w-3.5 h-3.5" /> Review</span>
                                        <span>Correction required</span>
                                    </div>}
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between ml-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Attached Tags</label>
                                        {onEdit && <button onClick={handleEdit} disabled={splitLoadState === "loading"} className="text-[10px] font-bold uppercase tracking-widest text-accent hover:underline disabled:opacity-40">Manage</button>}
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {transaction.tags?.map((tag: string, i: number) => (
                                            <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-border text-xs font-bold rounded-xl shadow-sm">
                                                <Tag className="w-3 h-3 text-zinc-400" /> {tag}
                                            </span>
                                        ))}
                                        {(!transaction.tags || transaction.tags.length === 0) && <span className="text-xs text-zinc-400 px-3">No tags</span>}
                                    </div>
                                </div>

                                {splitBill?.entry_id === transaction.id && <div className="rounded-3xl border border-accent/20 bg-accent/5 p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent"><Users className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wider text-accent">Shared expense</p><p className="mt-1 text-sm font-bold">{splitBill.participants.length} friend share{splitBill.participants.length === 1 ? "" : "s"}</p><p className="mt-2 text-xs leading-5 text-zinc-500">{splitBill.participants.map((participant) => `${participant.friend.name}: ${formatMoney(participant.share_amount)}`).join(" · ")}</p><Link href="/dashboard/splits" onClick={onClose} className="mt-3 inline-block text-xs font-bold text-accent underline">Open split ledger</Link></div></div></div>}
                            </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="p-8 border-t border-border bg-zinc-50 dark:bg-zinc-800/50 space-y-3">
                            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
                            {onEdit && <button
                                onClick={handleEdit}
                                disabled={loading || splitLoadState === "loading"}
                                className="w-full flex items-center justify-center gap-3 bg-accent text-zinc-950 py-4 rounded-2xl font-bold text-sm shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70"
                            >
                                <Pencil className="w-4 h-4" /> {splitLoadState === "loading" ? "Loading details…" : "Edit Transaction"}
                            </button>}
                            <button
                                onClick={() => setConfirmAction("duplicate")}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white py-4 rounded-2xl font-bold text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70"
                            >
                                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <><Copy className="w-4 h-4" /> Duplicate Transaction</>}
                            </button>
                            <button
                                onClick={() => setConfirmAction("delete")}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 border border-red-500/20 text-red-500 py-4 rounded-2xl font-bold text-sm hover:bg-red-500/5 transition-all disabled:opacity-70"
                            >
                                <Trash2 className="w-4 h-4" /> Delete Permanently
                            </button>
                        </div>
                    </div>
            </Dialog>
            <ConfirmDialog open={confirmAction === "delete"} title={`Delete ${transaction.merchant || transaction.title}?`} description="This permanently removes the financial record. It cannot be undone." confirmLabel="Delete permanently" busy={loading} onClose={() => setConfirmAction(null)} onConfirm={handleDelete} />
            <ConfirmDialog open={confirmAction === "duplicate"} title={`Duplicate ${transaction.merchant || transaction.title}?`} description={`This will create another ${formatMoney(transaction.amount)} record dated today.`} confirmLabel="Create duplicate" destructive={false} busy={loading} onClose={() => setConfirmAction(null)} onConfirm={handleDuplicate} />
        </>
    );
}
