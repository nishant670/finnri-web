"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
    Activity,
    Bot,
    ChartNoAxesCombined,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageSquareText,
    ReceiptIndianRupee,
    Users,
    X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminAPI, AdminMe } from "@/app/lib/admin-api";
import BrandMark from "@/app/components/ui/BrandMark";
import { cn } from "@/app/lib/utils";

const AdminContext = createContext<AdminMe | null>(null);
export const useAdminSession = () => useContext(AdminContext);

/** The admin console's sections, grouped the way the user dashboard groups its own. */
type NavItem = readonly [label: string, href: string, icon: LucideIcon];
const NAV_GROUPS: ReadonlyArray<{ label: string; items: ReadonlyArray<NavItem> }> = [
    { label: "Business", items: [["Overview", "/admin", LayoutDashboard], ["Subscribers", "/admin/subscribers", ReceiptIndianRupee], ["Analytics", "/admin/analytics", ChartNoAxesCombined]] },
    { label: "People", items: [["Users", "/admin/users", Users], ["Feedback", "/admin/feedback", MessageSquareText]] },
    { label: "System", items: [["AI & credits", "/admin/ai", Bot], ["Ops", "/admin/ops", Activity]] },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);
const isActive = (href: string, pathname: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

export default function AdminShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [me, setMe] = useState<AdminMe | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const loginPage = pathname === "/admin/login";
    useEffect(() => {
        if (loginPage) return;
        AdminAPI.me()
            .then(setMe)
            .catch(() => router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`));
    }, [loginPage, pathname, router]);
    useEffect(() => {
        if (!menuOpen) return;
        const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [menuOpen]);
    const context = useMemo(() => me, [me]);
    if (loginPage) return <div className="font-body">{children}</div>;
    if (!me)
        return (
            <div className="font-body grid min-h-screen place-items-center bg-background text-sm font-semibold text-muted" role="status">
                Checking your admin session…
            </div>
        );
    const pageTitle = NAV_ITEMS.find(([, href]) => isActive(href, pathname))?.[0] ?? "Admin";
    return (
        <AdminContext.Provider value={context}>
            <div className="font-body min-h-screen bg-background text-foreground lg:flex">
                {menuOpen && <button className="fixed inset-0 z-40 bg-black/50 lg:hidden" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
                <aside
                    id="admin-sidebar"
                    className={cn(
                        "fixed inset-y-0 left-0 z-50 flex w-[min(280px,80vw)] flex-col border-r border-border bg-card px-3 py-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-[248px] lg:translate-x-0",
                        menuOpen ? "translate-x-0" : "-translate-x-full",
                    )}
                >
                    <div className="flex h-14 items-center justify-between px-2">
                        <Link href="/admin" className="flex items-center gap-2" onClick={() => setMenuOpen(false)} aria-label="Admin overview">
                            <BrandMark compact tagline={false} />
                            <span className="rounded-full bg-selected px-2 py-0.5 text-[11px] font-bold text-eyebrow">Admin</span>
                        </Link>
                        <button className="grid h-10 w-10 place-items-center rounded-full lg:hidden" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X className="h-5 w-5" /></button>
                    </div>
                    <nav className="mt-2 flex-1 overflow-y-auto" aria-label="Admin navigation">
                        {NAV_GROUPS.map((group) => (
                            <div key={group.label} className="mb-4">
                                <p className="mx-3 mb-1.5 mt-2 text-xs font-semibold text-muted">{group.label}</p>
                                {group.items.map(([label, href, Icon]) => {
                                    const active = isActive(href, pathname);
                                    return (
                                        <Link
                                            key={href}
                                            href={href}
                                            aria-current={active ? "page" : undefined}
                                            onClick={() => setMenuOpen(false)}
                                            className={cn("flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors", active ? "bg-selected font-bold" : "font-medium hover:bg-track")}
                                        >
                                            <Icon className={cn("h-5 w-5 shrink-0", active ? "text-accent" : "text-muted")} strokeWidth={1.8} />
                                            {label}
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>
                    <div className="flex items-center gap-3 rounded-2xl bg-track p-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-selected text-sm font-bold text-eyebrow">{me.user.username.slice(0, 1).toUpperCase()}</span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{me.user.username}</p>
                            <p className="truncate text-xs capitalize text-muted">{me.machine ? "Machine token" : me.role}</p>
                        </div>
                        <button
                            onClick={async () => {
                                await AdminAPI.logout().catch(() => undefined);
                                router.replace("/admin/login");
                            }}
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-card hover:text-foreground"
                            aria-label="Sign out"
                            title="Sign out"
                        >
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </aside>
                <div className="min-w-0 flex-1">
                    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur-xl lg:hidden">
                        <button className="grid h-11 w-11 place-items-center rounded-xl" onClick={() => setMenuOpen(true)} aria-label="Open navigation" aria-expanded={menuOpen} aria-controls="admin-sidebar"><Menu className="h-6 w-6" /></button>
                        <p className="font-display min-w-0 flex-1 truncate text-xl font-bold">{pageTitle}</p>
                    </header>
                    <main className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
                </div>
            </div>
        </AdminContext.Provider>
    );
}
