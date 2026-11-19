"use client";

import { useCallback, useMemo, useState } from "react";

// People picked across pages of an admin list, for bulk actions like gifting.
// Only what the action needs is kept: the id, a name to show, and whether
// they're a guest (a guest can't hold a pass).
export type SelectedUser = { id: number; username: string; is_guest: boolean };

export function useUserSelection() {
    const [selected, setSelected] = useState<Map<number, SelectedUser>>(new Map());
    const toggle = useCallback((user: SelectedUser) => {
        setSelected((current) => {
            const next = new Map(current);
            if (next.has(user.id)) next.delete(user.id);
            else next.set(user.id, user);
            return next;
        });
    }, []);
    // Select a whole page, or clear it if it's already all selected.
    const togglePage = useCallback((users: SelectedUser[]) => {
        setSelected((current) => {
            const next = new Map(current);
            const allIn = users.length > 0 && users.every((user) => next.has(user.id));
            users.forEach((user) => (allIn ? next.delete(user.id) : next.set(user.id, user)));
            return next;
        });
    }, []);
    const addAll = useCallback((users: SelectedUser[]) => {
        setSelected((current) => {
            const next = new Map(current);
            users.forEach((user) => next.set(user.id, user));
            return next;
        });
    }, []);
    const clear = useCallback(() => setSelected(new Map()), []);
    const users = useMemo(() => Array.from(selected.values()), [selected]);
    return { selected, users, toggle, togglePage, addAll, clear, has: (id: number) => selected.has(id) } as const;
}
