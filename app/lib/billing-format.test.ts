import assert from "node:assert/strict";
import test from "node:test";
import { discountPercent, formatMinor, intervalLabel, launchOfferNotice, offerForViewer } from "./billing-format";
import type { LaunchOfferStatus, PlanOffer } from "./billing-format";

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

// The staging API's own weekly offer: ₹79 today, ₹19 at the launch price.
const weeklyOffer: PlanOffer = {
    code: "launch_75",
    label: "Launch offer",
    percent_off: 75,
    price_minor: 1900,
    original_price_minor: 7900,
    ends_at: "2027-01-08T00:00:00+05:30",
};

function launchStatus(overrides: Partial<LaunchOfferStatus> = {}): { launch_offer: LaunchOfferStatus } {
    return { launch_offer: { active: true, eligible: true, code: "launch_75", label: "Launch offer", percent_off: 75, ...overrides } };
}

test("an eligible buyer is shown the launch price checkout will charge", () => {
    assert.equal(offerForViewer({ offer: weeklyOffer }, launchStatus())?.price_minor, 1900);
});

test("someone who has used the launch price sees the regular price", () => {
    // Checkout charges them ₹79, so showing ₹19 would be a price the page cannot honour.
    assert.equal(offerForViewer({ offer: weeklyOffer }, launchStatus({ eligible: false })), null);
});

test("status without an offer wins over a plan list that still carries one", () => {
    // Sold out, or ended, between the two requests.
    assert.equal(offerForViewer({ offer: weeklyOffer }, { launch_offer: null }), null);
    assert.equal(offerForViewer({ offer: weeklyOffer }, launchStatus({ active: false })), null);
});

test("with no status yet, the public offer stands; with no offer, there is none", () => {
    assert.equal(offerForViewer({ offer: weeklyOffer }, null)?.price_minor, 1900);
    assert.equal(offerForViewer({ offer: null }, launchStatus()), null);
});

test("the banner tells an eligible buyer the offer, and a past buyer why prices are regular", () => {
    assert.deepEqual(launchOfferNotice([{ offer: weeklyOffer }], launchStatus()), { percentOff: 75, spotsLeft: null, used: false });
    assert.deepEqual(launchOfferNotice([{ offer: weeklyOffer }], launchStatus({ eligible: false })), { percentOff: 75, spotsLeft: null, used: true });
    assert.equal(launchOfferNotice([{ offer: weeklyOffer }], { launch_offer: null }), null);
});

test("the banner names spots left only when the server sends them", () => {
    assert.equal(launchOfferNotice([], launchStatus({ spots_left: 12 }))?.spotsLeft, 12);
    assert.equal(launchOfferNotice([{ offer: { ...weeklyOffer, spots_left: 7 } }], null)?.spotsLeft, 7);
    assert.equal(launchOfferNotice([{}], null), null);
});
