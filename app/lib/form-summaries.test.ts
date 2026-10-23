import { test } from "node:test";
import assert from "node:assert/strict";

import { accountDetailsSummary, reminderPhrase, subscriptionOptionsSummary } from "./form-summaries";

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

test("a reminder reads as a phrase, with the due date for zero", () => {
    assert.equal(reminderPhrase(0), "Reminder on the due date");
    assert.equal(reminderPhrase(1), "Reminder 1 day before");
    assert.equal(reminderPhrase(3), "Reminder 3 days before");
});

test("the subscription fold reads back its defaults", () => {
    assert.equal(
        subscriptionOptionsSummary({ category: "Entertainment", billingInterval: "monthly", reminderDays: 3, autopay: false, cancelBeforeDue: false }),
        "Entertainment · Reminder 3 days before · Autopay off",
    );
});

test("autopay names its account, and a daily schedule needs no reminder", () => {
    assert.equal(
        subscriptionOptionsSummary({ category: "Bills", billingInterval: "daily", reminderDays: 0, autopay: true, accountName: "HDFC Savings", cancelBeforeDue: true }),
        "Bills · Added automatically · Autopay from HDFC Savings · Cancel reminder on",
    );
});

test("a merchant is mentioned only when it is not the name already shown", () => {
    const base = { category: "Bills", billingInterval: "monthly", reminderDays: 3, autopay: false, cancelBeforeDue: false };
    assert.ok(!subscriptionOptionsSummary({ ...base, name: "Netflix", merchant: "Netflix" }).includes("Paid to"));
    assert.ok(subscriptionOptionsSummary({ ...base, name: "Family plan", merchant: "Spotify" }).startsWith("Paid to Spotify"));
});

test("an empty account fold invites rather than reads blank", () => {
    assert.equal(
        accountDetailsSummary({ type: "bank", provider: "", identifier: "", balance: 0, isDefault: false, formatMoney: money }),
        "Optional — bank, last 4 digits, balance and colour",
    );
});

test("a filled account fold reads back what it holds", () => {
    assert.equal(
        accountDetailsSummary({ type: "bank", provider: "HDFC Bank", identifier: "123456", balance: 25000, isDefault: true, formatMoney: money }),
        "HDFC Bank · •• 3456 · Balance ₹25,000 · Default account",
    );
    assert.equal(
        accountDetailsSummary({ type: "credit_card", provider: "", identifier: "", balance: 1200, isDefault: false, formatMoney: money }),
        "Owed ₹1,200",
    );
});
