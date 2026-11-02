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
import CategoryTile from "@/app/components/ui/CategoryTile";
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
                    <div className="drawer-enter font-body flex h-dvh flex-col bg-card">
                        <div className="flex items-center justify-between border-b border-border px-5 py-4">
                            <h3 id="transaction-details-title" className="text-[17px] font-bold">Transaction</h3>
                            <button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-muted hover:bg-track hover:text-foreground" aria-label="Close"><X className="h-5 w-5" /></button>
                        </div>

                        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-6">
                            <div className="flex items-start gap-4">
                                <CategoryTile category={transaction.category} size={48} />
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-display truncate text-2xl font-bold">{transaction.merchant || transaction.title || "Untitled"}</h4>
                                    {transaction.merchant && transaction.title && transaction.title !== transaction.merchant ? <p className="truncate text-sm text-muted">{transaction.title}</p> : null}
                                </div>
                            </div>
                            <p className={cn("font-display text-[40px] font-bold leading-none tabular-nums", transaction.type === "income" && "text-positive")}>{transaction.type === "income" ? "+" : "−"}{formatMoney(transaction.amount)}</p>

                            {reviewStatus === "needs_review" && <p className="flex items-center gap-2 rounded-xl bg-warning-surface px-3 py-2.5 text-sm font-semibold text-warning"><TriangleAlert className="h-4 w-4 shrink-0" /> Needs a category or account. Edit it to fix.</p>}

                            <dl className="divide-y divide-border rounded-2xl border border-border">
                                {[
                                    { label: "Date", value: `${formatDate(transaction.date)}${transactionTime ? ` · ${transactionTime}` : ""}`, icon: Clock },
                                    { label: "Category", value: transaction.category || "Uncategorized", icon: Tag },
                                    { label: "Paid with", value: transaction.account?.name || transaction.mode || "Cash", icon: Wallet },
                                ].map((row) => (
                                    <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                                        <dt className="flex items-center gap-2 text-muted"><row.icon className="h-4 w-4" />{row.label}</dt>
                                        <dd className="truncate font-semibold">{row.value}</dd>
                                    </div>
                                ))}
                                <div className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                                    <dt className="text-muted">Tags</dt>
                                    <dd className="flex flex-wrap justify-end gap-1.5">{transaction.tags?.length ? transaction.tags.map((tag) => <span key={tag} className="rounded-full bg-track px-2.5 py-0.5 text-[13px] font-semibold">#{tag}</span>) : <span className="text-muted">None</span>}</dd>
                                </div>
                            </dl>

                            {transaction.notes ? <div><p className="text-sm font-semibold text-muted">Notes</p><p className="mt-1 whitespace-pre-wrap text-[15px]">{transaction.notes}</p></div> : null}

                            {splitBill?.entry_id === transaction.id && (
                                <div className="flex items-start gap-3 rounded-2xl bg-selected p-4">
                                    <Users className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold">Split with {splitBill.participants.length} {splitBill.participants.length === 1 ? "friend" : "friends"}</p>
                                        <p className="mt-0.5 text-sm text-muted">{splitBill.participants.map((participant) => `${participant.friend.name}: ${formatMoney(participant.share_amount)}`).join(" · ")}</p>
                                        <Link href="/dashboard/splits" onClick={onClose} className="mt-1.5 inline-block text-sm font-bold underline">Open Splits</Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 border-t border-border px-5 py-4">
                            {error && <p role="alert" className="rounded-xl bg-negative/10 p-3 text-sm text-negative">{error}</p>}
                            {onEdit && <button type="button" onClick={handleEdit} disabled={loading || splitLoadState === "loading"} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent text-sm font-bold text-on-accent disabled:opacity-60"><Pencil className="h-4 w-4" /> {splitLoadState === "loading" ? "Loading details…" : "Edit"}</button>}
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setConfirmAction("duplicate")} disabled={loading} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-border text-sm font-bold hover:bg-track disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Duplicate</button>
                                <button type="button" onClick={() => setConfirmAction("delete")} disabled={loading} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-full border border-border text-sm font-bold text-negative hover:bg-negative/10 disabled:opacity-60"><Trash2 className="h-4 w-4" /> Delete</button>
                            </div>
                        </div>
                    </div>
            </Dialog>
            <ConfirmDialog open={confirmAction === "delete"} title={`Delete ${transaction.merchant || transaction.title}?`} description="This permanently removes the financial record. It cannot be undone." confirmLabel="Delete permanently" busy={loading} onClose={() => setConfirmAction(null)} onConfirm={handleDelete} />
            <ConfirmDialog open={confirmAction === "duplicate"} title={`Duplicate ${transaction.merchant || transaction.title}?`} description={`This will create another ${formatMoney(transaction.amount)} record dated today.`} confirmLabel="Create duplicate" destructive={false} busy={loading} onClose={() => setConfirmAction(null)} onConfirm={handleDuplicate} />
        </>
    );
}
