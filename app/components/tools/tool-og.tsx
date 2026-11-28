/* eslint-disable @next/next/no-img-element -- ImageResponse renders plain <img>; next/image does not apply here. */
import { ImageResponse } from "next/og";
import { brandTileSvg, svgDataUri, wordmarkSvg } from "@/app/lib/brand";

export const toolOgSize = { width: 1200, height: 630 };

/** The share card for a tool page: the Finnri mark, the tool's name, one line. */
export function toolOgImage(lines: string[], subtitle: string) {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "linear-gradient(135deg, #FFF8F4 0%, #FFE8E0 100%)", color: "#2D2D2D", padding: "72px", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "18px", fontSize: 32, fontWeight: 800 }}>
        <img src={svgDataUri(brandTileSvg())} width={60} height={60} alt="" />
        <img src={svgDataUri(wordmarkSvg("#2D2D2D"))} width={135} height={41} alt="finnri" />
        <span>· Free tools</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 84, lineHeight: 1, fontWeight: 800, letterSpacing: "-3px" }}>
          {lines.map((line) => <span key={line}>{line}</span>)}
        </div>
        <div style={{ fontSize: 32, color: "#5A5A5A" }}>{subtitle}</div>
      </div>
      <div style={{ display: "flex", gap: "16px", fontSize: 26, color: "#C2410C", fontWeight: 700 }}><span>Free</span><span>•</span><span>No sign-up</span><span>•</span><span>Made for India</span></div>
    </div>,
    toolOgSize,
  );
}
