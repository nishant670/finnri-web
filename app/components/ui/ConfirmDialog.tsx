"use client";

import { Loader2, TriangleAlert } from "lucide-react";
import Dialog from "@/app/components/ui/Dialog";
import { cn } from "@/app/lib/utils";

/** A yes/no question before something that can't be undone, or that costs something. */
export default function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onClose, busy = false, destructive = true }: {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
    onClose: () => void;
    busy?: boolean;
    destructive?: boolean;
}) {
    return (
        <Dialog open={open} onClose={onClose} labelledBy="confirm-dialog-title" panelClassName="sm:max-w-md">
            <div className="p-6">
                <span className={cn("grid h-11 w-11 place-items-center rounded-[12px]", destructive ? "bg-negative/10 text-negative" : "bg-selected text-accent")}><TriangleAlert className="h-5 w-5" /></span>
                <h2 id="confirm-dialog-title" className="mt-4 text-xl font-bold">{title}</h2>
                <p className="mt-1.5 text-[15px] leading-6 text-muted">{description}</p>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onClose} disabled={busy} className="h-11 rounded-full border border-border px-5 text-sm font-bold hover:bg-track disabled:opacity-50">Cancel</button>
                    <button type="button" onClick={() => void onConfirm()} disabled={busy} className={cn("inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold disabled:opacity-60", destructive ? "bg-negative text-background" : "bg-accent text-on-accent")}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{confirmLabel}</button>
                </div>
            </div>
        </Dialog>
    );
}
