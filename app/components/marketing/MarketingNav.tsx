"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { PLAY_STORE_URL } from "@/app/lib/site";

const navigation = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it works" },
    { href: "#security", label: "Security" },
    { href: "#availability", label: "Availability" },
    { href: "/tools", label: "Free Tools" },
];

export default function MarketingNav() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const next = window.scrollY > 20;
            setScrolled((current) => current === next ? current : next);
        };
        handleScroll();
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

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
                    <Link href="/login" className="text-sm font-semibold text-accent transition-opacity hover:opacity-80">Web Dashboard</Link>
                    <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer" className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-zinc-950 shadow-lg shadow-accent/30 transition-all hover:scale-105 active:scale-95">Get the Android app</a>
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
                        <Link href="/login" onClick={() => setIsMenuOpen(false)} className="text-lg font-bold text-accent">Web Dashboard Login</Link>
                        <a href={PLAY_STORE_URL} target="_blank" rel="noreferrer" onClick={() => setIsMenuOpen(false)} className="rounded-2xl bg-accent px-6 py-4 text-center font-bold text-zinc-950 shadow-lg">Get the Android app</a>
                    </div>
                </div>
            )}
        </nav>
    );
}
