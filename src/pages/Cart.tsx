import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

type CartItem = {
  id: string;
  quantity: number;
  product_id: string;
  products: {
    id: string; name: string; price: number; mrp: number;
    image_url: string | null; unit: string; stock: number; slug: string;
  };
};

const Cart = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCart = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("cart_items")
      .select("*, products(*)")
      .eq("user_id", user.id);
    setItems((data as unknown as CartItem[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const updateQty = async (id: string, qty: number) => {
    const item = items.find((i) => i.id === id);
    if (qty < 1 || (item && qty > item.products.stock)) return;
    await supabase.from("cart_items").update({ quantity: qty }).eq("id", id);
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, quantity: qty } : i));
  };

  const remove = async (id: string) => {
    await supabase.from("cart_items").delete().eq("id", id);
    setItems((prev) => prev.filter((i) => i.id !== id));
    toast.success("Removed from cart");
  };

  const total = items.reduce((sum, i) => sum + i.products.price * i.quantity, 0);

  if (!user) return (
    <div className="section-padding text-center">
      <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
      <h2 className="mb-2">Login to View Cart</h2>
      <Link to="/auth" className="text-primary hover:underline">Login / Sign Up</Link>
    </div>
  );

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
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
                  <Link to={`/product/${item.products.slug}`} className="shrink-0">
                    <img src={item.products.image_url || "/placeholder.svg"} alt={item.products.name}
                      className="h-24 w-24 rounded-lg object-cover" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link to={`/product/${item.products.slug}`}>
                      <h3 className="font-semibold text-sm line-clamp-2 hover:text-secondary">{item.products.name}</h3>
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold">₹{item.products.price}</span>
                      {item.products.mrp > item.products.price && (
                        <span className="text-xs text-muted-foreground line-through">₹{item.products.mrp}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex items-center border border-border rounded">
                        <button onClick={() => updateQty(item.id, item.quantity - 1)} className="px-2 py-1 hover:bg-muted"><Minus className="h-3 w-3" /></button>
                        <span className="px-3 py-1 text-sm font-semibold">{item.quantity}</span>
                        <button onClick={() => updateQty(item.id, item.quantity + 1)} className="px-2 py-1 hover:bg-muted"><Plus className="h-3 w-3" /></button>
                      </div>
                      <button onClick={() => remove(item.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <p className="font-bold text-sm whitespace-nowrap">₹{item.products.price * item.quantity}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="rounded-xl border border-border bg-card p-6 shadow-sm sticky top-24">
                <h3 className="font-semibold mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>₹{total}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span className="text-green-600">Free</span></div>
                  <div className="border-t border-border pt-2 mt-2 flex justify-between font-bold text-lg">
                    <span>Total</span><span>₹{total}</span>
                  </div>
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
