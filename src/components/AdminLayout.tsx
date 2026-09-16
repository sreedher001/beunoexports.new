import { ReactNode, useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, Package, ShoppingCart, Users, Upload, Tag, ArrowLeft, Search, Mail, Bell } from "lucide-react";

const PENDING_POLL_MS = 30000;

const adminLinks = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Products", to: "/admin/products", icon: Package },
  { label: "Orders", to: "/admin/orders", icon: ShoppingCart },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Coupons", to: "/admin/coupons", icon: Tag },
  { label: "Messages", to: "/admin/messages", icon: Mail },
  { label: "Bulk Upload", to: "/admin/bulk-upload", icon: Upload },
  { label: "SEO", to: "/admin/seo", icon: Search },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchPending = () => {
      supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "pending")
        .then(({ count }) => setPendingCount(count || 0));
    };
    fetchPending();
    const interval = setInterval(fetchPending, PENDING_POLL_MS);
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (loading) return <div className="section-padding text-center text-muted-foreground">Loading...</div>;
  if (!isAdmin) return (
    <div className="section-padding text-center">
      <h2 className="mb-4">Access Denied</h2>
      <p className="text-muted-foreground mb-4">You don't have admin access.</p>
      <button onClick={() => navigate("/")} className="text-primary hover:underline">Go Home</button>
    </div>
  );

  return (
    <div>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-2 md:px-8">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Panel</span>
        <Link to="/admin/orders" aria-label={`Pending orders${pendingCount > 0 ? `, ${pendingCount} awaiting action` : ""}`}
          className="relative rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground" title="Pending orders">
          <Bell className="h-5 w-5" />
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive ring-2 ring-card">
              <span className="sr-only">{pendingCount} pending orders</span>
            </span>
          )}
        </Link>
      </div>
      <div className="flex min-h-[calc(100vh-4rem)]">
      <aside className="hidden md:flex w-60 flex-col border-r border-border bg-card p-4">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to Store
        </Link>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Admin Panel</p>
        <nav className="space-y-1">
          {adminLinks.map((l) => (
            <Link key={l.to} to={l.to}
              className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                location.pathname === l.to ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
              <l.icon className="h-4 w-4" /> {l.label}
            </Link>
          ))}
        </nav>
      </aside>
      {/* Mobile nav — horizontally scrollable so every section stays reachable */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card">
        <div className="relative">
          <div className="overflow-x-auto">
            <div className="flex min-w-max">
              {adminLinks.map((l) => (
                <Link key={l.to} to={l.to}
                  className={`flex flex-col items-center gap-0.5 px-4 py-2 text-xs whitespace-nowrap ${
                    location.pathname === l.to ? "text-primary" : "text-muted-foreground"
                  }`}>
                  <l.icon className="h-4 w-4" /> {l.label}
                </Link>
              ))}
            </div>
          </div>
          {/* Fade hint that more nav items are reachable by scrolling right */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent" />
        </div>
      </div>
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
};

export default AdminLayout;
