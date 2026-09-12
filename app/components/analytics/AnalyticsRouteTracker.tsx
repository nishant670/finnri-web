"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ANALYTICS_EVENTS, trackAnalyticsEvent } from "@/app/lib/analytics";

const MARKETING_PATHS = new Set([
    "/",
    "/contact",
    "/delete-account",
    "/pricing",
    "/privacy",
    "/refunds",
    "/shipping",
    "/terms",
    "/tools",
]);

export default function AnalyticsRouteTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (MARKETING_PATHS.has(pathname)) {
            trackAnalyticsEvent(ANALYTICS_EVENTS.marketingPageViewed, { page: pathname });
        }
        if (pathname === "/") trackAnalyticsEvent(ANALYTICS_EVENTS.funnelLanding);
        if (pathname === "/login") trackAnalyticsEvent(ANALYTICS_EVENTS.funnelLogin);
    }, [pathname]);

    return null;
}
