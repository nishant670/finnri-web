"use client";

import { Gift, X } from "lucide-react";
import RoleGate from "@/app/components/admin/RoleGate";

// Sticks to the bottom of the screen while people are selected in a list.
export default function SelectionBar({ count, onGift, onClear }: { count: number; onGift: () => void; onClear: () => void }) {
    if (count === 0) return null;
    return (
        <div className="sticky bottom-4 z-30 flex items-center justify-between gap-3 rounded-2xl border border-accent/40 bg-card p-3 pl-5 shadow-2xl">
            <span className="text-sm font-bold">
                {count.toLocaleString("en-IN")} {count === 1 ? "person" : "people"} selected
            </span>
            <div className="flex gap-2">
                <button
                    onClick={onClear}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-bold"
                >
                    <X className="h-4 w-4" />
                    Clear
                </button>
                <RoleGate minimum="support">
                    <button
                        onClick={onGift}
                        className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent px-4 text-sm font-bold text-on-accent"
                    >
                        <Gift className="h-4 w-4" />
                        Gift
                    </button>
                </RoleGate>
            </div>
        </div>
    );
}

// The checkbox used in list rows and headers.
export function SelectBox({
    checked,
    indeterminate = false,
    onChange,
    label,
}: {
    checked: boolean;
    indeterminate?: boolean;
    onChange: () => void;
    label: string;
}) {
    return (
        <input
            type="checkbox"
            aria-label={label}
            checked={checked}
            ref={(element) => {
                if (element) element.indeterminate = indeterminate;
            }}
            onChange={onChange}
            onClick={(event) => event.stopPropagation()}
            className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
        />
    );
}
