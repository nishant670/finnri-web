import * as Sentry from "@sentry/nextjs";
import { sanitizeSentryBreadcrumb, sanitizeSentryEvent } from "./sentry-privacy";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ?? "";

export const isBrowserCrashReportingConfigured = dsn.length > 0;

export function initBrowserCrashReporting() {
    if (!isBrowserCrashReportingConfigured) return;

    Sentry.init({
        dsn,
        environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT?.trim() || process.env.NODE_ENV,
        tracesSampleRate: 0,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        sendDefaultPii: false,
        beforeSend: sanitizeSentryEvent,
        beforeBreadcrumb: sanitizeSentryBreadcrumb,
    });
}

export function reportBrowserError(error: unknown) {
    if (!isBrowserCrashReportingConfigured) return;
    Sentry.captureException(error);
}
