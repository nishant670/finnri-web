"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { Loader2, X } from "lucide-react";
import Dialog from "@/app/components/ui/Dialog";
import {
    Account,
    apiErrorMessage,
    RecurringCandidate,
    Subscription,
    SubscriptionInput,
    SubscriptionsAPI,
} from "@/app/lib/api";
import { PAYMENT_MODES, paymentModeForAccountType } from "@/app/lib/accounts";
import { categoryOptionsFor, loadCategories } from "@/app/lib/categories";
import { toLocalISO } from "@/app/lib/format";

function futureDate(days: number) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return toLocalISO(date);
}

function dateOnly(value: string | null | undefined) {
    return value ? value.slice(0, 10) : "";
}

export function subscriptionInputForCandidate(candidate: RecurringCandidate): Partial<SubscriptionInput> {
    const interval = candidate.interval_guess === "weekly" ? "weekly" : "monthly";
    return {
        name: candidate.label,
        merchant: candidate.merchant,
        category: candidate.category,
        amount: candidate.average_amount,
        billing_interval: interval,
        next_due_date: candidate.next_expected_date,
        last_charged_date: candidate.last_seen_date,
        reminder_days: interval === "weekly" ? 1 : 3,
        notes: `Detected from ${candidate.occurrences} similar transactions (${Math.round(candidate.confidence * 100)}% match).`,
    };
}

/**
 * A saved subscription as an editable input.
 *
 * The API returns the three date fields as full RFC3339 timestamps but rejects
 * them on write with `must use YYYY-MM-DD`, so every write path has to trim
 * them. Anything sending a subscription back — the form, pause/resume — goes
 * through here rather than reading the record's fields directly.
 */
export function inputForSubscription(subscription: Subscription): SubscriptionInput {
    return {
        account_id: subscription.account_id ?? null,
        name: subscription.name,
        merchant: subscription.merchant,
        category: subscription.category,
        amount: subscription.amount,
        currency: subscription.currency,
        billing_interval: subscription.billing_interval,
        next_due_date: dateOnly(subscription.next_due_date),
        last_charged_date: dateOnly(subscription.last_charged_date),
        status: subscription.status,
        reminder_days: subscription.reminder_days,
        cancel_before_due: subscription.cancel_before_due,
        cancel_on_date: dateOnly(subscription.cancel_on_date),
        autopay: subscription.autopay,
        payment_mode: subscription.payment_mode || "Cash",
        transaction_tag: subscription.transaction_tag || "Subscription",
        purpose_type: subscription.purpose_type || "normal_spend",
        notes: subscription.notes,
    };
}

function initialForm(initial?: Partial<SubscriptionInput>, subscription?: Subscription): SubscriptionInput {
    const form: SubscriptionInput = {
        account_id: null,
        name: "",
        merchant: "",
        category: "Misc",
        amount: 0,
        currency: "INR",
        billing_interval: "monthly",
        next_due_date: futureDate(30),
        last_charged_date: "",
        status: "active",
        reminder_days: 3,
        cancel_before_due: false,
        cancel_on_date: "",
        autopay: false,
        payment_mode: "Cash",
        transaction_tag: "Subscription",
        purpose_type: "normal_spend",
        notes: "",
        ...(subscription ? inputForSubscription(subscription) : {}),
        ...initial,
    };
    return {
        ...form,
        next_due_date: dateOnly(form.next_due_date),
        last_charged_date: dateOnly(form.last_charged_date),
        cancel_on_date: dateOnly(form.cancel_on_date),
    };
}

export default function SubscriptionForm({
    accounts,
    initial,
    subscription,
    onClose,
    onSaved,
}: {
    accounts: Account[];
    initial?: Partial<SubscriptionInput>;
    subscription?: Subscription;
    onClose: () => void;
    onSaved: (subscription: Subscription) => void | Promise<void>;
}) {
    const titleId = useId();
    const [form, setForm] = useState<SubscriptionInput>(() => initialForm(initial, subscription));
    const [categories, setCategories] = useState<string[]>([]);
    const [categoriesError, setCategoriesError] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const editing = Boolean(subscription);

    useEffect(() => {
        let active = true;
        loadCategories()
            .then((set) => { if (active) { setCategories(set.categories); setCategoriesError(""); } })
            .catch((requestError) => { if (active) setCategoriesError(apiErrorMessage(requestError, "We couldn’t load the category list.")); });
        return () => { active = false; };
    }, []);

    const selectAccount = (accountID: number | null) => {
        const account = accounts.find((item) => item.id === accountID);
        const inferredMode = account ? paymentModeForAccountType(account.type) : null;
        setForm((current) => ({
            ...current,
            account_id: accountID,
            payment_mode: inferredMode || current.payment_mode,
        }));
    };

    const selectInterval = (billingInterval: SubscriptionInput["billing_interval"]) => {
        setForm((current) => ({
            ...current,
            billing_interval: billingInterval,
            ...(billingInterval === "daily" ? { autopay: true, reminder_days: 0 } : {}),
        }));
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
            const response = subscription
                ? await SubscriptionsAPI.update(subscription.id, form)
                : await SubscriptionsAPI.create(form);
            await onSaved(response.data);
        } catch (requestError) {
            setError(apiErrorMessage(requestError, editing ? "We couldn’t update this subscription." : "We couldn’t add this subscription."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onClose={onClose} labelledBy={titleId} panelClassName="max-h-[calc(100dvh-2rem)] max-w-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-white/95 p-6 backdrop-blur dark:bg-zinc-900/95">
                <div>
                    <h2 id={titleId} className="text-xl font-bold font-rounded">{editing ? "Edit recurring payment" : "Track a recurring payment"}</h2>
                    <p className="mt-1 text-xs leading-5 text-zinc-400">Mark paid advances the schedule only. Automatic transactions can be enabled below.</p>
                </div>
                <button type="button" onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submit} className="space-y-5 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Name</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Netflix" className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none dark:bg-zinc-800" /></label>
                    <label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Merchant</span><input value={form.merchant} onChange={(event) => setForm({ ...form, merchant: event.target.value })} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none dark:bg-zinc-800" /></label>
                    <label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Amount</span><input required type="number" min="1" step="0.01" value={form.amount || ""} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none dark:bg-zinc-800" /></label>
                    <label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Interval</span><select value={form.billing_interval} onChange={(event) => selectInterval(event.target.value as SubscriptionInput["billing_interval"])} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none dark:bg-zinc-800"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="biweekly">Every two weeks</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="yearly">Yearly</option></select></label>
                    <label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Category</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} disabled={Boolean(categoriesError)} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none disabled:opacity-60 dark:bg-zinc-800">{categoryOptionsFor(categories, form.category).map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                    <label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Next due date</span><input required type="date" value={form.next_due_date} onChange={(event) => setForm({ ...form, next_due_date: event.target.value })} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none dark:bg-zinc-800" /></label>
                    <label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Last charged (optional)</span><input type="date" value={form.last_charged_date} onChange={(event) => setForm({ ...form, last_charged_date: event.target.value })} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none dark:bg-zinc-800" /></label>
                    <label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Reminder lead time</span><div className="relative"><input required type="number" min="0" max="30" value={form.reminder_days} disabled={form.billing_interval === "daily"} onChange={(event) => setForm({ ...form, reminder_days: Number(event.target.value) })} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 pr-16 text-sm outline-none disabled:opacity-60 dark:bg-zinc-800" /><span className="absolute right-4 top-3 text-xs text-zinc-400">days</span></div></label>
                    <label className="space-y-2 sm:col-span-2"><span className="text-xs font-bold text-zinc-500">Account {form.autopay ? "(required for automatic transactions)" : "(optional)"}</span><select required={form.autopay} value={form.account_id || ""} onChange={(event) => selectAccount(event.target.value ? Number(event.target.value) : null)} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none dark:bg-zinc-800"><option value="">No account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
                    <label className="space-y-2 sm:col-span-2"><span className="text-xs font-bold text-zinc-500">Payment method for generated transactions</span><select value={form.payment_mode} onChange={(event) => setForm({ ...form, payment_mode: event.target.value })} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none dark:bg-zinc-800">{PAYMENT_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label>
                </div>
                {categoriesError && <p className="text-xs text-red-500">{categoriesError}</p>}
                <label className="flex items-start gap-3 rounded-xl border border-border p-4"><input type="checkbox" checked={form.autopay} disabled={form.billing_interval === "daily"} onChange={(event) => setForm({ ...form, autopay: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[#FF8865]" /><span><span className="block text-sm font-bold">Create matching transactions automatically</span><span className="block text-xs leading-5 text-zinc-400">On each due date, Finnri creates an editable transaction in the linked account. Daily schedules require this. “Mark paid” never creates a transaction.</span></span></label>
                <div className="space-y-3 rounded-xl border border-border p-4">
                    <label className="flex items-start gap-3"><input type="checkbox" checked={form.cancel_before_due} onChange={(event) => setForm({ ...form, cancel_before_due: event.target.checked, cancel_on_date: event.target.checked ? (form.cancel_on_date || form.next_due_date) : "" })} className="mt-0.5 h-4 w-4 accent-[#FF8865]" /><span><span className="block text-sm font-bold">Plan to cancel before renewal</span><span className="block text-xs text-zinc-400">Save the cancellation deadline you want to remember.</span></span></label>
                    {form.cancel_before_due && <label className="block space-y-2 pl-7"><span className="text-xs font-bold text-zinc-500">Cancel by</span><input required type="date" value={form.cancel_on_date} onChange={(event) => setForm({ ...form, cancel_on_date: event.target.value })} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none dark:bg-zinc-800" /></label>}
                </div>
                <label className="block space-y-2"><span className="text-xs font-bold text-zinc-500">Notes (optional)</span><textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className="w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none dark:bg-zinc-800" /></label>
                {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{error}</p>}
                <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-zinc-500">Cancel</button><button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-zinc-950 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? "Save changes" : "Add subscription"}</button></div>
            </form>
        </Dialog>
    );
}
