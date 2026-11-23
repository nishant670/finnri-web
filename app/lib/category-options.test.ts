import assert from "node:assert/strict";
import test from "node:test";
import { categoryOptionsFor } from "./category-options";

const canonical = ["Food & Drinks", "Transport", "Travel", "Shopping", "Bills", "Entertainment", "Health", "Family/Gifts", "Misc"];

test("canonical category values are not duplicated with different casing", () => {
    assert.strictEqual(categoryOptionsFor(canonical, "travel"), canonical);
});

test("a deliberate custom category remains selectable while editing", () => {
    assert.deepEqual(categoryOptionsFor(canonical, "Pet Care"), [...canonical, "Pet Care"]);
});

test("an empty current value does not invent a category", () => {
    assert.strictEqual(categoryOptionsFor(canonical, "  "), canonical);
});
