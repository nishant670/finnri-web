import { cn } from "@/app/lib/utils";
import { PLAY_STORE_URL } from "@/app/lib/site";

/** The Google Play mark, drawn as its four coloured panes. */
function PlayMark({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 26" aria-hidden="true" className={className}>
            <path d="M1.2 1.1 13.6 13 1.2 24.9c-.4-.3-.6-.8-.6-1.4V2.5c0-.6.2-1.1.6-1.4Z" fill="#4285F4" />
            <path d="M17.7 8.9 13.6 13 1.2 1.1C1.7.6 2.6.5 3.4 1l14.3 7.9Z" fill="#34A853" />
            <path d="M17.7 17.1 3.4 25c-.8.5-1.7.4-2.2-.1L13.6 13l4.1 4.1Z" fill="#EA4335" />
            <path d="m22.1 11.4-4.4-2.5-4.1 4.1 4.1 4.1 4.4-2.5c1.3-.7 1.3-2.5 0-3.2Z" fill="#FBBC04" />
        </svg>
    );
}

/**
 * A "Get it on Google Play" button in the store's own badge shape: black in
 * both themes, as Google's badge guidelines ask, with a hairline in dark mode
 * so it doesn't melt into the page.
 */
export default function PlayBadge({ className, size = "lg" }: { className?: string; size?: "md" | "lg" }) {
    return (
        <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="Get Finnri on Google Play"
            className={cn(
                "group inline-flex items-center gap-3 rounded-2xl bg-zinc-950 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.55)] ring-1 ring-black/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-12px_rgba(0,0,0,0.6)] dark:ring-white/20",
                size === "lg" ? "h-[60px] pl-4 pr-6" : "h-[52px] pl-3.5 pr-5",
                className,
            )}
        >
            <PlayMark className={cn("shrink-0 transition-transform duration-300 group-hover:scale-110", size === "lg" ? "h-7 w-7" : "h-6 w-6")} />
            <span className="flex flex-col items-start leading-none">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/75">Get it on</span>
                <span className={cn("mt-1 font-semibold tracking-tight", size === "lg" ? "text-[21px]" : "text-lg")}>Google Play</span>
            </span>
        </a>
    );
}
