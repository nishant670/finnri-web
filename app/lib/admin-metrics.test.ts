import assert from "node:assert/strict";
import test from "node:test";
import { percent, trendTone } from "./admin-metrics";

test("admin metric helpers preserve backend meaning", () => {
    assert.equal(percent(12.345), "12.3%");
    assert.equal(percent(undefined), "0.0%");
    assert.equal(trendTone(-2), "negative");
    assert.equal(trendTone(0), "neutral");
});
