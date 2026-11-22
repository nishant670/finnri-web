"use client";

import { FlaskConical } from "lucide-react";

// Pill switch shared by every admin page that counts users.
export default function IncludeTestToggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={value}
            onClick={() => onChange(!value)}
            className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition ${
                value ? "border-accent bg-selected text-accent" : "border-border bg-card text-muted hover:text-foreground"
            }`}
        >
            <FlaskConical className="h-4 w-4" />
            {value ? "Including test users" : "Real users only"}
        </button>
    );
}
