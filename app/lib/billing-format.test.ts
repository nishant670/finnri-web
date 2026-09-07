import assert from "node:assert/strict";
import test from "node:test";
import { discountPercent, formatMinor, intervalLabel } from "./billing-format";

test("prices are read as paise, not rupees", () => {
    // The plan catalogue stores 14900 paise. Rendering it as ₹14,900 would
    // overstate the monthly plan by a hundredfold.
    assert.equal(formatMinor(14900), "₹149");
    assert.equal(formatMinor(79900), "₹799");
    assert.equal(formatMinor(499900), "₹4,999");
});

test("whole rupees drop the decimals, part rupees keep them", () => {
    assert.equal(formatMinor(7900), "₹79");
    assert.equal(formatMinor(7950), "₹79.50");
});

test("zero renders as a price, not as an empty string", () => {
    assert.equal(formatMinor(0), "₹0");
});

test("interval labels read as a period a person would say", () => {
    assert.equal(intervalLabel("weekly"), "week");
    assert.equal(intervalLabel("monthly"), "month");
    assert.equal(intervalLabel("quarterly"), "3 months");
    assert.equal(intervalLabel("yearly"), "year");
});

test("the launch discount is the real saving against the list price", () => {
    // ₹149 against a ₹499 list price.
    assert.equal(discountPercent({ price_minor: 14900, list_price_minor: 49900 }), 70);
    // ₹799 against ₹3,999.
    assert.equal(discountPercent({ price_minor: 79900, list_price_minor: 399900 }), 80);
});

test("nothing to advertise yields no badge rather than 'Save 0%'", () => {
    assert.equal(discountPercent({ price_minor: 14900, list_price_minor: 14900 }), null);
    assert.equal(discountPercent({ price_minor: null, list_price_minor: 49900 }), null);
    assert.equal(discountPercent({ price_minor: 14900, list_price_minor: null }), null);
});

test("a list price below the sale price is a data error, not a negative discount", () => {
    assert.equal(discountPercent({ price_minor: 49900, list_price_minor: 14900 }), null);
});
