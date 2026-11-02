import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronRight, CircleAlert, Minus } from "lucide-react";
import { cn } from "@/app/lib/utils";

/**
 * The dashboard's shared pieces. Every screen is built from these so a title,
 * a card, a figure and a ranked list look the same wherever they appear.
 */

/** A screen's title, one plain line under it, and its controls on the right. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
    return (
        <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
            <div className="min-w-0">
                {/* Phones show the title in the top bar already. */}
                <h1 className="font-display sr-only text-[34px] font-bold leading-tight lg:not-sr-only">{title}</h1>
                {description ? <p className="text-[15px] text-muted lg:mt-1">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
    );
}

export function Panel({ children, className, ...rest }: { children: ReactNode; className?: string } & React.HTMLAttributes<HTMLElement>) {
    return <section {...rest} className={cn("min-w-0 rounded-2xl border border-border bg-card", className)}>{children}</section>;
}

/** A section heading with an optional count or note, and a link or control on the right. */
export function SectionTitle({ title, id, detail, href, linkLabel, action }: { title: string; id?: string; detail?: ReactNode; href?: string; linkLabel?: string; action?: ReactNode }) {
    return (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 id={id} className="text-[17px] font-bold">{title}</h2>
            <div className="flex items-baseline gap-3">
                {detail ? <p className="text-sm text-muted">{detail}</p> : null}
                {href && linkLabel ? <Link href={href} className="inline-flex items-center gap-0.5 text-sm font-bold hover:underline">{linkLabel}<ChevronRight className="h-4 w-4" /></Link> : null}
                {action}
            </div>
        </div>
    );
}

/**
 * A change against the comparison period. `goodWhen` says which way is good
 * news: less spending is good, more income is good.
 */
export function Change({ value, goodWhen, className }: { value: number | null; goodWhen: "up" | "down"; className?: string }) {
    if (value === null || !Number.isFinite(value)) return null;
    const rounded = Math.round(value);
    const flat = Math.abs(rounded) < 1;
    const good = flat ? null : (rounded > 0) === (goodWhen === "up");
    const Icon = flat ? Minus : rounded > 0 ? ArrowUpRight : ArrowDownRight;
    return (
        <span className={cn("inline-flex items-center gap-0.5 text-[13px] font-semibold tabular-nums", good === null ? "text-muted" : good ? "text-positive" : "text-negative", className)}>
            <Icon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
            {flat ? "Same" : `${Math.abs(rounded)}%`}
            <span className="sr-only">{flat ? "" : rounded > 0 ? " up" : " down"}</span>
        </span>
    );
}

/** One headline figure with its label, a supporting line and its change. */
export function Stat({ label, value, detail, change, goodWhen = "up", tone, text = false, className }: { label: string; value: string; detail?: ReactNode; change?: number | null; goodWhen?: "up" | "down"; tone?: "negative" | "positive"; /** A name rather than a number, set smaller so it fits. */ text?: boolean; className?: string }) {
    return (
        <div className={cn("min-w-0 px-4 py-3.5 sm:px-5 sm:py-4", className)}>
            <p className="truncate text-[13px] font-semibold text-muted">{label}</p>
            <p className={cn("mt-0.5 truncate font-bold tabular-nums", text ? "text-lg leading-8 sm:text-[22px] sm:leading-9" : "text-[22px] leading-8 sm:text-[26px] sm:leading-9", tone === "negative" && "text-negative", tone === "positive" && "text-positive")} title={text ? value : undefined}>{value}</p>
            <div className="flex min-h-5 flex-wrap items-center gap-x-2 text-[13px] leading-5 text-muted">
                {change !== undefined ? <Change value={change} goodWhen={goodWhen} /> : null}
                {detail ? <span>{detail}</span> : null}
            </div>
        </div>
    );
}

/** Figures in one bordered strip: a row on desktop, a 2×2 grid on phones. */
export function StatStrip({ children, label }: { children: ReactNode; label: string }) {
    return (
        <section aria-label={label} className="grid grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-4 [&>*]:border-border max-lg:[&>*:nth-child(odd)]:border-r max-lg:[&>*:nth-child(-n+2)]:border-b lg:[&>*:not(:last-child)]:border-r">
            {children}
        </section>
    );
}

export interface RankedRow {
    key: string;
    label: string;
    sub?: ReactNode;
    amount: string;
    /** 0–1, the row's bar length against the largest row. */
    share: number;
    change?: number | null;
    href?: string;
    leading?: ReactNode;
}

/** A ranked list with a bar under each label: categories, merchants, accounts. */
export function RankedBars({ rows, goodWhen = "down", label }: { rows: RankedRow[]; goodWhen?: "up" | "down"; label: string }) {
    return (
        <ul aria-label={label} className="divide-y divide-border">
            {rows.map((row) => {
                const content = (
                    <>
                        {row.leading}
                        <span className="min-w-0 flex-1">
                            <span className="flex items-baseline justify-between gap-3">
                                <span className="truncate text-[15px] font-semibold">{row.label}</span>
                                <span className="shrink-0 text-[15px] font-bold tabular-nums">{row.amount}</span>
                            </span>
                            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-track" aria-hidden="true">
                                <span className="block h-full rounded-full bg-[var(--series-gain)]" style={{ width: `${Math.max(2, Math.min(100, row.share * 100))}%` }} />
                            </span>
                            <span className="mt-1.5 flex items-center justify-between gap-3 text-[13px] text-muted">
                                <span className="truncate">{row.sub}</span>
                                {row.change !== undefined ? <Change value={row.change} goodWhen={goodWhen} /> : null}
                            </span>
                        </span>
                    </>
                );
                return (
                    <li key={row.key}>
                        {row.href
                            ? <Link href={row.href} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-track sm:px-5">{content}</Link>
                            : <div className="flex items-center gap-3 px-4 py-3 sm:px-5">{content}</div>}
                    </li>
                );
            })}
        </ul>
    );
}

/** A small set of mutually exclusive choices, drawn as one pill. */
export function Segmented<T extends string>({ options, value, onChange, label, className }: { options: ReadonlyArray<{ value: T; label: string }>; value: T; onChange: (value: T) => void; label: string; className?: string }) {
    return (
        <div role="group" aria-label={label} className={cn("inline-flex h-10 rounded-full bg-track p-1", className)}>
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    aria-pressed={value === option.value}
                    onClick={() => onChange(option.value)}
                    className={cn("min-h-8 flex-1 whitespace-nowrap rounded-full px-3.5 text-sm transition sm:flex-none", value === option.value ? "bg-card font-bold shadow-sm dark:bg-border" : "font-medium text-muted hover:text-foreground")}
                >{option.label}</button>
            ))}
        </div>
    );
}

export const buttonSecondary = "inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-border bg-card px-4 text-sm font-bold transition hover:bg-track disabled:opacity-40";
export const buttonPrimary = "inline-flex h-10 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-accent px-4 text-sm font-bold text-on-accent transition hover:brightness-105 disabled:opacity-40";
export const iconButton = "grid h-10 w-10 shrink-0 place-items-center rounded-full border border-border bg-card transition hover:bg-track disabled:opacity-40";

export function EmptyPanel({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
    return (
        <div className="rounded-2xl border border-dashed border-border px-6 py-10 text-center">
            <p className="font-bold">{title}</p>
            {body ? <p className="mx-auto mt-1 max-w-md text-sm text-muted">{body}</p> : null}
            {action ? <div className="mt-4">{action}</div> : null}
        </div>
    );
}

export function ErrorNotice({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-negative/40 bg-negative/10 p-4 text-sm">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-negative" />
            <div className="flex-1"><p>{message}</p>{onRetry ? <button type="button" onClick={onRetry} className="mt-2 font-bold underline">Try again</button> : null}</div>
        </div>
    );
}

/** A small rounded tile with a letter, for people and accounts without an icon. */
export function Monogram({ name, className }: { name: string; className?: string }) {
    return <span aria-hidden="true" className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-selected text-sm font-bold text-eyebrow", className)}>{name.trim().slice(0, 1).toUpperCase() || "?"}</span>;
}
