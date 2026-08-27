/**
 * Display formatting lives here so the same stored value cannot acquire a
 * different meaning from one screen to the next. API payloads stay as raw
 * numbers and ISO dates; only values crossing into the UI use these helpers.
 */

export type MoneyValue = number | string | null | undefined;
export type DateValue = Date | string | null | undefined;

// Preserve every stored paise everywhere. Aggregate and transaction views use
// the same precision so independently rendered category totals still add up to
// the headline total. Integer values are not padded with a synthetic `.00`.
const currency = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});

export function formatMoney(value: MoneyValue): string {
    const amount = typeof value === "string" ? Number(value.replace(/[\s,]/g, "")) : Number(value ?? 0);
    return currency.format(Number.isFinite(amount) ? amount : 0);
}

/** Integer paise from billing/admin APIs, formatted only at the render boundary. */
export function formatMinorMoney(value: MoneyValue): string {
    const minor = typeof value === "string" ? Number(value) : Number(value ?? 0);
    return formatMoney(Number.isFinite(minor) ? minor / 100 : 0);
}

export function formatUSDMicros(value: MoneyValue): string {
    const micros = typeof value === "string" ? Number(value) : Number(value ?? 0);
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(Number.isFinite(micros) ? micros / 1_000_000 : 0);
}

function parseDate(value: DateValue): Date | null {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const source = value?.trim();
    if (!source) return null;

    // A date-only API value is a calendar day, not midnight UTC. Construct it
    // locally so users west of UTC do not see the previous day.
    const calendarDate = source.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (calendarDate) {
        const date = new Date(Number(calendarDate[1]), Number(calendarDate[2]) - 1, Number(calendarDate[3]));
        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = new Date(source);
    return Number.isNaN(date.getTime()) ? null : date;
}

function dateParts(date: Date, includeYear: boolean): string {
    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        ...(includeYear ? { year: "numeric" as const } : {}),
    }).format(date);
}

/** Calendar date for inline UI, for example `20 Aug` or `20 Aug 2025`. */
export function formatDate(value: DateValue): string {
    const date = parseDate(value);
    if (!date) return "—";
    return dateParts(date, date.getFullYear() !== new Date().getFullYear());
}

/** Compact, unambiguous period label, for example `1–20 Aug 2026`. */
export function formatDateRange(startValue: DateValue, endValue: DateValue): string {
    const start = parseDate(startValue);
    const end = parseDate(endValue);
    if (!start || !end) return "—";

    const sameYear = start.getFullYear() === end.getFullYear();
    const sameMonth = sameYear && start.getMonth() === end.getMonth();
    if (sameMonth) {
        const monthAndYear = new Intl.DateTimeFormat("en-IN", { month: "short", year: "numeric" }).format(end);
        return `${start.getDate()}–${end.getDate()} ${monthAndYear}`;
    }
    if (sameYear) return `${dateParts(start, false)} – ${dateParts(end, true)}`;
    return `${dateParts(start, true)} – ${dateParts(end, true)}`;
}

type TimeOfDay = { hours: number; minutes: number };

function parseTime(value: DateValue): TimeOfDay | null {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : { hours: value.getHours(), minutes: value.getMinutes() };
    }

    const source = value?.trim();
    if (!source) return null;

    const clock = source.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([ap])\.?\s?m\.?$/i);
    if (clock) {
        let hours = Number(clock[1]) % 12;
        if (clock[3].toLowerCase() === "p") hours += 12;
        const minutes = Number(clock[2]);
        return minutes > 59 ? null : { hours, minutes };
    }

    const bareClock = source.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (bareClock) {
        const hours = Number(bareClock[1]);
        const minutes = Number(bareClock[2]);
        return hours > 23 || minutes > 59 ? null : { hours, minutes };
    }

    const date = parseDate(source);
    return date ? { hours: date.getHours(), minutes: date.getMinutes() } : null;
}

/** Time rendered with the browser/device's 12- or 24-hour preference. */
export function formatTime(value: DateValue): string | null {
    const time = parseTime(value);
    if (!time) return null;
    const date = new Date(2000, 0, 1, time.hours, time.minutes);
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

/** Canonical time written to the API, regardless of the display clock. */
export function toApiTime(value: DateValue): string | null {
    const time = parseTime(value);
    if (!time) return null;
    return `${String(time.hours).padStart(2, "0")}:${String(time.minutes).padStart(2, "0")}`;
}

/**
 * Local calendar value for native date/datetime-local inputs and date-only API
 * fields. `Date#toISOString` is UTC; shifting by this instant's own timezone
 * offset before slicing preserves the calendar day and clock the user sees.
 */
export function toLocalISO(date: Date = new Date(), precision: "date" | "minute" = "date"): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString();
    return local.slice(0, precision === "minute" ? 16 : 10);
}
