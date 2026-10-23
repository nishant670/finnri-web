"use client";

import React, { useId } from "react";
import { ChevronDown, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "@/app/lib/utils";

/**
 * The second level of a form: optional settings behind one labelled row.
 *
 * The row reads the folded settings back ("Reminder 3 days before · Autopay
 * off"), which is what lets it stay closed by default. A closed "Advanced"
 * section is a question — did I miss something in there? — and people who
 * cannot see a default tend to open it to check. Shown, the defaults read as a
 * decision already made, and the form looks as short as it really is.
 *
 * The content is not rendered while closed. A hidden `required` input still
 * blocks submit, silently, with nothing on screen to explain why; every form
 * that uses this opens it itself when a message points inside.
 */
export default function FormDisclosure({
    label,
    summary,
    open,
    onToggle,
    icon: Icon = SlidersHorizontal,
    children,
    className,
}: {
    label: string;
    summary?: string;
    open: boolean;
    onToggle: () => void;
    icon?: LucideIcon;
    children: React.ReactNode;
    className?: string;
}) {
    const panelId = useId();
    return (
        <div className={cn("rounded-2xl border border-border bg-card", className)}>
            <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={onToggle}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/60"
            >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent">
                    <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{label}</span>
                    {summary && <span className={cn("mt-0.5 block text-xs text-zinc-500", !open && "truncate")}>{summary}</span>}
                </span>
                <ChevronDown className={cn("h-5 w-5 shrink-0 text-zinc-400 transition-transform", open && "rotate-180")} aria-hidden />
            </button>
            {open && (
                <div id={panelId} className="disclosure-enter space-y-4 border-t border-border px-4 pb-4 pt-4">
                    {children}
                </div>
            )}
        </div>
    );
}
