"use client";

import React, { FormEvent, ReactNode, useId, useMemo, useState } from "react";
import { Equal, Loader2, Plus, Trash2, X } from "lucide-react";
import {
    apiErrorMessage,
    SettlementDirection,
    SplitAPI,
    SplitBill,
    SplitBillInput,
    SplitDirection,
    SplitFriend,
    SplitFriendInput,
    SplitGroup,
    SplitGroupInput,
    SplitParticipantInput,
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

function DialogActions({ saving, label, onClose }: { saving: boolean; label: string; onClose: () => void }) {
    return <div className="sticky bottom-0 flex justify-end gap-3 border-t border-border bg-white/95 p-5 backdrop-blur dark:bg-zinc-900/95">
        <button type="button" onClick={onClose} className="rounded-xl px-5 py-2.5 text-sm font-bold text-zinc-500">Cancel</button>
        <button disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-6 text-sm font-bold text-zinc-950 disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />}{label}</button>
    </div>;
}

export function FriendDialog({ friend, onClose, onSaved }: { friend?: SplitFriend; onClose: () => void; onSaved: () => void }) {
    const { toast } = useToast();
    const [form, setForm] = useState<SplitFriendInput>({ name: friend?.name || "", email: friend?.email || "", phone: friend?.phone || "" });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const submit = async (event: FormEvent) => {
        event.preventDefault(); setSaving(true); setError("");
        try { if (friend) await SplitAPI.updateFriend(friend.id, form); else await SplitAPI.createFriend(form); toast({ title: friend ? `${form.name} updated` : `${form.name} added` }); onSaved(); }
        catch (requestError) { setError(apiErrorMessage(requestError, "We couldn’t save this friend.")); }
        finally { setSaving(false); }
    };
    return <DialogShell title={friend ? "Edit friend" : "Add a friend"} description="Friends stay private to your FINNRI split ledger." onClose={onClose}>
        <form onSubmit={submit}><div className="grid gap-5 p-6 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-2"><span className="text-xs font-bold text-zinc-500">Name</span><input required maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Ria" className={fieldClass} /></label>
            <label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Email <span className="font-normal text-zinc-400">optional</span></span><input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={fieldClass} /></label>
            <label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Phone <span className="font-normal text-zinc-400">optional</span></span><input type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={fieldClass} /></label>
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 sm:col-span-2">{error}</p>}
        </div><DialogActions saving={saving} label={friend ? "Save changes" : "Add friend"} onClose={onClose} /></form>
    </DialogShell>;
}

export function GroupDialog({ group, friends, onClose, onSaved }: { group?: SplitGroup; friends: SplitFriend[]; onClose: () => void; onSaved: () => void }) {
    const { toast } = useToast();
    const [form, setForm] = useState<SplitGroupInput>({ name: group?.name || "", friend_ids: group?.members?.map((member) => member.friend_id) || [] });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const toggleFriend = (friendID: number) => setForm({ ...form, friend_ids: form.friend_ids.includes(friendID) ? form.friend_ids.filter((id) => id !== friendID) : [...form.friend_ids, friendID] });
    const submit = async (event: FormEvent) => {
        event.preventDefault(); setSaving(true); setError("");
        try { if (group) await SplitAPI.updateGroup(group.id, form); else await SplitAPI.createGroup(form); toast({ title: group ? `${form.name} updated` : `${form.name} created` }); onSaved(); }
        catch (requestError) { setError(apiErrorMessage(requestError, "We couldn’t save this group.")); }
        finally { setSaving(false); }
    };
    return <DialogShell title={group ? "Edit group" : "Create a group"} description="Keep frequent split circles together for faster bill entry." onClose={onClose}>
        <form onSubmit={submit}><div className="space-y-5 p-6">
            <label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Group name</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Goa trip" className={fieldClass} /></label>
            <fieldset><legend className="mb-3 text-xs font-bold text-zinc-500">Members</legend>{friends.length === 0 ? <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500 dark:bg-zinc-800">Add a friend before creating a group.</p> : <div className="grid gap-2 sm:grid-cols-2">{friends.map((friend) => <label key={friend.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3"><input type="checkbox" checked={form.friend_ids.includes(friend.id)} onChange={() => toggleFriend(friend.id)} className="h-4 w-4 accent-[#FF8865]" /><span className="text-sm font-semibold">{friend.name}</span></label>)}</div>}</fieldset>
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{error}</p>}
        </div><DialogActions saving={saving} label={group ? "Save changes" : "Create group"} onClose={onClose} /></form>
    </DialogShell>;
}

type BillDraft = Omit<SplitBillInput, "participants"> & { participants: SplitParticipantInput[] };

function emptyParticipant(): SplitParticipantInput { return { friend_id: 0, share_amount: 0, direction: "friend_owes_user" }; }

export function BillDialog({ bill, friends, groups, onClose, onSaved }: { bill?: SplitBill; friends: SplitFriend[]; groups: SplitGroup[]; onClose: () => void; onSaved: () => void }) {
    const { toast } = useToast();
    const [form, setForm] = useState<BillDraft>({
        entry_id: bill?.entry_id || null, group_id: bill?.group_id || null, title: bill?.title || "", total_amount: bill?.total_amount || 0,
        currency: "INR", date: bill?.date || toLocalISO(), notes: bill?.notes || "",
        participants: bill?.participants?.map((participant) => ({ friend_id: participant.friend_id, share_amount: participant.share_amount, direction: participant.direction })) || [emptyParticipant()],
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const sharesTotal = useMemo(() => form.participants.reduce((sum, participant) => sum + Number(participant.share_amount || 0), 0), [form.participants]);
    const updateParticipant = (index: number, patch: Partial<SplitParticipantInput>) => setForm({ ...form, participants: form.participants.map((participant, itemIndex) => itemIndex === index ? { ...participant, ...patch } : participant) });
    const chooseGroup = (value: string) => {
        const groupID = value ? Number(value) : null;
        const group = groups.find((item) => item.id === groupID);
        const amount = Number(form.total_amount || 0);
        const memberCount = group?.members?.length || 0;
        const equalShare = memberCount && amount ? Number((amount / (memberCount + 1)).toFixed(2)) : 0;
        setForm({ ...form, group_id: groupID, participants: group?.members?.length ? group.members.map((member) => ({ friend_id: member.friend_id, share_amount: equalShare, direction: "friend_owes_user" as SplitDirection })) : form.participants });
    };
    const splitEqually = () => {
        const share = form.participants.length && form.total_amount ? Number((Number(form.total_amount) / (form.participants.length + 1)).toFixed(2)) : 0;
        setForm({ ...form, participants: form.participants.map((participant) => ({ ...participant, share_amount: share })) });
    };
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (form.participants.some((participant) => !participant.friend_id || participant.share_amount <= 0)) { setError("Choose a friend and positive share for every participant."); return; }
        if (sharesTotal > Number(form.total_amount)) { setError("Friend shares cannot exceed the total bill amount."); return; }
        setSaving(true); setError("");
        try { if (bill) await SplitAPI.updateBill(bill.id, form); else await SplitAPI.createBill(form); toast({ title: bill ? `${form.title} updated` : `${form.title} saved` }); onSaved(); }
        catch (requestError) { setError(apiErrorMessage(requestError, "We couldn’t save this split bill.")); }
        finally { setSaving(false); }
    };
    return <DialogShell title={bill ? "Edit split bill" : "Add a split bill"} description="Record who owes whom without changing the original transaction." onClose={onClose}>
        <form onSubmit={submit}><div className="space-y-6 p-6">
            <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 sm:col-span-2"><span className="text-xs font-bold text-zinc-500">Bill title</span><input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Dinner at Social" className={fieldClass} /></label><label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Total amount</span><input required min="0.01" step="0.01" type="number" value={form.total_amount || ""} onChange={(event) => setForm({ ...form, total_amount: Number(event.target.value) })} className={fieldClass} /></label><label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Date</span><input required type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} className={fieldClass} /></label><label className="space-y-2 sm:col-span-2"><span className="text-xs font-bold text-zinc-500">Group <span className="font-normal text-zinc-400">optional</span></span><select value={form.group_id || ""} onChange={(event) => chooseGroup(event.target.value)} className={fieldClass}><option value="">No group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label></div>
            <div><div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-bold">Friend shares</p><p className="text-xs text-zinc-400">{formatMoney(sharesTotal)} of {formatMoney(form.total_amount)}</p></div><button type="button" onClick={splitEqually} className="inline-flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-2 text-xs font-bold text-accent"><Equal className="h-4 w-4" /> Equal shares</button></div>
                <div className="space-y-3">{form.participants.map((participant, index) => <div key={index} className="grid gap-2 rounded-2xl border border-border p-3 sm:grid-cols-[1fr_130px_170px_auto]">
                    <select required value={participant.friend_id || ""} onChange={(event) => updateParticipant(index, { friend_id: Number(event.target.value) })} className={fieldClass}><option value="">Choose friend</option>{friends.map((friend) => <option key={friend.id} value={friend.id}>{friend.name}</option>)}</select>
                    <input required min="0.01" step="0.01" type="number" aria-label={`Share amount ${index + 1}`} value={participant.share_amount || ""} onChange={(event) => updateParticipant(index, { share_amount: Number(event.target.value) })} placeholder="Share" className={fieldClass} />
                    <select value={participant.direction} onChange={(event) => updateParticipant(index, { direction: event.target.value as SplitDirection })} aria-label={`Share direction ${index + 1}`} className={fieldClass}><option value="friend_owes_user">Owes me</option><option value="user_owes_friend">I owe them</option></select>
                    <button type="button" disabled={form.participants.length === 1} onClick={() => setForm({ ...form, participants: form.participants.filter((_, itemIndex) => itemIndex !== index) })} className="grid h-11 w-11 place-items-center rounded-xl text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-30" aria-label={`Remove participant ${index + 1}`}><Trash2 className="h-4 w-4" /></button>
                </div>)}</div>
                <button type="button" onClick={() => setForm({ ...form, participants: [...form.participants, emptyParticipant()] })} className="mt-3 inline-flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-xs font-bold text-zinc-500"><Plus className="h-4 w-4" /> Add friend share</button>
            </div>
            <label className="space-y-2"><span className="text-xs font-bold text-zinc-500">Notes <span className="font-normal text-zinc-400">optional</span></span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} className={fieldClass} /></label>
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30">{error}</p>}
        </div><DialogActions saving={saving} label={bill ? "Save changes" : "Save split bill"} onClose={onClose} /></form>
    </DialogShell>;
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
            <label className="space-y-2 sm:col-span-2"><span className="text-xs font-bold text-zinc-500">What happened?</span><select value={form.direction} onChange={(event) => setForm({ ...form, direction: event.target.value as SettlementDirection })} className={fieldClass}><option value="friend_paid_user">Friend paid me</option><option value="user_paid_friend">I paid friend</option></select></label>
            <label className="space-y-2 sm:col-span-2"><span className="text-xs font-bold text-zinc-500">Notes <span className="font-normal text-zinc-400">optional</span></span><textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} className={fieldClass} /></label>
            {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 sm:col-span-2">{error}</p>}
        </div><DialogActions saving={saving} label="Record settlement" onClose={onClose} /></form>
    </DialogShell>;
}
