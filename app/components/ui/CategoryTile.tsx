import {
    Briefcase,
    Bus,
    FileText,
    Gift,
    HandCoins,
    MoreHorizontal,
    Percent,
    Plane,
    PlayCircle,
    ReceiptText,
    ShoppingCart,
    Tag,
    UtensilsCrossed,
    type LucideIcon,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

/**
 * Each category's glyph and hue, as the app draws them (finnri-app
 * `lib/categories.ts`), so a row reads the same on the phone and the web.
 * A category the map does not know gets a neutral tag rather than a guess.
 */
const VISUALS: Record<string, { icon: LucideIcon; hue: string }> = {
    "food & drinks": { icon: UtensilsCrossed, hue: "#D4A017" },
    transport: { icon: Bus, hue: "#E57373" },
    travel: { icon: Plane, hue: "#7E57C2" },
    shopping: { icon: ShoppingCart, hue: "#42A5F5" },
    bills: { icon: FileText, hue: "#26A69A" },
    entertainment: { icon: PlayCircle, hue: "#5C6BC0" },
    "family/gifts": { icon: Gift, hue: "#EC407A" },
    misc: { icon: MoreHorizontal, hue: "#90A4AE" },
    salary: { icon: Briefcase, hue: "#16A34A" },
    freelance: { icon: HandCoins, hue: "#0D9488" },
    interest: { icon: Percent, hue: "#2563EB" },
    refund: { icon: ReceiptText, hue: "#7C3AED" },
};

const FALLBACK = { icon: Tag, hue: "#64748B" };

export function categoryVisual(category?: string | null) {
    return VISUALS[String(category ?? "").trim().toLowerCase()] ?? FALLBACK;
}

/** A 36px (or `size`) tile tinted with the category's hue, its glyph in the hue. */
export default function CategoryTile({ category, size = 36, className }: { category?: string | null; size?: number; className?: string }) {
    const { icon: Icon, hue } = categoryVisual(category);
    return (
        <span
            aria-hidden="true"
            className={cn("grid shrink-0 place-items-center rounded-[10px]", className)}
            style={{ width: size, height: size, backgroundColor: `color-mix(in srgb, ${hue} 18%, transparent)`, color: hue }}
        >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </span>
    );
}
