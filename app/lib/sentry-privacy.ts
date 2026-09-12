type SentryEventLike = {
    request?: {
        data?: unknown;
        url?: string;
        query_string?: unknown;
        cookies?: unknown;
        headers?: unknown;
    };
    extra?: Record<string, unknown>;
    contexts?: Record<string, unknown>;
};

type SentryBreadcrumbLike = {
    category?: string;
    data?: Record<string, unknown>;
};

const SENSITIVE_KEYS = [
    "amount",
    "title",
    "note",
    "notes",
    "merchant",
    "identifier",
    "phone",
    "email",
    "token",
    "claim_token",
    "otp",
    "pin",
    "transcript",
];

export function redactSentryValues(input: unknown): unknown {
    if (Array.isArray(input)) return input.map(redactSentryValues);
    if (input && typeof input === "object") {
        return Object.fromEntries(
            Object.entries(input as Record<string, unknown>).map(([key, value]) => [
                key,
                SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))
                    ? "[redacted]"
                    : redactSentryValues(value),
            ]),
        );
    }
    return input;
}

export function sanitizeSentryEvent<T extends SentryEventLike>(event: T): T {
    if (event.request) {
        if (event.request.data) event.request.data = redactSentryValues(event.request.data);
        event.request.url = undefined;
        event.request.query_string = undefined;
        event.request.cookies = undefined;
        event.request.headers = undefined;
    }
    if (event.extra) event.extra = redactSentryValues(event.extra) as Record<string, unknown>;
    if (event.contexts) event.contexts = redactSentryValues(event.contexts) as Record<string, unknown>;
    return event;
}

export function sanitizeSentryBreadcrumb<T extends SentryBreadcrumbLike>(breadcrumb: T): T | null {
    if (breadcrumb.category === "console") return null;
    if (breadcrumb.data) breadcrumb.data = redactSentryValues(breadcrumb.data) as Record<string, unknown>;
    return breadcrumb;
}
