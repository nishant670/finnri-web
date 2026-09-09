const configuredSiteURL = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
let configuredURL: URL | null = null;

if (configuredSiteURL) {
    try {
        configuredURL = new URL(configuredSiteURL);
    } catch {
        throw new Error("NEXT_PUBLIC_SITE_URL must be an absolute http(s) URL");
    }
    if (!['http:', 'https:'].includes(configuredURL.protocol)) {
        throw new Error("NEXT_PUBLIC_SITE_URL must be an absolute http(s) URL");
    }
}

if (process.env.NODE_ENV === "production" && (!configuredURL || ["localhost", "127.0.0.1", "::1"].includes(configuredURL.hostname))) {
    throw new Error("NEXT_PUBLIC_SITE_URL must be set to the public host for a production build; localhost is not allowed");
}

export const SITE_URL = configuredSiteURL || "http://localhost:3000";
export const PLAY_STORE_URL = process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim()
    || "https://play.google.com/store/apps/details?id=com.finnri.app";

// Razorpay expects a public page carrying the merchant's registered identity,
// and /contact exists to be that page. But the identity must not be guessed
// ahead of the KYC submission: a /contact stating an address that is not the
// registered one is a discrepancy a reviewer can act on, which is strictly
// worse than having no page at all. So /contact ships dark, and the three
// values only become mandatory when this flag turns it on — the same moment
// the KYC submission fixes what they are obliged to say.
export const MERCHANT_IDENTITY_PUBLISHED =
    process.env.NEXT_PUBLIC_MERCHANT_IDENTITY_PUBLISHED?.trim() === "true";

function requiredPublicBusinessDetail(name: string, configuredValue: string | undefined, fallback: string) {
    const value = configuredValue?.trim();
    if (process.env.NODE_ENV === "production" && MERCHANT_IDENTITY_PUBLISHED && !value) {
        throw new Error(`${name} must be set once NEXT_PUBLIC_MERCHANT_IDENTITY_PUBLISHED is on — /contact publishes it verbatim`);
    }
    return value || fallback;
}

// NEXT_PUBLIC_* reads must stay statically addressable so Next can inline them
// into client bundles. A computed process.env[name] works on the server but is
// undefined after hydration in the browser.
export const LEGAL_BUSINESS_NAME = requiredPublicBusinessDetail(
    "NEXT_PUBLIC_LEGAL_BUSINESS_NAME",
    process.env.NEXT_PUBLIC_LEGAL_BUSINESS_NAME,
    "Finnri",
);
export const BUSINESS_ADDRESS = requiredPublicBusinessDetail(
    "NEXT_PUBLIC_BUSINESS_ADDRESS",
    process.env.NEXT_PUBLIC_BUSINESS_ADDRESS,
    "India",
);
export const SUPPORT_PHONE = requiredPublicBusinessDetail(
    "NEXT_PUBLIC_SUPPORT_PHONE",
    process.env.NEXT_PUBLIC_SUPPORT_PHONE,
    "",
);
