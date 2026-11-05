import assert from "node:assert/strict";
import test from "node:test";
import { formatDateRange, formatLakhCrore, formatMoney, formatRupees, toApiTime, toLocalISO } from "./format";

test("money uses one en-IN formatter without discarding paise", () => {
    assert.equal(formatMoney(1234.56), "₹1,234.56");
    assert.equal(formatMoney(1234), "₹1,234");
    assert.equal(formatMoney("1,234.50"), "₹1,234.5");
    assert.equal(formatMoney("not money"), "₹0");
});

test("time normalization accepts API clocks and rejects invalid values", () => {
    assert.equal(toApiTime("13:09"), "13:09");
    assert.equal(toApiTime("1:09 p.m."), "13:09");
    assert.equal(toApiTime("24:00"), null);
});

test("local input serialization preserves the IST day at the midnight boundary", () => {
    assert.equal(toLocalISO(new Date("2026-08-20T19:00:00.000Z"), "minute"), "2026-08-21T00:30");
});

test("date ranges collapse a shared month without raw ISO text", () => {
    assert.equal(formatDateRange("2026-08-01", "2026-08-21"), "1–21 Aug 2026");
});

test("big sums read in lakh and crore", () => {
    assert.equal(formatLakhCrore(3340917), "₹33.41 lakh");
    assert.equal(formatLakhCrore(12000000), "₹1.2 crore");
    assert.equal(formatLakhCrore(99999.6), "₹1,00,000");
    assert.equal(formatLakhCrore(-250000), "-₹2.5 lakh");
});

test("headline figures round to the rupee", () => {
    assert.equal(formatRupees(39155.66), "₹39,156");
    assert.equal(formatRupees(-650.4), "-₹650");
});
