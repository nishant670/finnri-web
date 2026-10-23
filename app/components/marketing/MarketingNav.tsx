"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { AuthProvider, useAuth } from "@/app/context/AuthContext";
import BrandMark from "@/app/components/ui/BrandMark";

const navigation = [
    { href: "#how-it-works", label: "How it works" },
    { href: "#features", label: "Features" },
    { href: "#security", label: "Security" },
    { href: "#pricing", label: "Pricing" },
    { href: "/tools", label: "Free tools" },
];

export default function MarketingNav() {
    return (
        <AuthProvider>
            <MarketingNavBar />
        </AuthProvider>
    );
}

function MarketingNavBar() {
    const { user, isLoading, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isAccountOpen, setIsAccountOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const accountRef = useRef<HTMLDivElement>(null);
    const displayName = user ? user.username || (user.is_guest ? "Guest" : "Account") : null;

    useEffect(() => {
        const handleScroll = () => {
            const next = window.scrollY > 20;
            setScrolled((current) => current === next ? current : next);
        };
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        if (!isAccountOpen) return;
        const handlePointerDown = (event: PointerEvent) => {
            if (!accountRef.current?.contains(event.target as Node)) setIsAccountOpen(false);
        };
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") setIsAccountOpen(false);
        };
        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isAccountOpen]);

    return (
        <nav className={`fixed left-0 right-0 top-0 z-50 border-b transition-colors duration-300 ${scrolled ? "border-border bg-background/90 backdrop-blur-xl" : "border-transparent bg-transparent"}`}>
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
                <Link href="/" aria-label="Finnri home">
                    <BrandMark compact tagline={false} />
                </Link>
                <div className="hidden items-center gap-1 lg:flex">
                    {navigation.map((item) => <Link key={item.href} href={item.href} className="rounded-full px-3 py-2 text-sm font-semibold transition-colors hover:bg-track">{item.label}</Link>)}
                    <span className="ml-3">
                        {isLoading ? (
                            <span className="block h-10 w-36" aria-hidden="true" />
                        ) : user ? (
                            <div ref={accountRef} className="relative">
                                <button onClick={() => setIsAccountOpen((open) => !open)} aria-expanded={isAccountOpen} aria-haspopup="menu" className="flex h-10 max-w-52 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-sm font-semibold transition-colors hover:bg-track">
                                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-selected text-xs font-bold text-accent">{displayName!.slice(0, 1).toUpperCase()}</span>
                                    <span className="truncate">{displayName}</span>
                                    <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isAccountOpen ? "rotate-180" : ""}`} />
                                </button>
                                {isAccountOpen && (
                                    <div role="menu" className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-xl">
                                        <Link href="/dashboard" role="menuitem" onClick={() => setIsAccountOpen(false)} className="flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium hover:bg-track">
                                            <LayoutDashboard className="h-4 w-4" /> Dashboard
                                        </Link>
                                        <button role="menuitem" onClick={() => { setIsAccountOpen(false); logout(); }} className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-negative hover:bg-track">
                                            <LogOut className="h-4 w-4" /> Log out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link href="/login" className="inline-flex h-10 items-center rounded-full border border-border px-4 text-sm font-bold transition-colors hover:bg-track">Open dashboard</Link>
                        )}
                    </span>
                </div>
                <button className="grid h-11 w-11 place-items-center rounded-xl lg:hidden" onClick={() => setIsMenuOpen((open) => !open)} aria-expanded={isMenuOpen} aria-controls="marketing-mobile-nav" aria-label="Toggle navigation">
                    {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>
            {isMenuOpen && (
                <div id="marketing-mobile-nav" className="absolute left-0 right-0 top-full border-b border-border bg-card shadow-xl lg:hidden">
                    <div className="flex flex-col px-4 py-3">
                        {navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)} className="flex min-h-12 items-center border-b border-border text-base font-semibold">{item.label}</Link>)}
                        {user ? (
                            <>
                                <p className="mt-3 truncate text-sm text-muted">Signed in as <span className="font-semibold text-foreground">{displayName}</span></p>
                                <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="mt-3 inline-flex h-12 items-center justify-center rounded-full bg-accent text-base font-bold text-on-accent">Open dashboard</Link>
                                <button onClick={() => { setIsMenuOpen(false); logout(); }} className="mt-2 min-h-12 text-base font-semibold text-negative">Log out</button>
                            </>
                        ) : !isLoading && (
                            <Link href="/login" onClick={() => setIsMenuOpen(false)} className="mt-4 inline-flex h-12 items-center justify-center rounded-full bg-accent text-base font-bold text-on-accent">Open dashboard</Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
