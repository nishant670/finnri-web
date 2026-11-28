import { cn } from "@/app/lib/utils";
import { BRAND_CHARCOAL, BRAND_CORAL, MARK_PATH, WORDMARK_PATH, WORDMARK_VIEWBOX } from "@/app/lib/brand";

/** Finnri's logo: the ₹-F mark on its coral tile, then the outlined "finnri" wordmark. */
export default function BrandMark({ compact = false, tagline = true }: { compact?: boolean; tagline?: boolean }) {
    return (
        <span className="flex items-center gap-2.5">
            <svg aria-hidden="true" viewBox="0 0 100 100" className={cn("shrink-0", compact ? "h-8 w-8" : "h-10 w-10")}>
                <rect width="100" height="100" rx="22.5" fill={BRAND_CORAL} />
                <path d={MARK_PATH} fill={BRAND_CHARCOAL} />
            </svg>
            <span className="flex flex-col gap-1">
                <svg role="img" aria-label="finnri" viewBox={WORDMARK_VIEWBOX} className={cn("w-auto", compact ? "h-[17px]" : "h-[19px]")}>
                    <path d={WORDMARK_PATH} fill="currentColor" />
                </svg>
                {tagline ? <span className="text-[11px] leading-4 text-muted">Money clarity</span> : null}
            </span>
        </span>
    );
}
