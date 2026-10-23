"use client";

import React from "react";
import { Plus, type LucideIcon } from "lucide-react";

export type AddDetailOption<Key extends string> = {
    key: Key;
    label: string;
    icon: LucideIcon;
};

/**
 * Optional fields as offers instead of blanks.
 *
 * A form that lays out every optional field asks every question at once, and
 * its length is read before any one field is — "who is going to fill all
 * this?" Most entries need none of them. A chip says the detail exists and
 * becomes the field only when someone wants that one, so the form grows by
 * exactly what they chose to add.
 *
 * A detail that already holds something is not offered here: the caller shows
 * it as a field, because a value tucked behind a chip reads as lost.
 */
export default function AddDetailChips<Key extends string>({
    options,
    onAdd,
    title = "Add details",
}: {
    options: readonly AddDetailOption<Key>[];
    onAdd: (key: Key) => void;
    title?: string;
}) {
    if (options.length === 0) return null;
    return (
        <div>
            {title && <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">{title}</p>}
            <div className="flex flex-wrap gap-2">
                {options.map((option) => {
                    const Icon = option.icon;
                    return (
                        <button
                            key={option.key}
                            type="button"
                            onClick={() => onAdd(option.key)}
                            aria-label={`Add ${option.label.toLowerCase()}`}
                            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-zinc-300 bg-card px-3.5 text-xs font-bold text-zinc-600 transition-colors hover:border-accent hover:text-accent dark:border-zinc-600 dark:text-zinc-300"
                        >
                            <Plus className="h-3.5 w-3.5 text-accent" aria-hidden />
                            <Icon className="h-3.5 w-3.5 text-zinc-400" aria-hidden />
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
