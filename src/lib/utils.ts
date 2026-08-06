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

const BUY_NOW_KEY = "buyNowItem";

export type BuyNowItem = { product_id: string; variant_id: string | null; quantity: number };

export function setBuyNowItem(item: BuyNowItem) {
  sessionStorage.setItem(BUY_NOW_KEY, JSON.stringify(item));
}

export function getBuyNowItem(): BuyNowItem | null {
  const raw = sessionStorage.getItem(BUY_NOW_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as BuyNowItem;
  } catch {
    return null;
  }
}

export function clearBuyNowItem() {
  sessionStorage.removeItem(BUY_NOW_KEY);
}
