import type { Metadata } from "next";
import PublicToolsPage from "./PublicToolsPage";
import { PROJECTION_DISCLAIMER } from "@/app/lib/calculators";

const toolFaqs = [
  { q: "Is the EMI calculator free?", a: "Yes. The EMI calculator on this page is free and does not require login." },
  { q: "Is the SIP calculator free?", a: "Yes. You can estimate SIP maturity value, invested amount, returns, and yearly growth without an account." },
  { q: "Are the calculations financial advice?", a: PROJECTION_DISCLAIMER },
];

export const metadata: Metadata = {
  title: "Free EMI Calculator and SIP Calculator | Finnri",
  description:
    "Use Finnri's free EMI calculator and SIP calculator online. Estimate loan repayments, SIP maturity value, invested amount, returns, and yearly projections without login.",
  keywords: [
    "EMI calculator",
    "SIP calculator",
    "free EMI calculator",
    "free SIP calculator",
    "loan EMI calculator India",
    "mutual fund SIP calculator",
    "investment calculator India",
  ],
  alternates: {
    canonical: "/tools",
  },
  openGraph: {
    title: "Free EMI Calculator and SIP Calculator | Finnri",
    description:
      "Estimate loan EMI and SIP maturity value online without creating an account.",
    url: "/tools",
    siteName: "Finnri",
    type: "website",
  },
};

export default function ToolsPage() {
  const calculatorSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Free EMI Calculator and SIP Calculator",
    description:
      "Free online EMI and SIP calculators for estimating loan repayments and investment projections in India.",
    mainEntity: [
      {
        "@type": "SoftwareApplication",
        name: "EMI Calculator",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      },
      {
        "@type": "SoftwareApplication",
        name: "SIP Calculator",
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      },
    ],
  };
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: toolFaqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calculatorSchema) }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <PublicToolsPage />
    </>
  );
}
