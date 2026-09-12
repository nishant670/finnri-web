export const ANALYTICS_EVENTS = {
    marketingPageViewed: "Marketing page viewed",
    funnelLanding: "Funnel: landing",
    funnelLogin: "Funnel: login",
    funnelAuthenticated: "Funnel: authenticated",
    funnelCaptureCreated: "Funnel: capture created",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
export type AnalyticsProperties = Readonly<Record<string, string | number | boolean>>;

type PlausibleOptions = { props?: AnalyticsProperties };
type PlausibleFunction = {
    (event: string, options?: PlausibleOptions): void;
    init?: (options?: Record<string, unknown>) => void;
    q?: unknown[][];
};

declare global {
    interface Window {
        plausible?: PlausibleFunction;
    }
}

export function isWebAnalyticsConfigured() {
    return Boolean(process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL?.trim());
}

export function trackAnalyticsEvent(event: AnalyticsEvent, props?: AnalyticsProperties) {
    if (!isWebAnalyticsConfigured() || typeof window === "undefined" || !window.plausible) return;
    window.plausible(event, props ? { props } : undefined);
}
