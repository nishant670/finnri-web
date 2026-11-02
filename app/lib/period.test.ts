import assert from "node:assert/strict";
import test from "node:test";
import { changeSentence, comparisonRange, daysIn, percentChange, presetRange, wholeMonthOf } from "./period";

const today = new Date(2026, 10, 2); // 2 Nov 2026

test("presets cover the right dates", () => {
    assert.deepEqual(presetRange("month", today), { start_date: "2026-11-01", end_date: "2026-11-02" });
    assert.deepEqual(presetRange("last-month", today), { start_date: "2026-10-01", end_date: "2026-10-31" });
    assert.deepEqual(presetRange("30d", today), { start_date: "2026-10-04", end_date: "2026-11-02" });
    assert.deepEqual(presetRange("year", today), { start_date: "2026-01-01", end_date: "2026-11-02" });
    assert.equal(presetRange("all", today), null);
});

test("a month or month-to-date compares with the same days of the month before", () => {
    assert.deepEqual(comparisonRange({ start_date: "2026-11-01", end_date: "2026-11-02" }), { start_date: "2026-10-01", end_date: "2026-10-02" });
    // 31 March has no twin in February, so the comparison stops at its end.
    assert.deepEqual(comparisonRange({ start_date: "2026-03-01", end_date: "2026-03-31" }), { start_date: "2026-02-01", end_date: "2026-02-28" });
    assert.deepEqual(comparisonRange({ start_date: "2026-10-01", end_date: "2026-10-31" }), { start_date: "2026-09-01", end_date: "2026-09-30" });
    assert.deepEqual(comparisonRange({ start_date: "2026-01-01", end_date: "2026-01-15" }), { start_date: "2025-12-01", end_date: "2025-12-15" });
});

test("rolling and custom periods compare with the same number of days before", () => {
    const range = { start_date: "2026-10-04", end_date: "2026-11-02" };
    const previous = comparisonRange(range);
    assert.deepEqual(previous, { start_date: "2026-09-04", end_date: "2026-10-03" });
    assert.equal(daysIn(previous), daysIn(range));
    // A year to date spans months, so it compares with the 306 days before it.
    assert.deepEqual(comparisonRange({ start_date: "2026-01-01", end_date: "2026-11-02" }), { start_date: "2025-03-01", end_date: "2025-12-31" });
});

test("whole month and change wording", () => {
    assert.deepEqual(wholeMonthOf("2026-10-02"), { start_date: "2026-10-01", end_date: "2026-10-31" });
    assert.equal(percentChange(118, 100), 18);
    assert.equal(percentChange(5, 0), null);
    const range = { start_date: "2026-10-01", end_date: "2026-10-02" };
    assert.equal(changeSentence(118, 100, range), "18% more than 1–2 Oct 2026");
    assert.equal(changeSentence(80, 100, range), "20% less than 1–2 Oct 2026");
    assert.equal(changeSentence(100.2, 100, range), "About the same as 1–2 Oct 2026");
    assert.equal(changeSentence(10, 0, range), null);
});
