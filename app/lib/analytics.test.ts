import assert from "node:assert/strict";
import test from "node:test";
import { ANALYTICS_EVENTS, isWebAnalyticsConfigured, trackAnalyticsEvent } from "./analytics";

test("analytics is completely inert without the Plausible script URL", () => {
    const original = process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL;
    const calls: unknown[][] = [];
    process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL = "";
    globalThis.window = { plausible: (...args: unknown[]) => calls.push(args) } as unknown as Window & typeof globalThis;

    assert.equal(isWebAnalyticsConfigured(), false);
    trackAnalyticsEvent(ANALYTICS_EVENTS.funnelLanding);
    assert.deepEqual(calls, []);

    if (original === undefined) delete process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL;
    else process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL = original;
    delete (globalThis as { window?: Window }).window;
});

test("analytics sends only the explicit event and coarse properties", () => {
    const original = process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL;
    const calls: unknown[][] = [];
    process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL = "https://plausible.io/js/pa-site.js";
    globalThis.window = { plausible: (...args: unknown[]) => calls.push(args) } as unknown as Window & typeof globalThis;

    trackAnalyticsEvent(ANALYTICS_EVENTS.funnelAuthenticated, { method: "guest" });
    assert.deepEqual(calls, [[ANALYTICS_EVENTS.funnelAuthenticated, { props: { method: "guest" } }]]);

    if (original === undefined) delete process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL;
    else process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL = original;
    delete (globalThis as { window?: Window }).window;
});
