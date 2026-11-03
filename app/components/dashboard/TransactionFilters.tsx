"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarRange, ChevronDown, IndianRupee, Search, SlidersHorizontal, Tag, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Account, EntryListParams, apiErrorMessage } from "@/app/lib/api";
import { categoryOptionsFor, loadCategories } from "@/app/lib/categories";
import { toLocalISO } from "@/app/lib/format";
import { comparisonRange, DateRange, isPeriodPreset, PERIOD_OPTIONS, PeriodPreset, presetRange, rememberedPeriod, rememberPeriod } from "@/app/lib/period";
import { Segmented } from "@/app/components/dashboard/kit";
import { cn } from "@/app/lib/utils";

export type DateRangePreset = PeriodPreset;

type FilterUpdate = Record<string, string | number | null | undefined>;

export type TransactionFilterState = {
    q: string;
    type: "all" | "expense" | "income";
    accountID: number | "";
    category: string;
    tag: string;
    minAmount: string;
    maxAmount: string;
    dateRange: DateRangePreset;
    startDate: string;
    endDate: string;
    page: number;
};

function currentMonthStart() {
    const date = new Date();
    date.setDate(1);
    return toLocalISO(date);
}

function positiveInteger(value: string | null) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : "";
}

function amountValue(value: string | null) {
    if (value === null || value.trim() === "") return "";
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? value : "";
}

function rangeFor(range: DateRangePreset, startDate: string, endDate: string): DateRange | null {
    if (range === "custom") return { start_date: startDate || currentMonthStart(), end_date: endDate || toLocalISO() };
    return presetRange(range);
}

/**
 * Filters and the period, kept in the URL so a filtered view survives a
 * reload and can be linked to. A screen opened without a period in its URL
 * takes the one last chosen on any screen.
 */
export function useTransactionFilters(defaultRange: Exclude<DateRangePreset, "custom">) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const queryString = searchParams.toString();

    const filters = useMemo<TransactionFilterState>(() => {
        const params = new URLSearchParams(queryString);
        const rangeValue = params.get("range");
        const remembered = rangeValue ? null : rememberedPeriod();
        const dateRange: DateRangePreset = isPeriodPreset(rangeValue) ? rangeValue : remembered?.preset ?? defaultRange;
        const typeValue = params.get("type");
        const accountID = positiveInteger(params.get("account_id"));
        const pageValue = positiveInteger(params.get("page"));
        return {
            q: params.get("q")?.trim() || "",
            type: typeValue === "expense" || typeValue === "income" ? typeValue : "all",
            accountID,
            category: params.get("category")?.trim() || "",
            tag: params.get("tag")?.trim() || "",
            minAmount: amountValue(params.get("min_amount")),
            maxAmount: amountValue(params.get("max_amount")),
            dateRange,
            startDate: params.get("start_date") || remembered?.start_date || (dateRange === "custom" ? currentMonthStart() : ""),
            endDate: params.get("end_date") || remembered?.end_date || (dateRange === "custom" ? toLocalISO() : ""),
            page: typeof pageValue === "number" ? pageValue : 1,
        };
    }, [defaultRange, queryString]);

    const update = useCallback((updates: FilterUpdate, replace = false) => {
        const next = new URLSearchParams(queryString);
        Object.entries(updates).forEach(([key, value]) => {
            if (value === null || value === undefined || value === "") next.delete(key);
            else next.set(key, String(value));
        });
        if (!("page" in updates)) next.delete("page");
        const href = next.size ? `${pathname}?${next.toString()}` : pathname;
        if (replace) router.replace(href, { scroll: false });
        else router.push(href, { scroll: false });
    }, [pathname, queryString, router]);

    const range = useMemo(() => rangeFor(filters.dateRange, filters.startDate, filters.endDate), [filters.dateRange, filters.startDate, filters.endDate]);
    const comparison = useMemo(() => (range ? comparisonRange(range) : null), [range]);

    /** Choose a period here and every other screen opens on it too. */
    const setRange = useCallback((preset: DateRangePreset, dates?: { start_date?: string; end_date?: string }) => {
        if (preset === "custom") {
            const start_date = dates?.start_date ?? (filters.startDate || currentMonthStart());
            const end_date = dates?.end_date ?? (filters.endDate || toLocalISO());
            rememberPeriod({ preset, start_date, end_date });
            update({ range: preset, start_date, end_date });
            return;
        }
        rememberPeriod({ preset });
        update({ range: preset, start_date: null, end_date: null });
    }, [filters.endDate, filters.startDate, update]);

    const filterParams = useCallback((): EntryListParams => {
        const params: EntryListParams = {};
        if (filters.q) params.q = filters.q;
        if (filters.type !== "all") params.type = filters.type;
        if (filters.accountID) params.account_id = filters.accountID;
        if (filters.category) params.category = filters.category;
        if (filters.tag) params.tag = filters.tag;
        if (filters.minAmount !== "") params.min_amount = Number(filters.minAmount);
        if (filters.maxAmount !== "") params.max_amount = Number(filters.maxAmount);
        return params;
    }, [filters]);

    const entryParams = useCallback((includePagination = false): EntryListParams => {
        const params = filterParams();
        if (includePagination) {
            params.page = filters.page;
            params.page_size = 25;
        }
        if (range) Object.assign(params, range);
        return params;
    }, [filterParams, filters.page, range]);

    const amountError = filters.minAmount !== "" && filters.maxAmount !== "" && Number(filters.minAmount) > Number(filters.maxAmount)
        ? "Minimum amount cannot be greater than maximum amount."
        : "";
    const dateError = filters.dateRange === "custom" && filters.startDate && filters.endDate && filters.startDate > filters.endDate
        ? "Start date cannot be after end date."
        : "";

    /** Clears every filter but keeps the period. */
    const clearAll = useCallback(() => {
        update({ q: null, type: null, account_id: null, category: null, tag: null, min_amount: null, max_amount: null });
    }, [update]);

    return { filters, update, setRange, range, comparison, entryParams, filterParams, amountError, dateError, clearAll };
}

export type TransactionFilterController = ReturnType<typeof useTransactionFilters>;

const fieldClass = "h-10 w-full rounded-full border border-border bg-card text-sm outline-none transition focus:border-accent/60 focus:ring-4 focus:ring-accent/10";

/** The period for a screen: a pill that opens the presets, and two dates for Custom. */
export function PeriodPicker({ controller, allowAll = false }: { controller: TransactionFilterController; allowAll?: boolean }) {
    const { filters, setRange } = controller;
    const options = PERIOD_OPTIONS.filter((option) => allowAll || option.value !== "all");
    // A screen without "All time" (Overview) falls back to this month when the
    // shared period is all time; the picker says so rather than naming nothing.
    const value = !allowAll && filters.dateRange === "all" ? "month" : filters.dateRange;
    return (
        <div className="flex flex-wrap items-center gap-2">
            <label className="relative inline-flex">
                <CalendarRange className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" aria-hidden="true" />
                <span className="sr-only">Period</span>
                <select
                    value={value}
                    onChange={(event) => setRange(event.target.value as DateRangePreset)}
                    className={cn(fieldClass, "w-auto appearance-none pl-10 pr-9 font-bold")}
                >
                    {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
            </label>
            {filters.dateRange === "custom" && (
                <span className="inline-flex items-center gap-1.5">
                    <label><span className="sr-only">From</span><input type="date" value={filters.startDate} max={filters.endDate || toLocalISO()} onChange={(event) => event.target.value && setRange("custom", { start_date: event.target.value })} className={cn(fieldClass, "w-auto px-3")} /></label>
                    <span className="text-muted" aria-hidden="true">–</span>
                    <label><span className="sr-only">To</span><input type="date" value={filters.endDate} min={filters.startDate || undefined} max={toLocalISO()} onChange={(event) => event.target.value && setRange("custom", { end_date: event.target.value })} className={cn(fieldClass, "w-auto px-3")} /></label>
                </span>
            )}
        </div>
    );
}

type FilterChip = {
    key: string;
    label: string;
    remove: () => void;
};

function DebouncedFilterInput({
    initialValue,
    onCommit,
    ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange"> & {
    initialValue: string;
    onCommit: (value: string) => void;
}) {
    const [draft, setDraft] = useState(initialValue);

    useEffect(() => {
        if (draft === initialValue) return;
        const timer = window.setTimeout(() => onCommit(draft), 300);
        return () => window.clearTimeout(timer);
    }, [draft, initialValue, onCommit]);

    return <input {...props} value={draft} onChange={(event) => setDraft(event.target.value)} />;
}

const TYPE_OPTIONS = [{ value: "all", label: "All" }, { value: "expense", label: "Spent" }, { value: "income", label: "Received" }] as const;

/**
 * Search, type and account always in view; category, tag and amount behind
 * "More filters". What is applied shows as chips that remove themselves.
 */
export function TransactionFilterPanel({
    controller,
    accounts,
    searchLabel,
    showSearch = true,
    searchInHeader = false,
}: {
    controller: TransactionFilterController;
    accounts: Account[];
    searchLabel: string;
    showSearch?: boolean;
    /** The top bar's search already drives this list on desktop, so only phones need this box. */
    searchInHeader?: boolean;
}) {
    const { filters, update, amountError, dateError, clearAll } = controller;
    const [categories, setCategories] = useState<string[]>([]);
    const [categoriesError, setCategoriesError] = useState("");
    const hasMore = Boolean(filters.category || filters.tag || filters.minAmount || filters.maxAmount);
    const [moreOpen, setMoreOpen] = useState(hasMore);

    useEffect(() => {
        let active = true;
        loadCategories()
            .then((value) => {
                if (!active) return;
                setCategories(value.categories);
                setCategoriesError("");
            })
            .catch((error) => {
                if (!active) return;
                setCategoriesError(apiErrorMessage(error, "Categories are unavailable."));
            });
        return () => { active = false; };
    }, []);

    const chips = useMemo<FilterChip[]>(() => {
        const items: FilterChip[] = [];
        if (filters.q) items.push({ key: "q", label: `“${filters.q}”`, remove: () => update({ q: null }) });
        if (filters.accountID) {
            const account = accounts.find((item) => item.id === filters.accountID);
            items.push({ key: "account", label: account?.name || `Account #${filters.accountID}`, remove: () => update({ account_id: null }) });
        }
        if (filters.category) items.push({ key: "category", label: filters.category, remove: () => update({ category: null }) });
        if (filters.tag) items.push({ key: "tag", label: `#${filters.tag}`, remove: () => update({ tag: null }) });
        if (filters.minAmount !== "") items.push({ key: "min", label: `At least ₹${filters.minAmount}`, remove: () => update({ min_amount: null }) });
        if (filters.maxAmount !== "") items.push({ key: "max", label: `At most ₹${filters.maxAmount}`, remove: () => update({ max_amount: null }) });
        return items;
    }, [accounts, filters, update]);

    return (
        <section className="space-y-3" aria-label="Filters">
            <div className="flex flex-wrap items-center gap-2">
                {showSearch && (
                    <label className={cn("relative min-w-[200px] flex-1", searchInHeader && "lg:hidden")}>
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <span className="sr-only">{searchLabel}</span>
                        <DebouncedFilterInput key={`q-${filters.q}`} initialValue={filters.q} onCommit={(value) => update({ q: value.trim() || null }, true)} placeholder="Search merchant, title or note" className={cn(fieldClass, "pl-11 pr-4")} />
                    </label>
                )}
                <Segmented label="Type" options={TYPE_OPTIONS} value={filters.type} onChange={(value) => update({ type: value === "all" ? null : value })} />
                <label className="relative">
                    <span className="sr-only">Account</span>
                    <select value={filters.accountID} onChange={(event) => update({ account_id: event.target.value || null })} className={cn(fieldClass, "w-auto max-w-[220px] appearance-none pl-4 pr-9 font-semibold")}>
                        <option value="">All accounts</option>
                        {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                </label>
                <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} className={cn("inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition", moreOpen || hasMore ? "border-foreground/25 bg-track" : "border-border bg-card hover:bg-track")}>
                    <SlidersHorizontal className="h-4 w-4" /> More filters
                </button>
            </div>

            {moreOpen && (
                <div className="disclosure-enter grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <label className="relative">
                        <span className="sr-only">Category</span>
                        <select value={filters.category} onChange={(event) => update({ category: event.target.value || null })} disabled={Boolean(categoriesError)} className={cn(fieldClass, "appearance-none pl-4 pr-9 font-semibold disabled:opacity-50")}>
                            <option value="">All categories</option>
                            {categoryOptionsFor(categories, filters.category).map((category) => <option key={category} value={category}>{category}</option>)}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                    </label>
                    <label className="relative">
                        <Tag className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <span className="sr-only">Tag</span>
                        <DebouncedFilterInput key={`tag-${filters.tag}`} initialValue={filters.tag} onCommit={(value) => update({ tag: value.trim() || null }, true)} placeholder="Tag" className={cn(fieldClass, "pl-10 pr-3")} />
                    </label>
                    <label className="relative">
                        <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <span className="sr-only">Minimum amount</span>
                        <DebouncedFilterInput key={`min-${filters.minAmount}`} initialValue={filters.minAmount} onCommit={(value) => update({ min_amount: value || null }, true)} type="number" min="0" step="0.01" placeholder="Minimum amount" className={cn(fieldClass, "pl-10 pr-3")} />
                    </label>
                    <label className="relative">
                        <IndianRupee className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <span className="sr-only">Maximum amount</span>
                        <DebouncedFilterInput key={`max-${filters.maxAmount}`} initialValue={filters.maxAmount} onCommit={(value) => update({ max_amount: value || null }, true)} type="number" min="0" step="0.01" placeholder="Maximum amount" className={cn(fieldClass, "pl-10 pr-3")} />
                    </label>
                </div>
            )}

            {(categoriesError || amountError || dateError) && (
                <div className="space-y-1 text-sm font-semibold text-negative">
                    {categoriesError && <p>{categoriesError} The current category remains visible, but new category choices need the API.</p>}
                    {amountError && <p>{amountError}</p>}
                    {dateError && <p>{dateError}</p>}
                </div>
            )}

            {chips.length > 0 && (
                <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
                    {chips.map((chip) => (
                        <button key={chip.key} type="button" onClick={chip.remove} className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-selected px-3 text-[13px] font-bold" aria-label={`Remove filter ${chip.label}`}>
                            {chip.label}<X className="h-3.5 w-3.5" />
                        </button>
                    ))}
                    <button type="button" onClick={clearAll} className="min-h-8 px-2 text-[13px] font-bold text-muted underline underline-offset-4 hover:text-foreground">Clear filters</button>
                </div>
            )}
        </section>
    );
}
