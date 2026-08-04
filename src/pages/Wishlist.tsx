import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

type WishlistItem = {
  id: string;
  product_id: string;
  products: {
    id: string; name: string; slug: string; price: number; mrp: number;
    image_url: string | null; unit: string; stock: number;
  };
};

const Wishlist = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("wishlist_items").select("*, products(*)").eq("user_id", user.id)
      .then(({ data }) => { setItems((data as unknown as WishlistItem[]) || []); setLoading(false); });
  }, [user]);

  const remove = async (id: string) => {
    await supabase.from("wishlist_items").delete().eq("id", id);
    setItems((p) => p.filter((i) => i.id !== id));
    toast.success("Removed from wishlist");
  };

  const addToCart = async (productId: string) => {
    if (!user) return;
    const product = items.find((i) => i.products.id === productId)?.products;
    const { data: existing } = await supabase.from("cart_items").select("id, quantity")
      .eq("user_id", user.id).eq("product_id", productId).maybeSingle();

    if (existing) {
      const nextQty = product ? Math.min(existing.quantity + 1, product.stock) : existing.quantity + 1;
      await supabase.from("cart_items").update({ quantity: nextQty }).eq("id", existing.id);
    } else {
      await supabase.from("cart_items").insert({ user_id: user.id, product_id: productId, quantity: 1 });
    }
    toast.success("Added to cart!");
  };

  if (!user) return (
    <div className="section-padding text-center">
      <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <h2 className="mb-2">Login to View Wishlist</h2>
      <Link to="/auth" className="text-primary hover:underline">Login / Sign Up</Link>
    </div>
  );

  return (
    <div className="section-padding">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">My Wishlist ({items.length})</h1>
        {loading ? <p className="text-muted-foreground">Loading...</p> : items.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground mb-4">Your wishlist is empty</p>
            <Link to="/shop" className="inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Browse Products</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <Link to={`/product/${item.products.slug}`}>
                  <img src={item.products.image_url || "/placeholder.svg"} alt={item.products.name} className="w-full aspect-square object-cover" />
                </Link>
                <div className="p-4">
                  <Link to={`/product/${item.products.slug}`}>
                    <h3 className="font-semibold text-sm mb-1 hover:text-secondary">{item.products.name}</h3>
                  </Link>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-bold">₹{item.products.price}</span>
                    {item.products.mrp > item.products.price && (
                      <span className="text-xs text-muted-foreground line-through">₹{item.products.mrp}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => addToCart(item.products.id)}
                      className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground flex items-center justify-center gap-1">
                      <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                    </button>
                    <button onClick={() => remove(item.id)} className="rounded-lg border border-border px-3 py-2 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
