export function percent(value: number | null | undefined, digits = 1) {
    const safe = Number.isFinite(value) ? Number(value) : 0;
    return `${safe.toFixed(digits)}%`;
}

export function compactNumber(value: number | null | undefined) {
    const safe = Number.isFinite(value) ? Number(value) : 0;
    return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(safe);
}

export function trendTone(delta: number | null | undefined): "positive" | "negative" | "neutral" {
    if (!delta) return "neutral";
    return delta > 0 ? "positive" : "negative";
}
