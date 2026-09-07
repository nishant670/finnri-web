"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
    Activity,
    Bot,
    ChartNoAxesCombined,
    ClipboardList,
    LayoutDashboard,
    LogOut,
    Menu,
    MessageSquareText,
    ReceiptIndianRupee,
    Users,
    X,
} from "lucide-react";
import { AdminAPI, AdminMe } from "@/app/lib/admin-api";
import { cn } from "@/app/lib/utils";

const AdminContext = createContext<AdminMe | null>(null);
export const useAdminSession = () => useContext(AdminContext);

const navigation = [
    ["Overview", "/admin", LayoutDashboard],
    ["Users", "/admin/users", Users],
    ["Subscribers", "/admin/subscribers", ReceiptIndianRupee],
    ["AI & credits", "/admin/ai", Bot],
    ["Feedback", "/admin/feedback", MessageSquareText],
    ["Analytics", "/admin/analytics", ChartNoAxesCombined],
    ["Ops", "/admin/ops", Activity],
] as const;

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
    const context = useMemo(() => me, [me]);
    if (loginPage) return children;
    if (!me)
        return (
            <div className="grid min-h-screen place-items-center bg-background">
                <div
                    className="h-10 w-10 animate-spin rounded-full border-4 border-accent/20 border-t-accent"
                    aria-label="Checking admin session"
                />
            </div>
        );
    return (
        <AdminContext.Provider value={context}>
            <div className="min-h-screen bg-background text-foreground">
                <button
                    onClick={() => setMenuOpen(true)}
                    className="fixed left-4 top-4 z-40 grid h-11 w-11 place-items-center rounded-xl border border-border bg-card shadow-sm lg:hidden"
                    aria-label="Open admin navigation"
                >
                    <Menu className="h-5 w-5" />
                </button>
                {menuOpen && (
                    <button
                        className="fixed inset-0 z-40 bg-zinc-950/40 lg:hidden"
                        aria-label="Close navigation"
                        onClick={() => setMenuOpen(false)}
                    />
                )}
                <aside
                    className={cn(
                        "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card p-5 transition-transform lg:translate-x-0",
                        menuOpen ? "translate-x-0" : "-translate-x-full",
                    )}
                >
                    <div className="flex items-center justify-between">
                        <Link href="/admin" className="flex items-center gap-3">
                            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-accent text-lg font-black text-zinc-950">F</span>
                            <div>
                                <p className="font-bold font-rounded">FINNRI Admin</p>
                                <p className="text-[10px] uppercase tracking-[0.2em] text-text-muted">Internal console</p>
                            </div>
                        </Link>
                        <button onClick={() => setMenuOpen(false)} className="lg:hidden">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                    <nav className="mt-8 space-y-1">
                        {navigation.map(([label, href, Icon]) => {
                            const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
                            return (
                                <Link
                                    key={href}
                                    href={href}
                                    onClick={() => setMenuOpen(false)}
                                    className={cn(
                                        "flex min-h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold",
                                        active
                                            ? "bg-accent-secondary text-accent"
                                            : "text-text-muted hover:bg-zinc-100 dark:hover:bg-zinc-800",
                                    )}
                                >
                                    <Icon className="h-4.5 w-4.5" />
                                    {label}
                                </Link>
                            );
                        })}
                    </nav>
                    <div className="mt-auto rounded-2xl border border-border p-4">
                        <div className="flex items-center gap-3">
                            <ClipboardList className="h-5 w-5 text-accent" />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-bold">{me.user.username}</p>
                                <p className="text-xs capitalize text-text-muted">{me.role}</p>
                            </div>
                        </div>
                        <button
                            onClick={async () => {
                                await AdminAPI.logout().catch(() => undefined);
                                router.replace("/admin/login");
                            }}
                            className="mt-4 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 text-xs font-bold dark:bg-zinc-800"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            Sign out
                        </button>
                    </div>
                </aside>
                <main className="min-h-screen px-4 pb-12 pt-20 lg:ml-72 lg:px-8 lg:pt-8 xl:px-10">
                    <div className="mx-auto max-w-[1500px]">{children}</div>
                </main>
            </div>
        </AdminContext.Provider>
    );
}
