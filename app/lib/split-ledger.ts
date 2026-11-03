/**
 * The split ledger read one person or one group at a time: every bill and
 * settlement with what it did to the balance. Positive means it moved money
 * your way (they owe you more, or you owe them less).
 *
 * Bills are read from the viewer's side. A shared group's bill may have been
 * written by another member, whose `participants` name people by *their*
 * friend rows; the API restates every bill for the reader as `viewer_shares`
 * (who paid, and each person's share, with the reader's own friend ids), and
 * that is what this reads. A bill without `viewer_shares` is the reader's own
 * and its participants are already the reader's friends.
 *
 * Settlements come from the split activity feed, which restates payments the
 * other side recorded in the reader's direction; the plain settlement list
 * holds only the reader's own rows.
 *
 * The shapes are structural so this file stays free of the API client.
 */

type BillDirection = "friend_owes_user" | "user_owes_friend";
type SettlementDirection = "friend_paid_user" | "user_paid_friend";

export interface LedgerViewerShare {
    friend_id: number;
    name?: string;
    is_viewer: boolean;
    paid: number;
    share: number;
}

export interface LedgerBill {
    id: number;
    title: string;
    date: string;
    total_amount: number;
    group_id?: number | null;
    group?: { name: string } | null;
    participants: { friend_id: number; share_amount: number; direction: BillDirection; friend?: { name: string } }[];
    viewer_shares?: LedgerViewerShare[] | null;
}

export interface LedgerSettlement {
    id: number;
    friend_id: number;
    amount: number;
    direction: SettlementDirection;
    date: string;
    status?: "pending" | "confirmed" | "denied";
    group_name?: string;
}

export interface LedgerEntry {
    key: string;
    kind: "bill" | "settlement";
    id: number;
    date: string;
    title: string;
    /** Where it happened: the group's name, or how the money moved. */
    detail: string;
    /** The bill's full amount, or the settlement's. */
    amount: number;
    /** What it did to the balance; 0 for a denied settlement. */
    effect: number;
    status?: LedgerSettlement["status"];
}

const shareEffect = (share: { share_amount: number; direction: BillDirection }) =>
    share.direction === "friend_owes_user" ? share.share_amount : -share.share_amount;

const newestFirst = (a: LedgerEntry, b: LedgerEntry) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1);

const viewerShares = (bill: LedgerBill) => (bill.viewer_shares && bill.viewer_shares.length > 0 ? bill.viewer_shares : null);

/**
 * What one bill did between you and one friend, or null when the bill isn't
 * between the two of you. With one payer, the payer is owed everyone else's
 * share: you paid → they owe you their share; they paid → you owe them yours;
 * somebody else paid → nothing moved between you.
 */
export function billEffectWith(bill: LedgerBill, friendID: number): number | null {
    const shares = viewerShares(bill);
    if (!shares) {
        const own = bill.participants.find((participant) => participant.friend_id === friendID);
        return own ? shareEffect(own) : null;
    }
    const viewer = shares.find((share) => share.is_viewer);
    const friend = shares.find((share) => !share.is_viewer && share.friend_id === friendID);
    if (!viewer || !friend) return null;
    if (viewer.paid > 0) return friend.share;
    if (friend.paid > 0) return -viewer.share;
    return null;
}

/** What one bill did to your position overall: what you paid less your own share. */
export function billNet(bill: LedgerBill): number {
    const shares = viewerShares(bill);
    if (!shares) return bill.participants.reduce((total, share) => total + shareEffect(share), 0);
    const viewer = shares.find((share) => share.is_viewer);
    return viewer ? viewer.paid - viewer.share : 0;
}

/** Everyone on a bill except you, by the names you use for them. */
export function billPeople(bill: LedgerBill): string {
    const shares = viewerShares(bill);
    const names = shares
        ? shares.filter((share) => !share.is_viewer).map((share) => share.name || "Friend")
        : bill.participants.map((participant) => participant.friend?.name || "Friend");
    return names.join(", ");
}

export function settlementEffect(settlement: LedgerSettlement): number {
    if (settlement.status === "denied") return 0;
    return settlement.direction === "friend_paid_user" ? -settlement.amount : settlement.amount;
}

/** Everything between you and one friend: your side of each bill, and each payment either of you recorded. */
export function personLedger(friendID: number, bills: LedgerBill[], settlements: LedgerSettlement[]): LedgerEntry[] {
    const entries: LedgerEntry[] = [];
    for (const bill of bills) {
        const effect = billEffectWith(bill, friendID);
        if (effect === null) continue;
        entries.push({
            key: `bill-${bill.id}`, kind: "bill", id: bill.id, date: bill.date, title: bill.title,
            detail: bill.group?.name || "Just the two of you", amount: bill.total_amount, effect,
        });
    }
    for (const settlement of settlements) {
        if (settlement.friend_id !== friendID) continue;
        entries.push({
            key: `settlement-${settlement.id}`, kind: "settlement", id: settlement.id, date: settlement.date,
            title: settlement.direction === "friend_paid_user" ? "They paid you" : "You paid them",
            detail: settlement.group_name || "Settlement", amount: settlement.amount,
            effect: settlementEffect(settlement), status: settlement.status,
        });
    }
    return entries.sort(newestFirst);
}

/** A group's bills, each with your net position on it. */
export function groupLedger(groupID: number, bills: LedgerBill[]): LedgerEntry[] {
    return bills
        .filter((bill) => bill.group_id === groupID)
        .map((bill) => ({
            key: `bill-${bill.id}`, kind: "bill" as const, id: bill.id, date: bill.date, title: bill.title,
            detail: billPeople(bill) || "Group", amount: bill.total_amount, effect: billNet(bill),
        }))
        .sort(newestFirst);
}

/**
 * Where a group's bills leave you: what you paid in it less your shares.
 * Settlements are recorded per person, not per group, so this is the bills alone.
 */
export function groupBalance(groupID: number, bills: LedgerBill[]): number {
    return groupLedger(groupID, bills).reduce((total, entry) => total + entry.effect, 0);
}

export interface LedgerMonth { month: string; label: string; entries: LedgerEntry[] }

export function byMonth(entries: LedgerEntry[]): LedgerMonth[] {
    const months: LedgerMonth[] = [];
    for (const entry of entries) {
        const month = entry.date.slice(0, 7);
        let group = months.at(-1);
        if (!group || group.month !== month) {
            const [year, monthIndex] = month.split("-").map(Number);
            group = { month, label: new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(year, monthIndex - 1, 1)), entries: [] };
            months.push(group);
        }
        group.entries.push(entry);
    }
    return months;
}
