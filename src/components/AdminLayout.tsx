import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LayoutDashboard, Package, ShoppingCart, Users, Upload, Tag, ArrowLeft, Search } from "lucide-react";

const adminLinks = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Products", to: "/admin/products", icon: Package },
  { label: "Orders", to: "/admin/orders", icon: ShoppingCart },
  { label: "Users", to: "/admin/users", icon: Users },
  { label: "Coupons", to: "/admin/coupons", icon: Tag },
  { label: "Bulk Upload", to: "/admin/bulk-upload", icon: Upload },
  { label: "SEO", to: "/admin/seo", icon: Search },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) return <div className="section-padding text-center text-muted-foreground">Loading...</div>;
  if (!isAdmin) return (
    <div className="section-padding text-center">
      <h2 className="mb-4">Access Denied</h2>
      <p className="text-muted-foreground mb-4">You don't have admin access.</p>
      <button onClick={() => navigate("/")} className="text-primary hover:underline">Go Home</button>
    </div>
  );

  return (
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
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card overflow-x-auto">
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
      <main className="flex-1 p-4 md:p-8 pb-20 md:pb-8 overflow-auto">{children}</main>
    </div>
  );
};

export default AdminLayout;
