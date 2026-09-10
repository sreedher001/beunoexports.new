import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { CatalogModeProvider } from "@/contexts/CatalogModeContext";
import Layout from "@/components/Layout";
import AdminLayout from "@/components/AdminLayout";
import Index from "./pages/Index";
import About from "./pages/About";
import Shop from "./pages/Shop";
import Products from "./pages/Products";
import Export from "./pages/Export";
import Certifications from "./pages/Certifications";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Wishlist from "./pages/Wishlist";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import MyOrders from "./pages/MyOrders";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Blog from "./pages/Blog";
import Contact from "./pages/Contact";
import Legal from "./pages/Legal";
import NotFound from "./pages/NotFound";
import SEOHead from "@/components/SEOHead";

// Admin pages are only ever visited by staff — code-split so the ~99% of
// visits that never touch /admin/* don't download the whole admin bundle.
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminMessages = lazy(() => import("./pages/admin/AdminMessages"));
const BulkUpload = lazy(() => import("./pages/admin/BulkUpload"));
const AdminSeo = lazy(() => import("./pages/admin/AdminSeo"));
const PrintInvoice = lazy(() => import("./pages/admin/PrintInvoice"));

const AdminFallback = () => <div className="section-padding text-center text-muted-foreground">Loading...</div>;

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
        <CatalogModeProvider>
          <SEOHead />
          <Routes>
            {/* Admin routes - no Layout wrapper, code-split behind Suspense */}
            <Route path="/admin" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminDashboard /></AdminLayout></Suspense>} />
            <Route path="/admin/products" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminProducts /></AdminLayout></Suspense>} />
            <Route path="/admin/orders" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminOrders /></AdminLayout></Suspense>} />
            <Route path="/admin/users" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminUsers /></AdminLayout></Suspense>} />
            <Route path="/admin/coupons" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminCoupons /></AdminLayout></Suspense>} />
            <Route path="/admin/messages" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminMessages /></AdminLayout></Suspense>} />
            <Route path="/admin/bulk-upload" element={<Suspense fallback={<AdminFallback />}><AdminLayout><BulkUpload /></AdminLayout></Suspense>} />
            <Route path="/admin/seo" element={<Suspense fallback={<AdminFallback />}><AdminLayout><AdminSeo /></AdminLayout></Suspense>} />
            <Route path="/admin/print-invoice/:orderId" element={<Suspense fallback={<AdminFallback />}><PrintInvoice /></Suspense>} />

            {/* Public routes with Layout */}
            <Route path="/" element={<Layout><Index /></Layout>} />
            <Route path="/shop" element={<Layout><Shop /></Layout>} />
            <Route path="/products" element={<Layout><Products /></Layout>} />
            <Route path="/export" element={<Layout><Export /></Layout>} />
            <Route path="/certifications" element={<Layout><Certifications /></Layout>} />
            <Route path="/product/:slug" element={<Layout><ProductDetail /></Layout>} />
            <Route path="/cart" element={<Layout><Cart /></Layout>} />
            <Route path="/wishlist" element={<Layout><Wishlist /></Layout>} />
            <Route path="/checkout" element={<Layout><Checkout /></Layout>} />
            <Route path="/order-confirmation/:orderId" element={<Layout><OrderConfirmation /></Layout>} />
            <Route path="/my-orders" element={<Layout><MyOrders /></Layout>} />
            <Route path="/auth" element={<Layout><Auth /></Layout>} />
            <Route path="/reset-password" element={<Layout><ResetPassword /></Layout>} />
            <Route path="/about" element={<Layout><About /></Layout>} />
            <Route path="/blog" element={<Layout><Blog /></Layout>} />
            <Route path="/contact" element={<Layout><Contact /></Layout>} />
            <Route path="/legal/:page" element={<Layout><Legal /></Layout>} />
            <Route path="*" element={<Layout><NotFound /></Layout>} />
          </Routes>
        </CatalogModeProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
