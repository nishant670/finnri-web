import type { NextConfig } from "next";

function apiOrigin() {
    try {
        return new URL(process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").origin;
    } catch {
        throw new Error("NEXT_PUBLIC_API_URL must be an absolute URL");
    }
}

const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    // checkout.razorpay.com serves checkout.js, which then loads its risk-detection
    // bundle from cdn.razorpay.com. Blocking that second script does not raise a
    // visible error on the pay page — it degrades the fraud signal Razorpay scores
    // the transaction with, so the failure arrives later as a decline.
    "script-src 'self' 'unsafe-inline' https://accounts.google.com https://checkout.razorpay.com https://cdn.razorpay.com",
    "style-src 'self' 'unsafe-inline' https://accounts.google.com https://*.razorpay.com",
    // Razorpay renders bank, card-network and UPI-app artwork from its CDN, and
    // the checkout sheet draws part of itself in this document rather than only
    // inside its iframe.
    "img-src 'self' data: blob: https://*.googleusercontent.com https://*.gstatic.com https://*.razorpay.com",
    "font-src 'self' data: https://*.razorpay.com",
    `connect-src 'self' ${apiOrigin()} https://accounts.google.com https://*.razorpay.com`,
    "frame-src https://accounts.google.com https://*.razorpay.com",
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
    { key: "Content-Security-Policy", value: contentSecurityPolicy },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(), payment=(self \"https://checkout.razorpay.com\")" },
];

const nextConfig: NextConfig = {
    poweredByHeader: false,
    productionBrowserSourceMaps: false,
    async headers() {
        return [{ source: "/:path*", headers: securityHeaders }];
    },
    async rewrites() {
        return [
            // The App Router will not route a segment beginning with a dot, and
            // Android insists on this exact path. See app/well-known/assetlinks.
            { source: "/.well-known/assetlinks.json", destination: "/well-known/assetlinks" },
        ];
    },
};

export default nextConfig;
