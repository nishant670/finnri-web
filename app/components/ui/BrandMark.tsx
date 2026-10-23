import { cn } from "@/app/lib/utils";

/** Finnri's mark (boards R9-*): an accent tile with a rounded "f", then the name. */
export default function BrandMark({ compact = false, tagline = true }: { compact?: boolean; tagline?: boolean }) {
    return (
        <span className="flex items-center gap-2.5">
            <span aria-hidden="true" className={cn("grid shrink-0 place-items-center bg-accent font-rounded font-black text-on-accent", compact ? "h-8 w-8 rounded-[9px] text-lg" : "h-10 w-10 rounded-xl text-xl")}>f</span>
            <span className="flex flex-col">
                <span className={cn("font-rounded font-black leading-5", compact ? "text-lg" : "text-xl")}>finnri</span>
                {tagline ? <span className="text-[11px] leading-4 text-muted">Money clarity</span> : null}
            </span>
        </span>
    );
}
