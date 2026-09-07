const AUTH_RETURN_KEY = "finnri_auth_return_to";

export function rememberAuthReturnTo(path: string) {
    if (typeof window === "undefined" || !isSafeReturnPath(path)) return;
    sessionStorage.setItem(AUTH_RETURN_KEY, path);
}

export function consumeAuthReturnTo() {
    if (typeof window === "undefined") return "/dashboard";
    const path = sessionStorage.getItem(AUTH_RETURN_KEY) || "";
    sessionStorage.removeItem(AUTH_RETURN_KEY);
    return isSafeReturnPath(path) ? path : "/dashboard";
}

function isSafeReturnPath(path: string) {
    return path.startsWith("/invite/split/") || path.startsWith("/dashboard");
}
