import { toolOgImage, toolOgSize } from "@/app/components/tools/tool-og";

export const alt = "Free SIP and EMI calculators from Finnri";
export const size = toolOgSize;
export const contentType = "image/png";

export default function ToolsOpenGraphImage() {
    return toolOgImage(["SIP & EMI", "calculators"], "Step-up SIP projections and full loan schedules, in lakh and crore.");
}
