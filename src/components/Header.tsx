import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/assets/logo.png";
import { Menu, X, ShoppingCart, Heart, User, LogOut, Shield } from "lucide-react";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Shop", to: "/shop" },
  { label: "Products", to: "/products" },
  { label: "Export", to: "/export" },
  { label: "About", to: "/about" },
  { label: "Blog", to: "/blog" },
  { label: "Contact", to: "/contact" },
];

const Header = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-card/95 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-3 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <img src={logo} alt="BuenoExports Logo" className="h-12 w-12 rounded-full object-contain" loading="eager" />
          <span className="font-display text-xl font-bold text-primary">BuenoExports</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${
                location.pathname === l.to ? "text-primary font-semibold" : "text-muted-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          {user && (
            <>
              <Link to="/wishlist" className="relative p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                <Heart className="h-5 w-5" />
              </Link>
              <Link to="/cart" className="relative p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                <ShoppingCart className="h-5 w-5" />
              </Link>
            </>
          )}
          {user ? (
            <div className="flex items-center gap-1 ml-2">
              {isAdmin && (
                <Link to="/admin" className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title="Admin">
                  <Shield className="h-5 w-5" />
                </Link>
              )}
              <Link to="/my-orders" className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title="My Orders">
                <User className="h-5 w-5" />
              </Link>
              <button onClick={signOut} className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground" title="Logout">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:shadow-lg active:scale-[0.97]"
            >
              Login
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-2 lg:hidden">
          {user && (
            <Link to="/cart" className="p-2 text-foreground"><ShoppingCart className="h-5 w-5" /></Link>
          )}
          <button onClick={() => setOpen(!open)} className="rounded-md p-2 text-foreground" aria-label="Toggle menu">
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-border bg-card px-4 pb-4 lg:hidden animate-fade-in">
          {navLinks.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}
              className={`block rounded-md px-3 py-3 text-sm font-medium transition-colors hover:bg-muted ${
                location.pathname === l.to ? "text-primary font-semibold" : "text-muted-foreground"
              }`}>
              {l.label}
            </Link>
          ))}
          {user && (
            <>
              <Link to="/wishlist" onClick={() => setOpen(false)} className="block rounded-md px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted">Wishlist</Link>
              <Link to="/my-orders" onClick={() => setOpen(false)} className="block rounded-md px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted">My Orders</Link>
              {isAdmin && <Link to="/admin" onClick={() => setOpen(false)} className="block rounded-md px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-muted">Admin Panel</Link>}
            </>
          )}
          {user ? (
            <button onClick={() => { signOut(); setOpen(false); }}
              className="mt-2 block w-full rounded-lg border border-border px-5 py-2.5 text-center text-sm font-semibold">
              Logout
            </button>
          ) : (
            <Link to="/auth" onClick={() => setOpen(false)}
              className="mt-2 block rounded-lg bg-primary px-5 py-2.5 text-center text-sm font-semibold text-primary-foreground">
              Login / Sign Up
            </Link>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
