import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Finnri — Money tracking and planning",
        short_name: "Finnri",
        description: "Confirm-first money tracking and financial planning tools for India.",
        start_url: "/",
        display: "standalone",
        background_color: "#FDF5F7",
        theme_color: "#FF8865",
        icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
    };
}
