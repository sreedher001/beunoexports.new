import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWishlist } from "@/hooks/useWishlist";
import { wholesaleEnquiryUrl, setBuyNowItem } from "@/lib/utils";
import { ShoppingCart, Heart, Minus, Plus, ArrowLeft, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import ProductReviews from "@/components/ProductReviews";

type Product = {
  id: string; name: string; slug: string; description: string | null;
  price: number; mrp: number; image_url: string | null; stock: number;
  unit: string; weight: string | null; category_id: string | null;
  catalog_type: string; moq: number | null;
};

type Variant = { id: string; label: string; price: number; mrp: number; stock: number };

type RelatedProduct = { id: string; name: string; slug: string; price: number; mrp: number; image_url: string | null };

const ProductDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [gallery, setGallery] = useState<string[]>([]);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [related, setRelated] = useState<RelatedProduct[]>([]);
  const { wishlistIds, toggle: toggleWishlist } = useWishlist();
  const inWishlist = !!product && wishlistIds.has(product.id);

  useEffect(() => {
    supabase.from("products").select("*").eq("slug", slug).eq("is_active", true).single()
      .then(({ data }) => { setProduct(data); setLoading(false); });
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    setActiveImage(product.image_url);
    supabase.from("product_images").select("url").eq("product_id", product.id).order("sort_order")
      .then(({ data }) => setGallery(data?.map((d) => d.url) || []));
  }, [product]);

  useEffect(() => {
    if (!product) return;
    supabase.from("product_variants").select("*").eq("product_id", product.id).order("sort_order")
      .then(({ data }) => {
        setVariants(data || []);
        setSelectedVariant(data && data.length > 0 ? data[0] : null);
      });
  }, [product]);

  useEffect(() => {
    if (!product || !product.category_id) { setRelated([]); return; }
    supabase.from("products")
      .select("id,name,slug,price,mrp,image_url")
      .eq("is_active", true)
      .eq("catalog_type", product.catalog_type)
      .eq("category_id", product.category_id)
      .neq("id", product.id)
      .limit(4)
      .then(({ data }) => setRelated(data || []));
  }, [product]);

  const activePrice = selectedVariant?.price ?? product?.price ?? 0;
  const activeMrp = selectedVariant?.mrp ?? product?.mrp ?? 0;
  const activeStock = selectedVariant?.stock ?? product?.stock ?? 0;

  const selectVariant = (v: Variant) => {
    setSelectedVariant(v);
    setQty(1);
  };

  const findCartRow = (userId: string, productId: string) => {
    let query = supabase.from("cart_items").select("id, quantity").eq("user_id", userId).eq("product_id", productId);
    query = selectedVariant ? query.eq("variant_id", selectedVariant.id) : query.is("variant_id", null);
    return query.maybeSingle();
  };

  const addToCart = async () => {
    if (!user) { toast.error("Please login to add to cart"); return; }
    if (!product) return;
    const { data: existing } = await findCartRow(user.id, product.id);

    let error;
    if (existing) {
      const nextQty = Math.min(existing.quantity + qty, activeStock);
      ({ error } = await supabase.from("cart_items").update({ quantity: nextQty }).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("cart_items").insert({
        user_id: user.id, product_id: product.id, variant_id: selectedVariant?.id ?? null, quantity: qty,
      }));
    }
    if (error) toast.error("Failed to add");
    else toast.success(`Added ${qty} ${product.unit} to cart!`);
  };

  const buyNow = () => {
    if (!product) return;
    setBuyNowItem({ product_id: product.id, variant_id: selectedVariant?.id ?? null, quantity: qty });
    navigate("/checkout");
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

  const disc = activeMrp > activePrice ? Math.round(((activeMrp - activePrice) / activeMrp) * 100) : 0;

  return (
    <div className="section-padding">
      <div className="container mx-auto max-w-5xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <div className="rounded-xl overflow-hidden border border-border shadow-md">
              <img src={activeImage || "/placeholder.svg"} alt={product.name} className="w-full aspect-square object-cover" />
            </div>
            {[product.image_url, ...gallery].filter(Boolean).length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {[product.image_url, ...gallery].filter((u): u is string => !!u).map((url, i) => (
                  <button key={i} onClick={() => setActiveImage(url)}
                    className={`h-16 w-16 shrink-0 rounded-lg overflow-hidden border-2 ${activeImage === url ? "border-secondary" : "border-transparent"}`}>
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{product.name}</h1>
            {product.weight && <p className="text-muted-foreground mb-4">{product.weight}</p>}

            {product.catalog_type === "retail" ? (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl font-bold text-secondary">₹{activePrice}</span>
                {activeMrp > activePrice && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">₹{activeMrp}</span>
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

            {variants.length > 0 && (
              <div className="mb-4">
                <span className="text-sm font-medium block mb-2">Size:</span>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => selectVariant(v)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        selectedVariant?.id === v.id
                          ? "border-secondary bg-secondary/10 text-secondary"
                          : "border-border text-muted-foreground hover:border-secondary/50"
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-muted-foreground mb-6">{product.description}</p>
            <p className="text-sm mb-4">
              {activeStock > 0
                ? <span className="text-green-600 font-medium">In Stock ({activeStock} {product.unit} available)</span>
                : <span className="text-destructive font-medium">Out of Stock</span>}
            </p>

            {product.catalog_type === "retail" ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-sm font-medium">Qty:</span>
                  <div className="flex items-center border border-border rounded-lg">
                    <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 hover:bg-muted"><Minus className="h-4 w-4" /></button>
                    <span className="px-4 py-2 font-semibold min-w-[3rem] text-center">{qty}</span>
                    <button onClick={() => setQty(Math.min(activeStock, qty + 1))} className="px-3 py-2 hover:bg-muted"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button onClick={addToCart} disabled={activeStock === 0}
                    className="flex-1 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-md transition-all hover:shadow-lg active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2">
                    <ShoppingCart className="h-4 w-4" /> Add to Cart
                  </button>
                  <button onClick={buyNow} disabled={activeStock === 0}
                    className="flex-1 rounded-lg bg-secondary px-6 py-3 text-sm font-bold text-secondary-foreground shadow-md transition-all hover:shadow-lg active:scale-[0.97] disabled:opacity-50">
                    Buy Now
                  </button>
                  <button onClick={() => toggleWishlist(product.id)}
                    className={`rounded-lg border px-4 py-3 transition-all active:scale-[0.97] ${inWishlist ? "bg-accent/10 border-accent text-accent" : "border-border text-muted-foreground hover:text-accent"}`}>
                    <Heart className={`h-5 w-5 ${inWishlist ? "fill-current" : ""}`} />
                  </button>
                </div>
              </>
            ) : (
              <a
                href={wholesaleEnquiryUrl(`${product.name}${selectedVariant ? ` (${selectedVariant.label})` : ""}`, product.moq, product.unit)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-lg bg-[#25D366] px-6 py-3 text-sm font-bold text-white shadow-md transition-all hover:shadow-lg active:scale-[0.97] flex items-center justify-center gap-2"
              >
                <MessageCircle className="h-4 w-4" /> Enquire on WhatsApp
              </a>
            )}
          </div>
        </div>
        <ProductReviews productId={product.id} />

        {related.length > 0 && (
          <div className="mt-12">
            <h3 className="font-semibold text-lg mb-4">You May Also Like</h3>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {related.map((p) => (
                <Link key={p.id} to={`/product/${p.slug}`} className="group rounded-xl border border-border bg-card shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square overflow-hidden">
                    <img src={p.image_url || "/placeholder.svg"} alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-sm line-clamp-2 mb-1">{p.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm">₹{p.price}</span>
                      {p.mrp > p.price && <span className="text-xs text-muted-foreground line-through">₹{p.mrp}</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;
