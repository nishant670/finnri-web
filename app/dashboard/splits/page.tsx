"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, CircleAlert, HandCoins, Loader2, Pencil, Plus, ReceiptText, RefreshCw, Scale, Trash2, UserPlus, Users, WalletCards } from "lucide-react";
import { BillDialog, FriendDialog, GroupDialog, SettlementDialog } from "@/app/components/dashboard/SplitDialogs";
import { apiErrorMessage, SplitActivityItem, SplitAPI, SplitBalance, SplitBill, SplitFriend, SplitGroup, SplitSettlement } from "@/app/lib/api";
import { formatDate, formatMoney } from "@/app/lib/format";
import { cn } from "@/app/lib/utils";
import ConfirmDialog from "@/app/components/ui/ConfirmDialog";
import { useToast } from "@/app/components/ui/Toast";
import { PageSkeleton } from "@/app/components/ui/Skeleton";

type SplitSection = "friends" | "groups" | "bills" | "settlements" | "balances" | "activity";
type SectionErrors = Partial<Record<SplitSection, string>>;
const ACTIVITY_PAGE_SIZE = 10;

function ActivityIcon({ type }: { type: SplitActivityItem["type"] }) {
    if (type === "bill") return <ReceiptText className="h-4 w-4" />;
    if (type === "settlement") return <HandCoins className="h-4 w-4" />;
    if (type === "group_created") return <Users className="h-4 w-4" />;
    return <UserPlus className="h-4 w-4" />;
}

/**
 * A settlement is written from its author's side, so the claim has to be turned
 * around before it is read back to the person being asked about it:
 * `friend_paid_user` is the author saying *you* paid *them*.
 */
function settlementClaim(settlement: SplitSettlement) {
    const who = settlement.recorded_by_name?.trim() || "Someone";
    const amount = formatMoney(settlement.amount);
    if (settlement.direction === "friend_paid_user") return `${who} says you paid them ${amount}.`;
    if (settlement.direction === "user_paid_friend") return `${who} says they paid you ${amount}.`;
    return `${who} recorded a settlement of ${amount}.`;
}

/** "Pending" and "denied" only: a confirmed settlement is just a settlement. */
function SettlementStatusChip({ status }: { status?: SplitSettlement["status"] }) {
    if (!status || status === "confirmed") return null;
    const denied = status === "denied";
    return <span className={cn("ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold", denied ? "bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300" : "bg-accent/10 text-accent")}>{denied ? "Denied" : "Awaiting confirmation"}</span>;
}

function SectionError({ message, onRetry }: { message?: string; onRetry: () => void }) {
    if (!message) return null;
    return <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"><div className="flex items-start gap-2"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>{message}</p></div><button type="button" onClick={onRetry} className="mt-2 text-xs font-bold underline">Try this section again</button></div>;
}

function BalanceCard({ balance, onSettle }: { balance: SplitBalance; onSettle: (friend: SplitFriend) => void }) {
    const positive = balance.net_balance > 0;
    const settled = balance.net_balance === 0;
    return <article className="rounded-panel border border-border bg-white p-5 dark:bg-zinc-900">
        <div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-accent/10 font-bold text-accent">{balance.friend.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><h3 className="truncate font-bold">{balance.friend.name}</h3><p className="mt-1 text-xs text-zinc-400">{balance.friend.email || balance.friend.phone || "Private contact"}</p></div></div>
        <div className="mt-5 flex items-end justify-between border-t border-border pt-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-400">{settled ? "All settled" : positive ? "Owes you" : "You owe"}</p><p className={cn("mt-1 text-xl font-bold font-rounded", settled ? "text-zinc-400" : positive ? "text-emerald-600" : "text-amber-600")}>{formatMoney(Math.abs(balance.net_balance))}</p></div>{!settled && <button onClick={() => onSettle(balance.friend)} className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-accent/10 hover:text-accent dark:bg-zinc-800">Settle</button>}</div>
    </article>;
}

export default function SplitsScreen() {
    const { toast } = useToast();
    const [friends, setFriends] = useState<SplitFriend[]>([]);
    const [groups, setGroups] = useState<SplitGroup[]>([]);
    const [bills, setBills] = useState<SplitBill[]>([]);
    const [settlements, setSettlements] = useState<SplitSettlement[]>([]);
    // Settlements somebody else recorded against this user. A settlement moves
    // both ledgers on one person's word, and the person it names has to be able
    // to answer it from whichever surface they are on — not only the app.
    const [settlementRequests, setSettlementRequests] = useState<SplitSettlement[]>([]);
    const [decidingSettlementID, setDecidingSettlementID] = useState<number | null>(null);
    const [balances, setBalances] = useState<SplitBalance[]>([]);
    const [activity, setActivity] = useState<SplitActivityItem[]>([]);
    const [activityPage, setActivityPage] = useState(1);
    const [activityTotal, setActivityTotal] = useState(0);
    const [activityLoading, setActivityLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [actionError, setActionError] = useState("");
    const [sectionErrors, setSectionErrors] = useState<SectionErrors>({});
    const [friendDialog, setFriendDialog] = useState<SplitFriend | null | undefined>(undefined);
    const [groupDialog, setGroupDialog] = useState<SplitGroup | null | undefined>(undefined);
    const [billDialog, setBillDialog] = useState<SplitBill | null | undefined>(undefined);
    const [settlementFriend, setSettlementFriend] = useState<SplitFriend | null | undefined>(undefined);
    const [confirmTarget, setConfirmTarget] = useState<{ kind: "friend"; item: SplitFriend } | { kind: "group"; item: SplitGroup } | { kind: "bill"; item: SplitBill } | null>(null);

    const loadSplits = useCallback(async () => {
        setLoading(true);
        setActionError("");
        const [friendResult, groupResult, billResult, settlementResult, balanceResult, activityResult, pendingResult] = await Promise.allSettled([
            SplitAPI.listFriends(), SplitAPI.listGroups(), SplitAPI.listBills(), SplitAPI.listSettlements(), SplitAPI.balances(), SplitAPI.activity(1, ACTIVITY_PAGE_SIZE), SplitAPI.pendingSettlements(),
        ]);
        const errors: SectionErrors = {};
        if (friendResult.status === "fulfilled") setFriends(friendResult.value.data); else errors.friends = apiErrorMessage(friendResult.reason, "We couldn’t load friends.");
        if (groupResult.status === "fulfilled") setGroups(groupResult.value.data); else errors.groups = apiErrorMessage(groupResult.reason, "We couldn’t load groups.");
        if (billResult.status === "fulfilled") setBills(billResult.value.data); else errors.bills = apiErrorMessage(billResult.reason, "We couldn’t load split bills.");
        if (settlementResult.status === "fulfilled") setSettlements(settlementResult.value.data); else errors.settlements = apiErrorMessage(settlementResult.reason, "We couldn’t load settlements.");
        if (balanceResult.status === "fulfilled") setBalances(balanceResult.value.data); else errors.balances = apiErrorMessage(balanceResult.reason, "We couldn’t calculate split balances.");
        if (activityResult.status === "fulfilled") {
            setActivity(activityResult.value.data.items);
            setActivityPage(activityResult.value.data.page);
            setActivityTotal(activityResult.value.data.total);
        } else errors.activity = apiErrorMessage(activityResult.reason, "We couldn’t load split activity.");
        // No section error of its own: a prompt that fails to load is a missing
        // prompt, not a broken ledger, and it reappears on the next refresh.
        if (pendingResult.status === "fulfilled") setSettlementRequests(pendingResult.value.data.settlements ?? []);
        setSectionErrors(errors);
        setLoading(false);
        setHasLoaded(true);
    }, []);

    const loadActivityPage = useCallback(async (page: number) => {
        setActivityLoading(true);
        setSectionErrors((current) => ({ ...current, activity: undefined }));
        try {
            const response = await SplitAPI.activity(page, ACTIVITY_PAGE_SIZE);
            setActivity(response.data.items);
            setActivityPage(response.data.page);
            setActivityTotal(response.data.total);
        } catch (requestError) {
            setSectionErrors((current) => ({ ...current, activity: apiErrorMessage(requestError, "We couldn’t load that activity page.") }));
        } finally { setActivityLoading(false); }
    }, []);

    useEffect(() => { void loadSplits(); }, [loadSplits]);

    const totals = useMemo(() => balances.reduce((summary, balance) => {
        if (balance.net_balance > 0) summary.owedToYou += balance.net_balance;
        if (balance.net_balance < 0) summary.youOwe += Math.abs(balance.net_balance);
        return summary;
    }, { owedToYou: 0, youOwe: 0 }), [balances]);
    const activityPages = Math.max(1, Math.ceil(activityTotal / ACTIVITY_PAGE_SIZE));
    const activityStart = activityTotal ? (activityPage - 1) * ACTIVITY_PAGE_SIZE + 1 : 0;
    const activityEnd = Math.min(activityPage * ACTIVITY_PAGE_SIZE, activityTotal);
    const closeAndReload = () => { setFriendDialog(undefined); setGroupDialog(undefined); setBillDialog(undefined); setSettlementFriend(undefined); void loadSplits(); };

    const archiveFriend = async (friend: SplitFriend, confirmed = false) => {
        if (!confirmed) { setConfirmTarget({ kind: "friend", item: friend }); return; }
        try { await SplitAPI.archiveFriend(friend.id); toast({ title: `${friend.name} archived` }); setConfirmTarget(null); await loadSplits(); } catch (requestError) { setActionError(apiErrorMessage(requestError, "We couldn’t archive this friend.")); }
    };
    const archiveGroup = async (group: SplitGroup, confirmed = false) => {
        if (!confirmed) { setConfirmTarget({ kind: "group", item: group }); return; }
        try { await SplitAPI.archiveGroup(group.id); toast({ title: `${group.name} archived` }); setConfirmTarget(null); await loadSplits(); } catch (requestError) { setActionError(apiErrorMessage(requestError, "We couldn’t archive this group.")); }
    };
    /**
     * Answer a settlement somebody recorded against this user. Dropped from the
     * list before the reload lands: the one thing that must not happen after a
     * click is the same question being asked again. A 404 or 409 means somebody
     * already answered it, which from here is the same outcome — it is gone.
     */
    const decideSettlement = async (settlement: SplitSettlement, decision: "confirm" | "deny") => {
        if (decidingSettlementID) return;
        setDecidingSettlementID(settlement.id);
        try {
            await SplitAPI.decideSettlement(settlement.id, decision);
            setSettlementRequests((current) => current.filter((row) => row.id !== settlement.id));
            toast({ title: decision === "confirm" ? "Settlement confirmed" : "Settlement denied" });
            await loadSplits();
        } catch (requestError) {
            setActionError(apiErrorMessage(requestError, "We couldn’t record that decision."));
        } finally { setDecidingSettlementID(null); }
    };

    const deleteBill = async (bill: SplitBill, confirmed = false) => {
        if (!confirmed) { setConfirmTarget({ kind: "bill", item: bill }); return; }
        try { await SplitAPI.deleteBill(bill.id); toast({ title: `${bill.title} deleted` }); setConfirmTarget(null); await loadSplits(); } catch (requestError) { setActionError(apiErrorMessage(requestError, "We couldn’t delete this split bill.")); }
    };

    return <>
        <div className="space-y-7 pb-12">
            <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Shared expenses</p><h1 className="mt-2 text-3xl font-bold tracking-tight font-rounded sm:text-4xl">Know exactly who owes whom.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">Track friends, groups, shared bills, balances, and real settlements from one private ledger.</p></div><div className="flex flex-wrap gap-3"><button onClick={() => void loadSplits()} disabled={loading} className="grid h-12 w-12 place-items-center rounded-2xl border border-border bg-white text-zinc-500 disabled:opacity-50 dark:bg-zinc-900" aria-label="Refresh split ledger"><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /></button><button onClick={() => setSettlementFriend(null)} disabled={!friends.length} className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-border bg-white px-5 text-sm font-bold text-zinc-600 disabled:opacity-40 dark:bg-zinc-900 dark:text-zinc-300"><HandCoins className="h-4 w-4" /> Record settlement</button><button onClick={() => setBillDialog(null)} disabled={!friends.length} className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-accent px-5 text-sm font-bold text-zinc-950 shadow-lg shadow-accent/20 disabled:opacity-40"><Plus className="h-4 w-4" /> Add split bill</button></div></header>
            {actionError && <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300"><CircleAlert className="mt-0.5 h-5 w-5 shrink-0" /><p>{actionError}</p></div>}
            <nav className="flex flex-wrap gap-2 rounded-2xl border border-border bg-white p-2 dark:bg-zinc-900" aria-label="Split ledger sections">{[["balances", "Balances"], ["activity", "Activity"], ["settlements", "Settlements"], ["friends", "Friends"], ["groups", "Groups"], ["bills", "Bills"]].map(([id, label]) => <a key={id} href={`#${id}`} className="rounded-xl px-3 py-2 text-xs font-bold text-zinc-500 hover:bg-accent/10 hover:text-accent">{label}</a>)}</nav>
            {settlementRequests.length > 0 && <section aria-label="Settlements awaiting your decision" className="space-y-3">{settlementRequests.map((settlement) => <article key={settlement.id} className="flex flex-wrap items-center gap-4 rounded-panel border border-accent bg-accent/5 p-5"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent"><HandCoins className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold">Confirm this settlement</p><p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{settlementClaim(settlement)}</p><p className="mt-1 text-xs text-zinc-400">It is already counted in your balance. Deny it and the balance goes back.{settlement.group_name ? ` · ${settlement.group_name}` : ""}</p></div><div className="flex gap-2"><button onClick={() => void decideSettlement(settlement, "deny")} disabled={decidingSettlementID === settlement.id} className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-border bg-white px-4 text-sm font-bold text-red-600 disabled:opacity-50 dark:bg-zinc-900">Deny</button><button onClick={() => void decideSettlement(settlement, "confirm")} disabled={decidingSettlementID === settlement.id} className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-accent px-4 text-sm font-bold text-zinc-950 disabled:opacity-50">Confirm</button></div></article>)}</section>}
            <section className="grid gap-4 md:grid-cols-3"><article className="rounded-panel bg-zinc-950 p-6 text-white"><ArrowDownLeft className="h-5 w-5 text-emerald-400" /><p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-zinc-500">Owed to you</p><p className="mt-2 text-3xl font-bold font-rounded">{formatMoney(totals.owedToYou)}</p></article><article className="rounded-panel border border-border bg-white p-6 dark:bg-zinc-900"><ArrowUpRight className="h-5 w-5 text-amber-500" /><p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">You owe</p><p className="mt-2 text-3xl font-bold font-rounded">{formatMoney(totals.youOwe)}</p></article><article className="rounded-panel border border-border bg-white p-6 dark:bg-zinc-900"><Scale className="h-5 w-5 text-accent" /><p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">Net position</p><p className="mt-2 text-3xl font-bold font-rounded">{formatMoney(totals.owedToYou - totals.youOwe)}</p><p className="mt-2 text-xs text-zinc-400">Across {friends.length} active friend{friends.length === 1 ? "" : "s"}</p></article></section>

            {loading && !hasLoaded ? <PageSkeleton /> : <>
                <section id="balances" className="scroll-mt-24"><div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Balances</p><h2 className="mt-1 text-2xl font-bold font-rounded">Settle without guesswork</h2></div><SectionError message={sectionErrors.balances} onRetry={() => void loadSplits()} />{!sectionErrors.balances && (balances.length === 0 ? <div className="rounded-panel border border-dashed border-border p-10 text-center"><WalletCards className="mx-auto h-8 w-8 text-zinc-300" /><h3 className="mt-4 font-bold">No balances yet</h3><p className="mt-2 text-sm text-zinc-500">Add friends and record your first shared bill.</p></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{balances.map((balance) => <BalanceCard key={balance.friend.id} balance={balance} onSettle={(friend) => setSettlementFriend(friend)} />)}</div>)}</section>
                <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
                    <section id="activity" className="scroll-mt-24 rounded-panel border border-border bg-white p-6 dark:bg-zinc-900 sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Ledger</p><h2 className="mt-1 text-2xl font-bold font-rounded">Activity</h2></div><span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-bold text-zinc-500 dark:bg-zinc-800">{activityStart}–{activityEnd} of {activityTotal}</span></div><SectionError message={sectionErrors.activity} onRetry={() => void loadActivityPage(activityPage)} />{activityLoading ? <Loader2 className="mx-auto mt-10 h-6 w-6 animate-spin text-accent" /> : !sectionErrors.activity && (activity.length === 0 ? <p className="mt-8 rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-400 dark:bg-zinc-800">Your split activity will appear here.</p> : <div className="mt-6 divide-y divide-border">{activity.map((item) => <article key={item.id} className="flex gap-4 py-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent"><ActivityIcon type={item.type} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-bold">{item.title}</h3><p className="mt-1 text-xs text-zinc-400">{formatDate(item.date)}{item.participant_count ? ` · ${item.participant_count} friend${item.participant_count === 1 ? "" : "s"}` : ""}</p></div>{typeof item.amount === "number" && <p className="text-sm font-bold">{formatMoney(item.amount)}</p>}</div>{item.notes && <p className="mt-2 text-xs leading-5 text-zinc-500">{item.notes}</p>}</div></article>)}</div>)}<div className="mt-5 flex items-center justify-between border-t border-border pt-4"><button type="button" onClick={() => void loadActivityPage(activityPage - 1)} disabled={activityLoading || activityPage <= 1} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-zinc-500 disabled:opacity-35"><ArrowLeft className="h-4 w-4" />Previous</button><span className="text-xs font-semibold text-zinc-400">Page {activityPage} of {activityPages}</span><button type="button" onClick={() => void loadActivityPage(activityPage + 1)} disabled={activityLoading || activityPage >= activityPages} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-zinc-500 disabled:opacity-35">Next<ArrowRight className="h-4 w-4" /></button></div></section>
                    <section id="friends" className="scroll-mt-24 rounded-panel border border-border bg-white p-6 dark:bg-zinc-900 sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">People</p><h2 className="mt-1 text-2xl font-bold font-rounded">Friends</h2></div><button onClick={() => setFriendDialog(null)} className="inline-flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-2 text-xs font-bold text-accent"><UserPlus className="h-4 w-4" /> Add</button></div><SectionError message={sectionErrors.friends} onRetry={() => void loadSplits()} />{!sectionErrors.friends && (friends.length === 0 ? <p className="mt-6 rounded-2xl bg-zinc-50 p-6 text-center text-sm text-zinc-400 dark:bg-zinc-800">Add your first friend to start splitting.</p> : <div className="mt-5 space-y-2">{friends.map((friend) => <div key={friend.id} className="flex items-center gap-3 rounded-2xl border border-border p-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-zinc-100 text-xs font-bold dark:bg-zinc-800">{friend.name.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{friend.name}</p><p className="truncate text-[11px] text-zinc-400">{friend.email || friend.phone || "No contact details"}</p></div><button onClick={() => setFriendDialog(friend)} className="rounded-lg p-2 text-zinc-400 hover:text-accent" aria-label={`Edit ${friend.name}`}><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => void archiveFriend(friend)} className="rounded-lg p-2 text-zinc-400 hover:text-red-600" aria-label={`Archive ${friend.name}`}><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div>)}</section>
                </div>
                <section id="settlements" className="scroll-mt-24 rounded-panel border border-border bg-white p-6 dark:bg-zinc-900 sm:p-8"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Money returned</p><h2 className="mt-1 text-2xl font-bold font-rounded">Settlements</h2><p className="mt-1 text-sm text-zinc-500">Every recorded payment that changes the split balance.</p></div><span className="text-xs font-bold text-zinc-400">{settlements.length} recorded</span></div><SectionError message={sectionErrors.settlements} onRetry={() => void loadSplits()} />{!sectionErrors.settlements && (settlements.length === 0 ? <p className="mt-6 rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-400 dark:bg-zinc-800">No settlements recorded yet.</p> : <div className="mt-5 divide-y divide-border">{settlements.map((settlement) => <article key={settlement.id} className="flex flex-wrap items-center gap-4 py-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/30"><HandCoins className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold">{settlement.friend.name}</p><p className="mt-1 text-xs text-zinc-400">{formatDate(settlement.date)} · {settlement.direction === "friend_paid_user" ? `${settlement.friend.name} paid you` : `You paid ${settlement.friend.name}`}<SettlementStatusChip status={settlement.status} /></p>{settlement.notes && <p className="mt-1 text-xs text-zinc-500">{settlement.notes}</p>}</div><p className="text-sm font-bold">{formatMoney(settlement.amount)}</p></article>)}</div>)}</section>
                <section className="grid gap-6 xl:grid-cols-2">
                    <div id="groups" className="scroll-mt-24 rounded-panel border border-border bg-white p-6 dark:bg-zinc-900 sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Circles</p><h2 className="mt-1 text-2xl font-bold font-rounded">Groups</h2></div><button onClick={() => setGroupDialog(null)} disabled={!friends.length} className="inline-flex items-center gap-2 rounded-xl bg-accent/10 px-3 py-2 text-xs font-bold text-accent disabled:opacity-40"><Plus className="h-4 w-4" /> Create</button></div><SectionError message={sectionErrors.groups} onRetry={() => void loadSplits()} />{!sectionErrors.groups && (groups.length === 0 ? <p className="mt-6 rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-400 dark:bg-zinc-800">No groups yet. Create one for trips, households, or regular crews.</p> : <div className="mt-5 grid gap-3 sm:grid-cols-2">{groups.map((group) => <article key={group.id} className="rounded-2xl border border-border p-4"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/30"><Users className="h-4 w-4" /></span><div><button onClick={() => setGroupDialog(group)} className="rounded-lg p-2 text-zinc-400 hover:text-accent" aria-label={`Edit ${group.name}`}><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => void archiveGroup(group)} className="rounded-lg p-2 text-zinc-400 hover:text-red-600" aria-label={`Archive ${group.name}`}><Trash2 className="h-3.5 w-3.5" /></button></div></div><h3 className="mt-4 font-bold">{group.name}</h3><p className="mt-1 text-xs text-zinc-400">{group.members?.map((member) => member.friend.name).join(", ") || "No members"}</p></article>)}</div>)}</div>
                    <div id="bills" className="scroll-mt-24 rounded-panel border border-border bg-white p-6 dark:bg-zinc-900 sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Shared bills</p><h2 className="mt-1 text-2xl font-bold font-rounded">Bills</h2></div><span className="text-xs font-bold text-zinc-400">{bills.length} total</span></div><SectionError message={sectionErrors.bills} onRetry={() => void loadSplits()} />{!sectionErrors.bills && (bills.length === 0 ? <p className="mt-6 rounded-2xl bg-zinc-50 p-8 text-center text-sm text-zinc-400 dark:bg-zinc-800">No split bills recorded.</p> : <div className="mt-5 divide-y divide-border">{bills.map((bill) => <article key={bill.id} className="flex items-center gap-3 py-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"><ReceiptText className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{bill.title}</p><p className="mt-1 text-xs text-zinc-400">{formatDate(bill.date)} · {bill.participants.length} share{bill.participants.length === 1 ? "" : "s"}{bill.group ? ` · ${bill.group.name}` : ""}</p></div><p className="text-sm font-bold">{formatMoney(bill.total_amount)}</p><button onClick={() => setBillDialog(bill)} className="rounded-lg p-2 text-zinc-400 hover:text-accent" aria-label={`Edit ${bill.title}`}><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => void deleteBill(bill)} className="rounded-lg p-2 text-zinc-400 hover:text-red-600" aria-label={`Delete ${bill.title}`}><Trash2 className="h-3.5 w-3.5" /></button></article>)}</div>)}</div>
                </section>
                <aside className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-200"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /><p>Balances are calculated from recorded split shares and listed settlements. FINNRI does not move money. Recording a settlement against a friend who has a Finnri account notifies them, and it counts until they confirm or deny it.</p></aside>
            </>}
        </div>
        {friendDialog !== undefined && <FriendDialog friend={friendDialog || undefined} onClose={() => setFriendDialog(undefined)} onSaved={closeAndReload} />}
        {groupDialog !== undefined && <GroupDialog group={groupDialog || undefined} friends={friends} onClose={() => setGroupDialog(undefined)} onSaved={closeAndReload} />}
        {billDialog !== undefined && <BillDialog bill={billDialog || undefined} friends={friends} groups={groups} onClose={() => setBillDialog(undefined)} onSaved={closeAndReload} />}
        {settlementFriend !== undefined && <SettlementDialog friends={friends} suggestedFriend={settlementFriend || undefined} onClose={() => setSettlementFriend(undefined)} onSaved={closeAndReload} />}
        <ConfirmDialog open={Boolean(confirmTarget)} title={confirmTarget?.kind === "bill" ? `Delete ${confirmTarget.item.title}?` : `Archive ${confirmTarget?.item.name || "item"}?`} description={confirmTarget?.kind === "friend" ? "Existing bills and balances remain in history, but this friend will no longer be available for new splits." : confirmTarget?.kind === "group" ? "Existing bills remain in history, but this group will no longer be available for new splits." : "This permanently removes the split bill and changes the balances it created."} confirmLabel={confirmTarget?.kind === "bill" ? "Delete bill" : "Archive"} onClose={() => setConfirmTarget(null)} onConfirm={() => { if (confirmTarget?.kind === "friend") return archiveFriend(confirmTarget.item, true); if (confirmTarget?.kind === "group") return archiveGroup(confirmTarget.item, true); if (confirmTarget?.kind === "bill") return deleteBill(confirmTarget.item, true); }} />
    </>;
}
