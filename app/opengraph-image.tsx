import { ImageResponse } from "next/og";
import { brandTileSvg, svgDataUri, wordmarkSvg } from "./lib/brand";

export const alt = "Finnri — money clarity from records you confirm";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
    return new ImageResponse(
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#111111", color: "white", padding: "72px", fontFamily: "sans-serif" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "18px" }}><img src={svgDataUri(brandTileSvg())} width={60} height={60} alt="" /><img src={svgDataUri(wordmarkSvg("#FFFFFF"))} width={148} height={45} alt="finnri" /></div>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: 920 }}><div style={{ fontSize: 72, lineHeight: 1.04, fontWeight: 850, letterSpacing: "-3px" }}>Money clarity from records you confirm.</div><div style={{ fontSize: 30, color: "#C7C7CC" }}>Confirm-first tracking, explainable insights, and practical planning tools for India.</div></div>
            <div style={{ display: "flex", fontSize: 24, color: "#FF8865", fontWeight: 700 }}>finnri.app</div>
        </div>,
        size,
    );
}
