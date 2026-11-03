import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/app/lib/utils";

/** Signal, Wi-Fi and battery, the way an Android status bar draws them. */
function StatusIcons() {
    return (
        <span className="flex items-center gap-1" aria-hidden="true">
            <svg viewBox="0 0 16 12" className="h-[9px] w-auto fill-current"><path d="M0 9h3v3H0zM4.3 6.5h3V12h-3zM8.6 3.5h3V12h-3zM13 0h3v12h-3z" /></svg>
            <svg viewBox="0 0 16 12" className="h-[9px] w-auto fill-current"><path d="M8 12 0 3.6C2.2 1.4 5 0 8 0s5.8 1.4 8 3.6L8 12Z" /></svg>
            <svg viewBox="0 0 24 12" className="h-[9px] w-auto"><rect x="0.5" y="0.5" width="20" height="11" rx="3" className="fill-none stroke-current" opacity="0.5" /><rect x="2.5" y="2.5" width="16" height="7" rx="1.5" className="fill-current" /><rect x="21.5" y="4" width="2" height="4" rx="1" className="fill-current" opacity="0.5" /></svg>
        </span>
    );
}

/**
 * A slim Android handset: a dark frame, a punch-hole camera and a status bar
 * over whatever screen it is given. Width comes from the caller; the height
 * follows a 9:19.5 screen.
 */
export default function PhoneFrame({
    children,
    className,
    screenClassName,
    screenStyle,
    statusTone = "dark",
}: {
    children: ReactNode;
    className?: string;
    screenClassName?: string;
    screenStyle?: CSSProperties;
    /** The colour of the status bar's ink: dark on a light screen. */
    statusTone?: "dark" | "light";
}) {
    return (
        <div className={cn("relative rounded-[46px] bg-zinc-900 p-[9px] shadow-[0_50px_100px_-30px_rgba(20,10,5,0.55),0_30px_60px_-30px_rgba(0,0,0,0.45)] ring-1 ring-black/40 dark:ring-white/15", className)}>
            {/* Edge highlight and the power and volume keys. */}
            <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[46px] ring-1 ring-inset ring-white/15" />
            <span aria-hidden="true" className="absolute -right-[3px] top-[22%] h-14 w-[3px] rounded-r bg-zinc-800" />
            <span aria-hidden="true" className="absolute -right-[3px] top-[36%] h-24 w-[3px] rounded-r bg-zinc-800" />
            <div className={cn("relative aspect-[9/19.5] overflow-hidden rounded-[38px]", screenClassName)} style={screenStyle}>
                <div className={cn("pointer-events-none absolute inset-x-0 top-0 z-30 flex h-8 items-center justify-between px-6 text-[11px] font-semibold", statusTone === "dark" ? "text-zinc-900" : "text-white")}>
                    <span className="tabular-nums">9:41</span>
                    <StatusIcons />
                </div>
                <span aria-hidden="true" className="absolute left-1/2 top-2.5 z-30 h-[13px] w-[13px] -translate-x-1/2 rounded-full bg-zinc-950 ring-2 ring-zinc-800/60" />
                {children}
            </div>
        </div>
    );
}
