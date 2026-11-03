import { formatDateRange, toLocalISO } from "./format";

/**
 * The dashboard's reporting periods. Every screen reads its dates from here,
 * and the last one chosen is remembered for the tab, so moving from Overview
 * to Reports keeps the same period.
 */
export type PeriodPreset = "month" | "last-month" | "30d" | "90d" | "year" | "all" | "custom";

export interface DateRange { start_date: string; end_date: string }

export const PERIOD_OPTIONS: ReadonlyArray<{ value: PeriodPreset; label: string }> = [
    { value: "month", label: "This month" },
    { value: "last-month", label: "Last month" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "year", label: "This year" },
    { value: "all", label: "All time" },
    { value: "custom", label: "Custom dates" },
];

export function isPeriodPreset(value: string | null | undefined): value is PeriodPreset {
    return PERIOD_OPTIONS.some((option) => option.value === value);
}

const day = (year: number, month: number, date: number) => new Date(year, month, date);
const lastDayOf = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

/** The dates a preset covers on `today`; null for all time, which has no bounds. */
export function presetRange(preset: Exclude<PeriodPreset, "custom">, today = new Date()): DateRange | null {
    const y = today.getFullYear();
    const m = today.getMonth();
    switch (preset) {
        case "all": return null;
        case "month": return { start_date: toLocalISO(day(y, m, 1)), end_date: toLocalISO(today) };
        case "last-month": return { start_date: toLocalISO(day(y, m - 1, 1)), end_date: toLocalISO(day(y, m, 0)) };
        case "year": return { start_date: toLocalISO(day(y, 0, 1)), end_date: toLocalISO(today) };
        case "30d":
        case "90d": {
            const start = new Date(today);
            start.setDate(today.getDate() - (preset === "30d" ? 29 : 89));
            return { start_date: toLocalISO(start), end_date: toLocalISO(today) };
        }
    }
}

function parse(value: string) {
    const [y, m, d] = value.split("-").map(Number);
    return day(y, m - 1, d);
}

export function daysIn(range: DateRange) {
    return Math.round((parse(range.end_date).getTime() - parse(range.start_date).getTime()) / 86_400_000) + 1;
}

/**
 * What a period is compared with, by the API's own rule
 * (`previousComparisonWindow`), so every change on screen agrees with the
 * per-category changes the API sends. A range inside one month that starts on
 * the 1st compares with the same days of the month before (1–2 Nov with
 * 1–2 Oct), clipped where that month is shorter. Anything else compares with
 * the same number of days just before it.
 */
export function comparisonRange(range: DateRange): DateRange {
    const start = parse(range.start_date);
    const end = parse(range.end_date);
    if (start.getDate() === 1 && start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
        const y = start.getFullYear();
        const m = start.getMonth() - 1;
        const endDay = Math.min(end.getDate(), lastDayOf(y, m));
        return { start_date: toLocalISO(day(y, m, 1)), end_date: toLocalISO(day(y, m, endDay)) };
    }
    const length = daysIn(range);
    const previousEnd = new Date(start);
    previousEnd.setDate(start.getDate() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousEnd.getDate() - (length - 1));
    return { start_date: toLocalISO(previousStart), end_date: toLocalISO(previousEnd) };
}

/** True when a range is one calendar month, whole or to date, so a month axis fits it. */
export function isWithinOneMonth(range: DateRange) {
    const start = parse(range.start_date);
    const end = parse(range.end_date);
    return start.getDate() === 1 && start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth();
}

/** The whole calendar month a date falls in, for drawing a month-to-date against. */
export function wholeMonthOf(value: string): DateRange {
    const date = parse(value);
    return {
        start_date: toLocalISO(day(date.getFullYear(), date.getMonth(), 1)),
        end_date: toLocalISO(day(date.getFullYear(), date.getMonth(), lastDayOf(date.getFullYear(), date.getMonth()))),
    };
}

/** Percentage change, or null when there is nothing to compare with. */
export function percentChange(current: number, previous: number): number | null {
    if (!Number.isFinite(previous) || previous <= 0) return null;
    return ((current - previous) / previous) * 100;
}

/** "18% more than 1–2 Oct 2026", "about the same as …", or null. */
export function changeSentence(current: number, previous: number, range: DateRange): string | null {
    const change = percentChange(current, previous);
    if (change === null) return null;
    const label = formatDateRange(range.start_date, range.end_date);
    const rounded = Math.round(Math.abs(change));
    if (rounded < 1) return `About the same as ${label}`;
    return `${rounded}% ${change > 0 ? "more" : "less"} than ${label}`;
}

const STORAGE_KEY = "finnri_dashboard_period";

export interface RememberedPeriod { preset: PeriodPreset; start_date?: string; end_date?: string }

export function rememberPeriod(period: RememberedPeriod) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(period)); } catch { /* storage blocked: the URL still carries it */ }
}

export function rememberedPeriod(): RememberedPeriod | null {
    try {
        const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null") as RememberedPeriod | null;
        return parsed && isPeriodPreset(parsed.preset) ? parsed : null;
    } catch {
        return null;
    }
}
