"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    Banknote,
    ArrowUpRight,
    Building2,
    CircleAlert,
    CreditCard,
    Loader2,
    Pencil,
    Plus,
    ShieldCheck,
    Smartphone,
    Star,
    Trash2,
    WalletCards,
    X,
} from "lucide-react";
import { Account, AccountInput, AccountsAPI, apiErrorMessage } from "@/app/lib/api";
import { ACCOUNT_TYPES, creditCardPosition } from "@/app/lib/accounts";
import { formatDate, formatMoney, toLocalISO } from "@/app/lib/format";
import { transactionHref } from "@/app/lib/transaction-links";
import { cn } from "@/app/lib/utils";
import Dialog from "@/app/components/ui/Dialog";
import ConfirmDialog from "@/app/components/ui/ConfirmDialog";
import FormDisclosure from "@/app/components/ui/FormDisclosure";
import { accountDetailsSummary } from "@/app/lib/form-summaries";
import { useToast } from "@/app/components/ui/Toast";
import { PageSkeleton } from "@/app/components/ui/Skeleton";

const emptyForm: AccountInput = { type: "cash", name: "", color: "#FF8865", provider: "", identifier: "", credit_limit: 0, due_day: 0, fee_month: "", balance: 0, is_default: false };

function accountIcon(type: Account["type"]) {
    if (type === "cash") return Banknote;
    if (type === "upi") return Smartphone;
    if (type === "bank") return Building2;
    if (type === "credit_card" || type === "debit_card") return CreditCard;
    return WalletCards;
}

function accountLabel(type: Account["type"]) {
    return ACCOUNT_TYPES.find((item) => item.value === type)?.label || "Account";
}

const NAME_PLACEHOLDERS: Record<Account["type"], string> = {
    cash: "Cash in hand",
    upi: "GPay, PhonePe…",
    bank: "Salary account",
    credit_card: "HDFC Regalia",
    debit_card: "SBI debit card",
    wallet: "Paytm wallet",
    other: "Office card",
};

const fieldClass = "w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-accent/10 dark:bg-zinc-800";
const labelClass = "text-xs font-bold text-zinc-500";

function AccountDialog({ account, onClose, onSaved }: { account: Account | null; onClose: () => void; onSaved: () => void }) {
    const { toast } = useToast();
    const [form, setForm] = useState<AccountInput>(account ? {
        type: account.type, name: account.name, color: account.color || "#FF8865", provider: account.provider,
        identifier: account.identifier, credit_limit: account.credit_limit, due_day: account.due_day,
        fee_month: account.fee_month, balance: account.balance, is_default: account.is_default,
    } : emptyForm);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [showDetails, setShowDetails] = useState(false);
    const isCard = form.type === "credit_card";

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true); setError("");
        try {
            if (account) await AccountsAPI.update(account.id, form);
            else await AccountsAPI.create(form);
            toast({ title: account ? `${form.name} updated` : `${form.name} added` });
            onSaved();
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t save this account. Check your connection and try again."));
        } finally { setSaving(false); }
    };

    return (
        <Dialog open onClose={onClose} labelledBy="account-dialog-title" panelClassName="max-h-[calc(100dvh-2rem)] max-w-2xl">
            <form onSubmit={submit}>
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-white/95 p-6 backdrop-blur dark:bg-zinc-900/95"><div><h2 id="account-dialog-title" className="text-xl font-bold font-rounded">{account ? "Edit account" : "Add an account"}</h2><p className="mt-1 text-xs text-zinc-500">A type and a name are all it needs. Finnri never connects to your bank.</p></div><button type="button" onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close"><X className="h-5 w-5" /></button></div>
                <div className="space-y-5 p-6">
                    {/* The type as one tap rather than a dropdown: seven short
                        options read faster laid out than hidden in a select. */}
                    <div className="space-y-2">
                        <span id="account-type-label" className={labelClass}>Type</span>
                        <div role="radiogroup" aria-labelledby="account-type-label" className="flex flex-wrap gap-2">
                            {ACCOUNT_TYPES.map((option) => {
                                const Icon = accountIcon(option.value);
                                const selected = form.type === option.value;
                                return <button key={option.value} type="button" role="radio" aria-checked={selected} onClick={() => setForm({ ...form, type: option.value, ...(option.value === "credit_card" ? {} : { credit_limit: 0, due_day: 0, fee_month: "" }) })} className={cn("inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-xs font-bold transition-colors", selected ? "border-accent bg-accent/10 text-accent" : "border-border text-zinc-600 hover:border-accent dark:text-zinc-300")}><Icon className="h-4 w-4" aria-hidden />{option.label}</button>;
                            })}
                        </div>
                    </div>
                    <label className="block space-y-2"><span className={labelClass}>Name</span><input required autoFocus={!account} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder={`e.g. ${NAME_PLACEHOLDERS[form.type]}`} className={fieldClass} /></label>
                    {/* What a card is for: the limit and the due date behind
                        reminders. They stay out in the open; the rest folds. */}
                    {isCard && <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2"><span className={labelClass}>Credit limit</span><span className="relative block"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">₹</span><input type="number" inputMode="decimal" min="0" step="0.01" value={form.credit_limit || ""} onChange={(event) => setForm({ ...form, credit_limit: Number(event.target.value) })} placeholder="1,00,000" className={cn(fieldClass, "pl-8")} /></span></label>
                        <label className="space-y-2"><span className={labelClass}>Bill due on</span><select value={form.due_day || ""} onChange={(event) => setForm({ ...form, due_day: Number(event.target.value) })} className={fieldClass}><option value="">Day of the month</option>{Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}</option>)}</select></label>
                    </div>}
                    <FormDisclosure label="More details" summary={accountDetailsSummary({ type: form.type, provider: form.provider, identifier: form.identifier, balance: form.balance, isDefault: form.is_default, formatMoney })} open={showDetails} onToggle={() => setShowDetails((open) => !open)}>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <label className="space-y-2"><span className={labelClass}>{form.type === "upi" ? "UPI app" : form.type === "wallet" ? "Wallet" : "Bank"}</span><input value={form.provider} onChange={(event) => setForm({ ...form, provider: event.target.value })} placeholder={form.type === "upi" ? "GPay, PhonePe, Paytm" : form.type === "wallet" ? "Paytm, Amazon Pay" : "HDFC, SBI, ICICI"} className={fieldClass} /></label>
                            <label className="space-y-2"><span className={labelClass}>{form.type === "upi" ? "UPI ID" : "Last 4 digits"}</span><input value={form.identifier} onChange={(event) => setForm({ ...form, identifier: event.target.value })} placeholder={form.type === "upi" ? "name@bank" : "1234"} className={fieldClass} /></label>
                            <label className="space-y-2"><span className={labelClass}>{isCard ? "Owed when you started" : "Opening balance"}</span><span className="relative block"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">₹</span><input type="number" step="0.01" value={form.balance || ""} onChange={(event) => setForm({ ...form, balance: Number(event.target.value) })} placeholder="0" className={cn(fieldClass, "pl-8")} /></span><span className="block text-[11px] text-zinc-400">{isCard ? "What you already owed before your first entry here." : "What it held before your first entry here."}</span></label>
                            <label className="space-y-2"><span className={labelClass}>Colour</span><span className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-zinc-50 px-3 dark:bg-zinc-800"><input type="color" value={form.color || "#FF8865"} onChange={(event) => setForm({ ...form, color: event.target.value })} aria-label="Account colour" className="h-8 w-12 cursor-pointer rounded border-0 bg-transparent" /><span className="text-xs font-semibold text-zinc-500">Helps you spot it in lists</span></span></label>
                            {isCard && <label className="space-y-2"><span className={labelClass}>Annual fee month</span><input type="month" value={form.fee_month} onChange={(event) => setForm({ ...form, fee_month: event.target.value })} className={fieldClass} /></label>}
                        </div>
                        <label className="flex items-center gap-3 rounded-xl border border-border p-4"><input type="checkbox" checked={form.is_default} disabled={account?.is_default} onChange={(event) => setForm({ ...form, is_default: event.target.checked })} className="h-4 w-4 accent-[#FF8865]" /><span><span className="block text-sm font-bold">Make this my default</span><span className="block text-xs text-zinc-500">It’s picked first when you add a transaction.</span></span></label>
                    </FormDisclosure>
                    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{error}</p>}
                </div>
                <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-white/95 p-5 backdrop-blur dark:bg-zinc-900/95"><button type="button" onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-bold text-zinc-500">Cancel</button><button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-zinc-950 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{account ? "Save changes" : "Add account"}</button></div>
            </form>
        </Dialog>
    );
}

export default function AccountsScreen() {
    const { toast } = useToast();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingAccount, setEditingAccount] = useState<Account | null | undefined>(undefined);
    const [deleteTarget, setDeleteTarget] = useState<Account | null>(null);

    const loadAccounts = useCallback(async () => {
        setLoading(true); setError("");
        try {
            const response = await AccountsAPI.list(Intl.DateTimeFormat().resolvedOptions().timeZone);
            setAccounts(response.data.map((account) => ({ ...account, summary: account.summary ? { ...account.summary, last_activity_date: account.summary.last_activity_date ? formatDate(account.summary.last_activity_date) : undefined } : undefined })));
        }
        catch (requestError) { setError(apiErrorMessage(requestError, "We couldn’t load your accounts.")); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { void loadAccounts(); }, [loadAccounts]);

    const deleteAccount = async (account: Account, confirmed = false) => {
        if (!confirmed) { setDeleteTarget(account); return; }
        try { await AccountsAPI.delete(account.id); toast({ title: `${account.name} deleted` }); setDeleteTarget(null); await loadAccounts(); }
        catch (requestError) { setError(apiErrorMessage(requestError, "We couldn’t delete this account.")); }
    };

    const monthRange = useMemo(() => {
        const start = new Date();
        start.setDate(1);
        return { start_date: toLocalISO(start), end_date: toLocalISO() };
    }, []);
    const assetAccounts = accounts.filter((account) => account.type !== "credit_card");
    const cardAccounts = accounts.filter((account) => account.type === "credit_card");
    const knownAssetBalance = assetAccounts.reduce((sum, account) => sum + (account.summary?.running_balance ?? (account.summary?.entries_total ? 0 : account.balance)), 0);
    const assetAccountsWithoutBaseline = assetAccounts.filter((account) => account.summary?.entries_total && account.summary.running_balance === undefined).length;
    const cardBalancesOwed = cardAccounts.reduce((sum, account) => sum + creditCardPosition(account.summary?.outstanding ?? account.balance).owedAmount, 0);

    return (
        <>
            <div className="space-y-7 pb-12">
                <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Accounts</p><h1 className="mt-2 text-3xl font-bold tracking-tight font-rounded sm:text-4xl">Where your money lives.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Link each transaction to the cash, card or account it came from. Balances move with what you log — Finnri never connects to your bank.</p></div><button onClick={() => setEditingAccount(null)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-6 text-sm font-bold text-zinc-950 shadow-lg shadow-accent/20"><Plus className="h-5 w-5" /> Add account</button></header>

                <section className="grid gap-4 md:grid-cols-3"><article className="rounded-panel bg-zinc-950 p-6 text-white"><p className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Cash & bank</p><p className="mt-3 text-3xl font-bold font-rounded">{formatMoney(knownAssetBalance)}</p><p className="mt-3 text-xs leading-5 text-zinc-400">Across {assetAccounts.length} account{assetAccounts.length === 1 ? "" : "s"}.{assetAccountsWithoutBaseline ? ` ${assetAccountsWithoutBaseline} without an opening balance ${assetAccountsWithoutBaseline === 1 ? "isn’t" : "aren’t"} counted yet.` : ""}</p></article><article className="rounded-panel border border-border bg-white p-6 dark:bg-zinc-900"><CreditCard className="h-5 w-5 text-rose-500" /><p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Card balances owed</p><p className="mt-2 text-3xl font-bold font-rounded">{formatMoney(cardBalancesOwed)}</p><p className="mt-2 text-xs text-zinc-400">Across {cardAccounts.length} credit card{cardAccounts.length === 1 ? "" : "s"}, kept apart from what you have.</p></article><article className="rounded-panel border border-border bg-white p-6 dark:bg-zinc-900"><ShieldCheck className="h-6 w-6 text-accent" /><h2 className="mt-4 font-bold">Private by design</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Finnri never connects to your bank. Everything here comes from what you log.</p></article></section>

                {error && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><div className="flex-1"><p>{error}</p><button onClick={() => void loadAccounts()} className="mt-2 font-bold underline">Try again</button></div></div>}

                {loading && accounts.length === 0 ? <PageSkeleton /> : accounts.length === 0 ? <div className="rounded-panel border border-dashed border-border p-12 text-center"><WalletCards className="mx-auto h-8 w-8 text-zinc-300" /><h2 className="mt-4 text-lg font-bold">Add your first account</h2><p className="mt-2 text-sm text-zinc-500">Start with the one you use most — cash, UPI, a bank account or a card.</p><button onClick={() => setEditingAccount(null)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-zinc-950"><Plus className="h-4 w-4" /> Add account</button></div> : (
                    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{accounts.map((account) => {
                        const Icon = accountIcon(account.type);
                        const summary = account.summary;
                        const isCreditCard = account.type === "credit_card";
                        const utilisation = summary?.limit?.utilisation_pct ?? summary?.credit_utilisation;
                        const outstanding = summary?.outstanding ?? summary?.limit?.outstanding;
                        const cardPosition = creditCardPosition(outstanding);
                        const transactionsHref = transactionHref({ account_id: account.id, ...monthRange });
                        return <article key={account.id} className="group relative overflow-hidden rounded-panel border border-border bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl dark:bg-zinc-900"><div className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: account.color || "#FF8865" }} /><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800"><Icon className="h-5 w-5" /></span><div className="flex items-center gap-1">{account.is_default && <span className="mr-1 inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent"><Star className="h-3 w-3 fill-current" /> Default</span>}<button onClick={() => setEditingAccount(account)} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-white" aria-label={`Edit ${account.name}`}><Pencil className="h-4 w-4" /></button><button onClick={() => void deleteAccount(account)} className="rounded-xl p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30" aria-label={`Delete ${account.name}`}><Trash2 className="h-4 w-4" /></button></div></div><p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-zinc-400">{accountLabel(account.type)}</p><h2 className="mt-1 text-xl font-bold font-rounded">{account.name}</h2><p className="mt-1 min-h-5 text-xs text-zinc-400">{[account.provider, account.identifier].filter(Boolean).join(" · ") || "\u00a0"}</p><div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5"><div><p className="text-xs text-zinc-400">Spent this month</p><p className="mt-1 text-xl font-bold font-rounded">{formatMoney(summary?.spent_this_month || 0)}</p></div><div><p className="text-xs text-zinc-400">Activity</p><p className="mt-1 text-xl font-bold font-rounded">{summary?.entries_this_month || 0}</p><p className="text-[10px] text-zinc-400">record{summary?.entries_this_month === 1 ? "" : "s"}</p></div></div>{isCreditCard ? <div className="mt-5 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800"><div className="flex items-end justify-between gap-3"><div><p className="text-xs text-zinc-400">{cardPosition.label}</p><p className="mt-1 text-lg font-bold">{formatMoney(cardPosition.displayAmount)}</p></div>{utilisation !== undefined && <p className="text-xs font-bold text-zinc-500">{utilisation.toFixed(1)}% used</p>}</div>{utilisation !== undefined && <><div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700" role="progressbar" aria-label={`${account.name} credit utilisation`} aria-valuemin={0} aria-valuenow={utilisation} aria-valuetext={`${utilisation.toFixed(1)}% of ${formatMoney(summary?.limit?.credit_limit ?? account.credit_limit)} used`}><div className={cn("h-full rounded-full", utilisation >= 100 ? "bg-rose-500" : utilisation >= 75 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${Math.min(Math.max(utilisation, 0), 100)}%` }} /></div><p className="mt-2 text-[10px] text-zinc-400">of {formatMoney(summary?.limit?.credit_limit ?? account.credit_limit)} limit{account.due_day ? ` · due day ${account.due_day}` : ""}</p></>}</div> : <div className="mt-5 rounded-2xl bg-zinc-50 p-4 dark:bg-zinc-800"><p className="text-xs text-zinc-400">Running balance</p>{summary?.running_balance !== undefined ? <p className="mt-1 text-lg font-bold">{formatMoney(summary.running_balance)}</p> : <p className="mt-1 text-xs leading-5 text-zinc-500">Add an opening balance to see a running total.</p>}</div>}<Link href={transactionsHref} className="mt-5 flex min-h-11 items-center justify-between rounded-xl bg-accent/10 px-4 text-xs font-bold text-accent hover:bg-accent/15" aria-label={`Open ${account.name} transactions`}>View this month’s transactions <ArrowUpRight className="h-4 w-4" /></Link>{summary?.last_activity_date && <p className="mt-3 text-[10px] text-zinc-400">Last activity {summary.last_activity_date}</p>}</article>;
                    })}</section>
                )}
            </div>
            {editingAccount !== undefined && <AccountDialog account={editingAccount} onClose={() => setEditingAccount(undefined)} onSaved={() => { setEditingAccount(undefined); void loadAccounts(); }} />}
            <ConfirmDialog open={Boolean(deleteTarget)} title={`Delete ${deleteTarget?.name || "account"}?`} description="You can only delete an account that no transactions use — move or delete those first. This can’t be undone." confirmLabel="Delete account" onClose={() => setDeleteTarget(null)} onConfirm={() => { if (deleteTarget) void deleteAccount(deleteTarget, true); }} />
        </>
    );
}
