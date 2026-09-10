import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCatalogMode } from "@/contexts/CatalogModeContext";
import { useWishlist } from "@/hooks/useWishlist";
import { wholesaleEnquiryUrl, setBuyNowItem } from "@/lib/utils";
import ScrollReveal from "@/components/ScrollReveal";
import heroImg from "@/assets/hero-spices.jpg";
import { ShieldCheck, Globe, Truck, Leaf, Star, Award, ShoppingBag, ShoppingCart, Heart, MessageCircle } from "lucide-react";
import { toast } from "sonner";

type Product = {
  id: string; name: string; slug: string; price: number; mrp: number;
  image_url: string | null; weight: string | null; unit: string; moq: number | null; stock: number;
};

type Category = { id: string; name: string; slug: string };

const whyUs = [
  { icon: ShieldCheck, title: "Certified Quality", desc: "FSSAI, ISO & export-grade standards" },
  { icon: Globe, title: "Pan India Delivery", desc: "Fast delivery across all states" },
  { icon: Truck, title: "Free Shipping", desc: "Free delivery on all orders" },
  { icon: Leaf, title: "Farm Fresh", desc: "Direct procurement from Indian farms" },
];

const testimonials = [
  { name: "Ramesh Kumar", role: "Restaurant Owner, Delhi", text: "BuenoExports delivers consistent quality spices. Perfect for our restaurant chain!" },
  { name: "Priya Sharma", role: "Home Chef, Mumbai", text: "The turmeric and chili powder are incredibly fresh and aromatic. My go-to store now." },
  { name: "Suresh Patel", role: "Wholesaler, Ahmedabad", text: "Bulk pricing is competitive and quality never disappoints. Highly recommended." },
];

const Index = () => {
  const { user } = useAuth();
  const { mode } = useCatalogMode();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variantInfo, setVariantInfo] = useState<Record<string, { minPrice: number; minMrp: number }>>({});
  const { wishlistIds, toggle: toggleWishlist } = useWishlist();

  useEffect(() => {
    supabase.from("products").select("id,name,slug,price,mrp,image_url,weight,unit,moq,stock")
      .eq("is_active", true).eq("catalog_type", mode).limit(8)
      .then(async ({ data }) => {
        setProducts(data || []);
        const ids = (data || []).map((p) => p.id);
        if (ids.length === 0) { setVariantInfo({}); return; }
        const { data: allVariants } = await supabase.from("product_variants").select("product_id, price, mrp").in("product_id", ids);
        const info: Record<string, { minPrice: number; minMrp: number }> = {};
        (allVariants || []).forEach((v) => {
          const cur = info[v.product_id];
          if (!cur || v.price < cur.minPrice) info[v.product_id] = { minPrice: v.price, minMrp: v.mrp };
        });
        setVariantInfo(info);
      });
    supabase.from("categories").select("*").order("name")
      .then(({ data }) => setCategories(data || []));
  }, [mode]);

  const disc = (mrp: number, price: number) => mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

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

  const buyNow = (product: Product) => {
    setBuyNowItem({ product_id: product.id, variant_id: null, quantity: 1 });
    navigate("/checkout");
  };

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Premium Indian spices" className="h-full w-full object-cover" loading="eager" />
          <div className="absolute inset-0 bg-primary/75" />
        </div>
        <div className="relative container mx-auto px-4 py-24 md:py-36 lg:py-44 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-primary-foreground text-balance mb-6 animate-fade-up" style={{ lineHeight: 1.1 }}>
              Premium Indian Spices Delivered to Your Doorstep
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/85 mb-8 max-w-lg animate-fade-up" style={{ animationDelay: "100ms" }}>
              Fresh, authentic spices straight from Indian farms. Shop now and taste the difference.
            </p>
            <div className="flex flex-wrap gap-4 animate-fade-up" style={{ animationDelay: "200ms" }}>
              <Link to="/shop"
                className="inline-flex items-center gap-2 rounded-lg bg-secondary px-6 py-3 text-sm font-bold text-secondary-foreground shadow-lg transition-all hover:shadow-xl active:scale-[0.97]">
                <ShoppingBag className="h-4 w-4" /> Shop Now
              </Link>
              <Link to="/contact"
                className="inline-flex items-center rounded-lg border-2 border-primary-foreground/30 px-6 py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary-foreground/10 active:scale-[0.97]">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="section-padding-sm">
          <div className="container mx-auto">
            <ScrollReveal className="text-center mb-8">
              <p className="text-sm font-semibold uppercase tracking-widest text-secondary mb-3">Categories</p>
              <h2 className="text-balance">Shop by Category</h2>
            </ScrollReveal>
            <div className="flex flex-wrap justify-center gap-3">
              {categories.map((c) => (
                <Link key={c.id} to={`/shop?category=${c.id}`}
                  className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold shadow-sm transition-all hover:shadow-md hover:border-secondary">
                  {c.name}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products */}
      <section className="section-padding warm-bg">
        <div className="container mx-auto">
          <ScrollReveal className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-secondary mb-3">Featured</p>
            <h2 className="text-balance">Popular Spices</h2>
          </ScrollReveal>
          {products.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((p) => {
                const variant = variantInfo[p.id];
                const displayPrice = variant ? variant.minPrice : p.price;
                const displayMrp = variant ? variant.minMrp : p.mrp;
                return (
                <ScrollReveal key={p.id}>
                  <div className="group rounded-xl border border-border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-lg">
                    <Link to={`/product/${p.slug}`} className="block">
                      <div className="aspect-square overflow-hidden relative">
                        <img src={p.image_url || "/placeholder.svg"} alt={p.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                        {mode === "retail" && disc(displayMrp, displayPrice) > 0 && (
                          <span className="absolute top-2 left-2 bg-accent text-accent-foreground text-xs font-bold px-2 py-1 rounded">
                            {disc(displayMrp, displayPrice)}% OFF
                          </span>
                        )}
                      </div>
                      <div className="p-4 pb-0">
                        <h3 className="font-semibold text-sm mb-1">{p.name}</h3>
                        {p.weight && <p className="text-xs text-muted-foreground mb-2">{p.weight}</p>}
                      </div>
                    </Link>
                    <div className="p-4 pt-2">
                      {mode === "retail" ? (
                        <>
                          <div className="flex items-center gap-2 mb-3">
                            {variant && <span className="text-xs text-muted-foreground">From</span>}
                            <span className="text-lg font-bold">₹{displayPrice}</span>
                            {displayMrp > displayPrice && <span className="text-sm text-muted-foreground line-through">₹{displayMrp}</span>}
                          </div>
                          {variant ? (
                            <Link to={`/product/${p.slug}`}
                              className="w-full rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-all hover:shadow-md active:scale-[0.97] flex items-center justify-center gap-1">
                              View Options
                            </Link>
                          ) : (
                            <div className="flex gap-2">
                              <button onClick={() => addToCart(p)} disabled={p.stock === 0}
                                className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-all hover:shadow-md active:scale-[0.97] flex items-center justify-center gap-1 disabled:opacity-50">
                                <ShoppingCart className="h-3.5 w-3.5" /> Add
                              </button>
                              <button onClick={() => buyNow(p)} disabled={p.stock === 0}
                                className="flex-1 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground transition-all hover:shadow-md active:scale-[0.97] disabled:opacity-50">
                                Buy Now
                              </button>
                              <button onClick={() => toggleWishlist(p.id)}
                                className={`rounded-lg border px-3 py-2 transition-all active:scale-[0.97] ${
                                  wishlistIds.has(p.id) ? "bg-accent/10 border-accent text-accent" : "border-border text-muted-foreground hover:text-accent"
                                }`}>
                                <Heart className={`h-4 w-4 ${wishlistIds.has(p.id) ? "fill-current" : ""}`} />
                              </button>
                            </div>
                          )}
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
          ) : (
            <p className="text-center text-muted-foreground">Products coming soon! Add products from the admin panel.</p>
          )}
          <div className="mt-10 text-center">
            <Link to="/shop"
              className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow transition-all hover:shadow-lg active:scale-[0.97]">
              View All Products
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="section-padding">
        <div className="container mx-auto">
          <ScrollReveal className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-secondary mb-3">Why BuenoExports</p>
            <h2 className="text-balance">Why Shop With Us</h2>
          </ScrollReveal>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {whyUs.map((w, i) => (
              <ScrollReveal key={w.title} delay={i * 80}>
                <div className="rounded-xl border border-border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary/20">
                    <w.icon className="h-6 w-6 text-secondary" />
                  </div>
                  <h3 className="font-display text-lg font-semibold mb-2">{w.title}</h3>
                  <p className="text-sm text-muted-foreground">{w.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section-padding warm-bg">
        <div className="container mx-auto">
          <ScrollReveal className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest text-secondary mb-3">Reviews</p>
            <h2 className="text-balance">What Our Customers Say</h2>
          </ScrollReveal>
          <div className="grid gap-8 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <ScrollReveal key={t.name} delay={i * 100}>
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-secondary text-secondary" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4 italic">"{t.text}"</p>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="section-padding-sm">
        <div className="container mx-auto text-center">
          <ScrollReveal>
            <div className="flex flex-wrap justify-center gap-6">
              {["FSSAI Approved", "ISO Certified", "Export Quality", "Organic Certified"].map((c) => (
                <div key={c} className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 shadow-sm">
                  <Award className="h-5 w-5 text-secondary" />
                  <span className="text-sm font-semibold">{c}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding spice-gradient text-primary-foreground">
        <div className="container mx-auto text-center max-w-2xl">
          <ScrollReveal>
            <h2 className="mb-4 text-balance">Ready to Order Premium Spices?</h2>
            <p className="opacity-80 mb-8">Browse our collection and get fresh, authentic spices delivered to your door.</p>
            <Link to="/shop"
              className="inline-flex items-center gap-2 rounded-lg bg-secondary px-7 py-3 text-sm font-bold text-secondary-foreground shadow-lg transition-all hover:shadow-xl active:scale-[0.97]">
              <ShoppingBag className="h-4 w-4" /> Start Shopping
            </Link>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
};

export default Index;
