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

const fieldClass = "min-h-11 w-full rounded-xl border border-border bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-accent/30 focus:ring-4 focus:ring-accent/10 dark:bg-zinc-800";
function DialogShell({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: ReactNode }) {
    const titleId = useId();
    return <Dialog open onClose={onClose} labelledBy={titleId} panelClassName="max-h-[calc(100dvh-2rem)] max-w-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between border-b border-border bg-white/95 p-6 backdrop-blur dark:bg-zinc-900/95">
                <div><h2 id={titleId} className="text-xl font-bold font-rounded">{title}</h2><p className="mt-1 text-sm text-zinc-500">{description}</p></div>
                <button type="button" onClick={onClose} className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800" aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            {children}
    </Dialog>;
}

/**
 * A note is offered, not laid out: an empty box labelled "optional" still reads
 * as one more thing to fill in. A note that already has text shows as a field.
 */
function OptionalNote({ value, onChange, className }: { value: string; onChange: (value: string) => void; className?: string }) {
    const [open, setOpen] = useState(false);
    if (!open && !value) {
        return <div className={className}><button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-zinc-300 px-3.5 text-xs font-bold text-zinc-600 hover:border-accent hover:text-accent dark:border-zinc-600 dark:text-zinc-300"><Plus className="h-3.5 w-3.5 text-accent" aria-hidden /> Add a note</button></div>;
    }
    return <label className={`disclosure-enter space-y-2 ${className || ""}`}><span className="text-xs font-bold text-zinc-500">Note</span><textarea autoFocus={open && !value} value={value} onChange={(event) => onChange(event.target.value)} rows={3} className={fieldClass} /></label>;
}

function DialogActions({ saving, label, onClose }: { saving: boolean; label: string; onClose: () => void }) {
    return <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-white/95 p-5 backdrop-blur dark:bg-zinc-900/95">
        <button type="button" onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-bold text-zinc-500">Cancel</button>
        <button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-zinc-950 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{label}</button>
    </div>;
}

export function SettlementDialog({ friends, suggestedFriend, onClose, onSaved }: { friends: SplitFriend[]; suggestedFriend?: SplitFriend; onClose: () => void; onSaved: () => void }) {
    const { toast } = useToast();
    const [form, setForm] = useState<SplitSettlementInput>({ friend_id: suggestedFriend?.id || 0, amount: 0, direction: "friend_paid_user", date: toLocalISO(), notes: "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const submit = async (event: FormEvent) => {
        event.preventDefault(); setSaving(true); setError("");
        try { await SplitAPI.createSettlement(form); const friend = friends.find((item) => item.id === form.friend_id); toast({ title: `${formatMoney(form.amount)} settlement recorded${friend ? ` with ${friend.name}` : ""}` }); onSaved(); }
        catch (requestError) { setError(apiErrorMessage(requestError, "We couldn’t record this settlement.")); }
        finally { setSaving(false); }
    };
    return <DialogShell title="Record a settlement" description="Use this only when money has actually changed hands." onClose={onClose}>
        <form onSubmit={submit}><div className="grid gap-5 p-6 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2"><span className="text-xs font-bold text-zinc-500">Friend</span><select required value={form.friend_id || ""} onChange={(event) => setForm({ ...form, friend_id: Number(event.target.value) })} className={fieldClass}><option value="">Choose friend</option>{friends.map((friend) => <option key={friend.id} value={friend.id}>{friend.name}</option>)}</select></label>
            <label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Amount</span><input required min="0.01" step="0.01" type="number" value={form.amount || ""} onChange={(event) => setForm({ ...form, amount: Number(event.target.value) })} className={fieldClass} /></label>
            <label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Date</span><input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className={fieldClass} /></label>
            <label className="space-y-2 sm:col-span-2"><span className="text-xs font-bold text-zinc-500">What happened?</span><select value={form.direction} onChange={(event) => setForm({ ...form, direction: event.target.value as SettlementDirection })} className={fieldClass}><option value="friend_paid_user">They paid me</option><option value="user_paid_friend">I paid them</option></select></label>
            <OptionalNote className="sm:col-span-2" value={form.notes || ""} onChange={(notes) => setForm({ ...form, notes })} />
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 sm:col-span-2">{error}</p>}
        </div><DialogActions saving={saving} label="Record settlement" onClose={onClose} /></form>
    </DialogShell>;
}
