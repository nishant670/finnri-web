"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { Loader2, X } from "lucide-react";
import Dialog from "@/app/components/ui/Dialog";
import FormDisclosure from "@/app/components/ui/FormDisclosure";
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
import { subscriptionOptionsSummary } from "@/app/lib/form-summaries";
import { cn } from "@/app/lib/utils";

/**
 * The four cadences nearly every recurring payment is, as one segmented row —
 * the same four the app leads with. Daily and every-two-weeks are real but
 * rare, so they wait under More options.
 */
const PRIMARY_INTERVALS: { value: SubscriptionInput["billing_interval"]; label: string }[] = [
    { value: "weekly", label: "Weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
];
const OTHER_INTERVALS: { value: SubscriptionInput["billing_interval"]; label: string }[] = [
    { value: "daily", label: "Daily" },
    { value: "biweekly", label: "Every 2 weeks" },
];

const fieldClass = "w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none focus:ring-4 focus:ring-accent/10 dark:bg-zinc-800";
const labelClass = "text-xs font-bold text-zinc-500";

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
    const [showOptions, setShowOptions] = useState(false);
    const editing = Boolean(subscription);
    const accountName = accounts.find((account) => account.id === form.account_id)?.name;
    const optionsSummary = subscriptionOptionsSummary({
        category: form.category,
        billingInterval: form.billing_interval,
        reminderDays: form.reminder_days,
        autopay: form.autopay,
        accountName,
        cancelBeforeDue: form.cancel_before_due,
        merchant: form.merchant,
        name: form.name,
    });

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
        // The browser cannot check fields that are folded away, so the two
        // rules that live under More options are checked here, and the fold
        // opens to show the field the message is about.
        if (form.autopay && !form.account_id) {
            setShowOptions(true);
            setError("Choose the account Autopay should use.");
            return;
        }
        if (form.cancel_before_due && !form.cancel_on_date) {
            setShowOptions(true);
            setError("Pick the date you want the cancel reminder.");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const response = subscription
                ? await SubscriptionsAPI.update(subscription.id, form)
                : await SubscriptionsAPI.create(form);
            await onSaved(response.data);
        } catch (requestError) {
            setError(apiErrorMessage(requestError, editing ? "We couldn’t update this payment. Check your connection and try again." : "We couldn’t add this payment. Check your connection and try again."));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open onClose={onClose} labelledBy={titleId} panelClassName="max-h-[calc(100dvh-2rem)] max-w-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-white/95 p-6 backdrop-blur dark:bg-zinc-900/95">
                <div>
                    <h2 id={titleId} className="text-xl font-bold font-rounded">{editing ? "Edit recurring payment" : "Track a recurring payment"}</h2>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">Finnri reminds you before each payment is due.</p>
                </div>
                <button type="button" onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={submit} className="space-y-5 p-6">
                {/* Four questions — what, how much, how often, when next — and
                    everything else answered by a default the row below reads
                    back. This dialog used to lay out thirteen controls at once. */}
                <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                    <label className="space-y-2"><span className={labelClass}>What is it?</span><input required autoFocus={!editing} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Netflix, rent, gym…" className={fieldClass} /></label>
                    <label className="space-y-2"><span className={labelClass}>Amount</span><span className="relative block"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">₹</span><input required type="number" inputMode="decimal" min="1" step="0.01" value={form.amount || ""} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} placeholder="199" className={cn(fieldClass, "pl-8")} /></span></label>
                </div>
                <div className="space-y-2">
                    <span id={`${titleId}-interval`} className={labelClass}>Repeats</span>
                    <div role="radiogroup" aria-labelledby={`${titleId}-interval`} className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                        {PRIMARY_INTERVALS.map((option) => {
                            const selected = form.billing_interval === option.value;
                            return <button key={option.value} type="button" role="radio" aria-checked={selected} onClick={() => selectInterval(option.value)} className={cn("min-h-10 flex-1 rounded-lg text-xs font-bold transition-all", selected ? "bg-white text-accent shadow-sm dark:bg-zinc-700" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200")}>{option.label}</button>;
                        })}
                    </div>
                    {OTHER_INTERVALS.some((option) => option.value === form.billing_interval) && <p className="text-xs text-zinc-500">Repeats {form.billing_interval === "daily" ? "daily" : "every 2 weeks"} — change it under More options.</p>}
                </div>
                <label className="block space-y-2"><span className={labelClass}>Next payment on</span><input required type="date" value={form.next_due_date} onChange={(event) => setForm({ ...form, next_due_date: event.target.value })} className={fieldClass} /></label>

                <FormDisclosure label="More options" summary={optionsSummary} open={showOptions} onToggle={() => setShowOptions((open) => !open)}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2"><span className={labelClass}>Category</span><select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} disabled={Boolean(categoriesError)} className={cn(fieldClass, "disabled:opacity-60")}>{categoryOptionsFor(categories, form.category).map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                        <label className="space-y-2"><span className={labelClass}>Paid to <span className="font-normal text-zinc-400">optional</span></span><input value={form.merchant} onChange={(event) => setForm({ ...form, merchant: event.target.value })} placeholder="Same as the name" className={fieldClass} /></label>
                        <label className="space-y-2"><span className={labelClass}>Remind me</span><span className="relative block"><input required type="number" min="0" max="30" value={form.reminder_days} disabled={form.billing_interval === "daily"} onChange={(event) => setForm({ ...form, reminder_days: Number(event.target.value) })} className={cn(fieldClass, "pr-24 disabled:opacity-60")} /><span className="pointer-events-none absolute right-4 top-3 text-xs text-zinc-400">days before</span></span></label>
                        <label className="space-y-2"><span className={labelClass}>Last charged <span className="font-normal text-zinc-400">optional</span></span><input type="date" value={form.last_charged_date} onChange={(event) => setForm({ ...form, last_charged_date: event.target.value })} className={fieldClass} /></label>
                    </div>
                    <div className="space-y-2">
                        <span className={labelClass}>Other schedules</span>
                        <div className="flex flex-wrap gap-2">
                            {OTHER_INTERVALS.map((option) => {
                                const selected = form.billing_interval === option.value;
                                return <button key={option.value} type="button" aria-pressed={selected} onClick={() => selectInterval(option.value)} className={cn("min-h-9 rounded-full border px-3 text-xs font-bold", selected ? "border-accent bg-accent/10 text-accent" : "border-border text-zinc-500 hover:border-accent")}>{option.label}</button>;
                            })}
                        </div>
                    </div>
                    <label className="flex items-start gap-3 rounded-xl border border-border p-4"><input type="checkbox" checked={form.autopay} disabled={form.billing_interval === "daily"} onChange={(event) => setForm({ ...form, autopay: event.target.checked })} className="mt-0.5 h-4 w-4 accent-[#FF8865]" /><span><span className="block text-sm font-bold">Add it to my transactions automatically</span><span className="block text-xs leading-5 text-zinc-500">On each due date, Finnri adds the payment for you to check. Daily schedules need this. “Mark paid” on its own never adds a transaction.</span></span></label>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2"><span className={labelClass}>From account {form.autopay ? <span className="font-normal text-zinc-400">needed for Autopay</span> : <span className="font-normal text-zinc-400">optional</span>}</span><select required={form.autopay} value={form.account_id || ""} onChange={(event) => selectAccount(event.target.value ? Number(event.target.value) : null)} className={fieldClass}><option value="">No account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
                        {form.autopay && <label className="space-y-2"><span className={labelClass}>Paid by</span><select value={form.payment_mode} onChange={(event) => setForm({ ...form, payment_mode: event.target.value })} className={fieldClass}>{PAYMENT_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label>}
                    </div>
                    <div className="space-y-3 rounded-xl border border-border p-4">
                        <label className="flex items-start gap-3"><input type="checkbox" checked={form.cancel_before_due} onChange={(event) => setForm({ ...form, cancel_before_due: event.target.checked, cancel_on_date: event.target.checked ? (form.cancel_on_date || form.next_due_date) : "" })} className="mt-0.5 h-4 w-4 accent-[#FF8865]" /><span><span className="block text-sm font-bold">Remind me to cancel it</span><span className="block text-xs text-zinc-500">For a free trial, or a plan you mean to stop.</span></span></label>
                        {form.cancel_before_due && <label className="block space-y-2 pl-7"><span className={labelClass}>Cancel by</span><input required type="date" value={form.cancel_on_date} onChange={(event) => setForm({ ...form, cancel_on_date: event.target.value })} className={fieldClass} /></label>}
                    </div>
                    <label className="block space-y-2"><span className={labelClass}>Notes <span className="font-normal text-zinc-400">optional</span></span><textarea rows={3} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Plan tier, cancellation link…" className={cn(fieldClass, "resize-none")} /></label>
                </FormDisclosure>
                {categoriesError && <p className="text-xs text-red-500">{categoriesError}</p>}
                {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{error}</p>}
                <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-zinc-500">Cancel</button><button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-zinc-950 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? "Save changes" : "Start tracking"}</button></div>
            </form>
        </Dialog>
    );
}
