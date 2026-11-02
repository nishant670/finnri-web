"use client";

import React, { FormEvent, ReactNode, useId, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import {
    apiErrorMessage,
    SettlementDirection,
    SplitAPI,
    SplitFriend,
    SplitSettlementInput,
} from "@/app/lib/api";
import { formatMoney, toLocalISO } from "@/app/lib/format";
import Dialog from "@/app/components/ui/Dialog";
import { useToast } from "@/app/components/ui/Toast";

const fieldClass = "h-12 w-full rounded-xl border border-border bg-background px-4 text-[15px] outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10";
const labelClass = "text-sm font-semibold text-muted";

function DialogShell({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: ReactNode }) {
    const titleId = useId();
    return <Dialog open onClose={onClose} labelledBy={titleId} panelClassName="sm:max-w-lg">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card px-6 py-5">
            <div><h2 id={titleId} className="text-xl font-bold">{title}</h2><p className="mt-0.5 text-sm text-muted">{description}</p></div>
            <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted hover:bg-track hover:text-foreground" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {children}
    </Dialog>;
}

/**
 * A note is offered, not laid out: an empty box labelled "optional" still reads
 * as one more thing to fill in. A note that already has text shows as a field.
 */
function OptionalNote({ value, onChange }: { value: string; onChange: (value: string) => void }) {
    const [open, setOpen] = useState(false);
    if (!open && !value) {
        return <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-9 w-fit items-center gap-1.5 rounded-full border border-dashed border-border px-3.5 text-[13px] font-semibold hover:border-accent hover:bg-selected"><Plus className="h-3.5 w-3.5 text-accent" aria-hidden /> Add a note</button>;
    }
    return <label className="disclosure-enter block"><span className={labelClass}>Note</span><textarea autoFocus={open && !value} value={value} onChange={(event) => onChange(event.target.value)} rows={3} className={`${fieldClass} mt-1 h-auto py-3`} /></label>;
}

function DialogActions({ saving, label, onClose }: { saving: boolean; label: string; onClose: () => void }) {
    return <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-border bg-card px-6 py-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className="h-11 rounded-full border border-border px-5 text-sm font-bold hover:bg-track">Cancel</button>
        <button disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-bold text-on-accent disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{label}</button>
    </div>;
}

const DIRECTIONS = [{ value: "friend_paid_user", label: "They paid me" }, { value: "user_paid_friend", label: "I paid them" }] as const;

/**
 * Recording money that changed hands. Opened from someone's ledger it starts
 * on the amount that would square things, which is the usual case.
 */
export function SettlementDialog({ friends, suggestedFriend, suggestedBalance, onClose, onSaved }: { friends: SplitFriend[]; suggestedFriend?: SplitFriend; /** Their net balance: positive when they owe you. */ suggestedBalance?: number; onClose: () => void; onSaved: () => void }) {
    const { toast } = useToast();
    const [form, setForm] = useState<SplitSettlementInput>({
        friend_id: suggestedFriend?.id || 0,
        amount: suggestedBalance ? Math.abs(suggestedBalance) : 0,
        direction: suggestedBalance !== undefined && suggestedBalance < 0 ? "user_paid_friend" : "friend_paid_user",
        date: toLocalISO(),
        notes: "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const submit = async (event: FormEvent) => {
        event.preventDefault(); setSaving(true); setError("");
        try { await SplitAPI.createSettlement(form); const friend = friends.find((item) => item.id === form.friend_id); toast({ title: `${formatMoney(form.amount)} payment recorded${friend ? ` with ${friend.name}` : ""}` }); onSaved(); }
        catch (requestError) { setError(apiErrorMessage(requestError, "We couldn’t record this payment.")); }
        finally { setSaving(false); }
    };
    return <DialogShell title="Record a payment" description="Only when money has actually changed hands. Finnri doesn’t move money." onClose={onClose}>
        <form onSubmit={submit}>
            <div className="space-y-4 px-6 py-5">
                <div role="radiogroup" aria-label="Who paid" className="grid grid-cols-2 gap-1 rounded-full bg-track p-1">
                    {DIRECTIONS.map((option) => (
                        <button key={option.value} type="button" role="radio" aria-checked={form.direction === option.value} onClick={() => setForm({ ...form, direction: option.value as SettlementDirection })} className={`h-10 rounded-full text-sm transition ${form.direction === option.value ? "bg-card font-bold shadow-sm dark:bg-border" : "font-medium text-muted hover:text-foreground"}`}>{option.label}</button>
                    ))}
                </div>
                <label className="block"><span className={labelClass}>{form.direction === "friend_paid_user" ? "Who paid you" : "Who you paid"}</span><select required value={form.friend_id || ""} onChange={(event) => setForm({ ...form, friend_id: Number(event.target.value) })} className={`${fieldClass} mt-1`}><option value="">Choose a friend</option>{friends.map((friend) => <option key={friend.id} value={friend.id}>{friend.name}</option>)}</select></label>
                <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
                    <label className="block"><span className={labelClass}>Amount</span><span className="relative mt-1 block"><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-muted">₹</span><input required min="0.01" step="0.01" type="number" inputMode="decimal" value={form.amount || ""} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} className={`${fieldClass} h-14 pl-9 text-2xl font-bold tabular-nums`} /></span></label>
                    <label className="block"><span className={labelClass}>Date</span><input required type="date" max={toLocalISO()} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className={`${fieldClass} mt-1 h-14`} /></label>
                </div>
                <OptionalNote value={form.notes || ""} onChange={(notes) => setForm({ ...form, notes })} />
                {error && <p role="alert" className="rounded-xl bg-negative/10 p-3 text-sm font-semibold text-negative">{error}</p>}
            </div>
            <DialogActions saving={saving} label="Record payment" onClose={onClose} />
        </form>
    </DialogShell>;
}
