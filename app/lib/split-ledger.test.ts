import assert from "node:assert/strict";
import test from "node:test";
import { billEffectWith, billNet, byMonth, groupBalance, groupLedger, personLedger, type LedgerBill, type LedgerSettlement } from "./split-ledger";

const bills: LedgerBill[] = [
    { id: 1, title: "Villa", date: "2026-10-17", total_amount: 9000, group_id: 7, group: { name: "Goa trip" }, participants: [{ friend_id: 1, share_amount: 3000, direction: "friend_owes_user" }, { friend_id: 2, share_amount: 3000, direction: "friend_owes_user" }] },
    { id: 2, title: "Cab", date: "2026-11-01", total_amount: 800, group_id: 7, group: { name: "Goa trip" }, participants: [{ friend_id: 1, share_amount: 400, direction: "user_owes_friend" }] },
    { id: 3, title: "Coffee", date: "2026-10-20", total_amount: 300, group_id: null, group: null, participants: [{ friend_id: 2, share_amount: 150, direction: "friend_owes_user" }] },
];
const settlements: LedgerSettlement[] = [
    { id: 9, friend_id: 1, amount: 1000, direction: "friend_paid_user", date: "2026-10-25", status: "confirmed" },
    { id: 10, friend_id: 1, amount: 500, direction: "friend_paid_user", date: "2026-10-26", status: "denied" },
];

test("a person's ledger signs each entry by what it did to the balance", () => {
    const ledger = personLedger(1, bills, settlements);
    assert.deepEqual(ledger.map((entry) => [entry.key, entry.effect]), [["bill-2", -400], ["settlement-10", 0], ["settlement-9", -1000], ["bill-1", 3000]]);
    assert.equal(ledger.reduce((total, entry) => total + entry.effect, 0), 1600);
    assert.equal(ledger[0].detail, "Goa trip");
    assert.equal(personLedger(2, bills, settlements).find((entry) => entry.id === 3)?.detail, "Just the two of you");
});

test("a group's balance nets every member's share of its bills", () => {
    assert.deepEqual(groupLedger(7, bills).map((entry) => entry.effect), [-400, 6000]);
    assert.equal(groupBalance(7, bills), 5600);
    assert.equal(groupBalance(99, bills), 0);
});

test("entries group by month, newest first", () => {
    const months = byMonth(personLedger(1, bills, settlements));
    assert.deepEqual(months.map((month) => [month.label, month.entries.length]), [["November 2026", 1], ["October 2026", 3]]);
});

// A group bill another member wrote. Its participants are in the author's
// namespace (friend 55 is the author's row for somebody); viewer_shares is the
// reader's side, with the reader's own friend ids.
const foreign: LedgerBill = {
    id: 40, title: "Villa deposit", date: "2026-11-02", total_amount: 9000, group_id: 7, group: { name: "Goa trip" },
    participants: [{ friend_id: 55, share_amount: 3000, direction: "friend_owes_user" }],
    viewer_shares: [
        { friend_id: 2, name: "Riya", is_viewer: false, paid: 9000, share: 3000 },
        { friend_id: 0, is_viewer: true, paid: 0, share: 3000 },
        { friend_id: 1, name: "Aarav", is_viewer: false, paid: 0, share: 3000 },
    ],
};

test("someone else's bill is read from the viewer's side", () => {
    // Riya paid: you owe Riya your share.
    assert.equal(billEffectWith(foreign, 2), -3000);
    // Aarav didn't pay and neither did you: nothing moved between you two.
    assert.equal(billEffectWith(foreign, 1), null);
    // The author's friend ids mean nothing to the reader.
    assert.equal(billEffectWith(foreign, 55), null);
    assert.equal(billNet(foreign), -3000);
    assert.equal(groupBalance(7, [...bills, foreign]), 2600);
    assert.deepEqual(groupLedger(7, [foreign]).map((entry) => entry.detail), ["Riya, Aarav"]);
});

test("a bill you paid, restated with viewer_shares, matches its participants", () => {
    const own: LedgerBill = { ...bills[0], viewer_shares: [
        { friend_id: 0, is_viewer: true, paid: 9000, share: 3000 },
        { friend_id: 1, name: "Aarav", is_viewer: false, paid: 0, share: 3000 },
        { friend_id: 2, name: "Riya", is_viewer: false, paid: 0, share: 3000 },
    ] };
    assert.equal(billEffectWith(own, 1), billEffectWith(bills[0], 1));
    assert.equal(billNet(own), 6000);
});
