"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { AuthProvider, useAuth } from "@/app/context/AuthContext";

const navigation = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#security", label: "Security" },
    { href: "#availability", label: "Availability" },
    { href: "/tools", label: "Free Tools" },
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
        <nav className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${scrolled ? "glass-morphism py-3 shadow-sm" : "bg-transparent py-5"}`}>
            <div className="container mx-auto flex items-center justify-between px-6">
                <Link href="/" className="flex items-center gap-2" aria-label="Finnri home">
                    <span className="relative flex h-11 w-28 items-center justify-center overflow-hidden rounded-xl bg-zinc-950 shadow-lg shadow-zinc-950/15">
                        <Image src="/finnri-logo.png" alt="Finnri" fill sizes="112px" className="scale-[2.35] object-contain" priority />
                    </span>
                </Link>
                <div className="hidden items-center gap-8 lg:flex">
                    {navigation.map((item) => <Link key={item.href} href={item.href} className="text-sm font-medium transition-colors hover:text-accent">{item.label}</Link>)}
                    {isLoading ? (
                        <span className="h-9 w-32" aria-hidden="true" />
                    ) : user ? (
                        <div ref={accountRef} className="relative">
                            <button onClick={() => setIsAccountOpen((open) => !open)} aria-expanded={isAccountOpen} aria-haspopup="menu" className="flex h-9 max-w-52 items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 text-sm font-semibold transition-colors hover:border-accent/60">
                                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-zinc-950">{displayName!.slice(0, 1).toUpperCase()}</span>
                                <span className="truncate">{displayName}</span>
                                <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isAccountOpen ? "rotate-180" : ""}`} />
                            </button>
                            {isAccountOpen && (
                                <div role="menu" className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-border bg-white p-1.5 shadow-xl dark:bg-zinc-900">
                                    <Link href="/dashboard" role="menuitem" onClick={() => setIsAccountOpen(false)} className="flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800">
                                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                                    </Link>
                                    <button role="menuitem" onClick={() => { setIsAccountOpen(false); logout(); }} className="flex min-h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                                        <LogOut className="h-4 w-4" /> Log out
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <Link href="/login" className="text-sm font-semibold text-accent transition-opacity hover:opacity-80">Web Dashboard</Link>
                    )}
                </div>
                <button className="p-2 lg:hidden" onClick={() => setIsMenuOpen((open) => !open)} aria-expanded={isMenuOpen} aria-controls="marketing-mobile-nav" aria-label="Toggle navigation">
                    {isMenuOpen ? <X /> : <Menu />}
                </button>
            </div>
            {isMenuOpen && (
                <div id="marketing-mobile-nav" className="absolute left-0 right-0 top-full border-b border-border bg-white shadow-xl animate-in fade-in slide-in-from-top-4 dark:bg-zinc-900 lg:hidden">
                    <div className="flex flex-col gap-4 p-6">
                        {navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setIsMenuOpen(false)} className="text-lg font-medium">{item.label}</Link>)}
                        <div className="my-2 h-px bg-border" />
                        {user ? (
                            <>
                                <p className="truncate text-sm text-zinc-500">Signed in as <span className="font-semibold text-foreground">{displayName}</span></p>
                                <Link href="/dashboard" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-accent">Dashboard</Link>
                                <button onClick={() => { setIsMenuOpen(false); logout(); }} className="text-left text-lg font-medium text-red-600">Log out</button>
                            </>
                        ) : !isLoading && (
                            <Link href="/login" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-accent">Web Dashboard Login</Link>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
