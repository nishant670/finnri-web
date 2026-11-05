"use client";

import React from "react";
import { Equal, Plus, Trash2, Users } from "lucide-react";
import { EntrySplitInput, SplitDirection, SplitFriend, SplitGroup } from "@/app/lib/api";

const fieldClass = "h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10";

export default function InlineSplitEditor({ amount, friends, groups, value, onChange }: { amount: number; friends: SplitFriend[]; groups: SplitGroup[]; value: EntrySplitInput | null; onChange: (value: EntrySplitInput | null) => void }) {
    const participants = value?.participants || [];
    const setParticipants = (next: EntrySplitInput["participants"]) => onChange({ ...(value || {}), participants: next });
    const addParticipant = () => setParticipants([...participants, { friend_id: undefined, share_amount: 0, direction: "friend_owes_user" }]);
    const updateParticipant = (index: number, patch: Partial<EntrySplitInput["participants"][number]>) => setParticipants(participants.map((participant, itemIndex) => itemIndex === index ? { ...participant, ...patch } : participant));
    const chooseGroup = (raw: string) => {
        const groupID = raw ? Number(raw) : undefined;
        const group = groups.find((item) => item.id === groupID);
        const share = group?.members?.length && amount ? Number((amount / (group.members.length + 1)).toFixed(2)) : 0;
        onChange({ group_id: groupID, participants: group?.members?.map((member) => ({ friend_id: member.friend_id, share_amount: share, direction: "friend_owes_user" as SplitDirection })) || participants });
    };
    const splitEqually = () => {
        const share = participants.length && amount ? Number((amount / (participants.length + 1)).toFixed(2)) : 0;
        setParticipants(participants.map((participant) => ({ ...participant, share_amount: share })));
    };

    return <section className="rounded-2xl border border-border bg-track/60 p-4">
        <label className="flex cursor-pointer items-start gap-3"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked ? { participants: [{ friend_id: undefined, share_amount: 0, direction: "friend_owes_user" }] } : null)} className="mt-1 h-4 w-4 accent-[var(--accent)]" /><span><span className="block text-[15px] font-semibold">Split this expense</span><span className="block text-[13px] text-muted">Saves the transaction and its split bill together.</span></span></label>
        {value && <div className="mt-4 space-y-3 border-t border-border pt-4">
            {friends.length === 0 ? <p className="rounded-xl bg-card p-3 text-[13px] text-muted">Add friends in the Finnri app first, then split with them here.</p> : <>
                {groups.length > 0 && <label className="block"><span className="flex items-center gap-1.5 text-sm font-semibold text-muted"><Users className="h-4 w-4" /> Group</span><select value={value.group_id || ""} onChange={(event) => chooseGroup(event.target.value)} className={`${fieldClass} mt-1`}><option value="">No group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>}
                <div className="flex items-center justify-between"><p className="text-sm font-semibold text-muted">Shares</p><button type="button" onClick={splitEqually} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[13px] font-bold hover:bg-track"><Equal className="h-3.5 w-3.5" /> Split equally</button></div>
                <div className="space-y-2">{participants.map((participant, index) => <div key={index} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[1fr_110px_120px_auto]">
                    <select value={participant.friend_id || ""} onChange={(event) => updateParticipant(index, { friend_id: Number(event.target.value) || undefined })} aria-label={`Split friend ${index + 1}`} className={`${fieldClass} max-sm:col-span-2`}><option value="">Choose a friend</option>{friends.map((friend) => <option key={friend.id} value={friend.id}>{friend.name}</option>)}</select>
                    <input type="number" min="0.01" step="0.01" value={participant.share_amount || ""} onChange={(event) => updateParticipant(index, { share_amount: Number(event.target.value) })} aria-label={`Split share ${index + 1}`} placeholder="₹ share" className={`${fieldClass} tabular-nums`} />
                    <select value={participant.direction} onChange={(event) => updateParticipant(index, { direction: event.target.value as SplitDirection })} aria-label={`Split direction ${index + 1}`} className={`${fieldClass} max-sm:col-start-1`}><option value="friend_owes_user">Owes me</option><option value="user_owes_friend">I owe</option></select>
                    <button type="button" disabled={participants.length === 1} onClick={() => setParticipants(participants.filter((_, itemIndex) => itemIndex !== index))} className="grid h-11 w-11 place-items-center rounded-full text-muted hover:bg-negative/10 hover:text-negative disabled:opacity-30" aria-label={`Remove split friend ${index + 1}`}><Trash2 className="h-4 w-4" /></button>
                </div>)}</div>
                <button type="button" onClick={addParticipant} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-border bg-card px-3 text-[13px] font-semibold hover:border-accent hover:bg-selected"><Plus className="h-3.5 w-3.5 text-accent" /> Add a friend</button>
            </>}
        </div>}
    </section>;
}
