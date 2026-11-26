/**
 * The card catalogue the admin edits (docs/CREDIT_CARD_SYSTEM_PLAN_2026-11-13.md
 * §5): real card products, each drawn in the app as a sketch of the real card.
 * The API is /v1/admin/card-products.
 */

export const CARD_TONES = ["deep", "solid", "tint", "pale"] as const;
export type CardTone = (typeof CARD_TONES)[number];
export const CARD_ORIENTATIONS = ["landscape", "portrait"] as const;
export type CardOrientation = (typeof CARD_ORIENTATIONS)[number];

export type CardProduct = {
    id: string;
    issuer_id: string;
    name: string;
    tone: CardTone;
    drawing: string;
    orientation: CardOrientation;
    art_idea: string;
    art_drawn_as: string;
    art_reviewed: boolean;
    joining_fee: number | null;
    annual_fee: number | null;
    fee_waiver_spend: number | null;
    source_urls: string[];
    last_verified_at: string | null;
    sort_order: number;
    hidden: boolean;
    created_at?: string;
    updated_at?: string;
};

export type CardCatalogue = { products: CardProduct[]; cards_by_product: Record<string, number> };

/**
 * Banks that issue credit cards, by the app's provider ids
 * (finnri-api internal/http/account_providers.go). Pay-later lenders are not
 * here: they have no card products.
 */
export const CARD_ISSUERS: ReadonlyArray<readonly [id: string, name: string]> = [
    ["amex", "American Express"],
    ["au-small-finance", "AU Small Finance Bank"],
    ["axis", "Axis Bank"],
    ["bandhan", "Bandhan Bank"],
    ["bank-of-baroda", "Bank of Baroda"],
    ["bank-of-india", "Bank of India"],
    ["canara", "Canara Bank"],
    ["central-bank", "Central Bank of India"],
    ["citibank", "Citibank"],
    ["federal", "Federal Bank"],
    ["hdfc", "HDFC Bank"],
    ["hsbc", "HSBC"],
    ["icici", "ICICI Bank"],
    ["idbi", "IDBI Bank"],
    ["idfc-first", "IDFC FIRST Bank"],
    ["indusind", "IndusInd Bank"],
    ["karnataka", "Karnataka Bank"],
    ["kotak", "Kotak Mahindra Bank"],
    ["onecard", "OneCard"],
    ["pnb", "Punjab National Bank"],
    ["rbl", "RBL Bank"],
    ["sbi", "State Bank of India"],
    ["scapia", "Scapia"],
    ["slice", "Slice"],
    ["standard-chartered", "Standard Chartered"],
    ["uni", "Uni"],
    ["union-bank", "Union Bank of India"],
    ["yes-bank", "YES BANK"],
];

export const issuerName = (id: string) => CARD_ISSUERS.find(([issuer]) => issuer === id)?.[1] ?? id;

/**
 * The drawings the app ships (finnri-app lib/card-art/drawings.ts). A name the
 * app does not know draws the plain card, so a new drawing can be named here
 * before the build that has it.
 */
export const LANDSCAPE_DRAWINGS = [
    "arrow", "aurora", "blocks", "burst", "car", "constellation", "crossarrows", "crystal", "doodlering", "doodles",
    "dotgrid", "drop", "facets", "fern", "gem", "globe", "globe+route", "hairlines", "headphones", "laurel", "mandala",
    "octane", "orbits", "parcel", "plate", "playdots", "pulse", "ribbons", "shards", "signal", "silk", "sphere",
    "splash", "stitch", "stripes", "train", "tree", "wedge",
] as const;
export const PORTRAIT_DRAWINGS = ["coins", "feather", "tick"] as const;

/** What the editor holds: every field as typed text. */
export type CardProductForm = {
    id: string;
    issuer_id: string;
    name: string;
    tone: CardTone;
    drawing: string;
    orientation: CardOrientation;
    art_idea: string;
    art_drawn_as: string;
    art_reviewed: boolean;
    joining_fee: string;
    annual_fee: string;
    fee_waiver_spend: string;
    source_urls: string;
    last_verified_at: string;
    sort_order: string;
    hidden: boolean;
};

export const emptyCardProductForm = (issuerId = "hdfc"): CardProductForm => ({
    id: "",
    issuer_id: issuerId,
    name: "",
    tone: "deep",
    drawing: "",
    orientation: "landscape",
    art_idea: "",
    art_drawn_as: "",
    art_reviewed: false,
    joining_fee: "",
    annual_fee: "",
    fee_waiver_spend: "",
    source_urls: "",
    last_verified_at: "",
    sort_order: "",
    hidden: false,
});

const money = (value: number | null) => (value === null || value === undefined ? "" : String(value));

export function toCardProductForm(product: CardProduct): CardProductForm {
    return {
        id: product.id,
        issuer_id: product.issuer_id,
        name: product.name,
        tone: product.tone,
        drawing: product.drawing,
        orientation: product.orientation,
        art_idea: product.art_idea,
        art_drawn_as: product.art_drawn_as,
        art_reviewed: product.art_reviewed,
        joining_fee: money(product.joining_fee),
        annual_fee: money(product.annual_fee),
        fee_waiver_spend: money(product.fee_waiver_spend),
        source_urls: (product.source_urls ?? []).join("\n"),
        last_verified_at: product.last_verified_at ? product.last_verified_at.slice(0, 10) : "",
        sort_order: String(product.sort_order ?? 0),
        hidden: product.hidden,
    };
}

/** "hdfc" + "Regalia Gold" → "hdfc-regalia-gold"; "Power+" → "power-plus". */
export function suggestProductId(issuerId: string, name: string) {
    const prefix = issuerId === "au-small-finance" ? "au" : issuerId;
    const slug = name
        .toLowerCase()
        .replace(/\+/g, " plus")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    return slug ? `${prefix}-${slug}` : "";
}

/**
 * The form as the API takes it, or the fields to fix. Mirrors the API's own
 * checks so most mistakes are caught before a round trip; the API is still the
 * judge.
 */
export function toCardProductPayload(form: CardProductForm): { payload?: Record<string, unknown>; errors: Record<string, string> } {
    const errors: Record<string, string> = {};
    const fee = (key: "joining_fee" | "annual_fee" | "fee_waiver_spend") => {
        const raw = form[key].replace(/[,₹\s]/g, "");
        if (!raw) return null;
        const value = Number(raw);
        if (!Number.isFinite(value) || value < 0) {
            errors[key] = "Enter an amount in rupees";
            return null;
        }
        return value;
    };
    const fees = { joining_fee: fee("joining_fee"), annual_fee: fee("annual_fee"), fee_waiver_spend: fee("fee_waiver_spend") };
    const sources = form.source_urls
        .split(/\s+/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (sources.some((source) => !/^https?:\/\/[^\s/]+\.[^\s]+/i.test(source))) errors.source_urls = "Each source must be a web link";
    if (Object.values(fees).some((value) => value !== null) && sources.length === 0) {
        errors.source_urls = "Fees need the issuer page they come from";
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(form.id.trim())) errors.id = "Lowercase words joined by hyphens, like hdfc-millennia";
    if (!form.name.trim()) errors.name = "Name the card";
    if (!/^[a-z0-9]+([+-][a-z0-9]+)*$/.test(form.drawing.trim())) errors.drawing = "Pick one of the app's drawings";
    if (form.last_verified_at && !/^\d{4}-\d{2}-\d{2}$/.test(form.last_verified_at)) errors.last_verified_at = "A date like 2026-11-13";
    const sortOrder = form.sort_order.trim() ? Number(form.sort_order) : 0;
    if (!Number.isInteger(sortOrder)) errors.sort_order = "A whole number";
    if (Object.keys(errors).length) return { errors };
    return {
        errors,
        payload: {
            id: form.id.trim(),
            issuer_id: form.issuer_id,
            name: form.name.trim(),
            tone: form.tone,
            drawing: form.drawing.trim(),
            orientation: form.orientation,
            art_idea: form.art_idea.trim(),
            art_drawn_as: form.art_drawn_as.trim(),
            art_reviewed: form.art_reviewed,
            ...fees,
            source_urls: sources,
            last_verified_at: form.last_verified_at,
            sort_order: sortOrder,
            hidden: form.hidden,
        },
    };
}

/** How old a check is, for the "Checked" column: fresh, due (60 days), stale (90). */
export function verificationAge(lastVerifiedAt: string | null, now = new Date()) {
    if (!lastVerifiedAt) return "never" as const;
    const days = Math.floor((now.getTime() - new Date(lastVerifiedAt).getTime()) / 86400000);
    if (days >= 90) return "stale" as const;
    if (days >= 60) return "due" as const;
    return "fresh" as const;
}
