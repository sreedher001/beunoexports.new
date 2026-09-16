
-- Admin-controlled "Best Seller" badge and an "orders this month" count badge,
-- settable per product and, separately, per variant (a variant can be a
-- bestseller/have its own count even if the base product isn't/doesn't).
-- order_count is a plain nullable integer the admin sets by hand -- it is NOT
-- computed from real orders, and NULL means "don't show the badge".
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_bestseller BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS order_count INTEGER;

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS is_bestseller BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS order_count INTEGER;
