// The headers the admin proxy (app/api/admin/[...path]/route.ts) sends to the
// browser. Everything behind it is private — feedback screenshots and PDFs,
// users, payments — so no admin response may be kept in the browser's cache
// after the session ends, whatever the API sent.
//
// The proxy used to build a fresh response with only Content-Type and
// Content-Disposition, which dropped the API's `Cache-Control: private,
// no-store` and its hardening headers on attachments. `fetch(..., { cache:
// "no-store" })` only stops Next caching the upstream call; it says nothing to
// the browser.

export const ADMIN_CACHE_CONTROL = "private, no-store";

// Passed through as the API sent them. Cache-Control is not: it is always set.
const FORWARDED_HEADERS = ["content-type", "content-disposition", "x-content-type-options", "content-security-policy"];

export function adminProxyResponseHeaders(upstream: Headers): Headers {
    const headers = new Headers();
    for (const name of FORWARDED_HEADERS) {
        const value = upstream.get(name);
        if (value) headers.set(name, value);
    }
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    headers.set("cache-control", ADMIN_CACHE_CONTROL);
    return headers;
}
