export type AdminRole = "viewer" | "support" | "owner";
export type AdminMe = { user: { id: number; username: string; email?: string }; role: AdminRole; machine?: boolean };
export type AdminPage<T> = { page: number; page_size: number; total: number } & T;

export class AdminAPIError extends Error {
    constructor(message: string, public status: number, public payload?: unknown) { super(message); }
}

export async function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`/api/admin/${path.replace(/^\//, "")}`, {
        ...init,
        headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
        cache: "no-store",
    });
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("json") ? await response.json() : await response.text();
    if (!response.ok) {
        const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
        throw new AdminAPIError(String(record.message || record.error || "Admin request failed"), response.status, payload);
    }
    return payload as T;
}

export const AdminAPI = {
    login: (email: string, pin: string) => adminFetch<AdminMe & { expires_at: string }>("login", { method: "POST", body: JSON.stringify({ email, pin }) }),
    logout: () => adminFetch<{ logged_out: boolean }>("logout", { method: "POST" }),
    me: () => adminFetch<AdminMe>("me"),
    get: <T>(path: string) => adminFetch<T>(path),
    post: <T>(path: string, body: unknown) => adminFetch<T>(path, { method: "POST", body: JSON.stringify(body) }),
    patch: <T>(path: string, body: unknown) => adminFetch<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
    put: <T>(path: string, body: unknown) => adminFetch<T>(path, { method: "PUT", body: JSON.stringify(body) }),
};

export function dateWindow(days = 30) {
    const end = new Date();
    const start = new Date(end.getTime() - days * 86400000);
    return { start: start.toISOString(), end: end.toISOString() };
}

export function inclusiveDateRange(start: string, end: string) {
    const endExclusive = new Date(`${end}T00:00:00.000Z`);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    return { start: new Date(`${start}T00:00:00.000Z`).toISOString(), end: endExclusive.toISOString() };
}

export function withQuery(path: string, values: Record<string, string | number | boolean | undefined>) {
    const query = new URLSearchParams();
    Object.entries(values).forEach(([key, value]) => { if (value !== undefined && value !== "") query.set(key, String(value)); });
    const suffix = query.toString();
    return suffix ? `${path}?${suffix}` : path;
}
