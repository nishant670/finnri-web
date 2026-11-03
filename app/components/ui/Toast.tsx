"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

type ToastInput = { title: string; description?: string; actionLabel?: string; onAction?: () => void | Promise<void> };
type ToastRecord = ToastInput & { id: number };
const ToastContext = createContext<{ toast: (input: ToastInput) => void }>({ toast: () => undefined });

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<ToastRecord[]>([]);
    const dismiss = useCallback((id: number) => setToasts((current) => current.filter((item) => item.id !== id)), []);
    const toast = useCallback((input: ToastInput) => {
        const id = Date.now() + Math.random();
        setToasts((current) => [...current, { ...input, id }]);
        window.setTimeout(() => dismiss(id), input.actionLabel ? 8000 : 4500);
    }, [dismiss]);
    const value = useMemo(() => ({ toast }), [toast]);
    return <ToastContext.Provider value={value}>{children}<div className="font-body pointer-events-none fixed inset-x-4 bottom-4 z-[200] flex flex-col items-end gap-2 sm:left-auto sm:w-96" aria-live="polite" aria-atomic="false">{toasts.map((item) => <div key={item.id} role="status" className="dialog-enter pointer-events-auto w-full rounded-2xl border border-border bg-card px-4 py-3.5 text-foreground shadow-2xl"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-positive" /><div className="min-w-0 flex-1"><p className="text-sm font-bold">{item.title}</p>{item.description && <p className="mt-0.5 text-[13px] leading-5 text-muted">{item.description}</p>}{item.actionLabel && <button type="button" onClick={async () => { await item.onAction?.(); dismiss(item.id); }} className="-ml-2 mt-1 rounded-full px-2 py-1 text-[13px] font-bold underline underline-offset-2 hover:bg-track">{item.actionLabel}</button>}</div><button type="button" onClick={() => dismiss(item.id)} className="grid h-8 w-8 place-items-center rounded-full text-muted hover:bg-track hover:text-foreground" aria-label="Dismiss notification"><X className="h-4 w-4" /></button></div></div>)}</div></ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);
