import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/hooks/useWishlist";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Product = {
  id: string; name: string; slug: string; price: number; mrp: number;
  image_url: string | null; unit: string; stock: number;
};

const Wishlist = () => {
  const { user } = useAuth();
  const { wishlistIds, toggle, loading: wishlistLoading } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [variantInfo, setVariantInfo] = useState<Record<string, { minPrice: number; minMrp: number }>>({});

  useEffect(() => {
    if (wishlistLoading) return;
    const ids = Array.from(wishlistIds);
    if (ids.length === 0) { setProducts([]); setVariantInfo({}); setLoading(false); return; }

    supabase.from("products").select("id,name,slug,price,mrp,image_url,unit,stock").in("id", ids)
      .then(async ({ data }) => {
        setProducts(data || []);
        setLoading(false);
        const { data: allVariants } = await supabase.from("product_variants").select("product_id, price, mrp").in("product_id", ids);
        const info: Record<string, { minPrice: number; minMrp: number }> = {};
        (allVariants || []).forEach((v) => {
          const cur = info[v.product_id];
          if (!cur || v.price < cur.minPrice) info[v.product_id] = { minPrice: v.price, minMrp: v.mrp };
        });
        setVariantInfo(info);
      });
  }, [wishlistIds, wishlistLoading]);

  const addToCart = async (product: Product) => {
    if (!user) { toast.error("Please login to add to cart"); return; }
    const { data: existing } = await supabase.from("cart_items").select("id, quantity")
      .eq("user_id", user.id).eq("product_id", product.id).is("variant_id", null).maybeSingle();

    if (existing) {
      const nextQty = Math.min(existing.quantity + 1, product.stock);
      await supabase.from("cart_items").update({ quantity: nextQty }).eq("id", existing.id);
    } else {
      await supabase.from("cart_items").insert({ user_id: user.id, product_id: product.id, quantity: 1 });
    }
    toast.success("Added to cart!");
  };

  return (
    <div className="section-padding">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">My Wishlist ({products.length})</h1>
        {!user && (
          <p className="text-sm text-muted-foreground mb-6">
            Browsing as a guest — your wishlist is saved on this device. <Link to="/auth" className="text-primary hover:underline">Log in</Link> to keep it permanently and sync across devices.
          </p>
        )}
        {loading ? <p className="text-muted-foreground">Loading...</p> : products.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground mb-4">Your wishlist is empty</p>
            <Link to="/shop" className="inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Browse Products</Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => {
              const variant = variantInfo[product.id];
              const displayPrice = variant ? variant.minPrice : product.price;
              const displayMrp = variant ? variant.minMrp : product.mrp;
              return (
              <div key={product.id} className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                <Link to={`/product/${product.slug}`}>
                  <img src={product.image_url || "/placeholder.svg"} alt={product.name} className="w-full aspect-square object-cover" />
                </Link>
                <div className="p-4">
                  <Link to={`/product/${product.slug}`}>
                    <h3 className="font-semibold text-sm mb-1 hover:text-secondary">{product.name}</h3>
                  </Link>
                  <div className="flex items-center gap-2 mb-3">
                    {variant && <span className="text-xs text-muted-foreground">From</span>}
                    <span className="font-bold">₹{displayPrice}</span>
                    {displayMrp > displayPrice && (
                      <span className="text-xs text-muted-foreground line-through">₹{displayMrp}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {variant ? (
                      <Link to={`/product/${product.slug}`}
                        className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground flex items-center justify-center gap-1">
                        View Options
                      </Link>
                    ) : (
                      <button onClick={() => addToCart(product)}
                        className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground flex items-center justify-center gap-1">
                        <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                      </button>
                    )}
                    <button onClick={() => toggle(product.id)} className="rounded-lg border border-border px-3 py-2 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
