import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const GUEST_CART_KEY = "guest_cart";

type GuestLine = { product_id: string; variant_id: string | null; quantity: number };

export type CartProduct = {
  id: string; name: string; slug: string; price: number; mrp: number;
  image_url: string | null; unit: string; stock: number; sku: string | null;
};
export type CartVariant = { id: string; label: string; price: number; mrp: number; stock: number; sku: string | null };

export type CartLine = {
  key: string; // `${product_id}:${variant_id ?? "base"}` — stable across guest/logged-in
  id: string | null; // cart_items.id when logged in, null for guest lines
  product_id: string;
  variant_id: string | null;
  quantity: number;
  product: CartProduct;
  variant: CartVariant | null;
};

const lineKey = (productId: string, variantId: string | null) => `${productId}:${variantId ?? "base"}`;

function readGuestCart(): GuestLine[] {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? (JSON.parse(raw) as GuestLine[]) : [];
  } catch {
    return [];
  }
}

function writeGuestCart(lines: GuestLine[]) {
  try { localStorage.setItem(GUEST_CART_KEY, JSON.stringify(lines)); } catch { /* storage unavailable */ }
}

// Cart that works logged-out (kept in localStorage) and logged-in (kept in
// cart_items). On login, any guest-saved lines are merged into the account
// once, then cleared from localStorage — mirrors useWishlist's pattern.
export function useCart() {
  const { user } = useAuth();
  const [items, setItems] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGuestItems = useCallback(async (lines: GuestLine[]) => {
    if (lines.length === 0) return [];
    const productIds = [...new Set(lines.map((l) => l.product_id))];
    const variantIds = [...new Set(lines.filter((l) => l.variant_id).map((l) => l.variant_id as string))];
    const [{ data: products }, { data: variants }] = await Promise.all([
      supabase.from("products").select("id,name,slug,price,mrp,image_url,unit,stock,sku").in("id", productIds),
      variantIds.length > 0
        ? supabase.from("product_variants").select("id,label,price,mrp,stock,sku,product_id").in("id", variantIds)
        : Promise.resolve({ data: [] as (CartVariant & { product_id: string })[] }),
    ]);
    const productMap = new Map((products || []).map((p) => [p.id, p]));
    const variantMap = new Map((variants || []).map((v) => [v.id, v]));
    const resolved: CartLine[] = [];
    for (const line of lines) {
      const product = productMap.get(line.product_id);
      if (!product) continue; // product deleted/deactivated since it was added
      const variant = line.variant_id ? variantMap.get(line.variant_id) ?? null : null;
      resolved.push({
        key: lineKey(line.product_id, line.variant_id),
        id: null,
        product_id: line.product_id,
        variant_id: line.variant_id,
        quantity: line.quantity,
        product,
        variant: variant ? { id: variant.id, label: variant.label, price: variant.price, mrp: variant.mrp, stock: variant.stock, sku: variant.sku } : null,
      });
    }
    return resolved;
  }, []);

  const loadUserItems = useCallback(async (userId: string) => {
    const { data } = await supabase.from("cart_items").select("id,product_id,variant_id,quantity,products(*),product_variants(*)").eq("user_id", userId);
    return ((data || []) as unknown as Array<{ id: string; product_id: string; variant_id: string | null; quantity: number; products: CartProduct; product_variants: CartVariant | null }>)
      .filter((row) => row.products)
      .map((row) => ({
        key: lineKey(row.product_id, row.variant_id),
        id: row.id,
        product_id: row.product_id,
        variant_id: row.variant_id,
        quantity: row.quantity,
        product: row.products,
        variant: row.product_variants,
      }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      if (user) {
        const guestLines = readGuestCart();
        if (guestLines.length > 0) {
          for (const line of guestLines) {
            let query = supabase.from("cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", line.product_id);
            query = line.variant_id ? query.eq("variant_id", line.variant_id) : query.is("variant_id", null);
            const { data: existing } = await query.maybeSingle();
            if (existing) {
              await supabase.from("cart_items").update({ quantity: existing.quantity + line.quantity }).eq("id", existing.id);
            } else {
              await supabase.from("cart_items").insert({ user_id: user.id, product_id: line.product_id, variant_id: line.variant_id, quantity: line.quantity });
            }
          }
          writeGuestCart([]);
        }
        const resolved = await loadUserItems(user.id);
        if (!cancelled) setItems(resolved);
      } else {
        const resolved = await loadGuestItems(readGuestCart());
        if (!cancelled) setItems(resolved);
      }
      if (!cancelled) setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [user, loadGuestItems, loadUserItems]);

  const addToCart = useCallback(async (productId: string, variantId: string | null, quantity: number, stock: number) => {
    if (user) {
      let query = supabase.from("cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", productId);
      query = variantId ? query.eq("variant_id", variantId) : query.is("variant_id", null);
      const { data: existing } = await query.maybeSingle();
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, stock);
        await supabase.from("cart_items").update({ quantity: nextQty }).eq("id", existing.id);
      } else {
        await supabase.from("cart_items").insert({ user_id: user.id, product_id: productId, variant_id: variantId, quantity });
      }
      setItems(await loadUserItems(user.id));
    } else {
      const lines = readGuestCart();
      const idx = lines.findIndex((l) => l.product_id === productId && l.variant_id === variantId);
      if (idx >= 0) lines[idx] = { ...lines[idx], quantity: Math.min(lines[idx].quantity + quantity, stock) };
      else lines.push({ product_id: productId, variant_id: variantId, quantity: Math.min(quantity, stock) });
      writeGuestCart(lines);
      setItems(await loadGuestItems(lines));
    }
    toast.success("Added to cart!");
  }, [user, loadUserItems, loadGuestItems]);

  const updateQuantity = useCallback(async (line: CartLine, quantity: number) => {
    const stock = line.variant?.stock ?? line.product.stock;
    if (quantity < 1 || quantity > stock) return;
    if (user && line.id) {
      await supabase.from("cart_items").update({ quantity }).eq("id", line.id);
      setItems((prev) => prev.map((i) => i.key === line.key ? { ...i, quantity } : i));
    } else {
      const lines = readGuestCart().map((l) => (l.product_id === line.product_id && l.variant_id === line.variant_id ? { ...l, quantity } : l));
      writeGuestCart(lines);
      setItems((prev) => prev.map((i) => i.key === line.key ? { ...i, quantity } : i));
    }
  }, [user]);

  const removeFromCart = useCallback(async (line: CartLine) => {
    if (user && line.id) {
      await supabase.from("cart_items").delete().eq("id", line.id);
    } else {
      writeGuestCart(readGuestCart().filter((l) => !(l.product_id === line.product_id && l.variant_id === line.variant_id)));
    }
    setItems((prev) => prev.filter((i) => i.key !== line.key));
    toast.success("Removed from cart");
  }, [user]);

  const clearCart = useCallback(async () => {
    if (user) await supabase.from("cart_items").delete().eq("user_id", user.id);
    else writeGuestCart([]);
    setItems([]);
  }, [user]);

  return { items, loading, addToCart, updateQuantity, removeFromCart, clearCart };
}
