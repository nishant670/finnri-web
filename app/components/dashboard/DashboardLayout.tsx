"use client";

import React, { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import BrandMark from "@/app/components/ui/BrandMark";

/** The sidebar, in the three groups board R9-Drawer draws. */
const NAV_GROUPS = [
    {
        label: "Workspace",
        items: [
            { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
            { name: "Transactions", href: "/dashboard/transactions", icon: TableProperties },
            { name: "Insights", href: "/dashboard/insights", icon: BarChart3 },
            { name: "Reports", href: "/dashboard/reports", icon: ChartNoAxesColumnIncreasing },
            { name: "Planning & tools", href: "/dashboard/tools", icon: Calculator },
        ],
    },
    {
        label: "Money",
        items: [
            { name: "Accounts", href: "/dashboard/accounts", icon: Wallet },
            { name: "Splits", href: "/dashboard/splits", icon: HandCoins },
        ],
    },
    {
        label: "Account",
        items: [
            { name: "Plan & billing", href: "/dashboard/billing", icon: CreditCard },
            { name: "Settings", href: "/dashboard/settings", icon: Settings },
        ],
    },
];

const NAV_ITEMS = NAV_GROUPS.flatMap((group) => group.items);

const isActive = (href: string, pathname: string) => href === "/dashboard" ? pathname === href : pathname.startsWith(href);

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
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
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
        setIsMobileSearchOpen(false);
        router.push(next.size ? `/dashboard/transactions?${next.toString()}` : "/dashboard/transactions");
    };

    const openNotification = async (notification: AppNotification) => {
        if (!notification.read_at) await NotificationsAPI.markRead(notification.id);
        setIsNotificationsOpen(false);
        await loadNotifications();
        const destination = notificationDestination(notification.action_url);
        if (destination) router.push(destination);
    };

    const pageTitle = NAV_ITEMS.find((item) => isActive(item.href, pathname))?.name ?? "Dashboard";

    if (isLoading || !token) {
        return <div className="min-h-screen grid place-items-center bg-background text-sm font-semibold text-muted">Opening your dashboard…</div>;
    }

    const searchForm = (className: string, autoFocus = false) => (
        <form onSubmit={handleSearch} className={cn("relative", className)} role="search">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
                name="q"
                value={globalSearch}
                autoFocus={autoFocus}
                onChange={(event) => setGlobalSearch(event.target.value)}
                placeholder="Search transactions"
                aria-label="Search transactions"
                className="h-11 w-full rounded-full border border-border bg-card pl-11 pr-4 text-sm outline-none transition placeholder:text-muted focus:border-accent/60 focus:ring-4 focus:ring-accent/10"
            />
            <button type="submit" className="sr-only">Run transaction search</button>
        </form>
    );

    return (
        <div className="min-h-screen bg-background text-foreground lg:flex">
            <a href="#dashboard-content" className="fixed left-4 top-3 z-[180] -translate-y-20 rounded-xl bg-accent px-4 py-3 text-sm font-bold text-on-accent transition-transform focus:translate-y-0">Skip to content</a>
            {isSidebarOpen && (
                <button
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    aria-label="Close navigation"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
            <aside id="dashboard-sidebar" className={cn(
                "fixed inset-y-0 left-0 z-50 flex w-[min(300px,80vw)] flex-col border-r border-border bg-card px-3 py-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-[260px] lg:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full",
            )}>
                <div className="flex h-14 items-center justify-between px-2">
                    <Link href="/dashboard" aria-label="Finnri overview" onClick={() => setIsSidebarOpen(false)}>
                        <BrandMark compact />
                    </Link>
                    <button className="grid h-11 w-11 place-items-center rounded-xl text-foreground lg:hidden" onClick={() => setIsSidebarOpen(false)} aria-label="Close navigation">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <nav className="mt-2 flex-1 overflow-y-auto" aria-label="Dashboard navigation">
                    {NAV_GROUPS.map((group) => (
                        <div key={group.label} className="mb-4">
                            <p className="mx-3 mb-1.5 mt-2 text-xs font-semibold text-muted">{group.label}</p>
                            {group.items.map((item) => {
                                const active = isActive(item.href, pathname);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        aria-current={active ? "page" : undefined}
                                        onClick={() => setIsSidebarOpen(false)}
                                        className={cn(
                                            "flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors",
                                            active ? "bg-selected font-bold" : "font-medium hover:bg-track",
                                        )}
                                    >
                                        <item.icon className={cn("h-5 w-5 shrink-0", active ? "text-accent" : "text-muted")} strokeWidth={1.8} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <div className="pt-2">
                    {user?.is_guest && !guestPromptDismissed && <div className="mb-3 rounded-2xl border border-border bg-warning-surface p-3">
                        <div className="flex items-start gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" /><div className="min-w-0 flex-1"><p className="text-xs font-bold">Save this workspace</p><p className="mt-1 text-[11px] leading-4 text-muted">Clearing browser data or switching devices can permanently lose this guest data.</p></div><button type="button" onClick={() => { sessionStorage.setItem("finnri_guest_prompt_dismissed", "1"); setGuestPromptDismissed(true); }} className="rounded p-1 text-muted hover:text-foreground" aria-label="Dismiss save workspace prompt"><X className="h-3.5 w-3.5" /></button></div>
                        <button type="button" onClick={beginGuestClaim} className="mt-3 min-h-9 w-full rounded-full border border-border bg-card px-3 text-xs font-bold">Save workspace</button>
                    </div>}
                    <div className="flex items-center gap-3 rounded-2xl bg-track p-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-selected text-sm font-bold text-accent">
                            {(user?.username || "G").slice(0, 1).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold">{user?.username || "Guest"}</p>
                            <p className="truncate text-xs text-muted">{user?.is_guest ? "Guest workspace" : user?.email || user?.phone}</p>
                        </div>
                        <button onClick={logout} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted hover:bg-card hover:text-foreground" aria-label="Sign out" title="Sign out">
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </aside>

            <div className="min-w-0 flex-1">
                <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-xl">
                    <div className="flex h-16 items-center gap-2 px-3 sm:px-6 lg:h-[68px] lg:gap-4 lg:px-8">
                        <button ref={menuButtonRef} className="grid h-11 w-11 place-items-center rounded-xl lg:hidden" onClick={() => setIsSidebarOpen(true)} aria-label="Open navigation" aria-expanded={isSidebarOpen} aria-controls="dashboard-sidebar">
                            <Menu className="h-6 w-6" />
                        </button>
                        <p className="min-w-0 flex-1 truncate text-xl font-bold lg:hidden">{pageTitle}</p>
                        {searchForm("hidden max-w-[460px] flex-1 lg:block")}
                        <div className="hidden flex-1 lg:block" />
                        <button
                            className="grid h-11 w-11 place-items-center rounded-xl lg:hidden"
                            onClick={() => setIsMobileSearchOpen((open) => !open)}
                            aria-label={isMobileSearchOpen ? "Close search" : "Search transactions"}
                            aria-expanded={isMobileSearchOpen}
                        >
                            {isMobileSearchOpen ? <X className="h-6 w-6" /> : <Search className="h-6 w-6" />}
                        </button>

                        <div className="relative" ref={notificationPanelRef}>
                            <button
                                onClick={() => setIsNotificationsOpen((open) => !open)}
                                className="relative grid h-11 w-11 place-items-center rounded-full text-foreground lg:border lg:border-border"
                                aria-label="Notifications"
                                aria-expanded={isNotificationsOpen}
                            >
                                <Bell className="h-5 w-5" />
                                {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                            </button>
                            {isNotificationsOpen && (
                                <div className="absolute right-0 mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                                        <div><p className="text-sm font-bold">Notifications</p><p className="text-xs text-muted">{unreadCount} unread</p></div>
                                        <button
                                            onClick={async () => { await NotificationsAPI.markAllRead(); await loadNotifications(); }}
                                            disabled={!unreadCount}
                                            className="grid h-10 w-10 place-items-center rounded-xl text-muted hover:bg-track disabled:opacity-40"
                                            aria-label="Mark all notifications as read"
                                        ><CheckCheck className="h-4 w-4" /></button>
                                    </div>
                                    <div className="max-h-96 overflow-y-auto">
                                        {isNotificationsLoading ? <p className="p-6 text-center text-sm text-muted">Loading…</p> : notifications.length === 0 ? (
                                            <div className="p-8 text-center text-muted"><Inbox className="mx-auto mb-2 h-7 w-7" /><p className="text-sm font-semibold">Nothing needs your attention</p></div>
                                        ) : notifications.map((notification) => (
                                            <button key={notification.id} onClick={() => void openNotification(notification)} className={cn("w-full border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-track", !notification.read_at && "bg-selected/60")}>
                                                <div className="flex items-start gap-3"><span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", notification.read_at ? "bg-border" : "bg-accent")} /><span className="min-w-0"><span className="block text-sm font-bold">{notification.title}</span><span className="mt-0.5 block text-xs leading-5 text-muted">{notification.body}</span><span className="mt-1 block text-xs text-muted">{notificationTime(notification.created_at)}</span></span></div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {isMobileSearchOpen ? <div className="px-4 pb-3 lg:hidden">{searchForm("w-full", true)}</div> : null}
                </header>
                <main id="dashboard-content" tabIndex={-1} className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6 lg:px-8 lg:py-7">{children}</main>
            </div>
            <GuestClaimModal />
        </div>
    );
}
