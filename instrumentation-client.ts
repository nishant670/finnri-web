import * as Sentry from "@sentry/nextjs";
import { initBrowserCrashReporting } from "./app/lib/crash-reporting";

initBrowserCrashReporting();

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
