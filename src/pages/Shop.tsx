import { useState, useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalogMode } from "@/contexts/CatalogModeContext";
import { wholesaleEnquiryUrl } from "@/lib/utils";
import { Search, Heart, ShoppingCart, Filter, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import ScrollReveal from "@/components/ScrollReveal";

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  mrp: number;
  image_url: string | null;
  stock: number;
  unit: string;
  weight: string | null;
  category_id: string | null;
  is_active: boolean;
  catalog_type: string;
  moq: number | null;
};

type Category = { id: string; name: string; slug: string };

const Shop = () => {
  const { user } = useAuth();
  const { mode } = useCatalogMode();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>(searchParams.get("category") || "all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const [variantInfo, setVariantInfo] = useState<Record<string, { minPrice: number; minMrp: number }>>({});

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setSelectedCat(cat);
  }, [searchParams]);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: prods }, { data: cats }, { data: allVariants }] = await Promise.all([
        supabase.from("products").select("*").eq("is_active", true),
        supabase.from("categories").select("*").order("name"),
        supabase.from("product_variants").select("product_id, price, mrp"),
      ]);
      setProducts(prods || []);
      setCategories(cats || []);
      const info: Record<string, { minPrice: number; minMrp: number }> = {};
      (allVariants || []).forEach((v) => {
        const cur = info[v.product_id];
        if (!cur || v.price < cur.minPrice) info[v.product_id] = { minPrice: v.price, minMrp: v.mrp };
      });
      setVariantInfo(info);
      setLoading(false);
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("wishlist_items")
      .select("product_id")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setWishlistIds(new Set(data?.map((w) => w.product_id) || []));
      });
  }, [user]);

  const categoryIdBySlug = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((c) => { map[c.slug] = c.id; });
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const catId = categoryIdBySlug[selectedCat] || selectedCat;
    const min = minPrice ? Number(minPrice) : null;
    const max = maxPrice ? Number(maxPrice) : null;
    return products.filter((p) => {
      const matchMode = p.catalog_type === mode;
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCat === "all" || p.category_id === catId;
      const effectivePrice = variantInfo[p.id]?.minPrice ?? p.price;
      const matchMin = min == null || effectivePrice >= min;
      const matchMax = max == null || effectivePrice <= max;
      return matchMode && matchSearch && matchCat && matchMin && matchMax;
    });
  }, [products, search, selectedCat, categoryIdBySlug, mode, minPrice, maxPrice, variantInfo]);

  const addToCart = async (productId: string) => {
    if (!user) { toast.error("Please login to add to cart"); return; }
    const product = products.find((p) => p.id === productId);
    const { data: existing } = await supabase.from("cart_items").select("id, quantity")
      .eq("user_id", user.id).eq("product_id", productId).maybeSingle();

    let error;
    if (existing) {
      const nextQty = product ? Math.min(existing.quantity + 1, product.stock) : existing.quantity + 1;
      ({ error } = await supabase.from("cart_items").update({ quantity: nextQty }).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("cart_items").insert({ user_id: user.id, product_id: productId, quantity: 1 }));
    }
    if (error) toast.error("Failed to add to cart");
    else toast.success("Added to cart!");
  };

  const toggleWishlist = async (productId: string) => {
    if (!user) { toast.error("Please login to use wishlist"); return; }
    if (wishlistIds.has(productId)) {
      await supabase.from("wishlist_items").delete().eq("user_id", user.id).eq("product_id", productId);
      setWishlistIds((prev) => { const n = new Set(prev); n.delete(productId); return n; });
      toast.success("Removed from wishlist");
    } else {
      await supabase.from("wishlist_items").insert({ user_id: user.id, product_id: productId });
      setWishlistIds((prev) => new Set(prev).add(productId));
      toast.success("Added to wishlist!");
    }
  };

  const discount = (mrp: number, price: number) => mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

  return (
    <>
      <section className="spice-gradient text-primary-foreground">
        <div className="container mx-auto px-4 py-16 md:py-20 lg:px-8 text-center">
          <h1 className="mb-4 animate-fade-up text-3xl md:text-4xl" style={{ lineHeight: 1.1 }}>
            {mode === "wholesale" ? "Wholesale & Bulk Spices" : "Shop Premium Spices"}
          </h1>
          <p className="opacity-80 text-lg max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "100ms" }}>
            {mode === "wholesale"
              ? "Bulk quantities for exporters, retailers & food businesses. Enquire for pricing."
              : "Fresh, authentic Indian spices delivered across India"}
          </p>
        </div>
      </section>

      <section className="section-padding">
        <div className="container mx-auto">
          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search spices..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/30"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
                className="rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-secondary"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="number" min={0} placeholder="Min ₹" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
                className="w-24 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-secondary" />
              <span className="text-muted-foreground text-sm">–</span>
              <input type="number" min={0} placeholder="Max ₹" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                className="w-24 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-secondary" />
            </div>
          </div>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
                  <div className="aspect-square bg-muted rounded-lg mb-4" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground">No products found</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {filtered.map((p) => {
                const variant = variantInfo[p.id];
                const displayPrice = variant ? variant.minPrice : p.price;
                const displayMrp = variant ? variant.minMrp : p.mrp;
                return (
                <ScrollReveal key={p.id}>
                  <div className="group rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg overflow-hidden">
                    <Link to={`/product/${p.slug}`} className="block">
                      <div className="aspect-square overflow-hidden relative">
                        <img
                          src={p.image_url || "/placeholder.svg"}
                          alt={p.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                        {mode === "retail" && discount(displayMrp, displayPrice) > 0 && (
                          <span className="absolute top-2 left-2 bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded">
                            {discount(displayMrp, displayPrice)}% OFF
                          </span>
                        )}
                      </div>
                    </Link>
                    <div className="p-4">
                      <Link to={`/product/${p.slug}`}>
                        <h3 className="font-semibold text-sm mb-1 line-clamp-2 hover:text-secondary transition-colors">{p.name}</h3>
                      </Link>
                      {p.weight && <p className="text-xs text-muted-foreground mb-2">{p.weight}</p>}
                      {mode === "retail" ? (
                        <>
                          <div className="flex items-center gap-2 mb-3">
                            {variant && <span className="text-xs text-muted-foreground">From</span>}
                            <span className="text-lg font-bold">₹{displayPrice}</span>
                            {displayMrp > displayPrice && (
                              <span className="text-sm text-muted-foreground line-through">₹{displayMrp}</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {variant ? (
                              <Link
                                to={`/product/${p.slug}`}
                                className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-all hover:shadow-md active:scale-[0.97] flex items-center justify-center gap-1"
                              >
                                View Options
                              </Link>
                            ) : (
                              <button
                                onClick={() => addToCart(p.id)}
                                className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-all hover:shadow-md active:scale-[0.97] flex items-center justify-center gap-1"
                              >
                                <ShoppingCart className="h-3.5 w-3.5" /> Add to Cart
                              </button>
                            )}
                            <button
                              onClick={() => toggleWishlist(p.id)}
                              className={`rounded-lg border px-3 py-2 transition-all active:scale-[0.97] ${
                                wishlistIds.has(p.id)
                                  ? "bg-accent/10 border-accent text-accent"
                                  : "border-border text-muted-foreground hover:text-accent"
                              }`}
                            >
                              <Heart className={`h-4 w-4 ${wishlistIds.has(p.id) ? "fill-current" : ""}`} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-secondary mb-1">Contact for Bulk Price</p>
                          {p.moq && <p className="text-xs text-muted-foreground mb-3">MOQ: {p.moq} {p.unit}</p>}
                          <a
                            href={wholesaleEnquiryUrl(p.name, p.moq, p.unit)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full rounded-lg bg-[#25D366] px-3 py-2 text-xs font-semibold text-white transition-all hover:shadow-md active:scale-[0.97] flex items-center justify-center gap-1.5"
                          >
                            <MessageCircle className="h-3.5 w-3.5" /> Enquire on WhatsApp
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </ScrollReveal>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Shop;
