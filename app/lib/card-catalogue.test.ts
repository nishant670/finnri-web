import assert from "node:assert/strict";
import test from "node:test";
import {
    emptyCardProductForm,
    issuerName,
    suggestProductId,
    toCardProductForm,
    toCardProductPayload,
    verificationAge,
    type CardProduct,
} from "./card-catalogue";

const millennia: CardProduct = {
    id: "hdfc-millennia",
    issuer_id: "hdfc",
    name: "Millennia",
    tone: "solid",
    drawing: "dotgrid",
    orientation: "landscape",
    art_idea: "Fine texture on blue",
    art_drawn_as: "a dot field with one sweep",
    art_reviewed: false,
    joining_fee: null,
    annual_fee: 1000,
    fee_waiver_spend: 100000,
    source_urls: ["https://www.hdfcbank.com/millennia"],
    last_verified_at: "2026-11-13T00:00:00Z",
    sort_order: 1,
    hidden: false,
};

test("a product round-trips through the editor unchanged", () => {
    const { payload, errors } = toCardProductPayload(toCardProductForm(millennia));
    assert.deepEqual(errors, {});
    assert.deepEqual(payload, {
        id: "hdfc-millennia",
        issuer_id: "hdfc",
        name: "Millennia",
        tone: "solid",
        drawing: "dotgrid",
        orientation: "landscape",
        art_idea: "Fine texture on blue",
        art_drawn_as: "a dot field with one sweep",
        art_reviewed: false,
        joining_fee: null,
        annual_fee: 1000,
        fee_waiver_spend: 100000,
        source_urls: ["https://www.hdfcbank.com/millennia"],
        last_verified_at: "2026-11-13",
        sort_order: 1,
        hidden: false,
    });
});

test("fees need the issuer page they come from", () => {
    const form = { ...toCardProductForm(millennia), source_urls: "" };
    assert.equal(toCardProductPayload(form).errors.source_urls, "Fees need the issuer page they come from");
    const cleared = { ...form, annual_fee: "", fee_waiver_spend: "" };
    assert.deepEqual(toCardProductPayload(cleared).errors, {});
    assert.equal(toCardProductPayload({ ...form, annual_fee: "₹1,499", source_urls: "https://x.example/terms" }).payload?.annual_fee, 1499);
    assert.ok(toCardProductPayload({ ...form, source_urls: "javascript:alert(1)" }).errors.source_urls);
});

test("a new product needs a slug, a name and a drawing", () => {
    const { errors } = toCardProductPayload(emptyCardProductForm());
    assert.ok(errors.id && errors.name && errors.drawing);
    assert.equal(suggestProductId("hdfc", "Regalia Gold"), "hdfc-regalia-gold");
    assert.equal(suggestProductId("idfc-first", "Power+"), "idfc-first-power-plus");
    assert.equal(suggestProductId("au-small-finance", "LIT"), "au-lit");
    assert.equal(issuerName("sbi"), "State Bank of India");
    assert.equal(toCardProductPayload({ ...emptyCardProductForm(), id: "axis-atlas", name: "Atlas", drawing: "globe+route" }).payload?.drawing, "globe+route");
});

test("a check goes due at 60 days and stale at 90", () => {
    const now = new Date("2026-11-13T00:00:00Z");
    assert.equal(verificationAge(null, now), "never");
    assert.equal(verificationAge("2026-11-01T00:00:00Z", now), "fresh");
    assert.equal(verificationAge("2026-09-10T00:00:00Z", now), "due");
    assert.equal(verificationAge("2026-08-01T00:00:00Z", now), "stale");
});
