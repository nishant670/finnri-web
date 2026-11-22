"use client";

import { useCallback, useSyncExternalStore } from "react";

// Test accounts (Google Play's pre-launch robots, the team's own accounts) are
// left out of every admin number by default. The choice to include them is a
// per-admin convenience, kept in this browser only.
const STORAGE_KEY = "finnri_admin_include_test";

export const testReasonLabels: Record<string, string> = {
    test_lab: "Play test device",
    internal: "Team or family",
    manual: "Marked by admin",
};

export function testReasonLabel(reason?: string) {
    return (reason && testReasonLabels[reason]) || "Test";
}

// Used when storage is blocked, so the toggle still works for this visit.
let memoryValue = false;
const listeners = new Set<() => void>();

function readIncludeTest() {
    try {
        return window.localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
        return memoryValue;
    }
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
    };
}

export function useIncludeTest() {
    const includeTest = useSyncExternalStore(subscribe, readIncludeTest, () => false);
    const setIncludeTest = useCallback((value: boolean) => {
        memoryValue = value;
        try {
            window.localStorage.setItem(STORAGE_KEY, String(value));
        } catch {
            // Not remembered; memoryValue carries it for this visit.
        }
        listeners.forEach((listener) => listener());
    }, []);
    // undefined drops the parameter from withQuery, so the API default applies.
    return {
        includeTest,
        setIncludeTest,
        includeTestParam: includeTest ? "true" : undefined,
    } as const;
}
