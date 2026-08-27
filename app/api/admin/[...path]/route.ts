import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_COOKIE = "finnri_admin_session";
const ADMIN_MAX_AGE = 8 * 60 * 60;

function backendURL(request: NextRequest, path: string[]) {
    const base = (process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");
    const special = path.length === 1 && (path[0] === "login" || path[0] === "logout");
    const pathname = special ? `/v1/auth/admin/${path[0]}` : `/v1/admin/${path.join("/")}`;
    return `${base}${pathname}${request.nextUrl.search}`;
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
    const { path } = await context.params;
    const cookieStore = await cookies();
    const adminToken = cookieStore.get(ADMIN_COOKIE)?.value;
    const isLogin = path.length === 1 && path[0] === "login";
    const isLogout = path.length === 1 && path[0] === "logout";
    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    if (isLogin || isLogout) {
        if (adminToken) headers.set("Authorization", `Bearer ${adminToken}`);
    } else {
        const staticBearer = process.env.API_AUTH_BEARER || process.env.AUTH_BEARER;
        if (staticBearer) headers.set("Authorization", `Bearer ${staticBearer}`);
        if (adminToken) headers.set("X-Admin-Session", adminToken);
    }
    const init: RequestInit = { method: request.method, headers, cache: "no-store" };
    if (request.method !== "GET" && request.method !== "HEAD") init.body = await request.arrayBuffer();

    try {
        const upstream = await fetch(backendURL(request, path), init);
        const responseType = upstream.headers.get("content-type") || "application/json";
        const disposition = upstream.headers.get("content-disposition");
        const bytes = await upstream.arrayBuffer();

        if (isLogin && upstream.ok) {
            const payload = JSON.parse(new TextDecoder().decode(bytes)) as Record<string, unknown>;
            const token = typeof payload.token === "string" ? payload.token : "";
            delete payload.token;
            const response = NextResponse.json(payload, { status: upstream.status });
            if (token)
                response.cookies.set(ADMIN_COOKIE, token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: "strict",
                    path: "/",
                    maxAge: ADMIN_MAX_AGE,
                });
            return response;
        }

        const response = new NextResponse(bytes, { status: upstream.status, headers: { "Content-Type": responseType } });
        if (disposition) response.headers.set("Content-Disposition", disposition);
        if (isLogout || upstream.status === 401)
            response.cookies.set(ADMIN_COOKIE, "", {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                path: "/",
                maxAge: 0,
            });
        return response;
    } catch {
        return NextResponse.json({ error: "admin_backend_unavailable" }, { status: 502 });
    }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
