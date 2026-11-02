import { toolOgImage, toolOgSize } from "@/app/components/tools/tool-og";

export const alt = "Finnri's free EMI calculator";
export const size = toolOgSize;
export const contentType = "image/png";

export default function EmiOpenGraphImage() {
    return toolOgImage(["EMI calculator"], "Monthly EMI, total interest and a full repayment schedule.");
}
