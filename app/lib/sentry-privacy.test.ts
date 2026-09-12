import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeSentryBreadcrumb, sanitizeSentryEvent } from "./sentry-privacy";

test("Sentry events redact finance and identity fields while keeping useful context", () => {
    const event = sanitizeSentryEvent({
        request: {
            url: "https://finnri.app/invite/secret-token?email=someone@example.com",
            query_string: "email=someone@example.com",
            cookies: "session=secret",
            headers: { authorization: "Bearer secret" },
            data: { amount: 2499, merchant: "Blue Tokai", screen: "transactions" },
        },
        extra: {
            note: "coffee with Priya",
            nested: { pin: "1234", accountIdentifier: "4111", harmless: "ok" },
        },
        contexts: { entry: { email: "someone@example.com", kind: "expense" } },
    });

    assert.deepEqual(event.request.data, { amount: "[redacted]", merchant: "[redacted]", screen: "transactions" });
    assert.equal(event.request.url, undefined);
    assert.equal(event.request.query_string, undefined);
    assert.equal(event.request.cookies, undefined);
    assert.equal(event.request.headers, undefined);
    assert.deepEqual(event.extra, {
        note: "[redacted]",
        nested: { pin: "[redacted]", accountIdentifier: "[redacted]", harmless: "ok" },
    });
    assert.deepEqual(event.contexts, { entry: { email: "[redacted]", kind: "expense" } });
});

test("Sentry drops console breadcrumbs and redacts the rest", () => {
    assert.equal(sanitizeSentryBreadcrumb({ category: "console", data: { amount: 2499 } }), null);
    assert.deepEqual(
        sanitizeSentryBreadcrumb({ category: "navigation", data: { token: "secret", screen: "home" } }),
        { category: "navigation", data: { token: "[redacted]", screen: "home" } },
    );
});
