import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";
import { Instagram, Facebook, Linkedin, Youtube, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 py-16 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="BuenoExports" className="h-14 w-14 rounded-full" />
              <span className="font-display text-xl font-bold">BuenoExports</span>
            </div>
            <p className="text-sm leading-relaxed opacity-80 mb-6">
              Premium Indian spices exported worldwide. Trusted source for export-quality turmeric, chili, pepper, cardamom, cloves and spice blends.
            </p>
            <div className="flex gap-3">
              {[
                { icon: Instagram, href: "https://instagram.com/buenoexports" },
                { icon: Facebook, href: "https://facebook.com/buenoexports" },
                { icon: Linkedin, href: "https://linkedin.com/company/buenoexports" },
                { icon: Youtube, href: "https://youtube.com/@buenoexports" },
              ].map(({ icon: Icon, href }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-foreground/10 transition-colors hover:bg-primary-foreground/20"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "Home", to: "/" },
                { label: "Shop", to: "/shop" },
                { label: "Products", to: "/products" },
                { label: "Export Services", to: "/export" },
                { label: "Certifications", to: "/certifications" },
                { label: "About", to: "/about" },
                { label: "Blog", to: "/blog" },
                { label: "Contact", to: "/contact" },
                { label: "My Orders", to: "/my-orders" },
              ].map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="opacity-80 transition-opacity hover:opacity-100">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 mt-0.5 shrink-0" />
                <a href="tel:+918428450081" className="opacity-80 hover:opacity-100">+91 84284 50081</a>
              </li>
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                <a href="mailto:info@buenoexports.com" className="opacity-80 hover:opacity-100">info@buenoexports.com</a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="opacity-80">India</span>
              </li>
            </ul>
          </div>

          {/* Export Countries & Newsletter */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">We Export To</h3>
            <p className="text-sm opacity-80 mb-6">USA, UK, UAE, Saudi Arabia, Singapore, Malaysia, Germany, Australia, Canada, and 30+ countries worldwide.</p>
            <h3 className="font-display text-lg font-semibold mb-3">Newsletter</h3>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 rounded-md bg-primary-foreground/10 px-3 py-2 text-sm text-primary-foreground placeholder:text-primary-foreground/50 outline-none focus:ring-1 focus:ring-primary-foreground/30"
              />
              <button
                type="submit"
                className="rounded-md bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition-transform active:scale-95"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 border-t border-primary-foreground/15 pt-6 text-center text-xs opacity-70">
          © {new Date().getFullYear()} BuenoExports. All rights reserved. Premium Indian Spices — Trusted Source.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
