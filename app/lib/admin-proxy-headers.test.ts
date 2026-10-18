import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN_CACHE_CONTROL, adminProxyResponseHeaders } from "./admin-proxy-headers";

test("an attachment keeps the API's no-store and hardening headers", () => {
    const headers = adminProxyResponseHeaders(new Headers({
        "Content-Type": "image/png",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; img-src 'self'; object-src 'none'; sandbox",
        "Set-Cookie": "upstream=1",
    }));
    assert.equal(headers.get("content-type"), "image/png");
    assert.equal(headers.get("cache-control"), ADMIN_CACHE_CONTROL);
    assert.equal(headers.get("x-content-type-options"), "nosniff");
    assert.match(headers.get("content-security-policy") ?? "", /sandbox/);
    assert.equal(headers.get("set-cookie"), null, "only the listed headers pass through");
});

test("every admin response is no-store, even when the API says otherwise", () => {
    const cacheable = adminProxyResponseHeaders(new Headers({ "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" }));
    assert.equal(cacheable.get("cache-control"), ADMIN_CACHE_CONTROL);
    const silent = adminProxyResponseHeaders(new Headers());
    assert.equal(silent.get("cache-control"), ADMIN_CACHE_CONTROL);
    assert.equal(silent.get("content-type"), "application/json");
});

test("an export keeps its download name", () => {
    const headers = adminProxyResponseHeaders(new Headers({ "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="users.csv"' }));
    assert.equal(headers.get("content-disposition"), 'attachment; filename="users.csv"');
});
