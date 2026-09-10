import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const GUEST_WISHLIST_KEY = "guest_wishlist";

function readGuestWishlist(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeGuestWishlist(ids: string[]) {
  try { localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(ids)); } catch { /* storage unavailable */ }
}

// Wishlist that works logged-out (kept in localStorage) and logged-in (kept in
// wishlist_items). On login, any guest-saved ids are merged into the account
// once, then cleared from localStorage.
export function useWishlist() {
  const { user } = useAuth();
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      if (user) {
        const guestIds = readGuestWishlist();
        if (guestIds.length > 0) {
          await supabase.from("wishlist_items").upsert(
            guestIds.map((product_id) => ({ user_id: user.id, product_id })),
            { onConflict: "user_id,product_id", ignoreDuplicates: true }
          );
          writeGuestWishlist([]);
        }
        const { data } = await supabase.from("wishlist_items").select("product_id").eq("user_id", user.id);
        if (!cancelled) setWishlistIds(new Set(data?.map((w) => w.product_id) || []));
      } else {
        if (!cancelled) setWishlistIds(new Set(readGuestWishlist()));
      }
      if (!cancelled) setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [user]);

  const toggle = useCallback(async (productId: string) => {
    const has = wishlistIds.has(productId);

    if (user) {
      if (has) {
        await supabase.from("wishlist_items").delete().eq("user_id", user.id).eq("product_id", productId);
      } else {
        await supabase.from("wishlist_items").insert({ user_id: user.id, product_id: productId });
      }
    } else {
      const next = has ? readGuestWishlist().filter((id) => id !== productId) : [...readGuestWishlist(), productId];
      writeGuestWishlist(next);
    }

    setWishlistIds((prev) => {
      const next = new Set(prev);
      if (has) next.delete(productId); else next.add(productId);
      return next;
    });
    toast.success(has ? "Removed from wishlist" : "Added to wishlist!");
  }, [user, wishlistIds]);

  return { wishlistIds, toggle, loading };
}
