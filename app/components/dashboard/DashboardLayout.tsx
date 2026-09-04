"use client";

import React, { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
    BarChart3,
    Bell,
    Calculator,
    CheckCheck,
    ChartNoAxesColumnIncreasing,
    CreditCard,
    Inbox,
    HandCoins,
    LayoutDashboard,
    LogOut,
    Menu,
    Search,
    ShieldAlert,
    Settings,
    TableProperties,
    Wallet,
    X,
} from "lucide-react";
import { cn } from "@/app/lib/utils";
import { useAuth } from "@/app/context/AuthContext";
import { AppNotification, NotificationsAPI } from "@/app/lib/api";
import { formatDate } from "@/app/lib/format";
import { notificationDestination } from "@/app/lib/notifications";
import GuestClaimModal from "@/app/components/dashboard/GuestClaimModal";

const NAV_ITEMS = [
    { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
    { name: "Transactions", href: "/dashboard/transactions", icon: TableProperties },
    { name: "Insights", href: "/dashboard/insights", icon: BarChart3 },
    { name: "Reports", href: "/dashboard/reports", icon: ChartNoAxesColumnIncreasing },
    { name: "Planning & tools", href: "/dashboard/tools", icon: Calculator },
    { name: "Accounts", href: "/dashboard/accounts", icon: Wallet },
    { name: "Splits", href: "/dashboard/splits", icon: HandCoins },
    { name: "Plan & billing", href: "/dashboard/billing", icon: CreditCard },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

function notificationTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return formatDate(date);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isNotificationsLoading, setIsNotificationsLoading] = useState(false);
    const [globalSearch, setGlobalSearch] = useState("");
    const [guestPromptDismissed, setGuestPromptDismissed] = useState(false);
    const notificationPanelRef = useRef<HTMLDivElement | null>(null);
    const menuButtonRef = useRef<HTMLButtonElement | null>(null);
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    const transactionQuery = pathname.startsWith("/dashboard/transactions") ? searchParams.get("q") || "" : "";
    const { user, token, isLoading, logout, beginGuestClaim } = useAuth();

    useEffect(() => {
        setGuestPromptDismissed(sessionStorage.getItem("finnri_guest_prompt_dismissed") === "1");
    }, []);

    const loadNotifications = useCallback(async () => {
        setIsNotificationsLoading(true);
        try {
            const response = await NotificationsAPI.list("all");
            setNotifications(response.data.notifications.slice(0, 6));
            setUnreadCount(response.data.unread_count);
        } catch {
            setNotifications([]);
        } finally {
            setIsNotificationsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isLoading && !token) router.replace("/login");
    }, [isLoading, router, token]);

    useEffect(() => {
        if (token) void loadNotifications();
    }, [loadNotifications, token]);

    useEffect(() => {
        setGlobalSearch(transactionQuery);
    }, [transactionQuery]);

    useEffect(() => {
        const handleClick = (event: MouseEvent) => {
            if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target as Node)) {
                setIsNotificationsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    useEffect(() => {
        if (!isSidebarOpen) return;
        const menuButton = menuButtonRef.current;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") { setIsSidebarOpen(false); menuButtonRef.current?.focus(); }
        };
        document.addEventListener("keydown", onKeyDown);
        return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; menuButton?.focus(); };
    }, [isSidebarOpen]);

    const handleSearch = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const query = String(new FormData(event.currentTarget).get("q") || "").trim();
        const next = pathname.startsWith("/dashboard/transactions")
            ? new URLSearchParams(searchParams.toString())
            : new URLSearchParams();
        if (query) next.set("q", query);
        else next.delete("q");
        next.delete("page");
        router.push(next.size ? `/dashboard/transactions?${next.toString()}` : "/dashboard/transactions");
    };

    const openNotification = async (notification: AppNotification) => {
        if (!notification.read_at) await NotificationsAPI.markRead(notification.id);
        setIsNotificationsOpen(false);
        await loadNotifications();
        const destination = notificationDestination(notification.action_url);
        if (destination) router.push(destination);
    };

    if (isLoading || !token) {
        return <div className="min-h-screen grid place-items-center bg-zinc-50 text-sm font-semibold text-zinc-500">Opening your dashboard…</div>;
    }

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-white lg:flex">
            <a href="#dashboard-content" className="fixed left-4 top-3 z-[180] -translate-y-20 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-white transition-transform focus:translate-y-0">Skip to content</a>
            {isSidebarOpen && (
                <button
                    className="fixed inset-0 z-40 bg-zinc-950/30 lg:hidden"
                    aria-label="Close navigation"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
            <aside id="dashboard-sidebar" className={cn(
                "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-white transition-transform dark:bg-zinc-900 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full",
            )}>
                <div className="flex h-20 items-center justify-between border-b border-border px-6">
                    <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setIsSidebarOpen(false)}>
                        <span className="relative grid h-10 w-24 place-items-center overflow-hidden rounded-xl bg-zinc-950 shadow-lg shadow-zinc-950/15 dark:bg-zinc-800">
                            <Image src="/finnri-logo.png" alt="Finnri" fill sizes="96px" className="scale-[2.35] object-contain" priority />
                        </span>
                        <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Money clarity</span>
                    </Link>
                    <button className="rounded-xl p-2 text-zinc-400 lg:hidden" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6" aria-label="Dashboard navigation">
                    <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Workspace</p>
                    {NAV_ITEMS.map((item) => {
                        const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                aria-current={active ? "page" : undefined}
                                onClick={() => setIsSidebarOpen(false)}
                                className={cn(
                                    "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                                    active ? "bg-accent/10 text-accent" : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white",
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-border p-4">
                    {user?.is_guest && !guestPromptDismissed && <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-100">
                        <div className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /><div className="min-w-0 flex-1"><p className="text-xs font-bold">Save this workspace</p><p className="mt-1 text-[11px] leading-4 opacity-75">Clearing browser data or switching devices can permanently lose this guest data.</p></div><button type="button" onClick={() => { sessionStorage.setItem("finnri_guest_prompt_dismissed", "1"); setGuestPromptDismissed(true); }} className="rounded p-1 opacity-60 hover:opacity-100" aria-label="Dismiss save workspace prompt"><X className="h-3.5 w-3.5" /></button></div>
                        <button type="button" onClick={beginGuestClaim} className="mt-3 min-h-9 w-full rounded-xl bg-amber-900 px-3 text-xs font-bold text-white dark:bg-amber-200 dark:text-amber-950">Save workspace</button>
                    </div>}
                    <div className="mb-3 flex items-center gap-3 rounded-2xl bg-zinc-50 p-3 dark:bg-zinc-800">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-sm font-bold text-accent">
                            {(user?.username || "G").slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{user?.username || "Guest"}</p>
                            <p className="truncate text-xs text-zinc-400">{user?.is_guest ? "Guest workspace" : user?.email || user?.phone}</p>
                        </div>
                    </div>
                    <button onClick={logout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30">
                        <LogOut className="h-5 w-5" /> Sign out
                    </button>
                </div>
            </aside>

            <div className="min-w-0 flex-1">
                <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-border bg-white/90 px-4 backdrop-blur-xl dark:bg-zinc-900/90 sm:px-6 lg:px-8">
                    <button ref={menuButtonRef} className="rounded-xl p-2 text-zinc-500 lg:hidden" onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation" aria-expanded={isSidebarOpen} aria-controls="dashboard-sidebar">
                        <Menu className="h-5 w-5" />
                    </button>
                    <form onSubmit={handleSearch} className="relative max-w-xl flex-1">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                        <input
                            name="q"
                            value={globalSearch}
                            onChange={(event) => setGlobalSearch(event.target.value)}
                            placeholder="Search transactions…"
                            aria-label="Search transactions"
                            className="w-full rounded-2xl border border-transparent bg-zinc-100 py-2.5 pl-11 pr-20 text-sm outline-none transition focus:border-accent/30 focus:bg-white focus:ring-4 focus:ring-accent/10 dark:bg-zinc-800 dark:focus:bg-zinc-900"
                        />
                        <button type="submit" className="absolute right-1.5 top-1/2 min-h-8 -translate-y-1/2 rounded-xl bg-zinc-900 px-3 text-[11px] font-bold text-white dark:bg-white dark:text-zinc-900" aria-label="Run transaction search">Search</button>
                    </form>

                    <div className="relative" ref={notificationPanelRef}>
                        <button
                            onClick={() => setIsNotificationsOpen((open) => !open)}
                            className="relative grid h-11 w-11 place-items-center rounded-2xl border border-border bg-white text-zinc-500 hover:text-accent dark:bg-zinc-900"
                            aria-label="Notifications"
                            aria-expanded={isNotificationsOpen}
                        >
                            <Bell className="h-5 w-5" />
                            {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                        </button>
                        {isNotificationsOpen && (
                            <div className="absolute right-0 mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-border bg-white shadow-2xl dark:bg-zinc-900">
                                <div className="flex items-center justify-between border-b border-border px-5 py-4">
                                    <div><p className="text-sm font-bold">Notifications</p><p className="text-xs text-zinc-400">{unreadCount} unread</p></div>
                                    <button
                                        onClick={async () => { await NotificationsAPI.markAllRead(); await loadNotifications(); }}
                                        disabled={!unreadCount}
                                        className="rounded-xl p-2 text-zinc-400 hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
                                        aria-label="Mark all notifications as read"
                                    ><CheckCheck className="h-4 w-4" /></button>
                                </div>
                                <div className="max-h-96 overflow-y-auto p-2">
                                    {isNotificationsLoading ? <p className="p-6 text-center text-sm text-zinc-400">Loading…</p> : notifications.length === 0 ? (
                                        <div className="p-8 text-center text-zinc-400"><Inbox className="mx-auto mb-2 h-7 w-7" /><p className="text-sm font-semibold">Nothing needs your attention</p></div>
                                    ) : notifications.map((notification) => (
                                        <button key={notification.id} onClick={() => void openNotification(notification)} className={cn("w-full rounded-2xl p-3 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800", !notification.read_at && "bg-accent/5")}>
                                            <div className="flex items-start gap-3"><span className={cn("mt-1.5 h-2 w-2 rounded-full", notification.read_at ? "bg-zinc-200" : "bg-accent")} /><span className="min-w-0"><span className="block text-sm font-bold">{notification.title}</span><span className="mt-0.5 block text-xs leading-5 text-zinc-500">{notification.body}</span><span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{notificationTime(notification.created_at)}</span></span></div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </header>
                <main id="dashboard-content" tabIndex={-1} className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8">{children}</main>
            </div>
            <GuestClaimModal />
        </div>
    );
}
