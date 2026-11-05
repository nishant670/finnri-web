"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, HandCoins, ReceiptText, RefreshCw, Users } from "lucide-react";
import { SettlementDialog } from "@/app/components/dashboard/SplitDialogs";
import { buttonPrimary, buttonSecondary, EmptyPanel, ErrorNotice, iconButton, Monogram, PageHeader, Panel, Segmented } from "@/app/components/dashboard/kit";
import { apiErrorMessage, SplitActivityItem, SplitAPI, SplitBalance, SplitBill, SplitFriend, SplitGroup, SplitSettlement } from "@/app/lib/api";
import { formatDate, formatMoney, formatRupees } from "@/app/lib/format";
import { billNet, billPeople, byMonth, groupBalance, groupLedger, personLedger, settlementEffect, type LedgerEntry, type LedgerSettlement } from "@/app/lib/split-ledger";
import { readJoinedGroupID, withoutJoinedGroup } from "@/app/lib/split-invite";
import { cn } from "@/app/lib/utils";
import { useToast } from "@/app/components/ui/Toast";
import { PageSkeleton } from "@/app/components/ui/Skeleton";

type Tab = "people" | "groups" | "activity";
type Selection = { kind: "person"; id: number } | { kind: "group"; id: number } | null;
const TABS = [{ value: "people", label: "People" }, { value: "groups", label: "Groups" }, { value: "activity", label: "Activity" }] as const;
const ACTIVITY_STEP = 30;

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

/** "+₹4,250", "−₹650" or "Settled", coloured by which way the money points. */
function Balance({ amount, className }: { amount: number; className?: string }) {
    const rounded = Math.round(amount * 100) / 100;
    if (rounded === 0) return <span className={cn("font-semibold text-muted", className)}>Settled</span>;
    return <span className={cn("font-bold tabular-nums", rounded > 0 ? "text-positive" : "text-warning", className)}>{rounded > 0 ? "+" : "−"}{formatMoney(Math.abs(rounded))}</span>;
}

function balanceWords(amount: number) {
    if (Math.round(amount) === 0) return "All settled";
    return amount > 0 ? `Owes you ${formatMoney(amount)}` : `You owe ${formatMoney(-amount)}`;
}

function ListRow({ selected, onSelect, leading, title, sub, amount }: { selected: boolean; onSelect: () => void; leading: React.ReactNode; title: string; sub: string; amount: number }) {
    return (
        <button type="button" onClick={onSelect} aria-current={selected ? "true" : undefined} className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition-colors sm:px-5", selected ? "bg-selected" : "hover:bg-track")}>
            {leading}
            <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold">{title}</span><span className="block truncate text-[13px] text-muted">{sub}</span></span>
            <Balance amount={amount} className="shrink-0 text-[15px]" />
        </button>
    );
}

function LedgerList({ entries, emptyLabel }: { entries: LedgerEntry[]; emptyLabel: string }) {
    if (!entries.length) return <p className="px-5 py-10 text-center text-sm text-muted">{emptyLabel}</p>;
    return (
        <div>
            {byMonth(entries).map((month) => (
                <section key={month.month} aria-label={month.label}>
                    <h3 className="sticky top-0 z-[1] border-b border-border bg-card px-4 py-2 text-[13px] font-bold text-muted sm:px-5">{month.label}</h3>
                    <ul className="divide-y divide-border">
                        {month.entries.map((entry) => (
                            <li key={entry.key} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-[10px]", entry.kind === "bill" ? "bg-track text-muted" : "bg-selected text-accent")}>{entry.kind === "bill" ? <ReceiptText className="h-[18px] w-[18px]" strokeWidth={1.8} /> : <HandCoins className="h-[18px] w-[18px]" strokeWidth={1.8} />}</span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[15px] font-semibold">{entry.title}{entry.status && entry.status !== "confirmed" ? <span className={cn("ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold", entry.status === "denied" ? "bg-negative/10 text-negative" : "bg-warning-surface text-warning")}>{entry.status === "denied" ? "Denied" : "Awaiting confirmation"}</span> : null}</span>
                                    <span className="block truncate text-[13px] text-muted">{formatDate(entry.date)} · {entry.detail}{entry.kind === "bill" ? ` · bill ${formatMoney(entry.amount)}` : ""}</span>
                                </span>
                                <Balance amount={entry.effect} className="shrink-0 text-[15px]" />
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    );
}

const PAYMENT_PAGE_SIZE = 100;
const PAYMENT_PAGE_LIMIT = 20;

/** Every settlement row in the activity feed, a page at a time (the API caps a page at 100). */
async function loadAllPayments() {
    const items: SplitActivityItem[] = [];
    for (let page = 1; page <= PAYMENT_PAGE_LIMIT; page += 1) {
        const response = await SplitAPI.activity(page, PAYMENT_PAGE_SIZE, { type: "settlement" });
        items.push(...response.data.items.filter((item) => item.type === "settlement"));
        if (page * PAYMENT_PAGE_SIZE >= response.data.total || response.data.items.length === 0) break;
    }
    return items;
}

/** A feed payment in the ledger's terms; the feed already states it in the viewer's direction. */
function asLedgerSettlement(item: SplitActivityItem): LedgerSettlement | null {
    if (!item.friend_id || item.amount === undefined) return null;
    const direction = item.direction === "friend_paid_user" || item.direction === "user_paid_friend" ? item.direction : null;
    if (!direction) return null;
    return { id: item.record_id, friend_id: item.friend_id, amount: Number(item.amount), direction, date: item.date, status: item.status, group_name: item.group_name };
}

export default function SplitsScreen() {
    const { toast } = useToast();
    const [friends, setFriends] = useState<SplitFriend[]>([]);
    const [groups, setGroups] = useState<SplitGroup[]>([]);
    const [bills, setBills] = useState<SplitBill[]>([]);
    // Every payment between the viewer and anyone, whichever side recorded it,
    // from the activity feed: the settlement list holds only the viewer's own.
    const [payments, setPayments] = useState<SplitActivityItem[]>([]);
    const [balances, setBalances] = useState<SplitBalance[]>([]);
    // Settlements somebody else recorded against this user. A settlement moves
    // both ledgers on one person's word, and the person it names has to be able
    // to answer it from whichever surface they are on, not only the app.
    const [requests, setRequests] = useState<SplitSettlement[]>([]);
    const [deciding, setDeciding] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [error, setError] = useState("");
    const [tab, setTab] = useState<Tab>("people");
    const [selection, setSelection] = useState<Selection>(null);
    const [showSettled, setShowSettled] = useState(false);
    const [activityFilter, setActivityFilter] = useState<"all" | "bill" | "settlement">("all");
    const [activityShown, setActivityShown] = useState(ACTIVITY_STEP);
    const [settleWith, setSettleWith] = useState<{ friend: SplitFriend | null; balance?: number } | undefined>(undefined);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        const [friendResult, groupResult, billResult, settlementResult, balanceResult, pendingResult] = await Promise.allSettled([
            SplitAPI.listFriends(), SplitAPI.listGroups(), SplitAPI.listBills(), loadAllPayments(), SplitAPI.balances(), SplitAPI.pendingSettlements(),
        ]);
        const failed: string[] = [];
        if (friendResult.status === "fulfilled") setFriends(friendResult.value.data); else failed.push("friends");
        if (groupResult.status === "fulfilled") setGroups(groupResult.value.data); else failed.push("groups");
        if (billResult.status === "fulfilled") setBills(billResult.value.data); else failed.push("bills");
        if (settlementResult.status === "fulfilled") setPayments(settlementResult.value); else failed.push("payments");
        if (balanceResult.status === "fulfilled") setBalances(balanceResult.value.data); else failed.push("balances");
        // A prompt that fails to load is a missing prompt, not a broken ledger.
        if (pendingResult.status === "fulfilled") setRequests(pendingResult.value.data.settlements ?? []);
        if (failed.length) setError(`We couldn’t load your ${failed.join(", ")}. What’s shown may be incomplete.`);
        setLoading(false);
        setHasLoaded(true);
    }, []);

    useEffect(() => { void load(); }, [load]);

    // Arriving from a web invite: say the join worked and open the group,
    // then strip the param so a refresh is quiet.
    useEffect(() => {
        if (!hasLoaded) return;
        const joinedID = readJoinedGroupID(window.location.search);
        if (joinedID === null) return;
        const joined = groups.find((group) => group.id === joinedID);
        toast({ title: joined ? `You joined ${joined.name}` : "You joined the group" });
        window.history.replaceState(window.history.state, "", `${window.location.pathname}${withoutJoinedGroup(window.location.search)}`);
        if (joined) { setTab("groups"); setSelection({ kind: "group", id: joined.id }); }
    }, [hasLoaded, groups, toast]);

    const settlements = useMemo(() => payments.map(asLedgerSettlement).filter((item): item is LedgerSettlement => item !== null), [payments]);
    const people = useMemo(() => [...balances].sort((a, b) => Math.abs(b.net_balance) - Math.abs(a.net_balance)), [balances]);
    const open = people.filter((balance) => Math.round(balance.net_balance) !== 0);
    const settled = people.filter((balance) => Math.round(balance.net_balance) === 0);
    const totals = useMemo(() => balances.reduce((sum, balance) => {
        if (balance.net_balance > 0) sum.owed += balance.net_balance;
        else sum.owe += -balance.net_balance;
        return sum;
    }, { owed: 0, owe: 0 }), [balances]);
    const groupRows = useMemo(() => groups.map((group) => ({ group, balance: groupBalance(group.id, bills) })).sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)), [bills, groups]);

    // Desktop always shows a ledger, so the first row is picked by default.
    const effective: Selection = selection ?? (tab === "people" && open[0] ? { kind: "person", id: open[0].friend.id } : tab === "groups" && groupRows[0] ? { kind: "group", id: groupRows[0].group.id } : null);
    const selectedPerson = effective?.kind === "person" ? balances.find((balance) => balance.friend.id === effective.id) : undefined;
    const selectedGroup = effective?.kind === "group" ? groups.find((group) => group.id === effective.id) : undefined;
    const ledger = useMemo(() => {
        if (selectedPerson) return personLedger(selectedPerson.friend.id, bills, settlements);
        if (selectedGroup) return groupLedger(selectedGroup.id, bills);
        return [];
    }, [bills, selectedGroup, selectedPerson, settlements]);

    const activity = useMemo(() => {
        const entries: LedgerEntry[] = [
            ...bills.map((bill) => ({ key: `bill-${bill.id}`, kind: "bill" as const, id: bill.id, date: bill.date, title: bill.title, detail: bill.group?.name || billPeople(bill) || "Split", amount: bill.total_amount, effect: billNet(bill) })),
            ...payments.flatMap((item) => {
                const settlement = asLedgerSettlement(item);
                if (!settlement) return [];
                return [{ key: `settlement-${item.record_id}`, kind: "settlement" as const, id: item.record_id, date: item.date, title: item.title, detail: [item.group_name, item.actor_name ? `recorded by ${item.actor_name}` : ""].filter(Boolean).join(" · ") || "Payment", amount: settlement.amount, effect: settlementEffect(settlement), status: item.status }];
            }),
        ];
        return entries.filter((entry) => activityFilter === "all" || entry.kind === activityFilter).sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));
    }, [activityFilter, bills, payments]);

    const decide = async (settlement: SplitSettlement, decision: "confirm" | "deny") => {
        if (deciding) return;
        setDeciding(settlement.id);
        try {
            await SplitAPI.decideSettlement(settlement.id, decision);
            // Dropped before the reload lands: the same question must not be asked twice.
            setRequests((current) => current.filter((row) => row.id !== settlement.id));
            toast({ title: decision === "confirm" ? "Settlement confirmed" : "Settlement denied" });
            await load();
        } catch (requestError) {
            setError(apiErrorMessage(requestError, "We couldn’t record that decision."));
        } finally { setDeciding(null); }
    };

    const chooseTab = (next: Tab) => { setTab(next); setSelection(null); };
    // On phones the ledger replaces the list, so bring its top into view.
    const select = (next: Selection) => {
        setSelection(next);
        if (window.matchMedia("(max-width: 1023px)").matches) requestAnimationFrame(() => document.getElementById("split-ledger")?.scrollIntoView({ block: "start" }));
    };
    const detailOpen = selection !== null; // phones show the ledger only after a tap

    const ledgerPanel = (selectedPerson || selectedGroup) && (
        <Panel id="split-ledger" className="flex scroll-mt-20 flex-col overflow-hidden lg:sticky lg:top-24 lg:max-h-[calc(100vh-11rem)] lg:min-h-[320px]">
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-4 sm:px-5">
                <button type="button" onClick={() => setSelection(null)} className={cn(iconButton, "h-9 w-9 lg:hidden")} aria-label="Back to the list"><ArrowLeft className="h-4 w-4" /></button>
                {selectedPerson ? <Monogram name={selectedPerson.friend.name} className="h-11 w-11 text-base" /> : <span className="grid h-11 w-11 place-items-center rounded-[12px] bg-track text-muted"><Users className="h-5 w-5" /></span>}
                <div className="min-w-[10rem] flex-1">
                    <h2 className="truncate text-lg font-bold">{selectedPerson ? selectedPerson.friend.name : selectedGroup!.name}</h2>
                    <p className="truncate text-sm text-muted">{selectedPerson ? balanceWords(selectedPerson.net_balance) : `${selectedGroup!.members.map((member) => member.friend.name).join(", ")} and you`}</p>
                </div>
                {selectedPerson && Math.round(selectedPerson.net_balance) !== 0 && <button type="button" onClick={() => setSettleWith({ friend: selectedPerson.friend, balance: selectedPerson.net_balance })} className={cn(buttonSecondary, "max-sm:w-full")}><HandCoins className="h-4 w-4" /> Record a payment</button>}
                {selectedGroup && <p className="text-sm text-muted">From its bills <Balance amount={groupBalance(selectedGroup.id, bills)} className="ml-1 text-[15px]" /></p>}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                <LedgerList entries={ledger} emptyLabel="Nothing shared yet." />
            </div>
        </Panel>
    );

    return (
        <>
            <div className="space-y-5 pb-12">
                <PageHeader
                    title="Splits"
                    description={`Who owes whom, from the bills and payments you’ve shared${balances.length ? ` with ${balances.length} ${balances.length === 1 ? "person" : "people"}` : ""}.`}
                    actions={<>
                        <button type="button" onClick={() => void load()} disabled={loading} className={iconButton} aria-label="Refresh"><RefreshCw className={cn("h-[18px] w-[18px]", loading && "animate-spin")} /></button>
                        <button type="button" onClick={() => setSettleWith({ friend: null })} disabled={!friends.length} className={buttonSecondary}><HandCoins className="h-4 w-4" /> Record a payment</button>
                    </>}
                />
                {error && <ErrorNotice message={error} onRetry={() => void load()} />}

                {requests.map((settlement) => (
                    <section key={settlement.id} aria-label="Settlement waiting for you" className="flex flex-col gap-3 rounded-2xl border border-accent/60 bg-selected p-4 sm:flex-row sm:items-center sm:gap-4 sm:p-5">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-card text-accent"><HandCoins className="h-5 w-5" /></span>
                            <div className="min-w-0">
                                <p className="font-bold">{settlementClaim(settlement)}</p>
                                <p className="mt-0.5 text-sm text-muted">It already counts in your balance. Deny it and the balance goes back.{settlement.group_name ? ` · ${settlement.group_name}` : ""}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => void decide(settlement, "deny")} disabled={deciding === settlement.id} className={cn(buttonSecondary, "text-negative")}>Deny</button>
                            <button type="button" onClick={() => void decide(settlement, "confirm")} disabled={deciding === settlement.id} className={buttonPrimary}>Confirm</button>
                        </div>
                    </section>
                ))}

                {loading && !hasLoaded ? <PageSkeleton /> : (
                    <>
                        <section aria-label="Split totals" className="grid grid-cols-3 divide-x divide-border overflow-hidden rounded-2xl border border-border bg-card">
                            {[
                                { label: "Owed to you", value: formatRupees(totals.owed), tone: "text-positive" },
                                { label: "You owe", value: formatRupees(totals.owe), tone: "text-warning" },
                                { label: "Net", value: `${totals.owed - totals.owe < 0 ? "−" : "+"}${formatRupees(Math.abs(totals.owed - totals.owe))}`, tone: "" },
                            ].map((item) => (
                                <div key={item.label} className="min-w-0 px-3 py-3.5 sm:px-5 sm:py-4">
                                    <p className="truncate text-[13px] font-semibold text-muted">{item.label}</p>
                                    <p className={cn("mt-0.5 truncate text-lg font-bold tabular-nums sm:text-[26px] sm:leading-9", item.tone)}>{item.value}</p>
                                </div>
                            ))}
                        </section>

                        <Segmented label="Show" options={TABS} value={tab} onChange={chooseTab} className="w-full sm:w-auto" />

                        {tab === "activity" ? (
                            <section aria-label="Split activity" className="space-y-3">
                                <Segmented label="Activity type" options={[{ value: "all", label: "All" }, { value: "bill", label: "Bills" }, { value: "settlement", label: "Payments" }] as const} value={activityFilter} onChange={(value) => { setActivityFilter(value); setActivityShown(ACTIVITY_STEP); }} />
                                {activity.length ? (
                                    <Panel className="overflow-hidden">
                                        <LedgerList entries={activity.slice(0, activityShown)} emptyLabel="" />
                                        {activity.length > activityShown && <button type="button" onClick={() => setActivityShown((count) => count + ACTIVITY_STEP)} className="flex w-full items-center justify-center gap-1 border-t border-border px-4 py-3 text-sm font-bold hover:bg-track">Show more <ChevronDown className="h-4 w-4" /></button>}
                                    </Panel>
                                ) : <EmptyPanel title="No split activity yet" body="Bills you split and payments you record in the app appear here." />}
                            </section>
                        ) : (
                            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start">
                                <div className={cn("min-w-0", detailOpen && "max-lg:hidden")}>
                                    {tab === "people" ? (
                                        people.length ? (
                                            <Panel className="divide-y divide-border overflow-hidden">
                                                {open.map((balance) => <ListRow key={balance.friend.id} selected={effective?.kind === "person" && effective.id === balance.friend.id} onSelect={() => select({ kind: "person", id: balance.friend.id })} leading={<Monogram name={balance.friend.name} />} title={balance.friend.name} sub={balance.net_balance > 0 ? "Owes you" : "You owe"} amount={balance.net_balance} />)}
                                                {settled.length > 0 && (
                                                    <>
                                                        <button type="button" onClick={() => setShowSettled((value) => !value)} aria-expanded={showSettled} className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-muted hover:bg-track sm:px-5">{settled.length} settled<ChevronDown className={cn("h-4 w-4 transition-transform", showSettled && "rotate-180")} /></button>
                                                        {showSettled && settled.map((balance) => <ListRow key={balance.friend.id} selected={effective?.kind === "person" && effective.id === balance.friend.id} onSelect={() => select({ kind: "person", id: balance.friend.id })} leading={<Monogram name={balance.friend.name} />} title={balance.friend.name} sub="All settled" amount={0} />)}
                                                    </>
                                                )}
                                            </Panel>
                                        ) : <EmptyPanel title="No one to split with yet" body="Add friends and split bills in the Finnri app; balances show here." />
                                    ) : groupRows.length ? (
                                        <Panel className="divide-y divide-border overflow-hidden">
                                            {groupRows.map(({ group, balance }) => <ListRow key={group.id} selected={effective?.kind === "group" && effective.id === group.id} onSelect={() => select({ kind: "group", id: group.id })} leading={<span className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-track text-muted"><Users className="h-[18px] w-[18px]" strokeWidth={1.8} /></span>} title={group.name} sub={`${group.members.length + 1} people · ${bills.filter((bill) => bill.group_id === group.id).length} bills`} amount={balance} />)}
                                        </Panel>
                                    ) : <EmptyPanel title="No groups yet" body="Groups you create in the Finnri app show here with what’s owed in each." />}
                                </div>
                                <div className={cn("min-w-0", !detailOpen && "max-lg:hidden")}>{ledgerPanel || <EmptyPanel title="Pick someone to see your history together" />}</div>
                            </div>
                        )}

                        <p className="text-[13px] text-muted">Balances come from the split bills and payments you record. Finnri never moves money. Add friends, groups and bills in the Finnri app.</p>
                    </>
                )}
            </div>
            {settleWith !== undefined && <SettlementDialog friends={friends} suggestedFriend={settleWith.friend || undefined} suggestedBalance={settleWith.balance} onClose={() => setSettleWith(undefined)} onSaved={() => { setSettleWith(undefined); void load(); }} />}
        </>
    );
}
