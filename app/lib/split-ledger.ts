/**
 * The split ledger read one person or one group at a time: every bill and
 * settlement with what it did to the balance. Positive means it moved money
 * your way (they owe you more, or you owe them less).
 *
 * The shapes are structural so this file stays free of the API client.
 */

type BillDirection = "friend_owes_user" | "user_owes_friend";
type SettlementDirection = "friend_paid_user" | "user_paid_friend";

export interface LedgerBill {
    id: number;
    title: string;
    date: string;
    total_amount: number;
    group_id?: number | null;
    group?: { name: string } | null;
    participants: { friend_id: number; share_amount: number; direction: BillDirection }[];
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

/** Everything between you and one friend: their share of each bill, and each settlement. */
export function personLedger(friendID: number, bills: LedgerBill[], settlements: LedgerSettlement[]): LedgerEntry[] {
    const entries: LedgerEntry[] = [];
    for (const bill of bills) {
        const share = bill.participants.find((participant) => participant.friend_id === friendID);
        if (!share) continue;
        entries.push({
            key: `bill-${bill.id}`, kind: "bill", id: bill.id, date: bill.date, title: bill.title,
            detail: bill.group?.name || "Just the two of you", amount: bill.total_amount, effect: shareEffect(share),
        });
    }
    for (const settlement of settlements) {
        if (settlement.friend_id !== friendID) continue;
        const theyPaid = settlement.direction === "friend_paid_user";
        entries.push({
            key: `settlement-${settlement.id}`, kind: "settlement", id: settlement.id, date: settlement.date,
            title: theyPaid ? "They paid you" : "You paid them",
            detail: settlement.group_name || "Settlement", amount: settlement.amount,
            effect: settlement.status === "denied" ? 0 : theyPaid ? -settlement.amount : settlement.amount,
            status: settlement.status,
        });
    }
    return entries.sort(newestFirst);
}

/** A group's bills, each with your net share of it. */
export function groupLedger(groupID: number, bills: LedgerBill[]): LedgerEntry[] {
    return bills
        .filter((bill) => bill.group_id === groupID)
        .map((bill) => ({
            key: `bill-${bill.id}`, kind: "bill" as const, id: bill.id, date: bill.date, title: bill.title,
            detail: `${bill.participants.length + 1} people`, amount: bill.total_amount,
            effect: bill.participants.reduce((total, share) => total + shareEffect(share), 0),
        }))
        .sort(newestFirst);
}

/**
 * What a group's bills leave between you and its members. Settlements are
 * recorded per person, not per group, so this is the bills alone.
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
