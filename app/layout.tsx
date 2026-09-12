import type { Metadata } from "next";
import "./globals.css";
import { SITE_URL } from "./lib/site";
import AnalyticsRouteTracker from "./components/analytics/AnalyticsRouteTracker";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Finnri | Financial insights and planning tools",
  description: "Understand your spending, review recurring patterns, and plan with FINNRI's explainable financial dashboard.",
  manifest: "/manifest.webmanifest",
  icons: { apple: "/apple-icon.png" },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDF5F7" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1A1A" },
  ],
  colorScheme: "light dark",
};

const themeScript = `(function(){try{var t=localStorage.getItem('finnri_theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}})()`;
const plausibleScriptURL = process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL?.trim() ?? "";
const plausibleInitScript = `window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)};window.plausible.init=window.plausible.init||function(options){window.plausible.o=options||{}};window.plausible.init({autoCapturePageviews:false})`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {plausibleScriptURL && <script async src={plausibleScriptURL} />}
        {plausibleScriptURL && <script dangerouslySetInnerHTML={{ __html: plausibleInitScript }} />}
      </head>
      <body className="antialiased font-sans"><AnalyticsRouteTracker />{children}</body>
    </html>
  );
}
