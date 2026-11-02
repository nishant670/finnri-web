"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/app/lib/utils";

const FOCUSABLE = "a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex='-1'])";

// Nested dialogs share one body-scroll lock. Saving and restoring the overflow
// per instance leaves it stuck when a dialog and the confirmation it opened
// unmount in the same commit: the outer restores "", then the inner restores
// the "hidden" it captured. Only the outermost lock touches the body.
let lockDepth = 0;
let overflowBeforeLock = "";

function lockBodyScroll() {
    if (lockDepth === 0) {
        overflowBeforeLock = document.body.style.overflow;
        document.body.style.overflow = "hidden";
    }
    lockDepth += 1;
}

function unlockBodyScroll() {
    lockDepth = Math.max(0, lockDepth - 1);
    if (lockDepth === 0) document.body.style.overflow = overflowBeforeLock;
}

export default function Dialog({ open, onClose, labelledBy, children, className, panelClassName, animated = true }: {
    open: boolean;
    onClose: () => void;
    labelledBy: string;
    children: React.ReactNode;
    className?: string;
    panelClassName?: string;
    /** False for panels that bring their own entrance, like the side drawer. */
    animated?: boolean;
}) {
    const panelRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!open) return;
        triggerRef.current = document.activeElement as HTMLElement | null;
        lockBodyScroll();
        const panel = panelRef.current;
        const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>(FOCUSABLE) || []).filter((element) => !element.hasAttribute("hidden"));
        window.requestAnimationFrame(() => (focusables()[0] || panel)?.focus());

        const onKeyDown = (event: KeyboardEvent) => {
            const dialogs = Array.from(document.querySelectorAll<HTMLElement>("[role='dialog']"));
            if (dialogs[dialogs.length - 1] !== panel) return;
            if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
            if (event.key !== "Tab") return;
            const items = focusables();
            if (!items.length) { event.preventDefault(); panel?.focus(); return; }
            const first = items[0];
            const last = items[items.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("keydown", onKeyDown);
            unlockBodyScroll();
            triggerRef.current?.focus?.();
        };
    }, [onClose, open]);

    if (!open || typeof document === "undefined") return null;
    return createPortal(
        <div className={cn("font-body fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6", className)}>
            <button type="button" aria-label="Close dialog" tabIndex={-1} onClick={onClose} className="absolute inset-0 cursor-default bg-black/50 backdrop-blur-[2px]" />
            <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1} className={cn(animated && "dialog-enter", "relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-border bg-card text-foreground shadow-2xl outline-none sm:max-h-[calc(100dvh-3rem)] sm:rounded-3xl", panelClassName)}>
                {children}
            </div>
        </div>,
        document.body,
    );
}
