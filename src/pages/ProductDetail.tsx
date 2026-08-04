import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { wholesaleEnquiryUrl } from "@/lib/utils";
import { ShoppingCart, Heart, Minus, Plus, ArrowLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";

type Product = {
  id: string; name: string; slug: string; description: string | null;
  price: number; mrp: number; image_url: string | null; stock: number;
  unit: string; weight: string | null; category_id: string | null;
  catalog_type: string; moq: number | null;
};

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [inWishlist, setInWishlist] = useState(false);

  useEffect(() => {
    supabase.from("products").select("*").eq("slug", slug).eq("is_active", true).single()
      .then(({ data }) => { setProduct(data); setLoading(false); });
  }, [slug]);

  useEffect(() => {
    if (!user || !product) return;
    supabase.from("wishlist_items").select("id").eq("user_id", user.id).eq("product_id", product.id).single()
      .then(({ data }) => setInWishlist(!!data));
  }, [user, product]);

  const addToCart = async () => {
    if (!user) { toast.error("Please login to add to cart"); return; }
    if (!product) return;
    const { data: existing } = await supabase.from("cart_items").select("id, quantity")
      .eq("user_id", user.id).eq("product_id", product.id).maybeSingle();

    let error;
    if (existing) {
      const nextQty = Math.min(existing.quantity + qty, product.stock);
      ({ error } = await supabase.from("cart_items").update({ quantity: nextQty }).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("cart_items").insert({ user_id: user.id, product_id: product.id, quantity: qty }));
    }
    if (error) toast.error("Failed to add");
    else toast.success(`Added ${qty} ${product.unit} to cart!`);
  };

  const buyNow = async () => {
    if (!user) { toast.error("Please login to buy"); return; }
    if (!product) return;
    await supabase.from("cart_items").upsert(
      { user_id: user.id, product_id: product.id, quantity: qty },
      { onConflict: "user_id,product_id" }
    );
    navigate("/checkout");
  };

  const toggleWishlist = async () => {
    if (!user) { toast.error("Please login"); return; }
    if (!product) return;
    if (inWishlist) {
      await supabase.from("wishlist_items").delete().eq("user_id", user.id).eq("product_id", product.id);
      setInWishlist(false);
      toast.success("Removed from wishlist");
    } else {
      await supabase.from("wishlist_items").insert({ user_id: user.id, product_id: product.id });
      setInWishlist(true);
      toast.success("Added to wishlist!");
    }
  };

  if (loading) return (
    <div className="section-padding">
      <div className="container mx-auto max-w-5xl animate-pulse">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-muted rounded-xl" />
          <div className="space-y-4"><div className="h-8 bg-muted rounded w-3/4" /><div className="h-4 bg-muted rounded w-1/2" /></div>
        </div>
      </div>
    </div>
  );

  if (!product) return (
    <div className="section-padding text-center">
      <h2>Product not found</h2>
      <button onClick={() => navigate("/shop")} className="mt-4 text-primary hover:underline">Back to Shop</button>
    </div>
  );

  const disc = product.mrp > product.price ? Math.round(((product.mrp - product.price) / product.mrp) * 100) : 0;

  return (
    <div className="section-padding">
      <div className="container mx-auto max-w-5xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-xl overflow-hidden border border-border shadow-md">
            <img src={product.image_url || "/placeholder.svg"} alt={product.name} className="w-full aspect-square object-cover" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.name}</h1>
            {product.weight && <p className="text-muted-foreground mb-4">{product.weight}</p>}

            {product.catalog_type === "retail" ? (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl font-bold text-secondary">₹{product.price}</span>
                {product.mrp > product.price && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">₹{product.mrp}</span>
                    <span className="bg-accent text-accent-foreground text-sm font-bold px-2 py-0.5 rounded">{disc}% OFF</span>
                  </>
                )}
              </div>
            ) : (
              <div className="mb-4">
                <p className="text-2xl font-bold text-secondary mb-1">Contact for Bulk Price</p>
                {product.moq && <p className="text-sm text-muted-foreground">Minimum Order Quantity: {product.moq} {product.unit}</p>}
              </div>
            )}

            <p className="text-muted-foreground mb-6">{product.description}</p>
            <p className="text-sm mb-4">
              {product.stock > 0
                ? <span className="text-green-600 font-medium">In Stock ({product.stock} {product.unit} available)</span>
                : <span className="text-destructive font-medium">Out of Stock</span>}
            </p>

            {product.catalog_type === "retail" ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-sm font-medium">Qty:</span>
                  <div className="flex items-center border border-border rounded-lg">
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 hover:bg-muted"><Minus className="h-4 w-4" /></button>
                    <span className="px-4 py-2 font-semibold min-w-[3rem] text-center">{qty}</span>
                    <button onClick={() => setQty(Math.min(product.stock, qty + 1))} className="px-3 py-2 hover:bg-muted"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button onClick={addToCart} disabled={product.stock === 0}
                    className="flex-1 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-md transition-all hover:shadow-lg active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2">
                    <ShoppingCart className="h-4 w-4" /> Add to Cart
                  </button>
                  <button onClick={buyNow} disabled={product.stock === 0}
                    className="flex-1 rounded-lg bg-secondary px-6 py-3 text-sm font-bold text-secondary-foreground shadow-md transition-all hover:shadow-lg active:scale-[0.97] disabled:opacity-50">
                    Buy Now
                  </button>
                  <button onClick={toggleWishlist}
                    className={`rounded-lg border px-4 py-3 transition-all active:scale-[0.97] ${inWishlist ? "bg-accent/10 border-accent text-accent" : "border-border text-muted-foreground hover:text-accent"}`}>
                    <Heart className={`h-5 w-5 ${inWishlist ? "fill-current" : ""}`} />
                  </button>
                </div>
              </>
            ) : (
              <a
                href={wholesaleEnquiryUrl(product.name, product.moq, product.unit)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-lg bg-[#25D366] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.97] flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-4 w-4" /> Enquire on WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
