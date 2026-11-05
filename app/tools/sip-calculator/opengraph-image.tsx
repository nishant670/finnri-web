import { toolOgImage, toolOgSize } from "@/app/components/tools/tool-og";

export const alt = "Finnri's free SIP calculator";
export const size = toolOgSize;
export const contentType = "image/png";

export default function SipOpenGraphImage() {
    return toolOgImage(["SIP calculator"], "See what a monthly SIP could grow to, with a yearly step-up.");
}
