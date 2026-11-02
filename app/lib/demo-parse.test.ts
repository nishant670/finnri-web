import assert from "node:assert/strict";
import test from "node:test";
import { parseDemoSentence } from "./demo-parse.js";

test("demo parser reads amount, category and payment from a plain sentence", () => {
    assert.deepEqual(parseDemoSentence("Spent 250 on lunch via UPI"), {
        type: "expense",
        amount: 250,
        title: "Lunch",
        category: "Food & Drinks",
        paidVia: "UPI",
        date: "Today",
    });
});

test("demo parser understands thousands, places and yesterday", () => {
    const draft = parseDemoSentence("1.2k dinner at Toit yesterday on card");
    assert.equal(draft.amount, 1200);
    assert.equal(draft.title, "Toit");
    assert.equal(draft.paidVia, "Card");
    assert.equal(draft.date, "Yesterday");
    assert.equal(parseDemoSentence("Rent 22,000").amount, 22000);
    assert.equal(parseDemoSentence("₹ 499 netflix").category, "Entertainment");
});

test("demo parser marks money in as income", () => {
    const draft = parseDemoSentence("Got 2000 from freelance");
    assert.equal(draft.type, "income");
    assert.equal(draft.category, "Income");
    assert.equal(draft.amount, 2000);
    assert.equal(draft.title, "Freelance");
});

test("demo parser leaves what it cannot place for checking", () => {
    const draft = parseDemoSentence("bought something nice");
    assert.equal(draft.amount, null);
    assert.equal(draft.paidVia, null);
    assert.equal(draft.category, "General");
});
