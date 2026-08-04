import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const WHATSAPP_NUMBER = "918428450081";

export function wholesaleEnquiryUrl(productName: string, moq?: number | null, unit?: string) {
  const moqText = moq ? ` (MOQ: ${moq} ${unit ?? "units"})` : "";
  const message = `Hi, I'm interested in a bulk/wholesale quote for ${productName}${moqText}. Please share pricing details.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
