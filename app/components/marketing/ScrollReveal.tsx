"use client";

import { useEffect } from "react";

/**
 * Marks every `[data-reveal]` element on the page as revealed the first time it
 * scrolls into view; globals.css does the motion. One observer for the whole
 * page keeps the sections themselves server components.
 */
export default function ScrollReveal() {
    useEffect(() => {
        const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])"));
        if (!("IntersectionObserver" in window)) {
            targets.forEach((target) => target.setAttribute("data-revealed", ""));
            return;
        }
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                entry.target.setAttribute("data-revealed", "");
                observer.unobserve(entry.target);
            }
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
        targets.forEach((target) => observer.observe(target));
        return () => observer.disconnect();
    }, []);
    return null;
}
