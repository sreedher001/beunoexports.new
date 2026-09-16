// Cart state now lives in a Context (src/contexts/CartContext.tsx) instead of
// a plain hook, so every component sharing the same cart also shares the same
// live state — e.g. the header badge updates the instant any page adds an
// item, without a page reload. Re-exported from here so existing imports
// (`@/hooks/useCart`) keep working unchanged.
export { useCart, CartProvider } from "@/contexts/CartContext";
export type { CartLine, CartProduct, CartVariant } from "@/contexts/CartContext";
