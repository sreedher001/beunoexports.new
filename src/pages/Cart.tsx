import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart, type CartLine } from "@/hooks/useCart";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

const APPLIED_COUPON_KEY = "appliedCoupon";

const Cart = () => {
  const navigate = useNavigate();
  const { items, loading, updateQuantity, removeFromCart } = useCart();
  const [shippingSettings, setShippingSettings] = useState({ flat_shipping_rate: 0, free_shipping_threshold: null as number | null });
  const [couponInput, setCouponInput] = useState("");
  const [couponApplying, setCouponApplying] = useState(false);
  const [couponError, setCouponError] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);

  useEffect(() => {
    supabase.from("site_settings").select("flat_shipping_rate,free_shipping_threshold").eq("id", true).single()
      .then(({ data }) => { if (data) setShippingSettings(data); });
  }, []);

  const linePrice = (item: CartLine) => item.variant?.price ?? item.product.price;
  const lineMrp = (item: CartLine) => item.variant?.mrp ?? item.product.mrp;

  const total = items.reduce((sum, i) => sum + linePrice(i) * i.quantity, 0);
  const shipping = shippingSettings.free_shipping_threshold != null && total >= shippingSettings.free_shipping_threshold
    ? 0 : shippingSettings.flat_shipping_rate;
  const discount = appliedCoupon?.discount ?? 0;
  const grandTotal = Math.max(0, total - discount) + shipping;

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    setCouponApplying(true);
    setCouponError("");
    const { data, error } = await supabase.rpc("validate_coupon", { _code: code, _order_amount: total });
    setCouponApplying(false);
    const result = data?.[0];
    if (error || !result) { setCouponError("Failed to check coupon"); return; }
    if (!result.valid) { setCouponError(result.message); setAppliedCoupon(null); return; }
    setAppliedCoupon({ code, discount: result.discount_amount });
    sessionStorage.setItem(APPLIED_COUPON_KEY, JSON.stringify({ code }));
    toast.success(result.message);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
    sessionStorage.removeItem(APPLIED_COUPON_KEY);
  };

  if (loading) return <div className="section-padding text-center"><div className="animate-pulse text-muted-foreground">Loading cart...</div></div>;

  return (
    <div className="section-padding">
      <div className="container mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Shopping Cart ({items.length})</h1>
        {items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground mb-4">Your cart is empty</p>
            <Link to="/shop" className="inline-flex items-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.key} className="flex gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
                  <Link to={`/product/${item.product.slug}`} className="shrink-0">
                    <img src={item.product.image_url || "/placeholder.svg"} alt={item.product.name}
                      className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-lg object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${item.product.slug}`}>
                      <h3 className="font-semibold text-sm line-clamp-2 hover:text-secondary">{item.product.name}</h3>
                    </Link>
                    {item.variant && <p className="text-xs text-muted-foreground">{item.variant.label}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold">₹{linePrice(item)}</span>
                      {lineMrp(item) > linePrice(item) && (
                        <span className="text-xs text-muted-foreground line-through">₹{lineMrp(item)}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <div className="flex items-center border border-border rounded">
                        <button onClick={() => updateQuantity(item, item.quantity - 1)} className="px-2 py-1 hover:bg-muted"><Minus className="h-3 w-3" /></button>
                        <span className="px-3 py-1 text-sm font-semibold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item, item.quantity + 1)} className="px-2 py-1 hover:bg-muted"><Plus className="h-3 w-3" /></button>
                      </div>
                      <button onClick={() => removeFromCart(item)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="font-bold text-sm whitespace-nowrap shrink-0">₹{linePrice(item) * item.quantity}</p>
                </div>
              ))}
            </div>
            <div className="min-w-0">
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm sticky top-24">
                <h3 className="font-semibold mb-4">Order Summary</h3>

                <div className="mb-4">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between rounded-lg bg-green-50 px-3 py-2 text-sm">
                      <span className="text-green-700 font-medium">"{appliedCoupon.code}" applied</span>
                      <button type="button" onClick={removeCoupon} className="text-xs text-muted-foreground hover:text-destructive underline">Remove</button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                          placeholder="Coupon code"
                          className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-secondary" />
                        <button type="button" onClick={applyCoupon} disabled={couponApplying || !couponInput.trim()}
                          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50">
                          {couponApplying ? "..." : "Apply"}
                        </button>
                      </div>
                      {couponError && <p className="text-xs text-destructive mt-1">{couponError}</p>}
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{total}</span></div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{discount}</span></div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery</span>
                    <span className={shipping === 0 ? "text-green-600" : ""}>{shipping === 0 ? "Free" : `₹${shipping}`}</span>
                  </div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-lg">
                    <span>Total</span><span>₹{grandTotal}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Taxes are calculated at checkout.</p>
                </div>
                <button onClick={() => navigate("/checkout")}
                  className="w-full mt-6 rounded-lg bg-secondary px-6 py-3 text-sm font-bold text-secondary-foreground shadow-md transition-all hover:shadow-lg active:scale-[0.97]">
                  Proceed to Checkout
                </button>
                <Link to="/shop" className="block text-center text-sm text-primary mt-3 hover:underline">Continue Shopping</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cart;
